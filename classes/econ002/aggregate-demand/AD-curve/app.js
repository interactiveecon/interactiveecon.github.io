(() => {
  const $ = (id) => document.getElementById(id);

  // -----------------------
  // KaTeX render (safe)
  // -----------------------
  function typeset(el) {
    if (!el) return;
    if (!window.renderMathInElement) {
      setTimeout(() => typeset(el), 60);
      return;
    }
    window.renderMathInElement(el, {
      delimiters: [
        { left: "\\(", right: "\\)", display: false },
        { left: "$", right: "$", display: false },
        { left: "\\[", right: "\\]", display: true },
        { left: "$$", right: "$$", display: true },
      ],
      throwOnError: false,
    });
  }

  // -----------------------
  // MODEL (wider slider ranges + slightly stronger sensitivities)
  // -----------------------
  const M = {
    isfr: { Ymin: 0, Ymax: 200, rmin: 0, rmax: 20 },
    ad: { Ymin: 0, Ymax: 200, Pmin: 2.5, Pmax: 7.5 },

    base: { G: 100, T: 100, C: 100, I: 100, P: 5, Z: 5 },

    // IS: r = aIS - bIS*Y + shifters
    IS: { aIS: 16, bIS: 0.06, gG: 0.08, gT: 0.08, gC: 0.08, gI: 0.08 },

    // FR: r = aFR + bFR*Y + hP*(P-P0) + hZ*(Z-Z0)
    FR: { aFR: 2, bFR: 0.04, hP: 2.4, hZ: 2.4 },

    ranges: {
      G: { min: 60, max: 140, step: 1 },
      T: { min: 60, max: 140, step: 1 },
      C: { min: 60, max: 140, step: 1 },
      I: { min: 60, max: 140, step: 1 },
      P: { min: 2.5, max: 7.5, step: 0.1 },
      Z: { min: 2.5, max: 7.5, step: 0.1 },
    },
  };

  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const approxEq = (x, y, tol) => Math.abs(x - y) <= tol;

  function IS_r(Y, G, T, C, I) {
    const { aIS, bIS, gG, gT, gC, gI } = M.IS;
    const { G: G0, T: T0, C: C0, I: I0 } = M.base;
    return aIS - bIS * Y + gG * (G - G0) - gT * (T - T0) + gC * (C - C0) + gI * (I - I0);
  }

  function FR_r(Y, P, Z) {
    const { aFR, bFR, hP, hZ } = M.FR;
    const { P: P0, Z: Z0 } = M.base;
    return aFR + bFR * Y + hP * (P - P0) + hZ * (Z - Z0);
  }

  // Clamped equilibrium for drawing point/IS-FR canvas (so points stay on chart)
  function eqm(G, T, C, I, P, Z) {
    const A0 = IS_r(0, G, T, C, I);
    const C0 = FR_r(0, P, Z);
    const denom = M.IS.bIS + M.FR.bFR;

    let Y = (A0 - C0) / denom;
    Y = clamp(Y, M.isfr.Ymin, M.isfr.Ymax);
    const r = FR_r(Y, P, Z);
    return { Y, r };
  }

  // Unclamped equilibrium for AD curve generation (prevents vertical “sticking”)
  function eqmUnclamped(G, T, C, I, P, Z) {
    const A0 = IS_r(0, G, T, C, I);
    const C0 = FR_r(0, P, Z);
    const denom = M.IS.bIS + M.FR.bFR;

    const Y = (A0 - C0) / denom; // no clamp
    const r = FR_r(Y, P, Z);
    return { Y, r };
  }

  // Use unclamped Y for AD curve; we will clip at draw time
  function buildADCurve({ G, T, C, I, Z }, n = 70) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const P = M.ad.Pmin + (M.ad.Pmax - M.ad.Pmin) * (i / n);
      const { Y } = eqmUnclamped(G, T, C, I, P, Z);
      pts.push({ Y, P });
    }
    return pts;
  }

  // -----------------------
  // TOKENS + MECHANISMS
  // -----------------------
  const TOK = {
    Gup: "G↑",
    Gdn: "G↓",
    Tup: "T↑",
    Tdn: "T↓",
    Cup: "C↑",
    Cdn: "C↓",
    Iup: "I↑",
    Idn: "I↓",
    Pup: "P↑",
    Pdn: "P↓",
    Zup: "Z↑",
    Zdn: "Z↓",
    PEup: "PE↑",
    PEdn: "PE↓",
    UInvUp: "Unplanned Inventories↑",
    UInvDn: "Unplanned Inventories↓",
    Yup: "Y↑",
    Ydn: "Y↓",
    FFup: "FF↑",
    FFdn: "FF↓",
    rup: "r↑",
    rdn: "r↓",
  };

  const MECH = {
    // Government purchases:
    G_up: [TOK.Gup, TOK.PEup, TOK.UInvDn, TOK.Yup, TOK.FFup, TOK.rup],
    G_dn: [TOK.Gdn, TOK.PEdn, TOK.UInvUp, TOK.Ydn, TOK.FFdn, TOK.rdn],

    // Taxes:
    T_dn: [TOK.Tdn, TOK.Cup, TOK.PEup, TOK.UInvDn, TOK.Yup, TOK.FFup, TOK.rup],
    T_up: [TOK.Tup, TOK.Cdn, TOK.PEdn, TOK.UInvUp, TOK.Ydn, TOK.FFdn, TOK.rdn],

    // Price Level:
    P_up: [TOK.Pup, TOK.FFup, TOK.rup, TOK.Idn, TOK.PEdn, TOK.UInvUp, TOK.Ydn],
    P_dn: [TOK.Pdn, TOK.FFdn, TOK.rdn, TOK.Iup, TOK.PEup, TOK.UInvDn, TOK.Yup],

    // Z:
    Z_up: [TOK.Zup, TOK.FFup, TOK.rup, TOK.Idn, TOK.PEdn, TOK.UInvUp, TOK.Ydn],
    Z_dn: [TOK.Zdn, TOK.FFdn, TOK.rdn, TOK.Iup, TOK.PEup, TOK.UInvDn, TOK.Yup],

    // Consumption shocks:
    C_up: [TOK.Cup, TOK.PEup, TOK.UInvDn, TOK.Yup, TOK.FFup, TOK.rup],
    C_dn: [TOK.Cdn, TOK.PEdn, TOK.UInvUp, TOK.Ydn, TOK.FFdn, TOK.rdn],

    // Investment shocks:
    I_dn: [TOK.Idn, TOK.PEdn, TOK.UInvUp, TOK.Ydn, TOK.FFdn, TOK.rdn],
    I_up: [TOK.Iup, TOK.PEup, TOK.UInvDn, TOK.Yup, TOK.FFup, TOK.rup],
  };

  const PILL_GROUPS = [
    { name: "Government Purchases", pills: [TOK.Gup, TOK.Gdn] },
    { name: "Taxes", pills: [TOK.Tup, TOK.Tdn] },
    { name: "Consumption", pills: [TOK.Cup, TOK.Cdn] },
    { name: "Investment", pills: [TOK.Iup, TOK.Idn] },
    { name: "Price Level", pills: [TOK.Pup, TOK.Pdn] },
    { name: "Other Factors (Z)", pills: [TOK.Zup, TOK.Zdn] },
    { name: "Planned Expenditure", pills: [TOK.PEup, TOK.PEdn] },
    { name: "Unplanned Inventories", pills: [TOK.UInvUp, TOK.UInvDn] },
    { name: "Output", pills: [TOK.Yup, TOK.Ydn] },
    { name: "Federal Funds Rate", pills: [TOK.FFup, TOK.FFdn] },
    { name: "Interest Rate", pills: [TOK.rup, TOK.rdn] },
  ];

  const mechKeyFor = (varName, dir) => `${varName}_${dir === "up" ? "up" : "dn"}`;

  // -----------------------
  // Expanded scenarios (~60), with clearer G “government buys goods/services”
  // -----------------------
  const SCEN = [
    // G up
    { var:"G", dir:"up", source:"Congress", headline:"Emergency infrastructure package approved", brief:"Federal agencies increase purchases of construction and equipment." },
    { var:"G", dir:"up", source:"Defense Dept.", headline:"Defense procurement expanded", brief:"The government buys more goods and services this quarter." },
    { var:"G", dir:"up", source:"White House", headline:"Federal contract awards accelerate", brief:"New government contracts raise purchases of goods and services." },
    { var:"G", dir:"up", source:"FEMA", headline:"Disaster response ramps up purchases", brief:"Federal agencies increase purchases for logistics and reconstruction." },
    { var:"G", dir:"up", source:"Public Sector", headline:"Public health program expands staffing and supplies", brief:"Government purchases of services increase." },
    { var:"G", dir:"up", source:"State & Local", headline:"State and local governments accelerate public works", brief:"Public purchases rise as projects move forward." },
    { var:"G", dir:"up", source:"Congress", headline:"Large federal procurement initiative announced", brief:"Federal purchases of goods and contracted services rise." },
    { var:"G", dir:"up", source:"Policy Desk", headline:"Infrastructure projects move from planning to spending", brief:"Government purchases increase over the next quarter." },
    { var:"G", dir:"up", source:"Public Sector", headline:"Education agencies expand service contracts", brief:"Government purchases of services increase." },
    { var:"G", dir:"up", source:"Policy Desk", headline:"Government accelerates equipment replacement cycle", brief:"Public purchases of equipment rise." },

    // G down
    { var:"G", dir:"down", source:"OMB", headline:"Budget directive freezes new federal contracts", brief:"Federal purchases fall as agencies delay procurement." },
    { var:"G", dir:"down", source:"Congress", headline:"Spending caps trigger broad cuts", brief:"Government reduces purchases to meet budget targets." },
    { var:"G", dir:"down", source:"Policy Desk", headline:"Continuing resolution delays agency spending", brief:"Procurement is postponed and purchases fall." },
    { var:"G", dir:"down", source:"Public Sector", headline:"Infrastructure project pipeline paused", brief:"Government slows purchases of materials and services." },
    { var:"G", dir:"down", source:"Congress", headline:"Across-agency procurement cuts announced", brief:"Government buys fewer goods and services this quarter." },
    { var:"G", dir:"down", source:"State & Local", headline:"State governments pause public works contracts", brief:"State and local purchases of services and materials decline." },
    { var:"G", dir:"down", source:"Policy Desk", headline:"Project cancellations reduce public procurement", brief:"Government purchases decline over the next quarter." },
    { var:"G", dir:"down", source:"Public Sector", headline:"Agency hiring and service contracts scaled back", brief:"Government purchases of services fall." },
    { var:"G", dir:"down", source:"Policy Desk", headline:"Reconstruction spending winds down", brief:"Government purchases decrease as emergency programs end." },
    { var:"G", dir:"down", source:"Policy Desk", headline:"Procurement timelines stretched out", brief:"Government purchases are reduced and postponed." },

    // T down
    { var:"T", dir:"down", source:"Policy Desk", headline:"Tax cut takes effect; withholding falls", brief:"Households keep more after-tax income." },
    { var:"T", dir:"down", source:"Policy Desk", headline:"Payroll tax holiday announced", brief:"Take-home pay rises for most workers." },
    { var:"T", dir:"down", source:"Policy Desk", headline:"Child tax credit expansion begins", brief:"Net taxes paid by households decline." },
    { var:"T", dir:"down", source:"Policy Desk", headline:"Standard deduction raised", brief:"Typical households’ tax liability falls." },
    { var:"T", dir:"down", source:"Policy Desk", headline:"Temporary rebate checks issued", brief:"Effective net taxes fall this period." },
    { var:"T", dir:"down", source:"Policy Desk", headline:"Withholding tables updated", brief:"Paychecks rise as taxes withheld fall." },
    { var:"T", dir:"down", source:"Policy Desk", headline:"Tax relief extended", brief:"Households face lower tax payments this quarter." },
    { var:"T", dir:"down", source:"Policy Desk", headline:"Temporary tax credit enacted", brief:"Net tax burden falls." },
    { var:"T", dir:"down", source:"Policy Desk", headline:"Lower payroll deductions begin", brief:"Households keep more income after taxes." },
    { var:"T", dir:"down", source:"Policy Desk", headline:"Tax refunds increase", brief:"Net taxes fall this period." },

    // T up
    { var:"T", dir:"up", source:"Policy Desk", headline:"Tax surcharge implemented to reduce deficits", brief:"Household tax burden rises." },
    { var:"T", dir:"up", source:"Policy Desk", headline:"Payroll tax rate increases", brief:"After-tax income falls for most workers." },
    { var:"T", dir:"up", source:"Policy Desk", headline:"Rebates expire; withholding rises", brief:"Net taxes increase this month." },
    { var:"T", dir:"up", source:"Policy Desk", headline:"State tax hikes enacted", brief:"Household tax payments rise." },
    { var:"T", dir:"up", source:"Policy Desk", headline:"Broad tax increase scheduled", brief:"Tax payments increase over the next quarter." },
    { var:"T", dir:"up", source:"Policy Desk", headline:"Temporary credits sunset", brief:"Net taxes rise as credits expire." },
    { var:"T", dir:"up", source:"Policy Desk", headline:"Withholding tables updated upward", brief:"Paychecks fall as taxes withheld rise." },
    { var:"T", dir:"up", source:"Policy Desk", headline:"Tax compliance push raises payments", brief:"Households pay more in taxes this quarter." },
    { var:"T", dir:"up", source:"Policy Desk", headline:"New surtax begins", brief:"Net tax burden rises." },
    { var:"T", dir:"up", source:"Policy Desk", headline:"Refunds shrink", brief:"Net taxes paid rise this period." },

    // C up
    { var:"C", dir:"up", source:"Household Survey", headline:"Consumer confidence surges; spending rebounds", brief:"Households increase purchases broadly." },
    { var:"C", dir:"up", source:"Markets", headline:"Household wealth rises after market rally", brief:"Spending increases as households feel better off." },
    { var:"C", dir:"up", source:"Retail Pulse", headline:"Pent-up demand boosts services and retail", brief:"Consumers spend more than usual this month." },
    { var:"C", dir:"up", source:"Household Survey", headline:"Uncertainty eases; households loosen budgets", brief:"Consumption rises as precautionary saving falls." },
    { var:"C", dir:"up", source:"Retail Pulse", headline:"Holiday sales exceed expectations", brief:"Consumption jumps relative to trend." },
    { var:"C", dir:"up", source:"Household Survey", headline:"Households report higher planned spending", brief:"Consumption rises this quarter." },
    { var:"C", dir:"up", source:"Retail Pulse", headline:"Services spending accelerates", brief:"Households increase consumption of services." },
    { var:"C", dir:"up", source:"Household Survey", headline:"Improved job prospects boost spending intentions", brief:"Consumption increases." },
    { var:"C", dir:"up", source:"Retail Pulse", headline:"Auto and durable goods purchases surge", brief:"Consumption rises." },
    { var:"C", dir:"up", source:"Household Survey", headline:"Lower uncertainty reduces saving", brief:"Households spend more." },

    // C down
    { var:"C", dir:"down", source:"Household Survey", headline:"Consumer sentiment drops; discretionary spending cut", brief:"Households reduce purchases." },
    { var:"C", dir:"down", source:"Household Survey", headline:"Precautionary saving rises", brief:"Households become cautious and consumption falls." },
    { var:"C", dir:"down", source:"Credit Conditions", headline:"Delinquencies rise; spending tightens", brief:"Households pull back on consumption." },
    { var:"C", dir:"down", source:"Household Survey", headline:"Budget squeeze leads to cutbacks", brief:"Households reduce discretionary spending." },
    { var:"C", dir:"down", source:"Markets", headline:"Negative wealth shock reduces spending", brief:"Households cut consumption as wealth falls." },
    { var:"C", dir:"down", source:"Retail Pulse", headline:"Retail sales weaken broadly", brief:"Consumption declines this month." },
    { var:"C", dir:"down", source:"Household Survey", headline:"Households delay major purchases", brief:"Consumption falls as spending is postponed." },
    { var:"C", dir:"down", source:"Retail Pulse", headline:"Services demand softens", brief:"Households reduce consumption of services." },
    { var:"C", dir:"down", source:"Household Survey", headline:"Higher uncertainty boosts saving", brief:"Consumption falls." },
    { var:"C", dir:"down", source:"Household Survey", headline:"Spending intentions decline", brief:"Consumption decreases this quarter." },

    // I up
    { var:"I", dir:"up", source:"Business Pulse", headline:"Firms expand capacity; equipment orders jump", brief:"Capital spending increases." },
    { var:"I", dir:"up", source:"Business Pulse", headline:"Tech upgrade cycle accelerates", brief:"Firms raise investment in new equipment and software." },
    { var:"I", dir:"up", source:"Business Pulse", headline:"Business optimism improves; capex plans increase", brief:"Firms increase investment spending." },
    { var:"I", dir:"up", source:"Construction Watch", headline:"Housing starts rise; residential building expands", brief:"Residential investment increases." },
    { var:"I", dir:"up", source:"Business Pulse", headline:"Project pipeline expands", brief:"Firms approve more capital projects." },
    { var:"I", dir:"up", source:"Business Pulse", headline:"Factory expansions announced", brief:"Investment spending rises." },
    { var:"I", dir:"up", source:"Construction Watch", headline:"Commercial construction picks up", brief:"Investment increases as projects begin." },
    { var:"I", dir:"up", source:"Business Pulse", headline:"Equipment replacement accelerates", brief:"Firms invest more in new capital." },
    { var:"I", dir:"up", source:"Business Pulse", headline:"Capacity constraints spur new projects", brief:"Investment rises." },
    { var:"I", dir:"up", source:"Business Pulse", headline:"Capital spending budgets increased", brief:"Firms raise investment." },

    // I down
    { var:"I", dir:"down", source:"Business Pulse", headline:"Firms postpone projects amid uncertainty", brief:"Capital spending is delayed and investment falls." },
    { var:"I", dir:"down", source:"Credit Conditions", headline:"Credit conditions tighten; capex plans delayed", brief:"Investment declines as financing becomes harder." },
    { var:"I", dir:"down", source:"Construction Watch", headline:"Commercial construction slows", brief:"Investment falls as projects are postponed." },
    { var:"I", dir:"down", source:"Business Pulse", headline:"Earnings slump; investment budgets cut", brief:"Firms reduce investment spending." },
    { var:"I", dir:"down", source:"Business Pulse", headline:"Demand outlook weakens; expansion plans scrapped", brief:"Firms cut back on investment." },
    { var:"I", dir:"down", source:"Business Pulse", headline:"Capital projects canceled", brief:"Investment spending falls." },
    { var:"I", dir:"down", source:"Construction Watch", headline:"Residential building slows", brief:"Residential investment declines." },
    { var:"I", dir:"down", source:"Business Pulse", headline:"Equipment orders drop", brief:"Firms reduce capital spending." },
    { var:"I", dir:"down", source:"Business Pulse", headline:"Capex plans revised down", brief:"Investment decreases this quarter." },
    { var:"I", dir:"down", source:"Business Pulse", headline:"Project approvals stall", brief:"Investment falls." },

    // P up
    { var:"P", dir:"up", source:"Inflation Watch", headline:"Inflation pressures broaden across sectors", brief:"Prices rise more rapidly across many categories." },
    { var:"P", dir:"up", source:"Inflation Watch", headline:"Supply disruptions push prices higher", brief:"Broader inflation pressure increases." },
    { var:"P", dir:"up", source:"Inflation Watch", headline:"Wage growth and pricing power lift inflation", brief:"Inflation pressure strengthens." },
    { var:"P", dir:"up", source:"Inflation Watch", headline:"Commodity prices surge; inflation rises", brief:"Price pressure increases economy-wide." },
    { var:"P", dir:"up", source:"Inflation Watch", headline:"Inflation expectations drift up", brief:"Pricing pressure becomes more persistent." },
    { var:"P", dir:"up", source:"Inflation Watch", headline:"Broad price increases accelerate", brief:"The price level rises faster." },
    { var:"P", dir:"up", source:"Inflation Watch", headline:"Service inflation strengthens", brief:"Overall price pressure increases." },
    { var:"P", dir:"up", source:"Inflation Watch", headline:"Prices rise across essentials", brief:"The price level increases." },
    { var:"P", dir:"up", source:"Inflation Watch", headline:"Persistent inflation remains elevated", brief:"Price pressure remains strong." },
    { var:"P", dir:"up", source:"Inflation Watch", headline:"Inflation surprise to the upside", brief:"Prices rise more than expected." },

    // P down (deflation)
    { var:"P", dir:"down", source:"Inflation Watch", headline:"Broad price declines emerge; deflation appears", brief:"Prices fall across many categories (deflation)." },
    { var:"P", dir:"down", source:"Inflation Watch", headline:"Demand weakness triggers widespread markdowns", brief:"Businesses cut prices broadly (deflationary pressure)." },
    { var:"P", dir:"down", source:"Inflation Watch", headline:"Global goods glut drives prices down", brief:"Broad deflationary pressure lowers the price level." },
    { var:"P", dir:"down", source:"Inflation Watch", headline:"Competitive price wars spread", brief:"Firms cut prices broadly; the price level falls." },
    { var:"P", dir:"down", source:"Inflation Watch", headline:"Economy-wide discounting intensifies", brief:"Prices fall across many goods and services." },
    { var:"P", dir:"down", source:"Inflation Watch", headline:"Deflationary pressure broadens", brief:"The price level falls." },
    { var:"P", dir:"down", source:"Inflation Watch", headline:"Widespread price cuts reported", brief:"Prices fall across sectors." },
    { var:"P", dir:"down", source:"Inflation Watch", headline:"Retailers slash prices broadly", brief:"The price level declines." },
    { var:"P", dir:"down", source:"Inflation Watch", headline:"Prices fall across core categories", brief:"Deflation appears economy-wide." },
    { var:"P", dir:"down", source:"Inflation Watch", headline:"Deflation surprise", brief:"Prices fall more than expected." },

    // Z up (more cautious/hawkish)
    { var:"Z", dir:"up", source:"Policy Desk", headline:"Major tariff package announced; uncertainty rises", brief:"Policy uncertainty increases; the Fed becomes more cautious." },
    { var:"Z", dir:"up", source:"Financial Stability", headline:"Financial stability concerns rise", brief:"Risk management concerns push the Fed toward caution." },
    { var:"Z", dir:"up", source:"Policy Desk", headline:"Geopolitical risk rises", brief:"The Fed leans more cautious because risks are elevated." },
    { var:"Z", dir:"up", source:"Market Monitor", headline:"Risk premia rise; Fed signals caution", brief:"The Fed becomes more hawkish/cautious independent of output." },
    { var:"Z", dir:"up", source:"Policy Desk", headline:"Policy uncertainty surges", brief:"The Fed adopts a more cautious stance while risks are assessed." },
    { var:"Z", dir:"up", source:"Financial Conditions", headline:"Financial volatility increases", brief:"The Fed becomes more cautious in setting policy." },
    { var:"Z", dir:"up", source:"Policy Desk", headline:"Risk management shifts toward restraint", brief:"The Fed leans more hawkish at any output level." },
    { var:"Z", dir:"up", source:"Financial Stability", headline:"Concerns about overheating grow", brief:"The Fed becomes more cautious independent of output." },
    { var:"Z", dir:"up", source:"Market Monitor", headline:"Financial conditions tighten unexpectedly", brief:"The Fed prioritizes caution in policy stance." },
    { var:"Z", dir:"up", source:"Policy Desk", headline:"Uncertainty about future policy rises", brief:"The Fed leans more cautious while waiting for clarity." },

    // Z down (more supportive/dovish)
    { var:"Z", dir:"down", source:"Financial Conditions", headline:"Financial conditions ease; markets calm", brief:"The Fed feels more comfortable supporting activity." },
    { var:"Z", dir:"down", source:"Financial Stability", headline:"Banking stress fades", brief:"The Fed shifts toward a more supportive stance." },
    { var:"Z", dir:"down", source:"Policy Desk", headline:"Forward guidance emphasizes patience and support", brief:"The Fed adopts a more dovish stance at any output level." },
    { var:"Z", dir:"down", source:"Market Monitor", headline:"Liquidity improves; stress indicators fall", brief:"Easier financial conditions support a more dovish stance." },
    { var:"Z", dir:"down", source:"Financial Conditions", headline:"Risk sentiment improves broadly", brief:"The Fed becomes more supportive independent of output." },
    { var:"Z", dir:"down", source:"Policy Desk", headline:"Uncertainty fades; Fed signals flexibility", brief:"The Fed leans more supportive at any output level." },
    { var:"Z", dir:"down", source:"Market Monitor", headline:"Volatility declines; financial stress recedes", brief:"The Fed feels more comfortable supporting the economy." },
    { var:"Z", dir:"down", source:"Financial Stability", headline:"Stability concerns ease", brief:"The Fed adopts a more supportive policy stance." },
    { var:"Z", dir:"down", source:"Policy Desk", headline:"Risk management shifts toward support", brief:"The Fed leans more dovish independent of output." },
    { var:"Z", dir:"down", source:"Financial Conditions", headline:"Credit conditions improve", brief:"The Fed becomes more supportive at any output level." },
  ];

  // -----------------------
  // DOM
  // -----------------------
  const els = {
    newBtn: $("newBtn"),
    resetBtn: $("resetBtn"),
    status: $("status"),
    scenarioDesc: $("scenarioDesc"),

    // predictions
    isAction: $("isAction"),
    isDir: $("isDir"),
    frAction: $("frAction"),
    frDir: $("frDir"),
    adAction: $("adAction"),
    adDir: $("adDir"),
    checkPredBtn: $("checkPredBtn"),
    whyPredBtn: $("whyPredBtn"),
    predStatus: $("predStatus"),

    // sliders
    Gslider: $("Gslider"),
    Tslider: $("Tslider"),
    Cslider: $("Cslider"),
    Islider: $("Islider"),
    Pslider: $("Pslider"),
    Zslider: $("Zslider"),
    Gdisp: $("Gdisp"),
    Tdisp: $("Tdisp"),
    Cdisp: $("Cdisp"),
    Idisp: $("Idisp"),
    Pdisp: $("Pdisp"),
    Zdisp: $("Zdisp"),

    // mechanism
    slots: $("slots"),
    poolGroups: $("poolGroups"),
    checkMechBtn: $("checkMechBtn"),
    clearMechBtn: $("clearMechBtn"),

    // mechanism result UI (must exist in index)
    mechBadge: $("mechBadge"),
    mechMsg: $("mechMsg"),

    // canvases
    isfrCanvas: $("isfrCanvas"),
    adCanvas: $("adCanvas"),
  };

  // Guard: if index is missing required ids, fail gracefully.
  const required = [
    "newBtn","resetBtn","scenarioDesc","isAction","isDir","frAction","frDir","adAction","adDir",
    "checkPredBtn","whyPredBtn","predStatus",
    "Gslider","Tslider","Cslider","Islider","Pslider","Zslider",
    "Gdisp","Tdisp","Cdisp","Idisp","Pdisp","Zdisp",
    "slots","poolGroups","checkMechBtn","clearMechBtn",
    "mechBadge","mechMsg",
    "isfrCanvas","adCanvas"
  ];
  for (const id of required) {
    if (!els[id]) {
      // If something is missing, don't wire anything (prevents "buttons don't work" due to thrown errors).
      console.warn(`Missing required element id="${id}". App not initialized.`);
      return;
    }
  }

  // -----------------------
  // State
  // -----------------------
  let scenario = null;
  let slotsState = [];
  let mechOK = false;

  let predMade = false;
  let predCorrect = false;
  let revealed = false;

  let cur = { ...M.base };

  const baseEq = eqm(M.base.G, M.base.T, M.base.C, M.base.I, M.base.P, M.base.Z);
  const baseAD = buildADCurve({ G: M.base.G, T: M.base.T, C: M.base.C, I: M.base.I, Z: M.base.Z }, 80);

  // -----------------------
  // Status helpers
  // -----------------------
  const setStatus = (msg) => { els.status.textContent = msg || ""; };
  const setPredStatus = (msg) => { els.predStatus.textContent = msg || ""; };

  function setMechResult(kind, msg) {
    // kind: "ok" | "bad" | null
    if (!kind) {
      els.mechBadge.hidden = true;
      els.mechBadge.className = "mech-badge";
      els.mechBadge.textContent = "";
      els.mechMsg.textContent = msg || "";
      return;
    }
    els.mechBadge.hidden = false;
    els.mechBadge.className = "mech-badge " + (kind === "ok" ? "ok" : "bad");
    els.mechBadge.textContent = (kind === "ok") ? "Correct" : "Wrong";
    els.mechMsg.textContent = msg || "";
  }
  const clearMechResult = () => setMechResult(null, "");

  // -----------------------
  // Sliders: lock/unlock
  // -----------------------
  function applyDefaultRanges() {
    const map = { G: els.Gslider, T: els.Tslider, C: els.Cslider, I: els.Islider, P: els.Pslider, Z: els.Zslider };
    for (const k of Object.keys(map)) {
      const sl = map[k];
      const r = M.ranges[k];
      sl.min = String(r.min);
      sl.max = String(r.max);
      sl.step = String(r.step);
    }
  }

  function lockAllSliders() {
    [els.Gslider, els.Tslider, els.Cslider, els.Islider, els.Pslider, els.Zslider].forEach(sl => sl.disabled = true);
  }

  function resetSlidersToBaseline() {
    cur = { ...M.base };
    els.Gslider.value = String(M.base.G);
    els.Tslider.value = String(M.base.T);
    els.Cslider.value = String(M.base.C);
    els.Islider.value = String(M.base.I);
    els.Pslider.value = String(M.base.P);
    els.Zslider.value = String(M.base.Z);
  }

  function setSliderConstraint(sl, min, max) {
    sl.min = String(min);
    sl.max = String(max);
  }

  function unlockOnlyCorrectSlider() {
    lockAllSliders();
    applyDefaultRanges();
    resetSlidersToBaseline();
    updateReadouts();
    drawAll();

    if (!scenario || !predMade) return;

    const v = scenario.var;
    const dir = scenario.dir;
    const baseVal = M.base[v];

    const sliderMap = { G: els.Gslider, T: els.Tslider, C: els.Cslider, I: els.Islider, P: els.Pslider, Z: els.Zslider };
    const sl = sliderMap[v];
    if (!sl) return;

    sl.disabled = false;

    const min = Number(sl.min);
    const max = Number(sl.max);
    if (dir === "up") setSliderConstraint(sl, baseVal, max);
    else setSliderConstraint(sl, min, baseVal);

    sl.value = String(baseVal);
  }

  // -----------------------
  // Readouts
  // -----------------------
  function syncCurFromSliders() {
    cur.G = Number(els.Gslider.value);
    cur.T = Number(els.Tslider.value);
    cur.C = Number(els.Cslider.value);
    cur.I = Number(els.Islider.value);
    cur.P = Number(els.Pslider.value);
    cur.Z = Number(els.Zslider.value);
  }

  function updateReadouts() {
    els.Gdisp.textContent = cur.G.toFixed(0);
    els.Tdisp.textContent = cur.T.toFixed(0);
    els.Cdisp.textContent = cur.C.toFixed(0);
    els.Idisp.textContent = cur.I.toFixed(0);
    els.Pdisp.textContent = cur.P.toFixed(1);
    els.Zdisp.textContent = cur.Z.toFixed(1);
  }

  // -----------------------
  // Mechanism UI
  // -----------------------
  function makePill(token) {
    const d = document.createElement("div");
    d.className = "pill";
    d.textContent = token;
    d.draggable = true;
    d.dataset.tok = token;
    d.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", token);
      e.dataTransfer.effectAllowed = "move";
    });
    return d;
  }

  function renderPoolGrouped() {
    els.poolGroups.innerHTML = "";
    for (const g of PILL_GROUPS) {
      const wrap = document.createElement("div");
      wrap.className = "poolGroup";

      const hdr = document.createElement("div");
      hdr.className = "poolHdr";
      hdr.textContent = g.name;
      wrap.appendChild(hdr);

      const pool = document.createElement("div");
      pool.className = "pool";
      for (const t of g.pills) pool.appendChild(makePill(t));
      wrap.appendChild(pool);

      els.poolGroups.appendChild(wrap);
    }
  }

  function renderSlots(requiredLen) {
    els.slots.innerHTML = "";
    slotsState = new Array(requiredLen).fill(null);

    for (let i = 0; i < requiredLen; i++) {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.textContent = "Drop";
      slot.dataset.idx = String(i);

      slot.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });

      slot.addEventListener("drop", (e) => {
        e.preventDefault();
        const tok = e.dataTransfer.getData("text/plain");
        if (!tok) return;
        slotsState[i] = tok;
        slot.classList.add("filled");
        slot.textContent = tok;
        clearMechResult();
      });

      slot.addEventListener("dblclick", () => {
        slotsState[i] = null;
        slot.classList.remove("filled");
        slot.textContent = "Drop";
        clearMechResult();
      });

      els.slots.appendChild(slot);

      if (i < requiredLen - 1) {
        const arr = document.createElement("span");
        arr.className = "arrowTok";
        arr.textContent = "→";
        els.slots.appendChild(arr);
      }
    }
  }

  function clearSlots() {
    const children = Array.from(els.slots.querySelectorAll(".slot"));
    for (const s of children) {
      const idx = Number(s.dataset.idx);
      slotsState[idx] = null;
      s.classList.remove("filled");
      s.textContent = "Drop";
    }
    clearMechResult();
  }

  function checkMechanism() {
    if (!scenario) { setMechResult("bad", "Click New Scenario first."); return; }
    const key = mechKeyFor(scenario.var, scenario.dir);
    const seq = MECH[key];
    if (!seq) { setMechResult("bad", "No mechanism defined."); return; }

    if (slotsState.some(v => v === null)) {
      setMechResult("bad", "Fill all blanks before checking.");
      mechOK = false;
      return;
    }

    mechOK = seq.every((t, i) => slotsState[i] === t);

    if (mechOK) setMechResult("ok", "Nice. Your chain matches the scenario mechanism.");
    else setMechResult("bad", "Not quite. Try again—at least one step is out of order or incorrect.");
  }

  // -----------------------
  // Predictions
  // -----------------------
  function fillOptions(selectEl, options) {
    selectEl.innerHTML = "";
    const first = document.createElement("option");
    first.value = "";
    first.textContent = "Direction…";
    selectEl.appendChild(first);
    for (const [val, label] of options) {
      const o = document.createElement("option");
      o.value = val;
      o.textContent = label;
      selectEl.appendChild(o);
    }
  }

  function updateDirOptions(curve) {
    if (curve === "IS") {
      const act = els.isAction.value || "";
      if (!act) return fillOptions(els.isDir, []);
      if (act === "shift") return fillOptions(els.isDir, [["right","Right"], ["left","Left"]]);
      return fillOptions(els.isDir, [["up","Up along"], ["down","Down along"]]);
    }
    if (curve === "FR") {
      const act = els.frAction.value || "";
      if (!act) return fillOptions(els.frDir, []);
      return fillOptions(els.frDir, [["up","Up"], ["down","Down"]]);
    }
    if (curve === "AD") {
      const act = els.adAction.value || "";
      if (!act) return fillOptions(els.adDir, []);
      if (act === "shift") return fillOptions(els.adDir, [["right","Right"], ["left","Left"]]);
      return fillOptions(els.adDir, [["up","Up along"], ["down","Down along"]]);
    }
  }

  function initPredictionUI() {
    els.isAction.addEventListener("change", () => updateDirOptions("IS"));
    els.frAction.addEventListener("change", () => updateDirOptions("FR"));
    els.adAction.addEventListener("change", () => updateDirOptions("AD"));
    updateDirOptions("IS"); updateDirOptions("FR"); updateDirOptions("AD");
  }

  function predComplete() {
    const vals = [
      els.isAction.value, els.isDir.value,
      els.frAction.value, els.frDir.value,
      els.adAction.value, els.adDir.value
    ];
    return vals.every(v => (v ?? "").trim() !== "");
  }

  function expectedPrediction(s) {
    const v = s.var, dir = s.dir;

    if (v === "G" || v === "C" || v === "I") {
      return {
        IS: { action:"shift", dir: dir === "up" ? "right" : "left" },
        FR: { action:"move",  dir: dir === "up" ? "up" : "down" },
        AD: { action:"shift", dir: dir === "up" ? "right" : "left" },
      };
    }
    if (v === "T") {
      return {
        IS: { action:"shift", dir: dir === "up" ? "left" : "right" },
        FR: { action:"move",  dir: dir === "up" ? "down" : "up" },
        AD: { action:"shift", dir: dir === "up" ? "left" : "right" },
      };
    }
    if (v === "P") {
      return {
        IS: { action:"move",  dir: dir === "up" ? "up" : "down" },
        FR: { action:"shift", dir: dir === "up" ? "up" : "down" },
        AD: { action:"move",  dir: dir === "up" ? "up" : "down" },
      };
    }
    // Z
    return {
      IS: { action:"move",  dir: dir === "up" ? "up" : "down" },
      FR: { action:"shift", dir: dir === "up" ? "up" : "down" },
      AD: { action:"shift", dir: dir === "up" ? "left" : "right" },
    };
  }

  function whyPredictionText(s) {
    const v = s.var, up = (s.dir === "up");
    let txt = "Big idea:\n";
    txt += "• IS shifts when planned spending changes at a given interest rate (G, T, C, I).\n";
    txt += "• FR shifts when the Fed wants a different r at each output level (P or Z).\n";
    txt += "• AD comes from IS–FR equilibrium: shifts in IS/FR shift AD; changes in P move along AD.\n\n";

    if (v === "G" || v === "C" || v === "I") {
      txt += `This scenario changes ${v}, changing planned expenditure.\n`;
      txt += `• IS shifts ${up ? "right" : "left"}.\n`;
      txt += "• FR does not shift; output changes so the economy moves along FR.\n";
      txt += `• Therefore AD shifts ${up ? "right" : "left"}.\n`;
    } else if (v === "T") {
      txt += "This scenario changes taxes, which changes consumption.\n";
      txt += `• T ${up ? "up" : "down"} → C ${up ? "down" : "up"} → IS shifts ${up ? "left" : "right"}.\n`;
      txt += "• FR does not shift; the equilibrium moves along FR.\n";
      txt += `• Therefore AD shifts ${up ? "left" : "right"}.\n`;
    } else if (v === "P") {
      txt += "This scenario is a change in the price level.\n";
      txt += `• P ${up ? "up" : "down"} shifts FR ${up ? "up" : "down"}.\n`;
      txt += "• IS does not shift; r changes move along IS.\n";
      txt += "• In (P,Y) space, changing P is a movement along AD.\n";
    } else {
      txt += "This scenario is a change in other policy considerations (Z).\n";
      txt += `• Z ${up ? "up" : "down"} shifts FR ${up ? "up" : "down"}.\n`;
      txt += "• IS does not shift; r changes move along IS.\n";
      txt += `• Therefore AD shifts ${up ? "left" : "right"}.\n`;
    }
    return txt;
  }

  function checkPrediction() {
    if (!scenario) { setPredStatus("Click New Scenario first."); return; }
    if (!predComplete()) {
      const missing = [];
      if (!els.isAction.value) missing.push("IS action");
      if (!els.isDir.value) missing.push("IS direction");
      if (!els.frAction.value) missing.push("FR action");
      if (!els.frDir.value) missing.push("FR direction");
      if (!els.adAction.value) missing.push("AD action");
      if (!els.adDir.value) missing.push("AD direction");
      setPredStatus("Answer all prediction dropdowns first. Missing: " + missing.join(", "));
      return;
    }

    const exp = expectedPrediction(scenario);
    const got = {
      IS: { action: els.isAction.value, dir: els.isDir.value },
      FR: { action: els.frAction.value, dir: els.frDir.value },
      AD: { action: els.adAction.value, dir: els.adDir.value },
    };

    const ok =
      got.IS.action === exp.IS.action && got.IS.dir === exp.IS.dir &&
      got.FR.action === exp.FR.action && got.FR.dir === exp.FR.dir &&
      got.AD.action === exp.AD.action && got.AD.dir === exp.AD.dir;

    predMade = true;
    predCorrect = ok;
    revealed = false;

    setPredStatus(ok
      ? "Checked. Correct. Now only the correct slider is unlocked (and only in the correct direction)."
      : "Checked. Not quite. Now only the correct slider is unlocked (and only in the correct direction) so you can see what actually changes."
    );

    unlockOnlyCorrectSlider();
    setStatus(ok ? "Prediction correct." : "Prediction checked.");
  }

  function whyPrediction() {
    if (!scenario) { setPredStatus("Click New Scenario first."); return; }
    setPredStatus(whyPredictionText(scenario));
  }

  // -----------------------
  // Reveal logic + slider handler
  // -----------------------
  function updateReveal() {
    if (revealed || !scenario || !predMade) return;
    const v = scenario.var;
    const dir = scenario.dir;
    const baseVal = M.base[v];
    const curVal = cur[v];
    if (dir === "up" && curVal > baseVal) revealed = true;
    if (dir === "down" && curVal < baseVal) revealed = true;
    if (revealed) setStatus("Revealed.");
  }

  function onSlider() {
    if (!predMade) return;
    syncCurFromSliders();
    updateReveal();
    updateReadouts();
    drawAll();
  }

  // -----------------------
  // Drawing helpers
  // -----------------------
  function getCtx(canvas) {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const Wcss = canvas.clientWidth || canvas.width;
    const Hcss = canvas.clientHeight || canvas.height;
    const W = Math.floor(Wcss * dpr);
    const H = Math.floor(Hcss * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    return { ctx, dpr, W, H };
  }

  function drawLine(ctx, x1, y1, x2, y2, stroke, lw, dpr, dash = null) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw * dpr;
    ctx.setLineDash(dash ? dash.map(v => v * dpr) : []);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function dot(ctx, x, y, color, dpr) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 5 * dpr, 0, Math.PI * 2);
    ctx.fill();
  }

  function arrow(ctx, x1, y1, x2, y2, color, dpr) {
    drawLine(ctx, x1, y1, x2, y2, color, 2.5, dpr);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const len = 10 * dpr;
    const a1 = ang + Math.PI * 0.85;
    const a2 = ang - Math.PI * 0.85;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 + len * Math.cos(a1), y2 + len * Math.sin(a1));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 + len * Math.cos(a2), y2 + len * Math.sin(a2));
    ctx.stroke();
  }

  function xTick(ctx, x, yAxisBottom, label, dpr) {
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(x, yAxisBottom);
    ctx.lineTo(x, yAxisBottom + 6 * dpr);
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.font = `${12 * dpr}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(label, x, yAxisBottom + 8 * dpr);
  }

  function yTick(ctx, xAxisLeft, y, label, dpr) {
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(xAxisLeft - 6 * dpr, y);
    ctx.lineTo(xAxisLeft, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.font = `${12 * dpr}px system-ui`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(label, xAxisLeft - 10 * dpr, y);
  }

  function drawGrid(ctx, X0, X1, Y0, Y1, dpr) {
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1 * dpr;
    for (let i = 0; i <= 5; i++) {
      const x = X0 + i * (X1 - X0) / 5;
      ctx.beginPath(); ctx.moveTo(x, Y0); ctx.lineTo(x, Y1); ctx.stroke();
    }
    for (let i = 0; i <= 4; i++) {
      const y = Y0 + i * (Y1 - Y0) / 4;
      ctx.beginPath(); ctx.moveTo(X0, y); ctx.lineTo(X1, y); ctx.stroke();
    }
  }

  function drawISFR() {
    const { ctx, dpr, W, H } = getCtx(els.isfrCanvas);
    ctx.clearRect(0, 0, W, H);

    const pad = { l: 70*dpr, r: 18*dpr, t: 18*dpr, b: 60*dpr };
    const X0 = pad.l, X1 = W - pad.r;
    const Y0 = pad.t, Y1 = H - pad.b;

    const { Ymin, Ymax, rmin, rmax } = M.isfr;
    const xTo = (Y) => X0 + (Y - Ymin) / (Ymax - Ymin) * (X1 - X0);
    const yTo = (r) => Y0 + (rmax - r) / (rmax - rmin) * (Y1 - Y0);

    drawGrid(ctx, X0, X1, Y0, Y1, dpr);

    // labels
    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.font = `${12*dpr}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Output (Y)", (X0 + X1) / 2, Y1 + 22*dpr);

    ctx.save();
    ctx.translate(X0 - 52*dpr, (Y0 + Y1) / 2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Interest rate (r)", 0, 0);
    ctx.restore();

    const YL = Ymin, YR = Ymax;

    // baseline curves
    const isL0 = IS_r(YL, M.base.G, M.base.T, M.base.C, M.base.I);
    const isR0 = IS_r(YR, M.base.G, M.base.T, M.base.C, M.base.I);
    const frL0 = FR_r(YL, M.base.P, M.base.Z);
    const frR0 = FR_r(YR, M.base.P, M.base.Z);
    drawLine(ctx, xTo(YL), yTo(isL0), xTo(YR), yTo(isR0), "rgba(0,0,0,0.22)", 3, dpr);
    drawLine(ctx, xTo(YL), yTo(frL0), xTo(YR), yTo(frR0), "rgba(0,0,0,0.22)", 3, dpr);

    // baseline point
    const x1p = xTo(baseEq.Y), y1p = yTo(baseEq.r);
    dot(ctx, x1p, y1p, "rgba(0,0,0,0.40)", dpr);
    drawLine(ctx, x1p, y1p, x1p, yTo(rmin), "rgba(0,0,0,0.30)", 2, dpr, [4, 6]);
    drawLine(ctx, x1p, y1p, xTo(Ymin), y1p, "rgba(0,0,0,0.30)", 2, dpr, [4, 6]);
    xTick(ctx, x1p, Y1, "Y₁", dpr);
    yTick(ctx, X0, y1p, "r₁", dpr);

    if (!revealed) return;

    // current curves
    const isL1 = IS_r(YL, cur.G, cur.T, cur.C, cur.I);
    const isR1 = IS_r(YR, cur.G, cur.T, cur.C, cur.I);
    const frL1 = FR_r(YL, cur.P, cur.Z);
    const frR1 = FR_r(YR, cur.P, cur.Z);
    drawLine(ctx, xTo(YL), yTo(isL1), xTo(YR), yTo(isR1), "rgba(230,159,0,0.95)", 3, dpr);
    drawLine(ctx, xTo(YL), yTo(frL1), xTo(YR), yTo(frR1), "rgba(230,159,0,0.95)", 3, dpr);

    // new point (clamped to chart)
    const eq2 = eqm(cur.G, cur.T, cur.C, cur.I, cur.P, cur.Z);
    const x2p = xTo(eq2.Y), y2p = yTo(eq2.r);
    dot(ctx, x2p, y2p, "rgba(230,159,0,0.95)", dpr);
    drawLine(ctx, x2p, y2p, x2p, yTo(rmin), "rgba(0,0,0,0.30)", 2, dpr, [4, 6]);
    drawLine(ctx, x2p, y2p, xTo(Ymin), y2p, "rgba(0,0,0,0.30)", 2, dpr, [4, 6]);
    if (!approxEq(eq2.Y, baseEq.Y, 1e-6)) xTick(ctx, x2p, Y1, "Y₂", dpr);
    yTick(ctx, X0, y2p, "r₂", dpr);
    arrow(ctx, x1p, y1p, x2p, y2p, "rgba(230,159,0,0.95)", dpr);
  }

  function drawAD() {
    const { ctx, dpr, W, H } = getCtx(els.adCanvas);
    ctx.clearRect(0, 0, W, H);

    const pad = { l: 70*dpr, r: 18*dpr, t: 18*dpr, b: 60*dpr };
    const X0 = pad.l, X1 = W - pad.r;
    const Y0 = pad.t, Y1 = H - pad.b;

    const { Ymin, Ymax, Pmin, Pmax } = M.ad;
    const xTo = (Y) => X0 + (Y - Ymin) / (Ymax - Ymin) * (X1 - X0);
    const yTo = (P) => Y0 + (Pmax - P) / (Pmax - Pmin) * (Y1 - Y0);

    drawGrid(ctx, X0, X1, Y0, Y1, dpr);

    // labels
    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.font = `${12*dpr}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Output (Y)", (X0 + X1) / 2, Y1 + 22*dpr);

    ctx.save();
    ctx.translate(X0 - 52*dpr, (Y0 + Y1) / 2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Price level (P)", 0, 0);
    ctx.restore();

    // baseline AD (clip out-of-range Y so it "disappears" instead of vertical)
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    let penDown = false;
    for (const pt of baseAD) {
      if (pt.Y < Ymin || pt.Y > Ymax) { penDown = false; continue; }
      const x = xTo(pt.Y), y = yTo(pt.P);
      if (!penDown) { ctx.moveTo(x, y); penDown = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // baseline point
    const x1p = xTo(baseEq.Y), y1p = yTo(M.base.P);
    dot(ctx, x1p, y1p, "rgba(0,0,0,0.40)", dpr);
    drawLine(ctx, x1p, y1p, x1p, yTo(Pmin), "rgba(0,0,0,0.30)", 2, dpr, [4, 6]);
    drawLine(ctx, x1p, y1p, xTo(Ymin), y1p, "rgba(0,0,0,0.30)", 2, dpr, [4, 6]);
    xTick(ctx, x1p, Y1, "Y₁", dpr);
    yTick(ctx, X0, y1p, "P₁", dpr);

    if (!revealed) return;

    // current AD
    const curAD = buildADCurve({ G: cur.G, T: cur.T, C: cur.C, I: cur.I, Z: cur.Z }, 80);
    ctx.strokeStyle = "rgba(230,159,0,0.95)";
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    penDown = false;
    for (const pt of curAD) {
      if (pt.Y < Ymin || pt.Y > Ymax) { penDown = false; continue; }
      const x = xTo(pt.Y), y = yTo(pt.P);
      if (!penDown) { ctx.moveTo(x, y); penDown = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // new point (clamped point for readability)
    const eq2 = eqm(cur.G, cur.T, cur.C, cur.I, cur.P, cur.Z);
    const x2p = xTo(eq2.Y), y2p = yTo(cur.P);
    dot(ctx, x2p, y2p, "rgba(230,159,0,0.95)", dpr);
    drawLine(ctx, x2p, y2p, x2p, yTo(Pmin), "rgba(0,0,0,0.30)", 2, dpr, [4, 6]);
    drawLine(ctx, x2p, y2p, xTo(Ymin), y2p, "rgba(0,0,0,0.30)", 2, dpr, [4, 6]);
    if (!approxEq(eq2.Y, baseEq.Y, 1e-6)) xTick(ctx, x2p, Y1, "Y₂", dpr);

    // Skip P₂ if price didn’t change (prevents overlap with P₁)
    if (!approxEq(cur.P, M.base.P, 1e-6)) yTick(ctx, X0, y2p, "P₂", dpr);

    arrow(ctx, x1p, y1p, x2p, y2p, "rgba(230,159,0,0.95)", dpr);
  }

  function drawAll() {
    drawISFR();
    drawAD();
  }

  // -----------------------
  // Scenario / reset
  // -----------------------
  function setScenarioText(s) {
    els.scenarioDesc.textContent =
      `${s.stamp} • ${s.source}\n` +
      `${s.headline}\n` +
      `${s.brief}\n\n` +
      `Step 1: Build the mechanism.\n` +
      `Step 2: Make predictions for IS, FR, and AD, then click Check answers.\n` +
      `Step 3: Use the unlocked slider to reveal what happens.`;
  }

  function resetToBaseline() {
    applyDefaultRanges();
    resetSlidersToBaseline();
    updateReadouts();

    slotsState = [];
    mechOK = false;
    predMade = false;
    predCorrect = false;
    revealed = false;

    clearMechResult();
    setPredStatus("");

    els.isAction.value = "";
    els.frAction.value = "";
    els.adAction.value = "";
    updateDirOptions("IS"); updateDirOptions("FR"); updateDirOptions("AD");
    els.isDir.value = "";
    els.frDir.value = "";
    els.adDir.value = "";

    lockAllSliders();
    drawAll();
  }

  function resetAll() {
    scenario = null;
    resetToBaseline();
    els.scenarioDesc.textContent = "Click “New Scenario” to start.";
    els.slots.innerHTML = "";
    els.poolGroups.innerHTML = "";
    setStatus("Reset.");
    typeset(document.body);
  }

  function newScenario() {
    resetToBaseline();

    // draw scenario
    const pick = SCEN[Math.floor(Math.random() * SCEN.length)];
    scenario = { ...pick, stamp: makeStamp() };
    setScenarioText(scenario);

    // pool + slots
    renderPoolGrouped();
    const key = mechKeyFor(scenario.var, scenario.dir);
    const seq = MECH[key];
    renderSlots(seq.length);

    setStatus("Scenario ready. Build the mechanism and make predictions.");
    typeset(document.body);
  }

  // -----------------------
  // Wire events
  // -----------------------
  els.newBtn.addEventListener("click", newScenario);
  els.resetBtn.addEventListener("click", resetAll);

  els.checkMechBtn.addEventListener("click", checkMechanism);
  els.clearMechBtn.addEventListener("click", clearSlots);

  els.checkPredBtn.addEventListener("click", checkPrediction);
  els.whyPredBtn.addEventListener("click", whyPrediction);

  els.Gslider.addEventListener("input", onSlider);
  els.Tslider.addEventListener("input", onSlider);
  els.Cslider.addEventListener("input", onSlider);
  els.Islider.addEventListener("input", onSlider);
  els.Pslider.addEventListener("input", onSlider);
  els.Zslider.addEventListener("input", onSlider);

  window.addEventListener("resize", () => requestAnimationFrame(drawAll));

  // -----------------------
  // Init
  // -----------------------
  window.addEventListener("load", () => {
    applyDefaultRanges();
    initPredictionUI();
    resetAll();
    requestAnimationFrame(drawAll);
    setTimeout(drawAll, 120);
    typeset(document.body);
  });
})();
