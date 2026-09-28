/* ============================================================================
   Lookup choices for the Demographics folder's ID Alias and Incentives tabs.
   Code lists, never patient records.

   PROVENANCE: art. 301149 (Demographics).
     ID Alias — `a634328f…png` (v02.20.18) prints HOSPNO / HOSPITAL NO. and
       RCMP / RCMP NUMBER; the training chart's own alias (patients.ts) is
       NHN / NORTHERN HEALTH NUMB; the prose names a Social Insurance Number.
       INFERRED: the Alias ID selection list itself (Administration ▸
       Selection Lists ▸ Alias ID) is not captured, so the list is those four
       codes and nothing more. SIN's code is this emulator's.
     Incentives — `a0c45e54…png` (v02.20.18) prints 14033 ANNUAL COMPLEX CARE
       MANAGEMENT FEE at a frequency of 12 with diagnostic code D491; the
       v02.31 user capture (reference/NOTES.md `incentive-claim-populated.png`,
       data/mois.tsx `incentiveRows`) prints 10 OR 24 HOUR TENSION CURVE -
       DIURNAL with A430. The other fee codes are the BC MSP chronic-care
       incentive codes the article's purpose line ("incentive billing for
       complex and chronic conditions") refers to. INFERRED: their billing
       frequencies. The diagnostic codes are the ICD-9 terms the Universal
       Search Window already carries (data/encounterPickers) plus the two the
       captures print.
   ========================================================================= */

import { universalSearchRows } from './encounterPickers'

export type AliasIdCode = { code: string; desc: string }

export const ALIAS_ID_CODES: AliasIdCode[] = [
  { code: 'HOSPNO', desc: 'HOSPITAL NO.' },
  { code: 'NHN', desc: 'NORTHERN HEALTH NUMB' },
  { code: 'RCMP', desc: 'RCMP NUMBER' },
  { code: 'SIN', desc: 'SOCIAL INSURANCE NUMBER' },
]

export type ClaimLookupRow = { code: string; description: string; category: string; freq?: string }

export const INCENTIVE_FEE_CODES: ClaimLookupRow[] = [
  { code: '14033', description: 'ANNUAL COMPLEX CARE MANAGEMENT FEE', category: 'BCMSPFEE', freq: '12' },
  { code: '14043', description: 'MENTAL HEALTH PLANNING FEE', category: 'BCMSPFEE', freq: '12' },
  { code: '14050', description: 'ANNUAL CHRONIC CARE INCENTIVE - DIABETES MELLITUS', category: 'BCMSPFEE', freq: '12' },
  { code: '14051', description: 'ANNUAL CHRONIC CARE INCENTIVE - HEART FAILURE', category: 'BCMSPFEE', freq: '12' },
  { code: '14052', description: 'ANNUAL CHRONIC CARE INCENTIVE - HYPERTENSION', category: 'BCMSPFEE', freq: '12' },
  { code: '14053', description: 'ANNUAL CHRONIC CARE INCENTIVE - COPD', category: 'BCMSPFEE', freq: '12' },
  { code: '14075', description: 'FRAILTY COMPLEX CARE PLANNING AND MANAGEMENT FEE', category: 'BCMSPFEE', freq: '12' },
  { code: '22023', description: '10 OR 24 HOUR TENSION CURVE - DIURNAL', category: 'BCMSPFEE', freq: '12' },
]

export const INCENTIVE_DIAG_CODES: ClaimLookupRow[] = [
  { code: 'A430', description: 'A430', category: 'DIAGNOSIS' },
  { code: 'D491', description: 'D491', category: 'DIAGNOSIS' },
  { code: '250', description: 'DIABETES MELLITUS', category: 'DIAGNOSIS' },
  { code: '401', description: 'ESSENTIAL HYPERTENSION', category: 'DIAGNOSIS' },
  { code: '428', description: 'HEART FAILURE', category: 'DIAGNOSIS' },
  { code: '496', description: 'CHRONIC AIRWAY OBSTRUCTION', category: 'DIAGNOSIS' },
  ...universalSearchRows.filter((r) => r.system === 'ICD-9').map((r) => ({ code: r.code, description: r.term, category: r.category })),
]
