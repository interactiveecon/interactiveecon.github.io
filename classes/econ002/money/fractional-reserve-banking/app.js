(() => {
  const $ = (id) => document.getElementById(id);

  const D = window.MONEY_CREATION;
  if (!D) return;

  const els = {
    newBtn: $("newBtn"),
    stepBtn: $("stepBtn"),
    runBtn: $("runBtn"),
    resetBtn: $("resetBtn"),
    status: $("status"),

    scenarioTitle: $("scenarioTitle"),
    scenarioDesc: $("scenarioDesc"),

    rrSlider: $("rrSlider"),
    rrVal: $("rrVal"),
    erCheck: $("erCheck"),

    dR0: $("dR0"),
    mTheory: $("mTheory"),
    dMTheory: $("dMTheory"),

    Mtot: $("Mtot"),
    Ltot: $("Ltot"),
    RRtot: $("RRtot"),
    mImpl: $("mImpl"),

    stepSummary: $("stepSummary"),
    bankName: $("bankName"),
    stepNum: $("stepNum"),
    assetsCell: $("assetsCell"),
    liabsCell: $("liabsCell"),
    explainLog: $("explainLog"),
    processLog: $("processLog"),
  };

  function fmt(x){ return Number.isFinite(x) ? x.toFixed(2) : "—"; }
  function rndInt(a,b){ return Math.floor(a + Math.random()*(b-a+1)); }
  function rndStep(a,b,step){
    const n = Math.round((b-a)/step);
    return a + rndInt(0,n)*step;
  }

  // KaTeX render
  function typeset(el){
    if (!el) return;
    if (!window.renderMathInElement){
      setTimeout(() => typeset(el), 50);
      return;
    }
    window.renderMathInElement(el, {
      delimiters: [
        {left:"\\(", right:"\\)", display:false},
        {left:"$", right:"$", display:false},
        {left:"\\[", right:"\\]", display:true},
        {left:"$$", right:"$$", display:true}
      ],
      throwOnError: false
    });
  }

  // Scenario state
  let rr = 0.10;
  let dR = 0;
  let step = 0;
  let running = false;

  // Each step records: bank, deposit, reqRes, excessRes (optional), loan
  const history = [];

  function setStatus(msg){ els.status.textContent = msg; }

  function resetUI(){
    els.stepBtn.disabled = true;
    els.runBtn.disabled = true;

    els.rrSlider.disabled = true;
    els.erCheck.disabled = true;

    els.scenarioTitle.textContent = "Scenario";
    els.scenarioDesc.textContent = "Click “New Scenario” to start.";

    els.dR0.textContent = "—";
    els.mTheory.textContent = "—";
    els.dMTheory.textContent = "—";

    els.Mtot.textContent = "—";
    els.Ltot.textContent = "—";
    els.RRtot.textContent = "—";
    els.mImpl.textContent = "—";

    els.stepSummary.textContent = "No scenario yet.";
    els.bankName.textContent = "—";
    els.stepNum.textContent = "—";
    els.assetsCell.textContent = "—";
    els.liabsCell.textContent = "—";
    els.explainLog.textContent = "—";
    els.processLog.textContent = "—";

    typeset(document.body);
  }

  function computeTotals(){
    const M = history.reduce((s,h) => s + h.deposit, 0);
    const L = history.reduce((s,h) => s + h.loan, 0);
    const RRtot = history.reduce((s,h) => s + h.reqRes + h.excessRes, 0);
    const mImpl = (dR > 0) ? (M / dR) : 0;

    return { M, L, RRtot, mImpl };
  }

  function updateTotalsUI(){
    const mTheory = 1/rr;
    const dMTheory = dR * mTheory;

    const { M, L, RRtot, mImpl } = computeTotals();

    els.dR0.textContent = fmt(dR);
    els.mTheory.textContent = fmt(mTheory);
    els.dMTheory.textContent = fmt(dMTheory);

    els.Mtot.textContent = fmt(M);
    els.Ltot.textContent = fmt(L);
    els.RRtot.textContent = fmt(RRtot);
    els.mImpl.textContent = fmt(mImpl);
  }

  function renderStepUI(last){
    if (!last){
      els.stepSummary.textContent = "No steps yet. Click Step to begin.";
      els.bankName.textContent = "—";
      els.stepNum.textContent = "—";
      els.assetsCell.textContent = "—";
      els.liabsCell.textContent = "—";
      els.explainLog.textContent = "—";
      return;
    }

    els.bankName.textContent = last.bank;
    els.stepNum.textContent = `Step ${last.k}`;

    els.stepSummary.textContent =
      `A deposit arrives at ${last.bank}. The bank keeps required reserves and makes a new loan.`;

    // T-account: show the flows (simple and clear)
    els.assetsCell.textContent =
      `+ Reserves: ${fmt(last.deposit)}\n` +
      `− Required reserves: ${fmt(last.reqRes)}\n` +
      (last.excessRes > 0 ? `− Excess reserves: ${fmt(last.excessRes)}\n` : "") +
      `+ Loans: ${fmt(last.loan)}`;

    els.liabsCell.textContent =
      `+ Deposits (money): ${fmt(last.deposit)}`;

    // Explanation
    const erLine = last.excessRes > 0
      ? `Excess reserves (optional): ${fmt(last.excessRes)}\n`
      : "";

    els.explainLog.textContent =
`Deposit: ${fmt(last.deposit)}
Required reserves: rr·deposit = ${fmt(rr)}·${fmt(last.deposit)} = ${fmt(last.reqRes)}
${erLine}New loan (excess reserves): ${fmt(last.loan)}
That loan becomes a deposit at the next bank in the next step.`;

    typeset(els.explainLog);
  }

  function renderProcessLog(){
    if (history.length === 0){
      els.processLog.textContent = "Click Step to start the deposit creation process.";
      return;
    }
    const lines = history.map(h =>
      `Step ${h.k} (${h.bank}): deposit ${fmt(h.deposit)} → required reserves ${fmt(h.reqRes)}${h.excessRes>0?`, excess reserves ${fmt(h.excessRes)}`:""} → loan ${fmt(h.loan)}`
    );
    els.processLog.textContent = lines.join("\n");
  }

  function nextBankName(k){
    return D.banks[(k-1) % D.banks.length];
  }

  function canContinue(nextLoan){
    return (history.length < D.maxSteps) && (nextLoan >= D.minLoanToContinue);
  }

  function stepOnce(){
    // Determine deposit arriving this step
    const deposit = (step === 1) ? dR : history[history.length - 1].loan;

    const reqRes = rr * deposit;
    const er = els.erCheck.checked ? (D.excessReserveRate * deposit) : 0;

    const loan = Math.max(0, deposit - reqRes - er);

    const rec = {
      k: step,
      bank: nextBankName(step),
      deposit,
      reqRes,
      excessRes: er,
      loan
    };
    history.push(rec);

    updateTotalsUI();
    renderStepUI(rec);
    renderProcessLog();

    // Enable/disable continuation
    if (!canContinue(loan)){
      els.stepBtn.disabled = true;
      els.runBtn.disabled = true;
      setStatus("Process complete (no meaningful excess reserves left).");
      running = false;
      return;
    }

    setStatus("Step recorded. Click Step again or Run to completion.");
  }

  function runToCompletion(){
    if (running) return;
    running = true;

    const loop = () => {
      if (!running) return;

      // If step button disabled, stop
      if (els.stepBtn.disabled){
        running = false;
        return;
      }

      step++;
      stepOnce();

      // Continue with a short delay for readability
      setTimeout(loop, 250);
    };

    loop();
  }

  function newScenario(){
    history.length = 0;
    step = 0;
    running = false;

    rr = rndStep(D.rrRange[0], D.rrRange[1], 0.01);
    dR = rndInt(D.injectionRange[0], D.injectionRange[1]);

    els.rrSlider.disabled = false;
    els.rrSlider.value = String(rr);
    els.rrVal.textContent = fmt(rr);

    els.erCheck.disabled = false;
    els.erCheck.checked = false;

    els.scenarioTitle.textContent = "Scenario";
    els.scenarioDesc.textContent =
      `Initial reserve injection: ΔR = ${fmt(dR)}\n` +
      `Required reserve ratio: rr = ${fmt(rr)}\n\n` +
      `Click Step to see how deposits are created across banks.`;

    els.stepBtn.disabled = false;
    els.runBtn.disabled = false;

    updateTotalsUI();
    renderStepUI(null);
    renderProcessLog();

    setStatus("Scenario ready. Click Step to begin.");
    typeset(document.body);
  }

  function resetScenario(){
    history.length = 0;
    step = 0;
    running = false;

    els.stepBtn.disabled = false;
    els.runBtn.disabled = false;

    updateTotalsUI();
    renderStepUI(null);
    renderProcessLog();
    setStatus("Reset steps (same scenario).");
  }

  // Slider handlers
  function rrChanged(){
    rr = Number(els.rrSlider.value);
    els.rrVal.textContent = fmt(rr);

    // Recompute from scratch using same injection + rr (reset history)
    history.length = 0;
    step = 0;

    updateTotalsUI();
    renderStepUI(null);
    renderProcessLog();
    setStatus("rr changed. Steps reset for the new rr.");
    typeset(document.body);
  }

  function erChanged(){
    // Same idea: reset steps so the process reflects new rule
    history.length = 0;
    step = 0;

    updateTotalsUI();
    renderStepUI(null);
    renderProcessLog();
    setStatus("Excess reserve setting changed. Steps reset.");
  }

  // Wire events
  els.newBtn.addEventListener("click", newScenario);

  els.stepBtn.addEventListener("click", () => {
    if (els.stepBtn.disabled) return;
    step++;
    stepOnce();
  });

  els.runBtn.addEventListener("click", runToCompletion);

  els.resetBtn.addEventListener("click", () => {
    if (!dR) {
      resetUI();
      setStatus("Reset.");
    } else {
      resetScenario();
    }
  });

  els.rrSlider.addEventListener("input", rrChanged);
  els.erCheck.addEventListener("change", erChanged);

  // Init
  window.addEventListener("load", () => {
    resetUI();
    setStatus("Ready.");
  });
})();
