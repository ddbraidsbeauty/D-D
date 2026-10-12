"""Regression for live Supabase seed: Fulani Braids/Knotless, no configured prices and missing images."""
from pathlib import Path
import asyncio, re, json
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent.parent
BASE='https://ddbraidsbeauty.github.io/D-D-Braids-Beauty/'
ORIGINAL=(ROOT/'tests_browser.py').read_text().split("MOCK=r'''",1)[1].split("'''",1)[0]
SERVICES=[{'id':'svc','name':'Tranças','category_id':'cat','base_price':0,'internal_duration_minutes':None,'deposit_mode':'none','deposit_value':0,'is_maintenance':False,'image_path':None}]
CAT={'categories':[{'id':'cat','name':'Catálogo'}],'services':SERVICES,'methods':[{'id':'met','name':'Fulani Braids','service_id':'svc','image_path':None,'base_price_override':None}],'variations':[{'id':'var','name':'Knotless','method_id':'met','image_path':None,'base_price_override':None}],'options':[],'materials':[],'material_variants':[],'accessories':[],'tags':[]}
MOCK=re.sub(r'const cat=.*?;\s*const rows=', 'const cat='+json.dumps(CAT,ensure_ascii=False)+';\nconst rows=',ORIGINAL,count=1,flags=re.S)
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for missing_asset in (False,True):
   page=await browser.new_page(viewport={'width':1280,'height':900})
   errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   async def serve(route):
    rel=route.request.url.removeprefix(BASE).split('?',1)[0]
    file=(ROOT/rel).resolve()
    if missing_asset and rel=='assets/demo/fulani.jpg':return await route.fulfill(status=404,body='missing')
    if not file.is_relative_to(ROOT) or not file.is_file():return await route.fulfill(status=404,body='missing')
    ty='image/jpeg' if rel.endswith('.jpg') else 'text/javascript' if rel.endswith('.js') else 'text/css'
    return await route.fulfill(status=200,content_type=ty,body=file.read_bytes())
   await page.route(BASE+'**',serve)
   html=(ROOT/'index.html').read_text()
   html=re.sub(r'<script[^>]*></script>','',html)
   html=re.sub(r'<link[^>]*>','',html).replace('<head>','<head><base href="'+BASE+'">',1)
   await page.set_content(html,wait_until='domcontentloaded')
   await page.add_style_tag(url=BASE+'styles.css')
   await page.add_script_tag(content=MOCK)
   for js in ('backend.js','logic.js','rc7-ui.js','app.js'):
    await page.add_script_tag(url=BASE+js)
   await page.wait_for_timeout(350)
   assert 'Valor a definir pela profissional' in await page.locator('#featured').inner_text(), 'catalog presented free price'
   await page.evaluate('location.hash="#booking"');await page.wait_for_timeout(100)
   await page.locator('[data-procedure="svc"]').click();await page.locator('#nextBtn').click()
   await page.locator('[data-method="met"]').click();await page.locator('#nextBtn').click()
   assert await page.locator('#stepLabel').inner_text()=='3. Variação'
   img=page.locator('[data-variation="var"] img')
   assert 'fulani.jpg' in await img.get_attribute('src'),await img.get_attribute('src')
   await page.locator('[data-variation="var"]').click();await page.locator('#nextBtn').click()
   assert await page.locator('#stepLabel').inner_text()=='4. Profissional'
   await page.locator('[data-professional="dany"]').click();await page.locator('#nextBtn').click()
   assert await page.locator('#stepLabel').inner_text()=='5. Resumo'
   summary=(await page.locator('#bookingBody').inner_text())
   assert 'A definir' in summary and 'R$ 0,00' not in summary,summary
   await page.locator('#nextBtn').click();await page.wait_for_timeout(50)
   assert await page.locator('#stepLabel').inner_text()=='5. Resumo','should not allow date selection with unconfigured price'
   assert 'ainda não foi configurado' in await page.locator('#siteNotice').inner_text()
   if missing_asset:
    img=page.locator('.summary-hero img')
    assert 'ddb-image-failed' in await img.get_attribute('class')
    assert await page.locator('.summary-hero .ddb-photo-placeholder').count()==1
   else:
    img=page.locator('.summary-hero img')
    assert await img.evaluate('(e)=>e.naturalWidth>0')
   assert not errors,errors
   print('PASS:', 'missing image placeholder' if missing_asset else 'real Fulani fallback', '+ unconfigured price guard')
   await page.close()
  await browser.close()
if __name__=='__main__':asyncio.run(main())
