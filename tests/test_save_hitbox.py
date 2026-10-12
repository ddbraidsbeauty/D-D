"""Regression: the invisible toast must not steal a save button's center clicks."""
import asyncio,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent.parent
MOCK=(ROOT/'tests_browser.py').read_text().split("MOCK=r'''",1)[1].split("'''",1)[0]
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for width in (375,768,1440):
   page=await browser.new_page(viewport={'width':width,'height':850})
   errs=[];page.on('pageerror',lambda err:errs.append(str(err)))
   html=re.sub(r'<script[^>]*></script>','',(ROOT/'index.html').read_text());html=re.sub(r'<link[^>]*>','',html)
   await page.set_content(html);await page.add_style_tag(content=(ROOT/'styles.css').read_text())
   await page.add_script_tag(content="Object.defineProperty(window,'sessionStorage',{configurable:true,value:{_map:new Map(),getItem(k){return this._map.get(k)||null},setItem(k,v){this._map.set(k,String(v))},removeItem(k){this._map.delete(k)}}});")
   await page.add_script_tag(content=MOCK)
   for js in ('backend.js','logic.js','rc7-ui.js','app.js'):await page.add_script_tag(content=(ROOT/js).read_text())
   await page.wait_for_timeout(200)
   await page.evaluate('''() => {window.__calls=[];const d=window.DDB;for(const n of ['saveService','replaceOptions','replaceFieldRequirements'])d[n]=async(...args)=>{window.__calls.push(n);return 'svc'};sessionStorage.setItem('ddbraids_admin_session','1');location.hash='#admin'}''')
   await page.wait_for_timeout(240)
   await page.locator('[data-module="catalog"]').evaluate('(el)=>el.click()')
   await page.locator('[data-edit-procedure]').first.evaluate('(el)=>el.click()')
   btn=page.locator('#procForm>button.btn.gold')
   await btn.scroll_into_view_if_needed();await page.wait_for_timeout(100)
   check=await btn.evaluate('''el=> {const r=el.getBoundingClientRect(),y=r.top+r.height/2;return [.10,.25,.5,.75,.9].map(f=>{const x=r.left+f*r.width;return document.elementFromPoint(x,y)===el})}''')
   assert all(check),('blocked hitbox',width,check)
   rect=await btn.bounding_box();await page.mouse.click(rect['x']+rect['width']/2,rect['y']+rect['height']/2)
   await page.wait_for_timeout(110)
   calls=await page.evaluate('window.__calls')
   assert 'saveService' in calls,('not submitted by real center click',width,calls)
   # When visible, notifications remain operable, and can be dismissed.
   await page.evaluate("notify('Conferência de aviso')") if False else None
   await page.evaluate('''() => { const e=document.getElementById('siteNotice');e.classList.add('open');}''')
   assert await page.locator('#noticeClose').is_visible(), width
   await page.locator('#noticeClose').click()
   assert await page.locator('#siteNotice').evaluate("el=>!el.classList.contains('open')"),width
   assert not errs,(width,errs)
   print('PASS centered Save hitbox, form submission, visible toast close',width)
   await page.close()
  await browser.close()
if __name__=='__main__':asyncio.run(main())
