// data.js
window.MONEY_LAB = {
  // Baseline settings
  baseline: {
    R: 100,      // reserves quantity
    ior: 2.0,    // interest on reserves (%)
    rr: 0.10,     // required reserve ratio (for baseline multiplier)
    idisc: 4.0      // <-- ADD: discount rate (ceiling), %
  },

  // Reserves demand: for i >= ior, Rd(i) = a - b*i
  // i is in percent units (0..10)
  demand: {
    a: 180,
    b: 12
  },

  // How strongly IOR increases desired excess reserves (reduces multiplier)
  // effective reserve ratio = rr + er(ior);  er = max(0, er0 + k*(ior - ior0))
  excessReserves: {
    er0: 0.02,
    ior0: 2.0,
    k: 0.015
  },

  // Scenario shocks (numeric magnitudes)
  shocks: {
    OMO: [20, 30, 40],     // ΔR
    IOR: [0.5, 1.0, 1.5]   // ΔIOR
  },

  // Chart domains
  chart: {
    Rmin: 0,
    Rmax: 220,
    imin: 0,
    imax: 10,
    Mmin: 0,
    Mmax: 2400
  }
};
