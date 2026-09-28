import type { ReportSpec, RSContext } from './types'
import { MOIS_TODAY, rsDaysAgo, rsMoney } from './types'
import { PV_INVOICES, pvDot, pvInRange, pvMoney, pvPatient, pvSum } from './accountsPrivateInv'
import { MSP_CLAIMS, MSP_PRACT, codeListMatch } from './billsByDiagnosis'

/* ============================================================================
   Report specs transcribed from manual article 304047 (Bills - Fee Code):
   the `MSP` and `Practice Private` rows of the `Bills - Fee Code` folder.
   PROVENANCE: per spec below.

   The MSP window is a later build than the Bills - by Diagnosis one (Windows
   10 frame, 2019 dates): a Paid Date / Service Date choice on the date-range
   heading, Code List(s) OR a Concept "…", a free-text "Billed by" provider
   with its own "…", and an Output to Chart Navigator tick. The article's
   parameter table still describes the older Current Provider / All Providers
   radios; the capture wins. Default range: 90 days ending today
   (2018.12.05 → 2019.03.05 in the capture).

   Pages read the MSP claim ledger of billsByDiagnosis.ts and the private
   ledger of accountsPrivateInv.ts — fictional training data.
   ========================================================================= */

/** Concept "…": a named group of fee codes (INFERRED — the capture shows the
    button, never its list) */
const CONCEPTS: Record<string, string[]> = {
  'CHRONIC DISEASE MANAGEMENT': ['14050', '14051', '14052', '14053'],
  'OFFICE VISITS': ['00100', '12100'],
  'TRAY FEES': ['00044'],
}

function feeMatch(ctx: RSContext, fee: string): boolean {
  const list = ctx.val('codes')
  const concept = CONCEPTS[ctx.val('concept').trim().toUpperCase()]
  return (!!list && codeListMatch(ctx, list, fee)) || (!!concept && concept.includes(fee))
}

export const specs: ReportSpec[] = [
  {
    folder: 'Bills - Fee Code',
    name: 'MSP',
    id: 'bills-fee-msp',
    labelW: 95,
    provenance: '304047 3372ba96 (window), d5e624b4 (page)',
    inferred: 'The Concept list and its fee codes are invented (the capture shows only the "…" button). Billed by matches the provider name, `*` (or `%`) as the wildcard, as its grey hint says.',
    fields: [
      {
        kind: 'section', label: 'Date Range (INCLUSIVE)',
        right: { kind: 'radio', id: 'dateBasis', options: ['Paid Date', 'Service Date'], value: 'Service Date' },
      },
      {
        kind: 'row', label: 'Date of Service:', fields: [
          { kind: 'text', id: 'dateFrom', value: rsDaysAgo(90), w: 82, align: 'center', required: true },
          { kind: 'text', id: 'dateTo', label: 'to', value: MOIS_TODAY, w: 82, align: 'center' },
        ],
      },
      { kind: 'section', label: 'Fee Codes' },
      { kind: 'text', id: 'codes', label: 'Code List(s):', w: 280, hint: '(ie 00100,18100,...)' },
      { kind: 'note', text: 'OR...', indent: 6 },
      { kind: 'text', id: 'concept', label: 'Concept:', w: 310, dots: { title: 'Concept', options: Object.keys(CONCEPTS) } },
      { kind: 'section', label: 'Providers' },
      { kind: 'text', id: 'billedBy', label: 'Billed by:', w: 200, dots: { title: 'Provider', options: 'providers' }, hint: '(leave blank for ALL, * for a wild card)' },
      { kind: 'section', label: 'Exclude Records' },
      { kind: 'check', id: 'excludeResubmitted', text: 'Exclude (R)esubmitted Records', checked: true },
      { kind: 'check', id: 'excludeDeleted', text: 'Exclude (D)eleted Claims', checked: true },
      { kind: 'section', label: 'Output' },
      { kind: 'check', id: 'navigator', text: 'Output to Chart Navigator', output: 'navigator' },
    ],
    output: {
      title: 'LIST OF MSP PAYMENTS BY SELECTED FEE CODES',
      subtitle: 'FOR PAYMENT DATE BETWEEN {dateFrom} AND {dateTo}\nFEE CODE(S): {codes}',
      cols: [16, 15, 8, 11, 11, 9, 9, 9, 12],
      head: ['LAST NAME', 'FIRST NAME', 'CHART', 'DATE OF BIRTH', 'DATE OF PAYMENT', 'PRACT NO', 'FEE CODE', 'RECON STATUS', 'NET PAYMENT'],
      chartCol: 2,
      rows: (ctx) => {
        if (!ctx.val('codes') && !ctx.val('concept')) return []
        const byPaid = ctx.val('dateBasis') === 'Paid Date'
        const who = ctx.val('billedBy').replace(/\*/g, '%')
        const list = MSP_CLAIMS.filter((c) => c.payAgo != null && feeMatch(ctx, c.fee) && pvInRange(ctx, 'date', byPaid ? c.payAgo : c.ago)
          && ctx.like(who, c.prov, 'equals')
          && !(ctx.on('excludeResubmitted') && c.st === 'R') && !(ctx.on('excludeDeleted') && c.st === 'D'))
          .sort((a, b) => {
            const pa = pvPatient(a.pt), pb = pvPatient(b.pt)
            return pa.last.localeCompare(pb.last) || pa.first.localeCompare(pb.first) || b.ago - a.ago
          })
        return [
          `**For Provider: ${ctx.val('billedBy') || 'ALL PROVIDERS'}**`,
          ...list.map((c) => {
            const p = pvPatient(c.pt)
            return [p.last, p.first, p.chart, p.dob, rsDaysAgo(c.payAgo!), MSP_PRACT[c.prov] ?? '', c.fee, c.st, `$${rsMoney(c.net)}`]
          }),
        ]
      },
      footer: (_ctx, rows) => [`**RECORDS PRINTED:  ${rows.length}**`],
    },
  },
  {
    folder: 'Bills - Fee Code',
    name: 'Practice Private',
    id: 'bills-fee-private',
    labelW: 95,
    provenance: '304047 b10e1831 (window), d033bd2b (page)',
    inferred: 'Codes is marked required from the article ("at least one fee code must be specified"); the capture has codes typed in, so it is not salmon there. Range default taken as 90 days ending today, like the other Bills windows (the capture shows a typed 2016.01.01).',
    fields: [
      { kind: 'section', label: 'Fee Codes (Separated by commas)' },
      { kind: 'text', id: 'codes', label: 'Codes:', w: 430, required: true },
      { kind: 'section', label: 'Date Range (INCLUSIVE)' },
      { kind: 'range', id: 'date', label: 'Date of Service:', from: rsDaysAgo(90), to: MOIS_TODAY, w: 82, joiner: 'to' },
    ],
    output: {
      title: `LIST OF PRACTICE PRIVATE BILLS BY FEE CODES AS OF ${MOIS_TODAY}`,
      subtitle: 'FOR SERVICE DATE BETWEEN {dateFrom} AND {dateTo}\nFEE CODE(S): {codes}',
      cols: [10, 24, 12, 16, 11, 7, 20],
      head: ['SERVICE DATE', 'PATIENT NAME', 'DOB', 'PAYOR CODE', 'SERVICE BILLED', 'GST', 'PRACTITIONER'],
      rows: (ctx) => {
        const codes = ctx.val('codes')
        if (!codes) return []
        return PV_INVOICES.filter((i) => codeListMatch(ctx, codes, i.fee) && pvInRange(ctx, 'date', i.ago))
          .sort((a, b) => b.ago - a.ago)
          .map((i) => {
            const p = pvPatient(i)
            return [pvDot(i.ago), `${p.last}, ${p.first}`, p.dob, i.payor, rsMoney(i.billed), pvMoney(i.gst), i.prov]
          })
      },
      footer: (ctx) => {
        const codes = ctx.val('codes')
        const list = codes ? PV_INVOICES.filter((i) => codeListMatch(ctx, codes, i.fee) && pvInRange(ctx, 'date', i.ago)) : []
        return ['%RULE%', `%LINE:46,17,11,8%**ROWS PRINTED: ${list.length}**|**REPORT TOTAL:**|**${rsMoney(pvSum(list, (i) => i.billed))}**|**${pvMoney(pvSum(list, (i) => i.gst))}**`]
      },
    },
  },
]
