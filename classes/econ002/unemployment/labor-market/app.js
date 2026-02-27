window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const els = {
    lmChart: $("lmChart"),
    chartNote: $("chartNote"),

    resetBtn: $("resetBtn"),
    shockNegBtn: $("shockNegBtn"),
    shockPosBtn: $("shockPosBtn"),
    status: $("status"),

    stickyW: $("stickyW"),
    realRigidity: $("realRigidity"),

    W: $("W"), Wv: $("Wv"),
    P: $("P"), Pv: $("Pv"),

    wbar: $("wbar"),
    wbarNum: $("wbarNum"),

    a: $("a"), av: $("av"),
    c: $("c"), cv: $("cv"),

    Lstar: $("Lstar"),
    Lact: $("Lact"),
    Unemp: $("Unemp"),
    explainBox: $("explainBox"),
  };

  // Validate required elements
  const required = Object.entries(els).filter(([k,v]) => v == null).map(([k]) => k);
  if (required.length) {
    console.error("Missing elements:", required);
    if (els.status) els.status.textContent = `Missing elements: ${required.join(", ")}`;
    return;
  }

  // Fixed slopes (clarity)
  const b = 0.25; // demand slope
  const d = 0.20; // supply slope

  // Baseline parameters (for grey curves)
  const baseline = {
    a: 3.0,
    c: 0.8,
    W: 10,
    P: 10,
    wbar: 0,
  };

  // State
  let state = {
    a: baseline.a,
    c: baseline.c,
    W: baseline.W,
    P: baseline.P,
    wbar: baseline.wbar,
    stickyW: true,
    realRigidity: false,
  };

  function setStatus(msg){ els.status.textContent = msg; }

  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

  function wReal(W, P){ return W / P; }

  // Demand: w = a - bL  => Ld(w) = (a - w)/b
  function Ld(a, w){ return (a - w) / b; }

  // Supply: w = c + dL  => Ls(w) = (w - c)/d
  function Ls(c, w){ return (w - c) / d; }

  function equilibrium(a, c){
    // solve a - bL = c + dL => L* = (a - c)/(b+d), w* = a - bL*
    const L = (a - c) / (b + d);
    const w = a - b * L;
    return { L, w };
  }

  function actualOutcome(){
    const { a, c, W, P, wbar, stickyW, realRigidity } = state;

    const eq = equilibrium(a, c);
    const w_eq = eq.w;
    const L_eq = eq.L;

    // Candidate real wage from W/P
    let w_candidate = wReal(W, P);

    // Apply real rigidity floor if enabled
    if (realRigidity) w_candidate = Math.max(w_candidate, wbar);

    // If stickyW is OFF, assume W can adjust so that w = max(w_eq, wbar if rigidity)
    // (i.e., wage is flexible unless real rigidity binds)
    if (!stickyW) {
      w_candidate = realRigidity ? Math.max(w_eq, wbar) : w_eq;
    }

    // Given real wage w_actual, employment is min(Ld, Ls) but in standard model with wage above eq,
    // employment is demand-determined (Ld). If wage below eq, employment is supply-determined? Typically wage floors create unemployment;
    // we’ll treat market clearing when w_actual <= w_eq (no unemployment): L = L_eq.
    const w_actual = w_candidate;

    // Determine employment + unemployment
    let L_actual = L_eq;
    let U = 0;

    if (w_actual > w_eq + 1e-9) {
      const Ld_val = Ld(a, w_actual);
      const Ls_val = Ls(c, w_actual);
      L_actual = Math.max(0, Ld_val);
      U = Math.max(0, Ls_val - Ld_val);
    } else {
      // wage not above eq -> market clears
      L_actual = L_eq;
      U = 0;
    }

    return { eq, w_actual, L_actual, U };
  }

  // ----- Drawing -----
  function draw(){
    const canvas = els.lmChart;
    const ctx = canvas.getContext("2d");

    // DPR sizing
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
    ctx.clearRect(0,0,w,h);

    // Fixed axes
    const Lmin = 0, Lmax = 12;
    const wmin = 0, wmax = 4.2;

    const pad = { l: 52*dpr, r: 16*dpr, t: 18*dpr, b: 44*dpr };
    const X0 = pad.l, X1 = w - pad.r;
    const Y0 = pad.t, Y1 = h - pad.b;

    const xToPix = (L) => X0 + (L - Lmin) * (X1 - X0) / (Lmax - Lmin);
    const yToPix = (wr) => Y0 + (wmax - wr) * (Y1 - Y0) / (wmax - wmin);

    // Grid
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1*dpr;
    for (let i=0;i<=6;i++){
      const L = Lmin + i*(Lmax-Lmin)/6;
      const x = xToPix(L);
      ctx.beginPath(); ctx.moveTo(x,Y0); ctx.lineTo(x,Y1); ctx.stroke();
    }
    for (let j=0;j<=6;j++){
      const wr = wmin + j*(wmax-wmin)/6;
      const y = yToPix(wr);
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
    ctx.fillText("Employment (L)", (X0+X1)/2, Y1 + 32*dpr);
    ctx.save();
    ctx.translate(X0 - 36*dpr, (Y0+Y1)/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText("Real wage (w = W/P)", 0, 0);
    ctx.restore();

    // Helper: plot a line wr(L)
    function plotLine(fn, strokeStyle, width, dashed=false){
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = width*dpr;
      if (dashed) ctx.setLineDash([6*dpr, 6*dpr]); else ctx.setLineDash([]);
      ctx.beginPath();
      const N = 220;
      for (let i=0;i<=N;i++){
        const L = Lmin + (Lmax-Lmin)*i/N;
        const wr = fn(L);
        const x = xToPix(L);
        const y = yToPix(wr);
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Baseline curves (grey)
    plotLine((L)=> baseline.a - b*L, "rgba(0,0,0,0.25)", 2, true);
    plotLine((L)=> baseline.c + d*L, "rgba(0,0,0,0.25)", 2, true);

    // Current curves (blue)
    plotLine((L)=> state.a - b*L, "rgba(31,119,180,0.90)", 3, false);
    plotLine((L)=> state.c + d*L, "rgba(31,119,180,0.60)", 3, false);

    // Compute outcomes
    const { eq, w_actual, L_actual, U } = actualOutcome();

    // Draw wage line w_actual
    ctx.strokeStyle = "rgba(230,159,0,0.90)";
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    ctx.moveTo(X0, yToPix(w_actual));
    ctx.lineTo(X1, yToPix(w_actual));
    ctx.stroke();

    // Equilibrium point
    const xEq = xToPix(eq.L);
    const yEq = yToPix(eq.w);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath(); ctx.arc(xEq, yEq, 6*dpr, 0, Math.PI*2); ctx.fill();

    // Actual employment point at intersection of wage line with demand
    const xA = xToPix(L_actual);
    const yA = yToPix(w_actual);
    ctx.fillStyle = "rgba(230,159,0,0.95)";
    ctx.beginPath(); ctx.arc(xA, yA, 7*dpr, 0, Math.PI*2); ctx.fill();

    // Dashed guides to axes for actual point
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 2*dpr;
    ctx.setLineDash([6*dpr, 6*dpr]);
    ctx.beginPath(); ctx.moveTo(xA, yA); ctx.lineTo(xA, Y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xA, yA); ctx.lineTo(X0, yA); ctx.stroke();
    ctx.setLineDash([]);

    // Shade unemployment if any: from Ld to Ls at wage w_actual
    if (U > 1e-9) {
      const Ld_val = Ld(state.a, w_actual);
      const Ls_val = Ls(state.c, w_actual);
      const x1 = xToPix(clamp(Ld_val, Lmin, Lmax));
      const x2 = xToPix(clamp(Ls_val, Lmin, Lmax));
      const y = yToPix(w_actual);

      ctx.fillStyle = "rgba(230,159,0,0.18)";
      ctx.fillRect(Math.min(x1,x2), y, Math.abs(x2-x1), Y1 - y);

      // label unemployment
      ctx.fillStyle = "rgba(0,0,0,0.70)";
      ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Unemployment (excess supply)", Math.min(x1,x2) + 6*dpr, y + 6*dpr);
    }

    // Legend-like notes
    ctx.fillStyle = "rgba(0,0,0,0.60)";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Blue: current supply & demand", X0, Y0);
    ctx.fillText("Grey dashed: baseline", X0, Y0 + 16*dpr);
    ctx.fillText("Orange: real wage (actual)", X0, Y0 + 32*dpr);

    // Update metrics + explanation
    els.Lstar.textContent = eq.L.toFixed(2);
    els.Lact.textContent  = L_actual.toFixed(2);
    els.Unemp.textContent = U.toFixed(2);

    const wEq = eq.w;
    const wRealNow = wReal(state.W, state.P);
    const rigidityOn = state.realRigidity && state.wbar > 0;

    let expl = "";
    if (U <= 1e-9) {
      expl = `No unemployment. The market clears at the equilibrium real wage.`;
      if (state.realRigidity && state.wbar > wEq + 1e-9) {
        expl = `Real-wage floor binds above equilibrium, which would normally create unemployment—but sticky wage is off and wage is set at the floor; check settings.`;
      }
    } else {
      // diagnose source
      if (state.stickyW && !state.realRigidity) {
        expl =
          `Cyclical unemployment mechanism: wages are sticky. A demand shock can reduce labor demand, but nominal wage W does not adjust quickly. ` +
          `With P fixed, the real wage w=W/P stays high, so firms hire fewer workers (employment falls to labor demand).`;
      } else if (state.realRigidity) {
        expl =
          `Structural unemployment mechanism: a real-wage rigidity keeps the real wage from falling below w̄. ` +
          `If w̄ (or W/P) is above the market-clearing wage, firms hire fewer workers, generating unemployment even without a temporary demand shock.`;
      } else {
        expl =
          `Unemployment exists because the chosen real wage is above the market-clearing level. Employment is demand-determined at this wage.`;
      }
    }

    const wActualShown = w_actual.toFixed(2);
    const wEqShown = wEq.toFixed(2);
    const wNowShown = wRealNow.toFixed(2);
    const wbarShown = Number(state.wbar).toFixed(2);

    els.explainBox.innerHTML =
      `<strong>Numbers:</strong> equilibrium w*=${wEqShown}, actual w=${wActualShown} (W/P=${wNowShown}${rigidityOn ? `, w̄=${wbarShown}` : ""}).<br>` +
      `<strong>Interpretation:</strong> ${expl}`;

    // Note under chart
    els.chartNote.textContent =
      `If w is above w*, employment falls to Ld(w) and unemployment is Ls(w) − Ld(w).`;
  }

  // ----- UI wiring -----
  function syncUI(){
    els.W.value = String(state.W);
    els.P.value = String(state.P);
    els.a.value = String(state.a);
    els.c.value = String(state.c);
    els.wbar.value = String(state.wbar);
    els.wbarNum.value = String(state.wbar);

    els.stickyW.checked = state.stickyW;
    els.realRigidity.checked = state.realRigidity;

    els.Wv.textContent = Number(state.W).toFixed(1);
    els.Pv.textContent = Number(state.P).toFixed(1);
    els.av.textContent = Number(state.a).toFixed(2);
    els.cv.textContent = Number(state.c).toFixed(2);
  }

  function setFromControls(){
    state.stickyW = els.stickyW.checked;
    state.realRigidity = els.realRigidity.checked;

    state.W = Number(els.W.value);
    state.P = Number(els.P.value);
    state.a = Number(els.a.value);
    state.c = Number(els.c.value);

    const wb = Number(els.wbarNum.value);
    state.wbar = clamp(isFinite(wb) ? wb : Number(els.wbar.value), 0, 2.5);

    // keep sliders synced
    els.wbar.value = String(state.wbar);
    els.wbarNum.value = String(state.wbar);

    els.Wv.textContent = Number(state.W).toFixed(1);
    els.Pv.textContent = Number(state.P).toFixed(1);
    els.av.textContent = Number(state.a).toFixed(2);
    els.cv.textContent = Number(state.c).toFixed(2);
  }

  function reset(){
    state = {
      a: baseline.a,
      c: baseline.c,
      W: baseline.W,
      P: baseline.P,
      wbar: baseline.wbar,
      stickyW: true,
      realRigidity: false,
    };
    syncUI();
    draw();
    setStatus("Reset.");
  }

  function demandShock(sign){
    // negative shock reduces a; positive increases a
    const delta = (sign < 0) ? -0.50 : +0.50;
    state.a = clamp(state.a + delta, 1.5, 4.0);

    // if stickyW is on, keep W fixed; if not sticky, W adjusts to equilibrium (we implement by not forcing W here)
    // refresh UI sliders
    els.a.value = String(state.a);
    els.av.textContent = Number(state.a).toFixed(2);

    draw();
    setStatus(sign < 0 ? "Negative labor demand shock applied." : "Positive labor demand shock applied.");
  }

  // Event listeners
  const rerender = () => { setFromControls(); draw(); };

  els.stickyW.addEventListener("change", rerender);
  els.realRigidity.addEventListener("change", rerender);

  els.W.addEventListener("input", rerender);
  els.P.addEventListener("input", rerender);
  els.a.addEventListener("input", rerender);
  els.c.addEventListener("input", rerender);

  els.wbar.addEventListener("input", () => {
    els.wbarNum.value = els.wbar.value;
    rerender();
  });
  els.wbarNum.addEventListener("input", () => {
    els.wbar.value = els.wbarNum.value;
    rerender();
  });

  els.resetBtn.addEventListener("click", reset);
  els.shockNegBtn.addEventListener("click", () => demandShock(-1));
  els.shockPosBtn.addEventListener("click", () => demandShock(+1));

  // Initial draw
  syncUI();
  draw();
  setStatus("Ready.");
});
