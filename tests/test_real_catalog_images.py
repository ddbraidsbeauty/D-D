"""Regressão: imagens fallback para nomes REAIS do Supabase, com prefixo GitHub Pages."""
import asyncio,json,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent.parent
BASE='https://ddbraidsbeauty.github.io/D-D-Braids-Beauty/'
TEST_MOCK=(ROOT/'tests_browser.py').read_text(encoding='utf-8').split("MOCK=r'''",1)[1].split("'''",1)[0]
services=[{'id':f's{i}','name':name,'category_id':'cat','base_price':0,'internal_duration_minutes':240,'is_maintenance':i==3,'deposit_mode':'none','deposit_value':0,'image_path':None} for i,name in enumerate(['Penteados','Tranças','Mega Hair','Manutenção'])]
cat={'categories':[{'id':'cat','name':'Catálogo'}], 'services':services,'methods':[],'variations':[],'options':[],'materials':[],'material_variants':[],'accessories':[],'tags':[]}
MOCK=re.sub(r'const cat=.*?;\s*const rows=', 'const cat='+json.dumps(cat,ensure_ascii=False)+';\nconst rows=',TEST_MOCK,count=1,flags=re.S)
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for width in (375,768,1440):
   page=await browser.new_page(viewport={'width':width,'height':900})
   errors=[];missing=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   async def deliver(route):
    rel=route.request.url.removeprefix(BASE).split('?',1)[0]
    p=(ROOT/rel).resolve()
    if not p.is_relative_to(ROOT) or not p.is_file():
     missing.append(rel);return await route.fulfill(status=404,body='missing')
    typ='image/jpeg' if rel.endswith('.jpg') else 'text/javascript' if rel.endswith('.js') else 'text/css'
    return await route.fulfill(status=200,content_type=typ,body=p.read_bytes())
   await page.route(BASE+'**',deliver)
   html=(ROOT/'index.html').read_text(encoding='utf-8')
   html=re.sub(r'<script[^>]*></script>','',html)
   html=re.sub(r'<link[^>]*>','',html)
   html=html.replace('<head>','<head><base href="'+BASE+'">',1)
   await page.set_content(html,wait_until='domcontentloaded')
   await page.add_style_tag(url=BASE+'styles.css')
   await page.add_script_tag(content=MOCK)
   for script in ('backend.js','logic.js','rc7-ui.js','app.js'):
    await page.add_script_tag(url=BASE+script)
   await page.wait_for_timeout(450)
   await page.evaluate('location.hash="#booking"')
   await page.wait_for_timeout(200)
   choices=page.locator('#bookingBody button.visual-choice')
   got=await choices.count()
   
   if got != 4:
    print('DEBUG',width,'errors',errors,'missing',missing,'booking', (await page.locator('#bookingBody').inner_text())[:500],'procs',await page.evaluate('window.DDBraids?.getState()?.procedures?.map(p=>p.name)'))
   assert got==4,(width,got)
   actual=await choices.locator('img').evaluate_all('(els)=>els.map(x=>({src:x.getAttribute("src"),loaded:x.complete&&x.naturalWidth>0}))')
   for idx,expected in enumerate(['nago.jpg','box.jpg','mega.jpg','maintenance.jpg']):
    assert actual[idx]['loaded'] and actual[idx]['src'].endswith(expected),(width,idx,actual[idx])
   assert not errors,(width,errors)
   assert not missing,(width,missing)
   print(f'PASSOU {width}px: 4 categorias reais com imagens locais corretas')
   await page.close()
  await browser.close()
if __name__=='__main__':asyncio.run(main())
