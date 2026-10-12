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

function waLink(phone,text){ return `https://wa.me/${phoneKey(phone)}?text=${encodeURIComponent(text)}`; }
function csv(v){ return String(v||'').split(',').map(x=>x.trim()).filter(Boolean); }
function routeHash(){ const h=location.hash.replace(/^#/,''); if(/(?:^|&)access_token=|(?:^|&)refresh_token=|(?:^|&)error(?:_code|_description)?=/.test(h)) return 'booking'; return h.split('?')[0] || 'home'; }
function paramsFromHash(){ const p=location.hash.split('?')[1]||''; return new URLSearchParams(p); }

