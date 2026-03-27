// discussion-modal.js
// Drop this script (along with session.js) into any discussion week page.
// It injects the modal HTML, shows it if no session is active, and calls
// Session.start() when the student submits.
//
// Usage:
//   <script src="/assets/session.js"></script>
//   <script src="/assets/discussion-modal.js"></script>
//   <script>
//     DiscussionModal.init({ weekLabel: 'Week 3 — Fiscal Policy', onReady: myCallback });
//   </script>
//
// onReady(session) is called once the student has entered their info
// (either now, or immediately if a session is already active).

(function (global) {
  'use strict';

  const MODAL_ID = 'discussionEntryModal';

  function injectStyles() {
    if (document.getElementById('disc-modal-styles')) return;
    const s = document.createElement('style');
    s.id = 'disc-modal-styles';
    s.textContent = `
      #discussionEntryModal {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(17,24,39,0.55);
        display: flex; align-items: center; justify-content: center;
        padding: 18px;
        backdrop-filter: blur(3px);
        animation: dmFadeIn .18s ease;
      }
      @keyframes dmFadeIn { from{opacity:0} to{opacity:1} }

      #discussionEntryModal .dm-card {
        background: #fff;
        border-radius: 22px;
        padding: 32px 28px 24px;
        max-width: 440px; width: 100%;
        box-shadow: 0 8px 40px rgba(17,24,39,0.18), 0 2px 8px rgba(17,24,39,0.10);
        animation: dmSlideUp .2s ease;
      }
      @keyframes dmSlideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

      #discussionEntryModal .dm-kicker {
        font-size: 11px; text-transform: uppercase; letter-spacing: .09em;
        color: #6b7280; font-weight: 700; margin-bottom: 6px;
      }
      #discussionEntryModal h2 {
        font-family: "Source Serif 4", Georgia, serif;
        font-size: 24px; font-weight: 700; color: #1f2937;
        margin: 0 0 6px; line-height: 1.2;
      }
      #discussionEntryModal .dm-sub {
        font-size: 13px; color: #6b7280; margin-bottom: 22px; line-height: 1.5;
      }
      #discussionEntryModal .dm-field { margin-bottom: 16px; }
      #discussionEntryModal label {
        display: block; font-size: 12px; font-weight: 700;
        color: #374151; margin-bottom: 5px; letter-spacing: .03em;
        text-transform: uppercase;
      }
      #discussionEntryModal input {
        width: 100%; padding: 10px 12px;
        border: 1.5px solid #e7dfd2; border-radius: 12px;
        font-size: 15px; font-family: inherit; color: #1f2937;
        background: #fafaf8; outline: none;
        transition: border-color .12s;
      }
      #discussionEntryModal input:focus { border-color: #2f5d7c; background: #fff; }
      #discussionEntryModal input.dm-error { border-color: #b42318; }
      #discussionEntryModal .dm-hint {
        font-size: 11px; color: #6b7280; margin-top: 4px;
      }
      #discussionEntryModal .dm-err-msg {
        font-size: 12px; color: #b42318; font-weight: 700;
        margin-top: 4px; display: none;
      }
      #discussionEntryModal .dm-err-msg.show { display: block; }

      #discussionEntryModal .dm-seed-row {
        display: flex; gap: 8px; align-items: flex-start;
      }
      #discussionEntryModal .dm-seed-row input { flex: 1; font-family: "Courier New", monospace; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }

      #discussionEntryModal .dm-submit {
        width: 100%; padding: 12px;
        background: #2f5d7c; color: #fff;
        border: none; border-radius: 13px;
        font-size: 15px; font-weight: 800; cursor: pointer;
        transition: background .12s, transform .07s;
        margin-top: 8px;
      }
      #discussionEntryModal .dm-submit:hover { background: #26506c; }
      #discussionEntryModal .dm-submit:active { transform: translateY(1px); }

      #discussionEntryModal .dm-note {
        margin-top: 14px; font-size: 11px; color: #9ca3af;
        text-align: center; line-height: 1.5;
      }
      #discussionEntryModal .dm-note strong { color: #6b7280; }
    `;
    document.head.appendChild(s);
  }

  function buildModal(weekLabel, noSeed) {
    const div = document.createElement('div');
    div.id = MODAL_ID;
    div.innerHTML = `
      <div class="dm-card" role="dialog" aria-modal="true" aria-labelledby="dmTitle">
        <div class="dm-kicker">ECON 002 — Discussion Section</div>
        <h2 id="dmTitle">${weekLabel || 'Discussion Section'}</h2>
        <p class="dm-sub">Enter your information to begin. Your results will be saved in this browser tab until you download your summary PDF.</p>

        <div class="dm-field">
          <label for="dmName">Full Name</label>
          <input id="dmName" type="text" placeholder="First Last" autocomplete="name" />
          <div class="dm-err-msg" id="dmNameErr">Please enter your full name.</div>
        </div>

        <div class="dm-field">
          <label for="dmId">Student ID</label>
          <input id="dmId" type="text" placeholder="e.g. 12345678" autocomplete="off" />
          <div class="dm-err-msg" id="dmIdErr">Please enter your student ID.</div>
        </div>

        ${noSeed ? '' : `
        <div class="dm-field">
          <label for="dmSeed">Session Code <span style="font-weight:500;text-transform:none;">(from your TA)</span></label>
          <div class="dm-seed-row">
            <input id="dmSeed" type="text" placeholder="e.g. W03-42" autocomplete="off" maxlength="12" />
          </div>
          <div class="dm-hint">Enter the code your TA wrote on the board. This ensures everyone gets the same questions.</div>
          <div class="dm-err-msg" id="dmSeedErr">Please enter the session code from your TA.</div>
        </div>
        `}

        <button class="dm-submit" id="dmSubmit">Start →</button>

        <p class="dm-note">
          <strong>Privacy:</strong> Your information is stored only in this browser tab and is automatically deleted when you close it. Nothing is sent to any server.
        </p>
      </div>
    `;
    return div;
  }

  function validate(noSeed) {
    let ok = true;
    const name = document.getElementById('dmName');
    const id   = document.getElementById('dmId');
    const seed = noSeed ? null : document.getElementById('dmSeed');

    const nameErr = document.getElementById('dmNameErr');
    const idErr   = document.getElementById('dmIdErr');
    const seedErr = noSeed ? null : document.getElementById('dmSeedErr');

    // Reset
    [name, id, seed].filter(Boolean).forEach(el => el.classList.remove('dm-error'));
    [nameErr, idErr, seedErr].filter(Boolean).forEach(el => el.classList.remove('show'));

    if (!name.value.trim()) {
      name.classList.add('dm-error'); nameErr.classList.add('show'); ok = false;
    }
    if (!id.value.trim()) {
      id.classList.add('dm-error'); idErr.classList.add('show'); ok = false;
    }
    if (seed && !seed.value.trim()) {
      seed.classList.add('dm-error'); seedErr.classList.add('show'); ok = false;
    }
    return ok;
  }

  const DiscussionModal = {
    /**
     * opts.weekLabel  — shown in modal heading and stored in session
     * opts.noSeed     — if true, skip the seed/code field (for seedless weeks)
     * opts.onReady(session) — called when session is active (immediately if already started)
     */
    init(opts) {
      opts = opts || {};
      injectStyles();

      // If session already active, fire immediately
      if (global.Session && global.Session.isActive()) {
        if (opts.onReady) opts.onReady(global.Session.getInfo());
        return;
      }

      // Build and show modal
      const modal = buildModal(opts.weekLabel, opts.noSeed);
      document.body.appendChild(modal);

      // Focus first field
      setTimeout(() => {
        const el = document.getElementById('dmName');
        if (el) el.focus();
      }, 50);

      document.getElementById('dmSubmit').addEventListener('click', function () {
        if (!validate(opts.noSeed)) return;
        const name = document.getElementById('dmName').value.trim();
        const sid  = document.getElementById('dmId').value.trim();
        const seed = opts.noSeed ? 'NO-SEED' : document.getElementById('dmSeed').value.trim().toUpperCase();

        if (global.Session) {
          global.Session.start(name, sid, seed, opts.weekLabel || '');
        }

        // Dismiss modal
        const m = document.getElementById(MODAL_ID);
        if (m) m.remove();

        if (opts.onReady) opts.onReady(global.Session ? global.Session.getInfo() : { name, studentId: sid, seed });
      });

      // Allow Enter key to submit
      [document.getElementById('dmName'), document.getElementById('dmId'),
       opts.noSeed ? null : document.getElementById('dmSeed')]
      .filter(Boolean)
      .forEach(el => {
        el.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') document.getElementById('dmSubmit').click();
        });
      });
    }
  };

  global.DiscussionModal = DiscussionModal;

})(window);
