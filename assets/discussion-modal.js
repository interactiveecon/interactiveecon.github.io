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

      @media(prefers-reduced-motion:reduce){
        #discussionEntryModal,
        #discussionEntryModal .dm-card{animation-duration:.01ms!important;}
        #discussionEntryModal .dm-submit{transition-duration:.01ms!important;}
      }

      #discussionEntryModal .dm-kicker {
        font-size: 0.6875rem; text-transform: uppercase; letter-spacing: .09em;
        color: #6b7280; font-weight: 700; margin-bottom: 6px;
      }
      #discussionEntryModal h2 {
        font-family: "Source Serif 4", Georgia, serif;
        font-size: 1.5rem; font-weight: 700; color: #1f2937;
        margin: 0 0 6px; line-height: 1.2;
      }
      #discussionEntryModal .dm-sub {
        font-size: 0.8125rem; color: #6b7280; margin-bottom: 22px; line-height: 1.5;
      }
      #discussionEntryModal .dm-field { margin-bottom: 16px; }
      #discussionEntryModal label {
        display: block; font-size: 0.75rem; font-weight: 700;
        color: #374151; margin-bottom: 5px; letter-spacing: .03em;
        text-transform: uppercase;
      }
      #discussionEntryModal input {
        width: 100%; padding: 10px 12px;
        border: 1.5px solid #8c7f72; border-radius: 12px;
        font-size: 0.9375rem; font-family: inherit; color: #1f2937;
        background: #fafaf8;
        transition: border-color .12s;
      }
      #discussionEntryModal input:focus-visible {
        outline: 3px solid #2f5d7c; outline-offset: 2px;
        border-color: #2f5d7c; background: #fff;
      }
      #discussionEntryModal input:focus:not(:focus-visible) { border-color: #2f5d7c; background: #fff; }
      #discussionEntryModal input.dm-error { border-color: #b42318; }
      #discussionEntryModal input[aria-invalid="true"] { border-color: #b42318; }
      #discussionEntryModal .dm-hint {
        font-size: 0.6875rem; color: #6b7280; margin-top: 4px;
      }
      #discussionEntryModal .dm-err-msg {
        font-size: 0.75rem; color: #b42318; font-weight: 700;
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
        font-size: 0.9375rem; font-weight: 800; cursor: pointer;
        transition: background .12s, transform .07s;
        margin-top: 8px;
      }
      #discussionEntryModal .dm-submit:hover { background: #26506c; }
      #discussionEntryModal .dm-submit:active { transform: translateY(1px); }
      #discussionEntryModal .dm-submit:focus-visible {
        outline: 3px solid #2f5d7c; outline-offset: 2px; border-radius: 13px;
      }

      #discussionEntryModal .dm-note {
        margin-top: 14px; font-size: 0.6875rem; color: #596878;
        text-align: center; line-height: 1.5;
      }
      #discussionEntryModal .dm-note strong { color: #596878; }
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
          <input id="dmName" type="text" placeholder="First Last" autocomplete="name"
                 aria-describedby="dmNameErr" aria-invalid="false" />
          <div class="dm-err-msg" id="dmNameErr" role="alert"></div>
        </div>

        <div class="dm-field">
          <label for="dmId">NetID</label>
          <input id="dmId" type="text" placeholder="e.g. abc123" autocomplete="off"
                 aria-describedby="dmIdErr" aria-invalid="false" />
          <div class="dm-err-msg" id="dmIdErr" role="alert"></div>
        </div>

        ${noSeed ? '' : `
        <div class="dm-field">
          <label for="dmSeed">Session Code <span style="font-weight:500;text-transform:none;">(from your TA)</span></label>
          <div class="dm-seed-row">
            <input id="dmSeed" type="text" placeholder="e.g. W03-42" autocomplete="off" maxlength="12"
                   aria-describedby="dmSeedErr" aria-invalid="false" />
          </div>
          <div class="dm-hint">Enter the code your TA wrote on the board. This ensures everyone gets the same questions.</div>
          <div class="dm-err-msg" id="dmSeedErr" role="alert"></div>
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
    [name, id, seed].filter(Boolean).forEach(el => {
      el.classList.remove('dm-error');
      el.setAttribute('aria-invalid', 'false');
    });
    [nameErr, idErr, seedErr].filter(Boolean).forEach(el => {
      el.classList.remove('show');
      el.textContent = '';
    });

    if (!name.value.trim()) {
      name.classList.add('dm-error');
      name.setAttribute('aria-invalid', 'true');
      nameErr.textContent = 'Please enter your full name.';
      nameErr.classList.add('show');
      ok = false;
    }
    if (!id.value.trim()) {
      id.classList.add('dm-error');
      id.setAttribute('aria-invalid', 'true');
      idErr.textContent = 'Please enter your NetID.';
      idErr.classList.add('show');
      ok = false;
    }
    if (seed && !seed.value.trim()) {
      seed.classList.add('dm-error');
      seed.setAttribute('aria-invalid', 'true');
      seedErr.textContent = 'Please enter the session code from your TA.';
      seedErr.classList.add('show');
      ok = false;
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

      // Build and show modal — defer until body is available
      function attachModal() {
        const modal = buildModal(opts.weekLabel, opts.noSeed);
        document.body.appendChild(modal);

        // Focus trap — keep Tab navigation inside the modal
        modal.addEventListener('keydown', function(e) {
          if (e.key !== 'Tab') return;
          const focusables = modal.querySelectorAll('input:not([disabled]), button:not([disabled])');
          const first = focusables[0];
          const last  = focusables[focusables.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
          } else {
            if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
          }
        });

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

          const m = document.getElementById(MODAL_ID);
          if (m) m.remove();

          if (opts.onReady) opts.onReady(global.Session ? global.Session.getInfo() : { name, studentId: sid, seed });
        });

        [document.getElementById('dmName'), document.getElementById('dmId'),
         opts.noSeed ? null : document.getElementById('dmSeed')]
        .filter(Boolean)
        .forEach(el => {
          el.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') document.getElementById('dmSubmit').click();
          });
        });
      }

      if (document.body) {
        attachModal();
      } else {
        document.addEventListener('DOMContentLoaded', attachModal);
      }

    }
  };

  global.DiscussionModal = DiscussionModal;

})(window);
