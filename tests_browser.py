import asyncio, subprocess, time, os, json
from playwright.async_api import async_playwright
DIR=os.path.dirname(__file__)
MOCK=r'''window.supabase={createClient(){
const cat={categories:[{id:'cat',name:'Tranças'}],services:[{id:'svc',name:'Box Braids',category_id:'cat',base_price:280,internal_duration_minutes:240,is_maintenance:false,deposit_mode:'percent',deposit_value:10}],methods:[{id:'met',service_id:'svc',name:'Tradicional'}],variations:[{id:'var',method_id:'met',name:'Médias',base_price_override:280}],options:[],materials:[{id:'jum',name:'Jumbo'},{id:'cur',name:'Cabelo cacheado'}],material_variants:[{id:'v1',material_id:'jum',color:'1B',size:'60cm'},{id:'v2',material_id:'jum',color:'27',size:'80cm'},{id:'v3',material_id:'cur',color:'1B',size:'longo'}],accessories:[]};
const rows={service_tags:[],service_material_requirements:[{service_id:'svc',method_id:'met',variation_id:'var',material_id:'jum',estimated_quantity:3},{service_id:'svc',method_id:'met',variation_id:'var',material_id:'cur',estimated_quantity:2}],service_accessories:[],service_field_requirements:[],ddb_material_prices:[{professional_id:'dany',material_variant_id:'v1',discount_unit_amount:18},{professional_id:'dany',material_variant_id:'v2',discount_unit_amount:24},{professional_id:'dany',material_variant_id:'v3',discount_unit_amount:15}],appointments:[],ddb_waitlist:[],ddb_offers:[],ddb_wallet_ledger:[],ddb_refund_requests:[],ddb_notifications:[]};
const rpcs={get_public_catalog:cat,get_public_professionals:[{id:'dany',public_name:'Dany',is_accepting:true}],get_public_brand_config:{},get_public_standard_consent:{text:'Li e compreendi.',version:'1'},get_public_schedule_config:{rules:[{professional_id:'dany',is_active:true,weekday:1,start_time:'08:00',end_time:'18:00'},{professional_id:'dany',is_active:true,weekday:2,start_time:'08:00',end_time:'18:00'},{professional_id:'dany',is_active:true,weekday:3,start_time:'08:00',end_time:'18:00'}],exceptions:[],sundays:[]},is_admin:false,public_available_slots:[]};
return {rpc:async(n,args)=>({data:rpcs[n]??null,error:null}),from:(n)=>({select:(c)=>({then:(res,rej)=>Promise.resolve({data:rows[n]||[],error:null}).then(res,rej),order:()=>Promise.resolve({data:rows[n]||[],error:null})})}),storage:{from:()=>({getPublicUrl:p=>({data:{publicUrl:p}})})},auth:{getSession:async()=>({data:{session:{user:{id:'abc',email:'x@y.com'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:null}),signInWithPassword:async()=>({data:{user:{id:'abc'}},error:null}),signUp:async()=>({data:{session:null},error:null})}}
}};'''
async def run():
 p=subprocess.Popen(['python','-m','http.server','8769','--directory',DIR],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 await asyncio.sleep(.7)
 try:
  async with async_playwright() as pw:
   browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
   page=await browser.new_page(viewport={'width':375,'height':800})
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   from pathlib import Path
   src=Path(DIR,'index.html').read_text()
   import re
   src=re.sub(r'<script[^>]*></script>','',src)
   src=re.sub(r'<link[^>]*>','',src)
   await page.set_content(src,wait_until='domcontentloaded')
   await page.add_style_tag(content=Path(DIR,'styles.css').read_text())
   await page.add_script_tag(content=MOCK)
   for js in ['backend.js','logic.js','rc7-ui.js','app.js']:
    await page.add_script_tag(content=Path(DIR,js).read_text())
   await page.wait_for_timeout(1200)
   print('page title:',await page.title())
   print('home cards:',await page.locator('#featured .card').count())
   print('page errors:',errors[:5])
   await page.screenshot(path='/mnt/data/dd_rc7_work/screenshot_mobile_home.png',full_page=True)
   await page.locator('#featured .book-procedure').first.click()
   await page.wait_for_timeout(200)
   print('initial step:',await page.locator('#stepLabel').inner_text())
   for selector in ['[data-procedure="svc"]','[data-method="met"]','[data-variation="var"]','[data-professional="dany"]']:
    if await page.locator(selector).count():
     await page.locator(selector).first.click(); await page.locator('#nextBtn').click(); await page.wait_for_timeout(80)
     print('->',await page.locator('#stepLabel').inner_text())
   print('on:',await page.locator('#stepLabel').inner_text())
   await page.locator('[data-provider=client]').click()
   for sel,val in [('[data-material-variant=jum]','v1'),('[data-material-variant=cur]','v3')]:await page.locator(sel).select_option(val)
   print('material text', (await page.locator('#bookingBody').inner_text())[-300:])
   await page.locator('#nextBtn').click()
   print('summary step:',await page.locator('#stepLabel').inner_text())
   print('summary values:',(await page.locator('#bookingBody').inner_text())[-240:])
   assert 'R$ 196,00' in (await page.locator('#bookingBody').inner_text()).replace('\xa0',' ')
   assert 'R$ 19,60' in (await page.locator('#bookingBody').inner_text()).replace('\xa0',' ')
   print('price UI assertion passed')
   await page.screenshot(path='/mnt/data/dd_rc7_work/screenshot_mobile_booking.png',full_page=True)
   print('errors after:',errors[:10]);
   # Client portal under signed-in mock session
   await page.evaluate("location.hash='#account'")
   await page.wait_for_timeout(500)
   assert await page.locator('#rc7ClientPortal').count()==1
   assert await page.get_by_text('Seus créditos').count()>=1
   print('portal rendering assertion passed')
   # Admin waitlist filtering reads already-existing appointment duration.
   await page.evaluate('''() => {
     const el=document.createElement('div');el.id='rc7Admin';document.body.appendChild(el);
     window.DDB.rc7Admin=async()=>({available:{waitlist:true,offers:true,refunds:true,ledger:true,notifications:true},waitlist:[{id:'w1',appointment_id:'a1',status:'waiting',joined_at:'2026-10-01'},{id:'w2',appointment_id:'a2',status:'waiting',joined_at:'2026-10-02'}],offers:[],refunds:[],ledger:[],notifications:[]});
     window.DDBraidsRC7.renderAdmin({appointments:[{id:'a1',clientName:'Ana',status:'confirmed',professionalId:'dany',durationMinutes:240},{id:'a2',clientName:'Bia',status:'confirmed',professionalId:'dany',durationMinutes:120}],professionals:[{id:'dany',name:'Dany'}],materials:[],materialPrices:[]},()=>{},()=>{});
   }''')
   await page.wait_for_timeout(350)
   assert await page.locator('#rc7WaitRows .rc7-wait-row').count()==2
   await page.locator('#rc7Minutes').fill('180')
   assert await page.locator('#rc7WaitRows .rc7-wait-row').count()==1
   print('waitlist UI filter assertion passed')
   assert not errors,errors
   print('all browser assertions passed')
   await browser.close()
 finally:p.terminate();p.wait()
asyncio.run(run())
