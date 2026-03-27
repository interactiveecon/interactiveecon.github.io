// app.js — Positive vs Normative Economics
// Disc mode (?disc=1): 10 cards, two-phase (submit then revise), session recording.
// Normal mode: 12 cards per round, unlimited.

// Load session.js dynamically when in disc mode, then boot the app
(function () {
  const DISC_MODE = new URLSearchParams(location.search).get('disc') === '1';
  function boot() {
    window.addEventListener("DOMContentLoaded", initApp);
    if (document.readyState !== 'loading') initApp();
  }
  if (DISC_MODE && !window.Session) {
    const scr = document.createElement('script');
    scr.src = '/assets/session.js';
    scr.onload = boot;
    document.head.appendChild(scr);
  } else {
    boot();
  }
})();

function initApp() {
  if (initApp._ran) return; initApp._ran = true;
  const $ = (id) => document.getElementById(id);

  // ── Disc mode ─────────────────────────────────────────────────────────────
  const DISC_MODE  = new URLSearchParams(location.search).get('disc') === '1';
  const DISC_CARDS = 10;
  const LAB_ID     = 'positive-normative';
  const LAB_LABEL  = 'Positive vs. Normative Economics';
  const WEEK_URL   = '/classes/econ002/discussion/week-01/';

  if (DISC_MODE) {
    const crumb = document.querySelector('.crumb-link');
    if (crumb) { crumb.textContent = '← Week 1'; crumb.href = WEEK_URL; }
  }

  const els = {
    zoneStage:   $("zoneStage"),
    zonePOS:     $("zonePOS"),
    zoneEFF:     $("zoneEFF"),
    zoneEQT:     $("zoneEQT"),
    zoneGRW:     $("zoneGRW"),
    zoneSTB:     $("zoneSTB"),
    newRoundBtn: $("newRoundBtn"),
    resetBtn:    $("resetBtn"),
    checkBtn:    $("checkBtn"),
    status:      $("status"),
    progressMsg: $("progressMsg"),
    checkMsg:    $("checkMsg"),
  };

  function setStatus(msg) { els.status.textContent = msg; }
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&","&amp;").replaceAll("<","&lt;")
      .replaceAll(">","&gt;").replaceAll('"',"&quot;");
  }

  if (!window.POSNORM_DATA || !Array.isArray(window.POSNORM_DATA.cards)) {
    setStatus("ERROR: data.js did not load."); return;
  }

  const ALL = window.POSNORM_DATA.cards;
  let cards = [];

  // phase: 'sorting' | 'first-submitted' | 'revising' | 'done'
  let phase = 'sorting';

  let firstCorrectCount = 0;
  let finalCorrectCount = 0;

  function shuffle(a) {
    for (let i = a.length-1; i > 0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
  }

  // ── Finish banner ─────────────────────────────────────────────────────────
  function showFinishBanner() {
    if ($('discFinishBanner')) return;

    const total = cards.length;

    if (DISC_MODE && window.Session && Session.isActive()) {
      // Record each card as a question
      cards.forEach((c, i) => {
        Session.recordQuestion(
          LAB_ID, i, c.title,
          c.firstZone  || 'STAGE', c.firstCorrect  || false,
          c.finalZone  || c.zone,  c.finalCorrect  || false
        );
      });
      Session.recordLabDone(LAB_ID, LAB_LABEL,
        firstCorrectCount, finalCorrectCount, total);
    }

    const banner = document.createElement('div');
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
          ✓ Lab complete — Final score: ${finalCorrectCount} / ${total}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:3px;">
          First-attempt score: ${firstCorrectCount} / ${total} &nbsp;·&nbsp;
          Return to Week 1 when your TA is ready.
        </div>
      </div>
      <a href="${WEEK_URL}"
         style="padding:10px 20px;background:#1b7f4b;color:#fff;border-radius:12px;
                font-weight:800;font-size:13px;text-decoration:none;white-space:nowrap;">
        ← Return to Week 1
      </a>
    `;
    const main = document.querySelector('main');
    (main || document.body).appendChild(banner);

    els.newRoundBtn.disabled = els.checkBtn.disabled = true;
    els.newRoundBtn.style.opacity = els.checkBtn.style.opacity = '0.4';
  }

  // ── Dropzone setup ────────────────────────────────────────────────────────
  function setupDropzone(zoneEl) {
    zoneEl.addEventListener("dragover", (ev) => {
      ev.preventDefault(); zoneEl.classList.add("dragover");
    });
    zoneEl.addEventListener("dragleave", () => zoneEl.classList.remove("dragover"));
    zoneEl.addEventListener("drop", (ev) => {
      ev.preventDefault(); zoneEl.classList.remove("dragover");
      if (phase !== 'sorting' && phase !== 'revising') return;
      const id = ev.dataTransfer.getData("text/plain");
      const z  = zoneEl.dataset.zone;
      const c  = cards.find(x => x.id === id);
      if (!c) return;
      c.zone = z;
      renderBoard();
      updateProgress();
    });
  }

  [els.zoneStage, els.zonePOS, els.zoneEFF, els.zoneEQT,
   els.zoneGRW,  els.zoneSTB].forEach(setupDropzone);

  // ── Render ────────────────────────────────────────────────────────────────
  function renderBoard() {
    [els.zoneStage, els.zonePOS, els.zoneEFF, els.zoneEQT,
     els.zoneGRW,  els.zoneSTB].forEach(z => z.innerHTML = '');

    if (!cards.length) {
      const msg = document.createElement('div');
      msg.className = 'mini';
      msg.textContent = 'No cards loaded. Click New Round.';
      els.zoneStage.appendChild(msg);
      return;
    }

    for (const c of cards) {
      const el = document.createElement('div');
      el.className  = 'card';
      if (c.checked === true)  el.classList.add('ok');
      if (c.checked === false) el.classList.add('bad');

      // Draggable only during sorting or revising (and only wrong cards during revise)
      const draggable = (phase === 'sorting') ||
                        (phase === 'revising' && c.checked === false);
      el.draggable = draggable;
      if (!draggable) el.style.cursor = 'default';

      el.innerHTML = `
        <div class="ctitle">${escapeHtml(c.title)}</div>
        ${c.revealDesc ? `<div class="cdesc">${escapeHtml(c.desc)}</div>` : ''}
      `;

      if (draggable) {
        el.addEventListener('dragstart', (ev) => {
          ev.dataTransfer.setData('text/plain', c.id);
          ev.dataTransfer.effectAllowed = 'move';
        });
      }

      const zoneEl =
        c.zone === 'STAGE' ? els.zoneStage :
        c.zone === 'POS'   ? els.zonePOS   :
        c.zone === 'EFF'   ? els.zoneEFF   :
        c.zone === 'EQT'   ? els.zoneEQT   :
        c.zone === 'GRW'   ? els.zoneGRW   : els.zoneSTB;
      zoneEl.appendChild(el);
    }
  }

  function updateProgress() {
    const total  = cards.length;
    const placed = cards.filter(c => c.zone !== 'STAGE').length;
    els.progressMsg.textContent = `Progress: ${placed} / ${total} placed.`;
  }

  // ── Submit handler ────────────────────────────────────────────────────────
  function handleCheck() {

    // ── First submission ──────────────────────────────────────────────────
    if (phase === 'sorting') {
      const placed = cards.filter(c => c.zone !== 'STAGE');
      if (placed.length === 0) { setStatus("Place some cards first."); return; }

      firstCorrectCount = 0;
      for (const c of cards) {
        if (c.zone === 'STAGE') { c.checked = null; c.revealDesc = false; continue; }
        c.firstZone    = c.zone;
        c.checked      = (c.zone === c.correct);
        c.firstCorrect = c.checked;
        c.revealDesc   = !c.checked; // show hint for wrong cards
        if (c.checked) firstCorrectCount++;
      }

      phase = 'first-submitted';
      renderBoard();
      updateProgress();

      const total = cards.filter(c => c.zone !== 'STAGE').length;
      els.checkMsg.textContent = `${firstCorrectCount} / ${total} correct on first attempt.`;

      els.checkBtn.textContent = 'Revise';
      setStatus(DISC_MODE
        ? `${firstCorrectCount}/${total} correct. After TA review, click Revise to fix wrong answers.`
        : `${firstCorrectCount}/${total} correct. Click Revise to fix any wrong answers.`);

    // ── Open revision ─────────────────────────────────────────────────────
    } else if (phase === 'first-submitted' && els.checkBtn.textContent === 'Revise') {
      phase = 'revising';
      // Move wrong cards back to staging so they can be re-placed
      for (const c of cards) {
        if (c.checked === false) c.zone = 'STAGE';
      }
      renderBoard();
      updateProgress();
      els.checkBtn.textContent = 'Submit Final';
      setStatus("Wrong cards are back in Staging. Re-sort them, then click Submit Final.");

    // ── Final submission ──────────────────────────────────────────────────
    } else if (phase === 'revising') {
      finalCorrectCount = 0;
      for (const c of cards) {
        if (c.zone === 'STAGE') { c.checked = null; continue; }
        c.finalZone    = c.zone;
        c.checked      = (c.zone === c.correct);
        c.finalCorrect = c.checked;
        c.revealDesc   = !c.checked;
        if (c.checked) finalCorrectCount++;
      }

      phase = 'done';
      renderBoard();
      updateProgress();

      els.checkMsg.textContent = `Final score: ${finalCorrectCount} / ${cards.length}`;
      setStatus(`Final: ${finalCorrectCount}/${cards.length} correct.`);

      if (DISC_MODE) {
        showFinishBanner();
      } else {
        // Practice mode: allow starting a new round
        els.checkBtn.textContent = 'Check';
        els.newRoundBtn.disabled = false;
        els.newRoundBtn.style.opacity = '1';
      }
    }
  }

  // ── New round ─────────────────────────────────────────────────────────────
  function newRound() {
    const pool = ALL.slice();
    if (DISC_MODE && window.Session) {
      // Seeded shuffle — same code = same cards for all students
      const rng = Session.rngForLab(LAB_ID);
      for (let i = pool.length-1; i > 0; i--) {
        const j = Math.floor(rng() * (i+1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    } else {
      shuffle(pool);
    }
    const n = DISC_MODE ? DISC_CARDS : Math.min(12, pool.length);
    cards = pool.slice(0, n).map(c => ({
      ...c, zone: 'STAGE', checked: null, revealDesc: false,
      firstZone: null, firstCorrect: null, finalZone: null, finalCorrect: null
    }));

    phase = 'sorting';
    firstCorrectCount = 0;
    finalCorrectCount = 0;
    els.checkMsg.textContent   = '';
    els.checkBtn.textContent   = 'Check';
    els.checkBtn.disabled      = false;
    els.checkBtn.style.opacity = '1';

    if (DISC_MODE) {
      // Disable New Round after the first round in disc mode
      els.newRoundBtn.disabled      = true;
      els.newRoundBtn.style.opacity = '0.4';
      els.newRoundBtn.title = 'One round per discussion section';
      setStatus(`Sort all ${DISC_CARDS} cards, then click Check.`);
    } else {
      setStatus('New round loaded. Sort the cards, then click Check.');
    }

    renderBoard();
    updateProgress();
  }

  function resetBoard() {
    for (const c of cards) {
      c.zone = 'STAGE'; c.checked = null; c.revealDesc = false;
    }
    phase = 'sorting';
    els.checkMsg.textContent   = '';
    els.checkBtn.textContent   = 'Check';
    els.checkBtn.disabled      = false;
    els.checkBtn.style.opacity = '1';
    setStatus('Reset.');
    renderBoard();
    updateProgress();
  }

  els.newRoundBtn.addEventListener('click', newRound);
  els.resetBtn.addEventListener('click',    resetBoard);
  els.checkBtn.addEventListener('click',    handleCheck);

  if (DISC_MODE) {
    // Show empty board until student enters code — then build seeded round
    renderBoard(); // shows "No cards loaded" message
    if (window.DiscussionModal) {
      DiscussionModal.init({
        weekLabel: 'Week 1 — Introduction',
        onReady: function() { newRound(); }
      });
    } else if (window.Session && Session.isActive()) {
      newRound();
    }
  } else {
    renderBoard();
    newRound();
  }
}
