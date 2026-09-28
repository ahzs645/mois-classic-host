/* ============================================================================
   DEACON — Data Extraction, Access, & Control (Administration ▸ Utilities).

   The function list is article 3258362's "DEACON Function List", grouped the
   way the window groups it: an upper-case band per group with the functions
   under it. Two captures show the window itself:
     - `223b1919…` (303367): the CHART - SERVICE PROVIDER band open over
       "Find and Replace Provider" and "Replace Blank service Providers", the
       Selected Function panel and a two-row Parameter List;
     - `893775c3…` (303186): the WORKSPACE ITEMS band's two rows, spelt
       "Check items blocking the deactivation of a user account." and
       "Reasign a User's incomplete Tasks and Messages." (MOIS's typo).
   Where a capture spells a function, its spelling wins over the article's.

   Descriptions and parameter lists exist only for the function the capture
   opens; every other function shows its name with an empty panel rather
   than an invented one — except the CHART - SERVICE PROVIDER functions
   3258369 teaches (Delete future daybook, Patient/Provider Last Seen,
   Update Patient Status for selected provider), whose parameters and
   wording are INFERRED from their names so a lesson can run them.
   ========================================================================= */

export type DeaconParamKind = 'provider' | 'date' | 'status' | 'statuses'

export type DeaconFunction = {
  group: string
  name: string
  description?: string
  params?: string[]
  /** what each parameter row takes; a provider drop-down where not named */
  kinds?: Record<string, DeaconParamKind>
  /** the warning a destructive function raises before it runs (INFERRED) */
  confirm?: string
  /** what the results sheet lists (INFERRED; 303367 only says an Excel sheet opens) */
  results?: 'charts' | 'last-seen' | 'appointments'
}

/** Chart statuses the Update Patient Status parameters drop (INFERRED codes). */
export const DEACON_CHART_STATUSES = ['ACTIVE', 'INACTIVE', 'DECEASED', 'MOVED', 'TRANSFERRED OUT']

type Group = [group: string, functions: (string | DeaconFunction)[]]

const GROUPS: Group[] = [
  ['ADVANCED REPORT BUILDER', ['Move Intervention Rules to MAR rules']],
  ['CARE PLAN', ['Reset or Append Standard Care Plan Display']],
  ['CHART - PATIENT STATUS', ['Set the chart status of patient charts after export']],
  ['CHART - RECALL STOP', ['Stop recalls for a specific recall code']],
  ['CHART - SERVICE PROVIDER', [
    /* 3258369 lists this function but its section is empty; the parameters
       and wording are INFERRED from the function's name */
    {
      group: 'CHART - SERVICE PROVIDER',
      name: 'Delete future daybook for selected provider',
      description: "This function will delete all of the selected provider's day book appointments from the date below forward.",
      params: ['Provider', 'Delete Appointments From'],
      kinds: { 'Delete Appointments From': 'date' },
      confirm: "Every appointment in the selected provider's day book from the date given forward will be deleted. This cannot be undone. Do you want to continue?",
      results: 'appointments',
    },
    {
      group: 'CHART - SERVICE PROVIDER',
      name: 'Find and Replace Provider',
      /* `223b1919…`, word for word */
      description: 'This function will find all the charts with the current service provider and change the service provider to the Replace With Provider below.',
      /* 3258369 step 2: "Optional Select specific chart status' to include" */
      params: ['Current Service Provider', 'Replace with Service Provider', 'Chart Status (optional)'],
      kinds: { 'Chart Status (optional)': 'statuses' },
      results: 'charts',
    },
    /* INFERRED, as above */
    {
      group: 'CHART - SERVICE PROVIDER',
      name: 'Patient/Provider Last Seen',
      description: 'This function lists every chart with the selected service provider and the date the patient was last seen by that provider.',
      params: ['Service Provider', 'Not Seen Since'],
      kinds: { 'Not Seen Since': 'date' },
      results: 'last-seen',
    },
    {
      group: 'CHART - SERVICE PROVIDER',
      results: 'charts',
      name: 'Replace Blank service Providers',
      /* not captured open: 303367's own words for it, and the one provider
         it asks for ("replace all patients with no service provider
         selected with the chosen physician") */
      params: ['Replace with Service Provider'],
    },
    'Update patient service provider based on data source',
    /* INFERRED, as above */
    {
      group: 'CHART - SERVICE PROVIDER',
      name: 'Update Patient Status for selected provider',
      description: 'This function will change the chart status of every chart with the selected service provider and the current status below to the new status.',
      params: ['Service Provider', 'Current Chart Status', 'New Chart Status'],
      kinds: { 'Current Chart Status': 'status', 'New Chart Status': 'status' },
      results: 'charts',
    },
  ]],
  ['DRUG FREQUENCY ADDITION', ['Add/Delete/Update Drug Frequency Settings']],
  ['MSP - LFP PATIENT PANEL', [
    /* 3295289 `07de3928…` (Selected Function + Parameter List) and
       `43859d93…` (the list, with the capture's spellings and the Undo
       function open). Run is data/billingPrograms.ts `deaconRun` (A2). */
    {
      group: 'MSP - LFP PATIENT PANEL',
      name: 'Create bulk patient LFP registration claims.',
      description: 'This function will create unsent LFP patient panel registration claims for patients attached to the selected provider and with the selected status code(s) - enter codes as a comma separated list.',
      params: ['Service Provider', 'Patient Status (ie A,TR,)', 'Last Contact As Of (yyyy-mm-dd)', 'Mode (C = claim / R = review)'],
    },
    {
      group: 'MSP - LFP PATIENT PANEL',
      name: 'Undo / delete bulk patient LFP registration claims.',
      description: 'This function will remove any unsent LFP registration claims for a selected Batch.  Note: Claims already sent to MSP will not be removed from MOIS.',
      params: ['MSP Batch ID (from log file)'],
    },
  ]],
  ['SYSTEM - DOCUMENT INVESTIGATION', ['Audit document attachment']],
  ['SYSTEM - ENCOUNTER FORM', ['Remove Encounter Form and Data']],
  ['SYSTEM: DELETE', ['Delete Chart (Use with caution)', 'Delete Encounter (Use with caution)']],
  ['SYSTEM: ENHANCED ACCESS AUDIT', ['Run an enhanced access audit']],
  ['SYSTEM: MCS CODE LOOKUP CONFIGURATION', ['Apply pre-configured Code Lookup Settings']],
  ['SYSTEM: REPORT ROLLUP', [
    '01: Add a Sender Code to the Report Rollup table',
    '02: Add a Sender Code, apply Report Rollup to existing records',
    '03: Apply Report Rollup to existing records',
    '04: Delete existing report rollup code',
    '05: Show report rollup code list',
  ]],
  ['WORKSPACE ITEMS', [
    'Check items blocking the deactivation of a user account.',
    "Reasign a User's incomplete Tasks and Messages.",
  ]],
]

export const DEACON_FUNCTIONS: DeaconFunction[] = GROUPS.flatMap(([group, fns]) =>
  fns.map((f) => (typeof f === 'string' ? { group, name: f } : f)))

export const DEACON_GROUPS: string[] = GROUPS.map(([g]) => g)

export const DEACON_TITLE = 'DEACON - Data Extraction, Access, & Control'
