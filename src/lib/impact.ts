import { activeRequests, migrateRequests, reportedNeeds, unitsFor, urgencyShare, type ResourceRequest } from "./resource-requests";
import { normalizeAssessmentVersions } from "./assessment-versions";
export type Electricity = "reliable" | "intermittent" | "none" | "unknown";
export type Internet = "reliable" | "limited" | "none" | "unknown";
export type Verification = "unverified" | "pending_review" | "under_review" | "verified";
export const NEEDS = [
  "Digital literacy",
  "Reading materials",
  "Teacher training",
  "STEM resources",
  "Classroom infrastructure",
] as const;
export type Need = (typeof NEEDS)[number];

export interface Evidence {
  id: string;
  name: string;
  type: string;
  size: number;
  /** Small local image preview (data URL) only; documents are never stored. */
  preview?: string | undefined;
}

export interface School {
  id: string;
  name: string;
  region: string;
  /** Community / town the school belongs to (approximate location only). */
  community?: string | undefined;
  students: number;
  /** Total computers */
  computers?: number | undefined;
  workingComputers?: number | undefined;
  classrooms?: number | undefined;
  teachers?: number | undefined;
  electricity: Electricity;
  reliableElectricity?: boolean | undefined;
  solarPowerRequested?: boolean | undefined;
  internet: Internet;
  needs: Need[];
  urgentNeed?: Need | undefined;
  comments?: string | undefined;
  evidence?: Evidence[] | undefined;
  verification?: Verification | undefined;
  sample?: boolean | undefined;
  registrationId?: string | undefined;
  reviewMessage?: string | undefined;
  requests?: ResourceRequest[] | undefined;
  /** Timestamp identifying the sole current submission; history snapshots are inactive. */
  assessmentSubmittedAt?: string | undefined;
  history?: { at: string; status: Verification; kind: "submission" | "review"; message?: string | undefined; requestId?: string | undefined; requestStatus?: string | undefined; snapshot?: Omit<School, "history"> | undefined }[] | undefined;
}

export const VERIFICATION_LABEL: Record<Verification, string> = {
  unverified: "Unverified",
  pending_review: "Pending Review",
  under_review: "Under Review",
  verified: "Verified (demo)",
};

const SAMPLE_COMMUNITY: Record<string, string> = { s1: "Mbalmayo", s2: "Kousseri", s3: "Buea", s4: "Bertoua", s5: "Bafoussam" };
const DEMO_SCHOOL_NAMES: Record<string, string> = {
  s1: "School Alpha", s2: "School Bravo", s3: "School Charlie", s4: "School Delta", s5: "School Echo",
};

export function normalizeSchool(s: School): School {
  s = normalizeAssessmentVersions(s);
  const working = s.workingComputers ?? s.computers;
  return {
    ...s,
    name: DEMO_SCHOOL_NAMES[s.id] ?? s.name,
    community: s.community?.trim() || (s.sample ? SAMPLE_COMMUNITY[s.id] : undefined),
    workingComputers: working === undefined ? undefined : s.computers === undefined ? working : Math.min(working, s.computers),
    verification: s.verification ?? "unverified",
    evidence: s.evidence ?? [],
    requests: migrateRequests({ ...s, community: s.community?.trim() || (s.sample ? SAMPLE_COMMUNITY[s.id] : undefined) }),
    urgentNeed: s.urgentNeed && s.needs.includes(s.urgentNeed) ? s.urgentNeed : undefined,
  };
}

export const REGIONS = [
  "Adamawa", "Centre", "East", "Far North", "Littoral",
  "North", "Northwest", "South", "Southwest", "West",
];

/** Fictional structured resource request attached to a sample school (illustrative demo data). */
const sampleRequest = (schoolId: string, community: string, region: string, n: number,
  category: ResourceRequest["category"], resource: string, quantity: number,
  urgency: NonNullable<ResourceRequest["urgency"]>, reason: string): ResourceRequest => ({
  id: `${schoolId}-req-${n}`, schoolId, registrationId: "", community, region,
  category, resource, quantity, units: unitsFor(category), urgency, primary: n === 1,
  reason, evidence: [], status: "pending_review", reviewHistory: [], submittedAt: "2026-10-01T09:00:00.000Z",
});

export const SAMPLE_SCHOOLS: School[] = ([
  { id: "s1", community: "Mbalmayo", name: "School Alpha", region: "Centre", students: 820, computers: 6, electricity: "intermittent", internet: "limited", needs: ["Digital literacy", "Teacher training"], sample: true,
    requests: [sampleRequest("s1", "Mbalmayo", "Centre", 1, "Digital equipment", "Laptops", 25, "High", "Only 6 working computers for 820 students; a laptop pool would support digital literacy classes.")] },
  { id: "s2", community: "Kousseri", name: "School Bravo", region: "Far North", students: 540, computers: 0, electricity: "none", internet: "none", needs: ["Reading materials", "Classroom infrastructure", "Teacher training"], sample: true,
    requests: [sampleRequest("s2", "Kousseri", "Far North", 1, "Books and educational materials", "Reading books", 150, "High", "No functioning library; reading books are the most urgent low-tech need.")] },
  { id: "s3", community: "Buea", name: "School Charlie", region: "Southwest", students: 410, computers: 18, electricity: "reliable", internet: "reliable", needs: ["STEM resources"], sample: true,
    requests: [sampleRequest("s3", "Buea", "Southwest", 1, "STEM and laboratory equipment", "Science laboratory kits", 10, "Medium", "Reliable power and internet are in place; science kits would extend the existing computer lab into STEM practicals.")] },
  { id: "s4", community: "Bertoua", name: "School Delta", region: "East", students: 630, computers: 2, electricity: "intermittent", internet: "none", needs: ["Digital literacy", "STEM resources", "Reading materials"], sample: true,
    requests: [
      sampleRequest("s4", "Bertoua", "East", 1, "Digital equipment", "Laptops", 20, "Critical", "2 working computers for 630 students; digital literacy teaching is currently impossible."),
      sampleRequest("s4", "Bertoua", "East", 2, "Books and educational materials", "Textbooks", 100, "Medium", "Textbook shortage across core subjects."),
    ] },
  { id: "s5", community: "Bafoussam", name: "School Echo", region: "West", students: 950, computers: 25, electricity: "reliable", internet: "limited", needs: ["Digital literacy", "Teacher training"], sample: true,
    requests: [sampleRequest("s5", "Bafoussam", "West", 1, "Teacher training", "Digital literacy training", 12, "Medium", "Teachers need training to make use of the existing computer room.")] },
] as School[]).map((school, i) => normalizeSchool({ ...school, registrationId: `CN-DEMO-${String(i + 1).padStart(3, "0")}` }));

export type FactorKey = "needs" | "device" | "electricity" | "internet" | "conditions";
export interface Factor {
  key: FactorKey;
  label: string;
  points: number;
  max: number;
  /** True when the input is unknown/missing; the factor is excluded and the score re-scaled. */
  unknown: boolean;
  detail: string;
}

/** Illustrative weights — not scientifically validated. */
export const WEIGHTS = {
  needsPerItem: 5, needsMaxItems: 5, urgentBonus: 5, // needs: max 30
  deviceDigital: 25, deviceOther: 10,
  electricityDigital: 20, electricityOther: 10,
  internetDigital: 10, internetOther: 5,
  conditionsTeacher: 8, conditionsClassroom: 7, // max 15
  insufficientShare: 0.3, // if >30% of possible points are unknown, require more assessment
};
export const DIGITAL_NEEDS: Need[] = ["Digital literacy", "STEM resources"];

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Deterministic, illustrative 0–100 priority score.
 * Score = earned points / max points of known factors × 100. Unknown factors are excluded (not treated as worst)
 * and flagged. Size alone never raises the score — only ratios (computers, teachers, classrooms per student) are used.
 */
export function scoreSchool(s: School) {
  const W = WEIGHTS;
  const needs = reportedNeeds(s);
  const requests = activeRequests(s);
  const digital = needs.some((n) => DIGITAL_NEEDS.includes(n));
  const f: Factor[] = [];

  const nNeeds = Math.min(s.requests ? new Set(requests.map((r) => r.category)).size : needs.length, W.needsMaxItems);
  // Unrecorded legacy urgency is excluded rather than treated as the worst or as zero.
  const assessed = requests.filter((r) => r.submittedAt && r.urgency);
  const compactUrgencyUnknown = requests.length > 0 && requests.every((r) => r.assessmentFormat === "compact") && !assessed.length && !s.urgentNeed;
  const urgent = assessed.length ? r1(W.urgentBonus * assessed.reduce((sum, r) => sum + (r.urgency ? urgencyShare[r.urgency] : 0), 0) / assessed.length) : s.urgentNeed && needs.includes(s.urgentNeed) ? W.urgentBonus : 0;
  f.push({ key: "needs", label: "Reported needs", points: nNeeds * W.needsPerItem + urgent, max: W.needsMaxItems * W.needsPerItem + (compactUrgencyUnknown ? 0 : W.urgentBonus), unknown: false,
    detail: `${nNeeds} distinct need categories × ${W.needsPerItem} (capped at ${W.needsMaxItems}) + ${urgent} self-reported urgency points (max ${W.urgentBonus}; average, not sum)` });

  const recordedWorking = s.workingComputers ?? s.computers;
  const working = recordedWorking === undefined ? undefined : s.computers === undefined ? recordedWorking : Math.min(recordedWorking, s.computers);
  const deviceUnknown = working === undefined || s.students <= 0;
  const ratio = !deviceUnknown && working !== undefined ? working / s.students : 0;
  const dMax = digital ? W.deviceDigital : W.deviceOther;
  const gap = 1 - Math.min(ratio / 0.1, 1);
  f.push({ key: "device", label: "Working-device gap", points: deviceUnknown ? 0 : r1(dMax * gap), max: dMax, unknown: deviceUnknown,
    detail: deviceUnknown ? "Working computers or student population not recorded — excluded, needs assessment" : `${working} working ÷ ${s.students} students = ${(ratio * 100).toFixed(1)} per 100 (target 10) → ${Math.round(gap * 100)}% gap × ${dMax}` });

  const eMax = digital ? W.electricityDigital : W.electricityOther;
  const eShare = { none: 1, intermittent: 0.5, reliable: 0, unknown: 0 }[s.electricity];
  f.push({ key: "electricity", label: "Electricity", points: r1(eMax * eShare), max: eMax, unknown: s.electricity === "unknown",
    detail: s.electricity === "unknown" ? "Unknown — excluded, needs assessment" : `${s.electricity} → ${eShare * 100}% × ${eMax}` });

  const iMax = digital ? W.internetDigital : W.internetOther;
  const internet = s.internet ?? "unknown";
  const iShare = { none: 1, limited: 0.5, reliable: 0, unknown: 0 }[internet];
  f.push({ key: "internet", label: "Internet", points: r1(iMax * iShare), max: iMax, unknown: internet === "unknown",
    detail: internet === "unknown" ? "Unknown — excluded, needs assessment" : `${internet} → ${iShare * 100}% × ${iMax}` });

  const cMax = W.conditionsTeacher + W.conditionsClassroom;
  if (s.teachers && s.classrooms && s.teachers > 0 && s.classrooms > 0) {
    const ptr = s.students / s.teachers, spc = s.students / s.classrooms;
    const t = Math.min(Math.max((ptr - 40) / 40, 0), 1), c = Math.min(Math.max((spc - 40) / 60, 0), 1);
    f.push({ key: "conditions", label: "Learning conditions", points: r1(t * W.conditionsTeacher + c * W.conditionsClassroom), max: cMax, unknown: false,
      detail: `${ptr.toFixed(0)} students/teacher (40→80 scale) and ${spc.toFixed(0)} students/classroom (40→100 scale)` });
  } else {
    f.push({ key: "conditions", label: "Learning conditions", points: 0, max: cMax, unknown: true,
      detail: "Teachers or classrooms not recorded (or zero) — excluded, needs assessment" });
  }

  const known = f.filter((x) => !x.unknown);
  const earned = known.reduce((a, x) => a + x.points, 0);
  const possible = f.reduce((a, x) => a + x.max, 0);
  const knownMax = known.reduce((a, x) => a + x.max, 0);
  const unknownShare = possible ? (possible - knownMax) / possible : 1;
  const total = knownMax ? Math.min(100, Math.max(0, Math.round((earned / knownMax) * 100))) : 0;
  const provisional = (s.verification ?? "unverified") !== "verified" || requests.some((r) => r.status !== "verified");
  const insufficient = unknownShare > W.insufficientShare;
  const get = (k: FactorKey) => f.find((x) => x.key === k)?.points ?? 0;
  return { factors: f, digital, earned: r1(earned), knownMax, possible, unknownShare, total, provisional, insufficient,
    needs: get("needs"), device: get("device"), electricity: get("electricity"), internet: get("internet"), ratio };
}

export type OptionKey = "equipment" | "infrastructure" | "lowtech";
export interface SimOption {
  key: OptionKey;
  title: string;
  description: string;
  cost: number;
  fits: boolean;
  prerequisites: string[];
  warnings: string[];
  students: number;
  relevant?: boolean;
}

export function simulate(s: School, budget: number): SimOption[] {
  const requests = activeRequests(s);
  const structured = requests.some((r) => r.submittedAt);
  const laptopRequests = requests.filter((r) => r.category === "Digital equipment" && ["Laptops", "Desktop computers"].includes(r.resource));
  const requestedDevices = laptopRequests.reduce((n, r) => n + (r.quantity ?? 0), 0);
  const devices = structured ? Math.min(20, requestedDevices) : 20;
  const digital = reportedNeeds(s).includes("Digital literacy");
  const equipmentRelevant = !structured || requestedDevices > 0;
  const infraRelevant = !structured || requests.some((r) => ["Electricity and energy infrastructure", "Internet and connectivity"].includes(r.category)) || (digital && s.electricity !== "reliable");
  const lowRelevant = !structured || requests.some((r) => ["Books and educational materials", "Teacher training"].includes(r.category));
  const equipCost = devices * 400 + 800;
  const solar = s.electricity === "reliable" ? 0 : s.electricity === "none" ? 6500 : 3500;
  const net = s.internet === "reliable" ? 0 : 1800;
  const infraCost = solar + net + 700;
  const lowCost = 2500 + Math.ceil(s.students / 100) * 150;

  const eqWarn: string[] = [];
  if (s.electricity !== "reliable") eqWarn.push("Electricity is not reliable — devices may sit unused or be damaged.");
  if (s.internet === "none") eqWarn.push("No internet: plan for offline content.");
  if (s.electricity === "unknown" || s.internet === "unknown") eqWarn.push("Power or internet status is unknown — confirm on site before buying devices.");
  if (!digital) eqWarn.push("Digital literacy is not a reported primary need.");

  if (!equipmentRelevant) eqWarn.push("No supported computer request reported — additional planning required, not a laptop allocation.");
  const infWarn: string[] = [];
  if (!infraRelevant) infWarn.push("No relevant power or connectivity need reported.");
  if (infraCost <= 700) infWarn.push("School already has reliable power and internet — little added value.");
  if ((s.workingComputers ?? s.computers) === 0) infWarn.push("No computers yet; infrastructure alone won't deliver digital learning.");

  const lowWarn: string[] = [];
  if (!lowRelevant) lowWarn.push("No supported book or training request reported — additional planning required.");
  if (structured) lowWarn.push("Requested quantities are listed below; this existing bundled scenario is not an item-by-item quotation.");
  if (s.needs.length === 1 && s.needs[0] === "STEM resources") lowWarn.push("May not address the STEM-focused need.");

  return [
    {
      key: "equipment", relevant: equipmentRelevant, title: "Equipment-first",
      description: `${devices} refurbished laptops, offline content, basic training.`,
      cost: equipCost, fits: equipCost <= budget,
      prerequisites: ["Reliable electricity", "Secure storage room", "Trained staff member"],
      warnings: eqWarn,
      students: Math.min(s.students, devices * 15),
    },
    {
      key: "infrastructure", relevant: infraRelevant, title: "Infrastructure-first",
      description: "Solar power and connectivity to enable future digital learning.",
      cost: infraCost, fits: infraCost <= budget,
      prerequisites: ["Roof/site suitable for solar", "Maintenance plan", "Community agreement"],
      warnings: infWarn,
      students: Math.round(s.students * 0.6),
    },
    {
      key: "lowtech", relevant: lowRelevant, title: "Low-tech learning support",
      description: "Printed readers, teacher training, and learning kits — no power needed.",
      cost: lowCost, fits: lowCost <= budget,
      prerequisites: ["Teacher availability for training", "Dry storage for materials"],
      warnings: lowWarn,
      students: Math.min(s.students, 700),
    },
  ];
}

export function recommend(s: School, opts: SimOption[]) {
  const fitting = opts.filter((o) => o.fits && o.relevant !== false);
  if (!fitting.length) return { option: null, reason: "No supported option fits the reported requests and current budget. Additional request-specific planning is required." };
  const pick = (k: OptionKey) => fitting.find((o) => o.key === k);
  const infrastructure = pick("infrastructure"), lowtech = pick("lowtech"), equipment = pick("equipment");
  if (s.electricity !== "reliable" && infrastructure)
    return { option: infrastructure, reason: "Unreliable power is the main barrier; fixing it first protects any later device investment." };
  if (s.electricity !== "reliable" && lowtech)
    return { option: lowtech, reason: "Without reliable power, low-tech support can help students now while infrastructure funding is sought." };
  if (s.electricity === "reliable" && reportedNeeds(s).includes("Digital literacy") && equipment)
    return { option: equipment, reason: "Power is reliable and digital literacy is a reported need, so devices can be used immediately." };
  const best = [...fitting].sort((a, b) => b.students / b.cost - a.students / a.cost)[0];
  return { option: best, reason: "This option serves the most students per dollar among options within budget." };
}
