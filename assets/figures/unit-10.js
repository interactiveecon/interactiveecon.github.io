/* ============================================================================
   unit-10.js — ECON 002, Unit 10: Aggregate Demand
   Shared figure module. SINGLE SOURCE OF TRUTH for every dynamic figure in
   this unit.

   Consumed by BOTH:
     classes/econ002/notes/unit-10/index.html   (mode 'notes')
     classes/econ002/notes/unit-10/deck.html    (mode 'stage')

   No pre-rendered charts here — the source draws twenty-one diagrams, and
   they are all the same two pictures with different things moved, so the
   ten figures in this file come out of three builders.

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
  if(Math.abs(qTo - qFrom) < 0.12) return;
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
  if(Math.abs(x1-x0) < gap*2 + head*2.2) return;   /* too short to be worth drawing */
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

/* ══ DATA — transcribed from "Aggregate Demand.tex" ═══════════════════════
   Twenty-one diagrams built from two pictures and a short list of moves.

   The IR–IS panel, output across and the interest rate up, both 0 to 10:

     IR        r = Y            IR′ up    r = 2 + Y     (P ↑, or M ↓)
     IS        r = 10 − Y       IR′ down  r = −2 + Y    (P ↓, or M ↑)
                                IS′ right r = 12 − Y    (G ↑, or T ↓)
                                IS′ left  r = 8 − Y     (G ↓, or T ↑)

   which puts A at (5, 5) and the four possible B's at (6, 6), (4, 4),
   (4, 6) and (6, 4).

   The AD panel, output across and the price level up:

     AD   P = 10 − Y      AD′ right  P = 11 − Y     AD′ left  P = 9 − Y

   with A at (5, 5) and B at (6, 5) or (4, 5). The derivation reads three
   price levels off the IR–IS panel — P₁ giving Y = 5, a higher P₂ giving
   Y = 4 and a lower P₃ giving Y = 6 — and plots those three pairs on the
   AD panel, which is all the AD curve is.

   One source note: the Quantitative Easing subsection is inside a
   \begin{comment} block, so it is absent from the printed handout and from
   this page. Expansionary monetary policy still appears, in the aggregate
   demand section.
   ════════════════════════════════════════════════════════════════════════ */

var IR      = line(0, 1);
var IR_UP   = line(2, 1);
var IR_DOWN = line(-2, 1);
var IS      = line(10, -1);
var IS_R    = line(12, -1);
var IS_L    = line(8, -1);
var AD      = line(10, -1);
var AD_R    = line(11, -1);
var AD_L    = line(9, -1);

/* Where an IR and an IS line cross. */
function meet(ir, is){
  var y = (is.a - ir.a)/(ir.b - is.b);
  return { Y:y, r:ir.at(y) };
}

/* One naming convention for the whole unit, taken from the source's own tick
   lists: output 5 is Y₁, the lower output 4 is Y₂ and the higher output 6 is
   Y₃; the same for r and P. Every figure here reads its labels from these,
   so the subscripts mean the same thing in the derivation as they do in the
   policy pictures. */
var YNAME = { 4:'Y₂', 5:'Y₁', 6:'Y₃' };
var RNAME = { 4:'r₃', 5:'r₁', 6:'r₂' };
var PNAME = { 4:'P₃', 5:'P₁', 6:'P₂' };

function axFrom(xt, yt, names, ylabel){
  return {
    xmin:0, xmax:10, ymin:0, ymax:10,
    xticks:[0].concat(xt), yticks:[0].concat(yt),
    xtickText:function(v){ return YNAME[v] || '0'; },
    ytickText:function(v){ return names[v] || '0'; },
    xlabel:'Income / output (Y)', ylabel:ylabel
  };
}
function axIRIS(xt, yt){ return axFrom(xt, yt, RNAME, 'Interest rate (r)'); }
function axAD(xt, yt){   return axFrom(xt, yt, PNAME, 'Price level (P)'); }

/* The IR–IS panel, painted the same way wherever it appears. `live` is the
   curve part-way through a shift; whichever of the two is not moving is
   passed unchanged. */
function paintIRIS(ctx, C, ax, T, fs, dpr, s, o){
  var eq0 = meet(IR, IS);
  clipped(ctx, C, function(){
    if(s >= o.irStep)   drawLine(ctx, C, IR, ax, T.blue, T, dpr);
    if(s >= o.isStep)   drawLine(ctx, C, IS, ax, T.blue, T, dpr);
    if(o.liveIR) drawLine(ctx, C, o.liveIR, ax, T.gold, T, dpr, [10*dpr,7*dpr]);
    if(o.liveIS) drawLine(ctx, C, o.liveIS, ax, T.gold, T, dpr, [10*dpr,7*dpr]);
    if(s >= o.eqStep){
      guides(ctx, C, ax, eq0.Y, eq0.r, T.ink2, T, dpr, 0.55);
      labelledPoint(ctx, C, eq0.Y, eq0.r, 'A', T.blue, 'circle', T, fs, dpr, 'nw');
    }
    if(o.liveB){
      guides(ctx, C, ax, o.liveB.Y, o.liveB.r, T.gold, T, dpr, 0.6);
      labelledPoint(ctx, C, o.liveB.Y, o.liveB.r, 'B', T.gold, 'circle', T, fs, dpr,
                    o.bAnchor || 'nw', o.ring);
    }
  });
}


/* ══ FIGURE BUILDER 1: one shift on the IR–IS diagram ═════════════════════
   Five of this unit's figures are this picture with one of the two curves
   moved. The moving curve slides out of the original and the equilibrium
   travels with it, so a shift reads as a curve moving rather than a second
   curve appearing.
   ════════════════════════════════════════════════════════════════════════ */

function irisFigure(spec){
  var ax = spec.ax, steps = evenSteps(spec.stepLabels);
  var n = steps.length - 1;
  var eq0 = meet(IR, IS);
  var eq1 = spec.shifted ? meet(spec.shiftsIR ? spec.shifted : IR,
                                spec.shiftsIR ? IS : spec.shifted) : eq0;

  function derive(state){
    return { s: clamp(Math.round(clamp(state.t,0,1)*n), 0, n) };
  }

  return {
    id:spec.id, title:spec.title, caption:spec.caption,
    panels:1, aspect:0.66, aspectStacked:0.98, steps:steps,
    initState:function(){ return {t:0}; },
    setStep:function(s,i){ s.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:function(s,t){ s.t = clamp(t,0,1); },

    draw:function(canvas, state, mode){
      var S = begin(canvas, mode); if(!S) return;
      var ctx=S.ctx, T=S.T, fs=S.fs, dpr=S.dpr;
      var s = derive(state).s;
      var u = spec.shockStep ? into(state, n, spec.shockStep) : 0;
      var base = spec.shiftsIR ? IR : IS;
      var live = spec.shifted ? tween(base, spec.shifted, u) : null;
      var Cx = frame(ctx, S.box, ax, T, fs, dpr, 2);

      paintIRIS(ctx, Cx, ax, T, fs, dpr, s, {
        irStep:spec.irStep, isStep:spec.isStep, eqStep:spec.eqStep,
        liveIR: (u > 0 &&  spec.shiftsIR) ? live : null,
        liveIS: (u > 0 && !spec.shiftsIR) ? live : null,
        liveB:  u > 0 ? { Y: eq0.Y + (eq1.Y - eq0.Y)*u,
                          r: eq0.r + (eq1.r - eq0.r)*u } : null,
        bAnchor:spec.bAnchor, ring:(s >= n)
      });

      legendRow(ctx, (s >= spec.irStep ? [{ label:'IR', color:T.blue }] : [])
                  .concat(s >= spec.isStep ? [{ label:'IS', color:T.blue }] : [])
                  .concat(u > 0 ? [{ label:spec.tag, color:T.gold, dash:[10,7] }] : []),
                T, fs, dpr, Cx.px, Cx.px + Cx.pw, Cx.headY + Cx.headH*0.3);
      headNote(ctx, Cx, spec.notes[s],
               s >= n ? T.green : (u > 0 ? T.red : T.ink2), T, fs, dpr, 1);
    },

    describe:function(state){ return spec.describe(derive(state).s); },
    ariaLabel:function(state){
      return derive(state).s >= (spec.shockStep || 1) ? spec.ariaDone : spec.ariaBuilding;
    }
  };
}


/* ══ FIGURE BUILDER 2: the same shock, on both diagrams ═══════════════════
   The four policy figures. On the left the IR–IS diagram at a fixed price
   level; on the right the aggregate demand curve, which has to move so
   that it still passes through the output the left-hand panel just
   produced. The price level never changes in either panel — that is the
   whole reason AD shifts rather than the economy sliding along it.
   ════════════════════════════════════════════════════════════════════════ */

function irisAdFigure(spec){
  var steps = evenSteps(spec.stepLabels), n = steps.length - 1;
  var eq0 = meet(IR, IS);
  var eq1 = meet(spec.shiftsIR ? spec.shifted : IR,
                 spec.shiftsIR ? IS : spec.shifted);
  var axL = axIRIS([eq0.Y, eq1.Y], [eq0.r, eq1.r]);
  var axR = axAD([eq0.Y, eq1.Y], [5]);

  function derive(state){
    return { s: clamp(Math.round(clamp(state.t,0,1)*n), 0, n) };
  }

  return {
    id:spec.id, title:spec.title, caption:spec.caption,
    panels:2, aspect:0.42, aspectStacked:1.15, steps:steps,
    initState:function(){ return {t:0}; },
    setStep:function(s,i){ s.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:function(s,t){ s.t = clamp(t,0,1); },

    draw:function(canvas, state, mode){
      var S = beginN(canvas, mode, 2,
                     (canvas.getBoundingClientRect().width || 900) < 560, 1);
      if(!S) return;
      var ctx=S.ctx, T=S.T, fs=S.fs, dpr=S.dpr;
      var s = derive(state).s;
      var uL = into(state, n, 2), uR = into(state, n, 4);
      var base = spec.shiftsIR ? IR : IS;
      var live = tween(base, spec.shifted, uL);
      var liveB = { Y: eq0.Y + (eq1.Y - eq0.Y)*uL, r: eq0.r + (eq1.r - eq0.r)*uL };
      var liveAD = tween(AD, spec.adShifted, uR);

      /* ── left: the IR–IS diagram at the price level P₁ ────────────── */
      var C1 = frame(ctx, S.boxes[0], axL, T, fs, dpr, 1, 'The economy at P₁');
      legendRow(ctx, [{ label:'IR(P₁)', color:T.blue }, { label:'IS', color:T.blue }]
                  .concat(uL > 0 ? [{ label:spec.tag, color:T.gold, dash:[10,7] }] : []),
                T, fs, dpr, C1.px, C1.px + C1.pw, C1.headY + C1.headH*0.5);
      paintIRIS(ctx, C1, axL, T, fs, dpr, s, {
        irStep:0, isStep:0, eqStep:1,
        liveIR: (uL > 0 &&  spec.shiftsIR) ? live : null,
        liveIS: (uL > 0 && !spec.shiftsIR) ? live : null,
        liveB:  uL > 0 ? liveB : null,
        bAnchor:spec.bAnchorL, ring:(s >= n)
      });

      /* ── right: aggregate demand, at the same price level throughout ─ */
      var C2 = frame(ctx, S.boxes[1], axR, T, fs, dpr, 1, 'Aggregate demand');
      legendRow(ctx, [{ label:'AD', color:T.blue }]
                  .concat(uR > 0 ? [{ label:'AD′', color:T.gold, dash:[10,7] }] : []),
                T, fs, dpr, C2.px, C2.px + C2.pw, C2.headY + C2.headH*0.5);
      clipped(ctx, C2, function(){
        drawLine(ctx, C2, AD, axR, T.blue, T, dpr);
        if(uR > 0) drawLine(ctx, C2, liveAD, axR, T.gold, T, dpr, [10*dpr,7*dpr]);
        if(s >= 1){
          guides(ctx, C2, axR, eq0.Y, 5, T.ink2, T, dpr, 0.55);
          labelledPoint(ctx, C2, eq0.Y, 5, 'A', T.blue, 'circle', T, fs, dpr, 'nw');
        }
        if(s >= 3){
          guides(ctx, C2, axR, eq1.Y, 5, T.gold, T, dpr, 0.6);
          labelledPoint(ctx, C2, eq1.Y, 5, 'B', T.gold, 'circle', T, fs, dpr,
                        spec.bAnchorR || 'se', s >= n);
          dataArrow(ctx, C2, eq0.Y, 2, eq1.Y, 2, T.red, T, fs, dpr, true);
          chipText(ctx, 'ΔY', C2.X((eq0.Y + eq1.Y)/2), C2.Y(2) + 12*fs*dpr,
                   'center', 'top', T.red, T, fs, dpr);
        }
      });

      bannerNote(ctx, S, spec.notes[s],
                 s >= n ? T.green : (s >= 2 ? T.red : T.ink2));
    },

    describe:function(state){ return spec.describe(derive(state).s); },
    ariaLabel:function(state){
      return derive(state).s >= 3 ? spec.ariaDone : spec.ariaBuilding;
    }
  };
}


/* ══ FIGURE: where the AD curve comes from ════════════════════════════════
   Three price levels, three IR curves, three equilibria — and those three
   output levels plotted against the price levels that produced them. That
   is the whole derivation: AD is not a new assumption, it is the IR–IS
   diagram answered once per price level.
   ════════════════════════════════════════════════════════════════════════ */

var figADDerivation = (function(){
  var P = [
    { ir:IR,      col:'blue',  letter:'A', P:5, tag:'IR(P₁)' },
    { ir:IR_UP,   col:'gold',  letter:'B', P:6, tag:'IR(P₂)' },
    { ir:IR_DOWN, col:'red',   letter:'C', P:4, tag:'IR(P₃)' }
  ];
  var steps = evenSteps(['Empty','P₁: A','P₂ is higher: B','P₃ is lower: C',
                         'Three points','That is the AD curve']);
  var n = steps.length - 1;
  var axL = axIRIS([4,5,6], [4,5,6]);
  var axR = axAD([4,5,6], [4,5,6]);

  function derive(state){
    return { s: clamp(Math.round(clamp(state.t,0,1)*n), 0, n) };
  }

  return {
    id:'fig-10-6-ad-derivation',
    title:'Where the aggregate demand curve comes from',
    caption:'The IR curve depends on the price level, so every price level gives a different ' +
            'IR curve and a different equilibrium output. Read three of them off the ' +
            'left-hand panel and plot each output against the price level that produced it: ' +
            'the downward-sloping line through those three points is the AD curve. Nothing ' +
            'new has been assumed.',
    panels:2, aspect:0.42, aspectStacked:1.15, steps:steps,
    initState:function(){ return {t:0}; },
    setStep:function(s,i){ s.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:function(s,t){ s.t = clamp(t,0,1); },

    draw:function(canvas, state, mode){
      var S = beginN(canvas, mode, 2,
                     (canvas.getBoundingClientRect().width || 900) < 560, 1);
      if(!S) return;
      var ctx=S.ctx, T=S.T, fs=S.fs, dpr=S.dpr;
      var s = derive(state).s, i;
      var shown = clamp(s, 0, 3);

      var C1 = frame(ctx, S.boxes[0], axL, T, fs, dpr, 1, 'One IR curve per price level');
      legendRow(ctx, P.slice(0, shown).map(function(p){
                  return { label:p.tag, color:T[p.col] }; })
                  .concat(s >= 1 ? [{ label:'IS', color:T.ink2 }] : []),
                T, fs, dpr, C1.px, C1.px + C1.pw, C1.headY + C1.headH*0.5);
      clipped(ctx, C1, function(){
        if(s >= 1) drawLine(ctx, C1, IS, axL, T.ink2, T, dpr);
        for(i=0;i<shown;i++){
          var e = meet(P[i].ir, IS);
          drawLine(ctx, C1, P[i].ir, axL, T[P[i].col], T, dpr, i ? [10*dpr,7*dpr] : null);
          guides(ctx, C1, axL, e.Y, e.r, T[P[i].col], T, dpr, 0.55);
          labelledPoint(ctx, C1, e.Y, e.r, P[i].letter, T[P[i].col], 'circle',
                        T, fs, dpr, 'nw');
        }
      });

      var C2 = frame(ctx, S.boxes[1], axR, T, fs, dpr, 1, 'The same three answers');
      legendRow(ctx, s >= 5 ? [{ label:'AD', color:T.blue }]
                            : [{ label:'one point per price level', color:T.muted }],
                T, fs, dpr, C2.px, C2.px + C2.pw, C2.headY + C2.headH*0.5);
      clipped(ctx, C2, function(){
        if(s >= 5) drawLine(ctx, C2, AD, axR, T.blue, T, dpr);
        for(i=0;i<shown;i++){
          var e = meet(P[i].ir, IS);
          guides(ctx, C2, axR, e.Y, P[i].P, T[P[i].col], T, dpr, 0.55);
          /* Three points one axis unit apart: the emphasis ring that marks a
             settled equilibrium elsewhere in this unit would here just be
             three overlapping circles, and the labels go above-RIGHT so all
             three sit on the same side of the line instead of each landing
             on its neighbour. */
          labelledPoint(ctx, C2, e.Y, P[i].P, P[i].letter, T[P[i].col], 'circle',
                        T, fs, dpr, 'ne');
        }
      });

      bannerNote(ctx, S,
        ['The IR–IS diagram on the left, output against the price level on the right.',
         'At the price level P₁ the IR curve is IR(P₁), and the economy settles at Y₁. Plot ' +
         'that output against P₁ — one point.',
         'A higher price level P₂ raises the IR curve, so the economy settles at the lower ' +
         'Y₂. Plot Y₂ against P₂.',
         'A lower price level P₃ lowers the IR curve, so output is the higher Y₃. Plot Y₃ ' +
         'against P₃.',
         'Three price levels, three outputs — and the higher the price level, the lower the ' +
         'output.',
         'Join them: that is the AD curve. It slopes down because a higher P raises r, and ' +
         'a higher r cuts investment and output.'][s],
        s >= 5 ? T.green : T.ink2);
    },

    describe:function(state){
      var s = derive(state).s;
      return [
        'Two empty panels. On the left, output against the interest rate; on the right, ' +
        'output against the price level.',
        'On the left the IS curve and the IR curve for the price level P one, crossing at ' +
        'point A with output Y one. On the right, that same output is plotted against P ' +
        'one, also labelled A. One price level has given one point.',
        'A higher price level, P two, raises the IR curve — the same money buys less, so ' +
        'the interest rate is higher at every level of output. The new crossing, B, is at ' +
        'the lower output Y two, and B appears on the right-hand panel at Y two and P two: ' +
        'above and to the left of A.',
        'A lower price level, P three, lowers the IR curve, and the crossing C is at the ' +
        'higher output Y three. C appears on the right at Y three and P three: below and to ' +
        'the right of A.',
        'All three points are on the right-hand panel, running from top left to bottom ' +
        'right. Each is a full goods-and-money-market equilibrium at its own price level.',
        'A downward-sloping line is drawn through the three points and labelled AD. That is ' +
        'the aggregate demand curve: not a new assumption, but the IR–IS diagram answered ' +
        'once for every price level. It slopes down because a higher price level raises the ' +
        'interest rate, and a higher interest rate cuts investment and so output.'
      ][s];
    },
    ariaLabel:function(state){
      return derive(state).s >= 4
        ? 'Three IR–IS equilibria at three price levels, plotted as three points that trace ' +
          'a downward-sloping aggregate demand curve.'
        : 'The derivation of the aggregate demand curve, being built up.';
    }
  };
})();

/* ── Figure 1: the two curves on one pair of axes ─────────────────────── */

var figIRIS = irisFigure({
  id:'fig-10-1-ir-is',
  title:'The IR and IS curves together',
  caption:'The IS curve gives the output the goods market settles at for each interest rate; ' +
          'the IR curve gives the interest rate the money market produces for each level of ' +
          'output. Only where they cross is both true at once. That crossing, A, is the ' +
          'equilibrium interest rate r₁ and the equilibrium output Y₁ for a given level of ' +
          'government purchases, taxes, money supply and price level.',
  ax: axIRIS([5], [5]),
  stepLabels:['Empty axes','The IR curve','The IS curve','Equilibrium at A'],
  irStep:1, isStep:2, eqStep:3,
  shifted:null, shiftsIR:false, shockStep:0, tag:'',
  notes:[
    'Output across, the interest rate up.',
    'IR: the interest rate the money market produces at each level of output — upward sloping.',
    'IS: the output the goods market settles at for each interest rate — downward sloping.',
    'Both hold only at A. That fixes r₁ and Y₁ together.'
  ],
  describe:function(s){
    return [
      'Empty axes. Income and output run across the bottom; the interest rate runs up the side.',
      'The IR curve is drawn, sloping upward from bottom left to top right. Higher output ' +
      'means more money demanded at a given price level, so the interest rate is higher.',
      'The IS curve is added, sloping downward. A higher interest rate cuts investment, which ' +
      'cuts planned expenditure, which cuts the output the goods market settles at.',
      'The two curves cross at point A, at output Y one and interest rate r one, with dashed ' +
      'lines dropped to both axes. A is the only pair of an interest rate and an output at ' +
      'which the goods market and the money market are both in equilibrium, given government ' +
      'purchases, taxes, the money supply and the price level.'
    ][s];
  },
  ariaDone:'The IR and IS curves crossing at point A, giving the equilibrium interest rate ' +
           'and the equilibrium level of output.',
  ariaBuilding:'The IR–IS diagram, being built up one curve at a time.'
});


/* ── Figures 2–5: one shock each ──────────────────────────────────────── */

var figGRise = irisFigure({
  id:'fig-10-2-g-rise',
  title:'An increase in government purchases',
  caption:'G↑ → PE↑ → U.I.↓ → Y↑. More government purchases raise planned expenditure at ' +
          'every interest rate, so the IS curve shifts right. Output rises to Y₃ — but the ' +
          'higher output raises money demand, so the interest rate rises to r₂ as well. ' +
          'Both go up.',
  ax: axIRIS([5,6], [5,6]),
  stepLabels:['The economy at A','Government purchases rise','The new equilibrium, B'],
  irStep:0, isStep:0, eqStep:0,
  shifted:IS_R, shiftsIR:false, shockStep:2, tag:'IS′', bAnchor:'se',
  notes:[
    'Start at A: output Y₁, interest rate r₁.',
    'G↑ → PE↑ → U.I.↓ → Y↑: the IS curve shifts right.',
    'B: output and the interest rate have both risen.'
  ],
  describe:function(s){
    return [
      'The IR and IS curves crossing at A, output Y one and interest rate r one.',
      'Government purchases rise. Planned expenditure is higher at every interest rate, so ' +
      'firms run down inventories and raise production. The IS curve slides to the right, ' +
      'and the crossing point travels up along the IR curve with it.',
      'The new equilibrium B sits above and to the right of A, at output Y three and interest ' +
      'rate r two. Output is higher, and because higher output means more money demanded, ' +
      'the interest rate is higher too. Fiscal expansion raises output and the interest rate ' +
      'together.'
    ][s];
  },
  ariaDone:'The IS curve shifted right by higher government purchases, raising both ' +
           'equilibrium output and the equilibrium interest rate.',
  ariaBuilding:'An increase in government purchases in the IR–IS diagram, being built up.'
});

var figTRise = irisFigure({
  id:'fig-10-3-t-rise',
  title:'An increase in taxes',
  caption:'T↑ → C↓ → PE↓ → U.I.↑ → Y↓ → r↓. Higher taxes cut disposable income and so ' +
          'consumption, which cuts planned expenditure at every interest rate: the IS curve ' +
          'shifts left. Output falls to Y₂, and the lower output means less money demanded, ' +
          'so the interest rate falls to r₃ as well.',
  ax: axIRIS([4,5], [4,5]),
  stepLabels:['The economy at A','Taxes rise','The new equilibrium, B'],
  irStep:0, isStep:0, eqStep:0,
  shifted:IS_L, shiftsIR:false, shockStep:2, tag:'IS′', bAnchor:'nw',
  notes:[
    'Start at A: output Y₁, interest rate r₁.',
    'T↑ → C↓ → PE↓ → U.I.↑ → Y↓: the IS curve shifts left.',
    'B: output and the interest rate have both fallen.'
  ],
  describe:function(s){
    return [
      'The IR and IS curves crossing at A, output Y one and interest rate r one.',
      'Taxes rise. Disposable income falls, so consumption and planned expenditure fall at ' +
      'every interest rate. Inventories pile up unsold, firms cut production, and the IS ' +
      'curve slides to the left, carrying the crossing point down the IR curve with it.',
      'The new equilibrium B sits below and to the left of A, at the lower output Y two and ' +
      'the lower interest rate r three. Note that the tax rise lowers the interest rate: less ' +
      'output means less money demanded, and the price of holding money falls.'
    ][s];
  },
  ariaDone:'The IS curve shifted left by higher taxes, lowering both equilibrium output and ' +
           'the equilibrium interest rate.',
  ariaBuilding:'An increase in taxes in the IR–IS diagram, being built up.'
});

var figMFall = irisFigure({
  id:'fig-10-4-m-fall',
  title:'A decrease in the money supply',
  caption:'M↓ → M/P↓ → r↑ → I↓ → U.I.↑ → Y↓. Less real money means a higher interest rate ' +
          'at every level of output, so the IR curve shifts up. The higher interest rate ' +
          'cuts investment and output falls to Y₂ — the interest rate rises and output ' +
          'falls, which is the signature of a monetary shock rather than a fiscal one.',
  ax: axIRIS([4,5], [5,6]),
  stepLabels:['The economy at A','The Fed cuts the money supply','The new equilibrium, B'],
  irStep:0, isStep:0, eqStep:0,
  shifted:IR_UP, shiftsIR:true, shockStep:2, tag:'IR′', bAnchor:'nw',
  notes:[
    'Start at A: output Y₁, interest rate r₁.',
    'M↓ → M/P↓ → r↑: the IR curve shifts up.',
    'B: a higher interest rate and lower output.'
  ],
  describe:function(s){
    return [
      'The IR and IS curves crossing at A, output Y one and interest rate r one.',
      'The Fed cuts the money supply. Real balances fall, so the interest rate is higher at ' +
      'every level of output and the IR curve slides upward. The crossing point travels up ' +
      'and to the left along the IS curve.',
      'The new equilibrium B is above and to the left of A: the interest rate has risen to r ' +
      'two and output has fallen to Y two. The higher interest rate cut investment, planned ' +
      'expenditure fell, inventories rose, and firms cut production. Unlike a fiscal shock, ' +
      'output and the interest rate move in opposite directions.'
    ][s];
  },
  ariaDone:'The IR curve shifted up by a cut in the money supply, raising the interest rate ' +
           'and lowering output.',
  ariaBuilding:'A decrease in the money supply in the IR–IS diagram, being built up.'
});

var figPriceRise = irisFigure({
  id:'fig-10-5-price-rise',
  title:'An increase in the price level',
  caption:'P↑ → M/P↓ → r↑ → I↓ → U.I.↑ → Y↓. A higher price level does the same thing to ' +
          'real balances that a cut in the money supply does: the same nominal money buys ' +
          'less, so the IR curve shifts up, the interest rate rises and output falls. This ' +
          'one figure is the whole reason the aggregate demand curve slopes down.',
  ax: axIRIS([4,5], [5,6]),
  stepLabels:['The economy at A','The price level rises','The new equilibrium, B'],
  irStep:0, isStep:0, eqStep:0,
  shifted:IR_UP, shiftsIR:true, shockStep:2, tag:'IR′', bAnchor:'nw',
  notes:[
    'Start at A: output Y₁ at the price level P₁.',
    'P↑ → M/P↓ → r↑: the IR curve shifts up.',
    'B: a higher price level has produced lower output.'
  ],
  describe:function(s){
    return [
      'The IR and IS curves crossing at A, output Y one and interest rate r one, at the ' +
      'price level P one.',
      'The price level rises. The Fed has not changed the money supply, but the same nominal ' +
      'money now buys less, so real balances fall and the interest rate is higher at every ' +
      'level of output. The IR curve slides upward.',
      'The new equilibrium B is above and to the left of A: a higher interest rate r two and ' +
      'a lower output Y two. A higher price level has produced a lower level of output — ' +
      'which is exactly the relationship the aggregate demand curve records.'
    ][s];
  },
  ariaDone:'The IR curve shifted up by a higher price level, raising the interest rate and ' +
           'lowering output.',
  ariaBuilding:'An increase in the price level in the IR–IS diagram, being built up.'
});


/* ── Figures 7–10: the same shock on both diagrams ────────────────────── */

var figADExpFiscal = irisAdFigure({
  id:'fig-10-7-ad-expansionary-fiscal',
  title:'Expansionary fiscal policy and aggregate demand',
  caption:'Expansionary fiscal policy — higher government purchases or lower taxes — shifts ' +
          'the IS curve right, raising output to Y₃. The price level has not moved: it is ' +
          'still P₁. So at the price level P₁ the economy now produces Y₃ rather than Y₁, ' +
          'and that is a point the old AD curve does not contain. AD shifts right.',
  ax:null,
  stepLabels:['Both diagrams at A','The economy at A','The IS curve shifts right',
              'Same price, more output','AD shifts right'],
  shifted:IS_R, shiftsIR:false, adShifted:AD_R, tag:'IS′',
  bAnchorL:'se', bAnchorR:'se',
  notes:[
    'Left: the IR–IS diagram at the price level P₁. Right: aggregate demand.',
    'The economy sits at A on both diagrams — output Y₁ at the price level P₁.',
    'Government purchases rise, or taxes fall: the IS curve shifts right and output rises to Y₃.',
    'The price level never moved. At P₁ the economy now produces Y₃ — a point off the old AD curve.',
    'So the AD curve itself must shift right. Expansionary fiscal policy raises aggregate demand.'
  ],
  describe:function(s){
    return [
      'Two panels. On the left the IR and IS curves for the price level P one; on the right ' +
      'the aggregate demand curve, output against the price level.',
      'Point A is marked on both panels: on the left where IR and IS cross, on the right at ' +
      'output Y one and price level P one.',
      'Expansionary fiscal policy shifts the IS curve to the right. The equilibrium travels ' +
      'up the IR curve to B, at the higher output Y three and the higher interest rate r two. ' +
      'The price level has not changed — the IR curve is still the one drawn for P one.',
      'On the right-hand panel a new point B appears at output Y three and the same price level ' +
      'P one, to the right of A. It is not on the old AD curve: at this price level the ' +
      'economy now produces more.',
      'The AD curve slides to the right so that it passes through B. An arrow along the ' +
      'bottom marks the increase in output at an unchanged price level. Expansionary fiscal ' +
      'policy shifts aggregate demand to the right.'
    ][s];
  },
  ariaDone:'Expansionary fiscal policy shifting the IS curve right and, at an unchanged ' +
           'price level, shifting the aggregate demand curve right.',
  ariaBuilding:'Expansionary fiscal policy on the IR–IS and aggregate demand diagrams, ' +
               'being built up.'
});

var figADConFiscal = irisAdFigure({
  id:'fig-10-8-ad-contractionary-fiscal',
  title:'Contractionary fiscal policy and aggregate demand',
  caption:'Contractionary fiscal policy — lower government purchases or higher taxes — ' +
          'shifts the IS curve left, cutting output to Y₂ while the price level stays at P₁. ' +
          'At P₁ the economy now produces less than before, so the AD curve shifts left.',
  ax:null,
  stepLabels:['Both diagrams at A','The economy at A','The IS curve shifts left',
              'Same price, less output','AD shifts left'],
  shifted:IS_L, shiftsIR:false, adShifted:AD_L, tag:'IS′',
  bAnchorL:'nw', bAnchorR:'nw',
  notes:[
    'Left: the IR–IS diagram at the price level P₁. Right: aggregate demand.',
    'The economy sits at A on both diagrams — output Y₁ at the price level P₁.',
    'Government purchases fall, or taxes rise: the IS curve shifts left and output falls to Y₂.',
    'The price level never moved. At P₁ the economy now produces only Y₂.',
    'So the AD curve shifts left. Contractionary fiscal policy lowers aggregate demand.'
  ],
  describe:function(s){
    return [
      'Two panels. On the left the IR and IS curves for the price level P one; on the right ' +
      'the aggregate demand curve, output against the price level.',
      'Point A is marked on both panels: on the left where IR and IS cross, on the right at ' +
      'output Y one and price level P one.',
      'Contractionary fiscal policy shifts the IS curve to the left. The equilibrium travels ' +
      'down the IR curve to B, at the lower output Y two and the lower interest rate r three, ' +
      'with the price level unchanged at P one.',
      'On the right-hand panel a new point B appears at output Y two and the same price level ' +
      'P one, to the left of A. At this price level the economy now produces less.',
      'The AD curve slides to the left so that it passes through B. An arrow along the bottom ' +
      'marks the fall in output at an unchanged price level. Contractionary fiscal policy ' +
      'shifts aggregate demand to the left.'
    ][s];
  },
  ariaDone:'Contractionary fiscal policy shifting the IS curve left and, at an unchanged ' +
           'price level, shifting the aggregate demand curve left.',
  ariaBuilding:'Contractionary fiscal policy on the IR–IS and aggregate demand diagrams, ' +
               'being built up.'
});

var figADExpMoney = irisAdFigure({
  id:'fig-10-9-ad-expansionary-money',
  title:'Expansionary monetary policy and aggregate demand',
  caption:'Expansionary monetary policy — an increase in the money supply — shifts the IR ' +
          'curve down: at every level of output the interest rate is lower. Investment rises ' +
          'and output rises to Y₃ while the price level stays at P₁, so the AD curve shifts ' +
          'right. Note that fiscal and monetary expansion move AD the same way but move the ' +
          'interest rate in opposite directions.',
  ax:null,
  stepLabels:['Both diagrams at A','The economy at A','The IR curve shifts down',
              'Same price, more output','AD shifts right'],
  shifted:IR_DOWN, shiftsIR:true, adShifted:AD_R, tag:'IR(P₁)′',
  bAnchorL:'se', bAnchorR:'se',
  notes:[
    'Left: the IR–IS diagram at the price level P₁. Right: aggregate demand.',
    'The economy sits at A on both diagrams — output Y₁ at the price level P₁.',
    'M↑ → M/P↑ → r↓ → I↑ → Y↑: the IR curve shifts down and output rises to Y₃.',
    'The price level never moved. At P₁ the economy now produces Y₃.',
    'So the AD curve shifts right. Expansionary monetary policy raises aggregate demand.'
  ],
  describe:function(s){
    return [
      'Two panels. On the left the IR and IS curves for the price level P one; on the right ' +
      'the aggregate demand curve, output against the price level.',
      'Point A is marked on both panels: on the left where IR and IS cross, on the right at ' +
      'output Y one and price level P one.',
      'The Fed raises the money supply. Real balances rise, so the interest rate is lower at ' +
      'every level of output and the IR curve slides downward. The equilibrium travels down ' +
      'the IS curve to B, at the higher output Y three and the lower interest rate r three. The ' +
      'price level has not changed.',
      'On the right-hand panel a new point B appears at output Y three and the same price level ' +
      'P one, to the right of A.',
      'The AD curve slides right so that it passes through B, with an arrow along the bottom ' +
      'marking the rise in output at an unchanged price level. Expansionary monetary policy ' +
      'shifts aggregate demand right — the same direction as fiscal expansion, but by ' +
      'lowering the interest rate rather than raising it.'
    ][s];
  },
  ariaDone:'Expansionary monetary policy shifting the IR curve down and, at an unchanged ' +
           'price level, shifting the aggregate demand curve right.',
  ariaBuilding:'Expansionary monetary policy on the IR–IS and aggregate demand diagrams, ' +
               'being built up.'
});

var figADConMoney = irisAdFigure({
  id:'fig-10-10-ad-contractionary-money',
  title:'Contractionary monetary policy and aggregate demand',
  caption:'Contractionary monetary policy — a decrease in the money supply — shifts the IR ' +
          'curve up: the interest rate is higher at every level of output, investment falls, ' +
          'and output falls to Y₂ with the price level still at P₁. The AD curve shifts left.',
  ax:null,
  stepLabels:['Both diagrams at A','The economy at A','The IR curve shifts up',
              'Same price, less output','AD shifts left'],
  shifted:IR_UP, shiftsIR:true, adShifted:AD_L, tag:'IR(P₁)′',
  bAnchorL:'nw', bAnchorR:'nw',
  notes:[
    'Left: the IR–IS diagram at the price level P₁. Right: aggregate demand.',
    'The economy sits at A on both diagrams — output Y₁ at the price level P₁.',
    'M↓ → M/P↓ → r↑ → I↓ → Y↓: the IR curve shifts up and output falls to Y₂.',
    'The price level never moved. At P₁ the economy now produces only Y₂.',
    'So the AD curve shifts left. Contractionary monetary policy lowers aggregate demand.'
  ],
  describe:function(s){
    return [
      'Two panels. On the left the IR and IS curves for the price level P one; on the right ' +
      'the aggregate demand curve, output against the price level.',
      'Point A is marked on both panels: on the left where IR and IS cross, on the right at ' +
      'output Y one and price level P one.',
      'The Fed cuts the money supply. Real balances fall, so the interest rate is higher at ' +
      'every level of output and the IR curve slides upward. The equilibrium travels up the ' +
      'IS curve to B, at the lower output Y two and the higher interest rate r two, with the ' +
      'price level unchanged.',
      'On the right-hand panel a new point B appears at output Y two and the same price level ' +
      'P one, to the left of A.',
      'The AD curve slides left so that it passes through B, with an arrow along the bottom ' +
      'marking the fall in output at an unchanged price level. Contractionary monetary policy ' +
      'shifts aggregate demand left.'
    ][s];
  },
  ariaDone:'Contractionary monetary policy shifting the IR curve up and, at an unchanged ' +
           'price level, shifting the aggregate demand curve left.',
  ariaBuilding:'Contractionary monetary policy on the IR–IS and aggregate demand diagrams, ' +
               'being built up.'
});


var figures = {
  'fig-10-1-ir-is':                    figIRIS,
  'fig-10-2-g-rise':                   figGRise,
  'fig-10-3-t-rise':                   figTRise,
  'fig-10-4-m-fall':                   figMFall,
  'fig-10-5-price-rise':               figPriceRise,
  'fig-10-6-ad-derivation':            figADDerivation,
  'fig-10-7-ad-expansionary-fiscal':   figADExpFiscal,
  'fig-10-8-ad-contractionary-fiscal': figADConFiscal,
  'fig-10-9-ad-expansionary-money':    figADExpMoney,
  'fig-10-10-ad-contractionary-money': figADConMoney
};

var ORDER = ['fig-10-1-ir-is','fig-10-2-g-rise','fig-10-3-t-rise','fig-10-4-m-fall',
             'fig-10-5-price-rise','fig-10-6-ad-derivation',
             'fig-10-7-ad-expansionary-fiscal','fig-10-8-ad-contractionary-fiscal',
             'fig-10-9-ad-expansionary-money','fig-10-10-ad-contractionary-money'];

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
global.EconFigures['unit-10'] = {
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
