import { patients, MOIS_TODAY, type Patient } from '../patients'

/* ============================================================================
   Report specs — one declarative entry per Reports-module report.

   The Reports module holds about a hundred reports, and almost every one of
   them opens the same PowerBuilder window: caption `Report: <Folder> -
   <Name>`, a grey `Selection Parameter` band, navy section headings ruled
   underneath, label / control / grey hint lines, and Ok / Cancel
   bottom-centre (304042 `bcde4768`, `10cf8bd2`, and every Parameters capture
   in 304042–304056). What differs between reports is only which sections
   and lines they carry, so a report is written down here as data and drawn
   by the one renderer, `screens/ReportSpecWindow.tsx`, rather than by a
   hand-built window each.

   Each spec is transcribed from its article's Parameters capture (the window)
   and Report Outcome capture (the printed page). `provenance` cites both;
   `inferred` says what, if anything, was reconstructed from the article's
   text because no capture exists. The six older, hand-built windows
   (screens/ReportParameterWindows.tsx, PatientsByProcedureWindow.tsx) and
   the Clinical Value Scorecard keep their own components; a spec never
   duplicates one of them.

   Spec files live beside this one, one per Reports article
   (`accounts.ts`, `clinicalMain.ts` …), and are gathered by `index.ts`.
   All data a spec prints is fictional training data over the emulator's
   roster.
   ========================================================================= */

/* --- the lists the drop-downs and "…" pickers offer ----------------------- */

/** Provider drop-downs: blank first (= all providers), then the clinic's */
export const RS_PROVIDERS = ['', 'BEARDWOOD, WALTER', 'DUCHARME, AMARILYS', 'FAIRCHILD, NESRIN L', 'HOWSER, DOOGIE', 'SHEWCHUK, LEAH']
export const RS_FACILITIES = ['', 'MOIS TEST CLINIC', 'DAWSON CREEK HEALTH UNIT', 'PRINCE GEORGE HEALTH UNIT']
export const RS_SERVICE_CENTERS = ['', 'NURSING', 'MENTAL HEALTH', 'PUBLIC HEALTH', 'PRIMARY CARE']
export const RS_USERS = ['', 'ADMIN, MOIS', 'ALICE, DR', 'BEARDWOOD, WALTER', 'DUCHARME, AMARILYS', 'FRONT DESK, MOA', 'HOWSER, DOOGIE', 'SHEWCHUK, LEAH']
/** Patient Status codes, as the status "…" picker lists them */
export const RS_STATUS_CODES = ['A - ACTIVE', 'D - DECEASED', 'I - INACTIVE', 'LU - LOOK-UP ONLY', 'M - MOVED AWAY', 'T - TRANSIENT', 'TR - TRANSFERRED']

export type RSListName = 'providers' | 'facilities' | 'serviceCenters' | 'users' | 'statuses' | 'charts'
export type RSOptions = readonly string[] | RSListName

/** A "…" button's picker: a titled list; `multi` ticks several (Patient Status) */
export type RSPick = { title: string; options: RSOptions; multi?: boolean }

/** How a text parameter is compared, honouring the `%` wildcard (304049) */
export type RSMatch = 'contains' | 'begins' | 'ends' | 'equals'

/** greys a control while another parameter holds a value (the Service Phase
    ticks until "Include Service Event information" is ticked) */
export type RSDisabledIf = { field: string; is: string | boolean }

/* --- the controls a parameter window is made of ----------------------------
   `id` is unique within its spec. It names the control's anchor
   (`host.mois.field.<spec.id>-<id>`; a tick box or radio is a command,
   `host.mois.command.<spec.id>-<id>[-<option slug>]`) and the key the
   output reads the value under. `label` is the caption in the left column;
   `hint` the grey text after the control.                                  */
export type RSField =
  /** a navy section heading, ruled above and below; `right` puts a control on
      the heading line (`CSV Output  ☐ Direct Output to Excel`) */
  | { kind: 'section'; label: string; right?: RSField }
  /** an edit field; `dots` adds the "…" picker; `required` paints it salmon */
  | {
    kind: 'text'; id: string; label?: string; value?: string; w?: number; hint?: string
    align?: 'center' | 'right'; required?: boolean; dots?: RSPick; disabled?: boolean; disabledIf?: RSDisabledIf
  }
  /** From … to … on one line */
  | { kind: 'range'; id: string; label?: string; from?: string; to?: string; w?: number; hint?: string; joiner?: string; required?: boolean }
  /** a drop-down list; `editable` lets a value (or `%`) be typed into it */
  | { kind: 'select'; id: string; label?: string; options: RSOptions; value?: string; w?: number; hint?: string; editable?: boolean; disabled?: boolean; disabledIf?: RSDisabledIf }
  /** a radio group; `column` stacks the options; `outputs` makes an option
      the report's Excel / Chart Navigator switch (`Report Output: ( ) CSV File`) */
  | {
    kind: 'radio'; id: string; label?: string; options: readonly string[]; value?: string; column?: boolean; hint?: string
    outputs?: Record<string, 'excel' | 'navigator'>
  }
  /** a tick box; `output` makes it the report's Excel / Chart Navigator switch */
  | { kind: 'check'; id: string; label?: string; text: string; checked?: boolean; disabled?: boolean; hint?: string; output?: 'excel' | 'navigator'; disabledIf?: RSDisabledIf }
  /** numbered edit fields (`Problem 1:` … `Problem 8:`), in one or two columns */
  | { kind: 'list'; id: string; label: string; count: number; columns?: 1 | 2; w?: number; dots?: RSPick }
  /** a line of plain text (a note, "Any option left BLANK will be ignored.") */
  | { kind: 'note'; text: string; indent?: number }
  /** a thin rule between groups inside a section */
  | { kind: 'rule' }
  /** several controls on one line, after one caption */
  | { kind: 'row'; label?: string; fields: RSField[] }
  /** side-by-side columns of lines (the "Other Options:" block of 304049) */
  | { kind: 'columns'; columns: RSField[][] }

/* --- what Ok produces ------------------------------------------------------ */

/** a row of cells, or a raw page-markup line (`%RULE%`, `**GROUP**`, `%S%…`) */
export type RSRow = string[] | string

export type RSContext = {
  /** every parameter's value: text as typed, tick boxes as booleans; a range
      is `<id>From` / `<id>To`; a list is `<id>1` … `<id>N` */
  p: Record<string, string | boolean>
  /** a parameter as text ('' when blank or not text) */
  val: (id: string) => string
  /** a tick box's state */
  on: (id: string) => boolean
  /** a `%`-aware comparison: blank matches everything */
  like: (pattern: string, value: string, mode?: RSMatch) => boolean
  today: string
  patients: Patient[]
}

export type RSTable = {
  /** the page title, `{id}` tokens filled from the parameters (`{cutOff}`),
      `{today}` the emulator's date; a `\n` starts another line (so does one in `subtitle`) */
  title: string
  subtitle?: string
  /** the clinic line top-left; default `MOIS TEST CLINIC` */
  clinic?: string | false
  /** column widths in percent, and the header cells */
  cols: number[]
  head: string[]
  /** sample rows */
  rows: RSRow[] | ((ctx: RSContext) => RSRow[])
  /** drop sample rows a parameter excludes: cell `col` compared with the
      parameter `field` (`%`-aware). `modeField` names a radio whose value
      (Contains / Begins With / Ends With) picks the comparison. */
  filters?: { field: string; col: number; mode?: RSMatch; modeField?: string }[]
  /** lines after the table; default `TOTAL RECORDS: <n>` */
  footer?: string[] | ((ctx: RSContext, rows: string[][]) => string[])
  /** the Excel output's columns and rows when they differ from the page's */
  excelHead?: string[] | ((ctx: RSContext) => string[])
  excelRows?: (ctx: RSContext, rows: string[][]) => string[][]
  /** which cell holds the chart number, for Chart Navigator output */
  chartCol?: number
}

export type ReportSpec = {
  /** the catalogue folder and row name, exactly as data/reportCatalogue.ts has them */
  folder: string
  name: string
  /** short slug: the window is `report-params-<id>`, anchors are prefixed `<id>-` */
  id: string
  /** caption; default `Report: <folder> - <name>` */
  title?: string
  width?: number
  height?: number
  /** the label column's width (default 90) */
  labelW?: number
  /** article id + image hash prefixes: window, then page */
  provenance: string
  /** what was reconstructed without a capture */
  inferred?: string
  /** false: no grey `Selection Parameter` band */
  band?: boolean
  okLabel?: string
  fields: RSField[]
  /** the printed report */
  output?: RSTable
  /** what the Chart Navigator's Description column reads; default the report name in capitals */
  navigatorLabel?: string
  /** full control over the pages, for reports that are not one table */
  pages?: (ctx: RSContext) => string[]
  /** the report only ever goes to Excel (the Clinical - Audits "(Excel)" rows) */
  excelOnly?: boolean
  /** the row opens a hand-built window registered under this id instead of
      the generic one (a report whose window is not a parameter form, e.g.
      a search window with its own results grid); `fields` is then [] */
  window?: string
}

/* --- helpers a spec may use ------------------------------------------------ */

export { MOIS_TODAY }
export const rsPatients = (): Patient[] => patients
/** "LAST, FIRST" */
export const rsName = (p: Patient) => `${p.last}, ${p.first}`
/** the first `n` roster charts with a birth date, deterministically */
export const rsSample = (n: number, from = 0): Patient[] => patients.filter((p) => p.dob).slice(from, from + n)
/** whole years old at MOIS_TODAY */
export function rsAge(dob: string): string {
  if (!dob) return ''
  const [y, m, d] = dob.split('.').map(Number)
  const [ty, tm, td] = MOIS_TODAY.split('.').map(Number)
  return String(ty! - y! - (tm! < m! || (tm === m && td! < d!) ? 1 : 0))
}
/** 1234.5 → `1,234.50` */
export const rsMoney = (n: number) => n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
/** a date n days before MOIS_TODAY, yyyy.mm.dd */
export function rsDaysAgo(n: number): string {
  const [y, m, d] = MOIS_TODAY.split('.').map(Number)
  const t = new Date(Date.UTC(y!, m! - 1, d!) - n * 86400000)
  return `${t.getUTCFullYear()}.${String(t.getUTCMonth() + 1).padStart(2, '0')}.${String(t.getUTCDate()).padStart(2, '0')}`
}

/**
 * The `%` wildcard (304049): "For any report that has a CONTAINS argument,
 * BEGINS with, or ENDS with, this single, wildcard character will find all
 * entries … (e.g. use A%A to find every item with two A's in it)". `%` alone
 * matches everything; a blank parameter is ignored, as the windows say.
 */
export function rsLike(pattern: string, value: string, mode: RSMatch = 'contains'): boolean {
  const pat = pattern.trim()
  if (!pat) return true
  const body = pat.split('%').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')
  const re = mode === 'begins' ? `^${body}` : mode === 'ends' ? `${body}$` : mode === 'equals' ? `^${body}$` : body
  return new RegExp(re, 'i').test(value)
}

/** a radio caption → the comparison it selects */
export function rsMatchOf(caption: string): RSMatch {
  const c = caption.toLowerCase()
  return c.startsWith('begin') ? 'begins' : c.startsWith('end') ? 'ends' : c.startsWith('match') || c.startsWith('equal') ? 'equals' : 'contains'
}

export function rsOptions(o: RSOptions): readonly string[] {
  if (typeof o !== 'string') return o
  switch (o) {
    case 'providers': return RS_PROVIDERS
    case 'facilities': return RS_FACILITIES
    case 'serviceCenters': return RS_SERVICE_CENTERS
    case 'users': return RS_USERS
    case 'statuses': return RS_STATUS_CODES
    case 'charts': return patients.map((p) => `${p.chart} - ${p.last}, ${p.first}`)
  }
}
