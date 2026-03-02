// data.js
// Baseline parameters for KC/IS lab.

window.KCIS_DATA = {
  // Consumption and investment parameters
  params: {
    C0: 120,
    MPC: 0.6,
    I0: 140,
    b: 12,     // sensitivity of investment to r: I = I0 - b*r
  },

  // Baseline policy settings (sliders start here)
  baseline: {
    r: 4.0,
    G: 150,
    T: 150
  },

  // Slider ranges (must match index.html)
  ranges: {
    r: { min: 0, max: 10, step: 0.1 },
    G: { min: 50, max: 250, step: 5 },
    T: { min: 50, max: 250, step: 5 }
  },

  // Scenario shock sizes
  shocks: {
    r: [ +1.0, -1.0, +1.5, -1.5 ],
    G: [ +20, -20, +30, -30 ],
    T: [ +20, -20, +30, -30 ]
  }
};
