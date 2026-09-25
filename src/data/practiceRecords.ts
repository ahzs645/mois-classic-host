import type { MoisRecord } from './charts'

/* ============================================================================
   Practice records: rows a lesson needs that the reference chart's export
   does not have, added to the stage and marked as such.

   Chart 87288's only adverse event is UNSIGNED, and the lesson on reading a
   signed recommendation (303212) needs one whose recommendations have been
   signed — the state that locks the window and makes its cut-off comment
   readable only through the Text Viewer. This one is shaped on the manual's
   own capture (303212 `268301a3…png`: a penicillin rash, "No Changes to
   Administration Schedule" and "Active Follow-up for Recurrence After Next
   Administration" ticked, recommendations locked), on this chart's patient.
   Its comment is written for the stage; it is long on purpose, because the
   point of the lesson is the part the comment box cannot show.
   ========================================================================= */

export type PracticeRecord = { row: Record<string, string>; record: MoisRecord }

export const practiceRecords: Record<string, PracticeRecord[]> = {
  events: [
    {
      row: {
        onset: '2026.03.02',
        agents: 'PENICILLIN G (PENICILLIN G SODIUM) 1000000UNIT POWDER FOR SOLUTION',
        reactions: 'RASH - ERUPTION OF SKIN',
        m: '',
        clip: '-',
      },
      record: {
        id_adverse_event: 'practice-ae-1',
        dtm_administered: '2026/03/02',
        num_administered_hr: '10',
        num_administered_min: '15',
        str_agents: 'PENICILLIN G (PENICILLIN G SODIUM) 1000000UNIT POWDER FOR SOLUTION',
        str_reactions: 'RASH - ERUPTION OF SKIN',
        str_severity: 'MILD',
        str_intolerance_type: 'DRUG ALLERGY',
        str_report_type: 'INITIAL',
        str_event_type: 'NORMAL',
        str_no_change: 'Y',
        str_follow_up_aefi: 'Y',
        str_recommend_name: 'TECHNICAL SUPPORT',
        str_recommend_status: 'MD',
        str_comment:
          'Generalised maculopapular rash appeared about six hours after the dose and settled with an oral antihistamine within two days; '
          + 'no mucosal involvement, no wheeze, no hypotension. The schedule does not need to change, but the next dose should be given '
          + 'where the patient can be observed for thirty minutes afterwards. Caution: the patient also reported a similar rash as a child '
          + 'after an unnamed antibiotic, so a penicillin allergy has not been ruled out — refer for allergy assessment before any further '
          + 'beta-lactam is prescribed, and record the outcome of that assessment against this event.',
        stp_record_state: 'SIGNED',
        stp_user_create: 'TECHNICAL SUPPORT',
        stp_date_create: '2026/03/02 10:40:12',
        stp_user_modify: 'TECHNICAL SUPPORT',
        stp_date_modify: '2026/03/02 11:05:47',
      },
    },
  ],
}
