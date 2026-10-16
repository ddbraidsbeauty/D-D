/* D&D Braids Beauty — generated bundle. Edit src/*.js; run python tools/build.py. */
(() => {
'use strict';

/* === 00-media.js: begin === */
/* Local visual fallbacks, loaded individually rather than Base64 inside the JS bundle. */
const DEMO_IMAGES = Object.freeze({
  "hero": "assets/demo/hero.jpg",
  "dany": "assets/demo/dany.jpg",
  "debora": "assets/demo/debora.jpg",
  "box": "assets/demo/box.jpg",
  "nago": "assets/demo/nago.jpg",
  "boho": "assets/demo/boho.jpg",
  "fulani": "assets/demo/fulani.jpg",
  "goddess": "assets/demo/goddess.jpg",
  "mega": "assets/demo/mega.jpg",
  "maintenance": "assets/demo/maintenance.jpg",
  "jumbo": "assets/demo/jumbo.jpg",
  "kanekalon": "assets/demo/kanekalon.jpg",
  "accessory": "assets/demo/accessory.jpg"
});
/* === 00-media.js: end === */

/* === 10-ui.js: begin === */
/* ===== ui.js ===== */
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
// Permitir apenas endereços de imagem, nunca esquemas executáveis ou atributos HTML.
function safeImageSrc(value) {
  const src=String(value||'').trim();
  if(!src) return '';
  if(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(src)) return src;
  try {
    const url=new URL(src,document.baseURI);
    return ['https:','http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}
const imageAttr = value => esc(safeImageSrc(value));

const fmtDate = v => v ? new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR') : '';
const phoneKey = v => String(v||'').replace(/\D/g,'');
const todayISO = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

let noticeTimer;
function notify(message, title='Tudo certo') {
  const wrap = $('#siteNotice');
  if (!wrap) return;
  $('#noticeTitle').textContent = title;
  $('#noticeText').textContent = message;
  wrap.classList.add('open');
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(()=>wrap.classList.remove('open'),4200);
}

function openModal(title, html, onReady) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = html;
  $('#modal').classList.add('open');
  onReady?.($('#modalBody'));
}
function closeModal(){ $('#modal').classList.remove('open'); }

function askConfirm({title='Confirmar',message,confirmText='Confirmar',danger=false,onConfirm}) {
  openModal(title, `<div class="confirm-box"><p>${esc(message)}</p><div class="modal-actions"><button class="btn" data-modal-cancel>Voltar</button><button class="btn ${danger?'danger':'gold'}" data-modal-confirm>${esc(confirmText)}</button></div></div>`, root=>{
    $('[data-modal-cancel]',root).onclick=closeModal;
    $('[data-modal-confirm]',root).onclick=()=>{ closeModal(); onConfirm?.(); };
  });
}

function readImage(file, cb) {
  if (!file) return;
  if (!file.type.startsWith('image/')) return notify('Selecione um arquivo de imagem válido.','Imagem inválida');
  if (file.size > 8*1024*1024) return notify('A imagem deve ter no máximo 8 MB.','Arquivo muito grande');
  const r = new FileReader();
  r.onload = ()=>cb(String(r.result));
  r.readAsDataURL(file);
}

function uploadField(id,label,value='') {
  return `<div class="image-upload-field"><span class="upload-label">${esc(label)}</span><div class="image-upload-box ${value?'has-image':''}" id="${id}Preview">${value?`<img src="${imageAttr(value)}" alt="">`:`<div class="upload-empty"><b>Enviar imagem</b><span>JPG, PNG ou WEBP</span></div>`}</div><div class="actions"><label class="btn upload-button">${value?'Trocar imagem':'Enviar imagem'}<input id="${id}" type="file" accept="image/*" hidden></label><button class="btn danger ${value?'':'hidden'}" type="button" id="${id}Remove">Remover</button></div></div>`;
}
function bindUpload(id, getValue, setValue) {
  const input = $(`#${id}`), rem = $(`#${id}Remove`);
  if (input) input.onchange = e => readImage(e.target.files?.[0], img=>{ setValue(img); refreshUpload(id,img); });
  if (rem) rem.onclick = ()=>{ setValue(''); refreshUpload(id,''); };
}
function refreshUpload(id,value){
  const p=$(`#${id}Preview`), rem=$(`#${id}Remove`), label=$(`label.upload-button[for="${id}"]`);
  if(p){p.classList.toggle('has-image',!!value);p.innerHTML=value?`<img src="${imageAttr(value)}" alt="">`:`<div class="upload-empty"><b>Enviar imagem</b><span>JPG, PNG ou WEBP</span></div>`;}
  if(rem) rem.classList.toggle('hidden',!value);
}

// Numbers stored by the new booking form always include their country code.
function canonicalContactPhone(value){
  const raw=String(value||'').trim(), digits=phoneKey(raw);
  if(!digits)return '';
  if(raw.startsWith('+'))return '+'+digits;
  if(digits.length===10||digits.length===11)return '+55'+digits;
  if(digits.startsWith('55')&&(digits.length===12||digits.length===13))return '+'+digits;
  return '+'+digits;
}
function contactPhoneDisplay(value){
  const digits=phoneKey(canonicalContactPhone(value));
  if(digits.startsWith('55')&&(digits.length===12||digits.length===13)){
    const local=digits.slice(2),subscriber=local.slice(2);
    return '+55 ('+local.slice(0,2)+') '+subscriber.slice(0,subscriber.length-4)+'-'+subscriber.slice(-4);
  }
  return digits?'+'+digits:'—';
}
function whatsAppDigits(phone){return phoneKey(canonicalContactPhone(phone));}
function waLink(phone,text){ return `https://wa.me/${whatsAppDigits(phone)}?text=${encodeURIComponent(text)}`; }
function csv(v){ return String(v||'').split(',').map(x=>x.trim()).filter(Boolean); }
function routeHash(){ const h=location.hash.replace(/^#/,''); if(/(?:^|&)access_token=|(?:^|&)refresh_token=|(?:^|&)error(?:_code|_description)?=/.test(h)) return 'booking'; return h.split('?')[0] || 'home'; }
function paramsFromHash(){ const p=location.hash.split('?')[1]||''; return new URLSearchParams(p); }
/* === 10-ui.js: end === */

/* === 20-store.js: begin === */
/* ===== store.js ===== */
const KEY = 'ddbraids_state';

const emptyState = () => ({
  schema: 9,
  media: { hero: '' },
  professionals: [],
  procedures: [],
  materials: [],
  accessories: [],
  appointments: [],
  anamneses: [],
  audits: [],
  operationalTasks: [],
  availability: {},
  settings: {
    cancelHours: 24,
    sundayPublic: false,
    publicSundays: [],
    maintenanceFullDay: true,
    messages: {
      fee: 'Olá {cliente}! Recebemos sua solicitação para {procedimento} com {profissional} no dia {data}. Para reservar a data, realize o PIX de {taxa} para a chave {pix}. Após o pagamento, envie o comprovante por aqui para continuarmos com sua solicitação. 💛',
      confirm: 'Olá {cliente}! Seu atendimento de {procedimento} com {profissional} foi confirmado para {data} {horario}. 💛',
      cancel: 'Olá {cliente}. Seu atendimento de {procedimento} para {data} foi cancelado.{reembolso}',
      refundCompleted: 'Olá {cliente}! Seu reembolso de {valor_reembolso} foi concluído. Consulte os detalhes no portal da D&D Braids. 💛',
      reschedule: 'Olá {cliente}! Seu atendimento de {procedimento} foi remarcado para {data} {horario}.{sinal}',
      reminder: 'Olá {cliente}! Passando para lembrar do seu atendimento de {procedimento} em {data} {horario}. 💛',
      opening: 'Olá {cliente}! Surgiu uma vaga com {profissional} para {data} {horario}. Caso tenha interesse, fale com a gente por aqui. 💛',
      nonRecommended: 'Olá {cliente}! Revisamos sua ficha de anamnese referente ao procedimento {procedimento} e identificamos pontos que merecem atenção: {motivos}. Leia e aceite a ficha de ciência neste link: {link}'
    },
    consentText: 'Declaro que li as informações do atendimento, forneci dados verdadeiros sobre meu cabelo e compreendo que a profissional poderá ajustar ou interromper o procedimento caso identifique riscos ou incompatibilidades.',
    specificConsentText: 'Fui informada sobre os pontos de atenção registrados pela profissional. Li e compreendi as observações e ainda desejo prosseguir com a solicitação. Entendo que este aceite não garante a realização do atendimento e que a decisão final permanece com a profissional.'
  }
});

let state = emptyState();

function getState() { return state; }

function replaceState(next, persist = true) {
  state = normalize(structuredClone(next));
  if (persist) saveState();
  return state;
}

function saveState() {
  // RC7: memory-only business state. Persist only the limited signup draft separately.
  try { localStorage.removeItem(KEY); } catch {}
}

function uid(prefix = 'id') {
  return `${prefix}_${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)}`;
}

function audit(actor, area, action, before = null, after = null) {
  state.audits.unshift({ id: uid('audit'), actor: actor || 'Admin', area, action, before, after, at: Date.now() });
  state.audits = state.audits.slice(0, 500);
  saveState();
}

function normalize(data) {
  const base = emptyState();
  const d = { ...base, ...data };
  d.media = { ...base.media, ...(data.media || {}) };
  d.settings = { ...base.settings, ...(data.settings || {}), messages: { ...base.settings.messages, ...(data.settings?.messages || {}) } };
  for (const k of ['professionals','procedures','materials','accessories','appointments','anamneses','audits','operationalTasks','operators']) d[k] = Array.isArray(data[k]) ? data[k] : [];
  d.availability = data.availability || {};
  d.procedures.forEach(p => {
    p.active ??= true;
    p.fee ??= { type: 'none', value: 0 };
    p.methods ??= [];
    p.methods.forEach(m => {
      m.active ??= true;
      m.options ??= {};
      m.variations ??= [];
      m.variations.forEach(v => { v.active ??= true; v.options ??= {}; });
    });
  });
  d.professionals.forEach(p => { p.active ??= true; p.bookable ??= true; });
  return d;
}
/* === 20-store.js: end === */

/* === 30-fixtures.js: begin === */
/* ===== demo.js ===== */
const req = (overrides={}) => ({ size: true, thickness: true, material: true, color: true, provider: true, characteristics: false, ...overrides });
const opts = (extra={}) => ({ tags: [], sizes: ['Chanel','Médio','Longo'], thicknesses: ['Fina','Média','Grossa'], required: req(), ...extra });

function createDemoState() {
  const s = emptyState();
  s.media.hero = DEMO_IMAGES.hero;
  s.professionals = [
    { id:'pro_dany', name:'Dany', image:DEMO_IMAGES.dany, instagram:'@dany', whatsapp:'5533999990001', pixKey:'dany@pix.com', pin:'', active:true, bookable:true },
    { id:'pro_debora', name:'Débora', image:DEMO_IMAGES.debora, instagram:'@debora', whatsapp:'5533999990002', pixKey:'debora@pix.com', pin:'', active:true, bookable:true }
  ];
  s.availability = {
    pro_dany: { weekdays:[1,2,3,4,5,6], start:'08:00', end:'18:00', bufferMinutes:30, blocks:[] },
    pro_debora: { weekdays:[1,2,3,4,5,6], start:'17:00', end:'21:00', bufferMinutes:30, blocks:[] }
  };
  s.procedures = [
    { id:'proc_penteado', name:'Penteado Tradicional', category:'Penteados', price:120, image:DEMO_IMAGES.nago, active:true, maintenanceEligible:false, fee:{type:'fixed',value:20}, methods:[
      { id:'m_trad', name:'Tradicional', price:120, image:DEMO_IMAGES.nago, active:true, descriptionRequired:true, options:opts({sizes:[],thicknesses:[],required:req({size:false,thickness:false,material:false,color:false,provider:false,characteristics:false})}), variations:[] }
    ]},
    { id:'proc_nago', name:'Tranças Nagô', category:'Penteados', price:150, image:DEMO_IMAGES.nago, active:true, maintenanceEligible:true, fee:{type:'fixed',value:20}, methods:[
      { id:'m_nago', name:'Nagô', price:150, image:DEMO_IMAGES.nago, active:true, options:opts({tags:['Com extensão','Detalhada'],sizes:['Curto','Médio','Longo'],thicknesses:['Fina','Média'],required:req({characteristics:false})}), variations:[
        {id:'v_tiara',name:'Tiara',image:DEMO_IMAGES.nago,active:true,options:opts({tags:['Com extensão','Detalhada'],sizes:['Curto','Médio','Longo'],thicknesses:['Fina','Média']})},
        {id:'v_topo',name:'Ao topo',image:DEMO_IMAGES.nago,active:true,options:opts({tags:['Com extensão','Detalhada'],sizes:['Curto','Médio','Longo'],thicknesses:['Fina','Média']})},
        {id:'v_lateral',name:'Lateral',image:DEMO_IMAGES.nago,active:true,options:opts({tags:['Com extensão','Detalhada'],sizes:['Curto','Médio','Longo'],thicknesses:['Fina','Média']})}
      ]}
    ]},
    { id:'proc_box', name:'Box Braids', category:'Tranças', price:300, image:DEMO_IMAGES.box, active:true, maintenanceEligible:true, fee:{type:'fixed',value:50}, methods:[
      {id:'m_box',name:'Knotless',price:300,image:DEMO_IMAGES.box,active:true,options:opts({tags:['Detalhada'],sizes:['Chanel','Médio','Longo'],thicknesses:['Fina','Média','Grossa']}),variations:[]}
    ]},
    { id:'proc_boho', name:'Boho Braids', category:'Tranças', price:350, image:DEMO_IMAGES.boho, active:true, maintenanceEligible:true, fee:{type:'fixed',value:50}, methods:[
      {id:'m_boho',name:'Knotless',price:350,image:DEMO_IMAGES.boho,active:true,options:opts({sizes:['Chanel','Médio','Longo']}),variations:[]}
    ]},
    { id:'proc_fulani', name:'Fulani Braids', category:'Tranças', price:330, image:DEMO_IMAGES.fulani, active:true, maintenanceEligible:true, fee:{type:'fixed',value:50}, methods:[
      {id:'m_fulani',name:'Knotless',price:330,image:DEMO_IMAGES.fulani,active:true,options:opts({sizes:['Chanel','Médio','Longo']}),variations:[]}
    ]},
    { id:'proc_goddess', name:'Goddess Braids', category:'Tranças', price:370, image:DEMO_IMAGES.goddess, active:true, maintenanceEligible:true, fee:{type:'fixed',value:50}, methods:[
      {id:'m_goddess',name:'Knotless',price:370,image:DEMO_IMAGES.goddess,active:true,options:opts({sizes:['Chanel','Médio','Longo']}),variations:[]}
    ]},
    { id:'proc_mega', name:'Mega Hair Entrelace', category:'Mega Hair', price:450, image:DEMO_IMAGES.mega, active:true, maintenanceEligible:true, fee:{type:'fixed',value:50}, methods:[
      {id:'m_entrelace',name:'Entrelace',price:450,image:DEMO_IMAGES.mega,active:true,options:opts({tags:[],sizes:['Médio','Longo'],thicknesses:[],required:req({thickness:false})}),variations:[
        {id:'v_penteado',name:'Com Penteado',image:DEMO_IMAGES.mega,active:true,options:opts({sizes:['Médio','Longo'],thicknesses:[],required:req({thickness:false})})},
        {id:'v_disfarce',name:'Com Disfarce',image:DEMO_IMAGES.mega,active:true,options:opts({sizes:['Médio','Longo'],thicknesses:[],required:req({thickness:false})})},
        {id:'v_sem_disfarce',name:'Sem Disfarce',image:DEMO_IMAGES.mega,active:true,options:opts({sizes:['Médio','Longo'],thicknesses:[],required:req({thickness:false})})}
      ]}
    ]},
    { id:'maintenance', name:'Manutenção', category:'Manutenção', price:0, image:DEMO_IMAGES.maintenance, active:true, maintenanceEligible:false, fee:{type:'none',value:0}, special:'maintenance', methods:[] }
  ];
  s.materials = [
    {id:'mat_jumbo',name:'Jumbo',image:DEMO_IMAGES.jumbo,active:true,colors:['Preto','Castanho','Loiro','Ruivo'],sizes:['Padrão'],internalCost:45,estimate:'5–6 pacotes conforme tamanho e espessura',compatibility:['*']},
    {id:'mat_kanekalon',name:'Kanekalon',image:DEMO_IMAGES.kanekalon,active:true,colors:['Preto','Castanho','Colorido'],sizes:['Padrão'],internalCost:35,estimate:'Quantidade definida conforme o procedimento',compatibility:['*']}
  ];
  s.accessories = [
    {id:'acc_micanga',name:'Miçangas douradas',image:DEMO_IMAGES.accessory,price:15,active:true,compatibility:['*']},
    {id:'acc_argola',name:'Argolas',image:DEMO_IMAGES.accessory,price:10,active:true,compatibility:['*']}
  ];
  const now=new Date(), y=now.getFullYear(), m=String(now.getMonth()+1).padStart(2,'0'), day=n=>`${y}-${m}-${String(Math.max(1,Math.min(n,new Date(y,now.getMonth()+1,0).getDate()))).padStart(2,'0')}`, stamp=n=>new Date(`${day(n)}T12:00:00`).getTime();
  s.appointments=[
    {id:'demo_done',procedureId:'proc_box',methodId:'m_box',variationId:'',accessoryIds:['acc_micanga'],professionalId:'pro_dany',date:day(5),time:'09:00',endTime:'13:00',estimatedDurationMinutes:240,period:'09:00',clientName:'Cliente Demo 1',phone:'5533999991111',status:'completed',bookingFeeAmount:50,bookingFeePaid:true,bookingFeePaidAt:stamp(1),refundStatus:'none',price:315,fullDay:false,anamnesisReviewed:true,createdAt:stamp(1),paid:true,paidAt:stamp(5),paymentMethod:'pix',paymentCardType:'',finalPaymentAmount:265,materialCost:45},
    {id:'demo_card',procedureId:'proc_boho',methodId:'m_boho',variationId:'',accessoryIds:[],professionalId:'pro_debora',date:day(12),time:'18:00',endTime:'21:00',estimatedDurationMinutes:180,period:'18:00',clientName:'Cliente Demo 2',phone:'5533999992222',status:'completed',bookingFeeAmount:50,bookingFeePaid:true,bookingFeePaidAt:stamp(8),refundStatus:'none',price:350,fullDay:false,anamnesisReviewed:true,createdAt:stamp(8),paid:true,paidAt:stamp(12),paymentMethod:'card',paymentCardType:'credit',installments:2,installmentValue:150,finalPaymentAmount:300,materialCost:35},
    {id:'demo_future',procedureId:'proc_fulani',methodId:'m_fulani',variationId:'',accessoryIds:[],professionalId:'pro_dany',date:day(25),time:'10:00',endTime:'14:00',estimatedDurationMinutes:240,period:'10:00',clientName:'Cliente Demo Futuro',phone:'5533999993333',status:'confirmed',bookingFeeAmount:50,bookingFeePaid:true,bookingFeePaidAt:stamp(14),refundStatus:'none',price:330,fullDay:false,anamnesisReviewed:true,createdAt:stamp(14),paid:false,finalPaymentAmount:0,materialCost:45}
  ];
  return s;
}
/* === 30-fixtures.js: end === */

/* === 40-domain.js: begin === */
/* ===== domain.js ===== */
const getProfessional = id => getState().professionals.find(x=>x.id===id);
const getProcedure = id => getState().procedures.find(x=>x.id===id);
const getMethod = (p,id) => p?.methods?.find(x=>x.id===id);
const getVariation = (m,id) => m?.variations?.find(x=>x.id===id);
const activeProfessionals = () => getState().professionals.filter(p=>p.active && p.bookable);
const activeProcedures = () => getState().procedures.filter(p=>p.active);

function isMaintenanceBooking(b){return getProcedure(b.procedureId)?.special==='maintenance';}
function targetProcedure(b){ return isMaintenanceBooking(b) ? getProcedure(b.maintenanceTargetId) : getProcedure(b.procedureId); }
function bookingService(b){return isMaintenanceBooking(b)?getProcedure(b.procedureId):targetProcedure(b);}
function selectedMethod(b){ return getMethod(targetProcedure(b), b.methodId); }
function selectedVariation(b){ return getVariation(selectedMethod(b), b.variationId); }
function currentOptions(b){ return selectedVariation(b)?.options || selectedMethod(b)?.options || targetProcedure(b)?.options || {}; }
function procedureName(b){ const p=targetProcedure(b); return isMaintenanceBooking(b) ? `Manutenção — ${p?.name||''}` : p?.name||''; }
function basePrice(b){ const p=targetProcedure(b), m=selectedMethod(b), v=selectedVariation(b); return Number(v?.price ?? m?.price ?? p?.price ?? 0); }
function accessoryTotal(b){ const db=getState(); return (b.accessoryIds||[]).reduce((s,id)=>s+Number(db.accessories.find(a=>a.id===id)?.price||0),0); }
function materialRows(b){
  const db=getState(), service=targetProcedure(b);
  return window.DDBLogic.resolveMaterials({requirements:db.materialRequirements||[],materials:db.materials,prices:db.materialPrices||[],booking:{serviceId:service?.id,methodId:b.methodId,variationId:b.variationId,professionalId:b.professionalId,materialChoices:b.materialChoices||{}}});
}
function priceQuote(b){
  // Um preço base 0 vindo do catálogo inicial não é uma autorização para atendimento gratuito.
  // Somente a profissional pode cadastrar o valor; não substituir por preços fictícios.
  if(!Number.isFinite(basePrice(b))||basePrice(b)<=0){
    return {original:null,discount:null,final:null,deposit:null,error:'O preço deste procedimento ainda não foi configurado pela profissional.'};
  }
  try {return { ...window.DDBLogic.quote({base:basePrice(b),extras:accessoryTotal(b),materials:materialRows(b),bringsOwn:b.materialProvider==='client',fee:feeRule(b)}),error:null};}
  catch(e){return {original:basePrice(b)+accessoryTotal(b),discount:0,final:null,deposit:null,error:e.message};}
}
function totalPrice(b){ return priceQuote(b).final; }
function feeRule(b){ const p=targetProcedure(b); return p?.fee || {type:'none',value:0}; }
function feeAmount(b){ return priceQuote(b).deposit ?? 0; }
function balanceAmount(a){ return Math.max(0, Number(a.price||0)-Number(a.bookingFeePaid? a.bookingFeeAmount||0 : 0)); }
function effectiveFee(a){ return a.bookingFeePaid && a.refundStatus!=='refunded' ? Number(a.bookingFeeAmount||0):0; }
function paymentReceived(a){ return effectiveFee(a)+(a.paid?Number(a.finalPaymentAmount||balanceAmount(a)):0); }
function paymentOpen(a){ if(['cancelled'].includes(a.status)) return 0; return a.paid?0:balanceAmount(a); }
function isConfirmed(a){ return ['confirmed','completed'].includes(a.status); }
function isRequest(a){ return !isConfirmed(a) && a.status!=='cancelled'; }
function isRefundPending(a){ return a.refundStatus==='pending'; }

function statusLabel(a){
  const map={awaiting_fee:'Aguardando envio do sinal',fee_sent:'Aguardando comprovante',pending_review:'Aguardando revisão da anamnese',non_recommended:'Não recomendação enviada',not_recommended:'Não recomendação enviada',acknowledged:'Cliente ciente — aguardando decisão',client_aware:'Cliente ciente — aguardando decisão',confirmed:'Confirmado',completed:'Finalizado',cancelled:'Cancelado',reschedule_requested:'Remarcação solicitada'};
  return map[a.status]||a.status||'';
}

function buildMessage(kind,a,extra={}){
  const db=getState(), t=db.settings.messages[kind]||'';
  const p=getProfessional(a.professionalId), reembolso=a.bookingFeePaid?' Se houver valor reembolsável, você poderá solicitar Pix ou crédito pelo portal.':'';
  const sinal=a.bookingFeePaid?' O sinal já pago acompanha a nova data; não é necessário pagar novamente.':'';
  const values={
    cliente:a.clientName||'', profissional:p?.name||'', procedimento:procedureName(a), data:fmtDate(extra.date||a.date), horario:extra.time||a.time||a.period||'', valor:money(a.price||0), taxa:money(a.bookingFeeAmount||0), pix:p?.pixKey||'', motivos:(extra.reasons||[]).join(', '), link:extra.link||'', reembolso, sinal
  };
  return Object.entries(values).reduce((s,[k,v])=>s.replaceAll(`{${k}}`,v),t);
}

function availabilityFor(proId){ return getState().availability[proId] || {weekdays:[1,2,3,4,5,6],start:'08:00',end:'18:00',blocks:[],bufferMinutes:0}; }
const toMinutes = value => { const [h,m]=String(value||'00:00').split(':').map(Number); return h*60+m; };
const fromMinutes = value => `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
function appointmentEnd(a){
  if(a.endTime) return a.endTime;
  const mins=Number(a.estimatedDurationMinutes||0);
  return a.time&&mins ? fromMinutes(toMinutes(a.time)+mins) : a.time||'';
}
function timeConflict(proId,date,start,end,ignoreId=null,bufferOverride=null){
  if(!start||!end) return null;
  const db=getState(), av=availabilityFor(proId), buffer=bufferOverride==null?Number(av.bufferMinutes||0):Number(bufferOverride||0), s=toMinutes(start), e=toMinutes(end);
  return db.appointments.find(a=>a.id!==ignoreId&&a.professionalId===proId&&a.date===date&&isConfirmed(a)&&a.status!=='cancelled'&&(a.fullDay||(()=>{const as=toMinutes(a.time||'00:00'),ae=toMinutes(appointmentEnd(a)||a.time||'00:00');return s < ae+buffer && e+buffer > as;})()))||null;
}
function publicSundayOpen(date){ return (getState().settings.publicSundays||[]).includes(date); }
function slotPeriod(time){const h=Number(String(time||'0').split(':')[0]);return h<12?'Manhã':h<18?'Tarde':'Noite';}
function publicPeriodsFor(proId,date){
  const av=availabilityFor(proId), d=new Date(`${date}T12:00:00`), wd=d.getDay();
  if(wd===0 && !publicSundayOpen(date)) return [];
  if(wd!==0 && !av.weekdays.includes(wd)) return [];
  if((av.blocks||[]).some(b=>b.date===date)) return [];
  if(getState().appointments.some(a=>a.professionalId===proId&&a.date===date&&isConfirmed(a)&&a.fullDay)) return [];
  const start=toMinutes(av.start), end=toMinutes(av.end);
  const periods=[];
  if(start<12*60 && end>start) periods.push('Manhã');
  if(end>12*60 && start<18*60) periods.push('Tarde');
  if(end>18*60 && start<end) periods.push('Noite');
  return periods;
}
function publicAvailabilityState(proId,date){
  const periods=publicPeriodsFor(proId,date);
  if(!periods.length) return 'off';
  const same=getState().appointments.filter(a=>a.professionalId===proId&&a.date===date&&isConfirmed(a)&&a.status!=='cancelled');
  if(!same.length) return 'available';
  if(same.some(a=>a.fullDay)) return 'full';
  const av=availabilityFor(proId), start=toMinutes(av.start), end=toMinutes(av.end), occupied=same.reduce((n,a)=>{if(!a.time)return n;const s=Math.max(start,toMinutes(a.time)),e=Math.min(end,toMinutes(appointmentEnd(a)||a.time));return n+Math.max(0,e-s);},0);
  return occupied>=Math.max(0,end-start) ? 'full' : 'partial';
}
function dateBlocked(proId,date, fullDay=false, ignoreId=null, options={}){
  const db=getState(), av=availabilityFor(proId), d=new Date(`${date}T12:00:00`), wd=d.getDay();
  if(options.publicCheck){ if(wd===0 && !publicSundayOpen(date)) return true; if(wd!==0 && !av.weekdays.includes(wd)) return true; }
  else if(!av.weekdays.includes(wd)) return true;
  if((av.blocks||[]).some(b=>b.date===date)) return true;
  const same=db.appointments.filter(a=>a.id!==ignoreId && a.professionalId===proId && a.date===date && a.status!=='cancelled');
  if(fullDay) return same.some(a=>isConfirmed(a));
  return same.some(a=>isConfirmed(a) && a.fullDay);
}
function clientCurrentAnamnesis(){
  // Only a verified Supabase profile for the authenticated account can be reused.
  // Telephone matching and the administrator's local snapshot are not trusted here.
  return currentClientHairProfileOwnerId ? currentClientHairProfile : null;
}

function emptyAnamnesis(){ return {hairType:'',classification:'',naturalColor:'',lighteningBackground:'',density:'',texture:'',characteristic:'',resistance:'',porosity:'',elasticity:'',recentChemistry:'',chemistryDetails:'',heatUse:[],problems:[],otherProblems:'',professionalNotes:''}; }
const anamnesisFields = [
  ['hairType','Tipo'],['classification','Classificação'],['naturalColor','Cor natural'],['lighteningBackground','Fundo/clareamento'],['density','Densidade'],['texture','Textura'],['characteristic','Característica'],['resistance','Resistência'],['porosity','Porosidade'],['elasticity','Elasticidade'],['recentChemistry','Química recente'],['chemistryDetails','Detalhes da química'],['otherProblems','Outros pontos'],['professionalNotes','Observação profissional']
];
/* === 40-domain.js: end === */

/* === 50-public.js: begin === */
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
let clientHadPreviousContact = false;
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
      clientHadPreviousContact=false;
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
  // Capturing prevents button handlers from starting a booking in admin preview.
  document.addEventListener('click',event=>{
    if(!adminPreviewMode)return;
    // Na prévia, a navegação é permitida; as operações de reserva seguem bloqueadas.
  },true);
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
  currentClientContactOwnerId=null;clientHasSavedContact=false;clientHadPreviousContact=false;clientContactEditing=true;
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
  if(adminPreviewMode){
    booking=newBooking('');
    stepIndex=0;
    const today=new Date(todayISO()+'T12:00:00');
    bookingCalendarIntro={date:'',time:'',year:today.getFullYear(),month:today.getMonth()};
    bookingCalendarIntroOpen=true;
    if(location.hash==='#booking')renderPublicRoute();else location.hash='#booking';
    return;
  }
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
  $('#homeProTitle').textContent='Conheça nossa equipe';
  $('#homePros').innerHTML=pros.length?pros.map(p=>{const insta=String(p.instagram||'').trim();const href=insta?(insta.startsWith('http')?insta:`https://instagram.com/${insta.replace('@','')}`):'';return `<article class="pro ${p.image?'':'no-photo'}">${p.image?`<img src="${imageAttr(p.image)}" alt="${esc(p.name)}">`:`<div class="pro-placeholder"><span>D&D</span><b>${esc(p.name)}</b><small>Foto em breve</small></div>`}<div class="caption glass"><div><b>${esc(p.name)}</b>${insta?`<span>${esc(insta)}</span>`:''}</div>${href?`<a class="btn small" href="${esc(href)}" target="_blank" rel="noreferrer">Instagram</a>`:''}</div></article>`}).join(''):`<div class="empty-state">Nenhuma profissional disponível no momento.</div>`;
  $('#featured').innerHTML=activeProcedures().map(publicCard).join('')||`<div class="empty-state">Nenhum procedimento cadastrado.</div>`;
  setupFeaturedCarousel();
  bindPublicCards();
}


function setupFeaturedCarousel(){
  const track=$('#featured'),prev=$('#featuredPrev'),next=$('#featuredNext');
  if(!track||!prev||!next)return;
  const update=()=>{
    const end=Math.max(0,track.scrollWidth-track.clientWidth);
    prev.disabled=track.scrollLeft<=2;
    next.disabled=track.scrollLeft>=end-2;
    const visible=end>2;
    prev.hidden=!visible;next.hidden=!visible;
  };
  const advance=dir=>{
    const card=track.querySelector('.card');
    if(!card)return;
    const gap=parseFloat(getComputedStyle(track).columnGap)||16;
    track.scrollBy({left:dir*(card.getBoundingClientRect().width+gap),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  };
  prev.onclick=()=>advance(-1);
  next.onclick=()=>advance(1);
  track.onscroll=update;
  if(window.ResizeObserver){
    if(window.__ddbFeaturedResizeObserver)window.__ddbFeaturedResizeObserver.disconnect();
    window.__ddbFeaturedResizeObserver=new ResizeObserver(update);
    window.__ddbFeaturedResizeObserver.observe(track);
  }
  requestAnimationFrame(update);
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
  if(adminPreviewMode){
    booking=newBooking(id);
    stepIndex=id?1:0;
    bookingCalendarIntroOpen=false;
    if(location.hash==='#booking')renderPublicRoute();else location.hash='#booking';
    return;
  }
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
  s.push({id:'date',label:'Data e horário'});
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
    clientHasSavedContact=false;clientHadPreviousContact=false;clientContactEditing=true;
  }
  const appointments=(await DDB.myAppointments()).filter(a=>a.client_id===userId);
  const recent=appointments[0]||null;
  const saved=session.user.user_metadata?.ddb_client_contact||{};
  // Current booking records use *_snapshot fields. An old booking does not
  // prove that its saved contact data are valid.
  const has=key=>Object.prototype.hasOwnProperty.call(saved,key);
  const previousName=String(has('name')?saved.name:(recent?.client_name_snapshot||recent?.client_name||session.user.user_metadata?.full_name||''));
  const previousPhone=String(has('phone')?saved.phone:(recent?.client_phone_snapshot||recent?.client_phone||''));
  booking.clientName=previousName==='Cliente'?'':previousName;
  booking.phone=canonicalContactPhone(previousPhone);
  booking.email=String(session.user.email||'');
  clientHadPreviousContact=!!(recent||has('name')||has('phone'));
  clientHasSavedContact=!!(booking.clientName.trim()&&bookingContactPhoneValid());
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
    <label>E-mail da conta<input type="email" value="${esc(booking.email)}" readonly><span class="contact-help">Altere o e-mail com sua senha no Portal Cliente.</span></label>
    ${clientHadPreviousContact?'<label>Senha atual da conta *<input type="password" id="bookingContactPassword" autocomplete="current-password" required><span class="contact-help">Necessária para atualizar dados salvos.</span></label>':''}
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
  if(clientHadPreviousContact&&clientContactEditing){
    const password=$('#bookingContactPassword')?.value||'';
    if(!password)throw new Error('Informe sua senha atual para alterar seus dados.');
    await verifyClientAccountPassword(password,userId);
  }
  const contact={name:booking.clientName.trim(),phone:booking.phone,email:identity.data.user.email||''};
  const previous=identity.data.user.user_metadata?.ddb_client_contact||{};
  if(previous.name!==contact.name||previous.phone!==contact.phone||previous.email!==contact.email){
    const {error}=await DDB.sb.auth.updateUser({data:{ddb_client_contact:contact}});
    if(error)throw error;
  }
  clientHasSavedContact=true;clientHadPreviousContact=true;clientContactEditing=false;
}

function renderBooking(){
  if(bookingCalendarIntroOpen){
    $('#stepLabel').textContent='Escolha data e horário';
    $('#stepDots').innerHTML='';
    $('#backBtn').classList.add('hidden');
    $('#nextBtn').classList.remove('hidden');
    $('#nextBtn').textContent='Continuar →';
    $('#bookingBody').innerHTML=renderCalendarIntro();
    if(adminPreviewMode)$('#bookingBody').insertAdjacentHTML('afterbegin','<div class="availability-warning ok" role="status">Visualização administrativa: escolha data e horário para conferir o fluxo. Nenhuma reserva será feita.</div>');
    return;
  }
  if(bookingPhoneInputInstance){bookingPhoneInputInstance.destroy();bookingPhoneInputInstance=null;}
  const s=steps(); if(stepIndex>=s.length) stepIndex=s.length-1; if(stepIndex<0) stepIndex=0;
  const step=s[stepIndex];
  $('#stepLabel').textContent=`${stepIndex+1}. ${step.label}`;
  $('#stepDots').innerHTML=s.map((_,i)=>`<i class="dot ${i===stepIndex?'on':''}"></i>`).join('');
  $('#backBtn').classList.toggle('hidden',stepIndex===0);
  $('#nextBtn').classList.toggle('hidden',adminPreviewMode&&['client','anamnesis','consent','final'].includes(step.id));
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
  if(id==='date') return booking.calendarPrefillSource==='calendar'&&!booking.reselectDate ? renderDateConfirmation() : renderDateStep();
  if(id==='client') return renderClientContactStep();
  if(id==='anamnesis') return renderAnamnesisStep();
  if(id==='consent') return `<div class="consent-card"><h2>Ciência e consentimento</h2><p>${esc(db.settings.consentText)}</p><label class="toggle-option"><input type="checkbox" data-consent ${booking.consentAccepted?'checked':''}><span>Li e concordo</span></label></div>`;
  if(id==='final') return `${summaryCard()}<div class="final-notice"><b>Ao enviar, isso será uma solicitação.</b><p>Nenhum horário é confirmado automaticamente. ${feeAmount(booking)>0?'A profissional enviará os dados do PIX do sinal pelo WhatsApp.':'A profissional revisará sua ficha antes de confirmar.'}</p></div>`;
  return '';
}

// Calendário introdutório: exibe janelas previstas, nunca vagas confirmadas.
function calendarIntroSlots(date){
  if(!date)return [];
  const times=new Set();
  const nowBR=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
  for(const pro of activeProfessionals()){
    if(!publicPeriodsFor(pro.id,date).length||dateBlocked(pro.id,date,false,null,{publicCheck:true}))continue;
    const av=availabilityFor(pro.id);
    for(let minute=toMinutes(av.start);minute+30<=toMinutes(av.end);minute+=30){
      if(date===todayISO()&&minute<=toMinutes(nowBR))continue;
      times.add(fromMinutes(minute));
    }
  }
  return [...times].sort();
}
function renderCalendarIntro(){
  const c=bookingCalendarIntro, today=new Date(todayISO()+'T12:00:00');
  const year=Number(c.year??today.getFullYear()),month=Number(c.month??today.getMonth());
  const first=new Date(year,month,1),days=new Date(year,month+1,0).getDate(),offset=(first.getDay()+6)%7;
  const cells=[];
  for(let i=0;i<offset;i++)cells.push('<span class="day empty"></span>');
  for(let day=1;day<=days;day++){
    const iso=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const possible=iso>=todayISO()&&activeProfessionals().some(p=>publicPeriodsFor(p.id,iso).length&&!dateBlocked(p.id,iso,false,null,{publicCheck:true}));
    cells.push(`<button type="button" class="day agenda-state ${possible?'available':'off'} ${c.date===iso?'selected':''}" data-intro-date="${iso}" ${possible?'':'disabled'}>${day}</button>`);
  }
  const times=calendarIntroSlots(c.date);
  if(c.time&&!times.includes(c.time))c.time='';
  return `<div class="selection-context"><b>Quando você gostaria de vir?</b><span>Escolha uma data e um horário de preferência. A disponibilidade será conferida após selecionar a profissional e o procedimento.</span></div>
    <div class="calendar-shell"><div class="calendar-head"><button type="button" class="btn" data-intro-cal="prev">‹</button><h2>${new Date(year,month,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</h2><button type="button" class="btn" data-intro-cal="next">›</button></div>
    <div class="weekday"><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span></div><div class="calgrid">${cells.join('')}</div></div>
    <fieldset><legend>Horário de preferência *</legend><div class="chips">${c.date?(times.length?['Manhã','Tarde','Noite'].map(period=>{const group=times.filter(t=>slotPeriod(t)===period);return group.length?`<div class="slot-period"><b>${period}</b><div class="chips">${group.map(t=>`<button type="button" class="chip ${c.time===t?'on':''}" data-intro-slot="${t}">${t}</button>`).join('')}</div></div>`:''}).join(''):'<span class="muted">Nenhum horário previsto para esse dia. Escolha outra data.</span>'):'<span class="muted">Selecione um dia para consultar as faixas de horário.</span>'}</div></fieldset>
    <p class="muted">Esta é uma preferência inicial, não uma reserva. Alguns horários podem estar ocupados ou não comportar a duração do procedimento escolhido.</p>`;
}

function renderDateConfirmation(){
  const hasSelection=!!booking.date&&!!booking.time;
  return `<div class="glass nested"><h2>Confirme a data e o horário</h2><p class="muted">Esta é a preferência escolhida no calendário inicial. Não é necessário escolher tudo novamente.</p><div class="summary-grid"><span><b>Data</b>${hasSelection?fmtDate(booking.date):'Não selecionada'}</span><span><b>Horário</b>${esc(booking.time||'—')}</span><span><b>Profissional</b>${esc(getProfessional(booking.professionalId)?.name||'—')}</span></div><div class="actions"><button type="button" class="btn" data-change-booking-date>Alterar data ou horário</button></div><p class="muted">A disponibilidade definitiva é verificada para o serviço e a profissional escolhidos.</p></div>`;
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
  if(old && booking.hairChange==='no'&&!old.recoveredLegacy){
    booking.anamnesisMode='reuse';
    return `<div class="anamnesis-summary"><h2>Ficha atual será reutilizada</h2><p class="muted">A profissional ainda poderá revisar e atualizar observações.</p>${anamSummary(old)}</div>`;
  }
  if(old && booking.hairChange==='no'&&old.recoveredLegacy){
    // Older answers are saved as a NEW profile, never silently reused.
    if(booking.anamnesisMode!=='new'){
      booking.anamnesis={...emptyAnamnesis(),...old,
        heatUse:Array.isArray(old.heatUse)?old.heatUse:[],
        problems:Array.isArray(old.problems)?old.problems:[]};
    }
    booking.anamnesisMode='new';
    const x=booking.anamnesis;
    const keys=['hairType','classification','naturalColor','lighteningBackground','density','texture','characteristic','resistance','porosity','elasticity','recentChemistry'];
    const complete=keys.every(k=>String(x[k]||'').trim())&&x.heatUse.length&&x.problems.length
      &&HAIR_PATTERNS.includes(String(x.classification||'').trim().toUpperCase())
      &&x.hairType===hairTypeForPattern(x.classification);
    if(complete)return `<div class="anamnesis-summary"><h2>Confirme sua ficha anterior</h2><p class="muted">Recuperamos suas respostas do histórico. Elas serão registradas como uma ficha atualizada para esta conta.</p>${anamSummary(x)}</div>`;
  }else booking.anamnesisMode='new';
  const x=booking.anamnesis;
  return `<div class="form-grid anamnesis-form">${hairPatternGrid(String(x.classification||'').toUpperCase())}<label>Cor natural *<select data-an="naturalColor"><option></option>${['1 — Preto','2 — Castanho muito escuro','3 — Castanho escuro','4 — Castanho médio','5 — Castanho claro','6 — Loiro escuro','7 — Loiro médio','8 — Loiro claro','9 — Loiro muito claro','10 — Loiro claríssimo','Não identificado'].map(v=>`<option ${x.naturalColor===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Fundo/clareamento *<select data-an="lighteningBackground"><option></option>${['Vermelho escuro','Vermelho','Vermelho-alaranjado','Alaranjado','Amarelo-alaranjado','Amarelo','Amarelo claro/pálido','Não se aplica / cabelo não clareado','Não identificado'].map(v=>`<option ${x.lighteningBackground===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Densidade *<select data-an="density"><option></option>${['Alta','Média','Baixa'].map(v=>`<option ${x.density===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Textura *<select data-an="texture"><option></option>${['Fino','Médio','Grosso'].map(v=>`<option ${x.texture===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Característica *<select data-an="characteristic"><option></option>${['Normal','Seco','Oleoso','Misto'].map(v=>`<option ${x.characteristic===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Resistência *<select data-an="resistance"><option></option>${['Alta','Média','Baixa'].map(v=>`<option ${x.resistance===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Porosidade *<select data-an="porosity"><option></option>${['Alta','Média','Baixa'].map(v=>`<option ${x.porosity===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Elasticidade *<select data-an="elasticity"><option></option>${['Alta','Média','Baixa'].map(v=>`<option ${x.elasticity===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Química recente *<select data-an="recentChemistry"><option></option>${['Nenhuma','Permanente','Alisamento','Coloração','Reflexos','Outra'].map(v=>`<option ${x.recentChemistry===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Detalhes da química<input data-an="chemistryDetails" value="${esc(x.chemistryDetails)}"></label><fieldset><legend>Uso frequente *</legend><div class="checkgrid">${['Nenhum','Secador','Prancha','Modelador'].map(v=>`<label><input type="checkbox" data-an-heat value="${v}" ${x.heatUse.includes(v)?'checked':''}> ${v}</label>`).join('')}</div></fieldset><fieldset><legend>Pontos informados/observados *</legend><div class="checkgrid">${['Nenhum','Queda','Seborreia/Caspa','Dermatite','Tricoptilose','Triconodose','Tricorrexis Nodosa','Tricotilomania','Pediculose'].map(v=>`<label><input type="checkbox" data-an-problem value="${v}" ${x.problems.includes(v)?'checked':''}> ${v}</label>`).join('')}</div></fieldset><label>Outros pontos<textarea data-an="otherProblems">${esc(x.otherProblems)}</textarea></label></div>`;
}
function anamSummary(x){ return `<div class="summary-grid">${[['Tipo',x.hairType],['Classificação',x.classification],['Cor',x.naturalColor],['Densidade',x.density],['Textura',x.texture],['Resistência',x.resistance],['Porosidade',x.porosity],['Elasticidade',x.elasticity],['Química',x.recentChemistry]].map(([k,v])=>`<span><b>${k}</b>${esc(v||'—')}</span>`).join('')}</div>`; }

function handleBookingClick(e){
  const t=e.target.closest('button,[data-accessory]'); if(!t) return;
  // Seleções de data e horário são permitidas na prévia: só o envio é bloqueado.
  if(bookingCalendarIntroOpen){
    if(t.dataset.introDate!==undefined){bookingCalendarIntro.date=t.dataset.introDate;bookingCalendarIntro.time='';renderBooking();return;}
    if(t.dataset.introSlot!==undefined){bookingCalendarIntro.time=t.dataset.introSlot;renderBooking();return;}
    if(t.dataset.introCal){const d=new Date(bookingCalendarIntro.year,bookingCalendarIntro.month+(t.dataset.introCal==='next'?1:-1),1);bookingCalendarIntro.year=d.getFullYear();bookingCalendarIntro.month=d.getMonth();renderBooking();return;}
    return;
  }
  if(t.hasAttribute('data-change-booking-date')){booking.reselectDate=true;booking.calendarPrefillValidated=false;renderBooking();return;}
  if(t.hasAttribute('data-client-edit')){clientContactEditing=true;renderBooking();return;}
  if(t.dataset.accessory!==undefined){ const id=t.dataset.accessory; booking.accessoryIds=booking.accessoryIds.includes(id)?booking.accessoryIds.filter(x=>x!==id):[...booking.accessoryIds,id]; renderBooking(); return; }
  if(t.dataset.procedure!==undefined){const old=booking;booking=newBooking(t.dataset.procedure);if(old.calendarPrefillSource==='calendar'){booking.date=old.date;booking.time=old.time;booking.period=old.period;booking.calendarPrefillSource='calendar';}stepIndex=0;renderBooking();return; }
  if(t.dataset.maintTarget!==undefined){ booking.maintenanceTargetId=t.dataset.maintTarget; booking.methodId='';booking.variationId='';booking.materialChoices={};invalidateBookingCalendarSelection();renderBooking();return; }
  if(t.dataset.method!==undefined){ booking.methodId=t.dataset.method;booking.variationId='';booking.size='';booking.thickness='';booking.tags=[];booking.materialChoices={};invalidateBookingCalendarSelection();renderBooking();return; }
  if(t.dataset.variation!==undefined){ booking.variationId=t.dataset.variation;booking.size='';booking.thickness='';booking.tags=[];booking.materialChoices={};invalidateBookingCalendarSelection();renderBooking();return; }
  if(t.dataset.tag!==undefined){ const v=t.dataset.tag; booking.tags=booking.tags.includes(v)?booking.tags.filter(x=>x!==v):[...booking.tags,v];renderBooking();return; }
  if(t.dataset.size!==undefined){const v=t.dataset.size;booking.size=booking.size===v&&!currentOptions(booking).required?.size?'':v;renderBooking();return;}
  if(t.dataset.thickness!==undefined){const v=t.dataset.thickness;booking.thickness=booking.thickness===v&&!currentOptions(booking).required?.thickness?'':v;renderBooking();return;}
  if(t.dataset.material!==undefined){const v=t.dataset.material;const optional=!currentOptions(booking).required?.material;if(optional&&booking.materialId===v){booking.materialId='';booking.color='';}else{booking.materialId=v;booking.color='';}renderBooking();return;}
  if(t.dataset.color!==undefined){const v=t.dataset.color;booking.color=booking.color===v&&!currentOptions(booking).required?.color?'':v;renderBooking();return;}
  if(t.dataset.provider!==undefined){const v=t.dataset.provider;booking.materialProvider=v;renderBooking();return;}
  if(t.dataset.professional!==undefined){booking.professionalId=t.dataset.professional;invalidateBookingCalendarSelection();renderBooking();return;}
  if(t.dataset.date!==undefined){booking.date=t.dataset.date;booking.time='';booking.period='';booking.reselectDate=true;booking.calendarPrefillValidated=false;loadRealSlotsForBooking().then(renderBooking).catch(e=>{console.error(e);notify('Não foi possível consultar os horários desta data.');renderBooking();});renderBooking();return;}
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
  if(adminPreviewMode){
    if(bookingCalendarIntroOpen){
      if(!bookingCalendarIntro.date||!bookingCalendarIntro.time)return notify('Escolha a data e o horário para conferir o agendamento.','Prévia');
      booking=newBooking('');
      booking.date=bookingCalendarIntro.date;booking.time=bookingCalendarIntro.time;booking.period=booking.time;
      booking.calendarPrefillSource='calendar';booking.calendarPrefillValidated=false;
      stepIndex=0;bookingCalendarIntroOpen=false;renderBooking();return;
    }
    const previewSteps=steps(),previewStep=previewSteps[stepIndex];
    if(!previewStep||previewStep.id==='client'||previewStep.id==='anamnesis'||previewStep.id==='consent'||previewStep.id==='final')
      return notify('A prévia termina no calendário. Nenhuma reserva será criada.','Visualização administrativa');
    const previewError=['summary','date'].includes(previewStep.id)?'':validateStep(previewStep.id);
    if(previewError)return notify(previewError,'Falta uma informação');
    if(previewStep.id==='date')return notify('A visualização administrativa termina na confirmação da data e do horário.','Prévia');
    stepIndex++;
    if(steps()[stepIndex]?.id==='client')return notify('Prévia limitada à etapa de data.','Visualização administrativa');
    renderBooking();
    return;
  }
  if(bookingCalendarIntroOpen)return continueBookingFromCalendarIntro();
  const s=steps(), id=s[stepIndex].id, err=validateStep(id); if(err) return notify(err,'Falta uma informação');
  if(id==='final') return submitRequest();
  if(id==='date'){
    try{
      const real=await loadRealSlotsForBooking();
      if(!real.length||(!isMaintenanceBooking(booking)&&!real.some(slot=>slot.time===booking.time))){
        booking.reselectDate=true;booking.calendarPrefillValidated=false;
        notify('O horário escolhido não está disponível. Escolha outra data ou horário.','Disponibilidade');
        renderBooking();return;
      }
    }catch(e){console.error('Consulta de disponibilidade falhou:',e);return notify('Não foi possível verificar os horários. Tente novamente.','Agenda');}
    try{const session=await ensureClientAuth();if(!session)return;await loadVerifiedClientContact(session);}
    catch(e){return notify(e.message||'Não foi possível carregar seus dados.','Seus dados');}
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

/* === 50-public.js: end === */

/* === 60-admin.js: begin === */
/* ===== admin.js ===== */
const modules = [
  ['overview','⌂','Visão geral'],['requests','◷','Solicitações'],['bookings','▣','Agendamentos'],['workflows','⇄','Pendências'],['clients','♙','Clientes'],['catalog','✂','Catálogo'],['finance','$','Financeiro'],['professionals','♛','Profissionais'],['posts','▧','Criador de Posts'],['history','↺','Histórico'],['settings','⚙','Configurações']
];
let currentModule='overview';
let adminPreviewMode=false;
let agendaMonth=new Date().getMonth(), agendaYear=new Date().getFullYear(), agendaDate=todayISO(), agendaPro='all';
let financeMonth=new Date().getMonth(), financeYear=new Date().getFullYear(), financeDate=todayISO(), financeMode='cashflow', financePro='all', financeFrom='', financeTo='';

function initAdmin(){
  renderAdminNav();
  $('#logoutAdmin').onclick=async()=>{
    try{
      await DDB.signOut();
      sessionStorage.removeItem('ddbraids_admin_session');
      showPublic(false);
    }catch(e){notify('Não foi possível encerrar a sessão administrativa. Tente novamente.','Sessão');}
  };
  $('#viewPublic').onclick=()=>showPublic(true);
  $('#returnAdminPreview').onclick=()=>showAdmin();
  $('#toggleSidebar').onclick=()=>$('#adminRoot').classList.toggle('sidebar-collapsed');
  $('#adminMenu').onclick=()=>$('#adminSidebar').classList.toggle('mobile-open');
  window.addEventListener('hashchange',()=>{
    if(location.hash==='#admin'&&sessionStorage.getItem('ddbraids_admin_session'))showAdmin();
  });
}

function showPublic(preview=false){
  adminPreviewMode=!!preview&&sessionStorage.getItem('ddbraids_admin_session')==='1';
  if(adminPreviewMode){booking=newBooking('');stepIndex=0;bookingCalendarIntroOpen=false;}
  $('#adminRoot').classList.add('hidden');
  $('#publicRoot').classList.remove('hidden');
  $('#publicRoot').classList.toggle('admin-preview',adminPreviewMode);
  $('#adminPreviewBanner').classList.toggle('hidden',!adminPreviewMode);
  if(location.hash.startsWith('#admin'))location.hash='#home';
  else renderPublicRoute();
}
function showAdmin(){
  if(sessionStorage.getItem('ddbraids_admin_session')!=='1'){location.hash='#account';return;}
  adminPreviewMode=false;
  $('#adminPreviewBanner').classList.add('hidden');
  $('#publicRoot').classList.remove('admin-preview');
  $('#publicRoot').classList.add('hidden');
  $('#adminRoot').classList.remove('hidden');
  location.hash='#admin';
  openModule(currentModule);
}
async function restoreAdminSessionOnLoad(){
  // Never use sessionStorage alone as proof of admin access.
  // Respect password reset and auth callbacks, which have a separate lifecycle.
  if(passwordRecoveryActive||routeHash()==='reset-password'||routeHash()==='special-consent'||hasAuthCallback())return;
  try{
    const session=await DDB.session();
    if(!session?.user){sessionStorage.removeItem('ddbraids_admin_session');return;}
    if(!await DDB.isAdmin()){sessionStorage.removeItem('ddbraids_admin_session');return;}
    sessionStorage.setItem('ddbraids_admin_session','1');
    await syncAdminSnapshot();
    showAdmin();
  }catch(error){
    console.error('Não foi possível restaurar a sessão administrativa:',error);
  }
}

function pendingCounts(){
  const db=getState(), tasks=(db.operationalTasks||[]).filter(t=>!t.resolvedAt);
  const requests=db.appointments.filter(isRequest).length;
  const bookings=tasks.filter(t=>['cancelled_slot','reschedule'].includes(t.type)).length;
  const finance=db.appointments.filter(isRefundPending).length + db.appointments.filter(a=>isConfirmed(a)&&!a.paid).length;
  const clients=db.appointments.filter(a=>isRequest(a)&&!a.anamnesisReviewed&&['pending_review','non_recommended','acknowledged'].includes(a.status)).length;
  return {overview:requests+bookings+finance,requests,bookings,finance,clients};
}
function renderAdminNav(){
  const counts=pendingCounts();
  $('#adminNav').innerHTML=modules.map(([id,icon,label])=>`<button class="nav-item ${currentModule===id?'active':''}" data-module="${id}"><span class="nav-icon">${icon}</span><span class="nav-label">${label}</span>${counts[id]?`<span class="nav-badge">${counts[id]}</span>`:''}</button>`).join('');
  $$('#adminNav [data-module]').forEach(b=>b.onclick=()=>openModule(b.dataset.module));
}
function openModule(id){ currentModule=id; renderAdminNav(); const label=modules.find(m=>m[0]===id)?.[2]||id; $('#adminTopTitle').textContent=label;$('#moduleTitle').textContent=label; renderModule(); $('#adminSidebar').classList.remove('mobile-open'); }
function refreshAdmin(){ if(!$('#adminRoot').classList.contains('hidden'))renderModule(); }

function renderModule(){
  renderAdminNav();
  const map={overview:renderOverview,requests:renderRequests,bookings:renderBookings,clients:renderClients,catalog:renderCatalogAdmin,finance:renderFinance,professionals:renderProfessionals,posts:renderPosts,history:renderHistory,settings:renderSettings,workflows:()=>'<div id="rc7Admin"></div>'};
  $('#moduleBody').innerHTML=map[currentModule]?.()||'';
  bindModule(currentModule);
  if(currentModule==='workflows'){
    // Cancellation/refund tasks can change from the customer's portal.
    // Refresh the admin snapshot when opening Pending items, without requiring a reload.
    const root=$('#rc7Admin');
    if(root)root.innerHTML='<section class="glass panel">Atualizando cancelamentos e pendências…</section>';
    syncAdminSnapshot().then(()=>{
      if(currentModule!=='workflows'||$('#rc7Admin')!==root)return;
      renderAdminNav();
      window.DDBraidsRC7?.renderAdmin(getState(),requireSensitiveOperator,async(refreshPublic=false)=>{
        await syncAdminSnapshot();
        if(refreshPublic)await bootstrapBackendPublic();
        renderModule();
      });
    }).catch(e=>{
      console.error('Não foi possível atualizar as pendências:',e);
      if(root)root.innerHTML='<section class="glass panel"><h2>Não foi possível atualizar as pendências</h2><p class="muted">Tente novamente em instantes.</p></section>';
    });
  }
}

function metrics(){
  const db=getState(), today=todayISO(), pending=db.appointments.filter(isRequest).length, todayAppts=db.appointments.filter(a=>isConfirmed(a)&&a.date===today).length, unpaid=db.appointments.filter(a=>isConfirmed(a)&&!a.paid).length, refunds=db.appointments.filter(isRefundPending).length;
  return {pending,todayAppts,unpaid,refunds};
}
function renderOverview(){
  const db=getState(), m=metrics(), today=todayISO(), todays=db.appointments.filter(a=>isConfirmed(a)&&a.date===today), received=todays.reduce((s,a)=>s+paymentReceived(a),0);
  const byPro=db.professionals.filter(p=>p.active).map(p=>{const rows=todays.filter(a=>a.professionalId===p.id);return `<section class="pro-day"><h3>${esc(p.name)}</h3>${rows.map(a=>`<div class="mini-appt"><b>${esc(a.time||a.period||'Dia inteiro')}</b><span>${esc(a.clientName)} • ${esc(procedureName(a))}</span></div>`).join('')||`<p class="muted">Nenhum atendimento hoje.</p>`}</section>`}).join('');
  const payPending=db.appointments.filter(a=>isConfirmed(a)&&!a.paid).slice(0,8);
  const refundPending=db.appointments.filter(isRefundPending).slice(0,8), freed=(db.operationalTasks||[]).filter(t=>!t.resolvedAt&&t.type==='cancelled_slot').slice(0,8);
  return `<div class="metrics"><div class="metric glass"><span>Novas solicitações</span><strong>${m.pending}</strong></div><div class="metric glass"><span>Atendimentos hoje</span><strong>${m.todayAppts}</strong></div><div class="metric glass"><span>Pagamentos pendentes</span><strong>${m.unpaid}</strong></div><div class="metric glass"><span>Reembolsos pendentes</span><strong>${m.refunds}</strong></div></div><div class="dashboard-grid"><div class="glass admin-list"><h2>Agendamentos de hoje</h2>${byPro||`<p class="empty-state">Cadastre profissionais para começar.</p>`}</div><div class="glass admin-list"><h2>Financeiro do dia</h2><div class="big-money">${money(received)}</div><p class="muted">Sinais e pagamentos registrados hoje.</p><button class="btn" data-go="finance">Abrir Financeiro</button><h3>Pagamentos pendentes</h3>${payPending.map(a=>compactRow(a,'Registrar pagamento','data-pay')).join('')||`<p class="muted">Nenhum.</p>`}<h3>Reembolsos pendentes</h3>${refundPending.map(a=>compactRow(a,'Marcar reembolsado','data-refund')).join('')||`<p class="muted">Nenhum.</p>`}<h3>Cancelamentos / vagas liberadas</h3>${freed.map(t=>`<div class="action-alert"><b>${esc(t.clientName||'Cancelamento recente')}</b><span>${fmtDate(t.date)} • ${esc(getProfessional(t.professionalId)?.name||'')} • Vaga liberada</span><div class="actions"><button class="btn small gold" data-overview-offer="${t.id}">Oferecer vaga</button><button class="btn small" data-overview-resolve="${t.id}">Encerrar</button></div></div>`).join('')||`<p class="muted">Nenhum.</p>`}</div></div>`;
}
function compactRow(a,button,attr){return `<div class="row compact"><div><b>${esc(a.clientName)}</b><span>${esc(procedureName(a))} • ${money(attr==='data-pay'?balanceAmount(a):a.bookingFeeAmount)}</span></div><button class="btn small" ${attr}="${a.id}">${button}</button></div>`;}

function renderRequests(){
  const list=getState().appointments.filter(isRequest).sort((a,b)=>b.createdAt-a.createdAt);
  return `<div class="glass admin-list"><div class="between"><div><h2>Solicitações</h2><p class="muted">Somente atendimentos ainda não confirmados.</p></div><input class="field compact-search" id="requestSearch" placeholder="Buscar cliente..."></div><div id="requestRows">${list.map(requestRow).join('')||`<p class="empty-state">Nenhuma solicitação pendente.</p>`}</div></div>`;
}
function requestRow(a){
  const pro=getProfessional(a.professionalId); let actions='';
  if(a.status==='awaiting_fee') actions=`<button class="btn gold" data-send-fee="${a.id}">Enviar cobrança</button>`;
  if(a.status==='fee_sent') actions=`<button class="btn gold" data-fee-received="${a.id}">Confirmar sinal recebido</button>`;
  if(['pending_review','acknowledged'].includes(a.status)&&!a.anamnesisId) actions='<span class="muted">Ficha capilar pendente: solicitar à cliente que entre em Meus agendamentos e complete a anamnese.</span>';
  else if(['pending_review','acknowledged'].includes(a.status)) actions=`<button class="btn" data-review-anam="${a.id}">Revisar anamnese</button>${a.anamnesisReviewed?`<button class="btn gold" data-confirm-request="${a.id}">Confirmar atendimento</button>`:''}<button class="btn" data-nonrecommend="${a.id}">Notificar não recomendação</button>`;
  if(a.status==='non_recommended') actions=`<button class="btn" data-review-anam="${a.id}">Ver anamnese</button><span class="muted">Aguardando ciência da cliente.</span>`;
  if(a.status==='reschedule_requested') actions=`<button class="btn gold" data-reschedule="${a.id}">Remarcar</button>`;
  return `<article class="request-card" data-search="${esc((a.clientName+' '+procedureName(a)).toLowerCase())}"><div class="between"><div><b>${esc(a.clientName)}</b><span>${esc(procedureName(a))} • ${esc(pro?.name||'')} • ${fmtDate(a.date)}</span></div><span class="status ${a.status}">${esc(statusLabel(a))}</span></div><div class="request-actions">${actions}<button class="btn danger" data-cancel="${a.id}">Cancelar</button></div></article>`;
}

function dayState(proId,date){
  const db=getState(), pros=(proId==='all'?db.professionals.filter(p=>p.active&&p.bookable):db.professionals.filter(p=>p.id===proId));
  if(!pros.length)return 'off';
  const states=pros.map(p=>{
    const av=availabilityFor(p.id), wd=new Date(`${date}T12:00:00`).getDay();
    if(!av.weekdays.includes(wd)||(av.blocks||[]).some(b=>b.date===date))return 'off';
    const ap=db.appointments.filter(a=>isConfirmed(a)&&a.professionalId===p.id&&a.date===date);
    if(ap.some(a=>a.fullDay))return 'full';
    if(!ap.length)return 'available';
    return ap.length>=3?'full':'partial';
  });
  if(states.includes('available'))return states.some(x=>x==='partial'||x==='full')?'partial':'available';
  if(states.includes('partial'))return 'partial';
  if(states.every(x=>x==='off'))return 'off';
  return 'full';
}
function renderBookings(){
  const db=getState(), monthName=new Date(agendaYear,agendaMonth,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'}), first=new Date(agendaYear,agendaMonth,1), days=new Date(agendaYear,agendaMonth+1,0).getDate(), offset=(first.getDay()+6)%7,cells=[];
  for(let i=0;i<offset;i++)cells.push('<span class="day empty"></span>');
  for(let d=1;d<=days;d++){const iso=`${agendaYear}-${String(agendaMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,count=db.appointments.filter(a=>isConfirmed(a)&&a.date===iso&&(agendaPro==='all'||a.professionalId===agendaPro)).length,state=dayState(agendaPro,iso);cells.push(`<button class="day agenda-state ${state} ${agendaDate===iso?'selected':''} ${iso===todayISO()?'today':''}" data-agenda-date="${iso}">${d}${count?`<i class="count">${count}</i>`:''}</button>`);}
  const list=db.appointments.filter(a=>isConfirmed(a)&&a.date===agendaDate&&(agendaPro==='all'||a.professionalId===agendaPro)).sort((a,b)=>String(a.time||a.period).localeCompare(String(b.time||b.period)));
  const cancelled=(db.operationalTasks||[]).filter(t=>!t.resolvedAt&&t.type==='cancelled_slot'&&t.date===agendaDate&&(agendaPro==='all'||t.professionalId===agendaPro));
  return `<div class="agenda-layout"><section class="glass admin-calendar"><div class="calendar-head"><button class="btn" data-agenda-nav="prev">‹</button><h2>${monthName}</h2><button class="btn" data-agenda-nav="next">›</button></div><div class="weekday"><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span></div><div class="calgrid">${cells.join('')}</div><div class="calendar-legend"><span><i class="legend-dot available"></i>Disponível</span><span><i class="legend-dot partial"></i>Parcial</span><span><i class="legend-dot full"></i>Lotado/bloqueado</span><span><i class="legend-dot off"></i>Não trabalha</span></div><div class="calendar-tools"><button class="btn" data-agenda-today>Hoje</button><select id="agendaProFilter"><option value="all">Todas as profissionais</option>${db.professionals.filter(p=>p.active&&p.bookable).map(p=>`<option value="${p.id}" ${agendaPro===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div></section><section class="glass admin-list day-details"><div class="between"><div><h2>${fmtDate(agendaDate)}</h2><p class="muted">Agenda confirmada do dia.</p></div><button class="btn gold" data-manual-appointment>Novo agendamento</button></div>${cancelled.map(t=>`<div class="action-alert"><b>Vaga liberada por cancelamento</b><span>${esc(t.clientName||'Cliente')} • ${esc(getProfessional(t.professionalId)?.name||'')} • ${esc(t.time||'')}</span><div class="actions"><button class="btn small gold" data-offer-slot="${t.id}">Oferecer vaga</button><button class="btn small" data-resolve-slot="${t.id}">Bloquear/encerrar vaga</button></div></div>`).join('')}${list.map(bookingRow).join('')||`<p class="empty-state">Nenhum agendamento confirmado nesta data.</p>`}<hr><h3>Disponibilidade e bloqueios</h3><div class="actions"><button class="btn" data-offer-open-slot>Oferecer vaga</button><button class="btn" data-block-date>Bloquear esta data</button><button class="btn" data-edit-hours>Editar horários da profissional</button></div></section></div>`;
}
function bookingRow(a){return `<div class="row"><div><b>${esc(a.time||a.period||'Dia inteiro')} — ${esc(a.clientName)}</b><span>${esc(procedureName(a))} • ${esc(getProfessional(a.professionalId)?.name||'')} • ${a.paid?'Pago':'Pagamento pendente'}</span></div><div class="actions"><button class="btn small" data-edit-booking="${a.id}">Detalhes</button><button class="btn small" data-reschedule="${a.id}">Remarcar</button><a class="btn small" href="${waLink(a.phone,buildMessage('reminder',a))}" data-reminder="${a.id}" target="_blank">Enviar lembrete</a>${!a.paid?`<button class="btn small gold" data-pay="${a.id}">Registrar pagamento</button>`:''}<button class="btn small danger" data-cancel="${a.id}">Cancelar</button></div></div>`;}

function renderClients(){
  const db=getState(), map=new Map();
  for(const a of db.appointments){const key=(a.phone||'').replace(/\D/g,'');if(!key)continue;const x=map.get(key)||{name:a.clientName,phone:a.phone,email:a.email,appointments:[]};x.appointments.push(a);map.set(key,x);}
  const list=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
  return `<div class="glass admin-list"><input class="field" id="clientSearch" placeholder="Buscar cliente ou WhatsApp"><div id="clientRows">${list.map(c=>`<div class="row client-row" data-search="${esc((c.name+' '+c.phone).toLowerCase())}"><div><b>${esc(c.name)}</b><span>${esc(c.phone)} • ${c.appointments.length} registro(s)</span></div><button class="btn" data-client="${esc(c.phone)}">Abrir perfil</button></div>`).join('')||`<p class="empty-state">Nenhum cliente ainda.</p>`}</div></div>`;
}

function renderCatalogAdmin(){
  const db=getState(); return `<div class="catalog-admin-grid"><section class="glass admin-list"><div class="between"><div><h2>Procedimentos</h2><p class="muted">Métodos, variações e obrigatoriedade são configurados aqui.</p></div><button class="btn gold" data-new-procedure>Novo procedimento</button></div>${db.procedures.map(p=>`<div class="row"><img class="uploadpreview" src="${imageAttr(p.image)}" alt=""><div><b>${esc(p.name)}</b><span>${esc(p.category)} • ${money(p.price)} • ${p.active?'Ativo':'Inativo'}</span></div><button class="btn small" data-edit-procedure="${p.id}">Editar</button><button class="btn small" data-methods="${p.id}">Métodos</button></div>`).join('')||`<p class="empty-state">Nenhum procedimento cadastrado.</p>`}</section><section class="glass admin-list"><h2>Materiais</h2><button class="btn gold" data-new-material>Novo material</button>${db.materials.map(m=>`<div class="row"><img class="uploadpreview" src="${imageAttr(m.image)}" alt=""><div><b>${esc(m.name)}</b><span>${esc((m.colors||[]).join(', '))}</span></div><button class="btn small" data-edit-material="${m.id}">Editar</button></div>`).join('')}<hr><h2>Acessórios</h2><button class="btn gold" data-new-accessory>Novo acessório</button>${db.accessories.map(a=>`<div class="row"><img class="uploadpreview" src="${imageAttr(a.image)}" alt=""><div><b>${esc(a.name)}</b><span>${money(a.price)}</span></div><button class="btn small" data-edit-accessory="${a.id}">Editar</button></div>`).join('')}</section></div>`;
}

// Registro financeiro agrupado pela data civil da D&D (Brasil), não pela data UTC.
function financeDayISO(timestamp){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'})
    .format(new Date(timestamp));
}
function financeEvents(){
  const db=getState(), out=[];
  for(const a of db.appointments){
    if(a.bookingFeePaid&&a.bookingFeePaidAt)out.push({date:financeDayISO(a.bookingFeePaidAt),at:a.bookingFeePaidAt,type:'signal',amount:Number(a.bookingFeeAmount||0),a});
    if(a.paid&&a.paidAt)out.push({date:financeDayISO(a.paidAt),at:a.paidAt,type:'final',amount:Number(a.finalPaymentAmount||balanceAmount(a)),a});
    if(a.refundStatus==='refunded'&&a.refundedAt)out.push({date:financeDayISO(a.refundedAt),at:a.refundedAt,type:'refund',amount:-Number(a.bookingFeeAmount||0),a});
  }
  return out;
}
function financeRange(){
  if(financeFrom&&financeTo)return [financeFrom,financeTo];
  const from=`${financeYear}-${String(financeMonth+1).padStart(2,'0')}-01`, last=new Date(financeYear,financeMonth+1,0).getDate();
  return [from,`${financeYear}-${String(financeMonth+1).padStart(2,'0')}-${String(last).padStart(2,'0')}`];
}
function financePeriodData(){
  const db=getState(),[from,to]=financeRange(), proOk=a=>financePro==='all'||a.professionalId===financePro;
  if(financeMode==='cashflow'){
    const events=financeEvents().filter(e=>e.date>=from&&e.date<=to&&proOk(e.a));
    return {events,appointments:[...new Set(events.map(e=>e.a))],total:events.reduce((s,e)=>s+e.amount,0),from,to};
  }
  const appointments=db.appointments.filter(a=>['confirmed','completed'].includes(a.status)&&a.date>=from&&a.date<=to&&proOk(a));
  return {events:[],appointments,total:appointments.reduce((s,a)=>s+Number(a.price||0),0),from,to};
}
function financeDayTotal(iso){
  if(financeMode==='cashflow')return financeEvents().filter(e=>e.date===iso&&(financePro==='all'||e.a.professionalId===financePro)).reduce((s,e)=>s+e.amount,0);
  return getState().appointments.filter(a=>['confirmed','completed'].includes(a.status)&&a.date===iso&&(financePro==='all'||a.professionalId===financePro)).reduce((s,a)=>s+Number(a.price||0),0);
}
function renderFinance(){
  const db=getState(), data=financePeriodData(), list=data.appointments, received=list.reduce((s,a)=>s+paymentReceived(a),0),open=list.reduce((s,a)=>s+paymentOpen(a),0),signals=data.events.filter(e=>e.type==='signal').reduce((s,e)=>s+e.amount,0),refunds=data.events.filter(e=>e.type==='refund').reduce((s,e)=>s+Math.abs(e.amount),0), methods=paymentTotals(list), monthName=new Date(financeYear,financeMonth,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'}),first=new Date(financeYear,financeMonth,1),days=new Date(financeYear,financeMonth+1,0).getDate(),offset=(first.getDay()+6)%7,cells=[];
  for(let i=0;i<offset;i++)cells.push('<span class="day empty"></span>');
  for(let d=1;d<=days;d++){const iso=`${financeYear}-${String(financeMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,v=financeDayTotal(iso);cells.push(`<button class="day finance-day ${financeDate===iso?'selected':''}" data-fin-date="${iso}"><b>${d}</b>${v?`<small>${money(v)}</small>`:''}</button>`)}
  const dayRows=financeMode==='cashflow'?financeEvents().filter(e=>e.date===financeDate&&(financePro==='all'||e.a.professionalId===financePro)).sort((a,b)=>b.at-a.at):db.appointments.filter(a=>['confirmed','completed'].includes(a.status)&&a.date===financeDate&&(financePro==='all'||a.professionalId===financePro));
  const details=financeMode==='cashflow'?dayRows.map(e=>`<div class="row"><div><b>${e.type==='signal'?'Sinal':e.type==='refund'?'Reembolso':'Pagamento final'} — ${esc(e.a.clientName)}</b><span>${esc(procedureName(e.a))} • ${esc(getProfessional(e.a.professionalId)?.name||'')}</span></div><strong class="${e.amount<0?'negative':''}">${e.amount<0?'- ':''}${money(Math.abs(e.amount))}</strong></div>`).join(''):dayRows.map(a=>`<div class="row"><div><b>${esc(a.clientName)} — ${esc(procedureName(a))}</b><span>${esc(getProfessional(a.professionalId)?.name||'')} • ${a.status==='completed'?'Finalizado':'Confirmado'}</span></div><strong>${money(a.price||0)}</strong></div>`).join('');
  return `<section class="glass admin-list finance-history"><div class="between"><div><h2>Histórico financeiro</h2><p class="muted">Consulte por dinheiro movimentado ou por data dos atendimentos.</p></div><div class="actions"><label class="toggle-option compact-toggle"><input id="financePrintDetails" type="checkbox"><span>Incluir detalhamento</span></label><button class="btn" data-print-day>Imprimir este dia</button><button class="btn gold" data-print-period>Imprimir relatório</button></div></div><div class="finance-controls"><div class="segmented"><button class="btn ${financeMode==='cashflow'?'gold':''}" data-fin-mode="cashflow">Movimentações financeiras</button><button class="btn ${financeMode==='services'?'gold':''}" data-fin-mode="services">Atendimentos</button></div><select id="financePro"><option value="all">Todas as profissionais</option>${db.professionals.filter(p=>p.active).map(p=>`<option value="${p.id}" ${financePro===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select><label>De<input id="financeFrom" type="date" value="${financeFrom}"></label><label>Até<input id="financeTo" type="date" value="${financeTo}"></label><button class="btn" data-fin-clear-range>Mês inteiro</button></div><div class="finance-calendar-layout"><div><div class="calendar-head"><button class="btn" data-fin-nav="prev">‹</button><h2>${monthName}</h2><button class="btn" data-fin-nav="next">›</button></div><div class="weekday"><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span></div><div class="calgrid">${cells.join('')}</div></div><div class="finance-day-detail"><h3>${fmtDate(financeDate)}</h3>${details||'<p class="empty-state">Nenhuma movimentação nesta data.</p>'}</div></div></section><div class="metrics finance-metrics"><div class="metric glass"><span>${financeMode==='cashflow'?'Saldo movimentado':'Valor dos atendimentos'}</span><strong>${money(data.total)}</strong></div><div class="metric glass"><span>Recebido nos registros</span><strong>${money(received)}</strong></div><div class="metric glass"><span>Em aberto</span><strong>${money(open)}</strong></div><div class="metric glass"><span>Sinais no período</span><strong>${money(signals)}</strong></div><div class="metric glass"><span>Reembolsos no período</span><strong>${money(refunds)}</strong></div><div class="metric glass"><span>Dinheiro</span><strong>${money(methods.cash)}</strong></div><div class="metric glass"><span>PIX atendimento</span><strong>${money(methods.pix)}</strong></div><div class="metric glass"><span>Cartões</span><strong>${money(methods.debit+methods.credit)}</strong></div></div><section class="glass admin-list fee-config-panel"><div class="between fee-config-title"><div><h2>Sinal por procedimento</h2><p class="muted">Cada procedimento possui sua própria regra.</p></div><button class="btn gold" data-go="catalog">+ Novo procedimento</button></div><div class="fee-filters"><input class="field" id="feeSearch" placeholder="Buscar procedimento"><select id="feeCategory"><option value="all">Todas as categorias</option>${[...new Set(db.procedures.filter(p=>p.special!=='maintenance').map(p=>p.category).filter(Boolean))].map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select></div><div class="fee-table"><div class="fee-head"><span>Procedimento</span><span>Tipo de sinal</span><span>Valor</span><span></span></div>${db.procedures.filter(p=>p.special!=='maintenance').map(p=>feeRow(p)).join('')||`<p class="empty-state">Cadastre procedimentos no Catálogo.</p>`}</div></section><section class="glass admin-list"><h2>Valores por profissional</h2>${db.professionals.map(p=>`<div class="row"><div><b>${esc(p.name)}</b><span>Detalhamento individual ${p.pinConfigured?'protegido por PIN':'sem PIN configurado'}.</span></div><button class="btn small" data-pro-finance="${p.id}">Ver valores</button></div>`).join('')}</section>`;
}
function printFinance(dayOnly=false){
  const db=getState(), data=financePeriodData(), from=dayOnly?financeDate:data.from,to=dayOnly?financeDate:data.to, pro=financePro==='all'?'Todas as profissionais':getProfessional(financePro)?.name||'', rows=[], includeDetails=dayOnly||!!$('#financePrintDetails')?.checked;
  if(financeMode==='cashflow')for(const e of financeEvents().filter(e=>e.date>=from&&e.date<=to&&(financePro==='all'||e.a.professionalId===financePro)))rows.push([e.date,e.type==='signal'?'Sinal':e.type==='refund'?'Reembolso':'Pagamento final',e.a.clientName,procedureName(e.a),getProfessional(e.a.professionalId)?.name||'',e.amount]);
  else for(const a of db.appointments.filter(a=>['confirmed','completed'].includes(a.status)&&a.date>=from&&a.date<=to&&(financePro==='all'||a.professionalId===financePro)))rows.push([a.date,'Atendimento',a.clientName,procedureName(a),getProfessional(a.professionalId)?.name||'',Number(a.price||0)]);
  const total=rows.reduce((s,r)=>s+r[5],0), w=window.open('','_blank'); if(!w)return notify('O navegador bloqueou a janela de impressão.');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório D&D Braids</title><style>body{font:14px Arial;padding:28px;color:#111}h1{margin:0}small{color:#666}section{margin:22px 0;padding:14px;border:1px solid #ddd;border-radius:10px}.summary{display:flex;gap:30px}.summary b{font-size:22px}table{width:100%;border-collapse:collapse;margin-top:15px}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}td:last-child,th:last-child{text-align:right}@media print{button{display:none}}</style></head><body><h1>D&D Braids Beauty</h1><small>Relatório financeiro • ${fmtDate(from)} a ${fmtDate(to)} • ${esc(pro)}</small><section class="summary"><div><small>Visão</small><br><b>${financeMode==='cashflow'?'Movimentações financeiras':'Atendimentos'}</b></div><div><small>Total líquido</small><br><b>${money(total)}</b></div><div><small>Registros</small><br><b>${rows.length}</b></div></section><button onclick="window.print()">Imprimir / Salvar PDF</button>${includeDetails?`<h2>Detalhamento</h2><table><thead><tr><th>Data</th><th>Tipo</th><th>Cliente</th><th>Procedimento</th><th>Profissional</th><th>Valor</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${fmtDate(r[0])}</td><td>${r[1]}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td>${esc(r[4])}</td><td>${r[5]<0?'- ':''}${money(Math.abs(r[5]))}</td></tr>`).join('')}</tbody></table>`:'<p><small>Relatório compacto. O detalhamento individual não foi incluído.</small></p>'}</body></html>`);w.document.close();
}

function feeRow(p){
  const f=p.fee||{type:'none',value:0};
  const mode=['none','fixed','percent'].includes(f.type)?f.type:'none';
  return `<div class="fee-row" data-fee-row="${esc(p.id)}" data-category="${esc(p.category||'')}">
    <div><b>${esc(p.name)}</b><span>${esc(p.category)}</span></div>
    <div class="fee-type-options">${[['none','Sem sinal'],['fixed','Valor fixo'],['percent','Porcentagem']].map(([v,l])=>`<label class="radio-option"><input type="radio" name="fee_${esc(p.id)}" value="${v}" data-fee-type ${mode===v?'checked':''}><span>${l}</span></label>`).join('')}</div>
    <div class="fee-value-wrap"><span>${mode==='percent'?'%':'R$'}</span><input type="number" min="0" step="0.01" inputmode="decimal" data-fee-value aria-label="Valor do sinal para ${esc(p.name)}" value="${Number(f.value||0)}" title="Digite um valor para selecionar automaticamente Valor fixo"></div>
    <button class="btn gold" data-save-fee="${esc(p.id)}">Salvar</button>
  </div>`;
}
function paymentTotals(list){const o={cash:0,pix:0,debit:0,credit:0};for(const a of list){if(!a.paid)continue;const v=Number(a.finalPaymentAmount||balanceAmount(a));if(a.paymentMethod==='cash')o.cash+=v;if(a.paymentMethod==='pix')o.pix+=v;if(a.paymentMethod==='debit'||(a.paymentMethod==='card'&&a.paymentCardType==='debit'))o.debit+=v;if(a.paymentMethod==='credit'||(a.paymentMethod==='card'&&a.paymentCardType==='credit'))o.credit+=v;}return o;}

function renderProfessionals(){const db=getState();return `<div class="glass admin-list"><div class="between"><div><h2>Profissionais e pessoas internas</h2><p class="muted">PIN é opcional e usado para ações sensíveis e valores individuais.</p></div><button class="btn gold" data-new-professional>Adicionar profissional</button></div>${db.professionals.map(p=>`<div class="row"><img class="uploadpreview" src="${imageAttr(p.image)}" alt=""><div><b>${esc(p.name)}</b><span>${p.bookable?'Disponível para agendamentos':'Acesso interno'} • ${p.active?'Ativa':'Desativada'}</span></div><button class="btn small" data-edit-professional="${p.id}">Editar</button></div>`).join('')||`<p class="empty-state">Nenhuma pessoa cadastrada.</p>`}</div>`;}

function renderPosts(){return `<div class="post-creator-layout"><section class="glass admin-list post-creator-controls"><div class="post-creator-head"><h2>Criador de Posts</h2><p class="muted">Gere artes locais sem IA.</p></div><div class="post-creator-fields"><label>Modelo<select id="postTemplate"><option value="watermark">Marca d'água</option><option value="frame">Moldura elegante</option><option value="beforeafter">Antes / Depois</option></select></label><label>Formato<select id="postFormat"><option value="feed">Feed 4:5</option><option value="story">Story 9:16</option><option value="square">Quadrado</option></select></label><label>Foto principal<input id="postPhoto1" type="file" accept="image/*"></label><label id="postPhoto2Wrap" class="hidden">Foto depois<input id="postPhoto2" type="file" accept="image/*"></label><label>Título<input id="postTitle" value="D&D Braids"></label></div><div class="before-after-controls"><div class="photo-control-card"><b>Foto 1</b><label>Zoom<input id="postZoom1" type="range" min="100" max="220" value="100"></label><label>Horizontal<input id="postX1" type="range" min="-100" max="100" value="0"></label><label>Vertical<input id="postY1" type="range" min="-100" max="100" value="0"></label><button class="btn compact" data-fit="1">Ver foto inteira</button></div><div class="photo-control-card hidden" id="postSecondControls"><b>Foto 2</b><label>Zoom<input id="postZoom2" type="range" min="100" max="220" value="100"></label><label>Horizontal<input id="postX2" type="range" min="-100" max="100" value="0"></label><label>Vertical<input id="postY2" type="range" min="-100" max="100" value="0"></label><button class="btn compact" data-fit="2">Ver foto inteira</button></div></div><div class="post-export-row"><button class="btn gold" data-export-post>Exportar PNG</button></div></section><section class="glass post-preview"><div class="post-canvas-wrap"><canvas id="postCanvas" width="1080" height="1350"></canvas><div id="postEmpty" class="post-empty"><b>Prévia</b><span>Envie uma foto para começar.</span></div></div></section></div>`;}

function renderHistory(){const db=getState();return `<div class="glass admin-list"><div class="between"><div><h2>Histórico de alterações</h2><p class="muted">Quem alterou, o que alterou e quando.</p></div><input id="historySearch" class="field compact-search" placeholder="Buscar"></div><div id="historyRows">${db.audits.map(x=>`<div class="row history-row" data-search="${esc((x.actor+' '+x.area+' '+x.action).toLowerCase())}"><div><b>${esc(x.actor)} — ${esc(x.action)}</b><span>${esc(x.area)} • ${new Date(x.at).toLocaleString('pt-BR')}</span></div></div>`).join('')||`<p class="empty-state">Nenhuma alteração registrada.</p>`}</div></div>`;}

function renderSettings(){const db=getState(),m=db.settings.messages;const sundays=db.settings.publicSundays||[];return `<div class="settings-grid"><section class="glass admin-list form"><h2>Segurança da conta</h2><p class="muted">Para trocar a senha do painel, confirme sua senha atual e escolha uma nova.</p><button class="btn" type="button" id="changeAdminPassword">Alterar minha senha</button><hr><h2>Regras gerais</h2><label>Cancelamento permitido até quantas horas antes<input id="cancelHours" type="number" min="0" value="${db.settings.cancelHours}"></label><label>Versão do consentimento padrão<input id="consentVersion" value="${esc(db.settings.consentVersion||'1.0')}"></label><label>Texto do consentimento padrão<textarea id="consentStandardText" placeholder="Configure o texto apresentado à cliente antes do envio da solicitação.">${esc(db.settings.consentStandardText||'')}</textarea></label>${(()=>{const mt=db.procedures.find(p=>p.special==='maintenance');return mt?`<fieldset><legend>Sinal da manutenção</legend><label class="toggle-option"><input id="maintenanceDepositInherit" type="checkbox" ${mt.fee?.inherit?'checked':''}><span>Herdar a regra de sinal do procedimento original</span></label><label>Regra própria<select id="maintenanceDepositMode"><option value="none" ${mt.fee?.type==='none'?'selected':''}>Sem sinal</option><option value="fixed" ${mt.fee?.type==='fixed'?'selected':''}>Valor fixo</option><option value="percent" ${mt.fee?.type==='percent'?'selected':''}>Percentual</option></select></label><label>Valor<input id="maintenanceDepositValue" type="number" min="0" step="0.01" value="${Number(mt.fee?.value||0)}"></label><button class="btn" type="button" data-save-maintenance-deposit>Salvar regra da manutenção</button></fieldset>`:'';})()}<div class="sunday-picker"><h3>Domingos abertos ao público</h3><p class="muted">Cadastre somente os domingos específicos em que as profissionais aceitarão solicitações públicas.</p><div class="actions"><input id="publicSundayDate" type="date"><button class="btn" type="button" data-add-sunday>Adicionar domingo</button></div><div class="sunday-list">${sundays.sort().map(d=>`<span class="sunday-chip">${fmtDate(d)} <button type="button" data-remove-sunday="${d}" aria-label="Remover">×</button></span>`).join('')||'<span class="muted">Nenhum domingo aberto.</span>'}</div></div><button class="btn gold" data-save-general>Salvar regras</button><h2>Imagem principal</h2>${uploadField('heroUpload','Imagem de destaque',db.media.hero||'')}<button class="btn gold" data-save-hero>Salvar imagem</button></section><section class="glass admin-list form"><h2>Mensagens de WhatsApp</h2>${Object.entries({fee:'Cobrança do sinal',confirm:'Confirmação',cancel:'Cancelamento',reschedule:'Remarcação',reminder:'Lembrete',opening:'Oferta de vaga',nonRecommended:'Não recomendação',refundCompleted:'Reembolso concluído'}).map(([k,l])=>`<label>${l}<textarea data-message="${k}">${esc(m[k]||'')}</textarea></label>`).join('')}<button class="btn gold" data-save-messages>Salvar mensagens</button></section></div>`;}
function bindModule(id){
  $$('[data-go]').forEach(b=>b.onclick=()=>openModule(b.dataset.go));
  $$('[data-pay]').forEach(b=>b.onclick=()=>openPayment(b.dataset.pay));
  $$('[data-refund]').forEach(b=>b.onclick=()=>markRefunded(b.dataset.refund));
  $$('[data-cancel]').forEach(b=>b.onclick=()=>cancelAppointment(b.dataset.cancel));
  if(id==='overview'){ $$('[data-overview-offer]').forEach(b=>b.onclick=()=>offerSlot(b.dataset.overviewOffer));$$('[data-overview-resolve]').forEach(b=>b.onclick=()=>resolveTask(b.dataset.overviewResolve,'Pendência encerrada')); }
  if(id==='requests') bindRequests();
  if(id==='bookings') bindBookings();
  if(id==='clients') bindClients();
  if(id==='catalog') bindCatalog();
  if(id==='finance') bindFinance();
  if(id==='professionals') bindProfessionals();
  if(id==='posts') bindPosts();
  if(id==='history') bindSearch('historySearch','.history-row');
  if(id==='settings') bindSettings();
}
function bindSearch(inputId,rowSel){const input=$(`#${inputId}`);if(!input)return;input.oninput=()=>{$$(rowSel).forEach(r=>r.classList.toggle('hidden',!r.dataset.search.includes(input.value.toLowerCase())))};}

function bindRequests(){
  bindSearch('requestSearch','.request-card');
  $$('[data-send-fee]').forEach(b=>b.onclick=()=>sendFee(b.dataset.sendFee));
  $$('[data-fee-received]').forEach(b=>b.onclick=()=>markFeeReceived(b.dataset.feeReceived));
  $$('[data-review-anam]').forEach(b=>b.onclick=()=>reviewAnamnesis(b.dataset.reviewAnam));
  $$('[data-confirm-request]').forEach(b=>b.onclick=()=>confirmRequest(b.dataset.confirmRequest));
  $$('[data-nonrecommend]').forEach(b=>b.onclick=()=>nonRecommend(b.dataset.nonrecommend));
  $$('[data-reschedule]').forEach(b=>b.onclick=()=>rescheduleAppointment(b.dataset.reschedule));
}
async function sendFee(id){const a=getState().appointments.find(x=>x.id===id),p=getProfessional(a?.professionalId);if(!a)return;if(!p?.pixKey)return notify('Cadastre a chave PIX da profissional antes de enviar a cobrança.','PIX não cadastrado');try{await DDB.markWhatsapp(a.id,'deposit_charge');await syncAdminSnapshot();window.open(waLink(a.phone,buildMessage('fee',a)),'_blank');renderModule();}catch(e){notify(e.message||'Não foi possível registrar o envio do sinal.');}}
async function markFeeReceived(id){const a=getState().appointments.find(x=>x.id===id);if(!a)return;requireSensitiveOperator('registrar sinal',async operatorId=>{try{await DDB.recordDeposit(a.id,a.bookingFeeAmount,'pix',operatorId);await syncAdminSnapshot();renderModule();notify('Sinal registrado. Agora revise a anamnese.');}catch(e){notify(e.message||'Não foi possível registrar o sinal.');}});}
function reviewAnamnesis(id){const db=getState(),a=db.appointments.find(x=>x.id===id),an=db.anamneses.find(x=>x.id===a?.anamnesisId);if(!a||!an)return notify('A cliente ainda precisa completar a ficha capilar pelo portal Meus agendamentos. Não confirme este atendimento antes da revisão.','Ficha pendente');const old=structuredClone(an);openModal(`Avaliação profissional — ${a.clientName}`,anamnesisEditForm(an),root=>{$('#saveAnam',root).onclick=async()=>{anamnesisFields.forEach(([k])=>{const el=$(`[name="${k}"]`,root);if(el)an[k]=el.value});an.heatUse=$$('[name="heatUse"]:checked',root).map(x=>x.value);an.problems=$$('[name="problems"]:checked',root).map(x=>x.value);const answers={hair_type:an.hairType,pattern:an.classification,natural_color:an.naturalColor,lightening_background:an.lighteningBackground,density:an.density,texture:an.texture,characteristic:an.characteristic,resistance:an.resistance,porosity:an.porosity,elasticity:an.elasticity,recent_chemistry:an.recentChemistry,chemistry_details:an.chemistryDetails,frequent_heat:an.heatUse,problems:an.problems,other_problems:an.otherProblems,professional_notes:an.professionalNotes};try{if(an.origin==='profile')await DDB.reviewHairProfile(a.id,answers);else await DDB.updateAnamnesis(an.id,answers,null);closeModal();await syncAdminSnapshot();renderModule();notify('Anamnese atualizada e revisão registrada.');}catch(e){notify(e.message||'Não foi possível atualizar a anamnese.');}};});}
function anamnesisEditForm(an){const val=k=>esc(an[k]||'');return `<div class="form-grid"><p class="muted">Revisão administrativa: a ficha original permanece preservada no histórico.</p><label>Tipo<input name="hairType" value="${val('hairType')}"></label><label>Classificação<input name="classification" value="${val('classification')}"></label><label>Cor natural<select name="naturalColor"><option></option>${['1 — Preto','2 — Castanho muito escuro','3 — Castanho escuro','4 — Castanho médio','5 — Castanho claro','6 — Loiro escuro','7 — Loiro médio','8 — Loiro claro','9 — Loiro muito claro','10 — Loiro claríssimo','Não identificado'].map(v=>`<option ${an.naturalColor===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Fundo/clareamento<select name="lighteningBackground"><option></option>${['Vermelho escuro','Vermelho','Vermelho-alaranjado','Alaranjado','Amarelo-alaranjado','Amarelo','Amarelo claro/pálido','Não se aplica / cabelo não clareado','Não identificado'].map(v=>`<option ${an.lighteningBackground===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Densidade<input name="density" value="${val('density')}"></label><label>Textura<input name="texture" value="${val('texture')}"></label><label>Característica<input name="characteristic" value="${val('characteristic')}"></label><label>Resistência<input name="resistance" value="${val('resistance')}"></label><label>Porosidade<input name="porosity" value="${val('porosity')}"></label><label>Elasticidade<input name="elasticity" value="${val('elasticity')}"></label><label>Química recente<input name="recentChemistry" value="${val('recentChemistry')}"></label><label>Detalhes da química<input name="chemistryDetails" value="${val('chemistryDetails')}"></label><fieldset><legend>Uso frequente</legend>${['Nenhum','Secador','Prancha','Modelador'].map(v=>`<label><input type="checkbox" name="heatUse" value="${v}" ${(an.heatUse||[]).includes(v)?'checked':''}> ${v}</label>`).join('')}</fieldset><fieldset><legend>Pontos informados/observados</legend>${['Nenhum','Queda','Seborreia/Caspa','Dermatite','Tricoptilose','Triconodose','Tricorrexis Nodosa','Tricotilomania','Pediculose'].map(v=>`<label><input type="checkbox" name="problems" value="${v}" ${(an.problems||[]).includes(v)?'checked':''}> ${v}</label>`).join('')}</fieldset><label>Outros pontos<textarea name="otherProblems">${val('otherProblems')}</textarea></label><label>Observação profissional<textarea name="professionalNotes">${val('professionalNotes')}</textarea></label></div><button class="btn gold" id="saveAnam">Salvar avaliação</button>`;}
function nonRecommend(id){const db=getState(),a=db.appointments.find(x=>x.id===id),an=db.anamneses.find(x=>x.id===a?.anamnesisId);if(!a||!an)return notify('A ficha capilar deste agendamento não foi localizada. Atualize a página e tente novamente.');const choices=anamnesisFields.filter(([k])=>an[k]).map(([k,l])=>`<label class="toggle-option"><input type="checkbox" data-reason value="${esc(l+': '+an[k])}"><span>${esc(l)}: ${esc(an[k])}</span></label>`).join('');openModal('Notificar não recomendação',`<p>Selecione exatamente os dados que são pontos de atenção.</p><div class="reason-list">${choices}</div><button class="btn gold" id="sendNonRec">Gerar mensagem e enviar</button>`,root=>{$('#sendNonRec',root).onclick=async()=>{const reasons=$$('[data-reason]:checked',root).map(x=>x.value);if(!reasons.length)return notify('Selecione ao menos um ponto de atenção.');try{const content=getState().settings.specificConsentText||'A profissional identificou pontos que precisam da sua ciência antes de prosseguir com o atendimento.';const result=await DDB.createNonRecommendationConsent(a.id,reasons,content,'1.0');const data=Array.isArray(result)?result[0]:result,token=data?.token;if(!token)throw new Error('Não foi possível gerar o link de ciência.');const link=`${location.origin}${location.pathname}#special-consent?token=${encodeURIComponent(token)}`;await syncAdminSnapshot();window.open(waLink(a.phone,buildMessage('nonRecommended',a,{reasons,link})),'_blank','noopener');closeModal();renderModule();}catch(e){console.error(e);notify(e.message||'Não foi possível gerar a ciência.');}};});}
function confirmRequest(id){
  const a=getState().appointments.find(x=>x.id===id);if(!a)return;
  if(a.bookingFeeAmount>0&&!a.bookingFeePaid)return notify('Confirme o recebimento do sinal antes.');
  if(!a.anamnesisReviewed)return notify('Revise a ficha de anamnese antes de confirmar.');
  if(dateBlocked(a.professionalId,a.date,a.fullDay,a.id))return notify('Essa data possui conflito na agenda da profissional.','Conflito de agenda');
  if(a.fullDay){return requireSensitiveOperator('confirmar manutenção',async operatorId=>{try{await DDB.confirmMaintenance(a.id,operatorId);await DDB.markWhatsapp(a.id,'confirmation',operatorId);await syncAdminSnapshot();window.open(waLink(a.phone,buildMessage('confirm',{...a,time:'dia inteiro'})),'_blank');renderModule();notify('Manutenção confirmada e dia bloqueado.');}catch(e){notify(e.message||'Não foi possível confirmar a manutenção.');}});}
  const p=getProcedure(a.procedureId), m=getMethod(p,a.methodId), v=getVariation(m,a.variationId), suggested=Number(v?.durationMinutes||m?.durationMinutes||p?.durationMinutes||0), av=availabilityFor(a.professionalId), defaultStart=a.time&&/^\d\d:\d\d$/.test(a.time)?a.time:(a.period==='Tarde'?'13:00':a.period==='Noite'?'19:00':av.start||'08:00'), defaultEnd=suggested?fromMinutes(toMinutes(defaultStart)+suggested):'';
  openModal('Confirmar horário do atendimento',`<p>Defina o horário que será enviado para <b>${esc(a.clientName)}</b>. A previsão de término bloqueia esse intervalo na agenda.</p><div class="form-grid"><label>Início *<input id="confirmStart" type="time" value="${defaultStart}"></label><label>Previsão de término *<input id="confirmEnd" type="time" value="${defaultEnd}"></label></div>${suggested?`<p class="muted">Duração interna sugerida: ${Math.round(suggested/60*10)/10} h. Você pode ajustar o término.</p>`:`<p class="muted">Este procedimento não possui duração interna definida. Informe obrigatoriamente a previsão de término.</p>`}<div id="confirmAvailability" class="availability-warning"></div><button class="btn gold" id="saveConfirmation">Confirmar e enviar WhatsApp</button>`,root=>{
    const start=$('#confirmStart',root),end=$('#confirmEnd',root),warning=$('#confirmAvailability',root);let lastStart=defaultStart;
    const syncSuggested=()=>{if(suggested&&(!end.value||end.value===fromMinutes(toMinutes(lastStart)+suggested)))end.value=fromMinutes(toMinutes(start.value)+suggested);lastStart=start.value;check();};
    const check=()=>{const conflict=timeConflict(a.professionalId,a.date,start.value,end.value,a.id);const outside=toMinutes(start.value)<toMinutes(av.start)||toMinutes(end.value)>toMinutes(av.end);warning.innerHTML=conflict?`<b>⚠ Conflito:</b> ${esc(conflict.clientName)} ocupa aproximadamente ${esc(conflict.time||'')}–${esc(conflict.endTime||'horário não informado')}.`:outside?`<b>⚠ Fora do horário padrão.</b> A profissional ainda pode confirmar manualmente esta exceção.`:`<b>✓ Horário disponível.</b>`;warning.className=`availability-warning ${conflict?'danger':outside?'warn':'ok'}`;return !conflict;};
    start.oninput=syncSuggested;end.oninput=check;check();
    $('#saveConfirmation',root).onclick=async()=>{if(!start.value||!end.value)return notify('Informe início e previsão de término.');if(toMinutes(end.value)<=toMinutes(start.value))return notify('O término precisa ser depois do início.');if(!check())return notify('Escolha outro horário antes de confirmar.','Conflito de agenda');const startIso=new Date(`${a.date}T${start.value}:00-03:00`).toISOString(),endIso=new Date(`${a.date}T${end.value}:00-03:00`).toISOString(),startTime=start.value,endTime=end.value;closeModal();requireSensitiveOperator('confirmar atendimento',async operatorId=>{try{await DDB.confirmAppointment(a.id,startIso,endIso,operatorId);await DDB.markWhatsapp(a.id,'confirmation',operatorId);await syncAdminSnapshot();window.open(waLink(a.phone,buildMessage('confirm',{...a,time:startTime,endTime})),'_blank');renderModule();}catch(e){notify(e.message||'Não foi possível confirmar o atendimento.');}});};
  });
}
function rescheduleAppointment(id){const a=getState().appointments.find(x=>x.id===id);if(!a)return;openModal('Remarcar atendimento',`<div class="form-grid"><label>Nova data<input id="resDate" type="date" value="${a.date}"></label><label>Início<input id="resTime" type="time" value="${esc(a.time||'')}"></label><label>Previsão de término<input id="resEnd" type="time" value="${esc(a.endTime||'')}"></label></div><button class="btn gold" id="saveReschedule">Salvar remarcação</button>`,root=>{$('#saveReschedule',root).onclick=async()=>{const date=$('#resDate',root).value,time=$('#resTime',root).value,endTime=$('#resEnd',root).value;if(!date||!time||!endTime)return notify('Informe data, início e previsão de término.');if(toMinutes(endTime)<=toMinutes(time))return notify('O término precisa ser depois do início.');const startIso=new Date(`${date}T${time}:00-03:00`).toISOString(),endIso=new Date(`${date}T${endTime}:00-03:00`).toISOString();closeModal();requireSensitiveOperator('remarcar atendimento',async operatorId=>{try{await DDB.rescheduleAppointment(a.id,startIso,endIso,operatorId);await DDB.markWhatsapp(a.id,'reschedule',operatorId);await syncAdminSnapshot();window.open(waLink(a.phone,buildMessage('reschedule',{...a,date,time,endTime})),'_blank');renderModule();}catch(e){notify(e.message||'Não foi possível remarcar.');}});};});}
function bindBookings(){
  $$('[data-agenda-date]').forEach(b=>b.onclick=()=>{agendaDate=b.dataset.agendaDate;renderModule();});
  $$('[data-agenda-nav]').forEach(b=>b.onclick=()=>{const d=new Date(agendaYear,agendaMonth+(b.dataset.agendaNav==='next'?1:-1),1);agendaYear=d.getFullYear();agendaMonth=d.getMonth();renderModule();});
  $('[data-agenda-today]')?.addEventListener('click',()=>{const d=new Date();agendaYear=d.getFullYear();agendaMonth=d.getMonth();agendaDate=todayISO();renderModule();});
  $('#agendaProFilter')?.addEventListener('change',e=>{agendaPro=e.target.value;renderModule();});
  $('[data-manual-appointment]')?.addEventListener('click',manualAppointment);
  $('[data-block-date]')?.addEventListener('click',blockDate);
  $('[data-edit-hours]')?.addEventListener('click',editHours);
  $$('[data-edit-booking]').forEach(b=>b.onclick=()=>editBooking(b.dataset.editBooking));
  $$('[data-reschedule]').forEach(b=>b.onclick=()=>rescheduleAppointment(b.dataset.reschedule));
  $$('[data-reminder]').forEach(b=>b.onclick=async()=>{const a=getState().appointments.find(x=>x.id===b.dataset.reminder);if(a){try{await DDB.markWhatsapp(a.id,'reminder');await syncAdminSnapshot();}catch(e){console.error(e);}}});
  $$('[data-offer-slot]').forEach(b=>b.onclick=()=>offerSlot(b.dataset.offerSlot));
  $$('[data-resolve-slot]').forEach(b=>b.onclick=()=>resolveTask(b.dataset.resolveSlot,'Vaga encerrada/bloqueada'));
  $('[data-offer-open-slot]')?.addEventListener('click',()=>offerSlot());
}
async function resolveTask(id,action){try{await DDB.resolveTask(id,action);await syncAdminSnapshot();renderModule();}catch(e){notify(e.message||'Não foi possível encerrar a pendência.');}}
function offerSlot(taskId=null){const db=getState(),task=(db.operationalTasks||[]).find(x=>x.id===taskId), clients=[...new Map(db.appointments.filter(a=>a.phone).map(a=>[a.phone,{name:a.clientName,phone:a.phone}])).values()];openModal('Oferecer vaga pelo WhatsApp',`<div class="form-grid"><label>Data<input id="offerDate" type="date" value="${task?.date||agendaDate}"></label><label>Horário/período<input id="offerTime" value="${esc(task?.time||'')}"></label><label>Profissional<select id="offerPro">${activeProfessionals().map(p=>`<option value="${p.id}" ${p.id===(task?.professionalId||agendaPro)?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label><label>Cliente<select id="offerClient"><option value="">Selecione</option>${clients.map(c=>`<option value="${esc(c.phone)}" data-name="${esc(c.name)}">${esc(c.name)} — ${esc(c.phone)}</option>`).join('')}</select></label></div><button class="btn gold" id="sendOffer">Enviar oferta pelo WhatsApp</button>`,root=>{$('#sendOffer',root).onclick=()=>{const sel=$('#offerClient',root),phone=sel.value;if(!phone)return notify('Selecione uma cliente.');const opt=sel.selectedOptions[0],a={clientName:opt.dataset.name||'',phone,professionalId:$('#offerPro',root).value,procedureId:'',date:$('#offerDate',root).value,time:$('#offerTime',root).value,period:$('#offerTime',root).value,price:0};let text=getState().settings.messages.opening||'';text=text.replaceAll('{cliente}',a.clientName).replaceAll('{profissional}',getProfessional(a.professionalId)?.name||'').replaceAll('{data}',fmtDate(a.date)).replaceAll('{horario}',a.time).replaceAll('{procedimento}','');window.open(waLink(phone,text),'_blank');if(task){task.resolvedAt=Date.now();task.resolutionAction='Vaga oferecida';}saveState();audit('Admin','Agendamentos','Oferta de vaga enviada',null,{date:a.date,professionalId:a.professionalId,client:a.clientName});closeModal();renderModule();};});}
function manualAppointment(){const db=getState();openModal('Novo agendamento manual',`<div class="form-grid"><label>Cliente<input id="manName"></label><label>WhatsApp<input id="manPhone"></label><label>Profissional<select id="manPro">${activeProfessionals().map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label><label>Procedimento<select id="manProc">${activeProcedures().filter(p=>p.special!=='maintenance').map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label><label>Data<input id="manDate" type="date" value="${agendaDate}"></label><label>Horário<input id="manTime" type="time"></label></div><button class="btn gold" id="saveManual">Criar agendamento</button>`,root=>{$('#saveManual',root).onclick=async()=>{const p=getProcedure($('#manProc',root).value),date=$('#manDate',root).value,time=$('#manTime',root).value;if(!date||!time)return notify('Informe data e horário.');const methodId=p.methods?.[0]?.id||null;try{await DDB.manualAppointment({professionalId:$('#manPro',root).value,serviceId:p.id,methodId,variationId:null,start:`${date}T${time}:00-03:00`,end:null,clientName:$('#manName',root).value,clientPhone:$('#manPhone',root).value,clientEmail:null});closeModal();await syncAdminSnapshot();renderModule();notify('Agendamento manual criado.');}catch(e){notify(e.message||'Não foi possível criar o agendamento.');}};});}
function blockDate(){const pros=activeProfessionals();openModal('Bloquear data',`<label>Profissional<select id="blockPro">${pros.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label><p>Data: <b>${fmtDate(agendaDate)}</b></p><button class="btn danger" id="saveBlock">Bloquear</button>`,root=>{$('#saveBlock',root).onclick=async()=>{const pro=$('#blockPro',root).value;try{await DDB.setDateException({professionalId:pro,date:agendaDate,available:false,start:null,end:null,maxAppointments:null,reason:'Bloqueio manual'});closeModal();await bootstrapBackendPublic();renderModule();notify('Data bloqueada.');}catch(e){notify(e.message||'Não foi possível bloquear a data.');}};});}
function editHours(){const pros=activeProfessionals();openModal('Horários da profissional',`<label>Profissional<select id="hoursPro">${pros.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label><div id="hoursFields"></div>`,root=>{const render=()=>{const id=$('#hoursPro',root).value,av=availabilityFor(id);$('#hoursFields',root).innerHTML=`<div class="form-grid"><label>Início<input id="hoursStart" type="time" value="${av.start}"></label><label>Fim<input id="hoursEnd" type="time" value="${av.end}"></label><label>Intervalo de segurança entre clientes (min)<input id="hoursBuffer" type="number" min="0" step="5" value="${Number(av.bufferMinutes||0)}"></label></div><fieldset><legend>Dias regulares de atendimento</legend><div class="checkgrid">${[['1','Seg'],['2','Ter'],['3','Qua'],['4','Qui'],['5','Sex'],['6','Sáb']].map(([n,l])=>`<label class="toggle-option"><input type="checkbox" data-weekday="${n}" ${av.weekdays.includes(Number(n))?'checked':''}><span>${l}</span></label>`).join('')}</div></fieldset><p class="muted">Domingos públicos são escolhidos por data em Configurações. Horários noturnos aparecem normalmente para a cliente quando fizerem parte da disponibilidade da profissional.</p><button class="btn gold" id="saveHours">Salvar horários</button>`;$('#saveHours',root).onclick=async()=>{const real=getState().availability[id]||(getState().availability[id]={weekdays:[1,2,3,4,5,6],blocks:[]});real.start=$('#hoursStart',root).value;real.end=$('#hoursEnd',root).value;real.bufferMinutes=Number($('#hoursBuffer',root).value||0);real.weekdays=$$('[data-weekday]:checked',root).map(x=>Number(x.dataset.weekday));try{await DDB.saveAvailability({professionalId:id,weekdays:real.weekdays,start:real.start,end:real.end,maxAppointments:null});saveState();audit('Admin','Agendamentos','Horários alterados',null,{id,start:real.start,end:real.end});closeModal();await syncAdminSnapshot();renderModule();}catch(e){notify(e.message||'Não foi possível salvar os horários.');}};};$('#hoursPro',root).onchange=render;render();});}
function adminRequirementRows(opts){return Object.entries(opts?.required||{}).map(([field_key,required])=>({field_key,required:!!required}));}
function adminScopes(values){const all=(values||[]).includes('*'),vals=all?getState().procedures.filter(p=>p.special!=='maintenance').map(p=>p.id):(values||[]);return vals.filter(v=>v&&v!=='*').map(v=>{const [service_id,method_id='',variation_id='']=String(v).split('/');return{service_id,method_id,variation_id};});}
function adminOptionRows(opts){const out=[];for(const name of (opts?.tags||[]))out.push({group:'Características',name,price_delta:0,requires_description:String(name).trim().toLowerCase()==='detalhada'});for(const name of (opts?.sizes||[]))out.push({group:'Tamanho',name,price_delta:0,requires_description:false});for(const name of (opts?.thicknesses||[]))out.push({group:'Espessura',name,price_delta:0,requires_description:false});return out;}
async function adminAsset(image,folder){
  // Local demo images are visual placeholders, not paths in the storage bucket.
  const value=String(image||'');
  if(value.startsWith('assets/demo/'))return null;
  return value.startsWith('data:')?DDB.uploadPublicAsset(value,folder):value||null;
}
async function adminCategoryId(name,currentId=null){const hit=(window.__ddbCategories||[]).find(c=>String(c.name).trim().toLowerCase()===String(name).trim().toLowerCase());if(hit)return hit.id;if(currentId){const cur=(window.__ddbCategories||[]).find(c=>c.id===currentId);if(cur&&cur.name===name)return currentId;}return DDB.saveCategory({name});}
function editProcedure(id){const db=getState(),p=id?getProcedure(id):{id:uid('proc'),name:'',category:'',price:0,image:'',active:true,maintenanceEligible:true,fee:{type:'none',value:0},options:{tags:[],sizes:[],thicknesses:[],required:{}},methods:[]};let image=p.image||'';openModal(id?'Editar procedimento':'Novo procedimento',`<form id="procForm" class="form"><label>Nome<input name="name" value="${esc(p.name)}" required></label><label>Categoria<input name="category" value="${esc(p.category)}" required></label><label>Preço base<input name="price" type="number" min="0" step="0.01" value="${Number(p.price||0)}"></label><label>Duração interna estimada (minutos)<input name="durationMinutes" type="number" min="0" step="15" value="${Number(p.durationMinutes||0)}" placeholder="Ex.: 240"></label>${uploadField('procImage','Imagem do procedimento',image)}${catalogOptionEditor('tags','Características disponíveis',p.options?.tags)}${catalogOptionEditor('sizes','Tamanhos',p.options?.sizes)}${catalogOptionEditor('thicknesses','Espessuras',p.options?.thicknesses)}${requirementFields(p.options||{})}<label class="toggle-option"><input name="active" type="checkbox" ${p.active?'checked':''}><span>Ativo</span></label><label class="toggle-option"><input name="maintenanceEligible" type="checkbox" ${p.maintenanceEligible?'checked':''}><span>Elegível para manutenção</span></label><p class="muted">O sinal é configurado em Financeiro → Sinal por procedimento.</p><button class="btn gold">Salvar procedimento</button></form>`,root=>{bindCatalogOptionEditors(root);bindUpload('procImage',()=>image,v=>image=v);$('#procForm',root).onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{const opts=optionsFromForm(f),categoryId=await adminCategoryId(f.get('category'),p.categoryId||null),imagePath=await adminAsset(image,'catalog/services'),serviceId=await DDB.saveService({id:id||null,categoryId,name:f.get('name'),description:p.description||'',imagePath,price:Number(f.get('price')||0),duration:Number(f.get('durationMinutes')||0)||null,active:f.has('active'),depositMode:p.fee?.type||'none',depositValue:Number(p.fee?.value||0),isMaintenance:p.special==='maintenance'});await DDB.replaceOptions(serviceId,null,null,adminOptionRows(opts));await DDB.replaceFieldRequirements(serviceId,null,null,adminRequirementRows(opts));closeModal();await bootstrapBackendPublic();renderModule();notify('Procedimento salvo.');}catch(err){console.error(err);notify(err.message||'Não foi possível salvar o procedimento.');}};});}
function editMethods(pid){const p=getProcedure(pid);openModal(`Métodos — ${p.name}`,`<button class="btn gold" id="newMethod">Novo método</button><div id="methodList">${(p.methods||[]).map(m=>`<div class="row"><div><b>${esc(m.name)}</b><span>${money(m.price??p.price)} • ${(m.variations||[]).length} variação(ões)</span></div><button class="btn small" data-edit-method="${m.id}">Editar</button><button class="btn small" data-vars="${m.id}">Variações</button></div>`).join('')||'<p class="empty-state">Nenhum método.</p>'}</div>`,root=>{$('#newMethod',root).onclick=()=>editMethod(pid);$$('[data-edit-method]',root).forEach(b=>b.onclick=()=>editMethod(pid,b.dataset.editMethod));$$('[data-vars]',root).forEach(b=>b.onclick=()=>editVariations(pid,b.dataset.vars));});}
function requirementFields(o){const r=o.required||{};return `<fieldset class="requirement-box"><legend>Obrigatório para continuar</legend><p class="muted">Grupos opcionais podem ficar sem escolha.</p><div class="checkgrid">${[['size','Tamanho'],['thickness','Espessura'],['material','Material'],['color','Cor'],['provider','Quem fornece o material'],['characteristics','Características']].map(([k,l])=>`<label class="toggle-option"><input name="req_${k}" type="checkbox" ${r[k]?'checked':''}><span>${l}</span></label>`).join('')}</div></fieldset>`;}
function catalogOptionRow(key,value){return `<div class="catalog-option-row" data-option-item><input name="opt_${key}" aria-label="Editar opção" maxlength="80" value="${esc(value)}"><button type="button" class="btn small" data-remove-option aria-label="Remover opção">Remover</button></div>`;}
function catalogOptionEditor(key,label,values=[]){
 return `<section class="catalog-option-editor" data-option-editor="${key}">
  <label class="catalog-option-title" for="option-new-${key}">${label}</label>
  <p class="muted catalog-option-hint">Adicione uma opção por vez. As opções já adicionadas podem ser editadas ou removidas.</p>
  <div class="catalog-option-add"><input id="option-new-${key}" name="draft_${key}" data-option-new maxlength="80" placeholder="Nova opção"><button type="button" class="btn" data-add-option>+ Adicionar</button></div>
  <div class="catalog-option-list" data-option-list>${(values||[]).map(value=>catalogOptionRow(key,value)).join('')}</div>
 </section>`;
}
function bindCatalogOptionEditors(root){
 $$('[data-option-editor]',root).forEach(editor=>{
  const key=editor.dataset.optionEditor,newInput=$('[data-option-new]',editor),list=$('[data-option-list]',editor);
  const add=()=>{
   const value=newInput.value.trim(); if(!value)return newInput.focus();
   if([...list.querySelectorAll('input')].some(input=>input.value.trim().toLocaleLowerCase('pt-BR')===value.toLocaleLowerCase('pt-BR'))){notify('Essa opção já foi adicionada.','Opção duplicada');return;}
   const container=document.createElement('div');container.innerHTML=catalogOptionRow(key,value);
   list.appendChild(container.firstElementChild);newInput.value='';newInput.focus();
  };
  $('[data-add-option]',editor).addEventListener('click',add);
  newInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();add();}});
  list.addEventListener('click',event=>{const remove=event.target.closest('[data-remove-option]');if(remove)remove.closest('[data-option-item]').remove();});
 });
}
function optionsFromForm(f){
 const collect=key=>{const values=[...f.getAll(`opt_${key}`),f.get(`draft_${key}`)],seen=new Set();return values.map(v=>String(v||'').trim()).filter(v=>{if(!v)return false;const k=v.toLocaleLowerCase('pt-BR');if(seen.has(k))return false;seen.add(k);return true;});};
 return {tags:collect('tags'),sizes:collect('sizes'),thicknesses:collect('thicknesses'),required:{size:f.has('req_size'),thickness:f.has('req_thickness'),material:f.has('req_material'),color:f.has('req_color'),provider:f.has('req_provider'),characteristics:f.has('req_characteristics')}};
}
function editMethod(pid,mid){const p=getProcedure(pid),m=mid?getMethod(p,mid):{id:uid('method'),name:'',price:p.price,image:'',active:true,descriptionRequired:false,options:{tags:[],sizes:[],thicknesses:[],required:{}},variations:[]};let image=m.image||'';openModal(mid?'Editar método':'Novo método',`<form id="methodForm" class="form"><label>Nome<input name="name" value="${esc(m.name)}" required></label><label>Preço<input name="price" type="number" value="${Number(m.price??p.price)}"></label><label>Duração interna estimada (minutos)<input name="durationMinutes" type="number" min="0" step="15" value="${Number(m.durationMinutes||0)}" placeholder="Herda do procedimento se vazio"></label>${uploadField('methodImage','Imagem do método',image)}${catalogOptionEditor('tags','Características disponíveis',m.options?.tags)}${catalogOptionEditor('sizes','Tamanhos',m.options?.sizes)}${catalogOptionEditor('thicknesses','Espessuras',m.options?.thicknesses)}${requirementFields(m.options||{})}<label class="toggle-option"><input name="descriptionRequired" type="checkbox" ${m.descriptionRequired?'checked':''}><span>Exigir descrição da cliente</span></label><button class="btn gold">Salvar</button></form>`,root=>{bindCatalogOptionEditors(root);bindUpload('methodImage',()=>image,v=>image=v);$('#methodForm',root).onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{const opts=optionsFromForm(f),imagePath=await adminAsset(image,'catalog/methods'),methodId=await DDB.saveMethod({id:mid||null,serviceId:pid,name:f.get('name'),description:m.description||'',imagePath,price:Number(f.get('price')||0),duration:Number(f.get('durationMinutes')||0)||null,active:true,descriptionRequired:f.has('descriptionRequired')});await DDB.replaceOptions(pid,methodId,null,adminOptionRows(opts));await DDB.replaceFieldRequirements(pid,methodId,null,adminRequirementRows(opts));closeModal();await bootstrapBackendPublic();editMethods(pid);}catch(err){console.error(err);notify(err.message||'Não foi possível salvar o método.');}};});}
function editVariations(pid,mid){const p=getProcedure(pid),m=getMethod(p,mid);openModal(`Variações — ${m.name}`,`<button class="btn gold" id="newVariation">Nova variação</button>${(m.variations||[]).map(v=>`<div class="row"><div><b>${esc(v.name)}</b></div><button class="btn small" data-edit-var="${v.id}">Editar</button></div>`).join('')||'<p class="empty-state">Nenhuma variação.</p>'}`,root=>{$('#newVariation',root).onclick=()=>editVariation(pid,mid);$$('[data-edit-var]',root).forEach(b=>b.onclick=()=>editVariation(pid,mid,b.dataset.editVar));});}
function editVariation(pid,mid,vid){const p=getProcedure(pid),m=getMethod(p,mid),v=vid?getVariation(m,vid):{id:uid('var'),name:'',image:'',active:true,descriptionRequired:false,options:{tags:[],sizes:[],thicknesses:[],required:{}}};let image=v.image||'';openModal(vid?'Editar variação':'Nova variação',`<form id="varForm" class="form"><label>Nome<input name="name" value="${esc(v.name)}" required></label><label>Duração interna estimada (minutos)<input name="durationMinutes" type="number" min="0" step="15" value="${Number(v.durationMinutes||0)}" placeholder="Herda do método/procedimento se vazio"></label>${uploadField('varImage','Imagem da variação',image)}${catalogOptionEditor('tags','Características disponíveis',v.options?.tags)}${catalogOptionEditor('sizes','Tamanhos',v.options?.sizes)}${catalogOptionEditor('thicknesses','Espessuras',v.options?.thicknesses)}${requirementFields(v.options||{})}<label class="toggle-option"><input name="descriptionRequired" type="checkbox" ${v.descriptionRequired?'checked':''}><span>Exigir descrição da cliente</span></label><button class="btn gold">Salvar</button></form>`,root=>{bindCatalogOptionEditors(root);bindUpload('varImage',()=>image,x=>image=x);$('#varForm',root).onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{const opts=optionsFromForm(f),imagePath=await adminAsset(image,'catalog/variations'),variationId=await DDB.saveVariation({id:vid||null,methodId:mid,name:f.get('name'),description:v.description||'',imagePath,price:v.price??null,duration:Number(f.get('durationMinutes')||0)||null,active:true,descriptionRequired:f.has('descriptionRequired')});await DDB.replaceOptions(pid,mid,variationId,adminOptionRows(opts));await DDB.replaceFieldRequirements(pid,mid,variationId,adminRequirementRows(opts));closeModal();await bootstrapBackendPublic();editVariations(pid,mid);}catch(err){console.error(err);notify(err.message||'Não foi possível salvar a variação.');}};});}
function compatSelector(selected=[]){const procs=getState().procedures.filter(p=>p.special!=='maintenance');const rows=[];for(const p of procs){rows.push(`<label class="toggle-option"><input type="checkbox" name="compat" value="${p.id}" ${selected.includes(p.id)?'checked':''}><span>${esc(p.category)} → ${esc(p.name)}</span></label>`);for(const m of (p.methods||[])){const mk=`${p.id}/${m.id}`;rows.push(`<label class="toggle-option compat-child"><input type="checkbox" name="compat" value="${mk}" ${selected.includes(mk)?'checked':''}><span>↳ ${esc(m.name)}</span></label>`);for(const v of (m.variations||[])){const vk=`${p.id}/${m.id}/${v.id}`;rows.push(`<label class="toggle-option compat-grandchild"><input type="checkbox" name="compat" value="${vk}" ${selected.includes(vk)?'checked':''}><span>↳↳ ${esc(v.name)}</span></label>`);}}}return `<fieldset><legend>Compatível com</legend><p class="muted">Selecione por nomes e hierarquia. IDs internos não aparecem para as profissionais.</p><div class="checkgrid compat-list"><label class="toggle-option"><input type="checkbox" name="compat" value="*" ${selected.includes('*')?'checked':''}><span>Todos os procedimentos</span></label>${rows.join('')}</div></fieldset>`;}
function materialOptionValues(form,key){
 const vals=[...form.getAll('opt_'+key),form.get('draft_'+key)];
 const unique=new Set();return vals.map(v=>String(v||'').trim()).filter(value=>{if(!value)return false;const k=value.toLocaleLowerCase('pt-BR');if(unique.has(k))return false;unique.add(k);return true;});
}
function materialVariantCombinations(colors,sizes){
 const out=[];
 if(colors.length&&sizes.length){for(const color of colors)for(const size of sizes)out.push({color,size});}
 else if(colors.length){for(const color of colors)out.push({color,size:null});}
 else if(sizes.length){for(const size of sizes)out.push({color:null,size});}
 return out;
}
async function editMaterial(id){
 const db=getState(),m=id?db.materials.find(x=>x.id===id):{id:uid('mat'),name:'',image:'',colors:[],sizes:[],variants:[],compatibility:[],active:true};
 let image=m.image||'';
 let internalCost=Number(m.internalCost||0);
 if(id){try{internalCost=await DDB.materialInternalCost(id);}catch(error){console.error(error);return notify('Não consegui carregar o custo interno do material. Tente novamente antes de editar.','Consulta necessária');}}
 openModal(id?'Editar material':'Novo material',`<form id="matForm" class="form"><label>Nome<input name="name" value="${esc(m.name)}" required></label>${uploadField('matImage','Imagem do material',image)}${catalogOptionEditor('materialColors','Cores disponíveis',m.colors)}${catalogOptionEditor('materialSizes','Tamanhos/opções do material',m.sizes)}<fieldset><legend>Variações disponíveis</legend><p class="muted">Marque somente as combinações de cor e tamanho que existem. Desmarcar uma combinação a retira das opções disponíveis sem apagar seu histórico.</p><div id="materialVariantChoices" class="checkgrid"></div></fieldset><label>Valor interno do material (financeiro)<input name="internalCost" type="number" min="0" step="0.01" value="${internalCost}"></label>${compatSelector(m.compatibility)}<div id="rc7QuantityEditor" class="rc7-quantity-editor"><p class="muted">Selecione as compatibilidades acima para configurar a quantidade por variação.</p></div><label class="toggle-option"><input name="active" type="checkbox" ${m.active?'checked':''}><span>Ativo</span></label><button class="btn gold">Salvar</button></form>`,root=>{
  bindUpload('matImage',()=>image,v=>image=v);
  bindCatalogOptionEditors(root);
  const knownKeys=new Set(),selectedKeys=new Set();
  const keyOf=v=>JSON.stringify([v.color||null,v.size||null]);
  // Existing colors/sizes may have only SOME allowed combinations. Never reactivate
  // a previously unavailable combination simply by reopening and saving the editor.
  if(id)for(const v of materialVariantCombinations(m.colors||[],m.sizes||[]))knownKeys.add(keyOf(v));
  for(const v of (m.variants||[])){const key=keyOf(v);knownKeys.add(key);if(v.is_active!==false)selectedKeys.add(key);}
  const variantsFromFields=()=>{const f=new FormData($('#matForm',root));return materialVariantCombinations(materialOptionValues(f,'materialColors'),materialOptionValues(f,'materialSizes'));};
  const renderVariants=()=>{const variants=variantsFromFields();const target=$('#materialVariantChoices',root);
    target.innerHTML=variants.length?variants.map(v=>{const key=keyOf(v);if(!knownKeys.has(key)){knownKeys.add(key);selectedKeys.add(key);}return `<label class="toggle-option"><input type="checkbox" data-material-variant="${esc(key)}" ${selectedKeys.has(key)?'checked':''}><span>${esc([v.color,v.size].filter(Boolean).join(' • '))}</span></label>`;}).join(''):'<p class="muted">Adicione ao menos uma cor ou tamanho para definir variantes.</p>';
  };
  $('#materialVariantChoices',root).addEventListener('change',e=>{const input=e.target.closest('[data-material-variant]');if(!input)return;input.checked?selectedKeys.add(input.dataset.materialVariant):selectedKeys.delete(input.dataset.materialVariant);});
  $$('[data-option-editor]',root).forEach(editor=>{editor.addEventListener('input',renderVariants);editor.addEventListener('click',e=>{if(e.target.closest('[data-add-option], [data-remove-option]'))queueMicrotask(renderVariants);});});
  renderVariants();
  const draftQuantities=new Map();
  const updateQty=()=>{ $$('[data-quantity-key]',root).forEach(el=>draftQuantities.set(el.dataset.quantityKey,el.value));const compat=$$('[name="compat"]:checked',root).map(x=>x.value),scopes=adminScopes(compat),old=getState().materialRequirements||[];
   $('#rc7QuantityEditor',root).innerHTML=`<h3>Pacotes necessários por variação</h3><p class="muted">Informe a quantidade para cada compatibilidade selecionada. Uma regra específica de variação substitui a regra geral para o mesmo material.</p>${scopes.map((sc,i)=>{const key=[sc.service_id,sc.method_id,sc.variation_id].filter(Boolean).join('/');const service=getProcedure(sc.service_id),method=getMethod(service,sc.method_id),variation=getVariation(method,sc.variation_id),label=[service?.name,method?.name,variation?.name].filter(Boolean).join(' → ');const rule=old.find(r=>String(r.material_id)===String(m.id)&&String(r.service_id)===String(sc.service_id)&&String(r.method_id||'')===String(sc.method_id||'')&&String(r.variation_id||'')===String(sc.variation_id||''));return `<label> ${esc(label||key)} <input type="number" data-quantity-index="${i}" data-quantity-key="${esc(key)}" min="0.25" step="0.25" value="${esc(draftQuantities.get(key)??rule?.estimated_quantity??'')}" placeholder="Pacotes (obrigatório)"></label>`;}).join('')||'<p class="muted">Selecione um procedimento, método ou variação acima.</p>'}`;
  };
  $$('[name="compat"]',root).forEach(el=>el.addEventListener('change',updateQty));updateQty();
  $('#matForm',root).onsubmit=async e=>{e.preventDefault();
   if(!getState().materialPricesReady)return notify('O cadastro avançado de materiais ainda não está disponível no Supabase. Nenhum material foi alterado.','Configuração pendente');
   const form=e.target,f=new FormData(form);const saveBtn=form.querySelector('button[type="submit"],button.btn.gold');
   try{
    const colors=materialOptionValues(f,'materialColors'),sizes=materialOptionValues(f,'materialSizes');
    const variants=materialVariantCombinations(colors,sizes).filter(v=>selectedKeys.has(keyOf(v)));
    if((colors.length||sizes.length)&&!variants.length)throw Error('Marque pelo menos uma variação disponível, ou remova as opções de cor e tamanho.');
    const compat=$$('[name="compat"]:checked',root).map(x=>x.value),scopes=adminScopes(compat);
    const rules=scopes.map((scope,i)=>({...scope,quantity:Number($(`[data-quantity-index="${i}"]`,root)?.value)}));
    if(rules.some(r=>!Number.isFinite(r.quantity)||r.quantity<=0))throw Error('Configure os pacotes de cada procedimento/variação selecionada.');
    saveBtn.disabled=true;
    const imagePath=await adminAsset(image,'catalog/materials');
    await DDB.saveMaterialComplete({id:id||null,name:f.get('name'),imagePath,internalCost:Number(f.get('internalCost')||0),active:f.has('active'),variants},rules);
    closeModal();await bootstrapBackendPublic();renderModule();notify('Material e quantidades salvos.');
   }catch(err){console.error(err);notify(err.message||'Não foi possível salvar o material.');}
   finally{saveBtn.disabled=false;}
  };
 });
}

function editAccessory(id){const db=getState(),a=id?db.accessories.find(x=>x.id===id):{id:uid('acc'),name:'',image:'',price:0,compatibility:[],active:true};let image=a.image||'';openModal(id?'Editar acessório':'Novo acessório',`<form id="accForm" class="form"><label>Nome<input name="name" value="${esc(a.name)}" required></label><label>Preço<input name="price" type="number" min="0" step="0.01" value="${Number(a.price||0)}"></label>${uploadField('accImage','Imagem do acessório',image)}${compatSelector(a.compatibility)}<label class="toggle-option"><input name="active" type="checkbox" ${a.active?'checked':''}><span>Ativo</span></label><button class="btn gold">Salvar</button></form>`,root=>{bindUpload('accImage',()=>image,v=>image=v);$('#accForm',root).onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{const imagePath=await adminAsset(image,'catalog/accessories');const accessoryId=await DDB.saveAccessory({id:id||null,name:f.get('name'),description:a.description||'',imagePath,price:Number(f.get('price')||0),active:f.has('active')});const compat=$$('[name="compat"]:checked',root).map(x=>x.value);await DDB.replaceAccessoryCompatibility(accessoryId,adminScopes(compat));closeModal();await bootstrapBackendPublic();renderModule();notify('Acessório salvo.');}catch(err){console.error(err);notify(err.message||'Não foi possível salvar o acessório.');}};});}

// Connect the catalog controls to their existing Supabase-backed editors.
// Without this binder the page renders normally, but every catalog button stays inert.
function bindCatalog(){
  $('[data-new-procedure]')?.addEventListener('click',()=>editProcedure());
  $$('[data-edit-procedure]').forEach(b=>b.onclick=()=>editProcedure(b.dataset.editProcedure));
  $$('[data-methods]').forEach(b=>b.onclick=()=>editMethods(b.dataset.methods));
  $('[data-new-material]')?.addEventListener('click',()=>editMaterial());
  $$('[data-edit-material]').forEach(b=>b.onclick=()=>editMaterial(b.dataset.editMaterial));
  $('[data-new-accessory]')?.addEventListener('click',()=>editAccessory());
  $$('[data-edit-accessory]').forEach(b=>b.onclick=()=>editAccessory(b.dataset.editAccessory));
}

// The Clients section had the same regression: its binder was removed.
// This profile only reads existing appointment snapshots; it never edits a client record.
function bindClients(){
  bindSearch('clientSearch','.client-row');
  $$('[data-client]').forEach(b=>b.onclick=()=>{
    const phone=b.dataset.client;
    const items=getState().appointments.filter(a=>phoneKey(a.phone)===phoneKey(phone));
    if(!items.length)return notify('Nenhum registro encontrado para esta cliente.');
    const recent=[...items].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    const first=recent[0];
    openModal('Perfil da cliente',`<div class="client-history"><p><b>${esc(first.clientName||'Cliente')}</b></p><p class="muted">WhatsApp: ${esc(first.phone||'—')}</p><p class="muted">E-mail: ${esc(first.email||'—')}</p><h3>Histórico de atendimentos</h3>${recent.map(a=>`<div class="row"><div><b>${esc(procedureName(a))}</b><span>${esc(a.date?fmtDate(a.date):'Data pendente')} • ${esc(statusLabel(a))} • ${esc(getProfessional(a.professionalId)?.name||'')}</span></div></div>`).join('')}</div>`);
  });
}

// A historical Editar button pointed to a deleted handler. Show real, read-only
// appointment details instead of silently failing or pretending to persist changes.
function editBooking(id){
  const a=getState().appointments.find(x=>String(x.id)===String(id));
  if(!a)return notify('Agendamento não encontrado.');
  openModal('Detalhes do agendamento',`<div class="form"><p><b>Cliente:</b> ${esc(a.clientName||'—')}</p><p><b>Procedimento:</b> ${esc(procedureName(a))}</p><p><b>Profissional:</b> ${esc(getProfessional(a.professionalId)?.name||'—')}</p><p><b>Data:</b> ${esc(a.date?fmtDate(a.date):'—')} ${esc(a.time||'')}</p><p><b>Status:</b> ${esc(statusLabel(a))}</p><p class="muted">Para alterar a data e o horário, use o botão Remarcar na agenda.</p></div>`);
}

function bindFinance(){
  const filterFees=()=>{const q=($('#feeSearch')?.value||'').toLowerCase(),cat=$('#feeCategory')?.value||'all';$$('.fee-row').forEach(r=>r.classList.toggle('hidden',!r.innerText.toLowerCase().includes(q)||(cat!=='all'&&r.dataset.category!==cat)));};$('#feeSearch')?.addEventListener('input',filterFees);$('#feeCategory')?.addEventListener('change',filterFees);
  $$('[data-fee-row]').forEach(row=>{
    const amount=$('[data-fee-value]',row),prefix=$('.fee-value-wrap span',row);
    const selected=()=> $('[data-fee-type]:checked',row)?.value||'none';
    const sync=(reset=false)=>{
      const mode=selected();prefix.textContent=mode==='percent'?'%':'R$';
      amount.max=mode==='percent'?'100':'';
      if(reset&&mode==='none')amount.value='0';
      amount.placeholder=mode==='none'?'Digite para definir um sinal':'';
    };
    $$('[data-fee-type]',row).forEach(radio=>radio.addEventListener('change',()=>sync(true)));
    // Não deixar o campo parecer quebrado: digitar já escolhe "Valor fixo".
    amount.addEventListener('focus',()=>{
      if(selected()==='none'){
        const fixed=$('[data-fee-type][value="fixed"]',row);
        if(fixed){fixed.checked=true;sync();}
      }
    });
    amount.addEventListener('input',()=>{
      if(selected()==='none' && amount.value!==''){
        const fixed=$('[data-fee-type][value="fixed"]',row);
        if(fixed){fixed.checked=true;sync();}
      }
    });
    sync();
  });
  $$('[data-save-fee]').forEach(b=>b.onclick=async()=>{
    const p=getProcedure(b.dataset.saveFee),row=b.closest('[data-fee-row]');
    if(!p||!row)return notify('Não encontramos esse procedimento. Atualize o catálogo.','Procedimento indisponível');
    const type=$('[data-fee-type]:checked',row)?.value||'none';
    const raw=$('[data-fee-value]',row).value;
    const value=type==='none'?0:Number(raw);
    if(type!=='none'&&(!raw.trim()||!Number.isFinite(value)||value<=0))return notify('Informe um valor de sinal maior que zero.','Valor inválido');
    if(type==='percent'&&value>100)return notify('O sinal percentual não pode ultrapassar 100%.','Valor inválido');
    if(b.disabled)return;
    b.disabled=true;
    try{await DDB.setServiceDeposit(p.id,type,value);await bootstrapBackendPublic();renderModule();notify(`Sinal de ${p.name} salvo.`);}
    catch(e){notify(e.message||'Não foi possível salvar o sinal.','Erro ao salvar');}
    finally{b.disabled=false;}
  });
  $$('[data-pro-finance]').forEach(b=>b.onclick=()=>openProFinance(b.dataset.proFinance));
  $$('[data-fin-date]').forEach(b=>b.onclick=()=>{financeDate=b.dataset.finDate;renderModule();});
  $$('[data-fin-nav]').forEach(b=>b.onclick=()=>{const d=new Date(financeYear,financeMonth+(b.dataset.finNav==='next'?1:-1),1);financeYear=d.getFullYear();financeMonth=d.getMonth();financeDate=`${financeYear}-${String(financeMonth+1).padStart(2,'0')}-01`;financeFrom='';financeTo='';renderModule();});
  $$('[data-fin-mode]').forEach(b=>b.onclick=()=>{financeMode=b.dataset.finMode;renderModule();});
  $('#financePro')?.addEventListener('change',e=>{financePro=e.target.value;renderModule();});
  const applyRange=()=>{financeFrom=$('#financeFrom')?.value||'';financeTo=$('#financeTo')?.value||'';if((financeFrom&&!financeTo)||(!financeFrom&&financeTo))return;renderModule();};
  $('#financeFrom')?.addEventListener('change',applyRange);$('#financeTo')?.addEventListener('change',applyRange);
  $('[data-fin-clear-range]')?.addEventListener('click',()=>{financeFrom='';financeTo='';renderModule();});
  $('[data-print-period]')?.addEventListener('click',()=>printFinance(false));$('[data-print-day]')?.addEventListener('click',()=>printFinance(true));
}
function openProFinance(id){const p=getProfessional(id);const openValues=()=>{const list=getState().appointments.filter(a=>a.professionalId===id),total=list.reduce((s,a)=>s+paymentReceived(a),0);openModal(`Financeiro — ${p.name}`,`<div class="metrics mini"><div class="metric"><span>Atendimentos</span><strong>${list.length}</strong></div><div class="metric"><span>Recebido</span><strong>${money(total)}</strong></div><div class="metric"><span>Em aberto</span><strong>${money(list.reduce((s,a)=>s+paymentOpen(a),0))}</strong></div><div class="metric"><span>Materiais D&D</span><strong>${money(list.reduce((s,a)=>s+Number(a.materialCost||0),0))}</strong></div></div>${list.map(a=>`<div class="row"><div><b>${esc(a.clientName)}</b><span>${fmtDate(a.date)} • ${money(paymentReceived(a))}</span></div></div>`).join('')||'<p>Nenhum registro.</p>'}`);};if(!p.operatorId||!p.pinConfigured)return notify('Configure um PIN para esta profissional antes de abrir os valores individuais.','PIN necessário');openModal(`PIN — ${p.name}`,`<label>Digite o PIN<input id="pinCheck" type="password" maxlength="6" inputmode="numeric"></label><button class="btn gold" id="checkPin">Abrir valores</button>`,root=>{$('#checkPin',root).onclick=async()=>{try{const ok=await DDB.verifyOperatorPin(p.operatorId,$('#pinCheck',root).value);if(!ok)return notify('PIN incorreto.','Acesso negado');closeModal();openValues();}catch(e){notify('PIN incorreto.','Acesso negado');}};});}
function requireSensitiveOperator(actionLabel,onVerified){const ops=(getState().operators||[]).filter(o=>o.is_active);if(!ops.length)return notify('Nenhum operador interno ativo foi encontrado.');openModal(`Confirmação — ${actionLabel}`,`<p class="muted">Escolha quem está realizando esta ação e informe o PIN.</p><label>Responsável<select id="sensitiveOperator">${ops.map(o=>`<option value="${o.id}">${esc(o.display_name)}</option>`).join('')}</select></label><label>PIN<input id="sensitivePin" type="password" inputmode="numeric" maxlength="6"></label><button class="btn gold" id="sensitiveConfirm">Confirmar</button>`,root=>{$('#sensitiveConfirm',root).onclick=async()=>{const operatorId=$('#sensitiveOperator',root).value,pin=$('#sensitivePin',root).value;try{const ok=await DDB.verifyOperatorPin(operatorId,pin);if(!ok)return notify('PIN incorreto.','Acesso negado');closeModal();await onVerified(operatorId);}catch(e){notify('PIN incorreto ou não configurado.','Acesso negado');}};});}
function openPayment(id){const a=getState().appointments.find(x=>x.id===id),balance=balanceAmount(a);if(!a)return;openModal('Registrar pagamento',`<p>Saldo restante: <b>${money(balance)}</b></p><label>Forma de pagamento<select id="payMethod"><option value="cash">Dinheiro</option><option value="pix">PIX</option><option value="card">Cartão</option></select></label><div id="cardFields" class="hidden"><label>Tipo de cartão<select id="cardType"><option value="debit">Débito</option><option value="credit">Crédito</option></select></label><div id="creditFields" class="hidden"><label>Quantidade de parcelas<input id="installments" type="number" min="1" max="24" value="1"></label><label>Valor da parcela<input id="installmentValue" type="number" min="0" step="0.01" value="${balance.toFixed(2)}"></label></div></div><button class="btn gold" id="savePayment">Registrar ${money(balance)}</button>`,root=>{const method=$('#payMethod',root),card=$('#cardFields',root),type=$('#cardType',root),credit=$('#creditFields',root);const sync=()=>{card.classList.toggle('hidden',method.value!=='card');credit.classList.toggle('hidden',method.value!=='card'||type.value!=='credit');};method.onchange=sync;type.onchange=sync;$('#installments',root)?.addEventListener('input',e=>{$('#installmentValue',root).value=(balance/Math.max(1,Number(e.target.value||1))).toFixed(2)});$('#savePayment',root).onclick=()=>{const dbMethod=method.value==='card'?(type.value==='credit'?'credit':'debit'):method.value,installments=dbMethod==='credit'?Number($('#installments',root).value||1):null;closeModal();requireSensitiveOperator('registrar pagamento',async operatorId=>{try{await DDB.completeAppointment(a.id,dbMethod,balance,installments,operatorId);await syncAdminSnapshot();renderModule();notify('Pagamento registrado e atendimento finalizado.');}catch(e){notify(e.message||'Não foi possível registrar o pagamento.');}});};sync();});}
function markRefunded(id){return notify('Para evitar pagamento duplicado, conclua reembolsos pela aba Pendências após a solicitação da cliente.','Reembolso protegido');}

function cancelAppointment(id){const a=getState().appointments.find(x=>x.id===id);if(!a)return;askConfirm({title:'Cancelar atendimento',message:`Cancelar o atendimento/solicitação de ${a.clientName}?${a.bookingFeePaid?' O sinal ficará como reembolso pendente.':''}`,confirmText:'Cancelar',danger:true,onConfirm:()=>requireSensitiveOperator('cancelar atendimento',async operatorId=>{try{await DDB.cancelAppointment(a.id,'Cancelado pela administração',operatorId);await syncAdminSnapshot();window.open(waLink(a.phone,buildMessage('cancel',a)),'_blank');renderModule();}catch(e){notify(e.message||'Não foi possível cancelar o atendimento.');}})});}

function bindProfessionals(){$('[data-new-professional]')?.addEventListener('click',()=>editProfessional());$$('[data-edit-professional]').forEach(b=>b.onclick=()=>editProfessional(b.dataset.editProfessional));}
function editProfessional(id){
 const p=id?getProfessional(id):{id:null,name:'',image:'',instagram:'',whatsapp:'',pixKey:'',active:true,bookable:true};let image=p.image||'';
 openModal(id?'Editar profissional':'Adicionar profissional',`<form id="proForm" class="form"><label>Nome<input name="name" value="${esc(p.name)}" required></label>${uploadField('proImage','Foto',image)}<label>Instagram<input name="instagram" value="${esc(p.instagram||'')}"></label><label>WhatsApp<input name="whatsapp" value="${esc(p.whatsapp||'')}"></label><label>Chave PIX<input name="pixKey" value="${esc(p.pixKey||'')}"></label><label>Novo PIN (opcional, 4–6 dígitos)<input name="pin" inputmode="numeric" maxlength="6" placeholder="Deixe vazio para manter"></label><label class="toggle-option"><input name="bookable" type="checkbox" ${p.bookable!==false?'checked':''}><span>Disponível para agendamentos</span></label><button class="btn gold">Salvar</button></form>`,root=>{
  bindUpload('proImage',()=>image,v=>image=v);
  $('#proForm',root).onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),pin=String(f.get('pin')||'').replace(/\D/g,'').slice(0,6);if(pin&&pin.length<4)return notify('O PIN precisa ter de 4 a 6 dígitos.');try{let photo=image;if(String(photo||'').startsWith('data:'))photo=await DDB.uploadPublicAsset(photo,'professionals');const professionalId=await DDB.saveProfessional({id:id||null,name:f.get('name'),photoPath:photo||null,instagram:f.get('instagram'),whatsapp:f.get('whatsapp'),pixKey:f.get('pixKey'),pixKeyType:null,pixHolder:f.get('name'),active:f.has('bookable')});if(pin){const snap=await DDB.adminSnapshot(),row=(snap.professionals||[]).find(x=>x.id===professionalId);if(row?.operator_id)await DDB.setOperatorPin(row.operator_id,pin);}closeModal();await bootstrapBackendPublic();await syncAdminSnapshot();renderModule();notify('Profissional salva no sistema.');}catch(err){console.error(err);notify(err.message||'Não foi possível salvar a profissional.');}}
 });
}

let postState={img1:null,img2:null,zoom1:1,x1:0,y1:0,zoom2:1,x2:0,y2:0};
function bindPosts(){const ids=['postTemplate','postFormat','postTitle','postZoom1','postX1','postY1','postZoom2','postX2','postY2'];ids.forEach(id=>$(`#${id}`)?.addEventListener('input',()=>{syncPostState();drawPost();}));$('#postTemplate').onchange=()=>{$('#postPhoto2Wrap').classList.toggle('hidden',$('#postTemplate').value!=='beforeafter');$('#postSecondControls').classList.toggle('hidden',$('#postTemplate').value!=='beforeafter');drawPost();};$('#postPhoto1').onchange=e=>loadPostImage(e.target.files?.[0],1);$('#postPhoto2').onchange=e=>loadPostImage(e.target.files?.[0],2);$$('[data-fit]').forEach(b=>b.onclick=()=>{const n=b.dataset.fit;postState[`zoom${n}`]=1;postState[`x${n}`]=0;postState[`y${n}`]=0;$(`#postZoom${n}`).value=100;$(`#postX${n}`).value=0;$(`#postY${n}`).value=0;drawPost();});$('[data-export-post]').onclick=exportPost;drawPost();}
function loadPostImage(file,n){if(!file)return;const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{postState[`img${n}`]=img;drawPost();};img.src=String(r.result);};r.readAsDataURL(file);}
function syncPostState(){for(const n of [1,2]){postState[`zoom${n}`]=Number($(`#postZoom${n}`)?.value||100)/100;postState[`x${n}`]=Number($(`#postX${n}`)?.value||0);postState[`y${n}`]=Number($(`#postY${n}`)?.value||0);}}
function drawImageCover(ctx,img,x,y,w,h,zoom=1,ox=0,oy=0){if(!img)return;const base=Math.min(w/img.width,h/img.height),s=base*zoom,iw=img.width*s,ih=img.height*s;ctx.drawImage(img,x+(w-iw)/2+(ox/100)*w/2,y+(h-ih)/2+(oy/100)*h/2,iw,ih);}
function drawPost(){const c=$('#postCanvas');if(!c)return;const fmt=$('#postFormat')?.value||'feed';const dims=fmt==='story'?[1080,1920]:fmt==='square'?[1080,1080]:[1080,1350];c.width=dims[0];c.height=dims[1];const ctx=c.getContext('2d'),tpl=$('#postTemplate')?.value||'watermark',title=$('#postTitle')?.value||'D&D Braids';ctx.fillStyle='#17120d';ctx.fillRect(0,0,c.width,c.height);if(tpl==='beforeafter'){drawImageCover(ctx,postState.img1,0,0,c.width/2,c.height,postState.zoom1,postState.x1,postState.y1);drawImageCover(ctx,postState.img2,c.width/2,0,c.width/2,c.height,postState.zoom2,postState.x2,postState.y2);ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(0,c.height-150,c.width,150);ctx.fillStyle='#fff';ctx.font='700 48px sans-serif';ctx.fillText('ANTES',60,c.height-70);ctx.fillText('DEPOIS',c.width/2+60,c.height-70);}else{drawImageCover(ctx,postState.img1,0,0,c.width,c.height,postState.zoom1,postState.x1,postState.y1);ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(0,0,c.width,c.height);if(tpl==='frame'){ctx.strokeStyle='#d7ae5c';ctx.lineWidth=22;ctx.strokeRect(35,35,c.width-70,c.height-70);}}ctx.fillStyle='#f0d18a';ctx.font='700 58px serif';ctx.fillText(title,60,90);ctx.fillStyle='#fff';ctx.font='32px sans-serif';ctx.fillText('D&D BRAIDS',60,135);$('#postEmpty')?.classList.toggle('hidden',!!postState.img1);}
function exportPost(){if(!postState.img1)return notify('Envie uma foto antes de exportar.');if($('#postTemplate').value==='beforeafter'&&!postState.img2)return notify('Envie a foto do depois.');const a=document.createElement('a');a.download='dd-braids-post.png';a.href=$('#postCanvas').toDataURL('image/png');a.click();}

function bindSettings(){
 $('#changeAdminPassword')?.addEventListener('click',openChangePassword);
 let hero=getState().media.hero||'';bindUpload('heroUpload',()=>hero,v=>hero=v);
 $('[data-save-hero]').onclick=async()=>{try{const path=await adminAsset(hero,'brand');await DDB.saveSetting('hero_image_path',path||'');getState().media.hero=assetUrl(path);saveState();notify('Imagem principal salva.');}catch(e){notify(e.message||'Não foi possível salvar a imagem.');}};
 $('[data-add-sunday]')?.addEventListener('click',async()=>{const value=$('#publicSundayDate')?.value;if(!value)return notify('Escolha uma data.');if(new Date(`${value}T12:00:00`).getDay()!==0)return notify('A data escolhida não é domingo.');try{await DDB.setPublicSunday(value,true,null);await bootstrapBackendPublic();renderModule();}catch(e){notify(e.message||'Não foi possível abrir o domingo.');}});
 $$('[data-remove-sunday]').forEach(b=>b.onclick=async()=>{try{await DDB.setPublicSunday(b.dataset.removeSunday,false,null);await bootstrapBackendPublic();renderModule();}catch(e){notify(e.message||'Não foi possível fechar o domingo.');}});
 $('[data-save-maintenance-deposit]')?.addEventListener('click',async()=>{const mt=getState().procedures.find(p=>p.special==='maintenance');if(!mt)return;try{await DDB.setMaintenanceDepositPolicy(mt.id,$('#maintenanceDepositInherit').checked,$('#maintenanceDepositMode').value,Number($('#maintenanceDepositValue').value||0));await bootstrapBackendPublic();renderModule();notify('Regra de sinal da manutenção salva.');}catch(e){notify(e.message||'Não foi possível salvar a regra da manutenção.');}});
 $('[data-save-general]').onclick=async()=>{try{const hours=Number($('#cancelHours').value||24),text=$('#consentStandardText').value.trim(),version=$('#consentVersion').value.trim()||'1.0';await DDB.saveSetting('cancellation_hours',hours);await DDB.saveSetting('consent_standard_version',version);await DDB.saveSetting('consent_standard_text',text);getState().settings.cancelHours=hours;getState().settings.consentStandardText=text;getState().settings.consentVersion=version;saveState();notify(text?'Regras salvas.':'Regras salvas. O agendamento público ficará bloqueado até configurar o texto do consentimento.');}catch(e){notify(e.message||'Não foi possível salvar as regras.');}};
 $('[data-save-messages]').onclick=async()=>{const map={fee:'deposit_charge',confirm:'confirmation',cancel:'cancellation',reschedule:'reschedule',reminder:'reminder',opening:'open_slot',nonRecommended:'not_recommended',refundCompleted:'refund_completed'};try{for(const x of $$('[data-message]')){await DDB.saveWhatsappTemplate(map[x.dataset.message],x.value);getState().settings.messages[x.dataset.message]=x.value;}saveState();notify('Mensagens salvas.');}catch(e){notify(e.message||'Não foi possível salvar as mensagens.');}};
}
/* === 60-admin.js: end === */

/* === 70-integration.js: begin === */
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
    saveState(); publicCatalogReady=true; renderHome();renderCatalog();
    // If a parallel admin login/snapshot completed first, refresh the visible
    // dashboard once the catalog is loaded rather than leaving it empty.
    refreshAdmin();
    if(routeHash()==='booking')renderBooking(); finishAuthCallback();
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

async function ensureClientAuth(){
  const previous=await DDB.session();
  if(previous){
    if(await DDB.isAdmin())throw new Error('Esta conta é administrativa e não pode solicitar agendamentos.');
    return previous;
  }
  const ok=await authModal(booking.email||'');
  if(!ok)return null;
  const current=await DDB.session();
  if(current&&await DDB.isAdmin())throw new Error('Esta conta é administrativa e não pode solicitar agendamentos.');
  return current;
}
let bookingSubmissionPending=false;
async function submitRequest(){
 if(adminPreviewMode)return notify('Agendamentos estão desativados neste modo administrativo.','Modo de visualização');
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

function clientDepositLabel(status){
  if(status==='paid')return 'Sinal pago ✓';
  if(status==='refund_pending')return 'Sinal pago • destino pendente';
  if(status==='refunded')return 'Sinal reembolsado';
  if(status==='credited')return 'Sinal convertido em crédito';
  return 'Sinal pendente';
}
function clientCancellationError(error){
  const message=String(error?.message||'');
  if(message.includes('cancellation_cutoff_passed'))return 'O prazo para cancelar este atendimento já terminou. Entre em contato com a D&D.';
  if(message.includes('appointment_not_cancellable'))return 'Este atendimento não pode ser cancelado ou já foi encerrado. Atualize a página.';
  if(/not authenticated|jwt|session/i.test(message))return 'Sua sessão expirou. Entre novamente na sua conta.';
  return 'Não foi possível concluir o cancelamento. Tente novamente ou entre em contato com a D&D.';
}

async function verifyClientAccountPassword(password,expectedId){
  if(!password)throw new Error('Informe a senha atual da sua conta.');
  const {data:identity,error:identityError}=await DDB.sb.auth.getUser();
  const account=identity?.user;
  if(identityError||!account?.id||!account.email||account.id!==expectedId)
    throw new Error('Sua sessão mudou. Entre novamente na conta.');
  // Reauthenticate with the real password; updateUser by itself does not
  // guarantee that the password supplied by the client was checked.
  const {data:verified,error:verifyError}=await DDB.sb.auth.signInWithPassword({
    email:account.email,password
  });
  if(verifyError||verified?.user?.id!==expectedId)
    throw new Error('Senha incorreta. Confira e tente novamente.');
  return verified.user;
}
function clientProfileValues(user,appointments){
  const saved=user.user_metadata?.ddb_client_contact||{};
  const has=k=>Object.prototype.hasOwnProperty.call(saved,k);
  const previous=appointments?.find(a=>a.client_id===user.id)||null;
  return {
    name:String(has('name')?saved.name:(previous?.client_name_snapshot||previous?.client_name||user.user_metadata?.full_name||'')),
    phone:canonicalContactPhone(has('phone')?saved.phone:(previous?.client_phone_snapshot||previous?.client_phone||'')),
    email:String(user.email||'')
  };
}
function clientProfileMarkup(user,appointments){
  const values=clientProfileValues(user,appointments);
  const fields=[
    ['name','Nome completo',values.name||'Não informado'],
    ['phone','WhatsApp',values.phone?contactPhoneDisplay(values.phone):'Não informado'],
    ['email','E-mail da conta',values.email||'Não informado']
  ];
  return '<section class="glass panel client-profile-panel"><div class="between"><div><h2>Meus dados</h2><p class="muted">Usados automaticamente nos próximos agendamentos. Alterações exigem a senha atual.</p></div></div>'+
    '<div class="client-profile-fields">'+fields.map(([field,label,value])=>
      '<div class="client-profile-row"><div><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div><div class="actions">'+
      '<button type="button" class="btn small" data-profile-edit="'+field+'">'+(value==='Não informado'?'Adicionar':'Alterar')+'</button>'+
      (field!=='email'&&value!=='Não informado'?'<button type="button" class="btn small danger" data-profile-remove="'+field+'">Apagar</button>':'')+
      '</div></div>').join('')+'</div><p class="muted">O e-mail de login precisa permanecer cadastrado; alterações de e-mail exigem confirmação do novo endereço. Os dados históricos de atendimentos não são apagados.</p></section>';
}
function bindClientProfileControls(box,user,appointments){
  $('[data-profile-edit],[data-profile-remove]',box).forEach(button=>{
    button.onclick=()=>openClientProfileEditor(
      button.dataset.profileEdit||button.dataset.profileRemove,
      user,appointments,!!button.dataset.profileRemove
    );
  });
}
function openClientProfileEditor(field,user,appointments,remove){
  if(!['name','phone','email'].includes(field)||remove&&field==='email')return;
  const data=clientProfileValues(user,appointments);
  const labels={name:'nome completo',phone:'WhatsApp',email:'e-mail da conta'};
  const value=field==='phone'?data.phone:data[field];
  openModal((remove?'Apagar ':'Alterar ')+labels[field],
    '<p class="muted">'+(remove?'O campo ficará vazio para novos agendamentos. O histórico de atendimentos será preservado.':'Informe o novo valor e confirme com sua senha atual.')+'</p>'+
    (!remove?'<label>'+labels[field]+'<input id="clientProfileValue" autocomplete="off" value="'+esc(value)+'" '+(field==='email'?'type="email"':'')+'></label>':'')+
    '<label>Senha atual da conta *<input type="password" id="clientProfilePassword" autocomplete="current-password"></label>'+
    '<button type="button" class="btn gold" id="clientProfileSave">'+(remove?'Confirmar exclusão':'Salvar alteração')+'</button><p class="muted" id="clientProfileFeedback" role="status"></p>',
    root=>{
      const button=$('#clientProfileSave',root);
      button.onclick=async()=>{
        if(button.disabled)return;
        let next=remove?'':String($('#clientProfileValue',root)?.value||'').trim();
        if(!remove&&field==='name'&&(!next||next.length>150))
          return $('#clientProfileFeedback',root).textContent='Informe um nome válido.';
        if(!remove&&field==='phone'){
          next=canonicalContactPhone(next);
          const digits=phoneKey(next);
          if(!next.startsWith('+')||digits.length<9||digits.length>15||
             (digits.startsWith('55')&&!([12,13].includes(digits.length))))
            return $('#clientProfileFeedback',root).textContent='Informe WhatsApp com DDI e DDD válidos.';
        }
        if(!remove&&field==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next))
          return $('#clientProfileFeedback',root).textContent='Informe um e-mail válido.';
        const password=$('#clientProfilePassword',root).value;
        if(!password)return $('#clientProfileFeedback',root).textContent='Informe a senha atual.';
        button.disabled=true;
        try{
          await verifyClientAccountPassword(password,user.id);
          const {data:account,error:accountError}=await DDB.sb.auth.getUser();
          if(accountError||account?.user?.id!==user.id)throw new Error('Sua sessão mudou. Entre novamente.');
          if(field==='email'){
            if(next.toLowerCase()===String(account.user.email||'').toLowerCase())throw new Error('Este já é seu e-mail atual.');
            const {error}=await DDB.sb.auth.updateUser({email:next});
            if(error)throw error;
          }else{
            const old=account.user.user_metadata?.ddb_client_contact||{};
            const {error}=await DDB.sb.auth.updateUser({
              data:{ddb_client_contact:{...old,[field]:next}}
            });
            if(error)throw error;
          }
          currentClientContactOwnerId=null;
          clientHasSavedContact=false;
          clientHadPreviousContact=false;
          clientContactEditing=true;
          closeModal();
          await renderAccount();
          notify(field==='email'?'Confira o novo e-mail para confirmar a alteração.':'Seus dados foram atualizados.');
        }catch(error){
          $('#clientProfileFeedback',root).textContent=error?.message||'Não foi possível atualizar seus dados.';
          button.disabled=false;
        }
      };
    }
  );
}

async function renderAccount(){
 const box=$('#accountList'),controls=$('#accountAuthControls'),profileBox=$('#accountProfile');if(!window.DDB||!box)return;
 if(profileBox)profileBox.replaceChildren();
 if(adminPreviewMode){
   controls?.replaceChildren();
   box.innerHTML='<div class="glass panel"><h2>Visualização administrativa</h2><p class="muted">Você está visualizando o site como visitante. Para consultar clientes ou gerenciar atendimentos, volte ao painel administrativo.</p><button class="btn gold" type="button" id="returnAdminFromAccount">Voltar ao painel</button></div>';
   $('#returnAdminFromAccount').onclick=showAdmin;
   return;
 }
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
 try{
  let list=[],appointmentsError=null;
  try{list=await DDB.myAppointments();}catch(error){
    appointmentsError=error;
    console.error('Falha na consulta dos agendamentos da conta:',error);
  }
  let fresh=null;
  try{fresh=await DDB.sb.auth.getUser();}catch(error){console.warn('Dados recentes da conta indisponíveis:',error);}
  const currentUser=fresh?.data?.user?.id===s.user.id?fresh.data.user:s.user;
  // Account details must render even when the appointments query fails.
  if(profileBox)profileBox.innerHTML=clientProfileMarkup(currentUser,list);
  box.innerHTML=appointmentsError
    ?'<div class="empty-state">Não foi possível consultar os agendamentos agora. Seus dados da conta estão disponíveis acima. Atualize para tentar novamente.</div>'
    :list.map(a=>`<article class="glass account-item"><div><b>${esc(a.service_name_snapshot||'Atendimento')}</b><span>${esc(a.professional_name_snapshot||'')} • ${a.scheduled_start?new Date(a.scheduled_start).toLocaleDateString('pt-BR'):'—'}</span><span class="status ${esc(a.status)}">${esc(statusLabel({status:a.status,bookingFeePaid:a.deposit_status==='paid'}))}</span>${Number(a.deposit_amount||0)>0?`<span class="fee-account ${a.deposit_status==='paid'?'paid':'pending'}">${esc(clientDepositLabel(a.deposit_status))} • ${money(a.deposit_amount)}</span>`:''}</div><div class="actions">${!a.hair_profile_id&&['awaiting_fee','fee_sent','pending_review'].includes(a.status)?`<button class="btn small gold account-complete-hair" data-id="${a.id}">Completar ficha capilar</button>`:''}${a.status==='confirmed' && getState().rc7Installed?`<button class="btn small account-reschedule" data-id="${a.id}">Solicitar remarcação</button>`:''}${!['cancelled','completed','rejected','no_show'].includes(a.status)?`<button class="btn small danger account-cancel" data-id="${a.id}">Cancelar</button>`:''}</div></article>`).join('')||'<div class="empty-state">Nenhuma solicitação encontrada.</div>';bindClientProfileControls(profileBox||box,currentUser,list);if(appointmentsError)return;document.querySelectorAll('.account-cancel').forEach(b=>b.onclick=()=>{
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
          notify(clientCancellationError(e),'Erro no cancelamento');
        }finally{b.disabled=false;}
      }
    });
  });$$('.account-complete-hair').forEach(b=>b.onclick=()=>openMissingHairProfile(b.dataset.id));$$('.account-reschedule').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await DDB.requestWaitlist(b.dataset.id);notify('Solicitação registrada na lista de espera.');renderAccount();}catch(e){notify(e.message||'Não foi possível solicitar a remarcação.');}finally{b.disabled=false;}});
  await window.DDBraidsRC7?.renderAccount(box,list);}catch(e){console.error('Erro ao montar o Portal Cliente:',e);box.innerHTML=`<div class="empty-state">Não foi possível carregar seus agendamentos. Atualize para tentar novamente.</div>`;}
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

/* === 70-integration.js: end === */

/* === 80-startup.js: begin === */
/* ===== app.js ===== */
// State starts empty. Never hydrate demo or private business data from storage.
try { localStorage.removeItem(KEY); } catch {}

// Fail gracefully when a published image is missing: never leave the large broken-image icon.
document.addEventListener('error',event=>{
  const img=event.target;
  if(!(img instanceof HTMLImageElement))return;
  if(img.dataset.ddbImageFailed)return;
  img.dataset.ddbImageFailed='1';
  const parent=img.parentElement;
  if(parent?.matches('.visual-choice,.card,.selection-context,.summary-hero')){
    img.classList.add('ddb-image-failed');
    parent.classList.add('ddb-missing-photo');
    const label=document.createElement('span');
    label.className='ddb-photo-placeholder';
    label.setAttribute('aria-hidden','true');
    label.textContent='D&D';
    img.insertAdjacentElement('afterend',label);
  }else{
    img.classList.add('ddb-image-failed');
  }
},true);

$('#noticeClose').onclick=()=>$('#siteNotice').classList.remove('open');
$('#closeModal').onclick=closeModal;
$('#modal').addEventListener('click',e=>{ if(e.target.id==='modal') closeModal(); });

initPublic();
initAdmin();
renderHome();
renderCatalog();
// Public catalog must load before the admin snapshot is mapped to UI objects.
// Starting both requests in parallel let an already-signed-in admin see blank
// procedures, professionals and financial cards until a manual refresh.
bootstrapBackendPublic()
  .then(()=>restoreAdminSessionOnLoad())
  .catch(e=>console.error('Admin bootstrap failed',e));

window.DDBraids = {
  getState,
  refresh(){ renderHome(); renderCatalog(); refreshAdmin(); }
};
/* === 80-startup.js: end === */

})();
