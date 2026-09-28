# Build report — stream C2-meds-private-eforms

Emulator: `the emulator`. `npx tsc -p tsconfig.json --noEmit` shows no errors in any C2 file. The errors that remain belong to other streams' work in progress. I smoke-tested the flows in Playwright against a Vite dev server on chart 87288: the MAR (new order, drug lookup, sign order, the Administer fly-out, Witness closing a dose), private notes (Break Glass, Make Private, View Access), the Rx paper clip leading to the Paxlovid eForm, the controlled-prescription (CPP) prescribing, preview and print windows, the Active ENC# picker, and the admin and Workspace Private Notes views. There were no page errors.

## 1. What was built, by article

### 303427 Medication Administration Record
- **`src/screens/MarView.tsx`** (rewritten; the existing anchors and behaviour are kept):
  - **Views:** Grid View added (medications × administration times, cell statuses, Asc/Desc, and << < > >> paging). With System Settings `MAR Ordering`=OFF, View ▾ drops Group by Parent Order.
  - **Filters:** Record Status "…" opens a Multi-Value Selection. Search For and Record Limits (Last 10/20) now filter.
  - **Right-click menu** is context-sensitive:
    - on a SCHEDULED dose: Dispense · Administer ▸ (Administered / Witnessed / Self-Administered / Other Provider) · Reschedule · Cancel, then Create Task… View Recalls;
    - on any other dose: Tag to Care Plan.
  - **Open Record / double-click** on a SCHEDULED dose opens the Scheduled Record.
  - **New …** routes all eight choices. Each dose action closes its dose off, and a reschedule adds the replacement dose.
  - **Maintenance ▸ Save Window Options as My Defaults** stores the view and filters (session key `mar:defaults`).
  - **MAR Require Encounter**=YES with no active encounter raises an error box (`mar-require-encounter`).
- **`src/screens/MarWindows.tsx`:**
  - `MAR_CHOICES` now carries a kind and an accelerator letter. The chooser has underlined mnemonics and handles the A/H/O/R/I/C/W/S keys, so Ctrl+N followed by a letter works. With `ordering` off it shows only the four choices captured with MAR Ordering off.
  - `MarRecordWindow` adds the Witness, Self-Administered and History variants (Action and Given By defaults, "Accurate to the", Location, Ordered By Unknown).
  - The Medication field's "…" / F4 opens the lookup, and friendly-name matching turns `td` into Td.
  - The Series Number field is anchored, and the ENC# line shows the active encounter.
- **New `src/screens/MarActionWindows.tsx`** — screen windows:
  - `mar-new-order` (Sign Order / Save Order; Save Order leaves doses NOT SCHEDULED)
  - `mar-reschedule`
  - `mar-not-given` (Action, Reason, and the Create a Preference buttons)
  - `mar-scheduled-record` (its own menu bar plus seven action buttons)
  - `mar-drug-code-lookup` (code system, reference set, red filter bar, Agent Name)
  - `mar-record-status`
  - `mar-save-window-options` (a command slot)
  - `mar-require-encounter`
- **New `src/data/marDrugCodes.ts`:** the drug-code catalogue.
- **`src/screens/RowContextMenu.tsx`:** fly-out submenus added (additive only).
- **`src/data/mois.tsx`:** Maintenance ▸ Save Window Options as My Defaults, enabled only on the `mar` node.

### 303227 Prescriptions
- **Controlled prescriptions** — new `src/screens/ControlledRxWindows.tsx`:
  - `cpp-prescribing`: the web-style "MOIS" window with Show/Hide preview and the BC CPP sheet.
  - `cpp-print`: two sheets (the second stamped DUPLICATE), the signature pad, Clear Signature and Print.
  - `rx-new-historical`: a command slot.
  - `ControlledRxRecordBlock` and `SelectPrescriptionWindow` (`select-controlled-rx`) handle Folio Number and Signing Method.
  - `useControlledRx()` reads the CPP RX System Settings rows plus the special function.
- **`MedicationView.tsx`:**
  - Rx Wizard on a Schedule 1A drug (with the feature on and the user permitted) opens the CPP window instead of the Dose Wizard. Save files a Type CPP row.
  - Record ▸ New Historical starts an HX row, which becomes CPP HX when a Schedule 1A drug is picked.
  - The paper-clip cell is double-clickable (see the eForms section) and its count includes this session's attachments.
  - Print Hx ▸ Preview on a signed print asks "Completed Task?".
- **Pharmacy selection** (`PrescriptionPrintWindows.tsx`): "Add One" opens the existing Address Book for Pharmacy List. The picked pharmacy joins the drop-down, and the signed print uses it. With no pharmacy on file the band reads "No pharmacy on file."
- **Electronic signatures:** the existing Please Sign / Sign and Task chain is kept.
- **Attach Files** (`AttachmentUtilityViews.tsx`): TYPE gains "Controlled Rx", with Find Controlled Rx → Select Prescription → Folio Number and Signing Method. Attach files the attachment on the Rx row.
- **Enabling:**
  - `data/userManagement.ts` Special Functions gains Make Private Notes, Break Glass Private Notes, Can create controlled prescriptions and OAT Prescribing.
  - `UserAccessTabs.tsx`: the Execute ticks are now interactive and persisted (session key `admin:special-functions`), and the Window Access ticks are interactive.
  - The System Settings rows are E2's and are only read (new `src/data/accessSettings.ts`).
- **Drug catalogue** (`data/medications.ts`): the Dilaudid/hydromorphone run from the capture, plus methadone, buprenorphine, Paxlovid and apixaban.
- **Record ▸ New Historical** menu item (`data/mois.tsx`), enabled only on `rx`.

### 3001611 Paxlovid / 3001613 Special Authority eForms
- **`data/chartUtilities.ts`:** a "PHSA eFORMS" band in Add Attachment holding *REQUEST SPECIAL AUTHORITY (BY MEDICATION)* and PAXLOVID PRESCRIPTION.
- **`AddAttachmentDialog.tsx`:** Ok on a PHSA row opens the eForm Browser.
- **New `src/screens/PhsaEformWindows.tsx`** — area window `phsa-eform` (args `form` = special-authority | paxlovid, and `target`):
  - Patient and Prescriber panels pre-filled from the chart.
  - The Special Authority searchable medication list, with follow-up questions once a drug is picked.
  - Paxlovid's Prescription section (kidney function, Fax to location, the fax checkboxes, callback number) and Signature browse.
  - Submit / Save Draft / Download Draft PDF. Submit increments the paper-clip count on the record the form was opened from.
- **Routes in:**
  - Rx New Record → "…" drug lookup → double-click the paper-clip "-" (anchor `host.mois.cell.rx-attachment`) → Add Attachment → PHSA eFORMS.
  - Encounter ▸ Action ▸ Attachments → the same band.

### 3799725 / 3799734 / 3799750 Private Progress Notes
- **New `src/data/privateNotes.ts`** (a store, not a chart overlay): access-control model, directory, permission checks, and a training seed:
  - chart 87288, encounter 530235: LOCKHART's note is private, Break Glass open to Authorized Users;
  - chart 87288, encounter 530241: MEYER's note is private with Break Glass set to Nobody.
- **New `src/screens/PrivateNoteWindows.tsx`** — area windows:
  - `private-note-access`: the Access Control list with Show Stopped and Add/Delete/Edit, greyed for anyone who is not the owner or directly added.
  - `private-note-access-edit`: modes make-private / add / edit / grant. It covers Applies to, Duration, Reason, and the Break Glass settings (owner only), plus alert Method and Priority. It shows the transcriptionist Yes/No prompt and the grant warning.
  - `private-note-break-glass`: Temporary Access with reason, note and duration.
  - `private-note-blocked`
  - the MOIS - Search Window
  - `usePrivateNoteBand` and `usePrivateNoteMask`
- **`EncounterWindow.tsx`** (small edits in ProgressNotePage and the call sites):
  - the Make Private, View Access and Break Glass buttons;
  - the yellow band reading "This is a private note.";
  - the "<NAME> has marked this note private." line for readers without access;
  - Encounter Summary and Print Note show the private line in place of the text.
- **New `src/screens/PrivateNotesViews.tsx`** — folder views:
  - `ws-private-notes` (Workspace ▸ Other ▸ My Private Notes: Review Access, Open Encounter)
  - `ad-private-notes` (Administration ▸ Chart Access Control ▸ Private Notes: User filter, grouped list, Review Access, Open Encounter)
  - Grant Access flow: confirm → search → record → warning.
  - Change Owner flow: confirmation → provider consent → patient consent → search.
  - Screen windows `private-grant-*` and `private-owner-*`.
- **Tree nodes** (`data/mois.tsx`): `ws-other` / `ws-private-notes` and `ad-access-control` / `ad-private-notes`.
- **Admin permissions:** the Special Functions rows (above) and the Window Access rows (Chart Access Control ▸ Private Notes, Workspace ▸ Other ▸ My Private Notes).

### 3073634 Requisitions – Embedded Mode
- `PaperFormsView.tsx`: the viewer now follows System Settings `MOIS Viewer Mode`. E or SI opens it embedded (the default), S opens the standalone viewer. The row itself is E2's.

### 303793 Add Attachments
- **Active ENC# ellipsis:**
  - `pb/components/banners.tsx`: `PBActiveEncounterContext`, and the "…" is anchored `host.mois.lookup.active-encounter`.
  - New `src/screens/ActiveEncounterWindow.tsx`: area window `active-encounter-list` (Clear Encounter / Continue / Cancel / New Encounter) and `ActiveEncounterProvider`, mounted in `MoisClassicShell.tsx`.
  - `host/encounterArea.tsx`: `activeEnc`, `attachmentEncounters` and `activeEncounter`.
  - Every identity strip that passes "NO ENCOUNTER" now shows the active encounter. Attachments made while an encounter is active are associated with it.
- **Second and later attachments:** new `src/screens/AttachmentListWindow.tsx` (Document / Attachment List: New Record, Add Attachment, …). `AddAttachmentDialog` shows it first when the target already has an attachment.

## 2. Deliberately left out
- **CPP Rx printer row** in Maintenance ▸ Computer Settings: that window (`ComputerSettingsWindow.tsx`, `data/adminConfig.ts`) belongs to another stream and is still in progress. Its owner needs to add `CPP Rx` to `PRINTER_KINDS`.
- **The 2.30.21 "Preview / Print to: Rx Printer" window after Sign and Print:** adding it would break the existing tutorial that checks Accept → printed. The user's v02.31.23 capture #44 prints on Accept, and the user's build wins.
- **Listing the eForm copy in Patient Chart ▸ Documents:** Documents is rendered by `ClinicalReportView`, which is another stream's file. Filed eForms are kept in `useFiledEforms()` (session key `phsa-eforms:<chart>`) for that owner to merge.
- **Chart Access Control ▸ Management and Break Glass Audit nodes:** not part of these articles.
- **The Preferences window pre-filled from Not Given:** not built. The Directive / Contraindicated / Not Indicated buttons are toggles, reported as `host.screen.marPreference`.
- **Break Glass notifications landing in the Workspace inbox:** that is stream D's work.
- **Private-note text in care plans, letters and reports** outside the encounter window: those belong to other streams.
- **The restart after changing MOIS Viewer Mode:** not modelled.
- **An Encounters-list Report tab showing private notes:** not present in the emulator.

## 3. INFERRED
- **Active Encounter picker:** layout copied from the Preferences Change Encounter picker.
- **MAR lists:** Frequency, Duration units, and the Reschedule and Not Given reasons. The Grid View's colours and paging are also inferred.
- **MAR Require Encounter error:** wording.
- **Drug codes:** those not in the tetanus capture.
- **Schedule 1A drugs:** identified by ATC code (N02AA03, N07BC01, N07BC02).
- **CPP window:** its dropdown lists. The prescriber id "42-90210" is taken from the capture.
- **Paxlovid form:** heading and panels. Special Authority's follow-up questions, the Submit confirmation, and a 1-second pre-fill delay.
- **Workspace My Private Notes layout:** inferred from the admin view.
- **Search Window buttons:** Select / Cancel.
- **Blocked text** for a user without the Break Glass special function.
- **Private-note seeds** (a training overlay in `privateNotes.ts`).
- **Special function defaults:** all four new functions start ticked, following the User Account capture.

## 4. Tutorial-authoring notes (anchors and window ids)
- **MAR (303427)**
  - node `mar`; `host.mois.command.new` (Ctrl+N), then letter keys, or `host.mois.field.mar-choice-{administer|history|order|reschedule|immunization|not-given|witness|self}` + `host.mois.command.mar-continue`
  - `host.mois.lookup.mar-medication` → `mar-drug-code-lookup`: `host.mois.field.mar-drug-search`, `…mar-code-system`, `…mar-reference-set`, `host.mois.command.mar-drug-ok`
  - order window: `host.mois.command.mar-sign-order` / `mar-save-order`, fields `mar-order-{dosage,frequency,duration,duration-unit,route,start}`
  - `host.mois.field.mar-series`, `mar-given-by`, `mar-accurate-to`, `mar-location`, `mar-action`; `host.mois.command.save-and-close` / `save-and-duplicate`
  - rows `host.mois.row.mar-scheduled-<yyyy-mm-dd>`; right-click `host.mois.menu.context.{dispense|administer|reschedule|cancel}` and `…context.administer-{administered|witnessed|self-administered|other-provider}`
  - Scheduled Record `host.mois.command.mar-dose-<action>`; `mar-reschedule-save`, `mar-new-date` / `mar-new-time`, `mar-not-given-action`, `mar-not-given-save`, `mar-preference-<kind>`
  - `host.mois.lookup.mar-record-status` → `host.mois.cell.mar-status-<code>`, `mar-status-ok`; `host.mois.field.mar-view` / `mar-grid-asc` / `mar-grid-desc`; `host.mois.menu.maintenance.save-window-options-as-my-defaults`
  - graded state: `host.screen.record` (e.g. order-signed, witnessed, rescheduled, dispensed, refused, defaults-saved) and `host.screen.marView`
- **Prescriptions (303227)**
  - CPP: `host.mois.command.rx-wizard` → `host.mois.field.drug-brand` → `drug-lookup-ok` → dialog `cpp-prescribing` (`host.mois.field.cpp-{start,amount,forn,units,route,frequency,witness,carries,comment}`, `host.mois.command.cpp-{save,print,show-preview,cancel}`) → `cpp-print` (`host.mois.field.cpp-signature-pad`, `host.mois.command.cpp-print-sheet` / `cpp-clear-signature`); record `cpp-saved` / `cpp-printed`
  - Historical entry: `host.mois.menu.record.new-historical`
  - Pharmacy: `host.mois.command.add-one` → `address-book`, `host.mois.field.pharmacy`, `pharmacy-include`
  - Attach Files: `host.mois.field.record-type` = Controlled Rx, `host.mois.command.find-controlled-rx` → `select-prescription`, `host.mois.field.folio-number` / `signing-method`
  - Print Hx completed-task box: `rx-completed-task`
  - Enabling: `host.mois.cell.execute-can-create-controlled-prescriptions`
- **eForms (3001611 / 3001613)**
  - Paper clip: `host.mois.cell.rx-attachment` (double-click) → `host.mois.row.form-paxlovid-prescription` or `host.mois.row.form-request-special-authority-by-medication` → `host.mois.command.add-attachment-ok`
  - eForm Browser, dialog `phsa-eform`: `host.mois.field.eform-medication`, `…eform-medication-search`, rows `host.mois.row.eform-med-<slug>`, `…eform-request-*`, `…eform-kidney-{normal|reduced}`, `…eform-fax-location`, `…eform-type-fax`, `host.mois.command.eform-{browse,submit,save-draft,download-draft-pdf,close}`
  - graded state: `host.screen.eformStatus`
  - From an encounter: `host.mois.encounter.menu.action.attachments`
- **Private notes (3799725 / 3799734 / 3799750)**
  - Encounter: open encounter `530235` (Break Glass allowed), `530241` (Blocked by Author), or any encounter where a new note is saved (Make Private)
  - Buttons: `host.mois.command.make-private` / `view-access` / `break-glass`; band `host.mois.group.private-note-band`
  - Dialogs `private-note-access-edit`, `private-note-access`, `private-note-break-glass`, `private-note-blocked`, `private-note-transcriptionist`
  - Fields `host.mois.field.private-{start,stop,note,breakglass-authorized|selected|nobody,alert,method,priority,reason,additional-note,duration-just-today…,show-stopped}`; commands `host.mois.command.private-{add,delete,edit,close,continue,cancel,select,select-users,search-select}`
  - graded state: `host.screen.privateNote` (none / private / readable)
  - Workspace: node `ws-private-notes` (under `ws-other`)
  - Admin: node `ad-private-notes` (under `ad-access-control`), `host.mois.field.private-notes-user`, rows `host.mois.row.private-87288-530235`, dialogs `private-grant-confirm`, `private-owner-confirm`, `private-owner-provider-consent`, `private-owner-patient-consent`, `mois-search-window`
  - Permissions: `host.mois.cell.execute-access-control-make-private-notes` / `…-break-glass-private-notes`, `host.mois.row.window-private-notes`, `host.mois.row.window-my-private-notes`
- **Requisitions (3073634):** the System Settings row `mois-viewer-mode` (E2's window); `host.screen.viewerEmbedded` follows it.
- **Attachments (303793)**
  - `host.mois.lookup.active-encounter` → `active-encounter-list` (rows `host.mois.row.active-enc-<id>`, `host.mois.command.active-enc-{continue,clear,new,cancel}`); graded state `host.screen.activeEncounter`
  - Second attachment: Encounters row with an attachment → Attachment → dialog `attachment-list` (reported as `host.screen.dialog`) → `host.mois.command.attach-list-new-record` → `attach-list-add-attachment`
- **Tree gotcha:** new folders start collapsed (`ad-access-control`, `ws-other`), so a lesson must expand them (select the child node, or double-click the folder) before stamping child anchors.
