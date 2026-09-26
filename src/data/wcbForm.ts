import type { MoisRecord } from './charts'
import type { WcbClaimEntry } from './patients'

/* ============================================================================
   The WCB Form (encounter form window WP_FORM_HEADER_WCB) as data.

   The window is transcribed in screens/WcbFormWindow.tsx from user captures
   2026-09-25 #25–#32 (v02.31.23) and art. 303118 `1800dc96…`. This module holds what it edits and how a saved form in a
   chart export (`form_wcb`, joined to its `form_header`) reads back into it.

   Export decoding. Chart 87288 carries one form (form_header 500135 on
   encounter 530205, form_wcb 500040) whose flags are
     str_family_doc_flag 9 · str_disable_work N · str_full_work_cap Y ·
     str_rtw_flag 0 · str_rehab_prog N · str_consult_advisor N ·
     str_followup_req N · str_status_bill I
   — exactly the radios a freshly created form shows in `1800dc96…`
   (> 12 m · No · Yes · At Work · No · No · No, Bill Status I). So 9 is
   `> 12 m` and 0 is `At Work`; no other code of those two fields is
   evidenced, and an unknown one leaves the group with nothing picked rather
   than guessing. The Y/N flags are plain.
   ========================================================================= */

export const FAMILY_MD = ['No', '1-6 m', '7 - 12 m', '> 12 m'] as const
export const TIME_TO_RTW = ['At Work', '1-6 days', '7-13 days', '14-20 days', '>20 days'] as const

/** the export's codes that the capture pins down (see above) */
const FAMILY_MD_CODE: Record<string, string> = { '9': '> 12 m' }
const RTW_CODE: Record<string, string> = { '0': 'At Work' }

export type YesNo = 'Yes' | 'No' | ''

export type WcbFormState = {
  /* Claim Information */
  claim: string; doi: string; area: string; position: string; nature: string
  icd9: string; fee: string; billStatus: string; mspSeq: string
  /* Employer Information */
  company: string; address: string; city: string; postal: string
  province: string; country: string; phone: string
  /* General Claim Information */
  firstTreatment: string; familyMd: string; prior: string; diagnosis: string
  /* Return to Work Plan */
  disabled: YesNo; disabledWhen: string
  fullDuties: YesNo; restrictions: string
  rtw: string
  rehab: YesNo; rehabType: string
  consult: YesNo
  mmr: string
  followUp: YesNo
  /** Assign Progress Note: the note that goes to WCB with the form */
  note: { key: string; number: number; author: string; text: string } | null
}

/** a form just created from Select Form — the defaults `1800dc96…` shows */
export const NEW_WCB_FORM: WcbFormState = {
  claim: '', doi: '', area: '', position: '', nature: '', icd9: '', fee: '', billStatus: 'I', mspSeq: '',
  company: '', address: '', city: '', postal: '', province: '', country: '', phone: '',
  firstTreatment: '', familyMd: '> 12 m', prior: '', diagnosis: '',
  disabled: 'No', disabledWhen: '', fullDuties: 'Yes', restrictions: '', rtw: 'At Work',
  rehab: 'No', rehabType: '', consult: 'No', mmr: '', followUp: 'No',
  note: null,
}

const yn = (v?: string): YesNo => (v === 'Y' ? 'Yes' : v === 'N' ? 'No' : '')

/** A saved form from the chart export. Fields the export leaves out stay blank. */
export function wcbFormFromExport(record: MoisRecord | undefined): WcbFormState {
  if (!record) return { ...NEW_WCB_FORM }
  return {
    ...NEW_WCB_FORM,
    familyMd: FAMILY_MD_CODE[record.str_family_doc_flag ?? ''] ?? '',
    disabled: yn(record.str_disable_work),
    fullDuties: yn(record.str_full_work_cap),
    rtw: RTW_CODE[record.str_rtw_flag ?? ''] ?? '',
    rehab: yn(record.str_rehab_prog),
    consult: yn(record.str_consult_advisor),
    followUp: yn(record.str_followup_req),
    billStatus: record.str_status_bill ?? 'I',
  }
}

/** "MOIS will automatically pull the claim information into the WCB form
    with this box checked" (art. 361789): the chart's Default claim. */
export function withDefaultClaim(form: WcbFormState, claims: WcbClaimEntry[] | undefined): WcbFormState {
  const claim = claims?.find((c) => c.isDefault)
  return claim ? withClaim(form, claim) : form
}

/** Claim No. F4 / "…": the picked claim fills Claim and Employer Information. */
export function withClaim(form: WcbFormState, c: WcbClaimEntry): WcbFormState {
  return {
    ...form,
    claim: c.claim ?? '', doi: c.doi ?? '', area: c.area ?? '', position: c.position ?? '',
    nature: c.nature ?? '', icd9: c.icd9 ?? '',
    company: c.company ?? c.employer ?? '', address: c.address ?? '', city: c.city ?? '',
    postal: c.postal ?? '', province: c.province ?? '', country: c.country ?? '', phone: c.phone ?? '',
  }
}

/** Update Patient Chart: the form's claim and employer as a WCB Claims row. */
export function claimFromForm(form: WcbFormState, isDefault: boolean): WcbClaimEntry {
  return {
    doi: form.doi, claim: form.claim, area: form.area, position: form.position, nature: form.nature,
    icd9: form.icd9, employer: form.company, company: form.company, address: form.address,
    city: form.city, postal: form.postal, province: form.province, country: form.country,
    phone: form.phone, isDefault,
  }
}

/** Add the claim to the chart's list, or update the row it already is.
    A row matches on claim number, or — for a claim with no number yet — on
    its date of injury. Mark as Default takes Default off every other row. */
export function mergeClaim(claims: WcbClaimEntry[] | undefined, claim: WcbClaimEntry): WcbClaimEntry[] {
  const list = [...(claims ?? [])]
  const same = (c: WcbClaimEntry) => (claim.claim ? c.claim === claim.claim : !c.claim && c.doi === claim.doi)
  const at = list.findIndex(same)
  const next = at < 0 ? [claim, ...list] : list.map((c, i) => (i === at ? { ...c, ...claim } : c))
  return claim.isDefault ? next.map((c) => (same(c) ? c : { ...c, isDefault: false })) : next
}

/* ============================================================================
   The WCB Form's drop lists and code sets, as the current build lists them.

   PROVENANCE: user capture 2026-09-25 (v02.31.23), each list dropped open in
   the pale-cream `Code | Description` DDDW style:
     · #27 — Fee: the five codes below, in this order and spelling (the
       first description is cut off at the list's edge in the capture:
       "WORKSAFEBC 1ST RPRT OF INJURY (FORM").
     · #28 — Anatomic Position: B Bilateral · L Left · N Not Applicable ·
       R Right.
     · #30 — Ready for Rehab Program? ▸ If yes, type: C WCP · O Other.
     · #29 — Area of Injury "…": the Advanced Lookup Service band "Area of
       Injury", Code / Description / Category, the memo "Code set from WCB".
       The 21 rows are the first screenful the capture shows, in its order
       (alphabetical by description); the rest of the WCB set is past the
       capture's PgDwn and is not transcribed.
   ========================================================================= */

export type WcbCode = { code: string; description: string; category?: string }

export const WCB_FEE_CODES: WcbCode[] = [
  { code: '19927', description: 'WORKSAFEBC 1ST RPRT OF INJURY (FORM' },
  { code: '19937', description: 'E-FORM 8 REC.D WTHN 3 WORK DYS' },
  { code: '19940', description: 'E-FRM 11 REC.D WTHN 3 WORK DYS' },
  { code: '19943', description: 'E-FORM 8 RESUBMISSION, NO CHARGE' },
  { code: '19944', description: 'E-FORM 11 SUBMISSION' },
]

export const WCB_POSITION_CODES: WcbCode[] = [
  { code: 'B', description: 'Bilateral' },
  { code: 'L', description: 'Left' },
  { code: 'N', description: 'Not Applicable' },
  { code: 'R', description: 'Right' },
]

export const WCB_REHAB_TYPES: WcbCode[] = [
  { code: 'C', description: 'WCP' },
  { code: 'O', description: 'Other' },
]

export const WCB_AREA_OF_INJURY: WcbCode[] = [
  { code: '24000', description: 'ABDOMEN, EXCEPT INT. LOC. OF DISEASES OR DISORDERS', category: 'ABDOMEN' },
  { code: '42000', description: 'ANKLE(S)', category: 'ANKLE(S)' },
  { code: '43220', description: 'ARCH(ES)', category: 'FOOT(FEET)' },
  { code: '43210', description: 'BALL(S)', category: 'FOOT(FEET)' },
  { code: '24410', description: 'BLADDER', category: 'ABDOMEN' },
  { code: '01100', description: 'BRAIN', category: 'CRANIAL' },
  { code: '22600', description: 'BREAST(S)--INTERNAL', category: 'CHEST' },
  { code: '22400', description: 'BRONCHUS', category: 'CHEST' },
  { code: '25300', description: 'BUTTOCK(S)', category: 'PELVIC REGION' },
  { code: '10001', description: 'CERVICAL REGION (CERVICAL VERTEBRAE)', category: 'NECK' },
  { code: '23201', description: 'CERVICO-THORACIC REGION', category: 'BACK' },
  { code: '03400', description: 'CHEEKS', category: 'FACE' },
  { code: '22000', description: 'CHEST, EXCEPT INT. LOC. OF DISEASES OR DISORDERS', category: 'CHEST' },
  { code: '50001', description: 'CIRCULATORY SYSTEM', category: 'BODY SYSTEMS' },
  { code: '23400', description: 'COCCYGEAL REGION', category: 'BACK' },
  { code: '50002', description: 'DIGESTIVE SYSTEM', category: 'BODY SYSTEMS' },
  { code: '31200', description: 'ELBOW(S)', category: 'ARM(S)' },
  { code: '22200', description: 'ESOPHAGUS', category: 'CHEST' },
  { code: '03201', description: 'EXTERNAL EYE(EX. FOR SUPERFICIAL CORNEAL ABRASIONS', category: 'FACE' },
  { code: '25530', description: 'EXTERNAL FEMALE GENITAL REGION', category: 'PELVIC REGION' },
  { code: '03200', description: 'EYE(S)', category: 'FACE' },
]

/** Printed on the Physician Report for the Family physician radio set. Only
    `> 12 m` → ">12 months" is captured (#31); the others follow its form. */
export const FAMILY_MD_PRINTED: Record<string, string> = {
  'No': 'No', '1-6 m': '1-6 months', '7 - 12 m': '7-12 months', '> 12 m': '>12 months',
}

/* ============================================================================
   Create MSP Claim — the checks MOIS runs before it will raise the bill.

   PROVENANCE: user capture 2026-09-25 #32 (v02.31.23), the "WCB Form MSP
   Claim Validation Warnings / Errors" window over a new, empty form: ten
   rows, all Code VALIDATION, in the order and wording below. Which field
   each check reads is inferred from its Type (EMPLOYER LOCATION is taken to
   be the employer's City); PATIENT INSURER fired for a chart insured out of
   province (Insurance By AB), and BC is taken as the one province that
   passes. What Create MSP Claim does when every check passes is not
   captured.
   ========================================================================= */

export type WcbValidation = { code: 'VALIDATION'; type: string; description: string }

const REQUIRE = (what: string) => `WCB Claims require ${what} to be entered - please correct before creating a MSP Claim.`

export function wcbMspValidation(form: WcbFormState, patient: { insuranceBy?: string }): WcbValidation[] {
  const out: WcbValidation[] = []
  const add = (type: string, description: string) => out.push({ code: 'VALIDATION', type, description })
  const blank = (v: string) => !v.trim()
  const insurer = (patient.insuranceBy ?? '').trim().toUpperCase()
  if (insurer && insurer !== 'BC') add('PATIENT INSURER', 'Cannot bill a WCB Claim for an out-of-province patient - please correct before creating a MSP Claim.')
  if (blank(form.company)) add('EMPLOYER NAME', REQUIRE('an employer name'))
  if (blank(form.city)) add('EMPLOYER LOCATION', REQUIRE('an employer location'))
  if (blank(form.diagnosis)) add('DIAGNOSIS', REQUIRE('a diagnosis'))
  if (blank(form.fee)) add('FEE CODE', REQUIRE('a fee code'))
  if (blank(form.icd9)) add('ICD9 CODE', REQUIRE('an ICD9 code'))
  if (blank(form.area)) add('AREA OF INJURY', REQUIRE('an Area of Injury code'))
  if (blank(form.position)) add('ANATOMIC POSITION', REQUIRE('an anatomic position code'))
  if (blank(form.nature)) add('NATURE OF INJURY', REQUIRE('a nature of injury code'))
  if (blank(form.doi)) add('DATE OF INJURY', REQUIRE('a Date of Injury'))
  return out
}
