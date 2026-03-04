(() => {
  const $ = (id) => document.getElementById(id);

  // -----------------------
  // Data / Scenario bank
  // -----------------------
  const D = {
    params: { a: 0.08, b: 0.6, c: 0.6 }, // internal only
    baseline: { Y: 50, P: 5, Z: 5 },
    axes: { Ymin: 0, Ymax: 100, rmin: 0, rmax: 20 },
    mags: { Y: [10, 15, 20], P: [0.8, 1.2, 1.6], Z: [0.8, 1.2, 1.6] },

    scenarios: [
      // Y
      { id:"Y_retail_up", var:"Y", dir:"up", source:"Morning Economic Brief",
        headline:"Retail sales surprise to the upside",
        brief:"Major retailers report strong demand and firms increase production schedules." },
      { id:"Y_demand_down", var:"Y", dir:"down", source:"Morning Economic Brief",
        headline:"Spending cools; firms scale back production",
        brief:"Households cut discretionary purchases and inventories begin to build up." },
      { id:"Y_inv_boom", var:"Y", dir:"up", source:"Industry Update",
        headline:"Investment strengthens as firms expand capacity",
        brief:"Businesses boost equipment purchases and ramp up output." },
      { id:"Y_housing_down", var:"Y", dir:"down", source:"Industry Update",
        headline:"Housing and construction activity slows sharply",
        brief:"New projects are postponed and related industries reduce production." },
      { id:"Y_exports_up", var:"Y", dir:"up", source:"Global Markets Note",
        headline:"Export demand rises",
        brief:"Foreign demand for domestic goods increases, pushing up production." },
      { id:"Y_exports_down", var:"Y", dir:"down", source:"Global Markets Note",
        headline:"Export demand weakens",
        brief:"Foreign buyers pull back, reducing domestic production." },
      { id:"Y_fiscal_stim", var:"Y", dir:"up", source:"Policy Desk",
        headline:"New fiscal package boosts demand",
        brief:"Government spending rises and/or taxes fall, supporting higher production and output." },
      { id:"Y_fiscal_tight", var:"Y", dir:"down", source:"Policy Desk",
        headline:"Fiscal tightening weighs on activity",
        brief:"Spending cuts and/or tax increases reduce demand, lowering production and output." },

      // P
      { id:"P_inflation_hot", var:"P", dir:"up", source:"Inflation Watch",
        headline:"Inflation pressure broadens",
        brief:"Price increases spread across many goods and services." },
      { id:"P_energy_up", var:"P", dir:"up", source:"Inflation Watch",
        headline:"Energy prices surge",
        brief:"Higher energy costs pass through to the overall price level." },
      { id:"P_col_up", var:"P", dir:"up", source:"Inflation Watch",
        headline:"Cost-of-living jump",
        brief:"Rents and food prices rise broadly, pushing prices higher." },
      { id:"P_deflation", var:"P", dir:"down", source:"Inflation Watch",
        headline:"Deflation emerges",
        brief:"Prices fall across a wide range of categories (overall price level declines)." },
      { id:"P_pricecuts", var:"P", dir:"down", source:"Inflation Watch",
        headline:"Widespread price cuts",
        brief:"Firms cut prices broadly to clear excess inventories." },
      { id:"P_energy_down", var:"P", dir:"down", source:"Inflation Watch",
        headline:"Energy price collapse pulls prices down",
        brief:"A sharp drop in energy prices contributes to a lower overall price level." },

      // Z
      { id:"Z_tariffs", var:"Z", dir:"up", source:"Policy Desk",
        headline:"Tariffs announced; uncertainty rises",
        brief:"Wide-ranging tariffs increase uncertainty. The Fed leans more hawkish while waiting to see broader effects." },
      { id:"Z_stress", var:"Z", dir:"down", source:"Financial Conditions",
        headline:"Financial stress increases",
        brief:"Credit conditions tighten and risk rises. The Fed leans more accommodative to support stability." },
      { id:"Z_exuberance", var:"Z", dir:"up", source:"Financial Conditions",
        headline:"Risk-taking accelerates in asset markets",
        brief:"Speculation rises. The Fed leans more hawkish to limit financial imbalances." },
      { id:"Z_confidence", var:"Z", dir:"down", source:"Financial Conditions",
        headline:"Uncertainty shock hits confidence",
        brief:"Firms delay projects amid uncertainty. The Fed leans more dovish as a precaution." },
      { id:"Z_regime_hawk", var:"Z", dir:"up", source:"Central Bank Watch",
        headline:"Fed signals a more aggressive stance going forward",
        brief:"Officials emphasize stronger responses in future policy decisions." },
      { id:"Z_regime_dove", var:"Z", dir:"down", source:"Central Bank Watch",
        headline:"Fed signals a more patient stance",
        brief:"Officials emphasize flexibility and caution in future policy decisions." },
    ],
  };

  // -----------------------
  // KaTeX render (safe)
  // -----------------------
  function typeset(el) {
    if (!el) return;
    if (!window.renderMathInElement) {
      setTimeout(() => typeset(el), 60);
      return;
    }
    window.renderMathInElement(el, {
      delimiters: [
        { left: "\\(", right: "\\)", display: false },
        { left: "$", right: "$", display: false },
        { left: "\\[", right: "\\]", display: true },
        { left: "$$", right: "$$", display: true },
      ],
      throwOnError: false,
    });
  }

  // -----------------------
  // DOM
  // -----------------------
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

  // -----------------------
  // Style constants
  // -----------------------
  const ORANGE = "rgba(230,159,0,0.95)";
  const GREY = "rgba(0,0,0,0.22)";
  const DASH = "rgba(0,0,0,0.30)";
  const INK = "rgba(0,0,0,0.70)";

  const { a, b, c } = D.params; // internal only
  const base = { ...D.baseline };

  let cur = { ...base };
  let scenario = null;       // {id,var,dir,mag,headline,brief,source,target,stamp}
  let predMade = false;      // set to true after first Check
  let allowedVar = null;     // "Y" | "P" | "Z"
  let allowedDir = null;     // "up" | "down"

  // -----------------------
  // Helpers
  // -----------------------
  function rOf(Y, P, Z) { return a * Y + b * P + c * Z; }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function approxEq(x, y, tol) { return Math.abs(x - y) <= tol; }
  function setStatus(msg) { els.status.textContent = msg; }

  function showFeedback(html) {
    if (!html) {
      els.feedback.style.display = "none";
      els.feedback.innerHTML = "";
      return;
    }
    els.feedback.style.display = "block";
    els.feedback.innerHTML = html;
    typeset(els.feedback);
  }

  function pickMagnitude(v) {
    const arr = D.mags[v];
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function makeStamp() {
    const days = ["Mon","Tue","Wed","Thu","Fri"];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const d = days[Math.floor(Math.random() * days.length)];
    const m = months[Math.floor(Math.random() * months.length)];
    const day = 1 + Math.floor(Math.random() * 28);
    const hr = 7 + Math.floor(Math.random() * 6);
    const min = Math.random() < 0.5 ? "00" : "30";
    return `${d} ${m} ${day}, ${hr}:${min} AM`;
  }

  function matchesTarget() {
    if (!scenario) return false;
    const t = scenario.target;
    return (
      approxEq(cur.Y, t.Y, 0.5) &&
      approxEq(cur.P, t.P, 0.05) &&
      approxEq(cur.Z, t.Z, 0.05)
    );
  }

  // -----------------------
  // Your updated WHY text (remembered)
  // -----------------------
  function whyText(s) {
    const header =
      "Big idea:\n" +
      "• Movement along: the economy’s output changes, and the Fed responds along the same rule.\n" +
      "• Shift: the Fed changes its stance for reasons not captured by output alone (inflation/price pressure, uncertainty, financial conditions).\n\n";

    if (s.var === "Y") {
      const hotter = s.dir === "up";
      return header +
        "This scenario is about real activity/output changing:\n" +
        `• The story indicates the economy is ${hotter ? "stronger" : "weaker"}, so output (Y) ${hotter ? "rises" : "falls"}.\n` +
        "• In the graph, changing Y moves you to a new point on the SAME line (movement along).\n" +
        `• When the economy is ${hotter ? "running hot" : "cooling off"}, the Fed tends to set a ${hotter ? "higher" : "lower"} policy rate (r) to respond.\n` +
        `• So in this app: Y ${hotter ? "up" : "down"} → r ${hotter ? "up" : "down"} along the line.`;
    }

    if (s.var === "P") {
      const up = s.dir === "up";
      return header +
        "This scenario is about prices/inflation pressure:\n" +
        `• The story signals ${up ? "stronger inflation pressure" : "deflation (prices falling)"}.\n` +
        `• With ${up ? "higher inflation pressure" : "deflationary pressure"}, the Fed tends to choose a ${up ? "tighter" : "easier"} stance.\n` +
        `• That means r is ${up ? "higher" : "lower"} even at the same level of output Y.\n` +
        `• In this app, that shows up as a shift: the whole line moves ${up ? "up" : "down"}, rather than sliding along it.\n` +
        "• Output (Y) isn’t what drives the change here — the pricing environment does.";
    }

    // Z
    const up = s.dir === "up";
    return header +
      "This scenario is about uncertainty/financial conditions/policy stance:\n" +
      `• The story implies the Fed becomes ${up ? "more hawkish/cautious" : "more dovish/supportive"} because of risks or financial conditions.\n` +
      "• That changes the rate the Fed wants to set at ANY output level.\n" +
      `• So r is ${up ? "higher" : "lower"} even if Y is unchanged.\n` +
      `• That shows up as a shift: the whole line moves ${up ? "up" : "down"}, rather than sliding along it.\n` +
      "• In this app, Z is a catch-all for those “other considerations,” so changing Z shifts the line.";
  }

  // -----------------------
  // Locking logic
  // -----------------------
  function lockAllSliders() {
    els.Yslider.disabled = true;
    els.Pslider.disabled = true;
    els.Zslider.disabled = true;
  }

  function setSliderConstraint(slider, min, max) {
    slider.min = String(min);
    slider.max = String(max);
  }

  function applyUnlockRulesAfterPrediction() {
    // Lock all first
    lockAllSliders();

    if (!scenario || !predMade) return;

    allowedVar = scenario.var;
    allowedDir = scenario.dir;

    // Reset slider ranges to defaults first
    setSliderConstraint(els.Yslider, D.axes.Ymin, D.axes.Ymax);
    setSliderConstraint(els.Pslider, 0, 10);
    setSliderConstraint(els.Zslider, 0, 10);

    // Enable only the correct slider and restrict direction
    if (allowedVar === "Y") {
      els.Yslider.disabled = false;
      const baseY = base.Y;
      if (allowedDir === "up") setSliderConstraint(els.Yslider, baseY, D.axes.Ymax);
      else setSliderConstraint(els.Yslider, D.axes.Ymin, baseY);
      // Keep locked at baseline until student moves (still baseline value)
      els.Yslider.value = String(baseY);
    }

    if (allowedVar === "P") {
      els.Pslider.disabled = false;
      const baseP = base.P;
      if (allowedDir === "up") setSliderConstraint(els.Pslider, baseP, 10);
      else setSliderConstraint(els.Pslider, 0, baseP);
      els.Pslider.value = String(baseP);
    }

    if (allowedVar === "Z") {
      els.Zslider.disabled = false;
      const baseZ = base.Z;
      if (allowedDir === "up") setSliderConstraint(els.Zslider, baseZ, 10);
      else setSliderConstraint(els.Zslider, 0, baseZ);
      els.Zslider.value = String(baseZ);
    }

    // Ensure current state matches baseline after applying constraints
    cur = { ...base };
    updateNumbers();
    draw();
  }

  // -----------------------
  // Update numeric readouts
  // -----------------------
  function updateNumbers() {
    const r1 = rOf(base.Y, base.P, base.Z);
    const rNow = rOf(cur.Y, cur.P, cur.Z);

    els.Y0.textContent = base.Y.toFixed(0);
    els.Y1.textContent = cur.Y.toFixed(0);
    els.r0.textContent = r1.toFixed(2);
    els.r1.textContent = rNow.toFixed(2);

    els.Ydisp.textContent = cur.Y.toFixed(0);
    els.Pdisp.textContent = cur.P.toFixed(1);
    els.Zdisp.textContent = cur.Z.toFixed(1);
  }

  // -----------------------
  // Predictions check
  // -----------------------
  function expectedAnswers() {
    if (!scenario) return null;
    const type = (scenario.var === "Y") ? "move" : "shift";
    const Ychg = (scenario.var === "Y") ? (scenario.dir === "up" ? "up" : "down") : "same";
    const Rchg = (scenario.dir === "up" ? "up" : "down");
    return { type, Ychg, Rchg };
  }

  function check() {
    if (!scenario) {
      showFeedback(`<span class="tagBad">No scenario</span> Click <strong>New Scenario</strong> first.`);
      return;
    }

    const exp = expectedAnswers();
    const a1 = els.predType.value;
    const a2 = els.predR.value;
    const a3 = els.predY.value;

    if (!a1 || !a2 || !a3) {
      showFeedback(`<span class="tagBad">Missing</span> Answer all three prediction questions.`);
      return;
    }

    const ok = (a1 === exp.type && a2 === exp.Rchg && a3 === exp.Ychg);
    predMade = true;

    if (ok) {
      showFeedback(`<span class="tagOK">Checked</span> Now use the slider to see what actually happens.`);
      setStatus("Prediction checked (correct).");
    } else {
      showFeedback(`<span class="tagBad">Checked</span> Now use the slider to see what actually happens, then update your prediction.`);
      setStatus("Prediction checked (not correct).");
    }

    // Unlock only the correct slider and only in the correct direction
    applyUnlockRulesAfterPrediction();
  }

  function why() {
    if (!scenario) {
      showFeedback(`<span class="tagBad">No scenario</span> Click <strong>New Scenario</strong> first.`);
      return;
    }
    showFeedback(`<span class="tagOK">Why</span>\n${whyText(scenario)}`);
  }

  // -----------------------
  // Canvas drawing
  // -----------------------
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

  function line(ctx, x1, y1, x2, y2, stroke, lw, dpr, dash = null) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw * dpr;
    if (dash) ctx.setLineDash(dash.map(v => v * dpr));
    else ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);
  }

  function dot(ctx, x, y, color, dpr) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, 5 * dpr, 0, Math.PI * 2); ctx.fill();
  }

  function arrow(ctx, x1, y1, x2, y2, color, dpr) {
    line(ctx, x1, y1, x2, y2, color, 2.5, dpr);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const len = 10 * dpr;
    const a1 = ang + Math.PI * 0.85;
    const a2 = ang - Math.PI * 0.85;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 + len * Math.cos(a1), y2 + len * Math.sin(a1));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 + len * Math.cos(a2), y2 + len * Math.sin(a2));
    ctx.stroke();
  }

  function xTick(ctx, x, yAxisBottom, label, dpr, dx = 0) {
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(x, yAxisBottom);
    ctx.lineTo(x, yAxisBottom + 6 * dpr);
    ctx.stroke();

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.font = `${12 * dpr}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(label, x + dx, yAxisBottom + 8 * dpr);
  }

  function yTick(ctx, xAxisLeft, y, label, dpr, dy = 0) {
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(xAxisLeft - 6 * dpr, y);
    ctx.lineTo(xAxisLeft, y);
    ctx.stroke();

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.font = `${12 * dpr}px system-ui`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(label, xAxisLeft - 10 * dpr, y + dy);
  }

  function draw() {
    const { ctx, dpr, W, H } = getCtx();
    ctx.clearRect(0, 0, W, H);

    const pad = { l: 70 * dpr, r: 16 * dpr, t: 18 * dpr, b: 60 * dpr };
    const X0 = pad.l, X1 = W - pad.r;
    const Y0 = pad.t, Y1 = H - pad.b;

    const { Ymin, Ymax, rmin, rmax } = D.axes;
    const xTo = (Yv) => X0 + (Yv - Ymin) / (Ymax - Ymin) * (X1 - X0);
    const yTo = (rv) => Y0 + (rmax - rv) / (rmax - rmin) * (Y1 - Y0);

    // grid
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1 * dpr;
    for (let i = 0; i <= 5; i++) {
      const x = X0 + i * (X1 - X0) / 5;
      ctx.beginPath(); ctx.moveTo(x, Y0); ctx.lineTo(x, Y1); ctx.stroke();
    }
    for (let i = 0; i <= 4; i++) {
      const y = Y0 + i * (Y1 - Y0) / 4;
      ctx.beginPath(); ctx.moveTo(X0, y); ctx.lineTo(X1, y); ctx.stroke();
    }

    // axis labels
    ctx.fillStyle = INK;
    ctx.font = `${12 * dpr}px system-ui`;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText("Output (Y)", (X0 + X1) / 2, Y1 + 22 * dpr);

    ctx.save();
    ctx.translate(X0 - 52 * dpr, (Y0 + Y1) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText("Policy rate (r)", 0, 0);
    ctx.restore();

    // baseline line
    const rL0 = rOf(Ymin, base.P, base.Z);
    const rR0 = rOf(Ymax, base.P, base.Z);
    line(ctx, xTo(Ymin), yTo(rL0), xTo(Ymax), yTo(rR0), GREY, 3, dpr);

    // baseline point + projections
    const r1Base = rOf(base.Y, base.P, base.Z);
    const x1p = xTo(base.Y), y1p = yTo(r1Base);
    dot(ctx, x1p, y1p, "rgba(0,0,0,0.40)", dpr);
    line(ctx, x1p, y1p, x1p, yTo(rmin), DASH, 2, dpr, [4, 6]);
    line(ctx, x1p, y1p, xTo(Ymin), y1p, DASH, 2, dpr, [4, 6]);

    // baseline ticks always
    xTick(ctx, x1p, Y1, "Y₁", dpr, 0);
    yTick(ctx, X0, y1p, "r₁", dpr, 0);

    if (!scenario) return;

    // current line + point
    const rL1 = rOf(Ymin, cur.P, cur.Z);
    const rR1 = rOf(Ymax, cur.P, cur.Z);
    line(ctx, xTo(Ymin), yTo(rL1), xTo(Ymax), yTo(rR1), ORANGE, 3, dpr);

    const r2 = rOf(cur.Y, cur.P, cur.Z);
    const x2p = xTo(cur.Y), y2p = yTo(r2);
    dot(ctx, x2p, y2p, ORANGE, dpr);
    line(ctx, x2p, y2p, x2p, yTo(rmin), DASH, 2, dpr, [4, 6]);
    line(ctx, x2p, y2p, xTo(Ymin), y2p, DASH, 2, dpr, [4, 6]);

    // Ticks: show Y2/r2 only after matching scenario (your earlier pedagogy),
    // but fix overlap if Y doesn't change by offsetting label.
    if (matchesTarget()) {
      const ySame = approxEq(cur.Y, base.Y, 0.5);
      const rSame = approxEq(r2, r1Base, 0.02);

      // X-axis: if same, shift Y2 label to the right so it doesn't overlap
      xTick(ctx, x2p, Y1, "Y₂", dpr, ySame ? (18 * dpr) : 0);

      // Y-axis: if same, shift r2 label slightly down
      yTick(ctx, X0, y2p, "r₂", dpr, rSame ? (14 * dpr) : 0);

      // arrow
      if (scenario.var === "Y") {
        arrow(ctx, x1p, y1p, x2p, y2p, ORANGE, dpr);
      } else {
        const rOldAtY1 = rOf(base.Y, base.P, base.Z);
        const rNewAtY1 = rOf(base.Y, cur.P, cur.Z);
        arrow(ctx, x1p, yTo(rOldAtY1), x1p, yTo(rNewAtY1), ORANGE, dpr);
      }
    }
  }

  // -----------------------
  // Scenario + UI actions
  // -----------------------
  function setScenarioTextWithLockingInstructions() {
    if (!scenario) return;
    els.scenarioDesc.textContent =
      `${scenario.stamp} • ${scenario.source}\n` +
      `${scenario.headline}\n` +
      `${scenario.brief}\n\n` +
      `Step 1: Make a prediction, then click Check.\n` +
      `Step 2: The app unlocks only the correct slider and only in the correct direction so you can see what actually happens.`;
  }

  function newScenario() {
    // reset state
    cur = { ...base };
    predMade = false;
    allowedVar = null;
    allowedDir = null;

    // reset slider values & ranges to defaults
    els.Yslider.value = String(base.Y);
    els.Pslider.value = String(base.P);
    els.Zslider.value = String(base.Z);

    // restore default ranges
    els.Yslider.min = String(D.axes.Ymin);
    els.Yslider.max = String(D.axes.Ymax);
    els.Pslider.min = "0"; els.Pslider.max = "10";
    els.Zslider.min = "0"; els.Zslider.max = "10";

    // pick scenario
    const s0 = D.scenarios[Math.floor(Math.random() * D.scenarios.length)];
    const mag = pickMagnitude(s0.var);

    const target = { ...base };
    if (s0.var === "Y") target.Y = clamp(base.Y + (s0.dir === "up" ? mag : -mag), D.axes.Ymin, D.axes.Ymax);
    if (s0.var === "P") target.P = Math.max(0, base.P + (s0.dir === "up" ? mag : -mag));
    if (s0.var === "Z") target.Z = Math.max(0, base.Z + (s0.dir === "up" ? mag : -mag));

    scenario = { ...s0, mag, target, stamp: makeStamp() };

    // clear predictions + feedback
    els.predType.value = "";
    els.predR.value = "";
    els.predY.value = "";
    showFeedback("");

    // lock sliders until prediction checked
    lockAllSliders();

    setScenarioTextWithLockingInstructions();

    setStatus("Scenario ready. Make a prediction, then click Check.");
    updateNumbers();
    draw();
    typeset(document.body);
  }

  function reset() {
    scenario = null;
    cur = { ...base };
    predMade = false;
    allowedVar = null;
    allowedDir = null;

    els.scenarioDesc.textContent = "Click “New Scenario” to start.";

    els.predType.value = "";
    els.predR.value = "";
    els.predY.value = "";
    showFeedback("");

    // restore slider defaults and lock
    els.Yslider.min = String(D.axes.Ymin);
    els.Yslider.max = String(D.axes.Ymax);
    els.Pslider.min = "0"; els.Pslider.max = "10";
    els.Zslider.min = "0"; els.Zslider.max = "10";

    els.Yslider.value = String(base.Y);
    els.Pslider.value = String(base.P);
    els.Zslider.value = String(base.Z);

    lockAllSliders();

    setStatus("Reset.");
    updateNumbers();
    draw();
    typeset(document.body);
  }

  function sliderChanged() {
    if (!scenario || !predMade) return;

    // Read only from allowed slider to avoid accidental state changes
    // (others are disabled anyway)
    cur.Y = Number(els.Yslider.value);
    cur.P = Number(els.Pslider.value);
    cur.Z = Number(els.Zslider.value);

    updateNumbers();
    draw();

    if (matchesTarget()) {
      showFeedback(`<span class="tagOK">Nice</span> You matched the scenario. The arrow highlights movement vs shift.`);
      setStatus("Scenario matched.");
    }
  }

  // -----------------------
  // Wire events
  // -----------------------
  els.newBtn.addEventListener("click", newScenario);
  els.resetBtn.addEventListener("click", reset);
  els.checkBtn.addEventListener("click", check);
  els.whyBtn.addEventListener("click", why);

  els.Yslider.addEventListener("input", sliderChanged);
  els.Pslider.addEventListener("input", sliderChanged);
  els.Zslider.addEventListener("input", sliderChanged);

  window.addEventListener("resize", () => requestAnimationFrame(draw));

  // -----------------------
  // Init (also: rename chart title outside JS per your request)
  // -----------------------
  window.addEventListener("load", () => {
    lockAllSliders();
    updateNumbers();
    draw();
    setStatus("Ready.");
    typeset(document.body);
    setTimeout(draw, 120);

    // 2) If you have a panel title element on the page, try to rename it to "Fed Rule"
    // without breaking anything (safe no-op if not found).
    const h2s = document.querySelectorAll("h2");
    for (const h2 of h2s) {
      if (h2.textContent && h2.textContent.trim().toLowerCase().includes("fed rule")) {
        h2.textContent = "Fed Rule";
        break;
      }
    }

    // 2) Remove panel-sub tick sentence if present (safe no-op).
    const subs = document.querySelectorAll(".panel-sub");
    for (const p of subs) {
      const t = (p.textContent || "").toLowerCase();
      if (t.includes("tick") && (t.includes("y") || t.includes("r"))) {
        p.textContent = "";
      }
    }

    // 1) Update instructions box if present (collapsible howto)
    // (We can't reliably edit your HTML here, but we can append a short note.)
    const howto = document.querySelector(".howto-body");
    if (howto && !howto.dataset.locknote) {
      const note = document.createElement("p");
      note.className = "howto-note";
      note.textContent =
        "New feature: sliders are locked until you click Check. After you check (right or wrong), the app unlocks only the correct slider and only in the correct direction so you can see what actually happens.";
      howto.appendChild(note);
      howto.dataset.locknote = "1";
    }
  });
})();
