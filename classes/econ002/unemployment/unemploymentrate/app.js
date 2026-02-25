/*******************************************************
 Unemployment Categories + Card-Specific Flow Moves
 - Staging pile + E/U/N buckets
 - Random sample of cards each round, random counts
 - "Check categories" highlights correct/incorrect
 - "Use these counts for move cards" enables story moves
 - Move cards adjust specific source/destination cards
   and therefore update counts + u + LFPR automatically.
*******************************************************/

const els = {
  // metrics
  mE: document.getElementById("mE"),
  mU: document.getElementById("mU"),
  mN: document.getElementById("mN"),
  mUR: document.getElementById("mUR"),
  mLFPR: document.getElementById("mLFPR"),
  pillLF: document.getElementById("pillLF"),
  pillPop: document.getElementById("pillPop"),

  // zones
  zoneS: document.getElementById("zoneS"),
  zoneE: document.getElementById("zoneE"),
  zoneU: document.getElementById("zoneU"),
  zoneN: document.getElementById("zoneN"),

  // actions
  checkBtn: document.getElementById("checkBtn"),
  useForMovesBtn: document.getElementById("useForMovesBtn"),
  checkMsg: document.getElementById("checkMsg"),

  resetBtn: document.getElementById("resetBtn"),
  newSetBtn: document.getElementById("newSetBtn"),
  status: document.getElementById("status"),

  // move cards
  snapshotBox: document.getElementById("snapshotBox"),
  moveDeck: document.getElementById("moveDeck"),
  predSel: document.getElementById("predSel"),
  rerollMovesBtn: document.getElementById("rerollMovesBtn"),
  explainBox: document.getElementById("explainBox"),
};

function fmtPct(x){ return (100*x).toFixed(2) + "%"; }
function clampInt(x, lo=0){ return Math.max(lo, Math.floor(x)); }
function setStatus(msg){ if (els.status) els.status.textContent = msg; }

function rates(E,U,N){
  const LF = E + U;
  const Pop = E + U + N;
  const u = (LF>0) ? (U / LF) : 0;
  const lfpr = (Pop>0) ? (LF / Pop) : 0;
  return { LF, Pop, u, lfpr };
}

// Keep MathJax only for the header definitions; do NOT typeset dynamic result text
function safeTypeset(nodes){
  if (!window.MathJax || !window.MathJax.typesetPromise) return;
  try { window.MathJax.typesetClear(nodes); } catch {}
  window.MathJax.typesetPromise(nodes).catch(()=>{});
}

/* -----------------------
   Card Templates
   Each template has a stable `type` used by move stories.
   correct: E/U/N is the intended classification.
------------------------ */

const CARD_TEMPLATES = [
  // ---------- EMPLOYED ----------
  { type:"emp_parttime",          correct:"E", text:"Worked part-time for pay during the reference week." },
  { type:"emp_fulltime",          correct:"E", text:"Worked full-time for pay during the reference week." },
  { type:"emp_gig",               correct:"E", text:"Did paid gig work (rideshare/deliveries) during the reference week." },
  { type:"emp_family_unpaid",     correct:"E", text:"Worked unpaid in a family business during the reference week." },
  { type:"emp_temp_absent",       correct:"E", text:"Has a job but was temporarily absent (sick/vacation) this week." },
  { type:"emp_one_day",           correct:"E", text:"Worked one day this week (seasonal/irregular job)." },
  { type:"emp_remote",            correct:"E", text:"Worked from home for pay during the reference week." },

  // ---------- UNEMPLOYED (ACTIVE SEARCH / TEMP LAYOFF) ----------
  { type:"u_apps",                correct:"U", text:"Not working; sent out job applications in the last 2 weeks; available." },
  { type:"u_interview",           correct:"U", text:"Not working; interviewed recently; available to start." },
  { type:"u_contacted",           correct:"U", text:"Not working; contacted employers in the last 2 weeks; available." },
  { type:"u_agency",              correct:"U", text:"Not working; registered with an employment agency; available." },
  { type:"u_temp_layoff",         correct:"U", text:"On temporary layoff; expects recall; available to work." },
  { type:"u_offer_startsoon",     correct:"U", text:"Not working; accepted a job offer; starts soon; available." },

  // ---------- NOT IN LABOR FORCE ----------
  { type:"n_student_fulltime",    correct:"N", text:"Full-time student; not working; not looking for work." },
  { type:"n_student_parttime",    correct:"N", text:"Part-time student; not working; not actively searching." },
  { type:"n_retired",             correct:"N", text:"Retired; not working; not looking for work." },
  { type:"n_home_parent",         correct:"N", text:"Stay-at-home parent; not working; not actively searching." },
  { type:"n_discouraged",         correct:"N", text:"Discouraged worker: wants a job but stopped searching." },
  { type:"n_other_reason",        correct:"N", text:"Not working; not searching due to other reasons (e.g., transportation, caregiving)." },
  { type:"n_disability",          correct:"N", text:"Not working due to disability; not searching." },

  // ---------- INTENTIONALLY TRICKIER / BORDERLINE PHRASES ----------
  // (Still mapped to a category according to the lab’s rule set.)
  { type:"u_wait_recall",          correct:"U", text:"Not working; waiting to be recalled to a previous job; available." },
  { type:"n_wants_job_no_search",  correct:"N", text:"Not working; would take a job, but hasn’t looked recently." },
];

const TEMPLATE_BY_TYPE = new Map(CARD_TEMPLATES.map(t => [t.type, t]));

/* -----------------------
   Round generation
------------------------ */

let cards = []; // {id,type,text,correct,zone,people,checked}
let nextId = 1;

function drawPeople(){
  // Reasonable classroom numbers, varying each round.
  // 4..26 with occasional bump
  const base = 4 + Math.floor(Math.random()*23); // 4..26
  const bump = (Math.random() < 0.20) ? (4 + Math.floor(Math.random()*8)) : 0;
  return Math.min(35, base + bump);
}

function makeCardFromTemplate(tpl){
  return {
    id: "c" + (nextId++),
    type: tpl.type,
    text: tpl.text,
    correct: tpl.correct,
    zone: "S",             // staging pile
    people: drawPeople(),  // randomized each round
    checked: null
  };
}

function chooseRandomSample(){
  const pool = [...CARD_TEMPLATES].sort(()=>Math.random()-0.5);

  // sample size: 12..16
  const n = 12 + Math.floor(Math.random()*5);
  const chosen = pool.slice(0, n);

  cards = chosen.map(makeCardFromTemplate);

  // clear moves state
  snapshotSet = false;
  moveCards = [];
  if (els.moveDeck) els.moveDeck.innerHTML = `<div class="mini">Set a snapshot first.</div>`;
  if (els.snapshotBox) els.snapshotBox.innerHTML = `<strong>Snapshot:</strong> not set yet (click “Use these counts for move cards”).`;
  if (els.explainBox) els.explainBox.innerHTML = `Click <strong>Use these counts for move cards</strong>, then click a move card.`;
  if (els.predSel) els.predSel.value = "";

  if (els.checkMsg) els.checkMsg.textContent = "";
}

/* -----------------------
   Rendering & Drag/Drop
------------------------ */

function renderZones(){
  if (!els.zoneS) return;

  els.zoneS.innerHTML = "";
  els.zoneE.innerHTML = "";
  els.zoneU.innerHTML = "";
  els.zoneN.innerHTML = "";

  for (const c of cards){
    const el = document.createElement("div");
    el.className = "card";
    if (c.checked === true) el.classList.add("ok");
    if (c.checked === false) el.classList.add("bad");

    el.draggable = true;
    el.dataset.cardId = c.id;

    el.innerHTML = `
      <div class="top">
        <div class="badge">${c.people} people</div>
      </div>
      <div class="desc">${c.text}</div>
    `;

    el.addEventListener("dragstart", (ev) => {
      ev.dataTransfer.setData("text/plain", c.id);
      ev.dataTransfer.effectAllowed = "move";
    });

    const zoneEl = c.zone === "S" ? els.zoneS
      : c.zone === "E" ? els.zoneE
      : c.zone === "U" ? els.zoneU
      : els.zoneN;

    zoneEl.appendChild(el);
  }
}

function setupDropzone(zoneEl){
  zoneEl.addEventListener("dragover", (ev) => {
    ev.preventDefault();
    zoneEl.classList.add("dragover");
  });
  zoneEl.addEventListener("dragleave", () => zoneEl.classList.remove("dragover"));
  zoneEl.addEventListener("drop", (ev) => {
    ev.preventDefault();
    zoneEl.classList.remove("dragover");
    const id = ev.dataTransfer.getData("text/plain");
    const zone = zoneEl.dataset.zone;
    const c = cards.find(x => x.id === id);
    if (!c) return;

    c.zone = zone;
    c.checked = null; // classification changed
    if (els.checkMsg) els.checkMsg.textContent = "";
    renderZones();
    updateMetricsFromZones();

    // changing zones can make some story moves feasible now
    if (snapshotSet) rerollMoves();
  });
}

/* -----------------------
   Counts & metrics from placed cards
   (staging pile doesn't count)
------------------------ */

function countsFromZones(){
  let E=0,U=0,N=0;
  for (const c of cards){
    if (c.zone === "E") E += c.people;
    else if (c.zone === "U") U += c.people;
    else if (c.zone === "N") N += c.people;
  }
  return {E,U,N};
}

function updateMetricsFromZones(){
  const {E,U,N} = countsFromZones();
  const {LF,Pop,u,lfpr} = rates(E,U,N);

  els.mE.textContent = E.toFixed(0);
  els.mU.textContent = U.toFixed(0);
  els.mN.textContent = N.toFixed(0);
  els.mUR.textContent = fmtPct(u);
  els.mLFPR.textContent = fmtPct(lfpr);
  els.pillLF.textContent = LF.toFixed(0);
  els.pillPop.textContent = Pop.toFixed(0);
}

/* -----------------------
   Check classification (ignores staging)
------------------------ */

function checkCategories(){
  let correct = 0;
  let placed = 0;

  for (const c of cards){
    if (c.zone === "S") { c.checked = null; continue; }
    placed++;
    c.checked = (c.zone === c.correct);
    if (c.checked) correct++;
  }

  renderZones();
  if (els.checkMsg){
    els.checkMsg.textContent = placed === 0
      ? "Place some cards first."
      : `${correct}/${placed} placed cards correctly classified.`;
  }
  setStatus("Checked categories.");
}

/* -----------------------
   Move cards: story-specific and card-specific
------------------------ */

let snapshotSet = false;
let moveCards = []; // {id, templateId, text, fromType,fromZone,toType,toZone, people, disabled?}

const MOVE_STORY_TEMPLATES = [
  // N -> U (search begins)
  {
    id: "students_grad_search",
    fromType: "n_student_fulltime", fromZone: "N",
    toType: "u_apps", toZone: "U",
    verb: "graduate and start looking for work",
  },
  {
    id: "discouraged_start_search",
    fromType: "n_discouraged", fromZone: "N",
    toType: "u_contacted", toZone: "U",
    verb: "start actively searching for work",
  },
  {
    id: "retired_enter_search",
    fromType: "n_retired", fromZone: "N",
    toType: "u_agency", toZone: "U",
    verb: "enter the labor force and start searching",
  },
  {
    id: "home_parent_search",
    fromType: "n_home_parent", fromZone: "N",
    toType: "u_apps", toZone: "U",
    verb: "start searching for work",
  },

  // U -> E (job found)
  {
    id: "apps_find_job",
    fromType: "u_apps", fromZone: "U",
    toType: "emp_parttime", toZone: "E",
    verb: "find jobs and become employed",
  },
  {
    id: "interview_find_job",
    fromType: "u_interview", fromZone: "U",
    toType: "emp_fulltime", toZone: "E",
    verb: "get hired and become employed",
  },
  {
    id: "temp_layoff_recalled",
    fromType: "u_temp_layoff", fromZone: "U",
    toType: "emp_temp_absent", toZone: "E",
    verb: "are recalled and return to work",
  },

  // E -> U (job loss)
  {
    id: "layoff_emp_to_u",
    fromType: "emp_fulltime", fromZone: "E",
    toType: "u_apps", toZone: "U",
    verb: "lose their jobs and start searching",
  },

  // U -> N (stop searching)
  {
    id: "stop_search",
    fromType: "u_contacted", fromZone: "U",
    toType: "n_discouraged", toZone: "N",
    verb: "stop searching and become discouraged",
  },
  {
    id: "u_to_school",
    fromType: "u_apps", fromZone: "U",
    toType: "n_student_fulltime", toZone: "N",
    verb: "stop searching and return to school",
  },

  // E -> N (leave labor force)
  {
    id: "emp_to_school",
    fromType: "emp_parttime", fromZone: "E",
    toType: "n_student_fulltime", toZone: "N",
    verb: "leave their jobs and go to school",
  },
  {
    id: "emp_to_retired",
    fromType: "emp_fulltime", fromZone: "E",
    toType: "n_retired", toZone: "N",
    verb: "retire and leave the labor force",
  },
];

function cardLabelByType(type){
  // For story text: short human label
  const map = {
    "n_student_fulltime": "full-time students",
    "n_student_parttime": "part-time students",
    "n_retired": "retirees",
    "n_home_parent": "stay-at-home parents",
    "n_discouraged": "discouraged workers",
    "n_other_reason": "nonparticipants",
    "n_disability": "nonparticipants",
    "u_apps": "job seekers",
    "u_interview": "job seekers",
    "u_contacted": "job seekers",
    "u_agency": "job seekers",
    "u_temp_layoff": "workers on temporary layoff",
    "u_offer_startsoon": "job offer recipients",
    "emp_parttime": "workers",
    "emp_fulltime": "workers",
    "emp_gig": "gig workers",
    "emp_family_unpaid": "family workers",
    "emp_temp_absent": "workers",
    "emp_one_day": "workers",
    "emp_remote": "workers",
    "u_wait_recall": "workers waiting for recall",
    "n_wants_job_no_search": "nonparticipants",
  };
  return map[type] || "people";
}

function findSourceCard(fromType, fromZone){
  // Only use a card if it's in the specified zone AND has people > 0
  return cards.find(c => c.type === fromType && c.zone === fromZone && c.people > 0);
}

function ensureDestCard(toType, toZone){
  // If destination card exists in correct zone, use it.
  let d = cards.find(c => c.type === toType && c.zone === toZone);
  if (d) return d;

  // Create a new instance if template exists
  const tpl = TEMPLATE_BY_TYPE.get(toType);
  if (!tpl) return null;

  d = makeCardFromTemplate(tpl);
  d.zone = toZone;
  d.people = 0;
  d.checked = null;
  cards.push(d);
  return d;
}

function chooseTransferAmount(maxAvail){
  // Prefer smaller chunks to keep changes interpretable
  const cap = Math.min(10, maxAvail);
  if (cap <= 0) return 0;
  return 1 + Math.floor(Math.random()*cap);
}

function rollStoryMoveCard(){
  // Try a few templates for feasibility
  const shuffled = [...MOVE_STORY_TEMPLATES].sort(()=>Math.random()-0.5);

  for (const t of shuffled){
    const src = findSourceCard(t.fromType, t.fromZone);
    if (!src) continue;

    const k = chooseTransferAmount(src.people);
    if (k <= 0) continue;

    const who = cardLabelByType(t.fromType);
    const text = `${k} ${who} ${t.verb}.`;

    return {
      id: "m" + Math.floor(Math.random()*1e9),
      templateId: t.id,
      fromType: t.fromType, fromZone: t.fromZone,
      toType: t.toType, toZone: t.toZone,
      people: k,
      text
    };
  }

  return {
    id: "m" + Math.floor(Math.random()*1e9),
    templateId: "none",
    people: 0,
    text: "No feasible move right now. (Place more cards into E/U/N, and ensure source cards are in the right bucket.)",
    disabled: true
  };
}

function rerollMoves(){
  if (!snapshotSet){
    els.moveDeck.innerHTML = `<div class="mini">Set a snapshot first.</div>`;
    return;
  }
  moveCards = [];
  for (let i=0; i<4; i++) moveCards.push(rollStoryMoveCard());
  renderMoveDeck();
}

function renderMoveDeck(){
  els.moveDeck.innerHTML = "";
  for (const mc of moveCards){
    const div = document.createElement("div");
    div.className = "moveCard";
    div.dataset.moveId = mc.id;
    if (mc.disabled) div.style.opacity = "0.65";

    div.innerHTML = `
      <div class="hdr">
        <div class="title">${mc.text}</div>
        <div class="amt">${mc.people ? mc.people + " ppl" : ""}</div>
      </div>
      <div class="hint">${mc.disabled ? "Adjust your sorting so a source card exists in the right bucket." : "Click to apply."}</div>
    `;

    div.addEventListener("click", () => applyMoveCard(mc.id));
    els.moveDeck.appendChild(div);
  }
}

function predKey(uArrow, lfArrow){
  const uPart = (uArrow==="↑") ? "u_up" : (uArrow==="↓") ? "u_down" : "u_same";
  const lPart = (lfArrow==="↑") ? "lfpr_up" : (lfArrow==="↓") ? "lfpr_down" : "lfpr_same";
  return `${uPart}_${lPart}`;
}
function signArrow(x0, x1){
  const eps = 1e-12;
  if (x1 > x0 + eps) return "↑";
  if (x1 < x0 - eps) return "↓";
  return "↔";
}

function explainDelta(beforeCounts, afterCounts){
  const rb = rates(beforeCounts.E, beforeCounts.U, beforeCounts.N);
  const ra = rates(afterCounts.E, afterCounts.U, afterCounts.N);

  const uA = signArrow(rb.u, ra.u);
  const lfA = signArrow(rb.lfpr, ra.lfpr);

  const lines = [];
  lines.push(`<strong>Result:</strong> u ${uA}, LFPR ${lfA}.`);
  lines.push(`<div style="margin-top:8px;">`);
  lines.push(`u = U/(E+U). LFPR = (E+U)/(E+U+N).`);
  lines.push(`Labor force: ${rb.LF} → ${ra.LF}. U: ${beforeCounts.U} → ${afterCounts.U}.`);
  lines.push(`</div>`);

  const p = els.predSel.value;
  if (p){
    const correct = predKey(uA, lfA);
    lines.push(`<div style="margin-top:8px;"><strong>Prediction:</strong> ${p === correct ? "✅ correct" : "❌ not quite"}</div>`);
  }

  return lines.join("");
}

function useForMoves(){
  // Snapshot is simply: "moves are enabled and operate on cards currently placed"
  snapshotSet = true;

  const c = countsFromZones();
  const r = rates(c.E, c.U, c.N);

  els.snapshotBox.innerHTML =
    `<strong>Snapshot:</strong> Using your current placed cards.
     E=${c.E}, U=${c.U}, N=${c.N} (LF=${r.LF}, Pop=${r.Pop}, u=${fmtPct(r.u)}, LFPR=${fmtPct(r.lfpr)}).`;

  els.explainBox.innerHTML = `Click a move card to apply it.`;
  els.predSel.value = "";

  rerollMoves();
  setStatus("Move cards enabled (they will now update specific cards and the top counts/rates).");
}

function applyMoveCard(moveId){
  if (!snapshotSet) return;

  const idx = moveCards.findIndex(m => m.id === moveId);
  if (idx < 0) return;
  const mc = moveCards[idx];
  if (mc.disabled) return;

  // MUST have source card in correct zone
  const src = findSourceCard(mc.fromType, mc.fromZone);
  if (!src){
    setStatus("That move isn't feasible: source card not found in the required bucket.");
    // reroll this card
    moveCards[idx] = rollStoryMoveCard();
    renderMoveDeck();
    return;
  }

  const beforeCounts = countsFromZones();

  const k = Math.min(mc.people, src.people);
  if (k <= 0){
    moveCards[idx] = rollStoryMoveCard();
    renderMoveDeck();
    return;
  }

  // Subtract from source
  src.people -= k;
  src.checked = null;

  // Add to destination card in correct bucket (create if missing)
  const dest = ensureDestCard(mc.toType, mc.toZone);
  if (!dest){
    setStatus("Internal: destination card template missing.");
    return;
  }
  dest.people += k;
  dest.checked = null;

  // Re-render, update top metrics
  renderZones();
  updateMetricsFromZones();

  const afterCounts = countsFromZones();

  // Explain
  els.explainBox.innerHTML =
    `<strong>Applied move:</strong> ${mc.text}<br>` +
    `<div style="margin-top:8px;">${explainDelta(beforeCounts, afterCounts)}</div>`;

  // Update snapshot display
  const r = rates(afterCounts.E, afterCounts.U, afterCounts.N);
  els.snapshotBox.innerHTML =
    `<strong>Snapshot:</strong> Using your current placed cards.
     E=${afterCounts.E}, U=${afterCounts.U}, N=${afterCounts.N} (LF=${r.LF}, Pop=${r.Pop}, u=${fmtPct(r.u)}, LFPR=${fmtPct(r.lfpr)}).`;

  // Reroll used move card (new text + new amount based on current board)
  moveCards[idx] = rollStoryMoveCard();
  renderMoveDeck();

  // reset prediction
  els.predSel.value = "";

  setStatus(`Moved ${k} people from ${mc.fromZone} to ${mc.toZone}.`);

  // No MathJax typesetting here (dynamic text is plain)
}

/* -----------------------
   Reset / Init
------------------------ */

function resetAll(){
  snapshotSet = false;
  moveCards = [];

  if (els.moveDeck) els.moveDeck.innerHTML = `<div class="mini">Set a snapshot first.</div>`;
  if (els.snapshotBox) els.snapshotBox.innerHTML = `<strong>Snapshot:</strong> not set yet (click “Use these counts for move cards”).`;
  if (els.explainBox) els.explainBox.innerHTML =
    `Click <strong>Use these counts for move cards</strong>, then click a move card. This box will explain the change in u and LFPR.`;
  if (els.predSel) els.predSel.value = "";
  if (els.checkMsg) els.checkMsg.textContent = "";

  chooseRandomSample();
  renderZones();
  updateMetricsFromZones();
  setStatus("Reset.");

  // typeset header definitions only
  const top = document.getElementById("mathBoxTop");
  if (top) safeTypeset([top]);
}

/* -----------------------
   Wire up events
------------------------ */

setupDropzone(els.zoneS);
setupDropzone(els.zoneE);
setupDropzone(els.zoneU);
setupDropzone(els.zoneN);

els.checkBtn.addEventListener("click", checkCategories);
els.useForMovesBtn.addEventListener("click", useForMoves);
els.rerollMovesBtn.addEventListener("click", rerollMoves);

els.resetBtn.addEventListener("click", resetAll);
els.newSetBtn.addEventListener("click", () => {
  snapshotSet = false;
  moveCards = [];
  if (els.moveDeck) els.moveDeck.innerHTML = `<div class="mini">Set a snapshot first.</div>`;
  if (els.snapshotBox) els.snapshotBox.innerHTML = `<strong>Snapshot:</strong> not set yet (click “Use these counts for move cards”).`;
  if (els.explainBox) els.explainBox.innerHTML = `Click <strong>Use these counts for move cards</strong>, then click a move card.`;
  if (els.predSel) els.predSel.value = "";
  if (els.checkMsg) els.checkMsg.textContent = "";

  chooseRandomSample();
  renderZones();
  updateMetricsFromZones();
  setStatus("New round loaded.");

  const top = document.getElementById("mathBoxTop");
  if (top) safeTypeset([top]);
});

// start
resetAll();
