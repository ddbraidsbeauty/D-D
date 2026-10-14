/* ===== public.js ===== */
let catalogCategory = 'Todos';
let booking = newBooking();
let stepIndex = 0;
// Loaded from Supabase for the authenticated client before the anamnesis step.
// Never reuse demo data, phone-matched records or another client's profile.
let currentClientHairProfile = null;
let currentClientHairProfileOwnerId = null;
let currentClientContactOwnerId = null;
let clientHasSavedContact = false;
let clientContactEditing = true;
let bookingPhoneInputInstance = null;
let bookingEntryChoiceOpen = false;
// Preferência provisória exibida antes do procedimento e da profissional.
let bookingCalendarIntroOpen=false;
let bookingCalendarIntro={date:'',time:'',year:null,month:null};
const BOOKING_DRAFT_KEY='ddb_pending_booking_v2';
const HAIR_PATTERNS=['1A','1B','1C','2A','2B','2C','3A','3B','3C','4A','4B','4C'];
const HAIR_DESCRIPTIONS={ '1A':'Liso reto','1B':'Liso com leve corpo','1C':'Liso encorpado','2A':'Ondulado suave','2B':'Ondulado definido','2C':'Ondulado forte','3A':'Cacheado solto','3B':'Cacheado definido','3C':'Cacheado fechado','4A':'Crespo em espiral','4B':'Crespo em Z','4C':'Crespo denso' };
function hairTypeForPattern(code){ return {1:'Liso',2:'Ondulado',3:'Cacheado',4:'Crespo'}[String(code||'').charAt(0)]||''; }
function hairPatternGrid(selected=''){
  return `<fieldset class="hair-selector"><legend>Classificação capilar *</legend><p class="muted hair-guide">Compare os formatos dos fios e escolha o mais parecido com seu cabelo natural. As imagens são ilustrativas; a profissional poderá revisar sua avaliação.</p><div class="hair-grid" role="radiogroup" aria-label="Classificação capilar">${HAIR_PATTERNS.map(code=>`<label class="hair-choice"><input type="radio" name="hairPattern" data-an="classification" value="${code}" ${selected===code?'checked':''} required><img src="assets/hair-patterns/${code.toLowerCase()}.webp" width="345" height="250" loading="lazy" alt="Exemplo de cabelo ${HAIR_DESCRIPTIONS[code]}"><span class="hair-choice-label"><strong>${code}</strong><span>${HAIR_DESCRIPTIONS[code]}</span></span></label>`).join('')}</div><p class="muted hair-guide">Se tiver dúvida, escolha a opção mais próxima. A classificação é apenas uma referência visual, não um diagnóstico.</p></fieldset>`;
}

const BOOKING_DRAFT_TTL=24*60*60*1000;
const BOOKING_DRAFT_FIELDS=['procedureId','maintenanceTargetId','methodId','variationId','tags','size','thickness','accessoryIds','materialChoices','materialId','color','materialProvider','professionalId','date','period','time','calendarPrefillSource'];
let publicCatalogReady=false;
let authRecoveryStarted=false;
let authRecoveryCompleted=false;
// Keep recovery separate from signup callbacks, which may resume an appointment.
let passwordRecoveryActive=/(?:^|[&#])type=recovery(?:&|$)/.test(location.hash);
let accountPasswordChangeInProgress=false;
let passwordRecoveryError=/(?:^|[&#])error_code=/.test(location.hash) ? 'Este link não pôde ser utilizado. Solicite um novo e-mail de recuperação.' : '';

function cleanBookingDraft(input={}) {
  const draft={};
  for(const key of BOOKING_DRAFT_FIELDS){
    const val=input?.[key];
    if((key==='tags'||key==='accessoryIds')&&Array.isArray(val)) draft[key]=val.filter(x=>typeof x==='string'&&x.length<=120).slice(0,40);
    else if(key==='materialChoices'&&val&&typeof val==='object'&&!Array.isArray(val))
      draft[key]=Object.fromEntries(Object.entries(val).filter(([k,v])=>typeof k==='string'&&k.length<=120&&typeof v==='string'&&v.length<=120).slice(0,40));
    else if(typeof val==='string'&&val.length<=240) draft[key]=val;
  }
  return draft;
}
function appBaseUrl(){ return new URL('./', location.href.split('#')[0].split('?')[0]).href; }
// The site owns #booking; the Supabase callback owns its own fragment.
function authReturnUrl(){ return appBaseUrl(); }
function currentBookingDraft(){
  return {version:3,booking:cleanBookingDraft(booking),stepId:steps()[stepIndex]?.id||'client',stepIndex,createdAt:Date.now()};
}
function savePendingBookingDraft(){
  // Share only NON-sensitive selections via auth user_metadata so an e-mail opened
  // in another browser can still recover the draft. Never include name, telephone,
  // e-mail, anamnesis, references, consent, financial details or medical notes.
  const draft=currentBookingDraft();
  try {localStorage.setItem(BOOKING_DRAFT_KEY,JSON.stringify(draft));} catch {}
  return draft;
}
function readPendingBookingDraft(session){
  let local=null;
  try{const raw=localStorage.getItem(BOOKING_DRAFT_KEY);if(raw)local=JSON.parse(raw);}catch{}
  const remote=session?.user?.user_metadata?.ddb_booking_draft;
  for(const d of [remote,local]){
    if(!d||typeof d!=='object'||!d.booking||typeof d.booking!=='object')continue;
    const age=Date.now()-Number(d.createdAt);
    if(!Number.isFinite(age)||age<0||age>BOOKING_DRAFT_TTL)continue;
    const safe=cleanBookingDraft(d.booking);
    if(!safe.procedureId)continue;
    return {...d,booking:safe};
  }
  return null;
}
function restorePendingBookingDraft(session){
  // NEVER restore against the empty boot state. The old code clamped the saved
  // stepIndex using steps() before the live catalog arrived, and lost the draft.
  if(!publicCatalogReady)return false;
  const d=readPendingBookingDraft(session);
  if(!d)return false;
  if(!getProcedure(d.booking.procedureId)){
    notify('Seu procedimento ainda não está disponível no catálogo. O rascunho foi preservado.','Retomada pendente');
    return false;
  }
  bookingCalendarIntroOpen=false;
  booking={...newBooking(),...d.booking,calendarPrefillValidated:false,clientName:String(session?.user?.user_metadata?.full_name||''),email:String(session?.user?.email||'')};
  const flow=steps();
  const savedId=String(d.stepId||'');
  const targetIndex=flow.findIndex(x=>x.id===savedId);
  const clientIndex=flow.findIndex(x=>x.id==='client');
  const previousIndex=targetIndex>=0?targetIndex:(Number.isFinite(Number(d.stepIndex))?Math.floor(Number(d.stepIndex)):0);
  // Personal information, hair anamnesis, references and consent were deliberately
  // NOT persisted; resume from client details so they can be entered safely again.
  stepIndex=Math.max(0,Math.min(previousIndex,clientIndex>=0?clientIndex:flow.length-1));
  // Keep a non-sensitive local draft until the request is actually submitted.
  // A page refresh during the client/anamnesis steps must not reset the booking.
  try{localStorage.setItem(BOOKING_DRAFT_KEY,JSON.stringify({...d,booking:cleanBookingDraft(booking),stepId:'client'}));}catch{}
  // The non-sensitive metadata draft can be cleared after the page has recovered it.
  // If the cleanup fails, the UI is still usable and an already-restored draft isn't lost.
  if(session?.user?.user_metadata?.ddb_booking_draft){
    Promise.resolve().then(()=>DDB.sb.auth.updateUser({data:{ddb_booking_draft:null}})).catch(e=>console.warn('Draft cleanup deferred',e));
  }
  return true;
}
function hasAuthCallback(){
  const h=location.hash;
  return h.includes('access_token=')||h.includes('refresh_token=')||h.includes('error_code=')||h.includes('error_description=')||new URLSearchParams(location.search).has('code');
}
async function finishAuthCallback(){
  // Wait for the real catalog before evaluating stage indices, and never discard
  // a draft if auth isn't ready yet. onAuthStateChange can retry later.
  if(accountPasswordChangeInProgress||passwordRecoveryActive||routeHash()==='reset-password'||authRecoveryStarted||authRecoveryCompleted||!publicCatalogReady)return;
  authRecoveryStarted=true;
  const callback=hasAuthCallback();
  try{
    const session=await DDB.session();
    if(!session?.user)return;
    // Email confirmation can offer a draft; a normal signed-in visit must not jump to step 7.
    if(callback&&readPendingBookingDraft(session)){
      authRecoveryCompleted=true;
      history.replaceState(null,'',appBaseUrl()+'#booking');
      booking=newBooking();stepIndex=0;
      renderPublicRoute();
      showBookingEntryChoice(session,false,true);
      return;
    }
    if(callback && hasAuthCallback()){
      history.replaceState(null,'',appBaseUrl()+'#account');
      renderPublicRoute();
    }
  }catch(e){console.error('Auth recovery failed',e);}
  finally{authRecoveryStarted=false;}
}

function newBooking(procedureId=''){
  return { procedureId, maintenanceTargetId:'', methodId:'', variationId:'', tags:[], size:'', thickness:'', accessoryIds:[], materialId:'', color:'', materialChoices:{}, materialProvider:'', note:'', referenceImage:'', professionalId:'', date:'', period:'', time:'', calendarPrefillSource:'', calendarPrefillValidated:false, clientName:'', phone:'', email:'', hairChange:null, anamnesisMode:'', anamnesis:emptyAnamnesis(), consentAccepted:false };
}

function initPublic(){
  // Run even when the SDK has already cleaned the confirmation hash.
  finishAuthCallback();
  DDB.sb.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_OUT'||(
      (event==='SIGNED_IN'||event==='INITIAL_SESSION') &&
      session?.user?.id!==currentClientHairProfileOwnerId
    )){
      currentClientHairProfile=null;
      currentClientHairProfileOwnerId=null;
      currentClientContactOwnerId=null;
      clientHasSavedContact=false;
      clientContactEditing=true;
    }
    if(event==='PASSWORD_RECOVERY'){
      passwordRecoveryActive=true;
      setTimeout(()=>{ history.replaceState(null,'',appBaseUrl()+'#reset-password');renderPublicRoute(); },0);
      return;
    }
    if(!accountPasswordChangeInProgress && (event==='SIGNED_IN'||event==='INITIAL_SESSION') && session?.user){
      // Defer out of the auth callback to avoid re-entering Supabase's lock.
      setTimeout(finishAuthCallback,0);
    }
  });
  $('#catalogSearch').addEventListener('input',renderCatalog);
  $('#loadAccount')?.addEventListener('click',renderAccount);
  $('#backBtn').addEventListener('click',()=>{ if(stepIndex>0){ stepIndex--; renderBooking(); } });
  $('#nextBtn').addEventListener('click',nextBookingStep);
  $('#bookingBody').addEventListener('click',handleBookingClick);
  $('#bookingBody').addEventListener('input',handleBookingInput);
  $('#bookingBody').addEventListener('change',handleBookingInput);
  $('#publicMobileMenu')?.addEventListener('click',()=>{
    const nav=$('#publicNav'),button=$('#publicMobileMenu');
    const expanded=button.getAttribute('aria-expanded')==='true';
    nav.classList.toggle('is-open',!expanded);
    button.setAttribute('aria-expanded',String(!expanded));
    button.setAttribute('aria-label',expanded?'Abrir menu':'Fechar menu');
  });
  document.addEventListener('click',event=>{
    if(!event.target.closest('.top'))closePublicMobileMenu();
    const link=event.target.closest('a[href="#booking"]');
    if(!link||link.closest('#adminRoot'))return;
    event.preventDefault();closePublicMobileMenu();openBookingFromNavigation();
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closePublicMobileMenu();});
  window.addEventListener('hashchange',renderPublicRoute);
  if(passwordRecoveryError){
    setTimeout(()=>{notify(passwordRecoveryError,'Link inválido');},150);
  }
  renderPublicRoute();
}

function renderPublicRoute(){
  const route=routeHash();
  if(['admin','admin-login'].includes(route)) return;
  closePublicMobileMenu();
  $$('#publicNav a').forEach(a=>{
    if(a.getAttribute('href')==='#'+route)a.setAttribute('aria-current','page');
    else a.removeAttribute('aria-current');
  });
  $$('.screen').forEach(x=>x.classList.remove('active'));
  const el=$(`#${route}`) || $('#home'); el.classList.add('active');
  if(route==='home') renderHome();
  if(route==='catalog') renderCatalog();
  if(route==='booking') renderBooking();
  if(route==='account') renderAccount();
  if(route==='reset-password') renderResetPassword();
  if(route==='special-consent') renderSpecificConsent();
  window.scrollTo({top:0,behavior:'instant'});
}

function closePublicMobileMenu(){
  $('#publicNav')?.classList.remove('is-open');
  const button=$('#publicMobileMenu');
  if(button){button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Abrir menu');}
}
function clearPendingBookingDraft(){
  try{localStorage.removeItem(BOOKING_DRAFT_KEY);}catch{}
  DDB.session().then(s=>{
    if(s?.user?.user_metadata?.ddb_booking_draft)
      return DDB.sb.auth.updateUser({data:{ddb_booking_draft:null}});
  }).catch(e=>console.warn('Limpeza do rascunho adiada:',e));
}
function openFreshBooking(procedureId='',prefill=null){
  booking=newBooking(procedureId);stepIndex=procedureId?1:0;
  bookingCalendarIntroOpen=false;
  if(prefill?.date&&prefill?.time){
    booking.date=prefill.date;booking.time=prefill.time;booking.period=prefill.time;
    booking.calendarPrefillSource='calendar';booking.calendarPrefillValidated=false;
    const month=new Date(prefill.date+'T12:00:00');
    booking.calendarYear=month.getFullYear();booking.calendarMonth=month.getMonth();
  }
  currentClientContactOwnerId=null;clientHasSavedContact=false;clientContactEditing=true;
  clearPendingBookingDraft();
  if(location.hash==='#booking')renderPublicRoute();else location.hash='#booking';
}
function showBookingEntryChoice(session,hasInMemory=false,hasStoredDraft=false,onNew=null){
  if(bookingEntryChoiceOpen)return;
  bookingEntryChoiceOpen=true;
  openModal('Seu agendamento',`<div class="booking-resume-choice"><p>Você tem um atendimento em andamento. Quer continuar de onde parou ou iniciar um novo agendamento?</p><div class="modal-actions"><button class="btn gold" type="button" data-resume-booking>Continuar agendamento</button><button class="btn" type="button" data-new-booking>Começar outro</button></div></div>`,root=>{
    $('[data-resume-booking]',root).onclick=()=>{
      bookingEntryChoiceOpen=false;closeModal();
      if(!hasInMemory&&hasStoredDraft&&!restorePendingBookingDraft(session)){
        notify('Não foi possível recuperar esse rascunho.','Agendamento');return;
      }
      bookingCalendarIntroOpen=false;
      if(location.hash==='#booking')renderPublicRoute();else location.hash='#booking';
    };
    $('[data-new-booking]',root).onclick=()=>{
      bookingEntryChoiceOpen=false;closeModal();
      if(onNew)onNew();else openFreshBooking();
    };
  });
}
async function promptExistingBookingOrStart(onNew){
  if(bookingEntryChoiceOpen&&!$('#modal').classList.contains('open'))bookingEntryChoiceOpen=false;
  if(bookingEntryChoiceOpen)return;
  const inProgress=!!booking.procedureId;
  let session=null,stored=null;
  try{session=await DDB.session();stored=readPendingBookingDraft(session);}
  catch(e){console.warn('Rascunho indisponível:',e);}
  if(inProgress||stored)showBookingEntryChoice(session,inProgress,!!stored,onNew);
  else onNew();
}
function openBookingFromNavigation(){
  // Consultar calendário não descarta automaticamente o rascunho anterior.
  const today=new Date(todayISO()+'T12:00:00');
  bookingCalendarIntro={date:'',time:'',year:today.getFullYear(),month:today.getMonth()};
  bookingCalendarIntroOpen=true;
  if(location.hash==='#booking')renderPublicRoute();else location.hash='#booking';
}
async function continueBookingFromCalendarIntro(){
  const chosen={date:bookingCalendarIntro.date,time:bookingCalendarIntro.time};
  if(!chosen.date||!chosen.time)
    return notify('Selecione uma data e um horário de preferência.','Falta uma informação');
  await promptExistingBookingOrStart(()=>openFreshBooking('',chosen));
}
function invalidateBookingCalendarSelection(){
  booking.calendarPrefillValidated=false;
  if(booking.calendarPrefillSource==='calendar')return;
  booking.date='';booking.time='';booking.period='';
}

function renderHome(){
  const db=getState();
  const hero=$('#heroImage');if(db.media.hero){hero.src=safeImageSrc(db.media.hero);hero.hidden=false;hero.closest('.heroimg')?.classList.remove('no-photo');}else{hero.removeAttribute('src');hero.hidden=true;hero.closest('.heroimg')?.classList.add('no-photo');}
  const pros=activeProfessionals();
  $('#homeProTitle').textContent=pros.map(p=>p.name).join(' & ')||'Profissionais';
  $('#homePros').innerHTML=pros.length?pros.map(p=>{const insta=String(p.instagram||'').trim();const href=insta?(insta.startsWith('http')?insta:`https://instagram.com/${insta.replace('@','')}`):'';return `<article class="pro ${p.image?'':'no-photo'}">${p.image?`<img src="${imageAttr(p.image)}" alt="${esc(p.name)}">`:`<div class="pro-placeholder"><span>D&D</span><b>${esc(p.name)}</b><small>Foto em breve</small></div>`}<div class="caption glass"><div><b>${esc(p.name)}</b>${insta?`<span>${esc(insta)}</span>`:''}</div>${href?`<a class="btn small" href="${esc(href)}" target="_blank" rel="noreferrer">Instagram</a>`:''}</div></article>`}).join(''):`<div class="empty-state">Nenhuma profissional disponível no momento.</div>`;
  $('#featured').innerHTML=activeProcedures().filter(p=>p.special!=='maintenance').slice(0,6).map(publicCard).join('')||`<div class="empty-state">Nenhum procedimento cadastrado.</div>`;
  bindPublicCards();
}

function publicCard(p){ return `<article class="card"><img src="${imageAttr(p.image)}" alt="${esc(p.name)}"><div class="cardbody"><small>${esc(p.category||'Procedimento')}</small><h3>${esc(p.name)}</h3><p class="muted">${Number(p.price)>0?'A partir de '+money(p.price):'Valor a definir pela profissional'}</p><button class="btn gold book-procedure" data-id="${esc(p.id)}">Escolher →</button></div></article>`; }

function renderCatalog(){
  const q=($('#catalogSearch')?.value||'').toLowerCase();
  const procs=activeProcedures();
  const categories=['Todos',...new Set(procs.map(p=>p.category).filter(Boolean))];
  $('#categoryFilters').innerHTML=categories.map(c=>`<button class="chip ${catalogCategory===c?'on':''}" data-category="${esc(c)}">${esc(c)}</button>`).join('');
  $('#categoryFilters').querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{catalogCategory=b.dataset.category;renderCatalog();});
  const filtered=procs.filter(p=>(catalogCategory==='Todos'||p.category===catalogCategory)&&p.name.toLowerCase().includes(q));
  $('#catalogCards').innerHTML=filtered.map(publicCard).join('')||`<div class="empty-state">Nenhum procedimento encontrado.</div>`;
  bindPublicCards();
}
function bindPublicCards(){ $$('.book-procedure').forEach(b=>b.onclick=()=>startBooking(b.dataset.id)); }
function startBooking(id){
  promptExistingBookingOrStart(()=>openFreshBooking(id))
    .catch(e=>notify(e.message||'Não foi possível iniciar o agendamento.','Agendamento'));
}

function steps(){
  const p=getProcedure(booking.procedureId), target=targetProcedure(booking), method=selectedMethod(booking), opts=currentOptions(booking), db=getState();
  const s=[];
  s.push({id:'procedure',label:'Procedimento'});
  if(p?.special==='maintenance') s.push({id:'maintenanceTarget',label:'Procedimento da manutenção'});
  if((target?.methods||[]).filter(x=>x.active).length) s.push({id:'method',label:'Método'});
  if((method?.variations||[]).filter(x=>x.active).length) s.push({id:'variation',label:'Variação'});
  const hasPersonal=(opts.tags||[]).length||(opts.sizes||[]).length||(opts.thicknesses||[]).length||compatibleAccessories().length;
  if(hasPersonal) s.push({id:'personalization',label:'Personalizações'});
  s.push({id:'professional',label:'Profissional'});
  if(compatibleMaterials().length) s.push({id:'material',label:'Materiais'});
  s.push({id:'summary',label:'Resumo'});
  if(!booking.calendarPrefillValidated)s.push({id:'date',label:'Data'});
  s.push({id:'client',label:'Seus dados'});
  s.push({id:'anamnesis',label:'Anamnese'});
  s.push({id:'consent',label:'Consentimento'});
  s.push({id:'final',label:'Revisão'});
  return s;
}

function compatibilityKeys(){
  const p=targetProcedure(booking), keys=[]; if(!p) return keys; keys.push(p.id); if(booking.methodId) keys.push(`${p.id}/${booking.methodId}`); if(booking.methodId&&booking.variationId) keys.push(`${p.id}/${booking.methodId}/${booking.variationId}`); return keys;
}
function compatibleMaterials(){
  const db=getState(), keys=compatibilityKeys();
  return db.materials.filter(m=>m.active && ((m.compatibility||[]).includes('*') || keys.some(k=>(m.compatibility||[]).includes(k))));
}
function compatibleAccessories(){
  const db=getState(), keys=compatibilityKeys();
  return db.accessories.filter(a=>a.active && ((a.compatibility||[]).includes('*') || keys.some(k=>(a.compatibility||[]).includes(k))));
}

async function loadVerifiedClientContact(session){
  const userId=session?.user?.id;
  if(!userId)throw new Error('Entre na sua conta antes de continuar.');
  // Preserve edits when the client goes back to the date step and returns.
  if(currentClientContactOwnerId===userId&&(booking.clientName||booking.phone))return;
  if(currentClientContactOwnerId!==userId){
    booking.clientName='';booking.phone='';booking.email='';
    clientHasSavedContact=false;clientContactEditing=true;
  }
  const appointments=(await DDB.myAppointments()).filter(a=>a.client_id===userId);
  const recent=appointments[0]||null;
  const saved=session.user.user_metadata?.ddb_client_contact||{};
  const previousName=String(saved.name||recent?.client_name||session.user.user_metadata?.full_name||'');
  const previousPhone=String(saved.phone||recent?.client_phone||'');
  const previousEmail=String(saved.email||recent?.client_email||session.user.email||'');
  booking.clientName=previousName==='Cliente'?'':previousName;
  booking.phone=canonicalContactPhone(previousPhone);
  booking.email=previousEmail;
  clientHasSavedContact=!!(recent||saved.phone);
  clientContactEditing=!clientHasSavedContact;
  currentClientContactOwnerId=userId;
}
function renderClientContactStep(){
  if(clientHasSavedContact&&!clientContactEditing){
    return `<div class="client-contact-confirm"><h2>Confirme seus dados</h2><p class="muted">Encontramos os dados da sua conta. Confira antes de continuar.</p><div class="contact-summary">
      <div><small>Nome completo</small><b>${esc(booking.clientName||'—')}</b></div>
      <div><small>WhatsApp</small><b>${esc(contactPhoneDisplay(booking.phone))}</b></div>
      <div><small>E-mail de contato</small><b>${esc(booking.email||'—')}</b></div>
    </div><button class="btn" type="button" data-client-edit>✎ Editar dados</button></div>`;
  }
  return `<div class="form-grid client-contact-form">
    <label>Nome completo *<input data-booking-field="clientName" autocomplete="name" value="${esc(booking.clientName)}"></label>
    <label>WhatsApp *<input type="tel" id="bookingPhoneInput" data-booking-field="phone" autocomplete="tel" inputmode="tel" aria-label="WhatsApp com DDI e país" value="${esc(booking.phone)}"></label>
    <label>E-mail de contato<input type="email" data-booking-field="email" autocomplete="email" value="${esc(booking.email)}"><span class="contact-help">O e-mail de contato não altera o login da conta.</span></label>
  </div>`;
}
function initBookingPhoneInput(){
  const input=$('#bookingPhoneInput');
  if(!input)return;
  if(typeof window.intlTelInput!=='function'){
    input.placeholder='+55 (33) 99106-3852';
    input.setAttribute('aria-description','Informe +55 e DDD. Seletor de países indisponível; recarregue a página.');
    return;
  }
  const iti=window.intlTelInput(input,{
    initialCountry:'br',countryOrder:['br','us','pt','gb','ar'],
    separateDialCode:true,countrySearch:true,countrySelectorMode:'AUTO',
    loadUtils:()=>import('https://cdn.jsdelivr.net/npm/intl-tel-input@29.5.4/dist/js/utils.js')
  });
  bookingPhoneInputInstance=iti;
  if(booking.phone)iti.setNumber(canonicalContactPhone(booking.phone));
  const update=()=>{
    const dial=String(iti.getSelectedCountryData()?.dialCode||'');
    const national=phoneKey(input.value);
    booking.phone=national&&dial?'+'+dial+national:(national&&input.value.trim().startsWith('+')?'+'+national:'');
    const fromPlugin=iti.getNumber();
    if(national&&fromPlugin?.startsWith('+')&&phoneKey(fromPlugin).length<=15)booking.phone=fromPlugin;
  };
  input.addEventListener('input',update);
  input.addEventListener('countrychange',update);
  iti.promise?.then(()=>{
    if(bookingPhoneInputInstance===iti&&input.isConnected&&booking.phone){
      iti.setNumber(booking.phone);update();
    }
  }).catch(e=>console.warn('Formatação internacional avançada indisponível:',e));
}
function bookingContactPhoneValid(){
  const phone=String(booking.phone||''),digits=phoneKey(phone);
  if(!phone.startsWith('+')||digits.length<9||digits.length>15)return false;
  if(digits.startsWith('55'))return digits.length===12||digits.length===13;
  return true;
}
async function saveVerifiedClientContact(session){
  const userId=session?.user?.id;
  if(!userId||currentClientContactOwnerId!==userId)throw new Error('A conta mudou. Confira os dados e entre novamente.');
  const identity=await DDB.sb.auth.getUser();
  if(identity.error||identity.data?.user?.id!==userId)throw new Error('Sua sessão mudou. Entre novamente.');
  const contact={name:booking.clientName.trim(),phone:booking.phone,email:booking.email.trim()};
  const previous=identity.data.user.user_metadata?.ddb_client_contact||{};
  if(previous.name!==contact.name||previous.phone!==contact.phone||previous.email!==contact.email){
    const {error}=await DDB.sb.auth.updateUser({data:{ddb_client_contact:contact}});
    if(error)throw error;
  }
  clientHasSavedContact=true;clientContactEditing=false;
}

function renderBooking(){
  if(bookingCalendarIntroOpen){
    $('#stepLabel').textContent='Escolha data e horário';
    $('#stepDots').innerHTML='';
    $('#backBtn').classList.add('hidden');
    $('#nextBtn').textContent='Continuar →';
    $('#bookingBody').innerHTML=renderCalendarIntro();
    return;
  }
  if(bookingPhoneInputInstance){bookingPhoneInputInstance.destroy();bookingPhoneInputInstance=null;}
  const s=steps(); if(stepIndex>=s.length) stepIndex=s.length-1; if(stepIndex<0) stepIndex=0;
  const step=s[stepIndex];
  $('#stepLabel').textContent=`${stepIndex+1}. ${step.label}`;
  $('#stepDots').innerHTML=s.map((_,i)=>`<i class="dot ${i===stepIndex?'on':''}"></i>`).join('');
  $('#backBtn').classList.toggle('hidden',stepIndex===0);
  $('#nextBtn').textContent=step.id==='final'?'Enviar solicitação':
    step.id==='client'&&clientHasSavedContact&&!clientContactEditing?'Confirmar e continuar →':'Continuar →';
  $('#bookingBody').innerHTML=renderStep(step.id);
  if(step.id==='date') bindCalendarControls();
  if(step.id==='client'&&(!clientHasSavedContact||clientContactEditing))initBookingPhoneInput();
}

function visualChoice(id,label,image,selected,attr='data-choice'){
  return `<button type="button" class="visual-choice ${selected?'on':''}" ${attr}="${esc(id)}"><img src="${imageAttr(image)}" alt=""><span class="visual-choice-copy"><strong>${esc(label)}</strong><small class="choice-action">${selected?'Selecionado ✓':'Toque para selecionar →'}</small></span></button>`;
}

function renderStep(id){
  const db=getState(), p=getProcedure(booking.procedureId), target=targetProcedure(booking), method=selectedMethod(booking), variation=selectedVariation(booking), opts=currentOptions(booking);
  if(id==='procedure'){
    const list=activeProcedures();
    if(!list.length) return `<div class="empty-state">Nenhum procedimento disponível. Entre em contato com a D&D Braids.</div>`;
    return `<div class="selection-context"><b>Escolha o procedimento</b><span>Essa é a primeira etapa do seu atendimento.</span></div><div class="visual-choices">${list.map(x=>visualChoice(x.id,x.name,x.image,booking.procedureId===x.id,'data-procedure')).join('')}</div>`;
  }
  if(id==='maintenanceTarget'){
    const list=activeProcedures().filter(x=>x.id!=='maintenance'&&x.maintenanceEligible);
    return `<div class="selection-context"><b>Qual procedimento será mantido?</b><span>A manutenção usa o valor e o sinal do procedimento escolhido.</span></div><div class="visual-choices">${list.map(x=>visualChoice(x.id,x.name,x.image,booking.maintenanceTargetId===x.id,'data-maint-target')).join('')}</div>`;
  }
  if(id==='method'){
    const list=(target?.methods||[]).filter(x=>x.active);
    return `<div class="selection-context"><img src="${imageAttr(target?.image)}" alt=""><div><b>${esc(target?.name||'')}</b><span>Escolha o método.</span></div></div><div class="visual-choices">${list.map(x=>visualChoice(x.id,x.name,x.image||target?.image,booking.methodId===x.id,'data-method')).join('')}</div>`;
  }
  if(id==='variation'){
    const list=(method?.variations||[]).filter(x=>x.active);
    return `<div class="selection-context"><img src="${imageAttr(method?.image||target?.image)}" alt=""><div><b>${esc(method?.name||'')}</b><span>Escolha a variação.</span></div></div><div class="visual-choices">${list.map(x=>visualChoice(x.id,x.name,x.image||method?.image,booking.variationId===x.id,'data-variation')).join('')}</div>`;
  }
  if(id==='personalization'){
    const tags=opts.tags||[], sizes=opts.sizes||[], thick=opts.thicknesses||[], acc=compatibleAccessories();
    return `<div class="selection-context"><img src="${imageAttr(variation?.image||method?.image||target?.image)}" alt=""><div><b>${esc(procedureName(booking))}</b><span>Complete as escolhas do estilo.</span></div></div>
      <div class="form-grid">
      ${tags.length?`<fieldset><legend>Características <span class="optional">opcional</span></legend><div class="chips">${tags.map(t=>`<button type="button" class="chip ${booking.tags.includes(t)?'on':''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div></fieldset>`:''}
      ${sizes.length?`<fieldset><legend>Tamanho ${opts.required?.size?'<b>*</b>':'<span class="optional">opcional</span>'}</legend><div class="chips">${sizes.map(x=>`<button type="button" class="chip ${booking.size===x?'on':''}" data-size="${esc(x)}">${esc(x)}</button>`).join('')}</div></fieldset>`:''}
      ${thick.length?`<fieldset><legend>Espessura ${opts.required?.thickness?'<b>*</b>':'<span class="optional">opcional</span>'}</legend><div class="chips">${thick.map(x=>`<button type="button" class="chip ${booking.thickness===x?'on':''}" data-thickness="${esc(x)}">${esc(x)}</button>`).join('')}</div></fieldset>`:''}
      ${acc.length?`<fieldset><legend>Acessórios <span class="optional">opcional</span></legend><div class="accessory-grid">${acc.map(a=>`<button type="button" class="accessory-option ${booking.accessoryIds.includes(a.id)?'on':''}" data-accessory="${esc(a.id)}" aria-pressed="${booking.accessoryIds.includes(a.id)}"><span class="custom-check" aria-hidden="true"></span><img src="${imageAttr(a.image)}" alt=""><span><b>${esc(a.name)}</b><small>+ ${money(a.price)}</small></span></button>`).join('')}</div></fieldset>`:''}
      ${!compatibleMaterials().length?`<p class="muted material-config-note">Materiais e cores ainda não foram configurados para este atendimento. A escolha de quem fornece os materiais ficará disponível após o cadastro pela D&D.</p>`:''}
      ${(method?.descriptionRequired||variation?.descriptionRequired||booking.tags.some(t=>(opts.descriptionTags||['Detalhada']).includes(t)))?`<label>Descrição do que você deseja<textarea data-booking-field="note" placeholder="Explique os detalhes...">${esc(booking.note)}</textarea></label>`:''}
      <label>Imagem de referência <span class="optional">opcional</span><span class="file-picker"><span class="btn">Escolher imagem</span><span class="file-picker-note">JPG, PNG ou WEBP</span><input type="file" accept="image/*" data-reference-file></span></label>${booking.referenceImage?`<img class="reference-preview" src="${imageAttr(booking.referenceImage)}" alt="Referência">`:''}
      </div>`;
  }
  if(id==='material'){
    const rows=materialRows(booking), q=priceQuote(booking);
    if(!rows.length)return `<div class="empty-state">Os materiais ainda não foram cadastrados para esta variação. Contate a profissional antes de solicitar material próprio.</div>`;
    return `<div class="form-grid"><div class="selection-context"><b>Quem fornece os materiais?</b><span>Escolha uma única opção para todos os materiais necessários.</span></div>
      <div class="chips"><button type="button" class="chip ${booking.materialProvider==='dd'?'on':''}" data-provider="dd">D&D fornece tudo</button><button type="button" class="chip ${booking.materialProvider==='client'?'on':''}" data-provider="client">Vou levar todos os materiais</button></div>
      ${rows.map(r=>{const mat=db.materials.find(m=>String(m.id)===String(r.materialId));return `<fieldset class="rc7-material-row"><legend>${esc(r.name||'Material')} • ${Number.isFinite(r.quantity)?esc(r.quantity):'?'} pacote(s)</legend><label>Cor e tamanho<select data-material-variant="${esc(r.materialId)}"><option value="">Escolha cor e tamanho</option>${(mat?.variants||[]).map(v=>`<option value="${esc(v.id)}" ${String(v.id)===String(booking.materialChoices?.[r.materialId])?'selected':''}>${esc([v.color,v.size].filter(Boolean).join(' • ')||'Padrão')}</option>`).join('')}</select></label>${booking.materialProvider==='client'&&r.valid?`<p class="muted">${esc(r.quantity)} × ${money(r.unitPrice)} = ${money(r.subtotal)} de desconto</p>`:''}</fieldset>`;}).join('')}
      ${booking.materialProvider==='client'?`<div class="fee-notice"><small>DESCONTO DOS MATERIAIS</small><strong>${q.error?'Aguardando configuração':`− ${money(q.discount)}`}</strong>${q.error?`<p>${esc(q.error)}. Solicite que a profissional configure os valores.</p>`:`<p>Você fornecerá todos os materiais especificados, no total de ${money(q.final)} pelo atendimento.</p>`}</div>`:''}
    </div>`;
  }
  if(id==='summary') return summaryCard();
  if(id==='professional'){
    const list=activeProfessionals();
    return `<div class="visual-choices">${list.map(x=>visualChoice(x.id,x.name,x.image,booking.professionalId===x.id,'data-professional')).join('')||`<div class="empty-state">Nenhuma profissional disponível.</div>`}</div>`;
  }
  if(id==='date') return renderDateStep();
  if(id==='client') return renderClientContactStep();
  if(id==='anamnesis') return renderAnamnesisStep();
  if(id==='consent') return `<div class="consent-card"><h2>Ciência e consentimento</h2><p>${esc(db.settings.consentText)}</p><label class="toggle-option"><input type="checkbox" data-consent ${booking.consentAccepted?'checked':''}><span>Li e concordo</span></label></div>`;
  if(id==='final') return `${summaryCard()}<div class="final-notice"><b>Ao enviar, isso será uma solicitação.</b><p>Nenhum horário é confirmado automaticamente. ${feeAmount(booking)>0?'A profissional enviará os dados do PIX do sinal pelo WhatsApp.':'A profissional revisará sua ficha antes de confirmar.'}</p></div>`;
  return '';
}

function renderDateStep(){
  const now=new Date(), year=Number(booking.calendarYear||now.getFullYear()), month=Number(booking.calendarMonth??now.getMonth());
  booking.calendarYear=year; booking.calendarMonth=month;
  const first=new Date(year,month,1), days=new Date(year,month+1,0).getDate(), offset=(first.getDay()+6)%7;
  const cells=[]; for(let i=0;i<offset;i++)cells.push('<span class="day empty"></span>');
  for(let d=1;d<=days;d++){ const iso=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; const blocked=dateBlocked(booking.professionalId,iso,isMaintenanceBooking(booking),null,{publicCheck:true}); const past=iso<todayISO(); const state=publicAvailabilityState(booking.professionalId,iso); const disabled=blocked||past||state==='off'||state==='full'; cells.push(`<button type="button" class="day agenda-state ${state} ${booking.date===iso?'selected':''} ${disabled?'disabled':''}" ${disabled?'disabled':''} data-date="${iso}">${d}</button>`); }
  const slots=booking.date?(window.__ddbSlots?.[`${booking.professionalId}|${bookingService(booking)?.id}|${isMaintenanceBooking(booking)?'':(booking.methodId||'')}|${isMaintenanceBooking(booking)?'':(booking.variationId||'')}|${booking.date}`]||[]):[];
  if(booking.time&&!slots.some(x=>x.time===booking.time))booking.time='';
  return `<div class="calendar-shell"><div class="calendar-head"><button class="btn" type="button" data-cal="prev">‹</button><h2>${new Date(year,month,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</h2><button class="btn" type="button" data-cal="next">›</button></div><div class="weekday"><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span></div><div class="calgrid">${cells.join('')}</div><div class="calendar-legend"><span><i class="legend-dot available"></i>Disponível</span><span><i class="legend-dot partial"></i>Parcialmente ocupado</span><span><i class="legend-dot full"></i>Lotado</span><span><i class="legend-dot off"></i>Indisponível</span></div></div>${isMaintenanceBooking(booking)?`<p class="muted">A manutenção ocupa o dia inteiro da profissional.</p>`:`<fieldset><legend>Horário *</legend><div class="chips">${booking.date?(slots.length?['Manhã','Tarde','Noite'].map(period=>{const group=slots.filter(x=>slotPeriod(x.time)===period);return group.length?`<div class="slot-period"><b>${period}</b><div class="chips">${group.map(x=>`<button type="button" class="chip ${booking.time===x.time?'on':''}" data-slot="${x.time}">${x.time}</button>`).join('')}</div></div>`:''}).join(''):'<span class="muted">Nenhum horário disponível para este atendimento nessa data.</span>'):'<span class="muted">Selecione uma data disponível.</span>'}</div></fieldset>`}`;
}
function bindCalendarControls(){ /* event delegation handles controls */ }

function summaryCard(){
  const db=getState(), p=getProfessional(booking.professionalId), fee=feeAmount(booking), q=priceQuote(booking), rows=materialRows(booking);
  return `<div class="summary-card"><div class="summary-hero"><img src="${imageAttr(selectedVariation(booking)?.image||selectedMethod(booking)?.image||targetProcedure(booking)?.image)}" alt=""><div><small>SEU ATENDIMENTO</small><h2>${esc(procedureName(booking)||'Escolha seu procedimento')}</h2></div></div><div class="summary-grid"><span><b>Método</b>${esc(selectedMethod(booking)?.name||'—')}</span><span><b>Variação</b>${esc(selectedVariation(booking)?.name||'—')}</span><span><b>Tamanho</b>${esc(booking.size||'—')}</span><span><b>Espessura</b>${esc(booking.thickness||'—')}</span><span><b>Profissional</b>${esc(p?.name||'—')}</span><span><b>Data</b>${booking.date?fmtDate(booking.date):'—'} ${booking.time?`• ${esc(booking.time)}`:''}</span></div><div class="rc7-price-summary"><div class="between"><span>${compatibleMaterials().length?'Procedimento com materiais':'Procedimento (materiais não configurados)'}</span><b>${q.original==null?'A definir':money(q.original)}</b></div>${booking.materialProvider==='client'?`<div class="between"><span>Materiais próprios (${rows.length})</span><b>− ${money(q.discount)}</b></div>`:''}<div class="between total"><span>Valor final</span><b>${q.error?'A definir':money(q.final)}</b></div>${q.error?`<p class="muted">${esc(q.error)}</p>`:''}</div>${fee>0?`<div class="fee-notice"><small>SINAL PARA RESERVA</small><strong>${money(fee)}</strong><p>Abatido do total do procedimento.</p></div>`:''}</div>`;
}

function renderAnamnesisStep(){
  const old=clientCurrentAnamnesis();
  if(old && booking.hairChange===null) return `<div class="glass nested"><h2>Já encontramos uma ficha anterior.</h2><p>Houve alguma alteração capilar recente ou você realizou algum procedimento químico desde sua última avaliação?</p><div class="actions"><button type="button" class="btn" data-hair-change="no">Não</button><button type="button" class="btn gold" data-hair-change="yes">Sim</button></div></div>`;
  if(old && booking.hairChange==='no'){ booking.anamnesisMode='reuse'; return `<div class="anamnesis-summary"><h2>Ficha atual será reutilizada</h2><p class="muted">A profissional ainda poderá revisar e atualizar observações.</p>${anamSummary(old)}</div>`; }
  booking.anamnesisMode='new'; const x=booking.anamnesis;
  return `<div class="form-grid anamnesis-form">${hairPatternGrid(String(x.classification||'').toUpperCase())}<label>Cor natural *<select data-an="naturalColor"><option></option>${['1 — Preto','2 — Castanho muito escuro','3 — Castanho escuro','4 — Castanho médio','5 — Castanho claro','6 — Loiro escuro','7 — Loiro médio','8 — Loiro claro','9 — Loiro muito claro','10 — Loiro claríssimo','Não identificado'].map(v=>`<option ${x.naturalColor===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Fundo/clareamento *<select data-an="lighteningBackground"><option></option>${['Vermelho escuro','Vermelho','Vermelho-alaranjado','Alaranjado','Amarelo-alaranjado','Amarelo','Amarelo claro/pálido','Não se aplica / cabelo não clareado','Não identificado'].map(v=>`<option ${x.lighteningBackground===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Densidade *<select data-an="density"><option></option>${['Alta','Média','Baixa'].map(v=>`<option ${x.density===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Textura *<select data-an="texture"><option></option>${['Fino','Médio','Grosso'].map(v=>`<option ${x.texture===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Característica *<select data-an="characteristic"><option></option>${['Normal','Seco','Oleoso','Misto'].map(v=>`<option ${x.characteristic===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Resistência *<select data-an="resistance"><option></option>${['Alta','Média','Baixa'].map(v=>`<option ${x.resistance===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Porosidade *<select data-an="porosity"><option></option>${['Alta','Média','Baixa'].map(v=>`<option ${x.porosity===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Elasticidade *<select data-an="elasticity"><option></option>${['Alta','Média','Baixa'].map(v=>`<option ${x.elasticity===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Química recente *<select data-an="recentChemistry"><option></option>${['Nenhuma','Permanente','Alisamento','Coloração','Reflexos','Outra'].map(v=>`<option ${x.recentChemistry===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Detalhes da química<input data-an="chemistryDetails" value="${esc(x.chemistryDetails)}"></label><fieldset><legend>Uso frequente *</legend><div class="checkgrid">${['Nenhum','Secador','Prancha','Modelador'].map(v=>`<label><input type="checkbox" data-an-heat value="${v}" ${x.heatUse.includes(v)?'checked':''}> ${v}</label>`).join('')}</div></fieldset><fieldset><legend>Pontos informados/observados *</legend><div class="checkgrid">${['Nenhum','Queda','Seborreia/Caspa','Dermatite','Tricoptilose','Triconodose','Tricorrexis Nodosa','Tricotilomania','Pediculose'].map(v=>`<label><input type="checkbox" data-an-problem value="${v}" ${x.problems.includes(v)?'checked':''}> ${v}</label>`).join('')}</div></fieldset><label>Outros pontos<textarea data-an="otherProblems">${esc(x.otherProblems)}</textarea></label></div>`;
}
function anamSummary(x){ return `<div class="summary-grid">${[['Tipo',x.hairType],['Classificação',x.classification],['Cor',x.naturalColor],['Densidade',x.density],['Textura',x.texture],['Resistência',x.resistance],['Porosidade',x.porosity],['Elasticidade',x.elasticity],['Química',x.recentChemistry]].map(([k,v])=>`<span><b>${k}</b>${esc(v||'—')}</span>`).join('')}</div>`; }

function handleBookingClick(e){
  const t=e.target.closest('button,[data-accessory]'); if(!t) return;
  if(t.hasAttribute('data-client-edit')){clientContactEditing=true;renderBooking();return;}
  if(t.dataset.accessory!==undefined){ const id=t.dataset.accessory; booking.accessoryIds=booking.accessoryIds.includes(id)?booking.accessoryIds.filter(x=>x!==id):[...booking.accessoryIds,id]; renderBooking(); return; }
  if(t.dataset.procedure!==undefined){ booking=newBooking(t.dataset.procedure); stepIndex=0; renderBooking(); return; }
  if(t.dataset.maintTarget!==undefined){ booking.maintenanceTargetId=t.dataset.maintTarget; booking.methodId='';booking.variationId='';booking.materialChoices={};booking.date='';booking.time='';renderBooking();return; }
  if(t.dataset.method!==undefined){ booking.methodId=t.dataset.method;booking.variationId='';booking.size='';booking.thickness='';booking.tags=[];booking.materialChoices={};booking.date='';booking.time='';renderBooking();return; }
  if(t.dataset.variation!==undefined){ booking.variationId=t.dataset.variation;booking.size='';booking.thickness='';booking.tags=[];booking.materialChoices={};booking.date='';booking.time='';renderBooking();return; }
  if(t.dataset.tag!==undefined){ const v=t.dataset.tag; booking.tags=booking.tags.includes(v)?booking.tags.filter(x=>x!==v):[...booking.tags,v];renderBooking();return; }
  if(t.dataset.size!==undefined){const v=t.dataset.size;booking.size=booking.size===v&&!currentOptions(booking).required?.size?'':v;renderBooking();return;}
  if(t.dataset.thickness!==undefined){const v=t.dataset.thickness;booking.thickness=booking.thickness===v&&!currentOptions(booking).required?.thickness?'':v;renderBooking();return;}
  if(t.dataset.material!==undefined){const v=t.dataset.material;const optional=!currentOptions(booking).required?.material;if(optional&&booking.materialId===v){booking.materialId='';booking.color='';}else{booking.materialId=v;booking.color='';}renderBooking();return;}
  if(t.dataset.color!==undefined){const v=t.dataset.color;booking.color=booking.color===v&&!currentOptions(booking).required?.color?'':v;renderBooking();return;}
  if(t.dataset.provider!==undefined){const v=t.dataset.provider;booking.materialProvider=v;renderBooking();return;}
  if(t.dataset.professional!==undefined){booking.professionalId=t.dataset.professional;booking.date='';booking.time='';renderBooking();return;}
  if(t.dataset.date!==undefined){booking.date=t.dataset.date;booking.time='';booking.period='';loadRealSlotsForBooking().then(renderBooking).catch(e=>{console.error(e);notify('Não foi possível consultar os horários desta data.');renderBooking();});renderBooking();return;}
  if(t.dataset.slot!==undefined){booking.time=t.dataset.slot;booking.period=t.dataset.slot;renderBooking();return;}
  if(t.dataset.period!==undefined){booking.period=t.dataset.period;renderBooking();return;}
  if(t.dataset.hairChange!==undefined){booking.hairChange=t.dataset.hairChange; if(booking.hairChange==='yes') booking.anamnesis=emptyAnamnesis(); renderBooking();return;}
  if(t.dataset.cal){ const d=new Date(booking.calendarYear,booking.calendarMonth+(t.dataset.cal==='next'?1:-1),1);booking.calendarYear=d.getFullYear();booking.calendarMonth=d.getMonth();renderBooking();return; }
}
function handleBookingInput(e){
  const t=e.target;
  if(t.dataset.materialVariant!==undefined){booking.materialChoices=booking.materialChoices||{};booking.materialChoices[t.dataset.materialVariant]=t.value;renderBooking();return;}
  if(t.dataset.bookingField!==undefined&&t.dataset.bookingField!=='phone')booking[t.dataset.bookingField]=t.value;
  if(t.dataset.bookingField==='phone'&&!bookingPhoneInputInstance){
    booking.phone=canonicalContactPhone(t.value);
    if(t.value.trim().startsWith('+55')){
      const d=phoneKey(t.value).slice(2);
      if(d.length>=2&&d.length<=11){
        const part=d.slice(2);
        t.value='+55 ('+d.slice(0,2)+') '+part.slice(0,Math.max(0,part.length-4))+(part.length>4?'-'+part.slice(-4):'');
      }
    }
  }
  if(t.dataset.an!==undefined){booking.anamnesis[t.dataset.an]=t.value; if(t.dataset.an==='classification')booking.anamnesis.hairType=hairTypeForPattern(t.value);}
  if(t.matches('[data-an-heat]')) booking.anamnesis.heatUse=$$('[data-an-heat]:checked',$('#bookingBody')).map(x=>x.value);
  if(t.matches('[data-an-problem]')) booking.anamnesis.problems=$$('[data-an-problem]:checked',$('#bookingBody')).map(x=>x.value);
  if(t.matches('[data-consent]')) booking.consentAccepted=t.checked;
  if(t.matches('[data-reference-file]')){const f=t.files?.[0];if(f)readImage(f,img=>{booking.referenceImage=img;renderBooking();});}
}

function validateStep(id){
  const target=targetProcedure(booking), method=selectedMethod(booking), variation=selectedVariation(booking), opts=currentOptions(booking), db=getState();
  if(id==='procedure'&&!getProcedure(booking.procedureId)) return 'Escolha um procedimento para continuar.';
  if(id==='maintenanceTarget'&&!booking.maintenanceTargetId) return 'Escolha o procedimento da manutenção.';
  if(id==='method'&&!booking.methodId) return 'Escolha um método para continuar.';
  if(id==='variation'&&!booking.variationId) return 'Escolha uma variação para continuar.';
  if(id==='personalization'){
    if(opts.required?.characteristics&&(opts.tags||[]).length&&!booking.tags.length) return 'Escolha ao menos uma característica para continuar.';
    if(opts.required?.size&&(opts.sizes||[]).length&&!booking.size) return 'Escolha o tamanho para continuar.';
    if(opts.required?.thickness&&(opts.thicknesses||[]).length&&!booking.thickness) return 'Escolha a espessura para continuar.';
    if((method?.descriptionRequired||variation?.descriptionRequired||booking.tags.some(t=>(opts.descriptionTags||['Detalhada']).includes(t)))&&!booking.note.trim()) return 'Descreva os detalhes desejados para continuar.';
  }
  if(id==='material'){
    if(!booking.materialProvider) return 'Escolha quem fornecerá todos os materiais.';
    const rows=materialRows(booking);
    if(!rows.length) return 'A profissional ainda não configurou os materiais para essa variação.';
    if(rows.some(r=>!r.variantId)) return 'Selecione a cor e o tamanho de cada material.';
    if(booking.materialProvider==='client'&&priceQuote(booking).error) return priceQuote(booking).error;
  }
  if((id==='summary'||id==='final')&&priceQuote(booking).error) return priceQuote(booking).error;
  if(id==='professional'&&!booking.professionalId) return 'Escolha uma profissional.';
  if(id==='date'&&!booking.date) return 'Escolha uma data.';
  if(id==='date'&&!isMaintenanceBooking(booking)&&!booking.time) return 'Escolha um horário disponível.';
  if(id==='client'&&(!booking.clientName.trim()||!bookingContactPhoneValid())) return 'Preencha nome e WhatsApp com país e DDD corretamente.';
  if(id==='anamnesis'){
    const old=clientCurrentAnamnesis(); if(old&&booking.hairChange===null) return 'Informe se houve alteração capilar desde a última avaliação.';
    if(booking.anamnesisMode==='new'||!old){ const x=booking.anamnesis; const keys=['hairType','classification','naturalColor','lighteningBackground','density','texture','characteristic','resistance','porosity','elasticity','recentChemistry']; if(keys.some(k=>!String(x[k]||'').trim())||!x.heatUse.length||!x.problems.length) return 'Preencha todos os campos obrigatórios da anamnese.'; if(!HAIR_PATTERNS.includes(String(x.classification||'').trim().toUpperCase())||x.hairType!==hairTypeForPattern(x.classification))return 'Escolha uma classificação capilar nas imagens.'; }
  }
  if(id==='consent'&&!booking.consentAccepted) return 'Você precisa ler e aceitar o consentimento para continuar.';
  return '';
}
async function nextBookingStep(){
  const s=steps(), id=s[stepIndex].id, err=validateStep(id); if(err) return notify(err,'Falta uma informação');
  if(id==='final') return submitRequest();
  if(id==='date'){
    try{
      const session=await ensureClientAuth();
      if(!session)return;
      await loadVerifiedClientContact(session);
    }catch(e){return notify(e.message||'Não foi possível carregar seus dados.','Seus dados');}
  }
  if(id==='client'){
    try{
      const session=await ensureClientAuth();
      if(!session?.user?.id)return;
      await saveVerifiedClientContact(session);
      // An unsuccessful lookup must not silently be interpreted as a new client.
      const profile=await DDB.myLatestHairProfile(session.user.id);
      if(currentClientHairProfileOwnerId!==session.user.id){
        booking.hairChange=null;
        booking.anamnesisMode='';
      }
      currentClientHairProfile=profile;
      currentClientHairProfileOwnerId=session.user.id;
    }catch(e){
      console.error('Não foi possível consultar a anamnese anterior:',e);
      return notify('Não foi possível consultar sua ficha capilar. Tente novamente antes de continuar.','Anamnese');
    }
  }
  stepIndex++; renderBooking();
}

// Fluxos com Auth, Supabase e permissões vivem exclusivamente em 70-integration.js.
// A antiga implementação local foi removida para evitar caminhos concorrentes.
