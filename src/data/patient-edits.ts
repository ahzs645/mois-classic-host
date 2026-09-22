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
