// app.js
window.addEventListener("DOMContentLoaded", () => {
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

  const DATA = window.KCIS_DATA;
  if (!DATA) { els.status.textContent = "ERROR: data.js not loaded."; return; }

  const P = DATA.params;

  // Baseline
  const BASE = { ...DATA.baseline };

  // Current policy variables (student-controlled sliders)
  let r = BASE.r;
  let G = BASE.G;
  let T = BASE.T;

  // Scenario shock (target values) - does NOT move sliders
  let currentShock = null; // { var, delta, target }

  // Mechanism chain state: slotKey -> cardId (string)
  const chainState = {};

  // Colors (baseline blue, current orange)
  const BLUE = "rgba(31,119,180,0.92)";
  const ORANGE = "rgba(230,159,0,0.95)";
  const GHOST = "rgba(0,0,0,0.18)";

  function setStatus(msg){ els.status.textContent = msg; }
  function fmt(x){ return (Number.isFinite(x) ? x.toFixed(2) : "—"); }
  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

  // ---------- Core model ----------
  function Iof(rr){ return P.I0 - P.b * rr; }
  function Cof(Y, TT){ return P.C0 + P.MPC*(Y - TT); }
  function PEof(Y, rr, GG, TT){ return Cof(Y, TT) + Iof(rr) + GG; }

  function Ystar(rr, GG, TT){
    const num = P.C0 - P.MPC*TT + Iof(rr) + GG;
    const den = (1 - P.MPC);
    return num / den;
  }

  function Yis(rr, GG, TT){ return Ystar(rr, GG, TT); }

  // ---------- Mechanism templates ----------
  // Build chain nodes depending on shock variable
  function chainForShock(shockVar){
    if (shockVar === "r"){
      return [
        { key:"r",  label:"r" },
        { key:"I",  label:"I" },
        { key:"PE", label:"PE" },
        { key:"INV",label:"Inventories" },
        { key:"Y",  label:"Y" }
      ];
    }
    if (shockVar === "T"){
      return [
        { key:"T",  label:"T" },
        { key:"C",  label:"C" },
        { key:"PE", label:"PE" },
        { key:"INV",label:"Inventories" },
        { key:"Y",  label:"Y" }
      ];
    }
    // G
    return [
      { key:"G",  label:"G" },
      { key:"PE", label:"PE" },
      { key:"INV",label:"Inventories" },
      { key:"Y",  label:"Y" }
    ];
  }

  // Card set (pile options)
  const CARD_BANK = [
    // policy vars
    { id:"r_up",  text:"r ↑",  var:"r", dir:"↑" },
    { id:"r_dn",  text:"r ↓",  var:"r", dir:"↓" },
    { id:"G_up",  text:"G ↑",  var:"G", dir:"↑" },
    { id:"G_dn",  text:"G ↓",  var:"G", dir:"↓" },
    { id:"T_up",  text:"T ↑",  var:"T", dir:"↑" },
    { id:"T_dn",  text:"T ↓",  var:"T", dir:"↓" },

    // endogenous links
    { id:"I_up",  text:"I ↑",  var:"I", dir:"↑" },
    { id:"I_dn",  text:"I ↓",  var:"I", dir:"↓" },

    { id:"C_up",  text:"C ↑",  var:"C", dir:"↑" },
    { id:"C_dn",  text:"C ↓",  var:"C", dir:"↓" },

    { id:"PE_up", text:"PE ↑", var:"PE", dir:"↑" },
    { id:"PE_dn", text:"PE ↓", var:"PE", dir:"↓" },

    { id:"INV_up",text:"Inventories ↑", var:"INV", dir:"↑" },
    { id:"INV_dn",text:"Inventories ↓", var:"INV", dir:"↓" },

    { id:"Y_up",  text:"Y ↑",  var:"Y", dir:"↑" },
    { id:"Y_dn",  text:"Y ↓",  var:"Y", dir:"↓" },
  ];

  function buildPileForShock(shockVar){
    els.pile.innerHTML = "";
    const neededVars = new Set(chainForShock(shockVar).map(n => n.key));
    // we allow PE/INV/Y always; plus shock-specific links
    const allow = (c) => neededVars.has(c.var);
    const cards = CARD_BANK.filter(allow);

    // duplicate each card twice for easy dragging
    const expanded = [];
    for (const c of cards){ expanded.push(c, c); }
    shuffle(expanded);

    for (const c of expanded){
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

  function buildChainUI(shockVar){
    els.chain.innerHTML = "";
    Object.keys(chainState).forEach(k => delete chainState[k]);

    const nodes = chainForShock(shockVar);

    nodes.forEach((n, idx) => {
      const node = document.createElement("div");
      node.className = "node";
      node.innerHTML = `<div class="lbl">${n.label}</div><div class="slot" data-slot="${n.key}">drop</div>`;
      els.chain.appendChild(node);

      if (idx < nodes.length-1){
        const arrow = document.createElement("div");
        arrow.className = "arrow";
        arrow.textContent = "→";
        els.chain.appendChild(arrow);
      }
    });

    setupSlots();
  }

  function setupSlots(){
    const slots = els.chain.querySelectorAll(".slot");
    slots.forEach(slot => {
      slot.addEventListener("dragover", (ev) => { ev.preventDefault(); slot.classList.add("dragover"); });
      slot.addEventListener("dragleave", () => slot.classList.remove("dragover"));
      slot.addEventListener("drop", (ev) => {
        ev.preventDefault();
        slot.classList.remove("dragover");
        const id = ev.dataTransfer.getData("text/plain");
        const card = CARD_BANK.find(c => c.id === id);
        if (!card) return;

        const key = slot.dataset.slot;
        // enforce correct variable type for slot (e.g., INV slot must get INV_* card)
        if (card.var !== key) return;

        chainState[key] = id;
        slot.textContent = card.text;
        slot.classList.add("filled");
        renderMechFeedback("");
      });
    });
  }

  function clearChain(){
    const slots = els.chain.querySelectorAll(".slot");
    slots.forEach(slot => {
      slot.textContent = "drop";
      slot.classList.remove("filled");
    });
    Object.keys(chainState).forEach(k => delete chainState[k]);
    renderMechFeedback("");
  }

  function renderMechFeedback(html){
    if (!html){
      els.mechFeedback.style.display = "none";
      els.mechFeedback.innerHTML = "";
      return;
    }
    els.mechFeedback.style.display = "block";
    els.mechFeedback.innerHTML = html;
  }

  function expectedMechanism(shockVar, deltaSign){
    // deltaSign is ↑ or ↓ for the shocked variable
    // return mapping slotKey -> direction symbol (↑/↓)
    if (shockVar === "r"){
      // r↑ -> I↓ -> PE↓ -> INV↑ -> Y↓ ; r↓ opposite
      if (deltaSign === "↑") return { r:"↑", I:"↓", PE:"↓", INV:"↑", Y:"↓" };
      return { r:"↓", I:"↑", PE:"↑", INV:"↓", Y:"↑" };
    }
    if (shockVar === "T"){
      // T↑ -> C↓ -> PE↓ -> INV↑ -> Y↓ ; T↓ opposite
      if (deltaSign === "↑") return { T:"↑", C:"↓", PE:"↓", INV:"↑", Y:"↓" };
      return { T:"↓", C:"↑", PE:"↑", INV:"↓", Y:"↑" };
    }
    // G
    // G↑ -> PE↑ -> INV↓ -> Y↑ ; G↓ opposite
    if (deltaSign === "↑") return { G:"↑", PE:"↑", INV:"↓", Y:"↑" };
    return { G:"↓", PE:"↓", INV:"↑", Y:"↓" };
  }

  function checkMechanism(){
    if (!currentShock){
      renderMechFeedback(`<span class="tagBad">No scenario</span> Click <strong>New Scenario</strong> first.`);
      return;
    }
    // Determine sign from shock
    const sign = currentShock.delta > 0 ? "↑" : "↓";
    const needed = expectedMechanism(currentShock.var, sign);

    // Ensure all required slots filled
    for (const k of Object.keys(needed)){
      if (!chainState[k]){
        renderMechFeedback(`<span class="tagBad">Incomplete</span> Fill all blanks in the chain, then check.`);
        return;
      }
    }

    const wrong = [];
    for (const [k,dir] of Object.entries(needed)){
      const card = CARD_BANK.find(c => c.id === chainState[k]);
      if (!card || card.dir !== dir) wrong.push(k);
    }

    if (!wrong.length){
      renderMechFeedback(`<span class="tagOK">Correct</span> Nice — that chain matches the mechanism for this shock.`);
      return;
    }

    const nice = (k) => (k==="INV" ? "Inventories" : k);
    const correctTxt = wrong.map(k => `${nice(k)} should be <strong>${needed[k]}</strong>`).join(", ");
    renderMechFeedback(`<span class="tagBad">Not quite</span> ${correctTxt}.`);
  }

  // ---------- Scenario generation ----------
  function newScenario(){
    // Do NOT change sliders. Just announce a shock and set target.
    clearChain();
    renderMechFeedback("");

    const vars = ["r","G","T"];
    const v = vars[Math.floor(Math.random()*vars.length)];
    const deltas = DATA.shocks[v];
    const delta = deltas[Math.floor(Math.random()*deltas.length)];

    currentShock = { var: v, delta, target: BASE[v] + delta };

    const word = delta > 0 ? "increases" : "decreases";
    els.scenarioTitle.textContent = "Scenario shock";
    els.scenarioDesc.textContent =
      `A policy variable changes:\n` +
      `${v} ${word} (Δ${v} = ${delta}).\n\n` +
      `Sliders are still at baseline. Use sliders to apply the shock, then build the mechanism.`;

    // Build mechanism UI specific to this shock
    buildPileForShock(v);
    buildChainUI(v);

    els.mechPrompt.textContent =
      `Fill the blanks for the ${v}-shock mechanism. Drag the matching direction cards into the chain.`;

    setStatus("Apply the shock with sliders, then build the chain and click Check Mechanism.");
    renderAll();
  }

  function resetAll(){
    currentShock = null;
    r = BASE.r; G = BASE.G; T = BASE.T;
    syncSliders();
    clearChain();
    renderMechFeedback("");
    els.scenarioTitle.textContent = "Scenario";
    els.scenarioDesc.textContent = "Click “New Scenario” to start.";
    els.mechPrompt.textContent = "Click New Scenario to generate a shock.";
    // reset pile/chain to default empty
    els.pile.innerHTML = "";
    els.chain.innerHTML = "";
    renderAll();
    setStatus("Reset to baseline.");
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
    renderAll();
  }

  // ---------- Drawing ----------
  function setupCanvas(canvas){
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth * dpr;
    const H = canvas.clientHeight * dpr;
    if (canvas.width !== W || canvas.height !== H){ canvas.width=W; canvas.height=H; }
    return { ctx, W, H, dpr };
  }

  function drawAxes(ctx, W, H, dpr, xLabel, yLabel){
    const pad = { l: 58*dpr, r: 14*dpr, t: 14*dpr, b: 50*dpr };
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
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText(xLabel, (X0+X1)/2, Y1 + 20*dpr);

    ctx.save();
    ctx.translate(X0 - 46*dpr, (Y0+Y1)/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    return { X0, X1, Y0, Y1 };
  }

  function line(ctx, x1,y1,x2,y2, stroke, lw, dpr, dash=null){
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw*dpr;
    if (dash) ctx.setLineDash(dash.map(v=>v*dpr)); else ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    ctx.setLineDash([]);
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
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText(label, x, Y1 + 8*dpr);
  }

  function yTick(ctx, X0, y, label, dpr){
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2*dpr;
    ctx.beginPath(); ctx.moveTo(X0-6*dpr, y); ctx.lineTo(X0, y); ctx.stroke();

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign="right"; ctx.textBaseline="middle";
    ctx.fillText(label, X0 - 10*dpr, y);
  }

  function drawKC(){
    const { ctx, W, H, dpr } = setupCanvas(els.kcCanvas);
    ctx.clearRect(0,0,W,H);

    const { X0,X1,Y0,Y1 } = drawAxes(ctx,W,H,dpr,"Output (Y)","Planned Expenditure (PE)");

    const Ymin = 0, Ymax = 900;
    const xTo = (Y) => X0 + (Y-Ymin)/(Ymax-Ymin)*(X1-X0);
    const yTo = (PE) => Y0 + (Ymax-PE)/(Ymax-Ymin)*(Y1-Y0);

    // 45 line
    line(ctx, xTo(Ymin), yTo(Ymin), xTo(Ymax), yTo(Ymax), "rgba(0,0,0,0.65)", 3, dpr);

    // Baseline PE (blue)
    const Ab = P.C0 - P.MPC*BASE.T + Iof(BASE.r) + BASE.G;
    const PEb0 = Ab + P.MPC*Ymin;
    const PEb1 = Ab + P.MPC*Ymax;
    line(ctx, xTo(Ymin), yTo(PEb0), xTo(Ymax), yTo(PEb1), BLUE, 3, dpr);

    // Current PE (orange)
    const Ac = P.C0 - P.MPC*T + Iof(r) + G;
    const PEc0 = Ac + P.MPC*Ymin;
    const PEc1 = Ac + P.MPC*Ymax;
    line(ctx, xTo(Ymin), yTo(PEc0), xTo(Ymax), yTo(PEc1), ORANGE, 3, dpr);

    // Equilibria
    const Y0eq = Ystar(BASE.r, BASE.G, BASE.T);
    const Y1eq = Ystar(r, G, T);

    // baseline point
    dot(ctx, xTo(Y0), yTo(Y0), BLUE, dpr);
    line(ctx, xTo(Y0), yTo(Ymin), xTo(Y0), yTo(Y0), "rgba(0,0,0,0.25)", 2, dpr, [4,6]);
    xTick(ctx, xTo(Y0), Y1, "Y₀", dpr);

    // current point + label if changed
    if (Math.abs(Y1v - Y0) > 1e-6){
      dot(ctx, xTo(Y1v), yTo(Y1v), ORANGE, dpr);
      line(ctx, xTo(Y1v), yTo(Ymin), xTo(Y1v), yTo(Y1v), "rgba(0,0,0,0.25)", 2, dpr, [4,6]);
      xTick(ctx, xTo(Y1v), Y1, "Y₁", dpr);

      ctx.fillStyle = "rgba(0,0,0,0.70)";
      ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
      ctx.textAlign="left"; ctx.textBaseline="bottom";
      ctx.fillText(`New equilibrium`, xTo(Y1v) + 8*dpr, yTo(Y1v) - 6*dpr);
    }
  }

  function drawIS(){
    const { ctx, W, H, dpr } = setupCanvas(els.isCanvas);
    ctx.clearRect(0,0,W,H);

    const { X0,X1,Y0,Y1 } = drawAxes(ctx,W,H,dpr,"Output (Y)","Interest rate (r)");

    const rMin = DATA.ranges.r.min;
    const rMax = DATA.ranges.r.max;
    const Ymin = 0, Ymax = 900;

    const xTo = (Y) => X0 + (Y-Ymin)/(Ymax-Ymin)*(X1-X0);
    const yTo = (rr) => Y0 + (rMax-rr)/(rMax-rMin)*(Y1-Y0);

    // y-axis ticks for r
    for (const rr of [0,2,4,6,8,10]){
      yTick(ctx, X0, yTo(rr), rr.toFixed(0), dpr);
    }

    // Baseline IS (blue): varies r, baseline G,T
    const N = 120;
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    for (let i=0;i<=N;i++){
      const rr = rMin + (i/N)*(rMax-rMin);
      const YY = Yis(rr, BASE.G, BASE.T);
      const x = xTo(YY), y = yTo(rr);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    // Current IS (orange): varies r, current G,T
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    for (let i=0;i<=N;i++){
      const rr = rMin + (i/N)*(rMax-rMin);
      const YY = Yis(rr, G, T);
      const x = xTo(YY), y = yTo(rr);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    // Equilibrium points at current r
    const Y0eq = Ystar(BASE.r, BASE.G, BASE.T);
    const Y1eq = Ystar(r, G, T);

    // Baseline point (at baseline r)
    dot(ctx, xTo(Y0), yTo(BASE.r), BLUE, dpr);
    xTick(ctx, xTo(Y0), Y1, "Y₀", dpr);

    // Current point (at current r)
    if (Math.abs(Y1v - Y0) > 1e-6 || Math.abs(r - BASE.r) > 1e-6){
      dot(ctx, xTo(Y1v), yTo(r), ORANGE, dpr);
      xTick(ctx, xTo(Y1v), Y1, "Y₁", dpr);

      ctx.fillStyle = "rgba(0,0,0,0.70)";
      ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
      ctx.textAlign="left"; ctx.textBaseline="bottom";
      ctx.fillText(`New equilibrium`, xTo(Y1v) + 8*dpr, yTo(r) - 6*dpr);
    }
  }

  function renderStats(){
    const Y0v = Ystar(BASE.r, BASE.G, BASE.T);
    const Y1v = Ystar(r,G,T);
    els.y0.textContent = fmt(Y0v);
    els.y1.textContent = fmt(Y1v);
  }

  function renderAll(){
    renderStats();
    drawKC();
    drawIS();
  }

  // ---------- Utilities ----------
  function shuffle(a){
    for (let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  // ---------- Init ----------
  function init(){
    // sliders start at baseline
    els.rSlider.value = String(BASE.r);
    els.gSlider.value = String(BASE.G);
    els.tSlider.value = String(BASE.T);

    r = BASE.r; G = BASE.G; T = BASE.T;
    syncSliders();

    renderAll();
    setStatus("Ready.");
  }

  // Events
  els.rSlider.addEventListener("input", onSlider);
  els.gSlider.addEventListener("input", onSlider);
  els.tSlider.addEventListener("input", onSlider);

  els.newBtn.addEventListener("click", newScenario);
  els.resetBtn.addEventListener("click", resetAll);
  els.checkMechBtn.addEventListener("click", checkMechanism);
  els.clearMechBtn.addEventListener("click", clearChain);

  init();
});
