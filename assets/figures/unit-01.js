/* ============================================================================
   unit-01.js — ECON 002, Unit 1: Introduction to Economics
   Shared figure module. SINGLE SOURCE OF TRUTH for every dynamic figure in
   this unit.

   Consumed by BOTH:
     classes/econ002/notes/unit-01/index.html   (mode 'notes')
     classes/econ002/notes/unit-01/deck.html    (mode 'stage')

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

/* ══ DATA — transcribed verbatim from Introduction.tex ═════════════════════
   Do not round, resample or "improve" these. Students compare the screen to
   the printed PDF.  Line references are into Introduction.tex.            */

var D = {
  /* Fig 1 left, line 391 — note the plotted series stops at (6,105);
     the source comment mentions (7,107) but does not plot it. */
  TB1: [[0,0],[1,30],[2,55],[3,75],[4,90],[5,100],[6,105]],
  /* Fig 1 right, line 415 — six points; source comment mentions a 7th
     value of 2 which is not plotted. */
  MB:  [[1,30],[2,25],[3,20],[4,15],[5,10],[6,5]],
  /* Fig 2 left, line 458 */
  TC:  [[0,0],[1,2],[2,5],[3,10],[4,17],[5,27],[6,40],[7,56]],
  /* Fig 2 right, line 482 */
  MC:  [[1,2],[2,3],[3,5],[4,7],[5,10],[6,13],[7,16]],
  /* Fig 3 left, line 515 — eight points, one longer than TB1 */
  TB3: [[0,0],[1,30],[2,55],[3,75],[4,90],[5,100],[6,105],[7,107]],

  /* Fig 4, lines 641 & 646 */
  cycle: {
    xmin: 0, xmax: 10, ymin: 0.4, ymax: 2.6,
    trend:  function(x){ return 1 + 0.12*x; },
    actual: function(x){ return 1 + 0.12*x + 0.35*Math.sin(2*Math.PI*0.33*x + 0.4); },
    dActual:function(x){ return 0.12 + 0.35*(2*Math.PI*0.33)*Math.cos(2*Math.PI*0.33*x + 0.4); }
  }
};

function seriesLookup(arr){
  var m = {}, i;
  for(i=0;i<arr.length;i++) m[arr[i][0]] = arr[i][1];
  return m;
}
var TB1v = seriesLookup(D.TB1), MBv = seriesLookup(D.MB),
    TCv  = seriesLookup(D.TC),  MCv = seriesLookup(D.MC),
    TB3v = seriesLookup(D.TB3);

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
function vMeasure(ctx, C, x, y0, y1, color, T, fs, dpr, label, side, at){
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
    /* 'top' parks the readout at the high end of the measure; the middle of
       this gap is where the optimum marker already lives. */
    var ly = (at === 'top') ? Math.min(Ya, Yb) : (Ya+Yb)/2;
    chipText(ctx, label, X + (side==='left' ? -pad : pad), ly,
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

/* ══ FIGURE BUILDER: total ↔ marginal sweep ════════════════════════════════
   Shared by fig-1-1-benefit and fig-1-2-cost. The whole teaching point is
   that the right-hand panel IS the rise on the left-hand curve, so the two
   panels are animated from one parameter: as the rise grows on the left, the
   bar grows to the identical value in y-units on the right.
   ════════════════════════════════════════════════════════════════════════ */

function totalMarginalFigure(spec){

  var totals = spec.total, marg = spec.marginal;
  var Tv = seriesLookup(totals), Mv = seriesLookup(marg);
  var hMax = spec.hMax;

  function derive(state){
    var hf = clamp(state.t,0,1) * hMax;
    var h  = hf <= 0 ? 0 : Math.min(hMax, Math.ceil(hf - 1e-9));
    var frac = h === 0 ? 0 : clamp(hf - (h-1), 0, 1);
    return { hf:hf, h:h, frac:frac,
             from: h>0 ? Tv[h-1] : 0,
             to:   h>0 ? Tv[h]   : 0,
             rise: h>0 ? (Tv[h]-Tv[h-1]) : 0,
             mval: h>0 ? Mv[h] : 0 };
  }

  var steps = [], i;
  for(i=0;i<=hMax;i++){
    steps.push({ name:'h'+i, t:i/hMax,
                 label: i===0 ? 'Start' : ('Hour ' + i) });
  }

  return {
    id: spec.id,
    title: spec.title,
    caption: spec.caption,
    panels: 2,
    aspect: 0.50,
    aspectStacked: 1.30,
    steps: steps,

    initState: function(){ return { t: 0 }; },
    setStep:   function(state, i){ state.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:     function(state, t){ state.t = clamp(t,0,1); },

    draw: function(canvas, state, mode){
      var S = setupCanvas(canvas); if(!S) return;
      var T = THEME[mode], ctx = S.ctx, dpr = S.dpr;
      var fs = fontScale(mode, S.cssW);                    /* WCAG 1.4.4 */
      var lay = layout(this, S.cssW);
      var boxes = panelBoxes(S.W, S.H, dpr, 2, lay.stacked, T.panelGap);
      var d = derive(state);
      var col = T[spec.colorKey], shape = spec.shape;

      var yH = yLabelHoriz(ctx, boxes[0], T, fs, dpr,
                           [spec.left.ylabel, spec.right.ylabel], true, 1);

      paintBg(ctx, S.W, S.H, T);

      /* ── LEFT: the total curve ─────────────────────────────────────── */
      var L = paintFrame(ctx, boxes[0], {
        title: spec.left.title, xlabel:'Hours of Study', ylabel: spec.left.ylabel,
        xmin:0, xmax:7.5, ymin:0, ymax:spec.left.ymax,
        xticks:[0,1,2,3,4,5,6,7], yticks:spec.left.yticks, yHoriz: yH,
        headLines: 1
      }, T, fs, dpr);

      clipped(ctx, L, function(){
        var j;
        /* completed staircase, muted */
        for(j=1;j<d.h;j++){
          polyline(ctx, L, [[j-1,Tv[j-1]],[j,Tv[j-1]]], T.muted, T.lw.guide*dpr, [4*dpr,4*dpr]);
          polyline(ctx, L, [[j,Tv[j-1]],[j,Tv[j]]],     T.muted, T.lw.guide*dpr, [4*dpr,4*dpr]);
        }
        polyline(ctx, L, totals, col, T.lw.series*dpr);
        markers(ctx, L, totals, col, T.dot*dpr, shape);

        if(d.h > 0){
          /* the run */
          polyline(ctx, L, [[d.h-1,d.from],[d.h,d.from]], T.ink2, T.lw.guide*dpr, [5*dpr,4*dpr]);
          /* the rise — grows with the sweep */
          vMeasure(ctx, L, d.h, d.from, d.from + d.frac*d.rise, T.green, T, fs, dpr,
                   (d.frac > 0.06 ? ((spec.sign) + d.rise) : ''), 'right');
        }
      });

      if(d.h > 0){
        headNote(ctx, L, 'Hour ' + d.h + ': ' + spec.noun + ' rises by ' + d.rise,
                 T.green, T, fs, dpr, 0);
      }

      /* ── RIGHT: the marginal series ────────────────────────────────── */
      var R = paintFrame(ctx, boxes[1], {
        title: spec.right.title, xlabel:'Hours of Study', ylabel: spec.right.ylabel,
        xmin:0, xmax:7.5, ymin:0, ymax:spec.right.ymax,
        xticks:[0,1,2,3,4,5,6,7], yticks:spec.right.yticks, yHoriz: yH,
        headLines: 1
      }, T, fs, dpr);

      clipped(ctx, R, function(){
        polyline(ctx, R, marg, col, T.lw.series*dpr);
        markers(ctx, R, marg, col, T.dot*dpr, shape);

        if(d.h > 0 && Mv[d.h] !== undefined){
          /* bar of identical height in y-units to the rise on the left */
          vMeasure(ctx, R, d.h, 0, d.frac*d.mval, T.green, T, fs, dpr,
                   (d.frac > 0.06 ? ((spec.sign) + d.mval) : ''), 'right');
          if(d.frac > 0.95){
            var x = R.X(d.h), y = R.Y(d.mval);
            ctx.save();
            ctx.strokeStyle = T.green; ctx.lineWidth = T.lw.annot*dpr;
            ctx.beginPath(); ctx.arc(x, y, T.dot*dpr*2.1, 0, 2*Math.PI); ctx.stroke();
            ctx.restore();
          }
        }
      });

      if(d.h > 0 && Mv[d.h] !== undefined){
        headNote(ctx, R, 'Hour ' + d.h + ': ' + spec.margNoun + ' is ' + d.mval,
                 T.green, T, fs, dpr, 0);
      }
    },

    describe: function(state){
      var d = derive(state);
      if(d.h === 0){
        return spec.describeStart;
      }
      return 'Hour ' + d.h + ' of ' + hMax + '. On the left, ' + spec.noun +
             ' rises from ' + d.from + ' to ' + d.to + ' ' + spec.units +
             ' — a rise of ' + d.rise + '. On the right, the ' + spec.margNoun +
             ' point for hour ' + d.h + ' sits at ' + d.mval + ' ' + spec.margUnits +
             ': the same ' + d.rise + ' unit rise, read straight off the axis. ' +
             spec.trend;
    },

    ariaLabel: function(state){
      var d = derive(state);
      return spec.title + '. ' + (d.h === 0
        ? 'Sweep not started.'
        : 'Hour ' + d.h + ': rise of ' + d.rise + ', ' + spec.margNoun +
          ' equals ' + d.mval + '.');
    }
  };
}

/* ══ FIGURE: fig-1-3-optimum ═══════════════════════════════════════════════
   The payoff figure. Left: the vertical gap TB − TC (net benefit). Right:
   the vertical distance MB − MC. The gap peaks at 73 and the marginal rule
   picks h = 5, where MB = MC = 10.

   Note on the data: TB − TC equals 73 at BOTH h = 4 and h = 5 (90−17 and
   100−27). That tie is exactly what MB = MC = 10 means — the fifth hour adds
   as much benefit as it costs, so it changes the total by nothing. The
   locked-in optimum is h = 5, matching the printed figure.
   ════════════════════════════════════════════════════════════════════════ */

var figOptimum = (function(){

  var H_LO = 1, H_HI = 7, SPAN = H_HI - H_LO;
  var LOCK_AT = 5, LOCK_RAMP = 0.4;   /* fade-in starts at 4.6, full at 5 */

  function derive(state){
    var hf = H_LO + clamp(state.t,0,1)*SPAN;
    var h  = clamp(Math.round(hf), H_LO, H_HI);
    var tb = TB3v[h], tc = TCv[h];
    var lockA = clamp((hf - (LOCK_AT - LOCK_RAMP)) / LOCK_RAMP, 0, 1);
    return {
      hf:hf, h:h, tb:tb, tc:tc, gap: tb - tc,
      mb: MBv[h], mc: MCv[h],
      hasMB: (MBv[h] !== undefined),
      lockA: lockA, locked: lockA > 0
    };
  }

  var steps = [
    { name:'h1',      t:0/6, label:'Hour 1' },
    { name:'h2',      t:1/6, label:'Hour 2' },
    { name:'h3',      t:2/6, label:'Hour 3' },
    { name:'h4',      t:3/6, label:'Hour 4' },
    { name:'optimum', t:4/6, label:'Hour 5 — the optimum' },
    { name:'h6',      t:5/6, label:'Hour 6' },
    { name:'h7',      t:6/6, label:'Hour 7' }
  ];

  return {
    id: 'fig-1-3-optimum',
    title: 'Total benefit vs. total cost, and marginal benefit vs. marginal cost',
    caption: 'The optimal level of study is where marginal benefit equals marginal ' +
             'cost. At this point (roughly 5 hours), the vertical gap between total ' +
             'benefit and total cost — the net benefit — is at its maximum.',
    panels: 2,
    aspect: 0.52,
    aspectStacked: 1.34,
    steps: steps,

    initState: function(){ return { t: 0 }; },
    setStep:   function(state, i){ state.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:     function(state, t){ state.t = clamp(t,0,1); },

    draw: function(canvas, state, mode){
      var S = setupCanvas(canvas); if(!S) return;
      var T = THEME[mode], ctx = S.ctx, dpr = S.dpr;
      var fs = fontScale(mode, S.cssW);
      var lay = layout(this, S.cssW);
      var boxes = panelBoxes(S.W, S.H, dpr, 2, lay.stacked, T.panelGap);
      var d = derive(state);

      var yH = yLabelHoriz(ctx, boxes[0], T, fs, dpr,
                 ['Total Benefit / Total Cost',
                  'Marginal Benefit / Marginal Cost'], true, 1);

      paintBg(ctx, S.W, S.H, T);

      /* ── LEFT: TB vs TC, with the net-benefit gap ──────────────────── */
      var L = paintFrame(ctx, boxes[0], {
        title:'Total Benefit vs. Total Cost',
        xlabel:'Hours of Study', ylabel:'Total Benefit / Total Cost',
        xmin:0, xmax:7.5, ymin:0, ymax:120,
        xticks:[0,1,2,3,4,5,6,7], yticks:[0,20,40,60,80,100,120], yHoriz: yH,
        headLines: 1
      }, T, fs, dpr);

      clipped(ctx, L, function(){
        if(d.lockA > 0){
          ctx.save(); ctx.globalAlpha = d.lockA;
          polyline(ctx, L, [[LOCK_AT,0],[LOCK_AT,120]], T.muted, T.lw.guide*dpr, [7*dpr,5*dpr]);
          ctx.restore();
        }
        polyline(ctx, L, D.TB3, T.blue, T.lw.series*dpr);
        markers (ctx, L, D.TB3, T.blue, T.dot*dpr, 'circle');
        polyline(ctx, L, D.TC,  T.red,  T.lw.series*dpr);
        markers (ctx, L, D.TC,  T.red,  T.dot*dpr, 'square');

        vMeasure(ctx, L, d.h, d.tc, d.tb, T.green, T, fs, dpr,
                 (d.h === LOCK_AT ? ('Max gap = ' + d.gap)
                                  : ('Net benefit = ' + d.gap)),
                 (d.h >= 6 ? 'left' : 'right'));
      });
      if(d.lockA > 0){
        ctx.save(); ctx.globalAlpha = d.lockA;
        axisNote(ctx, L, LOCK_AT, 'Optimum', T.green, T, fs, dpr);
        ctx.restore();
      }
      legendRow(ctx, [
        { label:'Total Benefit', color:T.blue, shape:'circle' },
        { label:'Total Cost',    color:T.red,  shape:'square' }
      ], T, fs, dpr, L.px, L.px + L.pw, L.headY + L.headH/2);

      /* ── RIGHT: MB vs MC ───────────────────────────────────────────── */
      var R = paintFrame(ctx, boxes[1], {
        title:'Marginal Benefit vs. Marginal Cost',
        xlabel:'Hours of Study', ylabel:'Marginal Benefit / Marginal Cost',
        xmin:0, xmax:7.5, ymin:0, ymax:35,
        xticks:[0,1,2,3,4,5,6,7], yticks:[0,5,10,15,20,25,30,35], yHoriz: yH,
        headLines: 1
      }, T, fs, dpr);

      clipped(ctx, R, function(){
        if(d.lockA > 0){
          ctx.save(); ctx.globalAlpha = d.lockA;
          polyline(ctx, R, [[LOCK_AT,0],[LOCK_AT,35]], T.muted, T.lw.guide*dpr, [7*dpr,5*dpr]);
          ctx.restore();
        }
        polyline(ctx, R, D.MB, T.blue, T.lw.series*dpr);
        markers (ctx, R, D.MB, T.blue, T.dot*dpr, 'circle');
        polyline(ctx, R, D.MC, T.red,  T.lw.series*dpr);
        markers (ctx, R, D.MC, T.red,  T.dot*dpr, 'square');

        if(d.hasMB && d.h !== LOCK_AT){
          vMeasure(ctx, R, d.h, d.mc, d.mb, T.green, T, fs, dpr,
                   'MB − MC = ' + (d.mb - d.mc), (d.h >= 6 ? 'left' : 'right'), 'top');
        }
        if(d.lockA > 0){
          ctx.save();
          ctx.globalAlpha = d.lockA;
          ctx.fillStyle = T.green;
          ctx.beginPath();
          ctx.arc(R.X(LOCK_AT), R.Y(10), T.dot*dpr*1.7, 0, 2*Math.PI);
          ctx.fill();
          ctx.font = fnt(T,fs,dpr,'annot','700');
          var ow = ctx.measureText('Optimum').width, ogap = 12*fs*dpr;
          var right = (R.X(LOCK_AT) + ogap + ow <= R.px + R.pw);
          ctx.restore();
          /* This label sits where the two marginal curves cross, so it needs
             its own background to stay readable. */
          ctx.save();
          ctx.globalAlpha = d.lockA;
          chipText(ctx, 'Optimum',
                   R.X(LOCK_AT) + (right ? ogap : -ogap), R.Y(10),
                   right ? 'left' : 'right', 'middle', T.green, T, fs, dpr);
          ctx.restore();
        }
      });
      if(d.lockA > 0){
        ctx.save(); ctx.globalAlpha = d.lockA;
        axisNote(ctx, R, LOCK_AT, 'MB = MC', T.green, T, fs, dpr);
        ctx.restore();
      }
      legendRow(ctx, [
        { label:'Marginal Benefit', color:T.blue, shape:'circle' },
        { label:'Marginal Cost',    color:T.red,  shape:'square' }
      ], T, fs, dpr, R.px, R.px + R.pw, R.headY + R.headH/2);
    },

    describe: function(state){
      var d = derive(state);
      var s = 'Hour ' + d.h + '. Total benefit is ' + d.tb +
              ' and total cost is ' + d.tc + ', so net benefit is ' + d.gap + '. ';
      if(d.hasMB){
        s += 'Marginal benefit is ' + d.mb + ' and marginal cost is ' + d.mc + ', ';
        if(d.mb > d.mc)      s += 'so marginal benefit is greater than marginal cost and another hour is still worth it. ';
        else if(d.mb < d.mc) s += 'so marginal benefit is less than marginal cost and this hour was not worth it. ';
        else                 s += 'so marginal benefit equals marginal cost: this is the optimum. ';
      } else {
        s += 'Marginal benefit is not plotted for hour ' + d.h +
             '; marginal cost is ' + d.mc + '. ';
      }
      if(d.locked){
        s += 'The optimum is locked in at 5 hours, where marginal benefit equals ' +
             'marginal cost at 10 and the gap between the total curves reaches its ' +
             'maximum of 73. Net benefit is 73 at hour 4 as well, which is the same ' +
             'fact seen a different way: the fifth hour adds exactly as much benefit ' +
             'as it costs.';
      }
      return s;
    },

    ariaLabel: function(state){
      var d = derive(state);
      return 'Total benefit versus total cost, and marginal benefit versus marginal ' +
             'cost. Hour ' + d.h + ': net benefit ' + d.gap +
             (d.hasMB ? (', marginal benefit ' + d.mb + ' against marginal cost ' + d.mc) : '') +
             (d.locked ? '. Optimum marked at 5 hours where marginal benefit equals marginal cost.' : '.');
    }
  };
})();

/* ══ FIGURE: fig-1-4-business-cycle ════════════════════════════════════════
   Peaks and troughs are found from the derivative of the plotted function,
   not hardcoded, so editing the cycle expression in D.cycle moves the labels
   with it.
   ════════════════════════════════════════════════════════════════════════ */

var figCycle = (function(){

  var CY = D.cycle;

  /* Sign changes of dActual, refined by bisection. */
  function extrema(){
    var out = [], N = 2000, i, x0, x1, d0, d1, a, b, m, k;
    for(i=0;i<N;i++){
      x0 = CY.xmin + (CY.xmax-CY.xmin)*i/N;
      x1 = CY.xmin + (CY.xmax-CY.xmin)*(i+1)/N;
      d0 = CY.dActual(x0); d1 = CY.dActual(x1);
      if(d0 === 0 || d0*d1 < 0){
        a = x0; b = x1;
        for(k=0;k<60;k++){
          m = (a+b)/2;
          if(CY.dActual(a)*CY.dActual(m) <= 0) b = m; else a = m;
        }
        m = (a+b)/2;
        out.push({ x:m, y:CY.actual(m), kind: (d0 > 0 ? 'peak' : 'trough') });
      }
    }
    return out;
  }

  var EX = extrema();

  /* Falling stretches (peak → next trough) are recessions; rising stretches
     (trough → next peak) are expansions. */
  /* The word is drawn at `mid`, centred on the stretch it names. `cue` is
     where it starts fading in — a quarter of the way into the stretch — so
     that by the time the sweep stops at the midpoint the word is fully
     there, rather than at zero opacity on its own step. */
  function bands(kind){
    var out = [], i;
    for(i=0;i<EX.length-1;i++){
      if(EX[i].kind === (kind==='recession' ? 'peak' : 'trough') &&
         EX[i+1].kind === (kind==='recession' ? 'trough' : 'peak')){
        out.push({ a:EX[i].x, b:EX[i+1].x,
                   mid:(EX[i].x+EX[i+1].x)/2,
                   cue: EX[i].x + 0.25*(EX[i+1].x - EX[i].x) });
      }
    }
    return out;
  }
  var REC = bands('recession'), EXP = bands('expansion');

  /* The four named phases, in the order the sweep meets them. The first
     cycle carries the words; later turning points get a marker only, so the
     projected slide never turns into a wall of text. */
  var firstPeak   = EX[0],
      firstRec    = REC[0],
      firstTrough = EX[1],
      firstExp    = EXP[0];

  var steps = [{ name:'start', t:0, label:'Start' }];
  steps.push({ name:'peak',      t:firstPeak.x/CY.xmax,   label:'Peak' });
  steps.push({ name:'recession', t:firstRec.mid/CY.xmax,  label:'Recession' });
  steps.push({ name:'trough',    t:firstTrough.x/CY.xmax, label:'Trough' });
  steps.push({ name:'expansion', t:firstExp.mid/CY.xmax,  label:'Expansion' });
  (function(){
    var i;
    for(i=2;i<EX.length;i++){
      if(EX[i].x <= firstExp.mid) continue;
      steps.push({ name: EX[i].kind + '-' + i, t: EX[i].x/CY.xmax,
                   label: EX[i].kind === 'peak' ? 'Peak' : 'Trough' });
    }
  })();
  steps.push({ name:'end', t:1, label:'End' });

  function fade(xNow, at){ return clamp((xNow - at)/0.35, 0, 1); }

  return {
    id: 'fig-1-4-business-cycle',
    title: 'The business cycle: actual output around trend',
    /* Authored — the source tikzpicture carries no \caption. */
    caption: 'Actual output rises and falls around a steadily growing trend. ' +
             'A peak is where output stops rising; the falling stretch that ' +
             'follows is a recession; the trough is where it stops falling; the ' +
             'rising stretch back up is an expansion. Shaded stretches are recessions.',
    panels: 1,
    aspect: 0.50,
    aspectStacked: 0.78,
    steps: steps,

    initState: function(){ return { t: 0 }; },
    setStep:   function(state, i){ state.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:     function(state, t){ state.t = clamp(t,0,1); },

    draw: function(canvas, state, mode){
      var S = setupCanvas(canvas); if(!S) return;
      var T = THEME[mode], ctx = S.ctx, dpr = S.dpr;
      var fs = fontScale(mode, S.cssW);
      var boxes = panelBoxes(S.W, S.H, dpr, 1, false, T.panelGap);
      var xNow = clamp(state.t,0,1)*CY.xmax;

      paintBg(ctx, S.W, S.H, T);

      var C = paintFrame(ctx, boxes[0], {
        title:'', xlabel:'Time', ylabel:'Output (log or index)',
        xmin:CY.xmin, xmax:CY.xmax, ymin:CY.ymin, ymax:CY.ymax,
        xticks:null, yticks:null,           /* ticks suppressed, as in the source */
        headLines: 1
      }, T, fs, dpr);

      clipped(ctx, C, function(){
        var i, x, pts, seen;

        /* recession shading, revealed as the sweep passes through */
        for(i=0;i<REC.length;i++){
          if(xNow <= REC[i].a) continue;
          var to = Math.min(xNow, REC[i].b);
          ctx.save();
          ctx.fillStyle = T.shade;
          ctx.fillRect(C.X(REC[i].a), C.py, C.X(to)-C.X(REC[i].a), C.ph);
          ctx.restore();
        }

        /* trend */
        polyline(ctx, C, [[CY.xmin,CY.trend(CY.xmin)],[CY.xmax,CY.trend(CY.xmax)]],
                 T.muted, T.lw.series*dpr*0.75, [9*dpr,6*dpr]);

        /* actual output — full path faint, traversed path at full weight */
        pts = [];
        for(i=0;i<=400;i++){ x = CY.xmin + (CY.xmax-CY.xmin)*i/400; pts.push([x, CY.actual(x)]); }
        ctx.save(); ctx.globalAlpha = 0.35;
        polyline(ctx, C, pts, T.blue, T.lw.series*dpr);
        ctx.restore();

        seen = [];
        for(i=0;i<pts.length;i++){ if(pts[i][0] <= xNow) seen.push(pts[i]); }
        if(xNow > CY.xmin) seen.push([xNow, CY.actual(xNow)]);
        if(seen.length > 1) polyline(ctx, C, seen, T.blue, T.lw.series*dpr*1.25);

        /* the travelling dot */
        if(xNow > CY.xmin){
          ctx.save();
          ctx.fillStyle = T.blue;
          ctx.beginPath();
          ctx.arc(C.X(xNow), C.Y(CY.actual(xNow)), T.dot*dpr*1.6, 0, 2*Math.PI);
          ctx.fill();
          ctx.strokeStyle = T.bg; ctx.lineWidth = Math.max(1.5, T.lw.axis*dpr);
          ctx.stroke();
          ctx.restore();
        }

        /* turning-point markers */
        for(i=0;i<EX.length;i++){
          if(xNow < EX[i].x) continue;
          ctx.save();
          ctx.globalAlpha = fade(xNow, EX[i].x);
          ctx.fillStyle = (EX[i].kind === 'peak') ? T.green : T.red;
          if(EX[i].kind === 'peak'){
            ctx.beginPath();
            ctx.arc(C.X(EX[i].x), C.Y(EX[i].y), T.dot*dpr*1.3, 0, 2*Math.PI);
            ctx.fill();
          } else {
            var r = T.dot*dpr*1.2;
            ctx.fillRect(C.X(EX[i].x)-r, C.Y(EX[i].y)-r, 2*r, 2*r);
          }
          ctx.restore();
        }

        /* The four words, in the order the sweep meets them.
           Turning-point words sit tight against their dot. Stretch words are
           centred on their own stretch and set one size down, so each one
           fits inside the stretch it names instead of running past the edge
           into the next one. */
        ctx.save();
        ctx.textAlign = 'center';

        ctx.font = fnt(T,fs,dpr,'annot','700');
        ctx.globalAlpha = fade(xNow, firstPeak.x);
        if(ctx.globalAlpha > 0){
          ctx.fillStyle = T.green; ctx.textBaseline = 'bottom';
          ctx.fillText('Peak', C.X(firstPeak.x), C.Y(firstPeak.y + 0.09));
        }
        ctx.globalAlpha = fade(xNow, firstTrough.x);
        if(ctx.globalAlpha > 0){
          ctx.fillStyle = T.red; ctx.textBaseline = 'top';
          ctx.fillText('Trough', C.X(firstTrough.x), C.Y(firstTrough.y - 0.09));
        }

        ctx.font = fnt(T,fs,dpr,'legend','700');
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = fade(xNow, firstRec.cue);
        if(ctx.globalAlpha > 0){
          ctx.fillStyle = T.red;
          ctx.fillText('Recession', C.X(firstRec.mid), C.Y(1.95));
        }
        ctx.globalAlpha = fade(xNow, firstExp.cue);
        if(ctx.globalAlpha > 0){
          ctx.fillStyle = T.green;
          ctx.fillText('Expansion', C.X(firstExp.mid), C.Y(1.95));
        }
        ctx.restore();
      });

      legendRow(ctx, [
        { label:'Trend',         color:T.muted, dash:[9*dpr,6*dpr] },
        { label:'Actual output', color:T.blue }
      ], T, fs, dpr, C.px, C.px + C.pw, C.headY + C.headH/2);
    },

    describe: function(state){
      var xNow = clamp(state.t,0,1)*CY.xmax;
      var y = CY.actual(xNow), tr = CY.trend(xNow), sl = CY.dActual(xNow);
      var s, i, phase = '';
      if(state.t <= 0){
        return 'A steadily rising dashed trend line, with actual output drawn as a ' +
               'wave that crosses above and below it about three times over the ' +
               'period shown. The sweep has not started.';
      }
      for(i=0;i<REC.length;i++) if(xNow >= REC[i].a && xNow <= REC[i].b) phase = 'recession';
      if(!phase) for(i=0;i<EXP.length;i++) if(xNow >= EXP[i].a && xNow <= EXP[i].b) phase = 'expansion';
      s = 'The marker has reached time ' + (Math.round(xNow*10)/10) + ' of 10. ' +
          'Output is ' + (y > tr ? 'above' : (y < tr ? 'below' : 'exactly on')) +
          ' trend and ' + (sl > 0 ? 'rising' : 'falling') + '. ';
      if(phase === 'recession')      s += 'This falling stretch, from a peak down to a trough, is a recession, and it is shaded. ';
      else if(phase === 'expansion') s += 'This rising stretch, from a trough up to a peak, is an expansion. ';
      var named = [];
      if(xNow >= firstPeak.x)   named.push('peak');
      if(xNow >= firstRec.cue)  named.push('recession');
      if(xNow >= firstTrough.x) named.push('trough');
      if(xNow >= firstExp.cue)  named.push('expansion');
      s += named.length ? ('Labelled so far: ' + named.join(', ') + '.')
                        : 'No turning point has been reached yet.';
      return s;
    },

    ariaLabel: function(state){
      var xNow = clamp(state.t,0,1)*CY.xmax;
      var y = CY.actual(xNow), tr = CY.trend(xNow);
      return 'The business cycle: actual output waving around a rising trend. ' +
             'Marker at time ' + (Math.round(xNow*10)/10) + ' of 10, output ' +
             (y > tr ? 'above' : 'below') + ' trend.';
    }
  };
})();

/* ══ THE FOUR FIGURES ══════════════════════════════════════════════════════ */

var figures = {

  'fig-1-1-benefit': totalMarginalFigure({
    id:'fig-1-1-benefit',
    title:'Total benefit and marginal benefit from studying',
    caption:'Total benefit rises with study, but at a decreasing rate. The marginal ' +
            'benefit of each additional hour (the “rise” on the total benefit curve) ' +
            'declines as more hours are added.',
    colorKey:'blue', shape:'circle', sign:'+',
    total:D.TB1, marginal:D.MB, hMax:6,
    left:  { title:'Total Benefit',
             ylabel:'Test Score (Total Benefit)',
             ymax:115, yticks:[0,30,55,75,90,100,105] },
    right: { title:'Marginal Benefit',
             ylabel:'Marginal Benefit (points per hour)',
             ymax:35, yticks:[0,2,5,10,15,20,25,30] },
    noun:'total benefit', units:'points',
    margNoun:'marginal benefit', margUnits:'points per hour',
    trend:'Each hour adds less than the hour before it.',
    describeStart:'Two panels. On the left, total benefit — the test score — rises ' +
      'with hours of study from 0 up to 105, flattening as it goes. On the right, ' +
      'marginal benefit falls steadily from 30 points for the first hour to 5 points ' +
      'for the sixth. The sweep has not started.'
  }),

  'fig-1-2-cost': totalMarginalFigure({
    id:'fig-1-2-cost',
    title:'Total cost and marginal cost of studying',
    caption:'Total cost rises with study, and at an increasing rate. The marginal ' +
            'cost of each additional hour (the “rise” on the total cost curve) grows ' +
            'as more hours are added.',
    colorKey:'red', shape:'square', sign:'+',
    total:D.TC, marginal:D.MC, hMax:7,
    left:  { title:'Total Cost',
             ylabel:'Total Cost (cost units)',
             ymax:60, yticks:[0,2,5,10,17,27,40,56] },
    right: { title:'Marginal Cost',
             ylabel:'Marginal Cost (cost per hour)',
             ymax:20, yticks:[0,2,3,5,7,10,13,16] },
    noun:'total cost', units:'cost units',
    margNoun:'marginal cost', margUnits:'cost units per hour',
    trend:'Each hour costs more than the hour before it — the mirror image of the ' +
          'benefit figure, where each hour added less.',
    describeStart:'Two panels. On the left, total cost rises with hours of study from ' +
      '0 up to 56, getting steeper as it goes. On the right, marginal cost climbs ' +
      'steadily from 2 cost units for the first hour to 16 for the seventh. The sweep ' +
      'has not started.'
  }),

  'fig-1-3-optimum': figOptimum,
  'fig-1-4-business-cycle': figCycle
};

var ORDER = ['fig-1-1-benefit','fig-1-2-cost','fig-1-3-optimum','fig-1-4-business-cycle'];

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
global.EconFigures['unit-01'] = {
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
