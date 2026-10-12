-- REVISÃO PARA SCHEMA REAL DE 2026-10-12 — SOMENTE HOMOLOGAÇÃO.
-- ALTERAÇÕES: proprietário real é appointments.client_id, tabela correta é catalog_services,
-- consentimento deve ser explícito, e status/tarefa do sinal após desconto devem ser coerentes.
-- NÃO APLICAR NO BANCO ATIVO: conversão de sinal em crédito e conciliação financeira ainda
-- requerem revisão para impedir dupla devolução; ver AUDITORIA_SUPABASE_RC8.md.
-- D&D Braids RC7 — migração ADITIVA, preparada para revisão antes de aplicar.
-- IMPORTANTE: NÃO EXECUTADA NO SUPABASE ATIVO. Conferir nomes/assinaturas do schema
-- e executar primeiro em um projeto de homologação. Não modifica tabelas anteriores.
BEGIN;

CREATE TABLE IF NOT EXISTS public.ddb_material_prices (
  professional_id uuid NOT NULL REFERENCES public.professionals(id),
  material_variant_id uuid NOT NULL REFERENCES public.material_variants(id),
  discount_unit_amount numeric(12,2) NOT NULL CHECK(discount_unit_amount >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(professional_id,material_variant_id)
);
ALTER TABLE public.ddb_material_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ddb_material_prices_read ON public.ddb_material_prices;
CREATE POLICY ddb_material_prices_read ON public.ddb_material_prices FOR SELECT TO anon,authenticated USING (true);
GRANT SELECT ON public.ddb_material_prices TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.ddb_save_material_price(p_professional_id uuid,p_variant_id uuid,p_price numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF p_price IS NULL OR p_price < 0 OR p_price > 999999 THEN RAISE EXCEPTION 'Preço inválido'; END IF;
  INSERT INTO public.ddb_material_prices(professional_id,material_variant_id,discount_unit_amount,updated_at)
  VALUES(p_professional_id,p_variant_id,round(p_price,2),now())
  ON CONFLICT(professional_id,material_variant_id) DO UPDATE SET discount_unit_amount=EXCLUDED.discount_unit_amount,updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.ddb_save_material_price(uuid,uuid,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ddb_save_material_price(uuid,uuid,numeric) TO authenticated;

-- Atomic per-variation package quantities. The old single free-text estimate is not used.
CREATE OR REPLACE FUNCTION public.ddb_replace_material_quantities(p_material_id uuid,p_rules jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF jsonb_typeof(p_rules)<>'array' THEN RAISE EXCEPTION 'Regras inválidas'; END IF;
 -- Transactional delete/insert: failure restores previous rules.
 DELETE FROM public.service_material_requirements WHERE material_id=p_material_id;
 FOR r IN SELECT value FROM jsonb_array_elements(p_rules) LOOP
   IF (r->>'quantity')::numeric<=0 THEN RAISE EXCEPTION 'Quantidade deve ser positiva'; END IF;
   INSERT INTO public.service_material_requirements(service_id,method_id,variation_id,material_id,estimated_quantity)
   VALUES((r->>'service_id')::uuid,NULLIF(r->>'method_id','')::uuid,NULLIF(r->>'variation_id','')::uuid,p_material_id,round((r->>'quantity')::numeric,2));
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.ddb_replace_material_quantities(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ddb_replace_material_quantities(uuid,jsonb) TO authenticated;

-- Quote snapshots keep confirmed amounts stable when catalogue prices change.
CREATE TABLE IF NOT EXISTS public.ddb_booking_material_snapshot (
 appointment_id uuid NOT NULL REFERENCES public.appointments(id),
 material_id uuid NOT NULL REFERENCES public.materials(id),
 variant_id uuid NOT NULL REFERENCES public.material_variants(id),
 quantity numeric(10,2) NOT NULL CHECK(quantity>0),
 discount_unit_amount numeric(12,2) NOT NULL CHECK(discount_unit_amount>=0),
 PRIMARY KEY(appointment_id,material_id)
);
ALTER TABLE public.ddb_booking_material_snapshot ENABLE ROW LEVEL SECURITY;
-- No browser SELECT/INSERT: admin uses aggregate views; owner sees own quote in appointments.

-- Exactly-once request key for submit/retry after network interruption.
CREATE TABLE IF NOT EXISTS public.ddb_booking_idempotency (
 request_id uuid PRIMARY KEY, client_user_id uuid NOT NULL REFERENCES auth.users(id),
 appointment_id uuid NOT NULL UNIQUE REFERENCES public.appointments(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ddb_booking_idempotency ENABLE ROW LEVEL SECURITY;
-- No browser table grants: clients access only through the secure booking RPC.

-- Atomic wrapper: creates appointment, applies configured materials, persists hair data.
-- Uses the *existing* V3 booking RPC; never invents a parallel appointment system.
CREATE OR REPLACE FUNCTION public.ddb_create_booking_v7(p_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_id uuid;v_pro uuid;v_service uuid;v_method uuid;v_variation uuid;
 v_own boolean;v_choice jsonb;v_discount numeric(12,2):=0;v_total numeric(12,2);
 v_expected integer:=0;v_actual integer:=0;r record;v_variant uuid;v_price numeric(12,2);v_deposit numeric(12,2);v_key uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para enviar a solicitação'; END IF;
 IF COALESCE((p_payload->>'p_consent_accepted')::boolean,false) IS DISTINCT FROM true THEN RAISE EXCEPTION 'standard_consent_required'; END IF;
 v_key=NULLIF(p_payload->>'p_rc7_idempotency_key','')::uuid;
 IF v_key IS NULL THEN RAISE EXCEPTION 'Identificador de solicitação obrigatório'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text||':'||v_key::text));
 SELECT appointment_id INTO v_id FROM public.ddb_booking_idempotency WHERE request_id=v_key AND client_user_id=auth.uid();
 IF v_id IS NOT NULL THEN RETURN v_id; END IF;
 IF EXISTS(SELECT 1 FROM public.ddb_booking_idempotency WHERE request_id=v_key) THEN RAISE EXCEPTION 'Identificador usado por outra conta'; END IF;
 v_pro=(p_payload->>'p_professional_id')::uuid;
 v_service=(p_payload->>'p_service_id')::uuid;
 v_method=NULLIF(p_payload->>'p_method_id','')::uuid;
 v_variation=NULLIF(p_payload->>'p_variation_id','')::uuid;
 v_own=COALESCE((p_payload->>'p_brings_own_material')::boolean,false);
 v_choice=COALESCE(p_payload->'p_rc7_material_choices','{}'::jsonb);
 IF jsonb_typeof(v_choice)<>'object' THEN RAISE EXCEPTION 'Seleção de materiais inválida'; END IF;
 -- For own materials, price and quantity MUST be validated on the server.
 IF v_own THEN
   SELECT count(*) INTO v_actual FROM jsonb_object_keys(v_choice);
   FOR r IN
     SELECT DISTINCT ON (req.material_id) req.material_id,req.estimated_quantity
     FROM public.service_material_requirements req
     WHERE req.service_id=v_service
       AND (req.method_id IS NULL OR req.method_id=v_method)
       AND (req.variation_id IS NULL OR req.variation_id=v_variation)
     ORDER BY req.material_id,(req.variation_id IS NOT NULL) DESC,(req.method_id IS NOT NULL) DESC
   LOOP
     v_expected=v_expected+1;
     IF r.estimated_quantity IS NULL OR r.estimated_quantity::numeric<=0 THEN RAISE EXCEPTION 'Quantidade não configurada'; END IF;
     v_variant=NULLIF(v_choice->>r.material_id::text,'')::uuid;
     IF v_variant IS NULL OR NOT EXISTS(SELECT 1 FROM public.material_variants mv WHERE mv.id=v_variant AND mv.material_id=r.material_id) THEN
       RAISE EXCEPTION 'Cor/tamanho inválido para material';
     END IF;
     SELECT p.discount_unit_amount INTO v_price FROM public.ddb_material_prices p
     WHERE p.professional_id=v_pro AND p.material_variant_id=v_variant;
     IF v_price IS NULL THEN RAISE EXCEPTION 'Preço do material não configurado'; END IF;
     v_discount=v_discount+round(v_price*r.estimated_quantity::numeric,2);
   END LOOP;
   IF v_expected=0 OR v_expected<>v_actual THEN RAISE EXCEPTION 'A cliente deve fornecer todos os materiais especificados'; END IF;
 END IF;
 -- Retain original V3 validation: Auth, date, availability, confirmation, etc.
 SELECT public.create_booking_request_v3(
   p_professional_id=>v_pro,
   p_service_id=>v_service,
   p_method_id=>v_method,
   p_variation_id=>v_variation,
   p_scheduled_start=>(p_payload->>'p_scheduled_start')::timestamptz,
   p_client_name=>p_payload->>'p_client_name',
   p_client_phone=>p_payload->>'p_client_phone',
   p_client_email=>p_payload->>'p_client_email',
   p_notes=>p_payload->>'p_notes',
   p_brings_own_material=>v_own,
   p_option_ids=>ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_payload->'p_option_ids','[]'::jsonb))::uuid),
   p_accessory_ids=>ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_payload->'p_accessory_ids','[]'::jsonb))::uuid),
   p_material_variant_id=>NULLIF(p_payload->>'p_material_variant_id','')::uuid,
   p_reference_image_path=>p_payload->>'p_reference_image_path',
   p_maintenance_of_service_id=>NULLIF(p_payload->>'p_maintenance_of_service_id','')::uuid,
   p_consent_accepted=>COALESCE((p_payload->>'p_consent_accepted')::boolean,false)
 ) INTO v_id;
 IF v_id IS NULL THEN RAISE EXCEPTION 'Falha ao criar agendamento'; END IF;
 SELECT total_amount,deposit_amount INTO v_total,v_deposit FROM public.appointments WHERE id=v_id FOR UPDATE;
 IF v_own THEN
   IF v_discount>v_total THEN RAISE EXCEPTION 'Desconto excede o valor original do atendimento'; END IF;
   -- Preserve fixed deposit; prorate percentage deposit. Never exceed final total.
   UPDATE public.appointments SET
      total_amount=round(v_total-v_discount,2),
      deposit_amount=least(round(v_total-v_discount,2),CASE WHEN (SELECT deposit_mode FROM public.catalog_services WHERE id=v_service)='percent' AND v_total>0 THEN round(v_deposit*(v_total-v_discount)/v_total,2) ELSE v_deposit END)
   WHERE id=v_id;
   -- O pedido pode deixar de precisar de sinal após o desconto. Sincronizar status e tarefa.
   UPDATE public.appointments SET
      status=CASE WHEN deposit_amount>0 THEN 'awaiting_fee' ELSE 'pending_review' END,
      deposit_status=CASE WHEN deposit_amount>0 THEN 'awaiting_send' ELSE 'not_required' END
   WHERE id=v_id;
   UPDATE public.operational_tasks t SET
      task_type=CASE WHEN a.deposit_amount>0 THEN 'deposit_send' ELSE 'request_review' END,
      title=CASE WHEN a.deposit_amount>0 THEN 'Enviar PIX do sinal' ELSE 'Revisar solicitação' END,
      description=CASE WHEN a.deposit_amount>0 THEN 'Enviar cobrança de sinal à cliente.' ELSE 'Nova solicitação sem sinal pendente.' END
   FROM public.appointments a
   WHERE t.appointment_id=v_id AND a.id=v_id AND t.status='open'
     AND t.task_type IN ('deposit_send','request_review');
   FOR r IN
     SELECT DISTINCT ON (req.material_id) req.material_id,req.estimated_quantity
     FROM public.service_material_requirements req
     WHERE req.service_id=v_service AND (req.method_id IS NULL OR req.method_id=v_method)
       AND (req.variation_id IS NULL OR req.variation_id=v_variation)
     ORDER BY req.material_id,(req.variation_id IS NOT NULL) DESC,(req.method_id IS NOT NULL) DESC
   LOOP
     v_variant=(v_choice->>r.material_id::text)::uuid;
     SELECT discount_unit_amount INTO v_price FROM public.ddb_material_prices
     WHERE professional_id=v_pro AND material_variant_id=v_variant;
     INSERT INTO public.ddb_booking_material_snapshot(appointment_id,material_id,variant_id,quantity,discount_unit_amount)
     VALUES(v_id,r.material_id,v_variant,r.estimated_quantity,v_price);
   END LOOP;
 END IF;
 INSERT INTO public.ddb_booking_idempotency(request_id,client_user_id,appointment_id) VALUES(v_key,auth.uid(),v_id);
 IF COALESCE((p_payload->>'p_reuse_profile')::boolean,false) THEN
   PERFORM public.reuse_latest_hair_profile(p_appointment_id=>v_id);
 ELSE
   PERFORM public.save_client_hair_profile(p_appointment_id=>v_id,p_answers=>p_payload->'p_profile_answers');
 END IF;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.ddb_create_booking_v7(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ddb_create_booking_v7(jsonb) TO authenticated;

-- Deny-by-default booking ownership verification. Adapt only after confirming original schema.
-- Avoids trusting phone/email supplied by client. Scans known Auth ownership field names.
CREATE OR REPLACE FUNCTION public.ddb_is_booking_owner(p_appointment_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
SELECT EXISTS (
  SELECT 1 FROM public.appointments a
  WHERE a.id=p_appointment_id AND a.client_id=auth.uid()
) $$;
REVOKE ALL ON FUNCTION public.ddb_is_booking_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ddb_is_booking_owner(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.ddb_waitlist (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 appointment_id uuid NOT NULL UNIQUE REFERENCES public.appointments(id),
 client_user_id uuid NOT NULL REFERENCES auth.users(id),
 professional_id uuid NOT NULL REFERENCES public.professionals(id),
 status text NOT NULL DEFAULT 'waiting' CHECK(status IN('waiting','offer_pending','accepted_pending_admin','resolved','cancelled')),
 joined_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ddb_waitlist_pro_status ON public.ddb_waitlist(professional_id,status,joined_at);
ALTER TABLE public.ddb_waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ddb_waitlist_access ON public.ddb_waitlist;
CREATE POLICY ddb_waitlist_access ON public.ddb_waitlist FOR SELECT TO authenticated
USING (client_user_id=auth.uid() OR public.is_admin());
GRANT SELECT ON public.ddb_waitlist TO authenticated;

CREATE TABLE IF NOT EXISTS public.ddb_offers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 waitlist_id uuid NOT NULL REFERENCES public.ddb_waitlist(id),
 start_at timestamptz NOT NULL,end_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'proposed' CHECK(status IN('proposed','accepted_pending_admin','declined','expired','withdrawn','confirmed')),
 expires_at timestamptz NOT NULL DEFAULT (now()+interval '48 hours'),
 created_at timestamptz NOT NULL DEFAULT now(),responded_at timestamptz,
 CHECK(end_at>start_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS ddb_one_active_offer ON public.ddb_offers(waitlist_id) WHERE status='proposed';
ALTER TABLE public.ddb_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ddb_offers_access ON public.ddb_offers;
CREATE POLICY ddb_offers_access ON public.ddb_offers FOR SELECT TO authenticated
USING (public.is_admin() OR EXISTS(SELECT 1 FROM public.ddb_waitlist w WHERE w.id=waitlist_id AND w.client_user_id=auth.uid()));
GRANT SELECT ON public.ddb_offers TO authenticated;

CREATE OR REPLACE FUNCTION public.ddb_request_waitlist(p_appointment_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_prof uuid;v_status text;v_id uuid;
BEGIN
 IF NOT public.ddb_is_booking_owner(p_appointment_id) THEN RAISE EXCEPTION 'Agendamento não pertence à sua conta'; END IF;
 SELECT professional_id,status INTO v_prof,v_status FROM public.appointments WHERE id=p_appointment_id;
 IF v_status NOT IN('confirmed','reschedule_requested') THEN RAISE EXCEPTION 'Agendamento não permite solicitar remarcação'; END IF;
 INSERT INTO public.ddb_waitlist(appointment_id,client_user_id,professional_id)
 VALUES(p_appointment_id,auth.uid(),v_prof)
 ON CONFLICT(appointment_id) DO UPDATE SET status='waiting',updated_at=now()
 RETURNING id INTO v_id;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.ddb_request_waitlist(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ddb_request_waitlist(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ddb_admin_queue_affected(p_appointment_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_user uuid; v_prof uuid;v_id uuid;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 SELECT a.client_id,a.professional_id
 INTO v_user,v_prof FROM public.appointments a WHERE a.id=p_appointment_id;
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sem vínculo Auth comprovado: adaptar schema antes de usar'; END IF;
 INSERT INTO public.ddb_waitlist(appointment_id,client_user_id,professional_id)
 VALUES(p_appointment_id,v_user,v_prof)
 ON CONFLICT(appointment_id) DO UPDATE SET status='waiting',updated_at=now() RETURNING id INTO v_id;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.ddb_admin_queue_affected(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ddb_admin_queue_affected(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ddb_admin_offer_slot(p_waitlist_id uuid,p_start_at timestamptz,p_end_at timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_id uuid;v_w public.ddb_waitlist%ROWTYPE;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 SELECT * INTO STRICT v_w FROM public.ddb_waitlist WHERE id=p_waitlist_id FOR UPDATE;
 IF v_w.status NOT IN('waiting','offer_pending') THEN RAISE EXCEPTION 'Esta cliente não está aguardando vaga'; END IF;
 IF p_start_at<=now() OR p_end_at<=p_start_at OR p_end_at>p_start_at+interval '18 hours' THEN RAISE EXCEPTION 'Intervalo inválido'; END IF;
 UPDATE public.ddb_offers SET status='withdrawn' WHERE waitlist_id=p_waitlist_id AND status='proposed';
 INSERT INTO public.ddb_offers(waitlist_id,start_at,end_at) VALUES(p_waitlist_id,p_start_at,p_end_at) RETURNING id INTO v_id;
 UPDATE public.ddb_waitlist SET status='offer_pending',updated_at=now() WHERE id=p_waitlist_id;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.ddb_admin_offer_slot(uuid,timestamptz,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ddb_admin_offer_slot(uuid,timestamptz,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.ddb_reply_offer(p_offer_id uuid,p_accept boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_w public.ddb_waitlist%ROWTYPE;v_o public.ddb_offers%ROWTYPE;v_result text;
BEGIN
 SELECT * INTO STRICT v_o FROM public.ddb_offers WHERE id=p_offer_id FOR UPDATE;
 SELECT * INTO STRICT v_w FROM public.ddb_waitlist WHERE id=v_o.waitlist_id FOR UPDATE;
 IF v_w.client_user_id<>auth.uid() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF v_o.status<>'proposed' OR v_o.expires_at<=now() THEN RAISE EXCEPTION 'Proposta indisponível'; END IF;
 v_result=CASE WHEN p_accept THEN 'accepted_pending_admin' ELSE 'declined' END;
 UPDATE public.ddb_offers SET status=v_result,responded_at=now() WHERE id=v_o.id;
 UPDATE public.ddb_waitlist SET status=CASE WHEN p_accept THEN 'accepted_pending_admin' ELSE 'waiting' END,updated_at=now() WHERE id=v_w.id;
 -- Aceite NÃO muda agenda automaticamente: admin confere vaga com RPC legado e confirma.
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.ddb_reply_offer(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ddb_reply_offer(uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.ddb_admin_finish_offer(p_offer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_o public.ddb_offers%ROWTYPE;v_w public.ddb_waitlist%ROWTYPE;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 SELECT * INTO STRICT v_o FROM public.ddb_offers WHERE id=p_offer_id FOR UPDATE;
 SELECT * INTO STRICT v_w FROM public.ddb_waitlist WHERE id=v_o.waitlist_id FOR UPDATE;
 IF v_o.status<>'accepted_pending_admin' THEN RAISE EXCEPTION 'Aceite ainda não registrado'; END IF;
 -- Confirme a alteração da agenda via reschedule_appointment ANTES desta chamada.
 IF NOT EXISTS (SELECT 1 FROM public.appointments a WHERE a.id=v_w.appointment_id AND a.scheduled_start=v_o.start_at AND a.expected_end=v_o.end_at AND a.professional_id=v_w.professional_id AND a.status='confirmed')
 THEN RAISE EXCEPTION 'A alteração real de agenda ainda não foi confirmada'; END IF;
 UPDATE public.ddb_offers SET status='confirmed' WHERE id=p_offer_id;
 UPDATE public.ddb_waitlist SET status='resolved',updated_at=now() WHERE id=v_w.id;
END $$;
REVOKE ALL ON FUNCTION public.ddb_admin_finish_offer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ddb_admin_finish_offer(uuid) TO authenticated;

-- FINANCEIRO: destino único do sinal, proteção do fluxo antigo e aviso de conclusão.
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

-- Registros de depósito/reembolso já destinados via Pix ou crédito não podem ser
-- adulterados por UPDATE/DELETE administrativos diretos.
CREATE OR REPLACE FUNCTION public.ddb_guard_allocated_payment_edits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
BEGIN
  IF TG_OP='UPDATE' AND OLD.appointment_id IS NOT DISTINCT FROM NEW.appointment_id
     AND OLD.kind IS NOT DISTINCT FROM NEW.kind
     AND OLD.method IS NOT DISTINCT FROM NEW.method
     AND OLD.amount IS NOT DISTINCT FROM NEW.amount
     AND OLD.status IS NOT DISTINCT FROM NEW.status
     AND OLD.paid_at IS NOT DISTINCT FROM NEW.paid_at
  THEN RETURN NEW; END IF;
  IF OLD.kind IN ('deposit','refund') AND OLD.status='recorded' THEN
    PERFORM 1 FROM public.appointments WHERE id=OLD.appointment_id FOR UPDATE;
    IF EXISTS (SELECT 1 FROM public.ddb_refund_requests WHERE appointment_id=OLD.appointment_id)
    THEN RAISE EXCEPTION 'allocated_payment_immutable'; END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.ddb_guard_allocated_payment_edits() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS ddb_guard_allocated_payments_trg ON public.payments;
CREATE TRIGGER ddb_guard_allocated_payments_trg
BEFORE UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.ddb_guard_allocated_payment_edits();

-- SILBD conservador: apenas encerra propostas expiradas (não apaga clientes/finanças).
CREATE OR REPLACE FUNCTION public.ddb_silbd_maintenance()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_expired integer;v_reset integer;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 UPDATE public.ddb_offers SET status='expired' WHERE status='proposed' AND expires_at<=now();
 GET DIAGNOSTICS v_expired=ROW_COUNT;
 UPDATE public.ddb_waitlist w SET status='waiting',updated_at=now()
 WHERE w.status='offer_pending' AND NOT EXISTS(
   SELECT 1 FROM public.ddb_offers o WHERE o.waitlist_id=w.id AND o.status='proposed');
 GET DIAGNOSTICS v_reset=ROW_COUNT;
 RETURN jsonb_build_object('expired_offers',v_expired,'reopened_waitlist_entries',v_reset);
END $$;
REVOKE ALL ON FUNCTION public.ddb_silbd_maintenance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ddb_silbd_maintenance() TO authenticated;
-- Execução manual; agendamento Cron/Edge NÃO configurado sem autorização e validação.

-- No INSERT/UPDATE/DELETE table grants to browser roles: all mutations via controlled RPCs.
COMMIT;
