(function(){
'use strict';

// ─────────────────────────────────────────────────────────────────────────
// Sample week-template entry (paste into a discussion week's LABS array):
//   { id: 'transition-path', name: 'Transition Path: Impact to Long Run', icon: '⏳',
//     desc: 'Trace a demand shock from impact through short-run to long-run equilibrium.',
//     url: '/classes/econ105b/labs/transition-path/?disc=1' }
// ─────────────────────────────────────────────────────────────────────────
const LAB_ID    = 'transition-path';
const LAB_LABEL = 'Transition Path: Impact to Long Run';

// ═══ 1. MODEL ══════════════════════════════════════════════════════════
// C  = c0 + MPC(Y − T)                I = I0 − I1·r
// IS: r = (A − (1−MPC)Y)/I1           A = c0 − MPC·T + I0 + G
// LM: M/P = md + L0·Y − L1·r  ⟹  r = (md + L0·Y − M/P)/L1
// AD: Y = α + β/P    α = (L1·A − I1·md)/D    β = I1·M/D    D = L1(1−MPC)+I1·L0
// SRAS: P = EP + φ(Y − Ȳ)   with φ = a(1−s)/s from the AS notes
// LRAS: Y = Ȳ
const MPC = 0.75, I1 = 100, L0 = 1, L1 = 200, YBAR = 100, PHI = 1;
const BASE  = { c0:13, T:20, G:20, I0:15, M:8400, md:0 };
const PBASE = 100;          // P₁
const EPBASE = 100;         // expected price level in the initial long run
const DEN = L1*(1-MPC) + I1*L0;                     // = 150

const Acoef  = s => s.c0 - MPC*s.T + s.I0 + s.G;    // = 33 at baseline
const alphaOf= s => (L1*Acoef(s) - I1*s.md)/DEN;    // = 44
const betaOf = s => I1*s.M/DEN;                     // = 5600
const rIS    = (s,Y) => (Acoef(s) - (1-MPC)*Y)/I1;
const rLM    = (s,Y,P) => (s.md + L0*Y - s.M/P)/L1;
const Yad    = (s,P) => alphaOf(s) + betaOf(s)/P;
// SRAS is carried as an intercept: P = c + φ·Y, with c = EP − φ·Ȳ_anchor.
// One representation covers both shock types — a demand shock moves EP, a cost
// shock moves costs directly, and a permanent cost shock also moves Ȳ. Because
// every SRAS in this model has the same slope φ, the intercept is the curve.
const PsrasC = (Y,c) => c + PHI*Y;
const cFromEP = EP => EP - PHI*YBAR;
const Psras   = (Y,EP) => PsrasC(Y, cFromEP(EP));

// AD ∩ SRAS:  P = c + φ(α + β/P)  ⟹  P² − (c + φα)P − φβ = 0
function adSrasPc(s, c){
  const b = c + PHI*alphaOf(s);
  return (b + Math.sqrt(b*b + 4*PHI*betaOf(s)))/2;
}
const adSrasP = (s, EP) => adSrasPc(s, cFromEP(EP));

// The drawn phases for one shock. Every point is derived, never hard-coded.
function computePath(sh){
  if(sh.family === 'supply') return computeSupplyPath(sh);
  const s0 = BASE, s1 = Object.assign({}, BASE, sh.params);
  const r1 = rIS(s0, YBAR);                               // 0.08
  const A  = { Y:YBAR, r:r1, P:PBASE };
  // A′ — goods: the goods market clears at the UNCHANGED interest rate.
  //      money: the newly shifted LM evaluated at unchanged output.
  const Ap = sh.family === 'goods'
    ? { Y:(Acoef(s1) - I1*r1)/(1-MPC), r:r1,                P:PBASE }
    : { Y:YBAR,                        r:rLM(s1,YBAR,PBASE), P:PBASE };
  const Y2  = Yad(s1, PBASE);
  const App = { Y:Y2, r:rIS(s1,Y2), P:PBASE };            // IS′ ∩ LM(P₁)
  const P2  = adSrasP(s1, EPBASE), YB = Yad(s1, P2);
  const B   = { Y:YB, r:rIS(s1,YB), P:P2 };               // AD′ ∩ SRAS
  const P3  = betaOf(s1)/(YBAR - alphaOf(s1));           // AD′ at Y = Ȳ
  const C   = { Y:YBAR, r:rIS(s1,YBAR), P:P3 };          // AD′ ∩ SRAS′ ∩ LRAS
  return { s0, s1, A, Ap, App, B, C, P2, P3, EP3:P3,
           sras0:cFromEP(EPBASE), sras2:cFromEP(EPBASE), sras3:cFromEP(P3),
           ybar0:YBAR, ybar1:YBAR };
}

// ── Supply (cost) shocks — LRSREAPP.pdf §3 ────────────────────────────
// A cost shock moves SRAS directly. IS and AD never move: the whole story runs
// through the price level. B is AD ∩ SRAS′. Where the economy ends depends on
// whether the cost change reverts (back to A) or is permanent (Ā falls, LRAS
// moves, and the new long run sits at a different level of output).
function computeSupplyPath(sh){
  const s0 = BASE, s1 = s0;                    // no demand parameter changes
  const A  = { Y:YBAR, r:rIS(s0,YBAR), P:PBASE };
  const c0 = cFromEP(EPBASE);                  // = 0
  const c2 = c0 + sh.dCost;                    // SRAS after the cost shock
  const P2 = adSrasPc(s0, c2), Y2 = Yad(s0, P2);
  const B  = { Y:Y2, r:rIS(s0,Y2), P:P2 };
  let C, P3, c3, ybar1;
  if(sh.permanent){
    ybar1 = sh.ybar1;                          // LRAS moves to the new capacity
    P3 = betaOf(s0)/(ybar1 - alphaOf(s0));     // AD at the new natural rate
    c3 = P3 - PHI*ybar1;                       // SRAS re-pinned through C
    C  = { Y:ybar1, r:rIS(s0,ybar1), P:P3 };
  } else {
    ybar1 = YBAR; P3 = PBASE; c3 = c0;         // costs revert — straight back to A
    C  = { Y:YBAR, r:A.r, P:PBASE };
  }
  return { s0, s1, A, B, C, P2, P3,
           sras0:c0, sras2:c2, sras3:c3, ybar0:YBAR, ybar1 };
}

// ═══ 2. SHOCKS ═════════════════════════════════════════════════════════
// dir: +1 expansionary (Y rises on impact), −1 contractionary.
// pill/pillDir: the token that opens the stage-1 chain.
const DT = 20/3;   // ΔT that produces ΔA = ∓5
const SHOCKS = {
  G_up : { tag:'G↑',        family:'goods', dir:+1, params:{G:25},        pill:'G' },
  G_dn : { tag:'G↓',        family:'goods', dir:-1, params:{G:15},        pill:'G' },
  C_up : { tag:'c₀↑',       family:'goods', dir:+1, params:{c0:18},       pill:'C' },
  C_dn : { tag:'c₀↓',       family:'goods', dir:-1, params:{c0:8},        pill:'C' },
  I_up : { tag:'I₀↑',       family:'goods', dir:+1, params:{I0:20},       pill:'I' },
  I_dn : { tag:'I₀↓',       family:'goods', dir:-1, params:{I0:10},       pill:'I' },
  T_dn : { tag:'T↓',        family:'goods', dir:+1, params:{T:20-DT},     pill:'T' },
  T_up : { tag:'T↑',        family:'goods', dir:-1, params:{T:20+DT},     pill:'T' },
  M_up : { tag:'M↑',        family:'money', dir:+1, params:{M:8400*1.08}, pill:'M' },
  M_dn : { tag:'M↓',        family:'money', dir:-1, params:{M:8400*0.92}, pill:'M' },
  MD_dn: { tag:'(M/P)ᵈ↓',   family:'money', dir:+1, params:{md:-5},       pill:'(M/P)ᵈ' },
  MD_up: { tag:'(M/P)ᵈ↑',   family:'money', dir:-1, params:{md:5},        pill:'(M/P)ᵈ' },

  // Cost shocks. dCost is the jump in the SRAS intercept; ybar1 is where LRAS
  // lands when the change is permanent. Costs↑ is contractionary (Y falls), so
  // it carries dir −1 even though the price level rises.
  S_up_T: { tag:'Costs↑ (temporary)', family:'supply', dir:-1, params:{},
            dCost:+8, permanent:false },
  S_up_P: { tag:'Costs↑ (permanent)', family:'supply', dir:-1, params:{},
            dCost:+8, permanent:true,  ybar1:94 },
  S_dn_T: { tag:'Costs↓ (temporary)', family:'supply', dir:+1, params:{},
            dCost:-8, permanent:false },
  S_dn_P: { tag:'Costs↓ (permanent)', family:'supply', dir:+1, params:{},
            dCost:-8, permanent:true,  ybar1:106 },
};
// A T cut is expansionary but the tax itself falls, so its opening pill runs
// against the shock's direction. Every other shock's pill moves with it.
SHOCKS.T_dn.pillDir = 'down';
SHOCKS.T_up.pillDir = 'up';
SHOCKS.MD_dn.pillDir = 'down';
SHOCKS.MD_up.pillDir = 'up';
for(const k of Object.keys(SHOCKS)){
  const s = SHOCKS[k];
  if(s.family === 'supply'){
    s.pill = 'Costs';
    s.pillDir = s.dCost > 0 ? 'up' : 'down';
    // Stage count and where the rail splits differ by family, so both are data.
    s.nStages = s.permanent ? 10 : 8;
    s.railSplit = 4;
    s.railB = s.permanent ? 'Transition to the Long Run' : 'Return to the Long Run';
  } else {
    if(!s.pillDir) s.pillDir = s.dir > 0 ? 'up' : 'down';
    s.nStages = 10;
    s.railSplit = 5;
    s.railB = 'Transition to the Long Run';
  }
}

// ═══ 3. PILL POOLS ═════════════════════════════════════════════════════
const POOLS = {
  goods:     { hdr:'Goods market',     pills:['G','T','C','I','PE','U.I.','Y','r'] },
  money:     { hdr:'Money market',     pills:['M','P','M/P','(M/P)ᵈ','Y','r'] },
  aggDemand: { hdr:'Aggregate demand', pills:['AD','P','Y'] },
  factor:    { hdr:'Factor market',    pills:['P','W','W/P'] },
  firm:      { hdr:'Firm pricing',     pills:['W','EP','P'] },
  cost:      { hdr:'Costs',            pills:['Costs','EP','P','W'] },
  capacity:  { hdr:'Productive capacity', pills:['Ā','Ȳ','K','L'] },
};

// ═══ 4. TERMINAL-STATEMENT OPTIONS ═════════════════════════════════════
// Movements along a curve are spelled out in (Y, r) or (P, Y) terms rather
// than a bare up/down, because "move down along IS" is ambiguous about which
// variable is falling. LM never shifts right/left; LRAS never moves at all.
const ACTIONS = {
  IS:  [['shift-right','shifts right'],
        ['shift-left','shifts left'],
        ['move-YU-rD','move along IS — Y rises, r falls'],
        ['move-YD-rU','move along IS — Y falls, r rises'],
        ['none','no change']],
  LM:  [['shift-up','shifts up'],
        ['shift-down','shifts down'],
        ['move-YU-rU','move along LM — Y rises, r rises'],
        ['move-YD-rD','move along LM — Y falls, r falls'],
        ['none','no change']],
  AD:  [['shift-right','shifts right'],
        ['shift-left','shifts left'],
        ['move-PU','move along AD — P rises, Y falls'],
        ['move-PD','move along AD — P falls, Y rises'],
        ['none','no change']],
  SRAS:[['shift-up','shifts up'],
        ['shift-down','shifts down'],
        ['move-PU','move along SRAS — P rises, Y rises'],
        ['move-PD','move along SRAS — P falls, Y falls'],
        ['none','no change']],
  // LRAS only moves when productive capacity itself changes — a permanent cost
  // shock. It never shifts for a demand shock or a temporary cost shock.
  LRAS:[['shift-right','shifts right'],
        ['shift-left','shifts left'],
        ['none','no change']],
};
const ACTION_LABEL = (c,a) => {
  const row = (ACTIONS[c]||[]).find(x => x[0] === a);
  return row ? row[1] : a;
};

// ═══ 5. THE TEN STAGES ═════════════════════════════════════════════════
// Transcribed from LRSREAPP.pdf §1 (goods) and §2 (money). U is the direction
// a variable moves under an expansionary shock; D is its mirror.
function buildStages(sh){
  return markCarryOver(sh.family === 'supply' ? buildSupplyStages(sh) : buildDemandStages(sh));
}

// Several stages open on the very link the previous stage closed with — Y↑
// leading into the money market, r↑ leading into the goods market, and so on.
// The student can no longer see that previous stage, so asking them to retype
// it tests recall rather than reasoning. Flag those so the UI can carry the
// link over already filled in.
function markCarryOver(S){
  for(let i = 1; i < S.length; i++){
    const prev = S[i-1], cur = S[i];
    if(cur.carry) continue;                    // already set explicitly
    if(prev.kind === 'summary' || cur.kind === 'summary') continue;
    const last = prev.chain[prev.chain.length - 1], first = cur.chain[0];
    if(last && first && last.v === first.v && last.d === first.d){
      cur.carry = true;
      cur.carryFrom = prev.n;
    }
  }
  return S;
}

function buildDemandStages(sh){
  const ex = sh.dir > 0;
  const U  = ex ? 'up'   : 'down';
  const D  = ex ? 'down' : 'up';
  const goods = sh.family === 'goods';
  const S = [];

  // ── 1. the shock itself ────────────────────────────────────────────
  if(goods){
    const chain = [{ v:sh.pill, d:sh.pillDir }];
    if(sh.pill === 'T') chain.push({ v:'C', d:U });     // T↓ → C↑
    chain.push({ v:'PE', d:U }, { v:'U.I.', d:D }, { v:'Y', d:U });
    S.push({ n:1, title:'Goods Market Shock', market:'goods', kind:'chain',
      chain, curve:{ c:'IS', a: ex ? 'shift-right' : 'shift-left' },
      lead:'The shock hits planned expenditure first. Chain it through to output, then say what happens to IS.' });
  } else {
    const chain = sh.pill === 'M'
      ? [{ v:'M', d:U }, { v:'M/P', d:U }, { v:'r', d:D }]
      : [{ v:'(M/P)ᵈ', d:D }, { v:'r', d:D }];
    S.push({ n:1, title:'Money Market Shock', market:'money', kind:'chain',
      chain, curve:{ c:'LM', a: ex ? 'shift-down' : 'shift-up' },
      lead:'The shock hits the money market first. Chain it through to the interest rate, then say what happens to LM.' });
  }

  // ── 2. the other market reacts ─────────────────────────────────────
  if(goods){
    S.push({ n:2, title:'Money Market Impact', market:'money', kind:'chain',
      chain:[{ v:'Y', d:U }, { v:'(M/P)ᵈ', d:U }, { v:'r', d:U }],
      curve:{ c:'LM', a: ex ? 'move-YU-rU' : 'move-YD-rD' },
      lead:'Output has changed, so money demand changes. The money market clears at a new interest rate — but the LM curve itself has not moved.' });
  } else {
    S.push({ n:2, title:'Goods Market Response', market:'goods', kind:'chain',
      chain:[{ v:'r', d:D }, { v:'I', d:U }, { v:'PE', d:U }, { v:'U.I.', d:D }, { v:'Y', d:U }],
      curve:{ c:'IS', a: ex ? 'move-YU-rD' : 'move-YD-rU' },
      lead:'The interest rate has changed, so investment changes. The goods market clears at a new level of output — but the IS curve itself has not moved.' });
  }

  // ── 3. aggregate demand (curve first, per the worksheet) ───────────
  S.push({ n:3, title:'Aggregate Demand', market:'aggDemand', kind:'chain',
    curveFirst:true,
    curve:{ c:'AD', a: ex ? 'shift-right' : 'shift-left' },
    chain:[{ v:'P', d:U }],
    lead:'Equilibrium output is different at every price level, so AD moves. Flexible-price firms then respond.' });

  // ── 4. the price change feeds back to the money market ─────────────
  S.push({ n:4, title:goods ? 'Money Market Impact' : 'Money Market Response',
    market:'money', kind:'chain',
    chain:[{ v:'P', d:U }, { v:'M/P', d:D }, { v:'r', d:U }],
    curve:{ c:'LM', a: ex ? 'shift-up' : 'shift-down' },
    lead:'A different price level means different real money balances. This one does shift LM — and it lands the economy at B.' });

  // ── 5. short-run equilibrium ───────────────────────────────────────
  S.push({ n:5, title:'Short-Run Equilibrium (B)', market:null, kind:'summary',
    chain:[{ v:'Y', d:U }, { v:'P', d:U }, { v:'r', d: goods ? U : D }],
    curve:null,
    lead:'Compare B with the starting point A. Set each variable to ↑, ↓, or no change.' });

  // ── 6–9. transition to the long run (identical for every demand shock) ─
  // Stage 6 opens on what the price level did through the short run, which the
  // student established at stage 5 — so it carries over rather than being
  // retyped from memory.
  S.push({ n:6, title:'Factor Market', market:'factor', kind:'chain',
    carry:true, carryFrom:5,
    chain:[{ v:'P', d:U }, { v:'W/P', d:D }, { v:'W', d:U }],
    curve:null,
    lead:'Workers bargain over the real wage, not the nominal wage. The price change has moved it away from the marginal product of labor.' });

  S.push({ n:7, title:'Firm Behavior', market:'firm', kind:'chain',
    chain:[{ v:'W', d:U }, { v:'EP', d:U }, { v:'P', d:U }],
    curve:{ c:'SRAS', a: ex ? 'shift-up' : 'shift-down' },
    lead:'Sticky-price firms reset the prices they set in advance. That is a move in the expected price level — which is what pins SRAS.' });

  S.push({ n:8, title:'Money Market Response', market:'money', kind:'chain',
    chain:[{ v:'P', d:U }, { v:'M/P', d:D }, { v:'r', d:U }],
    curve:{ c:'LM', a: ex ? 'shift-up' : 'shift-down' },
    lead:'The same real-balances logic as stage 4, now driven by the SRAS shift instead of the AD shift.' });

  S.push({ n:9, title:'Goods Market Response', market:'goods', kind:'chain',
    chain:[{ v:'r', d:U }, { v:'I', d:D }, { v:'PE', d:D }, { v:'U.I.', d:U }, { v:'Y', d:D }],
    curve:{ c:'IS', a: ex ? 'move-YD-rU' : 'move-YU-rD' },
    lead:'Output returns to the natural rate. IS has not moved again — the economy slides along it.' });

  // ── 10. long run ───────────────────────────────────────────────────
  S.push({ n:10, title:'Long Run (C)', market:null, kind:'summary',
    chain:[{ v:'Y', d:'none' }, { v:'P', d:U }, { v:'r', d: goods ? U : 'none' }],
    curve:null,
    lead:'Compare C with the starting point A. This is the payoff: what did the shock change permanently?' });

  return S;
}

// ── Cost-shock stages — LRSREAPP.pdf §3 ───────────────────────────────
// Stages 1–4 and the temporary tail (5–8) are transcribed from §3. The
// permanent tail is given in the worksheet only as "Ā↓ → LRAS shifts left", so
// stages 5–10 below extend it along the same lines as §1: capacity falls, then
// the ordinary factor-market / expectations mechanism carries the economy to
// the new natural rate.
function buildSupplyStages(sh){
  const neg = sh.dCost > 0;             // costs rose ⟹ negative supply shock
  // A cost shock splits every variable into just two camps. dP is the way the
  // price level moves on impact — and with it r and unplanned inventories. dY
  // is the opposite: output, real balances, investment, planned expenditure.
  const dP = neg ? 'up'   : 'down';
  const dY = neg ? 'down' : 'up';
  const S = [];

  S.push({ n:1, title:'Cost Shock', market:'cost', kind:'chain',
    chain:[{ v:'Costs', d:dP }, { v:'EP', d:dP }, { v:'P', d:dP }],
    curve:{ c:'SRAS', a: neg ? 'shift-up' : 'shift-down' },
    lead:`Costs ${neg?'rise':'fall'} across the economy. This one hits the supply side first — nothing has happened to spending.` });

  S.push({ n:2, title:'Money Market Impact', market:'money', kind:'chain',
    chain:[{ v:'P', d:dP }, { v:'M/P', d:dY }, { v:'r', d:dP }],
    curve:{ c:'LM', a: neg ? 'shift-up' : 'shift-down' },
    lead:'The price level has moved, so real money balances have moved. Same mechanism as a demand shock — different cause.' });

  S.push({ n:3, title:'Goods Market Impact', market:'goods', kind:'chain',
    chain:[{ v:'r', d:dP }, { v:'I', d:dY }, { v:'PE', d:dY }, { v:'U.I.', d:dP }, { v:'Y', d:dY }],
    curve:{ c:'IS', a: neg ? 'move-YD-rU' : 'move-YU-rD' },
    lead:'IS has not moved — the shock was not to spending. The economy slides along it to the short-run equilibrium.' });

  S.push({ n:4, title:'Short-Run Equilibrium (B)', market:null, kind:'summary',
    chain:[{ v:'Y', d:dY }, { v:'P', d:dP }, { v:'r', d:dP }],
    curve:null,
    lead:`Compare B with A. ${neg?'Output down and prices up at the same time — this is stagflation, and it is what makes supply shocks different from demand shocks.':'Output up and prices down at the same time — the mirror image of stagflation.'}` });

  if(!sh.permanent){
    // §3, "Transition to the Long-run: Temporary cost shock" — everything reverses.
    S.push({ n:5, title:'Costs Return to Normal', market:'cost', kind:'chain',
      chain:[{ v:'Costs', d:dY }, { v:'EP', d:dY }, { v:'P', d:dY }],
      curve:{ c:'SRAS', a: neg ? 'shift-down' : 'shift-up' },
      lead:'The cost shock was temporary. Costs go back to where they started, and SRAS follows them back.' });
    S.push({ n:6, title:'Money Market Response', market:'money', kind:'chain',
      chain:[{ v:'P', d:dY }, { v:'M/P', d:dP }, { v:'r', d:dY }],
      curve:{ c:'LM', a: neg ? 'shift-down' : 'shift-up' },
      lead:'The price level unwinds, so real balances and the interest rate unwind with it.' });
    S.push({ n:7, title:'Goods Market Response', market:'goods', kind:'chain',
      chain:[{ v:'r', d:dY }, { v:'I', d:dP }, { v:'PE', d:dP }, { v:'U.I.', d:dY }, { v:'Y', d:dP }],
      curve:{ c:'IS', a: neg ? 'move-YU-rD' : 'move-YD-rU' },
      lead:'Output slides back along the same IS curve it came down.' });
    S.push({ n:8, title:'Long Run — Back at A', market:null, kind:'summary',
      chain:[{ v:'Y', d:'none' }, { v:'P', d:'none' }, { v:'r', d:'none' }],
      curve:null,
      lead:'Compare the end point with A. A temporary cost shock leaves no permanent trace at all.' });
    return S;
  }

  // Permanent: capacity itself changes, so the economy cannot return to A.
  S.push({ n:5, title:'Productive Capacity', market:'capacity', kind:'chain',
    chain:[{ v:'Ā', d:dY }],
    curve:{ c:'LRAS', a: neg ? 'shift-left' : 'shift-right' },
    lead:`The cost change is permanent: the economy can ${neg?'no longer produce as much':'now produce more'} with the same capital and labor. The natural rate of output itself moves.` });

  S.push({ n:6, title:'Factor Market', market:'factor', kind:'chain',
    carry:true, carryFrom:4,     // the price change established at B (stage 4)
    chain:[{ v:'P', d:dP }, { v:'W/P', d:dY }, { v:'W', d:dP }],
    curve:null,
    lead:'From here the mechanism is the familiar one: the price change has moved the real wage away from the marginal product of labor.' });

  S.push({ n:7, title:'Firm Behavior', market:'firm', kind:'chain',
    chain:[{ v:'W', d:dP }, { v:'EP', d:dP }, { v:'P', d:dP }],
    curve:{ c:'SRAS', a: neg ? 'shift-up' : 'shift-down' },
    lead:'Sticky-price firms reset again, so SRAS moves a second time — now to the position that clears at the NEW natural rate.' });

  S.push({ n:8, title:'Money Market Response', market:'money', kind:'chain',
    chain:[{ v:'P', d:dP }, { v:'M/P', d:dY }, { v:'r', d:dP }],
    curve:{ c:'LM', a: neg ? 'shift-up' : 'shift-down' },
    lead:'The price level moves again, so LM moves again.' });

  S.push({ n:9, title:'Goods Market Response', market:'goods', kind:'chain',
    chain:[{ v:'r', d:dP }, { v:'I', d:dY }, { v:'PE', d:dY }, { v:'U.I.', d:dP }, { v:'Y', d:dY }],
    curve:{ c:'IS', a: neg ? 'move-YD-rU' : 'move-YU-rD' },
    lead:'Output slides along IS to the new natural rate — not back to the old one.' });

  S.push({ n:10, title:'Long Run (C)', market:null, kind:'summary',
    chain:[{ v:'Y', d:dY }, { v:'P', d:dP }, { v:'r', d:dP }],
    curve:null,
    lead:'Compare C with A. This is the one case in the lab where output is permanently different.' });
  return S;
}

// ═══ 6. WHY? ═══════════════════════════════════════════════════════════
function whyText(sh, st){
  if(sh.family === 'supply') return whySupply(sh, st);
  const ex = sh.dir > 0, goods = sh.family === 'goods';
  const up = ex ? '↑' : '↓', dn = ex ? '↓' : '↑';
  const rose = ex ? 'rose' : 'fell', fell = ex ? 'fell' : 'rose';
  const hi = ex ? 'higher' : 'lower', lo = ex ? 'lower' : 'higher';
  switch(st.n){
    case 1: return goods
      ? `A change in G, c₀, I₀, or T changes planned expenditure at every level of income.\n`+
        `• Planned expenditure ${rose}, so firms sell ${ex?'more':'less'} than they produced and unplanned inventories ${fell}.\n`+
        `• Firms respond to that inventory signal by changing production, so Y ${rose}.\n`+
        `• Because this happens at every interest rate, the whole IS curve moves — it is a shift, not a movement along.\n`+
        `• A′ is where the goods market alone would settle, at the OLD interest rate. The money market has not spoken yet.`
      : `A change in M or in money demand changes the money market at every level of income.\n`+
        `• ${sh.pill === 'M' ? `Nominal money ${rose} while P is fixed, so real balances M/P ${rose}.` : `Households want to hold ${ex?'less':'more'} real money at any given income and interest rate.`}\n`+
        `• To clear the money market the interest rate must ${ex?'fall':'rise'}.\n`+
        `• Because this happens at every level of income, the whole LM curve moves — a shift, not a movement along.`;
    case 2: return goods
      ? `Money demand depends on income because money is what you transact with. Higher income means more transactions, so people want to hold more real balances at any interest rate.\n`+
        `• Y ${rose} ⟹ (M/P)ᵈ ${rose}.\n`+
        `• Real balances supplied are fixed (M and P have not changed yet), so the interest rate must ${ex?'rise':'fall'} to bring desired holdings back ${ex?'down':'up'}.\n`+
        `• Nothing shifted LM — we slid along it. That is why A″ sits on the SAME LM curve as A.`
      : `Investment is the interest-sensitive component of spending.\n`+
        `• r ${fell} ⟹ I ${rose} ⟹ planned expenditure ${rose} ⟹ unplanned inventories ${fell} ⟹ Y ${rose}.\n`+
        `• Nothing shifted IS — the shock was in the money market. We slid along IS to A″.`;
    case 3: return `AD is the set of IS–LM equilibria traced out as P varies. The shock changed equilibrium output at every price level, so the whole AD curve moves.\n`+
      `• Why does P then ${ex?'rise':'fall'}? Because not all firms have sticky prices. The flexible-price firms see demand ${ex?'rise':'fall'} and reset price toward P + a(Y − Ȳ).\n`+
      `• The share of firms that are sticky (s) is exactly what makes SRAS upward-sloping rather than flat. If every firm were sticky, P would not move at all in the short run.`;
    case 4: return `Real money balances are M/P. The money supply M has not changed, but P has.\n`+
      `• P ${rose} ⟹ M/P ${fell} ⟹ at any income there is ${ex?'less':'more'} real money to hold ⟹ r must ${ex?'rise':'fall'}.\n`+
      `• This one is a shift: LM is drawn for a given M/P, and M/P is now different. LM(P₁) becomes LM(P₂).\n`+
      `• B is where IS′ meets LM(P₂) and, equivalently, where AD′ meets SRAS. The two panels agree again.`;
    case 5: return `B is a short-run equilibrium, not a long-run one: output is away from Ȳ, and the expected price level EP is still stuck at its old value.\n`+
      (goods
        ? `• A goods-market shock ${ex?'raises':'lowers'} both Y and r on impact, because ${hi} income ${ex?'raises':'lowers'} money demand.`
        : `• A money-market shock ${ex?'raises':'lowers'} Y but ${ex?'LOWERS':'RAISES'} r relative to A — the interest rate is what did the work, so it has to end up on the other side.`)+
      `\n• Nothing here is permanent. The reason it unwinds is that EP is wrong, and stage 6 is where that starts to be corrected.`;
    case 6: return `Workers care about the real wage W/P, not the nominal wage W, because W/P is what their pay buys — and in equilibrium W/P must equal the marginal product of labor, which depends on capital and technology, not on prices.\n`+
      (ex
        ? `• P rose with W fixed ⟹ W/P fell: the price change eroded real pay.\n`+
          `• Workers bargain to restore it, so they demand W ↑. They ask for exactly enough to undo the price change.\n`
        : `• P fell with W fixed ⟹ W/P rose: real pay is now above the marginal product of labor.\n`+
          `• Firms begin to offer lower nominal wages because the real wage is higher than it previously was. The higher than normal unemployment at B means that there are unemployed workers who would be willing to accept lower wages.\n`)+
      `• No curve moves yet. This is the cost ${ex?'pressure':'relief'} that will move SRAS in the next stage.`;
    case 7: return `SRAS is P = EP + a·((1−s)/s)·(Y − Ȳ). Its position is set by EP, the price level sticky-price firms expect when they set prices in advance.\n`+
      `• W ${up} ${ex?'raises':'lowers'} marginal cost, and firms resetting prices build the ${hi} cost and the ${hi} expected price level in: EP ${up}.\n`+
      `• A ${hi} EP shifts the whole SRAS curve ${ex?'up':'down'} — at every level of output, the price level is ${hi}.\n`+
      `• Note this is not a change in Ȳ. Productive capacity is untouched; only expectations moved.`;
    case 8: return `The SRAS shift pushes the price level ${ex?'up again':'down again'}, and the money market responds exactly as it did at stage 4.\n`+
      `• P ${rose} ⟹ M/P ${fell} ⟹ r ${up} ⟹ LM shifts ${ex?'up':'down'} once more, to LM(P₃).\n`+
      `• There is nothing new in the economics here. Recognizing that the SAME mechanism runs twice — once from the AD shift, once from the SRAS shift — is the point of separating stages 4 and 8.`;
    case 9: return `The ${ex?'higher':'lower'} interest rate ${ex?'crowds out':'crowds in'} investment.\n`+
      `• r ${up} ⟹ I ${dn} ⟹ planned expenditure ${dn} ⟹ unplanned inventories ${ex?'rise':'fall'} ⟹ Y ${dn}, back to Ȳ.\n`+
      `• IS′ does not move again. The economy slides along it, so output ${ex?'falls while the interest rate rises':'rises while the interest rate falls'} — that is why ${ex?'"move down along IS"':'"move up along IS"'} is worth stating carefully.`;
    case 10: return goods
      ? `Output is back at Ȳ, so the shock changed nothing real about production. But the interest rate did NOT come back.\n`+
        `• At Y = Ȳ the economy is on IS′, not IS, and IS′ sits ${ex?'further out':'further in'} — so the interest rate that clears the goods market at full employment is permanently ${ex?'higher':'lower'}.\n`+
        `• That is ${ex?'crowding out':'crowding in'}: the composition of output changed permanently even though its level did not.\n`+
        `• P is permanently ${ex?'higher':'lower'} too.`
      : `Output is back at Ȳ and the interest rate is back at its original level. Only the price level changed permanently.\n`+
        `• IS never moved, so at Y = Ȳ the goods market clears at exactly the same r it always did.\n`+
        `• This is monetary neutrality: in the long run a money-market shock changes nominal magnitudes (P) and leaves real ones (Y, r, the composition of output) alone.\n`+
        `• Contrast with a goods-market shock, where r ends up permanently different.`;
  }
  return '';
}

function whySupply(sh, st){
  const neg  = sh.dCost > 0, perm = !!sh.permanent;
  const P    = neg ? '↑' : '↓', Yd = neg ? '↓' : '↑';
  const rose = neg ? 'rose' : 'fell', fell = neg ? 'fell' : 'rose';
  const n = st.n;
  if(n === 1) return `A cost shock hits the supply side, not spending. Nothing has happened to G, T, c₀, I₀, M, or money demand — so IS and AD do not move at all. That is what separates this from every demand shock in the lab.\n`+
    `• Costs ${rose}, so the price firms expect to have to charge ${rose}: EP ${P}.\n`+
    `• SRAS is P = EP + a·((1−s)/s)(Y − Ȳ), and EP is what pins it, so the whole curve shifts ${neg?'up':'down'}.\n`+
    `• At the old level of output firms now need a ${neg?'higher':'lower'} price, so P ${P}.`;
  if(n === 2) return `From here the mechanism is the same one a demand shock uses — the price level has moved, and LM is drawn for a given quantity of real money.\n`+
    `• P ${rose} ⟹ M/P ${fell} (M itself is untouched) ⟹ r must ${neg?'rise':'fall'} to clear the money market ⟹ LM shifts ${neg?'up':'down'}.\n`+
    `• Notice the causation runs backwards from the demand-shock case: there, output moved first and dragged the price level with it. Here the price level moves first.`;
  if(n === 3) return `The interest rate has moved, so investment moves, and output follows.\n`+
    `• r ${P} ⟹ I ${Yd} ⟹ planned expenditure ${Yd} ⟹ unplanned inventories ${neg?'rise':'fall'} ⟹ Y ${Yd}.\n`+
    `• IS has not shifted — the shock never touched planned spending at a given r. The economy slides along the same IS curve it started on.`;
  if(n === 4) return `B is the short-run equilibrium.\n`+
    (neg
      ? `• Output is DOWN and the price level is UP at the same time. That combination is impossible from a demand shock, where Y and P always move together — it is the signature of a supply shock, and the reason stagflation is hard for policy.\n`+
        `• A central bank facing this has no move that fixes both: fighting the inflation pushes output down further, supporting output pushes prices up further.`
      : `• Output is UP and the price level is DOWN at the same time — the mirror image of stagflation, and equally impossible from a demand shock.\n`+
        `• This is the comfortable case: a favorable cost shock improves both halves of the dual mandate at once.`)+
    `\n• Whether B is temporary or permanent is not something the diagram tells you. The scenario does.`;
  if(!perm){
    if(n === 5) return `This shock was temporary — the cost increase reverses.\n`+
      `• Costs ${fell} back to where they started ⟹ EP ${Yd} ⟹ SRAS shifts back ${neg?'down':'up'} to exactly where it began.\n`+
      `• Nothing here required workers or firms to renegotiate anything. The curve returns because its cause went away, not because expectations were corrected.`;
    if(n === 6) return `The price level unwinds, so real balances unwind with it.\n`+
      `• P ${Yd} ⟹ M/P ${neg?'rises':'falls'} back ⟹ r ${Yd} ⟹ LM shifts back ${neg?'down':'up'} to LM(P₁).\n`+
      `• Stage 2 in reverse, for the same reason.`;
    if(n === 7) return `Output slides back along IS to where it started.\n`+
      `• r ${Yd} ⟹ I ${P} ⟹ planned expenditure ${P} ⟹ unplanned inventories ${neg?'fall':'rise'} ⟹ Y ${P}.\n`+
      `• The economy retraces the same IS curve it slid along on the way to B. IS never moved in either direction.`;
    if(n === 8) return `Every curve is back where it started, so the economy is back at A exactly.\n`+
      `• Output Ȳ, the original price level, the original interest rate — no permanent trace at all.\n`+
      `• That is the whole point of calling the shock temporary: productive capacity was never affected, so there is nothing for the long run to remember.`;
    return '';
  }
  if(n === 5) return `This shock is permanent, and that changes the destination. A lasting rise in costs means the economy genuinely cannot produce what it used to with the same capital and labor.\n`+
    `• Ā ${Yd} — total factor productivity ${fell} ⟹ the natural rate of output Ȳ ${Yd} ⟹ LRAS shifts ${neg?'left':'right'}.\n`+
    `• This is the ONLY move in the lab that touches LRAS. Demand shocks and temporary cost shocks never do.\n`+
    `• Note what this does NOT do: it does not move the economy. It moves the target the economy is heading for.`;
  if(n === 6) return `From here the ordinary long-run mechanism takes over, exactly as it does after a demand shock.\n`+
    `• P ${rose} ⟹ W/P ${fell} — the price change moved the real wage away from the marginal product of labor.\n`+
    `• ${neg ? 'Workers bargain to restore it, so they demand W ↑.' : 'Firms begin to offer lower nominal wages, because the real wage is higher than it previously was, and there are workers willing to accept less.'}\n`+
    `• No curve moves at this stage. This is the cost ${neg?'pressure':'relief'} that moves SRAS next.`;
  if(n === 7) return `SRAS moves a second time — and this is a different move from stage 1.\n`+
    `• Stage 1 was the cost shock itself. This one is expectations catching up: W ${P} ⟹ EP ${P} ⟹ SRAS shifts ${neg?'up':'down'} again.\n`+
    `• It stops when SRAS, AD, and the NEW LRAS all meet — at the new natural rate of output, not the old one.`;
  if(n === 8) return `The price level has moved again, so the money market responds again.\n`+
    `• P ${rose} ⟹ M/P ${fell} ⟹ r ${P} ⟹ LM shifts ${neg?'up':'down'} to LM(P₃).\n`+
    `• Third time this mechanism has run in one scenario. Recognizing it is most of what the worksheet is training.`;
  if(n === 9) return `Output slides along IS to the new natural rate.\n`+
    `• r ${P} ⟹ I ${Yd} ⟹ planned expenditure ${Yd} ⟹ unplanned inventories ${neg?'rise':'fall'} ⟹ Y ${Yd}.\n`+
    `• It does NOT stop at the old Ȳ. It stops at the new one, because that is where LRAS is now.`;
  if(n === 10) return `Compare C with A — this is the one shock in the lab that changes output permanently.\n`+
    `• Y is permanently ${neg?'lower':'higher'}: capacity itself changed, and no amount of price or wage adjustment restores it.\n`+
    `• P is permanently ${neg?'higher':'lower'}, and r is permanently ${neg?'higher':'lower'} — with IS fixed, a ${neg?'lower':'higher'} level of output means a ${neg?'higher':'lower'} interest rate clears the goods market.\n`+
    `• Contrast all three demand shocks and the temporary cost shock, where output always returns to where it started. Only a change in capacity moves the long-run level of output.`;
  return '';
}

// ═══ 7. SCENARIOS ══════════════════════════════════════════════════════
const SCEN = [
  // ── G↑ ───────────────────────────────────────────────────────────────
  { k:'G_up', src:'Congress',      head:'Emergency infrastructure package approved',   brief:'Federal agencies increase purchases of construction materials and equipment.' },
  { k:'G_up', src:'Defense Dept.', head:'Defense procurement expanded this quarter',   brief:'The government buys more goods and contracted services.' },
  { k:'G_up', src:'FEMA',          head:'Disaster response ramps up purchasing',       brief:'Federal purchases rise for logistics and reconstruction.' },
  { k:'G_up', src:'State & Local', head:'State public works projects accelerate',      brief:'Public purchases rise as shovel-ready projects move forward.' },
  { k:'G_up', src:'Policy Desk',   head:'Equipment replacement cycle pulled forward',  brief:'Government purchases of equipment increase.' },
  { k:'G_up', src:'Public Sector', head:'Education agencies expand service contracts', brief:'Government purchases of services increase.' },
  // ── G↓ ───────────────────────────────────────────────────────────────
  { k:'G_dn', src:'OMB',           head:'Budget directive freezes new federal contracts', brief:'Federal purchases fall as agencies delay procurement.' },
  { k:'G_dn', src:'Congress',      head:'Spending caps trigger across-agency cuts',    brief:'Government reduces purchases to meet budget targets.' },
  { k:'G_dn', src:'Policy Desk',   head:'Continuing resolution delays agency spending', brief:'Procurement is postponed and purchases fall.' },
  { k:'G_dn', src:'Public Sector', head:'Infrastructure pipeline paused indefinitely', brief:'Government slows purchases of materials and services.' },
  { k:'G_dn', src:'State & Local', head:'States pause public works contracts',         brief:'State and local purchases decline this quarter.' },
  { k:'G_dn', src:'Policy Desk',   head:'Reconstruction spending winds down',          brief:'Government purchases fall as emergency programs end.' },
  // ── c₀↑ ──────────────────────────────────────────────────────────────
  { k:'C_up', src:'Household Survey', head:'Consumer confidence surges; spending rebounds', brief:'Households spend more at every level of income.' },
  { k:'C_up', src:'Markets',          head:'Household wealth rises after market rally',     brief:'Autonomous consumption rises as households feel better off.' },
  { k:'C_up', src:'Retail Pulse',     head:'Pent-up demand lifts services and retail',      brief:'Consumers spend more than their income alone would predict.' },
  { k:'C_up', src:'Household Survey', head:'Uncertainty eases; precautionary saving falls', brief:'Autonomous consumption rises.' },
  { k:'C_up', src:'Retail Pulse',     head:'Durable goods purchases surge',                 brief:'Households raise consumption at any given income.' },
  { k:'C_up', src:'Household Survey', head:'Improved job prospects boost planned spending', brief:'Autonomous consumption rises.' },
  // ── c₀↓ ──────────────────────────────────────────────────────────────
  { k:'C_dn', src:'Household Survey', head:'Consumer sentiment drops sharply',          brief:'Households cut spending at every level of income.' },
  { k:'C_dn', src:'Household Survey', head:'Precautionary saving rises on job fears',    brief:'Autonomous consumption falls.' },
  { k:'C_dn', src:'Credit Conditions',head:'Delinquencies climb; households tighten up', brief:'Consumers pull back on spending.' },
  { k:'C_dn', src:'Markets',          head:'Negative wealth shock hits portfolios',      brief:'Households cut consumption as wealth falls.' },
  { k:'C_dn', src:'Retail Pulse',     head:'Households delay major purchases',           brief:'Autonomous consumption falls this quarter.' },
  { k:'C_dn', src:'Household Survey', head:'Spending intentions decline broadly',        brief:'Consumption falls at any given income.' },
  // ── I₀↑ ──────────────────────────────────────────────────────────────
  { k:'I_up', src:'Business Pulse',     head:'Firms expand capacity; equipment orders jump', brief:'Autonomous investment rises.' },
  { k:'I_up', src:'Business Pulse',     head:'Tech upgrade cycle accelerates',               brief:'Firms raise investment in equipment and software.' },
  { k:'I_up', src:'Construction Watch', head:'Housing starts rise sharply',                  brief:'Residential investment increases.' },
  { k:'I_up', src:'Business Pulse',     head:'Factory expansions announced across sectors',  brief:'Investment spending rises at any interest rate.' },
  { k:'I_up', src:'Construction Watch', head:'Commercial construction picks up',             brief:'Investment increases as projects break ground.' },
  { k:'I_up', src:'Business Pulse',     head:'Capacity constraints spur new projects',       brief:'Firms approve more capital projects.' },
  // ── I₀↓ ──────────────────────────────────────────────────────────────
  { k:'I_dn', src:'Business Pulse',     head:'Firms postpone projects amid uncertainty',  brief:'Capital spending is delayed and investment falls.' },
  { k:'I_dn', src:'Credit Conditions',  head:'Lending standards tighten; capex delayed',  brief:'Investment declines as financing gets harder.' },
  { k:'I_dn', src:'Construction Watch', head:'Commercial construction slows',             brief:'Investment falls as projects are shelved.' },
  { k:'I_dn', src:'Business Pulse',     head:'Earnings slump; capital budgets cut',       brief:'Firms reduce investment spending.' },
  { k:'I_dn', src:'Business Pulse',     head:'Demand outlook weakens; expansion scrapped', brief:'Firms cut back on investment.' },
  { k:'I_dn', src:'Construction Watch', head:'Residential building slows nationwide',     brief:'Residential investment declines.' },
  // ── T↓ ───────────────────────────────────────────────────────────────
  { k:'T_dn', src:'Policy Desk', head:'Tax cut takes effect; withholding falls', brief:'Households keep more of each dollar of income.' },
  { k:'T_dn', src:'Policy Desk', head:'Payroll tax holiday announced',           brief:'Take-home pay rises for most workers.' },
  { k:'T_dn', src:'Policy Desk', head:'Child tax credit expansion begins',       brief:'Net taxes paid by households decline.' },
  { k:'T_dn', src:'Policy Desk', head:'Standard deduction raised',               brief:'Typical households owe less tax.' },
  { k:'T_dn', src:'Policy Desk', head:'Rebate checks issued to households',      brief:'Effective net taxes fall this period.' },
  { k:'T_dn', src:'Policy Desk', head:'Tax relief package extended',             brief:'Households face lower tax payments.' },
  // ── T↑ ───────────────────────────────────────────────────────────────
  { k:'T_up', src:'Policy Desk', head:'Tax surcharge enacted to reduce deficits', brief:'The household tax burden rises.' },
  { k:'T_up', src:'Policy Desk', head:'Payroll tax rate increases',               brief:'After-tax income falls for most workers.' },
  { k:'T_up', src:'Policy Desk', head:'Temporary credits sunset',                 brief:'Net taxes rise as credits expire.' },
  { k:'T_up', src:'Policy Desk', head:'State tax hikes take effect',              brief:'Household tax payments rise.' },
  { k:'T_up', src:'Policy Desk', head:'Withholding tables revised upward',        brief:'Paychecks shrink as withholding rises.' },
  { k:'T_up', src:'Policy Desk', head:'New surtax on high earners begins',        brief:'The net tax burden rises.' },
  // ── M↑ (open-market operations, reserves, balance sheet) ─────────────
  { k:'M_up', src:'Open-Market Desk', head:'Open-market purchases expand bank reserves', brief:'The Fed buys Treasuries, injecting reserves and raising M.' },
  { k:'M_up', src:'Federal Reserve',  head:'Large-scale asset purchase program begins',  brief:'Balance-sheet expansion raises the nominal money supply.' },
  { k:'M_up', src:'Federal Reserve',  head:'Reserve requirements cut',                   brief:'Banks can lend more of each deposit; the money supply expands.' },
  { k:'M_up', src:'Open-Market Desk', head:'Repo operations scaled up',                  brief:'The Desk adds reserves to the banking system; M rises.' },
  { k:'M_up', src:'Federal Reserve',  head:'Emergency liquidity facility activated',     brief:'Reserves are injected into the banking system and M rises.' },
  { k:'M_up', src:'Open-Market Desk', head:'Coupon-pass operation injects liquidity',    brief:'Outright purchases expand reserves and the money supply.' },
  // ── M↓ ───────────────────────────────────────────────────────────────
  { k:'M_dn', src:'Federal Reserve',  head:'Balance-sheet runoff begins',              brief:'Maturing assets are not replaced; reserves and M shrink.' },
  { k:'M_dn', src:'Open-Market Desk', head:'Open-market sales drain bank reserves',    brief:'The Desk sells Treasuries; reserves and the money supply fall.' },
  { k:'M_dn', src:'Federal Reserve',  head:'Reserve requirements raised',              brief:'Banks must hold more reserves; the money supply contracts.' },
  { k:'M_dn', src:'Federal Reserve',  head:'Quantitative tightening accelerates',      brief:'Faster asset roll-off shrinks the money supply.' },
  { k:'M_dn', src:'Open-Market Desk', head:'Repo operations wound down',               brief:'Liquidity is withdrawn; the money supply falls.' },
  { k:'M_dn', src:'Federal Reserve',  head:'Liquidity facilities allowed to expire',   brief:'Reserves return to the Fed; M contracts.' },
  // ── (M/P)ᵈ↓ (payment technology, liquidity preference) ───────────────
  { k:'MD_dn', src:'Payments Watch',   head:'Instant-settlement network goes live',        brief:'Households and firms can transact holding less cash.' },
  { k:'MD_dn', src:'Payments Watch',   head:'Contactless payment adoption hits new high',  brief:'Money demand falls at any income and interest rate.' },
  { k:'MD_dn', src:'Banking Monitor',  head:'Cash-management software sweeps balances',    brief:'Firms economise on the real balances they hold.' },
  { k:'MD_dn', src:'Household Survey', head:'Precautionary cash holding falls as fear eases', brief:'Households want to hold less real money.' },
  { k:'MD_dn', src:'Markets',          head:'Investors rotate out of money funds',         brief:'Liquidity preference declines; money demand falls.' },
  { k:'MD_dn', src:'Payments Watch',   head:'Real-time payroll shortens the pay cycle',    brief:'Less money is needed to bridge income and spending.' },
  // ── (M/P)ᵈ↑ ──────────────────────────────────────────────────────────
  { k:'MD_up', src:'Markets',          head:'Flight to safety drives cash hoarding',      brief:'Money demand rises at any income and interest rate.' },
  { k:'MD_up', src:'Household Survey', head:'Precautionary cash balances build up',       brief:'Households want to hold more real money.' },
  { k:'MD_up', src:'Payments Watch',   head:'Card network outage pushes users to cash',   brief:'Transactions require larger money holdings.' },
  { k:'MD_up', src:'Banking Monitor',  head:'Firms rebuild liquidity buffers',            brief:'Businesses hold more real balances at any interest rate.' },
  { k:'MD_up', src:'Markets',          head:'Liquidity preference jumps amid volatility',  brief:'Money demand rises sharply.' },
  { k:'MD_up', src:'Household Survey', head:'Households delay deposits into illiquid accounts', brief:'Desired real money holdings increase.' },

  // ── Cost shocks. Every brief states plainly whether the change reverses or
  //    lasts, because that — not the diagram — is what decides where C ends up.
  // ── Costs↑, temporary ────────────────────────────────────────────────
  { k:'S_up_T', src:'Energy Desk',      head:'Pipeline outage spikes fuel prices',            brief:'Input costs jump economy-wide. Repairs are already under way and prices are expected back to normal within the year — a TEMPORARY cost shock.' },
  { k:'S_up_T', src:'Commodities',      head:'Drought lifts food and feed prices',            brief:'Production costs rise across the economy. Forecasters expect a normal harvest next season, so this is a TEMPORARY cost shock.' },
  { k:'S_up_T', src:'Supply Chain',     head:'Port strike raises shipping costs',             brief:'Freight costs jump for every importer. The dispute is expected to settle shortly — a TEMPORARY cost shock.' },
  { k:'S_up_T', src:'Energy Desk',      head:'Cold snap drives a spike in natural gas',       brief:'Energy costs rise sharply this quarter. The spike is weather-driven and will unwind — a TEMPORARY cost shock.' },
  { k:'S_up_T', src:'Commodities',      head:'Shipping lane closure lifts input prices',      brief:'Costs rise while cargo is rerouted. The lane reopens next quarter, so this is a TEMPORARY cost shock.' },
  { k:'S_up_T', src:'Supply Chain',     head:'Chip shortage raises manufacturing costs',      brief:'Input costs rise across industry. New capacity comes online within the year — a TEMPORARY cost shock.' },
  // ── Costs↑, permanent ────────────────────────────────────────────────
  { k:'S_up_P', src:'Policy Desk',      head:'Permanent emissions standard raises unit costs', brief:'Firms must retrofit and operate cleaner processes indefinitely. Productive capacity is permanently reduced — a PERMANENT cost shock.' },
  { k:'S_up_P', src:'Resources',        head:'Richest ore bodies exhausted',                   brief:'Extraction shifts permanently to lower-grade deposits, raising costs for good — a PERMANENT cost shock.' },
  { k:'S_up_P', src:'Labor Desk',      head:'Lasting decline in the working-age population',  brief:'The economy can produce less with the capital it has, permanently — a PERMANENT cost shock.' },
  { k:'S_up_P', src:'Policy Desk',      head:'Permanent tariff regime on key inputs',          brief:'Imported inputs cost more indefinitely and cannot be substituted away — a PERMANENT cost shock.' },
  { k:'S_up_P', src:'Resources',        head:'Aquifer depletion forces costlier water supply', brief:'Industrial and agricultural costs rise permanently — a PERMANENT cost shock.' },
  { k:'S_up_P', src:'Infrastructure',   head:'Earthquake destroys part of the capital stock',  brief:'Productive capacity is permanently smaller and costs are permanently higher — a PERMANENT cost shock.' },
  // ── Costs↓, temporary ────────────────────────────────────────────────
  { k:'S_dn_T', src:'Energy Desk',      head:'Mild winter pushes energy prices down',          brief:'Input costs fall this quarter. The weather effect will reverse next season — a TEMPORARY cost shock.' },
  { k:'S_dn_T', src:'Commodities',      head:'Record harvest cuts food and feed costs',        brief:'Production costs fall economy-wide. Yields are expected back to trend next year — a TEMPORARY cost shock.' },
  { k:'S_dn_T', src:'Supply Chain',     head:'Freight rates collapse as backlogs clear',       brief:'Shipping costs drop sharply. Rates are expected to normalize — a TEMPORARY cost shock.' },
  { k:'S_dn_T', src:'Energy Desk',      head:'Producers flood the market with crude',          brief:'Fuel costs fall for every firm. The output surge is a short-term price war — a TEMPORARY cost shock.' },
  { k:'S_dn_T', src:'Commodities',      head:'Metal prices slide on inventory release',        brief:'Input costs fall while stockpiles are drawn down. Stocks will be rebuilt — a TEMPORARY cost shock.' },
  { k:'S_dn_T', src:'Supply Chain',     head:'Backlogs clear and expedite fees disappear',     brief:'Firms stop paying rush premiums this quarter. Normal fees return later — a TEMPORARY cost shock.' },
  // ── Costs↓, permanent ────────────────────────────────────────────────
  { k:'S_dn_P', src:'Technology',       head:'Process breakthrough cuts production costs',     brief:'A new method lowers unit costs for good and raises what the economy can produce — a PERMANENT cost shock.' },
  { k:'S_dn_P', src:'Technology',       head:'Automation raises output per worker for good',   brief:'Productivity rises permanently across industries — a PERMANENT cost shock.' },
  { k:'S_dn_P', src:'Resources',        head:'Major new low-cost energy field enters service',  brief:'Energy costs fall permanently and capacity rises — a PERMANENT cost shock.' },
  { k:'S_dn_P', src:'Policy Desk',      head:'Permanent removal of input tariffs',             brief:'Imported inputs are permanently cheaper, raising productive capacity — a PERMANENT cost shock.' },
  { k:'S_dn_P', src:'Labor Desk',      head:'Lasting expansion of the skilled workforce',     brief:'The economy can produce more with the same capital, permanently — a PERMANENT cost shock.' },
  { k:'S_dn_P', src:'Infrastructure',   head:'New freight corridor permanently cuts haulage',  brief:'Transport costs fall for good and capacity rises — a PERMANENT cost shock.' },
];

// ═══ 8. STATE ══════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
const clamp = (x,lo,hi) => Math.max(lo, Math.min(hi, x));
const lerp  = (a,b,t) => a + (b-a)*t;
const f2    = v => Number(v).toFixed(2);
const pct   = v => (Number(v)*100).toFixed(2) + '%';
const ARROW = d => d === 'up' ? '↑' : d === 'down' ? '↓' : '—';

let _rng = null, _fs = 1;
let _queue = [], _scenIdx = -1, _scen = null, _sh = null, _path = null, _stages = null;
let _stageIdx = 0, _stage = null, _st = null;
let _revealStage = 0;               // highest fully-revealed stage (0 = at A)
let _anim = null;                   // {stage, t}
let _firstScore = 0, _finalScore = 0, _stagesRecorded = 0;
let _kbPill = null;

// ═══ 9. SCENARIO QUEUE ═════════════════════════════════════════════════
function shufflePool(){
  const rand = _rng || Math.random;
  const pool = SCEN.slice();
  for(let i = pool.length - 1; i > 0; i--){
    const j = Math.floor(rand() * (i + 1));
    const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
  }
  return pool;
}
function nextFromQueue(prev){
  if(_queue.length === 0){
    _queue = shufflePool();
    if(prev && _queue[0] === prev && _queue.length > 1){
      const t = _queue[0]; _queue[0] = _queue[1]; _queue[1] = t;
    }
  }
  return _queue.shift();
}
function makeStamp(){
  const rand = _rng || Math.random;
  const days = ['Mon','Tue','Wed','Thu','Fri'];
  const mns  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d = days[Math.floor(rand()*days.length)];
  const m = mns[Math.floor(rand()*mns.length)];
  return `${d} ${m} ${1+Math.floor(rand()*28)}, ${7+Math.floor(rand()*6)}:${rand()<0.5?'00':'30'} AM`;
}

// ═══ 10. DOM ═══════════════════════════════════════════════════════════
const els = {
  newBtn:$('newBtn'), resetBtn:$('resetBtn'),
  counterText:$('counterText'), scoreReadout:$('scoreReadout'),
  scenStamp:$('scenStamp'), scenHead:$('scenHead'),
  scenBrief:$('scenBrief'), scenSteps:$('scenSteps'),
  railNow:$('railNow'), railTotal:$('railTotal'), railA:$('railA'), railB:$('railB'),
  railHdrA:$('railHdrA'), railHdrB:$('railHdrB'),
  stageTitle:$('stageTitle'), stageMeta:$('stageMeta'), stageLead:$('stageLead'),
  chain:$('chain'), stepCount:$('stepCount'),
  terminal:$('terminal'), terminalHdr:$('terminalHdr'),
  curveSel:$('curveSel'), actionSel:$('actionSel'),
  poolWrap:$('poolWrap'), poolHdr:$('poolHdr'), pool:$('pool'),
  checkBtn:$('checkBtn'), nextBtn:$('nextBtn'), animBtn:$('animBtn'),
  showBtn:$('showBtn'), whyBtn:$('whyBtn'), clearBtn:$('clearBtn'),
  mechBadge:$('mechBadge'), mechMsg:$('mechMsg'),
  eqBody:$('eqBody'),
  figCanvas:$('figCanvas'), islmDesc:$('islmDesc'), asadDesc:$('asadDesc'),
};

// ═══ 11. FIGURE ════════════════════════════════════════════════════════
const RY = { min:78,  max:126  };   // output
const RR = { min:0,   max:0.16 };   // interest rate
const RP = { min:86,  max:118  };   // price level
const C_BASE = '#2f5d7c', C_NEW = '#155c38', C_REF = '#374151', C_GUIDE = '#8c4800';

function setupCanvas(canvas){
  const wrap = canvas.parentNode;
  const dpr = window.devicePixelRatio || 1;
  const rect = wrap.getBoundingClientRect();
  const W = Math.round(rect.width * dpr), H = Math.round(rect.height * dpr);
  if(!W || !H) return null;
  if(canvas.width !== W || canvas.height !== H){ canvas.width = W; canvas.height = H; }
  return { ctx: canvas.getContext('2d'), dpr, W, H };
}
function niceStep(span){
  const raw = span/5, pow = Math.pow(10, Math.floor(Math.log10(raw))), n = raw/pow;
  return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10) * pow;
}
function strokeLine(ctx,x1,y1,x2,y2,color,width,dpr,dash){
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = width*dpr;
  ctx.setLineDash((dash||[]).map(d => d*dpr));
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  ctx.restore();
}
function drawDot(ctx,x,y,color,r,dpr){
  ctx.save();
  ctx.fillStyle = color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5*dpr;
  ctx.beginPath(); ctx.arc(x,y,r*dpr,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function ringDot(ctx,x,y,color,dpr){
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 2*dpr;
  ctx.beginPath(); ctx.arc(x,y,9*dpr,0,Math.PI*2); ctx.stroke();
  ctx.restore();
}
// Text with a white halo so it stays legible over curves and gridlines.
function haloText(ctx,x,y,text,color,dpr,size,weight,align,baseline){
  ctx.save();
  ctx.font = `${weight||800} ${Math.round((size||11)*dpr*_fs)}px "Inter",sans-serif`;
  ctx.textAlign = align || 'left'; ctx.textBaseline = baseline || 'middle';
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5*dpr; ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
  ctx.restore();
}
function clipRect(ctx,pl){
  ctx.save(); ctx.beginPath();
  ctx.rect(pl.l, pl.t, pl.r - pl.l, pl.b - pl.t); ctx.clip();
}
const unclip = ctx => ctx.restore();

function drawPanel(ctx, pl, dpr, xr, yr, o){
  const PW = pl.r - pl.l, PH = pl.b - pl.t;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(pl.l, pl.t, PW, PH);
  const X = v => pl.l + (v - xr.min)/(xr.max - xr.min)*PW;
  const Y = v => pl.b - (v - yr.min)/(yr.max - yr.min)*PH;

  ctx.strokeStyle = '#e7dfd2'; ctx.lineWidth = 1*dpr;
  ctx.fillStyle = '#596878';
  ctx.font = `400 ${Math.round(9*dpr*_fs)}px "Inter",sans-serif`;

  const ys = niceStep(yr.max - yr.min);
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for(let v = Math.ceil(yr.min/ys)*ys; v <= yr.max + 1e-9; v += ys){
    const py = Y(v);
    ctx.beginPath(); ctx.moveTo(pl.l, py); ctx.lineTo(pl.r, py); ctx.stroke();
    ctx.fillText(o.yFmt ? o.yFmt(v) : String(Math.round(v)), pl.l - 4*dpr, py);
  }
  const xs = niceStep(xr.max - xr.min);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for(let v = Math.ceil(xr.min/xs)*xs; v <= xr.max + 1e-9; v += xs){
    const px = X(v);
    ctx.beginPath(); ctx.moveTo(px, pl.t); ctx.lineTo(px, pl.b); ctx.stroke();
    if(o.xNums) ctx.fillText(String(Math.round(v)), px, pl.b + 4*dpr);
  }
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1.2*dpr;
  ctx.beginPath();
  ctx.moveTo(pl.l, pl.t); ctx.lineTo(pl.l, pl.b); ctx.lineTo(pl.r, pl.b);
  ctx.stroke();

  ctx.fillStyle = '#374151';
  ctx.font = `700 ${Math.round(9.5*dpr*_fs)}px "Inter",sans-serif`;
  if(o.xLabel){
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(o.xLabel, pl.l + PW/2, pl.b + 26*dpr);
  }
  if(o.yLabel){
    ctx.save();
    ctx.translate(pl.l - 30*dpr, pl.t + PH/2); ctx.rotate(-Math.PI/2);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(o.yLabel, 0, 0);
    ctx.restore();
  }
  ctx.fillStyle = C_BASE;
  ctx.font = `800 ${Math.round(10*dpr*_fs)}px "Inter",sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(o.title, pl.l, pl.t - 5*dpr);
  return { X, Y };
}

// Progress of stage n: 1 if already revealed, the eased tween while animating.
function prog(n){
  if(_revealStage >= n) return 1;
  if(_anim && _anim.stage === n) return _anim.t;
  return 0;
}

// Everything the figure needs, normalized into one "scene" so that demand
// shocks (which move IS/LM/AD) and cost shocks (which move SRAS and, when
// permanent, LRAS) can share a single draw routine.
const animIs = n => !!(_anim && _anim.stage === n);

function buildScene(){
  if(!_path) return null;
  return _sh.family === 'supply' ? sceneSupply() : sceneDemand();
}

function sceneDemand(){
  const P = _path, s0 = P.s0, s1 = P.s1, goods = _sh.family === 'goods';
  const p1=prog(1), p2=prog(2), p3=prog(3), p4=prog(4);
  const p7=prog(7), p8=prog(8), p9=prog(9);
  const p3a = clamp(p3*2, 0, 1), p3b = clamp(p3*2 - 1, 0, 1);

  // IS moves only for a goods shock, only at stage 1.
  const Ac_t = goods ? lerp(Acoef(s0), Acoef(s1), p1) : Acoef(s0);
  // LM moves for a money shock at stage 1, and with P at stages 4 and 8.
  const M_t  = goods ? s0.M  : lerp(s0.M,  s1.M,  p1);
  const md_t = goods ? s0.md : lerp(s0.md, s1.md, p1);
  const Plm  = p8>0 ? lerp(P.P2, P.P3, p8) : p4>0 ? lerp(PBASE, P.P2, p4) : PBASE;
  const lmAt = (M,md,Pv) => Y => (md + L0*Y - M/Pv)/L1;

  const lms = [{ rOf: lmAt(s0.M, s0.md, PBASE), label:'LM(P₁)', style:'base' }];
  if(!goods && p1>0)
    lms.push({ rOf: lmAt(M_t, md_t, PBASE), label:'LM′(P₁)', style:'new', moving:animIs(1) });
  if(p8>0)  // keep LM(P₂) faintly on screen behind LM(P₃)
    lms.push({ rOf: lmAt(s1.M, s1.md, P.P2), label:'', style:'ghost' });
  if(p4>0)
    lms.push({ rOf: lmAt(s1.M, s1.md, Plm), label: p8>0?'LM(P₃)':'LM(P₂)',
               style:'new', moving: animIs(4)||animIs(8) });

  const aAD  = lerp(alphaOf(s0), alphaOf(s1), p3a);
  const bAD  = lerp(betaOf(s0),  betaOf(s1),  p3a);
  const srasC = cFromEP(lerp(EPBASE, P.EP3, p7));

  const dAp  = goods ? { Y:(Ac_t - I1*P.A.r)/(1-MPC), r:P.A.r }
                     : { Y:YBAR, r:lmAt(M_t, md_t, PBASE)(YBAR) };
  // Stage 2 is a movement ALONG a curve, so the dot travels A → A″ rather than
  // A′ → A″: for a goods shock both A and A″ sit on LM(P₁), and for a money
  // shock both sit on IS, so this traces the curve named in the answer. A′ is a
  // waypoint off that curve — where one market alone would settle — and stays
  // drawn where stage 1 left it. Both curves are straight lines, so a linear
  // interpolation of (Y, r) rides them exactly.
  const dApp = { Y:lerp(P.A.Y, P.App.Y, p2), r:lerp(P.A.r, P.App.r, p2) };
  const YB_t = alphaOf(s1) + betaOf(s1)/lerp(PBASE, P.P2, p4);
  const dB   = { Y:YB_t, r:rIS(s1, YB_t) };
  const YC_t = lerp(P.B.Y, YBAR, p9);
  const dC   = { Y:YC_t, r:rIS(s1, YC_t) };
  const aApp = { Y:aAD + bAD/PBASE, P:PBASE };
  const PB_t = lerp(PBASE, P.P2, p3b);
  const aB   = { Y:alphaOf(s1) + betaOf(s1)/PB_t, P:PB_t };
  const PC_t = adSrasPc(s1, srasC);
  const aC   = { Y:Yad(s1, PC_t), P:PC_t };

  const ringB = _revealStage === 5 || animIs(5), ringC = _revealStage >= 10;
  return {
    s0, ybar:YBAR, ybarOld:null,
    isBase: Y => rIS(s0, Y),
    isNew: (goods && p1>0) ? (Y => (Ac_t - (1-MPC)*Y)/I1) : null,
    isNewLabel:'IS′', isNewMoving:animIs(1),
    lms,
    adBase:{ a:alphaOf(s0), b:betaOf(s0) },
    adNew: p3>0 ? { a:aAD, b:bAD } : null, adNewLabel:'AD′', adNewMoving:animIs(3),
    srasBase: cFromEP(EPBASE),
    srasNew: p7>0 ? srasC : null, srasNewLabel:'SRAS′', srasNewMoving:animIs(7),
    islmDots:[
      { pt:P.A,  label:'A', color:C_BASE, show:true },
      { pt:dAp,  label:p1>=1?'A′':'', color:C_NEW, show:p1>0 },
      { pt:dApp, label:p2>=1?'A″':'', color:C_NEW, show:p2>0 },
      { pt:dB,   label:p4>=1?'B':'',  color:C_NEW, show:p4>0,  big:true, ring:ringB },
      { pt:dC,   label:p9>=1?'C':'',  color:C_NEW, show:p9>0,  big:true, ring:ringC },
    ],
    asadDots:[
      { pt:{Y:YBAR,P:PBASE}, label:'A', color:C_BASE, show:true },
      { pt:aApp, label:p3a>=1?'A″':'', color:C_NEW, show:p3>0 },
      { pt:aB,   label:p3b>=1?'B':'',  color:C_NEW, show:p3b>0, big:true, ring:ringB },
      { pt:aC,   label:p7>=1?'C':'',   color:C_NEW, show:p7>0,  big:true, ring:ringC },
    ],
    liveIS: p9>0?dC : p4>0?dB : p2>0?dApp : p1>0?dAp : P.A,
    liveAD: p7>0?aC : p3b>0?aB : p3>0?aApp : { Y:YBAR, P:PBASE },
    factorCallout: _revealStage === 6 || animIs(6),
    calloutPUp: _sh.dir > 0,
  };
}

function sceneSupply(){
  const P = _path, s0 = P.s0, perm = !!_sh.permanent;
  const p1=prog(1), p2=prog(2), p3=prog(3);
  const p5=prog(5), p6=prog(6), p7=prog(7), p8=prog(8), p9=prog(9);
  const endStage = perm ? 10 : 8;

  // SRAS jumps at stage 1, then either reverts (temporary, stage 5) or moves
  // again to the position that clears at the new natural rate (permanent, 7).
  let sc = lerp(P.sras0, P.sras2, p1), scMoving = animIs(1);
  if(perm){ if(p7>0){ sc = lerp(P.sras2, P.sras3, p7); scMoving = animIs(7); } }
  else    { if(p5>0){ sc = lerp(P.sras2, P.sras0, p5); scMoving = animIs(5); } }
  const srasAway = Math.abs(sc - P.sras0) > 1e-9;

  // LRAS moves only when capacity itself changes.
  const ybar = (perm && p5>0) ? lerp(P.ybar0, P.ybar1, p5) : P.ybar0;

  const lmAt = Pv => Y => (s0.md + L0*Y - s0.M/Pv)/L1;
  const lms  = [{ rOf: lmAt(PBASE), label:'LM(P₁)', style:'base' }];
  let lmP = PBASE, lmShow = false, lmLabel = 'LM(P₂)', lmMoving = false;
  if(perm){
    if(p8>0){ lmP = lerp(P.P2, P.P3, p8); lmShow = true; lmLabel = 'LM(P₃)'; lmMoving = animIs(8);
              lms.push({ rOf: lmAt(P.P2), label:'', style:'ghost' }); }
    else if(p2>0){ lmP = lerp(PBASE, P.P2, p2); lmShow = true; lmMoving = animIs(2); }
  } else {
    // On the way back LM lands exactly on LM(P₁); once there, stop drawing a
    // second curve on top of it.
    if(p6>0){ lmP = lerp(P.P2, PBASE, p6); lmShow = Math.abs(lmP - PBASE) > 1e-9; lmMoving = animIs(6); }
    else if(p2>0){ lmP = lerp(PBASE, P.P2, p2); lmShow = true; lmMoving = animIs(2); }
  }
  if(lmShow) lms.push({ rOf: lmAt(lmP), label:lmLabel, style:'new', moving:lmMoving });

  // The AS–AD point is always AD ∩ SRAS; the IS–LM point slides along IS.
  const liveP = adSrasPc(s0, sc), liveY = Yad(s0, liveP);
  const aB    = p1 < 1 ? { Y:liveY, P:liveP } : { Y:P.B.Y, P:P.B.P };
  const aEnd  = { Y:liveY, P:liveP };
  const aEndShow = perm ? p7>0 : p5>0;

  const isY  = p3 < 1 ? lerp(YBAR, P.B.Y, p3) : P.B.Y;
  const dB   = { Y:isY, r:rIS(s0, isY) };
  const endP = perm ? p9 : p7;
  const endY = perm ? lerp(P.B.Y, P.ybar1, p9) : lerp(P.B.Y, YBAR, p7);
  const dEnd = { Y:endY, r:rIS(s0, endY) };

  const ringB = _revealStage === 4 || animIs(4);
  const ringC = _revealStage >= endStage;
  return {
    s0, ybar, ybarOld: (perm && p5>0) ? P.ybar0 : null, lrasMoving: perm && animIs(5),
    isBase: Y => rIS(s0, Y), isNew:null,
    lms,
    adBase:{ a:alphaOf(s0), b:betaOf(s0) }, adNew:null,
    srasBase: P.sras0,
    srasNew: srasAway ? sc : null,
    srasNewLabel: (perm && p7>0) ? 'SRAS″' : 'SRAS′',
    srasNewMoving: scMoving,
    islmDots:[
      { pt:P.A,  label:'A', color:C_BASE, show:true },
      { pt:dB,   label:p3>=1?'B':'', color:C_NEW, show:p3>0, big:true, ring:ringB },
      { pt:dEnd, label:(perm && p9>=1)?'C':'', color:C_NEW, show:endP>0, big:true, ring:ringC },
    ],
    asadDots:[
      { pt:{Y:YBAR,P:PBASE}, label:'A', color:C_BASE, show:true },
      { pt:aB,   label:p1>=1?'B':'', color:C_NEW, show:p1>0, big:true, ring:ringB },
      { pt:aEnd, label:(perm && p7>=1)?'C':'', color:C_NEW, show:aEndShow, big:true, ring:ringC },
    ],
    liveIS: endP>0 ? dEnd : p3>0 ? dB : P.A,
    liveAD: aEndShow ? aEnd : p1>0 ? aB : { Y:YBAR, P:PBASE },
    factorCallout: perm && (_revealStage === 6 || animIs(6)),
    calloutPUp: P.sras2 > P.sras0,
  };
}

function drawFigure(){
  const s = setupCanvas(els.figCanvas); if(!s) return;
  const { ctx, dpr, W, H } = s;
  ctx.clearRect(0,0,W,H);
  _labelSlots = [];

  const OM = 6*dpr, GY = 30*dpr, AXL = 48*dpr, AXR = 16*dpr;
  const AXT = 20*dpr, AXB1 = 14*dpr, AXB2 = 38*dpr;
  const rowH = (H - 2*OM - GY)/2;
  const pIS = { l:OM+AXL, r:W-OM-AXR, t:OM+AXT,         b:OM+rowH-AXB1 };
  const pAD = { l:OM+AXL, r:W-OM-AXR, t:OM+rowH+GY+AXT, b:OM+rowH+GY+rowH-AXB2 };

  const gIS = drawPanel(ctx, pIS, dpr, RY, RR, {
    title:'IS–LM', yLabel:'Interest rate r', xNums:false,
    yFmt: v => (v*100).toFixed(0)+'%' });
  const gAD = drawPanel(ctx, pAD, dpr, RY, RP, {
    title:'AS–AD', yLabel:'Price level P', xLabel:'Income / Output (Y)', xNums:true });

  const S = buildScene();
  if(!S){
    haloText(ctx, (pIS.l+pIS.r)/2, (pIS.t+pIS.b)/2,
      'Click “New Scenario” to begin', '#596878', dpr, 11, 700, 'center', 'middle');
    return;
  }
  const X = gIS.X, rY = gIS.Y, pY = gAD.Y;   // X is shared by both panels
  const line = (toY, fn, color, w, dash) =>
    strokeLine(ctx, X(RY.min), toY(fn(RY.min)), X(RY.max), toY(fn(RY.max)), color, w, dpr, dash);

  // ── IS–LM panel ──────────────────────────────────────────────────
  clipRect(ctx, pIS);
  if(S.ybarOld != null)
    strokeLine(ctx, X(S.ybarOld), pIS.t, X(S.ybarOld), pIS.b, C_REF, 1.4, dpr, [2,4]);
  strokeLine(ctx, X(S.ybar), pIS.t, X(S.ybar), pIS.b,
             S.ybarOld != null ? C_NEW : C_REF, S.ybarOld != null ? 2.2 : 1.4, dpr,
             S.ybarOld != null ? [] : [2,4]);
  line(rY, S.isBase, C_BASE, 2.0, [6,4]);
  if(S.isNew) line(rY, S.isNew, C_NEW, S.isNewMoving ? 3.6 : 2.6);
  for(const lm of S.lms){
    if(lm.style === 'base')       line(rY, lm.rOf, C_BASE, 2.0, [6,4]);
    else if(lm.style === 'ghost') line(rY, lm.rOf, C_NEW, 1.8, [1,3]);
    else                          line(rY, lm.rOf, C_NEW, lm.moving ? 3.6 : 2.6);
  }
  unclip(ctx);
  // Labels: the IS family exits right, the LM family exits through the top.
  curveLabel(ctx, dpr, X, rY, 'IS', S.isBase, RR, C_BASE, 'right');
  if(S.isNew) curveLabel(ctx, dpr, X, rY, S.isNewLabel, S.isNew, RR, C_NEW, 'right');
  for(const lm of S.lms)
    if(lm.label) curveLabel(ctx, dpr, X, rY, lm.label, lm.rOf, RR,
                            lm.style === 'base' ? C_BASE : C_NEW, 'top');
  if(S.ybarOld != null)
    haloText(ctx, X(S.ybarOld) - 4*dpr, pIS.t + 8*dpr, 'Ȳ', C_REF, dpr, 10, 800, 'right', 'top');
  haloText(ctx, X(S.ybar) - 4*dpr, pIS.t + (S.ybarOld != null ? 22*dpr : 8*dpr),
           S.ybarOld != null ? 'Ȳ′' : 'Ȳ', S.ybarOld != null ? C_NEW : C_REF,
           dpr, 10, 800, 'right', 'top');

  // Dots. Letters are pushed in different directions so the A″/B/C cluster
  // stays readable when the points sit close together.
  const OFF = { 'A':[9,-9], 'A′':[9,-9], 'A″':[10,10], 'B':[10,-11], 'C':[-11,-11] };
  const drawDots = (list, g) => {
    for(const d of list){
      if(!d.show) continue;
      const px = X(clamp(d.pt.Y, RY.min, RY.max));
      const py = g === gIS ? rY(clamp(d.pt.r, RR.min, RR.max))
                           : pY(clamp(d.pt.P, RP.min, RP.max));
      drawDot(ctx, px, py, d.color, d.big ? 6 : 5, dpr);
      if(d.ring) ringDot(ctx, px, py, d.color, dpr);
      if(d.label){
        const o = OFF[d.label] || [9,-9];
        haloText(ctx, px + o[0]*dpr, py + o[1]*dpr, d.label, d.color, dpr, 12, 800,
                 o[0] < 0 ? 'right' : 'left', 'middle');
      }
    }
  };
  drawDots(S.islmDots, gIS);

  // ── AS–AD panel ──────────────────────────────────────────────────
  clipRect(ctx, pAD);
  if(S.ybarOld != null)
    strokeLine(ctx, X(S.ybarOld), pAD.t, X(S.ybarOld), pAD.b, C_REF, 1.6, dpr, [2,4]);
  strokeLine(ctx, X(S.ybar), pAD.t, X(S.ybar), pAD.b,
             S.ybarOld != null ? C_NEW : C_REF,
             S.ybarOld != null ? (S.lrasMoving ? 3.6 : 2.6) : 1.8, dpr,
             S.ybarOld != null ? [] : [2,4]);
  const srasFn = c => Y => PsrasC(Y, c);
  line(pY, srasFn(S.srasBase), C_BASE, 2.0, [6,4]);
  if(S.srasNew != null) line(pY, srasFn(S.srasNew), C_NEW, S.srasNewMoving ? 3.6 : 2.6);
  drawAD(ctx, X, pY, S.adBase.a, S.adBase.b, C_BASE, 2.0, dpr, [6,4]);
  if(S.adNew) drawAD(ctx, X, pY, S.adNew.a, S.adNew.b, C_NEW, S.adNewMoving ? 3.6 : 2.6, dpr, null);
  unclip(ctx);
  if(S.ybarOld != null)
    haloText(ctx, X(S.ybarOld) - 5*dpr, pAD.t + 8*dpr, 'LRAS', C_REF, dpr, 10, 800, 'right', 'top');
  haloText(ctx, X(S.ybar) - 5*dpr, pAD.t + (S.ybarOld != null ? 22*dpr : 8*dpr),
           S.ybarOld != null ? 'LRAS′' : 'LRAS', S.ybarOld != null ? C_NEW : C_REF,
           dpr, 10, 800, 'right', 'top');
  // SRAS slopes up and exits the top; AD slopes down and exits to the right.
  curveLabel(ctx, dpr, X, pY, 'SRAS', srasFn(S.srasBase), RP, C_BASE, 'top');
  if(S.srasNew != null)
    curveLabel(ctx, dpr, X, pY, S.srasNewLabel, srasFn(S.srasNew), RP, C_NEW, 'top');
  const adP = (a,b) => Y => (Y > a + 1e-6 ? b/(Y - a) : NaN);
  curveLabel(ctx, dpr, X, pY, 'AD', adP(S.adBase.a, S.adBase.b), RP, C_BASE, 'right');
  if(S.adNew) curveLabel(ctx, dpr, X, pY, S.adNewLabel, adP(S.adNew.a, S.adNew.b), RP, C_NEW, 'right');
  drawDots(S.asadDots, gAD);

  // ── amber shared-axis guides ─────────────────────────────────────
  const li = S.liveIS, la = S.liveAD;
  const liX = X(clamp(li.Y, RY.min, RY.max)), liY = rY(clamp(li.r, RR.min, RR.max));
  const laX = X(clamp(la.Y, RY.min, RY.max)), laY = pY(clamp(la.P, RP.min, RP.max));
  strokeLine(ctx, pIS.l, liY, liX, liY, C_GUIDE, 1.6, dpr, [6,4]);
  strokeLine(ctx, liX, liY, liX, pIS.b, C_GUIDE, 1.6, dpr, [6,4]);
  strokeLine(ctx, pAD.l, laY, laX, laY, C_GUIDE, 1.6, dpr, [6,4]);
  strokeLine(ctx, laX, pAD.t, laX, laY, C_GUIDE, 1.6, dpr, [6,4]);
  // The panels only share one Y once both have reached the same phase.
  if(Math.abs(li.Y - la.Y) < 5e-3){
    strokeLine(ctx, liX, pIS.b, liX, pAD.t, C_GUIDE, 1.6, dpr, [6,4]);
    haloText(ctx, liX + 6*dpr, (pIS.b + pAD.t)/2, `Y = ${f2(li.Y)}`, C_GUIDE, dpr, 10, 800);
  } else {
    haloText(ctx, liX + 6*dpr, pIS.b - 6*dpr, `Y = ${f2(li.Y)}`, C_GUIDE, dpr, 9.5, 800, 'left', 'bottom');
    haloText(ctx, laX + 6*dpr, pAD.t + 6*dpr, `Y = ${f2(la.Y)}`, C_GUIDE, dpr, 9.5, 800, 'left', 'top');
  }
  haloText(ctx, pIS.l + 5*dpr, liY - 7*dpr, `r = ${pct(li.r)}`, C_GUIDE, dpr, 10, 800);
  haloText(ctx, pAD.l + 5*dpr, laY - 7*dpr, `P = ${f2(la.P)}`, C_GUIDE, dpr, 10, 800);

  // ── factor-market callout (that stage moves no curve) ────────────
  if(S.factorCallout){
    const u = S.calloutPUp;
    const bx = pAD.l + 10*dpr, by = pAD.t + 12*dpr;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.strokeStyle = C_GUIDE; ctx.lineWidth = 1.4*dpr;
    ctx.beginPath(); ctx.rect(bx, by, 176*dpr*_fs, 52*dpr*_fs); ctx.fill(); ctx.stroke();
    ctx.restore();
    haloText(ctx, bx + 8*dpr, by + 15*dpr*_fs, 'FACTOR MARKET', C_GUIDE, dpr, 9, 800);
    haloText(ctx, bx + 8*dpr, by + 30*dpr*_fs,
      `P ${u?'↑':'↓'}  ⟹  W/P ${u?'↓':'↑'}`, C_REF, dpr, 10, 700);
    haloText(ctx, bx + 8*dpr, by + 44*dpr*_fs,
      `${u?'workers bargain':'firms offer less'}  ⟹  W ${u?'↑':'↓'}`, C_REF, dpr, 10, 700);
  }
}

function drawAD(ctx, X, pY, a, b, color, width, dpr, dash){
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = width*dpr;
  ctx.setLineDash((dash||[]).map(d => d*dpr));
  ctx.beginPath();
  let started = false;
  const N = 90;
  for(let i = 0; i <= N; i++){
    const Pv = RP.min + (RP.max - RP.min)*(i/N);
    const Yv = a + b/Pv;
    if(Yv < RY.min - 4 || Yv > RY.max + 4){ started = false; continue; }
    const x = X(Yv), y = pY(Pv);
    if(!started){ ctx.moveTo(x,y); started = true; } else ctx.lineTo(x,y);
  }
  ctx.stroke(); ctx.restore();
}
// Label a curve where it LEAVES the plot area rather than mid-curve. The three
// LM curves all exit through the top, so anchoring there spreads their labels
// across the top edge in the same left-to-right order as the lecture-notes
// figure instead of piling them onto the crowded A″/B/C cluster.
let _labelSlots = [];   // reset on every redraw
function curveLabel(ctx, dpr, X, toPx, text, valAt, rng, color, anchor){
  const pad = (rng.max - rng.min)*0.05;
  let best = null;
  for(let i = 0; i <= 80; i++){
    const Yv = RY.min + (RY.max - RY.min)*(i/80), v = valAt(Yv);
    if(!isFinite(v) || v < rng.min + pad || v > rng.max - pad) continue;
    if(!best
       || (anchor === 'top'   && v  > best.v)
       || (anchor === 'right' && Yv > best.Yv)) best = { Yv, v };
  }
  if(!best) return;
  let x = X(best.Yv), y = toPx(best.v);
  if(anchor === 'top'){ x += 5*dpr; y += 8*dpr; } else { x -= 4*dpr; y -= 8*dpr; }
  // Curves can coincide exactly — LM(P₃) lands back on LM(P₁) after a money
  // shock, which is the whole point of monetary neutrality. Stack the labels
  // rather than letting one hide the other.
  const lh = 12*dpr*_fs;
  for(let guard = 0; guard < 6; guard++){
    const hit = _labelSlots.some(s =>
      Math.abs(s.x - x) < 34*dpr*_fs && Math.abs(s.y - y) < lh*0.9);
    if(!hit) break;
    y += lh;
  }
  _labelSlots.push({ x, y });
  haloText(ctx, x, y, text, color, dpr, 9.5, 800,
           anchor === 'top' ? 'left' : 'right', anchor === 'top' ? 'top' : 'bottom');
}

// ═══ 12. CANVAS DESCRIPTIONS (WCAG 1.1.1 / 4.1.3) ══════════════════════
function updateDescs(){
  if(!_path){
    els.islmDesc.textContent =
      `IS–LM diagram. Long-run equilibrium at A: output ${YBAR}, interest rate ${pct(rIS(BASE,YBAR))}, ` +
      `with IS crossing LM at the natural rate of output. No scenario loaded yet.`;
    els.asadDesc.textContent =
      `AS–AD diagram. AD, SRAS, and LRAS all pass through A at output ${YBAR} and price level ${PBASE}. ` +
      `No scenario loaded yet.`;
    return;
  }
  // Read the description straight off the scene, so it can never drift from
  // what is actually drawn.
  const S = buildScene(), li = S.liveIS, la = S.liveAD;
  const tag = _sh.tag, nSt = _sh.nStages, supply = _sh.family === 'supply';
  const SPOKEN = {
    'LM(P₁)':'LM at price level P1', 'LM(P₂)':'LM at price level P2',
    'LM(P₃)':'LM at price level P3', 'LM′(P₁)':'the shifted LM at price level P1',
    'A′':'A prime', 'A″':'A double prime', 'SRAS′':'SRAS prime', 'SRAS″':'SRAS double prime',
    'AD′':'AD prime', 'IS′':'IS prime',
  };
  const say  = t => SPOKEN[t] || t;
  const pts  = list => list.filter(d => d.show && d.label).map(d => say(d.label)).join(', ') || 'A';

  const isCurves = ['IS (before the shock, dashed)'];
  if(S.isNew) isCurves.push('IS prime (shifted ' + (_sh.dir>0?'right':'left') + ')');
  for(const lm of S.lms){
    if(lm.style === 'ghost') continue;
    isCurves.push(say(lm.label) + (lm.style === 'base' ? ' (before the shock, dashed)' : ''));
  }
  const ybarNote = S.ybarOld != null
    ? `The natural rate of output has moved from Ȳ = ${f2(S.ybarOld)} to ${f2(S.ybar)}, and both are marked.`
    : `A vertical dashed line marks the natural rate of output Ȳ = ${f2(S.ybar)}.`;

  els.islmDesc.textContent =
    `IS–LM diagram after ${tag}. Curves drawn: ${isCurves.join('; ')}. ${ybarNote} ` +
    `Points drawn: ${pts(S.islmDots)}. ` +
    `The economy is at output ${f2(li.Y)} and interest rate ${pct(li.r)}. ` +
    `Reached stage ${_revealStage} of ${nSt}.`;

  const adCurves = ['AD (before the shock, dashed)', 'SRAS (before the shock, dashed)',
                    `LRAS, vertical at Ȳ = ${f2(S.ybarOld != null ? S.ybarOld : S.ybar)}`];
  if(S.adNew)  adCurves.push('AD prime (shifted ' + (_sh.dir>0?'right':'left') + ')');
  if(S.srasNew != null)
    adCurves.push(say(S.srasNewLabel) + ' (shifted ' + (S.srasNew > S.srasBase ? 'up' : 'down') + ')');
  if(S.ybarOld != null)
    adCurves.push('LRAS prime, the new vertical at Ȳ = ' + f2(S.ybar));

  const done = _revealStage >= nSt;
  const ending = !done ? `The long-run point C is at output ${f2(_path.C.Y)}.`
    : supply
      ? (_sh.permanent
          ? `In the long run output is permanently ${_path.C.Y < YBAR ? 'lower' : 'higher'} at ${f2(_path.C.Y)}, `+
            `the price level is ${f2(_path.C.P)}, and the interest rate is ${pct(_path.C.r)} — a permanent cost shock is the one case that changes output for good.`
          : `The cost change was temporary, so the economy has returned exactly to A: output ${f2(_path.C.Y)}, price level ${f2(_path.C.P)}, interest rate ${pct(_path.C.r)}. Nothing changed permanently.`)
      : `In the long run output is back at Ȳ, the price level is permanently ${f2(_path.C.P)}, and the interest rate ` +
        (_sh.family === 'goods'
          ? `is permanently ${pct(_path.C.r)} rather than the original ${pct(_path.A.r)}, because the IS curve moved.`
          : `has returned to ${pct(_path.C.r)}, its original level, because the IS curve never moved.`);

  els.asadDesc.textContent =
    `AS–AD diagram after ${tag}. Curves drawn: ${adCurves.join('; ')}. ` +
    `Points drawn: ${pts(S.asadDots)}. ` +
    `The economy is at output ${f2(la.Y)} and price level ${f2(la.P)}. ` + ending;
}

function redraw(){
  _fs = Math.max(0.75, Math.min(2.5,
    parseFloat(getComputedStyle(document.documentElement).fontSize) / 16));
  drawFigure();
  updateDescs();
}

// ═══ 13. ANIMATION ═════════════════════════════════════════════════════
const DUR = 1600;
const reducedMotion = () =>
  window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

const nowMs = () =>
  (window.performance && performance.now) ? performance.now() : Date.now();

function endAnim(){
  if(!_anim) return;
  if(_anim.raf) cancelAnimationFrame(_anim.raf);
  if(_anim.guard) clearTimeout(_anim.guard);
  _anim = null;
}

function animateStage(n, done){
  endAnim();
  const finish = () => {
    endAnim();
    _revealStage = Math.max(_revealStage, n);
    redraw(); renderEqTable();
    if(done) done();
  };
  if(reducedMotion()){ finish(); return; }        // WCAG 2.3.3 — jump to the end

  const t0 = nowMs();
  _anim = { stage:n, t:0, raf:0, guard:0 };
  // A backgrounded tab stops firing requestAnimationFrame. Without this guard
  // the figure would stall mid-transition and Animate would stay disabled, so
  // settle on the finished state if the tween overruns its duration.
  _anim.guard = setTimeout(finish, DUR + 500);
  const step = () => {
    if(!_anim) return;
    const p = Math.min(1, (nowMs() - t0)/DUR);
    _anim.t = 0.5 - 0.5*Math.cos(Math.PI*p);      // cosine ease
    redraw();
    if(p < 1) _anim.raf = requestAnimationFrame(step);
    else finish();
  };
  _anim.raf = requestAnimationFrame(step);
}

// ═══ 14. EQUILIBRIUM SUMMARY ═══════════════════════════════════════════
// Which rows the summary table shows, and the stage each one is unlocked by.
// A cost shock has no A″ (AD never moves), and a temporary one ends back at A.
function eqRows(){
  if(!_sh) return [];
  if(_sh.family === 'supply'){
    return _sh.permanent
      ? [{ key:'A', label:'A — initial long run', need:0 },
         { key:'B', label:'B — short run',        need:3 },
         { key:'C', label:'C — new long run',     need:9 }]
      : [{ key:'A', label:'A — initial long run', need:0 },
         { key:'B', label:'B — short run',        need:3 },
         { key:'C', label:'C — back at A',        need:7 }];
  }
  return [
    { key:'A',   label:'A — initial long run', need:0 },
    { key:'App', label:'A″ — impact',          need:2 },
    { key:'B',   label:'B — short run',        need:4 },
    { key:'C',   label:'C — new long run',     need:9 },
  ];
}
function renderEqTable(){
  els.eqBody.innerHTML = '';
  for(const row of eqRows()){
    const tr = document.createElement('tr');
    const shown = _path && _revealStage >= row.need;
    if(!shown) tr.className = 'pending';
    const th = document.createElement('th');
    th.scope = 'row'; th.textContent = row.label;
    tr.appendChild(th);
    const pt = shown ? _path[row.key] : null;
    for(const v of [pt ? f2(pt.Y) : '—', pt ? f2(pt.P) : '—', pt ? pct(pt.r) : '—']){
      const td = document.createElement('td'); td.textContent = v; tr.appendChild(td);
    }
    els.eqBody.appendChild(tr);
  }
}

// ═══ 15. STAGE TRACKER ═════════════════════════════════════════════════
function renderRail(){
  const fill = (el, from, to) => {
    el.innerHTML = '';
    for(let n = from; n <= to; n++){
      const d = document.createElement('div');
      d.className = 'rail-step';
      d.setAttribute('role','listitem');
      const done = _stageDone(n);
      const cur  = !!_stages && !done && n === _stageIdx + 1;
      if(done) d.classList.add('done');
      if(cur)  d.classList.add('current');
      d.textContent = done ? '✓' : String(n);
      d.setAttribute('aria-label',
        `Stage ${n}${done ? ', complete' : cur ? ', current' : ', not started'}`);
      el.appendChild(d);
    }
  };
  // Stage count and the split between the two groups are per-shock: 10 stages
  // for a demand shock, 8 for a temporary cost shock.
  const n     = _sh ? _sh.nStages  : 10;
  const split = _sh ? _sh.railSplit : 5;
  fill(els.railA, 1, split);
  fill(els.railB, split + 1, n);
  els.railHdrA.textContent = `Impact & Short Run (1–${split})`;
  els.railHdrB.textContent = `${_sh ? _sh.railB : 'Transition to the Long Run'} (${split+1}–${n})`;
  els.railNow.textContent  = _stages ? String(Math.min(_stageIdx + 1, n)) : '—';
  els.railTotal.textContent = String(n);
}
function _stageDone(n){ return !!(_stages && _stages[n-1] && _stages[n-1]._done); }

// ═══ 16. MECHANISM UI ══════════════════════════════════════════════════
function resetKbPill(){
  const sel = els.pool.querySelectorAll('.pill.kb-selected');
  for(let i = 0; i < sel.length; i++){
    sel[i].classList.remove('kb-selected');
    sel[i].setAttribute('aria-pressed','false');
  }
  _kbPill = null;
}
function renderPool(){
  els.pool.innerHTML = '';
  if(!_stage || !_stage.market){ els.poolWrap.classList.add('hidden'); return; }
  els.poolWrap.classList.remove('hidden');
  const pool = POOLS[_stage.market];
  els.poolHdr.textContent = pool.hdr + ' — drag a variable into a well, or select it and press Enter';
  for(const tok of pool.pills){
    const d = document.createElement('div');
    d.className = 'pill'; d.textContent = tok;
    d.draggable = true; d.tabIndex = 0;
    d.setAttribute('role','button');
    d.setAttribute('aria-pressed','false');
    d.setAttribute('aria-label', `Variable ${tok}`);
    d.dataset.tok = tok;
    d.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', tok);
      e.dataTransfer.effectAllowed = 'copy';
    });
    d.addEventListener('keydown', e => {
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        const was = _kbPill === tok;
        resetKbPill();
        if(!was){
          d.classList.add('kb-selected');
          d.setAttribute('aria-pressed','true');
          _kbPill = tok;
        }
      }
    });
    els.pool.appendChild(d);
  }
}

function makeBlank(i){
  const st = _st, stage = _stage;
  const summary = stage.kind === 'summary';
  const carried = !summary && !!stage.carry && i === 0;
  const wrap = document.createElement('div');
  wrap.className = 'blank' + (st.active === i ? ' active' : '') + (carried ? ' carried' : '');

  const well = document.createElement('button');
  well.type = 'button';
  well.className = 'well' + (summary || carried ? ' fixed' : (st.vals[i].v ? ' filled' : ''));
  well.textContent = summary ? stage.chain[i].v : (st.vals[i].v || 'variable');
  if(carried){
    well.disabled = true;
    well.setAttribute('aria-label',
      `Step 1 variable: ${stage.chain[0].v}, carried over from stage ${stage.carryFrom}. Already filled in and not editable.`);
  } else if(summary){
    well.disabled = true;
    well.setAttribute('aria-label', `Step ${i+1} variable: ${stage.chain[i].v}`);
  } else {
    well.setAttribute('aria-label',
      `Step ${i+1} variable: ${st.vals[i].v || 'empty'}. Place the selected variable, or press Delete to clear.`);
    well.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    well.addEventListener('drop', e => {
      e.preventDefault();
      const tok = e.dataTransfer.getData('text/plain');
      if(tok) setVar(i, tok);
    });
    well.addEventListener('click', () => {
      st.active = i;
      if(_kbPill){ setVar(i, _kbPill); resetKbPill(); } else renderChain();
    });
    well.addEventListener('keydown', e => {
      if((e.key === 'Enter' || e.key === ' ') && _kbPill){
        e.preventDefault(); setVar(i, _kbPill); resetKbPill();
      } else if(e.key === 'Delete' || e.key === 'Backspace'){
        e.preventDefault(); setVar(i, null);
      }
    });
  }
  wrap.appendChild(well);

  const grp = document.createElement('div');
  grp.className = 'dirgrp';
  grp.setAttribute('role','group');
  grp.setAttribute('aria-label', `Step ${i+1} direction`);
  const opts = summary
    ? [['up','↑','increases'],['down','↓','decreases'],['none','no change','no change']]
    : [['up','↑','increases'],['down','↓','decreases']];
  for(const [val, glyph, word] of opts){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dirbtn' + (val === 'none' ? ' wide' : '');
    b.textContent = glyph;
    b.setAttribute('aria-pressed', st.vals[i].d === val ? 'true' : 'false');
    b.setAttribute('aria-label', carried
      ? `Step 1: ${word}, carried over from stage ${stage.carryFrom} and not editable`
      : `Step ${i+1}: ${word}`);
    if(carried) b.disabled = true;
    else b.addEventListener('click', () => { st.active = i; setDir(i, val); });
    grp.appendChild(b);
  }
  wrap.appendChild(grp);
  return wrap;
}

function renderChain(){
  els.chain.innerHTML = '';
  if(!_stage){
    els.chain.textContent = '';
    els.stepCount.textContent = '';
    return;
  }
  const st = _st, stage = _stage, n = stage.chain.length;
  const summary = stage.kind === 'summary';

  if(summary){
    // A summary is a short labeled list, not a chain to be discovered, so all
    // three rows are shown at once.
    for(let i = 0; i < n; i++) els.chain.appendChild(makeBlank(i));
    els.stepCount.textContent = 'Compare each variable with point A.';
  } else {
    if(stage.curveFirst){
      const note = document.createElement('span');
      note.className = 'link-note';
      note.textContent = 'Flexible-price firms reset their prices…';
      els.chain.appendChild(note);
      const arr = document.createElement('span');
      arr.className = 'arrow-tok'; arr.textContent = '→';
      arr.setAttribute('aria-hidden','true');
      els.chain.appendChild(arr);
    }
    for(let i = 0; i < st.revealed; i++){
      els.chain.appendChild(makeBlank(i));
      if(i < st.revealed - 1){
        const arr = document.createElement('span');
        arr.className = 'arrow-tok'; arr.textContent = '→';
        arr.setAttribute('aria-hidden','true');
        els.chain.appendChild(arr);
      }
    }
    // The → button reveals the next step, and on the last step it reveals the
    // curve statement. Stages with no curve statement simply stop.
    const showNext = !stage.curveFirst && !st.terminalShown &&
                     (st.revealed < n || !!stage.curve);
    if(showNext){
      const nb = document.createElement('button');
      nb.type = 'button'; nb.className = 'nextblank'; nb.textContent = '→';
      nb.setAttribute('aria-label', 'Lock this step and reveal the next one');
      nb.disabled = !blankComplete(st.revealed - 1);
      nb.addEventListener('click', advanceBlank);
      els.chain.appendChild(nb);
    }
    els.stepCount.textContent =
      `Step ${st.revealed}${st.terminalShown ? ' — chain complete' : ''}` +
      (stage.carry ? ` · step 1 carries over from stage ${stage.carryFrom}` : '');
  }

  // Terminal statement box: before the chain for the AD stage, after otherwise.
  const parent = els.chain.parentNode;
  if(!stage.curve){
    els.terminal.classList.add('hidden');
  } else if(stage.curveFirst){
    parent.insertBefore(els.terminal, els.chain);
    els.terminal.classList.remove('hidden');
    els.terminalHdr.textContent = 'What happens to the curve? (state this first)';
  } else if(st.terminalShown){
    parent.insertBefore(els.terminal, els.stepCount.nextSibling);
    els.terminal.classList.remove('hidden');
    els.terminalHdr.textContent = 'What happens to the curve?';
  } else {
    els.terminal.classList.add('hidden');
  }
}

function blankComplete(i){
  if(i < 0 || !_st) return false;
  const v = _st.vals[i];
  if(_stage.kind === 'summary') return !!v.d;
  return !!v.v && !!v.d;
}
function setVar(i, tok){
  _st.vals[i].v = tok;
  _st.active = i;
  clearBadge();
  renderChain();
}
function setDir(i, d){
  _st.vals[i].d = (_st.vals[i].d === d) ? null : d;
  clearBadge();
  renderChain();
}
function advanceBlank(){
  if(!blankComplete(_st.revealed - 1)) return;
  if(_st.revealed < _stage.chain.length){
    _st.revealed += 1;
    _st.active = _st.revealed - 1;
  } else {
    _st.terminalShown = true;
  }
  clearBadge();
  renderChain();
}

function fillActions(curve, keep){
  const sel = els.actionSel;
  sel.innerHTML = '';
  const first = document.createElement('option');
  first.value = ''; first.textContent = 'Action…';
  sel.appendChild(first);
  for(const [val, label] of (ACTIONS[curve] || [])){
    const o = document.createElement('option');
    o.value = val; o.textContent = label;
    sel.appendChild(o);
  }
  sel.value = keep && (ACTIONS[curve] || []).some(x => x[0] === keep) ? keep : '';
}

// ═══ 17. GRADING ═══════════════════════════════════════════════════════
function setBadge(kind, msg){
  if(!kind){
    els.mechBadge.hidden = true;
    els.mechBadge.className = 'mech-badge';
    els.mechBadge.textContent = '';
    els.mechMsg.textContent = msg || '';
    return;
  }
  els.mechBadge.hidden = false;
  els.mechBadge.className = 'mech-badge ' + kind;
  els.mechBadge.textContent = kind === 'ok' ? '✓ Correct' : '✗ Not yet';
  els.mechMsg.textContent = msg || '';
}
function clearBadge(){ if(_st && !_st.solved) setBadge(null, els.mechMsg.textContent); }

function studentAnswerString(){
  const parts = _st.vals.map((v,i) => {
    const name = _stage.kind === 'summary' ? _stage.chain[i].v : (v.v || '?');
    return name + (v.d ? ARROW(v.d) : '?');
  });
  let s = parts.join(' → ');
  if(_stage.curve){
    s += ' · ' + (_st.curve && _st.action
      ? `${_st.curve} ${ACTION_LABEL(_st.curve, _st.action)}`
      : 'curve statement not set');
  }
  return s;
}
function correctAnswerString(){
  const parts = _stage.chain.map(c => c.v + ARROW(c.d));
  let s = parts.join(' → ');
  if(_stage.curve) s += ' · ' + `${_stage.curve.c} ${ACTION_LABEL(_stage.curve.c, _stage.curve.a)}`;
  return s;
}

function checkStage(){
  if(!_stage || _st.solved) return;
  const n = _stage.chain.length;
  if(_st.revealed < n && _stage.kind !== 'summary'){
    setBadge(null, 'Finish the chain first — fill this step, then press → to reveal the next one.');
    return;
  }
  for(let i = 0; i < n; i++){
    if(!blankComplete(i)){
      setBadge(null, `Step ${i+1} is not filled in yet.`);
      return;
    }
  }
  if(_stage.curve && !_st.terminalShown){
    setBadge(null, 'Press → once more to state what happens to the curve.');
    return;
  }
  if(_stage.curve && (!_st.curve || !_st.action)){
    setBadge(null, 'Choose both a curve and an action before checking.');
    return;
  }

  let firstBad = -1;
  for(let i = 0; i < n; i++){
    const want = _stage.chain[i], got = _st.vals[i];
    const varOk = _stage.kind === 'summary' ? true : got.v === want.v;
    if(!varOk || got.d !== want.d){ firstBad = i; break; }
  }
  const chainOk = firstBad === -1;
  const curveOk = !_stage.curve ||
    (_st.curve === _stage.curve.c && _st.action === _stage.curve.a);
  const ok = chainOk && curveOk;

  const firstCheck = !_st.checked;
  // Snapshot what the student actually had, before Show answer can overwrite it.
  if(firstCheck) _st.firstAnswerStr = studentAnswerString();
  _st.checked = true;

  if(ok){
    _st.solved = true;
    if(firstCheck){ _st.firstOk = true; _firstScore += 1; }
    _finalScore += 1;
    setBadge('ok', 'Animate the figure to move the economy, then go on to the next stage.');
    finishStage();
  } else {
    if(firstCheck) _st.firstOk = false;
    let msg;
    if(!chainOk){
      msg = _stage.kind === 'summary'
        ? `Line ${firstBad+1} is the first one that does not match. Compare that variable with point A.`
        : `Step ${firstBad+1} is the first one that does not match — check the variable and its direction.`;
    } else {
      msg = 'The chain is right, but the curve statement is not. Ask yourself whether the curve itself moved, or whether the economy slid along it.';
    }
    setBadge('bad', msg + ' Use Why? for the economics, or Show answer to move on.');
  }
  syncButtons();
}

function showAnswer(){
  if(!_stage || _st.solved) return;
  if(!_st.firstAnswerStr) _st.firstAnswerStr = studentAnswerString();
  const n = _stage.chain.length;
  _st.revealed = n;
  _st.terminalShown = true;
  for(let i = 0; i < n; i++){
    _st.vals[i].v = _stage.chain[i].v;
    _st.vals[i].d = _stage.chain[i].d;
  }
  _st.active = n - 1;
  if(_stage.curve){
    _st.curve = _stage.curve.c; _st.action = _stage.curve.a;
    els.curveSel.value = _st.curve;
    fillActions(_st.curve, _st.action);
  }
  if(!_st.checked) _st.firstOk = false;
  _st.checked = true;
  _st.solved = true;
  _st.revealedAnswer = true;
  renderChain();
  setBadge(null, 'Answer shown — no point for this stage. Animate the figure, then go on.');
  finishStage();
  syncButtons();
}

// Record the stage once it is resolved, either way.
function finishStage(){
  _stage._done = true;
  renderRail();
  if(_st.recorded) return;
  _st.recorded = true;
  _stagesRecorded += 1;
  const qText = `[${_sh.tag}] Stage ${_stage.n} — ${_stage.title}`;
  const first = _st.firstAnswerStr || '(no answer entered)';
  const final = _st.revealedAnswer ? correctAnswerString() + ' (answer shown)' : studentAnswerString();
  if(window.Session && Session.recordQuestion){
    Session.recordQuestion(LAB_ID, _stagesRecorded - 1, qText,
      first, !!_st.firstOk, final, !_st.revealedAnswer);
  }
  // Keep the lab-level tally current after every stage, so the session is
  // accurate whenever the student stops.
  if(window.Session && Session.recordLabDone){
    Session.recordLabDone(LAB_ID, LAB_LABEL, _firstScore, _finalScore, _stagesRecorded);
  }
  updateScoreReadout();
}

function updateScoreReadout(){
  if(!els.scoreReadout) return;
  els.scoreReadout.textContent = _stagesRecorded === 0 ? '' :
    `Score: ${_finalScore} of ${_stagesRecorded} (first attempt: ${_firstScore})`;
}

// ═══ 18. STAGE LIFECYCLE ═══════════════════════════════════════════════
function loadStage(idx){
  _stageIdx = idx;
  _stage = _stages[idx];
  const carry = !!_stage.carry;
  _st = {
    // A carried-over first link starts filled in and locked, and the first
    // editable blank is revealed alongside it.
    vals: _stage.chain.map((c, i) => (carry && i === 0)
      ? { v:c.v, d:c.d } : { v:null, d:null }),
    revealed: _stage.kind === 'summary' ? _stage.chain.length
            : Math.min(carry ? 2 : 1, _stage.chain.length),
    active: carry ? 1 : 0,
    terminalShown: !!_stage.curveFirst,
    curve:'', action:'',
    checked:false, solved:false, firstOk:null, firstAnswerStr:'',
    recorded:false, revealedAnswer:false, animated:false,
  };
  els.stageTitle.textContent = `Stage ${_stage.n} — ${_stage.title}`;
  els.stageMeta.textContent = _stage.market ? POOLS[_stage.market].hdr : 'Summary';
  els.stageLead.textContent = _stage.lead;
  els.curveSel.value = '';
  fillActions('', '');
  resetKbPill();
  renderPool();
  renderChain();
  renderRail();
  setBadge(null, '');
  syncButtons();
}

function nextStage(){
  if(!_st.animated){
    // The TA may skip the animation; jump the figure so it never falls behind.
    _revealStage = Math.max(_revealStage, _stage.n);
    redraw(); renderEqTable();
  }
  if(_stageIdx + 1 >= _stages.length){
    els.nextBtn.classList.add('hidden');
    els.stageTitle.textContent = 'Scenario complete';
    els.stageMeta.textContent = '';
    els.stageLead.textContent =
      _sh.family === 'supply'
        ? (_sh.permanent
            ? `The economy has reached C. Output is permanently ${_path.C.Y < YBAR ? 'lower' : 'higher'} at ${f2(_path.C.Y)} — capacity itself changed — with the price level at ${f2(_path.C.P)} and the interest rate at ${pct(_path.C.r)}. This is the only shock in the lab that moves output in the long run.`
            : `The economy is back at A: output ${f2(_path.C.Y)}, price level ${f2(_path.C.P)}, interest rate ${pct(_path.C.r)}. A temporary cost shock leaves no permanent trace — capacity was never touched.`)
        : `The economy has reached C. Output is back at Ȳ = ${YBAR}, the price level is ${f2(_path.C.P)}, ` +
          (_sh.family === 'goods'
            ? `and the interest rate is permanently ${pct(_path.C.r)} instead of ${pct(_path.A.r)} — a goods-market shock changes r for good.`
            : `and the interest rate is back at ${pct(_path.C.r)} — a money-market shock leaves r unchanged in the long run.`);
    els.chain.innerHTML = '';
    els.stepCount.textContent = '';
    els.terminal.classList.add('hidden');
    els.poolWrap.classList.add('hidden');
    _stage = null;
    _stageIdx = _stages.length;      // no stage is "current" any more
    renderRail();
    els.railNow.textContent = '10';
    syncButtons();
    setBadge(null, 'Click “New Scenario” for another shock.');
    return;
  }
  loadStage(_stageIdx + 1);
}

function syncButtons(){
  const live = !!_stage;
  els.checkBtn.disabled = !live || _st.solved;
  els.showBtn.disabled  = !live || _st.solved;
  els.clearBtn.disabled = !live || _st.solved;
  els.whyBtn.disabled   = !live;
  els.animBtn.disabled  = !live || !(_st.checked || _st.solved) || !!_anim;
  if(live && _st.solved) els.nextBtn.classList.remove('hidden');
  else els.nextBtn.classList.add('hidden');
}

function clearStage(){
  if(!_stage || _st.solved) return;
  const carry = !!_stage.carry;
  _st.vals = _stage.chain.map((c, i) => (carry && i === 0)
    ? { v:c.v, d:c.d } : { v:null, d:null });     // the carried link stays put
  _st.revealed = _stage.kind === 'summary' ? _stage.chain.length
               : Math.min(carry ? 2 : 1, _stage.chain.length);
  _st.active = carry ? 1 : 0;
  _st.terminalShown = !!_stage.curveFirst;
  _st.curve = ''; _st.action = '';
  els.curveSel.value = '';
  fillActions('', '');
  resetKbPill();
  renderChain();
  setBadge(null, '');
}

// ═══ 19. SCENARIO LIFECYCLE ════════════════════════════════════════════
function startScenario(pick){
  _scen = pick;
  _sh = SHOCKS[pick.k];
  _path = computePath(_sh);
  _stages = buildStages(_sh);
  _revealStage = 0;
  endAnim();

  els.scenStamp.textContent = `${makeStamp()} • ${pick.src}`;
  els.scenHead.textContent  = pick.head;
  els.scenBrief.textContent = pick.brief;
  els.scenSteps.textContent =
    'For each stage: build the chain, state what the curve does, Check, then Animate and go on. ' +
    `${_sh.nStages} stages take the economy from A to B to ` +
    (_sh.family === 'supply' && !_sh.permanent ? 'back at A.' : 'C.');
  els.counterText.textContent = String(_scenIdx + 1);

  loadStage(0);
  renderEqTable();
  redraw();
}
function newScenario(){
  const prev = _scen;
  _scenIdx += 1;
  startScenario(nextFromQueue(prev));
}
function resetScenario(){
  // Restart the current scenario's walkthrough. Scores already recorded stand.
  if(!_scen){ return; }
  for(const s of _stages) s._done = false;
  startScenario(_scen);
}

// ═══ 20. EVENTS ════════════════════════════════════════════════════════
els.newBtn.addEventListener('click', newScenario);
els.resetBtn.addEventListener('click', resetScenario);
els.checkBtn.addEventListener('click', checkStage);
els.showBtn.addEventListener('click', showAnswer);
els.clearBtn.addEventListener('click', clearStage);
els.nextBtn.addEventListener('click', nextStage);
els.whyBtn.addEventListener('click', () => {
  if(!_stage) return;
  setBadge(_st.solved ? (_st.revealedAnswer ? null : 'ok') : null, whyText(_sh, _stage));
});
els.animBtn.addEventListener('click', () => {
  if(!_stage) return;
  _st.animated = true;
  els.animBtn.disabled = true;
  animateStage(_stage.n, syncButtons);
});
els.curveSel.addEventListener('change', () => {
  if(!_st) return;
  _st.curve = els.curveSel.value;
  fillActions(_st.curve, _st.action);
  _st.action = els.actionSel.value;
  clearBadge();
});
els.actionSel.addEventListener('change', () => {
  if(!_st) return;
  _st.action = els.actionSel.value;
  clearBadge();
});

let _resizeTimer;
function scheduleRedraw(){
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(redraw, 80);
}
window.addEventListener('resize', scheduleRedraw);
// A ResizeObserver catches container size changes that never fire a window
// `resize` event (a collapsed pane that later expands, a late reflow).
if(window.ResizeObserver && els.figCanvas){
  new ResizeObserver(scheduleRedraw).observe(els.figCanvas.parentNode);
}

// ═══ 21. INIT ══════════════════════════════════════════════════════════
function generateParams(){
  if(window.Session && Session.rngForLab) _rng = Session.rngForLab(LAB_ID);
  _queue = shufflePool();
}
function init(){
  generateParams();
  renderRail();
  renderEqTable();
  updateScoreReadout();
  syncButtons();
  redraw();
  setTimeout(redraw, 80);
}
init();

})();
