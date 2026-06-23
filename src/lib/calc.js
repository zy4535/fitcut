// Pure fitness math — no UI, no I/O. Easy to read and to test.

export const ACTIVITY = [
  { k: "sed", label: "Sedentary (desk, little exercise)", f: 1.2 },
  { k: "light", label: "Light (1–3 days/wk)", f: 1.375 },
  { k: "mod", label: "Moderate (3–5 days/wk)", f: 1.55 },
  { k: "very", label: "Very active (6–7 days/wk)", f: 1.725 },
];

export const CARDIO_METS = {
  "Cycling (stationary)": 7.0, Elliptical: 5.0, "Walking (outdoor)": 3.8,
  Rowing: 7.0, "Stair climber": 9.0, Other: 6.0,
};

export const lbToKg = (lb) => lb * 0.453592;
export const inToCm = (i) => i * 2.54;
// Local calendar date (YYYY-MM-DD). Using UTC here would roll over to the next
// day in the evening for western timezones and hide the current day's entries.
function localDateInTz(tz) {
  const opts = { year: "numeric", month: "2-digit", day: "2-digit" };
  if (tz) opts.timeZone = tz;
  return new Intl.DateTimeFormat("en-CA", opts).format(new Date()); // YYYY-MM-DD
}
let _tz = null;                                  // null = follow the device
export function setTimezone(tz) { _tz = tz || null; }
export const todayStr = () => localDateInTz(_tz);
export const deviceTimezone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; } };
export const COMMON_TIMEZONES = [
  { label: "Pacific Time (US & Canada)", tz: "America/Los_Angeles" },
  { label: "Mountain Time (US & Canada)", tz: "America/Denver" },
  { label: "Central Time (US & Canada)", tz: "America/Chicago" },
  { label: "Eastern Time (US & Canada)", tz: "America/New_York" },
  { label: "Alaska Time", tz: "America/Anchorage" },
  { label: "Hawaii Time", tz: "Pacific/Honolulu" },
  { label: "Mexico City", tz: "America/Mexico_City" },
  { label: "Brazil (São Paulo)", tz: "America/Sao_Paulo" },
  { label: "UTC", tz: "UTC" },
  { label: "UK / Ireland (London)", tz: "Europe/London" },
  { label: "Central Europe (Paris, Berlin)", tz: "Europe/Paris" },
  { label: "Eastern Europe (Athens, Cairo)", tz: "Europe/Athens" },
  { label: "India (Kolkata)", tz: "Asia/Kolkata" },
  { label: "Vietnam / Thailand (UTC+7)", tz: "Asia/Ho_Chi_Minh" },
  { label: "China (Shanghai)", tz: "Asia/Shanghai" },
  { label: "Singapore / Philippines", tz: "Asia/Singapore" },
  { label: "Japan (Tokyo)", tz: "Asia/Tokyo" },
  { label: "Korea (Seoul)", tz: "Asia/Seoul" },
  { label: "Australia West (Perth)", tz: "Australia/Perth" },
  { label: "Australia East (Sydney)", tz: "Australia/Sydney" },
  { label: "New Zealand (Auckland)", tz: "Pacific/Auckland" },
];
export const round = (n) => Math.round(n);
export const r1 = (n) => Math.round(n * 10) / 10;

export function mifflin({ sex, age, heightIn, currentWeight }) {
  const kg = lbToKg(currentWeight), cm = inToCm(heightIn);
  return sex === "female"
    ? 10 * kg + 6.25 * cm - 5 * age - 161
    : 10 * kg + 6.25 * cm - 5 * age + 5;
}

export function deriveTargets(profile, liveWeight) {
  if (!profile || !profile.age || !profile.heightIn || !profile.currentWeight ||
      !profile.goalWeight || !profile.goalDate) return null;
  const mode = profile.mode || "cut";
  // Use the latest weigh-in as today's weight when available, so the budget
  // self-corrects as you lose/gain. Falls back to the setup weight.
  const cw = liveWeight != null ? liveWeight : profile.currentWeight;
  const adapted = liveWeight != null && Math.round(liveWeight) !== Math.round(profile.currentWeight);
  const bmr = mifflin({ ...profile, currentWeight: cw });
  const factor = ACTIVITY.find((a) => a.k === profile.activity)?.f ?? 1.375;
  const tdee = bmr * factor;
  const days = Math.max(1, Math.round((new Date(profile.goalDate) - new Date()) / 86400000)); // target date is fixed

  const override = !!profile.override;       // user acknowledged the risks of a faster pace
  let lbsDelta, needed, cap, proteinTarget, sign;
  if (mode === "bulk") {
    lbsDelta = Math.max(0, profile.goalWeight - cw);
    cap = tdee * 0.2;                         // lean-bulk reference rate
    proteinTarget = Math.round(profile.goalWeight * 0.9);
    sign = 1;
  } else {
    lbsDelta = Math.max(0, cw - profile.goalWeight);
    cap = tdee * 0.25;                        // ~1–2 lb/wk reference rate
    proteinTarget = Math.round(cw * 0.9);
    sign = -1;
  }
  needed = (lbsDelta * 3500) / days;          // what hitting the goal by the fixed date now requires
  const aggressive = needed > cap;            // faster than the recommended reference rate
  // The cap is only a default. Once the user acknowledges the risks, use their full pace.
  let adjust = aggressive && !override ? cap : needed;
  // Absolute backstop: never output a dangerous/nonsensical budget, even when acknowledged.
  adjust = Math.min(adjust, tdee * (mode === "bulk" ? 0.5 : 0.6));
  const budget = Math.round(tdee + sign * adjust);

  return {
    mode, bmr: round(bmr), tdee: round(tdee), budget, adjust: round(adjust),
    proteinTarget, days, lbsDelta: r1(lbsDelta), aggressive, override,
    liveWeight: r1(cw), adapted,
    cap: round(cap), paceLbWk: r1((adjust * 7) / 3500),
    requestedAdjust: round(needed), requestedPaceLbWk: r1((needed * 7) / 3500),
    cappedPaceLbWk: r1((cap * 7) / 3500),
  };
}

// ACSM treadmill metabolic equations -> kcal for the bout.
export function acsmTreadmill(speedMph, inclinePct, minutes, weightLb) {
  const S = speedMph * 26.8224;             // m/min
  const G = inclinePct / 100;
  const vo2 = speedMph < 4.0
    ? 0.1 * S + 1.8 * S * G + 3.5            // walking
    : 0.2 * S + 0.9 * S * G + 3.5;          // running
  const kcalMin = (vo2 * lbToKg(weightLb)) / 1000 * 5; // 5 kcal per L O2
  return Math.max(0, kcalMin * minutes);
}

export function metCardio(met, minutes, weightLb) {
  return (met * 3.5 * lbToKg(weightLb)) / 200 * minutes;
}
