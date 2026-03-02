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

    qVal: $("qVal"),
    mbVal: $("mbVal"),
    mcVal: $("mcVal"),
    tbVal: $("tbVal"),
    tcVal: $("tcVal"),
    cnbVal: $("cnbVal"),
    stepVal: $("stepVal"),

    lessBtn: $("lessBtn"),
    moreBtn: $("moreBtn"),
    qSlider: $("qSlider"),

    tableBody: $("tableBody"),
    feedback: $("feedback"),

    chart1: $("chart1"),
    chart2: $("chart2"),
    chart3: $("chart3"),
  };

  function setStatus(msg){ els.status.textContent = msg; }
  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

  if (!window.MARGINALISM_CONT || !Array.isArray(window.MARGINALISM_CONT.scenarios)) {
    setStatus("ERROR: data.js did not load (MARGINALISM_CONT missing).");
    return;
  }
  const ALL = window.MARGINALISM_CONT.scenarios;

  let cur = null;
  let q = 0;
  let checked = false;

  // MB(q)=a-bq, MC(q)=c+dq
  const MB = (q) => cur.mb.a - cur.mb.b * q;
  const MC = (q) => cur.mc.c + cur.mc.d * q;

  // TB(q)=∫0^q MB(x) dx = a q - (b/2) q^2
  const TB = (q) => cur.mb.a * q - 0.5 * cur.mb.b * q * q;

  // TC(q)=∫0^q MC(x) dx = c q + (d/2) q^2
  const TC = (q) => cur.mc.c * q + 0.5 * cur.mc.d * q * q;

  const CNB = (q) => TB(q) - TC(q);

  // Optimal q*: MB(q*)=MC(q*) => a - b q* = c + d q* => q* = (a-c)/(b+d)
  function qStar(){
    const a = cur.mb.a, b = cur.mb.b, c = cur.mc.c, d = cur.mc.d;
    const qs = (a - c) / (b + d);
    return clamp(qs, 0, cur.qMax);
  }

  function pickScenario(){
    return ALL[Math.floor(Math.random()*ALL.length)];
  }

  function fmt(x){ return (Number.isFinite(x) ? x.toFixed(2) : "—"); }

  // Adaptive step: move halfway toward q*, but never smaller than 0.01
  // If we are within 0.02 of q*, snap exactly to q* to “land” on it.
  function computeStep(){
    const target = qStar();
    const dist = Math.abs(target - q);
    if (dist <= 0.02) return dist;            // snap range
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
    const dist = target - q;
    const step = computeStep();

    // If close enough, snap
    if (Math.abs(dist) <= 0.02) {
      setQ(target);
      return;
    }

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

    // Start at a non-trivial point
    q = clamp(sc.qMax * 0.25, 0, sc.qMax);
    els.qSlider.value = String(q);

    els.feedback.style.display = "none";
    els.feedback.innerHTML = "";

    setStatus("Use A little more / A little less to move toward MB = MC.");
    renderAll();
  }

  function renderKPIs(){
    els.qVal.textContent = fmt(q);
    els.mbVal.textContent = fmt(MB(q));
    els.mcVal.textContent = fmt(MC(q));
    els.tbVal.textContent = fmt(TB(q));
    els.tcVal.textContent = fmt(TC(q));
    els.cnbVal.textContent = fmt(CNB(q));
    els.stepVal.textContent = fmt(computeStep());
  }

  function renderTable(){
    const qs = qStar();
    const prev = clamp(q - 0.25, 0, cur.qMax);
    const next = clamp(q + 0.25, 0, cur.qMax);

    const rows = [
      { label:"Previous", q: prev },
      { label:"Current",  q: q },
      { label:"Next",     q: next },
      { label:"Optimal",  q: qs }
    ];

    els.tableBody.innerHTML = rows.map(r => {
      const cls = (Math.abs(r.q - q) < 1e-9) ? "cur" : (checked && r.label==="Optimal" ? "opt" : "");
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

  // Canvas helpers
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

  function drawCharts(){
    const qs = qStar();

    // Chart 1: MB & MC
    {
      const { ctx, W, H, dpr } = setupCanvas(els.chart1);
      ctx.clearRect(0,0,W,H);
      const { X0,X1,Y0,Y1 } = drawAxes(ctx,W,H,dpr, "q", "Marginal value");

      // y range
      const samples = [0, cur.qMax, qs, q];
      let yMin = Infinity, yMax = -Infinity;
      for (const x of samples){
        yMin = Math.min(yMin, MB(x), MC(x));
        yMax = Math.max(yMax, MB(x), MC(x));
      }
      yMin = Math.min(yMin, 0);
      yMax = yMax * 1.10;

      const mbMap = drawLine(ctx,X0,X1,Y0,Y1, cur.qMax, yMin,yMax, MB, "rgba(31,119,180,0.90)", dpr);
      const mcMap = drawLine(ctx,X0,X1,Y0,Y1, cur.qMax, yMin,yMax, MC, "rgba(230,159,0,0.95)", dpr);

      const xTo = mbMap.xTo, yTo = mbMap.yTo;
      drawVLine(ctx, xTo(q), Y0, Y1, dpr);
      drawMarker(ctx, xTo(q), yTo(MB(q)), "rgba(31,119,180,0.90)", dpr);
      drawMarker(ctx, xTo(q), yTo(MC(q)), "rgba(230,159,0,0.95)", dpr);

      if (checked){
        drawMarker(ctx, xTo(qs), yTo(MB(qs)), "rgba(34,120,34,0.95)", dpr);
        ctx.fillStyle = "rgba(34,120,34,0.95)";
        ctx.font = `${12*dpr}px system-ui`;
        ctx.textAlign="left"; ctx.textBaseline="bottom";
        ctx.fillText("MB=MC", xTo(qs)+8*dpr, yTo(MB(qs))-6*dpr);
      }
    }

    // Chart 3: TB & TC
    {
      const { ctx, W, H, dpr } = setupCanvas(els.chart3);
      ctx.clearRect(0,0,W,H);
      const { X0,X1,Y0,Y1 } = drawAxes(ctx,W,H,dpr, "q", "Total");

      // y range
      const yMax = Math.max(TB(cur.qMax), TC(cur.qMax)) * 1.05 + 1e-9;
      const yMin = 0;

      const tbMap = drawLine(ctx,X0,X1,Y0,Y1, cur.qMax, yMin,yMax, TB, "rgba(31,119,180,0.90)", dpr);
      drawLine(ctx,X0,X1,Y0,Y1, cur.qMax, yMin,yMax, TC, "rgba(230,159,0,0.95)", dpr);

      const xTo = tbMap.xTo, yTo = tbMap.yTo;
      drawVLine(ctx, xTo(q), Y0, Y1, dpr);
      drawMarker(ctx, xTo(q), yTo(TB(q)), "rgba(31,119,180,0.90)", dpr);
      drawMarker(ctx, xTo(q), yTo(TC(q)), "rgba(230,159,0,0.95)", dpr);
      if (checked){
        drawMarker(ctx, xTo(qs), yTo(TB(qs)), "rgba(34,120,34,0.95)", dpr);
      }
    }

    // Chart 2: CNB
    {
      const { ctx, W, H, dpr } = setupCanvas(els.chart2);
      ctx.clearRect(0,0,W,H);
      const { X0,X1,Y0,Y1 } = drawAxes(ctx,W,H,dpr, "q", "CNB");

      // y range by sampling
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
    renderKPIs();
    renderTable();
    drawCharts();
  }

  function reset(){
    if (!cur) return;
    checked = false;
    setQ(cur.qMax * 0.25);
    els.feedback.style.display = "none";
    els.feedback.innerHTML = "";
    setStatus("Reset quantity. Move toward MB = MC.");
  }

  function check(){
    if (!cur){ setStatus("Click New Scenario first."); return; }
    checked = true;

    const qs = qStar();
    const gap = Math.abs(MB(q) - MC(q));

    const ok = gap <= 0.05; // within 5 cents (or 0.05 units)
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
