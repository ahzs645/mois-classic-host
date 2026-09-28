# Build report — stream C3-letters-documents

Emulator: `hosts/mois-classic`. `npx tsc -p tsconfig.json --noEmit` is clean. I ran a Playwright smoke test against `vite` on :5391 (scripts `/tmp/mcov/c3/smoke*.mjs`, screenshots `/tmp/mcov/c3/s*.png`). It covered: Respond → Send → Distribute → Links, Respond to Order, Attached Letters → continue a letter, Letter Writer Insert/Table/Format/Paste/Save, Distribute with FAX (QUEUED), Letter Templates → Edit → New Letter → designer (Add Field, Add Tag, header, Delete removes a tag, Save), and Print ▸ Cumulative Lab Data. All steps pass. `pnpm vitest run lib/host-emulators/__tests__/mois-classic-stage.test.tsx` passes 260/260.

## New files
- `src/data/letterDocs.ts` holds the session stores (frame-scoped `useSessionState`):
  - template bodies and template meta;
  - letters attached to Orders, with training seeds on orders 522665 (UNDISTRIBUTED) and 522664 (DISTRIBUTED, plus its seed distribution);
  - Information Request responses;
  - eFax accounts (seed "Test" 139663), the SRFax fax log, and Documents distributions;
  - the Add Database Field catalogue, the tag→token map, and the graph clipboard;
  - settings readers built on E2's `useSystemSetting` (`referral-mode`, `VIEWER_MODE_ROW`, `SRFAX_ENABLED_ROW`).
- `src/data/printPagesChart.ts` has the builders for Cumulative Lab, Lab Code, Lab Profile, Reminder List, Clinical History Tabular, Clinical Summary and Access List.
- `src/screens/LetterEditorDialogs.tsx`:
  - the word-processor dialogs as specs;
  - a Print window (303589 `87ae0c73`);
  - `NewLetterDialog` (303101 `01d1c6cc`/`d4e452ef`).
- `src/screens/LetterTemplateCanvas.tsx` is the template designer page: `useTemplateDesign`, `TemplateCanvas`, `TemplatePreview`.
- `src/screens/LetterTemplateWindows.tsx` registers the area window `letter-template-designer`.
- `src/screens/LetterResponseWindows.tsx` registers area windows `attached-letters`, `respond-to-order` and `send-document`, and exports `useRespondToOrder` and `useResponseLinks`.
- `src/screens/StandardReferralWindows.tsx` registers the area window `referral-note-report` (Standard Mode Referral Note, whose Preview opens a Richtext Report).
- `src/screens/PaperFormAdminWindows.tsx` has `NewPaperFormDialog` and `ExportPaperFormsDialog`.
- `src/screens/ViewerWindows.tsx`:
  - `SendEfaxWindow`;
  - `CustomizeToolbarsDialog`;
  - `ViewerBottomToolbar`;
  - area windows `send-efax` (also used by E2's Inbound Documents, which passes `args.files`) and `fax-queued`.
- `src/screens/EfaxAccountsView.tsx` is the folder view for tree node `ad-efax` (eFax Account List).
- `src/screens/documentsDistribution.tsx` is the Documents hook: Distribute, an editable Document Type, the Distribution tab, and filed PHSA eForms (C2's `useFiledEforms`) as extra rows.

## Edits to existing files
All edits were small and made after re-reading the file.
- **Letter files (mine):**
  - `data/letterFlow.ts`: new doc types `misc`/`note`/`notification`/`patient-summary`, `DOC_TYPE_OF`, new flow fields, `setCurrentOrder`/`currentOrderId`.
  - `data/letterWriter.ts`: all seven menus, the template rail wording from the v2 captures, BPMH and other selection lists.
  - `LetterWriterWindow.tsx`, `LetterWindows.tsx`, `LetterFlow.tsx` (the picker lists designer-saved templates).
- **Designer:**
  - `DesignerDetailWindow.tsx`: Letter Template Detail shows the saved template and Edit → New Letter → designer; a newly registered paper form has blank field assignments.
  - `DesignerSectionView.tsx`: Paper Forms New Record and Export Forms.
  - `data/designerSection.ts`: more template Types.
- **Print:** `PrintFlow.tsx` (new `radio` field kind) and `data/printReports.ts` (seven rows).
- **Viewer:** `MoisViewerWindow.tsx`.
- **Other streams' files:**
  - `OrderView.tsx`: Respond, publishing the current order, response Links, seed distribution.
  - `ClinicalReportView.tsx`: the Documents hook.
  - `MedicationView.tsx`: after Sign and Fax, opens `fax-queued`; Print History's Distribution tab is Date · Pharmacy · Fax · Status with QUEUED.
  - `MeasurementGraphWindow.tsx`: Copy to Clipboard also sets the letter clipboard.
  - `data/charts/overlays.ts`: training order `training-info-request-2961349`, dated 2025/09/08 so it lists last.
  - `data/mois.tsx`: a comment only.
  - `areaWindows.register.ts`, `folderViews.register.ts`.

## 1. Articles

- **303101 Letter Templates:** Letter Template List → Edit Record → Letter Template Detail (Letter Preview shows the saved body) → Edit → New Letter.
  - New Letter has the three options. "from a MOIS template" lists the templates; "from an existing file" shows the Choose File band with File Name and Browse.
  - Continue opens `letter-template-designer`, the Letter Writer in template mode. Its rail:
    - Help?;
    - Add Database Field: Source → Field follows the Source; Add Field;
    - Remove Field: Delete Field; a double-click on a field raises its prompt;
    - Add Tag: Source, Add Tag;
    - Remove Tag: highlight the tag, then Delete or Edit ▸ Cut.
  - Insert ▸ Header / First Page Header / Footer / Page Number work in the designer.
  - Save stores the body and the template's type. The new template then appears in Select Letter Template and in the Send window's Use a Letter Template.
  - Import is the file option; it loads a sample .docx body.
  - Document Type comes from New Letter Template Type, which now also offers INFORMATION REQUEST, NOTE, NOTIFICATION and PATIENT SUMMARY.
- **3785340 BPMH:**
  - The `BPMH` tag in Add Tag puts `<BPMH>` in the template.
  - "BPMH LIST" in the Letter Writer's Add Table of Records lists the chart's LT meds (overlay rows) in the Selection Window.
- **304753 CDX (templates):** covered by 303101. The header comes from Insert ▸ Header. Populators such as Desktop Provider → Provider Letterhead 1–5 and Record Information → Recipient Name / Record Report/Comment are in the catalogue.
- **304687 Letter Writer:**
  - The menus are wired:
    - File: Load Template/File, Page Setup, Print Preview, Print/Print To, Distribute, Close.
    - Edit: Undo/Redo of inserts, Cut/Delete, Paste (graph), Find, Replace, Hyperlink, Target.
    - View: Page/Outline, Control Characters, Zoom.
    - Insert: headers and footers, Page Number, Image, Object, Break.
    - Format: every dialog listed.
    - Table: Insert Table and Rows, Delete, Merge, Split, Select, Gridlines, Properties.
    - Action.
  - Command row: Link to Order raises the Order Linking Service, Spelling opens the Spelling dialog, and Save files the letter UNDISTRIBUTED on its Order.
  - Rail:
    - Re-populate buttons report `letterRepopulated`;
    - Paste Provider Data goes through the Master Provider List;
    - Paste Patient Data, Paste Care Plan, Paste Progress Note and Insert Signature each add a block;
    - Add Detail and Add Table work for more lists.
  - Graphs (304699): graph Options ▸ Copy to Clipboard, then Letter Writer Edit ▸ Paste inserts the SVG.
  - Right-clicking a table offers Delete Row / Delete Column / Cut.
- **303589 Create a Referral Letter:**
  - **Undistributed / distributed letters:** Order Detail's Create Referral Note… on an order with letters opens `attached-letters`.
    - Continue an Undistributed Letter opens the Letter Writer on that letter.
    - Correct a Distributed Letter makes a copy. Distributing it adds a second "(CORRECTED)" distribution to the Order.
  - **Create Distribution:** now shows the Preview pane (viewer toolbar, Filesize, Print) for Letter Writer letters. Method can be CDX/FAX/MAIL/PRINT/INTERNAL. Distribute (F2) sends immediately and closes the writer; the "CDX Messaging — Initializing" splash (2961349 `d7d34094`) is not drawn, because lessons check straight after the press.
  - **Standard Mode:** with APP SETTING Referral Mode = S:
    - Create Referral Note opens Order Detail on the Orders folder's current order.
    - That window has Standard Mode's footer and the Appointment Booking group.
    - Print opens `referral-note-report` (Include/Detail tabs and grid). Preview… and Preview Report Only… open a Richtext Report.
- **304753 CDX Secure Messaging:** outbound letters use the above. The rest was already covered.
- **2961349 CDX Information Request:**
  - The training order "INFORMATION REQUEST" (MISC, from ORTHO, JANE) is in Orders.
  - Respond opens `send-document`. The first time it goes straight there; after that it goes through `respond-to-order` (Create a New / Continue an Undistributed / Correct a Distributed Response).
  - `send-document` has:
    - the Document Type DDDW (MISC/NOTE/NOTIFICATION/PATIENT SUMMARY) and "In Response to Order #";
    - Send As (template only if one exists for that type);
    - Text and Labels, and Paste Care Plan (Report Letterhead).
  - Next goes to the Letter Writer or Create Distribution. A distributed response appears on the order's Links tab as DOCUMENT.
  - Sending a Notification: Documents → New Record → Distribute opens Send with NOTIFICATION.
- **303445 Documents:**
  - The current row's Document Type is a DDDW.
  - Distribute on a PAPER FORM shows a refusal box. After changing the type to MISC, Distribute opens Send (MISC, Recipient from the record) and then Create Distribution.
  - The Distribution tab lists what was sent, with the count in its caption.
  - Filed eForms appear as rows.
- **680492 Print Menu:** new rows in `printReports` open through the existing Print menu items:
  - Cumulative Lab Data: date range plus the three-way Output radio.
  - Lab Code: Code lookup.
  - Reminder List: Contains, Current/Stopped/All.
  - Clinical History Tabular.
  - Clinical Summary: no parameters.
  - Access List: Chart plus date range. It is built from the export's own create/modify stamps.
  - Lab Profile: row only, not on the menu (see section 2).
- **304734 MOIS Viewer:**
  - Typing in a field makes the form dirty and enables Save (the button and File ▸ Save F2).
  - View ▸ Toolbars lists all 13 toolbars with ticks, Customize Toolbars…, and Properties Toolbar.
  - A third toolbar row holds Find, Rotate View, Links, Measuring and Properties; the bottom toolbar holds Options ▾, Show Fields Pane, the Highlight Form Fields menu, Pages Navigation, Pages Layout and Launch.
  - The Fields pane can be toggled.
  - Customize Toolbars has Toolbars, Commands and Options tabs, and commands can be dragged onto toolbar row 1.
  - The defaults keep the captured build's look: File, Standard, Zoom and Markup are shown.
  - Viewer Mode is only referenced (E2).
- **2616562 SRFax:**
  - **eFax Accounts** (`ad-efax`): New Record, Delete Record, Save, Close, edited inline.
  - **Viewer Fax button:** shown when `embedded` and SRFax Enabled = Y. It opens Send eFax: account band with Change…, Recipient List with New/Delete, the "…" Address Book, then Send → "Success: Fax Queued".
  - **Letter Writer e-fax:** Create Distribution with Method FAX → QUEUED status plus the queued box.
  - **Prescriptions:** Sign and Fax → queued box, and a Print History Distribution row reading QUEUED.
  - Enabling SRFax itself is E2's setting.
- **303112 Paper (PDF) Forms:**
  - Export Forms: File (7z) Browse, a ticked form list, Ok → exported message.
  - New Record registers your own PDF: File (PDF) Browse. The second pick has duplicate field titles and is refused. Name, Code, Description, Author and Group follow; Create Record opens Paper Form Detail with blank assignments.
  - Signing: the Sign Document or Pencil tool, then a click in the signature field signs it, then Save.
  - Custom format (1849083) happens outside MOIS. Its MOIS step is the existing Import Forms.

## 2. Deliberately left out
- **Lab Profile for Patient on the Print menu:** the user's v02.31 capture (`reference/menus/print.png`) does not have it, so the current build wins. The report stays reachable with `host.mois.print {menu:'Lab Profile for Patient'}`.
- **"Test your template" via the Encounter's Action ▸ Create Misc. Requisition Order → Add Attachment:** those windows belong to the encounter and attachment streams. Templates saved in the designer do not yet appear in Add Attachment's LETTERS band.
- **Diagnosis field on the Documents Report tab** (303445 `f09c792c` shows it): the current v02.31.23 layout does not have it, and the Send window carries the Recipient.
- **Real typing inside the Letter Writer body:** only the blue record-report run, header/footer regions, inserted table cells and designer text runs are editable. The Letter Writer is not a full word processor.
- **What these commands actually do:** they open their dialogs or report their action, but nothing further happens. This covers Word-processor formatting (B/I/U etc.), Find/Replace, Customize Toolbars' other tabs, the viewer's non-fax toolbars, and CDX size-limit handling.

## 3. INFERRED (no capture)
- **Letter Writer menus and dialogs:** every Letter Writer menu except File. All the editor dialogs except Print and New Letter. The Action menu's contents.
- **Letter Writer displays:**
  - Header/footer drawn as dashed regions.
  - The Add Database Field catalogue under each Source (its names come from the prose and the captures).
  - The tag tokens other than `<HEALTH ISSUES>` and `<ALLERGIES>`.
  - The imported .docx content and the field prompt text.
- **BPMH:** the selection list and table columns (both images in 3785340 are missing).
- **Referral letters:** the Send As block's position in the response Send window. Standard Mode's non-Procedure tab columns.
- **CDX:** the LOINC codes for NOTE, MISC and NOTIFICATION.
- **Documents:** the PAPER FORM refusal wording.
- **Print Menu:** all seven of the new reports' windows and pages (680492's images are missing).
- **Paper Forms:** the New Paper Form and Export Paper Forms dialogs.
- **MOIS Viewer:** the Customize Toolbars tabs other than Commands. The third toolbar row. Which toolbars are on by default beyond the captured four.
- **eFax:** the seeded account (fictional, reconciled between two captures).

## 4. Tutorial-authoring notes (anchors are `host.mois.*`)
- **303101 / 3785340 / 304753:**
  - Open the template: tree `ad-letters`, then `row.<name-slug>` (for example `row.orthopaedic-referral`), then `command.edit-record`, then `command.edit`. That opens dialog `new-letter`: radios `field.new-letter-blank|template|file`, `command.new-letter-browse`, `command.new-letter-continue`. Continue opens the area window `letter-template-designer`.
  - Anchors inside the designer:
    - Add Database Field: `field.add-database-field-source` / `field.add-database-field-field` (selects), then `command.add-field`.
    - Remove Field: `command.delete-field`.
    - Add Tag: `field.add-tag-source`, then `command.add-tag`.
    - The page: `field.template-field-<slug>`, `field.template-tag-<slug>` (for example `template-tag-bpmh`), `field.template-header`, `field.template-line-<n>`.
    - Menus: `menu.insert.header` / `.first-page-header` / `.page-number`, `menu.edit.cut`.
    - Save: `command.save`.
  - State: `host.screen.templateFields`, `templateTags`, `templateHeader`, `templateSaved`, `templateImported`.
- **304687:**
  - The command row keeps its original caption anchors: `command.save`, `command.link-to-order`, `command.create-task`, `command.spelling`, and `command.letter-distribute`. `save` and `create-task` also exist on the folder behind the writer, and a replayed press takes the first match, so a lesson should press them with the writer as the only window that has them.
  - Menus: `menu.file|edit|view|insert|format|table|action.<item>`. Editor dialogs are `dialog.<id>` with buttons `command.<id>-<button>` (for example `dialog.font`, `command.insert-table-ok`).
  - Rail: `command.paste-patient-data` and the other Paste buttons, `command.insert-signature`, `command.add-table` with `field.table-source`.
  - Table right-click: `menu.context.delete-row` / `delete-column` / `cut`.
  - State: `host.screen.letterSaved`, `letterHeader`, `letterGraph`, `letterRepopulated`, `letterTablesEdited`.
- **303589:**
  - Continue or correct a letter: order rows `row.consultation-order-2025-09-19-intensive…` (522665, undistributed) and `…-functional-training` (522664, distributed), then `command.open-selected-order`, then `command.create-referral-note`. That opens dialog `attached-letters`: radios `field.letter-option-<slug>`, `command.attached-letters-continue`.
  - Create Distribution: `field.distribution-method` (select), `field.filesize`, `command.distribution-print`, `command.distribute-f2`. `host.screen.letterCorrection` shows a corrected letter.
  - Standard Mode (set Referral Mode = S in System Settings, then Save):
    - Order Detail: `command.order-detail-paste-provider-address`, `order-detail-print`, `order-detail-paste-encounter-note`, and `field.booking-office` / `booking-patient`.
    - Dialog `referral-note-report`: tabs `tab.referral-<name>` (top row), `cell.include-<tab>-first`, `cell.detail-<tab>-first`, `command.referral-preview`, `command.preview-report-only`. Preview then shows `dialog.print-report`.
- **2961349:**
  - Respond: Orders `row.order-training-info-request-2961349`, then `command.respond`. That opens dialog `send-document`: `field.send-document-type` (DDDW), `field.in-response-to`, `field.send-document-as-template|plain`, `field.send-document-report`, `command.send-paste-care-plan` (then `dialog.report-letterhead`, `command.letterhead-continue`), `command.send-document-next`. Then `create-distribution`.
  - After a response: the Links tab `tab.links-1`, then Respond again opens dialog `respond-to-order`: `field.response-option-<slug>`, `command.respond-ok`.
  - Notification: Documents `command.new-record`, then `command.distribute`, then `send-document`.
  - State: `host.screen.sendDocType`, `sendAs`.
- **303445:** Documents: select a PAPER FORM row. Then:
  1. `field.document-type` (DDDW) → MISC.
  2. `command.distribute` → `send-document`. Before the type is changed, `command.distribute-refused-ok` dismisses the refusal box.
  3. The `Distribution (n)` tab.

  State: `host.screen.documentType`, `documentDistributions`.
- **680492:**
  - Menu items: `menu.print.cumulative-lab-data-for-patient`, `.lab-code-for-patient`, `.reminder-list-for-patient`, `.clinical-history-tabular`, `.clinical-summary`, `.access-list`.
  - Parameter dialog `dialog.print-params`: radios `field.print-output-<slug>` / `field.print-which-<slug>`, `command.print-ok`. Then `dialog.print-report`.
  - Or use the action `host.mois.print {menu}`.
- **304734:**
  - Dialog `mois-viewer`.
  - Menus: `menu.view.toolbars`, then `menu.view.<toolbar-slug>` (for example `file-toolbar`) and `menu.view.customize-toolbars`, which opens dialog `customize-toolbars` (tab `tab.commands`, `row.viewer-category-<slug>`, `row.viewer-command-<slug>`, `command.customize-close`).
  - Buttons: `command.viewer-save`, `command.viewer-show-fields-pane`.
  - Groups: `group.viewer-bottom-toolbar`, `group.viewer-fields-pane`.
  - State: `host.screen.viewerDirty`, `viewerSaved`, `viewerToolbars`, `viewerFieldsPane`.
- **2616562:**
  - eFax Accounts: tree `ad-efax`, `command.new-record`, fields `field.efax-account-alias` / `-account-number` / `-password` / `-email` / `-fax`, `command.save`.
  - Viewer Fax: `command.viewer-fax`, then dialog `send-efax`: `field.efax-recipient-0`, `field.efax-fax-0`, `lookup.efax-recipient-0`, `command.efax-change`, `command.efax-send`. Then `command.fax-queued-ok`.
  - The same window opens by id as `send-efax`.
  - Letter Writer e-fax: Distribute with Method FAX, then `fax-queued-ok`.
  - Prescriptions: Sign and Fax, then the area window `fax-queued`; Print History `tab.distribution`, `row.rx-distribution-0` (QUEUED).
- **303112:**
  - Paper forms list (`ad-paper-forms`): `command.new-record` opens dialog `new-paper-form` (`command.new-paper-form-browse`, `field.new-paper-form-name`, `command.new-paper-form-create`). `command.export-forms` opens dialog `export-paper-forms` (`command.export-browse`, `cell.export-select-<i>`, `command.export-paper-forms-ok`).
  - Signing: in the chart paper-form viewer, `command.viewer-sign-document` (or `viewer-pencil`), then `field.viewer-signature`, then `command.viewer-save`. State: `host.screen.viewerSigned`.
