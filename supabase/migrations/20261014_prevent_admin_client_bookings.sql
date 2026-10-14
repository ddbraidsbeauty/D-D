-- Reject public client bookings from admin-authenticated accounts. Manual admin booking remains available.
CREATE OR REPLACE FUNCTION public.create_booking_request_v3(p_professional_id uuid, p_service_id uuid, p_method_id uuid, p_variation_id uuid, p_scheduled_start timestamp with time zone, p_client_name text, p_client_phone text, p_client_email text, p_notes text DEFAULT NULL::text, p_brings_own_material boolean DEFAULT false, p_option_ids uuid[] DEFAULT '{}'::uuid[], p_accessory_ids uuid[] DEFAULT '{}'::uuid[], p_material_variant_id uuid DEFAULT NULL::uuid, p_reference_image_path text DEFAULT NULL::text, p_maintenance_of_service_id uuid DEFAULT NULL::uuid, p_consent_accepted boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;v_text text;v_version text;v_base numeric;v_total numeric;v_dep numeric;v_dep_mode text;v_prof_override numeric;v_status text;v_dep_status text;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if public.is_admin() then raise exception 'admin_booking_forbidden'; end if;
 if not p_consent_accepted then raise exception 'standard_consent_required'; end if;
 select value #>> '{}' into v_text from public.app_settings where key='consent_standard_text';
 select value #>> '{}' into v_version from public.app_settings where key='consent_standard_version';
 if coalesce(trim(v_text),'')='' then raise exception 'standard_consent_text_not_configured'; end if;

 v_id:=public.create_booking_request_v2(p_professional_id,p_service_id,p_method_id,p_variation_id,p_scheduled_start,p_client_name,p_client_phone,p_client_email,p_notes,p_brings_own_material,p_option_ids,p_accessory_ids,p_material_variant_id,p_reference_image_path,p_maintenance_of_service_id);

 select base_price,deposit_mode,deposit_value into v_base,v_dep_mode,v_dep from public.catalog_services where id=p_service_id;
 if p_method_id is not null then select coalesce(base_price_override,v_base) into v_base from public.catalog_methods where id=p_method_id; end if;
 if p_variation_id is not null then select coalesce(base_price_override,v_base) into v_base from public.catalog_variations where id=p_variation_id; end if;
 select price_override into v_prof_override from public.professional_service_settings where professional_id=p_professional_id and service_id=p_service_id and method_id is not distinct from p_method_id and variation_id is not distinct from p_variation_id and is_enabled limit 1;
 v_base:=coalesce(v_prof_override,v_base,0);
 select v_base + coalesce((select sum(price_delta_snapshot) from public.appointment_options where appointment_id=v_id),0) + coalesce((select sum(price_snapshot) from public.appointment_accessories where appointment_id=v_id),0) into v_total;
 if v_dep_mode='fixed' then v_dep:=least(coalesce(v_dep,0),v_total);
 elsif v_dep_mode='percent' then v_dep:=round(v_total*coalesce(v_dep,0)/100,2);
 else v_dep:=0; end if;
 if v_dep>0 then v_status:='awaiting_fee';v_dep_status:='awaiting_send';else v_status:='pending_review';v_dep_status:='not_required';end if;
 update public.appointments set total_amount=v_total,deposit_amount=v_dep,deposit_status=v_dep_status,status=v_status where id=v_id;
 update public.operational_tasks set task_type=case when v_dep>0 then 'deposit_send' else 'request_review' end,
 title=case when v_dep>0 then 'Enviar PIX do sinal' else 'Revisar solicitação' end,
 description=case when v_dep>0 then 'Enviar cobrança de sinal à cliente.' else 'Nova solicitação sem sinal pendente.' end
 where appointment_id=v_id and status='open' and task_type in ('deposit_send','request_review');

 insert into public.consents(appointment_id,client_id,consent_type,version,content_snapshot,accepted,accepted_at)
 values(v_id,auth.uid(),'standard',coalesce(v_version,'1.0'),v_text,true,now());
 insert into public.appointment_events(appointment_id,event_type,payload) values(v_id,'standard_consent_accepted',jsonb_build_object('version',coalesce(v_version,'1.0')));
 return v_id;
end $function$

