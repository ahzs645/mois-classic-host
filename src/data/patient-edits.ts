import { useSyncExternalStore } from 'react'
import type { Patient } from './patients'

// In-memory preview edits only. Never write patient data to browser storage or XML.
type Entry = { draft: Partial<Patient>; saved: Partial<Patient> }
const entries = new Map<string, Entry>()
const empty: Partial<Patient> = {}
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(fn => fn())
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
export function patientEdits(chart: string) { return entries.get(chart)?.draft ?? empty }
export function updatePatient(chart: string, patch: Partial<Patient>) {
  const current = entries.get(chart) ?? { draft: {}, saved: {} }
  entries.set(chart, { ...current, draft: { ...current.draft, ...patch } }); emit()
}
export function savePatient(chart: string) {
  const draft = patientEdits(chart); entries.set(chart, { draft, saved: draft }); emit()
}
export function undoPatient(chart: string) {
  const saved = entries.get(chart)?.saved ?? {}; entries.set(chart, { draft: saved, saved }); emit()
}
export function refreshPatient(chart: string) { entries.delete(chart); emit() }
export function usePatientEdits(chart: string) {
  return useSyncExternalStore(subscribe, () => patientEdits(chart), () => empty)
}

/** No unsaved edits: the draft is the last thing Save wrote. */
export function isPatientSaved(chart: string) {
  const entry = entries.get(chart)
  return !entry || JSON.stringify(entry.draft) === JSON.stringify(entry.saved)
}
/** isPatientSaved as a subscription. Save keeps the draft object and only
    points `saved` at it, so a component that reads the draft sees no change
    on Save — it has to subscribe to the comparison itself. */
export function usePatientSaved(chart: string) {
  return useSyncExternalStore(subscribe, () => isPatientSaved(chart), () => true)
}
/** Move a chart's edits to another key — a new chart getting its number on Save. */
export function renamePatientEdits(from: string, to: string) {
  const entry = entries.get(from)
  if (!entry) return
  entries.delete(from); entries.set(to, entry); emit()
}

/** Start the session over: a new frame is a new sign-in, and the chart it
    opens is the chart as exported. */
export function resetPatientEdits() {
  entries.clear()
}
