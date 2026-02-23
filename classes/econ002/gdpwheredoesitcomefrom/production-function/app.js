/* Production Function Lab (static JS)
   Model: Y = A K^α L^(1-α)
   MPL = (1-α) A K^α L^(-α)
   MPK = α A K^(α-1) L^(1-α)
*/

const els = {
  mode: document.getElementById("mode"),
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
  w_r: document.getElementById("w_r"),
  w_n: document.getElementById("w_n"),

  pricesBlock: document.getElementById("pricesBlock"),

  Y_out: document.getElementById("Y_out"),
  crs_out: document.getElementById("crs_out"),
  mpl_out: document.getElementById("mpl_out"),
  mpk_out: document.getElementById("mpk_out"),
  chartHint: document.getElementById("chartHint"),
  hireText: document.getElementById("hireText"),

  mplChart: document.getElementById("mplChart")
};

let chart = null;

function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

function fmt(x){
  if (!isFinite(x)) return "—";
  // compact, readable
  if (Math.abs(x) >= 1000) return x.toFixed(0);
  if (Math.abs(x) >= 100) return x.toFixed(1);
  if (Math.abs(x) >= 10) return x.toFixed(2);
  return x.toFixed(3);
}

function Y(A, K, L, alpha){
  return A * Math.pow(K, alpha) * Math.pow(L, 1 - alpha);
}

function MPL(A, K, L, alpha){
  return (1 - alpha) * A * Math.pow(K, alpha) * Math.pow(L, -alpha);
}

function MPK(A, K, L, alpha){
  return alpha * A * Math.pow(K, alpha - 1) * Math.pow(L, 1 - alpha);
}

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
    mode: els.mode.value,
    A: Number(els.A_n.value),
    alpha: Number(els.alpha_n.value),
    K: Number(els.K_n.value),
    L: Number(els.L_n.value),
    w: Number(els.w_n.value)
  };
}

// Solve w = MPL(K,L) for L, given A, K, alpha.
// MPL = (1-α) A K^α L^(-α)
// => L^α = ( (1-α) A K^α ) / w
// => L = [ ((1-α) A K^α)/w ]^(1/α)
function solveLstar(A, K, alpha, w){
  const num = (1 - alpha) * A * Math.pow(K, alpha);
  const ratio = num / w;
  if (ratio <= 0) return NaN;
  return Math.pow(ratio, 1 / alpha);
}

function updateVisibility(mode){
  els.pricesBlock.style.display = (mode === "hire") ? "block" : "none";
}

function updateChart(A, K, alpha, w){
  // Plot MPL(L) for L from 1..200 holding K fixed
  const Lvals = [];
  const mplVals = [];
  for (let L = 1; L <= 200; L += 2) {
    Lvals.push(L);
    mplVals.push(MPL(A, K, L, alpha));
  }

  if (!chart) {
    chart = new Chart(els.mplChart, {
      type: "line",
      data: {
        labels: Lvals,
        datasets: [
          { label: "MPL (holding K fixed)", data: mplVals }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: true } },
        scales: {
          x: { grid: { display: false }, title: { display: true, text: "Labor (L)" } },
          y: { grid: { display: true }, title: { display: true, text: "MPL" } }
        }
      }
    });
  } else {
    chart.data.labels = Lvals;
    chart.data.datasets[0].data = mplVals;
    chart.update();
  }

  // If in hiring mode, show horizontal wage line via annotation-like dataset
  // (Simpler: we’ll just update the hint text rather than draw a second line.)
}

function update(){
  const s = getState();
  updateVisibility(s.mode);

  // Core values
  const y = Y(s.A, s.K, s.L, s.alpha);
  const mpl = MPL(s.A, s.K, s.L, s.alpha);
  const mpk = MPK(s.A, s.K, s.L, s.alpha);

  els.Y_out.textContent = fmt(y);
  els.mpl_out.textContent = fmt(mpl);
  els.mpk_out.textContent = fmt(mpk);

  // CRS test using a random-ish t (fixed for stability)
  const t = 1.8;
  const lhs = Y(s.A, t*s.K, t*s.L, s.alpha);
  const rhs = t * Y(s.A, s.K, s.L, s.alpha);
  const ratio = rhs === 0 ? NaN : lhs / rhs;
  els.crs_out.textContent = isFinite(ratio) ? ratio.toFixed(3) : "—";

  // Update chart
  updateChart(s.A, s.K, s.alpha, s.w);

  // Mode-specific guidance
  if (s.mode === "crs") {
    els.chartHint.textContent =
      "CRS means if you scale both inputs by t, output scales by t. The CRS ratio should be ~1.000 for a CRS function.";
    els.hireText.innerHTML =
      "Try changing \\(K\\) and \\(L\\), then notice the CRS test stays near 1. This is constant returns to scale.";
    setStatus("CRS mode: scale inputs and watch output scale proportionally.");
  } else if (s.mode === "mp") {
    els.chartHint.textContent =
      "The curve shows MPL as L increases (holding K fixed). Diminishing marginal product means MPL falls as L rises.";
    els.hireText.innerHTML =
      "Interpretation: MPL is the extra output from one more unit of labor holding capital fixed.";
    setStatus("Marginal products mode: change K and L and interpret MPL/MPK.");
  } else {
    // hire mode
    const Lstar = solveLstar(s.A, s.K, s.alpha, s.w);
    const LstarClamped = clamp(Lstar, 1, 200);
    const mplAtStar = MPL(s.A, s.K, LstarClamped, s.alpha);

    els.hireText.innerHTML =
      `Given \$begin:math:text$K\\$end:math:text$ fixed at <strong>${s.K}</strong> and \$begin:math:text$w\/p\\$end:math:text$=<strong>${fmt(s.w)}</strong>, the short-run optimal choice solves \$begin:math:text$w\/p \= MPL\\$end:math:text$.<br>` +
      `Computed \$begin:math:text$L\^\*\\$end:math:text$ ≈ <strong>${fmt(Lstar)}</strong> (clamped to the slider range: <strong>${fmt(LstarClamped)}</strong>).<br>` +
      `At that \$begin:math:text$L\\$end:math:text$, MPL ≈ <strong>${fmt(mplAtStar)}</strong>.`;

    setStatus("Hiring mode: adjust w/p and K, and see the implied L* from w/p = MPL.");
    // Typeset MathJax updates (safe)
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise();
    }
  }
}

function newPreset(){
  // plausible random values
  const A = (randInt(8, 24) / 10);         // 0.8–2.4
  const alpha = [0.25, 0.30, 0.35, 0.40, 0.60][randInt(0,4)];
  const K = randInt(30, 160);
  const L = randInt(30, 160);
  const w = (randInt(10, 250) / 10);       // 1.0–25.0

  els.A_r.value = els.A_n.value = A;
  els.alpha_r.value = els.alpha_n.value = alpha;
  els.K_r.value = els.K_n.value = K;
  els.L_r.value = els.L_n.value = L;
  els.w_r.value = els.w_n.value = w;

  update();
}

function randInt(min, max){
  return Math.floor(Math.random()*(max-min+1))+min;
}

// Bind controls
bindPair(els.A_r, els.A_n, update);
bindPair(els.alpha_r, els.alpha_n, update);
bindPair(els.K_r, els.K_n, update);
bindPair(els.L_r, els.L_n, update);
bindPair(els.w_r, els.w_n, update);

els.mode.addEventListener("change", update);
els.presetBtn.addEventListener("click", newPreset);

// Initialize defaults
(function init(){
  els.A_r.value = els.A_n.value = 1.2;
  els.alpha_r.value = els.alpha_n.value = 0.35;
  els.K_r.value = els.K_n.value = 90;
  els.L_r.value = els.L_n.value = 80;
  els.w_r.value = els.w_n.value = 6.0;
  updateVisibility(els.mode.value);
  update();
})();
