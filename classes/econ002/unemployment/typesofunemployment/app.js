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
    explainBox: must("explainBox"),

    m_LF: must("m_LF"),
    m_E: must("m_E"),
    m_U: must("m_U"),
    m_u: must("m_u"),
    m_ustar: must("m_ustar"),
    m_ucyc: must("m_ucyc"),

    growthChart: must("growthChart"),
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

  // --- Templates (expand freely) ---
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

    // cyclical
    { type:"CYC", text:"Sales fall; firms lay off workers broadly." },
    { type:"CYC", text:"Restaurants cut staff after a decline in consumer spending." },
    { type:"CYC", text:"A downturn reduces exports; manufacturers lay off workers." },
    { type:"CYC", text:"Hiring freezes spread during a recession." },
    { type:"CYC", text:"Construction layoffs rise when spending falls sharply." },
  ];

  // --- State ---
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

  function drawPeople(){ return 6 + Math.floor(Math.random()*23); } // 6..28

function makeCard(tpl){
  const base = (tpl.type === "CYC") ? 0 : drawPeople();

  return {
    id: "c" + (nextId++),
    text: tpl.text,
    correct: tpl.type,
    zone: "STAGE",
    checked: null,
    baselinePeople: base,
    people: base,

    // NEW: per-round weight to distribute recession layoffs across cyc cards
    cycWeight: (tpl.type === "CYC") ? (0.6 + Math.random()*1.8) : 0
  };
}

  // Ensure at least one cyclical card in CYC bucket to hold cyclical unemployment when recession hits
function ensureCycCarrierExists(){
  let carrier = cards.find(c => c.isCycleCarrier === true);
  if (carrier) return carrier;

  carrier = {
    id: "c" + (nextId++),
    text: "Economy-wide layoffs due to weak demand (cycle).",
    correct: "CYC",
    zone: "STAGE",          // <-- start in staging
    checked: null,
    baselinePeople: 0,
    people: 0,
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

      const showBaselineLine = (c.zone === "FRIC"); // show baseline/current only for frictional cards (in frictional bucket)
      const badgeText = `${c.people} people`;
      const baselineLine = showBaselineLine ? `<div class="baselineLine">baseline: ${c.baselinePeople}</div>` : "";

      el.innerHTML = `
        <div class="badge">${badgeText}</div>
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

  // Sums of baseline (not current) for F and S define natural unemployment
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

  // Allocate integer counts proportional to baseline
  function allocateProportional(cardsList, total, getW){
    const out = new Map();
    if (cardsList.length === 0) return out;
    const W = cardsList.reduce((s,c)=> s + getW(c), 0);
    if (W <= 0){
      // put all on last
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

  function resetCycle(){
    g = new Array(T).fill(G_STAR); // neutral everywhere
    tCur = 0;
    els.qSlider.value = "0";
    drawCycle();
  }

  function applyShock(kind){
    const amp = (kind === "recession")
      ? -(1.4 + Math.random()*2.0)   // push growth down
      : +(1.0 + Math.random()*1.8);  // push growth up
    const len = 5;

    for (let j=0;j<len;j++){
      const t = tCur + j;
      if (t >= T) break;
      const w = Math.sin((Math.PI * (j+1)) / (len+1));
      g[t] = clamp(g[t] + amp*w, -4, 6);
    }
    drawCycle();
  }

  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

  function drawCycle(){
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

    // grid + y ticks
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

    // x labels sparse
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

  function recomputeAll(){
    // Always ensure we have a cyclical place-holder to carry recession counts once needed
    ensureCycCarrierExists();;

    const {F0, S0, fricCards, struCards} = baselineFSPlaced();

    // Structural is fixed: set current = baseline on structural cards (placed)
    for (const c of struCards){
      c.people = c.baselinePeople;
    }

    // Determine current growth
    const growth = g[tCur];

    // Step 1: cyclical cards are 0 in expansions and at neutral
    let C_total = 0;

    if (growth < G_STAR){
      // recession: cyclical increases with depth
      const depth = (G_STAR - growth); // >0
      const uC = KAPPA_REC * depth;     // rate
      C_total = Math.round(LF * uC);
    } else {
      // neutral or expansion: cyclical is zero
      C_total = 0;
    }

    // If recession implies cyclical > 0 but no cyclical cards are placed,
// automatically place the cycle carrier into the CYC bucket so the numbers show up.
if (C_total > 0){
  const anyCycPlaced = cards.some(c => c.correct === "CYC" && c.zone === "CYC");
  if (!anyCycPlaced){
    const carrier = ensureCycCarrierExists();
    carrier.zone = "CYC";
  }
}

    // Distribute C_total across placed cyclical cards (excluding cyc in staging)
    // If none placed, carrier card will hold it (it is placed by default in CYC).
    const cycPlaced = cards.filter(c => c.correct === "CYC" && c.zone === "CYC");
    const allocC = allocateProportional(
      cycPlaced,
      C_total,
      (c) => Math.max(0.05, c.cycWeight || 1)   // NEW: use cycWeight
    );
    for (const c of cycPlaced){
      c.people = allocC.get(c.id) ?? 0;
    }

    // Step 2: frictional behavior
    // - In recessions (growth < 2): frictional returns to baseline
    // - At neutral (growth = 2): frictional baseline
    // - In expansions (growth > 2): frictional falls below baseline after cyclical is already zero (it is)
    let F_cur_total = F0;
    if (growth > G_STAR){
      const strength = (growth - G_STAR);        // >0
      const absorbRate = KAPPA_EXP * strength;   // rate
      const absorb = Math.round(LF * absorbRate);

      // Only reduce frictional (not structural), and can’t reduce below zero
      F_cur_total = Math.max(0, F0 - Math.min(absorb, F0));
    } else {
      // recession or neutral
      F_cur_total = F0;
    }

    // Distribute current frictional totals across frictional cards proportionally to baseline
    const allocF = allocateProportional(fricCards, F_cur_total, (c)=> c.baselinePeople);
    for (const c of fricCards){
      c.people = allocF.get(c.id) ?? 0;
    }

    // Step 3: compute unemployment and employment
    const U = F_cur_total + S0 + C_total;
    const E = LF - U;

    // Natural unemployment uses baseline F0+S0 (as requested structural fixed, frictional baseline)
    const U_star = F0 + S0;

    // Rates
    const u = U / LF;
    const u_star = U_star / LF;
    const u_cyc = u - u_star;

    // Update metrics
    els.m_LF.textContent = String(LF);
    els.m_E.textContent = String(E);
    els.m_U.textContent = String(U);

    els.m_u.textContent = fmtPct(u);
    els.m_ustar.textContent = fmtPct(u_star);
    els.m_ucyc.textContent = fmtPct(u_cyc);

    // Cycle labels
    els.qLabel.textContent = `Q${tCur+1}`;
    els.gVal.textContent = growth.toFixed(2);

    // Cycle note
    if (growth === G_STAR){
      els.cycleNote.textContent = `Neutral: growth = ${G_STAR.toFixed(1)}%. Cyclical = 0 and frictional = baseline.`;
    } else if (growth > G_STAR){
      els.cycleNote.textContent = `Expansion: growth above ${G_STAR.toFixed(1)}%. Cyclical stays at 0; frictional falls below baseline.`;
    } else {
      els.cycleNote.textContent = `Recession: growth below ${G_STAR.toFixed(1)}%. Frictional returns to baseline; cyclical increases.`;
    }

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

    // Random LF each round
    LF = 900 + Math.floor(Math.random()*701); // 900..1600

    // Random cards
    const pool = [...TEMPLATES].sort(()=>Math.random()-0.5);
    const n = 10 + Math.floor(Math.random()*5); // 10..14
    cards = pool.slice(0, n).map(makeCard);

    // Put a cyc carrier in CYC bucket now (0 at neutral)
    ensureCycCarrierExists();;

    // Start cycle neutral everywhere
    resetCycle();

    els.checkMsg.textContent = "";
    setStatus("New round loaded (neutral start: growth=2%).");

    recomputeAll();
  }

  function reset(){
    newRound();
    setStatus("Reset.");
  }

  // Wire up UI
  els.checkBtn.addEventListener("click", check);
  els.newRoundBtn.addEventListener("click", newRound);
  els.resetBtn.addEventListener("click", reset);

  els.qSlider.addEventListener("input", () => {
    tCur = Number(els.qSlider.value);
    drawCycle();
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

  // Start
  newRound();
});
