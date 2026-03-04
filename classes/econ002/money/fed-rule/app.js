(() => {
  const $ = (id) => document.getElementById(id);

  // -----------------------
  // Data / Scenario bank
  // -----------------------
  const D = {
    params: { a: 0.08, b: 0.6, c: 0.6 }, // kept internal
    baseline: { Y: 50, P: 5, Z: 5 },
    axes: { Ymin: 0, Ymax: 100, rmin: 0, rmax: 20 },
    mags: { Y: [10, 15, 20], P: [0.8, 1.2, 1.6], Z: [0.8, 1.2, 1.6] },

    scenarios: [
      // Y (output / activity)
      { id:"Y_retail_up", var:"Y", dir:"up", headline:"Retail sales surprise to the upside",
        brief:"Major retailers report strong demand and firms increase production schedules.",
        source:"Morning Economic Brief" },
      { id:"Y_demand_down", var:"Y", dir:"down", headline:"Spending cools; firms scale back production",
        brief:"Households cut discretionary purchases and inventories begin to build up.",
        source:"Morning Economic Brief" },
      { id:"Y_inv_boom", var:"Y", dir:"up", headline:"Investment strengthens as firms expand capacity",
        brief:"Businesses boost equipment purchases and ramp up output.",
        source:"Industry Update" },
      { id:"Y_housing_down", var:"Y", dir:"down", headline:"Housing and construction activity slows sharply",
        brief:"New projects are postponed and related industries reduce production.",
        source:"Industry Update" },
      { id:"Y_exports_up", var:"Y", dir:"up", headline:"Export demand rises",
        brief:"Foreign demand for domestic goods increases, pushing up production.",
        source:"Global Markets Note" },
      { id:"Y_exports_down", var:"Y", dir:"down", headline:"Export demand weakens",
        brief:"Foreign buyers pull back, reducing domestic production.",
        source:"Global Markets Note" },
      { id:"Y_fiscal_stim", var:"Y", dir:"up", headline:"New fiscal package boosts demand",
        brief:"Government spending rises and/or taxes fall, supporting higher production and output.",
        source:"Policy Desk" },
      { id:"Y_fiscal_tight", var:"Y", dir:"down", headline:"Fiscal tightening weighs on activity",
        brief:"Spending cuts and/or tax increases reduce demand, lowering production and output.",
        source:"Policy Desk" },

      // P (price level / inflation vs deflation)
      { id:"P_inflation_hot", var:"P", dir:"up", headline:"Inflation pressure broadens",
        brief:"Price increases spread across many goods and services.",
        source:"Inflation Watch" },
      { id:"P_energy_up", var:"P", dir:"up", headline:"Energy prices surge",
        brief:"Higher energy costs pass through to the overall price level.",
        source:"Inflation Watch" },
      { id:"P_col_up", var:"P", dir:"up", headline:"Cost-of-living jump",
        brief:"Rents and food prices rise broadly, pushing prices higher.",
        source:"Inflation Watch" },
      { id:"P_deflation", var:"P", dir:"down", headline:"Deflation emerges",
        brief:"Prices fall across a wide range of categories (overall price level declines).",
        source:"Inflation Watch" },
      { id:"P_pricecuts", var:"P", dir:"down", headline:"Widespread price cuts",
        brief:"Firms cut prices broadly to clear excess inventories.",
        source:"Inflation Watch" },
      { id:"P_energy_down", var:"P", dir:"down", headline:"Energy price collapse pulls prices down",
        brief:"A sharp drop in energy prices contributes to a lower overall price level.",
        source:"Inflation Watch" },

      // Z (other Fed considerations / stance)
      { id:"Z_tariffs", var:"Z", dir:"up", headline:"Tariffs announced; uncertainty rises",
        brief:"Wide-ranging tariffs increase uncertainty. The Fed leans more hawkish while waiting to see broader effects.",
        source:"Policy Desk" },
      { id:"Z_stress", var:"Z", dir:"down", headline:"Financial stress increases",
        brief:"Credit conditions tighten and risk rises. The Fed leans more accommodative to support stability.",
        source:"Financial Conditions" },
      { id:"Z_exuberance", var:"Z", dir:"up", headline:"Risk-taking accelerates in asset markets",
        brief:"Speculation rises. The Fed leans more hawkish to limit financial imbalances.",
        source:"Financial Conditions" },
      { id:"Z_confidence", var:"Z", dir:"down", headline:"Uncertainty shock hits confidence",
        brief:"Firms delay projects amid uncertainty. The Fed leans more dovish as a precaution.",
        source:"Financial Conditions" },
      { id:"Z_regime_hawk", var:"Z", dir:"up", headline:"Fed signals a more aggressive stance going forward",
        brief:"Officials emphasize stronger responses in future policy decisions.",
        source:"Central Bank Watch" },
      { id:"Z_regime_dove", var:"Z", dir:"down", headline:"Fed signals a more patient stance",
        brief:"Officials emphasize flexibility and caution in future policy decisions.",
        source:"Central Bank Watch" },
    ],
  };

  // -----------------------
  // KaTeX rendering (safe)
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
  let scenario = null; // {id,var,dir,mag,headline,brief,source,target,stamp}

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
  // Intuitive WHY (no math/intercepts)
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
        "• In this app, that shows up as a shift: the whole line moves up/down, rather than sliding along it.\n" +
        "• Output (Y) isn’t what drives the change here — the pricing environment does.";
    }

    // Z
    const up = s.dir === "up";
    return header +
      "This scenario is about uncertainty/financial conditions/policy stance:\n" +
      `• The story implies the Fed becomes ${up ? "more hawkish/cautious" : "more dovish/supportive"} because of risks or financial conditions.\n` +
      "• That changes the rate the Fed wants to set at ANY output level.\n" +
      `• So r is ${up ? "higher" : "lower"} even if Y is unchanged.\n` +
      "• In this app, Z is a catch-all for those “other considerations,” so changing Z shifts the line.";
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

  function lockControls(locked) {
    els.Yslider.disabled = locked;
    els.Pslider.disabled = locked;
    els.Zslider.disabled = locked;
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
    if (ok) {
      showFeedback(`<span class="tagOK">Correct</span> Now use the sliders to represent what changed in the story.`);
      setStatus("Correct.");
    } else {
      showFeedback(`<span class="tagBad">Not quite</span> Output stories → movement along. Price/uncertainty stories → shift.`);
      setStatus("Try again.");
    }
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
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function dot(ctx, x, y, color, dpr) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 5 * dpr, 0, Math.PI * 2);
    ctx.fill();
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

  function xTick(ctx, x, yAxisBottom, label, dpr) {
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
    ctx.fillText(label, x, yAxisBottom + 8 * dpr);
  }

  function yTick(ctx, xAxisLeft, y, label, dpr) {
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
    ctx.fillText(label, xAxisLeft - 10 * dpr, y);
  }

  function shouldShowSecondTicks() {
    // "when appropriate": show Y2/r2 if there is a scenario AND current point differs from baseline
    if (!scenario) return false;
    const same =
      approxEq(cur.Y, base.Y, 0.5) &&
      approxEq(cur.P, base.P, 0.05) &&
      approxEq(cur.Z, base.Z, 0.05);
    return !same;
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
    xTick(ctx, x1p, Y1, "Y₁", dpr);
    yTick(ctx, X0, y1p, "r₁", dpr);

    if (!scenario) return;

    // current line
    const rL1 = rOf(Ymin, cur.P, cur.Z);
    const rR1 = rOf(Ymax, cur.P, cur.Z);
    line(ctx, xTo(Ymin), yTo(rL1), xTo(Ymax), yTo(rR1), ORANGE, 3, dpr);

    // current point + projections
    const r2 = rOf(cur.Y, cur.P, cur.Z);
    const x2p = xTo(cur.Y), y2p = yTo(r2);
    dot(ctx, x2p, y2p, ORANGE, dpr);
    line(ctx, x2p, y2p, x2p, yTo(rmin), DASH, 2, dpr, [4, 6]);
    line(ctx, x2p, y2p, xTo(Ymin), y2p, DASH, 2, dpr, [4, 6]);

    // Y2/r2 ticks "when appropriate"
    if (shouldShowSecondTicks()) {
      xTick(ctx, x2p, Y1, "Y₂", dpr);
      yTick(ctx, X0, y2p, "r₂", dpr);
    }

    // Arrow only when they matched the scenario target (same as your existing behavior)
    if (matchesTarget()) {
      if (scenario.var === "Y") {
        arrow(ctx, x1p, y1p, x2p, y2p, ORANGE, dpr);
      } else {
        // shift arrow at baseline output
        const rOldAtY1 = rOf(base.Y, base.P, base.Z);
        const rNewAtY1 = rOf(base.Y, cur.P, cur.Z);
        arrow(ctx, x1p, yTo(rOldAtY1), x1p, yTo(rNewAtY1), ORANGE, dpr);
      }
    }
  }

  // -----------------------
  // Scenario + UI actions
  // -----------------------
  function newScenario() {
    // reset to baseline
    cur = { ...base };
    els.Yslider.value = String(base.Y);
    els.Pslider.value = String(base.P);
    els.Zslider.value = String(base.Z);

    const s0 = D.scenarios[Math.floor(Math.random() * D.scenarios.length)];
    const mag = pickMagnitude(s0.var);

    const target = { ...base };
    if (s0.var === "Y") target.Y = clamp(base.Y + (s0.dir === "up" ? mag : -mag), D.axes.Ymin, D.axes.Ymax);
    if (s0.var === "P") target.P = Math.max(0, base.P + (s0.dir === "up" ? mag : -mag));
    if (s0.var === "Z") target.Z = Math.max(0, base.Z + (s0.dir === "up" ? mag : -mag));

    scenario = { ...s0, mag, target, stamp: makeStamp() };

    els.scenarioDesc.textContent =
      `${scenario.stamp} • ${scenario.source}\n` +
      `${scenario.headline}\n` +
      `${scenario.brief}\n\n` +
      `Your task: use the sliders to match what changed in the story.`;

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

  function reset() {
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

  function sliderChanged() {
    if (!scenario) return;
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
  // Init
  // -----------------------
  window.addEventListener("load", () => {
    lockControls(true);
    updateNumbers();
    draw();
    setStatus("Ready.");
    typeset(document.body);
    setTimeout(draw, 120);
  });
})();
