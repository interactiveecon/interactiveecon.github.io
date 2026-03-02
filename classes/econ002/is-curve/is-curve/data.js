// data.js
window.KCIS_DATA = {
  params: {
    C0: 120,
    MPC: 0.6,
    I0: 140,
    b: 12
  },
  baseline: { r: 4.0, G: 150, T: 150 },
  ranges: {
    r: { min: 0, max: 10, step: 0.1 },
    G: { min: 50, max: 250, step: 5 },
    T: { min: 50, max: 250, step: 5 }
  },
  shocks: {
    r: [ +1.0, -1.0, +1.5, -1.5 ],
    G: [ +20, -20, +30, -30 ],
    T: [ +20, -20, +30, -30 ]
  }
};
