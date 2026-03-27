// discussion-pdf.js
// Generates a detailed PDF summary from Session.export().
// Requires jsPDF (loaded via CDN on the week page).

(function (global) {
  'use strict';

  const C = {
    accent: [47,  93,  124],
    good:   [27,  127, 75],
    bad:    [180, 35,  24],
    ink:    [31,  41,  55],
    muted:  [107, 114, 128],
    line:   [231, 223, 210],
    paper:  [246, 242, 234],
    white:  [255, 255, 255],
  };

  function rgb(a) { return { r:a[0], g:a[1], b:a[2] }; }
  function setColor(doc, arr, type) {
    const c = rgb(arr);
    if (type === 'fill') doc.setFillColor(c.r, c.g, c.b);
    else doc.setTextColor(c.r, c.g, c.b);
  }
  function setStroke(doc, arr) { const c=rgb(arr); doc.setDrawColor(c.r,c.g,c.b); }
  function rr(doc, x, y, w, h, r, style) { doc.roundedRect(x,y,w,h,r,r,style); }

  // ── Layout ────────────────────────────────────────────────────────────────
  const PW = 215.9, PH = 279.4;
  const ML = 14, MR = 14;
  const CW = PW - ML - MR;   // 187.9 mm

  // Column layout (all relative to ML):
  // | strip 2 | # 5 | Question ~80 | 1st Answer ~46 | Final ~46 | Badge 18 |
  const COL_STRIP  = 0;
  const COL_NUM    = 2;
  const COL_Q      = 8;
  const COL_Q_W    = 78;   // question text wrap width
  const COL_1ST    = 88;
  const COL_1ST_W  = 44;
  const COL_FIN    = 134;
  const COL_FIN_W  = 34;
  const COL_BADGE  = 170;
  const COL_BADGE_W= 17.9; // to right margin

  const LINE_H     = 4.8;  // mm per text line at font 8
  const ROW_PAD    = 3;    // vertical padding inside each row

  // ── Page management ───────────────────────────────────────────────────────
  function newPage(doc, state) {
    doc.addPage();
    state.y = 16;
    drawFooter(doc, state);
  }
  function checkY(doc, state, need) {
    if (state.y + need > PH - 20) newPage(doc, state);
  }
  function drawFooter(doc, state) {
    const pg = doc.internal.getCurrentPageInfo().pageNumber;
    setColor(doc, C.muted, 'text');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `ECON 002 Discussion Section  •  ${state.session.weekLabel || ''}  •  ${state.dateStr}`,
      ML, PH - 9
    );
    doc.text(`Page ${pg}`, PW - MR, PH - 9, { align: 'right' });
  }

  // ── Header ────────────────────────────────────────────────────────────────
  function drawHeader(doc, session, dateStr) {
    setColor(doc, C.accent, 'fill');
    doc.rect(0, 0, PW, 42, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    setColor(doc, C.white, 'text');
    doc.text('Discussion Section Summary', ML, 15);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${session.weekLabel || 'ECON 002'}  •  ${dateStr}`, ML, 23);

    // Student box
    setColor(doc, C.white, 'fill');
    rr(doc, ML, 28, CW, 18, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setColor(doc, C.ink, 'text');
    doc.text(session.name || '—', ML + 5, 35);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setColor(doc, C.muted, 'text');
    doc.text(`NetID: ${session.studentId || '—'}`, ML + 5, 42);

    if (session.seed && session.seed !== 'NO-SEED') {
      doc.text(`Session Code: ${session.seed}`, ML + 70, 42);
    }

    return 54;
  }

  // ── Grade helper ──────────────────────────────────────────────────────────
  function gradePoints(finalScore, total) {
    if (!total) return 0;
    const pct = finalScore / total;
    if (pct === 1.0) return 5;
    if (pct >= 0.80) return 4;
    if (pct >= 0.60) return 3;
    if (pct >= 0.40) return 2;
    if (pct >= 0.20) return 1;
    return 0;
  }

  // ── Score summary ─────────────────────────────────────────────────────────
  function drawScoreSummary(doc, state, labs) {
    const labArr = Object.values(labs).filter(l => l.doneAt);
    let totalFirst = 0, totalFinal = 0, totalPossible = 0;
    labArr.forEach(l => {
      totalFirst    += l.firstScore || 0;
      totalFinal    += l.finalScore || 0;
      totalPossible += l.total      || 0;
    });

    // Overall assignment grade based on total final score across ALL labs
    const assignGrade = gradePoints(totalFinal, totalPossible);

    checkY(doc, state, 30);
    const y = state.y;

    setColor(doc, C.paper, 'fill');
    setStroke(doc, C.line);
    doc.setLineWidth(0.3);
    rr(doc, ML, y, CW, 24, 3, 'FD');

    // 5 columns: Initial | Final | Possible | Assignment Grade | Labs Done
    const cols = [
      { lbl: 'INITIAL SCORE', val: String(totalFirst),                x: ML + 5  },
      { lbl: 'FINAL SCORE',   val: String(totalFinal),                x: ML + 48 },
      { lbl: 'POSSIBLE',      val: String(totalPossible),             x: ML + 91 },
      { lbl: 'ASSIGNMENT GRADE', val: `${assignGrade} / 5 pts`,      x: ML + 124},
      { lbl: 'LABS DONE',     val: `${labArr.length} / ${Object.values(labs).length}`, x: ML + 163 },
    ];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setColor(doc, C.muted, 'text');
    cols.forEach(c => doc.text(c.lbl, c.x, y + 7));

    doc.setFontSize(13);
    cols.forEach((c, i) => {
      if (i === 3) { // grade — colour by value
        setColor(doc, assignGrade >= 4 ? C.good : assignGrade >= 2 ? C.accent : C.bad, 'text');
      } else if (i === 1) {
        setColor(doc, totalFinal === totalPossible ? C.good : C.accent, 'text');
      } else {
        setColor(doc, C.ink, 'text');
      }
      doc.text(c.val, c.x, y + 18);
    });

    state.y = y + 30;
  }

  // ── Per-lab section ───────────────────────────────────────────────────────
  function drawLabSection(doc, state, labId, lab) {
    checkY(doc, state, 22);
    const y = state.y;

    // Title bar
    setColor(doc, C.accent, 'fill');
    rr(doc, ML, y, CW, 10, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    setColor(doc, C.white, 'text');
    doc.text(lab.label || labId, ML + 4, y + 7);

    // Score chips (right-aligned in title bar): Initial and Final only
    // No per-lab grade — the overall grade is shown in the summary
    doc.setFontSize(8);
    const chips = [
      { txt: `Final: ${lab.finalScore ?? '—'} / ${lab.total ?? '—'}`, good: lab.finalScore === lab.total },
      { txt: `Initial: ${lab.firstScore ?? '—'} / ${lab.total ?? '—'}`, good: false },
    ];
    let cx = PW - MR - 3;
    chips.forEach(chip => {
      const tw = doc.getTextWidth(chip.txt) + 5;
      cx -= tw;
      setColor(doc, chip.good ? C.good : C.white, 'fill');
      rr(doc, cx, y + 1.5, tw, 7, 1.5, 'F');
      setColor(doc, chip.good ? C.white : C.ink, 'text');
      doc.text(chip.txt, cx + 2.5, y + 6.5);
      cx -= 2;
    });

    state.y = y + 12;

    // Column headers
    checkY(doc, state, 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setColor(doc, C.muted, 'text');
    doc.text('#',          ML + COL_NUM,  state.y + 5);
    doc.text('Question',   ML + COL_Q,    state.y + 5);
    doc.text('1st Answer', ML + COL_1ST,  state.y + 5);
    doc.text('Final',      ML + COL_FIN,  state.y + 5);
    doc.text('Result',     ML + COL_BADGE + 1, state.y + 5);

    setStroke(doc, C.line);
    doc.setLineWidth(0.2);
    doc.line(ML, state.y + 7, PW - MR, state.y + 7);
    state.y += 9;

    // Questions
    const qs = lab.questions || [];
    qs.forEach((q, i) => {
      if (!q) return;

      doc.setFontSize(8);
      const qLines    = doc.splitTextToSize(q.text        || '(no text)', COL_Q_W);
      const firstLines= doc.splitTextToSize(q.firstAnswer || '—',         COL_1ST_W);
      const finalLines= doc.splitTextToSize(q.finalAnswer || '—',         COL_FIN_W);

      const nLines = Math.max(qLines.length, firstLines.length, finalLines.length);
      const rowH   = Math.max(10, nLines * LINE_H + ROW_PAD * 2);

      checkY(doc, state, rowH + 1);
      const ry = state.y;

      // Alternating row background
      if (i % 2 === 0) {
        setColor(doc, [250, 248, 245], 'fill');
        doc.rect(ML, ry, CW, rowH, 'F');
      }

      // Left colour strip
      const ok = q.finalCorrect;
      setColor(doc, ok ? C.good : C.bad, 'fill');
      doc.rect(ML + COL_STRIP, ry, 1.8, rowH, 'F');

      const textY = ry + ROW_PAD + LINE_H * 0.8; // first line baseline

      // Q number
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      setColor(doc, C.muted, 'text');
      doc.text(String(i + 1), ML + COL_NUM, ry + rowH / 2, { baseline: 'middle' });

      // Question text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setColor(doc, C.ink, 'text');
      doc.text(qLines, ML + COL_Q, textY);

      // First answer
      setColor(doc, q.firstCorrect ? C.good : C.bad, 'text');
      doc.setFont('helvetica', q.firstCorrect ? 'normal' : 'bold');
      doc.text(firstLines, ML + COL_1ST, textY);

      // Final answer
      setColor(doc, q.finalCorrect ? C.good : C.bad, 'text');
      doc.setFont('helvetica', q.finalCorrect ? 'normal' : 'bold');
      doc.text(finalLines, ML + COL_FIN, textY);

      // Result badge
      const bx = ML + COL_BADGE;
      const bw = COL_BADGE_W;
      setColor(doc, ok ? C.good : C.bad, 'fill');
      rr(doc, bx, ry + rowH/2 - 3.5, bw, 7, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      setColor(doc, C.white, 'text');
      doc.text(ok ? '✓ Correct' : '✗ Wrong', bx + bw/2, ry + rowH/2 + 1, { align: 'center' });

      // Divider line between rows
      setStroke(doc, C.line);
      doc.setLineWidth(0.15);
      doc.line(ML, ry + rowH, PW - MR, ry + rowH);

      state.y = ry + rowH;
    });

    state.y += 8;
  }

  // ── Main ──────────────────────────────────────────────────────────────────
  const DiscussionPDF = {
    generate() {
      if (!global.Session) { alert('session.js not loaded.'); return; }
      const session = global.Session.export();
      if (!session) { alert('No session data. Complete at least one lab first.'); return; }

      const jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      if (!jsPDFCtor) { alert('jsPDF library not loaded.'); return; }

      const doc = new jsPDFCtor({ unit:'mm', format:'letter', orientation:'portrait' });

      const now      = new Date();
      const dateStr  = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
      const timeStr  = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
      const fullDate = `${dateStr} at ${timeStr}`;

      const state = { y: 0, session, dateStr: fullDate };
      drawFooter(doc, state);

      state.y = drawHeader(doc, session, fullDate);
      state.y += 6;
      drawScoreSummary(doc, state, session.labs || {});

      Object.entries(session.labs || {}).forEach(([labId, lab]) => {
        state.y += 4;
        drawLabSection(doc, state, labId, lab);
      });

      const safeName = (session.name || 'student').replace(/\s+/g, '-').toLowerCase();
      const safeWeek = (session.weekLabel || 'discussion').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      doc.save(`econ002-${safeWeek}-${safeName}.pdf`);
    }
  };

  global.DiscussionPDF = DiscussionPDF;

})(window);
