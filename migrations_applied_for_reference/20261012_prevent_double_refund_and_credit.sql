-- D&D Braids — Proteção do sinal: destino Pix OU crédito, nunca ambos.
-- Implementação aditiva validada contra o projeto ddbraids em 2026-10-12.
-- A atualização não cria pagamentos, não executa Pix e não debita créditos.

-- O status 'credited' diferencia conversão em crédito de reembolso feito via Pix.
ALTER TABLE public.appointments DROP CONSTRAINT appointments_deposit_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_deposit_status_check
CHECK (deposit_status IN (
  'not_required','awaiting_send','sent','paid','refund_pending','refunded','credited'
));

CREATE TABLE IF NOT EXISTS public.ddb_refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.appointments(id),
  client_user_id uuid NOT NULL REFERENCES auth.users(id),
  destination text NOT NULL CHECK (destination IN ('pix','credit')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  pix_type text CHECK (pix_type IN ('cpf','cnpj','phone','email','random')),
  pix_key text,
  status text NOT NULL CHECK (status IN ('pending','credited','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT ddb_refund_destination_consistency CHECK (
     (destination='credit' AND status='credited' AND pix_type IS NULL AND pix_key IS NULL)
     OR
     (destination='pix' AND status IN ('pending','completed') AND pix_type IS NOT NULL AND pix_key IS NOT NULL AND length(btrim(pix_key)) BETWEEN 5 AND 120)
  )
);
ALTER TABLE public.ddb_refund_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ddb_refunds_access ON public.ddb_refund_requests;
CREATE POLICY ddb_refunds_access ON public.ddb_refund_requests
FOR SELECT TO authenticated USING (client_user_id=(SELECT auth.uid()) OR (SELECT public.is_admin()));
REVOKE ALL ON public.ddb_refund_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ddb_refund_requests TO authenticated;

CREATE TABLE IF NOT EXISTS public.ddb_wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL REFERENCES auth.users(id),
  appointment_id uuid REFERENCES public.appointments(id),
  amount numeric(12,2) NOT NULL CHECK (amount <> 0),
  reason text NOT NULL,
  source_ref uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ddb_wallet_credit_reason CHECK (reason <> 'refund_to_credit' OR amount > 0)
);
ALTER TABLE public.ddb_wallet_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ddb_wallet_access ON public.ddb_wallet_ledger;
CREATE POLICY ddb_wallet_access ON public.ddb_wallet_ledger
FOR SELECT TO authenticated USING (client_user_id=(SELECT auth.uid()) OR (SELECT public.is_admin()));
REVOKE ALL ON public.ddb_wallet_ledger FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ddb_wallet_ledger TO authenticated;

CREATE TABLE IF NOT EXISTS public.ddb_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL REFERENCES auth.users(id),
  appointment_id uuid REFERENCES public.appointments(id),
  event_type text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  UNIQUE (event_type,appointment_id)
);
ALTER TABLE public.ddb_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ddb_notifications_access ON public.ddb_notifications;
CREATE POLICY ddb_notifications_access ON public.ddb_notifications
FOR SELECT TO authenticated USING (client_user_id=(SELECT auth.uid()) OR (SELECT public.is_admin()));
REVOKE ALL ON public.ddb_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ddb_notifications TO authenticated;

-- Mensagem inicial editável pelo painel administrativo. Nada é enviado automaticamente ao WhatsApp.
INSERT INTO public.whatsapp_templates(template_key,label,body,is_active)
VALUES ('refund_completed','Reembolso concluído',
        'Olá, {nome_cliente}! Seu reembolso de {valor_reembolso} foi realizado via Pix. Consulte o portal D&D para acompanhar.',true)
ON CONFLICT (template_key) DO NOTHING;

-- Barreira adicional no nível de banco. Protege inclusive INSERT/UPDATE direto de payments.
CREATE OR REPLACE FUNCTION public.ddb_guard_refund_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE
  v_appointment public.appointments%ROWTYPE;
  v_request public.ddb_refund_requests%ROWTYPE;
  v_deposited numeric;
  v_refunded numeric;
BEGIN
  IF NEW.kind <> 'refund' OR NEW.status <> 'recorded' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN
    IF OLD.kind='refund' AND OLD.status='recorded'
       AND OLD.appointment_id IS NOT DISTINCT FROM NEW.appointment_id
       AND OLD.amount IS NOT DISTINCT FROM NEW.amount
    THEN RETURN NEW; END IF;
  END IF;
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN RAISE EXCEPTION 'invalid_refund_amount'; END IF;
  SELECT * INTO v_appointment FROM public.appointments WHERE id=NEW.appointment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'appointment_not_found'; END IF;
  IF v_appointment.deposit_status <> 'refund_pending' THEN RAISE EXCEPTION 'refund_not_pending'; END IF;
  SELECT * INTO v_request FROM public.ddb_refund_requests WHERE appointment_id=NEW.appointment_id FOR UPDATE;
  IF FOUND THEN
    IF v_request.destination <> 'pix' OR v_request.status <> 'pending'
    THEN RAISE EXCEPTION 'refund_destination_already_settled'; END IF;
    IF NEW.method <> 'pix' OR NEW.amount <> v_request.amount
    THEN RAISE EXCEPTION 'refund_must_match_pending_pix_request'; END IF;
  END IF;
  SELECT coalesce(sum(amount),0) INTO v_deposited
  FROM public.payments WHERE appointment_id=NEW.appointment_id AND kind='deposit' AND status='recorded';
  SELECT coalesce(sum(amount),0) INTO v_refunded
  FROM public.payments
  WHERE appointment_id=NEW.appointment_id AND kind='refund' AND status='recorded'
  AND (TG_OP='INSERT' OR id<>NEW.id);
  IF NEW.amount > greatest(least(v_appointment.deposit_amount,v_deposited)-v_refunded,0)
  THEN RAISE EXCEPTION 'refund_exceeds_recorded_deposit'; END IF;
  RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.ddb_guard_refund_payment() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS ddb_guard_refund_payment_trg ON public.payments;
CREATE TRIGGER ddb_guard_refund_payment_trg
BEFORE INSERT OR UPDATE OF appointment_id,kind,method,amount,status ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.ddb_guard_refund_payment();

-- Mesmo que a antiga interface chame record_refund, respeita a escolha Pix/crédito.
CREATE OR REPLACE FUNCTION public.record_refund(
  p_appointment_id uuid, p_amount numeric, p_method text, p_operator_id uuid
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE
  v_id uuid;
  v_appointment public.appointments%ROWTYPE;
  v_request public.ddb_refund_requests%ROWTYPE;
  v_deposited numeric;
  v_refunded numeric;
  v_available numeric;
  v_client uuid;
  v_tpl text;
  v_message text;
  v_name text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin_required'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF p_method IS NULL OR p_method NOT IN ('pix','cash','credit','debit','other')
  THEN RAISE EXCEPTION 'invalid_method'; END IF;
  IF p_operator_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.internal_operators
      WHERE id=p_operator_id AND is_active
  ) THEN RAISE EXCEPTION 'inactive_operator'; END IF;
  SELECT * INTO v_appointment FROM public.appointments
  WHERE id=p_appointment_id FOR UPDATE;
  IF NOT FOUND OR v_appointment.deposit_status <> 'refund_pending'
  THEN RAISE EXCEPTION 'refund_not_pending'; END IF;
  SELECT * INTO v_request FROM public.ddb_refund_requests
  WHERE appointment_id=p_appointment_id FOR UPDATE;
  IF FOUND THEN
    IF v_request.destination <> 'pix' OR v_request.status <> 'pending'
    THEN RAISE EXCEPTION 'refund_destination_already_settled'; END IF;
    IF p_method <> 'pix' OR p_amount <> v_request.amount
    THEN RAISE EXCEPTION 'refund_must_match_pending_pix_request'; END IF;
  END IF;
  SELECT coalesce(sum(amount),0) INTO v_deposited
  FROM public.payments WHERE appointment_id=p_appointment_id AND kind='deposit' AND status='recorded';
  SELECT coalesce(sum(amount),0) INTO v_refunded
  FROM public.payments WHERE appointment_id=p_appointment_id AND kind='refund' AND status='recorded';
  v_available := greatest(least(v_appointment.deposit_amount,v_deposited)-v_refunded,0);
  IF p_amount > v_available THEN RAISE EXCEPTION 'refund_exceeds_recorded_deposit'; END IF;

  INSERT INTO public.payments(appointment_id,kind,method,amount,status,paid_at,operator_id)
  VALUES(p_appointment_id,'refund',p_method,p_amount,'recorded',now(),p_operator_id)
  RETURNING id INTO v_id;

  IF v_request.id IS NOT NULL THEN
    UPDATE public.ddb_refund_requests
    SET status='completed',completed_at=now() WHERE id=v_request.id;
  END IF;

  IF p_amount >= v_available THEN
    UPDATE public.appointments SET deposit_status='refunded' WHERE id=p_appointment_id;
    UPDATE public.operational_tasks
    SET status='done',completed_at=now(),resolved_at=now(),resolution_action='refund_recorded'
    WHERE appointment_id=p_appointment_id AND task_type='refund' AND status IN ('open','in_progress');
    SELECT a.client_id,a.client_name_snapshot INTO v_client,v_name
    FROM public.appointments a WHERE a.id=p_appointment_id;
    SELECT body INTO v_tpl FROM public.whatsapp_templates
    WHERE template_key='refund_completed' AND is_active LIMIT 1;
    v_message := coalesce(v_tpl,'Olá, {nome_cliente}! Seu reembolso de {valor_reembolso} foi concluído.');
    v_message := replace(v_message,'{nome_cliente}',coalesce(v_name,'cliente'));
    v_message := replace(v_message,'{cliente}',coalesce(v_name,'cliente'));
    v_message := replace(v_message,'{valor_reembolso}',
      'R$ '||replace(to_char(round(p_amount,2),'FM999999990.00'),'.',','));
    v_message := replace(v_message,'{codigo_agendamento}',p_appointment_id::text);
    IF v_client IS NOT NULL THEN
      INSERT INTO public.ddb_notifications(client_user_id,appointment_id,event_type,body)
      VALUES(v_client,p_appointment_id,'refund_completed',v_message)
      ON CONFLICT (event_type,appointment_id) DO NOTHING;
    END IF;
  END IF;
  INSERT INTO public.appointment_events(appointment_id,event_type,operator_id,payload)
  VALUES (p_appointment_id,'refund_recorded',p_operator_id,
          jsonb_build_object('amount',p_amount,'method',p_method));
  RETURN v_id;
END $fn$;
REVOKE ALL ON FUNCTION public.record_refund(uuid,numeric,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_refund(uuid,numeric,text,uuid) TO authenticated;

-- Uma solicitação de cliente por agendamento; a transação bloqueia o agendamento.
CREATE OR REPLACE FUNCTION public.ddb_request_refund(
  p_appointment_id uuid, p_destination text,
  p_pix_type text DEFAULT NULL,p_pix_key text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE
  v_appointment public.appointments%ROWTYPE;
  v_deposited numeric;
  v_refunded numeric;
  v_amount numeric(12,2);
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  SELECT * INTO v_appointment FROM public.appointments WHERE id=p_appointment_id FOR UPDATE;
  IF NOT FOUND OR v_appointment.client_id IS DISTINCT FROM auth.uid()
  THEN RAISE EXCEPTION 'appointment_not_owned'; END IF;
  IF v_appointment.status <> 'cancelled' OR v_appointment.deposit_status <> 'refund_pending'
  THEN RAISE EXCEPTION 'refund_not_available'; END IF;
  IF EXISTS (SELECT 1 FROM public.ddb_refund_requests WHERE appointment_id=p_appointment_id)
  THEN RAISE EXCEPTION 'refund_destination_already_selected'; END IF;
  SELECT coalesce(sum(amount),0) INTO v_deposited
  FROM public.payments WHERE appointment_id=p_appointment_id AND kind='deposit' AND status='recorded';
  SELECT coalesce(sum(amount),0) INTO v_refunded
  FROM public.payments WHERE appointment_id=p_appointment_id AND kind='refund' AND status='recorded';
  v_amount:=round(greatest(least(v_appointment.deposit_amount,v_deposited)-v_refunded,0),2);
  IF v_amount <= 0 THEN RAISE EXCEPTION 'no_refundable_deposit'; END IF;
  IF p_destination IS NULL OR p_destination NOT IN ('pix','credit')
  THEN RAISE EXCEPTION 'invalid_destination'; END IF;
  IF p_destination='pix' AND (
    p_pix_type IS NULL OR p_pix_type NOT IN ('cpf','cnpj','phone','email','random')
    OR p_pix_key IS NULL OR length(btrim(p_pix_key)) NOT BETWEEN 5 AND 120
  ) THEN RAISE EXCEPTION 'invalid_pix_key'; END IF;

  INSERT INTO public.ddb_refund_requests(appointment_id,client_user_id,destination,
           amount,pix_type,pix_key,status)
  VALUES(p_appointment_id,auth.uid(),p_destination,v_amount,
    CASE WHEN p_destination='pix' THEN p_pix_type END,
    CASE WHEN p_destination='pix' THEN btrim(p_pix_key) END,
    CASE WHEN p_destination='pix' THEN 'pending' ELSE 'credited' END)
  RETURNING id INTO v_id;

  IF p_destination='credit' THEN
    INSERT INTO public.ddb_wallet_ledger(client_user_id,appointment_id,amount,reason,source_ref)
    VALUES(auth.uid(),p_appointment_id,v_amount,'refund_to_credit',v_id);
    UPDATE public.appointments SET deposit_status='credited' WHERE id=p_appointment_id;
    UPDATE public.operational_tasks
    SET status='done',completed_at=now(),resolved_at=now(),resolution_action='converted_to_credit'
    WHERE appointment_id=p_appointment_id AND task_type='refund' AND status IN ('open','in_progress');
    INSERT INTO public.appointment_events(appointment_id,event_type,payload)
    VALUES(p_appointment_id,'refund_converted_to_credit',jsonb_build_object('amount',v_amount,'request_id',v_id));
  ELSE
    INSERT INTO public.appointment_events(appointment_id,event_type,payload)
    VALUES(p_appointment_id,'pix_refund_requested',jsonb_build_object('amount',v_amount,'request_id',v_id));
  END IF;
  RETURN v_id;
END $fn$;
REVOKE ALL ON FUNCTION public.ddb_request_refund(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ddb_request_refund(uuid,text,text,text) TO authenticated;

-- Confirmação manual pelo admin; conclusão, pagamento e notificação são atômicos.
CREATE OR REPLACE FUNCTION public.ddb_admin_finish_refund(
  p_request_id uuid,p_operator_id uuid
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE
  v_appointment_id uuid;
  v_request public.ddb_refund_requests%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin_required'; END IF;
  SELECT appointment_id INTO v_appointment_id FROM public.ddb_refund_requests WHERE id=p_request_id;
  IF v_appointment_id IS NULL THEN RAISE EXCEPTION 'refund_request_not_found'; END IF;
  PERFORM 1 FROM public.appointments WHERE id=v_appointment_id FOR UPDATE;
  SELECT * INTO v_request FROM public.ddb_refund_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.destination <> 'pix' OR v_request.status <> 'pending'
  THEN RAISE EXCEPTION 'pix_refund_not_pending'; END IF;
  PERFORM public.record_refund(v_request.appointment_id,v_request.amount,'pix',p_operator_id);
  IF NOT EXISTS(SELECT 1 FROM public.ddb_refund_requests
                WHERE id=p_request_id AND status='completed')
  THEN RAISE EXCEPTION 'refund_completion_failed'; END IF;
END $fn$;
REVOKE ALL ON FUNCTION public.ddb_admin_finish_refund(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ddb_admin_finish_refund(uuid,uuid) TO authenticated;
