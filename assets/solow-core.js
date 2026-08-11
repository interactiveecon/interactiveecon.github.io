/* ═══════════════════════════════════════════════════════════════════════════
   solow-core.js — shared Solow model mathematics
   ═══════════════════════════════════════════════════════════════════════════

   Pure functions. No DOM, no state, no globals beyond window.SolowCore.
   Used by both:
     /classes/econ105b/labs/solow-diagram/      (diagram explorer)
     /classes/econ105b/labs/solow-steady-state/ (numerical solver)

   Model (Economic Growth, Ch. 8–9 lecture notes, §4.1–§4.2):

     Aggregate production   Y = K^α (AL)^(1−α)
     Per effective worker   ŷ = f(k̂) = k̂^α          k̂ = K/(AL)
     Capital transition     Δk̂ = s·f(k̂) − (δ+n+g)·k̂
     Steady state           k̂* = ( s / (δ+n+g) )^(1/(1−α))
     Golden rule            MPK = δ+n+g  ⟹  s_gr = α

   Every function takes a plain parameter object {alpha, delta, n, g, s} and
   returns a plain object. Degenerate parameter settings never throw and never
   divide by zero — they return { ok:false, reason:'…' } instead.

   PARAMETER CONVENTIONS
     alpha  capital share, must satisfy 0 < α < 1 (diminishing MPK)
     delta  depreciation rate, ≥ 0
     n      labor-force growth rate, ≥ 0
     g      technology growth rate, ≥ 0
     s      savings rate, 0 ≤ s ≤ 1

   Run the self-test by appending ?selftest=1 to any page that loads this file;
   results are printed to the console. See SolowCore.selfTest().
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  /* ── Guards ─────────────────────────────────────────────────────────────
     Two things can make the model degenerate:
       α ∉ (0,1)      — production is linear or worse; no interior steady state
       δ+n+g ≤ 0      — the break-even ray is flat, so s·f(k̂) never catches it
                        and capital per effective worker grows without bound
     Both are checked once, here, so no downstream function ever divides by
     zero or raises a negative number to a fractional power.                */

  function num(v) { return typeof v === 'number' && isFinite(v); }

  function guard(p) {
    if (!p || !num(p.alpha) || !num(p.delta) || !num(p.n) || !num(p.g)) {
      return { ok: false, reason: 'missing-parameter',
               message: 'One or more parameters are missing or not finite.' };
    }
    if (p.alpha <= 0 || p.alpha >= 1) {
      return { ok: false, reason: 'alpha-range',
               message: 'The capital share must satisfy 0 < α < 1. ' +
                        'Outside that range the marginal product of capital ' +
                        'does not diminish, so there is no interior steady state.' };
    }
    const b = p.delta + p.n + p.g;
    if (!(b > 0)) {
      return { ok: false, reason: 'no-break-even', breakEven: b,
               message: 'With δ + n + g = 0 there is no break-even ' +
                        'investment to cover: every unit of saving adds ' +
                        'permanently to capital per effective worker, so k̂ ' +
                        'grows without bound and no steady state exists.' };
    }
    return { ok: true, breakEven: b };
  }

  /* ── Axis helpers (CLAUDE.md canvas conventions) ────────────────────────
     tickStep / snapUp live here rather than in the plot module because
     domain() needs snapUp, and both labs need identical axis arithmetic.

     CLAUDE.md's tickStep assumes an axis maximum between 5 and 500 — it
     returns 1 for anything smaller and 100 for anything larger. Auto-scaling
     breaks both assumptions: δ+n+g = 0.40 puts kMax at 1.2 (where a step of 1
     draws two ticks), and s = 0.9 with δ+n+g = 0.02 and α = 0.6 puts it at
     19,100 (where a step of 100 draws 191). The 5 ≤ mx ≤ 500 branch is
     verbatim CLAUDE.md; outside it a 1–2–5 decade rule targeting ~8 ticks
     takes over, and it agrees with CLAUDE.md at both boundaries.            */

  function tickStep(mx) {
    if (mx >= 5) {
      if (mx <= 10) return 1;
      if (mx <= 20) return 2;
      if (mx <= 50) return 5;
      if (mx <= 100) return 10;
      if (mx <= 200) return 20;
      if (mx <= 500) return 50;
    }
    // 1–2–5 decade rule targeting ~8 ticks across the axis
    const raw = mx / 8;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const mult = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
    return mult * mag;
  }

  function snapUp(raw) {
    const s = [5, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100, 120,
               150, 200, 250, 300, 400, 500, 600, 800, 1000];
    return s.find(v => v >= raw) || Math.ceil(raw / 100) * 100;
  }

  /* Fractional axis maxima (k̂* is often well under 5) need a finer ladder
     than snapUp's, which starts at 5. */
  function snapUpSmall(raw) {
    if (!(raw > 0)) return 1;
    if (raw >= 5) return snapUp(raw);
    const s = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8,
               1, 1.2, 1.5, 2, 2.5, 3, 4, 5];
    return s.find(v => v >= raw) || 5;
  }

  /* ── Production function and its derivative ─────────────────────────── */

  function f(alpha, k) { return k <= 0 ? 0 : Math.pow(k, alpha); }

  // MPK = ∂f/∂k̂ = α·k̂^(α−1). This is the slope the golden-rule tangent shows.
  function mpk(alpha, k) { return k <= 0 ? Infinity : alpha * Math.pow(k, alpha - 1); }

  /* ── Steady state ────────────────────────────────────────────────────────
       s·k̂^α = (δ+n+g)·k̂   ⟹   k̂* = ( s/(δ+n+g) )^(1/(1−α))
     In steady state î* = (δ+n+g)k̂* = s·ŷ*, so ĉ* = (1−s)·ŷ*.               */

  function steadyState(p) {
    const gr = guard(p);
    if (!gr.ok) return Object.assign({ kStar: null, yStar: null, cStar: null,
                                       iStar: null, breakEven: p ? p.delta + p.n + p.g : null }, gr);
    const b = gr.breakEven;
    const s = num(p.s) ? p.s : 0;
    if (!(s > 0)) {
      // Nothing is saved: capital depreciates to nothing. k̂* = 0 is a real
      // (degenerate) steady state, not an error.
      return { ok: true, degenerate: true, reason: 'zero-saving',
               kStar: 0, yStar: 0, cStar: 0, iStar: 0, breakEven: b };
    }
    const kStar = Math.pow(s / b, 1 / (1 - p.alpha));
    const yStar = f(p.alpha, kStar);
    const iStar = s * yStar;              // = b·kStar in steady state
    const cStar = yStar - iStar;          // = (1−s)·yStar
    return { ok: true, kStar, yStar, cStar, iStar, breakEven: b };
  }

  /* ── Golden rule ─────────────────────────────────────────────────────────
       max ĉ* = f(k̂*) − (δ+n+g)k̂*  ⟹  f′(k̂*) = δ+n+g  ⟹  MPK = δ+n+g
     With Cobb-Douglas this solves to s_gr = α exactly, independent of δ, n, g
     (lecture notes §4.2). ĉ_gr = f(k̂_gr) − (δ+n+g)k̂_gr = (1−α)·ŷ_gr — note
     the (1−α), not (1−s): at the golden rule the savings rate *is* α.        */

  function goldenRule(p) {
    const gr = guard(p);
    if (!gr.ok) return Object.assign({ sGr: null, kGr: null, yGr: null, cGr: null }, gr);
    const b = gr.breakEven;
    const kGr = Math.pow(p.alpha / b, 1 / (1 - p.alpha));
    const yGr = f(p.alpha, kGr);
    const cGr = yGr - b * kGr;            // = (1−α)·yGr
    return { ok: true, sGr: p.alpha, kGr, yGr, cGr, breakEven: b };
  }

  /* ── Where the economy sits relative to the golden rule ─────────────────
     Because s_gr = α, comparing s to α is the whole test. 'above' means the
     economy saves more than the golden rule — too much capital, MPK−δ < n+g. */

  function position(p) {
    if (!p || !num(p.alpha) || !num(p.s)) return 'at';
    const d = p.s - p.alpha;
    if (Math.abs(d) < 5e-4) return 'at';
    return d > 0 ? 'above' : 'below';
  }

  /* ── Long-run growth rates (lecture notes §4.3) ─────────────────────────
       %Δŷ* = 0        per effective worker — the diagram stands still
       %Δy  = g        per worker           — technology only
       %ΔY  = n + g    aggregate            — technology plus more workers   */

  function growthRates(p) {
    const n = p && num(p.n) ? p.n : 0;
    const g = p && num(p.g) ? p.g : 0;
    return { yHat: 0, yPerWorker: g, aggregate: n + g };
  }

  /* ── The three curves of the Solow diagram ─────────────────────────────
     Returned as evaluator functions so the plot module can sample them at
     whatever resolution the canvas needs.                                  */

  function curves(p) {
    const a = p.alpha, s = num(p.s) ? p.s : 0, b = p.delta + p.n + p.g;
    return {
      f: k => f(a, k),
      sf: k => s * f(a, k),
      breakEven: k => b * k
    };
  }

  /* ── Transition path ─────────────────────────────────────────────────────
     Discrete time, exactly as the numerical convergence table in §1.3:
       k̂′ = k̂ + s·f(k̂) − (δ+n+g)·k̂
     Stability: dk̂′/dk̂ at k̂* is 1 − (δ+n+g)(1−α), which stays in (0,1) for
     every parameter combination the sliders allow, so the path is monotone —
     it never oscillates across the steady state.

     Each row carries the *flow* variables at that period's k̂, plus dk (the
     change taking k̂ to the next period), so Panel B can label Δk̂ directly.  */

  function path(p) {
    const gr = guard(p);
    if (!gr.ok) return [];
    const b = gr.breakEven, a = p.alpha, s = num(p.s) ? p.s : 0;
    const periods = Math.max(1, Math.round(num(p.periods) ? p.periods : 100));
    let k = num(p.k0) ? Math.max(0, p.k0) : 0;
    const out = [];
    for (let t = 0; t <= periods; t++) {
      const y = f(a, k);
      const i = s * y;
      const c = y - i;
      const dk = i - b * k;
      out.push({ t, k, y, c, i, dk });
      k = Math.max(0, k + dk);
    }
    return out;
  }

  /* ── Golden-rule trade-off curve ────────────────────────────────────────
       ĉ*(s) = (1−s)·( s/(δ+n+g) )^(α/(1−α))
     Peaks at s = α for every δ, n, g — that invariance is the point of the
     panel. The curve is also flat near its peak (ĉ*″ is small there), which
     is why being modestly off the golden rule costs almost nothing.        */

  function consumptionBySavings(p) {
    const gr = guard(p);
    if (!gr.ok) return function () { return NaN; };
    const b = gr.breakEven, a = p.alpha;
    const expo = a / (1 - a);
    return function (s) {
      if (!(s > 0)) return 0;
      if (s >= 1) return 0;
      return (1 - s) * Math.pow(s / b, expo);
    };
  }

  /* ── Notation ────────────────────────────────────────────────────────────
     With g > 0 the model is per *effective* worker and every variable wears a
     hat. With g = 0 technology is constant, effective workers and workers are
     the same thing, and the hats come off — Chapter 8 as a special case of
     Chapter 9. Both labs read their axis and readout labels from here so the
     notation can never drift apart between them.                            */

  function notation(p) {
    const g = p && num(p.g) ? p.g : 0;
    const hat = g > 0;
    return {
      hat,
      k: hat ? 'k̂' : 'k',
      y: hat ? 'ŷ' : 'y',
      c: hat ? 'ĉ' : 'c',
      i: hat ? 'î' : 'i',
      kStar: hat ? 'k̂*' : 'k*',
      yStar: hat ? 'ŷ*' : 'y*',
      unit: hat ? 'effective worker' : 'worker',
      xAxis: hat ? 'Capital per effective worker (k̂)' : 'Capital per worker (k)',
      yAxis: hat ? 'Output per effective worker (ŷ)' : 'Output per worker (y)'
    };
  }

  /* ── Plot domain ─────────────────────────────────────────────────────────
     The single most important departure from the Mathematica original, which
     hardcoded PlotRange → {{0,20},{0,4}} over k ∈ [0,15] and was wrong at
     almost every slider setting (k̂* = 2.57 at its own defaults, sitting in the
     leftmost 13% of the frame).

     Rule:
       kMax = snapUp( 1.4 · max(k̂*, k̂_gr) )
       yMax = snapUp( 1.15 · max( f(kMax), (δ+n+g)·kMax ) )

     1.4 leaves the steady state at roughly 70% of the way across the frame —
     far enough right to read the crossing, with enough room beyond it to show
     that sf(k̂) stays below break-even out there. Both k̂* and k̂_gr are included
     so the golden-rule tangent is never off-frame. 1.15 on the vertical keeps
     the higher of the two curves off the top edge.

     The consequence is that the diagram looks qualitatively identical at every
     parameter setting: same crossing position, same curvature, same gaps. That
     invariance is itself the lesson — the shape of the Solow diagram does not
     depend on the numbers.                                                  */

  function domain(p) {
    const ss = steadyState(p);
    const gg = goldenRule(p);
    if (!ss.ok || !gg.ok) return { ok: false, reason: ss.reason || gg.reason, kMax: 20, yMax: 4 };
    const b = ss.breakEven;
    const anchor = Math.max(ss.kStar, gg.kGr, 1e-6);
    const kMax = snapUpSmall(1.4 * anchor);
    const yMax = snapUpSmall(1.15 * Math.max(f(p.alpha, kMax), b * kMax));
    return { ok: true, kMax, yMax };
  }

  /* ── Development self-test ──────────────────────────────────────────────
     Four independently computed reference rows. Row 3 is the golden-rule case
     s = α, where the steadyState() and goldenRule() code paths must agree
     exactly — the strongest single check that both are right.

     Runs automatically only when ?selftest=1 is in the query string, so it
     costs nothing in normal use.                                            */

  const TEST_ROWS = [
    { p: { alpha: 1 / 3, delta: 0.10, n: 0.03, g: 0.03, s: 0.30 },
      kStar: 2.567, yStar: 1.369, cStar: 0.958, kGr: 3.007, cGr: 0.962 },
    { p: { alpha: 1 / 2, delta: 0.06, n: 0.02, g: 0.02, s: 0.40 },
      kStar: 16.000, yStar: 4.000, cStar: 2.400, kGr: 25.000, cGr: 2.500 },
    { p: { alpha: 1 / 2, delta: 0.06, n: 0.02, g: 0.02, s: 0.50 },
      kStar: 25.000, yStar: 5.000, cStar: 2.500, kGr: 25.000, cGr: 2.500 },
    { p: { alpha: 1 / 3, delta: 0.05, n: 0.02, g: 0.02, s: 0.30 },
      kStar: 6.086, yStar: 1.826, cStar: 1.278, kGr: 7.128, cGr: 1.283 }
  ];

  function selfTest(verbose) {
    const results = [];
    let pass = 0;

    // Reference values are quoted to three decimals, so a 1e-3 tolerance is
    // the tightest that a truncated reference can support. Identity checks
    // below pass their own, far tighter, tolerance.
    function check(label, got, want, tol) {
      const ok = isFinite(got) && Math.abs(got - want) <= (tol || 1e-3);
      results.push({ label, got, want, ok });
      if (ok) pass++;
      return ok;
    }

    TEST_ROWS.forEach((row, idx) => {
      const ss = steadyState(row.p);
      const gg = goldenRule(row.p);
      const tag = 'row ' + (idx + 1);
      check(tag + ' kStar', ss.kStar, row.kStar);
      check(tag + ' yStar', ss.yStar, row.yStar);
      check(tag + ' cStar', ss.cStar, row.cStar);
      check(tag + ' kGr', gg.kGr, row.kGr);
      check(tag + ' cGr', gg.cGr, row.cGr);
      // s_gr must equal α exactly, for every δ, n, g
      check(tag + ' sGr = alpha', gg.sGr, row.p.alpha, 1e-12);
      // MPK at k̂_gr must equal δ+n+g — the golden-rule condition itself
      check(tag + ' MPK(kGr) = d+n+g', mpk(row.p.alpha, gg.kGr),
            row.p.delta + row.p.n + row.p.g, 1e-9);
      // In steady state, saving exactly covers break-even investment
      check(tag + ' iStar = (d+n+g)kStar', ss.iStar, ss.breakEven * ss.kStar, 1e-9);
      // consumptionBySavings must reproduce cStar at the current s
      check(tag + ' c(s) = cStar', consumptionBySavings(row.p)(row.p.s), ss.cStar, 1e-9);
      // …and peak at s = α
      check(tag + ' c(alpha) = cGr', consumptionBySavings(row.p)(row.p.alpha), gg.cGr, 1e-9);
      // path() must converge to k̂* from both sides
      const up = path(Object.assign({}, row.p, { k0: 0.1 * ss.kStar, periods: 4000 }));
      const dn = path(Object.assign({}, row.p, { k0: 2.5 * ss.kStar, periods: 4000 }));
      check(tag + ' path from below → kStar', up[up.length - 1].k, ss.kStar, 1e-3);
      check(tag + ' path from above → kStar', dn[dn.length - 1].k, ss.kStar, 1e-3);
    });

    // Row 3 is s = α: both code paths must land on the same point.
    const r3 = TEST_ROWS[2].p;
    check('row 3 kStar = kGr', steadyState(r3).kStar, goldenRule(r3).kGr, 1e-9);
    check('row 3 cStar = cGr', steadyState(r3).cStar, goldenRule(r3).cGr, 1e-9);

    // Degenerate guards must flag rather than throw.
    const noBE = steadyState({ alpha: 1 / 3, delta: 0, n: 0, g: 0, s: 0.3 });
    results.push({ label: 'guard: d+n+g = 0 flagged', got: noBE.ok, want: false,
                   ok: noBE.ok === false && noBE.reason === 'no-break-even' });
    if (results[results.length - 1].ok) pass++;
    const badA = steadyState({ alpha: 1, delta: 0.1, n: 0, g: 0, s: 0.3 });
    results.push({ label: 'guard: alpha = 1 flagged', got: badA.ok, want: false,
                   ok: badA.ok === false && badA.reason === 'alpha-range' });
    if (results[results.length - 1].ok) pass++;

    const summary = { pass, total: results.length, ok: pass === results.length, results };
    if (verbose !== false && global.console) {
      const fails = results.filter(r => !r.ok);
      console.log('[SolowCore] self-test: ' + pass + '/' + results.length +
                  (summary.ok ? ' PASS' : ' — ' + fails.length + ' FAILED'));
      if (fails.length && console.table) console.table(fails);
    }
    return summary;
  }

  /* ── Export ─────────────────────────────────────────────────────────── */

  const SolowCore = {
    steadyState, goldenRule, position, growthRates, curves, path,
    consumptionBySavings, notation, domain,
    // supporting helpers both labs and the plot module use
    f, mpk, tickStep, snapUp, snapUpSmall, guard,
    selfTest, TEST_ROWS
  };

  global.SolowCore = SolowCore;

  try {
    if (global.location && /(^|[?&])selftest=1(&|$)/.test(global.location.search)) {
      selfTest(true);
    }
  } catch (e) { /* file:// or no location — never block the lab */ }

})(window);
