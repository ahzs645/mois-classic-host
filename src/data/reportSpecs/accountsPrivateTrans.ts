import type { ReportSpec, RSRow } from './types'
import { MOIS_TODAY, rsAge, rsMoney, rsName } from './types'
import {
  PV_INVOICES, pvB, pvByDate, pvByName, pvDateRow, pvDot, pvGroup, pvInRange, pvMoney, pvPatient, pvSum, type PvInvoice,
} from './accountsPrivateInv'

/* ============================================================================
   Report specs transcribed from manual article 304045 (Accounts - Private
   Transaction): the six rows of the `Accounts - Private (Trans)` folder.
   PROVENANCE: per spec below.

   Every window is the same Selection Parameter form: a navy
   `<Kind> Date Range (INCLUSIVE)` heading and `From Date: [salmon
   0000.00.00] to [0000.00.00]`; Payments for Pay Date Range adds the
   `Report Grouping` radios. The pages read the private ledger shared with
   304044 (accountsPrivateInv.ts), filtered by the transaction date each
   report is keyed on (service, adjustment, payment, write-off).
   ========================================================================= */

const WHEN = { B: (i: PvInvoice) => i.ago, P: (i: PvInvoice) => i.payAgo, A: (i: PvInvoice) => i.adjAgo, W: (i: PvInvoice) => i.woAgo }

export const specs: ReportSpec[] = [
  {
    folder: 'Accounts - Private (Trans)',
    name: 'Billing Transaction by Service Date',
    id: 'billing-transaction-service-date',
    provenance: '304045 cc87b712 (window), f4dba003 (page)',
    fields: [
      { kind: 'section', label: 'Transaction Date Range (INCLUSIVE)' },
      pvDateRow('From Date:'),
    ],
    output: {
      title: `PRACTICE PRIVATE BILLING TRANSACTIONS AS OF ${MOIS_TODAY}`,
      subtitle: 'FOR SERVICE DATE FROM {dateFrom} TO {dateTo}',
      cols: [42, 12, 14, 18, 14],
      head: ['PATIENT NAME', 'INVOICE NO.', 'SERVICE DATE', 'AMOUNT BILLED', 'GST'],
      rows: (ctx) => {
        const list = PV_INVOICES.filter((i) => pvInRange(ctx, 'date', i.ago))
        const money = (xs: PvInvoice[]) => [pvSum(xs, (i) => i.billed), pvSum(xs, (i) => i.gst)].map(pvMoney)
        const out: RSRow[] = []
        for (const [prov, invs] of pvGroup(list, (i) => i.prov)) {
          out.push(`**PROVIDER:   ${prov}**`)
          for (const [payor, xs] of pvGroup(invs, (i) => i.payor)) {
            out.push(`**PAYOR:  ${payor}**`)
            for (const i of pvByName(xs)) out.push([`    ${rsName(pvPatient(i))}`, String(i.inv), pvDot(i.ago), ...money([i])])
            out.push(['SUB TOTAL FOR PAYOR CODE:', '', '', ...money(xs)])
          }
          out.push([pvB(`TOTAL FOR PROVIDER:   ${prov}`), '', '', ...money(invs).map(pvB)])
        }
        if (list.length) out.push('%HR%', [pvB('TOTAL FOR ALL PROVIDERS:'), '', '', ...money(list).map(pvB)])
        return out
      },
      footer: [],
    },
  },
  {
    folder: 'Accounts - Private (Trans)',
    name: 'Debit Memos for Adjustment Date Range',
    id: 'debit-memos-adjustment-range',
    provenance: '304045 8d12ab20 (window), e96e7237 (page)',
    fields: [
      { kind: 'section', label: 'Transaction Date Range (INCLUSIVE)' },
      pvDateRow('From Date:'),
    ],
    output: {
      title: `PRACTICE PRIVATE TRANSACTIONS AS OF ${MOIS_TODAY}`,
      subtitle: 'FOR ADJUSTMENT DATES {dateFrom} TO {dateTo}',
      cols: [34, 10, 12, 16, 14, 14],
      head: ['PATIENT NAME', 'INVOICE NO.', 'SERVICE DATE', 'TRANSACTION DATE', 'AMOUNT BILLED', 'AMOUNT ADJUSTED'],
      rows: (ctx) => {
        const list = PV_INVOICES.filter((i) => i.adj > 0 && pvInRange(ctx, 'date', i.adjAgo))
        const out: RSRow[] = []
        for (const [prov, invs] of pvGroup(list, (i) => i.prov)) {
          out.push(`**PROVIDER:   ${prov}**`)
          for (const [payor, xs] of pvGroup(invs, (i) => i.payor)) {
            out.push(`**PAYOR:  ${payor}**`)
            for (const i of pvByName(xs)) out.push([rsName(pvPatient(i)), String(i.inv), pvDot(i.ago), pvDot(i.adjAgo!), rsMoney(i.billed), rsMoney(i.adj)])
            out.push(['SUB TOTAL FOR PAYOR CODE:', '', '', '', '', rsMoney(pvSum(xs, (i) => i.adj))])
          }
          out.push([pvB(`TOTAL FOR PROVIDER:   ${prov}`), '', '', '', '', pvB(rsMoney(pvSum(invs, (i) => i.adj)))])
        }
        if (list.length) out.push('%HR%', [pvB('TOTAL FOR ALL PROVIDERS:'), '', '', '', '', pvB(rsMoney(pvSum(list, (i) => i.adj)))])
        return out
      },
      footer: [],
    },
  },
  {
    folder: 'Accounts - Private (Trans)',
    name: 'Payments for Pay Date Range',
    id: 'payments-pay-date-range',
    provenance: '304045 23a50e2b (window), d7a1e37b + 5bbb55ac (page)',
    inferred: 'Grouped by Payment Method the band reads PAYMENT METHOD: <method>; the article shows the Payor Code capture (d7a1e37b) for that option too.',
    fields: [
      { kind: 'section', label: 'Transaction Date Range (INCLUSIVE)' },
      pvDateRow('From Date:'),
      { kind: 'section', label: 'Report Grouping' },
      { kind: 'radio', id: 'grouping', options: ['Payment Method', 'Payor Code', 'Invoice Code'], value: 'Payment Method', column: true },
    ],
    output: {
      title: `PRACTICE PRIVATE PAYMENT TRANSACTIONS AS OF ${MOIS_TODAY}`,
      subtitle: 'DATE RANGE : {dateFrom} TO {dateTo}',
      cols: [30, 9, 11, 11, 13, 13, 13],
      head: ['PATIENT NAME', 'INVOICE NO.', '1st BILL DATE', 'PAY DATE', 'AMOUNT BILLED', 'AMOUNT PAID', 'PAYMENT METHOD'],
      rows: (ctx) => {
        const g = ctx.val('grouping')
        const [band, sub, key] = g === 'Payor Code'
          ? ['PAYOR:', 'PAYOR CODE:', (i: PvInvoice) => i.payor]
          : g === 'Invoice Code'
            ? ['INVOICE CODE:', 'INVOICE CODE:', (i: PvInvoice) => i.code || '<EMPTY>']
            : ['PAYMENT METHOD:', 'PAYMENT METHOD:', (i: PvInvoice) => i.method ?? '']
        const list = PV_INVOICES.filter((i) => i.paid > 0 && pvInRange(ctx, 'date', i.payAgo))
        const out: RSRow[] = []
        for (const [prov, invs] of pvGroup(list, (i) => i.prov)) {
          out.push(`**PROVIDER:   ${prov}**`)
          for (const [k, xs] of pvGroup(invs, key)) {
            out.push(`**${band}   ${k}**`)
            for (const i of pvByName(xs)) out.push([rsName(pvPatient(i)), String(i.inv), pvDot(i.ago), pvDot(i.payAgo!), rsMoney(i.billed), rsMoney(i.paid), i.method ?? ''])
            out.push([`SUB TOTAL FOR ${sub}   ${k}`, '', '', '', '', rsMoney(pvSum(xs, (i) => i.paid)), ''])
          }
          out.push([pvB(`TOTAL FOR PROVIDER:   ${prov}`), '', '', '', '', pvB(rsMoney(pvSum(invs, (i) => i.paid))), ''])
        }
        if (list.length) out.push('%HR%', [pvB('TOTAL FOR ALL PROVIDERS:'), '', '', '', '', pvB(rsMoney(pvSum(list, (i) => i.paid))), ''])
        return out
      },
      footer: [],
    },
  },
  {
    folder: 'Accounts - Private (Trans)',
    name: 'Transaction Activity Summary',
    id: 'transaction-activity-summary',
    provenance: '304045 ce4124bf (window), 6ea45a6d (page)',
    inferred: 'One line per payor per transaction kind (billing, payment, adjustment, write-off), as the capture shows a billing line and a payment line under one blank payor.',
    fields: [
      { kind: 'section', label: 'Activity Date Range (INCLUSIVE)' },
      pvDateRow('From Date:'),
    ],
    output: {
      title: `PRACTICE PRIVATE TRANSACTIONS AS OF ${MOIS_TODAY}`,
      subtitle: 'FOR ACTIVITY DURING {dateFrom} TO {dateTo}',
      cols: [30, 14, 14, 14, 14, 14],
      head: ['PAYOR CODE', 'BILLED SERVICE', 'BILLED GST', 'PAID', 'ADJUSTED', 'WRITTEN OFF'],
      rows: (ctx) => {
        type Tx = { prov: string; payor: string; v: number[] }
        const txs: Tx[] = []
        for (const i of PV_INVOICES) {
          if (pvInRange(ctx, 'date', WHEN.B(i))) txs.push({ prov: i.prov, payor: i.payor, v: [i.billed, i.gst, 0, 0, 0] })
          if (i.paid && pvInRange(ctx, 'date', WHEN.P(i))) txs.push({ prov: i.prov, payor: i.payor, v: [0, 0, i.paid, 0, 0] })
          if (i.adj && pvInRange(ctx, 'date', WHEN.A(i))) txs.push({ prov: i.prov, payor: i.payor, v: [0, 0, 0, i.adj, 0] })
          if (i.wo && pvInRange(ctx, 'date', WHEN.W(i))) txs.push({ prov: i.prov, payor: i.payor, v: [0, 0, 0, 0, i.wo] })
        }
        const total = (xs: Tx[]) => [0, 1, 2, 3, 4].map((k) => pvSum(xs, (t) => t.v[k]!))
        const out: RSRow[] = []
        for (const [prov, ts] of pvGroup(txs, (t) => t.prov)) {
          out.push(`**PROVIDER:   ${prov}**`)
          for (const [payor, xs] of pvGroup(ts, (t) => t.payor)) {
            for (const kind of [0, 2, 3, 4]) {
              const of = xs.filter((t) => t.v[kind] || (kind === 0 && t.v[1]))
              if (of.length) out.push([payor, ...total(of).map(pvMoney)])
            }
          }
          out.push(['TOTAL FOR ALL PAYORS:', ...total(ts).map(pvMoney)])
        }
        return out
      },
      footer: [],
    },
  },
  {
    folder: 'Accounts - Private (Trans)',
    name: 'Transaction By Patients',
    id: 'transaction-by-patients',
    provenance: '304045 f32a3095 (window), bf6d3d39 (page)',
    fields: [
      { kind: 'section', label: 'Transaction Date Range (INCLUSIVE)' },
      pvDateRow('From Date:'),
    ],
    output: {
      /* the subtitle's "WRITE OFF DATES" is MOIS's own wording on this page */
      title: `TRANSACTIONS BY PATIENT AS OF ${MOIS_TODAY}`,
      subtitle: 'FOR WRITE OFF DATES {dateFrom} TO {dateTo}',
      cols: [12, 36, 10, 42],
      head: ['TRANS DATE', 'FEE CODE / DESCRIPTION', 'BILLED AMOUNT', 'DIAGNOSIS CODE / DESCRIPTION'],
      rows: (ctx) => {
        const out: RSRow[] = []
        const list = pvByName(PV_INVOICES.filter((i) => pvInRange(ctx, 'date', i.ago)))
        for (const [, xs] of pvGroup(list, (i) => `${rsName(pvPatient(i))}|${pvPatient(i).chart}`)) {
          const p = pvPatient(xs[0]!)
          out.push(`%LINE:34,12,6,6,16,26%**${rsName(p)}**|**${p.dob}**|**${rsAge(p.dob)}**|**${p.gender}**|**Chart: ${p.chart}**|**${p.insuranceBy ?? 'BC'}  ${p.bchn ?? ''}  ${p.dep ?? '00'}**`)
          for (const i of pvByDate(xs)) out.push([pvDot(i.ago), `${i.fee}    ${i.desc}`, `${rsMoney(i.billed)} ${i.bills}`, `${i.dx}    ${i.dxDesc}`])
        }
        return out
      },
      footer: (ctx) => {
        const list = PV_INVOICES.filter((i) => pvInRange(ctx, 'date', i.ago))
        const pts = new Set(list.map((i) => pvPatient(i).chart)).size
        return [
          '%RULE%',
          `%LINE:50,12%TOTAL PATIENTS BILLED IN DATE RANGE:|${pts}`,
          `%LINE:50,12%TOTAL BILLING TRANSACTIONS IN DATE RANGE:|${list.length}`,
          `%LINE:50,12%TOTAL BILLED FOR VISITS IN DATE RANGE:|${rsMoney(pvSum(list, (i) => i.billed))}`,
          '%RULE%',
        ]
      },
    },
  },
  {
    folder: 'Accounts - Private (Trans)',
    name: 'Writeoff Entries for Date Range',
    id: 'writeoff-entries-date-range',
    provenance: '304045 ab20df89 (window), eff77f64 (page)',
    fields: [
      { kind: 'section', label: 'Transaction Date Range (INCLUSIVE)' },
      pvDateRow('From Date:'),
    ],
    output: {
      title: `PRACTICE PRIVATE TRANSACTIONS AS OF ${MOIS_TODAY}`,
      subtitle: 'FOR WRITE OFF DATES {dateFrom} TO {dateTo}',
      cols: [29, 10, 11, 12, 12, 12, 14],
      head: ['PATIENT NAME', 'INVOICE NO.', 'SERVICE DATE', 'WRITE OFF DATE', 'BILLED AMOUNT', 'PAID AMOUNT', 'WRITE OFF AMOUNT'],
      rows: (ctx) => {
        const list = PV_INVOICES.filter((i) => i.wo > 0 && pvInRange(ctx, 'date', i.woAgo))
        const money = (xs: PvInvoice[]) => [pvSum(xs, (i) => i.billed), pvSum(xs, (i) => i.paid), pvSum(xs, (i) => i.wo)].map(rsMoney)
        const out: RSRow[] = []
        for (const [prov, invs] of pvGroup(list, (i) => i.prov)) {
          out.push(`**PROVIDER:   ${prov}**`)
          for (const [payor, xs] of pvGroup(invs, (i) => i.payor)) {
            out.push(`**PAYOR:  ${payor}**`)
            for (const i of pvByName(xs)) out.push([rsName(pvPatient(i)), String(i.inv), pvDot(i.ago), pvDot(i.woAgo!), ...money([i])])
            out.push(['SUB TOTAL FOR PAYOR CODE:', '', '', '', ...money(xs)])
          }
          out.push([pvB(`TOTAL FOR PROVIDER:   ${prov}`), '', '', '', ...money(invs).map(pvB)])
        }
        if (list.length) out.push('%HR%', [pvB('TOTAL FOR ALL PROVIDERS:'), '', '', '', ...money(list).map(pvB)])
        return out
      },
      footer: [],
    },
  },
]
