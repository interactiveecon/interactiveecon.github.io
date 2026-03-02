// app.js
window.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const els = {
    newBtn: $("newBtn"),
    checkBtn: $("checkBtn"),
    resetBtn: $("resetBtn"),
    whyBtn: $("whyBtn"),
    status: $("status"),

    qTitle: $("qTitle"),
    qDesc: $("qDesc"),
    choices: $("choices"),
    feedback: $("feedback"),
    whyBox: $("whyBox"),
    score: $("score"),
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

  let current = null;
  let selected = null;
  let attempted = 0;
  let correct = 0;

  function shuffle(a){
    const b = a.slice();
    for (let i=b.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  }

  function updateScore(){
    els.score.textContent = `${correct} correct out of ${attempted} attempted`;
  }

  function renderScenario(sc){
    current = sc;
    selected = null;

    els.qTitle.textContent = sc.title;
    els.qDesc.textContent = sc.desc;

    // Randomize option order but keep track of correct
    const idxs = shuffle([0,1,2,3]);
    const opts = idxs.map(i => ({ text: sc.options[i], origIndex: i }));
    const correctPos = opts.findIndex(o => o.origIndex === sc.correct);

    current._opts = opts;
    current._correctPos = correctPos;

    els.choices.innerHTML = opts.map((o, k) => `
      <label class="choice">
        <input type="radio" name="oc" value="${k}">
        <div class="choiceText">${escapeHtml(o.text)}</div>
      </label>
    `).join("");

    els.feedback.style.display = "none";
    els.feedback.innerHTML = "";
    els.whyBox.style.display = "none";

    setStatus("Pick an answer, then click Check.");
  }

  function newScenario(){
    const sc = ALL[Math.floor(Math.random()*ALL.length)];
    renderScenario(sc);
  }

  function reset(){
    selected = null;
    els.feedback.style.display = "none";
    els.feedback.innerHTML = "";
    els.whyBox.style.display = "none";

    // clear selection UI
    const radios = els.choices.querySelectorAll('input[name="oc"]');
    radios.forEach(r => r.checked = false);

    setStatus("Selection cleared. Choose an answer and click Check.");
  }

  function getSelected(){
    const sel = els.choices.querySelector('input[name="oc"]:checked');
    return sel ? Number(sel.value) : null;
  }

  function check(){
    if (!current){
      setStatus("Click New Scenario first.");
      return;
    }
    const sel = getSelected();
    if (sel === null || !Number.isFinite(sel)){
      setStatus("Please select an option first.");
      return;
    }

    attempted += 1;
    const ok = (sel === current._correctPos);
    if (ok) correct += 1;
    updateScore();

    const correctText = current._opts[current._correctPos].text;
    const chosenText = current._opts[sel].text;

    els.feedback.style.display = "block";
    els.feedback.innerHTML = `
      ${ok ? `<span class="tagOK">Correct</span>` : `<span class="tagBad">Not quite</span>`}
      <strong>Opportunity cost:</strong> ${escapeHtml(correctText)}<br>
      ${ok ? `` : `<strong>You chose:</strong> ${escapeHtml(chosenText)}<br>`}
      <strong>Explanation:</strong> ${escapeHtml(current.explain)}
    `;

    setStatus(ok ? "Nice." : "Review the explanation and try another scenario.");
  }

  els.newBtn.addEventListener("click", newScenario);
  els.checkBtn.addEventListener("click", check);
  els.resetBtn.addEventListener("click", reset);
  els.whyBtn.addEventListener("click", () => {
    els.whyBox.style.display = (els.whyBox.style.display === "none") ? "block" : "none";
  });

  updateScore();
  newScenario();
});
