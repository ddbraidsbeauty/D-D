"""Interactive tests for individual catalog options; Supabase requests are mocked."""
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
   html=re.sub(r'<script[^>]*></script>','', (ROOT/'index.html').read_text());html=re.sub(r'<link[^>]*>','',html)
   await page.set_content(html);await page.add_style_tag(content=(ROOT/'styles.css').read_text());await page.add_script_tag(content="Object.defineProperty(window,'sessionStorage',{configurable:true,value:{_map:new Map(),getItem(k){return this._map.get(k)||null},setItem(k,v){this._map.set(k,String(v))},removeItem(k){this._map.delete(k)}}});")
   await page.add_script_tag(content=MOCK)
   for js in ('backend.js','logic.js','rc7-ui.js','app.js'):await page.add_script_tag(content=(ROOT/js).read_text())
   await page.wait_for_timeout(250)
   await page.evaluate('''() => {window.__calls=[];const d=window.DDB;for(const n of ['saveService','saveMethod','saveVariation','replaceOptions','replaceFieldRequirements'])d[n]=async(...args)=>{window.__calls.push({name:n,args});return n==='saveService'?'svc':n==='saveMethod'?'met':n==='saveVariation'?'var':null};sessionStorage.setItem('ddbraids_admin_session','1');location.hash='#admin'}''')
   await page.wait_for_timeout(220)
   await page.locator('[data-module="catalog"]').evaluate('(el)=>el.click()')
   await page.wait_for_timeout(90)
   async def check(title,selector,form):
    await page.locator(selector).first.evaluate('(el)=>el.click()');await page.wait_for_timeout(50)
    assert title.lower() in (await page.locator('#modalTitle').inner_text()).lower()
    assert await page.locator('[data-option-editor]').count()==3
    tags=page.locator('[data-option-editor="tags"]');sizes=page.locator('[data-option-editor="sizes"]');thicks=page.locator('[data-option-editor="thicknesses"]')
    await tags.locator('[data-option-new]').fill('Cacheado')
    await tags.locator('[data-option-new]').press('Enter')
    assert await tags.locator('[data-option-item]').count()==1,'Enter should append, not submit'
    await tags.locator('[data-option-item] input').fill('Ondulado')
    await tags.locator('[data-option-new]').fill('ONDULADO')
    await tags.locator('[data-add-option]').click()
    assert await tags.locator('[data-option-item]').count()==1,'Case-folding should block duplicates'
    await tags.locator('[data-option-new]').fill('')
    await sizes.locator('[data-option-new]').fill('Chanel');await sizes.locator('[data-add-option]').click()
    await sizes.locator('[data-option-new]').fill('Médio');await sizes.locator('[data-add-option]').click()
    assert await sizes.locator('[data-option-item]').count()==2
    await sizes.locator('[data-option-item]').first.locator('[data-remove-option]').click()
    assert await sizes.locator('[data-option-item] input').input_value()=='Médio'
    # draft is intentionally saved even if the user forgets to press Add
    await thicks.locator('[data-option-new]').fill('Fina')
    await page.locator(form+' [name="name"]').fill('Teste de catálogo')
    await page.locator(form+' button[type="submit"],'+form+' > button.btn.gold').last.evaluate('(el)=>el.click()')
    await page.wait_for_timeout(110)
    calls=await page.evaluate('window.__calls')
    replacing=[x for x in calls if x['name']=='replaceOptions']
    assert replacing,(width,title,calls)
    vals=replacing[-1]['args'][3]
    def group(g):return [x['name'] for x in vals if x['group']==g]
    assert group('Características')==['Ondulado'],(width,title,vals)
    assert group('Tamanho')==['Médio'],(width,title,vals)
    assert group('Espessura')==['Fina'],(width,title,vals)
    assert not errs,(width,title,errs)
    await page.locator('#closeModal').evaluate('(e)=>e.click()')
    await page.evaluate('window.__calls=[]')
   await check('Editar procedimento','[data-edit-procedure]','#procForm')
   await page.locator('[data-module="catalog"]').evaluate('(e)=>e.click()');await page.locator('[data-methods]').first.evaluate('(e)=>e.click()')
   await page.locator('#newMethod').evaluate('(e)=>e.click()')
   assert await page.locator('#methodForm [data-option-editor]').count()==3
   # Save method-level options using the same backend contract.
   await page.locator('#methodForm [name="name"]').fill('Método Novo')
   await page.locator('#methodForm [data-option-editor="tags"] [data-option-new]').fill('Detalhada')
   await page.locator('#methodForm [data-option-editor="tags"] [data-add-option]').click()
   await page.locator('#methodForm [data-option-editor="sizes"] [data-option-new]').fill('Longo')
   await page.locator('#methodForm [data-option-editor="sizes"] [data-add-option]').click()
   await page.locator('#methodForm > button.btn.gold').evaluate('(e)=>e.click()')
   await page.wait_for_timeout(120)
   calls=await page.evaluate('window.__calls')
   assert any(c['name']=='saveMethod' for c in calls),(width,calls)
   opts=[c['args'][3] for c in calls if c['name']=='replaceOptions'][-1]
   assert any(o['group']=='Características' and o['name']=='Detalhada' and o['requires_description'] for o in opts),(width,opts)
   assert any(o['group']=='Tamanho' and o['name']=='Longo' for o in opts),(width,opts)
   await page.locator('#closeModal').evaluate('(e)=>e.click()')
   await page.evaluate('window.__calls=[]')
   await page.locator('[data-module="catalog"]').evaluate('(e)=>e.click()');await page.locator('[data-methods]').first.evaluate('(e)=>e.click()')
   await page.locator('[data-vars]').first.evaluate('(e)=>e.click()')
   await page.locator('#newVariation').evaluate('(e)=>e.click()')
   assert await page.locator('#varForm [data-option-editor]').count()==3
   await page.locator('#varForm [name="name"]').fill('Variação Nova')
   await page.locator('#varForm [data-option-editor="thicknesses"] [data-option-new]').fill('Grossa')
   await page.locator('#varForm [data-option-editor="thicknesses"] [data-option-new]').press('Enter')
   assert await page.locator('#varForm [data-option-editor="thicknesses"] [data-option-item]').count()==1
   await page.locator('#varForm > button.btn.gold').evaluate('(e)=>e.click()')
   await page.wait_for_timeout(120)
   calls=await page.evaluate('window.__calls')
   assert any(c['name']=='saveVariation' for c in calls),(width,calls)
   opts=[c['args'][3] for c in calls if c['name']=='replaceOptions'][-1]
   assert any(o['group']=='Espessura' and o['name']=='Grossa' for o in opts),(width,opts)
   assert not errs,(width,errs)
   print('PASS edit/add/remove/Enter/save procedure + method/variation editors',width)
   await page.close()
  await browser.close()
if __name__=='__main__':asyncio.run(main())
