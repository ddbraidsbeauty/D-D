-- D&D Braids — impedir novas concessões de créditos sem apagar histórico.
-- IMPORTANTE: esta migration deve ser executada e validada no Supabase ANTES do frontend Pix-only ir ao ar.
-- Não paga saldos existentes automaticamente. Auditar ddb_wallet_ledger e regularizar obrigações anteriores por Pix.
BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.ddb_refund_requests') IS NULL OR to_regclass('public.ddb_wallet_ledger') IS NULL THEN
    RAISE EXCEPTION 'required_refund_tables_missing';
  END IF;
END $preflight$;

CREATE OR REPLACE FUNCTION public.ddb_refund_pix_only_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $guard$
BEGIN
  IF NEW.destination IS DISTINCT FROM 'pix' THEN
    RAISE EXCEPTION 'refund_destination_pix_only';
  END IF;
  RETURN NEW;
END $guard$;
REVOKE ALL ON FUNCTION public.ddb_refund_pix_only_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS ddb_refund_pix_only_guard_trg ON public.ddb_refund_requests;
CREATE TRIGGER ddb_refund_pix_only_guard_trg
BEFORE INSERT OR UPDATE OF destination ON public.ddb_refund_requests
FOR EACH ROW EXECUTE FUNCTION public.ddb_refund_pix_only_guard();

CREATE OR REPLACE FUNCTION public.ddb_disable_wallet_credit_grants()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $guard$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.amount > 0) OR
     (TG_OP = 'UPDATE' AND NEW.amount > OLD.amount) THEN
    RAISE EXCEPTION 'new_wallet_credits_disabled';
  END IF;
  RETURN NEW;
END $guard$;
REVOKE ALL ON FUNCTION public.ddb_disable_wallet_credit_grants() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS ddb_disable_wallet_credit_grants_trg ON public.ddb_wallet_ledger;
CREATE TRIGGER ddb_disable_wallet_credit_grants_trg
BEFORE INSERT OR UPDATE OF amount ON public.ddb_wallet_ledger
FOR EACH ROW EXECUTE FUNCTION public.ddb_disable_wallet_credit_grants();

COMMIT;
