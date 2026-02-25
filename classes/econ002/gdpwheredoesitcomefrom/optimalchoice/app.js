// Optimal K & L (DRS) with baseline vs current curves and TWO optimal points per graph.
// Production (DRS): Y = A K^α L^β, α+β<1
// MPL = β A K^α L^(β-1); MPK = α A K^(α-1) L^β
// FOCs: MPL = W/P, MPK = R/P
//
// Sliders are continuous. Charts have normal ticks.
// Baseline MPL/MPK are grey dashed, current are blue (accessible).
// Each chart shows TWO optimal points: baseline (grey) and current (blue).

const alpha = 0.35;
const beta  = 0.55; // alpha+beta < 1 (decreasing returns)

const XMAX = 10;
const A_AXIS = 5.0;
const EPS = 0.05;

// Accessible colors
const COL_BLUE = "#1f77b4";         // colorblind-friendly blue (Okabe/Ito-ish)
const COL_GREY = "rgba(0,0,0,0.28)";

function fmt2(x){
  if (!isFinite(x)) return "—";
  return x.toFixed(2);
}

function bindPair(r, n, onChange){
  function sync(v){
    const vv = Number(v);
    r.value = vv;
    n.value = vv;
    onChange();
  }
  r.addEventListener("input", () => sync(r.value));
  n.addEventListener("input", () => sync(n.value));
}

function F(A, K, L){
  if (K <= 0 || L <= 0) return 0;
  return A * Math.pow(K, alpha) * Math.pow(L, beta);
}
function MPL(A, K, L){
  if (K <= 0 || L <= 0) return NaN;
  return beta * A * Math.pow(K, alpha) * Math.pow(L, beta - 1);
}
function MPK(A, K, L){
  if (K <= 0 || L <= 0) return NaN;
  return alpha * A * Math.pow(K, alpha - 1) * Math.pow(L, beta);
}

function profit(A, P, W, R, K, L){
  return P * F(A, K, L) - W * L - R * K;
}

// Safe closed-form optimum; returns null if invalid.
function solveClosedForm(A, W, R, P){
  const w = W / P;
  const r = R / P;
  if (!(w > 0 && r > 0 && A > 0)) return null;

  const m = (alpha / beta) * (w / r); // K/L
  if (!(m > 0 && isFinite(m))) return null;

  const expo = alpha + beta - 1; // negative
  const denom = beta * A * Math.pow(m, alpha);
  if (!(denom > 0 && isFinite(denom))) return null;

  const rhs = w / denom;
  if (!(rhs > 0 && isFinite(rhs))) return null;

  const Lstar = Math.pow(rhs, 1 / expo);
  const Kstar = m * Lstar;

  if (!isFinite(Lstar) || !isFinite(Kstar) || Lstar <= 0 || Kstar <= 0) return null;
  return { w, r, Lstar, Kstar };
}

// Numeric fallback (bounded box) to avoid NaNs
function solveNumeric(A, P, W, R){
  let best = { K: 0, L: 0, pi: -Infinity };

  const step1 = 0.2;
  for (let K = 0; K <= XMAX + 1e-9; K += step1){
    for (let L = 0; L <= XMAX + 1e-9; L += step1){
      const pi = profit(A, P, W, R, K, L);
      if (pi > best.pi) best = { K, L, pi };
    }
  }

  let best2 = best;
  const step2 = 0.05;
  for (let K = Math.max(0, best.K-0.5); K <= Math.min(XMAX, best.K+0.5)+1e-9; K += step2){
    for (let L = Math.max(0, best.L-0.5); L <= Math.min(XMAX, best.L+0.5)+1e-9; L += step2){
      const pi = profit(A, P, W, R, K, L);
      if (pi > best2.pi) best2 = { K, L, pi };
    }
  }
  return best2;
}

function solveOptimal(A, W, R, P){
  const cf = solveClosedForm(A, W, R, P);
  if (cf){
    return { w: cf.w, r: cf.r, Lstar: cf.Lstar, Kstar: cf.Kstar, method:"closed" };
  }
  const w = W / P;
  const r = R / P;
  const num = solveNumeric(A, P, W, R);
  return { w, r, Lstar: num.L, Kstar: num.K, method:"numeric" };
}

function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

function linspace(min, max, n){
  const out = [];
  const step = (max - min) / (n - 1);
  for (let i=0;i<n;i++) out.push(min + i*step);
  return out;
}

// Static y-axis maxima (conservative)
function computeAxisMaxima(){
  const mplMax = MPL(A_AXIS, XMAX, EPS) || 0;
  const mpkMax = MPK(A_AXIS, EPS, XMAX) || 0;
  return { mplYMax: mplMax * 1.15, mpkYMax: mpkMax * 1.15 };
}
const AX = computeAxisMaxima();

// --- UI elements ---
const els = {
  A_r: document.getElementById("A_r"),
  A_n: document.getElementById("A_n"),
  P_r: document.getElementById("P_r"),
  P_n: document.getElementById("P_n"),
  W_r: document.getElementById("W_r"),
  W_n: document.getElementById("W_n"),
  R_r: document.getElementById("R_r"),
  R_n: document.getElementById("R_n"),

  m_wp: document.getElementById("m_wp"),
  m_rp: document.getElementById("m_rp"),
  m_L:  document.getElementById("m_L"),
  m_K:  document.getElementById("m_K"),

  chartLabor: document.getElementById("chartLabor"),
  chartCapital: document.getElementById("chartCapital"),
  noteLabor: document.getElementById("noteLabor"),
  noteCapital: document.getElementById("noteCapital"),

  newQBtn: document.getElementById("newQBtn"),
  resetBtn: document.getElementById("resetBtn"),
  status: document.getElementById("status"),

  qText: document.getElementById("qText"),
  choices: document.getElementById("choices"),
  submitBtn: document.getElementById("submitBtn"),
  feedback: document.getElementById("feedback"),
};

function getState(){
  return {
    A: Number(els.A_n.value),
    P: Number(els.P_n.value),
    W: Number(els.W_n.value),
    R: Number(els.R_n.value),
  };
}
function setState(s){
  els.A_r.value = els.A_n.value = s.A;
  els.P_r.value = els.P_n.value = s.P;
  els.W_r.value = els.W_n.value = s.W;
  els.R_r.value = els.R_n.value = s.R;
  update();
}

// --- Baseline stored for ghost curves + MCQ baseline ---
let baseline = null;
let currentQ = null;
let selectedChoice = null;

// --- Charts ---
let chLabor = null;
let chCapital = null;

function makeMarketChart(canvas, xLabel, yLabel, yMax){
  return new Chart(canvas, {
    type: "line",
    data: {
      datasets: [
        // 0 baseline MP curve (grey dashed)
        { data: [], borderWidth: 2, pointRadius: 0, borderDash: [6,6], borderColor: COL_GREY },
        // 1 current MP curve (blue solid)
        { data: [], borderWidth: 3, pointRadius: 0, borderColor: COL_BLUE },

        // 2 baseline real price (grey dotted)
        { data: [], borderWidth: 2, pointRadius: 0, borderDash: [2,6], borderColor: COL_GREY },
        // 3 current real price (blue dotted)
        { data: [], borderWidth: 2, pointRadius: 0, borderDash: [2,6], borderColor: COL_BLUE },

        // 4 baseline optimum point (grey)
        { data: [], showLine: false, pointRadius: 5, borderColor: COL_GREY, backgroundColor: COL_GREY },
        // 5 current optimum point (blue)
        { data: [], showLine: false, pointRadius: 5, borderColor: COL_BLUE, backgroundColor: COL_BLUE },

        // 6 baseline drop line
        { data: [], borderWidth: 2, pointRadius: 0, borderDash: [4,4], borderColor: COL_GREY },
        // 7 current drop line
        { data: [], borderWidth: 2, pointRadius: 0, borderDash: [4,4], borderColor: COL_BLUE },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: XMAX,
          grid: { display: false },
          title: { display: true, text: xLabel }
        },
        y: {
          min: 0,
          max: yMax,
          grid: { display: true },
          title: { display: true, text: yLabel }
        }
      }
    }
  });
}

function buildMPLCurve(A, Kfix){
  const xs = linspace(EPS, XMAX, 300);
  const Kc = Math.max(Kfix, EPS);
  return xs.map(L => ({ x: L, y: MPL(A, Kc, L) }));
}
function buildMPKCurve(A, Lfix){
  const xs = linspace(EPS, XMAX, 300);
  const Lc = Math.max(Lfix, EPS);
  return xs.map(K => ({ x: K, y: MPK(A, K, Lc) }));
}

function update(){
  const s = getState();
  const solCur = solveOptimal(s.A, s.W, s.R, s.P);

  // establish a baseline if none exists (so grey curve is always visible)
  const baseS = baseline ? baseline : s;
  const solBase = solveOptimal(baseS.A, baseS.W, baseS.R, baseS.P);

  // clamp for graph display (axes 0..10)
  const Lc = clamp(solCur.Lstar, 0, XMAX);
  const Kc = clamp(solCur.Kstar, 0, XMAX);
  const Lb = clamp(solBase.Lstar, 0, XMAX);
  const Kb = clamp(solBase.Kstar, 0, XMAX);

  // metrics
  els.m_wp.textContent = fmt2(solCur.w);
  els.m_rp.textContent = fmt2(solCur.r);
  els.m_L.textContent  = fmt2(solCur.Lstar);
  els.m_K.textContent  = fmt2(solCur.Kstar);

  // init charts
  if (!chLabor){
    chLabor = makeMarketChart(els.chartLabor, "Labor (L)", "MPL and W/P", AX.mplYMax);
    chCapital = makeMarketChart(els.chartCapital, "Capital (K)", "MPK and R/P", AX.mpkYMax);
  }

  // ---- Labor market ----
  const mplBase = buildMPLCurve(baseS.A, solBase.Kstar);
  const mplCur  = buildMPLCurve(s.A, solCur.Kstar);

  // real wage lines
  const wBase = solBase.w;
  const wCur  = solCur.w;

  chLabor.data.datasets[0].data = mplBase;
  chLabor.data.datasets[1].data = mplCur;

  chLabor.data.datasets[2].data = [{ x: 0, y: wBase }, { x: XMAX, y: wBase }];
  chLabor.data.datasets[3].data = [{ x: 0, y: wCur },  { x: XMAX, y: wCur }];

  chLabor.data.datasets[4].data = [{ x: Lb, y: wBase }];
  chLabor.data.datasets[5].data = [{ x: Lc, y: wCur }];

  chLabor.data.datasets[6].data = [{ x: Lb, y: 0 }, { x: Lb, y: wBase }];
  chLabor.data.datasets[7].data = [{ x: Lc, y: 0 }, { x: Lc, y: wCur }];

  chLabor.update();

  els.noteLabor.textContent =
    `Grey = baseline (L*=${fmt2(solBase.Lstar)}, W/P=${fmt2(wBase)}). Blue = current (L*=${fmt2(solCur.Lstar)}, W/P=${fmt2(wCur)}).`;

  // ---- Capital market ----
  const mpkBase = buildMPKCurve(baseS.A, solBase.Lstar);
  const mpkCur  = buildMPKCurve(s.A, solCur.Lstar);

  const rBase = solBase.r;
  const rCur  = solCur.r;

  chCapital.data.datasets[0].data = mpkBase;
  chCapital.data.datasets[1].data = mpkCur;

  chCapital.data.datasets[2].data = [{ x: 0, y: rBase }, { x: XMAX, y: rBase }];
  chCapital.data.datasets[3].data = [{ x: 0, y: rCur },  { x: XMAX, y: rCur }];

  chCapital.data.datasets[4].data = [{ x: Kb, y: rBase }];
  chCapital.data.datasets[5].data = [{ x: Kc, y: rCur }];

  chCapital.data.datasets[6].data = [{ x: Kb, y: 0 }, { x: Kb, y: rBase }];
  chCapital.data.datasets[7].data = [{ x: Kc, y: 0 }, { x: Kc, y: rCur }];

  chCapital.update();

  els.noteCapital.textContent =
    `Grey = baseline (K*=${fmt2(solBase.Kstar)}, R/P=${fmt2(rBase)}). Blue = current (K*=${fmt2(solCur.Kstar)}, R/P=${fmt2(rCur)}).`;

  els.status.textContent = currentQ
    ? `Baseline stored. Adjust sliders to match: ${currentQ.label}. Then answer.`
    : `Move sliders. Click “New Question” to lock in a baseline for comparison.`;

  // MathJax typeset (safe)
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise();
  }
}

// ---- MCQ ----
const SHOCKS = [
  { var:"P", label:"P increases" },
  { var:"P", label:"P decreases" },
  { var:"A", label:"A increases" },
  { var:"A", label:"A decreases" },
  { var:"W", label:"W increases" },
  { var:"W", label:"W decreases" },
  { var:"R", label:"R increases" },
  { var:"R", label:"R decreases" },
];

function signDiff(newVal, oldVal){
  const eps = 1e-6;
  if (newVal > oldVal + eps) return "up";
  if (newVal < oldVal - eps) return "down";
  return "same";
}

function makeQuestion(){
  baseline = getState(); // lock baseline when question starts
  currentQ = SHOCKS[Math.floor(Math.random()*SHOCKS.length)];
  selectedChoice = null;

  els.qText.innerHTML =
    `<strong>Scenario:</strong> Starting from the baseline (now locked in), suppose <strong>${currentQ.label}</strong> while other variables stay fixed.
     After you adjust the slider(s), what happens to <strong>L*</strong> and <strong>K*</strong>?`;

  const choices = [
    { key:"A", text:"L* increases and K* increases" },
    { key:"B", text:"L* decreases and K* decreases" },
    { key:"C", text:"L* increases and K* decreases" },
    { key:"D", text:"L* decreases and K* increases" },
    { key:"E", text:"No change (approximately)" }
  ];

  els.choices.innerHTML = "";
  for (const c of choices){
    const div = document.createElement("label");
    div.className = "choice";
    div.innerHTML = `<input type="radio" name="mcq" value="${c.key}"><div><strong>${c.key}.</strong> ${c.text}</div>`;
    div.addEventListener("click", () => { selectedChoice = c.key; });
    els.choices.appendChild(div);
  }

  els.feedback.innerHTML =
    `<strong>Baseline locked.</strong><br>
     Now use sliders to implement the scenario and submit.`;

  update();
}

function submit(){
  if (!currentQ){
    els.feedback.innerHTML = "Click <strong>New Question</strong> first.";
    return;
  }
  if (!selectedChoice){
    els.feedback.innerHTML = "Select an answer choice first.";
    return;
  }

  const now = getState();
  const opt0 = solveOptimal(baseline.A, baseline.W, baseline.R, baseline.P);
  const opt1 = solveOptimal(now.A, now.W, now.R, now.P);

  const dL = signDiff(opt1.Lstar, opt0.Lstar);
  const dK = signDiff(opt1.Kstar, opt0.Kstar);

  const correct = (
    dL==="up" && dK==="up" ? "A" :
    dL==="down" && dK==="down" ? "B" :
    dL==="up" && dK==="down" ? "C" :
    dL==="down" && dK==="up" ? "D" : "E"
  );

  const ok = (selectedChoice === correct);

  let expl = "";
  if (currentQ.var === "A") expl = "Higher A raises MPL and MPK, so the firm uses more inputs.";
  if (currentQ.var === "P") expl = "Higher P lowers W/P and R/P (if W and R fixed), so the firm uses more inputs.";
  if (currentQ.var === "W") expl = "Higher W raises W/P, making labor more expensive, so L* falls (often K* falls too).";
  if (currentQ.var === "R") expl = "Higher R raises R/P, making capital more expensive, so K* falls (often L* falls too).";

  const w0 = baseline.W / baseline.P, r0 = baseline.R / baseline.P;
  const w1 = now.W / now.P, r1 = now.R / now.P;

  els.feedback.innerHTML =
    (ok ? `<strong>Correct.</strong>` : `<strong>Not quite.</strong> The correct answer is <strong>${correct}</strong>.`) +
    `<br><br>
     <strong>Real wage:</strong> ${fmt2(w0)} → ${fmt2(w1)}<br>
     <strong>Real rental:</strong> ${fmt2(r0)} → ${fmt2(r1)}<br><br>
     ${expl}<br>
     <strong>Result:</strong> L* goes <strong>${dL}</strong>, K* goes <strong>${dK}</strong>.`;

  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise();
  }
}

function resetToBaseline(){
  setState({ A: 2.0, P: 5.0, W: 10.0, R: 10.0 });
  baseline = null;
  currentQ = null;
  selectedChoice = null;

  els.qText.textContent = "Click “New Question”.";
  els.choices.innerHTML = "";
  els.feedback.innerHTML =
    `<strong>How to use this:</strong><br>
     1) Click <strong>New Question</strong> (baseline is locked).<br>
     2) Use sliders to implement the scenario.<br>
     3) Use graphs/metrics, then submit.`;

  update();
}

// Bind sliders
bindPair(els.A_r, els.A_n, update);
bindPair(els.P_r, els.P_n, update);
bindPair(els.W_r, els.W_n, update);
bindPair(els.R_r, els.R_n, update);

// Buttons
els.newQBtn.addEventListener("click", makeQuestion);
els.submitBtn.addEventListener("click", submit);
els.resetBtn.addEventListener("click", resetToBaseline);

// init
resetToBaseline();
