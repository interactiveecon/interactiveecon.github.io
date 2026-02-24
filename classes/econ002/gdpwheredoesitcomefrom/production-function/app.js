/* Backward-difference marginal products + graph-first visuals.

   Production function (kept implicit; chosen for visible concavity):
     F(A,K,L) = A * sqrt(K) * sqrt(L)

   MPL(K,L) = F(K,L) - F(K,L-1)
   MPK(K,L) = F(K,L) - F(K-1,L)

   Requirements:
   - Curves plotted as smooth/continuous (many points).
   - Sliders move in steps of 1 (A,K,L integers).
   - Dashed projections from highlighted points to BOTH axes.
   - Dynamic y-axis; y-axis ticks ONLY at the y-values of the highlighted points.
*/

const K_MIN = 0, K_MAX = 10;
const L_MIN = 0, L_MAX = 10;
const A_MIN = 1, A_MAX = 5;

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
    L: Number(els.L_n.value)
  };
}

// Smooth curves: many points
function linspace(min, max, step) {
  const xs = [];
  for (let x = min; x <= max + 1e-9; x += step) xs.push(Number(x.toFixed(3)));
  return xs;
}

// Build datasets as {x,y} so x-axis is linear
function curveYvsL(A, K) {
  const xs = linspace(0, 10, 0.05);
  return xs.map(L => ({ x: L, y: F(A, K, L) }));
}
function curveYvsK(A, L) {
  const xs = linspace(0, 10, 0.05);
  return xs.map(K => ({ x: K, y: F(A, K, L) }));
}

// MPL/MPK curves: also smooth (use “continuous x” but backward-diff defined on integers)
// We’ll plot MPL at integer L only (since it’s a discrete concept), but connect with a line.
// Same for MPK at integer K.
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

// Projection “L” shape to axes
function projectionData(p) {
  return [
    { x: p.x, y: 0 },
    { x: p.x, y: p.y },
    { x: NaN, y: NaN },
    { x: 0, y: p.y },
    { x: p.x, y: p.y }
  ];
}

// Plugin: replace y-ticks with ONLY point y-values (unique, sorted)
const tickOnlyPointsPlugin = {
  id: "tickOnlyPoints",
  afterBuildTicks(chart, args, opts) {
    if (!opts || !opts.enabled) return;
    const y = chart.scales.y;
    if (!y) return;

    const vals = (opts.values || []).filter(v => isFinite(v));
    if (!vals.length) return;

    // Unique + sorted
    const uniq = Array.from(new Set(vals.map(v => Number(v.toFixed(6))))).sort((a,b)=>a-b);

    // If y-axis is dynamic, ensure min/max contain ticks with a bit of padding
    const pad = opts.pad ?? 0.08;
    const lo = uniq[0], hi = uniq[uniq.length - 1];
    const span = Math.max(hi - lo, 1e-6);

    y.options.min = Math.max(0, lo - pad * span);
    y.options.max = hi + pad * span;

    y.ticks = uniq.map(v => ({ value: v }));
  }
};

Chart.register(tickOnlyPointsPlugin);

function makeChart(canvas, xLabel, yLabel, pluginKey) {
  return new Chart(canvas, {
    type: "line",
    data: {
      datasets: [
        // 0 baseline (grey dashed)
        { data: [], borderWidth: 2, pointRadius: 0 },
        // 1 current (solid)
        { data: [], borderWidth: 3, pointRadius: 0 },

        // 2 segment between two highlighted points
        { data: [], borderWidth: 3, pointRadius: 0 },

        // 3 highlighted points
        { data: [], showLine: false, pointRadius: 5 },

        // 4 projections for point A
        { data: [], borderWidth: 2, pointRadius: 0 },

        // 5 projections for point B
        { data: [], borderWidth: 2, pointRadius: 0 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      plugins: {
        legend: { display: false },
        tickOnlyPoints: { enabled: false, values: [], pad: 0.12 }
      },
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
          // dynamic y; plugin may override min/max
          grid: { display: true },
          title: { display: true, text: yLabel }
        }
      }
    }
  });
}

function styleChart(ch) {
  ch.data.datasets[0].borderColor = "rgba(0,0,0,0.25)";
  ch.data.datasets[0].borderDash = [6, 6];

  ch.data.datasets[2].borderDash = [2, 4];

  ch.data.datasets[4].borderColor = "rgba(0,0,0,0.25)";
  ch.data.datasets[4].borderDash = [4, 4];
  ch.data.datasets[5].borderColor = "rgba(0,0,0,0.25)";
  ch.data.datasets[5].borderDash = [4, 4];
}

let chYL = null, chYK = null, chMPL = null, chMPK = null;

function update() {
  const s = state();
  const A = s.A, K = s.K, L = s.L;

  // Compute core values
  const y = F(A, K, L);
  const mpl = (L > 0) ? (F(A, K, L) - F(A, K, L - 1)) : NaN;
  const mpk = (K > 0) ? (F(A, K, L) - F(A, K - 1, L)) : NaN;

  els.tblY.textContent = fmt(y);
  els.tblMPL.textContent = (isFinite(mpl) ? fmt(mpl) : "—");
  els.tblMPK.textContent = (isFinite(mpk) ? fmt(mpk) : "—");

  // Baseline curves (fixed)
  const baseYL = curveYvsL(BASE.A, BASE.K);
  const baseYK = curveYvsK(BASE.A, BASE.L);
  const baseMPL = mplSeries(BASE.A, BASE.K);
  const baseMPK = mpkSeries(BASE.A, BASE.L);

  // Current curves
  const curYL = curveYvsL(A, K);
  const curYK = curveYvsK(A, L);
  const curMPL = mplSeries(A, K);
  const curMPK = mpkSeries(A, L);

  // Highlighted points for backward differences (current and previous)
  const pYL_now = { x: L, y: F(A, K, L) };
  const pYL_prev = (L > 0) ? { x: L - 1, y: F(A, K, L - 1) } : null;

  const pYK_now = { x: K, y: F(A, K, L) };
  const pYK_prev = (K > 0) ? { x: K - 1, y: F(A, K - 1, L) } : null;

  // MP points
  const pMPL = (L > 0) ? { x: L, y: mpl } : null;
  const pMPK = (K > 0) ? { x: K, y: mpk } : null;

  // Create charts once
  if (!chYL) {
    chYL = makeChart(els.chartYL, "Labor (L)", "Output (Y)");
    chYK = makeChart(els.chartYK, "Capital (K)", "Output (Y)");
    chMPL = makeChart(els.chartMPL, "Labor (L)", "MPL");
    chMPK = makeChart(els.chartMPK, "Capital (K)", "MPK");
    [chYL, chYK, chMPL, chMPK].forEach(styleChart);
  }

  // Helper to set curves
  function setCurves(ch, base, cur) {
    ch.data.datasets[0].data = base;
    ch.data.datasets[1].data = cur;
  }

  // OUTPUT vs L
  setCurves(chYL, baseYL, curYL);
  chYL.data.datasets[2].data = (pYL_prev) ? [pYL_prev, pYL_now] : [];
  chYL.data.datasets[3].data = (pYL_prev) ? [pYL_prev, pYL_now] : [pYL_now];
  chYL.data.datasets[4].data = (pYL_prev) ? projectionData(pYL_prev) : [];
  chYL.data.datasets[5].data = projectionData(pYL_now);

  // y ticks only at point y-values (prev and now)
  const yTickValsYL = [pYL_now.y].concat(pYL_prev ? [pYL_prev.y] : []);
  chYL.options.plugins.tickOnlyPoints.enabled = true;
  chYL.options.plugins.tickOnlyPoints.values = yTickValsYL;

  chYL.update();

  // OUTPUT vs K
  setCurves(chYK, baseYK, curYK);
  chYK.data.datasets[2].data = (pYK_prev) ? [pYK_prev, pYK_now] : [];
  chYK.data.datasets[3].data = (pYK_prev) ? [pYK_prev, pYK_now] : [pYK_now];
  chYK.data.datasets[4].data = (pYK_prev) ? projectionData(pYK_prev) : [];
  chYK.data.datasets[5].data = projectionData(pYK_now);

  const yTickValsYK = [pYK_now.y].concat(pYK_prev ? [pYK_prev.y] : []);
  chYK.options.plugins.tickOnlyPoints.enabled = true;
  chYK.options.plugins.tickOnlyPoints.values = yTickValsYK;

  chYK.update();

  // MPL
  setCurves(chMPL, baseMPL, curMPL);
  chMPL.data.datasets[2].data = [];
  chMPL.data.datasets[3].data = (pMPL) ? [pMPL] : [];
  chMPL.data.datasets[4].data = [];
  chMPL.data.datasets[5].data = (pMPL) ? projectionData(pMPL) : [];

  chMPL.options.plugins.tickOnlyPoints.enabled = true;
  chMPL.options.plugins.tickOnlyPoints.values = (pMPL) ? [pMPL.y] : [];

  chMPL.update();

  // MPK
  setCurves(chMPK, baseMPK, curMPK);
  chMPK.data.datasets[2].data = [];
  chMPK.data.datasets[3].data = (pMPK) ? [pMPK] : [];
  chMPK.data.datasets[4].data = [];
  chMPK.data.datasets[5].data = (pMPK) ? projectionData(pMPK) : [];

  chMPK.options.plugins.tickOnlyPoints.enabled = true;
  chMPK.options.plugins.tickOnlyPoints.values = (pMPK) ? [pMPK.y] : [];

  chMPK.update();

  // Notes
  els.noteYL.textContent = (pYL_prev)
    ? `At K=${K}: Y(L=${L})=${fmt(pYL_now.y)} and Y(L=${L-1})=${fmt(pYL_prev.y)} → MPL=${fmt(mpl)}.`
    : `At K=${K}: MPL is defined starting at L=1 (needs L−1).`;

  els.noteYK.textContent = (pYK_prev)
    ? `At L=${L}: Y(K=${K})=${fmt(pYK_now.y)} and Y(K=${K-1})=${fmt(pYK_prev.y)} → MPK=${fmt(mpk)}.`
    : `At L=${L}: MPK is defined starting at K=1 (needs K−1).`;

  els.noteMPL.textContent = (pMPL)
    ? `This MPL point equals the same ΔY shown on the Output vs Labor graph.`
    : `Increase L to at least 1 to define MPL.`;

  els.noteMPK.textContent = (pMPK)
    ? `This MPK point equals the same ΔY shown on the Output vs Capital graph.`
    : `Increase K to at least 1 to define MPK.`;

  setStatus("Look at the ΔY gaps: as L rises (holding K), MPL falls; as K rises (holding L), MPK falls.");
}

function resetToBaseline() {
  els.A_r.value = els.A_n.value = BASE.A;
  els.K_r.value = els.K_n.value = BASE.K;
  els.L_r.value = els.L_n.value = BASE.L;
  update();
}

bindPair(els.A_r, els.A_n, update);
bindPair(els.K_r, els.K_n, update);
bindPair(els.L_r, els.L_n, update);

els.resetBtn.addEventListener("click", resetToBaseline);

// init
resetToBaseline();
