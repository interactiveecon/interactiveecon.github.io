const els = {
  zoneS: document.getElementById("zoneS"),
  zoneF: document.getElementById("zoneF"),
  zoneSx: document.getElementById("zoneSx"),
  zoneC: document.getElementById("zoneC"),

  newRoundBtn: document.getElementById("newRoundBtn"),
  resetBtn: document.getElementById("resetBtn"),
  status: document.getElementById("status"),

  checkBtn: document.getElementById("checkBtn"),
  checkMsg: document.getElementById("checkMsg"),

  mU: document.getElementById("mU"),
  mUnat: document.getElementById("mUnat"),
  mUcyc: document.getElementById("mUcyc"),
  mPop: document.getElementById("mPop"),

  mcq1: document.getElementById("mcq1"),
  mcq2: document.getElementById("mcq2"),
  submitBtn: document.getElementById("submitBtn"),
  feedback: document.getElementById("feedback"),
  decompNote: document.getElementById("decompNote"),
};

function setStatus(msg){ els.status.textContent = msg; }
function fmtPct(x){ return (100*x).toFixed(2) + "%"; }
function clampInt(x, lo=0){ return Math.max(lo, Math.floor(x)); }

let cards = [];
let nextId = 1;

// More templates; expand freely
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
  // 4..28
  return 4 + Math.floor(Math.random()*25);
}

function makeCard(tpl){
  return {
    id: "c" + (nextId++),
    people: drawPeople(),
    text: tpl.text,
    correct: tpl.type,     // "F" | "Sx" | "C"
    exp: tpl.exp,
    zone: "S",
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
    updateDecomp();
  });
}

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

    const zone = c.zone === "S" ? els.zoneS :
                 c.zone === "F" ? els.zoneF :
                 c.zone === "Sx" ? els.zoneSx : els.zoneC;
    zone.appendChild(el);
  }
}

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
  const u = Pop>0 ? (F+Sx+C)/Pop : 0;       // will be 1 if Pop>0, but we interpret as shares
  const uStar = Pop>0 ? (F+Sx)/Pop : 0;
  const uCyc = Pop>0 ? C/Pop : 0;

  // Here we interpret as shares of unemployment among unemployed cards;
  // To make it feel like rates, we can also compute as "rates" by assuming Pop includes employed too.
  // For now, the panel is about decomposition: cyclical share vs natural share.
  els.mU.textContent = Pop>0 ? "100.00%" : "—";
  els.mUnat.textContent = Pop>0 ? fmtPct(uStar) : "—";
  els.mUcyc.textContent = Pop>0 ? fmtPct(uCyc) : "—";
  els.mPop.textContent = Pop.toFixed(0);

  els.decompNote.textContent =
    Pop>0
      ? `Totals: F=${F}, S=${Sx}, C=${C}. Natural share = ${(100*uStar).toFixed(2)}%, cyclical share = ${(100*uCyc).toFixed(2)}%.`
      : "Place some cards into F/S/C to see the decomposition.";
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
    els.feedback.innerHTML = "Place some cards into the buckets first.";
    return;
  }
  const uStar = (F+Sx)/Pop;
  const uCyc = C/Pop;

  const cycTruth = (uCyc > 0.0001) ? "pos" : "zero";
  // with this construction, cyclical is never negative; we teach that u<u* would imply “negative cyclical”, but not represented here
  const cycAnswer = els.mcq1.value;
  const compAnswer = els.mcq2.value;

  const ok1 = cycAnswer === cycTruth;
  const ok2 = compAnswer === "cyc";

  els.feedback.innerHTML =
    `<strong>Answer check:</strong><br>` +
    `Cyclical unemployment is <strong>${uCyc > 0.0001 ? "positive" : "about zero"}</strong> because cyclical share = ${(100*uCyc).toFixed(2)}%. ` +
    `${ok1 ? "✅" : "❌"}<br>` +
    `When a recession ends, <strong>cyclical unemployment</strong> typically falls the most. ${ok2 ? "✅" : "❌"}<br><br>` +
    `<strong>Interpretation:</strong> frictional + structural make up the “natural” component (u*). Cyclical is the part tied to the business cycle.`;
}

setupDropzone(els.zoneS);
setupDropzone(els.zoneF);
setupDropzone(els.zoneSx);
setupDropzone(els.zoneC);

els.newRoundBtn.addEventListener("click", newRound);
els.resetBtn.addEventListener("click", reset);
els.checkBtn.addEventListener("click", check);
els.submitBtn.addEventListener("click", submit);

// typeset header once
const top = document.getElementById("mathTop");
if (top && window.MathJax?.typesetPromise) window.MathJax.typesetPromise([top]);

reset();
