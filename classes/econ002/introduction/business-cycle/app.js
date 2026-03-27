// app.js — Business Cycle Anatomy
// Supports ?disc=1 for discussion section mode:
//   - Limits to DISC_LIMIT scenarios
//   - Changes breadcrumb to "← Week 1"
//   - Shows "Finish & Return" button when all scenarios completed

window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  // ── Disc mode detection ───────────────────────────────────────────────────
  const DISC_MODE  = new URLSearchParams(location.search).get('disc') === '1';
  const DISC_LIMIT = 3;   // 3 scenarios in disc mode
  const WEEK_URL   = '/classes/econ002/discussion/week-01/';

  if (DISC_MODE) {
    const crumb = document.querySelector('.crumb-link');
    if (crumb) { crumb.textContent = '← Week 1'; crumb.href = WEEK_URL; }
  }

  const els = {
    newBtn:      $("newBtn"),
    modePeak:    $("modePeak"),
    modeTrough:  $("modeTrough"),
    checkBtn:    $("checkBtn"),
    resetBtn:    $("resetBtn"),
    status:      $("status"),
    scTitle:     $("scTitle"),
    scDesc:      $("scDesc"),
    hintBox:     $("hintBox"),
    stepText:    $("stepText"),
    feedback:    $("feedback"),
    gdpCanvas:   $("gdpChart"),
    uCanvas:     $("uChart"),
  };

  function setStatus(msg){ els.status.textContent = msg; }
  function showFeedback(html){ els.feedback.style.display = "block"; els.feedback.innerHTML = html; }
  function hideFeedback(){ els.feedback.style.display = "none"; els.feedback.innerHTML = ""; }

  const DATA = window.BCYCLE_DATA;
  if (!DATA) { setStatus("ERROR: data.js did not load."); return; }

  const T = DATA.T;

  let curMeta = null;
  let t = [], gdp = [], unemp = [];
  let truePeakIdx = null, trueTroughIdx = null;
  let placedPeakIdx = null, placedTroughIdx = null;
  let mode    = "PEAK";
  let checked = false;

  // Disc mode tracking
  let scenariosAttempted = 0;
  let scenariosCorrect   = 0;
  let discDone           = false;

  // Shuffle scenarios for disc mode
  let discQueue = [];
  function buildDiscQueue(){
    const pool = DATA.scenarios.slice();
    for (let i = pool.length-1; i > 0; i--){
      const j = Math.floor(Math.random()*(i+1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    discQueue = pool.slice(0, DISC_LIMIT);
  }

  function rand(lo, hi){ return lo + Math.random()*(hi-lo); }
  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

  function argMaxInRange(arr, a, b){
    const lo = clamp(Math.floor(a), 0, arr.length-1);
    const hi = clamp(Math.floor(b), 0, arr.length-1);
    let best = lo, bestV = arr[lo];
    for (let i=lo;i<=hi;i++){ if (arr[i] > bestV){ bestV=arr[i]; best=i; } }
    return best;
  }
  function argMinInRange(arr, a, b){
    const lo = clamp(Math.floor(a), 0, arr.length-1);
    const hi = clamp(Math.floor(b), 0, arr.length-1);
    let best = lo, bestV = arr[lo];
    for (let i=lo;i<=hi;i++){ if (arr[i] < bestV){ bestV=arr[i]; best=i; } }
    return best;
  }
  function snapToLocalExtremum(series, idx, kind){
    const w = 4;
    const lo = clamp(idx-w, 1, series.length-2);
    const hi = clamp(idx+w, 1, series.length-2);
    let best = lo, bestV = series[lo];
    for (let i=lo;i<=hi;i++){
      if (kind==="max" && series[i]>bestV){ bestV=series[i]; best=i; }
      if (kind==="min" && series[i]<bestV){ bestV=series[i]; best=i; }
    }
    return best;
  }

  function makeCycle(metaId){
    t = Array.from({length:T}, (_,i)=>i);
    const base = 100, trendSlope = rand(0.10, 0.22);
    let amp=rand(4,7), width=rand(10,16), dropAmp=rand(5,9), dropWidth=rand(8,14);
    if (metaId==="sharp"){ dropAmp*=1.35; dropWidth*=0.85; amp*=1.05; }
    if (metaId==="mild"){ dropAmp*=0.70; amp*=0.85; }
    if (metaId==="long"){ dropWidth*=1.45; }
    const peakCenter   = Math.floor(rand(30,38));
    const troughCenter = Math.floor(rand(48,58));
    gdp = t.map(i => {
      const trend = base + trendSlope*i;
      const bump  = amp * Math.exp(-0.5*Math.pow((i-peakCenter)/width,2));
      const dip   = dropAmp * Math.exp(-0.5*Math.pow((i-troughCenter)/dropWidth,2));
      return trend + bump - dip + rand(-0.20,0.20);
    });
    truePeakIdx   = argMaxInRange(gdp, peakCenter-10,   peakCenter+10);
    trueTroughIdx = argMinInRange(gdp, troughCenter-12, troughCenter+12);
    if (trueTroughIdx <= truePeakIdx+5) trueTroughIdx = Math.min(T-8, truePeakIdx+12);
    const trendApprox = t.map(i => base + trendSlope*i);
    const gap   = gdp.map((y,i) => y - trendApprox[i]);
    const lag   = Math.floor(rand(4,7));
    const uBase = rand(4.5,6.5), uAmp = rand(0.45,0.80);
    unemp = t.map(i => {
      const j = Math.max(0,i-lag);
      return clamp(uBase - uAmp*gap[j] + rand(-0.10,0.10), 3.0, 10.0);
    });
    placedPeakIdx = null; placedTroughIdx = null;
    checked = false; mode = "PEAK";
    updateModeUI(); hideFeedback(); drawAll();
    if (DISC_MODE){
      setStatus(`Scenario ${scenariosAttempted+1} of ${DISC_LIMIT} — place Peak on GDP chart.`);
    } else {
      setStatus("Click on the GDP chart to place the Peak.");
    }
  }

  // ── Drawing (unchanged from original) ────────────────────────────────────
  function setupCanvas(canvas){
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth*dpr, H = canvas.clientHeight*dpr;
    if (canvas.width!==W||canvas.height!==H){ canvas.width=W; canvas.height=H; }
    return { ctx, W, H, dpr };
  }
  function drawAxes(ctx,W,H,dpr,xLabel,yLabel){
    const pad={l:54*dpr,r:12*dpr,t:14*dpr,b:44*dpr};
    const X0=pad.l,X1=W-pad.r,Y0=pad.t,Y1=H-pad.b;
    ctx.strokeStyle="rgba(0,0,0,0.10)"; ctx.lineWidth=1*dpr;
    for(let i=0;i<=5;i++){const x=X0+i*(X1-X0)/5;ctx.beginPath();ctx.moveTo(x,Y0);ctx.lineTo(x,Y1);ctx.stroke();}
    for(let i=0;i<=4;i++){const y=Y0+i*(Y1-Y0)/4;ctx.beginPath();ctx.moveTo(X0,y);ctx.lineTo(X1,y);ctx.stroke();}
    ctx.fillStyle="rgba(0,0,0,0.70)";
    ctx.font=`${12*dpr}px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial`;
    ctx.textAlign="center";ctx.textBaseline="top";
    ctx.fillText(xLabel,(X0+X1)/2,Y1+14*dpr);
    ctx.save();ctx.translate(X0-40*dpr,(Y0+Y1)/2);ctx.rotate(-Math.PI/2);
    ctx.textAlign="center";ctx.textBaseline="top";ctx.fillText(yLabel,0,0);ctx.restore();
    return {X0,X1,Y0,Y1};
  }
  function drawLine(ctx,X0,X1,Y0,Y1,xs,ys,yMin,yMax,stroke,dpr){
    const xTo=i=>X0+(i/(xs.length-1))*(X1-X0);
    const yTo=v=>Y0+(yMax-v)/(yMax-yMin)*(Y1-Y0);
    ctx.strokeStyle=stroke;ctx.lineWidth=3*dpr;ctx.beginPath();
    for(let i=0;i<xs.length;i++){const x=xTo(i),y=yTo(ys[i]);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
    ctx.stroke();
    return {xTo,yTo};
  }
  function drawMarker(ctx,x,y,color,dpr){
    ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,5*dpr,0,Math.PI*2);ctx.fill();
  }
  function drawVLine(ctx,x,Y0,Y1,dpr){
    ctx.strokeStyle="rgba(0,0,0,0.35)";ctx.lineWidth=2*dpr;
    ctx.setLineDash([4*dpr,6*dpr]);ctx.beginPath();ctx.moveTo(x,Y0);ctx.lineTo(x,Y1);ctx.stroke();ctx.setLineDash([]);
  }
  function shadeInterval(ctx,xLeft,xRight,Y0,Y1,dpr){
    ctx.fillStyle="rgba(0,0,0,0.07)";ctx.strokeStyle="rgba(0,0,0,0.10)";ctx.lineWidth=1*dpr;
    ctx.beginPath();ctx.rect(xLeft,Y0,xRight-xLeft,Y1-Y0);ctx.fill();ctx.stroke();
  }
  function labelAtTop(ctx,x,Y0,text,dpr){
    ctx.fillStyle="rgba(0,0,0,0.70)";
    ctx.font=`${12*dpr}px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial`;
    ctx.textAlign="center";ctx.textBaseline="bottom";ctx.fillText(text,x,Y0-2*dpr);
  }
  function labelAtXAxis(ctx,x,Y1,text,dpr){
    ctx.fillStyle="rgba(0,0,0,0.70)";
    ctx.font=`${12*dpr}px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial`;
    ctx.textAlign="center";ctx.textBaseline="top";ctx.fillText(text,x,Y1+8*dpr);
  }
  function drawAll(){ drawGDP(); drawUnemp(); }
  function drawGDP(){
    const {ctx,W,H,dpr}=setupCanvas(els.gdpCanvas); ctx.clearRect(0,0,W,H);
    const {X0,X1,Y0,Y1}=drawAxes(ctx,W,H,dpr,"Time","Real GDP (index)");
    const yMin=Math.min(...gdp)-1,yMax=Math.max(...gdp)+1;
    const map=drawLine(ctx,X0,X1,Y0,Y1,t,gdp,yMin,yMax,"rgba(0,0,0,0.70)",dpr);
    const xTo=map.xTo,yTo=map.yTo;
    if(checked&&truePeakIdx!=null&&trueTroughIdx!=null){
      shadeInterval(ctx,xTo(truePeakIdx),xTo(trueTroughIdx),Y0,Y1,dpr);
      labelAtTop(ctx,(xTo(truePeakIdx)+xTo(trueTroughIdx))/2,Y0,"Recession",dpr);
    }
    if(checked){
      const xP=xTo(truePeakIdx),yP=yTo(gdp[truePeakIdx]);
      const xT=xTo(trueTroughIdx),yT=yTo(gdp[trueTroughIdx]);
      drawMarker(ctx,xP,yP,"rgba(34,120,34,0.95)",dpr);
      drawMarker(ctx,xT,yT,"rgba(34,120,34,0.95)",dpr);
      drawVLine(ctx,xP,Y0,Y1,dpr); drawVLine(ctx,xT,Y0,Y1,dpr);
      labelAtXAxis(ctx,xP,Y1,"Peak",dpr); labelAtXAxis(ctx,xT,Y1,"Trough",dpr);
    }
    if(placedPeakIdx!=null){
      const x=xTo(placedPeakIdx),y=yTo(gdp[placedPeakIdx]);
      drawMarker(ctx,x,y,"rgba(31,119,180,0.90)",dpr);
      if(!checked) labelAtXAxis(ctx,x,Y1,"Peak",dpr);
    }
    if(placedTroughIdx!=null){
      const x=xTo(placedTroughIdx),y=yTo(gdp[placedTroughIdx]);
      drawMarker(ctx,x,y,"rgba(31,119,180,0.90)",dpr);
      if(!checked) labelAtXAxis(ctx,x,Y1,"Trough",dpr);
    }
  }
  function drawUnemp(){
    const {ctx,W,H,dpr}=setupCanvas(els.uCanvas); ctx.clearRect(0,0,W,H);
    const {X0,X1,Y0,Y1}=drawAxes(ctx,W,H,dpr,"Time","Unemployment (%)");
    const map=drawLine(ctx,X0,X1,Y0,Y1,t,unemp,3.0,10.0,"rgba(230,159,0,0.95)",dpr);
    const xTo=map.xTo;
    if(checked&&truePeakIdx!=null&&trueTroughIdx!=null){
      shadeInterval(ctx,xTo(truePeakIdx),xTo(trueTroughIdx),Y0,Y1,dpr);
      labelAtTop(ctx,(xTo(truePeakIdx)+xTo(trueTroughIdx))/2,Y0,"Recession",dpr);
      drawVLine(ctx,xTo(truePeakIdx),Y0,Y1,dpr);
      drawVLine(ctx,xTo(trueTroughIdx),Y0,Y1,dpr);
    }
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  function updateModeUI(){
    els.modePeak.classList.toggle("primary",   mode==="PEAK");
    els.modePeak.classList.toggle("subtle",    mode!=="PEAK");
    els.modeTrough.classList.toggle("primary", mode==="TROUGH");
    els.modeTrough.classList.toggle("subtle",  mode!=="TROUGH");
    els.stepText.textContent = (mode==="PEAK") ? "Place Peak" : "Place Trough";
  }

  function resetMarkers(){
    placedPeakIdx=null; placedTroughIdx=null; checked=false;
    hideFeedback(); mode="PEAK"; updateModeUI();
    drawAll(); setStatus("Markers cleared. Place the Peak.");
  }

  // ── Finish banner ─────────────────────────────────────────────────────────
  function showFinishBanner(){
    if ($('discFinishBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'discFinishBanner';
    banner.style.cssText = `
      margin-top:16px; padding:16px 20px; border-radius:16px;
      background:rgba(27,127,75,0.08); border:1.5px solid rgba(27,127,75,0.35);
      display:flex; align-items:center; justify-content:space-between;
      flex-wrap:wrap; gap:12px;
    `;
    banner.innerHTML = `
      <div>
        <div style="font-weight:800;color:#1b7f4b;font-size:14px;">
          ✓ All ${DISC_LIMIT} scenarios complete — ${scenariosCorrect} / ${DISC_LIMIT} correct
        </div>
        <div style="font-size:12px;color:#6b7280;margin-top:3px;">
          Wait for your TA to review the answers, then return to Week 1 to continue.
        </div>
      </div>
      <a href="${WEEK_URL}"
         style="padding:10px 20px;background:#1b7f4b;color:#fff;border-radius:12px;
                font-weight:800;font-size:13px;text-decoration:none;white-space:nowrap;">
        ← Return to Week 1
      </a>
    `;
    els.feedback.insertAdjacentElement('afterend', banner);
    discDone = true;
    els.newBtn.disabled     = true;
    els.newBtn.style.opacity = '0.4';
  }

  function check(){
    if (placedPeakIdx==null||placedTroughIdx==null){
      showFeedback(`<span class="tagBad">Not yet</span> Place both a peak and a trough on the GDP chart, then click Check.`);
      setStatus("Place peak and trough first.");
      return;
    }
    const okPeak   = Math.abs(placedPeakIdx   - truePeakIdx)   <= 2;
    const okTrough = Math.abs(placedTroughIdx - trueTroughIdx) <= 2;
    checked = (okPeak && okTrough);
    drawAll();

    scenariosAttempted++;
    if (checked) scenariosCorrect++;

    if (checked){
      showFeedback(`<span class="tagOK">Correct</span>
        <strong>Recession</strong> is the period from <strong>peak → trough</strong> in real GDP.
        Notice unemployment rises during the recession and often remains elevated after the trough (a lag).`);
      setStatus(DISC_MODE
        ? `Correct! (${scenariosAttempted}/${DISC_LIMIT} done)`
        : "Correct. Recession shaded.");
    } else {
      showFeedback(`<span class="tagBad">Try again</span>
        Peak is the highest point before the downturn. Trough is the lowest point before recovery.
        Tip: click near the turning point; the app snaps to the nearest local high/low.`);
      setStatus("Not quite. Adjust your markers and check again.");
    }

    if (DISC_MODE && checked && scenariosAttempted >= DISC_LIMIT){
      showFinishBanner();
    }
  }

  function handleGDPClick(ev){
    if (!gdp.length || discDone) return;
    const rect = els.gdpCanvas.getBoundingClientRect();
    const x    = ev.clientX - rect.left;
    const i    = clamp(Math.round((x/rect.width)*(T-1)), 0, T-1);
    if (mode==="PEAK"){
      placedPeakIdx = snapToLocalExtremum(gdp,i,"max");
      setStatus("Peak placed. Now place the Trough.");
      mode="TROUGH"; updateModeUI();
    } else {
      placedTroughIdx = snapToLocalExtremum(gdp,i,"min");
      setStatus("Trough placed. Click Check.");
    }
    checked=false; hideFeedback(); drawAll();
  }

  // ── Button wiring ─────────────────────────────────────────────────────────
  els.newBtn.addEventListener("click", () => {
    if (DISC_MODE){
      if (discDone){ showFinishBanner(); return; }
      const idx = scenariosAttempted < discQueue.length ? scenariosAttempted : 0;
      curMeta = discQueue[idx % discQueue.length];
    } else {
      curMeta = DATA.scenarios[Math.floor(Math.random()*DATA.scenarios.length)];
    }
    els.scTitle.textContent = curMeta.title;
    els.scDesc.textContent  = curMeta.desc;
    makeCycle(curMeta.id);
  });

  els.modePeak.addEventListener("click",   () => { mode="PEAK";   updateModeUI(); setStatus("Click on GDP chart to place the Peak."); });
  els.modeTrough.addEventListener("click", () => { mode="TROUGH"; updateModeUI(); setStatus("Click on GDP chart to place the Trough."); });
  els.resetBtn.addEventListener("click",   resetMarkers);
  els.checkBtn.addEventListener("click",   check);
  els.gdpCanvas.addEventListener("click",  handleGDPClick);

  // ── Init ──────────────────────────────────────────────────────────────────
  if (DISC_MODE) buildDiscQueue();
  curMeta = DISC_MODE ? discQueue[0] : DATA.scenarios[0];
  els.scTitle.textContent = curMeta.title;
  els.scDesc.textContent  = curMeta.desc;
  makeCycle(curMeta.id);
});
