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
