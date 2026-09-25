/* ============================================================================
   The Scheduler's set-up data: reservation blocks, provider shifts, and the
   lists the two wizards pick from.

   PROVENANCE
   - Provider Reservation List: art. 303812 `f1afb41f…` / art. 303839
     `1e24eab9…` (v02.17.20) — columns Date / HR / MIN / # / Code / Note, the
     codes MEETINGS, CLOSED and OUT-OF-OFFICE, a 288-slot block for a whole
     day. The patients' providers are this emulator's.
   - Reservation Block Wizard: art. 303812 `e04c271e…`.
   - Provider Shift Scheduler: art. 303813 `28a83b87…` and art. 303843
     `45031492…` — one row per provider, two time frames a weekday, a note
     box and a "…" per day, and `Enc: n` under the day that has bookings.
   ========================================================================= */

import { daybookProviders } from './mois'

/** the reason codes a block carries: Administration's Reservation Block
    Code list (art. 303081 `318eb80b…`, see adminLists.ts) */
export const BLOCK_CODES = ['CLOSED', 'LUNCH', 'DEVELOPMENT', 'GROUP VISIT', 'MEETINGS', 'OUT-OF-OFFICE', 'ROUNDS', 'HOLIDAY', 'TEST']

/** Administration's Reminder / Recall Code list (art. 303176 `08a4b560…`) */
export const RECALL_CODES = ['COLON', 'COPD', 'CT', 'DIAB', 'FLU', 'HTN', 'MAMMO', 'MRI', 'PAP', 'OTHER']

export type ReservationBlock = {
  id: string
  date: string
  hr: string
  min: string
  /** duration in five-minute slots — 12 is an hour, 288 a whole day */
  n: string
  code: string
  note: string
  /** blocks the wizard made share a series id; Delete Series takes them all */
  series?: string
}

let nextBlock = 1
const block = (date: string, hr: string, min: string, n: string, code: string, note = '', series?: string): ReservationBlock => ({
  id: `b${nextBlock++}`, date, hr, min, n, code, note, series,
})

/** Every provider's reservation blocks, newest first, as the list sorts them. */
export function initialReservationBlocks(): Record<string, ReservationBlock[]> {
  return {
    'BEARDWOOD, WALTER': [
      block('2026.09.02', '12', '0', '12', 'MEETINGS', 'Department meeting', 'wed-meeting'),
      block('2026.08.26', '12', '0', '12', 'MEETINGS', 'Department meeting', 'wed-meeting'),
      block('2026.08.19', '12', '0', '12', 'MEETINGS', 'Department meeting', 'wed-meeting'),
      block('2026.08.14', '0', '0', '288', 'OUT-OF-OFFICE', 'Conference'),
      block('2026.08.12', '12', '0', '12', 'MEETINGS', 'Department meeting', 'wed-meeting'),
      block('2026.08.11', '12', '0', '12', 'LUNCH'),
      block('2026.08.05', '12', '0', '12', 'MEETINGS', 'Department meeting', 'wed-meeting'),
    ],
    'TECHNICAL SUPPORT': [
      block('2026.08.13', '10', '3', '12', 'CLOSED', 'Server maintenance'),
      block('2026.08.11', '12', '0', '12', 'LUNCH'),
    ],
    'HOWSER, DOOGIE': [
      block('2026.08.18', '8', '0', '24', 'ROUNDS'),
      block('2026.08.11', '8', '0', '6', 'ROUNDS'),
    ],
  }
}

/** Resource blocks, by resource. */
export function initialResourceBlocks(): Record<string, ReservationBlock[]> {
  return {
    'TREATMENT ROOM': [block('2026.08.13', '8', '0', '288', 'CLOSED', 'Sterilizer service')],
  }
}

/* --- Shift Manager --------------------------------------------------------- */

/** one weekday: two time frames and the note box */
export type ShiftDay = { from1: string; to1: string; from2: string; to2: string; note: string }
export type ShiftRow = { provider: string; days: ShiftDay[] }

const day = (from1 = '', to1 = '', from2 = '', to2 = ''): ShiftDay => ({ from1, to1, from2, to2, note: '' })
const off = () => day()

/** Monday first — the grid's column order. */
export const SHIFT_WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function initialShiftRows(): ShiftRow[] {
  const split = () => day('08:30', '12:00', '13:00', '16:00')
  return [
    { provider: 'BEARDWOOD, WALTER', days: [split(), split(), split(), split(), split(), off(), off()] },
    { provider: 'FAIRCHILD, NESRIN L', days: [off(), day('08:00', '12:00', '13:00', '17:00'), off(), day('08:00', '12:00', '13:00', '17:00'), off(), off(), off()] },
    { provider: 'HOWSER, DOOGIE', days: [day('09:00', '15:00'), off(), day('09:00', '15:00'), off(), day('09:00', '15:00'), off(), off()] },
  ]
}

export function initialResourceShiftRows(): ShiftRow[] {
  return [
    { provider: 'TREATMENT ROOM', days: [day('08:00', '17:00'), day('08:00', '17:00'), day('08:00', '17:00'), day('08:00', '17:00'), day('08:00', '12:00'), off(), off()] },
  ]
}

/** Who the Add Provider(s) and wizard lists offer. */
export const schedulableProviders = (): string[] => daybookProviders.map((p) => p.provider)

/**
 * The hours a provider works on a weekday (0 Sunday … 6 Saturday), as
 * minute ranges; empty when no shift is on file. The day book greys the rest
 * of its time bar (art. 303843: "the unavailable hours shown in grey on the
 * scroll bar").
 */
export function shiftMinutes(rows: ShiftRow[], provider: string, weekday: number): [number, number][] {
  const row = rows.find((r) => r.provider === provider)
  if (!row) return []
  const d = row.days[(weekday + 6) % 7]
  if (!d) return []
  const m = (v: string) => {
    if (!v.trim()) return NaN
    const [h, mm] = v.split(':').map(Number)
    return Number.isFinite(h) ? h! * 60 + (mm || 0) : NaN
  }
  return [[m(d.from1), m(d.to1)], [m(d.from2), m(d.to2)]].filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y)) as [number, number][]
}
