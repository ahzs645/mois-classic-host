# Demographics and Patient Detail screenshot audit

Updated 2026-09-22 after implementation against the supplied 08:17–08:19
screenshots. The screenshots show chart 746; the imported chart is 87288.
Patient values and counts are never copied from the screenshots.

## Implemented

| Area | Behavior |
| --- | --- |
| Main Demographics fields | Identity, aliases, contacts, notes, office, insurance and gender values are editable and shared with the current chart's other views. Source values absent from small lookup lists remain visible. |
| Save / Undo / Refresh | Save establishes an in-memory baseline; Undo restores that chart's baseline; Refresh discards local changes and reads its original export/roster. Chart changes keep each chart's local state separate. No XML, browser storage or MOIS database writes. |
| Patient Photo | Captured identity/empty-photo layout, local PNG/JPEG/WebP selection (up to 5 MB), preview, remove, Ok and Cancel. Photo reads stay on the computer. |
| Service dropdown | Captured two-column Service Center / Description list, red inactive choices, scrolling, and selection bound to the chart. |
| MSP Eligibility | Patient/login/date/outcome dialog and source-response control. Explicit disconnected state; no results, credentials, saved passwords or MSP requests are fabricated. |
| City Universal Search | Geographic code systems/reference-set filters, text/alternate/code/category search, status, limit, results, alternate terms, local settings and Select/Cancel. PRINCE GEORGE / JBLVS / PRG is transcribed from the reference; current chart city is preserved without inventing its code. |
| Copy / Paste Address | Local address clipboard within the Demographics tab. Does not write the OS clipboard. |
| Change Address Wizard | Current identity/address panels, empty linked-family state, Find/Add Patient from the supplied roster, recipient selection, green checked rows, Update and Cancel. Only explicitly selected recipients receive the current address. |
| Archive Address | Date validation, Ok/Cancel, and a new complete historical contact snapshot. Current address is retained. Undo restores the prior history. |
| Patient Detail background | Editable fields and checkboxes; Mother/Father/Self ethnicity order; functional lookup dialogs; conditional gender highlights. General Notes stays shared with Demographics. |
| Status History | Optional XML import and mapping; Update Status adds a local dated/note-bearing history entry. |
| Name History | Optional XML import and mapping; all rows render in a scrolling area, editable fields, current-row selection, New/Delete, and counts. |
| Historical Contact | Every imported contact record is reachable using previous/next controls; editable fields including note, New/Delete, record counts and archived snapshots. |
| Pharmacy Change | Lists this chart's exported pharmacy connections; Select/Clear/Cancel. Unknown organization contact fields remain blank. |
| Advanced Gender | Save/Close and F2 now apply the dialog's draft to the local chart; closing without Save cancels. |

## Source mappings and importer correction

The chart mapper now includes both aliases, all four phones and extension,
fax, both emails, notes, office fields, benefit source, all ethnicity triples,
background fields and gender designations. Status/name history are optional
export groups, and historical address notes are retained.

The previous importer read past the closing chart tag and absorbed 208 fields
from following clinical records, including unrelated audit names. It now reads
the matching chart record boundary. Regenerated chart 87288 contains its actual
51 chart fields. All previously imported clinical groups are unchanged; the
new status/name history arrays are empty because they are absent in this XML.

## Remaining external data and scope boundaries

- **MSP:** a real eligibility integration is still required. Login/password
  controls are disabled while disconnected and Check Eligibility reports that
  no check occurred. The UI does not claim eligibility.
- **Directories:** the service-center list and a few background/city choices
  come from the captures, not a complete MOIS directory. Other background
  lookup windows preserve current chart terms; fields permit local text entry.
  A full directory export is needed for the complete code lists and inactive
  metadata. City lookup currently supports Code Systems, not cross-searching
  health issues/encounters or adding a health issue.
- **Families:** this export contains a family-history name but no resolvable
  related-chart ID/address. Do not match people by name. The wizard starts empty
  and offers explicit recipient selection; automatic family preloading needs
  verified relationship keys and related charts.
- **Pharmacy:** separate address/phone/fax need the referenced organization's
  directory record, which is absent from this XML.
- **Selected Items:** continues to render `Patient.selectedItems` supplied by
  a host. This XML has no identifiable source group/field mapping for the
  captured ABORG-style list, so the export-backed chart remains empty there.
  A matching source record is still needed before adding an XML mapping.
- **Persistence:** demographic changes and photos last only in process memory.
  They are not an export editor or a backend write integration. New/Delete
  whole-chart actions and workflows in the other demographic tabs are outside
  this two-tab implementation.

## Verification

`mois-demographics.test.tsx` covers optional mappings, shared edits, Save/Undo,
chart isolation, invalid expiry dates, archive/history navigation, name editing,
photo cancel/remove, disconnected MSP, status history, address copy/paste,
explicit recipient selection, and geographic alternate-term lookup.
`mois-demographic-import.test.ts` verifies chart boundaries and history import
against UTF-16 XML. Existing chart isolation and tutorial regression suites pass.
Browser checks cover the main tabs, photo, MSP, service popup, geographic lookup,
and address wizard layouts with chart 87288.
