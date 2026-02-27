// data.js
// Buckets: CPIPCE, PCEDP, GDPONLY, ALL, NONE

window.INFL_MEASURES_DATA = {
  cards: [
    // -------------------------
    // CPI & PCE (consumer indexes)
    // -------------------------
    {
      id: "imp_phones",
      title: "Imported phones get more expensive",
      desc: "Prices of smartphones made abroad rise this year.",
      correct: "CPIPCE",
      explain: "Consumer price indexes (CPI & PCE) include imported consumer goods. The GDP deflator is a domestic-production measure and excludes imports."
    },
    {
      id: "imp_coffee",
      title: "Imported coffee prices rise",
      desc: "Imported coffee becomes more expensive for consumers.",
      correct: "CPIPCE",
      explain: "CPI & PCE track consumer prices, including imports. The GDP deflator excludes imports because it measures prices of domestic production."
    },
    {
      id: "imp_clothes",
      title: "Imported clothing prices jump",
      desc: "Clothing produced abroad becomes more expensive in U.S. stores.",
      correct: "CPIPCE",
      explain: "CPI & PCE include imported consumer goods. GDP deflator excludes imports."
    },

    // -------------------------
    // PCE & GDP deflator (flexible weights / substitution / composition)
    // -------------------------
    {
      id: "subst_cheaper",
      title: "Consumers switch to cheaper brands",
      desc: "When one brand gets expensive, consumers substitute toward cheaper alternatives.",
      correct: "PCEDP",
      explain: "This is a weighting/composition effect. In a simplified principles view: PCE and the GDP deflator adjust weights more (chain-weighting), so measured inflation can change. CPI is more fixed-basket, so it changes less from substitution alone."
    },
    {
      id: "subst_storebrand",
      title: "Shift toward store brands",
      desc: "Households buy more store-brand groceries and fewer name brands, changing spending shares.",
      correct: "PCEDP",
      explain: "Changing spending shares affects flexible-weight measures (PCE and the GDP deflator, in this simplified framework). CPI is more fixed-basket."
    },

    // -------------------------
    // GDP deflator only (domestic production not in consumer indexes)
    // -------------------------
    {
      id: "inv_machines",
      title: "Prices of new machine tools rise",
      desc: "Domestically produced machines used by firms become more expensive.",
      correct: "GDPONLY",
      explain: "Investment goods are part of domestic production (GDP deflator). They are not a major direct component of consumer price indexes (CPI/PCE)."
    },
    {
      id: "gov_defense",
      title: "Government pays more for defense equipment",
      desc: "Prices of domestically produced defense equipment rise.",
      correct: "GDPONLY",
      explain: "Government purchases are included in GDP and the GDP deflator. CPI/PCE track consumer spending, not government purchases."
    },
    {
      id: "exports_prices",
      title: "Exported goods sell for higher prices abroad",
      desc: "Prices of domestically produced goods sold to foreigners rise.",
      correct: "GDPONLY",
      explain: "Exports are domestic production and included in the GDP deflator. They are not part of consumer price indexes."
    },
    {
      id: "inv_software",
      title: "Business software investment gets pricier",
      desc: "Prices of domestically produced business software rise.",
      correct: "GDPONLY",
      explain: "Business investment is part of domestic production (deflator) but not consumer inflation (CPI/PCE)."
    },

    // -------------------------
    // All (broad domestic consumer prices)
    // -------------------------
    {
      id: "restaurant",
      title: "Restaurant meals become more expensive",
      desc: "Domestic restaurants raise menu prices.",
      correct: "ALL",
      explain: "Domestic consumer services affect CPI and PCE (consumer prices) and also affect the GDP deflator (domestic production)."
    },
    {
      id: "haircut",
      title: "Haircuts cost more",
      desc: "Local barbershops increase prices.",
      correct: "ALL",
      explain: "A domestic consumer service: it shows up in CPI/PCE and in domestic production prices (GDP deflator)."
    },
    {
      id: "rent",
      title: "Rents rise broadly",
      desc: "Apartment rents rise across the country.",
      correct: "ALL",
      explain: "Housing services are a major part of consumer inflation and also part of domestic production. So CPI, PCE, and the deflator can all move."
    },

    // -------------------------
    // None (not directly in inflation measures)
    // -------------------------
    {
      id: "stocks",
      title: "Stock prices jump",
      desc: "Share prices rise by 20%.",
      correct: "NONE",
      explain: "Asset prices are not prices of current production in CPI, PCE, or the GDP deflator."
    },
    {
      id: "transfer",
      title: "Social Security payments increase",
      desc: "Transfer payments rise this year.",
      correct: "NONE",
      explain: "Transfers are not payments for current production, so they do not directly change inflation measures."
    },
    {
      id: "existing_homes",
      title: "Existing home sale prices rise",
      desc: "Resale prices of existing houses increase this year.",
      correct: "NONE",
      explain: "Resales are not current production. Inflation measures focus on prices of goods/services produced, not resale prices of existing assets."
    }
  ],

  shocks: {
    NONE: {
      name: "None",
      path: { cpi: [2,2,2,2,2,2], pce: [2,2,2,2,2,2], gdp: [2,2,2,2,2,2] },
      winner: "—",
      why: "Baseline inflation at 2% in all measures."
    },

    IMPORTS: {
      name: "Imports shock",
      path: { cpi: [2,4.2,3.2,2.6,2.2,2.0], pce: [2,3.7,2.9,2.5,2.1,2.0], gdp: [2,2.2,2.1,2.0,2.0,2.0] },
      winner: "CPI (and PCE)",
      why: "Imports affect consumer prices (CPI/PCE) but not the GDP deflator (domestic production excludes imports)."
    },

    SUBST: {
      name: "Substitution shift",
      path: { cpi: [2,2.0,2.0,2.0,2.0,2.0], pce: [2,1.6,1.8,1.9,2.0,2.0], gdp: [2,1.5,1.7,1.9,2.0,2.0] },
      winner: "PCE & GDP deflator",
      why: "A substitution/composition shift changes flexible-weight measures more (PCE and GDP deflator) than a fixed-basket CPI."
    },

    INVEST: {
      name: "Investment boom",
      path: { cpi: [2,2.1,2.0,2.0,2.0,2.0], pce: [2,2.0,2.0,2.0,2.0,2.0], gdp: [2,3.6,2.8,2.4,2.2,2.1] },
      winner: "GDP deflator",
      why: "Investment goods are part of domestic production (GDP deflator) but not central to consumer inflation."
    },

    EXPORTS: {
      name: "Export surge",
      path: { cpi: [2,2.2,2.1,2.0,2.0,2.0], pce: [2,2.1,2.05,2.0,2.0,2.0], gdp: [2,3.2,2.6,2.3,2.1,2.0] },
      winner: "GDP deflator",
      why: "Exports are domestic production (deflator) but not part of consumer price indexes."
    }
  }
};
