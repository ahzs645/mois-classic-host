# Stream D-scheduler-workspace: build report

Emulator: `the emulator`. `npx tsc -p tsconfig.json --noEmit` is clean. Each window was smoke-tested in a Vite build with Playwright (open, drive, screenshot, no page errors).

## New files
- `src/data/schedulerExtras.ts`: series, group-visit lists, the per-day day-book form, Service Location filter, Patient Detail Slide, encounter clipboard. Reset by `resetSchedulerStore()`.
- `src/data/workspaceExtras.ts`: follow-up notes, workgroups, saved default blend, temporary memberships, acknowledgement history (review, reassign and copy notes), order links, Show History comments, Task Inbox view, Measures view, Break Glass alerts. Reset by `resetWorkspaceStore()`.
- `src/data/workspaceSearch.ts`: Search For and Advanced Search fields for each folder, plus `matchesSearch`.
- `src/screens/scheduler/AppointmentSeriesWindows.tsx`, `GroupBookingWindows.tsx`, `SchedulerMenuWindows.tsx`, `PatientDetailSlide.tsx`.
- `src/screens/WorkspaceBlendWindows.tsx` (Change Workspace moved here), `WorkspaceBasketWindows.tsx`.
- `src/screens/RaisedMessageBox.tsx`: PBMessageBox paints at z-index 70, under dialog windows (80 and up). This wrapper lifts it so a prompt shows in front of the window that raised it.

## 1. What was built, by article

**3266635 Appointment Series**
- `appointment-series` (Create Appointment Series): the Patient and Group types, Select through the Advanced Lookup, Provider(s) Add/Remove, Appointment Detail, Daily/Weekly/Monthly/Yearly recurrence, End By or End after.
  - Args can type values in: `kind, hr, mn, slots, code, reason, chart, endBy, endAfter`.
  - Inner stages: `new-appointment-series-confirmation` (shows the >30 warning) and `required-fields`.
- `delete-recurring-appointment`: Just this one / Select from series. Delete Appt now routes here when the row belongs to a series (DaybookMenus).
- `appointment-series-delete`: Select All / Clear Selections, then the "Delete Selected Appointments" Yes/No.
- The day book and Group Visit List draw the circling series glyph. A group series also adds a group visit on each date.
- Opened from the day book's and the Group Visit List's Appt Series buttons.

**303808 Group Bookings**
- `GroupVisitView.tsx` rewritten:
  - v02.3x command row: New Appt, Appt Series, Save, Delete Appt, Undo, Refresh, Prepare for Meeting, Create MSP Claims, Clone Appt.
  - Patient List New/Delete use the Advanced Lookup. Other Provider(s) and Other Resource(s) New use a picker. A red square marks an unsaved provider.
  - Additional Information is kept per visit. Hide Future Series/All filter the list.
- `prepare-for-meeting`: Encounter Information, Name Tags, the four Progress Note modes, Lookup Template… (inner `text-template-list`). Ok sets DS to C and updates the codes.
- `print-name-tags` sends Print label and Export to CSV to the Print Preview. It is also on Group Bookings ▸ Action ▸ Print Name Tags.
- `group-visit-bill-msp`: four fee/issue/service rows, Start/Stop, Refer N/A/To/By, MSP Note, Exclude. Cancelled, Rebooked and No Show patients are struck through. The claims are written to Billing ▸ Unsent MSP (`UNSENT_ADDED_KEY`).
- `clone-group-booking`: the Topic must be reselected with "…" first, otherwise a refusal shows. Include ticks on the three tabs.

**303239 Scheduler menus (General Information)**
- Action:
  - Summary All Visit (Alt+F1) → `summary-all-visit`.
  - Copy Encounter Data (Ctrl+Shift+C) and Paste Encounter Data (Ctrl+Shift+P) → `paste-encounter-data`, backed by `schedulerStore.pasteEncounter`.
  - Patient Summary / Detail (Ctrl+Q) and Hide Patient Summary (Ctrl+Shift+Q) drive the slide.
- Print:
  - Current Daybook as Slate opens `print-current-daybook {slate:true}` with As Slate ticked.
  - Print Encounter (and the day book's button) → `scheduler-print-encounter`: Offset / Cumulative with a date range, into the Print Preview.
- Utilities:
  - added Switch Service Group / Pathway (`switch-service-group`), Time Entry (`time-entry`) and Time Logger (`time-logger`); the last two are stream A2's windows;
  - Provider Address to Clipboard → `provider-address-clipboard`;
  - Change Teleplan Password is now wired.
- The row menu's Workflow Summary is wired.

**303795 Provider Schedules (Day Book)**
- Service Location plus Show Only filters the rows; "or Show Only AS/DS" also filters.
- MSP Loc., Alias (a provider list), Comment and "see more" (`daybook-comment`), and Do Not Auto-Generate are kept per provider and day.
- Open/Create Call List → `daybook-call-list`, the Call List window from 303385 `68d46b7e`.
- The Patient Detail Slide (`PatientDetailSlide.tsx`) replaces the static band:
  - Change View → `daybook-select-summary`;
  - Summary/Detail expands to the Daybook Summary demographics;
  - Hide collapses it.

**303820 View Appointment Details**
- Daybook Bar - Multi (Alt+F2), `provider-schedule-summary`:
  - each line is anchored `host.mois.row.schedule-{provider}-{yyyymmdd}`;
  - the first double-booked quarter is anchored `host.mois.cell.schedule-double-{line}`, and the current book's first booking `host.mois.cell.schedule-booked`;
  - hovering names the bookings, and a double-click opens `appointment-detail`.

**3268648 Tasks and Messages**
- The TK/MG cells count the tasks/messages raised for the row's patient.
- A double-click on either opens `appointment-tasks` / `appointment-messages`, which list them and have New (create-task / create-message). Anchors: `host.mois.cell.tk-HHMM` and `mg-HHMM`.
- The right-click Create Task / Create Message already existed.

**1802767 Blended Workspaces**
- Change Workspace was rebuilt. It has the WORKGROUPS, SHARES and MEMBERSHIPS groups and the Shared Until, Your Accessibility and Reason columns.
- Sharing rules:
  - an inactive user whose rule has not expired shows in red (ONCOLOGY, JENNIFER);
  - an expired rule is hidden (PSYCHIATRY, MIKE until 2026.09.01).
- Save as Default saves the blend.
- Manage Workgroups… opens the Please Choose prompt (create / view-modify / delete). With no workgroups yet it goes straight to Create/Edit Workgroup.
- Add Organization / Role to List → Create Temporary Membership, with the org-role list, reason and duration. The new membership is listed under MEMBERSHIPS.
- Ids: `change-workspace`, `manage-workgroups`, `create-temporary-membership`, `default-blending-changed` (args `users`; it also fires on Workspace Summary mount when the saved default names an expired rule).
- Basket rows follow the blend: other users' rows show their initials, and a row waiting for two people in the blend reads `*` with a tooltip. The Acknowledgements panel names take the banner colour.

**1802744 Task Inbox**
- View 1 / View 2: View 2 shows Group instead of Created and Created By.
- Follow Up Notes (n): New/Delete, and a double-click or Alt+Z opens `follow-up-note`, which records Modified By.
- Search For searches Patient and Task; "…" or F4 opens `advanced-search`.

**1802768 Workflow Summary**
- `basket-workflow-summary` has the MESSAGES, TASKS (with FOLLOW UP NOTES) and ACKNOWLEDGEMENTS sections, CHECKED (by), and IR: meanings.
- The Acknowledgement History shows CREATED, REASSIGNED, COPIED and MARKED FOR REVIEW with their notes, plus the inbox-forwarding seed.
- Reassign Items, Copy Items and Mark for Review now record their note and users (WorkspaceWindows.tsx).
- Opened from View Detail…, the right-click menu and Action ▸ Workflow Summary.

**1802749 Basket**
- Print, and a double-click on a row, open `basket-print`:
  - an attachment choice when the record has one;
  - Print Order ▸ order type when the order has no Order Type;
  - then the Richtext Report.
- Right-click opens `basket-row-menu`: the 8 items, plus Show History in Measures.
- Alt+Z once focuses Report, twice opens `zoom-text` (Text Capture Window). A double-click on Report also opens it.
- Report tab Order # "…" opens `basket-order-link`, with the HL7 Status drop-down, then Link.
- Search For and Advanced Search work.
- Measures also has the View List/Panel selector.

**303599 Workspace Contents**
- Action ▸ Clean List → `clean-list`, on the Summary and the basket folders.
- Print ▸ Basket Statistics… ▸ Acknowledgement Forwarding / Intended Recipient → `report-ack-forwarding` / `report-ack-intended-recipient`, then the Print Preview.
- Utilities ▸ Provider Address to Clipboard is wired.

**Basket folders**
- 1802756 Measures:
  - Detail tab fields: MOIS/LOINC code, facility, performed/report/transcribed/collected, specimen, collection note;
  - Panel (n) tab, with the panel's results, Panel Notes and Graph;
  - Show History (`basket-measure-history`) with Goals, Related Measurements and Graph (`basket-measure-graph`, the gnuplot window over the basket patient).
- 1802758 Consults and 1802761 Facility Admissions: Detail tab fields as their pages list them (Key Word memo), more report data, and an extra ER record.
- 1802763 Orders:
  - Report tab: Referred To, Payor, Copies To, Transcribed, Status, Facility, Facility Ref, Facility Location, and a Referral memo;
  - a third order has no Order Type, so it triggers the order-type prompt.
- 1802762 Progress Notes: also lists routed notes (see Residents).

**304078 Residents**
- The day book Alias is now a real preceptor drop-down.
- RESIDENT A was added as a day-book provider (scenario 1) and as a Resource with two bookings (scenario 3). The preceptor's 09:00 and 10:30 rows name RESIDENT A under Resource.
- Workspace sharing: SMITH, PETER and RESIDENT, R1 share with ADMINISTRATOR.
- Routing: an encounter note on the open chart whose Author is changed away from its creator (`host.mois.field.note-author`) appears in that author's Progress Notes basket. The author name is taken without its "(MD)" prefix, and the row is seen by blending that user in with Change W/S.

**Lead requests**
- Time Entry / Time Logger are wired to A2's `time-entry` / `time-logger` in Scheduler ▸ Utilities.
- Break Glass alert: `workspaceExtras.breakGlassAlert` is called from C2's BreakGlassWindow, with a small Edit to PrivateNoteWindows.tsx. The alert goes into the owner's Message Inbox, or Task Inbox when the owner chose MOIS Task. It is visible in any view that includes the owner, so LOCKHART, JUSTINE was added as a share.
- I have no delete-message flow, so the mhk-retract prompt was not needed.

## 2. Left out, and why
- The Org Role editor's Workspace and Members tabs (Administration). That belongs to the Admin/E1 stream's editor.
- The Resident provider and user-account setup screens. E1 owns the provider editor. A lesson can use RESIDENT A as it is.
- Double-clicking a Group Booking patient to open that patient's encounter. Only the open chart has encounters.
- Day-book row anchors are keyed by time (`host.mois.row.appt-HHMM`), so a series booked at a time that is already on the day collides with the existing row. Lessons should book a series at a free time, for example 15:30. This is not changed because existing lessons rely on the scheme.
- The Workflow Summary on a day-book row (the existing chart window) shows the open chart's banner.

## 3. INFERRED (no capture of the layout)
- Appointment Series: the Daily and Yearly controls, the required-field message, and "remaining" meaning from the selected date onward.
- Group Bookings: the Lookup Template list, the name-tag and CSV output, the Clone topic refusal, and the provider/resource pickers.
- Summary All Visit's layout. Paste Encounter Data's confirmation wording. The Day Book Comment "see more" window. The TK/MG list windows. Switch Service Group's chooser.
- Daybook Bar - Multi's hover and double-click to Appointment Detail.
- Print's attachment choice, Clean List's message, the Basket Statistics parameter window, the Follow Up Note window, the Org Role list, and the Panel tab's Graph button.
- View 2 column placement.

## 4. Tutorial-authoring notes (anchors and ids)
- **Series**
  - `host.mois.command.appt-series`, `series-select-patient`, `series-continue`, `series-create`, `series-try-again`.
  - Fields `host.mois.field.series-{hour,minute,slots,visit-code,visit-reason,end-by,end-after,recur-every}`; radios `series-{daily,weekly,monthly,yearly}`, `series-end-after-mode`; ticks `host.mois.check.series-{weekday}`.
  - Delete: `host.mois.command.delete-appt`, then `host.mois.field.delete-select-from-series`, `delete-recurring-ok`, `host.mois.cell.series-YYYYMMDD`, `series-select-all`, `series-clear-selections`, `series-delete-ok`, then `host.mois.command.msgbox-yes`.
  - `host.screen.window` reports the inner stages.
- **Groups**
  - Tree `group`; commands `prepare-for-meeting`, `create-msp-claims`, `clone-appt`, `group-list-new`/`delete`.
  - Prepare for Meeting: `host.mois.field.name-tags-{not-required,print-label,export-to-csv}`, `meeting-*` note modes, `meeting-note-text`, `lookup-template`, `meeting-ok`.
  - Bill: `bill-fee-1..4`, `bill-issue-1..4`, `host.mois.cell.bill-exclude-{chart}`, `bill-create-msp-claims`.
  - Clone: `clone-topic`, `clone-group-appt`, `host.mois.cell.clone-patient-{chart}`.
  - `schedulerExtras.last` records slugs such as `group-claims-created` and `group-visit-cloned`.
- **Day book**
  - `host.mois.field.daybook-location`, `host.mois.check.daybook-show-only`, `daybook-only-as`, `daybook-only-ds`, `daybook-msp-loc`, `daybook-alias`, `daybook-comment`.
  - Commands `see-more`, `open-call-list`; check `host.mois.check.no-call-list`.
  - Slide: commands `change-view`, `summary-detail`, `hide-slide`, then `host.mois.row.summary-{name}` and `select-summary-ok`.
  - TK/MG: `host.mois.cell.tk-HHMM` / `mg-HHMM`, then `appointment-tasks-new`.
- **Menus**: `host.mois.menu.action.summary-all-visit`, `.copy-encounter-data`, `.paste-encounter-data`, `.daybook-bar-multi`; `host.mois.menu.print.current-daybook-as-slate`, `.print-encounter`; `host.mois.menu.utilities.time-entry`, `.time-logger`.
- **Workspace**
  - Change W/S: `host.mois.cell.ws-share-{last}`, `ws-continue`, `host.mois.check.ws-save-as-default`, `manage-workgroups`, `host.mois.field.wg-{create,modify,delete,pick}`, `manage-workgroups-ok`, `workgroup-name`, `host.mois.cell.wg-user-{last}`, `workgroup-continue`, `add-organization-role`, `membership-select`, `host.mois.row.org-{slug}`, `membership-reason`, `membership-save`.
  - Basket:
    - `host.mois.command.print`, then `print-order-ok`, `print-mois-report`;
    - right-click row, then `host.mois.menu.basket.{show-history,workflow-summary,...}`;
    - `order-link-lookup`, then `host.mois.field.order-link-status`, `order-link`;
    - `view-detail`; `host.mois.field.basket-report` (Alt+Z), then `zoom-text`;
    - `basket-advanced-search`, `host.mois.field.basket-search`, `host.mois.field.basket-view`;
    - `host.mois.tab.panel-N` (N is the panel's result count), `panel-graph`;
    - Show History: `basket-history-graph`, `basket-history-save`;
    - Workflow: `host.mois.group.workflow-{messages,tasks,acks}`, `host.mois.row.workflow-{section}-{desc}`, `host.mois.field.acknowledgement-history`.
  - Task Inbox: `host.mois.field.task-view`, `host.mois.tab.follow-up-notes-N`, `follow-up-new`/`delete`, `host.mois.field.follow-up-text`, `follow-up-save`, `task-advanced-search`.
  - Menus: Clean List `host.mois.menu.action.clean-list` → `msgbox-yes`; `host.mois.menu.print.basket-statistics` → `acknowledgement-forwarding`.
- **Anchor conventions**
  - Every message box raised by these windows has buttons anchored `host.mois.command.msgbox-{yes,no,ok}`.
  - Tab and anchor ids that carry counts change with state: `follow-up-notes-N`, `panel-N`.
