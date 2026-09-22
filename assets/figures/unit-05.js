/* ============================================================================
   unit-05.js — ECON 002, Unit 5: Inflation
   Shared figure module. SINGLE SOURCE OF TRUTH for every dynamic figure in
   this unit.

   Consumed by BOTH:
     classes/econ002/notes/unit-05/index.html   (mode 'notes')
     classes/econ002/notes/unit-05/deck.html    (mode 'stage')

   The source draws no diagrams for this unit at all — its five figures are
   pre-rendered FRED and BLS charts, which ship as images under
   assets/figures/unit-05/ and are NOT part of this module. What lives here
   are three figures built from the unit's own worked examples: the CPI
   basket, the index and the inflation rate it implies, and the quantity
   equation.

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
      if(yLabelW*0.78 <= availH*0.98 && cfg.yHoriz !== true){
        yLabScale = Math.max(0.78, (availH*0.96)/yLabelW);
      } else {
        yHoriz = true;
      }
    }
  }
  pad.l = maxTickW + 14*fs*dpr +
          (cfg.ylabel && !yHoriz ? T.font.label*fs*dpr*yLabScale*1.9 : 0);
  var yLabH = yHoriz ? Math.round(T.font.label*fs*dpr*1.6) : 0;
  if(yHoriz) titleH = titleH + Math.round(T.font.label*fs*dpr*1.6);

  var px = box.x + pad.l,
      py = box.y + titleH + headH + pad.t,
      pw = box.w - pad.l - pad.r,
      ph = box.h - titleH - headH - pad.t - pad.b;
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
    ctx.fillText(cfg.ylabel, px, py - Math.round(T.font.label*fs*dpr*0.5),
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



/* One y-label orientation decision for a whole multi-panel figure: if the
   longest label will not fit rotated in any panel, none of them rotate. */
function yLabelHoriz(ctx, box, T, fs, dpr, labels, hasTitle){
  var titleH = hasTitle ? Math.round(T.font.title*fs*dpr*1.9) : 0;
  var avail  = box.h - titleH - T.pad.t*fs*dpr - T.pad.b*fs*dpr;
  var i, w = 0;
  ctx.save();
  ctx.font = fnt(T,fs,dpr,'label','700');
  for(i=0;i<labels.length;i++) w = Math.max(w, ctx.measureText(labels[i]).width);
  ctx.restore();
  return w > avail*0.98;
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
    ctx.fillStyle = color;
    ctx.font = fnt(T,fs,dpr,'annot','700');
    ctx.textBaseline = 'middle';
    /* `side` is a hint; flip it if the readout would run off the plot area,
       since every annotation is drawn inside a clip rect. */
    var pad = 8*fs*dpr, tw = ctx.measureText(label).width;
    if(side !== 'left' && X + pad + tw > C.px + C.pw) side = 'left';
    else if(side === 'left' && X - pad - tw < C.px)   side = 'right';
    ctx.textAlign = (side === 'left') ? 'right' : 'left';
    ctx.fillText(label, X + (side==='left' ? -pad : pad), (Ya+Yb)/2);
    ctx.restore();
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


/* ══ BAR-CHART PAINTERS ═══════════════════════════════════════════════════
   Four of this unit's five figures are accounting identities, so they are
   drawn as bars rather than curves: a value axis, a set of named columns,
   and segments that add up. Everything reads its sizes from THEME[mode] the
   same way the curve painters do.
   ════════════════════════════════════════════════════════════════════════ */

function valueFrame(ctx, box, cfg, T, fs, dpr){
  var pad = { l:0, r:T.pad.r*fs*dpr, t:T.pad.t*fs*dpr, b:T.pad.b*fs*dpr };
  var titleH = 0, i;

  /* A stacked chart with slices too thin to hold their own number has to put
     those numbers beside the bar. Left to itself the last column's label
     falls back into the gap its neighbour is already using, and the two
     collide at projection sizes. cfg.rightGutter reserves room outside the
     plot so every such label can go to the right instead. */
  if(cfg.rightGutter){
    ctx.save();
    ctx.font = fnt(T,fs,dpr,'annot','700');
    pad.r += ctx.measureText(cfg.rightGutter).width + 18*fs*dpr;
    ctx.restore();
  }

  /* The left margin is measured, not assumed: these charts carry money
     labels like "$120k" that are far wider than the "12" the curve figures
     were padded for, and a fixed pad ran the axis label straight through
     them. */
  ctx.save();
  ctx.font = fnt(T,fs,dpr,'tick','600');
  var maxTickW = 0;
  for(i=0;i<cfg.yticks.length;i++){
    maxTickW = Math.max(maxTickW, ctx.measureText(
      cfg.tickText ? cfg.tickText(cfg.yticks[i]) : String(cfg.yticks[i])).width);
  }
  ctx.font = fnt(T,fs,dpr,'label','700');
  var labelW = cfg.ylabel ? ctx.measureText(cfg.ylabel).width : 0;
  ctx.restore();

  /* A band above the plot for legends and readouts, so they never sit on
     top of the bars they describe. */
  var headLines = cfg.headLines || 0;
  var headH = headLines ? (T.font.legend*fs*dpr*1.55*headLines + 6*fs*dpr) : 0;

  var yLabScale = 1, yHoriz = false;
  var availH = box.h - headH - pad.t - pad.b;
  if(cfg.ylabel && labelW > availH*0.98){
    if(labelW*0.78 <= availH*0.98) yLabScale = Math.max(0.78, (availH*0.96)/labelW);
    else { yHoriz = true; }
  }
  pad.l = maxTickW + 14*fs*dpr +
          (cfg.ylabel && !yHoriz ? T.font.label*fs*dpr*yLabScale*1.9 : 0);
  /* a horizontal y-label gets its own strip, above the head band */
  var yLabH = yHoriz ? Math.round(T.font.label*fs*dpr*1.6) : 0;

  var px = box.x + pad.l, py = box.y + titleH + yLabH + headH + pad.t;
  var pw = box.w - pad.l - pad.r;
  var ph = box.h - titleH - yLabH - headH - pad.t - pad.b;
  var ymin = cfg.ymin, ymax = cfg.ymax;

  var C = {
    Y: function(v){ return py + ph - (v-ymin)/(ymax-ymin)*ph; },
    /* column i of n, as a left/right pair with a gap */
    col: function(i, n, inset){
      var w = pw/n, g = w*(inset === undefined ? 0.22 : inset);
      return { x0: px + w*i + g, x1: px + w*(i+1) - g, cx: px + w*(i+0.5) };
    },
    px:px, py:py, pw:pw, ph:ph,
    headY: box.y + titleH, headH: headH
  };

  /* gridlines and value ticks */
  ctx.save();
  ctx.strokeStyle = T.grid;
  ctx.lineWidth = Math.max(1, T.lw.axis*dpr*0.7);
  ctx.setLineDash([3*dpr,4*dpr]);
  var v, y;
  for(i=0;i<cfg.yticks.length;i++){
    v = cfg.yticks[i];
    if(v === ymin) continue;
    y = C.Y(v);
    ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px+pw, y); ctx.stroke();
  }
  ctx.restore();

  /* axes */
  ctx.strokeStyle = T.axis; ctx.lineWidth = T.lw.axis*dpr;
  ctx.beginPath();
  ctx.moveTo(px, py); ctx.lineTo(px, py+ph); ctx.lineTo(px+pw, py+ph);
  ctx.stroke();
  if(ymin < 0){                       /* a zero line, when values go negative */
    ctx.save();
    ctx.strokeStyle = T.ink2; ctx.lineWidth = T.lw.axis*dpr;
    ctx.beginPath(); ctx.moveTo(px, C.Y(0)); ctx.lineTo(px+pw, C.Y(0)); ctx.stroke();
    ctx.restore();
  }

  /* tick labels, dropping any that would collide */
  ctx.fillStyle = T.ink2; ctx.font = fnt(T,fs,dpr,'tick','600');
  ctx.textAlign='right'; ctx.textBaseline='middle';
  var minGap = T.font.tick*fs*dpr*0.90, last = 1e9, tickLen = 5*fs*dpr;
  for(i=0;i<cfg.yticks.length;i++){
    v = cfg.yticks[i]; y = C.Y(v);
    ctx.strokeStyle = T.axis; ctx.lineWidth = T.lw.axis*dpr;
    ctx.beginPath(); ctx.moveTo(px-tickLen, y); ctx.lineTo(px, y); ctx.stroke();
    if(last - y >= minGap){
      ctx.fillText(cfg.tickText ? cfg.tickText(v) : String(v), px-tickLen-3*fs*dpr, y);
      last = y;
    }
  }

  /* column names under the axis */
  if(cfg.cats){
    ctx.fillStyle = T.ink; ctx.font = fnt(T,fs,dpr,'annot','700');
    ctx.textAlign='center'; ctx.textBaseline='top';
    for(i=0;i<cfg.cats.length;i++){
      var c = C.col(i, cfg.cats.length);
      wrapText(ctx, cfg.cats[i], c.cx, py+ph + 10*fs*dpr,
               pw/cfg.cats.length - 6*fs*dpr, T.font.annot*fs*dpr*1.25);
    }
  }

  /* axis label */
  ctx.fillStyle = T.ink2; ctx.font = fnt(T,fs,dpr,'label','700');
  if(cfg.ylabel && yHoriz){
    ctx.textAlign='left'; ctx.textBaseline='bottom';
    ctx.fillText(cfg.ylabel, px,
                 box.y + titleH + yLabH - Math.round(T.font.label*fs*dpr*0.35), pw);
  } else if(cfg.ylabel){
    ctx.save();
    ctx.font = '700 ' + Math.round(T.font.label*fs*dpr*yLabScale) + 'px ' + T.family;
    ctx.translate(box.x + Math.round(T.font.label*fs*dpr*yLabScale*1.15), py+ph/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText(cfg.ylabel, 0, 0, ph);
    ctx.restore();
  }
  return C;
}

/* A one-line readout in the band above the plot. */
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

/* Centre-wrapped label, so long column names do not run into each other. */
function wrapText(ctx, text, cx, y, maxW, lh){
  var words = String(text).split(' '), line = '', lines = [], i, test;
  for(i=0;i<words.length;i++){
    test = line ? (line + ' ' + words[i]) : words[i];
    if(ctx.measureText(test).width > maxW && line){ lines.push(line); line = words[i]; }
    else line = test;
  }
  if(line) lines.push(line);
  for(i=0;i<lines.length;i++) ctx.fillText(lines[i], cx, y + i*lh);
  return lines.length;
}

function bar(ctx, C, c, vFrom, vTo, color, alpha){
  if(Math.abs(vTo - vFrom) < 1e-9) return;
  ctx.save();
  if(alpha !== undefined) ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  var y0 = C.Y(vFrom), y1 = C.Y(vTo);
  ctx.fillRect(c.x0, Math.min(y0,y1), c.x1-c.x0, Math.abs(y1-y0));
  ctx.restore();
}

/* A value written on a bar segment, or just above it when the segment is
   too thin to hold text. */
function barValue(ctx, C, c, vFrom, vTo, text, T, fs, dpr, onDark, side){
  var y0 = C.Y(vFrom), y1 = C.Y(vTo), h = Math.abs(y1-y0);
  var lh = T.font.annot*fs*dpr;
  ctx.save();
  ctx.font = fnt(T,fs,dpr,'annot','700');
  ctx.textAlign = 'center';
  if(h > lh*1.35){
    ctx.fillStyle = onDark ? T.bg : T.ink;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, c.cx, (y0+y1)/2);
  } else {
    /* Too thin to hold the text. Put it beside the bar rather than above it,
       where it would land on the column total. */
    var gap = 8*fs*dpr, w = ctx.measureText(text).width;
    ctx.fillStyle = T.ink;
    ctx.textBaseline = 'middle';
    if(side === 'right' || C.px + C.pw - c.x1 > w + gap*2){
      ctx.textAlign = 'left';
      ctx.fillText(text, c.x1 + gap, (y0+y1)/2);
    } else {
      ctx.textAlign = 'right';
      ctx.fillText(text, c.x0 - gap, (y0+y1)/2);
    }
    /* a short rule so the label is clearly attached to its slice */
    ctx.strokeStyle = T.ink2; ctx.lineWidth = Math.max(1, T.lw.axis*dpr*0.7);
    ctx.beginPath();
    ctx.moveTo(c.x0, (y0+y1)/2); ctx.lineTo(c.x1, (y0+y1)/2);
    ctx.stroke();
  }
  ctx.restore();
}

function legendAt(ctx, entries, T, fs, dpr, x, y, align){
  var lh = T.font.legend*fs*dpr*1.6, sw = 16*fs*dpr, gap = 7*fs*dpr, i;
  ctx.save();
  ctx.font = fnt(T,fs,dpr,'legend','700');
  ctx.textBaseline = 'middle';
  for(i=0;i<entries.length;i++){
    var e = entries[i], cy = y + lh*(i+0.5), ex = x;
    if(align === 'right'){
      var w = sw + gap + ctx.measureText(e.label).width;
      ex = x - w;
    }
    ctx.fillStyle = e.color;
    ctx.fillRect(ex, cy - sw*0.32, sw, sw*0.64);
    ctx.fillStyle = T.ink;
    ctx.textAlign = 'left';
    ctx.fillText(e.label, ex + sw + gap, cy);
  }
  ctx.restore();
  return y + lh*entries.length;
}

function legendRow(ctx, entries, T, fs, dpr, x0, x1, y){
  var sw = 14*fs*dpr, gap = 6*fs*dpr, pad = 16*fs*dpr, i, w = 0, widths = [];
  ctx.save();
  ctx.font = fnt(T,fs,dpr,'legend','700');
  for(i=0;i<entries.length;i++){
    widths[i] = sw + gap + ctx.measureText(entries[i].label).width;
    w += widths[i] + (i ? pad : 0);
  }
  var x = x0 + Math.max(0, ((x1-x0) - w)/2);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  for(i=0;i<entries.length;i++){
    ctx.fillStyle = entries[i].color;
    ctx.fillRect(x, y - sw*0.32, sw, sw*0.64);
    ctx.fillStyle = T.ink;
    ctx.fillText(entries[i].label, x + sw + gap, y);
    x += widths[i] + pad;
  }
  ctx.restore();
}

function begin(canvas, mode){
  var S = setupCanvas(canvas); if(!S) return null;
  var T = THEME[mode];
  S.T = T; S.fs = fontScale(mode, S.cssW);
  S.box = panelBoxes(S.W, S.H, S.dpr, 1, false, T.panelGap)[0];
  paintBg(S.ctx, S.W, S.H, T);
  return S;
}


/* ══ DATA — transcribed verbatim from "Inflation.tex" ══════════════════════
   Every number below is one of the unit's own worked examples. Nothing is
   invented; the figures only draw what the printed tables already say.     */

var D = {

  /* The four-good consumer basket, line 345. 2023 is the base year, so the
     2023 quantities are the basket and they never change again. */
  goods: [
    { name:'Rent',          unit:'months',        q:12,  p:[1200, 1260, 1320] },
    { name:'Gasoline',      unit:'gallons',       q:500, p:[4.00, 4.40, 4.20] },
    { name:'Food',          unit:'grocery trips', q:400, p:[10.00, 11.00, 12.00] },
    { name:'Entertainment', unit:'tickets',       q:20,  p:[50.00, 52.00, 56.00] }
  ],
  years: [2023, 2024, 2025],

  /* The quantity-equation example, line 522. */
  quantity: [
    { M:300, Y:100 },
    { M:600, Y:100 },
    { M:600, Y:200 }
  ]

};

/* Base-year quantities, current-year prices — the definition of the CPI
   basket, and the reason substitution bias exists. */
function goodCost(g, yi){ return g.q * g.p[yi]; }
function basket(yi){
  var t = 0, i;
  for(i=0;i<D.goods.length;i++) t += goodCost(D.goods[i], yi);
  return t;
}
function cpi(yi){ return 100 * basket(yi) / basket(0); }
function infl(yi){ return (cpi(yi) - cpi(yi-1)) / cpi(yi-1) * 100; }

function money(v, dp){
  var n = Math.abs(v), s;
  s = (dp === undefined ? (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)) : n.toFixed(dp));
  s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (v < 0 ? '-$' : '$') + s;
}
function num2(v){ return (Math.round(v*100)/100).toFixed(2); }
function pct2(v){ return (Math.round(v*100)/100).toFixed(2) + '%'; }

/* A straight line in device pixels — the bar figures work in mixed units. */
function polylinePx(ctx, x0, y0, x1, y1, color, lw, dash){
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  if(dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
  ctx.restore();
}

/* Vertical centre of head-band line i, so a legend and a readout can share
   the band without landing on each other. */
function headLineY(C, T, fs, dpr, i){
  return C.headY + T.font.legend*fs*dpr*1.55*(i+0.5) + 3*fs*dpr;
}

/* The value that sits above a column, clear of the segment labels inside it. */
function columnTotal(ctx, C, c, v, text, T, fs, dpr, color){
  ctx.save();
  ctx.fillStyle = color || T.ink;
  ctx.font = fnt(T,fs,dpr,'annot','700');
  ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.fillText(text, c.cx, C.Y(v) - 9*fs*dpr);
  ctx.restore();
}


/* ══ FIGURE 1: the cost of one fixed basket, three years running ═══════════
   The whole point of the CPI is that the basket is held still while the
   prices move, so the figure holds the quantities still and lets only the
   prices change. Gasoline falling in 2025 while the basket still gets more
   expensive is visible here, and it is the unit's other claim — inflation
   does not mean every price rose.
   ════════════════════════════════════════════════════════════════════════ */

var figBasket = (function(){
  var COLORS = ['blue','gold','green','red'];
  var steps = [
    { name:'blank',   t:0.00, label:'Empty' },
    { name:'y2023',   t:0.25, label:'2023 prices' },
    { name:'y2024',   t:0.50, label:'2024 prices' },
    { name:'y2025',   t:0.75, label:'2025 prices' },
    { name:'compare', t:1.00, label:'What changed' }
  ];

  function derive(state){
    var f = clamp(state.t,0,1)*4;
    var shown = clamp(Math.round(f), 0, 4);   /* how many year columns are up */
    return { shown:Math.min(shown,3), done: shown >= 4 };
  }

  return {
    id:'fig-5-1-basket',
    title:'One fixed basket, priced three years running',
    caption:'The quantities are the 2023 quantities in every year — that is what makes ' +
            'this a price index and not a spending total. Only the prices change. The ' +
            'basket costs $21,400, then $22,760, then $23,860.',
    panels:1, aspect:0.62, aspectStacked:0.95, steps:steps,
    initState:function(){ return {t:0}; },
    setStep:function(s,i){ s.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:function(s,t){ s.t = clamp(t,0,1); },

    draw:function(canvas, state, mode){
      var S = begin(canvas, mode); if(!S) return;
      var ctx=S.ctx, T=S.T, fs=S.fs, dpr=S.dpr;
      var d = derive(state), i, j;

      var C = valueFrame(ctx, S.box, {
        ymin:0, ymax:26000,
        yticks:[0,2000,4000,6000,8000,10000,12000,14000,16000,18000,20000,22000,24000,26000],
        tickText:function(v){ return v === 0 ? '$0' : '$' + (v/1000) + 'k'; },
        ylabel:'Cost of the basket',
        cats:['2023 prices (base year)','2024 prices','2025 prices'],
        headLines:2, rightGutter:'$00,000'
      }, T, fs, dpr);

      legendRow(ctx, D.goods.map(function(g,k){
        return { label:g.name, color:T[COLORS[k]] };
      }), T, fs, dpr, C.px, C.px + C.pw, headLineY(C,T,fs,dpr,0));

      if(d.done){
        polylinePx(ctx, C.px, C.Y(basket(0)), C.px + C.pw, C.Y(basket(0)),
                   T.ink2, T.lw.guide*dpr, [7*dpr,5*dpr]);
      }

      for(i=0;i<d.shown;i++){
        var c = C.col(i, 3), at = 0;
        for(j=0;j<D.goods.length;j++){
          var v = goodCost(D.goods[j], i);
          bar(ctx, C, c, at, at+v, T[COLORS[j]]);
          /* forced right: a label pushed left would land in the gap the
             previous column's label is already using */
          barValue(ctx, C, c, at, at+v, money(v,0), T, fs, dpr, true, 'right');
          at += v;
        }
        columnTotal(ctx, C, c, at, money(at,0), T, fs, dpr);
      }

      if(d.done){
        headNote(ctx, C, 'Gasoline is cheaper in 2025 than in 2024, and the basket ' +
                 'still costs more.', T.red, T, fs, dpr, 1);
      } else if(d.shown > 0){
        headNote(ctx, C, D.years[d.shown-1] + ' prices × 2023 quantities = ' +
                 money(basket(d.shown-1),0), T.ink2, T, fs, dpr, 1);
      } else {
        headNote(ctx, C, 'Base-year quantities: 12 months of rent, 500 gallons of gas, ' +
                 '400 grocery trips, 20 tickets.', T.ink2, T, fs, dpr, 1);
      }
    },

    describe:function(state){
      var d = derive(state);
      if(d.shown === 0) return 'An empty chart, ready to price the same fixed basket in ' +
        'each of three years. The basket is 12 months of rent, 500 gallons of gasoline, ' +
        '400 grocery trips and 20 entertainment tickets, and those quantities are the ' +
        '2023 quantities in every year.';
      if(d.done) return 'All three columns are up. The basket costs $21,400 in 2023, ' +
        '$22,760 in 2024 and $23,860 in 2025, and a dashed line at $21,400 shows how far ' +
        'above the base year the later columns sit. Gasoline is the exception: 500 gallons ' +
        'cost $2,200 in 2024 but only $2,100 in 2025, so that slice shrank. The basket ' +
        'still got more expensive, because rent and food rose by more than gas fell. ' +
        'Inflation is a statement about the average, not about every price.';
      var yi = d.shown - 1;
      return D.years[yi] + ' prices applied to the 2023 quantities: rent ' +
        money(goodCost(D.goods[0],yi),0) + ', gasoline ' + money(goodCost(D.goods[1],yi),0) +
        ', food ' + money(goodCost(D.goods[2],yi),0) + ', entertainment ' +
        money(goodCost(D.goods[3],yi),0) + '. The basket costs ' + money(basket(yi),0) + '.';
    },
    ariaLabel:function(state){
      var d = derive(state);
      if(d.shown === 0) return 'Stacked bar chart of the cost of a fixed consumer basket, ' +
        'not yet built.';
      return 'Stacked bar chart of the cost of a fixed consumer basket. ' +
        (d.done ? 'All three years shown: $21,400, $22,760 and $23,860.'
                : 'Through ' + D.years[d.shown-1] + ': ' + money(basket(d.shown-1),0) + '.');
    }
  };
})();


/* ══ FIGURE 2: the index is a level; inflation is its rate of change ═══════
   Students routinely read a falling inflation rate as falling prices. This
   figure puts the two on the same picture: the bars keep getting taller
   while the percentage attached to each step gets smaller.
   ════════════════════════════════════════════════════════════════════════ */

var figCpiInflation = (function(){
  var steps = [
    { name:'blank',   t:0.00, label:'Empty' },
    { name:'y2023',   t:0.25, label:'CPI 2023' },
    { name:'y2024',   t:0.50, label:'CPI 2024, π = 6.36%' },
    { name:'y2025',   t:0.75, label:'CPI 2025, π = 4.83%' },
    { name:'compare', t:1.00, label:'Level vs. rate' }
  ];

  function derive(state){
    var f = clamp(state.t,0,1)*4;
    var shown = clamp(Math.round(f), 0, 4);
    return { shown:Math.min(shown,3), done: shown >= 4 };
  }

  return {
    id:'fig-5-2-cpi-inflation',
    title:'The CPI is a level; inflation is the rate at which it changes',
    caption:'The CPI rises in both years — 100, then 106.36, then 111.50. The ' +
            'inflation rate falls, from 6.36% to 4.83%, because the second increase is ' +
            'measured against a larger number. Falling inflation is not falling prices.',
    panels:1, aspect:0.62, aspectStacked:0.95, steps:steps,
    initState:function(){ return {t:0}; },
    setStep:function(s,i){ s.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:function(s,t){ s.t = clamp(t,0,1); },

    draw:function(canvas, state, mode){
      var S = begin(canvas, mode); if(!S) return;
      var ctx=S.ctx, T=S.T, fs=S.fs, dpr=S.dpr;
      var d = derive(state), i;

      var C = valueFrame(ctx, S.box, {
        ymin:0, ymax:130,
        yticks:[0,10,20,30,40,50,60,70,80,90,100,110,120,130],
        ylabel:'CPI (2023 = 100)',
        cats:['2023 (base year)','2024','2025'],
        headLines:2
      }, T, fs, dpr);

      headNote(ctx, C, 'CPI = 100 × (cost of the basket now) ÷ (cost in 2023)',
               T.ink2, T, fs, dpr, 0);

      for(i=0;i<d.shown;i++){
        var c = C.col(i, 3), v = cpi(i);
        bar(ctx, C, c, 0, v, T.blue);
        barValue(ctx, C, c, 0, v, num2(v), T, fs, dpr, true);

        /* Each year after the base gets the previous level drawn across it,
           so the increase is a visible gap and not a number to be trusted. */
        if(i > 0){
          polylinePx(ctx, c.x0 - 10*fs*dpr, C.Y(cpi(i-1)), c.x1 + 10*fs*dpr, C.Y(cpi(i-1)),
                     T.red, T.lw.guide*dpr, [7*dpr,5*dpr]);
          columnTotal(ctx, C, c, v, '+' + num2(v - cpi(i-1)) + ' points  =  ' +
                      pct2(infl(i)), T, fs, dpr, T.red);
        }
      }

      if(d.done){
        headNote(ctx, C, 'Both bars grew. The second step is smaller in percent ' +
                 'because 5.14 ÷ 106.36 is less than 6.36 ÷ 100.',
                 T.red, T, fs, dpr, 1);
      } else if(d.shown > 1){
        headNote(ctx, C, 'π = (new − old) ÷ old = (' + num2(cpi(d.shown-1)) +
                 ' − ' + num2(cpi(d.shown-2)) + ') ÷ ' + num2(cpi(d.shown-2)) +
                 ' = ' + pct2(infl(d.shown-1)), T.ink2, T, fs, dpr, 1);
      } else if(d.shown === 1){
        headNote(ctx, C, 'The CPI in the base year is always 100 — the basket is ' +
                 'being divided by itself.', T.ink2, T, fs, dpr, 1);
      }
    },

    describe:function(state){
      var d = derive(state);
      if(d.shown === 0) return 'An empty chart, ready to plot the CPI in 2023, 2024 and ' +
        '2025 on an axis running from 0 to 130.';
      if(d.shown === 1) return 'One bar: the CPI in 2023, the base year, is 100. It is ' +
        'always 100 in the base year, because the cost of the basket is being divided by ' +
        'itself.';
      if(d.done) return 'Three bars: 100, 106.36 and 111.50. Every bar is taller than the ' +
        'one before it, so prices rose in both years. The step from 2023 to 2024 is 6.36 ' +
        'index points on a base of 100, which is 6.36%. The step from 2024 to 2025 is 5.14 ' +
        'points on a base of 106.36, which is 4.83%. The rate fell while the level kept ' +
        'climbing — lower inflation means prices are rising more slowly, not falling.';
      return 'The bar for ' + D.years[d.shown-1] + ' reaches ' + num2(cpi(d.shown-1)) +
        ', with a dashed line across it at ' + num2(cpi(d.shown-2)) + ' marking last ' +
        'year’s level. The gap is ' + num2(cpi(d.shown-1) - cpi(d.shown-2)) +
        ' index points, which is ' + pct2(infl(d.shown-1)) + ' inflation.';
    },
    ariaLabel:function(state){
      var d = derive(state);
      if(d.shown === 0) return 'Bar chart of the consumer price index, not yet built.';
      return 'Bar chart of the consumer price index. ' +
        (d.done ? 'Levels 100, 106.36, 111.50; inflation 6.36% then 4.83%.'
                : 'Through ' + D.years[d.shown-1] + ': CPI ' + num2(cpi(d.shown-1)) + '.');
    }
  };
})();


/* ══ FIGURE 3: money against goods ════════════════════════════════════════
   Not a value-axis chart, and deliberately so. A dollar and a good are
   drawn the same length, which makes the money bar exactly as many
   goods-bar lengths long as the price is in dollars — so the price can be
   counted off the picture instead of taken on trust. Same construction as
   the "Inflation: a rate, not a level" discussion deck; the numbers are the
   lecture notes' own (M = 300 or 600, Y = 100 or 200).
   ════════════════════════════════════════════════════════════════════════ */

/* Rounded rectangle — the bars read as objects rather than as fills. */
function roundRect(ctx, x, y, w, h, r){
  r = Math.min(r, Math.abs(w)/2, Math.abs(h)/2);
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
}

/* Measures the gutters this figure needs and hands back the geometry of a
   stack of case rows. Everything is derived from the text widths, so the
   projection theme's much larger type does not run into the bars.

   Two layouts. The wide one keeps MONEY and GOODS in a left gutter with the
   case tag beside them and the price out on the right. On a phone those
   gutters would eat the whole width and leave nothing to draw the bars in,
   so a compact layout puts the case tag and the price on their own line and
   folds the row labels into the amounts ("$300 of money"). */
function moneyFrame(ctx, box, T, fs, dpr, cases, headLines){
  var i, gap = 12*fs*dpr;

  ctx.save();
  ctx.font = fnt(T,fs,dpr,'legend','700');
  var caseW = 0, tagW = 0;
  for(i=0;i<cases.length;i++){
    caseW = Math.max(caseW, ctx.measureText(cases[i].tag).width,
                            ctx.measureText(cases[i].note).width);
    tagW  = Math.max(tagW,  ctx.measureText(cases[i].tag + ' · ' + cases[i].note).width);
  }
  var labelW = Math.max(ctx.measureText('MONEY').width, ctx.measureText('GOODS').width);
  ctx.font = fnt(T,fs,dpr,'annot','700');
  var amountW  = ctx.measureText('1,000 goods').width + gap;
  var amountCW = Math.max(ctx.measureText('$600 of money').width,
                          ctx.measureText('1,000 goods').width) + gap;
  ctx.font = fnt(T,fs,dpr,'label','700');
  var priceW = ctx.measureText('P = $6 ▲').width + gap;
  ctx.restore();

  var headH = headLines ? (T.font.legend*fs*dpr*1.55*headLines + 6*fs*dpr) : 0;
  var x0   = box.x + caseW + gap + labelW + gap;
  var barW = box.x + box.w - priceW - amountW - x0;
  var compact = barW < box.w*0.42;

  if(compact){
    x0   = box.x;
    barW = box.w - amountCW;
  }

  var top = box.y + headH + T.pad.t*fs*dpr;

  return {
    compact: compact,
    x0: x0, barW: barW,
    top: top, ph: box.h - headH - T.pad.t*fs*dpr - T.pad.b*fs*dpr*0.30,
    rh: (box.h - headH - T.pad.t*fs*dpr - T.pad.b*fs*dpr*0.30)/cases.length,
    caseX: box.x, labelR: x0 - gap*0.7, priceR: box.x + box.w,
    gap: gap,
    /* headNote() reads these three */
    px: box.x, pw: box.w, headY: box.y, headH: headH
  };
}

/* One case: a money bar over a goods bar, sharing a left edge, with the
   money bar divided into goods-bar lengths and those lengths counted. */
function moneyRow(ctx, G, T, fs, dpr, idx, cs, unit){
  var rowTop = G.top + G.rh*idx;
  var lineH  = T.font.legend*fs*dpr*1.35;
  var g      = 6*fs*dpr;
  var headerH = G.compact ? lineH : 0;
  var barH   = Math.min(34*fs*dpr, (G.rh - headerH - lineH - g*3)/2);
  var yNum   = rowTop + headerH + lineH*0.55;
  var yM     = rowTop + headerH + lineH + g;
  var yG     = yM + barH + g;
  var wM = cs.M*unit, wG = cs.Y*unit, price = cs.M/cs.Y, k, x;
  var out = Math.max(1, T.lw.axis*dpr*0.55);

  /* the goods-length grid, drawn first so the bars sit on top of it */
  ctx.save();
  ctx.strokeStyle = T.grid;
  ctx.lineWidth = Math.max(1, T.lw.axis*dpr*0.6);
  ctx.setLineDash([3*dpr,4*dpr]);
  for(k=1;k<=price;k++){
    x = G.x0 + wG*k;
    ctx.beginPath();
    ctx.moveTo(x, rowTop + headerH + lineH*0.9); ctx.lineTo(x, yG+barH);
    ctx.stroke();
  }
  ctx.restore();

  /* count the lengths — this row of numbers IS the price */
  ctx.save();
  ctx.fillStyle = T.gold; ctx.font = fnt(T,fs,dpr,'legend','700');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for(k=1;k<=price;k++) ctx.fillText(String(k), G.x0 + wG*(k-0.5), yNum);
  ctx.restore();

  /* money */
  ctx.save();
  ctx.fillStyle = T.gold; roundRect(ctx, G.x0, yM, wM, barH, 4*dpr); ctx.fill();
  ctx.strokeStyle = T.ink; ctx.lineWidth = out; ctx.stroke();
  ctx.strokeStyle = T.bg;  ctx.lineWidth = Math.max(1.3, 1.6*dpr);
  for(k=1;k<price;k++){
    x = G.x0 + wG*k;
    ctx.beginPath(); ctx.moveTo(x, yM); ctx.lineTo(x, yM+barH); ctx.stroke();
  }
  ctx.restore();

  /* goods */
  ctx.save();
  ctx.fillStyle = T.blue; roundRect(ctx, G.x0, yG, wG, barH, 4*dpr); ctx.fill();
  ctx.strokeStyle = T.ink; ctx.lineWidth = out; ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.textBaseline = 'middle';

  if(G.compact){
    /* case tag and price share a line above the bars. The note is dropped
       rather than allowed to run into the price when the two do not fit;
       "unchanged" is dropped for the same reason, and is still carried by
       the readout under the plot and by the figure's description. */
    ctx.font = fnt(T,fs,dpr,'legend','700');
    var tagFull = cs.tag + ' · ' + cs.note;
    var room = G.priceR - G.caseX - ctx.measureText(cs.price).width - G.gap;
    if(ctx.measureText(tagFull).width > room) tagFull = cs.tag;
    ctx.textAlign = 'left';
    ctx.fillStyle = cs.color ? T[cs.color] : T.ink2;
    ctx.fillText(tagFull, G.caseX, rowTop + lineH*0.5);
    ctx.textAlign = 'right';
    ctx.fillStyle = cs.color ? T[cs.color] : T.ink;
    ctx.fillText(cs.price, G.priceR, rowTop + lineH*0.5);

    /* the row labels fold into the amounts, so no left gutter is needed */
    ctx.font = fnt(T,fs,dpr,'annot','700');
    ctx.textAlign = 'left';
    ctx.fillStyle = T.gold;
    ctx.fillText(money(cs.M,0) + ' of money', G.x0 + wM + G.gap*0.5, yM + barH/2);
    ctx.fillStyle = T.blue;
    ctx.fillText(String(cs.Y) + ' goods', G.x0 + wG + G.gap*0.5, yG + barH/2);

  } else {
    ctx.font = fnt(T,fs,dpr,'legend','700');
    ctx.fillStyle = T.muted; ctx.textAlign = 'right';
    ctx.fillText('MONEY', G.labelR, yM + barH/2);
    ctx.fillText('GOODS', G.labelR, yG + barH/2);

    ctx.textAlign = 'left';
    ctx.fillStyle = cs.color ? T[cs.color] : T.ink2;
    ctx.fillText(cs.tag,  G.caseX, yM + barH*0.35);
    ctx.fillStyle = T.muted;
    ctx.fillText(cs.note, G.caseX, yM + barH*0.35 + T.font.legend*fs*dpr*1.25);

    ctx.font = fnt(T,fs,dpr,'annot','700');
    ctx.fillStyle = T.gold;
    ctx.fillText(money(cs.M,0), G.x0 + wM + G.gap*0.7, yM + barH/2);
    ctx.fillStyle = T.blue;
    ctx.fillText(String(cs.Y) + ' goods', G.x0 + wG + G.gap*0.7, yG + barH/2);

    ctx.font = fnt(T,fs,dpr,'label','700');
    ctx.textAlign = 'right';
    ctx.fillStyle = cs.color ? T[cs.color] : T.ink;
    ctx.fillText(cs.price, G.priceR, (yM + yG + barH)/2);
    if(cs.priceNote){
      ctx.font = fnt(T,fs,dpr,'legend','700');
      ctx.fillStyle = T.muted;
      ctx.fillText(cs.priceNote, G.priceR,
                   (yM + yG + barH)/2 + T.font.label*fs*dpr*1.05);
    }
  }
  ctx.restore();

  /* a hairline under the row, so three cases read as three cases */
  if(idx < 2){
    ctx.save();
    ctx.strokeStyle = T.grid;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = Math.max(1, T.lw.axis*dpr*0.5);
    ctx.beginPath();
    ctx.moveTo(G.caseX, rowTop + G.rh - 2*fs*dpr);
    ctx.lineTo(G.priceR, rowTop + G.rh - 2*fs*dpr);
    ctx.stroke();
    ctx.restore();
  }
}

var figQuantity = (function(){
  var CASES = [
    { M:300, Y:100, tag:'CASE A', note:'today',
      price:'P = $3', color:null },
    { M:600, Y:100, tag:'CASE B', note:'money doubles',
      price:'P = $6 ▲', color:'gold' },
    { M:600, Y:200, tag:'CASE C', note:'output doubles too',
      price:'P = $3', priceNote:'unchanged', color:'blue' }
  ];
  var MMAX = 600;

  var steps = [
    { name:'blank',   t:0.00, label:'Empty' },
    { name:'caseA',   t:0.25, label:'Case A — $300 and 100 goods' },
    { name:'caseB',   t:0.50, label:'Case B — money doubles' },
    { name:'caseC',   t:0.75, label:'Case C — output doubles too' },
    { name:'compare', t:1.00, label:'π = %ΔM − %ΔY' }
  ];

  function derive(state){
    var f = clamp(state.t,0,1)*4;
    var shown = clamp(Math.round(f), 0, 4);
    return { shown:Math.min(shown,3), done: shown >= 4 };
  }

  return {
    id:'fig-5-3-quantity',
    title:'What the money buys: P = M ÷ Y',
    caption:'A dollar and a good are drawn the same length, so the money bar is as many ' +
            'goods-bar lengths long as the price is in dollars — count the segments and ' +
            'you have read the price off the picture. Double the money with output held ' +
            'still and the count doubles. Double the goods as well and it goes back to ' +
            'where it started.',
    /* On a phone the row labels move above the bars and the whole thing
       goes portrait, so the bars still have width to be read by. */
    panels:1, aspect:0.56, aspectStacked:1.45, steps:steps,
    initState:function(){ return {t:0}; },
    setStep:function(s,i){ s.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:function(s,t){ s.t = clamp(t,0,1); },

    draw:function(canvas, state, mode){
      var S = begin(canvas, mode); if(!S) return;
      var ctx=S.ctx, T=S.T, fs=S.fs, dpr=S.dpr;
      var d = derive(state), i;

      var G = moneyFrame(ctx, S.box, T, fs, dpr, CASES, 2);
      var unit = G.barW / MMAX;

      headNote(ctx, G, '$1 of money and 1 good are drawn the same length',
               T.ink2, T, fs, dpr, 0);

      for(i=0;i<d.shown;i++) moneyRow(ctx, G, T, fs, dpr, i, CASES[i], unit);

      if(d.done){
        headNote(ctx, G, 'Money grew 100% both times. Prices only rose when output ' +
                 'stood still:  π = %ΔM − %ΔY', T.green, T, fs, dpr, 1);
      } else if(d.shown === 1){
        headNote(ctx, G, '3 goods-bar lengths fit inside the money bar, so P = 300 ÷ 100 = $3',
                 T.ink2, T, fs, dpr, 1);
      } else if(d.shown === 2){
        headNote(ctx, G, 'Twice the money chasing the same 100 goods: 6 lengths, ' +
                 'so P = 600 ÷ 100 = $6', T.gold, T, fs, dpr, 1);
      } else if(d.shown === 3){
        headNote(ctx, G, 'Twice the goods as well: back to 3 lengths, ' +
                 'so P = 600 ÷ 200 = $3', T.blue, T, fs, dpr, 1);
      }
    },

    describe:function(state){
      var d = derive(state);
      if(d.shown === 0) return 'An empty chart, ready to compare three cases of the same ' +
        'economy. In each one a gold money bar is drawn above a blue goods bar, and one ' +
        'dollar and one good are drawn the same length, so the money bar is as many ' +
        'goods-bar lengths long as the average price is in dollars.';
      if(d.shown === 1) return 'Case A: $300 of money above 100 goods. The money bar is ' +
        'three goods-bar lengths long, and those three lengths are numbered 1, 2, 3. The ' +
        'average price is $300 divided by 100 goods, which is $3.';
      if(d.shown === 2) return 'Case B is added below case A. The money bar doubles to ' +
        '$600 while the goods bar stays at 100 goods, so the money bar is now six ' +
        'goods-bar lengths long instead of three. The average price doubles to $6. Twice ' +
        'the money is chasing exactly the same goods.';
      if(d.shown === 3) return 'Case C is added below. Money is still $600, but the goods ' +
        'bar has doubled to 200 goods, so it takes only three of the longer goods-bar ' +
        'lengths to fill the money bar. The average price is back to $3, level with case A.';
      return 'All three cases are shown. Case A: $300 and 100 goods, three lengths, $3. ' +
        'Case B: $600 and 100 goods, six lengths, $6. Case C: $600 and 200 goods, three ' +
        'lengths, $3 again. Money doubled in both B and C; the price level only moved in ' +
        'the case where output stood still. That is the quantity equation: inflation ' +
        'equals the growth rate of money minus the growth rate of output.';
    },
    ariaLabel:function(state){
      var d = derive(state);
      if(d.shown === 0) return 'A bar comparison of money against goods in three cases, ' +
        'not yet built.';
      return 'Money bars above goods bars, drawn to the same scale, so the number of ' +
             'goods-bar lengths in the money bar is the price. ' +
             (d.done ? 'Case A $3, case B $6, case C $3.'
                     : 'Through case ' + ' ABC'.charAt(d.shown) + '.');
    }
  };
})();

/* ══ THE THREE FIGURES ════════════════════════════════════════════════════ */

var figures = {
  'fig-5-1-basket':         figBasket,
  'fig-5-2-cpi-inflation':  figCpiInflation,
  'fig-5-3-quantity':       figQuantity
};

var ORDER = ['fig-5-1-basket','fig-5-2-cpi-inflation','fig-5-3-quantity'];

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
global.EconFigures['unit-05'] = {
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
