/* ============================================================================
   The provider / organization directory behind MOIS - Search Window.

   PROVENANCE: transcribed from `reference/mois-search-window.png`. The window
   searches three record types at once — providers, the roles an organization
   defines, and the organizations themselves — which is why its Name column
   mixes `AKEHURST.WILLIAM (TEL4DOC)` with `ADULT PSYCH 1 PRG`, and why the
   organization rows carry a "View Members" link where a provider carries the
   user it is associated with.
   ========================================================================= */

export type DirectoryType = 'PROVIDER' | 'ORGROLE' | 'ORGANIZATION'

export type DirectoryEntry = {
  name: string
  /** the associated user for a provider; organizations show their members */
  associated?: string
  group?: string
  type: DirectoryType
  active?: boolean
  practitionerNo?: string
  payeeNo?: string
  paymentType?: string
}

export const directoryEntries: DirectoryEntry[] = [
  { name: 'ACUTE 1 PLN 1 PRG', type: 'ORGROLE', active: true },
  { name: 'ADULT PSYCH 1 PRG', type: 'ORGANIZATION', active: true },
  { name: 'CT1PRG', type: 'ORGANIZATION', active: true },
  { name: 'AKEHURST.WILLIAM (TEL4DOC)', associated: 'AKEHURST.WILLIAM', type: 'PROVIDER', active: true, practitionerNo: 'J12345', payeeNo: '19090' },
  { name: 'AKEHURST.WILLIAM (UPCC)', associated: 'AKEHURST. WILLIAM', type: 'PROVIDER', active: true, practitionerNo: 'J12345', payeeNo: '12345', paymentType: 'FFS' },
  { name: 'AMIN. MONA', associated: 'AMINORROAYAEE. MONA', type: 'PROVIDER', active: true, practitionerNo: '777', payeeNo: '234' },
  { name: 'ANATOLE. RACHEL', type: 'PROVIDER', active: true },
  { name: 'DENTAL NE', type: 'ORGANIZATION', active: true },
  { name: 'DENTAL NI', type: 'ORGANIZATION', active: true },
  { name: 'DENTAL NW', type: 'ORGANIZATION', active: true },
  { name: 'DOG. MAD', type: 'PROVIDER', active: true },
  { name: 'DOOLITTLE. EDDIE', associated: '(MD) OKUDA, TIKA', type: 'PROVIDER', active: true },
  { name: 'EDS 1 PRG', type: 'ORGANIZATION', active: true },
  { name: 'FAIRCHILD. NESRIN', associated: 'AKEHURST, WILLIAM', type: 'PROVIDER', active: true, practitionerNo: '54321' },
  { name: 'FAKE MEDICAL CLINIC PRG', type: 'ORGANIZATION', active: true },
  { name: 'FAKERRY. FAKER', associated: 'COLLEGE ID # PROVIDERCAP', type: 'PROVIDER', active: true },
  { name: 'GIM CLINIC', type: 'ORGANIZATION', active: true },
  { name: 'ESIEVOADJE, EVONEME', associated: 'ESIEVOADJE, EVONEME', type: 'PROVIDER', active: true, practitionerNo: 'J40881', payeeNo: '40881', paymentType: 'FFS' },
  { name: 'GHATAVI, KAYHAN', associated: 'GHATAVI, KAYHAN', type: 'PROVIDER', active: true, practitionerNo: 'J33120', payeeNo: '33120', paymentType: 'FFS' },
  { name: 'GRUBB, HELENA (LPN)', associated: 'GRUBB, HELENA', type: 'PROVIDER', active: true },
  { name: 'DHALIWAL, RUPINDER (RN)', associated: 'DHALIWAL, RUPINDER', type: 'PROVIDER', active: true },
  { name: 'ROSS, ADRIENNE (NHVC)', associated: 'ROSS, ADRIENNE', type: 'PROVIDER', active: true },
  { name: 'SMITH, DALENE', associated: 'SMITH, DALENE', type: 'PROVIDER', active: true, practitionerNo: 'J21044', payeeNo: '21044', paymentType: 'FFS' },
  { name: 'TECHNICAL SUPPORT', type: 'ORGROLE', active: true },
]
