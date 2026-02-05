import { WHY_OPTIONS, pickScenarios } from './scenarios.js';
import { scoreQuiz } from './scoring.js';
import { speakWithOpenAI, speakWithBrowser } from './openai_tts.js';

const $ = (sel) => document.querySelector(sel);

const screenSetup = $('#screenSetup');
const screenQuiz = $('#screenQuiz');
const screenDebrief = $('#screenDebrief');
const screenScorecard = $('#screenScorecard');

const btnStart = $('#btnStart');
const btnConcern = $('#btnConcern');
const btnNoConcern = $('#btnNoConcern');
const btnNext = $('#btnNext');
const btnPlayVoice = $('#btnPlayVoice');
const btnRestart = $('#btnRestart');

const qIndexEl = $('#qIndex');
const qTotalEl = $('#qTotal');
const scenarioTitleEl = $('#scenarioTitle');
const scenarioMetaEl = $('#scenarioMeta');
const timelineRowsEl = $('#timelineRows');
const riskBadgesEl = $('#riskBadges');

const debriefHeaderEl = $('#debriefHeader');
const debriefTextEl = $('#debriefText');
const debriefBadgesEl = $('#debriefBadges');

const whyChipsEl = $('#whyChips');

const settingsModal = $('#settingsModal');
const btnSettings = $('#btnSettings');
const btnCloseSettings = $('#btnCloseSettings');
const voiceInstructionEl = $('#voiceInstruction');
const openaiVoiceEl = $('#openaiVoice');

let qCount = null;
let scenarios = [];
let qPtr = 0;
let selectedSignals = new Set();
let answers = [];
let lastDebriefText = '';

function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }

function setActiveSeg(count){
  document.querySelectorAll('.seg').forEach(b=>{
    b.classList.toggle('active', Number(b.dataset.qcount)===count);
  });
}

document.querySelectorAll('.seg').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    qCount = Number(btn.dataset.qcount);
    setActiveSeg(qCount);
    btnStart.disabled = !qCount;
  });
});

btnSettings.addEventListener('click', ()=> show(settingsModal));
btnCloseSettings.addEventListener('click', ()=> hide(settingsModal));
settingsModal.addEventListener('click', (e)=>{ if(e.target === settingsModal) hide(settingsModal); });

btnStart.addEventListener('click', ()=>{
  scenarios = pickScenarios(qCount);
  qPtr = 0;
  answers = [];
  renderWhyChips();
  loadQuestion();
  hide(screenSetup);
  show(screenQuiz);
});

btnConcern.addEventListener('click', ()=> submitAnswer('velocity_concern'));
btnNoConcern.addEventListener('click', ()=> submitAnswer('no_concern'));

btnNext.addEventListener('click', ()=>{
  qPtr += 1;
  selectedSignals = new Set();
  if(qPtr >= scenarios.length){
    showScorecard();
  } else {
    hide(screenDebrief);
    show(screenQuiz);
    loadQuestion();
  }
});

btnPlayVoice.addEventListener('click', async ()=>{
  const voice = openaiVoiceEl.value;
  const instructions = voiceInstructionEl.value || '';
  try{
    await speakWithOpenAI({ text: lastDebriefText, voice, instructions });
  } catch(err){
    // fallback
    const ok = speakWithBrowser(lastDebriefText);
    if(!ok) alert('Voice not available. Configure server/.env for OpenAI TTS.');
  }
});

btnRestart.addEventListener('click', ()=>{
  qCount = null;
  scenarios = [];
  qPtr = 0;
  answers = [];
  selectedSignals = new Set();
  setActiveSeg(-1);
  btnStart.disabled = true;
  hide(screenScorecard);
  show(screenSetup);
});

function renderWhyChips(){
  whyChipsEl.innerHTML = '';
  WHY_OPTIONS.forEach(opt=>{
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.type = 'button';
    chip.textContent = opt.label;
    chip.dataset.id = opt.id;
    chip.addEventListener('click', ()=>{
      if(selectedSignals.has(opt.id)) selectedSignals.delete(opt.id);
      else selectedSignals.add(opt.id);
      chip.classList.toggle('active', selectedSignals.has(opt.id));
    });
    whyChipsEl.appendChild(chip);
  });
}

function renderBadges(container, scenario){
  container.innerHTML = '';
  const badges = scenario.risk_badges || [];
  badges.forEach(b=>{
    const span = document.createElement('span');
    span.className = 'badge risk';
    if(/crypto/i.test(b)) span.classList.add('crypto');
    if(/international/i.test(b)) span.classList.add('intl');
    if(/escalation/i.test(b)) span.classList.add('escalation');
    span.textContent = b;
    container.appendChild(span);
  });
}

function renderMeta(scenario){
  const src = scenario.source || {};
  const items = [
    { k: 'Source account', v: src.name ? `${src.name} — ${src.type}` : src.type },
    { k: 'Account tenure', v: src.tenure || '—' },
    { k: 'Historical behavior', v: src.history || '—' }
  ];
  scenarioMetaEl.innerHTML = '';
  items.forEach(i=>{
    const div = document.createElement('div');
    div.className = 'meta';
    div.innerHTML = `<div class="k">${i.k}</div><div class="v">${escapeHtml(i.v)}</div>`;
    scenarioMetaEl.appendChild(div);
  });
}

function renderTimeline(scenario){
  timelineRowsEl.innerHTML = '';
  scenario.transactions.forEach((t, idx)=>{
    const row = document.createElement('div');
    row.className = 'timeline-row';
    if(idx === scenario.transactions.length-1) row.classList.add('flash');
    row.innerHTML = `
      <div class="td">${escapeHtml(t.date)}</div>
      <div class="td amt">$${formatMoney(t.amount)}</div>
      <div class="td">${escapeHtml(t.destination)}</div>
      <div class="td">${escapeHtml(t.destType)}</div>
      <div class="td">${escapeHtml(t.country)}</div>
    `;
    timelineRowsEl.appendChild(row);
  });
}

function loadQuestion(){
  const scenario = scenarios[qPtr];
  qIndexEl.textContent = String(qPtr + 1);
  qTotalEl.textContent = String(scenarios.length);
  scenarioTitleEl.textContent = scenario.title;
  renderBadges(riskBadgesEl, scenario);
  renderMeta(scenario);
  renderTimeline(scenario);

  // reset chips UI
  document.querySelectorAll('.chip').forEach(c=> c.classList.remove('active'));
}

function submitAnswer(userAnswer){
  const scenario = scenarios[qPtr];

  // Build debrief text aligned with rubric (kept short for TTS).
  const isCorrect = userAnswer === scenario.correct_answer;
  const correctLabel = scenario.correct_answer === 'velocity_concern' ? 'Velocity concern' : 'Normal activity';
  const userLabel = userAnswer === 'velocity_concern' ? 'Velocity concern' : 'Normal activity';

  const rationale = buildDebriefRationale(scenario);

  debriefHeaderEl.textContent = isCorrect ? 'Correct' : 'Not quite';
  debriefBadgesEl.innerHTML = '';
  renderBadges(debriefBadgesEl, scenario);

  lastDebriefText = `${isCorrect ? 'Correct.' : 'Not quite.'} This pattern is best classified as ${correctLabel}. ${rationale}`;

  debriefTextEl.textContent = `Your answer: ${userLabel}. Correct answer: ${correctLabel}.\n\n${rationale}`;

  answers.push({
    scenario,
    userAnswer,
    selectedSignals: Array.from(selectedSignals)
  });

  hide(screenQuiz);
  show(screenDebrief);
}

function buildDebriefRationale(scenario){
  // Anchors by scenario tags & expected signals (2–3 sentences, ~12–18s)
  const tags = new Set(scenario.tags || []);
  const exp = new Set(scenario.expected_signals || []);

  if(scenario.correct_answer === 'velocity_concern'){
    const parts = [];
    if(tags.has('international')) parts.push('repeated international wires to a newly introduced beneficiary');
    if(tags.has('crypto')) parts.push('repeated transfers to crypto platforms');
    if(tags.has('escalation') || exp.has('escalating_amounts')) parts.push('amounts that escalate over days and weeks');
    if(exp.has('deviation_from_history')) parts.push('a clear deviation from prior account behavior');
    return `Key drivers are ${parts.slice(0,3).join(', ')}. Velocity risk can build over weeks—not just hours—when frequency and behavior shift together.`;
  } else {
    return `Despite large amounts, the cadence and counterparty are stable over years, and the destination profile does not introduce new risk. Stability over time is the strongest indicator this is normal operating behavior.`;
  }
}

function showScorecard(){
  const summary = scoreQuiz(answers);

  hide(screenDebrief);
  hide(screenQuiz);
  show(screenScorecard);

  $('#finalScore').textContent = String(summary.total_score);

  // KPIs
  const kpisEl = $('#kpis');
  kpisEl.innerHTML = '';
  const kpis = [
    { k: 'Accuracy', v: `${summary.accuracy_rate}%` },
    { k: 'False positives', v: String(summary.false_positives) },
    { k: 'False negatives', v: String(summary.false_negatives) },
    { k: 'Signals captured', v: `${summary.components.signal_recognition}/25` },
    { k: 'Consistency', v: `${summary.components.consistency_index}/10` }
  ];
  kpis.forEach(x=>{
    const div = document.createElement('div');
    div.className = 'kpi';
    div.innerHTML = `<div class="k">${x.k}</div><div class="v">${escapeHtml(x.v)}</div>`;
    kpisEl.appendChild(div);
  });

  // Breakdown bars
  const bars = [
    { name: 'Decision accuracy', val: summary.components.decision_accuracy, max: 40 },
    { name: 'Signal recognition', val: summary.components.signal_recognition, max: 25 },
    { name: 'Velocity sensitivity', val: summary.components.velocity_sensitivity, max: 15 },
    { name: 'Over-flagging control', val: summary.components.overflagging_control, max: 10 },
    { name: 'Consistency index', val: summary.components.consistency_index, max: 10 }
  ];
  const barsEl = $('#breakdownBars');
  barsEl.innerHTML = '';
  bars.forEach(b=>{
    const pct = Math.round((b.val / b.max) * 100);
    const row = document.createElement('div');
    row.className = 'bar';
    row.innerHTML = `
      <div class="name">${escapeHtml(b.name)}</div>
      <div class="track"><div class="fill" style="width:${pct}%"></div></div>
      <div class="val">${b.val}/${b.max}</div>
    `;
    barsEl.appendChild(row);
  });

  // Written feedback
  const fb = summary.feedback;
  const fbEl = $('#writtenFeedback');
  fbEl.innerHTML = '';
  (fb.strength || []).forEach(t=>{
    const p = document.createElement('div');
    p.className = 'bullet';
    p.textContent = t;
    fbEl.appendChild(p);
  });
  (fb.improve || []).forEach(t=>{
    const p = document.createElement('div');
    p.className = 'bullet';
    p.textContent = t;
    fbEl.appendChild(p);
  });
  const p = document.createElement('div');
  p.className = 'bullet';
  p.textContent = fb.next_rep || '';
  fbEl.appendChild(p);

  // Review table
  renderReview(summary.per_question);
}

function renderReview(rows){
  const wrap = $('#reviewTable');
  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Scenario</th>
        <th>Result</th>
        <th>Signals missed</th>
        <th>Flags</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');

  rows.forEach(r=>{
    const tr = document.createElement('tr');
    const res = r.is_correct ? `<span class="pillok ok">✅ Correct</span>` : `<span class="pillok bad">❌ Miss</span>`;
    const missed = (r.missed_signals || []).slice(0,4);
    const flags = (r.tags || []).filter(t => ['international','crypto','escalation','stable_cadence','high_risk'].includes(t));

    tr.innerHTML = `
      <td>${escapeHtml(r.title)}</td>
      <td>${res}</td>
      <td>
        <div class="chips">
          ${missed.map(m=>`<span class="mini missed">${escapeHtml(m)}</span>`).join('')}
        </div>
      </td>
      <td>
        <div class="chips">
          ${flags.map(f=>`<span class="mini flag">${escapeHtml(f)}</span>`).join('')}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  wrap.innerHTML = '';
  wrap.appendChild(table);
}

function formatMoney(n){
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

// Warm up voices list for browser fallback (some browsers require this)
if('speechSynthesis' in window){
  speechSynthesis.getVoices();
}
