/* ============================================================================
   Export records → the rows a screen already knows how to draw.

   Each screen owns its column keys (`collected`, `test`, `value`, …). This maps
   MOIS's export fields onto them, one entry per tree node, so a screen needs no
   knowledge of the export format.

   A node absent from `ROW_MAPS` is empty. Missing exports never use fixture rows.

   Dates: MOIS exports `YYYY/MM/DD` and renders `YYYY.MM.DD`.

   Field choices here are checked against the MOIS Data Dictionary field audit
   (`~/github/Mois/outputs/.../audit-inventory.json`, 833 UI fields mapped to
   their table and column with screenshot evidence). Where a column's source
   looked obvious but the audit disagreed, the audit wins — it was captured
   from the running application with Ctrl+Shift+A.
   ========================================================================= */
import type { MoisChartExport, MoisChartGroup, MoisOptionalGroup, MoisRecord } from './types'
import { providerLabel, providerName } from './providers'
import { legacyDynamicFormDefinition, legacyDynamicFormTitle } from '../legacy-dynamic-forms'
import { toDots } from '../clock'

const d = toDots
/** the paperclip column: a count, or the dash MOIS prints for none */
const clip = (v?: string) => (v && v !== '0' ? v : '-')
/** MOIS writes Y/N; the grids show a tick or nothing */
const tick = (v?: string) => (v === 'Y' ? '✓' : '')
/** MOIS keeps a result's hour and minute in their own columns: `8`, `53` → 08:53 */
const hhmmOf = (hr?: string, min?: string) => (hr ? `${hr.padStart(2, '0')}:${(min || '0').padStart(2, '0')}` : '')
/** the HH:MM of a `YYYY/MM/DD HH:MM:SS` stamp, or '' for a bare date */
const timeOf = (v?: string) => /\d\d:\d\d/.exec(v?.split(' ')[1] ?? '')?.[0] ?? ''

export type RowMap = {
  group: MoisChartGroup | MoisOptionalGroup
  /** newest first, by this export field */
  sort?: string
  /** keep only the records a screen shows — Orders splits by order type */
  where?: (r: MoisRecord) => boolean
  /** `data` is the whole export, for the joins a row needs (provider names) */
  row: (r: MoisRecord, data?: MoisChartExport | null) => Record<string, string>
}

export const ROW_MAPS: Partial<Record<string, RowMap>> = {
  measures: {
    group: 'measure',
    sort: 'dtm_collect_date',
    row: (r) => ({
      collected: d(r.dtm_collect_date),
      loinc: r.str_loinic_num ?? '', report: r.str_report ?? '',
      collectedBy: r.str_collect_by ?? '', orderName: r.str_order_name ?? '',
      facilityReference: r.str_filler_ref_no ?? '', category: r.str_class ?? '',
      lower: r.str_normal_lower ?? '', upper: r.str_normal_high ?? '',
      /* Detail ▸ Collect By: Date / Time (MATRIX-R0516; 302837 "Collect
         Date: The date and time that the measurement was collected",
         `3b59a254…` prints 2018.04.20 | 00:01): the time box beside the date
         is num_collect_hr / num_collect_min */
      collectedTime: hhmmOf(r.num_collect_hr, r.num_collect_min),
      /* the Detail page's other columns, as the data dictionary maps them
         (MATRIX-R0509–R0524) and the Report page's (R0496–R0499) */
      performedBy: r.str_performed_by ?? '', performedDate: d(r.dtm_performed), performedTime: timeOf(r.dtm_performed),
      reportedBy: r.str_report_by ?? '', reportedDate: d(r.dtm_report),
      transcribedBy: r.str_transcriptionist ?? '', transcribedDate: d(r.dtm_transcribed_date), transcribedTime: (r.dtm_transcribed_time ?? '').slice(0, 5),
      facility: r.str_facility ?? '', facilityLocation: r.str_facility_loc ?? '',
      volume: r.str_spec_volume ?? '', specimen: r.str_spec_source ?? '',
      orderDate: d(r.dtm_order), copiesTo: r.str_copy_to ?? '', orderNumber: r.str_order ?? '',
      /* the limits beyond the normal range (tdt_measure str_very_* / str_absurd_*)
         and the result's place in its panel (num_set_id, HL7 OBX-1). No
         capture shows a control for the limits — Ref. Ranges is the normal
         range only (R0492 / R0504) — so they ride on the row unshown. */
      veryLower: r.str_very_lower ?? '', veryHigh: r.str_very_high ?? '',
      absurdLower: r.str_absurd_lower ?? '', absurdHigh: r.str_absurd_high ?? '',
      setId: r.num_set_id ?? '',
      created: r.stp_date_create ?? '', createdBy: r.stp_user_create ?? '',
      encounter: r.id_encounter ?? '', id: r.id_measure ?? '',

      by: r.str_order_by ?? r.str_collect_by ?? '',
      code: r.str_code ?? '',
      test: r.str_description ?? r.str_order_name ?? '',
      /* Value and Units are separate columns — `180` and `Cms`, not `180 Cms`.
         Confirmed against the field audit's capture of this same chart. */
      value: r.str_value ?? '',
      /* MOIS prints a dash, not a blank, when a result carries no abnormal
         flag — H, L and HH are the ones it fills in */
      flag: r.str_abnormal || '-',
      units: r.str_units ?? '',
      /* F = final; MOIS prints the HL7 result status verbatim */
      status: r.str_status ?? '',
      clip: clip(r.num_attachments),
    }),
  },
  conditions: {
    group: 'health_issue',
    sort: 'dtm_start',
    row: (r) => ({
      start: d(r.dtm_start),
      end: d(r.dtm_resolve),
      problem: r.str_problem_name ?? '',
      /* an unranked condition prints a dash, and the paperclip column its
         count or a dash (evidence/MATRIX-R0825-start, DEV v02.31.23: every
         Rank cell "-", paperclips "2", "1", "-") */
      rank: r.num_rank || '-',
      /* `str_certainity` — the typo is the column name in MOIS */
      certainty: r.str_certainity ?? '',
      severity: r.str_severity ?? '',
      s: tick(r.str_sensitive),
      m: '',
      clip: clip(r.num_attachments),
    }),
  },
  reaction: {
    group: 'allergy',
    sort: 'dtm_start',
    row: (r) => ({
      onset: d(r.dtm_start),
      tilde: '',
      type: r.str_intolerance_type ?? '',
      /* the box is "Drug Category or Non-Drug Agent" (its tip, set 3 c09), so
         it is ticked when the agent is NOT a specific drug: `str_is_drug` N.
         Set 3 c04 ticks it on two FOOD ALLERGY agents; 87288's PENICILLIN
         category record is N; the Adverse Events agent block reads the same
         column the same way (AdverseEventWindows `eventAgents`). */
      category: r.str_is_drug === 'N' ? '\u2713' : '',
      code: r.str_substance_code ?? '',
      agent: r.str_substance ?? '',
      reactions: r.str_reactions ?? r.str_reaction ?? '',
      severity: r.str_severity ?? '',
      m: '',
    }),
  },
  famhx: {
    group: 'family_hx',
    row: (r) => ({
      chart: '',
      name: r.str_name ?? '',
      relationship: r.str_relationship ?? '',
      /* MOIS stores the Condition in str_condition (data dictionary,
         MATRIX-R0646-condition); the others are older exports' guesses */
      condition: r.str_condition ?? r.str_problem_name ?? r.str_description ?? '',
      m: '',
      clip: clip(r.num_attachments),
    }),
  },
  documents: {
    group: 'document',
    sort: 'dtm_date',
    row: (r) => ({
      date: d(r.dtm_date),
      author: r.str_author ?? '',
      type: r.str_doc_type ?? '',
      note: r.str_note ?? r.str_comment ?? '',
      s: tick(r.str_sensitive),
      /* M: the document has a file behind it, as the Paper Forms grid marks it */
      m: r.str_link ? '\u21e9' : '',
      /* the blue curved-arrow column: this document points at another record */
      link: r.str_link ? '\u21b1' : '',
      clip: clip(r.num_attachments),
    }),
  },
  /* the Encounter list keeps hour and minute in their own columns, the way
     MOIS stores them, and prints the encounter id rather than a row number */
  encounters: {
    group: 'encounter',
    sort: 'dtm_appoint',
    row: (r, data) => ({
      id: r.id_encounter ?? '',
      date: d(r.dtm_appoint),
      hr: r.num_appoint_hr?.padStart(2, '0') ?? '',
      mn: r.num_appoint_min?.padStart(2, '0') ?? '',
      code: r.str_visit_code ?? '',
      mode: r.str_visit_mode ?? '',
      nbr: r.num_time_slots ?? '',
      /* id_provider (MATRIX-R0367), named by the export's lookup or its
         provider directory (charts/providers.ts) */
      provider: r.lkp_provider || providerName(data, r.id_provider) || r.str_attending || '',
      reason: r.str_appt_note ?? '',
      /* the columns right of Visit Reason, which the grid gained once it was
         re-derived from the capture */
      issue: r.str_diag_code_1 ?? '',
      services: r.str_fee_code_1 ?? '',
      payor: r.str_payor ?? '',
      room: r.str_room_number ?? '',
      loc: r.str_service_location ?? '',
      as: r.str_appt_status ?? '',
      ds: r.str_status_docu ?? '',
      bs: r.str_status_bill ?? '',
      /* TM / RP / TK / MG / 📎 are read-only roll-up counts (MATRIX-R0377
         "Number of templates created", R0378 "Number of Reports (WCB
         claims)", R0379 "Number of Tasks created", R0380 messages, R0381
         attachments). The export keeps four of the counts on the encounter:
         num_encounter_forms (the encounter's forms — Encounter Forms, once
         templates), num_reports, num_tasks, num_attachments. It has no
         message count, so MG stays "-". An empty roll-up prints "-", as
         every untouched Day Book row does (data/daybook.ts FLAGS). */
      tm: clip(r.num_encounter_forms),
      rp: clip(r.num_reports),
      tk: clip(r.num_tasks),
      mg: '-',
      attach: clip(r.num_attachments),
    }),
  },
  consults: {
    group: 'order',
    sort: 'dtm_ord_date',
    where: (r) => r.str_order_type === 'CONSULTATION',
    row: (r) => ({
      refer: d(r.dtm_ord_date),
      seen: d(r.dtm_finish_date),
      by: r.str_order_by ?? '',
      seenby: r.str_performed_by ?? r.str_assignedto ?? '',
      reason: r.str_description ?? r.str_code_term ?? '',
      /* S renders a checkbox, so it wants a tick rather than a string */
      s: tick(r.str_sensitive),
      m: '',
      clip: clip(r.num_attachments),
    }),
  },
  rx: {
    group: 'prescription',
    sort: 'dtm_order',
    row: (r) => ({
      order: d(r.dtm_order),
      med: r.str_medication ?? '',
      dose: r.str_dose_freq ?? '',
      amount: r.str_amount ?? '',
      /* the Type column carries CPP for a controlled prescription */
      type: r.str_type ?? '',
      m: '',
      clip: clip(r.num_attachments),
      generic: r.str_generic_name ?? '',
    }),
  },

  /* Long Term Medication: the export's own tdt_medication_lt records, and
     nothing else. A chart whose export has none (`<medication_lts/>`) lists
     none — renewals write Prescriptions (art. 303132, 303217), but a
     prescription is not a long-term med and is never read back as one. The
     tutorial chart's rows are training records (charts/overlays.ts). Field
     names are MOIS's (MOIS_REF_10000074). */
  ltm: {
    group: 'medication_lt',
    sort: 'dtm_start',
    row: (r) => ({
      start: d(r.dtm_start),
      end: d(r.dtm_end),
      med: r.str_medication ?? '',
      dose: r.str_dose_freq ?? '',
      indic: r.str_indication ?? '',
      type: r.str_type ?? '',
      m: '',
      generic: r.str_generic_name ?? '',
    }),
  },

  /* ---- Orders, split the way the chart tree splits them ----------------
     MOIS keeps consults, lab requisitions and the rest in one order table and
     files them under different folders by `str_order_type`. */
  /* the Orders grid has its own row shape: who it went to, who it is for,
     the two-letter status code and the link/paperclip counts */
  orders: {
    group: 'order', sort: 'dtm_ord_date',
    row: (r) => ({
      date: d(r.dtm_ord_date),
      type: r.str_order_type ?? '',
      by: r.str_order_by ?? '',
      to: r.str_performed_by ?? '',
      for: r.str_description ?? r.str_code_term ?? '',
      st: r.str_status ?? '',
      links: r.num_results && r.num_results !== '0' ? r.num_results : '-',
      attach: clip(r.num_attachments),
    }),
  },
  imaging: {
    group: 'order', sort: 'dtm_ord_date',
    where: (r) => r.str_order_type === 'IMAGING' || r.str_order_type === 'XRAY',
    row: (r) => ({
      performed: d(r.dtm_finish_date || r.dtm_ord_date),
      by: r.str_order_by ?? '',
      test: r.str_description ?? r.str_code_term ?? '',
      region: '', laterality: '', modality: '', contrast: '',
      status: r.str_report_status ?? r.str_status ?? '',
      /* `M` is not the paperclip — the audit maps it to the report status for
         imaging; the attachment count goes in `clip`. */
      m: '',
      clip: clip(r.num_attachments),
    }),
  },
  procedures: {
    group: 'order', sort: 'dtm_ord_date',
    where: (r) => r.str_order_type === 'PROCEDURE',
    row: (r) => ({
      performed: d(r.dtm_finish_date || r.dtm_ord_date),
      by: r.str_performed_by ?? r.str_order_by ?? '',
      desc: r.str_description ?? r.str_code_term ?? '',
      m: '',
      clip: clip(r.num_attachments),
    }),
  },

  /* ---- Allergy / Intolerances ------------------------------------------ */
  events: {
    group: 'adverse_event', sort: 'dtm_administered',
    /* Adverse Events: Onset / Agents / Reactions (303212 `268301a3…png`) */
    row: (r) => ({
      onset: d(r.dtm_administered),
      agents: r.str_agents ?? '',
      reactions: r.str_reactions ?? '',
      m: '',
      clip: clip(r.num_attachments),
    }),
  },

  /* ---- Care Plan -------------------------------------------------------
     Risks, needs, actions and goals land on the frame's generic list, so they
     share its Date / Description / Detail / Entered By columns. */
  risks: {
    group: 'risk', sort: 'dtm_start',
    row: (r) => ({
      start: d(r.dtm_start),
      end: d(r.dtm_end),
      desc: r.str_description ?? '',
      d: '',
      rank: r.num_rank ?? '',
      source: r.str_source ?? r.stp_create_source ?? '',
      s: tick(r.str_sensitive),
      /* MOIS records a risk that was explicitly ruled out, not just absent */
      neg: tick(r.str_negation),
      m: '',
      clip: clip(r.num_attachments),
    }),
  },
  needs: {
    group: 'need', sort: 'dtm_start',
    row: (r) => ({
      start: d(r.dtm_start),
      end: d(r.dtm_end),
      desc: r.str_description ?? r.str_need ?? '',
      participants: r.str_participants ?? '',
      s: tick(r.str_sensitive),
      clip: clip(r.num_attachments),
    }),
  },
  actions: {
    group: 'action', sort: 'dtm_start',
    row: (r) => ({
      start: d(r.dtm_start),
      end: d(r.dtm_end),
      desc: r.str_action ?? r.str_description ?? '',
      participants: r.str_participants ?? '',
      completed: tick(r.str_completed),
      compdate: d(r.dtm_completed),
      s: tick(r.str_sensitive),
    }),
  },
  /* newest first: goal-linked-actions-populated.png lists DEV AUDIT GOAL
     (created 10:45) above DEV GOAL (10:42), both started 2026.08.12.
     GoalsView sorts Start descending with this as the tie-break. */
  goals: {
    group: 'goal', sort: 'stp_date_create',
    row: (r) => ({
      start: d(r.dtm_start), end: d(r.dtm_end), goal: r.str_goal ?? '',
      s: tick(r.str_sensitive), clip: clip(r.num_attachments),
      phase: r.str_phase ?? '', quant: r.str_quantitative ?? '', commit: r.num_commitment ?? '', importance: r.num_importance ?? '',
      date: d(r.dtm_start),
      description: r.str_goal ?? '',
      detail: [r.str_phase, r.str_outcome_expected, r.str_reason].filter(Boolean).join(' — '),
      by: r.stp_user_create ?? '',
    }),
  },
  prefs: {
    group: 'chart_preference', sort: 'dtm_start',
    row: (r) => ({
      start: d(r.dtm_start),
      type: r.str_classification ?? '',
      subject: r.str_type ?? '',
      detail: r.str_preference ?? '',
      instruction: r.str_instruction_code ?? '',
      clip: clip(r.num_attachments),
      s: tick(r.str_sensitive),
      demo: tick(r.str_include_demo),
    }),
  },

  /* ---- MAR -------------------------------------------------------------
     One row per administration, with the schedule beside it. */
  mar: {
    group: 'mar', sort: 'dtm_admin_date',
    row: (r) => ({
      when: d(r.dtm_admin_date),
      by: r.str_admin_by ?? '',
      /* the grid shows the generic name; str_medication is the branded form */
      med: r.str_generic_name ?? r.str_medication ?? '',
      dosage: [r.num_dose_size, r.str_dose_unit].filter(Boolean).join(' '),
      route: r.str_route ?? '',
      site: r.str_site ?? '',
    }),
  },

  alerts: {
    group: 'alert', sort: 'dtm_start',
    row: (r) => ({
      start: d(r.dtm_start),
      end: d(r.dtm_end),
      code: r.str_code ?? '',
      desc: r.str_description ?? '',
      /* Detail is tdt_alert.str_detail (data dictionary, MATRIX-R1243-detail) */
      detail: r.str_detail ?? r.str_note ?? '',
      s: tick(r.str_sensitive),
      m: '',
      clip: clip(r.num_attachments),
    }),
  },

  /* `Allergy / Intolerances` is the parent folder of `Reaction Risks` and MOIS
     opens the same window for both, so they share a mapping. */
  allergy: {
    group: 'allergy', sort: 'dtm_start',
    row: (r) => ({
      onset: d(r.dtm_start),
      tilde: '',
      type: r.str_intolerance_type ?? '',
      category: r.str_is_drug === 'Y' ? 'DRUG' : '',
      code: r.str_substance_code ?? '',
      agent: r.str_substance ?? '',
      reactions: r.str_reactions ?? r.str_reaction ?? '',
      severity: r.str_severity ?? '',
      m: '',
    }),
  },

  /* ---- Forms -----------------------------------------------------------
     The chart export carries the dform window ID; the separate legacy window
     dump supplies the title and group where it has a matching definition. */
  dynamic: {
    group: 'dform_header', sort: 'dtm_form',
    row: (r, data) => ({
      date: d(r.dtm_form),
      group: legacyDynamicFormDefinition(r.id_dform_window)?.group ?? '',
      title: legacyDynamicFormTitle(r.id_dform_window),
      /* the export's provider directory names the id (charts/providers.ts) */
      attending: providerLabel(data, r.id_provider),
      user: r.stp_user_create ?? '',
      state: r.stp_record_state ?? '',
    }),
  },
  /* Paper forms are filed as documents; MOIS types them PAPER FORM. */
  paper: {
    group: 'document', sort: 'dtm_date',
    where: (r) => r.str_doc_type === 'PAPER FORM',
    /* the Paper Forms window's own columns (reportScreens.paper): Date,
       Author, Document Type, Form Name, S, M and the paper clip */
    row: (r) => ({
      date: d(r.dtm_date),
      author: r.str_author ?? '',
      type: r.str_doc_type ?? '',
      /* Form Name is tdt_document.str_source_code (data dictionary,
         MATRIX-R1019-form-name); the export repeats it in str_note */
      form: r.str_source_code ?? r.str_note ?? '',
      s: tick(r.str_sensitive),
      m: r.str_link ? '\u21e9' : '',
      clip: clip(r.num_attachments ?? (r.str_link ? '1' : '')),
    }),
  },
  encforms: {
    group: 'form_header', sort: 'dtm_created',
    row: (r, data) => ({
      date: d(r.dtm_created),
      /* both of these are ids the export never resolves — `id_form_type` 1001
         is INSURANCE FORMS, `str_form_window` WP_FORM_HEADER_WCB is WCB REPORT,
         and the lookup tables are not in a chart export. v02.31.23 files WCB
         REPORT under INSURANCE FORMS (user capture 2026-09-25 #33), as the
         encounter's Encounter Forms tab does (screens/EncounterWindow
         `FORM_TYPES`) */
      type: r.id_form_type === '1001' ? 'INSURANCE FORMS' : r.id_form_type ?? '',
      form: r.str_form_window === 'WP_FORM_HEADER_WCB' ? 'WCB REPORT' : r.str_form_window ?? '',
      attending: providerLabel(data, r.id_author),
    }),
  },

  /* ---- Folders chart 87288's export has no records for ----------------
     `<admissions>`, `<interventions>`, `<social_hxs>` and `<chart_barriers>`
     are empty in that export, so these lists are empty for it — which is
     what MOIS shows for that patient. The mappings are here so an export
     that does carry them lists them. Every field below is one the field
     audit verified against the running client (MATRIX row in brackets) and
     that MOIS_REF_10000074 carries; the row keys are the report windows'
     own (reportScreens.admissions / interventions / socialhx / barriers). */

  /* Facility Admissions (art. 303527): Admitted / Discharged / Admit By /
     Facility / Description / M / paper clip [R1135..R1141] */
  admissions: {
    group: 'admission', sort: 'dtm_admit',
    row: (r) => ({
      admitted: d(r.dtm_admit),
      discharged: d(r.dtm_discharge),
      by: r.str_admit_by ?? '',
      facility: r.str_facility ?? '',
      desc: r.str_description ?? '',
      m: '',
      clip: clip(r.num_attachments),
    }),
  },
  /* Interventions (art. 303129): Date / Performed By / Description /
     Declined / Not Indicated [R0634..R0638]. `str_not_inclined` is MOIS's
     own spelling of the Not Indicated column. */
  interventions: {
    group: 'intervention', sort: 'dtm_date',
    row: (r) => ({
      date: d(r.dtm_date),
      by: r.str_performed_by ?? '',
      desc: r.str_description ?? '',
      declined: tick(r.str_decline),
      notind: tick(r.str_not_inclined),
      m: '',
      clip: clip(r.num_attachments),
    }),
  },
  /* Social History (art. 303438): Start / End / Description / S [R0784..R0787] */
  socialhx: {
    group: 'social_hx', sort: 'dtm_start',
    row: (r) => ({
      start: d(r.dtm_start),
      end: d(r.dtm_end),
      desc: r.str_description ?? '',
      s: tick(r.str_sensitive),
      m: '',
      clip: clip(r.num_attachments),
    }),
  },
  /* Barrier to Care (art. 303512): Start / End / Barrier to Care / S
     [R0991..R0994]. The report window keys the text `barrier`, the Care
     Plan window (data/mois.tsx carePlanScreens) `desc`; both are filled. */
  barriers: {
    group: 'chart_barrier', sort: 'dtm_start',
    row: (r) => ({
      start: d(r.dtm_start),
      end: d(r.dtm_end),
      barrier: r.str_barrier ?? '',
      desc: r.str_barrier ?? '',
      s: tick(r.str_sensitive),
      m: '',
      clip: clip(r.num_attachments),
    }),
  },

  /* Health Issues and Conditions are the same table under two nodes. */
  issues: {
    group: 'health_issue', sort: 'dtm_start',
    row: (r) => ({
      start: d(r.dtm_start),
      end: d(r.dtm_resolve),
      problem: r.str_problem_name ?? '',
      rank: r.num_rank ?? '',
      /* `str_certainity` — the typo is the column name in MOIS */
      certainty: r.str_certainity ?? '',
      severity: r.str_severity ?? '',
      s: tick(r.str_sensitive),
    }),
  },

}

export function rowsFromExport(node: string, records: MoisRecord[], data?: MoisChartExport | null): Record<string, string>[] {
  const map = ROW_MAPS[node]
  if (!map) return []
  const kept = map.where ? records.filter(map.where) : records
  return kept.map((r) => map.row(r, data))
}
