const els = {
  // metrics (from cards)
  mE: document.getElementById("mE"),
  mU: document.getElementById("mU"),
  mN: document.getElementById("mN"),
  mUR: document.getElementById("mUR"),
  mLFPR: document.getElementById("mLFPR"),
  pillLF: document.getElementById("pillLF"),
  pillPop: document.getElementById("pillPop"),
  checkBtn: document.getElementById("checkBtn"),
  useForMovesBtn: document.getElementById("useForMovesBtn"),
  checkMsg: document.getElementById("checkMsg"),

  // zones
  zoneE: document.getElementById("zoneE"),
  zoneU: document.getElementById("zoneU"),
  zoneN: document.getElementById("zoneN"),

  // top controls
  resetBtn: document.getElementById("resetBtn"),
  newSetBtn: document.getElementById("newSetBtn"),
  status: document.getElementById("status"),

  // move sim
  moveSel: document.getElementById("moveSel"),
  amt: document.getElementById("amt"),
  predSel: document.getElementById("predSel"),
  applyMoveBtn: document.getElementById("applyMoveBtn"),
  explainBox: document.getElementById("explainBox"),
  snapshotBox: document.getElementById("snapshotBox"),
};

function fmtPct(x){ return (100*x).toFixed(2) + "%"; }
function clampInt(x, lo=0){ return Math.max(lo, Math.floor(x)); }

function ratesFromCounts(E,U,N){
  const LF = E + U;
  const Pop = E + U + N;
  const u = (LF>0) ? (U / LF) : 0;
  const lfpr = (Pop>0) ? (LF / Pop) : 0;
  return { LF, Pop, u, lfpr };
}

/* ---------------------------
   Part A: Card classification
---------------------------- */

let cards = []; // {id, people, text, correct, zone}
let nextId = 1;

function makeCard({people, text, correct}){
  return {
    id: "c" + (nextId++),
    people,
    text,
    correct,   // "E" | "U" | "N"
    zone: "N", // start them in N by default to force sorting; you can change to "E"
    checked: null
  };
}

// A bank of ambiguous-but-teachable cards
const CARD_BANK = [
  { people: 12, text: "Worked part-time at a coffee shop this week.", correct: "E" },
  { people: 8, text: "Worked unpaid 10 hours in a family business.", correct: "E" },
  { people: 15, text: "Has a job but was temporarily absent (sick/vacation).", correct: "E" },
  { people: 10, text: "Not working and sent out job applications in the last 2 weeks.", correct: "U" },
  { people: 6, text: "Not working; interviewed for a job last week; available to start.", correct: "U" },
  { people: 9, text: "Not working but starts a new job next week (already accepted) and is available.", correct: "U" },
  { people: 14, text: "Full-time student; not working; not looking for work.", correct: "N" },
  { people: 7, text: "Retired; not working; not looking for work.", correct: "N" },
  { people: 5, text: "Stay-at-home parent; not working; not actively searching.", correct: "N" },
  { people: 11, text: "Discouraged worker: wants a job but stopped searching.", correct: "N" },
  { people: 9, text: "Not working and waiting to be recalled; not searching this week.", correct: "U" }, // common wrinkle; we treat as U
  { people: 8, text: "Gig worker who did paid deliveries this week.", correct: "E" },
];

// Choose a random subset
function newCardSet(){
  // pick 9–12 cards
  const n = 10 + Math.floor(Math.random()*3); // 10..12
  const pool = [...CARD_BANK].sort(()=>Math.random()-0.5);
  const chosen = pool.slice(0, n);

  cards = chosen.map(c => makeCard(c));

  // start all cards in a “staging” approach: place them in N by default
  for (const c of cards) c.zone = "N";

  els.checkMsg.textContent = "";
  renderZones();
  updateMetricsFromZones();
  setStatus("New card set loaded.");
}

function renderZones(){
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

    const zone = (c.zone === "E") ? els.zoneE : (c.zone === "U") ? els.zoneU : els.zoneN;
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
    else N += c.people;
  }
  return {E,U,N};
}

function updateMetricsFromZones(){
  const {E,U,N} = countsFromZones();
  const {LF,Pop,u,lfpr} = ratesFromCounts(E,U,N);

  els.mE.textContent = E.toFixed(0);
  els.mU.textContent = U.toFixed(0);
  els.mN.textContent = N.toFixed(0);
  els.mUR.textContent = fmtPct(u);
  els.mLFPR.textContent = fmtPct(lfpr);
  els.pillLF.textContent = LF.toFixed(0);
  els.pillPop.textContent = Pop.toFixed(0);

  // typeset only the header math (once) is fine; no need to typeset everything repeatedly.
}

function checkCategories(){
  let correct = 0;
  for (const c of cards){
    c.checked = (c.zone === c.correct);
    if (c.checked) correct++;
  }
  renderZones();
  els.checkMsg.textContent = `${correct}/${cards.length} cards correctly classified.`;
  setStatus("Checked categories.");
}

/* ---------------------------
   Part B: Move simulator
---------------------------- */

let snapshot = null; // {E,U,N} used for moves

const MOVES = [
  { id:"E_to_U", label:"Employed → Unemployed (job loss)", from:"E", to:"U" },
  { id:"U_to_E", label:"Unemployed → Employed (finds job)", from:"U", to:"E" },
  { id:"N_to_E", label:"Not in LF → Employed (starts working)", from:"N", to:"E" },
  { id:"N_to_U", label:"Not in LF → Unemployed (starts job search)", from:"N", to:"U" },
  { id:"E_to_N", label:"Employed → Not in LF (leaves job, stops searching)", from:"E", to:"N" },
  { id:"U_to_N", label:"Unemployed → Not in LF (stop searching)", from:"U", to:"N" },
];

function populateMoves(){
  els.moveSel.innerHTML = "";
  for (const m of MOVES){
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.label;
    els.moveSel.appendChild(opt);
  }
}

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

// This is where MathJax was failing earlier:
// Use \\( \\) inside JS strings AND typeset only this box after setting innerHTML.
function explainMove(move, xfer, before, after){
  const rb = ratesFromCounts(before.E, before.U, before.N);
  const ra = ratesFromCounts(after.E, after.U, after.N);

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

function useCountsForMoves(){
  snapshot = countsFromZones();
  const r = ratesFromCounts(snapshot.E, snapshot.U, snapshot.N);

  els.snapshotBox.innerHTML = `
    <strong>Snapshot used for moves</strong><br>
    <span class="mini">
      E=${snapshot.E}, U=${snapshot.U}, N=${snapshot.N} (Pop=${r.Pop}, LF=${r.LF})<br>
      u=${fmtPct(r.u)}, LFPR=${fmtPct(r.lfpr)}
    </span>
  `;
  els.explainBox.innerHTML = `Choose a transition and click <strong>Apply move</strong>.`;
  els.predSel.value = "";
  setStatus("Snapshot saved. Now try transitions.");

  // typeset just the snapshot box (in case MathJax is present there later)
  safeTypeset([els.snapshotBox]);
}

function applyMove(){
  if (!snapshot){
    setStatus("Click “Use these counts for moves” first.");
    return;
  }

  const moveId = els.moveSel.value;
  const move = MOVES.find(m => m.id === moveId);
  if (!move) return;

  const amt = clampInt(Number(els.amt.value || 0), 0);
  if (amt <= 0){
    setStatus("Enter a positive number of people to move.");
    return;
  }

  const before = {...snapshot};
  const available = snapshot[move.from];
  const xfer = Math.min(amt, available);

  snapshot[move.from] -= xfer;
  snapshot[move.to] += xfer;

  const after = {...snapshot};
  els.explainBox.innerHTML = explainMove(move, xfer, before, after);
  setStatus(`Moved ${xfer} from ${move.from} to ${move.to}.`);

  els.predSel.value = "";

  // typeset ONLY the explain box (this is the key fix)
  safeTypeset([els.explainBox]);
}

function safeTypeset(nodes){
  if (!window.MathJax || !window.MathJax.typesetPromise) return;
  // Clear previous typesetting only for those nodes
  try { window.MathJax.typesetClear(nodes); } catch {}
  window.MathJax.typesetPromise(nodes).catch(()=>{});
}

/* ---------------------------
   Misc
---------------------------- */

function setStatus(msg){ els.status.textContent = msg; }

function resetAll(){
  // start with a deterministic set
  cards = CARD_BANK.slice(0, 10).map(c => makeCard(c));
  for (const c of cards) c.zone = "N";
  snapshot = null;

  els.checkMsg.textContent = "";
  els.predSel.value = "";
  els.explainBox.innerHTML = `Click <strong>Use these counts for moves</strong> first, then try transitions here.`;
  els.snapshotBox.innerHTML = `<strong>Snapshot used for moves</strong><br><span class="mini">Not set yet.</span>`;

  renderZones();
  updateMetricsFromZones();
  populateMoves();
  setStatus("Reset.");

  // typeset top definitions once
  safeTypeset([document.getElementById("mathBoxTop")]);
}

function newSet(){
  newCardSet();
  snapshot = null;
  els.snapshotBox.innerHTML = `<strong>Snapshot used for moves</strong><br><span class="mini">Not set yet.</span>`;
  els.explainBox.innerHTML = `Click <strong>Use these counts for moves</strong> first, then try transitions here.`;
  safeTypeset([document.getElementById("mathBoxTop")]);
}

// init
setupDropzone(els.zoneE);
setupDropzone(els.zoneU);
setupDropzone(els.zoneN);

els.checkBtn.addEventListener("click", checkCategories);
els.useForMovesBtn.addEventListener("click", useCountsForMoves);
els.applyMoveBtn.addEventListener("click", applyMove);

els.resetBtn.addEventListener("click", resetAll);
els.newSetBtn.addEventListener("click", newSet);

resetAll();
