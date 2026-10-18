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
  const p=getProfessional(a.professionalId), reembolso=a.bookingFeePaid?' Se houver valor reembolsável, você poderá solicitar sua devolução via Pix pelo portal.':'';
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

