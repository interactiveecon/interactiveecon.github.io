/* Marginal Product Lab — full integrated version (2-dec rounding + initial y-scale + continuous MP curves)

   Production function (stylized concavity):
     F(A,K,L) = A * sqrt(K) * sqrt(L)

   Backward-difference marginal products:
     MPL(K,L) = F(K,L) - F(K,L-1)
     MPK(K,L) = F(K,L) - F(K-1,L)

   Features:
   - Baseline curves fixed (grey dashed)
   - Current curves solid
   - Projection lines to BOTH axes from highlighted points
   - Output curves smooth (dense sampling)
   - MPL/MPK curves smooth by evaluating backward-difference at real x
   - Y-axis ticks ONLY at highlighted point y-values, formatted to 2 decimals
   - Sticky y-axes: expand but don’t shrink until Reset
   - Initial y-scale set using K=max, A/L at initial (baseline) values
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

function fmt2(x) {
  if (!isFinite(x)) return "—";
  return x.toFixed(2);
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

function linspace(min, max, step) {
  const xs = [];
  for (let x = min; x <= max + 1e-12; x += step) xs.push(x);
  return xs;
}

/* Curves */
function curveYvsL(A, K) {
  const xs = linspace(0, 10, 0.02);
  return xs.map(L => ({ x: L, y: F(A, K, L) }));
}
function curveYvsK(A, L) {
  const xs = linspace(0, 10, 0.02);
  return xs.map(K => ({ x: K, y: F(A, K, L) }));
}

// “Continuous-looking” backward difference evaluated for real x
function curveMPL(A, K) {
  const xs = linspace(0, 10, 0.02);
  return xs.map(L => {
    if (L < 1) return { x: L, y: null };
    return { x: L, y: F(A, K, L) - F(A, K, L - 1) };
  });
}
function curveMPK(A, L) {
  const xs = linspace(0, 10, 0.02);
  return xs.map(K => {
    if (K < 1) return { x: K, y: null };
    return { x: K, y: F(A, K, L) - F(A, K - 1, L) };
  });
}

/* Projections */
function projectionData(p) {
  return [
    { x: p.x, y: 0 },
    { x: p.x, y: p.y },
    { x: NaN, y: NaN },
    { x: 0, y: p.y },
    { x: p.x, y: p.y }
  ];
}

/* Range helpers */
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

/* Plugin: y ticks only at highlighted point y-values (formatted to hundredths) */
const pointTicksPlugin = {
  id: "pointTicks",
  afterBuildTicks(chart, args, opts) {
    if (!opts || !opts.enabled) return;
    const y = chart.scales.y;
    if (!y) return;

    const vals = (opts.values || []).filter(v => isFinite(v));
    if (!vals.length) return;

    const uniq = Array.from(new Set(vals.map(v => Number(v.toFixed(6))))).sort((a,b)=>a-b);
    y.ticks = uniq.map(v => ({ value: v }));
  }
};
Chart.register(pointTicksPlugin);

/* Sticky axis ranges per chart (expand, don’t shrink) */
const sticky = { YL: null, YK: null, MPL: null, MPK: null };

function stickyUpdate(key, desiredMin, desiredMax) {
  if (!sticky[key]) sticky[key] = { min: desiredMin, max: desiredMax };
  sticky[key].min = Math.min(sticky[key].min, desiredMin);
  sticky[key].max = Math.max(sticky[key].max, desiredMax);
  return sticky[key];
}

function stickySetInitial(initialRanges) {
  sticky.YL = { ...initialRanges.YL };
  sticky.YK = { ...initialRanges.YK };
  sticky.MPL = { ...initialRanges.MPL };
  sticky.MPK = { ...initialRanges.MPK };
}

/* Initial y-axis scales:
   "what it would be if K=max but A and L are at initial values"
   - For Y vs L: use A=BASE.A, K=10 (max), vary L
   - For Y vs K: use A=BASE.A, L=BASE.L (initial), vary K (includes K max)
   - For MPL:    use A=BASE.A, K=10 (max), vary L
   - For MPK:    use A=BASE.A, L=BASE.L (initial), vary K
*/
function computeInitialRanges() {
  const A0 = BASE.A;
  const L0 = BASE.L;

  const refYL  = curveYvsL(A0, 10);
  const refYK  = curveYvsK(A0, L0);
  const refMPL = curveMPL(A0, 10);
  const refMPK = curveMPK(A0, L0);

  // Also include baseline curves so baseline is definitely in frame initially
  const baseYL  = curveYvsL(BASE.A, BASE.K);
  const baseYK  = curveYvsK(BASE.A, BASE.L);
  const baseMPL = curveMPL(BASE.A, BASE.K);
  const baseMPK = curveMPK(BASE.A, BASE.L);

  const rYL  = paddedRange(...Object.values(unionMinMax(refYL,  baseYL)),  0.12);
  const rYK  = paddedRange(...Object.values(unionMinMax(refYK,  baseYK)),  0.12);
  const rMPL = paddedRange(...Object.values(unionMinMax(refMPL, baseMPL)), 0.18);
  const rMPK = paddedRange(...Object.values(unionMinMax(refMPK, baseMPK)), 0.18);

  return { YL: rYL, YK: rYK, MPL: rMPL, MPK: rMPK };
}

/* Charts */
let chYL = null, chYK = null, chMPL = null, chMPK = null;

function makeChart(canvas, xLabel, yLabel) {
  return new Chart(canvas, {
    type: "line",
    data: {
      datasets: [
        { data: [], borderWidth: 2, pointRadius: 0 },          // baseline
        { data: [], borderWidth: 3, pointRadius: 0 },          // current
        { data: [], borderWidth: 3, pointRadius: 0 },          // segment (output)
        { data: [], showLine: false, pointRadius: 5 },         // points
        { data: [], borderWidth: 2, pointRadius: 0 },          // projections A
        { data: [], borderWidth: 2, pointRadius: 0 },          // projections B
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      plugins: {
        legend: { display: false },
        pointTicks: { enabled: true, values: [] }
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
          grid: { display: true },
          title: { display: true, text: yLabel },
          ticks: {
            callback: (value) => Number(value).toFixed(2)
          }
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

  // Values for metrics
  const y = F(A, K, L);
  const mpl = (L > 0) ? (F(A, K, L) - F(A, K, L - 1)) : NaN;
  const mpk = (K > 0) ? (F(A, K, L) - F(A, K - 1, L)) : NaN;

  els.tblY.textContent   = fmt2(y);
  els.tblMPL.textContent = isFinite(mpl) ? fmt2(mpl) : "—";
  els.tblMPK.textContent = isFinite(mpk) ? fmt2(mpk) : "—";

  // Baseline + current curves
  const baseYL  = curveYvsL(BASE.A, BASE.K);
  const curYL   = curveYvsL(A, K);

  const baseYK  = curveYvsK(BASE.A, BASE.L);
  const curYK   = curveYvsK(A, L);

  const baseMPL = curveMPL(BASE.A, BASE.K);
  const curMPL  = curveMPL(A, K);

  const baseMPK = curveMPK(BASE.A, BASE.L);
  const curMPK  = curveMPK(A, L);

  // Highlight points (integer current and previous step)
  const pYL_now = { x: L, y: F(A, K, L) };
  const pYL_prev = (L > 0) ? { x: L - 1, y: F(A, K, L - 1) } : null;

  const pYK_now = { x: K, y: F(A, K, L) };
  const pYK_prev = (K > 0) ? { x: K - 1, y: F(A, K - 1, L) } : null;

  const pMPL = (L > 0) ? { x: L, y: mpl } : null;
  const pMPK = (K > 0) ? { x: K, y: mpk } : null;

  function setCurves(ch, base, cur, key, tickVals) {
    ch.data.datasets[0].data = base;
    ch.data.datasets[1].data = cur;

    // axis range includes full baseline + current, sticky
    const mm = unionMinMax(base, cur);
    const rr = paddedRange(mm.min, mm.max, 0.12);
    const stick = stickyUpdate(key, rr.min, rr.max);
    ch.options.scales.y.min = stick.min;
    ch.options.scales.y.max = stick.max;

    // tick values (points only)
    ch.options.plugins.pointTicks.values = tickVals.filter(v => isFinite(v));
  }

  // Output vs L
  setCurves(chYL, baseYL, curYL, "YL",
    [pYL_now.y].concat(pYL_prev ? [pYL_prev.y] : [])
  );
  chYL.data.datasets[2].data = pYL_prev ? [pYL_prev, pYL_now] : [];
  chYL.data.datasets[3].data = pYL_prev ? [pYL_prev, pYL_now] : [pYL_now];
  chYL.data.datasets[4].data = pYL_prev ? projectionData(pYL_prev) : [];
  chYL.data.datasets[5].data = projectionData(pYL_now);
  chYL.update();

  // Output vs K
  setCurves(chYK, baseYK, curYK, "YK",
    [pYK_now.y].concat(pYK_prev ? [pYK_prev.y] : [])
  );
  chYK.data.datasets[2].data = pYK_prev ? [pYK_prev, pYK_now] : [];
  chYK.data.datasets[3].data = pYK_prev ? [pYK_prev, pYK_now] : [pYK_now];
  chYK.data.datasets[4].data = pYK_prev ? projectionData(pYK_prev) : [];
  chYK.data.datasets[5].data = projectionData(pYK_now);
  chYK.update();

  // MPL
  setCurves(chMPL, baseMPL, curMPL, "MPL",
    pMPL ? [pMPL.y] : []
  );
  chMPL.data.datasets[2].data = [];
  chMPL.data.datasets[3].data = pMPL ? [pMPL] : [];
  chMPL.data.datasets[4].data = [];
  chMPL.data.datasets[5].data = pMPL ? projectionData(pMPL) : [];
  chMPL.update();

  // MPK
  setCurves(chMPK, baseMPK, curMPK, "MPK",
    pMPK ? [pMPK.y] : []
  );
  chMPK.data.datasets[2].data = [];
  chMPK.data.datasets[3].data = pMPK ? [pMPK] : [];
  chMPK.data.datasets[4].data = [];
  chMPK.data.datasets[5].data = pMPK ? projectionData(pMPK) : [];
  chMPK.update();

  // Notes (rounded to hundredths)
  els.noteYL.textContent = pYL_prev
    ? `At K=${K}: Y(L=${L})=${fmt2(pYL_now.y)} and Y(L=${L-1})=${fmt2(pYL_prev.y)} → MPL=${fmt2(mpl)}.`
    : `MPL is defined starting at L=1 (needs L−1).`;

  els.noteYK.textContent = pYK_prev
    ? `At L=${L}: Y(K=${K})=${fmt2(pYK_now.y)} and Y(K=${K-1})=${fmt2(pYK_prev.y)} → MPK=${fmt2(mpk)}.`
    : `MPK is defined starting at K=1 (needs K−1).`;

  els.noteMPL.textContent = pMPL
    ? `The MPL curve is smooth because we evaluate F(K,L)−F(K,L−1) for real-valued L. Highlighted point uses your integer L.`
    : `Increase L to at least 1 to define MPL.`;

  els.noteMPK.textContent = pMPK
    ? `The MPK curve is smooth because we evaluate F(K,L)−F(K−1,L) for real-valued K. Highlighted point uses your integer K.`
    : `Increase K to at least 1 to define MPK.`;

  setStatus("Axes start with a wide initial scale (K at max, A/L at initial), then expand if needed. They don’t shrink until Reset.");
}

function resetToBaseline() {
  // set sliders
  els.A_r.value = els.A_n.value = BASE.A;
  els.K_r.value = els.K_n.value = BASE.K;
  els.L_r.value = els.L_n.value = BASE.L;

  // initialize sticky ranges per your requested initial scale
  const initRanges = computeInitialRanges();
  stickySetInitial(initRanges);

  update();

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
