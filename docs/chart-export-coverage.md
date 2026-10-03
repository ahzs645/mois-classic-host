# Patient chart export coverage

Updated 2026-10-02. Applies to `/tutorial/host/mois-classic/` and the standalone host.

## Data contract

Chart **87288** uses the already imported `MOIS_REF_10000013` export from
MOIS DEV 02.31.23 b250508. This is a snapshot, not a live database connection or a watcher
of the Downloads folder. Register additional parsed exports in `src/data/charts/index.ts`
(and their attachment manifest in `src/data/charts/attachments.ts`).

`scripts/import-chart.mjs <export folder>/0001.xml` reads the whole export folder:

- **Every record group in the XML.** A known list fixes tree order; any other
  `<xs>` container in the file is discovered and imported too, so a group the
  list has never seen is not silently dropped. The 2026-10-02 run found 17 such
  groups, all empty for 87288 (`alias_id`, `associated_party`, `claim_other`,
  `claim_wcb`, `consult`, `dpm`, `form_encounter`, `image`, `occupation`,
  `procedure`, `cp_section`, `chart_resource`, `observation`, `cp_element`,
  `custom_form`, `no_known`, `education`).
- **`moisx.xml`'s provider directory** (164 providers) as `provider_directory`.
  `charts/providers.ts` (`providerName`, `providerLabel`) resolves MOIS.PROVIDER
  ids (`id_provider`, `id_attending`, `id_responsible_org`, …) to names. MOIS.USER
  ids (`10003787`) and organisations outside the directory (pharmacy `10001279`)
  stay unresolved; screens show the stored text or the id.
- **The documents' files** (`0001x.<str_link>`). 75 of 95 documents have one:
  PDFs are copied under their content hash (26 MB after de-duplication), `.TXM`
  (TX Text Control) letters are decoded to their text. `chart-87288.attachments.ts`
  maps each `str_link` to an asset URL; it is imported only when a viewer opens.
  The 14 WEBFORM documents link to a webform record id, not a file, and open a
  "no file" message.

Attachment contents under `src/data/charts/attachments/` are local and
Git-ignored. The repository keeps placeholder entries and viewer scaffolding;
importing a real chart export supplies the files that viewers display. A
checkout without those files shows a placeholder explanation instead. Do not
commit the PDF files or decoded letter text.

The older `Dynamic Form dump.csv` supplied separately has 148 section rows for
42 distinct MOIS window IDs. `scripts/extract-dynamic-form-catalog.py` retains
their names, groups and section captions in `legacy-dynamic-form-catalog.json`.
The folder's parsed output has 19 complete forms and 25 subforms; the 19
complete forms are already present in the Webforms preset library, with newer
field mapping enrichment, so this import does not replace those payloads.
The older `Form Field Dump.csv` contains only 1,000 rows and is not used as
ground truth for chart writes or missing field definitions.

Patient screens read the active chart through `useChartExport`, `useChartRows`,
and `useNodeRecords`. Missing exports/groups return empty arrays, never the
transcribed screen examples. Missing detail fields remain blank. Patient Summary
omits empty clinical sections and filters recent records by the chosen day window.
The roster can still provide demographics for charts with no clinical export.

Chart changes close patient dialogs and encounter windows, discard clinical-view drafts,
and reset selection. Demographic edits are separately scoped to each chart in memory
and can be cleared with Refresh. An encounter can open only when its row exists in that chart.
The import loads lazily and subscribers update when it arrives; no sample rows
are shown during loading.

## Bound views

| Area | Source and behavior |
| --- | --- |
| Patient Summary | Demographics, preferences, connections, issues, reactions/events, goals, documents, prescriptions, orders, forms, service episodes; empty sections omitted |
| Demographic | Editable chart fields, optional status/name history, complete historical contact mapping and navigation; photo, address/archive, city, pharmacy and status dialogs; local Save/Undo; MSP disconnected state. See [demographic audit](demographics-fidelity-audit.md). |
| Encounters | 114 exported encounters; selected encounter header and lower report join notes, measures, and forms by encounter ID. TM/RP/TK/clip columns read `num_encounter_forms`/`num_reports`/`num_tasks`/`num_attachments`; the Report tab's Arrived/In-Room/Seen/Discharge pairs fill from `dtm_*` + `num_*_hr/min` |
| Encounter window | 15 notes and 42 measures filtered to the encounter; forms and service events linked by exported IDs; Times column, Nbr. of services, General Note, Coding (visit reason, procedure/diagnosis/fee codes, appt status, priority); service events show their `service_event_diag` health issues + certainty; author-locked notes open read-only, private notes show the private band |
| Measures | Exported results, metadata, ranges, and report text when present; Detail/Report tabs bind collect/perform/transcribed times (`num_collect_hr/min` …), facility, specimen, order #, copies to; panel rows ordered by `num_set_id` |
| Orders / Imaging / Consults / Procedures | Export orders filtered by the existing audited type mapping; selected record details and audit stamps; Order Management ▸ Finished includes `dtm_finish_time` |
| Documents / Paper Forms | Export document metadata and notes; paper forms filtered by document type. Recipient = `str_primary_recipient`, Copies To = `str_sent_to`, Service Event box = `str_diag_desc` (MATRIX-R0807/R0808/R0811, R1030–R1032); Responsible Org. resolves ids through the provider directory. Double-click (Documents) or the viewer (Paper Forms) opens the real file: PDFs in the MOIS Viewer page, TXM letters as read-only text. Over a real PDF the Find bar and Fields pane have no fields to fill |
| Prescriptions | Four exported prescriptions and selected-record details; no inferred long-term-medication status |
| MAR | Two exported administrations and their selected-record detail, including administration/preparation/consent notes and series number; `tdt_mar_action` steps are on each order and dose (`actions`), used for status/by/time when no administration record exists |
| Allergy / Intolerances | Export allergy and adverse-event records; reaction children joined to selected record. Events ▸ New AEFI / Edit AEFI open the AEFI form (`AefiWindow.tsx`) with every AEFI column bound (`data-aefi-column`); sections 1–6 from manual 303131's capture, 7–10 from the BCCDC field list (inferred layout) |
| Conditions / Risks / Needs / Planned Actions | Export rows and selected detail; linked goals joined through `goal_link` |
| Goals | Two exported goals; quantitative settings and actual linked health issues/actions |
| Preferences / Alerts | Export records and known detail fields; preference summary links select the exact exported ID, with the captured Subject/Other/Instruction/Reason detail layout |
| Dynamic Forms | Eight exported headers are listed with titles and groups from the older Dynamic Form definition dump. Open Form shows the matching `dform_data` fields and saved values in a read-only MOIS-style window. New Record offers all 44 extracted definitions: 19 complete forms and 25 standalone calculators, questionnaires, and archetypes. The stage applies their section modules and layout setup; drafts stay local to the stage. |
| Encounter Forms | Exported headers; provider ids resolve through the provider directory, otherwise remain IDs |
| Print previews | Patient-specific record summaries; no static patient report body |
| Letter Writer | Fresh letter has no invented diagnosis or body; measurement picker reads chart results and inserts only checked rows; document picker shows metadata |
| Review / New Goal / New Attachment / New Service dialogs | Empty starting state; no preselected patient content or fabricated historical rows |

## Empty because data is absent or not yet mapped

Preferences has captured Form and Reason lookup choices. Instruction choices
come from exported preferences with the same subject/type, and By choices from
exported values; an unavailable lookup displays an empty list. These are not a
complete MOIS code-directory import. The encounter footer opens either the empty
ID explanation or the matching exported encounter's details. Change Encounter
lists this chart's encounters and supports Continue, Cancel, Clear, and row
double-click selection. New Encounter is disabled because creating encounters
is not implemented by this export viewer. Preference choices and encounter
links are local view edits: Save sets an in-memory Undo baseline, Refresh reloads
the original snapshot, and leaving the view discards them. Nothing rewrites XML.

The Demographics pharmacy name uses the latest current pharmacy connection that
is not excluded from Demographics. Ended and future connections do not populate
it. This export references organization `10001279` but contains no organization
record, so the separate pharmacy address, phone, and fax remain blank. Those
fields need the corresponding organization directory data.

Long Term Meds, prescription Print History and its child items/distribution,
Notifications, Determinants, Social History, Facility Admissions, Interventions,
Barriers, Patient Resources, Care Plan membership/snapshot, benefit/incentive/claim
history, and review history remain empty when the corresponding export data is absent. A missing export group does **not** prove
that the patient has no such records in MOIS. A prescription alone is insufficient
to assert membership in Long Term Meds. Goal links alone do not establish Care Plan
membership.

### Carried but not drawn (no evidenced MOIS control)

These export columns are imported and on the model, but no capture, manual
article or data-dictionary row shows where MOIS displays them, so no control
was invented for them:

- `tdt_mar_action` as a list (the order window's Signing History is the order's
  signing, not these care steps); `tdt_mar` code source / reference set.
- Panel collector, filler order number, universal service id, observation and
  results date/time (`charts/panels.ts`). The evidenced home is the Measures
  **Panel View**, which is not built yet.
- Measure reportable ("absurd") and very-high/low limits (Ref. Ranges shows the
  normal range only).
- Order `id_attending` / `id_order_by` / `id_responsible_org` (`charts/orders.ts`
  resolves them, but all 28 carry 500052 LONG TERM CARE WAITLIST while
  `str_attending` names someone else), print-section flags, author/recipient ids.
- Prescription `str_workflow`, `str_order_by_id`, part fill, delivery flag.
- Dynamic form header version/grace/signing/lock flags and per-field code,
  mapped-to, parent and coded flag (`savedDynamicFormFlags`).
- Chart lock, archive, print name, validation code, soundex; encounter
  `dtm_cancelled_appt`, `str_booking_mode`, `dtm_chart_assigned`, code system
  and term columns; note `dtm_lock_by_author`, `str_json_template`.
- Five AEFI outcome columns (`str_without_aefi`, `str_recurrence_aefi`,
  `str_other_aefi`, `str_without_info_aefi`, `str_not_administered`), probably
  the Recommendations tab's.

### Absent from the export itself

`need`, `action` and `alert` records carry only their id and creation stamps —
no description, dates or detail — so those rows are blank even though MOIS would
show text. Demographics ▸ Connections' Connection Resource needs the
`id_provider_type` names (100/300/310), which the export does not carry.

## Next views and export details to provide

For each view, a full window plus each detail tab on a selected populated row is
most useful. Where available, include the matching export group or field-audit
mapping so we can bind it without guessing.

1. **Document / Attachment List and document viewer.** The files are now served
   (above). Still wanted: a capture of an opened TXM letter (the stage draws a
   read-only text window, marked INFERRED; MOIS opens its letter editor), and the
   attachment list's join from a record's `num_attachments` to its documents.
2. **Care Plan summary/snapshot and Tag to Care Plan.** Include the record's
   membership/category/rank fields. The tagging dialog still needs selected-record
   handoff from the chart grid.
3. **Long Term Meds and Prescription Print History.** Include parent and child
   record groups, prescription items, distribution, and review metadata.
4. **MAR action history and AEFI sections 7–10.** A capture of wherever MOIS
   lists `tdt_mar_action` steps, and of the AEFI form scrolled to sections 7–10
   (their layout is inferred from the BCCDC field list).
5. **Notifications, Determinants, Admissions, Interventions, Social History,
   Barriers, Resources, Benefits, and Incentives.** These need both populated
   captures and source groups/field mappings before they can display chart data.
6. **Dynamic and Encounter Form fidelity.** The older definition dump gives
   dynamic form titles, groups and section captions. It does not reliably
   recover every PowerBuilder layout, field option, formula or registration
   version. In particular, section IDs can differ between a filled form and
   the older definition, so unmatched sections display their numeric ID.
   Encounter Form definitions still need their matching catalog and body layouts.
7. **Service event editing and letter/report workflow.** Source-order handoff,
   episode selection to saved event, document attachment insertion, template
   population, advanced selection filters, and print parameter filtering need
   further workflow implementation. Print previews currently show record summaries,
   not a faithful fully populated MOIS report template.

## Boundaries and remaining demonstration modules

This pass binds the **Patient Chart** module and its patient dialogs. Scheduler,
provider/resource waiting lists, Workspace/baskets, Billing/invoices, Administration,
and Data Exchange retain their separate tutorial demonstration data. They are not
loaded from this patient XML. Global code lists and template catalogs are lookup
choices, not assertions about the active patient.

Edits made in these emulator screens are local preview state unless an existing
host form channel handles them. This work does not implement writing changes back
to the MOIS export or to MOIS itself. The export's `DEV GOAL` and `DEV AUDIT GOAL`
text is real source content and is therefore retained on chart 87288.

## Verification

`lib/host-emulators/__tests__/mois-chart-data.test.tsx` checks source counts, missing
groups, a 33-folder empty-chart sweep, chart switching, selected-record details,
encounter ownership, and selected measurement insertion into letters. The 2026-10-02 pass adds
`mois-chart-documents` (recipients, attachment manifest, TXM text, real PDF in the
viewer), `mois-chart-encounters` (times, coding, service-event health issues,
note lock/private), `mois-chart-records` (MAR actions, measures, orders, provider
labels) and `mois-chart-aefi` (every AEFI column has a control). Related
encounter-form and tutorial semantic replay tests also run. Browser checks cover
the populated summary, selected goals, empty print history, and switching to a
chart with no clinical export. This is not a claim that every tutorial has been
visually replayed in both practice and autoplay modes.
