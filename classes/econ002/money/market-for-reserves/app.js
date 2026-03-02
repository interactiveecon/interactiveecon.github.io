(() => {
  const $ = (id) => document.getElementById(id);

  const D = window.MONEY_LAB;
  if (!D) return;

  const els = {
    newScenarioBtn: $("newScenarioBtn"),
    resetBtn: $("resetBtn"),
    applyBtn: $("applyBtn"),
    status: $("status"),

    scenarioTitle: $("scenarioTitle"),
    scenarioDesc: $("scenarioDesc"),

    omoBuyBtn: $("omoBuyBtn"),
    omoSellBtn: $("omoSellBtn"),
    dRVal: $("dRVal"),

    iorSlider: $("iorSlider"),
    iorVal: $("iorVal"),

    R0: $("R0"),
    R1: $("R1"),
    i0: $("i0"),
    i1: $("i1"),
    mVal: $("mVal"),
    MVal: $("MVal"),

    predShift: $("predShift"),
    predRate: $("predRate"),
    predMoney: $("predMoney"),
    checkPredBtn: $("checkPredBtn"),
    whyBtn: $("whyBtn"),
    predFeedback: $("predFeedback"),

    resCanvas: $("resCanvas"),
    moneyCanvas: $("moneyCanvas")
  };

  const BLUE   = "rgba(31,119,180,0.92)";
  const ORANGE = "rgba(230,159,0,0.95)";
  const GREY   = "rgba(0,0,0,0.18)";
  const INK    = "rgba(0,0,0,0.70)";
  const DASH   = "rgba(0,0,0,0.30)";

  const BASE = { ...D.baseline };
  if (typeof BASE.idisc !== "number") BASE.idisc = 4.0;

  // Per-round baseline (randomized R)
  let R_base = BASE.R;
  let ior_base = BASE.ior;

  // Current
  let R = R_base;
  let ior = ior_base;

  let scenario = null; // { kind:"OMO"|"IOR", dir:"up"|"down", dR, dIOR }
  let appliedOnce = false;

  function fmt2(x){ return Number.isFinite(x) ? x.toFixed(2) : "—"; }
  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }
  function setStatus(msg){ els.status.textContent = msg; }

  // ---------- KaTeX auto-render ----------
  function typeset(el){
    if (!el) return;
    if (!window.renderMathInElement) return;
    window.renderMathInElement(el, {
      delimiters: [
        {left: "\\(", right: "\\)", display: false},
        {left: "$", right: "$", display: false},
        {left: "\\[", right: "\\]", display: true},
        {left: "$$", right: "$$", display: true},
      ],
      throwOnError: false
    });
  }

  function showPredFeedback(html){
    if (!html){
      els.predFeedback.style.display = "none";
      els.predFeedback.innerHTML = "";
      return;
    }
    els.predFeedback.style.display = "block";
    els.predFeedback.innerHTML = html;
    typeset(els.predFeedback);
  }

  function enableControls(on){
    els.applyBtn.disabled   = !on;
    els.omoBuyBtn.disabled  = !on;
    els.omoSellBtn.disabled = !on;
    els.iorSlider.disabled  = !on;
  }

  function clearPredictions(){
    els.predShift.value = "";
    els.predRate.value = "";
    els.predMoney.value = "";
    showPredFeedback("");
  }

  // ---------- Reserves market (corridor) ----------
  function Rd(i){ return D.demand.a - D.demand.b * i; }

  function iStar(Rqty, iorVal){
    const idisc = BASE.idisc;
    const iFree = (D.demand.a - Rqty) / D.demand.b;
    if (iFree < iorVal) return iorVal;
    if (iFree > idisc)  return idisc;
    return iFree;
  }

  function region(Rqty, iorVal){
    const idisc = BASE.idisc;
    const iFree = (D.demand.a - Rqty) / D.demand.b;
    if (iFree < iorVal) return "floor";
    if (iFree > idisc)  return "ceiling";
    return "middle";
  }

  // ---------- Money supply rule (only changes when i_ff changes) ----------
  // Anchor: baseline money level = (1/rr)*R_base, but changes only via i_ff.
  const GAMMA = 120; // money units per 1% change in i_ff

  function baseline_i0(){ return iStar(R_base, ior_base); }
  function baseline_M0(){ return (1/BASE.rr) * R_base; }

  function M_of_i(i){
    const i0 = baseline_i0();
    const M0 = baseline_M0();
    return Math.max(0, M0 + GAMMA*(i0 - i));
  }

  function moneySupply(Rqty, iorVal){
    const i = iStar(Rqty, iorVal);
    return M_of_i(i);
  }

  function displayedMultiplier(Rqty, iorVal){
    const M = moneySupply(Rqty, iorVal);
    return (Rqty > 0) ? (M / Rqty) : 0;
  }

  // ---------- Randomize initial reserves (often on IOR floor) ----------
  function randomizeInitialReserves(){
    const Rmin = D.chart.Rmin, Rmax = D.chart.Rmax;

    const R_floor_kink = Rd(ior_base);
    const R_ceil_kink  = Rd(BASE.idisc);

    const Rf = clamp(R_floor_kink, Rmin, Rmax);
    const Rc = clamp(R_ceil_kink,  Rmin, Rmax);

    const u = Math.random();

    if (u < 0.60){
      // floor region (pinned at IOR)
      const lo = Math.min(Rmax, Rf + 5);
      const hi = Rmax;
      R_base = Math.floor(lo + Math.random()*(hi - lo + 1));
    } else if (u < 0.90){
      // middle
      const lo = Math.max(Rmin, Rc + 5);
      const hi = Math.min(Rmax, Rf - 5);
      R_base = (hi <= lo) ? Math.floor((Rmin + Rmax)/2) : Math.floor(lo + Math.random()*(hi - lo + 1));
    } else {
      // ceiling
      const lo = Rmin;
      const hi = Math.max(Rmin, Rc - 5);
      R_base = Math.floor(lo + Math.random()*(hi - lo + 1));
    }

    R = R_base;
  }

  // ---------- Pinned note ----------
  function pinnedNoteHTML(){
    const reg = region(R, ior);
    if (reg === "floor"){
      return `<span class="tagOK">Pinned at IOR</span>
      The equilibrium is on the <strong>floor</strong>: \$begin:math:text$ i\_\{ff\} \= IOR \\$end:math:text$.
      Small changes in reserves won’t change \$begin:math:text$ i\_\{ff\} \\$end:math:text$ or \$begin:math:text$ M \\$end:math:text$ unless reserves fall enough to leave the floor.`;
    }
    if (reg === "ceiling"){
      return `<span class="tagOK">Pinned at discount rate</span>
      The equilibrium is on the <strong>ceiling</strong>: \$begin:math:text$ i\_\{ff\} \= i\_\{disc\} \\$end:math:text$.
      Small changes in reserves won’t change \$begin:math:text$ i\_\{ff\} \\$end:math:text$ or \$begin:math:text$ M \\$end:math:text$ unless reserves rise enough to leave the ceiling.`;
    }
    return `<span class="tagOK">Middle region</span>
    The equilibrium is on the <strong>sloped</strong> section.
    Changes in reserves (OMO) or demand shifts can change \$begin:math:text$ i\_\{ff\} \\$end:math:text$, and then \$begin:math:text$ M \\$end:math:text$.`;
  }

  // ---------- Scenario ----------
  function newScenario(){
    // baseline for this round
    ior_base = BASE.ior;
    ior = ior_base;
    els.iorSlider.value = String(ior);
    els.iorVal.textContent = `${fmt2(ior)}%`;

    randomizeInitialReserves();

    appliedOnce = false;
    clearPredictions();

    const pick = Math.random();
    if (pick < 0.5){
      const dR = D.shocks.OMO[Math.floor(Math.random()*D.shocks.OMO.length)];
      const dir = Math.random() < 0.5 ? "up" : "down";
      scenario = { kind:"OMO", dir, dR, dIOR: 0 };
      els.scenarioTitle.textContent = "Scenario";
      els.scenarioDesc.textContent =
        `Open market operations:\nThe Fed ${dir==="up" ? "purchases" : "sells"} bonds.\n` +
        `Reserves change by ${dir==="up" ? "+" : "−"}${dR}.\n\nMake predictions, then apply the shock.`;
      els.dRVal.textContent = `${dir==="up" ? "+" : "−"}${dR}`;
    } else {
      const dIOR = D.shocks.IOR[Math.floor(Math.random()*D.shocks.IOR.length)];
      const dir = Math.random() < 0.5 ? "up" : "down";
      scenario = { kind:"IOR", dir, dR: 0, dIOR };
      els.scenarioTitle.textContent = "Scenario";
      els.scenarioDesc.textContent =
        `Interest on reserves (IOR):\nIOR moves ${dir==="up" ? "up" : "down"} by ${dIOR}.\n\nMake predictions, then apply the shock.`;
      els.dRVal.textContent = "0";
    }

    enableControls(true);
    setStatus("Scenario ready. Initial reserves randomized.");
    renderAll();
  }

  function resetAll(){
    scenario = null;
    appliedOnce = false;

    R_base = BASE.R;
    R = R_base;
    ior_base = BASE.ior;
    ior = ior_base;

    els.iorSlider.value = String(ior);
    els.iorVal.textContent = `${fmt2(ior)}%`;

    els.scenarioTitle.textContent = "Scenario";
    els.scenarioDesc.textContent = "Click “New Scenario” to start.";
    els.dRVal.textContent = "—";

    clearPredictions();
    enableControls(false);
    setStatus("Reset.");
    renderAll();
  }

  // ---------- Predictions ----------
  function expectedPredictions(){
    if (!scenario) return null;

    const R0 = R_base;
    const ior0 = ior_base;

    let Rshock = R0;
    let iorshock = ior0;

    let shift = "none";
    if (scenario.kind === "OMO"){
      shift = scenario.dir==="up" ? "S_more" : "S_less";
      Rshock = R0 + (scenario.dir==="up" ? scenario.dR : -scenario.dR);
    } else {
      shift = scenario.dir==="up" ? "D_more" : "D_less";
      iorshock = Math.max(0, ior0 + (scenario.dir==="up" ? scenario.dIOR : -scenario.dIOR));
    }

    const i0 = iStar(R0, ior0);
    const i1 = iStar(Rshock, iorshock);

    const M0 = moneySupply(R0, ior0);
    const M1 = moneySupply(Rshock, iorshock);

    const rate = (Math.abs(i1 - i0) < 1e-9) ? "same" : (i1 > i0 ? "up" : "down");
    const money = (Math.abs(M1 - M0) < 1e-9) ? "same" : (M1 > M0 ? "up" : "down");

    return { shift, rate, money };
  }

  function checkPredictions(){
    if (!scenario){
      showPredFeedback(`<span class="tagBad">No scenario</span> Click <strong>New Scenario</strong> first.`);
      return;
    }
    const exp = expectedPredictions();
    const a = els.predShift.value;
    const b = els.predRate.value;
    const c = els.predMoney.value;

    if (!a || !b || !c){
      showPredFeedback(`<span class="tagBad">Missing</span> Answer all three prediction questions.`);
      return;
    }

    const ok = (a===exp.shift && b===exp.rate && c===exp.money);
    if (ok){
      showPredFeedback(`<span class="tagOK">Correct</span> Now apply the policy tool and watch both graphs.`);
      setStatus("Predictions correct.");
    } else {
      showPredFeedback(`<span class="tagBad">Not quite</span> IOR only matters when the floor binds. Money changes only when \$begin:math:text$i\_\{ff\}\\$end:math:text$ changes.`);
      setStatus("Predictions incorrect. Try again.");
    }
  }

  function whyExplanation(){
    if (!scenario){
      showPredFeedback(`<span class="tagBad">No scenario</span> Click <strong>New Scenario</strong> first.`);
      return;
    }
    const reg = region(R, ior);
    const baseNote = pinnedNoteHTML();

    let extra = "";
    if (scenario.kind === "IOR"){
      extra = `IOR changes the <strong>floor</strong>. If the equilibrium is in the middle region, changing IOR won’t move \$begin:math:text$i\_\{ff\}\\$end:math:text$.`;
    } else {
      extra = `OMO shifts the <strong>supply</strong> of reserves. \$begin:math:text$M\\$end:math:text$ changes only if that shift moves \$begin:math:text$i\_\{ff\}\\$end:math:text$.`;
    }

    showPredFeedback(`${baseNote}<br><br>${extra}`);
  }

  // ---------- Apply shock / controls ----------
  function applyShock(){
    if (!scenario) return;
    if (appliedOnce){
      setStatus("Shock already applied. Use controls to explore further.");
      return;
    }
    if (scenario.kind === "OMO"){
      R = clamp(R + (scenario.dir==="up" ? scenario.dR : -scenario.dR), D.chart.Rmin, D.chart.Rmax);
    } else {
      ior = clamp(ior + (scenario.dir==="up" ? scenario.dIOR : -scenario.dIOR), 0, 5);
      els.iorSlider.value = String(ior);
      els.iorVal.textContent = `${fmt2(ior)}%`;
    }
    appliedOnce = true;
    setStatus("Shock applied. Explore with controls.");
    renderAll();
  }

  function omoPurchase(){
    if (!scenario) return;
    const step = (scenario.kind==="OMO" ? scenario.dR : D.shocks.OMO[0]);
    R = clamp(R + step, D.chart.Rmin, D.chart.Rmax);
    renderAll();
  }

  function omoSale(){
    if (!scenario) return;
    const step = (scenario.kind==="OMO" ? scenario.dR : D.shocks.OMO[0]);
    R = clamp(R - step, D.chart.Rmin, D.chart.Rmax);
    renderAll();
  }

  function iorChange(){
    if (!scenario) return;
    ior = clamp(Number(els.iorSlider.value), 0, 5);
    els.iorVal.textContent = `${fmt2(ior)}%`;
    renderAll();
  }

  // ---------- Drawing helpers ----------
  function setupCanvas(canvas){
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const W = Math.max(2, Math.floor(rect.width * dpr));
    const H = Math.max(2, Math.floor(rect.height * dpr));
    if (canvas.width !== W || canvas.height !== H){ canvas.width=W; canvas.height=H; }
    return { ctx, W, H, dpr };
  }

  function drawAxes(ctx, W, H, dpr, xLabel, yLabel){
    const pad = { l: 60*dpr, r: 16*dpr, t: 16*dpr, b: 52*dpr };
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

    ctx.fillStyle = INK;
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

  function drawReserves(){
    const { ctx, W, H, dpr } = setupCanvas(els.resCanvas);
    ctx.clearRect(0,0,W,H);

    const { X0,X1,Y0,Y1 } = drawAxes(ctx,W,H,dpr,"Reserves (R)","Federal funds rate (i_ff, %)");

    const Rmin = D.chart.Rmin, Rmax = D.chart.Rmax;
    const imin = D.chart.imin, imax = D.chart.imax;

    const xTo = (Rv) => X0 + (Rv-Rmin)/(Rmax-Rmin)*(X1-X0);
    const yTo = (iv) => Y0 + (imax-iv)/(imax-imin)*(Y1-Y0);

    const idisc = BASE.idisc;

    // Supply lines
    line(ctx, xTo(R_base), yTo(imin), xTo(R_base), yTo(imax), BLUE, 3, dpr);
    line(ctx, xTo(R),      yTo(imin), xTo(R),      yTo(imax), ORANGE, 3, dpr);

    // Demand (3-piece): ceiling flat, middle down, floor flat
    function drawDemand(color, iorVal){
      const R_floor = Rd(iorVal);
      const R_ceil  = Rd(idisc);

      const Rf = clamp(R_floor, Rmin, Rmax);
      const Rc = clamp(R_ceil,  Rmin, Rmax);

      line(ctx, xTo(Rmin), yTo(idisc), xTo(Rc), yTo(idisc), color, 3, dpr);
      line(ctx, xTo(Rc), yTo(idisc), xTo(Rf), yTo(iorVal), color, 3, dpr);
      line(ctx, xTo(Rf), yTo(iorVal), xTo(Rmax), yTo(iorVal), color, 3, dpr);
    }

    drawDemand(BLUE, ior_base);
    drawDemand(ORANGE, ior);

    // Floor/ceiling reference lines
    line(ctx, xTo(Rmin), yTo(ior),   xTo(Rmax), yTo(ior),   GREY, 2, dpr, [3,6]);
    line(ctx, xTo(Rmin), yTo(idisc), xTo(Rmax), yTo(idisc), GREY, 2, dpr, [3,6]);

    // Equilibria
    const i0 = iStar(R_base, ior_base);
    const i1 = iStar(R, ior);

    const x0 = xTo(R_base), y0p = yTo(i0);
    const x1 = xTo(R),      y1p = yTo(i1);

    dot(ctx, x0, y0p, BLUE, dpr);
    line(ctx, x0, y0p, x0, Y1, DASH, 2, dpr, [4,6]);
    line(ctx, x0, y0p, X0, y0p, DASH, 2, dpr, [4,6]);
    xTick(ctx, x0, Y1, "R₀", dpr);
    yTick(ctx, X0, y0p, "i₀", dpr);

    if (Math.abs(R-R_base) > 1e-9 || Math.abs(ior-ior_base) > 1e-9){
      dot(ctx, x1, y1p, ORANGE, dpr);
      line(ctx, x1, y1p, x1, Y1, DASH, 2, dpr, [4,6]);
      line(ctx, x1, y1p, X0, y1p, DASH, 2, dpr, [4,6]);
      xTick(ctx, x1, Y1, "R₁", dpr);
      yTick(ctx, X0, y1p, "i₁", dpr);
    }
  }

  function drawMoney(){
    const { ctx, W, H, dpr } = setupCanvas(els.moneyCanvas);
    ctx.clearRect(0,0,W,H);

    const { X0,X1,Y0,Y1 } = drawAxes(ctx,W,H,dpr,"Reserves (R)","Money supply (M)");

    const Rmin = D.chart.Rmin, Rmax = D.chart.Rmax;
    const Mmin = D.chart.Mmin, Mmax = D.chart.Mmax;

    const xTo = (Rv) => X0 + (Rv-Rmin)/(Rmax-Rmin)*(X1-X0);
    const yTo = (Mv) => Y0 + (Mmax-Mv)/(Mmax-Mmin)*(Y1-Y0);

    // Plot implied M(R) via iStar: horizontal where i_ff pinned
    function drawMcurve(color, iorVal){
      const N = 240;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3*dpr;
      ctx.beginPath();
      for (let k=0;k<=N;k++){
        const Rk = Rmin + (k/N)*(Rmax-Rmin);
        const Mk = moneySupply(Rk, iorVal);
        const x = xTo(Rk), y = yTo(Mk);
        if (k===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
    }

    drawMcurve(BLUE, ior_base);
    drawMcurve(ORANGE, ior);

    const M0 = moneySupply(R_base, ior_base);
    const M1 = moneySupply(R, ior);

    const x0 = xTo(R_base), y0p = yTo(M0);
    const x1 = xTo(R),      y1p = yTo(M1);

    dot(ctx, x0, y0p, BLUE, dpr);
    line(ctx, x0, y0p, x0, Y1, DASH, 2, dpr, [4,6]);
    line(ctx, x0, y0p, X0, y0p, DASH, 2, dpr, [4,6]);
    xTick(ctx, x0, Y1, "R₀", dpr);
    yTick(ctx, X0, y0p, "M₀", dpr);

    if (Math.abs(R-R_base) > 1e-9 || Math.abs(ior-ior_base) > 1e-9){
      dot(ctx, x1, y1p, ORANGE, dpr);
      line(ctx, x1, y1p, x1, Y1, DASH, 2, dpr, [4,6]);
      line(ctx, x1, y1p, X0, y1p, DASH, 2, dpr, [4,6]);
      xTick(ctx, x1, Y1, "R₁", dpr);
      yTick(ctx, X0, y1p, "M₁", dpr);
    }
  }

  function renderStats(){
    const i0 = iStar(R_base, ior_base);
    const i1 = iStar(R, ior);
    const M  = moneySupply(R, ior);
    const mD = displayedMultiplier(R, ior);

    els.R0.textContent = fmt2(R_base);
    els.R1.textContent = fmt2(R);
    els.i0.textContent = fmt2(i0);
    els.i1.textContent = fmt2(i1);
    els.iorVal.textContent = `${fmt2(ior)}%`;
    els.mVal.textContent = fmt2(mD);
    els.MVal.textContent = fmt2(M);
  }

  function renderAll(){
    renderStats();
    requestAnimationFrame(() => {
      drawReserves();
      drawMoney();
    });

    // Always show pinned/sloped note
    showPredFeedback(pinnedNoteHTML());
  }

  // ---------- Init / events ----------
  function init(){
    els.iorSlider.value = String(ior);
    els.iorVal.textContent = `${fmt2(ior)}%`;
    els.dRVal.textContent = "—";

    els.scenarioTitle.textContent = "Scenario";
    els.scenarioDesc.textContent = "Click “New Scenario” to start.";

    enableControls(false);
    setStatus("Ready.");
    renderAll();
  }

  els.newScenarioBtn.addEventListener("click", newScenario);
  els.resetBtn.addEventListener("click", resetAll);
  els.applyBtn.addEventListener("click", applyShock);

  els.omoBuyBtn.addEventListener("click", omoPurchase);
  els.omoSellBtn.addEventListener("click", omoSale);
  els.iorSlider.addEventListener("input", iorChange);

  els.checkPredBtn.addEventListener("click", checkPredictions);
  els.whyBtn.addEventListener("click", whyExplanation);

  window.addEventListener("resize", renderAll);

  // KaTeX scripts load deferred; render after DOM is ready and after KaTeX loads
  window.addEventListener("load", () => {
    // give auto-render a moment to become available
    setTimeout(() => {
      typeset(document.body);
      init();
    }, 50);
  });
})();
