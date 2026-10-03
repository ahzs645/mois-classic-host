import type { MoisChartExport, MoisRecord } from './charts'
import { MOIS_TODAY } from './patients'
import { daysFromToday, toDashes } from './clock'

/* ============================================================================
   The MAR as MOIS lists it: parent orders with their administration events.

   MOIS files every administration under a parent order (tdt_mar_instruction
   `str_type` PARENT, its events CHILD with `id_parent_record`, each CHILD's
   `id_outcome_record` the tdt_mar row). A one-off administration is an order
   "for 1 DOSE" with one child — both of chart 87288's are. The list groups by
   that parent (1741600 `169730ee…png`, 1664605 `9f2fc2ac…png`).

   The export has no order still running, so the MAR lessons about cancelling
   one (1741600) would have nothing to act on. One is added for the stage and
   marked so: a signed seven-day order, one dose a day at 09:00 from the
   stage's today, every dose still SCHEDULED — the shape of the manual's own
   example (a once-daily solution "for 7 DAY", `d38e5e72…png`). It is a
   practice record, not part of the chart export.

   The action trail (tdt_mar_action): every step an instruction went
   through, with who took it and when — id_mar_instruction names the parent
   or child it belongs to, str_action the step, str_user_name / dtm_date /
   dtm_time the who and when. Chart 87288's two orders read NOT SCHEDULED →
   DELEGATED on the parent and SCHEDULED → ADMINISTERED on each dose. It is
   carried on the order and on each event (`actions`). No capture shows MOIS
   listing it — the order window's Signing History is the order's signing
   (Action SIGNED, Note, On / By; 1741600 `d38e5e72…png`), not this trail,
   and the record windows (1664605 `cb60a024…png`, 303427 `1494e901…png`)
   have no history box — so it is drawn nowhere. Where it is the same
   information it fills in what the dose's tdt_mar row lacks: an event with
   no administration record takes its status, by and date / time from its
   last action rather than from the instruction's care step.
   ========================================================================= */

/** one step of an instruction's trail (tdt_mar_action) */
export type MarAction = {
  id: string
  /** the tdt_mar_instruction it belongs to */
  instruction: string
  /** SCHEDULED · ADMINISTERED · NOT SCHEDULED · DELEGATED … */
  action: string
  by: string
  date: string
  time: string
  record: MoisRecord
}

export type MarEvent = {
  id: string
  status: string
  date: string
  time: string
  /** Generic Name [Brand Name] */
  med: string
  generic: string
  dose: string
  units: string
  series: string
  site: string
  lot: string
  by: string
  record?: MoisRecord
  /** the dose's own action trail, oldest first */
  actions?: MarAction[]
}

export type MarOrder = {
  id: string
  orderDate: string
  orderTime: string
  med: string
  orderBy: string
  /** the Detail column: dose, then "for <duration>" */
  detail: string
  dosage: string
  dosageUnit: string
  frequency: string
  duration: string
  durationUnit: string
  route: string
  signed: { action: string; note: string; on: string }
  created: string
  modified: string
  events: MarEvent[]
  /** a practice record the stage adds, not one from the export */
  practice?: boolean
  /** the parent order's own action trail, oldest first */
  actions?: MarAction[]
}

const dot = (v?: string) => (v ?? '').replace(/\//g, '.')
const hm = (v?: string) => (v ?? '').slice(0, 5)
const num = (v?: string) => (v ? String(Number(v)) : '')

/** An instruction's action trail, oldest first (by date, time, then id). */
export function marActionsFor(data: MoisChartExport | null, instruction: string | undefined): MarAction[] {
  if (!data || !instruction) return []
  return (data.mar_action ?? [])
    .filter((a) => a.id_mar_instruction === instruction)
    .map((a): MarAction => ({
      id: a.id_mar_action ?? '',
      instruction,
      action: a.str_action ?? '',
      by: a.str_user_name ?? a.stp_user_create ?? '',
      date: dot(a.dtm_date),
      time: hm(a.dtm_time),
      record: a,
    }))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`) || Number(a.id) - Number(b.id))
}

/** The export's MAR, as parent orders with their events, newest first. */
export function marOrdersFromExport(data: MoisChartExport | null): MarOrder[] {
  if (!data) return []
  const instructions = data.mar_instruction ?? []
  return instructions
    .filter((p) => p.str_type === 'PARENT')
    .map((p): MarOrder => {
      const children = instructions.filter((c) => c.str_type === 'CHILD' && c.id_parent_record === p.id_mar_instruction)
      const events = children.map((c): MarEvent => {
        const m = (data.mar ?? []).find((r) => r.id_mar === c.id_outcome_record)
        const actions = marActionsFor(data, c.id_mar_instruction)
        const last = actions[actions.length - 1]
        return {
          id: c.id_mar_instruction ?? '',
          status: m?.str_action_type ?? last?.action ?? c.str_care_step ?? c.str_status ?? '',
          date: m?.dtm_admin_date ? dot(m.dtm_admin_date) : last?.date ?? dot(c.dtm_start_date),
          time: m?.dtm_admin_time ? hm(m.dtm_admin_time) : last?.time ?? hm(c.dtm_start_time),
          med: m ? (m.str_medication && m.str_generic_name && m.str_medication !== m.str_generic_name ? `${m.str_generic_name} [${m.str_medication}]` : m.str_generic_name ?? m.str_medication ?? '') : '',
          generic: m?.str_generic_name ?? m?.str_medication ?? '',
          dose: num(m?.num_dose_size),
          units: m?.str_dose_unit ?? '',
          /* Series Number is num_series_seq_nbr (MATRIX-R0770) */
          series: m?.num_series_seq_nbr ?? m?.str_series ?? '',
          site: m?.str_site ?? '',
          lot: m?.str_lot_number ?? '',
          by: m?.str_admin_by ?? last?.by ?? c.str_create_by ?? '',
          record: m,
          actions,
        }
      })
      const first = events[0]
      const dose = [first?.dose, first?.units].filter(Boolean).join(' ')
      return {
        id: p.id_mar_instruction ?? '',
        orderDate: dot(p.dtm_order_date ?? p.dtm_create_date),
        orderTime: hm(p.dtm_order_time ?? p.dtm_create_time),
        med: first?.generic ?? '',
        orderBy: p.str_order_by ?? 'Unknown',
        detail: `${dose ? `${dose}   ` : ''}for ${p.str_duration ?? '1'} ${p.str_duration_unit ?? 'DOSE'}`,
        dosage: first?.dose ?? '',
        dosageUnit: first?.units ?? '',
        frequency: '',
        duration: p.str_duration ?? '1',
        durationUnit: p.str_duration_unit ?? 'DOSE',
        route: first?.record?.str_route ?? '',
        signed: { action: p.stp_record_state ?? '', note: '', on: `${dot(p.stp_date_create).replace(/:\d\d$/, '')} - ${p.stp_user_create ?? ''}` },
        created: `${dot(p.stp_date_create).replace(/:\d\d$/, '')}  ${p.stp_user_create ?? ''}`,
        modified: `${dot(p.stp_date_modify).replace(/:\d\d$/, '')}  ${p.stp_user_modify ?? ''}`,
        events,
        actions: marActionsFor(data, p.id_mar_instruction),
      }
    })
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
}

/** The stage's running order (see the header). */
export function practiceOrder(): MarOrder {
  const day = daysFromToday
  const med = 'ACETAMINOPHEN 500MG TABLET'
  return {
    id: 'practice-order-1',
    orderDate: MOIS_TODAY,
    orderTime: '08:45',
    med,
    orderBy: 'TECHNICAL SUPPORT',
    detail: '1 TABLET OPD   for 7 DAY',
    dosage: '1',
    dosageUnit: 'TABLET',
    frequency: 'OPD (Once Daily)',
    duration: '7',
    durationUnit: 'DAY (Days)',
    route: 'ORAL',
    signed: { action: 'SIGNED', note: 'ready', on: `${toDashes(MOIS_TODAY)} 08:52 - TECHNICAL SUPPORT` },
    created: `${MOIS_TODAY}  08:45  TECHNICAL SUPPORT`,
    modified: `${MOIS_TODAY}  08:52  TECHNICAL SUPPORT`,
    practice: true,
    /* newest first, the way the expanded order lists them */
    events: [6, 5, 4, 3, 2, 1, 0].map((n) => ({
      id: `practice-order-1-${n}`,
      status: 'SCHEDULED',
      date: day(n),
      time: '09:00',
      med,
      generic: med,
      dose: '1',
      units: 'TABLET',
      series: '',
      site: '',
      lot: '',
      by: '',
    })),
  }
}
