// Optimal K and L lab
// Production function: Y = A * K^α * L^β, with α+β<1 for a unique interior optimum.
// Profit: π = P*Y - W*L - R*K. Equivalent real profit: Y - (W/P)L - (R/P)K.
// FOCs: MPL = W/P, MPK = R/P.

const alpha = 0.35;
const beta  = 0.55; // alpha+beta = 0.90 < 1 (decreasing returns => finite optimum)

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
  applyShockBtn: document.getElementById("applyShockBtn"),
  resetBaselineBtn: document.getElementById("resetBaselineBtn"),
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

// Solve FOCs analytically for Cobb–Douglas with decreasing returns
// Using ratio: K/L = (α/β)*(w/r) where w=W/P and r=R/P (P cancels => w/r = W/R)
function solveOptimal(A, W, R, P){
  const w = W / P;
  const r = R / P;

  // m = K/L
  const m = (alpha / beta) * (w / r); // = (alpha/beta)*(W/R)

  // MPL condition: beta*A*(mL)^alpha * L^(beta-1) = w
  // => beta*A*m^alpha * L^(alpha+beta-1) = w
  const expo = (alpha + beta - 1); // negative
  const denom = beta * A * Math.pow(m, alpha);
  const rhs = w / denom;

  // L = rhs^(1/expo)
  const Lstar = Math.pow(rhs, 1 / expo);
  const Kstar = m * Lstar;

  return { w, r, Lstar, Kstar };
}

// Charts
let chLabor = null;
let chCapital = null;

function makeChart(canvas, xLabel, yLabel){
  return new Chart(canvas, {
    type: "line",
    data: {
      datasets: [
        { label: "Marginal product", data: [], borderWidth: 3, pointRadius: 0 },
        { label: "Real price", data: [], borderWidth: 3, pointRadius: 0, borderDash: [6,6] },
        { label: "Marker", data: [], showLine: false, pointRadius: 5 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { type:"linear", grid:{display:false}, title:{display:true,text:xLabel} },
        y: {
          grid:{display:true},
          title:{display:true,text:yLabel},
          ticks:{ callback:(v)=>Number(v).toFixed(2) }
        }
      }
    }
  });
}

function linspace(min, max, n){
  const out = [];
  const step = (max - min) / (n - 1);
  for (let i=0;i<n;i++) out.push(min + i*step);
  return out;
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

// Baseline + shock for MCQ
let baseline = null;
let shock = null;
let currentQ = null;
let selectedChoice = null;

function update(){
  const s = getState();
  const sol = solveOptimal(s.A, s.W, s.R, s.P);

  // Metrics
  els.m_wp.textContent = fmt2(sol.w);
  els.m_rp.textContent = fmt2(sol.r);
  els.m_L.textContent  = fmt2(sol.Lstar);
  els.m_K.textContent  = fmt2(sol.Kstar);

  // Charts init
  if (!chLabor){
    chLabor = makeChart(els.chartLabor, "Labor (L)", "MPL / W/P");
    chCapital = makeChart(els.chartCapital, "Capital (K)", "MPK / R/P");
  }

  // Build MPL curve holding K at K* (to visualize the labor condition)
  const Kfix = sol.Kstar;
  const Lgrid = linspace(0.1, Math.max(0.5, sol.Lstar*2.2), 200);
  const mplCurve = Lgrid.map(L => ({ x: L, y: MPL(s.A, Kfix, L) }));
  const wLine = [
    { x: Lgrid[0], y: sol.w },
    { x: Lgrid[Lgrid.length-1], y: sol.w }
  ];

  // MPK curve holding L at L*
  const Lfix = sol.Lstar;
  const Kgrid = linspace(0.1, Math.max(0.5, sol.Kstar*2.2), 200);
  const mpkCurve = Kgrid.map(K => ({ x: K, y: MPK(s.A, K, Lfix) }));
  const rLine = [
    { x: Kgrid[0], y: sol.r },
    { x: Kgrid[Kgrid.length-1], y: sol.r }
  ];

  // Update labor chart
  chLabor.data.datasets[0].data = mplCurve;
  chLabor.data.datasets[1].data = wLine;
  chLabor.data.datasets[2].data = [{ x: sol.Lstar, y: sol.w }];

  // Dynamic y-range that includes both curves
  const mplYs = mplCurve.map(p=>p.y).filter(v=>isFinite(v));
  const yMinL = Math.max(0, Math.min(...mplYs, sol.w) * 0.85);
  const yMaxL = Math.max(...mplYs, sol.w) * 1.15;
  chLabor.options.scales.y.min = yMinL;
  chLabor.options.scales.y.max = yMaxL;
  chLabor.options.scales.x.min = 0;
  chLabor.options.scales.x.max = Lgrid[Lgrid.length-1];
  chLabor.update();

  els.noteLabor.textContent =
    `At K*= ${fmt2(sol.Kstar)}, the firm chooses L* so MPL = W/P. Here, W/P = ${fmt2(sol.w)} and L* = ${fmt2(sol.Lstar)}.`;

  // Update capital chart
  chCapital.data.datasets[0].data = mpkCurve;
  chCapital.data.datasets[1].data = rLine;
  chCapital.data.datasets[2].data = [{ x: sol.Kstar, y: sol.r }];

  const mpkYs = mpkCurve.map(p=>p.y).filter(v=>isFinite(v));
  const yMinK = Math.max(0, Math.min(...mpkYs, sol.r) * 0.85);
  const yMaxK = Math.max(...mpkYs, sol.r) * 1.15;
  chCapital.options.scales.y.min = yMinK;
  chCapital.options.scales.y.max = yMaxK;
  chCapital.options.scales.x.min = 0;
  chCapital.options.scales.x.max = Kgrid[Kgrid.length-1];
  chCapital.update();

  els.noteCapital.textContent =
    `At L*= ${fmt2(sol.Lstar)}, the firm chooses K* so MPK = R/P. Here, R/P = ${fmt2(sol.r)} and K* = ${fmt2(sol.Kstar)}.`;

  // Status
  els.status.textContent = currentQ
    ? `Baseline stored. Use “Apply Shock” or sliders to match the scenario, then answer.`
    : `Move A, P, W, R to see how real prices and optimal K*, L* change.`;
}

// ---- MCQ logic ----

const SHOCKS = [
  { var: "P", label: "P increases", dir: +1 },
  { var: "P", label: "P decreases", dir: -1 },
  { var: "A", label: "A increases", dir: +1 },
  { var: "A", label: "A decreases", dir: -1 },
  { var: "W", label: "W increases", dir: +1 },
  { var: "W", label: "W decreases", dir: -1 },
  { var: "R", label: "R increases", dir: +1 },
  { var: "R", label: "R decreases", dir: -1 },
];

function signDiff(newVal, oldVal){
  const eps = 1e-9;
  if (newVal > oldVal + eps) return "up";
  if (newVal < oldVal - eps) return "down";
  return "same";
}

function makeQuestion(){
  // baseline from current sliders
  baseline = getState();

  // choose a shock
  const sh = SHOCKS[Math.floor(Math.random()*SHOCKS.length)];
  const shocked = { ...baseline };

  // apply a discrete change
  const step = (sh.var === "P") ? 2 : 1; // make P shocks more visible
  shocked[sh.var] = Math.max(
    (sh.var==="P")?1:1,
    Math.min(
      (sh.var==="P")?10:(sh.var==="A"?5:20),
      baseline[sh.var] + sh.dir*step
    )
  );

  shock = shocked;
  currentQ = sh;

  // compute correct direction by comparing optima baseline vs shocked
  const sol0 = solveOptimal(baseline.A, baseline.W, baseline.R, baseline.P);
  const sol1 = solveOptimal(shock.A, shock.W, shock.R, shock.P);

  const dL = signDiff(sol1.Lstar, sol0.Lstar);
  const dK = signDiff(sol1.Kstar, sol0.Kstar);

  const correct = (
    dL==="up" && dK==="up" ? "A" :
    dL==="down" && dK==="down" ? "B" :
    dL==="up" && dK==="down" ? "C" :
    dL==="down" && dK==="up" ? "D" : "E"
  );

  // build question text
  els.qText.innerHTML =
    `<strong>Scenario:</strong> Starting from the baseline shown on the sliders, suppose <strong>${sh.label}</strong> while the other variables stay fixed.
     What happens to the firm’s <strong>optimal</strong> choices of <strong>labor (L*)</strong> and <strong>capital (K*)</strong>?`;

  // choices
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
    div.innerHTML = `
      <input type="radio" name="mcq" value="${c.key}">
      <div><strong>${c.key}.</strong> ${c.text}</div>
    `;
    div.addEventListener("click", () => {
      selectedChoice = c.key;
    });
    els.choices.appendChild(div);
  }

  // store correct + explanation ingredients
  currentQ.correct = correct;
  currentQ.dL = dL;
  currentQ.dK = dK;

  els.feedback.innerHTML =
    `<strong>Baseline stored.</strong><br>
     Click <strong>Apply Shock</strong> to jump to the scenario (or move the slider yourself), then answer.`;
  update();
}

function applyShock(){
  if (!shock){
    els.status.textContent = "Click “New Question” first.";
    return;
  }
  setState(shock);
}

function resetBaseline(){
  if (!baseline){
    els.status.textContent = "No baseline yet. Click “New Question” first.";
    return;
  }
  setState(baseline);
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

  const correct = currentQ.correct;
  const ok = (selectedChoice === correct);

  // Explanation (brief, variable-based)
  const sh = currentQ;
  const base = baseline;
  const shoc = shock;

  const sol0 = solveOptimal(base.A, base.W, base.R, base.P);
  const sol1 = solveOptimal(shoc.A, shoc.W, shoc.R, shoc.P);

  const w0 = sol0.w, r0 = sol0.r;
  const w1 = sol1.w, r1 = sol1.r;

  // short explanation templates
  let expl = "";
  if (sh.var === "A") {
    expl = `Higher productivity raises marginal products. To restore $begin:math:text$MPL\=W\/P$end:math:text$ and $begin:math:text$MPK\=R\/P$end:math:text$, the firm uses more inputs.`;
  } else if (sh.var === "P") {
    expl = `With W and R fixed, a higher P lowers both $begin:math:text$W\/P$end:math:text$ and $begin:math:text$R\/P$end:math:text$. Lower real input costs push the firm to use more inputs.`;
  } else if (sh.var === "W") {
    expl = `With P fixed, a higher W raises $begin:math:text$W\/P$end:math:text$. Labor becomes more expensive in real terms, so the firm reduces labor. With diminishing returns, optimal scale falls and K* also falls.`;
  } else if (sh.var === "R") {
    expl = `With P fixed, a higher R raises $begin:math:text$R\/P$end:math:text$. Capital becomes more expensive in real terms, so the firm reduces capital. With diminishing returns, optimal scale falls and L* also falls.`;
  }

  els.feedback.innerHTML =
    (ok ? `<strong>Correct.</strong>` : `<strong>Not quite.</strong> The correct answer is <strong>${correct}</strong>.`) +
    `<br><br>
     <strong>What changed:</strong> ${sh.label}.<br>
     <strong>Real wage:</strong> ${w0.toFixed(2)} → ${w1.toFixed(2)}. &nbsp;
     <strong>Real rental:</strong> ${r0.toFixed(2)} → ${r1.toFixed(2)}.<br><br>
     ${expl}<br>
     <strong>Result:</strong> L* goes <strong>${sh.dL}</strong>, K* goes <strong>${sh.dK}</strong>.`;
}

// Bind UI
bindPair(els.A_r, els.A_n, update);
bindPair(els.P_r, els.P_n, update);
bindPair(els.W_r, els.W_n, update);
bindPair(els.R_r, els.R_n, update);

els.newQBtn.addEventListener("click", makeQuestion);
els.applyShockBtn.addEventListener("click", applyShock);
els.resetBaselineBtn.addEventListener("click", resetBaseline);
els.submitBtn.addEventListener("click", submit);

// Initialize
(function init(){
  setState({ A: 2, P: 5, W: 10, R: 10 });
})();
