// app.js
window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const els = {
    zoneStage: $("zoneStage"),
    zoneEXP: $("zoneEXP"),
    zoneIMP: $("zoneIMP"),
    zoneNOT: $("zoneNOT"),

    newRoundBtn: $("newRoundBtn"),
    resetBtn: $("resetBtn"),
    checkBtn: $("checkBtn"),

    status: $("status"),
    progressMsg: $("progressMsg"),
    checkMsg: $("checkMsg"),
  };

  function setStatus(msg){ els.status.textContent = msg; }
  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;");
  }

  if (!window.OPPCOST_DATA || !Array.isArray(window.OPPCOST_DATA.cards)) {
    setStatus("ERROR: data.js did not load (OPPCOST_DATA missing).");
    return;
  }

  const ALL = window.OPPCOST_DATA.cards;
  let cards = [];

  function shuffle(a){
    for (let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
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
      c.revealDesc = false;

      renderBoard();
      updateProgress();
    });
  }

  [els.zoneStage, els.zoneEXP, els.zoneIMP, els.zoneNOT].forEach(setupDropzone);

  function renderCardHTML(c){
    const showDesc = (c.revealDesc === true);
    return `
      <div class="ctitle">${escapeHtml(c.title)}</div>
      ${showDesc ? `<div class="cdesc">${escapeHtml(c.desc)}</div>` : ``}
    `;
  }

  function renderBoard(){
    els.zoneStage.innerHTML = "";
    els.zoneEXP.innerHTML = "";
    els.zoneIMP.innerHTML = "";
    els.zoneNOT.innerHTML = "";

    if (!cards.length){
      const msg = document.createElement("div");
      msg.className = "mini";
      msg.textContent = "No cards loaded. Click New Round.";
      els.zoneStage.appendChild(msg);
      return;
    }

    for (const c of cards){
      const el = document.createElement("div");
      el.className = "card";
      if (c.checked === true) el.classList.add("ok");
      if (c.checked === false) el.classList.add("bad");
      el.draggable = true;

      el.innerHTML = renderCardHTML(c);

      el.addEventListener("dragstart", (ev) => {
        ev.dataTransfer.setData("text/plain", c.id);
        ev.dataTransfer.effectAllowed = "move";
      });

      const zoneEl =
        (c.zone === "STAGE") ? els.zoneStage :
        (c.zone === "EXP")   ? els.zoneEXP :
        (c.zone === "IMP")   ? els.zoneIMP :
        els.zoneNOT;

      zoneEl.appendChild(el);
    }
  }

  function updateProgress(){
    const total = cards.length;
    const placed = cards.filter(c => c.zone !== "STAGE").length;
    els.progressMsg.textContent = `Progress: ${placed}/${total} placed.`;
  }

  function check(){
    let correct = 0, placed = 0;
    const mistakes = [];

    for (const c of cards){
      if (c.zone === "STAGE"){
        c.checked = null;
        c.revealDesc = false;
        continue;
      }
      placed++;
      c.checked = (c.zone === c.correct);
      c.revealDesc = (c.checked === false);
      if (c.checked) correct++;
      else mistakes.push(c);
    }

    renderBoard();
    updateProgress();

    els.checkMsg.textContent =
      placed === 0 ? "Place some cards first."
      : `${correct}/${placed} placed cards correct.`;

    if (mistakes.length){
      const m = mistakes.slice(0,3)
        .map(x => `• ${x.title}: ${x.explain}`)
        .join("  ");
      setStatus(`Explanations (first few): ${m}`);
    } else if (placed > 0){
      setStatus("Nice — everything placed correctly.");
    }
  }

  function newRound(){
    const pool = ALL.slice();
    shuffle(pool);

    const n = Math.min(12, pool.length);
    cards = pool.slice(0, n).map(c => ({
      ...c,
      zone:"STAGE",
      checked:null,
      revealDesc:false
    }));

    els.checkMsg.textContent = "";
    setStatus("New round loaded.");
    renderBoard();
    updateProgress();
  }

  function resetBoard(){
    for (const c of cards){
      c.zone = "STAGE";
      c.checked = null;
      c.revealDesc = false;
    }
    els.checkMsg.textContent = "";
    setStatus("Reset.");
    renderBoard();
    updateProgress();
  }

  els.newRoundBtn.addEventListener("click", newRound);
  els.resetBtn.addEventListener("click", resetBoard);
  els.checkBtn.addEventListener("click", check);

  renderBoard();
  newRound();
});
