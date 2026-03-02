// data.js
// Each scenario defines continuous MB(q) and MC(q) and integrates to TB/TC.
// We use simple linear marginals so MB=MC has a clean exact solution.

window.MARGINALISM_CONT = {
  scenarios: [
    {
      id: "study",
      title: "Studying (hours)",
      desc:
        "Choose how many hours to study.\n" +
        "Marginal benefit falls (each extra hour helps less).\n" +
        "Marginal cost rises (fatigue and giving up other activities).",
      unitLabel: "hours",
      qMax: 10,
      // MB(q)=a-bq, MC(q)=c+dq
      mb: { a: 18, b: 1.6 },
      mc: { c: 4,  d: 0.8 }
    },
    {
      id: "overtime",
      title: "Working overtime (hours)",
      desc:
        "Choose how many overtime hours to work.\n" +
        "Marginal benefit is the extra pay (falls slightly due to taxes/effort).\n" +
        "Marginal cost rises with fatigue and giving up leisure.",
      unitLabel: "hours",
      qMax: 10,
      mb: { a: 16, b: 0.8 },
      mc: { c: 3,  d: 1.1 }
    },
    {
      id: "practice",
      title: "Practice problems (dozens)",
      desc:
        "Choose how many dozens of practice problems to do.\n" +
        "Early practice helps a lot; later practice helps less.\n" +
        "Marginal cost rises as you get mentally tired.",
      unitLabel: "dozens",
      qMax: 10,
      mb: { a: 22, b: 1.9 },
      mc: { c: 2,  d: 1.0 }
    },
    {
      id: "ads",
      title: "Advertising (hundreds of dollars)",
      desc:
        "Choose how much to spend on advertising.\n" +
        "Early spending reaches easy customers; later spending has lower impact.\n" +
        "Marginal cost rises as you reach harder-to-reach customers.",
      unitLabel: "$100s",
      qMax: 10,
      mb: { a: 24, b: 1.7 },
      mc: { c: 5,  d: 0.9 }
    }
  ]
};
