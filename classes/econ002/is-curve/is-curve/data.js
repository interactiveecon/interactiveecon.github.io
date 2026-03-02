// data.js
// Keynesian Cross + IS Mechanism Lab configuration

window.KCIS_DATA = {
  // Simple behavioral parameters (principles level)
  params: {
    C0: 120,   // autonomous consumption
    MPC: 0.6,  // marginal propensity to consume
    I0: 140,   // autonomous investment
    b: 12      // investment sensitivity to interest rate: I = I0 - b*r
  },

  // Baseline (starting) policy settings
  baseline: {
    r: 4.0,
    G: 150,
    T: 150
  },

  // Slider ranges (keep consistent with index.html slider attributes)
  ranges: {
    r: { min: 0, max: 10, step: 0.1 },
    G: { min: 50, max: 250, step: 5 },
    T: { min: 50, max: 250, step: 5 }
  },

  // Shock menu used by "New Scenario"
  // (Scenario should NOT move sliders; it just announces a shock.)
  shocks: {
    r: [ +1.0, -1.0, +1.5, -1.5 ],
    G: [ +20, -20, +30, -30 ],
    T: [ +20, -20, +30, -30 ]
  }
};
