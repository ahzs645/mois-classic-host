import type { MoisChartExport, MoisChartGroup, MoisOptionalGroup, MoisRecord } from './types'

/* ============================================================================
   Training records laid over a real chart export.

   The exported charts are generated files (`chart-87288.ts`, "do not
   edit"). A lesson that needs a record the export does not have adds it
   here instead, with the article and image it stands for, and the loader in
   `index.ts` merges these in when the chart is first loaded.
   ========================================================================= */

const OVERLAYS: Record<string, Partial<Record<MoisChartGroup | MoisOptionalGroup, MoisRecord[]>>> = {
  '87288': {
    /* Long Term Meds. The export's list is empty (`<medication_lts/>`), and
       the lessons on the folder — review, duplicate, renew, print — need a
       standing list. These two are the drugs this chart's prescriptions were
       written for (501046 rosuvastatin, 501048 ipratropium), started on the
       day of that first prescription, in the tdt_medication_lt shape of the
       MOIS_REF_10000074 export. The dose trees are theirs below. */
    medication_lt: [
      {
        id_medication_lt: 'training-ltm-rosuvastatin',
        id_chart: '577521',
        dtm_start: '2025/10/02',
        str_ordered_by: 'TECHNICAL SUPPORT',
        str_cdic: '02247162',
        str_medication: 'ROSUVASTATIN (ROSUVASTATIN CALCIUM) 10MG TABLET',
        str_generic_name: 'ROSUVASTATIN (ROSUVASTATIN CALCIUM) 10MG TABLET',
        str_dose_freq: '10 CAP ORAL DAILY',
        str_atc_code: 'C10AA07',
        str_no_substitute: 'N',
        str_do_not_adapt: 'N',
        str_refill: 'N',
        str_dose_type: 'SIMPLE',
        str_prn: 'N',
        stp_user_create: 'GIESBRECHT, ABBY',
        stp_date_create: '2025/10/02 11:02:46',
      },
      {
        id_medication_lt: 'training-ltm-ipratropium',
        id_chart: '577521',
        dtm_start: '2025/10/22',
        str_ordered_by: 'TECHNICAL SUPPORT',
        str_cdic: '02247686',
        str_medication: 'IPRATROPIUM BROMIDE 20 mcg [Inhalation Metered-Dose Aerosol]',
        str_generic_name: 'IPRATROPIUM BROMIDE 20 mcg [Inhalation Metered-Dose Aerosol]',
        str_dose_freq: '1 DOSE Oral TID',
        str_atc_code: 'R03BB01',
        str_no_substitute: 'N',
        str_do_not_adapt: 'N',
        str_refill: 'N',
        str_dose_type: 'SIMPLE',
        str_prn: 'N',
        stp_user_create: 'MANTUA, TIFFANY',
        stp_date_create: '2025/10/22 12:16:17',
      },
    ],
    /* "duration: 0.0 ENTER ON RENEW", then the dose — the Dose Detail tree
       the real window shows for a long-term med */
    drug_duration: [
      { id_drug_duration: 'training-dur-ltm-rosuvastatin', str_object: 'tdt_medication_lt', id_object: 'training-ltm-rosuvastatin', num_duration: '0.0000', str_duration_units: 'ENTER ON RENEW', num_sequence: '10' },
      { id_drug_duration: 'training-dur-ltm-ipratropium', str_object: 'tdt_medication_lt', id_object: 'training-ltm-ipratropium', num_duration: '0.0000', str_duration_units: 'ENTER ON RENEW', num_sequence: '10' },
    ],
    drug_dose: [
      { id_drug_dose: 'training-dose-ltm-rosuvastatin', id_drug_duration: 'training-dur-ltm-rosuvastatin', num_dose: '10.0000', str_dose_units: 'CAP', str_route: 'ORAL', str_frequency: 'DAILY', num_sequence: '10' },
      { id_drug_dose: 'training-dose-ltm-ipratropium', id_drug_duration: 'training-dur-ltm-ipratropium', num_dose: '1.0000', str_dose_units: 'DOSE', str_route: 'Oral', str_frequency: 'TID', num_sequence: '10' },
    ],
    /* 2961349 "Receiving an Information Request" (`5d64ed94…`, `ad5aba34…`):
       an Information Request another clinic sent over CDX lands in Orders as
       a MISC order "INFORMATION REQUEST" addressed to this clinic's provider,
       which is the row the Respond button answers. Dated before the
       export's oldest order so it lists last and every lesson that works on
       the Orders folder's first row still lands where it did. Training
       overlay. */
    order: [
      {
        id_order: 'training-info-request-2961349',
        id_chart: '577521',
        dtm_ord_date: '2025/09/08',
        str_order_type: 'MISC',
        str_order_by: 'ORTHO, JANE',
        str_performed_by: 'TECHNICAL SUPPORT',
        str_description: 'INFORMATION REQUEST',
        str_status: 'IP',
        str_priority_code: 'ROUTINE',
        str_source: 'EXT',
        str_interface: 'CDX',
        str_facility: 'NORTHERN VALLEY FAMILY PRACTICE',
        str_note: 'To Whom It May Concern,\r\n\r\n This is an information request. Please respond.\r\n\r\nSincerely yours,',
        stp_user_create: 'INTERFACE',
        stp_date_create: '2025/09/08 09:14:00',
      },
    ],
    measure: [
      /* 333106 "Correct a Pap Result": a pap from the BC Cancer Agency via
         Excelleris lands in Measures with no code, "See Attachment" for its
         value and one attachment (image 78135c8b shows the row's paper-clip
         count of 1). The description, the report line and the Quality
         Review message are the Record Navigator's in image ed8af8c2. Dated
         after the export's newest measure so it is the row the folder opens
         on, which is where the Navigator's click lands. */
      {
        id_measure: 'training-pap-333106',
        id_chart: '577521',
        dtm_collect_date: '2026/09/15',
        str_code: '',
        str_description: 'BCCA GYNECOLOGICAL CYTOLOGY REPORT',
        str_class: 'LAB',
        str_value: 'See Attachment',
        str_status: 'F',
        str_report: 'NOTE: SEE ATTACHED REPORT',
        str_interface: 'EXC',
        num_attachments: '1',
        stp_date_create: '2026/09/15 08:12:00',
        stp_user_create: 'INTERFACE',
      },
      /* 303353 "How To Add Specific Measures to the Chart Summary": the
         lesson's Record Filter pulls the last three INR results by code
         (str_code in ('363','31971')) or by description, and the Patient
         Summary's new "Last 3 INR Values" band shows them (`cf5e62ee…png`:
         INR IN PLATELET POOR PLASMA BY COAGULATION ASSAY, 3 rows). The export
         has no INR, so four synthetic lab results — four, so `limit 3`
         visibly drops the oldest. Code 363 on three, 31971 on one, as the
         filter's two codes suggest two lab sources for the same test. Values
         and dates are invented; all dated before the pap above. */
      ...([
        ['training-inr-1', '2026/08/26', '363', '2.6', ''],
        ['training-inr-2', '2026/07/29', '31971', '3.4', 'H'],
        ['training-inr-3', '2026/07/02', '363', '2.2', ''],
        ['training-inr-4', '2026/06/04', '363', '1.8', 'L'],
      ] as const).map(([id, date, code, value, flag]) => ({
        id_measure: id,
        id_chart: '577521',
        dtm_collect_date: date,
        str_code: code,
        str_description: 'INR IN PLATELET POOR PLASMA BY COAGULATION ASSAY',
        str_class: 'LAB',
        str_value: value,
        str_unit_type: 'NUMERIC',
        str_normal_lower: '2.0',
        str_normal_high: '3.0',
        ...(flag ? { str_abnormal: flag } : {}),
        str_status: 'F',
        str_interface: 'EXC',
        stp_date_create: `${date} 09:30:00`,
        stp_user_create: 'INTERFACE',
      })),
    ],
  },
}

/** The export with any training records for that chart merged in. */
export function withTrainingRecords(chart: string, data: MoisChartExport): MoisChartExport {
  const extra = OVERLAYS[chart]
  if (!extra) return data
  const merged = { ...data }
  for (const [group, records] of Object.entries(extra) as [MoisChartGroup | MoisOptionalGroup, MoisRecord[]][]) {
    merged[group] = [...(data[group] ?? []), ...records]
  }
  return merged
}
