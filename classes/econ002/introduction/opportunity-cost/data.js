// data.js
// Buckets: EXP (explicit), IMP (implicit/opportunity), NOT (not a cost for the decision)

window.OPPCOST_DATA = {
  cards: [
    // ---------- Explicit costs ----------
    { id:"exp01", title:"You pay $40 for a textbook.", desc:"Out-of-pocket spending: explicit cost.", correct:"EXP", explain:"Explicit cost: you paid money." },
    { id:"exp02", title:"You pay $3.50 for a bus ride to campus.", desc:"Out-of-pocket spending: explicit cost.", correct:"EXP", explain:"Explicit cost: you paid money." },
    { id:"exp03", title:"A business pays $2,000 in monthly rent for a storefront.", desc:"Out-of-pocket spending: explicit cost.", correct:"EXP", explain:"Explicit cost: cash rent payment." },
    { id:"exp04", title:"A café pays $900 for coffee beans.", desc:"Out-of-pocket input purchase.", correct:"EXP", explain:"Explicit cost: paying for inputs." },
    { id:"exp05", title:"You pay $25 for a concert ticket.", desc:"Cash payment.", correct:"EXP", explain:"Explicit cost: out-of-pocket payment." },
    { id:"exp06", title:"A firm pays $1,200 for electricity and utilities.", desc:"Cash expense.", correct:"EXP", explain:"Explicit cost: out-of-pocket." },
    { id:"exp07", title:"You spend $60 on gas for a road trip.", desc:"Cash payment.", correct:"EXP", explain:"Explicit cost: out-of-pocket spending." },
    { id:"exp08", title:"A student pays $15 for printing and supplies.", desc:"Cash expense.", correct:"EXP", explain:"Explicit cost." },

    // ---------- Implicit costs (opportunity costs) ----------
    { id:"imp01", title:"You give up a $120 shift to study for an exam.", desc:"Forgone wages are an implicit cost.", correct:"IMP", explain:"Implicit cost: the next best alternative is working for $120." },
    { id:"imp02", title:"You use a building you own for your business instead of renting it out.", desc:"Forgone rent is an implicit cost.", correct:"IMP", explain:"Implicit cost: you gave up rental income." },
    { id:"imp03", title:"You spend 3 hours commuting instead of doing paid tutoring.", desc:"Forgone earnings/time value is an implicit cost.", correct:"IMP", explain:"Implicit cost: value of your time/forgone earnings." },
    { id:"imp04", title:"An owner works in their firm without paying themselves a salary.", desc:"Foregone salary is an implicit cost.", correct:"IMP", explain:"Implicit cost: owner labor has opportunity cost." },
    { id:"imp05", title:"You invest $5,000 in your business instead of earning interest in a bank.", desc:"Forgone interest is an implicit cost.", correct:"IMP", explain:"Implicit cost: you gave up the interest you could have earned." },
    { id:"imp06", title:"You take a class and give up leisure time you value.", desc:"Leisure forgone is an implicit cost.", correct:"IMP", explain:"Implicit cost: the value of the next best use of time." },
    { id:"imp07", title:"You use your own car for deliveries instead of renting it out.", desc:"Forgone rental value is an implicit cost.", correct:"IMP", explain:"Implicit cost: using your own resource has opportunity cost." },
    { id:"imp08", title:"You attend college instead of working full-time for $35,000/year.", desc:"Forgone wages are an implicit cost.", correct:"IMP", explain:"Implicit cost: wages you give up to attend school." },
    { id:"imp09", title:"You spend an evening cooking to avoid paying for takeout.", desc:"Time cost is implicit.", correct:"IMP", explain:"Implicit cost: time could have been used elsewhere." },
    { id:"imp10", title:"A firm uses cash reserves for a project instead of paying down interest-bearing debt.", desc:"Forgone interest savings is implicit.", correct:"IMP", explain:"Implicit cost: opportunity cost of funds." },

    // ---------- Not a cost (sunk / irrelevant) ----------
    { id:"not01", title:"You already paid $200 for a nonrefundable ticket last week.", desc:"Sunk cost: not part of today’s decision.", correct:"NOT", explain:"Not a cost now: sunk cost already incurred." },
    { id:"not02", title:"You spent 2 hours last month researching a purchase.", desc:"Past time is sunk.", correct:"NOT", explain:"Not a cost for the current decision: sunk time." },
    { id:"not03", title:"A firm paid for a machine two years ago.", desc:"Past payment is sunk for current choices.", correct:"NOT", explain:"Not a cost now: sunk cost." },
    { id:"not04", title:"You feel guilty about wasting food you already bought.", desc:"Emotions aren’t economic costs here.", correct:"NOT", explain:"Not an economic cost in the standard framework." },
    { id:"not05", title:"You bought a gym membership last month and can’t refund it.", desc:"Already paid; sunk.", correct:"NOT", explain:"Not a cost now: sunk membership fee." },
    { id:"not06", title:"A business’s logo redesign last year cost $800.", desc:"Past expense; sunk.", correct:"NOT", explain:"Not a cost for current production decisions." },

    // ---------- Mixed / more realistic contexts ----------
    { id:"mix01", title:"You drive to work and pay $6 for parking.", desc:"Parking fee is explicit.", correct:"EXP", explain:"Explicit cost: cash payment." },
    { id:"mix02", title:"You drive to work and give up 30 minutes you could have spent studying.", desc:"Time is an implicit cost.", correct:"IMP", explain:"Implicit cost: value of time/next best alternative." },
    { id:"mix03", title:"A shop owner uses $10,000 of their own savings to start a business.", desc:"Opportunity cost of savings.", correct:"IMP", explain:"Implicit cost: forgone interest/alternative investment return." },
    { id:"mix04", title:"A student buys a laptop for $900 for school.", desc:"Out-of-pocket spending.", correct:"EXP", explain:"Explicit cost: cash purchase." },
    { id:"mix05", title:"A student chooses a class schedule that prevents them from taking a part-time job.", desc:"Forgone wages.", correct:"IMP", explain:"Implicit cost: wages from the job you can’t take." },
    { id:"mix06", title:"You already bought the ingredients; deciding whether to cook tonight.", desc:"Ingredients are sunk if already purchased.", correct:"NOT", explain:"If already paid and cannot be recovered, it’s sunk for tonight’s decision." },

    // ---------- More variety (easy repetition reduction) ----------
    { id:"exp09", title:"You pay $18 for a meal.", desc:"Out-of-pocket payment.", correct:"EXP", explain:"Explicit cost." },
    { id:"exp10", title:"A firm pays $4,000 in worker wages this week.", desc:"Cash wages.", correct:"EXP", explain:"Explicit cost." },
    { id:"exp11", title:"You pay $12 for a movie ticket.", desc:"Cash payment.", correct:"EXP", explain:"Explicit cost." },
    { id:"exp12", title:"A business pays $300 for advertising this month.", desc:"Cash expense.", correct:"EXP", explain:"Explicit cost." },

    { id:"imp11", title:"You choose to volunteer 4 hours instead of working for pay.", desc:"Forgone wages.", correct:"IMP", explain:"Implicit cost: opportunity cost of time." },
    { id:"imp12", title:"You use your own tools for a job rather than renting them out.", desc:"Forgone rental income.", correct:"IMP", explain:"Implicit cost: opportunity cost of owned resources." },
    { id:"imp13", title:"You take an unpaid internship instead of a paid job.", desc:"Forgone earnings.", correct:"IMP", explain:"Implicit cost: wages you give up." },
    { id:"imp14", title:"A business owner keeps $50,000 in the firm instead of investing in index funds.", desc:"Forgone investment return.", correct:"IMP", explain:"Implicit cost: alternative return." },

    { id:"not07", title:"You already drove halfway and can’t get your time back.", desc:"Past time is sunk.", correct:"NOT", explain:"Not a cost now: sunk time." },
    { id:"not08", title:"A firm signed a non-cancellable contract last year; payment is unavoidable.", desc:"Not a marginal cost of current output.", correct:"NOT", explain:"If it cannot be changed, it’s not part of the marginal decision today." },
  ]
};
