// data.js
// NOTE: Values use small decimals so that at the optimum unit q*,
// MB and MC ROUND to the same integer in your table, but MB is
// slightly larger than MC. This creates a UNIQUE maximum for
// cumulative net benefit at q* (no ties), and the next unit has MB < MC.

window.MARGINALISM_DATA = {
  scenarios: [
    {
      id:"study",
      title:"Studying for an exam",
      desc:"Each additional hour helps, but by less and less.\nThe cost rises as you get tired and give up other activities.",
      units: 10,
      // Unique peak at q*=6 (MB6≈MC6 in display; MB7 < MC7)
      mb: [18,16,14,12,10, 8.49, 6,4,3,2],
      mc: [ 4, 5, 6, 7, 8, 8.45, 9,10,11,12]
    },
    {
      id:"overtime",
      title:"Working overtime",
      desc:"Extra hours pay about the same, but the personal cost rises as fatigue sets in.",
      units: 10,
      // Unique peak at q*=8 (MB8≈MC8; MB9 < MC9)
      mb: [14,14,14,14,14,14,14,13.51,12,10],
      mc: [ 3, 4, 5, 6, 7, 9,11,13.49,15,16]
    },
    {
      id:"practice",
      title:"Extra practice problems",
      desc:"Early practice helps a lot. Later problems help less.\nThe time cost rises as you get mentally fatigued.",
      units: 10,
      // Unique peak at q*=5 (MB5≈MC5; MB6 < MC6)
      mb: [20,17,14,12,10.49, 8,6,5,4,3],
      mc: [ 3, 5, 7, 9,10.45,11,12,13,14,15]
    },
    {
      id:"jobapps",
      title:"Submitting job applications",
      desc:"The first few applications help a lot. Later ones help less.\nThe time cost rises as you search more broadly.",
      units: 10,
      // Unique peak at q*=6 (MB6≈MC6; MB7 < MC7)
      mb: [22,18,15,12,10, 8.49, 6,5,4,3],
      mc: [ 3, 4, 5, 6, 7, 8.45, 9,10,11,12]
    },
    {
      id:"cleaning",
      title:"Cleaning your apartment",
      desc:"The first hour makes a big difference. Later hours are smaller improvements.\nThe cost rises as you get tired.",
      units: 10,
      // Unique peak at q*=6 (MB6≈MC6; MB7 < MC7)
      mb: [16,14,12,10, 8, 6.49,5,4,3,2],
      mc: [ 1, 2, 3, 4, 5, 6.45,7,8,9,10]
    },
    {
      id:"marketing",
      title:"Small business advertising",
      desc:"Early ads reach easy customers. Later ads have smaller impact.\nMarginal cost rises as you target harder-to-reach customers.",
      units: 10,
      // Unique peak at q*=5 (MB5≈MC5; MB6 < MC6)
      mb: [24,20,16,13,11.49, 9,7,6,5,4],
      mc: [ 6, 7, 8,10,11.45,12,13,14,15,16]
    }
  ]
};
