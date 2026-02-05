// Scenario pool for 3/5/10 question quizzes.
// Each scenario has scoring hooks: expected_signals, tags, and correct_answer.
//
// Tags used by scoring aggregation:
// - high_risk (crypto and/or international)
// - multiweek_burst (velocity across days/weeks)
// - stable_cadence (benign long-term cadence)

export const WHY_OPTIONS = [
  { id: "new_international_beneficiary", label: "New international beneficiary" },
  { id: "high_risk_geography", label: "High-risk geography" },
  { id: "crypto_platform", label: "Crypto platform destination" },
  { id: "repeated_same_beneficiary", label: "Repeated to same beneficiary" },
  { id: "clustered_activity", label: "Clustered activity (days) + continued pattern" },
  { id: "escalating_amounts", label: "Escalating amounts" },
  { id: "varied_amounts", label: "Varied amounts (not fixed payment)" },
  { id: "deviation_from_history", label: "Deviates from account history" },
  { id: "stable_cadence_years", label: "Stable cadence over years" },
  { id: "same_counterparty", label: "Same counterparty" },
  { id: "domestic_destination", label: "Domestic destination" },
  { id: "consistent_amount_band", label: "Consistent amount band" },
  { id: "high_amount_only", label: "High dollar amount only" } // used to detect weak over-flag rationale
];

function tx(date, amount, destination, destType, country, flags=[]) {
  return { date, amount, destination, destType, country, flags };
}

export const SCENARIOS = [
  {
    id: "S1_SYLVIA_THAI",
    title: "Individual Checking → Sylvia Fraudia (Thailand) — escalating wires",
    source: { type: "Individual Checking", tenure: "11 years", history: "1–2 domestic wires/year ($3k–$9k); no international wires" },
    correct_answer: "velocity_concern",
    tags: ["high_risk","multiweek_burst","international","escalation","new_beneficiary"],
    expected_signals: ["new_international_beneficiary","high_risk_geography","repeated_same_beneficiary","escalating_amounts","deviation_from_history"],
    risk_badges: ["International","High-risk geography","Escalation"],
    transactions: [
      tx("May 3",  5769.38,  "Sylvia Fraudia", "Individual Bank Account", "Thailand", ["intl"]),
      tx("May 12", 18250.00, "Sylvia Fraudia", "Individual Bank Account", "Thailand", ["intl"]),
      tx("May 21", 47900.00, "Sylvia Fraudia", "Individual Bank Account", "Thailand", ["intl"]),
      tx("Jun 2",  96400.00, "Sylvia Fraudia", "Individual Bank Account", "Thailand", ["intl"]),
      tx("Jun 14", 185000.00,"Sylvia Fraudia", "Individual Bank Account", "Thailand", ["intl"])
    ]
  },
  {
    id: "S2_TRUST_CRYPTO_CLUSTER",
    title: "Revocable Trust → Coinbase/Kraken — clustered then continued",
    source: { type: "Revocable Trust", tenure: "6 years", history: "Predictable quarterly wires to brokerage; no crypto history" },
    correct_answer: "velocity_concern",
    tags: ["high_risk","multiweek_burst","crypto","new_behavior"],
    expected_signals: ["crypto_platform","clustered_activity","varied_amounts","deviation_from_history","repeated_same_beneficiary"],
    risk_badges: ["Crypto platform","High-risk destination"],
    transactions: [
      tx("Aug 2",  147500.00, "Coinbase", "Crypto Platform", "USA", ["crypto"]),
      tx("Aug 6",  265000.00, "Coinbase", "Crypto Platform", "USA", ["crypto"]),
      tx("Aug 18",  92000.00, "Kraken",   "Crypto Platform", "USA", ["crypto"]),
      tx("Aug 27", 318250.00, "Coinbase", "Crypto Platform", "USA", ["crypto"])
    ]
  },
  {
    id: "S3_WIDGETS_PLUS_STABLE",
    title: "Widgets Plus Inc. → Apex Industrial Supply LLC — stable 4‑month cadence",
    source: { type: "Corporate Operating", tenure: "9 years", history: "Ongoing vendor settlement cadence; domestic counterparties" , name: "Widgets Plus Inc."},
    correct_answer: "no_concern",
    tags: ["stable_cadence","domestic","corporate_vendor"],
    expected_signals: ["stable_cadence_years","same_counterparty","domestic_destination","consistent_amount_band"],
    risk_badges: ["Stable cadence","Domestic"],
    transactions: [
      tx("Mar 14, 2022", 448000.00, "Apex Industrial Supply LLC", "Corporate Bank Account", "USA", []),
      tx("Jul 18, 2022", 465500.00, "Apex Industrial Supply LLC", "Corporate Bank Account", "USA", []),
      tx("Nov 21, 2022", 452300.00, "Apex Industrial Supply LLC", "Corporate Bank Account", "USA", []),
      tx("Mar 20, 2023", 490000.00, "Apex Industrial Supply LLC", "Corporate Bank Account", "USA", []),
      tx("Jul 17, 2023", 478900.00, "Apex Industrial Supply LLC", "Corporate Bank Account", "USA", []),
      tx("Nov 20, 2023", 501200.00, "Apex Industrial Supply LLC", "Corporate Bank Account", "USA", []),
      tx("Mar 18, 2024", 486400.00, "Apex Industrial Supply LLC", "Corporate Bank Account", "USA", []),
      tx("Jul 15, 2024", 509800.00, "Apex Industrial Supply LLC", "Corporate Bank Account", "USA", []),
      tx("Nov 18, 2024", 497600.00, "Apex Industrial Supply LLC", "Corporate Bank Account", "USA", [])
    ]
  },

  // Additional scenarios to support 5 and 10 question modes (variations)
  {
    id: "S4_IRA_PHILIPPINES_BURST",
    title: "IRA → new beneficiary (Philippines) — repeated wires over 5 weeks",
    source: { type: "IRA", tenure: "8 years", history: "No prior international wires; occasional domestic transfers to brokerage" },
    correct_answer: "velocity_concern",
    tags: ["high_risk","multiweek_burst","international","new_beneficiary"],
    expected_signals: ["new_international_beneficiary","high_risk_geography","repeated_same_beneficiary","deviation_from_history"],
    risk_badges: ["International","High-risk geography"],
    transactions: [
      tx("Sep 1",  25000.00, "J. Navarro", "Individual Bank Account", "Philippines", ["intl"]),
      tx("Sep 10", 41000.00, "J. Navarro", "Individual Bank Account", "Philippines", ["intl"]),
      tx("Sep 22", 60000.00, "J. Navarro", "Individual Bank Account", "Philippines", ["intl"]),
      tx("Oct 6",  85000.00, "J. Navarro", "Individual Bank Account", "Philippines", ["intl"])
    ]
  },
  {
    id: "S5_LLC_GERMANY_VENDOR_NEW",
    title: "LLC Operating → new Germany corporate beneficiary — first international series",
    source: { type: "LLC Operating", tenure: "3 years", history: "Domestic vendor wires monthly; no international wires" },
    correct_answer: "velocity_concern",
    tags: ["high_risk","multiweek_burst","international","new_beneficiary"],
    expected_signals: ["new_international_beneficiary","deviation_from_history","repeated_same_beneficiary","high_risk_geography"],
    risk_badges: ["International"],
    transactions: [
      tx("Jan 4",  120000.00, "Bergmann Technik GmbH", "Corporate Bank Account", "Germany", ["intl"]),
      tx("Jan 19", 180000.00, "Bergmann Technik GmbH", "Corporate Bank Account", "Germany", ["intl"]),
      tx("Feb 2",  210000.00, "Bergmann Technik GmbH", "Corporate Bank Account", "Germany", ["intl"])
    ]
  },
  {
    id: "S6_CORP_DOMESTIC_BURST_SAME_RECIP",
    title: "Corporate → same corporate beneficiary — burst over 18 days",
    source: { type: "Corporate Operating", tenure: "5 years", history: "Quarterly vendor wires; current burst is new" },
    correct_answer: "velocity_concern",
    tags: ["multiweek_burst","domestic","new_behavior"],
    expected_signals: ["clustered_activity","repeated_same_beneficiary","deviation_from_history","varied_amounts"],
    risk_badges: ["Burst pattern"],
    transactions: [
      tx("Apr 3",  89000.00, "Northline Logistics Inc.", "Corporate Bank Account", "USA", []),
      tx("Apr 8",  76000.00, "Northline Logistics Inc.", "Corporate Bank Account", "USA", []),
      tx("Apr 14", 92000.00, "Northline Logistics Inc.", "Corporate Bank Account", "USA", []),
      tx("Apr 21", 105000.00,"Northline Logistics Inc.", "Corporate Bank Account", "USA", [])
    ]
  },
  {
    id: "S7_TRUST_DOMESTIC_STABLE",
    title: "Trust → domestic beneficiary — stable annual distribution (benign)",
    source: { type: "Irrevocable Trust", tenure: "10 years", history: "Annual beneficiary distributions each December" },
    correct_answer: "no_concern",
    tags: ["stable_cadence","domestic"],
    expected_signals: ["stable_cadence_years","same_counterparty","domestic_destination","consistent_amount_band"],
    risk_badges: ["Stable cadence","Domestic"],
    transactions: [
      tx("Dec 15, 2022", 75000.00, "M. Patel", "Individual Bank Account", "USA", []),
      tx("Dec 15, 2023", 76000.00, "M. Patel", "Individual Bank Account", "USA", []),
      tx("Dec 16, 2024", 75500.00, "M. Patel", "Individual Bank Account", "USA", []),
      tx("Dec 16, 2025", 76500.00, "M. Patel", "Individual Bank Account", "USA", [])
    ]
  },
  {
    id: "S8_INDIVIDUAL_COINBASE_ESCALATION",
    title: "Individual Savings → Coinbase — escalating amounts over 6 weeks",
    source: { type: "Individual Savings", tenure: "4 years", history: "No prior crypto wires; occasional ACH only" },
    correct_answer: "velocity_concern",
    tags: ["high_risk","multiweek_burst","crypto","escalation","new_behavior"],
    expected_signals: ["crypto_platform","deviation_from_history","escalating_amounts","repeated_same_beneficiary"],
    risk_badges: ["Crypto platform","Escalation"],
    transactions: [
      tx("Jun 1",  15000.00, "Coinbase", "Crypto Platform", "USA", ["crypto"]),
      tx("Jun 13", 35000.00, "Coinbase", "Crypto Platform", "USA", ["crypto"]),
      tx("Jun 27", 80000.00, "Coinbase", "Crypto Platform", "USA", ["crypto"]),
      tx("Jul 12", 150000.00,"Coinbase", "Crypto Platform", "USA", ["crypto"])
    ]
  },
  {
    id: "S9_CORP_INTL_THAILAND_MIXED",
    title: "Corporate → multiple new Thailand beneficiaries — mixed burst",
    source: { type: "Corporate Operating", tenure: "2 years", history: "Primarily domestic; no Thailand wires" },
    correct_answer: "velocity_concern",
    tags: ["high_risk","multiweek_burst","international","new_behavior"],
    expected_signals: ["high_risk_geography","new_international_beneficiary","clustered_activity","deviation_from_history"],
    risk_badges: ["International","High-risk geography"],
    transactions: [
      tx("Oct 4",  110000.00, "S. Kittipong", "Individual Bank Account", "Thailand", ["intl"]),
      tx("Oct 9",  125000.00, "S. Kittipong", "Individual Bank Account", "Thailand", ["intl"]),
      tx("Oct 20", 99000.00,  "Bangkok Trade Co.", "Corporate Bank Account", "Thailand", ["intl"]),
      tx("Nov 2",  140000.00, "Bangkok Trade Co.", "Corporate Bank Account", "Thailand", ["intl"])
    ]
  },
  {
    id: "S10_LLC_ONE_MILLION_INTL",
    title: "LLC → new international corporate beneficiary — $1,000,000 wire then follow-ons",
    source: { type: "LLC Operating", tenure: "1 year", history: "Low activity; no wires in prior 6 months" },
    correct_answer: "velocity_concern",
    tags: ["high_risk","multiweek_burst","international","escalation","new_beneficiary"],
    expected_signals: ["new_international_beneficiary","deviation_from_history","clustered_activity","high_risk_geography"],
    risk_badges: ["International","High amount","New beneficiary"],
    transactions: [
      tx("Feb 6",  1000000.00, "Manila Digital Ventures Ltd.", "Corporate Bank Account", "Philippines", ["intl"]),
      tx("Feb 20", 250000.00,  "Manila Digital Ventures Ltd.", "Corporate Bank Account", "Philippines", ["intl"]),
      tx("Mar 1",  175000.00,  "Manila Digital Ventures Ltd.", "Corporate Bank Account", "Philippines", ["intl"])
    ]
  }
];

export function pickScenarios(count){
  // Ensure the 3 core scenarios appear, then fill from the rest without duplicates.
  const core = ["S1_SYLVIA_THAI","S2_TRUST_CRYPTO_CLUSTER","S3_WIDGETS_PLUS_STABLE"];
  const pool = SCENARIOS.slice();

  const byId = new Map(pool.map(s => [s.id, s]));
  const selected = core.map(id => byId.get(id)).filter(Boolean);

  const remaining = pool.filter(s => !core.includes(s.id));
  // deterministic shuffle-ish
  const shuffled = remaining.sort((a,b) => a.id.localeCompare(b.id));

  while(selected.length < count && shuffled.length){
    selected.push(shuffled.shift());
  }
  return selected.slice(0, count);
}
