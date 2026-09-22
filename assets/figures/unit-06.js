/* ============================================================================
   unit-06.js — ECON 002, Unit 6: GDP — Where Does it Come From?
   Shared figure module. SINGLE SOURCE OF TRUTH for every dynamic figure in
   this unit.

   Consumed by BOTH:
     classes/econ002/notes/unit-06/index.html   (mode 'notes')
     classes/econ002/notes/unit-06/deck.html    (mode 'stage')

   Every figure in this unit is a diagram the source draws itself — there are
   no pre-rendered charts here, so all seven live in this file.

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


/* ══ DATA — transcribed from "GDP Where Does it Come From?.tex" ════════════
   Every curve and every plotted point below is one the source draws itself.

     Production function, labour   Y = 10·L/(L+1)     line 366, points A–E
     MP_L                          MP = 10/(L(L+1))   line 430, points A–E
     Production function, capital  Y = 20·K/(K+1)     line 502, points A–E
     MP_K                          MP = 20/(K(K+1))   line 543, points A–E
     Hiring decision               P·MP_L, W = $5     line 628 (\fillgraph)
     SRAS, price rise              P = Y, A(5,5) → B(7,7)          line 769
     SRAS, wage rise               P = Y and P = Y+2, A(5,5), C(3,5)  line 848
     Worked example                P = −8 + 0.5Y, A(20,2) B(24,4) C(20,4),
                                   LRAS at Y = 20                  line 925
     SRAS with LRAS                P = Y, LRAS at Ȳ = 5, A(5,5)    line 985

   The hiring curve is the one place where the source draws a freehand bend
   rather than a function. It is drawn here as P·MP_L = 24/(L+1) − 3, which
   is the curve through the three values the worked example states — $9 for
   the first worker, $5 for the second, $3 for the third — so the numbers on
   the page and the numbers on the picture are the same numbers.
   ════════════════════════════════════════════════════════════════════════ */

var LETTERS = ['A','B','C','D','E'];

/* The value axes carry the plotted values themselves rather than round
   numbers — ytick={0,5,6.67,7.5,8,8.33} and ytick={0,5,1.67,0.83,0.5,.33}
   in the source — so each point can be read straight off its own tick.
   Where two of them are too close to label at a given size the tick mark
   and gridline stay and only the text is dropped. */
function valueAxis(base, f, ks){
  var ys = [0], i;
  for(i=0;i<ks.length;i++) ys.push(f(ks[i]));
  base.yticks = ys;
  base.ytickText = function(v){ return v === 0 ? '0' : num(Math.round(v*100)/100); };
  return base;
}
var K5 = [1,2,3,4,5];

var AX_LAB_Y = valueAxis({
  xmin:0, xmax:6, ymin:0, ymax:10,
  xticks:[0,1,2,3,4,5,6],
  xlabel:'Labor (L)', ylabel:'Output (Y)'
}, function(L){ return 10*L/(L+1); }, K5);

var AX_LAB_MP = valueAxis({
  xmin:0, xmax:6, ymin:0, ymax:6,
  xticks:[0,1,2,3,4,5,6],
  xlabel:'Labor (L)', ylabel:'Units of output'
}, function(L){ return 10/(L*(L+1)); }, K5);

var AX_CAP_Y = valueAxis({
  xmin:0, xmax:6, ymin:0, ymax:20,
  xticks:[0,1,2,3,4,5,6],
  xlabel:'Capital (K)', ylabel:'Output (Y)'
}, function(K){ return 20*K/(K+1); }, K5);

var AX_CAP_MP = valueAxis({
  xmin:0, xmax:6, ymin:0, ymax:12,
  xticks:[0,1,2,3,4,5,6],
  xlabel:'Capital (K)', ylabel:'Units of output'
}, function(K){ return 20/(K*(K+1)); }, K5);

var AX_HIRE = {
  xmin:0, xmax:5, ymin:0, ymax:14,
  xticks:[0,1,2,3,4,5], yticks:[0,3,5,9,12],
  xlabel:'Labor (L), workers', ylabel:'Dollars per worker'
};

/* The two generic aggregate-supply pictures share an axis whose ticks are
   names, not numbers. */
function asAxis(xt, xn, yt, yn){
  return {
    xmin:0, xmax:10, ymin:0, ymax:10,
    xticks:[0].concat(xt), yticks:[0].concat(yt),
    xtickText:function(v){ var i = xt.indexOf(v); return i < 0 ? '0' : xn[i]; },
    ytickText:function(v){ var i = yt.indexOf(v); return i < 0 ? '0' : yn[i]; },
    xlabel:'Income / output (Y)', ylabel:'Price level (P)'
  };
}

var AX_EXAMPLE = {
  xmin:0, xmax:30, ymin:0, ymax:7,
  xticks:[0,5,10,15,20,25,30], yticks:[0,1,2,3,4,5,6,7],
  xlabel:'Output (Y)', ylabel:'Price level (P)'
};


/* ══ FIGURE BUILDER 1: a factor's total product and its marginal product ═══
   Two panels that step together. The rise the sweep measures on the left is
   the height it then plots on the right, which is the whole content of the
   phrase "diminishing marginal product": the curve on the left is flattening
   and the points on the right are falling for exactly the same reason.
   ════════════════════════════════════════════════════════════════════════ */

function productionFigure(spec){
  var A = spec.A, sym = spec.sym;
  var Y  = function(x){ return A*x/(x+1); };
  var MP = function(k){ return A/(k*(k+1)); };

  var steps = [{ name:'blank', t:0, label:'Empty' }];
  var k;
  for(k=1;k<=5;k++){
    steps.push({ name:'unit-'+k, t:k/6,
                 label:LETTERS[k-1] + ' — ' + spec.unitName(k) });
  }
  /* The marginal product is plotted point by point and only joined up at
     the end: the data comes from the table on the left, and the smooth
     falling curve is the thing that table turns out to trace. */
  steps.push({ name:'curve', t:1, label:'Join up ' + spec.mpSym });

  function derive(state){
    var f = clamp(state.t,0,1)*6;
    var shown = clamp(Math.round(f), 0, 6);
    return { n:Math.min(shown,5), done: shown >= 6 };
  }

  return {
    id:spec.id, title:spec.title, caption:spec.caption,
    panels:2, aspect:0.46, aspectStacked:1.15, steps:steps,
    initState:function(){ return {t:0}; },
    setStep:function(s,i){ s.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:function(s,t){ s.t = clamp(t,0,1); },

    draw:function(canvas, mode2, state, mode){ /* placeholder, replaced below */ },

    describe:function(state){
      var d = derive(state), i, parts;
      if(d.n === 0) return 'Two panels side by side. On the left the production function ' +
        'is already drawn, output against ' + spec.factorLower + ', rising steeply at first ' +
        'and then flattening. The right-hand panel is empty: it is about to be filled in, ' +
        'one point at a time, with the marginal product of ' + spec.factorLower + ' — the ' +
        'extra output each additional unit brings.';
      if(d.done){
        parts = [];
        for(i=1;i<=5;i++) parts.push(num(round2(MP(i))));
        return 'Both panels are complete. On the left the production function rises from ' +
          '0 to ' + num(round2(Y(5))) + ' units of output, but it flattens as it goes: the ' +
          'step up from each ' + spec.unitLower + ' to the next gets smaller. On the right ' +
          'those steps have been plotted as heights and joined into a curve, and they fall ' +
          'steadily: ' + parts.join(', ') + '. That is diminishing marginal product of ' +
          spec.factorLower + ' — holding ' + spec.otherLower + ' fixed, each extra unit of ' +
          spec.factorLower + ' adds less output than the one before it.';
      }
      return 'Point ' + LETTERS[d.n-1] + ': with ' + d.n + ' ' +
        (d.n === 1 ? spec.unitLower : spec.unitsLower) + ', output is ' +
        num(round2(Y(d.n))) + ' units, up from ' + num(round2(Y(d.n-1))) + '. The ' +
        spec.ordinal(d.n) + ' ' + spec.unitLower + ' therefore adds ' +
        num(round2(MP(d.n))) + ' units of output, which is the height plotted at ' +
        LETTERS[d.n-1] + ' on the right-hand panel.';
    },
    ariaLabel:function(state){
      var d = derive(state);
      if(d.n === 0) return 'The production function on the left, with an empty panel on the ' +
        'right ready for the marginal product of ' + spec.factorLower + '.';
      return 'The production function and the marginal product of ' + spec.factorLower +
        ', side by side. ' + (d.done
          ? 'All five points shown; the marginal product falls from ' +
            num(round2(MP(1))) + ' to ' + num(round2(MP(5))) + '.'
          : 'Through point ' + LETTERS[d.n-1] + '.');
    },

    /* exposed so draw() below can reach them without re-deriving */
    _Y:Y, _MP:MP, _derive:derive, _spec:spec
  };
}

function round2(v){ return Math.round(v*100)/100; }

/* The shared draw for both production figures. Written once and attached to
   each, so the two panels can never drift apart. */
function productionDraw(fig){
  var spec = fig._spec, Y = fig._Y, MP = fig._MP, derive = fig._derive;

  fig.draw = function(canvas, state, mode){
    var S = begin2(canvas, mode, canvas.getBoundingClientRect().width < 560);
    if(!S) return;
    var ctx=S.ctx, T=S.T, fs=S.fs, dpr=S.dpr;
    var d = derive(state), i, pts;

    /* ── left panel: the production function ───────────────────────── */
    var axY = spec.axY;
    var C1 = frame(ctx, S.boxes[0], axY, T, fs, dpr, 1, 'Output:  Y = F(K, L)');
    /* The production function is the thing we are given, so it is on screen
       from the start. Only the marginal product is built out of it, point by
       point, and only that curve waits until the points are all plotted. */
    clipped(ctx, C1, function(){
      polyline(ctx, C1, fnPts(Y, 0, axY.xmax), T.blue, T.lw.series*dpr);
    });

    clipped(ctx, C1, function(){
      for(i=1;i<=d.n;i++){
        polyline(ctx, C1, [[axY.xmin, Y(i)],[i, Y(i)]], T.ink2,
                 T.lw.guide*dpr, [6*dpr,5*dpr]);
        labelledPoint(ctx, C1, i, Y(i), LETTERS[i-1], T.blue, 'circle',
                      T, fs, dpr, 'nw');
      }
      /* the step that the right-hand panel is about to plot */
      if(d.n >= 1 && !d.done){
        var k = d.n;
        polyline(ctx, C1, [[k-1, Y(k-1)],[k, Y(k-1)],[k, Y(k)]],
                 T.red, T.lw.guide*dpr, [6*dpr,5*dpr]);
        vMeasure(ctx, C1, k, Y(k-1), Y(k), T.red, T, fs, dpr,
                 '+' + num(round2(MP(k))), 'right');
      }
    });
    headNote(ctx, C1, d.n === 0
      ? spec.blankNoteLeft
      : (d.done ? 'The curve flattens: every step up is smaller than the last.'
                : spec.ordinalCap(d.n) + ' ' + spec.unitLower + ': output goes from ' +
                  num(round2(Y(d.n-1))) + ' to ' + num(round2(Y(d.n)))),
      d.done ? T.red : T.ink2, T, fs, dpr, 0);

    /* ── right panel: the marginal product ─────────────────────────── */
    var axM = spec.axMP;
    var C2 = frame(ctx, S.boxes[1], axM, T, fs, dpr, 1, spec.mpTitle);
    clipped(ctx, C2, function(){
      if(d.done){
        polyline(ctx, C2, fnPts(MP, 0.75, axM.xmax), T.blue, T.lw.series*dpr);
      }
      for(i=1;i<=d.n;i++){
        /* across to the axis, where this value has its own tick */
        polyline(ctx, C2, [[axM.xmin, MP(i)],[i, MP(i)]], T.ink2,
                 T.lw.guide*dpr, [6*dpr,5*dpr]);
        if(i === d.n && !d.done){
          /* the current one is drawn as a height, because a height is what
             it was on the left-hand panel */
          polyline(ctx, C2, [[i, 0],[i, MP(i)]], T.red, T.lw.annot*dpr);
        }
        labelledPoint(ctx, C2, i, MP(i), LETTERS[i-1],
                      i === d.n && !d.done ? T.red : T.blue, 'circle',
                      T, fs, dpr, 'ne');
      }
    });
    headNote(ctx, C2, d.n === 0
      ? spec.blankNoteRight
      : (d.done ? 'Joined up, ' + spec.mpSym + ' falls: ' + [1,2,3,4,5].map(function(k){
                    return num(round2(MP(k))); }).join(', ')
                : spec.mpSym + ' = ' + num(round2(MP(d.n)))),
      d.done ? T.red : T.ink2, T, fs, dpr, 0);
  };
  return fig;
}


/* ══ FIGURE 3: how many workers to hire ═══════════════════════════════════
   The unit's \fillgraph — the teacher's version has the wage line, the
   student's does not, so the wage arrives on its own step.
   ════════════════════════════════════════════════════════════════════════ */

var figHiring = (function(){
  var ax = AX_HIRE;
  var W = 5;
  var pmp = function(x){ return 24/(x+1) - 3; };
  var CASES = [
    { L:1, v:9, gap:'+$4',  verdict:'Worth $9, costs $5 → hire',
      why:'the first worker brings in $9 of revenue and costs $5, so profit rises by $4' },
    { L:2, v:5, gap:'$0',   verdict:'Worth $5, costs $5 → the last worth hiring',
      why:'the second worker brings in exactly what they cost, so the firm breaks even on them' },
    { L:3, v:3, gap:'−$2',  verdict:'Worth $3, costs $5 → do not hire',
      why:'the third worker brings in $3 and costs $5, so hiring them would cut profit by $2' }
  ];

  var steps = [
    { name:'blank',   t:0.000, label:'Empty' },
    { name:'curve',   t:0.167, label:'P × MPₗ' },
    { name:'wage',    t:0.333, label:'The wage, $5' },
    { name:'w1',      t:0.500, label:'First worker' },
    { name:'w2',      t:0.667, label:'Second worker' },
    { name:'w3',      t:0.833, label:'Third worker' },
    { name:'optimum', t:1.000, label:'P × MPₗ = W' }
  ];

  function derive(state){
    var f = clamp(state.t,0,1)*6;
    var s = clamp(Math.round(f), 0, 6);
    return { s:s, curve:s>=1, wage:s>=2, cases:clamp(s-2,0,3), done:s>=6 };
  }

  return {
    id:'fig-6-3-hiring',
    title:'How many workers should the firm hire?',
    caption:'The falling curve is what one more worker is worth to the firm — the price ' +
            'of output times that worker’s marginal product. The flat line is what a ' +
            'worker costs. Hire while the curve is above the line, stop where they cross.',
    panels:1, aspect:0.62, aspectStacked:0.95, steps:steps,
    initState:function(){ return {t:0}; },
    setStep:function(s,i){ s.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:function(s,t){ s.t = clamp(t,0,1); },

    draw:function(canvas, state, mode){
      var S = begin(canvas, mode); if(!S) return;
      var ctx=S.ctx, T=S.T, fs=S.fs, dpr=S.dpr;
      var d = derive(state), i;
      var C = frame(ctx, S.box, ax, T, fs, dpr, 2);

      clipped(ctx, C, function(){
        if(d.curve) polyline(ctx, C, fnPts(pmp, 0.35, 5), T.blue, T.lw.series*dpr);
        if(d.wage)  polyline(ctx, C, [[0, W],[5, W]], T.red, T.lw.series*dpr);

        for(i=0;i<d.cases;i++){
          var c = CASES[i];
          guides(ctx, C, ax, c.L, c.v, T.ink2, T, dpr, 0.5);
          labelledPoint(ctx, C, c.L, c.v, String(c.L), T.blue, 'circle',
                        T, fs, dpr, c.v > W ? 'ne' : 'se');
          /* the gap between what the worker is worth and what they cost */
          if(i === d.cases-1 && !d.done && Math.abs(c.v - W) > 0.01){
            vMeasure(ctx, C, c.L, W, c.v, c.v > W ? T.green : T.red,
                     T, fs, dpr, c.gap, 'right');
          }
        }

        if(d.done){
          labelledPoint(ctx, C, 2, W, '', T.green, 'circle', T, fs, dpr, 'ne', true);
          guides(ctx, C, ax, 2, W, T.green, T, dpr, 0.9);
        }
      });

      if(d.wage){
        chipText(ctx, 'W = $5', C.px + C.pw - 6*fs*dpr, C.Y(W) - 8*fs*dpr,
                 'right', 'bottom', T.red, T, fs, dpr);
      }
      if(d.done) axisNote(ctx, C, 2, 'L* = 2 workers', T.green, T, fs, dpr);

      legendRow(ctx, [{ label:'P × MPₗ — what a worker is worth', color:T.blue },
                      { label:'W — what a worker costs', color:T.red }],
                T, fs, dpr, C.px, C.px + C.pw, C.headY + C.headH*0.28);
      headNote(ctx, C,
        d.done ? 'P × MPₗ = W at two workers: the firm cannot raise profit by hiring ' +
                 'one more or one fewer.'
        : d.cases > 0 ? CASES[d.cases-1].verdict
        : d.wage ? 'The firm can hire as many workers as it likes at $5 each.'
        : d.curve ? 'Each extra worker is worth less than the one before — that is ' +
                    'diminishing MPₗ again.'
        : 'An empty plot, ready for what a worker is worth and what a worker costs.',
        d.done ? T.green : T.ink2, T, fs, dpr, 1);
    },

    describe:function(state){
      var d = derive(state);
      if(!d.curve) return 'An empty plot with labor on the horizontal axis and dollars per ' +
        'worker on the vertical axis.';
      if(!d.wage) return 'A downward-sloping curve, P times the marginal product of labor: ' +
        'the first worker is worth $9 to the firm, the second $5, the third $3. It falls ' +
        'because the marginal product of labor falls.';
      if(d.done) return 'The falling curve of P times the marginal product of labor crosses the flat ' +
        '$5 wage line at ' +
        'two workers, and that crossing is circled. Below two workers the curve is above ' +
        'the line, so another worker adds more than they cost and the firm hires. Above ' +
        'two the line is above the curve, so a worker costs more than they bring in and ' +
        'the firm lets them go. At two the firm cannot raise profit either way, which is ' +
        'the condition that P times the marginal product of labor equals the wage.';
      if(d.cases === 0) return 'A flat line at $5 has been added: the wage the firm pays, ' +
        'the same for every worker it hires.';
      return 'Worker ' + d.cases + ': ' + CASES[d.cases-1].why + '.';
    },
    ariaLabel:function(state){
      var d = derive(state);
      return 'The hiring decision. ' + (d.done
        ? 'P times the marginal product of labor meets the $5 wage at two workers.'
        : (d.cases ? 'Through worker ' + d.cases + '.' : 'Curves being drawn.'));
    }
  };
})();


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

/* ══ FIGURE BUILDER 2: the aggregate-supply chain, in three panels ═════════
   Aggregate supply is not a primitive — it is the labor market seen from a
   different angle, and a single picture of Y against P hides every step of
   the argument. So each aggregate-supply figure is three panels read left
   to right, the same shape the ECON 002 discussion deck uses:

     MP_L panel   the real wage line meets the marginal product curve, and
                  where they meet is how many workers get hired
     Y = F(L)     those workers are carried through the production function
                  to an amount of output
     SRAS panel   that output, against the price level, is one point on the
                  aggregate supply curve

   The three panels share their linking axes by construction: the labor
   axis is the same on the first two, and the output the middle panel
   reaches is the output the third panel plots.
   ════════════════════════════════════════════════════════════════════════ */

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

/* A horizontal line right across a panel, for a real wage. */
/* A real wage, drawn right across the panel. Three panels side by side are
   too narrow to carry in-plot labels as well as data, so every curve and
   every line in this figure is named in its panel's legend instead. */
function wageLine(ctx, C, ax, y, color, T, dpr, dash){
  polyline(ctx, C, [[ax.xmin, y],[ax.xmax, y]], color, T.lw.series*dpr, dash);
}

function asChainFigure(spec){
  var M = spec.model, steps = spec.steps;

  function derive(state){
    var n = steps.length - 1;
    return { s: clamp(Math.round(clamp(state.t,0,1)*n), 0, n) };
  }

  return {
    id:spec.id, title:spec.title, caption:spec.caption,
    panels:3, aspect:0.34, aspectStacked:2.55, steps:steps,
    initState:function(){ return {t:0}; },
    setStep:function(s,i){ s.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:function(s,t){ s.t = clamp(t,0,1); },

    draw:function(canvas, state, mode){
      var wide = (canvas.getBoundingClientRect().width || 900) >= 560;
      var S = beginN(canvas, mode, 3, !wide, 1); if(!S) return;
      var ctx=S.ctx, T=S.T, fs=S.fs, dpr=S.dpr;
      var s = derive(state).s, sc = spec.scene(s, T, state, steps.length - 1), i;

      bannerNote(ctx, S, sc.note, sc.noteColor || T.ink2);

      /* ── panel 1: the marginal product of labor ─────────────────────── */
      var axL = spec.axMP;
      var C1 = frame(ctx, S.boxes[0], axL, T, fs, dpr, 1, 'Marginal product');
      legendRow(ctx, [{ label:'MPₗ', color:T.blue }].concat(
                  (sc.wages||[]).map(function(w){
                    return { label:w.label, color:w.color || T.red, dash:w.dash }; })),
                T, fs, dpr, C1.px, C1.px + C1.pw, C1.headY + C1.headH*0.5);
      clipped(ctx, C1, function(){
        polyline(ctx, C1, fnPts(M.MP, M.Lmin, M.Lmax, 160), T.blue, T.lw.series*dpr);
        for(i=0;i<(sc.wages||[]).length;i++){
          var w = sc.wages[i];
          wageLine(ctx, C1, axL, M.MP(w.L), w.color || T.red, T, dpr, w.dash);
        }
        for(i=0;i<(sc.mpArrows||[]).length;i++){
          var a = sc.mpArrows[i];
          dataArrow(ctx, C1, a.x, M.MP(a.from), a.x, M.MP(a.to), a.color || T.red,
                    T, fs, dpr);
        }
        for(i=0;i<(sc.marks||[]).length;i++){
          var m = sc.marks[i];
          if(m.labourHide) continue;   /* same L as an earlier mark */
          polyline(ctx, C1, [[m.L, axL.ymin],[m.L, M.MP(m.L)]], T.ink2,
                   T.lw.guide*dpr, [6*dpr,5*dpr]);
          labelledPoint(ctx, C1, m.L, M.MP(m.L), m.letterLab || m.letter, m.color,
                        'circle', T, fs, dpr, m.aMP || 'ne', m.ring);
        }
      });

      /* ── panel 2: the production function ───────────────────────────── */
      var axF = spec.axF;
      var C2 = frame(ctx, S.boxes[1], axF, T, fs, dpr, 1, 'Production function');
      legendRow(ctx, [{ label:'Y = F(K, L)', color:T.blue }],
                T, fs, dpr, C2.px, C2.px + C2.pw, C2.headY + C2.headH*0.5);
      clipped(ctx, C2, function(){
        polyline(ctx, C2, fnPts(M.F, M.Lmin, M.Lmax, 160), T.blue, T.lw.series*dpr);
        for(i=0;i<(sc.fArrows||[]).length;i++){
          var a = sc.fArrows[i];
          dataArrow(ctx, C2, a.from, M.F(a.from), a.to, M.F(a.to), a.color || T.red,
                    T, fs, dpr);
        }
        for(i=0;i<(sc.marks||[]).length;i++){
          var m = sc.marks[i];
          if(m.labourHide) continue;
          guides(ctx, C2, axF, m.L, M.F(m.L), T.ink2, T, dpr, 0.55);
          labelledPoint(ctx, C2, m.L, M.F(m.L), m.letterLab || m.letter, m.color,
                        'circle', T, fs, dpr, m.aF || 'se', m.ring);
        }
      });

      /* ── panel 3: aggregate supply ──────────────────────────────────── */
      var axA = spec.axAS;
      var C3 = frame(ctx, S.boxes[2], axA, T, fs, dpr, 1, 'Aggregate supply');
      legendRow(ctx, (sc.sras||[]).map(function(x){
                  return { label:x.tag, color:x.color, dash:x.dash }; })
                .concat(sc.lras ? [{ label:'LRAS', color:T.green }] : []),
                T, fs, dpr, C3.px, C3.px + C3.pw, C3.headY + C3.headH*0.5);
      clipped(ctx, C3, function(){
        if(sc.lras !== undefined && sc.lras !== null){
          vLine(ctx, C3, axA, sc.lras.Y, sc.lras.top, T.green, T, dpr);
        }
        for(i=0;i<(sc.sras||[]).length;i++){
          drawLine(ctx, C3, sc.sras[i].ln, axA, sc.sras[i].color, T, dpr,
                   sc.sras[i].dash);
        }
        for(i=0;i<(sc.asArrows||[]).length;i++){
          var a = sc.asArrows[i];
          dataArrow(ctx, C3, a.from[0], a.from[1], a.to[0], a.to[1],
                    a.color || T.red, T, fs, dpr, a.tight);
        }
        for(i=0;i<(sc.marks||[]).length;i++){
          var m = sc.marks[i];
          /* a mark riding a moving curve carries its own output */
          var my = (m.Y === undefined) ? M.F(m.L) : m.Y;
          guides(ctx, C3, axA, my, m.P, T.ink2, T, dpr, 0.55);
          labelledPoint(ctx, C3, my, m.P, m.letter, m.color, 'circle',
                        T, fs, dpr, m.aAS || 'nw', m.ring);
        }
      });

    },

    describe:function(state){ return spec.describe(derive(state).s); },
    ariaLabel:function(state){ return spec.aria(derive(state).s); }
  };
}


/* ── The model behind the three generic aggregate-supply figures ─────────
   Y = F(L) = 11 − 24/L, so MP_L = 24/L². The numbers are chosen to land on
   the coordinates the source already uses in these diagrams: L = 3, 4 and 6
   give output 3, 5 and 7, which are the Y₂, Y₁ and Y₂ its axes are labelled
   with. The axes carry names rather than numbers here, exactly as they do
   in the printed handout — these three are schematic.                    */

var GEN = {
  F:  function(L){ return 11 - 24/L; },
  MP: function(L){ return 24/(L*L); },
  /* The axis starts at 2, not at the lowest employment level in the story:
     a point sitting on the y-axis reads as part of the axis. */
  Lmin: 2.6, Lmax: 8
};

function genAxMP(ticks, names){
  return { xmin:2.5, xmax:8, ymin:0, ymax:4,
           xticks:ticks, yticks:[0],
           xtickText:function(v){ var i = ticks.indexOf(v); return i<0 ? '' : names[i]; },
           ytickText:function(){ return '0'; },
           xlabel:'Labor (L)', ylabel:'MPₗ and W/P' };
}
function genAxF(xticks, xnames, yticks, ynames){
  return { xmin:2.5, xmax:8, ymin:0, ymax:10,
           xticks:xticks, yticks:[0].concat(yticks),
           xtickText:function(v){ var i = xticks.indexOf(v); return i<0 ? '' : xnames[i]; },
           ytickText:function(v){ var i = yticks.indexOf(v); return i<0 ? '0' : ynames[i]; },
           xlabel:'Labor (L)', ylabel:'Output (Y)' };
}


/* ── Figure 4: a rise in the price level, with the wage stuck ──────────── */

var figSrasPrice = asChainFigure({
  id:'fig-6-4-sras-price',
  title:'A rise in the price level, with the nominal wage stuck',
  caption:'Read the three panels left to right and they are the argument itself. The ' +
          'nominal wage has not changed, so a higher price level cuts the real wage; the ' +
          'cheaper real wage meets the marginal product curve further out, so more workers ' +
          'are hired; more workers make more output; and that output against the higher ' +
          'price level is a second point on the same SRAS curve. Nothing shifted — the ' +
          'economy moved along the curve it was already on.',
  model:GEN,
  axMP:genAxMP([4,6], ['L₁','L₂']),
  axF: genAxF([4,6], ['L₁','L₂'], [5,7], ['Y₁','Y₂']),
  axAS:asAxis([5,7], ['Y₁','Y₂'], [5,7], ['P₁','P₂']),
  steps: evenSteps(['Empty','The curves','A','P rises, W/P falls','More hiring, more output',
                    'Why SRAS slopes up']),

  scene:function(s, T){
    var SRAS = { ln:line(0,1), tag:'SRAS', color:T.blue };
    var A = { L:4, P:5, letter:'A', color:T.blue };
    var B = { L:6, P:7, letter:'B', color:T.red, ring:(s>=5) };
    var w1 = { L:4, label:'W/P₁', color:T.red };
    var w2 = { L:6, label:'W/P₂', color:T.gold };
    var notes = [
      'Three views of one economy: hiring on the left, output in the middle, the price ' +
      'level on the right.',
      'MPₗ falls as labor rises; output rises but flattens; SRAS is the curve we are ' +
      'about to explain.',
      'At A the real wage W/P₁ meets MPₗ at L₁ workers, who make Y₁ — one point on SRAS.',
      'P ↑ with W fixed → W/P ↓. The wage line drops to W/P₂ and now sits below MPₗ at L₁.',
      'Hiring runs out to L₂ until MPₗ has fallen back to W/P₂. More labor → more output → Y₂.',
      'Y₂ at P₂ is point B on the same curve. Higher prices, more output — that is why ' +
      'SRAS slopes up.'
    ];
    var sc = { note:notes[s],
               noteColor: s>=5 ? T.green : (s>=3 ? T.red : T.ink2),
               sras: s>=1 ? [SRAS] : [], marks:[], wages:[] };
    if(s >= 2){ sc.wages.push(w1); sc.marks.push(A); }
    if(s >= 3){
      sc.wages.push(w2);
      sc.mpArrows = [{ x:4.55, from:4, to:6, color:T.gold }];
    }
    if(s >= 4){
      sc.marks.push(B);
      sc.fArrows  = [{ from:4, to:6, color:T.red }];
    }
    if(s >= 5) sc.asArrows = [{ from:[5,5], to:[7,7], color:T.red }];
    return sc;
  },

  describe:function(s){
    return [
      'Three empty panels side by side, waiting for the marginal product of labor, the ' +
      'production function, and aggregate supply.',
      'The curves are drawn. On the left the marginal product of labor falls as labor ' +
      'rises. In the middle the production function rises but flattens. On the right the ' +
      'short-run aggregate supply curve slopes upward.',
      'Point A. On the left panel a red line at the real wage W over P one crosses the ' +
      'marginal product curve at L one workers. In the middle those L one workers produce ' +
      'Y one. On the right, Y one at price level P one is point A on the SRAS curve.',
      'The price level rises while the nominal wage is unchanged, so the real wage falls. ' +
      'A gold line appears below the red one at W over P two, with an arrow pointing down ' +
      'from the old wage to the new one. At the old employment level the real wage is now ' +
      'below the marginal product of labor, so the firm is not done hiring.',
      'Hiring runs out to L two workers, where the marginal product has fallen back to the ' +
      'new real wage. In the middle panel an arrow runs up the production function from L ' +
      'one to L two, and output rises from Y one to Y two.',
      'On the right an arrow runs up the SRAS curve from A to B, at output Y two and price ' +
      'level P two. B is circled. A higher price level with a stuck nominal wage means a ' +
      'cheaper worker in real terms, more hiring, and more output — which is exactly why ' +
      'the short-run aggregate supply curve slopes upward. The curve never moved; the ' +
      'economy moved along it.'
    ][s];
  },
  aria:function(s){
    return s >= 4 ? 'Three panels: the real wage falling, hiring and output rising, and the ' +
                    'economy moving up the SRAS curve from A to B.'
                  : 'Three panels linking the labor market to aggregate supply, being ' +
                    'built up.';
  }
});


/* ── Figure 5: a rise in the nominal wage ──────────────────────────────── */

var figSrasWage = asChainFigure({
  id:'fig-6-5-sras-wage',
  title:'A rise in the nominal wage',
  caption:'The same three panels, with the shock the other way round. The price level holds ' +
          'still and the nominal wage goes up, so the real wage rises above the marginal ' +
          'product of labor. Firms shed workers, output falls — and because that happens at ' +
          'every price level, it is the whole SRAS curve that moves, not the economy along ' +
          'it. Compare with the figure above: there a fixed curve, here a shifted one.',
  model:GEN,
  axMP:genAxMP([3,4], ['L₂','L₁']),
  axF: genAxF([3,4], ['L₂','L₁'], [3,5], ['Y₂','Y₁']),
  axAS:asAxis([3,5], ['Y₂','Y₁'], [5], ['P₁']),
  steps: evenSteps(['Empty','The curves','A','W rises, W/P rises','Less hiring, less output',
                    'A shift, not a move']),

  scene:function(s, T, state, n){
    var u = into(state, n, 5);
    var SRAS  = { ln:line(0,1), tag:'SRAS',  color:T.blue };
    /* drawn part-way across, so the curve is seen to move rather than to
       appear beside the one it came from */
    var SRAS2 = { ln:tween(line(0,1), line(2,1), u), tag:'SRAS′', color:T.gold,
                  dash:[10,7] };
    var A = { L:4, P:5, letter:'A', color:T.blue, aAS:'se' };
    var C = { L:3, P:5, letter:'C', color:T.gold, ring:(s>=5) };
    var notes = [
      'The same three panels. This time the price level does not move — the wage does.',
      'MPₗ falls as labor rises; output rises but flattens; SRAS as before.',
      'Start at A again: real wage W/P₁, L₁ workers, output Y₁, price level P₁.',
      'W ↑ at the same P → W/P ↑. The wage line rises to W/P₂ and now sits above MPₗ at L₁.',
      'Hiring falls back to L₂ until MPₗ has risen to W/P₂. Less labor → less output → Y₂.',
      'Less output at the same price level: the curve itself moves left, to SRAS′.'
    ];
    var sc = { note:notes[s],
               noteColor: s>=5 ? T.gold : (s>=3 ? T.red : T.ink2),
               sras: s>=1 ? [SRAS] : [], marks:[], wages:[] };
    if(s >= 2){ sc.wages.push({ L:4, label:'W/P₁', color:T.red }); sc.marks.push(A); }
    if(s >= 3){
      sc.wages.push({ L:3, label:'W/P₂', color:T.gold });
      sc.mpArrows = [{ x:4.55, from:4, to:3, color:T.gold }];
    }
    if(s >= 4){
      sc.marks.push(C);
      sc.fArrows = [{ from:4, to:3, color:T.red }];
    }
    if(u > 0){
      sc.sras.push(SRAS2);
      sc.asArrows = [{ from:[SRAS.ln.q(8), 8], to:[line(2,1).q(8), 8],
                       color:T.gold, tight:true }];
    }
    return sc;
  },

  describe:function(s){
    return [
      'Three empty panels side by side.',
      'The curves are drawn: the marginal product of labor falling, the production function ' +
      'rising and flattening, and an upward-sloping SRAS curve.',
      'Point A again. The real wage W over P one meets the marginal product curve at L one ' +
      'workers, who produce Y one, which at price level P one is point A on SRAS.',
      'The nominal wage rises while the price level is unchanged, so the real wage rises. A ' +
      'gold line appears above the red one at W over P two, with an arrow pointing up from ' +
      'the old wage to the new one. At the old employment level the real wage is now above ' +
      'the marginal product of labor, so the firm is paying workers more than they bring in.',
      'Hiring falls back to L two workers, where the marginal product has risen to the new ' +
      'real wage. In the middle panel an arrow runs back down the production function and ' +
      'output falls from Y one to Y two.',
      'On the right a second, gold curve appears parallel to the first and to its left, ' +
      'labelled SRAS prime, with an arrow pointing left. Point C sits on it at the same ' +
      'price level P one but the lower output Y two, and is circled. Because the fall in ' +
      'hiring happens at every price level, the whole curve moved — this is a shift, not a ' +
      'movement along a curve.'
    ][s];
  },
  aria:function(s){
    return s >= 4 ? 'Three panels: the real wage rising, hiring and output falling, and the ' +
                    'SRAS curve shifting left.'
                  : 'Three panels linking the labor market to aggregate supply, being ' +
                    'built up.';
  }
});


/* ── Figure 6: the worked example, short run then long run ─────────────── */

/* Y = F(L) = 34 − 70/L reproduces the example's own numbers: five workers
   make 20 units and seven make 24, exactly as the source states, and the
   marginal product halves between them just as the real wage does when the
   price level doubles from 2 to 4. The wage lines carry the source's
   figures (6/2 = 3, 6/4 = 1.5); the panel has no numeric wage axis, because
   what the picture has to show is that the two halve together. */
var EX = {
  F:  function(L){ return 34 - 70/L; },
  MP: function(L){ return 70/(L*L); },
  Lmin: 4, Lmax: 9
};

var figLrasExample = asChainFigure({
  id:'fig-6-6-lras-example',
  title:'The worked example: short run, then long run',
  caption:'The whole example in one row. A doubling of the price level halves the real wage, ' +
          'so hiring runs from five workers to seven and output climbs from 20 to 24 — that ' +
          'is A to B. Then workers get their raise, the real wage is exactly back where it ' +
          'started, and so are hiring and output — that is B to C. Everything that lasts ' +
          'happens on the vertical line at Y = 20.',
  model:EX,
  axMP:{ xmin:4, xmax:9, ymin:0, ymax:5,
         xticks:[4,5,6,7,8,9], yticks:[0],
         ytickText:function(){ return '0'; },
         xlabel:'Workers (L)', ylabel:'MPₗ and W/P' },
  axF: { xmin:4, xmax:9, ymin:0, ymax:30,
         xticks:[4,5,6,7,8,9], yticks:[0,10,20,24,30],
         xlabel:'Workers (L)', ylabel:'Output (Y)' },
  axAS:AX_EXAMPLE,
  steps: evenSteps(['Empty','A: W = 6, P = 2','P rises to 4','B: seven workers, 24 units',
                    'W rises to 12: back to C','LRAS']),

  scene:function(s, T, state, n){
    var u = into(state, n, 4);
    var SRAS  = { ln:line(-8, 0.5), tag:'SRAS',  color:T.blue };
    var SRAS2 = { ln:tween(line(-8,0.5), line(-6,0.5), u), tag:'SRAS′',
                  color:T.gold, dash:[10,7] };
    /* A and C are the same employment and the same output — they differ
       only in the price level, so they are one point on the first two
       panels and two points on the third. */
    var A = { L:5, P:2, letter:'A', letterLab:(s>=4 ? 'A, C' : 'A'),
              color:T.blue, aAS:'nw' };
    var B = { L:7, P:4, letter:'B', color:T.red,  aAS:'se' };
    /* C slides left along P = 4 as the curve does, from where B is to
       where the new curve crosses. On the first two panels it is the same
       point as A, so it is not drawn there at all. */
    var C = { L:5, P:4, letter:'C', color:T.gold, aAS:'nw', ring:(s>=5),
              labourHide:true, Y:EX.F(7) + (EX.F(5) - EX.F(7))*u };
    var notes = [
      'The example, three ways: who gets hired, what they make, and what that is worth.',
      'A: W = 6 and P = 2, so W/P = 3. That meets MPₗ at five workers, who make 20 units.',
      'P doubles to 4 with W still 6, so W/P halves to 1.5 — the wage line drops.',
      'Hiring runs out to seven workers and output rises to 24. That is B, at P = 4.',
      'Workers demand W = 12, so W/P = 12/4 = 3 again — exactly where it started. Back to ' +
      'five workers and 20 units, at P = 4. That is C.',
      'A and C are the same output at different price levels. Only B was temporary — which ' +
      'is what the vertical LRAS at Y = 20 says.'
    ];
    var sc = { note:notes[s],
               noteColor: s>=5 ? T.green : (s===4 ? T.gold : (s>=2 ? T.red : T.ink2)),
               sras: s>=1 ? [SRAS] : [], marks:[], wages:[],
               lras: s>=5 ? { Y:20, top:6.4 } : null };
    if(s >= 1){
      /* one line per real wage, dashed once it is history */
      sc.wages.push({ L:5, label:'W/P = 3', color:T.red,
                      dash:(s===2 || s===3) ? [8,6] : null });
      sc.marks.push(A);
    }
    if(s >= 2){
      sc.wages.push({ L:7, label:'W/P = 1.5', color:T.gold,
                      dash:(s>=4) ? [8,6] : null });
      sc.mpArrows = [{ x:5.7, from:5, to:7, color:T.gold }];
    }
    if(s >= 3){
      sc.marks.push(B);
      sc.fArrows  = [{ from:5, to:7, color:T.red }];
      sc.asArrows = [{ from:[EX.F(5), 2], to:[EX.F(7), 4], color:T.red }];
    }
    if(u > 0){
      sc.marks.push(C);
      sc.sras.push(SRAS2);
      /* the return trip replaces the outward one on the labor panels, so the
         two arrows do not sit on top of each other */
      sc.fArrows  = [{ from:7, to:5, color:T.gold }];
      sc.mpArrows = [{ x:5.7, from:7, to:5, color:T.gold }];
      sc.asArrows = (sc.asArrows||[]).concat(
        [{ from:[EX.F(7), 4], to:[EX.F(5), 4], color:T.gold }]);
    }
    return sc;
  },

  describe:function(s){
    return [
      'Three empty panels, ready for the worked example.',
      'Point A. The nominal wage is 6 and the price level is 2, so the real wage is 3. On ' +
      'the left that wage line meets the marginal product curve at five workers. In the ' +
      'middle those five workers produce 20 units. On the right, 20 units at a price level ' +
      'of 2 is point A on the SRAS curve.',
      'The price level doubles to 4 while the nominal wage stays at 6, so the real wage ' +
      'halves to 1.5. A dashed wage line drops below the first, with an arrow between them. ' +
      'At five workers the real wage is now well below the marginal product of labor.',
      'Hiring runs out to seven workers, where the marginal product has fallen back to the ' +
      'new real wage. Output rises from 20 to 24 units, and on the right an arrow runs up ' +
      'the SRAS curve from A to point B at 24 units and a price level of 4.',
      'Workers demand a nominal wage of 12. At a price level of 4 that is a real wage of 3 ' +
      'again — exactly what it was at A. The wage line returns to where it started, hiring ' +
      'falls back to five workers, and output falls back to 20 units. On the right a gold ' +
      'curve, SRAS prime, appears to the left and point C sits on it at 20 units and a ' +
      'price level of 4.',
      'A vertical green line is drawn at 20 units of output and labelled LRAS. It passes ' +
      'through both A and C. A and C are the same output at price levels 2 and 4, because ' +
      'the nominal wage adjusted to put the real wage back where it started. B, the higher ' +
      'output, only existed while the wage was still stuck. That is why long-run aggregate ' +
      'supply is vertical.'
    ][s];
  },
  aria:function(s){
    return s >= 5 ? 'Three panels ending in a vertical LRAS at 20 units of output through ' +
                    'both A and C.'
                  : 'The worked example in three panels, being built up.';
  }
});


/* ── Figure 7: short-run and long-run aggregate supply together ────────── */

var figSrasLras = asChainFigure({
  id:'fig-6-7-sras-lras',
  title:'Short-run and long-run aggregate supply',
  caption:'The two curves and where they come from. SRAS slopes up because a stuck nominal ' +
          'wage lets a higher price level cut the real wage and pull in more workers. LRAS ' +
          'is vertical because that wage eventually moves: once it has, the real wage is ' +
          'back where the left-hand panel started, so hiring and output are too. Ȳ is the ' +
          'natural rate of output — potential GDP.',
  model:GEN,
  axMP:genAxMP([4], ['L̄']),
  axF: genAxF([4], ['L̄'], [5], ['Ȳ']),
  axAS:asAxis([5], ['Ȳ'], [5], ['P₁']),
  steps: evenSteps(['Empty','The curves','SRAS','LRAS','A']),

  scene:function(s, T){
    var SRAS = { ln:line(0,1), tag:'SRAS', color:T.blue };
    var notes = [
      'One last look at the chain, with both aggregate supply curves on it.',
      'MPₗ and the production function: the two panels that decide how much gets made.',
      'SRAS: with W stuck, a higher P means a lower W/P, so more hiring and more output.',
      'LRAS: in the long run W moves with P, so W/P is unchanged — and so are L̄ and Ȳ.',
      'A is where the two meet. Ȳ is the natural rate of output — potential GDP.'
    ];
    var sc = { note:notes[s],
               noteColor: s>=3 ? T.green : T.ink2,
               sras: s>=2 ? [SRAS] : [], marks:[], wages:[],
               lras: s>=3 ? { Y:5, top:9 } : null };
    if(s >= 1) sc.wages.push({ L:4, label:'W/P', color:T.red });
    if(s >= 4) sc.marks.push({ L:4, P:5, letter:'A', color:T.blue, aAS:'se', ring:true });
    return sc;
  },

  describe:function(s){
    return [
      'Three empty panels.',
      'On the left the marginal product of labor falls as labor rises, with the real wage ' +
      'drawn across it, meeting it at L bar workers. In the middle the production function ' +
      'carries those workers to Y bar units of output.',
      'On the right the short-run aggregate supply curve is drawn, sloping upward. It ' +
      'slopes upward because with the nominal wage stuck, a higher price level means a ' +
      'lower real wage, which pulls the meeting point on the left-hand panel further out.',
      'A vertical green line is added at Y bar and labelled LRAS. It is vertical because in ' +
      'the long run the nominal wage moves with the price level, leaving the real wage on ' +
      'the left-hand panel exactly where it was — so L bar does not move, and neither does ' +
      'Y bar.',
      'Point A is circled where the two curves cross, at price level P one and output Y ' +
      'bar. Y bar is the natural rate of output, also called potential GDP: what the ' +
      'economy produces when unemployment is at its natural rate.'
    ][s];
  },
  aria:function(s){
    return s >= 3 ? 'Three panels ending in an upward-sloping SRAS crossing a vertical LRAS ' +
                    'at the natural rate of output.'
                  : 'The labor market and aggregate supply in three panels, being built up.';
  }
});

/* ══ THE SEVEN FIGURES ═════════════════════════════════════════════════════ */

var figLabor = productionDraw(productionFigure({
  id:'fig-6-1-labor', A:10, sym:'L',
  axY:AX_LAB_Y, axMP:AX_LAB_MP, mpTitle:'Marginal product of labor', mpSym:'MPₗ',
  factorLower:'labor', otherLower:'capital',
  unitLower:'worker', unitsLower:'workers',
  unitName:function(k){ return ['first','second','third','fourth','fifth'][k-1] + ' worker'; },
  ordinal:function(k){ return ['first','second','third','fourth','fifth'][k-1]; },
  ordinalCap:function(k){ return ['First','Second','Third','Fourth','Fifth'][k-1]; },
  blankNoteLeft:'Capital is held fixed; only labor changes.',
  blankNoteRight:'The extra output each worker brings.',
  title:'Output and the marginal product of labor',
  caption:'Capital is held fixed and workers are added one at a time. On the left the ' +
          'production function keeps rising but keeps flattening; on the right the size of ' +
          'each step is plotted on its own, and it falls from 5 units to a third of a unit. ' +
          'Those are the same fact.'
}));

var figCapital = productionDraw(productionFigure({
  id:'fig-6-2-capital', A:20, sym:'K',
  axY:AX_CAP_Y, axMP:AX_CAP_MP, mpTitle:'Marginal product of capital', mpSym:'MPₖ',
  factorLower:'capital', otherLower:'labor',
  unitLower:'unit of capital', unitsLower:'units of capital',
  unitName:function(k){ return ['first','second','third','fourth','fifth'][k-1] +
                               ' unit of capital'; },
  ordinal:function(k){ return ['first','second','third','fourth','fifth'][k-1]; },
  ordinalCap:function(k){ return ['First','Second','Third','Fourth','Fifth'][k-1]; },
  blankNoteLeft:'Labor is held fixed; only capital changes.',
  blankNoteRight:'The extra output each unit of capital brings.',
  title:'Output and the marginal product of capital',
  caption:'The same experiment run the other way round: labor is held fixed and capital is ' +
          'added a unit at a time. The production function flattens, and the marginal ' +
          'product of capital falls from 10 units to two-thirds of a unit.'
}));

var figures = {
  'fig-6-1-labor':        figLabor,
  'fig-6-2-capital':      figCapital,
  'fig-6-3-hiring':       figHiring,
  'fig-6-4-sras-price':   figSrasPrice,
  'fig-6-5-sras-wage':    figSrasWage,
  'fig-6-6-lras-example': figLrasExample,
  'fig-6-7-sras-lras':    figSrasLras
};

var ORDER = ['fig-6-1-labor','fig-6-2-capital','fig-6-3-hiring','fig-6-4-sras-price',
             'fig-6-5-sras-wage','fig-6-6-lras-example','fig-6-7-sras-lras'];

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
global.EconFigures['unit-06'] = {
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
