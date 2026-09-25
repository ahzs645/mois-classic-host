/* ============================================================================
   MOIS's printing: the Selection Parameter dialogs and the reports they make.

   MOIS prints in two stages. A Print-menu item opens a **Selection Parameter**
   window — a grey band, navy section headings, a handful of fields and an
   Ok / Cancel pair — and Ok opens a **Richtext Report** window, an editable
   RTF preview with Print / Print and Attach / Fax / Cancel across the top.
   Not every window is the same shape: Consultations and the Clinical History
   Segment have no band and say View Report, MAR History carries a grey note
   and a `Select Records to Print...` button. Each entry below cites the
   capture its window was transcribed from.

   Every page is laid out from the open chart by a builder in
   `data/printPages.ts`, which cites the article image each layout (title,
   columns, sections) was transcribed from. The one page no capture shows is
   the long-term medication list; it is marked `captured: false`.
   ========================================================================= */
import { MOIS_TODAY } from './patients'
import {
  admissionsPage, clinicalHistoryPage, consultationsPage, familyHistoryPage,
  interventionsPage, marHistoryPage, medicationsPage, problemListPage,
  proceduresPage, radiologyPage, socialHistoryPage, type PrintContext,
} from './printPages'

export type PrintField =
  | { kind: 'section'; label: string }
  /** `key` names the value a page builder reads; `dots` draws the "…" lookup */
  | { kind: 'text'; label: string; value?: string; width?: number; key?: string; dots?: boolean }
  /** From and To on one row, as the Consultations window lays them out */
  | { kind: 'range'; from?: string; to?: string }
  /** `caption` is a label to the left of the box (`Consultations:`) */
  | { kind: 'check'; label: string; checked?: boolean; key?: string; caption?: string }
  /** the Clinical History Segment's Include Section / With Detail grid */
  | { kind: 'segments'; rows: { label: string; include?: boolean; detail?: boolean; date?: boolean }[] }

export type PrintReport = {
  /** the Print-menu item that opens it */
  menu: string
  /** the Selection Parameter window's title bar */
  title: string
  fields: PrintField[]
  /** the Richtext Report window's title bar, after "Richtext Report: " */
  reportTitle: string
  /** `captured: false` means the page body is modelled, not transcribed */
  captured: boolean
  /** a static page, for a report with no builder */
  page?: string
  /** lays the page out from the open chart (data/printPages.ts) */
  build?: (ctx: PrintContext) => string
  /** the default button's caption: `Ok` unless the capture shows otherwise */
  okLabel?: string
  /** false = no grey `Selection Parameter` band across the top */
  band?: boolean
  /** the grey note line some windows carry above the buttons */
  note?: string
  /** a button in the bottom-left corner, opening a window of its own */
  leftButton?: { label: string; window: 'select-mar-records' }
  /** MAR History is a DataWindow report in a proportional face */
  font?: 'mono' | 'sans'
  /** the window's size when the capture's differs from the 650×530 default */
  size?: { width: number; height: number }
}

/** the dialog's default dates: MOIS opens them on today and a span back */
const TO = MOIS_TODAY
const back = (years: number, months = 0) => {
  const [y, m, d] = MOIS_TODAY.split('.').map(Number) as [number, number, number]
  const total = y * 12 + (m - 1) - years * 12 - months
  return `${Math.floor(total / 12)}.${String((total % 12) + 1).padStart(2, '0')}.${String(d).padStart(2, '0')}`
}

export const printReports: PrintReport[] = [
  /* 303146 `de09b682…` (the window) and `8e214ced…` (the page) */
  {
    menu: 'Interventions for Patient',
    title: 'Patient Interventions Report',
    fields: [
      { kind: 'section', label: 'Performed Date Range (INCLUSIVE)' },
      { kind: 'text', label: 'From:', value: back(7), width: 80, key: 'from' },
      { kind: 'text', label: 'To:', value: TO, width: 80, key: 'to' },
      { kind: 'section', label: 'Description' },
      { kind: 'text', label: 'Includes:', value: '', width: 190, key: 'includes' },
      { kind: 'text', label: 'Excludes:', value: '', width: 190, key: 'excludes' },
    ],
    reportTitle: 'Patient Intervention Report',
    captured: true,
    build: interventionsPage,
  },
  {
    menu: 'Medications for Patient',
    title: 'Patient Long Term Medications Report',
    fields: [
      { kind: 'section', label: 'Stopped Medications' },
      { kind: 'check', label: 'Show Stopped Medications', checked: false, key: 'stopped' },
    ],
    reportTitle: 'Patient Long Term Medication Report',
    /* the window is captured; the page is not (see medicationsPage) */
    captured: false,
    build: medicationsPage,
  },
  /* ------------------------------------------------------------------------
     The chart print-flow lessons. Each window and each page is transcribed
     from its article's capture: 303457 problem list, 303158 family history,
     303444 social history, 303120 radiology, 303134 consultations, 303142
     procedures, 303591 admissions. The three undated lists have no Selection
     Parameter window at all — the Print menu goes straight to the preview —
     so their `fields` are empty.
     --------------------------------------------------------------------- */
  {
    menu: 'Problem List for Patient',
    title: 'Patient Problem List Report',
    fields: [],
    reportTitle: 'Patient Problem List Report',
    captured: true,
    build: problemListPage,
  },
  {
    menu: 'Family History (Hx) for Patient',
    title: 'Patient Family History Report',
    fields: [],
    reportTitle: 'Patient Family History Report',
    captured: true,
    build: familyHistoryPage,
  },
  {
    menu: 'Social History for Patient',
    title: 'Patient Social History Report',
    fields: [],
    reportTitle: 'Patient Social History Report',
    captured: true,
    build: socialHistoryPage,
  },
  /* 303120 `83853431…`: band, heading, From/To stacked, one checkbox, Ok */
  {
    menu: 'Radiology Reports for Patient',
    title: 'Patient Radiology Report',
    fields: [
      { kind: 'section', label: 'Performed Date Range (INCLUSIVE)' },
      { kind: 'text', label: 'From:', value: back(0, 3), width: 80, key: 'from' },
      { kind: 'text', label: 'To:', value: TO, width: 80, key: 'to' },
      { kind: 'check', label: 'Include Report Detail', checked: true, key: 'detail' },
    ],
    reportTitle: 'Patient Radiology Report',
    captured: true,
    build: radiologyPage,
  },
  /* 303134 `81cf425c…`: no Selection Parameter band, From and To on one row,
     a `Consultations:` caption beside the `with detail reports` box, and the
     article's button is View Report */
  {
    menu: 'Consultations for Patient',
    title: 'Patient Consultations Report',
    band: false,
    okLabel: 'View Report',
    fields: [
      { kind: 'section', label: 'Date Range (INCLUSIVE)' },
      { kind: 'range', from: back(2), to: TO },
      { kind: 'section', label: 'Select Report Content' },
      { kind: 'check', caption: 'Consultations:', label: 'with detail reports', checked: true, key: 'detail' },
    ],
    reportTitle: 'Consultations for Patient',
    captured: true,
    build: consultationsPage,
  },
  /* 303142 `035b042b…` */
  {
    menu: 'Procedure List for Patient',
    title: 'Patient Procedures Report',
    fields: [
      { kind: 'section', label: 'Performed Date Range (INCLUSIVE)' },
      { kind: 'text', label: 'From:', value: back(0, 3), width: 80, key: 'from' },
      { kind: 'text', label: 'To:', value: TO, width: 80, key: 'to' },
      { kind: 'check', label: 'Include Report Detail', checked: true, key: 'detail' },
    ],
    reportTitle: 'Patient Procedure Report',
    captured: true,
    build: proceduresPage,
  },
  /* 303591 `b7ae6c19…`: Discharge, not Performed, and `Include Detail Reports` */
  {
    menu: 'Facility Admission for Patient',
    title: 'Patient Admissions Report',
    fields: [
      { kind: 'section', label: 'Discharge Date Range (INCLUSIVE)' },
      { kind: 'text', label: 'From:', value: back(0, 3), width: 80, key: 'from' },
      { kind: 'text', label: 'To:', value: TO, width: 80, key: 'to' },
      { kind: 'check', label: 'Include Detail Reports', checked: true, key: 'detail' },
    ],
    reportTitle: 'Patient Admission Report',
    captured: true,
    build: admissionsPage,
  },
  /* 319686 `98c198a6…`: blank 0000.00.00 dates, a Concept lookup, the grey
     optional-parameters note, and `Select Records to Print...` bottom-left,
     which opens `Select MAR Record(s) to Print` (`06e789f8…`) */
  {
    menu: 'MAR History',
    title: 'Report: Patient MAR History',
    fields: [
      { kind: 'section', label: 'Administration Date Range (INCLUSIVE)' },
      { kind: 'text', label: 'From:', value: '0000.00.00', width: 80, key: 'from' },
      { kind: 'text', label: 'To:', value: '0000.00.00', width: 80, key: 'to' },
      { kind: 'section', label: 'Records' },
      { kind: 'text', label: 'Concept:', value: '', width: 356, key: 'concept', dots: true },
    ],
    note: 'Note: All parameters are optional.  Blank parameters will be ignored when filtering the list.',
    leftButton: { label: 'Select Records to Print...', window: 'select-mar-records' },
    reportTitle: 'Patient MAR History',
    captured: true,
    font: 'sans',
    build: marHistoryPage,
  },
  /* 303082 `4e709015…`: no band — a Date Range row, then a grid with an
     Include Section / With Detail / Custom Date / From / To header, and
     View Report. `26d0eab1…` is the page. */
  {
    menu: 'Clinical History Segment',
    title: 'Patient Clinical History - Segmented',
    band: false,
    okLabel: 'View Report',
    size: { width: 585, height: 535 },
    fields: [
      { kind: 'section', label: 'Date Range (INCLUSIVE)' },
      { kind: 'range', from: back(2), to: TO },
      { kind: 'check', label: 'ALL Records (including items w/o a date)', checked: false, key: 'all' },
      {
        kind: 'segments',
        rows: [
          { label: 'Problem List' }, { label: 'Reaction Risks' }, { label: 'Adverse Events' },
          { label: 'Long Term Medications' }, { label: 'MAR' }, { label: 'Measures / Labs' },
          { label: 'Imaging' }, { label: 'Consultations' }, { label: 'Admissions' },
          { label: 'Procedures' }, { label: 'Family History' }, { label: 'Social History' },
          { label: 'Encounters', include: true }, { label: 'Encounter Forms' }, { label: 'Interventions' },
          { label: 'Documents' }, { label: 'Dynamic Forms' }, { label: 'Messages' }, { label: 'Tasks' },
        ],
      },
    ],
    reportTitle: 'Patient Clinical History',
    captured: true,
    build: clinicalHistoryPage,
  },
]

export const printReportByMenu = (menu: string): PrintReport | undefined =>
  printReports.find((r) => r.menu === menu)
