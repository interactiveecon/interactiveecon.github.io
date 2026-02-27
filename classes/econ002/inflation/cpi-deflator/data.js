// data.js
// Buckets: CPIPCE, PCEDP, GDPONLY, ALL, NONE

window.INFL_MEASURES_DATA = {
  cards: [
    // =========================
    // CPI & PCE (consumer indexes)
    // =========================
    {
      id: "imp_phones",
      title: "Imported phones get more expensive",
      desc: "Prices of smartphones made abroad rise this year.",
      correct: "CPIPCE",
      explain: "CPI & PCE track consumer prices, including imported consumer goods. The GDP deflator is a domestic-production measure and excludes imports."
    },
    {
      id: "imp_coffee",
      title: "Imported coffee prices rise",
      desc: "Imported coffee becomes more expensive for consumers.",
      correct: "CPIPCE",
      explain: "Imported consumer goods affect CPI & PCE. The GDP deflator excludes imports."
    },
    {
      id: "imp_clothes",
      title: "Imported clothing prices jump",
      desc: "Clothing produced abroad becomes more expensive in U.S. stores.",
      correct: "CPIPCE",
      explain: "CPI & PCE include imported consumer goods. GDP deflator excludes imports."
    },
    {
      id: "imp_tvs",
      title: "Imported TVs become cheaper",
      desc: "Prices of imported televisions fall this year.",
      correct: "CPIPCE",
      explain: "Imported consumer goods affect CPI & PCE but not the GDP deflator (imports excluded from domestic production)."
    },
    {
      id: "imp_furniture",
      title: "Imported furniture costs more",
      desc: "Imported furniture prices rise for consumers.",
      correct: "CPIPCE",
      explain: "Consumer imports move CPI & PCE. GDP deflator excludes imports."
    },
    {
      id: "imp_gas",
      title: "Imported gasoline becomes more expensive",
      desc: "Gasoline imported from abroad costs more at the pump.",
      correct: "CPIPCE",
      explain: "As written, this is an import price story: consumer import prices can move CPI & PCE more than the GDP deflator."
    },

    // =========================
    // PCE & GDP deflator (flexible weights / substitution / composition)
    // =========================
    {
      id: "subst_cheaper",
      title: "Consumers switch to cheaper brands",
      desc: "When one brand gets expensive, consumers substitute toward cheaper alternatives.",
      correct: "PCEDP",
      explain: "Substitution changes spending weights. In a principles-level simplification, PCE and the GDP deflator adjust weights more (chain-weighting), so measured inflation can change more than a fixed-basket CPI."
    },
    {
      id: "subst_storebrand",
      title: "Shift toward store brands",
      desc: "Households buy more store-brand groceries and fewer name brands, changing spending shares.",
      correct: "PCEDP",
      explain: "Changing spending shares affects flexible-weight measures (PCE and the GDP deflator, in this simplified framework). CPI is more fixed-basket."
    },
    {
      id: "subst_chicken",
      title: "Consumers switch from beef to chicken",
      desc: "Beef prices rise, so households substitute toward chicken.",
      correct: "PCEDP",
      explain: "This is substitution/composition. Flexible-weight measures (PCE and GDP deflator) reflect substitution more than a fixed-basket CPI."
    },
    {
      id: "subst_streaming",
      title: "Consumers switch streaming services",
      desc: "A popular streaming service raises prices; many households switch to a cheaper option.",
      correct: "PCEDP",
      explain: "Substitution changes weights; flexible-weight measures can show a different inflation path than a fixed-basket CPI."
    },
    {
      id: "mix_domestic_output",
      title: "Production shifts toward lower-priced models",
      desc: "Firms produce relatively more of a cheaper model and less of a premium model this year.",
      correct: "PCEDP",
      explain: "A composition/mix shift changes the average price of domestic output; flexible-weight measures can be affected even if some individual prices don’t change much."
    },
    {
      id: "tech_quality",
      title: "Quality improves in a common product category",
      desc: "New models offer better performance for similar sticker prices.",
      correct: "PCEDP",
      explain: "Measured inflation can differ depending on how quality changes and weights are handled. This is a principles-level ‘measurement/weights’ nuance that can affect flexible indexes differently than fixed baskets."
    },

    // =========================
    // GDP deflator only (domestic production not in consumer indexes)
    // =========================
    {
      id: "inv_machines",
      title: "Prices of new machine tools rise",
      desc: "Domestically produced machines used by firms become more expensive.",
      correct: "GDPONLY",
      explain: "Investment goods are part of domestic production (GDP deflator). They are not a major direct component of CPI/PCE."
    },
    {
      id: "inv_software",
      title: "Business software investment gets pricier",
      desc: "Prices of domestically produced business software rise.",
      correct: "GDPONLY",
      explain: "Business investment is included in GDP (deflator) but not central to consumer inflation measures."
    },
    {
      id: "gov_defense",
      title: "Government pays more for defense equipment",
      desc: "Prices of domestically produced defense equipment rise.",
      correct: "GDPONLY",
      explain: "Government purchases are in GDP and the deflator. CPI/PCE track consumer spending, not government purchases."
    },
    {
      id: "gov_roads",
      title: "Road construction costs rise",
      desc: "Government highway construction becomes more expensive.",
      correct: "GDPONLY",
      explain: "Government purchases affect GDP deflator inflation. CPI/PCE do not include government purchases directly."
    },
    {
      id: "exports_prices",
      title: "Exported goods sell for higher prices abroad",
      desc: "Prices of domestically produced goods sold to foreigners rise.",
      correct: "GDPONLY",
      explain: "Exports are domestic production (deflator). They are not part of consumer price indexes."
    },
    {
      id: "exports_aircraft",
      title: "Aircraft exports get pricier",
      desc: "Domestic aircraft sold abroad increase in price.",
      correct: "GDPONLY",
      explain: "Export prices affect the deflator (domestic production), not consumer inflation measures."
    },
    {
      id: "inv_structures",
      title: "Factory construction becomes more expensive",
      desc: "Costs of building new factories rise.",
      correct: "GDPONLY",
      explain: "Structures are investment (domestic production), affecting the deflator more than CPI/PCE."
    },

    // =========================
    // All (broad domestic consumer prices)
    // =========================
    {
      id: "restaurant",
      title: "Restaurant meals become more expensive",
      desc: "Domestic restaurants raise menu prices.",
      correct: "ALL",
      explain: "Domestic consumer services affect CPI & PCE and also domestic production prices (GDP deflator)."
    },
    {
      id: "haircut",
      title: "Haircuts cost more",
      desc: "Local barbershops increase prices.",
      correct: "ALL",
      explain: "A domestic consumer service: it shows up in CPI/PCE and in domestic production (deflator)."
    },
    {
      id: "rent",
      title: "Rents rise broadly",
      desc: "Apartment rents rise across the country.",
      correct: "ALL",
      explain: "Housing services are in consumer inflation and part of domestic production; all measures can move."
    },
    {
      id: "doctor_visit",
      title: "Doctor visit prices rise",
      desc: "Prices for routine doctor visits increase.",
      correct: "ALL",
      explain: "Medical services are domestic services affecting consumer prices (CPI/PCE) and domestic production prices (deflator)."
    },
    {
      id: "bus_fare",
      title: "Bus fares rise",
      desc: "Local transit agencies raise fares.",
      correct: "ALL",
      explain: "A domestic service purchased by consumers; it can move CPI/PCE and also reflects domestic production costs."
    },
    {
      id: "internet",
      title: "Internet service prices rise",
      desc: "Monthly internet bills increase.",
      correct: "ALL",
      explain: "A domestic consumer service—affects CPI, PCE, and the deflator."
    },
    {
      id: "electricity",
      title: "Electricity rates rise",
      desc: "Electricity prices rise for households.",
      correct: "ALL",
      explain: "A domestic service that consumers buy; it appears in consumer inflation and domestic production prices."
    },

    // =========================
    // None (not directly in inflation measures)
    // =========================
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
    },
    {
      id: "bond_yields",
      title: "Bond yields rise",
      desc: "Interest rates on long-term bonds increase.",
      correct: "NONE",
      explain: "Interest rates are not prices of goods/services in CPI, PCE, or the GDP deflator."
    },
    {
      id: "used_car",
      title: "Used car prices rise",
      desc: "Prices of used cars rise this year.",
      correct: "NONE",
      explain: "In principles treatment: used goods are not current production, so they’re not the core object in these price indexes’ production concept (they’re a resale)."
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
