window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);
  const missing = [];
  const must = (id) => { const el = $(id); if (!el) missing.push(id); return el; };

  const els = {
    zoneStaging: must("zoneStaging"),
    zoneFrictional: must("zoneFrictional"),
    zoneStructural: must("zoneStructural"),
    zoneCyclical: must("zoneCyclical"),

    newRoundBtn: must("newRoundBtn"),
    resetBtn: must("resetBtn"),
    status: must("status"),

    checkBtn: must("checkBtn"),
    checkMsg: must("checkMsg"),
    explainBox: must("explainBox"),

    // metrics
    m_E: must("m_E"),
    m_U: must("m_U"),
    m_LF: must("m_LF"),
    m_u: must("m_u"),
    m_ustar: must("m_ustar"),
    m_ucyc: must("m_ucyc"),

    // business cycle
    gapChart: must("gapChart"),
    qSlider: must("qSlider"),
    qLabel: must("qLabel"),
    gapVal: must("gapVal"),
    recessionBtn: must("recessionBtn"),
    recoveryBtn: must("recoveryBtn"),
    resetCycleBtn: must("resetCycleBtn"),
    cycleNote: must("cycleNote"),
  };

  function setStatus(msg){ if (els.status) els.status.textContent = msg; }
  function fmtPct(x){ return (100*x).toFixed(2) + "%"; }

  if (missing.length){
    console.error("Missing element IDs:", missing);
    if (els.status) els.status.textContent = `Missing element IDs: ${missing.join(", ")}`;
    return;
  }

  // ---- Card templates (expand freely) ----
  const TEMPLATES = [
    // frictional
    { type:"FRIC", text:"Quit a job to search for a better match in the same city." },
    { type:"FRIC", text:"Recent graduate searching for a first job." },
    { type:"FRIC", text:"Moved to a new city and is searching for work." },
    { type:"FRIC", text:"Seasonal worker between seasonal jobs and actively searching." },
    { type:"FRIC", text:"Left a job and is comparing offers/interviewing." },

    // structural
    { type:"STRU", text:"Factory closes due to automation; workers need new skills." },
    { type:"STRU", text:"Coal industry declines; workers must retrain for other sectors." },
    { type:"STRU", text:"Demand shifts from retail to e-commerce; store workers displaced." },
    { type:"STRU", text:"Workers in a shrinking region struggle to find local jobs." },
    { type:"STRU", text:"Licensing requirements block switching into a growing occupation." },

    // cyclical (these cards represent demand-driven unemployment; their counts will be adjusted by the cycle)
    { type:"CYC", text:"Sales fall in a recession; firms lay off workers broadly." },
    { type:"CYC", text:"Restaurants cut staff after a decline in consumer spending." },
    { type:"CYC", text:"A downturn reduces exports; manufacturers lay off workers." },
    { type:"CYC", text:"Hiring freezes spread during a recession." },
    { type:"CYC", text:"Construction layoffs rise when spending falls sharply." },
  ];

  // ---- State ----
  let cards = [];
  let nextId = 1;

  // Employed workers E: random each round
  let E = 900;

  // Business cycle: 12 quarters
  const T = 12;
  let gapBase = new Array(T).fill(0);
  let gap = new Array(T).fill(0);
  let tCur = 0;

  // Mapping parameters
  // gap is in percent (e.g., -4.0 means output 4% below potential)
  // cyclical rate = max(0, kappa * (-gap))
  const KAPPA = 0.010; // -4% gap -> 4% cyclical rate

  // ---- Helpers ----
  function drawPeople(){
    // baseline people on a card (will be adjusted if cyclical & placed)
    return 4 + Math.floor(Math.random()*25); // 4..28
  }

  function makeCard(tpl){
    return {
      id: "c" + (nextId++),
      people: drawPeople(),
      text: tpl.text,
      correct: tpl.type,  // FRIC | STRU | CYC
      zone: "STAGE",
      checked: null,
      // For cyclical cards, store a baseline weight for distributing C_target
      weight: (tpl.type === "CYC") ? 1 : 0
    };
  }

  function setupDropzone(zoneEl){
    zoneEl.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      zoneEl.classList.add("dragover");
    });
    zoneEl.addEventListener("dragleave", () => zoneEl.classList.remove("dragover"));
    zoneEl.addEventListener("drop", (ev) => {
      ev.preventDefault();
      zoneEl.classList.remove("dragover");
      const id = ev.dataTransfer.getData("text/plain");
      const z = zoneEl.dataset.zone;
      const c = cards.find(x => x.id === id);
      if (!c) return;
      c.zone = z;
      c.checked = null;
      els.checkMsg.textContent = "";
      renderZones();
      // Changing placement can change counts
      recomputeAll();
    });
  }

  setupDropzone(els.zoneStaging);
  setupDropzone(els.zoneFrictional);
  setupDropzone(els.zoneStructural);
  setupDropzone(els.zoneCyclical);

  function renderZones(){
    els.zoneStaging.innerHTML = "";
    els.zoneFrictional.innerHTML = "";
    els.zoneStructural.innerHTML = "";
    els.zoneCyclical.innerHTML = "";

    for (const c of cards){
      const el = document.createElement("div");
      el.className = "card";
      if (c.checked === true) el.classList.add("ok");
      if (c.checked === false) el.classList.add("bad");

      el.draggable = true;
      el.dataset.cardId = c.id;

      el.innerHTML = `
        <div class="badge">${c.people} people</div>
        <div class="desc">${c.text}</div>
      `;

      el.addEventListener("dragstart", (ev) => {
        ev.dataTransfer.setData("text/plain", c.id);
        ev.dataTransfer.effectAllowed = "move";
      });

      const zoneEl =
        (c.zone === "STAGE") ? els.zoneStaging :
        (c.zone === "FRIC") ? els.zoneFrictional :
        (c.zone === "STRU") ? els.zoneStructural :
        els.zoneCyclical;

      zoneEl.appendChild(el);
    }
  }

  function countsPlaced(){
    let F=0,S=0,C=0;
    for (const c of cards){
      if (c.zone === "FRIC") F += c.people;
      else if (c.zone === "STRU") S += c.people;
      else if (c.zone === "CYC") C += c.people;
    }
    return {F,S,C, U: F+S+C};
  }

  // Ensure there is at least one cyclical card placed when we need to allocate C_target
  function ensureCyclicalCarrierCard(){
    // If there is already at least one cyc card in CYC bucket, do nothing.
    const hasCycPlaced = cards.some(c => c.correct === "CYC" && c.zone === "CYC");
    if (hasCycPlaced) return;

    // If target cyclical is positive, create a carrier card in CYC bucket
    const carrier = {
      id: "c" + (nextId++),
      people: 0,
      text: "Economy-wide layoffs due to weak demand in a recession.",
      correct: "CYC",
      zone: "CYC",
      checked: null,
      weight: 1
    };
    cards.push(carrier);
  }

  function cyclicalRateFromGap(g){
    return Math.max(0, KAPPA * (-g));
  }

  function targetCycCount(LF, g){
    const ucyc = cyclicalRateFromGap(g);
    return Math.max(0, Math.round(LF * ucyc));
  }

  // Adjust people counts on cards in the cyclical bucket so they sum to C_target.
  // We distribute across placed cyclical cards proportionally to their weights.
  function adjustCyclicalCounts(C_target){
    // Collect cyc cards placed in cyc bucket
    let cycCards = cards.filter(c => c.correct === "CYC" && c.zone === "CYC");

    if (C_target > 0 && cycCards.length === 0){
      ensureCyclicalCarrierCard();
      cycCards = cards.filter(c => c.correct === "CYC" && c.zone === "CYC");
    }

    // If still none (shouldn't happen), return.
    if (cycCards.length === 0){
      return;
    }

    const totalW = cycCards.reduce((s,c)=>s + (c.weight || 1), 0) || cycCards.length;

    // Allocate integer counts that sum exactly to C_target
    let assigned = 0;
    const allocations = cycCards.map((c, i) => {
      const raw = C_target * ((c.weight || 1) / totalW);
      const v = (i === cycCards.length - 1) ? (C_target - assigned) : Math.floor(raw);
      assigned += v;
      return v;
    });

    // If rounding error made last negative, fix by simple redistribution
    if (allocations[allocations.length - 1] < 0){
      // fallback: set all but last to 0 and last to C_target
      for (let i=0;i<allocations.length;i++) allocations[i] = 0;
      allocations[allocations.length - 1] = C_target;
    }

    // Apply allocations
    for (let i=0;i<cycCards.length;i++){
      cycCards[i].people = allocations[i];
    }

    // Also: if there are cyc cards in staging or wrong bucket, leave them unchanged.
  }

  function updateMetricsAndText(){
    const {F,S,C,U} = countsPlaced();
    const LF = E + U;

    els.m_E.textContent = String(E);
    els.m_U.textContent = String(U);
    els.m_LF.textContent = String(LF);

    if (LF === 0){
      els.m_u.textContent = "—";
      els.m_ustar.textContent = "—";
      els.m_ucyc.textContent = "—";
      return;
    }

    const u = U / LF;
    const uStar = (F + S) / LF;
    const uCyc = C / LF;

    els.m_u.textContent = fmtPct(u);
    els.m_ustar.textContent = fmtPct(uStar);
    els.m_ucyc.textContent = fmtPct(uCyc);

    // Update cycle readouts
    els.qLabel.textContent = `Q${tCur+1}`;
    const g = gap[tCur];
    els.gapVal.textContent = g.toFixed(2);

    const cycRate = cyclicalRateFromGap(g);
    els.cycleNote.textContent =
      `At Q${tCur+1}, gap=${g.toFixed(2)}%. This implies cyclical rate ≈ ${(100*cycRate).toFixed(2)}% (κ=${KAPPA.toFixed(3)}).`;
  }

  // ---- Business cycle chart drawing ----
  function drawChart(){
    const canvas = els.gapChart;
    const ctx = canvas.getContext("2d");

    // scale for device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    if (canvas.width !== w || canvas.height !== h){
      canvas.width = w; canvas.height = h;
    }

    ctx.clearRect(0,0,w,h);

    // bounds
    const padding = {l: 40*dpr, r: 12*dpr, t: 14*dpr, b: 28*dpr};
    const X0 = padding.l, X1 = w - padding.r;
    const Y0 = padding.t, Y1 = h - padding.b;

    // y-range fixed for clarity
    const yMin = -6, yMax = 4;
    const yToPix = (y) => Y0 + (yMax - y) * (Y1 - Y0) / (yMax - yMin);
    const xToPix = (i) => X0 + i * (X1 - X0) / (T-1);

    // gridlines & axis
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1*dpr;

    // horizontal grid at y = -6,-4,-2,0,2,4
    const ticks = [-6,-4,-2,0,2,4];
    for (const y of ticks){
      const py = yToPix(y);
      ctx.beginPath();
      ctx.moveTo(X0, py);
      ctx.lineTo(X1, py);
      ctx.stroke();
    }

    // axis labels
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const y of ticks){
      ctx.fillText(String(y), X0 - 8*dpr, yToPix(y));
    }

    // x labels Q1..Q12 (sparse)
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i=0;i<T;i+=2){
      ctx.fillText(`Q${i+1}`, xToPix(i), Y1 + 6*dpr);
    }

    // zero line thicker
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 2*dpr;
    ctx.beginPath();
    ctx.moveTo(X0, yToPix(0));
    ctx.lineTo(X1, yToPix(0));
    ctx.stroke();

    // series line
    ctx.strokeStyle = "rgba(31,119,180,0.85)";
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    for (let i=0;i<T;i++){
      const px = xToPix(i);
      const py = yToPix(gap[i]);
      if (i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.stroke();

    // points
    ctx.fillStyle = "rgba(31,119,180,0.85)";
    for (let i=0;i<T;i++){
      const px = xToPix(i);
      const py = yToPix(gap[i]);
      ctx.beginPath();
      ctx.arc(px, py, 3.5*dpr, 0, Math.PI*2);
      ctx.fill();
    }

    // highlight current quarter
    const hx = xToPix(tCur);
    const hy = yToPix(gap[tCur]);
    ctx.fillStyle = "rgba(230,159,0,0.95)";
    ctx.beginPath();
    ctx.arc(hx, hy, 6.5*dpr, 0, Math.PI*2);
    ctx.fill();

    // title
    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.font = `${13*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Output gap (%)", X0, 0);
  }

  // ---- Cycle generation & shocks ----
  function resetCycle(){
    // gentle baseline noise around 0
    gapBase = new Array(T).fill(0).map(() => (Math.random()*1.2 - 0.6)); // [-0.6,0.6]
    gap = gapBase.slice();
    tCur = 0;
    els.qSlider.value = "0";
    drawChart();
  }

  function applyShock(kind){
    // kind: "recession" or "recovery"
    // apply a smooth bump starting at tCur for ~5 quarters
    const amp = (kind === "recession") ? -(1.8 + Math.random()*2.2) : (1.2 + Math.random()*1.6); // recession stronger
    const len = 5;
    for (let j=0;j<len;j++){
      const t = tCur + j;
      if (t >= T) break;
      // smooth hump shape
      const w = Math.sin((Math.PI * (j+1)) / (len+1));
      gap[t] += amp * w;
    }
    // clamp
    gap = gap.map(x => Math.max(-6, Math.min(4, x)));
    drawChart();
  }

  // ---- Core recompute pipeline ----
  function recomputeAll(){
    // First: adjust cyclical counts according to business cycle
    // We need LF, but LF depends on U, and U includes C (cyclical). This is a fixed-point.
    // We solve by:
    // 1) compute natural unemployment from F+S
    // 2) start with current C from cards
    // 3) compute LF and target C
    // 4) set C to target and recompute once (stable enough for teaching)

    // Step A: compute natural counts from placed cards (F+S)
    let F=0,S=0;
    for (const c of cards){
      if (c.zone === "FRIC") F += c.people;
      else if (c.zone === "STRU") S += c.people;
    }
    const U_nat = F + S;

    // Step B: initial guess of LF using C=0
    const LF0 = E + U_nat;
    const C_target0 = targetCycCount(LF0, gap[tCur]);

    // Apply cyc counts
    adjustCyclicalCounts(C_target0);

    // Step C: recompute LF using updated C
    const {U} = countsPlaced();
    const LF1 = E + U;
    const C_target1 = targetCycCount(LF1, gap[tCur]);

    // If target changed, adjust once more
    if (C_target1 !== C_target0){
      adjustCyclicalCounts(C_target1);
    }

    // render + metrics
    renderZones();
    updateMetricsAndText();
  }

  // ---- User actions ----
  function check(){
    let correct = 0, placed = 0;
    for (const c of cards){
      if (c.zone === "STAGE") { c.checked = null; continue; }
      placed++;
      c.checked = (c.zone === c.correct);
      if (c.checked) correct++;
    }
    renderZones();
    els.checkMsg.textContent = placed === 0 ? "Place some cards first." : `${correct}/${placed} placed cards correct.`;
  }

  function newRound(){
    nextId = 1;

    // Randomize employed each round
    // (kept moderate; you can change range)
    E = 700 + Math.floor(Math.random()*701); // 700..1400

    // Draw 10..14 random cards
    const pool = [...TEMPLATES].sort(()=>Math.random()-0.5);
    const n = 10 + Math.floor(Math.random()*5);
    cards = pool.slice(0, n).map(makeCard);

    // Reset cycle too so each round feels fresh
    resetCycle();

    els.checkMsg.textContent = "";
    els.explainBox.textContent = "Tip: frictional + structural form the “natural” component. Cyclical fluctuates with the business cycle.";
    setStatus("New round loaded.");

    renderZones();
    recomputeAll();
  }

  function reset(){
    newRound();
    setStatus("Reset.");
  }

  // ---- Wire up ----
  els.checkBtn.addEventListener("click", check);
  els.newRoundBtn.addEventListener("click", newRound);
  els.resetBtn.addEventListener("click", reset);

  els.qSlider.addEventListener("input", () => {
    tCur = Number(els.qSlider.value);
    drawChart();
    recomputeAll();
  });

  els.recessionBtn.addEventListener("click", () => {
    applyShock("recession");
    recomputeAll();
    setStatus(`Applied recession shock starting at Q${tCur+1}.`);
  });

  els.recoveryBtn.addEventListener("click", () => {
    applyShock("recovery");
    recomputeAll();
    setStatus(`Applied recovery shock starting at Q${tCur+1}.`);
  });

  els.resetCycleBtn.addEventListener("click", () => {
    resetCycle();
    recomputeAll();
    setStatus("Cycle reset.");
  });

  // typeset header once
  const top = document.getElementById("mathTop");
  if (top && window.MathJax?.typesetPromise) window.MathJax.typesetPromise([top]);

  // Initial load
  newRound();
});
