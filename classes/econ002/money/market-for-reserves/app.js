(() => {
  const $ = (id) => document.getElementById(id);

  const D = window.MONEY_LAB;
  if (!D) return;

  const els = {
    // header buttons
    newScenarioBtn: $("newScenarioBtn"),
    resetBtn: $("resetBtn"),
    applyBtn: $("applyBtn"),
    status: $("status"),

    // scenario text
    scenarioTitle: $("scenarioTitle"),
    scenarioDesc: $("scenarioDesc"),

    // controls
    omoBuyBtn: $("omoBuyBtn"),
    omoSellBtn: $("omoSellBtn"),
    dRVal: $("dRVal"),

    iorSlider: $("iorSlider"),
    iorVal: $("iorVal"),

    // stats
    R0: $("R0"),
    R1: $("R1"),
    i0: $("i0"),
    i1: $("i1"),
    mVal: $("mVal"),
    MVal: $("MVal"),

    // predictions
    predShift: $("predShift"),
    predRate: $("predRate"),
    predMoney: $("predMoney"),
    checkPredBtn: $("checkPredBtn"),
    whyBtn: $("whyBtn"),
    predFeedback: $("predFeedback"),

    // canvases
    resCanvas: $("resCanvas"),
    moneyCanvas: $("moneyCanvas")
  };

  const BLUE   = "rgba(31,119,180,0.92)";
  const ORANGE = "rgba(230,159,0,0.95)";
  const GREY   = "rgba(0,0,0,0.18)";
  const INK    = "rgba(0,0,0,0.70)";
  const DASH   = "rgba(0,0,0,0.30)";

  const BASE = { ...D.baseline };
  if (typeof BASE.idisc !== "number") BASE.idisc = 4.0; // safe default

  // current state
  let R = BASE.R;
  let ior = BASE.ior;

  // scenario state (not auto-applied)
  // { kind:"OMO"|"IOR", dir:"up"|"down", dR:number, dIOR:number }
  let scenario = null;

  // allow “Apply Shock” once per scenario for clarity
  let appliedOnce = false;

  function setStatus(msg){ els.status.textContent = msg; }
  function fmt2(x){ return Number.isFinite(x) ? x.toFixed(2) : "—"; }
  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

  // ---------------- ECONOMICS ----------------
  // Middle (sloped) reserve demand in corridor region: Rd(i) = a - b*i
  function Rd(i){ return D.demand.a - D.demand.b * i; }

  // Corridor equilibrium: i_ff = clamp(iFree, [IOR, idisc])
  function iStar(Rqty, iorVal){
    const idisc = BASE.idisc;
    const iFree = (D.demand.a - Rqty) / D.demand.b;
    if (iFree < iorVal) return iorVal;
    if (iFree > idisc)  return idisc;
    return iFree;
  }

  // Effective multiplier decreases with higher IOR (more excess reserves)
  function effectiveMultiplier(iorVal){
    const rr = BASE.rr;
    const er0 = D.excessReserves.er0;
    const k   = D.excessReserves.k;
    const i0  = D.excessReserves.ior0;

    const er = Math.max(0, er0 + k*(iorVal - i0));
    const rEff = rr + er;
    return 1 / rEff;
  }

  function moneySupply(Rqty, iorVal){
    return effectiveMultiplier(iorVal) * Rqty;
  }

  // ---------------- UI ----------------
  function showPredFeedback(html){
    if (!html){
      els.predFeedback.style.display = "none";
      els.predFeedback.innerHTML = "";
      return;
    }
    els.predFeedback.style.display = "block";
    els.predFeedback.innerHTML = html;
  }

  function enableControls(on){
    // We keep the slider & buttons usable when scenario exists (and off when none)
    els.applyBtn.disabled  = !on;
    els.omoBuyBtn.disabled = !on;
    els.omoSellBtn.disabled= !on;
    els.iorSlider.disabled = !on;
  }

  function clearPredictions(){
    els.predShift.value = "";
    els.predRate.value  = "";
    els.predMoney.value = "";
    showPredFeedback("");
  }

  // ---------------- SCENARIO ----------------
  function newScenario(){
    // reset to baseline
    R = BASE.R;
    ior = BASE.ior;
    els.iorSlider.value = String(ior);
    els.iorVal.textContent = `${fmt2(ior)}%`;

    appliedOnce = false;

    // clear predictions
    clearPredictions();

    // choose scenario
    const pick = Math.random();
    if (pick < 0.5){
      const dR = D.shocks.OMO[Math.floor(Math.random()*D.shocks.OMO.length)];
      const dir = Math.random() < 0.5 ? "up" : "down"; // up = purchase
      scenario = { kind:"OMO", dir, dR, dIOR: 0 };

      els.scenarioTitle.textContent = "Scenario";
      els.scenarioDesc.textContent =
        `Open market operations:\n` +
        `The Fed ${dir==="up" ? "purchases" : "sells"} bonds.\n` +
        `Reserves change by ${dir==="up" ? "+" : "−"}${dR}.\n\n` +
        `Make predictions, then apply the shock.`;

      els.dRVal.textContent = `${dir==="up" ? "+" : "−"}${dR}`;
    } else {
      const dIOR = D.shocks.IOR[Math.floor(Math.random()*D.shocks.IOR.length)];
      const dir = Math.random() < 0.5 ? "up" : "down";
      scenario = { kind:"IOR", dir, dR: 0, dIOR };

      els.scenarioTitle.textContent = "Scenario";
      els.scenarioDesc.textContent =
        `Interest on reserves (IOR):\n` +
        `The Fed moves IOR ${dir==="up" ? "up" : "down"} by ${dIOR}.\n\n` +
        `Make predictions, then apply the shock.`;

      els.dRVal.textContent = "0";
    }

    enableControls(true);
    setStatus("Scenario ready. (Controls enabled.)");
    renderAll();
  }

  function resetAll(){
    scenario = null;
    appliedOnce = false;

    R = BASE.R;
    ior = BASE.ior;

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

  // ---------------- PREDICTIONS ----------------
  function expectedPredictions(){
    if (!scenario) return null;

    const R0 = BASE.R;
    const ior0 = BASE.ior;

    let Rshock = R0;
    let iorshock = ior0;

    if (scenario.kind === "OMO"){
      Rshock = R0 + (scenario.dir==="up" ? scenario.dR : -scenario.dR);
    } else {
      iorshock = ior0 + (scenario.dir==="up" ? scenario.dIOR : -scenario.dIOR);
      iorshock = Math.max(0, iorshock);
    }

    const i0 = iStar(R0, ior0);
    const i1 = iStar(Rshock, iorshock);

    const M0 = moneySupply(R0, ior0);
    const M1 = moneySupply(Rshock, iorshock);

    let shift = "none";
    if (scenario.kind === "OMO"){
      shift = scenario.dir==="up" ? "S_right" : "S_left";
    } else {
      shift = scenario.dir==="up" ? "D_right" : "D_left";
    }

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
      showPredFeedback(`<span class="tagBad">Not quite</span> Remember: OMO shifts <strong>supply</strong> of reserves; IOR shifts <strong>demand</strong> and sets a floor.`);
      setStatus("Predictions incorrect. Try again.");
    }
  }

  function whyExplanation(){
    if (!scenario){
      showPredFeedback(`<span class="tagBad">No scenario</span> Click <strong>New Scenario</strong> first.`);
      return;
    }
    let text = "";
    if (scenario.kind === "OMO"){
      text = `OMO changes the <strong>supply of reserves</strong> (vertical line).
A purchase increases reserves (supply right) → $begin:math:text$i\_\{ff\}$end:math:text$ falls.
A sale decreases reserves (supply left) → $begin:math:text$i\_\{ff\}$end:math:text$ rises.
Money supply changes because $begin:math:text$M \= m\\\\cdot R$end:math:text$.`;
    } else {
      text = `IOR changes banks’ incentives to hold reserves (demand shifts).
Higher IOR shifts reserve demand right and raises $begin:math:text$i\_\{ff\}$end:math:text$ (and creates a floor).
Higher IOR also lowers the effective multiplier $begin:math:text$m$end:math:text$, reducing $begin:math:text$M$end:math:text$ for a given $begin:math:text$R$end:math:text$.`;
    }
    showPredFeedback(`<span class="tagOK">Why</span> ${text}`);
    if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise();
  }

  // ---------------- APPLY SHOCK + CONTROLS ----------------
  function applyShock(){
    if (!scenario) return;

    if (appliedOnce){
      setStatus("Shock already applied. Use controls to explore further.");
      return;
    }

    if (scenario.kind === "OMO"){
      const d = (scenario.dir==="up" ? scenario.dR : -scenario.dR);
      R = clamp(R + d, D.chart.Rmin, D.chart.Rmax);
    } else {
      const d = (scenario.dir==="up" ? scenario.dIOR : -scenario.dIOR);
      ior = clamp(ior + d, 0, 5);
      els.iorSlider.value = String(ior);
      els.iorVal.textContent = `${fmt2(ior)}%`;
    }

    appliedOnce = true;
    setStatus("Shock applied. Explore with controls.");
    renderAll();
  }

  function omoPurchase(){
    if (!scenario) return;
    // use scenario magnitude if OMO scenario, otherwise a default
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

  // ---------------- DRAWING ----------------
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

    const R0 = BASE.R;
    const ior0 = BASE.ior;
    const idisc = BASE.idisc;

    // Supply lines (vertical)
    line(ctx, xTo(R0), yTo(imin), xTo(R0), yTo(imax), BLUE, 3, dpr);
    line(ctx, xTo(R),  yTo(imin), xTo(R),  yTo(imax), ORANGE, 3, dpr);

    // 3-piece corridor demand:
    function drawDemandCorridor(color, iorVal){
      const R_floor = Rd(iorVal); // kink where middle meets floor
      const R_ceil  = Rd(idisc);  // kink where middle meets ceiling

      const Rf = clamp(R_floor, Rmin, Rmax);
      const Rc = clamp(R_ceil,  Rmin, Rmax);

      // Ceiling segment at idisc from Rmin to Rc (low reserves)
      line(ctx, xTo(Rmin), yTo(idisc), xTo(Rc), yTo(idisc), color, 3, dpr);

      // Middle downward segment from (Rc,idisc) to (Rf,ior)
      line(ctx, xTo(Rc), yTo(idisc), xTo(Rf), yTo(iorVal), color, 3, dpr);

      // Floor segment at IOR from Rf to Rmax (high reserves)
      line(ctx, xTo(Rf), yTo(iorVal), xTo(Rmax), yTo(iorVal), color, 3, dpr);
    }

    drawDemandCorridor(BLUE, ior0);
    drawDemandCorridor(ORANGE, ior);

    // Reference lines for floor/ceiling
    line(ctx, xTo(Rmin), yTo(ior),   xTo(Rmax), yTo(ior),   GREY, 2, dpr, [3,6]);
    line(ctx, xTo(Rmin), yTo(idisc), xTo(Rmax), yTo(idisc), GREY, 2, dpr, [3,6]);

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.font = `${12*dpr}px system-ui`;
    ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.fillText("IOR", xTo(Rmin) + 6*dpr, yTo(ior) - 4*dpr);
    ctx.fillText("Discount rate", xTo(Rmin) + 6*dpr, yTo(idisc) - 4*dpr);

    // Equilibrium points (baseline and current)
    const i0 = iStar(R0, ior0);
    const i1 = iStar(R, ior);

    const x0 = xTo(R0), y0p = yTo(i0);
    const x1 = xTo(R),  y1p = yTo(i1);

    dot(ctx, x0, y0p, BLUE, dpr);
    line(ctx, x0, y0p, x0, Y1, DASH, 2, dpr, [4,6]);
    line(ctx, x0, y0p, X0, y0p, DASH, 2, dpr, [4,6]);
    xTick(ctx, x0, Y1, "R₀", dpr);
    yTick(ctx, X0, y0p, "i₀", dpr);

    if (Math.abs(R-R0) > 1e-9 || Math.abs(ior-ior0) > 1e-9){
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

    const m0 = effectiveMultiplier(BASE.ior);
    const m1 = effectiveMultiplier(ior);

    // draw baseline and current money supply lines: M = m*R
    line(ctx, xTo(Rmin), yTo(m0*Rmin), xTo(Rmax), yTo(m0*Rmax), BLUE, 3, dpr);
    line(ctx, xTo(Rmin), yTo(m1*Rmin), xTo(Rmax), yTo(m1*Rmax), ORANGE, 3, dpr);

    // points
    const M0 = moneySupply(BASE.R, BASE.ior);
    const M1 = moneySupply(R, ior);

    const x0 = xTo(BASE.R), y0p = yTo(M0);
    const x1 = xTo(R),      y1p = yTo(M1);

    dot(ctx, x0, y0p, BLUE, dpr);
    line(ctx, x0, y0p, x0, Y1, DASH, 2, dpr, [4,6]);
    line(ctx, x0, y0p, X0, y0p, DASH, 2, dpr, [4,6]);
    xTick(ctx, x0, Y1, "R₀", dpr);
    yTick(ctx, X0, y0p, "M₀", dpr);

    if (Math.abs(R-BASE.R) > 1e-9 || Math.abs(ior-BASE.ior) > 1e-9){
      dot(ctx, x1, y1p, ORANGE, dpr);
      line(ctx, x1, y1p, x1, Y1, DASH, 2, dpr, [4,6]);
      line(ctx, x1, y1p, X0, y1p, DASH, 2, dpr, [4,6]);
      xTick(ctx, x1, Y1, "R₁", dpr);
      yTick(ctx, X0, y1p, "M₁", dpr);
    }

    // small legend labels (optional clarity)
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.font = `${12*dpr}px system-ui`;
    ctx.textAlign="left"; ctx.textBaseline="top";
    ctx.fillText("Baseline: M = m₀·R", X0 + 6*dpr, Y0 + 6*dpr);
    ctx.fillText("Current:  M = m₁·R", X0 + 6*dpr, Y0 + 24*dpr);
  }

  // ---------------- RENDER ----------------
  function renderStats(){
    const i0 = iStar(BASE.R, BASE.ior);
    const i1 = iStar(R, ior);
    const m = effectiveMultiplier(ior);
    const M = moneySupply(R, ior);

    els.R0.textContent = fmt2(BASE.R);
    els.R1.textContent = fmt2(R);
    els.i0.textContent = fmt2(i0);
    els.i1.textContent = fmt2(i1);
    els.iorVal.textContent = `${fmt2(ior)}%`;
    els.mVal.textContent = fmt2(m);
    els.MVal.textContent = fmt2(M);
  }

  function renderAll(){
    renderStats();
    requestAnimationFrame(() => {
      drawReserves();
      drawMoney();
    });
    if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise();
  }

  // ---------------- INIT ----------------
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

  // ---------------- EVENTS ----------------
  els.newScenarioBtn.addEventListener("click", newScenario);
  els.resetBtn.addEventListener("click", resetAll);
  els.applyBtn.addEventListener("click", applyShock);

  els.omoBuyBtn.addEventListener("click", omoPurchase);
  els.omoSellBtn.addEventListener("click", omoSale);
  els.iorSlider.addEventListener("input", iorChange);

  els.checkPredBtn.addEventListener("click", checkPredictions);
  els.whyBtn.addEventListener("click", whyExplanation);

  window.addEventListener("resize", renderAll);

  init();
})();
