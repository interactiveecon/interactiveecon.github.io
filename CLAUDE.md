# CLAUDE.md — interactiveecon.github.io

This file documents conventions, design tokens, and requirements
for all interactive labs on this site. Read this file before
writing any code. Follow every convention here exactly.

---

## Project Overview

Static GitHub Pages site hosting interactive economics labs.
Labs are self-contained HTML files with embedded CSS and JS.
No build step. No frameworks. Vanilla HTML/CSS/JS only.

Primary lab directory: `/classes/econ104a/labs/`
Assets: `/assets/session.js`, `/assets/discussion-modal.js`,
        `/assets/discussion-pdf.js`

---

## File Structure

Every lab is a single `.html` file containing:
1. `<head>` with fonts, `<style>` block
2. `<body>` with skip link, header, `<main>`, footer
3. Three `<script>` tags at end of body (session, discussion-modal,
   discussion-pdf), followed by one inline `<script>` with all JS

---

## Design Tokens

Use these CSS custom properties in every lab. Do not deviate.

```css
:root {
  --font-sans:"Inter",ui-sans-serif,system-ui,-apple-system,sans-serif;
  --font-serif:"Source Serif 4",ui-serif,Georgia,serif;
  --paper:#f6f2ea;
  --panel:#ffffff;
  --ink:#1f2937;
  --ink-2:#374151;
  --muted:#596878;       /* 5.85:1 on white — WCAG AA ✓ */
  --line:#e7dfd2;
  --line-2:#d9cfbf;
  --accent:#2f5d7c;      /* 6.4:1  on white — WCAG AA ✓ */
  --good:#155c38;        /* 7.7:1  on white — WCAG AA ✓ */
  --bad:#b42318;         /* 6.2:1  on white — WCAG AA ✓ */
  --shadow:0 1px 2px rgba(17,24,39,.06),
           0 10px 24px rgba(17,24,39,.06);
}
```

**Do not use lighter versions of these colors for text.**
The values above are the minimum-darkness verified to pass
WCAG 2.1 AA contrast on both `--paper` and `--panel` backgrounds.

Additional accessible text colors (not in token set but verified):
- SR/amber text:   `#8c4800`  (6.3:1 on white)
- Button borders:  `#8c7f72`  (3.5:1 on white — non-text contrast)

---

## Required CSS Block

Include this verbatim in the `<style>` block of every lab:

```css
/* ── Skip link (WCAG 2.4.1) ─────────────────────────────── */
.skip-link{position:absolute;top:-100%;left:0;padding:8px 16px;
  background:var(--accent);color:#fff;font-weight:700;
  text-decoration:none;border-radius:0 0 8px 0;z-index:999;}
.skip-link:focus{top:0;}

/* ── Visually hidden / AT-readable (WCAG 1.1.1) ─────────── */
.sr-only{position:absolute;width:1px;height:1px;padding:0;
  margin:-1px;overflow:hidden;clip:rect(0,0,0,0);
  white-space:nowrap;border:0;}

/* ── Focus indicator (WCAG 2.4.7) ───────────────────────── */
:focus-visible{outline:3px solid var(--accent);outline-offset:2px;}
button:focus-visible{border-radius:10px;}

/* ── Reduced motion (WCAG 2.3.3 / good practice) ────────── */
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{
    animation-duration:.01ms!important;
    transition-duration:.01ms!important;}}
```

---

## Font Sizes — Use rem Only

**Never use `px` for font sizes in CSS.** Use `rem` so text
scales with the user's browser font-size preference (WCAG 1.4.4).

| px  | rem        |
|-----|------------|
| 10  | 0.625rem   |
| 11  | 0.6875rem  |
| 12  | 0.75rem    |
| 13  | 0.8125rem  |
| 14  | 0.875rem   |
| 15  | 0.9375rem  |
| 16  | 1rem       |
| 18  | 1.125rem   |
| 24  | 1.5rem     |
| 32  | 2rem       |

---

## HTML Page Structure

Every lab must follow this structure exactly:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>[Lab Title] — ECON [Course]</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap" rel="stylesheet">
  <style>
    /* tokens + required CSS block + lab-specific styles */
  </style>
</head>
<body>

<!-- FIRST element in body — skip link (WCAG 2.4.1) -->
<a class="skip-link" href="#main-content">Skip to main content</a>

<header class="page-header">
  <div class="container">
    <nav class="crumbbar" aria-label="Breadcrumb">
      <a class="crumb-link" href="/classes/econ[N]/">← ECON [N]</a>
    </nav>
    <div class="header-inner">
      <div class="kicker">ECON [N] — [Topic]</div>
      <h1>[Lab Title]</h1>
      <p class="sub">[One-sentence description.]</p>
    </div>
  </div>
</header>

<main id="main-content" class="lab-wrap">
  <!-- lab content -->
</main>

<footer>
  <div class="lab-wrap">
    <div class="footer-inner">
      <span>ECON [N] — [Course Name]</span>
      <span>interactiveecon.github.io</span>
    </div>
  </div>
</footer>

<script src="/assets/session.js"></script>
<script src="/assets/discussion-modal.js"></script>
<script src="/assets/discussion-pdf.js"></script>
<script>
(function(){
'use strict';
/* lab JS */
})();
</script>
</body>
</html>
```

---

## Canvas Labs — Conventions

### HiDPI setup

```js
function setupCanvas(canvas, wrap){
  const dpr = window.devicePixelRatio || 1;
  const rect = wrap.getBoundingClientRect();
  const W = Math.round(rect.width * dpr);
  const H = Math.round(rect.height * dpr);
  if(!W || !H) return null;
  if(canvas.width !== W || canvas.height !== H){
    canvas.width = W; canvas.height = H;
  }
  return { ctx: canvas.getContext('2d'), dpr, W, H };
}
```

### Padding and coordinate system

```js
const PAD = { l:52, r:16, t:16, b:48 }; // CSS px

function makeCoords(W, H, dpr, xMax, yMax){
  const p = { l:PAD.l*dpr, r:PAD.r*dpr, t:PAD.t*dpr, b:PAD.b*dpr };
  const PW = W - p.l - p.r, PH = H - p.t - p.b;
  return {
    xC: x => p.l + (x / xMax) * PW,
    yC: y => H - p.b - (y / yMax) * PH,
    p, PW, PH
  };
}
```

### Clipping — always clip curve/line draws to plot area

```js
ctx.save();
ctx.beginPath();
ctx.rect(p.l, p.t, W - p.l - p.r, H - p.t - p.b);
ctx.clip();
// ... draw ...
ctx.restore();
```

### Axis helpers

```js
function tickStep(mx){
  if(mx<=10) return 1; if(mx<=20) return 2; if(mx<=50) return 5;
  if(mx<=100) return 10; if(mx<=200) return 20; if(mx<=500) return 50;
  return 100;
}
function snapUp(raw){
  const s=[5,8,10,12,15,20,25,30,40,50,60,80,100,120,
           150,200,250,300,400,500,600,800,1000];
  return s.find(v => v >= raw) || Math.ceil(raw/100)*100;
}
```

### Font scaling — canvas text must respect user font preference

Canvas font calls cannot use `rem`. Instead, multiply all font
pixel sizes by a scale factor derived from the root element's
computed font size. This satisfies WCAG 1.4.4 for canvas text.

```js
// Module-level variable — recomputed at the start of every redraw
let _fs = 1;

function redraw(){
  _fs = Math.max(0.75, Math.min(2.5,
    parseFloat(getComputedStyle(document.documentElement).fontSize) / 16));
  // ... all draw calls ...
}

// In every canvas ctx.font assignment, replace:
//   ${N * dpr}px
// with:
//   ${Math.round(N * dpr * _fs)}px
//
// Example:
//   ctx.font = `700 ${Math.round(11 * dpr * _fs)}px "Inter",sans-serif`;
```

### Canvases HTML — required ARIA attributes

Each canvas must have a visible heading with an `id`, a
`role="img"` with `aria-labelledby` pointing to that heading,
and `aria-describedby` pointing to a `.sr-only` paragraph
that is updated dynamically.

```html
<div class="graph-title" id="myGraphTitle">Graph Title</div>
<canvas id="myCanvas"
        role="img"
        aria-labelledby="myGraphTitle"
        aria-describedby="myGraphDesc"
        style="aspect-ratio:1/1;"></canvas>
```

The description element must live in a live region so updates
are announced by screen readers without requiring focus:

```html
<!-- Place once, below the canvas row -->
<section class="sr-only" id="graphsDesc"
         aria-live="polite" aria-atomic="true">
  <p id="myGraphDesc">Initial description.</p>
  <!-- add one <p> per canvas -->
</section>
```

Update descriptions in JS inside `redraw()`:

```js
const $myGraphDesc = document.getElementById('myGraphDesc');

function updateGraphDesc(){
  // Generate plain-language equivalent of what the canvas shows.
  // Cover: what curves/lines appear, where they intersect,
  // key values (price, quantity, profit), and what it means.
  $myGraphDesc.textContent = `[Full description of current state]`;
}

function redraw(){
  _fs = Math.max(0.75, Math.min(2.5,
    parseFloat(getComputedStyle(document.documentElement).fontSize) / 16));
  drawCanvas();
  updateGraphDesc(); // always call this
}
```

---

## Interactive Controls — Required ARIA Patterns

### Toggle / selector button groups

```html
<div class="shock-group" role="group" aria-label="Select an option">
  <button class="option-btn" aria-pressed="false">Option A</button>
  <button class="option-btn" aria-pressed="false">Option B</button>
</div>
```

Keep `aria-pressed` in sync via JS:

```js
const ALL_BTNS = [/* button refs */];

function selectOption(key){
  ALL_BTNS.forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
  });
  const chosen = map[key];
  chosen.classList.add('active');
  chosen.setAttribute('aria-pressed', 'true');
}

function reset(){
  ALL_BTNS.forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
  });
}
```

### Dynamic status / phase text

Wrap any region that updates dynamically in an `aria-live`
container so screen readers announce changes without requiring
the user to move focus:

```html
<div id="phaseStrip" aria-live="polite" aria-atomic="true">
  <!-- updated by JS -->
</div>
```

---

## Session Tracking

Every lab must integrate with the session system:

```js
const LAB_ID    = 'unique-lab-id';   // kebab-case, matches filename
const LAB_LABEL = 'Human-Readable Lab Name';

let _rng = null;
function rng(){ return _rng ? _rng() : Math.random(); }
function pick(arr){ return arr[Math.floor(rng() * arr.length)]; }

// In generateParams():
if(window.Session && Session.rngForLab) _rng = Session.rngForLab(LAB_ID);

// When the user answers a question (Phase 1 advance):
if(window.Session && Session.recordQuestion)
  Session.recordQuestion(LAB_ID, qIndex, prompt, correctAnswer,
                         isCorrect, userAnswer, true);

// When the lab is complete (Phase 2 reached):
if(window.Session && Session.recordLabDone)
  Session.recordLabDone(LAB_ID, LAB_LABEL, score, maxScore, 1);
```

---

## Accessibility — WCAG 2.1 Level AA

All labs must comply with WCAG 2.1 Level AA (required by the
ADA Title II rule for public universities). The patterns above
(skip link, sr-only, focus-visible, canvas ARIA, live regions,
rem fonts, _fs scaling) are the concrete implementation of this
requirement. The section below summarises what each pattern
satisfies and provides the pre-completion checklist.

### What each pattern covers

| Pattern | WCAG criterion |
|---|---|
| `<html lang="en">` | 3.1.1 Language of Page (A) |
| Descriptive `<title>` | 2.4.2 Page Titled (A) |
| Skip link → `#main-content` | 2.4.1 Bypass Blocks (A) |
| `<nav aria-label="...">` | 1.3.1 Info and Relationships (A) |
| `role="img"` + `aria-labelledby` on canvas | 4.1.2 Name, Role, Value (A) |
| `.sr-only` descriptions + `aria-live` | 1.1.1 Non-text Content (A) |
| Verified color token values | 1.4.3 Contrast Minimum (AA) |
| `rem` font sizes | 1.4.4 Resize Text (AA) |
| `_fs` canvas font scale | 1.4.4 Resize Text (AA) |
| Button border `#8c7f72` | 1.4.11 Non-text Contrast (AA) |
| `:focus-visible` rule | 2.4.7 Focus Visible (AA) |
| `aria-live` on status regions | 4.1.3 Status Messages (AA) |
| `aria-pressed` on toggle buttons | 4.1.2 Name, Role, Value (A) |
| `role="group"` + `aria-label` on button groups | 1.3.1 Info and Relationships (A) |
| `prefers-reduced-motion` | Good practice (2.3.3 AAA) |
| Color + secondary indicator (symbol/text) | 1.4.1 Use of Color (A) |
| Single-column reflow at ≤700 px | 1.4.10 Reflow (AA) |

### Pre-completion checklist

Run through this before marking any lab as done:

- [ ] `<html lang="en">` present
- [ ] `<title>` is descriptive
- [ ] Skip link is first focusable element in `<body>`
- [ ] `<main id="main-content">` present
- [ ] `<nav>` has `aria-label`
- [ ] All text contrast ratios verified against the token table
      (do not use lighter color values than those listed)
- [ ] All UI component borders ≥3:1 contrast on white
- [ ] All CSS font sizes in `rem`, not `px`
- [ ] `_fs` font-scale pattern present in any canvas lab
- [ ] All `<canvas>` elements have `role="img"` + `aria-labelledby`
      + `aria-describedby`
- [ ] Canvas descriptions update dynamically and live in an
      `aria-live="polite" aria-atomic="true"` section
- [ ] `:focus-visible` rule defined in CSS
- [ ] `aria-pressed` / `aria-expanded` / `aria-selected`
      kept in sync with visual state via JS
- [ ] Dynamic updates announced via `aria-live` or `role="status"`
- [ ] `prefers-reduced-motion` media query present
- [ ] Color-coded states have a secondary non-color indicator
      (text, symbol, border change, or +/− sign)
- [ ] Page tested with keyboard-only navigation (Tab, Shift+Tab,
      Enter, Space) before shipping
- [ ] Disabled components use the `disabled` HTML attribute
      (exempt from contrast requirements)

### Auditing existing labs

To audit and fix an existing lab, start a session with the
following prompt (replace the path):

---

Audit the file at [FILE_PATH] for WCAG 2.1 Level AA compliance —
the standard required by the ADA Title II rule.

Work in three steps:

STEP 1 — READ AND AUDIT
Read the full file. Check every item below and record PASS,
FAIL, or N/A for each.

LEVEL A
  1.1.1  Every canvas/img/non-text element has a programmatic
         text alternative (role="img" + aria-labelledby/describedby,
         or alt="..."). Canvas content that changes dynamically must
         have an equivalent description that updates with it.
  1.3.1  Information conveyed visually is also in DOM structure.
  1.4.1  Color is not the only means of conveying information.
         Every color-coded state has a secondary non-color indicator.
  2.1.1  All functionality is operable by keyboard alone.
  2.4.1  A skip link exists as the first focusable element in
         <body>, pointing to the main landmark.
  2.4.2  <title> is present and descriptive.
  3.1.1  <html lang="..."> is set.
  4.1.2  Every interactive element has an accessible name, role,
         and dynamic state (aria-pressed, aria-expanded,
         aria-selected, disabled) communicated programmatically.

LEVEL AA
  1.4.3  Normal text ≥4.5:1 contrast. Large text (≥18pt or
         ≥14pt bold) ≥3:1. Compute actual ratios for every
         foreground/background color pair used for text.
  1.4.4  CSS font sizes use rem not px. Canvas text multiplies
         by _fs derived from getComputedStyle(document
         .documentElement).fontSize.
  1.4.10 Content reflows at 320px viewport without horizontal
         scrolling.
  1.4.11 UI component boundaries have ≥3:1 contrast against
         adjacent color. Disabled components are exempt.
  2.4.7  A visible :focus-visible indicator is defined in CSS.
  4.1.3  Status messages and dynamic updates are announced via
         aria-live or role="status"/"alert".

STEP 2 — REPORT
List every FAIL with: WCAG criterion number and name, which
element or rule fails, and measured value where applicable
(e.g., contrast ratio).

STEP 3 — FIX EVERYTHING
Implement all fixes using the patterns in CLAUDE.md exactly —
verified colors, required CSS block, HTML patterns, canvas
font scaling. After applying all fixes, confirm each failing
criterion from Step 2 is now resolved.

---

### Important caveats

WCAG compliance cannot be fully certified through code review
alone. Before making a formal compliance claim, also:
1. Run the page through axe-core or WAVE (automated scanner)
2. Test with NVDA + Firefox and VoiceOver + Safari
3. Have a qualified accessibility consultant review it
4. Publish an accessibility statement with a contact for
   accommodation requests

---

## Standard Header / Footer CSS

```css
.page-header{border-bottom:1px solid var(--line);
  background:linear-gradient(180deg,rgba(255,255,255,.75),
  rgba(255,255,255,0));}
.container{max-width:1160px;margin:0 auto;padding:18px;}
.crumbbar{margin:8px 0 10px;}
.crumb-link{color:var(--accent);text-decoration:none;
  font-weight:800;font-size:0.8125rem;}
.crumb-link:hover{text-decoration:underline;}
.header-inner{padding:22px 0 14px;}
.kicker{font-size:0.75rem;letter-spacing:.08em;
  text-transform:uppercase;color:var(--muted);margin-bottom:6px;}
h1{font-family:var(--font-serif);font-size:2rem;
  line-height:1.1;margin:0 0 8px;}
.sub{margin:0;color:var(--ink-2);line-height:1.55;
  max-width:80ch;font-size:0.9375rem;}
.lab-wrap{max-width:1100px;margin:0 auto;padding:18px;}
.footer-inner{display:flex;justify-content:space-between;
  flex-wrap:wrap;gap:8px;font-size:0.75rem;color:var(--muted);
  padding-top:12px;border-top:1px solid var(--line);margin-top:24px;}
.hidden{display:none!important;}
```

---

## Standard Graph Card CSS

```css
.canvas-row{display:grid;grid-template-columns:1fr 1fr;
  gap:14px;margin-bottom:14px;}
@media(max-width:700px){.canvas-row{grid-template-columns:1fr;}}
.graph-card{background:var(--panel);border:1px solid var(--line);
  border-radius:18px;padding:16px;box-shadow:var(--shadow);}
.graph-title{font-size:0.75rem;font-weight:800;color:var(--accent);
  text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;}
.canvas-wrap{position:relative;width:100%;border-radius:10px;
  overflow:hidden;background:rgba(246,242,234,.45);
  border:1px solid var(--line);}
.canvas-wrap canvas{display:block;width:100%;height:100%;}
```

---

## Standard Button CSS

```css
/* Default button border #8c7f72 = 3.53:1 on white (WCAG 1.4.11 ✓) */
.option-btn{padding:8px 14px;border-radius:10px;
  border:1.5px solid #8c7f72;background:var(--panel);
  font-family:var(--font-sans);font-size:0.8125rem;font-weight:700;
  color:var(--ink-2);cursor:pointer;transition:all .12s;}
.option-btn:hover:not(:disabled){border-color:var(--accent);
  background:rgba(47,93,124,.07);color:var(--accent);}
.option-btn:disabled{opacity:.38;cursor:not-allowed;}

.primary-btn{padding:10px 22px;border-radius:12px;border:none;
  background:var(--accent);color:#fff;font-family:var(--font-sans);
  font-size:0.875rem;font-weight:700;cursor:pointer;
  transition:background .12s;white-space:nowrap;}
.primary-btn:hover{background:#264d68;}
.primary-btn:disabled{opacity:.4;cursor:not-allowed;}
```

---

## Resize Handler Pattern

```js
let _resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(redraw, 80);
});
```

Always call `generateParams()` and `redraw()` once at the bottom
of the script (after all function definitions) to initialize.
