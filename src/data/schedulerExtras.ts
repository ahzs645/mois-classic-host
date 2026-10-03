import { createStore, onSessionReset } from './sessionStore'

/* ============================================================================
   The Scheduler state the Appointment Series, Group Bookings and day-book
   option windows keep — beside `schedulerStore`, which owns the day books'
   rows themselves.

   PROVENANCE (what each slice stands for):
   - `series`: art. 3266635 "Appointment Series" — a series is a set of
     day-book rows booked together (`0c7487ae…` Create Appointment Series,
     `eaeeb40b…` the confirmation, `e5a94a62…` / `d39b53d9…` deleting from
     one). Each booked row's key is remembered against its series so the row
     carries the recurrence glyph (`259086eb…`) and Delete Appt can ask
     "Just this one / Select from series".
   - `groups`: art. 303808 "Group Bookings" — each group visit's Patient
     List, Other Provider(s), Other Resource(s), Additional Information, its
     Prepare for Meeting notes and whether its MSP claims were created.
   - `daybook`: art. 303795 "Provider Schedules" — the day-book form's MSP
     Loc., Alias, Comment and Do Not Auto-Generate a Call List, per provider
     and day; Service Location + Show Only; the Patient Detail Slide.
   - `clipboard`: art. 303239 Action ▸ Copy Encounter Data (Ctrl+Shift+C) /
     Paste Encounter Data (Ctrl+Shift+P).

   One store per frame; `resetSchedulerExtras()` returns it to the training
   data. Reports carry slugs only (`last`).
   ========================================================================= */

export type SeriesKind = 'patient' | 'group'

export type Series = {
  id: string
  kind: SeriesKind
  provider: string
  /** the day-book row keys this series booked, in date order */
  keys: string[]
  /** each key's day offset, so the delete list can print a date */
  offsets: Record<string, number>
  hr: string
  mn: string
  code: string
  slots: string
  reason: string
  loc: string
  /** chart numbers booked (one for a patient series) */
  charts: string[]
}

export type GroupPatient = {
  chart: string; first: string; last: string
  code: string; mode: string; reason: string; issue: string; services: string
  as: string; ds: string; bs: string; t: string
  /** Clone Group Booking's Include / Bill MSP's Exclude ticks */
  include?: boolean
  exclude?: boolean
}

export type GroupOther = { name: string; note: string; reserved: boolean; include?: boolean }

export type GroupVisitState = {
  patients: GroupPatient[]
  providers: GroupOther[]
  resources: GroupOther[]
  comment: string
  room: string
  resource: string
  /** Prepare for Meeting: the notes written to every attendee's encounter */
  notes: { mode: string; text: string; at: string }[]
  nameTags: string
  claimed: boolean
}

export type DaybookFormState = {
  mspLoc: string
  alias: string
  comment: string
  noCallList: boolean
  /** this day's call list has been made (the link reads Open after that) */
  callListMade?: boolean
}

/** Chart Summaries the Patient Detail Slide can show (art. 303795 `377de417…`). */
export const CHART_SUMMARIES = [
  'ALLERGY/INTOLERANCES', 'CAREPLAN', 'DAYBOOK SUMMARY', 'ENCOUNTER SUMMARY', 'FORM SUMMARY',
  'HEALTH SUMMARY', 'PATIENT SUMMARY', 'PREFERENCE MEDICATION', 'SERVICE EVENTS',
] as const

export type GroupVisitRow = { date: string; hr: string; min: string; n: string; provider: string; topic: string; desc: string; code: string; loc: string; series: boolean }

export type SchedulerExtrasState = {
  series: Series[]
  /** row key → series id */
  seriesOf: Record<string, string>
  /** group visit index key (`date|hr|min|provider`) → its lists */
  groups: Record<string, GroupVisitState>
  /** group visits added by New Appt / Clone Appt / a group series */
  addedVisits: GroupVisitRow[]
  /** group visits deleted (Delete Appt), by key */
  removedVisits: string[]
  /** the Group Visit List's current row, for the windows its buttons open */
  currentVisit: GroupVisitRow | null
  /** `provider|offset` → the day-book form */
  daybook: Record<string, DaybookFormState>
  serviceLocation: string
  showOnly: boolean
  /** Patient Detail Slide: which summary, and whether it is open, summary-only or hidden */
  slide: { summary: string; mode: 'detail' | 'summary' | 'hidden' }
  /** Copy Encounter Data: the copied row's key */
  clipboard: string | null
  /** Paste Encounter Data: target key → source key */
  pasted: Record<string, string>
  /** Summary All Visit / Print Encounter / … : the last thing done, as a slug */
  last: string
}

const initial = (): SchedulerExtrasState => ({
  series: [], seriesOf: {}, groups: {}, addedVisits: [], removedVisits: [], currentVisit: null, daybook: {},
  serviceLocation: '', showOnly: false,
  slide: { summary: 'DAYBOOK SUMMARY', mode: 'summary' },
  clipboard: null, pasted: {}, last: '',
})

/* a session store: back to the training data as each frame mounts
   (data/sessionStore.ts), with the serial */
const store = createStore<SchedulerExtrasState>(initial)
const state = store.get
let serial = 0
onSessionReset(() => { serial = 0 })
function set(next: Partial<SchedulerExtrasState>) {
  store.set((prev) => ({ ...prev, ...next }))
}

/** Back to the training data (the session reset does this as the frame
    mounts; resetSchedulerStore() does it on demand). */
export function resetSchedulerExtras() {
  store.reset()
  serial = 0
}

export function useSchedulerExtras(): SchedulerExtrasState {
  return store.use()
}

export const groupKeyOf = (v: { date: string; hr: string; min: string; provider: string }) =>
  `${v.date}|${v.hr}|${v.min}|${v.provider}`

const blankDaybook = (): DaybookFormState => ({ mspLoc: '', alias: '', comment: '', noCallList: false })

export const schedulerExtras = {
  get: () => state(),

  addSeries(s: Omit<Series, 'id'>): string {
    const id = `ser${++serial}`
    const seriesOf = { ...state().seriesOf }
    for (const k of s.keys) seriesOf[k] = id
    set({ series: [...state().series, { ...s, id }], seriesOf, last: s.kind === 'group' ? 'group-series-created' : 'series-created' })
    return id
  },

  /** rows deleted out of a series leave it; an emptied series goes */
  removeFromSeries(keys: string[]) {
    const seriesOf = { ...state().seriesOf }
    for (const k of keys) delete seriesOf[k]
    const series = state().series
      .map((s) => ({ ...s, keys: s.keys.filter((k) => !keys.includes(k)) }))
      .filter((s) => s.keys.length)
    set({ seriesOf, series, last: 'series-appointments-deleted' })
  },

  group(key: string): GroupVisitState | undefined { return state().groups[key] },

  setGroup(key: string, patch: Partial<GroupVisitState>, base: GroupVisitState) {
    set({ groups: { ...state().groups, [key]: { ...base, ...state().groups[key], ...patch } } })
  },

  setCurrentVisit(v: GroupVisitRow | null) {
    const c = state().currentVisit
    if (c === v || (c && v && groupKeyOf(c) === groupKeyOf(v) && c.topic === v.topic && c.desc === v.desc)) return
    set({ currentVisit: v })
  },

  removeVisit(key: string) { set({ removedVisits: [...state().removedVisits, key], last: 'group-visit-deleted' }) },

  addVisit(v: GroupVisitRow, lists?: Partial<GroupVisitState>, base?: GroupVisitState) {
    const groups = lists && base ? { ...state().groups, [groupKeyOf(v)]: { ...base, ...lists } } : state().groups
    set({ addedVisits: [v, ...state().addedVisits], groups })
  },

  daybookForm(provider: string, offset: number): DaybookFormState {
    return state().daybook[`${provider}|${offset}`] ?? blankDaybook()
  },

  setDaybookForm(provider: string, offset: number, patch: Partial<DaybookFormState>) {
    const key = `${provider}|${offset}`
    set({ daybook: { ...state().daybook, [key]: { ...blankDaybook(), ...state().daybook[key], ...patch } } })
  },

  setServiceLocation(loc: string, showOnly: boolean) { set({ serviceLocation: loc, showOnly }) },

  setSlide(patch: Partial<SchedulerExtrasState['slide']>) { set({ slide: { ...state().slide, ...patch } }) },

  copyEncounter(key: string) { set({ clipboard: key, last: 'encounter-copied' }) },

  pasteEncounter(target: string) {
    const { clipboard, pasted } = state()
    if (!clipboard) return
    set({ pasted: { ...pasted, [target]: clipboard }, last: 'encounter-pasted' })
  },

  done(last: string) { set({ last }) },
}
