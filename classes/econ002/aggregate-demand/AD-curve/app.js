(() => {
  const $ = (id) => document.getElementById(id);

  // -----------------------
  // KaTeX render (safe)
  // -----------------------
  function typeset(el) {
    if (!el) return;
    if (!window.renderMathInElement) { setTimeout(() => typeset(el), 60); return; }
    window.renderMathInElement(el, {
      delimiters: [
        { left: "\\(", right: "\\)", display: false },
        { left: "$", right: "$", display: false },
        { left: "\\[", right: "\\]", display: true },
        { left: "$$", right: "$$", display: true }
      ],
      throwOnError: false
    });
  }

  // -----------------------
  // MODEL: linear IS–FR with (G,T,C,I) shifters + (P,Z) in FR
  // -----------------------
  const M = {
    // axes
    isfr: { Ymin: 0, Ymax: 200, rmin: 0, rmax: 20 },
    ad:   { Ymin: 0, Ymax: 200, Pmin: 3, Pmax: 7 },

    // baselines
    base: { G: 100, T: 100, C: 100, I: 100, P: 5, Z: 5 },

    // IS: r = aIS - bIS*Y + gG*(G-G0) - gT*(T-T0) + gC*(C-C0) + gI*(I-I0)
    IS: { aIS: 16, bIS: 0.06, gG: 0.05, gT: 0.05, gC: 0.05, gI: 0.05 },

    // FR: r = aFR + bFR*Y + hP*(P-P0) + hZ*(Z-Z0)
    FR: { aFR: 2, bFR: 0.04, hP: 1.8, hZ: 1.8 },
  };

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function approxEq(x, y, tol) { return Math.abs(x - y) <= tol; }

  function IS_r(Y, G, T, C, I) {
    const { aIS, bIS, gG, gT, gC, gI } = M.IS;
    const { G: G0, T: T0, C: C0, I: I0 } = M.base;
    return aIS - bIS * Y + gG*(G - G0) - gT*(T - T0) + gC*(C - C0) + gI*(I - I0);
  }

  function FR_r(Y, P, Z) {
    const { aFR, bFR, hP, hZ } = M.FR;
    const { P: P0, Z: Z0 } = M.base;
    return aFR + bFR * Y + hP*(P - P0) + hZ*(Z - Z0);
  }

  // Solve intersection
  function eqm(G, T, C, I, P, Z) {
    const { bIS } = M.IS;
    const { bFR } = M.FR;

    // IS: r = A - bIS*Y + s
    // FR: r = C0 + bFR*Y + t
    // put all shifters into s and t via evaluating at Y=0
    const A0 = IS_r(0, G, T, C, I);
    const C0 = FR_r(0, P, Z);

    const denom = (bIS + bFR);
    let Y = (A0 - C0) / denom;
    Y = clamp(Y, M.isfr.Ymin, M.isfr.Ymax);

    const r = FR_r(Y, P, Z);
    return { Y, r };
  }

  // AD curve: trace Y(P) holding (G,T,C,I,Z) fixed
  function buildADCurve({ G, T, C, I, Z }, n = 60) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const P = M.ad.Pmin + (M.ad.Pmax - M.ad.Pmin) * (i / n);
      const { Y } = eqm(G, T, C, I, P, Z);
      pts.push({ Y, P });
    }
    return pts;
  }

  // -----------------------
  // TOKENS + MECHANISMS
  // -----------------------
  const TOK = {
    Gup:"G↑", Gdn:"G↓",
    Tup:"T↑", Tdn:"T↓",
    Cup:"C↑", Cdn:"C↓",
    Iup:"I↑", Idn:"I↓",
    Pup:"P↑", Pdn:"P↓",
    Zup:"Z↑", Zdn:"Z↓",

    PEup:"PE↑", PEdn:"PE↓",
    UInvUp:"Unplanned Inventories↑", UInvDn:"Unplanned Inventories↓",
    Yup:"Y↑", Ydn:"Y↓",
    FFup:"FF↑", FFdn:"FF↓",
    rup:"r↑", rdn:"r↓",
  };

  // Your required sequences (exact order)
  const MECH = {
    // Fiscal
    "G_up": [TOK.Gup, TOK.PEup, TOK.UInvDn, TOK.Yup, TOK.FFup, TOK.rup],
    "G_dn": [TOK.Gdn, TOK.PEdn, TOK.UInvUp, TOK.Ydn, TOK.FFdn, TOK.rdn],

    "T_dn": [TOK.Tdn, TOK.Cup, TOK.PEup, TOK.UInvDn, TOK.Yup, TOK.FFup, TOK.rup],
    "T_up": [TOK.Tup, TOK.Cdn, TOK.PEdn, TOK.UInvUp, TOK.Ydn, TOK.FFdn, TOK.rdn],

    // P and Z
    "P_up": [TOK.Pup, TOK.FFup, TOK.rup, TOK.Idn, TOK.PEdn, TOK.UInvUp, TOK.Ydn],
    "P_dn": [TOK.Pdn, TOK.FFdn, TOK.rdn, TOK.Iup, TOK.PEup, TOK.UInvDn, TOK.Yup],

    "Z_up": [TOK.Zup, TOK.FFup, TOK.rup, TOK.Idn, TOK.PEdn, TOK.UInvUp, TOK.Ydn],
    "Z_dn": [TOK.Zdn, TOK.FFdn, TOK.rdn, TOK.Iup, TOK.PEup, TOK.UInvDn, TOK.Yup],

    // NEW: Consumption shocks
    "C_up": [TOK.Cup, TOK.PEup, TOK.UInvDn, TOK.Yup, TOK.FFup, TOK.rup],
    "C_dn": [TOK.Cdn, TOK.PEdn, TOK.UInvUp, TOK.Ydn, TOK.FFdn, TOK.rdn],

    // NEW: Investment shocks
    "I_up": [TOK.Iup, TOK.PEup, TOK.UInvDn, TOK.Yup, TOK.FFup, TOK.rup],
    "I_dn": [TOK.Idn, TOK.PEdn, TOK.UInvUp, TOK.Ydn, TOK.FFdn, TOK.rdn],
  };

  // Pill pool grouped (no shuffle), with SHORT pills (see makePill)
  const PILL_GROUPS = [
    { name: "G", pills: [TOK.Gup, TOK.Gdn] },
    { name: "T", pills: [TOK.Tup, TOK.Tdn] },
    { name: "C", pills: [TOK.Cup, TOK.Cdn] },
    { name: "I", pills: [TOK.Iup, TOK.Idn] },
    { name: "P", pills: [TOK.Pup, TOK.Pdn] },
    { name: "Z", pills: [TOK.Zup, TOK.Zdn] },
    { name: "Planned Expenditure", pills: [TOK.PEup, TOK.PEdn] },
    { name: "Unplanned Inventories", pills: [TOK.UInvUp, TOK.UInvDn] },
    { name: "Output", pills: [TOK.Yup, TOK.Ydn] },
    { name: "Federal Funds", pills: [TOK.FFup, TOK.FFdn] },
    { name: "Interest rate", pills: [TOK.rup, TOK.rdn] },
  ];

  function mechKeyFor(varName, dir) {
    const d = (dir === "up") ? "up" : "dn";
    return `${varName}_${d}`;
  }

  // -----------------------
  // NEWS SCENARIOS (add C and I)
  // -----------------------
  const SCEN = [
    { var:"G", dir:"up",   source:"Policy Desk", headline:"Spending bill passes in Congress", brief:"Federal purchases rise over the next quarter." },
    { var:"G", dir:"down", source:"Policy Desk", headline:"Spending cuts announced", brief:"Government purchases will be reduced to meet a budget target." },

    { var:"T", dir:"down", source:"Policy Desk", headline:"Tax cut approved", brief:"Households face lower taxes starting this month." },
    { var:"T", dir:"up",   source:"Policy Desk", headline:"Tax increase scheduled", brief:"Higher taxes take effect to stabilize public finances." },

    { var:"C", dir:"up",   source:"Household Survey", headline:"Consumer confidence jumps", brief:"Households report greater willingness to spend." },
    { var:"C", dir:"down", source:"Household Survey", headline:"Confidence weakens", brief:"Households become more cautious and cut spending." },

    { var:"I", dir:"up",   source:"Business Pulse", headline:"Firms ramp up investment plans", brief:"Capital spending plans expand due to strong outlook." },
    { var:"I", dir:"down", source:"Business Pulse", headline:"Investment plans pulled back", brief:"Firms delay projects amid uncertainty." },

    { var:"P", dir:"up",   source:"Inflation Watch", headline:"Inflation pressures intensify", brief:"Prices rise broadly across goods and services." },
    { var:"P", dir:"down", source:"Inflation Watch", headline:"Deflation appears", brief:"Prices fall across many categories (deflation)." },

    { var:"Z", dir:"up",   source:"Policy Desk", headline:"Tariffs announced; uncertainty rises", brief:"Policy uncertainty rises; the Fed leans more cautious." },
    { var:"Z", dir:"down", source:"Financial Conditions", headline:"Financial stress eases", brief:"Credit conditions improve; the Fed feels less need to restrain activity." },
  ];

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

  // -----------------------
  // DOM (expects these IDs in your index)
  // -----------------------
  const els = {
    newBtn: $("newBtn"),
    resetBtn: $("resetBtn"),
    status: $("status"),
    scenarioDesc: $("scenarioDesc"),

    // sliders (Cslider & Islider must exist in your index for C/I shocks)
    Gslider: $("Gslider"),
    Tslider: $("Tslider"),
    Cslider: $("Cslider"),
    Islider: $("Islider"),
    Pslider: $("Pslider"),
    Zslider: $("Zslider"),

    Gdisp: $("Gdisp"),
    Tdisp: $("Tdisp"),
    Cdisp: $("Cdisp"),
    Idisp: $("Idisp"),
    Pdisp: $("Pdisp"),
    Zdisp: $("Zdisp"),

    // pills / mechanism
    slots: $("slots"),
    poolGroups: $("poolGroups"),
    mechStatus: $("mechStatus"),
    checkMechBtn: $("checkMechBtn"),
    clearMechBtn: $("clearMechBtn"),

    // predictions
    predISAction: $("predISAction"),
    predISDir: $("predISDir"),
    predFRAction: $("predFRAction"),
    predFRDir: $("predFRDir"),
    predADAction: $("predADAction"),
    predADDir: $("predADDir"),
    checkPredBtn: $("checkPredBtn"),
    whyPredBtn: $("whyPredBtn"),
    predStatus: $("predStatus"),

    // canvases
    isfrCanvas: $("isfrCanvas"),
    adCanvas: $("adCanvas"),
  };

  if (!els.isfrCanvas || !els.adCanvas) return;

  // -----------------------
  // State
  // -----------------------
  let scenario = null;        // {var,dir,stamp,source,headline,brief}
  let slotsState = [];
  let mechOK = false;

  // prediction gate
  let predMade = false;
  let predCorrect = false;

  // reveal gate: once correct slider moves in correct direction (any magnitude)
  let revealed = false;

  // current values (start baseline)
  let cur = { ...M.base };

  const baseEq = eqm(M.base.G, M.base.T, M.base.C, M.base.I, M.base.P, M.base.Z);
  const baseAD = buildADCurve({ G: M.base.G, T: M.base.T, C: M.base.C, I: M.base.I, Z: M.base.Z }, 60);

  // -----------------------
  // Slider locking after scenario until prediction is made
  // Students CAN still do mechanism while sliders locked.
  // -----------------------
  function allSliders() {
    return [els.Gslider, els.Tslider, els.Cslider, els.Islider, els.Pslider, els.Zslider].filter(Boolean);
  }

  function lockAllSliders() {
    for (const s of allSliders()) s.disabled = true;
  }

  function restoreSliderRanges() {
    // these are safe defaults; your index can set better ranges
    if (els.Gslider) { els.Gslider.min = "80"; els.Gslider.max = "120"; }
    if (els.Tslider) { els.Tslider.min = "80"; els.Tslider.max = "120"; }
    if (els.Cslider) { els.Cslider.min = "80"; els.Cslider.max = "120"; }
    if (els.Islider) { els.Islider.min = "80"; els.Islider.max = "120"; }
    if (els.Pslider) { els.Pslider.min = "3";  els.Pslider.max = "7"; }
    if (els.Zslider) { els.Zslider.min = "3";  els.Zslider.max = "7"; }
  }

  function setSliderConstraint(slider, min, max) {
    if (!slider) return;
    slider.min = String(min);
    slider.max = String(max);
  }

  function unlockOnlyCorrectSlider() {
    // lock all first
    lockAllSliders();
    restoreSliderRanges();

    if (!scenario || !predMade) return;

    const v = scenario.var;
    const dir = scenario.dir;

    // enable only correct slider, constrain direction relative to baseline
    const baseVal = M.base[v];

    const sliderMap = {
      G: els.Gslider,
      T: els.Tslider,
      C: els.Cslider,
      I: els.Islider,
      P: els.Pslider,
      Z: els.Zslider,
    };
    const s = sliderMap[v];
    if (!s) return;

    s.disabled = false;

    // constrain direction (any magnitude)
    // if dir=up => [base, max], dir=down => [min, base]
    const min = Number(s.min);
    const max = Number(s.max);
    if (dir === "up") setSliderConstraint(s, baseVal, max);
    else setSliderConstraint(s, min, baseVal);

    // force to baseline to start
    s.value = String(baseVal);

    // reset current to baseline
    cur = { ...M.base };
    updateReadouts();
    drawAll();
  }

  // -----------------------
  // Mechanism UI
  // -----------------------
  function setStatus(msg) { if (els.status) els.status.textContent = msg; }
  function setPredStatus(msg) { if (els.predStatus) els.predStatus.textContent = msg; }
  function setMechStatus(msg) { if (els.mechStatus) els.mechStatus.textContent = msg || ""; }

  function makePill(token) {
    const d = document.createElement("div");
    d.className = "pill";
    d.textContent = token;
    d.draggable = true;
    d.dataset.tok = token;

    // Make pills SHORT even if CSS isn’t perfect:
    d.style.padding = "2px 10px";
    d.style.lineHeight = "1.05";
    d.style.height = "auto";

    d.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", token);
      e.dataTransfer.effectAllowed = "move";
    });
    return d;
  }

  function renderPoolGrouped() {
    if (!els.poolGroups) return;
    els.poolGroups.innerHTML = "";
    for (const g of PILL_GROUPS) {
      const wrap = document.createElement("div");
      wrap.className = "poolGroup";

      const hdr = document.createElement("div");
      hdr.className = "poolHdr";
      hdr.textContent = g.name;
      wrap.appendChild(hdr);

      const pool = document.createElement("div");
      pool.className = "pool";
      for (const t of g.pills) pool.appendChild(makePill(t));
      wrap.appendChild(pool);

      els.poolGroups.appendChild(wrap);
    }
  }

  function renderSlots(requiredLen) {
    if (!els.slots) return;
    els.slots.innerHTML = "";
    slotsState = new Array(requiredLen).fill(null);

    for (let i = 0; i < requiredLen; i++) {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.textContent = "Drop";
      slot.dataset.idx = String(i);

      slot.addEventListener("dragover", (e) => { e.preventDefault(); e.dataTransfer.dropEffect="move"; });
      slot.addEventListener("drop", (e) => {
        e.preventDefault();
        const tok = e.dataTransfer.getData("text/plain");
        if (!tok) return;
        slotsState[i] = tok;
        slot.classList.add("filled");
        slot.textContent = tok;
        setMechStatus("");
      });
      slot.addEventListener("dblclick", () => {
        slotsState[i] = null;
        slot.classList.remove("filled");
        slot.textContent = "Drop";
        setMechStatus("");
      });

      els.slots.appendChild(slot);

      if (i < requiredLen - 1) {
        const arr = document.createElement("span");
        arr.className = "arrowTok";
        arr.textContent = "→";
        els.slots.appendChild(arr);
      }
    }
  }

  function clearSlots() {
    if (!els.slots) return;
    const children = Array.from(els.slots.querySelectorAll(".slot"));
    for (const s of children) {
      const idx = Number(s.dataset.idx);
      slotsState[idx] = null;
      s.classList.remove("filled");
      s.textContent = "Drop";
    }
    setMechStatus("");
  }

  function checkMechanism() {
    if (!scenario) { setMechStatus("Click New Scenario first."); return; }
    const key = mechKeyFor(scenario.var, scenario.dir);
    const seq = MECH[key];
    if (!seq) { setMechStatus("No mechanism defined."); return; }

    if (slotsState.some(v => v === null)) {
      setMechStatus("Fill all blanks before checking.");
      mechOK = false;
      return;
    }
    mechOK = seq.every((t,i)=> slotsState[i] === t);
    setMechStatus(mechOK ? "Correct." : "Not quite. Try again.");
  }

  // -----------------------
  // Predictions: IS / FR / AD (shift vs movement + direction)
  // -----------------------
  // We use these direction conventions:
  // IS shift: left/right; IS movement: up/down
  // FR shift: up/down;  FR movement: up/down
  // AD shift: left/right; AD movement: up/down (P up means move UP along AD; P down means move DOWN)
  function expectedPrediction(s) {
    const v = s.var, dir = s.dir;

    // defaults
    let IS = { action: "move", dir: "up" };
    let FR = { action: "move", dir: "up" };
    let AD = { action: "shift", dir: "right" };

    if (v === "G" || v === "T" || v === "C" || v === "I") {
      // Demand-side shocks shift IS; FR fixed => move along FR; AD shifts
      // Up shock => IS right, FR up (movement), AD right
      // Down shock => IS left, FR down, AD left
      IS = { action: "shift", dir: (dir === "up" ? "right" : "left") };
      FR = { action: "move",  dir: (dir === "up" ? "up" : "down") };
      AD = { action: "shift", dir: (dir === "up" ? "right" : "left") };
    }

    if (v === "P" || v === "Z") {
      // FR shifts (up if P/Z up, down if P/Z down)
      // IS fixed => move along IS (up if r up; down if r down)
      // AD:
      //  - P change: movement along AD (since P itself changes)
      //  - Z change: AD shifts (policy stance changes output at each P)
      IS = { action: "move", dir: (dir === "up" ? "up" : "down") };
      FR = { action: "shift", dir: (dir === "up" ? "up" : "down") };
      if (v === "P") AD = { action: "move", dir: (dir === "up" ? "up" : "down") };
      if (v === "Z") AD = { action: "shift", dir: (dir === "up" ? "left" : "right") };
    }

    return { IS, FR, AD };
  }

  function predComplete() {
    const need = [els.predISAction, els.predISDir, els.predFRAction, els.predFRDir, els.predADAction, els.predADDir];
    return need.every(el => el && el.value && el.value !== "");
  }

  function checkPrediction() {
    if (!scenario) { setPredStatus("Click New Scenario first."); return; }
    if (!predComplete()) { setPredStatus("Answer all prediction dropdowns first."); return; }

    const exp = expectedPrediction(scenario);
    const got = {
      IS: { action: els.predISAction.value, dir: els.predISDir.value },
      FR: { action: els.predFRAction.value, dir: els.predFRDir.value },
      AD: { action: els.predADAction.value, dir: els.predADDir.value },
    };

    const ok =
      got.IS.action === exp.IS.action && got.IS.dir === exp.IS.dir &&
      got.FR.action === exp.FR.action && got.FR.dir === exp.FR.dir &&
      got.AD.action === exp.AD.action && got.AD.dir === exp.AD.dir;

    predMade = true;
    predCorrect = ok;

    setPredStatus(ok ? "Correct. Now use the slider." : "Not quite. Now use the slider to see what actually changes.");
    setStatus("Prediction checked.");

    // unlock only correct slider + direction
    unlockOnlyCorrectSlider();
  }

  function whyPrediction() {
    if (!scenario) { setPredStatus("Click New Scenario first."); return; }

    const exp = expectedPrediction(scenario);
    const v = scenario.var, dir = scenario.dir;

    // detailed intuitive explanation (no algebra)
    let txt = "Why this is the correct classification:\n\n";

    if (v === "G" || v === "T" || v === "C" || v === "I") {
      txt +=
        "This is a demand-side shock that changes planned expenditure directly.\n" +
        "• That changes the IS curve itself (a shift), because for any interest rate the goods market equilibrium output changes.\n" +
        "• The Fed rule (FR) does not shift here—policy stance is the same—so the equilibrium moves along FR.\n" +
        "• Aggregate Demand shifts because at each price level, the IS–FR equilibrium output is different.\n\n";
      if (dir === "up") txt += "Direction: higher demand → IS shifts right → equilibrium output rises and r rises → AD shifts right.";
      else txt += "Direction: lower demand → IS shifts left → equilibrium output falls and r falls → AD shifts left.";
    } else if (v === "P") {
      txt +=
        "This is a change in the price level.\n" +
        "• A higher price level leads the Fed to target a higher funds rate (FR shifts up); a lower price level shifts FR down.\n" +
        "• IS does not shift—spending behavior hasn’t changed at each r—so the equilibrium moves along IS as r changes.\n" +
        "• In (P,Y) space, changing P is a movement along the AD curve: you’re looking at a different point with a different P.\n\n";
      if (dir === "up") txt += "Direction: P rises → FR shifts up → r rises → investment falls → output falls → move up along AD (higher P, lower Y).";
      else txt += "Direction: P falls → FR shifts down → r falls → investment rises → output rises → move down along AD (lower P, higher Y).";
    } else { // Z
      txt +=
        "This is a change in other policy considerations/stance.\n" +
        "• The Fed becomes more hawkish or dovish independent of current output, so FR shifts.\n" +
        "• IS does not shift—spending at each r hasn’t changed—so the equilibrium moves along IS.\n" +
        "• Aggregate Demand shifts because at each price level, the IS–FR equilibrium output changes when policy stance changes.\n\n";
      if (dir === "up") txt += "Direction: Z rises (more hawkish) → FR shifts up → r rises → investment falls → output falls → AD shifts left.";
      else txt += "Direction: Z falls (more dovish) → FR shifts down → r falls → investment rises → output rises → AD shifts right.";
    }

    setPredStatus(txt);
  }

  // -----------------------
  // Scenario text + reset
  // -----------------------
  function setScenarioText(s) {
    if (!els.scenarioDesc) return;
    els.scenarioDesc.textContent =
      `${s.stamp} • ${s.source}\n` +
      `${s.headline}\n` +
      `${s.brief}\n\n` +
      `Step 1: Build the mechanism.\n` +
      `Step 2: Make predictions for IS, FR, and AD, then click Check.\n` +
      `Step 3: Use the unlocked slider to reveal what happens.`;
  }

  function resetToBaseline() {
    cur = { ...M.base };
    if (els.Gslider) els.Gslider.value = String(M.base.G);
    if (els.Tslider) els.Tslider.value = String(M.base.T);
    if (els.Cslider) els.Cslider.value = String(M.base.C);
    if (els.Islider) els.Islider.value = String(M.base.I);
    if (els.Pslider) els.Pslider.value = String(M.base.P);
    if (els.Zslider) els.Zslider.value = String(M.base.Z);

    mechOK = false;
    revealed = false;
    predMade = false;
    predCorrect = false;
    setMechStatus("");
    setPredStatus("");
    updateReadouts();
    drawAll();
  }

  // -----------------------
  // Readouts
  // -----------------------
  function updateReadouts() {
    if (els.Gdisp) els.Gdisp.textContent = cur.G.toFixed(0);
    if (els.Tdisp) els.Tdisp.textContent = cur.T.toFixed(0);
    if (els.Cdisp) els.Cdisp.textContent = cur.C.toFixed(0);
    if (els.Idisp) els.Idisp.textContent = cur.I.toFixed(0);
    if (els.Pdisp) els.Pdisp.textContent = cur.P.toFixed(1);
    if (els.Zdisp) els.Zdisp.textContent = cur.Z.toFixed(1);
  }

  // -----------------------
  // Reveal condition (after prediction, slider unlocked, any move in allowed dir)
  // -----------------------
  function updateReveal() {
    if (revealed || !scenario || !predMade) return;

    const v = scenario.var, dir = scenario.dir;
    const baseVal = M.base[v];
    const curVal = cur[v];

    if (dir === "up" && curVal > baseVal) revealed = true;
    if (dir === "down" && curVal < baseVal) revealed = true;
  }

  // -----------------------
  // Drawing
  // -----------------------
  function getCtx(canvas) {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const Wcss = canvas.clientWidth || canvas.width;
    const Hcss = canvas.clientHeight || canvas.height;
    const W = Math.floor(Wcss * dpr);
    const H = Math.floor(Hcss * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    return { ctx, dpr, W, H };
  }

  function drawLine(ctx, x1,y1,x2,y2, stroke, lw, dpr, dash=null) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw*dpr;
    if (dash) ctx.setLineDash(dash.map(v=>v*dpr)); else ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    ctx.setLineDash([]);
  }
  function dot(ctx, x,y, color, dpr) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x,y,5*dpr,0,Math.PI*2); ctx.fill();
  }
  function arrow(ctx, x1,y1,x2,y2, color, dpr) {
    drawLine(ctx, x1,y1,x2,y2, color, 2.5, dpr);
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
  function xTick(ctx, x, yAxisBottom, label, dpr) {
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 2*dpr;
    ctx.beginPath(); ctx.moveTo(x, yAxisBottom); ctx.lineTo(x, yAxisBottom + 6*dpr); ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.font = `${12*dpr}px system-ui`;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(label, x, yAxisBottom + 8*dpr);
  }
  function yTick(ctx, xAxisLeft, y, label, dpr) {
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 2*dpr;
    ctx.beginPath(); ctx.moveTo(xAxisLeft - 6*dpr, y); ctx.lineTo(xAxisLeft, y); ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.font = `${12*dpr}px system-ui`;
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    ctx.fillText(label, xAxisLeft - 10*dpr, y);
  }

  function drawISFR() {
    const { ctx, dpr, W, H } = getCtx(els.isfrCanvas);
    ctx.clearRect(0,0,W,H);

    const pad = { l: 70*dpr, r: 18*dpr, t: 18*dpr, b: 60*dpr };
    const X0 = pad.l, X1 = W-pad.r;
    const Y0 = pad.t, Y1 = H-pad.b;

    const { Ymin, Ymax, rmin, rmax } = M.isfr;
    const xTo = (Y) => X0 + (Y-Ymin)/(Ymax-Ymin)*(X1-X0);
    const yTo = (r) => Y0 + (rmax-r)/(rmax-rmin)*(Y1-Y0);

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

    // labels
    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.font = `${12*dpr}px system-ui`;
    ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText("Output (Y)", (X0+X1)/2, Y1 + 22*dpr);
    ctx.save();
    ctx.translate(X0 - 52*dpr, (Y0+Y1)/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText("Interest rate (r)", 0, 0);
    ctx.restore();

    // baseline curves
    const YL = Ymin, YR = Ymax;
    const isL0 = IS_r(YL, M.base.G, M.base.T, M.base.C, M.base.I);
    const isR0 = IS_r(YR, M.base.G, M.base.T, M.base.C, M.base.I);
    const frL0 = FR_r(YL, M.base.P, M.base.Z);
    const frR0 = FR_r(YR, M.base.P, M.base.Z);

    drawLine(ctx, xTo(YL), yTo(isL0), xTo(YR), yTo(isR0), "rgba(0,0,0,0.22)", 3, dpr);
    drawLine(ctx, xTo(YL), yTo(frL0), xTo(YR), yTo(frR0), "rgba(0,0,0,0.22)", 3, dpr);

    // baseline equilibrium
    const x1p = xTo(baseEq.Y), y1p = yTo(baseEq.r);
    dot(ctx, x1p, y1p, "rgba(0,0,0,0.40)", dpr);
    drawLine(ctx, x1p, y1p, x1p, yTo(rmin), "rgba(0,0,0,0.30)", 2, dpr, [4,6]);
    drawLine(ctx, x1p, y1p, xTo(Ymin), y1p, "rgba(0,0,0,0.30)", 2, dpr, [4,6]);
    xTick(ctx, x1p, Y1, "Y₁", dpr);
    yTick(ctx, X0, y1p, "r₁", dpr);

    // current curves (only after prediction unlocks slider; but we still draw them based on current state)
    const isL1 = IS_r(YL, cur.G, cur.T, cur.C, cur.I);
    const isR1 = IS_r(YR, cur.G, cur.T, cur.C, cur.I);
    const frL1 = FR_r(YL, cur.P, cur.Z);
    const frR1 = FR_r(YR, cur.P, cur.Z);

    drawLine(ctx, xTo(YL), yTo(isL1), xTo(YR), yTo(isR1), "rgba(230,159,0,0.95)", 3, dpr);
    drawLine(ctx, xTo(YL), yTo(frL1), xTo(YR), yTo(frR1), "rgba(230,159,0,0.95)", 3, dpr);

    if (revealed) {
      const eq2 = eqm(cur.G, cur.T, cur.C, cur.I, cur.P, cur.Z);
      const x2p = xTo(eq2.Y), y2p = yTo(eq2.r);
      dot(ctx, x2p, y2p, "rgba(230,159,0,0.95)", dpr);
      drawLine(ctx, x2p, y2p, x2p, yTo(rmin), "rgba(0,0,0,0.30)", 2, dpr, [4,6]);
      drawLine(ctx, x2p, y2p, xTo(Ymin), y2p, "rgba(0,0,0,0.30)", 2, dpr, [4,6]);

      // Skip Y₂ entirely if output doesn't change
      if (!approxEq(eq2.Y, baseEq.Y, 1e-6)) xTick(ctx, x2p, Y1, "Y₂", dpr);
      yTick(ctx, X0, y2p, "r₂", dpr);
      arrow(ctx, x1p, y1p, x2p, y2p, "rgba(230,159,0,0.95)", dpr);
    }
  }

  function drawAD() {
    const { ctx, dpr, W, H } = getCtx(els.adCanvas);
    ctx.clearRect(0,0,W,H);

    const pad = { l: 70*dpr, r: 18*dpr, t: 18*dpr, b: 60*dpr };
    const X0 = pad.l, X1 = W-pad.r;
    const Y0 = pad.t, Y1 = H-pad.b;

    const { Ymin, Ymax, Pmin, Pmax } = M.ad;
    const xTo = (Y) => X0 + (Y-Ymin)/(Ymax-Ymin)*(X1-X0);
    const yTo = (P) => Y0 + (Pmax-P)/(Pmax-Pmin)*(Y1-Y0);

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

    // labels
    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.font = `${12*dpr}px system-ui`;
    ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText("Output (Y)", (X0+X1)/2, Y1 + 22*dpr);
    ctx.save();
    ctx.translate(X0 - 52*dpr, (Y0+Y1)/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText("Price level (P)", 0, 0);
    ctx.restore();

    // baseline AD
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    for (let i=0;i<baseAD.length;i++){
      const pt = baseAD[i];
      const x = xTo(pt.Y), y = yTo(pt.P);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    // baseline point
    const x1p = xTo(baseEq.Y), y1p = yTo(M.base.P);
    dot(ctx, x1p, y1p, "rgba(0,0,0,0.40)", dpr);
    drawLine(ctx, x1p, y1p, x1p, yTo(Pmin), "rgba(0,0,0,0.30)", 2, dpr, [4,6]);
    drawLine(ctx, x1p, y1p, xTo(Ymin), y1p, "rgba(0,0,0,0.30)", 2, dpr, [4,6]);
    xTick(ctx, x1p, Y1, "Y₁", dpr);
    yTick(ctx, X0, y1p, "P₁", dpr);

    // current AD curve for (G,T,C,I,Z)
    const curAD = buildADCurve({ G: cur.G, T: cur.T, C: cur.C, I: cur.I, Z: cur.Z }, 60);
    ctx.strokeStyle = "rgba(230,159,0,0.95)";
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    for (let i=0;i<curAD.length;i++){
      const pt = curAD[i];
      const x = xTo(pt.Y), y = yTo(pt.P);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    if (revealed) {
      const eq2 = eqm(cur.G, cur.T, cur.C, cur.I, cur.P, cur.Z);
      const x2p = xTo(eq2.Y), y2p = yTo(cur.P);
      dot(ctx, x2p, y2p, "rgba(230,159,0,0.95)", dpr);
      drawLine(ctx, x2p, y2p, x2p, yTo(Pmin), "rgba(0,0,0,0.30)", 2, dpr, [4,6]);
      drawLine(ctx, x2p, y2p, xTo(Ymin), y2p, "rgba(0,0,0,0.30)", 2, dpr, [4,6]);

      if (!approxEq(eq2.Y, baseEq.Y, 1e-6)) xTick(ctx, x2p, Y1, "Y₂", dpr);
      yTick(ctx, X0, y2p, "P₂", dpr);
      arrow(ctx, x1p, y1p, x2p, y2p, "rgba(230,159,0,0.95)", dpr);
    }
  }

  function drawAll() { drawISFR(); drawAD(); }

  // -----------------------
  // Slider / prediction flow
  // -----------------------
  function syncCurFromSliders() {
    if (els.Gslider) cur.G = Number(els.Gslider.value);
    if (els.Tslider) cur.T = Number(els.Tslider.value);
    if (els.Cslider) cur.C = Number(els.Cslider.value);
    if (els.Islider) cur.I = Number(els.Islider.value);
    if (els.Pslider) cur.P = Number(els.Pslider.value);
    if (els.Zslider) cur.Z = Number(els.Zslider.value);
  }

  function onSlider() {
    // Only the unlocked slider will actually move, but keep this robust
    syncCurFromSliders();
    updateReveal();
    updateReadouts();
    drawAll();
  }

  // -----------------------
  // Scenario + reset
  // -----------------------
  function newScenario() {
    resetToBaseline();

    scenario = { ...SCEN[Math.floor(Math.random()*SCEN.length)], stamp: makeStamp() };
    setScenarioText(scenario);

    renderPoolGrouped();
    const key = mechKeyFor(scenario.var, scenario.dir);
    const seq = MECH[key];
    renderSlots(seq.length);

    // predictions cleared
    if (els.predISAction) els.predISAction.value = "";
    if (els.predISDir) els.predISDir.value = "";
    if (els.predFRAction) els.predFRAction.value = "";
    if (els.predFRDir) els.predFRDir.value = "";
    if (els.predADAction) els.predADAction.value = "";
    if (els.predADDir) els.predADDir.value = "";
    setPredStatus("");

    // lock sliders until prediction is checked
    lockAllSliders();

    setStatus("Scenario ready. Build the mechanism and make predictions.");
    typeset(document.body);
    drawAll();
  }

  function resetAll() {
    scenario = null;
    resetToBaseline();
    if (els.scenarioDesc) els.scenarioDesc.textContent = "Click “New Scenario” to start.";
    if (els.slots) els.slots.innerHTML = "";
    if (els.poolGroups) els.poolGroups.innerHTML = "";
    setMechStatus("");
    setPredStatus("");
    setStatus("Reset.");
    typeset(document.body);
    drawAll();
  }

  // -----------------------
  // Event wiring
  // -----------------------
  els.newBtn?.addEventListener("click", newScenario);
  els.resetBtn?.addEventListener("click", resetAll);

  els.checkMechBtn?.addEventListener("click", checkMechanism);
  els.clearMechBtn?.addEventListener("click", clearSlots);

  els.checkPredBtn?.addEventListener("click", checkPrediction);
  els.whyPredBtn?.addEventListener("click", whyPrediction);

  // sliders
  els.Gslider?.addEventListener("input", onSlider);
  els.Tslider?.addEventListener("input", onSlider);
  els.Cslider?.addEventListener("input", onSlider);
  els.Islider?.addEventListener("input", onSlider);
  els.Pslider?.addEventListener("input", onSlider);
  els.Zslider?.addEventListener("input", onSlider);

  window.addEventListener("resize", () => requestAnimationFrame(drawAll));

  // -----------------------
  // Init
  // -----------------------
  window.addEventListener("load", () => {
    resetAll();
    // Ensure baseline slider values exist even if C/I sliders absent
    restoreSliderRanges();
    typeset(document.body);
    requestAnimationFrame(drawAll);
    setTimeout(drawAll, 120);
  });
})();
