"""Browser smoke-test of actual distributed asset files with a fully mocked backend.

Sandbox policy blocks localhost/file main-frame navigation. We therefore keep the
page in about:blank and intercept same-origin subresources with real bytes from
this package. This exercises actual CSS/JS/image asset paths without network.
"""
from __future__ import annotations
import asyncio
import re
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parent.parent
MOCK=(ROOT/'tests_browser.py').read_text(encoding='utf-8').split("MOCK=r'''",1)[1].split("'''",1)[0]
ORIGIN='https://ddbraids.invalid/'

async def main():
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        for width,color in [(375,'light'),(768,'light'),(1440,'dark')]:
            page=await browser.new_page(viewport={'width':width,'height':850},color_scheme=color)
            errors=[];missing=[];loaded=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            async def deliver(route):
                rel=route.request.url.split(ORIGIN,1)[-1].split('?',1)[0]
                path=(ROOT/rel).resolve()
                if not path.is_relative_to(ROOT) or not path.is_file():
                    missing.append(rel)
                    return await route.fulfill(status=404,body='missing')
                loaded.append(rel)
                kind='image/jpeg' if rel.endswith('.jpg') else 'text/javascript' if rel.endswith('.js') else 'text/css' if rel.endswith('.css') else 'application/octet-stream'
                return await route.fulfill(status=200,content_type=kind,body=path.read_bytes())
            await page.route(f'{ORIGIN}**',deliver)
            await page.add_script_tag(content=MOCK)
            html=(ROOT/'index.html').read_text(encoding='utf-8')
            # The head scripts are loaded in deterministic dependency order below.
            html=re.sub(r'<script[^>]*></script>','',html)
            html=re.sub(r'<link[^>]*>','',html)
            html=html.replace('<head>','<head><base href="'+ORIGIN+'">',1)
            await page.set_content(html,wait_until='domcontentloaded')
            await page.add_style_tag(url=ORIGIN+'styles.css')
            for name in ['backend.js','logic.js','rc7-ui.js','app.js']:
                await page.add_script_tag(url=ORIGIN+name)
            await page.wait_for_timeout(800)
            assert not errors,(width,errors)
            assert not missing,(width,missing)
            assert await page.locator('#featured .card').count()>0,(width,'no cards')
            assert await page.locator("#featured .card img").first.evaluate("img => img.naturalWidth > 0"),(width,"featured image broken")
            dims=await page.evaluate('({viewport:innerWidth,scroll:document.documentElement.scrollWidth})')
            assert dims['scroll']<=dims['viewport']+2,(width,'horizontal overflow',dims)
            assert 'assets/demo/box.jpg' in await page.locator('#featured .card img').first.get_attribute('src')
            assert 'assets/demo/box.jpg' in loaded,(width,'featured image not requested')
            if width==375:
                await page.locator('#featured .book-procedure').first.click()
                for selector in ['[data-method="met"]','[data-variation="var"]','[data-professional="dany"]']:
                    assert await page.locator(selector).count(),(width,selector)
                    await page.locator(selector).first.click()
                    await page.locator('#nextBtn').click()
                await page.locator('[data-provider="client"]').click()
                for selector,val in [('[data-material-variant=jum]','v1'),('[data-material-variant=cur]','v3')]:
                    await page.locator(selector).select_option(val)
                await page.locator('#nextBtn').click()
                text=(await page.locator('#bookingBody').inner_text()).replace('\xa0',' ')
                assert 'R$ 196,00' in text and 'R$ 19,60' in text,text
                await page.evaluate('location.hash="#account"')
                await page.wait_for_timeout(400)
                assert await page.locator('#rc7ClientPortal').count()==1
                # Catalog text and image URLs must remain inert even if backend data is malformed.
                await page.evaluate('''() => {
                  window.__ddbInjected=0;
                  const db=window.DDBraids.getState();
                  const payload='<svg onload="window.__ddbInjected=1"></svg>';
                  db.procedures[0].name=payload;
                  db.procedures[0].image='x\" onerror=\"window.__ddbInjected=1';
                  db.professionals[0].name=payload;
                  db.professionals[0].image='javascript:alert(1)';
                  window.DDBraids.refresh();
                }''')
                await page.wait_for_timeout(150)
                assert await page.evaluate('window.__ddbInjected')==0,'unsafe catalog interpolation'
                assert await page.locator('#featured .card svg').count()==0,'catalog name injected markup'
                assert await page.locator('#homePros svg').count()==0,'professional name injected markup'
                assert not await page.locator('#homePros img').first.get_attribute('src'),'unsafe image URL was allowed'
            print(f'✓ Arquivos CSS/JS/imagens reais, navegação e responsividade — {width}px ({color})')
            await page.close()
        await browser.close()

if __name__=='__main__':
    asyncio.run(main())
