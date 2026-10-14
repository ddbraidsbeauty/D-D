/* ===== Supabase integration — Version 1.0 ===== */
function assetUrl(path){ if(!path)return ''; if(/^https?:|^data:/.test(path))return path; return window.DDB?.sb?.storage.from('public-assets').getPublicUrl(path).data.publicUrl||''; }
function optionBucket(rows,serviceId,methodId,variationId){
  const out={tags:[],sizes:[],thicknesses:[],descriptionTags:[],required:{characteristics:false,size:false,thickness:false,material:false,color:false,provider:false}};
  for(const o of rows.filter(x=>x.service_id===serviceId && (!x.method_id||x.method_id===methodId) && (!x.variation_id||x.variation_id===variationId))){
    const g=String(o.option_group||'').toLowerCase(); if(g.includes('tamanho'))out.sizes.push(o.name); else if(g.includes('espess'))out.thicknesses.push(o.name); else out.tags.push(o.name); if(o.requires_description)out.descriptionTags.push(o.name);
  } const reqs=(window.__ddbFieldReqs||[]).filter(x=>x.service_id===serviceId&&x.method_id===methodId&&x.variation_id===variationId);for(const r of reqs)out.required[r.field_key]=!!r.required;return out;
}
async function bootstrapBackendPublic(){
  if(!window.DDB)return;
  try{
    const x=await DDB.publicData(), c=x.catalog||{}, demo=createDemoState(); window.__ddbCatalogOptions=c.options||[];window.__ddbCategories=c.categories||[];window.__ddbFieldReqs=x.fieldReqs||[]; const demoByName=new Map(demo.procedures.map(p=>[p.name.toLowerCase(),p]));
    const tagsById=new Map((c.tags||[]).map(t=>[t.id,t.name]));
    const methodsByService=new Map(); for(const m of c.methods||[]){ if(!methodsByService.has(m.service_id))methodsByService.set(m.service_id,[]); methodsByService.get(m.service_id).push(m); }
    const varsByMethod=new Map(); for(const v of c.variations||[]){ if(!varsByMethod.has(v.method_id))varsByMethod.set(v.method_id,[]); varsByMethod.get(v.method_id).push(v); }
    const categoryById=new Map((c.categories||[]).map(x=>[x.id,x]));
    // Categorias reais podem ter nomes diferentes dos itens do catálogo de demonstração.
    // Use arquivos locais como fallback apenas quando a profissional ainda não cadastrou uma foto.
    const fallbackByServiceName={
      'penteados':DEMO_IMAGES.nago,
      'trancas':DEMO_IMAGES.box,
      'mega hair':DEMO_IMAGES.mega,
      'manutencao':DEMO_IMAGES.maintenance
    };
    const normalizeServiceName=name=>String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
    // Os arquivos de demonstração são apenas reserva visual. O cadastro no Supabase sempre prevalece.
    // Os métodos têm seus próprios padrões para não exibir a foto genérica de Tranças em Fulani/Boho/etc.
    function catalogFallback(name,defaultImage=''){
      const normalized=normalizeServiceName(name);
      if(/fulani/.test(normalized))return DEMO_IMAGES.fulani;
      if(/boho|gypsy/.test(normalized))return DEMO_IMAGES.boho;
      if(/goddess/.test(normalized))return DEMO_IMAGES.goddess;
      if(/mega|entrelace/.test(normalized))return DEMO_IMAGES.mega;
      if(/nago|ghana|pentead/.test(normalized))return DEMO_IMAGES.nago;
      if(/box|tranca|knotless|lemonade|french/.test(normalized))return DEMO_IMAGES.box;
      if(/manuten/.test(normalized))return DEMO_IMAGES.maintenance;
      return defaultImage;
    }
    const procedures=(c.services||[]).map(s=>{
      const d=demoByName.get(String(s.name).toLowerCase());
      const fallbackImage=d?.image||fallbackByServiceName[normalizeServiceName(s.name)]||'';
      const methods=(methodsByService.get(s.id)||[]).map(m=>{
        const methodImage=assetUrl(m.image_path)||catalogFallback(m.name,fallbackImage);
        return {id:m.id,name:m.name,image:methodImage,active:true,description:m.description||'',descriptionRequired:!!m.description_required,price:m.base_price_override==null?undefined:Number(m.base_price_override),durationMinutes:m.duration_override_minutes==null?0:Number(m.duration_override_minutes),options:optionBucket(c.options||[],s.id,m.id,null),variations:(varsByMethod.get(m.id)||[]).map(v=>({id:v.id,name:v.name,image:assetUrl(v.image_path)||methodImage,active:true,description:v.description||'',descriptionRequired:!!v.description_required,price:v.base_price_override==null?undefined:Number(v.base_price_override),durationMinutes:v.duration_override_minutes==null?0:Number(v.duration_override_minutes),options:optionBucket(c.options||[],s.id,m.id,v.id)}))};
      });
      const cat=categoryById.get(s.category_id); const p={id:s.id,name:s.name,categoryId:s.category_id,category:cat?.name||'',image:assetUrl(s.image_path)||fallbackImage,description:s.description||'',price:Number(s.base_price||0),durationMinutes:Number(s.internal_duration_minutes||0),active:true,special:s.is_maintenance?'maintenance':'',maintenanceEligible:!s.is_maintenance,fee:{type:s.deposit_mode||'none',value:Number(s.deposit_value||0),inherit:!!s.deposit_inherit_from_target},options:optionBucket(c.options||[],s.id,null,null),methods};
      return p;
    });
    const professionals=(x.professionals||[]).map(p=>({id:p.id,name:p.public_name,image:assetUrl(p.photo_path),instagram:p.instagram_url||'',whatsapp:p.whatsapp_phone||'',pixKey:'',active:true,bookable:true}));
    const materials=(c.materials||[]).map(m=>{const comp=x.requirements.filter(r=>r.material_id===m.id).map(r=>r.variation_id?`${r.service_id}/${r.method_id}/${r.variation_id}`:r.method_id?`${r.service_id}/${r.method_id}`:r.service_id);const vars=(c.material_variants||[]).filter(v=>v.material_id===m.id);return{id:m.id,name:m.name,image:assetUrl(m.image_path),description:m.description||'',colors:[...new Set(vars.map(v=>v.color).filter(Boolean))],sizes:[...new Set(vars.map(v=>v.size).filter(Boolean))],variants:vars,compatibility:comp,active:true,internalCost:0};});
    const accessories=(c.accessories||[]).map(a=>{const comp=x.serviceAccessories.filter(r=>r.accessory_id===a.id).map(r=>r.variation_id?`${r.service_id}/${r.method_id}/${r.variation_id}`:r.method_id?`${r.service_id}/${r.method_id}`:r.service_id);return{id:a.id,name:a.name,image:assetUrl(a.image_path),price:Number(a.price||0),compatibility:comp.length?comp:['*'],active:true};});
    state.procedures=procedures; state.professionals=professionals; state.materials=materials; state.accessories=accessories; state.materialRequirements=x.requirements||[];state.materialPrices=x.materialPrices||[];state.materialPricesReady=!!x.materialPricesReady;state.rc7Installed=!!x.rc7Installed;
    state.settings.publicSundays=(x.sundays||[]).filter(s=>s.is_open).map(s=>s.service_date);if(x.brand?.hero_image_path)state.media.hero=assetUrl(x.brand.hero_image_path);if(x.consent?.text!=null)state.settings.consentText=x.consent.text;if(x.consent?.version)state.settings.consentVersion=x.consent.version;
    state.availability={}; for(const p of professionals){const rs=(x.rules||[]).filter(r=>r.professional_id===p.id&&r.is_active);state.availability[p.id]={weekdays:[...new Set(rs.map(r=>Number(r.weekday)))],start:rs.map(r=>String(r.start_time).slice(0,5)).sort()[0]||'08:00',end:rs.map(r=>String(r.end_time).slice(0,5)).sort().at(-1)||'18:00',blocks:(x.exceptions||[]).filter(e=>e.professional_id===p.id&&!e.is_available).map(e=>({date:e.exception_date,reason:'Exceção de agenda'}))};}
    saveState(); publicCatalogReady=true; renderHome();renderCatalog(); if(routeHash()==='booking')renderBooking(); finishAuthCallback();
  }catch(e){console.error('Backend bootstrap failed',e);notify('Não foi possível atualizar os dados online agora.','Conexão');}
}
function authModal(prefill=''){
 return new Promise(resolve=>openModal('Entrar para continuar',`<div class="auth-dialog"><p class="muted auth-copy">Entre com seu e-mail e senha para acessar sua conta. Se ainda não tiver cadastro, você pode criar uma conta aqui.</p><div class="auth-form"><label>E-mail<input id="clientAuthEmail" type="email" value="${esc(prefill)}" autocomplete="email" placeholder="seuemail@exemplo.com"></label><label>Senha<input id="clientAuthPassword" type="password" minlength="6" autocomplete="current-password" placeholder="Sua senha"></label></div><div class="auth-actions"><button class="btn gold" id="clientSignIn">Entrar</button><button class="btn" id="clientSignUp">Criar conta</button><button class="linkbtn" id="clientReset">Esqueci a senha</button></div><div id="clientSignUpFeedback" class="auth-signup-feedback" role="status" aria-live="polite" hidden></div></div>`,root=>{
   const email=()=>$('#clientAuthEmail',root).value.trim(), pass=()=>$('#clientAuthPassword',root).value;
   $('#clientSignIn',root).onclick=async()=>{try{await DDB.signIn(email(),pass());closeModal();resolve(true);}catch(e){notify(e.message||'Não foi possível entrar.','Login');}};
   const feedback=$('#clientSignUpFeedback',root);
   function showAuthHelp(title,detail){
     feedback.hidden=false;feedback.replaceChildren();
     const heading=document.createElement('strong');heading.textContent=title;
     const paragraph=document.createElement('p');paragraph.textContent=detail;
     feedback.append(heading,paragraph);
   }
   $('#clientSignUp',root).onclick=async()=>{
     const address=email(),password=pass(),button=$('#clientSignUp',root);
     if(!$('#clientAuthEmail',root).checkValidity()||!address)return showAuthHelp('Confira o e-mail','Informe um endereço de e-mail válido para continuar.');
     if(password.length<6)return showAuthHelp('Confira a senha','Use uma senha com pelo menos 6 caracteres.');
     if(button.disabled)return;
     button.disabled=true;
     try{
       const pendingDraft=savePendingBookingDraft();
       const r=await DDB.signUp(address,password,booking.clientName,authReturnUrl(),pendingDraft);
       if(r.session){closeModal();resolve(true);return;}
       // Supabase Auth may mask existing confirmed accounts to prevent user enumeration.
       // A null session does NOT prove a confirmation email was sent.
       showAuthHelp('Confira seu e-mail ou entre na sua conta',
         'Se este e-mail ainda não tiver uma conta, a confirmação poderá chegar em instantes. Se já estiver cadastrado, nenhum novo cadastro será criado: use Entrar ou Esqueci a senha. Confira também o spam.');
     }catch(e){
       const code=String(e?.code||'').toLowerCase(),message=String(e?.message||'').toLowerCase();
       if(code==='user_already_exists'||/already registered|already exists|já cadastrado|já existe/.test(message)){
         showAuthHelp('Este e-mail já está cadastrado','Use Entrar com sua senha ou Esqueci a senha para recuperar o acesso.');
       }else{
         showAuthHelp('Não foi possível criar a conta',e?.message||'Tente novamente ou recupere o acesso a uma conta existente.');
       }
     }finally{button.disabled=false;}
   };
   $('#clientReset',root).onclick=async()=>{
     if(!$('#clientAuthEmail',root).checkValidity()||!email())return showAuthHelp('Informe um e-mail válido','Precisamos do seu endereço para solicitar a recuperação.');
     const button=$('#clientReset',root);if(button.disabled)return;button.disabled=true;
     try{await DDB.resetPassword(email());showAuthHelp('Confira sua caixa de entrada','Se este e-mail estiver cadastrado, você receberá instruções para redefinir sua senha. Confira também o spam.');}
     catch(e){showAuthHelp('Não foi possível solicitar a recuperação',e?.message||'Tente novamente em alguns minutos.');}
     finally{button.disabled=false;}
   };
 }));
}

async function loadRealSlotsForBooking(){
  if(!window.DDB||!booking.date||!booking.professionalId)return [];
  const target=bookingService(booking); if(!target?.id)return [];
  window.__ddbSlots=window.__ddbSlots||{};
  const key=`${booking.professionalId}|${target.id}|${booking.methodId||''}|${booking.variationId||''}|${booking.date}`;
  const rows=await DDB.availableSlots(booking.professionalId,target.id,isMaintenanceBooking(booking)?null:(booking.methodId||null),isMaintenanceBooking(booking)?null:(booking.variationId||null),booking.date);
  const fmt=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hour12:false});
  window.__ddbSlots[key]=(rows||[]).map(r=>({start:r.start_at,end:r.end_at,time:fmt.format(new Date(r.start_at))}));
  return window.__ddbSlots[key];
}

async function ensureClientAuth(){const s=await DDB.session();if(s)return s;const ok=await authModal(booking.email||'');if(!ok)return null;return DDB.session();}
let bookingSubmissionPending=false;
async function submitRequest(){
 if(bookingSubmissionPending)return;
 if(booking.partialSubmissionId)return notify('Esta solicitação já existe. Acesse Meus agendamentos e use Completar ficha capilar, sem criar outra solicitação.','Atendimento pendente');
 bookingSubmissionPending=true;
 $('#nextBtn').disabled=true;
 try{
  const session=await ensureClientAuth(); if(!session)return;
  if(!booking.email)booking.email=session.user.email||'';
  const p=getProcedure(booking.procedureId), target=targetProcedure(booking), service=bookingService(booking), method=selectedMethod(booking), variation=selectedVariation(booking), opts=currentOptions(booking);
  if(!booking.time&&isMaintenanceBooking(booking)){const rows=await loadRealSlotsForBooking();booking.time=rows?.[0]?.time||'';}
  if(!booking.time)throw new Error('Não há horário disponível nessa data.');
  const when=`${booking.date}T${booking.time}:00-03:00`;
  const optionIds=isMaintenanceBooking(booking)?[]:(c=>{const rows=[];for(const o of (window.__ddbCatalogOptions||[])){if(o.service_id!==target.id)continue;if(o.method_id&&o.method_id!==booking.methodId)continue;if(o.variation_id&&o.variation_id!==booking.variationId)continue;if([...(booking.tags||[]),booking.size,booking.thickness].includes(o.name))rows.push(o.id);}return rows;})();
  let materialVariantId=null; const mat=getState().materials.find(m=>m.id===booking.materialId); if(mat?.variants?.length)materialVariantId=(mat.variants.find(v=>(!booking.color||v.color===booking.color))||mat.variants[0])?.id||null;
  const ref=await DDB.uploadReference(booking.referenceImage);
  const idempotency=booking.requestId||(booking.requestId=crypto.randomUUID());
  const id=await DDB.submitBooking({p_rc7_idempotency_key:idempotency,p_rc7_material_choices:booking.materialChoices||{},p_professional_id:booking.professionalId,p_service_id:service.id,p_method_id:isMaintenanceBooking(booking)?null:(booking.methodId||null),p_variation_id:isMaintenanceBooking(booking)?null:(booking.variationId||null),p_scheduled_start:when,p_client_name:booking.clientName,p_client_phone:booking.phone,p_client_email:booking.email,p_notes:booking.note||null,p_brings_own_material:booking.materialProvider==='client',p_option_ids:optionIds,p_accessory_ids:isMaintenanceBooking(booking)?[]:(booking.accessoryIds||[]),p_material_variant_id:isMaintenanceBooking(booking)?null:materialVariantId,p_reference_image_path:ref,p_consent_accepted:booking.consentAccepted===true,p_maintenance_of_service_id:p?.special==='maintenance'?(booking.maintenanceTargetId||null):null},booking.anamnesis,booking.anamnesisMode==='reuse');
  // O consentimento persistente será emitido/aceito pelo fluxo seguro do backend; não há INSERT direto em tabela protegida.
  openModal('Solicitação enviada!',`<div class="success-modal"><div class="success-icon">✓</div><p>Sua solicitação foi registrada com segurança. A profissional fará a revisão antes da confirmação.</p><div class="modal-actions"><button class="btn" data-home>Voltar ao início</button><button class="btn gold" data-account>Ver meus agendamentos</button></div></div>`,root=>{$('[data-home]',root).onclick=()=>{closeModal();location.hash='#home';};$('[data-account]',root).onclick=()=>{closeModal();location.hash='#account';};}); try{localStorage.removeItem(BOOKING_DRAFT_KEY);}catch{} booking=newBooking();stepIndex=0;
 }catch(e){console.error(e);if(e.partialBookingId)booking.partialSubmissionId=e.partialBookingId;notify(e.partialBookingId?'Sua solicitação já existe. Abra Meus agendamentos e complete a ficha capilar, sem reenviar.':(e.message||'Não foi possível enviar a solicitação. Nenhum novo agendamento foi registrado.'),'Erro no agendamento');}
 finally{bookingSubmissionPending=false;$('#nextBtn').disabled=false;}
}
// Completes ONLY an existing incomplete appointment; never creates a new booking
// or touches an already recorded deposit.
function openMissingHairProfile(appointmentId){
  const answers=emptyAnamnesis();
  // Reuse the existing accessible field markup without changing the current booking.
  const previous=booking;
  let form;
  try{booking={...newBooking(),anamnesis:answers};form=renderAnamnesisStep();}
  finally{booking=previous;}
  openModal('Completar ficha capilar',
    `<p class="muted">A solicitação já foi registrada. Preencha apenas a ficha capilar pendente; nenhum novo horário ou pagamento será criado.</p>${form}<div class="modal-actions"><button type="button" class="btn" id="dismissMissingHair">Voltar</button><button type="button" class="btn gold" id="saveMissingHair">Salvar ficha capilar</button></div>`,
    root=>{
      const capture=e=>{
        const t=e.target;
        if(t.dataset.an!==undefined){answers[t.dataset.an]=t.value;if(t.dataset.an==='classification')answers.hairType=hairTypeForPattern(t.value);}
        if(t.matches('[data-an-heat]')) answers.heatUse=$$('[data-an-heat]:checked',root).map(x=>x.value);
        if(t.matches('[data-an-problem]')) answers.problems=$$('[data-an-problem]:checked',root).map(x=>x.value);
      };
      root.addEventListener('input',capture);
      root.addEventListener('change',capture);
      $('#dismissMissingHair',root).onclick=closeModal;
      $('#saveMissingHair',root).onclick=async()=>{
        const required=['hairType','classification','naturalColor','lighteningBackground','density','texture','characteristic','resistance','porosity','elasticity','recentChemistry'];
        if(required.some(k=>!String(answers[k]||'').trim())||!answers.heatUse.length||!answers.problems.length)
          return notify('Preencha todos os campos obrigatórios.','Ficha incompleta');
        if(!HAIR_PATTERNS.includes(String(answers.classification||'').trim().toUpperCase())||answers.hairType!==hairTypeForPattern(answers.classification))
          return notify('Selecione uma classificação válida (1A a 4C).','Classificação inválida');
        const button=$('#saveMissingHair',root);button.disabled=true;
        try{
          await DDB.completeMissingHairProfile(appointmentId,answers);
          closeModal();
          notify('Ficha capilar vinculada ao atendimento existente. Nenhuma nova cobrança foi criada.','Ficha concluída');
          await renderAccount();
        }catch(e){console.error(e);notify(e.message||'Não foi possível completar a ficha.','Erro ao salvar');}
        finally{button.disabled=false;}
      };
    }
  );
}

// The reset link authenticates a *recovery session*. Never process a normal login
// as if it granted permission to change a forgotten password.
function passwordQuality(password){
  if(password.length<8)return 'Use pelo menos 8 caracteres para a nova senha.';
  if(password.length>72)return 'Use no máximo 72 caracteres para a senha.';
  return '';
}
function passwordFields(current=false){
  const prefix=current?'change':'reset';
  return `<div class="auth-form password-form">${current?`<label>Senha atual<input id="changeCurrentPassword" type="password" autocomplete="current-password" required></label>`:''}<label>Nova senha<input id="${prefix}NewPassword" type="password" minlength="8" maxlength="72" autocomplete="new-password" required></label><label>Confirmar nova senha<input id="${prefix}ConfirmPassword" type="password" minlength="8" maxlength="72" autocomplete="new-password" required></label><label class="password-show"><input type="checkbox" id="${prefix}ShowPasswordFields"> Mostrar senhas</label><p class="muted">Use pelo menos 8 caracteres. Não compartilhe sua senha com ninguém.</p><p id="${prefix}PasswordFeedback" class="auth-signup-feedback" role="status" aria-live="polite" hidden></p></div>`;
}
function initPasswordFields(root,hasCurrent){
  const prefix=hasCurrent?'change':'reset';
  const fields=[prefix+'NewPassword',prefix+'ConfirmPassword',...(hasCurrent?['changeCurrentPassword']:[])].map(k=>$('#'+k,root));
  $('#'+prefix+'ShowPasswordFields',root).onchange=e=>{fields.forEach(input=>input.type=e.target.checked?'text':'password');};
  return {newPass:()=>fields[0].value,confirm:()=>fields[1].value,current:()=>hasCurrent?$('#changeCurrentPassword',root).value:''};
}
function passwordStatus(root,message){ const status=$(root.id==='resetPasswordPanel'?'#resetPasswordFeedback':'#changePasswordFeedback',root);status.hidden=false;status.textContent=message; }
async function renderResetPassword(){
  const root=$('#resetPasswordPanel');if(!root)return;
  if(!passwordRecoveryActive){
    root.innerHTML='<h2>Link de recuperação necessário</h2><p class="muted">Para sua segurança, solicite o link pelo botão “Esqueci a senha” na tela de login. Se o link expirou, solicite um novo.</p><button class="btn gold" id="resetLoginAction">Ir para minha conta</button>';
    $('#resetLoginAction',root).onclick=()=>{location.hash='#account';};return;
  }
  const session=await DDB.session();
  if(!session?.user){root.innerHTML='<h2>Link inválido ou expirado</h2><p>Solicite um novo e-mail de recuperação pelo login.</p><a class="btn gold" href="#account">Ir para o login</a>';return;}
  root.innerHTML='<h2>Crie sua nova senha</h2><p class="muted">Digite sua nova senha para recuperar o acesso à D&D Braids Beauty.</p>'+passwordFields()+'<button class="btn gold" type="button" id="submitResetPassword">Salvar nova senha</button>';
  const state=initPasswordFields(root,false);
  $('#submitResetPassword',root).onclick=async()=>{
    const pwd=state.newPass(),msg=passwordQuality(pwd);if(msg)return passwordStatus(root,msg);
    if(pwd!==state.confirm())return passwordStatus(root,'As senhas não coincidem.');
    const button=$('#submitResetPassword',root);button.disabled=true;
    try{await DDB.updatePassword(pwd);passwordRecoveryActive=false;history.replaceState(null,'',appBaseUrl()+'#account');notify('Sua senha foi redefinida com sucesso.','Senha atualizada');renderPublicRoute();}
    catch(e){passwordStatus(root,e.message||'Não foi possível redefinir a senha. Tente solicitar um novo link.');}
    finally{button.disabled=false;}
  };
}
function openChangePassword(){
  openModal('Segurança da conta',`<p class="muted">Para alterar a senha, confirme sua senha atual e escolha uma nova.</p>${passwordFields(true)}<div class="modal-actions"><button class="btn" id="cancelChangePassword">Voltar</button><button class="btn gold" id="saveChangePassword">Alterar senha</button></div>`,root=>{
    const state=initPasswordFields(root,true);$('#cancelChangePassword',root).onclick=closeModal;
    $('#saveChangePassword',root).onclick=async()=>{
      const oldPass=state.current(),pwd=state.newPass(),msg=passwordQuality(pwd);
      if(!oldPass)return passwordStatus(root,'Informe a senha atual.');
      if(msg)return passwordStatus(root,msg);
      if(pwd!==state.confirm())return passwordStatus(root,'As senhas não coincidem.');
      if(pwd===oldPass)return passwordStatus(root,'Escolha uma senha diferente da atual.');
      const button=$('#saveChangePassword',root);button.disabled=true;
      try{accountPasswordChangeInProgress=true;await DDB.changePasswordWithCurrent(oldPass,pwd);closeModal();notify('Sua senha foi alterada com sucesso.','Segurança');}
      catch(e){passwordStatus(root,e.message||'Não foi possível alterar a senha. Confira a senha atual.');}
      finally{accountPasswordChangeInProgress=false;button.disabled=false;}
    };
  });
}

async function renderAccount(){
 const box=$('#accountList'),controls=$('#accountAuthControls');if(!window.DDB||!box)return;
 // Clear account-only controls before checking the current session.
 if(controls)controls.replaceChildren();
 const s=await DDB.session();
 if(s && await DDB.isAdmin()){sessionStorage.setItem('ddbraids_admin_session','1');await syncAdminSnapshot();showAdmin();return;}
 if(s && controls){
   const email=document.createElement('span');email.className='account-signed-in';email.textContent=s.user?.email||'Conta conectada';
   const out=document.createElement('button');out.type='button';out.id='logoutClient';out.className='btn';out.textContent='Sair da conta';
   const security=document.createElement('button');security.type='button';security.id='changeClientPassword';security.className='btn';security.textContent='Alterar senha';
   controls.append(email,security,out);
   security.onclick=()=>openChangePassword();
   out.onclick=async()=>{
     if(out.disabled)return;out.disabled=true;
     try{
       await DDB.signOut();
       try{sessionStorage.removeItem('ddbraids_admin_session');}catch{}
       // Prevent showing the previous customer's appointments after logout.
       box.replaceChildren();
       controls.replaceChildren();
       await renderAccount();
       notify('Você saiu da sua conta.');
     }catch(e){out.disabled=false;notify(e.message||'Não foi possível sair da conta.','Sessão');}
   };
 }
 if(!s){box.innerHTML=`<div class="glass panel"><h2>Entre na sua conta</h2><p class="muted">Use o e-mail e a senha cadastrados no agendamento.</p><button class="btn gold" id="accountLoginBtn">Entrar / criar conta</button></div>`;$('#accountLoginBtn').onclick=async()=>{if(await authModal(''))renderAccount();};return;}
 try{const list=await DDB.myAppointments();box.innerHTML=list.map(a=>`<article class="glass account-item"><div><b>${esc(a.service_name_snapshot||'Atendimento')}</b><span>${esc(a.professional_name_snapshot||'')} • ${a.scheduled_start?new Date(a.scheduled_start).toLocaleDateString('pt-BR'):'—'}</span><span class="status ${esc(a.status)}">${esc(statusLabel({status:a.status,bookingFeePaid:a.deposit_status==='paid'}))}</span>${Number(a.deposit_amount||0)>0?`<span class="fee-account ${a.deposit_status==='paid'?'paid':'pending'}">${a.deposit_status==='paid'?'Sinal pago ✓':'Sinal pendente'} • ${money(a.deposit_amount)}</span>`:''}</div><div class="actions">${!a.hair_profile_id&&['awaiting_fee','fee_sent','pending_review'].includes(a.status)?`<button class="btn small gold account-complete-hair" data-id="${a.id}">Completar ficha capilar</button>`:''}${a.status==='confirmed' && getState().rc7Installed?`<button class="btn small account-reschedule" data-id="${a.id}">Solicitar remarcação</button>`:''}${!['cancelled','completed','rejected','no_show'].includes(a.status)?`<button class="btn small danger account-cancel" data-id="${a.id}">Cancelar</button>`:''}</div></article>`).join('')||'<div class="empty-state">Nenhuma solicitação encontrada.</div>';$('.account-cancel').forEach(b=>b.onclick=()=>{
    const selected=list.find(a=>String(a.id)===String(b.dataset.id));
    if(!selected)return;
    const hasPaidDeposit=selected.deposit_status==='paid';
    const details=hasPaidDeposit
      ? 'Existe um sinal pago. O valor seguirá as regras de cancelamento, crédito e eventual reembolso da D&D; o cancelamento não gera devolução automática.'
      : 'Se o cancelamento for permitido pelas regras da agenda, esta solicitação será encerrada.';
    askConfirm({
      title:'Confirmar cancelamento',
      message:`Deseja realmente cancelar o atendimento de ${selected.scheduled_start?new Date(selected.scheduled_start).toLocaleDateString('pt-BR'):'data não definida'}? ${details}`,
      confirmText:'Sim, cancelar',danger:true,
      onConfirm:async()=>{
        if(b.disabled)return;
        b.disabled=true;
        try{
          await DDB.clientCancel(selected.id);
          notify('Cancelamento registrado. Confira o status atualizado e os próximos passos do sinal, se houver.','Cancelamento confirmado');
          await renderAccount();
        }catch(e){
          console.error('Cancelamento não concluído:',e);
          notify('O cancelamento não foi confirmado. '+(e.message||'Tente novamente ou contate a D&D.'),'Erro no cancelamento');
        }finally{b.disabled=false;}
      }
    });
  });$$('.account-complete-hair').forEach(b=>b.onclick=()=>openMissingHairProfile(b.dataset.id));$$('.account-reschedule').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await DDB.requestWaitlist(b.dataset.id);notify('Solicitação registrada na lista de espera.');renderAccount();}catch(e){notify(e.message||'Não foi possível solicitar a remarcação.');}finally{b.disabled=false;}});
  await window.DDBraidsRC7?.renderAccount(box,list);}catch(e){box.innerHTML=`<div class="empty-state">Não foi possível carregar seus agendamentos.</div>`;}
}
async function renderSpecificConsent(){
 const body=$('#specificConsentBody'), token=paramsFromHash().get('token'); if(!body)return;
 if(!token){body.innerHTML=`<div class="empty-state">Este link não é válido ou já expirou.</div>`;return;}
 try{
  const row=await DDB.nonRecommendationByToken(token);
  if(!row){body.innerHTML=`<div class="empty-state">Este link não é válido, expirou ou já foi utilizado.</div>`;return;}
  const data=Array.isArray(row)?row[0]:row, reasons=data?.reasons||data?.reason_codes||[];
  body.innerHTML=`<div class="glass panel"><h2>Ciência sobre o procedimento</h2><p>${esc(data?.content||data?.consent_content||'Leia atentamente as informações registradas pela profissional.')}</p>${reasons.length?`<h3>Pontos informados pela profissional</h3><div class="chips">${reasons.map(r=>`<span class="chip on">${esc(r)}</span>`).join('')}</div>`:''}<button class="btn gold" id="acceptSpecific">Li, compreendi e desejo prosseguir</button></div>`;
  $('#acceptSpecific').onclick=async()=>{try{await DDB.acceptNonRecommendationToken(token);body.innerHTML=`<div class="glass panel success-modal"><div class="success-icon">✓</div><h2>Ciência registrada</h2><p>A D&D Braids foi notificada no painel administrativo. A confirmação do atendimento continua sob decisão da profissional.</p></div>`;}catch(e){notify(e.message||'Não foi possível registrar sua ciência.');}};
 }catch(e){console.error(e);body.innerHTML=`<div class="empty-state">Este link não é válido, expirou ou já foi utilizado.</div>`;}
}

async function backendAdminLogin(email,password){await DDB.signIn(email,password);if(!await DDB.isAdmin()){await DDB.signOut();throw new Error('Esta conta não possui acesso administrativo.');}sessionStorage.setItem('ddbraids_admin_session','1');await syncAdminSnapshot();showAdmin();}
async function syncAdminSnapshot(){
 try{const snap=await DDB.adminSnapshot(); const db=getState(); const anamBy=new Map((snap.anamneses||[]).map(x=>[x.appointment_id,x]));const hairById=new Map((snap.client_hair_profiles||[]).map(x=>[x.id,x]));const reviewedSet=new Set((snap.appointment_events||[]).filter(e=>['anamnesis_admin_updated','non_recommendation_created','consent_created'].includes(e.event_type)).map(e=>e.appointment_id));const mapAnam=(x,origin)=>{const q=x.answers||{};return{id:x.id,origin,appointmentId:x.appointment_id||x.source_appointment_id,...q,hairType:q.hair_type??q.hairType,classification:q.pattern??q.classification,naturalColor:q.natural_color??q.naturalColor,lighteningBackground:q.lightening_background??q.lighteningBackground,recentChemistry:q.recent_chemistry??q.recentChemistry,chemistryDetails:q.chemistry_details??q.chemistryDetails,heatUse:q.frequent_heat??q.heatUse??[],problems:q.problems??q.attention_points??[],otherProblems:q.other_problems??q.otherProblems??'',createdAt:Date.parse(x.created_at),updatedAt:Date.parse(x.updated_at||x.created_at)}};db.anamneses=[...(snap.anamneses||[]).map(x=>mapAnam(x,'legacy')),...(snap.client_hair_profiles||[]).map(x=>mapAnam(x,'profile'))]; const matCostBy=new Map();for(const m of (snap.appointment_materials||[])){matCostBy.set(m.appointment_id,(matCostBy.get(m.appointment_id)||0)+Number(m.internal_unit_cost_snapshot||0)*Number(m.estimated_quantity||0));} const payBy=new Map();for(const p of snap.payments||[]){if(!payBy.has(p.appointment_id))payBy.set(p.appointment_id,[]);payBy.get(p.appointment_id).push(p);}db.appointments=(snap.appointments||[]).map(a=>{const ps=payBy.get(a.id)||[],dep=ps.find(p=>p.kind==='deposit'&&p.status==='recorded'),fin=ps.find(p=>p.kind==='final'&&p.status==='recorded'),ref=ps.find(p=>p.kind==='refund'&&p.status==='recorded'),dt=a.scheduled_start?new Date(a.scheduled_start):null;return{id:a.id,procedureId:a.service_id,methodId:a.method_id||'',variationId:a.variation_id||'',professionalId:a.professional_id,date:dt?dt.toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}):'',time:dt?dt.toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}):'',period:'',clientName:a.client_name_snapshot||'',phone:a.client_phone_snapshot||'',email:a.client_email_snapshot||'',status:a.status==='not_recommended'?'non_recommended':a.status==='client_aware'?'acknowledged':a.status,bookingFeeAmount:Number(a.deposit_amount||0),bookingFeePaid:!!dep,bookingFeePaidAt:dep?.paid_at?Date.parse(dep.paid_at):null,refundStatus:ref?'refunded':a.deposit_status==='refund_pending'?'pending':'none',price:Number(a.total_amount||0),fullDay:getProcedure(a.service_id)?.special==='maintenance',durationMinutes:a.scheduled_start&&a.expected_end?Math.round((Date.parse(a.expected_end)-Date.parse(a.scheduled_start))/60000):Number(getVariation(getMethod(getProcedure(a.service_id),a.method_id),a.variation_id)?.durationMinutes||getMethod(getProcedure(a.service_id),a.method_id)?.durationMinutes||getProcedure(a.service_id)?.durationMinutes||0),serviceName:a.service_name_snapshot||getProcedure(a.service_id)?.name||'',anamnesisId:(hairById.has(a.hair_profile_id)?a.hair_profile_id:anamBy.get(a.id)?.id)||null,anamnesisReviewed:reviewedSet.has(a.id)||['not_recommended','client_aware','confirmed','completed'].includes(a.status),createdAt:Date.parse(a.created_at),paid:!!fin,paymentMethod:fin?.method||'',paidAt:fin?.paid_at?Date.parse(fin.paid_at):null,refundedAt:ref?.paid_at?Date.parse(ref.paid_at):null,installments:fin?.installments||0,installmentValue:Number(fin?.installment_amount||0),finalPaymentAmount:Number(fin?.amount||0),materialCost:Number(matCostBy.get(a.id)||0)};});db.operationalTasks=(snap.operational_tasks||[]).map(t=>({id:t.id,type:t.task_type,appointmentId:t.appointment_id,createdAt:Date.parse(t.created_at),resolvedAt:t.resolved_at?Date.parse(t.resolved_at):null,resolutionAction:t.resolution_action||''}));db.operators=(snap.internal_operators||[]).filter(o=>o.is_active);const opNames=new Map((snap.internal_operators||[]).map(o=>[o.id,o.display_name]));const opById=new Map((snap.internal_operators||[]).map(o=>[o.id,o]));const pixByPro=new Map((snap.professional_pix_keys||[]).map(x=>[x.professional_id,x]));for(const p of db.professionals){const row=(snap.professionals||[]).find(x=>x.id===p.id),op=row?opById.get(row.operator_id):null,pix=pixByPro.get(p.id);p.operatorId=row?.operator_id||null;p.pinConfigured=!!op?.pin_updated_at;p.pixKey=pix?.pix_key||'';}db.audits=[...(snap.audit_log||[]).map(x=>({id:x.id,actor:opNames.get(x.operator_id)||'Admin',area:x.entity_type||'Sistema',action:x.action||'Alteração',at:Date.parse(x.created_at),details:x.details||{}})),...(snap.appointment_events||[]).map(x=>({id:x.id,actor:opNames.get(x.operator_id)||'Sistema',area:'Atendimento',action:x.event_type||'Evento',at:Date.parse(x.created_at),details:x.payload||{}}))].sort((a,b)=>b.at-a.at);const aset=Object.fromEntries((snap.app_settings||[]).map(x=>[x.key,x.value]));if(aset.cancellation_hours!=null)db.settings.cancelHours=Number(aset.cancellation_hours);db.settings.consentStandardText=aset.consent_standard_text||'';db.settings.consentVersion=aset.consent_standard_version||'1.0';const msgMap={deposit_charge:'fee',confirmation:'confirm',cancellation:'cancel',reschedule:'reschedule',reminder:'reminder',open_slot:'opening',not_recommended:'nonRecommended',refund_completed:'refundCompleted'};for(const t of (snap.whatsapp_templates||[])){const k=msgMap[t.template_key];if(k)db.settings.messages[k]=t.body;}saveState();}catch(e){console.error('Admin sync failed',e);}
}


