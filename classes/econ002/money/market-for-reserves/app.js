(() => {
  const $ = (id) => document.getElementById(id);

  const D = window.MONEY_LAB;
  if (!D) return;

  const els = {
    // top buttons
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

    // stats pills
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

  const BLUE = "rgba(31,119,180,0.92)";
  const ORANGE = "rgba(230,159,0,0.95)";
  const GREY = "rgba(0,0,0,0.18)";
  const INK = "rgba(0,0,0,0.70)";
  const DASH = "rgba(0,0,0,0.30)";

  const BASE = { ...D.baseline };

  // current state
  let R = BASE.R;
  let ior = BASE.ior;

  // active scenario (does not auto-apply)
  // { kind: "OMO"|"IOR", dir: "up"|"down", dR, dIOR }
  let scenario = null;

  let controlsUnlocked = false;

  function setStatus(msg){ els.status.textContent = msg; }

  function fmt2(x){ return Number.isFinite(x) ? x.toFixed(2) : "—"; }

  // ----- economics -----
  function Rd(i){ return D.demand.a - D.demand.b * i; }

  function iStar(Rqty, iorVal){
    // Equilibrium i solves R = Rd(i) subject to i >= ior (IOR floor)
    const iFree = (D.demand.a - Rqty) / D.demand.b;
    return Math.max(iorVal, iFree);
  }

  function effectiveMultiplier(iorVal){
    const rr = BASE.rr;
    const er0 = D.excessReserves.er0;
    const k = D.excessReserves.k;
    const i0 = D.excessReserves.ior0;
    const er = Math.max(0, er0 + k*(iorVal - i0));
    const rEff = rr + er;         // simple effective reserve ratio
    return 1 / rEff;
  }

  function moneySupply(Rqty, iorVal){
    return effectiveMultiplier(iorVal) * Rqty;
  }

  // ----- UI helpers -----
  function enableControls(on){
    controlsUnlocked = on;
    els.applyBtn.disabled = !on;
    els.omoBuyBtn.disabled = !on;
    els.omoSellBtn.disabled = !on;
    els.iorSlider.disabled = !on;
  }

  function showPredFeedback(html){
    if (!html){
      els.predFeedback.style.display = "none";
      els.predFeedback.innerHTML = "";
      return;
    }
    els.predFeedback.style.display = "block";
    els.predFeedback.innerHTML = html;
  }

  // ----- scenario generation -----
  function newScenario(){
    // reset to baseline values each new scenario
    R = BASE.R;
    ior = BASE.ior;
    els.iorSlider.value = String(ior);

    // lock controls until correct prediction
    enableControls(false);

    // clear predictions
    els.predShift.value = "";
    els.predRate.value = "";
    els.predMoney.value = "";
    showPredFeedback("");

    // choose scenario type
    const pick = Math.random();
    if (pick < 0.5){
      // OMO scenario
      const dR = D.shocks.OMO[Math.floor(Math.random()*D.shocks.OMO.length)];
      const dir = Math.random() < 0.5 ? "up" : "down"; // purchase increases R, sale decreases R
      scenario = { kind: "OMO", dir, dR, dIOR: 0 };
      els.scenarioTitle.textContent = "Scenario";
      els.scenarioDesc.textContent =
        `Open market operations:\n` +
        `The Fed ${dir==="up" ? "purchases" : "sells"} bonds.\n` +
        `This changes reserves by ${dir==="up" ? "+" : "−"}${dR}.\n\n` +
        `Make predictions, then apply the shock.`;
      els.dRVal.textContent = `${dir==="up" ? "+" : "−"}${dR}`;
    } else {
      // IOR scenario
      const dIOR = D.shocks.IOR[Math.floor(Math.random()*D.shocks.IOR.length)];
      const dir = Math.random() < 0.5 ? "up" : "down";
      scenario = { kind: "IOR", dir, dR: 0, dIOR };
      els.scenarioTitle.textContent = "Scenario";
      els.scenarioDesc.textContent =
        `Interest on reserves (IOR):\n` +
        `The Fed moves IOR ${dir==="up" ? "up" : "down"} by ${dIOR}.\n\n` +
        `Make predictions, then apply the shock.`;
      els.dRVal.textContent = "0";
    }

    setStatus("Scenario ready. Make predictions to unlock controls.");
    renderAll();
  }

  function resetAll(){
    scenario = null;
    R = BASE.R;
    ior = BASE.ior;
    els.iorSlider.value = String(ior);

    enableControls(false);

    els.scenarioTitle.textContent = "Scenario";
    els.scenarioDesc.textContent = "Click “New Scenario” to start.";
    els.dRVal.textContent = "—";

    els.predShift.value = "";
    els.predRate.value = "";
    els.predMoney.value = "";
    showPredFeedback("");

    setStatus("Reset.");
    renderAll();
  }

  // ----- prediction logic -----
  function expectedPredictions(){
    // returns {shift, rate, money} for current scenario
    if (!scenario) return null;

    // baseline vs post-shock comparisons (holding other tool fixed)
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

    // shift type
    let shift = "none";
    if (scenario.kind === "OMO"){
      shift = scenario.dir==="up" ? "S_right" : "S_left";
    } else {
      // higher IOR increases reserve demand (right); lower IOR left
      shift = scenario.dir==="up" ? "D_right" : "D_left";
    }

    // directions
    const rate = (Math.abs(i1 - i0) < 1e-9) ? "same" : (i1 > i0 ? "up" : "down");
    const money = (Math.abs(M1 - M0) < 1e-9) ? "same" : (M1 > M0 ? "up" : "down");

    return { shift, rate, money, i0, i1, M0, M1, Rshock, iorshock };
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
      enableControls(true);
      showPredFeedback(`<span class="tagOK">Correct</span> Controls unlocked. Now apply the policy tool and watch the graphs update.`);
      setStatus("Predictions correct. Apply the shock.");
    } else {
      showPredFeedback(`<span class="tagBad">Not quite</span> Try again. Use the reserves market logic: OMO shifts supply; IOR shifts demand and can act like a floor.`);
      setStatus("Predictions incorrect. Try again.");
    }
  }

  function whyExplanation(){
    if (!scenario){
      showPredFeedback(`<span class="tagBad">No scenario</span> Click <strong>New Scenario</strong> first.`);
      return;
    }
    const exp = expectedPredictions();

    let text = "";
    if (scenario.kind === "OMO"){
      text = `OMO changes the <strong>supply of reserves</strong>. A purchase increases reserves (supply shifts right), pushing the federal funds rate down. A sale decreases reserves (supply shifts left), pushing the federal funds rate up. Money supply changes because $begin:math:text$M \= m\\\\cdot R$end:math:text$.`;
    } else {
      text = `IOR changes banks’ incentives to hold reserves. Higher IOR makes reserves more attractive, shifting <strong>demand for reserves</strong> right and raising the federal funds rate (and it creates a floor at IOR). Higher IOR also lowers the effective money multiplier (banks hold more reserves), reducing money supply for a given $begin:math:text$R$end:math:text$.`;
    }

    showPredFeedback(
      `<span class="tagOK">Why</span> ${text}`
    );
  }

  // ----- apply shock -----
  function applyShock(){
    if (!scenario) return;
    if (!controlsUnlocked){
      setStatus("Make correct predictions first.");
      return;
    }
    if (scenario.kind === "OMO"){
      const d = (scenario.dir==="up" ? scenario.dR : -scenario.dR);
      R = clamp(R + d, D.chart.Rmin, D.chart.Rmax);
    } else {
      const d = (scenario.dir==="up" ? scenario.dIOR : -scenario.dIOR);
      ior = clamp(ior + d, 0, 5);
      els.iorSlider.value = String(ior);
    }
    setStatus("Shock applied. Explore with controls.");
    renderAll();
  }

  // direct control handlers
  function omoPurchase(){
    if (!controlsUnlocked) return;
    R = clamp(R + scenario?.dR || 20, D.chart.Rmin, D.chart.Rmax);
    renderAll();
  }
  function omoSale(){
    if (!controlsUnlocked) return;
    R = clamp(R - (scenario?.dR || 20), D.chart.Rmin, D.chart.Rmax);
    renderAll();
  }
  function iorChange(){
    if (!controlsUnlocked) return;
    ior = Number(els.iorSlider.value);
    renderAll();
  }

  // ----- drawing -----
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

    // baseline curves
    const R0 = BASE.R;
    const ior0 = BASE.ior;

    // supply vertical at R0
    line(ctx, xTo(R0), yTo(imin), xTo(R0), yTo(imax), BLUE, 3, dpr);

    // demand: piecewise with floor at ior (flat segment below ior)
    function drawDemand(color, iorVal){
      const iKink = iorVal;
      const Rk = Rd(iKink);
      // above kink: sloped
      const iTop = imax;
      const Rtop = Rd(iTop);
      line(ctx, xTo(Math.max(Rmin, Math.min(Rmax, Rtop))), yTo(iTop),
               xTo(Math.max(Rmin, Math.min(Rmax, Rk))),   yTo(iKink),
               color, 3, dpr);
      // below kink: horizontal at ior (approx)
      line(ctx, xTo(Rmin), yTo(iKink), xTo(Math.max(Rmin, Math.min(Rmax, Rk))), yTo(iKink), color, 3, dpr);
    }
    drawDemand(BLUE, ior0);

    // current curves (orange)
    drawDemand(ORANGE, ior);
    line(ctx, xTo(R), yTo(imin), xTo(R), yTo(imax), ORANGE, 3, dpr);

    // equilibrium points
    const i0 = iStar(R0, ior0);
    const i1 = iStar(R, ior);

    const x0 = xTo(R0), y0p = yTo(i0);
    const x1 = xTo(R),  y1p = yTo(i1);

    // baseline equilibrium point + dashed to both axes + ticks
    dot(ctx, x0, y0p, BLUE, dpr);
    line(ctx, x0, y0p, x0, Y1, DASH, 2, dpr, [4,6]);
    line(ctx, x0, y0p, X0, y0p, DASH, 2, dpr, [4,6]);
    xTick(ctx, x0, Y1, "R₀", dpr);
    yTick(ctx, X0, y0p, "i₀", dpr);

    // current equilibrium point
    if (Math.abs(R-R0) > 1e-9 || Math.abs(ior-ior0) > 1e-9){
      dot(ctx, x1, y1p, ORANGE, dpr);
      line(ctx, x1, y1p, x1, Y1, DASH, 2, dpr, [4,6]);
      line(ctx, x1, y1p, X0, y1p, DASH, 2, dpr, [4,6]);
      xTick(ctx, x1, Y1, "R₁", dpr);
      yTick(ctx, X0, y1p, "i₁", dpr);
    }

    // draw IOR line faintly
    line(ctx, xTo(Rmin), yTo(ior), xTo(Rmax), yTo(ior), GREY, 2, dpr, [3,6]);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.font = `${12*dpr}px system-ui`;
    ctx.textAlign="left"; ctx.textBaseline="bottom";
    ctx.fillText("IOR floor", xTo(Rmin) + 6*dpr, yTo(ior) - 4*dpr);
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

    // baseline M line
    line(ctx, xTo(Rmin), yTo(m0*Rmin), xTo(Rmax), yTo(m0*Rmax), BLUE, 3, dpr);
    // current M line
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
  }

  // ----- render -----
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

  // ----- init -----
  function init(){
    els.iorSlider.value = String(ior);
    els.iorVal.textContent = `${fmt2(ior)}%`;
    els.dRVal.textContent = "—";

    enableControls(false);
    setStatus("Ready.");

    renderAll();
  }

  // ----- events -----
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
