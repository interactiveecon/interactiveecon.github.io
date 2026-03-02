// data.js
// Generates stylized GDP and unemployment paths.

window.BCYCLE_DATA = {
  T: 80, // time points
  scenarios: [
    {
      id: "baseline",
      title: "Typical business cycle",
      desc:
        "This scenario shows a typical cycle: GDP rises into a peak, then falls into a trough, then recovers.\n" +
        "Unemployment moves in the opposite direction and lags the cycle."
    },
    {
      id: "sharp",
      title: "Sharper downturn",
      desc:
        "This scenario has a sharper recession: GDP drops more quickly from peak to trough.\n" +
        "Unemployment rises more and peaks later."
    },
    {
      id: "mild",
      title: "Mild recession",
      desc:
        "This scenario has a mild recession: GDP dips only modestly.\n" +
        "Unemployment rises a little and then declines as the recovery continues."
    },
    {
      id: "long",
      title: "Longer recession",
      desc:
        "This scenario has a longer recession: GDP declines for a longer span.\n" +
        "Unemployment rises for longer and peaks later."
    }
  ]
};
