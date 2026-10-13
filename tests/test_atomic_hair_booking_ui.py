"""RC8: Client repair UI and atomic front-end RPC call, with Supabase fully mocked."""
import asyncio,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent.parent
MOCK=(ROOT/'tests'/'test_client_portal_logout.py').read_text().split("MOCK='''",1)[1].split("'''",1)[0]

async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for width in (375,768,1440):
   page=await browser.new_page(viewport={'width':width,'height':850})
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   html=re.sub(r'<script[^>]*></script>','', (ROOT/'index.html').read_text())
   html=re.sub(r'<link[^>]*>','',html)
   await page.set_content(html)
   await page.add_style_tag(content=(ROOT/'styles.css').read_text())
   await page.add_script_tag(content=MOCK)
   for name in ('backend.js','logic.js','rc7-ui.js','app.js'): await page.add_script_tag(content=(ROOT/name).read_text())
   await page.evaluate('''() => {
     window.__profileIsLinked=false;window.__hairCalls=[];
     const d=window.DDB;
     d.myAppointments=async()=>[{id:'ap1',service_name_snapshot:'Tranças',professional_name_snapshot:'Dany',scheduled_start:'2026-10-30T14:00:00Z',status:'pending_review',hair_profile_id:window.__profileIsLinked?'profile1':null,deposit_status:'paid',deposit_amount:50}];
     d.completeMissingHairProfile=async(id,answers)=>{window.__hairCalls.push({id,answers});window.__profileIsLinked=true;return 'profile1';};
   }''')
   await page.evaluate('location.hash="#account"')
   await page.wait_for_timeout(300)
   btn=page.locator('#accountList .account-complete-hair')
   assert await btn.count()==1,(width,'missing repair CTA')
   assert 'Sinal pago' in await page.locator('#accountList').inner_text()
   await btn.click()
   assert await page.locator('#modal').evaluate('(e)=>e.classList.contains("open")')
   assert await page.locator('#modalBody [data-an="classification"]').count()==12
   await page.locator('#modalBody #saveMissingHair').click(); await page.wait_for_timeout(100)
   assert 'Ficha incompleta' in await page.locator('#noticeTitle').inner_text()
   data={'hairType':'Cacheado','classification':'3B','naturalColor':'3 — Castanho escuro','lighteningBackground':'Não se aplica / cabelo não clareado','density':'Alta','texture':'Fino','characteristic':'Normal','resistance':'Alta','porosity':'Média','elasticity':'Alta','recentChemistry':'Nenhuma'}
   for key,value in data.items():
    if key=='hairType':continue  # derived automatically from the selected illustrated classification
    if key=='classification':await page.locator(f'#modalBody [data-an="classification"][value="{value}"]').check()
    else:await page.locator(f'#modalBody [data-an="{key}"]').select_option(value)
   await page.locator('#modalBody [data-an-heat][value="Nenhum"]').check()
   await page.locator('#modalBody [data-an-problem][value="Nenhum"]').check()
   await page.locator('#saveMissingHair').click()
   await page.wait_for_timeout(250)
   calls=await page.evaluate('window.__hairCalls')
   assert len(calls)==1 and calls[0]['id']=='ap1' and calls[0]['answers']['classification']=='3B' and calls[0]['answers']['hairType']=='Cacheado',calls
   assert await page.locator('#accountList .account-complete-hair').count()==0,(width,'repair button not cleared after linking')
   assert 'Sinal pago' in await page.locator('#accountList').inner_text()
   assert not errors,(width,errors)
   print(f'PASS incomplete hair recovery UI {width}px: existing booking and deposit unchanged')
   # Regression: own materials still reach the server in the atomic flow.
   await page.evaluate("""() => {
     window.__materialRequest=null;
     window.DDB.sb.rpc=async(name,args)=>{
       if(name==='ddb_submit_booking_atomic_v1'){window.__materialRequest=args.p_payload;return {data:'booking-ok',error:null};}
       return {data:null,error:null};
     };
   }""")
   result=await page.evaluate("""() => window.DDB.submitBooking(
      {p_consent_accepted:true,p_brings_own_material:true,p_rc7_idempotency_key:'12345678-1234-1234-1234-123456789012'},
      {hairType:'Cacheado',classification:'3B'}
   )""")
   payload=await page.evaluate('window.__materialRequest')
   assert result=='booking-ok' and payload['p_brings_own_material'] is True,(width,'own material flag lost',payload)
   print(f'PASS own material flag reaches atomic RPC mock {width}px')
   await page.close()
  await browser.close()
if __name__=='__main__':asyncio.run(main())
