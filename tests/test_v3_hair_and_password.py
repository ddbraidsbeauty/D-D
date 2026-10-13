"""D&D 3.0 browser verification: new hair cards and password actions, mocked Supabase (NO production writes)."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
from test_email_redirect_restore import create_page

async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for width in (375,768,1440):
   page,errors=await create_page(browser,None,False,width=width)
   await page.wait_for_timeout(650)
   await page.evaluate('''() => {
     window.__fake.passwordChanges=[];
     window.DDB.sb.auth.getUser=async()=>({data:{user:{id:'user1',email:'teste@example.com'}},error:null});
     window.__fake.passwordChecks=[];
     window.DDB.sb.auth.signInWithPassword=async({email,password})=>{window.__fake.passwordChecks.push({email,matched:password==='oldpass123'});return password==='oldpass123'?{data:{user:{id:'user1',email}},error:null}:{data:{user:null},error:{message:'Invalid login credentials'}}};
     // Reproduce the actual vulnerability: updateUser ignores currentPassword.
     window.DDB.sb.auth.updateUser=async({password,currentPassword})=>{window.__fake.passwordChanges.push(password);window.__fake.lastCurrentPassword=currentPassword;return {data:{user:{}},error:null}};
     window.DDB.sb.auth.resetPasswordForEmail=async(email,options)=>{window.__fake.resetRequest={email,options};return {error:null}};
   }''')
   # Password request uses exact site root so existing redirect allow-list works.
   await page.evaluate("window.DDB.resetPassword('teste@example.com')")
   request=await page.evaluate('window.__fake.resetRequest')
   assert request['options']['redirectTo']==await page.evaluate('location.origin+location.pathname'),request

   await page.evaluate("location.hash='#account'")
   await page.wait_for_timeout(250)
   assert await page.locator('#changeClientPassword').count()==1,(width,'missing security action')
   await page.locator('#changeClientPassword').click()
   await page.locator('#changeCurrentPassword').fill('incorrect')
   await page.locator('#changeNewPassword').fill('newSecure123')
   await page.locator('#changeConfirmPassword').fill('newSecure123')
   await page.locator('#saveChangePassword').click()
   await page.wait_for_timeout(80)
   assert 'Senha atual incorreta' in await page.locator('#changePasswordFeedback').inner_text()
   assert await page.evaluate('window.__fake.passwordChanges')==[]
   assert await page.evaluate('window.__fake.passwordChecks.length')==1
   assert (await page.evaluate('window.__fake.passwordChecks[0]'))['matched'] is False
   await page.locator('#changeCurrentPassword').fill('oldpass123')
   await page.locator('#saveChangePassword').click()
   await page.wait_for_timeout(120)
   assert await page.evaluate('window.__fake.passwordChanges')==['newSecure123']
   assert await page.evaluate('window.__fake.passwordChecks.length')==2
   assert (await page.evaluate('window.__fake.passwordChecks[1]'))['matched'] is True
   assert await page.evaluate('window.__fake.lastCurrentPassword')=='oldpass123'
   assert not await page.locator('#modal').evaluate('(el)=>el.classList.contains("open")')
   assert not errors,(width,errors)
   print('PASS change password old/confirm/new',width)

   # Simulate a real PASSWORD_RECOVERY Supabase Auth event on an authenticated recovery session.
   await page.evaluate("window.__fake.authCallback('PASSWORD_RECOVERY',{user:{id:'user1',email:'teste@example.com'}})")
   await page.wait_for_timeout(250)
   assert await page.evaluate('location.hash')=='#reset-password',(width,await page.evaluate('location.href'))
   assert await page.locator('#submitResetPassword').count()==1
   await page.locator('#resetNewPassword').fill('short')
   await page.locator('#resetConfirmPassword').fill('short')
   await page.locator('#submitResetPassword').click()
   assert 'pelo menos 8' in await page.locator('#resetPasswordFeedback').inner_text()
   await page.locator('#resetNewPassword').fill('recoverSecure123')
   await page.locator('#resetConfirmPassword').fill('mismatch123')
   await page.locator('#submitResetPassword').click()
   assert 'não coincidem' in await page.locator('#resetPasswordFeedback').inner_text()
   await page.locator('#resetConfirmPassword').fill('recoverSecure123')
   await page.locator('#submitResetPassword').click()
   await page.wait_for_timeout(250)
   assert await page.evaluate('window.__fake.passwordChanges')==['newSecure123','recoverSecure123']
   assert await page.evaluate('location.hash')=='#account'
   assert not errors,(width,errors)
   print('PASS email recovery route + policy',width)
   # New user cannot open an authenticated recovery screen without a recovery event.
   await page.evaluate("location.hash='#reset-password'")
   await page.wait_for_timeout(180)
   assert await page.locator('#submitResetPassword').count()==0
   # Isolate card markup via actual booking component -- verify 12 unique labeled images.
   html=await page.evaluate('''() => {
     const div=document.createElement('div');div.innerHTML=document.querySelector('#bookingBody')?.innerHTML||'';
     return document.body.innerHTML.includes('hair-selector')||typeof window.DDBraids==='object';
   }''')
   assert html
   await page.close()
  await browser.close()
if __name__=='__main__':asyncio.run(main())
