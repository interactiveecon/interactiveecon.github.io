// Optimal K & L (DRS) with baseline ghost curves, continuous sliders, static axes, single ticks.
// Production (DRS): Y = A K^α L^β, α+β<1
// MPL = β A K^α L^(β-1); MPK = α A K^(α-1) L^β
// FOCs: MPL = W/P, MPK = R/P
//
// We compute (K*,L*) using a safe closed-form when possible, and fall back to a fast numeric search
// on a bounded box to avoid NaN/undefined ticks.

const alpha = 0.35;
const beta  = 0.55; // alpha+beta < 1

// Static axis ranges
const XMAX = 10;

// Conservative y-axis maxima (static) based on upper A and small eps to avoid infinities
const A_AXIS = 5.0;
const EPS = 0.05;

function MPL(A, K, L){
  if (K <= 0 || L <= 0) return NaN;
  return beta * A * Math.pow(K, alpha) * Math.pow(L, beta - 1);
}
function MPK(A, K, L){
  if (K <= 0 || L <= 0) return NaN;
  return alpha * A * Math.pow(K, alpha - 1) * Math.pow(L, beta);
}

function computeAxisMaxima(){
  const mplMax = MPL(A_AXIS, XMAX, EPS) || 0;
  const mpkMax = MPK(A_AXIS, EPS, XMAX) || 0;
  return { mplYMax: mplMax * 1.15, mpkYMax: mpkMax * 1.15 };
}
const AX = computeAxisMaxima();

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

function profit(A, P, W, R, K, L){
  return P * F(A, K, L) - W * L - R * K;
}

// Safe closed-form optimum. Returns null if invalid.
function solveClosedForm(A, W, R, P){
  const w = W / P;
  const r = R / P;
  if (!(w > 0 && r > 0 && A > 0)) return null;

  const m = (alpha / beta) * (w / r);          // K/L
  if (!(m > 0 && isFinite(m))) return null;

  const expo = alpha + beta - 1;               // negative
  const denom = beta * A * Math.pow(m, alpha);
  if (!(denom > 0 && isFinite(denom))) return null;

  const rhs = w / denom;
  if (!(rhs > 0 && isFinite(rhs))) return null;

  const Lstar = Math.pow(rhs, 1 / expo);
  const Kstar = m * Lstar;

  if (!isFinite(Lstar) || !isFinite(Kstar) || Lstar <= 0 || Kstar <= 0) return null;
  return { w, r, Lstar, Kstar };
}

// Numeric fallback: maximize profit on [0,XMAX]^2 with coarse->refine search
function solveNumeric(A, P, W, R){
  // coarse
  let best = { K: 0, L: 0, pi: -Infinity };
  const step1 = 0.2;
  for (let K = 0; K <= XMAX + 1e-9; K += step1){
    for (let L = 0; L <= XMAX + 1e-9; L += step1){
      const pi = profit(A, P, W, R, K, L);
      if (pi > best.pi) best = { K, L, pi };
    }
  }
  // refine around best
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
  // fallback numeric
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

// Plugins: single x tick and single y tick
const singleTickPlugin = {
  id: "singleTick",
  afterBuildTicks(chart, args, opts){
    if (!opts || !opts.enabled) return;
    const axis = chart.scales[opts.axis];
    if (!axis) return;
    const v = opts.value;
    if (!isFinite(v)) return;
    axis.ticks = [{ value: v }];
  }
};
Chart.register(singleTickPlugin);

const singleTickYPlugin = {
  id: "singleTickY",
  afterBuildTicks(chart, args, opts){
    if (!opts || !opts.enabled) return;
    const axis = chart.scales[opts.axis]; // y
    if (!axis) return;
    const v = opts.value;
    if (!isFinite(v)) return;
    axis.ticks = [{ value: v }];
  }
};
Chart.register(singleTickYPlugin);

// UI
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

// Baseline stored for ghost curves and MCQ
let baseline = null;
let currentQ = null;
let selectedChoice = null;

// Charts
let chLabor = null;
let chCapital = null;

function makeMarketChart(canvas, xLabel, yLabel, yMax){
  return new Chart(canvas, {
    type: "line",
    data: {
      datasets: [
        { data: [], borderWidth: 2, pointRadius: 0, borderDash: [6,6], borderColor:"rgba(0,0,0,0.25)" }, // baseline MP (ghost)
        { data: [], borderWidth: 3, pointRadius: 0 },                                                      // current MP
        { data: [], borderWidth: 3, pointRadius: 0, borderDash: [6,6] },                                    // real price
        { data: [], showLine: false, pointRadius: 5 },                                                      // optimal marker
        { data: [], borderWidth: 2, pointRadius: 0, borderDash: [4,4], borderColor:"rgba(0,0,0,0.35)" }     // drop line
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      plugins: {
        legend: { display: false },
        singleTick: { enabled: true, axis: "x", value: 0 },
        singleTickY: { enabled: true, axis: "y", value: 0 }
      },
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: XMAX,
          grid: { display: false },
          title: { display: true, text: xLabel },
          ticks: { callback: (v) => Number(v).toFixed(2) }
        },
        y: {
          min: 0,
          max: yMax,
          grid: { display: true },
          title: { display: true, text: yLabel },
          ticks: { callback: (v) => Number(v).toFixed(2) }
        }
      }
    }
  });
}

function buildMPLCurve(A, Kfix){
  const xs = linspace(EPS, XMAX, 300);
  return xs.map(L => ({ x: L, y: MPL(A, Math.max(Kfix, EPS), L) }));
}
function buildMPKCurve(A, Lfix){
  const xs = linspace(EPS, XMAX, 300);
  return xs.map(K => ({ x: K, y: MPK(A, K, Math.max(Lfix, EPS)) }));
}

function update(){
  const s = getState();
  const sol = solveOptimal(s.A, s.W, s.R, s.P);

  const wReal = sol.w;
  const rReal = sol.r;

  const Lstar = clamp(sol.Lstar, 0, XMAX);
  const Kstar = clamp(sol.Kstar, 0, XMAX);

  els.m_wp.textContent = fmt2(wReal);
  els.m_rp.textContent = fmt2(rReal);
  els.m_L.textContent  = fmt2(sol.Lstar);
  els.m_K.textContent  = fmt2(sol.Kstar);

  if (!chLabor){
    chLabor = makeMarketChart(els.chartLabor, "Labor (L)", "MPL and W/P", AX.mplYMax);
    chCapital = makeMarketChart(els.chartCapital, "Capital (K)", "MPK and R/P", AX.mpkYMax);
  }

  // Baseline curves (ghost) come from baseline state if exists; otherwise current state
  const baseS = baseline ? baseline : s;
  const baseSol = solveOptimal(baseS.A, baseS.W, baseS.R, baseS.P);

  // Labor market
  const mplBase = buildMPLCurve(baseS.A, baseSol.Kstar);
  const mplCur  = buildMPLCurve(s.A, sol.Kstar);

  chLabor.data.datasets[0].data = mplBase;
  chLabor.data.datasets[1].data = mplCur;
  chLabor.data.datasets[2].data = [{ x: 0, y: wReal }, { x: XMAX, y: wReal }];
  chLabor.data.datasets[3].data = [{ x: Lstar, y: wReal }];
  chLabor.data.datasets[4].data = [{ x: Lstar, y: 0 }, { x: Lstar, y: wReal }];

  // single ticks (guard against undefined)
  chLabor.options.plugins.singleTick = { enabled:true, axis:"x", value: isFinite(Lstar) ? Lstar : 0 };
  chLabor.options.plugins.singleTickY = { enabled:true, axis:"y", value: isFinite(wReal) ? wReal : 0 };
  chLabor.update();

  els.noteLabor.textContent =
    `Grey dashed MPL is the baseline. Solid MPL is current. The firm chooses L* where MPL meets W/P. (solver: ${sol.method})`;

  // Capital market
  const mpkBase = buildMPKCurve(baseS.A, baseSol.Lstar);
  const mpkCur  = buildMPKCurve(s.A, sol.Lstar);

  chCapital.data.datasets[0].data = mpkBase;
  chCapital.data.datasets[1].data = mpkCur;
  chCapital.data.datasets[2].data = [{ x: 0, y: rReal }, { x: XMAX, y: rReal }];
  chCapital.data.datasets[3].data = [{ x: Kstar, y: rReal }];
  chCapital.data.datasets[4].data = [{ x: Kstar, y: 0 }, { x: Kstar, y: rReal }];

  chCapital.options.plugins.singleTick = { enabled:true, axis:"x", value: isFinite(Kstar) ? Kstar : 0 };
  chCapital.options.plugins.singleTickY = { enabled:true, axis:"y", value: isFinite(rReal) ? rReal : 0 };
  chCapital.update();

  els.noteCapital.textContent =
    `Grey dashed MPK is the baseline. Solid MPK is current. The firm chooses K* where MPK meets R/P. (solver: ${sol.method})`;

  els.status.textContent = currentQ
    ? `Baseline stored. Adjust sliders to match the scenario, then answer.`
    : `Move sliders. If MPL/MPK shifts, you’ll see the baseline curve in grey.`;

  // Ensure MathJax renders after any dynamic changes
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise();
  }
}

// --- MCQ ---
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
  baseline = getState();
  currentQ = SHOCKS[Math.floor(Math.random()*SHOCKS.length)];
  selectedChoice = null;

  els.qText.innerHTML =
    `<strong>Scenario:</strong> Starting from the baseline (now stored), suppose <strong>${currentQ.label}</strong> while the other variables stay fixed.
     What happens to <strong>L*</strong> and <strong>K*</strong>?`;

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
    `<strong>Baseline stored.</strong><br>
     Use sliders to implement the scenario, then submit.`;

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
     1) Click <strong>New Question</strong> (baseline is stored).<br>
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
