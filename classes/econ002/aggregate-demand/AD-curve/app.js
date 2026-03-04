(() => {
  const $ = (id) => document.getElementById(id);

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
  // MODEL
  // -----------------------
  const M = {
    isfr: { Ymin: 0, Ymax: 200, rmin: 0, rmax: 20 },
    ad: { Ymin: 0, Ymax: 200, Pmin: 3, Pmax: 7 },

    base: { G: 100, T: 100, C: 100, I: 100, P: 5, Z: 5 },

    // IS: r = aIS - bIS*Y + gG*(G-G0) - gT*(T-T0) + gC*(C-C0) + gI*(I-I0)
    IS: { aIS: 16, bIS: 0.06, gG: 0.05, gT: 0.05, gC: 0.05, gI: 0.05 },

    // FR: r = aFR + bFR*Y + hP*(P-P0) + hZ*(Z-Z0)
    FR: { aFR: 2, bFR: 0.04, hP: 1.8, hZ: 1.8 },

    ranges: {
      G: { min: 40, max: 160, step: 1 },
      T: { min: 40, max: 160, step: 1 },
      C: { min: 40, max: 160, step: 1 },
      I: { min: 40, max: 160, step: 1 },
      P: { min: 1, max: 9, step: 0.1 },
      Z: { min: 1, max: 9, step: 0.1 },
    },
  };

  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const approxEq = (x, y, tol) => Math.abs(x - y) <= tol;

  function IS_r(Y, G, T, C, I) {
    const { aIS, bIS, gG, gT, gC, gI } = M.IS;
    const { G: G0, T: T0, C: C0, I: I0 } = M.base;
    return aIS - bIS * Y + gG * (G - G0) - gT * (T - T0) + gC * (C - C0) + gI * (I - I0);
  }

  function FR_r(Y, P, Z) {
    const { aFR, bFR, hP, hZ } = M.FR;
    const { P: P0, Z: Z0 } = M.base;
    return aFR + bFR * Y + hP * (P - P0) + hZ * (Z - Z0);
  }

  function eqm(G, T, C, I, P, Z) {
    const A0 = IS_r(0, G, T, C, I);
    const C0 = FR_r(0, P, Z);
    const denom = M.IS.bIS + M.FR.bFR;

    let Y = (A0 - C0) / denom;
    Y = clamp(Y, M.isfr.Ymin, M.isfr.Ymax);
    const r = FR_r(Y, P, Z);
    return { Y, r };
  }

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
    Gup: "G↑",
    Gdn: "G↓",
    Tup: "T↑",
    Tdn: "T↓",
    Cup: "C↑",
    Cdn: "C↓",
    Iup: "I↑",
    Idn: "I↓",
    Pup: "P↑",
    Pdn: "P↓",
    Zup: "Z↑",
    Zdn: "Z↓",
    PEup: "PE↑",
    PEdn: "PE↓",
    UInvUp: "Unplanned Inventories↑",
    UInvDn: "Unplanned Inventories↓",
    Yup: "Y↑",
    Ydn: "Y↓",
    FFup: "FF↑",
    FFdn: "FF↓",
    rup: "r↑",
    rdn: "r↓",
  };

  const MECH = {
    // Government purchases
    G_up: [TOK.Gup, TOK.PEup, TOK.UInvDn, TOK.Yup, TOK.FFup, TOK.rup],
    G_dn: [TOK.Gdn, TOK.PEdn, TOK.UInvUp, TOK.Ydn, TOK.FFdn, TOK.rdn],

    // Taxes
    T_dn: [TOK.Tdn, TOK.Cup, TOK.PEup, TOK.UInvDn, TOK.Yup, TOK.FFup, TOK.rup],
    T_up: [TOK.Tup, TOK.Cdn, TOK.PEdn, TOK.UInvUp, TOK.Ydn, TOK.FFdn, TOK.rdn],

    // Price Level
    P_up: [TOK.Pup, TOK.FFup, TOK.rup, TOK.Idn, TOK.PEdn, TOK.UInvUp, TOK.Ydn],
    P_dn: [TOK.Pdn, TOK.FFdn, TOK.rdn, TOK.Iup, TOK.PEup, TOK.UInvDn, TOK.Yup],

    // Z
    Z_up: [TOK.Zup, TOK.FFup, TOK.rup, TOK.Idn, TOK.PEdn, TOK.UInvUp, TOK.Ydn],
    Z_dn: [TOK.Zdn, TOK.FFdn, TOK.rdn, TOK.Iup, TOK.PEup, TOK.UInvDn, TOK.Yup],

    // Consumption shocks
    C_up: [TOK.Cup, TOK.PEup, TOK.UInvDn, TOK.Yup, TOK.FFup, TOK.rup],
    C_dn: [TOK.Cdn, TOK.PEdn, TOK.UInvUp, TOK.Ydn, TOK.FFdn, TOK.rdn],

    // Investment shocks
    I_dn: [TOK.Idn, TOK.PEdn, TOK.UInvUp, TOK.Ydn, TOK.FFdn, TOK.rdn],
    I_up: [TOK.Iup, TOK.PEup, TOK.UInvDn, TOK.Yup, TOK.FFup, TOK.rup],
  };

  // Full labels for headings
  const PILL_GROUPS = [
    { name: "Government Purchases", pills: [TOK.Gup, TOK.Gdn] },
    { name: "Taxes", pills: [TOK.Tup, TOK.Tdn] },
    { name: "Consumption", pills: [TOK.Cup, TOK.Cdn] },
    { name: "Investment", pills: [TOK.Iup, TOK.Idn] },
    { name: "Price Level", pills: [TOK.Pup, TOK.Pdn] },
    { name: "Other Factors (Z)", pills: [TOK.Zup, TOK.Zdn] },
    { name: "Planned Expenditure", pills: [TOK.PEup, TOK.PEdn] },
    { name: "Unplanned Inventories", pills: [TOK.UInvUp, TOK.UInvDn] },
    { name: "Output", pills: [TOK.Yup, TOK.Ydn] },
    { name: "Federal Funds Rate", pills: [TOK.FFup, TOK.FFdn] },
    { name: "Interest Rate", pills: [TOK.rup, TOK.rdn] },
  ];

  const mechKeyFor = (varName, dir) => `${varName}_${dir === "up" ? "up" : "dn"}`;

  // -----------------------
  // Scenarios (headline format)
  // -----------------------
  const SCEN = [
    { var: "G", dir: "up", source: "Policy Desk", headline: "Spending bill passes in Congress", brief: "Federal purchases rise over the next quarter." },
    { var: "G", dir: "down", source: "Policy Desk", headline: "Spending cuts announced", brief: "Government purchases will be reduced to meet a budget target." },

    { var: "T", dir: "down", source: "Policy Desk", headline: "Tax cut approved", brief: "Households face lower taxes starting this month." },
    { var: "T", dir: "up", source: "Policy Desk", headline: "Tax increase scheduled", brief: "Higher taxes take effect to stabilize public finances." },

    { var: "C", dir: "up", source: "Household Survey", headline: "Consumer confidence jumps", brief: "Households report greater willingness to spend." },
    { var: "C", dir: "down", source: "Household Survey", headline: "Confidence weakens", brief: "Households become more cautious and cut spending." },

    { var: "I", dir: "up", source: "Business Pulse", headline: "Firms ramp up investment plans", brief: "Capital spending plans expand due to strong outlook." },
    { var: "I", dir: "down", source: "Business Pulse", headline: "Investment plans pulled back", brief: "Firms delay projects amid uncertainty." },

    { var: "P", dir: "up", source: "Inflation Watch", headline: "Inflation pressures intensify", brief: "Prices rise broadly across goods and services." },
    { var: "P", dir: "down", source: "Inflation Watch", headline: "Deflation appears", brief: "Prices fall across many categories (deflation)." },

    { var: "Z", dir: "up", source: "Policy Desk", headline: "Tariffs announced; uncertainty rises", brief: "Policy uncertainty rises; the Fed leans more cautious." },
    { var: "Z", dir: "down", source: "Financial Conditions", headline: "Financial stress eases", brief: "Credit conditions improve; the Fed feels less need to restrain activity." },
  ];

  function makeStamp() {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const d = days[Math.floor(Math.random() * days.length)];
    const m = months[Math.floor(Math.random() * months.length)];
    const day = 1 + Math.floor(Math.random() * 28);
    const hr = 7 + Math.floor(Math.random() * 6);
    const min = Math.random() < 0.5 ? "00" : "30";
    return `${d} ${m} ${day}, ${hr}:${min} AM`;
  }

  // -----------------------
  // DOM
  // -----------------------
  const els = {
    newBtn: $("newBtn"),
    resetBtn: $("resetBtn"),
    status: $("status"),
    scenarioDesc: $("scenarioDesc"),

    // predictions
    isAction: $("isAction"),
    isDir: $("isDir"),
    frAction: $("frAction"),
    frDir: $("frDir"),
    adAction: $("adAction"),
    adDir: $("adDir"),
    checkPredBtn: $("checkPredBtn"),
    whyPredBtn: $("whyPredBtn"),
    predStatus: $("predStatus"),

    // sliders
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

    // mechanism
    slots: $("slots"),
    poolGroups: $("poolGroups"),
    checkMechBtn: $("checkMechBtn"),
    clearMechBtn: $("clearMechBtn"),

    // NEW mechanism result elements (from your updated index)
    mechBadge: $("mechBadge"),
    mechMsg: $("mechMsg"),

    // canvases
    isfrCanvas: $("isfrCanvas"),
    adCanvas: $("adCanvas"),
  };

  // -----------------------
  // State
  // -----------------------
  let scenario = null;
  let slotsState = [];
  let mechOK = false;

  let predMade = false;
  let predCorrect = false;
  let revealed = false;

  let cur = { ...M.base };

  const baseEq = eqm(M.base.G, M.base.T, M.base.C, M.base.I, M.base.P, M.base.Z);
  const baseAD = buildADCurve({ G: M.base.G, T: M.base.T, C: M.base.C, I: M.base.I, Z: M.base.Z }, 60);

  // -----------------------
  // Status helpers
  // -----------------------
  const setStatus = (msg) => { if (els.status) els.status.textContent = msg; };
  const setPredStatus = (msg) => { if (els.predStatus) els.predStatus.textContent = msg || ""; };

  // Mechanism result badge + message
  function setMechResult(kind, msg) {
    if (!els.mechBadge || !els.mechMsg) return;

    if (!kind) {
      els.mechBadge.hidden = true;
      els.mechBadge.className = "mech-badge";
      els.mechBadge.textContent = "";
      els.mechMsg.textContent = msg || "";
      return;
    }

    els.mechBadge.hidden = false;
    els.mechBadge.className = "mech-badge " + (kind === "ok" ? "ok" : "bad");
    els.mechBadge.textContent = (kind === "ok") ? "Correct" : "Wrong";
    els.mechMsg.textContent = msg || "";
  }
  function clearMechResult() { setMechResult(null, ""); }

  // -----------------------
  // Sliders: lock/unlock
  // -----------------------
  function applyDefaultRanges() {
    const map = { G: els.Gslider, T: els.Tslider, C: els.Cslider, I: els.Islider, P: els.Pslider, Z: els.Zslider };
    for (const k of Object.keys(map)) {
      const sl = map[k];
      if (!sl) continue;
      const r = M.ranges[k];
      sl.min = String(r.min);
      sl.max = String(r.max);
      sl.step = String(r.step);
    }
  }

  function lockAllSliders() {
    [els.Gslider, els.Tslider, els.Cslider, els.Islider, els.Pslider, els.Zslider].forEach(sl => {
      if (sl) sl.disabled = true;
    });
  }

  function resetSlidersToBaseline() {
    cur = { ...M.base };
    if (els.Gslider) els.Gslider.value = String(M.base.G);
    if (els.Tslider) els.Tslider.value = String(M.base.T);
    if (els.Cslider) els.Cslider.value = String(M.base.C);
    if (els.Islider) els.Islider.value = String(M.base.I);
    if (els.Pslider) els.Pslider.value = String(M.base.P);
    if (els.Zslider) els.Zslider.value = String(M.base.Z);
  }

  function setSliderConstraint(sl, min, max) {
    if (!sl) return;
    sl.min = String(min);
    sl.max = String(max);
  }

  function unlockOnlyCorrectSlider() {
    lockAllSliders();
    applyDefaultRanges();
    resetSlidersToBaseline();
    updateReadouts();
    drawAll();

    if (!scenario || !predMade) return;

    const v = scenario.var;
    const dir = scenario.dir;
    const baseVal = M.base[v];

    const sliderMap = { G: els.Gslider, T: els.Tslider, C: els.Cslider, I: els.Islider, P: els.Pslider, Z: els.Zslider };
    const sl = sliderMap[v];
    if (!sl) return;

    sl.disabled = false;

    const min = Number(sl.min);
    const max = Number(sl.max);
    if (dir === "up") setSliderConstraint(sl, baseVal, max);
    else setSliderConstraint(sl, min, baseVal);

    sl.value = String(baseVal);
  }

  // -----------------------
  // Readouts
  // -----------------------
  function syncCurFromSliders() {
    if (els.Gslider) cur.G = Number(els.Gslider.value);
    if (els.Tslider) cur.T = Number(els.Tslider.value);
    if (els.Cslider) cur.C = Number(els.Cslider.value);
    if (els.Islider) cur.I = Number(els.Islider.value);
    if (els.Pslider) cur.P = Number(els.Pslider.value);
    if (els.Zslider) cur.Z = Number(els.Zslider.value);
  }

  function updateReadouts() {
    if (els.Gdisp) els.Gdisp.textContent = cur.G.toFixed(0);
    if (els.Tdisp) els.Tdisp.textContent = cur.T.toFixed(0);
    if (els.Cdisp) els.Cdisp.textContent = cur.C.toFixed(0);
    if (els.Idisp) els.Idisp.textContent = cur.I.toFixed(0);
    if (els.Pdisp) els.Pdisp.textContent = cur.P.toFixed(1);
    if (els.Zdisp) els.Zdisp.textContent = cur.Z.toFixed(1);
  }

  // -----------------------
  // Mechanism UI
  // -----------------------
  function makePill(token) {
    const d = document.createElement("div");
    d.className = "pill";
    d.textContent = token;
    d.draggable = true;
    d.dataset.tok = token;
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

      slot.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });

      slot.addEventListener("drop", (e) => {
        e.preventDefault();
        const tok = e.dataTransfer.getData("text/plain");
        if (!tok) return;
        slotsState[i] = tok;
        slot.classList.add("filled");
        slot.textContent = tok;
        clearMechResult();
      });

      slot.addEventListener("dblclick", () => {
        slotsState[i] = null;
        slot.classList.remove("filled");
        slot.textContent = "Drop";
        clearMechResult();
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
    clearMechResult();
  }

  function checkMechanism() {
    if (!scenario) { setMechResult("bad", "Click New Scenario first."); return; }
    const key = mechKeyFor(scenario.var, scenario.dir);
    const seq = MECH[key];
    if (!seq) { setMechResult("bad", "No mechanism defined."); return; }

    if (slotsState.some(v => v === null)) {
      setMechResult("bad", "Fill all blanks before checking.");
      mechOK = false;
      return;
    }

    mechOK = seq.every((t, i) => slotsState[i] === t);

    if (mechOK) {
      setMechResult("ok", "Nice. Your chain matches the scenario mechanism.");
    } else {
      setMechResult("bad", "Not quite. Try again—at least one step is out of order or incorrect.");
    }
  }

  // -----------------------
  // Prediction UI
  // -----------------------
  function fillOptions(selectEl, options) {
    selectEl.innerHTML = "";
    const first = document.createElement("option");
    first.value = "";
    first.textContent = "Direction…";
    selectEl.appendChild(first);
    for (const [val, label] of options) {
      const o = document.createElement("option");
      o.value = val;
      o.textContent = label;
      selectEl.appendChild(o);
    }
  }

  function updateDirOptions(curve) {
    if (curve === "IS") {
      const act = els.isAction.value || "";
      if (!act) return fillOptions(els.isDir, []);
      if (act === "shift") return fillOptions(els.isDir, [["right", "Right"], ["left", "Left"]]);
      return fillOptions(els.isDir, [["up", "Up along"], ["down", "Down along"]]);
    }
    if (curve === "FR") {
      const act = els.frAction.value || "";
      if (!act) return fillOptions(els.frDir, []);
      return fillOptions(els.frDir, [["up", "Up"], ["down", "Down"]]);
    }
    if (curve === "AD") {
      const act = els.adAction.value || "";
      if (!act) return fillOptions(els.adDir, []);
      if (act === "shift") return fillOptions(els.adDir, [["right", "Right"], ["left", "Left"]]);
      return fillOptions(els.adDir, [["up", "Up along"], ["down", "Down along"]]);
    }
  }

  function initPredictionUI() {
    els.isAction.addEventListener("change", () => updateDirOptions("IS"));
    els.frAction.addEventListener("change", () => updateDirOptions("FR"));
    els.adAction.addEventListener("change", () => updateDirOptions("AD"));
    updateDirOptions("IS"); updateDirOptions("FR"); updateDirOptions("AD");
  }

  function predComplete() {
    const vals = [
      els.isAction.value, els.isDir.value,
      els.frAction.value, els.frDir.value,
      els.adAction.value, els.adDir.value
    ];
    return vals.every(v => (v ?? "").trim() !== "");
  }

  function expectedPrediction(s) {
    const v = s.var, dir = s.dir;

    if (v === "G" || v === "C" || v === "I") {
      return {
        IS: { action: "shift", dir: dir === "up" ? "right" : "left" },
        FR: { action: "move",  dir: dir === "up" ? "up" : "down" },
        AD: { action: "shift", dir: dir === "up" ? "right" : "left" },
      };
    }
    if (v === "T") {
      return {
        IS: { action: "shift", dir: dir === "up" ? "left" : "right" },
        FR: { action: "move",  dir: dir === "up" ? "down" : "up" },
        AD: { action: "shift", dir: dir === "up" ? "left" : "right" },
      };
    }
    if (v === "P") {
      return {
        IS: { action: "move",  dir: dir === "up" ? "up" : "down" },
        FR: { action: "shift", dir: dir === "up" ? "up" : "down" },
        AD: { action: "move",  dir: dir === "up" ? "up" : "down" },
      };
    }
    // Z
    return {
      IS: { action: "move",  dir: dir === "up" ? "up" : "down" },
      FR: { action: "shift", dir: dir === "up" ? "up" : "down" },
      AD: { action: "shift", dir: dir === "up" ? "left" : "right" },
    };
  }

  function whyPredictionText(s) {
    const v = s.var, up = (s.dir === "up");
    let txt = "Big idea:\n";
    txt += "• IS shifts when planned spending changes at a given interest rate (G, T, C, I).\n";
    txt += "• FR shifts when the Fed wants a different r at each output level (P or Z).\n";
    txt += "• AD comes from IS–FR equilibrium: shifts in IS/FR shift AD; changes in P move along AD.\n\n";

    if (v === "G" || v === "C" || v === "I") {
      txt += `This scenario changes ${v}, changing planned expenditure.\n`;
      txt += `• IS shifts ${up ? "right" : "left"}.\n`;
      txt += "• FR does not shift; output changes so the economy moves along FR.\n";
      txt += `• Therefore AD shifts ${up ? "right" : "left"}.\n`;
    } else if (v === "T") {
      txt += "This scenario changes taxes, which changes consumption.\n";
      txt += `• T ${up ? "up" : "down"} → C ${up ? "down" : "up"} → IS shifts ${up ? "left" : "right"}.\n`;
      txt += "• FR does not shift; the equilibrium moves along FR.\n";
      txt += `• Therefore AD shifts ${up ? "left" : "right"}.\n`;
    } else if (v === "P") {
      txt += "This scenario is a change in the price level.\n";
      txt += `• P ${up ? "up" : "down"} shifts FR ${up ? "up" : "down"}.\n`;
      txt += "• IS does not shift; r changes move along IS.\n";
      txt += "• In (P,Y) space, changing P is a movement along AD.\n";
    } else {
      txt += "This scenario is a change in other policy considerations (Z).\n";
      txt += `• Z ${up ? "up" : "down"} shifts FR ${up ? "up" : "down"}.\n`;
      txt += "• IS does not shift; r changes move along IS.\n";
      txt += `• Therefore AD shifts ${up ? "left" : "right"}.\n`;
    }
    return txt;
  }

  function checkPrediction() {
    if (!scenario) { setPredStatus("Click New Scenario first."); return; }
    if (!predComplete()) {
      const missing = [];
      if (!els.isAction.value) missing.push("IS action");
      if (!els.isDir.value) missing.push("IS direction");
      if (!els.frAction.value) missing.push("FR action");
      if (!els.frDir.value) missing.push("FR direction");
      if (!els.adAction.value) missing.push("AD action");
      if (!els.adDir.value) missing.push("AD direction");
      setPredStatus("Answer all prediction dropdowns first. Missing: " + missing.join(", "));
      return;
    }

    const exp = expectedPrediction(scenario);
    const got = {
      IS: { action: els.isAction.value, dir: els.isDir.value },
      FR: { action: els.frAction.value, dir: els.frDir.value },
      AD: { action: els.adAction.value, dir: els.adDir.value },
    };

    const ok =
      got.IS.action === exp.IS.action && got.IS.dir === exp.IS.dir &&
      got.FR.action === exp.FR.action && got.FR.dir === exp.FR.dir &&
      got.AD.action === exp.AD.action && got.AD.dir === exp.AD.dir;

    predMade = true;
    predCorrect = ok;
    revealed = false;

    setPredStatus(ok
      ? "Checked. Correct. Now only the correct slider is unlocked (and only in the correct direction)."
      : "Checked. Not quite. Now only the correct slider is unlocked (and only in the correct direction) so you can see what actually changes."
    );

    unlockOnlyCorrectSlider();
    setStatus(ok ? "Prediction correct." : "Prediction checked.");
  }

  function whyPrediction() {
    if (!scenario) { setPredStatus("Click New Scenario first."); return; }
    setPredStatus(whyPredictionText(scenario));
  }

  // -----------------------
  // Reveal logic + slider handler
  // -----------------------
  function updateReveal() {
    if (revealed || !scenario || !predMade) return;
    const v = scenario.var;
    const dir = scenario.dir;
    const baseVal = M.base[v];
    const curVal = cur[v];
    if (dir === "up" && curVal > baseVal) revealed = true;
    if (dir === "down" && curVal < baseVal) revealed = true;
    if (revealed) setStatus("Revealed.");
  }

  function onSlider() {
    if (!predMade) return;
    syncCurFromSliders();
    updateReveal();
    updateReadouts();
    drawAll();
  }

  // -----------------------
  // Drawing helpers
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

  function drawLine(ctx, x1, y1, x2, y2, stroke, lw, dpr, dash = null) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw * dpr;
    ctx.setLineDash(dash ? dash.map(v => v * dpr) : []);
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
    drawLine(ctx, x1, y1, x2, y2, color, 2.5, dpr);
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

  function drawGrid(ctx, X0, X1, Y0, Y1, dpr) {
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
  }

  function drawISFR() {
    const { ctx, dpr, W, H } = getCtx(els.isfrCanvas);
    ctx.clearRect(0, 0, W, H);

    const pad = { l: 70*dpr, r: 18*dpr, t: 18*dpr, b: 60*dpr };
    const X0 = pad.l, X1 = W - pad.r;
    const Y0 = pad.t, Y1 = H - pad.b;

    const { Ymin, Ymax, rmin, rmax } = M.isfr;
    const xTo = (Y) => X0 + (Y - Ymin) / (Ymax - Ymin) * (X1 - X0);
    const yTo = (r) => Y0 + (rmax - r) / (rmax - rmin) * (Y1 - Y0);

    drawGrid(ctx, X0, X1, Y0, Y1, dpr);

    // labels
    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.font = `${12*dpr}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Output (Y)", (X0 + X1) / 2, Y1 + 22*dpr);

    ctx.save();
    ctx.translate(X0 - 52*dpr, (Y0 + Y1) / 2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Interest rate (r)", 0, 0);
    ctx.restore();

    const YL = Ymin, YR = Ymax;

    // baseline curves (grey)
    const isL0 = IS_r(YL, M.base.G, M.base.T, M.base.C, M.base.I);
    const isR0 = IS_r(YR, M.base.G, M.base.T, M.base.C, M.base.I);
    const frL0 = FR_r(YL, M.base.P, M.base.Z);
    const frR0 = FR_r(YR, M.base.P, M.base.Z);
    drawLine(ctx, xTo(YL), yTo(isL0), xTo(YR), yTo(isR0), "rgba(0,0,0,0.22)", 3, dpr);
    drawLine(ctx, xTo(YL), yTo(frL0), xTo(YR), yTo(frR0), "rgba(0,0,0,0.22)", 3, dpr);

    // baseline eq
    const x1p = xTo(baseEq.Y), y1p = yTo(baseEq.r);
    dot(ctx, x1p, y1p, "rgba(0,0,0,0.40)", dpr);
    drawLine(ctx, x1p, y1p, x1p, yTo(rmin), "rgba(0,0,0,0.30)", 2, dpr, [4, 6]);
    drawLine(ctx, x1p, y1p, xTo(Ymin), y1p, "rgba(0,0,0,0.30)", 2, dpr, [4, 6]);
    xTick(ctx, x1p, Y1, "Y₁", dpr);
    yTick(ctx, X0, y1p, "r₁", dpr);

    if (!revealed) return;

    // current curves (orange)
    const isL1 = IS_r(YL, cur.G, cur.T, cur.C, cur.I);
    const isR1 = IS_r(YR, cur.G, cur.T, cur.C, cur.I);
    const frL1 = FR_r(YL, cur.P, cur.Z);
    const frR1 = FR_r(YR, cur.P, cur.Z);
    drawLine(ctx, xTo(YL), yTo(isL1), xTo(YR), yTo(isR1), "rgba(230,159,0,0.95)", 3, dpr);
    drawLine(ctx, xTo(YL), yTo(frL1), xTo(YR), yTo(frR1), "rgba(230,159,0,0.95)", 3, dpr);

    const eq2 = eqm(cur.G, cur.T, cur.C, cur.I, cur.P, cur.Z);
    const x2p = xTo(eq2.Y), y2p = yTo(eq2.r);
    dot(ctx, x2p, y2p, "rgba(230,159,0,0.95)", dpr);
    drawLine(ctx, x2p, y2p, x2p, yTo(rmin), "rgba(0,0,0,0.30)", 2, dpr, [4, 6]);
    drawLine(ctx, x2p, y2p, xTo(Ymin), y2p, "rgba(0,0,0,0.30)", 2, dpr, [4, 6]);
    if (!approxEq(eq2.Y, baseEq.Y, 1e-6)) xTick(ctx, x2p, Y1, "Y₂", dpr);
    yTick(ctx, X0, y2p, "r₂", dpr);
    arrow(ctx, x1p, y1p, x2p, y2p, "rgba(230,159,0,0.95)", dpr);
  }

  function drawAD() {
    const { ctx, dpr, W, H } = getCtx(els.adCanvas);
    ctx.clearRect(0, 0, W, H);

    const pad = { l: 70*dpr, r: 18*dpr, t: 18*dpr, b: 60*dpr };
    const X0 = pad.l, X1 = W - pad.r;
    const Y0 = pad.t, Y1 = H - pad.b;

    const { Ymin, Ymax, Pmin, Pmax } = M.ad;
    const xTo = (Y) => X0 + (Y - Ymin) / (Ymax - Ymin) * (X1 - X0);
    const yTo = (P) => Y0 + (Pmax - P) / (Pmax - Pmin) * (Y1 - Y0);

    drawGrid(ctx, X0, X1, Y0, Y1, dpr);

    // labels
    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.font = `${12*dpr}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Output (Y)", (X0 + X1) / 2, Y1 + 22*dpr);

    ctx.save();
    ctx.translate(X0 - 52*dpr, (Y0 + Y1) / 2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Price level (P)", 0, 0);
    ctx.restore();

    // baseline AD curve
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    for (let i = 0; i < baseAD.length; i++) {
      const pt = baseAD[i];
      const x = xTo(pt.Y), y = yTo(pt.P);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // baseline point
    const x1p = xTo(baseEq.Y), y1p = yTo(M.base.P);
    dot(ctx, x1p, y1p, "rgba(0,0,0,0.40)", dpr);
    drawLine(ctx, x1p, y1p, x1p, yTo(Pmin), "rgba(0,0,0,0.30)", 2, dpr, [4, 6]);
    drawLine(ctx, x1p, y1p, xTo(Ymin), y1p, "rgba(0,0,0,0.30)", 2, dpr, [4, 6]);
    xTick(ctx, x1p, Y1, "Y₁", dpr);
    yTick(ctx, X0, y1p, "P₁", dpr);

    if (!revealed) return;

    // current AD curve (orange)
    const curAD = buildADCurve({ G: cur.G, T: cur.T, C: cur.C, I: cur.I, Z: cur.Z }, 60);
    ctx.strokeStyle = "rgba(230,159,0,0.95)";
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    for (let i = 0; i < curAD.length; i++) {
      const pt = curAD[i];
      const x = xTo(pt.Y), y = yTo(pt.P);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // new point
    const eq2 = eqm(cur.G, cur.T, cur.C, cur.I, cur.P, cur.Z);
    const x2p = xTo(eq2.Y), y2p = yTo(cur.P);
    dot(ctx, x2p, y2p, "rgba(230,159,0,0.95)", dpr);
    drawLine(ctx, x2p, y2p, x2p, yTo(Pmin), "rgba(0,0,0,0.30)", 2, dpr, [4, 6]);
    drawLine(ctx, x2p, y2p, xTo(Ymin), y2p, "rgba(0,0,0,0.30)", 2, dpr, [4, 6]);
    if (!approxEq(eq2.Y, baseEq.Y, 1e-6)) xTick(ctx, x2p, Y1, "Y₂", dpr);
    if (!approxEq(cur.P, M.base.P, 1e-6)) yTick(ctx, X0, y2p, "P₂", dpr);
    arrow(ctx, x1p, y1p, x2p, y2p, "rgba(230,159,0,0.95)", dpr);
  }

  function drawAll() {
    drawISFR();
    drawAD();
  }

  // -----------------------
  // Scenario / reset
  // -----------------------
  function setScenarioText(s) {
    els.scenarioDesc.textContent =
      `${s.stamp} • ${s.source}\n` +
      `${s.headline}\n` +
      `${s.brief}\n\n` +
      `Step 1: Build the mechanism.\n` +
      `Step 2: Make predictions for IS, FR, and AD, then click Check answers.\n` +
      `Step 3: Use the unlocked slider to reveal what happens.`;
  }

  function resetToBaseline() {
    applyDefaultRanges();
    resetSlidersToBaseline();
    updateReadouts();

    slotsState = [];
    mechOK = false;
    predMade = false;
    predCorrect = false;
    revealed = false;

    clearMechResult();
    setPredStatus("");

    els.isAction.value = "";
    els.frAction.value = "";
    els.adAction.value = "";
    updateDirOptions("IS"); updateDirOptions("FR"); updateDirOptions("AD");
    els.isDir.value = "";
    els.frDir.value = "";
    els.adDir.value = "";

    lockAllSliders();
    drawAll();
  }

  function resetAll() {
    scenario = null;
    resetToBaseline();
    els.scenarioDesc.textContent = "Click “New Scenario” to start.";
    els.slots.innerHTML = "";
    els.poolGroups.innerHTML = "";
    setStatus("Reset.");
    typeset(document.body);
  }

  function newScenario() {
    resetToBaseline();

    scenario = { ...SCEN[Math.floor(Math.random() * SCEN.length)], stamp: makeStamp() };
    setScenarioText(scenario);

    renderPoolGrouped();

    const key = mechKeyFor(scenario.var, scenario.dir);
    const seq = MECH[key];
    renderSlots(seq.length);

    setStatus("Scenario ready. Build the mechanism and make predictions.");
    typeset(document.body);
  }

  // -----------------------
  // Event wiring
  // -----------------------
  els.newBtn.addEventListener("click", newScenario);
  els.resetBtn.addEventListener("click", resetAll);

  els.checkMechBtn.addEventListener("click", checkMechanism);
  els.clearMechBtn.addEventListener("click", clearSlots);

  els.checkPredBtn.addEventListener("click", checkPrediction);
  els.whyPredBtn.addEventListener("click", whyPrediction);

  els.Gslider.addEventListener("input", onSlider);
  els.Tslider.addEventListener("input", onSlider);
  els.Cslider.addEventListener("input", onSlider);
  els.Islider.addEventListener("input", onSlider);
  els.Pslider.addEventListener("input", onSlider);
  els.Zslider.addEventListener("input", onSlider);

  window.addEventListener("resize", () => requestAnimationFrame(drawAll));

  // -----------------------
  // Init
  // -----------------------
  window.addEventListener("load", () => {
    applyDefaultRanges();
    initPredictionUI();
    resetAll();
    requestAnimationFrame(drawAll);
    setTimeout(drawAll, 120);
    typeset(document.body);
  });
})();
