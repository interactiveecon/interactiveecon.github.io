// data.js
// Buckets: POS, EFF, EQT, GRW, STB


window.POSNORM_DATA = {
  cards: [
    // ============================================================
    // POSITIVE (50)
    // ============================================================
    { id:"pos01", title:"When the price of a good rises, quantity demanded falls (ceteris paribus).", desc:"Testable prediction about behavior.", correct:"POS", explain:"Positive: a testable claim." },
    { id:"pos02", title:"If incomes rise and a good is normal, demand increases.", desc:"Testable prediction using the demand model.", correct:"POS", explain:"Positive: can be tested." },
    { id:"pos03", title:"A tariff raises the domestic price of imported goods.", desc:"Prediction about policy effects.", correct:"POS", explain:"Positive: can be checked with data." },
    { id:"pos04", title:"A price ceiling below equilibrium creates a shortage.", desc:"Testable implication of supply and demand.", correct:"POS", explain:"Positive: model-based prediction." },
    { id:"pos05", title:"Higher interest rates tend to reduce borrowing.", desc:"Behavioral response to borrowing costs.", correct:"POS", explain:"Positive: testable relationship." },
    { id:"pos06", title:"Unemployment tends to rise during recessions.", desc:"Historical pattern in business cycles.", correct:"POS", explain:"Positive: can be verified." },
    { id:"pos07", title:"Higher productivity allows more output from the same inputs.", desc:"Statement about production.", correct:"POS", explain:"Positive: measurable." },
    { id:"pos08", title:"If the money supply grows faster than real output (with stable velocity), inflation rises.", desc:"Prediction from quantity theory.", correct:"POS", explain:"Positive: testable in data." },
    { id:"pos09", title:"A binding minimum wage increases the wage paid to covered workers.", desc:"Prediction under a binding floor.", correct:"POS", explain:"Positive: testable." },
    { id:"pos10", title:"An increase in input costs shifts the supply curve left.", desc:"Prediction about costs and supply.", correct:"POS", explain:"Positive: model prediction." },

    { id:"pos11", title:"A fall in the price of a substitute decreases demand for this good.", desc:"Testable cross-price effect.", correct:"POS", explain:"Positive: testable claim." },
    { id:"pos12", title:"If expected inflation rises, nominal interest rates tend to rise.", desc:"Fisher relation pattern.", correct:"POS", explain:"Positive: can be checked." },
    { id:"pos13", title:"If the exchange rate appreciates, exports become more expensive to foreigners.", desc:"Prediction about trade prices.", correct:"POS", explain:"Positive: testable implication." },
    { id:"pos14", title:"If government purchases increase, aggregate demand increases.", desc:"Prediction in AD framework.", correct:"POS", explain:"Positive: model prediction." },
    { id:"pos15", title:"A fall in mortgage rates tends to increase housing demand.", desc:"Prediction about borrowing costs.", correct:"POS", explain:"Positive: testable." },

    { id:"pos16", title:"If a good becomes more popular, demand increases.", desc:"Prediction about tastes and demand.", correct:"POS", explain:"Positive: testable." },
    { id:"pos17", title:"A higher price floor can create a surplus.", desc:"Supply-demand implication.", correct:"POS", explain:"Positive: prediction." },
    { id:"pos18", title:"If the Fed raises the policy rate, some market interest rates rise.", desc:"Transmission to borrowing costs.", correct:"POS", explain:"Positive: empirical claim." },
    { id:"pos19", title:"If real wages rise, firms tend to hire fewer workers (holding productivity fixed).", desc:"Labor demand implication.", correct:"POS", explain:"Positive: testable." },
    { id:"pos20", title:"If a country’s population grows, total GDP can rise even if GDP per person is unchanged.", desc:"Accounting relationship.", correct:"POS", explain:"Positive: factual implication." },

    { id:"pos21", title:"If inflation is higher than expected, the real cost of repaying a fixed-rate loan falls.", desc:"Real value of nominal repayment changes.", correct:"POS", explain:"Positive: testable implication of real vs nominal." },
    { id:"pos22", title:"A sales tax raises the price consumers pay.", desc:"Incidence shows up in consumer prices.", correct:"POS", explain:"Positive: testable." },
    { id:"pos23", title:"If firms adopt better technology, supply increases.", desc:"Productivity lowers costs.", correct:"POS", explain:"Positive: model prediction." },
    { id:"pos24", title:"If the price of oil rises, shipping and production costs increase for many goods.", desc:"Cost channel to supply.", correct:"POS", explain:"Positive: testable." },
    { id:"pos25", title:"When demand increases, equilibrium price rises (holding supply fixed).", desc:"Comparative statics.", correct:"POS", explain:"Positive: prediction from the model." },

    { id:"pos26", title:"When supply increases, equilibrium price falls (holding demand fixed).", desc:"Comparative statics.", correct:"POS", explain:"Positive: prediction." },
    { id:"pos27", title:"If the government borrows more, interest rates may rise (holding other factors fixed).", desc:"Crowding-out hypothesis.", correct:"POS", explain:"Positive: testable claim." },
    { id:"pos28", title:"If consumers expect prices to be higher next month, current demand can rise.", desc:"Expectations shifting demand.", correct:"POS", explain:"Positive: testable." },
    { id:"pos29", title:"A fall in the price of a complement increases demand for this good.", desc:"Cross-price effect.", correct:"POS", explain:"Positive: testable." },
    { id:"pos30", title:"If unemployment benefits become more generous, the duration of unemployment can increase.", desc:"Incentives and search duration.", correct:"POS", explain:"Positive: empirical claim." },

    { id:"pos31", title:"A rise in college graduation rates increases the supply of skilled labor.", desc:"Labor supply composition.", correct:"POS", explain:"Positive: testable." },
    { id:"pos32", title:"If firms expect higher future prices, they may supply less today.", desc:"Intertemporal supply decision.", correct:"POS", explain:"Positive: testable." },
    { id:"pos33", title:"If the price of electricity rises, some households reduce electricity use.", desc:"Demand response.", correct:"POS", explain:"Positive: testable." },
    { id:"pos34", title:"If an economy’s capital stock increases, labor productivity can rise.", desc:"Capital deepening.", correct:"POS", explain:"Positive: testable." },
    { id:"pos35", title:"If the government increases money growth, inflation tends to rise in the long run.", desc:"Long-run monetary relationship.", correct:"POS", explain:"Positive: testable." },

    { id:"pos36", title:"A higher real interest rate discourages investment spending.", desc:"Cost of capital channel.", correct:"POS", explain:"Positive: testable." },
    { id:"pos37", title:"If consumer confidence falls, consumption spending can fall.", desc:"Spending response to sentiment.", correct:"POS", explain:"Positive: testable." },
    { id:"pos38", title:"If the exchange rate depreciates, exports tend to rise (over time).", desc:"Trade competitiveness channel.", correct:"POS", explain:"Positive: testable." },
    { id:"pos39", title:"If firms raise wages, labor costs increase.", desc:"Accounting statement.", correct:"POS", explain:"Positive: factual." },
    { id:"pos40", title:"If taxes on cigarettes rise, cigarette purchases tend to fall.", desc:"Demand response to higher prices.", correct:"POS", explain:"Positive: testable." },

    { id:"pos41", title:"If a country experiences a drought, agricultural output can fall.", desc:"Real shock to production.", correct:"POS", explain:"Positive: testable." },
    { id:"pos42", title:"If the labor force grows, the number employed can rise even if the unemployment rate stays constant.", desc:"Accounting relationship.", correct:"POS", explain:"Positive: factual implication." },
    { id:"pos43", title:"Higher gasoline prices increase the cost of commuting.", desc:"Direct cost implication.", correct:"POS", explain:"Positive: factual." },
    { id:"pos44", title:"If inflation rises, purchasing power of a fixed nominal wage falls.", desc:"Real wage effect.", correct:"POS", explain:"Positive: factual implication." },
    { id:"pos45", title:"A binding quota reduces the quantity traded relative to free trade.", desc:"Trade restriction implication.", correct:"POS", explain:"Positive: testable." },

    { id:"pos46", title:"If supply decreases, equilibrium quantity falls (holding demand fixed).", desc:"Comparative statics.", correct:"POS", explain:"Positive: prediction." },
    { id:"pos47", title:"If demand decreases, equilibrium quantity falls (holding supply fixed).", desc:"Comparative statics.", correct:"POS", explain:"Positive: prediction." },
    { id:"pos48", title:"If a new competitor enters a market, a firm’s market share can fall.", desc:"Competition effect.", correct:"POS", explain:"Positive: testable." },
    { id:"pos49", title:"If households receive a tax refund, consumption can increase.", desc:"Spending response.", correct:"POS", explain:"Positive: testable." },
    { id:"pos50", title:"If transportation costs fall, trade between regions can increase.", desc:"Trade cost channel.", correct:"POS", explain:"Positive: testable." },

    // ============================================================
    // NORMATIVE — EFFICIENCY (25)
    // ============================================================
    { id:"eff01", title:"Policy should minimize deadweight loss.", desc:"Efficiency = avoid wasted surplus.", correct:"EFF", explain:"Normative: value judgment focused on efficiency." },
    { id:"eff02", title:"The best tax is one that raises revenue with minimal distortion.", desc:"Efficiency criterion for taxes.", correct:"EFF", explain:"Normative: ‘best’ + distortion." },
    { id:"eff03", title:"Price ceilings are bad because they create shortages and waste.", desc:"Efficiency argument about misallocation.", correct:"EFF", explain:"Normative: ‘bad’ + inefficiency." },
    { id:"eff04", title:"Subsidies that encourage overconsumption should be reduced.", desc:"Efficiency concern about overuse.", correct:"EFF", explain:"Normative: ‘should’ + efficiency." },
    { id:"eff05", title:"The government should remove barriers that prevent mutually beneficial trade.", desc:"Trade increases total surplus.", correct:"EFF", explain:"Normative: efficiency via gains from trade." },

    { id:"eff06", title:"A good regulation is one where benefits exceed costs.", desc:"Cost–benefit standard.", correct:"EFF", explain:"Normative: efficiency (benefits vs costs)." },
    { id:"eff07", title:"Congestion pricing is better than free parking because it reduces waste.", desc:"Efficiency in road use.", correct:"EFF", explain:"Normative: efficiency criterion." },
    { id:"eff08", title:"Monopoly power is harmful because it reduces output below efficient levels.", desc:"Efficiency loss from monopoly.", correct:"EFF", explain:"Normative: efficiency argument." },
    { id:"eff09", title:"Markets should be designed to reduce search and transaction costs.", desc:"Lower frictions = more efficient outcomes.", correct:"EFF", explain:"Normative: efficiency standard." },
    { id:"eff10", title:"Policies should target the cause of a problem in the least-cost way.", desc:"Cost-effectiveness criterion.", correct:"EFF", explain:"Normative: least-cost efficiency." },

    { id:"eff11", title:"The government should tax activities that create negative externalities.", desc:"Internalize external costs.", correct:"EFF", explain:"Normative: efficiency (externalities)." },
    { id:"eff12", title:"Subsidizing research is justified when it increases total surplus.", desc:"Spillovers and efficiency.", correct:"EFF", explain:"Normative: efficiency through spillovers." },
    { id:"eff13", title:"Trade restrictions should be avoided when they reduce total surplus.", desc:"Efficiency loss from protection.", correct:"EFF", explain:"Normative: efficiency." },
    { id:"eff14", title:"Rent control should be replaced with policies that reduce housing shortages.", desc:"Efficiency focus on allocations.", correct:"EFF", explain:"Normative: efficiency." },
    { id:"eff15", title:"We should prefer policies that reduce wasteful pollution damages.", desc:"Efficiency focus on damages.", correct:"EFF", explain:"Normative: efficiency." },

    { id:"eff16", title:"A tax system should be simpler if it reduces compliance costs.", desc:"Efficiency via lower admin costs.", correct:"EFF", explain:"Normative: efficiency." },
    { id:"eff17", title:"The government should not subsidize industries that cannot compete efficiently.", desc:"Efficiency in resource use.", correct:"EFF", explain:"Normative: efficiency." },
    { id:"eff18", title:"Policy should encourage competition to lower prices and increase output.", desc:"Efficiency via competition.", correct:"EFF", explain:"Normative: efficiency." },
    { id:"eff19", title:"We should reduce regulations that create large inefficiencies with little benefit.", desc:"Cost–benefit logic.", correct:"EFF", explain:"Normative: efficiency." },
    { id:"eff20", title:"Infrastructure spending is justified when it reduces travel time enough to outweigh its cost.", desc:"Efficiency cost–benefit.", correct:"EFF", explain:"Normative: efficiency." },

    { id:"eff21", title:"The government should set rules that reduce fraud to improve market functioning.", desc:"Efficiency via trust and lower risk.", correct:"EFF", explain:"Normative: efficiency." },
    { id:"eff22", title:"Policies should reduce misallocation of resources across firms.", desc:"Efficiency in productivity.", correct:"EFF", explain:"Normative: efficiency." },
    { id:"eff23", title:"A policy is better if it achieves goals with fewer resources.", desc:"Efficiency standard.", correct:"EFF", explain:"Normative: efficiency." },
    { id:"eff24", title:"We should avoid policies that create large queues and shortages.", desc:"Efficiency/misallocation.", correct:"EFF", explain:"Normative: efficiency." },
    { id:"eff25", title:"If two policies have the same benefits, choose the cheaper one.", desc:"Efficiency choice rule.", correct:"EFF", explain:"Normative: efficiency." },

    // ============================================================
    // NORMATIVE — EQUITY (25)
    // ============================================================
    { id:"eqt01", title:"The tax system should reduce income inequality.", desc:"Equity = distribution/fairness.", correct:"EQT", explain:"Normative: fairness/distribution." },
    { id:"eqt02", title:"It is unfair for some people to lack access to basic healthcare.", desc:"Access regardless of income.", correct:"EQT", explain:"Normative: equity." },
    { id:"eqt03", title:"Policies should protect low-income households from large price increases.", desc:"Distributional concern.", correct:"EQT", explain:"Normative: equity." },
    { id:"eqt04", title:"A society should prioritize helping the poorest households.", desc:"Redistribution value judgment.", correct:"EQT", explain:"Normative: equity." },
    { id:"eqt05", title:"Student loans should have repayment plans that protect low earners.", desc:"Distributional protection.", correct:"EQT", explain:"Normative: equity." },

    { id:"eqt06", title:"Minimum wages should ensure workers can afford basic needs.", desc:"Fair wage perspective.", correct:"EQT", explain:"Normative: equity." },
    { id:"eqt07", title:"It is wrong that opportunity depends heavily on parents’ income.", desc:"Opportunity equality.", correct:"EQT", explain:"Normative: equity." },
    { id:"eqt08", title:"Policies should reduce racial and gender pay gaps.", desc:"Fairness in earnings.", correct:"EQT", explain:"Normative: equity." },
    { id:"eqt09", title:"The government should provide a safety net for the unemployed.", desc:"Support during hardship.", correct:"EQT", explain:"Normative: equity." },
    { id:"eqt10", title:"Access to quality education should not depend on ZIP code.", desc:"Equal opportunity.", correct:"EQT", explain:"Normative: equity." },

    { id:"eqt11", title:"A fair economy is one with less extreme wealth concentration.", desc:"Distributional fairness.", correct:"EQT", explain:"Normative: equity." },
    { id:"eqt12", title:"The burden of taxes should fall more on those with higher ability to pay.", desc:"Ability-to-pay principle.", correct:"EQT", explain:"Normative: equity." },
    { id:"eqt13", title:"It is unfair when essential goods are unaffordable to many households.", desc:"Affordability fairness.", correct:"EQT", explain:"Normative: equity." },
    { id:"eqt14", title:"Policymakers should consider who gains and who loses from a policy.", desc:"Distributional impacts.", correct:"EQT", explain:"Normative: equity." },
    { id:"eqt15", title:"A good policy is one that improves outcomes for disadvantaged groups.", desc:"Equity criterion.", correct:"EQT", explain:"Normative: equity." },

    { id:"eqt16", title:"Housing policy should prevent displacement of long-time residents.", desc:"Fairness in housing.", correct:"EQT", explain:"Normative: equity." },
    { id:"eqt17", title:"The government should ensure equal treatment in labor markets.", desc:"Fairness/anti-discrimination.", correct:"EQT", explain:"Normative: equity." },
    { id:"eqt18", title:"Paid parental leave should be available to all workers.", desc:"Fair access to benefits.", correct:"EQT", explain:"Normative: equity." },
    { id:"eqt19", title:"A fair policy is one that reduces poverty.", desc:"Distributional goal.", correct:"EQT", explain:"Normative: equity." },
    { id:"eqt20", title:"Essential medicines should be priced so everyone can afford them.", desc:"Equity in access.", correct:"EQT", explain:"Normative: equity." },

    { id:"eqt21", title:"The economy should provide reasonable living standards for full-time workers.", desc:"Fairness standard.", correct:"EQT", explain:"Normative: equity." },
    { id:"eqt22", title:"Unemployment insurance should be generous enough to prevent hardship.", desc:"Support the vulnerable.", correct:"EQT", explain:"Normative: equity." },
    { id:"eqt23", title:"Public policy should reduce homelessness.", desc:"Distributional welfare.", correct:"EQT", explain:"Normative: equity." },
    { id:"eqt24", title:"It is unjust when children face hunger in a wealthy society.", desc:"Fairness judgment.", correct:"EQT", explain:"Normative: equity." },
    { id:"eqt25", title:"Tax credits should target low-income families.", desc:"Redistribution toward low income.", correct:"EQT", explain:"Normative: equity." },

    // ============================================================
    // NORMATIVE — GROWTH (25)
    // ============================================================
    { id:"grw01", title:"Policy should prioritize long-run productivity growth.", desc:"Growth = living standards over time.", correct:"GRW", explain:"Normative: growth objective." },
    { id:"grw02", title:"The government should invest in education to raise future income.", desc:"Human capital and growth.", correct:"GRW", explain:"Normative: growth." },
    { id:"grw03", title:"We should encourage innovation because it improves living standards.", desc:"Innovation-driven growth.", correct:"GRW", explain:"Normative: growth." },
    { id:"grw04", title:"Tax policy should be designed to encourage investment.", desc:"Capital accumulation focus.", correct:"GRW", explain:"Normative: growth." },
    { id:"grw05", title:"Infrastructure spending is good if it raises productivity in the long run.", desc:"Productivity emphasis.", correct:"GRW", explain:"Normative: growth." },

    { id:"grw06", title:"Reducing barriers to entrepreneurship is better for long-run output.", desc:"Business formation and growth.", correct:"GRW", explain:"Normative: growth." },
    { id:"grw07", title:"Trade openness should be promoted to raise long-run living standards.", desc:"Growth via specialization.", correct:"GRW", explain:"Normative: growth." },
    { id:"grw08", title:"Policies should encourage saving to support capital formation.", desc:"Investment financing.", correct:"GRW", explain:"Normative: growth." },
    { id:"grw09", title:"The government should fund basic research to boost future productivity.", desc:"Long-run spillovers.", correct:"GRW", explain:"Normative: growth." },
    { id:"grw10", title:"A good policy is one that raises GDP per person over time.", desc:"Living standards criterion.", correct:"GRW", explain:"Normative: growth." },

    { id:"grw11", title:"We should reduce regulatory barriers that slow productivity growth.", desc:"Productivity focus.", correct:"GRW", explain:"Normative: growth." },
    { id:"grw12", title:"Immigration policy should attract high-skill workers to boost growth.", desc:"Human capital growth channel.", correct:"GRW", explain:"Normative: growth." },
    { id:"grw13", title:"Policies should expand access to skill training to raise earnings long term.", desc:"Human capital accumulation.", correct:"GRW", explain:"Normative: growth." },
    { id:"grw14", title:"The economy should prioritize investments that raise future output.", desc:"Long-run output objective.", correct:"GRW", explain:"Normative: growth." },
    { id:"grw15", title:"We should reward innovation to speed technological progress.", desc:"Incentives for growth.", correct:"GRW", explain:"Normative: growth." },

    { id:"grw16", title:"Policy should improve the business environment to raise long-run productivity.", desc:"Productivity priority.", correct:"GRW", explain:"Normative: growth." },
    { id:"grw17", title:"Education spending should be increased if it boosts future productivity.", desc:"Growth emphasis.", correct:"GRW", explain:"Normative: growth." },
    { id:"grw18", title:"The government should reduce barriers to trade to support long-run growth.", desc:"Growth via trade.", correct:"GRW", explain:"Normative: growth." },
    { id:"grw19", title:"A good tax policy is one that promotes investment and innovation.", desc:"Growth criterion.", correct:"GRW", explain:"Normative: growth." },
    { id:"grw20", title:"Policies should support entrepreneurship to raise future incomes.", desc:"Growth objective.", correct:"GRW", explain:"Normative: growth." },

    { id:"grw21", title:"The country should invest more in R&D to raise future living standards.", desc:"Innovation-driven growth.", correct:"GRW", explain:"Normative: growth." },
    { id:"grw22", title:"We should modernize infrastructure to raise productivity over time.", desc:"Growth focus.", correct:"GRW", explain:"Normative: growth." },
    { id:"grw23", title:"Policy should focus on skills that raise long-run wages.", desc:"Human capital growth.", correct:"GRW", explain:"Normative: growth." },
    { id:"grw24", title:"The best policies are those that raise productivity growth.", desc:"Explicit growth criterion.", correct:"GRW", explain:"Normative: growth." },
    { id:"grw25", title:"Government should support technologies that raise long-run output.", desc:"Growth objective.", correct:"GRW", explain:"Normative: growth." },

    // ============================================================
    // NORMATIVE — STABILITY (25)
    // ============================================================
    { id:"stb01", title:"Policymakers should reduce the severity of recessions.", desc:"Stability = smaller downturns.", correct:"STB", explain:"Normative: stability criterion." },
    { id:"stb02", title:"Inflation should be kept low and predictable.", desc:"Stable prices.", correct:"STB", explain:"Normative: stability." },
    { id:"stb03", title:"The government should act when unemployment rises sharply.", desc:"Stabilization policy.", correct:"STB", explain:"Normative: stability." },
    { id:"stb04", title:"It is better to have a predictable economy than a volatile one.", desc:"Volatility is costly.", correct:"STB", explain:"Normative: stability." },
    { id:"stb05", title:"Policy should aim to smooth the business cycle.", desc:"Reduce swings.", correct:"STB", explain:"Normative: stability." },

    { id:"stb06", title:"The central bank should respond when inflation rises quickly.", desc:"Stabilize prices.", correct:"STB", explain:"Normative: stability." },
    { id:"stb07", title:"The government should build automatic stabilizers that support demand in recessions.", desc:"Counter-cyclical support.", correct:"STB", explain:"Normative: stability." },
    { id:"stb08", title:"Keeping unemployment from spiking should be a major goal.", desc:"Stability in labor markets.", correct:"STB", explain:"Normative: stability." },
    { id:"stb09", title:"The economy should avoid boom-bust cycles.", desc:"Reduce volatility.", correct:"STB", explain:"Normative: stability." },
    { id:"stb10", title:"Policy should reduce financial crises even if it slows growth slightly.", desc:"Stability tradeoff.", correct:"STB", explain:"Normative: stability." },

    { id:"stb11", title:"We should prioritize stable inflation to make planning easier.", desc:"Predictability goal.", correct:"STB", explain:"Normative: stability." },
    { id:"stb12", title:"Government should maintain tools to fight recessions.", desc:"Stabilization capacity.", correct:"STB", explain:"Normative: stability." },
    { id:"stb13", title:"Economic policy should reduce the risk of high inflation episodes.", desc:"Avoid large inflation swings.", correct:"STB", explain:"Normative: stability." },
    { id:"stb14", title:"Policy should reduce uncertainty by stabilizing output.", desc:"Stabilize the economy.", correct:"STB", explain:"Normative: stability." },
    { id:"stb15", title:"A good policy reduces volatility in employment and income.", desc:"Stability focus.", correct:"STB", explain:"Normative: stability." },

    { id:"stb16", title:"The government should respond quickly to demand shocks.", desc:"Stabilization response.", correct:"STB", explain:"Normative: stability." },
    { id:"stb17", title:"Avoiding deflation should be a priority.", desc:"Deflation risk.", correct:"STB", explain:"Normative: stability." },
    { id:"stb18", title:"Policy should aim for steady growth rather than sharp swings.", desc:"Stability preference.", correct:"STB", explain:"Normative: stability." },
    { id:"stb19", title:"The central bank should reduce inflation volatility.", desc:"Stable inflation.", correct:"STB", explain:"Normative: stability." },
    { id:"stb20", title:"The economy should avoid prolonged high unemployment.", desc:"Stability objective.", correct:"STB", explain:"Normative: stability." },

    { id:"stb21", title:"Policymakers should prevent overheating that leads to instability.", desc:"Avoid unstable booms.", correct:"STB", explain:"Normative: stability." },
    { id:"stb22", title:"The government should design policy to avoid deep recessions.", desc:"Stability goal.", correct:"STB", explain:"Normative: stability." },
    { id:"stb23", title:"Economic policy should focus on stable prices and employment.", desc:"Stability across markets.", correct:"STB", explain:"Normative: stability." },
    { id:"stb24", title:"It is better to have slightly higher taxes if it reduces recession risk.", desc:"Stability tradeoff.", correct:"STB", explain:"Normative: stability." },
    { id:"stb25", title:"Policy should keep inflation expectations anchored.", desc:"Stability in expectations.", correct:"STB", explain:"Normative: stability." },
  ]
};
