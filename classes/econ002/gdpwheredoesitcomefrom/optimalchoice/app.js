// Optimal K & L (decreasing returns), static axes, single ticks, dashed drop lines, MathJax typeset.
//
// Production (DRS): Y = A K^α L^β with α+β<1
// MPL = β A K^α L^(β-1)
// MPK = α A K^(α-1) L^β
// FOCs: MPL = W/P, MPK = R/P
//
// Closed-form optimum:
// Let w = W/P, r = R/P.
// Ratio: (K/L) = (α/β) * (w/r)
// Then L* = [ w / (β A m^α) ]^(1/(α+β-1)), K* = m L*, where m = K/L.

const alpha = 0.35;
const beta  = 0.55; // alpha+beta=0.90 < 1

// static axes ranges (x fixed 0..10 for both)
const XMAX = 10;

// choose static y-axis maxima conservatively based on max A and corner combos
const A_AXIS = 5;

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

function solveOptimal(A, W, R, P){
  const w = W / P;
  const r = R / P;

  const m = (alpha / beta) * (w / r); // K/L

  const expo = alpha + beta - 1; // negative
  const denom = beta * A * Math.pow(m, alpha);
  const rhs = w / denom;

  const Lstar = Math.pow(rhs, 1 / expo);
  const Kstar = m * Lstar;

  return { w, r, Lstar, Kstar };
}

function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

// UI elements
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

// --- chart tick plugins (single x tick and single y tick) ---
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

// axis max calibration for MPL/MPK (avoid infinities by using small eps)
function computeAxisMaxima(){
  const eps = 0.05;
  // For MPL, largest at high K and low L
  const mplMax = MPL(A_AXIS, XMAX, eps) || 0;
  // For MPK, largest at low K and high L
  const mpkMax = MPK(A_AXIS, eps, XMAX) || 0;
  return {
    mplYMax: mplMax * 1.15,
    mpkYMax: mpkMax * 1.15
  };
}
const AX = computeAxisMaxima();

function linspace(min, max, n){
  const out = [];
  const step = (max - min) / (n - 1);
  for (let i=0;i<n;i++) out.push(min + i*step);
  return out;
}

let chLabor = null;
let chCapital = null;

function makeMarketChart(canvas, xLabel, yLabel, yMax){
  return new Chart(canvas, {
    type: "line",
    data: {
      datasets: [
        { data: [], borderWidth: 3, pointRadius: 0 },                  // MP curve
        { data: [], borderWidth: 3, pointRadius: 0, borderDash: [6,6] }, // real price
        { data: [], showLine: false, pointRadius: 5 },                 // optimal point
        { data: [], borderWidth: 2, pointRadius: 0, borderDash: [4,4] }  // drop line
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

// second id for y tick (so we can set independently)
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

// --- MCQ state ---
let baseline = null;
let currentQ = null;
let selectedChoice = null;

const SHOCKS = [
  { var: "P", label: "P increases", dir: +1, step: 2 },
  { var: "P", label: "P decreases", dir: -1, step: 2 },
  { var: "A", label: "A increases", dir: +1, step: 1 },
  { var: "A", label: "A decreases", dir: -1, step: 1 },
  { var: "W", label: "W increases", dir: +1, step: 2 },
  { var: "W", label: "W decreases", dir: -1, step: 2 },
  { var: "R", label: "R increases", dir: +1, step: 2 },
  { var: "R", label: "R decreases", dir: -1, step: 2 },
];

function signDiff(newVal, oldVal){
  const eps = 1e-6;
  if (newVal > oldVal + eps) return "up";
  if (newVal < oldVal - eps) return "down";
  return "same";
}

function update(){
  const s = getState();
  const sol = solveOptimal(s.A, s.W, s.R, s.P);

  // Clamp for display (we still compute from model, but graphs are 0..10)
  const Lstar = clamp(sol.Lstar, 0, XMAX);
  const Kstar = clamp(sol.Kstar, 0, XMAX);

  const wReal = sol.w;
  const rReal = sol.r;

  els.m_wp.textContent = fmt2(wReal);
  els.m_rp.textContent = fmt2(rReal);
  els.m_L.textContent  = fmt2(sol.Lstar);
  els.m_K.textContent  = fmt2(sol.Kstar);

  if (!chLabor){
    chLabor = makeMarketChart(els.chartLabor, "Labor (L)", "MPL and W/P", AX.mplYMax);
    chCapital = makeMarketChart(els.chartCapital, "Capital (K)", "MPK and R/P", AX.mpkYMax);
  }

  // Build curves (static x domain 0..10)
  const eps = 0.05;

  // Labor: MPL(L; K fixed at K*)
  const Kfix = Math.max(sol.Kstar, eps);
  const Lgrid = linspace(eps, XMAX, 300);
  const mplCurve = Lgrid.map(L => ({ x: L, y: MPL(s.A, Kfix, L) }));
  const wLine = [{ x: 0, y: wReal }, { x: XMAX, y: wReal }];

  chLabor.data.datasets[0].data = mplCurve;
  chLabor.data.datasets[1].data = wLine;
  chLabor.data.datasets[2].data = [{ x: Lstar, y: wReal }];
  chLabor.data.datasets[3].data = [{ x: Lstar, y: 0 }, { x: Lstar, y: wReal }];

  chLabor.options.plugins.singleTick = { enabled:true, axis:"x", value: Lstar };
  chLabor.options.plugins.singleTickY = { enabled:true, axis:"y", value: wReal };
  chLabor.update();

  els.noteLabor.textContent =
    `L* is where MPL meets W/P. Here W/P=${fmt2(wReal)} and L*≈${fmt2(sol.Lstar)} (x-axis shows the clamped value ${fmt2(Lstar)}).`;

  // Capital: MPK(K; L fixed at L*)
  const Lfix = Math.max(sol.Lstar, eps);
  const Kgrid = linspace(eps, XMAX, 300);
  const mpkCurve = Kgrid.map(K => ({ x: K, y: MPK(s.A, K, Lfix) }));
  const rLine = [{ x: 0, y: rReal }, { x: XMAX, y: rReal }];

  chCapital.data.datasets[0].data = mpkCurve;
  chCapital.data.datasets[1].data = rLine;
  chCapital.data.datasets[2].data = [{ x: Kstar, y: rReal }];
  chCapital.data.datasets[3].data = [{ x: Kstar, y: 0 }, { x: Kstar, y: rReal }];

  chCapital.options.plugins.singleTick = { enabled:true, axis:"x", value: Kstar };
  chCapital.options.plugins.singleTickY = { enabled:true, axis:"y", value: rReal };
  chCapital.update();

  els.noteCapital.textContent =
    `K* is where MPK meets R/P. Here R/P=${fmt2(rReal)} and K*≈${fmt2(sol.Kstar)} (x-axis shows the clamped value ${fmt2(Kstar)}).`;

  els.status.textContent = currentQ
    ? `Baseline stored. Adjust sliders to match the scenario, then answer.`
    : `Move A, P, W, R and watch W/P, R/P, L*, and K* change.`;

  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise();
  }
}

// ---- MCQ ----
function makeQuestion(){
  baseline = getState();
  currentQ = SHOCKS[Math.floor(Math.random()*SHOCKS.length)];
  selectedChoice = null;

  els.qText.innerHTML =
    `<strong>Scenario:</strong> Starting from the baseline shown on the sliders, suppose <strong>${currentQ.label}</strong> while the other variables stay fixed.
     What happens to the firm’s <strong>optimal</strong> choices of <strong>L*</strong> and <strong>K*</strong>?`;

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
     Now use sliders to implement the scenario, then submit.`;

  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise();
  }
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

  const w0 = baseline.W / baseline.P;
  const r0 = baseline.R / baseline.P;
  const w1 = now.W / now.P;
  const r1 = now.R / now.P;

  let expl = "";
  if (currentQ.var === "A") {
    expl = "Higher A raises MPL and MPK. To satisfy MPL=W/P and MPK=R/P, the firm uses more inputs.";
  } else if (currentQ.var === "P") {
    expl = "If W and R are fixed, higher P lowers W/P and R/P (inputs cheaper in real terms), so the firm uses more inputs.";
  } else if (currentQ.var === "W") {
    expl = "Higher W raises W/P. Labor is more expensive in real terms, so L* falls; with diminishing returns the optimal scale tends to fall, so K* falls too.";
  } else if (currentQ.var === "R") {
    expl = "Higher R raises R/P. Capital is more expensive in real terms, so K* falls; with diminishing returns the optimal scale tends to fall, so L* falls too.";
  }

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
  setState({ A: 2, P: 5, W: 10, R: 10 });
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

// Bind
bindPair(els.A_r, els.A_n, update);
bindPair(els.P_r, els.P_n, update);
bindPair(els.W_r, els.W_n, update);
bindPair(els.R_r, els.R_n, update);

els.newQBtn.addEventListener("click", makeQuestion);
els.submitBtn.addEventListener("click", submit);
els.resetBtn.addEventListener("click", resetToBaseline);

// init
resetToBaseline();
