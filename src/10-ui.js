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
// E.164 is stored for new contacts. Unprefixed LEGACY records default to BR;
// the editor/booking fields never infer a country without the selected flag.
function canonicalContactPhone(value){
 const raw=String(value||'').trim(),digits=phoneKey(raw);
 if(!digits)return '';
 if(raw.startsWith('+'))return '+'+digits;
 if(raw.startsWith('00')&&digits.length>10)return '+'+digits.slice(2);
 if(digits.startsWith('55')&&[12,13].includes(digits.length))return '+'+digits;
 if([10,11].includes(digits.length))return '+55'+digits;
 return '+'+digits;
}
function selectedPhoneCountry(iti){
 return iti?.getSelectedCountry?.()||iti?.getSelectedCountryData?.()||null;
}
function phoneInputE164(input,iti){
 const raw=String(input?.value||'').trim(),digits=phoneKey(raw);
 if(!digits)return '';
 if(raw.startsWith('+'))return '+'+digits;
 if(raw.startsWith('00')&&digits.length>10)return '+'+digits.slice(2);
 const dial=phoneKey(selectedPhoneCountry(iti)?.dialCode||'');
 if(!dial)return '';
 if(dial==='55'&&digits.startsWith('55')&&[12,13].includes(digits.length))return '+'+digits;
 if(dial==='1'&&digits.startsWith('1')&&digits.length===11)return '+'+digits;
 return '+'+dial+digits;
}
function internationalPhoneValid(number,iso2=''){
 const digits=phoneKey(number);
 if(!String(number||'').startsWith('+')||digits.length<8||digits.length>15||digits[0]==='0')return false;
 if(iso2==='br'||digits.startsWith('55'))return digits.startsWith('55')&&[12,13].includes(digits.length);
 if(iso2==='us'||iso2==='ca'||digits.startsWith('1'))return digits.startsWith('1')&&digits.length===11;
 return true;
}
function mountInternationalPhone(input,initial=''){
 if(!input)return {getNumber:()=>'',isValid:()=>false};
 input.type='tel';input.autocomplete='tel';input.inputMode='tel';
 input.setAttribute('aria-label','WhatsApp com seleção de país');
 let iti=null;
 if(typeof window.intlTelInput==='function'){
  try{
   iti=window.intlTelInput(input,{
    initialCountry:'br',countryOrder:['br','us','pt','gb','ar'],
    separateDialCode:true,countrySearch:true,countrySelectorMode:'AUTO',
    formatAsYouType:true,dropdownContainer:document.body,
    loadUtils:()=>import('https://cdn.jsdelivr.net/npm/intl-tel-input@29.5.4/dist/js/utils.js')
   });
   if(initial)iti.setNumber(canonicalContactPhone(initial));
  }catch(error){console.warn('Seletor internacional indisponível:',error);iti=null;}
 }
 if(!iti){
  input.placeholder='+55 (11) 98765-4321 (inclua o DDI)';
  input.value=initial?canonicalContactPhone(initial):'';
 }
 const getNumber=()=>{
  if(!String(input.value||'').trim())return '';
  const normalized=phoneInputE164(input,iti),iso2=selectedPhoneCountry(iti)?.iso2||'';
  if(iti?.isValidNumber?.()&&iti?.getNumber){
   const parsed=iti.getNumber();
   if(internationalPhoneValid(parsed,iso2))return parsed;
  }
  return normalized;
 };
 const isValid=()=>{
  const number=getNumber(),iso2=selectedPhoneCountry(iti)?.iso2||'';
  if(!internationalPhoneValid(number,iso2))return false;
  if(iti&&window.intlTelInput?.utils&&typeof iti.isValidNumber==='function')
   return !!iti.isValidNumber();
  return true;
 };
 return {getNumber,isValid,destroy:()=>iti?.destroy?.()};
}
function contactPhoneDisplay(value){
 const normalized=canonicalContactPhone(value),digits=phoneKey(normalized);
 if(!digits)return '—';
 if(digits.startsWith('55')&&[12,13].includes(digits.length)){
  const local=digits.slice(2),subscriber=local.slice(2);
  return '+55 ('+local.slice(0,2)+') '+subscriber.slice(0,-4)+'-'+subscriber.slice(-4);
 }
 if(digits.startsWith('1')&&digits.length===11)
  return '+1 ('+digits.slice(1,4)+') '+digits.slice(4,7)+'-'+digits.slice(7);
 const formatter=window.intlTelInput?.utils?.formatNumber;
 if(typeof formatter==='function'){
  const result=formatter(normalized,undefined,'INTERNATIONAL');
  if(result&&result!==normalized)return result;
 }
 return normalized;
}
function whatsAppDigits(phone){return phoneKey(canonicalContactPhone(phone));}
function waLink(phone,text){return `https://wa.me/${whatsAppDigits(phone)}?text=${encodeURIComponent(text)}`; }
function csv(v){ return String(v||'').split(',').map(x=>x.trim()).filter(Boolean); }
function routeHash(){ const h=location.hash.replace(/^#/,''); if(/(?:^|&)access_token=|(?:^|&)refresh_token=|(?:^|&)error(?:_code|_description)?=/.test(h)) return 'booking'; return h.split('?')[0] || 'home'; }
function paramsFromHash(){ const p=location.hash.split('?')[1]||''; return new URLSearchParams(p); }

