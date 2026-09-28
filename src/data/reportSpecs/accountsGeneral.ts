import { MOIS_TODAY, rsMoney, rsSample, type ReportSpec, type RSContext, type RSRow } from './types'

/* ============================================================================
   Report specs transcribed from manual article 304042 (Reports ▸ Accounts -
   General): Aging Report, Detailed Activity Report, Sales Tax Report.
   PROVENANCE: per spec below. Every amount, claim and invoice printed here
   is fictional training data over the emulator's roster.
   ========================================================================= */

/* --- small helpers --------------------------------------------------------- */

const tr = (...cells: string[]) => `%TR%${cells.join('|')}`
const dash = (n: number) => (n ? rsMoney(n) : '-')
const signed = (n: number) => (n < 0 ? `(${rsMoney(-n)})` : rsMoney(n))
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

const DATE = /^(\d{4})\.(\d{2})\.(\d{2})$/
function toDay(s: string): number | null {
  const m = DATE.exec(s.trim())
  if (!m || m[1] === '0000') return null
  return Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!) / 86400000
}
function fromDay(n: number): string {
  const t = new Date(n * 86400000)
  return `${t.getUTCFullYear()}.${String(t.getUTCMonth() + 1).padStart(2, '0')}.${String(t.getUTCDate()).padStart(2, '0')}`
}
/** a range parameter as days; a blank To means "only that one day" (the
    windows' own hint), a blank From reaches back four months */
function span(ctx: RSContext, id: string): [number, number] {
  const from = toDay(ctx.val(`${id}From`))
  let to = toDay(ctx.val(`${id}To`))
  if (to == null) to = from ?? toDay(MOIS_TODAY)!
  const f = from ?? to - 120
  return f <= to ? [f, to] : [to, f]
}
const dateAt = (sp: [number, number], i: number, n: number) =>
  fromDay(Math.round(sp[0] + (sp[1] - sp[0]) * (n <= 1 ? 0.5 : i / (n - 1))))

/** upper-case, punctuation-blind, so `Write off` finds `WRITE-OFF` */
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9%]/g, '')
/** a comma-separated filter box: blank matches all, else any item (`%` aware) */
const inList = (ctx: RSContext, list: string, value: string) => {
  const items = list.split(',').map((s) => s.trim()).filter(Boolean)
  return !items.length || items.some((it) => ctx.like(norm(it), norm(value), 'contains'))
}

/* ============================================================================
   Aging Report
   ========================================================================= */

type Buckets = [number, number, number, number]
type AgingProvider = { prov: string; msp: Record<string, Buckets>; priv: Record<string, Buckets> }

/** Payor / Recon codes per provider in 0-30 / 31-60 / 61-90 / > 90 day
    buckets (the capture's own code set: MSP F H R U X; private DSL MLF
    O.S.M P PRIV SMR SU WCB) */
const AGING: AgingProvider[] = [
  {
    prov: 'HOWSER, DOOGIE',
    msp: { F: [0, 0, 0, 63.58], H: [0, 75, 65.87, 0], R: [0, 0, 0, 40], U: [1141.46, 0, 0, 0], X: [0, 0, 0, 29.86] },
    priv: {
      DSL: [98.35, 0, 0, 0], MLF: [0, 0, 0, 89.3], 'O.S.M': [0, 0, 0, 75], P: [0, 0, 0, 25],
      PRIV: [0, 0, 0, 465.5], SMR: [0, 0, 0, 88], SU: [0, 0, 0, 2149], WCB: [0, 0, 0, 40],
    },
  },
  {
    prov: 'SHEWCHUK, LEAH',
    msp: { H: [0, 32.15, 0, 0], R: [58.4, 0, 0, 22.1], U: [864.2, 118.35, 0, 0] },
    priv: { DSL: [45, 0, 0, 0], PRIV: [120, 60, 0, 35], WCB: [0, 0, 88.5, 0] },
  },
  {
    prov: 'BEARDWOOD, WALTER',
    msp: { F: [0, 0, 29.64, 0], U: [412.8, 0, 0, 0] },
    priv: { SMR: [0, 44, 0, 0] },
  },
]

function agingRows(ctx: RSContext): RSRow[] {
  const detail = ctx.val('reportBy').startsWith('Individual')
  const pts = rsSample(12)
  let seq = 242540
  let inv = 11
  const grand: Buckets = [0, 0, 0, 0]
  const out: RSRow[] = []
  const line = (label: string, b: Buckets, bold = false) => {
    const w = (s: string) => (bold ? `**${s}**` : s)
    return tr('', w(label), ...b.map((x) => w(dash(x))), w(dash(sum(b))))
  }
  for (const a of AGING) {
    const insurers: [string, Record<string, Buckets>, boolean][] = [
      ['MSP', a.msp, ctx.on('includeMsp')],
      ['PRIVATE', a.priv, ctx.on('includePrivate')],
    ]
    const provTotal: Buckets = [0, 0, 0, 0]
    const block: RSRow[] = []
    for (const [insurer, codes, included] of insurers) {
      if (!included) continue
      const sub: Buckets = [0, 0, 0, 0]
      block.push(tr(`**${insurer}**`, '', '', '', '', '', ''))
      for (const [code, b] of Object.entries(codes)) {
        if (detail) {
          /* Individual Claims: each outstanding claim (MSP sequence number)
             or invoice under its code, then the code's line */
          b.forEach((amt, k) => {
            if (!amt) return
            const p = pts[(seq + inv) % pts.length]!
            const ref = insurer === 'MSP' ? `${seq++}` : `Inv ${inv++}`
            const cells: Buckets = [0, 0, 0, 0]
            cells[k] = amt
            block.push(['', `   ${ref}  ${p.last.toUpperCase()}, ${p.first.charAt(0)}`, ...cells.map(dash), dash(amt)])
          })
          block.push(line(code, b, true))
        } else {
          block.push(['', code, ...b.map(dash), dash(sum(b))])
        }
        b.forEach((x, k) => { sub[k] += x })
      }
      block.push(tr(`SUB TOTAL ${insurer}:`, '', ...sub.map(dash), dash(sum(sub))))
      sub.forEach((x, k) => { provTotal[k] += x })
    }
    if (!block.length) continue
    out.push(tr('**PROVIDER:**', `**${a.prov}**`, '', '', '', '', ''), ...block)
    out.push(tr('PROVIDER TOTAL:', '', ...provTotal.map(dash), dash(sum(provTotal))))
    provTotal.forEach((x, k) => { grand[k] += x })
  }
  out.push(tr('**GRAND TOTAL:**', '', ...grand.map((x) => `**${dash(x)}**`), `**${dash(sum(grand))}**`))
  return out
}

/* ============================================================================
   Detailed Activity Report
   ========================================================================= */

type Tx = {
  prov: string; kind: 'MSP' | 'PRIVATE'; group: string; pi: number; ref: string; code: string
  desc: string; type: string; amount: number; note?: string
}

const TX: Tx[] = [
  { prov: 'HOWSER, DOOGIE', kind: 'PRIVATE', group: 'NEW CLAIM', pi: 0, ref: '11', code: '00023', desc: 'Invoice No: 11', type: 'BILLED', amount: 69.6 },
  { prov: 'HOWSER, DOOGIE', kind: 'PRIVATE', group: 'NEW CLAIM', pi: 0, ref: '11', code: '00023', desc: 'Invoice No: 11', type: 'BILLED', amount: -69.6, note: 'Reversed by FRONT DESK, MOA' },
  { prov: 'HOWSER, DOOGIE', kind: 'PRIVATE', group: 'NEW CLAIM', pi: 0, ref: '11', code: '', desc: 'Invoice No: 11', type: 'BILLED', amount: 69 },
  { prov: 'HOWSER, DOOGIE', kind: 'PRIVATE', group: 'NEW CLAIM', pi: 1, ref: '12', code: 'FORM', desc: 'Invoice No: 12', type: 'BILLED', amount: 35 },
  { prov: 'HOWSER, DOOGIE', kind: 'PRIVATE', group: 'NEW CLAIM', pi: 1, ref: '12', code: 'GST', desc: 'Invoice No: 12', type: 'TAX', amount: 1.75 },
  { prov: 'HOWSER, DOOGIE', kind: 'PRIVATE', group: 'PAYMENT', pi: 0, ref: '11', code: 'CHEQ', desc: 'Invoice No: 11', type: 'PAYMENT', amount: 69 },
  { prov: 'HOWSER, DOOGIE', kind: 'MSP', group: 'NEW CLAIM', pi: 2, ref: '242544', code: '00100', desc: 'Seq No: 242544', type: 'BILLED', amount: 31.56 },
  { prov: 'HOWSER, DOOGIE', kind: 'MSP', group: 'NEW CLAIM', pi: 3, ref: '242545', code: '13050', desc: 'Seq No: 242545', type: 'BILLED', amount: 58.4 },
  { prov: 'HOWSER, DOOGIE', kind: 'MSP', group: 'PAYMENT', pi: 2, ref: '242544', code: '00100', desc: 'Seq No: 242544', type: 'PAYMENT', amount: 31.56 },
  { prov: 'HOWSER, DOOGIE', kind: 'MSP', group: 'ADJUSTMENT', pi: 2, ref: '242544', code: 'RR', desc: 'Rural Retention', type: 'OVERPAY', amount: 4.73 },
  { prov: 'SHEWCHUK, LEAH', kind: 'MSP', group: 'NEW CLAIM', pi: 4, ref: '242551', code: '00120', desc: 'Seq No: 242551', type: 'BILLED', amount: 47.35 },
  { prov: 'SHEWCHUK, LEAH', kind: 'MSP', group: 'CHANGED CLAIM', pi: 4, ref: '242551', code: '00120', desc: 'Seq No: 242551', type: 'ADJUSTED', amount: -2.1 },
  { prov: 'SHEWCHUK, LEAH', kind: 'MSP', group: 'WRITE-OFF', pi: 5, ref: '242538', code: '00100', desc: 'Seq No: 242538', type: 'WRITEOFF', amount: 31.56 },
  { prov: 'SHEWCHUK, LEAH', kind: 'MSP', group: 'DELETION', pi: 6, ref: '242540', code: '14015', desc: 'Seq No: 242540', type: 'DELETION', amount: 22.1 },
  { prov: 'SHEWCHUK, LEAH', kind: 'PRIVATE', group: 'NEW CLAIM', pi: 7, ref: '14', code: 'DSL', desc: 'Invoice No: 14', type: 'BILLED', amount: 45 },
  { prov: 'SHEWCHUK, LEAH', kind: 'PRIVATE', group: 'PAYMENT', pi: 7, ref: '14', code: 'DEBIT', desc: 'Invoice No: 14', type: 'PAYMENT', amount: 45 },
]

function activityRows(ctx: RSContext): RSRow[] {
  const claimDetail = ctx.val('detail') === 'Claim Detail'
  const provider = ctx.val('provider')
  const pts = rsSample(8)
  const sp = span(ctx, 'trans')
  let txs = TX.filter((t) =>
    (!provider || t.prov === provider)
    && inList(ctx, ctx.val('group'), t.group)
    && inList(ctx, ctx.val('type'), t.type)
    && inList(ctx, ctx.val('code'), t.code))
  if (claimDetail) {
    /* Claim Detail: the NET of each claim's activity — a reversal and the
       entry it reverses cancel out */
    const net = new Map<string, Tx>()
    for (const t of txs) {
      const k = [t.prov, t.kind, t.group, t.ref, t.code, t.type].join('|')
      const prev = net.get(k)
      net.set(k, prev ? { ...prev, amount: prev.amount + t.amount, note: undefined } : { ...t, note: undefined })
    }
    txs = [...net.values()].filter((t) => Math.abs(t.amount) > 0.001)
  }
  const out: RSRow[] = []
  let grand = 0
  const provs = [...new Set(txs.map((t) => t.prov))]
  provs.forEach((prov) => {
    out.push(tr(`**CLAIMS FOR ${prov}**`, '', '', '', '', '', '', ''))
    for (const kind of ['MSP', 'PRIVATE'] as const) {
      const ofKind = txs.filter((t) => t.prov === prov && t.kind === kind)
      if (!ofKind.length) continue
      out.push(tr(`**${kind} CLAIMS:**`, '', '', '', '', '', '', ''))
      for (const group of [...new Set(ofKind.map((t) => t.group))]) {
        const rows = ofKind.filter((t) => t.group === group)
        out.push(tr(`**${group}**`, '', '', '', '', '', '', ''))
        rows.forEach((t) => {
          const p = pts[t.pi % pts.length]!
          const slot = TX.findIndex((x) => x.ref === t.ref && x.group === t.group && x.type === t.type)
          out.push([
            `${p.last.toUpperCase()}, ${p.first.toUpperCase()}`,
            `${p.insurance ?? ''}  ${p.insuranceBy ?? 'BC'}`.trim(),
            dateAt(sp, Math.max(slot, 0), TX.length), t.ref, t.code, t.desc, t.type, signed(t.amount),
          ])
          if (t.note) out.push(tr('', '', '', '', '', t.note, '', ''))
        })
        const total = sum(rows.map((t) => t.amount))
        grand += total
        out.push(tr('', '', '', '', `**${prov} TOTAL FOR ${group}:**`, '', '', `**${signed(total)}**`))
      }
    }
  })
  if (provs.length) out.push(tr('', '', '', '', '**GRAND TOTAL:**', '', '', `**${signed(grand)}**`))
  return out
}

/* ============================================================================
   The specs
   ========================================================================= */

export const specs: ReportSpec[] = [
  {
    folder: 'Accounts - General',
    name: 'Aging Report',
    id: 'aging-report',
    width: 670,
    height: 540,
    labelW: 72,
    provenance: '304042 bcde4768 (window), 7f7e33a5 (page)',
    inferred: 'The Individual Claims layout (each MSP sequence number / invoice under its Payor / Recon code) and the '
      + 'closing GRAND TOTAL line are reconstructed from the article text; the Report Outcome capture shows only the '
      + 'Summary layout of one provider page. Cut Off keeps the capture\'s 2012.07.01.',
    fields: [
      { kind: 'section', label: 'Use dates of service less than but not equal to the following date' },
      { kind: 'text', id: 'cutOff', label: 'Cut Off:', value: '2012.07.01', w: 80, align: 'center' },
      { kind: 'section', label: 'Report By' },
      {
        kind: 'radio', id: 'reportBy', column: true,
        options: ['Summary (totaling on Recon Code or Payor Code)', 'Individual Claims (detail MSP Claims and Invoice Number)'],
        value: 'Summary (totaling on Recon Code or Payor Code)',
      },
      { kind: 'section', label: 'Include' },
      { kind: 'check', id: 'includeMsp', text: 'Include MSP Claims', checked: true },
      { kind: 'check', id: 'includePrivate', text: 'Include Private Claims', checked: true },
    ],
    output: {
      title: 'ACCOUNTS RECEIVABLE AGING AS OF {cutOff}',
      subtitle: 'SERVICE DATES LESS THAN {cutOff}',
      cols: [14, 21, 13, 13, 13, 13, 13],
      head: ['', 'PAYOR CODE / RECON CODE', '0 - 30', '31 - 60', '61 - 90', '> 90', 'TOTAL'],
      rows: agingRows,
      footer: [],
    },
  },
  {
    folder: 'Accounts - General',
    name: 'Detailed Activity Report',
    id: 'detailed-activity',
    width: 670,
    height: 540,
    provenance: '304042 10cf8bd2 (window), 11d8555e (page)',
    inferred: 'The capture\'s Group / Type / Code boxes hold the author\'s illustrative text ("New Claim, Write off", '
      + '"Overpay", "Fee Codes, MSP Adjsustment Cod…"); they open blank here, as the heading says blank includes all. '
      + 'The MSP-claim rows, the Claim Detail netting and the GRAND TOTAL line come from the article text (the capture '
      + 'shows Transaction Detail, private claims only). The title does not switch wording for Claim Detail.',
    fields: [
      { kind: 'section', label: 'Transaction Date Range (INCLUSIVE)' },
      { kind: 'range', id: 'trans', label: 'From Date:', from: '2012.01.01', to: '2012.07.20', w: 80, hint: '(if blank, only include one day)' },
      { kind: 'section', label: 'Provider Filter' },
      { kind: 'select', id: 'provider', label: 'Provider:', options: 'providers', value: '', w: 165, hint: '(if blank, will include all providers)' },
      { kind: 'section', label: 'Report Detail' },
      { kind: 'radio', id: 'detail', options: ['Transaction Detail', 'Claim Detail'], value: 'Transaction Detail', column: true },
      { kind: 'section', label: 'Transaction Filter (if blank, will include all)' },
      {
        kind: 'text', id: 'group', label: 'Group:', w: 165,
        hint: '(general containers: NEW CLAIM, CHANGED CLAIM, PAYMENT, ADJUSTMENT, DELETION, WRITE-OFF and so on).',
      },
      {
        kind: 'text', id: 'type', label: 'Type:', w: 165,
        hint: '(specific transaction type: BILLED, PAYMENT, OVERPAY, ADJUSTED, ADJUSTED - OP, and so on).',
      },
      {
        kind: 'text', id: 'code', label: 'Code:', w: 165,
        hint: '(codes associated to a transaction: Fee Codes, MSP Adjustment Codes (Rural Retention Codes, Interest Codes and so on))',
      },
    ],
    output: {
      title: `ACCOUNTS ACTIVITY TRANSACTION DETAIL REPORT AS OF ${MOIS_TODAY}`,
      subtitle: 'Trans Date Range: {transFrom} to {transTo}',
      cols: [20, 13, 10, 8, 8, 17, 12, 12],
      head: ['PATIENT', 'INSURANCE NO.', 'TRANS DATE', 'CLAIM REF', 'CODE', 'DESCRIPTION', 'TYPE', 'AMOUNT'],
      rows: activityRows,
      footer: [],
    },
  },
  {
    folder: 'Accounts - General',
    name: 'Sales Tax Report',
    id: 'sales-tax',
    width: 659,
    height: 524,
    labelW: 86,
    provenance: '304042 3c4b4be9 (window), 8f764acc (page)',
    inferred: 'The two explanatory lines sit at the foot of the capture\'s window under a rule; here they follow the '
      + 'date lines. WRITE OFF / DELETION tax amounts are sample data.',
    fields: [
      { kind: 'section', label: 'Date Range (INCLUSIVE)' },
      { kind: 'radio', id: 'dateType', label: 'Date Type:', options: ['Transaction', 'Activity'], value: 'Transaction' },
      { kind: 'range', id: 'dates', label: 'From Date:', from: '0000.00.00', to: '0000.00.00', w: 80, hint: '(if blank, only include one day)' },
      { kind: 'rule' },
      { kind: 'note', text: 'Transaction Date is the date when the transaction occurs;' },
      { kind: 'note', text: 'Activity Date is the date when the transaction is entered in the system.' },
    ],
    output: {
      title: `PRIVATE INVOICE TAX REPORT AS OF ${MOIS_TODAY}`,
      subtitle: '{dateType} Date Range: {datesFrom} to {datesTo}',
      cols: [36, 16, 16, 16, 16],
      head: ['TAX TYPE', 'BILLED', 'PAYMENT', 'WRITE OFF', 'DELETION'],
      rows: [
        ['GST', '11.10', '5.00', '-', '-'],
        ['HST', '20.74', '11.27', '-', '-'],
        ['PST', '15.54', '7.00', '1.05', '-'],
      ],
      footer: [],
    },
  },
]
