// app.js
(() => {
  const $ = (id) => document.getElementById(id);

  const els = {
    newBtn: $("newBtn"),
    resetBtn: $("resetBtn"),
    checkMechBtn: $("checkMechBtn"),
    clearMechBtn: $("clearMechBtn"),
    status: $("status"),

    scenarioTitle: $("scenarioTitle"),
    scenarioDesc: $("scenarioDesc"),
    mechPrompt: $("mechPrompt"),

    rSlider: $("rSlider"),
    gSlider: $("gSlider"),
    tSlider: $("tSlider"),
    rVal: $("rVal"),
    gVal: $("gVal"),
    tVal: $("tVal"),

    y0: $("y0"),
    y1: $("y1"),

    pile: $("pile"),
    chain: $("chain"),
    mechFeedback: $("mechFeedback"),

    kcCanvas: $("kcCanvas"),
    isCanvas: $("isCanvas"),
  };

  function setStatus(msg){ if (els.status) els.status.textContent = msg; }
  function fmt(x){ return Number.isFinite(x) ? x.toFixed(2) : "—"; }
  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

  // Confirm script runs
  setStatus("Loaded.");

  const DATA = window.KCIS_DATA;
  if (!DATA || !DATA.params || !DATA.baseline) {
    setStatus("ERROR: KCIS_DATA missing. Confirm data.js is in this folder and defines window.KCIS_DATA.");
    return;
  }

  const P = DATA.params;
  const BASE = { ...DATA.baseline };

  // Current (student-controlled)
  let r = BASE.r, G = BASE.G, T = BASE.T;

  // Scenario shock: does not change sliders
  let shock = null; // {var, delta}

  // Colors
  const BLUE = "rgba(31,119,180,0.92)";
  const ORANGE = "rgba(230,159,0,0.95)";

  // Model
  function Iof(rr){ return P.I0 - P.b * rr; }
  function Ystar(rr, GG, TT){
    const num = P.C0 - P.MPC*TT + Iof(rr) + GG;
    return num / (1 - P.MPC);
  }
  function Yis(rr, GG, TT){ return Ystar(rr, GG, TT); }

  // ---------- Mechanism (14 cards only) ----------
  const CARDS = [
    { id:"r_up", text:"r ↑", var:"r", dir:"↑" },
    { id:"r_dn", text:"r ↓", var:"r", dir:"↓" },
    { id:"I_up", text:"I ↑", var:"I", dir:"↑" },
    { id:"I_dn", text:"I ↓", var:"I", dir:"↓" },
    { id:"G_up", text:"G ↑", var:"G", dir:"↑" },
    { id:"G_dn", text:"G ↓", var:"G", dir:"↓" },
    { id:"T_up", text:"T ↑", var:"T", dir:"↑" },
    { id:"T_dn", text:"T ↓", var:"T", dir:"↓" },
    { id:"PE_up", text:"PE ↑", var:"PE", dir:"↑" },
    { id:"PE_dn", text:"PE ↓", var:"PE", dir:"↓" },
    { id:"Y_up", text:"Y ↑", var:"Y", dir:"↑" },
    { id:"Y_dn", text:"Y ↓", var:"Y", dir:"↓" },
    { id:"INV_up", text:"Unplanned inventories ↑", var:"INV", dir:"↑" },
    { id:"INV_dn", text:"Unplanned inventories ↓", var:"INV", dir:"↓" },
  ];

  // Chains used depend on scenario
  function chainVars(v){
    if (v === "r") return ["r","I","PE","INV","Y"];
    if (v === "T") return ["T","PE","INV","Y"]; // we’re not including C as a separate variable in the 14-card set
    return ["G","PE","INV","Y"];
  }

  // Expected directions (using your mechanisms; for T we fold C into PE)
  function expected(v, sign){
    if (v === "r"){
      return sign==="↑"
        ? { r:"↑", I:"↓", PE:"↓", INV:"↑", Y:"↓" }
        : { r:"↓", I:"↑", PE:"↑", INV:"↓", Y:"↑" };
    }
    if (v === "T"){
      return sign==="↑"
        ? { T:"↑", PE:"↓", INV:"↑", Y:"↓" }
        : { T:"↓", PE:"↑", INV:"↓", Y:"↑" };
    }
    // G
    return sign==="↑"
      ? { G:"↑", PE:"↑", INV:"↓", Y:"↑" }
      : { G:"↓", PE:"↓", INV:"↑", Y:"↓" };
  }

  const chainState = {}; // slot index -> cardId

  function renderMechFeedback(html){
    if (!els.mechFeedback) return;
    if (!html){ els.mechFeedback.style.display="none"; els.mechFeedback.innerHTML=""; return; }
    els.mechFeedback.style.display="block";
    els.mechFeedback.innerHTML = html;
  }

  function buildPile(){
    els.pile.innerHTML = "";
    for (const c of CARDS){
      const el = document.createElement("div");
      el.className = "mcard";
      el.textContent = c.text;
      el.draggable = true;
      el.dataset.cardId = c.id;
      el.addEventListener("dragstart", (ev) => {
        ev.dataTransfer.setData("text/plain", c.id);
        ev.dataTransfer.effectAllowed = "move";
      });
      els.pile.appendChild(el);
    }
  }

  function buildChain(v){
    els.chain.innerHTML = "";
    for (const k of Object.keys(chainState)) delete chainState[k];
    const seq = chainVars(v);

    seq.forEach((varName, idx) => {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.dataset.slotIndex = String(idx);
      slot.dataset.var = varName;
      slot.textContent = "drop";
      els.chain.appendChild(slot);

      if (idx < seq.length-1){
        const arrow = document.createElement("div");
        arrow.className = "arrow";
        arrow.textContent = "→";
        els.chain.appendChild(arrow);
      }
    });

    setupSlots();
  }

  function setupSlots(){
    els.chain.querySelectorAll(".slot").forEach(slot => {
      slot.addEventListener("dragover", (ev) => { ev.preventDefault(); slot.classList.add("dragover"); });
      slot.addEventListener("dragleave", () => slot.classList.remove("dragover"));
      slot.addEventListener("drop", (ev) => {
        ev.preventDefault();
        slot.classList.remove("dragover");
        const id = ev.dataTransfer.getData("text/plain");
        const card = CARDS.find(c => c.id === id);
        if (!card) return;

        const idx = slot.dataset.slotIndex;
        chainState[idx] = id;
        slot.textContent = card.text;
        slot.classList.add("filled");
        renderMechFeedback("");
      });
    });
  }

  function clearChain(){
    for (const k of Object.keys(chainState)) delete chainState[k];
    els.chain.querySelectorAll(".slot").forEach(s => {
      s.textContent = "drop";
      s.classList.remove("filled");
    });
    renderMechFeedback("");
  }

  function checkMechanism(){
    if (!shock){
      renderMechFeedback(`<span class="tagBad">No scenario</span> Click <strong>New Scenario</strong> first.`);
      return;
    }

    const sign = shock.delta > 0 ? "↑" : "↓";
    const need = expected(shock.var, sign);

    // verify filled
    const slots = Array.from(els.chain.querySelectorAll(".slot"));
    for (const s of slots){
      if (!chainState[s.dataset.slotIndex]){
        renderMechFeedback(`<span class="tagBad">Incomplete</span> Fill all blanks, then check.`);
        return;
      }
    }

    // check by reading what variable each slot is supposed to represent (hidden from students)
    const wrong = [];
    for (const s of slots){
      const varName = s.dataset.var;
      const id = chainState[s.dataset.slotIndex];
      const card = CARDS.find(c => c.id === id);

      if (!need[varName] || !card || card.var !== varName || card.dir !== need[varName]) {
        wrong.push(varName);
      }
    }

    if (!wrong.length){
      renderMechFeedback(`<span class="tagOK">Correct</span> Great — that mechanism matches the shock.`);
      return;
    }

    renderMechFeedback(`<span class="tagBad">Not quite</span> One or more links are incorrect. Try again.`);
  }

  // ---------- Scenarios ----------
  function newScenario(){
    clearChain();
    renderMechFeedback("");

    const vars = ["r","G","T"];
    const v = vars[Math.floor(Math.random()*vars.length)];
    const delta = DATA.shocks[v][Math.floor(Math.random()*DATA.shocks[v].length)];
    shock = { var: v, delta };

    const word = delta > 0 ? "increases" : "decreases";
    els.scenarioTitle.textContent = "Scenario shock";
    els.scenarioDesc.textContent =
      `A policy variable changes:\n${v} ${word} (Δ${v} = ${delta}).\n\nSliders are still at baseline. Use sliders to apply the shock, then build the chain.`;

    els.mechPrompt.textContent = `Build the mechanism chain for the ${v}-shock.`;
    buildPile();
    buildChain(v);

    setStatus("Scenario generated. Sliders still baseline — move them to apply the shock.");
    drawAll();
  }

  function resetAll(){
    shock = null;
    r = BASE.r; G = BASE.G; T = BASE.T;
    syncSliders();
    els.scenarioTitle.textContent = "Scenario";
    els.scenarioDesc.textContent = "Click “New Scenario” to start.";
    els.mechPrompt.textContent = "Click New Scenario to generate a shock.";
    els.pile.innerHTML = "";
    els.chain.innerHTML = "";
    clearChain();
    renderMechFeedback("");
    setStatus("Reset to baseline.");
    drawAll();
  }

  // ---------- Sliders ----------
  function syncSliders(){
    els.rSlider.value = String(r);
    els.gSlider.value = String(G);
    els.tSlider.value = String(T);
    els.rVal.textContent = fmt(r);
    els.gVal.textContent = fmt(G);
    els.tVal.textContent = fmt(T);
  }
  function onSlider(){
    r = Number(els.rSlider.value);
    G = Number(els.gSlider.value);
    T = Number(els.tSlider.value);
    syncSliders();
    drawAll();
  }

  // ---------- Canvas drawing ----------
  function setupCanvas(canvas){
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const W = Math.max(1, Math.floor(rect.width * dpr));
    const H = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== W || canvas.height !== H){ canvas.width = W; canvas.height = H; }
    return { ctx, W, H, dpr };
  }

  function drawAxes(ctx, W, H, dpr, xLabel, yLabel){
    const pad = { l: 60*dpr, r: 14*dpr, t: 14*dpr, b: 52*dpr };
    const X0 = pad.l, X1 = W - pad.r;
    const Y0 = pad.t, Y1 = H - pad.b;

    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1*dpr;
    for (let i=0;i<=5;i++){
      const x = X0 + i*(X1-X0)/5;
      ctx.beginPath(); ctx.moveTo(x,Y0); ctx.lineTo(x,Y1); ctx.stroke();
    }
    for (let i=0;i<=4;i++){
      const y = Y0 + i*(Y1-Y0)/4;
      ctx.beginPath(); ctx.moveTo(X0,y); ctx.lineTo(X1,y); ctx.stroke();
    }

    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.font = `${12*dpr}px system-ui`;
    ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText(xLabel, (X0+X1)/2, Y1 + 20*dpr);

    ctx.save();
    ctx.translate(X0 - 48*dpr, (Y0+Y1)/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    return { X0, X1, Y0, Y1 };
  }

  function line(ctx, x1,y1,x2,y2, stroke, lw, dpr){
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw*dpr;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  }
  function dot(ctx, x,y, color, dpr){
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x,y,5*dpr,0,Math.PI*2); ctx.fill();
  }
  function xTick(ctx, x, Y1, label, dpr){
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2*dpr;
    ctx.beginPath(); ctx.moveTo(x, Y1); ctx.lineTo(x, Y1 + 6*dpr); ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.font = `${12*dpr}px system-ui`;
    ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText(label, x, Y1 + 8*dpr);
  }
  function yTick(ctx, X0, y, label, dpr){
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2*dpr;
    ctx.beginPath(); ctx.moveTo(X0-6*dpr, y); ctx.lineTo(X0, y); ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.font = `${12*dpr}px system-ui`;
    ctx.textAlign="right"; ctx.textBaseline="middle";
    ctx.fillText(label, X0 - 10*dpr, y);
  }

  function drawKC(){
    const { ctx, W, H, dpr } = setupCanvas(els.kcCanvas);
    ctx.clearRect(0,0,W,H);
    const { X0,X1,Y0p,Y1p } = drawAxes(ctx,W,H,dpr,"Output (Y)","Planned Expenditure (PE)");

    const Ymin = 0, Ymax = 900;
    const xTo = (Y) => X0 + (Y-Ymin)/(Ymax-Ymin)*(X1-X0);
    const yTo = (PE) => Y0p + (Ymax-PE)/(Ymax-Ymin)*(Y1p-Y0p);

    // 45 line
    line(ctx, xTo(Ymin), yTo(Ymin), xTo(Ymax), yTo(Ymax), "rgba(0,0,0,0.65)", 3, dpr);

    const Ab = P.C0 - P.MPC*BASE.T + Iof(BASE.r) + BASE.G;
    const Ac = P.C0 - P.MPC*T + Iof(r) + G;

    // baseline PE (blue) and current PE (orange)
    line(ctx, xTo(Ymin), yTo(Ab + P.MPC*Ymin), xTo(Ymax), yTo(Ab + P.MPC*Ymax), BLUE, 3, dpr);
    line(ctx, xTo(Ymin), yTo(Ac + P.MPC*Ymin), xTo(Ymax), yTo(Ac + P.MPC*Ymax), ORANGE, 3, dpr);

    const Y0eq = Ystar(BASE.r, BASE.G, BASE.T);
    const Y1eq = Ystar(r, G, T);

    dot(ctx, xTo(Y0eq), yTo(Y0eq), BLUE, dpr);
    xTick(ctx, xTo(Y0eq), Y1p, "Y₀", dpr);

    if (Math.abs(Y1eq - Y0eq) > 1e-6){
      dot(ctx, xTo(Y1eq), yTo(Y1eq), ORANGE, dpr);
      xTick(ctx, xTo(Y1eq), Y1p, "Y₁", dpr);
    }
  }

  function drawIS(){
    const { ctx, W, H, dpr } = setupCanvas(els.isCanvas);
    ctx.clearRect(0,0,W,H);
    const { X0,X1,Y0p,Y1p } = drawAxes(ctx,W,H,dpr,"Output (Y)","Interest rate (r)");

    const rMin = DATA.ranges?.r?.min ?? 0;
    const rMax = DATA.ranges?.r?.max ?? 10;

    const Ymin = 0, Ymax = 900;
    const xTo = (Y) => X0 + (Y-Ymin)/(Ymax-Ymin)*(X1-X0);
    const yTo = (rr) => Y0p + (rMax-rr)/(rMax-rMin)*(Y1p-Y0p);

    // r ticks
    [0,2,4,6,8,10].forEach(rr => {
      if (rr >= rMin && rr <= rMax) yTick(ctx, X0, yTo(rr), String(rr), dpr);
    });

    const N = 240;
    function drawCurve(color, GG, TT){
      ctx.strokeStyle = color;
      ctx.lineWidth = 3*dpr;
      ctx.beginPath();
      for (let i=0;i<=N;i++){
        const rr = rMin + (i/N)*(rMax-rMin);
        const YY = Yis(rr, GG, TT);
        const x = xTo(YY);
        const y = yTo(rr);
        if (i===0) ctx.moveTo(x,y);
        else ctx.lineTo(x,y);
      }
      ctx.stroke();
    }

    drawCurve(BLUE, BASE.G, BASE.T);
    drawCurve(ORANGE, G, T);

    const Y0eq = Ystar(BASE.r, BASE.G, BASE.T);
    const Y1eq = Ystar(r, G, T);

    dot(ctx, xTo(Y0eq), yTo(BASE.r), BLUE, dpr);
    xTick(ctx, xTo(Y0eq), Y1p, "Y₀", dpr);

    if (Math.abs(Y1eq - Y0eq) > 1e-6 || Math.abs(r - BASE.r) > 1e-6){
      dot(ctx, xTo(Y1eq), yTo(r), ORANGE, dpr);
      xTick(ctx, xTo(Y1eq), Y1p, "Y₁", dpr);
    }
  }

  function drawAll(){
    const Y0eq = Ystar(BASE.r, BASE.G, BASE.T);
    const Y1eq = Ystar(r, G, T);
    els.y0.textContent = fmt(Y0eq);
    els.y1.textContent = fmt(Y1eq);

    requestAnimationFrame(() => {
      drawKC();
      drawIS();
    });
  }

  // ---------- Wire up ----------
  els.rSlider.addEventListener("input", onSlider);
  els.gSlider.addEventListener("input", onSlider);
  els.tSlider.addEventListener("input", onSlider);

  els.newBtn.addEventListener("click", newScenario);
  els.resetBtn.addEventListener("click", resetAll);
  els.checkMechBtn.addEventListener("click", checkMechanism);
  els.clearMechBtn.addEventListener("click", clearChain);

  window.addEventListener("resize", () => drawAll());

  // init
  syncSliders();
  drawAll();
  setStatus("Ready.");
})();
