window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const els = {
    iRate: $("iRate"), iRateNum: $("iRateNum"),
    piE: $("piE"), piENum: $("piENum"),
    piA: $("piA"), piANum: $("piANum"),
    principal: $("principal"), principalNum: $("principalNum"),

    rExp: $("rExp"),
    rReal: $("rReal"),
    surprise: $("surprise"),

    nomRepay: $("nomRepay"),
    realRepay: $("realRepay"),
    winner: $("winner"),
    winnerExplain: $("winnerExplain"),

    nomSave: $("nomSave"),
    realSave: $("realSave"),
    saverOutcome: $("saverOutcome"),
    saverExplain: $("saverExplain"),

    summaryPills: $("summaryPills"),

    randomBtn: $("randomBtn"),
    resetBtn: $("resetBtn"),
    status: $("status"),

    newQsBtn: $("newQsBtn"),
    submitBtn: $("submitBtn"),
    mcqList: $("mcqList")
  };

  function setStatus(msg){ els.status.textContent = msg; }

  function num(x){ const v = Number(x); return Number.isFinite(v) ? v : NaN; }
  function fmtPct(x){ return Number.isFinite(x) ? `${x.toFixed(2)}%` : "—"; }
  function fmtMoney(x){
    if (!Number.isFinite(x)) return "—";
    return x.toLocaleString(undefined, { style:"currency", currency:"USD", minimumFractionDigits:2, maximumFractionDigits:2 });
  }

  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

  function syncPair(rangeEl, numEl){
    rangeEl.addEventListener("input", () => { numEl.value = rangeEl.value; update(); });
    numEl.addEventListener("input", () => {
      const v = clamp(num(numEl.value), num(rangeEl.min), num(rangeEl.max));
      rangeEl.value = String(v);
      numEl.value = String(v);
      update();
    });
  }

  syncPair(els.iRate, els.iRateNum);
  syncPair(els.piE, els.piENum);
  syncPair(els.piA, els.piANum);
  syncPair(els.principal, els.principalNum);

  // Core calculations (all in percent units)
  function getScenario(){
    const i = num(els.iRate.value);
    const pie = num(els.piE.value);
    const pi = num(els.piA.value);
    const P = num(els.principal.value);
    return { i, pie, pi, P };
  }

  function update(){
    const { i, pie, pi, P } = getScenario();

    const rExp = i - pie;     // Fisher approx expected real
    const rReal = i - pi;     // realized real
    const surprise = pi - pie;

    els.rExp.textContent = fmtPct(rExp);
    els.rReal.textContent = fmtPct(rReal);
    els.surprise.textContent = fmtPct(surprise);

    // Loan / deposit nominal and real
    const repayNom = P * (1 + i/100);
    const repayReal = repayNom / (1 + pi/100);

    els.nomRepay.textContent = fmtMoney(repayNom);
    els.realRepay.textContent = fmtMoney(repayReal);

    // Redistribution: unexpected inflation changes real burden relative to expected
    const expectedRealRepay = repayNom / (1 + pie/100);
    const deltaRealBurden = repayReal - expectedRealRepay; // + means borrower pays more than expected in real terms

    let win = "";
    let winText = "";
    if (Math.abs(surprise) < 1e-9){
      win = "No surprise";
      winText = "Actual inflation equals expected inflation, so the real burden is about what both sides anticipated.";
    } else if (surprise > 0){
      win = "Borrower wins";
      winText = "Inflation is higher than expected, so the real value of repayment is lower than expected. Borrowers benefit; lenders lose purchasing power.";
    } else {
      win = "Lender wins";
      winText = "Inflation is lower than expected (or deflation), so the real value of repayment is higher than expected. Lenders benefit; borrowers face a heavier real burden.";
    }
    els.winner.textContent = win;
    els.winnerExplain.textContent = winText;

    // Saver outcomes: same logic (saver is like lender)
    const saveNom = P * (1 + i/100);
    const saveReal = saveNom / (1 + pi/100);
    els.nomSave.textContent = fmtMoney(saveNom);
    els.realSave.textContent = fmtMoney(saveReal);

    let sOut = "";
    let sText = "";
    if (Math.abs(surprise) < 1e-9){
      sOut = "As expected";
      sText = "With no inflation surprise, the realized purchasing power matches what was expected.";
    } else if (surprise > 0){
      sOut = "Saver loses";
      sText = "Unexpectedly high inflation reduces the purchasing power of the nominal return. Savers/lenders lose in real terms.";
    } else {
      sOut = "Saver gains";
      sText = "Unexpectedly low inflation (or deflation) increases the purchasing power of the nominal return. Savers/lenders gain in real terms.";
    }
    els.saverOutcome.textContent = sOut;
    els.saverExplain.textContent = sText;

    // Pills summary
    els.summaryPills.innerHTML = [
      `<span class="pill">i = ${i.toFixed(1)}%</span>`,
      `<span class="pill">πᵉ = ${pie.toFixed(1)}%</span>`,
      `<span class="pill">π = ${pi.toFixed(1)}%</span>`,
      `<span class="pill">Principal = ${fmtMoney(P)}</span>`
    ].join("");

    // Keep MCQs consistent with current values (don’t auto-regenerate, but update metadata if you want)
  }

  // ---------- Dynamic MCQs ----------
  let qs = [];

  function shuffle(arr){
    const a = arr.slice();
    for (let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildQuestions(){
    const { i, pie, pi, P } = getScenario();
    const rExp = i - pie;
    const rReal = i - pi;
    const surprise = pi - pie;

    // Q1: expected real rate
    const q1 = {
      id:"q1",
      prompt:`Using the Fisher approximation, what is the expected real interest rate rᵉ? (i = ${i.toFixed(1)}%, πᵉ = ${pie.toFixed(1)}%)`,
      choices: shuffle([
        { key:"A", text:`${(i - pie).toFixed(1)}%` },
        { key:"B", text:`${(i + pie).toFixed(1)}%` },
        { key:"C", text:`${(pie - i).toFixed(1)}%` },
        { key:"D", text:`${(i - pi).toFixed(1)}%` }
      ]),
      correctKey:"A",
      explain:"Fisher (approx.): rᵉ ≈ i − πᵉ."
    };

    // Q2: realized real rate
    const q2 = {
      id:"q2",
      prompt:`What is the realized real interest rate r (based on actual inflation π = ${pi.toFixed(1)}%)?`,
      choices: shuffle([
        { key:"A", text:`${(i - pi).toFixed(1)}%` },
        { key:"B", text:`${(i - pie).toFixed(1)}%` },
        { key:"C", text:`${(pi - i).toFixed(1)}%` },
        { key:"D", text:`${(i + pi).toFixed(1)}%` }
      ]),
      correctKey:"A",
      explain:"Realized real return uses actual inflation: r ≈ i − π."
    };

    // Q3: who wins?
    const who = (Math.abs(surprise) < 1e-9) ? "No one (as expected)" : (surprise > 0 ? "Borrowers" : "Lenders");
    const q3 = {
      id:"q3",
      prompt:`Inflation surprise is π − πᵉ = ${surprise.toFixed(1)}%. Who benefits from this surprise (fixed nominal contract)?`,
      choices: shuffle([
        { key:"A", text:"Borrowers" },
        { key:"B", text:"Lenders / Savers" },
        { key:"C", text:"Both benefit equally" },
        { key:"D", text:"No one (as expected)" }
      ]),
      correctKey: (Math.abs(surprise) < 1e-9 ? "D" : (surprise > 0 ? "A" : "B")),
      explain: surprise > 0
        ? "Unexpectedly high inflation reduces the real burden of nominal repayment: borrowers win, lenders lose."
        : (surprise < 0
          ? "Unexpectedly low inflation (or deflation) increases the real burden of nominal repayment: lenders win, borrowers lose."
          : "No inflation surprise → no redistribution beyond what was expected.")
    };

    // Q4: deflation intuition
    const q4 = {
      id:"q4",
      prompt:`Suppose inflation turns negative (deflation). Holding i fixed, what happens to the realized real interest rate r = i − π?`,
      choices: shuffle([
        { key:"A", text:"It rises (becomes more positive)" },
        { key:"B", text:"It falls (becomes more negative)" },
        { key:"C", text:"It stays the same" },
        { key:"D", text:"Not enough information" }
      ]),
      correctKey: "A",
      explain:"If π falls (especially below 0), then i − π increases, so the realized real interest rate rises."
    };

    qs = [q1,q2,q3,q4];
  }

  function renderQuestions(){
    els.mcqList.innerHTML = "";
    qs.forEach((q, idx) => {
      const wrap = document.createElement("div");
      wrap.className = "qcard";
      wrap.innerHTML = `
        <div class="qtitle">${idx+1}. ${q.prompt}</div>
        <div class="choices" role="radiogroup" aria-label="Question ${idx+1}">
          ${q.choices.map(ch => `
            <label class="choice">
              <input type="radio" name="${q.id}" value="${ch.key}">
              <div>${ch.text}</div>
            </label>
          `).join("")}
        </div>
        <div class="feedback" id="${q.id}_fb"></div>
      `;
      els.mcqList.appendChild(wrap);
    });
  }

  function submitQuestions(){
    qs.forEach(q => {
      const sel = els.mcqList.querySelector(`input[name="${q.id}"]:checked`);
      const fb = document.getElementById(`${q.id}_fb`);
      const chosen = sel ? sel.value : null;
      const ok = chosen === q.correctKey;

      fb.style.display = "block";
      fb.innerHTML = `
        ${ok ? `<span class="tagOK">Correct</span>` : `<span class="tagBad">Not quite</span>`}
        <strong>Answer:</strong> ${q.choices.find(c=>c.key===q.correctKey)?.text ?? "(missing)"}<br>
        <strong>Why:</strong> ${q.explain}
      `;
    });
  }

  // Buttons
  els.newQsBtn.addEventListener("click", () => {
    buildQuestions();
    renderQuestions();
    setStatus("New questions generated.");
  });
  els.submitBtn.addEventListener("click", submitQuestions);

  els.resetBtn.addEventListener("click", () => {
    els.iRate.value = els.iRateNum.value = "6";
    els.piE.value = els.piENum.value = "3";
    els.piA.value = els.piANum.value = "3";
    els.principal.value = els.principalNum.value = "1000";
    update();
    buildQuestions(); renderQuestions();
    setStatus("Reset to baseline.");
  });

  els.randomBtn.addEventListener("click", () => {
    const i = (Math.random()*14 - 2);      // -2 to 12
    const pie = (Math.random()*12 - 2);   // -2 to 10
    // actual inflation can deviate from expected
    const pi = pie + (Math.random()*6 - 3); // surprise -3..+3
    const P = 100 + Math.floor(Math.random()*98)*50;

    els.iRate.value = els.iRateNum.value = i.toFixed(1);
    els.piE.value = els.piENum.value = pie.toFixed(1);
    els.piA.value = els.piANum.value = clamp(pi, -2, 12).toFixed(1);
    els.principal.value = els.principalNum.value = String(P);

    update();
    buildQuestions(); renderQuestions();
    setStatus("Random scenario loaded.");
  });

  // Typeset header once
  const howTo = document.getElementById("howTo");
  if (howTo && window.MathJax?.typesetPromise) window.MathJax.typesetPromise([howTo]);

  // Init
  update();
  buildQuestions();
  renderQuestions();
  setStatus("Ready.");
});
