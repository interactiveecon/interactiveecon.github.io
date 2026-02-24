/* Discrete marginal products, graph-first.
   Stylized concave production function for clarity:
     Y = A * sqrt(K) * sqrt(L)
   Discrete MPs:
     MPL(L) = Y(K, L+1) - Y(K, L)
     MPK(K) = Y(K+1, L) - Y(K, L)

   Baseline curves are fixed and always shown in grey.
   Reset returns sliders to baseline.
   Axes are fixed and curves start at 0.
*/

const K_MIN = 0, K_MAX = 10;
const L_MIN = 0, L_MAX = 10;
const A_MIN = 1, A_MAX = 5;

function Y(A, K, L) {
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
const Y_MAX = Y(A_MAX, K_MAX, L_MAX); // = 5*sqrt(10)*sqrt(10)=50
const MP_MAX = Y(A_MAX, 10, 10) - Y(A_MAX, 10, 9); // conservative
const Y_AXIS_MAX = Math.ceil(Y_MAX / 5) * 5;        // nice round
const MP_AXIS_MAX = Math.ceil((Math.max(MP_MAX, 10)) / 2) * 2; // nice round

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

function makeChart(canvas, xLabel, yLabel, yMin, yMax) {
  return new Chart(canvas, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        // [0] baseline curve (grey)
        { label: "Baseline", data: [], borderWidth: 2, pointRadius: 0 },
        // [1] current curve
        { label: "Current", data: [], borderWidth: 3, pointRadius: 0 },
        // [2] Δ segment (between two points)
        { label: "Δ", data: [], borderWidth: 3, pointRadius: 0 },
        // [3] points (two points on output charts, one point on MP charts)
        { label: "Points", data: [], showLine: false, pointRadius: 5 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, title: { display: true, text: xLabel }, min: 0, max: 10 },
        y: { min: yMin, max: yMax, grid: { display: true }, title: { display: true, text: yLabel } }
      }
    }
  });
}

function styleDatasets(ch) {
  // Baseline = grey
  ch.data.datasets[0].borderColor = "rgba(0,0,0,0.25)";
  ch.data.datasets[0].borderDash = [6, 6];

  // Current = default solid
  ch.data.datasets[1].borderDash = [];

  // Δ = dotted-ish
  ch.data.datasets[2].borderDash = [2, 4];

  // Points
  ch.data.datasets[3].pointHoverRadius = 6;
}

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
    if (L >= L_MAX) {
      xs.push(L);
      ys.push(null); // undefined at upper bound for +1
    } else {
      xs.push(L);
      ys.push(Y(A, K, L + 1) - Y(A, K, L));
    }
  }
  return { xs, ys };
}

function seriesMPK(A, L) {
  const xs = [];
  const ys = [];
  for (let K = K_MIN; K <= K_MAX; K++) {
    if (K >= K_MAX) {
      xs.push(K);
      ys.push(null);
    } else {
      xs.push(K);
      ys.push(Y(A, K + 1, L) - Y(A, K, L));
    }
  }
  return { xs, ys };
}

function pointsArray(xs, pts) {
  const arr = Array(xs.length).fill(null);
  for (const p of pts) {
    const idx = xs.indexOf(p.x);
    if (idx >= 0) arr[idx] = p.y;
  }
  return arr;
}

function segmentArray(xs, a, b) {
  const arr = Array(xs.length).fill(null);
  const ia = xs.indexOf(a.x);
  const ib = xs.indexOf(b.x);
  if (ia >= 0) arr[ia] = a.y;
  if (ib >= 0) arr[ib] = b.y;
  return arr;
}

function updateCharts() {
  const s = state();

  // Baseline series (fixed forever)
  const baseYL = seriesYvsL(BASE.A, BASE.K);
  const baseYK = seriesYvsK(BASE.A, BASE.L);
  const baseMPL = seriesMPL(BASE.A, BASE.K);
  const baseMPK = seriesMPK(BASE.A, BASE.L);

  // Current series
  const curYL = seriesYvsL(s.A, s.K);
  const curYK = seriesYvsK(s.A, s.L);
  const curMPL = seriesMPL(s.A, s.K);
  const curMPK = seriesMPK(s.A, s.L);

  // Current points
  const K = s.K, L = s.L, A = s.A;
  const y0 = Y(A, K, L);

  const L1 = (L < 10) ? (L + 1) : null;
  const K1 = (K < 10) ? (K + 1) : null;

  const yL1 = (L1 !== null) ? Y(A, K, L1) : null;
  const yK1 = (K1 !== null) ? Y(A, K1, L) : null;

  const dY_L = (L1 !== null) ? (yL1 - y0) : null;
  const dY_K = (K1 !== null) ? (yK1 - y0) : null;

  // Create charts if needed
  if (!chYL) {
    chYL = makeChart(els.chartYL, "Labor (L)", "Output (Y)", 0, Y_AXIS_MAX);
    chYK = makeChart(els.chartYK, "Capital (K)", "Output (Y)", 0, Y_AXIS_MAX);
    chMPL = makeChart(els.chartMPL, "Labor (L)", "MPL (ΔY from +1 L)", 0, MP_AXIS_MAX);
    chMPK = makeChart(els.chartMPK, "Capital (K)", "MPK (ΔY from +1 K)", 0, MP_AXIS_MAX);
    [chYL, chYK, chMPL, chMPK].forEach(styleDatasets);
  }

  // Helper to set datasets
  function setLine(ch, xs, baseY, curY) {
    ch.data.labels = xs;
    ch.data.datasets[0].data = baseY;
    ch.data.datasets[1].data = curY;
  }

  // Output vs L
  setLine(chYL, curYL.xs, baseYL.ys, curYL.ys);
  chYL.data.datasets[2].data = (L1 !== null)
    ? segmentArray(curYL.xs, { x: L, y: y0 }, { x: L1, y: yL1 })
    : Array(curYL.xs.length).fill(null);
  chYL.data.datasets[3].data = (L1 !== null)
    ? pointsArray(curYL.xs, [{ x: L, y: y0 }, { x: L1, y: yL1 }])
    : pointsArray(curYL.xs, [{ x: L, y: y0 }]);
  chYL.update();

  // Output vs K
  setLine(chYK, curYK.xs, baseYK.ys, curYK.ys);
  chYK.data.datasets[2].data = (K1 !== null)
    ? segmentArray(curYK.xs, { x: K, y: y0 }, { x: K1, y: yK1 })
    : Array(curYK.xs.length).fill(null);
  chYK.data.datasets[3].data = (K1 !== null)
    ? pointsArray(curYK.xs, [{ x: K, y: y0 }, { x: K1, y: yK1 }])
    : pointsArray(curYK.xs, [{ x: K, y: y0 }]);
  chYK.update();

  // MPL
  setLine(chMPL, curMPL.xs, baseMPL.ys, curMPL.ys);
  chMPL.data.datasets[2].data = Array(curMPL.xs.length).fill(null);
  chMPL.data.datasets[3].data = (dY_L !== null) ? pointsArray(curMPL.xs, [{ x: L, y: dY_L }]) : Array(curMPL.xs.length).fill(null);
  chMPL.update();

  // MPK
  setLine(chMPK, curMPK.xs, baseMPK.ys, curMPK.ys);
  chMPK.data.datasets[2].data = Array(curMPK.xs.length).fill(null);
  chMPK.data.datasets[3].data = (dY_K !== null) ? pointsArray(curMPK.xs, [{ x: K, y: dY_K }]) : Array(curMPK.xs.length).fill(null);
  chMPK.update();

  // Notes
  els.noteYL.textContent = (L1 !== null)
    ? `At K=${K}: Y at L=${L} is ${fmt(y0)} and at L=${L1} is ${fmt(yL1)} → ΔY=${fmt(dY_L)} (this equals MPL at L=${L}).`
    : `At K=${K}: L is at the upper bound (10), so “+1” is not available here. Reduce L to see ΔY and MPL.`;

  els.noteYK.textContent = (K1 !== null)
    ? `At L=${L}: Y at K=${K} is ${fmt(y0)} and at K=${K1} is ${fmt(yK1)} → ΔY=${fmt(dY_K)} (this equals MPK at K=${K}).`
    : `At L=${L}: K is at the upper bound (10), so “+1” is not available here. Reduce K to see ΔY and MPK.`;

  els.noteMPL.textContent = (dY_L !== null)
    ? `MPL at L=${L} equals ${fmt(dY_L)} (matches the ΔY shown in the Output vs Labor graph).`
    : `MPL at L=10 is not defined using “+1”.`;

  els.noteMPK.textContent = (dY_K !== null)
    ? `MPK at K=${K} equals ${fmt(dY_K)} (matches the ΔY shown in the Output vs Capital graph).`
    : `MPK at K=10 is not defined using “+1”.`;

  setStatus("Baseline curves are fixed in grey. Move L or K to see diminishing marginal product as the ΔY gaps shrink.");
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
