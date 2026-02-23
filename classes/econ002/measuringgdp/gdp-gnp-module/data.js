// 50-card bank, no "nonoutput" cards.
// Types:
// - production: counted toward GDP if produced in the U.S.; counted toward GNP if produced by U.S. factors
// - factor: NFIA components; gnpSign = +1 (receipt from abroad) or -1 (payment to abroad)
//
// Notes for this lab:
// - We treat positive factor receipts as "GNP" bucket.
// - We treat factor payments abroad as "Neither" bucket.
// - Factor items are NOT added to GDP as production (avoid double counting).

const ITEM_BANK = [
  // -------------------------
  // Production: BOTH (U.S. production by U.S. factors)
  // -------------------------
  {
    id: "p_b1", type: "production", title: "U.S.-owned software in U.S.", value: 22,
    desc: "A U.S.-owned firm in Texas produces $22m of software services this year.",
    gdpCounts: true, gnpCounts: true,
    explain: "Produced in the U.S. → GDP. Produced by U.S. factors → also GNP. (Both)"
  },
  {
    id: "p_b2", type: "production", title: "U.S. construction in U.S.", value: 19,
    desc: "A U.S. construction firm builds new homes worth $19m in the U.S. this year.",
    gdpCounts: true, gnpCounts: true,
    explain: "Domestic final production by U.S. factors → counts in both GDP and GNP."
  },
  {
    id: "p_b3", type: "production", title: "U.S. medical services in U.S.", value: 14,
    desc: "A U.S.-owned clinic provides $14m of healthcare services in the U.S. this year.",
    gdpCounts: true, gnpCounts: true,
    explain: "Produced in the U.S. and by U.S. factors → both GDP and GNP."
  },
  {
    id: "p_b4", type: "production", title: "U.S. education services in U.S.", value: 7,
    desc: "A U.S. university provides $7m of educational services in the U.S. this year.",
    gdpCounts: true, gnpCounts: true,
    explain: "Domestic production by U.S. factors → both."
  },
  {
    id: "p_b5", type: "production", title: "U.S.-owned restaurant in U.S.", value: 6,
    desc: "A U.S.-owned restaurant in the U.S. produces $6m of meals this year.",
    gdpCounts: true, gnpCounts: true,
    explain: "Produced inside the U.S. and by U.S. factors → both."
  },
  {
    id: "p_b6", type: "production", title: "U.S. trucking services in U.S.", value: 9,
    desc: "A U.S.-owned trucking company provides $9m of freight services within the U.S.",
    gdpCounts: true, gnpCounts: true,
    explain: "Domestic production by U.S. factors → both."
  },
  {
    id: "p_b7", type: "production", title: "U.S. farm output in U.S.", value: 11,
    desc: "A U.S.-owned farm produces $11m of final agricultural goods in the U.S.",
    gdpCounts: true, gnpCounts: true,
    explain: "Produced domestically by U.S. factors → both."
  },
  {
    id: "p_b8", type: "production", title: "U.S. entertainment services in U.S.", value: 8,
    desc: "A U.S.-owned venue produces $8m of entertainment services in the U.S.",
    gdpCounts: true, gnpCounts: true,
    explain: "Domestic services by U.S. factors → both."
  },
  {
    id: "p_b9", type: "production", title: "U.S. legal services in U.S.", value: 5,
    desc: "A U.S.-owned law firm provides $5m of legal services in the U.S.",
    gdpCounts: true, gnpCounts: true,
    explain: "Produced in the U.S. by U.S. factors → both."
  },
  {
    id: "p_b10", type: "production", title: "U.S. manufacturing in U.S.", value: 25,
    desc: "A U.S.-owned manufacturer produces $25m of final goods in the U.S. this year.",
    gdpCounts: true, gnpCounts: true,
    explain: "Domestic production by U.S. factors → both."
  },

  // -------------------------
  // Production: GDP (U.S. production by FOREIGN factors)
  // -------------------------
  {
    id: "p_g1", type: "production", title: "German-owned factory in U.S.", value: 50,
    desc: "A German-owned factory located in the U.S. produces $50m of cars this year.",
    gdpCounts: true, gnpCounts: false,
    explain: "Production occurs in the U.S. → GDP. Foreign-owned factors → not U.S. GNP."
  },
  {
    id: "p_g2", type: "production", title: "Canadian-owned mine in U.S.", value: 18,
    desc: "A Canadian-owned mine in Nevada produces $18m of minerals this year.",
    gdpCounts: true, gnpCounts: false,
    explain: "Produced in the U.S. → GDP. Foreign-owned → not U.S. GNP."
  },
  {
    id: "p_g3", type: "production", title: "Japanese-owned hotel in U.S.", value: 16,
    desc: "A Japanese-owned hotel in the U.S. provides $16m of lodging services this year.",
    gdpCounts: true, gnpCounts: false,
    explain: "Produced in the U.S. → GDP. Foreign-owned → not U.S. GNP."
  },
  {
    id: "p_g4", type: "production", title: "Swiss-owned R&D lab in U.S.", value: 11,
    desc: "A Swiss-owned R&D lab located in the U.S. produces $11m of R&D services this year.",
    gdpCounts: true, gnpCounts: false,
    explain: "Production is inside the U.S. → GDP. Foreign-owned factors → not U.S. GNP."
  },
  {
    id: "p_g5", type: "production", title: "Spanish-owned retail services in U.S.", value: 12,
    desc: "A Spanish-owned retail chain provides $12m of retail services in the U.S. this year.",
    gdpCounts: true, gnpCounts: false,
    explain: "Produced in the U.S. → GDP. Foreign-owned → not U.S. GNP."
  },
  {
    id: "p_g6", type: "production", title: "U.K.-owned film production in U.S.", value: 21,
    desc: "A U.K.-owned studio produces $21m of film services in the U.S. using U.S.-based crews and stages.",
    gdpCounts: true, gnpCounts: false,
    explain: "Produced in the U.S. → GDP. Foreign-owned factors → not U.S. GNP."
  },
  {
    id: "p_g7", type: "production", title: "Dutch-owned logistics in U.S.", value: 10,
    desc: "A Dutch-owned logistics company provides $10m of warehousing services using facilities located in the U.S.",
    gdpCounts: true, gnpCounts: false,
    explain: "Domestic production → GDP. Foreign-owned → not U.S. GNP."
  },
  {
    id: "p_g8", type: "production", title: "Danish-owned solar farm in U.S.", value: 15,
    desc: "A Danish-owned solar farm located in the U.S. produces electricity services worth $15m this year.",
    gdpCounts: true, gnpCounts: false,
    explain: "Produced in the U.S. → GDP. Foreign-owned → not U.S. GNP."
  },
  {
    id: "p_g9", type: "production", title: "Foreign-owned streaming production in U.S.", value: 9,
    desc: "A foreign-owned streaming company produces $9m of services using staff and studios located in the U.S.",
    gdpCounts: true, gnpCounts: false,
    explain: "Produced in the U.S. → GDP. Foreign-owned → not U.S. GNP."
  },
  {
    id: "p_g10", type: "production", title: "Foreign-owned university campus in U.S.", value: 6,
    desc: "A foreign-owned university campus located in the U.S. provides $6m of educational services this year.",
    gdpCounts: true, gnpCounts: false,
    explain: "Production in the U.S. → GDP. Foreign-owned factors → not U.S. GNP."
  },

  // -------------------------
  // Factor: GNP (RECEIPTS from abroad by U.S. factors)  gnpSign = +1
  // -------------------------
  {
    id: "f_pos1", type: "factor", title: "Dividends from abroad", value: 6, gnpSign: +1,
    desc: "U.S. residents receive $6m in dividends from shares they own in foreign companies.",
    gdpCounts: false, gnpCounts: false,
    explain: "Factor income received from abroad raises NFIA and therefore raises U.S. GNP."
  },
  {
    id: "f_pos2", type: "factor", title: "Interest from foreign bonds", value: 4, gnpSign: +1,
    desc: "U.S. residents receive $4m of interest income from foreign bonds.",
    gdpCounts: false, gnpCounts: false,
    explain: "Income received from abroad (interest) → positive NFIA → higher GNP."
  },
  {
    id: "f_pos3", type: "factor", title: "Profit income from abroad", value: 7, gnpSign: +1,
    desc: "U.S. residents receive $7m in profit income from businesses they own abroad.",
    gdpCounts: false, gnpCounts: false,
    explain: "Profit income received from abroad → positive NFIA → higher GNP."
  },
  {
    id: "f_pos4", type: "factor", title: "Wages earned abroad by U.S. resident", value: 3, gnpSign: +1,
    desc: "U.S. residents earn $3m in wages while working abroad.",
    gdpCounts: false, gnpCounts: false,
    explain: "Wage income received from abroad → positive NFIA → higher GNP."
  },
  {
    id: "f_pos5", type: "factor", title: "Rental income from abroad", value: 2, gnpSign: +1,
    desc: "U.S. residents receive $2m in rental income from property they own abroad.",
    gdpCounts: false, gnpCounts: false,
    explain: "Rent received from abroad raises NFIA → raises GNP."
  },
  {
    id: "f_pos6", type: "factor", title: "Royalties from abroad", value: 5, gnpSign: +1,
    desc: "U.S. residents receive $5m in royalties from intellectual property licensed abroad.",
    gdpCounts: false, gnpCounts: false,
    explain: "Royalties received from abroad are factor income receipts → positive NFIA."
  },
  {
    id: "f_pos7", type: "factor", title: "Consulting income remitted from abroad", value: 4, gnpSign: +1,
    desc: "A U.S. resident working abroad remits $4m of labor income back to the U.S.",
    gdpCounts: false, gnpCounts: false,
    explain: "Labor income received from abroad → positive NFIA → higher GNP."
  },
  {
    id: "f_pos8", type: "factor", title: "Interest from foreign loans", value: 5, gnpSign: +1,
    desc: "U.S. residents receive $5m of interest income from loans made to foreign borrowers.",
    gdpCounts: false, gnpCounts: false,
    explain: "Interest received from abroad increases NFIA and raises GNP."
  },
  {
    id: "f_pos9", type: "factor", title: "Dividend income from foreign mutual fund", value: 3, gnpSign: +1,
    desc: "U.S. residents receive $3m in dividend income from foreign mutual fund holdings.",
    gdpCounts: false, gnpCounts: false,
    explain: "Dividend income received from abroad → positive NFIA → higher GNP."
  },
  {
    id: "f_pos10", type: "factor", title: "Profit income from foreign subsidiary", value: 6, gnpSign: +1,
    desc: "U.S. residents receive $6m in profit income from a foreign subsidiary they own.",
    gdpCounts: false, gnpCounts: false,
    explain: "Profits received from abroad → positive NFIA → raises GNP."
  },
  {
    id: "f_pos11", type: "factor", title: "Rent from foreign commercial property", value: 4, gnpSign: +1,
    desc: "U.S. residents receive $4m of rent from commercial property they own abroad.",
    gdpCounts: false, gnpCounts: false,
    explain: "Rent received from abroad → positive NFIA → higher GNP."
  },
  {
    id: "f_pos12", type: "factor", title: "Wages from foreign contract work", value: 2, gnpSign: +1,
    desc: "U.S. residents receive $2m in wages from contract work performed abroad.",
    gdpCounts: false, gnpCounts: false,
    explain: "Wage income received from abroad → positive NFIA."
  },
  {
    id: "f_pos13", type: "factor", title: "Interest from foreign deposits", value: 2, gnpSign: +1,
    desc: "U.S. residents receive $2m of interest from deposits held in foreign banks.",
    gdpCounts: false, gnpCounts: false,
    explain: "Interest received from abroad increases NFIA and raises GNP."
  },
  {
    id: "f_pos14", type: "factor", title: "Royalties from foreign publishing", value: 3, gnpSign: +1,
    desc: "U.S. residents receive $3m in royalties from books sold abroad.",
    gdpCounts: false, gnpCounts: false,
    explain: "Royalties received from abroad → positive NFIA → higher GNP."
  },
  {
    id: "f_pos15", type: "factor", title: "Profit income from foreign partnership", value: 5, gnpSign: +1,
    desc: "U.S. residents receive $5m in profit income from a partnership located abroad.",
    gdpCounts: false, gnpCounts: false,
    explain: "Profits received from abroad → positive NFIA → raises GNP."
  },

  // -------------------------
  // Factor: NEITHER (PAYMENTS to abroad)  gnpSign = -1
  // -------------------------
  {
    id: "f_neg1", type: "factor", title: "Profits paid to foreign owners", value: 9, gnpSign: -1,
    desc: "Foreign residents receive $9m in profit income generated by U.S. production (production already counted in U.S. GDP).",
    gdpCounts: false, gnpCounts: false,
    explain: "This is a factor payment to foreign residents. It reduces NFIA and lowers GNP via GNP = GDP + NFIA."
  },
  {
    id: "f_neg2", type: "factor", title: "Wages paid to foreign residents", value: 5, gnpSign: -1,
    desc: "Foreign residents receive $5m in wage income from U.S. production (production already counted in U.S. GDP).",
    gdpCounts: false, gnpCounts: false,
    explain: "A factor payment to foreign residents reduces NFIA and lowers GNP (not a GDP item)."
  },
  {
    id: "f_neg3", type: "factor", title: "Interest paid to foreigners", value: 3, gnpSign: -1,
    desc: "Foreign residents receive $3m of interest income from U.S. bonds.",
    gdpCounts: false, gnpCounts: false,
    explain: "Interest paid to foreigners is a negative NFIA component → lowers GNP."
  },
  {
    id: "f_neg4", type: "factor", title: "Rent paid to foreign landlords", value: 2, gnpSign: -1,
    desc: "Foreign residents receive $2m in rental income from property they own in the U.S.",
    gdpCounts: false, gnpCounts: false,
    explain: "Rent paid to foreign residents reduces NFIA and lowers GNP."
  },
  {
    id: "f_neg5", type: "factor", title: "Royalties paid abroad", value: 4, gnpSign: -1,
    desc: "U.S. residents pay $4m in royalties to foreign owners of intellectual property.",
    gdpCounts: false, gnpCounts: false,
    explain: "Royalties paid to foreigners are factor payments abroad → negative NFIA → lower GNP."
  },
  {
    id: "f_neg6", type: "factor", title: "Profits remitted to foreign parent company", value: 6, gnpSign: -1,
    desc: "A U.S. subsidiary remits $6m of profits to its foreign parent company (production already in U.S. GDP).",
    gdpCounts: false, gnpCounts: false,
    explain: "Profit remittances to foreigners reduce NFIA and lower GNP."
  },
  {
    id: "f_neg7", type: "factor", title: "Interest paid on foreign-held loans", value: 5, gnpSign: -1,
    desc: "U.S. borrowers pay $5m of interest to foreign lenders.",
    gdpCounts: false, gnpCounts: false,
    explain: "Interest payments to foreign lenders reduce NFIA and lower GNP."
  },
  {
    id: "f_neg8", type: "factor", title: "Wages to foreign seasonal workers", value: 4, gnpSign: -1,
    desc: "Foreign residents working temporarily in the U.S. receive $4m in wages from U.S. production.",
    gdpCounts: false, gnpCounts: false,
    explain: "Wages paid to foreign residents → negative NFIA → lowers GNP."
  },
  {
    id: "f_neg9", type: "factor", title: "Rent paid to foreign-owned commercial property", value: 3, gnpSign: -1,
    desc: "U.S. businesses pay $3m in rent to foreign residents who own commercial property in the U.S.",
    gdpCounts: false, gnpCounts: false,
    explain: "Rent paid to foreigners reduces NFIA and lowers GNP."
  },
  {
    id: "f_neg10", type: "factor", title: "Dividends paid to foreign shareholders", value: 4, gnpSign: -1,
    desc: "U.S. firms pay $4m in dividends to foreign shareholders (production already in U.S. GDP).",
    gdpCounts: false, gnpCounts: false,
    explain: "Dividends paid to foreigners reduce NFIA and lower GNP."
  },
  {
    id: "f_neg11", type: "factor", title: "Profit distribution to foreign partners", value: 5, gnpSign: -1,
    desc: "U.S. businesses distribute $5m of profits to foreign partners (production already in U.S. GDP).",
    gdpCounts: false, gnpCounts: false,
    explain: "Profits paid to foreign partners reduce NFIA and lower GNP."
  },
  {
    id: "f_neg12", type: "factor", title: "Management fees paid abroad", value: 2, gnpSign: -1,
    desc: "U.S. firms pay $2m in management fees to a foreign parent company.",
    gdpCounts: false, gnpCounts: false,
    explain: "Payments to foreign factors reduce NFIA and lower GNP."
  },
  {
    id: "f_neg13", type: "factor", title: "Interest paid on foreign-held deposits", value: 2, gnpSign: -1,
    desc: "U.S. banks pay $2m of interest to foreign residents holding U.S. deposits.",
    gdpCounts: false, gnpCounts: false,
    explain: "Interest paid to foreigners reduces NFIA and lowers GNP."
  },
  {
    id: "f_neg14", type: "factor", title: "Royalties to foreign patent holders", value: 3, gnpSign: -1,
    desc: "U.S. firms pay $3m in royalties to foreign patent holders.",
    gdpCounts: false, gnpCounts: false,
    explain: "Royalties paid abroad reduce NFIA and lower GNP."
  },
  {
    id: "f_neg15", type: "factor", title: "Wages to foreign consultants in U.S.", value: 3, gnpSign: -1,
    desc: "Foreign residents providing services in the U.S. receive $3m in labor income from U.S. production.",
    gdpCounts: false, gnpCounts: false,
    explain: "Labor income paid to foreign residents reduces NFIA and lowers GNP."
  }
];
