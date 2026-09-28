# Build report — stream B-reports

Emulator: `the emulator`. The type check is clean for every file this stream touched. `jiti /tmp/mcov/B/check.ts` ran all 119 specs, with their defaults and with `%` in every text box, and none threw. I checked the windows in the browser, both in a standalone harness and through the real shell on the shared dev server (Reports ▸ Unresulted Orders ▸ Chart Navigator end to end).

## How it is built (read first)

- **One generic parameter window per report.** Each report is a declarative `ReportSpec` in `src/data/reportSpecs/<article>.ts`, gathered by `index.ts`. `src/screens/ReportSpecWindow.tsx` draws each spec as its own area window, `report-params-<spec.id>`. Every spec has its own caption (`Report: <Folder> - <Name>`), size, sections, fields and printed page. `provenance` cites the window and page image hashes, and `inferred` says what was reconstructed.
  - Field kinds: `section` (optionally with a control on the heading), `text` (with a "…" picker and a salmon/required fill), `range`, `select` (optionally editable, so `%` can be typed), `radio` (with an `outputs` map), `check` (with an Excel/Navigator `output` role), `list`, `note`, `rule`, `row`, `columns`.
  - Controls can be greyed with `disabledIf`.
- **What Ok does.**
  - A ticked Chart Navigator switch loads `chart-navigator` with the rows' charts. `navigatorLabel` overrides the description.
  - A ticked Excel switch, or an `excelOnly` report, opens the new **`report-excel`** window. It is an Excel-style sheet and an emulator affordance (INFERRED).
  - Otherwise the report prints into the existing **`print-preview`**.
- **The six older hand-built windows keep closing on Excel.** These are in `ReportParameterWindows.tsx` and `PatientsByProcedureWindow.tsx`. Lessons in `catalog.ts` grade them on `host.dialog == null`.
- **% wildcard (304049).** `rsLike()` in `reportSpecs/types.ts` handles blank → all, `%` → anything, `A%A`, and Contains / Begins / Ends / Equals.
  - Specs use it through `filters` (with `modeField` for a Contains/Begins With/Ends With choice) or inside their row builders.
  - It is also used by Patients by Procedure (now `%`-aware) and the Medical Report Builder's Look For.
- **"…" pickers.** `ReportPicker` (exported from ReportSpecWindow) is a list window over the parameter window. Multi-select is used for Patient Status. It is anchored `host.mois.dialog.report-picker` with rows `host.mois.row.report-pick-<slug>` and Ok `host.mois.command.report-picker-ok`. INFERRED; no picker is captured.
- **Report List routing.** `ReportListView.tsx` checks `REPORT_WINDOWS` (hand-built) first, then `reportSpecFor(folder, name)`.
- **Catalogue coverage.** 133 rows. Every row in my 16 articles opens a window. The three rows still without one are outside my articles: MSP Billing ▸ Previous MSP Messages / Previous MSP Remittance, and Recalls / Reminders ▸ Reminder List.

### Generic anchors (every spec)
| Element | Anchor |
| --- | --- |
| Window | `host.mois.dialog.report-params-<spec>` |
| Text or list field | `host.mois.field.<spec>-<field>` (list rows `-<field>-<n>`) |
| Range | `host.mois.field.<spec>-<field>-from` / `-to` |
| Drop-down | `host.mois.field.<spec>-<field>` |
| Tick box | `host.mois.command.<spec>-<field>` |
| Radio | `host.mois.command.<spec>-<field>-<option slug>` |
| "…" button | `host.mois.lookup.<spec>-<field>` |
| Ok / Cancel | `host.mois.command.<spec>-ok` / `-cancel` |

`host.screen` reports `report`, `output` (print / excel / chart-navigator), `choices` and `filled` (field ids only, never values).

The Excel sheet reports `sheet: 'excel'` and `rows`, and its grid is anchored `host.mois.field.excel-sheet`.

## 1. Per article

### 304042 Accounts - General
`reportSpecs/accountsGeneral.ts`. None of the three needed a hand-built window.

| Report | Spec id | Window / page |
| --- | --- | --- |
| Aging Report | `aging-report` | bcde4768 / 7f7e33a5 |
| Detailed Activity Report | `detailed-activity` | 10cf8bd2 / 11d8555e |
| Sales Tax Report | `sales-tax` | 3c4b4be9 / 8f764acc |

### 304043 Accounts - MSP
`reportSpecs/accountsMsp.ts`: all 16 reports, reading one shared claim list so their totals agree.

| Report | Spec id |
| --- | --- |
| Accounts Receivable | `msp-ar` |
| Accounts Receivable as of | `msp-ar-as-of` |
| Alphabetic AR | `msp-alpha-ar` |
| Billing Profile by Practitioner | `msp-billing-profile` |
| Claims Sent for Date Range | `msp-claims-sent` |
| Deletions for Deletion Date Range | `msp-deletions` |
| Explanatory Codes for Date Range | `msp-expl-codes` |
| Failed Pre-Edit and Refused | `msp-failed-refused` |
| Payment Detail for Date Range | `msp-payment-detail` |
| Payment Summary For Date Range | `msp-payment-summary` |
| Payments by Clarification Code for Date Range | `msp-pay-clarification` |
| Payments by Location for Date Range | `msp-pay-location` |
| Submission Code for Date Range | `msp-submission-code` |
| Summary by Activity Date | `msp-summary-activity` |
| Summary by Date of Service | `msp-summary-dos` |
| Writeoffs for W/O Date Range | `msp-writeoffs` |

### 304044 Accounts - Private (Inv)
`reportSpecs/accountsPrivateInv.ts`, with one shared private-invoice ledger.

| Report | Spec id |
| --- | --- |
| A/R by Practitioner for Selected Payor | `ar-by-practitioner-payor` |
| A/R Sorted by Practitioner / Payor | `ar-sorted-practitioner-payor` |
| Alphabetic A/R | `alphabetic-ar` |
| Invoice Detail | `invoice-detail` |
| Invoice Summary | `invoice-summary` |
| Invoices Written Off | `invoices-written-off` |
| Overpayment | `overpayment` |
| Statements for Overdue Range | `statements-overdue-range` (one statement per page) |

### 304045 Accounts - Private (Trans)
`reportSpecs/accountsPrivateTrans.ts`.

| Report | Spec id |
| --- | --- |
| Billing Transaction by Service Date | `billing-transaction-service-date` |
| Debit Memos for Adjustment Date Range | `debit-memos-adjustment-range` |
| Payments for Pay Date Range | `payments-pay-date-range` |
| Transaction Activity Summary | `transaction-activity-summary` |
| Transaction By Patients | `transaction-by-patients` |
| Writeoff Entries for Date Range | `writeoff-entries-date-range` |

### 304046 Bills - by Diagnosis
`reportSpecs/billsByDiagnosis.ts`: MSP → `bills-dx-msp`; Practice Private → `bills-dx-private`.

### 304047 Bills - Fee Code
`reportSpecs/billsFeeCode.ts`: MSP → `bills-fee-msp` (with a Chart Navigator tick); Practice Private → `bills-fee-private`.

### 304048 Clinical - Audits
`reportSpecs/clinicalAudits.ts`, plus `screens/reports/AuditReportWindows.tsx`.

- **Excel-only audits:** seven reports with `excelOnly` set.

  | Report | Spec id |
  | --- | --- |
  | ASTHMA (Excel) | `audit-asthma` |
  | CHF (Excel) | `audit-chf` |
  | CHRONIC KIDNEY DISEASE (Excel) | `audit-ckd` |
  | COPD Audit | `audit-copd` |
  | Diabetes (Excel) | `audit-diabetes` |
  | Hepatitis C (Excel) | `audit-hepc` |
  | HTN (Excel) | `audit-htn` |

- **Printed audits, with CSV:** Mammogram `audit-mammogram`, Number of Visits `audit-visits`, Obesity `audit-obesity`, Pap Smear `audit-pap`, Polypharmacy `audit-polypharmacy`.
- **Scorecard (AMCARE):** built by hand as window `report-params-amcare-scorecard`. It has Build Scorecard, a Previous Scorecard picker and Deficient Items → Excel.
- **Scorecard - Clinical Value:** the existing `clinical-value-scorecard`, unchanged. It matches `62706421` / `c4154ff8`.

### 304049 Clinical - Main
`reportSpecs/clinicalMain.ts`: 17 new specs.

| Report | Spec id |
| --- | --- |
| Consult Reason for Dates | `consult-reason` |
| Documents for Dates | `documents-dates` |
| Facility Admission for Dates | `facility-admission` |
| Imaging for Dates | `imaging-dates` |
| Interventions for Dates | `interventions-dates` |
| Labcodes for Dates | `labcodes-dates` |
| Measure Change Velocity | `measure-velocity` |
| Medications for Dates | `medications-dates` |
| Order Status | `order-status` (Grid always goes to Excel and greys the tick; Detail prints) |
| Patient Benefits | `patient-benefits` |
| Patient Connections | `patient-connections` |
| Prescriptions for Dates | `prescriptions-dates` |
| Reaction Risks | `reaction-risks` |
| Service Episodes by MRP | `service-episodes-mrp` (radio output; Service Phase greyed until Service Event is ticked) |
| Unresulted Orders | `unresulted-orders` (navigator reads UNRESULTED ORDER) |
| Vaccination for Dates | `vaccination-dates` (radio output) |
| Visits by Author / Date | `visits-author` |

**The % wildcard is wired everywhere a box is Contains / Begins / Ends.** The Author and Provider lists are editable so `%` can be typed.

**Hand-built windows I improved, without breaking their lessons:**
- **Age/Sex Register** now prints the AGE / SEX REGISTRY page (`f63a33b2`).
- **Patients by Age** prints LIST OF PATIENTS BY AGE RANGE AND SEX (`3a5a2015`).
- **Patients by Procedure** is now `%`-aware and prints LIST OF PATIENTS WITH SELECTED PROCEDURES (`698852ae`).

### 304050 Clinical - Pro/Obs
`reportSpecs/clinicalProObs.ts`: all 11 reports.

| Report | Spec id |
| --- | --- |
| All Consults for Reason - Multi Problems | `proobs-consults-multi` |
| Claims for Diagnosis | `proobs-claims-dx` |
| Encounter Forms | `proobs-encounter-forms` |
| Interventions | `proobs-interventions` |
| Lab Result Combinations | `proobs-lab-combos` |
| Lab Results Change Velocity | `proobs-lab-velocity` |
| Laboratory Results | `proobs-lab-results` |
| Medications | `proobs-medications` |
| Most Recent Consult | `proobs-recent-consult` |
| Visit for Provider - Multi Problems | `proobs-visit-provider` |
| Visit With Visit Code - Multi Problem | `proobs-visit-code` |

The printed page carries the parameter echo block, and Excel adds the article's extra columns.

### 304051 Dynamic Forms (reports)
`reportSpecs/dynamicForms.ts`.

| Report | Spec id |
| --- | --- |
| AEFI Duration Summary | `aefi-duration` |
| AEFI Recommendation State | `aefi-recommendation` |
| ASQ-Line List | `asq-line-list` |
| NOB Client List | `nob-client-list` |
| Number of Births by Maternal Age | `births-maternal-age` |
| Number of Births by Month | `births-by-month` |

### 304053 Practice Management
`reportSpecs/practiceManagement.ts`: 28 specs, every report except Patient List.

| Report | Spec id |
| --- | --- |
| Care Plan Audit | `care-plan-audit` |
| Consolidated Data Creation Summary by User | `data-creation-summary` |
| Consults for Refer or Seen Pract | `consults-refer-seen` |
| Consults Summary for Refer or Seen Pract | `consults-summary` |
| Daily Appointments | `daily-appointments` |
| Health Issue Summary by User | `health-issue-summary` |
| Incentive Claim Audit - Fee Code | `incentive-audit` |
| Incentive Claim Patient Registry | `incentive-registry` |
| Incentive Claim Projected Billing Schedule | `incentive-schedule` |
| Long Term Medication Entry Summary by User | `ltm-summary` |
| Messages / Tasks Audit | `messages-tasks-audit` |
| Messages for Date Range | `messages-date-range` |
| Patient Preference Settings | `patient-preference-settings` |
| Patient Registration | `patient-registration` |
| Patients by City | `patients-by-city` |
| Patients by Service Center | `patients-by-service-center` |
| Reaction Risk Summary by User | `reaction-risk-summary` |
| Statistics - Avg Diag Code / Encounter | `avg-diag-encounter` |
| Visit Audit - Diagnostic or Fee Code | `visit-audit` |
| Visit Mode / Code / Status | `visit-mode-code-status` |
| Visit Status | `visit-status` |
| Visit Status - Bill / Note Status | `visit-bill-note-status` |
| Visits-Attend/Appt/Ins | `visits-attend-appt-ins` |
| Visits-Attend/Ins/Service Anon | `visits-attend-ins-service-anon` |
| Visits-Attend/Insurer/Service Code | `visits-attend-insurer-service` |
| Visits-Attend/Visits/Ins | `visits-attend-visits-ins` |
| Wait List - Booking Summary | `wait-list-booking` |
| Wait List Summary | `wait-list-summary` |

- **Incentive Claim reports:** the Report Output radio is wired. CSV File goes to Excel; Process List loads the Chart Navigator (INFERRED).
- **Patient List (hand-built):** it now prints PATIENT LIST AS OF … (`299f5d11`) when CSV is unticked. Chart Range filters and is anchored `rp-chart-from` / `rp-chart-to`.

### 304054 Practice Management - Access
`reportSpecs/practiceAccess.ts`, plus `screens/reports/AccessReportWindows.tsx`.

- **Advance Appointment Search:** hand-built window `report-params-advance-appt-search`, captioned "Appointment Search", with the results grid. It reads the day book read-only.
- **Excel-only pivot reports:** Same or Next Day Appts `same-next-day`, Third Soonest Appt `third-soonest`, Wait/Appt Duration `wait-appt-duration`. The sheet's header row is the slice dates.

### 304055 Report Builders
**Advanced Medical Report Builder** (`screens/ReportBuilderWindow.tsx`, rewritten; data in `data/reportParams.ts`):
- **List window**
  - Business Unit section (INFERRED).
  - Clone and Delete ask for confirmation.
  - Delete removes this unit's access to another Business Unit's Limited report instead of deleting it.
  - Visibility follows the Access Level: Private is owner only, Limited is Business Unit only, Public is everyone.
- **Editor**
  - Both tab rows are built, and the selected row moves next to the page (as the captures show).
  - The remaining criteria tabs are built from their captures: Encounters, Connections, Alias ID, Order, Preference, Risk for Cond., MAR. The Medications, Imaging, Procedures, Consults, Admissions and Interventions tabs were corrected to their captures.
  - Rule rows count on their tab (`(n)`); Encounters shows `*`.
  - "Patient has at least X" (INFERRED).
  - One shared Limited-investigation lookback across all tabs.
  - Concept "…" pickers.
- **Save Changes**
  - Refuses a duplicate name and a non-owner changing the Access Level.
  - Writes Change History.
- **Other options ▸ Change History Review / Run History Review ▸ Go:** read-only history windows.
- **Outputs**
  - Report → Print Preview; CSV → Excel sheet; Mail Merge → Chart Navigator.
  - **Extended** opens the Extended Output window (INFERRED): pick data elements, then Generate CSV.
  - Every output is recorded in Run History.

**Cohort Selection Tool** (`screens/ReportBuilderTools.tsx`, window `cohort-selection-tool`):
- Templates pane with Delete / Export / Import, and Clear / Save.
- Include patients with …; exclude procedures; exclude preferences; the None / At least one grid.
- Output as: Printable Report, Excel or Chart Navigator. Run Report sends to the chosen one.

**Medical Report Builder** (same file, window `medical-report-builder`):
- Templates grid, Patient Characteristics, and Report Criteria (ITEM / LOOK FOR / WHERE IN / WHEN TO CONSIDER).
- Toolbar: New Report / Delete Report / Save / Run Report / Run Report (CSV Output) / Close Window.
- Printed page per `7ce67333`.

Both rows are wired in `REPORT_WINDOWS`.

### 304056 Security / Access Audit
`reportSpecs/securityAudit.ts`: Chart Access `chart-access` (Chart No. "…" gives a patient list), User Access `user-access`, User Profile Report `user-profile`.

### 304021 Edit User Roles for Accessing Reports
New `screens/ReportAccessPane.tsx`, wired into `UserAccountWindow.tsx` for the user-level `Report Access` tab, which was previously an empty page. It is transcribed from `9ca90685`:
- The 16 folders are bands; expanding one shows its reports with `☐ Override` and `☐ Access / Print`.
- Access / Print is greyed ("blocked off") and shows the profile's value until Override is ticked. Clearing Override reverts to the profile value.
- Apply Changes / Cancel are the window's existing footer.

The profile-level tab in `UserAccessTabs.tsx` is untouched; it belongs to another stream.

### 303386 Scorecard Export
New `screens/AmcareScorecardView.tsx`, routed from `ExchangeView.tsx` as `dx-amcare` (Data Exchange ▸ Scorecard Export ▸ AMCARE). It is transcribed from `64d96ee8`:
- Run / Previous Scorecard... / Close Window.
- Version 1 / Version 2; As of Date, enabled only for Version 1.
- Provider: Current Desktop / ALL Providers; ☑ Clinical Value Items.
- Folder with Browse....

What it does:
- **Run** prints the scorecard (`cb362e46` layout, plus a Clinical Value page) and files the run.
- **Previous Scorecard...** opens window `amcare-previous-scorecards` (Open Report / Open XML / Close).
- **Open XML** opens `amcare-xml`, an XML view with each provider's practitioner number.

## 2. Deliberately left out
- **The three catalogue rows outside my articles** (MSP Billing Previous Messages / Remittance, Reminder List).
- **Rewriting the six hand-built windows' Excel behaviour.** They still close, because their lessons check `host.dialog == null`. The generic windows open the Excel sheet instead.
  - Their defaults (Age/Sex CSV ticked, Patient List CSV ticked, blank Patient Status and so on) also stay, even where a newer capture differs, for the same reason.
- **Catalogue `desc: null` rows.** The article texts do give one-line purposes, but `reportCatalogue.ts` says not to invent rendered descriptions, so they stay null.
- **The profile-level Report Access tab** (UserAccessTabs.tsx, another stream's).
- **The Report Builder's "Change History" button.** 304055 says "Click Change History, or select Change History Review from the menu beside Go", but no capture shows a button, so only the menu path exists.
- **Diagnosis / Fee problem boxes** still don't filter the sample rows by text. Its page layout is kept, as a tutorial grades it.

## 3. INFERRED (beyond each spec's own `inferred` note)
- The `report-excel` sheet window.
- The "…" picker window.
- The ARB Business Unit section, confirmation messages, Run/Change History windows, Extended Output, "Patient has at least X", Measures comparison operators and Check Against, and the concept lists.
- The Cohort output list and export/import dialogs.
- The Medical Report Builder template contents and matching logic.
- The AMCARE previous-scorecards window, XML schema and Browse list.
- Report Access profile grants (all folders except Security / Access Audit and MSP Billing).
- **Salmon fields.** Several sub-agents found that salmon usually marks the focused field, not a required one. Specs set `required` only where the text says a field is mandatory.

## 4. Tutorial-authoring notes
- **Run any report:** Reports module → expand `host.mois.group.<folder>` → double-click `host.mois.row.<report slug>`. Replay with `host.mois.openUtility { window: 'report-params-<spec id>' }`.
  - The row slug is `pbSlug(name)`. A name two folders share (Bills ▸ MSP / Practice Private) takes the folder as a prefix: `host.mois.row.bills-by-diagnosis-msp`, `host.mois.row.bills-fee-code-practice-private`.
- **% wildcard lesson:**
  - `report-params-medications-dates`: fill `host.mois.field.medications-dates-med1` with `%` or `A%A`, choose `…-med1Mode`, then press `medications-dates-ok`.
  - Or `report-params-visits-author`: type `%` into the editable Author field.
- **Report Builder:** existing anchors are kept (`arb-new`, `arb-name`, `arb-<tab>-concept-1`, `-check-1`, `arb-save`, `arb-report`, `arb-mail-merge`; `builderRules` keeps its format).
  - New fields: `arb-<tab>-<column>-1` (for example `arb-connections-role-1`, `arb-order-type-1`, `arb-mar-code-1`, `arb-alias-id-code-1`).
  - Encounters: `arb-encounters-when|at-least|no-more|visit-codes|appt-status|diagnoses|service-codes`.
  - New commands: `arb-encounters-have|not`, `arb-encounters-visit-count`, `arb-<tab>-all`, `arb-<tab>-limit`, `arb-<tab>-csv-1`, `arb-other` plus `arb-go`, `arb-history-close`, `arb-extended`, `arb-extended-<item>`, `arb-extended-generate`, `arb-confirm-yes|no`, `arb-add-business-unit`.
  - Screen state: `builderEncounters`, `builderHistory`, `builderMessage`, `builderExtended`.
- **Cohort** (window `cohort-selection-tool`):
  - Fields: `host.mois.field.cohort-subject|provider|status|last-contact|age-from|age-to|gender|condition|output`, plus `cohort-proc-*-n`, `cohort-pref-*-n`, `cohort-incl-*-n`.
  - Commands: `cohort-folder-*`, `cohort-include-none|at-least-one`, `cohort-clear|save|delete|export|import|run|cancel`.
  - Template rows: `host.mois.row.cohort-template-<slug>`.
- **Medical Report Builder** (window `medical-report-builder`):
  - Buttons: `mrb-new|delete|save|run|run-csv|close`.
  - Rows: `host.mois.row.mrb-<slug>`.
  - Fields: `mrb-problem`, `mrb-look-<item>`, `mrb-where-<item>`, `mrb-when-<item>`.
- **Report Access** (Administration ▸ User Accounts ▸ Edit ▸ tab `host.mois.tab.report-access`):
  - Expand `host.mois.group.<folder>`.
  - Tick `host.mois.command.report-override-<folder>-<report>`, then `host.mois.command.report-access-<folder>-<report>`.
  - Screen: `reportAccessCell`, `reportAccessChecked`, `reportOverrides`.
- **Scorecard Export** (tree node `dx-amcare`):
  - Commands: `host.mois.command.run`, `previous-scorecard`, `amcare-version-1|2`, `amcare-provider-current-desktop|all-providers`, `amcare-clinical-value-items`, `amcare-browse`.
  - Fields: `amcare-as-of-date`, `amcare-folder`.
  - Windows: `amcare-previous-scorecards` (`amcare-open-report|open-xml|close`) and `amcare-xml`.
- **Per-report non-obvious anchors** are listed in the sub-agent notes above. Examples: `aging-report-reportBy-individual-claims-…`, `order-status-layout-detail-rows-by-status-change`, `incentive-registry-output-csv-file`, `advance-appt-search-search`, and `chart-access-chart` lookup.
