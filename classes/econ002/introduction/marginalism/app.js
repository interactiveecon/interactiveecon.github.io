// app.js
window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const els = {
    newBtn: $("newBtn"),
    checkBtn: $("checkBtn"),
    resetBtn: $("resetBtn"),
    status: $("status"),

    scTitle: $("scTitle"),
    scDesc: $("scDesc"),

    qSlider: $("qSlider"),
    qVal: $("qVal"),
    cumVal: $("cumVal"),
    minusBtn: $("minusBtn"),
    plusBtn: $("plusBtn"),

    tableBody: $("tableBody"),
    feedback: $("feedback"),

    chart1: $("chart1"), // MB/MC
    chart2: $("chart2"), // cumulative net benefit
    chart3: $("chart3"), // TB/TC
  };

  function setStatus(msg){ els.status.textContent = msg; }
  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }
  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  }

  if (!window.MARGINALISM_DATA || !Array.isArray(window.MARGINALISM_DATA.scenarios)) {
    setStatus("ERROR: data.js did not load (MARGINALISM_DATA missing).");
    return;
  }
  const ALL = window.MARGINALISM_DATA.scenarios;

  let cur = null;
  let chosenQ = 0;
  let checked = false;

  function pickScenario(){
    return ALL[Math.floor(Math.random()*ALL.length)];
  }

  function computeCumulative(mb, mc){
    const cum = [0]; // net benefit cumulative
    for (let i=1;i<=mb.length;i++){
      const nb = mb[i-1] - mc[i-1];
      cum[i] = cum[i-1] + nb;
    }
    return cum;
  }

  function computeTotals(mb, mc){
    const TB = [0], TC = [0];
    for (let i=1;i<=mb.length;i++){
      TB[i] = TB[i-1] + mb[i-1];
      TC[i] = TC[i-1] + mc[i-1];
    }
    return { TB, TC };
  }

  function optimalQ(mb, mc){
    const cum = computeCumulative(mb, mc);
    let bestQ = 0;
    let bestV = cum[0];
    for (let q=1;q<cum.length;q++){
      if (cum[q] > bestV + 1e-9){
        bestV = cum[q];
        bestQ = q;
      }
    }
    return { bestQ, cum };
  }

  function renderScenario(sc){
    cur = sc;
    checked = false;
    chosenQ = 0;

    els.scTitle.textContent = sc.title;
    els.scDesc.textContent = sc.desc;

    els.qSlider.min = 0;
    els.qSlider.max = sc.units;
    els.qSlider.value = "0";

    els.feedback.style.display = "none";
    els.feedback.innerHTML = "";

    setStatus("Choose a quantity q, then click Check.");
    renderAll();
  }

  function setQ(q){
    if (!cur) return;
    chosenQ = clamp(q, 0, cur.units);
    els.qSlider.value = String(chosenQ);
    renderAll();
  }

  function renderTable(){
    const mb = cur.mb, mc = cur.mc;
    const { bestQ, cum } = optimalQ(mb, mc);

    els.tableBody.innerHTML = "";
    for (let q=1;q<=cur.units;q++){
      const nb = mb[q-1] - mc[q-1];
      const tr = document.createElement("tr");

      if (q === chosenQ) tr.classList.add("sel");
      if (checked && q === bestQ) tr.classList.add("opt");
      if (checked && q === chosenQ && chosenQ !== bestQ) tr.classList.add("badsel");

      tr.innerHTML = `
        <td>Unit ${q}</td>
        <td>${mb[q-1].toFixed(2)}</td>
        <td>${mc[q-1].toFixed(2)}</td>
        <td>${nb.toFixed(2)}</td>
        <td>${cum[q].toFixed(2)}</td>
      `;
      els.tableBody.appendChild(tr);
    }

    els.qVal.textContent = String(chosenQ);
    els.cumVal.textContent = String(cum[chosenQ].toFixed(0));
  }

  // --- canvas helpers ---
  function setupCanvas(canvas){
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth * dpr;
    const H = canvas.clientHeight * dpr;
    if (canvas.width !== W || canvas.height !== H){
      canvas.width = W; canvas.height = H;
    }
    return { ctx, W, H, dpr };
  }

  function drawAxes(ctx, W, H, dpr, xLabel, yLabel){
    const pad = { l: 44*dpr, r: 14*dpr, t: 14*dpr, b: 34*dpr };
    const X0 = pad.l, X1 = W - pad.r;
    const Y0 = pad.t, Y1 = H - pad.b;

    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1*dpr;
    for (let i=0;i<=5;i++){
      const x = X0 + i*(X1-X0)/5;
      ctx.beginPath(); ctx.moveTo(x,Y0); ctx.lineTo(x,Y1); ctx.stroke();
    }
    for (let i=0;i<=5;i++){
      const y = Y0 + i*(Y1-Y0)/5;
      ctx.beginPath(); ctx.moveTo(X0,y); ctx.lineTo(X1,y); ctx.stroke();
    }

    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(xLabel, (X0+X1)/2, Y1 + 10*dpr);

    ctx.save();
    ctx.translate(X0 - 30*dpr, (Y0+Y1)/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    return { X0, X1, Y0, Y1 };
  }

  function drawStep(vals, n, ctx, X0, X1, Y0, Y1, yMax, stroke, dpr){
    const xTo = (q) => X0 + (q / n) * (X1 - X0);
    const yTo = (v) => Y0 + (yMax - v) / yMax * (Y1 - Y0);

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    ctx.moveTo(xTo(0), yTo(vals[0]));
    for (let q=1;q<=n;q++){
      const vPrev = vals[q-1];
      ctx.lineTo(xTo(q), yTo(vPrev));
      if (q < n){
        const vNext = vals[q];
        ctx.lineTo(xTo(q), yTo(vNext));
      }
    }
    ctx.stroke();
  }

  function drawLine(vals, n, ctx, X0, X1, Y0, Y1, yMin, yMax, stroke, dpr){
    const xTo = (q) => X0 + (q / n) * (X1 - X0);
    const yTo = (v) => Y0 + (yMax - v) / (yMax - yMin) * (Y1 - Y0);

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    ctx.moveTo(xTo(0), yTo(vals[0]));
    for (let q=1;q<=n;q++){
      ctx.lineTo(xTo(q), yTo(vals[q]));
    }
    ctx.stroke();
  }

  function drawMBMC(){
    const { ctx, W, H, dpr } = setupCanvas(els.chart1);
    ctx.clearRect(0,0,W,H);

    const { X0, X1, Y0, Y1 } = drawAxes(ctx, W, H, dpr, "Quantity (q)", "Value per unit");

    const mb = cur.mb, mc = cur.mc;
    const n = cur.units;
    const yMax = Math.max(...mb, ...mc) * 1.10;

    drawStep(mb, n, ctx, X0, X1, Y0, Y1, yMax, "rgba(31,119,180,0.90)", dpr); // MB
    drawStep(mc, n, ctx, X0, X1, Y0, Y1, yMax, "rgba(230,159,0,0.95)", dpr);  // MC

    // chosen q marker
    const xTo = (q) => X0 + (q / n) * (X1 - X0);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2*dpr;
    ctx.setLineDash([4*dpr, 6*dpr]);
    ctx.beginPath(); ctx.moveTo(xTo(chosenQ), Y0); ctx.lineTo(xTo(chosenQ), Y1); ctx.stroke();
    ctx.setLineDash([]);

    // legend
    ctx.fillStyle = "rgba(31,119,180,0.90)";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText("MB", X0 + 6*dpr, Y0 + 6*dpr);
    ctx.fillStyle = "rgba(230,159,0,0.95)";
    ctx.fillText("MC", X0 + 6*dpr, Y0 + 22*dpr);
  }

  function drawCum(){
    const { ctx, W, H, dpr } = setupCanvas(els.chart2);
    ctx.clearRect(0,0,W,H);

    const { X0, X1, Y0, Y1 } = drawAxes(ctx, W, H, dpr, "Quantity (q)", "Cumulative net benefit");

    const { bestQ, cum } = optimalQ(cur.mb, cur.mc);
    const n = cur.units;

    const maxAbs = Math.max(...cum.map(v => Math.abs(v))) * 1.20 + 1e-9;
    const yMin = -maxAbs, yMax = maxAbs;

    // zero line
    const yTo = (v) => Y0 + (yMax - v) / (yMax - yMin) * (Y1 - Y0);
    ctx.strokeStyle = "rgba(0,0,0,0.20)";
    ctx.lineWidth = 2*dpr;
    ctx.beginPath(); ctx.moveTo(X0, yTo(0)); ctx.lineTo(X1, yTo(0)); ctx.stroke();

    drawLine(cum, n, ctx, X0, X1, Y0, Y1, yMin, yMax, "rgba(0,0,0,0.70)", dpr);

    // chosen point
    const xTo = (q) => X0 + (q / n) * (X1 - X0);
    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.beginPath(); ctx.arc(xTo(chosenQ), yTo(cum[chosenQ]), 5*dpr, 0, Math.PI*2); ctx.fill();

    if (checked){
      ctx.fillStyle = "rgba(34,120,34,0.95)";
      ctx.beginPath(); ctx.arc(xTo(bestQ), yTo(cum[bestQ]), 6*dpr, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "rgba(34,120,34,0.95)";
      ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
      ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillText("Optimal", xTo(bestQ) + 8*dpr, yTo(cum[bestQ]) - 6*dpr);
    }
  }

  function drawTBTC(){
    const { ctx, W, H, dpr } = setupCanvas(els.chart3);
    ctx.clearRect(0,0,W,H);

    const { X0, X1, Y0, Y1 } = drawAxes(ctx, W, H, dpr, "Quantity (q)", "Total");

    const n = cur.units;
    const { TB, TC } = computeTotals(cur.mb, cur.mc);

    const yMax = Math.max(...TB, ...TC) * 1.08 + 1e-9;
    const yMin = 0;

    drawLine(TB, n, ctx, X0, X1, Y0, Y1, yMin, yMax, "rgba(31,119,180,0.90)", dpr); // TB
    drawLine(TC, n, ctx, X0, X1, Y0, Y1, yMin, yMax, "rgba(230,159,0,0.95)", dpr); // TC

    // chosen marker
    const xTo = (q) => X0 + (q / n) * (X1 - X0);
    const yTo = (v) => Y0 + (yMax - v) / (yMax - yMin) * (Y1 - Y0);

    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2*dpr;
    ctx.setLineDash([4*dpr, 6*dpr]);
    ctx.beginPath(); ctx.moveTo(xTo(chosenQ), Y0); ctx.lineTo(xTo(chosenQ), Y1); ctx.stroke();
    ctx.setLineDash([]);

    // legend
    ctx.fillStyle = "rgba(31,119,180,0.90)";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText("TB", X0 + 6*dpr, Y0 + 6*dpr);
    ctx.fillStyle = "rgba(230,159,0,0.95)";
    ctx.fillText("TC", X0 + 6*dpr, Y0 + 22*dpr);

    // mark chosen points
    ctx.fillStyle = "rgba(31,119,180,0.90)";
    ctx.beginPath(); ctx.arc(xTo(chosenQ), yTo(TB[chosenQ]), 5*dpr, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "rgba(230,159,0,0.95)";
    ctx.beginPath(); ctx.arc(xTo(chosenQ), yTo(TC[chosenQ]), 5*dpr, 0, Math.PI*2); ctx.fill();
  }

  function renderAll(){
    if (!cur) return;
    renderTable();
    drawMBMC();
    drawTBTC();
    drawCum();
  }

  function reset(){
    if (!cur) return;
    checked = false;
    setQ(0);
    els.feedback.style.display = "none";
    els.feedback.innerHTML = "";
    setStatus("Selection reset.");
  }

  function check(){
    if (!cur){
      setStatus("Click New Scenario first.");
      return;
    }
    checked = true;

    const { bestQ, cum } = optimalQ(cur.mb, cur.mc);
    const ok = (chosenQ === bestQ);

    const mbNext = (chosenQ < cur.units) ? cur.mb[chosenQ] : null;
    const mcNext = (chosenQ < cur.units) ? cur.mc[chosenQ] : null;

    let explain = "";
if (chosenQ === cur.units){
  explain = "You chose the maximum quantity. The marginal rule says: take another unit only if MB ≥ MC.";
} else {
  explain = `At the next unit (unit ${chosenQ+1}), MB is ${mbNext} and MC is ${mcNext}. `;
  explain += (mbNext >= mcNext)
    ? "Since MB ≥ MC, taking one more unit increases (or keeps) net benefit."
    : "Since MB < MC, taking one more unit would reduce net benefit—so you should stop.";

  explain += ` In this scenario, the optimal stopping point is unit ${bestQ}, where MB equals MC exactly.`;
}

    els.feedback.style.display = "block";
    els.feedback.innerHTML = `
      ${ok ? `<span class="tagOK">Correct</span>` : `<span class="tagBad">Not quite</span>`}
      <strong>Optimal quantity:</strong> ${bestQ}.<br>
      <strong>Your cumulative net benefit at q=${chosenQ}:</strong> ${cum[chosenQ].toFixed(0)}.<br>
      <strong>Cumulative net benefit at the optimum:</strong> ${cum[bestQ].toFixed(0)}.<br><br>
      <strong>Marginal reasoning:</strong> ${escapeHtml(explain)}
    `;

    renderAll();
    setStatus(ok ? "Nice — correct stopping rule." : "Check the highlighted optimal row and try again.");
  }

  // Events
  els.newBtn.addEventListener("click", () => renderScenario(pickScenario()));
  els.resetBtn.addEventListener("click", reset);
  els.checkBtn.addEventListener("click", check);

  els.qSlider.addEventListener("input", () => {
    checked = false;
    els.feedback.style.display = "none";
    setQ(Number(els.qSlider.value));
  });

  els.minusBtn.addEventListener("click", () => setQ(chosenQ - 1));
  els.plusBtn.addEventListener("click", () => setQ(chosenQ + 1));

  renderScenario(pickScenario());
});
