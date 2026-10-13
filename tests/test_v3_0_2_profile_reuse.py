"""D&D 3.0.2: stored hair profile lookup belongs to the authenticated client.

Runs a mocked browser only. It does not write to production Supabase.
"""
import asyncio
import time
from playwright.async_api import async_playwright
from test_email_redirect_restore import create_page


async def main():
    draft = {
        'version': 3, 'stepId': 'final', 'stepIndex': 10,
        'createdAt': round(time.time() * 1000),
        'booking': {
            'procedureId': 'svc', 'methodId': 'method',
            'variationId': 'variation', 'professionalId': 'pro',
            'date': '2026-10-19', 'time': '09:00', 'tags': ['Teste'],
        },
    }
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            executable_path='/usr/bin/chromium',
            headless=True,
            args=['--no-sandbox', '--disable-dev-shm-usage'],
        )
        for width in (375, 768, 1440):
            page, errors = await create_page(browser, draft, False, width=width)
            await page.wait_for_function(
                "() => document.querySelector('#stepLabel')?.textContent.includes('Seus dados')",
                timeout=9000,
            )
            await page.evaluate("""() => {
                window.__hairLookups=[];
                window.__hairMode='saved';
                window.__fake.verifiedUid='user1';
                window.DDB.sb.auth.getUser=async()=>({
                    data:{user:{id:window.__fake.verifiedUid,email:'teste@example.com'}},
                    error:null
                });
                const originalFrom=window.DDB.sb.from.bind(window.DDB.sb);
                window.DDB.sb.from=(table)=>{
                    if(table!=='client_hair_profiles')return originalFrom(table);
                    const query={
                        select(cols){window.__hairLookups.push(['select',cols]);return this;},
                        eq(k,v){window.__hairLookups.push(['eq',k,v]);return this;},
                        is(k,v){window.__hairLookups.push(['is',k,v]);return this;},
                        order(k,opts){window.__hairLookups.push(['order',k,opts.ascending]);return this;},
                        limit(n){window.__hairLookups.push(['limit',n]);return this;},
                        async maybeSingle(){
                            if(window.__hairMode==='error')return {data:null,error:{message:'network failure'}};
                            if(window.__hairMode==='none')return {data:null,error:null};
                            return {data:{
                                id:'hair-profile-1',client_id:'user1',version:3,
                                answers:{
                                    pattern:'2C',hair_type:'Ondulado',
                                    natural_color:'3 — Castanho escuro',
                                    density:'Média',texture:'Fino',
                                    resistance:'Alta',porosity:'Média',elasticity:'Alta',
                                    recent_chemistry:'Nenhuma'
                                }
                            },error:null};
                        }
                    };
                    return query;
                };
            }""")
            await page.locator('[data-booking-field="clientName"]').fill('Cliente Teste')
            await page.locator('[data-booking-field="phone"]').fill('31999999999')
            await page.locator('#nextBtn').click()
            await page.wait_for_function(
                "() => document.querySelector('#bookingBody')?.textContent.includes('Já encontramos uma ficha anterior.')"
            )
            qs = await page.evaluate('window.__hairLookups')
            assert ['eq', 'client_id', 'user1'] in qs, (width, qs)
            assert ['is', 'superseded_at', None] in qs, (width, qs)
            assert ['order', 'version', False] in qs, (width, qs)
            await page.locator('[data-hair-change="no"]').click()
            assert 'Ficha atual será reutilizada' in await page.locator('#bookingBody').inner_text()
            assert '2C' in await page.locator('#bookingBody').inner_text()
            print(f'PASS previous profile recognized and reusable {width}px')

            await page.locator('#backBtn').click()
            await page.evaluate("window.__hairMode='none'")
            await page.locator('#nextBtn').click()
            await page.wait_for_function(
                "() => document.querySelectorAll('#bookingBody [data-an=classification]').length===12"
            )
            assert 'Já encontramos uma ficha anterior.' not in await page.locator('#bookingBody').inner_text()
            print(f'PASS new client has new hair questionnaire {width}px')

            await page.locator('#backBtn').click()
            await page.evaluate("window.__hairMode='error'")
            await page.locator('#nextBtn').click()
            await page.wait_for_timeout(100)
            assert 'Seus dados' in await page.locator('#stepLabel').inner_text()
            assert 'Não foi possível consultar' in await page.locator('#noticeText').inner_text()
            print(f'PASS query error blocks accidental new questionnaire {width}px')

            await page.evaluate("window.__hairMode='saved';window.__fake.verifiedUid='another-user'")
            await page.locator('#nextBtn').click()
            await page.wait_for_timeout(100)
            assert 'Seus dados' in await page.locator('#stepLabel').inner_text()
            assert not errors, (width, errors)
            print(f'PASS mixed session cannot reuse another account profile {width}px')
            await page.close()
        await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
