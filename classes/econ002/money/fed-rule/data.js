window.FED_RULE_LAB = {
  // constants (positive)
  params: { a: 0.08, b: 0.6, c: 0.6 },

  // baseline values
  baseline: { Y: 50, P: 5, Z: 5 },

  // scenario shocks (sizes)
  shocks: {
    dY: [10, 15, 20],
    dP: [0.8, 1.2, 1.6],
    dZ: [0.8, 1.2, 1.6]
  },

  // axis ranges (static)
  axes: {
    Ymin: 0, Ymax: 100,
    rmin: 0, rmax: 20
  }
};
