// data.js
// Each scenario provides MB and MC for units 1..10.

window.MARGINALISM_DATA = {
  scenarios: [
    {
      id:"study",
      title:"Studying for an exam",
      desc:"Each additional hour of studying helps, but usually by less and less (diminishing marginal benefit).\nEach hour also has a cost (fatigue, giving up something else).",
      units: 10,
      mb: [18,16,14,12,10,8,6,4,3,2],
      mc: [4,5,6,7,8,9,10,11,12,13]
    },
    {
      id:"overtime",
      title:"Working overtime",
      desc:"Each additional hour pays the same hourly wage (benefit), but the cost rises as you get tired and give up more valuable leisure.",
      units: 10,
      mb: [14,14,14,14,14,14,14,14,14,14],
      mc: [3,4,5,6,7,8,9,10,12,14]
    },
    {
      id:"practice",
      title:"Extra practice problems",
      desc:"Early practice helps a lot. Later problems still help, but less.\nTime cost rises as you become mentally fatigued.",
      units: 10,
      mb: [20,17,14,12,10,8,6,5,4,3],
      mc: [2,3,4,6,7,8,9,10,11,12]
    },
    {
      id:"jobapps",
      title:"Submitting job applications",
      desc:"The first few applications greatly increase your chances. Later applications still help, but less.\nThe time cost rises as you search more broadly.",
      units: 10,
      mb: [22,18,15,12,10,8,6,5,4,3],
      mc: [4,5,6,7,8,9,10,11,12,13]
    },
    {
      id:"cleaning",
      title:"Cleaning your apartment",
      desc:"The first hour makes a big difference. Later hours are smaller improvements.\nThe cost rises as you get tired.",
      units: 10,
      mb: [16,14,12,10,8,6,5,4,3,2],
      mc: [2,3,4,5,6,7,8,9,10,11]
    },
    {
      id:"marketing",
      title:"Small business advertising",
      desc:"Early ads reach the easiest customers. Later ads have smaller marginal impact.\nThe marginal cost rises if you target harder-to-reach customers.",
      units: 10,
      mb: [24,20,16,13,11,9,7,6,5,4],
      mc: [5,6,7,8,9,10,11,12,13,14]
    }
  ]
};
