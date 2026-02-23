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
    GDP: document.getElementById("binGDP"),
    GNP: document.getElementById("binGNP"),
    BOTH: document.getElementById("binBOTH"),
    NEITHER: document.getElementById("binNEITHER")
  },

  // results
  scoreVal: document.getElementById("scoreVal"),
  gdpVal: document.getElementById("gdpVal"),
  gnpVal: document.getElementById("gnpVal"),
  nfiaVal: document.getElementById("nfiaVal"),
  explain: document.getElementById("explain"),

  // progress
  placedCount: document.getElementById("placedCount"),
  totalCount: document.getElementById("totalCount"),

  // rubric strip
  ruleGDP: document.getElementById("ruleGDP"),
  ruleGNP: document.getElementById("ruleGNP"),
  ruleID: document.getElementById("ruleID")
};

let currentItems = [];
let draggedId = null;

function money(millions) {
  return `$${millions.toFixed(0)}m`;
}

function setStatus(msg) {
  if (els.status) els.status.textContent = msg;
}

/**
 * Eligibility:
 * - Drop nonoutput cards (user requested)
 * - Keep production + factor cards
 */
function eligibleForThisLab(item) {
  return item && (item.type === "production" || item.type === "factor");
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
  const bank = ITEM_BANK.filter(eligibleForThisLab);
  return shuffle(bank).slice(0, n);
}

/**
 * Correct bin logic (your 4 buckets):
 * - production:
 *    * GDP only if gdpCounts true and gnpCounts false
 *    * Both if gdpCounts true and gnpCounts true
 * - factor flows:
 *    * receipts from abroad (gnpSign > 0) -> GNP
 *    * payments to abroad (gnpSign < 0)  -> NEITHER
 */
function correctBin(item) {
  if (item.type === "factor") {
    const sign = (typeof item.gnpSign === "number") ? item.gnpSign : 0;
    if (sign > 0) return "GNP";
    if (sign < 0) return "NEITHER";
    return "NEITHER";
  }

  // production
  const gdp = !!item.gdpCounts;
  const gnp = !!item.gnpCounts;

  if (gdp && gnp) return "BOTH";
  if (gdp && !gnp) return "GDP";

  // In this lab we are not serving "production abroad by U.S. factors" as separate output cards
  // because we are using the identity approach (GDP + NFIA). If such a card exists, treat it as GNP.
  if (!gdp && gnp) return "GNP";

  return "NEITHER";
}

function clearFeedback() {
  document.querySelectorAll(".card").forEach(c => {
    c.classList.remove("good", "bad");
    const fb = c.querySelector(".feedback");
    if (fb) fb.textContent = "";
  });
  els.scoreVal.textContent = "—";
  els.gdpVal.textContent = "—";
  els.gnpVal.textContent = "—";
  els.nfiaVal.textContent = "—";
  els.explain.textContent = "";
}

function resetRubric() {
  const items = [els.ruleGDP, els.ruleGNP, els.ruleID].filter(Boolean);
  items.forEach(el => {
    el.classList.remove("done");
    const icon = el.querySelector(".rubric-icon");
    if (icon) icon.textContent = "○";
  });
}

function completeRubric() {
  const items = [els.ruleGDP, els.ruleGNP, els.ruleID].filter(Boolean);
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

  div.innerHTML = `
    <div class="top">
      <span class="tag">${item.type.toUpperCase()}</span>
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
    GDP: els.bins.GDP,
    GNP: els.bins.GNP,
    BOTH: els.bins.BOTH,
    NEITHER: els.bins.NEITHER
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

  if (!allPlaced) {
    setStatus(`Place all cards to enable Check/Compute (${placed}/${total} placed).`);
  } else {
    setStatus("All cards placed. You can Check answers or Compute totals.");
  }
}

function renderRound(items) {
  currentItems = items;

  // clear zones
  [els.pool, ...Object.values(els.bins)].forEach(z => (z.innerHTML = ""));
  clearFeedback();
  resetRubric();

  items.forEach(item => {
    els.pool.appendChild(makeCard(item));
  });

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
  // Pedagogically clean:
  // GDP = sum of domestic production (production items with gdpCounts=true)
  // NFIA = sum of factor items with gnpSign (+ for receipts, - for payments)
  // GNP = GDP + NFIA
  let gdp = 0;
  let nfia = 0;

  currentItems.forEach(item => {
    if (item.type === "production" && item.gdpCounts) {
      gdp += item.value;
    }
    if (item.type === "factor") {
      const sign = (typeof item.gnpSign === "number") ? item.gnpSign : 0;
      nfia += sign * item.value;
    }
  });

  const gnp = gdp + nfia;

  els.gdpVal.textContent = money(gdp);
  els.gnpVal.textContent = money(gnp);
  els.nfiaVal.textContent = `${nfia >= 0 ? "+" : "−"}${money(Math.abs(nfia))}`;

  const relation =
    (gnp > gdp) ? "GNP is greater than GDP" :
    (gnp < gdp) ? "GNP is less than GDP" :
    "GNP equals GDP";

  const nfiaText =
    (nfia > 0) ? "NFIA is positive: U.S. factors receive more income from abroad than they pay to foreign factors." :
    (nfia < 0) ? "NFIA is negative: U.S. pays more factor income to foreign factors than U.S. factors receive from abroad." :
    "NFIA is zero: net factor income flows cancel out.";

  els.explain.textContent =
    `${relation} in this set. ${nfiaText} Identity check: GNP = GDP + NFIA.`;

  completeRubric();
  setStatus("Computed totals using GNP = GDP + NFIA.");
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
