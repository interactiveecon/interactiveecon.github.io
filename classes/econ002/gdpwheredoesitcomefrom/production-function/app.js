/* Marginal Products Lab
   Y = A K^α L^(1-α)
   MPL = (1-α) A K^α L^(-α)
   MPK = α A K^(α-1) L^(1-α)
*/

const els = {
  presetBtn: document.getElementById("presetBtn"),
  status: document.getElementById("status"),

  A_r: document.getElementById("A_r"),
  A_n: document.getElementById("A_n"),
  alpha_r: document.getElementById("alpha_r"),
  alpha_n: document.getElementById("alpha_n"),
  K_r: document.getElementById("K_r"),
  K_n: document.getElementById("K_n"),
  L_r: document.getElementById("L_r"),
  L_n: document.getElementById("L_n"),

  Y_out: document.getElementById("Y_out"),
  kl_out: document.getElementById("kl_out"),
  mpl_out: document.getElementById("mpl_out"),
  mpk_out: document.getElementById("mpk_out"),

  mplChart: document.getElementById("mplChart"),
  mpkChart: document.getElementById("mpkChart"),
  mplHint: document.getElementById("mplHint"),
  mpkHint: document.getElementById("mpkHint")
};

let mplChart = null;
let mpkChart = null;

function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }

function fmt(x){
  if (!isFinite(x)) return "—";
  if (Math.abs(x) >= 1000) return x.toFixed(0);
  if (Math.abs(x) >= 100) return x.toFixed(1);
  if (Math.abs(x) >= 10) return x.toFixed(2);
  return x.toFixed(3);
}

function Y(A, K, L, a){ return A * Math.pow(K, a) * Math.pow(L, 1 - a); }
function MPL(A, K, L, a){ return (1 - a) * A * Math.pow(K, a) * Math.pow(L, -a); }
function MPK(A, K, L, a){ return a * A * Math.pow(K, a - 1) * Math.pow(L, 1 - a); }

function setStatus(msg){ els.status.textContent = msg; }

function bindPair(rangeEl, numberEl, onChange){
  function syncFrom(v){
    const vv = Number(v);
    rangeEl.value = vv;
    numberEl.value = vv;
    onChange();
  }
  rangeEl.addEventListener("input", () => syncFrom(rangeEl.value));
  numberEl.addEventListener("input", () => syncFrom(numberEl.value));
}

function getState(){
  return {
    A: Number(els.A_n.value),
    a: Number(els.alpha_n.value),
    K: Number(els.K_n.value),
    L: Number(els.L_n.value)
  };
}

function buildMPLSeries(A, a, K){
  const x = [];
  const y = [];
  for (let L = 1; L <= 200; L += 2){
    x.push(L);
    y.push(MPL(A, K, L, a));
  }
  return { x, y };
}

function buildMPKSeries(A, a, L){
  const x = [];
  const y = [];
  for (let K = 1; K <= 200; K += 2){
    x.push(K);
    y.push(MPK(A, K, L, a));
  }
  return { x, y };
}

function makeLineChart(canvas, labels, data, xLabel, yLabel){
  return new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{ label: yLabel, data }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, title: { display: true, text: xLabel } },
        y: { grid: { display: true }, title: { display: true, text: yLabel } }
      }
    }
  });
}

function update(){
  const s = getState();

  const y = Y(s.A, s.K, s.L, s.a);
  const mpl = MPL(s.A, s.K, s.L, s.a);
  const mpk = MPK(s.A, s.K, s.L, s.a);

  els.Y_out.textContent = fmt(y);
  els.kl_out.textContent = `K=${s.K}, L=${s.L}`;
  els.mpl_out.textContent = fmt(mpl);
  els.mpk_out.textContent = fmt(mpk);

  // MPL chart (vary L holding current K fixed)
  const mplSeries = buildMPLSeries(s.A, s.a, s.K);
  if (!mplChart){
    mplChart = makeLineChart(els.mplChart, mplSeries.x, mplSeries.y, "Labor (L)", "MPL");
  } else {
    mplChart.data.labels = mplSeries.x;
    mplChart.data.datasets[0].data = mplSeries.y;
    mplChart.update();
  }

  // MPK chart (vary K holding current L fixed)
  const mpkSeries = buildMPKSeries(s.A, s.a, s.L);
  if (!mpkChart){
    mpkChart = makeLineChart(els.mpkChart, mpkSeries.x, mpkSeries.y, "Capital (K)", "MPK");
  } else {
    mpkChart.data.labels = mpkSeries.x;
    mpkChart.data.datasets[0].data = mpkSeries.y;
    mpkChart.update();
  }

  // Diminishing MP text (simple check: MPL at L=10 vs L=150)
  const mplLow = MPL(s.A, s.K, 10, s.a);
  const mplHigh = MPL(s.A, s.K, 150, s.a);
  els.mplHint.textContent =
    `Holding K fixed at ${s.K}, MPL is ${fmt(mplLow)} at L=10 and ${fmt(mplHigh)} at L=150 (it falls as L rises).`;

  const mpkLow = MPK(s.A, 10, s.L, s.a);
  const mpkHigh = MPK(s.A, 150, s.L, s.a);
  els.mpkHint.textContent =
    `Holding L fixed at ${s.L}, MPK is ${fmt(mpkLow)} at K=10 and ${fmt(mpkHigh)} at K=150 (it falls as K rises).`;

  setStatus("Try increasing L (holding K fixed) and watch MPL fall. Then increase K (holding L fixed) and watch MPK fall.");
}

function newPreset(){
  const A = randInt(8, 24) / 10;  // 0.8–2.4
  const a = pickAlpha();
  const K = randInt(30, 170);
  const L = randInt(30, 170);

  els.A_r.value = els.A_n.value = A;
  els.alpha_r.value = els.alpha_n.value = a;
  els.K_r.value = els.K_n.value = K;
  els.L_r.value = els.L_n.value = L;

  update();
}

function pickAlpha(){
  const vals = [0.25, 0.30, 0.35, 0.40, 0.60];
  return vals[randInt(0, vals.length - 1)];
}

// bind sliders
bindPair(els.A_r, els.A_n, update);
bindPair(els.alpha_r, els.alpha_n, update);
bindPair(els.K_r, els.K_n, update);
bindPair(els.L_r, els.L_n, update);

els.presetBtn.addEventListener("click", newPreset);

// init
(function init(){
  els.A_r.value = els.A_n.value = 1.2;
  els.alpha_r.value = els.alpha_n.value = 0.35;
  els.K_r.value = els.K_n.value = 90;
  els.L_r.value = els.L_n.value = 80;
  update();
})();
