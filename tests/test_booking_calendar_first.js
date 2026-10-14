/**
 * Regression tests for calendar-first booking; no database or browser needed.
 * Run: node tests/test_booking_calendar_first.js
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../src/50-public.js'),'utf8');

const mocks=`
const elements={},$=k=>elements[k]||={textContent:'',innerHTML:'',classList:{add(){},remove(){},toggle(){}}},$$=()=>[];
const emptyAnamnesis=()=>({});
const activeProfessionals=()=>[{id:'p1'}];
const publicPeriodsFor=(_,d)=>d.endsWith('15')?[]:['Manhã'];
const dateBlocked=()=>false;
const availabilityFor=()=>({start:'09:00',end:'11:00'});
const toMinutes=t=>{const [h,m]=t.split(':').map(Number);return h*60+m};
const fromMinutes=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
const todayISO=()=> '2026-10-13';
const slotPeriod=t=>'Manhã';
const getProcedure=id=>id?{id,methods:[]}:null;
const targetProcedure=b=>getProcedure(b.procedureId);
const selectedMethod=()=>null,currentOptions=()=>({tags:[],sizes:[],thicknesses:[]});
const getState=()=>({accessories:[],materials:[]}),priceQuote=()=>({error:null});
const DDB={session:async()=>null};
const localStorage={getItem:()=>null,removeItem(){},setItem(){}};
const window={notifications:[],promptCount:0};
const notify=(msg,title)=>window.notifications.push({msg,title});
const location={hash:'#catalog'};
async function ensureClientAuth(){return {user:{id:'test'}};}
async function loadRealSlotsForBooking(){return window.testSlots;}
`;
const tail=`
renderPublicRoute=()=>{};
renderBooking=()=>{};
loadVerifiedClientContact=async()=>{};
validateStep=()=> '';
showBookingEntryChoice=()=>{window.promptCount++;};
return {
  openBookingFromNavigation,handleBookingClick,continueBookingFromCalendarIntro,
  nextBookingStep,steps,calendarIntroSlots,renderCalendarIntro,promptExistingBookingOrStart,
  select(date,time){bookingCalendarIntro.date=date;bookingCalendarIntro.time=time},
  assign(fields){Object.assign(booking,fields)},
  setStep(id){stepIndex=steps().findIndex(s=>s.id===id)},
  state(){return {booking:{...booking},stepIndex,entryOpen:bookingCalendarIntroOpen,
    notifications:window.notifications,stepName:steps()[stepIndex]?.id||null,promptCount:window.promptCount}},
  slots(rows){window.testSlots=rows}
};
`;

async function main(){
  const api=new Function(mocks+source+tail)();
  api.openBookingFromNavigation();
  assert.equal(api.state().entryOpen,true,'Agendar must open calendar immediately');
  assert.equal(api.calendarIntroSlots('2026-10-15').length,0,'closed day must have no choices');
  assert(api.calendarIntroSlots('2026-10-20').includes('09:00'),'schedule should suggest provisional time');
  assert(api.renderCalendarIntro().includes('data-intro-date="2026-10-20"'));
  assert(api.renderCalendarIntro().includes('não uma reserva'));
  api.select('2026-10-20','09:00');
  await api.continueBookingFromCalendarIntro();
  assert.equal(api.state().entryOpen,false);
  assert.equal(api.state().stepIndex,0,'Continuar must begin at step one');
  assert.equal(api.state().booking.date,'2026-10-20');
  assert.equal(api.state().booking.time,'09:00');
  api.handleBookingClick({target:{closest:()=>({dataset:{procedure:'svc'},hasAttribute:()=>false})}});
  assert.equal(api.state().booking.calendarPrefillSource,'calendar');
  assert.equal(api.state().booking.time,'09:00','procedure choice must keep preference');
  api.assign({professionalId:'p1'});
  api.setStep('summary');
  api.slots([{time:'09:00'}]);
  await api.nextBookingStep();
  assert.equal(api.state().booking.calendarPrefillValidated,true);
  assert.equal(api.state().stepName,'client');
  assert.equal(api.steps().some(x=>x.id==='date'),false,'validated slot skips date step');
  api.setStep('summary');
  api.slots([]);
  await api.nextBookingStep();
  assert.equal(api.state().stepName,'date','invalid slot must return to calendar');
  assert.equal(api.state().booking.time,'');
  assert(api.state().notifications.some(x=>x.title==='Horário indisponível'));
  await api.promptExistingBookingOrStart(()=>{throw Error('should prompt instead')});
  assert.equal(api.state().promptCount,1,'previous booking asks only when starting another');
  console.log('PASS: calendar-first, preservation, validation, fallback, resume prompt');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
