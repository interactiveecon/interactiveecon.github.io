window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const els = {
    basketBody: $("basketBody"),
    addRowBtn: $("addRowBtn"),
    exampleBtn: $("exampleBtn"),
    resetBtn: $("resetBtn"),
    status: $("status"),
    warn: $("warn"),

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
    let step = abs * 0.01;                 // 1% of current value
    if (!Number.isFinite(step) || step <= 0) step = 0.01;
    step = Math.max(0.01, round2(step));   // minimum 0.01
    inputEl.step = String(step);
  }

  // ---- Baseline snapshot control ----
  function deepCopyRows(arr){
    return arr.map(r => ({...r}));
  }
  function updateBaselineToCurrent(){
    baselineSnapshot = deepCopyRows(rows);
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
    updateBaselineToCurrent(); // baseline should match the initial loaded values
    render();
    compute();
    setStatus("Loaded a random example basket (3 goods).");
  }

  function reset(){
    rows = [];
    baselineSnapshot = null;
    resetUnused();
    render();
    compute();
    setStatus("Click “Load example” to begin.");
  }

  function removeRow(id){
    rows = rows.filter(r => r.id !== id);
    updateBaselineToCurrent();   // basket changed => baseline updates
    render();
    compute();
  }

  // ---- Rendering ----
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

    // inputs
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

        if (k === "name") {
          row[k] = inp.value;
        } else {
          row[k] = num(inp.value);
        }

        // Basket change => baseline should update to current basket/prices
        if (inp.classList.contains("basket")) {
          updateBaselineToCurrent();
        }

        if (inp.classList.contains("price")) {
          setPercentStep(inp);
        }

        compute();
      });
    });

    // remove
    els.basketBody.querySelectorAll("button[data-del]").forEach(btn => {
      btn.addEventListener("click", () => removeRow(btn.dataset.del));
    });
  }

  // ---- Computation ----
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

    // Ensure we have a baseline snapshot once basket exists
    if (!baselineSnapshot) updateBaselineToCurrent();

    const cur = computeSeries(rows);
    const base = computeSeries(baselineSnapshot);

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

    // grid
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1*dpr;
    for (let k=0;k<=5;k++){
      const y = yMin + k*(yMax-yMin)/5;
      const py = yToPix(y);
      ctx.beginPath(); ctx.moveTo(X0,py); ctx.lineTo(X1,py); ctx.stroke();
    }

    // y labels
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let k=0;k<=5;k++){
      const y = yMin + k*(yMax-yMin)/5;
      ctx.fillText(y.toFixed(0), X0 - 8*dpr, yToPix(y));
    }

    // x labels
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ["Year 1","Year 2","Year 3"].forEach((lab,i)=>{
      ctx.fillText(lab, xToPix(i), Y1 + 8*dpr);
    });

    // title
    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `${13*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.fillText("CPI (base year = 100)", X0, 0);

    // baseline (dashed)
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

    // current (solid)
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

    // Inflation series has meaningful values at indices 1 and 2 (1->2 and 2->3).
    // We'll plot points at Year 2 (index 1) and Year 3 (index 2), and include a 0 line.
    const vals = []
      .concat(basePi || [])
      .concat(curPi || [])
      .filter(Number.isFinite);

    // Choose a symmetric-ish range around 0 for readability
    const maxAbs = vals.length ? Math.max(...vals.map(v => Math.abs(v))) : 0.05;
    const yMax = Math.max(0.06, maxAbs + 0.02);
    const yMin = -yMax;

    const yToPix = (y) => Y0 + (yMax - y) * (Y1 - Y0) / (yMax - yMin);

    // grid
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1*dpr;
    for (let k=0;k<=6;k++){
      const y = yMin + k*(yMax-yMin)/6;
      const py = yToPix(y);
      ctx.beginPath(); ctx.moveTo(X0,py); ctx.lineTo(X1,py); ctx.stroke();
    }

    // 0 line
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 2*dpr;
    ctx.beginPath(); ctx.moveTo(X0, yToPix(0)); ctx.lineTo(X1, yToPix(0)); ctx.stroke();

    // y labels (in %)
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let k=0;k<=6;k+=2){
      const y = yMin + k*(yMax-yMin)/6;
      ctx.fillText(`${(100*y).toFixed(0)}%`, X0 - 8*dpr, yToPix(y));
    }

    // x labels (still Year 1..3 for alignment)
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ["Year 1","Year 2","Year 3"].forEach((lab,i)=>{
      ctx.fillText(lab, xToPix(i), Y1 + 8*dpr);
    });

    // title
    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `${13*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.fillText("Inflation (one-year % change in CPI)", X0, 0);

    // helper to plot only points at i=1,2 and connect them
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

    // baseline dashed grey
    plotPiSeries(basePi, "rgba(0,0,0,0.35)", "rgba(0,0,0,0.35)", true);
    // current solid blue
    plotPiSeries(curPi, "rgba(31,119,180,0.85)", "rgba(31,119,180,0.85)", false);
  }

  // ---- Events ----
  els.addRowBtn.addEventListener("click", () => {
    if (rows.length >= GOODS_BANK.length){
      setStatus("No more unique goods available.");
      return;
    }
    addRandomRow();
    updateBaselineToCurrent(); // basket changed => baseline updates to current
    render();
    compute();
    setStatus("Added a random good (baseline updated).");
  });

  els.exampleBtn.addEventListener("click", loadExample);
  els.resetBtn.addEventListener("click", reset);

  // Typeset header formulas once
  const top = document.getElementById("mathTop");
  if (top && window.MathJax?.typesetPromise) window.MathJax.typesetPromise([top]);

  // Start
  reset();
});
