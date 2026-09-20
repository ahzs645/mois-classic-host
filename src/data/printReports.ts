/* ============================================================================
   MOIS's printing: the Selection Parameter dialogs and the reports they make.

   MOIS prints in two stages. A Print-menu item opens a **Selection Parameter**
   window — a grey band, navy section headings, a handful of fields and an
   Ok / Cancel pair — and Ok opens a **Richtext Report** window, an editable
   RTF preview with Print / Print and Attach / Fax / Cancel across the top.

   Transcribed from the one flow the help site captures end to end on a single
   build (v02.30.22): `PrintInterventionsList_image1.png` (the Print menu),
   `PrintInterventionsList_SelectedParams_image2.png` (the dialog) and
   `PrintInterventionsList_SelectedParams_image3.png` (the output). The
   medications dialog is `patient_chart/long_term_meds/active.PNG`; its report
   body is **not** captured anywhere, so its page is modelled on the sibling
   prescriptions report in `Common Window/print_1.png` and is marked below.

   The page bodies are monospace, the way MOIS renders them (Lucida Console).
   Patients and values are synthetic training data.
   ========================================================================= */

export type PrintField =
  | { kind: 'section'; label: string }
  | { kind: 'text'; label: string; value?: string; width?: number }
  | { kind: 'check'; label: string; checked?: boolean }

export type PrintReport = {
  /** the Print-menu item that opens it */
  menu: string
  /** the Selection Parameter window's title bar */
  title: string
  fields: PrintField[]
  /** the Richtext Report window's title bar, after "Richtext Report: " */
  reportTitle: string
  /** the page, verbatim in layout; `captured: false` means the body is modelled */
  captured: boolean
  page: string
}


export const printReports: PrintReport[] = [
  {
    menu: 'Interventions for Patient',
    title: 'Patient Interventions Report',
    fields: [
      { kind: 'section', label: 'Performed Date Range (INCLUSIVE)' },
      { kind: 'text', label: 'From:', value: '2025.01.01', width: 100 },
      { kind: 'text', label: 'To:', value: '2026.03.18', width: 100 },
      { kind: 'section', label: 'Description' },
      { kind: 'text', label: 'Includes:', value: '', width: 260 },
      { kind: 'text', label: 'Excludes:', value: '', width: 260 },
    ],
    reportTitle: 'Patient Intervention Report',
    captured: true,
    page: `HALLIWELL MEDICAL CLINIC                                                            Page 1
                            PATIENT INTERVENTIONS AS OF 2026/03/18
                               PERIOD 2025/01/01 TO 2026/03/18
                       DESCRIPTION - INCLUDES: <ALL> - EXCLUDES: <NONE>
%RULE%
PATIENT  : DIABETES, BETTY                                      DOB: 1955-05-04  SEX: F
INS NO.  : BC   111222333444      00                         CHART:  10018
INTERVENTIONS
DATE       PERFORMED BY         INTERVENTION                                    DEC  N.IND
%RULE%
2025-04-02 BEARDWOOD, W         COUNSELING - SMOKING CESSATION
2025-09-17 SHEWCHUK, LEAH       DIABETIC FOOT EXAMINATION
2025-11-28 SHEWCHUK, LEAH       INFLUENZA VACCINE OFFERED                       Y
2026-03-04 BEARDWOOD, W         COLORECTAL SCREENING DISCUSSED                       Y
DEC = DECLINED   N.IND = NOT INDICATED`,
  },
  {
    menu: 'Medications for Patient',
    title: 'Patient Long Term Medications Report',
    fields: [
      { kind: 'section', label: 'Stopped Medications' },
      { kind: 'check', label: 'Show Stopped Medications', checked: false },
    ],
    reportTitle: 'Patient Long Term Medication Report',
    captured: true,
    page: `HALLIWELL MEDICAL CLINIC                                                            Page 1
PATIENT LONG TERM MEDICATION LIST AS OF 2026/03/18
%RULE%

PATIENT  : DIABETES, BETTY                                      DOB: 1955-05-04  SEX: F
INS NO.  : BC   111222333444      00                         CHART:  10018
REACTION RISK
START      SUBSTANCE                                REACTION(S)
%RULE%
2008-04-06 PENICILLIN                               UNSPECIFIED
MEDICATION
START      END        MEDICATION                                DOSE / FREQ     INDICATION
%RULE%
                      CBGM STRIPS
                      BLISTER PACK ALL MEDICATIONS
2024-06-03            METFORMIN HYDROCHLORIDE 500 MG TABLET     bid
2023-02-11            RAMIPRIL 5 MG CAPSULE                     daily
2025-09-17            ATORVASTATIN 20 MG TABLET                 1 tab at hs`,
  },
  /* ------------------------------------------------------------------------
     The nine reports below back the chart print-flow lessons. Their Selection
     Parameter windows are transcribed from the help site's captures (titles,
     navy section headings and checkbox captions verbatim, including the
     `Include Report Detail` / `Include Detail Reports` split between Radiology
     and Admissions). None of their report *bodies* is captured anywhere, so
     every page here is modelled on the two captured siblings above and is
     marked `captured: false`.

     The first three have no Selection Parameter window at all — the Print menu
     goes straight to the preview — so their `fields` are empty and the lessons
     only ever ask for `stage: 'report'`.
     --------------------------------------------------------------------- */
  {
    menu: 'Problem List for Patient',
    title: 'Patient Problem List Report',
    fields: [],
    reportTitle: 'Patient Problem List Report',
    captured: false,
    page: `HALLIWELL MEDICAL CLINIC                                                            Page 1
                             PATIENT PROBLEM LIST AS OF 2026/03/18
%RULE%
PATIENT  : DIABETES, BETTY                                      DOB: 1955-05-04  SEX: F
INS NO.  : BC   111222333444      00                         CHART:  10018
HEALTH ISSUES
ONSET      CODE        DESCRIPTION                                        STATUS
%RULE%
2008-04-06 250.00      DIABETES MELLITUS TYPE 2                           ACTIVE
2014-11-02 401.9       HYPERTENSION, ESSENTIAL                            ACTIVE
2019-07-15 272.0       HYPERCHOLESTEROLEMIA                               ACTIVE
2021-03-30 715.90      OSTEOARTHRITIS                                     INACTIVE`,
  },
  {
    menu: 'Family History (Hx) for Patient',
    title: 'Patient Family History Report',
    fields: [],
    reportTitle: 'Patient Family History Report',
    captured: false,
    page: `HALLIWELL MEDICAL CLINIC                                                            Page 1
                           PATIENT FAMILY HISTORY AS OF 2026/03/18
%RULE%
PATIENT  : DIABETES, BETTY                                      DOB: 1955-05-04  SEX: F
INS NO.  : BC   111222333444      00                         CHART:  10018
FAMILY HISTORY
RECORDED   RELATION             CONDITION                                  AGE ONSET
%RULE%
2009-01-12 MOTHER               DIABETES MELLITUS TYPE 2                   52
2009-01-12 FATHER               MYOCARDIAL INFARCTION                      61
2016-05-20 SISTER               BREAST CANCER                              47`,
  },
  {
    menu: 'Social History for Patient',
    title: 'Patient Social History Report',
    fields: [],
    reportTitle: 'Patient Social History Report',
    captured: false,
    page: `HALLIWELL MEDICAL CLINIC                                                            Page 1
                      PATIENT SOCIAL HISTORY / RISK AS OF 2026/03/18
%RULE%
PATIENT  : DIABETES, BETTY                                      DOB: 1955-05-04  SEX: F
INS NO.  : BC   111222333444      00                         CHART:  10018
SOCIAL HISTORY / RISK
RECORDED   CATEGORY             DETAIL
%RULE%
2025-11-28 SMOKING              FORMER SMOKER - QUIT 2019/04
2025-11-28 ALCOHOL              OCCASIONAL, UNDER 5 DRINKS PER WEEK
2024-02-14 OCCUPATION           RETIRED SCHOOL ADMINISTRATOR
2024-02-14 LIVING SITUATION     LIVES WITH SPOUSE`,
  },
  {
    menu: 'Radiology Reports for Patient',
    title: 'Patient Radiology Report',
    fields: [
      { kind: 'section', label: 'Performed Date Range (INCLUSIVE)' },
      { kind: 'text', label: 'From:', value: '2025.01.01', width: 100 },
      { kind: 'text', label: 'To:', value: '2026.03.18', width: 100 },
      { kind: 'check', label: 'Include Report Detail', checked: true },
    ],
    reportTitle: 'Patient Radiology Report',
    captured: false,
    page: `HALLIWELL MEDICAL CLINIC                                                            Page 1
                            PATIENT RADIOLOGY AS OF 2026/03/18
                               PERIOD 2025/01/01 TO 2026/03/18
%RULE%
PATIENT  : DIABETES, BETTY                                      DOB: 1955-05-04  SEX: F
INS NO.  : BC   111222333444      00                         CHART:  10018
IMAGING
PERFORMED  MODALITY   DESCRIPTION                               ORDERED BY
%RULE%
2025-06-11 XR         CHEST - PA AND LATERAL                    BEARDWOOD, W
  REPORT : No focal consolidation. Heart size within normal limits. No
           pleural effusion. Impression: no acute cardiopulmonary disease.
2026-01-22 US         ABDOMEN - COMPLETE                        SHEWCHUK, LEAH
  REPORT : Hepatic echotexture mildly increased, consistent with steatosis.
           Gallbladder without stones. Impression: hepatic steatosis.`,
  },
  {
    menu: 'Consultations for Patient',
    title: 'Patient Consultations Report',
    fields: [
      { kind: 'section', label: 'Date Range (INCLUSIVE)' },
      { kind: 'text', label: 'From:', value: '2025.01.01', width: 100 },
      { kind: 'text', label: 'To:', value: '2026.03.18', width: 100 },
      { kind: 'section', label: 'Select Report Content' },
      { kind: 'check', label: 'Consultations: with detail reports', checked: true },
    ],
    reportTitle: 'Consultations for Patient',
    captured: false,
    page: `HALLIWELL MEDICAL CLINIC                                                            Page 1
                           PATIENT CONSULTATIONS AS OF 2026/03/18
                               PERIOD 2025/01/01 TO 2026/03/18
%RULE%
PATIENT  : DIABETES, BETTY                                      DOB: 1955-05-04  SEX: F
INS NO.  : BC   111222333444      00                         CHART:  10018
CONSULTATIONS
DATE       SPECIALTY            CONSULTANT                      REASON
%RULE%
2025-08-19 ENDOCRINOLOGY        DR. A. PEDIATRICIAN             GLYCEMIC CONTROL
  REPORT : HbA1c 8.4%. Recommend addition of a second oral agent and
           quarterly review. Foot examination unremarkable.
2026-02-03 OPHTHALMOLOGY        DR. M. MCPHILLIPS               RETINAL SCREENING
  REPORT : No retinopathy. Repeat screening in twelve months.`,
  },
  {
    menu: 'Procedure List for Patient',
    title: 'Patient Procedures Report',
    fields: [
      { kind: 'section', label: 'Performed Date Range (INCLUSIVE)' },
      { kind: 'text', label: 'From:', value: '2025.01.01', width: 100 },
      { kind: 'text', label: 'To:', value: '2026.03.18', width: 100 },
      { kind: 'check', label: 'Include Report Detail', checked: true },
    ],
    reportTitle: 'Patient Procedure Report',
    captured: false,
    page: `HALLIWELL MEDICAL CLINIC                                                            Page 1
                            PATIENT PROCEDURES AS OF 2026/03/18
                               PERIOD 2025/01/01 TO 2026/03/18
%RULE%
PATIENT  : DIABETES, BETTY                                      DOB: 1955-05-04  SEX: F
INS NO.  : BC   111222333444      00                         CHART:  10018
PROCEDURES
PERFORMED  PERFORMED BY         PROCEDURE                                 OUTCOME
%RULE%
2025-05-07 BEARDWOOD, W         COLONOSCOPY                               COMPLETE
  REPORT : Two diminutive polyps removed from the sigmoid colon. Repeat in
           five years.
2025-10-14 SHEWCHUK, LEAH       SKIN LESION EXCISION - LEFT FOREARM       COMPLETE`,
  },
  {
    menu: 'Facility Admission for Patient',
    title: 'Patient Admissions Report',
    fields: [
      { kind: 'section', label: 'Discharge Date Range (INCLUSIVE)' },
      { kind: 'text', label: 'From:', value: '2025.01.01', width: 100 },
      { kind: 'text', label: 'To:', value: '2026.03.18', width: 100 },
      { kind: 'check', label: 'Include Detail Reports', checked: true },
    ],
    reportTitle: 'Patient Admission Report',
    captured: false,
    page: `HALLIWELL MEDICAL CLINIC                                                            Page 1
                       PATIENT FACILITY ADMISSIONS AS OF 2026/03/18
                               PERIOD 2025/01/01 TO 2026/03/18
%RULE%
PATIENT  : DIABETES, BETTY                                      DOB: 1955-05-04  SEX: F
INS NO.  : BC   111222333444      00                         CHART:  10018
FACILITY ADMISSIONS
ADMITTED   DISCHARGED  FACILITY                        MOST RESPONSIBLE
%RULE%
2025-07-02 2025-07-05  UNIVERSITY HOSPITAL OF NBC      BEARDWOOD, W
  REPORT : Admitted with cellulitis of the left lower leg. Treated with
           intravenous antibiotics. Discharged on oral cephalexin.`,
  },
  {
    menu: 'MAR History',
    title: 'Report: Patient MAR History',
    fields: [
      { kind: 'section', label: 'Administration Date Range (INCLUSIVE)' },
      { kind: 'text', label: 'From:', value: '0000.00.00', width: 100 },
      { kind: 'text', label: 'To:', value: '0000.00.00', width: 100 },
      { kind: 'section', label: 'Records' },
      { kind: 'text', label: 'Concept:', value: '', width: 260 },
    ],
    reportTitle: 'Patient MAR History',
    captured: false,
    page: `HALLIWELL MEDICAL CLINIC                                                            Page 1
                            PATIENT MAR HISTORY AS OF 2026/03/18
%RULE%
PATIENT  : DIABETES, BETTY                                      DOB: 1955-05-04  SEX: F
INS NO.  : BC   111222333444      00                         CHART:  10018
MEDICATION ADMINISTRATION RECORD
GIVEN            MEDICATION                          DOSE      SITE    GIVEN BY
%RULE%
2025-11-28 10:14 INFLUENZA VACCINE (QUAD)            0.5 ML    L DELT  SHEWCHUK, LEAH
                 LOT 4471B  EXP 2026-06-30
2025-11-28 10:20 PNEUMOCOCCAL 23-VALENT              0.5 ML    R DELT  SHEWCHUK, LEAH
                 LOT 9920C  EXP 2027-01-31
2026-02-11 09:02 VITAMIN B12 CYANOCOBALAMIN          1000 MCG  L GLUT  BEARDWOOD, W`,
  },
  {
    menu: 'Clinical History Segment',
    title: 'Patient Clinical History - Segmented',
    fields: [
      { kind: 'section', label: 'Date Range (INCLUSIVE)' },
      { kind: 'text', label: 'From:', value: '2025.01.01', width: 100 },
      { kind: 'text', label: 'To:', value: '2026.03.18', width: 100 },
      { kind: 'check', label: 'ALL Records (including items w/o a date)', checked: false },
      { kind: 'section', label: 'Sections' },
      { kind: 'check', label: 'Health Issues', checked: true },
      { kind: 'check', label: 'Long Term Medications', checked: true },
      { kind: 'check', label: 'Reaction Risks', checked: true },
      { kind: 'check', label: 'Encounters', checked: false },
    ],
    reportTitle: 'Patient Clinical History',
    captured: false,
    page: `HALLIWELL MEDICAL CLINIC                                                            Page 1
                      PATIENT CLINICAL HISTORY AS OF 2026/03/18
                               PERIOD 2025/01/01 TO 2026/03/18
%RULE%
PATIENT  : DIABETES, BETTY                                      DOB: 1955-05-04  SEX: F
INS NO.  : BC   111222333444      00                         CHART:  10018
HEALTH ISSUES
ONSET      DESCRIPTION                                                    STATUS
%RULE%
2008-04-06 DIABETES MELLITUS TYPE 2                                       ACTIVE
2014-11-02 HYPERTENSION, ESSENTIAL                                        ACTIVE
LONG TERM MEDICATIONS
START      MEDICATION                                DOSE / FREQ
%RULE%
2024-06-03 METFORMIN HYDROCHLORIDE 500 MG TABLET     bid
2023-02-11 RAMIPRIL 5 MG CAPSULE                     daily
REACTION RISKS
START      SUBSTANCE                                REACTION(S)
%RULE%
2008-04-06 PENICILLIN                               UNSPECIFIED`,
  },
]

export const printReportByMenu = (menu: string): PrintReport | undefined =>
  printReports.find((r) => r.menu === menu)
