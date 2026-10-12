-- D&D Braids: support review of the CURRENT versioned hair profile linked to each appointment.
-- Does not alter existing client records when installed. Saving a review creates a new
-- version, leaving prior versions and other appointments' historical links intact.
CREATE OR REPLACE FUNCTION public.ddb_admin_review_hair_profile(
  p_appointment_id uuid,
  p_answers jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_appointment public.appointments%ROWTYPE;
  v_profile public.client_hair_profiles%ROWTYPE;
  v_new_id uuid;
  v_version integer;
  v_merged jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;
  IF jsonb_typeof(p_answers) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'invalid_hair_profile_answers';
  END IF;
  SELECT * INTO v_appointment
    FROM public.appointments
    WHERE id = p_appointment_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'appointment_not_found';
  END IF;
  IF v_appointment.status NOT IN ('pending_review', 'client_aware', 'not_recommended') THEN
    RAISE EXCEPTION 'hair_profile_review_not_allowed_for_status';
  END IF;
  SELECT * INTO v_profile
    FROM public.client_hair_profiles
    WHERE id = v_appointment.hair_profile_id
      AND client_id = v_appointment.client_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'hair_profile_not_linked_to_appointment';
  END IF;
  v_merged := coalesce(v_profile.answers, '{}'::jsonb) || p_answers;
  IF nullif(btrim(coalesce(v_merged->>'hair_type', '')), '') IS NULL
     OR nullif(btrim(coalesce(v_merged->>'pattern', '')), '') IS NULL THEN
    RAISE EXCEPTION 'required_hair_profile_fields_missing';
  END IF;
  IF jsonb_typeof(v_merged->'frequent_heat') IS DISTINCT FROM 'array'
     OR jsonb_typeof(v_merged->'problems') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'invalid_hair_profile_choices';
  END IF;
  SELECT coalesce(max(version), 0) + 1 INTO v_version
    FROM public.client_hair_profiles
    WHERE client_id = v_appointment.client_id;
  UPDATE public.client_hair_profiles
    SET superseded_at = coalesce(superseded_at, now())
    WHERE id = v_profile.id;
  INSERT INTO public.client_hair_profiles
    (client_id, source_appointment_id, version, answers)
    VALUES (v_appointment.client_id, p_appointment_id, v_version, v_merged)
    RETURNING id INTO v_new_id;
  UPDATE public.appointments
    SET hair_profile_id = v_new_id
    WHERE id = p_appointment_id;
  INSERT INTO public.appointment_events
    (appointment_id, event_type, payload)
    VALUES (p_appointment_id, 'anamnesis_admin_updated',
      jsonb_build_object('previous_profile_id', v_profile.id,
                         'new_profile_id', v_new_id,
                         'version', v_version));
  RETURN v_new_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.ddb_admin_review_hair_profile(uuid, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ddb_admin_review_hair_profile(uuid, jsonb)
  TO authenticated;
