/**
 * Regressão: o painel admin não deve renderizar sem o catálogo do Supabase.
 * Execute: node tests/test_admin_catalog_load_order.js
 * Sem acesso à rede ou banco de produção.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const startup=fs.readFileSync(path.resolve(__dirname,'../src/80-startup.js'),'utf8');
const integration=fs.readFileSync(path.resolve(__dirname,'../src/70-integration.js'),'utf8');
const from=integration.indexOf('async function bootstrapBackendPublic(){');
const to=integration.indexOf('\nfunction authModal(',from);
assert(from>=0&&to>from,'bootstrap source is present');
const bootstrap=integration.slice(from,to);

const mock=`
let events=[];
let state={procedures:[],professionals:[],materials:[],accessories:[],settings:{publicSundays:[]},media:{},availability:{}};
let publicCatalogReady=false,KEY='test';
const localStorage={removeItem(){}},document={addEventListener(){}},HTMLImageElement=class{},window={};
const $=()=>({onclick:null,addEventListener(){},classList:{add(){},remove(){}}});
const closeModal=()=>{};
const DDB={publicData:async()=>{await Promise.resolve();await Promise.resolve();events.push('catalog-fetched');return {
  catalog:{categories:[],services:[{id:'service',name:'Tranças',base_price:10}],methods:[],variations:[],options:[],materials:[],material_variants:[],accessories:[]},
  professionals:[{id:'professional',public_name:'Dany'}],requirements:[],serviceAccessories:[],materialPrices:[],fieldReqs:[],rules:[],exceptions:[],sundays:[]
}}};
window.DDB=DDB;
const createDemoState=()=>({procedures:[]}),DEMO_IMAGES={nago:'',box:'',mega:'',maintenance:'',fulani:'',boho:'',goddess:''};
const assetUrl=()=>'',optionBucket=()=>({}),saveState=()=>{},getState=()=>state;
const renderHome=()=>events.push('render-home'),renderCatalog=()=>events.push('render-catalog'),refreshAdmin=()=>events.push('refresh-admin:'+state.procedures.length);
const routeHash=()=> 'home',renderBooking=()=>{},finishAuthCallback=()=>{},notify=()=>{},initPublic=()=>{},initAdmin=()=>{};
async function restoreAdminSessionOnLoad(){events.push('restore:'+state.procedures.length+':'+state.professionals.length);}
`;
const run=new Function(mock+bootstrap+startup+`
 return new Promise(resolve=>setTimeout(()=>resolve({events,state,ready:publicCatalogReady}),0));
`);
run().then(({events,state,ready})=>{
  assert(ready);
  assert.equal(state.procedures.length,1);
  assert.equal(state.professionals.length,1);
  assert(events.includes('refresh-admin:1'));
  assert(events.includes('restore:1:1'),'admin must restore only after catalog is ready');
  assert(events.indexOf('restore:1:1')>events.indexOf('catalog-fetched'));
  console.log('PASS: public catalog before returning admin, refreshed dashboard');
}).catch(error=>{console.error(error);process.exitCode=1;});
