import type { Patient } from '../patients'
import type { ReportSpec, RSContext, RSField, RSRow } from './types'
import { MOIS_TODAY, rsDaysAgo, rsMoney, rsName, rsSample } from './types'

/* ============================================================================
   Report specs transcribed from manual article 304044 (Accounts - Private
   Invoice): the eight rows of the `Accounts - Private (Inv)` folder.
   PROVENANCE: per spec below.

   Every window is the plain Selection Parameter form: navy date-range
   heading, `From Date: [ ] to [ ]`, Ok / Cancel. Where the capture paints the
   From box salmon the spec marks it `required`; the Invoice Detail and
   Invoices Written Off captures were taken with Ok focused and show no salmon
   box, so theirs are plain ranges. Date defaults follow the captures: blank
   `0000.00.00`, "90 days ago → today" (2012.04.11 → 2012.07.10) or "January 1
   → today" (2012.01.01 → 2012.07.10), re-based on MOIS_TODAY.

   The private-invoice sample set below is shared with 304045
   (accountsPrivateTrans.ts): one ledger, so the Inv and Trans reports agree
   with each other. Every patient is a roster chart and every provider an
   RS_PROVIDERS name; amounts, invoice numbers and payor codes are fictional
   training data. The date ranges really filter it (a blank or `0000.00.00`
   bound is open).
   ========================================================================= */

/* --- the shared private ledger (also read by accountsPrivateTrans.ts) ------ */

export type PvInvoice = {
  inv: number
  prov: string
  /** index into the roster sample (pvPatient) */
  pt: number
  /** Payor Code: blank = billed to the patient */
  payor: string
  /** Invoice Code (clinic-defined group, e.g. FORM); blank prints <EMPTY> */
  code: string
  /** first bill (= service) date, in days before MOIS_TODAY */
  ago: number
  bills: number
  billed: number
  gst: number
  paid: number
  adj: number
  wo: number
  payAgo?: number
  method?: string
  adjAgo?: number
  woAgo?: number
  fee: string
  desc: string
  dx: string
  dxDesc: string
  claim?: string
  msg?: string
  comment?: string
}

const [WB, AD, DH] = ['BEARDWOOD, WALTER', 'DUCHARME, AMARILYS', 'HOWSER, DOOGIE']

export const PV_INVOICES: PvInvoice[] = [
  { inv: 15031, prov: WB, pt: 3, payor: '', code: 'FORM', ago: 40, bills: 1, billed: 45, gst: 0, paid: 45, adj: 0, wo: 0, payAgo: 40, method: 'CASH', fee: 'A0071', desc: "DRIVER'S MEDICAL EXAM", dx: 'V70', dxDesc: 'GENERAL MEDICAL EXAM' },
  { inv: 15032, prov: WB, pt: 15, payor: 'WCB', code: 'FORM', ago: 62, bills: 2, billed: 120, gst: 0, paid: 0, adj: 0, wo: 0, fee: 'A0095', desc: 'WCB FORM 8/11', dx: '847', dxDesc: 'SPRAIN OF BACK', claim: 'W26-44817', msg: 'SECOND NOTICE SENT' },
  { inv: 15033, prov: WB, pt: 17, payor: 'PRIV', code: '', ago: 25, bills: 1, billed: 250, gst: 12.5, paid: 100, adj: 0, wo: 0, payAgo: 20, method: 'CHEQ', fee: 'A0080', desc: 'MEDICAL-LEGAL LETTER', dx: '311', dxDesc: 'DEPRESSION' },
  { inv: 15034, prov: AD, pt: 4, payor: 'PRIV', code: '', ago: 110, bills: 3, billed: 79.4, gst: 0, paid: 0, adj: 0, wo: 0, fee: '00120', desc: 'COMPLETE EXAM - PRIVATE', dx: '715', dxDesc: 'OSTEOARTHRITIS', msg: 'FINAL NOTICE' },
  { inv: 15035, prov: AD, pt: 10, payor: 'ICBC', code: 'FORM', ago: 55, bills: 1, billed: 180, gst: 9, paid: 180, adj: 0, wo: 0, payAgo: 30, method: 'EFT', fee: 'A0090', desc: 'ICBC CL19 REPORT', dx: '847', dxDesc: 'SPRAIN OF BACK', claim: 'IC-2026-30511' },
  { inv: 15036, prov: AD, pt: 16, payor: '', code: '', ago: 18, bills: 1, billed: 30, gst: 0, paid: 0, adj: 10, wo: 0, adjAgo: 12, fee: 'A0012', desc: 'SICK NOTE', dx: '780', dxDesc: 'FEVER' },
  { inv: 15037, prov: DH, pt: 11, payor: 'PRIV', code: '', ago: 75, bills: 2, billed: 144.4, gst: 0, paid: 50, adj: 0, wo: 94.4, payAgo: 60, method: 'DEBIT', woAgo: 15, fee: '00120', desc: 'COMPLETE EXAM - PRIVATE', dx: '250', dxDesc: 'DIABETES MELLITUS', comment: 'UNCOLLECTABLE - MOVED AWAY' },
  { inv: 15038, prov: DH, pt: 6, payor: 'PRIV', code: 'FORM', ago: 33, bills: 1, billed: 60, gst: 0, paid: 75, adj: 0, wo: 0, payAgo: 28, method: 'VISA', fee: 'A0071', desc: "DRIVER'S MEDICAL EXAM", dx: 'V70', dxDesc: 'GENERAL MEDICAL EXAM' },
  { inv: 15039, prov: DH, pt: 13, payor: 'WCB', code: 'FORM', ago: 140, bills: 1, billed: 536, gst: 0, paid: 450, adj: 0, wo: 136, payAgo: 120, method: 'CHEQ', woAgo: 100, fee: 'A0095', desc: 'WCB FORM 8/11', dx: '847', dxDesc: 'SPRAIN OF BACK', claim: 'W26-31190', comment: 'WCB ALLOWED AMOUNT' },
  { inv: 15040, prov: WB, pt: 8, payor: '', code: '', ago: 8, bills: 1, billed: 35, gst: 0, paid: 0, adj: 0, wo: 0, fee: 'A0012', desc: 'SICK NOTE', dx: '465', dxDesc: 'URTI' },
  { inv: 15041, prov: AD, pt: 3, payor: 'PRIV', code: '', ago: 200, bills: 3, billed: 95, gst: 4.75, paid: 40, adj: 0, wo: 0, payAgo: 170, method: 'CASH', fee: 'A0080', desc: 'MEDICAL-LEGAL LETTER', dx: '715', dxDesc: 'OSTEOARTHRITIS', msg: 'PAYMENT PLAN' },
]

const roster = rsSample(40)
export const pvPatient = (i: PvInvoice | number): Patient => roster[(typeof i === 'number' ? i : i.pt) % roster.length]!
/** billed less paid / adjusted / written off; negative = overpaid */
export const pvNet = (i: PvInvoice) => Math.round((i.billed - i.paid - i.adj - i.wo) * 100) / 100
export const pvSum = <T>(xs: T[], f: (x: T) => number) => Math.round(xs.reduce((s, x) => s + f(x), 0) * 100) / 100
/** MOIS prints nothing as `-` and a negative in brackets */
export const pvMoney = (n: number) => (!n ? '-' : n < 0 ? `(${rsMoney(-n)})` : rsMoney(n))
export const pvB = (s: string) => (s ? `**${s}**` : '')
/** yyyy.mm.dd, n days before MOIS_TODAY */
export const pvDot = (ago: number) => rsDaysAgo(ago)
/** 8/2/2011 — the A/R captures print the bill date this way */
export const pvMdy = (ago: number) => { const [y, m, d] = rsDaysAgo(ago).split('.'); return `${Number(m)}/${Number(d)}/${y}` }
/** 2010/10/18 — the Written Off capture */
export const pvSlash = (ago: number) => rsDaysAgo(ago).replace(/\./g, '/')
/** `C  BUMSTEAD` / `M L  MOUSE` — initials then surname, as the A/R Sorted and Overpaid pages print */
export const pvInitials = (p: Patient) => `${[p.first, p.middle].filter(Boolean).map((s) => s[0]).join(' ')}  ${p.last}`

const DATE_RE = /^(\d{4})\.(\d{2})\.(\d{2})$/
const dayNo = (s: string): number | null => {
  const m = DATE_RE.exec(s.trim())
  if (!m || Number(m[1]) < 1900) return null
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000
}
const TODAY_NO = dayNo(MOIS_TODAY)!
/** is `ago` (days before today) inside the window's `<id>From` … `<id>To`? A blank / 0000 bound is open */
export function pvInRange(ctx: RSContext, id: string, ago: number | undefined): boolean {
  if (ago == null) return false
  const lo = dayNo(ctx.val(`${id}From`)), hi = dayNo(ctx.val(`${id}To`))
  const d = TODAY_NO - ago
  return (lo == null || d >= lo) && (hi == null || d <= hi)
}
/** sorted groups, blank key first (MOIS sorts the blank payor to the top) */
export function pvGroup<T>(xs: T[], key: (x: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>()
  for (const x of xs) { const k = key(x); if (!m.has(k)) m.set(k, []); m.get(k)!.push(x) }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
}
export const pvByName = (xs: PvInvoice[]) => [...xs].sort((a, b) => rsName(pvPatient(a)).localeCompare(rsName(pvPatient(b))) || b.ago - a.ago)
export const pvByDate = (xs: PvInvoice[]) => [...xs].sort((a, b) => b.ago - a.ago || a.inv - b.inv)

/** `From Date: [salmon] to [ ]` — a range whose From box the capture paints salmon */
export function pvDateRow(label: string, from = '0000.00.00', to = '0000.00.00'): RSField {
  return {
    kind: 'row', label, fields: [
      { kind: 'text', id: 'dateFrom', value: from, w: 80, align: 'center', required: true },
      { kind: 'text', id: 'dateTo', label: 'to', value: to, w: 80, align: 'center' },
    ],
  }
}
/** January 1 of MOIS_TODAY's year — the Invoice Detail / Written Off default */
export const PV_JAN1 = `${MOIS_TODAY.slice(0, 4)}.01.01`

const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
const [ty, tm, td] = MOIS_TODAY.split('.').map(Number)
/** `JULY 10, 2012` — the A/R Sorted title's long date */
const TODAY_LONG = `${MONTHS[tm! - 1]} ${td}, ${ty}`

/** A/R Sorted and Overpayment share one page layout */
const sortedHead = ['PATIENT', 'CHART', '1st BILLED DATE', '# BILLS', 'BILLED', 'PAID', 'ADJUST', 'WRITE OFF', 'NET', 'PAYOR']
const sortedCols = [17, 7, 10, 6, 10, 10, 9, 10, 11, 10]
function sortedRows(list: PvInvoice[]): RSRow[] {
  const out: RSRow[] = []
  const money = (xs: PvInvoice[]) => [pvSum(xs, (i) => i.billed), pvSum(xs, (i) => i.paid), pvSum(xs, (i) => i.adj), pvSum(xs, (i) => i.wo), pvSum(xs, pvNet)].map((n) => pvB(pvMoney(n)))
  for (const [prov, invs] of pvGroup(list, (i) => i.prov)) {
    out.push(`%SUB%FOR PROVIDER: ${prov}`)
    for (const [payor, byPayor] of pvGroup(invs, (i) => i.payor)) {
      for (const i of pvByName(byPayor)) {
        const p = pvPatient(i)
        out.push([pvInitials(p), p.chart, pvDot(i.ago), String(i.bills), ...[i.billed, i.paid, i.adj, i.wo, pvNet(i)].map(pvMoney), i.payor])
      }
      out.push(['', pvB(`SUBTOTAL FOR PAYOR CODE ${payor} :`), '', '', ...money(byPayor), ''])
    }
    out.push([pvB('TOTAL FOR PROVIDER'), pvB(`${prov} :`), '', '', ...money(invs), ''])
  }
  if (list.length) out.push('%HR%', [pvB('TOTAL FOR ALL PROVIDERS:'), '', '', '', ...money(list), ''])
  return out
}

/* --- Statements for Overdue Range: one statement page per overdue invoice -- */

const titleCase = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
const doctor = (prov: string) => { const [last = '', first = ''] = prov.split(', '); return `${first[0] ?? ''}. ${titleCase(last)}, M.D.` }
function statementPage(i: PvInvoice, update: boolean): string {
  const p = pvPatient(i)
  const who = `${p.first}${p.middle ? ` ${p.middle[0]}.` : ''} ${p.last}`
  const addr = [p.address ?? '', [p.city, p.province, p.postal].filter(Boolean).join(' ')].filter(Boolean)
  const last = update ? MOIS_TODAY : pvDot(Math.max(0, i.ago - 30 * (i.bills - 1)))
  const due = pvNet(i)
  const L = '%LINE:58,24,18%'
  const T = '%LINE:62,24,14%'
  return [
    `%SUB%${doctor(i.prov)}`,
    '%SUB%MOIS TEST CLINIC, Prince George, B.C.',
    '%RULE%',
    'Bill To:',
    `**${who}**`,
    ...addr.map((a) => `**${a}**`),
    '%RULE%',
    `${L}For:|Invoice Number:|**${i.inv}**`,
    `${L}**${who}**|First Bill Date:|**${pvDot(i.ago)}**`,
    `${L}${addr[0] ? `**${addr[0]}**` : ''}|Last Bill Date:|**${last}**`,
    `${L}${addr[1] ? `**${addr[1]}**` : ''}|Number of Statements|**${update ? i.bills + 1 : i.bills}**`,
    `${L}Internal ID Number:  ${p.chart}|   Sent for This Account:|`,
    '%RULE%',
    '%S%DETAIL',
    '%COLS:11,9,44,12,12,12%',
    '%TH%DATE|FEE ITEM|DESCRIPTION|NUMBER SERVICE|AMOUNT BILLED|AMOUNT PAID',
    `%TR%${pvDot(i.ago)}|${i.fee}|${i.desc}|1.00|${rsMoney(i.billed)}|${pvMoney(i.paid)}`,
    `${T}|SUBTOTAL:|${rsMoney(i.billed)}`,
    `${T}|+HST:|${rsMoney(i.gst)}`,
    `${T}|=TOTAL:|${rsMoney(i.billed + i.gst)}`,
    ...(i.paid ? [`${T}|PAID:|(${rsMoney(i.paid)})`] : []),
    '%RULE%',
    `${T}|**TOTAL DUE:**|**${rsMoney(due + i.gst)}**`,
  ].join('\n')
}

export const specs: ReportSpec[] = [
  {
    folder: 'Accounts - Private (Inv)',
    name: 'A/R by Practitioner for Selected Payor',
    id: 'ar-by-practitioner-payor',
    provenance: '304044 7e530bec (window), 99c49073 (page)',
    fields: [
      { kind: 'section', label: 'Date Range (INCLUSIVE)' },
      pvDateRow('From Date:'),
      { kind: 'text', id: 'payor', label: 'Payor Code:', w: 120 },
    ],
    output: {
      title: `PRACTICE PRIVATE ACCOUNTS RECEIVABLE AS OF ${MOIS_TODAY}`,
      subtitle: 'PAYMENT DATE RANGE: {dateFrom} AND {dateTo}\nPAYOR CODE: {payor}',
      cols: [26, 13, 9, 12, 12, 28],
      head: ['NAME', 'CLAIM NO.', 'INV NO.', '1st BILL DATE', 'AMOUNT DUE', 'MESSAGE'],
      /* "A valid Payor Code must be entered … Leaving this field blank or
         putting in irrelevant codes will return a blank report." */
      rows: (ctx) => {
        const payor = ctx.val('payor')
        if (!payor) return []
        const list = PV_INVOICES.filter((i) => pvInRange(ctx, 'date', i.ago) && pvNet(i) > 0 && ctx.like(payor, i.payor, 'equals'))
        const out: RSRow[] = []
        for (const [prov, invs] of pvGroup(list, (i) => i.prov)) {
          out.push(`**PROVIDER:   ${prov}**`)
          for (const i of pvByName(invs)) out.push([rsName(pvPatient(i)), i.claim ?? '', String(i.inv), pvMdy(i.ago), rsMoney(pvNet(i)), i.msg ?? ''])
          out.push([pvB(`TOTAL AMOUNT DUE FOR PROVIDER ${prov}:`), '', '', '', pvB(rsMoney(pvSum(invs, pvNet))), ''])
        }
        if (list.length) out.push('%HR%', [pvB('TOTAL FOR ALL PROVIDERS:'), '', '', '', pvB(rsMoney(pvSum(list, pvNet))), ''])
        return out
      },
      footer: [],
    },
  },
  {
    folder: 'Accounts - Private (Inv)',
    name: 'A/R Sorted by Practitioner / Payor',
    id: 'ar-sorted-practitioner-payor',
    labelW: 60,
    provenance: '304044 9ba42740 (window), c571f417 (page)',
    fields: [
      { kind: 'text', id: 'dateFrom', label: 'From:', value: rsDaysAgo(90), w: 80, align: 'center', required: true },
      { kind: 'text', id: 'dateTo', label: 'To:', value: MOIS_TODAY, w: 80, align: 'center', hint: '(inclusive)' },
    ],
    output: {
      title: `PRACTICE PRIVATE ACCOUNTS RECEIVABLE AS OF ${TODAY_LONG}`,
      subtitle: 'DATE RANGE: {dateFrom} TO {dateTo}',
      cols: sortedCols,
      head: sortedHead,
      rows: (ctx) => sortedRows(PV_INVOICES.filter((i) => pvInRange(ctx, 'date', i.ago) && pvNet(i) > 0)),
      footer: [],
      chartCol: 1,
    },
  },
  {
    folder: 'Accounts - Private (Inv)',
    name: 'Alphabetic A/R',
    id: 'alphabetic-ar',
    provenance: '304044 e7a960c9 (window), b2086393 (page)',
    fields: [
      { kind: 'section', label: 'Date Range (INCLUSIVE)' },
      pvDateRow('From Date:'),
      { kind: 'text', id: 'payor', label: 'Payor Code:', w: 120 },
    ],
    output: {
      title: `ALPHABETIC INVOICE ACCOUNTS RECEIVABLE AS OF ${MOIS_TODAY}`,
      subtitle: 'PAYMENT DATE RANGE: {dateFrom} AND {dateTo}\nPAYOR CODE: {payor}',
      cols: [24, 19, 8, 11, 10, 9, 19],
      head: ['NAME', 'PROVIDER', 'INV NO.', '1st BILL DATE', 'AMOUNT DUE', 'PAYOR CODE', 'MESSAGE'],
      rows: (ctx) => {
        const payor = ctx.val('payor')
        if (!payor) return []
        return pvByName(PV_INVOICES.filter((i) => pvInRange(ctx, 'date', i.ago) && pvNet(i) > 0 && ctx.like(payor, i.payor, 'equals')))
          .map((i) => [rsName(pvPatient(i)), i.prov, String(i.inv), pvMdy(i.ago), rsMoney(pvNet(i)), i.payor, i.msg ?? ''])
      },
      footer: [],
    },
  },
  {
    folder: 'Accounts - Private (Inv)',
    name: 'Invoice Detail',
    id: 'invoice-detail',
    labelW: 95,
    provenance: '304044 1f785bf2 (window), 823a2260 (page)',
    inferred: 'Payor grouping: the page is captured grouped by Provider only; grouped by Payor the bands read PAYOR: <code> (the PAYOR column keeps its heading).',
    fields: [
      { kind: 'section', label: 'Bill Date #1 Range (INCLUSIVE)' },
      { kind: 'range', id: 'date', label: 'From Date:', from: PV_JAN1, to: MOIS_TODAY, w: 80, joiner: 'to' },
      { kind: 'section', label: 'Grouping / Sorting' },
      { kind: 'radio', id: 'grouping', options: ['Provider', 'Payor'], value: 'Provider', column: true },
    ],
    output: {
      title: `PRACTICE PRIVATE BILLS AS OF ${MOIS_TODAY}`,
      subtitle: 'BILL #1 DATE RANGE: {dateFrom} AND {dateTo}',
      cols: [24, 12, 11, 10, 10, 11, 10, 12],
      head: ['NAME', '1st BILL DATE', 'BILLED', 'PAID', 'ADJUST', 'WRITTEN OFF', 'PAYOR', 'RECON'],
      rows: (ctx) => {
        const byPayor = ctx.val('grouping') === 'Payor'
        const list = PV_INVOICES.filter((i) => pvInRange(ctx, 'date', i.ago))
        const money = (xs: PvInvoice[]) => [pvSum(xs, (i) => i.billed), pvSum(xs, (i) => i.paid), pvSum(xs, (i) => i.adj), pvSum(xs, (i) => i.wo)].map(pvMoney)
        const recon = (i: PvInvoice) => `${i.bills}  /  ${pvNet(i) > 0 ? 'U' : i.wo ? 'A' : 'P'}`
        const out: RSRow[] = []
        for (const [key, invs] of pvGroup(list, (i) => (byPayor ? i.payor : i.prov))) {
          out.push(`**${byPayor ? 'PAYOR' : 'PROVIDER'}:   ${key || '<EMPTY>'}**`)
          for (const [, day] of pvGroup(pvByDate(invs), (i) => pvDot(i.ago))) {
            for (const i of day) out.push([rsName(pvPatient(i)), pvDot(i.ago), ...money([i]), byPayor ? i.prov : i.payor, recon(i)])
            out.push(['', 'TOTALS FOR BILL DATE:', ...money(day), '', ''])
          }
          out.push([pvB(`TOTALS FOR ${byPayor ? 'PAYOR' : 'PROVIDER'} ${key}:`), '', ...money(invs).map(pvB), '', ''])
        }
        if (list.length) out.push('%HR%', [pvB('TOTALS FOR ALL PROVIDERS:'), '', ...money(list).map(pvB), '', ''])
        return out
      },
      footer: [],
    },
  },
  {
    folder: 'Accounts - Private (Inv)',
    name: 'Invoice Summary',
    id: 'invoice-summary',
    labelW: 95,
    provenance: '304044 bc29a165 (window), dba43f32 (page)',
    fields: [
      { kind: 'section', label: 'Bill Date #1 Range (INCLUSIVE)' },
      pvDateRow('From Date:'),
    ],
    output: {
      title: `SUMMARY OF PRACTICE PRIVATE ACCOUNTS AS OF ${MOIS_TODAY}`,
      subtitle: 'BILL #1 DATE RANGE: {dateFrom} AND {dateTo}',
      cols: [19, 8, 12, 12, 12, 12, 12, 13],
      head: ['PAYOR CODE', '# OF INV.', 'TOTAL BILLED', 'TOTAL PAID', 'ADJUSTED', 'WRITE-OFF', 'RECEIVABLE', 'OVER PAYMENT'],
      rows: (ctx) => {
        const list = PV_INVOICES.filter((i) => pvInRange(ctx, 'date', i.ago))
        const line = (xs: PvInvoice[]) => [String(xs.length), ...[
          pvSum(xs, (i) => i.billed), pvSum(xs, (i) => i.paid), pvSum(xs, (i) => i.adj), pvSum(xs, (i) => i.wo),
          pvSum(xs, (i) => Math.max(0, pvNet(i))), pvSum(xs, (i) => Math.max(0, -pvNet(i))),
        ].map(rsMoney)]
        const out: RSRow[] = []
        for (const [prov, invs] of pvGroup(list, (i) => i.prov)) {
          out.push(`**SUMMARY FOR: ${prov}**`)
          for (const [payor, xs] of pvGroup(invs, (i) => i.payor)) out.push([payor, ...line(xs)])
          out.push([pvB('ALL PAYORS:'), ...line(invs).map(pvB)])
        }
        if (list.length) out.push('%HR%', [pvB('ALL PROVIDERS:'), ...line(list).map(pvB)])
        return out
      },
      footer: [],
    },
  },
  {
    folder: 'Accounts - Private (Inv)',
    name: 'Invoices Written Off',
    id: 'invoices-written-off',
    provenance: '304044 7e056de4 (window), bb999033 (page)',
    fields: [
      { kind: 'section', label: 'Date Range (INCLUSIVE)' },
      { kind: 'range', id: 'date', label: 'From Date:', from: PV_JAN1, to: MOIS_TODAY, w: 80, joiner: 'to' },
    ],
    output: {
      title: `PRACTICE PRIVATE ACCOUNTS WRITTEN OFF AS OF ${MOIS_TODAY}`,
      subtitle: 'PAYMENT DATE RANGE: {dateFrom} AND {dateTo}',
      cols: [26, 12, 11, 11, 9, 9, 22],
      head: ['NAME', '1st BILL DATE', 'BILLED', 'PAID', 'PAYOR CODE', 'RECON CODE', 'COMMENT'],
      rows: (ctx) => {
        const list = PV_INVOICES.filter((i) => i.wo > 0 && pvInRange(ctx, 'date', i.ago))
        const money = (xs: PvInvoice[]) => [pvSum(xs, (i) => i.billed), pvSum(xs, (i) => i.paid)].map((n) => pvB(rsMoney(n)))
        const out: RSRow[] = []
        for (const [prov, invs] of pvGroup(list, (i) => i.prov)) {
          out.push(`**PROVIDER:   ${prov}**`)
          for (const [, xs] of pvGroup(invs, (i) => i.payor)) {
            for (const i of pvByDate(xs)) out.push([rsName(pvPatient(i)), pvSlash(i.ago), rsMoney(i.billed), rsMoney(i.paid), i.payor, `${i.bills}  /  A`, i.comment ?? ''])
            out.push([pvB('SUBTOTAL FOR PAYOR CODE:'), '', ...money(xs), '', '', ''])
          }
          out.push([pvB('TOTAL FOR PROVIDER:'), '', ...money(invs), '', '', ''])
        }
        return out
      },
      footer: [],
    },
  },
  {
    folder: 'Accounts - Private (Inv)',
    name: 'Overpayment',
    id: 'overpayment',
    labelW: 95,
    provenance: '304044 27b22022 (window), 12e45b35 (page)',
    fields: [
      { kind: 'section', label: 'Bill Date #1 Range (INCLUSIVE)' },
      pvDateRow('From Date:', rsDaysAgo(90), MOIS_TODAY),
    ],
    output: {
      title: `PRACTICE PRIVATE ACCOUNTS OVER PAID AS OF ${MOIS_TODAY}`,
      subtitle: 'DATE RANGE: {dateFrom} TO {dateTo}',
      cols: sortedCols,
      head: sortedHead,
      rows: (ctx) => sortedRows(PV_INVOICES.filter((i) => pvInRange(ctx, 'date', i.ago) && pvNet(i) < 0)),
      footer: [],
      chartCol: 1,
    },
  },
  {
    folder: 'Accounts - Private (Inv)',
    name: 'Statements for Overdue Range',
    id: 'statements-overdue-range',
    labelW: 60,
    provenance: '304044 04eddb4d (window), f6098efe (page)',
    inferred: 'The statement letterhead (provider and clinic lines) is re-authored for the roster; the capture shows a real clinic. Update = Yes stamps today as Last Bill Date and adds one to Number of Statements, per the article.',
    fields: [
      { kind: 'section', label: 'Statement Overdue by (days)' },
      {
        kind: 'row', label: 'From:', fields: [
          { kind: 'text', id: 'daysFrom', w: 40, align: 'right', required: true },
          { kind: 'text', id: 'daysTo', label: 'to', w: 40, align: 'right' },
          { kind: 'check', id: 'partial', text: 'Included Partially Paid Invoices' },
        ],
      },
      { kind: 'section', label: 'Update Bill Date and # of Bills:' },
      { kind: 'radio', id: 'update', label: 'Update:', options: ['Yes', 'No'], value: 'Yes' },
      { kind: 'note', indent: 60, text: '* If all three bill dates are filled, MOIS will move the last billed date to the second date, and put today\'s date in the third billed date.' },
    ],
    /* "Invoice Status Code = U (i.e. unpaid) … one patient per page" */
    pages: (ctx) => {
      const a = parseInt(ctx.val('daysFrom'), 10), b = parseInt(ctx.val('daysTo'), 10)
      const hi = Number.isNaN(a) ? Infinity : Math.max(a, Number.isNaN(b) ? 0 : b)
      const lo = Number.isNaN(b) ? 0 : Math.min(b, Number.isNaN(a) ? b : a)
      const due = pvByDate(PV_INVOICES.filter((i) => pvNet(i) > 0 && i.ago >= lo && i.ago <= hi && (i.paid === 0 || ctx.on('partial'))))
      if (!due.length) return ['%G%No invoices are overdue in this range.']
      return due.map((i) => statementPage(i, ctx.val('update') !== 'No'))
    },
  },
]
