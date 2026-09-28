# Build report — A2-billing-programs (LFP / PBF / PCPC / PAS)

Emulator: hosts/mois-classic. Type-check: my files are clean (`npx tsc -p tsconfig.json --noEmit`; the remaining errors are in other streams' files). Smoke-tested in a private Vite server with Playwright; screenshots are in /tmp/mcov/a2shots/.

## Time Logger / Time Entry window ids (for stream D, the Scheduler)
- `time-logger`: the Time Logger. Args `{ provider?, date? }`.
- `time-entry`: Time Management, i.e. MOIS's "Time Entry (Ctrl+Shift+T)". Args `{ provider?, date?, pick? }`.
- `time-entry-edit`: the Time Entry daily edit grid, opened by Edit Entries.
- `lfp-time-claims`: Time Claims, with the Time Claim Wizard and the duplicate prompt.

With no args, these windows take the Scheduler's current provider and day (`schedulerStore.current`); failing that, the first LFP-registered provider on 2026.08.11.

Stream D should add these to the Scheduler Utilities menu:
- `{label:'Time Entry', key:'Ctrl+Shift+T', onSelect: open('time-entry')}`
- `{label:'Time Logger', key:'Ctrl+Shift+L', onSelect: open('time-logger')}`

I added the same two items to Administration ▸ Utilities (3295289 `00c2fa04`).

## New files
- src/data/billingPrograms.ts: the one session store for LFP, PBF and PAS, and it also holds:
  - the MSP hooks `prepareBills()` / `reconcile()`;
  - DEACON's `deaconRun`;
  - the PCPC validator `pcpcClaimCheck`.
- src/screens/billingProgramsKit.tsx: shared helpers:
  - FilterGroup, RadioSet, Field, ScreenDialog, Ask, CellLink, CellButton;
  - `useUnsentSink`, which calls A1's `useUnsentClaims().add`.
- src/screens/LfpViews.tsx: LFP Setup, Provider Registration and Provider Time Summary. Windows:
  - screen window `lfp-provider-profile`;
  - area window `lfp-update-registration`.
- src/screens/LfpTimeWindows.tsx: the four time windows listed above.
- src/screens/PbfViews.tsx: the dashboard, Patient Enrollment, Eligibility, Enrollment CR, the Unsent / Unack / Failed claim lists, MSP CR Review, History, PCPC Calculator and PBF Setup.
- src/screens/PbfWindows.tsx:
  - screen windows `pbf-enrolment-claim`, `pbf-benefit-plan`, `pbf-bypass`, `pbf-change-provider`, `pbf-eligibility-new`, `pbf-msp-cr-detail`, `pcpc-load-previous`, `pcpc-report`;
  - area window `pbf-enrolment-history`.
- src/screens/PasViews.tsx: Patient Changes and Panel Review.
- src/data/menus/billing-programs.ts: the Patient Enrollment Action menu: By-Pass Registration Process to... ▸ Enroll a Patient / Unenroll a Patient, and Change Desktop Provider.

## Small edits to shared files
- BillingAdminView.tsx:
  - dispatches the program views above;
  - new props `onClose`, `onOpenNode`, `onOpenChart`;
  - re-registers the windows and menus.
- MoisClassicShell.tsx:
  - `useState(() => resetBillingPrograms())`;
  - passes those three props to BillingAdminView. `onOpenChart` selects the patient, then opens `summary`.
- data/billingAdmin.ts: route entries for `bl-pbf` (the dashboard) and `bl-pbf-config`.
- data/mois.tsx: new tree node `bl-pbf-config` "PBF Configuration", last in the PBF folder.
- data/menus/register.ts: imports billing-programs. data/menus/admin.ts: Time Entry and Time Logger items.
- data/patient-edits.ts: new `editedCharts()`.
- data/deacon.ts: the two MSP - LFP PATIENT PANEL functions now have their descriptions and parameters from the captures.
- DeaconWindow.tsx:
  - non-provider parameters are text boxes;
  - Run calls `deaconRun`: an error box, or the result shown in the existing prompt;
  - created claims go to Unsent Claims.
- MspExchangeViews.tsx: Prepare Bills ▸ Run also calls `billingPrograms.prepareBills()`; Reconcile Remittance ▸ Run also calls `billingPrograms.reconcile()`.
- BillingViews.tsx (A1's file; minimal hook, re-read right before editing) adds the PCPC in-basket check to the Unsent MSP window. It:
  - shows "BC PCPC ENROLLED" beside Service Date;
  - on Save, raises a "BC PCPC" warning box and marks the claim Incomplete;
  - sets Pay Mode to Alternate for an enrolled patient's 96198 claim.

## 1. What was built, by article
- **3166420 LFP Payment Model**
  - LFP Setup is editable and saves: Activate, Enable Time Claim Wizard, Payor Codes, Diagnosis, and the Location boxes.
  - Provider Registration:
    - the filters work, with the banded header and the status legend;
    - double-click a row (or Enroll/Register) → Provider Profile - LFP Registration Information, which holds Payment Mode, the MSP fields and the claim summary;
    - Update Enrollment/Registration → the Update dialog; Continue → Pending Submission.
  - MSP round trip: Data Exchange Prepare Bills → Refresh shows Pending Approval; Reconcile → Refresh shows Current.
  - The Time Logger works: Start/Stop Timer and Review Day.
  - Time Management works:
    - Punch-In / Punch-Out, rounding and an overlap check;
    - the day grid with the Appt / ICBC / WorkSafe / Out of Prov columns, and a red rule on an entry that overlaps a Fee For Service appointment;
    - Big / Small view, the totals, and Create Claims.
  - Time Entry edit grid: claimed entries are locked.
  - Time Claims:
    - the Wizard, with every option including "first patient of the day";
    - Create Claims makes unsent claims for the LFP Time Patient (TIME, LFP, PHN 9646191917).
  - The Provider Time Summary's Time Frame filters work; New Entry and double-click open Time Management.
- **3852837 LFP FAQ**
  - With "Alert me when there is a duplicate claim" ticked, a duplicate prompt appears. The check matches provider, date, fee and units, never the times. Yes → submission code D.
  - The seed data is the article's own example: BEARDWOOD, WALTER on 2026.08.11 has two 13-unit 98010 blocks.
  - Correcting an already-failed claim (Options – Sub Code) happens in A1's claim window, which has a Sub Code drop-down.
- **3295289 Bulk panel registration (DEACON)**
  - Create bulk: parameters are Service Provider, Patient Status, Last Contact As Of and Mode C/R.
    - C creates 98990 unsent claims under an MSP Batch ID and adds them to Unsent Claims.
    - R reviews only.
  - Undo / delete by MSP Batch ID; an error when the batch is not an LFP.PANEL one.
  - The Bulk Claim Creation Wizard is A1's (303601); I did not build it.
- **3788178 PAS**
  - Patient Changes renders and works: the date range, provider, New/Changed ticks and panel status filters, with Refresh.
  - The PAS Registration column has Register (creates a 98990 unsent claim) and Unregister (marks the claim deleted) links. INFERRED.
  - Panel Review: provider + status, Refresh.
- **2257761 PBF and 2258278 PBF Administrator**
  - The dashboard (the PBF Management folder itself). Clicking a line opens its folder.
  - Patient Enrollment: working filters; Edit or double-click → Edit Benefit Plan, where overriding the start/stop dates is recorded in History.
    - Change Service Provider, Print, CSV and Chart Navigator.
    - Action ▸ By-Pass Enroll / Unenroll.
  - Eligibility:
    - New/Delete/Open Chart/Refresh;
    - Prepare Bills → SUBMITTED; Reconcile → PROCESSED.
  - Enrollment CR:
    - Refresh also pulls in BC-PBF requests made on charts' Benefits tabs;
    - ✓ approve / ⃠ reject / ↶ undo, following the article's rules;
    - undo is blocked once the claim has been sent;
    - Detail and Tear Off.
    - An approval writes back to the chart's benefit record: Approved → Submitted → Registered.
  - Unsent claims: Delete (the change request goes back to Requested) and Edit (the claim window with plan start/stop and Refresh Patient Data).
  - Unack claims: a read-only claim window.
  - Failed claims: explanatory codes via […] or Ctrl+E open the existing Sent Claim Detail window; Resubmit (makes a new linked unsent claim) and Accept.
  - MSP CR Review:
    - Records Type, time frame and Other filters;
    - Detail / Delete / Replay. Replay re-matches against the current data, so a by-pass enrolment and then Replay succeeds.
  - Enrollment Claim History: filters, double-click opens the claim.
  - PBF Setup (configuration): every field, payees New/Delete, Save.
  - PCPC Calculator: see 2401462.
- **1776677 BC PCPC**
  - The settings already existed in System Settings (Global "Service Code PCPC" and the four Protected rows); the provider PCPC code is E1's provider editor.
  - Added: the 96198 in-basket validation (non-enrolled 96198 blocked; enrolled In-Basket code warned and Incomplete; Location E, WCB or ICBC override), gated on PBF Setup ▸ Activate.
- **2401462 Complexity Index Calculator**
  - All options work: Other shows Patient Status and Last Contact; Limit Number of Charts takes a count.
  - Run Calculator:
    - Printable Report → `pcpc-report`;
    - Chart Navigator → opens `chart-navigator`;
    - MoH File and CSV File → a message.
  - Load Previous Results → a list of runs; OK loads the run into the chosen output. It refuses a Desktop Provider run when All is chosen.

## 2. Deliberately left out
- Bulk Claim Creation Wizard; the unsent/sent claim windows beyond the PCPC hook (A1).
- Provider editor Billing tab Payment Mode, and the User Account Module/Window Access (E1 / admin). The LFP profile window does carry a Payment Mode drop-down.
- Chart Navigator internals. It opens with its own fixed rows; the `charts` arg is passed but ignored.
- MSP Registry Audit stays a placeholder (no capture, no article).
- Scheduler Utilities menu items (stream D).
- The ICBC / WCB / Out of Province LFP interplay is only displayed, as the Time Management summary columns.

## 3. INFERRED
- The LFP registration claim codes 98000–98005.
- How Pending Submission is drawn (a greyed ✓*).
- The Payment Mode option "Fee For Service (MSP)".
- The Provider Time Review's In the Last / Range fields and MSP Billing Status wording.
- Timer semantics (at least 15 minutes).
- The Time Entry row icons.
- The hidden Time Claims columns (Patient, Duration of FFS Appts).
- The duplicate prompt's wording.
- The LFP Time Patient's chart number (99990).
- Windows with no capture:
  - By-Pass, Change Service Provider, New Eligibility, MSP CR Detail;
  - History, Load Previous, the PCPC report.
- The dashboard's Unack/Failed sections.
- The CR undo glyph.
- The Accept action.
- The PAS Register / Unregister links.
- The PCPC In-Basket fee list.
- The PCPC per-chart scores.
- The PBF Configuration tree node, which is absent from the user's v02.31 clinic captures.

## 4. Tutorial-authoring notes (anchors; `host.mois.` prefix omitted)
- **LFP Setup** (`tree.bl-lfp-setup`)
  - fields `field.lfp-activate`, `field.lfp-time-claim-wizard`, `field.lfp-payor-codes`, `field.lfp-diagnosis`, `field.lfp-location-<code>`;
  - `command.save`;
  - screen reports `lfpActive`, `timeClaimWizard`, `saved`.
- **Registration**
  - `tree.bl-lfp-reg`; rows `row.lfp-<surname>`; PRACTITIONER, GENERAL is the unregistered example (`row.lfp-practitioner`); double-click the row;
  - dialog `dialog.lfp-provider-profile`; `field.lfp-payment-mode`; `command.lfp-update-enrollment`;
  - dialog `dialog.lfp-update-registration`; `field.lfp-enroll-family` / `field.lfp-enroll-locum` / `field.lfp-register-clinic|ltc|inpatient|pregnancy`; `field.lfp-start-date`; `command.lfp-update-continue`;
  - `command.lfp-profile-save`; `command.refresh`; screen reports `lfpStatus` and `lfpShownStatus` (pending-submission / pending-approval / current).
- **MSP round trip**: Data Exchange Prepare Bills then Reconcile Remittance (`command.run`), then Refresh.
- **Time Logger** (`dialog.time-logger`)
  - `field.time-logger-direct-care|indirect-care|clinical-admin`, `field.time-logger-start`, `field.time-logger-note`;
  - `command.time-logger-timer`, `command.time-logger-review-day`;
  - screen report `timer`.
- **Time Management** (`dialog.time-entry`)
  - `field.time-provider-profile`, `field.time-date`;
  - `command.time-date-previous|next|today`, `command.time-punch-direct|indirect|clinical`, `command.time-punch-stop|cancel`;
  - `field.time-start` / `field.time-stop` / `field.time-note` / `field.time-round`;
  - `command.time-edit-entries`, `command.time-create-claims`; `field.time-view-big|small`.
- **Time Entry** (`dialog.time-entry-edit`)
  - `field.time-entry-code-<i>` / `field.time-entry-start-<i>` / `field.time-entry-stop-<i>` / `field.time-entry-note-<i>`;
  - `command.time-entry-insert|continue|clear-<i>`, `command.time-entry-save|cancel`.
- **Time Claims** (`dialog.lfp-time-claims`)
  - wizard `dialog.time-claim-wizard`; `field.wizard-optimize-time-segments`, `field.wizard-subtract-fee-for-service-appointment-times`, `field.wizard-use-the-first-patient-of-the-day-for-all-time-claims`, `field.wizard-alert-me-when-there-is-a-duplicate-claim`, `field.wizard-save-selections`; `command.time-claim-wizard-continue`;
  - `command.time-claims-create`; duplicate prompt `command.lfp-duplicate-claim-yes|no`; then `command.lfp-time-claims-message-ok`;
  - screen reports `duplicatePrompt`, `subCode` = d.
- **Time Summary**: `tree.bl-lfp-time`; `field.lfp-time-frame-today|yesterday|in-the-last|range`; `command.new-entry`; rows `row.lfp-time-<surname>-<yyyymmdd>`.
- **DEACON** (Admin ▸ Utilities ▸ Data Extraction…)
  - expand `group.deacon-msp-lfp-patient-panel` (the band's +/- button); `row.deacon-create-bulk-patient-lfp-registration-claims` / `row.deacon-undo-delete-bulk-patient-lfp-registration-claims`;
  - `field.service-provider`, `field.patient-status-ie-a-tr`, `field.last-contact-as-of-yyyy-mm-dd`, `field.mode-c-claim-r-review`, `field.msp-batch-id-from-log-file`;
  - `command.run`, then `command.yes`; errors show `command.deacon-error-ok`. BEARDWOOD, WALTER has unregistered panel patients. The first batch is 10024.
- **PAS**
  - `tree.bl-pas-changes`, `command.refresh`; filters `field.pas-change-from|to`, `field.pas-service-provider`, `field.pas-show-new|changed`, `field.pas-panel-status`;
  - `command.pas-register-<chart>` / `command.pas-unregister-<chart>`, then `command.pas-register-yes`;
  - `tree.bl-pas-panel`: `field.pas-panel-provider`, `field.pas-panel-review-status`, `command.refresh`.
- **PBF**
  - Dashboard `tree.bl-pbf`; lines `command.pbf-dashboard-<slug>`.
  - Enrollment `tree.bl-pbf-enrol`:
    - rows `row.pbf-<surname>-<chart>`; `command.edit`, then `dialog.pbf-benefit-plan`, `field.pbf-override-start|stop|stop-reason`, `command.pbf-plan-save|history`;
    - Action menu ▸ By-Pass… opens `dialog.pbf-bypass`: `field.pbf-bypass-chart|date|provider|reason`, `command.pbf-bypass-ok`.
  - Eligibility `tree.bl-pbf-elig`: `command.new` opens `dialog.pbf-eligibility-new`: `field.pbf-eligibility-chart`, `command.pbf-eligibility-save`.
  - Enrollment CR `tree.bl-pbf-cr`:
    - tabs `tab.enroll-requests` / `tab.unenroll-requests`; `field.pbf-cr-status-new-cr|approved-cr|…`;
    - `command.pbf-cr-approve|reject|undo|detail-<chart>`. Clinic request 3609, MSP request 1003, unenrol 2350.
  - Unsent `tree.bl-pbf-unsent`: `command.edit-record` / `command.delete-record`, then `command.pbf-delete-claim-yes`; the claim window `dialog.pbf-enrolment-claim`.
  - Failed `tree.bl-pbf-failed`: row `row.pbf-adaams-3429`; double-click; `command.pbf-claim-expl-codes` (or Ctrl+E) opens `dialog.sent-claim-detail`; `command.pbf-claim-resubmit|accept`.
  - MSP CR Review `tree.bl-pbf-review`: `field.pbf-msp-records-…`; `command.pbf-msp-detail|delete|replay-<surname>`. The AADAMS deregistration succeeds after a by-pass enrolment of 3598.
  - History `tree.bl-pbf-history`.
  - Config `tree.bl-pbf-config`: `field.pbf-activate`, `field.pbf-standard-code`, …, `command.save`.
- **PCPC calculator** (`tree.bl-pbf-pcpc`)
  - `field.pcpc-include-pbf-enrolled|other`, `field.pcpc-provider-all-providers|desktop-provider`, `field.pcpc-add-final-index`;
  - `field.pcpc-output-printable-report|moh-file|chart-navigator|csv-file`; `field.pcpc-logging|debugging|limit`;
  - `command.run-calculator` / `command.load-previous-results`, then `dialog.pcpc-load-previous`, `row.pcpc-run1`, `command.pcpc-load-ok`, which opens `dialog.chart-navigator`.
- **PCPC validation** (Unsent MSP): chart 2429, fee 00100, service date on or after 2024.01.08, Save. Shows `field.claim-pcpc-enrolled` and the warning with `command.claim-pcpc-ok`.
