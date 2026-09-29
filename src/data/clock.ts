/* ============================================================================
   The stage's clock and date formats, React-free.

   The emulator runs on fixed days so every lesson sees the same records:
     · MOIS_TODAY — the chart day, 2026.09.18. Anything a
       lesson files today (a preference, a goal, a stamp) is dated this day.
     · SCHEDULER_TODAY — the Scheduler's own day, 2026.08.11, the day the day
       book captures were taken (data/billingPrograms.ts explains the split).
   Only the time of day comes from the real clock.

   MOIS prints one date three ways, and the screens convert between them:
     2026.09.18   dialogs, grids, Created / Modified stamps     (dots)
     2026/09/18   the chart export's dtm_* fields, some reports  (slashes)
     2026-09-18   the Member grid, the Richtext reports           (dashes)
   Every converter takes any of the three (and a trailing time), so a value
   can be passed along without knowing where it came from.

   A leaf module — it imports nothing — so host/manifest.ts can read the
   stage days without pulling in the data.
   ========================================================================= */

/** The date the training environment was captured; ages are figured from it
    (data/patients.ts re-exports it, where the screens have always read it). */
export const MOIS_TODAY = '2026.09.18'

/** the Scheduler's day (data/schedulerStore.ts EPOCH, host/manifest.ts's
    fixture daybook) */
export const SCHEDULER_TODAY = '2026.08.11'

export const pad2 = (n: number) => String(n).padStart(2, '0')

const datePart = (v?: string | null) => (v ?? '').trim().split(/\s+/)[0] ?? ''

/** → 2026.09.18 */
export const toDots = (v?: string | null) => datePart(v).replace(/[/-]/g, '.')
/** → 2026/09/18 */
export const toSlashes = (v?: string | null) => datePart(v).replace(/[.-]/g, '/')
/** → 2026-09-18 */
export const toDashes = (v?: string | null) => datePart(v).replace(/[./]/g, '-')

/** a Date's calendar day as 2026.09.18 (local time) */
export const dotsOf = (d: Date) => `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`

/** `day` (any format) plus `days`, as 2026.09.18 — UTC arithmetic, so a
    daylight-saving change never shifts it */
export function addDays(day: string, days: number): string {
  const [y, m, d] = toDots(day).split('.').map(Number)
  const t = new Date(Date.UTC(y!, m! - 1, d! + days))
  return `${t.getUTCFullYear()}.${pad2(t.getUTCMonth() + 1)}.${pad2(t.getUTCDate())}`
}

/** MOIS_TODAY plus `days` */
export const daysFromToday = (days: number) => addDays(MOIS_TODAY, days)

/** the time of day now, HH:MM */
export const hhmm = (d: Date = new Date()) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
/** the time of day now, HH:MM:SS */
export const hhmmss = (d: Date = new Date()) => `${hhmm(d)}:${pad2(d.getSeconds())}`

/** a stamp on the stage's day: `2026.09.18 14:05` (`sep` between them) */
export const stageStamp = (sep = ' ', d: Date = new Date()) => `${MOIS_TODAY}${sep}${hhmm(d)}`

/** the calendar's names, Sunday first — Date#getDay() / getUTCDay() index
    DAY_NAMES, getMonth() / getUTCMonth() index MONTH_NAMES */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const DAY_NAMES_SHORT = DAY_NAMES.map((d) => d.slice(0, 3))
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const MONTH_NAMES_SHORT = MONTH_NAMES.map((m) => m.slice(0, 3))
