/* ============================================================================
   Unmatched inbound results — the v2.31.41 enhancements in 303492 "Match
   Unmatched Labs". Demonstration data; all names fictional.

   PROVENANCE
   · User Alias Review rows — `5f32d5f5…`: ADMINISTRATOR 2015.09.15 BCMSP
     00003; WORKSPACE, USER 1 2017.03.27 BCMSP / EXC / IHA / NHA bw1.
     The rest are INFERRED in the same shape.
   · Activity — `e9610920…` ("Activity 5 records": User Match, Fax, Ignore,
     Assigned "To: …", Print — each "on yyyy.mm.dd hh:mm by: user" with the
     reason under it). Seeded for the first lab result; the stage's own
     actions are added on top.
   · Routing — `59647e5a…` (System Default Inbox ADMINISTRATOR / Change
     Default; Enable Unmatched Patient Handling Service ticked, Default
     Unmatched Inbox ADMINISTRATOR / Change Inbox) and `95dab64d…`
     ("Unidentified provider and patient connected to" COMMUNITY HEALTH NURSE
     → "will be routed to this inbox" COMMUNITY HEALTH, Add / Add BU /
     Delete).
   · Unmatched Items (Workspace ▸ Basket) — no image of the folder; its
     place is the article's ("Workspace > Basket > Unmatched Items") and
     `4d6a5577…`'s tree (CONFIRM-CURRENT), its filters the article's ("Date
     range; Status (e.g. All, Processed, Unmatched, Printed, Ignored, etc.)
     Default is unmatched; Patient name"). Columns and rows INFERRED.
   ========================================================================= */

export type AliasRow = { user: string; kind: 'User' | 'Provider' | 'Org' | 'Org Role'; active: string; expiry: string; code: string; value: string; start: string; stop: string; note: string }

export const ALIAS_SOURCES = ['BCMSP', 'EXC', 'IHA', 'NHA', 'CDX']

export const ALIAS_ROWS: AliasRow[] = [
  { user: 'ADMINISTRATOR', kind: 'User', active: '2015.09.15', expiry: '-', code: 'BCMSP', value: '00003', start: '-', stop: '-', note: '' },
  { user: 'WORKSPACE, USER 1', kind: 'User', active: '2017.03.27', expiry: '-', code: 'BCMSP', value: 'bw1', start: '2017.03.27', stop: '-', note: '' },
  { user: 'WORKSPACE, USER 1', kind: 'User', active: '2017.03.27', expiry: '-', code: 'EXC', value: 'bw1', start: '2017.03.27', stop: '-', note: '' },
  { user: 'WORKSPACE, USER 1', kind: 'User', active: '2017.03.27', expiry: '-', code: 'IHA', value: 'bw1', start: '2017.03.27', stop: '-', note: '' },
  { user: 'WORKSPACE, USER 1', kind: 'User', active: '2017.03.27', expiry: '-', code: 'NHA', value: 'bw1', start: '2017.03.27', stop: '-', note: '' },
  { user: 'HALLIWELL, A.', kind: 'Provider', active: '2019.02.01', expiry: '-', code: 'BCMSP', value: '00003', start: '2019.02.01', stop: '-', note: 'MSP pract #' },
  { user: 'SURGEON, THOMAS', kind: 'User', active: '2021.05.10', expiry: '-', code: 'EXC', value: 'TS4471', start: '2021.05.10', stop: '-', note: '' },
  { user: 'ONCOLOGY, JENNIFER', kind: 'User', active: '2020.01.06', expiry: '2025.12.31', code: 'NHA', value: 'JO2208', start: '2020.01.06', stop: '2025.12.31', note: 'Left clinic' },
  { user: 'COMMUNITY HEALTH NURSE', kind: 'Org Role', active: '2022.04.01', expiry: '-', code: 'NHA', value: 'CHN01', start: '2022.04.01', stop: '-', note: '' },
]

/** Who a user / provider / org / org role may be — the New / Edit picker (INFERRED). */
export const ALIAS_OWNERS: Record<AliasRow['kind'], string[]> = {
  User: ['ADMINISTRATOR', 'ONCOLOGY, JENNIFER', 'SURGEON, THOMAS', 'WORKSPACE, USER 1'],
  Provider: ['FAM, BOB', 'HALLIWELL, A.', 'INTERNIST, JIM', 'SHEPHERD, DEREK'],
  Org: ['NORTHERN HEALTH', 'BRIGHT HEALTH CLINIC'],
  'Org Role': ['COMMUNITY HEALTH NURSE', 'MOA TEAM'],
}

export type ActivityEntry = { kind: 'User Match' | 'System Match' | 'Print' | 'Ignore' | 'Fax' | 'Assigned'; when: string; by: string; text: string }

export const ACTIVITY_SEED: ActivityEntry[] = [
  { kind: 'User Match', when: '2025.09.01 12:24', by: 'surgeon, thomas', text: '' },
  { kind: 'Fax', when: '2025.09.01 12:15', by: 'surgeon, thomas', text: 'testing' },
  { kind: 'Ignore', when: '2025.09.01 12:13', by: 'surgeon, thomas', text: 'ignore all' },
  { kind: 'Assigned', when: '2025.09.01 12:11', by: 'oncology, jennifer', text: 'To: Surgeon, Thomas' },
  { kind: 'Print', when: '2025.09.01 12:11', by: 'oncology, jennifer', text: 'reprint for chart' },
]

export const REASSIGN_TARGETS = { User: ALIAS_OWNERS.User, 'Org Role': ALIAS_OWNERS['Org Role'] }

export type RoutingConfig = {
  systemDefault: string
  handlingEnabled: boolean
  unmatchedInbox: string
  connections: { connection: string; inbox: string; bu?: boolean }[]
}

export const ROUTING: RoutingConfig = {
  systemDefault: 'ADMINISTRATOR',
  handlingEnabled: true,
  unmatchedInbox: 'ADMINISTRATOR',
  connections: [{ connection: 'COMMUNITY HEALTH NURSE', inbox: 'COMMUNITY HEALTH' }],
}
export const ROUTING_INBOXES = ['ADMINISTRATOR', 'COMMUNITY HEALTH', 'HALLIWELL, A.', 'MOA TEAM', 'SURGEON, THOMAS']
export const ROUTING_CONNECTIONS = ['COMMUNITY HEALTH NURSE', 'MOA TEAM', 'HALLIWELL, A.', 'NORTHERN HEALTH', 'PRIMARY CARE BU']

export type UnmatchedItem = {
  id: string; received: string; type: 'Lab Result' | 'Inbound Message'; patient: string; dob: string
  provider: string; test: string; status: 'UNMATCHED' | 'PROCESSED' | 'PRINTED' | 'IGNORED'; assigned: string
}

export const UNMATCHED_ITEMS: UnmatchedItem[] = [
  { id: 'um-1', received: '2026.09.17 08:12', type: 'Lab Result', patient: 'LASTNAME, MIDDLE', dob: '2026.09.10', provider: 'HALLIWELL, A.', test: 'CBC & DIFF', status: 'UNMATCHED', assigned: 'HALLIWELL, A.' },
  { id: 'um-2', received: '2026.09.16 14:40', type: 'Inbound Message', patient: 'CARDIO, SAL', dob: '1948.03.02', provider: 'HALLIWELL, A.', test: 'DISCHARGE SUMMARY', status: 'UNMATCHED', assigned: 'HALLIWELL, A.' },
  { id: 'um-3', received: '2026.09.15 09:05', type: 'Lab Result', patient: 'BEAR, PAPPA', dob: '1980.11.02', provider: 'HALLIWELL, A.', test: 'LIPID PROFILE', status: 'PRINTED', assigned: 'HALLIWELL, A.' },
  { id: 'um-4', received: '2026.09.12 11:30', type: 'Lab Result', patient: 'UNKNOWN, PATIENT', dob: '1990.01.01', provider: 'HALLIWELL, A.', test: 'URINALYSIS', status: 'IGNORED', assigned: 'HALLIWELL, A.' },
  { id: 'um-5', received: '2026.09.11 16:02', type: 'Lab Result', patient: 'MOUSE, MICKEY', dob: '1928.11.18', provider: 'HALLIWELL, A.', test: 'HBA1C', status: 'PROCESSED', assigned: 'HALLIWELL, A.' },
]

export const ALIAS_ROWS_KEY = 'exchange:user-aliases'
export const ROUTING_KEY = 'exchange:unmatched-routing'
export const UNMATCHED_ITEMS_KEY = 'workspace:unmatched-items'
/** activity per lab result: `exchange:lab-activity` → { [resultKey]: entries } */
export const LAB_ACTIVITY_KEY = 'exchange:lab-activity'
