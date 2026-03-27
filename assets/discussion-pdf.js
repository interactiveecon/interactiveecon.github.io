// discussion-pdf.js
// Generates a detailed PDF summary from Session.export().
// Requires jsPDF (loaded via CDN on the week page).
//
// Usage:
//   DiscussionPDF.generate()   // triggers download

(function (global) {
  'use strict';

  // ── Colour palette (matches site design) ──────────────────────────────────
  const C = {
    accent:  [47,  93,  124],   // --accent
    good:    [27,  127, 75],    // --good
    bad:     [180, 35,  24],    // --bad
    ink:     [31,  41,  55],    // --ink
    muted:   [107, 114, 128],   // --muted
    line:    [231, 223, 210],   // --line
    paper:   [246, 242, 234],   // --paper
    white:   [255, 255, 255],
    gold:    [180, 114, 0],
  };

  function rgb(arr) { return { r: arr[0], g: arr[1], b: arr[2] }; }

  // ── Layout constants ───────────────────────────────────────────────────────
  const PW = 215.9;   // letter width mm
  const PH = 279.4;   // letter height mm
  const ML = 18;      // left margin
  const MR = 18;      // right margin
  const CW = PW - ML - MR;  // content width

  // ── jsPDF helpers ─────────────────────────────────────────────────────────

  function setColor(doc, arr, type) {
    const c = rgb(arr);
    if (type === 'fill') doc.setFillColor(c.r, c.g, c.b);
    else doc.setTextColor(c.r, c.g, c.b);
  }

  function setStroke(doc, arr) {
    const c = rgb(arr);
    doc.setDrawColor(c.r, c.g, c.b);
  }

  // Draw a rounded rect. jsPDF roundedRect(x,y,w,h,rx,ry,style)
  function roundRect(doc, x, y, w, h, r, style) {
    doc.roundedRect(x, y, w, h, r, r, style);
  }

  // ── Page management ────────────────────────────────────────────────────────

  function newPage(doc, state) {
    doc.addPage();
    state.y = 18;
    drawPageFooter(doc, state);
  }

  function checkY(doc, state, needed) {
    if (state.y + needed > PH - 22) newPage(doc, state);
  }

  function drawPageFooter(doc, state) {
    const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
    setColor(doc, C.muted, 'text');
    doc.setFontSize(8);
    doc.text(`ECON 002 Discussion Section  •  ${state.session.weekLabel || ''}  •  Generated ${state.dateStr}`, ML, PH - 10);
    doc.text(`Page ${pageNum}`, PW - MR, PH - 10, { align: 'right' });
  }

  // ── Header block (first page) ──────────────────────────────────────────────

  function drawHeader(doc, session, dateStr) {
    // Background band
    setColor(doc, C.accent, 'fill');
    doc.rect(0, 0, PW, 46, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    setColor(doc, C.white, 'text');
    doc.text('Discussion Section Summary', ML, 17);

    // Sub-info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${session.weekLabel || 'ECON 002'}  •  ${dateStr}`, ML, 25);

    // Student info box
    setColor(doc, C.white, 'fill');
    roundRect(doc, ML, 31, CW, 22, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setColor(doc, C.ink, 'text');
    doc.text(session.name || '—', ML + 5, 40);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setColor(doc, C.muted, 'text');
    doc.text(`Student ID: ${session.studentId || '—'}`, ML + 5, 47);

    if (session.seed && session.seed !== 'NO-SEED') {
      doc.text(`Session Code: ${session.seed}`, ML + 80, 47);
    }

    return 62; // y after header
  }

  // ── Score summary row ──────────────────────────────────────────────────────

  function drawScoreSummary(doc, state, labs) {
    const labArr = Object.values(labs);
    let totalFinal = 0, totalPossible = 0, totalFirst = 0;
    labArr.forEach(l => {
      if (l.doneAt) {
        totalFinal    += l.finalScore || 0;
        totalFirst    += l.firstScore || 0;
        totalPossible += l.total      || 0;
      }
    });

    checkY(doc, state, 28);
    const y = state.y;

    // Background
    setColor(doc, C.paper, 'fill');
    setStroke(doc, C.line);
    doc.setLineWidth(0.3);
    roundRect(doc, ML, y, CW, 22, 3, 'FD');

    // Labels
    // Compute total grade points
    let totalGrade = 0, maxGrade = 0;
    labArr.forEach(l => { if (l.doneAt) { totalGrade += (l.grade || 0); maxGrade += 5; } });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setColor(doc, C.muted, 'text');
    doc.text('INITIAL SCORE', ML + 6, y + 7);
    doc.text('FINAL SCORE', ML + 52, y + 7);
    doc.text('POSSIBLE', ML + 98, y + 7);
    doc.text('GRADE', ML + 134, y + 7);
    doc.text('LABS DONE', ML + 162, y + 7);

    // Values
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    setColor(doc, C.ink, 'text');
    doc.text(String(totalFirst),    ML + 6,   y + 17);
    setColor(doc, totalFinal === totalPossible ? C.good : C.accent, 'text');
    doc.text(String(totalFinal),    ML + 52,  y + 17);
    setColor(doc, C.ink, 'text');
    doc.text(String(totalPossible), ML + 98,  y + 17);
    setColor(doc, totalGrade === maxGrade ? C.good : C.accent, 'text');
    doc.text(maxGrade > 0 ? `${totalGrade} / ${maxGrade}` : '—', ML + 134, y + 17);
    setColor(doc, C.ink, 'text');
    doc.text(`${labArr.filter(l=>l.doneAt).length} / ${labArr.length}`, ML + 162, y + 17);

    state.y = y + 28;
  }

  // ── Per-lab section ────────────────────────────────────────────────────────

  function drawLabSection(doc, state, labId, lab) {
    checkY(doc, state, 20);
    const y = state.y;

    // Lab title bar
    setColor(doc, C.accent, 'fill');
    roundRect(doc, ML, y, CW, 10, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setColor(doc, C.white, 'text');
    doc.text(lab.label || labId, ML + 4, y + 7);

    // Score chips
    const grade = (lab.grade !== undefined) ? lab.grade : null;
    const chips = [
      { label: 'Initial', val: lab.firstScore, total: lab.total, good: false },
      { label: 'Final',   val: lab.finalScore, total: lab.total, good: true  },
      ...(grade !== null ? [{ label: 'Grade', val: grade, total: 5, good: true, isGrade: true }] : []),
    ];
    let cx = PW - MR - 4;
    chips.reverse().forEach(chip => {
      const txt = chip.isGrade
        ? `Grade: ${chip.val ?? '—'} / 5 pts`
        : `${chip.label}: ${chip.val ?? '—'} / ${chip.total ?? '—'}`;
      const tw = doc.getTextWidth(txt) + 6;
      cx -= tw;
      const filled = chip.isGrade ? (chip.val >= 4) : (chip.good && chip.val === chip.total);
      setColor(doc, filled ? C.good : C.white, 'fill');
      roundRect(doc, cx, y + 1, tw, 8, 1.5, 'F');
      setColor(doc, filled ? C.white : C.ink, 'text');
      doc.setFontSize(8);
      doc.text(txt, cx + 3, y + 6.5);
      cx -= 3;
    });

    state.y = y + 14;

    // Column headers
    checkY(doc, state, 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setColor(doc, C.muted, 'text');
    doc.text('#',           ML + 1,       state.y + 5);
    doc.text('Question',    ML + 8,       state.y + 5);
    doc.text('1st Answer',  ML + 106,     state.y + 5);
    doc.text('Final',       ML + 146,     state.y + 5);
    doc.text('Result',      PW - MR - 16, state.y + 5);

    setStroke(doc, C.line);
    doc.setLineWidth(0.2);
    doc.line(ML, state.y + 7, PW - MR, state.y + 7);
    state.y += 9;

    // Questions
    const qs = lab.questions || [];
    qs.forEach((q, i) => {
      if (!q) return;

      // Estimate row height (question text may wrap)
      const maxQW = 94; // mm available for question text
      const qLines = doc.splitTextToSize(q.text || '(no text)', maxQW);
      const rowH = Math.max(10, qLines.length * 4.2 + 4);

      checkY(doc, state, rowH + 2);
      const ry = state.y;

      // Row background (alternating)
      if (i % 2 === 0) {
        setColor(doc, [250, 248, 245], 'fill');
        doc.rect(ML, ry, CW, rowH, 'F');
      }

      // Result indicator strip on left
      const ok = q.finalCorrect;
      setColor(doc, ok ? C.good : C.bad, 'fill');
      doc.rect(ML, ry, 1.5, rowH, 'F');

      // Q number
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      setColor(doc, C.muted, 'text');
      doc.text(String(i + 1), ML + 3, ry + rowH / 2 + 1.5, { baseline: 'middle' });

      // Question text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setColor(doc, C.ink, 'text');
      doc.text(qLines, ML + 8, ry + 4.5);

      // First answer
      const firstColor = q.firstCorrect ? C.good : C.bad;
      setColor(doc, firstColor, 'text');
      doc.setFont('helvetica', q.firstCorrect ? 'normal' : 'bold');
      const firstLines = doc.splitTextToSize(q.firstAnswer || '—', 36);
      doc.text(firstLines, ML + 106, ry + 4.5);

      // Final answer
      const finalColor = q.finalCorrect ? C.good : C.bad;
      setColor(doc, finalColor, 'text');
      doc.setFont('helvetica', q.finalCorrect ? 'normal' : 'bold');
      const finalLines = doc.splitTextToSize(q.finalAnswer || '—', 36);
      doc.text(finalLines, ML + 146, ry + 4.5);

      // Result badge
      const badgeX = PW - MR - 15;
      setColor(doc, ok ? C.good : C.bad, 'fill');
      roundRect(doc, badgeX, ry + rowH/2 - 3.5, 14, 7, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      setColor(doc, C.white, 'text');
      doc.text(ok ? '✓ Correct' : '✗ Wrong', badgeX + 7, ry + rowH/2 + 1.2, { align: 'center' });

      state.y = ry + rowH + 1;
    });

    state.y += 6;
  }

  // ── Main generate function ─────────────────────────────────────────────────

  const DiscussionPDF = {
    generate() {
      if (!global.Session) {
        alert('Session not found. Make sure session.js is loaded.');
        return;
      }
      const session = global.Session.export();
      if (!session) {
        alert('No session data found. Please complete at least one lab first.');
        return;
      }
      if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
        alert('PDF library not loaded. Make sure jsPDF is included on the page.');
        return;
      }

      const jsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' });

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
      const fullDate = `${dateStr} at ${timeStr}`;

      const state = { y: 0, session, dateStr: fullDate };
      drawPageFooter(doc, state);

      // Header
      state.y = drawHeader(doc, session, fullDate);

      // Score summary
      drawScoreSummary(doc, state, session.labs || {});

      // Per-lab sections
      const labs = session.labs || {};
      Object.entries(labs).forEach(([labId, lab]) => {
        state.y += 4;
        drawLabSection(doc, state, labId, lab);
      });

      // Filename
      const safeName = (session.name || 'student').replace(/\s+/g, '-').toLowerCase();
      const safeWeek = (session.weekLabel || 'discussion').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      doc.save(`econ002-${safeWeek}-${safeName}.pdf`);
    }
  };

  global.DiscussionPDF = DiscussionPDF;

})(window);
