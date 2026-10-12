/* ===== demo.js ===== */
const req = (overrides={}) => ({ size: true, thickness: true, material: true, color: true, provider: true, characteristics: false, ...overrides });
const opts = (extra={}) => ({ tags: [], sizes: ['Chanel','Médio','Longo'], thicknesses: ['Fina','Média','Grossa'], required: req(), ...extra });

function createDemoState() {
  const s = emptyState();
  s.media.hero = DEMO_IMAGES.hero;
  s.professionals = [
    { id:'pro_dany', name:'Dany', image:DEMO_IMAGES.dany, instagram:'@dany', whatsapp:'5533999990001', pixKey:'dany@pix.com', pin:'', active:true, bookable:true },
    { id:'pro_debora', name:'Débora', image:DEMO_IMAGES.debora, instagram:'@debora', whatsapp:'5533999990002', pixKey:'debora@pix.com', pin:'', active:true, bookable:true }
  ];
  s.availability = {
    pro_dany: { weekdays:[1,2,3,4,5,6], start:'08:00', end:'18:00', bufferMinutes:30, blocks:[] },
    pro_debora: { weekdays:[1,2,3,4,5,6], start:'17:00', end:'21:00', bufferMinutes:30, blocks:[] }
  };
  s.procedures = [
    { id:'proc_penteado', name:'Penteado Tradicional', category:'Penteados', price:120, image:DEMO_IMAGES.nago, active:true, maintenanceEligible:false, fee:{type:'fixed',value:20}, methods:[
      { id:'m_trad', name:'Tradicional', price:120, image:DEMO_IMAGES.nago, active:true, descriptionRequired:true, options:opts({sizes:[],thicknesses:[],required:req({size:false,thickness:false,material:false,color:false,provider:false,characteristics:false})}), variations:[] }
    ]},
    { id:'proc_nago', name:'Tranças Nagô', category:'Penteados', price:150, image:DEMO_IMAGES.nago, active:true, maintenanceEligible:true, fee:{type:'fixed',value:20}, methods:[
      { id:'m_nago', name:'Nagô', price:150, image:DEMO_IMAGES.nago, active:true, options:opts({tags:['Com extensão','Detalhada'],sizes:['Curto','Médio','Longo'],thicknesses:['Fina','Média'],required:req({characteristics:false})}), variations:[
        {id:'v_tiara',name:'Tiara',image:DEMO_IMAGES.nago,active:true,options:opts({tags:['Com extensão','Detalhada'],sizes:['Curto','Médio','Longo'],thicknesses:['Fina','Média']})},
        {id:'v_topo',name:'Ao topo',image:DEMO_IMAGES.nago,active:true,options:opts({tags:['Com extensão','Detalhada'],sizes:['Curto','Médio','Longo'],thicknesses:['Fina','Média']})},
        {id:'v_lateral',name:'Lateral',image:DEMO_IMAGES.nago,active:true,options:opts({tags:['Com extensão','Detalhada'],sizes:['Curto','Médio','Longo'],thicknesses:['Fina','Média']})}
      ]}
    ]},
    { id:'proc_box', name:'Box Braids', category:'Tranças', price:300, image:DEMO_IMAGES.box, active:true, maintenanceEligible:true, fee:{type:'fixed',value:50}, methods:[
      {id:'m_box',name:'Knotless',price:300,image:DEMO_IMAGES.box,active:true,options:opts({tags:['Detalhada'],sizes:['Chanel','Médio','Longo'],thicknesses:['Fina','Média','Grossa']}),variations:[]}
    ]},
    { id:'proc_boho', name:'Boho Braids', category:'Tranças', price:350, image:DEMO_IMAGES.boho, active:true, maintenanceEligible:true, fee:{type:'fixed',value:50}, methods:[
      {id:'m_boho',name:'Knotless',price:350,image:DEMO_IMAGES.boho,active:true,options:opts({sizes:['Chanel','Médio','Longo']}),variations:[]}
    ]},
    { id:'proc_fulani', name:'Fulani Braids', category:'Tranças', price:330, image:DEMO_IMAGES.fulani, active:true, maintenanceEligible:true, fee:{type:'fixed',value:50}, methods:[
      {id:'m_fulani',name:'Knotless',price:330,image:DEMO_IMAGES.fulani,active:true,options:opts({sizes:['Chanel','Médio','Longo']}),variations:[]}
    ]},
    { id:'proc_goddess', name:'Goddess Braids', category:'Tranças', price:370, image:DEMO_IMAGES.goddess, active:true, maintenanceEligible:true, fee:{type:'fixed',value:50}, methods:[
      {id:'m_goddess',name:'Knotless',price:370,image:DEMO_IMAGES.goddess,active:true,options:opts({sizes:['Chanel','Médio','Longo']}),variations:[]}
    ]},
    { id:'proc_mega', name:'Mega Hair Entrelace', category:'Mega Hair', price:450, image:DEMO_IMAGES.mega, active:true, maintenanceEligible:true, fee:{type:'fixed',value:50}, methods:[
      {id:'m_entrelace',name:'Entrelace',price:450,image:DEMO_IMAGES.mega,active:true,options:opts({tags:[],sizes:['Médio','Longo'],thicknesses:[],required:req({thickness:false})}),variations:[
        {id:'v_penteado',name:'Com Penteado',image:DEMO_IMAGES.mega,active:true,options:opts({sizes:['Médio','Longo'],thicknesses:[],required:req({thickness:false})})},
        {id:'v_disfarce',name:'Com Disfarce',image:DEMO_IMAGES.mega,active:true,options:opts({sizes:['Médio','Longo'],thicknesses:[],required:req({thickness:false})})},
        {id:'v_sem_disfarce',name:'Sem Disfarce',image:DEMO_IMAGES.mega,active:true,options:opts({sizes:['Médio','Longo'],thicknesses:[],required:req({thickness:false})})}
      ]}
    ]},
    { id:'maintenance', name:'Manutenção', category:'Manutenção', price:0, image:DEMO_IMAGES.maintenance, active:true, maintenanceEligible:false, fee:{type:'none',value:0}, special:'maintenance', methods:[] }
  ];
  s.materials = [
    {id:'mat_jumbo',name:'Jumbo',image:DEMO_IMAGES.jumbo,active:true,colors:['Preto','Castanho','Loiro','Ruivo'],sizes:['Padrão'],internalCost:45,estimate:'5–6 pacotes conforme tamanho e espessura',compatibility:['*']},
    {id:'mat_kanekalon',name:'Kanekalon',image:DEMO_IMAGES.kanekalon,active:true,colors:['Preto','Castanho','Colorido'],sizes:['Padrão'],internalCost:35,estimate:'Quantidade definida conforme o procedimento',compatibility:['*']}
  ];
  s.accessories = [
    {id:'acc_micanga',name:'Miçangas douradas',image:DEMO_IMAGES.accessory,price:15,active:true,compatibility:['*']},
    {id:'acc_argola',name:'Argolas',image:DEMO_IMAGES.accessory,price:10,active:true,compatibility:['*']}
  ];
  const now=new Date(), y=now.getFullYear(), m=String(now.getMonth()+1).padStart(2,'0'), day=n=>`${y}-${m}-${String(Math.max(1,Math.min(n,new Date(y,now.getMonth()+1,0).getDate()))).padStart(2,'0')}`, stamp=n=>new Date(`${day(n)}T12:00:00`).getTime();
  s.appointments=[
    {id:'demo_done',procedureId:'proc_box',methodId:'m_box',variationId:'',accessoryIds:['acc_micanga'],professionalId:'pro_dany',date:day(5),time:'09:00',endTime:'13:00',estimatedDurationMinutes:240,period:'09:00',clientName:'Cliente Demo 1',phone:'5533999991111',status:'completed',bookingFeeAmount:50,bookingFeePaid:true,bookingFeePaidAt:stamp(1),refundStatus:'none',price:315,fullDay:false,anamnesisReviewed:true,createdAt:stamp(1),paid:true,paidAt:stamp(5),paymentMethod:'pix',paymentCardType:'',finalPaymentAmount:265,materialCost:45},
    {id:'demo_card',procedureId:'proc_boho',methodId:'m_boho',variationId:'',accessoryIds:[],professionalId:'pro_debora',date:day(12),time:'18:00',endTime:'21:00',estimatedDurationMinutes:180,period:'18:00',clientName:'Cliente Demo 2',phone:'5533999992222',status:'completed',bookingFeeAmount:50,bookingFeePaid:true,bookingFeePaidAt:stamp(8),refundStatus:'none',price:350,fullDay:false,anamnesisReviewed:true,createdAt:stamp(8),paid:true,paidAt:stamp(12),paymentMethod:'card',paymentCardType:'credit',installments:2,installmentValue:150,finalPaymentAmount:300,materialCost:35},
    {id:'demo_future',procedureId:'proc_fulani',methodId:'m_fulani',variationId:'',accessoryIds:[],professionalId:'pro_dany',date:day(25),time:'10:00',endTime:'14:00',estimatedDurationMinutes:240,period:'10:00',clientName:'Cliente Demo Futuro',phone:'5533999993333',status:'confirmed',bookingFeeAmount:50,bookingFeePaid:true,bookingFeePaidAt:stamp(14),refundStatus:'none',price:330,fullDay:false,anamnesisReviewed:true,createdAt:stamp(14),paid:false,finalPaymentAmount:0,materialCost:45}
  ];
  return s;
}

