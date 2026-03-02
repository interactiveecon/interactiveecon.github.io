// data.js
// Buckets: POS, EFF, EQT, GRW, STB

window.POSNORM_DATA = {
  cards: [
    // ---------------- POSITIVE (testable) ----------------
    {
      id:"pos1",
      title:"A higher minimum wage increases unemployment among some low-skill workers.",
      desc:"This is a claim about what happens when policy changes.",
      correct:"POS",
      explain:"Positive: you could test this with data (it might be true or false)."
    },
    {
      id:"pos2",
      title:"When the price of gasoline rises, the quantity demanded of gasoline falls.",
      desc:"A prediction based on the law of demand.",
      correct:"POS",
      explain:"Positive: a testable relationship between price and quantity demanded."
    },
    {
      id:"pos3",
      title:"Countries with higher inflation tend to have higher nominal interest rates.",
      desc:"A relationship that can be checked in data.",
      correct:"POS",
      explain:"Positive: a claim about a pattern in the world (testable)."
    },
    {
      id:"pos4",
      title:"A tariff raises the domestic price of imported goods.",
      desc:"A prediction about the effect of a tariff.",
      correct:"POS",
      explain:"Positive: a testable prediction from supply and demand."
    },
    {
      id:"pos5",
      title:"If the Fed raises interest rates, borrowing becomes more expensive.",
      desc:"A statement about the cost of borrowing.",
      correct:"POS",
      explain:"Positive: describes an effect that can be observed."
    },
    {
      id:"pos6",
      title:"Real GDP grew faster in 2021 than in 2020.",
      desc:"A factual comparison using measured GDP data.",
      correct:"POS",
      explain:"Positive: can be verified directly with data."
    },
    {
      id:"pos7",
      title:"If productivity increases, a country can produce more output with the same inputs.",
      desc:"A statement about production possibilities.",
      correct:"POS",
      explain:"Positive: describes a relationship; can be measured."
    },
    {
      id:"pos8",
      title:"Unemployment tends to rise during recessions.",
      desc:"A business-cycle pattern.",
      correct:"POS",
      explain:"Positive: testable historical pattern."
    },

    // ---------------- NORMATIVE: EFFICIENCY ----------------
    {
      id:"eff1",
      title:"The government should reduce taxes that create large deadweight losses.",
      desc:"Focuses on minimizing wasted surplus.",
      correct:"EFF",
      explain:"Normative: ‘should’ + efficiency goal (reduce deadweight loss)."
    },
    {
      id:"eff2",
      title:"Policies should be judged by whether they maximize total surplus.",
      desc:"Criterion: total surplus.",
      correct:"EFF",
      explain:"Normative efficiency criterion: maximize total surplus."
    },
    {
      id:"eff3",
      title:"Rent control is a bad policy because it creates inefficiency in housing allocation.",
      desc:"Claims policy is bad due to inefficiency.",
      correct:"EFF",
      explain:"Normative: value judgment; efficiency reasoning (inefficient allocation)."
    },
    {
      id:"eff4",
      title:"The best policy is the one that achieves the same outcome at the lowest cost.",
      desc:"Cost-effectiveness / waste reduction.",
      correct:"EFF",
      explain:"Normative: ‘best’ + efficiency criterion (least-cost)."
    },

    // ---------------- NORMATIVE: EQUITY ----------------
    {
      id:"eqt1",
      title:"The tax system should be more progressive to reduce inequality.",
      desc:"Fairness/distribution goal.",
      correct:"EQT",
      explain:"Normative: ‘should’ + equity concern (inequality)."
    },
    {
      id:"eqt2",
      title:"It is unfair that CEOs earn hundreds of times more than typical workers.",
      desc:"Fairness judgment.",
      correct:"EQT",
      explain:"Normative: uses ‘unfair’; equity/distribution."
    },
    {
      id:"eqt3",
      title:"The government ought to guarantee a basic standard of living for everyone.",
      desc:"Distribution and fairness focus.",
      correct:"EQT",
      explain:"Normative: ‘ought’ + equity goal."
    },
    {
      id:"eqt4",
      title:"Healthcare should be affordable regardless of income.",
      desc:"Equity principle.",
      correct:"EQT",
      explain:"Normative: ‘should’ + equity (access regardless of income)."
    },

    // ---------------- NORMATIVE: GROWTH ----------------
    {
      id:"grw1",
      title:"Policy should prioritize increasing long-run productivity.",
      desc:"Long-run living standards.",
      correct:"GRW",
      explain:"Normative: ‘should’ + growth criterion (productivity)."
    },
    {
      id:"grw2",
      title:"The government should invest more in education because it raises future income.",
      desc:"Growth-focused rationale.",
      correct:"GRW",
      explain:"Normative: ‘should’ + growth (human capital → future income)."
    },
    {
      id:"grw3",
      title:"Reducing barriers to innovation is better for society in the long run.",
      desc:"Innovation and long-run output.",
      correct:"GRW",
      explain:"Normative: ‘better’ + growth (innovation)."
    },
    {
      id:"grw4",
      title:"A good economic policy is one that raises living standards over time.",
      desc:"Long-run focus.",
      correct:"GRW",
      explain:"Normative: defines ‘good’ using growth/living standards."
    },

    // ---------------- NORMATIVE: STABILITY ----------------
    {
      id:"stb1",
      title:"Policymakers should try to reduce the severity of recessions.",
      desc:"Business-cycle stabilization.",
      correct:"STB",
      explain:"Normative: ‘should’ + stability goal (smaller recessions)."
    },
    {
      id:"stb2",
      title:"Keeping inflation low and stable should be a central goal of policy.",
      desc:"Stable inflation criterion.",
      correct:"STB",
      explain:"Normative: ‘should’ + stability (inflation stability)."
    },
    {
      id:"stb3",
      title:"It is better to have a predictable economy even if growth is slightly lower.",
      desc:"Stability valued over volatility.",
      correct:"STB",
      explain:"Normative: ‘better’ + stability preference."
    },
    {
      id:"stb4",
      title:"Government should act when unemployment rises sharply to stabilize the economy.",
      desc:"Counter-cyclical stabilization.",
      correct:"STB",
      explain:"Normative: ‘should’ + stability (reduce swings in unemployment)."
    }
  ]
};
