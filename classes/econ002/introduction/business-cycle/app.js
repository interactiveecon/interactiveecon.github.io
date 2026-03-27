// app.js — Business Cycle Anatomy
// Disc mode (?disc=1): 3 scenarios, two-attempt flow, session recording.
// Normal mode: unlimited scenarios, no session recording.

window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  // ── Disc mode ─────────────────────────────────────────────────────────────
  const DISC_MODE  = new URLSearchParams(location.search).get('disc') === '1';
  const DISC_LIMIT = 3;
  const LAB_ID     = 'business-cycle';
  const LAB_LABEL  = 'Business Cycle Anatomy';
  const WEEK_URL   = '/classes/econ002/discussion/week-01/';

  if (DISC_MODE) {
    const crumb = document.querySelector('.crumb-link');
    if (crumb) { crumb.textContent = '← Week 1'; crumb.href = WEEK_URL; }
  }

  const els = {
    newBtn:     $("newBtn"),
    modePeak:   $("modePeak"),
    modeTrough: $("modeTrough"),
    checkBtn:   $("checkBtn"),
    resetBtn:   $("resetBtn"),
    status:     $("status"),
    scTitle:    $("scTitle"),
    scDesc:     $("scDesc"),
    hintBox:    $("hintBox"),
    stepText:   $("stepText"),
    feedback:   $("feedback"),
    gdpCanvas:  $("gdpChart"),
    uCanvas:    $("uChart"),
  };

  function setStatus(msg) { els.status.textContent = msg; }
  function showFeedback(html) { els.feedback.style.display = "block"; els.feedback.innerHTML = html; }
  function hideFeedback()     { els.feedback.style.display = "none";  els.feedback.innerHTML = ""; }

  const DATA = window.BCYCLE_DATA;
  if (!DATA) { setStatus("ERROR: data.js did not load."); return; }

  const T = DATA.T;

  // ── Chart state ───────────────────────────────────────────────────────────
  let curMeta = null;
  let t = [], gdp = [], unemp = [];
  let truePeakIdx = null, trueTroughIdx = null;
  let placedPeakIdx = null, placedTroughIdx = null;
  let mode = "PEAK";

  // phase: 'placing' | 'first-submitted' | 'revising' | 'done'
  let phase = 'placing';

  // Disc mode score tracking
  let discQueue           = [];
  let scenariosCompleted  = 0;
  let firstCorrectCount   = 0;
  let finalCorrectCount   = 0;
  let discDone            = false;

  // Per-scenario first attempt
  let firstPeakIdx   = null;
  let firstTroughIdx = null;
  let firstWasCorrect = false;

  function rand(lo, hi) { return lo + Math.random()*(hi-lo); }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function argMaxInRange(arr, a, b) {
    const lo = clamp(Math.floor(a), 0, arr.length-1);
    const hi = clamp(Math.floor(b), 0, arr.length-1);
    let best = lo, bestV = arr[lo];
    for (let i=lo; i<=hi; i++) if (arr[i]>bestV) { bestV=arr[i]; best=i; }
    return best;
  }
  function argMinInRange(arr, a, b) {
    const lo = clamp(Math.floor(a), 0, arr.length-1);
    const hi = clamp(Math.floor(b), 0, arr.length-1);
    let best = lo, bestV = arr[lo];
    for (let i=lo; i<=hi; i++) if (arr[i]<bestV) { bestV=arr[i]; best=i; }
    return best;
  }
  function snapToLocalExtremum(series, idx, kind) {
    const w = 4;
    const lo = clamp(idx-w, 1, series.length-2);
    const hi = clamp(idx+w, 1, series.length-2);
    let best = lo, bestV = series[lo];
    for (let i=lo; i<=hi; i++) {
      if (kind==="max" && series[i]>bestV) { bestV=series[i]; best=i; }
      if (kind==="min" && series[i]<bestV) { bestV=series[i]; best=i; }
    }
    return best;
  }

  function makeCycle(metaId) {
    t = Array.from({length:T}, (_,i)=>i);
    const base=100, trendSlope=rand(0.10,0.22);
    let amp=rand(4,7), width=rand(10,16), dropAmp=rand(5,9), dropWidth=rand(8,14);
    if (metaId==="sharp")  { dropAmp*=1.35; dropWidth*=0.85; amp*=1.05; }
    if (metaId==="mild")   { dropAmp*=0.70; amp*=0.85; }
    if (metaId==="long")   { dropWidth*=1.45; }
    const peakCenter=Math.floor(rand(30,38)), troughCenter=Math.floor(rand(48,58));
    gdp = t.map(i => {
      const trend = base+trendSlope*i;
      const bump  = amp*Math.exp(-0.5*Math.pow((i-peakCenter)/width,2));
      const dip   = dropAmp*Math.exp(-0.5*Math.pow((i-troughCenter)/dropWidth,2));
      return trend+bump-dip+rand(-0.20,0.20);
    });
    truePeakIdx   = argMaxInRange(gdp, peakCenter-10,   peakCenter+10);
    trueTroughIdx = argMinInRange(gdp, troughCenter-12, troughCenter+12);
    if (trueTroughIdx <= truePeakIdx+5) trueTroughIdx = Math.min(T-8, truePeakIdx+12);
    const trendApprox = t.map(i => base+trendSlope*i);
    const gap = gdp.map((y,i)=>y-trendApprox[i]);
    const lag=Math.floor(rand(4,7)), uBase=rand(4.5,6.5), uAmp=rand(0.45,0.80);
    unemp = t.map(i => clamp(uBase-uAmp*gap[Math.max(0,i-lag)]+rand(-0.10,0.10), 3.0, 10.0));

    placedPeakIdx = null; placedTroughIdx = null;
    firstPeakIdx = null; firstTroughIdx = null; firstWasCorrect = false;
    phase = 'placing'; mode = "PEAK";
    updateModeUI(); hideFeedback(); drawAll();

    const sNum = DISC_MODE ? ` (Scenario ${scenariosCompleted+1} of ${DISC_LIMIT})` : '';
    setStatus(`Click on the GDP chart to place the Peak.${sNum}`);
  }

  // ── Drawing ───────────────────────────────────────────────────────────────
  function setupCanvas(canvas) {
    const ctx=canvas.getContext("2d"), dpr=window.devicePixelRatio||1;
    const W=canvas.clientWidth*dpr, H=canvas.clientHeight*dpr;
    if (canvas.width!==W||canvas.height!==H) { canvas.width=W; canvas.height=H; }
    return {ctx,W,H,dpr};
  }
  function drawAxes(ctx,W,H,dpr,xLabel,yLabel) {
    const pad={l:54*dpr,r:12*dpr,t:14*dpr,b:44*dpr};
    const X0=pad.l,X1=W-pad.r,Y0=pad.t,Y1=H-pad.b;
    ctx.strokeStyle="rgba(0,0,0,0.10)"; ctx.lineWidth=1*dpr;
    for(let i=0;i<=5;i++){const x=X0+i*(X1-X0)/5;ctx.beginPath();ctx.moveTo(x,Y0);ctx.lineTo(x,Y1);ctx.stroke();}
    for(let i=0;i<=4;i++){const y=Y0+i*(Y1-Y0)/4;ctx.beginPath();ctx.moveTo(X0,y);ctx.lineTo(X1,y);ctx.stroke();}
    ctx.fillStyle="rgba(0,0,0,0.70)";
    ctx.font=`${12*dpr}px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial`;
    ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText(xLabel,(X0+X1)/2,Y1+14*dpr);
    ctx.save();ctx.translate(X0-40*dpr,(Y0+Y1)/2);ctx.rotate(-Math.PI/2);
    ctx.textAlign="center";ctx.textBaseline="top";ctx.fillText(yLabel,0,0);ctx.restore();
    return {X0,X1,Y0,Y1};
  }
  function drawLine(ctx,X0,X1,Y0,Y1,xs,ys,yMin,yMax,stroke,dpr) {
    const xTo=i=>X0+(i/(xs.length-1))*(X1-X0);
    const yTo=v=>Y0+(yMax-v)/(yMax-yMin)*(Y1-Y0);
    ctx.strokeStyle=stroke; ctx.lineWidth=3*dpr; ctx.beginPath();
    for(let i=0;i<xs.length;i++){const x=xTo(i),y=yTo(ys[i]);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
    ctx.stroke();
    return {xTo,yTo};
  }
  function drawMarker(ctx,x,y,color,dpr) {
    ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,5*dpr,0,Math.PI*2); ctx.fill();
  }
  function drawVLine(ctx,x,Y0,Y1,dpr) {
    ctx.strokeStyle="rgba(0,0,0,0.35)"; ctx.lineWidth=2*dpr;
    ctx.setLineDash([4*dpr,6*dpr]); ctx.beginPath(); ctx.moveTo(x,Y0); ctx.lineTo(x,Y1); ctx.stroke();
    ctx.setLineDash([]);
  }
  function shadeInterval(ctx,xL,xR,Y0,Y1,dpr) {
    ctx.fillStyle="rgba(0,0,0,0.07)"; ctx.strokeStyle="rgba(0,0,0,0.10)"; ctx.lineWidth=1*dpr;
    ctx.beginPath(); ctx.rect(xL,Y0,xR-xL,Y1-Y0); ctx.fill(); ctx.stroke();
  }
  function labelAtTop(ctx,x,Y0,text,dpr) {
    ctx.fillStyle="rgba(0,0,0,0.70)";
    ctx.font=`${12*dpr}px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial`;
    ctx.textAlign="center"; ctx.textBaseline="bottom"; ctx.fillText(text,x,Y0-2*dpr);
  }
  function labelAtXAxis(ctx,x,Y1,text,dpr) {
    ctx.fillStyle="rgba(0,0,0,0.70)";
    ctx.font=`${12*dpr}px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial`;
    ctx.textAlign="center"; ctx.textBaseline="top"; ctx.fillText(text,x,Y1+8*dpr);
  }

  // showTrue: whether to draw the true peak/trough markers and shading
  function drawAll(showTrue) {
    drawGDP(showTrue);
    drawUnemp(showTrue);
  }

  function drawGDP(showTrue) {
    const {ctx,W,H,dpr}=setupCanvas(els.gdpCanvas); ctx.clearRect(0,0,W,H);
    const {X0,X1,Y0,Y1}=drawAxes(ctx,W,H,dpr,"Time","Real GDP (index)");
    const yMin=Math.min(...gdp)-1, yMax=Math.max(...gdp)+1;
    const map=drawLine(ctx,X0,X1,Y0,Y1,t,gdp,yMin,yMax,"rgba(0,0,0,0.70)",dpr);
    const xTo=map.xTo, yTo=map.yTo;

    if (showTrue && truePeakIdx!=null && trueTroughIdx!=null) {
      shadeInterval(ctx,xTo(truePeakIdx),xTo(trueTroughIdx),Y0,Y1,dpr);
      labelAtTop(ctx,(xTo(truePeakIdx)+xTo(trueTroughIdx))/2,Y0,"Recession",dpr);
      drawMarker(ctx,xTo(truePeakIdx),yTo(gdp[truePeakIdx]),"rgba(34,120,34,0.95)",dpr);
      drawMarker(ctx,xTo(trueTroughIdx),yTo(gdp[trueTroughIdx]),"rgba(34,120,34,0.95)",dpr);
      drawVLine(ctx,xTo(truePeakIdx),Y0,Y1,dpr);
      drawVLine(ctx,xTo(trueTroughIdx),Y0,Y1,dpr);
      labelAtXAxis(ctx,xTo(truePeakIdx),Y1,"Peak",dpr);
      labelAtXAxis(ctx,xTo(trueTroughIdx),Y1,"Trough",dpr);
    }

    if (placedPeakIdx!=null) {
      const x=xTo(placedPeakIdx),y=yTo(gdp[placedPeakIdx]);
      drawMarker(ctx,x,y,"rgba(31,119,180,0.90)",dpr);
      if (!showTrue) labelAtXAxis(ctx,x,Y1,"Peak",dpr);
    }
    if (placedTroughIdx!=null) {
      const x=xTo(placedTroughIdx),y=yTo(gdp[placedTroughIdx]);
      drawMarker(ctx,x,y,"rgba(31,119,180,0.90)",dpr);
      if (!showTrue) labelAtXAxis(ctx,x,Y1,"Trough",dpr);
    }
  }

  function drawUnemp(showTrue) {
    const {ctx,W,H,dpr}=setupCanvas(els.uCanvas); ctx.clearRect(0,0,W,H);
    const {X0,X1,Y0,Y1}=drawAxes(ctx,W,H,dpr,"Time","Unemployment (%)");
    const map=drawLine(ctx,X0,X1,Y0,Y1,t,unemp,3.0,10.0,"rgba(230,159,0,0.95)",dpr);
    const xTo=map.xTo;
    if (showTrue && truePeakIdx!=null && trueTroughIdx!=null) {
      shadeInterval(ctx,xTo(truePeakIdx),xTo(trueTroughIdx),Y0,Y1,dpr);
      labelAtTop(ctx,(xTo(truePeakIdx)+xTo(trueTroughIdx))/2,Y0,"Recession",dpr);
      drawVLine(ctx,xTo(truePeakIdx),Y0,Y1,dpr);
      drawVLine(ctx,xTo(trueTroughIdx),Y0,Y1,dpr);
    }
  }

  // ── UI helpers ────────────────────────────────────────────────────────────
  function updateModeUI() {
    els.modePeak.classList.toggle("primary",   mode==="PEAK");
    els.modePeak.classList.toggle("subtle",    mode!=="PEAK");
    els.modeTrough.classList.toggle("primary", mode==="TROUGH");
    els.modeTrough.classList.toggle("subtle",  mode!=="TROUGH");
    els.stepText.textContent = (mode==="PEAK") ? "Place Peak" : "Place Trough";
  }

  function resetMarkers() {
    placedPeakIdx=null; placedTroughIdx=null;
    phase='placing'; mode="PEAK";
    updateModeUI(); hideFeedback(); drawAll(false);
    setStatus("Markers cleared. Place the Peak.");
  }

  // ── Finish banner ─────────────────────────────────────────────────────────
  function showFinishBanner() {
    if ($('discFinishBanner')) return;
    discDone = true;

    if (DISC_MODE && window.Session && Session.isActive()) {
      Session.recordLabDone(LAB_ID, LAB_LABEL,
        firstCorrectCount, finalCorrectCount, DISC_LIMIT);
    }

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
          ✓ Lab complete — Final score: ${finalCorrectCount} / ${DISC_LIMIT}
        </div>
        <div style="font-size:12px;color:#6b7280;margin-top:3px;">
          First-attempt score: ${firstCorrectCount} / ${DISC_LIMIT} &nbsp;·&nbsp;
          Return to Week 1 when your TA is ready.
        </div>
      </div>
      <a href="${WEEK_URL}"
         style="padding:10px 20px;background:#1b7f4b;color:#fff;border-radius:12px;
                font-weight:800;font-size:13px;text-decoration:none;white-space:nowrap;">
        ← Return to Week 1
      </a>
    `;
    els.feedback.insertAdjacentElement('afterend', banner);
    els.newBtn.disabled = els.checkBtn.disabled = true;
    els.newBtn.style.opacity = els.checkBtn.style.opacity = '0.4';
  }

  // ── Check / Revise / Submit Final ─────────────────────────────────────────
  function handleCheck() {
    if (discDone) return;

    // ── First submission ──────────────────────────────────────────────────
    if (phase === 'placing') {
      if (placedPeakIdx==null || placedTroughIdx==null) {
        showFeedback(`<span class="tagBad">Not yet</span> Place both a peak and a trough, then click Check.`);
        return;
      }

      const okPeak   = Math.abs(placedPeakIdx   - truePeakIdx)   <= 2;
      const okTrough = Math.abs(placedTroughIdx - trueTroughIdx) <= 2;
      firstPeakIdx    = placedPeakIdx;
      firstTroughIdx  = placedTroughIdx;
      firstWasCorrect = okPeak && okTrough;
      if (firstWasCorrect) firstCorrectCount++;

      // Always show true answer after first attempt
      drawAll(true);
      phase = 'first-submitted';

      if (firstWasCorrect) {
        showFeedback(`<span class="tagOK">Correct</span>
          <strong>Recession</strong> is the period from <strong>peak → trough</strong> in real GDP.
          Notice unemployment rises during the recession and often remains elevated after the trough.`);
        if (DISC_MODE) {
          // Record and offer Next
          recordScenario(true);
          els.checkBtn.textContent = 'Next Scenario →';
          setStatus(`Correct! (${scenariosCompleted} of ${DISC_LIMIT} done)`);
        } else {
          els.checkBtn.textContent = 'Next Scenario →';
          setStatus("Correct. Click Next Scenario for a new one.");
        }
      } else {
        showFeedback(`<span class="tagBad">Not quite</span>
          The correct peak and trough are now marked in green.<br>
          ${DISC_MODE
            ? '<em>After your TA reviews this, click <strong>Revise</strong> to reposition your markers.</em>'
            : 'Tip: look for the highest point before the downturn (peak) and lowest before recovery (trough).'}`);
        els.checkBtn.textContent = DISC_MODE ? 'Revise' : 'Next Scenario →';
        setStatus(DISC_MODE
          ? "See correct markers in green. After TA review, click Revise."
          : "Review the chart, then try a new scenario.");
      }

    // ── Open revision ─────────────────────────────────────────────────────
    } else if (phase === 'first-submitted' && els.checkBtn.textContent === 'Revise') {
      phase = 'revising';
      // Reset placed markers so student re-places
      placedPeakIdx = null; placedTroughIdx = null;
      mode = "PEAK"; updateModeUI();
      // Redraw with true answer still visible but no placed markers
      drawAll(true);
      showFeedback(`<em>Re-place your Peak and Trough, then click <strong>Submit Final</strong>.</em>`);
      els.checkBtn.textContent = 'Submit Final';
      setStatus("Re-place your markers, then click Submit Final.");

    // ── Final submission ──────────────────────────────────────────────────
    } else if (phase === 'revising') {
      if (placedPeakIdx==null || placedTroughIdx==null) {
        setStatus("Place both markers before submitting."); return;
      }
      const okPeak   = Math.abs(placedPeakIdx   - truePeakIdx)   <= 2;
      const okTrough = Math.abs(placedTroughIdx - trueTroughIdx) <= 2;
      const finalCorrect = okPeak && okTrough;
      recordScenario(finalCorrect);
      drawAll(true);
      phase = 'done';

      showFeedback(finalCorrect
        ? `<span class="tagOK">Correct after revision</span>
           <strong>Recession:</strong> peak → trough in real GDP.
           Unemployment typically peaks <em>after</em> the trough — a lag.`
        : `<span class="tagBad">Still incorrect</span>
           The correct markers are shown in green. Review the explanation with your TA.`);

      if (DISC_MODE && scenariosCompleted < DISC_LIMIT) {
        els.checkBtn.textContent = 'Next Scenario →';
        setStatus(`${scenariosCompleted} of ${DISC_LIMIT} done.`);
      } else if (DISC_MODE) {
        showFinishBanner();
      } else {
        els.checkBtn.textContent = 'Next Scenario →';
        setStatus("Click Next Scenario for a new one.");
      }

    // ── Next Scenario → ───────────────────────────────────────────────────
    } else if (els.checkBtn.textContent === 'Next Scenario →') {
      if (DISC_MODE && discDone) { showFinishBanner(); return; }
      loadNextScenario();
    }
  }

  function recordScenario(finalCorrect) {
    if (finalCorrect) finalCorrectCount++;
    scenariosCompleted++;

    if (DISC_MODE && window.Session && Session.isActive()) {
      Session.recordQuestion(
        LAB_ID,
        scenariosCompleted - 1,
        curMeta.title,
        `Peak: t=${firstPeakIdx}, Trough: t=${firstTroughIdx}`,
        firstWasCorrect,
        `Peak: t=${placedPeakIdx ?? firstPeakIdx}, Trough: t=${placedTroughIdx ?? firstTroughIdx}`,
        finalCorrect
      );
    }

    if (DISC_MODE && scenariosCompleted >= DISC_LIMIT) showFinishBanner();
  }

  function loadNextScenario() {
    if (DISC_MODE) {
      if (discDone || scenariosCompleted >= DISC_LIMIT) { showFinishBanner(); return; }
      curMeta = discQueue[scenariosCompleted % discQueue.length];
    } else {
      curMeta = DATA.scenarios[Math.floor(Math.random()*DATA.scenarios.length)];
    }
    els.scTitle.textContent = curMeta.title;
    els.scDesc.textContent  = curMeta.desc;
    els.checkBtn.textContent = 'Check';
    makeCycle(curMeta.id);
  }

  function handleGDPClick(ev) {
    if (phase !== 'placing' && phase !== 'revising') return;
    if (discDone) return;
    const rect = els.gdpCanvas.getBoundingClientRect();
    const i    = clamp(Math.round(((ev.clientX-rect.left)/rect.width)*(T-1)), 0, T-1);
    if (mode==="PEAK") {
      placedPeakIdx = snapToLocalExtremum(gdp,i,"max");
      setStatus("Peak placed. Now place the Trough.");
      mode="TROUGH"; updateModeUI();
    } else {
      placedTroughIdx = snapToLocalExtremum(gdp,i,"min");
      setStatus("Trough placed. Click Check.");
    }
    drawAll(phase === 'revising'); // keep true markers visible during revision
  }

  // ── Button wiring ─────────────────────────────────────────────────────────
  els.newBtn.addEventListener("click",    loadNextScenario);
  els.modePeak.addEventListener("click",  () => { if(phase==='placing'||phase==='revising'){mode="PEAK";  updateModeUI();setStatus("Click on GDP to place Peak.");} });
  els.modeTrough.addEventListener("click",() => { if(phase==='placing'||phase==='revising'){mode="TROUGH";updateModeUI();setStatus("Click on GDP to place Trough.");} });
  els.resetBtn.addEventListener("click",  resetMarkers);
  els.checkBtn.addEventListener("click",  handleCheck);
  els.gdpCanvas.addEventListener("click", handleGDPClick);

  // ── Init ──────────────────────────────────────────────────────────────────
  if (DISC_MODE) {
    const pool = DATA.scenarios.slice();
    for (let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    discQueue = pool.slice(0, DISC_LIMIT);
    curMeta   = discQueue[0];
  } else {
    curMeta = DATA.scenarios[0];
  }
  els.scTitle.textContent = curMeta.title;
  els.scDesc.textContent  = curMeta.desc;
  makeCycle(curMeta.id);
});
