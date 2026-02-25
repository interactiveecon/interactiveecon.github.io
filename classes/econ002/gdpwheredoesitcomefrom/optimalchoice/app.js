// Optimal K & L app (CRS, static axes, single ticks, dashed drop lines, MathJax typeset)
//
// CRS production: Y = A K^α L^(1-α)
// MPL = (1-α) A K^α L^(-α)
// MPK = α A K^(α-1) L^(1-α)
//
// We compute (K*,L*) by maximizing profit over a bounded box K,L in [0,10] (fine grid).
// This avoids CRS scale indeterminacy while still showing the comparative statics clearly.

const alpha = 0.35;
const K_MAX = 10;
const L_MAX = 10;

// “Static axes” ranges chosen once from max values so graphs are comparable.
// We compute maxima for MPL/MPK over the domain under the most “intense” settings to avoid clipping.
const A_AXIS = 5;
const K_AXIS = 10;
const L_AXIS = 10;

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
  m_L: document.getElementById("m_L"),
  m_K: document.getElementById("m_K"),

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
  return A * Math.pow(K, alpha) * Math.pow(L, 1 - alpha);
}

function MPL(A, K, L){
  if (K <= 0 || L <= 0) return NaN;
  return (1 - alpha) * A * Math.pow(K, alpha) * Math.pow(L, -alpha);
}

function MPK(A, K, L){
  if (K <= 0 || L <= 0) return NaN;
  return alpha * A * Math.pow(K, alpha - 1) * Math.pow(L, 1 - alpha);
}

function profit(A, P, W, R, K, L){
  return P * F(A, K, L) - W * L - R * K;
}

// Grid-search optimizer on [0,10]x[0,10]
function solveOpt(A, P, W, R){
  let best = { K: 0, L: 0, pi: -Infinity };

  // step: 0.05 gives smooth results, still fast
  const step = 0.05;

  for (let K = 0; K <= K_MAX + 1e-9; K += step){
    for (let L = 0; L <= L_MAX + 1e-9; L += step){
      const pi = profit(A, P, W, R, K, L);
      if (pi > best.pi){
        best = { K, L, pi };
      }
    }
  }
  return best;
}

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

// Chart tick plugin to force a single tick
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

function linspace(min, max, n){
  const out = [];
  const step = (max - min) / (n - 1);
  for (let i=0; i<n; i++) out.push(min + i*step);
  return out;
}

let chLabor = null;
let chCapital = null;

// Precompute static y-axis maxima with high A and corner values
function computeAxisMaxima(){
  // MPL is largest at high K and very small L -> use L=0.05 to avoid infinity
  const mplMax = MPL(A_AXIS, K_AXIS, 0.05) || 0;
  // MPK is largest at very small K and high L -> use K=0.05
  const mpkMax = MPK(A_AXIS, 0.05, L_AXIS) || 0;
  // Add headroom
  return {
    mplYMax: mplMax * 1.1,
    mpkYMax: mpkMax * 1.1,
  };
}
const AX = computeAxisMaxima();

function makeMarketChart(canvas, xLabel, yLabel, yMax){
  return new Chart(canvas, {
    type: "line",
    data: {
      datasets: [
        { data: [], borderWidth: 3, pointRadius: 0 },                 // MP curve
        { data: [], borderWidth: 3, pointRadius: 0, borderDash: [6,6] }, // real price line
        { data: [], showLine: false, pointRadius: 5 },                // optimal point marker
        { data: [], borderWidth: 2, pointRadius: 0, borderDash: [4,4] }  // dashed drop line to x-axis
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      plugins: {
        legend: { display: false },
        singleTick: { enabled: true, axis: "x", value: 0 } // updated each render
      },
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: 10,
          grid: { display: false },
          title: { display: true, text: xLabel },
          ticks: {
            callback: (v) => Number(v).toFixed(2)
          }
        },
        y: {
          min: 0,
          max: yMax, // static
          grid: { display: true },
          title: { display: true, text: yLabel },
          ticks: {
            // We will force a single y tick using the plugin on 'y' by calling it with axis='y' via options update
            callback: (v) => Number(v).toFixed(2)
          }
        }
      }
    }
  });
}

// baseline for MCQ
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

function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

function signDiff(newVal, oldVal){
  const eps = 1e-6;
  if (newVal > oldVal + eps) return "up";
  if (newVal < oldVal - eps) return "down";
  return "same";
}

function update(){
  const s = getState();
  const wReal = s.W / s.P;
  const rReal = s.R / s.P;

  // solve optimum on bounded box
  const opt = solveOpt(s.A, s.P, s.W, s.R);

  els.m_wp.textContent = fmt2(wReal);
  els.m_rp.textContent = fmt2(rReal);
  els.m_L.textContent  = fmt2(opt.L);
  els.m_K.textContent  = fmt2(opt.K);

  // init charts
  if (!chLabor){
    chLabor = makeMarketChart(els.chartLabor, "Labor (L)", "MPL and W/P", AX.mplYMax);
    chCapital = makeMarketChart(els.chartCapital, "Capital (K)", "MPK and R/P", AX.mpkYMax);
  }

  // Labor market: MPL(L; K fixed at K*)
  const Kfix = Math.max(opt.K, 0.05);
  const Lgrid = linspace(0.05, 10, 300);
  const mplCurve = Lgrid.map(L => ({ x: L, y: MPL(s.A, Kfix, L) }));
  const wLine = [{ x: 0, y: wReal }, { x: 10, y: wReal }];
  const Lstar = opt.L;
  const mplAtStar = MPL(s.A, Kfix, Math.max(Lstar, 0.05));

  // datasets
  chLabor.data.datasets[0].data = mplCurve;
  chLabor.data.datasets[1].data = wLine;
  chLabor.data.datasets[2].data = [{ x: Lstar, y: wReal }];
  // dashed drop line to x-axis from the optimal point
  chLabor.data.datasets[3].data = [{ x: Lstar, y: 0 }, { x: Lstar, y: wReal }];

  // Single ticks
  chLabor.options.plugins.singleTick = { enabled:true, axis:"x", value: Lstar };
  // Force single y tick at W/P via plugin by reusing it with axis y
  chLabor.options.plugins.singleTickY = { enabled:true, axis:"y", value: wReal };
  // Chart.js only knows registered plugins by id; so we reuse the same plugin by setting options under its id and switching axis dynamically
  // We'll apply y tick by temporarily setting and then flipping in plugin call:
  // easiest: call the plugin twice by registering a second id:
  // (we do that below)

  // Capital market: MPK(K; L fixed at L*)
  const Lfix = Math.max(opt.L, 0.05);
  const Kgrid = linspace(0.05, 10, 300);
  const mpkCurve = Kgrid.map(K => ({ x: K, y: MPK(s.A, K, Lfix) }));
  const rLine = [{ x: 0, y: rReal }, { x: 10, y: rReal }];
  const Kstar = opt.K;
  const mpkAtStar = MPK(s.A, Math.max(Kstar,0.05), Lfix);

  chCapital.data.datasets[0].data = mpkCurve;
  chCapital.data.datasets[1].data = rLine;
  chCapital.data.datasets[2].data = [{ x: Kstar, y: rReal }];
  chCapital.data.datasets[3].data = [{ x: Kstar, y: 0 }, { x: Kstar, y: rReal }];

  chCapital.options.plugins.singleTick = { enabled:true, axis:"x", value: Kstar };

  // Force single y tick at R/P using a second plugin id
  // We'll configure it below after creating the second plugin.

  // Notes
  els.noteLabor.textContent =
    `At K*=${fmt2(opt.K)}, the MPL curve is compared to the real wage W/P=${fmt2(wReal)}. The optimal labor is L*=${fmt2(Lstar)}.`;

  els.noteCapital.textContent =
    `At L*=${fmt2(opt.L)}, the MPK curve is compared to the real rental rate R/P=${fmt2(rReal)}. The optimal capital is K*=${fmt2(Kstar)}.`;

  // Set y tick plugin configs
  chLabor.options.plugins.singleTickY = { enabled:true, axis:"y", value: wReal };
  chCapital.options.plugins.singleTickY = { enabled:true, axis:"y", value: rReal };

  chLabor.update();
  chCapital.update();

  els.status.textContent = currentQ
    ? `Baseline stored. Adjust sliders to match the scenario, then answer.`
    : `Move A, P, W, R and watch W/P, R/P, L*, and K* change.`;

  // typeset any math (safe)
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise();
  }
}

// Register a second “single tick” plugin for y-axis by cloning the logic under a different id
const singleTickYPlugin = {
  id: "singleTickY",
  afterBuildTicks(chart, args, opts){
    if (!opts || !opts.enabled) return;
    const axis = chart.scales[opts.axis]; // expect 'y'
    if (!axis) return;
    const v = opts.value;
    if (!isFinite(v)) return;
    axis.ticks = [{ value: v }];
  }
};
Chart.register(singleTickYPlugin);

// ---- MCQ ----
function makeQuestion(){
  baseline = getState();

  const sh = SHOCKS[Math.floor(Math.random()*SHOCKS.length)];
  currentQ = sh;

  // Build question
  els.qText.innerHTML =
    `<strong>Scenario:</strong> Starting from the baseline shown on the sliders, suppose <strong>${sh.label}</strong> while the other variables stay fixed.
     What happens to the firm’s <strong>optimal</strong> choices of <strong>L*</strong> and <strong>K*</strong>?`;

  const choices = [
    { key:"A", text:"L* increases and K* increases" },
    { key:"B", text:"L* decreases and K* decreases" },
    { key:"C", text:"L* increases and K* decreases" },
    { key:"D", text:"L* decreases and K* increases" },
    { key:"E", text:"No change (approximately)" }
  ];

  els.choices.innerHTML = "";
  selectedChoice = null;

  for (const c of choices){
    const div = document.createElement("label");
    div.className = "choice";
    div.innerHTML = `<input type="radio" name="mcq" value="${c.key}"><div><strong>${c.key}.</strong> ${c.text}</div>`;
    div.addEventListener("click", () => { selectedChoice = c.key; });
    els.choices.appendChild(div);
  }

  els.feedback.innerHTML =
    `<strong>Baseline stored.</strong><br>
     Now use the sliders to implement the scenario, then answer.`;

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

  // Compare current state to baseline by recomputing optima
  const now = getState();
  const opt0 = solveOpt(baseline.A, baseline.P, baseline.W, baseline.R);
  const opt1 = solveOpt(now.A, now.P, now.W, now.R);

  const dL = signDiff(opt1.L, opt0.L);
  const dK = signDiff(opt1.K, opt0.K);

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

  // brief explanation based on which variable was shocked
  let expl = "";
  if (currentQ.var === "A") {
    expl = "Higher A raises MPL and MPK (the marginal benefit of inputs), so the firm uses more inputs.";
  } else if (currentQ.var === "P") {
    expl = "If W and R are fixed, higher P lowers W/P and R/P (inputs are cheaper in real terms), so the firm uses more inputs.";
  } else if (currentQ.var === "W") {
    expl = "Higher W raises W/P, making labor more expensive in real terms, so the firm reduces labor and typically reduces scale.";
  } else if (currentQ.var === "R") {
    expl = "Higher R raises R/P, making capital more expensive in real terms, so the firm reduces capital and typically reduces scale.";
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
  // Default baseline values
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

// Bind UI
bindPair(els.A_r, els.A_n, update);
bindPair(els.P_r, els.P_n, update);
bindPair(els.W_r, els.W_n, update);
bindPair(els.R_r, els.R_n, update);

els.newQBtn.addEventListener("click", makeQuestion);
els.submitBtn.addEventListener("click", submit);
els.resetBtn.addEventListener("click", resetToBaseline);

// init
resetToBaseline();
