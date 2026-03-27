// app.js — Opportunity Cost
// Disc mode (?disc=1): 5 questions, two-attempt flow, session score recording.
// Normal mode: unlimited, no session recording.

window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  // ── Disc mode ─────────────────────────────────────────────────────────────
  const DISC_MODE  = new URLSearchParams(location.search).get('disc') === '1';
  const DISC_LIMIT = 5;
  const LAB_ID     = 'opportunity-cost';
  const LAB_LABEL  = 'Opportunity Cost';
  const WEEK_URL   = '/classes/econ002/discussion/week-01/';

  if (DISC_MODE) {
    const crumb = document.querySelector('.crumb-link');
    if (crumb) { crumb.textContent = '← Week 1'; crumb.href = WEEK_URL; }
  }

  const els = {
    newBtn:   $("newBtn"),
    checkBtn: $("checkBtn"),
    resetBtn: $("resetBtn"),
    whyBtn:   $("whyBtn"),
    status:   $("status"),
    qTitle:   $("qTitle"),
    qDesc:    $("qDesc"),
    choices:  $("choices"),
    feedback: $("feedback"),
    whyBox:   $("whyBox"),
    score:    $("score"),
  };

  function setStatus(msg) { els.status.textContent = msg; }
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&","&amp;").replaceAll("<","&lt;")
      .replaceAll(">","&gt;").replaceAll('"',"&quot;");
  }

  if (!window.OPPCOST_MCQ || !Array.isArray(window.OPPCOST_MCQ.scenarios)) {
    setStatus("ERROR: data.js did not load."); return;
  }

  const ALL = window.OPPCOST_MCQ.scenarios;

  // ── State ─────────────────────────────────────────────────────────────────
  let current      = null;
  let queue        = [];
  let queueIdx     = 0;
  // phase: 'unanswered' | 'first-submitted' | 'revising' | 'done'
  let phase        = 'unanswered';
  let firstAnswerIdx = null;
  let firstCorrect   = false;

  let sessionFirstScore = 0;
  let sessionFinalScore = 0;

  function shuffle(a) {
    const b = a.slice();
    for (let i = b.length-1; i > 0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [b[i],b[j]] = [b[j],b[i]];
    }
    return b;
  }

  function buildQueue() {
    queue    = shuffle(ALL.slice()).slice(0, DISC_LIMIT);
    queueIdx = 0;
    sessionFirstScore = 0;
    sessionFinalScore = 0;
  }

  // ── Score display ─────────────────────────────────────────────────────────
  function updateScoreDisplay() {
    if (DISC_MODE) {
      const done = Math.min(queueIdx, DISC_LIMIT);
      els.score.textContent = done === 0
        ? `Question 1 of ${DISC_LIMIT}`
        : `${done} of ${DISC_LIMIT} done  |  Score: ${sessionFinalScore} / ${done}`;
    } else {
      els.score.textContent = `${sessionFinalScore} correct out of ${queueIdx} attempted`;
    }
  }

  // ── Finish banner ─────────────────────────────────────────────────────────
  function showFinishBanner() {
    if ($('discFinishBanner')) return;

    if (DISC_MODE && window.Session && Session.isActive()) {
      Session.recordLabDone(
        LAB_ID, LAB_LABEL,
        sessionFirstScore, sessionFinalScore, DISC_LIMIT
      );
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
          ✓ Lab complete — Final score: ${sessionFinalScore} / ${DISC_LIMIT}
        </div>
        <div style="font-size:12px;color:#6b7280;margin-top:3px;">
          First-attempt score: ${sessionFirstScore} / ${DISC_LIMIT} &nbsp;·&nbsp;
          Return to Week 1 when your TA is ready.
        </div>
      </div>
      <a href="${WEEK_URL}"
         style="padding:10px 20px;background:#1b7f4b;color:#fff;border-radius:12px;
                font-weight:800;font-size:13px;text-decoration:none;white-space:nowrap;">
        ← Return to Week 1
      </a>
    `;
    const scoreBox = els.score.closest('.box') || els.score.parentElement;
    scoreBox.appendChild(banner);
    els.newBtn.disabled = els.checkBtn.disabled = true;
    els.newBtn.style.opacity = els.checkBtn.style.opacity = '0.4';
  }

  // ── Render question ───────────────────────────────────────────────────────
  function renderScenario(sc) {
    current        = sc;
    phase          = 'unanswered';
    firstAnswerIdx = null;
    firstCorrect   = false;

    els.qTitle.textContent = sc.title;
    els.qDesc.textContent  = sc.desc;

    const idxs = shuffle([0,1,2,3]);
    const opts = idxs.map(i => ({ text: sc.options[i], origIndex: i }));
    current._opts       = opts;
    current._correctPos = opts.findIndex(o => o.origIndex === sc.correct);

    els.choices.innerHTML = opts.map((o, k) => `
      <label class="choice" id="choiceLabel-${k}" style="transition:border-color .15s,background .15s;">
        <input type="radio" name="oc" value="${k}">
        <div class="choiceText">${escapeHtml(o.text)}</div>
      </label>
    `).join("");

    els.feedback.style.display = "none";
    els.feedback.innerHTML     = "";
    els.whyBox.style.display   = "none";

    els.checkBtn.textContent = 'Submit';
    els.checkBtn.disabled    = false;
    els.resetBtn.disabled    = false;

    const qNum = DISC_MODE ? `Question ${queueIdx+1} of ${DISC_LIMIT}` : 'New question';
    setStatus(`${qNum} — pick an answer, then click Submit.`);
    updateScoreDisplay();
  }

  // ── Colour choice labels after first submit ───────────────────────────────
  function colourChoices(keepRevisable) {
    for (let k = 0; k < current._opts.length; k++) {
      const lbl = $(`choiceLabel-${k}`);
      if (!lbl) continue;
      const inp = lbl.querySelector('input');
      if (k === current._correctPos) {
        lbl.style.borderColor = 'rgba(27,127,75,0.6)';
        lbl.style.background  = 'rgba(27,127,75,0.07)';
        if (inp) inp.disabled = true;
      } else if (k === firstAnswerIdx && !firstCorrect) {
        lbl.style.borderColor = 'rgba(180,35,24,0.6)';
        lbl.style.background  = 'rgba(180,35,24,0.07)';
        // keep enabled if we're in revision phase
        if (inp) inp.disabled = !keepRevisable;
      } else {
        if (inp) inp.disabled = true;
      }
    }
  }

  // ── Main submit handler ───────────────────────────────────────────────────
  function handleSubmit() {
    if (!current) { setStatus("Click New Scenario first."); return; }

    // ── Phase 1: first submission ─────────────────────────────────────────
    if (phase === 'unanswered') {
      const sel = els.choices.querySelector('input[name="oc"]:checked');
      if (!sel) { setStatus("Please select an answer first."); return; }

      firstAnswerIdx = Number(sel.value);
      firstCorrect   = (firstAnswerIdx === current._correctPos);
      if (firstCorrect) sessionFirstScore++;

      phase = 'first-submitted';
      colourChoices(false);

      const correctText = current._opts[current._correctPos].text;
      els.feedback.style.display = "block";

      if (firstCorrect) {
        els.feedback.innerHTML = `
          <span class="tagOK">Correct</span>
          <strong>Opportunity cost:</strong> ${escapeHtml(correctText)}<br>
          <strong>Explanation:</strong> ${escapeHtml(current.explain)}
        `;
        // Correct first time — record and allow Next
        if (DISC_MODE) {
          recordQuestion(firstAnswerIdx, true);
          els.checkBtn.textContent = 'Next →';
          setStatus("Correct! Click Next → for the next question.");
        } else {
          els.checkBtn.textContent = 'Next →';
          setStatus("Correct! Click Next → for the next question.");
        }
      } else {
        els.feedback.innerHTML = `
          <span class="tagBad">Not quite</span>
          The correct answer is highlighted in green.<br>
          <strong>Explanation:</strong> ${escapeHtml(current.explain)}<br><br>
          <em>After your TA reviews this, click <strong>Revise</strong> to update your answer if needed.</em>
        `;
        els.checkBtn.textContent = DISC_MODE ? 'Revise' : 'Next →';
        setStatus(DISC_MODE
          ? "See the correct answer. After TA review, click Revise."
          : "Review the explanation, then click Next →.");
      }

    // ── Phase 2a: open revision ───────────────────────────────────────────
    } else if (phase === 'first-submitted' && els.checkBtn.textContent === 'Revise') {
      phase = 'revising';
      // Re-enable wrong answer choices so student can change
      colourChoices(true);
      // Pre-select their original (wrong) answer
      const origInp = els.choices.querySelector(`input[value="${firstAnswerIdx}"]`);
      if (origInp && !origInp.disabled) origInp.checked = true;

      els.checkBtn.textContent = 'Submit Final';
      els.feedback.innerHTML = `
        <em>You may change your answer. When ready, click <strong>Submit Final</strong>.</em>
      `;
      setStatus("Update your answer if needed, then click Submit Final.");

    // ── Phase 2b: final submission after revision ─────────────────────────
    } else if (phase === 'revising') {
      const sel = els.choices.querySelector('input[name="oc"]:not(:disabled):checked')
               || els.choices.querySelector('input[name="oc"]:checked');
      const finalIdx = sel ? Number(sel.value) : firstAnswerIdx;
      recordQuestion(finalIdx, finalIdx === current._correctPos);
      phase = 'done';

      const finalCorrect   = (finalIdx === current._correctPos);
      const correctText    = current._opts[current._correctPos].text;
      const finalText      = current._opts[finalIdx].text;

      // Lock everything
      colourChoices(false);
      const finalInp = els.choices.querySelector(`input[value="${finalIdx}"]`);
      if (finalInp) { finalInp.checked = true; finalInp.disabled = true; }

      els.feedback.style.display = "block";
      els.feedback.innerHTML = finalCorrect
        ? `<span class="tagOK">Correct after revision</span>
           <strong>Opportunity cost:</strong> ${escapeHtml(correctText)}<br>
           <strong>Explanation:</strong> ${escapeHtml(current.explain)}`
        : `<span class="tagBad">Incorrect</span>
           You chose: ${escapeHtml(finalText)}<br>
           <strong>Correct answer:</strong> ${escapeHtml(correctText)}<br>
           <strong>Explanation:</strong> ${escapeHtml(current.explain)}`;

      updateScoreDisplay();

      if (DISC_MODE && queueIdx > DISC_LIMIT) {
        showFinishBanner();
      } else {
        els.checkBtn.textContent = 'Next →';
        setStatus(DISC_MODE
          ? `${queueIdx} of ${DISC_LIMIT} done — click Next → to continue.`
          : "Click Next → for the next question.");
      }

    // ── Next → ───────────────────────────────────────────────────────────
    } else if (els.checkBtn.textContent === 'Next →') {
      newScenario();
    }
  }

  // ── Record a single question to session ───────────────────────────────────
  function recordQuestion(finalIdx, finalCorrect) {
    if (finalCorrect) sessionFinalScore++;
    queueIdx++;
    updateScoreDisplay();

    if (DISC_MODE && window.Session && Session.isActive()) {
      Session.recordQuestion(
        LAB_ID,
        queueIdx - 1,
        current.title,
        current._opts[firstAnswerIdx].text,
        firstCorrect,
        current._opts[finalIdx].text,
        finalCorrect
      );
    }

    if (DISC_MODE && queueIdx >= DISC_LIMIT) showFinishBanner();
  }

  // ── New scenario ──────────────────────────────────────────────────────────
  function newScenario() {
    if (DISC_MODE) {
      if (queueIdx >= DISC_LIMIT) { showFinishBanner(); return; }
      renderScenario(queue[queueIdx]);
    } else {
      renderScenario(ALL[Math.floor(Math.random()*ALL.length)]);
    }
  }

  function resetChoice() {
    if (phase !== 'unanswered') return;
    els.choices.querySelectorAll('input[name="oc"]').forEach(r => r.checked = false);
    setStatus("Selection cleared. Choose an answer and click Submit.");
  }

  // ── Wire up ───────────────────────────────────────────────────────────────
  els.newBtn.addEventListener("click",   newScenario);
  els.checkBtn.addEventListener("click", handleSubmit);
  els.resetBtn.addEventListener("click", resetChoice);
  els.whyBtn.addEventListener("click",  () => {
    els.whyBox.style.display = els.whyBox.style.display === "none" ? "block" : "none";
  });

  updateScoreDisplay();
  if (DISC_MODE) buildQueue();
  newScenario();
});
