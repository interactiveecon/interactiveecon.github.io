// data.js
// Cards: no “tags” shown on cards; only title + description.
// Correct zones: CPI, DEF, BOTH, NEI.

window.CPIDEF_DATA = {
  cards: [
    // Imports vs domestic
    {
      id: "imp_phone",
      title: "Imported phones get more expensive",
      desc: "The price of smartphones made abroad rises this year.",
      correct: "CPI",
      explain: "CPI includes consumer purchases including imports. GDP deflator excludes imports because it measures prices of domestic production. PCE is also consumer-focused and tends to move with CPI here."
    },
    {
      id: "imp_coffee",
      title: "Imported coffee price jumps",
      desc: "Coffee beans imported from abroad become more expensive.",
      correct: "CPI",
      explain: "Imported consumer goods affect CPI (and PCE), but not the GDP deflator (imports are excluded from domestic production prices)."
    },

    // Investment / capital goods
    {
      id: "cap_machines",
      title: "Domestic machines used by firms become pricier",
      desc: "Prices of domestically produced machine tools rise.",
      correct: "DEF",
      explain: "GDP deflator includes investment goods produced domestically. CPI focuses on consumer purchases, so it generally doesn’t move much from investment-goods prices. PCE is also consumer spending, so it’s closer to CPI than the deflator here."
    },
    {
      id: "residential_const",
      title: "New home construction costs rise",
      desc: "Prices of newly built homes and construction services rise.",
      correct: "DEF",
      explain: "New residential construction is part of investment (domestic production), so it affects the GDP deflator. CPI is about consumer prices; it’s not a direct measure of newly produced housing as an investment good (CPI uses rent/OER concepts)."
    },

    // Exports
    {
      id: "exports_boom",
      title: "Foreign demand bids up prices of exported goods",
      desc: "Prices of goods produced domestically and sold abroad rise.",
      correct: "DEF",
      explain: "Exports are domestic production, so they’re included in the GDP deflator. CPI is consumer-focused and does not include prices of goods sold abroad. PCE behaves like CPI here."
    },

    // Broad domestic consumer/service prices
    {
      id: "rent_rise",
      title: "Rents rise broadly",
      desc: "Apartment rents in the U.S. rise this year.",
      correct: "BOTH",
      explain: "Rents are consumer prices (CPI/PCE) and also part of domestic production (housing services), so both CPI and the GDP deflator can move. In practice, weights differ across CPI vs PCE."
    },
    {
      id: "restaurant_rise",
      title: "Restaurant meals become more expensive",
      desc: "Domestic restaurants raise menu prices.",
      correct: "BOTH",
      explain: "This is a consumer service produced domestically. CPI includes it; GDP deflator includes domestic production prices. PCE often tracks consumer services and may differ in weights."
    },
    {
      id: "haircut_rise",
      title: "Haircut prices rise",
      desc: "Local barbershops increase prices.",
      correct: "BOTH",
      explain: "Domestically produced consumer service → included in CPI and in domestic production prices (deflator). PCE also includes it, often with different weights."
    },

    // Government purchases
    {
      id: "gov_defense",
      title: "Government buys more expensive defense equipment",
      desc: "Prices paid for domestically produced defense equipment rise.",
      correct: "DEF",
      explain: "Government purchases are part of GDP, so deflator includes them. CPI is consumer-focused and doesn’t include government purchases directly."
    },

    // Neither (asset prices / transfers / used goods / purely financial)
    {
      id: "stock_prices",
      title: "Stock prices rise sharply",
      desc: "Share prices increase by 20%.",
      correct: "NEI",
      explain: "Asset prices are not prices of current production in CPI or the GDP deflator. They can matter indirectly, but they’re not included directly."
    },
    {
      id: "used_house_sale",
      title: "Prices of existing homes rise",
      desc: "Resale prices of existing houses increase this year.",
      correct: "NEI",
      explain: "Existing home sales are not new production, so they are not directly counted in GDP deflator or CPI as a 'good'. CPI uses housing services (rent/OER), not asset resale prices."
    },
    {
      id: "transfer",
      title: "Government increases Social Security payments",
      desc: "Transfer payments increase.",
      correct: "NEI",
      explain: "Transfers are not payments for current production; they are not directly in CPI or the GDP deflator."
    },

    // PCE nuance cards (still sorted into CPI/DEF/BOTH/NEI)
    {
      id: "pce_health_employer",
      title: "Employer-paid health insurance costs rise",
      desc: "Employer-provided health insurance premiums rise.",
      correct: "BOTH",
      explain: "This is a domestically produced service and affects production prices. For consumers, PCE includes a broader set of health expenditures (including on behalf of households) than CPI does, so PCE can respond differently than CPI."
    },
    {
      id: "pce_substitution",
      title: "Consumers switch to cheaper brands",
      desc: "People substitute toward cheaper goods when one price rises.",
      correct: "NEI",
      explain: "This is about how the index is constructed rather than a single price entering or not. CPI uses a more fixed basket; PCE and the deflator are generally more flexible and can reflect substitution more."
    }
  ],

  // Simulation shocks: define their qualitative impacts
  shocks: {
    NONE: {
      name: "None",
      path: { cpi: [2,2,2,2,2,2], def: [2,2,2,2,2,2], pce: [2,2,2,2,2,2] },
      why: "Baseline inflation at 2% in all measures.",
      winner: "—"
    },

    IMPORTS: {
      name: "Imports price shock",
      // imports raise CPI/PCE more than deflator
      path: { cpi: [2,4,3,2.5,2.2,2], def: [2,2.2,2.1,2.0,2.0,2], pce: [2,3.6,2.8,2.4,2.1,2] },
      winner: "CPI (and PCE)",
      why: "Imports affect consumer prices but are excluded from the GDP deflator (domestic production). PCE is consumer-focused and often similar to CPI."
    },

    INVEST: {
      name: "Investment boom",
      // investment goods prices push deflator more
      path: { cpi: [2,2.1,2.0,2.0,2.0,2.0], def: [2,3.6,2.8,2.4,2.2,2.1], pce: [2,2.05,2.0,2.0,2.0,2.0] },
      winner: "GDP Deflator",
      why: "Investment goods are part of domestic production (deflator), but not a major direct component of consumer price indexes."
    },

    EXPORTS: {
      name: "Export demand surge",
      // exports raise deflator more than CPI/PCE
      path: { cpi: [2,2.2,2.1,2.0,2.0,2.0], def: [2,3.2,2.6,2.3,2.1,2.0], pce: [2,2.15,2.05,2.0,2.0,2.0] },
      winner: "GDP Deflator",
      why: "Exports are domestic production so they’re included in the deflator; CPI/PCE focus on consumer prices."
    },

    OIL: {
      name: "Energy price spike",
      // energy hits CPI/PCE; deflator also moves because energy is domestically produced + used as input (simplified)
      path: { cpi: [2,4.2,3.4,2.6,2.2,2.0], def: [2,3.4,2.8,2.3,2.1,2.0], pce: [2,3.8,3.0,2.5,2.2,2.0] },
      winner: "CPI (often), with deflator also rising",
      why: "Energy is a consumer purchase (CPI/PCE) and also part of domestic production costs. PCE often has different weights and can be less volatile than CPI."
    }
  }
};
