/* ============================================================================
   unit-03.js — ECON 002, Unit 3: Measuring GDP
   Shared figure module. SINGLE SOURCE OF TRUTH for every dynamic figure in
   this unit.

   Consumed by BOTH:
     classes/econ002/notes/unit-03/index.html   (mode 'notes')
     classes/econ002/notes/unit-03/deck.html    (mode 'stage')

   This unit's eleven FRED charts are pre-rendered PDFs in the source, not
   equations, so they ship as images under assets/figures/unit-03/ and are NOT
   part of this module. What lives here are the five figures that can be built
   from the unit's own worked examples, plus its circular flow diagram.

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


/* ══ DATA — transcribed verbatim from "Measuring GDP.tex" ══════════════════
   Every number below is one of the unit's own worked examples. Nothing is
   invented; the figures only draw what the printed tables already say.     */

var D = {

  /* GDP vs GNP example, line 386. Ford and Honda produce inside the U.S.;
     Jeff earns abroad; David is a foreign citizen earning inside the U.S. */
  gdpGnp: [
    { who:'Ford',  what:'Trucks built in Detroit',            amount:25,  gdp:true,  gnp:true  },
    { who:'Honda', what:'Sedans built in Ohio',               amount:15,  gdp:true,  gnp:false },
    { who:'Jeff',  what:'Teaching in Switzerland',            amount:1,   gdp:false, gnp:true  },
    { who:'David', what:'Ghanaian citizen at RAND, Santa Monica', amount:1.5, gdp:true, gnp:false }
  ],
  gdpTotal: 41.5, gnpTotal: 26,

  /* Real and nominal GDP, line 473. 2024 is the base year. */
  years: [
    { year:2024, apples:{q:500, p:2},  bmws:{q:3, p:20000} },
    { year:2025, apples:{q:600, p:3},  bmws:{q:4, p:25000} }
  ],
  base: { apples:2, bmws:20000 },

  /* Value added in a gallon of gas, line 540. */
  stages: [
    { name:'Oil drilling', sale:3.00, added:3.00 },
    { name:'Refining',     sale:3.25, added:0.25 },
    { name:'Shipping',     sale:3.60, added:0.35 },
    { name:'Retail sale',  sale:4.00, added:0.40 }
  ]

};

/* NGDP uses each year's own prices; RGDP uses base-year prices throughout. */
function ngdp(y){ return y.apples.q*y.apples.p + y.bmws.q*y.bmws.p; }
function rgdp(y){ return y.apples.q*D.base.apples + y.bmws.q*D.base.bmws; }

function money(v, dp){
  var n = Math.abs(v), s;
  s = (dp === undefined ? (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)) : n.toFixed(dp));
  s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (v < 0 ? '-$' : '$') + s;
}
function num(v){ return String(Math.round(v*100)/100).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function pct(v){ return (Math.round(v*10)/10).toFixed(1) + '%'; }

/* ══ BAR-CHART PAINTERS ═══════════════════════════════════════════════════
   Four of this unit's five figures are accounting identities, so they are
   drawn as bars rather than curves: a value axis, a set of named columns,
   and segments that add up. Everything reads its sizes from THEME[mode] the
   same way the curve painters do.
   ════════════════════════════════════════════════════════════════════════ */

function valueFrame(ctx, box, cfg, T, fs, dpr){
  var pad = { l:0, r:T.pad.r*fs*dpr, t:T.pad.t*fs*dpr, b:T.pad.b*fs*dpr };
  var titleH = 0, i;

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
function barValue(ctx, C, c, vFrom, vTo, text, T, fs, dpr, onDark){
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
    if(C.px + C.pw - c.x1 > w + gap*2){
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

/* ══ FIGURE 1: what lands in GDP, what lands in GNP ════════════════════════ */

var figGdpGnp = (function(){
  var items = D.gdpGnp;
  var steps = [{ name:'start', t:0, label:'The four activities' }];
  items.forEach(function(it,i){
    steps.push({ name:'item-'+i, t:(i+1)/(items.length+1), label:it.who });
  });
  steps.push({ name:'totals', t:1, label:'Totals' });

  var COLORS = ['blue','red','green','gold'];

  function derive(state){
    var f = clamp(state.t,0,1)*(items.length+1);
    var shown = clamp(Math.round(f), 0, items.length+1);
    var gdp = 0, gnp = 0, i;
    for(i=0;i<Math.min(shown, items.length);i++){
      if(items[i].gdp) gdp += items[i].amount;
      if(items[i].gnp) gnp += items[i].amount;
    }
    return { shown:shown, gdp:gdp, gnp:gnp, done: shown > items.length };
  }

  return {
    id:'fig-3-1-gdp-gnp',
    title:'What lands in GDP, and what lands in GNP',
    caption:'GDP counts production <em>inside</em> the country, whoever owns it. GNP ' +
            'counts production by the country&rsquo;s <em>own</em> factors, wherever they ' +
            'are. Honda&rsquo;s Ohio plant is in GDP but not GNP; Jeff&rsquo;s teaching in ' +
            'Switzerland is in GNP but not GDP.',
    panels:1, aspect:0.62, aspectStacked:0.95, steps:steps,
    initState:function(){ return {t:0}; },
    setStep:function(st,i){ st.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:function(st,t){ st.t = clamp(t,0,1); },

    draw:function(canvas, state, mode){
      var S = begin(canvas, mode); if(!S) return;
      var ctx=S.ctx, T=S.T, fs=S.fs, dpr=S.dpr;
      var d = derive(state);
      var C = valueFrame(ctx, S.box, {
        ymin:0, ymax:50, yticks:[0,10,20,30,40,50],
        tickText:function(v){ return '$' + v + 'm'; },
        ylabel:'Millions of dollars', cats:['GDP','GNP'], headLines:2
      }, T, fs, dpr);

      var gdpCol = C.col(0,2), gnpCol = C.col(1,2);
      var gdpAt = 0, gnpAt = 0, i, it, col;
      for(i=0;i<Math.min(d.shown, items.length);i++){
        it = items[i];
        if(it.gdp){
          bar(ctx, C, gdpCol, gdpAt, gdpAt+it.amount, T[COLORS[i]]);
          barValue(ctx, C, gdpCol, gdpAt, gdpAt+it.amount, it.who, T, fs, dpr, true);
          gdpAt += it.amount;
        }
        if(it.gnp){
          bar(ctx, C, gnpCol, gnpAt, gnpAt+it.amount, T[COLORS[i]]);
          barValue(ctx, C, gnpCol, gnpAt, gnpAt+it.amount, it.who, T, fs, dpr, true);
          gnpAt += it.amount;
        }
      }

      /* running totals over each column */
      ctx.save();
      ctx.fillStyle = T.ink; ctx.font = fnt(T,fs,dpr,'annot','700');
      ctx.textAlign='center'; ctx.textBaseline='bottom';
      if(gdpAt > 0) ctx.fillText(money(gdpAt,1)+'m', gdpCol.cx, C.Y(gdpAt) - 8*fs*dpr);
      if(gnpAt > 0) ctx.fillText(money(gnpAt,1)+'m', gnpCol.cx, C.Y(gnpAt) - 8*fs*dpr);
      ctx.restore();

      /* the identity, once every activity is on the board */
      if(d.done){
        headNote(ctx, C, 'GNP = GDP + factor payments from abroad − factor payments to abroad',
                 T.ink, T, fs, dpr, 0);
        headNote(ctx, C, '$41.5m + $1m − $16.5m = $26m', T.ink, T, fs, dpr, 1);
      }

      /* the current activity, spelled out */
      if(d.shown > 0 && d.shown <= items.length){
        it = items[d.shown-1];
        headNote(ctx, C, it.who + ': ' + it.what, T[COLORS[d.shown-1]], T, fs, dpr, 0);
        headNote(ctx, C, money(it.amount,1) + 'm  ·  ' +
                 (it.gdp ? 'in GDP' : 'not in GDP') + ', ' +
                 (it.gnp ? 'in GNP' : 'not in GNP'),
                 T[COLORS[d.shown-1]], T, fs, dpr, 1);
      }
    },

    describe:function(state){
      var d = derive(state), it;
      if(d.shown === 0) return 'Two empty columns, one for GDP and one for GNP, ready to ' +
        'be filled by four pieces of economic activity.';
      if(d.done) return 'All four activities are counted. GDP totals $41.5 million: Ford ' +
        '$25 million, Honda $15 million and David $1.5 million, all produced inside the ' +
        'United States. GNP totals $26 million: Ford $25 million and Jeff $1 million, both ' +
        'produced by American factors. The two differ because Honda and David are foreign ' +
        'factors working inside the country, while Jeff is an American factor working ' +
        'outside it.';
      it = items[d.shown-1];
      return it.who + ': ' + it.what + ', worth ' + money(it.amount,1) + ' million. It ' +
        (it.gdp ? 'counts in GDP because the production happened inside the country'
                : 'does not count in GDP because the production happened abroad') + ', and it ' +
        (it.gnp ? 'counts in GNP because the factor of production is American'
                : 'does not count in GNP because the factor of production is foreign') +
        '. Running totals: GDP ' + money(d.gdp,1) + ' million, GNP ' + money(d.gnp,1) + ' million.';
    },
    ariaLabel:function(state){
      var d = derive(state);
      return 'What lands in GDP and what lands in GNP. Running totals: GDP ' +
             money(d.gdp,1) + ' million, GNP ' + money(d.gnp,1) + ' million.';
    }
  };
})();

/* ══ FIGURE 2: nominal versus real GDP ═════════════════════════════════════ */

var figRealNominal = (function(){
  var y24 = D.years[0], y25 = D.years[1];
  var vals = [
    { label:'Nominal 2024', apples:y24.apples.q*y24.apples.p,  bmws:y24.bmws.q*y24.bmws.p },
    { label:'Real 2024',    apples:y24.apples.q*D.base.apples, bmws:y24.bmws.q*D.base.bmws },
    { label:'Nominal 2025', apples:y25.apples.q*y25.apples.p,  bmws:y25.bmws.q*y25.bmws.p },
    { label:'Real 2025',    apples:y25.apples.q*D.base.apples, bmws:y25.bmws.q*D.base.bmws }
  ];
  var steps = [
    { name:'y2024',  t:0,    label:'2024 — the base year' },
    { name:'nom25',  t:1/3,  label:'Nominal 2025' },
    { name:'real25', t:2/3,  label:'Real 2025' },
    { name:'growth', t:1,    label:'Growth rates' }
  ];
  var gN = (ngdp(y25)-ngdp(y24))/ngdp(y24)*100;
  var gR = (rgdp(y25)-rgdp(y24))/rgdp(y24)*100;

  function derive(state){
    var i = clamp(Math.round(clamp(state.t,0,1)*3), 0, 3);
    return { i:i, shown: i === 0 ? 2 : (i === 1 ? 3 : 4), growth: i === 3 };
  }

  return {
    id:'fig-3-2-real-nominal',
    title:'Nominal and real GDP, two goods over two years',
    caption:'Quantities and prices both rise between 2024 and 2025. Nominal GDP uses each ' +
            'year&rsquo;s own prices and grows 66.9%; real GDP uses 2024 prices throughout and ' +
            'grows 33.1%. The gap between them is inflation, not production.',
    panels:1, aspect:0.62, aspectStacked:0.95, steps:steps,
    initState:function(){ return {t:0}; },
    setStep:function(st,i){ st.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:function(st,t){ st.t = clamp(t,0,1); },

    draw:function(canvas, state, mode){
      var S = begin(canvas, mode); if(!S) return;
      var ctx=S.ctx, T=S.T, fs=S.fs, dpr=S.dpr;
      var d = derive(state);
      var C = valueFrame(ctx, S.box, {
        ymin:0, ymax:120000, yticks:[0,20000,40000,60000,80000,100000,120000],
        tickText:function(v){ return v === 0 ? '$0' : ('$'+(v/1000)+'k'); },
        ylabel:'Total value of production',
        cats:vals.map(function(v){ return v.label; }), headLines:2
      }, T, fs, dpr);

      var i, c, v;
      for(i=0;i<vals.length;i++){
        if(i >= d.shown) continue;
        c = C.col(i, vals.length); v = vals[i];
        bar(ctx, C, c, 0, v.apples, T.green);
        bar(ctx, C, c, v.apples, v.apples+v.bmws, T.blue);
        ctx.save();
        ctx.fillStyle = T.ink; ctx.font = fnt(T,fs,dpr,'annot','700');
        ctx.textAlign='center'; ctx.textBaseline='bottom';
        ctx.fillText(money(v.apples+v.bmws,0), c.cx, C.Y(v.apples+v.bmws) - 8*fs*dpr);
        ctx.restore();
      }

      legendRow(ctx, [{label:'Apples', color:T.green},
                      {label:'Orange BMWs', color:T.blue}],
                T, fs, dpr, C.px, C.px + C.pw, C.headY + T.font.legend*fs*dpr*0.9);

      if(d.growth){
        headNote(ctx, C, 'Nominal GDP grew ' + pct(gN) + '   ·   Real GDP grew ' + pct(gR),
                 T.ink, T, fs, dpr, 1);
      }
    },

    describe:function(state){
      var d = derive(state);
      if(d.i === 0) return 'In 2024, the base year, nominal and real GDP are identical at ' +
        '$61,000: 500 apples at $2 is $1,000, and 3 Orange BMWs at $20,000 is $60,000. They ' +
        'agree because both use 2024 prices.';
      if(d.i === 1) return 'Nominal GDP for 2025 is $101,800: 600 apples at the 2025 price ' +
        'of $3 is $1,800, and 4 BMWs at the 2025 price of $25,000 is $100,000. Both ' +
        'quantities and prices went up, and this bar cannot tell them apart.';
      if(d.i === 2) return 'Real GDP for 2025 is $81,200: the same 600 apples and 4 BMWs, ' +
        'but valued at 2024 prices — $2 and $20,000. Only the quantities changed, so this ' +
        'bar measures production alone.';
      return 'Nominal GDP grew 66.9% while real GDP grew 33.1%. Production really did rise, ' +
        'but roughly half of the nominal increase was prices rising rather than more goods ' +
        'being made. This is why economic growth always means the growth rate of real GDP.';
    },
    ariaLabel:function(state){
      var d = derive(state);
      return 'Nominal and real GDP over two years. ' +
        (d.growth ? 'Nominal grew 66.9 percent, real grew 33.1 percent.'
                  : (d.shown + ' of 4 bars shown.'));
    }
  };
})();

/* ══ FIGURE 3: value added adds up to the final sale price ═════════════════ */

var figValueAdded = (function(){
  var st = D.stages;
  var COLORS = ['blue','green','gold','red'];
  var steps = [{ name:'start', t:0, label:'Start' }];
  st.forEach(function(s,i){
    steps.push({ name:'stage-'+i, t:(i+1)/(st.length+1), label:s.name });
  });
  steps.push({ name:'compare', t:1, label:'Both routes agree' });

  function derive(state){
    var f = clamp(state.t,0,1)*(st.length+1);
    var shown = clamp(Math.round(f), 0, st.length+1);
    var total = 0, i;
    for(i=0;i<Math.min(shown, st.length);i++) total += st[i].added;
    return { shown:shown, total:total, done: shown > st.length };
  }

  return {
    id:'fig-3-3-value-added',
    title:'Value added at each stage adds up to the final sale price',
    caption:'A gallon of gas passes through four stages. Adding the value added at each ' +
            'stage gives $4.00 — exactly the price of the final sale. Counting the sale at ' +
            'every stage instead would give $13.85 and count the same oil four times.',
    panels:1, aspect:0.60, aspectStacked:0.95, steps:steps,
    initState:function(){ return {t:0}; },
    setStep:function(st2,i){ st2.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:function(st2,t){ st2.t = clamp(t,0,1); },

    draw:function(canvas, state, mode){
      var S = begin(canvas, mode); if(!S) return;
      var ctx=S.ctx, T=S.T, fs=S.fs, dpr=S.dpr;
      var d = derive(state);
      var C = valueFrame(ctx, S.box, {
        /* headroom above the $4.00 bars so the legend row and the column
           totals are not fighting for the same strip */
        ymin:0, ymax:5.2, yticks:[0,0.5,1,1.5,2,2.5,3,3.5,4,4.5,5],
        tickText:function(v){ return money(v,2); },
        ylabel:'Dollars per gallon',
        cats:['Value added, stage by stage','Price of the final sale'], headLines:1
      }, T, fs, dpr);

      var left = C.col(0,2), right = C.col(1,2);
      var at = 0, i;
      for(i=0;i<Math.min(d.shown, st.length);i++){
        bar(ctx, C, left, at, at+st[i].added, T[COLORS[i]]);
        /* the value only — the stage names go in the legend, because the
           thin slices cannot hold a name and a number side by side */
        barValue(ctx, C, left, at, at+st[i].added, money(st[i].added,2),
                 T, fs, dpr, true);
        at += st[i].added;
      }

      ctx.save();
      ctx.fillStyle = T.ink; ctx.font = fnt(T,fs,dpr,'annot','700');
      ctx.textAlign='center'; ctx.textBaseline='bottom';
      if(at > 0) ctx.fillText(money(at,2), left.cx, C.Y(at) - 8*fs*dpr);
      ctx.restore();

      legendRow(ctx, st.slice(0, Math.min(d.shown, st.length)).map(function(x,j){
        return { label:x.name, color:T[COLORS[j]] };
      }), T, fs, dpr, C.px, C.px + C.pw, C.headY + C.headH/2);

      if(d.done){
        bar(ctx, C, right, 0, 4.00, T.muted);
        barValue(ctx, C, right, 0, 4.00, 'Final sale', T, fs, dpr, true);
        ctx.save();
        ctx.fillStyle = T.ink; ctx.font = fnt(T,fs,dpr,'annot','700');
        ctx.textAlign='center'; ctx.textBaseline='bottom';
        ctx.fillText(money(4,2), right.cx, C.Y(4) - 8*fs*dpr);
        ctx.restore();
        /* the line that makes the point */
        polylinePx(ctx, C.px, C.Y(4), C.px + C.pw, C.Y(4), T.green, T.lw.guide*dpr,
                   [7*dpr,5*dpr]);
      }
    },

    describe:function(state){
      var d = derive(state);
      if(d.shown === 0) return 'An empty chart ready to build up the value added at each ' +
        'of the four stages that turn crude oil into a gallon of gas at the pump.';
      if(d.done) return 'The four stages add $3.00, $0.25, $0.35 and $0.40 of value, which ' +
        'sum to $4.00. The bar beside it is the price of the final retail sale, also $4.00. ' +
        'The two routes to GDP agree, which is why counting value added and counting final ' +
        'sales give the same answer, and why adding up the sale at every stage would ' +
        'double-count.';
      var s = st[d.shown-1];
      return s.name + ' sells for ' + money(s.sale,2) + ' and adds ' + money(s.added,2) +
        ' of value — the difference between what it sells for and what it paid for the ' +
        'goods coming in. Running total of value added: ' + money(d.total,2) + '.';
    },
    ariaLabel:function(state){
      var d = derive(state);
      return 'Value added by stage. Running total ' + money(d.total,2) +
             (d.done ? ', equal to the $4.00 final sale price.' : '.');
    }
  };
})();

/* A straight line in device pixels — the bar figures work in mixed units. */
function polylinePx(ctx, x0, y0, x1, y1, color, lw, dash){
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  if(dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
  ctx.restore();
}

/* ══ FIGURE 5: the circular flow diagram ═══════════════════════════════════
   The source draws this with thirteen labelled arrows at once, which is
   unreadable on a projector. Here the same thirteen arrows arrive in four
   groups — purchases, factor payments, taxes, saving — and the legend names
   each group as it appears, so no arrow needs its own caption.
   ════════════════════════════════════════════════════════════════════════ */

var figCircularFlow = (function(){

  var BOX = {
    world:   { cx:0.50, cy:0.09, w:0.34, h:0.115, label:'Rest of the World' },
    finance: { cx:0.50, cy:0.38, w:0.34, h:0.115, label:'Financial Markets' },
    firms:   { cx:0.15, cy:0.64, w:0.28, h:0.115, label:'Firms' },
    gov:     { cx:0.50, cy:0.89, w:0.28, h:0.115, label:'Government' },
    house:   { cx:0.85, cy:0.64, w:0.28, h:0.115, label:'Households' }
  };

  /* g: which group the arrow belongs to. Bows are tuned so that the four
     groups run in their own lanes instead of on top of one another. */
  var FLOW = [
    /* 0 — purchases of goods and services */
    { g:0, a:'house',   aa:'tl', b:'firms',   ba:'tr', bow:-0.13 },
    { g:0, a:'gov',     aa:'tl', b:'firms',   ba:'br', bow:-0.05 },
    { g:0, a:'world',   aa:'bl', b:'firms',   ba:'tl', bow:-0.13 },
    { g:0, a:'house',   aa:'tr', b:'world',   ba:'br', bow:-0.13 },
    /* 1 — wages, rents, profits, interest */
    { g:1, a:'firms',   aa:'br', b:'house',   ba:'bl', bow:-0.16 },
    { g:1, a:'gov',     aa:'r',  b:'house',   ba:'b',  bow:-0.05 },
    { g:1, a:'firms',   aa:'tr', b:'world',   ba:'bl', bow: 0.02 },
    { g:1, a:'world',   aa:'br', b:'house',   ba:'tl', bow: 0.02 },
    /* 2 — taxes */
    { g:2, a:'house',   aa:'b',  b:'gov',     ba:'tr', bow: 0.06 },
    { g:2, a:'firms',   aa:'b',  b:'gov',     ba:'tl', bow:-0.06 },
    /* 3 — saving */
    { g:3, a:'firms',   aa:'t',  b:'finance', ba:'bl', bow: 0.03 },
    { g:3, a:'house',   aa:'t',  b:'finance', ba:'br', bow:-0.03 },
    { g:3, a:'gov',     aa:'tl', b:'finance', ba:'b',  bow: 0.10 }
  ];

  var GROUPS = [
    { key:'blue',  name:'Purchases of goods and services' },
    { key:'green', name:'Wages, rents, profits, interest' },
    { key:'red',   name:'Taxes' },
    { key:'gold',  name:'Saving' }
  ];

  var steps = [{ name:'actors', t:0, label:'The five actors' }];
  GROUPS.forEach(function(g,i){
    steps.push({ name:'group-'+i, t:(i+1)/GROUPS.length, label:g.name });
  });

  function derive(state){
    return { shown: clamp(Math.round(clamp(state.t,0,1)*GROUPS.length), 0, GROUPS.length) };
  }

  /* a point on a box edge, in normalized figure coordinates */
  function anchor(b, code){
    var hx = b.w/2, hy = b.h/2;
    var map = {
      l:[-hx,0], r:[hx,0], t:[0,-hy], b:[0,hy],
      tl:[-hx,-hy], tr:[hx,-hy], bl:[-hx,hy], br:[hx,hy]
    };
    var d = map[code] || [0,0];
    return { x:b.cx + d[0]*0.92, y:b.cy + d[1]*0.92 };
  }

  return {
    id:'fig-3-5-circular-flow',
    title:'The circular flow diagram',
    caption:'Every arrow that buys something is matched by an arrow that pays someone. ' +
            'That is why total expenditure, total income and total production all measure ' +
            'the same thing — and why GDP can be calculated three different ways.',
    panels:1, aspect:0.72, aspectStacked:1.05, steps:steps,
    initState:function(){ return {t:0}; },
    setStep:function(st,i){ st.t = steps[clamp(i,0,steps.length-1)].t; },
    scrub:function(st,t){ st.t = clamp(t,0,1); },

    draw:function(canvas, state, mode){
      var S = begin(canvas, mode); if(!S) return;
      var ctx=S.ctx, T=S.T, fs=S.fs, dpr=S.dpr, box=S.box;
      var d = derive(state);

      var pad = 10*fs*dpr;
      /* The legend gets its own band above the diagram — always four rows
         tall, so the boxes do not jump as groups are revealed. */
      var legendH = T.font.legend*fs*dpr*1.6*GROUPS.length + pad;
      var X = function(u){ return box.x + pad + u*(box.w - pad*2); };
      var Y = function(v){ return box.y + pad + legendH + v*(box.h - pad*2 - legendH); };

      /* arrows first, so the boxes sit on top of their ends */
      var i, f, A, B, cx, cy, dx, dy, len, alpha;
      for(i=0;i<FLOW.length;i++){
        f = FLOW[i];
        if(f.g >= d.shown) continue;
        alpha = (f.g === d.shown-1) ? 1 : 0.45;
        A = anchor(BOX[f.a], f.aa); B = anchor(BOX[f.b], f.ba);
        dx = X(B.x)-X(A.x); dy = Y(B.y)-Y(A.y); len = Math.sqrt(dx*dx+dy*dy) || 1;
        /* control point pushed perpendicular to the chord */
        cx = (X(A.x)+X(B.x))/2 + (-dy/len)*f.bow*len;
        cy = (Y(A.y)+Y(B.y))/2 + ( dx/len)*f.bow*len;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = T[GROUPS[f.g].key];
        ctx.lineWidth = T.lw.series*dpr*0.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(X(A.x), Y(A.y));
        ctx.quadraticCurveTo(cx, cy, X(B.x), Y(B.y));
        ctx.stroke();
        /* arrowhead, aimed along the tangent at the far end */
        var tx = X(B.x)-cx, ty = Y(B.y)-cy, tl = Math.sqrt(tx*tx+ty*ty) || 1;
        var hs = Math.max(11, T.lw.series*dpr*4.6);
        ctx.fillStyle = T[GROUPS[f.g].key];
        ctx.translate(X(B.x), Y(B.y));
        ctx.rotate(Math.atan2(ty/tl, tx/tl));
        ctx.beginPath();
        ctx.moveTo(0,0); ctx.lineTo(-hs*1.6, -hs*0.7); ctx.lineTo(-hs*1.6, hs*0.7);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }

      /* the actors */
      var k, b;
      for(k in BOX){
        if(!BOX.hasOwnProperty(k)) continue;
        b = BOX[k];
        var x0 = X(b.cx-b.w/2), y0 = Y(b.cy-b.h/2);
        var w = X(b.cx+b.w/2)-x0, h = Y(b.cy+b.h/2)-y0;
        ctx.save();
        ctx.fillStyle = T.bg;
        ctx.strokeStyle = T.ink2;
        ctx.lineWidth = T.lw.axis*dpr*1.4;
        roundRect(ctx, x0, y0, w, h, 8*fs*dpr);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = T.ink;
        ctx.font = fnt(T,fs,dpr,'annot','700');
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(b.label, x0+w/2, y0+h/2, w - 10*fs*dpr);
        ctx.restore();
      }

      /* legend, built up one group at a time */
      var shownGroups = [];
      for(i=0;i<d.shown;i++) shownGroups.push({ label:GROUPS[i].name, color:T[GROUPS[i].key] });
      if(shownGroups.length){
        legendAt(ctx, shownGroups, T, fs, dpr, box.x + pad, box.y + pad*0.3, 'left');
      }
    },

    describe:function(state){
      var d = derive(state);
      if(d.shown === 0) return 'Five boxes: Rest of the World at the top, Financial ' +
        'Markets below it, and along the bottom row Firms on the left, Government in the ' +
        'middle and Households on the right. No flows drawn yet.';
      var parts = [
        'Four blue arrows show purchases of goods and services: households and government ' +
        'buy from firms, households buy from the rest of the world, and the rest of the ' +
        'world buys from firms.',
        'Four green arrows show factor payments — wages, rents, profits and interest — ' +
        'flowing from firms and government to households, and between firms, households ' +
        'and the rest of the world.',
        'Two red arrows show taxes flowing from households and from firms to the government.',
        'Three gold arrows show saving flowing from firms, households and government into ' +
        'the financial markets.'
      ];
      return parts.slice(0, d.shown).join(' ') +
        (d.shown === 4 ? ' Every purchase arrow is matched by a payment arrow going the ' +
          'other way, which is why expenditure, income and production all add up to the ' +
          'same total.' : '');
    },
    ariaLabel:function(state){
      var d = derive(state);
      return 'The circular flow diagram. ' + d.shown + ' of 4 flow groups shown' +
             (d.shown ? ': ' + GROUPS.slice(0,d.shown).map(function(g){return g.name;}).join(', ') + '.' : '.');
    }
  };
})();

function roundRect(ctx, x, y, w, h, r){
  r = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
}

/* ══ THE FIVE FIGURES ═════════════════════════════════════════════════════ */

var figures = {
  'fig-3-1-gdp-gnp':        figGdpGnp,
  'fig-3-2-real-nominal':   figRealNominal,
  'fig-3-3-value-added':    figValueAdded,
  'fig-3-5-circular-flow':  figCircularFlow
};

var ORDER = ['fig-3-1-gdp-gnp','fig-3-2-real-nominal','fig-3-3-value-added',
             'fig-3-5-circular-flow'];

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
global.EconFigures['unit-03'] = {
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
