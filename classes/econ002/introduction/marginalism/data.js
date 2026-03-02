// data.js
// Each scenario provides MB and MC for units 1..10.
// Constructed so the optimal stopping point has MB(q*) = MC(q*)
// and MB(q*+1) < MC(q*+1).

window.MARGINALISM_DATA = {
  scenarios: [
    {
      id:"study",
      title:"Studying for an exam",
      desc:"Each additional hour of studying helps, but usually by less and less.\nEach hour also has a rising cost (fatigue, giving up something else).",
      units: 10,
      // equality at unit 6: MB6=8, MC6=8; next unit MB7=6 < MC7=9
      mb: [18,16,14,12,10, 8, 6,4,3,2],
      mc: [ 4, 5, 6, 7, 8, 8, 9,10,11,12]
    },
    {
      id:"overtime",
      title:"Working overtime",
      desc:"Overtime pay is steady at first, but the personal cost rises as you get tired and give up more valuable leisure.",
      units: 10,
      // equality at unit 8: MB8=14, MC8=14; next unit MB9=12 < MC9=15
      mb: [14,14,14,14,14,14,14,14,12,10],
      mc: [ 3, 4, 5, 6, 7, 9,11,14,15,16]
    },
    {
      id:"practice",
      title:"Extra practice problems",
      desc:"Early practice helps a lot. Later problems still help, but less.\nTime cost rises as you get mentally fatigued.",
      units: 10,
      // equality at unit 5: MB5=10, MC5=10; next unit MB6=8 < MC6=11
      mb: [20,17,14,12,10, 8,6,5,4,3],
      mc: [ 3, 5, 7, 9,10,11,12,13,14,15]
    },
    {
      id:"jobapps",
      title:"Submitting job applications",
      desc:"The first few applications greatly increase your chances. Later applications help less.\nThe time cost rises as you search more broadly.",
      units: 10,
      // equality at unit 6: MB6=8, MC6=8; next unit MB7=6 < MC7=9
      mb: [22,18,15,12,10, 8,6,5,4,3],
      mc: [ 3, 4, 5, 6, 7, 8,9,10,11,12]
    },
    {
      id:"cleaning",
      title:"Cleaning your apartment",
      desc:"The first hour makes a big difference. Later hours are smaller improvements.\nThe cost rises as you get tired.",
      units: 10,
      // equality at unit 6: MB6=6, MC6=6; next unit MB7=5 < MC7=7
      mb: [16,14,12,10, 8, 6,5,4,3,2],
      mc: [ 1, 2, 3, 4, 5, 6,7,8,9,10]
    },
    {
      id:"marketing",
      title:"Small business advertising",
      desc:"Early ads reach easy customers. Later ads have smaller marginal impact.\nMarginal cost rises as you target harder-to-reach customers.",
      units: 10,
      // equality at unit 5: MB5=11, MC5=11; next unit MB6=9 < MC6=12
      mb: [24,20,16,13,11, 9,7,6,5,4],
      mc: [ 6, 7, 8,10,11,12,13,14,15,16]
    }
  ]
};
