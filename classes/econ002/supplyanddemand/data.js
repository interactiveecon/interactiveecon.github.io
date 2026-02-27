// data.js
// Scenario classification fields:
// curve: "D" | "S" | "N" (N = neither: price-only movement along both)
// type: "ALONG" | "SHIFT"
// dir: "R" | "L" | "NA"
// why: { side: "D"|"S", factor: string } OR { side: "N", factor: "Price of the good" }

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
    // --------- Movement along (price of the good) ----------
    {
      id:"p_up",
      title:"The price of the good increases",
      desc:"The market price of this good rises.",
      curve:"N", type:"ALONG", dir:"NA",
      why:{ side:"N", factor:"Price of the good" },
      explain:"A change in the price of the good causes a movement along both curves: quantity demanded falls and quantity supplied rises."
    },
    {
      id:"p_down",
      title:"The price of the good decreases",
      desc:"The market price of this good falls.",
      curve:"N", type:"ALONG", dir:"NA",
      why:{ side:"N", factor:"Price of the good" },
      explain:"A change in the price of the good causes a movement along both curves: quantity demanded rises and quantity supplied falls."
    },

    // --------- Demand shifts ----------
    {
      id:"inc_up",
      title:"Income rises (normal good)",
      desc:"Consumers’ incomes rise and this good is a normal good.",
      curve:"D", type:"SHIFT", dir:"R",
      why:{ side:"D", factor:"Income" },
      explain:"Higher income increases demand for a normal good (demand shifts right)."
    },
    {
      id:"inc_down",
      title:"Income falls (normal good)",
      desc:"Consumers’ incomes fall and this good is a normal good.",
      curve:"D", type:"SHIFT", dir:"L",
      why:{ side:"D", factor:"Income" },
      explain:"Lower income decreases demand for a normal good (demand shifts left)."
    },
    {
      id:"sub_up",
      title:"A substitute becomes more expensive",
      desc:"The price of a substitute good rises.",
      curve:"D", type:"SHIFT", dir:"R",
      why:{ side:"D", factor:"Prices of substitutes" },
      explain:"If substitutes become more expensive, consumers switch toward this good, increasing demand (right shift)."
    },
    {
      id:"sub_down",
      title:"A substitute becomes cheaper",
      desc:"The price of a substitute good falls.",
      curve:"D", type:"SHIFT", dir:"L",
      why:{ side:"D", factor:"Prices of substitutes" },
      explain:"If substitutes become cheaper, consumers switch away from this good, decreasing demand (left shift)."
    },
    {
      id:"comp_up",
      title:"A complement becomes more expensive",
      desc:"The price of a complement good rises.",
      curve:"D", type:"SHIFT", dir:"L",
      why:{ side:"D", factor:"Prices of complements" },
      explain:"If complements become more expensive, people buy less of the bundle, decreasing demand for this good (left shift)."
    },
    {
      id:"comp_down",
      title:"A complement becomes cheaper",
      desc:"The price of a complement good falls.",
      curve:"D", type:"SHIFT", dir:"R",
      why:{ side:"D", factor:"Prices of complements" },
      explain:"If complements become cheaper, people buy more of the bundle, increasing demand for this good (right shift)."
    },
    {
      id:"taste_up",
      title:"This good becomes more popular",
      desc:"Tastes shift in favor of this good.",
      curve:"D", type:"SHIFT", dir:"R",
      why:{ side:"D", factor:"Tastes / preferences" },
      explain:"More favorable tastes increase demand (demand shifts right)."
    },
    {
      id:"taste_down",
      title:"This good becomes less popular",
      desc:"Tastes shift away from this good.",
      curve:"D", type:"SHIFT", dir:"L",
      why:{ side:"D", factor:"Tastes / preferences" },
      explain:"Less favorable tastes decrease demand (demand shifts left)."
    },
    {
      id:"exp_future_up",
      title:"Expected future price increases",
      desc:"Consumers expect the price of this good to rise in the future.",
      curve:"D", type:"SHIFT", dir:"R",
      why:{ side:"D", factor:"Expected future price" },
      explain:"If people expect higher future prices, they may buy more now, increasing current demand (right shift)."
    },
    {
      id:"buyers_up",
      title:"Number of buyers increases",
      desc:"The number of consumers in the market rises.",
      curve:"D", type:"SHIFT", dir:"R",
      why:{ side:"D", factor:"Number of buyers" },
      explain:"More buyers means higher demand at each price (demand shifts right)."
    },
    {
      id:"buyers_down",
      title:"Number of buyers decreases",
      desc:"The number of consumers in the market falls.",
      curve:"D", type:"SHIFT", dir:"L",
      why:{ side:"D", factor:"Number of buyers" },
      explain:"Fewer buyers means lower demand at each price (demand shifts left)."
    },

    // --------- Supply shifts ----------
    {
      id:"input_up",
      title:"Input costs rise",
      desc:"The cost of an important input (like wages or materials) increases.",
      curve:"S", type:"SHIFT", dir:"L",
      why:{ side:"S", factor:"Input costs" },
      explain:"Higher input costs make production more expensive, decreasing supply (supply shifts left)."
    },
    {
      id:"input_down",
      title:"Input costs fall",
      desc:"The cost of an important input decreases.",
      curve:"S", type:"SHIFT", dir:"R",
      why:{ side:"S", factor:"Input costs" },
      explain:"Lower input costs make production cheaper, increasing supply (supply shifts right)."
    },
    {
      id:"tech_up",
      title:"Technology improves",
      desc:"Firms adopt better technology that makes production more efficient.",
      curve:"S", type:"SHIFT", dir:"R",
      why:{ side:"S", factor:"Technology / productivity" },
      explain:"Better technology raises productivity and increases supply (right shift)."
    },
    {
      id:"tax",
      title:"A per-unit tax is imposed",
      desc:"The government imposes a tax on sellers for each unit sold.",
      curve:"S", type:"SHIFT", dir:"L",
      why:{ side:"S", factor:"Taxes / subsidies" },
      explain:"Taxes raise sellers’ costs, decreasing supply (left shift)."
    },
    {
      id:"subsidy",
      title:"A subsidy is introduced",
      desc:"The government gives sellers a subsidy per unit sold.",
      curve:"S", type:"SHIFT", dir:"R",
      why:{ side:"S", factor:"Taxes / subsidies" },
      explain:"Subsidies lower effective costs, increasing supply (right shift)."
    },
    {
      id:"sellers_up",
      title:"More firms enter the market",
      desc:"The number of sellers increases.",
      curve:"S", type:"SHIFT", dir:"R",
      why:{ side:"S", factor:"Number of sellers" },
      explain:"More sellers means more supply at each price (supply shifts right)."
    },
    {
      id:"sellers_down",
      title:"Firms exit the market",
      desc:"The number of sellers decreases.",
      curve:"S", type:"SHIFT", dir:"L",
      why:{ side:"S", factor:"Number of sellers" },
      explain:"Fewer sellers means less supply at each price (supply shifts left)."
    },
    {
      id:"exp_future_price_up_s",
      title:"Sellers expect higher future prices",
      desc:"Producers expect the price of this good to rise in the future.",
      curve:"S", type:"SHIFT", dir:"L",
      why:{ side:"S", factor:"Expected future price" },
      explain:"If sellers expect higher future prices, they may supply less today (left shift) to sell more later."
    },
    {
      id:"bad_weather",
      title:"Bad weather damages production",
      desc:"A natural event makes it harder to produce the good.",
      curve:"S", type:"SHIFT", dir:"L",
      why:{ side:"S", factor:"Natural conditions / regulation" },
      explain:"Worse production conditions reduce supply (left shift)."
    }
  ]
};
