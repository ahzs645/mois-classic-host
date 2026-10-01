import { ENCOUNTERS_2429 } from '../marChart2429'
import { capturedExport } from './captured'

/* ============================================================================
   Chart 2429 (FLO AARONSON) — the records the 2026-09-29 MOIS TRAINING
   captures show, in the chart export's shape. The patient herself stays in
   `patients.ts`; the MAR stays in `marChart2429.ts` (MAR_2429, which the MAR
   view reads before any export), and the encounters are that file's
   ENCOUNTERS_2429, reused here rather than copied.

   PROVENANCE, by group (set 3 = scratchpad/set3/srgb, set 2 = set2/srgb):
   · intervention — set 3 c02: Date 2026.09.29, Performed By JALIL, AHMAD, no
     description, Declined and Not Indicated unticked; Created 2026.09.29
     23:39 JALIL, AHMAD.
   · allergy / reaction_risk — set 3 c03 (Allergy / Intolerances summary,
     REACTION RISKS [2]) and c04 (Reaction Risks): both FOOD ALLERGY, the
     Category box ticked, reaction ABNORMAL VISION. ASPARAGUS 2026.04.27, code
     227218003, Severity MILD, Created 2026.04.27 16:09 / Last Modified
     2026.04.27 16:10. c04 prints that user "AMINORROAYAEE. MONA" — a full
     stop where every other capture prints a comma (c19, c29, c34, set 2 c16);
     kept as printed. AVOCADOS 2026.02.02, code 260190003: only its grid row
     is captured. The reactions' own codes are not captured.
   · adverse_event / adverse_agent / reaction_event / adverse_link — set 3
     c13–c18 (and c10, the Master Reaction Agent List the agent was picked
     from): no onset; Type DRUG INTOLERANCE, Severity MODERATE TO SEVERE,
     Comment "sfsdf"; agent AMARANTH (code 420963005 in c10), Category ticked,
     Route CUTANEOUS; reaction 22325002 ABNORMAL GAIT, rank 0; linked to the
     ASPARAGUS risk (c18). The grid's Agents cell reads "AMARANTH," in c18.
     Created 2026.09.29 23:40, Last Modified 23:41, JALIL, AHMAD.
   · medication_lt / drug_duration / drug_dose — set 3 c19: three ALMOGAN
     rows. The Dose / Frequency cells are clipped by their column; the first
     row's full text comes from its Dose Detail ("1.0 MCG INTRAMUSCULAR
     DAILY", duration 0.0 ENTER ON RENEW), the other two are kept as printed.
     Started By PCIPT 1 NURSE 6 PRG and Created 2026.04.27 16:12 AMINORROAYAEE,
     MONA belong to the first row, the one selected.
   · social_hx — set 3 c29: VICTIM OF ABUSE 2026.02.02, not sensitive;
     Created 2026.02.02 10:38 AMINORROAYAEE, MONA.
   · document — set 3 c31: the nine rows in view (the list scrolls; rows
     below them are not captured), each with one attachment and S unticked.
     Two Author cells print "AMINORROAYA..." — kept as printed. Only the first
     row's detail is captured: Comment "FORM LETTER PRINTED: 2026/06/19",
     Source SYSTEM, Created 2026.06.19 13:45 CHEW, HUI JUN. The M and Link
     glyphs are not reproduced: which record each links to is not captured.
   · health_issue — set 3 c32/c33 (Health Issues summary) and c34
     (Condition): ASTHMA 2026.02.02, Confirmed, Mild, not sensitive, no rank;
     Created 2026.02.02 10:39 AMINORROAYAEE, MONA.
   · order (CONSULTATION) — set 2 c16 / c16-detail: two consults referred by
     PCIPT 1 NURSE 6 PRG, each with one attachment. 2021.12.27 → seen
     2022.01.11, ADDED CARE FUNDING CLBC; no refer date → seen 2022.01.11,
     ADMINISTRATION OF MEDICATION, Source SYSTEM, Created 2022.01.11 14:23
     AMINORROAYAEE, MONA.
   · encounter — set 3 c24 via marChart2429.ts.

   Stamps are written `YYYY/MM/DD HH:MM`: the captures print no seconds.
   ========================================================================= */

const MONA = 'AMINORROAYAEE, MONA'
const NURSE = 'PCIPT 1 NURSE 6 PRG'

const DOCUMENTS: [string, string, string, string][] = [
  ['2026/06/19', '', 'FORM LETTER', 'ACKNOWLEDGEMENT LETTER'],
  ['2026/05/26', '', 'WEBFORM', 'INITIAL CLIENT ASSESSMENT FOR HOME BASED SERVICES'],
  ['2026/04/27', 'AMIN, MONA', 'PAPER FORM', 'PLMS STANDARD OUTPATIENT LAB REQUISITION'],
  ['2026/04/27', 'AMINORROAYA...', 'PAPER FORM', 'MEDICAL ORDERS FOR SCOPE OF TREATMENT (MOST)'],
  ['2026/04/27', 'AMIN, MONA', 'REFERRAL', 'ADMINISTRATION OF MEDICATION'],
  ['2026/02/02', 'AMINORROAYA...', 'PAPER FORM', 'MEDICAL ORDERS FOR SCOPE OF TREATMENT (MOST)'],
  ['2026/01/14', 'AMIN, MONA', 'PAPER FORM', 'COLUMBIA SUICIDE SEVERITY RATING SCALE'],
  ['2026/01/14', 'AMIN, MONA', 'PAPER FORM', 'COLUMBIA SUICIDE SEVERITY RATING SCALE'],
  ['2026/01/14', 'AMIN, MONA', 'WCALCULATOR', 'HEALTH OF NATIONS OUTCOME SCORE - DEV'],
]

export const captured2429 = capturedExport('2429', 'set3 c02-c04 c10 c13-c19 c24 c29 c31-c34; set2 c16', {
  encounter: ENCOUNTERS_2429,

  intervention: [{
    id_intervention: 'cap-2429-intervention-1',
    dtm_date: '2026/09/29',
    str_performed_by: 'JALIL, AHMAD',
    str_decline: 'N',
    str_not_inclined: 'N',
    stp_user_create: 'JALIL, AHMAD',
    stp_date_create: '2026/09/29 23:39',
  }],

  allergy: [
    {
      id_allergy: 'cap-2429-allergy-1',
      dtm_start: '2026/04/27',
      str_intolerance_type: 'FOOD ALLERGY',
      str_is_drug: 'N',
      str_substance_code: '227218003',
      str_substance: 'ASPARAGUS',
      str_reactions: 'ABNORMAL VISION',
      str_severity: 'MILD',
      stp_user_create: 'AMINORROAYAEE. MONA',
      stp_date_create: '2026/04/27 16:09',
      stp_user_modify: 'AMINORROAYAEE. MONA',
      stp_date_modify: '2026/04/27 16:10',
    },
    {
      id_allergy: 'cap-2429-allergy-2',
      dtm_start: '2026/02/02',
      str_intolerance_type: 'FOOD ALLERGY',
      str_is_drug: 'N',
      str_substance_code: '260190003',
      str_substance: 'AVOCADOS',
      str_reactions: 'ABNORMAL VISION',
    },
  ],
  reaction_risk: [
    { id_reaction_risk: 'cap-2429-risk-reaction-1', id_allergy: 'cap-2429-allergy-1', str_reaction: 'ABNORMAL VISION' },
    { id_reaction_risk: 'cap-2429-risk-reaction-2', id_allergy: 'cap-2429-allergy-2', str_reaction: 'ABNORMAL VISION' },
  ],

  adverse_event: [{
    id_adverse_event: 'cap-2429-event-1',
    str_agents: 'AMARANTH,',
    str_reactions: 'ABNORMAL GAIT',
    str_intolerance_type: 'DRUG INTOLERANCE',
    str_severity: 'MODERATE TO SEVERE',
    str_comment: 'sfsdf',
    stp_user_create: 'JALIL, AHMAD',
    stp_date_create: '2026/09/29 23:40',
    stp_user_modify: 'JALIL, AHMAD',
    stp_date_modify: '2026/09/29 23:41',
  }],
  adverse_agent: [{
    id_adverse_agent: 'cap-2429-event-agent-1',
    id_adverse_event: 'cap-2429-event-1',
    str_agent_code: '420963005',
    str_agent: 'AMARANTH',
    str_is_drug: 'N',
    str_route: 'CUTANEOUS',
  }],
  reaction_event: [{
    id_reaction_event: 'cap-2429-event-reaction-1',
    id_adverse_event: 'cap-2429-event-1',
    str_reaction_code: '22325002',
    str_reaction: 'ABNORMAL GAIT',
    num_rank: '0',
  }],
  adverse_link: [{ id_adverse_link: 'cap-2429-event-link-1', id_adverse_event: 'cap-2429-event-1', id_allergy: 'cap-2429-allergy-1' }],

  medication_lt: [
    {
      id_medication_lt: 'cap-2429-ltm-1',
      dtm_start: '2024/10/21',
      str_medication: 'ALMOGAN',
      str_dose_freq: '1 MCG INTRAMUSCULAR DAILY',
      str_ordered_by: NURSE,
      str_no_substitute: 'N',
      str_do_not_adapt: 'N',
      str_prn: 'N',
      stp_user_create: MONA,
      stp_date_create: '2026/04/27 16:12',
    },
    { id_medication_lt: 'cap-2429-ltm-2', dtm_start: '2026/02/02', str_medication: 'ALMOGAN', str_dose_freq: '800 MG INTRAMUSCULAR' },
    { id_medication_lt: 'cap-2429-ltm-3', dtm_start: '2026/02/02', dtm_end: '2026/02/02', str_medication: 'ALMOGAN', str_dose_freq: '1000 MG INTRAMUSCULAR' },
  ],
  drug_duration: [{
    id_drug_duration: 'cap-2429-ltm-1-duration', str_object: 'tdt_medication_lt', id_object: 'cap-2429-ltm-1',
    num_duration: '0.0000', str_duration_units: 'ENTER ON RENEW', num_sequence: '10',
  }],
  drug_dose: [{
    id_drug_dose: 'cap-2429-ltm-1-dose', id_drug_duration: 'cap-2429-ltm-1-duration',
    num_dose: '1.0000', str_dose_units: 'MCG', str_route: 'INTRAMUSCULAR', str_frequency: 'DAILY', num_sequence: '10',
  }],

  social_hx: [{
    id_social_hx: 'cap-2429-social-1',
    dtm_start: '2026/02/02',
    str_description: 'VICTIM OF ABUSE',
    str_sensitive: 'N',
    stp_user_create: MONA,
    stp_date_create: '2026/02/02 10:38',
  }],

  document: DOCUMENTS.map(([date, author, type, note], i) => ({
    id_document: `cap-2429-document-${i + 1}`,
    dtm_date: date,
    ...(author ? { str_author: author } : {}),
    str_doc_type: type,
    str_note: note,
    str_sensitive: 'N',
    num_attachments: '1',
    /* c31's detail is the first row's */
    ...(i === 0 ? {
      str_comment: 'FORM LETTER PRINTED: 2026/06/19',
      str_interface: 'SYSTEM',
      /* the footer's Sent Date (c31) */
      dtm_sent: '2026.06.19',
      stp_user_create: 'CHEW, HUI JUN',
      stp_date_create: '2026/06/19 13:45',
    } : {}),
  })),

  health_issue: [{
    id_health_issue: 'cap-2429-condition-1',
    dtm_start: '2026/02/02',
    str_problem_name: 'ASTHMA',
    str_certainity: 'Confirmed',
    str_severity: 'Mild',
    str_sensitive: 'N',
    stp_user_create: MONA,
    stp_date_create: '2026/02/02 10:39',
  }],

  order: [
    {
      id_order: 'cap-2429-consult-1',
      str_order_type: 'CONSULTATION',
      dtm_ord_date: '2021/12/27',
      dtm_finish_date: '2022/01/11',
      str_order_by: NURSE,
      str_description: 'ADDED CARE FUNDING CLBC',
      str_sensitive: 'N',
      num_attachments: '1',
    },
    {
      id_order: 'cap-2429-consult-2',
      str_order_type: 'CONSULTATION',
      dtm_finish_date: '2022/01/11',
      str_order_by: NURSE,
      str_description: 'ADMINISTRATION OF MEDICATION',
      str_sensitive: 'N',
      num_attachments: '1',
      str_interface: 'SYSTEM',
      stp_user_create: MONA,
      stp_date_create: '2022/01/11 14:23',
    },
  ],
})
