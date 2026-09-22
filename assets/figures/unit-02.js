/* ============================================================================
   unit-02.js — ECON 002, Unit 2: Review of Supply and Demand
   Shared figure module. SINGLE SOURCE OF TRUTH for every dynamic figure in
   this unit.

   Consumed by BOTH:
     classes/econ002/notes/unit-02/index.html   (mode 'notes')
     classes/econ002/notes/unit-02/deck.html    (mode 'stage')

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
  var maxTickW = 0;
  if(cfg.yticks) for(i=0;i<cfg.yticks.length;i++){
    maxTickW = Math.max(maxTickW, ctx.measureText(String(cfg.yticks[i])).width);
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
    ctx.fillText(cfg.title, box.x + box.w/2, box.y + Math.round(T.font.title*fs*dpr*0.35));
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
    minGap = T.font.tick*fs*dpr*2.1; last = -1e9;
    for(i=0;i<cfg.xticks.length;i++){
      v = cfg.xticks[i]; tx = C.X(v);
      ctx.strokeStyle = T.axis; ctx.lineWidth = T.lw.axis*dpr;
      ctx.beginPath(); ctx.moveTo(tx, py+ph); ctx.lineTo(tx, py+ph+tickLen); ctx.stroke();
      if(tx - last >= minGap){
        ctx.fillText(String(v), tx, py+ph+tickLen+2*fs*dpr);
        last = tx;
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
        ctx.fillText(String(v), px-tickLen-3*fs*dpr, ty);
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
  var sw = 22*fs*dpr, gap = 7*fs*dpr, pad = 18*fs*dpr, i, w = 0, widths = [];
  ctx.save();
  ctx.font = fnt(T,fs,dpr,'legend','700');
  for(i=0;i<entries.length;i++){
    widths[i] = sw + gap + ctx.measureText(entries[i].label).width;
    w += widths[i] + (i ? pad : 0);
  }
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
    var pad = 10*fs*dpr, tw = ctx.measureText(label).width;
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


/* ══ DATA — transcribed verbatim from "Supply and Demand Review.tex" ═══════
   Every line is P as a function of Q, exactly as the source plots it. Do not
   round or re-fit: students compare the screen against the printed PDF.

   Gas market (the running example)
     Demand   P = 10 − 0.5Q        line 356   schedule A–E
     Demand'  P = 11 − 0.5Q        line 495   income 40k → 60k (a right shift of 2)
     Demand₂  P = 11 − 0.5Q        line 578   problem-set example
     Demand'' P = 12 − 0.5Q        line 1050  income rise at equilibrium (right shift of 4)
     Supply   P = 2  + 0.5Q        line 640   schedule A–G
     Supply'  P = 0.5Q             line 1136  wage fall (a right shift of 4)
   Pizza market (the cost example)
     Supply   P = 0.5 + 0.25Q      line 748
     Supply'  P = 1   + 0.25Q      line 774   costs rise (a left shift of 2)      */

function line(a, b){ return { a:a, b:b, at:function(q){ return a + b*q; },
                              q:function(p){ return (p - a)/b; } }; }

var D = {
  demand:        line(10,   -0.5),
  demandIncome:  line(11,   -0.5),
  demandShift:   line(12,   -0.5),
  supply:        line(2,     0.5),
  supplyShift:   line(0,     0.5),
  pizzaSupply:   line(0.5,   0.25),
  pizzaSupply2:  line(1,     0.25),

  /* Schedules, straight out of the two tables. */
  demandPts: [['A',0,10],['B',4,8],['C',8,6],['D',12,4],['E',16,2]],
  demandPtsIncome: [["A'",2,10],["B'",6,8],["C'",10,6],["D'",14,4],["E'",18,2]],
  supplyPts: [['A',0,2],['B',2,3],['C',4,4],['D',6,5],['E',8,6],['F',10,7],['G',12,8]],
  pizzaPts:  [['A',0,0.5],['B',2,1],['C',4,1.5],['D',6,2],['E',8,2.5],['F',10,3],['G',12,3.5]],

  /* Equilibria. 2+0.5Q = 10−0.5Q → (8, 6).  With D'' → (10, 7).  With S' → (10, 5). */
  eq:        { q:8,  p:6 },
  eqDemand:  { q:10, p:7 },
  eqSupply:  { q:10, p:5 }
};

var AX_GAS = {
  xmin:0, xmax:20, ymin:0, ymax:12,
  xticks:[0,2,4,6,8,10,12,14,16,18,20],
  yticks:[0,1,2,3,4,5,6,7,8,9,10,11,12],
  xlabel:'Quantity (gallons)', ylabel:'Price (per gallon)'
};
var AX_GAS18 = {
  xmin:0, xmax:18, ymin:0, ymax:12,
  xticks:[0,2,4,6,8,10,12,14,16,18],
  yticks:[0,1,2,3,4,5,6,7,8,9,10,11,12],
  xlabel:'Quantity (gallons)', ylabel:'Price (per gallon)'
};
var AX_PIZZA = {
  xmin:0, xmax:14, ymin:0, ymax:4,
  xticks:[0,2,4,6,8,10,12,14],
  yticks:[0,0.5,1,1.5,2,2.5,3,3.5,4],
  xlabel:'Quantity (slices)', ylabel:'Price (per slice)'
};

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
  var gap = 17*fs*dpr;
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

/* One panel, one axis box — every figure in this unit is a single market. */
function frame(ctx, box, ax, T, fs, dpr, headLines){
  return paintFrame(ctx, box, {
    title:'', xlabel:ax.xlabel, ylabel:ax.ylabel,
    xmin:ax.xmin, xmax:ax.xmax, ymin:ax.ymin, ymax:ax.ymax,
    xticks:ax.xticks, yticks:ax.yticks,
    headLines: (headLines === undefined ? 1 : headLines)
  }, T, fs, dpr);
}

function begin(canvas, mode, self){
  var S = setupCanvas(canvas); if(!S) return null;
  var T = THEME[mode];
  S.T = T; S.fs = fontScale(mode, S.cssW);
  S.box = panelBoxes(S.W, S.H, S.dpr, 1, false, T.panelGap)[0];
  paintBg(S.ctx, S.W, S.H, T);
  return S;
}

/* ══ FIGURE BUILDER 1: reading a schedule off a curve ══════════════════════
   Figures 1 and 4. The sweep walks down (demand) or up (supply) the schedule
   one lettered point at a time, dropping guides to both axes, so the table
   row, the point and the curve are visibly the same fact three ways.
   ════════════════════════════════════════════════════════════════════════ */

function scheduleFigure(spec){
  var pts = spec.points, ax = spec.axis;
  var steps = pts.map(function(pt, i){
    return { name:'pt-'+pt[0], t:i/(pts.length-1), label:'Point '+pt[0] };
  });

  function derive(state){
    var f = clamp(state.t,0,1)*(pts.length-1);
    var i = clamp(Math.round(f), 0, pts.length-1);
    return { i:i, pt:pts[i] };
  }

  return {
    id: spec.id, title: spec.title, caption: spec.caption,
    panels: 1, aspect: 0.62, aspectStacked: 0.92, steps: steps,
    initState: function(){ return { t:0 }; },
    setStep: function(st,i){ st.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:   function(st,t){ st.t = clamp(t,0,1); },

    draw: function(canvas, state, mode){
      var S = begin(canvas, mode, this); if(!S) return;
      var ctx = S.ctx, T = S.T, fs = S.fs, dpr = S.dpr;
      var C = frame(ctx, S.box, ax, T, fs, dpr);
      var d = derive(state), col = T[spec.colorKey];

      clipped(ctx, C, function(){
        drawLine(ctx, C, spec.curve, ax, col, T, dpr);
        var i;
        for(i=0;i<pts.length;i++){
          labelledPoint(ctx, C, pts[i][1], pts[i][2], pts[i][0], col,
                        spec.shape, T, fs, dpr, spec.anchor, false);
        }
        guides(ctx, C, ax, d.pt[1], d.pt[2], T.green, T, dpr);
        labelledPoint(ctx, C, d.pt[1], d.pt[2], '', T.green,
                      spec.shape, T, fs, dpr, spec.anchor, true);
      });
      curveTag(ctx, C, spec.curve, ax, spec.curveLabel, col, T, fs, dpr);

      /* live readout, in the band above the plot */
      headNote(ctx, C, spec.readout(d.pt), T.green, T, fs, dpr, 0);
    },

    describe: function(state){
      var d = derive(state);
      return spec.describeAt(d.pt, d.i, pts.length);
    },
    ariaLabel: function(state){
      var d = derive(state);
      return spec.title + '. Point ' + d.pt[0] + ': price ' + money(d.pt[2]) +
             ', quantity ' + d.pt[1] + '.';
    }
  };
}

/* ══ FIGURE BUILDER 2: a curve that shifts ═════════════════════════════════
   Figures 2, 3, 5 and 6. Every shift in this unit is a parallel one, so it
   animates as the intercept sliding from the old line to the new — the curve
   really does slide across the screen rather than blinking into place.

   mode 'shift'         — the curve slides, new schedule points fade in.
   mode 'moveThenShift' — first a marker slides ALONG the curve (a change in
                          the good's own price), then the whole curve shifts
                          (a change in anything else). That contrast is the
                          entire point of the problem-set figures.
   ════════════════════════════════════════════════════════════════════════ */

function shiftFigure(spec){
  var ax = spec.axis;
  var two    = (spec.mode === 'moveThenShift');
  var isStatic = (spec.mode === 'static');
  var steps = spec.steps;

  function derive(state){
    var t = clamp(state.t,0,1);
    var moveU, shiftU;
    if(isStatic){ moveU = 0; shiftU = 1; }
    else if(two){
      /* out to the target while the price changes, then back to the start —
         both problem-set questions are asked from the same point */
      moveU  = t <= 0.5 ? t/0.5 : Math.max(0, 1 - (t-0.5)/0.12);
      shiftU = clamp((t-0.5)/0.5, 0, 1);
    }
    else   { moveU = 0;                shiftU = t; }
    var from = spec.curve.a, to = spec.shifted.a;
    return { t:t, moveU:moveU, shiftU:shiftU, isStatic:isStatic,
             live: line(from + (to-from)*shiftU, spec.curve.b) };
  }

  return {
    id: spec.id, title: spec.title, caption: spec.caption,
    panels: 1, aspect: spec.aspect || 0.62, aspectStacked: 0.92, steps: steps,
    initState: function(){ return { t:0 }; },
    setStep: function(st,i){ st.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:   function(st,t){ st.t = clamp(t,0,1); },

    draw: function(canvas, state, mode){
      var S = begin(canvas, mode, this); if(!S) return;
      var ctx = S.ctx, T = S.T, fs = S.fs, dpr = S.dpr;
      var C = frame(ctx, S.box, ax, T, fs, dpr);
      var d = derive(state);
      var col = T[spec.colorKey], gold = T.gold;

      clipped(ctx, C, function(){
        var i;
        /* the original curve and its schedule stay put throughout */
        drawLine(ctx, C, spec.curve, ax, col, T, dpr);
        if(spec.points) for(i=0;i<spec.points.length;i++){
          /* The shifted curve runs through the space the original labels
             would otherwise sit in, so they go on the far side of their
             points instead. */
          labelledPoint(ctx, C, spec.points[i][1], spec.points[i][2],
                        spec.points[i][0], col, spec.shape, T, fs, dpr,
                        spec.baseAnchor || spec.anchor, false);
        }

        /* the marker sliding along the curve, for the move-then-shift figures */
        if(two && spec.moveFrom && spec.moveTo){
          var q = spec.moveFrom[1] + (spec.moveTo[1]-spec.moveFrom[1])*d.moveU;
          var p = spec.curve.at(q);
          guides(ctx, C, ax, q, p, T.green, T, dpr);
          labelledPoint(ctx, C, q, p, '', T.green, spec.shape, T, fs, dpr,
                        spec.anchor, true);
        }

        /* the shifting curve */
        if(d.shiftU > 0){
          ctx.save();
          ctx.globalAlpha = Math.min(1, d.shiftU*3);
          drawLine(ctx, C, d.live, ax, gold, T, dpr);
          ctx.restore();
          if(spec.shiftedPoints && d.shiftU > 0.75){
            ctx.save();
            ctx.globalAlpha = (d.shiftU-0.75)/0.25;
            for(i=0;i<spec.shiftedPoints.length;i++){
              labelledPoint(ctx, C, spec.shiftedPoints[i][1], spec.shiftedPoints[i][2],
                            spec.shiftedPoints[i][0], gold, 'diamond', T, fs, dpr,
                            spec.anchor, false);
            }
            ctx.restore();
          }
          /* which way it went */
          if(spec.arrowPrices && !isStatic){
            ctx.save();
            ctx.globalAlpha = Math.min(1, d.shiftU*2);
            for(i=0;i<spec.arrowPrices.length;i++){
              var ap = spec.arrowPrices[i];
              var q0 = spec.curve.q(ap), q1 = d.live.q(ap);
              if(q0 < ax.xmin || q0 > ax.xmax || q1 < ax.xmin || q1 > ax.xmax) continue;
              hArrow(ctx, C, ap, q0, q1, gold, T, fs, dpr);
            }
            ctx.restore();
          }

          /* the source's dashed read-off, for the pizza cost figure */
          if(spec.readGuide && d.shiftU > 0.9){
            ctx.save();
            ctx.globalAlpha = (d.shiftU-0.9)/0.1;
            var P = spec.readGuide.p;
            var qOld = spec.curve.q(P), qNew = spec.shifted.q(P);
            guides(ctx, C, ax, qOld, P, T.muted, T, dpr);
            guides(ctx, C, ax, qNew, P, gold,    T, dpr);
            ctx.restore();
          }
        }
      });

      curveTag(ctx, C, spec.curve, ax, spec.curveLabel, col, T, fs, dpr);
      if(d.shiftU > 0.25){
        ctx.save(); ctx.globalAlpha = Math.min(1,(d.shiftU-0.25)/0.35);
        curveTag(ctx, C, d.live, ax, spec.shiftedLabel, gold, T, fs, dpr);
        ctx.restore();
      }

      /* the caption that says which way the curve went */
      if(d.shiftU > 0.05 && spec.shiftNote){
        ctx.save();
        ctx.globalAlpha = Math.min(1, d.shiftU*2);
        headNote(ctx, C, spec.shiftNote, gold, T, fs, dpr, 0);
        ctx.restore();
      }
    },

    describe: function(state){ return spec.describeAt(derive(state)); },
    ariaLabel: function(state){
      var d = derive(state);
      return spec.title + '. ' + (d.shiftU >= 1 ? spec.ariaEnd
             : (d.shiftU > 0 ? 'The curve is shifting.' : spec.ariaStart));
    }
  };
}

/* ══ FIGURE BUILDER 3: excess supply and excess demand ═════════════════════
   Figures 7 and 8. The sweep runs the price from the out-of-equilibrium
   level down (or up) to $6, and the horizontal gap between the two curves
   closes as it goes. The gap is the surplus or the shortage, with a live
   count, so "the market clears" is something you watch rather than assert.
   ════════════════════════════════════════════════════════════════════════ */

function excessFigure(spec){
  var ax = spec.axis, p0 = spec.startP, p1 = D.eq.p;

  function derive(state){
    var t = clamp(state.t,0,1);
    var p = p0 + (p1-p0)*t;
    var qd = D.demand.q(p), qs = D.supply.q(p);
    return { t:t, p:p, qd:qd, qs:qs, gap:Math.abs(qs-qd),
             lo:Math.min(qd,qs), hi:Math.max(qd,qs) };
  }

  return {
    id: spec.id, title: spec.title, caption: spec.caption,
    panels: 1, aspect: 0.62, aspectStacked: 0.92, steps: spec.steps,
    initState: function(){ return { t:0 }; },
    setStep: function(st,i){ st.t = spec.steps[clamp(i,0,spec.steps.length-1)].t; },
    scrub:   function(st,t){ st.t = clamp(t,0,1); },

    draw: function(canvas, state, mode){
      var S = begin(canvas, mode, this); if(!S) return;
      var ctx = S.ctx, T = S.T, fs = S.fs, dpr = S.dpr;
      var C = frame(ctx, S.box, ax, T, fs, dpr);
      var d = derive(state);

      clipped(ctx, C, function(){
        drawLine(ctx, C, D.supply, ax, T.red,  T, dpr);
        drawLine(ctx, C, D.demand, ax, T.blue, T, dpr);

        /* the gap between the curves at the current price */
        if(d.gap > 0.02){
          guides(ctx, C, ax, d.lo, d.p, T.green, T, dpr);
          guides(ctx, C, ax, d.hi, d.p, T.green, T, dpr);
          polyline(ctx, C, [[d.lo,d.p],[d.hi,d.p]], T.green, T.lw.annot*dpr);
          markers(ctx, C, [[d.qd,d.p]], T.blue, T.dot*dpr*1.4, 'circle');
          markers(ctx, C, [[d.qs,d.p]], T.red,  T.dot*dpr*1.4, 'square');
          chipText(ctx, spec.gapLabel + ' = ' + num(d.gap),
                   C.X((d.lo+d.hi)/2), C.Y(d.p) - 10*fs*dpr,
                   'center', 'bottom', T.green, T, fs, dpr);
        }

        /* equilibrium, fading in as the gap closes */
        var eqA = clamp((d.t-0.6)/0.4, 0, 1);
        if(eqA > 0){
          ctx.save(); ctx.globalAlpha = eqA;
          guides(ctx, C, ax, D.eq.q, D.eq.p, T.muted, T, dpr);
          labelledPoint(ctx, C, D.eq.q, D.eq.p, 'E', T.green, 'circle',
                        T, fs, dpr, 'ne', true);
          ctx.restore();
        }
      });

      curveTag(ctx, C, D.supply, ax, 'S', T.red,  T, fs, dpr);
      curveTag(ctx, C, D.demand, ax, 'D', T.blue, T, fs, dpr);

      headNote(ctx, C, 'Price ' + money(d.p) +
               '   ·   demanded ' + num(d.qd) +
               '   ·   supplied ' + num(d.qs), T.ink, T, fs, dpr, 0);
    },

    describe: function(state){ return spec.describeAt(derive(state)); },
    ariaLabel: function(state){
      var d = derive(state);
      return spec.title + '. Price ' + money(d.p) + ', quantity demanded ' +
             num(d.qd) + ', quantity supplied ' + num(d.qs) +
             (d.gap > 0.02 ? (', ' + spec.gapLabel.toLowerCase() + ' of ' + num(d.gap) + '.')
                           : ', the market has cleared.');
    }
  };
}

/* ══ FIGURE BUILDER 4: a shock moves the equilibrium ═══════════════════════
   Figures 9 and 10, and the payoff of the whole unit. Three phases from one
   parameter: the curve shifts, the gap opens at the OLD price, then the
   equilibrium walks up (or down) the curve that did not move until the gap
   is gone. Students see that the new equilibrium is not asserted — it is
   where the adjustment stops.
   ════════════════════════════════════════════════════════════════════════ */

function equilibriumShiftFigure(spec){
  var ax = AX_GAS, eq0 = D.eq, eq1 = spec.newEq;
  var SHIFT_END = 0.42, GAP_END = 0.62;

  function derive(state){
    var t = clamp(state.t,0,1);
    var shiftU = clamp(t/SHIFT_END, 0, 1);
    var gapU   = clamp((t-SHIFT_END)/(GAP_END-SHIFT_END), 0, 1);
    var moveU  = clamp((t-GAP_END)/(1-GAP_END), 0, 1);
    var from = spec.moving.a, to = spec.movedTo.a;
    var live = line(from + (to-from)*shiftU, spec.moving.b);
    /* the equilibrium travels along the curve that did NOT move */
    var q = eq0.q + (eq1.q-eq0.q)*moveU;
    var p = spec.fixed.at(q);
    /* the gap at the old price, between the fixed curve and the shifted one */
    var qFixed = spec.fixed.q(eq0.p), qLive = live.q(eq0.p);
    return { t:t, shiftU:shiftU, gapU:gapU, moveU:moveU, live:live,
             q:q, p:p, qFixed:qFixed, qLive:qLive,
             gap:Math.abs(qLive-qFixed) };
  }

  return {
    id: spec.id, title: spec.title, caption: spec.caption,
    panels: 1, aspect: 0.62, aspectStacked: 0.92, steps: spec.steps,
    initState: function(){ return { t:0 }; },
    setStep: function(st,i){ st.t = spec.steps[clamp(i,0,spec.steps.length-1)].t; },
    scrub:   function(st,t){ st.t = clamp(t,0,1); },

    draw: function(canvas, state, mode){
      var S = begin(canvas, mode, this); if(!S) return;
      var ctx = S.ctx, T = S.T, fs = S.fs, dpr = S.dpr;
      var C = frame(ctx, S.box, ax, T, fs, dpr);
      var d = derive(state);

      clipped(ctx, C, function(){
        /* the curve that does not move */
        drawLine(ctx, C, spec.fixed, ax, T[spec.fixedColor], T, dpr);

        /* Where the moving curve started, left behind as a grey dashed ghost.
           Without it the shifted curve reads as a new, unrelated line; with
           it, students see the SAME curve having moved. */
        if(d.shiftU > 0.02){
          ctx.save(); ctx.globalAlpha = 0.8;
          drawLine(ctx, C, spec.moving, ax, T.muted, T, dpr, [9*dpr,6*dpr]);
          ctx.restore();
        }

        /* the moving curve, still in its own colour */
        drawLine(ctx, C, d.live, ax, T[spec.movingColor], T, dpr);

        /* which way it went */
        if(d.shiftU > 0.02){
          ctx.save();
          ctx.globalAlpha = Math.min(1, d.shiftU*2) * (1 - d.moveU*0.6);
          var ap, k;
          for(k=0;k<spec.arrowPrices.length;k++){
            ap = spec.arrowPrices[k];
            hArrow(ctx, C, ap, spec.moving.q(ap), d.live.q(ap),
                   T[spec.movingColor], T, fs, dpr);
          }
          ctx.restore();
        }

        /* the original equilibrium stays marked until the walk begins */
        ctx.save();
        ctx.globalAlpha = 1 - d.moveU*0.75;
        guides(ctx, C, ax, eq0.q, eq0.p, T.muted, T, dpr);
        labelledPoint(ctx, C, eq0.q, eq0.p, 'E', T.ink2, 'circle',
                      T, fs, dpr, 'nw', false);
        ctx.restore();

        /* the gap that opens at the old price */
        if(d.gapU > 0 && d.moveU < 1 && d.gap > 0.02){
          ctx.save();
          ctx.globalAlpha = d.gapU * (1 - d.moveU);
          var lo = Math.min(d.qFixed, d.qLive), hi = Math.max(d.qFixed, d.qLive);
          polyline(ctx, C, [[lo,eq0.p],[hi,eq0.p]], T.green, T.lw.annot*dpr);
          /* read the far end off the quantity axis */
          polyline(ctx, C, [[d.qLive,eq0.p],[d.qLive,ax.ymin]], T.green,
                   T.lw.guide*dpr, [6*dpr,5*dpr]);
          ctx.restore();
          /* Above the bar and clear of the crossing, with its own background:
             this label lands in the busiest part of the figure. */
          ctx.save();
          ctx.globalAlpha = d.gapU * (1 - d.moveU);
          chipText(ctx, spec.gapLabel + ' = ' + num(d.gap),
                   C.X((lo+hi)/2), C.Y(eq0.p) - 26*fs*dpr,
                   'center', 'bottom', T.green, T, fs, dpr);
          ctx.restore();
        }

        /* the equilibrium walking to its new home */
        if(d.moveU > 0){
          guides(ctx, C, ax, d.q, d.p, T.gold, T, dpr);
          labelledPoint(ctx, C, d.q, d.p, d.moveU > 0.9 ? 'A' : '', T.gold,
                        'diamond', T, fs, dpr, 'ne', true);
        }
      });

      curveTag(ctx, C, spec.fixed, ax, spec.fixedLabel, T[spec.fixedColor], T, fs, dpr);
      if(d.shiftU > 0.25){
        ctx.save(); ctx.globalAlpha = Math.min(1,(d.shiftU-0.25)/0.35);
        curveTag(ctx, C, spec.moving, ax, spec.movingLabel, T.muted, T, fs, dpr);
        curveTag(ctx, C, d.live, ax, spec.movedLabel, T[spec.movingColor], T, fs, dpr);
        ctx.restore();
      } else {
        curveTag(ctx, C, d.live, ax, spec.movingLabel, T[spec.movingColor], T, fs, dpr);
      }

      /* The readout sits above the plot, so it cannot land on a curve
         whichever way the shifted line runs. */
      headNote(ctx, C, d.moveU > 0
        ? ('Equilibrium ' + money(d.p) + '   ·   ' + num(d.q) + ' gallons')
        : ('Equilibrium ' + money(eq0.p) + '   ·   ' + num(eq0.q) + ' gallons'),
        T.ink, T, fs, dpr, 0);
    },

    describe: function(state){ return spec.describeAt(derive(state)); },
    ariaLabel: function(state){
      var d = derive(state);
      if(d.moveU >= 1) return spec.title + '. New equilibrium at ' +
        money(eq1.p) + ' and ' + eq1.q + ' gallons.';
      if(d.shiftU >= 1) return spec.title + '. The curve has shifted; ' +
        spec.gapLabel.toLowerCase() + ' of ' + num(d.gap) + ' at the old price.';
      return spec.title + '. Original equilibrium at ' + money(eq0.p) +
        ' and ' + eq0.q + ' gallons.';
    }
  };
}

var AX_PS_SUPPLY = {
  xmin:0, xmax:14, ymin:0, ymax:4,
  xticks:[0,2,4,6,8,10,12,14],
  yticks:[0,0.5,1,1.5,2,2.5,3,3.5,4],
  xlabel:'Quantity (gallons)', ylabel:'Price (per gallon)'
};

/* ══ THE TEN FIGURES ══════════════════════════════════════════════════════ */

var figures = {

  'fig-2-1-demand': scheduleFigure({
    id:'fig-2-1-demand',
    title:'The demand curve for gasoline',
    caption:'Demand schedule for gallons of gas. Each row of the table is one point ' +
            'on the curve: at a price of $8 the quantity demanded is 4 gallons, at $4 ' +
            'it is 12. The line through them is the demand curve, P = 10 − 0.5Q.',
    axis:AX_GAS18, curve:D.demand, points:D.demandPts,
    colorKey:'blue', shape:'circle', anchor:'ne',
    curveLabel:'D', readoutCorner:'se',
    readout:function(pt){ return 'Price ' + money(pt[2]) + '  →  quantity demanded ' + pt[1]; },
    describeAt:function(pt,i,n){
      return 'Point ' + pt[0] + ', ' + (i+1) + ' of ' + n + ' on the demand curve. ' +
        'At a price of ' + money(pt[2]) + ' per gallon the quantity demanded is ' +
        pt[1] + ' gallons. Dashed guides run from the point across to the price axis ' +
        'and down to the quantity axis. The curve slopes down: the lower the price, ' +
        'the more gas people buy. This is a movement along the curve, not a shift.';
    }
  }),

  'fig-2-2-demand-shift': shiftFigure({
    id:'fig-2-2-demand-shift', mode:'shift',
    title:'A rise in income shifts the demand curve right',
    caption:'Income goes up → more gas at the same price. At every price the quantity ' +
            'demanded is 2 gallons higher, so the whole curve slides right from ' +
            'P = 10 − 0.5Q to P = 11 − 0.5Q.',
    axis:AX_GAS, curve:D.demand, shifted:D.demandIncome,
    points:D.demandPts, shiftedPoints:D.demandPtsIncome,
    arrowPrices:[10,8,6,4,2], baseAnchor:'se',
    colorKey:'blue', shape:'circle', anchor:'ne',
    curveLabel:'D', shiftedLabel:'D′',
    shiftNote:'Income $40k → $60k: demand shifts right',
    steps:[{name:'before',t:0,label:'Income $40k'},
           {name:'after', t:1,label:'Income $60k'}],
    ariaStart:'Demand curve with schedule points A to E.',
    ariaEnd:'Demand has shifted right to a second curve with points A prime to E prime.',
    describeAt:function(d){
      if(d.shiftU <= 0) return 'The original demand curve for gas, with schedule ' +
        'points A at $10 and 0 gallons through E at $2 and 16 gallons.';
      if(d.shiftU < 1) return 'The demand curve is sliding to the right.';
      return 'The demand curve has shifted right by 2 gallons at every price. At $8 ' +
        'the quantity demanded rises from 4 gallons to 6; at $6, from 8 to 10. Nothing ' +
        'about the price of gas changed — income did — so the curve moved rather than ' +
        'the point moving along it.';
    }
  }),

  'fig-2-3-demand-move-vs-shift': shiftFigure({
    id:'fig-2-3-demand-move-vs-shift', mode:'static',
    title:'Movement along the demand curve versus a shift of it',
    caption:'Starting at point C. A rise in the price of gas moves us along the curve ' +
            'to B. A rise in the price of electric vehicles — a substitute — shifts the ' +
            'whole curve out to D₂ instead.',
    axis:AX_GAS, curve:D.demand, shifted:D.demandIncome,
    points:[['B',4,8],['C',8,6],['E',12,4]], baseAnchor:'se',
    colorKey:'blue', shape:'circle', anchor:'ne',
    curveLabel:'D₁', shiftedLabel:'D₂',
    steps:[{name:'static', t:0, label:'—'}],
    ariaStart:'', ariaEnd:'Two demand curves, D one and D two.',
    describeAt:function(){
      return 'Two demand curves. D₁ carries three labelled points: B at $8 and 4 ' +
        'gallons, C at $6 and 8 gallons, and E at $4 and 12 gallons. D₂ lies parallel ' +
        'to D₁ and 2 gallons to its right at every price. A rise in the price of gas ' +
        'moves you along D₁ from C to B; a rise in the price of electric vehicles ' +
        'moves the whole curve out to D₂.';
    }
  }),

  'fig-2-4-supply': scheduleFigure({
    id:'fig-2-4-supply',
    title:'The supply curve for gasoline',
    caption:'Supply schedule for gasoline. Each row of the table is one point on the ' +
            'curve: at a price of $3 the quantity supplied is 2 gallons, at $6 it is 8. ' +
            'The line through them is the supply curve, P = 2 + 0.5Q.',
    axis:AX_GAS, curve:D.supply, points:D.supplyPts,
    colorKey:'red', shape:'square', anchor:'se',
    curveLabel:'S', readoutCorner:'nw',
    readout:function(pt){ return 'Price ' + money(pt[2]) + '  →  quantity supplied ' + pt[1]; },
    describeAt:function(pt,i,n){
      return 'Point ' + pt[0] + ', ' + (i+1) + ' of ' + n + ' on the supply curve. ' +
        'At a price of ' + money(pt[2]) + ' per gallon the quantity supplied is ' +
        pt[1] + ' gallons. Dashed guides run from the point across to the price axis ' +
        'and down to the quantity axis. The curve slopes up: the higher the price, the ' +
        'more firms are willing to sell. This is a movement along the curve, not a shift.';
    }
  }),

  'fig-2-5-supply-cost-shift': shiftFigure({
    id:'fig-2-5-supply-cost-shift', mode:'shift', aspect:0.55,
    title:'Higher costs shift the supply curve left',
    caption:'Increased costs → less production. At every price firms are willing to ' +
            'sell 2 fewer slices, so the curve slides left. Read it off at $2: the ' +
            'quantity supplied falls from 6 slices to 4.',
    axis:AX_PIZZA, curve:D.pizzaSupply, shifted:D.pizzaSupply2,
    points:D.pizzaPts, readGuide:{p:2}, baseAnchor:'se',
    arrowPrices:[1,1.5,2,2.5,3,3.5],
    colorKey:'red', shape:'square', anchor:'nw',
    curveLabel:'S', shiftedLabel:'S′',
    shiftNote:'Costs rise: supply shifts left',
    steps:[{name:'before',t:0,label:'Original costs'},
           {name:'after', t:1,label:'Costs rise'}],
    ariaStart:'Supply curve for pizza slices with schedule points A to G.',
    ariaEnd:'Supply has shifted left; at a price of $2 the quantity supplied falls from 6 to 4.',
    describeAt:function(d){
      if(d.shiftU <= 0) return 'The original supply curve for pizza slices, rising from ' +
        'point A at $0.50 and 0 slices to point G at $3.50 and 12 slices.';
      if(d.shiftU < 1) return 'The supply curve is sliding to the left.';
      return 'The supply curve has shifted left. At a price of $2 a slice the quantity ' +
        'supplied falls from 6 slices to 4, and the dashed guides mark both. Costs went ' +
        'up, not the price of pizza, so the curve moved rather than the point moving ' +
        'along it.';
    }
  }),

  'fig-2-6-supply-move-vs-shift': shiftFigure({
    id:'fig-2-6-supply-move-vs-shift', mode:'static', aspect:0.55,
    title:'Movement along the supply curve versus a shift of it',
    caption:'Starting at point E. A rise in the price of gas moves us along the curve ' +
            'to F. A rise in the wage paid to oil drillers shifts the whole curve back ' +
            'to S₂ instead.',
    axis:AX_PS_SUPPLY, curve:D.pizzaSupply, shifted:D.pizzaSupply2,
    points:[['C',4,1.5],['E',8,2.5],['F',10,3]], baseAnchor:'se',
    colorKey:'red', shape:'square', anchor:'nw',
    curveLabel:'S₁', shiftedLabel:'S₂',
    steps:[{name:'static', t:0, label:'—'}],
    ariaStart:'', ariaEnd:'Two supply curves, S one and S two.',
    describeAt:function(){
      return 'Two supply curves. S₁ carries three labelled points: C at $1.50 and 4 ' +
        'gallons, E at $2.50 and 8 gallons, and F at $3 and 10 gallons. S₂ lies ' +
        'parallel to S₁ and 2 gallons to its left at every price. A rise in the price ' +
        'of gas moves you along S₁ from E to F; a rise in the wage paid to oil ' +
        'drillers moves the whole curve back to S₂.';
    }
  }),

  'fig-2-7-excess-supply': excessFigure({
    id:'fig-2-7-excess-supply', startP:8,
    title:'Excess supply pushes the price down',
    caption:'At $8 firms want to sell 12 gallons but consumers only want to buy 4 — a ' +
            'surplus of 8. Firms cut the price, which raises quantity demanded and ' +
            'lowers quantity supplied, until the surplus is gone at $6 and 8 gallons.',
    axis:AX_GAS, gapLabel:'Excess supply',
    steps:[{name:'p8', t:0,   label:'Price $8 — surplus of 8'},
           {name:'p7', t:0.5, label:'Price falls to $7'},
           {name:'eq', t:1,   label:'Equilibrium: $6, 8 gallons'}],
    describeAt:function(d){
      if(d.gap <= 0.02) return 'The market has cleared. At $6 per gallon the quantity ' +
        'demanded and the quantity supplied are both 8 gallons, marked E. There is no ' +
        'surplus left, so there is nothing pushing the price any further down.';
      return 'The price is ' + money(d.p) + '. Quantity supplied is ' + num(d.qs) +
        ' gallons and quantity demanded is only ' + num(d.qd) + ', a surplus of ' +
        num(d.gap) + ' gallons shown as the green bar between the curves. Firms cannot ' +
        'sell what they have made, so they cut the price, and the bar narrows.';
    }
  }),

  'fig-2-8-excess-demand': excessFigure({
    id:'fig-2-8-excess-demand', startP:4,
    title:'Excess demand pushes the price up',
    caption:'At $4 consumers want 12 gallons but firms only want to sell 4 — a shortage ' +
            'of 8. Firms raise the price, which lowers quantity demanded and raises ' +
            'quantity supplied, until the shortage is gone at $6 and 8 gallons.',
    axis:AX_GAS, gapLabel:'Excess demand',
    steps:[{name:'p4', t:0,   label:'Price $4 — shortage of 8'},
           {name:'p5', t:0.5, label:'Price rises to $5'},
           {name:'eq', t:1,   label:'Equilibrium: $6, 8 gallons'}],
    describeAt:function(d){
      if(d.gap <= 0.02) return 'The market has cleared. At $6 per gallon the quantity ' +
        'demanded and the quantity supplied are both 8 gallons, marked E. There is no ' +
        'shortage left, so there is nothing pushing the price any further up.';
      return 'The price is ' + money(d.p) + '. Quantity demanded is ' + num(d.qd) +
        ' gallons and quantity supplied is only ' + num(d.qs) + ', a shortage of ' +
        num(d.gap) + ' gallons shown as the green bar between the curves. Buyers cannot ' +
        'get what they want, so firms raise the price, and the bar narrows.';
    }
  }),

  'fig-2-9-demand-shift-equilibrium': equilibriumShiftFigure({
    id:'fig-2-9-demand-shift-equilibrium',
    title:'A rise in income moves the equilibrium',
    caption:'Income rises, so demand shifts right. At the old price of $6 there is now ' +
            'excess demand of 4 gallons, so firms raise the price. Quantity supplied ' +
            'rises and quantity demanded falls until the market clears again at $7 and ' +
            '10 gallons.',
    moving:D.demand, movedTo:D.demandShift, fixed:D.supply,
    newEq:D.eqDemand, gapLabel:'Excess demand',
    movingColor:'blue', movingLabel:'D',  movedLabel:'D′',
    fixedColor:'red',   fixedLabel:'S',
    arrowPrices:[4,8], readoutCorner:'sw',
    steps:[{name:'eq0',   t:0,    label:'Equilibrium: $6, 8 gallons'},
           {name:'shift', t:0.42, label:'Income rises → demand shifts right'},
           {name:'gap',   t:0.62, label:'Excess demand of 4 at $6'},
           {name:'eq1',   t:1,    label:'New equilibrium: $7, 10 gallons'}],
    describeAt:function(d){
      if(d.moveU >= 1) return 'The market has settled at the new equilibrium, marked A: ' +
        '$7 per gallon and 10 gallons traded. Both the price and the quantity rose, which ' +
        'is what a rightward shift in demand always does when supply has not moved.';
      if(d.moveU > 0) return 'The price is rising through ' + money(d.p) + '. As it does, ' +
        'firms increase the quantity they supply and consumers cut the quantity they ' +
        'demand, so the equilibrium point climbs up the unchanged supply curve.';
      if(d.gapU > 0) return 'At the old price of $6 the shifted demand curve calls for 12 ' +
        'gallons but supply still offers only 8 — excess demand of 4 gallons. Buyers ' +
        'compete for the gas that exists, so the price starts to rise.';
      if(d.shiftU > 0) return 'The demand curve is sliding right; supply has not moved.';
      return 'Supply and demand cross at E: $6 per gallon and 8 gallons traded.';
    }
  }),

  'fig-2-10-supply-shift-equilibrium': equilibriumShiftFigure({
    id:'fig-2-10-supply-shift-equilibrium',
    title:'A fall in wages moves the equilibrium',
    caption:'Wages fall, so supply shifts right. At the old price of $6 there is now ' +
            'excess supply of 4 gallons, so firms cut the price. Quantity demanded ' +
            'rises and quantity supplied falls until the market clears again at $5 and ' +
            '10 gallons.',
    moving:D.supply, movedTo:D.supplyShift, fixed:D.demand,
    newEq:D.eqSupply, gapLabel:'Excess supply',
    movingColor:'red',  movingLabel:'S',  movedLabel:'S′',
    fixedColor:'blue',  fixedLabel:'D',
    arrowPrices:[4,8], readoutCorner:'nw',
    steps:[{name:'eq0',   t:0,    label:'Equilibrium: $6, 8 gallons'},
           {name:'shift', t:0.42, label:'Wages fall → supply shifts right'},
           {name:'gap',   t:0.62, label:'Excess supply of 4 at $6'},
           {name:'eq1',   t:1,    label:'New equilibrium: $5, 10 gallons'}],
    describeAt:function(d){
      if(d.moveU >= 1) return 'The market has settled at the new equilibrium, marked A: ' +
        '$5 per gallon and 10 gallons traded. The price fell and the quantity rose, which ' +
        'is what a rightward shift in supply always does when demand has not moved.';
      if(d.moveU > 0) return 'The price is falling through ' + money(d.p) + '. As it does, ' +
        'consumers increase the quantity they demand and firms cut the quantity they ' +
        'supply, so the equilibrium point slides down the unchanged demand curve.';
      if(d.gapU > 0) return 'At the old price of $6 the shifted supply curve offers 12 ' +
        'gallons but demand only wants 8 — excess supply of 4 gallons. Firms cannot sell ' +
        'it all, so the price starts to fall.';
      if(d.shiftU > 0) return 'The supply curve is sliding right; demand has not moved.';
      return 'Supply and demand cross at E: $6 per gallon and 8 gallons traded.';
    }
  })
};

var ORDER = ['fig-2-1-demand','fig-2-2-demand-shift','fig-2-3-demand-move-vs-shift',
             'fig-2-4-supply','fig-2-5-supply-cost-shift','fig-2-6-supply-move-vs-shift',
             'fig-2-7-excess-supply','fig-2-8-excess-demand',
             'fig-2-9-demand-shift-equilibrium','fig-2-10-supply-shift-equilibrium'];

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
global.EconFigures['unit-02'] = {
  THEME: THEME,
  figures: figures,
  order: ORDER,
  layout: layout,
  createController: createController,
  indexOfStep: indexOfStep,
  DURATION: DURATION,
  reducedMotion: reducedMotion,
  /* exported for tooling/tests only — pages must not draw with these */
  _helpers: { setupCanvas: setupCanvas, tickStep: tickStep, snapUp: snapUp, ease: ease }
};

})(window);
