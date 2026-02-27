window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const els = {
    scTitle: $("scTitle"),
    scDesc: $("scDesc"),

    qCurve: $("qCurve"),
    qType: $("qType"),
    qDir: $("qDir"),

    newBtn: $("newBtn"),
    resetBtn: $("resetBtn"),
    submitBtn: $("submitBtn"),
    status: $("status"),

    chart: $("chart"),

    whyToggle: $("whyToggle"),
    whyBox: $("whyBox"),
    whyDemand: $("whyDemand"),
    whySupply: $("whySupply"),
    whyNote: $("whyNote"),

    fb: $("fb"),
    hint: $("hint"),
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

  // Build Why lists (static)
  function renderWhyLists(highlight){
    els.whyDemand.innerHTML = DATA.demandShifters.map(x =>
      `<li class="${highlight?.side==='D' && highlight?.factor===x ? 'whyHi' : ''}">${escapeHtml(x)}</li>`
    ).join("");
    els.whySupply.innerHTML = DATA.supplyShifters.map(x =>
      `<li class="${highlight?.side==='S' && highlight?.factor===x ? 'whyHi' : ''}">${escapeHtml(x)}</li>`
    ).join("");
  }
  renderWhyLists(null);

  // -------- Graph model (simple, clean lines) --------
  // We'll draw linear curves in price-quantity space with fixed axes:
  // Q on x: 0..100, P on y: 0..100
  // Demand: P = a - bQ, Supply: P = c + dQ
  const AX = { qMin: 0, qMax: 100, pMin: 0, pMax: 100 };

  // baseline curve parameters
  const base = {
    D: { a: 90, b: 0.8 },   // downward
    S: { c: 10, d: 0.7 }    // upward
  };

  let scenario = null;
  let state = {
    // current curve parameters (start equal to baseline)
    D: { ...base.D },
    S: { ...base.S },
    // "old" dashed curves
    D0: { ...base.D },
    S0: { ...base.S }
  };

  function solveEquilibrium(D, S){
    // a - bQ = c + dQ => Q = (a-c)/(b+d), P = c + dQ
    const Q = (D.a - S.c) / (D.b + S.d);
    const P = S.c + S.d * Q;
    return { Q, P };
  }

  function applyScenarioToCurves(sc){
    // reset dashed to baseline for visual reference
    state.D0 = { ...base.D };
    state.S0 = { ...base.S };
    state.D = { ...base.D };
    state.S = { ...base.S };

    // If SHIFT: adjust intercepts (simple)
    // Demand right shift => higher intercept a; left shift => lower a
    // Supply right shift => lower intercept c (more supply at each price) OR lower costs
    // We'll implement supply right shift by decreasing c; left shift by increasing c
    if (sc.type === "SHIFT" && sc.curve === "D") {
      state.D.a += (sc.dir === "R" ? 12 : -12);
    }
    if (sc.type === "SHIFT" && sc.curve === "S") {
      state.S.c += (sc.dir === "R" ? -12 : 12);
    }

    // Along: keep curves same; we’ll show movement along both curves via a price change
    // We’ll define a “new price” line and show Qd and Qs at that price.
  }

  function qDemandAtPrice(D, P){ return (D.a - P)/D.b; }
  function qSupplyAtPrice(S, P){ return (P - S.c)/S.d; }

  // Drawing
  function draw(){
    const canvas = els.chart;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth * dpr;
    const H = canvas.clientHeight * dpr;
    if (canvas.width !== W || canvas.height !== H){
      canvas.width = W; canvas.height = H;
    }
    ctx.clearRect(0,0,W,H);

    const pad = { l: 52*dpr, r: 16*dpr, t: 18*dpr, b: 44*dpr };
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
    ctx.fillText("Quantity", (X0+X1)/2, Y1 + 12*dpr);

    ctx.save();
    ctx.translate(X0 - 34*dpr, (Y0+Y1)/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Price", 0, 0);
    ctx.restore();

    // helper to draw a line from Q range
    function drawCurve(DorS, style, dashed){
      const isD = (DorS === "D");
      const params = dashed ? (isD ? state.D0 : state.S0) : (isD ? state.D : state.S);

      ctx.strokeStyle = style;
      ctx.lineWidth = 3*dpr;
      ctx.setLineDash(dashed ? [6*dpr, 6*dpr] : []);

      ctx.beginPath();
      // choose two q endpoints and compute p
      const qA = 0, qB = 100;
      const pA = isD ? (params.a - params.b*qA) : (params.c + params.d*qA);
      const pB = isD ? (params.a - params.b*qB) : (params.c + params.d*qB);
      ctx.moveTo(qToX(qA), pToY(pA));
      ctx.lineTo(qToX(qB), pToY(pB));
      ctx.stroke();
      ctx.setLineDash([]);

      // label
      ctx.fillStyle = style;
      ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const qL = isD ? 70 : 70;
      const pL = isD ? (params.a - params.b*qL) : (params.c + params.d*qL);
      ctx.fillText(isD ? "D" : "S", qToX(qL)+6*dpr, pToY(pL));
    }

    // colors
    const cDemand = "rgba(31,119,180,0.90)";         // blue-ish
    const cSupply = "rgba(230,159,0,0.95)";          // orange-ish
    const cDash   = "rgba(0,0,0,0.35)";

    // dashed originals
    drawCurve("D", cDash, true);
    drawCurve("S", cDash, true);

    // current
    drawCurve("D", cDemand, false);
    drawCurve("S", cSupply, false);

    // equilibrium points
    const eq0 = solveEquilibrium(state.D0, state.S0);
    const eq1 = solveEquilibrium(state.D, state.S);

    function dot(q,p,style){
      ctx.fillStyle = style;
      ctx.beginPath();
      ctx.arc(qToX(q), pToY(p), 5*dpr, 0, Math.PI*2);
      ctx.fill();
    }

    // show baseline eq as grey dot
    dot(eq0.Q, eq0.P, "rgba(0,0,0,0.35)");
    // show new eq as black-ish dot
    dot(eq1.Q, eq1.P, "rgba(0,0,0,0.70)");

    // If movement along due to price change, show horizontal price line and Qd/Qs
    if (scenario && scenario.type === "ALONG"){
      // define a new price relative to baseline
      const Pnew = clamp(eq0.P + (scenario.id === "p_up" ? 12 : -12), 5, 95);

      // price line
      ctx.strokeStyle = "rgba(0,0,0,0.30)";
      ctx.lineWidth = 2*dpr;
      ctx.setLineDash([4*dpr, 6*dpr]);
      ctx.beginPath();
      ctx.moveTo(X0, pToY(Pnew));
      ctx.lineTo(X1, pToY(Pnew));
      ctx.stroke();
      ctx.setLineDash([]);

      // quantities at Pnew
      const Qd = qDemandAtPrice(state.D, Pnew);
      const Qs = qSupplyAtPrice(state.S, Pnew);

      // mark points on curves
      dot(Qd, Pnew, cDemand);
      dot(Qs, Pnew, cSupply);

      // labels
      ctx.fillStyle = "rgba(0,0,0,0.70)";
      ctx.font = `${11*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(`P (new)`, X0 + 6*dpr, pToY(Pnew) - 4*dpr);

      ctx.fillStyle = cDemand;
      ctx.fillText(`Qd`, qToX(Qd) + 6*dpr, pToY(Pnew) - 4*dpr);
      ctx.fillStyle = cSupply;
      ctx.fillText(`Qs`, qToX(Qs) + 6*dpr, pToY(Pnew) - 4*dpr);
    }
  }

  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

  // ---------- Scenario logic ----------
  function pickScenario(){
    const pool = DATA.scenarios.slice();
    // shuffle
    for (let i=pool.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool[0];
  }

  function setScenario(sc){
    scenario = sc;
    els.scTitle.textContent = sc.title;
    els.scDesc.textContent = sc.desc;
    setStatus("Answer the questions, then click Check.");

    // reset user inputs
    els.qCurve.value = "";
    els.qType.value = "";
    els.qDir.value = "";

    // clear feedback
    els.fb.style.display = "none";
    els.fb.innerHTML = "";

    // reset why highlights
    renderWhyLists(null);
    els.whyNote.textContent = "After you click “Check,” the app will highlight which factor changed.";

    // apply to curves for visualization
    applyScenarioToCurves(sc);
    draw();
  }

  function reset(){
    scenario = null;
    state.D = { ...base.D };
    state.S = { ...base.S };
    state.D0 = { ...base.D };
    state.S0 = { ...base.S };

    els.scTitle.textContent = "—";
    els.scDesc.textContent = "Click “New Scenario” to begin.";
    els.qCurve.value = "";
    els.qType.value = "";
    els.qDir.value = "";
    els.fb.style.display = "none";
    els.fb.innerHTML = "";
    renderWhyLists(null);
    els.whyBox.style.display = "none";
    setStatus("Ready.");
    draw();
  }

  function checkAnswers(){
    if (!scenario){
      setStatus("Click New Scenario first.");
      return;
    }

    const aCurve = els.qCurve.value;
    const aType = els.qType.value;
    const aDir = els.qDir.value;

    // basic validation
    if (!aCurve || !aType || !aDir){
      setStatus("Please answer all three questions.");
      return;
    }

    const okCurve = (aCurve === scenario.curve);
    const okType  = (aType === scenario.type);
    const okDir   = (aDir === scenario.dir);

    const allOk = okCurve && okType && okDir;

    els.fb.style.display = "block";
    els.fb.innerHTML = `
      ${allOk ? `<span class="tagOK">Correct</span>` : `<span class="tagBad">Not quite</span>`}
      <strong>Correct classification:</strong>
      Curve = <strong>${scenario.curve === "D" ? "Demand" : scenario.curve === "S" ? "Supply" : "Neither"}</strong>,
      Type = <strong>${scenario.type === "SHIFT" ? "Shift" : "Movement along"}</strong>,
      Direction = <strong>${scenario.dir === "R" ? "Right (increase)" : scenario.dir === "L" ? "Left (decrease)" : "Not applicable"}</strong>.
      <br><br>
      <strong>Explanation:</strong> ${escapeHtml(scenario.explain)}
    `;

    // highlight Why factor
    if (scenario.why?.side === "D" || scenario.why?.side === "S"){
      renderWhyLists({ side: scenario.why.side, factor: scenario.why.factor });
      els.whyNote.textContent = `Highlighted: ${scenario.why.side === "D" ? "Demand" : "Supply"} shifter → ${scenario.why.factor}.`;
      els.whyBox.style.display = "block";
    } else {
      renderWhyLists(null);
      els.whyNote.textContent = "This is a price-of-the-good change → movement along.";
      els.whyBox.style.display = "block";
    }

    setStatus(allOk ? "Nice — correct." : "Check the rule and try again (or click New Scenario).");
  }

  // Why toggle
  els.whyToggle.addEventListener("click", () => {
    els.whyBox.style.display = (els.whyBox.style.display === "none") ? "block" : "none";
  });

  // Buttons
  els.newBtn.addEventListener("click", () => setScenario(pickScenario()));
  els.resetBtn.addEventListener("click", reset);
  els.submitBtn.addEventListener("click", checkAnswers);

  // Typeset header once
  const howTo = document.getElementById("howTo");
  if (howTo && window.MathJax?.typesetPromise) window.MathJax.typesetPromise([howTo]);

  // init
  reset();
});
