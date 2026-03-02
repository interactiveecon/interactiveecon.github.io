// data.js
window.MONEY_CREATION = {
  banks: ["Bank A", "Bank B", "Bank C", "Bank D", "Bank E", "Bank F"],
  rrRange: [0.08, 0.20],
  injectionRange: [20, 80],      // ΔR
  maxSteps: 80,
  minLoanToContinue: 0.5,        // stop when next loan would be tiny
  excessReserveRate: 0.05        // if enabled: extra reserves = 5% of new deposits
};
