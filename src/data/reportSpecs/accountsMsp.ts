import { MOIS_TODAY, rsFromDay as fromDay, rsMoney, rsSample, rsToDay as toDay, type ReportSpec, type RSContext, type RSField, type RSRow } from './types'
import type { Patient } from '../patients'

/* ============================================================================
   Report specs transcribed from manual article 304043 (Reports ▸ Accounts -
   MSP): the sixteen MSP claim reports. Every window is the standard
   Selection Parameter form; every printed page is drawn from one fictional
   claim ledger below (sent MSP / WCB / ICBC claims for three of the clinic's
   providers over roster patients), so the reports agree with each other the
   way the article says the real ones do.
   PROVENANCE: per spec below.

   The salmon edit in each Parameters capture is the edit holding the caret
   (the 304042 Invoice capture `3b634e70` shows the same wash on the focused
   Bill Date), not a required field, so no spec here marks it `required`.
   ========================================================================= */

/* --- the claim ledger ------------------------------------------------------ */

type ClaimState = 'paid' | 'part' | 'lift' | 'unpaid' | 'held' | 'refused' | 'failed' | 'deleted' | 'writeoff' | 'private'

type Claim = {
  seq: number; pi: number; prov: string; fee: string; billed: number; paid: number
  state: ClaimState; rc1: string; rc2: string; expl: string; adj: string
  payor: 'MSP' | 'WCB' | 'ICBC'; sub: string; clar: string; loc: string; memo: string
  services: number; unexpected?: number; walkIn?: boolean
}

const H = 'HOWSER, DOOGIE'
const S = 'SHEWCHUK, LEAH'
const B = 'BEARDWOOD, WALTER'

const c = (
  seq: number, pi: number, prov: string, fee: string, billed: number, paid: number, state: ClaimState,
  more: Partial<Claim> = {},
): Claim => ({
  seq, pi, prov, fee, billed, paid, state, rc1: '', rc2: '', expl: '', adj: '', payor: 'MSP', sub: '0',
  clar: '', loc: 'A', memo: '', services: 1, ...more,
})

const LEDGER: Claim[] = [
  c(242531, 0, H, '00100', 31.56, 31.56, 'paid'),
  c(242532, 1, H, '00120', 47.35, 52.08, 'lift', { clar: 'RR', adj: 'RR' }),
  c(242533, 2, H, '13050', 58.4, 0, 'unpaid', { rc2: 'U', services: 1.5 }),
  c(242534, 3, H, '00100', 31.56, 0, 'refused', { rc1: 'D', rc2: 'R', expl: 'RT' }),
  c(242535, 4, H, '14015', 22.1, 0, 'deleted', { rc2: 'X', memo: 'BILLED IN ERROR' }),
  c(242536, 5, H, '00100', 31.56, 0, 'writeoff', { rc1: 'W', rc2: 'R', expl: 'BG' }),
  c(242537, 6, H, '19950', 70, 70, 'paid', { payor: 'WCB', loc: 'R' }),
  c(242538, 7, H, '00100', 31.56, 0, 'held', { rc2: 'H' }),
  c(242541, 8, S, '00120', 47.35, 47.35, 'paid', { memo: 'LOCUM COVERAGE', services: 2 }),
  c(242542, 9, S, '13050', 58.4, 50, 'part', { expl: 'GH', adj: 'PA' }),
  c(242543, 10, S, '00100', 31.56, 0, 'failed', { rc2: 'F', expl: 'DE', memo: 'LOCUM COVERAGE' }),
  c(242544, 11, S, '00100', 31.56, 0, 'unpaid', { rc2: 'U', loc: 'E' }),
  c(242545, 0, S, '00100', 31.56, 31.56, 'paid', { payor: 'ICBC', sub: 'I', loc: 'E' }),
  c(242546, 1, S, '00120', 47.35, 0, 'private', { rc1: 'V', rc2: 'R', expl: 'AB' }),
  c(242551, 2, B, '00100', 31.56, 35.5, 'lift', { clar: 'RR', adj: 'RR', unexpected: 0.42 }),
  c(242552, 3, B, '14015', 22.1, 0, 'unpaid', { rc2: 'U', walkIn: true }),
  c(242553, 4, B, '00120', 47.35, 0, 'writeoff', { rc1: 'W', rc2: 'F', expl: 'DE' }),
  c(242554, 5, B, '13050', 58.4, 0, 'refused', { rc2: 'R', expl: 'RT', sub: 'R', memo: 'RESUBMIT' }),
  c(242555, 6, B, '00100', 31.56, 31.56, 'paid', { clar: 'RR', loc: 'R', services: 1.5 }),
]

/* --- dates ----------------------------------------------------------------- */

/** the date range a report ran for, in days: a blank To runs up to today (the
    article: "when given only an end date the report runs for all dates up to
    and including the end date"), a blank From reaches back four months */
function span(ctx: RSContext, id = 'dates'): [number, number] {
  const to = toDay(ctx.val(`${id}To`)) ?? toDay(MOIS_TODAY)!
  const from = toDay(ctx.val(`${id}From`)) ?? to - 120
  return from <= to ? [from, to] : [to, from]
}

type Row = Claim & { p: Patient; dos: string }

/** the ledger with patients and service dates spread through the range */
function ledger(ctx: RSContext, sp: [number, number] = span(ctx)): Row[] {
  const pts = rsSample(12)
  const n = LEDGER.length
  return LEDGER.map((cl, i) => ({
    ...cl,
    p: pts[cl.pi % pts.length]!,
    dos: fromDay(Math.round(sp[0] + (sp[1] - sp[0]) * (i / (n - 1)))),
  }))
}

/* --- filters and formatting ------------------------------------------------ */

const tr = (...cells: string[]) => `%TR%${cells.join('|')}`
const blanks = (n: number) => Array<string>(n).fill('')
const m = rsMoney
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const bold = (s: string) => `**${s}**`

/** `J  SMITH` — MSP's initials-then-surname */
const initialsLast = (p: Patient) => `${p.first.charAt(0)} ${p.middle ? p.middle.charAt(0) : ''}  ${p.last}`.toUpperCase()
const chartOf = (r: Row) => (r.walkIn ? '' : r.p.chart)
const recon = (r: Row) => `${r.rc1} - ${r.rc2}`

/** a comma-separated code box: blank matches every claim */
function inList(ctx: RSContext, list: string, value: string): boolean {
  const items = list.split(',').map((s) => s.trim()).filter(Boolean)
  return !items.length || items.some((it) => ctx.like(it, value, 'equals'))
}
/** the Memo Includes box (any occurrence of the text) */
const memoOk = (ctx: RSContext, r: Row) => ctx.like(ctx.val('memo'), r.memo, 'contains')
/** the Provider box of the Payments-by reports: `*` is the wild card */
const provOk = (ctx: RSContext, r: Row) => ctx.like(ctx.val('provider').replace(/\*/g, '%'), r.prov, 'equals')

const outstanding = (r: Row) => ['unpaid', 'held', 'refused', 'failed'].includes(r.state)
const PROVIDERS = [H, S, B]

/** one provider band, its rows and its total line; then the all-providers line */
function perProvider(
  rows: Row[], width: number,
  band: (prov: string) => string,
  each: (r: Row) => RSRow[],
  total: ((label: string, rs: Row[]) => string) | null,
  allLabel = 'TOTAL FOR ALL PROVIDERS:',
): RSRow[] {
  const out: RSRow[] = []
  for (const prov of PROVIDERS) {
    const mine = rows.filter((r) => r.prov === prov)
    if (!mine.length) continue
    out.push(tr(band(prov), ...blanks(width - 1)))
    mine.forEach((r) => out.push(...each(r)))
    if (total) out.push(total(`TOTAL FOR ${prov}:`, mine))
  }
  if (total && rows.length) out.push(total(allLabel, rows))
  return out
}

/* --- the parameter lines most of the windows share ------------------------- */

const DATE_SECTION: RSField = { kind: 'section', label: 'Date Range (INCLUSIVE)' }
const dates = (from = '0000.00.00', to = '0000.00.00'): RSField => ({ kind: 'range', id: 'dates', label: 'From Date:', from, to, w: 80 })
const MEMO: RSField = { kind: 'text', id: 'memo', label: 'Memo Includes:', w: 200 }
const CRITERIA_HEAD: RSField[] = [
  { kind: 'rule' },
  { kind: 'note', text: 'Claims printed in this report meet the following criteria:' },
  { kind: 'note', text: '- Not written off', indent: 12 },
  { kind: 'note', text: '- Not marked deleted or converted to private billing', indent: 12 },
  { kind: 'note', text: '- Not resubmitted', indent: 12 },
]
const CRITERIA: RSField[] = [
  ...CRITERIA_HEAD,
  { kind: 'note', text: '- Amount paid is zero.  Partially paid accounts which are not written off or resubmitted are considered accepted', indent: 12 },
]
const PAYMENT_NOTE = [
  'NOTE:   This report is generated by Sent to MSP payment date.  This date changes as MSP makes adjustments to the payment',
  '        amount (for example, in a subsequent debit).  Therefore, the totals in this report may not match the original MSP',
]
const AS_OF = `AS OF ${MOIS_TODAY}`

/* --- shared page layouts --------------------------------------------------- */

/** NAME | CHART NO. | SERVICE DATE | FEE CODE | BILLED | SEQ NO | RECON CODE 2 */
const AR_COLS = [30, 12, 11, 17, 12, 9, 9]
const AR_HEAD = ['NAME', 'CHART NO.', 'SERVICE DATE', 'FEE CODE', 'BILLED', 'SEQ NO', 'RECON CODE 2']
function arRows(rows: Row[]): RSRow[] {
  return perProvider(
    rows, AR_COLS.length,
    (prov) => bold(`PROVIDER: ${prov}`),
    (r) => [[bold(initialsLast(r.p)), chartOf(r), r.dos, r.fee, m(r.billed), String(r.seq), r.rc2]],
    (label, rs) => tr('', '', '', bold(label), bold(m(sum(rs.map((r) => r.billed)))), '', ''),
  )
}

/** SEQ NO | RECON CODE | NAME | SERVICE DATE | AMOUNT BILLED | AMOUNT PAID | EXPLAN CODE | ADJUST CODE */
const PAY_COLS = [9, 10, 28, 12, 11, 11, 10, 9]
const PAY_HEAD = ['SEQ NO', 'RECON CODE', 'NAME', 'SERVICE DATE', 'AMOUNT BILLED', 'AMOUNT PAID', 'EXPLAN CODE', 'ADJUST CODE']
function payRows(rows: Row[]): RSRow[] {
  return perProvider(
    rows, PAY_COLS.length,
    (prov) => bold(`PROVIDER: ${prov}`),
    (r) => [[String(r.seq), recon(r), bold(initialsLast(r.p)), r.dos, m(r.billed), m(r.paid), r.expl, r.adj]],
    (label, rs) => tr('', '', bold(label), '', bold(m(sum(rs.map((r) => r.billed)))), bold(m(sum(rs.map((r) => r.paid)))), '', ''),
  )
}

/** the payor columns of the two summaries */
type Payor = Claim['payor']
const money = (rs: Row[], payor: Payor, f: (r: Row) => number) => sum(rs.filter((r) => r.payor === payor).map(f))
function payorLine(label: string, rs: Row[], order: Payor[], f: (r: Row) => number): string[] {
  const vals = order.map((p) => money(rs, p, f))
  return [label, ...vals.map(m), m(sum(vals))]
}

/** the clarification-code / location-code totals pages */
function codeTotals(ctx: RSContext, rows: Row[], key: 'clar' | 'loc', caption: string, allLabel: string): RSRow[] {
  const detail = ctx.val('reportType') === 'Detail ALL Claims'
  const out: RSRow[] = []
  const tot = (rs: Row[]) => [m(sum(rs.map((r) => r.billed))), m(sum(rs.map((r) => r.paid)))]
  for (const prov of PROVIDERS) {
    const mine = rows.filter((r) => r.prov === prov)
    if (!mine.length) continue
    for (const payor of ['MSP', 'WCB', 'ICBC'] as const) {
      const ofPayor = mine.filter((r) => r.payor === payor)
      if (!ofPayor.length) continue
      out.push(tr(prov, '', payor === 'MSP' ? 'BC' : payor, '', ''))
      for (const code of [...new Set(ofPayor.map((r) => r[key]))]) {
        const rs = ofPayor.filter((r) => r[key] === code)
        if (detail) {
          rs.forEach((r) => out.push([`      ${r.seq}  ${initialsLast(r.p)}`, code, r.dos, m(r.billed), m(r.paid)]))
        }
        out.push(tr(`      ${caption}`, code, '', ...tot(rs)))
      }
    }
    out.push(tr(bold(`TOTALS FOR PROVIDER ${prov} :`), '', '', ...tot(mine).map(bold)))
  }
  if (rows.length) out.push(tr(bold(allLabel), '', '', ...tot(rows).map(bold)))
  return out
}

/** the Date Range heading with its Paid Date / Service Date choice, and the
    lines under it, of the two Payments-by reports */
const PAYMENTS_BY_TOP: RSField[] = [
  { kind: 'section', label: 'Date Range (INCLUSIVE)', right: { kind: 'radio', id: 'dateBasis', options: ['Paid Date', 'Service Date'], value: 'Paid Date' } },
  { kind: 'range', id: 'dates', label: 'From Date:', from: '0000.00.00', to: '', w: 80 },
  { kind: 'text', id: 'code', label: 'Code:', w: 50, hint: '(leave blank for ALL)' },
  {
    kind: 'text', id: 'provider', label: 'Provider:', w: 220, hint: '(leave blank for ALL, * for a wild card)',
    dots: { title: 'Provider', options: 'providers' },
  },
  MEMO,
  { kind: 'rule' },
]
const REPORT_TYPE: RSField = {
  kind: 'radio', id: 'reportType', label: 'Report Type:', options: ['Summary by Provider', 'Detail ALL Claims'],
  value: 'Summary by Provider', column: true,
}

const SUBMISSION_CODES = [
  '0 - Normal Submission',
  'A - Requested Pre-approval claim in writing to MSP.',
  'C - Subscriber Coverage Problem',
  'D - Duplicate Claim',
  'E - Debit Requests',
  'I - ICBC Claim, include ICBC Claim number if known and set MVA field',
  'R - Re-Submitted Claim',
  'W - Claim not accepted by Worker\'s Compensation Board',
  'X - Resubmitting of refused previous or partially paid claim.',
]

/* ============================================================================
   The specs
   ========================================================================= */

const base = { folder: 'Accounts - MSP', width: 670, height: 540 } as const

export const specs: ReportSpec[] = [
  {
    ...base,
    name: 'Accounts Receivable',
    id: 'msp-ar',
    provenance: '304043 3b48938d (window), f70441fa (page)',
    inferred: 'The capture\'s page is empty (headers only); the per-provider bands, rows and the "Total for All '
      + 'Providers" line follow the article text.',
    fields: [DATE_SECTION, dates(), ...CRITERIA],
    output: {
      title: `MSP ACCOUNTS RECEIVABLE ${AS_OF}`,
      subtitle: 'DATE RANGE: {datesFrom} AND {datesTo}',
      cols: AR_COLS,
      head: AR_HEAD,
      rows: (ctx) => arRows(ledger(ctx).filter(outstanding)),
      footer: [],
      chartCol: 1,
    },
  },
  {
    ...base,
    name: 'Accounts Receivable as of',
    id: 'msp-ar-as-of',
    provenance: '304043 4bd1fcff (window), d141b591 (page)',
    inferred: 'Provider subtotals and the "Total for All Providers" line follow the article text; the capture shows '
      + 'one claim line.',
    fields: [
      { kind: 'section', label: 'As Of Date' },
      { kind: 'text', id: 'asOf', label: 'As of Date:', value: '0000.00.00', w: 80, align: 'center' },
    ],
    output: {
      title: 'MSP ACCOUNTS RECEIVABLE AS OF DATE {asOf}',
      subtitle: `CALCULATED ON : ${MOIS_TODAY}`,
      cols: [28, 10, 12, 14, 12, 12, 12],
      head: ['PATIENT NAME', 'CHART', 'SERVICE DATE', 'FEE CODE', 'BILLED', 'SEQ NO', 'RECON CODE 2'],
      rows: (ctx) => {
        /* up to, but not including, the As of date (blank: today) */
        const asOf = toDay(ctx.val('asOf')) ?? toDay(MOIS_TODAY)!
        const rows = ledger(ctx, [asOf - 150, asOf - 1]).filter((r) => outstanding(r) || r.state === 'part')
        return perProvider(
          rows, 7,
          (prov) => `FOR PROVIDER: ${bold(prov)}`,
          (r) => [[bold(initialsLast(r.p)), bold(chartOf(r)), r.dos, r.fee, m(r.billed), String(r.seq), r.rc2]],
          (label, rs) => tr('', '', bold(label), '', bold(m(sum(rs.map((r) => r.billed)))), '', ''),
        )
      },
      footer: [],
      chartCol: 1,
    },
  },
  {
    ...base,
    name: 'Alphabetic AR',
    id: 'msp-alpha-ar',
    provenance: '304043 687f7b35 (window), 2ca7417a (page)',
    fields: [DATE_SECTION, dates(), ...CRITERIA],
    output: {
      title: `ALPHABETIC MSP ACCOUNTS RECEIVABLE ${AS_OF}`,
      subtitle: 'DATE RANGE: {datesFrom} AND {datesTo}',
      cols: [18, 8, 10, 9, 9, 9, 8, 7, 22],
      head: ['NAME', '', 'SERVICE DATE', 'FEE CODE', 'BILLED', 'SEQ NO', 'RECON CODE 2', 'EXPL CODE', 'PROVIDER'],
      rows: (ctx) => {
        const rows = ledger(ctx).filter((r) => outstanding(r) || r.state === 'part').sort((a, b) => a.p.last.localeCompare(b.p.last) || a.p.first.localeCompare(b.p.first))
        if (!rows.length) return []
        return [
          ...rows.map((r) => [
            bold(r.p.last.toUpperCase()), `${r.p.first.charAt(0)} ${r.p.middle ? r.p.middle.charAt(0) : ''}`.toUpperCase(),
            r.dos, r.fee, m(r.billed), String(r.seq), r.rc2, r.expl, bold(r.prov),
          ]),
          tr('', '', bold('TOTAL FOR ALL PROVIDERS:'), '', bold(m(sum(rows.map((r) => r.billed)))), '', '', '', ''),
        ]
      },
      footer: [],
    },
  },
  {
    ...base,
    name: 'Billing Profile by Practitioner',
    id: 'msp-billing-profile',
    labelW: 102,
    provenance: '304043 4524ef97 (window), fc7fb0a9 (page)',
    inferred: 'The closing total for all providers follows the article text (the capture shows one practitioner). '
      + 'The page prints the range as typed; MOIS prints "ALL DATES" when both dates are blank.',
    fields: [
      { kind: 'section', label: 'Service Date Range (INCLUSIVE)' },
      { kind: 'range', id: 'dates', label: 'From Date:', from: '2010.01.01', to: '2012.07.20', w: 80 },
    ],
    output: {
      title: `SUMMARY OF MSP ACCOUNTS ${AS_OF} - BILLING PROFILE BY PRACTITIONER`,
      subtitle: 'SERVICE DATE RANGE: {datesFrom} TO {datesTo}',
      cols: [24, 20, 14, 14, 14, 14],
      head: ['', 'FEE CODE', 'NUMBER SERVICES', 'TOTAL BILLED', 'TOTAL PAID', 'NUMBER CLAIMS'],
      rows: (ctx) => {
        /* blank Recon code 1, net paid above zero */
        const rows = ledger(ctx).filter((r) => !r.rc1 && r.paid > 0)
        const line = (label: string, rs: Row[], b = false): string => {
          const w = (s: string) => (b ? bold(s) : s)
          return tr(w(label), '', w(sum(rs.map((r) => r.services)).toFixed(2)), w(m(sum(rs.map((r) => r.billed)))), w(m(sum(rs.map((r) => r.paid)))), w(String(rs.length)))
        }
        const out: RSRow[] = []
        for (const prov of PROVIDERS) {
          const mine = rows.filter((r) => r.prov === prov)
          if (!mine.length) continue
          out.push(tr(bold(`PRACTICE PROFILE FOR: ${prov}`), '', '', '', '', ''))
          for (const payor of ['MSP', 'WCB', 'ICBC'] as const) {
            const rs = mine.filter((r) => r.payor === payor)
            if (!rs.length) continue
            out.push(tr(bold(payor === 'MSP' ? 'BC' : payor), '', '', '', '', ''))
            for (const fee of [...new Set(rs.map((r) => r.fee))].sort()) {
              const f = rs.filter((r) => r.fee === fee)
              out.push(['', fee, sum(f.map((r) => r.services)).toFixed(2), m(sum(f.map((r) => r.billed))), m(sum(f.map((r) => r.paid))), String(f.length)])
            }
            out.push(line('TOTAL FOR ALL FEES:', rs))
          }
          out.push(line('TOTALS FOR ALL PAYORS AND FEES:', mine, true))
        }
        if (rows.length) out.push(line('TOTAL FOR ALL PROVIDERS:', rows, true))
        return out
      },
      footer: [],
    },
  },
  {
    ...base,
    name: 'Claims Sent for Date Range',
    id: 'msp-claims-sent',
    provenance: '304043 e6a0a6dc (window), 4a06d372 (page)',
    fields: [DATE_SECTION, dates('2010.01.01', '2012.07.20'), MEMO],
    output: {
      title: `SUMMARY OF CLAIMS SENT TO MSP ${AS_OF}`,
      subtitle: 'DATE RANGE: {datesFrom} AND {datesTo}',
      cols: PAY_COLS,
      head: PAY_HEAD,
      rows: (ctx) => payRows(ledger(ctx).filter((r) => r.payor === 'MSP' && memoOk(ctx, r))),
      footer: [],
    },
  },
  {
    ...base,
    name: 'Deletions for Deletion Date Range',
    id: 'msp-deletions',
    provenance: '304043 f49b6498 (window), bc8b66b0 (page)',
    inferred: 'The capture\'s page is empty (headers only); rows and provider totals follow the Accounts Receivable layout.',
    fields: [DATE_SECTION, dates(), { kind: 'rule' }],
    output: {
      title: `MSP ACCOUNTS MARKED DELETED ${AS_OF}`,
      subtitle: 'DATE RANGE: {datesFrom} AND {datesTo}',
      cols: AR_COLS,
      head: AR_HEAD,
      rows: (ctx) => arRows(ledger(ctx).filter((r) => r.state === 'deleted' || r.state === 'private')),
      footer: [],
      chartCol: 1,
    },
  },
  {
    ...base,
    name: 'Explanatory Codes for Date Range',
    id: 'msp-expl-codes',
    labelW: 102,
    provenance: '304043 ea3e034d (window), abeeb609 (page)',
    inferred: 'The page\'s second heading line (EXPLANATORY CODE(S)) is folded into the subtitle.',
    fields: [
      DATE_SECTION, dates(),
      { kind: 'text', id: 'explCodes', label: 'Explanatory Codes:', w: 200, hint: '(comma separated list)' },
    ],
    output: {
      title: `SUMMARY OF MSP PAYMENTS  ${AS_OF}`,
      subtitle: 'PAYMENT DATE RANGE: {datesFrom} AND {datesTo}     EXPLANATORY CODE(S): {explCodes}',
      cols: PAY_COLS,
      head: PAY_HEAD,
      rows: (ctx) => payRows(
        ledger(ctx)
          .filter((r) => r.expl && inList(ctx, ctx.val('explCodes'), r.expl))
          .sort((a, b) => a.p.last.localeCompare(b.p.last)),
      ),
      footer: PAYMENT_NOTE,
    },
  },
  {
    ...base,
    name: 'Failed Pre-Edit and Refused',
    id: 'msp-failed-refused',
    provenance: '304043 eb28ff36 (window), 96fd2098 (page)',
    inferred: 'The capture\'s page is empty (headers only); rows and provider totals follow the Accounts Receivable layout.',
    fields: [
      DATE_SECTION, dates('2010.01.01', '2012.07.20'),
      ...CRITERIA_HEAD,
      { kind: 'note', text: '- Amount paid is zero. Reconciliation code 2 indicates that the claim has failed the pre-edit process, is', indent: 12 },
      { kind: 'note', text: 'refused by MSP or has been "clawed back" to zero balance.', indent: 20 },
      { kind: 'note', text: '- Partially paid accounts which are not written off or resubmitted are considered accepted', indent: 12 },
    ],
    output: {
      title: `PRE-EDIT FAILURE AND REFUSED CLAIMS ${AS_OF}`,
      subtitle: 'DATE RANGE: {datesFrom} AND {datesTo}',
      cols: [28, 11, 10, 7, 14, 12, 9, 9],
      head: ['NAME', 'CHART NO.', 'SERVICE DATE', 'PAYOR', 'FEE CODE', 'BILLED', 'SEQ NO', 'RECON CODE 2'],
      rows: (ctx) => perProvider(
        ledger(ctx).filter((r) => r.state === 'refused' || r.state === 'failed'), 8,
        (prov) => bold(`PROVIDER: ${prov}`),
        (r) => [[bold(initialsLast(r.p)), chartOf(r), r.dos, r.payor === 'MSP' ? 'BC' : r.payor, r.fee, m(r.billed), String(r.seq), r.rc2]],
        (label, rs) => tr('', '', '', '', bold(label), bold(m(sum(rs.map((r) => r.billed)))), '', ''),
      ),
      footer: [],
      chartCol: 1,
    },
  },
  {
    ...base,
    name: 'Payment Detail for Date Range',
    id: 'msp-payment-detail',
    provenance: '304043 c6ae9f2b (window), a8c01d2d (page)',
    fields: [DATE_SECTION, dates(), MEMO],
    output: {
      title: `SUMMARY OF MSP PAYMENTS  ${AS_OF}`,
      subtitle: 'PAYMENT DATE RANGE: {datesFrom} AND {datesTo}',
      cols: PAY_COLS,
      head: PAY_HEAD,
      /* accrual: the work done in the range, with what has been paid on it */
      rows: (ctx) => payRows(ledger(ctx).filter((r) => r.payor === 'MSP' && !['unpaid', 'held'].includes(r.state) && memoOk(ctx, r))),
      footer: PAYMENT_NOTE,
    },
  },
  {
    ...base,
    name: 'Payment Summary For Date Range',
    id: 'msp-payment-summary',
    provenance: '304043 241d6390 (window), 118bf7e6 (page)',
    inferred: 'Which sample payments fall before the range (DOS < Range) is fixed sample data.',
    fields: [DATE_SECTION, dates(), MEMO],
    output: {
      title: `SUMMARY OF MSP PAYMENTS  ${AS_OF}`,
      subtitle: 'DATE RANGE : {datesFrom} TO {datesTo}     INCLUDE MEMO TEXT = {memo}',
      cols: [40, 15, 15, 15, 15],
      head: ['', 'MSP', 'WCB', 'ICBC', 'TOTAL'],
      rows: (ctx) => {
        const rows = ledger(ctx).filter((r) => memoOk(ctx, r))
        const order: Payor[] = ['MSP', 'WCB', 'ICBC']
        const out: RSRow[] = []
        for (const prov of PROVIDERS) {
          const mine = rows.filter((r) => r.prov === prov)
          if (!mine.length) continue
          /* every third claim's work was done before the range */
          const before = mine.filter((r) => r.seq % 3 === 0)
          const within = mine.filter((r) => r.seq % 3 !== 0)
          out.push(tr(bold(`PROVIDER:   ${prov}`), '', '', '', ''))
          out.push(payorLine('Paid for DOS < Range', before, order, (r) => r.paid))
          out.push(payorLine('Billed for DOS < Range', before, order, (r) => r.billed))
          out.push(payorLine('Paid for DOS = Range', within, order, (r) => r.paid))
          out.push(payorLine('Billed for DOS = Range', within, order, (r) => r.billed))
        }
        return out
      },
      footer: [],
    },
  },
  {
    ...base,
    name: 'Payments by Clarification Code for Date Range',
    id: 'msp-pay-clarification',
    provenance: '304043 b1d3bcdd (window), 6425415d (page)',
    inferred: 'The Detail ALL Claims layout (each claim above its code total) is reconstructed: the capture shows the '
      + 'Summary by Provider page. The subtitle keeps the capture\'s PAYMENT DATE wording for either date basis.',
    fields: [...PAYMENTS_BY_TOP, REPORT_TYPE],
    output: {
      title: `DETAIL OF MSP ACCOUNTS ${AS_OF}`,
      subtitle: 'PAYMENT DATE RANGE : {datesFrom} TO {datesTo}',
      cols: [34, 16, 18, 16, 16],
      head: ['PROVIDER', 'CLARIFICATION CODE', 'PAYOR', 'TOTAL BILLED', 'TOTAL PAID'],
      rows: (ctx) => codeTotals(
        ctx,
        ledger(ctx).filter((r) => r.paid > 0 && ctx.like(ctx.val('code'), r.clar, 'equals') && provOk(ctx, r) && memoOk(ctx, r)),
        'clar', 'TOTALS FOR CLARIFICATION', 'TOTALS FOR ALL PROVIDERS AND ALL CODES:',
      ),
      footer: [],
    },
  },
  {
    ...base,
    name: 'Payments by Location for Date Range',
    id: 'msp-pay-location',
    provenance: '304043 78e81861 (window), 3f006e38 (page)',
    inferred: 'The Detail ALL Claims layout is reconstructed (the capture shows Summary by Provider). The Primary '
      + 'Provider filter compares the chart\'s own provider where the roster has one.',
    fields: [
      ...PAYMENTS_BY_TOP,
      {
        kind: 'select', id: 'primaryProvider', label: 'Primary Provider:', options: 'providers', value: '', w: 200,
        hint: '(this is the service provider indicated on the patient\'s chart This IS NOT the claim DOCTOR).',
      },
      { kind: 'rule' },
      REPORT_TYPE,
    ],
    output: {
      title: `DETAIL OF MSP ACCOUNTS ${AS_OF}`,
      subtitle: 'PAYMENT DATE RANGE : {datesFrom} TO {datesTo}',
      cols: [34, 16, 18, 16, 16],
      head: ['PROVIDER', 'LOCATION CODE', 'PAYOR', 'TOTAL BILLED', 'TOTAL PAID'],
      rows: (ctx) => {
        const primary = ctx.val('primaryProvider')
        return codeTotals(
          ctx,
          ledger(ctx).filter((r) => r.paid > 0 && ctx.like(ctx.val('code'), r.loc, 'equals') && provOk(ctx, r) && memoOk(ctx, r)
            && (!primary || (r.p.provider ?? r.prov).toUpperCase() === primary)),
          'loc', 'TOTALS FOR LOCATION', 'TOTALS FOR ALL PROVIDERS AND ALL LOCATIONS:',
        )
      },
      footer: [],
    },
  },
  {
    ...base,
    name: 'Submission Code for Date Range',
    id: 'msp-submission-code',
    provenance: '304043 e0575ed2 (window), 5a7cf573 (page)',
    inferred: 'The capture\'s drop-down is a two-column Code / Description list; here each option reads "<code> - '
      + '<description>". The selection is mandatory (heading); with none chosen the page prints no claims.',
    fields: [
      DATE_SECTION, dates(),
      { kind: 'section', label: 'Submission Code (MANDATORY)' },
      { kind: 'select', id: 'subCode', label: 'Submission Code:', options: ['', ...SUBMISSION_CODES], value: '', w: 60 },
    ],
    output: {
      title: `MSP ACCOUNTS BY SUBMISSION CODE ${AS_OF}`,
      subtitle: 'DATE RANGE: {datesFrom} AND {datesTo}   SUBMISSION CODE: {subCode}',
      cols: [28, 10, 10, 12, 10, 10, 8, 6, 6],
      head: ['NAME', 'CHART NO.', 'SERVICE DATE', 'FEE CODE', 'BILLED', 'SEQ NO', '**SUB CODE**', 'RC1', 'RC2'],
      rows: (ctx) => {
        const code = ctx.val('subCode').split(' ')[0] ?? ''
        return perProvider(
          ledger(ctx).filter((r) => code !== '' && r.sub === code), 9,
          (prov) => bold(`PROVIDER: ${prov}`),
          (r) => [[bold(initialsLast(r.p)), chartOf(r), r.dos, r.fee, m(r.billed), String(r.seq), bold(r.sub), r.rc1, r.rc2]],
          (label, rs) => tr('', '', '', bold(label), bold(m(sum(rs.map((r) => r.billed)))), '', '', '', ''),
        )
      },
      footer: [],
      chartCol: 1,
    },
  },
  {
    ...base,
    name: 'Summary by Activity Date',
    id: 'msp-summary-activity',
    labelW: 84,
    provenance: '304043 571e7d5f (window), fc6fe147 (page)',
    inferred: 'The Investigation Period changes only how long the real report takes; the sample figures do not move with it.',
    fields: [
      DATE_SECTION,
      { kind: 'range', id: 'dates', label: 'From Date:', from: '0000.00.00', to: '', w: 80 },
      { kind: 'section', label: 'Memo Text' },
      { kind: 'text', id: 'memo', label: 'Memo Includes:', w: 190 },
      { kind: 'section', label: 'Investigation Period' },
      { kind: 'radio', id: 'period', options: ['1 yr of claims', '2 yrs of claims', '5 yrs of claims', 'ALL claims'], value: '1 yr of claims', column: true },
    ],
    output: {
      title: 'MSP ACTIVITY SUMMARY FOR : {datesFrom} TO {datesTo}',
      subtitle: `${AS_OF}     WITH MEMO TEXT = {memo}`,
      cols: [40, 15, 15, 15, 15],
      head: ['', 'MSP', 'ICBC', 'WCB', 'TOTAL'],
      rows: (ctx) => {
        const rows = ledger(ctx).filter((r) => memoOk(ctx, r))
        const order: Payor[] = ['MSP', 'ICBC', 'WCB']
        const is = (...st: ClaimState[]) => (r: Row) => st.includes(r.state)
        const newFees = (r: Row) => r.billed
        const paid = (r: Row) => r.paid
        const deleted = (r: Row) => (is('deleted')(r) ? r.billed : 0)
        const conv = (r: Row) => (is('private')(r) ? r.billed : 0)
        const written = (r: Row) => (is('writeoff')(r) ? r.billed - r.paid : 0)
        const lift = (r: Row) => (is('lift')(r) ? r.paid - r.billed : 0)
        const partLoss = (r: Row) => (is('part')(r) ? r.billed - r.paid : 0)
        const unexpected = (r: Row) => r.unexpected ?? 0
        const out: RSRow[] = []
        for (const prov of PROVIDERS) {
          const mine = rows.filter((r) => r.prov === prov)
          if (!mine.length) continue
          const t = (f: (r: Row) => number) => sum(mine.map(f))
          const additions = t(newFees) + t(lift) + t(unexpected)
          const credits = t(deleted) + t(conv) + t(written) + t(paid) + t(partLoss)
          const income = additions - t(deleted) - t(conv) - t(written) - t(partLoss)
          out.push(tr(bold(`PRACTITIONER:  ${prov}`), '', '', '', ''))
          out.push(
            payorLine('Net New Fees', mine, order, newFees),
            payorLine('Total Paid', mine, order, paid),
            payorLine('Marked for Delete', mine, order, deleted),
            payorLine('Conv to Private', mine, order, conv),
            payorLine('Written Off', mine, order, written),
            payorLine('Lift', mine, order, lift),
            payorLine('Part Pay Loss', mine, order, partLoss),
            payorLine('Unexpected Pmnt', mine, order, unexpected),
            tr(bold('TOTAL FEE ADDITIONS:'), bold(m(additions)), '', '', ''),
            tr(bold('TOTAL CREDITS FOR A/R:'), bold(m(credits)), '', '', ''),
            tr(bold('NET A/R FOR PERIOD:'), bold(m(additions - credits)), bold('NET INCOME:'), bold(m(income)), ''),
          )
        }
        return out
      },
      footer: [],
    },
  },
  {
    ...base,
    name: 'Summary by Date of Service',
    id: 'msp-summary-dos',
    labelW: 84,
    provenance: '304043 c8391e5a (window), b2d96fdd (page)',
    inferred: 'The page\'s four heading lines (registered-patients choice, memo, clarification and location codes) '
      + 'are folded into one subtitle; blank code boxes print blank where MOIS prints ALL.',
    fields: [
      DATE_SECTION,
      { kind: 'range', id: 'dates', label: 'From Date:', from: '0000.00.00', to: '', w: 80 },
      { kind: 'section', label: 'Select Registered Patients' },
      {
        kind: 'radio', id: 'registered', column: true, value: 'All Claims',
        options: ['All Claims', 'Registered Patients Only (chart no > 0)', 'Un-Registered Patients Only (no chart no)'],
      },
      { kind: 'section', label: 'Memo Text' },
      { kind: 'text', id: 'memo', label: 'Memo Includes:', w: 190 },
      { kind: 'section', label: 'Service Clarification Codes (Rural Retention)' },
      { kind: 'text', id: 'clarCodes', label: 'Code(s):', w: 190, hint: '(separated by commas)' },
      { kind: 'section', label: 'Location Codes' },
      { kind: 'text', id: 'locCodes', label: 'Code(s):', w: 190, hint: '(separated by commas)' },
    ],
    output: {
      title: `SUMMARY OF MSP ACCOUNTS ${AS_OF}`,
      subtitle: 'DATE OF SERVICE RANGE: {datesFrom} TO {datesTo}   {registered}   WITH MEMO TEXT = {memo}   '
        + 'SERVICE CLARIF CODE(S) = {clarCodes}   LOCATION CODE(S) = {locCodes}',
      cols: [40, 15, 15, 15, 15],
      head: ['', 'MSP', 'WCB', 'ICBC', 'TOTAL'],
      rows: (ctx) => {
        const reg = ctx.val('registered')
        const rows = ledger(ctx).filter((r) =>
          memoOk(ctx, r)
          && inList(ctx, ctx.val('clarCodes'), r.clar)
          && inList(ctx, ctx.val('locCodes'), r.loc)
          && (reg.startsWith('Registered') ? !r.walkIn : reg.startsWith('Un-Registered') ? !!r.walkIn : true))
        const order: Payor[] = ['MSP', 'WCB', 'ICBC']
        const billedIf = (...st: ClaimState[]) => (r: Row) => (st.includes(r.state) ? r.billed : 0)
        const out: RSRow[] = []
        for (const prov of PROVIDERS) {
          const mine = rows.filter((r) => r.prov === prov)
          if (!mine.length) continue
          out.push(tr(bold(`PRACTITIONER:  ${prov}`), '', '', '', ''))
          out.push(
            payorLine('Total Billed', mine, order, (r) => r.billed),
            payorLine('Total Paid', mine, order, (r) => r.paid),
            payorLine('Unexpected Payment', mine, order, (r) => (r.state === 'lift' ? r.paid - r.billed : 0) + (r.unexpected ?? 0)),
            payorLine('Part Pay Loss', mine, order, (r) => (r.state === 'part' ? r.billed - r.paid : 0)),
            payorLine('Unacknowledged', mine, order, billedIf('unpaid')),
            payorLine('Held', mine, order, billedIf('held')),
            payorLine('Rejected or Failed', mine, order, billedIf('refused', 'failed')),
            payorLine('Written Off', mine, order, (r) => (r.state === 'writeoff' ? r.billed - r.paid : 0)),
            payorLine('Accts Receivable', mine, order, billedIf('unpaid', 'refused', 'failed')),
          )
        }
        return out
      },
      footer: [],
    },
  },
  {
    ...base,
    name: 'Writeoffs for W/O Date Range',
    id: 'msp-writeoffs',
    provenance: '304043 03367ab9 (window), 3488df6f (page)',
    inferred: 'The capture\'s page is empty (headers only); rows, alphabetical order and provider totals follow the article text.',
    fields: [DATE_SECTION, dates('2000.01.01', '2012.07.20'), { kind: 'rule' }],
    output: {
      title: `MSP ACCOUNTS WRITTEN OFF ${AS_OF}`,
      subtitle: 'DATE RANGE: {datesFrom} AND {datesTo}',
      cols: [28, 11, 10, 14, 11, 8, 9, 9],
      head: ['NAME', 'CHART NO.', 'SERVICE DATE', 'FEE CODE', 'BILLED', 'PAID', 'SEQ NO', 'RECON CODE 2'],
      rows: (ctx) => perProvider(
        ledger(ctx).filter((r) => r.state === 'writeoff').sort((a, b) => a.p.last.localeCompare(b.p.last)), 8,
        (prov) => bold(`PROVIDER: ${prov}`),
        (r) => [[bold(initialsLast(r.p)), chartOf(r), r.dos, r.fee, m(r.billed), m(r.paid), String(r.seq), r.rc2]],
        (label, rs) => tr('', '', '', bold(label), bold(m(sum(rs.map((r) => r.billed)))), bold(m(sum(rs.map((r) => r.paid)))), '', ''),
      ),
      footer: [],
      chartCol: 1,
    },
  },
]
