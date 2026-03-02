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
    multPile: $("multPile"),
    multFeedback: $("multFeedback"),
    checkMultBtn: $("checkMultBtn"),
    clearMultBtn: $("clearMultBtn"),
  };

  const DATA = window.SOLVER_DATA;
  if (!DATA) { els.status.textContent = "ERROR: data.js not loaded (SOLVER_DATA missing)."; return; }

  let p = null; // current parameters
  let YstarVal = null;

  // Multiplier scenario state
  let multScenario = null; 
  // { type: "G"|"T"|"I", dG, dT, dI, dY, multType:"GI"|"TAX", multVal }

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

    const Ival = p.I0 - p.b*p.r;
    const A = p.C0 - p.MPC*p.T + Ival + p.G;
    YstarVal = A / (1 - p.MPC);

    renderProblem();
    resetReveals();

    // reset question UI
    els.ans.value = "";
    els.resultTag.textContent = "";
    setStatus("New problem loaded.");

    // reset multiplier UI
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

    els.resultTag.innerHTML = ok
      ? `<span class="tagOK">Correct</span>`
      : `<span class="tagBad">Not quite</span>`;
  }

  function revealAnswer(){
    els.resultTag.innerHTML = `<span class="tagOK">Y* = ${fmt2(YstarVal)}</span>`;
  }

  // -------------------- Multiplier Practice --------------------
  function mkCard(id, text, payload){
    const el = document.createElement("div");
    el.className = "mcard";
    el.textContent = text;
    el.draggable = true;
    el.dataset.cardId = id;
    el.dataset.payload = JSON.stringify(payload);
    el.addEventListener("dragstart", (ev) => {
      ev.dataTransfer.setData("text/plain", id);
      ev.dataTransfer.setData("application/json", el.dataset.payload);
      ev.dataTransfer.effectAllowed = "move";
    });
    return el;
  }

  function clearSlots(selector){
    document.querySelectorAll(selector).forEach(s => {
      s.textContent = "drop";
      s.classList.remove("filled");
      delete s.dataset.payload;
    });
  }

  function setMultFeedback(html){
    if (!els.multFeedback) return;
    if (!html){ els.multFeedback.style.display="none"; els.multFeedback.innerHTML=""; return; }
    els.multFeedback.style.display="block";
    els.multFeedback.innerHTML = html;
  }

  function setupDropZones(){
    const zones = document.querySelectorAll("[data-mslot],[data-vslot]");
    zones.forEach(z => {
      z.addEventListener("dragover", (ev) => { ev.preventDefault(); z.classList.add("dragover"); });
      z.addEventListener("dragleave", () => z.classList.remove("dragover"));
      z.addEventListener("drop", (ev) => {
        ev.preventDefault();
        z.classList.remove("dragover");

        const payloadRaw = ev.dataTransfer.getData("application/json");
        if (!payloadRaw) return;
        const payload = JSON.parse(payloadRaw);

        if (z.dataset.mslot === "mult" && payload.kind !== "mult") return;
        if (z.dataset.mslot === "shock" && payload.kind !== "shock") return;
        if (z.dataset.vslot && payload.kind !== "value") return;

        z.textContent = payload.label;
        z.classList.add("filled");
        z.dataset.payload = payloadRaw;

        setMultFeedback("");
      });
    });
  }

  function resetMultiplierUI(){
    multScenario = null;
    if (els.multPrompt) els.multPrompt.textContent = "Click “New Multiplier Scenario” to begin.";
    if (els.multPile) els.multPile.innerHTML = "";
    clearSlots("[data-mslot]");
    clearSlots("[data-vslot]");
    setMultFeedback("");
  }

  function newMultiplierScenario(){
    resetMultiplierUI();

    const mpc = p.MPC;
    const multGI = 1/(1-mpc);
    const multTax = (-mpc)/(1-mpc);

    const types = ["G","T","I"];
    const type = types[Math.floor(Math.random()*types.length)];

    const shockSizes = [10, 15, 20, 25, 30];
    const s = shockSizes[Math.floor(Math.random()*shockSizes.length)];
    const sign = Math.random() < 0.5 ? -1 : 1;

    const dG = (type==="G") ? sign*s : 0;
    const dT = (type==="T") ? sign*s : 0;
    const dI = (type==="I") ? sign*s : 0;

    const multType = (type==="T") ? "TAX" : "GI";
    const multVal = (multType==="TAX") ? multTax : multGI;

    const dY = multVal * (type==="G" ? dG : type==="T" ? dT : dI);

    multScenario = { type, dG, dT, dI, dY, multType, multVal };

    const arrow = sign>0 ? "increases" : "decreases";
    const varName = (type==="G") ? "G" : (type==="T") ? "T" : "Investment (I)";
    els.multPrompt.textContent =
      `Scenario: ${varName} ${arrow}. Build ΔY using the correct multiplier and the correct shock.`;

    // Cards: multipliers (symbolic)
    const multCards = [
      mkCard("mult_gi", "1/(1−MPC)", { kind:"mult", label:"1/(1−MPC)", mult:"GI" }),
      mkCard("mult_tax", "−MPC/(1−MPC)", { kind:"mult", label:"−MPC/(1−MPC)", mult:"TAX" }),
    ];

    // Cards: shock symbols
    const shockCards = [
      mkCard("shock_dG", "ΔG", { kind:"shock", label:"ΔG", shock:"G" }),
      mkCard("shock_dT", "ΔT", { kind:"shock", label:"ΔT", shock:"T" }),
      mkCard("shock_dI", "ΔI", { kind:"shock", label:"ΔI", shock:"I" }),
    ];

    // Numeric value cards: include correct values + a couple distractors
    const vals = new Set([dG, dT, dI, 0, sign*(s+5), sign*(s-5)]);
    const valueCards = Array.from(vals).map((v,i) =>
      mkCard(`val_${i}_${v}`, (v>=0?`+${v}`:`${v}`), { kind:"value", label:(v>=0?`+${v}`:`${v}`), value:v })
    );

    // ΔY candidates: correct + distractors
    const dYround = Math.round(dY*100)/100;
    const cands = new Set([
      dYround,
      Math.round((dYround*0.8)*100)/100,
      Math.round((dYround*1.2)*100)/100
    ]);
    const dYCards = Array.from(cands).map((v,i) =>
      mkCard(`dy_${i}_${v}`, (v>=0?`+${v}`:`${v}`), { kind:"value", label:(v>=0?`+${v}`:`${v}`), value:v, isDY:true })
    );

    [...multCards, ...shockCards, ...valueCards, ...dYCards].forEach(el => els.multPile.appendChild(el));
  }

  function valOf(slotSel){
    const el = document.querySelector(slotSel);
    if (!el || !el.dataset.payload) return null;
    return JSON.parse(el.dataset.payload);
  }

  function checkMultiplier(){
    if (!multScenario){
      setMultFeedback(`<span class="tagBad">No scenario</span> Click <strong>New Multiplier Scenario</strong> first.`);
      return;
    }

    const multPayload = valOf('[data-mslot="mult"]');
    const shockPayload = valOf('[data-mslot="shock"]');

    const dGPayload = valOf('[data-vslot="dG"]');
    const dTPayload = valOf('[data-vslot="dT"]');
    const dIPayload = valOf('[data-vslot="dI"]');
    const dYPayload = valOf('[data-vslot="dY"]');

    const multOk = multPayload && multPayload.kind==="mult" && multPayload.mult === multScenario.multType;
    const shockOk = shockPayload && shockPayload.kind==="shock" && shockPayload.shock === multScenario.type;

    const dGok = dGPayload && dGPayload.kind==="value" && dGPayload.value === multScenario.dG;
    const dTok = dTPayload && dTPayload.kind==="value" && dTPayload.value === multScenario.dT;
    const dIok = dIPayload && dIPayload.kind==="value" && dIPayload.value === multScenario.dI;

    const dyTarget = Math.round(multScenario.dY*100)/100;
    const dyOk = dYPayload && dYPayload.kind==="value" && Math.abs(dYPayload.value - dyTarget) <= 0.01;

    if (multOk && shockOk && dGok && dTok && dIok && dyOk){
      setMultFeedback(`<span class="tagOK">Correct</span> Nice — you matched the multiplier, the shock, and the implied ΔY.`);
    } else {
      setMultFeedback(
        `<span class="tagBad">Not quite</span>
        Check: (i) the correct multiplier type, (ii) the correct shock term, and (iii) that only the shocked variable is nonzero.`
      );
    }
  }

  function clearMultiplier(){
    clearSlots("[data-mslot]");
    clearSlots("[data-vslot]");
    setMultFeedback("");
  }

  // Events
  els.newBtn.addEventListener("click", genProblem);
  els.resetBtn.addEventListener("click", resetReveals);

  els.show1.addEventListener("click", () => toggleSol(1));
  els.show2.addEventListener("click", () => toggleSol(2));

  els.checkBtn.addEventListener("click", checkAnswer);
  els.revealBtn.addEventListener("click", revealAnswer);

  // multiplier events (only if multiplier block exists)
  setupDropZones();
  els.newMultBtn.addEventListener("click", newMultiplierScenario);
  els.checkMultBtn.addEventListener("click", checkMultiplier);
  els.clearMultBtn.addEventListener("click", clearMultiplier);

  // init
  genProblem();
})();
