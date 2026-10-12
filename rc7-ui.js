/* D&D RC7 — recursos de portal e pendências, conectados a RPCs com Auth/RLS. */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const date=s=>s?new Date(s).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
const unavailable=(title)=>`<section class="glass panel rc7-unavailable"><h2>${title}</h2><p class="muted">Funcionalidade aguardando ativação no sistema. Seus agendamentos continuam disponíveis acima.</p></section>`;
const message=e=>(e?.message||String(e||'Não foi possível concluir esta operação.'));
let clientBusy=false, adminBusy=false;
async function renderAccount(box, appointments){
 if(!box||!window.DDB||clientBusy)return;
 clientBusy=true;
 let extra=$('#rc7ClientPortal',box);if(!extra){extra=document.createElement('div');extra.id='rc7ClientPortal';box.appendChild(extra);}
 extra.innerHTML='<div class="glass panel"><p class="muted">Carregando informações da sua conta…</p></div>';
 try{
  const data=await DDB.rc7Portal();
  const sum=(data.ledger||[]).reduce((x,y)=>x+Number(y.amount||0),0);
  const offers=(data.offers||[]).filter(o=>o.status==='proposed'&&Date.parse(o.expires_at)>Date.now());
  const wBy=new Map((data.waitlist||[]).map(w=>[w.id,w]));
  const refundBy=new Map((data.refunds||[]).map(r=>[r.appointment_id,r]));
  const todayMsg=(data.notifications||[]).slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,10);
  const claimable=(appointments||[]).filter(a=>a.status==='cancelled'&&a.deposit_status==='refund_pending'&&!refundBy.has(a.id));
  const available=data.available||{};
  extra.innerHTML=`${available.ledger?`<section class="glass panel rc7-portal"><div class="between"><div><small>CARTEIRA</small><h2>Seus créditos</h2></div><strong class="rc7-balance">${money(sum)}</strong></div><p class="muted">Créditos registrados para uso na D&D. A aplicação em novos pagamentos será liberada após validação financeira no banco.</p></section>`:unavailable('Carteira')}
   ${available.waitlist?`<section class="glass panel rc7-portal"><h2>Remarcações e lista de espera</h2>${(data.waitlist||[]).map(w=>{const a=(appointments||[]).find(x=>x.id===w.appointment_id);return `<div class="row"><div><b>${esc(a?.service_name_snapshot||'Atendimento')}</b><span>Na lista desde ${date(w.joined_at)} • ${esc(w.status)}</span></div></div>`;}).join('')||'<p class="muted">Nenhuma solicitação de remarcação em andamento.</p>'}
   ${available.offers?offers.map(o=>{const w=wBy.get(o.waitlist_id);const a=(appointments||[]).find(x=>x.id===w?.appointment_id);return `<div class="rc7-offer"><strong>Nova data proposta</strong><p>${esc(a?.service_name_snapshot||'Atendimento')} • ${date(o.start_at)} até ${date(o.end_at)}</p><div class="actions"><button class="btn gold" data-reply-offer="${esc(o.id)}" data-accept="1">Aceitar proposta</button><button class="btn" data-reply-offer="${esc(o.id)}" data-accept="0">Recusar</button></div><small class="muted">O aceite será revisado pela profissional antes da confirmação definitiva.</small></div>`;}).join(''):'<p class="muted">As propostas de horários serão liberadas após a integração da agenda.</p>'}</section>`:unavailable('Remarcações e lista de espera')}
   ${available.refunds&&claimable.length?`<section class="glass panel rc7-portal"><h2>Reembolsos disponíveis</h2>${claimable.map(a=>`<div class="row"><div><b>${esc(a.service_name_snapshot||'Atendimento')}</b><span>Valor do sinal: ${money(a.deposit_amount)}</span></div><button class="btn gold" data-request-refund="${esc(a.id)}">Escolher devolução</button></div>`).join('')}</section>`:''}
   ${available.refunds&&(data.refunds||[]).length?`<section class="glass panel rc7-portal"><h2>Devoluções solicitadas</h2>${data.refunds.map(r=>`<div class="row"><div><b>${money(r.amount)}</b><span>${r.destination==='credit'?'Crédito':'Pix'} • ${esc(r.status)}</span></div></div>`).join('')}</section>`:''}
   ${available.notifications?`<section class="glass panel rc7-portal"><h2>Avisos</h2>${todayMsg.map(n=>`<div class="rc7-notice"><b>${esc(n.event_type==='refund_completed'?'Reembolso concluído':n.event_type)}</b><p>${esc(n.body)}</p><small>${date(n.created_at)}</small></div>`).join('')||'<p class="muted">Nenhum aviso novo.</p>'}</section>`:unavailable('Avisos')}`;
  $$('[data-reply-offer]',extra).forEach(b=>b.onclick=async()=>{b.disabled=true;try{await DDB.replySlotOffer(b.dataset.replyOffer,b.dataset.accept==='1');await renderAccount(box,appointments);}catch(e){alert(message(e));}finally{b.disabled=false;}});
  $$('[data-request-refund]',extra).forEach(b=>b.onclick=()=>openRefundForm(b.dataset.requestRefund,box,appointments));
 }catch(e){console.error("Erro ao apresentar portal",e);extra.innerHTML=unavailable("Portal temporariamente indisponível");}
 finally{clientBusy=false;}
}
function openRefundForm(appointmentId,box,appointments){
 const existing=$('#rc7RefundForm',box);if(existing)existing.remove();
 const form=document.createElement('section');form.id='rc7RefundForm';form.className='glass panel rc7-refund';
 form.innerHTML=`<h2>Destino do sinal</h2><p class="muted">Escolha como deseja receber o valor reembolsável. Esta escolha será registrada uma única vez.</p><div class="form-grid"><label>Destino<select name="destination"><option value="pix">Receber por Pix</option><option value="credit">Manter como crédito na D&D</option></select></label><div class="rc7-pix-fields"><label>Tipo de chave Pix<select name="pixType"><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="phone">Telefone</option><option value="email">E-mail</option><option value="random">Aleatória</option></select></label><label>Chave Pix<input name="pixKey" autocomplete="off" required></label></div></div><div class="actions"><button class="btn gold" data-submit-refund>Enviar solicitação</button><button class="btn" data-cancel-refund>Voltar</button></div><p id="rc7RefundFeedback" class="muted"></p>`;
 box.prepend(form);form.scrollIntoView({behavior:'smooth',block:'center'});
 $('[name="destination"]',form).onchange=e=>$('.rc7-pix-fields',form).classList.toggle('hidden',e.target.value!=='pix');
 $('[data-cancel-refund]',form).onclick=()=>form.remove();
 $('[data-submit-refund]',form).onclick=async()=>{const destination=$('[name="destination"]',form).value,pixType=$('[name="pixType"]',form).value,pixKey=$('[name="pixKey"]',form).value.trim();if(destination==='pix'&&!window.DDBLogic.pixKeyValid(pixType,pixKey))return $('#rc7RefundFeedback',form).textContent='Confira o formato da chave Pix.';const btn=$('[data-submit-refund]',form);btn.disabled=true;try{await DDB.requestRefund(appointmentId,destination,destination==='pix'?pixType:null,destination==='pix'?pixKey:null);form.remove();await renderAccount(box,appointments);}catch(e){$('#rc7RefundFeedback',form).textContent=message(e);}finally{btn.disabled=false;}};
}
function renderAdmin(state,withPin,onRefresh){
 const root=$('#rc7Admin');if(!root||adminBusy)return;
 adminBusy=true;root.innerHTML='<div class="glass panel">Carregando pendências…</div>';
 (async()=>{
 try{
  const d=await DDB.rc7Admin();const appointments=state.appointments||[];
  const apptBy=new Map(appointments.map(a=>[a.id,a]));
  const wBy=new Map((d.waitlist||[]).map(w=>[w.id,w]));
  const offerBy=new Map((d.offers||[]).filter(o=>o.status==='accepted_pending_admin').map(o=>[o.waitlist_id,o]));
  const waiting=(d.waitlist||[]).filter(w=>['waiting','offer_pending','accepted_pending_admin'].includes(w.status));
  const pendingRefunds=(d.refunds||[]).filter(r=>r.destination==='pix'&&r.status==='pending');
  root.innerHTML=`<div class="rc7-admin-grid"><section class="glass panel rc7-admin-panel"><div class="between"><h2>Lista de espera</h2><b>${waiting.length}</b></div><p class="muted">Ordene por antiguidade ou confira quem cabe em uma vaga. A duração vem do agendamento original.</p><label>Adicionar atendimento afetado por imprevisto<select id="rc7QueueAppointment"><option value="">Escolha um atendimento</option>${appointments.filter(a=>a.status==='confirmed'&&!waiting.some(w=>w.appointment_id===a.id)).map(a=>`<option value="${esc(a.id)}">${esc(a.clientName)} • ${esc(a.serviceName||'Atendimento')}</option>`).join('')}</select></label><button type="button" class="btn" id="rc7QueueBtn">Adicionar à espera</button><div class="form-grid"><label>Tempo livre (minutos)<input type="number" min="0" step="15" id="rc7Minutes" placeholder="Ex.: 180"></label><label>Ordenar<select id="rc7Order"><option value="oldest">Mais tempo aguardando</option><option value="shortest">Procedimento mais curto</option><option value="longest">Procedimento mais longo</option></select></label></div><div id="rc7WaitRows"></div></section>
   <section class="glass panel rc7-admin-panel"><h2>Devoluções via Pix</h2><p class="muted">Realize o Pix manualmente antes de marcar como concluído.</p>${pendingRefunds.map(r=>{const a=apptBy.get(r.appointment_id);return `<div class="rc7-refund-row"><b>${esc(a?.clientName||'Cliente')} • ${money(r.amount)}</b><p>Chave Pix (${esc(r.pix_type)}): <code>${esc(r.pix_key)}</code></p><button class="btn gold" data-refund-done="${esc(r.id)}">Já transferi — concluir</button></div>`;}).join('')||'<p class="muted">Nenhum Pix pendente.</p>'}</section>
   <section class="glass panel rc7-admin-panel"><h2>Valores dos materiais</h2><p class="muted">Preços de desconto definidos pelas profissionais por cor/tamanho/pacote.</p><label>Profissional<select id="rc7PricePro">${(state.professionals||[]).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label><div id="rc7PriceRows"></div></section></div>`;
  // Módulos de RC7 ainda não migrados não devem exibir botões que inevitavelmente falharão.
  const adminSections=[...root.querySelectorAll('.rc7-admin-grid > section')];
  const waitlistReady=!!d.available?.waitlist && !!d.available?.offers;
  const refundReady=!!d.available?.refunds;
  const materialPricesReady=!!state.rc7Installed;
  if(!waitlistReady && adminSections[0])adminSections[0].innerHTML='<h2>Lista de espera</h2><p class="muted">A lista de espera e as propostas de horário ainda precisam ser ativadas no Supabase. Nenhum agendamento foi alterado.</p>';
  if(!refundReady && adminSections[1])adminSections[1].innerHTML='<h2>Devoluções por Pix</h2><p class="muted">Consulta de reembolsos indisponível no momento. Nenhuma transferência foi registrada.</p>';
  if(!materialPricesReady && adminSections[2])adminSections[2].innerHTML='<h2>Valores dos materiais</h2><p class="muted">O cadastro de preços por profissional ainda não foi ativado no Supabase.</p>';
  if(waitlistReady){
  function drawWaiting(){const mins=$('#rc7Minutes',root).value,sort=$('#rc7Order',root).value;const entries=waiting.map(w=>{const a=apptBy.get(w.appointment_id);return {...w,duration_minutes:a?.durationMinutes||0,clientName:a?.clientName||'',procedureName:a?.serviceName||a?.procedureId||'Atendimento'};});
   const ordered=window.DDBLogic.eligibleWaitlist(entries,mins,sort);const unknown=entries.filter(x=>!x.duration_minutes);const visible=mins===''?[...ordered,...unknown]:ordered;
   $('#rc7WaitRows',root).innerHTML=visible.map(w=>{const offer=offerBy.get(w.id);return `<div class="rc7-wait-row"><div class="between"><b>${esc(w.clientName||'Cliente')}</b><span>${w.duration_minutes?`${w.duration_minutes} min`:'Duração pendente'}</span></div><p class="muted">${esc(w.procedureName)} • esperando desde ${date(w.joined_at)}</p>${offer?`<p class="muted">Cliente aceitou ${date(offer.start_at)}. Confira a agenda e confirme a remarcação no módulo Agendamentos.</p><button class="btn" data-finish-offer="${esc(offer.id)}">Validar conclusão</button>`:`<button class="btn gold" data-send-offer="${esc(w.id)}">Propor horário</button>`}</div>`;}).join('')||'<p class="muted">Nenhuma cliente compatível.</p>';
   $$('[data-send-offer]',root).forEach(b=>b.onclick=()=>offerDialog(b.dataset.sendOffer,wBy.get(b.dataset.sendOffer),apptBy.get(wBy.get(b.dataset.sendOffer)?.appointment_id),onRefresh));
   $$('[data-finish-offer]',root).forEach(b=>b.onclick=async()=>{try{await DDB.finishSlotOffer(b.dataset.finishOffer);onRefresh();}catch(e){alert(message(e));}});
  }
  $('#rc7QueueBtn',root).onclick=async()=>{const id=$('#rc7QueueAppointment',root).value;if(!id)return alert('Escolha o agendamento afetado.');try{await DDB.adminQueueAffected(id);await onRefresh();}catch(e){alert(message(e));}};
  $('#rc7Minutes',root).oninput=drawWaiting;$('#rc7Order',root).onchange=drawWaiting;drawWaiting();
  } // waitlistReady
  if(materialPricesReady && $('#rc7PricePro',root)?.value){
  function drawPrices(){const pro=$('#rc7PricePro',root).value;const by=new Map((state.materialPrices||[]).filter(p=>p.professional_id===pro).map(p=>[p.material_variant_id,p.discount_unit_amount]));$('#rc7PriceRows',root).innerHTML=(state.materials||[]).flatMap(m=>(m.variants||[]).map(v=>`<div class="rc7-price-row"><label>${esc(m.name)} • ${esc([v.color,v.size].filter(Boolean).join(' • ')||'Padrão')}<input type="number" min="0" step="0.01" data-price-variant="${esc(v.id)}" value="${by.has(v.id)?esc(by.get(v.id)):''}" placeholder="Preço por pacote"></label><button class="btn" data-save-price="${esc(v.id)}">Salvar</button></div>`)).join('')||'<p class="muted">Nenhum material cadastrado.</p>';
  $$('[data-save-price]',root).forEach(b=>b.onclick=async()=>{const input=$(`[data-price-variant="${b.dataset.savePrice}"]`,root);if(!input.value.trim()||Number(input.value)<0)return alert('Informe o preço por pacote.');b.disabled=true;try{await DDB.saveMaterialPrice(pro,b.dataset.savePrice,Number(input.value));await onRefresh(true);alert('Preço registrado.');}catch(e){alert(message(e));}finally{b.disabled=false;}});
  }
  $('#rc7PricePro',root).onchange=drawPrices;drawPrices();
  } // materialPricesReady
  $$('[data-refund-done]',root).forEach(b=>b.onclick=()=>{const row=pendingRefunds.find(r=>r.id===b.dataset.refundDone);if(!row)return;if(!confirm(`O Pix de ${money(row.amount)} já foi realizado? Esta ação registra a conclusão financeira.`))return;withPin('concluir reembolso',async operatorId=>{await DDB.finishRefundRequest(row.id,operatorId);onRefresh();});});
 }catch(e){console.error('Falha ao carregar pendências',e);root.innerHTML='<section class="glass panel rc7-unavailable"><h2>Pendências temporariamente indisponíveis</h2><p class="muted">Não foi possível consultar o módulo. Seus registros não foram modificados; tente novamente depois de atualizar a página.</p></section>';}finally{adminBusy=false;}
 })();
}
function offerDialog(id,w,a,onRefresh){
 if(!a)return alert('Agendamento original não disponível.');
 const start=prompt('Novo início com fuso (ex.: 2026-10-18T09:00:00-03:00)');
 if(!start)return;
 const mins=Number(a.durationMinutes||0);
 if(!mins)return alert('A duração desse atendimento ainda não está disponível.');
 if(!/T\d{2}:\d{2}/.test(start)||!/([+-]\d{2}:\d{2}|Z)$/.test(start))return alert('Informe a data com horário e fuso, como 2026-10-18T09:00:00-03:00.');
 const d=new Date(start);
 if(Number.isNaN(d.getTime()))return alert('Data inválida');
 const end=new Date(d.getTime()+mins*60000);
 if(!confirm(`Oferecer ${date(d.toISOString())} a ${date(end.toISOString())} para ${a.clientName}? A confirmação definitiva ficará pendente.`))return;
 DDB.adminOfferSlot(id,d.toISOString(),end.toISOString()).then(async()=>{
   await onRefresh();
   const link=new URL(location.href);link.hash='#account';
   const template='Olá! Surgiu uma proposta de horário para seu atendimento na D&D Braids: '+date(d.toISOString())+'. Entre no portal para aceitar ou recusar: '+link.href;
   prompt('Proposta registrada. Copie a mensagem abaixo e envie manualmente no WhatsApp da cliente:',template);
 }).catch(e=>alert(message(e)));
}
window.DDBraidsRC7={renderAccount,renderAdmin};
})();
