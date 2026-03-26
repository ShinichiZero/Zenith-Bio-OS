/**
 * App.tsx
 * Main entry point for Zenith Bio-OS.
 * Handles the input form, validates & sanitises inputs, runs the bio-engine,
 * persists results encrypted, and renders the Dashboard.
 */

import { useState, useEffect, useCallback } from 'react'
import { Zap, Shield } from 'lucide-react'
import { runFullAnalysis, type BiometricInput, type BioAnalysisResult } from './BioEngine'
import { parseNumericInput, saveSecure, loadSecure, activateAntiTamper } from './SecurityController'
import Dashboard from './Dashboard'

// Activate anti-tamper measures on module load
activateAntiTamper()

// ─── Form state type ───────────────────────────────────────────────────────────

interface FormState {
  weight: string
  height: string
  bodyFat: string
  age: string
  sex: 'male' | 'female'
  // Segmental (optional)
  leftArm: string
  rightArm: string
  leftLeg: string
  rightLeg: string
  torso: string
  // Advanced (optional)
  ecw: string
  tbw: string
  bbt: string
  rhr: string
}

const initialForm: FormState = {
  weight: '',
  height: '',
  bodyFat: '',
  age: '',
  sex: 'male',
  leftArm: '',
  rightArm: '',
  leftLeg: '',
  rightLeg: '',
  torso: '',
  ecw: '',
  tbw: '',
  bbt: '',
  rhr: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function n(s: string): number | undefined {
  if (!s.trim()) return undefined
  const v = parseNumericInput(s)
  return isNaN(v) ? undefined : v
}

function required(s: string, label: string): string | null {
  const v = n(s)
  if (v === undefined || v <= 0) return `${label} must be a positive number`
  return null
}

// ─── Styled input helper ──────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
}
function Input({ label, hint, error, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400 uppercase tracking-wider">
        {label}
        {hint && <span className="ml-1 text-gray-600 normal-case">({hint})</span>}
      </label>
      <input
        {...props}
        autoComplete="off"
        spellCheck={false}
        className={`
          bg-white/[0.04] border rounded-xl px-3 py-2.5 text-sm text-white
          placeholder-gray-600 focus:outline-none focus:ring-1
          transition-colors
          ${error ? 'border-red-500/60 focus:ring-red-500/40' : 'border-white/10 focus:ring-[#00D4FF]/40 focus:border-[#00D4FF]/40'}
        `}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [result, setResult] = useState<BioAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Attempt to restore last session
  useEffect(() => {
    void (async () => {
      const saved = await loadSecure<BioAnalysisResult>()
      if (saved) setResult(saved)
    })()
  }, [])

  const update = useCallback((key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }, [])

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {}
    errs.weight = required(form.weight, 'Weight') ?? undefined
    errs.height = required(form.height, 'Height') ?? undefined
    errs.bodyFat = required(form.bodyFat, 'Body Fat %') ?? undefined
    errs.age = required(form.age, 'Age') ?? undefined

    const bf = n(form.bodyFat)
    if (bf !== undefined && (bf <= 0 || bf >= 100))
      errs.bodyFat = 'Body fat % must be between 1 and 99'

    const ht = n(form.height)
    if (ht !== undefined && (ht < 0.5 || ht > 2.8))
      errs.height = 'Height must be in metres (0.5–2.8 m)'

    setErrors(errs)
    return !Object.values(errs).some(Boolean)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const segAll = [form.leftArm, form.rightArm, form.leftLeg, form.rightLeg, form.torso]
      const segValues = segAll.map((s) => n(s))
      const segmental: BiometricInput['segmental'] = segValues.every((v) => v !== undefined)
        ? (segValues as [number, number, number, number, number])
        : undefined

      const input: BiometricInput = {
        weight: n(form.weight)!,
        height: n(form.height)!,
        bodyFatPercent: n(form.bodyFat)!,
        age: n(form.age)!,
        sex: form.sex,
        segmental,
        ecw: n(form.ecw),
        tbw: n(form.tbw),
        bbt: n(form.bbt),
        rhr: n(form.rhr),
      }

      const analysis = runFullAnalysis(input)
      await saveSecure(analysis)
      setResult(analysis)
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="mesh-bg min-h-screen">
        <Dashboard result={result} onReset={() => setResult(null)} />
      </div>
    )
  }

  return (
    <div className="mesh-bg min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Brand header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap size={22} style={{ color: '#00D4FF' }} />
            <h1 className="text-2xl font-black tracking-tight" style={{ color: '#00D4FF' }}>
              ZENITH BIO-OS
            </h1>
          </div>
          <p className="text-xs text-gray-500">Professional Body Composition Engine · 2026</p>
          <div className="flex items-center justify-center gap-1 mt-2">
            <Shield size={12} className="text-green-500" />
            <p className="text-xs text-green-500/70">All processing is client-side · AES-GCM encrypted storage</p>
          </div>
        </div>

        {/* Input form */}
        <form onSubmit={(e) => { handleSubmit(e).catch(console.error) }}>
          <div
            className="p-6 rounded-2xl space-y-5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Core Biometrics</p>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Weight"
                hint="kg"
                placeholder="75.0"
                value={form.weight}
                onChange={(e) => update('weight', e.target.value)}
                error={errors.weight}
                type="text"
                inputMode="decimal"
              />
              <Input
                label="Height"
                hint="m"
                placeholder="1.75"
                value={form.height}
                onChange={(e) => update('height', e.target.value)}
                error={errors.height}
                type="text"
                inputMode="decimal"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Body Fat"
                hint="%"
                placeholder="18.0"
                value={form.bodyFat}
                onChange={(e) => update('bodyFat', e.target.value)}
                error={errors.bodyFat}
                type="text"
                inputMode="decimal"
              />
              <Input
                label="Age"
                hint="years"
                placeholder="30"
                value={form.age}
                onChange={(e) => update('age', e.target.value)}
                error={errors.age}
                type="text"
                inputMode="numeric"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 uppercase tracking-wider">Biological Sex</label>
              <div className="flex gap-3">
                {(['male', 'female'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => update('sex', s)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all"
                    style={
                      form.sex === s
                        ? { background: '#00D4FF22', border: '1px solid #00D4FF66', color: '#00D4FF' }
                        : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280' }
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced section toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors py-1 flex items-center justify-center gap-1"
            >
              {showAdvanced ? '▲' : '▼'} {showAdvanced ? 'Hide' : 'Show'} Advanced Inputs
              <span className="text-gray-600">(Segmental, ECW/TBW, Thyroid)</span>
            </button>

            {showAdvanced && (
              <div className="space-y-5 pt-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Segmental Lean Mass (kg)</p>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Left Arm" hint="kg" placeholder="3.5" value={form.leftArm} onChange={(e) => update('leftArm', e.target.value)} type="text" inputMode="decimal" />
                  <Input label="Right Arm" hint="kg" placeholder="3.5" value={form.rightArm} onChange={(e) => update('rightArm', e.target.value)} type="text" inputMode="decimal" />
                  <Input label="Left Leg" hint="kg" placeholder="9.0" value={form.leftLeg} onChange={(e) => update('leftLeg', e.target.value)} type="text" inputMode="decimal" />
                  <Input label="Right Leg" hint="kg" placeholder="9.0" value={form.rightLeg} onChange={(e) => update('rightLeg', e.target.value)} type="text" inputMode="decimal" />
                </div>
                <Input label="Torso" hint="kg" placeholder="28.0" value={form.torso} onChange={(e) => update('torso', e.target.value)} type="text" inputMode="decimal" />

                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pt-2">ECW / TBW</p>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="ECW" hint="L" placeholder="16.5" value={form.ecw} onChange={(e) => update('ecw', e.target.value)} type="text" inputMode="decimal" />
                  <Input label="TBW" hint="L" placeholder="45.0" value={form.tbw} onChange={(e) => update('tbw', e.target.value)} type="text" inputMode="decimal" />
                </div>

                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pt-2">Thyroid Indicators</p>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="BBT" hint="°C" placeholder="36.6" value={form.bbt} onChange={(e) => update('bbt', e.target.value)} type="text" inputMode="decimal" />
                  <Input label="RHR" hint="bpm" placeholder="65" value={form.rhr} onChange={(e) => update('rhr', e.target.value)} type="text" inputMode="numeric" />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm tracking-wider uppercase transition-all mt-2"
              style={{
                background: loading ? 'rgba(0,212,255,0.2)' : 'linear-gradient(135deg,#00D4FF,#0099cc)',
                color: loading ? '#00D4FF88' : '#000',
                boxShadow: loading ? 'none' : '0 0 20px rgba(0,212,255,0.3)',
              }}
            >
              {loading ? 'Analysing…' : '⚡ Run Analysis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
