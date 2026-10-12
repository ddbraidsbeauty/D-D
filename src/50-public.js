/* ===== public.js ===== */
let catalogCategory = 'Todos';
let booking = newBooking();
let stepIndex = 0;
const BOOKING_DRAFT_KEY='ddb_pending_booking_v2';
const BOOKING_DRAFT_TTL=24*60*60*1000;
const BOOKING_DRAFT_FIELDS=['procedureId','maintenanceTargetId','methodId','variationId','tags','size','thickness','accessoryIds','materialChoices','materialProvider','professionalId','date','period','time'];
function cleanBookingDraft(input={}) {
  const draft={};
  for(const key of BOOKING_DRAFT_FIELDS){
    const val=input?.[key];
    if((key==='tags'||key==='accessoryIds')&&Array.isArray(val)) draft[key]=val.filter(x=>typeof x==='string');
    else if(key==='materialChoices'&&val&&typeof val==='object'&&!Array.isArray(val))
      draft[key]=Object.fromEntries(Object.entries(val).filter(([k,v])=>typeof k==='string'&&typeof v==='string'));
    else if(typeof val==='string') draft[key]=val;
  }
  return draft;
}
function appBaseUrl(){ return new URL('./', location.href.split('#')[0].split('?')[0]).href; }
// Supabase owns the URL fragment during e-mail confirmation. Do not append our router hash here.
function authReturnUrl(){ return appBaseUrl(); }
function savePendingBookingDraft(){
  // Email confirmation may reopen in another tab. Keep only nonsensitive selections.
  // Never store anamnese, photos, Pix, internal records or medical details here.
  try{
    // Lista fechada: novos campos privados nunca passam a ser armazenados por acidente.
    const safe=cleanBookingDraft(booking);
    localStorage.setItem(BOOKING_DRAFT_KEY,JSON.stringify({booking:safe,stepIndex,createdAt:Date.now()}));
  }catch{}
}
function restorePendingBookingDraft(){ try{const raw=localStorage.getItem(BOOKING_DRAFT_KEY);if(!raw)return false;const d=JSON.parse(raw);if(!d?.booking||!d.createdAt||Date.now()-Number(d.createdAt)>BOOKING_DRAFT_TTL){localStorage.removeItem(BOOKING_DRAFT_KEY);return false;}booking={...newBooking(),...cleanBookingDraft(d.booking)};stepIndex=Math.max(0,Math.min(steps().length-1,Number(d.stepIndex)||0));localStorage.removeItem(BOOKING_DRAFT_KEY);return true;}catch{return false;} }
function hasAuthCallback(){ const h=location.hash; return h.includes('access_token=')||h.includes('refresh_token=')||h.includes('error_code=')||h.includes('error_description='); }
let authRecoveryStarted=false;
async function finishAuthCallback(){
  if(authRecoveryStarted)return;
  authRecoveryStarted=true;
  const callback=hasAuthCallback();
  try{
    // Supabase may consume and remove the token fragment before app.js initializes.
    // Recover a pending signup by checking the authenticated session, not only the hash.
    const session=await DDB.session();
    if(!session?.user){
      if(callback && hasAuthCallback()) console.warn('D&D: authentication callback has no session yet');
      return;
    }
    if(restorePendingBookingDraft()){
      history.replaceState(null,'',appBaseUrl()+'#booking');
      renderPublicRoute();
      return;
    }
    // Only normalize a callback if it is still in the address bar.
    if(callback && hasAuthCallback()){
      history.replaceState(null,'',appBaseUrl()+'#booking');
      renderPublicRoute();
    }
  }catch(e){console.error('Auth recovery failed',e);}
  finally{authRecoveryStarted=false;}
}

function newBooking(procedureId=''){
  return { procedureId, maintenanceTargetId:'', methodId:'', variationId:'', tags:[], size:'', thickness:'', accessoryIds:[], materialId:'', color:'', materialChoices:{}, materialProvider:'', note:'', referenceImage:'', professionalId:'', date:'', period:'', time:'', clientName:'', phone:'', email:'', hairChange:null, anamnesisMode:'', anamnesis:emptyAnamnesis(), consentAccepted:false };
}

function initPublic(){
  // Run even when the SDK has already cleaned the confirmation hash.
  finishAuthCallback();
  DDB.sb.auth.onAuthStateChange((event,session)=>{
    if((event==='SIGNED_IN'||event==='INITIAL_SESSION') && session?.user && localStorage.getItem(BOOKING_DRAFT_KEY)){
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
  window.addEventListener('hashchange',renderPublicRoute);
  renderPublicRoute();
}

function renderPublicRoute(){
  const route=routeHash();
  if(['admin','admin-login'].includes(route)) return;
  $$('.screen').forEach(x=>x.classList.remove('active'));
  const el=$(`#${route}`) || $('#home'); el.classList.add('active');
  if(route==='home') renderHome();
  if(route==='catalog') renderCatalog();
  if(route==='booking') renderBooking();
  if(route==='account') renderAccount();
  if(route==='special-consent') renderSpecificConsent();
  window.scrollTo({top:0,behavior:'instant'});
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
function startBooking(id){ booking=newBooking(id); stepIndex=1; location.hash='#booking'; renderBooking(); }

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
  s.push({id:'date',label:'Data'});
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

function renderBooking(){
  const s=steps(); if(stepIndex>=s.length) stepIndex=s.length-1; if(stepIndex<0) stepIndex=0;
  const step=s[stepIndex];
  $('#stepLabel').textContent=`${stepIndex+1}. ${step.label}`;
  $('#stepDots').innerHTML=s.map((_,i)=>`<i class="dot ${i===stepIndex?'on':''}"></i>`).join('');
  $('#backBtn').classList.toggle('hidden',stepIndex===0);
  $('#nextBtn').textContent=step.id==='final'?'Enviar solicitação':'Continuar →';
  $('#bookingBody').innerHTML=renderStep(step.id);
  if(step.id==='date') bindCalendarControls();
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
  if(id==='client') return `<div class="form-grid"><label>Nome completo *<input data-booking-field="clientName" value="${esc(booking.clientName)}"></label><label>WhatsApp *<input data-booking-field="phone" value="${esc(booking.phone)}"></label><label>E-mail<input type="email" data-booking-field="email" value="${esc(booking.email)}"></label></div>`;
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
  const old=clientCurrentAnamnesis(booking.phone);
  if(old && booking.hairChange===null) return `<div class="glass nested"><h2>Já encontramos uma ficha anterior.</h2><p>Houve alguma alteração capilar recente ou você realizou algum procedimento químico desde sua última avaliação?</p><div class="actions"><button type="button" class="btn" data-hair-change="no">Não</button><button type="button" class="btn gold" data-hair-change="yes">Sim</button></div></div>`;
  if(old && booking.hairChange==='no'){ booking.anamnesisMode='reuse'; return `<div class="anamnesis-summary"><h2>Ficha atual será reutilizada</h2><p class="muted">A profissional ainda poderá revisar e atualizar observações.</p>${anamSummary(old)}</div>`; }
  booking.anamnesisMode='new'; const x=booking.anamnesis;
  return `<div class="form-grid anamnesis-form"><label>Tipo *<select data-an="hairType"><option></option>${['Liso','Ondulado','Cacheado','Crespo'].map(v=>`<option ${x.hairType===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Classificação *<input data-an="classification" value="${esc(x.classification)}" placeholder="1A–4C"></label><label>Cor natural *<select data-an="naturalColor"><option></option>${['1 — Preto','2 — Castanho muito escuro','3 — Castanho escuro','4 — Castanho médio','5 — Castanho claro','6 — Loiro escuro','7 — Loiro médio','8 — Loiro claro','9 — Loiro muito claro','10 — Loiro claríssimo','Não identificado'].map(v=>`<option ${x.naturalColor===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Fundo/clareamento *<select data-an="lighteningBackground"><option></option>${['Vermelho escuro','Vermelho','Vermelho-alaranjado','Alaranjado','Amarelo-alaranjado','Amarelo','Amarelo claro/pálido','Não se aplica / cabelo não clareado','Não identificado'].map(v=>`<option ${x.lighteningBackground===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Densidade *<select data-an="density"><option></option>${['Alta','Média','Baixa'].map(v=>`<option ${x.density===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Textura *<select data-an="texture"><option></option>${['Fino','Médio','Grosso'].map(v=>`<option ${x.texture===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Característica *<select data-an="characteristic"><option></option>${['Normal','Seco','Oleoso','Misto'].map(v=>`<option ${x.characteristic===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Resistência *<select data-an="resistance"><option></option>${['Alta','Média','Baixa'].map(v=>`<option ${x.resistance===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Porosidade *<select data-an="porosity"><option></option>${['Alta','Média','Baixa'].map(v=>`<option ${x.porosity===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Elasticidade *<select data-an="elasticity"><option></option>${['Alta','Média','Baixa'].map(v=>`<option ${x.elasticity===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Química recente *<select data-an="recentChemistry"><option></option>${['Nenhuma','Permanente','Alisamento','Coloração','Reflexos','Outra'].map(v=>`<option ${x.recentChemistry===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Detalhes da química<input data-an="chemistryDetails" value="${esc(x.chemistryDetails)}"></label><fieldset><legend>Uso frequente *</legend><div class="checkgrid">${['Nenhum','Secador','Prancha','Modelador'].map(v=>`<label><input type="checkbox" data-an-heat value="${v}" ${x.heatUse.includes(v)?'checked':''}> ${v}</label>`).join('')}</div></fieldset><fieldset><legend>Pontos informados/observados *</legend><div class="checkgrid">${['Nenhum','Queda','Seborreia/Caspa','Dermatite','Tricoptilose','Triconodose','Tricorrexis Nodosa','Tricotilomania','Pediculose'].map(v=>`<label><input type="checkbox" data-an-problem value="${v}" ${x.problems.includes(v)?'checked':''}> ${v}</label>`).join('')}</div></fieldset><label>Outros pontos<textarea data-an="otherProblems">${esc(x.otherProblems)}</textarea></label></div>`;
}
function anamSummary(x){ return `<div class="summary-grid">${[['Tipo',x.hairType],['Classificação',x.classification],['Cor',x.naturalColor],['Densidade',x.density],['Textura',x.texture],['Resistência',x.resistance],['Porosidade',x.porosity],['Elasticidade',x.elasticity],['Química',x.recentChemistry]].map(([k,v])=>`<span><b>${k}</b>${esc(v||'—')}</span>`).join('')}</div>`; }

function handleBookingClick(e){
  const t=e.target.closest('button,[data-accessory]'); if(!t) return;
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
  if(t.dataset.bookingField!==undefined) booking[t.dataset.bookingField]=t.value;
  if(t.dataset.an!==undefined) booking.anamnesis[t.dataset.an]=t.value;
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
  if(id==='client'&&(!booking.clientName.trim()||phoneKey(booking.phone).length<8)) return 'Preencha nome e WhatsApp corretamente.';
  if(id==='anamnesis'){
    const old=clientCurrentAnamnesis(booking.phone); if(old&&booking.hairChange===null) return 'Informe se houve alteração capilar desde a última avaliação.';
    if(booking.anamnesisMode==='new'||!old){ const x=booking.anamnesis; const keys=['hairType','classification','naturalColor','lighteningBackground','density','texture','characteristic','resistance','porosity','elasticity','recentChemistry']; if(keys.some(k=>!String(x[k]||'').trim())||!x.heatUse.length||!x.problems.length) return 'Preencha todos os campos obrigatórios da anamnese.'; }
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
      if(!booking.email)booking.email=session.user.email||'';
    }catch(e){return notify(e.message||'Não foi possível entrar na conta.','Login');}
  }
  stepIndex++; renderBooking();
}

// Fluxos com Auth, Supabase e permissões vivem exclusivamente em 70-integration.js.
// A antiga implementação local foi removida para evitar caminhos concorrentes.
