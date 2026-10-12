const assert=require('node:assert/strict');const L=require('./logic');
let checks=0;let seed=774411;function rand(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
for(let i=0;i<1000;i++){
  const base=Math.round(rand()*100000)/100+1,extras=Math.round(rand()*10000)/100;
  const price=Math.round(rand()*2000)/100;
  const quantity=1+Math.floor(rand()*5);
  const original=L.cents(base)+L.cents(extras),discount=L.cents(price)*quantity;
  if(discount>original)continue;
  const fee={type:i%3===0?'percent':i%3===1?'fixed':'none',value:i%3===0?10:20};
  const q=L.quote({base,extras,bringsOwn:true,materials:[{unitPrice:price,quantity,valid:true}],fee});
  assert.equal(L.cents(q.final)+L.cents(q.discount),L.cents(q.original));
  assert.ok(q.deposit>=0&&q.deposit<=q.final);
  checks++;
}
for(let i=0;i<350;i++){
  const r=[{service_id:'s',material_id:'j',method_id:null,variation_id:null,estimated_quantity:2},{service_id:'s',material_id:'j',method_id:'m',variation_id:null,estimated_quantity:3},{service_id:'s',material_id:'j',method_id:'m',variation_id:'v',estimated_quantity:5}];
  for(let j=r.length-1;j>0;j--){let k=Math.floor(rand()*(j+1));[r[j],r[k]]=[r[k],r[j]];}
  const out=L.requirementsFor(r,{serviceId:'s',methodId:'m',variationId:'v'});
  assert.equal(out.length,1);assert.equal(out[0].quantity,5);checks++;
}
for(let i=0;i<350;i++){
  const rows=Array.from({length:10},(_,j)=>({id:j,status:j%3?'waiting':'resolved',duration_minutes:(j+1)*30,joined_at:new Date(Date.UTC(2026,9,1+j)).toISOString()}));
  const limit=30+Math.floor(rand()*300);
  const got=L.eligibleWaitlist(rows,limit,'oldest');
  assert.ok(got.every(x=>x.status==='waiting'&&x.duration_minutes<=limit));
  assert.ok(got.every((x,j)=>j===0||new Date(got[j-1].joined_at)<=new Date(x.joined_at)));checks++;
}
console.log(`Teste determinístico estendido: ${checks} verificações aprovadas (pricing / requisitos / lista).`);
