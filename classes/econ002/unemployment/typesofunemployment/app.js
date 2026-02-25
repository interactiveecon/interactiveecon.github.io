window.addEventListener("DOMContentLoaded", () => {
  // ---- Helpers ----
  const $ = (id) => document.getElementById(id);

  function must(id){
    const el = $(id);
    if (!el) missing.push(id);
    return el;
  }

  function setStatus(msg){
    if (els.status) els.status.textContent = msg;
    else console.warn(msg);
  }

  function fmtPct(x){ return (100*x).toFixed(2) + "%"; }

  // ---- Grab required elements (and validate) ----
  const missing = [];
  const els = {
    zoneS: must("zoneS"),
    zoneF: must("zoneF"),
    zoneSx: must("zoneSx"),
    zoneC: must("zoneC"),

    newRoundBtn: must("newRoundBtn"),
    resetBtn: must("resetBtn"),
    status: must("status"),

    checkBtn: must("checkBtn"),
    checkMsg: must("checkMsg"),

    mU: must("mU"),
    mUnat: must("mUnat"),
    mUcyc: must("mUcyc"),
    mPop: must("mPop"),

    mcq1: must("mcq1"),
    mcq2: must("mcq2"),
    submitBtn: must("submitBtn"),
    feedback: must("feedback"),
    decompNote: must("decompNote"),
  };

  if (missing.length){
    setStatus(`Missing element IDs in HTML: ${missing.join(", ")}`);
    console.error("Types of Unemployment Lab: missing IDs:", missing);
    return;
  }

  // ---- State ----
  let cards = [];
  let nextId = 1;

  const empSlider = document.getElementById("empSlider");
const empVal = document.getElementById("empVal");

const m_u = document.getElementById("m_u");
const m_ustar = document.getElementById("m_ustar");
const m_ucyc = document.getElementById("m_ucyc");
const m_U = document.getElementById("m_U");
const m_LF = document.getElementById("m_LF");

  function getE(){
  return Number(empSlider?.value || 0);
}

  // Templates
  const TEMPLATES = [
    // frictional
    { type:"F", text:"Quit a job to search for a better match in the same city.", exp:"Frictional: job-to-job search/matching." },
    { type:"F", text:"Recent graduate searching for a first job.", exp:"Frictional: new entrant searching." },
    { type:"F", text:"Moved to a new city and is searching for work.", exp:"Frictional: search after relocation." },
    { type:"F", text:"Seasonal worker between seasonal jobs and actively searching.", exp:"Frictional: short-term transition/search." },
    { type:"F", text:"Left a job and is comparing offers/interviewing.", exp:"Frictional: matching process." },

    // structural
    { type:"Sx", text:"Factory closes due to automation; workers need new skills.", exp:"Structural: skills mismatch after technology change." },
    { type:"Sx", text:"Coal industry declines; workers must retrain for other sectors.", exp:"Structural: industry shift/mismatch." },
    { type:"Sx", text:"Demand shifts from retail to e-commerce; store workers displaced.", exp:"Structural: sectoral reallocation." },
    { type:"Sx", text:"Workers in a shrinking region struggle to find local jobs.", exp:"Structural: geographic mismatch." },
    { type:"Sx", text:"Licensing requirements prevent switching into a growing occupation.", exp:"Structural: institutional barrier/mismatch." },

    // cyclical
    { type:"C", text:"Recession causes falling sales; firms lay off workers broadly.", exp:"Cyclical: weak demand in a downturn." },
    { type:"C", text:"Construction employment drops because interest rates rise and spending falls.", exp:"Cyclical: demand-sensitive layoffs." },
    { type:"C", text:"Restaurants cut staff after a sharp decline in consumer spending.", exp:"Cyclical: aggregate demand fall." },
    { type:"C", text:"A downturn reduces exports; manufacturers lay off workers.", exp:"Cyclical: demand shock." },
    { type:"C", text:"Hiring freezes spread during a recession.", exp:"Cyclical: economy-wide weakness." },
  ];

  function drawPeople(){
    return 4 + Math.floor(Math.random()*25); // 4..28
  }

  function makeCard(tpl){
    return {
      id: "c" + (nextId++),
      people: drawPeople(),
      text: tpl.text,
      correct: tpl.type,  // F | Sx | C
      exp: tpl.exp,
      zone: "S",
      checked: null
    };
  }

  // ---- Drag/drop ----
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
      updateDecomp();
    });
  }

  setupDropzone(els.zoneS);
  setupDropzone(els.zoneF);
  setupDropzone(els.zoneSx);
  setupDropzone(els.zoneC);

  // ---- Rendering ----
  function renderZones(){
    els.zoneS.innerHTML = "";
    els.zoneF.innerHTML = "";
    els.zoneSx.innerHTML = "";
    els.zoneC.innerHTML = "";

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

      const zoneEl = (c.zone === "S") ? els.zoneS :
                     (c.zone === "F") ? els.zoneF :
                     (c.zone === "Sx") ? els.zoneSx : els.zoneC;

      zoneEl.appendChild(el);
    }
  }

  function countsFromZones(){
    let F=0,Sx=0,C=0;
    for (const c of cards){
      if (c.zone === "F") F += c.people;
      else if (c.zone === "Sx") Sx += c.people;
      else if (c.zone === "C") C += c.people;
    }
    const Pop = F + Sx + C;
    return {F,Sx,C,Pop};
  }

  function updateDecomp(){
  const {F,Sx,C,Pop} = countsFromZones();
  const U = F + Sx + C;
  const E = getE();
  const LF = E + U;

  if (empVal) empVal.textContent = String(E);

  if (LF === 0){
    m_u.textContent = "—";
    m_ustar.textContent = "—";
    m_ucyc.textContent = "—";
    m_U.textContent = "0";
    m_LF.textContent = "0";
    els.decompNote.textContent = "Set E and place some cards into F/S/C to see u, u*, and cyclical unemployment.";
    return;
  }

  const u = U / LF;
  const uStar = (F + Sx) / LF;
  const uCyc = C / LF;

  m_u.textContent = fmtPct(u);
  m_ustar.textContent = fmtPct(uStar);
  m_ucyc.textContent = fmtPct(uCyc);
  m_U.textContent = String(U);
  m_LF.textContent = String(LF);

  els.decompNote.textContent =
    `Totals: F=${F}, S=${Sx}, C=${C}, U=${U}, E=${E}. ` +
    `u=${(100*u).toFixed(2)}%, u*=${(100*uStar).toFixed(2)}%, cyclical=${(100*uCyc).toFixed(2)}%.`;
}

  empSlider.addEventListener("input", updateDecomp);

  // ---- Actions ----
  function newRound(){
    const pool = [...TEMPLATES].sort(()=>Math.random()-0.5);
    const n = 10 + Math.floor(Math.random()*5); // 10..14
    cards = pool.slice(0, n).map(makeCard);

    els.checkMsg.textContent = "";
    els.feedback.textContent = "Answer the questions and submit. (This uses your current sorting.)";
    els.mcq1.value = "";
    els.mcq2.value = "";

    renderZones();
    updateDecomp();
    setStatus("New round loaded.");
  }

  function reset(){
    nextId = 1;
    newRound();
  }

  function check(){
    let correct = 0, placed = 0;
    for (const c of cards){
      if (c.zone === "S") { c.checked = null; continue; }
      placed++;
      c.checked = (c.zone === c.correct);
      if (c.checked) correct++;
    }
    renderZones();
    els.checkMsg.textContent = placed === 0 ? "Place some cards first." : `${correct}/${placed} placed cards correct.`;
  }

  function submit(){
    const {F,Sx,C,Pop} = countsFromZones();
    if (Pop === 0){
      els.feedback.textContent = "Place some cards into the buckets first.";
      return;
    }

    const uCyc = C/Pop;
    const cycTruth = (uCyc > 0.0001) ? "pos" : "zero";

    const ok1 = els.mcq1.value === cycTruth;
    const ok2 = els.mcq2.value === "cyc";

    els.feedback.innerHTML =
      `<strong>Answer check:</strong><br>` +
      `Cyclical unemployment is <strong>${uCyc > 0.0001 ? "positive" : "about zero"}</strong> because cyclical share = ${(100*uCyc).toFixed(2)}%. ${ok1 ? "✅" : "❌"}<br>` +
      `When a recession ends, <strong>cyclical unemployment</strong> typically falls the most. ${ok2 ? "✅" : "❌"}<br><br>` +
      `<strong>Interpretation:</strong> frictional + structural make up the “natural” component (u*). Cyclical is the business-cycle part.`;
  }

  // ---- Wire up ----
  els.newRoundBtn.addEventListener("click", newRound);
  els.resetBtn.addEventListener("click", reset);
  els.checkBtn.addEventListener("click", check);
  els.submitBtn.addEventListener("click", submit);

  // typeset header once (optional)
  const top = document.getElementById("mathTop");
  if (top && window.MathJax?.typesetPromise) window.MathJax.typesetPromise([top]);

  // Start
  reset();
});
