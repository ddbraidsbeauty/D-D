"""Browser interactions for modern hair profiles, empty material catalog and bounded variation tiles.
All Supabase writes are mocked; production records are never changed.
"""
import asyncio,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent.parent
MOCK=(ROOT/'tests_browser.py').read_text().split("MOCK=r'''",1)[1].split("'''",1)[0]

async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for width in (375,768,1440):
   page=await browser.new_page(viewport={'width':width,'height':900})
   errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
   html=re.sub(r'<script[^>]*></script>','',(ROOT/'index.html').read_text())
   html=re.sub(r'<link[^>]*>','',html)
   await page.set_content(html)
   await page.add_style_tag(content=(ROOT/'styles.css').read_text())
   await page.add_script_tag(content="Object.defineProperty(window,'sessionStorage',{configurable:true,value:{_map:new Map(),getItem(k){return this._map.get(k)||null},setItem(k,v){this._map.set(k,String(v))},removeItem(k){this._map.delete(k)}}});")
   await page.add_script_tag(content=MOCK)
   for n in ('backend.js','logic.js','rc7-ui.js','app.js'):
    await page.add_script_tag(content=(ROOT/n).read_text())
   await page.wait_for_timeout(350)
   await page.evaluate("location.hash='#booking'")
   await page.wait_for_timeout(150)
   # Procedure -> method -> variation, one available variation must not expand to IMAX size.
   await page.locator('[data-procedure="svc"]').click()
   await page.locator('#nextBtn').click()
   await page.locator('[data-method="met"]').click()
   await page.locator('#nextBtn').click()
   assert 'Variação' in await page.locator('#stepLabel').inner_text(),width
   tile=page.locator('[data-variation="var"]')
   box=await tile.bounding_box()
   img=await tile.locator('img').bounding_box()
   assert box['width']<=max(300,width-55) if width<=700 else box['width']<=300,(width,box)
   assert img['height']<=212,(width,img)
   print(f'PASS bounded variation tile {width}px: width={box["width"]:.1f}, image-height={img["height"]:.1f}')
   # Restore mock no-material state and ensure a reason is displayed to client.
   await page.evaluate('''() => {const s=window.DDBraids.getState();s.materials=[];s.materialRequirements=[];s.procedures[0].methods[0].variations[0].options.tags=['Detalhada'];}''')
   await page.locator('[data-variation="var"]').click();await page.locator('#nextBtn').click()
   assert 'Personalizações' in await page.locator('#stepLabel').inner_text(),width
   assert 'ainda não foram configurados' in await page.locator('#bookingBody').inner_text(),width
   # Modern versioned profile with an appointment, but no legacy anamneses rows.
   await page.evaluate('''() => {
     const d=window.DDB;
     d.isAdmin=async()=>true;
     window.__hairReview=[];
     d.reviewHairProfile=async(...args)=>{window.__hairReview.push(args);return 'new_profile_id'};
     d.adminSnapshot=async()=>({
       appointments:[{id:'appt1',client_id:'client1',service_id:'svc',method_id:'met',variation_id:'var',professional_id:'dany',scheduled_start:'2026-10-17T12:00:00Z',status:'pending_review',client_name_snapshot:'Cliente de teste',hair_profile_id:'profile1',created_at:'2026-10-11T00:00:00Z',total_amount:280}],
       anamneses:[],
       client_hair_profiles:[{id:'profile1',client_id:'client1',source_appointment_id:'appt1',answers:{hair_type:'Cacheado',pattern:'3B',natural_color:'2 — Castanho muito escuro',lightening_background:'Não se aplica / cabelo não clareado',density:'Alta',texture:'Natural',characteristic:'Normal',resistance:'Boa',porosity:'Normal',elasticity:'Normal',recent_chemistry:'Nenhuma',frequent_heat:['Nenhum'],problems:['Nenhum']},created_at:'2026-10-11T00:00:00Z'}],
       appointment_events:[],payments:[],appointment_materials:[],operational_tasks:[],internal_operators:[],professionals:[],professional_pix_keys:[],consents:[],audit_log:[],app_settings:[],whatsapp_templates:[]
     });
     location.hash='#account';
   }''')
   await page.wait_for_timeout(480)
   assert not await page.locator('#adminRoot').evaluate('(e)=>e.classList.contains("hidden")'),(width,'admin not open')
   appt=await page.evaluate('''() => {const s=window.DDBraids.getState();return {linked:s.appointments[0].anamnesisId,origin:s.anamneses[0].origin}}''')
   assert appt=={'linked':'profile1','origin':'profile'},(width,appt)
   await page.locator('[data-module="requests"]').evaluate('(el)=>el.click()')
   await page.locator('[data-review-anam="appt1"]').click()
   assert await page.locator('#modal').evaluate('(e)=>e.classList.contains("open")'),(width,'review did not open')
   assert 'Avaliação profissional' in await page.locator('#modalTitle').inner_text(),width
   assert await page.locator('[name="hairType"]').input_value()=='Cacheado',width
   await page.locator('#saveAnam').evaluate('(el)=>el.click()')
   await page.wait_for_timeout(250)
   calls=await page.evaluate('window.__hairReview')
   assert len(calls)==1 and calls[0][0]=='appt1' and calls[0][1]['hair_type']=='Cacheado',(width,calls)
   assert not errors,(width,errors)
   print(f'PASS admin versioned hair review, no legacy anamnesis, with mock save {width}px')
   await page.close()
  await browser.close()

if __name__=='__main__':asyncio.run(main())
