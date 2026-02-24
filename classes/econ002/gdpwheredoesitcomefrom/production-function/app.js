/* Marginal Product Lab (graph-first, discrete +1 marginal products)
   Production function used internally (kept in background):
   Y = A * K^alpha * L^(1-alpha)

   Discrete marginal products:
   MPL_disc(K,L) = Y(K, L+1) - Y(K, L)
   MPK_disc(K,L) = Y(K+1, L) - Y(K, L)

   Axes are fixed for clarity; prior curves are ghosted (grey).
*/

const alpha = 0.35;          // fixed (kept implicit for clarity)
const K_MIN = 1, K_MAX = 10;
const L_MIN = 1, L_MAX = 10;
const A_MIN = 1, A_MAX = 5;

// Fixed axes (chosen for clarity with K,L<=10 and A<=5).
// Max Y occurs at A=5, K=10, L=10.
function Y(A, K, L) {
  return A * Math.pow(K, alpha) * Math.pow(L, 1 - alpha);
}
const Y_MAX = Y(A_MAX, K_MAX, L_MAX);
const MP_MAX = Math.max(
  // worst-case discrete jump occurs at low input values typically
  Y(A_MAX, K_MAX, L_MAX) - Y(A_MAX, K_MAX, L_MAX - 1),
  Y(A_MAX, K_MAX, L_MAX) - Y(A_MAX, K_MAX - 1, L_MAX),
  Y(A_MAX, K_MIN, 2) - Y(A_MAX, K_MIN, 1),
  Y(A_MAX, 2, L_MIN) - Y(A_MAX, 1, L_MIN)
);

const els = {
  A_r: document.getElementById("A_r"),
  A_n: document.getElementById("A_n"),
  K_r: document.getElementById("K_r"),
  K_n: document.getElementById("K_n"),
  L_r: document.getElementById("L_r"),
  L_n: document.getElementById("L_n"),
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

function fmt(x) {
  if (!isFinite(x)) return "—";
  if (Math.abs(x) >= 1000) return x.toFixed(0);
  if (Math.abs(x) >= 100) return x.toFixed(1);
  if (Math.abs(x) >= 10) return x.toFixed(2);
  return x.toFixed(3);
}

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

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
    L: Number(els.L_n.value),
  };
}

// Build series
function seriesYvsL(A, K) {
  const xs = [];
  const ys = [];
  for (let L = L_MIN; L <= L_MAX; L++) {
    xs.push(L);
    ys.push(Y(A, K, L));
  }
  return { xs, ys };
}
function seriesYvsK(A, L) {
  const xs = [];
  const ys = [];
  for (let K = K_MIN; K <= K_MAX; K++) {
    xs.push(K);
    ys.push(Y(A, K, L));
  }
  return { xs, ys };
}
function seriesMPL(A, K) {
  const xs = [];
  const ys = [];
  for (let L = L_MIN; L <= L_MAX; L++) {
    // MPL at L uses L -> L+1 (we define last point with L+1 capped)
    const L2 = Math.min(L + 1, L_MAX);
    xs.push(L);
    ys.push(Y(A, K, L2) - Y(A, K, L));
  }
  return { xs, ys };
}
function seriesMPK(A, L) {
  const xs = [];
  const ys = [];
  for (let K = K_MIN; K <= K_MAX; K++) {
    const K2 = Math.min(K + 1, K_MAX);
    xs.push(K);
    ys.push(Y(A, K2, L) - Y(A, K, L));
  }
  return { xs, ys };
}

// Charts
let chYL = null, chYK = null, chMPL = null, chMPK = null;

// Store previous curves to ghost
let prev = {
  YL: null,
  YK: null,
  MPL: null,
  MPK: null
};

function makeChart(canvas, xLabel, yLabel, yMin, yMax) {
  return new Chart(canvas, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        // [0] ghost curve (grey)
        { label: "Previous", data: [], borderWidth: 2, pointRadius: 0 },
        // [1] current curve
        { label: "Current", data: [], borderWidth: 3, pointRadius: 0 },
        // [2] segment (between the two points)
        { label: "Δ", data: [], borderWidth: 3, pointRadius: 0 },
        // [3] points
        { label: "Points", data: [], showLine: false, pointRadius: 5 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { grid: { display: false }, title: { display: true, text: xLabel } },
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

function applyStyles() {
  // Make ghost grey, current solid, etc. (avoid hardcoding colors; use defaults + alpha via rgba)
  // We will use borderColor with rgba for ghost only. Current uses default.
  const set = (ch) => {
    // Ghost
    ch.data.datasets[0].borderColor = "rgba(0,0,0,0.20)";
    ch.data.datasets[0].borderDash = [6, 6];

    // Current
    ch.data.datasets[1].borderDash = [];

    // Δ segment
    ch.data.datasets[2].borderDash = [2, 4];

    // Points
    ch.data.datasets[3].pointHoverRadius = 6;
  };
  [chYL, chYK, chMPL, chMPK].forEach(c => c && set(c));
}

function updateAll() {
  const s = state();
  const A = s.A, K = s.K, L = s.L;

  // Build new series
  const YL = seriesYvsL(A, K);
  const YK = seriesYvsK(A, L);
  const MPLs = seriesMPL(A, K);
  const MPKs = seriesMPK(A, L);

  // Compute points for output graphs
  const y0 = Y(A, K, L);
  const yL1 = Y(A, K, Math.min(L + 1, L_MAX));
  const yK1 = Y(A, Math.min(K + 1, K_MAX), L);

  const dY_L = yL1 - y0; // discrete MPL at (K,L)
  const dY_K = yK1 - y0; // discrete MPK at (K,L)

  // Corresponding MP points
  const mplPointX = L;
  const mplPointY = dY_L;

  const mpkPointX = K;
  const mpkPointY = dY_K;

  // Create charts if needed
  if (!chYL) {
    chYL = makeChart(els.chartYL, "Labor (L)", "Output (Y)", 0, Y_MAX);
    chYK = makeChart(els.chartYK, "Capital (K)", "Output (Y)", 0, Y_MAX);
    chMPL = makeChart(els.chartMPL, "Labor (L)", "MPL (ΔY from +1 L)", 0, MP_MAX);
    chMPK = makeChart(els.chartMPK, "Capital (K)", "MPK (ΔY from +1 K)", 0, MP_MAX);
    applyStyles();
  }

  // Update each chart with ghost + current + points/segment
  function upd(ch, key, xs, ys, pointA, pointB, mpPoint) {
    // Ghost dataset (previous curve)
    const prevCurve = prev[key];
    ch.data.labels = xs;

    ch.data.datasets[0].data = prevCurve ? prevCurve : [];
    // If no previous, keep empty to avoid clutter
    ch.data.datasets[1].data = ys;

    // Segment dataset: just two y-values aligned with x labels by using null except at indices
    const seg = Array(xs.length).fill(null);
    const idxA = xs.indexOf(pointA.x);
    const idxB = xs.indexOf(pointB.x);
    if (idxA >= 0) seg[idxA] = pointA.y;
    if (idxB >= 0) seg[idxB] = pointB.y;
    ch.data.datasets[2].data = seg;

    // Points dataset: scatter via {x,y} requires scatter chart; but we’re using line chart.
    // Chart.js line can accept {x,y} only with x scale type; simpler: use null array + pointRadius via dataset.
    const pts = Array(xs.length).fill(null);
    if (idxA >= 0) pts[idxA] = pointA.y;
    if (idxB >= 0) pts[idxB] = pointB.y;
    // For MP charts, mark one point only (mpPoint)
    if (mpPoint) {
      const idxM = xs.indexOf(mpPoint.x);
      if (idxM >= 0) pts[idxM] = mpPoint.y;
    }
    ch.data.datasets[3].data = pts;

    ch.update();

    // Store current as next ghost
    prev[key] = ys.slice();
  }

  // Output vs L: points (L, Y) and (L+1, Y(K,L+1))
  upd(
    chYL,
    "YL",
    YL.xs,
    YL.ys,
    { x: L, y: y0 },
    { x: Math.min(L + 1, L_MAX), y: yL1 },
    null
  );

  // Output vs K: points (K, Y) and (K+1, Y(K+1,L))
  upd(
    chYK,
    "YK",
    YK.xs,
    YK.ys,
    { x: K, y: y0 },
    { x: Math.min(K + 1, K_MAX), y: yK1 },
    null
  );

  // MPL curve: mark the point at x=L with y=dY_L
  upd(
    chMPL,
    "MPL",
    MPLs.xs,
    MPLs.ys,
    { x: mplPointX, y: mplPointY }, // we’ll also use this as pointA
    { x: mplPointX, y: mplPointY }, // same
    { x: mplPointX, y: mplPointY }
  );

  // MPK curve: mark the point at x=K with y=dY_K
  upd(
    chMPK,
    "MPK",
    MPKs.xs,
    MPKs.ys,
    { x: mpkPointX, y: mpkPointY },
    { x: mpkPointX, y: mpkPointY },
    { x: mpkPointX, y: mpkPointY }
  );

  // Notes beneath charts
  els.noteYL.textContent =
    `At K=${K}: Y(K,L) at L=${L} is ${fmt(y0)}. Y(K,L+1) at L=${Math.min(L+1,L_MAX)} is ${fmt(yL1)}. ΔY = ${fmt(dY_L)} (this is MPL using +1).`;

  els.noteYK.textContent =
    `At L=${L}: Y(K,L) at K=${K} is ${fmt(y0)}. Y(K+1,L) at K=${Math.min(K+1,K_MAX)} is ${fmt(yK1)}. ΔY = ${fmt(dY_K)} (this is MPK using +1).`;

  els.noteMPL.textContent =
    `MPL at L=${L} (with K=${K} fixed) equals ${fmt(dY_L)} — same ΔY shown in the top-left graph.`;

  els.noteMPK.textContent =
    `MPK at K=${K} (with L=${L} fixed) equals ${fmt(dY_K)} — same ΔY shown in the top-right graph.`;

  setStatus("Try increasing L: the ΔY gap and MPL shrink (diminishing MPL). Try increasing K: the ΔY gap and MPK shrink (diminishing MPK).");
}

// Wire sliders
bindPair(els.A_r, els.A_n, updateAll);
bindPair(els.K_r, els.K_n, updateAll);
bindPair(els.L_r, els.L_n, updateAll);

// Init
(function init(){
  els.A_r.value = els.A_n.value = 2;
  els.K_r.value = els.K_n.value = 5;
  els.L_r.value = els.L_n.value = 5;
  updateAll();
})();
