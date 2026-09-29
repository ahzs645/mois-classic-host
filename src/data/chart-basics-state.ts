import { MOIS_TODAY, hhmm } from './clock'
import { DESKTOP_PROVIDER_DEFAULT, SESSION_LOGIN } from './session'
import { createStore } from './sessionStore'

/* ============================================================================
   Session state behind the frame-level windows of the chart basics lessons:
   the Desktop Provider, the Default Value settings, record signatures, the
   chart merge log and each chart's Patient Text.

   In-memory only, the same rule as `patient-edits.ts`: nothing here is ever
   written to browser storage, and a reload starts the session over, the way
   signing out of MOIS would. Each piece is a session store
   (data/sessionStore.ts), so a new frame starts it over.
   ========================================================================= */

/* --- Desktop Provider -------------------------------------------------------
   art. 304393: "The Desktop Provider is the provider with whom you're
   working" — the name MOIS fills into requisitions, prescriptions, billing
   and reports. The frame's "Desktop For:" strip shows it; the v02.31 capture
   the frame follows reads TECHNICAL SUPPORT. */
const desktop = createStore({ provider: DESKTOP_PROVIDER_DEFAULT, saved: DESKTOP_PROVIDER_DEFAULT })
export const useDesktopProvider = () => desktop.use()
export function setDesktopProvider(provider: string, asDefault = false) {
  desktop.set((prev) => ({ provider, saved: asDefault ? provider : prev.saved }))
}

/* --- Maintenance ▸ Default Value Setting -------------------------------------
   art. 304679: a default is system-wide, keyed by the field. */
const defaults = createStore<Record<string, string>>({})
export const useDefaultValues = () => defaults.use()
export function saveDefaultValue(field: string, value: string) {
  defaults.set((prev) => ({ ...prev, [field]: value }))
}

/* --- Signed records ----------------------------------------------------------
   art. 304732: every sign and unsign is a Record History row with the date,
   the action, the user and a reason MOIS will not let you leave blank. */
export type SignatureEvent = { date: string; time: string; action: 'SIGNED' | 'UNSIGNED'; user: string; reason: string }
const signatures = createStore<Record<string, SignatureEvent[]>>({})
export const useSignatureHistory = (key: string) => signatures.use()[key] ?? []
export function addSignatureEvent(key: string, event: SignatureEvent) {
  signatures.set((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), event] }))
}

/* --- Chart merging (art. 301557 / 301558 / 301559) --------------------------- */
export type MergeLogRow = {
  mergeDate: string
  user: string
  reason: string
  status: 'ACTIVE' | 'ROLLED BACK'
  chart: string
  patient: string
  dob: string
  sex: string
  insBy: string
  insurance: string
  dep: string
  bchn: string
  rollbackDate?: string
  rollbackBy?: string
}
/* The reference chart's merge log. The 87288 export carries none, and the
   un-merge and merge-log lessons need a merge to look at, so this is one
   synthetic training entry: a duplicate registration of the same patient
   folded into 87288. Chart 87301 is not a chart on file anywhere else. */
const merges = createStore<Record<string, MergeLogRow[]>>({
  '87288': [{
    mergeDate: '2026.03.02', user: 'ADMIN, SYS', reason: 'Duplicate Chart', status: 'ACTIVE',
    chart: '87301', patient: 'PATCH  AADAMS', dob: '1986.12.19', sex: 'M', insBy: 'BC',
    insurance: '', dep: '00', bchn: '',
  }],
})
export const useMergeLog = (chart: string) => merges.use()[chart] ?? []
export function recordMerge(chart: string, row: MergeLogRow) {
  merges.set((prev) => ({ ...prev, [chart]: [row, ...(prev[chart] ?? [])] }))
}
export function rollBackMerge(chart: string, archived: string, date: string, user: string) {
  merges.set((prev) => ({
    ...prev,
    [chart]: (prev[chart] ?? []).map((r) => (r.chart === archived && r.status === 'ACTIVE'
      ? { ...r, status: 'ROLLED BACK', rollbackDate: date, rollbackBy: user } : r)),
  }))
}

/* --- Utilities ▸ Paste Patient Text (art. 303788) ---------------------------- */
export type PatientText = { author: string; description: string; text: string }
const texts = createStore<Record<string, PatientText[]>>({})
export const usePatientTexts = (chart: string) => texts.use()[chart] ?? []
export function addPatientText(chart: string, entry: PatientText) {
  texts.set((prev) => ({ ...prev, [chart]: [...(prev[chart] ?? []), entry] }))
}

/** Start the session over, so a lesson opens on the Desktop Provider, merge
    log and signatures as they started, not as the previous lesson left them.
    Each store registers with the session reset, which the frame runs as it
    mounts; this is the same reset on demand. */
export function resetChartBasicsState() {
  for (const s of [desktop, defaults, signatures, merges, texts]) s.reset()
}

/** The signed-in user's login, as the status bar names it (makeStatusCells:
    `User: JALA2`) — data/session.ts. This module used to export it as
    SESSION_USER, a name data/chartSession.ts uses for the display name. */
export { SESSION_LOGIN }

/** `YYYY.MM.DD` and `HH:MM` for now, the way MOIS stamps a record — on the
    stage's day (MOIS_TODAY): a merge, a signature or a benefit request the
    lesson files today is dated with the chart's today, like every other
    session record; only the time of day is real. */
export function nowStamp() {
  return { date: MOIS_TODAY, time: hhmm() }
}
