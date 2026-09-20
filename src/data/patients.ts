/* ============================================================================
   The patient chart roster.

   MOIS is a chart-at-a-time application: one chart is open in the Patient
   Chart module and every screen in it — identity strip, patient banners,
   Demographics — reads that one record. The Advanced Lookup Service is how
   the chart is changed, so the emulator needs more than one patient for the
   lookup to mean anything.

   PROVENANCE: transcribed from the Advanced Lookup Service capture in
   `reference/advanced-lookup-service.png` — the training environment's
   Patient Chart List, which is fictional data. Chart 3924 is the record the
   rest of the kit was already built from (PATCH AADAMS): its middle name is
   kept as JULIAN, the way the older encounter captures show it, and its
   BC Health No. and active encounter come from those same captures.

   Gender is not a column in that list; it is assigned here so Demographics
   and the patient banners have something to show.
   ========================================================================= */

export type Patient = {
  /** tdt_chart.chart_no — the identifier MOIS puts on every window */
  chart: string
  /** A = active, LU = look-up only */
  status: 'A' | 'LU'
  first: string
  middle: string
  last: string
  alias?: string
  /** YYYY.MM.DD, the way MOIS renders dates everywhere */
  dob: string
  gender: 'M' | 'F' | ''
  /* --- the other gender designations -----------------------------------
     `gender` above is the chart's *administrative* gender. MOIS keeps the
     patient's preferred and genotypic gender beside it, behind the `.*.`
     next to the Gender field, each with its own "Include on Demographics"
     flag — see `reference/advanced-gender-designations.png`. A chart
     carrying one of them is what paints the Gender label yellow. */
  genderDesignations?: {
    /** a code from `preferredGenderRows` (F, M, N) */
    preferred?: string
    /** a code from `genotypicGenderRows` (F, M, XO, XXY, XYY) */
    genotypic?: string
    /** the designations MOIS prints on Demographics */
    onDemographics?: ('administrative' | 'preferred' | 'genotypic')[]
    comment?: string
  }
  /** preferred phone, as typed into the chart — MOIS does not normalise it */
  home?: string
  /* --- Contact Information, as Demographics paints it ------------------
     A host supplies these from the chart it already holds (Webforms projects
     them out of the same PatientScenario a form binds against), so the
     emulator's Demographics window and a form's patient fields never
     disagree. The training roster fills them from the captures. */
  address?: string
  address2?: string
  city?: string
  province?: string
  postal?: string
  country?: string
  work?: string
  workExt?: string
  cell?: string
  fax?: string
  emailHome?: string
  emailWork?: string
  /** the contact method the chart prefers — MOIS underlines that label */
  preferredPhone?: string
  /** the "Leave Message" flag beside each number */
  homeMessage?: boolean
  workMessage?: boolean

  /* --- Office / Pharmacy / audit --------------------------------------- */
  lastContact?: string
  pharmacy?: { name?: string; address?: string; phone?: string; fax?: string }
  /** `YYYY.MM.DD  HH:MM  USER` — the window's Created / Last Modified line */
  created?: string
  modified?: string
  /** the chart's coded flags, as the Selected Items grid lists them */
  selectedItems?: { code: string; value: string }[]
  insurance?: string
  /** insurance carrier: BC (MSP), AB, PP (private pay) */
  insuranceBy?: string
  dep?: string
  bchn?: string
  note?: string
  /** chart location */
  location?: string
  provider?: string
  /** tdt_chart registration date, the "Date:" on Patient Summary */
  registered?: string
  /** the open encounter, when the chart has one */
  encounter?: string
}

/** The date the training environment was captured; ages are figured from it. */
export const MOIS_TODAY = '2026.09.18'

export const patients: Patient[] = [
  {
    /* the chart `reference/demographics-full.png` was captured on, so the
       standalone gallery opens on a Demographics window with every block
       filled the way the training environment shows it */
    chart: '3424', status: 'A', registered: '2025.08.08', last: 'AADAMS', first: 'PATCH', middle: 'WARREN',
    dob: '2024.12.06', gender: 'F', home: '250-565-7890', insurance: '91234657899', insuranceBy: 'AB', dep: '00',
    /* the Gender label is yellow on this chart's Patient Summary capture, so
       the chart carries a second designation; which one the capture does not
       say, and it is assigned here the way `gender` itself is */
    genderDesignations: { preferred: 'N', onDemographics: ['preferred'] },
    address: '#4554 HOME STREET', city: 'PRINCE GEORGE', province: 'BC', postal: 'V2M 2N0', country: 'Canada',
    preferredPhone: 'Home', homeMessage: true, workMessage: false,
    lastContact: '2026.09.08',
    pharmacy: {
      name: 'LONDON DRUGS #51 - PRINCE GEORGE ...',
      address: 'Parkwood Place Mall',
      phone: '1 250-561-1118',
      fax: '1 250-561-1050',
    },
    created: '2024.02.14  10:28  DUCHARME, AMARILYS',
    modified: '2026.04.27  13:26  AMINORROAYAEE, MONA',
    /* the chart's coded flags; the first two rows have no code in the capture */
    selectedItems: [
      { code: '', value: 'MORTICIA ADAAMS   453.798.7938' },
      { code: '', value: 'UPCC 1 PRG' },
      { code: 'ABORG', value: '123' },
      { code: 'ABORG', value: 'Canim Lake Indian Band' },
      { code: 'ABORG', value: "Lheidli T'enneh Band" },
      { code: 'ABORG', value: 'Blueberry River First Nation' },
      { code: 'ABORG', value: "Lheidli T'enneh Band" },
      { code: 'ABORG', value: 'Lhtako Dene Nation' },
      { code: 'ABORG', value: '123' },
    ],
  },
  /* chart block read off `reference/patient-summary-3598.png`: MOIS prints
     this chart's insurance and health numbers in groups of three */
  { chart: '3598', status: 'A', registered: '2024.09.17',  last: 'AADAMS',   first: 'PATCH',  middle: 'HARRY',      dob: '1993.05.12', gender: 'M', home: '259.876.5678', cell: '778999666', insurance: '9876 588 666', insuranceBy: 'BC', dep: '00', bchn: '9876 588 666' },
  {
    /* `reference/patient-summary-3924.png` is the newest capture of this chart
       and the one the emulator opens on, so its chart block is the authority:
       no middle name, no insurer, no Dep, no BC Health No. and no service
       provider. The older encounter captures still show MIDDLE: JULIAN, which
       is the same chart earlier in its life, not a second reading. */
    chart: '3924', status: 'A', registered: '2025.08.27', last: 'AADAMS', first: 'PATCH', middle: '',
    alias: 'WEBFORMS TEST', dob: '1986.12.19', gender: 'M', home: '250.765.3212',
    insurance: 'WFvx0zyo', note: 'WEBFORMS TEST mtvx0y',
    encounter: '10065087',
  },
  { chart: '2429', status: 'A', registered: '2019.06.11',  last: 'AARONSON', first: 'FLO',    middle: '',           alias: 'MICKEY', dob: '1970.03.04', gender: 'F', home: '555.555.5678', insurance: '987836902', bchn: '987836902' },
  { chart: '746',  status: 'A', registered: '2016.09.02',  last: 'AARONSON', first: 'FRANK',  middle: 'WOLTER',     dob: '2000.06.14', gender: 'M', home: '250.983.4566', insurance: '9086756685', insuranceBy: 'BC', bchn: '9086756685' },
  { chart: '2680', status: 'LU', registered: '2018.03.22', last: 'AD',       first: 'AD',     middle: 'AD',         dob: '1980.04.14', gender: '',  note: 'LONG APPOINTMENT' },
  { chart: '3429', status: 'A', registered: '2025.01.30',  last: 'ADAAMS',   first: 'PATCH',  middle: '',           dob: '1990.01.15', gender: 'M', home: '250.786.5432', insurance: '9657896456', insuranceBy: 'BC', bchn: '9657896456' },
  { chart: '3436', status: 'A', registered: '2025.02.04',  last: 'ADAAMS',   first: 'PATCH',  middle: 'BERT',       dob: '1989.01.25', gender: 'M', home: '256.789.0987', insurance: '9106543425', insuranceBy: 'BC', bchn: '9106543425' },
  { chart: '1003', status: 'A', registered: '2024.07.03',  last: 'ADAMS',    first: 'BRYAN',  middle: '',           alias: 'SUSAN', dob: '2024.06.25', gender: 'M', home: '250-562-7304', insurance: '9234567156', insuranceBy: 'BC', bchn: '9234567156' },
  { chart: '2365', status: 'A', registered: '2021.05.17',  last: 'ADAMS',    first: 'BRYAN',  middle: '',           dob: '', gender: 'M', home: '778999666', insuranceBy: 'PP' },
  { chart: '1336', status: 'A', registered: '2026.03.05',  last: 'ADAMS',    first: 'JOSEPH', middle: 'CHARLES',    alias: 'DOLORES', dob: '2026.03.01', gender: 'M', home: '250.111.2255', insurance: '654657658', insuranceBy: 'BC', bchn: '654657658' },
  { chart: '3093', status: 'A', registered: '2024.02.20',  last: 'ADAMS',    first: 'JUSTINE', middle: '',          dob: '2024.02.06', gender: 'F', insurance: '9878375689', insuranceBy: 'BC', bchn: '9878375689' },
  { chart: '3609', status: 'A', registered: '2025.04.14',  last: 'ADAMS',    first: 'NICOLE', middle: '',           dob: '1998.09.23', gender: 'F', home: '250.987.6756', insurance: '87567576598', insuranceBy: 'BC' },
  { chart: '3811', status: 'A', registered: '2026.06.18',  last: 'ADAMS',    first: 'NICOLE', middle: '',           dob: '2026.06.15', gender: 'F', home: '250987867', insurance: '765657655', insuranceBy: 'BC' },
  { chart: '2350', status: 'A', registered: '2020.10.08',  last: 'ADAMS',    first: 'PATCH',  middle: '',           dob: '1990.12.12', gender: 'M', home: '250.111.1234', insurance: '987784786', insuranceBy: 'BC', bchn: '987784786' },
  { chart: '3132', status: 'A', registered: '2023.08.29',  last: 'ADAMS',    first: 'PATCH',  middle: '',           dob: '1990.01.01', gender: 'M', home: '250.987.7867', insurance: '9523654125', insuranceBy: 'BC', bchn: '9523654125' },
  { chart: '1885', status: 'A', registered: '2017.11.23',  last: 'ADAMS',    first: 'SAMUEL', middle: '',           dob: '1974.05.06', gender: 'M', home: '250.565.3542', insurance: '9250737623', insuranceBy: 'BC', bchn: '9250737623' },
  { chart: '3658', status: 'A', registered: '2025.05.06',  last: 'ADAMS',    first: 'SARAH',  middle: '',           dob: '2000.06.06', gender: 'F', insurance: '9878768765675', insuranceBy: 'BC' },
  { chart: '712',  status: 'A', registered: '2015.04.09',  last: 'ADAMSON',  first: 'SAM',    middle: '',           alias: 'SAMMY', dob: '1972.03.08', gender: 'M', home: '250.987.6543', insurance: '9042191021', insuranceBy: 'PP', bchn: '9042191021' },
  { chart: '2494', status: 'A', registered: '2024.01.25',  last: 'AKEEM',    first: 'BABY',   middle: 'TEDDY JAMES', dob: '2024.01.23', gender: 'M', insurance: '9876567898', insuranceBy: 'PP' },
  { chart: '4146', status: 'A', registered: '2026.06.04',  last: 'ALAN',     first: 'BABY',   middle: '',           dob: '2026.06.03', gender: 'M', home: '250.333.2222', insurance: '9874587458', insuranceBy: 'BC', bchn: '9874587458' },
]

/**
 * Fill a host-supplied chart out to the shape the screens read. A host knows
 * its patients' names and chart numbers; the MOIS-specific columns it has no
 * answer for stay blank rather than showing someone else's data.
 */
export function normalizePatient(input: {
  chart: string
  first: string
  last: string
  status?: string
  middle?: string
  dob?: string
  gender?: string
} & Partial<Omit<Patient, 'chart' | 'first' | 'last' | 'status' | 'middle' | 'dob' | 'gender'>>): Patient {
  const gender = (input.gender ?? '').trim().charAt(0).toUpperCase()
  return {
    ...input,
    chart: input.chart,
    status: input.status === 'LU' ? 'LU' : 'A',
    first: input.first,
    middle: input.middle ?? '',
    last: input.last,
    dob: input.dob ?? '',
    gender: gender === 'M' || gender === 'F' ? gender : '',
  }
}

/** The chart the Patient Chart module opens on when no roster is supplied. */
export const DEFAULT_CHART = '3924'

export function findPatient(chart: string, roster: Patient[] = patients): Patient | undefined {
  return roster.find((p) => p.chart === chart)
}

/**
 * The age caption MOIS puts on a window: whole years, or whole months while
 * the patient is under two — `21 MTH OLD`, `39 YR OLD`. Empty for a chart
 * with no birth date.
 */
export function ageOf(dob: string, today = MOIS_TODAY): string {
  if (!dob) return ''
  const [by, bm, bd] = dob.split('.').map(Number)
  const [ty, tm, td] = today.split('.').map(Number)
  if (!by || !ty) return ''
  let months = (ty - by) * 12 + (tm - bm)
  if (td < bd) months -= 1
  if (months < 0) return ''
  return months < 24 ? `${months} MTH OLD` : `${Math.floor(months / 12)} YR OLD`
}

export const fullName = (p: Patient) => [p.first, p.middle, p.last].filter(Boolean).join(' ')
export const shortName = (p: Patient) => `${p.first} ${p.last}`

/** The next / previous chart in list order — MOIS's Next Chart / Previous Chart. */
export function stepChart(chart: string, delta: 1 | -1, roster: Patient[] = patients): string {
  if (roster.length === 0) return chart
  const i = roster.findIndex((p) => p.chart === chart)
  if (i < 0) return roster[0].chart
  return roster[(i + delta + roster.length) % roster.length].chart
}
