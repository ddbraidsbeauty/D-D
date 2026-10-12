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
