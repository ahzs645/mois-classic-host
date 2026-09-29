/* ============================================================================
   Care Plan and Health Issue records a learner enters during a session.

   The chart export is read-only. New Preferences, Planned Actions, Barriers
   to Care, Patient Resources, Risks for Conditions and Needs for Care entered
   in the emulator live here, per chart, so every window that lists or links
   them (the folder grids, a Goal's Linked Action(s) tab, the Care Plan
   summary, Quick Entry) agrees, and closing a folder does not lose them.
   A new frame starts on the chart as exported (`resetCarePlanRecords`).

   Same tiny external-store shape as data/chartSession.ts. Every write
   replaces the chart's slice object, so a reader can use the slice (or any
   array in it) as a memo dependency.

   What lives here, per chart:
     actions       Planned Actions entered this session (typed, stable API)
     preferences   Preferences entered this session (typed, `addPreference`)
     records       Barriers to Care, Patient Resources, Risks for Conditions
                   and Needs for Care entered this session, export-shaped
     edits         Saved edits to exported records (the export itself is
                   never written), keyed `folder:id`
     deleted       Deleted records, exported or session, keyed `folder:id`
     goalLinks / goalUnlinks
                   Goal links made or removed this session (Planned Actions'
                   Linked Goals tab; a Goal's Linked Action(s) tab can use the
                   same functions)

   A folder's "** NO KNOWN **" assertion (Conditions, art. 303447) is not
   kept here: it lives beside Reaction Risks' in data/allergySession.ts
   (`noKnown[folder]`), which the Reviewing window already reads.

   The folder screens read everything export-shaped (`mergedFolderRecords`),
   so a session row goes through the same ROW_MAPS (data/charts/to-rows.ts)
   and detail panes an exported one does.

   PROVENANCE: manual articles 300925, 303511, 303512, 303513, 303447 (text
   only; the Care Plan articles carry no local captures).
   ========================================================================= */
import { createSignal } from './sessionStore'
import type { MoisChartExport, MoisRecord } from './charts'
import { SESSION_USER } from './chartSession'
import { MOIS_TODAY, hhmm, toDots } from './clock'
import { yn } from './text'

/** a Planned Action entered in this session (art. 303511). Dates are
    `YYYY.MM.DD`, the way MOIS prints them. */
export type SessionPlannedAction = {
  id: string
  start: string
  end: string
  /** the grid's Action: "a short characterizing description" */
  action: string
  /** the Detail tab's Detail box */
  comment: string
  completed: boolean
  /** ids of the Goals it is linked to */
  goalIds: string[]
  participants?: string
  outcome?: string
  completedDate?: string
  sensitive?: boolean
}

/**
 * A Preference (art. 300925), the shape `addPreference` takes. Everything the
 * New Preference dialog (screens/PreferenceWindows.tsx) and Quick Entry -
 * Chart Preference collect. `type` is one of PREFERENCE_TYPES, `subject` one
 * of PREFERENCE_SUBJECTS, `instruction`/`reason`/`form`/`by` the drop-list
 * values (data/preferenceVocab.ts). Dates are `YYYY.MM.DD`; `start` defaults
 * to today, the rest to blank / false.
 */
export type SessionPreference = {
  id: string
  type: string
  subject: string
  identifiedBy: 'Concept' | 'Code' | 'Free Text'
  /** the concept / code the preference is about ('' for free text) */
  code: string
  /** the concept, code description or free text — the grid's Detail column */
  concept: string
  subjectDetail: string
  instruction: string
  instructionDetail: string
  reason: string
  reasonDetail: string
  start: string
  end: string
  sensitive: boolean
  showOnDemo: boolean
  form: string
  by: string
}
export type PreferenceInput = Partial<Omit<SessionPreference, 'id'>> & Pick<SessionPreference, 'type' | 'subject'> & { id?: string }

/** the folders this store backs; ids are the export's own record keys */
export type CarePlanFolder = 'prefs' | 'actions' | 'barriers' | 'resources' | 'risks' | 'needs'
export const FOLDER_ID: Record<CarePlanFolder, string> = {
  prefs: 'id_chart_preference',
  actions: 'id_action',
  barriers: 'id_chart_barrier',
  resources: 'id_chart_resource',
  risks: 'id_risk',
  needs: 'id_need',
}
type RecordFolder = 'barriers' | 'resources' | 'risks' | 'needs'

export type GoalLinkObject = 'action' | 'health_issue' | 'risk' | 'need'
export type GoalLinkEdit = { object: GoalLinkObject; objectId: string; goalId: string; by: string; when: string }

type ChartState = {
  actions: SessionPlannedAction[]
  preferences: SessionPreference[]
  records: Record<RecordFolder, MoisRecord[]>
  edits: Record<string, MoisRecord>
  deleted: string[]
  goalLinks: GoalLinkEdit[]
  goalUnlinks: string[]
}

const fresh = (): ChartState => ({
  actions: [], preferences: [], records: { barriers: [], resources: [], risks: [], needs: [] },
  edits: {}, deleted: [], goalLinks: [], goalUnlinks: [],
})

const state: Record<string, ChartState> = {}
let seq = 0
const changes = createSignal(() => {
  for (const key of Object.keys(state)) delete state[key]
  for (const key of Object.keys(created)) delete created[key]
})
const emit = changes.emit
const EMPTY: ChartState = fresh()
const of = (chart: string): ChartState => (state[chart] ??= fresh())
/** replace the chart's slice, so readers see a new object */
const write = (chart: string, patch: (s: ChartState) => Partial<ChartState>) => {
  const s = of(chart)
  state[chart] = { ...s, ...patch(s) }
  emit()
}

/** a fresh session id for a new record, e.g. `session-action-3` */
export const newSessionId = (kind: string) => `session-${kind}-${++seq}`
export const isSessionId = (id: string | undefined) => !!id && id.startsWith('session-')

/** re-render on any change, then read the chart's slice */
export function useCarePlanRecords(chart: string): ChartState {
  changes.use()
  return state[chart] ?? EMPTY
}

export const carePlanRecords = (chart: string): ChartState => state[chart] ?? EMPTY

/* --- dates: the typed shapes carry MOIS's printed form, records the export's */
const slash = (v = '') => v.replace(/\./g, '/')
const dot = toDots
/* the export's stamps carry seconds; MOIS writes :00 */
const clock = () => `${hhmm()}:00`
/** the Created stamp a record entered now carries */
export const createdStamp = (): MoisRecord => ({ stp_user_create: SESSION_USER, stp_date_create: `${slash(MOIS_TODAY)} ${clock()}` })

/* --- Planned Actions (stable API) ---------------------------------------- */
export function addPlannedAction(chart: string, action: SessionPlannedAction) {
  write(chart, (s) => ({ actions: [action, ...s.actions] }))
}

export function updatePlannedAction(chart: string, id: string, patch: Partial<SessionPlannedAction>) {
  write(chart, (s) => ({ actions: s.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)) }))
}

export function actionRecord(a: SessionPlannedAction): MoisRecord {
  return {
    id_action: a.id,
    dtm_start: slash(a.start),
    dtm_end: slash(a.end),
    str_action: a.action,
    str_comment: a.comment,
    str_participants: a.participants ?? '',
    str_outcome: a.outcome ?? '',
    str_completed: yn(a.completed),
    dtm_completed: slash(a.completedDate ?? ''),
    str_sensitive: yn(a.sensitive),
  }
}
const actionFrom = (r: MoisRecord, prev: SessionPlannedAction): SessionPlannedAction => ({
  ...prev,
  start: dot(r.dtm_start),
  end: dot(r.dtm_end),
  action: r.str_action ?? '',
  comment: r.str_comment ?? '',
  participants: r.str_participants ?? '',
  outcome: r.str_outcome ?? '',
  completed: r.str_completed === 'Y',
  completedDate: dot(r.dtm_completed),
  sensitive: r.str_sensitive === 'Y',
})

/* --- Preferences ---------------------------------------------------------- */
/**
 * File a Preference on the chart, as the New Preference dialog's Save and
 * Quick Entry - Chart Preference's Continue do. Returns the new record's id.
 * It is listed first in Care Plan ▸ Preferences.
 */
export function addPreference(chart: string, input: PreferenceInput): string {
  const pref: SessionPreference = {
    id: input.id ?? newSessionId('preference'),
    type: input.type,
    subject: input.subject,
    identifiedBy: input.identifiedBy ?? 'Concept',
    code: input.code ?? '',
    concept: input.concept ?? '',
    subjectDetail: input.subjectDetail ?? '',
    instruction: input.instruction ?? '',
    instructionDetail: input.instructionDetail ?? '',
    reason: input.reason ?? '',
    reasonDetail: input.reasonDetail ?? '',
    start: input.start ?? MOIS_TODAY,
    end: input.end ?? '',
    sensitive: input.sensitive ?? false,
    showOnDemo: input.showOnDemo ?? false,
    form: input.form ?? '',
    by: input.by ?? '',
  }
  write(chart, (s) => ({ preferences: [pref, ...s.preferences] }))
  created[pref.id] = createdStamp()
  return pref.id
}

export function updatePreference(chart: string, id: string, patch: Partial<SessionPreference>) {
  write(chart, (s) => ({ preferences: s.preferences.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
}

/** a session Preference in the export's own shape (`chart_preference`) */
export function preferenceRecord(p: SessionPreference): MoisRecord {
  return {
    id_chart_preference: p.id,
    /* the grid's Type column is `str_classification`, Subject `str_type`
       (data/charts/to-rows.ts prefs) */
    str_classification: p.type.toUpperCase(),
    str_type: p.subject.toUpperCase(),
    str_code_type: p.identifiedBy.toUpperCase(),
    str_code: p.code,
    str_description: p.concept,
    str_preference: p.concept,
    str_detail: p.subjectDetail,
    str_instruction_code: p.instruction,
    str_instruction: p.instructionDetail,
    str_reason_code: p.reason,
    str_reason: p.reasonDetail,
    dtm_start: slash(p.start),
    dtm_end: slash(p.end),
    str_sensitive: yn(p.sensitive),
    str_include_demo: yn(p.showOnDemo),
    str_form: p.form,
    str_by: p.by,
    num_attachments: '0',
    ...created[p.id],
  }
}
const preferenceFrom = (r: MoisRecord, prev: SessionPreference): SessionPreference => ({
  ...prev,
  subjectDetail: r.str_detail ?? '',
  instructionDetail: r.str_instruction ?? '',
  reason: r.str_reason_code ?? '',
  reasonDetail: r.str_reason ?? '',
  start: dot(r.dtm_start),
  end: dot(r.dtm_end),
  sensitive: r.str_sensitive === 'Y',
  showOnDemo: r.str_include_demo === 'Y',
  form: r.str_form ?? '',
  by: r.str_by ?? '',
})

/** Created stamps of session records, by id (kept out of the typed shapes) */
const created: Record<string, MoisRecord> = {}

/* --- every folder, export-shaped ----------------------------------------- */
const keyOf = (folder: CarePlanFolder, id: string) => `${folder}:${id}`

/** the folder's session records, newest first, export-shaped */
export function sessionFolderRecords(s: ChartState, folder: CarePlanFolder): MoisRecord[] {
  if (folder === 'actions') return s.actions.map((a) => ({ ...actionRecord(a), ...created[a.id] }))
  if (folder === 'prefs') return s.preferences.map(preferenceRecord)
  return s.records[folder]
}

/**
 * What a folder lists: this session's records first, then the export's with
 * any saved edit applied, less everything deleted.
 */
export function mergedFolderRecords(s: ChartState, folder: CarePlanFolder, exported: MoisRecord[]): MoisRecord[] {
  const idKey = FOLDER_ID[folder]
  const gone = new Set(s.deleted)
  return [
    ...sessionFolderRecords(s, folder),
    ...exported.map((r) => s.edits[keyOf(folder, r[idKey] ?? '')] ?? r),
  ].filter((r) => !gone.has(keyOf(folder, r[idKey] ?? '')))
}

/** file a new export-shaped record (Barrier, Resource, Risk, Need, Action) */
export function addFolderRecord(chart: string, folder: CarePlanFolder, record: MoisRecord): string {
  const idKey = FOLDER_ID[folder]
  const id = record[idKey] || newSessionId(folder.replace(/s$/, ''))
  created[id] = record.stp_user_create ? { stp_user_create: record.stp_user_create, stp_date_create: record.stp_date_create ?? '' } : createdStamp()
  if (folder === 'actions') {
    addPlannedAction(chart, actionFrom(record, { id, start: '', end: '', action: '', comment: '', completed: false, goalIds: [] }))
  } else if (folder === 'prefs') {
    addPreference(chart, { ...preferenceFrom(record, {} as SessionPreference), id, type: record.str_classification ?? '', subject: record.str_type ?? '', concept: record.str_preference ?? '', instruction: record.str_instruction_code ?? '' })
  } else {
    write(chart, (s) => ({ records: { ...s.records, [folder]: [{ ...record, [idKey]: id, ...created[id] }, ...s.records[folder]] } }))
  }
  return id
}

/** save an edited record: a session one in place, an exported one as an edit */
export function saveFolderRecord(chart: string, folder: CarePlanFolder, record: MoisRecord) {
  const id = record[FOLDER_ID[folder]] ?? ''
  if (!id) return
  const stamped = { ...record, stp_user_modify: SESSION_USER, stp_date_modify: `${slash(MOIS_TODAY)} ${clock()}` }
  if (!isSessionId(id)) { write(chart, (s) => ({ edits: { ...s.edits, [keyOf(folder, id)]: stamped } })); return }
  created[id] = { ...created[id], stp_user_modify: stamped.stp_user_modify, stp_date_modify: stamped.stp_date_modify }
  if (folder === 'actions') write(chart, (s) => ({ actions: s.actions.map((a) => (a.id === id ? actionFrom(record, a) : a)) }))
  else if (folder === 'prefs') write(chart, (s) => ({ preferences: s.preferences.map((p) => (p.id === id ? preferenceFrom(record, p) : p)) }))
  else write(chart, (s) => ({ records: { ...s.records, [folder]: s.records[folder].map((r) => (r[FOLDER_ID[folder]] === id ? stamped : r)) } }))
}

/** delete a record from the folder (a session record goes; an export one is hidden) */
export function deleteFolderRecord(chart: string, folder: CarePlanFolder, id: string) {
  if (!id) return
  if (!isSessionId(id)) { write(chart, (s) => ({ deleted: [...s.deleted, keyOf(folder, id)] })); return }
  if (folder === 'actions') write(chart, (s) => ({ actions: s.actions.filter((a) => a.id !== id) }))
  else if (folder === 'prefs') write(chart, (s) => ({ preferences: s.preferences.filter((p) => p.id !== id) }))
  else write(chart, (s) => ({ records: { ...s.records, [folder]: s.records[folder].filter((r) => r[FOLDER_ID[folder]] !== id) } }))
}

/* --- Goal links -----------------------------------------------------------
   A Planned Action "can be linked to more than one goal" (art. 303511). The
   export's `goal_link` rows are the starting point; links made or removed
   here are layered on top. A session Planned Action also carries its links
   in `goalIds`, which this keeps in step. */
const linkKey = (object: GoalLinkObject, objectId: string, goalId: string) => `${object}:${objectId}:${goalId}`
const linkWhen = () => `${MOIS_TODAY}  ${clock().slice(0, 5)}`

export function linkGoal(chart: string, object: GoalLinkObject, objectId: string, goalId: string) {
  const key = linkKey(object, objectId, goalId)
  write(chart, (s) => ({
    goalLinks: s.goalLinks.some((l) => linkKey(l.object, l.objectId, l.goalId) === key)
      ? s.goalLinks
      : [...s.goalLinks, { object, objectId, goalId, by: SESSION_USER, when: linkWhen() }],
    goalUnlinks: s.goalUnlinks.filter((k) => k !== key),
    actions: object === 'action'
      ? s.actions.map((a) => (a.id === objectId && !a.goalIds.includes(goalId) ? { ...a, goalIds: [...a.goalIds, goalId] } : a))
      : s.actions,
  }))
}

export function unlinkGoal(chart: string, object: GoalLinkObject, objectId: string, goalId: string) {
  const key = linkKey(object, objectId, goalId)
  write(chart, (s) => ({
    goalLinks: s.goalLinks.filter((l) => linkKey(l.object, l.objectId, l.goalId) !== key),
    goalUnlinks: s.goalUnlinks.includes(key) ? s.goalUnlinks : [...s.goalUnlinks, key],
    actions: object === 'action'
      ? s.actions.map((a) => (a.id === objectId ? { ...a, goalIds: a.goalIds.filter((g) => g !== goalId) } : a))
      : s.actions,
  }))
}

/** every Goal the record is linked to now: export links, less removed ones, plus this session's */
export function linkedGoalIds(data: MoisChartExport | null, s: ChartState, object: GoalLinkObject, objectId: string | undefined): GoalLinkEdit[] {
  if (!objectId) return []
  const out: GoalLinkEdit[] = []
  const seen = new Set<string>()
  const push = (l: GoalLinkEdit) => {
    const key = linkKey(l.object, l.objectId, l.goalId)
    if (seen.has(l.goalId) || s.goalUnlinks.includes(key)) return
    seen.add(l.goalId); out.push(l)
  }
  for (const link of data?.goal_link ?? []) {
    if (link.str_object === `tdt_${object}` && link.id_object === objectId && link.id_goal) {
      push({ object, objectId, goalId: link.id_goal, by: link.stp_user_create ?? '', when: dot(link.stp_date_create) })
    }
  }
  s.goalLinks.filter((l) => l.object === object && l.objectId === objectId).forEach(push)
  if (object === 'action') {
    for (const goalId of s.actions.find((a) => a.id === objectId)?.goalIds ?? []) push({ object, objectId, goalId, by: SESSION_USER, when: '' })
  }
  return out
}

/** a new frame starts on the chart as exported (the session reset runs this
    as the frame mounts — data/sessionStore.ts) */
export const resetCarePlanRecords = () => changes.reset()
