// data.js
// 50 opportunity cost MCQ scenarios (4 options each)

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
      explain: "Opportunity cost is the value of the next best alternative. If the next best alternative is working for $90, the opportunity cost of studying is the $90 you give up."
    },
    {
      id: "s02",
      title: "Going to the gym",
      desc: "You can go to the gym for an hour or do paid tutoring for $25.\nYou choose the gym.\n\nWhat is the opportunity cost of going to the gym?",
      options: [
        "The $25 you could have earned tutoring",
        "Your monthly gym membership fee (already paid)",
        "The calories you burned",
        "The cost of your gym shoes"
      ],
      correct: 0,
      explain: "The opportunity cost is the best alternative you give up—here, the $25 tutoring income."
    },
    {
      id: "s03",
      title: "Movie night",
      desc: "You can go to a movie ($14 ticket) or stay home and do a gig that would pay $60.\nYou choose the movie.\n\nWhat is the opportunity cost of going to the movie?",
      options: [
        "The $60 you give up by not doing the gig",
        "The $14 ticket price",
        "Both $60 and $14 (add them together)",
        "Nothing, because movies are leisure"
      ],
      correct: 0,
      explain: "Opportunity cost is the value of the next best alternative (the gig). The ticket is an explicit payment, but the question asks for the opportunity cost."
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
      explain: "The next best alternative is renting it out. The opportunity cost is the rental income you give up."
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
      title: "Sleeping in",
      desc: "You can sleep one more hour or arrive early to work and earn an extra $18.\nYou choose to sleep.\n\nWhat is the opportunity cost of sleeping?",
      options: [
        "The extra $18 you give up by not working",
        "Your rent payment",
        "Your alarm clock",
        "Your caffeine intake tomorrow"
      ],
      correct: 0,
      explain: "The next best alternative is earning $18 by working. That forgone $18 is the opportunity cost."
    },
    {
      id: "s07",
      title: "Cooking vs takeout",
      desc: "Ordering takeout costs $18. Cooking costs no extra money but takes time.\nAssume your next best alternative is ordering takeout.\nYou choose to cook.\n\nWhat is the opportunity cost of cooking?",
      options: [
        "The $18 takeout you give up (the next best alternative)",
        "The ingredients you already have at home",
        "Nothing, because cooking is free",
        "The fact that takeout is unhealthy"
      ],
      correct: 0,
      explain: "If the next best alternative is takeout, the opportunity cost of cooking is giving up that alternative (here: $18 takeout)."
    },
    {
      id: "s08",
      title: "Class time conflict",
      desc: "A required class is only offered at 3pm. That conflicts with a job shift that would pay $55.\nYou take the class.\n\nWhat is the opportunity cost of taking the class?",
      options: [
        "The $55 wages from the shift you can’t work",
        "Your tuition for the course",
        "The cost of parking",
        "The stress of homework"
      ],
      correct: 0,
      explain: "Opportunity cost is the value of the best alternative forgone—working the $55 shift."
    },
    {
      id: "s09",
      title: "Business cash vs interest",
      desc: "A business uses $10,000 cash to buy equipment instead of leaving it in an account earning 5% per year.\n\nWhat is the opportunity cost of buying the equipment (using the cash)?",
      options: [
        "The interest the $10,000 would have earned at 5%",
        "The $10,000 price tag on the equipment",
        "The time spent shopping for equipment",
        "The future resale value of the equipment"
      ],
      correct: 0,
      explain: "The opportunity cost is the forgone return on the next best alternative use of the funds: the interest earnings."
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
      explain: "The best alternative forgone is earning $40 overtime."
    },

    {
      id: "s11",
      title: "Free concert ticket",
      desc: "You win a free concert ticket. You can go to the concert or work a shift for $80.\nYou go to the concert.\n\nWhat is the opportunity cost of going to the concert?",
      options: [
        "The $80 wages you give up by not working",
        "The ticket price (it was free)",
        "The money you spent on the ticket",
        "Nothing, because it was free"
      ],
      correct: 0,
      explain: "Even with a free ticket, you give up the next best alternative—working for $80."
    },
    {
      id: "s12",
      title: "Toll road choice",
      desc: "You can take a faster route that costs $6 in tolls or a slower route with no toll.\nYou take the faster route.\n\nWhat is the opportunity cost of taking the faster route?",
      options: [
        "The $6 toll you give up to save time",
        "The time you saved (that’s a benefit, not the cost here)",
        "Your car payment",
        "Gas you would have used either way"
      ],
      correct: 0,
      explain: "Relative to the free route, you give up $6 to save time. The opportunity cost here is the $6 toll."
    },
    {
      id: "s13",
      title: "Picking up a shift",
      desc: "You can pick up an extra shift for $70 or attend a club meeting you value.\nYou pick up the shift.\nAssume the next best alternative is the club meeting.\n\nWhat is the opportunity cost of working the extra shift?",
      options: [
        "The value of attending the club meeting you give up",
        "The $70 you earn",
        "Your taxes on the $70",
        "Your commute time (regardless of alternatives)"
      ],
      correct: 0,
      explain: "Opportunity cost is the value of the best alternative forgone—here, the club meeting."
    },
    {
      id: "s14",
      title: "Selling your used laptop",
      desc: "You can sell your old laptop for $200 or keep it as a backup.\nYou keep it.\n\nWhat is the opportunity cost of keeping the laptop?",
      options: [
        "The $200 you could have received by selling it",
        "The original price you paid years ago",
        "The time it would take to post the listing",
        "The fact that new laptops are faster"
      ],
      correct: 0,
      explain: "The next best alternative is selling it for $200. That forgone $200 is the opportunity cost."
    },
    {
      id: "s15",
      title: "Using your own car",
      desc: "You use your own car for deliveries. Alternatively, you could rent your car out for $35 per day.\nYou use it for deliveries.\n\nWhat is the opportunity cost of using your car for deliveries?",
      options: [
        "The $35/day rental income you give up",
        "The gas you pay for deliveries",
        "The car’s purchase price",
        "Your insurance premium"
      ],
      correct: 0,
      explain: "Opportunity cost is the value of the next best alternative use of the resource—renting it out for $35/day."
    },

    {
      id: "s16",
      title: "Campus event",
      desc: "You can attend a campus event or work on a project that would earn you $120.\nYou attend the event.\n\nWhat is the opportunity cost of attending the event?",
      options: [
        "The $120 you give up by not doing the project",
        "The cost of the event (it’s free)",
        "The snacks you eat at the event",
        "Your student fees"
      ],
      correct: 0,
      explain: "The next best alternative is earning $120 on the project. That forgone $120 is the opportunity cost."
    },
    {
      id: "s17",
      title: "Buying coffee",
      desc: "You stop for coffee on the way to class and pay $5.\nAssume the next best alternative was making coffee at home for $1.\n\nWhat is the opportunity cost of buying coffee?",
      options: [
        "The $1 home coffee you give up (the next best alternative)",
        "The full $5 you paid",
        "Your time waiting in line",
        "Your caffeine level"
      ],
      correct: 0,
      explain: "Opportunity cost is the value of the next best alternative—here, making coffee at home for $1."
    },
    {
      id: "s18",
      title: "Streaming vs reading",
      desc: "You can watch a show or read for an hour.\nYou watch the show.\nAssume your next best alternative is reading.\n\nWhat is the opportunity cost of watching the show?",
      options: [
        "The value of reading you give up (the next best alternative)",
        "Your electricity bill",
        "Your subscription fee (already paid)",
        "Nothing because it’s leisure"
      ],
      correct: 0,
      explain: "Opportunity cost is the value of the next best alternative—reading."
    },
    {
      id: "s19",
      title: "Parking spot choice",
      desc: "You can park for free far away and walk 15 minutes, or pay $8 to park close.\nYou pay $8.\n\nWhat is the opportunity cost of parking close?",
      options: [
        "The free parking option you give up (saving $8 but walking 15 minutes)",
        "The $8 payment itself",
        "Your walking shoes",
        "The time you spent driving"
      ],
      correct: 0,
      explain: "Opportunity cost is the value of the next best alternative you give up—the free parking option (saving $8 but walking)."
    },
    {
      id: "s20",
      title: "Skipping a sale",
      desc: "A jacket is on sale today for $60, but you don’t buy it.\nAssume the next best alternative was buying it today.\n\nWhat is the opportunity cost of not buying it?",
      options: [
        "The value of having the jacket (the best alternative you give up)",
        "The $60 you didn’t spend",
        "The original price of the jacket",
        "Nothing because you saved money"
      ],
      correct: 0,
      explain: "If the next best alternative was buying it, the opportunity cost of not buying is giving up the value/benefit of owning it."
    },

    // --- 30 more scenarios, same structure, clear next-best alternative ---
    {
      id: "s21",
      title: "Weekend trip",
      desc: "You can go on a weekend trip costing $150 or work extra hours and earn $220.\nYou go on the trip.\n\nWhat is the opportunity cost of going on the trip?",
      options: ["The $220 you give up by not working", "The $150 you spend on the trip", "Both $220 and $150 added together", "Nothing because it’s the weekend"],
      correct: 0,
      explain: "The opportunity cost is the value of the next best alternative—earning $220."
    },
    {
      id: "s22",
      title: "Choosing a major",
      desc: "You choose Major A. Your next best alternative is Major B, which you believe would raise your future earnings by $5,000 per year.\n\nWhat is the opportunity cost of choosing Major A?",
      options: ["The higher expected earnings you give up by not choosing Major B", "The tuition you pay for Major A", "The difficulty of Major A", "The salary you might earn after graduating Major A"],
      correct: 0,
      explain: "Opportunity cost is the value of the next best alternative you give up—here, the higher expected earnings from Major B."
    },
    {
      id: "s23",
      title: "Car repair vs new tires",
      desc: "You have $400. You can repair your car’s brakes or buy new tires.\nYou repair the brakes.\nAssume the next best alternative was buying tires.\n\nWhat is the opportunity cost of repairing the brakes?",
      options: ["The value of the new tires you give up", "The $400 you spend on brakes", "The money you spent on the car originally", "The time spent at the mechanic"],
      correct: 0,
      explain: "Opportunity cost is the value of the next best alternative—new tires."
    },
    {
      id: "s24",
      title: "Selling stock",
      desc: "You sell a stock today. If you had held it, you expect it would have increased in value by $300 over the next year.\n\nWhat is the opportunity cost of selling the stock today?",
      options: ["The expected $300 gain you give up by not holding it", "The taxes you pay on your sale", "The original price you paid for the stock", "The broker’s website fee"],
      correct: 0,
      explain: "The opportunity cost is the value of the next best alternative—holding the stock and gaining $300."
    },
    {
      id: "s25",
      title: "Using vacation days",
      desc: "You can use a vacation day to go hiking or save it for later.\nAssume your next best alternative is saving the day for a future trip you value more.\nYou go hiking.\n\nWhat is the opportunity cost of going hiking today?",
      options: ["The value of the future trip you give up by using the vacation day now", "The cost of hiking shoes", "The calories you burn", "Nothing because vacation days are free"],
      correct: 0,
      explain: "Opportunity cost is the value of the next best alternative—saving the vacation day for the more valuable future trip."
    },

    {
      id: "s26",
      title: "Part-time job choice",
      desc: "You can take Job A paying $18/hour or Job B paying $16/hour but closer to home.\nYou take Job B. Assume the next best alternative is Job A.\n\nWhat is the opportunity cost of taking Job B?",
      options: ["The higher wage from Job A you give up", "Your commuting cost to Job B", "Your taxes on Job B income", "The hourly wage of Job B"],
      correct: 0,
      explain: "If Job A is the next best alternative, the opportunity cost is the higher earnings you give up by not choosing Job A."
    },
    {
      id: "s27",
      title: "Buying a used bike",
      desc: "You buy a used bike for $120. The next best alternative is taking the bus for $2 per ride.\nAssume you would take 50 rides.\n\nWhat is the opportunity cost of buying the bike (as framed)?",
      options: ["The bus rides you give up (50 rides at $2 each)", "The $120 you paid for the bike", "The repair costs you might face", "The exercise you gain"],
      correct: 0,
      explain: "Given the framing, the next best alternative is bus rides. The opportunity cost is giving up those rides (50×$2)."
    },
    {
      id: "s28",
      title: "Library vs café",
      desc: "You can study at the library for free or study at a café where you would buy a $6 drink.\nYou study at the café.\nAssume the next best alternative is the library.\n\nWhat is the opportunity cost of studying at the café?",
      options: ["The free library study option you give up", "The $6 drink you buy", "Your tuition", "Your exam grade"],
      correct: 0,
      explain: "Opportunity cost is the next best alternative you give up—studying at the library for free."
    },
    {
      id: "s29",
      title: "Working out vs sleeping",
      desc: "You can sleep an extra hour or work out.\nYou work out.\nAssume your next best alternative is sleeping.\n\nWhat is the opportunity cost of working out?",
      options: ["The value of an extra hour of sleep you give up", "Your gym membership (already paid)", "The calories you burn", "The cost of water"],
      correct: 0,
      explain: "If sleeping is the next best alternative, the opportunity cost is the value of that forgone sleep."
    },
    {
      id: "s30",
      title: "Taking a scholarship",
      desc: "You receive a scholarship that covers tuition at School A.\nYour next best alternative is School B, which you prefer but would cost $8,000 more.\nYou choose School A.\n\nWhat is the opportunity cost of choosing School A?",
      options: ["The added value you would have gotten from School B (your best alternative)", "The $8,000 you saved", "The scholarship amount", "Nothing because tuition is covered"],
      correct: 0,
      explain: "Opportunity cost is the value of the next best alternative you give up—here, the value of attending your preferred School B."
    },

   // Replace the template block with these 20 scenarios (s31–s50)

{
  id: "s31",
  title: "Carpool vs driving alone",
  desc: "You can drive alone to campus and pay $10 for parking, or carpool and split parking so you would pay $4.\nYou choose to drive alone.\nAssume your next best alternative is carpooling.\n\nWhat is the opportunity cost of driving alone?",
  options: [
    "The carpool option you give up (including saving $6 on parking)",
    "The $10 parking fee you pay",
    "Your car insurance",
    "The gas you would have used either way"
  ],
  correct: 0,
  explain: "Opportunity cost is the value of the next best alternative you give up—here, carpooling (including the parking savings)."
},
{
  id: "s32",
  title: "Concert vs exam prep",
  desc: "You have a midterm tomorrow. Tonight you can go to a concert or study.\nYou go to the concert.\nAssume your next best alternative is studying.\n\nWhat is the opportunity cost of going to the concert?",
  options: [
    "The value/benefit of studying you give up (the next best alternative)",
    "The price of the concert ticket",
    "Your tuition for the course",
    "The grade you will definitely get"
  ],
  correct: 0,
  explain: "The opportunity cost is the value of the next best alternative forgone—studying. The ticket price is an explicit cost, but the question asks for the opportunity cost."
},
{
  id: "s33",
  title: "Working lunch vs lunch with friends",
  desc: "During lunch you can work on a freelance task that would pay $35 or eat lunch with friends.\nYou eat lunch with friends.\n\nWhat is the opportunity cost of eating lunch with friends?",
  options: [
    "The $35 you could have earned freelancing",
    "The cost of your lunch",
    "Your monthly phone bill",
    "The enjoyment of lunch (that is a benefit)"
  ],
  correct: 0,
  explain: "The opportunity cost is the best alternative you give up—earning $35 from the freelance task."
},
{
  id: "s34",
  title: "Using a gift card",
  desc: "You have a $25 gift card to a store. You can use it for groceries or use it for snacks.\nYou buy snacks.\nAssume your next best alternative is groceries.\n\nWhat is the opportunity cost of buying snacks with the gift card?",
  options: [
    "The groceries you give up buying (the next best alternative)",
    "The $25 on the gift card",
    "The price of the snacks (they are paid with the gift card)",
    "Nothing because it’s a gift card"
  ],
  correct: 0,
  explain: "Even if money doesn’t leave your wallet, you give up the next best alternative use of the gift card—groceries."
},
{
  id: "s35",
  title: "Job training vs part-time work",
  desc: "You can attend a job training program today or work part-time and earn $75.\nYou attend the training.\n\nWhat is the opportunity cost of attending the training?",
  options: [
    "The $75 wages you give up by not working",
    "The cost of your transportation to training",
    "The trainer’s salary",
    "The knowledge you gain from training"
  ],
  correct: 0,
  explain: "Opportunity cost is the value of the next best alternative forgone—earning $75 from work."
},
{
  id: "s36",
  title: "Choosing a cheaper flight",
  desc: "You can take a cheaper flight that includes a 4-hour layover or a more expensive direct flight.\nYou take the cheaper flight.\nAssume your next best alternative is the direct flight.\n\nWhat is the opportunity cost of taking the cheaper flight?",
  options: [
    "The time and convenience of the direct flight you give up (the next best alternative)",
    "The ticket price you pay for the cheaper flight",
    "The airport’s fees",
    "The luggage you bring"
  ],
  correct: 0,
  explain: "The opportunity cost is the value of the next best alternative forgone—here, avoiding the layover via the direct flight."
},
{
  id: "s37",
  title: "Buying a new phone now vs waiting",
  desc: "You can buy a phone today for $700 or wait one month for a likely sale price of $600.\nYou buy today.\nAssume your next best alternative is waiting.\n\nWhat is the opportunity cost of buying today?",
  options: [
    "The benefit of waiting and paying $600 (the next best alternative)",
    "The $700 you pay today",
    "The phone case you also buy",
    "The time you spend setting up the phone"
  ],
  correct: 0,
  explain: "Opportunity cost is the value of the best alternative forgone—waiting for the sale (saving $100)."
},
{
  id: "s38",
  title: "Business owner’s time",
  desc: "A business owner spends Saturday working at the shop.\nIf they didn’t work, they could have taken a one-day job that pays $150.\nThey work at the shop.\n\nWhat is the opportunity cost of the owner’s Saturday time?",
  options: [
    "The $150 they give up by not taking the one-day job",
    "The wages they pay employees",
    "The rent for the shop",
    "The profits the business earns (that’s an outcome)"
  ],
  correct: 0,
  explain: "The opportunity cost of the owner’s time is the value of the next best alternative use—earning $150 elsewhere."
},
{
  id: "s39",
  title: "Choosing between two internships",
  desc: "You have two internship offers. Internship A is unpaid but you think it improves your resume more.\nInternship B pays $2,000 over the summer.\nYou choose Internship A.\nAssume your next best alternative is Internship B.\n\nWhat is the opportunity cost of choosing Internship A?",
  options: [
    "The $2,000 you give up by not taking Internship B",
    "The cost of commuting to Internship A",
    "The value of learning at Internship A",
    "The tuition you pay to your university"
  ],
  correct: 0,
  explain: "If Internship B is the next best alternative, the opportunity cost of choosing A is the $2,000 you give up."
},
{
  id: "s40",
  title: "Using a room in your house",
  desc: "You convert a spare room in your house into a home office.\nAlternatively, you could rent that room to a roommate for $600/month.\nYou choose the home office.\n\nWhat is the opportunity cost of using the room as an office?",
  options: [
    "The $600/month rental income you give up",
    "Your internet bill",
    "The cost of a desk and chair",
    "The mortgage payment on your house"
  ],
  correct: 0,
  explain: "The opportunity cost is the best alternative use of the room—renting it out for $600/month."
},
{
  id: "s41",
  title: "Selling a used couch",
  desc: "You can sell your used couch for $150 or keep it in your garage.\nYou keep it.\nAssume the next best alternative is selling.\n\nWhat is the opportunity cost of keeping the couch?",
  options: [
    "The $150 you give up by not selling it",
    "The price you paid for the couch years ago",
    "The space it takes up (that may matter, but the best alternative is selling for $150 here)",
    "Nothing because you already own it"
  ],
  correct: 0,
  explain: "If selling is the next best alternative, the opportunity cost is the $150 you could have received."
},
{
  id: "s42",
  title: "Campus meal plan choice",
  desc: "You can buy a campus meal plan for $400 or cook at home for $280.\nYou buy the meal plan.\nAssume the next best alternative is cooking at home.\n\nWhat is the opportunity cost of buying the meal plan?",
  options: [
    "The cooking-at-home option you give up (saving $120)",
    "The $400 you pay",
    "Your grocery store membership",
    "The time you spend eating"
  ],
  correct: 0,
  explain: "Opportunity cost is the value of the next best alternative forgone—cooking at home for $280 (saving $120)."
},
{
  id: "s43",
  title: "Buying a coffee maker",
  desc: "You consider buying a coffee maker for $60. Your next best alternative is buying coffee out each morning for $3.\nYou buy the coffee maker.\nAssume you would have bought coffee out for 30 mornings.\n\nWhat is the opportunity cost of buying the coffee maker (as framed)?",
  options: [
    "The 30 coffees you would have bought out (30 × $3)",
    "The $60 price of the coffee maker",
    "The electricity used by the coffee maker",
    "The taste of homemade coffee"
  ],
  correct: 0,
  explain: "Given the framing, the next best alternative is buying coffee out. The opportunity cost is giving up those purchases (30×$3)."
},
{
  id: "s44",
  title: "Extra practice problems",
  desc: "You can do extra practice problems for an hour or watch a sports game.\nYou do practice problems.\nAssume your next best alternative is watching the game.\n\nWhat is the opportunity cost of doing practice problems?",
  options: [
    "The value of watching the game you give up",
    "The cost of the homework",
    "Your tuition",
    "Nothing because studying is required"
  ],
  correct: 0,
  explain: "Opportunity cost is the next best alternative forgone—watching the game."
},
{
  id: "s45",
  title: "Taking a train vs driving",
  desc: "You can drive to a nearby city for $25 in gas or take a train for $40.\nYou take the train.\nAssume your next best alternative is driving.\n\nWhat is the opportunity cost of taking the train?",
  options: [
    "The driving option you give up (including saving $15)",
    "The $40 train ticket",
    "Your car insurance payment",
    "The time spent traveling (both options require time)"
  ],
  correct: 0,
  explain: "Opportunity cost is the value of the next best alternative forgone—driving (which would have cost $25 instead of $40)."
},
{
  id: "s46",
  title: "Picking a project topic",
  desc: "You can write a paper on Topic A or Topic B.\nYou choose Topic A.\nAssume your next best alternative is Topic B, which you believe you would enjoy more.\n\nWhat is the opportunity cost of choosing Topic A?",
  options: [
    "The value of doing Topic B (the next best alternative) you give up",
    "The time spent writing the paper",
    "Your course grade",
    "The professor’s time grading"
  ],
  correct: 0,
  explain: "Opportunity cost is the value of the next best alternative forgone—here, doing Topic B."
},
{
  id: "s47",
  title: "Buying a season pass",
  desc: "You can buy a season pass for $180 or buy single tickets for $15 each.\nYou buy the season pass.\nAssume the next best alternative is single tickets.\nYou expect you would attend 10 games.\n\nWhat is the opportunity cost of buying the season pass (as framed)?",
  options: [
    "The 10 single tickets you would have bought (10 × $15)",
    "The $180 you paid",
    "The snacks you buy at games",
    "The enjoyment of games"
  ],
  correct: 0,
  explain: "Given the framing, the next best alternative is buying single tickets for 10 games. The opportunity cost is that alternative (10×$15)."
},
{
  id: "s48",
  title: "Using savings to pay tuition",
  desc: "You use $6,000 from savings to pay tuition instead of leaving it invested, where it would earn 6% over the year.\n\nWhat is the opportunity cost of using savings to pay tuition (from the savings use)?",
  options: [
    "The investment return (interest) you give up by not keeping the $6,000 invested",
    "The $6,000 tuition itself",
    "The number of classes you take",
    "The price of textbooks"
  ],
  correct: 0,
  explain: "The opportunity cost of using funds is the forgone return on the next best alternative use—keeping the $6,000 invested."
},
{
  id: "s49",
  title: "Taking a nap",
  desc: "You can take a 30-minute nap or spend 30 minutes doing a paid micro-task for $12.\nYou take the nap.\n\nWhat is the opportunity cost of taking the nap?",
  options: [
    "The $12 you give up by not doing the micro-task",
    "Your electricity bill",
    "Your pillow",
    "Nothing because napping is free"
  ],
  correct: 0,
  explain: "Opportunity cost is the value of the best alternative forgone—earning $12."
},
{
  id: "s50",
  title: "Staying on campus vs commuting home",
  desc: "After class, you can stay on campus to use the library or commute home and start a paid shift that would earn $45.\nYou stay on campus.\n\nWhat is the opportunity cost of staying on campus?",
  options: [
    "The $45 you give up by not starting the paid shift",
    "Your transportation cost (which you might still pay later)",
    "Your tuition",
    "The cost of library books"
  ],
  correct: 0,
  explain: "The opportunity cost is the best alternative you give up—earning $45 from the shift you don’t take."
}
  ]
};
