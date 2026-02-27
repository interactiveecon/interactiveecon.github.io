// data.js
// Each scenario defines what happens to demand and supply separately.
// action: "NONE" | "ALONG" | "SHIFT"
// dir for ALONG: "UP" | "DOWN" | "NA"
// dir for SHIFT: "R" | "L" | "NA"

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
    // Price changes (movement along both curves)
    {
      id:"p_up",
      title:"The price of the good increases",
      desc:"The market price of this good rises.",
      demand:{ action:"ALONG", dir:"UP" },
      supply:{ action:"ALONG", dir:"UP" },
      why:{ side:"N", factor:"Price of the good" },
      explain:"A change in the price of the good causes a movement along both curves."
    },
    {
      id:"p_down",
      title:"The price of the good decreases",
      desc:"The market price of this good falls.",
      demand:{ action:"ALONG", dir:"DOWN" },
      supply:{ action:"ALONG", dir:"DOWN" },
      why:{ side:"N", factor:"Price of the good" },
      explain:"A change in the price of the good causes a movement along both curves."
    },

    // Demand shifts
    {
      id:"inc_up",
      title:"Income rises (normal good)",
      desc:"Consumers’ incomes rise and this good is a normal good.",
      demand:{ action:"SHIFT", dir:"R" },
      supply:{ action:"NONE", dir:"NA" },
      why:{ side:"D", factor:"Income" },
      explain:"Higher income increases demand for a normal good (demand shifts right)."
    },
    {
      id:"sub_up",
      title:"A substitute becomes more expensive",
      desc:"The price of a substitute good rises.",
      demand:{ action:"SHIFT", dir:"R" },
      supply:{ action:"NONE", dir:"NA" },
      why:{ side:"D", factor:"Prices of substitutes" },
      explain:"If substitutes become more expensive, consumers switch toward this good (demand shifts right)."
    },
    {
      id:"comp_up",
      title:"A complement becomes more expensive",
      desc:"The price of a complement good rises.",
      demand:{ action:"SHIFT", dir:"L" },
      supply:{ action:"NONE", dir:"NA" },
      why:{ side:"D", factor:"Prices of complements" },
      explain:"If complements become more expensive, people buy less of the bundle (demand shifts left)."
    },
    {
      id:"taste_up",
      title:"This good becomes more popular",
      desc:"Tastes shift in favor of this good.",
      demand:{ action:"SHIFT", dir:"R" },
      supply:{ action:"NONE", dir:"NA" },
      why:{ side:"D", factor:"Tastes / preferences" },
      explain:"More favorable tastes increase demand (right shift)."
    },
    {
      id:"buyers_up",
      title:"Number of buyers increases",
      desc:"More consumers enter this market.",
      demand:{ action:"SHIFT", dir:"R" },
      supply:{ action:"NONE", dir:"NA" },
      why:{ side:"D", factor:"Number of buyers" },
      explain:"More buyers increases demand (right shift)."
    },

    // Supply shifts
    {
      id:"input_up",
      title:"Input costs rise",
      desc:"The cost of an important input (like wages or materials) increases.",
      demand:{ action:"NONE", dir:"NA" },
      supply:{ action:"SHIFT", dir:"L" },
      why:{ side:"S", factor:"Input costs" },
      explain:"Higher input costs decrease supply (left shift)."
    },
    {
      id:"tech_up",
      title:"Technology improves",
      desc:"Firms adopt better technology that makes production more efficient.",
      demand:{ action:"NONE", dir:"NA" },
      supply:{ action:"SHIFT", dir:"R" },
      why:{ side:"S", factor:"Technology / productivity" },
      explain:"Better technology increases supply (right shift)."
    },
    {
      id:"tax",
      title:"A per-unit tax is imposed",
      desc:"The government imposes a tax on sellers for each unit sold.",
      demand:{ action:"NONE", dir:"NA" },
      supply:{ action:"SHIFT", dir:"L" },
      why:{ side:"S", factor:"Taxes / subsidies" },
      explain:"Taxes raise sellers’ costs, decreasing supply (left shift)."
    },
    {
      id:"subsidy",
      title:"A subsidy is introduced",
      desc:"The government gives sellers a subsidy per unit sold.",
      demand:{ action:"NONE", dir:"NA" },
      supply:{ action:"SHIFT", dir:"R" },
      why:{ side:"S", factor:"Taxes / subsidies" },
      explain:"Subsidies lower effective costs, increasing supply (right shift)."
    },
    {
      id:"bad_weather",
      title:"Bad weather damages production",
      desc:"A natural event makes it harder to produce the good.",
      demand:{ action:"NONE", dir:"NA" },
      supply:{ action:"SHIFT", dir:"L" },
      why:{ side:"S", factor:"Natural conditions / regulation" },
      explain:"Worse production conditions reduce supply (left shift)."
    }
  ]
};
