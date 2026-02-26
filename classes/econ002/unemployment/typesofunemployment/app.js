window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);
  const missing = [];
  const must = (id) => { const el = $(id); if (!el) missing.push(id); return el; };

  const els = {
    // zones
    zoneStaging: must("zoneStaging"),
    zoneFrictional: must("zoneFrictional"),
    zoneStructural: must("zoneStructural"),
    zoneCyclical: must("zoneCyclical"),

    // controls
    newRoundBtn: must("newRoundBtn"),
    resetBtn: must("resetBtn"),
    status: must("status"),
    checkBtn: must("checkBtn"),
    checkMsg: must("checkMsg"),

    // employed controls
    empSlider: must("empSlider"),
    empNumber: must("empNumber"),
    empVal: must("empVal"),

    // metrics
    m_u: must("m_u"),
    m_ustar: must("m_ustar"),
    m_ucyc: must("m_ucyc"),
    m_U: must("m_U"),
    m_LF: must("m_LF"),

    // mcq
    mcq1: must("mcq1"),
    mcq2: must("mcq2"),
    submitBtn: must("submitBtn"),
    feedback: must("feedback"),
    decompNote: must("decompNote"),
  };

  function setStatus(msg){ els.status.textContent = msg; }
  function fmtPct(x){ return (100*x).toFixed(2) + "%"; }

  if (missing.length){
    console.error("Missing element IDs:", missing);
    if (els.status) els.status.textContent = `Missing element IDs in HTML: ${missing.join(", ")}`;
    return;
  }

  // Types: FRIC, STRU, CYC
  const TEMPLATES = [
    // frictional
    { type:"FRIC", text:"Quit a job to search for a better match in the same city.", exp:"Frictional: job-to-job search/matching." },
    { type:"FRIC", text:"Recent graduate searching for a first job.", exp:"Frictional: new entrant searching." },
    { type:"FRIC", text:"Moved to a new city and is searching for work.", exp:"Frictional: search after relocation." },
    { type:"FRIC", text:"Seasonal worker between seasonal jobs and actively searching.", exp:"Frictional: short transition/search." },
    { type:"FRIC", text:"Left a job and is comparing offers/interviewing.", exp:"Frictional: matching process." },
    { type:"FRIC", text:"Quit a job because of a poor fit; actively looking for a new one.", exp:"Frictional: search/matching." },

    // structural
    { type:"STRU", text:"Factory closes due to automation; workers need new skills.", exp:"Structural: skills mismatch after tech change." },
    { type:"STRU", text:"Coal industry declines; workers must retrain for other sectors.", exp:"Structural: industry shift/mismatch." },
    { type:"STRU", text:"Demand shifts from retail to e-commerce; store workers displaced.", exp:"Structural: sectoral reallocation." },
    { type:"STRU", text:"Workers in a shrinking region struggle to find local jobs.", exp:"Structural: geographic mismatch." },
    { type:"STRU", text:"Licensing requirements block switching into a growing occupation.", exp:"Structural: institutional barrier/mismatch." },
    { type:"STRU", text:"New technology changes tasks; workers need retraining.", exp:"Structural: skills mismatch." },

    // cyclical
    { type:"CYC", text:"Recession causes falling sales; firms lay off workers broadly.", exp:"Cyclical: weak demand in a downturn." },
    { type:"CYC", text:"Restaurants cut staff after a sharp decline in consumer spending.", exp:"Cyclical: aggregate demand fall." },
    { type:"CYC", text:"A downturn reduces exports; manufacturers lay off workers.", exp:"Cyclical: demand shock." },
    { type:"CYC", text:"Hiring freezes spread during a recession.", exp:"Cyclical: economy-wide weakness." },
    { type:"CYC", text:"Construction employment drops when spending falls sharply.", exp:"Cyclical: demand-sensitive layoffs." },
    { type:"CYC", text:"Firms reduce hours and lay off workers after orders collapse.", exp:"Cyclical: demand collapse." },
  ];

  let cards = [];
  let nextId = 1;

  function drawPeople(){ return 4 + Math.floor(Math.random()*25); } // 4..28

  function makeCard(tpl){
    return {
      id: "c" + (nextId++),
      people: drawPeople(),
      text: tpl.text,
      correct: tpl.type,
      exp: tpl.exp,
      zone: "STAGE",
      checked: null
    };
  }

  function setupDropzone(zoneEl){
    zoneEl.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      zoneEl.classList.add("dragover");
    });
    zoneEl.addEventListener("dragleave", () => zoneEl.classList.remove("dragover"));
    zoneEl.addEventListener("drop", (ev) => {
      ev.preventDefault();
      zoneEl.classList.remove("dragover");
      const id = ev.dataTransfer.getData("text/plain");
      const z = zoneEl.dataset.zone;
      const c = cards.find(x => x.id === id);
      if (!c) return;
      c.zone = z;
      c.checked = null;
      els.checkMsg.textContent = "";
      renderZones();
      updateDashboard();
    });
  }

  setupDropzone(els.zoneStaging);
  setupDropzone(els.zoneFrictional);
  setupDropzone(els.zoneStructural);
  setupDropzone(els.zoneCyclical);

  function renderZones(){
    els.zoneStaging.innerHTML = "";
    els.zoneFrictional.innerHTML = "";
    els.zoneStructural.innerHTML = "";
    els.zoneCyclical.innerHTML = "";

    for (const c of cards){
      const el = document.createElement("div");
      el.className = "card";
      if (c.checked === true) el.classList.add("ok");
      if (c.checked === false) el.classList.add("bad");

      el.draggable = true;
      el.dataset.cardId = c.id;

      el.innerHTML = `
        <div class="badge">${c.people} people</div>
        <div class="desc">${c.text}</div>
      `;

      el.addEventListener("dragstart", (ev) => {
        ev.dataTransfer.setData("text/plain", c.id);
        ev.dataTransfer.effectAllowed = "move";
      });

      const zoneEl =
        (c.zone === "STAGE") ? els.zoneStaging :
        (c.zone === "FRIC") ? els.zoneFrictional :
        (c.zone === "STRU") ? els.zoneStructural :
        els.zoneCyclical;

      zoneEl.appendChild(el);
    }
  }

  function counts(){
    let F=0,S=0,C=0;
    for (const c of cards){
      if (c.zone === "FRIC") F += c.people;
      else if (c.zone === "STRU") S += c.people;
      else if (c.zone === "CYC") C += c.people;
    }
    return {F,S,C,U: F+S+C};
  }

  function getE(){ return Number(els.empSlider.value || 0); }

  function syncEUI(){
    // keep slider, number, and display aligned
    els.empNumber.value = els.empSlider.value;
    els.empVal.textContent = String(getE());
  }

  function updateDashboard(){
    syncEUI();

    const {F,S,C,U} = counts();
    const E = getE();
    const LF = E + U;

    if (LF === 0){
      els.m_u.textContent = "—";
      els.m_ustar.textContent = "—";
      els.m_ucyc.textContent = "—";
      els.m_U.textContent = "0";
      els.m_LF.textContent = "0";
      els.decompNote.textContent = "Place cards into the buckets (and set E) to see u, u*, and cyclical unemployment.";
      return;
    }

    const u = U / LF;
    const uStar = (F + S) / LF;
    const uCyc = C / LF;

    els.m_u.textContent = fmtPct(u);
    els.m_ustar.textContent = fmtPct(uStar);
    els.m_ucyc.textContent = fmtPct(uCyc);
    els.m_U.textContent = String(U);
    els.m_LF.textContent = String(LF);

    els.decompNote.textContent =
      `From your placed cards: F=${F}, S=${S}, C=${C} (so U=${U}). With E=${E}, LF=${LF}.`;
  }

  function newRound(){
    nextId = 1;
    const pool = [...TEMPLATES].sort(()=>Math.random()-0.5);
    const n = 10 + Math.floor(Math.random()*5); // 10..14
    cards = pool.slice(0, n).map(makeCard);

    els.checkMsg.textContent = "";
    els.feedback.textContent = "Answer the questions and submit.";
    els.mcq1.value = "";
    els.mcq2.value = "";

    renderZones();
    updateDashboard();
    setStatus("New round loaded.");
  }

  function reset(){
    newRound();
    setStatus("Reset.");
  }

  function check(){
    let correct = 0, placed = 0;
    for (const c of cards){
      if (c.zone === "STAGE") { c.checked = null; continue; }
      placed++;
      c.checked = (c.zone === c.correct);
      if (c.checked) correct++;
    }
    renderZones();
    els.checkMsg.textContent = placed === 0 ? "Place some cards first." : `${correct}/${placed} placed cards correct.`;
  }

  function submit(){
    const {U} = counts();
    if (U === 0){
      els.feedback.innerHTML = "Place at least one card into a bucket first.";
      return;
    }

    const ok1 = els.mcq1.value === "cyc";
    const ok2 = els.mcq2.value === "struct";

    els.feedback.innerHTML =
      `<strong>Answer check:</strong><br>` +
      `In a recession, <strong>cyclical</strong> unemployment typically rises the most. ${ok1 ? "✅" : "❌"}<br>` +
      `A retraining program mainly reduces <strong>structural</strong> unemployment. ${ok2 ? "✅" : "❌"}`;
  }

  // Wire E controls
  els.empSlider.addEventListener("input", updateDashboard);
  els.empNumber.addEventListener("input", () => {
    const v = Number(els.empNumber.value);
    if (!Number.isFinite(v)) return;
    const min = Number(els.empSlider.min), max = Number(els.empSlider.max);
    const step = Number(els.empSlider.step) || 1;
    const clamped = Math.max(min, Math.min(max, Math.round(v/step)*step));
    els.empSlider.value = String(clamped);
    updateDashboard();
  });

  // Wire buttons
  els.newRoundBtn.addEventListener("click", newRound);
  els.resetBtn.addEventListener("click", reset);
  els.checkBtn.addEventListener("click", check);
  els.submitBtn.addEventListener("click", submit);

  // typeset header once
  const top = document.getElementById("mathTop");
  if (top && window.MathJax?.typesetPromise) window.MathJax.typesetPromise([top]);

  // Start
  newRound();
});
