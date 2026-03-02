// app.js
window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const els = {
    newBtn: $("newBtn"),
    modePeak: $("modePeak"),
    modeTrough: $("modeTrough"),
    checkBtn: $("checkBtn"),
    resetBtn: $("resetBtn"),
    status: $("status"),

    scTitle: $("scTitle"),
    scDesc: $("scDesc"),
    hintBox: $("hintBox"),
    stepText: $("stepText"),
    feedback: $("feedback"),

    gdpCanvas: $("gdpChart"),
    uCanvas: $("uChart"),
  };

  function setStatus(msg){ els.status.textContent = msg; }
  function showFeedback(html){ els.feedback.style.display = "block"; els.feedback.innerHTML = html; }
  function hideFeedback(){ els.feedback.style.display = "none"; els.feedback.innerHTML = ""; }

  const DATA = window.BCYCLE_DATA;
  if (!DATA) { setStatus("ERROR: data.js did not load."); return; }

  const T = DATA.T;

  // State
  let curMeta = null;
  let t = [];
  let gdp = [];
  let unemp = [];

  let truePeakIdx = null;
  let trueTroughIdx = null;

  let placedPeakIdx = null;
  let placedTroughIdx = null;
  let mode = "PEAK"; // or "TROUGH"
  let checked = false;

  // --------- Helpers: random + smooth cycle ----------
  function rand(lo, hi){ return lo + Math.random()*(hi-lo); }

  function makeCycle(metaId){
    // Trend + one main cycle hump/dip with noise
    t = Array.from({length:T}, (_,i)=>i);

    const base = 100;
    const trendSlope = rand(0.10, 0.22);

    // Cycle shape parameters depending on scenario
    let amp = rand(4, 7);
    let width = rand(10, 16);
    let dropAmp = rand(5, 9);
    let dropWidth = rand(8, 14);

    if (metaId === "sharp"){ dropAmp *= 1.35; dropWidth *= 0.85; amp *= 1.05; }
    if (metaId === "mild"){ dropAmp *= 0.70; amp *= 0.85; }
    if (metaId === "long"){ dropWidth *= 1.45; }

    // Place peak around 30-38, trough around 48-58
    const peakCenter = Math.floor(rand(30, 38));
    const troughCenter = Math.floor(rand(48, 58));

    // Build GDP: trend + bump (expansion) - dip (recession) + small noise
    gdp = t.map(i => {
      const trend = base + trendSlope*i;
      const bump = amp * Math.exp(-0.5*Math.pow((i-peakCenter)/width,2));
      const dip  = dropAmp * Math.exp(-0.5*Math.pow((i-troughCenter)/dropWidth,2));
      const noise = rand(-0.20, 0.20);
      return trend + bump - dip + noise;
    });

    // Identify true peak (local max in a window) and trough (local min after peak)
    truePeakIdx = argMaxInRange(gdp, peakCenter-10, peakCenter+10);
    trueTroughIdx = argMinInRange(gdp, troughCenter-12, troughCenter+12);

    // Ensure trough after peak
    if (trueTroughIdx <= truePeakIdx + 5){
      trueTroughIdx = Math.min(T-8, truePeakIdx + 12);
    }

    // Unemployment: inverse of cycle + lag
    // Use GDP deviations from a smoothed trend approximation
    const trendApprox = t.map(i => base + trendSlope*i);
    const gap = gdp.map((y,i)=> y - trendApprox[i]);

    // lag unemployment by 4-7 periods
    const lag = Math.floor(rand(4, 7));
    const uBase = rand(4.5, 6.5);
    const uAmp = rand(0.45, 0.80); // sensitivity to gap

    unemp = t.map(i => {
      const j = Math.max(0, i - lag);
      // negative relation: when gap is low (recession), unemployment higher
      const u = uBase - uAmp*gap[j] + rand(-0.10, 0.10);
      return clamp(u, 3.0, 10.0);
    });

    placedPeakIdx = null;
    placedTroughIdx = null;
    checked = false;
    mode = "PEAK";
    updateModeUI();
    hideFeedback();
    drawAll();
    setStatus("Click on the GDP chart to place the Peak.");
  }

  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

  function argMaxInRange(arr, a, b){
    const lo = clamp(Math.floor(a), 0, arr.length-1);
    const hi = clamp(Math.floor(b), 0, arr.length-1);
    let best = lo, bestV = arr[lo];
    for (let i=lo;i<=hi;i++){
      if (arr[i] > bestV){ bestV = arr[i]; best = i; }
    }
    return best;
  }
  function argMinInRange(arr, a, b){
    const lo = clamp(Math.floor(a), 0, arr.length-1);
    const hi = clamp(Math.floor(b), 0, arr.length-1);
    let best = lo, bestV = arr[lo];
    for (let i=lo;i<=hi;i++){
      if (arr[i] < bestV){ bestV = arr[i]; best = i; }
    }
    return best;
  }

  // Snap click index to nearest local max/min near that index (small window)
  function snapToLocalExtremum(series, idx, kind){
    const w = 4;
    const lo = clamp(idx-w, 1, series.length-2);
    const hi = clamp(idx+w, 1, series.length-2);

    let best = lo;
    let bestV = series[lo];

    for (let i=lo;i<=hi;i++){
      if (kind === "max" && series[i] > bestV){ bestV = series[i]; best = i; }
      if (kind === "min" && series[i] < bestV){ bestV = series[i]; best = i; }
    }
    return best;
  }

  // --------- Drawing (canvas) ----------
  function setupCanvas(canvas){
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth * dpr;
    const H = canvas.clientHeight * dpr;
    if (canvas.width !== W || canvas.height !== H){ canvas.width=W; canvas.height=H; }
    return { ctx, W, H, dpr };
  }

  function drawAxes(ctx, W, H, dpr, xLabel, yLabel){
    const pad = { l: 54*dpr, r: 12*dpr, t: 14*dpr, b: 38*dpr };
    const X0 = pad.l, X1 = W - pad.r;
    const Y0 = pad.t, Y1 = H - pad.b;

    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1*dpr;

    // grid
    for (let i=0;i<=5;i++){
      const x = X0 + i*(X1-X0)/5;
      ctx.beginPath(); ctx.moveTo(x,Y0); ctx.lineTo(x,Y1); ctx.stroke();
    }
    for (let i=0;i<=4;i++){
      const y = Y0 + i*(Y1-Y0)/4;
      ctx.beginPath(); ctx.moveTo(X0,y); ctx.lineTo(X1,y); ctx.stroke();
    }

    // axis labels
    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(xLabel, (X0+X1)/2, Y1 + 14*dpr);

    ctx.save();
    ctx.translate(X0 - 40*dpr, (Y0+Y1)/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    return { X0, X1, Y0, Y1 };
  }

  function drawLine(ctx, X0, X1, Y0, Y1, xs, ys, yMin, yMax, stroke, dpr){
    const xTo = (i) => X0 + (i/(xs.length-1))*(X1-X0);
    const yTo = (v) => Y0 + (yMax - v)/(yMax-yMin)*(Y1-Y0);

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    for (let i=0;i<xs.length;i++){
      const x = xTo(i);
      const y = yTo(ys[i]);
      if (i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    ctx.stroke();

    return { xTo, yTo };
  }

  function drawMarker(ctx, x, y, color, dpr){
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x,y,5*dpr,0,Math.PI*2);
    ctx.fill();
  }

  function drawVLine(ctx, x, Y0, Y1, dpr){
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2*dpr;
    ctx.setLineDash([4*dpr, 6*dpr]);
    ctx.beginPath(); ctx.moveTo(x, Y0); ctx.lineTo(x, Y1); ctx.stroke();
    ctx.setLineDash([]);
  }

  function shadeInterval(ctx, xLeft, xRight, Y0, Y1, dpr){
    ctx.fillStyle = "rgba(0,0,0,0.07)";
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1*dpr;
    ctx.beginPath();
    ctx.rect(xLeft, Y0, xRight-xLeft, Y1-Y0);
    ctx.fill();
    ctx.stroke();
  }

  function labelAtTop(ctx, x, Y0, text, dpr){
    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(text, x, Y0 - 2*dpr);
  }

  function drawAll(){
    drawGDP();
    drawUnemp();
  }

  function drawGDP(){
    const { ctx, W, H, dpr } = setupCanvas(els.gdpCanvas);
    ctx.clearRect(0,0,W,H);

    const { X0,X1,Y0,Y1 } = drawAxes(ctx,W,H,dpr, "Time", "Real GDP (index)");

    const yMin = Math.min(...gdp) - 1;
    const yMax = Math.max(...gdp) + 1;

    const map = drawLine(ctx,X0,X1,Y0,Y1,t,gdp,yMin,yMax,"rgba(0,0,0,0.70)",dpr);
    const xTo = map.xTo, yTo = map.yTo;

    // Shade recession if checked and valid
    if (checked && truePeakIdx != null && trueTroughIdx != null){
      const xl = xTo(truePeakIdx);
      const xr = xTo(trueTroughIdx);
      shadeInterval(ctx, xl, xr, Y0, Y1, dpr);
      labelAtTop(ctx, (xl+xr)/2, Y0, "Recession", dpr);
    }

    // True markers (only after check)
    if (checked){
      drawMarker(ctx, xTo(truePeakIdx), yTo(gdp[truePeakIdx]), "rgba(34,120,34,0.95)", dpr);
      drawMarker(ctx, xTo(trueTroughIdx), yTo(gdp[trueTroughIdx]), "rgba(34,120,34,0.95)", dpr);
      drawVLine(ctx, xTo(truePeakIdx), Y0, Y1, dpr);
      drawVLine(ctx, xTo(trueTroughIdx), Y0, Y1, dpr);
      labelAtTop(ctx, xTo(truePeakIdx), Y0, "Peak", dpr);
      labelAtTop(ctx, xTo(trueTroughIdx), Y0, "Trough", dpr);
    }

    // User markers
    if (placedPeakIdx != null){
      drawMarker(ctx, xTo(placedPeakIdx), yTo(gdp[placedPeakIdx]), "rgba(31,119,180,0.90)", dpr);
      labelAtTop(ctx, xTo(placedPeakIdx), Y0, "Your Peak", dpr);
    }
    if (placedTroughIdx != null){
      drawMarker(ctx, xTo(placedTroughIdx), yTo(gdp[placedTroughIdx]), "rgba(31,119,180,0.90)", dpr);
      labelAtTop(ctx, xTo(placedTroughIdx), Y0, "Your Trough", dpr);
    }
  }

  function drawUnemp(){
    const { ctx, W, H, dpr } = setupCanvas(els.uCanvas);
    ctx.clearRect(0,0,W,H);

    const { X0,X1,Y0,Y1 } = drawAxes(ctx,W,H,dpr, "Time", "Unemployment (%)");

    // Static-ish axis for cleanliness
    const yMin = 3.0;
    const yMax = 10.0;

    const map = drawLine(ctx,X0,X1,Y0,Y1,t,unemp,yMin,yMax,"rgba(230,159,0,0.95)",dpr);
    const xTo = map.xTo;

    if (checked && truePeakIdx != null && trueTroughIdx != null){
      const xl = xTo(truePeakIdx);
      const xr = xTo(trueTroughIdx);
      shadeInterval(ctx, xl, xr, Y0, Y1, dpr);
      labelAtTop(ctx, (xl+xr)/2, Y0, "Recession", dpr);

      // Show the same peak/trough vertical guides to emphasize timing
      drawVLine(ctx, xTo(truePeakIdx), Y0, Y1, dpr);
      drawVLine(ctx, xTo(trueTroughIdx), Y0, Y1, dpr);
    }
  }

  // --------- UI logic ----------
  function updateModeUI(){
    els.modePeak.classList.toggle("primary", mode==="PEAK");
    els.modePeak.classList.toggle("subtle", mode!=="PEAK");
    els.modeTrough.classList.toggle("primary", mode==="TROUGH");
    els.modeTrough.classList.toggle("subtle", mode!=="TROUGH");
    els.stepText.textContent = (mode==="PEAK") ? "Place Peak" : "Place Trough";
  }

  function resetMarkers(){
    placedPeakIdx = null;
    placedTroughIdx = null;
    checked = false;
    hideFeedback();
    mode = "PEAK";
    updateModeUI();
    drawAll();
    setStatus("Markers cleared. Place the Peak.");
  }

  function check(){
    if (placedPeakIdx == null || placedTroughIdx == null){
      showFeedback(`<span class="tagBad">Not yet</span> Place both a peak and a trough on the GDP chart, then click Check.`);
      setStatus("Place peak and trough first.");
      return;
    }

    // Accept if within +/-2 indices of the true ones (snapping should usually make exact)
    const okPeak = Math.abs(placedPeakIdx - truePeakIdx) <= 2;
    const okTrough = Math.abs(placedTroughIdx - trueTroughIdx) <= 2;

    checked = (okPeak && okTrough);
    drawAll();

    if (checked){
      showFeedback(
        `<span class="tagOK">Correct</span>
         <strong>Recession</strong> is the period from <strong>peak → trough</strong> in real GDP.
         Notice unemployment rises during the recession and often remains elevated even after the trough (a lag).`
      );
      setStatus("Correct. Recession shaded.");
    } else {
      showFeedback(
        `<span class="tagBad">Try again</span>
         Peak is the highest point before the downturn. Trough is the lowest point before the recovery.
         Tip: click near the turning point; the app snaps to the nearest local high/low.`
      );
      setStatus("Not quite. Adjust your markers and check again.");
    }
  }

  // Click on GDP chart to place markers
  function handleGDPClick(ev){
    if (!gdp.length) return;

    const rect = els.gdpCanvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;

    // map x -> index
    const idx = Math.round((x / rect.width) * (T-1));
    const i = clamp(idx, 0, T-1);

    if (mode === "PEAK"){
      const snapped = snapToLocalExtremum(gdp, i, "max");
      placedPeakIdx = snapped;
      setStatus("Peak placed. Now place the Trough.");
      mode = "TROUGH";
      updateModeUI();
    } else {
      const snapped = snapToLocalExtremum(gdp, i, "min");
      placedTroughIdx = snapped;
      setStatus("Trough placed. Click Check.");
    }

    checked = false;
    hideFeedback();
    drawAll();
  }

  // Button wiring
  els.newBtn.addEventListener("click", () => {
    curMeta = DATA.scenarios[Math.floor(Math.random()*DATA.scenarios.length)];
    els.scTitle.textContent = curMeta.title;
    els.scDesc.textContent = curMeta.desc;
    makeCycle(curMeta.id);
  });

  els.modePeak.addEventListener("click", () => { mode="PEAK"; updateModeUI(); setStatus("Click on GDP chart to place the Peak."); });
  els.modeTrough.addEventListener("click", () => { mode="TROUGH"; updateModeUI(); setStatus("Click on GDP chart to place the Trough."); });

  els.resetBtn.addEventListener("click", resetMarkers);
  els.checkBtn.addEventListener("click", check);

  els.gdpCanvas.addEventListener("click", handleGDPClick);

  // init
  curMeta = DATA.scenarios[0];
  els.scTitle.textContent = curMeta.title;
  els.scDesc.textContent = curMeta.desc;
  makeCycle(curMeta.id);
});
