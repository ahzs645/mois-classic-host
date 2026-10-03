import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { addSignatureEvent, nowStamp, SESSION_LOGIN, useSignatureHistory } from '../data/chart-basics-state'
import type { MoisRecord } from '../data/charts'
import { addAdverseEvent, saveAefi, setEventParts, type EventAgent } from '../data/allergySession'
import { usePatient } from '../data/patient-context'
import { PBBand, PBButton, PBCheckbox, PBInput, PBRadio, PBSelect, PBTextArea } from '../pb'
import { ADVERSE_WINDOWS, AgentList, BandCommands, blankAgent, eventAgents, pickAgent, useAllergyIndex } from './AdverseEventWindows'
import { RecordHistoryDialog } from './ChartBasicsWindows'
import { MasterReactionAgentList } from './CodeListLookupWindows'
import { CmdButton, DemographicModal, DialogButtons } from './DemographicDialogs'
import { patientPhn } from './patientKit'
import { StageWindow } from './StageWindow'

/* ============================================================================
   Allergy / Intolerances ▸ Events ▸ New AEFI / Edit AEFI — the Adverse
   Events Following Immunization (AEFI) form.

   PROVENANCE
   · art. 303131 "Allergy/Intolerances", `9e3c48f1…` "Edit AEFI" (834 × 717),
     the form scrolled to the top: the yellow FIRST / MIDDLE / LAST / DoB /
     sex, PHN / Home / Work / Cell block; the "Adverse Events Following
     Immunization (AEFI)" band; a scrolled body of sections 1–6 and the head
     of 7; View History · Print at the left and Sign Form · Save Form · Close
     Form at the right. Sections 1–6 below are measured off it:
       INITIAL REPORT ▾ · 1a) Unique Episode Number · 1b) Region Number ·
       2) Impact LIN; 3) Information Source — First Name · Last Name ·
       Relation to Patient · Contact Info, if Different than Patient;
       4) INFORMATION AT TIME OF IMMUNIZATION AND AEFI ONSET — 4a) At Time of
       Immunization (Province/Territory of Immunization, Date Vaccine
       Administered, Time) and 4b) Medical History (three ticks); the New
       Agent | Delete Agent | Select MAR Record band over the Category ·
       Agent / Brand Name / Manufacturer · Drug Administration Information
       list; 5) IMMUNIZATION ERRORS (Yes / No / Unknown and six ticks);
       6) PREVIOUS AEFI (No · Yes (Provide details in section 10) · Unknown ·
       Not Applicable (no prior doses), No preselected).
     The article's legend: 1–2 episode / region / LIN; 3 information source;
     4 immunization and medical history, New Agent, Select MAR Record; 5
     immunization errors; 6 previous AEFI; 7 "AEFI impact and level of care
     obtained"; 8 "the information of the person who explained the AEFI to
     you"; 9 "a-d options … At least one must be selected"; 10 a free-text
     box; View History (the signing history); Sign Form ("lock the form …
     until unsigned"). "To create an AEFI you must first select an encounter
     number"; "The AEFI is only editable through selecting 'Edit AEFI'".
   · NH "AEFI Standards" (Confluence, MOIS 02.29.16; Obsidian copy,
     `_media/attachments/139723639/`): 141952058 / 141952059 — opened from
     Edit AEFI the same form is captioned "Adverse Events Following
     Immunization (AEFI)" (833 × 715), and a signed form's Sign Form reads
     Unsign Form, which opens "Unsign Current Record" (User Name, Date,
     Time, Reason; Unsign · Cancel); 139723980 — New AEFI's window is
     captioned "Edit AEFI". Its Appendix A (from the BCCDC AEFI User Guide)
     names every field of sections 7–10: the 7a–7d options, 8's Setting /
     Name / Date Reported / Reporter Role, and the 9a–9d interval and
     duration (day / hour / minute, "Unresolved"), types and signs.
   · The columns are the chart export's own (MOIS_REF_10000013,
     tdt_adverse_event): every `str_*` tick, `num_*_interval_*` /
     `num_*_duration_*`, `num_largest_diameter_cm`, `num_days_hospital`,
     `num_days_prolonged`, `str_report_type`, `str_previous_aefi`, and
     `dtm_administered` / `num_administered_hr|min` (the Detail tab's Onset
     and Time are the vaccine's administration date and time).

   INFERRED (no capture below section 6):
   · the layout of sections 7–10: drawn in the captured sections' style —
     bold numbered headings over 2px rules, ticks on the 19px pitch in the
     19 / 259 / 495 columns 5) and 6) use;
   · each tick's wording where Appendix A gives none (9d's Arthritis,
     Thrombocytopenia and Anaesthesia sub-items, read off the column);
   · which 7c option `num_days_hospital` and `num_days_prolonged` count;
   · a Y/N column's tick: `Y` ticked; 6)'s No / Yes are `str_previous_aefi`
     N / Y (its Unknown / Not Applicable codes are not in any export, so
     those two are draft-only); 9c's Febrile / Afebrile / Unknown Type are
     one choice (Appendix A: "the system forces selection of one type"),
     so a record with more than one `Y` shows the first;
   · New AEFI's Event Type, "AEFI FORM" (the article: "AEFI Form (created
     from 'New AEFI' …) or Normal" — NORMAL is captured upper case);
   · New AEFI with no Active ENC# opens the Encounter List (reportRecords);
   · Sign Form's "Sign Current Record", worded after the captured Unsign;
   · the form's own signed state is `stp_record_state2` — an event carries
     two, and `stp_record_state` already locks the Recommendations tab
     (AllergyWindows.tsx, practiceRecords.ts).
   DRAFT-ONLY (evidenced controls with no column in any export, so they
   bind to nothing and stay blank when opened): 1a / 1b / 2, 3), the
   province, 5)'s Yes / No / Unknown and its Other text, 7a–7d, 8, 9a's
   Other and Site(s), 9b's type and Angioedema Other text, 9c's seizure
   types and Other text, and 10. `str_comment` is not 10: the export puts
   the Recommendations tab's Comments there (AllergyWindows.tsx).
   LEFT OUT: Print; Select MAR Record's "Select Medication Administration
   Record" window (139723980; the button is drawn, inert); the mandatory-
   field warning on Save Form; 9b's "Increased use of accessory muscles"
   and the skin Generalized / Localized choice (no column in the export);
   and the follow-up outcome columns `str_without_aefi`,
   `str_recurrence_aefi`, `str_other_aefi`, `str_without_info_aefi`,
   `str_not_administered`, which the export files with the Recommendations
   columns, not with the form (AEFI_NOT_ON_FORM).
   ========================================================================= */

type Values = Record<string, string>

/* --- the columns ----------------------------------------------------------- */

type Tick = readonly [column: string, label: string]

/** 4b) Medical History (`9e3c48f1`) */
const HISTORY: Tick[] = [
  ['str_history_concomitant', 'Concomitant Medication(s)'],
  ['str_history_allergies', 'Known Medical Conditions/Allergies'],
  ['str_history_acute_illness', 'Acute Illness/Injury'],
]

/** 9a) Local reaction at or near vaccination site (Appendix A) */
const LOCAL_TYPES: Tick[] = [
  ['str_infected_abscess', 'Infected Abscess'], ['str_sterile_abscess', 'Sterile Abscess'], ['str_cellulitis', 'Cellulitis'],
  ['str_nodule', 'Nodule'], ['str_crosses_joint', 'Reaction Crosses Joint'], ['str_lymphadenitis', 'Lymphadenitis/Adenopathy'],
]
const LOCAL_SIGNS: Tick[] = [
  ['str_swelling', 'Swelling'], ['str_pain', 'Pain'], ['str_tenderness', 'Tenderness'],
  ['str_erythema', 'Erythema'], ['str_warmth', 'Warmth'], ['str_induration', 'Induration'],
  ['str_rash', 'Rash'], ['str_palpable_fluctuance', 'Palpable Fluctuance'], ['str_fluid_collection', 'Fluid Collection Shown by Imaging Technique'],
  ['str_surgical_drainage', 'Spontaneous/Surgical Drainage'], ['str_microbial_results', 'Microbial Results'], ['str_lymph_streaking', 'Lymphangitic Streaking'],
  ['str_regional_lymph', 'Regional Lymphadenopathy'],
]

/** 9b) Allergic and allergic-like events (Appendix A) */
const SKIN: Tick[] = [
  ['str_skin_urticaria', 'Urticaria'], ['str_skin_erythema', 'Erythema'], ['str_skin_pruritus', 'Pruritus'],
  ['str_skin_prickle', 'Prickle Sensation'], ['str_skin_rash', 'Rash'],
]
const EYES: Tick[] = [['str_eye_red_bilateral', 'Red Bilateral'], ['str_eye_red_unilateral', 'Red Unilateral'], ['str_eye_itchy', 'Itchy']]
const ANGIOEDEMA: Tick[] = [
  ['str_angio_tongue', 'Tongue'], ['str_angio_throat', 'Throat'], ['str_angio_uvula', 'Uvula'],
  ['str_angio_larynx', 'Larynx'], ['str_angio_lip', 'Lip'], ['str_angio_eyelids', 'Eyelids'],
  ['str_angio_face', 'Face'], ['str_angio_limbs', 'Limbs'],
]
const CARDIO: Tick[] = [
  ['str_hypotension', 'Measured Hypotension'], ['str_central_pulse_volume', 'Decreased Central Pulse Volume'],
  ['str_capillary_refill_time', 'Capillary Refill Time > 3 sec'], ['str_tachycardia', 'Tachycardia'],
  ['str_unconsciousness', 'Decreased or Loss of Consciousness'],
]
const RESPIRATORY: Tick[] = [
  ['str_sneezing', 'Sneezing'], ['str_rhinorrhea', 'Rhinorrhea'], ['str_hoarse_voice', 'Hoarse Voice'],
  ['str_throat_closure', 'Sensation of Throat Closure'], ['str_stridor', 'Stridor'], ['str_dry_cough', 'Dry Cough'],
  ['str_tachypnea', 'Tachypnea'], ['str_wheezing', 'Wheezing'], ['str_retractions', 'Indrawing/Retractions'],
  ['str_grunting', 'Grunting'], ['str_cyanosis', 'Cyanosis'], ['str_sore_throat', 'Sore Throat'],
  ['str_difficult_swallow', 'Difficulty Swallowing'], ['str_difficult_breathe', 'Difficulty Breathing'], ['str_chest_tightness', 'Chest Tightness'],
]
const GI: Tick[] = [['str_diarrhea', 'Diarrhea'], ['str_abdominal_pain', 'Abdominal Pain'], ['str_nausea', 'Nausea'], ['str_vomitting', 'Vomiting']]

/** 9c) Neurologic events (Appendix A) */
const NEURO_DIAGNOSIS: Tick[] = [
  ['str_meningitis', 'Meningitis'], ['str_encephalitis', 'Encephalopathy/Encephalitis'], ['str_gbs', 'Guillain-Barre Syndrome (GBS)'],
  ['str_bells_palsy', "Bell's Palsy"], ['str_other_paralysis', 'Other Paralysis'], ['str_seizure', 'Seizure'],
]
const NEURO_FINDINGS: Tick[] = [
  ['str_depressed', 'Depressed/Altered Consciousness'], ['str_lethargy', 'Lethargy'], ['str_personality_change', 'Personality Change Lasting >24 hrs.'],
  ['str_neurologic_signs', 'Focal/Multifocal Neurologic Sign(s)'], ['str_neuro_fever', 'Fever (>=38.0 C)'], ['str_csf_abnormal', 'CSF Abnormality'],
  ['str_eeg_abnormal', 'EEG Abnormality'], ['str_emg_abnormal', 'EMG Abnormality'], ['str_neuroimaging_abnormal', 'Neuroimaging Abnormality'],
  ['str_brain_abnormal', 'Brain/Spinal Cord Histopathologic Abnormality'],
]
const SEIZURE: Tick[] = [['str_seizure_witnessed', 'Witnessed by Healthcare Professional'], ['str_seizure_unconscious', 'Sudden Loss of Consciousness']]
/** Appendix A's Generalized seizure types: no column in the export */
const SEIZURE_TYPES = ['Tonic', 'Clonic', 'Tonic-Clonic', 'Atonic', 'Absence', 'Myoclonic', 'Partial']
const SEIZURE_HISTORY: Tick[] = [['str_seizure_febrile', 'Febrile'], ['str_seizure_afebrile', 'Afebrile'], ['str_seizure_unknown', 'Unknown Type']]

/** 9d) Other events: each event, then its signs (Appendix A) */
const OTHER_EVENTS: { event: Tick; signs?: Tick[] }[] = [
  {
    event: ['str_hypotonic_episode', 'Hypotonic-Hyporesponsive Episode (age <2 years)'],
    signs: [['str_limpness', 'Limpness'], ['str_pallor_cyanosis', 'Pallor/Cyanosis'], ['str_responsiveness', 'Reduced Responsiveness/Unresponsiveness']],
  },
  { event: ['str_persistent_crying', 'Persistent Crying'] },
  { event: ['str_intussusception', 'Intussusception'] },
  {
    event: ['str_arthritis', 'Arthritis'],
    signs: [['str_joint_redness', 'Joint Redness'], ['str_joint_warm', 'Joint Warmth'], ['str_joint_swell', 'Joint Swelling'], ['str_synovial_fluid', 'Inflammatory Changes in Synovial Fluid']],
  },
  { event: ['str_parotitis', 'Parotitis'] },
  { event: ['str_other_fever', 'Fever (>=38.0 C)'] },
  { event: ['str_non_allergic_rash', 'Rash'], signs: [['str_rash_generalized', 'Generalized'], ['str_rash_localized', 'Localized (Site)']] },
  {
    event: ['str_thrombocytopenia', 'Thrombocytopenia'],
    signs: [['str_platelet_count', 'Platelet Count'], ['str_petechial_rash', 'Petechial Rash'], ['str_evidence_bleeding', 'Other Clinical Evidence of Bleeding']],
  },
  {
    event: ['str_anaesthesia', 'Anaesthesia/Paraesthesia'],
    signs: [['str_numbness', 'Numbness'], ['str_tingling', 'Tingling'], ['str_burning', 'Burning'], ['str_formication', 'Formication'], ['str_anaesthesia_other', 'Other, specify']],
  },
  { event: ['str_other_unexpected', 'Other Serious or Unexpected Event(s) not Listed in the Form'] },
]

/** 5) Immunization Errors (`9e3c48f1`), the six ticks with their positions */
const ERRORS: (readonly [string, string, number, number])[] = [
  ['str_error_age', 'Given outside the recommended age limits', 19, 583],
  ['str_error_expired', 'Product expired', 259, 583],
  ['str_error_route', 'Incorrect route', 365, 583],
  ['str_error_vaccine', 'Wrong vaccine given', 19, 602],
  ['str_error_dose', 'Dose exceeded that recommended for age', 153, 602],
  ['str_error_other', 'Other, specify:', 19, 621],
]

/** the four 9) subsections: their tick, column prefix and caption */
const NINE = [
  { key: 'local', head: 'str_local_reaction', caption: '9a) Local Reaction at or near Vaccination Site (non-allergic only)' },
  { key: 'allergic', head: 'str_allergic_event', caption: '9b) Allergic and Allergic-like Events' },
  { key: 'neuro', head: 'str_neuro_event', caption: '9c) Neurologic Events' },
  { key: 'other', head: 'str_other_event', caption: '9d) Other Events' },
] as const

const intervalColumns = (key: string) => (['interval', 'duration'] as const).flatMap((k) => (['day', 'hr', 'min'] as const).map((u) => `num_${key}_${k}_${u}`))

/** Every Y/N tick the form draws, by column. */
export const AEFI_TICK_COLUMNS: readonly string[] = [
  ...HISTORY, ...ERRORS.map(([c, l]) => [c, l] as const), ...LOCAL_TYPES, ['str_local_other', ''], ...LOCAL_SIGNS, ['str_largest_diameter', ''],
  ...SKIN, ...EYES, ...ANGIOEDEMA, ['str_angio_other', ''], ...CARDIO, ...RESPIRATORY, ...GI,
  ...NEURO_DIAGNOSIS, ['str_neuro_other', ''], ...NEURO_FINDINGS, ...SEIZURE, ['str_seizure_history', ''], ...SEIZURE_HISTORY,
  ...OTHER_EVENTS.flatMap((e) => [e.event, ...(e.signs ?? [])]),
  ...NINE.flatMap((n) => [[n.head, ''] as const, [`str_${n.key}_duration_unresolved`, ''] as const]),
  ['str_previous_aefi', ''],
].map(([c]) => c)

/** Every numeric column the form draws. */
export const AEFI_NUMBER_COLUMNS: readonly string[] = [
  ...NINE.flatMap((n) => intervalColumns(n.key)), 'num_largest_diameter_cm', 'num_days_hospital', 'num_days_prolonged',
]

/** Y/N columns an adverse event carries that are not the form's: the
    Recommendations tab's ticks (AllergyWindows.tsx) and the follow-up
    outcomes the export files beside them. */
export const AEFI_NOT_ON_FORM: readonly string[] = [
  'str_no_change', 'str_expert_referral', 'str_protective_antibody', 'str_controlled_setting', 'str_no_immunizations',
  'str_follow_up_aefi', 'str_immunization_other',
  'str_without_aefi', 'str_recurrence_aefi', 'str_other_aefi', 'str_without_info_aefi', 'str_not_administered',
]

/** the columns the form reads and Save Form writes */
const FORM_COLUMNS = new Set([...AEFI_TICK_COLUMNS, ...AEFI_NUMBER_COLUMNS, 'str_report_type', 'dtm_administered', 'num_administered_hr', 'num_administered_min'])

/** a New AEFI: INITIAL REPORT, and 6)'s No preselected (`9e3c48f1`) */
const NEW_FORM: Values = { str_report_type: 'INITIAL', str_previous_aefi: 'N' }

/** the record's form columns, under whatever this session saved */
export function aefiValues(record: MoisRecord | undefined, saved: Values | undefined): Values {
  const out: Values = record ? {} : { ...NEW_FORM }
  for (const [k, v] of Object.entries(record ?? {})) if (FORM_COLUMNS.has(k) && v !== undefined) out[k] = v
  return { ...out, ...saved }
}

/* --- geometry ---------------------------------------------------------------- */

/** a box placed in `9e3c48f1`'s window coordinates: the scrolled body
    starts at x 7, y 88 */
const P = (x: number, y: number, w?: number): CSSProperties => ({ position: 'absolute', left: x - 7, top: y - 88, width: w, lineHeight: '17px', whiteSpace: 'nowrap' })
/** the scrolled body's width (x 7 – 805, the scroll bar after it) */
const BODY_W = 798
/** where `9e3c48f1` leaves off: the rule over 7) */
const CAPTURED_H = 650 - 88
const RULE: CSSProperties = { height: 2, background: '#000', flex: 'none' }
const FIELD: CSSProperties = { height: 17 }
const slug = (col: string) => col.replace(/^(str|num|dtm)_/, '').replace(/_/g, '-')
const dotted = (d?: string) => (d ?? '').slice(0, 10).replace(/\//g, '.')
const hm = (v: Values) => (v.num_administered_hr ? `${v.num_administered_hr.padStart(2, '0')}:${(v.num_administered_min ?? '0').padStart(2, '0')}` : ' : ')

/* --- the window ------------------------------------------------------------- */

export function AefiWindow({ eventId: openedOn, record: given, onClose, onSaved }: {
  /** the event Edit AEFI opened on; none for New AEFI */
  eventId?: string
  /** the event's record, when the caller has it (else looked up) */
  record?: MoisRecord
  onClose: () => void
  /** Save Form filed the form; `created` when it filed a new event */
  onSaved?: (created: boolean) => void
}) {
  const ix = useAllergyIndex()
  const chart = ix.chart
  const [eventId, setEventId] = useState(openedOn ?? '')
  const record = given ?? ix.events.find((e) => e.id === eventId)?.record
  const initial = useMemo(() => aefiValues(record, eventId ? ix.session.aefi[eventId] : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [record, eventId])
  const [v, setV] = useState<Values>(initial)
  const set = (k: string, value: string) => setV((x) => ({ ...x, [k]: value }))
  const [agents, setAgents] = useState<EventAgent[]>(() => (openedOn ? eventAgents(ix, openedOn, record) : []))
  const [agentsEdited, setAgentsEdited] = useState(false)
  const [agentCur, setAgentCur] = useState(0)
  const [lookup, setLookup] = useState<number | null>(null)
  const [time, setTime] = useState(() => hm(initial))

  /* Sign Form / Unsign Form, and View History (141952058) */
  const signKey = `${chart}:events:${eventId || 'new'}:aefi`
  const history = useSignatureHistory(signKey)
  const last = history[history.length - 1]
  const signed = last ? last.action === 'SIGNED' : record?.stp_record_state2 === 'SIGNED'
  const [signing, setSigning] = useState(false)
  const [viewHistory, setViewHistory] = useState(false)

  const changeAgents = (next: EventAgent[]) => { setAgents(next); setAgentsEdited(true) }
  const save = (): string => {
    const changed = Object.fromEntries(Object.entries(v).filter(([k, x]) => x !== initial[k]))
    let id = eventId
    if (!id) {
      id = addAdverseEvent(chart, {
        onset: dotted(v.dtm_administered), time: hm(v), type: '', severity: '', comment: '', agents, reactions: [], eventType: 'AEFI FORM',
      })
      setEventId(id)
      saveAefi(chart, id, v)
    } else {
      if (Object.keys(changed).length) saveAefi(chart, id, changed)
      if (agentsEdited) setEventParts(chart, id, { agents })
    }
    setAgentsEdited(false)
    onSaved?.(!eventId)
    return id
  }

  /* --- the controls, each tagged with the column it binds ------------------ */
  const tick = ([col, label]: Tick, style?: CSSProperties, bold = false) => (
    <span key={col} style={style} data-aefi-column={col} data-aefi-value="Y">
      <PBCheckbox label={bold ? <b>{label}</b> : label} checked={v[col] === 'Y'} onChange={(on) => set(col, on ? 'Y' : 'N')}
        tutorialId={`host.mois.field.aefi-${slug(col)}`} />
    </span>
  )
  /** a draft-only tick: evidenced, but no column in any export */
  const draftTick = (key: string, label: ReactNode, style?: CSSProperties) => (
    <span key={key} style={style} data-aefi-draft={key}>
      <PBCheckbox label={label} checked={v[`ui:${key}`] === 'Y'} onChange={(on) => set(`ui:${key}`, on ? 'Y' : 'N')} />
    </span>
  )
  const draftRadio = (group: string, option: string, label: ReactNode = option, style?: CSSProperties) => (
    <span key={option} style={style} data-aefi-draft={`${group}:${option}`}>
      <PBRadio name={`aefi-${group}`} label={label} checked={v[`ui:${group}`] === option} onChange={() => set(`ui:${group}`, option)} />
    </span>
  )
  const draftText = (key: string, style: CSSProperties) => (
    <PBInput style={{ ...FIELD, ...style }} value={v[`ui:${key}`] ?? ''} onChange={(e) => set(`ui:${key}`, e.target.value)} data-aefi-draft={key} />
  )
  const num = (col: string, w = 36) => (
    <PBInput key={col} align="right" style={{ ...FIELD, width: w }} value={v[col] ?? ''} data-aefi-column={col}
      data-tutorial-id={`host.mois.field.aefi-${slug(col)}`} onChange={(e) => set(col, e.target.value.replace(/[^0-9]/g, ''))} />
  )

  /* 6) PREVIOUS AEFI: No / Yes are str_previous_aefi N / Y */
  const previous = v['ui:previous'] || (v.str_previous_aefi === 'Y' ? 'Yes' : v.str_previous_aefi === 'N' ? 'No' : '')
  const pickPrevious = (option: string) => setV((x) => ({
    ...x,
    'ui:previous': option === 'Yes' || option === 'No' ? '' : option,
    str_previous_aefi: option === 'Yes' ? 'Y' : option === 'No' ? 'N' : '',
  }))
  const previousRadio = (option: string, label: string, x: number, y: number) => (
    <span style={P(x, y)} data-aefi-column={option === 'Yes' ? 'str_previous_aefi' : option === 'No' ? 'str_previous_aefi' : undefined}
      data-aefi-value={option === 'Yes' ? 'Y' : option === 'No' ? 'N' : undefined} data-aefi-draft={option === 'Yes' || option === 'No' ? undefined : `previous:${option}`}>
      <PBRadio name="aefi-previous" label={label} checked={previous === option} onChange={() => pickPrevious(option)}
        tutorialId={`host.mois.field.aefi-previous-${slug(option.toLowerCase().replace(/ /g, '_'))}`} />
    </span>
  )

  /* 9c: Febrile / Afebrile / Unknown Type are one choice */
  const seizureChoice = SEIZURE_HISTORY.find(([c]) => v[c] === 'Y')?.[0]
  const seizureType = ([col, label]: Tick) => (
    <span key={col} data-aefi-column={col} data-aefi-value="Y">
      <PBRadio name="aefi-seizure-history" label={label} checked={col === seizureChoice}
        onChange={() => setV((x) => ({ ...x, ...Object.fromEntries(SEIZURE_HISTORY.map(([c]) => [c, c === col ? 'Y' : 'N'])) }))}
        tutorialId={`host.mois.field.aefi-${slug(col)}`} />
    </span>
  )

  const reportTypes = [{ value: 'INITIAL', label: 'INITIAL REPORT' }, ...(v.str_report_type && v.str_report_type !== 'INITIAL' ? [{ value: v.str_report_type, label: v.str_report_type }] : [])]

  return (
    <StageWindow id={ADVERSE_WINDOWS.aefi} title={openedOn ? 'Adverse Events Following Immunization (AEFI)' : 'Edit AEFI'} width={834} height={717} onClose={onClose}
      footer={<>
        <PBButton command="aefi-view-history" style={BTN} onClick={() => setViewHistory(true)}>View History</PBButton>
        <PBButton command="aefi-print" style={BTN}>Print</PBButton>
        <span className="pb-footer__spacer" />
        <PBButton command={signed ? 'aefi-unsign-form' : 'aefi-sign-form'} style={BTN} onClick={() => setSigning(true)}>{signed ? 'Unsign Form' : 'Sign Form'}</PBButton>
        <PBButton command="aefi-save-form" style={BTN} disabled={signed} onClick={save}>Save Form</PBButton>
        <PBButton command="aefi-close-form" style={BTN} onClick={onClose}>Close Form</PBButton>
      </>}>
      <PatientBlock />
      <div style={{ flex: 'none', margin: '0 5px', '--pb-band-h': '20px' } as CSSProperties}>
        <PBBand>Adverse Events Following Immunization (AEFI)</PBBand>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'scroll', overflowX: 'hidden', margin: '0 12px 0 5px', borderBottom: '1px solid #a0a0a0' }}
        data-tutorial-id="host.mois.group.aefi-form">
        <fieldset disabled={signed} style={{ border: 0, margin: 0, padding: 0, minWidth: 0, width: BODY_W }}>
          {/* --- 1 – 6, as `9e3c48f1` paints them ------------------------- */}
          <div style={{ position: 'relative', height: CAPTURED_H, '--pb-row-h': '17px' } as CSSProperties}>
            <span style={P(18, 95)} data-aefi-column="str_report_type">
              <PBSelect w={130} options={reportTypes} value={v.str_report_type ?? ''} onChange={(e) => set('str_report_type', e.target.value)}
                data-tutorial-id="host.mois.field.aefi-report-type" />
            </span>
            <b style={P(163, 95)}>1a) Unique Episode Number:</b>{draftText('episode', P(332, 95, 68))}
            <b style={P(415, 95)}>1b) Region Number:</b>{draftText('region', P(532, 95, 68))}
            <b style={P(625, 95)}>2) Impact LIN:</b>{draftText('impact-lin', P(709, 95, 68))}
            <div style={{ ...P(7, 120, BODY_W), ...RULE }} />

            <b style={P(19, 126)}>3) Information Source</b>
            <span style={{ ...P(76, 146, 120), textAlign: 'right' }}>First Name:</span>{draftText('source-first', P(199, 146, 127))}
            <span style={{ ...P(276, 146, 120), textAlign: 'right' }}>Last Name:</span>{draftText('source-last', P(400, 146, 127))}
            <span style={{ ...P(484, 146, 150), textAlign: 'right' }}>Relation to Patient:</span>{draftText('source-relation', P(637, 146, 140))}
            <span style={{ ...P(9, 165, 187), textAlign: 'right' }}>Contact Info, if Different than Patient:</span>{draftText('source-contact', P(199, 165, 578))}
            <div style={{ ...P(7, 189, BODY_W), ...RULE }} />

            <b style={P(19, 195)}>4) INFORMATION AT TIME OF IMMUNIZATION AND AEFI ONSET</b>
            <b style={P(19, 214)}>4a) At Time of Immunization</b>
            <span style={P(19, 233)}>Province/Territory of Immunization:</span>{draftText('province', P(191, 233, 162))}
            <span style={P(19, 252)}>Date Vaccine Administered:</span>
            <PBInput style={{ ...P(191, 252, 82), ...FIELD }} value={dotted(v.dtm_administered)} data-aefi-column="dtm_administered"
              data-tutorial-id="host.mois.field.aefi-date-administered" onChange={(e) => set('dtm_administered', e.target.value.replace(/\./g, '/'))} />
            <span style={P(278, 252)}>Time:</span>
            <PBInput style={{ ...P(309, 252, 44), ...FIELD }} align="center" value={time} data-aefi-column="num_administered_hr num_administered_min"
              onChange={(e) => {
                setTime(e.target.value)
                const [hr = '', min = ''] = e.target.value.split(':').map((x) => x.trim())
                setV((x) => ({ ...x, num_administered_hr: hr.replace(/\D/g, ''), num_administered_min: min.replace(/\D/g, '') }))
              }} />
            <b style={P(495, 214)}>4b) Medical History (up to the time of AEFI onset)</b>
            <span style={P(495, 233)}>(Check all that apply and provide details in section 10)</span>
            {HISTORY.map((t, i) => tick(t, P(496, 252 + i * 19)))}

            <div style={{ ...P(7, 318, BODY_W), height: 'auto' }}>
              <BandCommands commands={[
                { id: 'aefi-new-agent', label: 'New Agent', w: 103, onClick: () => { changeAgents([...agents, blankAgent()]); setAgentCur(agents.length) } },
                { id: 'aefi-delete-agent', label: 'Delete Agent', w: 106, onClick: () => { if (agents.length) { changeAgents(agents.filter((_, i) => i !== agentCur)); setAgentCur(0) } } },
                { id: 'aefi-select-mar-record', label: 'Select MAR Record', w: 105 },
              ]} />
            </div>
            <div style={{ ...P(7, 340, BODY_W), height: 160, display: 'flex', flexDirection: 'column' }}>
              <AgentList agents={agents} setCur={setAgentCur} onChange={changeAgents} anchor="aefi-agent"
                onLookup={(i) => { setAgentCur(i); setLookup(i) }} />
            </div>
            <div style={{ ...P(7, 500, BODY_W), ...RULE }} />

            <b style={P(19, 507)}>5) IMMUNIZATION ERRORS</b>
            <b style={P(19, 526)}>Did this AEFI follow an incorrect immunization?</b>
            {draftRadio('errors', 'Yes', 'Yes', P(43, 546))}
            {draftRadio('errors', 'No', 'No', P(113, 546))}
            {draftRadio('errors', 'Unknown', 'Unknown', P(181, 546))}
            <span style={P(19, 565)}>(If Yes, choose all that apply and provide details in section 10)</span>
            {ERRORS.map(([c, l, x, y]) => tick([c, l], P(x, y)))}
            {draftText('error-other', P(115, 621, 259))}

            <b style={P(495, 507)}>6) PREVIOUS AEFI</b>
            <b style={{ ...P(495, 526, 300), whiteSpace: 'normal', lineHeight: '14px' }}>Did an AEFI follow a previous dose of any of the above immunizing agents (Table above)?</b>
            {previousRadio('No', 'No', 498, 567)}
            {previousRadio('Yes', 'Yes  (Provide details in section 10)', 610, 567)}
            {previousRadio('Unknown', 'Unknown', 498, 585)}
            {previousRadio('Not Applicable', 'Not Applicable  (no prior doses)', 610, 585)}
          </div>

          {/* --- 7 – 10: INFERRED layout, Appendix A's fields -------------- */}
          <div style={RULE} />
          <Section title="7) IMPACT OF AEFI, OUTCOME, AND LEVEL OF CARE OBTAINED">
            <Sub>7a) Highest Impact of AEFI</Sub>
            <Grid>
              {draftRadio('impact', 'Did not interfere with daily activities')}
              {draftRadio('impact', 'Interfered with but did not prevent daily activities', undefined, { gridColumn: 'span 2' })}
              {draftRadio('impact', 'Prevented daily activities')}
            </Grid>
            <Sub>7b) Outcome at Time of Report</Sub>
            <Grid>
              <span className="pb-row" style={{ gap: 6 }}>{draftRadio('outcome', 'Death')}<span>Date:</span>{draftText('death-date', { width: 82 })}</span>
              {draftRadio('outcome', 'Permanent disability/incapacity')}
              {draftRadio('outcome', 'Fully recovered')}
              {draftRadio('outcome', 'Not yet recovered')}
              {draftRadio('outcome', 'Unknown')}
            </Grid>
            <Sub>7c) Highest Level of Care Obtained</Sub>
            <Grid>
              <span className="pb-row" style={{ gap: 6, gridColumn: 'span 2' }}>
                {draftRadio('care', 'Admitted to hospital')}<span>Days:</span>{num('num_days_hospital')}
                <span>Admission:</span>{draftText('admission-date', { width: 82 })}<span>Discharge:</span>{draftText('discharge-date', { width: 82 })}
              </span>
              {draftRadio('care', 'Emergency visit')}
              <span className="pb-row" style={{ gap: 6, gridColumn: 'span 2' }}>
                {draftRadio('care', 'Resulted in prolongation of existing hospitalization')}<span>Days:</span>{num('num_days_prolonged')}
              </span>
              {draftRadio('care', 'Non urgent visit')}
              {draftRadio('care', 'Telephone advice from a health professional')}
              {draftRadio('care', 'None')}
              {draftRadio('care', 'Unknown')}
            </Grid>
            <Sub>7d) Treatment Received</Sub>
            <Grid>{['No', 'Unknown', 'Yes'].map((o) => draftRadio('treatment', o))}</Grid>
          </Section>

          <div style={RULE} />
          <Section title="8) REPORTER INFORMATION">
            <div style={{ display: 'grid', gridTemplateColumns: '92px 260px 92px 1fr', gap: '2px 6px', alignItems: 'center' }}>
              <span>Name:</span>{draftText('reporter-name', { width: 250 })}
              <span>Phone:</span>{draftText('reporter-phone', { width: 120 })}
              <span>Setting:</span>{draftText('reporter-setting', { width: 250 })}
              <span>Date Reported:</span>{draftText('reporter-date', { width: 82 })}
              <span>Reporter Role:</span>{draftText('reporter-role', { width: 250 })}
            </div>
          </Section>

          <div style={RULE} />
          <Section title="9) AEFI DETAILS">
            {NINE.map((n) => (
              <div key={n.key} style={{ marginTop: 6 }} data-tutorial-id={`host.mois.group.aefi-${n.key}`}>
                {tick([n.head, n.caption], undefined, true)}
                <div className="pb-row" style={{ gap: 6, margin: '3px 0 3px 20px' }}>
                  <span style={{ width: 52 }}>Interval:</span>
                  {(['day', 'hr', 'min'] as const).map((u) => <span key={u} className="pb-row" style={{ gap: 3 }}>{UNIT[u]}{num(`num_${n.key}_interval_${u}`)}</span>)}
                  <span style={{ width: 24 }} />
                  <span style={{ width: 56 }}>Duration:</span>
                  {(['day', 'hr', 'min'] as const).map((u) => <span key={u} className="pb-row" style={{ gap: 3 }}>{UNIT[u]}{num(`num_${n.key}_duration_${u}`)}</span>)}
                  <span style={{ width: 12 }} />
                  {tick([`str_${n.key}_duration_unresolved`, 'Unresolved'])}
                </div>
                <div style={{ marginLeft: 20 }}>
                  {n.key === 'local' && <>
                    <Sub>Type of Local Reaction:</Sub>
                    <Grid>
                      {LOCAL_TYPES.map((t) => tick(t))}
                      <span className="pb-row" style={{ gap: 4, gridColumn: 'span 2' }}>{tick(['str_local_other', 'Other, specify:'])}{draftText('local-other', { width: 300 })}</span>
                    </Grid>
                    <Sub>Signs &amp; Symptoms:</Sub>
                    <Grid>
                      {LOCAL_SIGNS.slice(0, 7).map((t) => tick(t))}
                      <span className="pb-row" style={{ gap: 4, gridColumn: 'span 2' }}>
                        {tick(['str_largest_diameter', 'Largest Diameter of Vaccination Site Reaction'])}{num('num_largest_diameter_cm', 44)}<span>cm</span>
                      </span>
                      <span className="pb-row" style={{ gap: 4, gridColumn: 'span 3' }}><span>Site(s) of Reaction:</span>{draftText('local-site', { width: 300 })}</span>
                      {LOCAL_SIGNS.slice(7).map((t) => tick(t))}
                    </Grid>
                  </>}
                  {n.key === 'allergic' && <>
                    <Sub>Type of Allergic Reaction:</Sub>
                    <Grid>{['Anaphylaxis', 'ORS', 'Other Allergic Events', 'None'].map((o) => draftRadio('allergic-type', o))}</Grid>
                    <Sub>Skin/Mucosal:</Sub>
                    <Grid>{SKIN.map((t) => tick(t))}</Grid>
                    <Sub>Eye(s):</Sub>
                    <Grid>{EYES.map((t) => tick(t))}</Grid>
                    <Sub>Angioedema:</Sub>
                    <Grid>
                      {ANGIOEDEMA.map((t) => tick(t))}
                      <span className="pb-row" style={{ gap: 4, gridColumn: 'span 2' }}>{tick(['str_angio_other', 'Other, specify:'])}{draftText('angio-other', { width: 300 })}</span>
                    </Grid>
                    <Sub>Cardio-vascular:</Sub>
                    <Grid>{CARDIO.map((t) => tick(t))}</Grid>
                    <Sub>Respiratory:</Sub>
                    <Grid>{RESPIRATORY.map((t) => tick(t))}</Grid>
                    <Sub>Gastrointestinal:</Sub>
                    <Grid>{GI.map((t) => tick(t))}</Grid>
                  </>}
                  {n.key === 'neuro' && <>
                    <Sub>Diagnosis:</Sub>
                    <Grid>
                      {NEURO_DIAGNOSIS.map((t) => tick(t))}
                      <span className="pb-row" style={{ gap: 4, gridColumn: 'span 3' }}>{tick(['str_neuro_other', 'Other Neurological Diagnosis, specify:'])}{draftText('neuro-other', { width: 300 })}</span>
                    </Grid>
                    <Sub>Other Neurological Findings:</Sub>
                    <Grid>{NEURO_FINDINGS.map((t) => tick(t))}</Grid>
                    <Sub>Seizure Details:</Sub>
                    <Grid>{SEIZURE.map((t) => tick(t))}</Grid>
                    <Grid>
                      <span style={{ gridColumn: '1 / -1' }}>Generalized:</span>
                      {SEIZURE_TYPES.map((t) => draftTick(`seizure-${slug(t.toLowerCase())}`, t))}
                    </Grid>
                    <Grid>
                      {tick(['str_seizure_history', 'Previous History of Seizures'])}
                      {SEIZURE_HISTORY.map(seizureType)}
                    </Grid>
                  </>}
                  {n.key === 'other' && OTHER_EVENTS.map((e) => (
                    <div key={e.event[0]}>
                      {tick(e.event)}
                      {e.signs && <div style={{ marginLeft: 20 }}><Grid>{e.signs.map((t) => tick(t))}</Grid></div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Section>

          <div style={RULE} />
          <Section title="10) SUPPLEMENTAL INFORMATION">
            <PBTextArea rows={8} w="100%" style={{ resize: 'none' }} value={v['ui:supplemental'] ?? ''} data-aefi-draft="supplemental"
              onChange={(e) => set('ui:supplemental', e.target.value)} data-tutorial-id="host.mois.field.aefi-supplemental" />
          </Section>
        </fieldset>
      </div>

      {lookup !== null && agents[lookup] && (
        <MasterReactionAgentList onClose={() => setLookup(null)}
          onPick={(row) => changeAgents(agents.map((a, j) => (j === lookup ? pickAgent(a, row) : a)))} />
      )}
      {signing && (
        <SignFormDialog verb={signed ? 'Unsign' : 'Sign'} onClose={() => setSigning(false)}
          onConfirm={(reason) => {
            const id = signed ? eventId : (save() || eventId)
            addSignatureEvent(`${chart}:events:${id || 'new'}:aefi`, { ...nowStamp(), action: signed ? 'UNSIGNED' : 'SIGNED', user: SESSION_LOGIN, reason })
            setSigning(false)
          }} />
      )}
      {viewHistory && <RecordHistoryDialog recordKey={signKey} signed={signed} onClose={() => setViewHistory(false)} />}
    </StageWindow>
  )
}

/* 9e3c48f1: the footer's buttons are 75 × 21.5 */
const BTN: CSSProperties = { width: 75, minWidth: 0, height: 21.5, padding: 0 }
const UNIT = { day: 'Day', hr: 'Hr', min: 'Min' } as const

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ padding: '6px 12px 10px', lineHeight: '17px' }}>
      <b>{title}</b>
      {children}
    </div>
  )
}
const Sub = ({ children }: { children: ReactNode }) => <div style={{ fontWeight: 'bold', marginTop: 4 }}>{children}</div>
/* the 19 / 259 / 495 columns 5) and 6) use, on a 19px pitch */
const Grid = ({ children }: { children: ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '240px 236px 1fr', rowGap: 2, alignItems: 'center', '--pb-row-h': '17px' } as CSSProperties}>{children}</div>
)

/** The yellow patient block over the form (`9e3c48f1`): FIRST / MIDDLE /
    LAST / DoB / sex, then PHN / Home (underlined) / Work / Cell. */
function PatientBlock() {
  const p = usePatient()
  const at = (x: number, y: number): CSSProperties => ({ position: 'absolute', left: x - 7, top: y, whiteSpace: 'nowrap' })
  return (
    <div style={{ position: 'relative', flex: 'none', height: 37, margin: '2px 5px 1px', background: '#ffffc0', border: '1px solid #9a9a9a', lineHeight: '17px' }}
      data-tutorial-id="host.mois.group.aefi-patient">
      <span style={at(19, 1)}>FIRST:&nbsp;<b>{p.first?.toUpperCase()}</b></span>
      <span style={at(190, 1)}>MIDDLE:&nbsp;<b>{p.middle?.toUpperCase()}</b></span>
      <span style={at(321, 1)}>LAST:&nbsp;<b>{p.last?.toUpperCase()}</b></span>
      <span style={at(503, 1)}>DoB:&nbsp;<b>{p.dob}</b></span>
      <b style={at(622, 1)}>{p.sex}</b>
      <span style={at(28, 18)}>PHN:&nbsp;<b>{patientPhn(p)}</b></span>
      <span style={at(203, 18)}><u>Home:</u>&nbsp;<b><u>{p.home}</u></b></span>
      <span style={at(355, 18)}>Work:&nbsp;<b>{p.work}</b></span>
      <span style={at(505, 18)}>Cell:&nbsp;<b>{p.cell}</b></span>
    </div>
  )
}

/** Sign Form / Unsign Form: "Unsign Current Record" (141952058) — User
    Name, Date, Time, Reason; nothing happens without a reason (art. 304732). */
function SignFormDialog({ verb, onConfirm, onClose }: { verb: 'Sign' | 'Unsign'; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const stamp = nowStamp()
  return (
    <DemographicModal title={`${verb} Current Record`} width={340} onClose={onClose} dialog={`aefi-${verb.toLowerCase()}`}>
      <div className="pb-form" style={{ padding: '14px 18px', gridTemplateColumns: '70px 1fr', alignItems: 'start' }}>
        <span>User Name:</span><b>{SESSION_LOGIN}</b>
        <span>Date:</span><span>{stamp.date}</span>
        <span>Time:</span><span>{stamp.time}</span>
        <span>Reason:</span>
        <PBTextArea aria-label={`${verb} reason`} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} data-tutorial-id="host.mois.field.aefi-sign-reason" />
      </div>
      <DialogButtons>
        <CmdButton command={`aefi-confirm-${verb.toLowerCase()}`} wide disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>{verb}</CmdButton>
        <CmdButton command="aefi-sign-cancel" wide onClick={onClose}>Cancel</CmdButton>
      </DialogButtons>
    </DemographicModal>
  )
}
