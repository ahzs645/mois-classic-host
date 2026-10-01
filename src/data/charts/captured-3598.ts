import { capturedExport } from './captured'

/* ============================================================================
   Chart 3598 (PATCH HARRY AADAMS) — the records the MOIS TRAINING Patient
   Summary capture shows, in the chart export's shape. The patient stays in
   `patients.ts`; the Determinants of Health stay in `determinants.ts`.

   PROVENANCE: `reference/patient-summary-3598.png`, whose CONNECTIONS [9]
   band is expanded — Date · Description · Detail, in the order MOIS lists
   them. Every other band is collapsed there and shows only its count; those
   are CAPTURED_SUMMARY_COUNTS in summary.ts, not records here.

   The summary prints the connection type's description ("Primary Provider",
   "Pharmacy"), not the code the export stores (87288's export writes
   PRIMARY, PHARMACY, HS). The codes behind "Aboriginal Organization" and
   "First Nation Reserve" are not captured, so `str_connection_type` holds
   the text as printed for all nine. The two pharmacy names wrap onto a
   second line in the capture; they are one value.
   ========================================================================= */

const CONNECTIONS: [string, string, string][] = [
  ['2025/03/19', 'Aboriginal Organization', 'Blueberry River First Nation'],
  ['2015/01/01', 'Aboriginal Organization', "Lheidli T'enneh Band"],
  ['1991/01/01', 'First Nation Reserve', 'Blueberry River First Nations'],
  ['2024/09/17', 'First Nation Reserve', "Lheidli T'enneh Band"],
  ['2024/09/17', 'Pharmacy', 'COSTCO PHARMACY # 158 - 2555 Range Road - Prince George'],
  ['2025/02/11', 'Pharmacy', 'PHARMASAVE # 076 - TELEPHARMACY - 2520 Harrison Ave. - Masset'],
  ['2024/09/17', 'Primary Provider', 'GIM CLINIC'],
  ['2024/09/17', 'Primary Provider', 'NO PRIMARY CARE PROVIDER'],
  ['2025/03/19', 'Primary Provider', 'NO PRIMARY CARE PROVIDER'],
]

export const captured3598 = capturedExport('3598', 'reference/patient-summary-3598.png', {
  connection: CONNECTIONS.map(([start, type, provider], i) => ({
    id_connection: `cap-3598-connection-${i + 1}`,
    dtm_start: start,
    str_connection_type: type,
    str_provider: provider,
  })),
})
