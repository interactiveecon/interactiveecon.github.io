(function(){
'use strict';

// ─────────────────────────────────────────────────────────────────────────
// Sample week-template entry (paste into a discussion week's LABS array):
//   { id: 'aggregate-demand-prediction', name: 'Aggregate Demand Prediction', icon: '🎯',
//     desc: 'Predict IS/LM/AD responses to news scenarios; build the mechanism.',
//     url: '/classes/econ105a/labs/aggregate-demand-prediction/?disc=1' }
// ─────────────────────────────────────────────────────────────────────────
const LAB_ID    = 'aggregate-demand-prediction';
const LAB_LABEL = 'Aggregate Demand Prediction';

// ── Model parameters ────────────────────────────────────────────────────
// Investment is deliberately made much less interest-elastic (small I1) than a
// textbook baseline so the IS curve is steep — this makes the interest-rate
// response to each shock large and easy to see. The autonomous-spending sliders
// (G, T, C, I) are scaled down to match so a steep IS still keeps every
// equilibrium inside the plotted ranges. Shift directions, scenarios, and the
// mechanism are unchanged; only the displayed dollar magnitudes differ.
const MPC = 0.75, c1 = 0, I1 = 5, MDY = 3, MDR = 30;
const BASE = { G:20, T:40, C:25, I:35, P:5, M:650 };
// Baseline: A = C − MPC·T + I + G = 50 → alphaIS = 10, betaIS = 0.05 (6× steeper).

// Plot ranges (chosen to cover single-shock slider extremes with margin)
const RANGE = {
  Y:   180,   // IS-LM x-axis  (max Y ≈ 139 at P=2)
  r:   12,    // shared interest-rate axis (MM + IS-LM)
  MP:  360,   // Money market x-axis  (max M/P = 650/2 = 325 at P=2)
  AD_Y: 180,  // AD x-axis (shares Y with IS-LM)
  AD_P: 9,
};

// Slider ranges — MUST match HTML min/max/step
const SLIDER_R = {
  G: { min:10,  max:30,  step:1 },    // ±50% of 20
  T: { min:20,  max:60,  step:1 },    // wide (compensates for MPC=0.75)
  C: { min:15,  max:35,  step:1 },    // ±40% of 25
  I: { min:20,  max:50,  step:1 },    // base 35
  P: { min:2,   max:8,   step:0.1 },  // wider so AD movement is visible
  M: { min:455, max:845, step:1 },    // ±30% of 650
};

const $ = id => document.getElementById(id);
const clamp = (x,lo,hi) => Math.max(lo, Math.min(hi, x));
const approxEq = (a,b,t) => Math.abs(a-b) <= (t||1e-6);
const fmt0 = v => Number(v).toFixed(0);
const fmt1 = v => Number(v).toFixed(1);
const fmt2 = v => Number(v).toFixed(2);

// ── Equilibrium math ────────────────────────────────────────────────────
// IS: r = (c0 − MPC·T + I0 + G − (1−MPC)·Y) / (c1 + I1)
// LM: r = (MDY/MDR)·Y − M/(MDR·P)
// Setting IS = LM and solving:
//   Y = α + β/P   where
//   α = MDR·(c0 − MPC·T + I0 + G) / (MDR·(1−MPC) + (c1+I1)·MDY)
//   β = (c1+I1)·M                  / (MDR·(1−MPC) + (c1+I1)·MDY)
function coeffs(s){
  const A = s.C - MPC*s.T + s.I + s.G;
  const D = MDR*(1-MPC) + (c1+I1)*MDY;
  return {
    A,
    alpha: MDR*A / D,
    beta:  (c1+I1)*s.M / D,
    alphaIS: A / (c1+I1),
    betaIS:  (1-MPC) / (c1+I1),
  };
}
function equilibrium(s){
  const k = coeffs(s);
  const Y = k.alpha + k.beta / s.P;
  const r = k.alphaIS - k.betaIS * Y;
  const MP = s.M / s.P;
  return { Y, r, MP, ...k };
}
function adCurvePoints(s, n){
  n = n || 120;
  const k = coeffs(s);
  const pts = [];
  for(let i=0;i<=n;i++){
    const P = 0.6 + (RANGE.AD_P + 1 - 0.6) * (i/n);
    const Y = k.alpha + k.beta / P;
    pts.push({Y, P});
  }
  return pts;
}

// ── Tokens + mechanism chains ──────────────────────────────────────────
const TOK = {
  Gup:'G↑', Gdn:'G↓',
  Tup:'T↑', Tdn:'T↓',
  Cup:'C↑', Cdn:'C↓',
  Iup:'I↑', Idn:'I↓',
  Pup:'P↑', Pdn:'P↓',
  Mup:'M↑', Mdn:'M↓',
  MPup:'M/P↑', MPdn:'M/P↓',
  MDup:'Money Demand↑', MDdn:'Money Demand↓',
  PEup:'PE↑', PEdn:'PE↓',
  UInvUp:'Unplanned Inv↑', UInvDn:'Unplanned Inv↓',
  Yup:'Y↑', Ydn:'Y↓',
  rup:'r↑', rdn:'r↓',
};

const MECH = {
  G_up: [TOK.Gup, TOK.PEup, TOK.UInvDn, TOK.Yup, TOK.MDup, TOK.rup],
  G_dn: [TOK.Gdn, TOK.PEdn, TOK.UInvUp, TOK.Ydn, TOK.MDdn, TOK.rdn],
  T_up: [TOK.Tup, TOK.Cdn, TOK.PEdn, TOK.UInvUp, TOK.Ydn, TOK.MDdn, TOK.rdn],
  T_dn: [TOK.Tdn, TOK.Cup, TOK.PEup, TOK.UInvDn, TOK.Yup, TOK.MDup, TOK.rup],
  C_up: [TOK.Cup, TOK.PEup, TOK.UInvDn, TOK.Yup, TOK.MDup, TOK.rup],
  C_dn: [TOK.Cdn, TOK.PEdn, TOK.UInvUp, TOK.Ydn, TOK.MDdn, TOK.rdn],
  I_up: [TOK.Iup, TOK.PEup, TOK.UInvDn, TOK.Yup, TOK.MDup, TOK.rup],
  I_dn: [TOK.Idn, TOK.PEdn, TOK.UInvUp, TOK.Ydn, TOK.MDdn, TOK.rdn],
  P_up: [TOK.Pup, TOK.MPdn, TOK.rup, TOK.Idn, TOK.PEdn, TOK.UInvUp, TOK.Ydn],
  P_dn: [TOK.Pdn, TOK.MPup, TOK.rdn, TOK.Iup, TOK.PEup, TOK.UInvDn, TOK.Yup],
  M_up: [TOK.Mup, TOK.MPup, TOK.rdn, TOK.Iup, TOK.PEup, TOK.UInvDn, TOK.Yup],
  M_dn: [TOK.Mdn, TOK.MPdn, TOK.rup, TOK.Idn, TOK.PEdn, TOK.UInvUp, TOK.Ydn],
};

const PILL_GROUPS = [
  { name:'Government Purchases',  pills:[TOK.Gup, TOK.Gdn] },
  { name:'Taxes',                 pills:[TOK.Tup, TOK.Tdn] },
  { name:'Consumption',           pills:[TOK.Cup, TOK.Cdn] },
  { name:'Investment',            pills:[TOK.Iup, TOK.Idn] },
  { name:'Price Level',           pills:[TOK.Pup, TOK.Pdn] },
  { name:'Money Supply',          pills:[TOK.Mup, TOK.Mdn] },
  { name:'Real Money Balances',   pills:[TOK.MPup, TOK.MPdn] },
  { name:'Money Demand',          pills:[TOK.MDup, TOK.MDdn] },
  { name:'Planned Expenditure',   pills:[TOK.PEup, TOK.PEdn] },
  { name:'Unplanned Inventories', pills:[TOK.UInvUp, TOK.UInvDn] },
  { name:'Output',                pills:[TOK.Yup, TOK.Ydn] },
  { name:'Interest Rate',         pills:[TOK.rup, TOK.rdn] },
];

const mechKeyFor = (v, d) => `${v}_${d === 'up' ? 'up' : 'dn'}`;

// ── Scenarios ──────────────────────────────────────────────────────────
const SCEN = [
  // G up
  { var:'G', dir:'up',   src:'Congress',       head:'Emergency infrastructure package approved',     brief:'Federal agencies increase purchases of construction and equipment.' },
  { var:'G', dir:'up',   src:'Defense Dept.',  head:'Defense procurement expanded',                  brief:'The government buys more goods and services this quarter.' },
  { var:'G', dir:'up',   src:'White House',    head:'Federal contract awards accelerate',            brief:'New government contracts raise purchases of goods and services.' },
  { var:'G', dir:'up',   src:'FEMA',           head:'Disaster response ramps up purchases',          brief:'Federal agencies increase purchases for logistics and reconstruction.' },
  { var:'G', dir:'up',   src:'Public Sector',  head:'Public health program expands supplies',        brief:'Government purchases of services increase.' },
  { var:'G', dir:'up',   src:'State & Local',  head:'State and local public works accelerate',       brief:'Public purchases rise as projects move forward.' },
  { var:'G', dir:'up',   src:'Congress',       head:'Large federal procurement initiative',          brief:'Federal purchases of goods and contracted services rise.' },
  { var:'G', dir:'up',   src:'Policy Desk',    head:'Infrastructure projects move from plan to spend', brief:'Government purchases increase over the next quarter.' },
  { var:'G', dir:'up',   src:'Public Sector',  head:'Education agencies expand service contracts',   brief:'Government purchases of services increase.' },
  { var:'G', dir:'up',   src:'Policy Desk',    head:'Equipment replacement cycle accelerated',       brief:'Public purchases of equipment rise.' },
  // G down
  { var:'G', dir:'down', src:'OMB',            head:'Budget directive freezes new federal contracts', brief:'Federal purchases fall as agencies delay procurement.' },
  { var:'G', dir:'down', src:'Congress',       head:'Spending caps trigger broad cuts',              brief:'Government reduces purchases to meet budget targets.' },
  { var:'G', dir:'down', src:'Policy Desk',    head:'Continuing resolution delays agency spending',  brief:'Procurement is postponed and purchases fall.' },
  { var:'G', dir:'down', src:'Public Sector',  head:'Infrastructure project pipeline paused',        brief:'Government slows purchases of materials and services.' },
  { var:'G', dir:'down', src:'Congress',       head:'Across-agency procurement cuts announced',      brief:'Government buys fewer goods and services this quarter.' },
  { var:'G', dir:'down', src:'State & Local',  head:'State governments pause public works contracts', brief:'State and local purchases decline.' },
  { var:'G', dir:'down', src:'Policy Desk',    head:'Project cancellations reduce procurement',      brief:'Government purchases decline over the next quarter.' },
  { var:'G', dir:'down', src:'Public Sector',  head:'Agency service contracts scaled back',          brief:'Government purchases of services fall.' },
  { var:'G', dir:'down', src:'Policy Desk',    head:'Reconstruction spending winds down',            brief:'Government purchases decrease as emergency programs end.' },
  { var:'G', dir:'down', src:'Policy Desk',    head:'Procurement timelines stretched out',           brief:'Government purchases are reduced and postponed.' },

  // T up
  { var:'T', dir:'up',   src:'Policy Desk', head:'Tax surcharge implemented to reduce deficits', brief:'Household tax burden rises.' },
  { var:'T', dir:'up',   src:'Policy Desk', head:'Payroll tax rate increases',                    brief:'After-tax income falls for most workers.' },
  { var:'T', dir:'up',   src:'Policy Desk', head:'Rebates expire; withholding rises',             brief:'Net taxes increase this month.' },
  { var:'T', dir:'up',   src:'Policy Desk', head:'State tax hikes enacted',                       brief:'Household tax payments rise.' },
  { var:'T', dir:'up',   src:'Policy Desk', head:'Broad tax increase scheduled',                  brief:'Tax payments increase over the next quarter.' },
  { var:'T', dir:'up',   src:'Policy Desk', head:'Temporary credits sunset',                      brief:'Net taxes rise as credits expire.' },
  { var:'T', dir:'up',   src:'Policy Desk', head:'Withholding tables updated upward',             brief:'Paychecks fall as taxes withheld rise.' },
  { var:'T', dir:'up',   src:'Policy Desk', head:'Tax compliance push raises payments',           brief:'Households pay more in taxes this quarter.' },
  { var:'T', dir:'up',   src:'Policy Desk', head:'New surtax begins',                              brief:'Net tax burden rises.' },
  { var:'T', dir:'up',   src:'Policy Desk', head:'Refunds shrink',                                 brief:'Net taxes paid rise this period.' },
  // T down
  { var:'T', dir:'down', src:'Policy Desk', head:'Tax cut takes effect; withholding falls',       brief:'Households keep more after-tax income.' },
  { var:'T', dir:'down', src:'Policy Desk', head:'Payroll tax holiday announced',                 brief:'Take-home pay rises for most workers.' },
  { var:'T', dir:'down', src:'Policy Desk', head:'Child tax credit expansion begins',             brief:'Net taxes paid by households decline.' },
  { var:'T', dir:'down', src:'Policy Desk', head:'Standard deduction raised',                     brief:"Typical households' tax liability falls." },
  { var:'T', dir:'down', src:'Policy Desk', head:'Temporary rebate checks issued',                brief:'Effective net taxes fall this period.' },
  { var:'T', dir:'down', src:'Policy Desk', head:'Withholding tables updated',                    brief:'Paychecks rise as taxes withheld fall.' },
  { var:'T', dir:'down', src:'Policy Desk', head:'Tax relief extended',                           brief:'Households face lower tax payments this quarter.' },
  { var:'T', dir:'down', src:'Policy Desk', head:'Temporary tax credit enacted',                  brief:'Net tax burden falls.' },
  { var:'T', dir:'down', src:'Policy Desk', head:'Lower payroll deductions begin',                brief:'Households keep more income after taxes.' },
  { var:'T', dir:'down', src:'Policy Desk', head:'Tax refunds increase',                          brief:'Net taxes fall this period.' },

  // C up
  { var:'C', dir:'up',   src:'Household Survey', head:'Consumer confidence surges; spending rebounds', brief:'Autonomous consumption rises.' },
  { var:'C', dir:'up',   src:'Markets',          head:'Household wealth rises after market rally',     brief:'Spending increases as households feel better off.' },
  { var:'C', dir:'up',   src:'Retail Pulse',     head:'Pent-up demand boosts services and retail',     brief:'Consumers spend more than usual this month.' },
  { var:'C', dir:'up',   src:'Household Survey', head:'Uncertainty eases; budgets loosen',             brief:'Autonomous consumption rises as precautionary saving falls.' },
  { var:'C', dir:'up',   src:'Retail Pulse',     head:'Holiday sales exceed expectations',             brief:'Consumption jumps relative to trend.' },
  { var:'C', dir:'up',   src:'Household Survey', head:'Households report higher planned spending',     brief:'Autonomous consumption rises.' },
  { var:'C', dir:'up',   src:'Retail Pulse',     head:'Services spending accelerates',                 brief:'Households increase consumption of services.' },
  { var:'C', dir:'up',   src:'Household Survey', head:'Improved job prospects boost spending',         brief:'Autonomous consumption rises.' },
  { var:'C', dir:'up',   src:'Retail Pulse',     head:'Durable goods purchases surge',                 brief:'Autonomous consumption rises.' },
  { var:'C', dir:'up',   src:'Household Survey', head:'Lower uncertainty reduces saving',              brief:'Households spend more.' },
  // C down
  { var:'C', dir:'down', src:'Household Survey', head:'Consumer sentiment drops; spending cut',        brief:'Households reduce purchases.' },
  { var:'C', dir:'down', src:'Household Survey', head:'Precautionary saving rises',                    brief:'Households become cautious and consumption falls.' },
  { var:'C', dir:'down', src:'Credit Conditions',head:'Delinquencies rise; spending tightens',         brief:'Households pull back on consumption.' },
  { var:'C', dir:'down', src:'Household Survey', head:'Budget squeeze leads to cutbacks',              brief:'Households reduce discretionary spending.' },
  { var:'C', dir:'down', src:'Markets',          head:'Negative wealth shock reduces spending',        brief:'Households cut consumption as wealth falls.' },
  { var:'C', dir:'down', src:'Retail Pulse',     head:'Retail sales weaken broadly',                   brief:'Autonomous consumption falls this month.' },
  { var:'C', dir:'down', src:'Household Survey', head:'Households delay major purchases',              brief:'Consumption falls as spending is postponed.' },
  { var:'C', dir:'down', src:'Retail Pulse',     head:'Services demand softens',                       brief:'Households reduce consumption of services.' },
  { var:'C', dir:'down', src:'Household Survey', head:'Higher uncertainty boosts saving',              brief:'Consumption falls.' },
  { var:'C', dir:'down', src:'Household Survey', head:'Spending intentions decline',                   brief:'Consumption decreases this quarter.' },

  // I up
  { var:'I', dir:'up',   src:'Business Pulse',  head:'Firms expand capacity; equipment orders jump',   brief:'Autonomous investment rises.' },
  { var:'I', dir:'up',   src:'Business Pulse',  head:'Tech upgrade cycle accelerates',                 brief:'Firms raise investment in equipment and software.' },
  { var:'I', dir:'up',   src:'Business Pulse',  head:'Business optimism improves; capex up',           brief:'Firms increase investment spending.' },
  { var:'I', dir:'up',   src:'Construction Watch', head:'Housing starts rise',                          brief:'Residential investment increases.' },
  { var:'I', dir:'up',   src:'Business Pulse',  head:'Project pipeline expands',                       brief:'Firms approve more capital projects.' },
  { var:'I', dir:'up',   src:'Business Pulse',  head:'Factory expansions announced',                   brief:'Investment spending rises.' },
  { var:'I', dir:'up',   src:'Construction Watch', head:'Commercial construction picks up',            brief:'Investment increases as projects begin.' },
  { var:'I', dir:'up',   src:'Business Pulse',  head:'Equipment replacement accelerates',              brief:'Firms invest more in new capital.' },
  { var:'I', dir:'up',   src:'Business Pulse',  head:'Capacity constraints spur new projects',         brief:'Investment rises.' },
  { var:'I', dir:'up',   src:'Business Pulse',  head:'Capital spending budgets increased',             brief:'Firms raise investment.' },
  // I down
  { var:'I', dir:'down', src:'Business Pulse',  head:'Firms postpone projects amid uncertainty',       brief:'Capital spending is delayed and investment falls.' },
  { var:'I', dir:'down', src:'Credit Conditions', head:'Credit tightens; capex plans delayed',         brief:'Investment declines as financing becomes harder.' },
  { var:'I', dir:'down', src:'Construction Watch', head:'Commercial construction slows',               brief:'Investment falls as projects are postponed.' },
  { var:'I', dir:'down', src:'Business Pulse',  head:'Earnings slump; investment budgets cut',         brief:'Firms reduce investment spending.' },
  { var:'I', dir:'down', src:'Business Pulse',  head:'Demand outlook weakens; expansion scrapped',     brief:'Firms cut back on investment.' },
  { var:'I', dir:'down', src:'Business Pulse',  head:'Capital projects canceled',                      brief:'Investment spending falls.' },
  { var:'I', dir:'down', src:'Construction Watch', head:'Residential building slows',                  brief:'Residential investment declines.' },
  { var:'I', dir:'down', src:'Business Pulse',  head:'Equipment orders drop',                          brief:'Firms reduce capital spending.' },
  { var:'I', dir:'down', src:'Business Pulse',  head:'Capex plans revised down',                       brief:'Investment decreases this quarter.' },
  { var:'I', dir:'down', src:'Business Pulse',  head:'Project approvals stall',                        brief:'Investment falls.' },

  // P up
  { var:'P', dir:'up',   src:'Inflation Watch', head:'Inflation pressures broaden across sectors',     brief:'The price level rises faster across many categories.' },
  { var:'P', dir:'up',   src:'Inflation Watch', head:'Supply disruptions push prices higher',          brief:'The aggregate price level rises.' },
  { var:'P', dir:'up',   src:'Inflation Watch', head:'Wage growth and pricing power lift inflation',   brief:'The price level rises.' },
  { var:'P', dir:'up',   src:'Inflation Watch', head:'Commodity prices surge; inflation rises',        brief:'The price level rises economy-wide.' },
  { var:'P', dir:'up',   src:'Inflation Watch', head:'Inflation expectations drift up',                brief:'The price level continues to rise.' },
  { var:'P', dir:'up',   src:'Inflation Watch', head:'Broad price increases accelerate',               brief:'The price level rises faster.' },
  { var:'P', dir:'up',   src:'Inflation Watch', head:'Service inflation strengthens',                  brief:'The price level rises.' },
  { var:'P', dir:'up',   src:'Inflation Watch', head:'Prices rise across essentials',                  brief:'The price level increases.' },
  { var:'P', dir:'up',   src:'Inflation Watch', head:'Persistent inflation remains elevated',          brief:'The price level keeps rising.' },
  { var:'P', dir:'up',   src:'Inflation Watch', head:'Inflation surprise to the upside',               brief:'The price level rises more than expected.' },
  // P down
  { var:'P', dir:'down', src:'Inflation Watch', head:'Broad price declines emerge; deflation appears', brief:'Prices fall across many categories.' },
  { var:'P', dir:'down', src:'Inflation Watch', head:'Demand weakness triggers widespread markdowns',  brief:'Businesses cut prices broadly.' },
  { var:'P', dir:'down', src:'Inflation Watch', head:'Global goods glut drives prices down',           brief:'The price level falls.' },
  { var:'P', dir:'down', src:'Inflation Watch', head:'Competitive price wars spread',                  brief:'Firms cut prices; the price level falls.' },
  { var:'P', dir:'down', src:'Inflation Watch', head:'Economy-wide discounting intensifies',           brief:'Prices fall across many goods and services.' },
  { var:'P', dir:'down', src:'Inflation Watch', head:'Deflationary pressure broadens',                 brief:'The price level falls.' },
  { var:'P', dir:'down', src:'Inflation Watch', head:'Widespread price cuts reported',                 brief:'Prices fall across sectors.' },
  { var:'P', dir:'down', src:'Inflation Watch', head:'Retailers slash prices broadly',                 brief:'The price level declines.' },
  { var:'P', dir:'down', src:'Inflation Watch', head:'Prices fall across core categories',             brief:'Deflation appears economy-wide.' },
  { var:'P', dir:'down', src:'Inflation Watch', head:'Deflation surprise',                             brief:'Prices fall more than expected.' },

  // M up (expansionary monetary policy)
  { var:'M', dir:'up',   src:'Federal Reserve',     head:'Fed announces large-scale asset purchases',       brief:'Open-market operations expand bank reserves; the money supply grows.' },
  { var:'M', dir:'up',   src:'Federal Reserve',     head:'Reserve requirements cut',                        brief:'Banks can lend more deposits; the money supply expands.' },
  { var:'M', dir:'up',   src:'Open-Market Desk',    head:'Open-market purchases expand bank reserves',      brief:'The Fed buys Treasuries, injecting reserves and raising M.' },
  { var:'M', dir:'up',   src:'Federal Reserve',     head:'Quantitative easing program begins',              brief:'Large-scale asset purchases expand the money supply.' },
  { var:'M', dir:'up',   src:'Federal Reserve',     head:'Fed signals accommodative stance with reserves',  brief:'Bank reserves rise; the money supply grows.' },
  { var:'M', dir:'up',   src:'Federal Reserve',     head:'Discount-window rate lowered to spur lending',    brief:'Banks borrow more reserves; the money supply expands.' },
  { var:'M', dir:'up',   src:'Federal Reserve',     head:'Emergency liquidity facility announced',          brief:'Reserves injected into the banking system; M rises.' },
  { var:'M', dir:'up',   src:'Open-Market Desk',    head:'Repo operations expanded',                        brief:'The Fed adds reserves; the money supply grows.' },
  { var:'M', dir:'up',   src:'Open-Market Desk',    head:'Coupon-pass operation injects liquidity',         brief:'Open-market purchases expand bank reserves and the money supply.' },
  { var:'M', dir:'up',   src:'Federal Reserve',     head:'Fed buys long-duration Treasuries',               brief:'Reserves expand; the money supply rises.' },
  // M down (contractionary monetary policy)
  { var:'M', dir:'down', src:'Federal Reserve',     head:'Fed begins balance-sheet runoff',                 brief:'Maturing assets are not replaced; reserves shrink and the money supply contracts.' },
  { var:'M', dir:'down', src:'Open-Market Desk',    head:'Open-market sales drain bank reserves',           brief:'The Fed sells Treasuries; reserves and the money supply fall.' },
  { var:'M', dir:'down', src:'Federal Reserve',     head:'Reserve requirements raised',                     brief:'Banks must hold more reserves; the money supply contracts.' },
  { var:'M', dir:'down', src:'Federal Reserve',     head:'Quantitative tightening accelerates',             brief:'Fed asset roll-off shrinks the money supply.' },
  { var:'M', dir:'down', src:'Federal Reserve',     head:'Fed contracts money supply to fight inflation',   brief:'Open-market sales reduce M.' },
  { var:'M', dir:'down', src:'Open-Market Desk',    head:'Repo operations scaled back',                     brief:'Liquidity is withdrawn; the money supply falls.' },
  { var:'M', dir:'down', src:'Federal Reserve',     head:'Discount-window borrowing limits tightened',      brief:'Bank borrowing of reserves declines; M falls.' },
  { var:'M', dir:'down', src:'Federal Reserve',     head:'Asset roll-off pace accelerated',                 brief:'Reserves drain; the money supply contracts.' },
  { var:'M', dir:'down', src:'Federal Reserve',     head:'Liquidity facilities wind down',                  brief:'Reserves return to the Fed; the money supply shrinks.' },
  { var:'M', dir:'down', src:'Federal Reserve',     head:'Treasury cash drain accelerates',                 brief:'Reserves leave the banking system; M falls.' },
];

// ── Expected prediction per scenario ───────────────────────────────────
function expectedPrediction(s){
  const v = s.var, up = (s.dir === 'up');
  if(v === 'G' || v === 'C' || v === 'I'){
    return {
      IS: { action:'shift', dir: up?'right':'left' },
      LM: { action:'move',  dir: up?'up':'down' },
      AD: { action:'shift', dir: up?'right':'left' },
    };
  }
  if(v === 'T'){
    return {
      IS: { action:'shift', dir: up?'left':'right' },
      LM: { action:'move',  dir: up?'down':'up' },
      AD: { action:'shift', dir: up?'left':'right' },
    };
  }
  if(v === 'P'){
    return {
      IS: { action:'move',  dir: up?'up':'down' },
      LM: { action:'shift', dir: up?'up':'down' },
      AD: { action:'move',  dir: up?'up':'down' },
    };
  }
  // M shock: M up → M/P up → LM shifts down → r↓, Y↑
  return {
    IS: { action:'move',  dir: up?'down':'up' },
    LM: { action:'shift', dir: up?'down':'up' },
    AD: { action:'shift', dir: up?'right':'left' },
  };
}

function whyText(s){
  const v = s.var, up = (s.dir === 'up');
  const arrow = up ? '↑' : '↓';
  const opp   = up ? '↓' : '↑';
  let t = 'Big idea:\n';
  t += '• IS shifts when planned spending changes at a given Y (G, T, c0, I0).\n';
  t += '• LM shifts when real money balances M/P change (P or M).\n';
  t += '• AD is the locus of IS-LM equilibria as P varies. Shocks to G, T, c0, I0, or M shift AD; changes in P move along AD.\n\n';
  if(v === 'G' || v === 'C' || v === 'I'){
    const what = v === 'G' ? 'G (government purchases)' :
                 v === 'C' ? 'c0 (autonomous consumption)' :
                              'I0 (autonomous investment)';
    t += `This scenario changes ${what}.\n`;
    t += `• Planned expenditure rises (or falls), so IS shifts ${up?'right':'left'}.\n`;
    t += `• Y${arrow} raises money demand at every r; we move ${up?'up':'down'} along LM, so r${arrow}.\n`;
    t += `• At every P, equilibrium Y is ${up?'higher':'lower'} → AD shifts ${up?'right':'left'}.\n`;
  } else if(v === 'T'){
    t += 'This scenario changes taxes, which changes consumption.\n';
    t += `• T${arrow} → C${opp} → IS shifts ${up?'left':'right'}.\n`;
    t += `• Y${opp} ⇒ money demand ${up?'falls':'rises'}; move ${up?'down':'up'} along LM, so r${opp}.\n`;
    t += `• At every P, equilibrium Y is ${up?'lower':'higher'} → AD shifts ${up?'left':'right'}.\n`;
  } else if(v === 'P'){
    t += 'This scenario is a change in the price level.\n';
    t += `• P${arrow} ⇒ M/P${opp} ⇒ LM shifts ${up?'up':'down'}; r${arrow}, I${opp}, PE${opp}, Y${opp}.\n`;
    t += '• IS does not shift; the equilibrium moves along IS.\n';
    t += `• In (P,Y) space, a change in P is a movement along AD (${up?'up':'down'}).\n`;
  } else {
    t += 'This scenario is a change in the money supply.\n';
    t += `• M${arrow} ⇒ M/P${arrow} ⇒ LM shifts ${up?'down':'up'}; r${opp}, I${arrow}, PE${arrow}, Y${arrow}.\n`;
    t += '• IS does not shift; the equilibrium moves along IS.\n';
    t += `• At every P, equilibrium Y is ${up?'higher':'lower'} → AD shifts ${up?'right':'left'}.\n`;
  }
  return t;
}

// ── State ──────────────────────────────────────────────────────────────
let _rng = null;
let _fs = 1;
let _scenarioQueue = [];
let _scenarioIdx = -1;            // -1 = none yet started; 0..4 valid
let _currentScenario = null;
let _firstScore = 0;
let _finalScore = 0;
let _scenariosCompleted = 0;
let _firstPredCorrectThisScen = false;
let _firstMechCorrectThisScen = false;
let _predChecked = false;
let _mechChecked = false;
let _predCorrect = false;
let _mechCorrect = false;
let _revealed = false;
let _slotsState = [];
let _keyboardSelectedPill = null;
let _cur = { ...BASE };

const baseEq = equilibrium(BASE);
const baseAD = adCurvePoints(BASE);

// ── Scenario sequence ──────────────────────────────────────────────────
// Lab is unlimited: we keep drawing without replacement, refilling the
// queue (with a fresh shuffle) when it runs out so any single scenario
// doesn't repeat until every other has been seen.
function shufflePool(){
  const rand = _rng || Math.random;
  const pool = SCEN.slice();
  for(let i = pool.length - 1; i > 0; i--){
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}
function buildQueue(){ _scenarioQueue = shufflePool(); }
function nextFromQueue(prev){
  if(_scenarioQueue.length === 0){
    _scenarioQueue = shufflePool();
    // Avoid back-to-back repeat across the refill boundary
    if(prev && _scenarioQueue[0] === prev && _scenarioQueue.length > 1){
      [_scenarioQueue[0], _scenarioQueue[1]] = [_scenarioQueue[1], _scenarioQueue[0]];
    }
  }
  return _scenarioQueue.shift();
}

function makeStamp(){
  const rand = _rng || Math.random;
  const days = ['Mon','Tue','Wed','Thu','Fri'];
  const mns  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d = days[Math.floor(rand()*days.length)];
  const m = mns[Math.floor(rand()*mns.length)];
  const day = 1 + Math.floor(rand()*28);
  const hr  = 7 + Math.floor(rand()*6);
  const min = rand() < 0.5 ? '00' : '30';
  return `${d} ${m} ${day}, ${hr}:${min} AM`;
}

// ── DOM refs ───────────────────────────────────────────────────────────
const els = {
  newBtn:$('newBtn'), resetBtn:$('resetBtn'),
  counterText:$('counterText'),
  scoreReadout:$('scoreReadout'),
  scenStamp:$('scenStamp'), scenHead:$('scenHead'), scenBrief:$('scenBrief'), scenSteps:$('scenSteps'),

  isAction:$('isAction'), isDir:$('isDir'),
  lmAction:$('lmAction'), lmDir:$('lmDir'),
  adAction:$('adAction'), adDir:$('adDir'),
  checkPredBtn:$('checkPredBtn'), whyPredBtn:$('whyPredBtn'),
  predStatus:$('predStatus'), predBadge:$('predBadge'),

  Gslider:$('Gslider'), Tslider:$('Tslider'), Cslider:$('Cslider'),
  Islider:$('Islider'), Pslider:$('Pslider'), Mslider:$('Mslider'),
  Gdisp:$('Gdisp'), Tdisp:$('Tdisp'), Cdisp:$('Cdisp'),
  Idisp:$('Idisp'), Pdisp:$('Pdisp'), Mdisp:$('Mdisp'),

  slots:$('slots'), poolGroups:$('poolGroups'),
  checkMechBtn:$('checkMechBtn'), clearMechBtn:$('clearMechBtn'),
  mechBadge:$('mechBadge'), mechMsg:$('mechMsg'),

  figCanvas:$('figCanvas'),
  mmDesc:$('mmDesc'), islmDesc:$('islmDesc'), adDesc:$('adDesc'),
};

// ── Sliders ────────────────────────────────────────────────────────────
const sliderMap = ()=>({
  G:els.Gslider, T:els.Tslider, C:els.Cslider, I:els.Islider, P:els.Pslider, M:els.Mslider,
});

function applyDefaultRanges(){
  const map = sliderMap();
  for(const k of Object.keys(map)){
    const r = SLIDER_R[k]; const sl = map[k];
    sl.min = String(r.min); sl.max = String(r.max); sl.step = String(r.step);
  }
}
function lockAllSliders(){
  Object.values(sliderMap()).forEach(sl => sl.disabled = true);
}
function resetSlidersToBaseline(){
  _cur = { ...BASE };
  els.Gslider.value = String(BASE.G);
  els.Tslider.value = String(BASE.T);
  els.Cslider.value = String(BASE.C);
  els.Islider.value = String(BASE.I);
  els.Pslider.value = String(BASE.P);
  els.Mslider.value = String(BASE.M);
}
function updateReadouts(){
  els.Gdisp.textContent = fmt0(_cur.G);
  els.Tdisp.textContent = fmt0(_cur.T);
  els.Cdisp.textContent = fmt0(_cur.C);
  els.Idisp.textContent = fmt0(_cur.I);
  els.Pdisp.textContent = fmt1(_cur.P);
  els.Mdisp.textContent = fmt0(_cur.M);
}
function syncCurFromSliders(){
  _cur.G = Number(els.Gslider.value);
  _cur.T = Number(els.Tslider.value);
  _cur.C = Number(els.Cslider.value);
  _cur.I = Number(els.Islider.value);
  _cur.P = Number(els.Pslider.value);
  _cur.M = Number(els.Mslider.value);
}

function unlockOnlyCorrectSlider(){
  lockAllSliders();
  applyDefaultRanges();
  resetSlidersToBaseline();
  updateReadouts();
  redraw();
  if(!_currentScenario || !_predChecked) return;
  const v = _currentScenario.var, dir = _currentScenario.dir;
  const sl = sliderMap()[v]; if(!sl) return;
  const r = SLIDER_R[v];
  sl.disabled = false;
  const baseVal = BASE[v];
  if(dir === 'up'){
    sl.min = String(baseVal); sl.max = String(r.max);
  } else {
    sl.min = String(r.min);   sl.max = String(baseVal);
  }
  sl.value = String(baseVal);
}

// ── Mechanism UI ───────────────────────────────────────────────────────
function resetKeyboardSelection(){
  document.querySelectorAll('.pill.kb-selected').forEach(p => {
    p.classList.remove('kb-selected');
    p.setAttribute('aria-pressed','false');
  });
  _keyboardSelectedPill = null;
}

function makePill(token){
  const d = document.createElement('div');
  d.className = 'pill'; d.textContent = token;
  d.draggable = true; d.tabIndex = 0;
  d.setAttribute('role','button');
  d.setAttribute('aria-pressed','false');
  d.dataset.tok = token;
  d.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', token);
    e.dataTransfer.effectAllowed = 'move';
  });
  d.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      if(_keyboardSelectedPill === token){
        resetKeyboardSelection();
      } else {
        resetKeyboardSelection();
        d.classList.add('kb-selected');
        d.setAttribute('aria-pressed','true');
        _keyboardSelectedPill = token;
      }
    }
  });
  return d;
}

function renderPool(){
  els.poolGroups.innerHTML = '';
  for(const g of PILL_GROUPS){
    const wrap = document.createElement('div');
    wrap.className = 'pool-group';
    const hdr = document.createElement('div');
    hdr.className = 'pool-hdr'; hdr.textContent = g.name;
    wrap.appendChild(hdr);
    const pool = document.createElement('div');
    pool.className = 'pool';
    for(const t of g.pills) pool.appendChild(makePill(t));
    wrap.appendChild(pool);
    els.poolGroups.appendChild(wrap);
  }
}

function setSlotLabel(slot, i, tok){
  slot.setAttribute('aria-label', `Mechanism step ${i+1}: ${tok || 'empty'}`);
}

function renderSlots(len){
  els.slots.innerHTML = '';
  els.slots.setAttribute('aria-label', `Mechanism steps (${len} steps total)`);
  _slotsState = new Array(len).fill(null);
  for(let i = 0; i < len; i++){
    const slot = document.createElement('div');
    slot.className = 'slot'; slot.textContent = 'Drop';
    slot.dataset.idx = String(i);
    slot.tabIndex = 0;
    slot.setAttribute('role','button');
    setSlotLabel(slot, i, null);
    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      const tok = e.dataTransfer.getData('text/plain');
      if(!tok) return;
      placeInSlot(i, slot, tok);
    });
    slot.addEventListener('dblclick', () => clearSlotAt(i, slot));
    slot.addEventListener('keydown', (e) => {
      if((e.key === 'Enter' || e.key === ' ') && _keyboardSelectedPill){
        e.preventDefault();
        placeInSlot(i, slot, _keyboardSelectedPill);
        resetKeyboardSelection();
      } else if((e.key === 'Delete' || e.key === 'Backspace') && _slotsState[i]){
        e.preventDefault();
        clearSlotAt(i, slot);
      }
    });
    els.slots.appendChild(slot);
    if(i < len - 1){
      const arr = document.createElement('span');
      arr.className = 'arrow-tok'; arr.textContent = '→';
      arr.setAttribute('aria-hidden','true');
      els.slots.appendChild(arr);
    }
  }
}

function placeInSlot(i, slot, tok){
  _slotsState[i] = tok;
  slot.classList.add('filled');
  slot.textContent = tok;
  setSlotLabel(slot, i, tok);
  clearMechBadge();
}
function clearSlotAt(i, slot){
  _slotsState[i] = null;
  slot.classList.remove('filled');
  slot.textContent = 'Drop';
  setSlotLabel(slot, i, null);
  clearMechBadge();
}
function clearAllSlots(){
  const children = Array.from(els.slots.querySelectorAll('.slot'));
  for(const s of children) clearSlotAt(Number(s.dataset.idx), s);
  resetKeyboardSelection();
}

function setMechBadge(kind, msg){
  if(!kind){
    els.mechBadge.hidden = true;
    els.mechBadge.className = 'mech-badge';
    els.mechBadge.textContent = '';
    els.mechMsg.textContent = msg || '';
    return;
  }
  els.mechBadge.hidden = false;
  els.mechBadge.className = 'mech-badge ' + kind;
  els.mechBadge.textContent = kind === 'ok' ? '✓ Correct' : '✗ Incorrect';
  els.mechMsg.textContent = msg || '';
}
function clearMechBadge(){ setMechBadge(null, ''); }

function setPredBadge(kind){
  const b = els.predBadge;
  if(!kind){
    b.hidden = true; b.className = 'mech-badge'; b.textContent = '';
    return;
  }
  b.hidden = false;
  b.className = 'mech-badge ' + kind;
  b.textContent = kind === 'ok' ? '✓ Correct' : '✗ Incorrect';
}
function clearPredBadge(){ setPredBadge(null); }

function checkMechanism(){
  if(!_currentScenario){ setMechBadge('bad','Click New Scenario first.'); return; }
  const key = mechKeyFor(_currentScenario.var, _currentScenario.dir);
  const seq = MECH[key];
  if(_slotsState.some(v => v === null)){
    setMechBadge('bad', 'Fill all blanks before checking.');
    return;
  }
  const ok = seq.every((t, i) => _slotsState[i] === t);
  const wasFirstCheck = !_mechChecked;
  _mechChecked = true;
  _mechCorrect = ok;
  if(wasFirstCheck && ok){
    _firstMechCorrectThisScen = true;
    _firstScore += 1;
  }
  if(ok){
    if(!_finalCountedThisScenForMech()){
      _finalScore += 1;
      _mechFinalCounted = true;
    }
    setMechBadge('ok', 'Chain matches the scenario mechanism.');
  } else {
    setMechBadge('bad', 'Not quite. At least one step is out of order or incorrect.');
  }
  maybeRecordScenario();
}

// Track whether we've already counted this scenario's mech in finalScore
// (so retries that go correct still raise finalScore once)
let _mechFinalCounted = false;
function _finalCountedThisScenForMech(){ return _mechFinalCounted; }

// ── Predictions UI ─────────────────────────────────────────────────────
function fillDirOptions(sel, opts){
  sel.innerHTML = '';
  const first = document.createElement('option');
  first.value = ''; first.textContent = 'Direction…';
  sel.appendChild(first);
  for(const [val,label] of opts){
    const o = document.createElement('option');
    o.value = val; o.textContent = label;
    sel.appendChild(o);
  }
}

function updateDirOptions(curve){
  if(curve === 'IS'){
    const act = els.isAction.value;
    if(!act) return fillDirOptions(els.isDir, []);
    if(act === 'shift') return fillDirOptions(els.isDir, [['right','Right'],['left','Left']]);
    return fillDirOptions(els.isDir, [['up','Up along'],['down','Down along']]);
  }
  if(curve === 'LM'){
    const act = els.lmAction.value;
    if(!act) return fillDirOptions(els.lmDir, []);
    if(act === 'shift') return fillDirOptions(els.lmDir, [['up','Up (and left)'],['down','Down (and right)']]);
    return fillDirOptions(els.lmDir, [['up','Up along'],['down','Down along']]);
  }
  if(curve === 'AD'){
    const act = els.adAction.value;
    if(!act) return fillDirOptions(els.adDir, []);
    if(act === 'shift') return fillDirOptions(els.adDir, [['right','Right'],['left','Left']]);
    return fillDirOptions(els.adDir, [['up','Up along'],['down','Down along']]);
  }
}

function initPredictionUI(){
  els.isAction.addEventListener('change', () => { updateDirOptions('IS'); clearPredBadge(); });
  els.lmAction.addEventListener('change', () => { updateDirOptions('LM'); clearPredBadge(); });
  els.adAction.addEventListener('change', () => { updateDirOptions('AD'); clearPredBadge(); });
  [els.isDir, els.lmDir, els.adDir].forEach(sel =>
    sel.addEventListener('change', clearPredBadge));
  updateDirOptions('IS'); updateDirOptions('LM'); updateDirOptions('AD');
}

function predComplete(){
  return [els.isAction.value, els.isDir.value, els.lmAction.value, els.lmDir.value,
          els.adAction.value, els.adDir.value].every(v => (v||'').trim() !== '');
}

function checkPrediction(){
  if(!_currentScenario){ els.predStatus.textContent = 'Click New Scenario first.'; return; }
  if(!predComplete()){
    els.predStatus.textContent = 'Answer all six prediction dropdowns first.';
    return;
  }
  const exp = expectedPrediction(_currentScenario);
  const got = {
    IS: { action: els.isAction.value, dir: els.isDir.value },
    LM: { action: els.lmAction.value, dir: els.lmDir.value },
    AD: { action: els.adAction.value, dir: els.adDir.value },
  };
  const ok = got.IS.action===exp.IS.action && got.IS.dir===exp.IS.dir
          && got.LM.action===exp.LM.action && got.LM.dir===exp.LM.dir
          && got.AD.action===exp.AD.action && got.AD.dir===exp.AD.dir;
  const wasFirstCheck = !_predChecked;
  _predChecked = true;
  _predCorrect = ok;
  _revealed = false;
  if(wasFirstCheck && ok){
    _firstPredCorrectThisScen = true;
    _firstScore += 1;
  }
  if(ok && !_predFinalCounted){
    _finalScore += 1;
    _predFinalCounted = true;
  }
  setPredBadge(ok ? 'ok' : 'bad');
  els.predStatus.textContent = ok
    ? 'The matching slider is now unlocked — move it in the allowed direction to see the result.'
    : 'Click Why? for the explanation. The correct slider is unlocked in the correct direction so you can see what actually happens.';
  unlockOnlyCorrectSlider();
  maybeRecordScenario();
}
let _predFinalCounted = false;

function whyPrediction(){
  if(!_currentScenario){ els.predStatus.textContent = 'Click New Scenario first.'; return; }
  els.predStatus.textContent = whyText(_currentScenario);
}

// ── Slider input + reveal ──────────────────────────────────────────────
function onSliderInput(){
  if(!_predChecked) return;
  syncCurFromSliders();
  if(!_revealed && _currentScenario){
    const v = _currentScenario.var, baseVal = BASE[v], curVal = _cur[v];
    if(_currentScenario.dir === 'up'   && curVal > baseVal + 1e-9) _revealed = true;
    if(_currentScenario.dir === 'down' && curVal < baseVal - 1e-9) _revealed = true;
  }
  updateReadouts();
  redraw();
}

// ── Canvas helpers ─────────────────────────────────────────────────────
function setupCanvas(canvas){
  const wrap = canvas.parentNode;
  const dpr = window.devicePixelRatio || 1;
  const rect = wrap.getBoundingClientRect();
  const W = Math.round(rect.width * dpr);
  const H = Math.round(rect.height * dpr);
  if(!W || !H) return null;
  if(canvas.width !== W || canvas.height !== H){
    canvas.width = W; canvas.height = H;
  }
  return { ctx: canvas.getContext('2d'), dpr, W, H };
}
function tickStep(mx){
  if(mx<=10) return 1; if(mx<=20) return 2; if(mx<=50) return 5;
  if(mx<=100) return 10; if(mx<=200) return 20; if(mx<=500) return 50;
  return 100;
}
function unclip(ctx){ ctx.restore(); }
function strokeLine(ctx, x1, y1, x2, y2, color, width, dpr, dash){
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = width*dpr;
  ctx.setLineDash((dash||[]).map(d => d*dpr));
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  ctx.restore();
}
function drawDot(ctx, x, y, color, r, dpr){
  ctx.save();
  ctx.fillStyle = color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5*dpr;
  ctx.beginPath(); ctx.arc(x, y, r*dpr, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// Letter label next to an equilibrium dot. White halo for legibility on
// either light or curve-colored backgrounds.
function drawLetter(ctx, x, y, text, color, dpr, dx, dy){
  ctx.save();
  ctx.font = `800 ${Math.round(12 * dpr * _fs)}px "Inter",sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const px = x + (dx == null ? 9 : dx) * dpr;
  const py = y + (dy == null ? -9 : dy) * dpr;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5 * dpr;
  ctx.strokeText(text, px, py);
  ctx.fillStyle = color;
  ctx.fillText(text, px, py);
  ctx.restore();
}

const COLOR_BASE = '#2f5d7c';     // accent — baseline (dashed)
const COLOR_GOOD = '#155c38';     // current — solid (used in all cases)

// ── Unified four-quadrant figure ───────────────────────────────────────
const GUIDE = '#8c4800';   // amber — 6.3:1 on white (WCAG AA)

// Draw one panel's frame (background, gridlines, ticks, axes, titles). Empty
// axis-label strings are skipped — used for the inner IS-LM panel whose axes
// are shared with (and labelled on) its neighbours.
function drawPanelFrame(ctx, pl, dpr, xMax, yMax, xLabel, yLabel, title){
  const PW = pl.r - pl.l, PH = pl.b - pl.t;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(pl.l, pl.t, PW, PH);
  ctx.fillStyle = '#596878';
  ctx.font = `400 ${Math.round(9*dpr*_fs)}px "Inter",sans-serif`;
  ctx.strokeStyle = '#e7dfd2'; ctx.lineWidth = 1*dpr;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  const yStep = tickStep(yMax);
  for(let y = 0; y <= yMax + 1e-6; y += yStep){
    const py = pl.b - (y/yMax)*PH;
    ctx.beginPath(); ctx.moveTo(pl.l, py); ctx.lineTo(pl.r, py); ctx.stroke();
    ctx.fillText(String(Math.round(y)), pl.l - 4*dpr, py);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const xStep = tickStep(xMax);
  for(let x = 0; x <= xMax + 1e-6; x += xStep){
    const px = pl.l + (x/xMax)*PW;
    ctx.beginPath(); ctx.moveTo(px, pl.t); ctx.lineTo(px, pl.b); ctx.stroke();
    ctx.fillText(String(Math.round(x)), px, pl.b + 4*dpr);
  }
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1.2*dpr;
  ctx.beginPath();
  ctx.moveTo(pl.l, pl.t); ctx.lineTo(pl.l, pl.b); ctx.lineTo(pl.r, pl.b);
  ctx.stroke();
  ctx.fillStyle = '#374151';
  ctx.font = `700 ${Math.round(9.5*dpr*_fs)}px "Inter",sans-serif`;
  if(xLabel){
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(xLabel, pl.l + PW/2, pl.b + 24*dpr);
  }
  if(yLabel){
    ctx.save();
    ctx.translate(pl.l - 28*dpr, pl.t + PH/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }
  ctx.fillStyle = '#2f5d7c';
  ctx.font = `800 ${Math.round(10*dpr*_fs)}px "Inter",sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(title, pl.l, pl.t - 5*dpr);
}

function clipRect(ctx, pl){
  ctx.save();
  ctx.beginPath();
  ctx.rect(pl.l, pl.t, pl.r - pl.l, pl.b - pl.t);
  ctx.clip();
}

function drawReadingGuide(ctx, dpr, cx, cy){
  const x = cx + 8*dpr;
  let y = cy + 20*dpr;
  const lh = 18*dpr;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#2f5d7c';
  ctx.font = `800 ${Math.round(10*dpr*_fs)}px "Inter",sans-serif`;
  ctx.fillText('HOW TO READ THIS FIGURE', x, y);
  y += lh*1.2;
  ctx.font = `600 ${Math.round(9.5*dpr*_fs)}px "Inter",sans-serif`;
  const lines = [
    ['#2f5d7c', 'Dashed A = baseline.'],
    ['#155c38', 'Solid B = after the shock.'],
    ['#374151', 'r is shared: Money Market and IS–LM.'],
    ['#374151', 'Y is shared: IS–LM and AD.'],
    ['#8c4800', 'Amber guides carry r and Y between them.'],
    ['#374151', 'Move the unlocked slider to reveal B.'],
  ];
  for(const [col, txt] of lines){ ctx.fillStyle = col; ctx.fillText(txt, x, y); y += lh; }
}

// ── Unified four-quadrant figure ───────────────────────────────────────
// One canvas holds all three plots arranged so the shared axes line up:
//   • Money Market (top-left) and IS-LM (top-right) share the r axis — same
//     vertical scale at the same screen height.
//   • IS-LM (top-right) and AD (bottom-right) share the Y axis — same
//     horizontal scale at the same screen x.
// Amber dashed guides carry the live equilibrium's r across the top row and Y
// down the right column. Dashed = baseline (A); solid = after reveal (B).
function drawFigure(){
  const s = setupCanvas(els.figCanvas); if(!s) return;
  const { ctx, dpr, W, H } = s;
  ctx.clearRect(0,0,W,H);

  const OM  = 6*dpr, GX = 18*dpr, GY = 18*dpr;
  const AXL = 42*dpr, AXR = 12*dpr, AXT = 20*dpr, AXB = 34*dpr;
  const colW = (W - 2*OM - GX) / 2;
  const rowH = (H - 2*OM - GY) / 2;
  const cellX0 = OM, cellX1 = OM + colW + GX;
  const cellY0 = OM, cellY1 = OM + rowH + GY;
  const plotIn = (cx, cy) => ({
    l: cx + AXL, r: cx + colW - AXR, t: cy + AXT, b: cy + rowH - AXB
  });
  const pMM = plotIn(cellX0, cellY0);   // money market (top-left)
  const pIS = plotIn(cellX1, cellY0);   // IS-LM        (top-right)
  const pAD = plotIn(cellX1, cellY1);   // AD           (bottom-right)

  // Shared transforms: rY serves MM+IS-LM (same t/b); yX serves IS-LM+AD (same l/r).
  const rY  = r => pIS.b - (r/RANGE.r)   * (pIS.b - pIS.t);
  const mmX = v => pMM.l + (v/RANGE.MP)  * (pMM.r - pMM.l);
  const yX  = Y => pIS.l + (Y/RANGE.Y)   * (pIS.r - pIS.l);
  const adY = P => pAD.b - (P/RANGE.AD_P)* (pAD.b - pAD.t);

  const e0 = baseEq;
  const rev = _revealed;
  const e = rev ? equilibrium(_cur) : null;

  // ── MONEY MARKET (top-left) ──────────────────────────────────────────
  drawPanelFrame(ctx, pMM, dpr, RANGE.MP, RANGE.r,
                 'Real money balances M/P', 'Interest rate r', 'MONEY MARKET');
  clipRect(ctx, pMM);
  strokeLine(ctx, mmX(e0.MP), rY(0), mmX(e0.MP), rY(RANGE.r), COLOR_BASE, 2.0, dpr, [6,4]);
  strokeLine(ctx, mmX(0), rY((MDY*e0.Y)/MDR),
                  mmX(RANGE.MP), rY((MDY*e0.Y - RANGE.MP)/MDR), COLOR_BASE, 2.0, dpr, [6,4]);
  drawDot(ctx, mmX(e0.MP), rY(e0.r), COLOR_BASE, 5, dpr);
  if(rev){
    // Both curves reflect the new equilibrium. Real money supply (M/P) shifts
    // only if P or M changed, but money demand depends on income Y — and Y
    // changes for every shock — so the MD line shifts whenever equilibrium
    // output moves. B is their intersection, so it always sits on the new MD.
    strokeLine(ctx, mmX(e.MP), rY(0), mmX(e.MP), rY(RANGE.r), COLOR_GOOD, 2.8, dpr);
    strokeLine(ctx, mmX(0), rY((MDY*e.Y)/MDR),
                    mmX(RANGE.MP), rY((MDY*e.Y - RANGE.MP)/MDR), COLOR_GOOD, 2.8, dpr);
    drawDot(ctx, mmX(e.MP), rY(e.r), COLOR_GOOD, 6, dpr);
  }
  unclip(ctx);
  drawLetter(ctx, mmX(e0.MP), rY(e0.r), 'A', COLOR_BASE, dpr);
  if(rev) drawLetter(ctx, mmX(e.MP), rY(e.r), 'B', COLOR_GOOD, dpr);
  ctx.fillStyle = COLOR_BASE;
  ctx.font = `700 ${Math.round(9.5*dpr*_fs)}px "Inter",sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  if(mmX(e0.MP) + 4*dpr < pMM.r) ctx.fillText('MS', mmX(e0.MP) + 4*dpr, rY(RANGE.r*0.95));
  const mdY = (MDY*e0.Y - RANGE.MP*0.06) / MDR;
  if(mdY > 0 && mdY < RANGE.r){
    ctx.textBaseline = 'top';
    ctx.fillText('MD', mmX(RANGE.MP*0.06), rY(mdY) + 4*dpr);
  }

  // ── IS-LM (top-right) — axis titles omitted (shared, labelled on neighbours) ─
  drawPanelFrame(ctx, pIS, dpr, RANGE.Y, RANGE.r, '', '', 'IS–LM');
  clipRect(ctx, pIS);
  strokeLine(ctx, yX(0), rY(e0.alphaIS),
                  yX(RANGE.Y), rY(e0.alphaIS - e0.betaIS*RANGE.Y), COLOR_BASE, 2.0, dpr, [6,4]);
  strokeLine(ctx, yX(0), rY((MDY*0 - BASE.M/BASE.P)/MDR),
                  yX(RANGE.Y), rY((MDY*RANGE.Y - BASE.M/BASE.P)/MDR), COLOR_BASE, 2.0, dpr, [6,4]);
  drawDot(ctx, yX(e0.Y), rY(e0.r), COLOR_BASE, 5, dpr);
  if(rev){
    strokeLine(ctx, yX(0), rY(e.alphaIS),
                    yX(RANGE.Y), rY(e.alphaIS - e.betaIS*RANGE.Y), COLOR_GOOD, 2.8, dpr);
    strokeLine(ctx, yX(0), rY((MDY*0 - _cur.M/_cur.P)/MDR),
                    yX(RANGE.Y), rY((MDY*RANGE.Y - _cur.M/_cur.P)/MDR), COLOR_GOOD, 2.8, dpr);
    drawDot(ctx, yX(clamp(e.Y,0,RANGE.Y)), rY(clamp(e.r,0,RANGE.r)), COLOR_GOOD, 6, dpr);
  }
  unclip(ctx);
  drawLetter(ctx, yX(e0.Y), rY(e0.r), 'A', COLOR_BASE, dpr);
  if(rev) drawLetter(ctx, yX(clamp(e.Y,0,RANGE.Y)), rY(clamp(e.r,0,RANGE.r)), 'B', COLOR_GOOD, dpr);
  ctx.fillStyle = COLOR_BASE;
  ctx.font = `700 ${Math.round(9.5*dpr*_fs)}px "Inter",sans-serif`;
  ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  const isLbl = e0.alphaIS - e0.betaIS*RANGE.Y*0.92;
  if(isLbl > 0 && isLbl < RANGE.r) ctx.fillText('IS', yX(RANGE.Y*0.92) - 2*dpr, rY(isLbl) + 4*dpr);
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  const lmLbl = (MDY*RANGE.Y*0.92 - BASE.M/BASE.P) / MDR;
  if(lmLbl > 0 && lmLbl < RANGE.r) ctx.fillText('LM', yX(RANGE.Y*0.92) + 2*dpr, rY(lmLbl) - 2*dpr);

  // ── AGGREGATE DEMAND (bottom-right) ──────────────────────────────────
  drawPanelFrame(ctx, pAD, dpr, RANGE.Y, RANGE.AD_P,
                 'Output Y', 'Price level P', 'AGGREGATE DEMAND');
  clipRect(ctx, pAD);
  const drawADCurve = (pts, color, width, dash) => {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = width*dpr;
    ctx.setLineDash((dash||[]).map(d => d*dpr));
    ctx.beginPath();
    let started = false;
    for(const pt of pts){
      if(pt.Y < 0 || pt.Y > RANGE.Y || pt.P < 0 || pt.P > RANGE.AD_P){ started = false; continue; }
      const x = yX(pt.Y), y = adY(pt.P);
      if(!started){ ctx.moveTo(x,y); started = true; } else ctx.lineTo(x,y);
    }
    ctx.stroke(); ctx.restore();
  };
  drawADCurve(baseAD, COLOR_BASE, 2.0, [6,4]);
  drawDot(ctx, yX(e0.Y), adY(BASE.P), COLOR_BASE, 5, dpr);
  if(rev){
    drawADCurve(adCurvePoints(_cur), COLOR_GOOD, 2.8, []);
    drawDot(ctx, yX(clamp(e.Y,0,RANGE.Y)), adY(clamp(_cur.P,0,RANGE.AD_P)), COLOR_GOOD, 6, dpr);
  }
  unclip(ctx);
  drawLetter(ctx, yX(e0.Y), adY(BASE.P), 'A', COLOR_BASE, dpr);
  if(rev) drawLetter(ctx, yX(clamp(e.Y,0,RANGE.Y)), adY(clamp(_cur.P,0,RANGE.AD_P)), 'B', COLOR_GOOD, dpr);
  ctx.fillStyle = COLOR_BASE;
  ctx.font = `800 ${Math.round(10*dpr*_fs)}px "Inter",sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const labP = 1.5, labY = e0.alpha + e0.beta/labP;
  if(labY > 0 && labY < RANGE.Y) ctx.fillText('AD', yX(labY) + 6*dpr, adY(labP));

  // ── Shared-axis guides (amber) — track the live equilibrium ──────────
  const gEq = rev ? e : e0;
  const gP  = rev ? _cur.P : BASE.P;
  const gY  = clamp(gEq.Y, 0, RANGE.Y);
  const gr  = clamp(gEq.r, 0, RANGE.r);
  const grPx = rY(gr);
  strokeLine(ctx, mmX(clamp(gEq.MP,0,RANGE.MP)), grPx, yX(gY), grPx, GUIDE, 1.6, dpr, [6,4]);
  strokeLine(ctx, yX(gY), grPx, yX(gY), adY(clamp(gP,0,RANGE.AD_P)), GUIDE, 1.6, dpr, [6,4]);
  ctx.fillStyle = GUIDE;
  ctx.font = `800 ${Math.round(10*dpr*_fs)}px "Inter",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText(`r = ${fmt2(gEq.r)}`, (pMM.r + pIS.l)/2, grPx - 3*dpr);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(`Y = ${fmt0(gEq.Y)}`, yX(gY) + 5*dpr, (pIS.b + pAD.t)/2);

  // Redraw the live equilibrium dots on top of the guides.
  const liveColor = rev ? COLOR_GOOD : COLOR_BASE, liveR = rev ? 6 : 5;
  drawDot(ctx, mmX(clamp(gEq.MP,0,RANGE.MP)), grPx, liveColor, liveR, dpr);
  drawDot(ctx, yX(gY), grPx, liveColor, liveR, dpr);
  drawDot(ctx, yX(gY), adY(clamp(gP,0,RANGE.AD_P)), liveColor, liveR, dpr);

  drawReadingGuide(ctx, dpr, cellX0, cellY1);
}


// ── Descriptions ──────────────────────────────────────────────────────
function updateDescs(){
  const e0 = baseEq;
  const baseStr = `Baseline at Y=${fmt0(e0.Y)}, r=${fmt2(e0.r)}, M/P=${fmt0(e0.MP)}, P=${fmt1(BASE.P)}.`;
  if(!_currentScenario){
    els.mmDesc.textContent = `Money market diagram. ${baseStr} No scenario loaded yet.`;
    els.islmDesc.textContent = `IS-LM diagram. ${baseStr} No scenario loaded yet.`;
    els.adDesc.textContent = `Aggregate demand diagram. Baseline AD with α=${fmt2(e0.alpha)}, β=${fmt2(e0.beta)}. No scenario loaded yet.`;
    return;
  }
  if(!_revealed){
    els.mmDesc.textContent =
      `Money market diagram. ${baseStr} Scenario: ${_currentScenario.head}. ` +
      `Move the unlocked slider to reveal the new money-market equilibrium.`;
    els.islmDesc.textContent =
      `IS-LM diagram. ${baseStr} Scenario: ${_currentScenario.head}. ` +
      `Move the unlocked slider to reveal the new IS-LM equilibrium.`;
    els.adDesc.textContent =
      `Aggregate demand diagram. Baseline AD curve (dashed) with α=${fmt2(e0.alpha)}, β=${fmt2(e0.beta)}. ` +
      `Scenario: ${_currentScenario.head}. Move the unlocked slider to reveal the new AD curve.`;
    return;
  }
  const e = equilibrium(_cur);
  const msMoved = Math.abs(e.MP - e0.MP) > 1e-6;
  const shifted =
    `Real money supply ${msMoved
      ? `shifted from M/P=${fmt0(e0.MP)} to M/P=${fmt2(e.MP)}`
      : `is unchanged at M/P=${fmt0(e0.MP)}`}; ` +
    `money demand shifted as income Y changed from ${fmt0(e0.Y)} to ${fmt2(e.Y)}.`;
  els.mmDesc.textContent =
    `Money market diagram. Baseline (dashed) equilibrium at A: M/P=${fmt0(e0.MP)}, r=${fmt2(e0.r)}. ` +
    `${shifted} New equilibrium at B: r=${fmt2(e.r)}.`;
  els.islmDesc.textContent =
    `IS-LM diagram. Baseline (dashed) equilibrium Y=${fmt0(e0.Y)}, r=${fmt2(e0.r)}. ` +
    `Current (solid) equilibrium Y=${fmt2(e.Y)}, r=${fmt2(e.r)}. ` +
    `IS ${e.alphaIS!==e0.alphaIS?'shifted':'unchanged'}; LM ${e.beta!==e0.beta||_cur.P!==BASE.P?'shifted':'unchanged'}.`;
  els.adDesc.textContent =
    `Aggregate demand diagram. Baseline AD (dashed) Y=${fmt2(e0.alpha)}+${fmt2(e0.beta)}/P. ` +
    `Current AD (solid) Y=${fmt2(e.alpha)}+${fmt2(e.beta)}/P. ` +
    `Current point P=${fmt1(_cur.P)}, Y=${fmt2(e.Y)}.`;
}

// ── Master redraw ─────────────────────────────────────────────────────
function redraw(){
  _fs = Math.max(0.75, Math.min(2.5,
    parseFloat(getComputedStyle(document.documentElement).fontSize) / 16));
  drawFigure();
  updateDescs();
}

// ── Recording ─────────────────────────────────────────────────────────
function maybeRecordScenario(){
  // Wait until both predictions AND mechanism have been checked at least once.
  if(!_predChecked || !_mechChecked) return;
  if(_currentScenario._recorded) return;
  _currentScenario._recorded = true;
  _scenariosCompleted += 1;

  const qIndex = _scenarioIdx;
  const qText  = `[${_currentScenario.var}${_currentScenario.dir==='up'?'↑':'↓'}] ${_currentScenario.head}`;
  const firstCorrect = _firstPredCorrectThisScen && _firstMechCorrectThisScen;
  const finalCorrect = _predCorrect && _mechCorrect;
  const firstAns = `Predictions ${_firstPredCorrectThisScen?'✓':'✗'} · Mechanism ${_firstMechCorrectThisScen?'✓':'✗'}`;
  const finalAns = `Predictions ${_predCorrect?'✓':'✗'} · Mechanism ${_mechCorrect?'✓':'✗'}`;
  if(window.Session && Session.recordQuestion){
    Session.recordQuestion(LAB_ID, qIndex, qText,
      firstAns, firstCorrect, finalAns, finalCorrect);
  }
  // Update the running lab-done tally after every recorded scenario, so the
  // session reflects the current cumulative score regardless of when the
  // student stops.
  if(window.Session && Session.recordLabDone){
    Session.recordLabDone(LAB_ID, LAB_LABEL, _firstScore, _finalScore, _scenariosCompleted * 2);
  }
  updateScoreReadout();
}

function updateScoreReadout(){
  if(!els.scoreReadout) return;
  if(_scenariosCompleted === 0){
    els.scoreReadout.textContent = '';
    return;
  }
  const total = _scenariosCompleted * 2;
  els.scoreReadout.textContent =
    `Score: ${_finalScore} of ${total}` +
    ` (first-attempt: ${_firstScore} of ${total})`;
}

// ── Scenario lifecycle ────────────────────────────────────────────────
function resetScenarioState(){
  applyDefaultRanges();
  resetSlidersToBaseline();
  lockAllSliders();
  updateReadouts();
  _slotsState = [];
  _predChecked = false; _mechChecked = false;
  _predCorrect = false; _mechCorrect = false;
  _firstPredCorrectThisScen = false; _firstMechCorrectThisScen = false;
  _predFinalCounted = false; _mechFinalCounted = false;
  _revealed = false;
  resetKeyboardSelection();
  clearMechBadge();
  clearPredBadge();
  els.predStatus.textContent = '';
  els.isAction.value = ''; els.lmAction.value = ''; els.adAction.value = '';
  updateDirOptions('IS'); updateDirOptions('LM'); updateDirOptions('AD');
  els.isDir.value = ''; els.lmDir.value = ''; els.adDir.value = '';
  redraw();
}

function newScenario(){
  const prevPick = _currentScenario;
  resetScenarioState();
  _scenarioIdx += 1;
  const pick = nextFromQueue(prevPick);
  _currentScenario = { ...pick, stamp: makeStamp(), _recorded: false };
  // UI
  els.scenStamp.textContent = `${_currentScenario.stamp} • ${_currentScenario.src}`;
  els.scenHead.textContent  = _currentScenario.head;
  els.scenBrief.textContent = _currentScenario.brief;
  els.scenSteps.textContent = 'Step 1: Predict IS, LM, AD and click Check predictions. Step 2: Build the mechanism. Step 3: Move the unlocked slider to see the result.';
  updateCounter();
  renderPool();
  const seq = MECH[mechKeyFor(_currentScenario.var, _currentScenario.dir)];
  renderSlots(seq.length);
  redraw();
}

function updateCounter(){
  const n = _scenarioIdx < 0 ? '—' : String(_scenarioIdx + 1);
  els.counterText.textContent = n;
}

function resetCurrentScenarioUI(){
  // Clear the current scenario's UI state but DO NOT reset scenario counter
  // or recorded scores. Per spec.
  if(!_currentScenario){
    els.scenHead.textContent = 'Click “New Scenario” to start.';
    return;
  }
  // Pretend we never checked anything for this scenario.
  _currentScenario._recorded = false;
  resetScenarioState();
  // Re-render slots/pool (preserve current scenario text)
  renderPool();
  const seq = MECH[mechKeyFor(_currentScenario.var, _currentScenario.dir)];
  renderSlots(seq.length);
}

// ── Wire events ───────────────────────────────────────────────────────
els.newBtn.addEventListener('click', newScenario);
els.resetBtn.addEventListener('click', resetCurrentScenarioUI);
els.checkPredBtn.addEventListener('click', checkPrediction);
els.whyPredBtn.addEventListener('click', whyPrediction);
els.checkMechBtn.addEventListener('click', checkMechanism);
els.clearMechBtn.addEventListener('click', clearAllSlots);
[els.Gslider, els.Tslider, els.Cslider, els.Islider, els.Pslider, els.Mslider]
  .forEach(sl => sl.addEventListener('input', onSliderInput));

let _resizeTimer;
function scheduleRedraw(){
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(redraw, 80);
}
window.addEventListener('resize', scheduleRedraw);

// A ResizeObserver catches container size changes that never fire a window
// `resize` event (a collapsed pane/iframe/embed that later expands, a late
// reflow) — without it a canvas drawn at the wrong size stays stretched.
if(window.ResizeObserver && els.figCanvas){
  const ro = new ResizeObserver(scheduleRedraw);
  ro.observe(els.figCanvas.parentNode);
}

// ── Init ──────────────────────────────────────────────────────────────
function init(){
  if(window.Session && Session.rngForLab) _rng = Session.rngForLab(LAB_ID);
  buildQueue();
  applyDefaultRanges();
  lockAllSliders();
  resetSlidersToBaseline();
  updateReadouts();
  initPredictionUI();
  updateCounter();
  redraw();
  setTimeout(redraw, 80);
}
init();

})();
