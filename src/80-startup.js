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

