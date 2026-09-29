import { useSyncExternalStore } from 'react'
import type { Patient } from './patients'
import { createSignal } from './sessionStore'

// In-memory preview edits only. Never write patient data to browser storage or XML.
type Entry = { draft: Partial<Patient>; saved: Partial<Patient> }
const entries = new Map<string, Entry>()
const empty: Partial<Patient> = {}
/* Reset with the session, as the shell always did: a new frame is a new
   sign-in, and the chart it opens is the chart as exported. The readers
   select per chart (patientEdits / isPatientSaved), so the signal is only
   the change notice; its version is not their snapshot. */
const changes = createSignal(() => entries.clear())
const emit = changes.emit
const subscribe = changes.subscribe
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
/** Charts with edits this session — Billing ▸ Enrollment CR reads the BC-PBF
    requests made on their Benefits tabs (data/billingPrograms.ts). */
export function editedCharts(): string[] { return [...entries.keys()] }
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
    opens is the chart as exported. (The session reset runs this as the frame
    mounts — data/sessionStore.ts.) */
export const resetPatientEdits = () => changes.reset()
