"""Simulated Supabase callbacks: catalog lag, same-browser and cross-browser restores."""
import asyncio, json, re, time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent.parent
MOCK=r'''
window.__fake={signedIn:true,userMeta:{full_name:'Cliente Teste'},sessionEmail:'teste@example.com',delay:350,rpcRequests:[],signUpOptions:null,updated:[]};
window.supabase={createClient(){
const cat={categories:[{id:'cat',name:'Tranças'}],services:[{id:'svc',name:'Tranças',category_id:'cat',base_price:280,is_active:true}],methods:[{id:'method',service_id:'svc',name:'Gypsy Braids'}],variations:[{id:'variation',method_id:'method',name:'Knotless'}],options:[],materials:[],material_variants:[],accessories:[],tags:[]};
const rpcData={get_public_catalog:cat,get_public_professionals:[{id:'pro',public_name:'Dany',is_accepting:true}],get_public_brand_config:{},get_public_standard_consent:{text:'Consentimento',version:'1'},get_public_schedule_config:{rules:[],exceptions:[],sundays:[]},is_admin:false};
const rows={service_tags:[],service_material_requirements:[],service_accessories:[],service_field_requirements:[],ddb_material_prices:[]};
return {
 rpc:async(name)=>{window.__fake.rpcRequests.push(name);if(name==='get_public_catalog')await new Promise(r=>setTimeout(r,window.__fake.delay));return {data:rpcData[name]??null,error:null}},
 from:name=>({select:()=>({then:(resolve,reject)=>Promise.resolve({data:rows[name]||[],error:null}).then(resolve,reject),order:()=>Promise.resolve({data:rows[name]||[],error:null})})}),
 storage:{from:()=>({getPublicUrl:path=>({data:{publicUrl:path}})})},
 auth:{getSession:async()=>({data:{session:window.__fake.signedIn?{user:{id:'user1',email:window.__fake.sessionEmail,user_metadata:window.__fake.userMeta}}:null}}),
 onAuthStateChange:callback=>{window.__fake.authCallback=callback;return {data:{subscription:{unsubscribe(){}}}}},
 updateUser:async payload=>{window.__fake.updated.push(payload);window.__fake.userMeta={...window.__fake.userMeta,...payload.data};return {data:{user:{}},error:null}},
 signUp:async opts=>{window.__fake.signUpOptions=opts;return {data:{session:null},error:null}},
 signOut:async()=>({error:null})}
};
}};
'''

async def create_page(browser,draft,remote,username='Cliente Teste',width=375,signed_in=True):
 page=await browser.new_page(viewport={'width':width,'height':900});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 html=re.sub(r'<script[^>]*></script>','',(ROOT/'index.html').read_text())
 html=re.sub(r'<link[^>]*>','',html)
 await page.set_content(html)
 await page.add_style_tag(content=(ROOT/'styles.css').read_text())
 await page.add_script_tag(content="""Object.defineProperty(window,'localStorage',{configurable:true,value:{store:{},getItem(k){return this.store[k]??null},setItem(k,v){this.store[k]=String(v)},removeItem(k){delete this.store[k]}}});history.replaceState=function(_a,_b,url){const target=String(url||'');if(target.includes('#'))location.hash=target.slice(target.indexOf('#'))};""")
 if not remote and draft:await page.evaluate('(d)=>localStorage.setItem("ddb_pending_booking_v2",JSON.stringify(d))',draft)
 await page.add_script_tag(content=MOCK+('window.__fake.signedIn=false;' if not signed_in else '')+(f'window.__fake.userMeta.ddb_booking_draft={json.dumps(draft)};' if remote else ''))
 for script in ('backend.js','logic.js','rc7-ui.js','app.js'):
  source=(ROOT/script).read_text()
  if script=='app.js':
   source=source.replace("function appBaseUrl(){ return new URL('./', location.href.split('#')[0].split('?')[0]).href; }","function appBaseUrl(){ return 'https://ddbraids.com.br/'; }")
  await page.add_script_tag(content=source)
 return page,errors

async def main():
 draft={'version':3,'stepId':'final','stepIndex':10,'createdAt':round(time.time()*1000),'booking':{'procedureId':'svc','methodId':'method','variationId':'variation','professionalId':'pro','date':'2026-10-19','time':'09:00','tags':['Teste']}}
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for width in (375,768,1440):
   for remote in (False,True):
    for stage in ('date','final'):
     fixture={**draft,'stepId':stage}
     page,errors=await create_page(browser,fixture,remote,width=width)
     await page.wait_for_function("document.querySelector('#stepLabel').textContent.includes("+json.dumps('Data' if stage=='date' else 'Seus dados')+")",timeout=9000)
     assert await page.evaluate('location.hash')=='#booking', (remote,width,await page.evaluate('location.href'))
     if stage=='final':assert await page.locator('#bookingBody input[data-booking-field="email"]').input_value()=='teste@example.com'
     assert await page.evaluate("localStorage.getItem('ddb_pending_booking_v2')") is not None
     assert await page.evaluate('window.__fake.updated.length') == (1 if remote else 0)
     assert not errors,(remote,width,errors)
     print(f'PASS {"cross-browser account metadata" if remote else "same-browser local draft"} {width}px stage={stage}')
     await page.close()
  page,errors=await create_page(browser,draft,False,signed_in=False)
  await page.wait_for_timeout(700)
  assert await page.evaluate("localStorage.getItem('ddb_pending_booking_v2')") is not None
  print('PASS unsigned session retains pending draft')
  await page.evaluate('''() => window.DDB.signUp('teste@example.com','testpass','Cliente','https://ddbraids.com.br/',{booking:{procedureId:'svc',date:'2026-10-19'},createdAt:Date.now()})''')
  opts=await page.evaluate('window.__fake.signUpOptions')
  assert opts['options']['emailRedirectTo']=='https://ddbraids.com.br/'
  assert opts['options']['data']['ddb_booking_draft']['booking']['procedureId']=='svc'
  print('PASS signup carries limited selection metadata and exact official redirect')
  assert not errors,errors
  await browser.close()
if __name__=='__main__':asyncio.run(main())
