# Build report — stream E2-admin-system-external

Emulator: `the emulator`. `npx tsc -p tsconfig.json --noEmit` is clean across the whole project, as of the end of this stream. Every new screen was opened and exercised in a Playwright harness outside the repo (`/tmp/mcov/e2/harness`, with screenshots in `/tmp/mcov/e2/shots`). No console or page errors appeared.

## 0. Shared infrastructure (new; other streams can use it)

- **`src/screens/folderViewRegistry.ts`** and **`src/screens/folderViews.register.ts`**
  - A folder view can now register itself with `registerFolderView([nodeIds], Component)`. The frame routes those nodes to `view: 'folder'`.
  - Registered nodes win over the `chartScreens` stubs and the fallback screen. They do not win over a `ROUTES` entry.
  - Shell edits for this: the `'folder'` literal, the route check in `routeNode`, and one render line.
- **`src/screens/AdminExchangeKit.tsx`** provides:
  - `DetailWindow`: a desktop-level window, anchored `host.mois.dialog.<id>`, with an optional navy heading.
  - `TopMessage`: a message box above any window; its buttons are anchored `host.mois.command.<prefix><slug>`.
  - `Btn`: a push button that reports `host.mois.command`.
  - `SectionHead`, `FieldLabel`, `FilterBand`, `ToggleCell` and `stampNow`.
- **`data/systemSettings.ts`** (owned by this stream) gains a reader API:
  - `useSystemSetting(row)` and `systemSettingValue(row)`. The second reads a mirror that System Settings' Save writes; the frame resets the mirror on mount.
  - `isYes`, `settingValueIn` and `defaultSettingValue`.
  - Row constants: `VIEWER_MODE_ROW` (`mois-viewer-mode`), `SRFAX_ENABLED_ROW` (`app-setting-srfax--enabled`), `CARECONNECT_ENABLED_ROW`, `CARECONNECT_URL_ROW`, `TELEHEALTH_ENABLED_ROW`, `ADDRESS_BOOK_ENABLED_ROW`, `BILLING_ENC_TIMES_ROW` and `ALTERNATE_LAUNCH_ROW`.
  - All existing row ids are unchanged; this was checked with a before/after dump.

## 1. Articles → what was built

### 303377 Administration Contents
- Administration **Views** menu, from `05ed63f6` (`data/menus/admin.ts`). All 36 items and 6 separators navigate to their tree nodes.
- Administration **Utilities** menu is now fully wired:
  - Provider Address to Clipboard → `provider-address-clipboard` (the Master Provider List, then a "copied" message).
  - Patient Address to Clipboard (lookup) → `patient-address-clipboard` with `{lookup:true}` (a Patient Chart List).
  - Change Teleplan Password → the existing window.
  - **SQL Editor** → `sql-editor`: Browse (an Open dialog), Retrieve Data (SELECT only, on `tdt_`/`tlp_` tables; anything else gives an error), Save Results (a Save As dialog).
  - **Intervention to MAR Converter** → `intervention-mar-converter` ("Intervention to MAR Clean-Up", `5aa489ff`): a Move to MAR tick per row, Code "…" medication lookup, Continue.
- Patient Chart Utilities: Provider Address to Clipboard and Patient Address to Clipboard (current) now open their windows (`data/mois.tsx`).
- File: `screens/AdminUtilityWindows.tsx`.

### 303124 System Settings
- APP SETTING gains:
  - the captured `Enable Create Appointment Feature` row (`0f26ee79`);
  - the 32 rows the manual's prose documents: MOIS Customizations, Filename As Note, Billing Include Enc Times, City Lookup Provinces, MOIS Viewer Initialize Printer, MAR Immunization Validation, Teleplan System, Letter Writer, Chart Filter Style, … through Enable Field Indicator Service.
- New band **APP SETTING - CPSBC**. It is painted in 3318194 `197c5a32` and placed alphabetically.
- Address Book, CareConnect, SRFAX, Telehealth, Notification, Notification Service, Scheduler and MOIS Viewer Mode (S/E/SI) were already transcribed. They are now readable by other screens:
  - Launch CareConnect depends on the CareConnect row.
  - Document Center Fax and Outbound Documents depend on SRFax.
  - Launch modes read Billing Include Enc Times.
- `SystemSettingsView.tsx` mirrors what Save commits.

### 303163 Field Audit Setup
- `ad-field-audit` shows the "Field Audit Setup List" (`f9a9dc63`): Delete Record, Edit Record, Close Window, and filters.
- Edit Record opens Field Audit Setup Detail (`f7a304f2`), with Save Changes (F2) and Cancel. Delete asks Yes/No first.
- File: `screens/ConfigurationViews.tsx`.

### 3768908 Printer Profiles
- `ad-printer-profiles` shows the Printer Profile List.
- New Record opens New Printer Profile, then Create Record.
- A double-click or Edit Record opens Printer Profile Detail: Report/Label/Form/Rx/Fax, each with "…"; Character Based ticks; Configuration.
- Also built: `ad-printer-configs` (Printer Configuration List, New Printer Configuration with Printer Type, and a Detail window).
- **Maintenance ▸ Computer Settings** → `computer-settings` (`screens/ComputerSettingsWindow.tsx`):
  - a PRINTER PROFILE drop-down, which fills every printer from the chosen profile;
  - Configuration, Current: lines, Scheduler Refresh, Refresh, Apply Changes and Cancel.

### 3076723 Update Local Printer Settings
- Computer Settings' "…" buttons open **Select Printer**: the Windows printer list with Set as default, Select Printer and Cancel.
- You return to Computer Settings and press Apply Changes.
- The Windows-side printer installation is out of scope.

### 3363428 User Agreements
- New tree node `ad-user-agreements` under Configuration (`5e0a163c`).
- The list folder opens New User Agreement (Name, PDF File, Browse, Create New), which leads to **Edit User Agreement** (`633d9338`):
  - a versions list and Version Detail: Title, Expiry, response options, Save PDF Yes/No;
  - header, footer and watermark groups;
  - PDF preview, Create New Version (the "New Version of Current User Agreement" dialog), Update PDF, Save and Cancel.
- **At login** (`LoginDialog.tsx`): Ok opens `user-agreement-prompt` for any unanswered current version (`07f8f771`).
  - Accept/Decline (or Read/Ignore, or Ignore only) and Later.
  - Decline opens **Access Denied** (`10d50c43`).
- User Account ▸ **Other ▸ User Agreements** lists the responses (`c4de1672`), with View opening the watermarked copy.
- The bundled user has already accepted Terms of Use v2024, so the default login is unchanged.
- File: `screens/UserAgreementWindows.tsx`.

### 303385 Automated Notifications
- `dx-notif-setup` Setup / Registration (`77bc0623`, v02.31.27). All four groups are editable, and Save persists them for the session.
- `dx-call-lists` Call Lists (`23760faf`):
  - filters and a status dot with its legend;
  - Edit Record opens the Call List detail (`68d46b7e`): Items, Show Excluded, Open Chart, Create Task, Ack. All, the Acknowledge ticks, and a contact line (SMS/e-mail).
  - Close Call List and Delete Record both confirm first.
- File: `screens/AutomatedNotificationViews.tsx`; data in `data/notificationService.ts`.

### 3797121 Inbound Documents / 3797120 Outbound Documents
- New tree branch `dx-doc-center` ▸ `dx-inbound-docs` and `dx-outbound-docs`.
- **Inbound Documents**:
  - commands: Scan, Refresh, Open Chart, Link to Order, Print, Fax, Rotate Pages, Tear Off, Close Window;
  - Folder: Scanning Folder / Faxes Folder; Run OCR After Scanning;
  - a Files grid with Select / Order / Filename; Split / Merge / Delete; Preview / OCR Text; a Record band;
  - **Fax** opens `send-efax` (owned by stream C3) with `{files, source:'inbound-documents'}`.
- **Outbound Documents**:
  - Status, Time Frame and Other filters;
  - a Record Type hyperlink that opens the record's folder;
  - Check Status, Create Task, Create Message.
- File: `screens/DocumentCenterViews.tsx`.

### 303492 Match Unmatched Labs (v2.31.41)
- **Activity record**: Patient Lab Detail now has an Activity pane (`e9610920`). The pane logs User Match (from Process Lab Report), Print, Ignore, Fax and Assigned.
- The v2.31.41 buttons sit in line with "Lab Message List": Print, Ignore, Fax, Reassign, Save as PDF. Print, Ignore and Fax ask for a reason. Reassign opens Reassign Responsibility (User or Org Role).
- **User Alias ID Review** (`dx-alias-review`, `5f32d5f5`): Refresh, New, Edit, Delete, Print, Close Window; the User and Alias Parameter filters; a New/Edit alias window.
- **Workspace ▸ Basket ▸ Unmatched Items** (`ws-unmatched`): filters for Date range, Status (default UNMATCHED) and Patient name; Open Detail and Reassign.
- **Routing**: Setup / Registration gains the routing panes (`59647e5a`, `95dab64d`):
  - System Default Inbox with Change Default;
  - Enable Unmatched Patient Handling Service and Default Unmatched Inbox with Change Inbox;
  - "Unidentified provider and patient connected to" with Add, Add BU and Delete.
- **Delegation**: User Account ▸ Workspace Settings gains the Unmatched Results Inbox drop-down.
- Files: `screens/UnmatchedResultViews.tsx`, plus edits to `InterfaceExchangeViews.tsx` and `UserAccountWindow.tsx`; data in `data/unmatched.ts`.

### 2280708 myhealthkey
- **Admin**: new tree root `ad-mhk` "myhealthkey (BETA)" with six folders (`screens/MyHealthKeyAdminViews.tsx`):
  - Settings (read-only);
  - Providers: Registered / Online Booking; tabs Service Locations and Activity Log; salmon-highlighted edits; Save, Check All, Register All;
  - Locations;
  - Patients: criteria, clean-up mode when Registration is cleared, Show ineligible, pink cells for missing demographics;
  - Registration Activity, with **Bulk Invite** ("Send myhealthkey Invites", Invite All);
  - Communication History (User / System Events).
- **Chart**: the `mhk` folder is now a real window (`screens/MyHealthKeyChartView.tsx`):
  - Invite opens Patient Identity Confirmation: OK? ticks, a red × for missing values, Correct Demographics (Update Patient Information, which writes Demographics), Confirm (F2).
  - The status becomes INVITED. Check Status then gives ALLOW; this simulates the patient's own registration.
  - The Patient Scheduling band: Prevent Scheduling / Allow Scheduling.
  - Deregister confirms and gives NOT ALLOW. Before ALLOW it is refused.
  - A per-chart Communication History.
- **Messaging**: Create New Message gains the "Copy Patient ▸ Send To Patient" block, greyed with a tooltip when there is no active account, and the Notes grid (`args.notes`, `;`-separated). A letter note gets the PDF approval prompt.
  - `mhk-retract-message` provides the Delete Current Record reason prompt and the Success box. It is available for stream D's delete flows.
- **Visit codes**: the Selection List Manager's Visit Code **MHK** tick can now be set (`AdminListsView.tsx`, `ToggleCell`).
- The Pre-Slot Wizard already existed.

### 3318194 Launch Care Connect
- Patient Chart Utilities shows **Launch CareConnect** below MSP Eligibility Check, but only once APP SETTING - CARECONNECT ▸ Enabled = Y has been saved.
- It opens `launch-careconnect`, a clearly labelled "External Viewer (placeholder)" window showing the URL and the chart.
- If the window is opened while the setting is disabled, it says so.
- File: `screens/CareConnectWindow.tsx`.

### 3797326 Encounter Lite / 3103943 MyEncounters
`screens/LaunchModeWindows.tsx`, data in `data/launchModes.ts`.

- **Chooser dialogs**:
  - Select Launch Mode (Main Program / Encounter Lite, with Ok and Cancel);
  - Select Service Group / Pathway (VP, VMOA, My Encounters (VP), with Continue).
- **Search Options**:
  - Provider (Encounter Lite only);
  - Time Frame: Today, Today and Yesterday, In Last n Days/Weeks, Since, Between;
  - Include Discharged;
  - the patient list grouped by day, with the D marker and an Information hover tip.
- **Search for Chart** (Find) leads to one of:
  - Confirm Chart for Patient (Yes / No / Cancel);
  - Chart Advance Search List;
  - No Chart Found, which leads either to Quick Patient Registration Form (with the permission) or to a blank Chart Data band;
  - Permission Denied.
- **Chart Data**: editable.
- **Encounter Detail**: date/time, Visit Code, Reason "…", Appt Status, Slots, Visit Mode, Service Location, Start/Finish with their buttons, General Note, Billing Data… (four Health Issue and four Service fields, then Back). Save fills the start/finish times when Billing Include Enc Times = Y.
- **Encounter Note**: F4 opens the template list, with a heart for favourites and Select.
- **Buttons**:
  - Launch Main Program, Send Task (Create New Task), New Encounter, Save, Close;
  - Make Private / View Access (Encounter Lite only);
  - **Care Complete** (MyEncounters only): the "My Encounter - Care Complete" dialog, which shows the Default Fee Code, then sets Discharged.
- **How a host selects a launch mode** (documented in `host/manifest.ts` and the shell):
  - New fixtures: `encounter-lite`, `my-encounters`, `select-launch-mode`, `select-service-group` (listed in `MOIS_CLASSIC_LAUNCH_MODES`).
  - Or `<MoisClassicShell launchMode=…>`, which wins over the fixture.
  - While a launch mode is up, the MDI frame is hidden, along with its chart reminder. Launch Main Program shows the frame beside the launch window; a click on either window brings it to the front.
  - With any other fixture and no prop, the layer is not mounted, so the default experience is unchanged.

## 2. Deliberately left out
- **Windows printer installation** (3076723 part 1): this is Windows, not MOIS.
- **The myhealthkey Preferences record and the Demographics tag** (2280708 `b79f97a3`, `e725bfae`): these belong to the Preferences and Demographics folders, which other streams own. The consent state lives in `data/myhealthkey.ts` (`useMhkChart`) if they want to show it.
- **myhealthkey reporting** via the Advanced Report Builder: that belongs to the Reports stream.
- **Reports ▸ Security/Access Audit ▸ User Agreement Audit**: that also belongs to the Reports stream.
- **Maintenance ▸ Printer Diagnostics** and the Tracking Board launch mode: they are not in these articles and have no capture. In the chooser, choosing VMOA opens the Main Program.
- **Selecting Business Unit at login, and the no-default-provider prompt** (3797326): no captures.
- **Send eFax** (stream C3): only its id `send-efax` is used.
- **Wiring Sent Messages' delete to the retract prompt**: the Workspace and Notifications views belong to stream D.
- **Admin Patients' Open Chart** opens the myhealthkey folder of the *current* chart. Folder views cannot switch the frame's chart, and the MHK patient rows are not roster charts.

## 3. INFERRED (no capture; reconstructed from the article text)
- The User Agreement list window.
- Buttons and dialogs:
  - the buttons of the New Version dialog;
  - the Browse/Open file dialogs;
  - the Read/Ignore buttons on the login prompt.
- Detail and picker windows:
  - Printer Configuration Detail;
  - the Select Printer list;
  - the Patient Chart List for address to clipboard;
  - the SQL Editor's Open, Save As and error text;
  - the Intervention converter's medication lookup and completion message.
- Unmatched results:
  - the reason prompt;
  - Reassign Responsibility;
  - the Save as PDF message;
  - the Alias New/Edit window;
  - the Unmatched Items columns.
- Messages and panes:
  - the Call List contact line and its Save/Close buttons;
  - the myhealthkey Settings rows, Communication History rows, Deregister confirmation and Check Status message.
- Launch modes: Billing Data, the template list, Make Private, the future-date prompt, and the "MOIS has been closed / Launch MOIS" desktop affordance.
- Data:
  - the extra APP SETTING values and descriptions, and the CPSBC row;
  - the Admin Views caption `Teams` (kept from the v02.21 capture; the current tree says User Groups);
  - the positions of `dx-alias-review`, `ws-unmatched` and the `ad-mhk` root in their trees;
  - all demonstration rows not visible in captures.

## 4. Tutorial-authoring notes (anchors are `data-tutorial-id`)
- **303377**
  - Menus: `host.mois.menu.views.<item>`; `host.mois.menu.utilities.sql-editor`; `…intervention-to-mar-converter`; `…provider-address-to-clipboard`.
  - Windows: `sql-editor`, `intervention-mar-converter`, `patient-chart-list`, `master-provider-list`.
  - SQL Editor: `host.mois.field.sql-statement`; commands `retrieve-data`, `sql-browse`, `save-results`.
  - Intervention converter: `host.mois.cell.move-to-mar-<n>`, `host.mois.lookup.convert-code-<n>`, command `convert-continue`.
- **303124**
  - Bands: `host.mois.group.app-setting-careconnect` (the band's box `button` toggles it).
  - Rows: `host.mois.row.app-setting-careconnect--enabled`, `host.mois.row.mois-viewer-mode`, `host.mois.row.app-setting-srfax--enabled`.
  - Value box and save: `host.mois.field.setting-value`, `host.mois.command.save`.
- **303163**
  - Node `ad-field-audit`; commands `edit-record`, `delete-record`.
  - Dialog `field-audit-setup-detail`: field `field-audit-description`, command `field-audit-save`.
- **3768908 / 3076723**
  - Nodes `ad-printer-profiles` and `ad-printer-configs`.
  - Printer profiles: commands `new-record` → `printer-profile-create`; field `profile-name`; row `host.mois.row.printer-profile-<slug>` (double-click it).
  - Dialog `printer-profile-detail` → `printer-profile-save`.
  - Menu `host.mois.menu.maintenance.computer-settings` opens dialog `computer-settings`: field `printer-profile`, lookups `host.mois.lookup.computer-<kind>-printer`.
  - Dialog `select-printer`: row `host.mois.row.printer-<slug>`; commands `set-as-default`, `select-printer`, `apply-changes`.
  - Snapshot: `host.screen.profile`, `host.screen.printer`.
- **3363428**
  - Node `ad-user-agreements` → `new-record` → dialog `new-user-agreement`: `agreement-name`, `agreement-browse`, `agreement-create-new`.
  - Dialog `edit-user-agreement`: `agreement-mode-*`, `agreement-save-pdf-yes`, `create-new-version` → `new-agreement-version`, `agreement-save`.
  - Login: `login-ok` → dialog `user-agreement-prompt`: `agreement-accept`, `agreement-decline`, `agreement-later` → `access-denied`.
  - Snapshot: `host.screen.agreement` while the prompt is up.
- **303385**
  - Node `dx-notif-setup`: groups `host.mois.group.nrs-*`, fields `nrs-*`.
  - Node `dx-call-lists`: row `host.mois.row.call-list-cl-1` → dialog `call-list-detail`: cells `host.mois.cell.call-ack-<chart>`, commands `call-detail-ack-all`, `call-detail-open-chart`.
- **3797121 / 3797120**
  - Nodes `dx-inbound-docs` and `dx-outbound-docs`.
  - Inbound: field `inbound-folder`, cells `host.mois.cell.select-<file>`, command `fax`.
  - Outbound: `outbound-status-*` and `command.record-type-*`.
  - Snapshot: `host.screen.folder`, `host.screen.checked`.
- **303492**
  - Lab detail: `host.mois.group.lab-actions` (commands `lab-print`, `lab-ignore`, `lab-fax`, `lab-reassign`, `lab-save-as-pdf`), `host.mois.group.activity` (`host.screen.activity`).
  - Node `dx-alias-review` (commands `new`, `edit`; dialog `new-user-alias`).
  - Node `ws-unmatched`.
  - `dx-setup` routing group `host.mois.group.unmatched-routing`: field `enable-unmatched-handling`, command `change-unmatched-inbox`.
  - User Account field `unmatched-results-inbox`.
- **2280708**
  - Nodes `ad-mhk-*`: Providers cells `mhk-registered-<name>` and `mhk-booking-<name>`; Registration Activity `bulk-invite` → dialog `bulk-invite`, `invite-all`.
  - Chart node `mhk`: commands `invite`, `check-status`, `deregister`, `prevent-scheduling`, `allow-scheduling`.
  - Dialog `patient-identity-confirmation`: cells `identity-<row>`, commands `correct-demographics`, `identity-confirm`.
  - Snapshot: `host.screen.registration`, `host.screen.scheduling`.
  - Messaging: `host.mois.field.send-to-patient` (`host.screen.sendToPatient`).
  - Visit codes: `host.mois.cell.mhk-<code>` in the Visit Code list manager.
- **3318194**
  - Enable the setting (see 303124), then `host.mois.menu.utilities.launch-careconnect`.
  - Dialog `launch-careconnect`; snapshot `host.screen.careconnect`.
- **3797326 / 3103943**
  - Fixtures: `encounter-lite`, `my-encounters`, `select-launch-mode`, `select-service-group`.
  - Windows: `host.mois.dialog.encounter-lite` and `…my-encounters`.
  - Fields: `time-frame-*`, `search-last-name`, `encounter-note` (F4 opens templates), `encounter-appt-status`.
  - Commands: `launch-find`, `launch-save`, `launch-new-encounter`, `launch-send-task`, `launch-care-complete`, `launch-main-program`, `billing-data`, `launch-make-private`.
  - Chooser commands: `launch-mode-ok` and `service-group-continue`.
  - Snapshot: `host.screen.launchMode`, `mainLaunched`, `chart`, `encounter`, `noteStatus`, `apptStatus`, `timeFrame`.
- **Webforms side**: the manifest has four new fixtures and extra `host.screen.*` snapshot paths. Any drift-guard test in webforms that lists fixtures or snapshot paths may need updating.
