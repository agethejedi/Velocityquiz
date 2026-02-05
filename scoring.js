// Rubric-aligned scoring aggregation (100 points total)
//
// Components:
// 1) Decision Accuracy — 40
// 2) Risk Signal Recognition — 25 (global cap)
// 3) Velocity Pattern Sensitivity — 15
// 4) Over-Flagging Control — 10
// 5) Consistency Index — 10

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function scoreQuiz(answers){
  // answers: [{ scenario, userAnswer, selectedSignals[] }]
  const resultPerQ = [];
  let decisionPoints = 0;
  let velocityPoints = 0;

  let signalPointsTotal = 0;
  const SIGNAL_POINTS_EACH = 5;
  const SIGNAL_CAP = 25;

  let falsePos = 0;
  let falseNeg = 0;

  // over-flagging penalties (scenario-level)
  let overflagPenalty = 0;
  let stableRestraint = true; // becomes false if any stable cadence is incorrectly flagged

  for(const a of answers){
    const s = a.scenario;
    const correct = s.correct_answer; // "velocity_concern" | "no_concern"
    const user = a.userAnswer;

    const isCorrect = user === correct;

    // Decision accuracy: +10 correct; -5 FP; -10 FN
    let dp = 0;
    if(isCorrect){
      dp = 10;
    } else if(correct === "no_concern" && user === "velocity_concern"){
      dp = -5; falsePos += 1;
    } else if(correct === "velocity_concern" && user === "no_concern"){
      dp = -10; falseNeg += 1;
    }
    decisionPoints += dp;

    // Velocity sensitivity: +7 for correctly flagging multiweek burst; +8 for correctly ignoring stable cadence
    let vp = 0;
    if(isCorrect && s.tags.includes("multiweek_burst") && correct === "velocity_concern"){
      vp = 7;
    }
    if(isCorrect && s.tags.includes("stable_cadence") && correct === "no_concern"){
      vp = 8;
    }
    velocityPoints += vp;

    // Signals: +5 for each correctly selected expected signal (per question),
    // but apply global cap 25 across the quiz.
    const selected = new Set(a.selectedSignals || []);
    const expected = new Set(s.expected_signals || []);
    const awardedSignals = [];
    const missedSignals = [];

    for(const sig of expected){
      if(selected.has(sig)){
        awardedSignals.push(sig);
      } else {
        missedSignals.push(sig);
      }
    }

    let sp = awardedSignals.length * SIGNAL_POINTS_EACH;
    // apply global cap
    const available = SIGNAL_CAP - signalPointsTotal;
    const spCapped = clamp(sp, 0, available);
    signalPointsTotal += spCapped;

    // Over-flagging control: penalties if stable pattern flagged; extra penalty if rationale is "high amount only"
    if(s.tags.includes("stable_cadence") && user === "velocity_concern"){
      stableRestraint = false;
      overflagPenalty += 5; // "Flags benign stable pattern" -5 applied later as points
      // If user selected only high_amount_only or included it prominently: apply extra penalty
      // We approximate by checking if high_amount_only is selected AND they did NOT select any protective signals.
      const protective = ["stable_cadence_years","same_counterparty","domestic_destination","consistent_amount_band"];
      const hasProtective = protective.some(p => selected.has(p));
      if(selected.has("high_amount_only") && !hasProtective){
        overflagPenalty += 5; // "High amount only" -5
      }
    }

    resultPerQ.push({
      scenario_id: s.id,
      title: s.title,
      correct_answer: correct,
      user_answer: user,
      is_correct: isCorrect,
      decision_points: dp,
      velocity_points: vp,
      signal_points_awarded: spCapped,
      awarded_signals: awardedSignals,
      missed_signals: missedSignals,
      tags: s.tags
    });
  }

  // Normalize component totals to rubric maxima
  // Decision Accuracy max = 40. But we used +/-10 per question. We'll map:
  // - For N questions, ideal max = N*10. Scale to 40.
  const N = answers.length || 1;
  const decisionMax = N * 10;
  const decisionScaled = clamp(Math.round((decisionPoints / decisionMax) * 40), -40, 40);

  // Signals already capped at 25
  const signalsScaled = clamp(signalPointsTotal, 0, 25);

  // Velocity sensitivity max depends on scenario mix; rubric max 15.
  // We scale observed velocityPoints against theoretical max in this quiz:
  let velocityMax = 0;
  for(const a of answers){
    const s = a.scenario;
    if(s.tags.includes("multiweek_burst") && s.correct_answer === "velocity_concern") velocityMax += 7;
    if(s.tags.includes("stable_cadence") && s.correct_answer === "no_concern") velocityMax += 8;
  }
  if(velocityMax === 0) velocityMax = 1;
  const velocityScaled = clamp(Math.round((velocityPoints / velocityMax) * 15), 0, 15);

  // Over-flagging control: start at 10, subtract penalties; if restraint maintained, award full 10.
  let overflagScaled = 10;
  overflagScaled -= Math.round(overflagPenalty); // penalty units already in points
  overflagScaled = clamp(overflagScaled, 0, 10);

  // Consistency Index (0..10)
  // Heuristics:
  // - penalize mixed FP and FN (logic drift)
  // - penalize more FN than FP (missed high-risk)
  // - penalize flagging stable cadence (already counted, but also impacts consistency)
  let consistency = 10;
  if(falsePos > 0 && falseNeg > 0) consistency -= 4;
  if(falseNeg >= 2) consistency -= 4;
  if(falsePos >= 2) consistency -= 2;
  if(!stableRestraint) consistency -= 2;
  consistency = clamp(consistency, 0, 10);

  const total = clamp(decisionScaled + signalsScaled + velocityScaled + overflagScaled + consistency, 0, 100);

  // Construct narrative feedback
  const strengths = [];
  const improvements = [];

  if(falseNeg === 0) strengths.push("You avoided false negatives on high-risk patterns.");
  else improvements.push("Work on catching deviation-led velocity patterns earlier (reduce false negatives).");

  if(falsePos === 0) strengths.push("You showed strong restraint on benign cadence patterns.");
  else improvements.push("Be careful not to overweight high dollar value when cadence and counterparty are stable.");

  if(signalsScaled >= 20) strengths.push("Your signal recognition was strong (you named the right drivers).");
  else improvements.push("Call out the core drivers explicitly: deviation from baseline, repetition, and destination risk.");

  if(velocityScaled >= 12) strengths.push("Excellent temporal reasoning (days/weeks velocity detection).");
  else improvements.push("Focus on velocity occurring over days and weeks—not just same-day clustering.");

  const feedback = {
    strength: strengths.slice(0,2),
    improve: improvements.slice(0,2),
    next_rep: "On each question, name at least two drivers: (1) deviation from history, (2) repetition/cadence, (3) destination risk (crypto/international), and (4) escalation."
  };

  const components = {
    decision_accuracy: decisionScaled,
    signal_recognition: signalsScaled,
    velocity_sensitivity: velocityScaled,
    overflagging_control: overflagScaled,
    consistency_index: consistency
  };

  const summary = {
    total_score: total,
    false_positives: falsePos,
    false_negatives: falseNeg,
    accuracy_rate: Math.round((resultPerQ.filter(r => r.is_correct).length / N) * 100),
    components,
    feedback,
    per_question: resultPerQ
  };

  return summary;
}
