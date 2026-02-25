const els = {
  // sorting metrics
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

  checkBtn: document.getElementById("checkBtn"),
  useForMovesBtn: document.getElementById("useForMovesBtn"),
  checkMsg: document.getElementById("checkMsg"),

  resetBtn: document.getElementById("resetBtn"),
  newSetBtn: document.getElementById("newSetBtn"),
  status: document.getElementById("status"),

  // moves
  snapshotBox: document.getElementById("snapshotBox"),
  moveDeck: document.getElementById("moveDeck"),
  predSel: document.getElementById("predSel"),
  rerollMovesBtn: document.getElementById("rerollMovesBtn"),
  explainBox: document.getElementById("explainBox"),
};

function fmtPct(x){ return (100*x).toFixed(2) + "%"; }
function clampInt(x, lo=0){ return Math.max(lo, Math.floor(x)); }

function rates(E,U,N){
  const LF = E + U;
  const Pop = E + U + N;
  const u = (LF>0) ? (U / LF) : 0;
  const lfpr = (Pop>0) ? (LF / Pop) : 0;
  return { LF, Pop, u, lfpr };
}

function safeTypeset(nodes){
  if (!window.MathJax || !window.MathJax.typesetPromise) return;
  try { window.MathJax.typesetClear(nodes); } catch {}
  window.MathJax.typesetPromise(nodes).catch(()=>{});
}

/* -----------------------
   Part A: Sorting cards
------------------------ */

let cards = []; // {id, people, text, correct, zone, checked}
let nextId = 1;

// Many templates (you can keep adding)
const CARD_TEMPLATES = [
  // Employed
  { text:"Worked part-time at a coffee shop this week.", correct:"E" },
  { text:"Worked unpaid 10 hours in a family business.", correct:"E" },
  { text:"Has a job but was temporarily absent (sick/vacation).", correct:"E" },
  { text:"Did paid gig deliveries this week.", correct:"E" },
  { text:"Worked for pay from home this week.", correct:"E" },
  { text:"Worked one day this week (seasonal job).", correct:"E" },

  // Unemployed
  { text:"Not working and sent out job applications in the last 2 weeks.", correct:"U" },
  { text:"Not working; interviewed last week; available to start.", correct:"U" },
  { text:"Not working; starts a new job next week; available.", correct:"U" },
  { text:"On temporary layoff and expects recall; available to work.", correct:"U" },
  { text:"Not working; contacted employers; actively searching.", correct:"U" },
  { text:"Not working; registered with an employment agency this week.", correct:"U" },

  // Not in labor force
  { text:"Full-time student; not working; not looking for work.", correct:"N" },
  { text:"Retired; not working; not looking for work.", correct:"N" },
  { text:"Stay-at-home parent; not working; not actively searching.", correct:"N" },
  { text:"Discouraged worker: wants a job but stopped searching.", correct:"N" },
  { text:"Not working; would take a job, but hasn’t looked recently.", correct:"N" },
  { text:"Taking care of a relative; not working; not searching.", correct:"N" },
  { text:"Receiving disability benefits; not working; not searching.", correct:"N" },
];

// random people count each draw
function drawPeople(){
  // 3..25 with mild skew upward
  const base = 3 + Math.floor(Math.random()*23);
  const bump = (Math.random() < 0.25) ? (5 + Math.floor(Math.random()*8)) : 0;
  return Math.min(30, base + bump);
}

function makeCard(tpl){
  return {
    id: "c" + (nextId++),
    people: drawPeople(),
    text: tpl.text,
    correct: tpl.correct, // "E"|"U"|"N"
    zone: "S",            // staging pile
    checked: null
  };
}

function newRound(){
  const pool = [...CARD_TEMPLATES].sort(()=>Math.random()-0.5);

  // draw 10..14 each round
  const n = 10 + Math.floor(Math.random()*5);
  const chosen = pool.slice(0, n);

  cards = chosen.map(makeCard);

  els.checkMsg.textContent = "";
  renderZones();
  updateMetricsFromZones();
  setStatus("New round loaded (random cards + random people counts).");
}

function renderZones(){
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

    const zone = (c.zone === "S") ? els.zoneS
      : (c.zone === "E") ? els.zoneE
      : (c.zone === "U") ? els.zoneU
      : els.zoneN;

    zone.appendChild(el);
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
    const z = zoneEl.dataset.zone;
    const c = cards.find(x => x.id === id);
    if (!c) return;
    c.zone = z;
    c.checked = null;
    els.checkMsg.textContent = "";
    renderZones();
    updateMetricsFromZones();
  });
}

function countsFromZones(){
  let E=0,U=0,N=0;
  for (const c of cards){
    if (c.zone === "E") E += c.people;
    else if (c.zone === "U") U += c.people;
    else if (c.zone === "N") N += c.people;
    // staging pile doesn't count yet
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

function checkCategories(){
  let correct = 0;
  for (const c of cards){
    if (c.zone === "S") { c.checked = null; continue; }
    c.checked = (c.zone === c.correct);
    if (c.checked) correct++;
  }
  renderZones();
  const placed = cards.filter(c => c.zone !== "S").length;
  els.checkMsg.textContent = `${correct}/${placed} placed cards correctly classified.`;
  setStatus("Checked categories (staging cards ignored).");
}

/* -----------------------
   Part B: Move cards
------------------------ */

let snapshot = null; // {E,U,N} used for moves
let moveCards = [];  // {id, from, to, label, people, hint}

const MOVE_TYPES = [
  { id:"E_to_U", label:"Employed → Unemployed", from:"E", to:"U", hint:"Job loss" },
  { id:"U_to_E", label:"Unemployed → Employed", from:"U", to:"E", hint:"Finds a job" },
  { id:"N_to_E", label:"Not in LF → Employed", from:"N", to:"E", hint:"Starts working" },
  { id:"N_to_U", label:"Not in LF → Unemployed", from:"N", to:"U", hint:"Starts searching" },
  { id:"E_to_N", label:"Employed → Not in LF", from:"E", to:"N", hint:"Leaves labor force" },
  { id:"U_to_N", label:"Unemployed → Not in LF", from:"U", to:"N", hint:"Stops searching" },
];

function signArrow(x0, x1){
  const eps = 1e-12;
  if (x1 > x0 + eps) return "↑";
  if (x1 < x0 - eps) return "↓";
  return "↔";
}
function predKey(uArrow, lfArrow){
  const uPart = (uArrow==="↑") ? "u_up" : (uArrow==="↓") ? "u_down" : "u_same";
  const lPart = (lfArrow==="↑") ? "lfpr_up" : (lfArrow==="↓") ? "lfpr_down" : "lfpr_same";
  return `${uPart}_${lPart}`;
}

function explainMove(move, xfer, before, after){
  const rb = rates(before.E, before.U, before.N);
  const ra = rates(after.E, after.U, after.N);

  const uA  = signArrow(rb.u, ra.u);
  const lfA = signArrow(rb.lfpr, ra.lfpr);

  const parts = [];
  parts.push(`<strong>Result:</strong> unemployment rate <strong>${uA}</strong>, LFPR <strong>${lfA}</strong>.`);

  const mech = [];
  const LFb = rb.LF, LFa = ra.LF;
  const Ub = before.U, Ua = after.U;

  if (LFb === LFa){
    if (Ua > Ub) mech.push(`Labor force is unchanged (\$begin:math:text$E\+U\\$end:math:text$ stays ${LFb}). \$begin:math:text$U\\$end:math:text$ rises, so \$begin:math:text$u\=U\/\(E\+U\)\\$end:math:text$ rises.`);
    else if (Ua < Ub) mech.push(`Labor force is unchanged (\$begin:math:text$E\+U\\$end:math:text$ stays ${LFb}). \$begin:math:text$U\\$end:math:text$ falls, so \$begin:math:text$u\\$end:math:text$ falls.`);
    else mech.push(`Labor force and \$begin:math:text$U\\$end:math:text$ are unchanged, so \$begin:math:text$u\\$end:math:text$ is unchanged.`);
  } else {
    mech.push(`Labor force changes from ${LFb} to ${LFa}. Since \$begin:math:text$u\=U\/\(E\+U\)\\$end:math:text$, both \$begin:math:text$U\\$end:math:text$ and \$begin:math:text$E\+U\\$end:math:text$ matter.`);
    if (Ua > Ub) mech.push(`Here \$begin:math:text$U\\$end:math:text$ rises (from ${Ub} to ${Ua}).`);
    if (Ua < Ub) mech.push(`Here \$begin:math:text$U\\$end:math:text$ falls (from ${Ub} to ${Ua}).`);
  }

  if (LFa > LFb) mech.push(`LFPR rises because \$begin:math:text$LF\=E\+U\\$end:math:text$ increases while population \$begin:math:text$E\+U\+N\\$end:math:text$ stays fixed.`);
  if (LFa < LFb) mech.push(`LFPR falls because \$begin:math:text$LF\=E\+U\\$end:math:text$ decreases while population \$begin:math:text$E\+U\+N\\$end:math:text$ stays fixed.`);
  if (LFa === LFb) mech.push(`LFPR is unchanged because the labor force is unchanged.`);

  parts.push(`<div style="margin-top:8px;">${mech.join(" ")}</div>`);

  const p = els.predSel.value;
  if (p){
    const correct = predKey(uA, lfA);
    if (p === correct){
      parts.push(`<div style="margin-top:8px;"><strong>Prediction:</strong> ✅ correct.</div>`);
    } else {
      parts.push(`<div style="margin-top:8px;"><strong>Prediction:</strong> ❌ not quite. Correct is <strong>${uA}</strong> for unemployment and <strong>${lfA}</strong> for LFPR.</div>`);
    }
  }

  return parts.join("");
}

// Create move cards with feasible amounts based on snapshot
function rollMoveCard(){
  const t = MOVE_TYPES[Math.floor(Math.random()*MOVE_TYPES.length)];
  const available = snapshot ? snapshot[t.from] : 0;

  // choose a random amount, but must be feasible
  const raw = 3 + Math.floor(Math.random()*18); // 3..20
  const people = snapshot ? Math.min(raw, Math.max(0, available)) : raw;

  return {
    id: "m" + Math.floor(Math.random()*1e9),
    from: t.from,
    to: t.to,
    label: t.label,
    hint: t.hint,
    people
  };
}

function rerollMoves(){
  if (!snapshot){
    els.moveDeck.innerHTML = `<div class="mini">Set a snapshot first.</div>`;
    return;
  }
  // create 4 move cards
  moveCards = [];
  for (let i=0;i<4;i++) moveCards.push(rollMoveCard());
  renderMoveDeck();
}

function renderMoveDeck(){
  els.moveDeck.innerHTML = "";
  for (const mc of moveCards){
    const div = document.createElement("div");
    div.className = "moveCard";
    div.dataset.moveId = mc.id;

    div.innerHTML = `
      <div class="hdr">
        <div class="title">${mc.label}</div>
        <div class="amt">${mc.people} people</div>
      </div>
      <div class="hint">${mc.hint}. Click to apply.</div>
    `;

    div.addEventListener("click", () => applyMoveCard(mc.id));
    els.moveDeck.appendChild(div);
  }
}

function useCountsForMoves(){
  snapshot = countsFromZones();
  const r = rates(snapshot.E, snapshot.U, snapshot.N);

  els.snapshotBox.innerHTML = `
    <strong>Snapshot:</strong>
    E=${snapshot.E}, U=${snapshot.U}, N=${snapshot.N}
    (Pop=${r.Pop}, LF=${r.LF}, u=${fmtPct(r.u)}, LFPR=${fmtPct(r.lfpr)})
  `;

  els.explainBox.innerHTML = `Click a move card to apply it.`;
  els.predSel.value = "";
  setStatus("Snapshot set. Move cards rolled.");

  rerollMoves();
  safeTypeset([els.explainBox]);
}

function applyMoveCard(moveId){
  if (!snapshot) return;

  const idx = moveCards.findIndex(m => m.id === moveId);
  if (idx < 0) return;
  const mc = moveCards[idx];

  // if not feasible, reroll that card
  const available = snapshot[mc.from];
  if (available <= 0 || mc.people <= 0){
    moveCards[idx] = rollMoveCard();
    renderMoveDeck();
    setStatus("That move wasn’t feasible; rerolled a new move card.");
    return;
  }

  const xfer = Math.min(mc.people, available);

  const before = {...snapshot};
  snapshot[mc.from] -= xfer;
  snapshot[mc.to] += xfer;
  const after = {...snapshot};

  // Explain
  els.explainBox.innerHTML = explainMove(mc, xfer, before, after);
  safeTypeset([els.explainBox]);

  // Replace this move card with a new one (numbers “correspond to moves” each time)
  moveCards[idx] = rollMoveCard();
  renderMoveDeck();

  // Update snapshot display
  const r = rates(snapshot.E, snapshot.U, snapshot.N);
  els.snapshotBox.innerHTML = `
    <strong>Snapshot:</strong>
    E=${snapshot.E}, U=${snapshot.U}, N=${snapshot.N}
    (Pop=${r.Pop}, LF=${r.LF}, u=${fmtPct(r.u)}, LFPR=${fmtPct(r.lfpr)})
  `;

  els.predSel.value = "";
  setStatus(`Applied move: ${xfer} from ${mc.from} to ${mc.to}.`);
}

/* -----------------------
   Misc
------------------------ */

function setStatus(msg){ els.status.textContent = msg; }

function resetAll(){
  snapshot = null;
  moveCards = [];
  els.moveDeck.innerHTML = `<div class="mini">Set a snapshot first.</div>`;
  els.snapshotBox.innerHTML = `<strong>Snapshot:</strong> not set yet (click “Use these counts for move cards”).`;
  els.explainBox.innerHTML = `Click <strong>Use these counts for move cards</strong>, then click a move card. This box will explain the change in \$begin:math:text$u\\$end:math:text$ and LFPR.`;
  safeTypeset([els.explainBox, document.getElementById("mathBoxTop")]);

  newRound();
  updateMetricsFromZones();
  setStatus("Reset.");
}

// init dropzones
setupDropzone(els.zoneS);
setupDropzone(els.zoneE);
setupDropzone(els.zoneU);
setupDropzone(els.zoneN);

// buttons
els.checkBtn.addEventListener("click", checkCategories);
els.useForMovesBtn.addEventListener("click", useCountsForMoves);
els.resetBtn.addEventListener("click", resetAll);
els.newSetBtn.addEventListener("click", () => {
  snapshot = null;
  moveCards = [];
  els.moveDeck.innerHTML = `<div class="mini">Set a snapshot first.</div>`;
  els.snapshotBox.innerHTML = `<strong>Snapshot:</strong> not set yet (click “Use these counts for move cards”).`;
  els.explainBox.innerHTML = `Click <strong>Use these counts for move cards</strong>, then click a move card.`;
  els.predSel.value = "";
  newRound();
  updateMetricsFromZones();
  setStatus("New round loaded.");
});
els.rerollMovesBtn.addEventListener("click", rerollMoves);

// start
resetAll();
