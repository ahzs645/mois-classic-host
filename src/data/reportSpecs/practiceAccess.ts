import { MOIS_TODAY, RS_PROVIDERS, type ReportSpec, type RSContext, type RSField } from './types'

/* ============================================================================
   Report specs transcribed from manual article 304054 (Practice Management -
   Access): Advance Appointment Search, Same or Next Day Appts, Third Soonest
   Appt, Wait/Appt Duration.
   PROVENANCE: per spec below.

   Advance Appointment Search is not a Selection Parameter form: it is its
   own "Appointment Search" window with search criteria above and a results
   grid below, hand-built in screens/reports/AccessReportWindows.tsx.

   The other three open the usual Selection Parameter window and go straight
   to Excel ("It automatically outputs to Excel", "This report outputs to
   Excel by default"). Their sheets are pivots: one row per provider plus
   ANY PROVIDER, one column per slice date (Start, then every `Weeks between
   Slices` weeks up to End), the parameter's caption in A1 — 304054
   `f8a1f45e` ("PROVIDER - Same Day"), `a1e06548` ("PROVIDER"), `f32f2532`
   ("PROVIDER - Appt Duration"). The values are fictional and deterministic.
   ========================================================================= */

/* --- slices ----------------------------------------------------------------- */
const DAY = 86400000
const parse = (s: string): number | null => {
  const m = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(s.trim())
  if (!m || m[1] === '0000') return null
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(t) ? null : t
}
const stamp = (t: number) => {
  const d = new Date(t)
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`
}

/**
 * The slice dates: Start, then every `weeks` weeks while on or before End.
 * INFERRED for a blank (0000.00.00) Start or End: the emulator runs the
 * thirteen weeks up to today rather than refusing, and stops at 26 columns.
 */
function slices(ctx: RSContext): string[] {
  const today = parse(MOIS_TODAY)!
  const end = parse(ctx.val('dateTo')) ?? today
  const start = parse(ctx.val('dateFrom')) ?? end - 13 * 7 * DAY
  const step = Math.max(1, Math.floor(Number(ctx.val('weeks')) || 1)) * 7 * DAY
  const out: string[] = []
  for (let t = start; t <= end && out.length < 26; t += step) out.push(stamp(t))
  return out.length ? out : [stamp(start)]
}

/** FNV-1a, so neighbouring slice dates get unrelated sample figures */
const seed = (s: string) => {
  let h = 2166136261
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return (h >>> 0) % 99991
}
const PROVIDERS = RS_PROVIDERS.filter(Boolean)

/**
 * The sheet's header row depends on the parameters (the slice dates): each
 * spec keeps one array and refills it in `excelRows`; the renderer reads
 * `excelHead` after `excelRows` has run (a function `excelHead` would also do).
 */
function pivot(head: string[], first: string, providers: string[], cell: (who: string, date: string, i: number) => number, any: (vals: number[]) => number, show: (n: number) => string) {
  return (ctx: RSContext): string[][] => {
    const dates = slices(ctx)
    head.splice(0, head.length, first, ...dates)
    const grid = providers.map((who) => dates.map((d, i) => cell(who, d, i)))
    return [
      ...providers.map((who, r) => [who, ...grid[r]!.map(show)]),
      ['ANY PROVIDER', ...dates.map((_, c) => show(any(grid.map((row) => row[c]!))))],
    ]
  }
}

/* --- the shared parameter blocks ------------------------------------------- */
const dateRange: RSField[] = [
  { kind: 'section', label: 'Date Range' },
  { kind: 'text', id: 'dateFrom', label: 'Start Date:', value: '0000.00.00', w: 82, align: 'center' },
  { kind: 'text', id: 'dateTo', label: 'End Date:', value: '0000.00.00', w: 82, align: 'center' },
  { kind: 'section', label: 'Weeks between Slices' },
  { kind: 'text', id: 'weeks', label: 'Number:', value: '1', w: 40, align: 'center' },
]

/* --- Same or Next Day Appts -------------------------------------------------- */
const sameHead: string[] = []
const sameOrNext: ReportSpec = {
  folder: 'Practice Management - Access',
  name: 'Same or Next Day Appts',
  id: 'same-next-day',
  width: 670,
  height: 540,
  labelW: 82,
  provenance: '304054 0b2ce8a5 (window), f8a1f45e (page)',
  inferred: 'The sheet for Next Day is assumed to caption A1 "PROVIDER - Next Day" (only Same Day is captured). '
    + 'A blank Start / End runs the thirteen weeks up to today. The Include / Exclude visit codes do not change the sample figures.',
  excelOnly: true,
  fields: [
    ...dateRange,
    { kind: 'section', label: 'Time Frame' },
    { kind: 'radio', id: 'frame', label: '', options: ['Same Day', 'Next Day'], value: 'Same Day', column: true },
    { kind: 'section', label: 'Visit Codes:' },
    { kind: 'text', id: 'include', label: 'Include:', w: 218, hint: '(seperate by comma)' },
    { kind: 'text', id: 'exclude', label: 'Exclude:', w: 218, hint: '(seperate by comma)' },
  ],
  output: {
    title: 'Same or Next Day Appts',
    cols: [100],
    head: ['PROVIDER'],
    rows: [],
    excelHead: sameHead,
    /* percent of the slice's appointments booked same (next) day; most
       slices none, the way the capture reads */
    excelRows: (ctx) => pivot(
      sameHead,
      `PROVIDER - ${ctx.val('frame') || 'Same Day'}`,
      PROVIDERS,
      (who, d) => {
        const n = seed(`${who}|${d}|${ctx.val('frame')}`) % 16
        return n < 12 ? 0 : [100, 50, 33, 100][n - 12]!
      },
      (v) => Math.max(...v),
      String,
    )(ctx),
  },
}

/* --- Third Soonest Appt ------------------------------------------------------ */
const thirdHead: string[] = []
const providerRows = [1, 2, 3, 4, 5].map((n) => `prov${n}`)
const thirdSoonest: ReportSpec = {
  folder: 'Practice Management - Access',
  name: 'Third Soonest Appt',
  id: 'third-soonest',
  width: 654,
  height: 529,
  labelW: 82,
  provenance: '304054 e38dd601 (window), a1e06548 (page)',
  inferred: 'The five "Choose Multiple Provider(s)" rows are drawn as unlabelled edit fields with "…" in the label column grid '
    + '(the capture has them flush left in a DataWindow with a current-row arrow). The article says the report "show[s] all '
    + 'providers"; the emulator lists only the chosen ones when any are filled. A blank Start / End runs the thirteen weeks up to today.',
  excelOnly: true,
  fields: [
    ...dateRange,
    { kind: 'section', label: 'Visit Codes:' },
    { kind: 'text', id: 'exclude', label: 'Exclude:', w: 218, hint: '(separate by comma)' },
    { kind: 'section', label: 'Choose Multiple Provider(s)' },
    ...providerRows.map((id): RSField => ({ kind: 'text', id, w: 340, dots: { title: 'Providers', options: 'providers' } })),
  ],
  output: {
    title: 'Third Soonest Appt',
    cols: [100],
    head: ['PROVIDER'],
    rows: [],
    excelHead: thirdHead,
    /* hours from the slice to the third appointment booked after it;
       >4320 when none is found within 180 days */
    excelRows: (ctx) => {
      const chosen = providerRows.map((id) => ctx.val(id)).filter(Boolean)
      const who = chosen.length ? [...new Set(chosen)] : PROVIDERS
      return pivot(
        thirdHead,
        'PROVIDER',
        who,
        (w, d) => {
          const s = seed(`${w}|${d}`)
          if (w === 'SHEWCHUK, LEAH') return 4321
          return 20 + (s % 7 === 0 ? 1200 + (s % 600) : s % 900)
        },
        (v) => Math.min(...v),
        (n) => (n > 4320 ? '>4320' : n.toLocaleString('en-CA')),
      )(ctx)
    },
  },
}

/* --- Wait/Appt Duration ------------------------------------------------------ */
const waitHead: string[] = []
/** the sheet's A1 caption per interval; only "Appt Duration" is captured */
const WAIT_CAPTION: Record<string, string> = {
  'Arrival to Appointment': 'Arrival to Appt',
  'Appointment to Seen': 'Wait Time',
  'Seen to Discharge': 'Appt Duration',
}
const waitDuration: ReportSpec = {
  folder: 'Practice Management - Access',
  name: 'Wait/Appt Duration',
  id: 'wait-appt-duration',
  width: 670,
  height: 540,
  labelW: 82,
  provenance: '304054 5641abdc (window), f32f2532 (page)',
  inferred: 'Only the Seen to Discharge sheet is captured ("PROVIDER - Appt Duration"); the A1 captions for Arrival to Appointment '
    + '("PROVIDER - Arrival to Appt") and Appointment to Seen ("PROVIDER - Wait Time") are inferred. The capture has no ANY PROVIDER '
    + 'row, so this sheet has none. A blank Start / End runs the thirteen weeks up to today.',
  excelOnly: true,
  fields: [
    ...dateRange,
    { kind: 'section', label: 'Visit Codes:' },
    { kind: 'text', id: 'exclude', label: 'Exclude:', w: 218, hint: '(seperate by comma)' },
    { kind: 'section', label: 'Time Intervals' },
    {
      kind: 'radio', id: 'interval', label: '', column: true,
      options: ['Arrival to Appointment', 'Appointment to Seen', 'Seen to Discharge'], value: 'Arrival to Appointment',
    },
  ],
  output: {
    title: 'Wait/Appt Duration',
    cols: [100],
    head: ['PROVIDER'],
    rows: [],
    excelHead: waitHead,
    /* average minutes between the interval's two times; 0 on a slice with no
       timed encounters; Arrival can go negative (arrived after the appointment) */
    excelRows: (ctx) => {
      const interval = ctx.val('interval') || 'Arrival to Appointment'
      const rows = pivot(
        waitHead,
        `PROVIDER - ${WAIT_CAPTION[interval] ?? 'Appt Duration'}`,
        PROVIDERS,
        (who, d) => {
          const s = seed(`${who}|${d}|${interval}`)
          if (who === 'SHEWCHUK, LEAH' || s % 5 === 0) return 0
          if (interval === 'Arrival to Appointment') return (s % 22) - 4
          if (interval === 'Appointment to Seen') return (s % 25) - 3
          return 12 + (s % 20)
        },
        () => 0,
        String,
      )(ctx)
      return rows.slice(0, -1)
    },
  },
}

/* --- Advance Appointment Search ---------------------------------------------- */
const advanceSearch: ReportSpec = {
  folder: 'Practice Management - Access',
  name: 'Advance Appointment Search',
  id: 'advance-appt-search',
  title: 'Appointment Search',
  width: 798,
  height: 671,
  provenance: '304054 b27d8294 (window), 06170e81 (page)',
  inferred: 'Hand-built window (screens/reports/AccessReportWindows.tsx); see its header for what is inferred.',
  window: 'report-params-advance-appt-search',
  fields: [],
}

export const specs: ReportSpec[] = [advanceSearch, sameOrNext, thirdSoonest, waitDuration]
