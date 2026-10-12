/* ===== store.js ===== */
const KEY = 'ddbraids_state';

const emptyState = () => ({
  schema: 9,
  media: { hero: '' },
  professionals: [],
  procedures: [],
  materials: [],
  accessories: [],
  appointments: [],
  anamneses: [],
  audits: [],
  operationalTasks: [],
  availability: {},
  settings: {
    cancelHours: 24,
    sundayPublic: false,
    publicSundays: [],
    maintenanceFullDay: true,
    messages: {
      fee: 'Olá {cliente}! Recebemos sua solicitação para {procedimento} com {profissional} no dia {data}. Para reservar a data, realize o PIX de {taxa} para a chave {pix}. Após o pagamento, envie o comprovante por aqui para continuarmos com sua solicitação. 💛',
      confirm: 'Olá {cliente}! Seu atendimento de {procedimento} com {profissional} foi confirmado para {data} {horario}. 💛',
      cancel: 'Olá {cliente}. Seu atendimento de {procedimento} para {data} foi cancelado.{reembolso}',
      refundCompleted: 'Olá {cliente}! Seu reembolso de {valor_reembolso} foi concluído. Consulte os detalhes no portal da D&D Braids. 💛',
      reschedule: 'Olá {cliente}! Seu atendimento de {procedimento} foi remarcado para {data} {horario}.{sinal}',
      reminder: 'Olá {cliente}! Passando para lembrar do seu atendimento de {procedimento} em {data} {horario}. 💛',
      opening: 'Olá {cliente}! Surgiu uma vaga com {profissional} para {data} {horario}. Caso tenha interesse, fale com a gente por aqui. 💛',
      nonRecommended: 'Olá {cliente}! Revisamos sua ficha de anamnese referente ao procedimento {procedimento} e identificamos pontos que merecem atenção: {motivos}. Leia e aceite a ficha de ciência neste link: {link}'
    },
    consentText: 'Declaro que li as informações do atendimento, forneci dados verdadeiros sobre meu cabelo e compreendo que a profissional poderá ajustar ou interromper o procedimento caso identifique riscos ou incompatibilidades.',
    specificConsentText: 'Fui informada sobre os pontos de atenção registrados pela profissional. Li e compreendi as observações e ainda desejo prosseguir com a solicitação. Entendo que este aceite não garante a realização do atendimento e que a decisão final permanece com a profissional.'
  }
});

let state = emptyState();

function getState() { return state; }

function replaceState(next, persist = true) {
  state = normalize(structuredClone(next));
  if (persist) saveState();
  return state;
}

function saveState() {
  // RC7: memory-only business state. Persist only the limited signup draft separately.
  try { localStorage.removeItem(KEY); } catch {}
}

function uid(prefix = 'id') {
  return `${prefix}_${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)}`;
}

function audit(actor, area, action, before = null, after = null) {
  state.audits.unshift({ id: uid('audit'), actor: actor || 'Admin', area, action, before, after, at: Date.now() });
  state.audits = state.audits.slice(0, 500);
  saveState();
}

function normalize(data) {
  const base = emptyState();
  const d = { ...base, ...data };
  d.media = { ...base.media, ...(data.media || {}) };
  d.settings = { ...base.settings, ...(data.settings || {}), messages: { ...base.settings.messages, ...(data.settings?.messages || {}) } };
  for (const k of ['professionals','procedures','materials','accessories','appointments','anamneses','audits','operationalTasks','operators']) d[k] = Array.isArray(data[k]) ? data[k] : [];
  d.availability = data.availability || {};
  d.procedures.forEach(p => {
    p.active ??= true;
    p.fee ??= { type: 'none', value: 0 };
    p.methods ??= [];
    p.methods.forEach(m => {
      m.active ??= true;
      m.options ??= {};
      m.variations ??= [];
      m.variations.forEach(v => { v.active ??= true; v.options ??= {}; });
    });
  });
  d.professionals.forEach(p => { p.active ??= true; p.bookable ??= true; });
  return d;
}

