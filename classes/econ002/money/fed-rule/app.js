(() => {
  const $ = (id) => document.getElementById(id);
  const D = window.FED_RULE_LAB;
  if (!D) return;

  // KaTeX helper
  function typeset(el){
    if (!el) return;
    if (!window.renderMathInElement){
      setTimeout(() => typeset(el), 50);
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
    revealBtn: $("revealBtn"),
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

  const BLUE = "rgba(31,119,180,0.92)";
  const ORANGE = "rgba(230,159,0,0.95)";
  const GREY = "rgba(0,0,0,0.18)";
  const DASH = "rgba(0,0,0,0.30)";
  const INK = "rgba(0,0,0,0.70)";

  const { a, b, c } = D.params;
  const base = { ...D.baseline };

  let cur = { ...base };
  let scenario = null; // { var:"Y"|"P"|"Z", dir:"up"|"down", mag:number }
  let revealed = false;

  function setStatus(msg){ els.status.textContent = msg; }

  function showFeedback(html, ok=false){
    if (!html){
      els.feedback.style.display = "none";
      els.feedback.innerHTML = "";
      return;
    }
    els.feedback.style.display = "block";
    els.feedback.innerHTML = html;
    typeset(els.feedback);
  }

  function rOf(Y, P, Z){ return a*Y + b*P + c*Z; }

  function setupCanvas(){
    const ctx = els.canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = els.canvas.getBoundingClientRect();
    const W = Math.max(2, Math.floor(rect.width * dpr));
    const H = Math.max(2, Math.floor(rect.height * dpr));
    if (els.canvas.width !== W || els.canvas.height !== H){ els.canvas.width=W; els.canvas.height=H; }
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

    return { X0,X1,Y0,Y1, pad };
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

  function draw(){
    const { ctx, W, H, dpr } = setupCanvas();
    ctx.clearRect(0,0,W,H);

    const { X0,X1,Y0,Y1 } = drawAxes(ctx,W,H,dpr);

    const { Ymin,Ymax,rmin,rmax } = D.axes;

    const xTo = (Yv) => X0 + (Yv-Ymin)/(Ymax-Ymin)*(X1-X0);
    const yTo = (rv) => Y0 + (rmax-rv)/(rmax-rmin)*(Y1-Y0);

    // baseline line (always visible)
    const rL0 = rOf(Ymin, base.P, base.Z);
    const rR0 = rOf(Ymax, base.P, base.Z);
    line(ctx, xTo(Ymin), yTo(rL0), xTo(Ymax), yTo(rR0), GREY, 3, dpr);

    // baseline point
    const r0 = rOf(base.Y, base.P, base.Z);
    dot(ctx, xTo(base.Y), yTo(r0), "rgba(0,0,0,0.35)", dpr);
    line(ctx, xTo(base.Y), yTo(r0), xTo(base.Y), yTo(rmin), DASH, 2, dpr, [4,6]);
    line(ctx, xTo(base.Y), yTo(r0), xTo(Ymin), yTo(r0), DASH, 2, dpr, [4,6]);

    // current (only after reveal)
    if (revealed){
      const rL1 = rOf(Ymin, cur.P, cur.Z);
      const rR1 = rOf(Ymax, cur.P, cur.Z);
      line(ctx, xTo(Ymin), yTo(rL1), xTo(Ymax), yTo(rR1), ORANGE, 3, dpr);

      const r1 = rOf(cur.Y, cur.P, cur.Z);
      dot(ctx, xTo(cur.Y), yTo(r1), ORANGE, dpr);
      line(ctx, xTo(cur.Y), yTo(r1), xTo(cur.Y), yTo(rmin), DASH, 2, dpr, [4,6]);
      line(ctx, xTo(cur.Y), yTo(r1), xTo(Ymin), yTo(r1), DASH, 2, dpr, [4,6]);
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

  function newScenario(){
    // reset to baseline values, hide reveal
    cur = { ...base };
    revealed = false;
    els.revealBtn.disabled = true;

    // reset sliders to baseline
    els.Yslider.value = String(base.Y);
    els.Pslider.value = String(base.P);
    els.Zslider.value = String(base.Z);

    // pick shock variable
    const u = Math.random();
    let v = "Y";
    if (u < 0.45) v = "Y";
    else if (u < 0.75) v = "P";
    else v = "Z";

    const dir = Math.random() < 0.5 ? "up" : "down";
    const mag =
      v==="Y" ? D.shocks.dY[Math.floor(Math.random()*D.shocks.dY.length)]
              : (v==="P" ? D.shocks.dP[Math.floor(Math.random()*D.shocks.dP.length)]
                         : D.shocks.dZ[Math.floor(Math.random()*D.shocks.dZ.length));

    scenario = { var: v, dir, mag };

    const dirWord = dir==="up" ? "increases" : "decreases";
    els.scenarioDesc.textContent =
      `Shock: ${v} ${dirWord}.\n` +
      `Your job: decide if this is a movement along the Fed rule or a shift of the rule.\n\n` +
      `Then click Reveal to see it on the graph.`;

    // clear predictions + feedback
    els.predType.value = "";
    els.predR.value = "";
    els.predY.value = "";
    showFeedback("");

    // unlock controls so they can implement after reveal if desired
    lockControls(false);

    setStatus("Scenario ready. Predict first.");
    updateNumbers();
    draw();
    typeset(document.body);
  }

  function applyScenarioToCurrent(){
    // apply exactly the scenario change to cur
    if (!scenario) return;
    cur = { ...base };

    if (scenario.var === "Y"){
      cur.Y = base.Y + (scenario.dir==="up" ? scenario.mag : -scenario.mag);
      cur.Y = Math.max(D.axes.Ymin, Math.min(D.axes.Ymax, cur.Y));
    }
    if (scenario.var === "P"){
      cur.P = base.P + (scenario.dir==="up" ? scenario.mag : -scenario.mag);
      cur.P = Math.max(0, cur.P);
    }
    if (scenario.var === "Z"){
      cur.Z = base.Z + (scenario.dir==="up" ? scenario.mag : -scenario.mag);
      cur.Z = Math.max(0, cur.Z);
    }

    // sync sliders
    els.Yslider.value = String(cur.Y);
    els.Pslider.value = String(cur.P);
    els.Zslider.value = String(cur.Z);
  }

  function expectedAnswers(){
    if (!scenario) return null;

    // movement vs shift
    const type = (scenario.var === "Y") ? "move" : "shift";

    // implied changes
    const Ychg = (scenario.var === "Y") ? (scenario.dir==="up" ? "up" : "down") : "same";
    const Rchg =
      (scenario.var === "Y") ? (scenario.dir==="up" ? "up" : "down") :
      (scenario.var === "P" || scenario.var === "Z") ? (scenario.dir==="up" ? "up" : "down") :
      "same";

    return { type, Ychg, Rchg };
  }

  function check(){
    if (!scenario){
      showFeedback(`<span class="tagBad">No scenario</span> Click New Scenario first.`);
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
      showFeedback(`<span class="tagOK">Correct</span> Now click <strong>Reveal</strong> to see it on the graph.`);
      els.revealBtn.disabled = false;
      setStatus("Correct. Ready to reveal.");
    } else {
      showFeedback(`<span class="tagBad">Not quite</span> Remember: changing $begin:math:text$Y$end:math:text$ moves along; changing $begin:math:text$P$end:math:text$ or $begin:math:text$Z$end:math:text$ shifts the rule.`);
      setStatus("Try again.");
    }
  }

  function why(){
    if (!scenario){
      showFeedback(`<span class="tagBad">No scenario</span> Click New Scenario first.`);
      return;
    }
    const exp = expectedAnswers();
    let txt = "";

    if (scenario.var === "Y"){
      txt =
        `Because the shock changes \$begin:math:text$Y\\$end:math:text$, you move to a different point on the same line.\n` +
        `That is a \$begin:math:text$\\\\textbf\{movement along\}\\$end:math:text$ the Fed rule.\n\n` +
        `Since \$begin:math:text$a\>0\\$end:math:text$, higher \$begin:math:text$Y\\$end:math:text$ implies higher \$begin:math:text$r\\$end:math:text$ (and lower \$begin:math:text$Y\\$end:math:text$ implies lower \$begin:math:text$r\\$end:math:text$).`;
    } else {
      txt =
        `Because the shock changes \$begin:math:text$ \$\{scenario\.var\} \\$end:math:text$, the intercept \$begin:math:text$bP\+cZ\\$end:math:text$ changes.\n` +
        `That shifts the whole rule up or down (same slope \$begin:math:text$a\\$end:math:text$).\n\n` +
        `Higher \$begin:math:text$\$\{scenario\.var\}\\$end:math:text$ raises \$begin:math:text$r\\$end:math:text$ at every \$begin:math:text$Y\\$end:math:text$ (a shift up).`;
    }

    showFeedback(`<span class="tagOK">Why</span> ${txt}`);
  }

  function reveal(){
    if (!scenario) return;
    applyScenarioToCurrent();
    revealed = true;
    updateNumbers();
    draw();
    setStatus("Revealed. Try moving sliders to explore other movements/shifts.");
  }

  function reset(){
    scenario = null;
    revealed = false;
    cur = { ...base };
    els.scenarioDesc.textContent = "Click “New Scenario” to start.";

    els.predType.value = "";
    els.predR.value = "";
    els.predY.value = "";
    showFeedback("");

    els.revealBtn.disabled = true;

    els.Yslider.value = String(base.Y);
    els.Pslider.value = String(base.P);
    els.Zslider.value = String(base.Z);

    updateNumbers();
    draw();
    setStatus("Reset.");
    typeset(document.body);
  }

  // sliders: allow exploration after reveal or even before
  function sliderChanged(){
    cur.Y = Number(els.Yslider.value);
    cur.P = Number(els.Pslider.value);
    cur.Z = Number(els.Zslider.value);
    updateNumbers();
    draw();
  }

  // wire events
  els.newBtn.addEventListener("click", newScenario);
  els.checkBtn.addEventListener("click", check);
  els.whyBtn.addEventListener("click", why);
  els.revealBtn.addEventListener("click", reveal);
  els.resetBtn.addEventListener("click", reset);

  els.Yslider.addEventListener("input", sliderChanged);
  els.Pslider.addEventListener("input", sliderChanged);
  els.Zslider.addEventListener("input", sliderChanged);

  window.addEventListener("resize", () => { draw(); });

  // init
  window.addEventListener("load", () => {
    updateNumbers();
    draw();
    setStatus("Ready.");
    typeset(document.body);
    lockControls(true); // no sliders until first scenario
  });
})();
