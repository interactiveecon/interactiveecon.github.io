(() => {
  const $ = (id) => document.getElementById(id);

  const els = {
    newBtn: $("newBtn"),
    resetBtn: $("resetBtn"),
    status: $("status"),

    eqBox: $("eqBox"),

    show1: $("show1"),
    show2: $("show2"),
    sol1: $("sol1"),
    sol2: $("sol2"),

    ans: $("ans"),
    checkBtn: $("checkBtn"),
    revealBtn: $("revealBtn"),
    resultTag: $("resultTag")
  };

  const DATA = window.SOLVER_DATA;
  if (!DATA) { els.status.textContent = "ERROR: data.js not loaded (SOLVER_DATA missing)."; return; }

  let p = null; // current parameters
  let YstarVal = null;

  function setStatus(msg){ els.status.textContent = msg; }
  function rndInt(a,b){ return Math.floor(a + Math.random()*(b-a+1)); }
  function rndStep(a,b,step){
    const n = Math.round((b-a)/step);
    return a + rndInt(0,n)*step;
  }
  function fmt2(x){ return Number.isFinite(x) ? x.toFixed(2) : "—"; }

  function genProblem(){
    const R = DATA.ranges;
    p = {
      C0: rndInt(R.C0[0], R.C0[1]),
      MPC: rndStep(R.MPC[0], R.MPC[1], 0.05),
      I0: rndInt(R.I0[0], R.I0[1]),
      b:  rndInt(R.b[0],  R.b[1]),
      r:  rndStep(R.r[0], R.r[1], 0.5),
      G:  rndInt(R.G[0],  R.G[1]),
      T:  rndInt(R.T[0],  R.T[1]),
    };

    // Compute equilibrium:
    // C = C0 + MPC(Y-T)
    // I = I0 - b r
    // PE = C + I + G = (C0 - MPC*T + I0 - b r + G) + MPC*Y
    // Y = PE => (1 - MPC)Y = (C0 - MPC*T + I0 - b r + G)
    const A = p.C0 - p.MPC*p.T + (p.I0 - p.b*p.r) + p.G;
    YstarVal = A / (1 - p.MPC);

    renderProblem();
    resetReveals();
    els.ans.value = "";
    els.resultTag.textContent = "";
    setStatus("New problem loaded.");
  }

  function renderProblem(){
    const Ival = p.I0 - p.b*p.r;
    els.eqBox.innerHTML = `
      <div class="eqline"><strong>Consumption:</strong> <code>C = C0 + MPC·(Y − T)</code></div>
      <div class="eqline">Values: <code>C0=${p.C0}</code>, <code>MPC=${fmt2(p.MPC)}</code>, <code>T=${p.T}</code></div>

      <div class="eqline" style="margin-top:10px;"><strong>Investment:</strong> <code>I = I0 − b·r</code></div>
      <div class="eqline">Values: <code>I0=${p.I0}</code>, <code>b=${p.b}</code>, <code>r=${fmt2(p.r)}</code> ⇒ <code>I=${fmt2(Ival)}</code></div>

      <div class="eqline" style="margin-top:10px;"><strong>Government purchases:</strong> <code>G=${p.G}</code></div>

      <div class="eqline" style="margin-top:10px;"><strong>Planned expenditure:</strong> <code>PE(Y) = C + I + G</code></div>
      <div class="eqline"><strong>Equilibrium condition:</strong> <code>Y = PE(Y)</code></div>
    `;
  }

  function resetReveals(){
    els.sol1.style.display = "none";
    els.sol2.style.display = "none";
    els.sol1.innerHTML = "";
    els.sol2.innerHTML = "";
    els.show1.textContent = "Show solution";
    els.show2.textContent = "Show solution";
  }

  function buildSol1(){
    const Ival = p.I0 - p.b*p.r;
    const A = p.C0 - p.MPC*p.T + Ival + p.G;

    els.sol1.innerHTML = `
      <div class="math">
Step 1a) Write each component using the given numbers:

C = ${p.C0} + ${fmt2(p.MPC)}·(Y − ${p.T})
  = ${p.C0} + ${fmt2(p.MPC)}·Y − ${fmt2(p.MPC*p.T)}

I = ${p.I0} − ${p.b}·${fmt2(p.r)}
  = ${p.I0} − ${fmt2(p.b*p.r)}
  = ${fmt2(Ival)}

G = ${p.G}

Step 1b) Add them to get planned expenditure:

PE(Y) = C + I + G
      = (${p.C0} + ${fmt2(p.MPC)}·Y − ${fmt2(p.MPC*p.T)}) + (${fmt2(Ival)}) + (${p.G})
      = [${p.C0} − ${fmt2(p.MPC*p.T)} + ${fmt2(Ival)} + ${p.G}] + ${fmt2(p.MPC)}·Y
      = ${fmt2(A)} + ${fmt2(p.MPC)}·Y
      </div>
    `;
  }

  function buildSol2(){
    const Ival = p.I0 - p.b*p.r;
    const A = p.C0 - p.MPC*p.T + Ival + p.G;

    els.sol2.innerHTML = `
      <div class="math">
Step 2a) Use equilibrium condition Y = PE(Y):

Y = ${fmt2(A)} + ${fmt2(p.MPC)}·Y

Step 2b) Move the ${fmt2(p.MPC)}·Y term to the left:

Y − ${fmt2(p.MPC)}·Y = ${fmt2(A)}

(1 − ${fmt2(p.MPC)})·Y = ${fmt2(A)}

Step 2c) Divide both sides by (1 − MPC):

Y* = ${fmt2(A)} / (1 − ${fmt2(p.MPC)})
   = ${fmt2(A)} / ${fmt2(1 - p.MPC)}
   = ${fmt2(YstarVal)}
      </div>
    `;
  }

  function toggleSol(which){
    if (which === 1){
      const open = els.sol1.style.display === "block";
      if (open){
        els.sol1.style.display = "none";
        els.show1.textContent = "Show solution";
      } else {
        if (!els.sol1.innerHTML) buildSol1();
        els.sol1.style.display = "block";
        els.show1.textContent = "Hide solution";
      }
    } else {
      const open = els.sol2.style.display === "block";
      if (open){
        els.sol2.style.display = "none";
        els.show2.textContent = "Show solution";
      } else {
        if (!els.sol2.innerHTML) buildSol2();
        els.sol2.style.display = "block";
        els.show2.textContent = "Hide solution";
      }
    }
  }

  function checkAnswer(){
    const raw = (els.ans.value || "").trim();
    const val = Number(raw);
    if (!Number.isFinite(val)){
      els.resultTag.innerHTML = `<span class="tagBad">Enter a number</span>`;
      return;
    }
    const tol = 0.5; // allow small rounding differences
    const ok = Math.abs(val - YstarVal) <= tol;

    els.resultTag.innerHTML = ok
      ? `<span class="tagOK">Correct</span>`
      : `<span class="tagBad">Not quite</span>`;
  }

  function revealAnswer(){
    els.resultTag.innerHTML = `<span class="tagOK">Y* = ${fmt2(YstarVal)}</span>`;
  }

  // Events
  els.newBtn.addEventListener("click", genProblem);
  els.resetBtn.addEventListener("click", resetReveals);

  els.show1.addEventListener("click", () => toggleSol(1));
  els.show2.addEventListener("click", () => toggleSol(2));

  els.checkBtn.addEventListener("click", checkAnswer);
  els.revealBtn.addEventListener("click", revealAnswer);

  // init
  genProblem();
})();
