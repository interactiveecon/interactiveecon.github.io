(() => {
  const $ = (id) => document.getElementById(id);

  // Embedded data + scenario bank (news-style)
  const D = {
    params: { a: 0.08, b: 0.6, c: 0.6 },
    baseline: { Y: 50, P: 5, Z: 5 },

    axes: { Ymin: 0, Ymax: 100, rmin: 0, rmax: 20 },

    mags: {
      Y: [10, 15, 20],
      P: [0.8, 1.2, 1.6],
      Z: [0.8, 1.2, 1.6],
    },

    // News-brief scenario templates
    // Rule: keep each scenario “clean” (primarily Y, P, or Z).
    scenarios: [
      // ---- Y (output/activity) ----
      {
        var:"Y", dir:"up",
        headline:"Retail sales surprise to the upside",
        brief:"Major retailers report strong demand and firms increase production schedules.",
        source:"Morning Economic Brief",
      },
      {
        var:"Y", dir:"down",
        headline:"Spending cools; firms scale back production",
        brief:"Households cut discretionary purchases and inventories begin to build up.",
        source:"Morning Economic Brief",
      },
      {
        var:"Y", dir:"up",
        headline:"Investment strengthens as firms expand capacity",
        brief:"Businesses boost equipment purchases and ramp up output.",
        source:"Industry Update",
      },
      {
        var:"Y", dir:"down",
        headline:"Housing and construction activity slows sharply",
        brief:"New projects are postponed and related industries reduce production.",
        source:"Industry Update",
      },
      {
        var:"Y", dir:"up",
        headline:"Export demand rises",
        brief:"Foreign demand for domestic goods increases, pushing up production.",
        source:"Global Markets Note",
      },
      {
        var:"Y", dir:"down",
        headline:"Export demand weakens",
        brief:"Foreign buyers pull back, reducing domestic production.",
        source:"Global Markets Note",
      },

      // Fiscal policy (still Y, but phrased as output effects)
      {
        var:"Y", dir:"up",
        headline:"New fiscal package boosts demand",
        brief:"Government spending rises and/or taxes fall, supporting higher production and output.",
        source:"Policy Desk",
      },
      {
        var:"Y", dir:"down",
        headline:"Fiscal tightening weighs on activity",
        brief:"Spending cuts and/or tax increases reduce demand, lowering production and output.",
        source:"Policy Desk",
      },

      // ---- P (price level) ----
      {
        var:"P", dir:"up",
        headline:"Inflation pressure broadens",
        brief:"Price increases spread across many goods and services.",
        source:"Inflation Watch",
      },
      {
        var:"P", dir:"up",
        headline:"Energy prices surge",
        brief:"Higher energy costs pass through to the overall price level.",
        source:"Inflation Watch",
      },
      {
        var:"P", dir:"up",
        headline:"Cost-of-living jump",
        brief:"Rents and food prices rise broadly, pushing prices higher.",
        source:"Inflation Watch",
      },

      // Deflation (P down) — explicitly deflation, not disinflation
      {
        var:"P", dir:"down",
        headline:"Deflation emerges",
        brief:"Prices fall across a wide range of categories (overall price level declines).",
        source:"Inflation Watch",
      },
      {
        var:"P", dir:"down",
        headline:"Widespread price cuts",
        brief:"Firms cut prices broadly to clear excess inventories.",
        source:"Inflation Watch",
      },
      {
        var:"P", dir:"down",
        headline:"Energy price collapse pulls prices down",
        brief:"A sharp drop in energy prices contributes to a lower overall price level.",
        source:"Inflation Watch",
      },

      // ---- Z (other Fed considerations / stance) ----
      {
        var:"Z", dir:"up",
        headline:"Tariffs announced; uncertainty rises",
        brief:"Wide-ranging tariffs increase uncertainty. The Fed leans more hawkish while waiting to see broader effects.",
        source:"Policy Desk",
      },
      {
        var:"Z", dir:"down",
        headline:"Financial stress increases",
        brief:"Credit conditions tighten and risk rises. The Fed leans more accommodative to support stability.",
        source:"Financial Conditions",
      },
      {
        var:"Z", dir:"up",
        headline:"Risk-taking accelerates in asset markets",
        brief:"Speculation rises. The Fed leans more hawkish to limit financial imbalances.",
        source:"Financial Conditions",
      },
      {
        var:"Z", dir:"down",
        headline:"Uncertainty shock hits confidence",
        brief:"Firms delay projects amid uncertainty. The Fed leans more dovish as a precaution.",
        source:"Financial Conditions",
      },
      {
        var:"Z", dir:"up",
        headline:"Fed signals a more aggressive stance going forward",
        brief:"Officials emphasize stronger responses in future policy decisions.",
        source:"Central Bank Watch",
      },
      {
        var:"Z", dir:"down",
        headline:"Fed signals a more patient stance",
        brief:"Officials emphasize flexibility and caution in future policy decisions.",
        source:"Central Bank Watch",
      },
    ],
  };

  // KaTeX render
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
  let scenario = null; // {var,dir,mag,headline,brief,source,target,stamp}

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

  // Canvas scaling
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

  function makeStamp(){
    const days = ["Mon","Tue","Wed","Thu","Fri"];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const d = days[Math.floor(Math.random()*days.length)];
    const m = months[Math.floor(Math.random()*months.length)];
    const day = 1 + Math.floor(Math.random()*28);
    const hr = 7 + Math.floor(Math.random()*6); // 7–12
    const min = Math.random() < 0.5 ? "00" : "30";
    return `${d} ${m} ${day}, ${hr}:${min} AM`;
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

    scenario = { ...s, mag, target, stamp: makeStamp() };

    // No “Shock:” line (harder / more realistic)
    els.scenarioDesc.textContent =
      `${scenario.stamp} • ${scenario.source}\n` +
      `${scenario.headline}\n` +
      `${scenario.brief}\n\n` +
      `Your task: use the sliders to match what changed. (The arrow appears when you match it.)`;

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
      showFeedback(`<span class="tagOK">Correct</span> Now implement the change with sliders. The arrow appears when you match it.`);
      setStatus("Correct.");
    } else {
      showFeedback(`<span class="tagBad">Not quite</span> Reminder: Y changes = movement along; P or Z changes = shift.`);
      setStatus("Try again.");
    }
  }

  function why(){
    if (!scenario){
      showFeedback(`<span class="tagBad">No scenario</span> Click <strong>New Scenario</strong> first.`);
      return;
    }
    const txt = (scenario.var === "Y")
      ? `This story is about output/activity changing, so it maps to $Y$. Changing $Y$ moves you to a different point on the same line (movement along).`
      : `This story is not primarily about output changing. It maps to $${scenario.var}$$, which changes the intercept term $bP+cZ$, shifting the entire line up/down.`;
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
      showFeedback(`<span class="tagOK">Nice</span> You matched the scenario. The arrow shows movement vs shift.`);
      setStatus("Scenario matched.");
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
