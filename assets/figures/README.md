# `/assets/figures/` — shared figure modules

One module per lecture unit. A module is the **single source of truth** for
every dynamic figure in that unit. Two pages consume it:

| Page | Mode | What it is |
|---|---|---|
| `classes/econ002/notes/unit-<NN>/index.html` | `'notes'` | Accessible student notes, WCAG 2.1 AA |
| `classes/econ002/notes/unit-<NN>/deck.html`  | `'stage'` | Projection deck, figures only |

Both are listed from `classes/econ002/notes/index.html` (Accessible Lecture
Notes) and `classes/econ002/slides/index.html` (Dynamic Lecture Slides), which
are linked from the course hub at `classes/econ002/index.html`.

Current modules: `unit-01.js` (Introduction to Economics), `unit-02.js` (Review of
Supply and Demand), `unit-03.js` (Measuring GDP), `unit-04.js` (Unemployment),
`unit-05.js` (Inflation), `unit-06.js` (GDP: Where Does it Come From?),
`unit-07.js` (Equilibrium in the Goods Market), `unit-08.js` (Fiscal Policy), `unit-09.js` (Money),
`unit-10.js` (Aggregate Demand), `unit-11.js` (Aggregate Supply and Aggregate Demand).

Some units also ship pre-rendered images. `unit-03/`, `unit-04/`, `unit-05/`, `unit-07/` and `unit-09/` hold the
FRED charts from those units' sources, converted from PDF with
`gs -sDEVICE=png16m -r150`. They are data plots, not equations, so they cannot
be rebuilt from parameters and are published as `<img>` with written `alt`
text rather than as module figures. A unit's *dynamic* figures still all live
in its module.

---

## The rule

> **A figure is defined exactly once, in its module. Neither HTML file may
> contain figure geometry, equations, data, drawing code, or animation logic.**

If you are editing a number, a curve, a label, a colour, a stroke width or a
draw call inside `index.html` or `deck.html`, stop — it belongs in the module.
Changing it there makes it live in both pages at once, which is the entire
reason the module exists.

The pages stay otherwise self-contained (inline CSS, inline page JS) per the
root `CLAUDE.md`. The shared figure module is the one deliberate exception.

Quick check that the rule still holds:

```bash
grep -nE '0\.35|2600|\(5,100\)|0\.12' classes/econ002/notes/unit-01/*.html
```

Zero hits is a pass.

---

## Loading

Plain script, no modules, no bundler. It registers itself on a global.
**Use a relative path, not `/assets/...`** — an absolute path 404s when a page
is opened straight off disk with `file://`, which leaves every canvas blank
with nothing on screen to say why. From `classes/econ002/notes/unit-NN/` that
is four levels up:

```html
<script src="../../../../assets/figures/unit-01.js"></script>
```

Both pages also show a visible notice if `window.EconFigures` is missing after
that script tag, so a failed load is never silent.

### These pages must be served, not double-clicked

Opening `index.html` or `deck.html` straight off disk gives a `file://` page,
and a `file://` page is not permitted to load a script from a parent folder —
so the module never arrives and every canvas is blank. This is not specific to
the figures: every lab in this repo loads `/assets/session.js` and has the same
constraint, which is why local `file://` testing has bitten this project before
(see the RNG note in the root `CLAUDE.md`).

Run a server from the repository root while working locally:

```bash
cd /Users/jalle005/Documents/GitHub/interactiveecon.github.io
python3 -m http.server 8787
```

then open `http://localhost:8787/classes/econ002/notes/unit-01/deck.html`.
There is already an `sr-production` entry in `.claude/launch.json` that does
exactly this. Published to GitHub Pages, the pages work with no server.

When the module is missing, both pages detect a `file://` page and print this
command with the correct absolute path filled in, rather than a generic error.

```js
window.EconFigures['unit-01'] = {
  THEME, figures, order, layout, createController, indexOfStep,
  DURATION, reducedMotion, _helpers
};
```

The deck loads it in `<head>` so it can read the projection palette out of
`THEME.stage` before first paint; the notes page loads it at the end of body.

---

## Public API

```js
var UNIT = window.EconFigures['unit-01'];

UNIT.figures[id]                 // a figure object, see below
UNIT.order                       // figure ids in the order they appear in the notes
UNIT.layout(fig, cssWidth)       // -> { stacked:boolean, aspect:number }
UNIT.createController(opts)      // -> controller, see below
UNIT.indexOfStep(fig, name)      // -> index into fig.steps, or -1
UNIT.DURATION                    // ms for a full sweep (2600)
UNIT.reducedMotion()             // -> boolean
UNIT.THEME.notes / UNIT.THEME.stage
```

### Figure object

```js
{
  id, title, caption,
  panels,                        // side-by-side plot panels
  aspect, aspectStacked,         // height / width; stacked applies below 560 CSS px
  steps: [{ name, t, label }],   // named animation stops, in order, t in [0,1]
  initState(),                   // -> fresh state object
  setStep(state, i),             // jump to a named stop
  scrub(state, t),               // t in [0,1] across the whole sweep
  draw(canvas, state, mode),     // mode: 'notes' | 'stage' — owns the whole canvas
  describe(state),               // -> plain-language sentence, for the notes page
  ariaLabel(state)               // -> short label, used by BOTH pages
}
```

`draw` does everything itself: HiDPI setup, coordinate mapping, clipping, axes,
curves, annotations. It uses the `setupCanvas` / `makeCoords` / `tickStep` /
`snapUp` / clipping / `_fs` font-scale patterns from the root `CLAUDE.md`.
`_fs` is recomputed at the top of every draw in both modes.

### Controller

Owns `requestAnimationFrame`, the cosine ease, the duration and the
`prefers-reduced-motion` branch — so no animation logic ends up in a page.

```js
var ctrl = UNIT.createController({
  figure: UNIT.figures['fig-1-3-optimum'],
  canvas: document.getElementById('...'),
  mode:   'notes',                       // or 'stage'
  onUpdate: function(ctrl, settled){ /* ... */ }
});

ctrl.play() ctrl.pause() ctrl.toggle() ctrl.replay() ctrl.reset()
ctrl.stepForward()      // false when there is no next step
ctrl.stepBack()
ctrl.setStep(i)  ctrl.setStepNamed('optimum')
ctrl.scrubTo(t)  ctrl.render()  ctrl.destroy()
ctrl.t  ctrl.playing  ctrl.isComplete()  ctrl.stepIndex()  ctrl.stepCount()
ctrl.stepLabel()  ctrl.describe()  ctrl.ariaLabel()
```

`onUpdate(ctrl, settled)` fires on every frame. `settled` is `false` during an
animation and `true` once the figure comes to rest — the notes page uses it so
its `aria-live` description does not fire sixty times a second.

---

## `THEME` — the only thing allowed to differ

`THEME.notes` and `THEME.stage` carry **all** presentation constants. Every
draw call reads its colours, stroke widths, dot radii, font sizes and padding
from `THEME[mode]`. Nothing else may vary by mode.

May differ per mode:

- font sizes, stroke weights, dot radii, axis padding
- palette (paper-toned for notes, high-contrast projection for stage)
- whether captions and figure-level titles render (that chrome lives in the
  page, outside the canvas)
- the control chrome around the figure — labelled buttons and a slider on the
  notes page, keyboard stepping on the deck

May **not** differ: the data, the equations, the coordinate mapping, the curve
shapes, the position of any marked point, the sequence of animation states, or
the labels attached to plotted objects. Panel titles, series names and
annotation text are attached to plotted objects, so they are identical in both
modes.

### Nothing floats over the data

Legends and live readouts do **not** sit inside the plot. `paintFrame` (and
`valueFrame`) reserve a band above the plot area — ask for it with
`cfg.headLines` — and expose it as `C.headY` / `C.headH`. Draw legends there
with `legendRow(...)` and readouts with `headNote(...)`.

This is not cosmetic. Stage type is roughly 2.5× the size of notes type on the
same plot, so a legend box that looks small in the notes covers a curve on the
projector. Reserving the band makes the collision impossible in both modes
instead of tuning corners figure by figure.

For the same reason, keep labels attached to a data point short — a value, not
a sentence. The sentence belongs in the head band.

One automatic exception: **tick labels that would collide at the current font
size are dropped** (the tick mark stays). On the projector, 28 px type on a
dense tick set collides where 11 px type on the notes page does not, so the
same rule produces a thinner tick set on the deck. This is deliberate — the
deck rule is to drop a label rather than shrink it below the legibility floor.

### Palette contrast

`THEME.notes` uses the `CLAUDE.md` tokens verbatim, all verified WCAG AA on
white and on `--paper`.

Tick labels hold the 28px legibility floor on stage; legends (25) and
annotations (27) sit just under it, because they are chrome rather than data
and at 30px they were crowding out the plot itself.

`THEME.stage` is a **dark-on-light** projection palette on `#FBFAF7`. It is
deliberately not dark mode: light text on a dark ground haloes for readers
with astigmatism, which is common enough in a lecture hall to rule it out. The
ground is a soft off-white rather than pure white to keep projector glare down.
Every ink colour clears **7:1** against it — body ink 15.0:1, ink2 11.1:1,
muted 7.8:1, blue 8.3:1, red 7.9:1, green 7.7:1 — and gridlines clear 3:1
(3.3:1).

If the deck palette is ever revisited, keep the ground light and re-check every
ink against it; the 7:1 floor is what makes the figures survive projector gamma
and ambient light.

Colour is never the only signal in either mode: blue series carry round
markers, red series carry square markers, the optimum carries a distinct shape
plus a text label.

---

## Adding a unit

1. Copy `unit-01.js` to `unit-<NN>.js` and register under
   `window.EconFigures['unit-<NN>']`.
2. Replace the `D` data block with values transcribed from that unit's `.tex`,
   with line references in comments. Do not round or resample — students
   compare the screen against the printed PDF.
3. Reuse `totalMarginalFigure`-style factories wherever two figures share a
   mechanic rather than copying a draw function.
4. Keep `THEME` as-is unless the unit genuinely needs a new colour.
5. Point the new pages at the new module. Nothing else in the pages changes.
