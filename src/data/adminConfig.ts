/* ============================================================================
   Administration ▸ Configuration — Field Audit Setup, Printer Configurations,
   Printer Profiles, User Agreements — and the workstation Maintenance ▸
   Computer Settings reads. Demonstration data; all fictional.

   PROVENANCE
   · Field Audit Setup — 303163 `f9a9dc63…` (v02.19.04, the list: Table Name
     / Field Name / Description, first rows tdt_admission str_report "Report
     Field", then tdt_adverse_event …) and `f7a304f2…` (the detail:
     tdt_document / str_comment / Comment Field). The rows below the capture's
     first dozen are taken from reference/field-audit.md's tables.
   · Printer Profiles — 3768908 `9f4b3fe1…` (HOSPITAL, PRINCE GEORGE),
     `063c4c8f…` (PRINCE GEORGE: CutePDFWriter / lpt1: / Microsoft Office
     Document Image Writer / Default / DEFAULT, Configuration STANDARD
     SETTINGS) and `820efdd6…` (HOSPITAL: Microsoft Print to PDF / lpt1: /
     … / Canon MF220 Series, Configuration WEB CLIENT).
   · Printer Configurations — 303124 `53ff7a7c…` (Printer Type: Label
     Printer / Rx Printer) and `e6dd7589…` (MAC "For When MAC is in use",
     WEB CLIENT "When using web client use these settings").
     `4a1733c3…` adds STANDARD SETTINGS to Computer Settings' Configuration
     list; it is the built-in entry, not a row of the list.
   · Computer Settings — 3768908 `f4f920fc…`, 303124 `4a1733c3…`: computer
     LLPF39LCHX; Report CutePDFWriter, Label lpt1: (Character Based),
     Form Microsoft Office Document Image Writer, Rx Default, Fax DEFAULT;
     Scheduler Refresh 0.
   · The Windows printer list the "…" opens (3076723) has no capture — the
     article's images are all `missing-image` — so AVAILABLE_PRINTERS is
     INFERRED: the printer names the other captures show, plus two
     Windows defaults.
   · User Agreements — 3363428: `633d9338…` (Edit User Agreement), `c4de1672…`
     (User Account ▸ Other ▸ User Agreements: Terms of Use v2024 Accepted,
     v2023 Accepted, v2023 Declined, all 2023.11.01), `07f8f771…` (the
     "Privacy and Confidentiality Form" the user sees at login).
   ========================================================================= */

/* --- Field Audit Setup ---------------------------------------------------- */
export type FieldAuditRow = { table: string; field: string; description: string }

export const FIELD_AUDIT_ROWS: FieldAuditRow[] = [
  { table: 'tdt_admission', field: 'str_report', description: 'Report Field' },
  ...['dtm_administered', 'dtm_hospital_admission', 'dtm_hospital_discharge', 'dtm_outcome_death', 'dtm_report',
    'num_administered_hr', 'num_administered_min', 'num_allergic_duration_day', 'num_allergic_duration_hr',
    'num_allergic_duration_min', 'num_allergic_interval_day', 'num_allergic_interval_hr', 'num_allergic_interval_min',
    'num_attachments', 'num_days_hospital', 'num_days_prolonged', 'num_largest_diameter_cm']
    .map((field) => ({ table: 'tdt_adverse_event', field, description: field })),
  { table: 'tdt_chart', field: 'str_general_note', description: 'General Note' },
  { table: 'tdt_chart', field: 'str_short_note', description: 'Short Note' },
  { table: 'tdt_consult', field: 'str_report', description: 'Report Field' },
  { table: 'tdt_document', field: 'str_comment', description: 'Comment Field' },
  { table: 'tdt_document', field: 'str_report', description: 'Report Field' },
  { table: 'tdt_image', field: 'str_report', description: 'Report Field' },
  { table: 'tdt_measure', field: 'str_value', description: 'Measure Value' },
  { table: 'tdt_procedure', field: 'str_report', description: 'Report Field' },
]

/* --- printers --------------------------------------------------------------- */
export const PRINTER_KINDS = ['Report', 'Label', 'Form', 'Rx', 'Fax'] as const
export type PrinterKind = (typeof PRINTER_KINDS)[number]

export type PrinterSet = Record<PrinterKind, string> & { labelChar: boolean; rxChar: boolean; configuration: string }

/** INFERRED — the workstation's installed Windows printers (see the header). */
export const AVAILABLE_PRINTERS = [
  'Canon MF220 Series',
  'CutePDFWriter',
  'DYMO LabelWriter 450',
  'Fax',
  'lpt1:',
  'Microsoft Office Document Image Writer',
  'Microsoft Print to PDF',
  'Xerox VersaLink C405',
]
/** the one the Windows "Select Printer" list marks Default at the start */
export const WINDOWS_DEFAULT_PRINTER = 'Microsoft Print to PDF'

export const STANDARD_CONFIGURATION = 'STANDARD SETTINGS'

export type PrinterConfiguration = { type: 'Label Printer' | 'Rx Printer'; name: string; description: string }

export const PRINTER_CONFIGURATIONS: PrinterConfiguration[] = [
  { type: 'Label Printer', name: 'MAC', description: 'For When MAC is in use' },
  { type: 'Label Printer', name: 'WEB CLIENT', description: 'When using web client use these settings' },
]
export const PRINTER_TYPES: PrinterConfiguration['type'][] = ['Label Printer', 'Rx Printer']

export type PrinterProfile = { name: string; description: string; printers: PrinterSet }

export const PRINTER_PROFILES: PrinterProfile[] = [
  {
    name: 'HOSPITAL', description: '',
    printers: {
      Report: 'Microsoft Print to PDF', Label: 'lpt1:', Form: 'Microsoft Office Document Image Writer',
      Rx: 'Microsoft Print to PDF', Fax: 'Canon MF220 Series', labelChar: true, rxChar: false, configuration: 'WEB CLIENT',
    },
  },
  {
    name: 'PRINCE GEORGE', description: '',
    printers: {
      Report: 'CutePDFWriter', Label: 'lpt1:', Form: 'Microsoft Office Document Image Writer',
      Rx: 'Default', Fax: 'DEFAULT', labelChar: true, rxChar: false, configuration: STANDARD_CONFIGURATION,
    },
  },
]

/** A new profile starts on the workstation's current printers (INFERRED). */
export const COMPUTER_NAME = 'LLPF39LCHX'
export const COMPUTER_PRINTERS: PrinterSet = {
  Report: 'CutePDFWriter', Label: 'lpt1:', Form: 'Microsoft Office Document Image Writer',
  Rx: 'Default', Fax: 'DEFAULT', labelChar: true, rxChar: false, configuration: STANDARD_CONFIGURATION,
}

/* Session keys — the lists as this session has edited them. */
export const FIELD_AUDIT_KEY = 'admin:field-audit'
export const PRINTER_PROFILES_KEY = 'admin:printer-profiles'
export const PRINTER_CONFIGS_KEY = 'admin:printer-configurations'
/** Maintenance ▸ Computer Settings as last applied: printers, profile, refresh */
export const COMPUTER_SETTINGS_KEY = 'maintenance:computer-settings'
export type ComputerSettings = { printers: PrinterSet; profile: string; refresh: string; windowsDefault: string }
export const DEFAULT_COMPUTER_SETTINGS: ComputerSettings = {
  printers: COMPUTER_PRINTERS, profile: '', refresh: '0', windowsDefault: WINDOWS_DEFAULT_PRINTER,
}

/* --- User Agreements ---------------------------------------------------------- */
export type AgreementResponseMode = 'accept-decline' | 'read-ignore' | 'ignore-only'
export type AgreementAnnotation = { on: Record<'Accepted' | 'Declined' | 'Read' | 'Ignored', boolean>; text: string; size: string; colour: string; align: string }

export type AgreementVersion = {
  title: string
  /** yyyy.mm.dd, or '' for Perpetual */
  expiry: string
  file: string
  mode: AgreementResponseMode
  savePdf: boolean
  header: AgreementAnnotation
  footer: AgreementAnnotation
  watermark: AgreementAnnotation
}

export type UserAgreement = { name: string; versions: AgreementVersion[] }

const annotation = (text: string, size: string, align: string): AgreementAnnotation => ({
  on: { Accepted: true, Declined: true, Read: false, Ignored: false }, text, size, colour: '0', align,
})

export const newAgreementVersion = (title: string, file: string): AgreementVersion => ({
  title, expiry: '', file, mode: 'accept-decline', savePdf: true,
  header: annotation('{action} by {user} on {date} at {time}', '9', 'Left'),
  footer: annotation('{action}', '9', 'Left'),
  watermark: annotation('{ACTION}', '24', '45'),
})

/* `c4de1672…`: the stage's user has accepted Terms of Use v2024, so the
   bundled agreement does not stop the next login — a lesson creates its own
   agreement (or a new version) and then meets it at Lock MOIS / Switch User. */
export const USER_AGREEMENTS: UserAgreement[] = [
  {
    name: 'Terms of Use',
    versions: [
      { ...newAgreementVersion('v2023', 'Terms of Use v2023.pdf'), expiry: '2023.12.31' },
      newAgreementVersion('v2024', 'Terms of Use v2024.pdf'),
    ],
  },
]

export type AgreementResponse = { agreement: string; version: string; date: string; action: 'Accepted' | 'Declined' | 'Read' | 'Ignored' }

export const AGREEMENT_RESPONSES: AgreementResponse[] = [
  { agreement: 'Terms of Use', version: 'v2024', date: '2023.11.01', action: 'Accepted' },
  { agreement: 'Terms of Use', version: 'v2023', date: '2023.11.01', action: 'Accepted' },
  { agreement: 'Terms of Use', version: 'v2023', date: '2023.11.01', action: 'Declined' },
]

export const USER_AGREEMENTS_KEY = 'admin:user-agreements'
export const AGREEMENT_RESPONSES_KEY = 'admin:user-agreement-responses'

/** INFERRED — what Browse finds in the MOIS Cloud Files folder. */
export const AGREEMENT_PDF_FILES = [
  'Confidentiality Agreement.pdf',
  'Privacy and Confidentiality Form.pdf',
  'Terms of Use v2025.pdf',
  'User Startup Agreement.pdf',
]

/** The version a user is asked to respond to now: unexpired, and the latest of its agreement. */
export function currentVersion(a: UserAgreement, today: string): AgreementVersion | null {
  const live = a.versions.filter((v) => !v.expiry || v.expiry >= today)
  return live[live.length - 1] ?? null
}

/** The first agreement whose current version the user has not accepted / read / ignored. */
export function pendingAgreement(
  agreements: UserAgreement[], responses: AgreementResponse[], today: string,
): { agreement: UserAgreement; version: AgreementVersion } | null {
  for (const agreement of agreements) {
    const version = currentVersion(agreement, today)
    if (!version) continue
    const answered = responses.some((r) => r.agreement === agreement.name && r.version === version.title && r.action !== 'Declined')
    if (!answered) return { agreement, version }
  }
  return null
}
