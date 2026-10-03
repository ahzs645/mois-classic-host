import { useMemo, useState, type ReactNode } from 'react'
import { useChartExport } from '../data/chart-records'
import type { MoisChartExport, MoisRecord } from '../data/charts'
import {
  addFolderRecord, deleteFolderRecord, linkGoal, linkedGoalIds, mergedFolderRecords, saveFolderRecord,
  unlinkGoal, useCarePlanRecords, carePlanRecords, type GoalLinkObject,
} from '../data/carePlanRecords'
import { SESSION_USER } from '../data/chartSession'
import { addGoal, quantitativeDescription, type GoalFields } from '../data/goalRecords'
import { GOAL_CODES, GOAL_CONCEPTS, GOAL_OPERATORS, GOAL_PHASES, GOAL_SUBJECTS, GOAL_UNITS } from '../data/goalVocab'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import {
  PBCheckbox, PBInput, PBLookup, PBRadio, PBSelect, PBTextArea, pbSlug,
} from '../pb'
import { CodePrompt } from './QuickEntryEditors'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { ModalWindow } from './dialogKit'
import { DialogFooter, FormLabel } from './formKit'
import { useTickSet } from './listKit'
import { GRID_BOX, PickButtons, PickListWindow, SIZE } from './lookupKit'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   The Goals folder's windows (Patient Chart ▸ Care Plan ▸ Goals, art. 303498).

     new-goal                  New Goal — New Record on the Goals folder.
     goal-link-health-issues   Link Health Issues — the Linked Health
                               Issue(s) tab's Link Health Issue(s).
     goal-link-actions         Link Action(s) — the Linked Action(s) tab's
                               Link Action(s).
     goal-action-detail        Action Detail — New Action and Edit Action.

   New Goal is the user's capture (reference/goal-standard-populated.png,
   v02.31.23): a pale band holding Goal Type [ ] Quantitative Goal · Phase /
   Start Date · End Date, then Goal, a tall empty stretch, Detail and
   Expected Outcome, each block ruled off, and one centred Close. The empty
   stretch under Goal is where ticking Quantitative Goal puts the
   quantitative settings (the article's `new_goal_quant.PNG` is the same
   530 x 446 window) — their layout there is INFERRED from the Quantitative
   Settings tab (screens/GoalsView.tsx) and the article's field list. Close
   files the goal when it has a description; a quantitative goal's
   description is written from its settings.

   The other three have no capture (the article's are not in the local
   manual); their fields are the article's lists, their layout INFERRED:
     Link Health Issues: "select which Conditions, Risks for Conditions and
       Needs for Care are linked with the current goal" — three bands, a tick
       box per row, Link / Cancel.
     Link Action(s): "a window listing actions the user can link to the
       selected goal (will exclude actions already linked to the current
       goal)" — the same shape.
     Action Detail: Planned Start, Planned End, Participant(s), Action,
       Detail, Completed (a Yes box), Completed Date, Outcome; Save / Cancel.

   Links and actions go through the Care Plan store (data/carePlanRecords.ts)
   so the Planned Actions folder shows an action made or linked here, and a
   link made there shows on the goal.

   Anchors: host.mois.dialog.{new-goal, goal-link-health-issues,
   goal-link-actions, goal-action-detail}; fields host.mois.field.goal-*,
   host.mois.field.action-*; tick boxes host.mois.field.link-{n}; commands
   host.mois.command.{new-goal-close, link-issues-ok, link-issues-cancel,
   link-actions-ok, link-actions-cancel, action-detail-save,
   action-detail-cancel}.
   ========================================================================= */

/* --- vocabularies: data/goalVocab (Phase, Subject, Concept / Code, Target
   Value operators, Require Every units), shared with the Quick Entry goal
   windows ---------------------------------------------------------------- */
/** the Phase drop-down: a blank, then data/goalVocab's phases */
export const GOAL_PHASE_OPTIONS = ['', ...GOAL_PHASES]

export const conceptOptions = (subject: string, by: 'Code' | 'Concept', current: string) => {
  const list = (by === 'Code' ? GOAL_CODES[subject] : GOAL_CONCEPTS[subject]) ?? []
  return ['', ...list, ...(current && !list.includes(current) ? [current] : [])]
}

/* --- the quantitative settings block, shared by New Goal and the tab -------
   Measured off quantitative-settings-populated.png (DEV v02.31.23, 100%):
   Subject a 133 px drop-down; Identified By two radios; Concept (Code) a
   265 px edit with a "…" prompt, not a drop-down; Target Value a 78 px
   operator drop-down and a 100 px value; "Perform Every:" a 62 px count, a
   100 px units drop-down and the word "Units". On the tab (`banded`) a
   hairline rule closes the Subject…Concept block and the Target Value row.
   The caption is "Perform Every" in that capture (the article's "Require
   Every" is an older build's); the anchors keep their old names. */
type QuantFields = Pick<GoalFields, 'subject' | 'identifiedBy' | 'concept' | 'operator' | 'target' | 'target2' | 'every' | 'units'>

/** the hairline MOIS draws between the tab's bands */
export const QUANT_RULE = { gridColumn: '1 / -1', height: 0, borderTop: '1px solid #d6d6d6', margin: '3px -10px' } as const

export function QuantitativeFields({ value, onChange, labelWidth = 98, banded }: {
  value: QuantFields
  onChange: (patch: Partial<QuantFields>) => void
  labelWidth?: number
  /** the Quantitative Settings tab rules its bands off; New Goal does not */
  banded?: boolean
}) {
  const [prompt, setPrompt] = useState(false)
  const grid = { padding: 0, gridTemplateColumns: `${labelWidth}px 1fr`, rowGap: 4 }
  const concepts = conceptOptions(value.subject, value.identifiedBy, value.concept).filter(Boolean)
  return (
    <div className="pb-form" style={grid}>
      <span className="pb-form__label">Subject:</span>
      <PBSelect
        options={['', ...GOAL_SUBJECTS]} w={133} value={value.subject}
        data-tutorial-id="host.mois.field.goal-subject"
        onChange={(e) => onChange({ subject: e.target.value, concept: '' })}
      />

      <span className="pb-form__label">Identified By:</span>
      <div className="pb-row" style={{ gap: 20 }}>
        <PBRadio name="goal-idby" label="Code" checked={value.identifiedBy === 'Code'} tutorialId="host.mois.field.goal-identified-by-code" onChange={() => onChange({ identifiedBy: 'Code', concept: '' })} />
        <PBRadio name="goal-idby" label="Concept" checked={value.identifiedBy === 'Concept'} tutorialId="host.mois.field.goal-identified-by-concept" onChange={() => onChange({ identifiedBy: 'Concept', concept: '' })} />
      </div>

      <span className="pb-form__label">{value.identifiedBy === 'Code' ? 'Code:' : 'Concept:'}</span>
      <PBLookup
        w={282} value={value.concept} name="goal-concept" fieldId="host.mois.field.goal-concept"
        onChange={(v) => onChange({ concept: v.toUpperCase() })}
        onDots={() => setPrompt(true)}
      />
      {banded && <span style={QUANT_RULE} />}

      <span className="pb-form__label">Target Value:</span>
      <div className="pb-row" style={{ gap: 4 }}>
        <PBSelect
          options={['', ...GOAL_OPERATORS].map((o) => ({ value: o, label: o === 'BETWEEN' ? 'Between' : o }))} w={78} value={value.operator}
          data-tutorial-id="host.mois.field.goal-target-operator"
          onChange={(e) => onChange({ operator: e.target.value })}
        />
        <PBInput w={100} value={value.target} data-tutorial-id="host.mois.field.goal-target-value" onChange={(e) => onChange({ target: e.target.value })} />
        {value.operator === 'BETWEEN' && <>
          <span>and</span>
          <PBInput w={100} value={value.target2} data-tutorial-id="host.mois.field.goal-target-value-2" onChange={(e) => onChange({ target2: e.target.value })} />
        </>}
      </div>
      {banded && <span style={QUANT_RULE} />}

      <span className="pb-form__label">Perform Every:</span>
      <div className="pb-row" style={{ gap: 4 }}>
        <PBInput w={62} value={value.every} data-tutorial-id="host.mois.field.goal-require-every" onChange={(e) => onChange({ every: e.target.value })} />
        <span style={{ width: 12 }} />
        <PBSelect options={['', ...GOAL_UNITS]} w={100} value={value.units} data-tutorial-id="host.mois.field.goal-require-every-units" onChange={(e) => onChange({ units: e.target.value })} />
        <span>Units</span>
      </div>
      {prompt && (
        <CodePrompt
          id="goal-concept-prompt" title={value.identifiedBy === 'Code' ? 'Code Lookup' : 'Concept Lookup'}
          rows={concepts.map((term, i) => ({ code: String(i + 1).padStart(3, '0'), term }))}
          onPick={(r) => onChange({ concept: r.term })} onClose={() => setPrompt(false)}
        />
      )}
    </div>
  )
}

/* --- New Goal ------------------------------------------------------------- */
const RULE = { borderTop: '1px solid #a0a0a0', boxShadow: 'inset 0 1px 0 #fff' }

export function NewGoalWindow({ close }: AreaWindowProps) {
  const p = usePatient()
  const [f, setF] = useState<GoalFields>({
    goal: '', start: MOIS_TODAY, end: '', phase: 'INITIATION', quantitative: false, subject: '', identifiedBy: 'Concept',
    concept: '', operator: '', target: '', target2: '', every: '', units: '', detail: '', expectedOutcome: '',
    commitment: '', confidence: '', importance: '', evaluationMethod: '', actualOutcome: '', sensitive: false,
  })
  const set = (patch: Partial<GoalFields>) => setF((x) => {
    const next = { ...x, ...patch }
    /* a coded quantitative goal writes its own description */
    if (next.quantitative && ('concept' in patch || 'operator' in patch || 'target' in patch || 'target2' in patch || 'quantitative' in patch)) {
      const auto = quantitativeDescription(next)
      if (auto) next.goal = auto
    }
    return next
  })
  useScreenReport({ dialog: 'new-goal', goalQuantitative: f.quantitative })
  const closeAndFile = () => {
    if (f.goal.trim()) addGoal(p.chart, { ...f, goal: f.goal.trim() })
    close()
  }

  return (
    <ModalWindow id="new-goal" title="New Goal" onClose={close} zIndex={80} windowStyle={{ width: 528, height: 446, maxHeight: 'calc(100% - 16px)' }}>
        <div style={{ background: '#dfe8f6', padding: '6px 8px', flex: 'none', borderBottom: '1px solid #a0a0a0' }}>
          <div className="pb-form pb-form--cols4" style={{ padding: 0, gridTemplateColumns: 'auto 1fr auto auto', rowGap: 4 }}>
            <span className="pb-form__label">Goal Type:</span>
            <PBCheckbox label="Quantitative Goal" checked={f.quantitative} tutorialId="host.mois.field.goal-quantitative" onChange={(v) => set({ quantitative: v })} />
            <span className="pb-form__label pb-form__label--right">Phase:</span>
            <PBSelect options={GOAL_PHASE_OPTIONS} w={112} value={f.phase} data-tutorial-id="host.mois.field.goal-phase" onChange={(e) => set({ phase: e.target.value })} />

            <span className="pb-form__label">Start Date:</span>
            <PBInput w={80} align="center" value={f.start} data-tutorial-id="host.mois.field.goal-start-date" onChange={(e) => set({ start: e.target.value })} />
            <span className="pb-form__label pb-form__label--right">End Date:</span>
            <PBInput w={80} align="center" value={f.end} data-tutorial-id="host.mois.field.goal-end-date" onChange={(e) => set({ end: e.target.value })} />
          </div>
        </div>

        <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: 'var(--pb-face)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 10px', minHeight: 116, flex: 'none' }}>
            <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '90px 1fr', marginBottom: 6 }}>
              <span className="pb-form__label">Goal:</span>
              <PBInput w="100%" value={f.goal} data-tutorial-id="host.mois.field.goal-description" onChange={(e) => set({ goal: e.target.value })} />
            </div>
            {f.quantitative && (
              <QuantitativeFields labelWidth={90} value={f} onChange={set} />
            )}
          </div>
          <div style={{ ...RULE, padding: '8px 10px', flex: 'none' }}>
            <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '90px 1fr', alignItems: 'start' }}>
              <span className="pb-form__label">Detail:</span>
              <PBTextArea rows={4} w={326} value={f.detail} data-tutorial-id="host.mois.field.goal-detail" onChange={(e) => set({ detail: e.target.value })} />
            </div>
          </div>
          <div style={{ ...RULE, padding: '8px 10px', flex: 'none' }}>
            <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '90px 1fr', alignItems: 'start' }}>
              <span className="pb-form__label" style={{ lineHeight: '14px' }}>Expected<br />Outcome:</span>
              <PBTextArea rows={4} w={326} value={f.expectedOutcome} data-tutorial-id="host.mois.field.goal-expected-outcome" onChange={(e) => set({ expectedOutcome: e.target.value })} />
            </div>
          </div>
        </div>

        <DialogFooter frame="pb" style={RULE}>
          <DialogButton id="new-goal-close" width={75} onClick={closeAndFile}>Close</DialogButton>
        </DialogFooter>
    </ModalWindow>
  )
}

/* --- what a goal is linked to --------------------------------------------- */
export type LinkedRow = {
  group: string
  object: GoalLinkObject
  id: string
  start: string
  end: string
  desc: string
  completed: boolean
  sensitive: boolean
  by: string
  when: string
}

const day = (v?: string) => (v ? v.split(' ')[0]!.replace(/\//g, '.') : '')

/** the folder a linked record's hyperlink opens */
export const FOLDER_OF: Record<GoalLinkObject, string> = { health_issue: 'conditions', risk: 'risks', need: 'needs', action: 'actions' }
const BAND: Record<GoalLinkObject, string> = { health_issue: 'HEALTH CONDITION', risk: 'RISK FOR CONDITION', need: 'NEED FOR CARE', action: 'PLANNED ACTIONS' }

/** every record of a kind the chart holds now: the export's, the session's, less deletions */
export function candidates(data: MoisChartExport | null, chart: string, object: GoalLinkObject): MoisRecord[] {
  const cp = carePlanRecords(chart)
  if (object === 'health_issue') return data?.health_issue ?? []
  if (object === 'risk') return mergedFolderRecords(cp, 'risks', data?.risk ?? [])
  if (object === 'need') return mergedFolderRecords(cp, 'needs', data?.need ?? [])
  return mergedFolderRecords(cp, 'actions', data?.action ?? [])
}

const idOf = (object: GoalLinkObject, r: MoisRecord) => r[`id_${object}`] ?? ''
const descOf = (r: MoisRecord) => r.str_problem_name ?? r.str_action ?? r.str_description ?? r.str_need ?? ''

export function toLinkedRow(object: GoalLinkObject, r: MoisRecord, by = '', when = ''): LinkedRow {
  return {
    group: BAND[object], object, id: idOf(object, r),
    start: day(r.dtm_start), end: day(r.dtm_end ?? r.dtm_resolve), desc: descOf(r),
    completed: r.str_completed === 'Y', sensitive: r.str_sensitive === 'Y', by, when,
  }
}

/** the records linked to a goal, by kind; `useCarePlanRecords` in the caller keeps it live */
export function linkedToGoal(data: MoisChartExport | null, chart: string, goalId: string | undefined, objects: GoalLinkObject[]): LinkedRow[] {
  if (!goalId) return []
  const cp = carePlanRecords(chart)
  return objects.flatMap((object) => candidates(data, chart, object).flatMap((r) => {
    const link = linkedGoalIds(data, cp, object, idOf(object, r)).find((l) => l.goalId === goalId)
    return link ? [toLinkedRow(object, r, link.by, link.when)] : []
  }))
}

/** how many goals an action is linked to (Delete Action is refused past one) */
export const goalCountOf = (data: MoisChartExport | null, chart: string, actionId: string) =>
  linkedGoalIds(data, carePlanRecords(chart), 'action', actionId).length

/* --- Link Health Issues / Link Action(s) ----------------------------------- */
function LinkPicker({ id, title, objects, goalId, close, prefix, columns }: {
  id: string
  title: string
  objects: GoalLinkObject[]
  goalId: string
  close: () => void
  prefix: string
  columns: 'issues' | 'actions'
}) {
  const p = usePatient()
  const data = useChartExport()
  const cp = useCarePlanRecords(p.chart)
  const rows = useMemo(() => {
    void cp
    const linked = new Set(linkedToGoal(data, p.chart, goalId, objects).map((r) => `${r.object}:${r.id}`))
    return objects.flatMap((o) => candidates(data, p.chart, o).map((r) => toLinkedRow(o, r)))
      .filter((r) => r.id && !linked.has(`${r.object}:${r.id}`))
  }, [cp, data, p.chart, goalId, objects])
  const tick = useTickSet()
  const [cur, setCur] = useState(0)
  useScreenReport({ dialog: id, rows: rows.length, picked: tick.size })
  const toggle = tick.flip
  const ok = () => {
    tick.ticked.forEach((i) => { const r = rows[i]; if (r) linkGoal(p.chart, r.object, r.id, goalId) })
    close()
  }
  return (
    <PickListWindow<LinkedRow>
      frame={(content, footer) => (
        <WorkspaceDialogFrame id={id} title={title} width={720} height={420} onClose={close} controls={false}>
          {content}
          {footer}
        </WorkspaceDialogFrame>
      )}
      gridBox={{ ...GRID_BOX, padding: 4 }}
      grid={{
        rows,
        current: cur,
        onCurrentChange: setCur,
        onActivate: (_r, i) => toggle(i),
        groupBy: objects.length > 1 ? (r) => r.group : undefined,
        rowTutorialId: (_r, i) => `host.mois.row.${prefix}-${i}`,
        columns: [
          { key: 'pick', header: 'Link', width: 40, align: 'center', render: (_r, i) => <PBCheckbox checked={tick.has(i)} tutorialId={`host.mois.field.link-${i}`} onChange={() => toggle(i)} /> },
          { key: 'start', header: columns === 'actions' ? 'Planned Start' : 'Start', width: 90, align: 'center' },
          { key: 'end', header: columns === 'actions' ? 'Planned End' : 'End', width: 90, align: 'center' },
          { key: 'desc', header: columns === 'actions' ? 'Action' : 'Description' },
          ...(columns === 'actions'
            ? [{ key: 'completed', header: 'Completed', width: 70, align: 'center' as const, render: (r: LinkedRow) => <PBCheckbox checked={r.completed} /> }]
            : [{ key: 'sensitive', header: 'Sensitive', width: 64, align: 'center' as const, render: (r: LinkedRow) => <PBCheckbox checked={r.sensitive} /> }]),
        ],
        empty: columns === 'actions' ? 'No other actions on file.' : 'No other health issues on file.',
      }}
      footer={(
        <PickButtons className="pb-row" style={{ justifyContent: 'center', gap: 12, padding: '8px 0', flex: 'none' }} size={SIZE.dialog(80)}
          buttons={[
            { label: 'Link', command: `${prefix}-ok`, isDefault: true, onClick: ok, disabled: !tick.size },
            { label: 'Cancel', command: `${prefix}-cancel`, onClick: close },
          ]} />
      )}
    />
  )
}

const OBJECTS_ISSUES: GoalLinkObject[] = ['health_issue', 'risk', 'need']
const OBJECTS_ACTIONS: GoalLinkObject[] = ['action']

function LinkHealthIssuesWindow({ args, close }: AreaWindowProps) {
  return <LinkPicker id="goal-link-health-issues" title="Link Health Issues" objects={OBJECTS_ISSUES} goalId={String(args.goalId ?? '')} close={close} prefix="link-issues" columns="issues" />
}

function LinkActionsWindow({ args, close }: AreaWindowProps) {
  return <LinkPicker id="goal-link-actions" title="Link Action(s)" objects={OBJECTS_ACTIONS} goalId={String(args.goalId ?? '')} close={close} prefix="link-actions" columns="actions" />
}

/* --- Action Detail --------------------------------------------------------- */
function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <><FormLabel flex={false} style={{ lineHeight: '19px' }}>{label}</FormLabel>{children}</>
}

function ActionDetailWindow({ args, close }: AreaWindowProps) {
  const p = usePatient()
  const data = useChartExport()
  const goalId = String(args.goalId ?? '')
  const actionId = typeof args.actionId === 'string' ? args.actionId : ''
  const existing = actionId ? candidates(data, p.chart, 'action').find((r) => r.id_action === actionId) : undefined
  const [f, setF] = useState(() => ({
    start: day(existing?.dtm_start) || (actionId ? '' : MOIS_TODAY),
    end: day(existing?.dtm_end),
    participants: existing?.str_participants ?? '',
    action: existing?.str_action ?? existing?.str_description ?? '',
    detail: existing?.str_comment ?? '',
    completed: existing?.str_completed === 'Y',
    completedDate: day(existing?.dtm_completed),
    outcome: existing?.str_outcome ?? '',
  }))
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }))
  useScreenReport({ dialog: 'goal-action-detail', record: actionId ? 'edit' : 'new' })
  const slash = (v: string) => v.replace(/\./g, '/')
  const save = () => {
    const record: MoisRecord = {
      ...existing,
      dtm_start: slash(f.start), dtm_end: slash(f.end), str_participants: f.participants,
      str_action: f.action, str_comment: f.detail, str_completed: f.completed ? 'Y' : 'N',
      dtm_completed: slash(f.completedDate), str_outcome: f.outcome, str_sensitive: existing?.str_sensitive ?? 'N',
    }
    if (actionId) saveFolderRecord(p.chart, 'actions', { ...record, id_action: actionId })
    else {
      const id = addFolderRecord(p.chart, 'actions', { ...record, stp_user_create: SESSION_USER })
      if (goalId) linkGoal(p.chart, 'action', id, goalId)
    }
    close()
  }
  return (
    <WorkspaceDialogFrame id="goal-action-detail" title="Action Detail" width={560} height={420} onClose={close} controls={false}>
      <div className="pb-form" style={{ gridTemplateColumns: '104px 1fr 104px 1fr', alignItems: 'start', padding: '10px 12px', rowGap: 6, flex: '1 1 auto' }}>
        <Row label="Planned Start:"><PBInput w={90} align="center" value={f.start} data-tutorial-id="host.mois.field.action-planned-start" onChange={(e) => set({ start: e.target.value })} /></Row>
        <Row label="Planned End:"><PBInput w={90} align="center" value={f.end} data-tutorial-id="host.mois.field.action-planned-end" onChange={(e) => set({ end: e.target.value })} /></Row>
        <Row label="Participant(s):"><span style={{ gridColumn: 'span 3' }}><PBInput w="100%" value={f.participants} data-tutorial-id="host.mois.field.action-participants" onChange={(e) => set({ participants: e.target.value })} /></span></Row>
        <Row label="Action:"><span style={{ gridColumn: 'span 3' }}><PBInput w="100%" value={f.action} data-tutorial-id="host.mois.field.action-action" onChange={(e) => set({ action: e.target.value })} /></span></Row>
        <Row label="Detail:"><span style={{ gridColumn: 'span 3' }}><PBTextArea rows={4} w="100%" value={f.detail} data-tutorial-id="host.mois.field.action-detail" onChange={(e) => set({ detail: e.target.value })} /></span></Row>
        <Row label="Completed:">
          <PBCheckbox label="Yes" checked={f.completed} tutorialId="host.mois.field.action-completed" onChange={(v) => set({ completed: v, completedDate: v ? (f.completedDate || MOIS_TODAY) : '' })} />
        </Row>
        <Row label="Completed Date:"><PBInput w={90} align="center" value={f.completedDate} data-tutorial-id="host.mois.field.action-completed-date" onChange={(e) => set({ completedDate: e.target.value })} /></Row>
        <Row label="Outcome:"><span style={{ gridColumn: 'span 3' }}><PBTextArea rows={4} w="100%" value={f.outcome} data-tutorial-id="host.mois.field.action-outcome" onChange={(e) => set({ outcome: e.target.value })} /></span></Row>
      </div>
      <DialogFooter gap={12} padding="8px 0">
        <DialogButton id="action-detail-save" width={80} isDefault onClick={save} disabled={!f.action.trim()}>Save</DialogButton>
        <DialogButton id="action-detail-cancel" width={80} onClick={close}>Cancel</DialogButton>
      </DialogFooter>
    </WorkspaceDialogFrame>
  )
}

/* --- the Linked tabs' commands, for GoalsView ------------------------------ */
export function unlinkRow(chart: string, row: LinkedRow, goalId: string) {
  unlinkGoal(chart, row.object, row.id, goalId)
}

export function deleteActionRow(chart: string, row: LinkedRow, goalId: string) {
  unlinkGoal(chart, 'action', row.id, goalId)
  deleteFolderRecord(chart, 'actions', row.id)
}

export const linkedRowAnchor = (row: LinkedRow, i: number) => `host.mois.row.goal-linked-${pbSlug(row.object)}-${i}`

registerAreaWindow('new-goal', NewGoalWindow)
registerAreaWindow('goal-link-health-issues', LinkHealthIssuesWindow)
registerAreaWindow('goal-link-actions', LinkActionsWindow)
registerAreaWindow('goal-action-detail', ActionDetailWindow)
