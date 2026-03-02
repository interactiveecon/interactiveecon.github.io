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

    ghostLeft: $("ghostLeft"),
    ghostRight: $("ghostRight"),
    gReq: $("gReq"),
    gLoan: $("gLoan"),
  };

  function fmt(x){ return Number.isFinite(x) ? x.toFixed(2) : "—"; }
  function rndInt(a,b){ return Math.floor(a + Math.random()*(b-a+1)); }
  function rndStep(a,b,step){
    const n = Math.round((b-a)/step);
    return a + rndInt(0,n)*step;
  }
  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

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

  // Defaults: allow more than 10 steps
  const MAX_STEPS = Number.isFinite(D.maxSteps) ? D.maxSteps : 50;

  let reserveRatio = 0.10;
  let rrMin = 0.10;
  let dR = 0;
  let step = 0;
  let running = false;

  // history: {k, bank, deposit, reservesHeld, loan}
  const history = [];

  function setStatus(msg){ els.status.textContent = msg; }

  function resetBars(){
    els.splitLeft.textContent = "Reserves held: —";
    els.splitRight.textContent = "New loan: —";
    els.segReq.style.width = "0%";
    els.segLoan.style.width = "0%";
    els.segReq.textContent = "";
    els.segLoan.textContent = "";

    els.ghostLeft.textContent = "Next reserves held: —";
    els.ghostRight.textContent = "Next loan: —";
    els.gReq.style.width = "0%";
    els.gLoan.style.width = "0%";
    els.gReq.textContent = "";
    els.gLoan.textContent = "";
  }

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

    resetBars();
    typeset(document.body);
  }

  function nextBankName(k){
    return D.banks[(k-1) % D.banks.length];
  }

  function computeTotals(){
    const M = history.reduce((s,h) => s + h.deposit, 0);
    const L = history.reduce((s,h) => s + h.loan, 0);
    const Rtot = history.reduce((s,h) => s + h.reservesHeld, 0);
    const mImpl = (dR > 0) ? (M / dR) : 0;
    return { M, L, Rtot, mImpl };
  }

  function updateTotalsUI(){
    const mTheory = 1/reserveRatio;
    const dMTheory = dR * mTheory;

    const { M, L, Rtot, mImpl } = computeTotals();

    els.dR0.textContent = fmt(dR);
    els.mTheory.textContent = fmt(mTheory);
    els.dMTheory.textContent = fmt(dMTheory);

    els.Mtot.textContent = fmt(M);
    els.Ltot.textContent = fmt(L);
    els.RRtot.textContent = fmt(Rtot);
    els.mImpl.textContent = fmt(mImpl);
  }

  function renderSplitBar(deposit, reservesHeld, loan, leftEl, rightEl, segA, segB){
    if (!Number.isFinite(deposit) || deposit <= 0){
      leftEl.textContent = "—";
      rightEl.textContent = "—";
      segA.style.width = "0%";
      segB.style.width = "0%";
      segA.textContent = "";
      segB.textContent = "";
      return;
    }

    const aPct = clamp((reservesHeld / deposit) * 100, 0, 100);
    const bPct = clamp((loan / deposit) * 100, 0, 100);

    leftEl.textContent = `${fmt(reservesHeld)} (${fmt(aPct)}%)`;
    rightEl.textContent = `${fmt(loan)} (${fmt(bPct)}%)`;

    segA.style.width = `${aPct}%`;
    segB.style.width = `${bPct}%`;

    segA.textContent = aPct >= 18 ? "Res" : "";
    segB.textContent = bPct >= 18 ? "Loan" : "";
  }

  function renderBarsCurrentAndGhost(deposit, reservesHeld, loan){
    // current: label text already includes context in HTML; we fill numeric parts here
    els.splitLeft.textContent = `Reserves held: ${fmt(reservesHeld)} (${fmt((reservesHeld/deposit)*100)}%)`;
    els.splitRight.textContent = `New loan: ${fmt(loan)} (${fmt((loan/deposit)*100)}%)`;
    renderSplitBar(deposit, reservesHeld, loan, () => {}, () => {}, els.segReq, els.segLoan);
    // ^ we used text above; now set widths & internal short labels:
    els.segReq.style.width = `${clamp((reservesHeld/deposit)*100,0,100)}%`;
    els.segLoan.style.width = `${clamp((loan/deposit)*100,0,100)}%`;
    els.segReq.textContent = (reservesHeld/deposit)*100 >= 18 ? "Res" : "";
    els.segLoan.textContent = (loan/deposit)*100 >= 18 ? "Loan" : "";

    // ghost: next deposit = current loan
    const nextDeposit = loan;
    const nextRes = reserveRatio * nextDeposit;
    const nextLoan = Math.max(0, nextDeposit - nextRes);

    if (nextDeposit <= 0){
      els.ghostLeft.textContent = "Next reserves held: —";
      els.ghostRight.textContent = "Next loan: —";
      els.gReq.style.width = "0%";
      els.gLoan.style.width = "0%";
      els.gReq.textContent = "";
      els.gLoan.textContent = "";
      return;
    }

    const gReqPct = clamp((nextRes/nextDeposit)*100,0,100);
    const gLoanPct = clamp((nextLoan/nextDeposit)*100,0,100);

    els.ghostLeft.textContent = `Next reserves held: ${fmt(nextRes)} (${fmt(gReqPct)}%)`;
    els.ghostRight.textContent = `Next loan: ${fmt(nextLoan)} (${fmt(gLoanPct)}%)`;
    els.gReq.style.width = `${gReqPct}%`;
    els.gLoan.style.width = `${gLoanPct}%`;
    els.gReq.textContent = gReqPct >= 18 ? "Res" : "";
    els.gLoan.textContent = gLoanPct >= 18 ? "Loan" : "";
  }

  function renderStepUI(last){
    if (!last){
      els.stepSummary.textContent = "No steps yet. Click Step to begin.";
      els.bankName.textContent = "—";
      els.stepNum.textContent = "—";
      els.assetsCell.textContent = "—";
      els.liabsCell.textContent = "—";
      els.explainLog.textContent = "—";
      resetBars();
      return;
    }

    els.bankName.textContent = last.bank;
    els.stepNum.textContent = `Step ${last.k}`;

    els.stepSummary.textContent =
      `A deposit arrives at ${last.bank}. The bank keeps reserves and makes a new loan.`;

    // Bars (current + ghost)
    renderBarsCurrentAndGhost(last.deposit, last.reservesHeld, last.loan);

    // Balance sheet T-account: Assets = Liabilities
    // Assets: Reserves held + Loans. Liabilities: Deposits.
    els.assetsCell.textContent =
      `Reserves: ${fmt(last.reservesHeld)}\n` +
      `Loans: ${fmt(last.loan)}\n` +
      `—\n` +
      `Total assets: ${fmt(last.reservesHeld + last.loan)}`;

    els.liabsCell.textContent =
      `Deposits: ${fmt(last.deposit)}\n` +
      `—\n` +
      `Total liabilities: ${fmt(last.deposit)}`;

    // Explanation below
    els.explainLog.textContent =
`Deposit arrives: ${fmt(last.deposit)}
Reserves held = reserve ratio · deposit = ${fmt(reserveRatio)} · ${fmt(last.deposit)} = ${fmt(last.reservesHeld)}
New loan = deposit − reserves = ${fmt(last.deposit)} − ${fmt(last.reservesHeld)} = ${fmt(last.loan)}
That loan becomes the next bank’s deposit in the next step.`;

    typeset(els.explainLog);
  }

  function renderProcessLog(){
    if (history.length === 0){
      els.processLog.textContent = "Click Step to start the deposit creation process.";
      return;
    }
    const lines = history.map(h =>
      `Step ${h.k} (${h.bank}): deposit ${fmt(h.deposit)} → reserves ${fmt(h.reservesHeld)} → loan ${fmt(h.loan)}`
    );
    els.processLog.textContent = lines.join("\n");
  }

  function canContinue(nextLoan){
    return (history.length < MAX_STEPS) && (nextLoan >= (Number.isFinite(D.minLoanToContinue) ? D.minLoanToContinue : 0.5));
  }

  function stepOnce(){
    const deposit = (step === 1) ? dR : history[history.length - 1].loan;

    const reservesHeld = reserveRatio * deposit;
    const loan = Math.max(0, deposit - reservesHeld);

    const rec = { k: step, bank: nextBankName(step), deposit, reservesHeld, loan };
    history.push(rec);

    updateTotalsUI();
    renderStepUI(rec);
    renderProcessLog();

    if (!canContinue(loan)){
      els.stepBtn.disabled = true;
      els.runBtn.disabled = true;
      setStatus("Process complete (next loan is tiny or max steps reached).");
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
