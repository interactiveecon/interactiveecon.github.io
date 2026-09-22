/* ============================================================================
   unit-08.js — ECON 002, Unit 8: Fiscal Policy
   Shared figure module. SINGLE SOURCE OF TRUTH for every dynamic figure in
   this unit.

   Consumed by BOTH:
     classes/econ002/notes/unit-08/index.html   (mode 'notes')
     classes/econ002/notes/unit-08/deck.html    (mode 'stage')

   No pre-rendered charts in this unit — every figure is a diagram the
   source draws itself, so all six live here. They come in matched pairs:
   what a change in G does, and then the same three pictures for a change
   in T.

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
       subject to the test. */
    minGap = T.font.tick*fs*dpr*0.6; last = -1e9;
    for(i=0;i<cfg.xticks.length;i++){
      v = cfg.xticks[i]; tx = C.X(v);
      ctx.strokeStyle = T.axis; ctx.lineWidth = T.lw.axis*dpr;
      ctx.beginPath(); ctx.moveTo(tx, py+ph); ctx.lineTo(tx, py+ph+tickLen); ctx.stroke();
      var lab = xTx(v), lw = lab ? ctx.measureText(lab).width : 0;
      if(lab && tx - lw/2 - last >= minGap){
        ctx.fillText(lab, tx, py+ph+tickLen+2*fs*dpr);
        last = tx + lw/2;
      }
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
    var off = r + 6*fs*dpr;
    ctx.font = fnt(T,fs,dpr,'annot','700');
    if(anchor === 'se'){ ctx.textAlign='left';  ctx.textBaseline='top';    ctx.fillText(text, x+off*0.6, y+off*0.4); }
    else if(anchor === 'nw'){ ctx.textAlign='right'; ctx.textBaseline='bottom'; ctx.fillText(text, x-off*0.6, y-off*0.4); }
    else { ctx.textAlign='left'; ctx.textBaseline='bottom'; ctx.fillText(text, x+off*0.6, y-off*0.4); }
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


/* ══ DATA — transcribed from "Fiscal Policy.tex" ═══════════════════════════
   The same economy as Unit 7, run twice more with one policy lever moved:

     C = 100 + 0.5(Y − T)      I = 100 − 10r      r = 5, so I = 50

   Baseline   G = 100, T =  50   →  PE = 225 + 0.5Y,  Y* = 450   (point A)
   G rises    G = 200, T =  50   →  PE = 325 + 0.5Y,  Y* = 650   (point B)
   T rises    G = 100, T = 150   →  PE = 175 + 0.5Y,  Y* = 350   (point B)

   ΔG = +100 gives ΔY = +200: the government purchases multiplier
   1/(1 − MPC) = 2. ΔT = +100 gives ΔY = −100: the tax multiplier
   −MPC/(1 − MPC) = −1. Taxes move planned expenditure only through
   consumption, which is why the first round is ΔC = −MPC·ΔT = −50 rather
   than the full 100.

   The IS lines are the source's own: r = 27.5 − 0.05Y through (450, 5),
   r = 37.5 − 0.05Y through (650, 5) after G rises, and r = 22.5 − 0.05Y
   through (350, 5) after T rises.
   ════════════════════════════════════════════════════════════════════════ */

var MPC = 0.5;
var PE_BASE = line(225, MPC);     /* G = 100, T =  50 */
var PE_G    = line(325, MPC);     /* G = 200           */
var PE_T    = line(175, MPC);     /* T = 150           */
var Y45     = line(0, 1);
var IS_BASE = line(27.5, -0.05);
var IS_G    = line(37.5, -0.05);
var IS_T    = line(22.5, -0.05);

var AX_CROSS = {
  xmin:0, xmax:900, ymin:0, ymax:900,
  xticks:[0,100,200,300,400,500,600,700,800,900],
  yticks:[0,100,200,300,400,500,600,700,800,900],
  xlabel:'Aggregate income (Y)', ylabel:'Planned expenditure (PE)'
};
var AX_IS = {
  xmin:0, xmax:900, ymin:0, ymax:15,
  xticks:[0,100,200,300,400,500,600,700,800,900],
  yticks:[0,5,10,15],
  xlabel:'Output (Y)', ylabel:'Interest rate (r)'
};

/* Successive rounds of a multiplier process: each is MPC times the one
   before it, and they sum to first/(1 − MPC). */
function rounds(first, n){
  var out = [], v = first, i;
  for(i=0;i<n;i++){ out.push(v); v *= MPC; }
  return out;
}


/* ══ FIGURE BUILDER 1: a policy shift on the Keynesian cross ══════════════
   Both of this unit's cross figures are the same picture with the shift
   pointing the other way, so they are one builder. The shifted line slides
   out of the original rather than appearing beside it, and the equilibrium
   then walks along the 45° line to meet it.
   ════════════════════════════════════════════════════════════════════════ */

function crossShiftFigure(spec){
  var ax = AX_CROSS, PE0 = PE_BASE, PE1 = spec.shifted;
  var y0 = 450, y1 = spec.newY;
  var steps = evenSteps(spec.stepLabels);
  var n = steps.length - 1;

  function derive(state){
    return { s: clamp(Math.round(clamp(state.t,0,1)*n), 0, n) };
  }

  return {
    id:spec.id, title:spec.title, caption:spec.caption,
    panels:1, aspect:0.68, aspectStacked:1.0, steps:steps,
    initState:function(){ return {t:0}; },
    setStep:function(s,i){ s.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:function(s,t){ s.t = clamp(t,0,1); },

    draw:function(canvas, state, mode){
      var S = begin(canvas, mode); if(!S) return;
      var ctx=S.ctx, T=S.T, fs=S.fs, dpr=S.dpr;
      var s = derive(state).s;
      var uShift = into(state, n, 2), uMove = into(state, n, 4);
      var live   = tween(PE0, PE1, uShift);
      var yLive  = y0 + (y1 - y0)*uMove;
      var Cx = frame(ctx, S.box, ax, T, fs, dpr, 2);

      clipped(ctx, Cx, function(){
        drawLine(ctx, Cx, Y45, ax, T.ink2, T, dpr);
        if(s >= 1){
          drawLine(ctx, Cx, PE0, ax, T.blue, T, dpr);
          guides(ctx, Cx, ax, y0, y0, T.ink2, T, dpr, 0.5);
          labelledPoint(ctx, Cx, y0, y0, 'A', T.blue, 'circle', T, fs, dpr, 'nw');
        }
        if(uShift > 0){
          drawLine(ctx, Cx, live, ax, T.gold, T, dpr, [10*dpr,7*dpr]);
          /* out at Y = 780 the only things nearby are the two PE lines, and
             the readout sits above its bracket rather than inside it */
          vMeasure(ctx, Cx, 780, PE0.at(780), live.at(780), T.gold, T, fs, dpr);
          if(uShift >= 1){
            chipText(ctx, spec.shiftLabel, Cx.X(780),
                     Cx.Y(Math.max(PE0.at(780), PE1.at(780))) - 16*fs*dpr,
                     'center', 'bottom', T.gold, T, fs, dpr);
          }
        }
        if(s === 3){
          /* the gap at the old output: what is unsold, or what is missing */
          vMeasure(ctx, Cx, y0, Math.min(y0, PE1.at(y0)), Math.max(y0, PE1.at(y0)),
                   T.red, T, fs, dpr, spec.gapLabel, 'right');
        }
        if(uMove > 0){
          guides(ctx, Cx, ax, yLive, yLive, T.gold, T, dpr, 0.7);
          labelledPoint(ctx, Cx, yLive, yLive, 'B', T.gold, 'circle', T, fs, dpr,
                        spec.bAnchor, s >= 5);
        }
        if(s >= 5){
          hArrow(ctx, Cx, 120, y0, y1, T.red, T, fs, dpr);
          chipText(ctx, spec.dyLabel, Cx.X(Math.max(y0,y1) + 30), Cx.Y(120),
                   'left', 'middle', T.red, T, fs, dpr);
        }
      });

      legendRow(ctx, [{ label:'Y = PE, the 45° line', color:T.ink2 }]
                  .concat(s >= 1 ? [{ label:'PE = 225 + 0.5Y', color:T.blue }] : [])
                  .concat(uShift > 0 ? [{ label:spec.peTag, color:T.gold,
                                          dash:[10,7] }] : []),
                T, fs, dpr, Cx.px, Cx.px + Cx.pw, Cx.headY + Cx.headH*0.3);
      headNote(ctx, Cx, spec.notes[s],
               s >= 5 ? T.red : (s >= 2 ? T.gold : T.ink2), T, fs, dpr, 1);
    },

    describe:function(state){ return spec.describe(derive(state).s); },
    ariaLabel:function(state){
      return derive(state).s >= 4 ? spec.ariaDone : spec.ariaBuilding;
    }
  };
}


/* ══ FIGURE BUILDER 2: where a multiplier comes from ══════════════════════
   The source draws this as a sixteen-box flow chart, which is on the notes
   page as text. What a picture adds is the arithmetic: each round is MPC
   times the last, and the rounds sum to first ÷ (1 − MPC).
   ════════════════════════════════════════════════════════════════════════ */

function multiplierFigure(spec){
  var R = rounds(spec.first, 6), n = R.length;
  var total = spec.first/(1 - MPC);
  var up = spec.first > 0;
  var ax = {
    xmin:0.4, xmax:n + 1.4,
    ymin: up ? -5 : total*1.1, ymax: up ? total*1.1 : 5,
    xticks:[1,2,3,4,5,6],
    yticks: up ? [0,50,100,150,200] : [-100,-80,-60,-40,-20,0],
    xlabel:'Round of spending', ylabel:'Change in output (ΔY)'
  };
  var steps = [{ name:'blank', t:0, label:'Empty' }], k;
  for(k=1;k<=n;k++) steps.push({ name:'round-'+k, t:k/(n+1), label:'Round ' + k });
  steps.push({ name:'total', t:1, label:'The multiplier' });

  function derive(state){
    var f = clamp(state.t,0,1)*(n+1);
    var shown = clamp(Math.round(f), 0, n+1);
    return { k:Math.min(shown, n), done: shown > n };
  }
  function cum(k){ var t = 0, i; for(i=0;i<k;i++) t += R[i]; return t; }

  return {
    id:spec.id, title:spec.title, caption:spec.caption,
    panels:1, aspect:0.62, aspectStacked:0.95, steps:steps,
    initState:function(){ return {t:0}; },
    setStep:function(s,i){ s.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:function(s,t){ s.t = clamp(t,0,1); },

    draw:function(canvas, state, mode){
      var S = begin(canvas, mode); if(!S) return;
      var ctx=S.ctx, T=S.T, fs=S.fs, dpr=S.dpr;
      var d = derive(state), i, pts;
      var Cx = frame(ctx, S.box, ax, T, fs, dpr, 2);

      clipped(ctx, Cx, function(){
        if(d.done){
          polyline(ctx, Cx, [[ax.xmin, total],[ax.xmax, total]], T.green,
                   T.lw.guide*dpr, [8*dpr,6*dpr]);
        }
        for(i=0;i<d.k;i++){
          var x = i + 1, w = 0.17;
          ctx.save();
          ctx.fillStyle = T.blue;
          ctx.fillRect(Cx.X(x-w), Cx.Y(0), Cx.X(x+w) - Cx.X(x-w), Cx.Y(R[i]) - Cx.Y(0));
          ctx.restore();
          chipText(ctx, (R[i] > 0 ? '+' : '') + num(round2(R[i])), Cx.X(x),
                   Cx.Y(R[i]) + (up ? -8 : 8)*fs*dpr,
                   'center', up ? 'bottom' : 'top', T.blue, T, fs, dpr);
        }
        if(d.k >= 1){
          pts = [];
          for(i=0;i<d.k;i++) pts.push([i+1, cum(i+1)]);
          polyline(ctx, Cx, pts, T.red, T.lw.series*dpr);
          markers(ctx, Cx, pts, T.red, T.dot*dpr, 'diamond');
          /* Offset away from the bar as well as to the side of it: at round
             one the running total and that round's own value are the same
             number in the same place. It also flips to the left of the last
             point rather than running off the end of the plot. */
          var lbl = 'running total ' + (cum(d.k) > 0 ? '+' : '') + num(round2(cum(d.k)));
          ctx.save(); ctx.font = fnt(T,fs,dpr,'annot','700');
          var lw = ctx.measureText(lbl).width; ctx.restore();
          var right = Cx.X(d.k) + 20*fs*dpr + lw < Cx.px + Cx.pw;
          chipText(ctx, lbl, Cx.X(d.k) + (right ? 14 : -14)*fs*dpr,
                   Cx.Y(cum(d.k)) + (up ? 18 : -18)*fs*dpr,
                   right ? 'left' : 'right', 'middle', T.red, T, fs, dpr);
        }
      });

      legendRow(ctx, [{ label:'this round’s change', color:T.blue }]
                  .concat(d.k >= 1 ? [{ label:'running total', color:T.red,
                                        shape:'diamond' }] : [])
                  .concat(d.done ? [{ label:'ΔY = ' + (total>0?'+':'') +
                                             num(round2(total)), color:T.green,
                                      dash:[8,6] }] : []),
                T, fs, dpr, Cx.px, Cx.px + Cx.pw, Cx.headY + Cx.headH*0.3);
      headNote(ctx, Cx,
        d.done ? spec.doneNote
        : d.k === 0 ? spec.blankNote
        : d.k === 1 ? spec.firstNote
        : 'Round ' + d.k + ': income changed by ' + num(round2(R[d.k-2])) +
          ' last round, so consumption changes by MPC × that = ' +
          num(round2(R[d.k-1])) + ', and firms adjust again.',
        d.done ? T.green : T.ink2, T, fs, dpr, 1);
    },

    describe:function(state){
      var d = derive(state), i, parts;
      if(d.k === 0) return spec.blankDesc;
      if(d.done){
        parts = [];
        for(i=0;i<R.length;i++) parts.push(num(round2(R[i])));
        return 'All six rounds are shown, each half the one before it: ' +
          parts.join(', ') + ', and so on. The running total, a line of diamonds, ' +
          'reaches ' + num(round2(cum(6))) + ' after six rounds and is closing in on a ' +
          'dashed line at ' + num(round2(total)) + '. ' + spec.doneDesc;
      }
      if(d.k === 1) return spec.firstDesc;
      return 'Round ' + d.k + ': a bar of ' + num(round2(R[d.k-1])) + '. Income changed ' +
        'by ' + num(round2(R[d.k-2])) + ' in the previous round, and households spend the ' +
        'MPC of that, so consumption changes by ' + num(round2(R[d.k-1])) + ' and firms ' +
        'adjust production by the same amount again. The running total is now ' +
        num(round2(cum(d.k))) + '.';
    },
    ariaLabel:function(state){
      var d = derive(state);
      return d.done
        ? 'Six rounds of changing output, each half the last, with a running total closing ' +
          'in on ' + num(round2(total)) + '.'
        : 'The multiplier rounds, being built up.';
    }
  };
}


/* ══ FIGURE BUILDER 3: the same policy, seen on the IS curve ══════════════
   Two panels. The goods market on the left, at one fixed interest rate;
   the IS curve on the right, which has to move so that it still passes
   through the equilibrium the left-hand panel just produced.
   ════════════════════════════════════════════════════════════════════════ */

function isShiftFigure(spec){
  var PE0 = PE_BASE, PE1 = spec.shifted;
  var y0 = 450, y1 = spec.newY;
  var steps = evenSteps(spec.stepLabels);
  var n = steps.length - 1;

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
      var uShift = into(state, n, 2), uIS = into(state, n, 4);
      var livePE = tween(PE0, PE1, uShift);
      var yLive  = y0 + (y1 - y0)*uShift;
      var liveIS = tween(IS_BASE, spec.isShifted, uIS);

      /* ── left: the goods market at r = 5 ─────────────────────────── */
      var C1 = frame(ctx, S.boxes[0], AX_CROSS, T, fs, dpr, 1, 'The goods market');
      legendRow(ctx, [{ label:'45°', color:T.ink2 },
                      { label:'PE', color:T.blue }]
                  .concat(uShift > 0 ? [{ label:'PE′', color:T.gold, dash:[10,7] }] : []),
                T, fs, dpr, C1.px, C1.px + C1.pw, C1.headY + C1.headH*0.5);
      clipped(ctx, C1, function(){
        drawLine(ctx, C1, Y45, AX_CROSS, T.ink2, T, dpr);
        drawLine(ctx, C1, PE0, AX_CROSS, T.blue, T, dpr);
        guides(ctx, C1, AX_CROSS, y0, y0, T.blue, T, dpr, 0.6);
        labelledPoint(ctx, C1, y0, y0, 'A', T.blue, 'circle', T, fs, dpr, 'nw');
        if(uShift > 0){
          drawLine(ctx, C1, livePE, AX_CROSS, T.gold, T, dpr, [10*dpr,7*dpr]);
          guides(ctx, C1, AX_CROSS, yLive, yLive, T.gold, T, dpr, 0.6);
          labelledPoint(ctx, C1, yLive, yLive, 'B', T.gold, 'circle', T, fs, dpr,
                        spec.bAnchor);
        }
      });

      /* ── right: the interest rate was never allowed to move ──────── */
      var C2 = frame(ctx, S.boxes[1], AX_IS, T, fs, dpr, 1, 'The IS curve');
      legendRow(ctx, [{ label:'IS', color:T.green }]
                  .concat(uIS > 0 ? [{ label:'IS′', color:T.gold, dash:[10,7] }] : []),
                T, fs, dpr, C2.px, C2.px + C2.pw, C2.headY + C2.headH*0.5);
      clipped(ctx, C2, function(){
        polyline(ctx, C2, linePts(IS_BASE, AX_IS, 275, 525), T.green, T.lw.series*dpr);
        if(uIS > 0){
          polyline(ctx, C2, linePts(liveIS, AX_IS, 275 + (spec.isFrom - 275)*uIS,
                                    525 + (spec.isTo - 525)*uIS),
                   T.gold, T.lw.series*dpr, [10*dpr,7*dpr]);
        }
        if(s >= 1){
          guides(ctx, C2, AX_IS, y0, 5, T.blue, T, dpr, 0.6);
          labelledPoint(ctx, C2, y0, 5, 'A', T.blue, 'circle', T, fs, dpr, 'nw');
        }
        if(s >= 3){
          guides(ctx, C2, AX_IS, y1, 5, T.gold, T, dpr, 0.6);
          labelledPoint(ctx, C2, y1, 5, 'B', T.gold, 'circle', T, fs, dpr, 'se',
                        s >= 5);
          /* Between the two drop-lines, low enough to clear the ring drawn
             round B — that ring is over a unit and a half of r tall at
             projection sizes, so an arrow tucked just under the points ran
             straight through it. The readout goes below the arrow rather
             than above it, where its background chip covered both the
             arrow's tail and the ring. */
          dataArrow(ctx, C2, y0, 2, y1, 2, T.red, T, fs, dpr, true);
          chipText(ctx, 'ΔY', C2.X((y0 + y1)/2), C2.Y(2) + 12*fs*dpr,
                   'center', 'top', T.red, T, fs, dpr);
        }
      });

      bannerNote(ctx, S, spec.notes[s],
                 s >= 4 ? T.gold : (s >= 2 ? T.red : T.ink2));
    },

    describe:function(state){ return spec.describe(derive(state).s); },
    ariaLabel:function(state){
      return derive(state).s >= 4 ? spec.ariaDone : spec.ariaBuilding;
    }
  };
}


/* ══ THE SIX FIGURES ══════════════════════════════════════════════════════
   Three pictures for a change in government purchases, then the same three
   for a change in taxes. Reading them side by side is the point of the
   unit: G moves planned expenditure directly, T moves it only through
   consumption, and that one difference is the whole gap between the two
   multipliers.
   ════════════════════════════════════════════════════════════════════════ */

var figGRise = crossShiftFigure({
  id:'fig-8-1-g-rise', shifted:PE_G, newY:650,
  title:'An increase in government purchases',
  caption:'G goes from 100 to 200. Government purchases sit inside planned expenditure ' +
          'directly, so the PE line rises by the full 100 at every level of output. At the ' +
          'old output of 450 people now plan to buy 100 more than is being produced, ' +
          'inventories are drawn down, and firms raise production &mdash; by 200, twice ' +
          'the change in G.',
  stepLabels:['Empty','A at G = 100','G rises to 200','Y < PE at the old output',
              'B: the new equilibrium','ΔY is twice ΔG'],
  shiftLabel:'ΔG = +100', peTag:'PE′ = 325 + 0.5Y', gapLabel:'PE − Y = 100',
  dyLabel:'ΔY = +200', bAnchor:'se',
  notes:[
    'The Keynesian cross again, ready for a change in policy.',
    'Start at A: G = 100, so PE = 225 + 0.5Y and equilibrium output is 450.',
    'G ↑ by 100 → PE ↑ by 100 at every level of output. The line moves straight up.',
    'At the old output of 450, planned spending is now 550. Y < PE by 100, so inventories ' +
    'are drawn down.',
    'Firms raise production until output meets the new line again — B, at Y = 650.',
    'G rose 100; output rose 200. The multiplier, 1/(1 − MPC) = 2, is that gap.'
  ],
  describe:function(s){
    return [
      'The Keynesian cross axes with only the 45 degree line drawn.',
      'The planned expenditure line for G equal to 100 is drawn, and point A is marked ' +
      'where it crosses the 45 degree line at output 450.',
      'A second, dashed gold line appears parallel to the first and 100 above it: planned ' +
      'expenditure when government purchases are 200. A measure between the two lines ' +
      'marks the rise of 100, which is the change in G. Government purchases are part of ' +
      'planned expenditure directly, so the line moves by the full amount.',
      'At the old output of 450, the new planned expenditure line is at 550. A measure ' +
      'shows the gap of 100: planned spending now exceeds output, so 100 of goods are sold ' +
      'out of inventory that firms had not planned to run down, and they have a reason to ' +
      'raise production.',
      'Point B is marked where the new line crosses the 45 degree line, at output 650.',
      'An arrow along the bottom runs from 450 out to 650, labelled change in Y equals plus ' +
      '200, and B is circled. Government purchases rose by 100 but output rose by 200 — ' +
      'twice as much. The ratio is the government purchases multiplier, one over one minus ' +
      'the MPC, which with an MPC of 0.5 is 2.'
    ][s];
  },
  ariaDone:'The planned expenditure line shifted up by 100, moving equilibrium output from ' +
           '450 to 650.',
  ariaBuilding:'An increase in government purchases on the Keynesian cross, being built up.'
});

var figGMultiplier = multiplierFigure({
  id:'fig-8-2-g-multiplier', first:100,
  title:'Why output rises by more than government purchases',
  caption:'The sixteen steps above, as arithmetic. G rises 100, so firms produce 100 more; ' +
          'that is 100 more income, so consumption rises by MPC × 100 = 50, so firms ' +
          'produce another 50. Each round is half the last, and the running total closes in ' +
          'on 200 — twice the original 100. That ratio is the multiplier, 1/(1 − MPC).',
  blankNote:'Government purchases rise by 100. Follow what firms do about it, one round at ' +
            'a time.',
  firstNote:'Round 1: firms produce the extra 100 the government is buying.',
  doneNote:'ΔY = ΔG ÷ (1 − MPC) = 100 ÷ 0.5 = 200. The rounds never quite stop; the sum does.',
  blankDesc:'An empty plot with the round of spending on the horizontal axis and the change ' +
            'in output on the vertical, running from 0 up to about 220. Government ' +
            'purchases have just risen by 100, and the rounds that follow are about to be ' +
            'plotted.',
  firstDesc:'Round 1: a bar of plus 100. The government is buying 100 more, so firms ' +
            'produce 100 more. The running total is plus 100.',
  doneDesc:'The rounds never actually stop, but their sum does: the change in output equals ' +
           'the change in government purchases divided by one minus the MPC, which is 100 ' +
           'over 0.5, or 200. That is the government purchases multiplier, and it is why ' +
           'output rises by twice as much as G.'
});

var figGIS = isShiftFigure({
  id:'fig-8-3-g-is', shifted:PE_G, newY:650, isShifted:IS_G,
  isFrom:475, isTo:725, bAnchor:'se',
  title:'Government purchases and the IS curve',
  caption:'The interest rate never moved: the whole story on the left happened at r = 5. So ' +
          'the same interest rate now goes with a higher equilibrium output, and the IS ' +
          'curve has to move right to pass through it. Every point on IS′ is a goods-market ' +
          'equilibrium with G = 200.',
  stepLabels:['Empty','A: r = 5, Y = 450','G rises','B: r = 5, Y = 650',
              'IS shifts right','Every rate, 200 higher'],
  notes:[
    'The goods market on the left, the interest rate on the right — and r is held at 5 ' +
    'throughout.',
    'At r = 5 with G = 100, the equilibrium is Y = 450. That is A, on both panels.',
    'G rises to 200, so PE rises and the equilibrium moves out to 650.',
    'The interest rate is still 5, but the equilibrium output is now 650. That is B.',
    'A is on IS and B is not, so IS must move: the curve shifts right to run through B.',
    'IS′ sits 200 to the right of IS at every interest rate, because the multiplier works ' +
    'the same way at any r.'
  ],
  describe:function(s){
    return [
      'Two panels. On the left the Keynesian cross with the 45 degree line and the planned ' +
      'expenditure line for G equal to 100; on the right the IS curve, sloping downward.',
      'Point A is marked on both panels: on the left where the two lines cross at output ' +
      '450, and on the right at an interest rate of 5 and an output of 450.',
      'On the left a dashed gold line rises 100 above the original and the equilibrium ' +
      'slides out along the 45 degree line to 650.',
      'On the right, point B is plotted at the same interest rate of 5 but at an output of ' +
      '650, to the right of A, with an arrow running from A to B. Nothing about the ' +
      'interest rate changed; only the amount of output the goods market settles at.',
      'A dashed gold line is drawn through B parallel to the original IS curve and 200 to ' +
      'its right, labelled IS prime. B is circled.',
      'The whole picture is up. Because A is on IS and B is not, IS could not have stayed ' +
      'where it was: a rise in government purchases shifts the IS curve right, by the ' +
      'multiplier times the change in G, at every interest rate.'
    ][s];
  },
  ariaDone:'The Keynesian cross beside an IS curve shifted 200 to the right by a rise in ' +
           'government purchases.',
  ariaBuilding:'Government purchases and the IS curve, being built up.'
});

var figTRise = crossShiftFigure({
  id:'fig-8-4-t-rise', shifted:PE_T, newY:350,
  title:'An increase in taxes',
  caption:'T goes from 50 to 150. Taxes are <em>not</em> part of planned expenditure, so ' +
          'the line does not fall by 100 — it falls by what consumption falls, which is ' +
          'MPC × ΔT = 50. Output then falls by 100: less than twice the tax rise, and in ' +
          'the opposite direction.',
  stepLabels:['Empty','A at T = 50','T rises to 150','Y > PE at the old output',
              'B: the new equilibrium','ΔY is −MPC/(1−MPC) × ΔT'],
  shiftLabel:'ΔC = −50', peTag:'PE′ = 175 + 0.5Y', gapLabel:'Y − PE = 50',
  dyLabel:'ΔY = −100', bAnchor:'se',
  notes:[
    'The same axes, with the other policy lever this time.',
    'Start at A again: T = 50, PE = 225 + 0.5Y, equilibrium output 450.',
    'T ↑ by 100 → C ↓ by MPC × 100 = 50. The line falls by 50, not by 100.',
    'At the old output of 450, planned spending is only 400. Y > PE by 50, so inventories ' +
    'pile up.',
    'Firms cut production until output meets the new line again — B, at Y = 350.',
    'T rose 100; output fell 100. The tax multiplier is −MPC/(1 − MPC) = −1.'
  ],
  describe:function(s){
    return [
      'The Keynesian cross axes with only the 45 degree line drawn.',
      'The planned expenditure line for T equal to 50 is drawn, and point A is marked where ' +
      'it crosses the 45 degree line at output 450.',
      'A second, dashed gold line appears parallel to the first and 50 below it. The measure ' +
      'between them is labelled change in C equals minus 50, not minus 100: taxes are not ' +
      'part of planned expenditure, so the line moves by the amount consumption moves, ' +
      'which is the MPC times the change in taxes.',
      'At the old output of 450, the new planned expenditure line is at 400. A measure shows ' +
      'the gap of 50: output exceeds planned spending, so 50 of goods go unsold into ' +
      'unplanned inventory and firms have a reason to cut production.',
      'Point B is marked where the new line crosses the 45 degree line, at output 350.',
      'An arrow along the bottom runs from 450 back to 350, labelled change in Y equals ' +
      'minus 100, and B is circled. Taxes rose by 100 and output fell by 100. The tax ' +
      'multiplier is minus the MPC over one minus the MPC, which with an MPC of 0.5 is ' +
      'minus 1 — smaller in size than the government purchases multiplier, and opposite in ' +
      'sign, because a tax change only reaches spending through consumption.'
    ][s];
  },
  ariaDone:'The planned expenditure line shifted down by 50, moving equilibrium output from ' +
           '450 to 350.',
  ariaBuilding:'An increase in taxes on the Keynesian cross, being built up.'
});

var figTMultiplier = multiplierFigure({
  id:'fig-8-5-t-multiplier', first:-50,
  title:'Why the tax multiplier is smaller',
  caption:'The same cascade, started differently. A tax rise of 100 does not cut spending ' +
          'by 100 — it cuts consumption by MPC × 100 = 50, and the first round is that 50. ' +
          'Every round after it is half the one before, exactly as with G. Starting from a ' +
          'smaller first round is the entire reason the tax multiplier is smaller.',
  blankNote:'Taxes rise by 100 — but the first round is what consumption does, not what ' +
            'taxes do.',
  firstNote:'Round 1: ΔC = −MPC × ΔT = −50, so firms cut production by 50, not by 100.',
  doneNote:'ΔY = −MPC × ΔT ÷ (1 − MPC) = −50 ÷ 0.5 = −100. Same cascade, smaller start.',
  blankDesc:'An empty plot with the round of spending on the horizontal axis and the change ' +
            'in output on the vertical, running from 0 down to about minus 110. Taxes have ' +
            'just risen by 100, and the rounds that follow are about to be plotted.',
  firstDesc:'Round 1: a bar of minus 50. The tax rise of 100 cuts consumption by the MPC ' +
            'times 100, which is 50, so firms cut production by 50 — not by the full 100. ' +
            'The running total is minus 50.',
  doneDesc:'The rounds never actually stop, but their sum does: minus 50 over 0.5, or minus ' +
           '100. Compare with government purchases, where the first round was the full 100 ' +
           'and the total was 200. The cascade is identical; only the first round differs, ' +
           'and that is the whole difference between the two multipliers.'
});

var figTIS = isShiftFigure({
  id:'fig-8-6-t-is', shifted:PE_T, newY:350, isShifted:IS_T,
  isFrom:175, isTo:425, bAnchor:'nw',
  title:'Taxes and the IS curve',
  caption:'Again the interest rate never moved. The same r = 5 now goes with a lower ' +
          'equilibrium output, so the IS curve shifts left to pass through the new point. ' +
          'Higher taxes move IS left; lower taxes move it right.',
  stepLabels:['Empty','A: r = 5, Y = 450','T rises','B: r = 5, Y = 350',
              'IS shifts left','Every rate, 100 lower'],
  notes:[
    'The goods market on the left, the interest rate on the right — and r is held at 5 ' +
    'throughout.',
    'At r = 5 with T = 50, the equilibrium is Y = 450. That is A, on both panels.',
    'T rises to 150, so consumption falls, PE falls, and the equilibrium moves in to 350.',
    'The interest rate is still 5, but the equilibrium output is now 350. That is B.',
    'A is on IS and B is not, so IS must move: the curve shifts left to run through B.',
    'IS′ sits 100 to the left of IS at every interest rate. Higher taxes, less output, at ' +
    'any r.'
  ],
  describe:function(s){
    return [
      'Two panels. On the left the Keynesian cross with the 45 degree line and the planned ' +
      'expenditure line for T equal to 50; on the right the IS curve, sloping downward.',
      'Point A is marked on both panels: on the left where the two lines cross at output ' +
      '450, and on the right at an interest rate of 5 and an output of 450.',
      'On the left a dashed gold line drops 50 below the original and the equilibrium slides ' +
      'back along the 45 degree line to 350.',
      'On the right, point B is plotted at the same interest rate of 5 but at an output of ' +
      '350, to the left of A, with an arrow running from A to B.',
      'A dashed gold line is drawn through B parallel to the original IS curve and 100 to ' +
      'its left, labelled IS prime. B is circled.',
      'The whole picture is up. A rise in taxes shifts the IS curve left, by the tax ' +
      'multiplier times the change in T, at every interest rate — the mirror image of what ' +
      'a rise in government purchases did.'
    ][s];
  },
  ariaDone:'The Keynesian cross beside an IS curve shifted 100 to the left by a rise in ' +
           'taxes.',
  ariaBuilding:'Taxes and the IS curve, being built up.'
});

var figures = {
  'fig-8-1-g-rise':       figGRise,
  'fig-8-2-g-multiplier': figGMultiplier,
  'fig-8-3-g-is':         figGIS,
  'fig-8-4-t-rise':       figTRise,
  'fig-8-5-t-multiplier': figTMultiplier,
  'fig-8-6-t-is':         figTIS
};

var ORDER = ['fig-8-1-g-rise','fig-8-2-g-multiplier','fig-8-3-g-is',
             'fig-8-4-t-rise','fig-8-5-t-multiplier','fig-8-6-t-is'];

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
global.EconFigures['unit-08'] = {
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
