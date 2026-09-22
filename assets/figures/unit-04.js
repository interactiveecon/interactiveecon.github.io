/* ============================================================================
   unit-04.js — ECON 002, Unit 4: Unemployment
   Shared figure module. SINGLE SOURCE OF TRUTH for every dynamic figure in
   this unit.

   Consumed by BOTH:
     classes/econ002/notes/unit-04/index.html   (mode 'notes')
     classes/econ002/notes/unit-04/deck.html    (mode 'stage')

   The unit's four FRED charts are pre-rendered PDFs in the source, so they
   ship as images under assets/figures/unit-04/. What lives here are the four
   labor-market diagrams the source draws with TikZ.

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
    maxTickW = Math.max(maxTickW, ctx.measureText(
      cfg.ytickText ? cfg.ytickText(cfg.yticks[i]) : String(cfg.yticks[i])).width);
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
        /* xtickText lets a figure label its axis with symbols (L*, L′) in
           place of numbers, the way the source diagrams do. */
        ctx.fillText(cfg.xtickText ? cfg.xtickText(v) : String(v),
                     tx, py+ph+tickLen+2*fs*dpr);
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
        ctx.fillText(cfg.ytickText ? cfg.ytickText(v) : String(v),
                     px-tickLen-3*fs*dpr, ty);
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


/* ══ DATA — transcribed verbatim from "Unemployment.tex" ═══════════════════
   All four labor-market diagrams share one market, drawn on the same axes.

     Labor demand    W/P = 10 − L        line 428, domain 1..9
     Labor supply    W/P = L             line 430, domain 1..9
     Equilibrium     A at (5, 5)
     Demand falls    W/P = 8 − L         line 520, domain 1..7
     Wage floor      W/P = 6             line 660

   The axes carry symbols rather than numbers, exactly as the source does:
   L*, L′, L₁, L″ on the horizontal, W/P* and W/P′ on the vertical.        */

function line(a, b){ return { a:a, b:b, at:function(q){ return a + b*q; },
                              q:function(p){ return (p - a)/b; } }; }

var D = {
  LD:      line(10, -1),      /* W/P = 10 − L */
  LS:      line(0,   1),      /* W/P = L      */
  LDfall:  line(8,  -1),      /* W/P =  8 − L */
  eq:      { L:5, w:5 },      /* A  */
  eqFall:  { L:4, w:4 },      /* B, once the wage is free to fall */
  Lsurplus: 3,                /* labour demanded at the OLD wage after the fall */
  floor:   6,                 /* a wage held above equilibrium */
  floorLd: 4,                 /* demanded at that wage  (L′)  */
  floorLs: 6                  /* supplied at that wage  (L″)  */
};

var AX = {
  xmin:0, xmax:11, ymin:0, ymax:10,
  xlabel:'Labor (L)', ylabel:'Real Wage (W/P)'
};

/* ── shared drawing ───────────────────────────────────────────────────── */

function clipLine(ln, ax, lo, hi){
  var qs = [lo === undefined ? ax.xmin : lo, hi === undefined ? ax.xmax : hi];
  var out = [], i, q, p;
  if(ln.b !== 0){ qs.push(ln.q(ax.ymax), ln.q(ax.ymin)); }
  for(i=0;i<qs.length;i++){
    q = qs[i];
    if(q < (lo===undefined?ax.xmin:lo) - 1e-9) continue;
    if(q > (hi===undefined?ax.xmax:hi) + 1e-9) continue;
    p = ln.at(q);
    if(p < ax.ymin - 1e-9 || p > ax.ymax + 1e-9) continue;
    out.push(q);
  }
  if(out.length < 2) return null;
  out.sort(function(a,b){ return a-b; });
  return [out[0], out[out.length-1]];
}

function drawLine(ctx, C, ln, color, T, dpr, lo, hi, dash){
  var r = clipLine(ln, AX, lo, hi); if(!r) return;
  polyline(ctx, C, [[r[0], ln.at(r[0])],[r[1], ln.at(r[1])]], color,
           T.lw.series*dpr, dash);
}

/* the curve's own name, parked at its right-hand end */
function curveTag(ctx, C, ln, text, color, T, fs, dpr, lo, hi){
  var r = clipLine(ln, AX, lo, hi); if(!r) return;
  var q = r[1], p = ln.at(q);
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = fnt(T,fs,dpr,'annot','700');
  ctx.textBaseline = 'middle';
  var w = ctx.measureText(text).width, gap = 9*fs*dpr;
  if(C.X(q) + gap + w > C.px + C.pw){ ctx.textAlign = 'right'; gap = -gap; }
  else ctx.textAlign = 'left';
  ctx.fillText(text, C.X(q) + gap, C.Y(p));
  ctx.restore();
}

/* dashed drop-lines from a point across to the wage axis and down to the
   labour axis, the way the source marks every equilibrium */
function guides(ctx, C, L, w, color, T, dpr, alpha){
  ctx.save();
  if(alpha !== undefined) ctx.globalAlpha = alpha;
  polyline(ctx, C, [[AX.xmin,w],[L,w]], color, T.lw.guide*dpr, [6*dpr,5*dpr]);
  polyline(ctx, C, [[L,w],[L,AX.ymin]], color, T.lw.guide*dpr, [6*dpr,5*dpr]);
  ctx.restore();
}

function dropLine(ctx, C, L, from, color, T, dpr){
  polyline(ctx, C, [[L,from],[L,AX.ymin]], color, T.lw.guide*dpr, [6*dpr,5*dpr]);
}

function labelledPoint(ctx, C, L, w, text, color, T, fs, dpr, anchor, big){
  var x = C.X(L), y = C.Y(w), r = T.dot*dpr*(big ? 1.6 : 1.15);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 2*Math.PI); ctx.fill();
  if(big){
    ctx.strokeStyle = color; ctx.lineWidth = T.lw.annot*dpr*0.7;
    ctx.beginPath(); ctx.arc(x, y, r*2.0, 0, 2*Math.PI); ctx.stroke();
  }
  ctx.restore();
  if(text){
    var off = r + 8*fs*dpr;
    chipText(ctx, text,
             x + (anchor === 'nw' || anchor === 'sw' ? -off*0.7 : off*0.7),
             y + (anchor === 'se' || anchor === 'sw' ? off*0.9 : -off*0.9),
             (anchor === 'nw' || anchor === 'sw') ? 'right' : 'left',
             'middle', color, T, fs, dpr);
  }
}

/* The horizontal bar between the two sides of the market at a wage that does
   not clear it. This distance IS the unemployment. */
function surplusBar(ctx, C, L0, L1, w, label, T, fs, dpr){
  polyline(ctx, C, [[L0,w],[L1,w]], T.gold, T.lw.annot*dpr);
  var head = Math.max(6, T.lw.annot*dpr*2.2), i;
  ctx.save();
  ctx.fillStyle = T.gold;
  for(i=0;i<2;i++){
    var x = C.X(i ? L1 : L0), dir = i ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(x + dir*head*0.2, C.Y(w));
    ctx.lineTo(x - dir*head*0.9, C.Y(w) - head*0.6);
    ctx.lineTo(x - dir*head*0.9, C.Y(w) + head*0.6);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  chipText(ctx, label, C.X((L0+L1)/2), C.Y(w) - 12*fs*dpr,
           'center', 'bottom', T.gold, T, fs, dpr);
}

/* An arrow between two points in data coordinates, standing off both ends
   so it reads as a separate object rather than as part of the curves it
   joins — the same formatting the shift arrows use in the other units. */
function dataArrow(ctx, C, L0, w0, L1, w1, color, T, fs, dpr){
  var x0 = C.X(L0), y0 = C.Y(w0), x1 = C.X(L1), y1 = C.Y(w1);
  var dx = x1-x0, dy = y1-y0, len = Math.sqrt(dx*dx + dy*dy);
  var head = Math.max(9, T.lw.annot*dpr*3.2), gap = 17*fs*dpr;
  if(len < gap*2 + head*2.2) return;
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

/* progress through one phase of the sweep */
function seg(t, a, b){ return clamp((t-a)/(b-a), 0, 1); }

function begin(canvas, mode){
  var S = setupCanvas(canvas); if(!S) return null;
  var T = THEME[mode];
  S.T = T; S.fs = fontScale(mode, S.cssW);
  S.box = panelBoxes(S.W, S.H, S.dpr, 1, false, T.panelGap)[0];
  paintBg(S.ctx, S.W, S.H, T);
  return S;
}

/* One axis frame for every figure in the unit. `ticks` is a list of
   {v, label} so the axes can carry symbols instead of numbers. */
function frame(ctx, box, xt, yt, T, fs, dpr){
  var xmap = {}, ymap = {}, i;
  for(i=0;i<xt.length;i++) xmap[xt[i].v] = xt[i].label;
  for(i=0;i<yt.length;i++) ymap[yt[i].v] = yt[i].label;
  /* paintFrame drops a tick label that would collide with the previous one,
     which assumes it is walking the axis in order — so hand it sorted
     positions even though the figures declare them in story order. */
  function asc(a,b){ return a-b; }
  return paintFrame(ctx, box, {
    title:'', xlabel:AX.xlabel, ylabel:AX.ylabel,
    xmin:AX.xmin, xmax:AX.xmax, ymin:AX.ymin, ymax:AX.ymax,
    xticks: xt.map(function(t){ return t.v; }).sort(asc),
    yticks: yt.map(function(t){ return t.v; }).sort(asc),
    xtickText: function(v){ return xmap[v] || ''; },
    ytickText: function(v){ return ymap[v] || ''; },
    headLines: 1
  }, T, fs, dpr);
}

/* ══ FIGURE 1: the labor market ════════════════════════════════════════════ */

var figLaborMarket = (function(){
  var steps = [
    { name:'blank', t:0,    label:'Empty axes' },
    { name:'ld',    t:1/3,  label:'Labor demand' },
    { name:'ls',    t:2/3,  label:'Labor supply' },
    { name:'eq',    t:1,    label:'Equilibrium at A' }
  ];
  function derive(st){ return { i: clamp(Math.round(clamp(st.t,0,1)*3), 0, 3) }; }

  return {
    id:'fig-4-1-labor-market',
    title:'The labor market',
    caption:'Labor demand slopes down: the higher the real wage, the fewer workers firms ' +
            'want to hire. Labor supply slopes up: the higher the real wage, the more ' +
            'people want to work. They cross at A, where the number of jobs equals the ' +
            'number of people looking for one.',
    panels:1, aspect:0.62, aspectStacked:0.95, steps:steps,
    initState:function(){ return {t:0}; },
    setStep:function(st,i){ st.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:function(st,t){ st.t = clamp(t,0,1); },

    draw:function(canvas, state, mode){
      var S = begin(canvas, mode); if(!S) return;
      var ctx=S.ctx, T=S.T, fs=S.fs, dpr=S.dpr, d=derive(state);
      var C = frame(ctx, S.box,
        d.i >= 3 ? [{v:D.eq.L, label:'L*'}] : [],
        d.i >= 3 ? [{v:D.eq.w, label:'W/P*'}] : [], T, fs, dpr);

      clipped(ctx, C, function(){
        if(d.i >= 1) drawLine(ctx, C, D.LD, T.blue, T, dpr, 1, 9);
        if(d.i >= 2) drawLine(ctx, C, D.LS, T.red,  T, dpr, 1, 9);
        if(d.i >= 3){
          guides(ctx, C, D.eq.L, D.eq.w, T.muted, T, dpr);
          labelledPoint(ctx, C, D.eq.L, D.eq.w, 'A', T.green, T, fs, dpr, 'ne', true);
        }
      });
      if(d.i >= 1) curveTag(ctx, C, D.LD, 'LD', T.blue, T, fs, dpr, 1, 9);
      if(d.i >= 2) curveTag(ctx, C, D.LS, 'LS', T.red,  T, fs, dpr, 1, 9);

      headNote(ctx, C, [
        'Labor along the bottom, the real wage up the side',
        'Labor demand: the number of workers firms want to hire',
        'Labor supply: the number of workers looking for a job',
        'Equilibrium: every worker who wants a job at this wage has one'
      ][d.i], d.i === 3 ? T.green : T.ink, T, fs, dpr, 0);
    },

    describe:function(state){
      var d = derive(state);
      if(d.i === 0) return 'Empty axes: labor along the bottom, the real wage up the ' +
        'side. Nothing is plotted yet.';
      if(d.i === 1) return 'A downward-sloping labor demand curve is drawn. The higher ' +
        'the wage, the fewer workers firms want to hire.';
      if(d.i === 2) return 'Labor supply is added, sloping upward: the higher the wage, ' +
        'the more people want to work. The two curves cross in the middle of the diagram.';
      return 'The two curves cross at point A, marked with dashed guides to L star on the ' +
        'labor axis and W over P star on the wage axis. At this wage the number of jobs ' +
        'firms offer is exactly the number of people looking for one, so measured ' +
        'unemployment in this model is zero.';
    },
    ariaLabel:function(state){
      var d = derive(state);
      return 'The labor market. ' + ['Empty axes.','Labor demand only.',
        'Demand and supply.','Equilibrium at A.'][d.i];
    }
  };
})();

/* ══ FIGURE BUILDER: a fall in labor demand ════════════════════════════════
   Figures 2 and 4 are the same geometry told two ways. With a flexible wage
   the market slides down to a new equilibrium; with a sticky wage it does
   not, and the gap stays open as unemployment. Only the labels and the story
   differ, so they share one builder.
   ════════════════════════════════════════════════════════════════════════ */

function demandFallFigure(spec){
  var steps = spec.steps, P = spec.phases;

  function derive(st){
    var t = clamp(st.t,0,1), n = steps.length - 1;
    var shiftU   = seg(t, P.shift[0],  P.shift[1]);
    var gapU     = P.gap     ? seg(t, P.gap[0],     P.gap[1])     : 0;
    var moveU    = P.move    ? seg(t, P.move[0],    P.move[1])    : 0;
    var recoverU = P.recover ? seg(t, P.recover[0], P.recover[1]) : 0;
    /* the demand curve slides left, then (optionally) back again */
    var a = D.LD.a + (D.LDfall.a - D.LD.a)*shiftU
                   + (D.LD.a - D.LDfall.a)*recoverU;
    return { i: clamp(Math.round(t*n), 0, n),
             shiftU:shiftU, gapU:gapU, moveU:moveU, recoverU:recoverU,
             live: line(a, -1),
             /* the source draws LD over L = 1..9 and LD′ over 1..7, so the
                domain travels with the curve */
             liveHi: 9 + (7-9)*shiftU + (9-7)*recoverU };
  }

  return {
    id:spec.id, title:spec.title, caption:spec.caption,
    panels:1, aspect:0.62, aspectStacked:0.95, steps:steps,
    initState:function(){ return {t:0}; },
    setStep:function(st,i){ st.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:function(st,t){ st.t = clamp(t,0,1); },

    draw:function(canvas, state, mode){
      var S = begin(canvas, mode); if(!S) return;
      var ctx=S.ctx, T=S.T, fs=S.fs, dpr=S.dpr, d=derive(state);
      var moved = d.shiftU > 0.02 && d.recoverU < 0.98;

      var xt = [{v:D.eq.L, label:'L*'}];
      var yt = [{v:D.eq.w, label:'W/P*'}];
      if(d.gapU > 0.5 && d.recoverU < 0.5) xt.push({v:D.Lsurplus, label:'L₁'});
      if(d.moveU > 0.5 && d.recoverU < 0.5){
        xt.push({v:D.eqFall.L, label:'L′'});
        yt.push({v:D.eqFall.w, label:'W/P′'});
      }
      var C = frame(ctx, S.box, xt, yt, T, fs, dpr);

      clipped(ctx, C, function(){
        drawLine(ctx, C, D.LS, T.red, T, dpr, 1, 9);

        /* where demand started, left behind as a grey ghost so the shift
           reads as the same curve having moved */
        if(moved){
          ctx.save(); ctx.globalAlpha = 0.8;
          drawLine(ctx, C, D.LD, T.muted, T, dpr, 1, 9, [9*dpr,6*dpr]);
          ctx.restore();
        }
        drawLine(ctx, C, d.live, T.blue, T, dpr, 1, Math.min(9, d.liveHi));

        /* which way demand went */
        if(d.shiftU > 0.02 && d.moveU < 0.5){
          ctx.save();
          ctx.globalAlpha = Math.min(1, d.shiftU*2.5) * (1 - d.gapU*0.35);
          var k, ws = [3, 7];
          for(k=0;k<ws.length;k++){
            dataArrow(ctx, C, D.LD.q(ws[k]), ws[k], d.live.q(ws[k]), ws[k],
                      T.blue, T, fs, dpr);
          }
          ctx.restore();
        }

        guides(ctx, C, D.eq.L, D.eq.w, T.muted, T, dpr,
               d.moveU > 0.5 && spec.wageFalls ? 0.5 : 1);

        /* With a flexible wage the surplus closes once the market clears;
           with a sticky wage it stays open, which is the whole point. */
        var showSurplus = d.gapU > 0.02 &&
          (spec.surplusClears ? d.moveU < 0.5 : true) && d.recoverU < 0.5;
        if(showSurplus){
          ctx.save();
          ctx.globalAlpha = Math.min(1, d.gapU*2.5);
          dropLine(ctx, C, D.Lsurplus, D.eq.w, T.gold, T, dpr);
          surplusBar(ctx, C, D.Lsurplus, D.eq.L, D.eq.w, 'U = 2', T, fs, dpr);
          labelledPoint(ctx, C, D.Lsurplus, D.eq.w, spec.surplusLabel,
                        T.gold, T, fs, dpr, 'nw', false);
          ctx.restore();
        }

        /* the market walking to its new resting point */
        if(d.moveU > 0.02 && d.recoverU < 0.5){
          var i2;
          for(i2=0;i2<spec.moves.length;i2++){
            var m = spec.moves[i2];
            var L = m.from[0] + (m.to[0]-m.from[0])*d.moveU;
            var w = m.from[1] + (m.to[1]-m.from[1])*d.moveU;
            ctx.save();
            ctx.globalAlpha = Math.min(1, d.moveU*2.5);
            dataArrow(ctx, C, m.from[0], m.from[1], m.to[0], m.to[1],
                      T.green, T, fs, dpr);
            ctx.restore();
            if(i2 === 0){
              guides(ctx, C, L, w, T.green, T, dpr, Math.min(1, d.moveU*2));
              labelledPoint(ctx, C, L, w, d.moveU > 0.85 ? spec.newLabel : '',
                            T.green, T, fs, dpr, 'se', true);
            }
          }
        }

        /* demand climbing back to where it started */
        if(d.recoverU > 0.02){
          ctx.save();
          ctx.globalAlpha = Math.min(1, d.recoverU*2.5);
          var k2, ws2 = [3, 7];
          for(k2=0;k2<ws2.length;k2++){
            dataArrow(ctx, C, D.LDfall.q(ws2[k2]), ws2[k2], D.LD.q(ws2[k2]), ws2[k2],
                      T.blue, T, fs, dpr);
          }
          ctx.restore();
        }

        labelledPoint(ctx, C, D.eq.L, D.eq.w, 'A', T.ink2, T, fs, dpr, 'ne',
                      d.recoverU > 0.85);
      });

      curveTag(ctx, C, D.LS, 'LS', T.red, T, fs, dpr, 1, 9);
      if(moved){
        curveTag(ctx, C, D.LD, 'LD', T.muted, T, fs, dpr, 1, 9);
        curveTag(ctx, C, d.live, 'LD′', T.blue, T, fs, dpr, 1, Math.min(9, d.liveHi));
      } else {
        curveTag(ctx, C, d.live, 'LD', T.blue, T, fs, dpr, 1, Math.min(9, d.liveHi));
      }

      headNote(ctx, C, spec.notes[d.i], spec.noteColors[d.i](T), T, fs, dpr, 0);
    },

    describe:function(state){ return spec.describeAt(derive(state).i); },
    ariaLabel:function(state){
      return spec.title + '. ' + spec.aria[derive(state).i];
    }
  };
}

/* ══ FIGURE 3: a wage held above the market-clearing level ═════════════════ */

var figWageFloor = (function(){
  var steps = [
    { name:'eq',    t:0,   label:'Equilibrium at A' },
    { name:'floor', t:0.5, label:'A wage above equilibrium' },
    { name:'gap',   t:1,   label:'Surplus of labor' }
  ];
  function derive(st){ return { i: clamp(Math.round(clamp(st.t,0,1)*2), 0, 2) }; }

  return {
    id:'fig-4-3-wage-floor',
    title:'A wage held above the equilibrium wage',
    caption:'Unions, a minimum wage or efficiency wages can hold the real wage above the ' +
            'level that clears the market. At that wage firms want only L′ workers but L″ ' +
            'people want to work, and the gap between them is persistent unemployment. ' +
            'This is structural unemployment: there are simply not enough jobs.',
    panels:1, aspect:0.62, aspectStacked:0.95, steps:steps,
    initState:function(){ return {t:0}; },
    setStep:function(st,i){ st.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:function(st,t){ st.t = clamp(t,0,1); },

    draw:function(canvas, state, mode){
      var S = begin(canvas, mode); if(!S) return;
      var ctx=S.ctx, T=S.T, fs=S.fs, dpr=S.dpr, d=derive(state);
      var xt = [{v:D.eq.L, label:'L*'}];
      var yt = [{v:D.eq.w, label:'W/P*'}];
      if(d.i >= 1) yt.push({v:D.floor, label:'W/P′'});
      if(d.i >= 2){ xt.push({v:D.floorLd, label:'L′'});
                    xt.push({v:D.floorLs, label:'L″'}); }
      var C = frame(ctx, S.box, xt, yt, T, fs, dpr);

      clipped(ctx, C, function(){
        drawLine(ctx, C, D.LD, T.blue, T, dpr, 1, 9);
        drawLine(ctx, C, D.LS, T.red,  T, dpr, 1, 9);
        guides(ctx, C, D.eq.L, D.eq.w, T.muted, T, dpr, d.i >= 1 ? 0.5 : 1);
        labelledPoint(ctx, C, D.eq.L, D.eq.w, 'A', T.ink2, T, fs, dpr, 'se', false);

        if(d.i >= 1){
          /* the floor itself, drawn right across the market */
          polyline(ctx, C, [[AX.xmin, D.floor],[AX.xmax, D.floor]], T.gold,
                   T.lw.guide*dpr, [8*dpr,6*dpr]);
        }
        if(d.i >= 2){
          dropLine(ctx, C, D.floorLd, D.floor, T.gold, T, dpr);
          dropLine(ctx, C, D.floorLs, D.floor, T.gold, T, dpr);
          surplusBar(ctx, C, D.floorLd, D.floorLs, D.floor, 'U = 2', T, fs, dpr);
          labelledPoint(ctx, C, D.floorLd, D.floor, 'B',  T.gold, T, fs, dpr, 'nw', false);
          labelledPoint(ctx, C, D.floorLs, D.floor, 'B′', T.gold, T, fs, dpr, 'ne', false);
        }
      });
      curveTag(ctx, C, D.LD, 'LD', T.blue, T, fs, dpr, 1, 9);
      curveTag(ctx, C, D.LS, 'LS', T.red,  T, fs, dpr, 1, 9);

      headNote(ctx, C, [
        'The market clears at A: everyone who wants a job at this wage has one',
        'Now hold the wage above that level',
        'Firms want 4 workers; 6 want to work. The gap is unemployment.'
      ][d.i], d.i === 2 ? T.gold : T.ink, T, fs, dpr, 0);
    },

    describe:function(state){
      var d = derive(state);
      if(d.i === 0) return 'Labor demand and labor supply crossing at A, the wage that ' +
        'clears the market.';
      if(d.i === 1) return 'A dashed line marks a wage held above the equilibrium wage, ' +
        'running right across the diagram above point A.';
      return 'At the higher wage the demand curve gives only 4 workers hired, at point B, ' +
        'while the supply curve gives 6 people wanting to work, at point B prime. The gold ' +
        'bar between them is a surplus of 2 workers. Because the wage cannot fall, that ' +
        'surplus persists: this is structural unemployment, caused by a shortage of jobs ' +
        'rather than by workers searching.';
    },
    ariaLabel:function(state){
      return 'A wage held above the equilibrium wage. ' +
        ['Market clearing at A.','A wage floor above A.',
         'A surplus of 2 workers between B and B prime.'][derive(state).i];
    }
  };
})();

/* ══ THE FOUR FIGURES ═════════════════════════════════════════════════════ */

var figures = {

  'fig-4-1-labor-market': figLaborMarket,

  'fig-4-2-demand-fall': demandFallFigure({
    id:'fig-4-2-demand-fall',
    title:'A fall in labor demand, when the wage can adjust',
    caption:'Labor demand falls, so at the old wage firms want only L₁ workers while L* ' +
            'still want to work — a surplus of 2. Those workers are earning nothing, so ' +
            'some accept less, the wage falls to W/P′, and the market clears again at B. ' +
            'In this model unemployment is temporary.',
    phases:{ shift:[0, 1/3], gap:[1/3, 2/3], move:[2/3, 1] },
    wageFalls:true, surplusClears:true,
    surplusLabel:'A′', newLabel:'B',
    /* The economy is already at A′ once demand has fallen — that is where
       the wage starts coming down from, so the move to B runs from A′, not
       from the old equilibrium at A. */
    moves:[ { from:[D.Lsurplus, D.eq.w], to:[D.eqFall.L, D.eqFall.w] } ],
    steps:[
      { name:'eq',      t:0,     label:'Equilibrium at A' },
      { name:'shift',   t:1/3,   label:'Labor demand falls' },
      { name:'surplus', t:2/3,   label:'Surplus at the old wage' },
      { name:'clear',   t:1,     label:'Wage falls to B' }
    ],
    notes:[
      'The market clears at A',
      'Labor demand falls: the whole curve shifts left',
      'At the old wage, 5 want work but only 3 are hired',
      'The wage falls, and the market clears again at B'
    ],
    noteColors:[
      function(T){return T.ink;}, function(T){return T.blue;},
      function(T){return T.gold;}, function(T){return T.green;}
    ],
    describeAt:function(i){
      return [
        'Labor demand and labor supply crossing at A, the wage that clears the market.',
        'The demand curve has shifted left; the original position stays as a grey dashed ' +
        'line so the movement is visible. Supply has not moved.',
        'At the old wage of W over P star, firms now want only 3 workers but 5 still want ' +
        'to work. The gold bar between L one and L star is a surplus of 2 workers — that ' +
        'is the unemployment.',
        'The unemployed are earning nothing, so some accept a lower wage. A green arrow ' +
        'runs from A prime down the new demand curve to B: as the wage falls to W over P ' +
        'prime, firms hire more, ending at 4 workers employed. Unemployment is back to ' +
        'zero, so in this model any unemployment is temporary.'
      ][i];
    },
    aria:['Equilibrium at A.','Demand has shifted left.',
          'A surplus of 2 workers at the old wage.','New equilibrium at B.']
  }),

  'fig-4-3-wage-floor': figWageFloor,

  'fig-4-4-sticky-wages': demandFallFigure({
    id:'fig-4-4-sticky-wages',
    title:'A fall in labor demand, when the wage is sticky',
    caption:'The same fall in demand, but now the wage does not come down: contracts, ' +
            'social norms and relative-wage concerns keep it at W/P*. Employment falls to ' +
            'L₁ and the surplus of 2 stays open — that is cyclical unemployment. The long ' +
            'run has two routes out: the wage finally falls, clearing the market at C, or ' +
            'labor demand recovers and the market returns to A.',
    phases:{ shift:[0, 0.2], gap:[0.4, 0.6], move:[0.6, 0.8], recover:[0.8, 1] },
    wageFalls:true, surplusClears:false,
    surplusLabel:'B', newLabel:'C',
    /* with the wage stuck, employment is dragged along the new demand curve;
       the long-run escape is down that curve to C */
    moves:[ { from:[D.Lsurplus, D.eq.w], to:[D.eqFall.L, D.eqFall.w] } ],
    steps:[
      { name:'eq',      t:0,    label:'Equilibrium at A' },
      { name:'shift',   t:0.2,  label:'Labor demand falls' },
      { name:'stuck',   t:0.4,  label:'The wage does not fall' },
      { name:'persist', t:0.6,  label:'Unemployment persists at B' },
      { name:'long-c',  t:0.8,  label:'Long run — the wage falls to C' },
      { name:'long-ld', t:1,    label:'…or demand recovers back to A' }
    ],
    notes:[
      'The market clears at A',
      'Labor demand falls: the whole curve shifts left',
      'Wages are sticky downward: the real wage stays at W/P*',
      'Employment falls to L₁ and the surplus of 2 stays open',
      'One long-run route: the wage finally falls and the market clears at C',
      'The other: labor demand recovers, and the market returns to A'
    ],
    noteColors:[
      function(T){return T.ink;}, function(T){return T.blue;},
      function(T){return T.gold;}, function(T){return T.gold;},
      function(T){return T.green;}, function(T){return T.blue;}
    ],
    describeAt:function(i){
      return [
        'Labor demand and labor supply crossing at A, the wage that clears the market.',
        'The demand curve slides left; the original position stays as a grey dashed line, ' +
        'with blue arrows showing the direction. Supply has not moved.',
        'The wage stays at W over P star. Wages do not fall easily: explicit contracts, ' +
        'implicit social contracts and concern about relative wages all hold them up.',
        'Because the wage has not fallen, employment drops to 3 at point B while 5 people ' +
        'still want to work. The gold bar is a surplus of 2, and it does not close. This ' +
        'is cyclical unemployment: it persists as long as the wage is stuck.',
        'The first long-run route: workers unemployed long enough accept less, so the wage ' +
        'falls. A green arrow runs down the new demand curve from B to C, where the market ' +
        'clears again at W over P prime with 4 employed.',
        'The second route: labor demand recovers. Blue arrows carry the demand curve back ' +
        'to where it started and the market returns to A, at the original wage and the ' +
        'original level of employment. Either route ends the cyclical unemployment.'
      ][i];
    },
    aria:['Equilibrium at A.','Demand is shifting left.','The wage is unchanged.',
          'A surplus of 2 workers that does not close.','The wage falls to C.',
          'Demand recovers and the market returns to A.']
  })
};

var ORDER = ['fig-4-1-labor-market','fig-4-2-demand-fall',
             'fig-4-3-wage-floor','fig-4-4-sticky-wages'];

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
global.EconFigures['unit-04'] = {
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
