(() => {
  const $ = (id) => document.getElementById(id);

  // Embedded data
  const D = {
    params: { a: 0.08, b: 0.6, c: 0.6 },
    baseline: { Y: 50, P: 5, Z: 5 },
    shocks: {
      dY: [10, 15, 20],
      dP: [0.8, 1.2, 1.6],
      dZ: [0.8, 1.2, 1.6]
    },
    axes: { Ymin: 0, Ymax: 100, rmin: 0, rmax: 20 }
  };

  // KaTeX retry
  function typeset(el){
    if (!el) return;
    if (!window.renderMathInElement){
      setTimeout(() => typeset(el), 60);
      return;
    }
    window.renderMathInElement(el, {
      delimiters: [
        {left:"\\(", right:"\\)", display:false},
        {left:"$", right:"$", display:false},
        {left:"\\[", right:"\\]", display:true},
        {left:"$$", right:"$$", display:true}
      ],
      throwOnError: false
    });
  }

  const els = {
    newBtn: $("newBtn"),
    resetBtn: $("resetBtn"),
    status: $("status"),
    scenarioDesc: $("scenarioDesc"),

    predType: $("predType"),
    predR: $("predR"),
    predY: $("predY"),
    checkBtn: $("checkBtn"),
    whyBtn: $("whyBtn"),
    feedback: $("feedback"),

    aVal: $("aVal"),
    bVal: $("bVal"),
    cVal: $("cVal"),
    Y0: $("Y0"),
    Y1: $("Y1"),
    r0: $("r0"),
    r1: $("r1"),

    Yslider: $("Yslider"),
    Pslider: $("Pslider"),
    Zslider: $("Zslider"),
    Ydisp: $("Ydisp"),
    Pdisp: $("Pdisp"),
    Zdisp: $("Zdisp"),

    canvas: $("canvas"),
  };

  if (!els.newBtn || !els.canvas) return;

  const ORANGE = "rgba(230,159,0,0.95)";
  const GREY   = "rgba(0,0,0,0.22)";
  const DASH   = "rgba(0,0,0,0.30)";
  const INK    = "rgba(0,0,0,0.70)";

  const { a, b, c } = D.params;
  const base = { ...D.baseline };

  let cur = { ...base };
  let scenario = null; // { var:"Y"|"P"|"Z", dir:"up"|"down", mag:number, target:{Y,P,Z} }

  function setStatus(msg){ els.status.textContent = msg; }

  function showFeedback(html){
    if (!html){
      els.feedback.style.display = "none";
      els.feedback.innerHTML = "";
      return;
    }
    els.feedback.style.display = "block";
    els.feedback.innerHTML = html;
    typeset(els.feedback);
  }

  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }
  function rOf(Y, P, Z){ return a*Y + b*P + c*Z; }

  // Canvas
  function setupCanvas(){
    const ctx = els.canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = els.canvas.getBoundingClientRect();
    const W = Math.max(2, Math.floor(rect.width * dpr));
    const H = Math.max(2, Math.floor(rect.height * dpr));
    if (els.canvas.width !== W || els.canvas.height !== H){
      els.canvas.width = W;
      els.canvas.height = H;
    }
    return { ctx, W, H, dpr };
  }

  function drawAxes(ctx, W, H, dpr){
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
    ctx.fillText("Output (Y)", (X0+X1)/2, Y1 + 20*dpr);

    ctx.save();
    ctx.translate(X0 - 48*dpr, (Y0+Y1)/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText("Policy rate (r)", 0, 0);
    ctx.restore();

    return { X0,X1,Y0,Y1 };
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
  function arrow(ctx, x1,y1,x2,y2, color, dpr){
    line(ctx, x1,y1,x2,y2, color, 2.5, dpr);
    const ang = Math.atan2(y2-y1, x2-x1);
    const len = 10*dpr;
    const a1 = ang + Math.PI*0.85;
    const a2 = ang - Math.PI*0.85;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5*dpr;
    ctx.beginPath();
    ctx.moveTo(x2,y2);
    ctx.lineTo(x2 + len*Math.cos(a1), y2 + len*Math.sin(a1));
    ctx.moveTo(x2,y2);
    ctx.lineTo(x2 + len*Math.cos(a2), y2 + len*Math.sin(a2));
    ctx.stroke();
  }

  function approxEq(x,y,tol){ return Math.abs(x-y) <= tol; }

  function matchesScenario(){
    if (!scenario) return false;
    const t = scenario.target;
    const tolY = 0.5;   // Y slider step is 1
    const tolP = 0.05;  // P,Z slider step is 0.1
    const tolZ = 0.05;

    return approxEq(cur.Y, t.Y, tolY) && approxEq(cur.P, t.P, tolP) && approxEq(cur.Z, t.Z, tolZ);
  }

  function draw(){
    const { ctx, W, H, dpr } = setupCanvas();
    ctx.clearRect(0,0,W,H);

    const { X0,X1,Y0,Y1 } = drawAxes(ctx,W,H,dpr);
    const { Ymin,Ymax,rmin,rmax } = D.axes;

    const xTo = (Yv) => X0 + (Yv-Ymin)/(Ymax-Ymin)*(X1-X0);
    const yTo = (rv) => Y0 + (rmax-rv)/(rmax-rmin)*(Y1-Y0);

    // baseline line + point
    const rL0 = rOf(Ymin, base.P, base.Z);
    const rR0 = rOf(Ymax, base.P, base.Z);
    line(ctx, xTo(Ymin), yTo(rL0), xTo(Ymax), yTo(rR0), GREY, 3, dpr);

    const r0 = rOf(base.Y, base.P, base.Z);
    const x0 = xTo(base.Y), y0 = yTo(r0);
    dot(ctx, x0, y0, "rgba(0,0,0,0.40)", dpr);
    line(ctx, x0, y0, x0, yTo(rmin), DASH, 2, dpr, [4,6]);
    line(ctx, x0, y0, xTo(Ymin), y0, DASH, 2, dpr, [4,6]);

    // current line + point (always drawn once scenario exists; they discover via sliders)
    if (!scenario) return;

    const rL1 = rOf(Ymin, cur.P, cur.Z);
    const rR1 = rOf(Ymax, cur.P, cur.Z);
    line(ctx, xTo(Ymin), yTo(rL1), xTo(Ymax), yTo(rR1), ORANGE, 3, dpr);

    const r1 = rOf(cur.Y, cur.P, cur.Z);
    const x1 = xTo(cur.Y), y1 = yTo(r1);
    dot(ctx, x1, y1, ORANGE, dpr);
    line(ctx, x1, y1, x1, yTo(rmin), DASH, 2, dpr, [4,6]);
    line(ctx, x1, y1, xTo(Ymin), y1, DASH, 2, dpr, [4,6]);

    // Arrow appears only when they have implemented the scenario
    if (matchesScenario()){
      if (scenario.var === "Y"){
        arrow(ctx, x0, y0, x1, y1, ORANGE, dpr);
      } else {
        // shift: show vertical arrow at Y0 from old r(Y0) to new r(Y0)
        const rOld = rOf(base.Y, base.P, base.Z);
        const rNew = rOf(base.Y, cur.P, cur.Z);
        arrow(ctx, x0, yTo(rOld), x0, yTo(rNew), ORANGE, dpr);
      }
    }
  }

  function updateNumbers(){
    const r0 = rOf(base.Y, base.P, base.Z);
    const r1 = rOf(cur.Y, cur.P, cur.Z);

    els.aVal.textContent = a.toFixed(2);
    els.bVal.textContent = b.toFixed(2);
    els.cVal.textContent = c.toFixed(2);

    els.Y0.textContent = base.Y.toFixed(0);
    els.Y1.textContent = cur.Y.toFixed(0);
    els.r0.textContent = r0.toFixed(2);
    els.r1.textContent = r1.toFixed(2);

    els.Ydisp.textContent = cur.Y.toFixed(0);
    els.Pdisp.textContent = cur.P.toFixed(1);
    els.Zdisp.textContent = cur.Z.toFixed(1);
  }

  function lockControls(locked){
    els.Yslider.disabled = locked;
    els.Pslider.disabled = locked;
    els.Zslider.disabled = locked;
  }

  function expectedAnswers(){
    if (!scenario) return null;
    const type = (scenario.var === "Y") ? "move" : "shift";
    const Ychg = (scenario.var === "Y") ? (scenario.dir==="up" ? "up" : "down") : "same";
    const Rchg = (scenario.dir==="up" ? "up" : "down");
    return { type, Ychg, Rchg };
  }

  function newScenario(){
    // reset to baseline
    cur = { ...base };
    els.Yslider.value = String(base.Y);
    els.Pslider.value = String(base.P);
    els.Zslider.value = String(base.Z);

    const u = Math.random();
    let v = "Y";
    if (u < 0.45) v = "Y";
    else if (u < 0.75) v = "P";
    else v = "Z";

    const dir = Math.random() < 0.5 ? "up" : "down";
    const mag = v==="Y"
      ? D.shocks.dY[Math.floor(Math.random()*D.shocks.dY.length)]
      : (v==="P"
          ? D.shocks.dP[Math.floor(Math.random()*D.shocks.dP.length)]
          : D.shocks.dZ[Math.floor(Math.random()*D.shocks.dZ.length)]);

    const target = { ...base };
    if (v==="Y") target.Y = clamp(base.Y + (dir==="up"?mag:-mag), D.axes.Ymin, D.axes.Ymax);
    if (v==="P") target.P = Math.max(0, base.P + (dir==="up"?mag:-mag));
    if (v==="Z") target.Z = Math.max(0, base.Z + (dir==="up"?mag:-mag));

    scenario = { var: v, dir, mag, target };

    const dirWord = dir==="up" ? "increases" : "decreases";
    els.scenarioDesc.textContent =
      `Shock: ${v} ${dirWord}.\n` +
      `Use the sliders to implement the shock and see what happens on the graph.\n` +
      `Tip: $begin:math:text$Y$end:math:text$ moves along the line; $begin:math:text$P$end:math:text$ and $begin:math:text$Z$end:math:text$ shift the line.`;

    els.predType.value = "";
    els.predR.value = "";
    els.predY.value = "";
    showFeedback("");

    lockControls(false);
    setStatus("Scenario ready. Predict first, then move the sliders.");
    updateNumbers();
    draw();
    typeset(document.body);
  }

  function check(){
    if (!scenario){
      showFeedback(`<span class="tagBad">No scenario</span> Click <strong>New Scenario</strong> first.`);
      return;
    }
    const exp = expectedAnswers();
    const a1 = els.predType.value;
    const a2 = els.predR.value;
    const a3 = els.predY.value;

    if (!a1 || !a2 || !a3){
      showFeedback(`<span class="tagBad">Missing</span> Answer all three prediction questions.`);
      return;
    }

    const ok = (a1===exp.type && a2===exp.Rchg && a3===exp.Ychg);
    if (ok){
      showFeedback(`<span class="tagOK">Correct</span> Now use the sliders to implement the shock and confirm it on the graph.`);
      setStatus("Correct. Implement the shock with sliders.");
    } else {
      showFeedback(`<span class="tagBad">Not quite</span> Remember: $begin:math:text$Y$end:math:text$ change = movement along; $begin:math:text$P$end:math:text$ or $begin:math:text$Z$end:math:text$ change = shift.`);
      setStatus("Try again.");
    }
  }

  function why(){
    if (!scenario){
      showFeedback(`<span class="tagBad">No scenario</span> Click <strong>New Scenario</strong> first.`);
      return;
    }
    let txt = "";
    if (scenario.var === "Y"){
      txt =
        `Because the shock changes $Y$, you move to a different point on the same line (movement along).\n` +
        `Since $a>0$, higher $Y$ means higher $r$.`;
    } else {
      txt =
        `Because the shock changes $${scenario.var}$$, the intercept $bP+cZ$ changes.\n` +
        `That shifts the whole rule up/down (same slope $a$).`;
    }
    showFeedback(`<span class="tagOK">Why</span> ${txt}`);
  }

  function reset(){
    scenario = null;
    cur = { ...base };

    els.scenarioDesc.textContent = "Click “New Scenario” to start.";
    els.predType.value = "";
    els.predR.value = "";
    els.predY.value = "";
    showFeedback("");

    els.Yslider.value = String(base.Y);
    els.Pslider.value = String(base.P);
    els.Zslider.value = String(base.Z);

    lockControls(true);
    updateNumbers();
    draw();
    setStatus("Reset.");
    typeset(document.body);
  }

  function sliderChanged(){
    if (!scenario) return;
    cur.Y = Number(els.Yslider.value);
    cur.P = Number(els.Pslider.value);
    cur.Z = Number(els.Zslider.value);

    updateNumbers();
    draw();

    if (matchesScenario()){
      // gentle, non-intrusive confirmation
      if (els.feedback.style.display !== "block"){
        showFeedback(`<span class="tagOK">Nice</span> You implemented the scenario shock. The arrow shows the change.`);
      }
    }
  }

  // Wire events
  els.newBtn.addEventListener("click", newScenario);
  els.checkBtn.addEventListener("click", check);
  els.whyBtn.addEventListener("click", why);
  els.resetBtn.addEventListener("click", reset);

  els.Yslider.addEventListener("input", sliderChanged);
  els.Pslider.addEventListener("input", sliderChanged);
  els.Zslider.addEventListener("input", sliderChanged);

  window.addEventListener("resize", draw);

  // Init
  window.addEventListener("load", () => {
    lockControls(true);
    updateNumbers();
    draw();
    setStatus("Ready.");
    typeset(document.body);
  });
})();
