import { capturedExport } from './captured'

/* ============================================================================
   Chart 3924 (PATCH AADAMS) — the records the 2026-09-29 MOIS TRAINING
   captures show, in the chart export's shape. The patient stays in
   `patients.ts`; the Determinants of Health stay in `determinants.ts`.

   PROVENANCE (scratchpad/set2/srgb):
   · measure — c01 (List View, every Show box ticked) and c08 (Panel View):
     the ten rows in view, newest first. The grid scrolls: c08 shows the top
     of an eleventh row (2026.09.08 WEBFORMS TEST 2026-09-08T21:00:07.907Z …),
     too clipped to transcribe, and nothing below it. c01 clips the Ordered
     By cells to "TECHNICAL SUPPO..."; the detail of the 2026.09.28 BODY MASS
     INDEX row (c02) and of the blank 2026.09.16 row (c01, c07) print
     TECHNICAL SUPPORT in full. INFERRED: the other four clipped cells are
     the same user. The WEBFORMS TEST row's Value is clipped by its column
     ("WEBFORMS TE" in c01, "WEBFORMS ..." in c08) and kept as c01 prints it.
     Details: BODY MASS INDEX (c02) Ref. Ranges 18.5 to 25, Source MOISFORM,
     Created 2026.09.28 12:03 JALIL, AHMAD (c06 is the same row after the
     capture session edited it, 2026.09.29 21:44 — not used); the blank
     2026.09.16 row (c01 / c07) Status F, Source SYSTEM, Created 2026.09.20
     23:40 JALIL, AHMAD, ENC# 10067296. The ".*." marker some rows carry
     (a linked form) is not reproduced: the form behind it is not captured.
   · family_hx — c15: FLO (MICKEY) AARONSON, chart 2429, Parent; Created
     2026.03.04 14:11 ANATOLE, RACHEL. The Chart column has no export field
     the row mapping reads, so the 2429 is not carried.
   · c12 (Imaging) is a blank new record, not a filed one: nothing to seed.

   The Patient Summary capture (`reference/patient-summary-3924.png`) shows
   only band counts; those are CAPTURED_SUMMARY_COUNTS in summary.ts, not
   records here.
   ========================================================================= */

const TS = 'TECHNICAL SUPPORT'
const AJ = 'JALIL, AHMAD'

/* c01: Collected · Ordered By · Code · Test Name · Value · Units · Status */
const MEASURES: [string, string, string, string, string, string, string][] = [
  ['2026/09/29', AJ, '22732', 'Weight (kg)', '31', 'kg', 'F'],
  ['2026/09/29', AJ, '22732', 'Weight (kg)', '3.2', 'kg', 'F'],
  ['2026/09/28', TS, '2000', 'HEAD CIRCUMFERENCE', '', 'cm', ''],
  ['2026/09/28', TS, '1948', 'HEIGHT', '2', 'Cms', ''],
  ['2026/09/28', TS, '22732', 'WEIGHT', '12', 'kg', ''],
  ['2026/09/28', TS, '24852', 'WEIGHT MEASURED', '', 'cm', ''],
  ['2026/09/28', TS, '951', 'BODY MASS INDEX', '', '', ''],
  ['2026/09/16', TS, '', '', '', '', 'F'],
  ['2026/09/16', AJ, '84709', 'ABC Stamp Lick Er Assessment', 'See report', '', 'F'],
  ['2026/09/10', AJ, 'WEBFORM', 'WEBFORMS TEST mtvx0yd5 1ugx', 'WEBFORMS TE', '', 'F'],
]

/* the two rows whose Report tab is captured, by index */
const DETAIL: Record<number, Record<string, string>> = {
  6: { str_normal_lower: '18.5', str_normal_high: '25', str_interface: 'MOISFORM', stp_user_create: AJ, stp_date_create: '2026/09/28 12:03' },
  7: { str_interface: 'SYSTEM', stp_user_create: AJ, stp_date_create: '2026/09/20 23:40', id_encounter: '10067296' },
}

export const captured3924 = capturedExport('3924', 'set2 c01 c02 c06 c07 c08 c15', {
  measure: MEASURES.map(([date, by, code, test, value, units, status], i) => ({
    id_measure: `cap-3924-measure-${i + 1}`,
    dtm_collect_date: date,
    str_order_by: by,
    ...(code ? { str_code: code } : {}),
    ...(test ? { str_description: test } : {}),
    ...(value ? { str_value: value } : {}),
    ...(units ? { str_units: units } : {}),
    ...(status ? { str_status: status } : {}),
    ...DETAIL[i],
  })),

  family_hx: [{
    id_family_hx: 'cap-3924-family-1',
    str_name: 'FLO (MICKEY) AARONSON',
    str_relationship: 'Parent',
    stp_user_create: 'ANATOLE, RACHEL',
    stp_date_create: '2026/03/04 14:11',
  }],
})
