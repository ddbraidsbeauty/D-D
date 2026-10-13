-- Applied to Supabase D&D on 2026-10-13 with user authorization.
-- Reference snapshot: do NOT rerun this script during routine GitHub deployments.
-- Does not contain appointment rows or client data.
CREATE TABLE IF NOT EXISTS public.ddb_booking_submission_keys (
 client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_key uuid NOT NULL,
 appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (client_id,request_key), UNIQUE(appointment_id)
);
ALTER TABLE public.ddb_booking_submission_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ddb_booking_submission_keys FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ddb_complete_missing_hair_profile_v1(p_appointment_id uuid, p_answers jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_client uuid := auth.uid();
  v_appointment public.appointments%ROWTYPE;
  v_profile uuid;
BEGIN
  IF v_client IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  SELECT * INTO v_appointment
    FROM public.appointments
    WHERE id=p_appointment_id AND client_id=v_client
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'appointment_not_owned'; END IF;
  IF v_appointment.hair_profile_id IS NOT NULL THEN
    RETURN v_appointment.hair_profile_id;
  END IF;
  IF v_appointment.status NOT IN ('awaiting_fee','fee_sent','pending_review') THEN
    RAISE EXCEPTION 'hair_profile_repair_not_allowed_for_status';
  END IF;

  SELECT id INTO v_profile
  FROM public.client_hair_profiles
  WHERE client_id=v_client AND source_appointment_id=p_appointment_id
  ORDER BY created_at DESC LIMIT 1;

  IF v_profile IS NULL THEN
    IF pg_catalog.jsonb_typeof(p_answers) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'invalid_hair_profile_answers';
    END IF;
    v_profile := public.save_client_hair_profile(p_appointment_id,p_answers);
  END IF;

  UPDATE public.appointments SET hair_profile_id=v_profile
  WHERE id=p_appointment_id AND client_id=v_client AND hair_profile_id IS NULL;
  RETURN v_profile;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ddb_submit_booking_atomic_v1(p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_client uuid := auth.uid();
  v_key uuid;
  v_existing uuid;
  v_appointment uuid;
  v_profile uuid;
  v_answers jsonb;
  v_reuse boolean;
BEGIN
  IF v_client IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  IF pg_catalog.jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'invalid_booking_payload';
  END IF;
  IF p_payload->>'p_consent_accepted' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'standard_consent_required';
  END IF;
  IF p_payload->>'p_brings_own_material' = 'true' THEN
    RAISE EXCEPTION 'own_material_pricing_not_configured';
  END IF;
  IF NULLIF(p_payload->>'p_rc7_idempotency_key','') IS NULL THEN
    RAISE EXCEPTION 'missing_booking_request_key';
  END IF;
  v_key := (p_payload->>'p_rc7_idempotency_key')::uuid;
  v_reuse := COALESCE((p_payload->>'p_reuse_profile')::boolean,false);
  v_answers := p_payload->'p_profile_answers';
  IF NOT v_reuse THEN
    IF pg_catalog.jsonb_typeof(v_answers) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'missing_hair_profile';
    END IF;
    IF v_answers->>'pattern' NOT IN ('1A','1B','1C','2A','2B','2C','3A','3B','3C','4A','4B','4C') THEN
      RAISE EXCEPTION 'invalid_hair_pattern';
    END IF;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(v_client::text),
    pg_catalog.hashtext(v_key::text)
  );
  SELECT appointment_id INTO v_existing
    FROM public.ddb_booking_submission_keys
    WHERE client_id=v_client AND request_key=v_key;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  v_appointment := public.create_booking_request_v3(
    p_professional_id := (p_payload->>'p_professional_id')::uuid,
    p_service_id := (p_payload->>'p_service_id')::uuid,
    p_method_id := NULLIF(p_payload->>'p_method_id','')::uuid,
    p_variation_id := NULLIF(p_payload->>'p_variation_id','')::uuid,
    p_scheduled_start := (p_payload->>'p_scheduled_start')::timestamptz,
    p_client_name := p_payload->>'p_client_name',
    p_client_phone := p_payload->>'p_client_phone',
    p_client_email := p_payload->>'p_client_email',
    p_notes := p_payload->>'p_notes',
    p_brings_own_material := false,
    p_option_ids := ARRAY(
      SELECT value::uuid
      FROM pg_catalog.jsonb_array_elements_text(
        COALESCE(p_payload->'p_option_ids','[]'::jsonb)
      ) AS item(value)
    ),
    p_accessory_ids := ARRAY(
      SELECT value::uuid
      FROM pg_catalog.jsonb_array_elements_text(
        COALESCE(p_payload->'p_accessory_ids','[]'::jsonb)
      ) AS item(value)
    ),
    p_material_variant_id := NULLIF(p_payload->>'p_material_variant_id','')::uuid,
    p_reference_image_path := p_payload->>'p_reference_image_path',
    p_maintenance_of_service_id := NULLIF(p_payload->>'p_maintenance_of_service_id','')::uuid,
    p_consent_accepted := true
  );

  IF v_reuse THEN
    v_profile := public.reuse_latest_hair_profile(v_appointment);
  ELSE
    v_profile := public.save_client_hair_profile(v_appointment,v_answers);
    UPDATE public.appointments
       SET hair_profile_id = v_profile
     WHERE id = v_appointment AND client_id = v_client;
  END IF;
  IF v_profile IS NULL THEN RAISE EXCEPTION 'hair_profile_not_saved'; END IF;

  INSERT INTO public.ddb_booking_submission_keys(client_id,request_key,appointment_id)
  VALUES(v_client,v_key,v_appointment);
  RETURN v_appointment;
END;
$function$;

REVOKE ALL ON FUNCTION public.ddb_submit_booking_atomic_v1(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ddb_submit_booking_atomic_v1(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.ddb_complete_missing_hair_profile_v1(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ddb_complete_missing_hair_profile_v1(uuid,jsonb) TO authenticated;
