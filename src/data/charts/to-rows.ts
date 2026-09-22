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
import type { MoisChartGroup, MoisRecord } from './types'

const d = (v?: string) => (v ? v.split(' ')[0]!.replace(/\//g, '.') : '')
/** the paperclip column: a count, or the dash MOIS prints for none */
const clip = (v?: string) => (v && v !== '0' ? v : '-')
/** MOIS writes Y/N; the grids show a tick or nothing */
const tick = (v?: string) => (v === 'Y' ? '✓' : '')

export type RowMap = {
  group: MoisChartGroup
  /** newest first, by this export field */
  sort?: string
  /** keep only the records a screen shows — Orders splits by order type */
  where?: (r: MoisRecord) => boolean
  row: (r: MoisRecord) => Record<string, string>
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
      rank: r.num_rank ?? '',
      /* `str_certainity` — the typo is the column name in MOIS */
      certainty: r.str_certainity ?? '',
      severity: r.str_severity ?? '',
      s: tick(r.str_sensitive),
      m: '',
    }),
  },
  reaction: {
    group: 'allergy',
    sort: 'dtm_start',
    row: (r) => ({
      onset: d(r.dtm_start),
      tilde: '',
      type: r.str_intolerance_type ?? '',
      category: tick(r.str_is_drug),
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
      condition: r.str_problem_name ?? r.str_description ?? '',
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
      m: '',
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
    row: (r) => ({
      id: r.id_encounter ?? '',
      date: d(r.dtm_appoint),
      hr: r.num_appoint_hr?.padStart(2, '0') ?? '',
      mn: r.num_appoint_min?.padStart(2, '0') ?? '',
      code: r.str_visit_code ?? '',
      mode: r.str_visit_mode ?? '',
      nbr: r.num_time_slots ?? '',
      provider: r.lkp_provider ?? r.str_attending ?? '',
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
      /* TM / RP / TK / MG / 📎 are read-only roll-ups with no export field */
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

  // The chart export has prescriptions, but no tdt_medication_lt records.
  // Long Term Medications remains unmapped until that data source is available.

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
    row: (r) => ({
      date: d(r.dtm_administered),
      code: r.str_substance_code ?? '',
      agent: r.str_agents ?? '',
      event: r.str_reactions ?? r.str_report_type ?? '',
      m: '',
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
  goals: {
    group: 'goal', sort: 'dtm_start',
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
      detail: r.str_note ?? '',
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
     A dynamic form is a header plus its answers; the header is what the list
     shows. `id_dform_window` is the form definition it was filled from — the
     export carries the id, not the title, so the list prints the id the way
     MOIS does when a definition is not on this system. */
  dynamic: {
    group: 'dform_header', sort: 'dtm_form',
    row: (r) => ({
      date: d(r.dtm_form),
      /* Group and Title name the form definition. The export stores only
         `id_dform_window`, and the definitions live on the MOIS server, so
         there is nothing here to resolve them against — the audit marks every
         Dynamic Forms row "not auditable" for the same reason. */
      group: '',
      title: r.id_dform_window ?? '',
      attending: r.id_provider && r.id_provider !== '-1' ? r.id_provider : '',
      user: r.stp_user_create ?? '',
      state: r.stp_record_state ?? '',
    }),
  },
  /* Paper forms are filed as documents; MOIS types them PAPER FORM. */
  paper: {
    group: 'document', sort: 'dtm_date',
    where: (r) => r.str_doc_type === 'PAPER FORM',
    row: (r) => ({
      form: r.str_note ?? '',
      category: r.str_doc_type ?? '',
      revised: d(r.dtm_date),
      version: '',
      status: '',
    }),
  },
  encforms: {
    group: 'form_header', sort: 'dtm_created',
    row: (r) => ({
      date: d(r.dtm_created),
      /* both of these are ids the export never resolves — `id_form_type` 1001
         is ENCOUNTER FORMS, `str_form_window` WP_FORM_HEADER_WCB is WCB REPORT,
         and the lookup tables are not in a chart export */
      type: r.id_form_type ?? '',
      form: r.str_form_window ?? '',
      attending: r.id_author && r.id_author !== '-1' ? r.id_author : '',
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

export function rowsFromExport(node: string, records: MoisRecord[]): Record<string, string>[] {
  const map = ROW_MAPS[node]
  if (!map) return []
  const kept = map.where ? records.filter(map.where) : records
  return kept.map(map.row)
}
