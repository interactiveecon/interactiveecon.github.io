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

  // --- Card templates (expand freely) ---
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

    // cyclical examples (classification practice)
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

  // Business cycle series: growth rate of output (%)
  const T = 12;
  let gBase = new Array(T).fill(0);
  let g = new Array(T).fill(0);
  let tCur = 0;

  // Trend growth rate and mapping strength
  const G_STAR = 2.0;     // trend growth (%)
  const KAPPA = 0.015;    // (growth below trend by 2pp) -> cyclical rate +3%

  function drawPeople(){
    return 4 + Math.floor(Math.random()*25); // 4..28
  }

  function makeCard(tpl){
    return {
      id: "c" + (nextId++),
      people: drawPeople(),
      text: tpl.text,
      correct: tpl.type,  // FRIC | STRU | CYC
      zone: "STAGE",
      checked: null
    };
  }

  // Special signed cyclical card that represents net cyclical effect (can be negative)
  function ensureNetCycCard(){
    let c = cards.find(x => x.isNetCyc === true);
    if (c) return c;

    c = {
      id: "c" + (nextId++),
      people: 0, // signed
      text: "Net cyclical effect (business cycle).",
      correct: "CYC",
      zone: "CYC",
      checked: null,
      isNetCyc: true
    };
    cards.push(c);
    return c;
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

      const isNeg = (c.zone === "CYC" && c.isNetCyc && c.people < 0);

      el.innerHTML = `
        <div class="badge ${isNeg ? "neg" : ""}">${c.people} people</div>
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

  function placedCounts(){
    let F=0,S=0,C=0;
    for (const c of cards){
      if (c.zone === "FRIC") F += c.people;
      else if (c.zone === "STRU") S += c.people;
      else if (c.zone === "CYC" && !c.isNetCyc) C += c.people;
    }
    return {F,S,C};
  }

  function cycRateFromGrowth(growth){
    // cyclical rate is positive when growth < trend; negative when growth > trend
    return -KAPPA * (growth - G_STAR);
  }

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

    // fixed y-range for clarity (growth %)
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

    // draw trend line at g*
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

  function resetCycle(){
    // baseline around trend with mild noise
    gBase = new Array(T).fill(0).map(() => G_STAR + (Math.random()*1.2 - 0.6)); // g* +/- 0.6
    g = gBase.slice();
    tCur = 0;
    els.qSlider.value = "0";
    drawCycle();
  }

  function applyShock(kind){
    const amp = (kind === "recession")
      ? -(1.8 + Math.random()*2.0)   // negative shock to growth
      : +(1.2 + Math.random()*1.6);  // positive shock to growth
    const len = 5;
    for (let j=0;j<len;j++){
      const t = tCur + j;
      if (t >= T) break;
      const w = Math.sin((Math.PI * (j+1)) / (len+1));
      g[t] += amp * w;
    }
    // clamp growth range
    g = g.map(x => Math.max(-4, Math.min(6, x)));
    drawCycle();
  }

  function updateMetrics(){
    const {F,S,C: C_examples} = placedCounts();

    // Natural unemployed count (from frictional + structural cards)
    const U_star = F + S;

    // cyclical rate from current growth
    const growth = g[tCur];
    const u_cyc = cycRateFromGrowth(growth); // can be negative

    // cyclical unemployed count (signed)
    const C_net = Math.round(LF * u_cyc);

    // Total unemployed count (can be < U_star in expansions)
    const U = U_star + C_net;

    // Employment adjusts one-for-one (LF fixed)
    const E = LF - U;

    // Rates
    const u = U / LF;
    const u_star = U_star / LF;
    const u_minus_ustar = u - u_star; // equals C_net/LF

    // Show values
    els.m_LF.textContent = String(LF);
    els.m_E.textContent = String(E);
    els.m_U.textContent = String(U);

    els.m_u.textContent = fmtPct(u);
    els.m_ustar.textContent = fmtPct(u_star);
    els.m_ucyc.textContent = fmtPct(u_minus_ustar);

    // Update cycle readouts
    els.qLabel.textContent = `Q${tCur+1}`;
    els.gVal.textContent = growth.toFixed(2);

    els.cycleNote.textContent =
      `Trend growth is ${G_STAR.toFixed(1)}%. When growth is below trend, cyclical unemployment is positive; when growth is above trend, cyclical unemployment is negative.`;
    
    // Ensure / set net cyclical card in cyclical bucket
    const netCard = ensureNetCycCard();
    netCard.people = C_net;

    // Also keep the example cyclical cards as classification practice (they don't affect C_net directly)
    // (We leave their people counts alone.)
  }

  function recomputeAll(){
    // Keep net cyclical card in cyc bucket so students can always “see” it
    ensureNetCycCard();
    updateMetrics();
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

    const pool = [...TEMPLATES].sort(()=>Math.random()-0.5);
    const n = 10 + Math.floor(Math.random()*5); // 10..14
    cards = pool.slice(0, n).map(makeCard);

    // Add the net cyclical card immediately (so it’s always visible in CYC bucket)
    ensureNetCycCard();

    resetCycle();

    els.checkMsg.textContent = "";
    setStatus("New round loaded.");

    recomputeAll();
  }

  function reset(){
    newRound();
    setStatus("Reset.");
  }

  // Wire up
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
    setStatus("Cycle reset.");
  });

  // typeset header once
  const top = document.getElementById("mathTop");
  if (top && window.MathJax?.typesetPromise) window.MathJax.typesetPromise([top]);

  // Start
  newRound();
});
