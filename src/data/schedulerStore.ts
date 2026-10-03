import { createStore, onSessionReset } from './sessionStore'
import { SCHEDULER_TODAY, pad2 } from './clock'
import { slug as pbSlug } from './text'
import {
  bookedAppointment, daybookFor, resourceDayFor, TRAINING_CHART, type Appointment,
} from './daybook'
import { daybookProviders } from './mois'
import {
  initialReservationBlocks, initialResourceBlocks, initialResourceShiftRows, initialShiftRows,
  type ReservationBlock, type ShiftRow,
} from './schedulerSetup'
import { resetSchedulerExtras } from './schedulerExtras'

/* ============================================================================
   What the learner has done to the Scheduler this session.

   The day books themselves are training data (`daybook.ts`); everything a
   Scheduler window does to them lives here, because the frame's work area
   remounts on every tree node and the windows that change a day book — New
   Appointment, the Copy/Move utilities, Quick Registration, the Pre-Slot
   Wizard, MSP Bill — are not the day book:

   - an appointment's AS, whether it was billed, whether its note is complete
     (DS I → C), the chart Quick Registration wrote onto it;
   - appointments booked, copied, moved or pre-slotted onto a day, and the
     ones moved off one;
   - the reservation blocks and provider shifts the set-up screens edit;
   - the day book's column editor (Turn Editor - On / Save Layout).

   Every row has a key — `provider|offset|b<n>` for a training row, `k<n>` for
   one added this session — so a status set on one provider's 08:30 stays on
   that appointment rather than on "row 0" of whatever day is showing.

   One store per frame: the shell calls `resetSchedulerStore()` when it mounts,
   exactly as it does the Workspace store.
   ========================================================================= */

export type DayRow = Appointment & { key: string }

type Added = { key: string; provider: string; offset: number; row: Appointment; kind?: 'booked' | 'copy' | 'slot' }

export type Recall = { chart: string; code: string; due: string; reminder: string }

export type SchedulerState = {
  added: Added[]
  /** training rows moved off their day (Move, Delete Appt) */
  removed: string[]
  statuses: Record<string, string>
  billed: Record<string, boolean>
  /** The diagnosis saved with a synthetic billed appointment by Day Book Save.
      Kept locally; tutorial snapshots expose only whether it still matches. */
  savedBills: Record<string, string>
  /** Health Issue picked for a row (F4 / the "…" beside the cell) */
  issues: Record<string, string>
  /** rows whose encounter was saved with its note: DS reads C */
  noted: Record<string, boolean>
  /** Quick Registration wrote this chart number onto the row */
  charted: Record<string, string>
  /** the day book's current appointment, as the day book last reported it */
  current: { key: string; provider: string; offset: number } | null
  /** the appointment whose Encounter Detail Window the day book opened */
  openedFrom: string | null
  blocks: Record<string, ReservationBlock[]>
  /** whose reservation list is on screen — the wizard ticks them first */
  blockOwner: { owner: string; resource: boolean } | null
  resourceBlocks: Record<string, ReservationBlock[]>
  shifts: ShiftRow[]
  resourceShifts: ShiftRow[]
  /** the Shift Scheduler's current row and week, which Copy works from */
  shiftSelection: { owner: string; week: number; resource: boolean } | null
  /** the header menu's Turn Editor - On, and whether Save Layout was used */
  editor: boolean
  layout: 'default' | 'saved'
  /** the day book's column order while the editor has moved one */
  columns: string[] | null
  recalls: Recall[]
  /** the last thing a Scheduler window did, as a slug a lesson can check */
  last: string
  /** what the next New Appointment window opens with (the status-bar link) */
  prefill: { chart: string; first: string; last: string } | null
}

const initial = (): SchedulerState => ({
  added: [], removed: [], statuses: {}, billed: {}, savedBills: {}, issues: {}, noted: {}, charted: {},
  current: null, openedFrom: null, blockOwner: null,
  blocks: initialReservationBlocks(), resourceBlocks: initialResourceBlocks(),
  shifts: initialShiftRows(), resourceShifts: initialResourceShiftRows(), shiftSelection: null,
  editor: false, layout: 'default', columns: null, recalls: [], last: '', prefill: null,
})

/* a session store: back to the training data as each frame mounts
   (data/sessionStore.ts), with the serial; schedulerExtras.ts registers its
   own reset */
const store = createStore<SchedulerState>(initial)
const state = store.get
let serial = 0
onSessionReset(() => { serial = 0 })

function set(next: Partial<SchedulerState>) {
  store.set((prev) => ({ ...prev, ...next }))
}

/** Back to the training data (the session reset does this as the frame
    mounts; this is the same reset on demand). */
export function resetSchedulerStore() {
  store.reset()
  serial = 0
  resetSchedulerExtras()
}

export function useSchedulerStore(): SchedulerState {
  return store.use()
}

/* --- the frame reports provider and date as slug and stamp ---------------- */
/* the day book's opening day (clock.ts SCHEDULER_TODAY) as a UTC timestamp */
const EPOCH = (() => {
  const [y, m, d] = SCHEDULER_TODAY.split('.').map(Number) as [number, number, number]
  return Date.UTC(y, m - 1, d)
})()

/** `2026.08.12` → 1 (days from the day book's opening day). */
export function offsetOfStamp(stamp: string): number {
  const [y, m, d] = stamp.split('.').map(Number) as [number, number, number]
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / 86_400_000)
}

export function providerOfSlug(slug: string): string {
  return daybookProviders.find((p) => pbSlug(p.provider) === slug)?.provider ?? 'TECHNICAL SUPPORT'
}

/* --- one day ---------------------------------------------------------------- */

const byTime = (x: DayRow, y: DayRow) => (x.hr + x.mn).localeCompare(y.hr + y.mn)

/** Every appointment on a provider's day, in time order, with this
    session's changes laid over the training data. The index into this list
    is the "row" `host.mois.apptStatus` and the frame's current row mean. */
export function dayRows(s: SchedulerState, provider: string, offset: number): DayRow[] {
  const base: DayRow[] = daybookFor(provider, offset)
    .map((row, i) => ({ ...row, key: `${provider}|${offset}|b${i}` }))
    .filter((row) => !s.removed.includes(row.key))
  const added: DayRow[] = s.added
    .filter((x) => x.provider === provider && x.offset === offset && !s.removed.includes(x.key))
    .map((x) => ({ ...x.row, key: x.key }))
  return [...base, ...added].sort(byTime).map((row) => {
    const status = s.statuses[row.key]
    const billed = s.billed[row.key]
    const issue = s.issues[row.key]
    const chart = s.charted[row.key]
    return {
      ...row,
      as: status ?? row.as,
      ...(issue ? { issue } : {}),
      ...(billed ? { services: '00100', bs: 'C' } : {}),
      ...(s.noted[row.key] ? { ds: 'C' } : {}),
      ...(chart ? { chart } : {}),
    }
  })
}

/** Saved bookings appear in both their provider's and resource's day books. */
export function resourceRows(resource: string, offset: number): DayRow[] {
  const s = state()
  const base = resourceDayFor(resource, offset).map((row, i) => ({ ...row, key: `res:${resource}|${offset}|b${i}` }))
  const added = s.added.filter(x => x.offset === offset && x.row.resource === resource && !s.removed.includes(x.key))
    .map(x => ({ ...x.row, key: x.key, provider: x.provider }))
  return [...base, ...added].sort(byTime)
}

export function rowAt(provider: string, offset: number, index: number): DayRow | undefined {
  return dayRows(state(), provider, offset)[index]
}

/** The row the day book has current, or its first. */
export function currentRow(s: SchedulerState = state()): DayRow | undefined {
  if (!s.current) return undefined
  const rows = dayRows(s, s.current.provider, s.current.offset)
  return rows.find((r) => r.key === s.current!.key) ?? rows[0]
}

/* --- what the frame reports -------------------------------------------------- */

/** `host.scheduler.*`: slugs and counts, never a typed value. */
export function schedulerSnapshot(s: SchedulerState, provider: string, offset: number, index: number) {
  const rows = dayRows(s, provider, offset)
  const row = rows[index]
  return {
    /** the current appointment's time, `1000` */
    row: row ? `${row.hr}${row.mn}` : '',
    /** how many appointments the day holds (before Hide Status) */
    rows: rows.length,
    ds: row?.ds ?? '',
    bs: row?.bs ?? '',
    diagnosis: row?.issue ? 'selected' : 'empty',
    diagnosisEdited: !!row && Object.prototype.hasOwnProperty.call(s.issues, row.key),
    /** MSP Bill updates the row; Save is a separate operation (303858).
        An unrelated Save, or a later diagnosis edit, cannot fulfill this. */
    billingSaved: !!row?.issue && !!s.billed[row.key] && s.savedBills[row.key] === row.issue,
    /** A saved local booking has its own time, patient and reason. No typed
        text crosses the tutorial boundary, and Save alone is insufficient. */
    bookedComplete: s.added.some((entry) => entry.kind === 'booked'
      && Boolean(entry.row.chart && entry.row.first && entry.row.last && entry.row.reason.trim())
      && /^\d{1,2}$/.test(entry.row.hr) && Number(entry.row.hr) < 24
      && /^\d{1,2}$/.test(entry.row.mn) && Number(entry.row.mn) < 60
      && Number(entry.row.n) > 0),
    /** whether the current row has a chart number behind it */
    charted: !!row?.chart,
    editor: s.editor ? 'on' : 'off',
    layout: s.layout,
    recalls: s.recalls.length,
    last: s.last,
  }
}

export const apptStatusOf = (s: SchedulerState, provider: string, offset: number, index: number) =>
  dayRows(s, provider, offset)[index]?.as ?? ''

export const bookedCount = (s: SchedulerState) => s.added.filter((x) => x.kind === 'booked').length
export const billedCount = (s: SchedulerState) => Object.keys(s.billed).length

/* --- the frame's bridge -------------------------------------------------------
   A few Scheduler windows act outside the Scheduler: Open Chart, Open
   Encounter. The day book registers the frame's callbacks here while it is
   mounted, so a window opened over it can reach them without a prop being
   threaded through the frame for each. */
export type EncounterOpen = { id: string; date?: string; hr?: string; mn?: string; reason?: string; loc?: string }
type Bridge = {
  chart?: string
  openEncounter?: (row: EncounterOpen) => void
  openNode?: (node: string) => void
  /** point the day book at another provider and day (Provider Schedule
      Summary ▸ Select, the Shift Scheduler's "…") */
  showDay?: (provider: string, offset: number) => void
}
const bridge: Bridge = {}
export function setSchedulerBridge(next: Bridge) { Object.assign(bridge, next) }
export const schedulerBridge = (): Bridge => bridge

/** The encounter a day-book row stands for — only rows on the open chart
    have one, since only the training chart has an export behind it. */
export function encounterOf(row: DayRow | undefined, offset: number, chart: string): EncounterOpen | null {
  if (!row?.enc || row.chart !== chart) return null
  const stamp = stampOf(offset)
  return { id: row.enc, date: stamp, hr: row.hr, mn: row.mn, reason: row.reason, loc: row.loc }
}

export function stampOf(offset: number): string {
  const d = new Date(EPOCH + offset * 86_400_000)
  return `${d.getUTCFullYear()}.${pad2(d.getUTCMonth() + 1)}.${pad2(d.getUTCDate())}`
}

/* --- actions ------------------------------------------------------------------ */

const newKey = () => `k${++serial}`

export const schedulerStore = {
  get: () => state(),

  setCurrent(provider: string, offset: number, key: string) {
    const c = state().current
    if (c && c.key === key && c.provider === provider && c.offset === offset) return
    set({ current: { provider, offset, key } })
  },

  setStatus(provider: string, offset: number, index: number, code: string) {
    const row = dayRows(state(), provider, offset)[index]
    if (!row) throw new Error(`No appointment is at row ${index} of this day book.`)
    set({ statuses: { ...state().statuses, [row.key]: code }, current: { provider, offset, key: row.key } })
  },

  setStatusByKey(key: string, code: string) {
    set({ statuses: { ...state().statuses, [key]: code } })
  },

  /** New Appointment ▸ Save Appointment */
  book(provider: string, offset: number, draft: Parameters<typeof bookedAppointment>[0]) {
    const row = bookedAppointment(draft)
    const key = newKey()
    set({ added: [...state().added, { key, provider, offset, row, kind: 'booked' }], current: { provider, offset, key }, last: 'booked', prefill: null })
  },

  /** Create Appointment Series ▸ Continue, Create Series (art. 3266635):
      many rows at once, their keys returned so the series can own them */
  bookMany(items: { provider: string; offset: number; draft: Parameters<typeof bookedAppointment>[0]; extra?: Partial<Appointment> }[], last = 'series-booked'): string[] {
    const added: Added[] = items.map((x) => ({ key: newKey(), provider: x.provider, offset: x.offset, row: { ...bookedAppointment(x.draft), ...x.extra }, kind: 'booked' as const }))
    set({ added: [...state().added, ...added], last })
    return added.map((a) => a.key)
  },

  /** Delete Recurring Appointment ▸ Select from series ▸ Ok ▸ Yes */
  deleteAppointments(keys: string[]) {
    set({ removed: [...new Set([...state().removed, ...keys])], last: 'deleted' })
  },

  /** Action ▸ Paste Encounter Data (Ctrl+Shift+P): the copied appointment's
      encounter detail replaces the selected one's (art. 303239) */
  pasteEncounter(target: string, source: string) {
    const from = findRow(source)
    if (!from) return
    const issues = { ...state().issues }
    if (state().issues[source] || from.row.issue) issues[target] = state().issues[source] ?? from.row.issue
    const billed = { ...state().billed }
    if (state().billed[source]) billed[target] = true
    const noted = { ...state().noted }
    if (state().noted[source]) noted[target] = true
    set({ issues, billed, noted, last: 'encounter-pasted' })
  },

  /** MSP Bill (Ctrl+B) on the current row */
  bill(key: string) {
    set({ billed: { ...state().billed, [key]: true }, last: 'billed' })
  },

  /** Day Book Save (F2), after MSP Bill (303858). This commits the stage's
      synthetic row state for this day only; it does not send a real claim. */
  saveDay(provider: string, offset: number) {
    const s = state()
    const savedBills = { ...s.savedBills }
    for (const row of dayRows(s, provider, offset)) {
      if (s.billed[row.key] && row.issue) savedBills[row.key] = row.issue
    }
    set({ savedBills, last: 'daybook-saved' })
  },

  /** Action ▸ Bill MSP (all encounters), Ctrl+I: every row with a diagnosis */
  billAll(provider: string, offset: number) {
    const billed = { ...state().billed }
    for (const row of dayRows(state(), provider, offset)) if (row.issue) billed[row.key] = true
    set({ billed, last: 'billed-all' })
  },

  setIssue(key: string, code: string) {
    set({ issues: { ...state().issues, [key]: code }, last: 'diagnosis' })
  },

  /** Copy / Move Appointment Utility ▸ Continue */
  copyMoveAppointment(key: string, to: { provider: string; offset: number; hr: string; mn: string }, move: boolean) {
    const from = findRow(key)
    if (!from) return
    const row: Appointment = { ...from.row, hr: to.hr || from.row.hr, mn: to.mn || from.row.mn, as: move ? from.row.as : '' }
    const added: Added = { key: newKey(), provider: to.provider, offset: to.offset, row, kind: 'copy' }
    const statuses = { ...state().statuses }
    if (move && state().statuses[key]) statuses[added.key] = state().statuses[key]!
    set({
      added: [...state().added, added],
      removed: move ? [...state().removed, key] : state().removed,
      statuses,
      last: move ? 'moved' : 'copied',
    })
  },

  /** Copy / Move Day Book Utility ▸ Continue. Copy brings the patients and
      the notes and not the appointment statuses; Move takes everything
      (art. 303835). */
  copyMoveDay(fromProvider: string, fromOffset: number, to: { provider: string; offset: number }, move: boolean) {
    const rows = dayRows(state(), fromProvider, fromOffset)
    const statuses = { ...state().statuses }
    const added = rows.map((r) => {
      const { key: _key, ...row } = r
      const next: Added = { key: newKey(), provider: to.provider, offset: to.offset, row: { ...row, as: move ? r.as : '' }, kind: 'copy' }
      if (move && r.as) statuses[next.key] = r.as
      return next
    })
    set({
      added: [...state().added, ...added],
      removed: move ? [...state().removed, ...rows.map((r) => r.key)] : state().removed,
      statuses,
      last: move ? 'day-moved' : 'day-copied',
    })
  },

  /** Delete Appt (Shift+F2) ▸ Yes */
  deleteAppointment(key: string) {
    set({ removed: [...state().removed, key], last: 'deleted' })
  },

  /** Quick Patient Registration Form ▸ Register (F2) */
  register(key: string) {
    const chart = String(19000 + Object.keys(state().charted).length + 1)
    set({ charted: { ...state().charted, [key]: chart }, last: 'registered' })
    return chart
  },

  /** Pre-Slot Wizard ▸ Create Slots: empty rows, published for booking */
  createSlots(provider: string, offset: number, slots: { hr: string; mn: string; code: string; n: string }[]) {
    const added: Added[] = slots.map((s) => ({
      key: newKey(), provider, offset, kind: 'slot' as const,
      row: { ...bookedAppointment({ hr: s.hr, mn: s.mn, slots: s.n, chart: '', reason: '', code: s.code }), reason: '' },
    }))
    set({ added: [...state().added, ...added], last: 'slots-created' })
  },

  openedEncounter(key: string | null) {
    set({ openedFrom: key })
  },

  /** Encounter Detail Window ▸ Save: the note is complete, DS reads C */
  noteSaved() {
    const { openedFrom, noted } = state()
    if (!openedFrom) return
    set({ noted: { ...noted, [openedFrom]: true }, last: 'note-saved' })
  },

  createRecall(recall: Recall) {
    set({ recalls: [...state().recalls, recall], last: 'recall-created' })
  },

  setEditor(on: boolean) { set({ editor: on, last: on ? 'editor-on' : 'editor-off' }) },
  saveLayout() { set({ layout: 'saved', last: 'layout-saved' }) },
  resetLayout() { set({ layout: 'default', columns: null, last: 'layout-reset' }) },
  setColumns(columns: string[]) { set({ columns, last: 'column-moved' }) },

  addBlock(owner: string, resource: boolean, block: ReservationBlock) {
    const key = resource ? 'resourceBlocks' : 'blocks'
    const list = state()[key][owner] ?? []
    set({ [key]: { ...state()[key], [owner]: [block, ...list] }, last: 'block-added' } as Partial<SchedulerState>)
  },

  addBlocks(owners: string[], resource: boolean, make: (owner: string) => ReservationBlock[]) {
    const key = resource ? 'resourceBlocks' : 'blocks'
    const next = { ...state()[key] }
    for (const owner of owners) next[owner] = [...make(owner), ...(next[owner] ?? [])]
    set({ [key]: next, last: 'series-created' } as Partial<SchedulerState>)
  },

  setBlockOwner(owner: string, resource: boolean) {
    const b = state().blockOwner
    if (b && b.owner === owner && b.resource === resource) return
    set({ blockOwner: { owner, resource } })
  },

  updateBlock(owner: string, resource: boolean, id: string, patch: Partial<ReservationBlock>) {
    const key = resource ? 'resourceBlocks' : 'blocks'
    const list = (state()[key][owner] ?? []).map((b) => (b.id === id ? { ...b, ...patch } : b))
    set({ [key]: { ...state()[key], [owner]: list } } as Partial<SchedulerState>)
  },

  deleteBlock(owner: string, resource: boolean, id: string, series: boolean) {
    const key = resource ? 'resourceBlocks' : 'blocks'
    const list = state()[key][owner] ?? []
    const target = list.find((b) => b.id === id)
    const keep = list.filter((b) => (series && target?.series ? b.series !== target.series || b.date < stampOf(0) : b.id !== id))
    set({ [key]: { ...state()[key], [owner]: keep }, last: series ? 'series-deleted' : 'block-deleted' } as Partial<SchedulerState>)
  },

  addShiftRows(providers: string[], resource: boolean) {
    const key = resource ? 'resourceShifts' : 'shifts'
    const blank = () => ({ from1: '', to1: '', from2: '', to2: '', note: '' })
    const fresh = providers
      .filter((p) => !state()[key].some((r) => r.provider === p))
      .map((provider) => ({ provider, days: Array.from({ length: 7 }, blank) }))
    set({ [key]: [...state()[key], ...fresh], last: 'shift-added' } as Partial<SchedulerState>)
  },

  setShifts(rows: ShiftRow[], resource: boolean) {
    set({ [resource ? 'resourceShifts' : 'shifts']: rows } as Partial<SchedulerState>)
  },

  setShiftSelection(owner: string, week: number, resource: boolean) {
    const c = state().shiftSelection
    if (c && c.owner === owner && c.week === week && c.resource === resource) return
    set({ shiftSelection: { owner, week, resource } })
  },

  shiftsCopied() { set({ last: 'shifts-copied' }) },

  setPrefill(prefill: SchedulerState['prefill']) { set({ prefill }) },

  done(last: string) { set({ last }) },
}

function findRow(key: string): { row: Appointment; provider: string; offset: number } | null {
  const added = state().added.find((x) => x.key === key)
  if (added) return { row: added.row, provider: added.provider, offset: added.offset }
  const [provider, off, b] = key.split('|')
  if (!provider || off === undefined || !b) return null
  const offset = Number(off)
  const row = daybookFor(provider, offset)[Number(b.slice(1))]
  return row ? { row: { ...row, as: state().statuses[key] ?? row.as }, provider, offset } : null
}

/* The frame forwards the encounter window's bar here (it reports
   `host.mois.encounterMenu`): Save on an encounter the day book opened
   completes its note — art. 303845, "Save (F2) to mark the Progress Note as
   complete (DS, or Document Status, on the Day Book view will change from I
   to C)" — and Close lets it go. The window closes itself. */
export function schedulerKitAction(action: string, payload?: Record<string, unknown>): void {
  if (action !== 'host.mois.encounterMenu' || !state().openedFrom) return
  if (payload?.menu === 'save') schedulerStore.noteSaved()
  if (payload?.menu === 'close') schedulerStore.openedEncounter(null)
}

export { TRAINING_CHART }
