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

    rSlider: $("rSlider"),
    gSlider: $("gSlider"),
    tSlider: $("tSlider"),
    rVal: $("rVal"),
    gVal: $("gVal"),
    tVal: $("tVal"),

    yStarKC: $("yStarKC"),
    yStarIS: $("yStarIS"),
    peAtY: $("peAtY"),

    pile: $("pile"),
    chain: $("chain"),
    mechFeedback: $("mechFeedback"),

    kcCanvas: $("kcCanvas"),
    isCanvas: $("isCanvas"),
  };

  const DATA = window.KCIS_DATA;
  if (!DATA) { els.status.textContent = "ERROR: data.js not loaded."; return; }

  const P = DATA.params;

  // Current policy variables
  let r = DATA.baseline.r;
  let G = DATA.baseline.G;
  let T = DATA.baseline.T;

  // Active scenario shock info
  let currentShock = null; // { var: 'r'|'G'|'T', delta: number, from: baselineValue, to: baselineValue+delta }

  // Mechanism chain selections: slot -> value ('↑','↓','—')
  const chainState = { r:null, I:null, PE:null, INV:null, Y:null };

  // ---------- Core model ----------
  // I(r) = I0 - b*r
  function Iof(r){ return P.I0 - P.b * r; }

  // Planned Expenditure PE(Y) = C0 + MPC*(Y - T) + I(r) + G
  function PEof(Y, r, G, T){
    return P.C0 + P.MPC*(Y - T) + Iof(r) + G;
  }

  // Keynesian Cross equilibrium: Y = PE(Y) -> solve analytically
  // Y = C0 + MPC*(Y - T) + I + G
  // Y - MPC*Y = C0 - MPC*T + I + G
  // Y* = (C0 - MPC*T + I + G) / (1 - MPC)
  function Ystar(r, G, T){
    const num = P.C0 - P.MPC*T + Iof(r) + G;
    const den = (1 - P.MPC);
    return num / den;
  }

  // IS curve implied: Y(r) = Ystar(r,G,T) for given G,T
  // We'll plot over r grid.
  function Yis(rr){ return Ystar(rr, G, T); }

  // ---------- UI helpers ----------
  function setStatus(msg){ els.status.textContent = msg; }
  function fmt(x){ return (Number.isFinite(x) ? x.toFixed(2) : "—"); }

  function syncSliders(){
    els.rSlider.value = String(r);
    els.gSlider.value = String(G);
    els.tSlider.value = String(T);
    els.rVal.textContent = fmt(r);
    els.gVal.textContent = fmt(G);
    els.tVal.textContent = fmt(T);
  }

  // ---------- Scenario generation ----------
  function newScenario(){
    // reset to baseline first (so students see the shock cleanly)
    r = DATA.baseline.r;
    G = DATA.baseline.G;
    T = DATA.baseline.T;
    syncSliders();

    // pick variable
    const vars = ["r","G","T"];
    const v = vars[Math.floor(Math.random()*vars.length)];
    const deltas = DATA.shocks[v];
    const delta = deltas[Math.floor(Math.random()*deltas.length)];

    const from = DATA.baseline[v];
    const to = from + delta;

    currentShock = { var: v, delta, from, to };

    // apply shock to the model value (and slider)
    if (v === "r") r = clamp(to, DATA.ranges.r.min, DATA.ranges.r.max);
    if (v === "G") G = clamp(to, DATA.ranges.G.min, DATA.ranges.G.max);
    if (v === "T") T = clamp(to, DATA.ranges.T.min, DATA.ranges.T.max);

    syncSliders();
    clearChain();
    renderAll();

    const arrow = delta > 0 ? "increases" : "decreases";
    els.scenarioTitle.textContent = "Scenario shock";
    els.scenarioDesc.textContent =
      `One variable changed:\n` +
      `${v} ${arrow} (Δ${v} = ${delta}).\n\n` +
      `Now use the mechanism chain (r → I → PE → inventories → Y) to explain why output changes.`;
    setStatus("Build the mechanism, then click Check Mechanism.");
  }

  function resetAll(){
    currentShock = null;
    r = DATA.baseline.r;
    G = DATA.baseline.G;
    T = DATA.baseline.T;
    syncSliders();
    clearChain();
    els.scenarioTitle.textContent = "Scenario";
    els.scenarioDesc.textContent = "Click “New Scenario” to start.";
    els.mechFeedback.style.display = "none";
    els.mechFeedback.innerHTML = "";
    renderAll();
    setStatus("Reset to baseline.");
  }

  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

  // ---------- Mechanism cards ----------
  const CARD_VALUES = ["↑","↓","—"];

  function buildPile(){
    els.pile.innerHTML = "";
    // multiple copies to make dragging easy
    const cards = [];
    for (const v of CARD_VALUES){
      for (let k=0;k<4;k++) cards.push(v);
    }
    shuffle(cards);

    for (const v of cards){
      const el = document.createElement("div");
      el.className = "mcard";
      el.textContent = v;
      el.draggable = true;
      el.dataset.val = v;
      el.addEventListener("dragstart", (ev) => {
        ev.dataTransfer.setData("text/plain", v);
        ev.dataTransfer.effectAllowed = "move";
      });
      els.pile.appendChild(el);
    }
  }

  function setupSlots(){
    const slots = els.chain.querySelectorAll(".slot");
    slots.forEach(slot => {
      slot.addEventListener("dragover", (ev) => {
        ev.preventDefault();
        slot.classList.add("dragover");
      });
      slot.addEventListener("dragleave", () => slot.classList.remove("dragover"));
      slot.addEventListener("drop", (ev) => {
        ev.preventDefault();
        slot.classList.remove("dragover");
        const v = ev.dataTransfer.getData("text/plain");
        const key = slot.dataset.slot;

        if (!CARD_VALUES.includes(v)) return;

        chainState[key] = v;
        slot.textContent = v;
        slot.classList.add("filled");
        renderMechFeedback(""); // clear
      });
    });
  }

  function clearChain(){
    for (const k of Object.keys(chainState)) chainState[k] = null;
    const slots = els.chain.querySelectorAll(".slot");
    slots.forEach(slot => {
      slot.textContent = "drop";
      slot.classList.remove("filled");
    });
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

  function checkMechanism(){
    if (!currentShock){
      renderMechFeedback(`<span class="tagBad">No scenario</span> Click <strong>New Scenario</strong> first.`);
      return;
    }

    // Determine correct directions from model (compare baseline vs current)
    const base = DATA.baseline;
    const cur = { r, G, T };

    const dr = sign3(cur.r - base.r);
    const dG = sign3(cur.G - base.G);
    const dT = sign3(cur.T - base.T);

    // r in chain is r direction itself (even if shock is G or T, r is unchanged)
    const rDir = dr;

    // Investment depends on r only
    const Ibase = Iof(base.r);
    const Icur  = Iof(cur.r);
    const IDir = sign3(Icur - Ibase); // should be opposite sign of dr generally

    // PE at a given Y: treat as autonomous shift of PE line
    // intercept A = C0 - MPC*T + I + G
    const Abase = P.C0 - P.MPC*base.T + Ibase + base.G;
    const Acur  = P.C0 - P.MPC*cur.T  + Icur  + cur.G;
    const PEDir = sign3(Acur - Abase);

    // Output equilibrium direction
    const Yb = Ystar(base.r, base.G, base.T);
    const Yc = Ystar(cur.r, cur.G, cur.T);
    const YDir = sign3(Yc - Yb);

    // Inventories direction (unplanned): depends on whether PE is below Y immediately after the shift at old Y
    // Evaluate PE_new at old Y: compare to old Y
    const PEnewAtOldY = PEof(Yb, cur.r, cur.G, cur.T);
    // If PE_new < Yb => sales < production => unplanned inventory increase
    // If PE_new > Yb => unplanned inventory decrease
    const invDir =
      (PEnewAtOldY < Yb - 1e-6) ? "↑" :
      (PEnewAtOldY > Yb + 1e-6) ? "↓" : "—";

    const correct = { r: rDir, I: IDir, PE: PEDir, INV: invDir, Y: YDir };

    // Check all filled
    for (const k of Object.keys(correct)){
      if (!chainState[k]){
        renderMechFeedback(`<span class="tagBad">Incomplete</span> Fill all blanks in the chain, then check.`);
        return;
      }
    }

    const wrong = [];
    for (const k of Object.keys(correct)){
      if (chainState[k] !== correct[k]) wrong.push(k);
    }

    if (!wrong.length){
      const expl = buildExplanation(currentShock.var, dr, dG, dT, correct);
      renderMechFeedback(`<span class="tagOK">Correct</span> ${expl}`);
      return;
    }

    const mapName = { r:"r", I:"I", PE:"PE", INV:"Inventories", Y:"Y" };
    const wrongTxt = wrong.map(k => `${mapName[k]} should be <strong>${correct[k]}</strong>`).join(", ");
    const expl = buildExplanation(currentShock.var, dr, dG, dT, correct);
    renderMechFeedback(`<span class="tagBad">Not quite</span> ${wrongTxt}.<br><br>${expl}`);
  }

  function sign3(dx){
    if (dx > 1e-6) return "↑";
    if (dx < -1e-6) return "↓";
    return "—";
  }

  function buildExplanation(shockVar, dr, dG, dT, corr){
    // concise, principles-friendly explanation keyed to the shock
    if (shockVar === "r"){
      return `Mechanism: r ${corr.r} → I ${corr.I} → PE ${corr.PE} → inventories ${corr.INV} → Y ${corr.Y}.`;
    }
    if (shockVar === "G"){
      return `Mechanism: G ${dG} shifts PE ${corr.PE}. With r unchanged (r ${corr.r}), inventories move ${corr.INV}, so output changes (Y ${corr.Y}).`;
    }
    // T
    return `Mechanism: T ${dT} changes consumption and shifts PE ${corr.PE}. With r unchanged (r ${corr.r}), inventories move ${corr.INV}, so output changes (Y ${corr.Y}).`;
  }

  function shuffle(a){
    for (let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
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
    const pad = { l: 56*dpr, r: 14*dpr, t: 14*dpr, b: 44*dpr };
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
    ctx.fillText(xLabel, (X0+X1)/2, Y1 + 16*dpr);

    ctx.save();
    ctx.translate(X0 - 44*dpr, (Y0+Y1)/2);
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

  function drawKC(){
    const { ctx, W, H, dpr } = setupCanvas(els.kcCanvas);
    ctx.clearRect(0,0,W,H);

    const { X0,X1,Y0,Y1 } = drawAxes(ctx,W,H,dpr,"Output (Y)","Planned Expenditure (PE)");

    // Plot range for Y
    const y0 = 0;
    const y1 = 900;

    const xTo = (Y) => X0 + (Y - y0)/(y1 - y0)*(X1 - X0);
    const yTo = (PE) => Y0 + (y1 - PE)/(y1 - y0)*(Y1 - Y0);

    // 45-degree line: PE=Y
    line(ctx, xTo(y0), yTo(y0), xTo(y1), yTo(y1), "rgba(0,0,0,0.70)", 3, dpr);

    // PE line: PE(Y)=A + MPC*Y
    const A = P.C0 - P.MPC*T + Iof(r) + G;
    const PE0 = A + P.MPC*y0;
    const PE1 = A + P.MPC*y1;

    // baseline ghost (using baseline G,T,r)
    const Abase = P.C0 - P.MPC*DATA.baseline.T + Iof(DATA.baseline.r) + DATA.baseline.G;
    const PE0b = Abase + P.MPC*y0;
    const PE1b = Abase + P.MPC*y1;

    line(ctx, xTo(y0), yTo(PE0b), xTo(y1), yTo(PE1b), "rgba(0,0,0,0.18)", 3, dpr);
    line(ctx, xTo(y0), yTo(PE0),  xTo(y1), yTo(PE1),  "rgba(31,119,180,0.90)", 3, dpr);

    // Equilibrium
    const Yeq = Ystar(r,G,T);
    const PEeq = Yeq;

    dot(ctx, xTo(Yeq), yTo(PEeq), "rgba(31,119,180,0.90)", dpr);

    // dashed guides
    line(ctx, xTo(Yeq), yTo(y0), xTo(Yeq), yTo(PEeq), "rgba(0,0,0,0.30)", 2, dpr, [4,6]);
    line(ctx, xTo(y0), yTo(PEeq), xTo(Yeq), yTo(PEeq), "rgba(0,0,0,0.30)", 2, dpr, [4,6]);

    // label
    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign="left"; ctx.textBaseline="bottom";
    ctx.fillText(`Y* = ${fmt(Yeq)}`, xTo(Yeq) + 8*dpr, yTo(PEeq) - 6*dpr);
  }

  function drawIS(){
    const { ctx, W, H, dpr } = setupCanvas(els.isCanvas);
    ctx.clearRect(0,0,W,H);

    const { X0,X1,Y0,Y1 } = drawAxes(ctx,W,H,dpr,"Output (Y)","Interest rate (r)");

    // r axis range
    const rMin = DATA.ranges.r.min;
    const rMax = DATA.ranges.r.max;

    // Y range consistent with KC
    const y0 = 0;
    const y1 = 900;

    const xTo = (Y) => X0 + (Y - y0)/(y1 - y0)*(X1 - X0);
    const yTo = (rr) => Y0 + (rMax - rr)/(rMax - rMin)*(Y1 - Y0);

    // IS curve: plot over r grid
    const N = 100;
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    for (let i=0;i<=N;i++){
      const rr = rMin + (i/N)*(rMax-rMin);
      const YY = Yis(rr);
      const x = xTo(YY);
      const y = yTo(rr);
      if (i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    ctx.stroke();

    // baseline IS ghost (baseline G,T)
    const Gcur = G, Tcur=T;
    // temporarily compute baseline IS by drawing with baseline G,T but varying r
    // We'll just draw another line computed with baseline G,T
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 3*dpr;
    ctx.setLineDash([4*dpr,6*dpr]);
    ctx.beginPath();
    for (let i=0;i<=N;i++){
      const rr = rMin + (i/N)*(rMax-rMin);
      const YY = (P.C0 - P.MPC*DATA.baseline.T + Iof(rr) + DATA.baseline.G)/(1-P.MPC);
      const x = xTo(YY);
      const y = yTo(rr);
      if (i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Current point (r, Y*)
    const Yeq = Ystar(r,G,T);
    dot(ctx, xTo(Yeq), yTo(r), "rgba(31,119,180,0.90)", dpr);

    // guides
    line(ctx, xTo(Yeq), yTo(rMin), xTo(Yeq), yTo(r), "rgba(0,0,0,0.30)", 2, dpr, [4,6]);
    line(ctx, xTo(y0), yTo(r), xTo(Yeq), yTo(r), "rgba(0,0,0,0.30)", 2, dpr, [4,6]);
  }

  function renderStats(){
    const Yeq = Ystar(r,G,T);
    els.yStarKC.textContent = fmt(Yeq);
    els.yStarIS.textContent = fmt(Yeq);
    els.peAtY.textContent = fmt(PEof(Yeq, r, G, T));
  }

  function renderAll(){
    renderStats();
    drawKC();
    drawIS();
  }

  // ---------- Slider events ----------
  function onSlider(){
    r = Number(els.rSlider.value);
    G = Number(els.gSlider.value);
    T = Number(els.tSlider.value);
    syncSliders();
    renderAll();
  }

  // ---------- Init ----------
  function init(){
    // baseline slider values
    els.rSlider.value = String(DATA.baseline.r);
    els.gSlider.value = String(DATA.baseline.G);
    els.tSlider.value = String(DATA.baseline.T);

    r = DATA.baseline.r; G = DATA.baseline.G; T = DATA.baseline.T;
    syncSliders();

    buildPile();
    setupSlots();
    renderAll();

    els.scenarioTitle.textContent = "Scenario";
    els.scenarioDesc.textContent = "Click “New Scenario” to start.";
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
