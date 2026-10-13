"""Click/input-driven smoke and finance regression across all 11 admin modules.
Only uses a fake Supabase runtime; NEVER sends any writes to the real database.
"""
import asyncio,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent.parent
MOCK=(ROOT/'tests_browser.py').read_text().split("MOCK=r'''",1)[1].split("'''",1)[0]

async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for width in (375,768,1440):
   page=await browser.new_page(viewport={'width':width,'height':900})
   errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
   html=(ROOT/'index.html').read_text();html=re.sub(r'<script[^>]*></script>','',html);html=re.sub(r'<link[^>]*>','',html)
   await page.set_content(html)
   await page.add_style_tag(content=(ROOT/'styles.css').read_text())
   await page.add_script_tag(content="Object.defineProperty(window,'sessionStorage',{configurable:true,value:{_map:new Map(),getItem(k){return this._map.get(k)||null},setItem(k,v){this._map.set(k,String(v))},removeItem(k){this._map.delete(k)}}});")
   await page.add_script_tag(content=MOCK)
   for js in ['backend.js','logic.js','rc7-ui.js','app.js']:
    await page.add_script_tag(content=(ROOT/js).read_text())
   await page.wait_for_timeout(150)
   await page.evaluate('''() => {
     sessionStorage.setItem('ddbraids_admin_session','1');
     window.__calls=[];
     const d=window.DDB;
     for (const name of ['setServiceDeposit','saveSetting','saveWhatsappTemplate','saveAvailability','setDateException','saveService','saveMethod','saveVariation','saveProfessional','recordDeposit','adminQueueAffected','saveMaterialPrice']) {
       d[name]=async(...args)=>{window.__calls.push({name,args});return 'mock-id'};
     }
     d.rc7Admin=async()=>({available:{waitlist:false,offers:false,refunds:true,ledger:true,notifications:true},waitlist:[],offers:[],refunds:[],ledger:[],notifications:[]});
     const s=window.DDBraids.getState();
     s.procedures[0].fee={type:'none',value:0};s.rc7Installed=false;
     s.professionals[0].pixKey='pix-test';
     s.availability.dany={weekdays:[1,2,3,4,5,6],start:'08:00',end:'18:00',blocks:[]};
     const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
     const a={id:'test-appointment',clientName:'Cliente Teste',phone:'(33) 99999-9999',email:'teste@exemplo.com',status:'confirmed',date:today,time:'09:00',endTime:'12:00',professionalId:'dany',procedureId:'svc',methodId:'met',variationId:'var',price:280,bookingFeeAmount:30,bookingFeePaid:false,paid:false,createdAt:Date.now()};
     s.appointments=[a,{...a,id:'pending-fee',status:'fee_sent',date:today,clientName:'Outra Cliente'}];
     s.operators=[{id:'op-1',display_name:'Dany',is_active:true}];
     s.operationalTasks=[{id:'task-1',type:'cancelled_slot',professionalId:'dany',clientName:'Ex-cliente',date:today,time:'13:00'}];
     location.hash='#admin';
   }''')
   await page.wait_for_timeout(250)
   async def go(name):
    await page.locator(f'[data-module="{name}"]').evaluate('(e)=>e.click()')
    await page.wait_for_timeout(90)
    assert not errs,(width,name,errs)
   async def modal(btn,title):
    await page.locator(btn).first.evaluate('(e)=>e.click()')
    await page.wait_for_timeout(45)
    got=await page.locator('#modalTitle').inner_text()
    assert title.lower() in got.lower(),(width,btn,got,title)
    assert not errs,(width,btn,errs)
    await page.locator('#closeModal').evaluate('(e)=>e.click()')
   await go('overview')
   await page.locator('[data-go="finance"]').evaluate('(e)=>e.click()')
   assert 'Financeiro' in await page.locator('#moduleTitle').inner_text()
   await go('requests')
   assert await page.locator('[data-fee-received]').count()==1
   await page.locator('#requestSearch').fill('outra')
   assert await page.locator('.request-card:not(.hidden)').count()==1
   await go('bookings')
   for b,t in [('[data-manual-appointment]','Novo agendamento'),('[data-edit-hours]','Horários'),('[data-block-date]','Bloquear'),('[data-offer-open-slot]','Oferecer'),('[data-edit-booking]','Detalhes'),('[data-reschedule]','Remarcar')]:await modal(b,t)
   await go('workflows')
   await page.wait_for_timeout(120)
   assert 'ainda precisam ser ativadas' in await page.locator('#rc7Admin').inner_text()
   assert await page.locator('#rc7QueueBtn').count()==0
   # Materials pricing is now independently enabled; absent waitlist must stay disabled.
   assert await page.locator('#rc7PricePro').count()==1
   await go('clients');await modal('[data-client]','Perfil da cliente')
   await go('catalog')
   for b,t in [('[data-new-procedure]','Novo procedimento'),('[data-edit-procedure]','Editar procedimento'),('[data-methods]','Métodos'),('[data-new-material]','Novo material'),('[data-new-accessory]','Novo acessório')]:await modal(b,t)
   await page.locator('[data-methods]').first.evaluate('(e)=>e.click()')
   if await page.locator('[data-vars]').count():
    await page.locator('[data-vars]').first.evaluate('(e)=>e.click()')
    assert 'Variações' in await page.locator('#modalTitle').inner_text()
    await page.locator('#newVariation').evaluate('(e)=>e.click()')
    assert 'Nova variação' in await page.locator('#modalTitle').inner_text()
    await page.locator('#closeModal').evaluate('(e)=>e.click()')
   await go('finance')
   row=page.locator('[data-fee-row]').first
   assert await row.locator('[data-fee-type]:checked').get_attribute('value')=='none'
   assert not await row.locator('[data-fee-value]').is_disabled()
   await row.locator('[data-fee-value]').focus()
   assert await row.locator('[data-fee-type]:checked').get_attribute('value')=='fixed'
   await row.locator('[data-fee-value]').fill('38.50')
   await row.locator('[data-save-fee]').evaluate('(e)=>e.click()')
   await page.wait_for_timeout(100)
   calls=await page.evaluate('window.__calls')
   assert any(x['name']=='setServiceDeposit' and x['args'][1]=='fixed' and x['args'][2]==38.5 for x in calls),(width,calls)
   row=page.locator('[data-fee-row]').first
   await row.locator('[data-fee-type][value="percent"]').check()
   await row.locator('[data-fee-value]').fill('120')
   before=len(await page.evaluate('window.__calls'))
   await row.locator('[data-save-fee]').evaluate('(e)=>e.click()')
   await page.wait_for_timeout(35)
   assert len(await page.evaluate('window.__calls'))==before,(width,'invalid percentage was submitted')
   assert 'não pode ultrapassar 100%' in await page.locator('#noticeText').inner_text()
   await page.locator('[data-pro-finance]').first.evaluate('(e)=>e.click()')
   assert await page.locator('#siteNotice').evaluate('(e)=>e.classList.contains("open")')
   await go('professionals');await modal('[data-new-professional]','Adicionar profissional');await modal('[data-edit-professional]','Editar profissional')
   await go('posts');await page.locator('#postTitle').fill('Título de teste');await page.locator('#postTemplate').select_option('beforeafter');assert not await page.locator('#postPhoto2Wrap').evaluate('(e)=>e.classList.contains("hidden")')
   await page.locator('[data-fit="1"]').evaluate('(e)=>e.click()')
   await go('history');await page.locator('#historySearch').fill('Cliente')
   await go('settings');assert await page.locator('[data-save-general]').count()==1
   await page.locator('#cancelHours').fill('48')
   await page.locator('[data-save-general]').evaluate('(e)=>e.click()')
   await page.wait_for_timeout(70)
   assert any(x['name']=='saveSetting' and x['args'][0]=='cancellation_hours' and x['args'][1]==48 for x in await page.evaluate('window.__calls'))
   await page.locator('[data-save-messages]').evaluate('(e)=>e.click()')
   await page.wait_for_timeout(70)
   assert any(x['name']=='saveWhatsappTemplate' for x in await page.evaluate('window.__calls'))
   assert not errs,(width,errs)
   print(f'PASS: todos os 11 módulos, edição modal, finance sinais & validação, guardas de integração — {width}px')
   await page.close()
  await browser.close()
if __name__=='__main__':asyncio.run(main())
