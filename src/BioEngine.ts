/**
 * BioEngine.ts
 * Pure biometric calculation engine — zero side-effects, fully client-side.
 * All measurements in SI units unless otherwise stated.
 */

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface BiometricInput {
  /** Weight in kilograms */
  weight: number
  /** Height in metres */
  height: number
  /** Body fat percentage (0–100) */
  bodyFatPercent: number
  /** Age in years */
  age: number
  /** Biological sex for reference norm selection */
  sex: 'male' | 'female'
  /** Segmental lean mass in kg: [leftArm, rightArm, leftLeg, rightLeg, torso] */
  segmental?: [number, number, number, number, number]
  /** Extracellular water in litres */
  ecw?: number
  /** Total body water in litres */
  tbw?: number
  /** Basal body temperature in °C */
  bbt?: number
  /** Resting heart rate in bpm */
  rhr?: number
}

export interface SegmentalData {
  leftArm: number
  rightArm: number
  leftLeg: number
  rightLeg: number
  torso: number
}

// ─── Core Composition ─────────────────────────────────────────────────────────

/** Fat-Free Mass in kg */
export function calcFFM(weight: number, bodyFatPercent: number): number {
  return weight * (1 - bodyFatPercent / 100)
}

/** Fat Mass in kg */
export function calcFatMass(weight: number, bodyFatPercent: number): number {
  return weight * (bodyFatPercent / 100)
}

/**
 * Fat-Free Mass Index (FFMI)
 * FFMI = FFM / height²
 * Normalised FFMI adds correction for heights > 1.80 m:
 *   FFMI_norm = FFMI + 6.1 × (1.80 − height)
 */
export function calcFFMI(
  weight: number,
  height: number,
  bodyFatPercent: number,
): { ffmi: number; ffmiNorm: number; rating: string } {
  const ffm = calcFFM(weight, bodyFatPercent)
  const ffmi = ffm / (height * height)
  // Normalisation formula (Kouri et al. 1995)
  const ffmiNorm = ffmi + 6.1 * (1.8 - height)
  return { ffmi: round2(ffmi), ffmiNorm: round2(ffmiNorm), rating: rateFFMI(ffmiNorm) }
}

function rateFFMI(ffmiNorm: number): string {
  if (ffmiNorm < 16) return 'Below Average'
  if (ffmiNorm < 18) return 'Average'
  if (ffmiNorm < 20) return 'Above Average'
  if (ffmiNorm < 22) return 'Excellent'
  if (ffmiNorm < 25) return 'Superior'
  return 'Elite / Enhanced'
}

// ─── BMR (Katch-McArdle) ──────────────────────────────────────────────────────

/**
 * BMR = 370 + (21.6 × FFM[kg])
 * Reference: Katch-McArdle formula.
 */
export function calcBMR(ffm: number): number {
  return round2(370 + 21.6 * ffm)
}

/** TDEE for common activity levels (Mifflin multipliers). */
export function calcTDEE(
  bmr: number,
  activity: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
): number {
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }
  return round2(bmr * multipliers[activity])
}

// ─── BMI ──────────────────────────────────────────────────────────────────────

export function calcBMI(weight: number, height: number): { bmi: number; category: string } {
  const bmi = round2(weight / (height * height))
  return { bmi, category: rateBMI(bmi) }
}

function rateBMI(bmi: number): string {
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25) return 'Normal'
  if (bmi < 30) return 'Overweight'
  if (bmi < 35) return 'Obese I'
  if (bmi < 40) return 'Obese II'
  return 'Obese III'
}

// ─── SMI — Skeletal Muscle Index ──────────────────────────────────────────────

/**
 * Appendicular Lean Mass (ALM) = sum of limb lean masses.
 * SMI = ALM / height²  (kg/m²)
 * Sarcopenia thresholds (Studenski et al.):
 *   Men   < 7.0 kg/m²  → Sarcopenia
 *   Women < 5.5 kg/m²  → Sarcopenia
 */
export function calcSMI(
  segmental: [number, number, number, number, number],
  height: number,
  sex: 'male' | 'female',
): { alm: number; smi: number; sarcopeniaRisk: string } {
  const [lArm, rArm, lLeg, rLeg] = segmental
  const alm = lArm + rArm + lLeg + rLeg
  const smi = alm / (height * height)
  const threshold = sex === 'male' ? 7.0 : 5.5
  const sarcopeniaRisk = smi < threshold ? 'At Risk' : smi < threshold * 1.1 ? 'Borderline' : 'Normal'
  return { alm: round2(alm), smi: round2(smi), sarcopeniaRisk }
}

// ─── ECW/TBW Ratio ────────────────────────────────────────────────────────────

/**
 * ECW/TBW ratio — hydration and inflammation index.
 * Normal range: 0.36–0.39
 * > 0.40 → Possible oedema / inflammation
 */
export function calcECWRatio(ecw: number, tbw: number): { ratio: number; status: string } {
  const ratio = round2(ecw / tbw)
  let status = 'Normal'
  if (ratio > 0.4) status = 'Elevated — Possible Oedema/Inflammation'
  else if (ratio < 0.33) status = 'Low — Possible Dehydration'
  return { ratio, status }
}

// ─── Thyroid Health Monitor ───────────────────────────────────────────────────

export interface ThyroidInput {
  /** Measured BMR in kcal/day (e.g. from indirect calorimetry) */
  measuredBMR?: number
  /** Katch-McArdle predicted BMR */
  predictedBMR: number
  /** Basal Body Temperature in °C */
  bbt?: number
  /** Resting Heart Rate in bpm */
  rhr?: number
}

export interface ThyroidResult {
  bmrDeviation: number | null
  bbtStatus: string
  rhrStatus: string
  overallFlag: 'Normal' | 'Possible Hypothyroidism' | 'Possible Hyperthyroidism' | 'Inconclusive'
  details: string[]
}

export function assessThyroidHealth(input: ThyroidInput): ThyroidResult {
  const details: string[] = []
  let hypoSignals = 0
  let hyperSignals = 0

  // BMR Deviation
  let bmrDeviation: number | null = null
  if (input.measuredBMR !== undefined) {
    bmrDeviation = round2(((input.measuredBMR - input.predictedBMR) / input.predictedBMR) * 100)
    if (bmrDeviation < -10) {
      hypoSignals++
      details.push(`BMR ${Math.abs(bmrDeviation)}% below predicted — low metabolic rate`)
    } else if (bmrDeviation > 10) {
      hyperSignals++
      details.push(`BMR ${bmrDeviation}% above predicted — elevated metabolic rate`)
    } else {
      details.push(`BMR within ±10% of predicted (${bmrDeviation > 0 ? '+' : ''}${bmrDeviation}%)`)
    }
  }

  // BBT (normal 36.1–37.2 °C)
  let bbtStatus = 'Not provided'
  if (input.bbt !== undefined) {
    if (input.bbt < 36.1) {
      hypoSignals++
      bbtStatus = `Low (${input.bbt}°C) — possible hypothyroid`
      details.push(`BBT ${input.bbt}°C — below normal range (36.1–37.2°C)`)
    } else if (input.bbt > 37.2) {
      hyperSignals++
      bbtStatus = `Elevated (${input.bbt}°C) — possible hyperthyroid/infection`
      details.push(`BBT ${input.bbt}°C — above normal range`)
    } else {
      bbtStatus = `Normal (${input.bbt}°C)`
    }
  }

  // RHR (normal 60–100 bpm)
  // Clinical note: Bradycardia (low RHR) is a common sign of hypothyroidism;
  // tachycardia (high RHR) is associated with hyperthyroidism.
  let rhrStatus = 'Not provided'
  if (input.rhr !== undefined) {
    if (input.rhr < 60) {
      hypoSignals++
      rhrStatus = `Bradycardia (${input.rhr} bpm) — possible hypothyroid`
      details.push(`RHR ${input.rhr} bpm — bradycardia`)
    } else if (input.rhr > 90) {
      hyperSignals++
      rhrStatus = `Tachycardia (${input.rhr} bpm) — possible hyperthyroid/stress`
      details.push(`RHR ${input.rhr} bpm — tachycardia`)
    } else {
      rhrStatus = `Normal (${input.rhr} bpm)`
    }
  }

  let overallFlag: ThyroidResult['overallFlag'] = 'Normal'
  if (hypoSignals >= 2) overallFlag = 'Possible Hypothyroidism'
  else if (hyperSignals >= 2) overallFlag = 'Possible Hyperthyroidism'
  else if (hypoSignals + hyperSignals >= 2) overallFlag = 'Inconclusive'

  return { bmrDeviation, bbtStatus, rhrStatus, overallFlag, details }
}

// ─── Dynamic Nutrition Targets ────────────────────────────────────────────────

export interface NutritionTargets {
  /** g/day protein — based strictly on FFM */
  proteinMin: number
  proteinMax: number
  /** ml/day hydration — based strictly on FFM */
  hydrationMin: number
  hydrationMax: number
}

/**
 * Protein:  1.6–2.2 g per kg FFM (evidence-based range for body composition)
 * Hydration: 35–45 ml per kg FFM
 */
export function calcNutritionTargets(ffm: number): NutritionTargets {
  return {
    proteinMin: round2(ffm * 1.6),
    proteinMax: round2(ffm * 2.2),
    hydrationMin: round2(ffm * 35),
    hydrationMax: round2(ffm * 45),
  }
}

// ─── Full Analysis ────────────────────────────────────────────────────────────

export interface BioAnalysisResult {
  ffm: number
  fatMass: number
  bmi: { bmi: number; category: string }
  ffmi: { ffmi: number; ffmiNorm: number; rating: string }
  bmr: number
  tdee: Record<string, number>
  smi: { alm: number; smi: number; sarcopeniaRisk: string } | null
  ecwRatio: { ratio: number; status: string } | null
  thyroid: ThyroidResult | null
  nutrition: NutritionTargets
  segmental: SegmentalData | null
}

export function runFullAnalysis(input: BiometricInput): BioAnalysisResult {
  const ffm = calcFFM(input.weight, input.bodyFatPercent)
  const fatMass = calcFatMass(input.weight, input.bodyFatPercent)
  const bmi = calcBMI(input.weight, input.height)
  const ffmi = calcFFMI(input.weight, input.height, input.bodyFatPercent)
  const bmr = calcBMR(ffm)

  const tdee: Record<string, number> = {
    sedentary: calcTDEE(bmr, 'sedentary'),
    light: calcTDEE(bmr, 'light'),
    moderate: calcTDEE(bmr, 'moderate'),
    active: calcTDEE(bmr, 'active'),
    very_active: calcTDEE(bmr, 'very_active'),
  }

  const smi = input.segmental
    ? calcSMI(input.segmental, input.height, input.sex)
    : null

  const ecwRatio =
    input.ecw !== undefined && input.tbw !== undefined
      ? calcECWRatio(input.ecw, input.tbw)
      : null

  const thyroid =
    input.bbt !== undefined || input.rhr !== undefined
      ? assessThyroidHealth({
          predictedBMR: bmr,
          bbt: input.bbt,
          rhr: input.rhr,
        })
      : null

  const nutrition = calcNutritionTargets(ffm)

  const segmental = input.segmental
    ? {
        leftArm: input.segmental[0],
        rightArm: input.segmental[1],
        leftLeg: input.segmental[2],
        rightLeg: input.segmental[3],
        torso: input.segmental[4],
      }
    : null

  return {
    ffm: round2(ffm),
    fatMass: round2(fatMass),
    bmi,
    ffmi,
    bmr,
    tdee,
    smi,
    ecwRatio,
    thyroid,
    nutrition,
    segmental,
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
