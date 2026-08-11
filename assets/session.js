// session.js — Discussion Section Session Management
// Stores everything in sessionStorage only (auto-cleared when tab closes).
// No data ever sent to a server. FERPA-safe.

(function (global) {
  'use strict';

  const KEY = 'econ002_session';

  // ── Internal helpers ────────────────────────────────────────────────────────

  function load() {
    try {
      const raw = sessionStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function save(data) {
    try { sessionStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  function blank() {
    return {
      name: '',
      studentId: '',
      seed: '',
      weekLabel: '',
      startedAt: new Date().toISOString(),
      labs: {}       // keyed by lab id: { label, questions[], firstScore, finalScore, total, doneAt }
    };
  }

  // ── RNG ─────────────────────────────────────────────────────────────────────
  // Problem generation is UNSEEDED.
  //
  // This used to be a mulberry32 PRNG seeded from the session code. Because
  // every lab re-seeds at the top of generateParams() via rngForLab(), that
  // made each "New Problem" click replay the same sequence and regenerate the
  // identical problem. Reproducible problems only mattered for running these
  // labs in a discussion section, which we no longer do, so the seeding is
  // gone and the session code is now purely a label on the summary PDF.
  //
  // The rng()/rngForLab() API is kept so the ~70 labs calling it need no edit.

  // ── Public API ──────────────────────────────────────────────────────────────

  const Session = {

    // Called by modal when student submits name/ID/seed
    start(name, studentId, seed, weekLabel) {
      const data = blank();
      data.name      = name.trim();
      data.studentId = studentId.trim();
      data.seed      = String(seed).trim().toUpperCase();
      data.weekLabel = weekLabel || '';
      save(data);
    },

    // True if a session has been started this browser session
    isActive() {
      return !!load();
    },

    // Return current session info (or null)
    getInfo() {
      return load();
    },

    // Return the seed string
    getSeed() {
      const d = load();
      return d ? d.seed : '';
    },

    // Return a random number [0, 1). Not reproducible by design — see above.
    rng() {
      return Math.random();
    },

    // Kept for API compatibility: labs call this at the top of generateParams()
    // and use the returned function as their RNG. It no longer seeds anything,
    // so every call — including every "New Problem" click — yields a fresh
    // problem. labId is accepted and ignored.
    rngForLab(labId) {
      return Session.rng.bind(Session);
    },

    // Record a single question result.
    // firstAnswer / finalAnswer: the text of what the student chose.
    // firstCorrect / finalCorrect: booleans.
    recordQuestion(labId, qIndex, qText, firstAnswer, firstCorrect, finalAnswer, finalCorrect) {
      const d = load() || blank();
      if (!d.labs[labId]) d.labs[labId] = { label: labId, questions: [], doneAt: null };
      d.labs[labId].questions[qIndex] = {
        text: qText,
        firstAnswer,
        firstCorrect,
        finalAnswer,
        finalCorrect
      };
      save(d);
    },

    // Grade out of 5: 100%→5, ≥80%→4, ≥60%→3, ≥40%→2, ≥20%→1, <20%→0
    gradePoints(finalScore, total) {
      if (!total) return 0;
      const pct = finalScore / total;
      if (pct === 1.0) return 5;
      if (pct >= 0.80) return 4;
      if (pct >= 0.60) return 3;
      if (pct >= 0.40) return 2;
      if (pct >= 0.20) return 1;
      return 0;
    },

    // Call once when a lab is fully submitted (after final submission).
    recordLabDone(labId, labLabel, firstScore, finalScore, total) {
      const d = load() || blank();
      if (!d.labs[labId]) d.labs[labId] = { questions: [] };
      d.labs[labId].label      = labLabel;
      d.labs[labId].firstScore = firstScore;
      d.labs[labId].finalScore = finalScore;
      d.labs[labId].total      = total;
      d.labs[labId].grade      = Session.gradePoints(finalScore, total);
      d.labs[labId].doneAt     = new Date().toISOString();
      save(d);
    },

    // Returns true if this lab has been submitted (finalScore recorded)
    isLabDone(labId) {
      const d = load();
      if (!d) return false;
      const lab = d.labs[labId];
      return !!(lab && lab.doneAt);
    },

    // Returns true when every lab in labIds[] has been completed
    allLabsDone(labIds) {
      return labIds.every(id => Session.isLabDone(id));
    },

    // Returns the full session data object for PDF generation
    export() {
      return load();
    },

    // Clear session (called on tab close automatically, but useful for testing)
    clear() {
      sessionStorage.removeItem(KEY);
    }
  };

  global.Session = Session;

})(window);
