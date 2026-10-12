"""Admin interface cross-module regression with mocked network; no DB changes."""
import asyncio, re, json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent.parent
MOCK=(ROOT/'tests_browser.py').read_text().split("MOCK=r'''",1)[1].split("'''",1)[0]

async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  page=await browser.new_page(viewport={'width':1440,'height':900});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  html=(ROOT/'index.html').read_text();html=re.sub(r'<script[^>]*></script>','',html);html=re.sub(r'<link[^>]*>','',html)
  await page.set_content(html)
  await page.add_style_tag(content=(ROOT/'styles.css').read_text())
  await page.add_script_tag(content="Object.defineProperty(window,'sessionStorage',{configurable:true,value:{_map:new Map(),getItem(k){return this._map.get(k)||null},setItem(k,v){this._map.set(k,String(v))},removeItem(k){this._map.delete(k)}}});")
  await page.add_script_tag(content='''(()=>{ const old=EventTarget.prototype.addEventListener;EventTarget.prototype.addEventListener=function(type,handler,...args){if(type==='click' || type==='change' || type==='input' || type==='submit'){ this.__registeredListeners??={};this.__registeredListeners[type]=(this.__registeredListeners[type]||0)+1} return old.call(this,type,handler,...args);}})()''')
  await page.add_script_tag(content=MOCK)
  for js in ['backend.js','logic.js','rc7-ui.js','app.js']:
   await page.add_script_tag(content=(ROOT/js).read_text())
  await page.wait_for_timeout(500)
  await page.evaluate("sessionStorage.setItem('ddbraids_admin_session','1');location.hash='#admin';")
  await page.wait_for_timeout(300)
  rows=[]
  for module in ['overview','requests','bookings','workflows','clients','catalog','finance','professionals','posts','history','settings']:
   await page.locator(f'[data-module="{module}"]').evaluate('(el)=>el.click()')
   await page.wait_for_timeout(250)
   hits=await page.evaluate('''() => [...document.querySelectorAll('#moduleBody button,#moduleBody input,#moduleBody select,#moduleBody textarea')].map(el=>({tag:el.tagName,type:el.type, label:el.textContent.trim().slice(0,60)||el.getAttribute('placeholder')||el.getAttribute('id')||'',id:el.id||'',data:[...el.attributes].filter(a=>a.name.startsWith('data-')).map(a=>a.name),event:!!(el.onclick||el.onchange||el.oninput||el.onsubmit||el.__registeredListeners)}))''')
   for x in hits:
    rows.append({'module':module,**x})
   print(f'{module}: {len(hits)} controls, {sum(x["event"] for x in hits)} direct handlers, errors={len(errors)}')
  for x in rows:
   if x['tag']=='BUTTON' and not x['event']:
    print('NO_HANDLER',x['module'],x['label'],x['data'])
  await page.locator('[data-module="finance"]').evaluate('(el)=>el.click()')
  await page.wait_for_timeout(250)
  print('fees',await page.locator('[data-fee-row]').count())
  if await page.locator('[data-fee-row]').count():
   row=page.locator('[data-fee-row]').first
   print('before',await row.locator('[data-fee-value]').is_disabled(),await row.locator('[data-fee-type]:checked').get_attribute('value'))
   await row.locator('[data-fee-type][value="fixed"]').check()
   print('after',await row.locator('[data-fee-value]').is_disabled(),await row.locator('[data-fee-type]:checked').get_attribute('value'))
   await row.locator('[data-fee-value]').fill('30')
   print('value',await row.locator('[data-fee-value]').input_value())
  print('FINAL_ERRORS',errors)
  (ROOT/'tests'/'admin_audit_controls.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
  await browser.close()
if __name__=='__main__':asyncio.run(main())
