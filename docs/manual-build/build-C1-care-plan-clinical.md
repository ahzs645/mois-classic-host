# Stream C1-care-plan-clinical — build report

Emulator: `the emulator` (all paths below are under `src/` unless absolute).
Whole-emulator `npx tsc -p tsconfig.json --noEmit` is clean as of 2026-09-28 02:22. Vitest not run (per brief).
Work was split across five sub-agents plus the lead; each part below carries the brief's four sections
(built / left out / INFERRED / tutorial-authoring notes). Chart 87288 is the only chart with an export — lessons should open it.

## Article → part index

| Article | Title | Part | Main files / window ids |
| --- | --- | --- | --- |
| 300925 | Preferences | A1 | `screens/PreferenceWindows.tsx` (`new-preference`, `preference-lookup`), `data/carePlanRecords.ts`, `data/preferenceVocab.ts`, PreferencesDetail/PreferenceChoice; Quick Entry wiring in Q |
| 303498 | Goals | A2 | `data/goalRecords.ts`, `screens/GoalWindows.tsx` (`new-goal`, `goal-link-health-issues`, `goal-link-actions`, `goal-action-detail`), `GoalsView.tsx` |
| 303511 | Planned Actions | A1 | `CarePlanView.tsx`, `screens/carePlanFolder.tsx`, `screens/CarePlanRecordWindows.tsx` (`link-goal`) |
| 303512 / 303513 | Barriers to Care / Patient Resources | A1 | `screens/CarePlanNoteFolder.tsx` |
| 303514 | Summary Settings | A2 | `data/summarySettings.ts`, `screens/SummarySettingsView.tsx` (+ its windows) |
| 303115 | Care Plan Templates (admin) | A2 | `data/carePlanTemplates.ts`, `screens/CarePlanTemplatesView.tsx` (`care-plan-template-detail`) |
| 2593946 | Determinants of Health | E | `DeterminantsView.tsx` (rewritten), `data/determinants.ts`, `screens/DeterminantWindows.tsx` (`determinant-panel`, `determinant-trend`, `determinant-lookup`) |
| 3071982 | Quick Entry Templates | Q (lead) | `screens/QuickEntryListView.tsx`, `QuickEntryWindows.tsx` (`quick-entry-select-option`, `-template`, `-export`, `-import`, `-chart`), `QuickEntryEditors.tsx`, `quickEntryApply.ts`, `data/quickEntryTemplates.ts` |
| 303447 | Health Issues (Risks, Needs, No Known) | A1 | `CarePlanView.tsx`, `screens/NoKnown.tsx` |
| 303131 | Allergy/Intolerances (No Known, Adverse Events) | C | `data/allergySession.ts`, `screens/AdverseEventWindows.tsx` (`new-adverse-event`, `elevate-event-to-risk`, `link-reaction-risks`, `link-adverse-events`, `no-known-reaction-risks`) |
| 304722 | Health Maintenance Review | C | `HealthMaintenanceReviewWindow.tsx` (+ tear-off `hmr-tear-off`, clipboard `hmr-clipboard`) |
| 301149 | Demographics (ID Alias, Other Claims, Incentives) | D | `DemographicsView.tsx`, `screens/DemographicClaimLookupDialog.tsx`, `data/demographic-claim-lookups.ts` — Occupation tab deliberately NOT added (v02.31 build has none; see D) |
| 303353 | Edit the Chart Summary (New Record measure section) | D | `AdminListsView.tsx`, `data/chartSummaryConfig.ts`, `PatientSummaryView.tsx`, INR training overlay |
| 302837 | Measures (PHQ-9 send, calculators) | E | `measuresFolder.tsx`, `data/measureEntry.ts`, `screens/MeasureEntryWindows.tsx` (`lab-code-selection`, `measure-dynamic-form`, `questionnaire-message`, …), `screens/MeasureCalculatorBodies.tsx` |
| 303102 | Create a PHQ-9 Form | E | `screens/Phq9FormWindow.tsx` (F4 / … on a PHQ9 value; dialog `phq9-form`) |

Where a sub-agent part says a **Quick Entry** button was left inert for the Quick Entry sub-agent, it has since been wired by the lead (part Q).

Cross-part integration done by the lead: Quick Entry → `addPreference` (A1), `addGoal` (A2), `addReactionRisk` (C), Orders draft;
one shared-file fix in `ClinicalReportView.tsx` (detail fields keyed by record identity so a record filed at row 0 shows its own detail).


---

# C1 part Q (stream lead): 3071982 Quick Entry Templates

I built this part myself. All paths are under `src`.

## 1. What was built

**Administration ▸ Designer Section ▸ Quick Entry** (tree node `ad-quick-entry`)
- The node used to fall back to a labelled placeholder. It now routes to the new view `quickentry` in `MoisClassicShell.tsx`: one View union member, one ROUTES entry, one render line, and a per-frame `resetQuickEntryTemplates()`.
- `screens/QuickEntryListView.tsx` is the **Quick Entry List** (`5fdf37b4…`, `1affb788…`, `c797c87c…`):
  - New Record, Delete Record (with a Yes/No confirmation), Edit Record and Close Window.
  - Right-anchored Import Records and Export Records.
  - Two filter boxes, and a Template Group / Name / Description grid. Double-clicking a row edits it.
- `screens/QuickEntryWindows.tsx` holds the area windows, registered in `areaWindows.register.ts`:
  - `quick-entry-select-option`: Select Option with the five Template Groups, Continue / Cancel.
  - `quick-entry-template`: Quick Entry Template - Chart Preference / Chart Goal / Chart Order / Reaction Risk / MSP Group of Claims. It has Quick Entry Identification (Name, Description) above Quick Entry Detail, and Save / Cancel. Saving with no Name shows a message.
  - `quick-entry-export`: Quick Entry Export.
    - Output field with Browse..., which opens the Export To... file dialog.
    - A Select-tick grid with Select All / Unselect All.
    - Ok leads to Export Complete.
  - `quick-entry-import`: Import Quick Entry.
    - File (7z) field with Browse..., which opens the Select Import File dialog.
    - Concepts, then Data Provider / Software Provider.
    - A Duplicate / Select grid with Select All / Unselect All.
    - Ok imports the ticked templates.
  - `quick-entry-chart`: the chart window, covered in the next section.
- `screens/QuickEntryEditors.tsx` has one Quick Entry Detail editor per group, each transcribed from its capture:
  - Chart Preference: seven Type radios; Subject; Identified By Concept / Code / Free Text; the Concept "…" prompt; Instruction; Mark as Sensitive; Show on Demographics.
  - Goal: Is a Quantitive Goal [sic]; Subject; Identified By; Concept "…"; Target Value (operator + value); Perform Every with Units.
  - Order: Order Type; Order For "…"; Attachment "…", which opens an Attach dialog with Attach Files and Attach Form/Letter tabs.
  - Reaction Risk: the four navy questions, the agent Code "…" / Term, Reactions 1–3 and Severity.
  - MSP: the Primary fee "…", which fills Name and Description, then twelve Secondary Code "…" / No. Service rows.
  - The same editors are drawn read-only in the chart window.
- `data/quickEntryTemplates.ts` is the clinic-wide template store, shared by the admin and chart sides and reset per frame. It is seeded with the templates shown in the captures: VACCINATIONS - NOT DESIRED, Influenza Vaccine - Not Desired, Pharmanet Consent - Allow, Smoking Cessation, 70168, Arterial Blood Gas Panel and PENICILLIN.
- `data/preferenceVocab.ts` is the shared Preference vocabulary. It started here, and A1 extended it with subject-dependent terms and instructions. It is also used by the New Preference dialog.

**Chart use: `quick-entry-chart`** (`9ce42050…`, `8b8958b7…`, `3a1f89a7…`, `9ac10271…`)
- **Layout:**
  - Title: Quick Entry - Chart Preference / Chart Goal / Chart Order / Reaction Risks.
  - A blue patient band.
  - On the left, "Quick Enty Templates" [sic] with a find box and the group's templates.
  - On the right, the editable chart fields for the group:
    - Preference: Start, Stopped, Subject Detail, Instruction plus detail, Reason plus detail, Form, By.
    - Goal: Start, End, Phase, Target Value, Perform Every, Detail, Expected Outcome.
    - Order: Order Date, Order By, Order To, Copy To ×2, Attending, Note.
    - Reaction Risk: First Occurence, Your Age, Stopped, Severity, Comments.
  - Below those, the template's Quick Entry Detail, greyed under a "Read Only" watermark.
  - Continue / Cancel.
- **Entry points and what Continue writes** (dispatch in `screens/quickEntryApply.ts`):
  - **Preferences:** the Quick Entry button, via `preferenceCommands` in `PreferenceWindows.tsx`. Continue calls `addPreference` (data/carePlanRecords.ts), the row is listed first and becomes current, and `host.screen.record = saved`.
  - **Goals:** the Quick Entry button in `GoalsView.tsx`. Continue calls `addGoal` (data/goalRecords.ts), and the row is listed first and becomes current.
  - **Orders:** the Quick Entry button in `OrderView.tsx`. This is only the entry point; Orders belongs to another stream. Continue fills the folder's new-record draft (LAB · ARTERIAL BLOOD GAS PANEL · Ordered By · IP).
  - **Reaction Risks:** the Quick Entry button on `reaction` / `allergy`, via `reportRecords.tsx`. Continue calls `addReactionRisk` (data/allergySession.ts), then `own.mark('saved', true)`.

**Fix found by the smoke test:** in `ClinicalReportView.tsx`, the uncontrolled Detail fields are now keyed by record identity (`recordKeyOf`) as well as by index. Before this, a record filed at the top of the list (Quick Entry, New Reaction Risk) kept the previous row's Detail values, because the current index stayed at 0.

**Verified in Chromium** (Playwright, private vite on :5327, chart 87288). The full run:
1. Admin list → New Record → Select Option → Chart Preference.
2. Built "CPR - DNR" (Advance Directive, which defaults to Code; OTHER; Code "…" CARDIOPULMONARY RESUSCITATION → Instruction DNR) and saved it.
3. Export → Select All → Ok → Export Complete.
4. Import → Browse → Open → rows listed, Duplicate Y.
5. Quick Entry → Continue on Preferences, Goals, Orders and Reaction Risks. Each added the templated row at the top of its folder with the Detail filled.

The whole emulator `tsc --noEmit` is clean.

## 2. Left out
- **Encounter ▸ Action ▸ Quick Entry and the "Select Quick Entry" window** (`3340b54a…`, `7334d47b…`): not in the stream's list, and the Encounter window is shared.
- **MSP Secondary Claims generating secondary claims in Billing ▸ Unsent Claims:** Billing belongs to another stream. The template can be authored, exported and imported.
- **The Administration tips table** (Prompt / Selection List editors): those windows belong to the admin stream.
- **Order's Quick Entry "launches the Paper Form / Letter associated with the template":** not wired. Letters belong to C3; the attachment is only recorded, as the paper-clip "1".

## 3. INFERRED
- The Delete Record confirmation, the "Name is required" / "select a template" / "select at least one" messages, and the Import done message.
- The file dialogs, which are simplified stand-ins for the Windows shell dialogs.
- Every "…" prompt list (concepts, Order For, attachments, agents, reactions, MSP fees), apart from the captured values 3 PENICILLIN, 39579001 ANAPHYLAXIS, 70168 and 00090.
- The Attach dialog layout.
- The goal operator list beyond `<`, and the Precaution instructions.
- The seed templates Influenza Vaccine and Pharmanet Consent. Only the list row of the first is captured.
- The chart window's Instruction list, which is the template's instruction plus the common values.

## 4. Tutorial-authoring notes

**Admin**
- `host.mois.module.admin` → `host.mois.tree.ad-quick-entry` → `host.screen.rows`.
- Commands: `host.mois.command.new-record` / `delete-record` / `edit-record` / `close-window` / `import-records` / `export-records`.
- Rows: `host.mois.row.quick-entry-<name-slug>`. Filters: `host.mois.field.filter-template-group` / `filter-name`.
- Deleting: `host.mois.command.qe-delete-yes` / `-no`.

**Select Option** (`host.dialog = quick-entry-select-option`)
- Rows: `host.mois.row.qe-option-{chart-preference|goal|msp-secondary-claims|order|reaction-risk}`.
- Buttons: `host.mois.command.qe-option-continue` / `-cancel`.

**Template editor** (`quick-entry-template`)
- Identification: `host.mois.field.qe-name`, `qe-description`.
- Chart Preference:
  - Type: `host.mois.field.qe-type-{consent|directive|disclosure|advance-directive|not-indicated|contraindicated|precaution}`.
  - Subject and identification: `qe-subject`, `qe-identified-{concept|code|free-text}`, `qe-concept`.
  - The Concept "…" is `host.mois.lookup.qe-concept`, which opens `qe-concept-prompt`. Its rows are `host.mois.row.qe-concept-prompt-<term-slug>`, with `host.mois.command.qe-concept-prompt-ok`.
  - Instruction and flags: `qe-instruction`, `qe-sensitive`, `qe-show-on-demographics`.
- Goal: `qe-quantitative`, `qe-goal-subject`, `qe-goal-identified-{code|concept}`, `qe-goal-concept` (lookup `qe-goal-concept`), `qe-target-operator`, `qe-target-value`, `qe-perform-every`, `qe-perform-units`.
- Order:
  - Fields: `qe-order-type`, `qe-order-for` (lookup `qe-order-for`), `qe-attachment` (lookup `qe-attachment`).
  - The Attach dialog `qe-attach` has tabs, rows `host.mois.row.qe-attach-<slug>` and buttons `host.mois.command.qe-attach-ok`.
- Reaction:
  - Choices: `qe-reaction-{allergy|intolerance}` and `qe-agent-{drug-specific|drug-category|food|environmental}`.
  - Codes and terms: `qe-agent-code` / `-term` (lookup `qe-agent`) and `qe-reaction-{1..3}-code` / `-term`.
  - Severity: `qe-severity`.
- MSP: `qe-msp-primary` (lookup `qe-msp-primary`), `qe-msp-secondary-{1..12}`, `qe-msp-services-{1..12}`.
- Buttons: `host.mois.command.qe-template-save` / `-cancel`.

**Export** (`quick-entry-export`)
- Output field: `host.mois.field.qe-export-output`.
- Buttons: `qe-export-browse`, `qe-export-select-all` / `-unselect-all` / `-ok` / `-cancel`.
- Ticks: `host.mois.field.qe-select-<name-slug>`.
- The file dialog `qe-export-to` has `host.mois.command.qe-export-to-save`.
- Completion: `host.mois.command.qe-export-complete-ok`.

**Import** (`quick-entry-import`)
- Buttons: `qe-import-browse`, then the file dialog `qe-select-import-file` (`host.mois.command.qe-select-import-file-open`), then ticks, then `qe-import-ok`, then `qe-import-complete-ok`.

**Chart** (`host.dialog = quick-entry-chart`)
- From the folder: `host.mois.command.quick-entry` on `prefs`, `goals`, `orders`, `reaction` or `allergy`.
- Template rows: `host.mois.row.quick-entry-<name-slug>` (e.g. `quick-entry-vaccinations-not-desired`, `quick-entry-smoking-cessation`, `quick-entry-arterial-blood-gas-panel`, `quick-entry-penicillin`). Find box: `host.mois.field.qe-chart-find`.
- Fields: `host.mois.field.qe-chart-<key-slug>`. For example `qe-chart-start`, `qe-chart-instruction`, `qe-chart-reason`, `qe-chart-form`, `qe-chart-by`, `qe-chart-phase`, `qe-chart-target`, `qe-chart-orderto`, `qe-chart-note`, `qe-chart-severity`, `qe-chart-comments`.
- The read-only block is `host.mois.field.qe-chart-detail`.
- Buttons: `host.mois.command.qe-chart-continue` / `-cancel`.
- Grading after Continue: `host.screen.rows` goes up. Preferences and Reaction Risks also report `record = saved`.

Use chart 87288, the only one with an export behind it.

---

# C1 / sub-agent A1: Preferences, Planned Actions, Barriers, Resources, Health Issues entry

Emulator root: `the emulator`. My files type-check clean (`npx tsc -p tsconfig.json --noEmit`). The remaining errors are in other agents' in-progress files.

## 1. What was built, per article

### 300925 Preferences (Care Plan ▸ Preferences, node `prefs`, which routes to ClinicalReportView)
- **New Preference dialog**. Area window `new-preference`, in `src/screens/PreferenceWindows.tsx`, registered in `areaWindows.register.ts`. The folder's **New Record** opens it, and `openWindowById('new-preference')` reaches it too.
  - It opens with only the **Type** radios showing (seven types). The rest of the dialog appears after a type is chosen (step 5).
  - **Subject** drop list. **Identified By** radios Concept / Code / Free Text; Advance Directive defaults to Code and every other type to Concept.
  - The **Concept / Code / Description** field depends on the radio. For Concept and Code its `…` (or F4) opens a nested **Concept / Code lookup** listing the Subject's concepts or codes (Search For, Code / Description grid, Select / Cancel). Free Text is a plain edit box.
  - **Subject Detail**.
  - **Instruction** list, which depends on type + concept/code: Cardiopulmonary Resuscitation gives CPR / DNR; Pharmanet Access gives Allow / Not Allow; Mental Health Act gives Form 4.1 / 4.2; otherwise the type's list (Directive = DESIRED / NOT DESIRED; Not Indicated = NOT INDICATED; and so on). Plus **Instruction Detail**.
  - **Reason** list and **Reason Detail**.
  - **Other**: Start Date (today), End Date, Mark as Sensitive, Show on Demographics, Form (IN PERSON / PAPER / PHONE / VERBAL), By (CLIENT / GUARDIAN / MATURE MINOR / PARENT / OTHER).
  - **Save / Cancel**. Save checks Type, Subject, concept/code/description and Instruction; if one is missing, a PBMessageBox says "X is required."
- **Save** files the preference with `addPreference` (data/carePlanRecords.ts). The row is listed first in the grid and becomes current.
- **Read-only after creation**: Type and Subject are painted, and the Detail tab's Instruction drop list is now read-only. `PreferenceChoice` got `readOnly` and `tutorialId` props.
- **Editable Detail tab** (PreferencesDetail): Subject/Instruction/Reason Detail, Start/End Date, Mark as Sensitive, Show on Demographics, Reason, Form and By can be edited. Edits stay pending until **Save**, which files them in the store (exported rows keep an edit overlay; the export itself is never written). **Undo** drops the current row's pending edit. **Refresh** clears everything pending.
- **Delete Record** takes the current row out, pending until Save (Undo restores it), like the other chart folders.
- **Sortable blue headers**: `onSort` on the grid; a second click reverses. Anchors are `host.mois.sort.{start|type|subject|detail|instruction|s|demo|clip}`.
- **Search**: uses the shared SearchForBand, which another agent had already wired into ClinicalReportView. I gave Preferences its own fields (`PREFERENCE_SEARCH_FIELDS`): Detail + Instruction as defaults, Type and Subject in Advanced Search, as the article says.
- **Quick Entry** is left inert (still passes through untouched).
- **Shared lists** extended in `src/data/preferenceVocab.ts` (the lead's file): `PREFERENCE_REASONS` (moved from PreferencesDetail, which now imports it), `PREFERENCE_TERMS` / `preferenceTerms(subject, by)` and `preferenceInstructions(type, term)`.
  - The OTHER codes are chart 87288's real exported preferences (01000 AUTOMATED CALL SERVICE, 01002 HOME RISK ASSESSMENT, 01015, 01100, MHEL, POA) plus HRV (art. 304053).
  - The concept names are the Health Maintenance concepts from art. 304722.

### 303511 Planned Actions (node `actions`, which routes to CarePlanView)
- **New Record** adds a draft row with Start = today, made current.
- The current row's grid cells are editable in place: Planned Start / End, Action, Participant(s), Action Completed (tick box), Completed Date, S.
- Ticking Completed sets Completed Date to today; unticking clears it (per the article).
- **Detail tab** is editable: Detail (`str_comment`), Participant(s), Outcome, Completed Yes, Completed Date.
- **Save** files the action (session actions go into `useCarePlanRecords(chart).actions` via `addPlannedAction`, which is what A2 reads). **Undo** discards pending changes. **Delete Record** is pending until Save. **Refresh** re-reads the folder.
- **Search For** uses SearchForBand: Action is the default field; Participant is available in Advanced Search.
- **Linked Goals tab**:
  - It lists export `goal_link` rows, minus unlinked ones, plus session links. Goals include A2's session goals, read from `data/goalRecords.ts`.
  - The band carries **Link Goal...**, which opens area window `link-goal` (new file `src/screens/CarePlanRecordWindows.tsx`, a Goals picker with Link / Cancel), and **Unlink** (removes the selected link).
  - A2's Goal-side Linked Action(s) uses the same `linkGoal` / `unlinkGoal` / `linkedGoalIds`, so a link made from either side shows on both.

### 303512 Barriers to Care and 303513 Patient Resources (nodes `barriers` / `resources`)
- Routing check: `reportScreens` is checked first, so both nodes land on ClinicalReportView. ClinicalReportView now hands these two nodes to a new component, `src/screens/CarePlanNoteFolder.tsx`, the same way Paper Forms is split out.
- **New Record** adds a row with Start = today. The current row's Start / End / Barrier to Care (or Resource) / S cells are edited in the grid. The Detail tab holds the **Note**. M shows ⇩ when the Note has text.
- Save / Undo / Delete Record / Refresh work, and saved records persist per chart. Search For is SearchForBand over Barrier / Resource only.
- The grid geometry is reportScreens' existing `barriers` / `resources` entries, so the titles are "Barriers to Care" / "Patient Resources". `carePlanScreens.barriers` in data/mois.tsx says the header is singular; I did not change it.

### 303447 Health Issues
- **Risks for Conditions** (`risks`, CarePlanView):
  - New Record, and in-grid editing of Start / End / Risk Code/Description / Rank / Source / S / Neg.
  - The `…` in the current row opens the existing Universal Search Window; a pick fills the description and code.
  - Detail: Risk Description (painted), **Risk Severity slider** 1–10 with an editable Value box (/10), Comment.
  - Save / Undo / Delete / Refresh work. Search: Description by default, plus Code and Source.
- **Needs for Care** (`needs`, CarePlanView):
  - New Record, and in-grid editing of Start / End / Need Description / Participant(s) / S.
  - Detail: Need Desc., Participants, **Risk Rating slider** + Value, Comment.
  - Search: Need, plus Participant(s).
- Linked Goals on Risks and Needs is "Linked Goals - Read Only" and shows links made from a Goal.
- **No Known** (Conditions routes to ClinicalReportView, so the button lives there; handled by the new file `src/screens/NoKnown.tsx` plus small ClinicalReportView edits):
  - With no conditions listed, pressing No Known files the assertion, and **`** NO KNOWN **`** is painted bold, right-aligned on the "Health Conditions have not been reviewed…" line (or the Last Reviewed line).
  - With conditions on file, a PBMessageBox refuses.
  - A **Save** that files a condition clears the assertion.
  - The assertion is stored in C's `data/allergySession.ts` as `noKnown.conditions`, so the Reviewing: Health Condition window, which C already extended, lists a "No Known" row with **Delete**. Delete, then Mark Reviewed, removes it (per the article). I did not keep a copy in my store.
  - It is reported as `host.screen.noKnown` (added to `manifest.ts` snapshotPaths).
  - Chart 87288 has two ACROPHOBIA conditions. A lesson must delete them (Delete Record + Save) or use a chart with no export before No Known is accepted.

### Store: `src/data/carePlanRecords.ts` (owned by me, per chart, reset per frame)
- **Unchanged API**: `addPlannedAction`, `updatePlannedAction`, `useCarePlanRecords`, `newSessionId`, `resetCarePlanRecords`, `carePlanRecords`, `SessionPlannedAction`. The `SessionPlannedAction` type gained optional participants / outcome / completedDate / sensitive.
- **New exports**:
  - Preferences: `addPreference(chart, input): id` (the PreferenceInput shape is documented in the file), `updatePreference`, `preferenceRecord`.
  - Generic folder functions for prefs/actions/barriers/resources/risks/needs: `mergedFolderRecords`, `addFolderRecord`, `saveFolderRecord`, `deleteFolderRecord`, `sessionFolderRecords`, `FOLDER_ID`, `isSessionId`, `createdStamp`, `actionRecord`.
  - Goal links: `linkGoal`, `unlinkGoal`, `linkedGoalIds`.
- Every write replaces the chart slice, so the slice can be used as a memo dependency.
- `resetCarePlanRecords()` is wired in MoisClassicShell next to `resetChartSession()`.

### Shared engine: `src/screens/carePlanFolder.tsx`
`useCarePlanFolder` (the draft / pending edit / pending delete → Save contract), `editableColumns` (in-grid editors for the current row) and `searchView` (search without renumbering).

### Edits to shared files (small)
- ClinicalReportView: imports; barriers/resources routing; prefs hook; commands (prefs + No Known); prefs search fields; the NO KNOWN label; `onSort`; `{noKnown.windows}`.
- MoisClassicShell: the reset call.
- areaWindows.register.ts: two import lines.
- manifest.ts: one snapshot path.
- PreferenceChoice and PreferencesDetail, as described above.
- CarePlanView: rewritten, keeping its layout and panes.

## 2. Left out, deliberately
- The Quick Entry command (owned by the Quick Entry sub-agent).
- Preferences' Advanced Search is the generic SearchForBand one; no Preference-specific Advanced Search dialog was built.
- The Administration ▸ Selection Lists ▸ Preference Subject / Reason editors mentioned in the article's notes. These belong to the admin stream, and the lists are static in preferenceVocab.
- Attachment on these folders (inert, as elsewhere).
- CarePlanView's conditions / barriers branches are dead paths (routing never reaches them) and were left as they were.
- The ENC# link on the Care Plan windows stays inert.

## 3. INFERRED
- **New Preference geometry.** No 300925 captures exist locally. The layout follows the Quick Entry Template - Chart Preference capture (3071982 `8533ea5a…`) plus the Detail tab's blocks.
- **Lookups and messages.** The Concept/Code lookup window, the required-field messages and the Precaution instruction list are the lead's. The concept codes, the non-OTHER code lists and the second Mental Health Act instruction are also inferred.
- **In-grid entry and new controls.** In-grid entry of Care Plan / Health Issue rows is inferred, as are the Link Goal... / Unlink buttons and the Link Goal window.
- **No Known refusal.** The message shown when conditions exist is inferred.
- **Planned Actions field mapping.** The Detail box maps to `str_comment`, separate from the grid's Action (the field audit lists both).
- **Risk scale field.** The slider and value are stored in `num_risk`.

## 4. Tutorial-authoring notes (anchors / windows)
- **Preferences** (tree `host.mois.tree.careplan` → `host.mois.tree.prefs`):
  - `host.mois.command.new-record` opens `host.mois.dialog.new-preference`.
  - Type: `host.mois.field.new-preference-type-{consent|directive|disclosure|advance-directive|not-indicated|contraindicated|precaution}`.
  - Subject: `host.mois.field.new-preference-subject` (typed; setField works) or `host.mois.command.new-preference-subject-list` (opens the list; options are role=option).
  - Identified By: `host.mois.field.new-preference-identified-{concept|code|free-text}`.
  - Concept / Code: `host.mois.lookup.new-preference-concept` (the …) opens `host.mois.dialog.preference-lookup`. Rows are `host.mois.row.preference-term-{code}` (e.g. `-cpr`, `-pnet`, `-flu`). Buttons are `host.mois.command.preference-lookup-select` / `-cancel`. The field itself is `host.mois.field.new-preference-concept` (typed when Free Text).
  - Detail and Other fields: `host.mois.field.new-preference-{subject-detail|instruction|instruction-detail|reason|reason-detail|start-date|end-date|sensitive|show-on-demographics|form|by}`. Each drop list also has `host.mois.command.new-preference-{instruction|reason|form|by}-list`.
  - Buttons: `host.mois.command.new-preference-save` / `-cancel`; the message OK is `host.mois.command.new-preference-message-ok`.
  - Rows: `host.mois.row.preference-{id}`; session ids are `session-preference-N`.
  - Sort: `host.mois.sort.type` and so on.
  - Detail tab: `host.mois.field.preference-{subject-detail|instruction (read-only)|instruction-detail|reason|reason-detail|start-date|end-date|sensitive|show-on-demographics|form|by}`.
  - Grading: `host.dialog = new-preference`, then `host.screen.rows` goes up after Save.
- **Planned Actions / Risks / Needs** (`host.mois.tree.actions` / `risks` / `needs`):
  - The command row: `host.mois.command.{new-record|delete-record|save|undo|refresh}`.
  - Current-row cells: `host.mois.cell.{actions|risks|needs}-{start|end|desc|participants|completed|compdate|s|rank|source|neg}`. The current row is `host.mois.row.{folder}-current`.
  - Risk code `…`: `host.mois.lookup.risk-code` (opens the Universal Search Window).
  - Detail fields:
    - Actions: `host.mois.field.action-{detail|participants|outcome|completed|completed-date}`.
    - Risks: `host.mois.field.risk-{description|severity|severity-value|comment}`.
    - Needs: `host.mois.field.need-{description|participants|risk-rating|risk-rating-value|comment}`.
  - Tabs: `host.mois.tab.detail` / `host.mois.tab.linked-goals`.
  - Linking: `host.mois.command.link-goal` opens `host.mois.dialog.link-goal` (rows `host.mois.row.goal-{id}`, buttons `host.mois.command.link-goal-link` / `link-goal-cancel`). `host.mois.command.unlink-goal` unlinks; linked rows are `host.mois.row.linked-goal-{goalId}`.
  - Grading: `host.screen.draft` (true while unsaved), `host.screen.record` = saved | deleted, `host.screen.rows`.
- **Barriers / Resources** (`host.mois.tree.barriers` / `resources`):
  - Cells: `host.mois.cell.barriers-{start|end|barrier|s}` and `host.mois.cell.resources-{start|end|resource|s}`.
  - Note: `host.mois.field.barrier-note` / `resource-note`.
  - Search: `host.mois.field.search-for`.
- **Conditions No Known** (`host.mois.tree.conditions`):
  - `host.mois.command.no-known`; the assertion is `host.mois.field.no-known`; the refusal's OK is `host.mois.command.no-known-ok`.
  - Removal: `host.mois.command.review` opens `reviewing`, then `host.mois.row.review-no-known`, `host.mois.command.review-delete-no-known`, `host.mois.command.mark-reviewed`.
  - Grading: `host.screen.noKnown`.

## Verification
- `npx tsc -p tsconfig.json --noEmit` shows no errors in my files.
- I also drove the flows in a browser with Playwright on a private Vite instance that stubbed other agents' missing modules. Each ran with no page errors:
  - New Preference (Advance Directive → OTHER → Code lookup CPR → DNR → Save → row listed first, Type/Subject/Instruction read-only, sort);
  - Planned Action New Record → in-grid Action, Detail, Completed tick → Save → Link Goal... → Link;
  - Risk (typed description, severity 7, comment) and Need (description, rating 4) → Save;
  - Barrier + Note → Save, survives leaving the folder; Resource → Save;
  - Conditions No Known: refused while conditions exist; delete both, Save, No Known shows `** NO KNOWN **`; Review → Delete → Mark Reviewed clears it.

---

# C1 / sub-agent A2 — Goals, Summary Settings, Care Plan Templates

Emulator root: `the emulator`. `npx tsc -p tsconfig.json --noEmit` is clean for the whole tree (0 errors at the end of the run). I walked each flow below in a private, HMR-less Vite instance using Playwright; the screenshots are in `/tmp/mcov/c1/a2shots/`.

## 1. Per article: what was built

### 303498 Goals (Patient Chart ▸ Care Plan ▸ Goals, node `goals`)
- **NEW `src/data/goalRecords.ts`**: the per-chart goal session store. It holds new goals, edits to exported goals and deleted goals, and it is reset for every frame.
  - **`addGoal(chart, input): string` is the Quick Entry entry point.**
  - `GoalInput` = `{ goal (required), start, end, phase, quantitative, subject, identifiedBy: 'Code'|'Concept', concept, operator ('=','<','<=','>','>=','BETWEEN'), target, target2, every, units, detail, expectedOutcome, evaluationMethod, actualOutcome, commitment, confidence, importance, sensitive }`. Every field except `goal` is optional, and `start` defaults to MOIS today.
  - A quantitative goal with no description gets one generated, for example `HGBA1C <= 8.5`.
  - The call returns `session-goal-N`. That goal is listed first in the grid and becomes the current row, with its Quantitative Settings filled in.
  - Also exported: `updateGoal`, `deleteGoal`, `goalFieldsOf(record)`, `quantitativeDescription`, `useGoalRecords` and `resetGoalRecords`.
  - Links and actions are **not** stored here. They go through A1's `data/carePlanRecords.ts`: `linkGoal`, `unlinkGoal`, `linkedGoalIds`, `mergedFolderRecords`, `addFolderRecord`, `saveFolderRecord` and `deleteFolderRecord`. Because of that, an action created or linked from a Goal shows in Planned Actions, and a link made there shows on the Goal.
- **NEW `src/screens/GoalWindows.tsx`**: four area windows.
  - `new-goal` (New Goal): transcribed from the user capture `reference/goal-standard-populated.png`. It has:
    - Goal Type ☐ Quantitative Goal, Phase, Start Date and End Date.
    - Goal, Detail and Expected Outcome, then Close.
    - When Quantitative Goal is ticked, the quantitative fields (Subject, Identified By, Concept/Code, Target Value with op/value/second value for Between, Require Every n + units) fill the empty band under Goal, and the Goal description is auto-populated.
    - Close files the goal.
  - `goal-link-health-issues` (Link Health Issues): three bands (HEALTH CONDITION, RISK FOR CONDITION, NEED FOR CARE) with a tick box per row, then Link / Cancel. Already-linked records are excluded.
  - `goal-link-actions` (Link Action(s)): the same shape, listing only actions not already linked.
  - `goal-action-detail` (Action Detail): Planned Start, Planned End, Participant(s), Action, Detail, Completed ☐ Yes, Completed Date and Outcome, then Save / Cancel. It serves both New Action and Edit Action.
- **`src/screens/GoalsView.tsx` (rewritten)**:
  - Command row is New Record · Quick Entry · Delete Record · Save · Undo · Refresh · **Attachment**. Attachment was missing; it is added per the user capture and opens `add-attachment`.
  - **Quick Entry is left inert** for the Quick Entry sub-agent.
  - Grid rows are export goals plus session goals. The Quantitative Goal and S boxes in the grid are live and can be ticked.
  - Search For filters on Goal. "…" or F4 opens the Advanced Search Phase drop-down.
  - All five tabs are anchored and editable, and edits persist per chart:
    - Detail: the sliders set the value.
    - Quantitative Settings: greyed unless the goal is quantitative.
    - Evaluation: Evaluation Method and Actual Outcome.
    - Linked Health Issue(s): Link Health Issue(s) / Unlink Health Issue.
    - Linked Action(s): New / Delete / Link / Unlink / Edit Action.
  - Each linked description is a hyperlink to its folder (conditions / risks / needs / actions).
  - Delete Action is refused with a message box while the action is linked to more than one goal. Otherwise it asks for confirmation, then unlinks the action and deletes it from the chart.
  - Delete Record asks for confirmation and deletes the goal.
- `src/screens/GoalDialog.tsx`: now a thin wrapper around `NewGoalWindow`, so the frame's old `goalOpen` path still works.
- **NEW `src/host/frame-nav.ts`**: `setFrameNodeOpener` / `openFrameNode(node, recordId?)`. The shell registers its `openNode` here, which lets hyperlinks jump to a folder.

### 303514 Summary Settings (Patient Chart ▸ Care Plan ▸ Summary Settings, node `summarysettings`)
- **NEW `src/data/summarySettings.ts`**: the per-chart store for sections and elements.
  - Section fields are Order, Label, and Type (SYSTEM/USER). The defaults are the summary's 15 sections, with Order 50…750.
  - Element fields are category, Code/Concept, rule (RECENT/INITIAL/HIGHEST/LOWEST, or `THIS RECORD` for an absolute pin), records, required, section and rank.
  - `effectiveSections` adds any section that a tag or element uses but the list lacks ("MOIS will automatically add the section").
  - `resolveElement` pulls the N most recent / initial / highest / lowest matching chart records for the categories MEASURE, CONSULT, IMAGE, PROCEDURE, INTERVENTION, FACILITY ADMISSION and MAR.
  - **`carePlanSummaryRows(data, chart, tags)` / `carePlanSummarySections`** is now the single source of Care Plan summary rows, in Sections order. Tags and elements are ranked, and a missing rule record is painted red when Required, grey otherwise.
- **NEW `src/screens/SummarySettingsView.tsx`**:
  - The folder is built from capture b256251d0d8f:
    - Command row: New Record · Delete Record · Save · Refresh · Add from Template.
    - Two tabs, Care Plan Sections and Care Plan Elements.
  - **Care Plan Sections tab**: a grid of Order · Section Label · Type. The current row's Order is editable, and so is the Label of a USER section.
  - **Care Plan Elements tab**: a pale band per section with ±, and a "Rank" header on the first band.
    - Each element is a yellow line: ▲ ▼ · category · code/description · grey rule text (`INITIAL *RECORD(S): 1`) or the pinned date/value · rank · blue Edit link.
    - Tags made with Tag to Care Plan are listed here too, and can be edited or deleted here.
    - ▲/▼ renumber the ranks.
  - Delete Record works on both tabs:
    - A section that still has elements is refused with a message box. Otherwise you are asked to confirm.
    - An element (tag or rule) is removed after confirmation.
  - Save sets `saved`; Refresh re-reads the view.
  - The view registers four area windows:
    - `care-plan-new-section` ("Care Plan Section"): a Select Standard Sections tick list plus 4 custom label boxes, then Save / Cancel.
    - `care-plan-element-new` ("Tag Information to Care Plan", rule variant): Category, Code (built from the chart's own codes), Concept, This Record Only vs Rule (MOST RECENT / INITIAL/FIRST / HIGHEST VALUE / LOWEST VALUE — the last two for measures only), No. of Records, Record is Required, Section, Rank, then Ok / Cancel.
    - `care-plan-element-edit` ("Care Plan Element"): Section and Rank only, then Ok / Cancel.
    - `care-plan-add-from-template` ("Add from Template"): the template list, and under it that template's element list with an Add tick per row, Select All / Clear, then OK / Cancel. The chosen elements become relative elements on the chart, and any missing sections are added.
- `src/data/chartSession.ts`: added `updateCarePlanTag` / `deleteCarePlanTag`. This was a small append; nothing existing changed.
- The Care Plan summary, snapshot, print preview and shared-care-plan letter now read `carePlanSummaryRows`:
  - `CarePlanSummaryView.tsx`: the rows, the groups, and the red/grey tone.
  - `CarePlanWindows.tsx`: the snapshot text and the print preview.
  - `LetterWriterWindow.tsx`: the care-plan tables.
  - The `tag-a-record-to-the-care-plan-in-mois` anchors are untouched: `host.mois.dialog.tag-to-care-plan`, `field.care-plan-rank`/`-section`, `command.tag-to-care-plan-ok`, and `host.screen.carePlanTags`. A tag still lands under CONSULTS, which is one of the default sections.
- Routing is in `src/host/MoisClassicShell.tsx`: `section.title === 'Summary Settings'` renders `SummarySettingsView`, and the generic ChartSectionView is excluded for it. The `chartScreens.summarysettings` config (title and commands) is still the source; its dummy rows are now unused.

### 303115 Care Plan Templates (Administration ▸ Designer Section ▸ Care Plan Templates, node `ad-careplan-templates`)
- **NEW `src/data/carePlanTemplates.ts`**: the global template store, shared by the admin screen and Add from Template.
  - Seed data follows f158827a261d: DIABETES/Diabetic Care Plan, HIV, COPD, HTN and CHF.
  - DIABETES has the 15 elements of a1d8149d2b6e, verbatim.
  - Exports: `useCarePlanTemplates`, `addCarePlanTemplate`, `updateCarePlanTemplate`, `deleteCarePlanTemplate`, `TEMPLATE_CONCEPTS`, `TEMPLATE_CATEGORIES`, `TEMPLATE_RULES` and `TEMPLATE_SECTIONS`.
- **NEW `src/screens/CarePlanTemplatesView.tsx`**:
  - The list is the "Care Plan Tag Template List": the current build's 5 commands (New Record, Delete Record, Edit Record, Find / Replace (inert), Close Window), a filter box per column, and double-click to open a template.
    - New Record opens the detail on a blank template.
    - Delete Record asks for confirmation.
    - Edit Record opens the detail.
  - The detail is the area window `care-plan-template-detail` ("Care Plan Tag Template Detail"), laid out per a1d8149d2b6e:
    - A navy band.
    - Description: grey and bold once saved, editable while new.
    - Detail.
    - An "Element List" band with New Row / Delete Row / Refresh.
    - A grid whose current row is editable: Item Category, Care Plan Section, Rank, Code/Concept radios, Identification (a concept list or a typed code), Rule, No. of Records.
    - Save Changes (F2) (the F2 key works too) / Cancel.
- `src/screens/DesignerSectionView.tsx`: a one-line early return routes this node to `CarePlanTemplatesView`. The other Designer nodes are unchanged.

### Shared-file edits (all small)
- `areaWindows.register.ts`: added `GoalWindows`, `SummarySettingsView` and `CarePlanTemplatesView`.
- `MoisClassicShell.tsx`: three imports, `resetGoalRecords()` + `resetSummarySettings()` next to `resetChartSession`, `setFrameNodeOpener(openNode)`, and the Summary Settings render line.
- `host/manifest.ts`: new snapshot paths `host.screen.goalLinks`, `goalQuantitative`, `carePlanSections` and `carePlanElements`.

## 2. Deliberately left out
- The Goals **Quick Entry** button is inert, for the Quick Entry sub-agent to wire.
- The Goals **Undo** button is inert: edits apply immediately and are session-only. The same holds for Summary Settings Save, which only marks the edits saved.
- **Find / Replace** on the template list is inert, like every other Designer list (no capture exists).
- Hyperlinks open the target folder. Selecting the exact record only works where ClinicalReportView honours `initialRecordId` (currently prefs only).
- The right-click Tag to Care Plan dialog (`TagToCarePlanDialog.tsx`) still offers only the built-in `CARE_PLAN_SECTIONS` in its Section list. Custom USER sections appear only in the Summary Settings windows.
- Health issues in the Link Health Issues window come from the export only. Risks and needs include A1's session records, through `mergedFolderRecords`.
- The "Clinical Summary" header colours from Administration ▸ Chart Summaries (mentioned in 303514) are not applied to the Elements bands.

## 3. INFERRED
- The Goals article and 303514 have no local captures, so the following layouts are INFERRED: the quantitative block inside New Goal; Link Health Issues, Link Action(s) and Action Detail; Care Plan Section (new-section); the rule variant of Tag Information to Care Plan; Care Plan Element (edit); and Add from Template. Their fields are the articles' own lists.
- Goals labels: `Subject` comes from the field audit (the article calls it "Category"). `Require Every` is from the article; the old label was "Perform Every". The following lists are INFERRED: Phase (INITIATION, IN PROGRESS, MAINTENANCE, COMPLETION, TERMINATION), Subject, and the concept and code lists. The auto-description wording is also INFERRED.
- Summary Settings:
  - The default section Orders are INFERRED.
  - STANDARD_SECTIONS includes ORDER, MAR, IMAGING, INTERVENTIONS, PROCEDURES and FACILITY ADMISSIONS.
  - Concept-to-record matching (`CONCEPT_MATCH`: codes plus a description regex) is INFERRED.
  - The missing-record row prints the element name with an empty detail.
  - The current element line is darker yellow with a dotted outline.
- Care Plan Templates: New Record opening a blank detail, the Delete confirmation, and the editable-current-row grid are INFERRED. So are the elements of HIV, COPD, HTN and CHF; only the list rows for those four are captured.
- Delete prompts' wording for goals, actions, sections, elements and templates is INFERRED.

## 4. Tutorial-authoring notes (anchor / window ids)
- **Goals (303498)**
  - Node `goals`. Commands: `host.mois.command.new-record` opens window `new-goal`; also `delete-record`, `save`, `refresh`, `attachment`.
  - Rows `host.mois.row.goal-{n}`. Grid ticks `host.mois.field.goal-quantitative-{n}` and `goal-sensitive-{n}`.
  - Search: `host.mois.field.goal-search`, "…" `host.mois.lookup.goal-search`, `host.mois.field.goal-search-phase`.
  - Tabs: `host.mois.tab.detail`, `quantitative-settings`, `evaluation`, `linked-health-issue-s`, `linked-action-s`.
  - Tab fields:
    - Detail: `host.mois.field.goal-tab-description`, `goal-tab-detail`, `goal-tab-expected-outcome`.
    - Sliders: `goal-commitment` / `goal-confidence` / `goal-importance`, each with a `-value` variant.
    - Evaluation: `goal-evaluation-method`, `goal-actual-outcome`.
  - Quantitative block, shared by New Goal and the tab: `host.mois.field.goal-subject`, `goal-identified-by-code` / `-concept`, `goal-concept`, `goal-target-operator`, `goal-target-value`, `goal-target-value-2` (Between only), `goal-require-every`, `goal-require-every-units`.
  - New Goal window: dialog `host.mois.dialog.new-goal`; fields `goal-quantitative`, `goal-phase`, `goal-start-date`, `goal-end-date`, `goal-description`, `goal-detail`, `goal-expected-outcome`; command `host.mois.command.new-goal-close`. Reports `host.screen.goalQuantitative`.
  - Linked tabs:
    - Commands: `host.mois.command.link-health-issue-s` (opens `goal-link-health-issues`), `unlink-health-issue`, `new-action` (opens `goal-action-detail`), `delete-action`, `link-action-s` (opens `goal-link-actions`), `unlink-action`, `edit-action`.
    - Rows `host.mois.row.goal-linked-{health-issue|risk|need|action}-{n}`; hyperlinks `host.mois.link.goal-linked-{n}`.
  - Link windows: ticks `host.mois.field.link-{n}`, rows `host.mois.row.link-issues-{n}` / `link-actions-{n}`, commands `link-issues-ok` / `-cancel` and `link-actions-ok` / `-cancel`.
  - Action Detail: `host.mois.field.action-planned-start`, `action-planned-end`, `action-participants`, `action-action`, `action-detail`, `action-completed`, `action-completed-date`, `action-outcome`; commands `action-detail-save` / `-cancel`.
  - Prompts: `host.mois.command.goal-delete-yes` / `goal-delete-no` / `goal-message-ok`.
  - Reported: `host.screen.rows`, `row`, `saved`, `goalLinks`.
- **Summary Settings (303514)**
  - Node `summarysettings`. Commands: `host.mois.command.new-record`, `delete-record`, `save`, `refresh`, `add-from-template`.
  - Tabs `host.mois.tab.care-plan-sections` / `care-plan-elements`.
  - Sections: rows `host.mois.row.care-plan-section-{slug}`, current-row fields `host.mois.field.section-order`, `section-label`.
  - Elements: container `host.mois.group.care-plan-elements`, bands `host.mois.group.care-plan-element-section-{slug}`, lines `host.mois.row.care-plan-element-{n}`, arrows `host.mois.command.element-up-{n}` / `element-down-{n}`, Edit link `element-edit-{n}` (opens `care-plan-element-edit`).
  - Windows:
    - `care-plan-new-section`: ticks `host.mois.field.standard-section-{slug}`, `custom-section-1..4`; commands `new-section-save` / `-cancel`.
    - `care-plan-element-new`: fields `element-category`, `element-code`, `element-concept`, `element-this-record-only`, `element-rule-option`, `element-rule`, `element-records`, `element-required`, `element-section`, `element-rank`; commands `element-new-ok` / `-cancel`.
    - `care-plan-element-edit`: fields `element-edit-section`, `element-edit-rank`; commands `element-edit-ok` / `-cancel`.
    - `care-plan-add-from-template`: rows `host.mois.row.care-plan-template-{slug}` (e.g. `-diabetes`), ticks `host.mois.field.template-element-{n}`; commands `add-template-select-all`, `add-template-clear`, `add-template-ok`, `add-template-cancel`.
  - Prompts: `summary-delete-yes` / `-no` / `summary-message-ok`.
  - Reported: `host.screen.carePlanSections`, `carePlanElements`, `rows`, `saved`.
  - The Care Plan summary (`careplan`) then shows the new sections and rows; group anchors are `host.mois.group.care-plan-{section-slug}`.
- **Care Plan Templates (303115)**
  - Module `admin`, node `ad-careplan-templates`. Commands: `host.mois.command.new-record`, `delete-record`, `edit-record`, `close-window`.
  - Rows `host.mois.row.{slug(desc)}`, e.g. `host.mois.row.diabetes` (double-click opens the detail). Filters `host.mois.field.filter-description` / `filter-detail`. Delete prompt `template-delete-yes` / `-no`.
  - Detail window `care-plan-template-detail`, dialog anchor `host.mois.dialog.care-plan-tag-template-detail`:
    - Fields `host.mois.field.template-description`, `template-detail`.
    - Commands `template-new-row`, `template-delete-row`, `template-refresh`, `template-save-changes`, `template-cancel`.
    - Rows `host.mois.row.template-element-{n}`.
    - Current-row fields `host.mois.field.template-element-category`, `-section`, `-rank`, `-identified-by-code`, `-identified-by-concept`, `-identification`, `-rule`, `-records`.
  - A saved template appears immediately in Summary Settings ▸ Add from Template.
- Chart note: the goals, links and measurements in the export belong to chart **87288**. The default standalone chart (3924) has no export, so lessons should open 87288 to show real rows and rule resolution.

---

# C1 part C — 303131 Allergy/Intolerances, 304722 Health Maintenance Review

All files are under `the emulator`. `tsc --noEmit` shows no errors in any file I touched. The remaining errors are in other agents' work in progress: SummarySettingsView, CarePlanTemplatesView, billing/*, MeasureDialogs, ReportBuilderWindow and SchedulerMenuWindows.

## 1. What was built

### 303131 Allergy/Intolerances

**New store: `src/data/allergySession.ts`.** It is a per-chart external store, built the same way as `chartSession.ts`. It holds:
- Reaction Risks filed in this session;
- Adverse Events filed in this session;
- agents and reactions edited on an event's tabs;
- links between events and risks, plus any links removed (export links included);
- the `No Known` assertion, stored per folder.

Its API is `addReactionRisk(chart, input)`, `addAdverseEvent`, `linkEventRisk`, `unlinkEventRisk`, `effectiveLinks`, `setEventParts`, `setNoKnown`, `clearNoKnown`, `useAllergySession` and `resetAllergySession`. The shell now resets it next to `resetChartSession`. Filing a Reaction Risk also removes the `** NO KNOWN **` assertion, as the article says.

**Stream lead:** Quick Entry should call `addReactionRisk(chart, { reactionType, agentType, agentCode, agentTerm, reactions:[{code,term}], severity, firstOccurrence, age, stopped, comments, … })`. The row then appears at the top of the Reaction Risks grid, with the Detail fields filled and the Reactions tab listed. `age` is appended to the record's comment. For the frame to report `host.screen.record = saved`, call `onMark('saved', true)`, which is `own.mark` from `useReportRecords`. The Reaction Risks `Quick Entry` command is still inert.

**`src/screens/reportRecords.tsx`**
- The Reaction Risks and Events grids list rows from the store above the rows from the export and the practice records.
- New `own.mark(what, top)`.
- **No Known** (reaction and allergy nodes): with an empty list it files the assertion and reports `host.screen.record = no-known`. If the list has rows, it opens the `no-known-reaction-risks` message box (INFERRED).
- **Elevate To Risk** (events node) opens `elevate-event-to-risk` for the current event. The button is disabled when there is no current row.

**New file: `src/screens/AdverseEventWindows.tsx`.** Screen windows:
- `new-adverse-event` — New Adverse Event, captures 8f620729 and b30bb011:
  - **Detail tab:** Onset, Time, Type, Severity, Comment and Event Type NORMAL. New Agent / Delete Agent over agent blocks, and New Reaction / Delete Reaction over a Code / … / Reaction / Rank grid.
  - **Linked Reaction Risks tab:** Do Not Link, Link to a New Reaction Risk (the whole captured form) or Link to Existing Reaction Risks (a tick list).
  - **Ok** files the event and then either creates and links a new risk or links the ticked ones. **Cancel** closes.
- `elevate-event-to-risk` — Elevate Event To a Reaction Risk, capture 891207c0: two radios, a Select … Agent band over an Agent Code / Agent grid, and Ok, which files a linked risk built from the event.
- `link-reaction-risks` and `link-adverse-events` — tick-list pickers (INFERRED).
- `no-known-reaction-risks` — a message box.

The same file has the event folder's tab panes:
- **Detail** (4f7a5861), plus Owned by and Record State.
- **Agents** (0d3d5d53), with New Agent / Delete Agent.
- **Reactions** (b7ebbce5), with New Reaction / Delete Reaction.
- **Linked Reaction Risks** (10f68120): Link and Unlink Reaction Risk(s), with a REACTION RISKS band.
- The risk folder's **Linked Events** tab (1a8f753b): Link and Unlink Event(s), with an EVENTS band. It now reads the export's `adverse_link`; before this it was always empty.
- `NoKnownMark`, which prints `** NO KNOWN **` at the right of the review-notice line (8ed81b2c) or of the Last Reviewed line.

**`src/screens/AllergyWindows.tsx`**
- New Reaction Risk now files through the store. It keeps its onset, stop date, agent code and comments.
- Its `Link Event(s)...` button opens a nested pick list. The chosen events are linked when the risk is saved.
- `AdverseEventTab` passes the tabs through to the new panes; Recommendations is unchanged.
- `AllergyFolderWindows` now takes `onMark` and renders the new windows.

**`src/screens/ClinicalReportView.tsx`** (small edits):
- New Record on events opens `new-adverse-event`.
- The events Reactions tab goes to the new pane.
- The Linked Events tab now uses `LinkedEventsPane`.
- The Reactions tab lists reactions for risks filed in this session.
- The No Known mark sits on the banner line.

**`src/screens/ReviewingDialog.tsx`** (capture a4b9f727):
- The assertion appears as a `No Known` row in Review History, with a **Delete** button.
- Delete strikes the row through. **Mark Reviewed** then removes the assertion.

**Also:**
- `src/data/chartUtilities.ts`: the `Reaction Risk` title is now captured, and `allergy` was added to `REVIEW_NOUNS`.
- `src/host/MoisClassicShell.tsx`: Review now also opens from the `allergy` node.

### 304722 Health Maintenance Review

In `src/screens/HealthMaintenanceReviewWindow.tsx` and `health-maintenance-review.css` (window id `health-maintenance-review`, Utilities ▸ Health Maintenance Review, Ctrl+H):
- The four buttons now report `host.mois.command` as well as being anchored.
- **Print** opens `print-preview` with the tab on screen. It takes the review window's place.
- **Tear Off** (Care Plan and Patient Summary tabs only) opens a separate "MOIS Viewer - <tab>" text window with a Close button.
- **Clipboard** opens a "Copy to Clipboard" options window. Patient Details is always included, with tick boxes for Clinic and Provider. OK writes to the system clipboard, shows a "… copied to the clipboard" note and reports `host.screen.copied = <tab-slug>`.
- A resolved health issue's section now shows `RESOLVED as of <date>`, following the rule "If resolve date – State it".
- New anchors on the report lines and headings (listed in section 4).
- Already present and unchanged: the three tabs, Ctrl+1/2/3, red and blue lines, and the Flow Sheet button.
- The article's HM rules are shown in Concept Mapping Detail. That window already exists in `DesignerDetailWindow.tsx`, with the Health Maintenance Concept checkbox, the warning text and New Rule / Delete Rule. The Care Plan Tag Template belongs to another stream (CarePlanTemplatesView).

## 2. Deliberately left out
- **New AEFI / Edit AEFI** — the large Edit AEFI form (9e3c48f1). It was not in my brief, and the commands are still inert.
- **Code lookups:** the Agent and Reaction "…" lookups take typed text only. The screen-window slot is single, so a drug lookup would close the dialog.
- **Hyperlinks:** the Agent and Agents hyperlinks in the linked tabs are drawn as links but do not jump to the other folder.
- **Elevate multi-category prompt** — not built.
- **More...** on New Reaction Risk — still inert.
- **Quick Entry** — inert, as instructed.
- **Allergy / Intolerances summary:** the v02.24 capture d7c782c1 shows a summary view with Expand All / Collapse All. The emulator's `allergy` node stays the Reaction Risks window; that was an existing design decision.
- **HM Review:** Print replaces the review window rather than stacking on it. No `[Date Note Documented]` line, and no STI/BBP or INCENTIVE CLAIM sections: only measures are looked up, and those preconditions are undocumented.

## 3. INFERRED
- The No Known message box shown when Reaction Risks already exist. The article gives only the empty-list case, and no confirmation dialog is shown there, so none was added.
- The link pick windows, and the Link to Existing Reaction Risks page.
- The band caption for the Drug Category or Non-Drug radio. Agents are filtered by the Category tick.
- Drop-down entries beyond DRUG ALLERGY, MILD TO MODERATE and SEVERE TO LIFE THREATENING.
- The Category tick is set only for Drug (Category). A Drug (Specific) agent is stored with `str_is_drug` = Y.
- Owned by and Record State on the event Detail tab.
- The Tear Off window, the Clipboard options window, and the "RESOLVED as of" wording.
- All of these are marked in the files' header comments.

## 4. Tutorial-authoring notes

**303131, No Known**
- Node `reaction` (or `allergy`), command `host.mois.command.no-known`, then `host.screen.record = no-known`.
- The mark is `host.mois.field.no-known`.
- Chart 87288 has one allergy. A lesson must Delete Record and Save it first, or No Known opens `host.dialog = no-known-reaction-risks` (OK button: `host.mois.command.ok`).
- To remove the assertion: `host.mois.command.review` opens the `reviewing` dialog. The row is `host.mois.row.review-no-known`, then `host.mois.command.review-delete-no-known`, then `host.mois.command.mark-reviewed`.
- Adding a risk also removes it: `host.mois.command.new-record`, then `host.mois.command.reaction-risk-save`.

**303131, Adverse Event**
- Node `events`, command `new-record`, dialog `new-adverse-event`.
- Tabs: `host.mois.tab.adverse-event-detail` and `adverse-event-linked-reaction-risks`.
- Fields: `host.mois.field.adverse-event-onset`, `-time`, `-type`, `-severity`, `-comment`.
- Agents: `host.mois.command.adverse-event-new-agent` / `-delete-agent`, then `host.mois.field.adverse-event-agent-agent` (and `-brand`, `-category`).
- Reactions: `host.mois.command.adverse-event-new-reaction`, then `host.mois.field.adverse-event-reaction` (the last row's Reaction cell).
- Link mode radios: `host.mois.field.adverse-event-link-none` / `-link-new` / `-link-existing`.
- New-risk form: `host.mois.field.link-risk-onset`, `-agent`, `-type`, `-severity`, `-certainty`, … The existing-risk ticks are `host.mois.field.adverse-event-link-risk-<i>`.
- Ok: `host.mois.command.adverse-event-ok`, then `host.screen.record = saved`.

**303131, folder tabs** (`host.mois.tab.detail` / `agents` / `reactions` / `linked-reaction-risks`)
- Commands: `event-new-agent`, `event-delete-agent`, `event-new-reaction`, `event-delete-reaction`, `link-reaction-risks`, `unlink-reaction-risks`.
- `link-reaction-risks` opens dialog `link-reaction-risks`. Its ticks are `host.mois.field.link-reaction-risks-pick-<i>`, then `host.mois.command.link-reaction-risks-ok`, then `record = linked`.
- The risk side works the same way: tab `linked-events`, commands `link-events` / `unlink-events`, dialog `link-adverse-events`, rows `host.mois.row.linked-event-<i>`.

**303131, Elevate**
- `host.mois.command.elevate-to-risk` opens dialog `elevate-event-to-risk`.
- Radios: `host.mois.field.elevate-specific-drug` / `elevate-category-or-non-drug`. Rows: `host.mois.row.elevate-agent-<i>`.
- `host.mois.command.elevate-ok` gives `record = elevated`. The new risk is then listed under Reaction Risks and on the event's Linked Reaction Risks tab.
- The practice event `practice-ae-1` has a single agent and no Category tick, so it is listed under Specific Drug.

**304722, Health Maintenance Review**
- Open it with `host.mois.openUtility {window:'health-maintenance-review'}`, or Utilities ▸ Health Maintenance Review, or Ctrl+H.
- Tabs: `host.mois.tab.health-maintenance` / `care-plan` / `patient-summary`.
- Colour key: `host.mois.field.hmr-first-missing` (red) and `hmr-first-found` (blue). Lines are `host.mois.row.hmr-<item-slug>`; headings are `host.mois.group.hmr-<heading-slug>`.
- Commands: `host.mois.command.hmr-flow-sheet` / `hmr-print` / `hmr-tear-off` / `hmr-clipboard`. Tear Off and Clipboard are disabled on the Health Maintenance tab.
- Tear Off: dialog `host.mois.dialog.hmr-tear-off` (`host.screen.dialog = hmr-tear-off`), closed with `host.mois.command.hmr-tear-off-close`.
- Clipboard: dialog `hmr-clipboard`, ticks `host.mois.field.hmr-clipboard-clinic` / `-provider`, then `host.mois.command.hmr-clipboard-ok`. After OK, `host.screen.copied = care-plan` or `patient-summary`, and the note appears as `host.mois.field.hmr-copied`.
- Print: `hmr-print` opens `print-preview`.
- HM rules: Administration ▸ Designer Section ▸ Concept Mapping. The existing Concept Mapping Detail window has the Health Maintenance Concept checkbox and the `host.mois.field.hm-warning` / `code-rules` / `text-rules` anchors.

---

# C1 part D: Demographics (301149) and Edit the Chart Summary (303353)

Emulator root: `the emulator`. `tsc` shows no errors in any file I touched. The remaining 11 errors are in other agents' in-progress files: reportSpecs, folderViews.register, PhsaEformWindows. I couldn't do a live browser check because vite stops on another agent's missing `./SummarySettingsView` import in `areaWindows.register.ts`. I did run the Record Filter evaluator on its own against the training chart, and it returns the expected rows.

## 1. What was built

### 301149 Demographics
- **Occupation tab: not added, on purpose.** The article's Occupation captures are v02.20.18. The user's v02.31.23 capture (`reference/demographics-full.png`) and the article's own header capture `466eccb9…` (v02.30.22) both show the tab strip without Occupation. The emulator already matches that strip, so under the brief's version rule it stays as it is. In the current build, occupations (tdt_occupation) are on **Determinants of Health ▸ Employment** (`DeterminantsView`), which is outside my scope. This is explained in a comment above `TABS` in `DemographicsView.tsx`.
- **The Incentive Claims tab keeps its v02.31 caption, "Incentives".**
- **ID Alias entry** (`src/screens/DemographicsView.tsx`, `IdAliasPage`):
  - The Code cell is a PBSelect drop-down listing the Alias ID codes. Picking a code fills an empty Description.
  - Description, Value, Effective and Note are typed in place in the grid.
  - Show On Demo. already worked.
  - The Alias ID Detail **Comment** is now a separate field (`AliasIdEntry.comment`). Before, it was bound to Note, but the field audit lists Note and Comment as separate tdt_alias_id columns.
  - New code list: `src/data/demographic-claim-lookups.ts` (`ALIAS_ID_CODES`: HOSPNO, NHN, RCMP, SIN).
  - Selection Lists ▸ Alias ID now opens a filled list (`MANAGED_LISTS['Alias ID']` in `src/data/adminLists.ts`). This matches the article's "Add to list options" note.
- **Other Claims** (`OtherClaimsPage`):
  - New / Delete work, both on the band and through the command row's New Record / Delete Record.
  - Date Issued, Claim Number and Description are typed in place.
  - Rows are kept on the chart as `Patient.otherClaims`, so Save and Undo cover them.
- **Incentives** (`IncentivesPage`, rewritten in place):
  - New / Delete work on the band and through the command row. Rows are kept as `Patient.incentiveClaims`.
  - Start, End, Diag Code and Freq. are typed in place.
  - The "…" next to Diag Code (or F4) opens an ICD-9 lookup.
  - The "…" next to Fee Code Description (or F4) opens a fee-code lookup. Picking a code fills the fee code, the description and Freq. (mnth).
  - Claim Detail is a memo on the current row.
  - MSP Claim History lists the `sentClaims` for this patient that were billed under the row's fee code. Double-clicking one loads it and opens `sent-claim-detail`.
  - The lookup is a new file: `src/screens/DemographicClaimLookupDialog.tsx` (`IncentiveCodeLookupDialog`, an Advanced Lookup Service in a DemographicModal).
- Types added in `src/data/patients.ts`: `OtherClaimEntry`, `IncentiveClaimEntry`, `Patient.otherClaims`, `Patient.incentiveClaims`, and `AliasIdEntry.comment`.

### 303353 Edit the Chart Summary
- `src/screens/AdminListsView.tsx`: I edited `ChartSummaryConfiguration` and `SectionDetail` in place.
  - **New Record** adds a section right after the current row, with rank 0 and Hide Sensitive ticked, and makes it the current row.
  - While the new row is unsaved, its Section Code is a drop-down. It lists the section codes from the transcribed configurations plus TASK.
  - Every Section Detail field is now controlled and edits the current row: Expand Node, Rank, Banner Colour (with a swatch computed from the PB colour number, so 8421631 → #ff8080), Banner Title, Include All, Hide Sensitive, Record Filter and Red Flag.
  - **Save** (or F2 through the frame's hot key) keeps the list for the session. Undo and Refresh go back to the last save. Delete Record removes the current row.
- New store `src/data/chartSummaryConfig.ts`:
  - Holds the saved configuration for each summary.
  - Runs a Record Filter over the chart's measures. It supports `in`, `=`, `like`, the comparison operators, and / or / not, parentheses, `order by` and `limit`, with straight or curly quotes. A filter using RECENT / REQUIRED, or one it can't parse, returns no rows.
  - `addedSummaryBands` and `withAddedBands` build the Patient Summary bands.
- `src/screens/PatientSummaryView.tsx`: shows each saved **added** MEASURE section as its own band.
  - The band uses the banner title (default MEASURES) and the banner colour.
  - Each row shows Date · Description · Detail (value and units), a monospace "Ref. Range:  lo to hi" line, and the MOIS hyperlink into Measures.
  - A band ranked ≤ 101 goes first and opens; the other bands start collapsed, as in the captures.
- `src/data/summary.ts`: added `SummaryRow.note` and `SUMMARY_LINK_NODES.Measures = 'measures'`.
- `src/data/charts/overlays.ts`: added 4 synthetic INR training measures on chart 87288 (ids `training-inr-1..4`; codes 363 ×3 and 31971 ×1; dated 2026-06..08, all before the pap row).
  - `(str_code in ('363','31971')) order by dtm_collect_date desc, id_measure desc limit 3` returns the 3 newest.
  - `like '%INR%'` also returns 3.

No new tree nodes, menu items or area windows were needed for either article.

## 2. Deliberately left out
- **Occupation tab**: the reasons are above. If a lesson for that part of the article is wanted, it belongs on Determinants of Health ▸ Employment, which another stream owns.
- **No Fee Code column on Incentives**: the v02.31 column set has none, so the fee code is chosen through the "…" next to Fee Code Description.
- **Added sections with codes other than MEASURE** save in the configuration but don't add a band to the Patient Summary. The article only teaches Measures.
- **Red Flag colouring on added bands**: not done. The Red Flag lesson already exists and uses the transcribed MEASURE section.
- **Filter on article's PAPAN example**: the example description `'%PAPAN%'` matches nothing on chart 87288, whose only pap is "BCCA GYNECOLOGICAL CYTOLOGY REPORT". A lesson should use the INR example.

## 3. INFERRED
- The Alias ID list contents. The SIN code is my own.
- Picking an Alias Code fills Description.
- The incentive fee and diagnosis code lists, and their frequencies. Only 14033/12 is captured.
- The lookup window's look.
- Freq. being filled from the chosen code.
- Double-clicking MSP history opens Sent Claim Detail.
- Where New Record inserts the new row (after the current row), and the Section Code drop-down's list.
- An unrunnable filter shows an empty band.
- The INR values and dates.

## 4. Tutorial-authoring notes (anchors and grading)
Screens: Demographics is `host.node = demographic` with its tab strip; Chart Summaries is `host.node = ad-chart-summaries`.

**301149 ID Alias**
- New: `host.mois.command.new-alias`, or command-row New Record.
- The new row is row 1: `host.mois.row.alias-1`.
- Code drop-down: `host.mois.field.alias-code-1` (it has aria-expanded / aria-controls).
- Cells: `host.mois.field.alias-description-1`, `alias-value-1`, `alias-effective-1`, `alias-note-1`.
- Comment: `host.mois.field.alias-comment`.
- Save: command-row Save, or F2.
- Grading: `host.screen.rows` counts the list while the tab is up.

**Other Claims**
- `host.mois.command.new-other-claim` / `delete-other-claim`.
- Rows: `host.mois.row.other-claim-<n>`.
- Cells: `host.mois.field.other-claim-issued-<n>`, `other-claim-number-<n>`, `other-claim-description-<n>`.

**Incentives**
- `host.mois.command.new-incentive-claim` / `delete-incentive-claim`.
- Rows: `host.mois.row.incentive-claim-<n>`.
- Cells: `host.mois.field.incentive-start-<n>`, `incentive-end-<n>`, `incentive-diag-<n>`, `incentive-fee-<n>` (the description cell; F4 works there), `incentive-freq-<n>`.
- "…" buttons: `host.mois.command.incentive-diag-lookup-<n>` and `incentive-fee-lookup-<n>`.
- The lookup is `host.dialog = incentive-fee-code-lookup` or `incentive-diag-code-lookup`. It has a search box (`host.mois.field.<slug>-search`), rows (`host.mois.row.<slug>-<code>`, e.g. `incentive-fee-code-lookup-14033`) and Ok / Cancel (`host.mois.command.<slug>-ok` / `-cancel`).
- Claim Detail: `host.mois.field.incentive-claim-detail`.
- MSP Claim History rows: `host.mois.row.msp-claim-history-<n>`.

**303353 Add specific Measures**
- `host.mois.tree.ad-chart-summaries`, then `host.mois.command.new-record`.
- The new row is `host.mois.row.section-new-1` (`host.screen.row = section-new-1`).
- Section Code drop-down: `host.mois.field.section-code`. Choosing MEASURE reports `host.screen.code = measure`.
- Record Filter: `host.mois.field.record-filter`. `host.screen.filter` reports `code` or `description` (the kind only, never the text).
- Banner title and colour: `host.mois.field.banner-title`, `host.mois.field.banner-colour`.
- Save: `host.mois.command.save` → `host.screen.saved = true`; `host.screen.added` counts added sections.
- Then open Patient Summary on chart 87288. The band is first and open, and its caption is the typed title with `[3]`. Its rows' hyperlinks open `measures`.
- The existing section anchors (`section-measure`, `section-benefit`, `section-notification` and the rest) are unchanged. The existing lesson's `host.screen.row` / `window` reports are also unchanged.

---

# C1 part E — Measures (PHQ-9 send, calculators), Create a PHQ-9 Form, Determinants of Health

Emulator root: `the emulator`. `tsc --noEmit` is clean for every file below. The remaining errors come from other agents' files (Billing, ClinicEditor, UserAgreement). I also smoke-tested the main flows with Playwright on a private copy of the tree, because the shared dev server was broken at the time by another agent's missing `WorkspaceBasketWindows` import:

- **PHQ-9 in Measures:** New Record, `PHQ9`, then the form. All nine answers give total 19. Save Form stamps Last Modified. Close Form puts `19` in Value. Right-click, Create Message, Send msg to patient, Send. The row then shows `O`, highlighted, with the heart icon and the "Sent to patient…" comment.
- **Calculators:** FRS `>30`, PEF `206`, Gestational Age EDC `2019.07.17` with 20.0 weeks, BSA `1.61`. All four match the captures.
- **Determinants:** Update panel, history New, the occupation pick list and the three other tabs all work.

## 1. Per article: what was built

### 302837 Measures
Existing lessons (folder, taskbar, graph, panel, BMI, templates) are untouched. Their anchors still work: `host.mois.dialog.measure-calculator`, `host.mois.command.populate`, `host.mois.command.calculator-save`, `host.mois.field.calculator-height` and `host.mois.field.calculator-weight` are unchanged.

**New Record row in the Measures folder (`src/screens/measuresFolder.tsx`)**
- The blank row is now editable:
  - Code takes a code or quick code; Tab, Enter or leaving the field resolves it.
  - F4 in Code, or the `…` right of Code, opens **Lab Code Selection**.
  - Value is editable. F4 in Value, or the `…` in the unnamed column, opens the measure's form.
  - The unnamed column shows `-` when the measure has no form. After Save Form it shows `.*.`.
- Save (F2) files the row into Measures; Undo and Delete Record discard it.
- `.*.` on a saved row reopens the saved form. This works for session rows, and for the export's own window-100 (BP) and window-104 (PHQ-9) instances.
- Marker logic was corrected: `.*.` now appears when a dform_header hangs off the measure. The old code never matched.

**Shared entry data and store (`src/data/measureEntry.ts`, new)**
- The lab-code list: the article's quick-code table, the PHQ-9 codes 43894/43882/43895/43890, and the encounter measures.
- `MEASURE_FORMS`: 1950 opens the BP form, 43894 opens PHQ-9.
- `QUESTIONNAIRE_CODES`, plus a small per-chart store for the draft row, saved form answers and sent questionnaires.

**Windows (`src/screens/MeasureEntryWindows.tsx`, new, registered in `areaWindows.register.ts`)**

| Window id | What it is |
| --- | --- |
| `lab-code-selection` | Code / Class / Quick Code / Test Name. Search box; the blue headers sort; Select / Cancel. |
| `measure-dynamic-form` | BP or PHQ-9 over the New Record row. Args `{rowId, code}` reopen a saved form. |
| `measure-create-message` | Router. A PHQ-9 questionnaire row goes to `questionnaire-message`; any other row goes to Create New Message. |
| `questionnaire-message` | **New Message** (v02.31.27). See below. |
| `measure-calculator` | Utilities ▸ Calculators … from the folder; files the result as a Measures row. |

`questionnaire-message` contents:
- To button, **Send msg to patient**, and a PATIENT row with the myhealthkey heart.
- **Can reply to msg**, enabled only when sending to the patient.
- Recipient rows, each a drop list plus a red X.
- Subject, and Priority (default Medium).
- Detail, pre-filled with "Test Name: …" and "Date Collected: Mon DD YYYY".
- Linked Chart, Linked Record ("Measurement - record id: …") and Patient Name.
- Send. If the row was still unsaved, Send files it first. The row then shows status `O` highlighted cyan, the heart icon in the unnamed column, and Comments "Sent to patient to complete on Friday, September 18, 2026". A copy also goes to the workspace Sent messages.

**Calculators (`src/screens/MeasureCalculatorBodies.tsx`, new)**
The four calculators beyond BMI are built from their captures, and `MeasureCalculatorDialog` now hands off to them. The old "not built on this stage" placeholder is gone.

| Calculator | Contents | Method | Saves as |
| --- | --- | --- | --- |
| **Framingham Risk Score** | Gender, Age, Smoker, Diabetes, HDL-C, Total Chol, SBP/DBP, Treated / Not Treated, Calculate Score, Reference… link, "Map Score to MOIS Code" | CCS points table | code 1988 |
| **MOIS Peak Expiratory Flow** | Sex, Age, Race, Height with its date, Most Recent, Personal Best, Predicted, the two green "% of" boxes, Calculate, literature links | Hankinson 1999 | code 12577 |
| **Gestational Age** | LNMP, EDC, Current Gest Age, Projection Date / Weeks, As of Date | Calculates from the focused field; Enter or F2 calculates; full decimals show when Current Gest Age is focused | nothing (no Measure Code box) |
| **BSA** | Height and Weight with dates and imperial boxes, BSA, Age, Sex, Average Values, citation | Mosteller | code 34086 |

Every calculator except Gestational Age has Populate (Ctrl+P) from the chart, Save (F2), Cancel and Clear (F5). `data/measures.ts` `calculatorMeasureCode` now uses the captured codes: BSA 34086, Cardiac Risk 1988, PEF 12577, Gestational Age none.

**Menus and record options**
- `src/data/menus/chart-measures.ts`: a Utilities menu with **Calculators ...** (BMI, BSA, Cardiac Risk, Predicted PEF, Gestational Age) was added for the Measures folder. It extends the chart's own Utilities menu. Action ▸ Create Message now opens `measure-create-message`.
- `src/screens/RecordOptionList.tsx`, one line: right-click ▸ Create Message on the `measures` node opens `measure-create-message`.

**Blood pressure form (`src/screens/BloodPressureFormWindow.tsx`)**
Save Form now stamps "Last Modified: date time user" and keeps the window open (302837 `bd504bb6…`).

### 303102 Create a PHQ 9 Form
**The form (`src/screens/Phq9FormWindow.tsx`, new)**
PATIENT HEALTH QUESTIONNAIRE (v1), modelled on `BloodPressureFormWindow`:
- Patient band; Form Date, created by and Provider filled in; Allow other users; Last Modified.
- Question 1, items a–i, verbatim, with 0–3 radios.
- Question 2 (difficulty) with four answers.
- TOTAL SCORE, calculated live.
- Save Form writes the total into Value, sets flag H when the total is over 10, writes the report text, stamps Last Modified and stays open. Close Form closes.
- Field mapping comes from the export's instance: dform 10000484, `num_field_0001..0009`, and `num_fielde_0010` (MOIS's own spelling).

**Where it opens from**
- `MeasureDialogs.tsx` (Measurement Detail, the Encounter ▸ Measurements ▸ New Record path):
  - Quick code `PHQ9` or code `43894` now resolves to PHQ-9 TOTAL SCORE.
  - F4 in Value, or the `…`, opens the PHQ-9 form for 43894 and the BP form for 1950.
  - Save Form sets the value, flag, report and `.*.`.
- `EncounterWindow.tsx` (Measurements tab):
  - The unnamed column on a 43894 row opens the PHQ-9 form. It shows `.*.` once saved.
  - `file()` now carries `report` and `marker`, and filed rows keep their marker.
  - Dialog report `phq9-form`.
- The same form opens from the Measures folder New Record row (302837 above).

### 2593946 Determinants of Health
**The view (`src/screens/DeterminantsView.tsx`, rewritten)**
The old generic layout was replaced with the four captured layouts:
- **Employment:** status EMPLOYMENT STATUS and EMPLOYMENT HOURS.
  - Employment History, with New / Delete and two search boxes that filter the grid.
  - The current row's Start, End and Hrs/Wk are edited in the grid.
  - The Occupation `…` opens a pick list.
  - Total Hrs/Wk for current records.
  - Employer Information: Occupation…, Company, Address ×2, City / Postal Code, Province / Country, Office - Main / Other, Office Fax.
  - General Notes, and Record Created / Last Modified.
- **Education:** status CURRENT EDUCATIONAL ENGAGEMENT and HIGHEST LEVEL OF EDUCATION.
  - Education History, with `…` pickers in the grid.
  - Detail: Educational Institution…, Level of Education…, Institution Category, Completed Date, Enrollment Period … to …, Field of Study…, Enrolled As, Comment.
- **Housing:** status CURRENT LIVING ARRANGEMENT, HOUSING TENURE and PRECARIOUS LIVING CONDITIONS, read from the export's HOUSING STATUS panel where the chart has one.
  - Contact Information as per Demographics (read-only), from the patient.
  - Who Lives with Me: New / Delete, with every cell of the current row editable. Relationship is a drop list. Rows are seeded from the export's `chart_occupant`.
- **Socioeconomic:** the two YES/NO status rows.
- **Every tab:** Update; Trend; Less… / More…. The command row's New Record, Delete Record, Save and Undo act on the current tab's list.

**Data (`src/data/determinants.ts`, new)**
Panel definitions, value sets, pick lists and a per-chart session store.

**Windows (`src/screens/DeterminantWindows.tsx`, new, registered)**

| Window id | What it is |
| --- | --- |
| `determinant-panel` | Update. Panel caption, a Collected date, one drop list per observation, Save Changes (F2) / Close w/o Save. Saving sets Most Recent Value and adds rows to Measures. |
| `determinant-trend` | The values recorded for the panel over time. |
| `determinant-lookup` | The `…` pick lists: Occupation, Educational Institution, Level of Education, Field of Study. |

## 2. Deliberately left out
- **Other dynamic forms** (GAD-7, CAGE, EPDS, SDAI, BPI …). Only BP and PHQ-9 have built forms, so every other code shows `-`, which is the article's "no form" state. A `…` that opened nothing would be a dead control.
- **The patient completing the questionnaire.** No myhealthkey return path is simulated: no Source: myhealthkey, and no values flowing back into Workspace ▸ Basket ▸ Measures (Workspace is another stream's area). The export's PHQ-9 row 504118 already shows a returned-style report.
- **The encounter route for sending.** Create Message from the Encounter Measurements tab (`f036097f…`) is not wired: that grid has no right-click menu, and the Encounter window is shared. The Measures-folder path covers the procedure.
- **Measures Advanced Search** (`fd109301…`, Search-field F4). It is not in my brief, and another agent is changing the Search For band (`SearchForBand.tsx`).
- **Education history as an observation.** Creating an observation automatically from an education history row (level plus date) is not done. The article describes it, but gives no field or code for it.
- **The `All` column's `...` in the PHQ-9 form** is drawn but not wired. Neither the capture nor the text says what it does.
- **Reopening a PHQ-9 saved from the Encounter tab** opens a blank form: encounter-filed rows have no id to key the answers on. Measures-folder rows reopen with their answers.
- **`determinantTabs` in `data/mois.tsx`** was left in place, because `DesignerDetailWindow` still reads it.

## 3. INFERRED
- **Lab Code Selection:** the caption, search box and buttons. Only its rows are captured.
- **New Message:** the overall size and where Send sits, and that the To button adds a recipient row. The Priority list reuses the task priorities.
- **PHQ-9:** question 2's four answers (the published PHQ-9 wording) and the TOTAL SCORE line, both below the capture's scroll. Flag H above 10 comes from the export's range, which tops out at 10.
- **Calculators:**
  - The FRS points table (CCS / D'Agostino). It reproduces the capture's `>30`.
  - The PEF coefficients for Black patients and for men. Only the Caucasian-female result is checked against the capture.
  - The row names PEF and BSA are filed under.
  - The literature links are inert.
- **Determinants:** all value sets and pick lists, and the Employment and Education observation codes (unknown, so they are filed without one). Also the Socioeconomic panel name, all three Determinants windows' layouts, Trend / Less… behaviour, and in-grid editing.
- **Build difference:** New Message is the v02.31.27 window, while this stage follows v02.31.23. It is used only for the PHQ-9 codes; other records keep Create New Message.

## 4. Tutorial-authoring notes

### 303102 (Encounter path)
1. Open the Encounter Detail Window, then its Measurements tab.
2. `host.mois.command.measure-new-record` opens `host.mois.dialog.measurement-detail`.
3. Type `PHQ9` into `host.mois.field.measurement-code`.
4. F4 in `host.mois.field.measurement-value`, or press `host.mois.command.measurement-value-form`, to open `host.mois.dialog.phq9-form`. The frame reports `dialog: 'phq9-form'`.
5. Answer the items: radios `host.mois.field.phq9-{a..i}-{0..3}`, difficulty `host.mois.field.phq9-difficulty-{0..3}`. The total is at `host.mois.field.phq9-total`.
6. Press `host.mois.command.save-form`. The stamp appears at `host.mois.field.phq9-last-modified`. Then press `host.mois.command.close-form`.
7. Press `host.mois.command.measurement-ok`.
8. The grid row's form link is `host.mois.command.measure-form-43894`.

The form reports `phq9Answered`, `phq9Difficulty` and `phq9Saved`.

### 302837 (Measures folder)
**Tree and row**
- Tree: `host.mois.tree.measures`. New Record: `host.mois.command.new-record`.
- Code field `host.mois.field.measure-new-code`; lookup `host.mois.command.measure-code-lookup`, which opens `host.mois.dialog.lab-code-selection`.
- In Lab Code Selection: search `host.mois.field.lab-code-search`, rows `host.mois.row.lab-code-43894`, Select `host.mois.command.lab-code-select`.
- Value field `host.mois.field.measure-new-value`; form link `host.mois.command.measure-value-form`.
- Save: `host.mois.command.save`. The draft row is `host.mois.row.measure-new`; a saved `.*.` link is `host.mois.command.measure-form-<id>`.
- The folder reports `draftCode`, `draftForm` and `questionnairesSent`.

**Send a questionnaire**
1. Right-click the row (`host.mois.row.measure-new` or `host.mois.row.measure-<id>`). The menu item is `host.mois.menu.context.create-message`.
2. `host.mois.dialog.questionnaire-message` opens. Its controls:
   - `host.mois.field.send-msg-to-patient`
   - `host.mois.field.can-reply-to-msg`
   - `host.mois.field.message-subject`
   - `host.mois.field.message-priority`
   - `host.mois.field.message-detail`
   - `host.mois.command.message-to`
   - `host.mois.field.message-recipient-0`
   - `host.mois.command.message-send`
3. After sending, the status cell is `host.mois.field.measure-status-<id>`. Filed rows get ids from 590001 upwards.

**Calculators**
- Open: `host.mois.menu.utilities`, then `host.mois.menu.utilities.calculators`, then `host.mois.menu.utilities.{bmi|bsa|cardiac-risk|predicted-pef|gestational-age}`. All open `host.mois.dialog.measure-calculator`.
- Shared buttons: `host.mois.command.populate`, `.calculator-save`, `.calculator-cancel`, `.calculator-clear`.
- FRS:
  - fields `host.mois.field.frs-{male,female,age,non-smoker,smoker,no-diabetes,diabetes,hdl,total-chol,systolic,diastolic,treated,not-treated,score}`
  - buttons `host.mois.command.calculate-score`, `host.mois.command.frs-reference`
- PEF:
  - fields `host.mois.field.pef-{male,female,age,caucasian,black,height,recent,best,predicted}`
  - button `host.mois.command.pef-calculate`
- Gestational Age:
  - fields `host.mois.field.gestation-{lnmp,edc,current,projection-date,projection-weeks,as-of}`
  - button `host.mois.command.gestation-calculate`
- BSA fields: `host.mois.field.bsa-{height,weight,result}`.
- Each calculator reports `calculator: <slug>`.

### 2593946 (Determinants)
**Getting there and the status panel**
- Tree: `host.mois.tree.determinants`. Tabs: `host.mois.tab.{employment,education,housing,socioeconomic}`.
- Status panel: Update `host.mois.command.determinants-update`, Trend `host.mois.command.determinants-trend`, Less/More `host.mois.command.determinants-less` / `-more`.
- Status rows `host.mois.row.determinant-<name-slug>`; the group is `host.mois.group.determinants-status`.

**Update panel**
- Opens as `host.mois.dialog.determinant-panel`.
- Collected date `host.mois.field.determinant-collected`; one drop list per observation at `host.mois.field.determinant-<obs-slug>` (for example `determinant-employment-status`).
- Save `host.mois.command.determinant-panel-save`, Close `host.mois.command.determinant-panel-close`.

**History bands**
- New / Delete: `host.mois.command.{employment,education,occupants}-new` and `-delete`.
- Rows: `host.mois.row.{employment,education,occupant}-<i>`.

**Employment fields**
- `host.mois.field.employment-{start,end,hours,company,address,phone,notes,search-occupation,search-company}`
- Occupation pickers: `host.mois.command.employment-occupation-lookup` (grid) and `host.mois.lookup.employment-occupation` (detail).

**Education fields**
- `host.mois.field.education-{institution,level,category,completed,start,stop,field-of-study,enrolled-as,comment,search-institution,search-level}`
- Grid pickers: `host.mois.command.education-{institution,level}-lookup`.

**Housing fields**
- Group `host.mois.group.housing-contact`.
- `host.mois.field.occupant-{start,stop,relationship,quantity,note}`.

**Pick list and trend windows**
- `host.mois.dialog.determinant-lookup`: rows `host.mois.row.determinant-pick-<slug>`, Select `host.mois.command.determinant-lookup-select`.
- `host.mois.dialog.determinant-trend`: Close `host.mois.command.determinant-trend-close`.

**Report fields**
The view reports `determinantsTab`, `employmentRows`, `educationRows`, `occupantRows`, `observationsRecorded`, `statusCollapsed` and `dirty`.

## Files
New:
- `src/data/measureEntry.ts`
- `src/data/determinants.ts`
- `src/screens/Phq9FormWindow.tsx`
- `src/screens/MeasureEntryWindows.tsx`
- `src/screens/MeasureCalculatorBodies.tsx`
- `src/screens/DeterminantWindows.tsx`

Edited:
- `src/screens/measuresFolder.tsx`
- `src/screens/MeasureDialogs.tsx`
- `src/screens/BloodPressureFormWindow.tsx`
- `src/screens/EncounterWindow.tsx` (Measurements tab only)
- `src/screens/DeterminantsView.tsx` (rewritten)
- `src/screens/RecordOptionList.tsx` (one line)
- `src/data/menus/chart-measures.ts`
- `src/data/measures.ts` (calculator codes)
- `src/screens/areaWindows.register.ts` (two imports)
