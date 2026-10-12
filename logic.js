/* D&D Braids — regras puras, sem Supabase ou DOM; usadas no site e nos testes. */
(function(root, factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.DDBLogic=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  function cents(n){ if(!Number.isFinite(Number(n))) throw Error('Valor inválido'); return Math.round((Number(n)+Number.EPSILON)*100); }
  function fromCents(n){return Math.round(n)/100;}
  function money(n){return fromCents(cents(n));}
  function requirementMatches(r,b){return String(r.service_id)===String(b.serviceId) && (!r.method_id || String(r.method_id)===String(b.methodId)) && (!r.variation_id || String(r.variation_id)===String(b.variationId));}
  function requirementsFor(requirements,b){
    const ranked=(requirements||[]).filter(r=>requirementMatches(r,b)).map(r=>({...r,priority:(r.variation_id?2:r.method_id?1:0)})).sort((a,b)=>b.priority-a.priority);
    const byMat=new Map();for(const r of ranked){if(!byMat.has(String(r.material_id)))byMat.set(String(r.material_id),r);}
    return [...byMat.values()].map(r=>({...r,quantity:Number(r.estimated_quantity)})).sort((a,b)=>String(a.material_id).localeCompare(String(b.material_id)));
  }
  function resolveMaterials({requirements,materials,prices,booking}){
    const rows=requirementsFor(requirements,{serviceId:booking.serviceId,methodId:booking.methodId,variationId:booking.variationId});
    return rows.map(r=>{
      const material=(materials||[]).find(m=>String(m.id)===String(r.material_id));
      const chosenId=booking.materialChoices?.[r.material_id];
      const variant=material?.variants?.find(v=>String(v.id)===String(chosenId));
      const price=(prices||[]).find(p=>String(p.professional_id)===String(booking.professionalId)&&String(p.material_variant_id)===String(variant?.id));
      const unit=price?.discount_unit_amount;
      const valid=!!material&&Number.isFinite(r.quantity)&&r.quantity>0&&!!variant&&unit!==undefined&&unit!==null&&Number(unit)>=0;
      return {materialId:r.material_id,name:material?.name||'',quantity:r.quantity,variantId:variant?.id||'',color:variant?.color||'',size:variant?.size||'',unitPrice:valid?money(unit):null,subtotal:valid?fromCents(cents(unit)*r.quantity):null,valid};
    });
  }
  function quote({base,extras=0,materials=[],bringsOwn=false,fee={type:'none',value:0}}){
    const initial=cents(base)+cents(extras);
    if(initial<0)throw Error('Preço inválido');
    const discount=bringsOwn?materials.reduce((sum,r)=>{if(!r.valid)throw Error('Material sem preço ou variação configurados');return sum+cents(r.unitPrice)*r.quantity;},0):0;
    if(bringsOwn && !materials.length)throw Error('Sem materiais configurados para desconto');
    if(discount>initial)throw Error('Desconto ultrapassa o preço do procedimento');
    const final=fromCents(initial-discount);
    let deposit=fee.type==='fixed'?cents(fee.value||0):fee.type==='percent'?Math.round((initial-discount)*Number(fee.value||0)/100):0;
    deposit=Math.min(Math.max(0,deposit),initial-discount);
    return {original:fromCents(initial),discount:fromCents(discount),final,deposit:fromCents(deposit)};
  }
  function eligibleWaitlist(rows,minutes,sort='oldest'){
    const list=(rows||[]).filter(r=>r.status==='waiting' && Number(r.duration_minutes)>0);
    const filtered=Number.isFinite(Number(minutes))&&minutes!==null&&minutes!==''?list.filter(r=>Number(r.duration_minutes)<=Number(minutes)):list;
    return [...filtered].sort((a,b)=>sort==='shortest'?Number(a.duration_minutes)-Number(b.duration_minutes)||new Date(a.joined_at)-new Date(b.joined_at):sort==='longest'?Number(b.duration_minutes)-Number(a.duration_minutes)||new Date(a.joined_at)-new Date(b.joined_at):new Date(a.joined_at)-new Date(b.joined_at));
  }
  function canTransitionOffer(from,to){return (from==='proposed'&&['accepted','declined','expired','cancelled'].includes(to));}
  function pixKeyValid(type,key){const k=String(key||'').trim();if(!k||k.length>120)return false;if(type==='email')return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(k);if(type==='phone')return /^\+?\d{10,15}$/.test(k.replace(/[\s()-]/g,''));if(type==='cpf')return /^\d{11}$/.test(k.replace(/\D/g,''));if(type==='cnpj')return /^\d{14}$/.test(k.replace(/\D/g,''));if(type==='random')return /^[0-9a-fA-F-]{32,36}$/.test(k);return false;}
  return {cents,requirementsFor,resolveMaterials,quote,eligibleWaitlist,canTransitionOffer,pixKeyValid};
});
