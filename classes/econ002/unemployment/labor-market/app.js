window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const els = {
    lmChart: $("lmChart"),
    chartNote: $("chartNote"),
    resetBtn: $("resetBtn"),
    shockNegBtn: $("shockNegBtn"),
    shockPosBtn: $("shockPosBtn"),
    status: $("status"),

    modeCyc: $("modeCyc"),
    modeStr: $("modeStr"),

    wbarBlock: $("wbarBlock"),
    wbar: $("wbar"),
    wbarNum: $("wbarNum"),
    wbarVal: $("wbarVal"),

    Lstar: $("Lstar"),
    Lact: $("Lact"),
    Unemp: $("Unemp"),
    explainBox: $("explainBox"),
  };

  const missing = Object.entries(els).filter(([k,v]) => v == null).map(([k]) => k);
  if (missing.length) {
    console.error("Missing elements:", missing);
    if (els.status) els.status.textContent = `Missing elements: ${missing.join(", ")}`;
    return;
  }

  // Fixed slopes for clarity
  const b = 0.25; // demand slope
  const d = 0.20; // supply slope

  // Baseline (initial) parameters
  const baseline = {
    a: 3.0, // demand intercept
    c: 0.8  // supply intercept
  };

  // High-water mark for dashed "old demand"
  // (only moves up if demand is pushed above previous best level)
  let aRef = baseline.a;

  // State
  let state = {
    a: baseline.a,
    c: baseline.c,
    mode: "cyc",        // "cyc" or "str"
    wbar: 0,
    wStickyDown: null   // real wage that is sticky downward in cyclical mode
  };

  function setStatus(msg){ els.status.textContent = msg; }
  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

  // Demand: w = a - bL
  function Ld(a, w){ return (a - w) / b; }
  // Supply: w = c + dL
  function Ls(c, w){ return (w - c) / d; }

  function equilibrium(a, c){
    const L = (a - c) / (b + d);
    const w = a - b * L;
    return { L, w };
  }

  function currentEquilibrium(){ return equilibrium(state.a, state.c); }

  // Actual real wage depends on the selected mode
  function actualRealWage(){
    const eq = currentEquilibrium();
    const wEq = eq.w;

    if (state.mode === "str") {
      // Structural: real wage cannot fall below wbar
      return Math.max(wEq, state.wbar);
    }

    // Cyclical: downward sticky, upward flexible
    if (state.wStickyDown == null) state.wStickyDown = wEq;
    return Math.max(wEq, state.wStickyDown);
  }

  function outcome(){
    const eq = currentEquilibrium();
    const wEq = eq.w;
    const LEq = eq.L;

    const wAct = actualRealWage();

    let LAct = LEq;
    let U = 0;

    if (wAct > wEq + 1e-9) {
      const LdVal = Ld(state.a, wAct);
      const LsVal = Ls(state.c, wAct);
      LAct = Math.max(0, LdVal);
      U = Math.max(0, LsVal - LdVal);
    } else {
      LAct = LEq;
      U = 0;
    }

    return { eq, wEq, wAct, LAct, U };
  }

  // ----- Drawing -----
  function draw(){
    const canvas = els.lmChart;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth * dpr;
    const H = canvas.clientHeight * dpr;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W; canvas.height = H;
    }
    ctx.clearRect(0,0,W,H);

    // Fixed axes
    const Lmin = 0, Lmax = 12;
    const wmin = 0, wmax = 4.2;

    // Increase left padding a bit so tick labels have room
    // and move x-label up so it doesn't get clipped.
    const pad = { l: 58*dpr, r: 16*dpr, t: 18*dpr, b: 48*dpr };
    const X0 = pad.l, X1 = W - pad.r;
    const Y0 = pad.t, Y1 = H - pad.b;

    const xToPix = (L) => X0 + (L - Lmin) * (X1 - X0) / (Lmax - Lmin);
    const yToPix = (w) => Y0 + (wmax - w) * (Y1 - Y0) / (wmax - wmin);

    // Grid (keep it light)
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1*dpr;
    for (let i=0;i<=6;i++){
      const L = Lmin + i*(Lmax-Lmin)/6;
      const x = xToPix(L);
      ctx.beginPath(); ctx.moveTo(x,Y0); ctx.lineTo(x,Y1); ctx.stroke();
    }
    for (let j=0;j<=6;j++){
      const w = wmin + j*(wmax-wmin)/6;
      const y = yToPix(w);
      ctx.beginPath(); ctx.moveTo(X0,y); ctx.lineTo(X1,y); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2*dpr;
    ctx.beginPath(); ctx.moveTo(X0,Y0); ctx.lineTo(X0,Y1); ctx.lineTo(X1,Y1); ctx.stroke();

    // Axis labels
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.font = `${13*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "center";
    ctx.fillText("Employment (L)", (X0+X1)/2, Y1 + 22*dpr);

    ctx.save();
    ctx.translate(X0 - 64*dpr, (Y0+Y1)/2); // move farther left so it doesn't cover tick
    ctx.rotate(-Math.PI/2);
    ctx.fillText("Real wage (w)", 0, 0);
    ctx.restore();

    // Plot helper
    function plotLine(fn, strokeStyle, width, dashed=false){
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = width*dpr;
      ctx.setLineDash(dashed ? [6*dpr, 6*dpr] : []);
      ctx.beginPath();
      const N = 220;
      for (let i=0;i<=N;i++){
        const L = Lmin + (Lmax-Lmin)*i/N;
        const w = fn(L);
        const x = xToPix(L);
        const y = yToPix(w);
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Baseline / old curves (grey dashed)
    // Demand uses aRef (high-water mark), not baseline.a
    plotLine((L)=> aRef - b*L, "rgba(0,0,0,0.25)", 2, true);
    plotLine((L)=> baseline.c + d*L, "rgba(0,0,0,0.25)", 2, true);

    // Current curves (blue)
    plotLine((L)=> state.a - b*L, "rgba(31,119,180,0.90)", 3, false);
    plotLine((L)=> state.c + d*L, "rgba(31,119,180,0.60)", 3, false);

    // Outcome
    const { eq, wEq, wAct, LAct, U } = outcome();

    // y-tick: show the sticky reference wage in cyclical mode
    const wTick = (state.mode === "cyc" && state.wStickyDown != null) ? state.wStickyDown : wEq;
    const yTick = yToPix(wTick);

    // faint guide line at tick
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 2*dpr;
    ctx.beginPath();
    ctx.moveTo(X0, yTick);
    ctx.lineTo(X1, yTick);
    ctx.stroke();

    // tick label
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(wTick.toFixed(2), X0 - 10*dpr, yTick);

    // Wage line (orange)
    ctx.strokeStyle = "rgba(230,159,0,0.90)";
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    ctx.moveTo(X0, yToPix(wAct));
    ctx.lineTo(X1, yToPix(wAct));
    ctx.stroke();

    // Equilibrium point
    const xEq = xToPix(eq.L);
    const yEq = yToPix(eq.w);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath(); ctx.arc(xEq, yEq, 6*dpr, 0, Math.PI*2); ctx.fill();

    // Actual point (employment on demand at wAct if unemployment exists)
    const xA = xToPix(LAct);
    const yA = yToPix(wAct);
    ctx.fillStyle = "rgba(230,159,0,0.95)";
    ctx.beginPath(); ctx.arc(xA, yA, 7*dpr, 0, Math.PI*2); ctx.fill();

    // Dashed guides
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 2*dpr;
    ctx.setLineDash([6*dpr, 6*dpr]);
    ctx.beginPath(); ctx.moveTo(xA, yA); ctx.lineTo(xA, Y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xA, yA); ctx.lineTo(X0, yA); ctx.stroke();
    ctx.setLineDash([]);

    // Shade unemployment region if U>0
    if (U > 1e-9) {
      const LdVal = Ld(state.a, wAct);
      const LsVal = Ls(state.c, wAct);
      const x1 = xToPix(clamp(LdVal, Lmin, Lmax));
      const x2 = xToPix(clamp(LsVal, Lmin, Lmax));
      const y = yToPix(wAct);

      ctx.fillStyle = "rgba(230,159,0,0.18)";
      ctx.fillRect(Math.min(x1,x2), y, Math.abs(x2-x1), Y1 - y);

      ctx.fillStyle = "rgba(0,0,0,0.70)";
      ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Unemployment (excess supply)", Math.min(x1,x2) + 6*dpr, y + 6*dpr);
    }

    // Legend
    ctx.fillStyle = "rgba(0,0,0,0.60)";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Blue: current supply & demand", X0, Y0);
    ctx.fillText("Grey dashed: reference demand & baseline supply", X0, Y0 + 16*dpr);
    ctx.fillText("Orange: actual real wage", X0, Y0 + 32*dpr);

    // Metrics
    els.Lstar.textContent = eq.L.toFixed(2);
    els.Lact.textContent  = LAct.toFixed(2);
    els.Unemp.textContent = U.toFixed(2);

    // Explanation
    let expl = "";
    if (U <= 1e-9) {
      expl = `No unemployment: the real wage equals (or is below) the market-clearing level.`;
    } else if (state.mode === "cyc") {
      expl = `Cyclical unemployment: a negative demand shock lowers the market-clearing wage, but the real wage does not fall (downward sticky). Firms reduce hiring to labor demand, creating unemployment.`;
    } else {
      expl = `Structural unemployment: the real wage is held above the market-clearing level by the wage floor \$begin:math:text$\\\\bar w\\$end:math:text$. Employment is demand-determined at that wage, creating persistent unemployment.`;
    }

    els.explainBox.innerHTML =
      `<strong>Numbers:</strong> equilibrium w*=${wEq.toFixed(2)}, actual w=${wAct.toFixed(2)}.<br>` +
      `<strong>Interpretation:</strong> ${expl}`;

    // Remove old helper sentence under chart
    els.chartNote.textContent = "";
  }

  // ----- Mode & controls -----
  function syncModeUI(){
    const isStr = state.mode === "str";
    els.wbarBlock.classList.toggle("disabled", !isStr);
    els.wbar.disabled = !isStr;
    els.wbarNum.disabled = !isStr;
  }

  function setWbarFromUI(){
    const v = Number(els.wbarNum.value);
    state.wbar = clamp(Number.isFinite(v) ? v : Number(els.wbar.value), 0, 3.5);
    els.wbar.value = String(state.wbar);
    els.wbarNum.value = String(state.wbar);
    els.wbarVal.textContent = state.wbar.toFixed(2);
  }

  function reset(){
    state.a = baseline.a;
    state.c = baseline.c;
    state.mode = "cyc";
    state.wbar = 0;

    // sticky reference starts at equilibrium
    state.wStickyDown = currentEquilibrium().w;

    // reset reference demand line
    aRef = baseline.a;

    els.modeCyc.checked = true;
    els.modeStr.checked = false;

    els.wbar.value = "0";
    els.wbarNum.value = "0";
    els.wbarVal.textContent = "0.00";

    syncModeUI();
    draw();
    setStatus("Reset to baseline equilibrium.");
  }

  function applyDemandShock(sign){
    const delta = (sign < 0) ? -0.55 : +0.55;
    state.a = clamp(state.a + delta, 1.5, 4.0);

    // Update dashed reference demand only if we surpass the prior reference level
    if (sign > 0 && state.a > aRef + 1e-12) {
      aRef = state.a;
    }
    // Negative shocks do not move aRef.

    // Cyclical mode wage behavior:
    // - negative: wage doesn't fall -> keep sticky reference unchanged
    // - positive: wage rises -> update sticky reference upward if needed
    if (state.mode === "cyc") {
      const wEqNow = currentEquilibrium().w;
      if (state.wStickyDown == null) state.wStickyDown = wEqNow;
      if (sign > 0) state.wStickyDown = Math.max(state.wStickyDown, wEqNow);
    }

    draw();
    setStatus(sign < 0 ? "Negative labor demand shock applied." : "Positive labor demand shock applied.");
  }

  function setMode(mode){
    state.mode = mode;

    if (mode === "cyc") {
      // set sticky reference to current equilibrium (start in equilibrium)
      state.wStickyDown = currentEquilibrium().w;
    }

    syncModeUI();
    draw();
  }

  // Radio handlers
  els.modeCyc.addEventListener("change", () => { if (els.modeCyc.checked) setMode("cyc"); });
  els.modeStr.addEventListener("change", () => { if (els.modeStr.checked) setMode("str"); });

  // wbar controls
  els.wbar.addEventListener("input", () => {
    els.wbarNum.value = els.wbar.value;
    setWbarFromUI();
    draw();
  });
  els.wbarNum.addEventListener("input", () => {
    els.wbar.value = els.wbarNum.value;
    setWbarFromUI();
    draw();
  });

  // Buttons
  els.resetBtn.addEventListener("click", reset);
  els.shockNegBtn.addEventListener("click", () => applyDemandShock(-1));
  els.shockPosBtn.addEventListener("click", () => applyDemandShock(+1));

  // Init
  reset();
});
