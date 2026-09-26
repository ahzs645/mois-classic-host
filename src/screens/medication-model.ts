import { useMemo } from 'react'
import { useChartExport, useNodeRecords } from '../data/chart-records'
import type { MoisRecord } from '../data/charts'
import { favouriteSeed, type FavouriteRow } from '../data/medications'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { useSessionState } from '../host/screen-windows'

/* ============================================================================
   The medication folders' records, as one list per folder.

   Rows start as the chart export's prescriptions (Long Term Medication reads
   the same table — see ROW_MAPS.ltm). What the learner does to them on the
   stage — a saved New Record, a duplicate, a renewal, a void, an end date,
   a print — is kept for the life of the frame in the session store
   (host/screen-windows.tsx), so it is still there when they move between
   Long Term Meds and Prescriptions the way the lessons ask them to.
   ========================================================================= */

/** The Desktop For user every record the stage writes is stamped with. */
export const STAGE_USER = 'TECHNICAL SUPPORT'

export type Med = {
  id: string
  /** Rx: the Order date. LTM: Start. */
  order: string
  /** LTM: End */
  end: string
  cdic: string
  med: string
  generic: string
  atc: string
  dose: string
  amount: string
  /** CPP for a controlled prescription */
  type: string
  indic: string
  comment: string
  office: string
  orderBy: string
  lastPrinted: string
  /** F = free-text dose, S = built by the Medication Dose Wizard (art. 303217) */
  doseKind: 'F' | 'S'
  /** the Dose Detail tree: DISPENSE line, then one line per dose */
  dispense: string
  doses: string[]
  voided?: { by: string; date: string; reason: string }
  created: string
  modified: string
  encounter?: string
  record?: MoisRecord
}

export type PrintLogEntry = {
  date: string; by: string; station: string; items: Med[]; version: 'Original' | 'Copy'
  /** signed on Please Sign (Sign and Print / Fax / Task), and how it went */
  signed?: boolean; method?: 'PRINT' | 'FAX'
}

export type MedSession = {
  rxAdded: Med[]
  ltmAdded: Med[]
  deleted: string[]
  voided: Record<string, NonNullable<Med['voided']>>
  ltmEnded: Record<string, string>
  printed: Record<string, string>
  printLog: PrintLogEntry[]
  favourites: FavouriteRow[]
}

const EMPTY: MedSession = {
  rxAdded: [], ltmAdded: [], deleted: [], voided: {}, ltmEnded: {}, printed: {},
  printLog: [], favourites: favouriteSeed,
}

const dot = (v?: string) => (v ? v.split(' ')[0]!.replace(/\//g, '.') : '')
const stampOf = (date?: string, user?: string) => [date?.replace(/\//g, '.').replace(/:\d\d$/, ''), user].filter(Boolean).join('  ')

/** An export prescription, or long-term medication (tdt_medication_lt: its
    own id, dtm_start / dtm_end), as the folder's row. */
export function medFromRecord(r: MoisRecord, doses: MoisRecord[] = [], durations: MoisRecord[] = []): Med {
  const id = r.id_prescription ?? r.id_medication_lt ?? ''
  const table = r.id_medication_lt ? 'tdt_medication_lt' : 'tdt_prescription'
  /* a dose tree hangs off either table through drug_duration's object id */
  const duration = durations.find((d) => d.id_object === id && (!d.str_object || d.str_object === table))
  const own = duration ? doses.filter((d) => d.id_drug_duration === duration.id_drug_duration) : []
  const fixed = (v?: string) => (v ? Number(v).toFixed(1) : '')
  return {
    id,
    order: dot(r.dtm_order ?? r.dtm_start),
    end: dot(r.dtm_end),
    cdic: r.str_cdic ?? '',
    med: r.str_medication ?? '',
    generic: r.str_generic_name ?? '',
    atc: r.str_atc_code ?? '',
    dose: r.str_dose_freq ?? '',
    amount: r.str_amount ?? '',
    type: r.str_type ?? '',
    indic: '',
    comment: r.str_comment ?? '',
    office: r.str_office_note ?? '',
    orderBy: r.str_order_by ?? r.str_ordered_by ?? '',
    lastPrinted: r.dtm_last_printed ? r.dtm_last_printed.replace(/\//g, '.').replace(/:\d\d$/, '') : '',
    doseKind: r.str_dose_type === 'FREETEXT' ? 'F' : 'S',
    dispense: duration?.num_duration ? `${fixed(duration.num_duration)} ${duration.str_duration_units ?? ''}`.trim() : '',
    doses: own.map((d) => [fixed(d.num_dose), d.str_dose_units, d.str_route, d.str_frequency].filter(Boolean).join(' ')),
    voided: r.str_void === 'Y' ? { by: r.stp_user_modify ?? '', date: dot(r.stp_date_modify), reason: '' } : undefined,
    created: stampOf(r.stp_date_create, r.stp_user_create),
    modified: stampOf(r.stp_date_modify, r.stp_user_modify),
    encounter: r.id_encounter,
    record: r,
  }
}

/** A blank row, the way New Record starts one: today's date and the Desktop For user. */
export function blankMed(id: string): Med {
  return {
    id, order: MOIS_TODAY, end: '', cdic: '', med: '', generic: '', atc: '', dose: '', amount: '',
    type: '', indic: '', comment: '', office: '', orderBy: STAGE_USER, lastPrinted: '', doseKind: 'F',
    dispense: '', doses: [], created: `${MOIS_TODAY}  ${STAGE_USER}`, modified: '',
  }
}

/** The session store for the open chart's medication records. */
export function useMedSession(): [MedSession, (fn: (s: MedSession) => MedSession) => void] {
  const { chart } = usePatient()
  const [session, set] = useSessionState<MedSession>(`meds:${chart}`, EMPTY)
  return [session, (fn) => set((prev) => fn(prev))]
}

/** A fresh id for a row the stage writes; never one an export uses. */
let stageSeq = 0
export const newMedId = (prefix: string) => `${prefix}-${++stageSeq}`

/** The folder's rows: what the stage added, then the export, newest first. */
export function useMedRows(mode: 'rx' | 'ltm'): Med[] {
  const records = useNodeRecords(mode)
  const [session] = useMedSession()
  /* the dose tree hangs off the prescription through drug_duration */
  const doses = useNodeDoses()
  return useMemo(() => {
    /* Long Term rows keep an `ltm-` prefix on their id, so a session edit on
       one list never reaches the other */
    const base = records.map((r) => {
      const m = medFromRecord(r, doses.doses, doses.durations)
      return mode === 'ltm' ? { ...m, id: `ltm-${m.id}` } : m
    })
    const added = mode === 'rx' ? session.rxAdded : session.ltmAdded
    return [...added, ...base]
      .filter((m) => !session.deleted.includes(m.id))
      .map((m) => ({
        ...m,
        voided: session.voided[m.id] ?? m.voided,
        end: session.ltmEnded[m.id] ?? m.end,
        lastPrinted: session.printed[m.id] ?? m.lastPrinted,
      }))
  }, [records, session, mode, doses])
}

function useNodeDoses() {
  const data = useChartExport()
  return useMemo(() => ({ doses: data?.drug_dose ?? [], durations: data?.drug_duration ?? [] }), [data])
}
