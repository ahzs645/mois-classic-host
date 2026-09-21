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
import type { MoisRecord } from './types'

const dot = (v?: string) => (v ? v.replace(/\//g, '.') : undefined)
/** MOIS stores a bare 10-digit number; the windows print it grouped */
const phone = (v?: string) =>
  v && /^\d{10}$/.test(v) ? `${v.slice(0, 3)}-${v.slice(3, 6)}-${v.slice(6)}` : v || undefined

export function patientFromChartRecord(c: MoisRecord): Patient {
  const stamp = (user?: string, when?: string) =>
    user && when ? `${dot(when)}  ${user}` : undefined
  return {
    chart: c.num_chart ?? '',
    status: c.str_status_code === 'LU' ? 'LU' : 'A',
    first: c.str_name_f ?? '',
    middle: c.str_name_m ?? '',
    last: c.str_name_l ?? '',
    dob: dot(c.dtm_dob) ?? '',
    gender: c.str_gender === 'M' || c.str_gender === 'F' ? c.str_gender : '',
    /* MOIS only paints the Gender label yellow when a second designation is
       recorded *and* flagged for the Demographics window */
    genderDesignations: c.str_gender_pref || c.str_gender_genotypic
      ? {
        preferred: c.str_gender_pref || undefined,
        genotypic: c.str_gender_genotypic || undefined,
        onDemographics: [
          ...(c.str_include_demo_gender_pref === 'Y' ? ['preferred' as const] : []),
          ...(c.str_include_demo_gender_geno === 'Y' ? ['genotypic' as const] : []),
        ],
      }
      : undefined,
    home: phone(c.str_phone1),
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
    preferredPhone: c.str_phone_pref === '1' ? 'Home' : c.str_phone_pref === '2' ? 'Work' : undefined,
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
    ethnicity: c.str_race_self_type || c.str_race_self
      ? { self: { type: c.str_race_self_type, race: c.str_race_self } }
      : undefined,
    /* Everything else the Demographics window reads — pager, work phone, fax,
       the Background Information block, the three history tables — has a
       `tdt_chart` column but is empty in this export, so it stays undefined and
       the window paints the blank MOIS paints. */
    created: stamp(c.stp_user_create, c.stp_date_create),
    modified: stamp(c.stp_user_modify, c.stp_date_modify),
  }
}
