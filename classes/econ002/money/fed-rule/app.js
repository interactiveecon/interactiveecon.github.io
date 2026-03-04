(() => {
  const $ = (id) => document.getElementById(id);

  // Embedded data + scenario bank
  const D = {
    params: { a: 0.08, b: 0.6, c: 0.6 },
    baseline: { Y: 50, P: 5, Z: 5 },

    // axis ranges
    axes: { Ymin: 0, Ymax: 100, rmin: 0, rmax: 20 },

    // scenario magnitudes (keep consistent with slider steps)
    mags: {
      Y: [10, 15, 20],
      P: [0.8, 1.2, 1.6],
      Z: [0.8, 1.2, 1.6],
    },

    // Realistic scenario templates
    scenarios: [
      // ---- Y (output/activity) => movement along ----
      { var:"Y", dir:"up",   title:"Consumer spending surge", desc:"Retail sales jump and firms ramp up production." },
      { var:"Y", dir:"down", title:"Demand slowdown", desc:"Households cut spending and firms reduce production." },
      { var:"Y", dir:"up",   title:"Business investment boom", desc:"Firms expand capacity and increase production." },
      { var:"Y", dir:"down", title:"Housing/construction slump", desc:"Homebuilding falls and related industries contract." },
      { var:"Y", dir:"up",   title:"Export demand rises", desc:"Foreign demand for domestic goods increases production." },
      { var:"Y", dir:"down", title:"Export demand weakens", desc:"Foreign demand softens and domestic production falls." },

      // Fiscal policy (Y)
      { var:"Y", dir:"up",   title:"Fiscal stimulus", desc:"Government increases spending and/or cuts taxes, boosting demand and output." },
      { var:"Y", dir:"down", title:"Fiscal tightening", desc:"Government reduces spending and/or raises taxes, lowering demand and output." },

      // ---- P (price level) => shift ----
      { var:"P", dir:"up",   title:"Broad inflation pressure", desc:"Prices rise across many goods and services." },
      { var:"P", dir:"up",   title:"Energy price spike", desc:"Oil and gasoline prices jump and push the overall price level up." },
      { var:"P", dir:"up",   title:"Cost-of-living surge", desc:"Rents and food prices rise broadly." },

      // Deflation (P down)
      { var:"P", dir:"down", title:"Deflationary pressure", desc:"Prices begin falling across many categories (deflation)." },
      { var:"P", dir:"down", title:"Energy price collapse", desc:"Energy prices fall sharply and pull the overall price level down." },
      { var:"P", dir:"down", title:"Widespread price cuts", desc:"Firms cut prices broadly to clear excess inventory." },

      // ---- Z (other Fed considerations) => shift ----
      { var:"Z", dir:"up",   title:"Tariff uncertainty", desc:"Wide-ranging tariffs are announced; the Fed becomes more cautious / hawkish given uncertainty." },
      { var:"Z", dir:"down", title:"Financial stress", desc:"Credit markets tighten and risk rises; the Fed leans toward easier policy." },
      { var:"Z", dir:"up",   title:"Financial exuberance", desc:"Risk-taking and speculation rise; the Fed leans more hawkish for stability." },
      { var:"Z", dir:"down", title:"Confidence shock", desc:"Uncertainty spikes and firms postpone investment; the Fed leans more dovish." },
      { var:"Z", dir:"up",   title:"Policy regime shift (hawkish)", desc:"The Fed signals it will respond more aggressively going forward." },
      { var:"Z", dir:"down", title:"Policy regime shift (dovish)", desc:"The Fed signals it will respond less aggressively / prioritize employment." },
    ],
  };

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

  if (!els.canvas || !els.newBtn) return;

  const ORANGE = "rgba(230,159,0,0.95)";
  const GREY   = "rgba(0,0,0,0.22)";
  const DASH   = "rgba(0,0,0,0.30)";
  const INK    = "rgba(0,0,0,0.70)";

  const { a, b, c } = D.params;
  const base = { ...D.baseline };

  let cur = { ...base };
  let scenario = null; // {var,dir,mag,title,desc,target}

  function rOf(Y,P,Z){ return a*Y + b*P + c*Z; }
  function clamp(x,lo,hi){ return Math.max(lo, Math.min(hi, x)); }

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

  // Canvas scaling (always renders)
  function getCtx() {
    const ctx = els.canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const Wcss = els.canvas.clientWidth || 900;
    const Hcss = els.canvas.clientHeight || 560;

    const W = Math.floor(Wcss * dpr);
    const H = Math.floor(Hcss * dpr);

    if (els.canvas.width !== W || els.canvas.height !== H) {
      els.canvas.width = W;
      els.canvas.height = H;
    }
    return { ctx, dpr, W, H };
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
    return approxEq(cur.Y, t.Y, 0.5) && approxEq(cur.P, t.P, 0.05) && approxEq(cur.Z, t.Z, 0.05);
  }

  function draw(){
    const { ctx, dpr, W, H } = getCtx();
    ctx.clearRect(0,0,W,H);

    const pad = { l: 70*dpr, r: 16*dpr, t: 18*dpr, b: 60*dpr };
    const X0 = pad.l, X1 = W - pad.r;
    const Y0 = pad.t, Y1 = H - pad.b;

    const { Ymin,Ymax,rmin,rmax } = D.axes;

    const xTo = (Yv) => X0 + (Yv-Ymin)/(Ymax-Ymin)*(X1-X0);
    const yTo = (rv) => Y0 + (rmax-rv)/(rmax-rmin)*(Y1-Y0);

    // grid
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

    // axis labels
    ctx.fillStyle = INK;
    ctx.font = `${12*dpr}px system-ui`;
    ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText("Output (Y)", (X0+X1)/2, Y1 + 22*dpr);

    ctx.save();
    ctx.translate(X0 - 52*dpr, (Y0+Y1)/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText("Policy rate (r)", 0, 0);
    ctx.restore();

    // baseline rule
    const rL0 = rOf(Ymin, base.P, base.Z);
    const rR0 = rOf(Ymax, base.P, base.Z);
    line(ctx, xTo(Ymin), yTo(rL0), xTo(Ymax), yTo(rR0), GREY, 3, dpr);

    // baseline point
    const r0 = rOf(base.Y, base.P, base.Z);
    const xB = xTo(base.Y), yB = yTo(r0);
    dot(ctx, xB, yB, "rgba(0,0,0,0.40)", dpr);
    line(ctx, xB, yB, xB, yTo(rmin), DASH, 2, dpr, [4,6]);
    line(ctx, xB, yB, xTo(Ymin), yB, DASH, 2, dpr, [4,6]);

    if (!scenario) return;

    // current rule + point
    const rL1 = rOf(Ymin, cur.P, cur.Z);
    const rR1 = rOf(Ymax, cur.P, cur.Z);
    line(ctx, xTo(Ymin), yTo(rL1), xTo(Ymax), yTo(rR1), ORANGE, 3, dpr);

    const r1 = rOf(cur.Y, cur.P, cur.Z);
    const xC = xTo(cur.Y), yC = yTo(r1);
    dot(ctx, xC, yC, ORANGE, dpr);
    line(ctx, xC, yC, xC, yTo(rmin), DASH, 2, dpr, [4,6]);
    line(ctx, xC, yC, xTo(Ymin), yC, DASH, 2, dpr, [4,6]);

    // arrow once implemented
    if (matchesScenario()){
      if (scenario.var === "Y"){
        arrow(ctx, xB, yB, xC, yC, ORANGE, dpr);
      } else {
        const rOld = rOf(base.Y, base.P, base.Z);
        const rNew = rOf(base.Y, cur.P, cur.Z);
        arrow(ctx, xB, yTo(rOld), xB, yTo(rNew), ORANGE, dpr);
      }
    }
  }

  function updateNumbers(){
    const r0 = rOf(base.Y, base.P, base.Z);
    const r1 = rOf(cur.Y, cur.P, cur.Z);

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

  function pickMagnitude(v){
    const arr = D.mags[v];
    return arr[Math.floor(Math.random()*arr.length)];
  }

  function newScenario(){
    // reset to baseline
    cur = { ...base };
    els.Yslider.value = String(base.Y);
    els.Pslider.value = String(base.P);
    els.Zslider.value = String(base.Z);

    const s = D.scenarios[Math.floor(Math.random()*D.scenarios.length)];
    const mag = pickMagnitude(s.var);

    const target = { ...base };
    if (s.var==="Y") target.Y = clamp(base.Y + (s.dir==="up"?mag:-mag), D.axes.Ymin, D.axes.Ymax);
    if (s.var==="P") target.P = Math.max(0, base.P + (s.dir==="up"?mag:-mag));
    if (s.var==="Z") target.Z = Math.max(0, base.Z + (s.dir==="up"?mag:-mag));

    scenario = { ...s, mag, target };

    els.scenarioDesc.textContent =
      `${scenario.title}\n${scenario.desc}\n\n` +
      `Shock: ${scenario.var} ${scenario.dir==="up" ? "increases" : "decreases"}.\n` +
      `Use the sliders to implement the shock.\n` +
      `Hint: Y changes = movement along; P or Z changes = shift.`;

    els.predType.value = "";
    els.predR.value = "";
    els.predY.value = "";
    showFeedback("");

    lockControls(false);
    setStatus("Scenario ready.");
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
      showFeedback(`<span class="tagOK">Correct</span> Now implement the shock with sliders. The arrow appears when you match it.`);
      setStatus("Correct.");
    } else {
      showFeedback(`<span class="tagBad">Not quite</span> Remember: Y changes = movement along; P or Z changes = shift.`);
      setStatus("Try again.");
    }
  }

  function why(){
    if (!scenario){
      showFeedback(`<span class="tagBad">No scenario</span> Click <strong>New Scenario</strong> first.`);
      return;
    }
    const txt = (scenario.var === "Y")
      ? `This scenario changes $Y$ (output). Changing $Y$ moves you to a different point on the same line (movement along). Since $a>0$, higher $Y$ implies higher $r$.`
      : `This scenario changes $${scenario.var}$$, which changes the intercept term $bP+cZ$. That shifts the whole rule up/down (same slope $a$).`;
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
    setStatus("Reset.");
    updateNumbers();
    draw();
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
      showFeedback(`<span class="tagOK">Nice</span> You implemented the scenario. The arrow shows the change.`);
      setStatus("Scenario implemented.");
    }
  }

  // Events
  els.newBtn.addEventListener("click", newScenario);
  els.checkBtn.addEventListener("click", check);
  els.whyBtn.addEventListener("click", why);
  els.resetBtn.addEventListener("click", reset);

  els.Yslider.addEventListener("input", sliderChanged);
  els.Pslider.addEventListener("input", sliderChanged);
  els.Zslider.addEventListener("input", sliderChanged);

  window.addEventListener("resize", () => requestAnimationFrame(draw));

  // Init
  window.addEventListener("load", () => {
    lockControls(true);
    updateNumbers();
    draw();
    setStatus("Ready.");
    typeset(document.body);
    setTimeout(draw, 120);
  });
})();
