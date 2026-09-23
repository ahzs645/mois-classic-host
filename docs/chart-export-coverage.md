# Patient chart export coverage

Updated 2026-09-22. Applies to `/tutorial/host/mois-classic/` and the standalone host.

## Data contract

Chart **87288** uses the already imported `MOIS_REF_10000013` export from
MOIS DEV 02.31.23 b250508. The supplied `0001.xml` was checked against the imported
record groups. This is a snapshot, not a live database connection or a watcher
of the Downloads folder. Register additional parsed exports in `src/data/charts/index.ts`.

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
| Encounters | 114 exported encounters; selected encounter header and lower report join notes, measures, and forms by encounter ID |
| Encounter window | 15 notes and 42 measures filtered to the encounter; forms and service events linked by exported IDs; no shared note or fake measurement defaults |
| Measures | Exported results, metadata, ranges, and report text when present |
| Orders / Imaging / Consults / Procedures | Export orders filtered by the existing audited type mapping; selected record details and audit stamps |
| Documents / Paper Forms | Export document metadata and notes; paper forms filtered by document type |
| Prescriptions | Four exported prescriptions and selected-record details; no inferred long-term-medication status |
| MAR | Two exported administrations and their selected-record detail |
| Allergy / Intolerances | Export allergy and adverse-event records; reaction children joined to selected record |
| Conditions / Risks / Needs / Planned Actions | Export rows and selected detail; linked goals joined through `goal_link` |
| Goals | Two exported goals; quantitative settings and actual linked health issues/actions |
| Preferences / Alerts | Export records and known detail fields; preference summary links select the exact exported ID, with the captured Subject/Other/Instruction/Reason detail layout |
| Dynamic Forms | Eight exported headers are listed with titles and groups from the older Dynamic Form definition dump. Open Form shows the matching `dform_data` fields and saved values in a read-only MOIS-style window. New Record offers the 19 complete form presets when embedded by Webforms; these drafts stay local to the stage. |
| Encounter Forms | Exported headers; unresolved form/provider IDs remain IDs |
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

## Next views and export details to provide

For each view, a full window plus each detail tab on a selected populated row is
most useful. Where available, include the matching export group or field-audit
mapping so we can bind it without guessing.

1. **Document / Attachment List and document viewer.** Show a selected document,
   attachment picker, and opened PDF/TXM document. The supplied binary files are
   not yet served through the host; the current Documents view shows metadata.
2. **Care Plan summary/snapshot and Tag to Care Plan.** Include the record's
   membership/category/rank fields. The tagging dialog still needs selected-record
   handoff from the chart grid.
3. **Long Term Meds and Prescription Print History.** Include parent and child
   record groups, prescription items, distribution, and review metadata.
4. **MAR detail and full adverse-event tabs.** Include instructions, administration
   action history, agents/links, and their row joins; the current detail is partial.
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
encounter ownership, and selected measurement insertion into letters. Related
encounter-form and tutorial semantic replay tests also run. Browser checks cover
the populated summary, selected goals, empty print history, and switching to a
chart with no clinical export. This is not a claim that every tutorial has been
visually replayed in both practice and autoplay modes.
