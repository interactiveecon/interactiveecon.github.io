// app.js
window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const els = {
    zoneStage: $("zoneStage"),
    zoneCPIPCE: $("zoneCPIPCE"),
    zonePCEDP: $("zonePCEDP"),
    zoneGDPONLY: $("zoneGDPONLY"),
    zoneALL: $("zoneALL"),
    zoneNONE: $("zoneNONE"),

    newRoundBtn: $("newRoundBtn"),
    resetBtn: $("resetBtn"),
    checkBtn: $("checkBtn"),
    status: $("status"),
    progressMsg: $("progressMsg"),
    checkMsg: $("checkMsg"),

    shockImports: $("shockImports"),
    shockSubst: $("shockSubst"),
    shockInvestment: $("shockInvestment"),
    shockExports: $("shockExports"),
    shockReset: $("shockReset"),
    shockName: $("shockName"),
    shockWinner: $("shockWinner"),
    shockWhy: $("shockWhy"),

    simChart: $("simChart"),
    simQs: $("simQs"),
    submitSimQs: $("submitSimQs"),
  };

  function setStatus(msg){ els.status.textContent = msg; }
  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;");
  }

  // Data guard
  if (!window.INFL_MEASURES_DATA || !Array.isArray(window.INFL_MEASURES_DATA.cards)) {
    setStatus("ERROR: data.js did not load. Ensure data.js is in the same folder and loads before app.js (both should be 'defer').");
    return;
  }

  const ALL = window.INFL_MEASURES_DATA.cards;
  const SHOCKS = window.INFL_MEASURES_DATA.shocks;

  let cards = [];
  let currentSimQs = [];

  function shuffle(a){
    for (let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  // Dropzones
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
      renderBoard();
      updateProgress();
    });
  }

  [els.zoneStage, els.zoneCPIPCE, els.zonePCEDP, els.zoneGDPONLY, els.zoneALL, els.zoneNONE].forEach(setupDropzone);

  function renderBoard(){
    els.zoneStage.innerHTML = "";
    els.zoneCPIPCE.innerHTML = "";
    els.zonePCEDP.innerHTML = "";
    els.zoneGDPONLY.innerHTML = "";
    els.zoneALL.innerHTML = "";
    els.zoneNONE.innerHTML = "";

    if (!cards.length){
      const msg = document.createElement("div");
      msg.className = "mini";
      msg.textContent = "No cards loaded. Click New Round.";
      els.zoneStage.appendChild(msg);
      return;
    }

    for (const c of cards){
      const el = document.createElement("div");
      el.className = "card";
      if (c.checked === true) el.classList.add("ok");
      if (c.checked === false) el.classList.add("bad");
      el.draggable = true;

      el.innerHTML = `
        <div class="ctitle">${escapeHtml(c.title)}</div>
        <div class="cdesc">${escapeHtml(c.desc)}</div>
      `;

      el.addEventListener("dragstart", (ev) => {
        ev.dataTransfer.setData("text/plain", c.id);
        ev.dataTransfer.effectAllowed = "move";
      });

      const zoneEl =
        (c.zone === "STAGE")   ? els.zoneStage :
        (c.zone === "CPIPCE")  ? els.zoneCPIPCE :
        (c.zone === "PCEDP")   ? els.zonePCEDP :
        (c.zone === "GDPONLY") ? els.zoneGDPONLY :
        (c.zone === "ALL")     ? els.zoneALL :
        els.zoneNONE;

      zoneEl.appendChild(el);
    }
  }

  function updateProgress(){
    const total = cards.length;
    const placed = cards.filter(c => c.zone !== "STAGE").length;
    els.progressMsg.textContent = `Progress: ${placed}/${total} placed.`;
  }

  function check(){
    let correct = 0, placed = 0;
    const mistakes = [];

    for (const c of cards){
      if (c.zone === "STAGE"){ c.checked = null; continue; }
      placed++;
      c.checked = (c.zone === c.correct);
      if (c.checked) correct++;
      else mistakes.push(c);
    }

    renderBoard();
    updateProgress();

    els.checkMsg.textContent = placed === 0 ? "Place some cards first." : `${correct}/${placed} placed cards correct.`;

    if (mistakes.length){
      const m = mistakes.slice(0,3)
        .map(x => `• ${x.title}: ${x.explain}`)
        .join("  ");
      setStatus(`Explanations (first few): ${m}`);
    } else if (placed > 0){
      setStatus("Nice — everything placed correctly.");
    }
  }

  function newRound(){
    const shuffled = ALL.slice();
    shuffle(shuffled);

    const n = Math.min(12, shuffled.length); // slightly bigger round now
    cards = shuffled.slice(0, n).map(c => ({ ...c, zone: "STAGE", checked: null }));

    els.checkMsg.textContent = "";
    setStatus("New round loaded.");
    renderBoard();
    updateProgress();

    setShock("NONE");
  }

  function resetBoard(){
    for (const c of cards){
      c.zone = "STAGE";
      c.checked = null;
    }
    els.checkMsg.textContent = "";
    setStatus("Reset.");
    renderBoard();
    updateProgress();
  }

  // ---------------- Simulation ----------------
  function setShock(key){
    const s = SHOCKS[key];
    $("shockName").textContent = s.name;
    $("shockWinner").textContent = s.winner;
    $("shockWhy").textContent = s.why;

    drawSimChart(s.path);
    generateSimQuestions(key);
    renderSimQuestions();
  }

  function prepareCanvas(canvas){
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth * dpr;
    const H = canvas.clientHeight * dpr;
    if (canvas.width !== W || canvas.height !== H){
      canvas.width = W; canvas.height = H;
    }
    ctx.clearRect(0,0,W,H);
    return { ctx, dpr, W, H };
  }

  function drawSimChart(path){
    const { ctx, dpr, W, H } = prepareCanvas(els.simChart);

    const pad = { l: 52*dpr, r: 14*dpr, t: 18*dpr, b: 42*dpr };
    const X0 = pad.l, X1 = W - pad.r;
    const Y0 = pad.t, Y1 = H - pad.b;

    const T = 6;
    const xToPix = (i) => X0 + i * (X1 - X0) / (T-1);

    const yMin = -2, yMax = 8;
    const yToPix = (y) => Y0 + (yMax - y) * (Y1 - Y0) / (yMax - yMin);

    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1*dpr;
    for (let k=0;k<=5;k++){
      const y = yMin + k*(yMax-yMin)/5;
      const py = yToPix(y);
      ctx.beginPath(); ctx.moveTo(X0,py); ctx.lineTo(X1,py); ctx.stroke();
    }

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let k=0;k<=5;k++){
      const y = yMin + k*(yMax-yMin)/5;
      ctx.fillText(`${y.toFixed(0)}%`, X0 - 8*dpr, yToPix(y));
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i=0;i<T;i++){
      ctx.fillText(`Q${i+1}`, xToPix(i), Y1 + 10*dpr);
    }

    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `${13*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.fillText("Inflation paths: CPI vs PCE vs GDP deflator", X0, 0);

    function plot(series, strokeStyle, width){
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = width*dpr;
      ctx.beginPath();
      for (let i=0;i<T;i++){
        const x = xToPix(i);
        const y = yToPix(series[i]);
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();

      ctx.fillStyle = strokeStyle;
      for (let i=0;i<T;i++){
        ctx.beginPath();
        ctx.arc(xToPix(i), yToPix(series[i]), 4.5*dpr, 0, Math.PI*2);
        ctx.fill();
      }
    }

    plot(path.cpi, "rgba(31,119,180,0.90)", 3);
    plot(path.pce, "rgba(0,0,0,0.55)", 3);
    plot(path.gdp, "rgba(230,159,0,0.95)", 3);

    const legend = [
      { name:"CPI", col:"rgba(31,119,180,0.90)" },
      { name:"PCE", col:"rgba(0,0,0,0.55)" },
      { name:"GDP deflator", col:"rgba(230,159,0,0.95)" }
    ];
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    let lx = X0, ly = Y0 + 22*dpr;
    legend.forEach((it, idx) => {
      ctx.fillStyle = it.col;
      ctx.fillRect(lx, ly + idx*16*dpr - 5*dpr, 12*dpr, 3*dpr);
      ctx.fillStyle = "rgba(0,0,0,0.70)";
      ctx.fillText(it.name, lx + 16*dpr, ly + idx*16*dpr - 4*dpr);
    });
  }

  // ---------------- Simulation MCQs ----------------
  function shuffleChoices(arr){
    const c = arr.slice();
    shuffle(c);
    return c;
  }

  // FIX: grade “moves the most” by absolute change from baseline (Q1)
  function maxMoverKey(path){
    const baseCPI = path.cpi[0], basePCE = path.pce[0], baseGDP = path.gdp[0];
    const q2 = 1;
    const deltas = [
      { key:"CPI", label:"CPI inflation", d: Math.abs(path.cpi[q2] - baseCPI) },
      { key:"PCE", label:"PCE inflation", d: Math.abs(path.pce[q2] - basePCE) },
      { key:"GDP", label:"GDP deflator inflation", d: Math.abs(path.gdp[q2] - baseGDP) }
    ].sort((a,b)=>b.d-a.d);
    return deltas[0].key;
  }

  function generateSimQuestions(shockKey){
    const s = SHOCKS[shockKey];

    const q1 = {
      id: "simq1",
      prompt: "In the first quarter after the shock (Q2), which measure moves the most?",
      choices: shuffleChoices([
        { key:"CPI", text:"CPI inflation" },
        { key:"PCE", text:"PCE inflation" },
        { key:"GDP", text:"GDP deflator inflation" }
      ]),
      correctKey: maxMoverKey(s.path),
      explain: s.why
    };

    const q2 = buildShockConceptQuestion(shockKey);
    currentSimQs = [q1, q2];
  }

  function buildShockConceptQuestion(shockKey){
    if (shockKey === "IMPORTS"){
      return {
        id:"simq2",
        prompt:"Why is the GDP deflator response smaller than CPI/PCE?",
        choices: [
          { key:"A", text:"Imports affect consumer prices but are excluded from the GDP deflator" },
          { key:"B", text:"CPI excludes imports but the GDP deflator includes them" },
          { key:"C", text:"The GDP deflator only includes services" },
          { key:"D", text:"PCE excludes consumer goods" }
        ],
        correctKey:"A",
        explain:"GDP deflator measures prices of domestic production and excludes imports. CPI and PCE include imported consumer goods."
      };
    }
    if (shockKey === "SUBST"){
      return {
        id:"simq2",
        prompt:"Why do PCE and the GDP deflator move more than CPI here?",
        choices: [
          { key:"A", text:"PCE and the GDP deflator adjust weights more (substitution/chain-weighting), while CPI is more fixed-basket" },
          { key:"B", text:"Because CPI includes investment and the others do not" },
          { key:"C", text:"Because CPI measures producer prices" },
          { key:"D", text:"Because the GDP deflator includes imports" }
        ],
        correctKey:"A",
        explain:"Substitution/composition shifts affect flexible-weight measures more. CPI is more fixed-basket in a principles-level treatment."
      };
    }
    if (shockKey === "INVEST"){
      return {
        id:"simq2",
        prompt:"Why does the GDP deflator react more than CPI/PCE?",
        choices: [
          { key:"A", text:"Investment goods are part of GDP (domestic production), but not central to consumer inflation measures" },
          { key:"B", text:"Because CPI includes exports but the GDP deflator does not" },
          { key:"C", text:"Because CPI excludes services" },
          { key:"D", text:"Because PCE only tracks imports" }
        ],
        correctKey:"A",
        explain:"The deflator includes investment goods. CPI/PCE focus on consumer purchases."
      };
    }
    if (shockKey === "EXPORTS"){
      return {
        id:"simq2",
        prompt:"Why does an export surge move the GDP deflator more?",
        choices: [
          { key:"A", text:"Exports are domestic production and included in the GDP deflator, but not in consumer inflation measures" },
          { key:"B", text:"Because CPI includes exports directly" },
          { key:"C", text:"Because the deflator excludes exports" },
          { key:"D", text:"Because PCE excludes consumer spending" }
        ],
        correctKey:"A",
        explain:"Exports are part of GDP and affect domestic production prices, so they affect the deflator."
      };
    }
    return {
      id:"simq2",
      prompt:"With no shock, what should happen to CPI, PCE, and GDP deflator inflation?",
      choices: [
        { key:"A", text:"They stay near baseline and are similar" },
        { key:"B", text:"CPI must be zero while GDP deflator is positive" },
        { key:"C", text:"Only PCE changes" },
        { key:"D", text:"All three must move in opposite directions" }
      ],
      correctKey:"A",
      explain:"In the baseline case, we keep inflation around 2% in all measures."
    };
  }

  function renderSimQuestions(){
    els.simQs.innerHTML = "";
    currentSimQs.forEach((q, idx) => {
      const wrap = document.createElement("div");
      wrap.className = "qcard";
      wrap.innerHTML = `
        <div class="qtitle">${idx+1}. ${escapeHtml(q.prompt)}</div>
        <div class="choices" role="radiogroup" aria-label="Sim question ${idx+1}">
          ${q.choices.map(ch => `
            <label class="choice">
              <input type="radio" name="${q.id}" value="${escapeHtml(ch.key)}">
              <div>${escapeHtml(ch.text)}</div>
            </label>
          `).join("")}
        </div>
        <div class="feedback" id="${q.id}_fb"></div>
      `;
      els.simQs.appendChild(wrap);
    });
  }

  function choiceText(q, key){
    const hit = q.choices.find(c => c.key === key);
    return hit ? hit.text : "(missing)";
  }

  function submitSimQuestions(){
    currentSimQs.forEach(q => {
      const sel = els.simQs.querySelector(`input[name="${q.id}"]:checked`);
      const fb = document.getElementById(`${q.id}_fb`);
      const chosen = sel ? sel.value : null;
      const ok = chosen === q.correctKey;

      fb.style.display = "block";
      fb.innerHTML = `
        ${ok ? `<span class="tagOK">Correct</span>` : `<span class="tagBad">Not quite</span>`}
        <strong>Answer:</strong> ${escapeHtml(choiceText(q, q.correctKey))}<br>
        <strong>Why:</strong> ${escapeHtml(q.explain)}
      `;
    });
  }

  // Events
  els.newRoundBtn.addEventListener("click", newRound);
  els.resetBtn.addEventListener("click", resetBoard);
  els.checkBtn.addEventListener("click", check);

  els.shockImports.addEventListener("click", () => setShock("IMPORTS"));
  els.shockSubst.addEventListener("click", () => setShock("SUBST"));
  els.shockInvestment.addEventListener("click", () => setShock("INVEST"));
  els.shockExports.addEventListener("click", () => setShock("EXPORTS"));
  els.shockReset.addEventListener("click", () => setShock("NONE"));

  els.submitSimQs.addEventListener("click", submitSimQuestions);

  // Init
  renderBoard();
  newRound();
});
