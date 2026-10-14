/**
 * Regression test: cancelling with a paid deposit creates an admin-visible item
 * even before the client chooses Pix or credit. No production data or network.
 * Run: node tests/test_pending_refunds_layout.js
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.resolve(__dirname,'../rc7-ui.js'),'utf8');

async function render(refunds){
  const root={
    innerHTML:'',
    querySelectorAll(selector){
      return selector==='.rc7-admin-grid > section'
        ? [{innerHTML:''},{innerHTML:'',insertAdjacentHTML(){}}]
        : [];
    }
  };
  const document={
    querySelector:selector=>selector==='#rc7Admin'?root:null,
    querySelectorAll:()=>[]
  };
  const window={DDBLogic:{eligibleWaitlist:()=>[]}};
  const DDB={rc7Admin:async()=>({
    available:{waitlist:false,offers:false,refunds:true},
    waitlist:[],offers:[],refunds
  })};
  new Function('document','window','DDB',code)(document,window,DDB);
  const state={
    appointments:[
      {id:'a1',clientName:'Cliente Teste A',serviceName:'Tranças',date:'2026-10-20',
       status:'cancelled',refundStatus:'pending',bookingFeePaid:true,bookingFeeAmount:50},
      {id:'a2',clientName:'Cliente Teste B',serviceName:'Tranças',date:'2026-10-24',
       status:'cancelled',refundStatus:'pending',bookingFeePaid:true,bookingFeeAmount:50}
    ],
    professionals:[],materials:[],materialPricesReady:false
  };
  window.DDBraidsRC7.renderAdmin(state,()=>{},()=>{});
  await new Promise(resolve=>setTimeout(resolve,0));
  return root.innerHTML;
}

(async()=>{
  const initial=await render([]);
  assert.equal((initial.match(/rc7-admin-panel/g)||[]).length,2);
  assert(!initial.includes('Valores dos materiais'));
  assert(!initial.includes('rc7PricePro'));
  assert.equal((initial.match(/Aguardando a cliente escolher: Pix ou crédito/g)||[]).length,2);
  assert(initial.includes('Cliente Teste A')&&initial.includes('Cliente Teste B'));
  assert(initial.includes('Nenhum Pix aguardando transferência.'));
  assert(!initial.includes('Já transferi — concluir'));

  const pix=await render([{
    id:'r1',appointment_id:'a1',destination:'pix',status:'pending',
    amount:50,pix_type:'email',pix_key:'teste@example.com'
  }]);
  assert.equal((pix.match(/Aguardando a cliente escolher: Pix ou crédito/g)||[]).length,1);
  assert(pix.includes('Já transferi — concluir'));
  assert(pix.includes('teste@example.com'));
  assert.equal((pix.match(/Cliente Teste A/g)||[]).length,1);

  const credit=await render([{
    id:'r1',appointment_id:'a1',destination:'credit',status:'done',amount:50
  }]);
  assert(credit.includes('Outros destinos e histórico'));
  assert(!credit.includes('Já transferi — concluir'));
  assert(credit.includes('Crédito'));

  console.log('PASS: cancelled deposits, Pix transfers and credits in stacked admin sections');
})().catch(err=>{console.error(err);process.exitCode=1;});
