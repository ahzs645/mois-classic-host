/* ============================================================================
   Build the emulator's `Patient` record from a chart export.

   The alternative is hand-copying the demographics into `patients.ts`, which
   guarantees the Demographics window and every clinical screen eventually
   disagree about the same person. Deriving it means the banner, the identity
   strip and the records all come from one file.

   MOIS writes dates as `YYYY/MM/DD` in an export and renders them `YYYY.MM.DD`
   everywhere in the UI.
   ========================================================================= */
import type { Patient } from '../patients'
import type { MoisChartExport, MoisRecord } from './types'

const dot = (v?: string) => (v ? v.replace(/\//g, '.') : undefined)
/** MOIS stores a bare 10-digit number; the windows print it grouped */
const phone = (v?: string) =>
  v && /^\d{10}$/.test(v) ? `${v.slice(0, 3)}-${v.slice(3, 6)}-${v.slice(6)}` : v || undefined

/** The Demographics pharmacy comes from a current, visible chart connection.
 * Organization contact details are not included in the patient export; keep
 * them blank rather than splitting an address out of the provider's label. */
export function pharmacyFromConnections(connections: MoisRecord[], now = new Date()): Patient['pharmacy'] {
  const day = (value?: string) => value?.slice(0, 10).replace(/[/.]/g, '-') ?? ''
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const current = connections.filter(r =>
    r.str_connection_type === 'PHARMACY' && r.str_include_demo !== 'N'
    && (!r.dtm_start || day(r.dtm_start) <= today)
    && (!r.dtm_end || day(r.dtm_end) >= today),
  ).sort((a, b) => day(b.dtm_start || b.stp_date_create).localeCompare(day(a.dtm_start || a.stp_date_create)))[0]
  return current?.str_provider ? { name: current.str_provider } : undefined
}

export function patientFromChartRecord(c: MoisRecord): Patient {
  const stamp = (user?: string, when?: string) =>
    user && when ? `${dot(when)}  ${user}` : undefined
  return {
    chart: c.num_chart ?? '',
    status: c.str_status_code ?? '',
    first: c.str_name_f ?? '',
    middle: c.str_name_m ?? '',
    last: c.str_name_l ?? '',
    dob: dot(c.dtm_dob) ?? '',
    gender: ['M', 'F', 'X', 'U'].includes(c.str_gender ?? '') ? c.str_gender as Patient['gender'] : '',
    /* MOIS only paints the Gender label yellow when a second designation is
       recorded *and* flagged for the Demographics window */
    genderDesignations: c.str_gender_pref || c.str_gender_genotypic
      ? {
        preferred: c.str_gender_pref || undefined,
        genotypic: c.str_gender_genotypic || undefined,
        comment: c.str_gender_comment,
        onDemographics: [
          ...(c.str_include_demo_gender_adm === 'Y' ? ['administrative' as const] : []),
          ...(c.str_include_demo_gender_pref === 'Y' ? ['preferred' as const] : []),
          ...(c.str_include_demo_gender_geno === 'Y' ? ['genotypic' as const] : []),
        ],
      }
      : undefined,
    alias: c.str_alias_f, aliasLast: c.str_alias_l,
    home: phone(c.str_phone1), work: phone(c.str_phone2), cell: phone(c.str_phone3), pager: phone(c.str_phone4),
    workExt: c.str_phone2_ext, fax: phone(c.str_fax), emailWork: c.str_email_work,
    facility: c.str_facility_code, officeLocation: c.str_location_code, service: c.str_service_center,
    provider: c.str_provider ?? c.id_provider, location: c.str_chart_location, benefitSource: c.str_benefit_source,
    note: c.str_short_note, generalNotes: c.str_note,
    countryOrigin: c.str_country_origin, firstLanguage: c.str_language_first, religion: c.str_religion,
    firstNationStatus: c.str_first_nation_status, adopted: c.str_adopted === 'Y', multiGestation: c.str_gestation === 'Y',
    relationshipStatus: c.str_relationship_status, educationLevel: c.str_education_level, socioeconomic: c.str_socio_economic,
    address: c.str_addr1,
    /* the second address line the Demographics window paints under the first;
       the mapper used to drop it, so the field rendered blank */
    address2: c.str_addr2,
    /* MOIS keeps a second address line on the chart; the window shows both */
    city: c.str_city,
    province: c.str_province,
    postal: c.str_postal_code,
    country: c.str_country,
    emailHome: c.str_email_home,
    preferredPhone: c.str_phone_pref === '1' ? 'Home' : c.str_phone_pref === '2' ? 'Work' : c.str_phone_pref === '3' ? 'Cell' : c.str_phone_pref === '4' ? 'Pager' : undefined,
    homeMessage: c.str_phone1_msg === 'Y',
    workMessage: c.str_phone2_msg === 'Y',
    lastContact: dot(c.dtm_last_contact),
    insurance: c.str_phn ?? c.str_insurance_nbr,
    insuranceBy: c.str_phn_by ?? c.str_insurance_by,
    /* the PHN feeds BC Health No. as well as the insurance number; they are one
       column in MOIS and two fields on the window */
    bchn: c.str_phn,
    dep: c.str_department,
    livingArrangements: c.str_live_arrangement,
    /* `Date:` beside Current Status on Patient Detail */
    registered: dot(c.dtm_status_code),
    ethnicity: Object.fromEntries(['mother', 'father', 'self'].map(who => [who, {
      type: c[`str_race_${who}_type`], race: c[`str_race_${who}`], selfIdd: c[`str_race_${who}_sid`] === 'Y',
    }])),
    created: stamp(c.stp_user_create, c.stp_date_create),
    modified: stamp(c.stp_user_modify, c.stp_date_modify),
  }
}

/** Optional history groups were absent in the first export, but must be retained
 * when a fuller export supplies them. Field names follow the demographic audit. */
export function patientFromExport(data: MoisChartExport): Patient {
  return {
    ...patientFromChartRecord(data.chart),
    pharmacy: pharmacyFromConnections(data.connection),
    statusHistory: (data.chart_status ?? []).map(r => ({ code: r.str_status_code, effective: dot(r.dtm_effective), note: r.str_note })),
    nameHistory: (data.chart_name ?? []).map(r => ({ first: r.str_name_f, middle: r.str_name_m, last: r.str_name_l, expiry: dot(r.dtm_expiry), note: r.str_note })),
    addressHistory: data.chart_address.map(r => ({
      expiry: dot(r.dtm_expiry), address: r.str_addr1, address2: r.str_addr2, city: r.str_city,
      province: r.str_province, postal: r.str_postal_code, country: r.str_country,
      home: phone(r.str_phone1), work: phone(r.str_phone2), cell: phone(r.str_phone3), other: phone(r.str_phone4),
      ext: r.str_phone2_ext, emailHome: r.str_email_home, emailWork: r.str_email_work, fax: phone(r.str_fax), note: r.str_note,
    })),
  }
}
