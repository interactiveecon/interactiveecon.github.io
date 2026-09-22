/* ============================================================================
   unit-11.js — ECON 002, Unit 11: Aggregate Supply and Aggregate Demand
   Shared figure module. SINGLE SOURCE OF TRUTH for every dynamic figure in
   this unit.

   Consumed by BOTH:
     classes/econ002/notes/unit-11/index.html   (mode 'notes')
     classes/econ002/notes/unit-11/deck.html    (mode 'stage')

   No pre-rendered charts here. The source draws thirteen diagrams and every
   one of them is the SAME picture — LRAS, SRAS, AD — with one or two curves
   moved, so all thirteen figures come out of a single builder that takes a
   list of moves.

   RULE: figure geometry, data, equations, drawing code and animation logic
   live here and NOWHERE else. Neither HTML file may contain any of it.
   Presentation constants that legitimately differ between the study page and
   the projector live in THEME.notes / THEME.stage below — not in the pages.

   See assets/figures/README.md for the full contract.
   ========================================================================== */

(function (global) {
'use strict';

/* ══ THEME ═════════════════════════════════════════════════════════════════
   The ONLY thing allowed to differ between the notes page and the deck.
   Colours, stroke weights, dot radii, font sizes, padding.

   notes — CLAUDE.md tokens verbatim, verified WCAG AA on white/paper.
   stage — dark-on-light projection palette on a soft off-white ground.
           Light text on a dark ground haloes badly for readers with
           astigmatism, so the deck is NOT dark-mode; #FBFAF7 is used rather
           than pure white to keep projector glare down. Every stage ink
           colour clears 7:1 against that ground; gridlines clear 3:1.
           Measured ratios are noted beside each colour.
   ════════════════════════════════════════════════════════════════════════ */

var THEME = {

  notes: {
    bg:      '#ffffff',
    ink:     '#1f2937',   /* 13.9:1 on #fff */
    ink2:    '#374151',   /* 10.3:1 */
    muted:   '#596878',   /*  5.9:1 */
    grid:    '#d9cfbf',
    axis:    '#374151',
    blue:    '#2f5d7c',   /*  6.4:1  --accent */
    red:     '#b42318',   /*  6.2:1  --bad    */
    green:   '#155c38',   /*  7.7:1  --good   */
    gold:    '#8c4800',   /*  6.9:1  — the shifted curve */
    shade:   'rgba(180,35,24,0.10)',
    family:  '"Inter",ui-sans-serif,system-ui,-apple-system,sans-serif',
    lw:      { series: 2.4, axis: 1.4, guide: 1.4, annot: 2.2 },
    dot:     3.2,
    font:    { tick: 11, label: 12, title: 12, legend: 11, annot: 11.5 },
    pad:     { l: 52, r: 16, t: 16, b: 48 },
    panelGap: 22,
    fontScale: 1,
    refWidth: 0            /* 0 = font size does not track canvas width */
  },

  stage: {
    bg:      '#FBFAF7',
    ink:     '#14243A',   /* 15.0:1 on bg */
    ink2:    '#2B3A4A',   /* 11.1:1 */
    muted:   '#44515F',   /*  7.8:1 */
    grid:    '#828B95',   /*  3.3:1 — gridline floor is 3:1 */
    axis:    '#2B3A4A',
    blue:    '#1F4E79',   /*  8.3:1 */
    red:     '#96231A',   /*  7.9:1 */
    green:   '#155c38',   /*  7.7:1 */
    gold:    '#7A3E00',   /*  8.0:1  — the shifted curve */
    shade:   'rgba(150,35,26,0.10)',
    family:  '"Inter",ui-sans-serif,system-ui,-apple-system,sans-serif',
    lw:      { series: 5.0, axis: 2.4, guide: 2.6, annot: 4.0 },
    dot:     7.0,
    /* Tick labels hold the 28px legibility floor. Everything else is chrome
       and was making the plot itself too small — legends and readouts at
       30px were the size of the data they described. */
    font:    { tick: 28, label: 28, title: 32, legend: 25, annot: 27 },
    pad:     { l: 112, r: 34, t: 14, b: 84 },
    panelGap: 46,
    fontScale: 1,
    refWidth: 1150         /* fonts scale with canvas width, 1:1 at 1150 CSS px
                              → 28 CSS px ticks on a 1280×720 projector */
  }
};

/* ══ SHARED CANVAS HELPERS (CLAUDE.md patterns) ═══════════════════════════ */

function setupCanvas(canvas){
  var dpr  = global.devicePixelRatio || 1;
  var rect = canvas.getBoundingClientRect();
  var W = Math.round(rect.width  * dpr);
  var H = Math.round(rect.height * dpr);
  if(!W || !H) return null;
  if(canvas.width !== W || canvas.height !== H){ canvas.width = W; canvas.height = H; }
  return { ctx: canvas.getContext('2d'), dpr: dpr, W: W, H: H,
           cssW: rect.width, cssH: rect.height };
}

function tickStep(mx){
  if(mx<=10) return 1; if(mx<=20) return 2; if(mx<=50) return 5;
  if(mx<=100) return 10; if(mx<=200) return 20; if(mx<=500) return 50;
  return 100;
}

function snapUp(raw){
  var s=[5,8,10,12,15,20,25,30,40,50,60,80,100,120,
         150,200,250,300,400,500,600,800,1000];
  var i; for(i=0;i<s.length;i++){ if(s[i]>=raw) return s[i]; }
  return Math.ceil(raw/100)*100;
}

function clamp(v,a,b){ return v<a?a:(v>b?b:v); }

/* Cosine ease — CLAUDE.md animation convention */
function ease(p){ return 0.5 - 0.5*Math.cos(Math.PI*clamp(p,0,1)); }

var DURATION = 2600;   /* ms, full sweep */

function reducedMotion(){
  try { return global.matchMedia &&
               global.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch(e){ return false; }
}

/* User font-size preference → canvas font scale (WCAG 1.4.4).
   Recomputed at the start of EVERY draw, in BOTH modes. In stage mode it is
   additionally multiplied by THEME.stage.fontScale and by the canvas width
   ratio, so projector type stays at its 28 CSS px floor at any resolution. */
function fontScale(mode, cssW){
  var T = THEME[mode], root = 16, f;
  try { root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16; }
  catch(e){ root = 16; }
  f = Math.max(0.75, Math.min(2.5, root/16));
  f *= (T.fontScale || 1);
  if(T.refWidth) f *= Math.max(0.55, Math.min(2.4, cssW / T.refWidth));
  return f;
}

function fnt(T,fs,dpr,key,weight){
  return (weight||'700') + ' ' + Math.round(T.font[key]*fs*dpr) + 'px ' + T.family;
}

/* ══ LAYOUT ═══════════════════════════════════════════════════════════════
   Both HTML files ask the module how tall to make the canvas, so the pages
   never contain geometry. Two-panel figures stack below 560 CSS px so the
   notes page stays readable at a 320 px viewport.                        */

function layout(fig, cssW){
  var narrow = (cssW < 560);
  return { stacked: narrow && fig.panels > 1,
           aspect:  narrow ? fig.aspectStacked : fig.aspect };
}

function panelBoxes(W,H,dpr,n,stacked,gapCss){
  var gap = gapCss*dpr, w, h;
  if(n === 1) return [{x:0,y:0,w:W,h:H}];
  if(stacked){ h = (H-gap)/2; return [{x:0,y:0,w:W,h:h},{x:0,y:h+gap,w:W,h:h}]; }
  w = (W-gap)/2;             return [{x:0,y:0,w:w,h:H},{x:w+gap,y:0,w:w,h:H}];
}

/* ── Axis frame ───────────────────────────────────────────────────────────
   Paints title, gridlines, axes, ticks and axis labels for one panel and
   returns the coordinate mapping. Tick LABELS that would collide at the
   current font size are dropped (the tick mark stays) — on the projector
   this is what keeps 28 px type legible without shrinking it.            */

function paintFrame(ctx, box, cfg, T, fs, dpr){
  var pad = { l:0, r:T.pad.r*fs*dpr, t:T.pad.t*fs*dpr, b:T.pad.b*fs*dpr };
  var titleH = cfg.title ? Math.round(T.font.title*fs*dpr*1.55) : 0;
  var i;

  /* Measure the left margin instead of assuming it: the widest tick label,
     plus room for the rotated axis label if one will fit there. */
  ctx.save();
  ctx.font = fnt(T,fs,dpr,'tick','600');
  /* Several of this unit's axes are labelled with names rather than numbers
     (Y₁, P₂, Ȳ), so tick text goes through an optional formatter. */
  var xTx = cfg.xtickText || function(v){ return String(v); };
  var yTx = cfg.ytickText || function(v){ return String(v); };
  var maxTickW = 0;
  if(cfg.yticks) for(i=0;i<cfg.yticks.length;i++){
    maxTickW = Math.max(maxTickW, ctx.measureText(yTx(cfg.yticks[i])).width);
  }
  ctx.font = fnt(T,fs,dpr,'label','700');
  var yLabelW = cfg.ylabel ? ctx.measureText(cfg.ylabel).width : 0;
  ctx.restore();

  /* A band above the plot for the legend and the live readout. Keeping them
     out of the plot is what stops them landing on the curves. */
  var headLines = cfg.headLines || 0;
  var headH = headLines ? (T.font.legend*fs*dpr*1.55*headLines + 6*fs*dpr) : 0;

  if(cfg.title){
    ctx.fillStyle = T.ink;
    ctx.font = fnt(T,fs,dpr,'title','700');
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(cfg.title, box.x + box.w/2, box.y + Math.round(T.font.title*fs*dpr*0.35),
                 box.w - 8*fs*dpr);
  }

  /* A rotated y-axis label needs the plot to be taller than the label is
     long. It may shrink to 0.78 of its size to manage that — axis labels are
     descriptive prose, not data, so a little smaller is better than flipping
     them horizontal and eating the plot's height. Only if it still will not
     fit does it move above the plot. */
  var yHoriz = false, yLabScale = 1;
  var availH = box.h - titleH - headH - pad.t - pad.b;
  if(cfg.ylabel){
    if(cfg.yHoriz === true){ yHoriz = true; }
    else if(yLabelW > availH*0.98){
      if(yLabelW*0.78 <= availH*0.98) yLabScale = Math.max(0.78, (availH*0.96)/yLabelW);
      else yHoriz = true;
    }
  }
  pad.l = maxTickW + 14*fs*dpr +
          (cfg.ylabel && !yHoriz ? T.font.label*fs*dpr*yLabScale*1.9 : 0);
  /* A horizontal y-label gets its own strip between the title and the head
     band, so the two never share a line. */
  var yLabH = yHoriz ? Math.round(T.font.label*fs*dpr*1.6) : 0;

  /* ── Which x tick labels go on a second row ──────────────────────────
     This unit's two-panel figures put three named outputs — Y₂, Y₁, Y₃ —
     one axis unit apart on a half-width panel, and at 28 px they collide.
     Dropping the middle one, which is what the plain rule did, deletes Y₁
     from exactly the figure that is about Y₁, so a colliding label drops to
     a second row instead. Deciding it HERE rather than at drawing time is
     what lets the bottom margin grow to make room: horizontal positions
     depend only on the left margin, which is already known. */
  var xRow = [], needsRow2 = false, tickRowH = T.font.tick*fs*dpr*1.15;
  if(cfg.xticks){
    ctx.save();
    ctx.font = fnt(T,fs,dpr,'tick','600');
    var pwGuess = box.w - pad.l - pad.r;
    var pxGuess = box.x + pad.l;
    var minGapX = T.font.tick*fs*dpr*0.6;
    var rowEnd = [-1e9, -1e9], rr, xx, lbl, lblW;
    for(i=0;i<cfg.xticks.length;i++){
      lbl = xTx(cfg.xticks[i]);
      xRow[i] = -1;
      if(!lbl) continue;
      lblW = ctx.measureText(lbl).width;
      xx = pxGuess + (cfg.xticks[i]-cfg.xmin)/(cfg.xmax-cfg.xmin)*pwGuess;
      for(rr=0;rr<2;rr++){
        if(xx - lblW/2 - rowEnd[rr] < minGapX) continue;
        xRow[i] = rr; rowEnd[rr] = xx + lblW/2;
        if(rr === 1) needsRow2 = true;
        break;
      }
    }
    ctx.restore();
  }
  if(needsRow2) pad.b += tickRowH;

  var px = box.x + pad.l,
      py = box.y + titleH + yLabH + headH + pad.t,
      pw = box.w - pad.l - pad.r,
      ph = box.h - titleH - yLabH - headH - pad.t - pad.b;
  if(pw < 10 || ph < 10){ pw = Math.max(10,pw); ph = Math.max(10,ph); }

  var xmin=cfg.xmin, xmax=cfg.xmax, ymin=cfg.ymin, ymax=cfg.ymax;
  var C = {
    X: function(v){ return px + (v-xmin)/(xmax-xmin)*pw; },
    Y: function(v){ return py + ph - (v-ymin)/(ymax-ymin)*ph; },
    px:px, py:py, pw:pw, ph:ph, cfg:cfg,
    boxY: box.y, boxH: box.h, padB: pad.b,
    /* the free band above the plot, for legends and readouts */
    headY: box.y + titleH + yLabH, headH: headH
  };

  /* gridlines */
  ctx.save();
  ctx.strokeStyle = T.grid;
  ctx.lineWidth = Math.max(1, T.lw.axis*dpr*0.7);
  ctx.setLineDash([3*dpr, 4*dpr]);
  var v;
  if(cfg.xticks) for(i=0;i<cfg.xticks.length;i++){
    v = cfg.xticks[i]; if(v<=xmin) continue;
    ctx.beginPath(); ctx.moveTo(C.X(v), py); ctx.lineTo(C.X(v), py+ph); ctx.stroke();
  }
  if(cfg.yticks) for(i=0;i<cfg.yticks.length;i++){
    v = cfg.yticks[i]; if(v<=ymin) continue;
    ctx.beginPath(); ctx.moveTo(px, C.Y(v)); ctx.lineTo(px+pw, C.Y(v)); ctx.stroke();
  }
  ctx.restore();

  /* axis lines (left + bottom, matching pgfplots `axis lines=left`) */
  ctx.strokeStyle = T.axis;
  ctx.lineWidth = T.lw.axis*dpr;
  ctx.beginPath();
  ctx.moveTo(px, py); ctx.lineTo(px, py+ph); ctx.lineTo(px+pw, py+ph);
  ctx.stroke();

  /* ticks + labels, with collision suppression */
  ctx.fillStyle = T.ink2;
  ctx.font = fnt(T,fs,dpr,'tick','600');
  var tickLen = 5*fs*dpr, minGap, last, tx, ty;

  if(cfg.xticks){
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    /* Measured, not assumed: a fixed multiple of the font size dropped
       narrow labels like Y₂ that had plenty of room, while leaving wide
       ones touching. The tick mark is always drawn; only the text is
       subject to the test. Which row each label lands on was settled
       above, before the bottom margin was fixed. */
    for(i=0;i<cfg.xticks.length;i++){
      v = cfg.xticks[i]; tx = C.X(v);
      ctx.strokeStyle = T.axis; ctx.lineWidth = T.lw.axis*dpr;
      ctx.beginPath(); ctx.moveTo(tx, py+ph); ctx.lineTo(tx, py+ph+tickLen); ctx.stroke();
      if(xRow[i] < 0) continue;   /* no room on either row */
      ctx.fillText(xTx(v), tx, py+ph+tickLen+2*fs*dpr + xRow[i]*tickRowH);
    }
  }
  if(cfg.yticks){
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    minGap = T.font.tick*fs*dpr*0.90; last = 1e9;
    for(i=0;i<cfg.yticks.length;i++){
      v = cfg.yticks[i]; ty = C.Y(v);
      ctx.strokeStyle = T.axis; ctx.lineWidth = T.lw.axis*dpr;
      ctx.beginPath(); ctx.moveTo(px-tickLen, ty); ctx.lineTo(px, ty); ctx.stroke();
      if(last - ty >= minGap){
        ctx.fillText(yTx(v), px-tickLen-3*fs*dpr, ty);
        last = ty;
      }
    }
  }

  /* axis labels */
  ctx.fillStyle = T.ink2;
  ctx.font = fnt(T,fs,dpr,'label','700');
  if(cfg.xlabel){
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText(cfg.xlabel, px+pw/2, box.y+box.h - 4*fs*dpr);
  }
  if(cfg.ylabel && yHoriz){
    ctx.textAlign='left'; ctx.textBaseline='bottom';
    ctx.fillText(cfg.ylabel, px, box.y + titleH + yLabH - Math.round(T.font.label*fs*dpr*0.35),
                 box.w - pad.l - pad.r);
  } else if(cfg.ylabel){
    ctx.save();
    ctx.font = (700) + ' ' + Math.round(T.font.label*fs*dpr*yLabScale) + 'px ' + T.family;
    ctx.translate(box.x + Math.round(T.font.label*fs*dpr*yLabScale*1.05), py+ph/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText(cfg.ylabel, 0, 0);
    ctx.restore();
  }
  return C;
}

/* A legend laid out in a row, drawn in the band ABOVE the plot rather than
   floating over the data. */
function legendRow(ctx, entries, T, fs, dpr, x0, x1, y){
  var sw, gap, pad, i, w, widths, scale = 1, tries = 0;
  ctx.save();
  /* Three panels across a slide leave a legend about a third of the width
     it would have had on its own. Rather than run off the end of the panel,
     the row shrinks until it fits — down to three quarters, below which the
     labels themselves are the thing to shorten. */
  do {
    sw = 22*fs*dpr*scale; gap = 7*fs*dpr*scale; pad = 18*fs*dpr*scale;
    ctx.font = (700) + ' ' + Math.round(T.font.legend*fs*dpr*scale) + 'px ' + T.family;
    w = 0; widths = [];
    for(i=0;i<entries.length;i++){
      widths[i] = sw + gap + ctx.measureText(entries[i].label).width;
      w += widths[i] + (i ? pad : 0);
    }
    if(w <= (x1 - x0) || scale <= 0.75) break;
    scale = Math.max(0.75, scale * (x1 - x0) / w);
  } while(++tries < 4);
  var x = x0 + Math.max(0, ((x1-x0) - w)/2);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  for(i=0;i<entries.length;i++){
    var e = entries[i];
    ctx.strokeStyle = e.color; ctx.lineWidth = T.lw.series*dpr;
    ctx.setLineDash(e.dash || []);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x+sw, y); ctx.stroke();
    ctx.setLineDash([]);
    if(e.shape){ ctx.fillStyle = e.color; marker1(ctx, x+sw/2, y, T.dot*dpr, e.shape); }
    ctx.fillStyle = T.ink;
    ctx.fillText(e.label, x + sw + gap, y);
    x += widths[i] + pad;
  }
  ctx.restore();
}

/* A one-line readout, also in the band above the plot. */
function headNote(ctx, C, text, color, T, fs, dpr, line){
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = fnt(T,fs,dpr,'annot','700');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, C.px + C.pw/2,
               C.headY + T.font.legend*fs*dpr*1.55*((line||0)+0.5) + 3*fs*dpr,
               C.pw);
  ctx.restore();
}

/* One y-label orientation decision for a whole multi-panel figure: if the
   longest label will not fit rotated in any panel, none of them rotate. */
function yLabelHoriz(ctx, box, T, fs, dpr, labels, hasTitle, headLines){
  var titleH = hasTitle ? Math.round(T.font.title*fs*dpr*1.55) : 0;
  var headH  = headLines ? (T.font.legend*fs*dpr*1.55*headLines + 6*fs*dpr) : 0;
  var avail  = box.h - titleH - headH - T.pad.t*fs*dpr - T.pad.b*fs*dpr;
  var i, w = 0;
  ctx.save();
  ctx.font = fnt(T,fs,dpr,'label','700');
  for(i=0;i<labels.length;i++) w = Math.max(w, ctx.measureText(labels[i]).width);
  ctx.restore();
  /* only give up on rotating if it will not fit even shrunk */
  return w*0.78 > avail*0.98;
}

/* ── Clip helper — every curve/annotation draw goes through this ────────── */
function clipped(ctx, C, fn){
  ctx.save();
  ctx.beginPath();
  ctx.rect(C.px, C.py, C.pw, C.ph);
  ctx.clip();
  fn();
  ctx.restore();
}

/* Annotation text with a background chip. Measure labels land wherever the
   data puts them — on top of a curve, a gridline or another label — so they
   carry their own background rather than relying on empty space. */
function chipRect(ctx, x, y, w, h, r){
  r = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
}

function chipText(ctx, text, x, y, align, baseline, color, T, fs, dpr, fontKey){
  ctx.save();
  ctx.font = fnt(T, fs, dpr, fontKey || 'annot', '700');
  var w = ctx.measureText(text).width;
  var h = T.font[fontKey || 'annot']*fs*dpr;
  var px = 7*fs*dpr, py = 4*fs*dpr;
  var bx = align === 'right' ? (x - w) : (align === 'center' ? (x - w/2) : x);
  var by = baseline === 'bottom' ? (y - h) : (baseline === 'middle' ? (y - h/2) : y);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = T.bg;
  chipRect(ctx, bx - px, by - py, w + px*2, h + py*2, 5*fs*dpr);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.textAlign = align === 'center' ? 'center' : (align === 'right' ? 'right' : 'left');
  ctx.textBaseline = baseline || 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/* ── Series drawing ──────────────────────────────────────────────────────
   Colour is never the only signal: blue series carry round markers, red
   series carry square markers (WCAG 1.4.1).                             */

function polyline(ctx, C, pts, color, lw, dash){
  var i;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if(dash) ctx.setLineDash(dash);
  ctx.beginPath();
  for(i=0;i<pts.length;i++){
    if(i===0) ctx.moveTo(C.X(pts[i][0]), C.Y(pts[i][1]));
    else      ctx.lineTo(C.X(pts[i][0]), C.Y(pts[i][1]));
  }
  ctx.stroke();
  ctx.restore();
}

function marker1(ctx, x, y, r, shape){
  if(shape === 'square'){ ctx.fillRect(x-r, y-r, 2*r, 2*r); return; }
  if(shape === 'diamond'){
    var d = r*1.32;
    ctx.beginPath();
    ctx.moveTo(x, y-d); ctx.lineTo(x+d, y); ctx.lineTo(x, y+d); ctx.lineTo(x-d, y);
    ctx.closePath(); ctx.fill(); return;
  }
  ctx.beginPath(); ctx.arc(x, y, r, 0, 2*Math.PI); ctx.fill();
}

function markers(ctx, C, pts, color, r, shape){
  var i;
  ctx.save();
  ctx.fillStyle = color;
  for(i=0;i<pts.length;i++) marker1(ctx, C.X(pts[i][0]), C.Y(pts[i][1]), r, shape);
  ctx.restore();
}

function arrowHead(ctx, x, y, dir, size, color){
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size*0.55, y + dir*size);
  ctx.lineTo(x + size*0.55, y + dir*size);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* Double-headed vertical measure with a text readout. */
function vMeasure(ctx, C, x, y0, y1, color, T, fs, dpr, label, side){
  var X = C.X(x), Ya = C.Y(y0), Yb = C.Y(y1);
  var head = Math.max(5, T.lw.annot*dpr*1.9);
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = T.lw.annot*dpr;
  ctx.beginPath(); ctx.moveTo(X, Ya); ctx.lineTo(X, Yb); ctx.stroke();
  ctx.restore();
  if(Math.abs(Ya-Yb) > head*2.2){
    arrowHead(ctx, X, Yb, (Yb<Ya?1:-1), head, color);
    arrowHead(ctx, X, Ya, (Ya<Yb?1:-1), head, color);
  }
  if(label){
    ctx.save();
    ctx.font = fnt(T,fs,dpr,'annot','700');
    /* `side` is a hint; flip it if the readout would run off the plot area,
       since every annotation is drawn inside a clip rect. */
    /* Far enough out to clear the arrowheads at each end of the bar: at
       projection sizes a flat 10px put the chip on top of them. */
    var pad = Math.max(12*fs*dpr, head*1.7), tw = ctx.measureText(label).width;
    if(side !== 'left' && X + pad + tw > C.px + C.pw) side = 'left';
    else if(side === 'left' && X - pad - tw < C.px)   side = 'right';
    ctx.restore();
    chipText(ctx, label, X + (side==='left' ? -pad : pad), (Ya+Yb)/2,
             side==='left' ? 'right' : 'left', 'middle', color, T, fs, dpr);
  }
}


function paintBg(ctx, W, H, T){
  ctx.save();
  ctx.fillStyle = T.bg;
  ctx.fillRect(0,0,W,H);
  ctx.restore();
}

/* Below-axis caption text (the "Optimum" / "MB = MC" nodes in the LaTeX) */
function axisNote(ctx, C, x, text, color, T, fs, dpr){
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = fnt(T,fs,dpr,'annot','700');
  ctx.textAlign = 'center';

  /* Below the axis where the printed figure puts it, if the tick labels and
     the axis label leave room. At projection type sizes they do not, so the
     note moves just inside the plot instead of colliding with them. */
  var lh   = T.font.annot*fs*dpr;
  var top  = C.py + C.ph + Math.round(T.font.tick*fs*dpr*1.9);
  var xlab = C.boxY + C.boxH - 4*fs*dpr - T.font.label*fs*dpr*1.15;

  if(top + lh <= xlab){
    ctx.textBaseline = 'top';
    ctx.fillText(text, C.X(x), top);
  } else {
    var w = ctx.measureText(text).width, cx = C.X(x);
    var by = C.py + C.ph - 5*fs*dpr;
    cx = Math.min(Math.max(cx, C.px + w/2 + 2), C.px + C.pw - w/2 - 2);
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = T.bg;
    ctx.fillRect(cx - w/2 - 5*fs*dpr, by - lh*1.15, w + 10*fs*dpr, lh*1.3);
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.textBaseline = 'bottom';
    ctx.fillText(text, cx, by);
  }
  ctx.restore();
}


/* A straight line, P as a function of Q — kept because several of this
   unit's curves (SRAS, LRAS) are straight. */
function line(a, b){ return { a:a, b:b, at:function(q){ return a + b*q; },
                              q:function(p){ return (p - a)/b; } }; }

/* ── Small shared helpers ─────────────────────────────────────────────── */

function money(v){
  var r = Math.round(v*100)/100;
  return '$' + (r % 1 === 0 ? r.toFixed(0) : r.toFixed(2));
}
function num(v){ return String(Math.round(v*100)/100); }

/* Sample a linear curve across the plot, clipped to the axis box. */
function linePts(ln, ax, qFrom, qTo){
  var q0 = (qFrom === undefined) ? ax.xmin : qFrom;
  var q1 = (qTo   === undefined) ? ax.xmax : qTo;
  return [[q0, ln.at(q0)], [q1, ln.at(q1)]];
}

/* Where a line leaves the plot box, so a curve never runs past the axes. */
function clipLine(ln, ax){
  var qs = [ax.xmin, ax.xmax];
  if(ln.b !== 0){
    var qTop = ln.q(ax.ymax), qBot = ln.q(ax.ymin);
    qs.push(qTop, qBot);
  }
  var lo = ax.xmin, hi = ax.xmax, i, q, p, inRange = [];
  for(i=0;i<qs.length;i++){
    q = qs[i];
    if(q < lo - 1e-9 || q > hi + 1e-9) continue;
    p = ln.at(q);
    if(p < ax.ymin - 1e-9 || p > ax.ymax + 1e-9) continue;
    inRange.push(q);
  }
  if(inRange.length < 2) return [lo, hi];
  inRange.sort(function(a,b){ return a-b; });
  return [inRange[0], inRange[inRange.length-1]];
}

function drawLine(ctx, C, ln, ax, color, T, dpr, dash){
  var r = clipLine(ln, ax);
  polyline(ctx, C, linePts(ln, ax, r[0], r[1]), color, T.lw.series*dpr, dash);
}

/* The curve's own name (D, S, D′ …) parked at its right-hand end. */
function curveTag(ctx, C, ln, ax, text, color, T, fs, dpr){
  var r = clipLine(ln, ax), q = r[1], p = ln.at(q);
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = fnt(T,fs,dpr,'annot','700');
  ctx.textBaseline = 'middle';
  var w = ctx.measureText(text).width, gap = 8*fs*dpr;
  if(C.X(q) + gap + w > C.px + C.pw){ ctx.textAlign = 'right'; gap = -gap; }
  else ctx.textAlign = 'left';
  ctx.fillText(text, C.X(q) + gap, C.Y(p));
  ctx.restore();
}

/* Schedule point with its letter, placed the way the source places it. */
function labelledPoint(ctx, C, q, p, text, color, shape, T, fs, dpr, anchor, big){
  var x = C.X(q), y = C.Y(p), r = T.dot*dpr*(big ? 1.7 : 1);
  ctx.save();
  ctx.fillStyle = color;
  marker1(ctx, x, y, r, shape);
  if(big){
    ctx.strokeStyle = color; ctx.lineWidth = T.lw.annot*dpr*0.7;
    ctx.beginPath(); ctx.arc(x, y, r*2.1, 0, 2*Math.PI); ctx.stroke();
  }
  if(text){
    /* The offset is measured from the OUTER edge — a settled point carries an
       emphasis ring of 2.1 r, and a label placed off the dot alone landed
       inside it. The two components are equal so the diagonal clears the ring
       rather than cutting the corner off it. */
    var off = (big ? r*2.1 : r) + 6*fs*dpr, d = off*0.72;
    ctx.font = fnt(T,fs,dpr,'annot','700');
    if(anchor === 'se'){ ctx.textAlign='left';  ctx.textBaseline='top';    ctx.fillText(text, x+d, y+d); }
    else if(anchor === 'nw'){ ctx.textAlign='right'; ctx.textBaseline='bottom'; ctx.fillText(text, x-d, y-d); }
    else { ctx.textAlign='left'; ctx.textBaseline='bottom'; ctx.fillText(text, x+d, y-d); }
  }
  ctx.restore();
}

/* A horizontal arrow in data coordinates, used to show WHICH WAY a curve
   moved. A parallel shift is the same family of lines whether you think of it
   as sliding sideways or up, so without these the eye reads every shift as
   vertical. The arrow is what makes "right" and "left" legible. */
function hArrow(ctx, C, p, qFrom, qTo, color, T, fs, dpr){
  /* Returns whether it actually drew: on a narrow screen the gap between two
     curves can be shorter than a legible arrow, and a caption left hanging
     where no arrow appeared is worse than no caption. */
  if(Math.abs(qTo - qFrom) < 0.12) return false;
  var x0 = C.X(qFrom), x1 = C.X(qTo), y = C.Y(p);
  var dir = (x1 > x0) ? 1 : -1;
  var head = Math.max(9, T.lw.annot*dpr*3.2);
  /* Stand off both curves. An arrow that touches the line it leaves and the
     line it arrives at reads as part of them; a clear gap at each end makes
     it a separate object with a direction. */
  /* Stand off both ends. The gap has to clear the emphasis ring drawn round
     a settled point, which is a multiple of the dot radius — at projection
     sizes a flat 17px gap put the arrowhead inside the ring. */
  var gap = Math.max(17*fs*dpr, T.dot*dpr*4.2);
  if(Math.abs(x1-x0) < gap*2 + head*2.2) return false;   /* too short to be worth drawing */
  x0 += dir*gap; x1 -= dir*gap;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = T.lw.annot*dpr*0.8;
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1 - dir*head*0.7, y); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x1 - dir*head, y - head*0.55);
  ctx.lineTo(x1 - dir*head, y + head*0.55);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  return true;
}

/* Dashed drop-lines from a point to both axes. */
function guides(ctx, C, ax, q, p, color, T, dpr, alpha){
  ctx.save();
  if(alpha !== undefined) ctx.globalAlpha = alpha;
  polyline(ctx, C, [[ax.xmin,p],[q,p]], color, T.lw.guide*dpr, [6*dpr,5*dpr]);
  polyline(ctx, C, [[q,p],[q,ax.ymin]], color, T.lw.guide*dpr, [6*dpr,5*dpr]);
  ctx.restore();
}

/* One axis box. Ticks are sorted before they are drawn: the collision rule
   walks the list in order and drops any label too close to the last one it
   kept, so an axis declared in story order rather than ascending order used
   to lose labels for no visible reason. */
function sorted(a){ return a ? a.slice().sort(function(x,y){ return x-y; }) : a; }

function frame(ctx, box, ax, T, fs, dpr, headLines, title){
  return paintFrame(ctx, box, {
    title: title || '', xlabel:ax.xlabel, ylabel:ax.ylabel,
    xmin:ax.xmin, xmax:ax.xmax, ymin:ax.ymin, ymax:ax.ymax,
    xticks:sorted(ax.xticks), yticks:sorted(ax.yticks),
    xtickText:ax.xtickText, ytickText:ax.ytickText,
    headLines: (headLines === undefined ? 1 : headLines)
  }, T, fs, dpr);
}

function begin(canvas, mode){
  var S = setupCanvas(canvas); if(!S) return null;
  var T = THEME[mode];
  S.T = T; S.fs = fontScale(mode, S.cssW);
  S.box = panelBoxes(S.W, S.H, S.dpr, 1, false, T.panelGap)[0];
  paintBg(S.ctx, S.W, S.H, T);
  return S;
}

/* Two panels side by side, or stacked on a narrow screen. The total-product
   and marginal-product pictures are two views of one fact, so they are one
   figure that steps together rather than two figures to keep in sync. */
function begin2(canvas, mode, stacked){
  var S = setupCanvas(canvas); if(!S) return null;
  var T = THEME[mode];
  S.T = T; S.fs = fontScale(mode, S.cssW);
  S.boxes = panelBoxes(S.W, S.H, S.dpr, 2, stacked, T.panelGap);
  paintBg(S.ctx, S.W, S.H, T);
  return S;
}

/* A smooth curve sampled from a function of x. */
function fnPts(f, x0, x1, n){
  var pts = [], i;
  n = n || 120;
  for(i=0;i<=n;i++){ var x = x0 + (x1-x0)*i/n; pts.push([x, f(x)]); }
  return pts;
}


/* An arrow in data coordinates, any direction, with a clear gap at each end
   so it reads as a separate object rather than as part of the curve it
   leaves or the one it arrives at. */
function dataArrow(ctx, C, x0d, y0d, x1d, y1d, color, T, fs, dpr, tight){
  var x0 = C.X(x0d), y0 = C.Y(y0d), x1 = C.X(x1d), y1 = C.Y(y1d);
  var dx = x1-x0, dy = y1-y0, len = Math.sqrt(dx*dx + dy*dy);
  var head = Math.max(9, T.lw.annot*dpr*3.2);
  /* The default gap clears the emphasis ring drawn round a settled point.
     An arrow that runs from one curve to another has no ring at either end
     and is often short, so it asks for the tight gap instead — and that gap
     shrinks with the arrow, because a fixed standoff swallowed the short
     ones entirely and they simply never drew. */
  var gap = tight ? Math.min(8*fs*dpr, len*0.10)
                  : Math.max(17*fs*dpr, T.dot*dpr*4.2);
  if(len < (tight ? head*1.6 : gap*2 + head*2.2)) return;
  var ux = dx/len, uy = dy/len;
  x0 += ux*gap; y0 += uy*gap;
  x1 -= ux*gap; y1 -= uy*gap;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = T.lw.annot*dpr*0.8; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1 - ux*head*0.7, y1 - uy*head*0.7);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.translate(x1, y1);
  ctx.rotate(Math.atan2(uy, ux));
  ctx.beginPath();
  ctx.moveTo(0,0); ctx.lineTo(-head*1.5, -head*0.62); ctx.lineTo(-head*1.5, head*0.62);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* A vertical line at a fixed output — the LRAS curve, and the drop-lines
   that hang off it. */
function vLine(ctx, C, ax, x, yTop, color, T, dpr, dash){
  polyline(ctx, C, [[x, ax.ymin],[x, yTop]], color, T.lw.series*dpr, dash);
}
function vTag(ctx, C, x, yTop, text, color, T, fs, dpr){
  chipText(ctx, text, C.X(x), C.Y(yTop) - 4*fs*dpr, 'center', 'bottom', color, T, fs, dpr);
}


/* ── Small helpers the figures below share ───────────────────────────── */

/* Steps evenly spaced along t, named s0…sN. */
/* ── Sliding a curve from where it was to where it is going ────────────
   Every other element in these figures snaps from one step to the next.
   A curve that shifts is the exception: appearing beside the old one
   reads as two curves, while sliding out of it reads as one curve
   moving, which is what a shift is. `into` says how far the sweep has
   got through the step that owns the shift, and `tween` puts the curve
   that far along.                                                      */
function into(state, n, k){
  return clamp(clamp(state.t, 0, 1)*n - (k - 1), 0, 1);
}
function tween(from, to, u){ return line(from.a + (to.a - from.a)*u, from.b); }

function evenSteps(labels){
  var out = [], i, n = labels.length - 1;
  for(i=0;i<labels.length;i++) out.push({ name:'s'+i, t:i/n, label:labels[i] });
  return out;
}

function round2(v){ return Math.round(v*100)/100; }

/* Panel boxes for any number of panels, with a strip reserved at the top
   for one line of narration spanning the whole figure. */
function panelBoxesN(W, H, dpr, n, stacked, gapCss, offY){
  var gap = gapCss*dpr, out = [], i, w, h;
  if(stacked){
    h = (H - gap*(n-1))/n;
    for(i=0;i<n;i++) out.push({ x:0, y:offY + i*(h+gap), w:W, h:h });
  } else {
    w = (W - gap*(n-1))/n;
    for(i=0;i<n;i++) out.push({ x:i*(w+gap), y:offY, w:w, h:H });
  }
  return out;
}

function beginN(canvas, mode, n, stacked, noteLines){
  var S = setupCanvas(canvas); if(!S) return null;
  var T = THEME[mode];
  S.T = T; S.fs = fontScale(mode, S.cssW);
  paintBg(S.ctx, S.W, S.H, T);
  S.noteH = noteLines ? (T.font.legend*S.fs*S.dpr*1.6*noteLines + 10*S.fs*S.dpr) : 0;
  S.boxes = panelBoxesN(S.W, S.H - S.noteH, S.dpr, n, stacked,
                        T.panelGap*0.7, S.noteH);
  return S;
}

/* One line of narration across the top of the whole figure. */
function bannerNote(ctx, S, text, color){
  var T = S.T, fs = S.fs, dpr = S.dpr;
  ctx.save();
  ctx.fillStyle = color; ctx.font = fnt(T,fs,dpr,'annot','700');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, S.W/2, S.noteH*0.5, S.W - 24*fs*dpr);
  ctx.restore();
}

/* ══ DATA — transcribed from "AS-AD.tex" ══════════════════════════════════
   Thirteen diagrams, one picture. Output across, the price level up, both
   axes 0 to 10:

     LRAS      vertical at Ȳ = 5        LRAS′  vertical at 4 (permanent
     SRAS      P = Y                           productivity loss)
     AD        P = 10 − Y               SRAS′  P = 2 + Y   (costs ↑, or wages
                                               catching up with prices)
                                        AD′    P = 12 − Y  (positive shock,
                                               or expansionary policy)
                                        AD′    P =  8 − Y  (negative shock,
                                               or contractionary policy)

   which gives A = (5, 5) and, depending on what moved:

     SRAS  ∩ AD′(12−Y) = (6, 6)   a positive demand shock
     SRAS  ∩ AD′( 8−Y) = (4, 4)   a negative demand shock
     SRAS′ ∩ AD        = (4, 6)   a negative supply shock — stagflation
     SRAS′ ∩ LRAS      = (5, 7)   wages catch up, or policy defends output
     SRAS′ ∩ AD′( 8−Y) = (3, 5)   policy defends the price level instead

   Two source notes. The section "The Effects of Expansionary Policy in the
   Short-Run" and a block of prose under Monetary Policy → Demand Shocks are
   both inside \begin{comment}, so they are absent from the printed handout
   and from this page, along with the four diagrams in the first of them.

   Every equilibrium here sits on a straight line of slope ±1, and every move
   runs from one point on such a line to another point on the SAME line, so
   the marker can travel in a straight line between them and still be exactly
   on the curve the whole way.
   ════════════════════════════════════════════════════════════════════════ */

var YBAR   = 5;                 /* LRAS: the natural rate of output */
var YBAR_2 = 4;                 /* LRAS′ after a permanent productivity loss */
var SRAS   = line(0, 1);        /* P = Y      */
var SRAS_L = line(2, 1);        /* P = 2 + Y  — SRAS shifted left/up */
var AD     = line(10, -1);      /* P = 10 − Y */
var AD_R   = line(12, -1);      /* P = 12 − Y */
var AD_L   = line(8, -1);       /* P =  8 − Y */

function axASAD(xt, xn, yt, yn){
  return {
    xmin:0, xmax:10, ymin:0, ymax:10,
    xticks:[0].concat(xt), yticks:[0].concat(yt),
    xtickText:function(v){ var i = xt.indexOf(v); return i < 0 ? '0' : xn[i]; },
    ytickText:function(v){ var i = yt.indexOf(v); return i < 0 ? '0' : yn[i]; },
    xlabel:'Aggregate output / income (Y)', ylabel:'Price level (P)'
  };
}

var PT_A = { letter:'A', Y:5, P:5, col:'blue', anchor:'ne' };

/* Where a curve sits at a given price level. Every curve in this unit is
   P = a + bY, so reading it sideways is just (P − a)/b; LRAS is already an
   output and answers with itself. This is what lets a shift arrow be
   declared as a height rather than a pair of hand-picked endpoints — it then
   starts ON the curve that moved and ends ON where it moved to, at that
   height, which is the only placement that reads as "this curve went
   there". */
function outputAt(curve, P){
  return (typeof curve === 'number') ? curve : (P - curve.a)/curve.b;
}


/* ══ THE ONE FIGURE BUILDER ═══════════════════════════════════════════════
   Every diagram in this unit is LRAS, SRAS and AD with a short list of
   things that move, so a figure here is that list. Each stage says which
   curve slides where, which way the arrow points and what the economy's new
   resting place is; the builder does the rest.

   spec = {
     id, title, caption, ax,
     intro   : true on the one figure that builds the base picture up,
     stages  : [ { label, move:{curve, to}, tag, arrow:{y,x0,x1,text},
                   point:{letter,Y,P,col,anchor}, note } ],
     note0   : the head-band line before anything has moved,
     describe: function(step){ … },
     ariaDone, ariaBuilding
   }
   ════════════════════════════════════════════════════════════════════════ */

function asadFigure(spec){
  var stages  = spec.stages || [];
  var introN  = spec.intro ? 3 : 0;
  var labels  = (spec.intro ? ['Empty axes','LRAS','SRAS and AD','Equilibrium at A']
                            : ['The economy at A'])
                .concat(stages.map(function(st){ return st.label; }));
  var steps = evenSteps(labels);
  var n = steps.length - 1;
  var notes = [].concat(spec.intro ? spec.introNotes : [spec.note0],
                        stages.map(function(st){ return st.note; }));

  function derive(state){
    return { s: clamp(Math.round(clamp(state.t,0,1)*n), 0, n) };
  }

  /* Walk the stage list, stopping at whichever stage the sweep is currently
     inside. Reports where each curve has got to and where the economy has
     got to, both part-way through a move. */
  function world(state){
    var cur = { AD:AD, SRAS:SRAS, LRAS:YBAR };
    var moved = { AD:false, SRAS:false, LRAS:false };
    var base = { AD:AD, SRAS:SRAS, LRAS:YBAR };
    var here = { Y:PT_A.Y, P:PT_A.P }, spans = [], k, u, m, st, from;
    for(k=0;k<stages.length;k++){
      u = into(state, n, introN + k + 1);
      if(u <= 0) break;
      st = stages[k];
      m = st.move;
      if(m){
        /* Measured against where the curve stood BEFORE this stage, which is
           not always the base position — several figures move a curve out
           and then move it back. */
        if(st.arrow) spans[k] = [outputAt(cur[m.curve], st.arrow.at),
                                 outputAt(m.to,         st.arrow.at)];
        if(m.curve === 'LRAS') cur.LRAS = cur.LRAS + (m.to - cur.LRAS)*u;
        else                   cur[m.curve] = tween(cur[m.curve], m.to, u);
        moved[m.curve] = true;
      }
      if(st.point){
        from = here;
        here = { Y: from.Y + (st.point.Y - from.Y)*u,
                 P: from.P + (st.point.P - from.P)*u };
      }
      if(u < 1) break;
    }
    /* Several figures push a curve out and then push it back. Once it has
       landed exactly on top of its blue original, a gold dashed copy of it
       is not a second curve — it just hides the first one and leaves a
       legend entry for something that is no longer there. */
    ['AD','SRAS'].forEach(function(c){
      if(moved[c] && Math.abs(cur[c].a - base[c].a) < 1e-9) moved[c] = false;
    });
    if(moved.LRAS && Math.abs(cur.LRAS - base.LRAS) < 1e-9) moved.LRAS = false;
    return { cur:cur, moved:moved, here:here, spans:spans };
  }

  return {
    id:spec.id, title:spec.title, caption:spec.caption,
    panels:1, aspect:0.66, aspectStacked:0.98, steps:steps,
    initState:function(){ return {t:0}; },
    setStep:function(s,i){ s.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:function(s,t){ s.t = clamp(t,0,1); },

    draw:function(canvas, state, mode){
      var S = begin(canvas, mode); if(!S) return;
      var ctx=S.ctx, T=S.T, fs=S.fs, dpr=S.dpr, ax=spec.ax;
      var s = derive(state).s;
      var W = world(state);
      var C = frame(ctx, S.box, ax, T, fs, dpr, 2);
      var k, st, u, p, legend = [];

      var lrasOn = !spec.intro || s >= 1;
      var srasOn = !spec.intro || s >= 2;
      var aOn    = !spec.intro || s >= 3;

      clipped(ctx, C, function(){
        /* The base picture, always in blue. LRAS runs the full height of the
           plot: the axis draws a faint dotted gridline at every tick, and Ȳ
           is a tick, so a shorter LRAS left that gridline poking out of the
           top looking like a dashed continuation of the curve. */
        if(lrasOn) vLine(ctx, C, ax, YBAR, ax.ymax, T.blue, T,
                         dpr * 1.25);           /* LRAS is drawn heavier */
        if(srasOn){
          drawLine(ctx, C, SRAS, ax, T.blue, T, dpr);
          drawLine(ctx, C, AD,   ax, T.blue, T, dpr);
        }

        /* whatever has moved, in gold and dashed */
        if(W.moved.LRAS) vLine(ctx, C, ax, W.cur.LRAS, ax.ymax, T.gold, T, dpr*1.25,
                               [10*dpr,7*dpr]);
        if(W.moved.SRAS) drawLine(ctx, C, W.cur.SRAS, ax, T.gold, T, dpr, [10*dpr,7*dpr]);
        if(W.moved.AD)   drawLine(ctx, C, W.cur.AD,   ax, T.gold, T, dpr, [10*dpr,7*dpr]);

        /* the resting places already visited, then where the economy is now */
        if(aOn){
          /* When the last move brings the economy home, A IS the settled
             point, so it takes the emphasis ring the other figures give to
             their B or C. */
          var last = stages.length ? stages[stages.length-1].point : null;
          var homeAgain = !!last && last.Y === PT_A.Y && last.P === PT_A.P && s >= n;
          guides(ctx, C, ax, PT_A.Y, PT_A.P, T.ink2, T, dpr, 0.55);
          labelledPoint(ctx, C, PT_A.Y, PT_A.P, 'A', T.blue, 'circle',
                        T, fs, dpr, PT_A.anchor, homeAgain);
        }
        var seen = aOn ? [[PT_A.Y, PT_A.P]] : [];
        for(k=0;k<stages.length;k++){
          st = stages[k];
          u = into(state, n, introN + k + 1);
          if(u <= 0 || !st.point) continue;
          if(u >= 1){
            /* Figures where policy returns the economy to A end their last
               stage on a point that is already drawn. Drawing it again
               doubles the marker and prints the letter twice. */
            if(seen.some(function(q){ return q[0] === st.point.Y && q[1] === st.point.P; }))
              continue;
            seen.push([st.point.Y, st.point.P]);
            guides(ctx, C, ax, st.point.Y, st.point.P, T[st.point.col], T, dpr, 0.6);
            labelledPoint(ctx, C, st.point.Y, st.point.P, st.point.letter,
                          T[st.point.col], 'circle', T, fs, dpr,
                          st.point.anchor, s >= n);
          } else {
            guides(ctx, C, ax, W.here.Y, W.here.P, T[st.point.col], T, dpr, 0.6);
            labelledPoint(ctx, C, W.here.Y, W.here.P, st.point.letter,
                          T[st.point.col], 'circle', T, fs, dpr, st.point.anchor);
          }
        }

        /* Direction arrows, with the shock or the policy named on them. Each
           one runs from the curve that moved to where it moved to, along the
           price level the stage nominates. */
        for(k=0;k<stages.length;k++){
          st = stages[k];
          u = into(state, n, introN + k + 1);
          if(u <= 0.04 || !st.arrow || !W.spans[k]) continue;
          p = W.spans[k];
          if(hArrow(ctx, C, st.arrow.at, p[0], p[1], T.red, T, fs, dpr))
            chipText(ctx, st.arrow.text, C.X((p[0] + p[1])/2),
                     C.Y(st.arrow.at) - 9*fs*dpr,
                     'center', 'bottom', T.red, T, fs, dpr);
        }
      });

      if(lrasOn) legend.push({ label:'LRAS', color:T.blue });
      if(srasOn) legend.push({ label:'SRAS', color:T.blue },
                             { label:'AD',   color:T.blue });
      if(W.moved.LRAS) legend.push({ label:'LRAS′', color:T.gold, dash:[10,7] });
      if(W.moved.SRAS) legend.push({ label:'SRAS′', color:T.gold, dash:[10,7] });
      if(W.moved.AD)   legend.push({ label:'AD′',   color:T.gold, dash:[10,7] });
      legendRow(ctx, legend, T, fs, dpr, C.px, C.px + C.pw, C.headY + C.headH*0.3);

      headNote(ctx, C, notes[s],
               s >= n ? T.green : (s > introN ? T.red : T.ink2), T, fs, dpr, 1);
    },

    describe:function(state){ return spec.describe(derive(state).s); },
    ariaLabel:function(state){
      return derive(state).s >= introN + 1 ? spec.ariaDone : spec.ariaBuilding;
    }
  };
}


/* ══ SPEC FACTORY: a demand shock and the policy that answers it ══════════
   Four of this unit's figures — monetary and fiscal, expansion and
   recession — are the same two moves with a different lever named on the
   second arrow. Writing them as one factory is what keeps the four
   narrations parallel, which is the point the section is making: the tool
   changes, the picture does not.
   ════════════════════════════════════════════════════════════════════════ */

function policyDemandFigure(o){
  var pos  = o.positive;
  var ADs  = pos ? AD_R : AD_L;
  var B    = pos ? { letter:'B', Y:6, P:6, col:'gold', anchor:'se' }
                 : { letter:'B', Y:4, P:4, col:'gold', anchor:'nw' };
  /* A price level for each arrow, not a pair of endpoints: the builder
     reads the two curves at that height, so the arrow always starts on the
     curve that moved and ends on where it went. These heights are chosen to
     keep the two arrows well apart and off the marked points. */
  var shockArrow  = { at:2.5, text:'Demand shock' };
  var policyArrow = { at: pos ? 8.5 : 6.5, text:o.lever };
  var updown = pos ? 'risen' : 'fallen';

  return asadFigure({
    id:o.id, title:o.title, caption:o.caption,
    ax: pos ? axASAD([5,6], ['Ȳ','Y′'], [5,6], ['P₁','P₂'])
            : axASAD([4,5], ['Y′','Ȳ'], [4,5], ['P₂','P₁']),
    note0:'Start in long-run equilibrium at A: output Ȳ, price level P₁.',
    stages:[
      { label: pos ? 'A positive demand shock' : 'A negative demand shock',
        move:{ curve:'AD', to:ADs }, arrow:shockArrow, point:B,
        note: pos ? 'AD shifts right: at B both the price level and output are higher.'
                  : 'AD shifts left: at B both the price level and output are lower.' },
      { label:'The ' + o.armShort + ' responds',
        move:{ curve:'AD', to:AD }, arrow:policyArrow,
        point:{ letter:'A', Y:5, P:5, col:'blue', anchor:'ne' },
        note: o.lever + ' pushes AD back where it started — the economy returns to A.' }
    ],
    describe:function(s){
      return [
        'LRAS standing vertically at the natural rate of output Ȳ, an upward-sloping SRAS ' +
        'curve and a downward-sloping AD curve, all crossing at A: output Ȳ at the price ' +
        'level P₁. This is a long-run equilibrium, because all three curves meet there.',
        'The demand shock shifts AD to the ' + (pos ? 'right' : 'left') + '. The economy ' +
        'slides ' + (pos ? 'up' : 'down') + ' the SRAS curve to B, where output is ' +
        (pos ? 'above' : 'below') + ' the natural rate at Y prime and the price level has ' +
        updown + ' to P two. ' + (pos
          ? 'This is an expansion: output above Ȳ and inflation.'
          : 'This is a recession: output below Ȳ, unemployment above its natural rate, ' +
            'and a falling price level.'),
        o.arm + ' ' + o.action + ', which ' + o.chain + '. AD slides back to where it ' +
        'began and the economy travels back down the SRAS curve to A, at output Ȳ and the ' +
        'price level P₁. Both halves of the mandate are met at once, which is what makes ' +
        'demand shocks the easy case: one instrument, and both problems move the right way.'
      ][s];
    },
    ariaDone:'A ' + (pos ? 'positive' : 'negative') + ' demand shock shifting AD ' +
             (pos ? 'right' : 'left') + ', then ' + o.armShort + ' policy shifting it back ' +
             'so the economy returns to A.',
    ariaBuilding:'A ' + (pos ? 'positive' : 'negative') + ' demand shock and the policy ' +
                 'response, being built up.'
  });
}


/* ══ SPEC FACTORY: a supply shock and the choice it forces ════════════════
   The other four figures. Same negative supply shock, then AD moved one way
   or the other — and the two answers are the two halves of the mandate,
   which is exactly why this case is hard.
   ════════════════════════════════════════════════════════════════════════ */

function policySupplyFigure(o){
  var keepP = o.keepPrices;
  var ADs   = keepP ? AD_L : AD_R;
  var C     = keepP ? { letter:'C', Y:3, P:5, col:'red', anchor:'nw' }
                    : { letter:'C', Y:5, P:7, col:'red', anchor:'ne' };
  var policyArrow = { at: keepP ? 2 : 2.5, text:o.lever };

  return asadFigure({
    id:o.id, title:o.title, caption:o.caption,
    ax: keepP ? axASAD([3,4,5], ['Y″','Y′','Ȳ'], [5,6], ['P₁','P₂'])
              : axASAD([4,5],   ['Y′','Ȳ'],      [5,6,7], ['P₁','P₂','P₃']),
    note0:'Start in long-run equilibrium at A: output Ȳ, price level P₁.',
    stages:[
      { label:'A negative supply shock',
        move:{ curve:'SRAS', to:SRAS_L },
        arrow:{ at:8.5, text:'Costs ↑' },
        point:{ letter:'B', Y:4, P:6, col:'gold', anchor:'nw' },
        note:'SRAS shifts left: at B prices are higher AND output is lower — stagflation.' },
      { label: keepP ? 'Defend the price level' : 'Defend output',
        move:{ curve:'AD', to:ADs }, arrow:policyArrow, point:C,
        note: keepP
          ? 'C: the price level is back at P₁ — but output has fallen further, to Y″.'
          : 'C: output is back at Ȳ — but the price level has risen further, to P₃.' }
    ],
    describe:function(s){
      return [
        'LRAS standing vertically at the natural rate of output Ȳ, an upward-sloping SRAS ' +
        'curve and a downward-sloping AD curve, all crossing at A: output Ȳ at the price ' +
        'level P₁.',
        'The supply shock raises firms’ costs, so SRAS shifts left. The economy slides ' +
        'up the AD curve to B, where the price level has risen to P₂ and output has fallen ' +
        'to Y prime. Higher inflation and higher unemployment at the same time: stagflation. ' +
        'Both halves of the mandate are now broken, and in opposite directions.',
        o.arm + ' ' + o.action + ', shifting AD to the ' + (keepP ? 'left' : 'right') +
        '. The economy moves along the new SRAS curve to C, at ' +
        (keepP
          ? 'output Y double prime and the price level P₁. The price level is back where it ' +
            'started — and output is now further below the natural rate than it was at B. ' +
            'Inflation was fixed by making the recession worse.'
          : 'output Ȳ and the price level P₃. Output is back at the natural rate — and the ' +
            'price level is now higher than it was at B. The recession was fixed by making ' +
            'inflation worse.') +
        ' There is no move that fixes both, which is the whole difficulty of a supply shock: ' +
        'one instrument, two problems pulling opposite ways.'
      ][s];
    },
    ariaDone:'A negative supply shock shifting SRAS left into stagflation, then ' +
             o.armShort + ' policy shifting AD ' + (keepP ? 'left' : 'right') +
             ' to defend ' + (keepP ? 'the price level at the cost of output' :
                                      'output at the cost of the price level') + '.',
    ariaBuilding:'A negative supply shock and the policy response, being built up.'
  });
}

/* ── Figure 1: the three curves on one pair of axes ───────────────────── */

var figBase = asadFigure({
  id:'fig-11-1-lras-sras-ad',
  title:'LRAS, SRAS and AD on one graph',
  caption:'Three curves, and the difference between the two supply curves is the whole ' +
          'unit. SRAS slopes up because a higher price level lowers the real wage below the ' +
          'marginal product of labour, so firms hire more and produce more. LRAS is vertical ' +
          'because workers eventually demand the higher nominal wages that undo that, ' +
          'leaving the real wage — and so output — unchanged. Short-run equilibrium is where ' +
          'SRAS meets AD; long-run equilibrium is where all three meet.',
  ax: axASAD([5], ['Ȳ'], [5], ['P₁']),
  intro:true,
  introNotes:[
    'Output across, the price level up.',
    'LRAS: the output the economy produces once wages have caught up — it does not depend on P.',
    'SRAS slopes up; AD slopes down. Where they cross is the short-run equilibrium.',
    'All three meet at A. That is a long-run equilibrium: output Ȳ at the price level P₁.'
  ],
  stages:[],
  describe:function(s){
    return [
      'Empty axes. Aggregate output and income run across the bottom; the price level runs ' +
      'up the side.',
      'A vertical line is drawn at Ȳ and labelled LRAS. It is vertical because in the long ' +
      'run workers demand higher nominal wages to match higher prices, so the real wage — ' +
      'and therefore how much labour firms hire and how much they produce — is the same at ' +
      'every price level.',
      'The upward-sloping SRAS curve and the downward-sloping AD curve are added. SRAS ' +
      'slopes up because a higher price level pushes the real wage below the marginal ' +
      'product of labour, so firms hire more workers and output rises. Where SRAS and AD ' +
      'cross is the short-run equilibrium.',
      'All three curves meet at point A, at output Ȳ and price level P₁, with dashed lines ' +
      'dropped to both axes. Because AD and SRAS cross exactly on LRAS, this is a long-run ' +
      'equilibrium: the goods market clears, and wages have nothing left to adjust to.'
    ][s];
  },
  ariaDone:'LRAS vertical at the natural rate of output, with SRAS and AD crossing on it at ' +
           'point A — a long-run equilibrium.',
  ariaBuilding:'The AS–AD diagram, being built up one curve at a time.'
});


/* ── Figure 2: a demand shock, short run then long run ────────────────── */

var figDemandShock = asadFigure({
  id:'fig-11-2-demand-shock',
  title:'A positive demand shock, in the short run and the long run',
  caption:'A financial crisis, a change in consumer confidence, a trade-policy surprise — ' +
          'demand moves whether or not anyone intended it to. In the short run a positive ' +
          'shock raises both the price level and output. In the long run the higher price ' +
          'level has cut the real wage, workers demand it back, SRAS shifts left, and output ' +
          'returns to Ȳ. The price level stays higher. Demand shocks move prices and output ' +
          'in the short run, and prices alone in the long run.',
  ax: axASAD([5,6], ['Ȳ','Y′'], [5,6,7], ['P₁','P₂','P₃']),
  note0:'Start in long-run equilibrium at A: output Ȳ, price level P₁.',
  stages:[
    { label:'Short run: AD shifts right',
      move:{ curve:'AD', to:AD_R },
      arrow:{ at:2.5, text:'Demand shock' },
      point:{ letter:'B', Y:6, P:6, col:'gold', anchor:'se' },
      note:'B: firms charge more AND hire more. Output is above Ȳ, the price level is P₂.' },
    { label:'Long run: wages catch up',
      move:{ curve:'SRAS', to:SRAS_L },
      arrow:{ at:3, text:'W↑' },
      point:{ letter:'C', Y:5, P:7, col:'red', anchor:'ne' },
      note:'C: output is back at Ȳ, but the price level has risen again, to P₃.' }
  ],
  describe:function(s){
    return [
      'LRAS vertical at the natural rate Ȳ, with SRAS and AD crossing on it at A: output Ȳ ' +
      'at price level P₁.',
      'The positive demand shock shifts AD to the right. The economy slides up the SRAS ' +
      'curve to B, at output Y prime — above the natural rate — and the higher price level ' +
      'P₂. The higher price level has cut the real wage below the marginal product of ' +
      'labour, which is why firms were willing to hire more and produce more.',
      'That lower real wage is not something workers accept for long. They demand higher ' +
      'nominal wages, firms’ costs rise, and SRAS shifts left until the real wage is back ' +
      'where it started. The economy climbs the new AD curve to C, on LRAS at output Ȳ and ' +
      'the still higher price level P₃. Firms are hiring exactly what they hired before the ' +
      'shock, so output has returned to the natural rate; only the price level is ' +
      'permanently changed. In the long run, a demand shock is purely inflationary.'
    ][s];
  },
  ariaDone:'A positive demand shock raising output and prices in the short run, then SRAS ' +
           'shifting left as wages catch up so output returns to the natural rate at a still ' +
           'higher price level.',
  ariaBuilding:'A positive demand shock in the short and long run, being built up.'
});


/* ── Figures 3–5: a supply shock, and what happens next ───────────────── */

var SUPPLY_STAGE = {
  label:'SRAS shifts left',
  move:{ curve:'SRAS', to:SRAS_L },
  arrow:{ at:3, text:'Tariffs ↑' },
  point:{ letter:'B', Y:4, P:6, col:'gold', anchor:'nw' },
  note:'B: prices up AND output down at the same time — stagflation.'
};
var SUPPLY_AX = axASAD([4,5], ['Y′','Ȳ'], [5,6], ['P₁','P₂']);
var SUPPLY_D0 =
  'LRAS vertical at the natural rate Ȳ, with SRAS and AD crossing on it at A: output Ȳ at ' +
  'price level P₁.';
var SUPPLY_D1 =
  'Higher tariffs raise firms’ costs, so SRAS shifts left. The economy slides up the AD ' +
  'curve to B, at the higher price level P₂ and the lower output Y prime. Along the way the ' +
  'higher price level raises the interest rate, which cuts investment and planned ' +
  'expenditure — and that fall in spending is what brings aggregate demand back into line ' +
  'with the smaller aggregate supply. High inflation and high unemployment together is ' +
  'stagflation.';

var figSupplyShock = asadFigure({
  id:'fig-11-3-supply-shock',
  title:'A negative supply shock: stagflation',
  caption:'An increase in tariffs raises firms’ costs, so they charge more and produce less: ' +
          'SRAS shifts left. Unlike a demand shock, this pushes prices and output in ' +
          'opposite directions — inflation and unemployment rising together, which is what ' +
          '“stagflation” names.',
  ax: SUPPLY_AX,
  note0:'Start in long-run equilibrium at A: output Ȳ, price level P₁.',
  stages:[SUPPLY_STAGE],
  describe:function(s){ return [SUPPLY_D0, SUPPLY_D1][s]; },
  ariaDone:'A negative supply shock shifting SRAS left, raising the price level and lowering ' +
           'output at the same time.',
  ariaBuilding:'A negative supply shock, being built up.'
});

var figSupplyTemp = asadFigure({
  id:'fig-11-4-supply-shock-temporary',
  title:'If the supply shock is temporary',
  caption:'Nothing about the economy’s productive capacity has changed, so when the tariffs ' +
          'come off, costs fall back, SRAS returns, and the economy goes back to exactly ' +
          'where it started — point A, at output Ȳ and price level P₁.',
  ax: SUPPLY_AX,
  note0:'Start in long-run equilibrium at A: output Ȳ, price level P₁.',
  stages:[SUPPLY_STAGE,
    { label:'The tariffs come off',
      move:{ curve:'SRAS', to:SRAS },
      arrow:{ at:8.5, text:'Tariffs ↓' },
      point:{ letter:'A', Y:5, P:5, col:'blue', anchor:'ne' },
      note:'SRAS returns and so does the economy: back to A, output Ȳ at P₁.' }],
  describe:function(s){
    return [SUPPLY_D0, SUPPLY_D1,
      'The tariffs return to their normal level. Firms’ costs fall back, SRAS slides back ' +
      'to where it was, and the economy travels back down the AD curve to A — output Ȳ at ' +
      'the price level P₁. A temporary supply shock leaves no permanent mark, because it ' +
      'never touched how much the economy is able to produce.'][s];
  },
  ariaDone:'A temporary supply shock: SRAS shifts left and then returns, and the economy ' +
           'ends where it began, at point A.',
  ariaBuilding:'A temporary supply shock, being built up.'
});

var figSupplyPerm = asadFigure({
  id:'fig-11-5-supply-shock-permanent',
  title:'If the supply shock is permanent',
  caption:'A permanent supply shock is a permanent loss of productivity, so it is not only ' +
          'SRAS that moves: the economy’s productive capacity itself is smaller, and LRAS ' +
          'shifts left too. B is no longer a short-run detour — it is the new long-run ' +
          'equilibrium, with output permanently below where it used to be.',
  ax: SUPPLY_AX,
  note0:'Start in long-run equilibrium at A: output Ȳ, price level P₁.',
  stages:[SUPPLY_STAGE,
    { label:'LRAS shifts left too',
      move:{ curve:'LRAS', to:YBAR_2 },
      arrow:{ at:1.6, text:'Productivity ↓' },
      note:'LRAS moves to B as well: this output is now the economy’s new natural rate.' }],
  describe:function(s){
    return [SUPPLY_D0, SUPPLY_D1,
      'If the tariffs are permanent, the economy has permanently lost productive capacity, ' +
      'so LRAS shifts left as well — from Ȳ to the lower output at Y prime. LRAS, the new ' +
      'SRAS and AD now all meet at B, so B is not a short-run detour but the new long-run ' +
      'equilibrium. Output is permanently lower and the price level permanently higher, and ' +
      'no adjustment of wages will bring output back, because there is less to produce ' +
      'with.'][s];
  },
  ariaDone:'A permanent supply shock: SRAS shifts left and LRAS shifts left with it, so the ' +
           'lower output becomes the economy’s new natural rate.',
  ariaBuilding:'A permanent supply shock, being built up.'
});


/* ── Figures 6–9: the Fed's response ──────────────────────────────────── */

var figMonPosDemand = policyDemandFigure({
  id:'fig-11-6-monetary-positive-demand',
  title:'Monetary policy after a positive demand shock',
  caption:'Prices and output have both risen, and the Fed’s dual mandate asks it to bring ' +
          'both down. It cannot move output directly, but it can move the interest rate: ' +
          'M↓ → M/P↓ → r↑ → I↓ → PE↓ → U.I.↑ → Y↓. AD goes back where it came from and so ' +
          'does the economy. Demand shocks are the easy case — one lever fixes both halves ' +
          'of the mandate at once.',
  positive:true, lever:'M↓',
  arm:'The Fed', armShort:'Fed',
  action:'cuts the money supply',
  chain:'lowers real balances, raises the interest rate, cuts investment and so cuts ' +
        'planned expenditure and output'
});

var figMonNegDemand = policyDemandFigure({
  id:'fig-11-7-monetary-negative-demand',
  title:'Monetary policy after a negative demand shock',
  caption:'The mirror image. Prices and output have both fallen, so the Fed raises the ' +
          'money supply: M↑ → M/P↑ → r↓ → I↑ → PE↑ → U.I.↓ → Y↑. AD is pushed back to where ' +
          'it started and the economy returns to A.',
  positive:false, lever:'M↑',
  arm:'The Fed', armShort:'Fed',
  action:'raises the money supply',
  chain:'raises real balances, lowers the interest rate, raises investment and so raises ' +
        'planned expenditure and output'
});

var figMonSupplyPrices = policySupplyFigure({
  id:'fig-11-8-monetary-supply-prices',
  title:'A supply shock: the Fed defends the price level',
  caption:'Stagflation breaks both halves of the mandate at once, and the Fed has one ' +
          'lever that moves prices and output the SAME way — so fixing either one makes the ' +
          'other worse. Choose price stability, cut the money supply, and the price level ' +
          'returns to P₁ while output falls further still, to Y″.',
  keepPrices:true, lever:'M↓',
  arm:'The Fed', armShort:'Fed',
  action:'cuts the money supply to bring the price level back down'
});

var figMonSupplyOutput = policySupplyFigure({
  id:'fig-11-9-monetary-supply-output',
  title:'A supply shock: the Fed defends output',
  caption:'The other choice. Raise the money supply, and output climbs back to Ȳ — but the ' +
          'price level ends higher than the shock alone had made it, at P₃. Since the late ' +
          '1970s the Fed has generally chosen the other one and prioritised inflation.',
  keepPrices:false, lever:'M↑',
  arm:'The Fed', armShort:'Fed',
  action:'raises the money supply to bring output back up'
});


/* ── Figures 10–13: the same four pictures, with fiscal policy ─────────── */

var figFisPosDemand = policyDemandFigure({
  id:'fig-11-10-fiscal-positive-demand',
  title:'Fiscal policy after a positive demand shock',
  caption:'Fiscal policy reaches the same curve by a shorter route: T↑ or G↓ → PE↓ → U.I.↑ ' +
          '→ Y↓, with no interest rate in the middle. The diagram is identical to the Fed’s ' +
          '— only the lever named on the arrow has changed.',
  positive:true, lever:'T↑ / G↓',
  arm:'Congress and the President', armShort:'government',
  action:'raise taxes or cut government purchases',
  chain:'cuts planned expenditure directly, so unplanned inventories rise and firms cut ' +
        'production'
});

var figFisNegDemand = policyDemandFigure({
  id:'fig-11-11-fiscal-negative-demand',
  title:'Fiscal policy after a negative demand shock',
  caption:'G↑ or T↓ → PE↑ → U.I.↓ → Y↑. AD is pushed back to the right and the economy ' +
          'returns to A. The Employment Act of 1946 obliges the federal government to this ' +
          'work as surely as the dual mandate obliges the Fed.',
  positive:false, lever:'T↓ / G↑',
  arm:'Congress and the President', armShort:'government',
  action:'cut taxes or raise government purchases',
  chain:'raises planned expenditure directly, so unplanned inventories fall and firms raise ' +
        'production'
});

var figFisSupplyPrices = policySupplyFigure({
  id:'fig-11-12-fiscal-supply-prices',
  title:'A supply shock: fiscal policy defends the price level',
  caption:'Fiscal policy faces exactly the trade-off monetary policy does, because it moves ' +
          'the same curve. Contractionary policy returns the price level to P₁ and pushes ' +
          'output down to Y″.',
  keepPrices:true, lever:'G↓ / T↑',
  arm:'Congress and the President', armShort:'government',
  action:'raise taxes or cut government purchases to bring the price level back down'
});

var figFisSupplyOutput = policySupplyFigure({
  id:'fig-11-13-fiscal-supply-output',
  title:'A supply shock: fiscal policy defends output',
  caption:'Expansionary policy returns output to Ȳ at the cost of a price level of P₃. ' +
          'Fiscal policy is additionally prone to the inflationary side of this choice, ' +
          'because contractionary policy is hard to sell when the economy is strong.',
  keepPrices:false, lever:'G↑ / T↓',
  arm:'Congress and the President', armShort:'government',
  action:'raise government purchases or cut taxes to bring output back up'
});


var figures = {
  'fig-11-1-lras-sras-ad':             figBase,
  'fig-11-2-demand-shock':             figDemandShock,
  'fig-11-3-supply-shock':             figSupplyShock,
  'fig-11-4-supply-shock-temporary':   figSupplyTemp,
  'fig-11-5-supply-shock-permanent':   figSupplyPerm,
  'fig-11-6-monetary-positive-demand': figMonPosDemand,
  'fig-11-7-monetary-negative-demand': figMonNegDemand,
  'fig-11-8-monetary-supply-prices':   figMonSupplyPrices,
  'fig-11-9-monetary-supply-output':   figMonSupplyOutput,
  'fig-11-10-fiscal-positive-demand':  figFisPosDemand,
  'fig-11-11-fiscal-negative-demand':  figFisNegDemand,
  'fig-11-12-fiscal-supply-prices':    figFisSupplyPrices,
  'fig-11-13-fiscal-supply-output':    figFisSupplyOutput
};

var ORDER = ['fig-11-1-lras-sras-ad','fig-11-2-demand-shock','fig-11-3-supply-shock',
             'fig-11-4-supply-shock-temporary','fig-11-5-supply-shock-permanent',
             'fig-11-6-monetary-positive-demand','fig-11-7-monetary-negative-demand',
             'fig-11-8-monetary-supply-prices','fig-11-9-monetary-supply-output',
             'fig-11-10-fiscal-positive-demand','fig-11-11-fiscal-negative-demand',
             'fig-11-12-fiscal-supply-prices','fig-11-13-fiscal-supply-output'];

function indexOfStep(fig, name){
  var i;
  for(i=0;i<fig.steps.length;i++) if(fig.steps[i].name === name) return i;
  return -1;
}


/* ══ CONTROLLER ════════════════════════════════════════════════════════════
   Owns requestAnimationFrame, the cosine ease, the duration and the
   prefers-reduced-motion branch, so NEITHER html file contains animation
   logic. Pages wire buttons and keys to these methods and nothing more.

   onUpdate(ctrl, settled) — settled is false on intermediate animation
   frames, true when the figure has come to rest. The notes page uses that to
   avoid firing its aria-live region 60 times a second.
   ════════════════════════════════════════════════════════════════════════ */

function createController(opts){
  var fig      = opts.figure,
      canvas   = opts.canvas,
      mode     = opts.mode || 'notes',
      onUpdate = opts.onUpdate || function(){};
  var state = fig.initState();
  var raf = 0, playing = false, from = 0, to = 0, dur = 0, t0 = 0;

  function now(){
    return (global.performance && global.performance.now)
      ? global.performance.now() : Date.now();
  }

  function halt(){
    if(raf && global.cancelAnimationFrame) global.cancelAnimationFrame(raf);
    raf = 0; playing = false;
  }

  function emit(settled){
    fig.draw(canvas, state, mode);
    onUpdate(api, settled);
  }

  function frame(){
    var p = dur <= 0 ? 1 : clamp((now() - t0)/dur, 0, 1);
    fig.scrub(state, from + (to - from)*ease(p));
    if(p < 1){
      raf = global.requestAnimationFrame(frame);
      emit(false);
    } else {
      halt();
      emit(true);
    }
  }

  /* Animate to a target t. Reduced motion jumps straight to the end state. */
  function run(target){
    halt();
    target = clamp(target, 0, 1);
    if(reducedMotion() || !global.requestAnimationFrame){
      fig.scrub(state, target); emit(true); return;
    }
    from = state.t; to = target;
    dur = DURATION * Math.abs(to - from);
    if(dur < 60){ fig.scrub(state, target); emit(true); return; }
    playing = true; t0 = now();
    raf = global.requestAnimationFrame(frame);
    emit(false);
  }

  function nearest(){
    var i, k = 0;
    for(i=0;i<fig.steps.length;i++) if(fig.steps[i].t <= state.t + 1e-6) k = i;
    return k;
  }

  var api = {
    figure: fig,
    mode: mode,
    canvas: canvas,
    get state(){ return state; },
    get t(){ return state.t; },
    get playing(){ return playing; },

    isComplete: function(){ return state.t >= 1 - 1e-6; },
    stepIndex:  nearest,
    stepCount:  function(){ return fig.steps.length; },
    stepLabel:  function(){ return fig.steps[nearest()].label; },
    describe:   function(){ return fig.describe(state); },
    ariaLabel:  function(){ return fig.ariaLabel(state); },

    render: function(){ emit(true); },

    play: function(){
      if(api.isComplete()){ fig.scrub(state, 0); }
      run(1);
    },
    pause: function(){ halt(); emit(true); },
    toggle: function(){ if(playing) api.pause(); else api.play(); },
    replay: function(){ halt(); fig.scrub(state, 0); emit(true); run(1); },
    reset:  function(){ halt(); fig.scrub(state, 0); emit(true); },

    /* Returns false when there is no next step — the deck reads that as
       "this figure is finished, move to the next slide". */
    stepForward: function(){
      var i = nearest();
      if(playing){ halt(); }
      /* a static figure (one step) has nothing to advance through */
      if(fig.steps.length <= 1) return false;
      if(i >= fig.steps.length - 1 && api.isComplete()) return false;
      run(fig.steps[Math.min(i+1, fig.steps.length-1)].t);
      return true;
    },
    stepBack: function(){
      var i = nearest();
      if(playing){ halt(); }
      if(i <= 0) return false;
      run(fig.steps[i-1].t);
      return true;
    },
    setStep: function(i){ halt(); fig.setStep(state, i); emit(true); },
    setStepNamed: function(name){
      var i = indexOfStep(fig, name);
      if(i >= 0) api.setStep(i);
      return i >= 0;
    },
    scrubTo: function(t){ halt(); fig.scrub(state, t); emit(true); },

    destroy: function(){ halt(); }
  };

  return api;
}




/* ══ EXPORT ═══════════════════════════════════════════════════════════════ */

global.EconFigures = global.EconFigures || {};
global.EconFigures['unit-11'] = {
  THEME: THEME,
  figures: figures,
  order: ORDER,
  layout: layout,
  createController: createController,
  indexOfStep: indexOfStep,
  DURATION: DURATION,
  reducedMotion: reducedMotion,
  _helpers: { setupCanvas: setupCanvas, tickStep: tickStep, snapUp: snapUp, ease: ease }
};

})(window);
