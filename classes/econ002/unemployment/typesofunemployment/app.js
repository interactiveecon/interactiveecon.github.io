window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);
  const missing = [];
  const must = (id) => { const el = $(id); if (!el) missing.push(id); return el; };

  const els = {
    zoneStaging: must("zoneStaging"),
    zoneFrictional: must("zoneFrictional"),
    zoneStructural: must("zoneStructural"),
    zoneCyclical: must("zoneCyclical"),

    newRoundBtn: must("newRoundBtn"),
    resetBtn: must("resetBtn"),
    status: must("status"),

    checkBtn: must("checkBtn"),
    checkMsg: must("checkMsg"),

    m_LF: must("m_LF"),
    m_E: must("m_E"),
    m_U: must("m_U"),
    m_u: must("m_u"),
    m_ustar: must("m_ustar"),
    m_ucyc: must("m_ucyc"),

    growthChart: must("growthChart"),
    uChart: must("uChart"),

    qSlider: must("qSlider"),
    qLabel: must("qLabel"),
    gVal: must("gVal"),
    recessionBtn: must("recessionBtn"),
    expansionBtn: must("expansionBtn"),
    resetCycleBtn: must("resetCycleBtn"),
    cycleNote: must("cycleNote"),
  };

  function setStatus(msg){ els.status.textContent = msg; }
  function fmtPct(x){ return (100*x).toFixed(2) + "%"; }

  if (missing.length){
    console.error("Missing element IDs:", missing);
    if (els.status) els.status.textContent = `Missing IDs: ${missing.join(", ")}`;
    return;
  }

  // ---- Templates ----
  const TEMPLATES = [
    // frictional
    { type:"FRIC", text:"Quit a job to search for a better match in the same city." },
    { type:"FRIC", text:"Recent graduate searching for a first job." },
    { type:"FRIC", text:"Moved to a new city and is searching for work." },
    { type:"FRIC", text:"Seasonal worker between seasonal jobs and actively searching." },
    { type:"FRIC", text:"Left a job and is comparing offers/interviewing." },

    // structural
    { type:"STRU", text:"Factory closes due to automation; workers need new skills." },
    { type:"STRU", text:"Coal industry declines; workers must retrain for other sectors." },
    { type:"STRU", text:"Demand shifts from retail to e-commerce; store workers displaced." },
    { type:"STRU", text:"Workers in a shrinking region struggle to find local jobs." },
    { type:"STRU", text:"Licensing requirements block switching into a growing occupation." },

    // cyclical (classification practice; counts evolve in recessions)
    { type:"CYC", text:"Sales fall; firms lay off workers broadly." },
    { type:"CYC", text:"Restaurants cut staff after a decline in consumer spending." },
    { type:"CYC", text:"A downturn reduces exports; manufacturers lay off workers." },
    { type:"CYC", text:"Hiring freezes spread during a recession." },
    { type:"CYC", text:"Construction layoffs rise when spending falls sharply." },
  ];

  // ---- State ----
  let cards = [];
  let nextId = 1;

  // Fixed labor force each round
  let LF = 1200;

  // Business cycle: growth rate of output (%)
  const T = 12;
  let g = new Array(T).fill(2.0); // start neutral at 2
  let tCur = 0;

  const G_STAR = 2.0;

  // Mapping strengths
  const KAPPA_REC = 0.020; // recession: (2 - g)=2pp -> cyclical rate 4%
  const KAPPA_EXP = 0.015; // expansion: (g - 2)=2pp -> absorb 3% of LF from frictional

  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }
  function drawPeople(){ return 6 + Math.floor(Math.random()*23); } // 6..28

  function makeCard(tpl){
    const base = (tpl.type === "CYC") ? 0 : drawPeople(); // cyc start 0 at neutral
    return {
      id: "c" + (nextId++),
      text: tpl.text,
      correct: tpl.type,    // FRIC | STRU | CYC
      zone: "STAGE",
      checked: null,
      baselinePeople: base,
      people: base,
      // per-round cyc weight so cyc cards change by different amounts
      cycWeight: (tpl.type === "CYC") ? (0.6 + Math.random()*1.8) : 0
    };
  }

  // Ensure at least one cyclical card exists (in staging). It will be moved into CYC automatically if needed.
  function ensureCycCarrierExists(){
    let carrier = cards.find(c => c.isCycleCarrier === true);
    if (carrier) return carrier;

    carrier = {
      id: "c" + (nextId++),
      text: "Economy-wide layoffs due to weak demand (cycle).",
      correct: "CYC",
      zone: "STAGE",
      checked: null,
      baselinePeople: 0,
      people: 0,
      cycWeight: 2.5,
      isCycleCarrier: true
    };
    cards.push(carrier);
    return carrier;
  }

  function setupDropzone(zoneEl){
    zoneEl.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      zoneEl.classList.add("dragover");
    });
    zoneEl.addEventListener("dragleave", () => zoneEl.classList.remove("dragover"));
    zoneEl.addEventListener("drop", (ev) => {
      ev.preventDefault();
      zoneEl.classList.remove("dragover");
      const id = ev.dataTransfer.getData("text/plain");
      const z = zoneEl.dataset.zone;
      const c = cards.find(x => x.id === id);
      if (!c) return;
      c.zone = z;
      c.checked = null;
      els.checkMsg.textContent = "";
      renderZones();
      recomputeAll();
    });
  }

  setupDropzone(els.zoneStaging);
  setupDropzone(els.zoneFrictional);
  setupDropzone(els.zoneStructural);
  setupDropzone(els.zoneCyclical);

  function renderZones(){
    els.zoneStaging.innerHTML = "";
    els.zoneFrictional.innerHTML = "";
    els.zoneStructural.innerHTML = "";
    els.zoneCyclical.innerHTML = "";

    for (const c of cards){
      const el = document.createElement("div");
      el.className = "card";
      if (c.checked === true) el.classList.add("ok");
      if (c.checked === false) el.classList.add("bad");

      el.draggable = true;
      el.dataset.cardId = c.id;

      const showBaselineLine = (c.zone === "FRIC" && c.correct === "FRIC");
      const baselineLine = showBaselineLine ? `<div class="baselineLine">baseline: ${c.baselinePeople}</div>` : "";

      el.innerHTML = `
        <div class="badge">${c.people} people</div>
        ${baselineLine}
        <div class="desc">${c.text}</div>
      `;

      el.addEventListener("dragstart", (ev) => {
        ev.dataTransfer.setData("text/plain", c.id);
        ev.dataTransfer.effectAllowed = "move";
      });

      const zoneEl =
        (c.zone === "STAGE") ? els.zoneStaging :
        (c.zone === "FRIC") ? els.zoneFrictional :
        (c.zone === "STRU") ? els.zoneStructural :
        els.zoneCyclical;

      zoneEl.appendChild(el);
    }
  }

  // baseline (not current) for F and S define natural unemployment
  function baselineFSPlaced(){
    let F0 = 0, S0 = 0;
    const fricCards = [];
    const struCards = [];

    for (const c of cards){
      if (c.zone === "FRIC" && c.correct === "FRIC"){
        F0 += c.baselinePeople;
        fricCards.push(c);
      } else if (c.zone === "STRU" && c.correct === "STRU"){
        S0 += c.baselinePeople;
        struCards.push(c);
      }
    }
    return {F0, S0, fricCards, struCards};
  }

  // Allocate integer totals across cards proportionally
  function allocateProportional(cardsList, total, getW){
    const out = new Map();
    if (cardsList.length === 0) return out;

    const W = cardsList.reduce((s,c)=> s + getW(c), 0);
    if (W <= 0){
      for (let i=0;i<cardsList.length;i++) out.set(cardsList[i].id, 0);
      out.set(cardsList[cardsList.length-1].id, total);
      return out;
    }

    let assigned = 0;
    for (let i=0;i<cardsList.length;i++){
      const c = cardsList[i];
      let v;
      if (i === cardsList.length - 1){
        v = total - assigned;
      } else {
        v = Math.floor(total * (getW(c)/W));
      }
      assigned += v;
      out.set(c.id, v);
    }
    return out;
  }

  // ---- Cycle drawing (growth) ----
  function drawGrowth(){
    const canvas = els.growthChart;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    if (canvas.width !== w || canvas.height !== h){
      canvas.width = w; canvas.height = h;
    }
    ctx.clearRect(0,0,w,h);

    const pad = {l: 44*dpr, r: 12*dpr, t: 14*dpr, b: 28*dpr};
    const X0 = pad.l, X1 = w - pad.r;
    const Y0 = pad.t, Y1 = h - pad.b;

    const yMin = -4, yMax = 6;
    const yToPix = (y) => Y0 + (yMax - y) * (Y1 - Y0) / (yMax - yMin);
    const xToPix = (i) => X0 + i * (X1 - X0) / (T-1);

    const ticks = [-4,-2,0,2,4,6];
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1*dpr;
    for (const y of ticks){
      const py = yToPix(y);
      ctx.beginPath(); ctx.moveTo(X0,py); ctx.lineTo(X1,py); ctx.stroke();
    }

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const y of ticks){
      ctx.fillText(String(y), X0 - 8*dpr, yToPix(y));
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i=0;i<T;i+=2){
      ctx.fillText(`Q${i+1}`, xToPix(i), Y1 + 6*dpr);
    }

    // trend line at 2%
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 2*dpr;
    ctx.beginPath();
    ctx.moveTo(X0, yToPix(G_STAR));
    ctx.lineTo(X1, yToPix(G_STAR));
    ctx.stroke();

    // series
    ctx.strokeStyle = "rgba(31,119,180,0.85)";
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    for (let i=0;i<T;i++){
      const px = xToPix(i), py = yToPix(g[i]);
      if (i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.stroke();

    // points
    ctx.fillStyle = "rgba(31,119,180,0.85)";
    for (let i=0;i<T;i++){
      const px = xToPix(i), py = yToPix(g[i]);
      ctx.beginPath(); ctx.arc(px,py,3.5*dpr,0,Math.PI*2); ctx.fill();
    }

    // highlight current quarter
    const hx = xToPix(tCur), hy = yToPix(g[tCur]);
    ctx.fillStyle = "rgba(230,159,0,0.95)";
    ctx.beginPath(); ctx.arc(hx,hy,6.5*dpr,0,Math.PI*2); ctx.fill();

    // title
    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.font = `${13*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Growth rate of output (%)", X0, 0);
  }

  // ---- Unemployment chart (u and u*) ----
  function drawUChart(uSeries, uStar){
    const canvas = els.uChart;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    if (canvas.width !== w || canvas.height !== h){
      canvas.width = w; canvas.height = h;
    }
    ctx.clearRect(0,0,w,h);

    const pad = {l: 44*dpr, r: 12*dpr, t: 14*dpr, b: 28*dpr};
    const X0 = pad.l, X1 = w - pad.r;
    const Y0 = pad.t, Y1 = h - pad.b;

    const maxU = Math.max(...uSeries, uStar);
    const yMax = Math.min(0.25, Math.max(0.08, maxU + 0.03));
    const yMin = 0;

    const yToPix = (y) => Y0 + (yMax - y) * (Y1 - Y0) / (yMax - yMin);
    const xToPix = (i) => X0 + i * (X1 - X0) / (T-1);

    // y ticks at 0, 5, 10, 15, 20% (depending on yMax)
    const tickPcts = [0,0.05,0.10,0.15,0.20,0.25].filter(v => v <= yMax + 1e-9);
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1*dpr;
    for (const y of tickPcts){
      const py = yToPix(y);
      ctx.beginPath(); ctx.moveTo(X0,py); ctx.lineTo(X1,py); ctx.stroke();
    }

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const y of tickPcts){
      ctx.fillText(`${Math.round(y*100)}%`, X0 - 8*dpr, yToPix(y));
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i=0;i<T;i+=2){
      ctx.fillText(`Q${i+1}`, xToPix(i), Y1 + 6*dpr);
    }

    // u* line (grey)
    ctx.strokeStyle = "rgba(0,0,0,0.30)";
    ctx.lineWidth = 2*dpr;
    ctx.beginPath();
    ctx.moveTo(X0, yToPix(uStar));
    ctx.lineTo(X1, yToPix(uStar));
    ctx.stroke();

    // u series (blue)
    ctx.strokeStyle = "rgba(31,119,180,0.85)";
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    for (let i=0;i<T;i++){
      const px = xToPix(i), py = yToPix(uSeries[i]);
      if (i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.stroke();

    // current points
    const hx = xToPix(tCur);
    const pyU = yToPix(uSeries[tCur]);
    const pyStar = yToPix(uStar);

    // dot on u
    ctx.fillStyle = "rgba(230,159,0,0.95)";
    ctx.beginPath(); ctx.arc(hx, pyU, 6.2*dpr, 0, Math.PI*2); ctx.fill();

    // dot on u*
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath(); ctx.arc(hx, pyStar, 5.2*dpr, 0, Math.PI*2); ctx.fill();

    // vertical gap bracket and label
    const top = Math.min(pyU, pyStar);
    const bot = Math.max(pyU, pyStar);

    ctx.strokeStyle = "rgba(230,159,0,0.90)";
    ctx.lineWidth = 3*dpr;
    ctx.beginPath(); ctx.moveTo(hx, top); ctx.lineTo(hx, bot); ctx.stroke();

    // label
    const gap = uSeries[tCur] - uStar; // cyclical rate
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const labelY = (top + bot)/2;
    const labelX = Math.min(X1 - 140*dpr, hx + 10*dpr);
    ctx.fillText(`cyclical: ${(gap*100).toFixed(2)} pp`, labelX, labelY);

    // title
    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.font = `${13*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Unemployment rate u and natural rate u*", X0, 0);
  }

  function resetCycle(){
    g = new Array(T).fill(G_STAR); // neutral everywhere
    tCur = 0;
    els.qSlider.value = "0";
    drawGrowth();
  }

  function applyShock(kind){
    const amp = (kind === "recession")
      ? -(1.4 + Math.random()*2.0)
      : +(1.0 + Math.random()*1.8);
    const len = 5;

    for (let j=0;j<len;j++){
      const t = tCur + j;
      if (t >= T) break;
      const w = Math.sin((Math.PI * (j+1)) / (len+1));
      g[t] = clamp(g[t] + amp*w, -4, 6);
    }
    drawGrowth();
  }

  function allocateProportional(cardsList, total, getW){
    const out = new Map();
    if (cardsList.length === 0) return out;
    const W = cardsList.reduce((s,c)=> s + getW(c), 0);
    if (W <= 0){
      for (let i=0;i<cardsList.length;i++) out.set(cardsList[i].id, 0);
      out.set(cardsList[cardsList.length-1].id, total);
      return out;
    }
    let assigned = 0;
    for (let i=0;i<cardsList.length;i++){
      const c = cardsList[i];
      let v;
      if (i === cardsList.length - 1){
        v = total - assigned;
      } else {
        v = Math.floor(total * (getW(c)/W));
      }
      assigned += v;
      out.set(c.id, v);
    }
    return out;
  }

  function baselineFSPlaced(){
    let F0 = 0, S0 = 0;
    const fricCards = [];
    const struCards = [];

    for (const c of cards){
      if (c.zone === "FRIC" && c.correct === "FRIC"){
        F0 += c.baselinePeople;
        fricCards.push(c);
      } else if (c.zone === "STRU" && c.correct === "STRU"){
        S0 += c.baselinePeople;
        struCards.push(c);
      }
    }
    return {F0, S0, fricCards, struCards};
  }

  function recomputeAll(){
    // ensure a carrier exists (staging). auto-place in recession if needed and no cyc placed.
    const carrier = ensureCycCarrierExists();

    const {F0, S0, fricCards, struCards} = baselineFSPlaced();

    // structural fixed (current = baseline) for placed structural cards
    for (const c of struCards){
      c.people = c.baselinePeople;
    }

    const growth = g[tCur];

    // --- cyclical total ---
    let C_total = 0;
    if (growth < G_STAR){
      const depth = (G_STAR - growth);
      const uC = KAPPA_REC * depth;
      C_total = Math.round(LF * uC);
    } else {
      C_total = 0;
    }

    // auto-place carrier in recession if no cyc cards placed
    if (C_total > 0){
      const anyCycPlaced = cards.some(c => c.correct === "CYC" && c.zone === "CYC");
      if (!anyCycPlaced){
        carrier.zone = "CYC";
      }
    }

    // distribute cyclical across placed cyc cards
    const cycPlaced = cards.filter(c => c.correct === "CYC" && c.zone === "CYC");
    const allocC = allocateProportional(cycPlaced, C_total, (c)=> Math.max(0.05, c.cycWeight || 1));
    for (const c of cycPlaced){
      c.people = allocC.get(c.id) ?? 0;
    }

    // --- frictional current total ---
    let F_cur_total = F0;
    if (growth > G_STAR){
      const strength = (growth - G_STAR);
      const absorbRate = KAPPA_EXP * strength;
      const absorb = Math.round(LF * absorbRate);
      F_cur_total = Math.max(0, F0 - Math.min(absorb, F0));
    } else {
      F_cur_total = F0;
    }

    // allocate current frictional across frictional cards proportional to baseline
    const allocF = allocateProportional(fricCards, F_cur_total, (c)=> c.baselinePeople);
    for (const c of fricCards){
      c.people = allocF.get(c.id) ?? 0;
    }

    // totals
    const U = F_cur_total + S0 + C_total;
    const E = LF - U;

    const U_star = F0 + S0;
    const u = U / LF;
    const u_star = U_star / LF;
    const u_cyc = u - u_star;

    // metrics
    els.m_LF.textContent = String(LF);
    els.m_E.textContent = String(E);
    els.m_U.textContent = String(U);

    els.m_u.textContent = fmtPct(u);
    els.m_ustar.textContent = fmtPct(u_star);
    els.m_ucyc.textContent = fmtPct(u_cyc);

    // labels
    els.qLabel.textContent = `Q${tCur+1}`;
    els.gVal.textContent = growth.toFixed(2);

    if (growth === G_STAR){
      els.cycleNote.textContent = `Neutral: growth = ${G_STAR.toFixed(1)}%. Cyclical = 0 and frictional = baseline.`;
    } else if (growth > G_STAR){
      els.cycleNote.textContent = `Expansion: growth above ${G_STAR.toFixed(1)}%. Cyclical stays at 0; frictional falls below baseline.`;
    } else {
      els.cycleNote.textContent = `Recession: growth below ${G_STAR.toFixed(1)}%. Frictional returns to baseline; cyclical increases.`;
    }

    // unemployment series for chart
    const uSeries = new Array(T).fill(0).map((_,t) => {
      const gt = g[t];

      // cyclical
      let Ct = 0;
      if (gt < G_STAR){
        Ct = Math.round(LF * (KAPPA_REC * (G_STAR - gt)));
      } else {
        Ct = 0;
      }

      // frictional current
      let Ft = F0;
      if (gt > G_STAR){
        const absorb = Math.round(LF * (KAPPA_EXP * (gt - G_STAR)));
        Ft = Math.max(0, F0 - Math.min(absorb, F0));
      } else {
        Ft = F0;
      }

      const Ut = Ft + S0 + Ct;
      return Ut / LF;
    });

    drawUChart(uSeries, u_star);

    renderZones();
  }

  function check(){
    let correct = 0, placed = 0;
    for (const c of cards){
      if (c.zone === "STAGE") { c.checked = null; continue; }
      placed++;
      c.checked = (c.zone === c.correct);
      if (c.checked) correct++;
    }
    renderZones();
    els.checkMsg.textContent = placed === 0 ? "Place some cards first." : `${correct}/${placed} placed cards correct.`;
  }

  function newRound(){
    nextId = 1;
    LF = 900 + Math.floor(Math.random()*701); // 900..1600

    const pool = [...TEMPLATES].sort(()=>Math.random()-0.5);
    const n = 10 + Math.floor(Math.random()*5); // 10..14
    cards = pool.slice(0, n).map(makeCard);

    ensureCycCarrierExists(); // starts in staging

    resetCycle();
    els.checkMsg.textContent = "";
    setStatus("New round loaded (neutral start: growth=2%).");

    recomputeAll();
  }

  function reset(){
    newRound();
    setStatus("Reset.");
  }

  // wire up
  els.checkBtn.addEventListener("click", check);
  els.newRoundBtn.addEventListener("click", newRound);
  els.resetBtn.addEventListener("click", reset);

  els.qSlider.addEventListener("input", () => {
    tCur = Number(els.qSlider.value);
    drawGrowth();
    recomputeAll();
  });

  els.recessionBtn.addEventListener("click", () => {
    applyShock("recession");
    recomputeAll();
    setStatus(`Applied recession shock starting at Q${tCur+1}.`);
  });

  els.expansionBtn.addEventListener("click", () => {
    applyShock("expansion");
    recomputeAll();
    setStatus(`Applied expansion shock starting at Q${tCur+1}.`);
  });

  els.resetCycleBtn.addEventListener("click", () => {
    resetCycle();
    recomputeAll();
    setStatus("Cycle reset (neutral everywhere).");
  });

  // typeset header once
  const top = document.getElementById("mathTop");
  if (top && window.MathJax?.typesetPromise) window.MathJax.typesetPromise([top]);

  // start
  newRound();
});
