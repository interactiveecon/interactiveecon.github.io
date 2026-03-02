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
  if (!DATA) { els.status.textContent = "ERROR: data.js not loaded (KCIS_DATA missing)."; return; }
  const P = DATA.params;

  const BASE = { ...DATA.baseline };

  let r = BASE.r, G = BASE.G, T = BASE.T;
  let currentShock = null; // {var, delta, target}

  const BLUE = "rgba(31,119,180,0.92)";
  const ORANGE = "rgba(230,159,0,0.95)";

  function setStatus(msg){ els.status.textContent = msg; }
  function fmt(x){ return (Number.isFinite(x) ? x.toFixed(2) : "—"); }
  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

  // ---------- Model ----------
  function Iof(rr){ return P.I0 - P.b * rr; }
  function Ystar(rr, GG, TT){
    const num = P.C0 - P.MPC*TT + Iof(rr) + GG;
    return num / (1 - P.MPC);
  }
  function Yis(rr, GG, TT){ return Ystar(rr, GG, TT); }

  // ---------- Mechanism ----------
  const CARD_BANK = [
    { id:"r_up",  text:"r ↑",  var:"r", dir:"↑" },
    { id:"r_dn",  text:"r ↓",  var:"r", dir:"↓" },
    { id:"G_up",  text:"G ↑",  var:"G", dir:"↑" },
    { id:"G_dn",  text:"G ↓",  var:"G", dir:"↓" },
    { id:"T_up",  text:"T ↑",  var:"T", dir:"↑" },
    { id:"T_dn",  text:"T ↓",  var:"T", dir:"↓" },
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

  function chainForShock(v){
    if (v === "r") return ["r","I","PE","INV","Y"];
    if (v === "T") return ["T","C","PE","INV","Y"];
    return ["G","PE","INV","Y"];
  }

  function expectedMechanism(v, sign){
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
    // G
    return sign==="↑"
      ? { G:"↑", PE:"↑", INV:"↓", Y:"↑" }
      : { G:"↓", PE:"↓", INV:"↑", Y:"↓" };
  }

  const chainState = {}; // slot -> cardId

  function buildPileForShock(v){
    els.pile.innerHTML = "";
    const needed = new Set(chainForShock(v));
    const cards = CARD_BANK.filter(c => needed.has(c.var));

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

  function buildChainUI(v){
    els.chain.innerHTML = "";
    for (const k of Object.keys(chainState)) delete chainState[k];

    const seq = chainForShock(v);
    seq.forEach((key, idx) => {
      const node = document.createElement("div");
      node.className = "node";
      node.innerHTML = `<div class="lbl">${key==="INV" ? "Inventories" : key}</div>
                        <div class="slot" data-slot="${key}">drop</div>`;
      els.chain.appendChild(node);

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
        if (card.var !== key) return; // enforce variable match

        chainState[key] = id;
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

  function renderMechFeedback(html){
    if (!html){ els.mechFeedback.style.display="none"; els.mechFeedback.innerHTML=""; return; }
    els.mechFeedback.style.display="block";
    els.mechFeedback.innerHTML = html;
  }

  function checkMechanism(){
    if (!currentShock){
      renderMechFeedback(`<span class="tagBad">No scenario</span> Click <strong>New Scenario</strong> first.`);
      return;
    }
    const sign = currentShock.delta > 0 ? "↑" : "↓";
    const need = expectedMechanism(currentShock.var, sign);

    for (const k of Object.keys(need)){
      if (!chainState[k]){
        renderMechFeedback(`<span class="tagBad">Incomplete</span> Fill all blanks in the chain, then check.`);
        return;
      }
    }

    const wrong = [];
    for (const [k,dir] of Object.entries(need)){
      const card = CARD_BANK.find(c => c.id === chainState[k]);
      if (!card || card.dir !== dir) wrong.push(k);
    }

    if (!wrong.length){
      renderMechFeedback(`<span class="tagOK">Correct</span> Great — that matches the mechanism for this shock.`);
      return;
    }

    const nice = (k)=> k==="INV" ? "Inventories" : k;
    const msg = wrong.map(k => `${nice(k)} should be <strong>${need[k]}</strong>`).join(", ");
    renderMechFeedback(`<span class="tagBad">Not quite</span> ${msg}.`);
  }

  // ---------- Scenarios ----------
  function newScenario(){
    clearChain();
    renderMechFeedback("");

    const vars = ["r","G","T"];
    const v = vars[Math.floor(Math.random()*vars.length)];
    const delta = DATA.shocks[v][Math.floor(Math.random()*DATA.shocks[v].length)];
    currentShock = { var: v, delta, target: BASE[v] + delta };

    const word = delta > 0 ? "increases" : "decreases";
    els.scenarioTitle.textContent = "Scenario shock";
    els.scenarioDesc.textContent =
      `A policy variable changes:\n` +
      `${v} ${word} (Δ${v} = ${delta}).\n\n` +
      `Sliders are still at baseline. Use sliders to apply the shock, then build the mechanism.`;

    buildPileForShock(v);
    buildChainUI(v);
    els.mechPrompt.textContent = `Fill the ${v}-shock mechanism chain using the cards.`;

    setStatus("Sliders are baseline. Apply the shock with sliders, then check the chain.");
    renderAll();
  }

  function resetAll(){
    currentShock = null;
    r = BASE.r; G = BASE.G; T = BASE.T;
    syncSliders();
    clearChain();
    renderMechFeedback("");

    els.pile.innerHTML = "";
    els.chain.innerHTML = "";
    els.scenarioTitle.textContent = "Scenario";
    els.scenarioDesc.textContent = "Click “New Scenario” to start.";
    els.mechPrompt.textContent = "Click New Scenario to generate a shock.";
    setStatus("Reset to baseline.");
    renderAll();
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
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
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

    const { X0,X1,Y0p,Y1p } = drawAxes(ctx,W,H,dpr,"Output (Y)","Planned Expenditure (PE)");

    const Ymin = 0, Ymax = 900;
    const xTo = (Y) => X0 + (Y-Ymin)/(Ymax-Ymin)*(X1-X0);
    const yTo = (PE) => Y0p + (Ymax-PE)/(Ymax-Ymin)*(Y1p-Y0p);

    // 45 line
    line(ctx, xTo(Ymin), yTo(Ymin), xTo(Ymax), yTo(Ymax), "rgba(0,0,0,0.65)", 3, dpr);

    // PE lines: PE = A + MPC*Y
    const Ab = P.C0 - P.MPC*BASE.T + Iof(BASE.r) + BASE.G;
    const Ac = P.C0 - P.MPC*T + Iof(r) + G;

    line(ctx, xTo(Ymin), yTo(Ab + P.MPC*Ymin), xTo(Ymax), yTo(Ab + P.MPC*Ymax), BLUE, 3, dpr);
    line(ctx, xTo(Ymin), yTo(Ac + P.MPC*Ymin), xTo(Ymax), yTo(Ac + P.MPC*Ymax), ORANGE, 3, dpr);

    const Y0eq = Ystar(BASE.r, BASE.G, BASE.T);
    const Y1eq = Ystar(r, G, T);

    // baseline equilibrium marker + x tick
    dot(ctx, xTo(Y0eq), yTo(Y0eq), BLUE, dpr);
    xTick(ctx, xTo(Y0eq), Y1p, "Y₀", dpr);

    // new equilibrium marker + x tick + label (if changed)
    const changed = (Math.abs(Y1eq - Y0eq) > 1e-6);
    if (changed){
      dot(ctx, xTo(Y1eq), yTo(Y1eq), ORANGE, dpr);
      xTick(ctx, xTo(Y1eq), Y1p, "Y₁", dpr);

      ctx.fillStyle = "rgba(0,0,0,0.70)";
      ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
      ctx.textAlign="left"; ctx.textBaseline="bottom";
      ctx.fillText("New equilibrium", xTo(Y1eq)+8*dpr, yTo(Y1eq)-6*dpr);
    }
  }

  function drawIS(){
    const { ctx, W, H, dpr } = setupCanvas(els.isCanvas);
    ctx.clearRect(0,0,W,H);

    const { X0,X1,Y0p,Y1p } = drawAxes(ctx,W,H,dpr,"Output (Y)","Interest rate (r)");

    const rMin = DATA.ranges.r.min;
    const rMax = DATA.ranges.r.max;
    const Ymin = 0, Ymax = 900;

    const xTo = (Y) => X0 + (Y-Ymin)/(Ymax-Ymin)*(X1-X0);
    const yTo = (rr) => Y0p + (rMax-rr)/(rMax-rMin)*(Y1p-Y0p);

    // y-axis labeled ticks for r
    for (const rr of [0,2,4,6,8,10]){
      yTick(ctx, X0, yTo(rr), rr.toString(), dpr);
    }

    // Plot baseline IS (blue) and current IS (orange)
    const N = 160;
    function drawISCurve(color, GG, TT){
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
    drawISCurve(BLUE, BASE.G, BASE.T);
    drawISCurve(ORANGE, G, T);

    // Equilibrium points:
    const Y0eq = Ystar(BASE.r, BASE.G, BASE.T);
    const Y1eq = Ystar(r, G, T);

    dot(ctx, xTo(Y0eq), yTo(BASE.r), BLUE, dpr);
    xTick(ctx, xTo(Y0eq), Y1p, "Y₀", dpr);

    const changed = (Math.abs(Y1eq - Y0eq) > 1e-6) || (Math.abs(r - BASE.r) > 1e-6);
    if (changed){
      dot(ctx, xTo(Y1eq), yTo(r), ORANGE, dpr);
      xTick(ctx, xTo(Y1eq), Y1p, "Y₁", dpr);

      ctx.fillStyle = "rgba(0,0,0,0.70)";
      ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
      ctx.textAlign="left"; ctx.textBaseline="bottom";
      ctx.fillText("New equilibrium", xTo(Y1eq)+8*dpr, yTo(r)-6*dpr);
    }
  }

  function renderStats(){
    const Y0eq = Ystar(BASE.r, BASE.G, BASE.T);
    const Y1eq = Ystar(r, G, T);
    els.y0.textContent = fmt(Y0eq);
    els.y1.textContent = fmt(Y1eq);
  }

  function renderAll(){
    renderStats();
    drawKC();
    drawIS();
  }

  // ---------- Utils ----------
  function shuffle(a){
    for (let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  // ---------- Init ----------
  function init(){
    // baseline slider values
    r = BASE.r; G = BASE.G; T = BASE.T;
    els.rSlider.value = String(r);
    els.gSlider.value = String(G);
    els.tSlider.value = String(T);
    syncSliders();

    renderAll();
    setStatus("Ready.");
  }

  els.rSlider.addEventListener("input", onSlider);
  els.gSlider.addEventListener("input", onSlider);
  els.tSlider.addEventListener("input", onSlider);

  els.newBtn.addEventListener("click", newScenario);
  els.resetBtn.addEventListener("click", resetAll);
  els.checkMechBtn.addEventListener("click", checkMechanism);
  els.clearMechBtn.addEventListener("click", clearChain);

  init();
});
