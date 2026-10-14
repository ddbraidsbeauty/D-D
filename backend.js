/* D&D Braids Beauty — Supabase production adapter (public publishable key only) */
(() => {
  'use strict';
  const URL = 'https://bbhpzorzjtryjxnugtme.supabase.co';
  const KEY = 'sb_publishable_-3uSx8wiBapulpIM25SG2g_WfkYg5ir';
  const sb = window.supabase.createClient(URL, KEY, { auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
  const rpc = async (name,args={}) => { const {data,error}=await sb.rpc(name,args); if(error) throw error; return data; };
  const table = async (name,cols='*') => { const {data,error}=await sb.from(name).select(cols); if(error) throw error; return data||[]; };
  const DDB = {
    sb,
    async session(){ return (await sb.auth.getSession()).data.session; },
    async signIn(email,password){ const {data,error}=await sb.auth.signInWithPassword({email,password}); if(error) throw error; return data; },
    async signUp(email,password,fullName,redirectTo,pendingDraft=null){ const metadata={full_name:fullName||'Cliente'}; if(pendingDraft?.booking?.procedureId) metadata.ddb_booking_draft=pendingDraft; const {data,error}=await sb.auth.signUp({email,password,options:{data:metadata,...(redirectTo?{emailRedirectTo:redirectTo}:{})}}); if(error) throw error; return data; },
    async signOut(){ const {error}=await sb.auth.signOut(); if(error) throw error; },
    async resetPassword(email){ const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname}); if(error) throw error; },
    async updatePassword(password){ const {error}=await sb.auth.updateUser({password});if(error)throw error; },
    async changePasswordWithCurrent(currentPassword,newPassword){
      const {data:before,error:sessionError}=await sb.auth.getUser();
      const user=before?.user;
      if(sessionError||!user?.id||!user?.email)
        throw new Error('Sua sessão expirou. Entre novamente para alterar a senha.');
      // A password field in updateUser is not proof that GoTrue checked the old
      // password: some project configurations may accept the update regardless.
      // First authenticate explicitly with the SAME account, server-side.
      const {data:verified,error:verifyError}=await sb.auth.signInWithPassword({
        email:user.email,password:currentPassword
      });
      if(verifyError||verified?.user?.id!==user.id)
        throw new Error('Senha atual incorreta. Verifique e tente novamente.');
      // Keep the currentPassword attribute for projects supporting this extra check.
      const {error}=await sb.auth.updateUser({password:newPassword,currentPassword});
      if(error){
        if(/current.password|senha atual|invalid password/i.test(String(error.message||'')))
          throw new Error('Senha atual incorreta. Verifique e tente novamente.');
        throw error;
      }
    },
    async isAdmin(){ try{return !!(await rpc('is_admin'));}catch{return false;} },
    async publicData(){
      const [catalog,professionals,brand,consent,serviceTags,requirements,serviceAccessories,fieldReqs,schedule] = await Promise.all([
        rpc('get_public_catalog'),rpc('get_public_professionals'),rpc('get_public_brand_config'),rpc('get_public_standard_consent'),
        table('service_tags','service_id,method_id,variation_id,tag_id'),
        table('service_material_requirements','service_id,method_id,variation_id,material_id,estimated_quantity'),
        table('service_accessories','service_id,method_id,variation_id,accessory_id'),
        table('service_field_requirements','service_id,method_id,variation_id,field_key,required'),
        rpc('get_public_schedule_config')
      ]);
      // Additive RC7 table: absence must not break the existing public catalog.
      let materialPrices=[], materialPricesReady=false;
      try {materialPrices=await table('ddb_material_prices','professional_id,material_variant_id,discount_unit_amount');materialPricesReady=true;}
      catch(e){console.info('Cadastro de preços de materiais ainda não instalado');}
      // A tabela de preços NÃO comprova que toda a RC7 foi instalada.
      // Os recursos de remarcação/espera continuam desativados até integração independente.
      const rc7Installed=false;
      return {catalog,professionals,brand,consent,serviceTags,requirements,serviceAccessories,fieldReqs,materialPrices,materialPricesReady,rc7Installed,rules:schedule?.rules||[],exceptions:schedule?.exceptions||[],sundays:schedule?.sundays||[]};
    },
    async uploadPublicAsset(dataUrl,folder='admin'){ if(!dataUrl||!String(dataUrl).startsWith('data:')) return dataUrl||null; if(!await this.isAdmin()) throw new Error('admin_required'); const m=/^data:([^;]+);base64,(.+)$/.exec(dataUrl); if(!m||!['image/jpeg','image/png','image/webp'].includes(m[1])||m[2].length>11*1024*1024) throw new Error('Imagem inválida ou maior que 8MB'); const bin=atob(m[2]),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);const ext=(m[1].split('/')[1]||'jpg').replace('jpeg','jpg');const path=`${folder}/${crypto.randomUUID()}.${ext}`;const {error}=await sb.storage.from('public-assets').upload(path,new Blob([bytes],{type:m[1]}),{upsert:false});if(error)throw error;return path; },
    async uploadReference(dataUrl){
      if(!dataUrl) return null; const s=await this.session(); if(!s) throw new Error('authentication_required');
      const m=/^data:([^;]+);base64,(.+)$/.exec(dataUrl); if(!m||!['image/jpeg','image/png','image/webp'].includes(m[1])||m[2].length>11*1024*1024) throw new Error('Imagem inválida ou maior que 8MB');
      const bin=atob(m[2]), bytes=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
      const ext=(m[1].split('/')[1]||'jpg').replace('jpeg','jpg'); const path=`${s.user.id}/${crypto.randomUUID()}.${ext}`;
      const {error}=await sb.storage.from('client-private').upload(path,new Blob([bytes],{type:m[1]}),{upsert:false}); if(error) throw error; return path;
    },
    async availableSlots(professionalId,serviceId,methodId,variationId,date){ return rpc('public_available_slots',{p_professional_id:professionalId,p_service_id:serviceId,p_method_id:methodId||null,p_variation_id:variationId||null,p_date:date}); },
    async createBooking(payload){ if(await this.isAdmin()) throw new Error('admin_booking_forbidden'); if(payload.p_consent_accepted!==true) throw new Error('standard_consent_required'); return rpc('create_booking_request_v3',payload); },
    normalizeHair(answers){const a=answers||{};return {hair_type:a.hair_type??a.hairType??'',pattern:String(a.pattern??a.classification??'').trim().toUpperCase(),natural_color:a.natural_color??a.naturalColor??'',lightening_background:a.lightening_background??a.lighteningBackground??'',density:a.density??'',texture:a.texture??'',characteristic:a.characteristic??'',resistance:a.resistance??'',porosity:a.porosity??'',elasticity:a.elasticity??'',recent_chemistry:a.recent_chemistry??a.recentChemistry??'',chemistry_details:a.chemistry_details??a.chemistryDetails??'',frequent_heat:a.frequent_heat??a.heatUse??[],problems:a.problems??[],other_problems:a.other_problems??a.otherProblems??''};},
    async saveHairProfile(appointmentId,answers){return rpc('save_client_hair_profile',{p_appointment_id:appointmentId,p_answers:this.normalizeHair(answers)});},
    async submitBooking(payload,answers,reuse=false){
      if(await this.isAdmin()) throw new Error('admin_booking_forbidden');
      if(payload.p_consent_accepted!==true) throw new Error('standard_consent_required');
      // This RPC makes the appointment AND its hair profile one database transaction.
      // DO NOT fall back to create_booking_request_v3: that old 2-step path
      // could leave a paid appointment without an anamnesis.
      try{
        return await rpc('ddb_submit_booking_atomic_v1',{p_payload:{...payload,p_profile_answers:this.normalizeHair(answers),p_reuse_profile:!!reuse}});
      }catch(e){
        if(e.code==='PGRST202'||String(e.message||'').includes('Could not find the function'))
          throw new Error('O envio seguro do agendamento ainda não foi ativado no Supabase. Nenhuma solicitação foi criada; avise a D&D.');
        throw e;
      }
    },
    async completeMissingHairProfile(appointmentId,answers){
      return rpc('ddb_complete_missing_hair_profile_v1',{p_appointment_id:appointmentId,p_answers:this.normalizeHair(answers)});
    },
    async reuseHairProfile(appointmentId){ return rpc('reuse_latest_hair_profile',{p_appointment_id:appointmentId}); },
    async acceptConsent(consentId){ return rpc('accept_consent',{p_consent_id:consentId}); },
    async myLatestHairProfile(expectedClientId=null){
      // The query is scoped by BOTH the verified Auth user ID and the
      // client_hair_profiles SELECT RLS policy; never identify clients by phone.
      const {data:identity,error:identityError}=await sb.auth.getUser();
      const userId=identity?.user?.id;
      if(identityError||!userId)throw new Error('Sua sessão expirou. Entre novamente para consultar sua ficha.');
      if(expectedClientId&&userId!==expectedClientId)throw new Error('A conta ativa mudou. Entre novamente antes de continuar.');
      const {data,error}=await sb.from('client_hair_profiles')
        .select('id,client_id,version,answers,superseded_at')
        .eq('client_id',userId)
        .is('superseded_at',null)
        .order('version',{ascending:false})
        .limit(1)
        .maybeSingle();
      if(error)throw error;
      if(!data)return null;
      const a=data.answers||{};
      return {
        id:data.id,clientId:data.client_id,
        hairType:a.hair_type??a.hairType??'',
        classification:a.pattern??a.classification??'',
        naturalColor:a.natural_color??a.naturalColor??'',
        lighteningBackground:a.lightening_background??a.lighteningBackground??'',
        density:a.density??'',texture:a.texture??'',
        characteristic:a.characteristic??'',
        resistance:a.resistance??'',porosity:a.porosity??'',
        elasticity:a.elasticity??'',
        recentChemistry:a.recent_chemistry??a.recentChemistry??''
      };
    },
    async myAppointments(){ const {data,error}=await sb.from('appointments').select('*').order('created_at',{ascending:false}); if(error) throw error; return data||[]; },
    async clientCancel(id,reason='Cancelado pela cliente'){ return rpc('client_cancel_appointment',{p_appointment_id:id,p_reason:reason}); },
    async operators(){ return table('internal_operators','id,display_name,slug,is_professional,is_active,pin_updated_at'); },
    async markWhatsapp(appointmentId,action,operatorId=null){ return rpc('mark_whatsapp_action',{p_appointment_id:appointmentId,p_action:action,p_operator_id:operatorId}); },
    async recordDeposit(appointmentId,amount,method='pix',operatorId=null){ return rpc('record_deposit_paid',{p_appointment_id:appointmentId,p_amount:Number(amount),p_method:method,p_operator_id:operatorId}); },
    async confirmMaintenance(appointmentId,operatorId=null){ return rpc('confirm_maintenance',{p_appointment_id:appointmentId,p_operator_id:operatorId}); },
    async confirmAppointment(appointmentId,start,end,operatorId=null){ return rpc('confirm_appointment',{p_appointment_id:appointmentId,p_start:start,p_expected_end:end,p_operator_id:operatorId}); },
    async rescheduleAppointment(appointmentId,start,end,operatorId=null){ return rpc('reschedule_appointment',{p_appointment_id:appointmentId,p_start:start,p_expected_end:end,p_operator_id:operatorId}); },
    async cancelAppointment(appointmentId,reason='Cancelado pela administração',operatorId=null){ return rpc('cancel_appointment',{p_appointment_id:appointmentId,p_reason:reason,p_operator_id:operatorId}); },
    async completeAppointment(appointmentId,method,amount,installments=null,operatorId=null){ return rpc('complete_appointment',{p_appointment_id:appointmentId,p_method:method,p_amount:Number(amount),p_installments:installments,p_operator_id:operatorId}); },
    async recordRefund(appointmentId,amount,method='pix',operatorId=null){ return rpc('record_refund',{p_appointment_id:appointmentId,p_amount:Number(amount),p_method:method,p_operator_id:operatorId}); },
    async resolveTask(taskId,resolution,operatorId=null){ return rpc('resolve_operational_task',{p_task_id:taskId,p_resolution:resolution,p_operator_id:operatorId}); },
    async createNonRecommendationConsent(appointmentId,reasons,content,version='1.0',operatorId=null){ return rpc('create_non_recommendation_consent_v2',{p_appointment_id:appointmentId,p_reasons:reasons,p_content:content,p_version:version,p_operator_id:operatorId}); },
    async nonRecommendationByToken(token){ return rpc('get_non_recommendation_consent_by_token',{p_token:token}); },
    async acceptNonRecommendationToken(token){ return rpc('accept_non_recommendation_consent_by_token',{p_token:token}); },
    async setOperatorPin(operatorId,pin){ return rpc('set_operator_pin',{p_operator_id:operatorId,p_pin:String(pin)}); },
    async verifyOperatorPin(operatorId,pin){ return rpc('verify_operator_pin',{p_operator_id:operatorId,p_pin:String(pin)}); },
    async saveSetting(key,value,operatorId=null){ return rpc('admin_set_setting',{p_key:key,p_value:value,p_operator_id:operatorId}); },
    async saveWhatsappTemplate(key,body,operatorId=null){ return rpc('admin_save_whatsapp_template',{p_key:key,p_body:body,p_operator_id:operatorId}); },
    async saveProfessional(x){ return rpc('admin_save_professional',{p_professional_id:x.id||null,p_name:x.name,p_photo_path:x.photoPath||null,p_instagram_url:x.instagram||null,p_whatsapp_phone:x.whatsapp||null,p_is_accepting:x.active!==false,p_pix_key:x.pixKey||null,p_pix_key_type:x.pixKeyType||null,p_pix_holder:x.pixHolder||null}); },
    async saveAvailability(x){ return rpc('admin_save_availability',{p_professional_id:x.professionalId,p_weekdays:x.weekdays||[],p_start:x.start,p_end:x.end,p_max:x.maxAppointments??null}); },
    async setDateException(x){ return rpc('admin_set_date_exception',{p_professional_id:x.professionalId,p_date:x.date,p_available:!!x.available,p_start:x.start||null,p_end:x.end||null,p_max:x.maxAppointments??null,p_reason:x.reason||null}); },
    async setServiceDeposit(serviceId,mode='none',value=0){ return rpc('admin_set_service_deposit',{p_service_id:serviceId,p_mode:mode,p_value:Number(value||0)}); },
    async setMaintenanceDepositPolicy(serviceId,inherit,mode='none',value=0){ return rpc('admin_set_maintenance_deposit_policy',{p_service_id:serviceId,p_inherit:!!inherit,p_mode:mode,p_value:Number(value||0)}); },
    async setPublicSunday(date,open,notes=null){ return rpc('admin_set_public_sunday',{p_date:date,p_open:!!open,p_notes:notes}); },
    async saveCategory(x){ return rpc('admin_save_category',{p_id:x.id||null,p_name:x.name,p_description:x.description||null,p_image_path:x.imagePath||null,p_active:x.active!==false}); },
    async replaceOptions(serviceId,methodId,variationId,options){ return rpc('admin_replace_service_options',{p_service_id:serviceId,p_method_id:methodId||null,p_variation_id:variationId||null,p_options:options||[]}); },
    async saveService(x){ return rpc('admin_save_service',{p_id:x.id||null,p_category_id:x.categoryId||null,p_name:x.name,p_description:x.description||null,p_image_path:x.imagePath||null,p_price:x.price??null,p_duration:x.duration??null,p_active:x.active!==false,p_deposit_mode:x.depositMode||'none',p_deposit_value:x.depositValue??0,p_is_maintenance:!!x.isMaintenance}); },
    async saveMethod(x){ return rpc('admin_save_method',{p_id:x.id||null,p_service_id:x.serviceId,p_name:x.name,p_description:x.description||null,p_image_path:x.imagePath||null,p_price:x.price??null,p_duration:x.duration??null,p_active:x.active!==false,p_description_required:!!x.descriptionRequired}); },
    async saveVariation(x){ return rpc('admin_save_variation',{p_id:x.id||null,p_method_id:x.methodId,p_name:x.name,p_description:x.description||null,p_image_path:x.imagePath||null,p_price:x.price??null,p_duration:x.duration??null,p_active:x.active!==false,p_description_required:!!x.descriptionRequired}); },
    async replaceFieldRequirements(serviceId,methodId,variationId,requirements){ return rpc('admin_replace_field_requirements',{p_service_id:serviceId,p_method_id:methodId||null,p_variation_id:variationId||null,p_requirements:requirements||[]}); },
    async replaceMaterialQuantities(materialId,rules){return rpc('ddb_replace_material_quantities',{p_material_id:materialId,p_rules:rules});},
    async replaceMaterialRequirements(materialId,scopes,estimate=null){ return rpc('admin_replace_material_requirements',{p_material_id:materialId,p_scopes:scopes||[],p_estimate:estimate}); },
    async replaceAccessoryCompatibility(accessoryId,scopes){ return rpc('admin_replace_accessory_compatibility',{p_accessory_id:accessoryId,p_scopes:scopes||[]}); },
    async saveMaterial(x){ return rpc('admin_save_material',{p_id:x.id||null,p_name:x.name,p_description:x.description||null,p_image_path:x.imagePath||null,p_internal_cost:x.internalCost??0,p_active:x.active!==false,p_variants:x.variants||[]}); },
    async saveMaterialComplete(x,rules){ return rpc('ddb_save_material_complete',{p_id:x.id||null,p_name:x.name,p_description:x.description||null,p_image_path:x.imagePath||null,p_internal_cost:x.internalCost??0,p_active:x.active!==false,p_variants:x.variants||[],p_rules:rules||[]}); },
    async materialInternalCost(id){ const {data,error}=await sb.from('materials').select('internal_cost').eq('id',id).single(); if(error)throw error; return Number(data?.internal_cost||0); },
    async saveAccessory(x){ return rpc('admin_save_accessory',{p_id:x.id||null,p_name:x.name,p_description:x.description||null,p_image_path:x.imagePath||null,p_price:x.price??0,p_active:x.active!==false}); },
    async updateAnamnesis(id,answers,operatorId=null){ return rpc('admin_update_anamnesis',{p_anamnesis_id:id,p_answers:answers,p_operator_id:operatorId}); },
    async reviewHairProfile(appointmentId,answers){ return rpc('ddb_admin_review_hair_profile',{p_appointment_id:appointmentId,p_answers:answers}); },
    async manualAppointment(x){ return rpc('admin_create_manual_appointment',{p_professional_id:x.professionalId,p_service_id:x.serviceId,p_method_id:x.methodId||null,p_variation_id:x.variationId||null,p_scheduled_start:x.start,p_expected_end:x.end||null,p_client_name:x.clientName,p_client_phone:x.clientPhone||null,p_client_email:x.clientEmail||null,p_operator_id:x.operatorId||null}); },

    // RC7 workflows. Every write invokes a server-authorized RPC; no direct browser table mutation.
    async rc7Portal(){
      // An unavailable optional module must never hide working portal modules.
      const names=['waitlist','offers','refunds','ledger','notifications'];
      const relations=['ddb_waitlist','ddb_offers','ddb_refund_requests','ddb_wallet_ledger','ddb_notifications'];
      const results=await Promise.allSettled(relations.map(name=>table(name)));
      const data={available:{}};
      for(let i=0;i<names.length;i++){
        const res=results[i];
        data[names[i]]=res.status==='fulfilled'?res.value:[];
        data.available[names[i]]=res.status==='fulfilled';
        if(res.status==='rejected')console.info('Portal: módulo temporariamente indisponível:',names[i]);
      }
      return data;
    },
    async rc7Admin(){if(!await this.isAdmin())throw Error('admin_required');return this.rc7Portal();},
    async requestWaitlist(appointmentId){return rpc('ddb_request_waitlist',{p_appointment_id:appointmentId});},
    async adminQueueAffected(appointmentId){return rpc('ddb_admin_queue_affected',{p_appointment_id:appointmentId});},
    async adminOfferSlot(waitlistId,start,end){return rpc('ddb_admin_offer_slot',{p_waitlist_id:waitlistId,p_start_at:start,p_end_at:end});},
    async replySlotOffer(id,accept){return rpc('ddb_reply_offer',{p_offer_id:id,p_accept:!!accept});},
    async finishSlotOffer(id){return rpc('ddb_admin_finish_offer',{p_offer_id:id});},
    async requestRefund(appointmentId,destination,pixType=null,pixKey=null){return rpc('ddb_request_refund',{p_appointment_id:appointmentId,p_destination:destination,p_pix_type:pixType,p_pix_key:pixKey});},
    async finishRefundRequest(id,operatorId){return rpc('ddb_admin_finish_refund',{p_request_id:id,p_operator_id:operatorId});},
    async saveMaterialPrice(proId,variantId,price){return rpc('ddb_save_material_price',{p_professional_id:proId,p_variant_id:variantId,p_price:price});},
    async adminSnapshot(){
      if(!await this.isAdmin()) throw new Error('admin_required');
      const names=['appointments','operational_tasks','payments','appointment_materials','internal_operators','professionals','professional_pix_keys','anamneses','client_hair_profiles','consents','audit_log','appointment_events','app_settings','whatsapp_templates'];
      const vals=await Promise.all(names.map(n=>table(n)));
      return Object.fromEntries(names.map((n,i)=>[n,vals[i]]));
    }
  };
  window.DDB=DDB;
})();
