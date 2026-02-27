// app.js
window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const els = {
    zoneStage: $("zoneStage"),
    zoneCPI: $("zoneCPI"),
    zoneDEF: $("zoneDEF"),
    zoneBOTH: $("zoneBOTH"),
    zoneNEI: $("zoneNEI"),

    newRoundBtn: $("newRoundBtn"),
    resetBtn: $("resetBtn"),
    checkBtn: $("checkBtn"),
    status: $("status"),
    progressMsg: $("progressMsg"),
    checkMsg: $("checkMsg"),

    shockImports: $("shockImports"),
    shockInvestment: $("shockInvestment"),
    shockExports: $("shockExports"),
    shockOil: $("shockOil"),
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

  // --------- HARD GUARD: data.js must load ----------
  if (!window.CPIDEF_DATA || !Array.isArray(window.CPIDEF_DATA.cards)) {
    setStatus("ERROR: data.js did not load (CPIDEF_DATA is missing). Make sure data.js is in the same folder as index.html and app.js, and that index.html uses <script defer src=\"data.js\"></script> before app.js.");
    return;
  }

  const ALL = window.CPIDEF_DATA.cards;
  const SHOCKS = window.CPIDEF_DATA.shocks;

  // ---------- CARD SORT ----------
  let cards = [];
  let currentShockKey = "NONE";
  let currentSimQs = [];

  function shuffle(a){
    for (let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
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
      renderBoard();
      updateProgress();
    });
  }

  [els.zoneStage, els.zoneCPI, els.zoneDEF, els.zoneBOTH, els.zoneNEI].forEach(setupDropzone);

  function renderBoard(){
    els.zoneStage.innerHTML = "";
    els.zoneCPI.innerHTML = "";
    els.zoneDEF.innerHTML = "";
    els.zoneBOTH.innerHTML = "";
    els.zoneNEI.innerHTML = "";

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
        (c.zone === "STAGE") ? els.zoneStage :
        (c.zone === "CPI")   ? els.zoneCPI :
        (c.zone === "DEF")   ? els.zoneDEF :
        (c.zone === "BOTH")  ? els.zoneBOTH :
        els.zoneNEI;

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

    const n = Math.min(10, shuffled.length);
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

  // ---------- SIMULATION ----------
  function setShock(key){
    currentShockKey = key;
    const s = SHOCKS[key];
    els.shockName.textContent = s.name;
    els.shockWinner.textContent = s.winner;
    els.shockWhy.textContent = s.why;

    drawSimChart(s.path);
    generateSimQuestions(key);
    renderSimQuestions();
  }

  function drawSimChart(path){
    const canvas = els.simChart;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth * dpr;
    const H = canvas.clientHeight * dpr;
    if (canvas.width !== W || canvas.height !== H){
      canvas.width = W; canvas.height = H;
    }
    ctx.clearRect(0,0,W,H);

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
    ctx.fillText("Inflation paths (CPI vs GDP deflator vs PCE)", X0, 0);

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
    plot(path.def, "rgba(230,159,0,0.95)", 3);
    plot(path.pce, "rgba(0,0,0,0.55)", 3);

    const legend = [
      { name:"CPI", col:"rgba(31,119,180,0.90)" },
      { name:"GDP deflator", col:"rgba(230,159,0,0.95)" },
      { name:"PCE", col:"rgba(0,0,0,0.55)" }
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

  // ---------- SIM MCQs ----------
  function shuffleChoices(arr){
    const c = arr.slice();
    shuffle(c);
    return c;
  }

  function generateSimQuestions(shockKey){
    const s = SHOCKS[shockKey];
    const peakIdx = 1;

    const v = [
      { key:"CPI", label:"CPI inflation", val: s.path.cpi[peakIdx] },
      { key:"DEF", label:"GDP deflator inflation", val: s.path.def[peakIdx] },
      { key:"PCE", label:"PCE inflation", val: s.path.pce[peakIdx] }
    ].sort((a,b)=>b.val-a.val);

    const q1 = {
      id: "simq1",
      prompt: `In the first quarter after the shock (Q2), which measure rises the most?`,
      choices: shuffleChoices([
        { key:"CPI", text:"CPI inflation" },
        { key:"DEF", text:"GDP deflator inflation" },
        { key:"PCE", text:"PCE inflation" }
      ]),
      correctKey: v[0].key,
      explain: s.why
    };

    const q2 = buildShockConceptQuestion(shockKey);
    currentSimQs = [q1, q2];
  }

  function buildShockConceptQuestion(shockKey){
    if (shockKey === "IMPORTS"){
      return {
        id:"simq2",
        prompt:"Why is the GDP deflator response smaller than CPI/PCE in this scenario?",
        choices: [
          { key:"A", text:"Because imports are excluded from the GDP deflator (domestic production measure)" },
          { key:"B", text:"Because CPI excludes imports but the deflator includes them" },
          { key:"C", text:"Because the deflator only includes services" },
          { key:"D", text:"Because CPI measures producer prices" }
        ],
        correctKey:"A",
        explain:"GDP deflator is based on domestic production and excludes imports. CPI/PCE track consumer prices and include imported consumer goods."
      };
    }
    if (shockKey === "INVEST"){
      return {
        id:"simq2",
        prompt:"Why does the GDP deflator react more than CPI/PCE here?",
        choices: [
          { key:"A", text:"Investment goods are part of GDP (domestic production) but not a major direct component of consumer price indexes" },
          { key:"B", text:"Because CPI includes exports but the deflator does not" },
          { key:"C", text:"Because CPI is based on producer costs" },
          { key:"D", text:"Because the deflator excludes government purchases" }
        ],
        correctKey:"A",
        explain:"Deflator includes prices of domestically produced investment goods. CPI/PCE focus on consumer purchases."
      };
    }
    if (shockKey === "EXPORTS"){
      return {
        id:"simq2",
        prompt:"What explains a stronger GDP deflator response than CPI/PCE?",
        choices: [
          { key:"A", text:"Exports are domestic production and included in the deflator, but not in consumer price indexes" },
          { key:"B", text:"CPI includes exports directly" },
          { key:"C", text:"Deflator excludes exports" },
          { key:"D", text:"PCE excludes consumer spending" }
        ],
        correctKey:"A",
        explain:"Exports are produced domestically and included in GDP/deflator. CPI and PCE track prices faced by consumers."
      };
    }
    if (shockKey === "OIL"){
      return {
        id:"simq2",
        prompt:"Why do CPI/PCE rise when energy prices spike?",
        choices: [
          { key:"A", text:"Energy is a consumer purchase, so it enters CPI/PCE directly" },
          { key:"B", text:"Energy prices are excluded from CPI by construction" },
          { key:"C", text:"Because CPI only tracks wages" },
          { key:"D", text:"Because PCE excludes services" }
        ],
        correctKey:"A",
        explain:"Energy is part of consumer spending, so CPI/PCE respond. The deflator can also respond because energy is part of domestic production and input costs."
      };
    }
    return {
      id:"simq2",
      prompt:"With no shock, what should happen to the three inflation series?",
      choices: [
        { key:"A", text:"They should stay near baseline and be similar" },
        { key:"B", text:"CPI should fall while the deflator rises" },
        { key:"C", text:"Only PCE should move" },
        { key:"D", text:"All three should be zero always" }
      ],
      correctKey:"A",
      explain:"In the baseline case, we hold inflation around 2% in each measure."
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

  // ---------- EVENTS ----------
  els.newRoundBtn.addEventListener("click", newRound);
  els.resetBtn.addEventListener("click", resetBoard);
  els.checkBtn.addEventListener("click", check);

  els.shockImports.addEventListener("click", () => setShock("IMPORTS"));
  els.shockInvestment.addEventListener("click", () => setShock("INVEST"));
  els.shockExports.addEventListener("click", () => setShock("EXPORTS"));
  els.shockOil.addEventListener("click", () => setShock("OIL"));
  els.shockReset.addEventListener("click", () => setShock("NONE"));

  els.submitSimQs.addEventListener("click", submitSimQuestions);

  // Typeset header once
  const top = document.getElementById("mathTop");
  if (top && window.MathJax?.typesetPromise) window.MathJax.typesetPromise([top]);

  // ---------- INIT ----------
  renderBoard();
  newRound();
});
