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

