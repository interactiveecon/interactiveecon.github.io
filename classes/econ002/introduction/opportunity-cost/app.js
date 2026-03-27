// app.js — Opportunity Cost
// Disc mode (?disc=1): 5 questions, two-attempt flow, session score recording.
// Normal mode: unlimited, no session recording.

(function () {
  const DISC_MODE = new URLSearchParams(location.search).get('disc') === '1';

  function startApp() {
    // ── DOM refs ────────────────────────────────────────────────────────────
    const $ = (id) => document.getElementById(id);
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

    const DISC_LIMIT = 5;
    const LAB_ID     = 'opportunity-cost';
    const LAB_LABEL  = 'Opportunity Cost';
    const WEEK_URL   = '/classes/econ002/discussion/week-01/';

    if (DISC_MODE) {
      const crumb = document.querySelector('.crumb-link');
      if (crumb) { crumb.textContent = '← Week 1'; crumb.href = WEEK_URL; }
    }

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

    // ── State ────────────────────────────────────────────────────────────────
    let current        = null;
    let queue          = [];
    let queueIdx       = 0;   // questions completed so far
    let phase          = 'unanswered';
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
      queue = shuffle(ALL.slice()).slice(0, DISC_LIMIT);
      queueIdx = sessionFirstScore = sessionFinalScore = 0;
    }

    // ── Score display ────────────────────────────────────────────────────────
    function updateScoreDisplay() {
      if (DISC_MODE) {
        els.score.textContent = queueIdx === 0
          ? `Question 1 of ${DISC_LIMIT}`
          : `${queueIdx} of ${DISC_LIMIT} done  |  Score: ${sessionFinalScore} / ${queueIdx}`;
      } else {
        els.score.textContent = `${sessionFinalScore} correct out of ${queueIdx} attempted`;
      }
    }

    // ── Finish banner ────────────────────────────────────────────────────────
    function showFinishBanner() {
      if ($('discFinishBanner')) return;

      // Write to session
      if (DISC_MODE && window.Session) {
        try {
          if (Session.isActive()) {
            Session.recordLabDone(LAB_ID, LAB_LABEL,
              sessionFirstScore, sessionFinalScore, DISC_LIMIT);
          }
        } catch(e) { console.warn('Session.recordLabDone failed:', e); }
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

    // ── Render question ──────────────────────────────────────────────────────
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

      // Build fresh radio inputs — no disabled state
      els.choices.innerHTML = opts.map((o, k) => `
        <label class="choice" id="choiceLabel-${k}">
          <input type="radio" name="oc" value="${k}">
          <div class="choiceText">${escapeHtml(o.text)}</div>
        </label>
      `).join("");

      els.feedback.style.display = "none";
      els.feedback.innerHTML     = "";
      els.whyBox.style.display   = "none";
      els.checkBtn.textContent   = 'Submit';
      els.checkBtn.disabled      = false;
      els.resetBtn.disabled      = false;

      setStatus(`${DISC_MODE ? `Question ${queueIdx+1} of ${DISC_LIMIT}` : 'New question'} — pick an answer, then click Submit.`);
      updateScoreDisplay();
    }

    // ── Re-render just the choices in revise mode ────────────────────────────
    // Rebuilds HTML fresh so there are no disabled inputs to fight with.
    // Pre-selects their original answer. Highlights their wrong answer in red.
    function renderChoicesForRevision() {
      const opts = current._opts;
      els.choices.innerHTML = opts.map((o, k) => {
        let style = '';
        if (k === firstAnswerIdx) {
          // Their original wrong answer: red border as a reminder
          style = 'border-color:rgba(180,35,24,0.5);background:rgba(180,35,24,0.05);';
        }
        const checked = k === firstAnswerIdx ? 'checked' : '';
        return `
          <label class="choice" id="choiceLabel-${k}" style="${style}">
            <input type="radio" name="oc" value="${k}" ${checked}>
            <div class="choiceText">${escapeHtml(o.text)}</div>
          </label>
        `;
      }).join("");
    }

    // ── Lock choices after final submit ─────────────────────────────────────
    function lockChoicesWithResult(finalIdx) {
      const opts = current._opts;
      els.choices.innerHTML = opts.map((o, k) => {
        let style = '';
        if (k === current._correctPos) {
          style = 'border-color:rgba(27,127,75,0.6);background:rgba(27,127,75,0.07);';
        } else if (k === finalIdx && k !== current._correctPos) {
          style = 'border-color:rgba(180,35,24,0.6);background:rgba(180,35,24,0.07);';
        }
        const checked = k === finalIdx ? 'checked' : '';
        return `
          <label class="choice" id="choiceLabel-${k}" style="${style}">
            <input type="radio" name="oc" value="${k}" ${checked} disabled>
            <div class="choiceText">${escapeHtml(o.text)}</div>
          </label>
        `;
      }).join("");
    }

    // ── Submit handler ───────────────────────────────────────────────────────
    function handleSubmit() {
      if (!current) { setStatus("Click New Scenario first."); return; }

      // ── First submission ─────────────────────────────────────────────────
      if (phase === 'unanswered') {
        const sel = els.choices.querySelector('input[name="oc"]:checked');
        if (!sel) { setStatus("Please select an answer first."); return; }

        firstAnswerIdx = Number(sel.value);
        firstCorrect   = firstAnswerIdx === current._correctPos;
        if (firstCorrect) sessionFirstScore++;

        // Lock all choices; show red on wrong answer only
        els.choices.querySelectorAll('input[name="oc"]').forEach(inp => inp.disabled = true);
        if (!firstCorrect) {
          const lbl = $(`choiceLabel-${firstAnswerIdx}`);
          if (lbl) { lbl.style.borderColor = 'rgba(180,35,24,0.6)'; lbl.style.background = 'rgba(180,35,24,0.07)'; }
        }

        els.feedback.style.display = "block";
        phase = 'first-submitted';

        if (firstCorrect) {
          // Show green immediately for correct first answer
          const lbl = $(`choiceLabel-${firstAnswerIdx}`);
          if (lbl) { lbl.style.borderColor = 'rgba(27,127,75,0.6)'; lbl.style.background = 'rgba(27,127,75,0.07)'; }
          els.feedback.innerHTML = `
            <span class="tagOK">Correct</span>
            <strong>Opportunity cost:</strong> ${escapeHtml(current._opts[current._correctPos].text)}<br>
            <strong>Explanation:</strong> ${escapeHtml(current.explain)}
          `;
          recordQuestion(firstAnswerIdx, true);
          els.checkBtn.textContent = 'Next →';
          setStatus("Correct! Click Next → for the next question.");
        } else {
          els.feedback.innerHTML = `
            <span class="tagBad">Not quite</span>
            Your answer has been marked. After your TA reviews the correct answer,
            click <strong>Revise</strong> to update your answer.
          `;
          els.checkBtn.textContent = DISC_MODE ? 'Revise' : 'Next →';
          setStatus(DISC_MODE ? "Click Revise after TA review." : "Review, then click Next →.");
        }

      // ── Open revision ────────────────────────────────────────────────────
      } else if (phase === 'first-submitted' && els.checkBtn.textContent === 'Revise') {
        phase = 'revising';
        // Rebuild choices HTML fresh — no disabled inputs, original wrong answer pre-selected in red
        renderChoicesForRevision();
        els.checkBtn.textContent = 'Submit Final';
        els.feedback.innerHTML   = `<em>Change your answer if needed, then click <strong>Submit Final</strong>.</em>`;
        setStatus("Select your answer and click Submit Final.");

      // ── Final submission ─────────────────────────────────────────────────
      } else if (phase === 'revising') {
        const sel      = els.choices.querySelector('input[name="oc"]:checked');
        const finalIdx = sel ? Number(sel.value) : firstAnswerIdx;
        const finalCorrect = finalIdx === current._correctPos;

        // Rebuild choices locked with green/red result
        lockChoicesWithResult(finalIdx);

        recordQuestion(finalIdx, finalCorrect);
        phase = 'done';

        const correctText = current._opts[current._correctPos].text;
        const finalText   = current._opts[finalIdx].text;
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
        els.checkBtn.textContent = 'Next →';
        setStatus(DISC_MODE
          ? `${queueIdx} of ${DISC_LIMIT} done — click Next → to continue.`
          : "Click Next → for the next question.");

      // ── Next → ──────────────────────────────────────────────────────────
      } else if (els.checkBtn.textContent === 'Next →') {
        newScenario();
      }
    }

    // ── Record question ──────────────────────────────────────────────────────
    function recordQuestion(finalIdx, finalCorrect) {
      if (finalCorrect) sessionFinalScore++;
      queueIdx++;
      updateScoreDisplay();

      if (DISC_MODE && window.Session) {
        try {
          if (Session.isActive()) {
            Session.recordQuestion(
              LAB_ID, queueIdx - 1,
              current.title,
              current._opts[firstAnswerIdx].text, firstCorrect,
              current._opts[finalIdx].text,       finalCorrect
            );
          }
        } catch(e) { console.warn('Session.recordQuestion failed:', e); }
      }

      // Show finish banner when all questions done
      if (DISC_MODE && queueIdx >= DISC_LIMIT) {
        showFinishBanner();
      }
    }

    // ── New scenario ─────────────────────────────────────────────────────────
    function newScenario() {
      if (DISC_MODE) {
        if (queueIdx >= DISC_LIMIT) { showFinishBanner(); return; }
        renderScenario(queue[queueIdx]);
      } else {
        renderScenario(ALL[Math.floor(Math.random() * ALL.length)]);
      }
    }

    function resetChoice() {
      if (phase !== 'unanswered') return;
      els.choices.querySelectorAll('input[name="oc"]').forEach(r => r.checked = false);
      setStatus("Selection cleared. Choose an answer and click Submit.");
    }

    // ── Wire up ──────────────────────────────────────────────────────────────
    els.newBtn.addEventListener("click",   newScenario);
    els.checkBtn.addEventListener("click", handleSubmit);
    els.resetBtn.addEventListener("click", resetChoice);
    els.whyBtn.addEventListener("click",  () => {
      els.whyBox.style.display = els.whyBox.style.display === "none" ? "block" : "none";
    });

    updateScoreDisplay();
    if (DISC_MODE) buildQueue();
    newScenario();
  } // end startApp

  // ── Load session.js if needed, then start ───────────────────────────────
  function domReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  if (DISC_MODE && !window.Session) {
    // Inject session.js, then wait for DOM, then start
    const scr = document.createElement('script');
    scr.src = '/assets/session.js';
    scr.onload = () => domReady(startApp);
    scr.onerror = () => { console.warn('session.js failed to load'); domReady(startApp); };
    document.head.appendChild(scr);
  } else {
    domReady(startApp);
  }
})();
