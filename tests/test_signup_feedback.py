"""Registration UX: masked existing accounts, explicit duplicate errors and recovery."""
from pathlib import Path
import asyncio,re
from playwright.async_api import async_playwright
from test_client_portal_logout import MOCK
ROOT=Path(__file__).resolve().parent.parent

async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for width in (375,1440):
   page=await browser.new_page(viewport={'width':width,'height':850})
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   html=re.sub(r'<script[^>]*></script>','', (ROOT/'index.html').read_text())
   html=re.sub(r'<link[^>]*>','',html)
   await page.set_content(html)
   await page.add_style_tag(content=(ROOT/'styles.css').read_text())
   await page.add_script_tag(content=MOCK)
   for script in ('backend.js','logic.js','rc7-ui.js','app.js'):await page.add_script_tag(content=(ROOT/script).read_text())
   await page.evaluate('''window.__ActualURL=URL;window.URL=function(a,b){return new window.__ActualURL(a,b && b.startsWith('about:blank')?'https://ddbraids.example.test/':b)};window.__fake.signedIn=false;location.hash='#account';''')
   await page.wait_for_timeout(250)
   await page.locator('#accountLoginBtn').click()
   await page.locator('#clientAuthEmail').fill('ja@exemplo.com')
   await page.locator('#clientAuthPassword').fill('senha123')
   await page.evaluate('''window.DDB.signUp=async()=>({session:null});window.DDB.resetPassword=async()=>{};''')
   await page.locator('#clientSignUp').click()
   await page.get_by_text('Confira seu e-mail ou entre na sua conta').wait_for(timeout=5000)
   text=await page.locator('#clientSignUpFeedback').inner_text()
   assert 'Se já estiver cadastrado' in text and 'Esqueci a senha' in text,text
   assert 'Enviamos' not in text,text
   # Explicit duplicate API response yields a specific and actionable message.
   await page.evaluate('''() => {window.DDB.signUp=async()=>{throw {code:'user_already_exists',message:'User already registered'}};}''')
   await page.locator('#clientSignUp').click()
   await page.get_by_text('Este e-mail já está cadastrado').wait_for()
   assert 'Use Entrar' in (await page.locator('#clientSignUpFeedback').inner_text())
   await page.locator('#clientReset').click()
   await page.get_by_text('Se este e-mail estiver cadastrado').wait_for()
   assert not errors,errors
   print(f'PASS cadastro duplicado mascarado + explícito + recuperação {width}px')
   await page.close()
  await browser.close()
if __name__=='__main__':asyncio.run(main())
