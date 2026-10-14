-- D&D Braids: client cancellation respects fractional hours without make_interval(hours => numeric).
-- Safe replacement: preserves authentication, cutoff semantics, payment status,
-- operational tasks, and appointment event logging.
CREATE OR REPLACE FUNCTION public.client_cancel_appointment(
  p_appointment_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_dep numeric;
  v_dep_stat text;
  v_start timestamptz;
  v_status text;
  v_hours numeric := 24;
BEGIN
  SELECT deposit_amount, deposit_status, scheduled_start, status
    INTO v_dep, v_dep_stat, v_start, v_status
    FROM public.appointments
   WHERE id = p_appointment_id
     AND client_id = auth.uid()
     AND status NOT IN ('completed','cancelled','rejected','no_show')
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'appointment_not_cancellable';
  END IF;

  SELECT coalesce((value #>> '{}')::numeric,24)
    INTO v_hours
    FROM public.app_settings
   WHERE key='cancellation_hours';

  -- make_interval(hours => ...) accepts integer, not numeric.
  -- Seconds + explicit cast also preserves fractional-hour settings.
  IF v_status='confirmed'
     AND v_start IS NOT NULL
     AND now() > v_start - make_interval(secs => (v_hours * 3600)::double precision)
  THEN
    RAISE EXCEPTION 'cancellation_cutoff_passed';
  END IF;

  UPDATE public.appointments
     SET status='cancelled',
         cancelled_at=now(),
         cancellation_reason=p_reason,
         deposit_status=CASE
           WHEN v_dep_stat='paid' AND v_dep>0 THEN 'refund_pending'
           ELSE v_dep_stat
         END
   WHERE id=p_appointment_id;

  IF v_dep_stat='paid' AND v_dep>0 THEN
    INSERT INTO public.operational_tasks(appointment_id,title,description,status,task_type)
    VALUES(p_appointment_id,'Reembolso pendente',
           'Cancelamento feito pela cliente; reembolsar sinal.','open','refund');
  END IF;

  INSERT INTO public.appointment_events(appointment_id,event_type,payload)
  VALUES(p_appointment_id,'client_cancelled',jsonb_build_object('reason',p_reason));
END;
$function$;
