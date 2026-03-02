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
    resultTag: $("resultTag"),

    // multiplier section
    newMultBtn: $("newMultBtn"),
    multPrompt: $("multPrompt"),
    multFeedback: $("multFeedback"),

    // pools
    pool1: $("pool1"),
    pool2: $("pool2"),
    pool3: $("pool3"),

    // checks/clears
    checkM1: $("checkM1"),
    clearM1: $("clearM1"),
    checkM2: $("checkM2"),
    clearM2: $("clearM2"),
    checkM3: $("checkM3"),
    clearM3: $("clearM3"),
  };

  const DATA = window.SOLVER_DATA;
  if (!DATA) { els.status.textContent = "ERROR: data.js not loaded (SOLVER_DATA missing)."; return; }

  let p = null; // current parameters
  let YstarVal = null;

  // Multiplier scenario state
  let multScenario = null;
  // { type:"G"|"T"|"I", shockName, dShock, multType:"GI"|"TAX", multVal, dY }

  function setStatus(msg){ els.status.textContent = msg; }
  function rndInt(a,b){ return Math.floor(a + Math.random()*(b-a+1)); }
  function rndStep(a,b,step){
    const n = Math.round((b-a)/step);
    return a + rndInt(0,n)*step;
  }
  function fmt2(x){ return Number.isFinite(x) ? x.toFixed(2) : "—"; }

  // -------------------- Problem generation --------------------
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

    const Ival = p.I0 - p.b*p.r;
    const A = p.C0 - p.MPC*p.T + Ival + p.G;
    YstarVal = A / (1 - p.MPC);

    renderProblem();
    resetReveals();

    els.ans.value = "";
    els.resultTag.textContent = "";
    setStatus("New problem loaded.");

    resetMultiplierUI();
  }

  function renderProblem(){
    els.eqBox.innerHTML = `
      <div class="eqline"><strong>Consumption:</strong> <code>C = ${p.C0} + ${fmt2(p.MPC)}·(Y − T)</code></div>

      <div class="eqline" style="margin-top:10px;"><strong>Investment:</strong> <code>I = ${p.I0} − ${p.b}·r</code></div>

      <div class="eqline" style="margin-top:10px;"><strong>Government purchases:</strong> <code>G = ${p.G}</code></div>
      <div class="eqline"><strong>Taxes:</strong> <code>T = ${p.T}</code></div>
      <div class="eqline"><strong>Interest rate:</strong> <code>r = ${fmt2(p.r)}</code></div>

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
      <ol>
        <li><strong>Start with the definitions (plug in the given numbers):</strong>
          <div class="math">
C = ${p.C0} + ${fmt2(p.MPC)}·(Y − ${p.T})

I = ${p.I0} − ${p.b}·${fmt2(p.r)}

G = ${p.G}
          </div>
        </li>

        <li><strong>Simplify investment using the given r:</strong>
          <div class="math">
I = ${p.I0} − ${fmt2(p.b*p.r)}
I = ${fmt2(Ival)}
          </div>
        </li>

        <li><strong>Write planned expenditure:</strong>
          <div class="math">
PE(Y) = C + I + G
PE(Y) = [${p.C0} + ${fmt2(p.MPC)}·(Y − ${p.T})] + (${fmt2(Ival)}) + (${p.G})
          </div>
        </li>

        <li><strong>Collect the constant term and the Y term:</strong>
          <div class="math">
PE(Y) = (${p.C0} − ${fmt2(p.MPC*p.T)} + ${fmt2(Ival)} + ${p.G}) + ${fmt2(p.MPC)}·Y
PE(Y) = ${fmt2(A)} + ${fmt2(p.MPC)}·Y
          </div>
        </li>
      </ol>
    `;
  }

  function buildSol2(){
    const Ival = p.I0 - p.b*p.r;
    const A = p.C0 - p.MPC*p.T + Ival + p.G;

    els.sol2.innerHTML = `
      <ol>
        <li><strong>Use equilibrium condition:</strong>
          <div class="math">
Y = PE(Y)
Y = ${fmt2(A)} + ${fmt2(p.MPC)}·Y
          </div>
        </li>

        <li><strong>Move the Y term to the left:</strong>
          <div class="math">
Y − ${fmt2(p.MPC)}·Y = ${fmt2(A)}
(1 − ${fmt2(p.MPC)})·Y = ${fmt2(A)}
          </div>
        </li>

        <li><strong>Solve for Y* by dividing:</strong>
          <div class="math">
Y* = ${fmt2(A)} / (1 − ${fmt2(p.MPC)})
Y* = ${fmt2(A)} / ${fmt2(1 - p.MPC)}
Y* = ${fmt2(YstarVal)}
          </div>
        </li>
      </ol>
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
    const tol = 0.5;
    const ok = Math.abs(val - YstarVal) <= tol;
    els.resultTag.innerHTML = ok ? `<span class="tagOK">Correct</span>` : `<span class="tagBad">Not quite</span>`;
  }

  function revealAnswer(){
    els.resultTag.innerHTML = `<span class="tagOK">Y* = ${fmt2(YstarVal)}</span>`;
  }

  // -------------------- Multiplier Practice (3-step with separate pools) --------------------
  function mkCard(text, payload){
    const el = document.createElement("div");
    el.className = "mcard";
    el.textContent = text;
    el.draggable = true;
    el.dataset.payload = JSON.stringify(payload);
    el.addEventListener("dragstart", (ev) => {
      ev.dataTransfer.setData("application/json", el.dataset.payload);
      ev.dataTransfer.effectAllowed = "move";
    });
    return el;
  }

  function setMultFeedback(html){
    if (!els.multFeedback) return;
    if (!html){ els.multFeedback.style.display="none"; els.multFeedback.innerHTML=""; return; }
    els.multFeedback.style.display="block";
    els.multFeedback.innerHTML = html;
  }

  function clearSlots(selector){
    document.querySelectorAll(selector).forEach(s => {
      s.textContent = "drop";
      s.classList.remove("filled");
      delete s.dataset.payload;
    });
  }

  function resetMultiplierUI(){
    multScenario = null;
    if (els.multPrompt) els.multPrompt.textContent = "Click “New Multiplier Scenario” to begin.";
    if (els.pool1) els.pool1.innerHTML = "";
    if (els.pool2) els.pool2.innerHTML = "";
    if (els.pool3) els.pool3.innerHTML = "";
    clearSlots("[data-m1]");
    clearSlots("[data-m2]");
    clearSlots("[data-m3]");
    setMultFeedback("");
  }

  // Drag/drop setup for multiplier section
  function setupDropZones(){
    const zones = document.querySelectorAll("[data-m1],[data-m2],[data-m3]");
    zones.forEach(z => {
      z.addEventListener("dragover", (ev) => { ev.preventDefault(); z.classList.add("dragover"); });
      z.addEventListener("dragleave", () => z.classList.remove("dragover"));
      z.addEventListener("drop", (ev) => {
        ev.preventDefault();
        z.classList.remove("dragover");
        const raw = ev.dataTransfer.getData("application/json");
        if (!raw) return;
        const payload = JSON.parse(raw);

        // Type enforcement by step/slot
        if (z.dataset.m1){
          if (z.dataset.m1 === "mult" && payload.kind !== "multSym") return;
          if (z.dataset.m1 === "shock" && payload.kind !== "shockSym") return;
        }
        if (z.dataset.m2){
          if (payload.kind !== "num") return;
        }
        if (z.dataset.m3){
          if (payload.kind !== "num") return;
        }

        z.textContent = payload.label;
        z.classList.add("filled");
        z.dataset.payload = raw;
        setMultFeedback("");
      });
    });
  }

  function getPayload(sel){
    const el = document.querySelector(sel);
    if (!el || !el.dataset.payload) return null;
    return JSON.parse(el.dataset.payload);
  }

  function newMultiplierScenario(){
    resetMultiplierUI();

    const mpc = p.MPC;
    const multGI = 1/(1-mpc);
    const multTax = (-mpc)/(1-mpc);

    const types = ["G","T","I"];
    const type = types[Math.floor(Math.random()*types.length)];

    const sizes = [10, 15, 20, 25, 30];
    const s = sizes[Math.floor(Math.random()*sizes.length)];
    const sign = Math.random() < 0.5 ? -1 : 1;

    const shockName = (type==="G") ? "ΔG" : (type==="T") ? "ΔT" : "ΔI";
    const varName = (type==="G") ? "G" : (type==="T") ? "T" : "Investment (I)";
    const dirWord = sign > 0 ? "increases" : "decreases";

    const dShock = sign * s;

    const multType = (type==="T") ? "TAX" : "GI";
    const multVal = (multType==="TAX") ? multTax : multGI;

    const dY = multVal * dShock;

    multScenario = { type, shockName, dShock, multType, multVal, dY };

    els.multPrompt.textContent = `Scenario: ${varName} ${dirWord} by ${Math.abs(dShock)}.`;

    // ---------- Pool 1 (symbols only) ----------
    const pool1Cards = [
      mkCard("1/(1−MPC)", { kind:"multSym", label:"1/(1−MPC)", mult:"GI" }),
      mkCard("−MPC/(1−MPC)", { kind:"multSym", label:"−MPC/(1−MPC)", mult:"TAX" }),
      mkCard("ΔG", { kind:"shockSym", label:"ΔG", shock:"G" }),
      mkCard("ΔT", { kind:"shockSym", label:"ΔT", shock:"T" }),
      mkCard("ΔI", { kind:"shockSym", label:"ΔI", shock:"I" }),
    ];
    pool1Cards.forEach(c => els.pool1.appendChild(c));

    // ---------- Pool 2 (numeric values) ----------
    // Correct multiplier value and correct shock value, plus distractors
    const multValR = Math.round(multVal*100)/100;
    const shockVal = dShock;
    const distractMults = [
      Math.round(multGI*100)/100,
      Math.round(multTax*100)/100,
      Math.round((multVal*0.9)*100)/100,
      Math.round((multVal*1.1)*100)/100
    ];
    const distractShocks = [shockVal + 5*sign, shockVal - 5*sign, 0];

    const pool2Nums = new Set([multValR, shockVal, ...distractMults, ...distractShocks]);
    Array.from(pool2Nums).forEach(v => {
      const lab = (v>=0 ? `+${v}` : `${v}`);
      els.pool2.appendChild(mkCard(lab, { kind:"num", label: lab, value: v }));
    });

    // ---------- Pool 3 (ΔY numeric) ----------
    const dYR = Math.round(dY*100)/100;
    const pool3Nums = new Set([
      dYR,
      Math.round((dYR*0.8)*100)/100,
      Math.round((dYR*1.2)*100)/100,
      Math.round((dYR + 5*sign)*100)/100
    ]);
    Array.from(pool3Nums).forEach(v => {
      const lab = (v>=0 ? `+${v}` : `${v}`);
      els.pool3.appendChild(mkCard(lab, { kind:"num", label: lab, value: v }));
    });
  }

  // Step checks
  function checkM1(){
    if (!multScenario){
      setMultFeedback(`<span class="tagBad">No scenario</span> Click <strong>New Multiplier Scenario</strong> first.`);
      return;
    }
    const mult = getPayload('[data-m1="mult"]');
    const shock = getPayload('[data-m1="shock"]');

    const ok = mult && shock && mult.kind==="multSym" && shock.kind==="shockSym"
      && mult.mult === multScenario.multType
      && shock.shock === multScenario.type;

    setMultFeedback(ok
      ? `<span class="tagOK">Correct</span> Formula uses the right multiplier and the right shock term.`
      : `<span class="tagBad">Not quite</span> Check the multiplier type and which shock term belongs in the formula.`
    );
  }

  function checkM2(){
    if (!multScenario){
      setMultFeedback(`<span class="tagBad">No scenario</span> Click <strong>New Multiplier Scenario</strong> first.`);
      return;
    }
    const mv = getPayload('[data-m2="multVal"]');
    const sv = getPayload('[data-m2="shockVal"]');

    const multValR = Math.round(multScenario.multVal*100)/100;
    const ok = mv && sv && mv.kind==="num" && sv.kind==="num"
      && (Math.abs(mv.value - multValR) <= 0.01)
      && (sv.value === multScenario.dShock);

    setMultFeedback(ok
      ? `<span class="tagOK">Correct</span> Great — you picked the correct multiplier value and the correct shock value.`
      : `<span class="tagBad">Not quite</span> Make sure you used the correct multiplier (based on the type of shock) and the correct sign for the change.`
    );
  }

  function checkM3(){
    if (!multScenario){
      setMultFeedback(`<span class="tagBad">No scenario</span> Click <strong>New Multiplier Scenario</strong> first.`);
      return;
    }
    const dy = getPayload('[data-m3="dY"]');
    const dYR = Math.round(multScenario.dY*100)/100;

    const ok = dy && dy.kind==="num" && Math.abs(dy.value - dYR) <= 0.01;

    setMultFeedback(ok
      ? `<span class="tagOK">Correct</span> Nice — that is the implied ΔY.`
      : `<span class="tagBad">Not quite</span> Re-check: ΔY = (multiplier) × (shock).`
    );
  }

  function clearM1(){ clearSlots("[data-m1]"); setMultFeedback(""); }
  function clearM2(){ clearSlots("[data-m2]"); setMultFeedback(""); }
  function clearM3(){ clearSlots("[data-m3]"); setMultFeedback(""); }

  // -------------------- Events --------------------
  els.newBtn.addEventListener("click", genProblem);
  els.resetBtn.addEventListener("click", resetReveals);

  els.show1.addEventListener("click", () => toggleSol(1));
  els.show2.addEventListener("click", () => toggleSol(2));

  els.checkBtn.addEventListener("click", checkAnswer);
  els.revealBtn.addEventListener("click", revealAnswer);

  // multiplier events
  setupDropZones();
  els.newMultBtn.addEventListener("click", newMultiplierScenario);

  els.checkM1.addEventListener("click", checkM1);
  els.clearM1.addEventListener("click", clearM1);

  els.checkM2.addEventListener("click", checkM2);
  els.clearM2.addEventListener("click", clearM2);

  els.checkM3.addEventListener("click", checkM3);
  els.clearM3.addEventListener("click", clearM3);

  // init
  genProblem();
})();
