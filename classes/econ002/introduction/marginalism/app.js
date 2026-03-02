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

    stepVal: $("stepVal"),
    lessBtn: $("lessBtn"),
    moreBtn: $("moreBtn"),
    qSlider: $("qSlider"),

    tableBody: $("tableBody"),
    feedback: $("feedback"),

    chart1: $("chart1"), // MB/MC
    chart2: $("chart2"), // CNB
    chart3: $("chart3"), // TB/TC
  };

  function setStatus(msg){ els.status.textContent = msg; }
  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }
  function fmt(x){ return (Number.isFinite(x) ? x.toFixed(2) : "—"); }

  if (!window.MARGINALISM_CONT || !Array.isArray(window.MARGINALISM_CONT.scenarios)) {
    setStatus("ERROR: data.js did not load (MARGINALISM_CONT missing).");
    return;
  }
  const ALL = window.MARGINALISM_CONT.scenarios;

  let cur = null;
  let q = 0;
  let checked = false;

  // MB(q)=a-bq, MC(q)=c+dq
  const MB = (x) => cur.mb.a - cur.mb.b * x;
  const MC = (x) => cur.mc.c + cur.mc.d * x;

  // TB(q)=∫0^q MB(x) dx = a q - (b/2) q^2
  const TB = (x) => cur.mb.a * x - 0.5 * cur.mb.b * x * x;

  // TC(q)=∫0^q MC(x) dx = c q + (d/2) q^2
  const TC = (x) => cur.mc.c * x + 0.5 * cur.mc.d * x * x;

  const CNB = (x) => TB(x) - TC(x);

  // Optimal q*: MB(q*)=MC(q*) => q*=(a-c)/(b+d)
  function qStar(){
    const a = cur.mb.a, b = cur.mb.b, c = cur.mc.c, d = cur.mc.d;
    return clamp((a - c) / (b + d), 0, cur.qMax);
  }

  function pickScenario(){
    return ALL[Math.floor(Math.random()*ALL.length)];
  }

  // Step size: move halfway toward q*, capped. Snap if step < 0.25.
  function computeStep(){
    const target = qStar();
    const dist = Math.abs(target - q);
    return Math.max(0.01, Math.min(0.75, dist/2));
  }

  function setQ(newQ){
    if (!cur) return;
    checked = false;
    q = clamp(newQ, 0, cur.qMax);
    els.qSlider.value = String(q);
    renderAll();
  }

  function stepToward(dir){
    const target = qStar();
    const step = computeStep();

    if (step < 0.25) { setQ(target); return; }
    if (dir === "more") setQ(q + step);
    else setQ(q - step);
  }

  function renderScenario(sc){
    cur = sc;
    checked = false;

    els.scTitle.textContent = sc.title;
    els.scDesc.textContent = sc.desc;

    els.qSlider.min = 0;
    els.qSlider.max = sc.qMax;
    els.qSlider.step = 0.01;

    // start randomly above/below q*
    const qs = qStar();
    const startDist = 2.0 + Math.random()*2.0;
    const startBelow = Math.random() < 0.5;
    q = clamp(startBelow ? (qs - startDist) : (qs + startDist), 0, sc.qMax);
    els.qSlider.value = String(q);

    els.feedback.style.display = "none";
    els.feedback.innerHTML = "";

    setStatus("Use A little more / A little less to move toward MB = MC.");
    renderAll();
  }

  function renderStep(){
    els.stepVal.textContent = fmt(computeStep());
  }

  function renderTable(){
    const qs = qStar();
    const qMinus = clamp(q - 1, 0, cur.qMax);
    const qPlus  = clamp(q + 1, 0, cur.qMax);

    const rows = [
      { label:"Current − 1", q: qMinus },
      { label:"Current",     q: q },
      { label:"Current + 1", q: qPlus },
      { label:"Optimal",     q: qs }
    ];

    els.tableBody.innerHTML = rows.map(r => {
      const isCur = Math.abs(r.q - q) < 1e-9;
      const cls = isCur ? "cur" : (checked && r.label==="Optimal" ? "opt" : "");
      return `
        <tr class="${cls}">
          <td>${r.label}</td>
          <td>${fmt(r.q)}</td>
          <td>${fmt(MB(r.q))}</td>
          <td>${fmt(MC(r.q))}</td>
          <td>${fmt(TB(r.q))}</td>
          <td>${fmt(TC(r.q))}</td>
          <td>${fmt(CNB(r.q))}</td>
        </tr>
      `;
    }).join("");
  }

  // ----- Canvas helpers -----
  function setupCanvas(canvas){
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth * dpr;
    const H = canvas.clientHeight * dpr;
    if (canvas.width !== W || canvas.height !== H){ canvas.width = W; canvas.height = H; }
    return { ctx, W, H, dpr };
  }

  function drawAxes(ctx, W, H, dpr, xLabel, yLabel){
    const pad = { l: 46*dpr, r: 14*dpr, t: 14*dpr, b: 34*dpr };
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
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(xLabel, (X0+X1)/2, Y1 + 10*dpr);

    ctx.save();
    ctx.translate(X0 - 32*dpr, (Y0+Y1)/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    return { X0, X1, Y0, Y1 };
  }

  function drawLine(ctx, X0,X1,Y0,Y1, qMax, yMin,yMax, f, stroke, dpr){
    const xTo = (x) => X0 + (x/qMax)*(X1-X0);
    const yTo = (y) => Y0 + (yMax - y)/(yMax - yMin)*(Y1-Y0);

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();

    const N = 200;
    for (let i=0;i<=N;i++){
      const x = (i/N)*qMax;
      const y = f(x);
      if (i===0) ctx.moveTo(xTo(x), yTo(y));
      else ctx.lineTo(xTo(x), yTo(y));
    }
    ctx.stroke();
    return { xTo, yTo };
  }

  function drawMarker(ctx, x, y, color, dpr){
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 5*dpr, 0, Math.PI*2);
    ctx.fill();
  }

  function drawVLine(ctx, x, Y0, Y1, dpr){
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2*dpr;
    ctx.setLineDash([4*dpr, 6*dpr]);
    ctx.beginPath(); ctx.moveTo(x, Y0); ctx.lineTo(x, Y1); ctx.stroke();
    ctx.setLineDash([]);
  }

  // NEW: dashed horizontal line from dot to y-axis
  function drawHToYAxis(ctx, xDot, yDot, xAxisLeft, dpr){
    ctx.strokeStyle = "rgba(0,0,0,0.30)";
    ctx.lineWidth = 2*dpr;
    ctx.setLineDash([4*dpr, 6*dpr]);
    ctx.beginPath();
    ctx.moveTo(xAxisLeft, yDot);
    ctx.lineTo(xDot, yDot);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // NEW: legend box
  function drawLegend(ctx, X0, Y0, dpr, items){
    // items: [{label, color}]
    const pad = 8*dpr;
    const lineW = 18*dpr;
    const lineH = 16*dpr;

    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    const widths = items.map(it => ctx.measureText(it.label).width);
    const boxW = pad*2 + lineW + 8*dpr + Math.max(...widths);
    const boxH = pad*2 + items.length*lineH;

    // box
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1*dpr;
    ctx.beginPath();
    ctx.roundRect(X0 + 6*dpr, Y0 + 6*dpr, boxW, boxH, 10*dpr);
    ctx.fill();
    ctx.stroke();

    // items
    let y = Y0 + 6*dpr + pad + 2*dpr;
    for (const it of items){
      const x = X0 + 6*dpr + pad;
      ctx.strokeStyle = it.color;
      ctx.lineWidth = 3*dpr;
      ctx.beginPath();
      ctx.moveTo(x, y + 5*dpr);
      ctx.lineTo(x + lineW, y + 5*dpr);
      ctx.stroke();

      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(it.label, x + lineW + 8*dpr, y + 5*dpr);
      y += lineH;
    }
  }

  // roundRect polyfill for older canvas contexts
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
      const rr = Math.min(r, w/2, h/2);
      this.beginPath();
      this.moveTo(x+rr, y);
      this.arcTo(x+w, y, x+w, y+h, rr);
      this.arcTo(x+w, y+h, x, y+h, rr);
      this.arcTo(x, y+h, x, y, rr);
      this.arcTo(x, y, x+w, y, rr);
      this.closePath();
      return this;
    };
  }

  function drawCharts(){
    const qs = qStar();

    // Chart 1: MB & MC (with legend + dashed y guides for dots)
    {
      const { ctx, W, H, dpr } = setupCanvas(els.chart1);
      ctx.clearRect(0,0,W,H);
      const { X0,X1,Y0,Y1 } = drawAxes(ctx,W,H,dpr, "q", "Marginal value");

      const yMin = Math.min(MB(cur.qMax), MC(0), 0);
      const yMax = Math.max(MB(0), MC(cur.qMax)) * 1.10;

      const mbColor = "rgba(31,119,180,0.90)";
      const mcColor = "rgba(230,159,0,0.95)";

      const mbMap = drawLine(ctx,X0,X1,Y0,Y1, cur.qMax, yMin,yMax, MB, mbColor, dpr);
      drawLine(ctx,X0,X1,Y0,Y1, cur.qMax, yMin,yMax, MC, mcColor, dpr);

      // legend
      drawLegend(ctx, X0, Y0, dpr, [
        { label:"MB", color: mbColor },
        { label:"MC", color: mcColor }
      ]);

      const xTo = mbMap.xTo, yTo = mbMap.yTo;

      // vertical at q
      drawVLine(ctx, xTo(q), Y0, Y1, dpr);

      // dots
      const mbDotY = yTo(MB(q));
      const mcDotY = yTo(MC(q));
      const xDot = xTo(q);

      // dashed horizontal guides to y-axis
      drawHToYAxis(ctx, xDot, mbDotY, X0, dpr);
      drawHToYAxis(ctx, xDot, mcDotY, X0, dpr);

      drawMarker(ctx, xDot, mbDotY, mbColor, dpr);
      drawMarker(ctx, xDot, mcDotY, mcColor, dpr);

      if (checked){
        drawMarker(ctx, xTo(qs), yTo(MB(qs)), "rgba(34,120,34,0.95)", dpr);
        ctx.fillStyle = "rgba(34,120,34,0.95)";
        ctx.font = `${12*dpr}px system-ui`;
        ctx.textAlign="left"; ctx.textBaseline="bottom";
        ctx.fillText("MB=MC", xTo(qs)+8*dpr, yTo(MB(qs))-6*dpr);
      }
    }

    // Chart 3: TB & TC (with legend + dashed y guides for dots)
    {
      const { ctx, W, H, dpr } = setupCanvas(els.chart3);
      ctx.clearRect(0,0,W,H);
      const { X0,X1,Y0,Y1 } = drawAxes(ctx,W,H,dpr, "q", "Total");

      const yMax = Math.max(TB(cur.qMax), TC(cur.qMax)) * 1.05 + 1e-9;

      const tbColor = "rgba(31,119,180,0.90)";
      const tcColor = "rgba(230,159,0,0.95)";

      const tbMap = drawLine(ctx,X0,X1,Y0,Y1, cur.qMax, 0,yMax, TB, tbColor, dpr);
      drawLine(ctx,X0,X1,Y0,Y1, cur.qMax, 0,yMax, TC, tcColor, dpr);

      drawLegend(ctx, X0, Y0, dpr, [
        { label:"TB", color: tbColor },
        { label:"TC", color: tcColor }
      ]);

      const xTo = tbMap.xTo, yTo = tbMap.yTo;
      drawVLine(ctx, xTo(q), Y0, Y1, dpr);

      const xDot = xTo(q);
      const tbDotY = yTo(TB(q));
      const tcDotY = yTo(TC(q));

      drawHToYAxis(ctx, xDot, tbDotY, X0, dpr);
      drawHToYAxis(ctx, xDot, tcDotY, X0, dpr);

      drawMarker(ctx, xDot, tbDotY, tbColor, dpr);
      drawMarker(ctx, xDot, tcDotY, tcColor, dpr);

      if (checked){
        drawMarker(ctx, xTo(qs), yTo(TB(qs)), "rgba(34,120,34,0.95)", dpr);
      }
    }

    // Chart 2: CNB (leave as-is)
    {
      const { ctx, W, H, dpr } = setupCanvas(els.chart2);
      ctx.clearRect(0,0,W,H);
      const { X0,X1,Y0,Y1 } = drawAxes(ctx,W,H,dpr, "q", "CNB");

      let ymin = Infinity, ymax = -Infinity;
      for (let i=0;i<=200;i++){
        const x = (i/200)*cur.qMax;
        const y = CNB(x);
        ymin = Math.min(ymin, y);
        ymax = Math.max(ymax, y);
      }
      const pad = 0.10*(ymax - ymin + 1e-9);
      ymin -= pad; ymax += pad;

      const nbMap = drawLine(ctx,X0,X1,Y0,Y1, cur.qMax, ymin,ymax, CNB, "rgba(0,0,0,0.75)", dpr);
      const xTo = nbMap.xTo, yTo = nbMap.yTo;

      drawVLine(ctx, xTo(q), Y0, Y1, dpr);
      drawMarker(ctx, xTo(q), yTo(CNB(q)), "rgba(0,0,0,0.75)", dpr);

      if (checked){
        drawMarker(ctx, xTo(qs), yTo(CNB(qs)), "rgba(34,120,34,0.95)", dpr);
        ctx.fillStyle = "rgba(34,120,34,0.95)";
        ctx.font = `${12*dpr}px system-ui`;
        ctx.textAlign="left"; ctx.textBaseline="bottom";
        ctx.fillText("Max", xTo(qs)+8*dpr, yTo(CNB(qs))-6*dpr);
      }
    }
  }

  function renderAll(){
    if (!cur) return;
    renderStep();
    renderTable();
    drawCharts();
  }

  function reset(){
    if (!cur) return;
    checked = false;

    const qs = qStar();
    const startDist = 2.0 + Math.random()*2.0;
    const startBelow = Math.random() < 0.5;
    setQ(startBelow ? (qs - startDist) : (qs + startDist));

    els.feedback.style.display = "none";
    els.feedback.innerHTML = "";
    setStatus("Reset quantity. Move toward MB = MC.");
  }

  function check(){
    if (!cur){ setStatus("Click New Scenario first."); return; }
    checked = true;

    const qs = qStar();
    const gap = Math.abs(MB(q) - MC(q));
    const ok = gap <= 0.05;

    els.feedback.style.display = "block";
    els.feedback.innerHTML = `
      ${ok ? `<span class="tagOK">Close enough</span>` : `<span class="tagBad">Not yet</span>`}
      <strong>Optimal q*</strong> is ${fmt(qs)} where <strong>MB = MC</strong>.<br>
      At your q=${fmt(q)}, MB−MC = ${fmt(MB(q) - MC(q))}.<br><br>
      <strong>Interpretation:</strong> If MB &gt; MC, doing a little more increases net benefit. If MB &lt; MC, doing a little less increases net benefit.
    `;

    renderAll();
    setStatus(ok ? "Nice — you’re at the marginal optimum." : "Use the buttons to move toward MB = MC.");
  }

  // Events
  els.newBtn.addEventListener("click", () => renderScenario(pickScenario()));
  els.resetBtn.addEventListener("click", reset);
  els.checkBtn.addEventListener("click", check);

  els.moreBtn.addEventListener("click", () => stepToward("more"));
  els.lessBtn.addEventListener("click", () => stepToward("less"));

  els.qSlider.addEventListener("input", () => {
    checked = false;
    setQ(Number(els.qSlider.value));
    els.feedback.style.display = "none";
  });

  renderScenario(pickScenario());
});
