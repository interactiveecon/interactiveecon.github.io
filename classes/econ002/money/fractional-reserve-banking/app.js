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

    splitLeft: $("splitLeft"),
    splitRight: $("splitRight"),
    segReq: $("segReq"),
    segLoan: $("segLoan"),
  };

  function fmt(x){ return Number.isFinite(x) ? x.toFixed(2) : "—"; }
  function rndInt(a,b){ return Math.floor(a + Math.random()*(b-a+1)); }
  function rndStep(a,b,step){
    const n = Math.round((b-a)/step);
    return a + rndInt(0,n)*step;
  }
  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); } // <-- FIX

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

  let reserveRatio = 0.10;
  let rrMin = 0.10;
  let dR = 0;
  let step = 0;
  let running = false;

  // history: {k, bank, deposit, reqRes, loan}
  const history = [];

  function setStatus(msg){ els.status.textContent = msg; }

  function resetUI(){
    els.stepBtn.disabled = true;
    els.runBtn.disabled = true;
    els.rrSlider.disabled = true;

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

    // bar reset
    els.splitLeft.textContent = "Required reserves: —";
    els.splitRight.textContent = "New loan: —";
    els.segReq.style.width = "0%";
    els.segLoan.style.width = "0%";
    els.segReq.textContent = "";
    els.segLoan.textContent = "";

    typeset(document.body);
  }

  function nextBankName(k){
    return D.banks[(k-1) % D.banks.length];
  }

  function computeTotals(){
    const M = history.reduce((s,h) => s + h.deposit, 0);
    const L = history.reduce((s,h) => s + h.loan, 0);
    const RRtot = history.reduce((s,h) => s + h.reqRes, 0);
    const mImpl = (dR > 0) ? (M / dR) : 0;
    return { M, L, RRtot, mImpl };
  }

  function updateTotalsUI(){
    const mTheory = 1/reserveRatio;
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

  // “wow” deposit split bar
  function renderBar(deposit, reqRes, loan){
    if (!Number.isFinite(deposit) || deposit <= 0){
      els.splitLeft.textContent = "Required reserves: —";
      els.splitRight.textContent = "New loan: —";
      els.segReq.style.width = "0%";
      els.segLoan.style.width = "0%";
      els.segReq.textContent = "";
      els.segLoan.textContent = "";
      return;
    }

    const reqPct = clamp((reqRes / deposit) * 100, 0, 100);
    const loanPct = clamp((loan / deposit) * 100, 0, 100);

    els.splitLeft.textContent = `Required reserves: ${fmt(reqRes)} (${fmt(reqPct)}%)`;
    els.splitRight.textContent = `New loan: ${fmt(loan)} (${fmt(loanPct)}%)`;

    els.segReq.style.width = `${reqPct}%`;
    els.segLoan.style.width = `${loanPct}%`;

    els.segReq.textContent = reqPct >= 18 ? "RR" : "";
    els.segLoan.textContent = loanPct >= 18 ? "Loan" : "";
  }

  function renderStepUI(last){
    if (!last){
      els.stepSummary.textContent = "No steps yet. Click Step to begin.";
      els.bankName.textContent = "—";
      els.stepNum.textContent = "—";
      els.assetsCell.textContent = "—";
      els.liabsCell.textContent = "—";
      els.explainLog.textContent = "—";
      renderBar(NaN, NaN, NaN);
      return;
    }

    els.bankName.textContent = last.bank;
    els.stepNum.textContent = `Step ${last.k}`;

    els.stepSummary.textContent =
      `A deposit arrives at ${last.bank}. The bank keeps required reserves and makes a new loan.`;

    renderBar(last.deposit, last.reqRes, last.loan);

    // T-account lines
    els.assetsCell.textContent =
      `+ Reserves: ${fmt(last.deposit)}\n` +
      `− Required reserves: ${fmt(last.reqRes)}\n` +
      `+ Loans: ${fmt(last.loan)}`;

    els.liabsCell.textContent =
      `+ Deposits (money): ${fmt(last.deposit)}`;

    // “What happened?” (below the T-account)
    els.explainLog.textContent =
`Deposit: ${fmt(last.deposit)}
Required reserves: reserve ratio · deposit = ${fmt(reserveRatio)} · ${fmt(last.deposit)} = ${fmt(last.reqRes)}
New loan: ${fmt(last.loan)}
That loan becomes the next bank’s deposit in the next step.`;

    typeset(els.explainLog);
  }

  function renderProcessLog(){
    if (history.length === 0){
      els.processLog.textContent = "Click Step to start the deposit creation process.";
      return;
    }
    const lines = history.map(h =>
      `Step ${h.k} (${h.bank}): deposit ${fmt(h.deposit)} → required reserves ${fmt(h.reqRes)} → loan ${fmt(h.loan)}`
    );
    els.processLog.textContent = lines.join("\n");
  }

  function canContinue(nextLoan){
    return (history.length < D.maxSteps) && (nextLoan >= D.minLoanToContinue);
  }

  function stepOnce(){
    const deposit = (step === 1) ? dR : history[history.length - 1].loan;

    const reqRes = reserveRatio * deposit;
    const loan = Math.max(0, deposit - reqRes);

    const rec = { k: step, bank: nextBankName(step), deposit, reqRes, loan };
    history.push(rec);

    updateTotalsUI();
    renderStepUI(rec);
    renderProcessLog();

    if (!canContinue(loan)){
      els.stepBtn.disabled = true;
      els.runBtn.disabled = true;
      setStatus("Process complete (next loan is tiny).");
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
      if (els.stepBtn.disabled){ running = false; return; }

      step++;
      stepOnce();
      setTimeout(loop, 250);
    };
    loop();
  }

  function newScenario(){
    history.length = 0;
    step = 0;
    running = false;

    rrMin = rndStep(D.rrRange[0], D.rrRange[1], 0.01);
    reserveRatio = rrMin;

    els.rrSlider.disabled = false;
    els.rrSlider.min = String(rrMin);
    els.rrSlider.max = "1.00";
    els.rrSlider.step = "0.01";
    els.rrSlider.value = String(reserveRatio);
    els.rrVal.textContent = fmt(reserveRatio);

    dR = rndInt(D.injectionRange[0], D.injectionRange[1]);

    els.scenarioTitle.textContent = "Scenario";
    els.scenarioDesc.textContent =
      `Initial reserve injection: ΔR = ${fmt(dR)}\n` +
      `Required reserve ratio (minimum): rr = ${fmt(rrMin)}\n\n` +
      `Move the slider (rr ≥ ${fmt(rrMin)}) to see how a higher reserve ratio shrinks money creation.\n` +
      `Click Step to start.`;

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

  function rrChanged(){
    reserveRatio = Number(els.rrSlider.value);
    els.rrVal.textContent = fmt(reserveRatio);

    history.length = 0;
    step = 0;

    updateTotalsUI();
    renderStepUI(null);
    renderProcessLog();
    setStatus("Reserve ratio changed. Steps reset.");
    typeset(document.body);
  }

  // wiring
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

  window.addEventListener("load", () => {
    resetUI();
    setStatus("Ready.");
  });
})();
