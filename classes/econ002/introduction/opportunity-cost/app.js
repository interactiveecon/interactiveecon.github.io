// app.js — Opportunity Cost
// Supports ?disc=1 for discussion section mode:
//   - Limits to DISC_LIMIT questions
//   - Changes breadcrumb to "← Week 1"
//   - Shows "Finish & Return" button when all questions answered

window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  // ── Disc mode detection ───────────────────────────────────────────────────
  const DISC_MODE  = new URLSearchParams(location.search).get('disc') === '1';
  const DISC_LIMIT = 5;
  const WEEK_URL   = '/classes/econ002/discussion/week-01/';

  // Update breadcrumb if in disc mode
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

  function setStatus(msg){ els.status.textContent = msg; }
  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;");
  }

  if (!window.OPPCOST_MCQ || !Array.isArray(window.OPPCOST_MCQ.scenarios)) {
    setStatus("ERROR: data.js did not load (OPPCOST_MCQ missing).");
    return;
  }

  const ALL = window.OPPCOST_MCQ.scenarios;

  let current   = null;
  let attempted = 0;
  let correct   = 0;

  // In disc mode, draw a fixed shuffled queue of DISC_LIMIT questions up front
  let queue     = [];
  let queueIdx  = 0;

  function shuffle(a){
    const b = a.slice();
    for (let i = b.length-1; i > 0; i--){
      const j = Math.floor(Math.random()*(i+1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  }

  function buildQueue(){
    const pool = shuffle(ALL.slice());
    queue    = pool.slice(0, DISC_LIMIT);
    queueIdx = 0;
  }

  function updateScore(){
    if (DISC_MODE){
      els.score.textContent =
        `${correct} / ${attempted} correct  (${queueIdx} of ${DISC_LIMIT} questions)`;
    } else {
      els.score.textContent = `${correct} correct out of ${attempted} attempted`;
    }
  }

  // ── Finish banner ─────────────────────────────────────────────────────────
  function showFinishBanner(){
    if ($('discFinishBanner')) return;
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
          ✓ All ${DISC_LIMIT} questions complete — ${correct} / ${DISC_LIMIT} correct
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
    // Insert after the score box
    const scoreEl = els.score.closest('.box') || els.score.parentElement;
    scoreEl.appendChild(banner);

    // Disable new scenario button
    els.newBtn.disabled = true;
    els.newBtn.style.opacity = '0.4';
    setStatus(`Lab complete — ${correct} / ${DISC_LIMIT} correct.`);
  }

  function renderScenario(sc){
    current = sc;

    els.qTitle.textContent = sc.title;
    els.qDesc.textContent  = sc.desc;

    const idxs = shuffle([0,1,2,3]);
    const opts = idxs.map(i => ({ text: sc.options[i], origIndex: i }));
    current._opts       = opts;
    current._correctPos = opts.findIndex(o => o.origIndex === sc.correct);

    els.choices.innerHTML = opts.map((o, k) => `
      <label class="choice">
        <input type="radio" name="oc" value="${k}">
        <div class="choiceText">${escapeHtml(o.text)}</div>
      </label>
    `).join("");

    els.feedback.style.display = "none";
    els.feedback.innerHTML     = "";
    els.whyBox.style.display   = "none";

    if (DISC_MODE){
      setStatus(`Question ${queueIdx} of ${DISC_LIMIT} — pick an answer, then click Check.`);
    } else {
      setStatus("Pick an answer, then click Check.");
    }
  }

  function newScenario(){
    if (DISC_MODE){
      if (queueIdx >= DISC_LIMIT){ showFinishBanner(); return; }
      renderScenario(queue[queueIdx]);
    } else {
      renderScenario(ALL[Math.floor(Math.random()*ALL.length)]);
    }
  }

  function reset(){
    els.feedback.style.display = "none";
    els.feedback.innerHTML     = "";
    els.whyBox.style.display   = "none";
    els.choices.querySelectorAll('input[name="oc"]').forEach(r => r.checked = false);
    setStatus("Selection cleared. Choose an answer and click Check.");
  }

  function check(){
    if (!current){ setStatus("Click New Scenario first."); return; }
    const sel = els.choices.querySelector('input[name="oc"]:checked');
    if (!sel){ setStatus("Please select an option first."); return; }

    const selNum = Number(sel.value);
    attempted++;
    const ok = selNum === current._correctPos;
    if (ok) correct++;
    if (DISC_MODE) queueIdx++;
    updateScore();

    const correctText = current._opts[current._correctPos].text;
    const chosenText  = current._opts[selNum].text;

    els.feedback.style.display = "block";
    els.feedback.innerHTML = `
      ${ok ? `<span class="tagOK">Correct</span>` : `<span class="tagBad">Not quite</span>`}
      <strong>Opportunity cost:</strong> ${escapeHtml(correctText)}<br>
      ${ok ? `` : `<strong>You chose:</strong> ${escapeHtml(chosenText)}<br>`}
      <strong>Explanation:</strong> ${escapeHtml(current.explain)}
    `;

    if (DISC_MODE && queueIdx >= DISC_LIMIT){
      // Replace New Scenario button label to signal completion
      els.newBtn.textContent = 'Done';
      setStatus(`Last question done — ${correct} / ${DISC_LIMIT} correct.`);
      showFinishBanner();
    } else {
      setStatus(ok ? "Nice. Click New Scenario for the next question." : "Review the explanation, then click New Scenario.");
    }
  }

  els.newBtn.addEventListener("click",  newScenario);
  els.checkBtn.addEventListener("click", check);
  els.resetBtn.addEventListener("click", reset);
  els.whyBtn.addEventListener("click",  () => {
    els.whyBox.style.display = (els.whyBox.style.display === "none") ? "block" : "none";
  });

  updateScore();
  if (DISC_MODE) buildQueue();
  newScenario();
});
