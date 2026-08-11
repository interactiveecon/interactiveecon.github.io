/* ═══════════════════════════════════════════════════════════════════════════
   solow-plot.js — shared canvas drawing primitives for the Solow labs
   ═══════════════════════════════════════════════════════════════════════════

   Built on the CLAUDE.md canvas conventions: setupCanvas / PAD / makeCoords,
   every curve draw clipped to the plot rectangle, and every font size passed
   through the _fs scale factor so canvas text honours the reader's browser
   font-size preference (WCAG 1.4.4).

   Two rules this module enforces so callers cannot break them:

   1. NO HARDCODED COLOURS. Every drawing call takes a `theme` object of
      already-resolved token values. The module never reads CSS and never
      names a colour, so a lab can restyle without touching this file.

   2. NO MEANING FROM COLOUR ALONE (WCAG 1.4.1). Every line-drawing function
      requires an explicit `style` of 'solid' | 'dashed' | 'dotted', and the
      label helpers attach a text label to the thing they mark. A caller that
      forgets a style gets 'solid' and a console warning in self-test mode,
      not a silently colour-only distinction.

   Coordinates: all geometry is in DEVICE pixels (CSS px × dpr). Anything
   specified in CSS px — padding, font sizes, dash lengths, marker radii — is
   multiplied by dpr at the point of use.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  /* ── HiDPI canvas setup (CLAUDE.md) ─────────────────────────────────── */

  function setupCanvas(canvas, wrap) {
    const dpr = window.devicePixelRatio || 1;
    const rect = wrap.getBoundingClientRect();
    const W = Math.round(rect.width * dpr);
    const H = Math.round(rect.height * dpr);
    if (!W || !H) return null;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W; canvas.height = H;
    }
    return { ctx: canvas.getContext('2d'), dpr, W, H };
  }

  /* ── Font scale (CLAUDE.md _fs pattern) ─────────────────────────────────
     Canvas cannot use rem, so every font size is multiplied by the ratio of
     the root font size to 16px, clamped so very large user settings do not
     make labels collide.                                                    */

  function fontScale() {
    return Math.max(0.75, Math.min(2.5,
      parseFloat(getComputedStyle(document.documentElement).fontSize) / 16));
  }

  /* ── Coordinate system (CLAUDE.md) ──────────────────────────────────────
     Left padding is generous because auto-scaling can put five-digit numbers
     on the y axis; callers may override any side.                          */

  const PAD = { l: 52, r: 16, t: 16, b: 48 };

  function makeCoords(W, H, dpr, xMax, yMax, padOverride) {
    return makeCoordsRange(W, H, dpr, { xMax, yMax }, padOverride);
  }

  /* Same thing with explicit minima. Panel C plots logs, which go negative
     whenever the economy starts above its steady state, so a 0-anchored
     y axis is not general enough. */
  function makeCoordsRange(W, H, dpr, r, padOverride) {
    const base = padOverride ? Object.assign({}, PAD, padOverride) : PAD;
    const p = { l: base.l * dpr, r: base.r * dpr, t: base.t * dpr, b: base.b * dpr };
    const PW = W - p.l - p.r, PH = H - p.t - p.b;
    const xMin = r.xMin || 0, yMin = r.yMin || 0;
    const xSpan = (r.xMax - xMin) || 1, ySpan = (r.yMax - yMin) || 1;
    return {
      xC: x => p.l + ((x - xMin) / xSpan) * PW,
      yC: y => H - p.b - ((y - yMin) / ySpan) * PH,
      // inverses, for hit-testing clicks and drags back to model units
      xInv: px => xMin + ((px - p.l) / PW) * xSpan,
      yInv: py => yMin + ((H - p.b - py) / PH) * ySpan,
      p, PW, PH, W, H, dpr,
      xMin, yMin, xMax: r.xMax, yMax: r.yMax, xSpan, ySpan
    };
  }

  /* First tick at or above `min` on a lattice of `step` through zero. */
  function firstTick(min, step) { return Math.ceil((min - 1e-9) / step) * step; }

  /* ── Size-aware tick step ────────────────────────────────────────────────
     SolowCore.tickStep picks a step from the axis maximum alone, which is the
     right answer when the canvas is a known size. These panels are not: the
     same axis is drawn 1090 px wide on a desktop and 284 px wide at a 320 px
     viewport, and the reader's font-size preference scales the labels on top
     of that. Choosing the step from the space actually available keeps the
     labels from colliding in either case, and means a reader at 200% text
     size gets fewer ticks rather than an unreadable smear (WCAG 1.4.4).

     span     — axis range in model units
     availPx  — plot width or height in DEVICE px
     minGapPx — smallest acceptable gap between ticks, in DEVICE px          */
  function niceStep(span, availPx, minGapPx) {
    if (!(span > 0) || !(availPx > 0)) return 1;
    const maxTicks = Math.max(2, Math.floor(availPx / Math.max(1, minGapPx)));
    const raw = span / maxTicks;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const mult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
    return mult * mag;
  }

  /* ── Line styles ─────────────────────────────────────────────────────────
     'style' is required on every stroke so that colour is never the only
     distinguishing feature between two curves (WCAG 1.4.1).                */

  const DASH = { solid: [], dashed: [8, 5], dotted: [1.6, 4.2] };

  function setStyle(ctx, style, dpr) {
    const d = DASH[style] || DASH.solid;
    ctx.setLineDash(d.map(v => v * dpr));
  }

  function clearStyle(ctx) { ctx.setLineDash([]); }

  /* ── Clipping helper — every curve draw goes through this ──────────── */

  function clipped(ctx, C, fn) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(C.p.l, C.p.t, C.PW, C.PH);
    ctx.clip();
    fn();
    ctx.restore();
  }

  /* ── Number formatting for axis ticks and labels ────────────────────── */

  function fmt(v, step) {
    if (!isFinite(v)) return '—';
    const a = Math.abs(v);
    if (a >= 1000) return String(Math.round(v));
    if (step !== undefined) {
      const dec = step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3;
      return v.toFixed(dec);
    }
    if (a >= 100) return v.toFixed(0);
    if (a >= 10) return v.toFixed(1);
    if (a >= 1) return v.toFixed(2);
    return v.toFixed(3);
  }

  /* ── Small rounded chip behind a floating label ─────────────────────────
     Labels sit on top of curves and gridlines; without a backing chip they
     become unreadable wherever they cross a line.                          */

  function chip(ctx, x, y, w, h, fill, stroke, dpr) {
    const r = 4 * dpr;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1 * dpr; clearStyle(ctx); ctx.stroke(); }
  }

  /* Draw text with a chip behind it. align: 'left' | 'right' | 'center'. */
  function tag(ctx, o) {
    const dpr = o.dpr, fs = o.fs, sz = (o.size || 11);
    ctx.font = `${o.weight || 700} ${Math.round(sz * dpr * fs)}px "Inter",sans-serif`;
    const w = ctx.measureText(o.text).width;
    const padX = 5 * dpr, padY = 3 * dpr;
    const bw = w + padX * 2, bh = Math.round(sz * dpr * fs) + padY * 2;
    let x = o.x;
    if (o.align === 'right') x = o.x - bw;
    else if (o.align === 'center') x = o.x - bw / 2;
    let y = o.y - bh / 2;
    if (o.vAlign === 'top') y = o.y;
    else if (o.vAlign === 'bottom') y = o.y - bh;
    if (o.bg !== false) chip(ctx, x, y, bw, bh, o.bg || 'rgba(255,255,255,.88)', o.border || null, dpr);
    ctx.fillStyle = o.color;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(o.text, x + padX, y + bh / 2);
    return { x, y, w: bw, h: bh };
  }

  /* ── Axes, ticks, gridlines, axis titles ────────────────────────────────
     opts: {dpr, fs, theme, xMax, yMax, xStep, yStep, xLabel, yLabel,
            grid:true, xTickFmt, yTickFmt, xTicksOnly:[…]}                 */

  function axes(ctx, C, o) {
    const dpr = C.dpr, fs = o.fs, th = o.theme;
    const H = C.H, p = C.p;
    const xStep = o.xStep, yStep = o.yStep;

    // Gridlines first, so curves draw over them
    if (o.grid !== false) {
      ctx.save();
      ctx.strokeStyle = th.line;
      ctx.lineWidth = 1 * dpr;
      clearStyle(ctx);
      ctx.beginPath();
      if (yStep) for (let v = firstTick(C.yMin, yStep); v <= C.yMax + 1e-9; v += yStep) {
        if (Math.abs(v - C.yMin) < 1e-9) continue;
        const y = Math.round(C.yC(v)) + .5;
        ctx.moveTo(p.l, y); ctx.lineTo(p.l + C.PW, y);
      }
      if (xStep) for (let v = firstTick(C.xMin, xStep); v <= C.xMax + 1e-9; v += xStep) {
        if (Math.abs(v - C.xMin) < 1e-9) continue;
        const x = Math.round(C.xC(v)) + .5;
        ctx.moveTo(x, p.t); ctx.lineTo(x, p.t + C.PH);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Axis lines
    ctx.save();
    clearStyle(ctx);
    ctx.strokeStyle = th.ink2;
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(p.l, p.t); ctx.lineTo(p.l, H - p.b); ctx.lineTo(p.l + C.PW, H - p.b);
    ctx.stroke();

    // Tick labels
    ctx.fillStyle = th.muted;
    ctx.font = `600 ${Math.round(10 * dpr * fs)}px "Inter",sans-serif`;
    if (xStep) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      /* Drop-line labels (k̂*, k̂_gr) are drawn in the same strip as the tick
         numbers. Rather than letting a chip half-cover "14000" and leave a
         readable-but-wrong "4000", suppress any tick number close enough to a
         named position to collide with it. */
      const skip = o.xSkip || [];
      const tol = (o.xSkipPx || 30) * dpr;
      for (let v = firstTick(C.xMin, xStep); v <= C.xMax + 1e-9; v += xStep) {
        const px = C.xC(v);
        if (skip.some(sv => isFinite(sv) && Math.abs(C.xC(sv) - px) < tol)) continue;
        ctx.fillText(o.xTickFmt ? o.xTickFmt(v) : fmt(v, xStep), px, H - p.b + 6 * dpr);
      }
    }
    if (yStep) {
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let v = firstTick(C.yMin, yStep); v <= C.yMax + 1e-9; v += yStep) {
        ctx.fillText(o.yTickFmt ? o.yTickFmt(v) : fmt(v, yStep), p.l - 7 * dpr, C.yC(v));
      }
    }

    // Axis titles
    ctx.fillStyle = th.ink2;
    ctx.font = `700 ${Math.round(11 * dpr * fs)}px "Inter",sans-serif`;
    if (o.xLabel) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(o.xLabel, p.l + C.PW / 2, H - 6 * dpr);
    }
    if (o.yLabel) {
      ctx.save();
      ctx.translate(12 * dpr, p.t + C.PH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(o.yLabel, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  /* ── A curve from an evaluator function ─────────────────────────────────
     opts: {color, style, width, ghost, xFrom, xTo, samples}               */

  function curve(ctx, C, fn, o) {
    const dpr = C.dpr;
    const from = o.xFrom !== undefined ? o.xFrom : C.xMin;
    const to = o.xTo !== undefined ? o.xTo : C.xMax;
    const n = o.samples || Math.max(80, Math.round(C.PW / (2 * dpr)));
    clipped(ctx, C, function () {
      ctx.globalAlpha = o.ghost ? 0.55 : 1;
      ctx.strokeStyle = o.color;
      ctx.lineWidth = (o.width || 2.4) * dpr;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      setStyle(ctx, o.style || 'solid', dpr);
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const x = from + (to - from) * (i / n);
        const y = fn(x);
        if (!isFinite(y)) continue;
        const px = C.xC(x), py = C.yC(y);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      clearStyle(ctx);
      ctx.globalAlpha = 1;
    });
  }

  /* ── A polyline through an array of {x,y} points (time-series panels) ── */

  function series(ctx, C, pts, o) {
    const dpr = C.dpr;
    clipped(ctx, C, function () {
      ctx.globalAlpha = o.ghost ? 0.55 : 1;
      ctx.strokeStyle = o.color;
      ctx.lineWidth = (o.width || 2.4) * dpr;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      setStyle(ctx, o.style || 'solid', dpr);
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < pts.length; i++) {
        const q = pts[i];
        if (!isFinite(q.y)) { started = false; continue; }
        const px = C.xC(q.x), py = C.yC(q.y);
        if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
      }
      ctx.stroke();
      clearStyle(ctx);
      ctx.globalAlpha = 1;
    });
  }

  /* ── Persistent curve label, placed adaptively at the right edge ────────
     Replaces the original notebook's Epilog text, which was pinned to fixed
     coordinates at k = 15 and detached from the curves as soon as the axes
     changed, and its Tooltip labels, which were hover-only (dead on touch and
     for keyboard users).

     Walks in from the right edge until the curve is inside the frame, then
     nudges vertically to avoid labels already placed this frame. Callers pass
     a shared `taken` array so labels from different curves cannot collide.  */

  function curveLabel(ctx, C, fn, o) {
    const dpr = C.dpr, fs = o.fs;
    const taken = o.taken || [];
    const yCeil = C.yMin + C.ySpan * 0.985;
    let x = C.xMin + C.xSpan * 0.985, y = fn(x), guard = 0;
    while ((!isFinite(y) || y > yCeil) && guard++ < 400) {
      x -= C.xSpan / 400;
      if (x <= C.xMin) break;
      y = fn(x);
    }
    if (!isFinite(y) || x <= C.xMin) return null;

    let py = C.yC(y);
    const minGap = 16 * dpr * fs;
    let tries = 0;
    while (taken.some(t => Math.abs(t - py) < minGap) && tries++ < 24) py -= minGap;
    py = Math.max(C.p.t + minGap / 2, Math.min(C.H - C.p.b - minGap / 2, py));
    taken.push(py);

    return tag(ctx, {
      ctx, x: C.xC(x) - 4 * dpr, y: py, text: o.text, color: o.color,
      align: 'right', dpr, fs, size: o.size || 11,
      bg: o.bg || 'rgba(255,255,255,.9)', border: o.border || null
    });
  }

  /* ── Vertical drop line from the x axis up to (x, y) ────────────────────
     opts: {color, style, label, labelColor, width, ghost}
     `label` is drawn as an x-axis tick label under the foot of the line —
     this is how k̂* and k̂_gr get named on the axis itself.                 */

  function dropLine(ctx, C, x, y, o) {
    const dpr = C.dpr;
    clipped(ctx, C, function () {
      ctx.globalAlpha = o.ghost ? 0.5 : 1;
      ctx.strokeStyle = o.color;
      ctx.lineWidth = (o.width || 1.8) * dpr;
      setStyle(ctx, o.style || 'dashed', dpr);
      ctx.beginPath();
      ctx.moveTo(C.xC(x), C.yC(C.yMin));
      ctx.lineTo(C.xC(x), C.yC(y));
      ctx.stroke();
      clearStyle(ctx);
      ctx.globalAlpha = 1;
    });
    if (o.label) {
      /* labelDy puts the named label (k̂*, k̂_gr, s = α) on its own row below
         the numeric ticks. Sharing the tick row means either the label covers
         a number — leaving a readable-but-wrong fragment like "4000" out of
         "14000" — or the number has to be suppressed, which loses a tick.
         A second row costs a few pixels of bottom padding and neither. */
      tag(ctx, {
        ctx, x: C.xC(x), y: C.H - C.p.b + (o.labelDy !== undefined ? o.labelDy : 6) * dpr,
        text: o.label,
        color: o.labelColor || o.color, align: 'center', vAlign: 'top',
        dpr, fs: o.fs, size: o.size || 11, bg: o.bg || 'rgba(246,242,234,.95)'
      });
    }
  }

  /* ── Horizontal guide from the y axis across to (xTo, y) ─────────────── */

  function hGuide(ctx, C, y, xTo, o) {
    const dpr = C.dpr;
    clipped(ctx, C, function () {
      ctx.globalAlpha = o.ghost ? 0.5 : 1;
      ctx.strokeStyle = o.color;
      ctx.lineWidth = (o.width || 1.8) * dpr;
      setStyle(ctx, o.style || 'dashed', dpr);
      ctx.beginPath();
      ctx.moveTo(C.xC(C.xMin), C.yC(y));
      ctx.lineTo(C.xC(xTo), C.yC(y));
      ctx.stroke();
      clearStyle(ctx);
      ctx.globalAlpha = 1;
    });
    if (o.label) {
      tag(ctx, {
        ctx, x: C.p.l + 6 * dpr, y: C.yC(y), text: o.label,
        color: o.labelColor || o.color, align: 'left',
        dpr, fs: o.fs, size: o.size || 11
      });
    }
  }

  /* ── A full-width horizontal reference line (steady-state asymptote) ── */

  function hLine(ctx, C, y, o) {
    const dpr = C.dpr;
    clipped(ctx, C, function () {
      ctx.globalAlpha = o.ghost ? 0.5 : 1;
      ctx.strokeStyle = o.color;
      ctx.lineWidth = (o.width || 1.6) * dpr;
      setStyle(ctx, o.style || 'dotted', dpr);
      ctx.beginPath();
      ctx.moveTo(C.p.l, C.yC(y)); ctx.lineTo(C.p.l + C.PW, C.yC(y));
      ctx.stroke();
      clearStyle(ctx);
      ctx.globalAlpha = 1;
    });
  }

  /* ── Shaded vertical band between two curve values at one x ─────────────
     This is the p. 7 decomposition: ŷ is the gap from the axis to f(k̂), î is
     the gap from the axis to sf(k̂), and ĉ is the gap between the two. Drawing
     them as filled bands with a bracket and a letter makes consumption a
     visible quantity on the diagram rather than a formula in the readout.

     opts: {fill, edge, label, labelColor, halfWidth (CSS px), fs}          */

  function band(ctx, C, x, y0, y1, o) {
    const dpr = C.dpr;
    const hw = (o.halfWidth || 7) * dpr;
    const px = C.xC(x);
    const top = C.yC(Math.max(y0, y1)), bot = C.yC(Math.min(y0, y1));
    clipped(ctx, C, function () {
      ctx.fillStyle = o.fill;
      ctx.fillRect(px - hw, top, hw * 2, bot - top);
      if (o.edge) {
        ctx.strokeStyle = o.edge;
        ctx.lineWidth = 1.2 * dpr;
        clearStyle(ctx);
        ctx.strokeRect(px - hw + .5, top + .5, hw * 2 - 1, Math.max(1, bot - top - 1));
      }
    });
    if (o.label && bot - top > 14 * dpr) {
      tag(ctx, {
        ctx, x: px + hw + 3 * dpr, y: (top + bot) / 2, text: o.label,
        color: o.labelColor, align: 'left', dpr, fs: o.fs, size: o.size || 11
      });
    }
  }

  /* ── Tangent line through (x0, y0) with a given slope ───────────────────
     Used to show that at k̂_gr the slope of f(k̂) — the MPK — equals the slope
     of the break-even ray. Once a student sees the two slopes match, the
     golden rule stops being a formula to memorise.

     `span` is the half-length of the segment as a fraction of xMax.        */

  function tangent(ctx, C, x0, y0, slope, o) {
    const dpr = C.dpr;
    const half = (o.span || 0.22) * C.xMax;
    const xa = Math.max(0, x0 - half), xb = Math.min(C.xMax, x0 + half);
    clipped(ctx, C, function () {
      ctx.strokeStyle = o.color;
      ctx.lineWidth = (o.width || 2) * dpr;
      setStyle(ctx, o.style || 'solid', dpr);
      ctx.beginPath();
      ctx.moveTo(C.xC(xa), C.yC(y0 + slope * (xa - x0)));
      ctx.lineTo(C.xC(xb), C.yC(y0 + slope * (xb - x0)));
      ctx.stroke();
      clearStyle(ctx);
    });
    if (o.label) {
      tag(ctx, {
        ctx, x: C.xC(xb), y: C.yC(y0 + slope * (xb - x0)) - 12 * dpr,
        text: o.label, color: o.color, align: 'right',
        dpr, fs: o.fs, size: o.size || 10.5
      });
    }
  }

  /* ── Point marker ───────────────────────────────────────────────────────
     A filled dot with a contrasting ring so it stays visible on top of any
     curve. `shape` gives a non-colour cue when two markers share a panel.  */

  function marker(ctx, C, x, y, o) {
    const dpr = C.dpr;
    const r = (o.r || 5) * dpr;
    clipped(ctx, C, function () {
      clearStyle(ctx);
      ctx.globalAlpha = o.ghost ? 0.55 : 1;
      const px = C.xC(x), py = C.yC(y);
      if (o.shape === 'square') {
        ctx.fillStyle = o.color;
        ctx.fillRect(px - r, py - r, r * 2, r * 2);
        ctx.strokeStyle = o.ring || '#fff'; ctx.lineWidth = 2 * dpr;
        ctx.strokeRect(px - r, py - r, r * 2, r * 2);
      } else if (o.shape === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(px, py - r * 1.25); ctx.lineTo(px + r * 1.25, py);
        ctx.lineTo(px, py + r * 1.25); ctx.lineTo(px - r * 1.25, py);
        ctx.closePath();
        ctx.fillStyle = o.color; ctx.fill();
        ctx.strokeStyle = o.ring || '#fff'; ctx.lineWidth = 2 * dpr; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = o.color; ctx.fill();
        ctx.strokeStyle = o.ring || '#fff'; ctx.lineWidth = 2 * dpr; ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });
    if (o.label) {
      tag(ctx, {
        ctx, x: C.xC(x) + (o.labelDx || 8) * dpr, y: C.yC(y) + (o.labelDy || -12) * dpr,
        text: o.label, color: o.labelColor || o.color, align: o.labelAlign || 'left',
        dpr, fs: o.fs, size: o.size || 10.5
      });
    }
  }

  /* ── Directional arrow along the x axis, with a text label ──────────────
     Reproduces the Δk̂ > 0 / Δk̂ < 0 annotation on p. 8 of the lecture notes.
     Drawn just above the axis inside the plot area. The arrowhead gives the
     direction and the label states it in words, so neither depends on colour.

     opts: {color, label, y (model units, height above axis), fs}          */

  function axisArrow(ctx, C, xFrom, xTo, o) {
    const dpr = C.dpr;
    const y = o.y !== undefined ? C.yC(o.y) : C.H - C.p.b - 18 * dpr;
    const a = C.xC(xFrom), b = C.xC(xTo);
    const head = 7 * dpr;
    clipped(ctx, C, function () {
      clearStyle(ctx);
      ctx.strokeStyle = o.color; ctx.fillStyle = o.color;
      ctx.lineWidth = (o.width || 2) * dpr;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a, y); ctx.lineTo(b, y); ctx.stroke();
      const dir = b >= a ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(b, y);
      ctx.lineTo(b - dir * head, y - head * 0.62);
      ctx.lineTo(b - dir * head, y + head * 0.62);
      ctx.closePath(); ctx.fill();
    });
    if (o.label) {
      tag(ctx, {
        ctx, x: (a + b) / 2, y: y - 17 * dpr, text: o.label,
        color: o.color, align: 'center', dpr, fs: o.fs, size: o.size || 10.5
      });
    }
  }

  /* ── Convenience: draw a whole set of curves as ghosts ──────────────────
     Used by the pin/compare toggle. The lecture notes teach savings and
     population shocks as shift diagrams (p. 12 and p. 18) — sf(k) beside
     s′f(k), (δ+n₁)k beside (δ+n₂)k. That is impossible if moving a slider
     erases the old curve, so a pinned snapshot redraws it underneath.

     specs: [{fn, color, style, label}]                                     */

  function ghostCurves(ctx, C, specs, o) {
    const taken = o.taken || [];
    specs.forEach(spec => {
      curve(ctx, C, spec.fn, {
        color: spec.color, style: spec.style, width: spec.width || 2,
        ghost: true
      });
      if (spec.label) {
        ctx.save(); ctx.globalAlpha = 0.75;
        curveLabel(ctx, C, spec.fn, {
          text: spec.label, color: spec.color, fs: o.fs, taken,
          size: 10, bg: 'rgba(255,255,255,.8)'
        });
        ctx.restore();
      }
    });
  }

  /* ── Empty-state message inside the plot rectangle ──────────────────── */

  function message(ctx, C, lines, o) {
    const dpr = C.dpr, fs = o.fs;
    ctx.save();
    ctx.fillStyle = o.color;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lh = 18 * dpr * fs;
    const y0 = C.p.t + C.PH / 2 - (lines.length - 1) * lh / 2;
    lines.forEach((ln, i) => {
      ctx.font = `${i === 0 ? 700 : 400} ${Math.round((i === 0 ? 13 : 11.5) * dpr * fs)}px "Inter",sans-serif`;
      ctx.fillText(ln, C.p.l + C.PW / 2, y0 + i * lh);
    });
    ctx.restore();
  }

  global.SolowPlot = {
    setupCanvas, fontScale, makeCoords, makeCoordsRange, firstTick, niceStep, PAD,
    axes, curve, series, curveLabel, dropLine, hGuide, hLine,
    band, tangent, marker, axisArrow, ghostCurves, message,
    clipped, tag, chip, setStyle, clearStyle, fmt, DASH
  };

})(window);
