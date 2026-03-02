// data.js
// Scenario templates with parameter ranges for MB(q)=a-bq and MC(q)=c+dq.
// App will draw (a,b,c,d) randomly each round and ensure q* is interior.

window.MARGINALISM_CONT = {
  templates: [
    {
      id: "study",
      title: "Studying (hours)",
      desc:
        "Choose how many hours to study.\n" +
        "MB falls (diminishing returns). MC rises (fatigue/opportunity cost).",
      unitLabel: "hours",
      qMax: 10,
      ranges: {
        a: [16, 22],   // MB intercept
        b: [1.2, 2.2], // MB slope (>0)
        c: [2, 6],     // MC intercept
        d: [0.6, 1.4]  // MC slope (>0)
      }
    },
    {
      id: "overtime",
      title: "Working overtime (hours)",
      desc:
        "Choose overtime hours.\n" +
        "MB may fall slightly (taxes/effort). MC rises with fatigue/leisure loss.",
      unitLabel: "hours",
      qMax: 10,
      ranges: {
        a: [14, 20],
        b: [0.4, 1.2],
        c: [1, 5],
        d: [0.9, 1.8]
      }
    },
    {
      id: "ads",
      title: "Advertising (hundreds of dollars)",
      desc:
        "Choose how much to spend on advertising.\n" +
        "Early spending reaches easy customers; later spending has lower impact.\n" +
        "MC rises as you target harder-to-reach customers.",
      unitLabel: "$100s",
      qMax: 10,
      ranges: {
        a: [18, 28],
        b: [1.0, 2.2],
        c: [3, 8],
        d: [0.6, 1.4]
      }
    },
    {
      id: "training",
      title: "Job training (hours)",
      desc:
        "Choose training time.\n" +
        "MB falls as you exhaust the most valuable skills first.\n" +
        "MC rises as training becomes tiring/time-consuming.",
      unitLabel: "hours",
      qMax: 10,
      ranges: {
        a: [15, 24],
        b: [1.0, 2.0],
        c: [2, 7],
        d: [0.7, 1.5]
      }
    },
    {
      id: "exercise",
      title: "Exercise (hours per week)",
      desc:
        "Choose exercise hours.\n" +
        "MB falls (extra hours help less). MC rises (fatigue/time).",
      unitLabel: "hours",
      qMax: 10,
      ranges: {
        a: [14, 22],
        b: [0.9, 1.8],
        c: [1, 6],
        d: [0.7, 1.6]
      }
    },

    // A few more conceptual contexts to vary framing
    {
      id: "shopping",
      title: "Shopping for deals (hours)",
      desc:
        "Choose how many hours to spend searching for deals.\n" +
        "MB falls (you find the best deals first). MC rises (time/effort).",
      unitLabel: "hours",
      qMax: 10,
      ranges: {
        a: [12, 20],
        b: [0.8, 1.6],
        c: [1, 5],
        d: [0.8, 1.7]
      }
    },
    {
      id: "quality",
      title: "Quality checks (hundreds of items)",
      desc:
        "Choose how many quality checks to perform.\n" +
        "MB falls (most defects found early). MC rises (more inspection effort).",
      unitLabel: "100s items",
      qMax: 10,
      ranges: {
        a: [16, 26],
        b: [1.0, 2.2],
        c: [2, 7],
        d: [0.7, 1.6]
      }
    }
  ]
};
