import { daybookProviders } from './mois'
import { printReports, type PrintReport } from './printReports'
import { dayRows, offsetOfStamp, schedulerStore, stampOf } from './schedulerStore'

/* ============================================================================
   The Scheduler's Print-menu reports, added to the shared `printReports`
   list so `go.print(label)` and `host.mois.print` find them like any other.

   - Day Sheet - Desktop Provider / All Providers: art. 303824. The window
     asks only for the date (step "Select the date"), then the preview.
     The page is transcribed from `5d3c9825…`: PROVIDER / DAY SHEET FOR /
     PATIENTS BOOKED / PATIENTS SEEN / AS OF across the top, then one line per
     BILL — patient, chart no, fee code, billed, paid, diag code, payor code,
     W/O — under a band per claim state (UNSENT TO MSP), a SUBTOTAL and a
     TOTAL FOR DOCTOR. It is a DataWindow report in a proportional face.
     "The Day Sheet is a list of BILLS … not a list of all the appointments",
     so its lines are the appointments billed this session and nothing else;
     a day with nothing billed prints an empty sheet, which the article says
     is normal.
   - Current Daybook as Slate and Print Daily Appointment are on the menu in
     every capture but no page of either is in the manual: both are modelled
     (`captured: false`) as the day's appointments, time first.
   ========================================================================= */

/** Desktop For — whose day sheet "Desktop Provider" prints (art. 303824). */
export const DESKTOP_PROVIDER = 'TECHNICAL SUPPORT'

/** the fee MSP pays for 00100 in this training set */
const FEE_00100 = 31.62

const long = (stamp: string) => {
  const [y, m, d] = stamp.split('.').map(Number) as [number, number, number]
  const date = new Date(Date.UTC(y, m - 1, d))
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getUTCDay()]
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]
  return `${wd} ${mon} ${String(d).padStart(2, '0')}, ${y}`
}

function daySheet(providers: string[], stamp: string): string {
  const offset = offsetOfStamp(stamp)
  const s = schedulerStore.get()
  const lines: string[] = []
  for (const provider of providers) {
    const rows = dayRows(s, provider, offset)
    const bills = rows.filter((r) => s.billed[r.key])
    if (providers.length > 1 && !bills.length) continue
    const seen = rows.filter((r) => ['A', 'I', 'S', 'D'].includes(r.as)).length
    lines.push(
      `%COLS:14,36,22,28%`,
      `%TR%PROVIDER:|**${provider}**|DAY SHEET FOR:|**${long(stamp)}**`,
      `%COLS:25,25,22,28%`,
      `%TR%PATIENTS BOOKED:  ${rows.length}|PATIENTS SEEN:  ${seen}|AS OF:|**${long(stamp)}**`,
      `%COLS:28,9,11,14,11,10,10,7%`,
      `%TH%PATIENT|CHART NO|FEE CODE|BILLED|PAID|DIAG CODE|PAYOR CODE|W/O`,
    )
    if (bills.length) {
      lines.push('%S%UNSENT TO MSP')
      lines.push('%COLS:28,9,11,14,11,10,10,7%')
      for (const b of bills) {
        lines.push(`%TR%${b.first} ${b.last}|${b.chart}|${b.services}|${FEE_00100.toFixed(2)}|-|${b.issue}||`)
      }
    }
    const total = (bills.length * FEE_00100).toFixed(2)
    lines.push(
      '%COLS:48,14,11,27%',
      `%TR%SUBTOTAL:|${total}|-|`,
      `%TR%TOTAL FOR DOCTOR:|${total}|-|`,
      '',
    )
  }
  if (!lines.length) lines.push(`DAY SHEET FOR: ${long(stamp)}`, '', 'No bills were created for this date.')
  return lines.join('\n')
}

function slate(stamp: string, detail: boolean): string {
  const s = schedulerStore.get()
  const c = s.current
  const provider = c?.provider ?? DESKTOP_PROVIDER
  const rows = dayRows(s, provider, offsetOfStamp(stamp))
  return [
    `%G%${provider}`,
    `%G%${long(stamp)}          Appointment(s): ${rows.length}`,
    '%RULE%',
    detail ? '%U%TIME   CHART   PATIENT                          CODE  VISIT REASON' : '%U%TIME   PATIENT',
    ...rows.map((r) => (detail
      ? `${r.hr}:${r.mn}  ${r.chart.padEnd(7)} ${`${r.last}, ${r.first}`.padEnd(32)} ${r.code.padEnd(5)} ${r.reason}`
      : `${r.hr}:${r.mn}  ${r.last}, ${r.first}`)),
  ].join('\n')
}

const today = () => stampOf(schedulerStore.get().current?.offset ?? 0)

/** the day the training day book opens on (data/daybook.ts) */
const OPENING_DAY = '2026.08.11'

/* Built on first use, not at module load: this file sits on the menu
   registry's import path, and another data module may not be initialised
   yet when it is evaluated (see the coordinator's note in FIX-BRIEF). */
const reports = (): PrintReport[] => [
  {
    menu: 'Day Sheet - Desktop Provider',
    title: 'Day Sheet',
    band: false,
    fields: [{ kind: 'text', label: 'Date:', key: 'date', value: OPENING_DAY, width: 100 }],
    reportTitle: 'Day Sheet',
    captured: true,
    font: 'sans',
    size: { width: 360, height: 190 },
    build: ({ params }) => daySheet([DESKTOP_PROVIDER], String(params.date || today())),
  },
  {
    menu: 'Day Sheet - All Providers',
    title: 'Day Sheet',
    band: false,
    fields: [{ kind: 'text', label: 'Date:', key: 'date', value: OPENING_DAY, width: 100 }],
    reportTitle: 'Day Sheet',
    captured: true,
    font: 'sans',
    size: { width: 360, height: 190 },
    build: ({ params }) => daySheet(daybookProviders.map((p) => p.provider), String(params.date || today())),
  },
  {
    menu: 'Current Daybook as Slate',
    title: 'Current Daybook as Slate',
    fields: [],
    reportTitle: 'Daybook',
    captured: false,
    build: () => slate(today(), false),
  },
  {
    menu: 'Print Daily Appointment',
    title: 'Print Daily Appointment',
    fields: [],
    reportTitle: 'Daily Appointment',
    captured: false,
    build: () => slate(today(), true),
  },
]

let added = false
/** Put the Scheduler's reports on the shared list; the Scheduler's menus
    call this before they offer them. */
export function ensureSchedulerPrintReports() {
  if (added) return
  added = true
  for (const report of reports()) {
    if (!printReports.some((r) => r.menu === report.menu)) printReports.push(report)
  }
}

/** The page Print Current Day Book's Print produces (art. 303823). Modelled:
    the manual shows the dialog, not the page. */
export function daybookPrintPage(opts: {
  provider: string; stamp: string; all: boolean; part: 'all' | 'am' | 'pm'
  zeros: boolean; cancelled: boolean; rebooked: boolean; noShow: boolean; spacing: number; slateOnly: boolean
}): string {
  const s = schedulerStore.get()
  const offset = offsetOfStamp(opts.stamp)
  const providers = opts.all ? daybookProviders.map((p) => p.provider) : [opts.provider]
  const gap = Array.from({ length: Math.max(0, opts.spacing - 1) }, () => '')
  const out: string[] = []
  for (const provider of providers) {
    const rows = dayRows(s, provider, offset).filter((r) => {
      const h = Number(r.hr)
      if (!opts.zeros && r.hr === '00' && r.mn === '00') return false
      if (opts.part === 'am' && h >= 12) return false
      if (opts.part === 'pm' && h < 12) return false
      if (!opts.cancelled && r.as === 'C') return false
      if (!opts.rebooked && r.as === 'R') return false
      if (!opts.noShow && r.as === 'N') return false
      return true
    })
    if (opts.all && !rows.length) continue
    out.push(
      `%G%DAY BOOK: ${long(opts.stamp)}                     PROVIDER: ${provider}`,
      '%RULE%',
      opts.slateOnly
        ? '%U%HR MN  PATIENT'
        : '%U%HR MN  CODE  #   CHART   PATIENT                        VISIT REASON                  AS',
    )
    for (const r of rows) {
      out.push(opts.slateOnly
        ? `${r.hr} ${r.mn}  ${r.last}, ${r.first}`
        : `${r.hr} ${r.mn}  ${r.code.padEnd(5)} ${r.n.padEnd(3)} ${r.chart.padEnd(7)} ${`${r.last}, ${r.first}`.padEnd(30)} ${r.reason.slice(0, 29).padEnd(29)} ${r.as}`)
      out.push(...gap)
    }
    out.push('', `Appointment(s): ${rows.length}`, '')
  }
  return out.join('\n')
}
