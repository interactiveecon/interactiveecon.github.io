window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const els = {
    basketBody: $("basketBody"),
    addRowBtn: $("addRowBtn"),
    exampleBtn: $("exampleBtn"),
    resetBtn: $("resetBtn"),
    status: $("status"),
    warn: $("warn"),
    resetToBaseBtn: $("resetToBaseBtn"),

    cost1Val: $("cost1Val"),
    cost2Val: $("cost2Val"),
    cost3Val: $("cost3Val"),
    cpi1: $("cpi1"),
    cpi2: $("cpi2"),
    cpi3: $("cpi3"),
    pi12: $("pi12"),
    pi23: $("pi23"),

    cpiChart: $("cpiChart"),
    piChart: $("piChart"),

    mcqMeta: $("mcqMeta"),
    mcqList: $("mcqList"),
    newQsBtn: $("newQsBtn"),
    submitQsBtn: $("submitQsBtn"),
  };

  function setStatus(msg){ els.status.textContent = msg; }

  // ---- Goods databank ----
  const GOODS_BANK = [
    "Bread (loaf)", "Milk (gallon)", "Eggs (dozen)", "Chicken (lb)", "Rice (lb)",
    "Coffee (bag)", "Gasoline (gallon)", "Electricity (kWh)", "Rent (month)",
    "Movie ticket", "Haircut", "Gym membership (month)", "Phone plan (month)",
    "Laptop", "Smartphone", "Shoes", "T-shirt", "Toothpaste", "Laundry detergent",
    "Bus fare", "Airline ticket", "Hotel night", "Doctor visit", "Prescription copay",
    "Car insurance (month)", "Streaming subscription (month)", "Restaurant meal",
    "Apples (lb)", "Bananas (lb)", "Orange juice", "Cereal (box)", "Cheese (lb)"
  ];

  let unused = [];
  function shuffle(a){
    for (let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }
  function resetUnused(){
    unused = GOODS_BANK.slice();
    shuffle(unused);
  }
  function pickRandomGood(){
    if (unused.length === 0) resetUnused();
    return unused.pop();
  }

  // ---- Data model ----
  let rows = []; // {id, name, basket, p1, p2, p3}
  let baselineSnapshot = null; // deep copy of rows when basket last changed

  function uid(){ return "g" + Math.random().toString(16).slice(2,10); }
  function num(v){
    const x = Number(v);
    return Number.isFinite(x) ? x : NaN;
  }
  function fmtMoney(x){
    if (!Number.isFinite(x)) return "—";
    return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtIndex(x){
    if (!Number.isFinite(x)) return "—";
    return x.toFixed(2);
  }
  function fmtPct(x){
    if (!Number.isFinite(x)) return "—";
    return (100*x).toFixed(2) + "%";
  }
  function round2(x){ return Math.round(x*100)/100; }

  // ---- Randomization ----
  function randBetween(lo, hi, step){
    const n = Math.floor((hi - lo) / step);
    const k = Math.floor(Math.random()*(n+1));
    return round2(lo + k*step);
  }
  function randBasketQty(){ return 1 + Math.floor(Math.random()*12); } // 1..12

  function randBasePriceForGood(name){
    const n = name.toLowerCase();
    if (n.includes("rent")) return randBetween(1200, 2400, 10);
    if (n.includes("laptop")) return randBetween(700, 1300, 10);
    if (n.includes("smartphone")) return randBetween(600, 1100, 10);
    if (n.includes("airline")) return randBetween(180, 520, 5);
    if (n.includes("hotel")) return randBetween(120, 320, 5);
    if (n.includes("doctor")) return randBetween(80, 220, 5);
    if (n.includes("insurance")) return randBetween(90, 220, 1);
    if (n.includes("phone plan")) return randBetween(35, 95, 1);
    if (n.includes("gym")) return randBetween(25, 90, 1);
    if (n.includes("streaming")) return randBetween(8, 22, 0.5);
    if (n.includes("gasoline")) return randBetween(2.8, 5.2, 0.05);
    if (n.includes("electricity")) return randBetween(0.12, 0.35, 0.01);
    if (n.includes("movie")) return randBetween(10, 20, 0.5);
    if (n.includes("haircut")) return randBetween(18, 55, 1);
    if (n.includes("restaurant")) return randBetween(12, 35, 1);
    return randBetween(1.2, 12.0, 0.1);
  }

  function randPrices(p1){
    const m12 = randBetween(0.97, 1.10, 0.01);
    const m23 = randBetween(0.97, 1.10, 0.01);
    const p2 = round2(p1 * m12);
    const p3 = round2(p2 * m23);
    return { p1: round2(p1), p2, p3 };
  }

  // ---- Dynamic 1% step for price inputs ----
  function setPercentStep(inputEl){
    const v = num(inputEl.value);
    const abs = Number.isFinite(v) ? Math.abs(v) : 0;
    let step = abs * 0.01;
    if (!Number.isFinite(step) || step <= 0) step = 0.01;
    step = Math.max(0.01, round2(step));
    inputEl.step = String(step);
  }

  // ---- Baseline snapshot control ----
  function deepCopyRows(arr){ return arr.map(r => ({...r})); }
  function updateBaselineToCurrent(){
    baselineSnapshot = deepCopyRows(rows);
  }

  // ---- Computation helpers ----
  function sumCost(srcRows, priceKey){
    let s = 0;
    for (const r of srcRows){
      const q = r.basket;
      const p = r[priceKey];
      if (!Number.isFinite(q) || !Number.isFinite(p)) return NaN;
      s += q*p;
    }
    return s;
  }

  function computeSeries(srcRows){
    const cost1 = sumCost(srcRows, "p1");
    const cost2 = sumCost(srcRows, "p2");
    const cost3 = sumCost(srcRows, "p3");

    const cpi1 = Number.isFinite(cost1) && cost1 !== 0 ? 100 : NaN;
    const cpi2 = Number.isFinite(cost1) && cost1 !== 0 ? 100 * cost2 / cost1 : NaN;
    const cpi3 = Number.isFinite(cost1) && cost1 !== 0 ? 100 * cost3 / cost1 : NaN;

    const pi12 = (Number.isFinite(cpi2) && Number.isFinite(cpi1) && cpi1 !== 0) ? (cpi2 - cpi1)/cpi1 : NaN;
    const pi23 = (Number.isFinite(cpi3) && Number.isFinite(cpi2) && cpi2 !== 0) ? (cpi3 - cpi2)/cpi2 : NaN;

    return { cost1, cost2, cost3, cpi: [cpi1, cpi2, cpi3], pi: [NaN, pi12, pi23] };
  }

  function currentAndBaselineSeries(){
    if (!baselineSnapshot) updateBaselineToCurrent();
    return {
      cur: computeSeries(rows),
      base: computeSeries(baselineSnapshot),
    };
  }

  // ---- Row operations ----
  function addRandomRow(){
    const name = pickRandomGood();
    const basket = randBasketQty();
    const p1 = randBasePriceForGood(name);
    const prices = randPrices(p1);
    rows.push({ id: uid(), name, basket, p1: prices.p1, p2: prices.p2, p3: prices.p3 });
  }

  function loadExample(){
    rows = [];
    resetUnused();
    for (let i=0;i<3;i++) addRandomRow();
    updateBaselineToCurrent();
    render();
    compute();
    regenerateQuestions(true);
    setStatus("Loaded a random example basket (3 goods).");
  }

  function reset(){
    rows = [];
    baselineSnapshot = null;
    resetUnused();
    render();
    compute();
    clearQuestions();
    setStatus("Click “Load example” to begin.");
  }

  function removeRow(id){
    rows = rows.filter(r => r.id !== id);
    updateBaselineToCurrent();
    render();
    compute();
    regenerateQuestions(true);
  }

  // ---- Rendering table ----
  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;");
  }

  function render(){
    els.basketBody.innerHTML = "";

    if (rows.length === 0){
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td colspan="6" class="muted" style="padding:14px;">
          No goods yet. Click <strong>Load example</strong> or <strong>Add good</strong>.
        </td>
      `;
      els.basketBody.appendChild(tr);
      return;
    }

    for (const r of rows){
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input class="tinput" data-k="name" data-id="${r.id}" value="${escapeHtml(r.name)}"></td>
        <td><input class="tinput small center basket" data-k="basket" data-id="${r.id}" type="number" step="1" min="0" value="${r.basket}"></td>
        <td><input class="tinput small center price" data-k="p1" data-id="${r.id}" type="number" min="0" value="${r.p1}"></td>
        <td><input class="tinput small center price" data-k="p2" data-id="${r.id}" type="number" min="0" value="${r.p2}"></td>
        <td><input class="tinput small center price" data-k="p3" data-id="${r.id}" type="number" min="0" value="${r.p3}"></td>
        <td>
          <button class="btn subtle" data-del="${r.id}" type="button">Remove</button>
        </td>
      `;
      els.basketBody.appendChild(tr);
    }

    els.basketBody.querySelectorAll("input[data-id]").forEach(inp => {
      if (inp.classList.contains("price")) {
        setPercentStep(inp);
        inp.addEventListener("focus", () => setPercentStep(inp));
        inp.addEventListener("pointerdown", () => setPercentStep(inp));
      }

      inp.addEventListener("input", () => {
        const id = inp.dataset.id;
        const k = inp.dataset.k;
        const row = rows.find(x => x.id === id);
        if (!row) return;

        if (k === "name") row[k] = inp.value;
        else row[k] = num(inp.value);

        if (inp.classList.contains("basket")) {
          updateBaselineToCurrent();     // basket change resets baseline
          regenerateQuestions(true);
        }

        if (inp.classList.contains("price")) setPercentStep(inp);

        compute();
        // prices change -> questions stay valid, but regenerate on demand
      });
    });

    els.basketBody.querySelectorAll("button[data-del]").forEach(btn => {
      btn.addEventListener("click", () => removeRow(btn.dataset.del));
    });
  }

  // ---- Compute + update UI ----
  function setOutputsNa(){
    els.cost1Val.textContent = "—";
    els.cost2Val.textContent = "—";
    els.cost3Val.textContent = "—";
    els.cpi1.textContent = "—";
    els.cpi2.textContent = "—";
    els.cpi3.textContent = "—";
    els.pi12.textContent = "—";
    els.pi23.textContent = "—";
  }

  function compute(){
    if (rows.length === 0){
      els.warn.textContent = "";
      setOutputsNa();
      drawCpiChart(null, null);
      drawPiChart(null, null);
      return;
    }

    const bad = rows.some(r =>
      !(Number.isFinite(r.basket) && Number.isFinite(r.p1) && Number.isFinite(r.p2) && Number.isFinite(r.p3))
    );
    els.warn.textContent = bad ? "Some entries are missing or invalid. Results may show —." : "";

    if (!baselineSnapshot) updateBaselineToCurrent();

    const { cur, base } = currentAndBaselineSeries();

    els.cost1Val.textContent = fmtMoney(cur.cost1);
    els.cost2Val.textContent = fmtMoney(cur.cost2);
    els.cost3Val.textContent = fmtMoney(cur.cost3);

    els.cpi1.textContent = fmtIndex(cur.cpi[0]);
    els.cpi2.textContent = fmtIndex(cur.cpi[1]);
    els.cpi3.textContent = fmtIndex(cur.cpi[2]);

    els.pi12.textContent = fmtPct(cur.pi[1]);
    els.pi23.textContent = fmtPct(cur.pi[2]);

    drawCpiChart(base.cpi, cur.cpi);
    drawPiChart(base.pi, cur.pi);
  }

  // ---- Charts ----
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

  function drawCpiChart(baseCpi, curCpi){
    const { ctx, dpr, W, H } = prepareCanvas(els.cpiChart);

    const pad = { l: 44*dpr, r: 16*dpr, t: 14*dpr, b: 34*dpr };
    const X0 = pad.l, X1 = W - pad.r;
    const Y0 = pad.t, Y1 = H - pad.b;
    const xToPix = (i) => X0 + i * (X1 - X0) / 2;

    const vals = []
      .concat(baseCpi || [])
      .concat(curCpi || [])
      .filter(Number.isFinite);

    const yMin = 90;
    const yMax = vals.length ? Math.max(110, Math.max(...vals) + 10) : 120;
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
      ctx.fillText(y.toFixed(0), X0 - 8*dpr, yToPix(y));
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ["Year 1","Year 2","Year 3"].forEach((lab,i)=>{
      ctx.fillText(lab, xToPix(i), Y1 + 8*dpr);
    });

    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `${13*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.fillText("CPI (base year = 100)", X0, 0);

    if (baseCpi && baseCpi.every(Number.isFinite)){
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2*dpr;
      ctx.setLineDash([6*dpr, 6*dpr]);
      ctx.beginPath();
      for (let i=0;i<3;i++){
        const x = xToPix(i);
        const y = yToPix(baseCpi[i]);
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(0,0,0,0.35)";
      for (let i=0;i<3;i++){
        ctx.beginPath();
        ctx.arc(xToPix(i), yToPix(baseCpi[i]), 4*dpr, 0, Math.PI*2);
        ctx.fill();
      }
    }

    if (curCpi && curCpi.every(Number.isFinite)){
      ctx.strokeStyle = "rgba(31,119,180,0.85)";
      ctx.lineWidth = 3*dpr;
      ctx.beginPath();
      for (let i=0;i<3;i++){
        const x = xToPix(i);
        const y = yToPix(curCpi[i]);
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();

      ctx.fillStyle = "rgba(31,119,180,0.85)";
      for (let i=0;i<3;i++){
        ctx.beginPath();
        ctx.arc(xToPix(i), yToPix(curCpi[i]), 5*dpr, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }

  function drawPiChart(basePi, curPi){
    const { ctx, dpr, W, H } = prepareCanvas(els.piChart);

    const pad = { l: 44*dpr, r: 16*dpr, t: 14*dpr, b: 34*dpr };
    const X0 = pad.l, X1 = W - pad.r;
    const Y0 = pad.t, Y1 = H - pad.b;
    const xToPix = (i) => X0 + i * (X1 - X0) / 2;

    const vals = []
      .concat(basePi || [])
      .concat(curPi || [])
      .filter(Number.isFinite);

    const maxAbs = vals.length ? Math.max(...vals.map(v => Math.abs(v))) : 0.05;
    const yMax = Math.max(0.06, maxAbs + 0.02);
    const yMin = -yMax;
    const yToPix = (y) => Y0 + (yMax - y) * (Y1 - Y0) / (yMax - yMin);

    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1*dpr;
    for (let k=0;k<=6;k++){
      const y = yMin + k*(yMax-yMin)/6;
      const py = yToPix(y);
      ctx.beginPath(); ctx.moveTo(X0,py); ctx.lineTo(X1,py); ctx.stroke();
    }

    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 2*dpr;
    ctx.beginPath(); ctx.moveTo(X0, yToPix(0)); ctx.lineTo(X1, yToPix(0)); ctx.stroke();

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let k=0;k<=6;k+=2){
      const y = yMin + k*(yMax-yMin)/6;
      ctx.fillText(`${(100*y).toFixed(0)}%`, X0 - 8*dpr, yToPix(y));
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ["Year 1","Year 2","Year 3"].forEach((lab,i)=>{
      ctx.fillText(lab, xToPix(i), Y1 + 8*dpr);
    });

    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `${13*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.fillText("Inflation (one-year % change in CPI)", X0, 0);

    function plotPiSeries(series, strokeStyle, pointStyle, dashed){
      if (!series || !Number.isFinite(series[1]) || !Number.isFinite(series[2])) return;
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 3*dpr;
      ctx.setLineDash(dashed ? [6*dpr, 6*dpr] : []);
      ctx.beginPath();
      ctx.moveTo(xToPix(1), yToPix(series[1]));
      ctx.lineTo(xToPix(2), yToPix(series[2]));
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = pointStyle;
      [1,2].forEach(i=>{
        ctx.beginPath();
        ctx.arc(xToPix(i), yToPix(series[i]), 5*dpr, 0, Math.PI*2);
        ctx.fill();
      });
    }

    plotPiSeries(basePi, "rgba(0,0,0,0.35)", "rgba(0,0,0,0.35)", true);
    plotPiSeries(curPi, "rgba(31,119,180,0.85)", "rgba(31,119,180,0.85)", false);
  }

  // =========================
  // MCQ GENERATION (A,B,C,D,E,H)
  // =========================
  let currentQs = []; // {id, prompt, choices:[{key,text}], correctKey, explain}

  function clearQuestions(){
    currentQs = [];
    els.mcqMeta.textContent = "Load an example to generate questions.";
    els.mcqList.innerHTML = "";
  }

  function regenerateQuestions(force=false){
    if (rows.length === 0){
      clearQuestions();
      return;
    }
    // If not force and questions already exist, keep them
    if (!force && currentQs.length) return;

    const { cur } = currentAndBaselineSeries();

    // Build a pool of generators; then sample 5 distinct ones
    const gens = [
      genA_Driver_12,
      genA_Driver_23,
      genB_PercentVsContribution,
      genC_OnePriceChange,
      genD_BaseYearDenominator,
      genE_WhichStatsChange_Y3,
      genH_LargestWeight
    ];

    const picked = sampleWithoutReplacement(gens, Math.min(5, gens.length));
    currentQs = picked.map((fn, idx) => {
      const q = fn(cur);
      return { id: "q" + (idx+1), ...q };
    });

    renderQuestions();
  }

  function renderQuestions(){
    els.mcqList.innerHTML = "";
    els.mcqMeta.textContent = `Questions are based on your current basket (${rows.length} good${rows.length===1?"":"s"}).`;

    currentQs.forEach((q, qi) => {
      const wrap = document.createElement("div");
      wrap.className = "qcard";
      wrap.innerHTML = `
        <div class="qtitle">${qi+1}. ${escapeHtml(q.prompt)}</div>
        <div class="choices" role="radiogroup" aria-label="Question ${qi+1}">
          ${q.choices.map(ch => `
            <label class="choice">
              <input type="radio" name="${q.id}" value="${escapeHtml(ch.key)}">
              <div>${escapeHtml(ch.text)}</div>
            </label>
          `).join("")}
        </div>
        <div class="feedback" id="${q.id}_fb"></div>
      `;
      els.mcqList.appendChild(wrap);
    });
  }

  function submitQuestions(){
    if (!currentQs.length) return;

    currentQs.forEach(q => {
      const sel = els.mcqList.querySelector(`input[name="${q.id}"]:checked`);
      const fb = document.getElementById(`${q.id}_fb`);
      const chosen = sel ? sel.value : null;

      const ok = (chosen === q.correctKey);
      fb.style.display = "block";
      fb.innerHTML = `
        ${ok ? `<span class="tagOK">Correct</span>` : `<span class="tagBad">Not quite</span>`}
        <strong>Answer:</strong> ${escapeHtml(choiceText(q, q.correctKey))}<br>
        <strong>Why:</strong> ${escapeHtml(q.explain)}
      `;
    });
  }

  function choiceText(q, key){
    const hit = q.choices.find(c => c.key === key);
    return hit ? hit.text : "(missing)";
  }

  function resetPricesToBaseline(){
  if (!baselineSnapshot || rows.length === 0) return;

  // Match rows by name (stable) first; fallback by index if needed.
  const baseByName = new Map(baselineSnapshot.map(r => [r.name, r]));

  rows.forEach((r, i) => {
    const b = baseByName.get(r.name) || baselineSnapshot[i];
    if (!b) return;
    r.p1 = b.p1;
    r.p2 = b.p2;
    r.p3 = b.p3;
  });

  render();   // refresh table inputs
  compute();  // recompute CPI/inflation + redraw charts
  setStatus("Prices reset to baseline (dashed) values.");
}

  // ---- Generators ----

  // A (1->2): biggest basket-weighted price increase ΔCi = basket*(p2-p1)
  function genA_Driver_12(){
    const contribs = rows.map(r => ({
      name: r.name,
      dC: r.basket * (r.p2 - r.p1)
    }));
    const best = maxBy(contribs, x => x.dC);
    const distractors = topK(contribs.filter(x => x.name !== best.name), 3, x => x.dC);
    const choices = shuffleCopy([best, ...distractors]).map(x => ({ key: x.name, text: x.name }));

    return {
      prompt: `From Year 1 → Year 2, which good contributes the most to the change in CPI?`,
      choices,
      correctKey: best.name,
      explain: `CPI uses a fixed basket. The biggest driver is the largest basket-weighted price change: Basket × (P2 − P1).`
    };
  }

  // A (2->3)
  function genA_Driver_23(){
    const contribs = rows.map(r => ({
      name: r.name,
      dC: r.basket * (r.p3 - r.p2)
    }));
    const best = maxBy(contribs, x => x.dC);
    const distractors = topK(contribs.filter(x => x.name !== best.name), 3, x => x.dC);
    const choices = shuffleCopy([best, ...distractors]).map(x => ({ key: x.name, text: x.name }));

    return {
      prompt: `From Year 2 → Year 3, which good contributes the most to the change in CPI?`,
      choices,
      correctKey: best.name,
      explain: `The biggest impact comes from the largest basket-weighted price change: Basket × (P3 − P2).`
    };
  }

  // B: percent change misconception (always B is correct)
  function genB_PercentVsContribution(){
    // pick a good with largest % increase from 1->2 (if possible)
    const pct = rows.map(r => ({
      name: r.name,
      pct: (r.p1 !== 0) ? (r.p2 - r.p1)/r.p1 : 0
    }));
    const best = maxBy(pct, x => x.pct);

    return {
      prompt: `The price of “${best.name}” rose by the largest percent from Year 1 → Year 2. Does that guarantee it raised CPI the most?`,
      choices: [
        { key:"A", text:"Yes—largest percent increase always matters most" },
        { key:"B", text:"No—CPI impact depends on Basket × dollar price change" },
        { key:"C", text:"No—CPI ignores price changes for individual goods" },
        { key:"D", text:"Yes—but only if the basket is fixed" }
      ],
      correctKey: "B",
      explain: `CPI is based on the dollar cost of the fixed basket. A large percent change on a tiny basket item may matter less than a moderate change on a heavily weighted item.`
    };
  }

  // C: if only Year-2 price of a good increases, CPI2 and inflation 1→2 rise (unless basket=0)
  function genC_OnePriceChange(){
    const r = rows[Math.floor(Math.random()*rows.length)];
    const basketZero = !Number.isFinite(r.basket) || r.basket === 0;

    const correct = basketZero ? "D" : "A";
    return {
      prompt: `Suppose only the Year 2 price of “${r.name}” increases (everything else unchanged). What happens to CPI (Year 2) and inflation (1→2)?`,
      choices: [
        { key:"A", text:"CPI (Year 2) rises; inflation (1→2) rises" },
        { key:"B", text:"CPI (Year 2) falls; inflation (1→2) rises" },
        { key:"C", text:"CPI (Year 2) rises; inflation (1→2) falls" },
        { key:"D", text:"CPI (Year 2) doesn’t change; inflation (1→2) doesn’t change" }
      ],
      correctKey: correct,
      explain: basketZero
        ? `Because the basket amount for that good is zero, changing its price does not change the basket cost, so CPI and inflation do not change.`
        : `Raising any included Year-2 price increases the Year-2 basket cost, which raises CPI (Year 2) and the 1→2 inflation rate.`
    };
  }

  // D: increase a base-year (Year 1) price -> CPI2 falls (denominator bigger), holding Year2 fixed
  function genD_BaseYearDenominator(){
    const r = rows[Math.floor(Math.random()*rows.length)];
    return {
      prompt: `If we increase the Year 1 price of “${r.name}” (holding all Year 2 prices fixed), what happens to CPI (Year 2)?`,
      choices: [
        { key:"A", text:"CPI (Year 2) rises" },
        { key:"B", text:"CPI (Year 2) falls" },
        { key:"C", text:"CPI (Year 2) stays the same" },
        { key:"D", text:"Not enough information" }
      ],
      correctKey: "B",
      explain: `CPI(Year 2) = 100 × Cost2 / Cost1. Increasing a Year-1 price raises Cost1 (the denominator), so the ratio falls if Cost2 is unchanged.`
    };
  }

  // E: only a Year-3 price increases -> CPI3 and inflation 2→3 change
  function genE_WhichStatsChange_Y3(){
    const r = rows[Math.floor(Math.random()*rows.length)];
    return {
      prompt: `The only change is that the Year 3 price of “${r.name}” increases. Which statistic(s) change?`,
      choices: [
        { key:"A", text:"CPI (Year 2) and inflation (1→2)" },
        { key:"B", text:"CPI (Year 3) and inflation (2→3)" },
        { key:"C", text:"CPI (Year 1) and inflation (1→2)" },
        { key:"D", text:"All CPI values and both inflation rates" }
      ],
      correctKey: "B",
      explain: `Year-3 prices affect only the Year-3 basket cost, so CPI (Year 3) changes and the 2→3 inflation rate changes.`
    };
  }

  // H: largest weight based on base-year spending share ~ basket * p1
  function genH_LargestWeight(){
    const weights = rows.map(r => ({
      name: r.name,
      w: r.basket * r.p1
    }));
    const best = maxBy(weights, x => x.w);
    const distractors = topK(weights.filter(x => x.name !== best.name), 3, x => x.w);
    const choices = shuffleCopy([best, ...distractors]).map(x => ({ key: x.name, text: x.name }));

    return {
      prompt: `Which good has the largest weight in the CPI basket (based on Year 1 spending)?`,
      choices,
      correctKey: best.name,
      explain: `CPI weights reflect base-year spending shares. A larger Basket × Year-1 price implies a larger weight.`
    };
  }

  // ---- MCQ utilities ----
  function sampleWithoutReplacement(arr, k){
    const copy = arr.slice();
    shuffle(copy);
    return copy.slice(0, k);
  }
  function shuffleCopy(arr){
    const copy = arr.slice();
    shuffle(copy);
    return copy;
  }
  function maxBy(arr, fn){
    let best = arr[0];
    let bestVal = fn(best);
    for (let i=1;i<arr.length;i++){
      const v = fn(arr[i]);
      if (v > bestVal){
        best = arr[i];
        bestVal = v;
      }
    }
    return best;
  }
  function topK(arr, k, fn){
    return arr
      .slice()
      .sort((a,b) => fn(b) - fn(a))
      .slice(0, Math.min(k, arr.length));
  }

  // ---- MCQ event wiring ----
  els.newQsBtn.addEventListener("click", () => regenerateQuestions(true));
  els.submitQsBtn.addEventListener("click", submitQuestions);
  els.resetToBaseBtn.addEventListener("click", resetPricesToBaseline);

  // ---- Charts + MCQs should update on basket changes; prices update compute only ----
  function afterBasketStructureChange(){
    updateBaselineToCurrent();
    compute();
    regenerateQuestions(true);
  }

  // ---- Events ----
  els.addRowBtn.addEventListener("click", () => {
    if (rows.length >= GOODS_BANK.length){
      setStatus("No more unique goods available.");
      return;
    }
    addRandomRow();
    afterBasketStructureChange();
    render();
    setStatus("Added a random good (baseline updated).");
  });

  els.exampleBtn.addEventListener("click", loadExample);
  els.resetBtn.addEventListener("click", reset);

  // Typeset header once
  const top = document.getElementById("mathTop");
  if (top && window.MathJax?.typesetPromise) window.MathJax.typesetPromise([top]);

  // ---- Init ----
  reset();
});
