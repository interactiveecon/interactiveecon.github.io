(() => {
  const $ = (id) => document.getElementById(id);

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
  // Model (simple linear IS–FR)
  // -----------------------
  const M = {
    isfr: { Ymin: 0, Ymax: 200, rmin: 0, rmax: 20 },
    ad:   { Ymin: 0, Ymax: 200, Pmin: 3, Pmax: 7 },

    base: { G: 100, T: 100, P: 5, Z: 5 },

    // IS: r = aIS - bIS*Y + gG*(G-G0) - gT*(T-T0)
    IS: { aIS: 16, bIS: 0.06, gG: 0.05, gT: 0.05 },

    // FR: r = aFR + bFR*Y + hP*(P-P0) + hZ*(Z-Z0)
    FR: { aFR: 2, bFR: 0.04, hP: 1.8, hZ: 1.8 },

    mags: {
      G: [8, 12, 16],
      T: [8, 12, 16],
      P: [0.4, 0.6, 0.8],
      Z: [0.4, 0.6, 0.8]
    }
  };

  function eqm(G, T, P, Z) {
    const { aIS, bIS, gG, gT } = M.IS;
    const { aFR, bFR, hP, hZ } = M.FR;
    const { G: G0, T: T0, P: P0, Z: Z0 } = M.base;

    const s = gG * (G - G0) - gT * (T - T0);
    const t = hP * (P - P0) + hZ * (Z - Z0);

    const denom = (bIS + bFR);
    let Y = (aIS + s - aFR - t) / denom;
    Y = Math.max(M.isfr.Ymin, Math.min(M.isfr.Ymax, Y));
    const r = aFR + bFR * Y + t;
    return { Y, r };
  }

  function IS_r(Y, G, T) {
    const { aIS, bIS, gG, gT } = M.IS;
    const { G: G0, T: T0 } = M.base;
    return aIS - bIS * Y + gG*(G - G0) - gT*(T - T0);
  }
  function FR_r(Y, P, Z) {
    const { aFR, bFR, hP, hZ } = M.FR;
    const { P: P0, Z: Z0 } = M.base;
    return aFR + bFR * Y + hP*(P - P0) + hZ*(Z - Z0);
  }

  function buildADCurve({ G, T, Z }, n = 50) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const P = M.ad.Pmin + (M.ad.Pmax - M.ad.Pmin) * (i / n);
      const { Y } = eqm(G, T, P, Z);
      pts.push({ Y, P });
    }
    return pts;
  }

  // -----------------------
  // Tokens & mechanisms
  // -----------------------
  const TOK = {
    Gup: "G↑", Gdn: "G↓",
    Tup: "T↑", Tdn: "T↓",
    Pup: "P↑", Pdn: "P↓",
    Zup: "Z↑", Zdn: "Z↓",
    Cup: "C↑", Cdn: "C↓",
    Iup: "I↑", Idn: "I↓",
    PEup:"PE↑", PEdn:"PE↓",
    FFup:"FF↑", FFdn:"FF↓",
    rup: "r↑", rdn:"r↓",
    Yup: "Y↑", Ydn:"Y↓",
    UInvUp:"Unplanned Inventories↑", UInvDn:"Unplanned Inventories↓"
  };

  const MECH = {
    "G_up": [TOK.Gup, TOK.PEup, TOK.UInvDn, TOK.Yup, TOK.FFup, TOK.rup],
    "G_dn": [TOK.Gdn, TOK.PEdn, TOK.UInvUp, TOK.Ydn, TOK.FFdn, TOK.rdn],

    "T_dn": [TOK.Tdn, TOK.Cup, TOK.PEup, TOK.UInvDn, TOK.Yup, TOK.FFup, TOK.rup],
    "T_up": [TOK.Tup, TOK.Cdn, TOK.PEdn, TOK.UInvUp, TOK.Ydn, TOK.FFdn, TOK.rdn],

    "P_up": [TOK.Pup, TOK.FFup, TOK.rup, TOK.Idn, TOK.PEdn, TOK.UInvUp, TOK.Ydn],
    "P_dn": [TOK.Pdn, TOK.FFdn, TOK.rdn, TOK.Iup, TOK.PEup, TOK.UInvDn, TOK.Yup],

    "Z_up": [TOK.Zup, TOK.FFup, TOK.rup, TOK.Idn, TOK.PEdn, TOK.UInvUp, TOK.Ydn],
    "Z_dn": [TOK.Zdn, TOK.FFdn, TOK.rdn, TOK.Iup, TOK.PEup, TOK.UInvDn, TOK.Yup],
  };

  // Grouped pill pool (no shuffle)
  const PILL_GROUPS = [
    { name: "G", pills: [TOK.Gup, TOK.Gdn] },
    { name: "T", pills: [TOK.Tup, TOK.Tdn] },
    { name: "P", pills: [TOK.Pup, TOK.Pdn] },
    { name: "Z", pills: [TOK.Zup, TOK.Zdn] },
    { name: "C", pills: [TOK.Cup, TOK.Cdn] },
    { name: "I", pills: [TOK.Iup, TOK.Idn] },
    { name: "Planned Expenditure", pills: [TOK.PEup, TOK.PEdn] },
    { name: "Unplanned Inventories", pills: [TOK.UInvUp, TOK.UInvDn] },
    { name: "Output", pills: [TOK.Yup, TOK.Ydn] },
    { name: "Federal Funds", pills: [TOK.FFup, TOK.FFdn] },
    { name: "Interest rate", pills: [TOK.rup, TOK.rdn] },
  ];

  // -----------------------
  // News scenarios
  // -----------------------
  const SCEN = [
    { var:"G", dir:"up", source:"Policy Desk", headline:"Spending bill passes in Congress", brief:"Federal purchases rise over the next quarter." },
    { var:"G", dir:"down", source:"Policy Desk", headline:"Spending cuts announced", brief:"Government purchases will be reduced to meet a budget target." },
    { var:"T", dir:"down", source:"Policy Desk", headline:"Tax cut approved", brief:"Households face lower taxes starting this month." },
    { var:"T", dir:"up", source:"Policy Desk", headline:"Tax increase scheduled", brief:"Higher taxes take effect to stabilize public finances." },
    { var:"P", dir:"up", source:"Inflation Watch", headline:"Inflation pressures intensify", brief:"Prices rise broadly across goods and services." },
    { var:"P", dir:"down", source:"Inflation Watch", headline:"Deflation appears", brief:"Prices fall across many categories (deflation)." },
    { var:"Z", dir:"up", source:"Policy Desk", headline:"Tariffs announced; uncertainty rises", brief:"Wide-ranging tariffs increase uncertainty; the Fed leans more cautious." },
    { var:"Z", dir:"down", source:"Financial Conditions", headline:"Financial stress eases", brief:"Credit conditions improve; the Fed feels less need to restrain activity." },
    { var:"G", dir:"up", source:"Policy Desk", headline:"Infrastructure program accelerates", brief:"Public spending ramps up quickly." },
    { var:"T", dir:"up", source:"Policy Desk", headline:"Temporary surcharge added", brief:"Taxes rise to fund emergency spending." },
    { var:"P", dir:"up", source:"Inflation Watch", headline:"Energy costs surge", brief:"Higher energy prices raise overall prices." },
    { var:"Z", dir:"up", source:"Financial Conditions", headline:"Asset markets look overheated", brief:"The Fed leans more hawkish due to financial stability concerns." },
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
  // DOM / State
  // -----------------------
  const els = {
    newBtn: $("newBtn"),
    resetBtn: $("resetBtn"),
    status: $("status"),
    scenarioDesc: $("scenarioDesc"),

    Gslider: $("Gslider"), Tslider: $("Tslider"), Pslider: $("Pslider"), Zslider: $("Zslider"),
    Gdisp: $("Gdisp"), Tdisp: $("Tdisp"), Pdisp: $("Pdisp"), Zdisp: $("Zdisp"),

    Y1pill: $("Y1pill"), r1pill: $("r1pill"), Ppill: $("Ppill"),
    Ycurpill: $("Ycurpill"), rcurpill: $("rcurpill"),

    slots: $("slots"),
    poolGroups: $("poolGroups"),
    mechStatus: $("mechStatus"),
    checkMechBtn: $("checkMechBtn"),
    clearMechBtn: $("clearMechBtn"),

    isfrCanvas: $("isfrCanvas"),
    adCanvas: $("adCanvas"),
  };

  if (!els.isfrCanvas || !els.adCanvas) return;

  let scenario = null;
  let mechOK = false;
  let revealed = false;
  let slotsState = [];
  let cur = { ...M.base };

  const baseEq = eqm(M.base.G, M.base.T, M.base.P, M.base.Z);
  const baseAD = buildADCurve({ G: M.base.G, T: M.base.T, Z: M.base.Z }, 60);

  // -----------------------
  // Mechanism UI
  // -----------------------
  function setStatus(msg) { els.status.textContent = msg; }

  function updateMechStatus(msg) { els.mechStatus.textContent = msg || ""; }

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
        updateMechStatus("");
      });
      slot.addEventListener("dblclick", () => {
        slotsState[i] = null;
        slot.classList.remove("filled");
        slot.textContent = "Drop";
        updateMechStatus("");
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
    const children = Array.from(els.slots.querySelectorAll(".slot"));
    for (const s of children) {
      const idx = Number(s.dataset.idx);
      slotsState[idx] = null;
      s.classList.remove("filled");
      s.textContent = "Drop";
    }
    updateMechStatus("");
  }

  function getMechKey(s) {
    if (!s) return null;
    if (s.var === "G") return s.dir === "up" ? "G_up" : "G_dn";
    if (s.var === "T") return s.dir === "up" ? "T_up" : "T_dn";
    if (s.var === "P") return s.dir === "up" ? "P_up" : "P_dn";
    if (s.var === "Z") return s.dir === "up" ? "Z_up" : "Z_dn";
    return null;
  }

  function checkMechanism() {
    if (!scenario) { updateMechStatus("Click New Scenario first."); return; }
    const key = getMechKey(scenario);
    const seq = MECH[key];
    if (!seq) { updateMechStatus("No mechanism defined."); return; }

    if (slotsState.some(v => v === null)) {
      updateMechStatus("Fill all blanks before checking.");
      mechOK = false;
      return;
    }
    mechOK = seq.every((t,i)=> slotsState[i] === t);
    updateMechStatus(mechOK
      ? "Correct."
      : "Not quite. Try again."
    );
    setStatus(mechOK ? "Mechanism correct." : "Mechanism not correct.");
  }

  // -----------------------
  // Reveal logic (any time, independent of mech)
  // -----------------------
  function correctSliderMovedInCorrectDirection() {
    if (!scenario) return false;
    const { var: v, dir } = scenario;
    if (v === "G") return dir === "up" ? cur.G > M.base.G : cur.G < M.base.G;
    if (v === "T") return dir === "up" ? cur.T > M.base.T : cur.T < M.base.T;
    if (v === "P") return dir === "up" ? cur.P > M.base.P : cur.P < M.base.P;
    if (v === "Z") return dir === "up" ? cur.Z > M.base.Z : cur.Z < M.base.Z;
    return false;
  }

  function updateReveal() {
    if (revealed) return;
    if (scenario && correctSliderMovedInCorrectDirection()) {
      revealed = true;
      setStatus("Revealed.");
    }
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
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
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
    const isL0 = IS_r(YL, M.base.G, M.base.T), isR0 = IS_r(YR, M.base.G, M.base.T);
    const frL0 = FR_r(YL, M.base.P, M.base.Z), frR0 = FR_r(YR, M.base.P, M.base.Z);

    drawLine(ctx, xTo(YL), yTo(isL0), xTo(YR), yTo(isR0), "rgba(0,0,0,0.22)", 3, dpr);
    drawLine(ctx, xTo(YL), yTo(frL0), xTo(YR), yTo(frR0), "rgba(0,0,0,0.22)", 3, dpr);

    // baseline equilibrium
    const x1p = xTo(baseEq.Y), y1p = yTo(baseEq.r);
    dot(ctx, x1p, y1p, "rgba(0,0,0,0.40)", dpr);
    drawLine(ctx, x1p, y1p, x1p, yTo(rmin), "rgba(0,0,0,0.30)", 2, dpr, [4,6]);
    drawLine(ctx, x1p, y1p, xTo(Ymin), y1p, "rgba(0,0,0,0.30)", 2, dpr, [4,6]);
    xTick(ctx, x1p, Y1, "Y₁", dpr);
    yTick(ctx, X0, y1p, "r₁", dpr);

    // current curves always shown (sliders always active)
    const isL1 = IS_r(YL, cur.G, cur.T), isR1 = IS_r(YR, cur.G, cur.T);
    const frL1 = FR_r(YL, cur.P, cur.Z), frR1 = FR_r(YR, cur.P, cur.Z);
    drawLine(ctx, xTo(YL), yTo(isL1), xTo(YR), yTo(isR1), "rgba(230,159,0,0.95)", 3, dpr);
    drawLine(ctx, xTo(YL), yTo(frL1), xTo(YR), yTo(frR1), "rgba(230,159,0,0.95)", 3, dpr);

    // equilibrium 2 shown only after reveal
    if (revealed) {
      const eq2 = eqm(cur.G, cur.T, cur.P, cur.Z);
      const x2p = xTo(eq2.Y), y2p = yTo(eq2.r);
      dot(ctx, x2p, y2p, "rgba(230,159,0,0.95)", dpr);
      drawLine(ctx, x2p, y2p, x2p, yTo(rmin), "rgba(0,0,0,0.30)", 2, dpr, [4,6]);
      drawLine(ctx, x2p, y2p, xTo(Ymin), y2p, "rgba(0,0,0,0.30)", 2, dpr, [4,6]);
      if (Math.abs(eq2.Y - baseEq.Y) > 1e-6) xTick(ctx, x2p, Y1, "Y₂", dpr);
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

    // current AD curve always shown (orange) as if G/T/Z shift it (for visualization)
    const curAD = buildADCurve({ G: cur.G, T: cur.T, Z: cur.Z }, 60);
    ctx.strokeStyle = "rgba(230,159,0,0.95)";
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    for (let i=0;i<curAD.length;i++){
      const pt = curAD[i];
      const x = xTo(pt.Y), y = yTo(pt.P);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    // equilibrium point 2 only after reveal (to keep the "reveal" meaningful)
    if (revealed) {
      const eq2 = eqm(cur.G, cur.T, cur.P, cur.Z);
      const x2p = xTo(eq2.Y), y2p = yTo(cur.P);
      dot(ctx, x2p, y2p, "rgba(230,159,0,0.95)", dpr);
      drawLine(ctx, x2p, y2p, x2p, yTo(Pmin), "rgba(0,0,0,0.30)", 2, dpr, [4,6]);
      drawLine(ctx, x2p, y2p, xTo(Ymin), y2p, "rgba(0,0,0,0.30)", 2, dpr, [4,6]);
      if (Math.abs(eq2.Y - baseEq.Y) > 1e-6) xTick(ctx, x2p, Y1, "Y₂", dpr);
      yTick(ctx, X0, y2p, "P₂", dpr);
      arrow(ctx, x1p, y1p, x2p, y2p, "rgba(230,159,0,0.95)", dpr);
    }
  }

  function drawAll() {
    drawISFR();
    drawAD();
  }

  // -----------------------
  // UI
  // -----------------------
  function syncCurFromSliders() {
    cur.G = Number(els.Gslider.value);
    cur.T = Number(els.Tslider.value);
    cur.P = Number(els.Pslider.value);
    cur.Z = Number(els.Zslider.value);
  }

  function updateReadouts() {
    els.Gdisp.textContent = cur.G.toFixed(0);
    els.Tdisp.textContent = cur.T.toFixed(0);
    els.Pdisp.textContent = cur.P.toFixed(1);
    els.Zdisp.textContent = cur.Z.toFixed(1);

    const eqNow = eqm(cur.G, cur.T, cur.P, cur.Z);
    els.Y1pill.textContent = baseEq.Y.toFixed(1);
    els.r1pill.textContent = baseEq.r.toFixed(2);
    els.Ppill.textContent = M.base.P.toFixed(1);
    els.Ycurpill.textContent = eqNow.Y.toFixed(1);
    els.rcurpill.textContent = eqNow.r.toFixed(2);
  }

  function setScenarioText(s) {
    els.scenarioDesc.textContent =
      `${s.stamp} • ${s.source}\n` +
      `${s.headline}\n` +
      `${s.brief}\n\n` +
      `Build the mechanism, then move the slider that matches the scenario in the correct direction to reveal the highlighted change.`;
  }

  function resetToBaseline() {
    cur = { ...M.base };
    els.Gslider.value = String(M.base.G);
    els.Tslider.value = String(M.base.T);
    els.Pslider.value = String(M.base.P);
    els.Zslider.value = String(M.base.Z);

    mechOK = false;
    revealed = false;
    updateMechStatus("");
    updateReadouts();
    drawAll();
  }

  function newScenario() {
    resetToBaseline();
    renderPoolGrouped();

    const s0 = SCEN[Math.floor(Math.random()*SCEN.length)];
    scenario = { ...s0, stamp: makeStamp() };

    const key = getMechKey(scenario);
    const seq = MECH[key];
    renderSlots(seq.length);
    setScenarioText(scenario);

    setStatus("Scenario ready.");
    typeset(document.body);
  }

  function resetAll() {
    scenario = null;
    resetToBaseline();
    els.scenarioDesc.textContent = "Click “New Scenario” to start.";
    els.slots.innerHTML = "";
    els.poolGroups.innerHTML = "";
    updateMechStatus("");
    setStatus("Reset.");
    typeset(document.body);
  }

  // Slider input handler: graphs always move
  function onSlider() {
    syncCurFromSliders();
    updateReadouts();
    updateReveal();   // if scenario exists and correct direction moved, reveal turns on
    drawAll();
  }

  // -----------------------
  // Events
  // -----------------------
  els.newBtn.addEventListener("click", newScenario);
  els.resetBtn.addEventListener("click", resetAll);

  els.checkMechBtn.addEventListener("click", checkMechanism);
  els.clearMechBtn.addEventListener("click", clearSlots);

  els.Gslider.addEventListener("input", onSlider);
  els.Tslider.addEventListener("input", onSlider);
  els.Pslider.addEventListener("input", onSlider);
  els.Zslider.addEventListener("input", onSlider);

  window.addEventListener("resize", () => requestAnimationFrame(drawAll));

  // Init
  window.addEventListener("load", () => {
    resetAll();
    requestAnimationFrame(drawAll);
    setTimeout(drawAll, 120);
    typeset(document.body);
  });
})();
