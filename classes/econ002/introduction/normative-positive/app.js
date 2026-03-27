// app.js — Positive vs Normative Economics
// Supports ?disc=1 for discussion section mode:
//   - Limits to DISC_ROUNDS rounds (each round = 5 cards)
//   - Changes breadcrumb to "← Week 1"
//   - Shows "Finish & Return" button when all rounds checked

window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  // ── Disc mode detection ───────────────────────────────────────────────────
  const DISC_MODE   = new URLSearchParams(location.search).get('disc') === '1';
  const DISC_ROUNDS = 1;   // one round of 5 cards in disc mode
  const DISC_CARDS  = 5;   // cards per round in disc mode
  const WEEK_URL    = '/classes/econ002/discussion/week-01/';

  if (DISC_MODE) {
    const crumb = document.querySelector('.crumb-link');
    if (crumb) { crumb.textContent = '← Week 1'; crumb.href = WEEK_URL; }
  }

  const els = {
    zoneStage:    $("zoneStage"),
    zonePOS:      $("zonePOS"),
    zoneEFF:      $("zoneEFF"),
    zoneEQT:      $("zoneEQT"),
    zoneGRW:      $("zoneGRW"),
    zoneSTB:      $("zoneSTB"),
    newRoundBtn:  $("newRoundBtn"),
    resetBtn:     $("resetBtn"),
    checkBtn:     $("checkBtn"),
    status:       $("status"),
    progressMsg:  $("progressMsg"),
    checkMsg:     $("checkMsg"),
  };

  function setStatus(msg){ els.status.textContent = msg; }
  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;").replaceAll("<","&lt;")
      .replaceAll(">","&gt;").replaceAll('"',"&quot;");
  }

  if (!window.POSNORM_DATA || !Array.isArray(window.POSNORM_DATA.cards)) {
    setStatus("ERROR: data.js did not load (POSNORM_DATA missing).");
    return;
  }

  const ALL  = window.POSNORM_DATA.cards;
  let cards  = [];
  let roundsChecked = 0;
  let checked = false;  // has current round been checked?

  function shuffle(a){
    for (let i = a.length-1; i > 0; i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  // ── Finish banner ─────────────────────────────────────────────────────────
  function showFinishBanner(){
    if ($('discFinishBanner')) return;
    const correct = cards.filter(c => c.checked === true).length;
    const total   = cards.filter(c => c.zone !== 'STAGE').length;
    const banner  = document.createElement('div');
    banner.id = 'discFinishBanner';
    banner.style.cssText = `
      margin-top:16px; padding:16px 20px; border-radius:16px;
      background:rgba(27,127,75,0.08); border:1.5px solid rgba(27,127,75,0.35);
      display:flex; align-items:center; justify-content:space-between;
      flex-wrap:wrap; gap:12px;
    `;
    banner.innerHTML = `
      <div>
        <div style="font-weight:800;color:#1b7f4b;font-size:14px;">
          ✓ Lab complete — ${correct} / ${total} correct
        </div>
        <div style="font-size:12px;color:#6b7280;margin-top:3px;">
          Wait for your TA to review the answers, then return to Week 1 to continue.
        </div>
      </div>
      <a href="${WEEK_URL}"
         style="padding:10px 20px;background:#1b7f4b;color:#fff;border-radius:12px;
                font-weight:800;font-size:13px;text-decoration:none;white-space:nowrap;">
        ← Return to Week 1
      </a>
    `;
    const main = document.querySelector('main');
    if (main) main.appendChild(banner);
    else document.body.appendChild(banner);

    els.newRoundBtn.disabled    = true;
    els.newRoundBtn.style.opacity = '0.4';
  }

  // ── Dropzone setup ────────────────────────────────────────────────────────
  function setupDropzone(zoneEl){
    zoneEl.addEventListener("dragover", (ev) => {
      ev.preventDefault(); zoneEl.classList.add("dragover");
    });
    zoneEl.addEventListener("dragleave", () => zoneEl.classList.remove("dragover"));
    zoneEl.addEventListener("drop", (ev) => {
      ev.preventDefault(); zoneEl.classList.remove("dragover");
      const id = ev.dataTransfer.getData("text/plain");
      const z  = zoneEl.dataset.zone;
      const c  = cards.find(x => x.id === id);
      if (!c) return;
      c.zone       = z;
      c.checked    = null;
      c.revealDesc = false;
      renderBoard();
      updateProgress();
    });
  }

  [els.zoneStage, els.zonePOS, els.zoneEFF, els.zoneEQT,
   els.zoneGRW, els.zoneSTB].forEach(setupDropzone);

  // ── Rendering ─────────────────────────────────────────────────────────────
  function renderCardHTML(c){
    return `
      <div class="ctitle">${escapeHtml(c.title)}</div>
      ${c.revealDesc ? `<div class="cdesc">${escapeHtml(c.desc)}</div>` : ''}
    `;
  }

  function renderBoard(){
    [els.zoneStage, els.zonePOS, els.zoneEFF, els.zoneEQT,
     els.zoneGRW, els.zoneSTB].forEach(z => z.innerHTML = '');

    if (!cards.length){
      const msg = document.createElement('div');
      msg.className   = 'mini';
      msg.textContent = 'No cards loaded. Click New Round.';
      els.zoneStage.appendChild(msg);
      return;
    }

    for (const c of cards){
      const el = document.createElement('div');
      el.className  = 'card';
      if (c.checked === true)  el.classList.add('ok');
      if (c.checked === false) el.classList.add('bad');
      el.draggable  = true;
      el.innerHTML  = renderCardHTML(c);
      el.addEventListener('dragstart', (ev) => {
        ev.dataTransfer.setData('text/plain', c.id);
        ev.dataTransfer.effectAllowed = 'move';
      });
      const zoneEl =
        c.zone === 'STAGE' ? els.zoneStage :
        c.zone === 'POS'   ? els.zonePOS   :
        c.zone === 'EFF'   ? els.zoneEFF   :
        c.zone === 'EQT'   ? els.zoneEQT   :
        c.zone === 'GRW'   ? els.zoneGRW   : els.zoneSTB;
      zoneEl.appendChild(el);
    }
  }

  function updateProgress(){
    const total  = cards.length;
    const placed = cards.filter(c => c.zone !== 'STAGE').length;
    els.progressMsg.textContent = `Progress: ${placed}/${total} placed.`;
  }

  // ── Check ─────────────────────────────────────────────────────────────────
  function check(){
    let correct = 0, placed = 0;

    for (const c of cards){
      if (c.zone === 'STAGE'){ c.checked = null; c.revealDesc = false; continue; }
      placed++;
      c.checked    = (c.zone === c.correct);
      c.revealDesc = (c.checked === false);
      if (c.checked) correct++;
    }

    renderBoard();
    updateProgress();

    els.checkMsg.textContent =
      placed === 0 ? 'Place some cards first.'
      : `${correct}/${placed} placed cards correct.`;

    if (placed > 0) {
      checked = true;
      roundsChecked++;

      if (DISC_MODE) {
        // In disc mode: after checking, show finish banner
        setStatus(`${correct}/${placed} correct. Review with your TA, then return to Week 1.`);
        showFinishBanner();
        els.checkBtn.disabled     = true;
        els.checkBtn.style.opacity = '0.4';
      } else {
        const mistakes = cards.filter(c => c.checked === false);
        if (mistakes.length){
          const m = mistakes.slice(0,3).map(x => `• ${x.title}: ${x.explain}`).join('  ');
          setStatus(`Explanations (first few): ${m}`);
        } else {
          setStatus('Nice — everything placed correctly.');
        }
      }
    }
  }

  // ── New round ─────────────────────────────────────────────────────────────
  function newRound(){
    if (DISC_MODE && roundsChecked >= DISC_ROUNDS){
      showFinishBanner(); return;
    }

    const pool = ALL.slice();
    shuffle(pool);
    const n = DISC_MODE ? DISC_CARDS : Math.min(12, pool.length);
    cards = pool.slice(0, n).map(c => ({
      ...c, zone: 'STAGE', checked: null, revealDesc: false
    }));

    checked = false;
    els.checkMsg.textContent    = '';
    els.checkBtn.disabled       = false;
    els.checkBtn.style.opacity  = '1';
    setStatus(DISC_MODE ? `Sort all ${DISC_CARDS} cards, then click Check.` : 'New round loaded.');
    renderBoard();
    updateProgress();

    if (DISC_MODE){
      els.newRoundBtn.disabled    = true;
      els.newRoundBtn.style.opacity = '0.4';
      els.newRoundBtn.title = 'One round in discussion mode';
    }
  }

  function resetBoard(){
    for (const c of cards){ c.zone = 'STAGE'; c.checked = null; c.revealDesc = false; }
    checked = false;
    els.checkMsg.textContent   = '';
    els.checkBtn.disabled      = false;
    els.checkBtn.style.opacity = '1';
    setStatus('Reset.');
    renderBoard();
    updateProgress();
  }

  els.newRoundBtn.addEventListener('click', newRound);
  els.resetBtn.addEventListener('click',    resetBoard);
  els.checkBtn.addEventListener('click',    check);

  renderBoard();
  newRound();
});
