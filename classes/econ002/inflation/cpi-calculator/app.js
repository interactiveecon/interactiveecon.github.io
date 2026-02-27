window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const els = {
    basketBody: $("basketBody"),
    addRowBtn: $("addRowBtn"),
    exampleBtn: $("exampleBtn"),
    resetBtn: $("resetBtn"),
    status: $("status"),
    warn: $("warn"),

    cpi1: $("cpi1"),
    cpi2: $("cpi2"),
    cpi3: $("cpi3"),
    pi12: $("pi12"),
    pi23: $("pi23"),
    cost1: $("cost1"),
    cost2: $("cost2"),
    cost3: $("cost3"),

    chart: $("chart"),
  };

  function setStatus(msg){ els.status.textContent = msg; }

  // ---- Goods databank (expand anytime) ----
  const GOODS_BANK = [
    "Bread (loaf)", "Milk (gallon)", "Eggs (dozen)", "Chicken (lb)", "Rice (lb)",
    "Coffee (bag)", "Gasoline (gallon)", "Electricity (kWh)", "Rent (month)",
    "Movie ticket", "Haircut", "Gym membership (month)", "Phone plan (month)",
    "Laptop", "Smartphone", "Shoes", "T-shirt", "Toothpaste", "Laundry detergent",
    "Bus fare", "Airline ticket", "Hotel night", "Doctor visit", "Prescription copay",
    "Car insurance (month)", "Streaming subscription (month)", "Restaurant meal",
    "Apples (lb)", "Bananas (lb)", "Orange juice", "Cereal (box)", "Cheese (lb)"
  ];

  // pool of unused goods for random selection
  let unused = [];
  function resetUnused(){
    unused = GOODS_BANK.slice();
    shuffle(unused);
  }

  // ---- Data model ----
  let rows = []; // {id, name, basket, p1, p2, p3}

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

  // ---- Randomization helpers ----
  function shuffle(a){
    for (let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  // Reasonable randomization for “principles”:
  // basket quantities: small integers (1..12)
  // prices: positive, with some dispersion across goods
  function randBasketQty(){
    return 1 + Math.floor(Math.random()*12);
  }

  function randBasePriceForGood(name){
    // rough price tiers by keyword to make examples feel realistic
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
    // groceries / small items
    return randBetween(1.2, 12.0, 0.1);
  }

  function randBetween(lo, hi, step){
    const n = Math.floor((hi - lo) / step);
    const k = Math.floor(Math.random()*(n+1));
    const v = lo + k*step;
    return Math.round(v * 100) / 100;
  }

  // Generate prices across years with moderate inflation/deflation noise
  function randPrices(p1){
    // year-to-year multipliers around ~ -3% to +10%
    const m12 = randBetween(0.97, 1.10, 0.01);
    const m23 = randBetween(0.97, 1.10, 0.01);
    const p2 = round2(p1 * m12);
    const p3 = round2(p2 * m23);
    return { p1: round2(p1), p2, p3 };
  }

  function round2(x){ return Math.round(x*100)/100; }

  function pickRandomGood(){
    if (unused.length === 0) resetUnused();
    return unused.pop();
  }

  // ---- Row operations ----
  function addRandomRow(){
    const name = pickRandomGood();
    const basket = randBasketQty();
    const p1 = randBasePriceForGood(name);
    const prices = randPrices(p1);
    rows.push({ id: uid(), name, basket, p1: prices.p1, p2: prices.p2, p3: prices.p3 });
    render();
    compute();
  }

  function loadExample(){
    rows = [];
    resetUnused();
    for (let i=0;i<3;i++) addRandomRow();
    setStatus("Loaded a random example basket (3 goods).");
  }

  function reset(){
    rows = [];
    resetUnused();
    // start with an empty table; prompt to load example
    render();
    compute();
    setStatus("Click “Load example” to begin.");
  }

  function removeRow(id){
    rows = rows.filter(r => r.id !== id);
    render();
    compute();
  }

  // ---- Rendering ----
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
        <td><input class="tinput small center" data-k="basket" data-id="${r.id}" type="number" step="1" min="0" value="${r.basket}"></td>
        <td><input class="tinput small center" data-k="p1" data-id="${r.id}" type="number" step="0.01" min="0" value="${r.p1}"></td>
        <td><input class="tinput small center" data-k="p2" data-id="${r.id}" type="number" step="0.01" min="0" value="${r.p2}"></td>
        <td><input class="tinput small center" data-k="p3" data-id="${r.id}" type="number" step="0.01" min="0" value="${r.p3}"></td>
        <td>
          <button class="btn subtle" data-del="${r.id}" type="button">Remove</button>
        </td>
      `;
      els.basketBody.appendChild(tr);
    }

    els.basketBody.querySelectorAll("input[data-id]").forEach(inp => {
      inp.addEventListener("input", () => {
        const id = inp.dataset.id;
        const k = inp.dataset.k;
        const row = rows.find(x => x.id === id);
        if (!row) return;
        if (k === "name") row[k] = inp.value;
        else row[k] = num(inp.value);
        compute();
      });
    });

    els.basketBody.querySelectorAll("button[data-del]").forEach(btn => {
      btn.addEventListener("click", () => removeRow(btn.dataset.del));
    });
  }

  // ---- Computation ----
  function sumCost(priceKey){
    let s = 0;
    for (const r of rows){
      const q = r.basket;
      const p = r[priceKey];
      if (!Number.isFinite(q) || !Number.isFinite(p)) return NaN;
      s += q*p;
    }
    return s;
  }

  function compute(){
    if (rows.length === 0){
      els.warn.textContent = "";
      setOutputsNa();
      drawChart([NaN,NaN,NaN]);
      return;
    }

    const bad = rows.some(r =>
      !(Number.isFinite(r.basket) && Number.isFinite(r.p1) && Number.isFinite(r.p2) && Number.isFinite(r.p3))
    );
    els.warn.textContent = bad ? "Some entries are missing or invalid. Results may show —." : "";

    const cost1 = sumCost("p1");
    const cost2 = sumCost("p2");
    const cost3 = sumCost("p3");

    // Base year is Year 1
    const cpi1 = Number.isFinite(cost1) && cost1 !== 0 ? 100 : NaN;
    const cpi2 = Number.isFinite(cost1) && cost1 !== 0 ? 100 * cost2 / cost1 : NaN;
    const cpi3 = Number.isFinite(cost1) && cost1 !== 0 ? 100 * cost3 / cost1 : NaN;

    els.cost1.textContent = `Basket cost: ${fmtMoney(cost1)}`;
    els.cost2.textContent = `Basket cost: ${fmtMoney(cost2)}`;
    els.cost3.textContent = `Basket cost: ${fmtMoney(cost3)}`;

    els.cpi1.textContent = fmtIndex(cpi1);
    els.cpi2.textContent = fmtIndex(cpi2);
    els.cpi3.textContent = fmtIndex(cpi3);

    els.pi12.textContent = (Number.isFinite(cpi2) && Number.isFinite(cpi1) && cpi1 !== 0)
      ? fmtPct((cpi2 - cpi1)/cpi1) : "—";

    els.pi23.textContent = (Number.isFinite(cpi3) && Number.isFinite(cpi2) && cpi2 !== 0)
      ? fmtPct((cpi3 - cpi2)/cpi2) : "—";

    drawChart([cpi1, cpi2, cpi3]);
  }

  function setOutputsNa(){
    els.cost1.textContent = "Basket cost: —";
    els.cost2.textContent = "Basket cost: —";
    els.cost3.textContent = "Basket cost: —";
    els.cpi1.textContent = "—";
    els.cpi2.textContent = "—";
    els.cpi3.textContent = "—";
    els.pi12.textContent = "—";
    els.pi23.textContent = "—";
  }

  // ---- Chart ----
  function drawChart(cpi){
    const canvas = els.chart;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth * dpr;
    const H = canvas.clientHeight * dpr;
    if (canvas.width !== W || canvas.height !== H){
      canvas.width = W; canvas.height = H;
    }
    ctx.clearRect(0,0,W,H);

    const pad = { l: 44*dpr, r: 16*dpr, t: 14*dpr, b: 34*dpr };
    const X0 = pad.l, X1 = W - pad.r;
    const Y0 = pad.t, Y1 = H - pad.b;

    const xToPix = (i) => X0 + i * (X1 - X0) / 2;

    const ok = cpi.every(Number.isFinite);
    const vals = cpi.filter(Number.isFinite);
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

    if (!ok) return;

    // line
    ctx.strokeStyle = "rgba(31,119,180,0.85)";
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    for (let i=0;i<3;i++){
      const x = xToPix(i);
      const y = yToPix(cpi[i]);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    // points
    ctx.fillStyle = "rgba(31,119,180,0.85)";
    for (let i=0;i<3;i++){
      const x = xToPix(i);
      const y = yToPix(cpi[i]);
      ctx.beginPath(); ctx.arc(x,y,5*dpr,0,Math.PI*2); ctx.fill();
    }
  }

  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;");
  }

  // ---- Events ----
  els.addRowBtn.addEventListener("click", () => {
    if (rows.length >= GOODS_BANK.length){
      setStatus("No more unique goods available.");
      return;
    }
    addRandomRow();
    setStatus("Added a random good.");
  });

  els.exampleBtn.addEventListener("click", loadExample);

  els.resetBtn.addEventListener("click", reset);

  // Typeset header formulas once
  const top = document.getElementById("mathTop");
  if (top && window.MathJax?.typesetPromise) window.MathJax.typesetPromise([top]);

  // Start
  reset();
});
