// app.js
window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const els = {
    zoneStage:    $("zoneStage"),
    zoneCPIPCE:   $("zoneCPIPCE"),
    zonePCEDP:    $("zonePCEDP"),
    zoneGDPONLY:  $("zoneGDPONLY"),
    zoneALL:      $("zoneALL"),
    zoneNONE:     $("zoneNONE"),

    newRoundBtn:  $("newRoundBtn"),
    resetBtn:     $("resetBtn"),
    checkBtn:     $("checkBtn"),
    status:       $("status"),
    progressMsg:  $("progressMsg"),
    checkMsg:     $("checkMsg"),

    shockImports:    $("shockImports"),
    shockSubst:      $("shockSubst"),
    shockInvestment: $("shockInvestment"),
    shockExports:    $("shockExports"),
    shockReset:      $("shockReset"),
    shockName:       $("shockName"),
    shockWinner:     $("shockWinner"),
    shockWhy:        $("shockWhy"),

    simChart:    $("simChart"),
    simQs:       $("simQs"),
    submitSimQs: $("submitSimQs"),
    simChartDesc: $("simChartDesc"),
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

  const ALL_CARDS = window.INFL_MEASURES_DATA.cards;
  const SHOCKS = window.INFL_MEASURES_DATA.shocks;

  let cards = [];
  let currentSimQs = [];
  let currentShockKey = "NONE";
  let kbSelected = null; // id of card currently picked up via keyboard

  // ── Zone helpers ──────────────────────────────────────────────────────────
  function zoneName(zone) {
    const names = {
      STAGE:   "Staging",
      CPIPCE:  "CPI and PCE",
      PCEDP:   "PCE and GDP Deflator",
      GDPONLY: "GDP Deflator only",
      ALL:     "All measures",
      NONE:    "None"
    };
    return names[zone] || zone;
  }

  function shuffle(a){
    for (let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  // ── Dropzones ─────────────────────────────────────────────────────────────
  function setupDropzone(zoneEl){
    zoneEl.tabIndex = 0;

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

    // Keyboard: press Enter/Space on a dropzone to drop the picked-up card
    zoneEl.addEventListener("keydown", (ev) => {
      if ((ev.key === "Enter" || ev.key === " ") && kbSelected) {
        ev.preventDefault();
        const z = zoneEl.dataset.zone;
        const c = cards.find(x => x.id === kbSelected);
        if (!c) return;
        c.zone = z;
        c.checked = null;
        kbSelected = null;
        renderBoard();
        updateProgress();
        setStatus(`Card moved to ${zoneName(z)}.`);
      }
      if (ev.key === "Escape") {
        kbSelected = null;
        renderBoard();
        setStatus("Card drop cancelled.");
      }
    });
  }

  [els.zoneStage, els.zoneCPIPCE, els.zonePCEDP, els.zoneGDPONLY, els.zoneALL, els.zoneNONE].forEach(setupDropzone);

  // ── Board rendering ────────────────────────────────────────────────────────
  function renderBoard(){
    els.zoneStage.innerHTML   = "";
    els.zoneCPIPCE.innerHTML  = "";
    els.zonePCEDP.innerHTML   = "";
    els.zoneGDPONLY.innerHTML = "";
    els.zoneALL.innerHTML     = "";
    els.zoneNONE.innerHTML    = "";

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
      if (c.checked === true)  el.classList.add("ok");
      if (c.checked === false) el.classList.add("bad");
      if (kbSelected === c.id) el.classList.add("kb-selected");
      el.draggable = true;
      el.tabIndex  = 0;
      el.setAttribute("role", "button");

      // Build status indicator text (secondary non-color cue for WCAG 1.4.1)
      let resultHTML = "";
      if (c.checked === true)  resultHTML = `<div class="card-result card-correct">✓ Correct</div>`;
      if (c.checked === false) resultHTML = `<div class="card-result card-incorrect">✗ Review</div>`;

      el.innerHTML = `
        <div class="ctitle">${escapeHtml(c.title)}</div>
        <div class="cdesc">${escapeHtml(c.desc)}</div>
        ${resultHTML}
      `;

      // Accessible label describes state and how to interact
      const pickupHint = kbSelected === c.id
        ? "Picked up. Tab to a bucket and press Enter or Space to drop. Press Escape to cancel."
        : "Press Enter or Space to pick up.";
      el.setAttribute("aria-label",
        `${c.title}. ${c.desc}. Currently in: ${zoneName(c.zone)}. ${pickupHint}`
      );

      el.addEventListener("dragstart", (ev) => {
        ev.dataTransfer.setData("text/plain", c.id);
        ev.dataTransfer.effectAllowed = "move";
      });

      // Keyboard: Enter/Space toggles picked-up state
      el.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          if (kbSelected === c.id) {
            // Put it back / deselect
            kbSelected = null;
            renderBoard();
            setStatus(`${c.title} put down.`);
          } else {
            kbSelected = c.id;
            renderBoard();
            setStatus(`${c.title} picked up. Tab to a bucket and press Enter or Space to drop.`);
          }
        }
        if (ev.key === "Escape") {
          kbSelected = null;
          renderBoard();
          setStatus("Card drop cancelled.");
        }
      });

      const zoneEl =
        (c.zone === "STAGE")   ? els.zoneStage   :
        (c.zone === "CPIPCE")  ? els.zoneCPIPCE  :
        (c.zone === "PCEDP")   ? els.zonePCEDP   :
        (c.zone === "GDPONLY") ? els.zoneGDPONLY :
        (c.zone === "ALL")     ? els.zoneALL     :
        els.zoneNONE;

      zoneEl.appendChild(el);
    }
  }

  function updateProgress(){
    const total  = cards.length;
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

    els.checkMsg.textContent = placed === 0
      ? "Place some cards first."
      : `${correct}/${placed} placed cards correct.`;

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
    const shuffled = ALL_CARDS.slice();
    shuffle(shuffled);

    const n = Math.min(12, shuffled.length);
    cards = shuffled.slice(0, n).map(c => ({ ...c, zone: "STAGE", checked: null }));
    kbSelected = null;

    els.checkMsg.textContent = "";
    setStatus("New round loaded.");
    renderBoard();
    updateProgress();

    setShock("NONE");
  }

  function resetBoard(){
    for (const c of cards){
      c.zone    = "STAGE";
      c.checked = null;
    }
    kbSelected = null;
    els.checkMsg.textContent = "";
    setStatus("Reset.");
    renderBoard();
    updateProgress();
  }

  // ── Shock buttons: aria-pressed (WCAG 4.1.2) ─────────────────────────────
  const shockBtnMap = {
    IMPORTS: els.shockImports,
    SUBST:   els.shockSubst,
    INVEST:  els.shockInvestment,
    EXPORTS: els.shockExports,
    NONE:    els.shockReset,
  };

  function updateShockPressed(key){
    Object.values(shockBtnMap).forEach(btn =>
      btn.setAttribute("aria-pressed", "false")
    );
    if (shockBtnMap[key]) shockBtnMap[key].setAttribute("aria-pressed", "true");
  }

  // ── Simulation ────────────────────────────────────────────────────────────
  function setShock(key){
    currentShockKey = key;
    const s = SHOCKS[key];
    $("shockName").textContent   = s.name;
    $("shockWinner").textContent = s.winner;
    $("shockWhy").textContent    = s.why;

    updateShockPressed(key);
    drawSimChart(s.path);
    updateSimChartDesc(key, s);
    generateSimQuestions(key);
    renderSimQuestions();
  }

  // ── Canvas ARIA description (WCAG 1.1.1 / 4.1.3) ─────────────────────────
  function updateSimChartDesc(key, s){
    if (!els.simChartDesc) return;
    if (key === "NONE") {
      els.simChartDesc.textContent =
        "No shock selected. All three inflation measures (CPI, PCE, GDP deflator) are at the 2% baseline across all 6 quarters.";
      return;
    }
    const p = s.path;
    const peakCPI = Math.max(...p.cpi).toFixed(1);
    const peakPCE = Math.max(...p.pce).toFixed(1);
    const peakGDP = Math.max(...p.gdp).toFixed(1);
    els.simChartDesc.textContent =
      `${s.name}: ${s.why} ` +
      `CPI peaks at ${peakCPI}%, PCE peaks at ${peakPCE}%, ` +
      `GDP deflator peaks at ${peakGDP}%. Largest mover: ${s.winner}.`;
  }

  // ── Canvas drawing ────────────────────────────────────────────────────────
  function prepareCanvas(canvas){
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth  * dpr;
    const H = canvas.clientHeight * dpr;
    if (canvas.width  !== W || canvas.height !== H){
      canvas.width  = W;
      canvas.height = H;
    }
    ctx.clearRect(0, 0, W, H);
    return { ctx, dpr, W, H };
  }

  function drawSimChart(path){
    // Font-scale factor: respects user browser font-size preference (WCAG 1.4.4)
    const _fs = Math.max(0.75, Math.min(2.5,
      parseFloat(getComputedStyle(document.documentElement).fontSize) / 16));

    const { ctx, dpr, W, H } = prepareCanvas(els.simChart);

    const pad = { l: 52*dpr, r: 14*dpr, t: 18*dpr, b: 42*dpr };
    const X0 = pad.l, X1 = W - pad.r;
    const Y0 = pad.t, Y1 = H - pad.b;

    const T = 6;
    const xToPix = (i) => X0 + i * (X1 - X0) / (T - 1);

    const yMin = -2, yMax = 8;
    const yToPix = (y) => Y0 + (yMax - y) * (Y1 - Y0) / (yMax - yMin);

    // Grid lines
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1 * dpr;
    for (let k = 0; k <= 5; k++){
      const y  = yMin + k * (yMax - yMin) / 5;
      const py = yToPix(y);
      ctx.beginPath(); ctx.moveTo(X0, py); ctx.lineTo(X1, py); ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle    = "rgba(0,0,0,0.55)";
    ctx.font         = `${Math.round(12 * dpr * _fs)}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign    = "right";
    ctx.textBaseline = "middle";
    for (let k = 0; k <= 5; k++){
      const y = yMin + k * (yMax - yMin) / 5;
      ctx.fillText(`${y.toFixed(0)}%`, X0 - 8*dpr, yToPix(y));
    }

    // X-axis labels
    ctx.textAlign    = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i < T; i++){
      ctx.fillText(`Q${i + 1}`, xToPix(i), Y1 + 10*dpr);
    }

    // Chart heading (rendered inside canvas for sighted users; external div is the ARIA label)
    ctx.fillStyle    = "rgba(0,0,0,0.70)";
    ctx.textAlign    = "left";
    ctx.textBaseline = "top";
    ctx.font         = `${Math.round(13 * dpr * _fs)}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.fillText("Inflation paths: CPI vs PCE vs GDP deflator", X0, 0);

    // Line styles: colour + dash pattern so they differ for colour-blind users (WCAG 1.4.1)
    const series = [
      { data: path.cpi, color: "rgba(31,119,180,0.90)", dash: [],              label: "CPI (solid)" },
      { data: path.pce, color: "rgba(0,0,0,0.60)",      dash: [8*dpr, 4*dpr], label: "PCE (dashed)" },
      { data: path.gdp, color: "rgba(200,120,0,1)",     dash: [2*dpr, 5*dpr], label: "GDP deflator (dotted)" },
    ];

    series.forEach(({ data, color, dash }) => {
      ctx.save();
      ctx.setLineDash(dash);
      ctx.strokeStyle = color;
      ctx.lineWidth   = 3 * dpr;
      ctx.beginPath();
      for (let i = 0; i < T; i++){
        const x = xToPix(i);
        const y = yToPix(data[i]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = color;
      for (let i = 0; i < T; i++){
        ctx.beginPath();
        ctx.arc(xToPix(i), yToPix(data[i]), 4.5*dpr, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    });

    // Legend: show colour + dash pattern + text label
    ctx.font         = `${Math.round(12 * dpr * _fs)}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign    = "left";
    ctx.textBaseline = "middle";
    let lx = X0, ly = Y0 + 22*dpr;
    series.forEach(({ color, dash, label }, idx) => {
      const ry = ly + idx * 16*dpr;
      ctx.save();
      ctx.setLineDash(dash);
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(lx, ry);
      ctx.lineTo(lx + 16*dpr, ry);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "rgba(0,0,0,0.70)";
      ctx.fillText(label, lx + 20*dpr, ry);
    });
  }

  // ── Simulation MCQs ───────────────────────────────────────────────────────
  function shuffleChoices(arr){
    const c = arr.slice();
    shuffle(c);
    return c;
  }

  function maxMoverKey(path){
    const q2 = 1;
    const deltas = [
      { key:"CPI", d: Math.abs(path.cpi[q2] - path.cpi[0]) },
      { key:"PCE", d: Math.abs(path.pce[q2] - path.pce[0]) },
      { key:"GDP", d: Math.abs(path.gdp[q2] - path.gdp[0]) },
    ].sort((a, b) => b.d - a.d);
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
      const fb  = document.getElementById(`${q.id}_fb`);
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

  // ── Events ────────────────────────────────────────────────────────────────
  els.newRoundBtn.addEventListener("click", newRound);
  els.resetBtn.addEventListener("click", resetBoard);
  els.checkBtn.addEventListener("click", check);

  els.shockImports.addEventListener("click",    () => setShock("IMPORTS"));
  els.shockSubst.addEventListener("click",      () => setShock("SUBST"));
  els.shockInvestment.addEventListener("click", () => setShock("INVEST"));
  els.shockExports.addEventListener("click",    () => setShock("EXPORTS"));
  els.shockReset.addEventListener("click",      () => setShock("NONE"));

  els.submitSimQs.addEventListener("click", submitSimQuestions);

  // ── Init ──────────────────────────────────────────────────────────────────
  renderBoard();
  newRound();
});
