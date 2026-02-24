/* Marginal Product Lab — final integrated version

   F(A,K,L) = A * sqrt(K) * sqrt(L)   (stylized concavity for clarity)

   MPL(K,L) = F(K,L) - F(K,L-1)
   MPK(K,L) = F(K,L) - F(K-1,L)

   - Baseline curves are fixed (grey dashed)
   - Current curves update (solid)
   - Dashed projection lines from highlighted points to both axes
   - Y-axis always shows the entire baseline + entire current curve (union range + padding)
   - Output curves are plotted smoothly (many points)
*/

const A_MIN = 1, A_MAX = 5;
const K_MIN = 0, K_MAX = 10;
const L_MIN = 0, L_MAX = 10;

const BASE = { A: 2, K: 5, L: 5 };

const els = {
  A_r: document.getElementById("A_r"),
  A_n: document.getElementById("A_n"),
  K_r: document.getElementById("K_r"),
  K_n: document.getElementById("K_n"),
  L_r: document.getElementById("L_r"),
  L_n: document.getElementById("L_n"),
  resetBtn: document.getElementById("resetBtn"),
  status: document.getElementById("status"),

  tblY: document.getElementById("tblY"),
  tblMPL: document.getElementById("tblMPL"),
  tblMPK: document.getElementById("tblMPK"),

  chartYL: document.getElementById("chartYL"),
  chartYK: document.getElementById("chartYK"),
  chartMPL: document.getElementById("chartMPL"),
  chartMPK: document.getElementById("chartMPK"),

  noteYL: document.getElementById("noteYL"),
  noteYK: document.getElementById("noteYK"),
  noteMPL: document.getElementById("noteMPL"),
  noteMPK: document.getElementById("noteMPK"),
};

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

// Dense x-grid for smooth curves
function linspace(min, max, step) {
  const xs = [];
  for (let x = min; x <= max + 1e-9; x += step) xs.push(x);
  return xs;
}

function curveYvsL(A, K) {
  const xs = linspace(0, 10, 0.05);
  return xs.map(L => ({ x: L, y: F(A, K, L) }));
}
function curveYvsK(A, L) {
  const xs = linspace(0, 10, 0.05);
  return xs.map(K => ({ x: K, y: F(A, K, L) }));
}

// MPs are discrete by definition; plot at integer x (and connect)
function mplSeries(A, K) {
  const pts = [];
  for (let L = 0; L <= 10; L++) {
    if (L === 0) pts.push({ x: L, y: null });
    else pts.push({ x: L, y: F(A, K, L) - F(A, K, L - 1) });
  }
  return pts;
}
function mpkSeries(A, L) {
  const pts = [];
  for (let K = 0; K <= 10; K++) {
    if (K === 0) pts.push({ x: K, y: null });
    else pts.push({ x: K, y: F(A, K, L) - F(A, K - 1, L) });
  }
  return pts;
}

// Projection “L” to both axes
function projectionData(p) {
  return [
    { x: p.x, y: 0 },
    { x: p.x, y: p.y },
    { x: NaN, y: NaN },
    { x: 0, y: p.y },
    { x: p.x, y: p.y }
  ];
}

// Compute union y-range from two datasets
function finiteYs(dataset) {
  const ys = [];
  for (const p of dataset) {
    if (p && isFinite(p.y)) ys.push(p.y);
  }
  return ys;
}
function unionMinMax(d1, d2) {
  const ys = finiteYs(d1).concat(finiteYs(d2));
  if (!ys.length) return { min: 0, max: 1 };
  let mn = ys[0], mx = ys[0];
  for (const v of ys) { if (v < mn) mn = v; if (v > mx) mx = v; }
  return { min: mn, max: mx };
}
function paddedRange(mn, mx, padFrac = 0.12) {
  const span = Math.max(mx - mn, 1e-6);
  const pad = padFrac * span;
  return { min: Math.max(0, mn - pad), max: mx + pad };
}

// Charts
let chYL = null, chYK = null, chMPL = null, chMPK = null;

function makeChart(canvas, xLabel, yLabel) {
  return new Chart(canvas, {
    type: "line",
    data: {
      datasets: [
        // 0 baseline curve
        { data: [], borderWidth: 2, pointRadius: 0 },
        // 1 current curve
        { data: [], borderWidth: 3, pointRadius: 0 },
        // 2 segment between highlighted points (output charts)
        { data: [], borderWidth: 3, pointRadius: 0 },
        // 3 highlighted points
        { data: [], showLine: false, pointRadius: 5 },
        // 4 projections for point A
        { data: [], borderWidth: 2, pointRadius: 0 },
        // 5 projections for point B
        { data: [], borderWidth: 2, pointRadius: 0 },
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
          max: 10,
          ticks: { stepSize: 1 },
          grid: { display: false },
          title: { display: true, text: xLabel }
        },
        y: {
          grid: { display: true },
          title: { display: true, text: yLabel }
        }
      }
    }
  });
}

function styleChart(ch) {
  // baseline grey dashed
  ch.data.datasets[0].borderColor = "rgba(0,0,0,0.25)";
  ch.data.datasets[0].borderDash = [6, 6];

  // segment dotted
  ch.data.datasets[2].borderDash = [2, 4];

  // projection lines dashed grey
  ch.data.datasets[4].borderColor = "rgba(0,0,0,0.25)";
  ch.data.datasets[4].borderDash = [4, 4];
  ch.data.datasets[5].borderColor = "rgba(0,0,0,0.25)";
  ch.data.datasets[5].borderDash = [4, 4];
}

function ensureCharts() {
  if (chYL) return;
  chYL  = makeChart(els.chartYL,  "Labor (L)",   "Output (Y)");
  chYK  = makeChart(els.chartYK,  "Capital (K)", "Output (Y)");
  chMPL = makeChart(els.chartMPL, "Labor (L)",   "MPL");
  chMPK = makeChart(els.chartMPK, "Capital (K)", "MPK");
  [chYL, chYK, chMPL, chMPK].forEach(styleChart);
}

function update() {
  ensureCharts();

  const s = state();
  const A = s.A, K = s.K, L = s.L;

  // Table values
  const y = F(A, K, L);
  const mpl = (L > 0) ? (F(A, K, L) - F(A, K, L - 1)) : NaN;
  const mpk = (K > 0) ? (F(A, K, L) - F(A, K - 1, L)) : NaN;

  els.tblY.textContent = fmt(y);
  els.tblMPL.textContent = isFinite(mpl) ? fmt(mpl) : "—";
  els.tblMPK.textContent = isFinite(mpk) ? fmt(mpk) : "—";

  // Baseline + current curves
  const baseYL  = curveYvsL(BASE.A, BASE.K);
  const curYL   = curveYvsL(A, K);

  const baseYK  = curveYvsK(BASE.A, BASE.L);
  const curYK   = curveYvsK(A, L);

  const baseMPL = mplSeries(BASE.A, BASE.K);
  const curMPL  = mplSeries(A, K);

  const baseMPK = mpkSeries(BASE.A, BASE.L);
  const curMPK  = mpkSeries(A, L);

  // Highlighted points for output charts (current and previous step)
  const pYL_now = { x: L, y: F(A, K, L) };
  const pYL_prev = (L > 0) ? { x: L - 1, y: F(A, K, L - 1) } : null;

  const pYK_now = { x: K, y: F(A, K, L) };
  const pYK_prev = (K > 0) ? { x: K - 1, y: F(A, K - 1, L) } : null;

  // MP points
  const pMPL = (L > 0) ? { x: L, y: mpl } : null;
  const pMPK = (K > 0) ? { x: K, y: mpk } : null;

  // Set curves
  function setCurves(ch, base, cur) {
    ch.data.datasets[0].data = base;
    ch.data.datasets[1].data = cur;

    // y-axis range includes BOTH curves
    const mm = unionMinMax(base, cur);
    const rr = paddedRange(mm.min, mm.max, 0.12);
    ch.options.scales.y.min = rr.min;
    ch.options.scales.y.max = rr.max;
  }

  // Output vs L
  setCurves(chYL, baseYL, curYL);
  chYL.data.datasets[2].data = pYL_prev ? [pYL_prev, pYL_now] : [];
  chYL.data.datasets[3].data = pYL_prev ? [pYL_prev, pYL_now] : [pYL_now];
  chYL.data.datasets[4].data = pYL_prev ? projectionData(pYL_prev) : [];
  chYL.data.datasets[5].data = projectionData(pYL_now);
  chYL.update();

  // Output vs K
  setCurves(chYK, baseYK, curYK);
  chYK.data.datasets[2].data = pYK_prev ? [pYK_prev, pYK_now] : [];
  chYK.data.datasets[3].data = pYK_prev ? [pYK_prev, pYK_now] : [pYK_now];
  chYK.data.datasets[4].data = pYK_prev ? projectionData(pYK_prev) : [];
  chYK.data.datasets[5].data = projectionData(pYK_now);
  chYK.update();

  // MPL
  setCurves(chMPL, baseMPL, curMPL);
  chMPL.data.datasets[2].data = [];
  chMPL.data.datasets[3].data = pMPL ? [pMPL] : [];
  chMPL.data.datasets[4].data = [];
  chMPL.data.datasets[5].data = pMPL ? projectionData(pMPL) : [];
  chMPL.update();

  // MPK
  setCurves(chMPK, baseMPK, curMPK);
  chMPK.data.datasets[2].data = [];
  chMPK.data.datasets[3].data = pMPK ? [pMPK] : [];
  chMPK.data.datasets[4].data = [];
  chMPK.data.datasets[5].data = pMPK ? projectionData(pMPK) : [];
  chMPK.update();

  // Notes
  els.noteYL.textContent = pYL_prev
    ? `At K=${K}: Y(L=${L})=${fmt(pYL_now.y)} and Y(L=${L-1})=${fmt(pYL_prev.y)} → MPL=${fmt(mpl)}.`
    : `MPL is defined starting at L=1 (needs L−1).`;

  els.noteYK.textContent = pYK_prev
    ? `At L=${L}: Y(K=${K})=${fmt(pYK_now.y)} and Y(K=${K-1})=${fmt(pYK_prev.y)} → MPK=${fmt(mpk)}.`
    : `MPK is defined starting at K=1 (needs K−1).`;

  els.noteMPL.textContent = pMPL
    ? `This MPL point equals the same ΔY shown on Output vs Labor.`
    : `Increase L to at least 1 to define MPL.`;

  els.noteMPK.textContent = pMPK
    ? `This MPK point equals the same ΔY shown on Output vs Capital.`
    : `Increase K to at least 1 to define MPK.`;

  setStatus("Axes always include the full baseline and current curves. Increase L or K and watch MPL/MPK shrink (diminishing marginal product).");
}

function resetToBaseline() {
  els.A_r.value = els.A_n.value = BASE.A;
  els.K_r.value = els.K_n.value = BASE.K;
  els.L_r.value = els.L_n.value = BASE.L;

  update();

  // MathJax labels in the table are static, but safe to typeset once on reset/init.
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise();
  }
}

bindPair(els.A_r, els.A_n, update);
bindPair(els.K_r, els.K_n, update);
bindPair(els.L_r, els.L_n, update);

els.resetBtn.addEventListener("click", resetToBaseline);

// init
resetToBaseline();
