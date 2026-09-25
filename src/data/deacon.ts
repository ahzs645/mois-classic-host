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
   than an invented one.
   ========================================================================= */

export type DeaconFunction = {
  group: string
  name: string
  description?: string
  params?: string[]
}

type Group = [group: string, functions: (string | DeaconFunction)[]]

const GROUPS: Group[] = [
  ['ADVANCED REPORT BUILDER', ['Move Intervention Rules to MAR rules']],
  ['CARE PLAN', ['Reset or Append Standard Care Plan Display']],
  ['CHART - PATIENT STATUS', ['Set the chart status of patient charts after export']],
  ['CHART - RECALL STOP', ['Stop recalls for a specific recall code']],
  ['CHART - SERVICE PROVIDER', [
    'Delete future daybook for selected provider',
    {
      group: 'CHART - SERVICE PROVIDER',
      name: 'Find and Replace Provider',
      /* `223b1919…`, word for word */
      description: 'This function will find all the charts with the current service provider and change the service provider to the Replace With Provider below.',
      params: ['Current Service Provider', 'Replace with Service Provider'],
    },
    'Patient/Provider Last Seen',
    {
      group: 'CHART - SERVICE PROVIDER',
      name: 'Replace Blank service Providers',
      /* not captured open: 303367's own words for it, and the one provider
         it asks for ("replace all patients with no service provider
         selected with the chosen physician") */
      params: ['Replace with Service Provider'],
    },
    'Update patient service provider based on data source',
    'Update Patient Status for selected provider',
  ]],
  ['DRUG FREQUENCY ADDITION', ['Add/Delete/Update Drug Frequency Settings']],
  ['MSP - LFP PATIENT PANEL', [
    'Create bulk patient LFP registration claims',
    'Undo/Delete bulk patient LFP registration claims',
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
