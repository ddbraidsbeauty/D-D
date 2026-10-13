"""RC8 material-editor tests with simulated Supabase writes (never writes real records)."""
import asyncio,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent.parent
MOCK=(ROOT/'tests_browser.py').read_text().split("MOCK=r'''",1)[1].split("'''",1)[0]
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for width in (375,768,1440):
   p=await browser.new_page(viewport={'width':width,'height':900})
   errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   html=re.sub(r'<script[^>]*></script>','',(ROOT/'index.html').read_text());html=re.sub(r'<link[^>]*>','',html)
   await p.set_content(html);await p.add_style_tag(content=(ROOT/'styles.css').read_text())
   await p.add_script_tag(content="Object.defineProperty(window,'sessionStorage',{configurable:true,value:{_map:new Map(),getItem(k){return this._map.get(k)||null},setItem(k,v){this._map.set(k,String(v))},removeItem(k){this._map.delete(k)}}});")
   await p.add_script_tag(content=MOCK)
   for name in ('backend.js','logic.js','rc7-ui.js','app.js'):await p.add_script_tag(content=(ROOT/name).read_text())
   await p.wait_for_timeout(350)
   flags=await p.evaluate('''async()=>{const d=await window.DDB.publicData();return {price:d.materialPricesReady,all:d.rc7Installed}}''')
   assert flags=={'price':True,'all':False},(width,flags)
   await p.evaluate('''() => {window.__savedMaterials=[];window.DDB.isAdmin=async()=>true;window.DDB.saveMaterialComplete=async(x,rules)=>{window.__savedMaterials.push({material:x,rules});return 'material_new_id';};sessionStorage.setItem('ddbraids_admin_session','1');location.hash='#admin';}''')
   await p.wait_for_timeout(260)
   await p.locator('[data-module="catalog"]').evaluate('(el)=>el.click()')
   await p.locator('[data-new-material]').evaluate('(el)=>el.click()')
   assert await p.locator('[data-option-editor="materialColors"]').count()==1
   for col in ('Preto','Loiro'):
    inp=p.locator('[data-option-editor="materialColors"] [data-option-new]')
    await inp.fill(col);await p.locator('[data-option-editor="materialColors"] [data-add-option]').click()
   for size in ('100 cm','120 cm'):
    inp=p.locator('[data-option-editor="materialSizes"] [data-option-new]')
    await inp.fill(size);await p.locator('[data-option-editor="materialSizes"] [data-add-option]').click()
   assert await p.locator('#materialVariantChoices input').count()==4,(width,'missing combinations')
   await p.locator('#materialVariantChoices input').last.uncheck(force=True)
   await p.locator('#matForm [name="name"]').fill('Jumbo TESTE')
   await p.locator('#matForm [name="compat"][value="svc/met/var"]').check(force=True)
   await p.locator('#rc7QuantityEditor [data-quantity-index="0"]').fill('2')
   await p.locator('#matForm button.btn.gold').last.evaluate('(el)=>el.click()')
   await p.wait_for_timeout(200)
   calls=await p.evaluate('window.__savedMaterials')
   assert len(calls)==1,(width,calls)
   material,rules=calls[0]['material'],calls[0]['rules']
   assert len(material['variants'])==3,(width,material)
   assert set((v['color'],v['size']) for v in material['variants'])=={('Preto','100 cm'),('Preto','120 cm'),('Loiro','100 cm')},(width,material)
   assert len(rules)==1 and rules[0]['quantity']==2 and rules[0]['method_id']=='met',(width,rules)
   # Reopen an existing material. Only the two preconfigured combinations must
   # remain selected; the other two must NOT be reactivated on save.
   await p.evaluate('''() => {window.DDB.materialInternalCost=async()=>47.75;}''')
   await p.locator('[data-edit-material]').first.evaluate('(e)=>e.click()')
   await p.wait_for_timeout(90)
   assert await p.locator('#materialVariantChoices input').count()==4
   assert await p.locator('#materialVariantChoices input:checked').count()==2
   assert await p.locator('#matForm [name="internalCost"]').input_value()=='47.75'
   assert not errors,(width,errors)
   print(f'PASS {width}px: 4 combinations, existing choices preserved, atomic save mocked, other RC7 disabled')
   await p.close()
  await browser.close()
if __name__=='__main__':asyncio.run(main())
