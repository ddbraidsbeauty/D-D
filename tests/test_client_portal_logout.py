"""RC8 portal regression: missing optional tables must not hide available data, logout clears UI/session."""
from pathlib import Path
import asyncio,re
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent.parent
MOCK='''
window.__fake={signedIn:true,signoutCalls:0};
window.supabase={createClient(){
const catalog={categories:[{id:'cat',name:'Catálogo'}],services:[{id:'svc',category_id:'cat',name:'Tranças',base_price:0,is_active:true}],methods:[],variations:[],options:[],tags:[],accessories:[],materials:[],material_variants:[]};
const rows={appointments:[{id:'ap1',service_name_snapshot:'Tranças',professional_name_snapshot:'Dany',scheduled_start:'2026-10-17T12:00:00Z',status:'pending_review',deposit_status:'not_required',deposit_amount:0}],ddb_refund_requests:[],ddb_wallet_ledger:[{id:'credit',amount:30}],ddb_notifications:[{event_type:'refund_completed',body:'Teste de notificação',created_at:'2026-10-12T12:00:00Z'}],service_tags:[],service_material_requirements:[],service_accessories:[],service_field_requirements:[],professional_service_settings:[],ddb_material_prices:[]};
const rpcs={get_public_catalog:catalog,get_public_professionals:[{id:'dany',public_name:'Dany'}],get_public_brand_config:{},get_public_standard_consent:{text:'Termos',version:'1'},get_public_schedule_config:{rules:[],exceptions:[],sundays:[]},is_admin:false};
const q=(name)=>({select:(_cols)=>{const result=()=>Promise.resolve(name==='ddb_waitlist'||name==='ddb_offers'?{data:null,error:{code:'PGRST205',message:'relation does not exist'}}:{data:rows[name]||[],error:null});return {then:(res,rej)=>result().then(res,rej),order:(_ord)=>result()};}});
return {rpc:async(n)=>({data:rpcs[n]??null,error:null}),from:q,storage:{from:()=>({getPublicUrl:path=>({data:{publicUrl:path}})})},auth:{getSession:async()=>({data:{session:window.__fake.signedIn?{user:{id:'testclient',email:'teste@exemplo.com'}}:null}}),signOut:async()=>{window.__fake.signedIn=false;window.__fake.signoutCalls++;return {error:null}},onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};
}};
'''
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for width in (375,768,1440):
   page=await browser.new_page(viewport={'width':width,'height':850})
   errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
   html=(ROOT/'index.html').read_text()
   html=re.sub(r'<script[^>]*></script>','',html)
   html=re.sub(r'<link[^>]*>','',html)
   await page.set_content(html)
   await page.add_style_tag(content=(ROOT/'styles.css').read_text())
   await page.add_script_tag(content=MOCK)
   for script in ('backend.js','logic.js','rc7-ui.js','app.js'):
    await page.add_script_tag(content=(ROOT/script).read_text())
   await page.evaluate('location.hash="#account"')
   await page.wait_for_timeout(400)
   assert await page.locator('#logoutClient').count()==1,'logout button absent'
   text=await page.locator('#accountList').inner_text()
   assert 'Tranças' in text and 'Seus créditos' in text and 'R$ 30,00' in text.replace('\u00a0',' '),text
   assert 'Remarcações e lista de espera' in text and 'aguardando ativação' in text.lower(),text
   assert 'Teste de notificação' in text,text
   await page.locator('#logoutClient').click()
   await page.wait_for_timeout(250)
   assert await page.locator('#logoutClient').count()==0,'button visible after signout'
   assert await page.get_by_text('Entrar / criar conta').count()==1,'login prompt not shown after signout'
   assert 'Tranças' not in (await page.locator('#accountList').inner_text()),'prior appointment leaked'
   assert 'R$ 30' not in (await page.locator('#accountList').inner_text()),'prior wallet leaked'
   assert await page.evaluate('window.__fake.signoutCalls')==1,'signout not called once'
   assert not errors,errors
   print(f'PASS portal partial modules + logout {width}px')
   await page.close()
  await browser.close()
if __name__=='__main__': asyncio.run(main())
