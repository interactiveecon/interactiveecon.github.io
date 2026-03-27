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

  // ── Seeded RNG (mulberry32) ─────────────────────────────────────────────────
  // Produces a deterministic sequence from a string seed.
  // Labs call Session.rng() instead of Math.random() to get reproducible questions.

  function hashSeed(str) {
    // Simple djb2-style hash → 32-bit integer
    let h = 1779033703;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }

  let _rngState = null;

  function makeRng(seed) {
    let s = hashSeed(String(seed));
    return function () {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

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
      _rngState = makeRng(data.seed);
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

    // Return a seeded random number [0, 1).
    // Must call Session.start() first. Falls back to Math.random() if not.
    rng() {
      if (!_rngState) {
        const d = load();
        if (d && d.seed) { _rngState = makeRng(d.seed); }
        else { return Math.random(); }
      }
      return _rngState();
    },

    // Re-create the RNG at a named checkpoint so a specific lab always gets
    // the same sequence regardless of what ran before it.
    // Labs should call: Session.rngForLab('what-went-wrong')
    rngForLab(labId) {
      const d = load();
      const seed = d ? d.seed + '|' + labId : labId;
      _rngState = makeRng(seed);
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

    // Call once when a lab is fully submitted (after final submission).
    recordLabDone(labId, labLabel, firstScore, finalScore, total) {
      const d = load() || blank();
      if (!d.labs[labId]) d.labs[labId] = { questions: [] };
      d.labs[labId].label      = labLabel;
      d.labs[labId].firstScore = firstScore;
      d.labs[labId].finalScore = finalScore;
      d.labs[labId].total      = total;
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
      _rngState = null;
    }
  };

  // Re-hydrate RNG if page is refreshed mid-session
  (function init() {
    const d = load();
    if (d && d.seed) { _rngState = makeRng(d.seed); }
  })();

  global.Session = Session;

})(window);
