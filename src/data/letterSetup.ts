/* ============================================================================
   The two windows that open BEFORE the Letter Writer.

   `Select Letter Template` picks the template; `Letter Setup` picks which of
   the patient's records the template's tags will pull in. Both are modal, and
   `Continue (F2)` on the second one is what opens the Letter Writer.

   PROVENANCE
     303589/e3be72c6454f  933x684 — the template picker. CLASSIC THEME and
                          8-bit palettised, so its colours are quantised; the
                          group-header blue below is the measured value and is
                          NOT a quantisation artefact (the same capture renders
                          #c8dcfa elsewhere as (206,223,255)).
                          Also 303099/79174325792a, 304755/46253ef7e474,
                          304756/e3c7a9605fd4.
     304687/08364fcebd64  932x703 — Letter Setup, current generation.
     303589/c6995e12bab2  787x687 — Letter Setup, classic, and the only
                          capture of the Section tooltip live.
                          Also 303099/69f8e91a84fd, 304755/3aee14e57f44,
                          304756/a67022709309.

   SCALE CAVEAT. 304687/08364fcebd64 has no Patient Chart tree in frame, so it
   could not be calibrated the way every other capture was. Its scale was
   INFERRED at ~1:1 from a 30px title bar and 22px push buttons. Treat the
   23px grid row pitch and the 179/53/53/496/53/53 column widths below as
   +/-25%, not as measured.

   Patients and templates are synthetic training data.
   ========================================================================= */

/* --- Select Letter Template ---------------------------------------------- */

/** Group-header rows measure (165,203,247) — a genuinely more saturated blue
    than the #c8dcfa every data grid uses. */
export const TEMPLATE_PICKER = {
  groupFill: 'rgb(165, 203, 247)',
  rowFill: '#ffffff',
  rowAltFill: '#e7e7e7',
  /** classic, palettised: the true-colour value of this salmon is #e89c84 */
  selectFill: 'rgb(239, 158, 132)',
  /** row tops y 49, 71, 93, 115, 136, 158 */
  rowPitch: 21.5,
  /** the Search edit runs x~65-375, which is what sets the list pane's width;
      the split itself was not measured, so 380 is INFERRED from that edit. */
  listW: 380,
  width: 933,
  height: 684,
} as const

/** Verbatim from 303589 / 303099 / 304755 / 304756. */
export const TEMPLATE_SEARCH_HELP =
  'Begin typing the name that the letter starts with. If you want to search '
  + 'anywhere in the name, add a * to the beginning (wildcard search). This '
  + 'window shows the most recently used letters at the top.'

export type LetterTemplate = {
  /** `Recent` first, then `Letter` — the two group headers the capture shows */
  group: 'Recent' | 'Letter'
  name: string
  type: string
  description: string
}

export const LETTER_TEMPLATES: LetterTemplate[] = [
  { group: 'Recent', name: 'REFERRAL LETTER - GENERAL', type: 'REFERRAL', description: 'Standard referral with letterhead and progress note' },
  { group: 'Recent', name: 'CONSULT NOTE - CARDIOLOGY', type: 'CONSULTATION', description: 'Consultation report, cardiology' },
  { group: 'Letter', name: 'CONSULT NOTE - CARDIOLOGY', type: 'CONSULTATION', description: 'Consultation report, cardiology' },
  { group: 'Letter', name: 'INFORMATION REQUEST LETTER', type: 'INFORMATION REQUEST', description: 'CDX information request' },
  { group: 'Letter', name: 'REFERRAL LETTER - GENERAL', type: 'REFERRAL', description: 'Standard referral with letterhead and progress note' },
  { group: 'Letter', name: 'REFERRAL LETTER - PAEDIATRIC', type: 'REFERRAL', description: 'Referral with growth chart and immunisation table' },
]

/* The right-hand `Letter Preview` pane renders the template itself: #ffff9c
   yellow populators and olive/yellow tags. Both lists are the capture's own
   strings (303589/e3be72c6454f). */
export type PreviewToken =
  | { t: 'plain'; s: string }
  | { t: 'field'; s: string }
  | { t: 'tag'; s: string }

export const TEMPLATE_PREVIEW: { tokens: PreviewToken[]; gap?: number }[] = [
  { tokens: [{ t: 'field', s: '[Author Letterhead 1]' }], gap: 14 },
  { tokens: [{ t: 'field', s: '[Record Date]' }], gap: 14 },
  { tokens: [{ t: 'field', s: '[Recipient Name]' }] },
  { tokens: [{ t: 'field', s: '[Patient PHN Province]' }], gap: 14 },
  { tokens: [{ t: 'plain', s: 'Dear Colleague,' }], gap: 12 },
  { tokens: [{ t: 'field', s: '[Progress Note]' }], gap: 12 },
  { tokens: [{ t: 'field', s: '[Record Report/Comment]' }], gap: 14 },
  { tokens: [{ t: 'tag', s: '<HEALTH ISSUES>' }] },
  { tokens: [{ t: 'tag', s: '<LT MEDS>' }] },
  { tokens: [{ t: 'tag', s: '<ALLERGIES>' }] },
  { tokens: [{ t: 'tag', s: '<FAMILY HX>' }] },
  { tokens: [{ t: 'tag', s: '<DOCUMENTS>' }] },
  { tokens: [{ t: 'tag', s: '<FACILITY ADMISSION>' }] },
  { tokens: [{ t: 'tag', s: '<IMAGES>' }] },
  { tokens: [{ t: 'tag', s: '<INTERVENTION>' }] },
]

/* --- Letter Setup --------------------------------------------------------- */

/** Vertical rules at x = 198, 252, 306, 803, 857, 911. See the scale caveat
    at the top of this file: these are +/-25%, not measured. */
export const LETTER_SETUP_COLUMNS = {
  section: 179,
  recordsAvailable: 53,
  recordsSelected: 53,
  action: 496,
  attachAvailable: 53,
  attachSelected: 53,
  /** horizontal rules every 23px (y 222, 244, 267, 290, ...) */
  rowPitch: 23,
  width: 932,
  height: 703,
} as const

export type LetterSetupRow = {
  section: string
  available: number
  selected: number
  /** the template's default: 304687/08364fcebd64 opens HEALTH ISSUES, LT MEDS
      and ALLERGIES on Select All and every other section on Choose */
  action: 'all' | 'choose'
  attachAvailable: number
  attachSelected: number
  /** the greyed ATTACHMENT REVIEW row, whose Action cell is a static message */
  disabled?: boolean
  actionText?: string
  /** `Include Stopped Records` only appears on HEALTH ISSUES and LT MEDS */
  stoppedRecords?: boolean
  /** the tooltip the capture catches live on LT MEDS */
  tooltip?: string
}

/* Row order from 304687/08364fcebd64. The list is driven by the template's
   tags, not fixed: 303589/c6995e12bab2 shows a shorter set for a template
   with fewer tags (HEALTH ISSUES, LT MEDS, ALLERGIES, FAMILY HX, ATTACHMENT
   REVIEW). */
export const LETTER_SETUP_ROWS: LetterSetupRow[] = [
  /* The counts here are the capture's; the window replaces them with the
     open chart's own (LetterFlow.tsx). The Action defaults are 304687/
     08364fcebd64's: Choose everywhere except HEALTH ISSUES, LT MEDS and
     ALLERGIES. */
  { section: 'CONSULT', available: 3, selected: 0, action: 'choose', attachAvailable: 0, attachSelected: 0 },
  { section: 'ENCOUNTERS', available: 39, selected: 0, action: 'choose', attachAvailable: 0, attachSelected: 0 },
  { section: 'FACILITY ADMISSION', available: 2, selected: 0, action: 'choose', attachAvailable: 0, attachSelected: 0 },
  {
    section: 'HEALTH ISSUES', available: 7, selected: 1, action: 'all',
    attachAvailable: 0, attachSelected: 0, stoppedRecords: true,
  },
  { section: 'IMAGES', available: 3, selected: 0, action: 'choose', attachAvailable: 0, attachSelected: 0 },
  {
    section: 'LT MEDS', available: 2, selected: 2, action: 'all',
    attachAvailable: 0, attachSelected: 0, stoppedRecords: true,
    /* the tooltip 303589/c6995e12bab2 catches live, where Selected is one
       short of Available */
    tooltip: 'LT MEDS\n1 sensitive/inactive record excluded',
  },
  { section: 'MEASURES', available: 90, selected: 0, action: 'choose', attachAvailable: 0, attachSelected: 0 },
  { section: 'PROCEDURE', available: 3, selected: 0, action: 'choose', attachAvailable: 0, attachSelected: 0 },
  { section: 'ALLERGIES', available: 3, selected: 3, action: 'all', attachAvailable: 0, attachSelected: 0 },
  { section: 'DOCUMENTS', available: 28, selected: 0, action: 'choose', attachAvailable: 0, attachSelected: 0 },
  {
    section: 'ATTACHMENT REVIEW', available: 0, selected: 0, action: 'all',
    attachAvailable: 0, attachSelected: 0, disabled: true,
    actionText: 'No Attachments Available',
  },
]

/** Column semantics, verbatim from 304755 / 304756. */
export const LETTER_SETUP_GLOSSARY: Record<string, string> = {
  Section: "The folder of the Patient's Chart",
  Available: "This is how many actual records are in the Patient's Chart for this section",
  Selected: 'This is how many records have been selected to be included in this letter',
  'Select All': 'Choosing this will include all records for this area',
  Choose: 'This will prompt a new window that will allow you to pick what records to include',
}

/** The #ffffc0 patient banner, two lines. `Cell:` is a blue underlined link. */
export const LETTER_SETUP_PATIENT = {
  first: 'ASHLEE',
  middle: '',
  last: 'MORRISON',
  dob: '1979.10.23',
  sex: 'F',
  phn: 'BC 915125951',
  phnSuffix: '00',
  home: '250.555.0197',
  work: '250.555.0114',
  cell: '250.894.5512',
}
