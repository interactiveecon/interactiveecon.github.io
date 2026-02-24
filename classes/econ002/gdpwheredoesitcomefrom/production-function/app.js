/* Discrete marginal products (backward difference), graph-first.
   Stylized concave production function for clarity:
     Y = A * sqrt(K) * sqrt(L)

   Definitions (backward difference):
     MPL(K,L) = F(K,L) - F(K,L-1)
     MPK(K,L) = F(K,L) - F(K-1,L)

   Baseline curves are fixed and always shown in grey.
   Reset returns sliders to baseline.
   Axes are fixed and curves start at 0.
   Output charts show two points (current and previous step) and dashed projections to axes.
*/

const K_MIN = 0, K_MAX = 10;
const L_MIN = 0, L_MAX = 10;
const A_MIN = 1, A_MAX = 5;

function F(A, K, L) {
  if (K <= 0 || L <= 0) return 0;
  return A * Math.sqrt(K) * Math.sqrt(L);
}

function fmt(x) {
  if (!isFinite(x)) return "—";
  if (Math.abs(x) >= 1000) return x.toFixed(0);
  if (Math.abs(x) >= 100) return x.toFixed(1);
  if (Math.abs(x) >= 10) return x.toFixed(2);
  return x.toFixed(3);
}

const els = {
  A_r: document.getElementById("A_r"),
  A_n: document.getElementById("A_n"),
  K_r: document.getElementById("K_r"),
  K_n: document.getElementById("K_n"),
  L_r: document.getElementById("L_r"),
  L_n: document.getElementById("L_n"),
  resetBtn: document.getElementById("resetBtn"),
  status: document.getElementById("status"),

  chartYL: document.getElementById("chartYL"),
  chartYK: document.getElementById("chartYK"),
  chartMPL: document.getElementById("chartMPL"),
  chartMPK: document.getElementById("chartMPK"),

  noteYL: document.getElementById("noteYL"),
  noteYK: document.getElementById("noteYK"),
  noteMPL: document.getElementById("noteMPL"),
  noteMPK: document.getElementById("noteMPK"),
};

// Baseline values (fixed reference curves)
const BASE = { A: 2, K: 5, L: 5 };

let chYL = null, chYK = null, chMPL = null, chMPK = null;

// Fixed axes for clarity
const Y_MAX = F(A_MAX, K_MAX, L_MAX);         // = 50
const Y_AXIS_MAX = 50;                        // fixed, clean
const MP_AXIS_MAX = 10;                       // fixed, clean (fits this stylized function well)

function setStatus(msg) { els.status.textContent = msg; }

function bindPair(r, n, onChange) {
  function sync(v) {
    const vv = Number(v);
    r.value = vv;
    n.value = vv;
    onChange();
  }
  r.addEventListener("input", () => sync(r.value));
  n.addEventListener("input", () => sync(n.value));
}

function state() {
  return {
    A: Number(els.A_n.value),
    K: Number(els.K_n.value),
    L: Number(els.L_n.value)
  };
}

// Build line series as {x,y} for linear axis
function seriesYvsL(A, K) {
  const pts = [];
  for (let L = L_MIN; L <= L_MAX; L++) pts.push({ x: L, y: F(A, K, L) });
  return pts;
}
function seriesYvsK(A, L) {
  const pts = [];
  for (let K = K_MIN; K <= K_MAX; K++) pts.push({ x: K, y: F(A, K, L) });
  return pts;
}

// Backward-difference MPL and MPK as functions
function seriesMPL(A, K) {
  const pts = [];
  for (let L = L_MIN; L <= L_MAX; L++) {
    if (L === 0) pts.push({ x: L, y: null });
    else pts.push({ x: L, y: F(A, K, L) - F(A, K, L - 1) });
  }
  return pts;
}
function seriesMPK(A, L) {
  const pts = [];
  for (let K = K_MIN; K <= K_MAX; K++) {
    if (K === 0) pts.push({ x: K, y: null });
    else pts.push({ x: K, y: F(A, K, L) - F(A, K - 1, L) });
  }
  return pts;
}

// Chart factory (linear x)
function makeChart(canvas, xLabel, yLabel, yMin, yMax) {
  return new Chart(canvas, {
    type: "line",
    data: {
      datasets: [
        // 0 baseline curve (grey)
        { data: [], borderWidth: 2, pointRadius: 0 },
        // 1 current curve
        { data: [], borderWidth: 3, pointRadius: 0 },

        // 2 segment connecting the two highlighted points
        { data: [], borderWidth: 3, pointRadius: 0 },

        // 3 highlighted points (2 points)
        { data: [], showLine: false, pointRadius: 5 },

        // 4 dashed projection lines for point A (to axes): vertical + horizontal in one dataset via 2 segments
        { data: [], borderWidth: 2, pointRadius: 0 },

        // 5 dashed projection lines for point B (to axes)
        { data: [], borderWidth: 2, pointRadius: 0 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      parsing: false,
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: 10,
          ticks: { stepSize: 1 },
          grid: { display: false },
          title: { display: true, text: xLabel }
        },
        y: {
          min: yMin,
          max: yMax,
          grid: { display: true },
          title: { display: true, text: yLabel }
        }
      }
    }
  });
}

function styleDatasets(ch) {
  // baseline grey dashed
  ch.data.datasets[0].borderColor = "rgba(0,0,0,0.25)";
  ch.data.datasets[0].borderDash = [6, 6];

  // current solid (default color)
  ch.data.datasets[1].borderDash = [];

  // connecting segment dotted
  ch.data.datasets[2].borderDash = [2, 4];

  // points
  ch.data.datasets[3].pointHoverRadius = 6;

  // projection lines dashed, faint
  ch.data.datasets[4].borderColor = "rgba(0,0,0,0.25)";
  ch.data.datasets[4].borderDash = [4, 4];

  ch.data.datasets[5].borderColor = "rgba(0,0,0,0.25)";
  ch.data.datasets[5].borderDash = [4, 4];
}

// Build projection "L" shape (to axes) using NaN to break line between segments
function projectionData(p) {
  // vertical: (x,0) -> (x,y); break; horizontal: (0,y) -> (x,y)
  return [
    { x: p.x, y: 0 },
    { x: p.x, y: p.y },
    { x: NaN, y: NaN }, // break
    { x: 0, y: p.y },
    { x: p.x, y: p.y }
  ];
}

function updateCharts() {
  const s = state();
  const A = s.A, K = s.K, L = s.L;

  // Baseline curves (fixed)
  const baseYL  = seriesYvsL(BASE.A, BASE.K);
  const baseYK  = seriesYvsK(BASE.A, BASE.L);
  const baseMPL = seriesMPL(BASE.A, BASE.K);
  const baseMPK = seriesMPK(BASE.A, BASE.L);

  // Current curves
  const curYL  = seriesYvsL(A, K);
  const curYK  = seriesYvsK(A, L);
  const curMPL = seriesMPL(A, K);
  const curMPK = seriesMPK(A, L);

  // Points for backward difference:
  // Output vs L: compare (L, Y) and (L-1, Yprev) at fixed K.
  const L0 = L;
  const Lm1 = (L0 > 0) ? (L0 - 1) : null;

  const yL0  = F(A, K, L0);
  const yLm1 = (Lm1 !== null) ? F(A, K, Lm1) : null;
  const dY_L = (Lm1 !== null) ? (yL0 - yLm1) : null; // MPL

  // Output vs K: compare (K, Y) and (K-1, Yprev) at fixed L.
  const K0 = K;
  const Km1 = (K0 > 0) ? (K0 - 1) : null;

  const yK0  = F(A, K0, L);
  const yKm1 = (Km1 !== null) ? F(A, Km1, L) : null;
  const dY_K = (Km1 !== null) ? (yK0 - yKm1) : null; // MPK

  // Create charts once
  if (!chYL) {
    chYL  = makeChart(els.chartYL,  "Labor (L)",   "Output (Y)", 0, Y_AXIS_MAX);
    chYK  = makeChart(els.chartYK,  "Capital (K)", "Output (Y)", 0, Y_AXIS_MAX);
    chMPL = makeChart(els.chartMPL, "Labor (L)",   "MPL (ΔY from −1 step)", 0, MP_AXIS_MAX);
    chMPK = makeChart(els.chartMPK, "Capital (K)", "MPK (ΔY from −1 step)", 0, MP_AXIS_MAX);
    [chYL, chYK, chMPL, chMPK].forEach(styleDatasets);
  }

  function setCurve(ch, base, cur) {
    ch.data.datasets[0].data = base;
    ch.data.datasets[1].data = cur;
  }

  // --- Output vs L ---
  setCurve(chYL, baseYL, curYL);

  // segment between the two output points
  chYL.data.datasets[2].data = (Lm1 !== null)
    ? [{ x: Lm1, y: yLm1 }, { x: L0, y: yL0 }]
    : [];

  // points dataset (two points if possible)
  chYL.data.datasets[3].data = (Lm1 !== null)
    ? [{ x: Lm1, y: yLm1 }, { x: L0, y: yL0 }]
    : [{ x: L0, y: yL0 }];

  // dashed projections for each point (if exists)
  chYL.data.datasets[4].data = (Lm1 !== null) ? projectionData({ x: Lm1, y: yLm1 }) : [];
  chYL.data.datasets[5].data = projectionData({ x: L0, y: yL0 });

  chYL.update();

  // --- Output vs K ---
  setCurve(chYK, baseYK, curYK);

  chYK.data.datasets[2].data = (Km1 !== null)
    ? [{ x: Km1, y: yKm1 }, { x: K0, y: yK0 }]
    : [];

  chYK.data.datasets[3].data = (Km1 !== null)
    ? [{ x: Km1, y: yKm1 }, { x: K0, y: yK0 }]
    : [{ x: K0, y: yK0 }];

  chYK.data.datasets[4].data = (Km1 !== null) ? projectionData({ x: Km1, y: yKm1 }) : [];
  chYK.data.datasets[5].data = projectionData({ x: K0, y: yK0 });

  chYK.update();

  // --- MPL ---
  setCurve(chMPL, baseMPL, curMPL);

  chMPL.data.datasets[2].data = [];
  chMPL.data.datasets[3].data = (Lm1 !== null) ? [{ x: L0, y: dY_L }] : [];
  // projections on MP charts for the MP point (use dataset[5])
  chMPL.data.datasets[4].data = [];
  chMPL.data.datasets[5].data = (Lm1 !== null) ? projectionData({ x: L0, y: dY_L }) : [];

  chMPL.update();

  // --- MPK ---
  setCurve(chMPK, baseMPK, curMPK);

  chMPK.data.datasets[2].data = [];
  chMPK.data.datasets[3].data = (Km1 !== null) ? [{ x: K0, y: dY_K }] : [];
  chMPK.data.datasets[4].data = [];
  chMPK.data.datasets[5].data = (Km1 !== null) ? projectionData({ x: K0, y: dY_K }) : [];

  chMPK.update();

  // Notes
  els.noteYL.textContent = (Lm1 !== null)
    ? `At K=${K}: Y at L=${L0} is ${fmt(yL0)} and at L=${Lm1} is ${fmt(yLm1)} → ΔY=${fmt(dY_L)} (MPL at L=${L0}).`
    : `L=0 has no previous step. Increase L to compute MPL as Y(K,L)−Y(K,L−1).`;

  els.noteYK.textContent = (Km1 !== null)
    ? `At L=${L}: Y at K=${K0} is ${fmt(yK0)} and at K=${Km1} is ${fmt(yKm1)} → ΔY=${fmt(dY_K)} (MPK at K=${K0}).`
    : `K=0 has no previous step. Increase K to compute MPK as Y(K,L)−Y(K−1,L).`;

  els.noteMPL.textContent = (Lm1 !== null)
    ? `MPL at L=${L0} equals ${fmt(dY_L)} — exactly the ΔY shown in the Output vs Labor graph.`
    : `MPL is defined starting at L=1 in this backward-difference setup.`;

  els.noteMPK.textContent = (Km1 !== null)
    ? `MPK at K=${K0} equals ${fmt(dY_K)} — exactly the ΔY shown in the Output vs Capital graph.`
    : `MPK is defined starting at K=1 in this backward-difference setup.`;

  setStatus("Baseline curves are fixed in grey. Increase L (holding K) or increase K (holding L) and watch the ΔY gaps shrink (diminishing marginal product).");
}

function resetToBaseline() {
  els.A_r.value = els.A_n.value = BASE.A;
  els.K_r.value = els.K_n.value = BASE.K;
  els.L_r.value = els.L_n.value = BASE.L;
  updateCharts();
}

bindPair(els.A_r, els.A_n, updateCharts);
bindPair(els.K_r, els.K_n, updateCharts);
bindPair(els.L_r, els.L_n, updateCharts);

els.resetBtn.addEventListener("click", resetToBaseline);

// Init
resetToBaseline();
