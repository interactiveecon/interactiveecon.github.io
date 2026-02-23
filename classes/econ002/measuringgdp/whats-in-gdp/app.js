/* global ITEM_BANK */

const els = {
  nCards: document.getElementById("nCards"),
  newRoundBtn: document.getElementById("newRoundBtn"),
  checkBtn: document.getElementById("checkBtn"),
  computeBtn: document.getElementById("computeBtn"),
  resetBtn: document.getElementById("resetBtn"),
  status: document.getElementById("status"),

  pool: document.getElementById("cardPool"),
  bins: {
    IN: document.getElementById("binIN"),
    INT: document.getElementById("binINT"),
    TF: document.getElementById("binTF"),
    USED: document.getElementById("binUSED"),
    IMP: document.getElementById("binIMP")
  },

  scoreVal: document.getElementById("scoreVal"),
  includedVal: document.getElementById("includedVal"),
  excludedVal: document.getElementById("excludedVal"),
  countVal: document.getElementById("countVal"),
  explain: document.getElementById("explain"),

  placedCount: document.getElementById("placedCount"),
  totalCount: document.getElementById("totalCount"),

  // rubric strip
  ruleFinal: document.getElementById("ruleFinal"),
  ruleNotProd: document.getElementById("ruleNotProd"),
  ruleDomestic: document.getElementById("ruleDomestic")
};

let currentItems = [];
let draggedId = null;

function money(millions) {
  return `$${millions.toFixed(0)}m`;
}

function setStatus(msg) {
  if (els.status) els.status.textContent = msg;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickN(n) {
  return shuffle(ITEM_BANK).slice(0, n);
}

function correctBin(item) {
  return item.bucket; // IN, INT, TF, USED, IMP
}

function clearFeedback() {
  document.querySelectorAll(".card").forEach(c => {
    c.classList.remove("good", "bad");
    const fb = c.querySelector(".feedback");
    if (fb) fb.textContent = "";
  });
  els.scoreVal.textContent = "—";
  els.includedVal.textContent = "—";
  els.excludedVal.textContent = "—";
  els.countVal.textContent = "—";
  els.explain.textContent = "";
}

function resetRubric() {
  const items = [els.ruleFinal, els.ruleNotProd, els.ruleDomestic].filter(Boolean);
  items.forEach(el => {
    el.classList.remove("done");
    const icon = el.querySelector(".rubric-icon");
    if (icon) icon.textContent = "○";
  });
}

function completeRubric() {
  const items = [els.ruleFinal, els.ruleNotProd, els.ruleDomestic].filter(Boolean);
  items.forEach(el => {
    el.classList.add("done");
    const icon = el.querySelector(".rubric-icon");
    if (icon) icon.textContent = "✓";
  });
}

function makeCard(item) {
  const div = document.createElement("div");
  div.className = "card";
  div.draggable = true;
  div.id = `card_${item.id}`;

  // NO tag pill (per your request)
  div.innerHTML = `
    <div class="top">
      <span class="money">${money(item.value)}</span>
    </div>
    <div class="desc"><strong>${item.title}:</strong> ${item.desc}</div>
    <div class="feedback"></div>
  `;

  div.addEventListener("dragstart", (e) => {
    draggedId = item.id;
    e.dataTransfer.setData("text/plain", item.id);
    e.dataTransfer.effectAllowed = "move";
  });

  return div;
}

function setupDropzone(zone) {
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragover");
    e.dataTransfer.dropEffect = "move";
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("dragover");
  });

  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");

    const id = e.dataTransfer.getData("text/plain") || draggedId;
    if (!id) return;

    const cardEl = document.getElementById(`card_${id}`);
    if (cardEl) zone.appendChild(cardEl);

    // clear grading visuals on move
    cardEl?.classList.remove("good", "bad");
    const fb = cardEl?.querySelector(".feedback");
    if (fb) fb.textContent = "";

    updateProgressAndButtons();
  });
}

function initDnD() {
  setupDropzone(els.pool);
  Object.values(els.bins).forEach(setupDropzone);
}

function getPlacementMap() {
  const map = {};
  currentItems.forEach(it => (map[it.id] = "POOL"));

  const zones = {
    POOL: els.pool,
    IN: els.bins.IN,
    INT: els.bins.INT,
    TF: els.bins.TF,
    USED: els.bins.USED,
    IMP: els.bins.IMP
  };

  Object.entries(zones).forEach(([bin, zone]) => {
    zone.querySelectorAll(".card").forEach(card => {
      const id = card.id.replace("card_", "");
      map[id] = bin;
    });
  });

  return map;
}

function updateProgressAndButtons() {
  const place = getPlacementMap();
  const total = currentItems.length;
  let placed = 0;

  currentItems.forEach(item => {
    if (place[item.id] && place[item.id] !== "POOL") placed++;
  });

  if (els.placedCount) els.placedCount.textContent = String(placed);
  if (els.totalCount) els.totalCount.textContent = String(total);

  const allPlaced = (placed === total && total > 0);
  els.checkBtn.disabled = !allPlaced;
  els.computeBtn.disabled = !allPlaced;

  if (!allPlaced) setStatus(`Place all cards to enable Check/Compute (${placed}/${total} placed).`);
  else setStatus("All cards placed. You can Check answers or Compute totals.");
}

function renderRound(items) {
  currentItems = items;

  [els.pool, ...Object.values(els.bins)].forEach(z => (z.innerHTML = ""));
  clearFeedback();
  resetRubric();

  items.forEach(item => els.pool.appendChild(makeCard(item)));

  if (els.totalCount) els.totalCount.textContent = String(items.length);
  updateProgressAndButtons();
}

function resetBinsToPool() {
  clearFeedback();
  resetRubric();
  document.querySelectorAll(".card").forEach(c => els.pool.appendChild(c));
  updateProgressAndButtons();
}

function checkAnswers() {
  const place = getPlacementMap();
  let correct = 0;

  currentItems.forEach(item => {
    const where = place[item.id];
    const cardEl = document.getElementById(`card_${item.id}`);
    const fb = cardEl.querySelector(".feedback");
    const target = correctBin(item);

    cardEl.classList.remove("good", "bad");
    if (where === target) {
      correct++;
      cardEl.classList.add("good");
      fb.textContent = "✓ Correct. " + item.explain;
    } else {
      cardEl.classList.add("bad");
      fb.textContent = `✗ Not quite. Correct bin: ${target}. ` + item.explain;
    }
  });

  els.scoreVal.textContent = `${correct} / ${currentItems.length}`;
  setStatus(`Checked answers. Correct: ${correct}/${currentItems.length}.`);
}

function computeTotals() {
  let included = 0;
  let excluded = 0;

  const breakdown = { INT: 0, TF: 0, USED: 0, IMP: 0 };

  currentItems.forEach(item => {
    if (item.bucket === "IN") included += item.value;
    else {
      excluded += item.value;
      breakdown[item.bucket] += item.value;
    }
  });

  els.includedVal.textContent = money(included);
  els.excludedVal.textContent = money(excluded);
  els.countVal.textContent = String(currentItems.length);

  els.explain.textContent =
    `Included total is the value of domestic final production in the period. ` +
    `Excluded breakdown: Intermediate ${money(breakdown.INT)}, Transfers/Financial ${money(breakdown.TF)}, ` +
    `Used/Non-market ${money(breakdown.USED)}, Imports ${money(breakdown.IMP)}.`;

  completeRubric();
  setStatus("Computed totals based on GDP inclusion rules.");
}

function newRound() {
  const n = parseInt(els.nCards.value, 10);
  renderRound(pickN(n));
}

function init() {
  initDnD();
  newRound();

  els.newRoundBtn.addEventListener("click", newRound);
  els.checkBtn.addEventListener("click", checkAnswers);
  els.computeBtn.addEventListener("click", computeTotals);
  els.resetBtn.addEventListener("click", resetBinsToPool);

  updateProgressAndButtons();
}

init();
