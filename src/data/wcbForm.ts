import type { MoisRecord } from './charts'
import type { WcbClaimEntry } from './patients'

/* ============================================================================
   The WCB Form (encounter form window WP_FORM_HEADER_WCB) as data.

   The window is transcribed in screens/WcbFormWindow.tsx from art. 303118
   `1800dc96…`. This module holds what it edits and how a saved form in a
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
