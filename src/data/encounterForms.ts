/* ============================================================================
   The forms an encounter can carry, and the picker that starts one.

   Transcribed from captures of the Encounter Detail Window on MOIS: TRAINING
   (chart 3924, encounter 10067296): the `Encounter Forms` tab, the
   `Encounter Summary` tab, and the `Select Form` dialog that `New Form` opens.

   MOIS groups the picker by `Form Type`. ATTACHMENT forms carry a version and
   are the web forms this project authors; ENCOUNTER FORMS are the built-in
   clinical tools and the capture shows their Version column empty.
   ========================================================================= */

export type FormListRow = {
  type: string
  name: string
  /** ATTACHMENT forms are versioned; the built-in encounter forms are not */
  version: string
}

export const selectFormRows: FormListRow[] = [
  { type: 'ATTACHMENT', name: 'ABC STAMP FORM', version: '1.0.0' },
  { type: 'ATTACHMENT', name: 'ADULT ASSESSMENT (19 AND OLDER NOT PRENATAL OR PC', version: '1.0.0' },
  { type: 'ATTACHMENT', name: "AHMAD'S BEST FORM", version: '1.0.0' },
  { type: 'ATTACHMENT', name: 'DENTAL - SILVER DIAMINE FLUORIDE', version: '1.0.0' },
  { type: 'ATTACHMENT', name: 'FULL CHART VALIDATION LAB', version: '1.0.0' },
  { type: 'ATTACHMENT', name: 'INITIAL CLIENT ASSESSMENT FOR HOME BASED SERVICES', version: '1.2.0' },
  { type: 'ATTACHMENT', name: "LISA'S FAVOURITE ABC STAMP FORM", version: '1.0.0' },
  { type: 'ATTACHMENT', name: 'MENTAL HEALTH AND SUBSTANCE USE NEW CLIENT FORM', version: '2.1.5' },
  { type: 'ATTACHMENT', name: 'MEOW THE GREAT', version: '1.0.0' },
  { type: 'ATTACHMENT', name: 'MSE - ABC STAMP LICK ER', version: '2.0.2' },
  { type: 'ATTACHMENT', name: 'MULTIFACTORIAL FALLS PREVENTION ASSESSMENT', version: '1.1.4' },
  { type: 'ATTACHMENT', name: 'NORTH HFC PATIENT ASSESSMENT', version: '1.3.5' },
  { type: 'ATTACHMENT', name: 'PATIENT CONTEXT DIAGNOSTICS', version: '1.0.0' },
  { type: 'ATTACHMENT', name: 'PATIENT CONTEXT DIAGNOSTICS PART 3', version: '1.0.0' },
  { type: 'ATTACHMENT', name: 'PATIENT CONTEXT DIAGNOSTICS REFRESHED', version: '1.0.0' },
  { type: 'ATTACHMENT', name: 'PATIENT CONTEXT DIAGNOSTICS UPDATED', version: '1.0.0' },
  { type: 'ATTACHMENT', name: 'REALLY IMPORTANT WEBFORM', version: '1.0.0' },
  { type: 'ATTACHMENT', name: 'WOWZA', version: '1.0.0' },
  { type: 'ATTACHMENT', name: 'YE OLDE WESTERN SALOON REGISTRATION', version: '1.0.0' },
  { type: 'ENCOUNTER FORMS', name: '6 - ITEM KADS', version: '' },
  { type: 'ENCOUNTER FORMS', name: '60 SECOND TOOL', version: '' },
  { type: 'ENCOUNTER FORMS', name: 'ASTHMA', version: '' },
  { type: 'ENCOUNTER FORMS', name: 'CCM COVID CASE INITIAL INTERVIEW', version: '' },
  { type: 'ENCOUNTER FORMS', name: 'CGI  SCALE', version: '' },
  { type: 'ENCOUNTER FORMS', name: 'CHF', version: '' },
]

export type EncounterFormRow = {
  /** the capture files a completed web form under ASSESSMENT, not ATTACHMENT */
  type: string
  name: string
  attending: string
}

export const encounterFormRows: EncounterFormRow[] = [
  { type: 'ASSESSMENT', name: 'PATIENT CONTEXT DIAGNOSTICS PART 3', attending: '' },
  { type: 'ASSESSMENT', name: 'REALLY IMPORTANT WEBFORM', attending: '' },
]

export type SummaryRow = {
  /** the band this record sits under; `groups` paints the band either way */
  group: string
  date: string
  description: string
  detail: string
}

/** MOIS shows WEB FORMS [2] collapsed and DOCUMENTS [2] open on this encounter. */
export const encounterSummaryGroups = ['WEB FORMS', 'DOCUMENTS']

export const encounterSummaryRows: SummaryRow[] = [
  /* The same two forms are counted under both bands — once as the form that
     was filled, once as the document it produced. The capture shows
     `WEB FORMS [2]` collapsed, so what its rows print is unverified; they are
     given the form's own name, which is what the Encounter Forms tab lists. */
  {
    group: 'WEB FORMS',
    date: '2026.09.16',
    description: 'WEB FORM',
    detail: 'REALLY IMPORTANT WEBFORM',
  },
  {
    group: 'WEB FORMS',
    date: '2026.09.16',
    description: 'WEB FORM',
    detail: 'Patient Context Diagnostics part 3',
  },
  {
    group: 'DOCUMENTS',
    date: '2026.09.16',
    description: 'WEBFORM',
    detail: 'REALLY IMPORTANT WEBFORM',
  },
  {
    group: 'DOCUMENTS',
    date: '2026.09.16',
    description: 'WEBFORM [ JALIL, AHMAD ]',
    detail: 'Patient Context Diagnostics part 3',
  },
]
