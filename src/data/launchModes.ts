import { daysFromToday } from './clock'

/* ============================================================================
   Alternate launch modes — Encounter Lite (3797326) and MyEncounters
   (3103943). Demonstration data; all names fictional.

   A launch mode is chosen at sign-in by the user's security profile
   (Administration ▸ Security Profile ▸ Launch Mode tab, and System Settings ▸
   APP SETTING - STARTUP ▸ My Encounters (VP) for the older MyEncounters
   mode). The emulator selects it per stage — see host/manifest.ts
   (`MOIS_CLASSIC_LAUNCH_MODES`) and the shell's `launchMode` prop.

   The encounters listed on the left are the launch mode's own session data
   against charts of the training roster (3424 AADAMS PATCH, 2429 AARONSON
   FLO, 746 AARONSON FRANK, 1885 ADAMS SAMUEL, 712 ADAMSON SAM); their
   reasons and times are INFERRED. Charts created in a launch window live in
   the same session store under 90001 and up.
   ========================================================================= */

export type MoisLaunchMode = 'main' | 'encounter-lite' | 'my-encounters'
/** what a stage may open on: a launch mode, or one of the two choosers in front of it */
export type MoisLaunchStart = MoisLaunchMode | 'select-launch-mode' | 'select-service-group'

export type LiteEncounter = {
  id: string
  chart: string
  name: string
  /** yyyy.mm.dd */
  date: string
  hh: string
  mm: string
  visitCode: string
  reason: string
  status: '' | 'Booked' | 'Arrived' | 'Seen' | 'Discharged' | 'Cancelled'
  slots: string
  mode: 'DE' | 'TL' | 'TM'
  location: string
  start: string
  finish: string
  generalNote: string
  note: string
  author: string
  healthIssues: string[]
  services: string[]
  private?: { who: string; reason: string; duration: string; alert: boolean }
}

export type LiteChart = {
  chart: string; first: string; middle: string; last: string; dob: string; gender: string
  insuranceBy: string; insurance: string; city: string; province: string; postal: string
  preferred: string; home: string; work: string; cell: string
}

/** yyyy.mm.dd n days after the stage's day (data/clock.ts daysFromToday) */
export const dayOffset = daysFromToday

const enc = (id: string, chart: string, name: string, days: number, hh: string, mm: string, reason: string, status: LiteEncounter['status'], note = ''): LiteEncounter => ({
  id, chart, name, date: dayOffset(days), hh, mm, visitCode: 'R', reason, status, slots: '3', mode: 'DE', location: '',
  start: status === 'Seen' || status === 'Discharged' ? `${hh}:${mm}` : '', finish: status === 'Discharged' ? `${hh}:${String(Number(mm) + 15).padStart(2, '0')}` : '',
  generalNote: '', note, author: note ? 'TEST, TEST' : '', healthIssues: ['', '', '', ''], services: ['', '', '', ''],
})

export const LITE_ENCOUNTERS: LiteEncounter[] = [
  enc('le-1', '3424', 'AADAMS, PATCH', 0, '09', '00', 'Follow up', 'Booked'),
  enc('le-2', '2429', 'AARONSON, FLO', 0, '10', '30', 'Wound care & ABIs', 'Discharged', 'Wound reviewed. Dressing changed.'),
  enc('le-3', '746', 'AARONSON, FRANK', -1, '14', '15', 'Medication review', 'Seen', 'Reviewed medications with patient.'),
  enc('le-4', '1885', 'ADAMS, SAMUEL', -4, '11', '00', 'Visit reason', 'Discharged', 'BP stable.'),
  enc('le-5', '712', 'ADAMSON, SAM', -9, '15', '45', 'Annual physical', 'Discharged', 'Annual exam complete.'),
]

export const LITE_PROVIDERS = ['TEST, TEST', 'HALLIWELL, A.', 'TRANSITION SERVICES']
export const VISIT_CODES = ['R', 'C', 'F', 'TL', 'V', 'W']
export const APPT_STATUSES: LiteEncounter['status'][] = ['', 'Booked', 'Arrived', 'Seen', 'Discharged', 'Cancelled']
export const SERVICE_LOCATIONS = ['', 'MAIN OFFICE', 'FAMILY PRACTICE', 'UHNBC']
export const VISIT_REASONS = ['Annual physical', 'Follow up', 'Medication review', 'Prenatal visit', 'Wound care & ABIs']

/** INFERRED — what F4 in the Encounter Note offers */
export const NOTE_TEMPLATES = [
  { author: 'TEST, TEST', name: 'SOAP', description: 'SOAP note', text: 'S:\nO:\nA:\nP:' },
  { author: 'HALLIWELL, A.', name: 'Wound Care', description: 'Wound assessment', text: 'Wound site:\nSize (cm):\nExudate:\nDressing applied:' },
  { author: 'TEST, TEST', name: 'Phone Call', description: 'Telephone encounter', text: 'Called patient re:\nOutcome:' },
  { author: 'HALLIWELL, A.', name: 'Medication Review', description: 'Medication reconciliation', text: 'Current medications reviewed.\nChanges:' },
]

/** MyEncounters' bonus: the provider's default fee code (3103943; INFERRED value) */
export const DEFAULT_FEE_CODE = '00100 - VISIT IN OFFICE (AGE 2 - 59)'

/** Encounter Lite security-profile permissions (3797326 "Setup - Admin"); all granted in the stage. */
export type LitePermissions = {
  launchMain: boolean; createChart: boolean; quickRegistration: boolean
  createEncounter: boolean; updateChart: boolean; sendTask: boolean; makePrivate: boolean
}
export const ALL_PERMISSIONS: LitePermissions = {
  launchMain: true, createChart: true, quickRegistration: false, createEncounter: true, updateChart: true, sendTask: true, makePrivate: true,
}

export const LITE_ENCOUNTERS_KEY = 'launch:encounters'
export const LITE_CHARTS_KEY = 'launch:charts'
