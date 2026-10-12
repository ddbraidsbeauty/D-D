"""Real Chromium interaction regression for all Catalog buttons + Clients + schedule details.
Uses a mocked public read-only Supabase response; NEVER creates real database records.
"""
import asyncio,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent.parent
MOCK=(ROOT/'tests_browser.py').read_text().split("MOCK=r'''",1)[1].split("'''",1)[0]

async def test():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for width in (375,768,1440):
   page=await browser.new_page(viewport={'width':width,'height':850})
   errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
   html=(ROOT/'index.html').read_text()
   html=re.sub(r'<script[^>]*></script>','',html)
   html=re.sub(r'<link[^>]*>','',html)
   await page.set_content(html)
   await page.add_style_tag(content=(ROOT/'styles.css').read_text())
   await page.add_script_tag(content="Object.defineProperty(window,'sessionStorage',{configurable:true,value:{_map:new Map(),getItem(k){return this._map.get(k)||null},setItem(k,v){this._map.set(k,String(v))},removeItem(k){this._map.delete(k)}}});")
   await page.add_script_tag(content=MOCK)
   for js in ['backend.js','logic.js','rc7-ui.js','app.js']:
    await page.add_script_tag(content=(ROOT/js).read_text())
   await page.wait_for_timeout(450)
   await page.evaluate('''() => {
     sessionStorage.setItem('ddbraids_admin_session','1');
     location.hash='#admin';
   }''')
   await page.wait_for_timeout(250)
   await page.evaluate('''() => {
     document.querySelector('[data-module="catalog"]').click();
   }''')
   await page.wait_for_timeout(200)
   assert not errors,(width,'Catalog opening caused JS error',errors)
   checks=[('[data-new-procedure]','Novo procedimento'),('[data-edit-procedure]','Editar procedimento'),('[data-methods]','Métodos'),('[data-new-material]','Novo material'),('[data-new-accessory]','Novo acessório')]
   for selector,heading in checks:
    await page.locator(selector).first.evaluate('(el)=>el.click()')
    await page.wait_for_timeout(60)
    title=await page.locator('#modalTitle').inner_text()
    assert heading.lower() in title.lower(),(width,selector,title,heading)
    assert await page.locator('#modal').evaluate('(el)=>el.classList.contains("open")'),(width,selector,'modal not open')
    assert not errors,(width,selector,errors)
    await page.locator('#closeModal').evaluate('(el)=>el.click()')
   # Methods and nested variations are reachable from the catalog.
   await page.locator('[data-methods]').first.evaluate('(el)=>el.click()')
   await page.locator('#newMethod').evaluate('(el)=>el.click()')
   assert 'Novo método' in await page.locator('#modalTitle').inner_text()
   await page.locator('#closeModal').evaluate('(el)=>el.click()')
   # Clients used to throw ReferenceError as well. Verify profile dialog shows snapshots.
   await page.evaluate('''() => {
      window.DDBraids.getState().appointments=[{id:'a-01',clientName:'Cliente Teste',phone:'(33) 99999-9999',email:'teste@exemplo.com',status:'confirmed',date:'2026-10-17',time:'09:00',professionalId:'dany',procedureId:'svc',createdAt:1}];
      document.querySelector('[data-module="clients"]').click();
   }''')
   await page.wait_for_timeout(120)
   assert not errors,(width,'Clients opening',errors)
   await page.locator('[data-client]').first.evaluate('(el)=>el.click()')
   assert 'Perfil da cliente' in await page.locator('#modalTitle').inner_text()
   assert 'Cliente Teste' in await page.locator('#modalBody').inner_text()
   await page.locator('#closeModal').evaluate('(el)=>el.click()')
   # A previously missing booking editor should no longer throw.
   await page.evaluate('document.querySelector(\'[data-module="bookings"]\').click()')
   await page.wait_for_timeout(150)
   assert not errors,(width,'Bookings opening',errors)
   # The test may need to select the day in the mocked calendar.
   count=await page.locator('[data-edit-booking]').count()
   if count:
    await page.locator('[data-edit-booking]').first.evaluate('(el)=>el.click()')
    assert 'Detalhes' in await page.locator('#modalTitle').inner_text()
   assert not errors,(width,errors)
   print(f'PASS Catalog 5 buttons, Methods, Clients, Bookings — {width}px')
   await page.close()
  await browser.close()
if __name__=='__main__':asyncio.run(test())
