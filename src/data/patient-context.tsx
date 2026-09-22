import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useLoadedChart } from './charts'
import { patientFromExport } from './charts/to-patient'
import { usePatientEdits } from './patient-edits'
import {
  DEFAULT_CHART, ageOf, findPatient, fullName, patients, shortName, type Patient,
} from './patients'

/* ============================================================================
   The open chart.

   MOIS holds one chart open at a time and every window in the Patient Chart
   module reads it, so the screens take theirs from this context rather than
   importing a fixed record. Outside a provider `usePatient()` still returns
   the default chart, which is what the standalone gallery renders.

   The roster is a parameter, not a constant: a host embedding this shell (the
   Webforms tutorial stage) passes its own patients in, and the transcribed
   roster in `patients.ts` is what the standalone viewer falls back to.
   ========================================================================= */

/** A roster record plus the derived fields the chart windows display. */
export type ChartPatient = Patient & {
  full: string
  short: string
  age: string
  /** the one-letter gender the banners print */
  sex: string
  phone: string
}

export function toChartPatient(p: Patient): ChartPatient {
  return {
    ...p,
    full: fullName(p),
    short: shortName(p),
    age: ageOf(p.dob),
    sex: p.gender,
    phone: p.home ?? '',
  }
}

export const defaultPatient = toChartPatient(findPatient(DEFAULT_CHART) ?? patients[0])

const PatientContext = createContext<ChartPatient | null>(null)
const PatientRosterContext = createContext<Patient[]>(patients)
export const usePatientRoster = () => useContext(PatientRosterContext)

export function PatientProvider({ chart, roster, children }: {
  chart: string
  /** the charts this frame can open; omitted = the transcribed roster */
  roster?: Patient[]
  children: ReactNode
}) {
  const data = useLoadedChart(chart)
  const edits = usePatientEdits(chart)
  const value = useMemo(() => {
    const list = roster ?? patients
    const found = data ? patientFromExport(data) : findPatient(chart, list)
    return toChartPatient({ ...(found ?? { chart, first: '', middle: '', last: '', dob: '', gender: '', status: 'A' }), ...edits })
  }, [chart, roster, data, edits])
  return <PatientRosterContext.Provider value={roster ?? patients}><PatientContext.Provider value={value}>{children}</PatientContext.Provider></PatientRosterContext.Provider>
}

/** The chart the surrounding window is showing. */
export function usePatient(): ChartPatient {
  return useContext(PatientContext) ?? defaultPatient
}

/**
 * The `PATCH AADAMS 21 MTH OLD F   Chart 3424` block every Patient Chart
 * window prints at the right end of its navy view header. Transcribed from
 * `reference/demographics-full.png` and the order captures, where it appears
 * on Demographics, Order and Patient Summary alike.
 */
export function ChartHeaderIdentity() {
  const p = usePatient()
  return (
    <span className="pb-viewhead__chart">
      {[p.short, p.age, p.sex].filter(Boolean).join(' ')}
      <span className="pb-viewhead__chartno">Chart {p.chart}</span>
    </span>
  )
}
