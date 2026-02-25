const els = {
  mE: document.getElementById("mE"),
  mU: document.getElementById("mU"),
  mN: document.getElementById("mN"),
  mUR: document.getElementById("mUR"),
  mLFPR: document.getElementById("mLFPR"),
  pillLF: document.getElementById("pillLF"),
  pillPop: document.getElementById("pillPop"),

  moveSel: document.getElementById("moveSel"),
  amt: document.getElementById("amt"),
  predSel: document.getElementById("predSel"),
  applyBtn: document.getElementById("applyBtn"),

  explainBox: document.getElementById("explainBox"),
  historyList: document.getElementById("historyList"),

  resetBtn: document.getElementById("resetBtn"),
  randomBtn: document.getElementById("randomBtn"),
  status: document.getElementById("status"),

  nodeE: document.getElementById("nodeE"),
  nodeU: document.getElementById("nodeU"),
  nodeN: document.getElementById("nodeN"),

  svg: document.getElementById("flowSvg"),
  tokenLayer: document.getElementById("tokenLayer"),
};

let state = { E: 140, U: 10, N: 50 };
let history = [];

function clampInt(x, lo=0){ return Math.max(lo, Math.floor(x)); }
function fmtPct(x){ return (100*x).toFixed(2) + "%"; }

function rates(s){
  const LF = s.E + s.U;
  const Pop = s.E + s.U + s.N;
  const u = (LF>0) ? (s.U / LF) : 0;
  const lfpr = (Pop>0) ? (LF / Pop) : 0;
  return { LF, Pop, u, lfpr };
}

function render(){
  const { LF, Pop, u, lfpr } = rates(state);

  els.mE.textContent = state.E.toFixed(0);
  els.mU.textContent = state.U.toFixed(0);
  els.mN.textContent = state.N.toFixed(0);
  els.mUR.textContent = fmtPct(u);
  els.mLFPR.textContent = fmtPct(lfpr);

  els.pillLF.textContent = LF.toFixed(0);
  els.pillPop.textContent = Pop.toFixed(0);

  // diagram counts
  els.nodeE.textContent = `E = ${state.E.toFixed(0)}`;
  els.nodeU.textContent = `U = ${state.U.toFixed(0)}`;
  els.nodeN.textContent = `N = ${state.N.toFixed(0)}`;

  // history
  els.historyList.innerHTML = history.slice(0,5).map(h => `• ${h}`).join("<br>") || "—";

  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise();
  }
}

const MOVES = [
  { id:"E_to_U", label:"Employed → Unemployed (job loss)", from:"E", to:"U", pathId:"path_EU" },
  { id:"U_to_E", label:"Unemployed → Employed (finds job)", from:"U", to:"E", pathId:"path_UE" },

  { id:"N_to_E", label:"Not in LF → Employed (starts working)", from:"N", to:"E", pathId:"path_NE" },
  { id:"N_to_U", label:"Not in LF → Unemployed (starts job search)", from:"N", to:"U", pathId:"path_NU" },

  { id:"E_to_N", label:"Employed → Not in LF (leaves job, stops searching)", from:"E", to:"N", pathId:"path_EN" },
  { id:"U_to_N", label:"Unemployed → Not in LF (discouraged/stop searching)", from:"U", to:"N", pathId:"path_UN" },
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

// IMPORTANT: use \\( \\) inside JS strings so MathJax sees it.
function explainMove(move, xfer, before, after){
  const rb = rates(before);
  const ra = rates(after);

  const uA = signArrow(rb.u, ra.u);
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

  if (LFa > LFb) mech.push(`LFPR rises because \$begin:math:text$LF\=E\+U\\$end:math:text$ increases while population stays fixed.`);
  if (LFa < LFb) mech.push(`LFPR falls because \$begin:math:text$LF\=E\+U\\$end:math:text$ decreases while population stays fixed.`);
  if (LFa === LFb) mech.push(`LFPR is unchanged because the labor force is unchanged (and population is fixed).`);

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

/* ---------- Animation ---------- */

function animateToken(pathId, labelText){
  const path = document.getElementById(pathId);
  if (!path) return;

  // Clear any existing token
  els.tokenLayer.innerHTML = "";

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("r", "11");
  circle.setAttribute("class", "token");

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("class", "tokenText");
  text.textContent = labelText;

  els.tokenLayer.appendChild(circle);
  els.tokenLayer.appendChild(text);

  const total = path.getTotalLength();
  const durMs = 650;
  const t0 = performance.now();

  function step(now){
    const p = Math.min(1, (now - t0) / durMs);
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic

    const pt = path.getPointAtLength(eased * total);

    circle.setAttribute("cx", pt.x);
    circle.setAttribute("cy", pt.y);

    text.setAttribute("x", pt.x);
    text.setAttribute("y", pt.y);

    if (p < 1) requestAnimationFrame(step);
    else {
      // fade out token after arriving
      setTimeout(() => { els.tokenLayer.innerHTML = ""; }, 450);
    }
  }

  requestAnimationFrame(step);
}

/* ---------- Actions ---------- */

function applyMove(){
  const moveId = els.moveSel.value;
  const move = MOVES.find(m => m.id === moveId);
  if (!move) return;

  const amt = clampInt(Number(els.amt.value || 0), 0);
  if (amt <= 0){
    els.status.textContent = "Enter a positive number of people to move.";
    return;
  }

  const available = state[move.from];
  const xfer = Math.min(amt, available);

  const before = { ...state };
  state[move.from] -= xfer;
  state[move.to] += xfer;
  const after = { ...state };

  history.unshift(`${move.label}: ${xfer} people`);

  // Animate a token (show min(xfer,99) as label)
  const tokenLabel = String(Math.min(xfer, 99));
  animateToken(move.pathId, tokenLabel);

  els.explainBox.innerHTML = explainMove(move, xfer, before, after);
  els.status.textContent = `Moved ${xfer} from ${move.from} to ${move.to}.`;

  // reset prediction
  els.predSel.value = "";

  render();

  // Ensure MathJax typesets result text (important)
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise();
  }
}

function reset(){
  state = { E: 140, U: 10, N: 50 };
  history = [];
  els.predSel.value = "";
  els.tokenLayer.innerHTML = "";
  els.explainBox.innerHTML = `Choose a transition and click <strong>Apply move</strong>. The app will explain what happened to the rates.`;
  els.status.textContent = "Reset to default counts.";
  render();
}

function randomize(){
  const Pop = 200;
  const E = 80 + Math.floor(Math.random()*91);
  const U = 5 + Math.floor(Math.random()*26);
  const N = Math.max(0, Pop - E - U);
  state = { E, U, N };
  history = [];
  els.predSel.value = "";
  els.tokenLayer.innerHTML = "";
  els.explainBox.innerHTML = `Counts randomized. Try a few flows and watch \$begin:math:text$u\\$end:math:text$ and LFPR move differently.`;
  els.status.textContent = "Randomized counts.";
  render();
}

// init
populateMoves();
els.applyBtn.addEventListener("click", applyMove);
els.resetBtn.addEventListener("click", reset);
els.randomBtn.addEventListener("click", randomize);

reset();
