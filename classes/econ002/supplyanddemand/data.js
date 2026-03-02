// data.js
// Each scenario defines what happens to demand and supply separately.
// action: "NONE" | "ALONG" | "SHIFT"
// dir for ALONG: "UP" | "DOWN" | "NA"
// dir for SHIFT: "R" | "L" | "NA"
// For demand shift, supply must be ALONG (price changes).
// For supply shift, demand must be ALONG (price changes).

window.ALONG_SHIFT_DATA = {
  demandShifters: [
    "Income",
    "Prices of substitutes",
    "Prices of complements",
    "Tastes / preferences",
    "Expected future price",
    "Number of buyers"
  ],
  supplyShifters: [
    "Input costs",
    "Technology / productivity",
    "Taxes / subsidies",
    "Number of sellers",
    "Expected future price",
    "Natural conditions / regulation"
  ],

  scenarios: [
    // ---------------- Demand shifts (supply moves along) ----------------
    {
      id:"inc_up",
      title:"Income rises (normal good)",
      desc:"Consumers’ incomes rise and this good is a normal good.",
      demand:{ action:"SHIFT", dir:"R" },
      supply:{ action:"ALONG", dir:"UP" },
      why:{ side:"D", factor:"Income" },
      explain:"Demand increases. The equilibrium price rises, so there is a movement up along supply."
    },
    {
      id:"inc_down",
      title:"Income falls (normal good)",
      desc:"Consumers’ incomes fall and this good is a normal good.",
      demand:{ action:"SHIFT", dir:"L" },
      supply:{ action:"ALONG", dir:"DOWN" },
      why:{ side:"D", factor:"Income" },
      explain:"Demand decreases. The equilibrium price falls, so there is a movement down along supply."
    },
    {
      id:"sub_up",
      title:"A substitute becomes more expensive",
      desc:"The price of a substitute good rises.",
      demand:{ action:"SHIFT", dir:"R" },
      supply:{ action:"ALONG", dir:"UP" },
      why:{ side:"D", factor:"Prices of substitutes" },
      explain:"Demand increases (people switch toward this good). Price rises → move up along supply."
    },
    {
      id:"sub_down",
      title:"A substitute becomes cheaper",
      desc:"The price of a substitute good falls.",
      demand:{ action:"SHIFT", dir:"L" },
      supply:{ action:"ALONG", dir:"DOWN" },
      why:{ side:"D", factor:"Prices of substitutes" },
      explain:"Demand decreases (people switch away). Price falls → move down along supply."
    },
    {
      id:"comp_up",
      title:"A complement becomes more expensive",
      desc:"The price of a complement good rises.",
      demand:{ action:"SHIFT", dir:"L" },
      supply:{ action:"ALONG", dir:"DOWN" },
      why:{ side:"D", factor:"Prices of complements" },
      explain:"Demand decreases (bundle is less attractive). Price falls → move down along supply."
    },
    {
      id:"comp_down",
      title:"A complement becomes cheaper",
      desc:"The price of a complement good falls.",
      demand:{ action:"SHIFT", dir:"R" },
      supply:{ action:"ALONG", dir:"UP" },
      why:{ side:"D", factor:"Prices of complements" },
      explain:"Demand increases (bundle is more attractive). Price rises → move up along supply."
    },
    {
      id:"taste_up",
      title:"This good becomes more popular",
      desc:"Tastes shift in favor of this good.",
      demand:{ action:"SHIFT", dir:"R" },
      supply:{ action:"ALONG", dir:"UP" },
      why:{ side:"D", factor:"Tastes / preferences" },
      explain:"Demand increases. Price rises → move up along supply."
    },
    {
      id:"taste_down",
      title:"This good becomes less popular",
      desc:"Tastes shift away from this good.",
      demand:{ action:"SHIFT", dir:"L" },
      supply:{ action:"ALONG", dir:"DOWN" },
      why:{ side:"D", factor:"Tastes / preferences" },
      explain:"Demand decreases. Price falls → move down along supply."
    },
    {
      id:"exp_future_up_D",
      title:"Expected future price rises",
      desc:"Consumers expect this good’s price to be higher in the future.",
      demand:{ action:"SHIFT", dir:"R" },
      supply:{ action:"ALONG", dir:"UP" },
      why:{ side:"D", factor:"Expected future price" },
      explain:"Demand increases today (buy now). Price rises → move up along supply."
    },
    {
      id:"exp_future_down_D",
      title:"Expected future price falls",
      desc:"Consumers expect this good’s price to be lower in the future.",
      demand:{ action:"SHIFT", dir:"L" },
      supply:{ action:"ALONG", dir:"DOWN" },
      why:{ side:"D", factor:"Expected future price" },
      explain:"Demand decreases today (wait to buy later). Price falls → move down along supply."
    },
    {
      id:"buyers_up",
      title:"Number of buyers increases",
      desc:"More consumers enter the market.",
      demand:{ action:"SHIFT", dir:"R" },
      supply:{ action:"ALONG", dir:"UP" },
      why:{ side:"D", factor:"Number of buyers" },
      explain:"Demand increases. Price rises → move up along supply."
    },
    {
      id:"buyers_down",
      title:"Number of buyers decreases",
      desc:"Some consumers leave the market.",
      demand:{ action:"SHIFT", dir:"L" },
      supply:{ action:"ALONG", dir:"DOWN" },
      why:{ side:"D", factor:"Number of buyers" },
      explain:"Demand decreases. Price falls → move down along supply."
    },

    // ---------------- Supply shifts (demand moves along) ----------------
    {
      id:"input_up",
      title:"Input costs rise",
      desc:"Wages/material costs rise for firms producing the good.",
      demand:{ action:"ALONG", dir:"UP" },
      supply:{ action:"SHIFT", dir:"L" },
      why:{ side:"S", factor:"Input costs" },
      explain:"Supply decreases. Price rises → move up along demand (Qd falls)."
    },
    {
      id:"input_down",
      title:"Input costs fall",
      desc:"Wages/material costs fall for firms producing the good.",
      demand:{ action:"ALONG", dir:"DOWN" },
      supply:{ action:"SHIFT", dir:"R" },
      why:{ side:"S", factor:"Input costs" },
      explain:"Supply increases. Price falls → move down along demand (Qd rises)."
    },
    {
      id:"tech_up",
      title:"Technology improves",
      desc:"Firms adopt better technology, lowering costs.",
      demand:{ action:"ALONG", dir:"DOWN" },
      supply:{ action:"SHIFT", dir:"R" },
      why:{ side:"S", factor:"Technology / productivity" },
      explain:"Supply increases. Price falls → move down along demand."
    },
    {
      id:"tech_down",
      title:"Technology gets worse / disruption",
      desc:"A disruption makes production less efficient.",
      demand:{ action:"ALONG", dir:"UP" },
      supply:{ action:"SHIFT", dir:"L" },
      why:{ side:"S", factor:"Technology / productivity" },
      explain:"Supply decreases. Price rises → move up along demand."
    },
    {
      id:"tax",
      title:"A per-unit tax is imposed",
      desc:"A new tax raises the cost of selling each unit.",
      demand:{ action:"ALONG", dir:"UP" },
      supply:{ action:"SHIFT", dir:"L" },
      why:{ side:"S", factor:"Taxes / subsidies" },
      explain:"Supply decreases. Price rises → move up along demand."
    },
    {
      id:"subsidy",
      title:"A per-unit subsidy is introduced",
      desc:"A subsidy lowers the effective cost of selling each unit.",
      demand:{ action:"ALONG", dir:"DOWN" },
      supply:{ action:"SHIFT", dir:"R" },
      why:{ side:"S", factor:"Taxes / subsidies" },
      explain:"Supply increases. Price falls → move down along demand."
    },
    {
      id:"sellers_up",
      title:"More firms enter the market",
      desc:"The number of sellers increases.",
      demand:{ action:"ALONG", dir:"DOWN" },
      supply:{ action:"SHIFT", dir:"R" },
      why:{ side:"S", factor:"Number of sellers" },
      explain:"Supply increases. Price falls → move down along demand."
    },
    {
      id:"sellers_down",
      title:"Firms exit the market",
      desc:"The number of sellers decreases.",
      demand:{ action:"ALONG", dir:"UP" },
      supply:{ action:"SHIFT", dir:"L" },
      why:{ side:"S", factor:"Number of sellers" },
      explain:"Supply decreases. Price rises → move up along demand."
    },
    {
      id:"exp_future_up_S",
      title:"Sellers expect higher future prices",
      desc:"Producers expect the price to be higher next month.",
      demand:{ action:"ALONG", dir:"UP" },
      supply:{ action:"SHIFT", dir:"L" },
      why:{ side:"S", factor:"Expected future price" },
      explain:"Supply today decreases (sell later). Price rises → move up along demand."
    },
    {
      id:"exp_future_down_S",
      title:"Sellers expect lower future prices",
      desc:"Producers expect the price to be lower next month.",
      demand:{ action:"ALONG", dir:"DOWN" },
      supply:{ action:"SHIFT", dir:"R" },
      why:{ side:"S", factor:"Expected future price" },
      explain:"Supply today increases (sell now). Price falls → move down along demand."
    },
    {
      id:"bad_weather",
      title:"Bad weather hurts production",
      desc:"A natural event makes it harder to produce the good.",
      demand:{ action:"ALONG", dir:"UP" },
      supply:{ action:"SHIFT", dir:"L" },
      why:{ side:"S", factor:"Natural conditions / regulation" },
      explain:"Supply decreases. Price rises → move up along demand."
    },
    {
      id:"regulation",
      title:"New regulation increases compliance costs",
      desc:"A new rule increases the cost of production.",
      demand:{ action:"ALONG", dir:"UP" },
      supply:{ action:"SHIFT", dir:"L" },
      why:{ side:"S", factor:"Natural conditions / regulation" },
      explain:"Supply decreases. Price rises → move up along demand."
    }
  ]
};
