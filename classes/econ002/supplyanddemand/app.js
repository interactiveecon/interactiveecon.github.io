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

  // ---------- Conditional direction dropdowns ----------
  function setDirOptions(selectEl, opts){
    selectEl.innerHTML = `<option value="" selected>Select…</option>` +
      opts.map(o => `<option value="${o.value}">${o.label}</option>`).join("");
  }

  function updateDirDropdowns(){
    // Demand
    const dA = els.dAction.value;
    if (dA === "NONE") {
      setDirOptions(els.dDir, [{ value:"NA", label:"Not applicable" }]);
      els.dDir.value = "NA";
    } else if (dA === "ALONG") {
      setDirOptions(els.dDir, [
        { value:"UP", label:"Higher price (move up along demand)" },
        { value:"DOWN", label:"Lower price (move down along demand)" }
      ]);
    } else if (dA === "SHIFT") {
      setDirOptions(els.dDir, [
        { value:"R", label:"Right (demand increases)" },
        { value:"L", label:"Left (demand decreases)" }
      ]);
    } else {
      setDirOptions(els.dDir, []);
    }

    // Supply
    const sA = els.sAction.value;
    if (sA === "NONE") {
      setDirOptions(els.sDir, [{ value:"NA", label:"Not applicable" }]);
      els.sDir.value = "NA";
    } else if (sA === "ALONG") {
      setDirOptions(els.sDir, [
        { value:"UP", label:"Higher price (move up along supply)" },
        { value:"DOWN", label:"Lower price (move down along supply)" }
      ]);
    } else if (sA === "SHIFT") {
      // You requested supply shift labeled up/down
      setDirOptions(els.sDir, [
        { value:"UPSHIFT", label:"Up (supply decreases)" },
        { value:"DOWNSHIFT", label:"Down (supply increases)" }
      ]);
    } else {
      setDirOptions(els.sDir, []);
    }
  }

  els.dAction.addEventListener("change", () => {
    const prev = els.dDir.value;
    updateDirDropdowns();
    // keep selection if still valid
    if ([...els.dDir.options].some(o => o.value === prev)) els.dDir.value = prev;
  });

  els.sAction.addEventListener("change", () => {
    const prev = els.sDir.value;
    updateDirDropdowns();
    if ([...els.sDir.options].some(o => o.value === prev)) els.sDir.value = prev;
  });

  // ---------- Graph model ----------
  const AX = { qMin: 0, qMax: 100, pMin: 0, pMax: 100 };
  const base = { D: { a: 90, b: 0.8 }, S: { c: 10, d: 0.7 } };

  function clone(x){ return JSON.parse(JSON.stringify(x)); }
  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

  let stage = 0;
  let scenario = null;

  let curves = {
    D0: clone(base.D), S0: clone(base.S),
    D1: clone(base.D), S1: clone(base.S)
  };

  function solveEq(D, S){
    const Q = (D.a - S.c) / (D.b + S.d);
    const P = S.c + S.d * Q;
    return { Q, P };
  }
  const eq0 = solveEq(curves.D0, curves.S0);

  function applyShifts(sc){
    curves.D1 = clone(base.D);
    curves.S1 = clone(base.S);

    if (sc.demand.action === "SHIFT") {
      curves.D1.a += (sc.demand.dir === "R" ? 12 : -12);
    }
    if (sc.supply.action === "SHIFT") {
      curves.S1.c += (sc.supply.dir === "R" ? -12 : 12);
    }
  }

  function qDemandAtP(D, P){ return (D.a - P)/D.b; }
  function qSupplyAtP(S, P){ return (P - S.c)/S.d; }

  function computeOutcome(sc){
    const P1 = eq0.P;
    const Qd = qDemandAtP(curves.D1, P1);
    const Qs = qSupplyAtP(curves.S1, P1);

    let excess = "NONE";
    if (Qd > Qs + 1e-6) excess = "ED";
    else if (Qs > Qd + 1e-6) excess = "ES";

    const eq1 = solveEq(curves.D1, curves.S1);

    let pMove = "NONE";
    if (eq1.P > P1 + 1e-6) pMove = "UP";
    else if (eq1.P < P1 - 1e-6) pMove = "DOWN";

    let qMove = "NONE";
    if (eq1.Q > eq0.Q + 1e-6) qMove = "UP";
    else if (eq1.Q < eq0.Q - 1e-6) qMove = "DOWN";

    const bothShift = (sc.demand.action==="SHIFT" && sc.supply.action==="SHIFT");
    if (bothShift) qMove = "AMB";

    return { excess, pMove, qMove, Qd, Qs, eq1 };
  }

  // ---------- Drawing ----------
  function drawArrow(ctx, x1,y1,x2,y2, dpr){
    // line
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
    // arrow head
    const ang = Math.atan2(y2-y1, x2-x1);
    const len = 10*dpr;
    const a1 = ang + Math.PI*0.8;
    const a2 = ang - Math.PI*0.8;
    ctx.beginPath();
    ctx.moveTo(x2,y2);
    ctx.lineTo(x2 + len*Math.cos(a1), y2 + len*Math.sin(a1));
    ctx.lineTo(x2 + len*Math.cos(a2), y2 + len*Math.sin(a2));
    ctx.closePath();
    ctx.fill();
  }

  function draw(){
    const canvas = els.chart;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth * dpr;
    const H = canvas.clientHeight * dpr;
    if (canvas.width !== W || canvas.height !== H){ canvas.width = W; canvas.height = H; }
    ctx.clearRect(0,0,W,H);

    const pad = { l: 58*dpr, r: 18*dpr, t: 18*dpr, b: 58*dpr }; // extra bottom padding
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
    // ✅ move Quantity label lower so it doesn't cover Q₁/Q₂ ticks
    ctx.fillText("Quantity", (X0+X1)/2, Y1 + 26*dpr);

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

      // label at far right end
      const qL = 96;
      const pL = isDemand ? (params.a - params.b*qL) : (params.c + params.d*qL);
      ctx.fillStyle = style;
      ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(isDemand ? "D" : "S", qToX(qL) + 6*dpr, pToY(pL));
    }

    // baseline dashed
    drawCurve(true,  curves.D0, cDash, true);
    drawCurve(false, curves.S0, cDash, true);

    // current curves
    if (stage >= 2) {
      drawCurve(true,  curves.D1, cDemand, false);
      drawCurve(false, curves.S1, cSupply, false);
    } else {
      drawCurve(true,  curves.D0, cDemand, false);
      drawCurve(false, curves.S0, cSupply, false);
    }

    // equilibrium marker with guides + labels
    function markEq(eq, labelP, labelQ, color){
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(qToX(eq.Q), pToY(eq.P), 5*dpr, 0, Math.PI*2);
      ctx.fill();

      ctx.strokeStyle = "rgba(0,0,0,0.28)";
      ctx.lineWidth = 2*dpr;
      ctx.setLineDash([4*dpr, 6*dpr]);
      ctx.beginPath(); ctx.moveTo(qToX(eq.Q), pToY(eq.P)); ctx.lineTo(qToX(eq.Q), pToY(0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(qToX(eq.Q), pToY(eq.P)); ctx.lineTo(qToX(0), pToY(eq.P)); ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(0,0,0,0.70)";
      ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;

      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(labelQ, qToX(eq.Q), pToY(0) + 10*dpr);

      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(labelP, qToX(0) - 8*dpr, pToY(eq.P));
    }

    markEq(eq0, "P₁", "Q₁", "rgba(0,0,0,0.70)");

    // ✅ shift arrows when revealed (stage >= 2)
    if (stage >= 2 && scenario) {
      ctx.lineWidth = 2.5*dpr;

      // Demand shift arrow: horizontal right/left near mid of curve
      if (scenario.demand.action === "SHIFT") {
        const dir = scenario.demand.dir; // R/L
        ctx.strokeStyle = cDemand;
        ctx.fillStyle = cDemand;
        const y = pToY(55);
        const xMid = qToX(55);
        const dx = 22*dpr * (dir === "R" ? 1 : -1);
        drawArrow(ctx, xMid - dx, y, xMid + dx, y, dpr);
      }

      // Supply shift arrow: up/down (as you want to teach it)
      if (scenario.supply.action === "SHIFT") {
        // In your dataset supply SHIFT uses dir R/L internally,
        // but we want the arrow to point "down" for increase (R) and "up" for decrease (L)
        const up = (scenario.supply.dir === "L"); // supply decreases -> up
        ctx.strokeStyle = cSupply;
        ctx.fillStyle = cSupply;
        const x = qToX(65);
        const yMid = pToY(45);
        const dy = 22*dpr * (up ? -1 : 1);
        drawArrow(ctx, x, yMid - dy, x, yMid + dy, dpr);
      }
    }

    // stage 3 extras
    if (stage >= 3 && scenario) {
      const out = computeOutcome(scenario);
      const P1 = eq0.P;

      const Qd = out.Qd;
      const Qs = out.Qs;

      const qL = clamp(Math.min(Qd, Qs), AX.qMin, AX.qMax);
      const qR = clamp(Math.max(Qd, Qs), AX.qMin, AX.qMax);

      // vertical markers at Qd/Qs
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 2*dpr;
      ctx.setLineDash([4*dpr, 6*dpr]);
      ctx.beginPath(); ctx.moveTo(qToX(Qd), pToY(P1)); ctx.lineTo(qToX(Qd), pToY(0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(qToX(Qs), pToY(P1)); ctx.lineTo(qToX(Qs), pToY(0)); ctx.stroke();
      ctx.setLineDash([]);

      // highlight segment on price line
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

        // ✅ ED below; ES above
        if (out.excess === "ED") {
          ctx.textBaseline = "top";
          ctx.fillText("Excess demand", (qToX(qL)+qToX(qR))/2, pToY(P1) + 10*dpr);
        } else {
          ctx.textBaseline = "bottom";
          ctx.fillText("Excess supply", (qToX(qL)+qToX(qR))/2, pToY(P1) - 10*dpr);
        }
      }

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

    els.dAction.value = "";
    els.sAction.value = "";
    updateDirDropdowns();
    els.dDir.value = "";
    els.sDir.value = "";

    els.fb1.style.display = "none";
    els.fb1.innerHTML = "";

    els.stage2.style.display = "none";
    els.excess.value = ""; els.pMove.value = ""; els.qMove.value = "";
    els.fb2.style.display = "none"; els.fb2.innerHTML = "";

    renderWhyLists(null);
    els.whyNote.textContent = "After you pass Stage 1, the app highlights what changed.";

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

    els.dAction.value = "";
    els.sAction.value = "";
    updateDirDropdowns();
    els.dDir.value = "";
    els.sDir.value = "";

    els.fb1.style.display = "none"; els.fb1.innerHTML = "";

    els.stage2.style.display = "none";
    els.excess.value = ""; els.pMove.value = ""; els.qMove.value = "";
    els.fb2.style.display = "none"; els.fb2.innerHTML = "";

    renderWhyLists(null);
    els.whyBox.style.display = "none";

    draw();
  }

  // ---------- Stage checks ----------
  function normalizeSupplyShiftDirForCheck(val){
    // Student sees UPSHIFT = supply decreases (maps to internal "L")
    // Student sees DOWNSHIFT = supply increases (maps to internal "R")
    if (val === "UPSHIFT") return "L";
    if (val === "DOWNSHIFT") return "R";
    return val;
  }

  function checkStage1(){
    if (!scenario) { setStatus("Click New Scenario first."); return; }

    const dA = els.dAction.value, dD = els.dDir.value;
    const sA = els.sAction.value, sDraw = els.sDir.value;
    if (!dA || !dD || !sA || !sDraw) { setStatus("Please complete all Stage 1 dropdowns."); return; }

    const sD = normalizeSupplyShiftDirForCheck(sDraw);

    const ok =
      dA === scenario.demand.action &&
      dD === scenario.demand.dir &&
      sA === scenario.supply.action &&
      sD === scenario.supply.dir;

    els.fb1.style.display = "block";
    els.fb1.innerHTML = ok
      ? `<span class="tagOK">Correct</span> Nice. Now predict the market outcome (Stage 2).`
      : `<span class="tagBad">Not quite</span> If one curve shifts, the equilibrium price changes, causing a movement along the other curve.`;

    if (ok) {
      stage = 2;
      els.stage2.style.display = "block";

      if (scenario.why?.side === "D" || scenario.why?.side === "S") {
        renderWhyLists({ side: scenario.why.side, factor: scenario.why.factor });
        els.whyNote.textContent = `Highlighted: ${scenario.why.side === "D" ? "Demand" : "Supply"} shifter → ${scenario.why.factor}.`;
      } else {
        renderWhyLists(null);
        els.whyNote.textContent = "This scenario changes the price of the good → movement along both curves.";
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
    const okQ  = (out.qMove === "AMB") ? (qM === "AMB") : (qM === out.qMove);
    const ok = okEx && okP && okQ;

    els.fb2.style.display = "block";
    els.fb2.innerHTML = ok
      ? `<span class="tagOK">Correct</span> Great — now the graph will reveal the imbalance and the new equilibrium.`
      : `<span class="tagBad">Not quite</span> At $begin:math:text$P\_1$end:math:text$, compare $begin:math:text$Q\_d$end:math:text$ and $begin:math:text$Q\_s$end:math:text$. Shortage → price rises; surplus → price falls.`;

    if (ok) {
      stage = 3;
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
