const ITEM_BANK = [
  // -------------------------
  // INCLUDED (IN): domestic final production; investment; inventories; gov purchases; exports; market services
  // -------------------------
  {
    id: "in1", bucket: "IN", value: 18,
    title: "New car produced in U.S.",
    desc: "A U.S. factory produces $18m worth of new cars this year.",
    explain: "New final goods produced domestically this year are included in GDP."
  },
  {
    id: "in2", bucket: "IN", value: 9,
    title: "Haircuts in U.S.",
    desc: "Barbers provide $9m of haircut services in the U.S. this year.",
    explain: "Market services produced domestically are included in GDP."
  },
  {
    id: "in3", bucket: "IN", value: 22,
    title: "New factory built in U.S.",
    desc: "A firm builds a new factory in the U.S. worth $22m this year.",
    explain: "New capital goods (investment) produced domestically are included."
  },
  {
    id: "in4", bucket: "IN", value: 16,
    title: "New home construction",
    desc: "Builders construct new homes worth $16m in the U.S. this year.",
    explain: "New residential construction is investment and is included."
  },
  {
    id: "in5", bucket: "IN", value: 14,
    title: "Government purchases road services",
    desc: "The government pays $14m to build/repair roads (a purchase of services).",
    explain: "Government purchases of goods/services are included (not transfers)."
  },
  {
    id: "in6", bucket: "IN", value: 12,
    title: "Exports produced in U.S.",
    desc: "A U.S. firm produces $12m of goods in the U.S. that are sold abroad (exports).",
    explain: "Exports are domestically produced and included in GDP."
  },
  {
    id: "in7", bucket: "IN", value: 10,
    title: "Inventories rise",
    desc: "A firm produces $10m of goods this year that remain unsold and add to inventories.",
    explain: "Inventory investment counts as part of investment and is included."
  },
  {
    id: "in8", bucket: "IN", value: 7,
    title: "Banking service fees",
    desc: "Banks charge $7m in service fees for account services in the U.S.",
    explain: "Fees for financial services are production and included (asset trades are excluded)."
  },
  {
    id: "in9", bucket: "IN", value: 6,
    title: "Realtor commission on a home sale",
    desc: "A realtor earns $6m in commissions helping sell homes this year.",
    explain: "The commission is a current service and is included even if the home is used."
  },
  {
    id: "in10", bucket: "IN", value: 11,
    title: "Public school services",
    desc: "Public schools provide $11m worth of educational services (measured by costs).",
    explain: "Government-provided services are included (valued by cost)."
  },
  {
    id: "in11", bucket: "IN", value: 8,
    title: "Restaurant meals",
    desc: "Restaurants produce $8m of meal services in the U.S. this year.",
    explain: "Market services produced domestically are included."
  },
  {
    id: "in12", bucket: "IN", value: 13,
    title: "New software purchased by firms",
    desc: "Firms purchase $13m of newly produced software as an investment good.",
    explain: "Newly produced investment goods are included."
  },
  {
    id: "in13", bucket: "IN", value: 9,
    title: "New machines purchased by a firm",
    desc: "A firm buys $9m of newly produced machinery made in the U.S.",
    explain: "New capital goods are investment and included in GDP."
  },
  {
    id: "in14", bucket: "IN", value: 10,
    title: "Doctor visits",
    desc: "Clinics provide $10m of medical services in the U.S. this year.",
    explain: "Market services produced domestically are included in GDP."
  },
  {
    id: "in15", bucket: "IN", value: 6,
    title: "Movie theater services",
    desc: "Movie theaters provide $6m of entertainment services in the U.S.",
    explain: "Market services produced domestically are included."
  },
  {
    id: "in16", bucket: "IN", value: 8,
    title: "Childcare services",
    desc: "Licensed childcare centers provide $8m of childcare services in the U.S.",
    explain: "Market services produced domestically are included."
  },
  {
    id: "in17", bucket: "IN", value: 7,
    title: "New laptops produced in U.S.",
    desc: "A U.S. plant produces $7m of new laptops purchased by households.",
    explain: "New final goods produced domestically are included."
  },
  {
    id: "in18", bucket: "IN", value: 5,
    title: "Exported consulting services",
    desc: "A U.S. consulting firm provides $5m of services to a foreign client.",
    explain: "Exports of domestically produced services are included in GDP."
  },
  {
    id: "in19", bucket: "IN", value: 6,
    title: "Government buys new computers",
    desc: "The government buys $6m of new computers produced in the U.S.",
    explain: "Government purchases of goods/services are included."
  },
  {
    id: "in20", bucket: "IN", value: 7,
    title: "New roads and bridges constructed",
    desc: "Construction firms produce $7m of infrastructure services for the government.",
    explain: "Government purchases of current production are included."
  },
  {
    id: "in21", bucket: "IN", value: 4,
    title: "Auto repair services",
    desc: "Mechanics provide $4m of auto repair services in the U.S.",
    explain: "Services are current production and included in GDP."
  },
  {
    id: "in22", bucket: "IN", value: 5,
    title: "Hotel lodging services",
    desc: "Hotels provide $5m of lodging services in the U.S. this year.",
    explain: "Market services produced domestically are included."
  },

  // -------------------------
  // INTERMEDIATE (INT): intermediate inputs excluded to avoid double counting
  // -------------------------
  {
    id: "int1", bucket: "INT", value: 9,
    title: "Steel sold to car maker",
    desc: "A steel producer sells $9m of steel to a car maker to build cars.",
    explain: "Intermediate goods are excluded to avoid double counting in the final car value."
  },
  {
    id: "int2", bucket: "INT", value: 6,
    title: "Flour sold to bakery",
    desc: "A mill sells $6m of flour to a bakery to bake bread.",
    explain: "Intermediate input—its value is counted in the final bread."
  },
  {
    id: "int3", bucket: "INT", value: 5,
    title: "Chips sold to electronics firm",
    desc: "A chip maker sells $5m of chips to an electronics company for final devices.",
    explain: "Intermediate input excluded; final device value includes it."
  },
  {
    id: "int4", bucket: "INT", value: 7,
    title: "Wholesale goods bought for resale",
    desc: "A retailer buys $7m of goods from a wholesaler to resell to consumers.",
    explain: "To avoid double counting, GDP focuses on value added; the final sale captures the chain."
  },
  {
    id: "int5", bucket: "INT", value: 4,
    title: "Packaging sold to beverage company",
    desc: "A packaging firm sells $4m of bottles to a beverage company.",
    explain: "Intermediate input excluded to avoid double counting."
  },
  {
    id: "int6", bucket: "INT", value: 6,
    title: "Fabric sold to clothing manufacturer",
    desc: "A textile firm sells $6m of fabric to a clothing manufacturer.",
    explain: "Intermediate input excluded; value shows up in the final clothing."
  },
  {
    id: "int7", bucket: "INT", value: 5,
    title: "Electricity used in production",
    desc: "A manufacturer buys $5m of electricity as an input to produce final goods.",
    explain: "This is an intermediate input; GDP counts value added rather than double counting inputs."
  },
  {
    id: "int8", bucket: "INT", value: 4,
    title: "Business buys raw lumber for furniture",
    desc: "A furniture maker buys $4m of lumber as an input to produce furniture.",
    explain: "Intermediate input excluded to avoid double counting."
  },
  {
    id: "int9", bucket: "INT", value: 3,
    title: "Coffee beans sold to a café",
    desc: "A supplier sells $3m of coffee beans to cafés to make drinks for customers.",
    explain: "Beans are intermediate; the final drink’s value is what counts."
  },
  {
    id: "int10", bucket: "INT", value: 5,
    title: "Parts sold to an auto repair shop",
    desc: "A parts supplier sells $5m of parts to repair shops to fix customers’ cars.",
    explain: "Parts are intermediate; the repair service to the customer is the final output."
  },

  // -------------------------
  // TRANSFERS / FINANCIAL (TF): not payment for current production
  // -------------------------
  {
    id: "tf1", bucket: "TF", value: 10,
    title: "Unemployment benefits",
    desc: "The government pays $10m in unemployment benefits.",
    explain: "Transfers are not payments for current production, so excluded."
  },
  {
    id: "tf2", bucket: "TF", value: 8,
    title: "Social Security payments",
    desc: "The government pays $8m in Social Security benefits.",
    explain: "Transfer payment—not tied to current production."
  },
  {
    id: "tf3", bucket: "TF", value: 15,
    title: "Stock purchase",
    desc: "Households buy $15m of existing shares on the stock market.",
    explain: "Buying existing financial assets is not production—excluded."
  },
  {
    id: "tf4", bucket: "TF", value: 12,
    title: "Bond purchase",
    desc: "Households buy $12m of government bonds.",
    explain: "Financial transactions are not production of goods/services—excluded."
  },
  {
    id: "tf5", bucket: "TF", value: 9,
    title: "Capital gains",
    desc: "Investors realize $9m in capital gains from rising stock prices.",
    explain: "Capital gains reflect asset price changes, not current production."
  },
  {
    id: "tf6", bucket: "TF", value: 6,
    title: "Charitable donation",
    desc: "Households donate $6m to a charity (a transfer).",
    explain: "Donations/transfers are not payments for current production."
  },
  {
    id: "tf7", bucket: "TF", value: 5,
    title: "Student loan repayment (principal)",
    desc: "Borrowers repay $5m of student loan principal to lenders.",
    explain: "Repaying loan principal is a financial transaction, not production."
  },
  {
    id: "tf8", bucket: "TF", value: 7,
    title: "Insurance payout after a storm",
    desc: "An insurer pays $7m in claims after storm damage.",
    explain: "Insurance claim payments are transfers, not new production."
  },
  {
    id: "tf9", bucket: "TF", value: 4,
    title: "Inheritance transfer",
    desc: "A household receives $4m as an inheritance.",
    explain: "Inheritance is a transfer of wealth, not current production."
  },
  {
    id: "tf10", bucket: "TF", value: 6,
    title: "Government stimulus checks",
    desc: "The government sends $6m in stimulus checks to households.",
    explain: "Stimulus checks are transfers, not purchases of goods/services."
  },
  {
    id: "tf11", bucket: "TF", value: 8,
    title: "Household buys cryptocurrency",
    desc: "Households buy $8m of cryptocurrency on an exchange.",
    explain: "Buying financial assets is not production of goods/services."
  },
  {
    id: "tf12", bucket: "TF", value: 3,
    title: "Paying property taxes",
    desc: "Households pay $3m in property taxes to the government.",
    explain: "Taxes are not purchases of current goods/services by households."
  },

  // -------------------------
  // USED / NON-MARKET (USED): used goods and non-market household production
  // -------------------------
  {
    id: "u1", bucket: "USED", value: 20,
    title: "Sale of an existing home",
    desc: "An existing home is sold for $20m this year.",
    explain: "Used assets are not current production; the home sale itself is excluded."
  },
  {
    id: "u2", bucket: "USED", value: 7,
    title: "Used car sale",
    desc: "A used car is sold for $7m this year.",
    explain: "Used goods sales are excluded (no new production)."
  },
  {
    id: "u3", bucket: "USED", value: 5,
    title: "Home-cooked meals at home",
    desc: "Households cook meals at home valued at $5m (imputed).",
    explain: "Non-market household production is generally excluded from GDP."
  },
  {
    id: "u4", bucket: "USED", value: 6,
    title: "Do-it-yourself home repairs",
    desc: "Homeowners perform their own repairs valued at $6m (imputed).",
    explain: "Non-market household production is excluded."
  },
  {
    id: "u5", bucket: "USED", value: 4,
    title: "Used furniture sale",
    desc: "Used furniture is sold for $4m this year.",
    explain: "Used goods are not current production; the sale is excluded."
  },
  {
    id: "u6", bucket: "USED", value: 3,
    title: "Used textbook sale",
    desc: "Students resell used textbooks for $3m this year.",
    explain: "Used goods sales are excluded from GDP."
  },
  {
    id: "u7", bucket: "USED", value: 5,
    title: "Selling a used smartphone",
    desc: "Households resell used smartphones for $5m this year.",
    explain: "Resale of used goods is excluded (no new production)."
  },
  {
    id: "u8", bucket: "USED", value: 2,
    title: "Home childcare by a parent",
    desc: "A parent provides childcare at home valued at $2m (imputed).",
    explain: "Non-market household services are generally excluded."
  },
  {
    id: "u9", bucket: "USED", value: 3,
    title: "Volunteer work valued (imputed)",
    desc: "Volunteers provide services valued at $3m (imputed).",
    explain: "Unpaid volunteer work is generally excluded from GDP."
  },

  // -------------------------
  // IMPORTS (IMP): produced abroad, excluded from U.S. GDP
  // -------------------------
  {
    id: "imp1", bucket: "IMP", value: 12,
    title: "Imported cars purchased in U.S.",
    desc: "U.S. households buy $12m of cars produced abroad.",
    explain: "Production occurred abroad, so it is not included in U.S. GDP (it enters as imports in net exports)."
  },
  {
    id: "imp2", bucket: "IMP", value: 8,
    title: "Imported phones purchased in U.S.",
    desc: "U.S. households buy $8m of phones produced abroad.",
    explain: "Not domestic production → excluded from U.S. GDP."
  },
  {
    id: "imp3", bucket: "IMP", value: 6,
    title: "Imported wine purchased in U.S.",
    desc: "U.S. households buy $6m of wine produced abroad.",
    explain: "Production is abroad → excluded from U.S. GDP."
  },
  {
    id: "imp4", bucket: "IMP", value: 7,
    title: "Imported clothing purchased in U.S.",
    desc: "U.S. households buy $7m of clothing produced abroad.",
    explain: "Imports are produced abroad, so excluded from U.S. GDP."
  },
  {
    id: "imp5", bucket: "IMP", value: 5,
    title: "Imported furniture purchased in U.S.",
    desc: "U.S. households buy $5m of furniture produced abroad.",
    explain: "Imports are not domestic production, so excluded from U.S. GDP."
  },
  {
    id: "imp6", bucket: "IMP", value: 9,
    title: "Imported machine purchased by a firm",
    desc: "A U.S. firm buys a $9m machine that was produced abroad.",
    explain: "Even if it is investment, if produced abroad it is not part of U.S. GDP."
  },
  {
    id: "imp7", bucket: "IMP", value: 6,
    title: "Imported intermediate input purchased by a firm",
    desc: "A U.S. firm buys $6m of imported components used to make final goods.",
    explain: "The imported input is produced abroad; U.S. GDP counts domestic value added, not foreign production."
  },
  {
    id: "imp8", bucket: "IMP", value: 4,
    title: "Imported oil purchased in U.S.",
    desc: "Firms buy $4m of oil produced abroad.",
    explain: "The oil is produced abroad, so excluded from U.S. GDP."
  },
  {
    id: "imp9", bucket: "IMP", value: 5,
    title: "Imported medical equipment purchased by hospitals",
    desc: "Hospitals buy $5m of equipment produced abroad.",
    explain: "The equipment is produced abroad, so it is not part of U.S. GDP."
  }
];
