window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const els = {
    scTitle: $("scTitle"),
    scDesc: $("scDesc"),
    status: $("status"),

    dAction: $("dAction"),
    dDir: $("dDir"),
    sAction: $("sAction"),
    sDir: $("sDir"),

    newBtn: $("newBtn"),
    resetBtn: $("resetBtn"),
    check1Btn: $("check1Btn"),
    whyBtn: $("whyBtn"),

    whyBox: $("whyBox"),
    whyDemand: $("whyDemand"),
    whySupply: $("whySupply"),
    whyNote: $("whyNote"),

    fb1: $("fb1"),
    stage2: $("stage2"),
    excess: $("excess"),
    pMove: $("pMove"),
    qMove: $("qMove"),
    check2Btn: $("check2Btn"),
    fb2: $("fb2"),

    chart: $("chart")
  };

  function setStatus(msg){ els.status.textContent = msg; }
  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;");
  }

  if (!window.ALONG_SHIFT_DATA || !Array.isArray(window.ALONG_SHIFT_DATA.scenarios)) {
    setStatus("ERROR: data.js did not load. Ensure data.js is in the same folder and loads before app.js.");
    return;
  }

  const DATA = window.ALONG_SHIFT_DATA;

  // ---------- Why panel ----------
  function renderWhyLists(highlight){
    els.whyDemand.innerHTML = DATA.demandShifters.map(x =>
      `<li class="${highlight?.side==='D' && highlight?.factor===x ? 'whyHi' : ''}">${escapeHtml(x)}</li>`
    ).join("");
    els.whySupply.innerHTML = DATA.supplyShifters.map(x =>
      `<li class="${highlight?.side==='S' && highlight?.factor===x ? 'whyHi' : ''}">${escapeHtml(x)}</li>`
    ).join("");
  }
  renderWhyLists(null);

  // ---------- Graph model ----------
  // Price-Quantity space with fixed axes
  const AX = { qMin: 0, qMax: 100, pMin: 0, pMax: 100 };

  // baseline curves: P = a - bQ (D), P = c + dQ (S)
  const base = {
    D: { a: 90, b: 0.8 },
    S: { c: 10, d: 0.7 }
  };

  function clone(x){ return JSON.parse(JSON.stringify(x)); }

  // app state machine:
  // stage = 0: baseline only
  // stage = 1: scenario loaded, no shifts shown yet (student predicts)
  // stage = 2: shifts shown (but not new eq or excess), student predicts outcomes
  // stage = 3: show shifts + excess + new equilibrium
  let stage = 0;
  let scenario = null;

  let curves = {
    D0: clone(base.D), S0: clone(base.S), // original dashed (always baseline)
    D1: clone(base.D), S1: clone(base.S)  // "new" curves after shift (when revealed)
  };

  function solveEq(D, S){
    const Q = (D.a - S.c) / (D.b + S.d);
    const P = S.c + S.d * Q;
    return { Q, P };
  }

  const eq0 = solveEq(curves.D0, curves.S0); // baseline equilibrium constant
  // eq1 computed once scenario shifts are applied

  function applyShifts(sc){
    curves.D1 = clone(base.D);
    curves.S1 = clone(base.S);

    // Demand shift: adjust intercept a
    if (sc.demand.action === "SHIFT") {
      curves.D1.a += (sc.demand.dir === "R" ? 12 : -12);
    }
    // Supply shift: adjust intercept c (right shift = lower c)
    if (sc.supply.action === "SHIFT") {
      curves.S1.c += (sc.supply.dir === "R" ? -12 : 12);
    }
  }

  function qDemandAtP(D, P){ return (D.a - P)/D.b; }
  function qSupplyAtP(S, P){ return (P - S.c)/S.d; }

  function computeOutcome(sc){
    // After shifts (curves D1/S1), what happens to excess at original price P1=eq0.P?
    const P1 = eq0.P;
    const Qd = qDemandAtP(curves.D1, P1);
    const Qs = qSupplyAtP(curves.S1, P1);

    let excess = "NONE";
    if (Qd > Qs + 1e-6) excess = "ED";
    else if (Qs > Qd + 1e-6) excess = "ES";

    // New equilibrium:
    const eq1 = solveEq(curves.D1, curves.S1);

    // Price movement:
    let pMove = "NONE";
    if (eq1.P > P1 + 1e-6) pMove = "UP";
    else if (eq1.P < P1 - 1e-6) pMove = "DOWN";

    // Quantity movement:
    let qMove = "NONE";
    if (eq1.Q > eq0.Q + 1e-6) qMove = "UP";
    else if (eq1.Q < eq0.Q - 1e-6) qMove = "DOWN";

    // For completeness: if both curves could shift in opposite directions, quantity can be ambiguous.
    // In this version, we only have single shifts OR price changes, so not ambiguous.
    // Still, we’ll accept "AMB" only when both D and S shift and qMove depends (not used here).
    const bothShift = (sc.demand.action==="SHIFT" && sc.supply.action==="SHIFT");
    if (bothShift) qMove = "AMB";

    return { excess, pMove, qMove, Qd, Qs, eq1 };
  }

  // ---------- Drawing ----------
  function draw(){
    const canvas = els.chart;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth * dpr;
    const H = canvas.clientHeight * dpr;
    if (canvas.width !== W || canvas.height !== H){ canvas.width = W; canvas.height = H; }
    ctx.clearRect(0,0,W,H);

    const pad = { l: 58*dpr, r: 18*dpr, t: 18*dpr, b: 48*dpr };
    const X0 = pad.l, X1 = W - pad.r;
    const Y0 = pad.t, Y1 = H - pad.b;

    const qToX = (q) => X0 + (q - AX.qMin) * (X1 - X0) / (AX.qMax - AX.qMin);
    const pToY = (p) => Y0 + (AX.pMax - p) * (Y1 - Y0) / (AX.pMax - AX.pMin);

    // grid
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1*dpr;
    for (let k=0;k<=5;k++){
      const q = AX.qMin + k*(AX.qMax-AX.qMin)/5;
      const x = qToX(q);
      ctx.beginPath(); ctx.moveTo(x,Y0); ctx.lineTo(x,Y1); ctx.stroke();
    }
    for (let k=0;k<=5;k++){
      const p = AX.pMin + k*(AX.pMax-AX.pMin)/5;
      const y = pToY(p);
      ctx.beginPath(); ctx.moveTo(X0,y); ctx.lineTo(X1,y); ctx.stroke();
    }

    // axes labels
    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Quantity", (X0+X1)/2, Y1 + 14*dpr);

    ctx.save();
    ctx.translate(X0 - 40*dpr, (Y0+Y1)/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Price", 0, 0);
    ctx.restore();

    const cDemand = "rgba(31,119,180,0.90)";
    const cSupply = "rgba(230,159,0,0.95)";
    const cDash   = "rgba(0,0,0,0.35)";

    function drawCurve(isDemand, params, style, dashed){
      const qA = 0, qB = 100;
      const pA = isDemand ? (params.a - params.b*qA) : (params.c + params.d*qA);
      const pB = isDemand ? (params.a - params.b*qB) : (params.c + params.d*qB);

      ctx.strokeStyle = style;
      ctx.lineWidth = 3*dpr;
      ctx.setLineDash(dashed ? [6*dpr, 6*dpr] : []);
      ctx.beginPath();
      ctx.moveTo(qToX(qA), pToY(pA));
      ctx.lineTo(qToX(qB), pToY(pB));
      ctx.stroke();
      ctx.setLineDash([]);

      // label
      ctx.fillStyle = style;
      ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const qL = 70;
      const pL = isDemand ? (params.a - params.b*qL) : (params.c + params.d*qL);
      ctx.fillText(isDemand ? "D" : "S", qToX(qL)+6*dpr, pToY(pL));
    }

    // Always draw baseline dashed curves
    drawCurve(true,  curves.D0, cDash, true);
    drawCurve(false, curves.S0, cDash, true);

    // Draw current curves depending on stage
    if (stage >= 2) {
      drawCurve(true,  curves.D1, cDemand, false);
      drawCurve(false, curves.S1, cSupply, false);
    } else {
      // before reveal: show baseline as the “current” too (solid), so students see the market
      drawCurve(true,  curves.D0, cDemand, false);
      drawCurve(false, curves.S0, cSupply, false);
    }

    // Helper: point + guide lines + custom tick labels
    function markEq(eq, labelP, labelQ, color){
      // dot
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(qToX(eq.Q), pToY(eq.P), 5*dpr, 0, Math.PI*2);
      ctx.fill();

      // dashed guides to axes
      ctx.strokeStyle = "rgba(0,0,0,0.28)";
      ctx.lineWidth = 2*dpr;
      ctx.setLineDash([4*dpr, 6*dpr]);
      ctx.beginPath(); ctx.moveTo(qToX(eq.Q), pToY(eq.P)); ctx.lineTo(qToX(eq.Q), pToY(0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(qToX(eq.Q), pToY(eq.P)); ctx.lineTo(qToX(0), pToY(eq.P)); ctx.stroke();
      ctx.setLineDash([]);

      // custom tick labels at those coordinates
      ctx.fillStyle = "rgba(0,0,0,0.70)";
      ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;

      // Q tick label
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(labelQ, qToX(eq.Q), pToY(0) + 10*dpr);

      // P tick label
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(labelP, qToX(0) - 8*dpr, pToY(eq.P));
    }

    // Mark initial equilibrium always
    markEq(eq0, "P₁", "Q₁", "rgba(0,0,0,0.70)");

    // Stage 3: show excess wedge at P1 and new equilibrium P2/Q2
    if (stage >= 3 && scenario) {
      const out = computeOutcome(scenario);
      const P1 = eq0.P;

      // Excess demand/supply at P1
      const Qd = out.Qd;
      const Qs = out.Qs;

      // clamp
      const qL = Math.max(AX.qMin, Math.min(AX.qMax, Math.min(Qd, Qs)));
      const qR = Math.max(AX.qMin, Math.min(AX.qMax, Math.max(Qd, Qs)));

      // vertical markers at Qd and Qs on price line
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 2*dpr;
      ctx.setLineDash([4*dpr, 6*dpr]);
      ctx.beginPath(); ctx.moveTo(qToX(Qd), pToY(P1)); ctx.lineTo(qToX(Qd), pToY(0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(qToX(Qs), pToY(P1)); ctx.lineTo(qToX(Qs), pToY(0)); ctx.stroke();
      ctx.setLineDash([]);

      // shade wedge on price line between Qd and Qs
      ctx.fillStyle = out.excess === "ED" ? "rgba(31,119,180,0.12)" :
                      out.excess === "ES" ? "rgba(230,159,0,0.14)" :
                      "rgba(0,0,0,0.0)";
      if (out.excess !== "NONE") {
        ctx.beginPath();
        ctx.rect(qToX(qL), pToY(P1) - 6*dpr, (qToX(qR)-qToX(qL)), 12*dpr);
        ctx.fill();

        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(out.excess === "ED" ? "Excess demand" : "Excess supply", (qToX(qL)+qToX(qR))/2, pToY(P1) - 10*dpr);
      }

      // New equilibrium
      markEq(out.eq1, "P₂", "Q₂", "rgba(0,0,0,0.70)");
    }
  }

  // ---------- Scenario selection ----------
  function pickScenario(){
    const pool = DATA.scenarios.slice();
    for (let i=pool.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool[0];
  }

  function setScenario(sc){
    scenario = sc;
    stage = 1;

    els.scTitle.textContent = sc.title;
    els.scDesc.textContent = sc.desc;
    setStatus("Stage 1: classify demand and supply (along vs shift).");

    // reset user inputs
    els.dAction.value = ""; els.dDir.value = "";
    els.sAction.value = ""; els.sDir.value = "";
    els.fb1.style.display = "none"; els.fb1.innerHTML = "";

    // hide stage2
    els.stage2.style.display = "none";
    els.excess.value = ""; els.pMove.value = ""; els.qMove.value = "";
    els.fb2.style.display = "none"; els.fb2.innerHTML = "";

    // reset why
    renderWhyLists(null);
    els.whyNote.textContent = "After you pass Stage 1, the app highlights what changed.";
    // keep whyBox hidden until user opens
    // curves prepared but not shown until stage 2
    applyShifts(sc);

    draw();
  }

  function reset(){
    scenario = null;
    stage = 0;

    curves.D0 = clone(base.D); curves.S0 = clone(base.S);
    curves.D1 = clone(base.D); curves.S1 = clone(base.S);

    els.scTitle.textContent = "—";
    els.scDesc.textContent = "Click “New Scenario” to begin.";
    setStatus("Ready.");

    els.dAction.value = ""; els.dDir.value = "";
    els.sAction.value = ""; els.sDir.value = "";
    els.fb1.style.display = "none"; els.fb1.innerHTML = "";

    els.stage2.style.display = "none";
    els.excess.value = ""; els.pMove.value = ""; els.qMove.value = "";
    els.fb2.style.display = "none"; els.fb2.innerHTML = "";

    renderWhyLists(null);
    els.whyBox.style.display = "none";

    draw();
  }

  // ---------- Stage checks ----------
  function checkStage1(){
    if (!scenario) { setStatus("Click New Scenario first."); return; }

    const dA = els.dAction.value, dD = els.dDir.value;
    const sA = els.sAction.value, sD = els.sDir.value;
    if (!dA || !dD || !sA || !sD) { setStatus("Please complete all Stage 1 dropdowns."); return; }

    const ok =
      dA === scenario.demand.action &&
      dD === scenario.demand.dir &&
      sA === scenario.supply.action &&
      sD === scenario.supply.dir;

    els.fb1.style.display = "block";
    els.fb1.innerHTML = ok
      ? `<span class="tagOK">Correct</span> Nice. Now predict the market outcome (Stage 2).`
      : `<span class="tagBad">Not quite</span> Remember: price change → movement along; anything else → shift.`;

    if (ok) {
      stage = 2; // reveal shifts (but not new eq)
      els.stage2.style.display = "block";

      // highlight why factor
      if (scenario.why?.side === "D" || scenario.why?.side === "S") {
        renderWhyLists({ side: scenario.why.side, factor: scenario.why.factor });
        els.whyNote.textContent = `Highlighted: ${scenario.why.side === "D" ? "Demand" : "Supply"} shifter → ${scenario.why.factor}.`;
      } else {
        renderWhyLists(null);
        els.whyNote.textContent = "This scenario changes the price of the good → movement along.";
      }
      draw();
      setStatus("Stage 2: predict excess demand/supply and what happens to price and quantity.");
    } else {
      setStatus("Try again (Stage 1).");
    }
  }

  function checkStage2(){
    if (!scenario || stage < 2) { setStatus("Complete Stage 1 first."); return; }

    const ex = els.excess.value;
    const pM = els.pMove.value;
    const qM = els.qMove.value;
    if (!ex || !pM || !qM) { setStatus("Please complete all Stage 2 dropdowns."); return; }

    const out = computeOutcome(scenario);

    const okEx = ex === out.excess;
    const okP  = pM === out.pMove;
    // accept AMB if our logic says ambiguous (not used here), else exact match
    const okQ  = (out.qMove === "AMB") ? (qM === "AMB") : (qM === out.qMove);

    const ok = okEx && okP && okQ;

    els.fb2.style.display = "block";
    els.fb2.innerHTML = ok
      ? `<span class="tagOK">Correct</span> Great — now the graph will reveal the imbalance and the new equilibrium.`
      : `<span class="tagBad">Not quite</span> Think: at $begin:math:text$P\_1$end:math:text$, compare $begin:math:text$Q\_d$end:math:text$ and $begin:math:text$Q\_s$end:math:text$. Shortage → price rises; surplus → price falls.`;

    if (ok) {
      stage = 3; // reveal everything
      draw();
      setStatus("Revealed: excess demand/supply and new equilibrium.");
    } else {
      setStatus("Try again (Stage 2).");
    }
  }

  // Why toggle
  els.whyBtn.addEventListener("click", () => {
    els.whyBox.style.display = (els.whyBox.style.display === "none") ? "block" : "none";
  });

  // Buttons
  els.newBtn.addEventListener("click", () => setScenario(pickScenario()));
  els.resetBtn.addEventListener("click", reset);
  els.check1Btn.addEventListener("click", checkStage1);
  els.check2Btn.addEventListener("click", checkStage2);

  // Typeset header once
  const howTo = document.getElementById("howTo");
  if (howTo && window.MathJax?.typesetPromise) window.MathJax.typesetPromise([howTo]);

  // init
  reset();
});
