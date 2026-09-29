/* @webforms/mois-classic-host
   ─ `MoisClassicShell` + `moisClassicHostManifest`: the host-emulator contract
     a page embeds as a tutorial stage (import "./kit.css" alongside).
   ─ the `pb` kit: the PowerBuilder classic look as plain CSS + React wrappers. */
export * from './host'
export * from './pb'
export { usePatient } from './data/patient-context'
/* the frame's menu tree and the print catalogue, so a test can assert that a
   control a lesson tells the learner to click is actually wired */
export { makeMainMenu } from './data/mois'
export { printReportByMenu, printReports, type PrintReport } from './data/printReports'
/* what a stage-rendered Dynamic Form reads from the open chart: its measures
   (a `viewonly=measure` column, a `Graph` link), the gnuplot window that link
   opens, and the signed-in user the form header names */
export { useLoadedChart, loadChartExport, hasChartExport, type MoisRecord } from './data/charts'
export { replaceDynamicFormWrites, resetDynamicFormWrites, type DynamicFormWrites } from './data/dynamic-form-writes'
export { MeasurementGraphWindow, graphForCode } from './screens/MeasurementGraphWindow'
/* a Dynamic Form's Select Flowsheet... / Open Flowsheet open the same flow sheet */
export { FlowSheetWindow, FLOWSHEET_TYPES, type FlowSheetParams } from './screens/FlowSheetWindows'
export { SESSION_USER } from './data/chartSession'
/* MOIS - Search Window, the provider / organization directory a Provider field opens */
export { DirectorySearchWindow } from './screens/DirectorySearchWindow'
export { directoryEntries, type DirectoryEntry } from './data/providers'
/* the JORG List and Service Location Selection List a Dynamic Form's "..." lookups open */
export { JorgListWindow, ServiceLocationSelectionWindow } from './screens/JorgLookupWindows'
/* Encounter ID, which a Dynamic Form's "Encounter Date:" link opens */
export { PreferenceEncounterDialog } from './screens/PreferenceEncounterDialog'
export { NOT_ASSIGNED, dformServiceLocations, jorgUnits, type JorgUnit, type ServiceLocation } from './data/jorg'
