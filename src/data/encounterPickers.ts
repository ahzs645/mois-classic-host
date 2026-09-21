/* ============================================================================
   The lists and windows the Encounter Detail Window's header fields drop.

   Transcribed from captures of MOIS: TRAINING on chart 3924. Each of these is
   a DropDownDataWindow or a modal in MOIS, not a plain HTML select: they carry
   their own column headers, and the list is painted wider than the field.
   ========================================================================= */

/** `Ser. Loc.` drops a single-column list captioned `Service Location`. */
export const serviceLocations = [
  'ACROPOLIS MANOR',
  'ATLIN HEALTH CENTRE',
  'ATLIN HEALTH CENTRE - AC',
  'BC CANCER',
  'BLK HEALTH UNIT',
  'CAST - NIHU 3RD FLOOR - AC',
  'CHETWYND GENERAL HOSPITAL - AC',
  'CHETWYND PRIMARY CARE CLINIC - AC',
  'CHILD DEVELOPMENT CENTER SMITHERS',
  'CHILD HEALTH CARE CLINIC',
  'CHT HEALTH UNIT',
  'CLINIC NIHU',
  'CLOUD CITY - MHK Test',
  'COAST - HOME PROGRAM - AC',
  'COAST - NIHU - 3RD FLOOR - AC',
  'COMMUNITY',
].map((name) => ({ name }))

/** `Appt Status` drops a two-column `Code | Description` list. */
export const apptStatusCodes = [
  { code: 'A', description: 'Arrived' },
  { code: 'I', description: 'In Room' },
  { code: 'S', description: 'Seen' },
  { code: 'D', description: 'Discharged' },
  { code: 'N', description: 'No Show' },
  { code: 'R', description: 'Rebooked' },
  { code: 'C', description: 'Cancelled' },
]

/** A row of the `MOIS - Search Window` the `Attending` ellipsis opens. */
export type ProviderSearchRow = {
  name: string
  role: string
  type: string
  members: string
  status: string
}

export const providerSearchRows: ProviderSearchRow[] = [
  { name: '(MD) BILL, SIMON', role: 'MEDICAL DOCTOR', type: 'PROVIDER', members: 'BILL, SIMON', status: 'A' },
  { name: '(MD) CAT, CHESHIRE', role: 'MEDICAL DOCTOR', type: 'PROVIDER', members: 'CAT, CHESHIRE; CAT, CHESHIRE (KWADACHA)', status: 'A' },
  { name: '(MD) ICECREAM, STRAWBERRY', role: 'MEDICAL DOCTOR', type: 'PROVIDER', members: 'ICECREAM, STRAWBERRY', status: 'A' },
  { name: '(MD) JEKYLL, HENRY', role: 'MEDICAL DOCTOR', type: 'PROVIDER', members: 'JEKYLL, HENRY', status: 'A' },
  { name: '(MD) JOHNSON, CAVE', role: 'MEDICAL DOCTOR', type: 'PROVIDER', members: 'JOHNSON, CAVE', status: 'A' },
  { name: '(MD) KAPOOR, SHAHID', role: 'MEDICAL DOCTOR', type: 'PROVIDER', members: 'KAPOOR, SHAHID', status: 'A' },
  { name: '(MD) REED, TREVOR', role: 'MEDICAL DOCTOR', type: 'PROVIDER', members: 'REED, TREVOR', status: 'A' },
  { name: '(MD) SCOTT, MICHAEL', role: 'MEDICAL DOCTOR', type: 'PROVIDER', members: 'SCOTT, MICHAEL', status: 'A' },
  { name: '(MD) SINGH, SNDP', role: 'MEDICAL DOCTOR', type: 'PROVIDER', members: 'SINGH, SNDP', status: 'A' },
  { name: '(MD) SMITH, PETER', role: 'MEDICAL DOCTOR', type: 'PROVIDER', members: 'SMITH, PETER', status: 'A' },
  { name: '(MD) STOCKMAN, BAXTER', role: 'MEDICAL DOCTOR', type: 'PROVIDER', members: 'STOCKMAN, BAXTER', status: 'A' },
  { name: '(MD) STRANGE, STEVEN', role: 'MEDICAL DOCTOR', type: 'PROVIDER', members: 'STRANGE, STEVEN', status: 'A' },
  { name: '(NP) NIGHTINGALE, FLORENCE', role: 'NURSE PRACTITIONER', type: 'PROVIDER', members: 'NIGHTINGALE, FLORENCE', status: 'A' },
  { name: '[MD] BUFFAY, PHOEBE', role: 'MEDICAL DOCTOR', type: 'PROVIDER', members: 'BUFFAY, PHOEBE', status: 'A' },
  { name: 'AKEHURST, WILLIAM', role: 'TECHNICIAN GROUP', type: 'PROVIDER', members: 'AKEHURST, WILLIAM (DTU); AKEHURST, WI…', status: 'A' },
  { name: 'AMINORROAYAEE, MONA', role: 'TECHNICIAN GROUP', type: 'PROVIDER', members: 'AMIN, MONA', status: 'A' },
  { name: 'ANATOLE, RACHEL', role: 'TECHNICIAN GROUP', type: 'PROVIDER', members: 'GORHAM, RACHEL', status: 'A' },
  { name: 'BUDAC, LEAH', role: 'TECHNICIAN GROUP', type: 'PROVIDER', members: 'RIZZO, LEAH', status: 'A' },
  { name: 'DUCHARME, AMARILYS', role: 'TECHNICIAN GROUP', type: 'PROVIDER', members: 'HOWSER, DOOGIE (NHVC)', status: 'A' },
  { name: 'GIESBRECHT, ABBY', role: 'TECHNICIAN GROUP', type: 'PROVIDER', members: 'TEST, TEST TEST', status: 'A' },
  { name: 'MARTIN, JERRY', role: 'TECHNICIAN GROUP', type: 'PROVIDER', members: 'MARTIN, JERRY', status: 'A' },
  { name: 'MD JOURNEY, LARRY', role: 'MEDICAL DOCTOR', type: 'PROVIDER', members: 'JOURNEY, LARRY', status: 'A' },
  { name: 'MEDLYN, DAVID', role: 'TECHNICIAN GROUP', type: 'PROVIDER', members: 'SCULLY, DANA', status: 'A' },
  { name: 'MEYER, DEVON', role: 'TECHNICIAN GROUP', type: 'PROVIDER', members: 'MAYER, OSCAR; MEYER, DEVON', status: 'A' },
  { name: 'MURPHY, JOAN', role: 'TECHNICIAN GROUP', type: 'PROVIDER', members: 'MURPHY, JOAN; MURPHY, JOAN (SMI MAT)', status: 'A' },
  { name: 'OLEXYN, JACOB', role: 'TECHNICIAN GROUP', type: 'PROVIDER', members: 'OLEXYN, JACOB (UPCC)', status: 'A' },
  { name: 'RAJANNA, NANDA', role: 'TECHNICIAN GROUP', type: 'PROVIDER', members: 'RAJANNA, NANDA', status: 'A' },
  { name: 'SINGH, GURIQBAL', role: 'TECHNICIAN GROUP', type: 'PROVIDER', members: 'ROCKSTAR, ALICE (NHVC); TEST, TEST', status: 'A' },
]

/** A row of `Patient's Service Episodes`, which `New…` on Service(s) opens. */
export type ServiceEpisodeRow = {
  episode: string
  mrp: string
  start: string
  stop: string
}

export const serviceEpisodeRows: ServiceEpisodeRow[] = [
  { episode: 'CHRONIC DISEASE AND CONDITION MANAGEMENT', mrp: 'TECHNICAL SUPPORT', start: '2025.11.18', stop: '' },
  { episode: 'HOME CARE NURSING', mrp: 'PCIPT 2 NURSE 2 SMI', start: '2025.09.17', stop: '' },
  { episode: 'HOME CARE NURSING', mrp: 'PCIPT 2 NURSE 1 SMI', start: '2025.09.17', stop: '' },
  /* a stopped episode: MOIS greys the whole row */
  { episode: 'MATERNAL CHILD INFANT YOUTH & FAMILY HEALTH', mrp: 'UPCC NURSE 1 PRG', start: '2026.01.12', stop: '2026.01.12' },
]

/* ============================================================================
   The two code lookups the encounter header's `…` buttons open.

   Health Issues opens the Universal Search Window; Services opens the
   Advanced Lookup Service over the Master Service Code List. Both are
   transcribed from captures on chart 3924.
   ========================================================================= */

/** A row of the Universal Search Window's result grid. */
export type UniversalSearchRow = {
  term: string
  category: string
  code: string
  system: string
  /** the `Alternate Terms` pane's contents for this row */
  alternates: string[]
}

/** The code systems the search runs against; `More…` is greyed in the capture. */
export const universalCodeSystems = ['ICD-9', 'NHA CUSTOM', 'SNOMED-CT']

/** The reference sets that narrow it, both unchecked by default. */
export const universalReferenceSets = ['HEALTH CONCERNS', 'HEALTH CONCERNS (BC)']

/* The first page of ICD-9 terms, which is what the window opens on. MOIS caps
   the list at the `Limit list to` parameter and prints `Rows: 200` under it
   even though only the first screenful is painted. */
export const universalSearchRows: UniversalSearchRow[] = [
  { term: 'ABDMNAL MASS LFT UP QUAD', category: 'DIAGNOSIS', code: '78932', system: 'ICD-9', alternates: ['ABDOMINAL OR PELVIC SWELLING, MASS, OR LUMP, LEFT UPPER QUADRANT'] },
  { term: 'ABDMNAL TNDR LFT UP QUAD', category: 'DIAGNOSIS', code: '78962', system: 'ICD-9', alternates: ['ABDOMINAL TENDERNESS, LEFT UPPER QUADRANT'] },
  { term: 'ABN PELV TIS OBSTR-ANTEP', category: 'DIAGNOSIS', code: '66023', system: 'ICD-9', alternates: [] },
  { term: 'ABNORMAL GLUCOSE NEC', category: 'DIAGNOSIS', code: '79029', system: 'ICD-9', alternates: [] },
  { term: 'AC DVT/EMB DISTL LOW EXT', category: 'DIAGNOSIS', code: '45342', system: 'ICD-9', alternates: [] },
  { term: 'AC LEUK UNS CL RELAPSE', category: 'DIAGNOSIS', code: '20802', system: 'ICD-9', alternates: [] },
  { term: 'ACCIDENT D/T FLOODS', category: 'DIAGNOSIS', code: 'E9082', system: 'ICD-9', alternates: [] },
  { term: 'ACETABULUM FRACTURE - OPEN', category: 'INJ', code: '8081', system: 'ICD-9', alternates: [] },
  { term: 'ACHALASIA AND CARDIOSPASM', category: 'DIG', code: '5300', system: 'ICD-9', alternates: [] },
  { term: 'ADJUST REACT-WITHDRAWAL', category: 'DIAGNOSIS', code: '30983', system: 'ICD-9', alternates: [] },
  { term: 'ADRENOGENITAL DISORDERS', category: 'END', code: '2552', system: 'ICD-9', alternates: [] },
  { term: 'ADV EFF ANALEPTICS', category: 'DIAGNOSIS', code: 'E9400', system: 'ICD-9', alternates: [] },
  { term: 'ADV EFF ANALGESIC NOS', category: 'DIAGNOSIS', code: 'E9359', system: 'ICD-9', alternates: [] },
  { term: 'ADV EFF GANGLION-BLOCK', category: 'DIAGNOSIS', code: 'E9423', system: 'ICD-9', alternates: [] },
  { term: 'ADV EFF METHADONE', category: 'DIAGNOSIS', code: 'E9351', system: 'ICD-9', alternates: [] },
  { term: 'ADV EFF PHENOTHIAZ TRANQ', category: 'DIAGNOSIS', code: 'E9391', system: 'ICD-9', alternates: [] },
]

/** A row of the Master Service Code List. */
export type ServiceCodeRow = {
  code: string
  description: string
  /** the three fee schedules, as strings — an un-priced USER code shows `-` */
  msp: string
  wcb: string
  private: string
  system: string
  category: string
  type: string
}

/* Fees are the training database's, not a real MSP schedule. The two codes
   that differ only by a leading zero are MOIS's own duplicates: the padded
   form carries the current fee and the bare one an older schedule. */
export const serviceCodeRows: ServiceCodeRow[] = [
  { code: '22023', description: '10 OR 24 HOUR TENSION CURVE - DIURNAL', msp: '34.59', wcb: '36.62', private: '136.00', system: 'BCMSPFEE', category: '', type: 'EVENT' },
  { code: '92353', description: '13C TRIOLEIN BREATH TEST FOR MALABSORPTION', msp: '67.91', wcb: '89.60', private: '214.00', system: 'BCMSPFEE', category: '', type: 'EVENT' },
  { code: '92520', description: '1-AMPHETAMINE', msp: '70.92', wcb: '93.61', private: '212.00', system: 'BCMSPFEE', category: '', type: 'EVENT' },
  { code: '92521', description: '1-METAMPHETAMINE', msp: '70.92', wcb: '93.61', private: '212.00', system: 'BCMSPFEE', category: '', type: 'EVENT' },
  { code: '07915', description: '1ST ASSIST AT OPEN HEART SURGERY: <= $1027.00', msp: '270.52', wcb: '279.00', private: '559.00', system: 'BCMSPFEE', category: '', type: 'EVENT' },
  { code: '07917', description: '1ST ASSIST AT OPEN HEART SURGERY: > $1027.00', msp: '388.13', wcb: '400.34', private: '808.00', system: 'BCMSPFEE', category: '', type: 'EVENT' },
  { code: '7915', description: '1ST ASSIST AT OPEN HEART SURGERY: <= $1033.00', msp: '275.83', wcb: '279.00', private: '665.00', system: 'BCMSPFEE', category: '', type: 'EVENT' },
  { code: '7917', description: '1ST ASSIST AT OPEN HEART SURGERY: > $1033.00', msp: '395.75', wcb: '400.34', private: '960.00', system: 'BCMSPFEE', category: '', type: 'EVENT' },
  /* a site-defined code: no fees, and MOIS keeps the leading space it was
     typed with, which is why it sorts above the numeric codes */
  { code: 'CD003', description: ' 208 SENT TO BCCDC', msp: '-', wcb: '-', private: '-', system: 'USER', category: '', type: 'EVENT' },
  { code: '00540', description: '24 HOUR INTRA-ESOPHAGEAL PH STUDY IN CHILDREN', msp: '235.55', wcb: '196.85', private: '501.00', system: 'BCMSPFEE', category: '', type: 'EVENT' },
  { code: '540', description: '24 HOUR INTRA-ESOPHAGEAL PH STUDY IN CHILDREN', msp: '245.54', wcb: '196.85', private: '974.00', system: 'BCMSPFEE', category: '', type: 'EVENT' },
  { code: '07916', description: '2ND & 3RD ASSISTS AT OPEN HEART SURG: <= $1027.00', msp: '158.21', wcb: '163.17', private: '340.00', system: 'BCMSPFEE', category: '', type: 'EVENT' },
  { code: '07918', description: '2ND & 3RD ASSISTS AT OPEN HEART SURG: > $1027.00', msp: '242.77', wcb: '250.40', private: '508.00', system: 'BCMSPFEE', category: '', type: 'EVENT' },
  { code: '7916', description: '2ND & 3RD ASSISTS AT OPEN HEART SURG: <= $1033.00', msp: '161.32', wcb: '163.17', private: '405.00', system: 'BCMSPFEE', category: '', type: 'EVENT' },
  { code: '7918', description: '2ND & 3RD ASSISTS AT OPEN HEART SURG: > $1033.00', msp: '247.53', wcb: '250.40', private: '605.00', system: 'BCMSPFEE', category: '', type: 'EVENT' },
  { code: '04024', description: '4TH DEGREE LACERATION - REPAIR', msp: '234.34', wcb: '213.67', private: '703.00', system: 'BCMSPFEE', category: '', type: 'EVENT' },
  { code: '4024', description: '4TH DEGREE LACERATION - REPAIR', msp: '290.53', wcb: '213.67', private: '1,058.00', system: 'BCMSPFEE', category: '', type: 'EVENT' },
  { code: 'A0006', description: '- 6TH OR ADDITIONAL HALF DAY SESSION THE SAME WEEK - PER', msp: '0.00', wcb: '0.00', private: '723.18', system: 'BCMAFEE', category: '', type: 'EVENT' },
  { code: '06136', description: 'ABBE OPERATION', msp: '628.77', wcb: '625.19', private: '2,264.00', system: 'BCMSPFEE', category: '', type: 'EVENT' },
  { code: '6136', description: 'ABBE OPERATION', msp: '641.12', wcb: '625.19', private: '2,690.00', system: 'BCMSPFEE', category: '', type: 'EVENT' },
  { code: '07041', description: 'ABDOMEN ASPIRATION/CHEST', msp: '41.05', wcb: '41.37', private: '170.00', system: 'BCMSPFEE', category: '', type: 'EVENT' },
]
