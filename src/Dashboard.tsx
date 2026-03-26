/**
 * Dashboard.tsx
 * Visual representation of BioAnalysisResult using Glassmorphism cards,
 * Recharts visualisations, and Japanese Minimalist Tech 2026 aesthetics.
 */

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  Activity,
  Droplets,
  Flame,
  Zap,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Heart,
  Dumbbell,
  Scale,
} from 'lucide-react'
import type { BioAnalysisResult } from './BioEngine'

// ─── Colour palette ───────────────────────────────────────────────────────────
const CYBER_BLUE = '#00D4FF'
const ATOMIC_ORANGE = '#FF6B2B'
const GLASS_BG = 'rgba(255,255,255,0.04)'
const GLASS_BORDER = '1px solid rgba(255,255,255,0.08)'

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: 'blue' | 'orange' | 'none'
}

function Card({ children, className = '', glow = 'none' }: CardProps) {
  const glowStyle =
    glow === 'blue'
      ? { boxShadow: '0 0 24px rgba(0,212,255,0.15)' }
      : glow === 'orange'
        ? { boxShadow: '0 0 24px rgba(255,107,43,0.15)' }
        : {}
  return (
    <div
      className={`p-5 rounded-2xl transition-all duration-300 ${className}`}
      style={{ background: GLASS_BG, border: GLASS_BORDER, backdropFilter: 'blur(16px)', ...glowStyle }}
    >
      {children}
    </div>
  )
}

interface MetricRowProps {
  label: string
  value: string | number
  unit?: string
  color?: string
}
function MetricRow({ label, value, unit, color = '#e5e7eb' }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold" style={{ color }}>
        {value}
        {unit && <span className="text-gray-500 font-normal ml-1 text-xs">{unit}</span>}
      </span>
    </div>
  )
}

interface SectionHeaderProps {
  icon: React.ReactNode
  title: string
  color?: string
}
function SectionHeader({ icon, title, color = CYBER_BLUE }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span style={{ color }}>{icon}</span>
      <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color }}>
        {title}
      </h2>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

interface DashboardProps {
  result: BioAnalysisResult
  onReset: () => void
}

export default function Dashboard({ result, onReset }: DashboardProps) {
  const { ffm, fatMass, bmi, ffmi, bmr, tdee, smi, ecwRatio, thyroid, nutrition, segmental } = result

  // Radar chart data for segmental analysis
  const radarData = segmental
    ? [
        { segment: 'L.Arm', value: segmental.leftArm },
        { segment: 'R.Arm', value: segmental.rightArm },
        { segment: 'Torso', value: segmental.torso },
        { segment: 'R.Leg', value: segmental.rightLeg },
        { segment: 'L.Leg', value: segmental.leftLeg },
      ]
    : []

  // TDEE bar chart data
  const tdeeData = [
    { name: 'Sed.', kcal: tdee['sedentary'] },
    { name: 'Light', kcal: tdee['light'] },
    { name: 'Mod.', kcal: tdee['moderate'] },
    { name: 'Active', kcal: tdee['active'] },
    { name: 'V.Active', kcal: tdee['very_active'] },
  ]

  const ffmiColor = ffmi.ffmiNorm >= 22 ? CYBER_BLUE : ffmi.ffmiNorm >= 18 ? '#a3e635' : ATOMIC_ORANGE
  const thyroidColor =
    thyroid?.overallFlag === 'Normal'
      ? '#4ade80'
      : thyroid?.overallFlag === 'Inconclusive'
        ? '#facc15'
        : '#f87171'

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: CYBER_BLUE }}>
            ZENITH BIO-OS
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Body Composition Analysis — 2026</p>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-3 py-2 rounded-lg"
          style={{ background: GLASS_BG, border: GLASS_BORDER }}
        >
          <ChevronRight size={14} className="rotate-180" />
          New Analysis
        </button>
      </div>

      {/* Bento Grid — Row 1: key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card glow="blue" className="flex flex-col items-center justify-center text-center gap-1">
          <Scale size={20} style={{ color: CYBER_BLUE }} />
          <p className="text-3xl font-black" style={{ color: CYBER_BLUE }}>{ffmi.ffmiNorm}</p>
          <p className="text-xs text-gray-400 uppercase tracking-widest">FFMI (norm.)</p>
          <span className="text-xs px-2 py-0.5 rounded-full mt-1" style={{ background: ffmiColor + '22', color: ffmiColor }}>
            {ffmi.rating}
          </span>
        </Card>

        <Card className="flex flex-col items-center justify-center text-center gap-1">
          <Flame size={20} style={{ color: ATOMIC_ORANGE }} />
          <p className="text-3xl font-black" style={{ color: ATOMIC_ORANGE }}>{bmr}</p>
          <p className="text-xs text-gray-400 uppercase tracking-widest">BMR (kcal)</p>
          <span className="text-xs text-gray-500">Katch-McArdle</span>
        </Card>

        <Card className="flex flex-col items-center justify-center text-center gap-1">
          <Dumbbell size={20} style={{ color: CYBER_BLUE }} />
          <p className="text-3xl font-black text-white">{ffm}</p>
          <p className="text-xs text-gray-400 uppercase tracking-widest">FFM (kg)</p>
          <span className="text-xs text-gray-500">Fat-Free Mass</span>
        </Card>

        <Card className="flex flex-col items-center justify-center text-center gap-1">
          <Activity size={20} style={{ color: ATOMIC_ORANGE }} />
          <p className="text-3xl font-black" style={{ color: ATOMIC_ORANGE }}>{fatMass}</p>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Fat Mass (kg)</p>
          <span className="text-xs px-2 py-0.5 rounded-full mt-1"
            style={{ background: '#FF6B2B22', color: ATOMIC_ORANGE }}>
            {bmi.category}
          </span>
        </Card>
      </div>

      {/* Row 2: Composition + TDEE chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <SectionHeader icon={<Scale size={16} />} title="Body Composition" />
          <MetricRow label="BMI" value={bmi.bmi} unit="kg/m²" color="#e5e7eb" />
          <MetricRow label="BMI Category" value={bmi.category} />
          <MetricRow label="FFMI" value={ffmi.ffmi} unit="kg/m²" color={CYBER_BLUE} />
          <MetricRow label="Normalised FFMI" value={ffmi.ffmiNorm} unit="kg/m²" color={CYBER_BLUE} />
          <MetricRow label="FFMI Rating" value={ffmi.rating} color={ffmiColor} />
          <MetricRow label="Fat-Free Mass" value={ffm} unit="kg" color={CYBER_BLUE} />
          <MetricRow label="Fat Mass" value={fatMass} unit="kg" color={ATOMIC_ORANGE} />
        </Card>

        <Card>
          <SectionHeader icon={<Flame size={16} />} title="TDEE by Activity Level" color={ATOMIC_ORANGE} />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={tdeeData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#fff' }}
                formatter={(v: number) => [`${v} kcal`, 'TDEE']}
              />
              <Bar dataKey="kcal" radius={[4, 4, 0, 0]}>
                {tdeeData.map((_, i) => (
                  <Cell key={i} fill={i === 2 ? ATOMIC_ORANGE : ATOMIC_ORANGE + '88'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-1 text-center">BMR = {bmr} kcal/day</p>
        </Card>
      </div>

      {/* Row 3: Segmental + Nutrition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {segmental ? (
          <Card>
            <SectionHeader icon={<Dumbbell size={16} />} title="Segmental Analysis" />
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData} outerRadius={75}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="segment" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Radar name="Lean Mass" dataKey="value" stroke={CYBER_BLUE} fill={CYBER_BLUE} fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
            {smi && (
              <div className="mt-2 space-y-1">
                <MetricRow label="Appendicular LM" value={smi.alm} unit="kg" color={CYBER_BLUE} />
                <MetricRow label="SMI" value={smi.smi} unit="kg/m²" color={CYBER_BLUE} />
                <MetricRow
                  label="Sarcopenia Risk"
                  value={smi.sarcopeniaRisk}
                  color={smi.sarcopeniaRisk === 'Normal' ? '#4ade80' : '#facc15'}
                />
              </div>
            )}
          </Card>
        ) : (
          <Card className="flex items-center justify-center">
            <p className="text-xs text-gray-600">Segmental data not provided</p>
          </Card>
        )}

        <Card>
          <SectionHeader icon={<Droplets size={16} />} title="Dynamic Nutrition Targets" color={CYBER_BLUE} />
          <p className="text-xs text-gray-500 mb-3">Scaled strictly to Fat-Free Mass ({ffm} kg FFM)</p>
          <div className="space-y-3">
            <div className="rounded-xl p-3" style={{ background: CYBER_BLUE + '11', border: `1px solid ${CYBER_BLUE}33` }}>
              <p className="text-xs text-gray-400 mb-1">Protein Target</p>
              <p className="text-lg font-black" style={{ color: CYBER_BLUE }}>
                {nutrition.proteinMin}–{nutrition.proteinMax}
                <span className="text-xs font-normal text-gray-400 ml-1">g/day</span>
              </p>
              <p className="text-xs text-gray-500">1.6–2.2 g per kg FFM</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: '#3b82f611', border: '1px solid #3b82f633' }}>
              <p className="text-xs text-gray-400 mb-1">Hydration Target</p>
              <p className="text-lg font-black text-blue-400">
                {nutrition.hydrationMin}–{nutrition.hydrationMax}
                <span className="text-xs font-normal text-gray-400 ml-1">ml/day</span>
              </p>
              <p className="text-xs text-gray-500">35–45 ml per kg FFM</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 4: ECW/TBW + Thyroid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ecwRatio ? (
          <Card>
            <SectionHeader icon={<Droplets size={16} />} title="Hydration & Inflammation Index" />
            <MetricRow label="ECW/TBW Ratio" value={ecwRatio.ratio} color={CYBER_BLUE} />
            <MetricRow label="Reference Range" value="0.36 – 0.39" />
            <div
              className="mt-3 flex items-center gap-2 p-3 rounded-xl"
              style={{
                background:
                  ecwRatio.status === 'Normal'
                    ? '#4ade8011'
                    : '#facc1511',
                border: `1px solid ${ecwRatio.status === 'Normal' ? '#4ade8033' : '#facc1533'}`,
              }}
            >
              {ecwRatio.status === 'Normal' ? (
                <CheckCircle size={14} className="text-green-400 shrink-0" />
              ) : (
                <AlertTriangle size={14} className="text-yellow-400 shrink-0" />
              )}
              <p className="text-xs" style={{ color: ecwRatio.status === 'Normal' ? '#4ade80' : '#facc15' }}>
                {ecwRatio.status}
              </p>
            </div>
          </Card>
        ) : (
          <Card className="flex items-center justify-center">
            <p className="text-xs text-gray-600">ECW/TBW data not provided</p>
          </Card>
        )}

        {thyroid ? (
          <Card>
            <SectionHeader icon={<Heart size={16} />} title="Thyroid Health Monitor" color={thyroidColor} />
            <div
              className="mb-3 flex items-center gap-2 p-3 rounded-xl"
              style={{ background: thyroidColor + '11', border: `1px solid ${thyroidColor}33` }}
            >
              {thyroid.overallFlag === 'Normal' ? (
                <CheckCircle size={14} style={{ color: thyroidColor }} />
              ) : (
                <AlertTriangle size={14} style={{ color: thyroidColor }} />
              )}
              <p className="text-sm font-bold" style={{ color: thyroidColor }}>
                {thyroid.overallFlag}
              </p>
            </div>
            <MetricRow label="BBT Status" value={thyroid.bbtStatus} />
            <MetricRow label="RHR Status" value={thyroid.rhrStatus} />
            {thyroid.details.length > 0 && (
              <div className="mt-3 space-y-1">
                {thyroid.details.map((d, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <Zap size={11} className="shrink-0 mt-0.5" style={{ color: thyroidColor }} />
                    <p className="text-xs text-gray-400">{d}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <Card className="flex items-center justify-center">
            <p className="text-xs text-gray-600">BBT/RHR data not provided</p>
          </Card>
        )}
      </div>

      {/* Footer disclaimer */}
      <p className="text-center text-xs text-gray-700 pb-4">
        Zenith Bio-OS processes all data client-side. No health data is transmitted externally. Not a substitute for
        professional medical advice.
      </p>
    </div>
  )
}
