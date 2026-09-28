import type { ReportSpec, RSContext } from './types'
import { MOIS_TODAY, rsDaysAgo, rsMoney } from './types'
import { PV_INVOICES, pvDot, pvInRange, pvPatient, pvSum } from './accountsPrivateInv'

/* ============================================================================
   Report specs transcribed from manual article 304046 (Bills - By
   Diagnosis): the `MSP` and `Practice Private` rows of the `Bills - by
   Diagnosis` folder.
   PROVENANCE: per spec below.

   Both windows open on a 90-day Date of Service range ending today
   (2012.04.12 → 2012.07.11 in the captures). "At least one diagnostic code
   must be specified in order for the report to populate; multiple diagnostic
   codes should be separated by a comma" — a blank Codes box prints an empty
   page. Each code is matched whole, `%` as the wildcard (304049).

   The MSP claim ledger below is shared with 304047 (billsFeeCode.ts); the
   Practice Private pages read the private ledger of accountsPrivateInv.ts.
   Practitioner numbers, claims and payments are fictional training data.
   ========================================================================= */

/** fictional MSP practitioner (payee) numbers for the RS_PROVIDERS names */
export const MSP_PRACT: Record<string, string> = {
  'BEARDWOOD, WALTER': '98761', 'DUCHARME, AMARILYS': '98762', 'FAIRCHILD, NESRIN L': '98763', 'HOWSER, DOOGIE': '98764', 'SHEWCHUK, LEAH': '98765',
}
/** the emulator's Desktop Provider for "Current Desktop" (sample data) */
export const MSP_DESKTOP = 'BEARDWOOD, WALTER'

export type MspClaim = {
  pt: number
  prov: string
  /** service date, days before MOIS_TODAY */
  ago: number
  /** payment date, days before MOIS_TODAY; absent while unpaid */
  payAgo?: number
  dx: string
  fee: string
  loc: string
  /** P paid, S submitted, R resubmitted, D deleted */
  st: 'P' | 'S' | 'R' | 'D'
  net: number
}

const [WB, AD, DH, FN, LS] = ['BEARDWOOD, WALTER', 'DUCHARME, AMARILYS', 'HOWSER, DOOGIE', 'FAIRCHILD, NESRIN L', 'SHEWCHUK, LEAH']
export const MSP_CLAIMS: MspClaim[] = [
  { pt: 3, prov: WB, ago: 12, payAgo: 5, dx: '250', fee: '14050', loc: 'A', st: 'P', net: 78.94 },
  { pt: 4, prov: AD, ago: 20, payAgo: 10, dx: '401', fee: '14053', loc: 'A', st: 'P', net: 52.14 },
  { pt: 15, prov: WB, ago: 33, payAgo: 20, dx: '250', fee: '00100', loc: 'A', st: 'P', net: 31.62 },
  { pt: 17, prov: DH, ago: 41, payAgo: 28, dx: '493', fee: '12100', loc: 'A', st: 'R', net: 31.62 },
  { pt: 10, prov: AD, ago: 47, payAgo: 35, dx: '715', fee: '00100', loc: 'A', st: 'P', net: 31.62 },
  { pt: 11, prov: DH, ago: 55, dx: '311', fee: '12100', loc: 'R', st: 'D', net: 0 },
  { pt: 16, prov: WB, ago: 63, payAgo: 50, dx: '250', fee: '00044', loc: 'A', st: 'P', net: 6.5 },
  { pt: 6, prov: LS, ago: 70, payAgo: 58, dx: '496', fee: '00100', loc: 'I', st: 'P', net: 31.62 },
  { pt: 13, prov: AD, ago: 78, payAgo: 65, dx: '401', fee: '00100', loc: 'A', st: 'P', net: 31.62 },
  { pt: 8, prov: FN, ago: 85, payAgo: 70, dx: '465', fee: '12100', loc: 'E', st: 'P', net: 31.62 },
  { pt: 3, prov: WB, ago: 95, payAgo: 80, dx: '250', fee: '14050', loc: 'A', st: 'P', net: 78.94 },
  { pt: 4, prov: AD, ago: 5, dx: '401', fee: '00100', loc: 'A', st: 'S', net: 0 },
  { pt: 15, prov: WB, ago: 26, payAgo: 14, dx: '250', fee: '00044', loc: 'A', st: 'P', net: 6.5 },
]

/** does `value` equal any comma-separated code in the box (`%` wildcard)? */
export function codeListMatch(ctx: RSContext, list: string, value: string): boolean {
  return list.split(',').map((c) => c.trim()).filter(Boolean).some((c) => ctx.like(c, value, 'equals'))
}
const byPatient = <T extends { pt: number }>(xs: T[]) => [...xs].sort((a, b) => {
  const pa = pvPatient(a.pt), pb = pvPatient(b.pt)
  return pa.last.localeCompare(pb.last) || pa.first.localeCompare(pb.first)
})

export const specs: ReportSpec[] = [
  {
    folder: 'Bills - by Diagnosis',
    name: 'MSP',
    id: 'bills-dx-msp',
    labelW: 95,
    provenance: '304046 eeca2200 (window), f88cdd76 (page)',
    inferred: 'Current Desktop prints the claims of the sample Desktop Provider (BEARDWOOD, WALTER). ST prints the claim status (P/S/R/D); the capture shows a numeric status.',
    fields: [
      { kind: 'section', label: 'Diagnosis Codes (Separated by commas)' },
      { kind: 'text', id: 'codes', label: 'Codes:', w: 430, required: true },
      { kind: 'section', label: 'Date Range (INCLUSIVE)' },
      { kind: 'range', id: 'date', label: 'Date of Service:', from: rsDaysAgo(90), to: MOIS_TODAY, w: 82, joiner: 'to' },
      { kind: 'section', label: 'Providers' },
      { kind: 'radio', id: 'providers', options: ['Current Desktop', 'All Providers'], value: 'All Providers', column: true },
      { kind: 'section', label: 'Exclude Records' },
      /* "(R)ubmitted" and "(D)elete" are the capture's own spelling */
      { kind: 'check', id: 'excludeResubmitted', text: 'Exclude (R)ubmitted Records', checked: true },
      { kind: 'check', id: 'excludeDeleted', text: 'Exclude (D)elete Claims', checked: true },
    ],
    output: {
      title: 'LIST OF MSP BILLS BY SELECTED DIAGNOSIS CODES',
      subtitle: 'FOR SERVICE DATE BETWEEN {dateFrom} AND {dateTo}\nDIAG CODE(S): {codes}',
      cols: [17, 15, 7, 11, 11, 8, 6, 8, 9, 8],
      head: ['LAST NAME', 'FIRST NAME', 'CHART', 'DATE OF BIRTH', 'DATE OF SERVICE', 'DIAG CODE', 'LOC', 'PRACT NO', 'FEE CODE', 'ST'],
      chartCol: 2,
      rows: (ctx) => {
        const codes = ctx.val('codes')
        if (!codes) return []
        const desk = ctx.val('providers') === 'Current Desktop'
        const list = byPatient(MSP_CLAIMS.filter((c) => codeListMatch(ctx, codes, c.dx) && pvInRange(ctx, 'date', c.ago)
          && (!desk || c.prov === MSP_DESKTOP)
          && !(ctx.on('excludeResubmitted') && c.st === 'R') && !(ctx.on('excludeDeleted') && c.st === 'D')))
        return [
          `**For Provider: ${desk ? MSP_DESKTOP : 'ALL PROVIDERS'}**`,
          ...list.map((c) => {
            const p = pvPatient(c.pt)
            return [p.last, p.first, p.chart, p.dob, rsDaysAgo(c.ago), c.dx, c.loc, MSP_PRACT[c.prov] ?? '', c.fee, c.st]
          }),
        ]
      },
      footer: (_ctx, rows) => [`**RECORDS PRINTED:  ${rows.length}**`],
    },
  },
  {
    folder: 'Bills - by Diagnosis',
    name: 'Practice Private',
    id: 'bills-dx-private',
    labelW: 95,
    provenance: '304046 574a56a7 (window), e5710484 (page)',
    inferred: 'Codes is marked required from the article ("at least one diagnostic code must be specified"); the capture has 715 typed in, so it is not salmon there. The footer (rows printed, report total of the amounts billed) is from the article; the capture is an empty page.',
    fields: [
      { kind: 'section', label: 'Diagnosis Codes (Separated by commas)' },
      { kind: 'text', id: 'codes', label: 'Codes:', w: 430, required: true },
      { kind: 'section', label: 'Date Range (INCLUSIVE)' },
      { kind: 'range', id: 'date', label: 'Date of Service:', from: rsDaysAgo(90), to: MOIS_TODAY, w: 82, joiner: 'to' },
    ],
    output: {
      title: `LIST OF PRACTICE PRIVATE BILLS BY DIAGNOSIS CODES AS OF ${MOIS_TODAY}`,
      subtitle: 'FOR SERVICE DATE BETWEEN {dateFrom} AND {dateTo}\nDIAGNOSIS CODE(S): {codes}',
      cols: [11, 25, 11, 11, 12, 9, 21],
      head: ['SERVICE DATE', 'PATIENT NAME', 'DOB', 'FEE CODE', 'PAYOR CODE', 'PAYEE NO', 'PRACTITIONER'],
      rows: (ctx) => {
        const codes = ctx.val('codes')
        if (!codes) return []
        return [...PV_INVOICES].filter((i) => codeListMatch(ctx, codes, i.dx) && pvInRange(ctx, 'date', i.ago))
          .sort((a, b) => b.ago - a.ago)
          .map((i) => {
            const p = pvPatient(i)
            return [pvDot(i.ago), `${p.last}, ${p.first}`, p.dob, i.fee, i.payor, MSP_PRACT[i.prov] ?? '', i.prov]
          })
      },
      footer: (ctx) => {
        const codes = ctx.val('codes')
        const list = codes ? PV_INVOICES.filter((i) => codeListMatch(ctx, codes, i.dx) && pvInRange(ctx, 'date', i.ago)) : []
        return ['%RULE%', `%LINE:45,20,12%**ROWS PRINTED: ${list.length}**|**REPORT TOTAL:**|**${rsMoney(pvSum(list, (i) => i.billed))}**`]
      },
    },
  },
]
