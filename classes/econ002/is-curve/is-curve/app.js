// app.js (with Consumption added to mechanism; 16 pills total)
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

  function setStatus(msg){ els.status.textContent = msg; }
  function fmt(x){ return Number.isFinite(x) ? x.toFixed(2) : "—"; }

  const DATA = window.KCIS_DATA;
  if (!DATA) { setStatus("ERROR: KCIS_DATA missing (data.js not loaded)."); return; }

  const P = DATA.params;
  const BASE = { ...DATA.baseline };

  // Current slider values
  let r = BASE.r, G = BASE.G, T = BASE.T;

  // Shock info (does NOT change sliders)
  let shock = null; // {var, delta}

  // Colors
  const BLUE = "rgba(31,119,180,0.92)";
  const ORANGE = "rgba(230,159,0,0.95)";
  const INK = "rgba(0,0,0,0.65)";
  const DASH = "rgba(0,0,0,0.30)";

  // ----- Model -----
  function Iof(rr){ return P.I0 - P.b * rr; }
  function Ystar(rr, GG, TT){
    const num = P.C0 - P.MPC*TT + Iof(rr) + GG;
    return num / (1 - P.MPC);
  }
  function Yis(rr, GG, TT){ return Ystar(rr, GG, TT); }

  // ----- Canvas helpers -----
  function setupCanvas(canvas){
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const W = Math.max(2, Math.floor(rect.width * dpr));
    const H = Math.max(2, Math.floor(rect.height * dpr));
    if (canvas.width !== W || canvas.height !== H){ canvas.width = W; canvas.height = H; }
    return { ctx, W, H, dpr };
  }

  function axes(ctx, W, H, dpr, xLabel, yLabel){
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

    return { X0,X1,Y0,Y1 };
  }

  function drawLine(ctx, x1,y1,x2,y2, stroke, lw, dpr, dash=null){
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw*dpr;
    if (dash) ctx.setLineDash(dash.map(v=>v*dpr)); else ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawDot(ctx, x,y, color, dpr){
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

  // ----- Draw KC -----
  function drawKC(){
    const { ctx, W, H, dpr } = setupCanvas(els.kcCanvas);
    ctx.clearRect(0,0,W,H);

    const { X0,X1,Y0,Y1 } = axes(ctx,W,H,dpr,"Output (Y)","Planned Expenditure (PE)");

    const Ymin = 0, Ymax = 900;
    const xTo = (Yv) => X0 + (Yv-Ymin)/(Ymax-Ymin)*(X1-X0);
    const yTo = (PEv) => Y0 + (Ymax-PEv)/(Ymax-Ymin)*(Y1-Y0);

    // 45-degree
    drawLine(ctx, xTo(Ymin), yTo(Ymin), xTo(Ymax), yTo(Ymax), INK, 3, dpr);

    // PE lines: PE = A + MPC*Y
    const Ab = P.C0 - P.MPC*BASE.T + Iof(BASE.r) + BASE.G;
    const Ac = P.C0 - P.MPC*T + Iof(r) + G;

    drawLine(ctx, xTo(Ymin), yTo(Ab + P.MPC*Ymin), xTo(Ymax), yTo(Ab + P.MPC*Ymax), BLUE, 3, dpr);
    drawLine(ctx, xTo(Ymin), yTo(Ac + P.MPC*Ymin), xTo(Ymax), yTo(Ac + P.MPC*Ymax), ORANGE, 3, dpr);

    const Y0eq = Ystar(BASE.r, BASE.G, BASE.T);
    const Y1eq = Ystar(r, G, T);

    // baseline point + dashed to x-axis + tick
    const x0 = xTo(Y0eq), y0 = yTo(Y0eq);
    drawDot(ctx, x0, y0, BLUE, dpr);
    drawLine(ctx, x0, y0, x0, Y1, DASH, 2, dpr, [4,6]);
    xTick(ctx, x0, Y1, "Y₀", dpr);

    // current point + dashed to x-axis + tick
    if (Math.abs(Y1eq - Y0eq) > 1e-6){
      const x1 = xTo(Y1eq), y1 = yTo(Y1eq);
      drawDot(ctx, x1, y1, ORANGE, dpr);
      drawLine(ctx, x1, y1, x1, Y1, DASH, 2, dpr, [4,6]);
      xTick(ctx, x1, Y1, "Y₁", dpr);
    }
  }

  // ----- Draw IS -----
  function drawIS(){
    const { ctx, W, H, dpr } = setupCanvas(els.isCanvas);
    ctx.clearRect(0,0,W,H);

    const { X0,X1,Y0,Y1 } = axes(ctx,W,H,dpr,"Output (Y)","Interest rate (r)");

    const rMin = DATA.ranges?.r?.min ?? 0;
    const rMax = DATA.ranges?.r?.max ?? 10;

    const Ymin = 0, Ymax = 900;
    const xTo = (Yv) => X0 + (Yv-Ymin)/(Ymax-Ymin)*(X1-X0);
    const yTo = (rv) => Y0 + (rMax-rv)/(rMax-rMin)*(Y1-Y0);

    // Draw curves
    const N = 240;
    function curve(color, GG, TT){
      ctx.strokeStyle = color;
      ctx.lineWidth = 3*dpr;
      ctx.beginPath();
      for (let i=0;i<=N;i++){
        const rr = rMin + (i/N)*(rMax-rMin);
        const YY = Yis(rr, GG, TT);
        const x = xTo(YY), y = yTo(rr);
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
    curve(BLUE, BASE.G, BASE.T);
    curve(ORANGE, G, T);

    // Equilibrium points
    const Y0eq = Ystar(BASE.r, BASE.G, BASE.T);
    const Y1eq = Ystar(r, G, T);

    // Baseline point and dashed to both axes + labeled ticks
    const xb = xTo(Y0eq), yb = yTo(BASE.r);
    drawDot(ctx, xb, yb, BLUE, dpr);
    drawLine(ctx, xb, yb, xb, Y1, DASH, 2, dpr, [4,6]);  // to x-axis
    drawLine(ctx, xb, yb, X0, yb, DASH, 2, dpr, [4,6]);  // to y-axis
    xTick(ctx, xb, Y1, "Y₀", dpr);
    yTick(ctx, X0, yb, "r₀", dpr);

    // Current point and dashed to both axes + labeled ticks
    if (Math.abs(Y1eq - Y0eq) > 1e-6 || Math.abs(r - BASE.r) > 1e-6){
      const xc = xTo(Y1eq), yc = yTo(r);
      drawDot(ctx, xc, yc, ORANGE, dpr);
      drawLine(ctx, xc, yc, xc, Y1, DASH, 2, dpr, [4,6]);
      drawLine(ctx, xc, yc, X0, yc, DASH, 2, dpr, [4,6]);
      xTick(ctx, xc, Y1, "Y₁", dpr);
      yTick(ctx, X0, yc, "r₁", dpr);
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

  // ----- Mechanism (16 cards now) -----
  const CARDS = [
    { id:"r_up", text:"r ↑", var:"r", dir:"↑" },
    { id:"r_dn", text:"r ↓", var:"r", dir:"↓" },
    { id:"I_up", text:"I ↑", var:"I", dir:"↑" },
    { id:"I_dn", text:"I ↓", var:"I", dir:"↓" },
    { id:"G_up", text:"G ↑", var:"G", dir:"↑" },
    { id:"G_dn", text:"G ↓", var:"G", dir:"↓" },
    { id:"T_up", text:"T ↑", var:"T", dir:"↑" },
    { id:"T_dn", text:"T ↓", var:"T", dir:"↓" },
    { id:"C_up", text:"C ↑", var:"C", dir:"↑" },
    { id:"C_dn", text:"C ↓", var:"C", dir:"↓" },
    { id:"PE_up", text:"PE ↑", var:"PE", dir:"↑" },
    { id:"PE_dn", text:"PE ↓", var:"PE", dir:"↓" },
    { id:"Y_up", text:"Y ↑", var:"Y", dir:"↑" },
    { id:"Y_dn", text:"Y ↓", var:"Y", dir:"↓" },
    { id:"INV_up", text:"Unplanned inventories ↑", var:"INV", dir:"↑" },
    { id:"INV_dn", text:"Unplanned inventories ↓", var:"INV", dir:"↓" },
  ];

  function chainVars(v){
    if (v === "r") return ["r","I","PE","INV","Y"];
    if (v === "T") return ["T","C","PE","INV","Y"];
    return ["G","PE","INV","Y"];
  }

  function expected(v, sign){
    if (v === "r"){
      return sign==="↑"
        ? { r:"↑", I:"↓", PE:"↓", INV:"↑", Y:"↓" }
        : { r:"↓", I:"↑", PE:"↑", INV:"↓", Y:"↑" };
    }
    if (v === "T"){
      return sign==="↑"
        ? { T:"↑", C:"↓", PE:"↓", INV:"↑", Y:"↓" }
        : { T:"↓", C:"↑", PE:"↑", INV:"↓", Y:"↑" };
    }
    return sign==="↑"
      ? { G:"↑", PE:"↑", INV:"↓", Y:"↑" }
      : { G:"↓", PE:"↓", INV:"↑", Y:"↓" };
  }

  const chainState = {}; // slotIndex -> cardId

  function renderMechFeedback(html){
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
    Object.keys(chainState).forEach(k => delete chainState[k]);
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

        chainState[slot.dataset.slotIndex] = id;
        slot.textContent = card.text;
        slot.classList.add("filled");
        renderMechFeedback("");
      });
    });
  }

  function clearChain(){
    Object.keys(chainState).forEach(k => delete chainState[k]);
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

    const slots = Array.from(els.chain.querySelectorAll(".slot"));
    for (const s of slots){
      if (!chainState[s.dataset.slotIndex]){
        renderMechFeedback(`<span class="tagBad">Incomplete</span> Fill all blanks, then check.`);
        return;
      }
    }

    let ok = true;
    for (const s of slots){
      const varName = s.dataset.var;
      const cardId = chainState[s.dataset.slotIndex];
      const card = CARDS.find(c => c.id === cardId);
      if (!need[varName] || !card || card.var !== varName || card.dir !== need[varName]) {
        ok = false; break;
      }
    }

    if (ok){
      renderMechFeedback(`<span class="tagOK">Correct</span> Great — that mechanism matches the shock.`);
    } else {
      renderMechFeedback(`<span class="tagBad">Not quite</span> One or more links are incorrect. Try again.`);
    }
  }

  // ----- Scenario (resets to baseline, then announces shock direction only) -----
  function newScenario(){
    // reset values to baseline
    r = BASE.r; G = BASE.G; T = BASE.T;
    syncSliders();

    clearChain();
    renderMechFeedback("");

    const vars = ["r","G","T"];
    const v = vars[Math.floor(Math.random()*vars.length)];
    const delta = DATA.shocks[v][Math.floor(Math.random()*DATA.shocks[v].length)];
    shock = { var: v, delta };

    const dir = delta > 0 ? "↑" : "↓";
    els.scenarioTitle.textContent = "Scenario shock";
    els.scenarioDesc.textContent =
      `A policy variable changes:\n${v} ${dir}\n\nUse sliders to apply the shock, then build the chain.`;

    els.mechPrompt.textContent = `Build the mechanism chain for the ${v}-shock.`;
    buildPile();
    buildChain(v);

    setStatus("Scenario generated. Sliders reset to baseline.");
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

  // ----- Sliders -----
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

  // Wire up
  els.rSlider.addEventListener("input", onSlider);
  els.gSlider.addEventListener("input", onSlider);
  els.tSlider.addEventListener("input", onSlider);

  els.newBtn.addEventListener("click", newScenario);
  els.resetBtn.addEventListener("click", resetAll);
  els.checkMechBtn.addEventListener("click", checkMechanism);
  els.clearMechBtn.addEventListener("click", clearChain);

  window.addEventListener("resize", drawAll);

  // init
  syncSliders();
  setStatus("Ready.");
  drawAll();
})();
