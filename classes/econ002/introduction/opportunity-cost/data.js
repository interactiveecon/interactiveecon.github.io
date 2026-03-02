// data.js
// Each scenario has 4 options (strings) and a correct index (0-3).

window.OPPCOST_MCQ = {
  scenarios: [
    {
      id: "s01",
      title: "Studying vs working",
      desc: "You can study for 3 hours tonight or work a shift that pays $90.\nYou choose to study.\n\nWhat is the opportunity cost of studying?",
      options: [
        "The $90 in wages you give up by not working",
        "The price of your textbook",
        "Your tuition payment for the semester",
        "The money you spend on dinner tonight"
      ],
      correct: 0,
      explain: "Opportunity cost is the value of the next best alternative. If the next best alternative is working for $90, then the opportunity cost of studying is the $90 you give up."
    },
    {
      id: "s02",
      title: "Going to the gym",
      desc: "You can go to the gym for an hour or you can do paid tutoring for $25.\nYou choose the gym.\n\nWhat is the opportunity cost of going to the gym?",
      options: [
        "The $25 you could have earned tutoring",
        "Your monthly gym membership fee (already paid)",
        "The calories you burned",
        "The cost of your gym shoes"
      ],
      correct: 0,
      explain: "The opportunity cost is the best thing you give up—here, the $25 tutoring income."
    },
    {
      id: "s03",
      title: "Movie night",
      desc: "You can go to a movie ($14 ticket) or stay home and work on a gig that would pay $60.\nYou choose the movie.\n\nWhat is the opportunity cost of going to the movie?",
      options: [
        "The $60 you give up by not doing the gig",
        "The $14 ticket price",
        "Both $60 and $14 (add them together)",
        "Nothing, because movies are leisure"
      ],
      correct: 0,
      explain: "The opportunity cost is the value of the next best alternative. If you would otherwise do the $60 gig, that forgone $60 is the opportunity cost. The ticket is an explicit cost, but the question asks specifically for opportunity cost."
    },
    {
      id: "s04",
      title: "Using your own building",
      desc: "You own a small building. You can rent it out for $1,200/month or use it for your business.\nYou choose to use it for your business.\n\nWhat is the opportunity cost of using your own building?",
      options: [
        "The $1,200/month rent you give up",
        "The property tax you pay on the building",
        "The money you spent buying the building years ago",
        "The utility bill for the building"
      ],
      correct: 0,
      explain: "The opportunity cost is the next best alternative you give up—renting it out for $1,200/month."
    },
    {
      id: "s05",
      title: "College vs full-time job",
      desc: "You choose to attend college this year instead of taking a full-time job paying $32,000.\n\nWhat is the opportunity cost of attending college this year?",
      options: [
        "The $32,000 salary you give up",
        "Your tuition payment",
        "The cost of textbooks",
        "The interest rate on student loans"
      ],
      correct: 0,
      explain: "Opportunity cost is the value of the best alternative forgone—here, the salary from the job you don’t take."
    },

    {
      id: "s06",
      title: "One more hour of sleep",
      desc: "You can sleep one more hour or you can arrive early to work and earn an extra $18.\nYou choose to sleep.\n\nWhat is the opportunity cost of sleeping?",
      options: [
        "The extra $18 you give up by not working",
        "Your rent payment",
        "Your alarm clock",
        "Your caffeine intake tomorrow"
      ],
      correct: 0,
      explain: "The opportunity cost is the best alternative you give up: earning the extra $18."
    },
    {
      id: "s07",
      title: "Cooking vs takeout",
      desc: "Cooking dinner takes 45 minutes. Ordering takeout costs $18.\nYou decide to cook.\nAssume the next best alternative is ordering takeout.\n\nWhat is the opportunity cost of cooking dinner?",
      options: [
        "The $18 you would have spent on takeout (the next best alternative)",
        "The ingredients you already have in your kitchen",
        "The enjoyment of cooking",
        "Nothing, because cooking is at home"
      ],
      correct: 0,
      explain: "If the next best alternative is takeout, the opportunity cost is what you give up—here, the $18 takeout option (and potentially the time, but the scenario defines the next best alternative as takeout)."
    },
    {
      id: "s08",
      title: "Choosing a class time",
      desc: "A required class is only offered at 3pm. That time conflicts with a job shift that would pay $55.\nYou take the class.\n\nWhat is the opportunity cost of taking the class at 3pm?",
      options: [
        "The $55 wages from the job shift you give up",
        "Your tuition payment for the course",
        "The cost of parking on campus",
        "The class grade you hope to earn"
      ],
      correct: 0,
      explain: "The opportunity cost is the value of the best alternative forgone—working that $55 shift."
    },
    {
      id: "s09",
      title: "Business: use cash vs invest",
      desc: "A small business uses $10,000 of its cash to buy equipment instead of investing that money in an account earning 5% per year.\n\nWhat is the opportunity cost of buying the equipment (from using cash)?",
      options: [
        "The interest the $10,000 would have earned at 5%",
        "The price tag on the equipment (that’s the same $10,000)",
        "The time spent purchasing the equipment",
        "The depreciation of the equipment"
      ],
      correct: 0,
      explain: "Opportunity cost is the return on the best alternative use of the funds—the interest earnings you give up."
    },
    {
      id: "s10",
      title: "Leisure vs overtime",
      desc: "You can work overtime for $40 or take the evening off.\nYou take the evening off.\n\nWhat is the opportunity cost of taking the evening off?",
      options: [
        "The $40 you could have earned working overtime",
        "Your regular paycheck",
        "Your monthly bills",
        "The enjoyment from relaxing"
      ],
      correct: 0,
      explain: "The best alternative forgone is the $40 overtime pay."
    },

    // ---- More: mix in non-money alternatives (still “value” of next best alt) ----
    {
      id: "s11",
      title: "Studying vs social event",
      desc: "You can study for an exam or attend a friend’s birthday dinner.\nYou choose to study.\nAssume the next best alternative is the birthday dinner.\n\nWhat is the opportunity cost of studying?",
      options: [
        "The value of attending the birthday dinner (the next best alternative)",
        "The cost of the exam",
        "The tuition you paid",
        "Nothing, because studying is necessary"
      ],
      correct: 0,
      explain: "Opportunity cost is the value of the next best alternative you give up—here, the birthday dinner."
    },
    {
      id: "s12",
      title: "Commute choice",
      desc: "You can take a faster route that costs $6 in tolls, or a slower route with no toll.\nYou choose the faster route.\n\nWhat is the opportunity cost of taking the faster route?",
      options: [
        "The $6 toll (the value of what you give up to save time)",
        "The time you saved (that’s a benefit, not a cost)",
        "Your car payment",
        "The gas you would have used either way"
      ],
      correct: 0,
      explain: "Here the tradeoff is money for time. The opportunity cost of the faster route (relative to the free route) is the $6 toll you give up."
    },
    {
      id: "s13",
      title: "Free concert ticket",
      desc: "You win a free concert ticket. You can go to the concert or work a shift for $80.\nYou go to the concert.\n\nWhat is the opportunity cost of going to the concert?",
      options: [
        "The $80 wages you give up by not working",
        "The ticket price (it was free)",
        "The money you spent on the ticket",
        "Nothing, because it was free"
      ],
      correct: 0,
      explain: "Even if the ticket is free, you give up the next best alternative—working for $80."
    },

    // Add many more in the same pattern…
  ]
};
