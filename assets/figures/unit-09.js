/* ============================================================================
   unit-09.js — ECON 002, Unit 9: Money
   Shared figure module. SINGLE SOURCE OF TRUTH for every dynamic figure in
   this unit.

   Consumed by BOTH:
     classes/econ002/notes/unit-09/index.html   (mode 'notes')
     classes/econ002/notes/unit-09/deck.html    (mode 'stage')

   One pre-rendered chart (M1 and M2 over time) ships as an image under
   assets/figures/unit-09/. The six diagrams the source draws itself live
   here: the deposit cascade, the money market and the three things that
   move it, and the interest-rate rule.

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


/* ══ DATA — transcribed from "Money.tex" ══════════════════════════════════
   Two running examples.

   Deposit creation, line 507. A $100 deposit into a system of banks that
   hold a 20% reserve ratio and lend the rest, with nobody holding cash:
   deposits of 100, 80, 64, 51.20, … which sum to 500. The money
   multiplier is 1/rr = 5, and M = m̂ × R = 5 × 100 = 500. Reserves never
   grow — 20 + 16 + 12.80 + … = 100, the amount the Fed put in.

   The money market, line 709. Demand for real balances L(r, Y₁) is drawn
   as r = 10 − M/P; supply is the vertical line the Fed sets. The three
   shocks the source then works through:

     P ↑   supply falls to M/P = 3   →  r rises from 5 to 7
     Y ↑   demand shifts out to r = 12 − M/P, supply still 5  →  r 5 to 7
     M ↑   supply rises to M/P = 7   →  r falls from 5 to 3

   The interest rate rule, line 968. IR₁ = 0.5 + 0.0025Y, with IR₂ = 2.5 +
   0.0025Y above it and IR₃ = −1.5 + 0.0025Y below, and A, B, C read off at
   Y = 2000: r = 5.5, 7.5 and 3.5.

   One source note: the arrow in the "Increase in the Money Supply" picture
   is labelled M↓ while the line moves right and the algebra beside it says
   M↑ → M/P↑ → r↓. The picture and the algebra agree; the arrow's label is
   the odd one out, and it reads M↑ here.
   ════════════════════════════════════════════════════════════════════════ */

var RR = 0.2;

/* Each round of deposits is (1 − rr) times the one before it. */
function cascade(first, n){
  var out = [], v = first, i;
  for(i=0;i<n;i++){ out.push(v); v *= (1 - RR); }
  return out;
}

var L1 = line(10, -1);      /* demand for real balances, L(r, Y₁) */
var L2 = line(12, -1);      /* after a rise in income, L(r, Y₂)   */

function moneyAxis(xt, xn, yt, yn){
  return {
    xmin:0, xmax:10, ymin:0, ymax:10,
    xticks:[0].concat(xt), yticks:[0].concat(yt),
    xtickText:function(v){ var i = xt.indexOf(v); return i < 0 ? '0' : xn[i]; },
    ytickText:function(v){ var i = yt.indexOf(v); return i < 0 ? '0' : yn[i]; },
    xlabel:'Real money balances (M/P)', ylabel:'Interest rate (r)'
  };
}

var AX_IR = {
  xmin:0, xmax:2500, ymin:0, ymax:10,
  xticks:[0,500,1000,1500,2000,2500], yticks:[0,2,4,6,8,10],
  xlabel:'Aggregate output (income): Y', ylabel:'Interest rate: r'
};


/* ══ FIGURE 1: how a deposit becomes five ═════════════════════════════════
   The three T-accounts above this figure are the same story told once per
   bank. What a picture adds is that the story does not stop at bank three:
   the rounds shrink by the reserve ratio and their sum is what the money
   multiplier computes in one line.
   ════════════════════════════════════════════════════════════════════════ */

var figCreation = (function(){
  var R = cascade(100, 6), n = R.length, total = 100/RR;
  var ax = {
    xmin:0.4, xmax:n + 1.4, ymin:0, ymax:total*1.12,
    xticks:[1,2,3,4,5,6], yticks:[0,100,200,300,400,500],
    xlabel:'Bank', ylabel:'Dollars'
  };
  var steps = [{ name:'blank', t:0, label:'Empty' }], k;
  for(k=1;k<=n;k++) steps.push({ name:'bank-'+k, t:k/(n+1), label:'Bank ' + k });
  steps.push({ name:'total', t:1, label:'M = m̂ × R' });

  function derive(state){
    var f = clamp(state.t,0,1)*(n+1);
    var shown = clamp(Math.round(f), 0, n+1);
    return { k:Math.min(shown, n), done: shown > n };
  }
  function cum(k){ var t = 0, i; for(i=0;i<k;i++) t += R[i]; return t; }

  return {
    id:'fig-9-1-money-creation',
    title:'How a $100 deposit becomes $500 of money',
    caption:'Each bank keeps 20% of what it takes in and lends the rest, and the loan ' +
            'becomes somebody else’s deposit. The deposits shrink by a fifth each round ' +
            'but they never quite stop, and their total closes in on $500 — which is what ' +
            'the money multiplier, 1/rr = 5, computes in one line. The reserves behind it ' +
            'are still only the $100 the Fed put in.',
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
          chipText(ctx, money(round2(R[i])), Cx.X(x), Cx.Y(R[i]) - 8*fs*dpr,
                   'center', 'bottom', T.blue, T, fs, dpr);
        }
        if(d.k >= 1){
          pts = [];
          for(i=0;i<d.k;i++) pts.push([i+1, cum(i+1)]);
          polyline(ctx, Cx, pts, T.red, T.lw.series*dpr);
          markers(ctx, Cx, pts, T.red, T.dot*dpr, 'diamond');
          var lbl = 'total deposits ' + money(round2(cum(d.k)));
          ctx.save(); ctx.font = fnt(T,fs,dpr,'annot','700');
          var lw = ctx.measureText(lbl).width; ctx.restore();
          var right = Cx.X(d.k) + 20*fs*dpr + lw < Cx.px + Cx.pw;
          chipText(ctx, lbl, Cx.X(d.k) + (right ? 14 : -14)*fs*dpr,
                   Cx.Y(cum(d.k)) + 18*fs*dpr,
                   right ? 'left' : 'right', 'middle', T.red, T, fs, dpr);
        }
      });

      legendRow(ctx, [{ label:'this bank’s deposit', color:T.blue }]
                  .concat(d.k >= 1 ? [{ label:'deposits so far', color:T.red,
                                        shape:'diamond' }] : [])
                  .concat(d.done ? [{ label:'M = $500', color:T.green, dash:[8,6] }] : []),
                T, fs, dpr, Cx.px, Cx.px + Cx.pw, Cx.headY + Cx.headH*0.3);
      headNote(ctx, Cx,
        d.done ? 'M = m̂ × R = (1 ÷ 0.2) × 100 = 5 × 100 = 500. The lending never stops; ' +
                 'the sum does.'
        : d.k === 0 ? 'The Fed puts $100 of reserves into the system. Follow where it goes.'
        : d.k === 1 ? 'Bank 1 takes the $100 deposit, keeps $20 on reserve and lends $80.'
        : 'Bank ' + d.k + ' receives the ' + money(round2(R[d.k-1])) + ' bank ' + (d.k-1) +
          ' lent, keeps a fifth of it and lends the rest on.',
        d.done ? T.green : T.ink2, T, fs, dpr, 1);
    },

    describe:function(state){
      var d = derive(state), i, parts;
      if(d.k === 0) return 'An empty chart with the bank number along the bottom and dollars ' +
        'up the side, running from 0 to about 560. A hundred dollars of reserves has just ' +
        'entered the banking system.';
      if(d.done){
        parts = [];
        for(i=0;i<R.length;i++) parts.push(money(round2(R[i])));
        return 'All six banks are shown, each deposit four fifths of the one before it: ' +
          parts.join(', ') + ', and so on. The running total, a line of diamonds, has ' +
          'reached ' + money(round2(cum(6))) + ' after six banks and is closing in on a ' +
          'dashed line at $500. That $500 is what the money multiplier gives directly: M ' +
          'equals m hat times R, which is one over the reserve ratio times reserves, one ' +
          'over 0.2 times 100, which is five times 100. The banking system created $400 of ' +
          'deposits out of $100 of reserves, and the reserves themselves never grew.';
      }
      if(d.k === 1) return 'Bank 1: a bar of $100. That is the original deposit. The bank ' +
        'keeps $20 on reserve and lends $80, which becomes a deposit at bank 2. Total ' +
        'deposits so far: $100.';
      return 'Bank ' + d.k + ': a bar of ' + money(round2(R[d.k-1])) + '. This is the loan ' +
        'bank ' + (d.k-1) + ' made, arriving as a deposit. The bank keeps a fifth of it on ' +
        'reserve and lends ' + money(round2(R[d.k-1]*(1-RR))) + ' on to the next. Total ' +
        'deposits so far: ' + money(round2(cum(d.k))) + '.';
    },
    ariaLabel:function(state){
      var d = derive(state);
      return d.done
        ? 'Six rounds of deposits, each four fifths of the last, with a running total ' +
          'closing in on $500.'
        : 'The deposit cascade, being built up.';
    }
  };
})();


/* ══ FIGURE BUILDER: the market for real money balances ═══════════════════
   The interest rate is the price of money, so it is set where a downward
   demand for real balances meets the vertical supply the Fed chooses.
   Each of the three shocks moves exactly one of those two lines, and the
   moving one slides rather than appearing beside the original.
   ════════════════════════════════════════════════════════════════════════ */

function moneyMarketFigure(spec){
  var ax = spec.ax, steps = evenSteps(spec.stepLabels);
  var n = steps.length - 1;
  var m0 = 5, m1 = spec.newM === undefined ? 5 : spec.newM;
  var D1 = L1, D2 = spec.newDemand || L1;

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
      var u  = spec.shockStep ? into(state, n, spec.shockStep) : 0;
      var mL = m0 + (m1 - m0)*u;                 /* the supply line, mid-slide */
      var DL = tween(D1, D2, u);                 /* demand, mid-slide          */
      var rL = DL.at(mL);                        /* where they now cross       */
      var Cx = frame(ctx, S.box, ax, T, fs, dpr, 2);

      clipped(ctx, Cx, function(){
        /* demand: the original stays put whenever it is the supply that moves */
        if(s >= spec.demandStep) drawLine(ctx, Cx, D1, ax, T.blue, T, dpr);
        if(u > 0 && spec.newDemand) drawLine(ctx, Cx, DL, ax, T.gold, T, dpr, [10*dpr,7*dpr]);

        /* supply: a vertical line at whatever M/P the Fed has chosen */
        if(s >= spec.supplyStep){
          polyline(ctx, Cx, [[m0, ax.ymin],[m0, 9]], T.blue, T.lw.series*dpr);
          if(u > 0 && !spec.newDemand){
            polyline(ctx, Cx, [[mL, ax.ymin],[mL, 9]], T.gold, T.lw.series*dpr,
                     [10*dpr,7*dpr]);
          }
        }

        if(s >= spec.eqStep){
          guides(ctx, Cx, ax, m0, 5, T.ink2, T, dpr, 0.55);
          labelledPoint(ctx, Cx, m0, 5, 'A', T.blue, 'circle', T, fs, dpr, 'ne');
        }
        if(u > 0){
          guides(ctx, Cx, ax, mL, rL, T.gold, T, dpr, 0.6);
          labelledPoint(ctx, Cx, mL, rL, 'B', T.gold, 'circle', T, fs, dpr,
                        spec.bAnchor || 'ne', s >= n);
          if(spec.shiftArrow){
            /* along the axis the shock actually moves */
            dataArrow(ctx, Cx, spec.shiftArrow.x0, spec.shiftArrow.y0,
                      spec.shiftArrow.x1, spec.shiftArrow.y1, T.red, T, fs, dpr, true);
            chipText(ctx, spec.shiftArrow.label,
                     Cx.X(spec.shiftArrow.lx), Cx.Y(spec.shiftArrow.ly),
                     spec.shiftArrow.align || 'center',
                     spec.shiftArrow.base  || 'top', T.red, T, fs, dpr);
          }
          if(u >= 1){
            /* and the rate it drags with it */
            dataArrow(ctx, Cx, 1, 5, 1, rL, T.red, T, fs, dpr, true);
          }
        }
      });

      legendRow(ctx, (s >= spec.demandStep
                        ? [{ label:'L(r, Y₁), demand', color:T.blue }] : [])
                  .concat(u > 0 && spec.newDemand
                        ? [{ label:'L(r, Y₂)', color:T.gold, dash:[10,7] }] : [])
                  .concat(s >= spec.supplyStep
                        ? [{ label:'M/P, supply', color:T.blue }] : [])
                  .concat(u > 0 && !spec.newDemand
                        ? [{ label:spec.supplyTag, color:T.gold, dash:[10,7] }] : []),
                T, fs, dpr, Cx.px, Cx.px + Cx.pw, Cx.headY + Cx.headH*0.3);
      headNote(ctx, Cx, spec.notes[s],
               s >= n ? T.green : (u > 0 ? T.red : T.ink2), T, fs, dpr, 1);
    },

    describe:function(state){ return spec.describe(derive(state).s); },
    ariaLabel:function(state){
      return derive(state).s >= (spec.shockStep || 2) ? spec.ariaDone : spec.ariaBuilding;
    }
  };
}


/* ══ FIGURE 6: the interest rate rule ═════════════════════════════════════
   Two panels of the same three lines. What moves them is different on each
   side — the price level on the left, the money supply on the right — and
   the money supply moves them the opposite way, which is the whole reason
   the source draws the picture twice.
   ════════════════════════════════════════════════════════════════════════ */

var IR1 = line(0.5,  0.0025);
var IR2 = line(2.5,  0.0025);
var IR3 = line(-1.5, 0.0025);

var figIRRule = (function(){
  var steps = evenSteps(['Empty','IR₁ and point A','The rate can be pushed up',
                         'or pulled down','r = cP + dY − eM']);
  var n = steps.length - 1;

  function derive(state){
    return { s: clamp(Math.round(clamp(state.t,0,1)*n), 0, n) };
  }

  function panel(ctx, S, box, T, fs, dpr, s, state, title, upLab, downLab){
    var uUp = into(state, n, 2), uDn = into(state, n, 3);
    /* The shift arrows start on IR₁ and end on the line they point at, so
       they are read off the curves rather than hard-coded: at this output
       IR₁ is nowhere near point A's rate, and anchoring them to A left them
       floating above the curve they were supposed to be leaving. */
    var xA = 1200, r1 = IR1.at(xA), r2 = IR2.at(xA), r3 = IR3.at(xA);
    var C = frame(ctx, box, AX_IR, T, fs, dpr, 1, title);
    legendRow(ctx, [{ label:'IR₁', color:T.blue }]
                .concat(uUp > 0 ? [{ label:'IR₂', color:T.gold, dash:[10,7] }] : [])
                .concat(uDn > 0 ? [{ label:'IR₃', color:T.green, dash:[10,7] }] : []),
              T, fs, dpr, C.px, C.px + C.pw, C.headY + C.headH*0.5);
    clipped(ctx, C, function(){
      if(s >= 1){
        drawLine(ctx, C, IR1, AX_IR, T.blue, T, dpr);
        guides(ctx, C, AX_IR, 2000, 5.5, T.ink2, T, dpr, 0.55);
        labelledPoint(ctx, C, 2000, 5.5, 'A', T.blue, 'circle', T, fs, dpr, 'se');
      }
      if(uUp > 0){
        drawLine(ctx, C, tween(IR1, IR2, uUp), AX_IR, T.gold, T, dpr, [10*dpr,7*dpr]);
        labelledPoint(ctx, C, 2000, 5.5 + 2*uUp, 'B', T.gold, 'circle', T, fs, dpr, 'se');
        if(uUp >= 1){
          dataArrow(ctx, C, xA, r1, xA, r2, T.red, T, fs, dpr, true);
          chipText(ctx, upLab, C.X(xA) + 22*fs*dpr, C.Y((r1 + r2)/2),
                   'left', 'middle', T.red, T, fs, dpr);
        }
      }
      if(uDn > 0){
        drawLine(ctx, C, tween(IR1, IR3, uDn), AX_IR, T.green, T, dpr, [10*dpr,7*dpr]);
        labelledPoint(ctx, C, 2000, 5.5 - 2*uDn, 'C', T.green, 'circle', T, fs, dpr, 'se');
        if(uDn >= 1){
          dataArrow(ctx, C, xA, r1, xA, r3, T.red, T, fs, dpr, true);
          chipText(ctx, downLab, C.X(xA) + 22*fs*dpr, C.Y((r1 + r3)/2),
                   'left', 'middle', T.red, T, fs, dpr);
        }
      }
    });
  }

  return {
    id:'fig-9-6-interest-rule',
    title:'The interest rate rule',
    caption:'r = cP + dY − eM. Output moves you along a line; the price level and the money ' +
            'supply move the line itself. They move it in opposite directions, which is why ' +
            'the same three lines are drawn twice: a higher price level pushes the rate up, ' +
            'a bigger money supply pulls it down.',
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
      panel(ctx, S, S.boxes[0], T, fs, dpr, s, state, 'Changes in the price level',
            'P ↑', 'P ↓');
      panel(ctx, S, S.boxes[1], T, fs, dpr, s, state, 'Changes in the money supply',
            'M ↓', 'M ↑');
      bannerNote(ctx, S,
        ['The interest rate against output, twice: once for P, once for M.',
         'IR₁ is the rule at today’s P and M. At Y = 2000 it gives r = 5.5 — point A.',
         'Something pushes the whole line up to IR₂, and the rate at Y = 2000 goes to 7.5.',
         'Something else pulls it down to IR₃, and the rate at Y = 2000 falls to 3.5.',
         'Same lines, opposite causes: P ↑ raises the rate, M ↑ lowers it. That is the ' +
         'sign on each term in r = cP + dY − eM.'][s],
        s >= 4 ? T.green : (s >= 2 ? T.red : T.ink2));
    },

    describe:function(state){
      var s = derive(state).s;
      return [
        'Two empty panels with aggregate output along the bottom and the interest rate up ' +
        'the side, one headed changes in the price level and the other changes in the ' +
        'money supply.',
        'On each panel an upward-sloping line, IR one, is drawn, and point A is marked on ' +
        'it at output 2000 and an interest rate of 5.5. The line slopes up because a higher ' +
        'level of output means more demand for money, and more demand for money means a ' +
        'higher price for it.',
        'A dashed gold line, IR two, rises above IR one on both panels, and point B is ' +
        'marked at output 2000 and an interest rate of 7.5. On the left panel the arrow is ' +
        'labelled P up; on the right it is labelled M down. Either a higher price level or ' +
        'a smaller money supply pushes the whole rule upward.',
        'A dashed green line, IR three, drops below IR one, and point C is marked at output ' +
        '2000 and an interest rate of 3.5. On the left the arrow is labelled P down; on the ' +
        'right, M up.',
        'Both panels are complete. The same three lines, moved by two different things in ' +
        'opposite directions: the price level enters the rule with a plus sign and the ' +
        'money supply with a minus. Written out, r equals c times P, plus d times Y, minus ' +
        'e times M, with c, d and e all positive.'
      ][s];
    },
    ariaLabel:function(state){
      return derive(state).s >= 3
        ? 'The interest rate rule shifted up and down, shown once for the price level and ' +
          'once for the money supply.'
        : 'The interest rate rule, being built up.';
    }
  };
})();


/* ══ THE SIX FIGURES ══════════════════════════════════════════════════════ */

var figMarket = moneyMarketFigure({
  id:'fig-9-2-money-market',
  title:'The market for real money balances',
  caption:'The interest rate is the price of money, so it is set the way any price is. ' +
          'Demand slopes down because the rate is what holding money costs you. Supply is ' +
          'vertical because the Fed picks it and it does not care what the rate is. Where ' +
          'they cross is r₁.',
  ax: moneyAxis([5], ['M/P'], [5], ['r₁']),
  demandStep:1, supplyStep:2, eqStep:3,
  stepLabels:['Empty','Demand for real balances','Supply, set by the Fed','A: the rate'],
  notes:[
    'Real money balances across, the interest rate up.',
    'L(r, Y₁) slopes down: the higher the rate, the more it costs to hold money rather ' +
    'than lend it.',
    'M/P is vertical: the Fed sets the quantity, and it does not vary with the rate.',
    'Where they cross is the equilibrium interest rate, r₁ — the price at which people are ' +
    'content to hold exactly the money there is.'
  ],
  describe:function(s){
    return [
      'An empty plot with real money balances, M over P, on the horizontal axis and the ' +
      'interest rate on the vertical axis.',
      'A downward-sloping demand curve for real money balances, labelled L of r and Y one. ' +
      'It slopes down because the interest rate is the opportunity cost of holding money: ' +
      'the higher the rate, the less of your wealth you keep in a liquid form.',
      'A vertical line is added at M over P. Supply is vertical because the Federal Reserve ' +
      'chooses the quantity of money and the price level is taken as given, so neither ' +
      'responds to the interest rate.',
      'Point A is marked where the two lines cross, at the interest rate r one, with dashed ' +
      'guides to both axes. That is the rate at which the amount of money people want to ' +
      'hold is exactly the amount there is.'
    ][s];
  },
  ariaDone:'A downward-sloping demand for real money balances crossing a vertical supply at ' +
           'the equilibrium interest rate.',
  ariaBuilding:'The money market, being built up.'
});

var figPriceRise = moneyMarketFigure({
  id:'fig-9-3-price-rise',
  title:'A rise in the price level',
  caption:'M is unchanged but P is larger, so M/P is smaller — the same dollars buy less, ' +
          'and there is less real money to go round. The supply line moves left, and the ' +
          'price of the thing that just became scarcer goes up.',
  ax: moneyAxis([3,5], ['M/P′','M/P'], [5,7], ['r₁','r₂']),
  demandStep:1, supplyStep:1, eqStep:1, shockStep:2, newM:3,
  supplyTag:'M/P′, after P ↑', bAnchor:'ne',
  shiftArrow:{ x0:4.9, y0:2, x1:3.1, y1:2, label:'P ↑', lx:4, ly:1.4 },
  stepLabels:['Empty','A: the starting rate','P rises','B: the new rate','Higher P, higher r'],
  notes:[
    'The same money market, ready for a shock.',
    'Start at A: real balances M/P, interest rate r₁.',
    'P ↑ with M unchanged → M/P ↓. The supply line moves left; the Fed has done nothing.',
    'Less real money to hold, so people bid for it and the rate climbs to r₂.',
    'P ↑ → M/P ↓ → r ↑. A higher price level raises the interest rate.'
  ],
  describe:function(s){
    return [
      'The money market axes, empty.',
      'The downward demand curve and the vertical supply line, crossing at point A and the ' +
      'interest rate r one.',
      'The price level rises while the money supply is unchanged, so the real quantity of ' +
      'money falls. A dashed gold vertical line slides left from M over P to M over P ' +
      'prime, with an arrow along the bottom labelled P up.',
      'Point B is marked where the new supply line meets the unchanged demand curve, at the ' +
      'higher interest rate r two, and an arrow up the left of the plot shows the rate ' +
      'rising.',
      'The move is complete and B is circled. Nothing about demand changed and the Fed did ' +
      'nothing: the same nominal money simply buys less, so there is less real money to ' +
      'hold, and the price of holding it rises. P up, M over P down, r up.'
    ][s];
  },
  ariaDone:'The supply of real balances shifted left by a rise in the price level, raising ' +
           'the interest rate.',
  ariaBuilding:'A rise in the price level in the money market, being built up.'
});

var figIncomeRise = moneyMarketFigure({
  id:'fig-9-4-income-rise',
  title:'A rise in income',
  caption:'This time supply is untouched and demand moves. More income means more ' +
          'transactions, so people want to hold more money at any given rate — the demand ' +
          'curve shifts out, and with the same quantity available the rate has to rise to ' +
          'ration it.',
  ax: moneyAxis([5], ['M/P'], [5,7], ['r₁','r₂']),
  demandStep:1, supplyStep:1, eqStep:1, shockStep:2, newDemand:L2,
  bAnchor:'ne',
  shiftArrow:{ x0:7, y0:3.1, x1:7, y1:4.9, label:'Y ↑', lx:7.25, ly:4, align:'left',
               base:'middle' },
  stepLabels:['Empty','A: the starting rate','Y rises','B: the new rate','Higher Y, higher r'],
  notes:[
    'The same money market again, with the other curve about to move.',
    'Start at A: real balances M/P, interest rate r₁.',
    'Y ↑ → more transactions → more money wanted at every rate. Demand shifts out to L(r, Y₂).',
    'The Fed has not changed the quantity, so the rate rises to r₂ until people are content ' +
    'to hold it.',
    'Y ↑ → L ↑ → r ↑. A higher level of income raises the interest rate.'
  ],
  describe:function(s){
    return [
      'The money market axes, empty.',
      'The demand curve and the vertical supply line crossing at point A and the interest ' +
      'rate r one.',
      'Income rises, so at every interest rate people want to hold more money for ' +
      'transactions. A dashed gold demand curve, L of r and Y two, appears parallel to the ' +
      'first and to its right, with an arrow pointing up.',
      'The supply line has not moved, so the extra demand has to be choked off by the ' +
      'price: point B is marked at the same real balances but the higher interest rate r ' +
      'two.',
      'The move is complete and B is circled. The quantity of real money is exactly what it ' +
      'was; the only thing that changed is how much of it people want, and the rate rose ' +
      'until they were content with what there is. Y up, money demand up, r up.'
    ][s];
  },
  ariaDone:'The demand for real balances shifted out by a rise in income, raising the ' +
           'interest rate against a fixed supply.',
  ariaBuilding:'A rise in income in the money market, being built up.'
});

var figMoneyRise = moneyMarketFigure({
  id:'fig-9-5-money-rise',
  title:'A rise in the money supply',
  caption:'Now the Fed acts. More nominal money at an unchanged price level is more real ' +
          'money, so the supply line moves right and the rate falls. This is the lever ' +
          'behind everything the Fed does with interest rates.',
  ax: moneyAxis([5,7], ['M/P','M′/P'], [3,5], ['r₂','r₁']),
  demandStep:1, supplyStep:1, eqStep:1, shockStep:2, newM:7,
  supplyTag:'M′/P, after M ↑', bAnchor:'ne',
  shiftArrow:{ x0:5.1, y0:2, x1:6.9, y1:2, label:'M ↑', lx:6, ly:1.4 },
  stepLabels:['Empty','A: the starting rate','M rises','B: the new rate','Higher M, lower r'],
  notes:[
    'The money market once more, with the Fed about to move.',
    'Start at A: real balances M/P, interest rate r₁.',
    'M ↑ at an unchanged P → M/P ↑. The supply line moves right.',
    'More real money than people wanted to hold at r₁, so the rate falls to r₂.',
    'M ↑ → M/P ↑ → r ↓. This is how the Fed moves the interest rate.'
  ],
  describe:function(s){
    return [
      'The money market axes, empty.',
      'The demand curve and the vertical supply line crossing at point A and the interest ' +
      'rate r one.',
      'The Federal Reserve increases the money supply while the price level is unchanged, ' +
      'so real balances rise. A dashed gold vertical line slides right from M over P to M ' +
      'prime over P, with an arrow along the bottom labelled M up.',
      'Point B is marked where the new supply line meets the unchanged demand curve, at the ' +
      'lower interest rate r two, and an arrow down the left of the plot shows the rate ' +
      'falling.',
      'The move is complete and B is circled. There is now more real money than people ' +
      'wanted to hold at the old rate, so the price of holding it falls until they are ' +
      'content. M up, M over P up, r down — the lever the Fed actually pulls.'
    ][s];
  },
  ariaDone:'The supply of real balances shifted right by a rise in the money supply, ' +
           'lowering the interest rate.',
  ariaBuilding:'A rise in the money supply in the money market, being built up.'
});

var figures = {
  'fig-9-1-money-creation': figCreation,
  'fig-9-2-money-market':   figMarket,
  'fig-9-3-price-rise':     figPriceRise,
  'fig-9-4-income-rise':    figIncomeRise,
  'fig-9-5-money-rise':     figMoneyRise,
  'fig-9-6-interest-rule':  figIRRule
};

var ORDER = ['fig-9-1-money-creation','fig-9-2-money-market','fig-9-3-price-rise',
             'fig-9-4-income-rise','fig-9-5-money-rise','fig-9-6-interest-rule'];

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
global.EconFigures['unit-09'] = {
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
