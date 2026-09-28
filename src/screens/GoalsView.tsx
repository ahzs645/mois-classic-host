import { useEffect, useMemo, useRef, useState } from 'react'
import { useChartExport, useNodeRecords } from '../data/chart-records'
import type { MoisRecord } from '../data/charts'
import { useCarePlanRecords } from '../data/carePlanRecords'
import { stamp } from '../data/charts/detail'
import {
  deleteGoal, goalFieldsOf, updateGoal, useGoalRecords, type GoalFields,
} from '../data/goalRecords'
import { goalLinkedTabs } from '../data/mois'
import { usePatient } from '../data/patient-context'
import { openFrameNode } from '../host/frame-nav'
import { useScreenReport } from '../host/screen-state'
import {
  PBCheckbox,
  PBCommandRow, PBDataWindow,
  PBIdentityStrip,
  PBInput, PBLookup, PBMessageBox,
  PBSection, PBSelect,
  PBSlider,
  PBTextArea, PBViewHeader, pbSlug, usePBInstrumentation, type PBColumn,
} from '../pb'
import { useOpenWindow } from './areaWindowRegistry'
import {
  FOLDER_OF, GOAL_PHASES, QuantitativeFields, deleteActionRow, goalCountOf, linkedRowAnchor, linkedToGoal,
  unlinkRow, type LinkedRow,
} from './GoalWindows'

/* ============================================================================
   Patient Chart ▸ Care Plan ▸ Goals (art. 303498).

   The folder the user's capture shows (reference/goal-standard-populated.png,
   v02.31.23): New Record · Quick Entry · Delete Record · Save · Undo ·
   Refresh · Attachment; a Search For field; the grid Start · End · Goal ·
   Phase · Quantitative Goal · Commit Level · Import Level · S · 📎; five tabs
   (Detail, Quantitative Settings, Evaluation, Linked Health Issue(s), Linked
   Action(s)); and the Created stamp under them.

   Rows are the chart export's goals with this session's edits, plus the goals
   added this session (New Record, Quick Entry) listed first — all through
   data/goalRecords.ts. Every field on the tabs writes back there, so a goal
   keeps its edits when the folder is left and re-entered.

     Quantitative Settings is greyed unless the goal is quantitative; the
       grid's Quantitative Goal box sets it. Its labels are the field audit's
       (`Subject`, `Identified By`, `Concept`, `Target Value` —
       reference/field-audit.md tdt_goal); the article calls Subject
       "Category". `Require Every` is the article's (not audited).
     Evaluation: Evaluation Method, Actual Outcome.
     Linked Health Issue(s): Link Health Issue(s) / Unlink Health Issue.
     Linked Action(s): New Action / Delete Action / Link Action(s) / Unlink
       Action / Edit Action. A description is a hyperlink to the record's
       folder (host/frame-nav.ts). Delete Action is refused while the action
       is linked to more than one goal (the article's rule).
     Search For filters on Goal; its "…" (or F4) adds the Advanced Search's
       Phase (INFERRED layout — a Phase drop-down under the field).

   Quick Entry is deliberately inert here: the Quick Entry windows own it.

   Anchors: rows host.mois.row.goal-{n}; the grid's tick boxes
   host.mois.field.goal-quantitative-{n} / goal-sensitive-{n}; tabs
   host.mois.tab.{detail, quantitative-settings, evaluation,
   linked-health-issue-s, linked-action-s}; fields host.mois.field.goal-*
   (goal-tab-description, goal-tab-detail, goal-tab-expected-outcome,
   goal-commitment/confidence/importance, goal-evaluation-method,
   goal-actual-outcome, and the Quantitative block's goal-subject …);
   linked rows host.mois.row.goal-linked-{object}-{n}; linked hyperlinks
   host.mois.link.goal-linked-{n}; commands host.mois.command.{new-record,
   delete-record, save, refresh, attachment, link-health-issue-s,
   unlink-health-issue, new-action, delete-action, link-action-s,
   unlink-action, edit-action}; the delete prompts'
   host.mois.command.{goal-delete-yes, goal-delete-no, goal-message-ok}.
   Reported: host.screen.{rows, row, saved, goalLinks}.
   ========================================================================= */

type GoalRow = {
  id: string
  fields: GoalFields
  record?: MoisRecord
  created: string
}

const TABS = ['Detail', 'Quantitative Settings', 'Evaluation', 'Linked Health Issue(s)', 'Linked Action(s)'] as const
type Tab = typeof TABS[number]

export function GoalsView({ onNew }: { onNew?: () => void }) {
  const patient = usePatient()
  const data = useChartExport()
  const records = useNodeRecords('goals')
  const store = useGoalRecords(patient.chart)
  const cp = useCarePlanRecords(patient.chart)
  const openWindow = useOpenWindow()
  const host = usePBInstrumentation()

  const all = useMemo<GoalRow[]>(() => [
    ...store.goals.map((g) => ({ id: g.id, fields: g, created: `${g.createdAt}  ${g.createdBy}` })),
    ...records
      .filter((r) => r.id_goal && !store.deletedGoals.includes(r.id_goal))
      .map((r) => ({ id: r.id_goal!, fields: { ...goalFieldsOf(r), ...store.edits[r.id_goal!] }, record: r, created: stamp(r) })),
  ], [records, store])

  const [search, setSearch] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const [phase, setPhase] = useState('')
  const rows = useMemo(() => all.filter((g) =>
    (!search.trim() || g.fields.goal.toLowerCase().includes(search.trim().toLowerCase()))
    && (!phase || g.fields.phase === phase)), [all, search, phase])

  const [tab, setTab] = useState<Tab>('Detail')
  const [cur, setCur] = useState(0)
  const [saved, setSaved] = useState(false)
  const [prompt, setPrompt] = useState<null | 'delete-goal' | 'action-multi' | 'delete-action'>(null)
  const [linkCur, setLinkCur] = useState(0)

  /* a goal added from New Goal or Quick Entry lands first and is made current */
  const seen = useRef(store.goals.length)
  useEffect(() => {
    if (store.goals.length > seen.current) { setCur(0); setSaved(false) }
    seen.current = store.goals.length
  }, [store.goals.length])

  const row = rows[Math.min(cur, Math.max(0, rows.length - 1))]
  const goalId = row?.id
  const quant = !!row?.fields.quantitative
  const activeTab: Tab = tab === 'Quantitative Settings' && !quant ? 'Detail' : tab
  const set = (patch: Partial<GoalFields>) => { if (goalId) { updateGoal(patient.chart, goalId, patch); setSaved(false) } }

  const issueRows = useMemo(() => { void cp; return linkedToGoal(data, patient.chart, goalId, ['health_issue', 'risk', 'need']) }, [cp, data, patient.chart, goalId])
  const actionRows = useMemo(() => { void cp; return linkedToGoal(data, patient.chart, goalId, ['action']) }, [cp, data, patient.chart, goalId])
  const linkedRows = activeTab === 'Linked Action(s)' ? actionRows : issueRows
  const linkRow = linkedRows[Math.min(linkCur, Math.max(0, linkedRows.length - 1))]
  useEffect(() => { setLinkCur(0) }, [goalId, activeTab])

  useScreenReport({ rows: rows.length, row: goalId ? pbSlug(row!.fields.goal.slice(0, 32)) || null : null, saved, goalLinks: issueRows.length + actionRows.length })

  const newRecord = () => { if (!openWindow('new-goal')) onNew?.() }

  const columns: PBColumn<GoalRow>[] = [
    { key: 'start', header: 'Start', width: 76, align: 'center', render: (r) => r.fields.start },
    { key: 'end', header: 'End', width: 76, align: 'center', render: (r) => r.fields.end },
    { key: 'goal', header: 'Goal', render: (r) => r.fields.goal },
    { key: 'phase', header: 'Phase', width: 118, align: 'center', render: (r) => r.fields.phase },
    {
      key: 'quant', header: <>Quantitative<br />Goal</>, width: 74, align: 'center',
      render: (r, i) => <PBCheckbox checked={r.fields.quantitative} tutorialId={`host.mois.field.goal-quantitative-${i}`} onChange={(v) => { updateGoal(patient.chart, r.id, { quantitative: v }); setSaved(false) }} />,
    },
    { key: 'commit', header: <>Commit<br />Level</>, width: 54, align: 'center', render: (r) => r.fields.commitment },
    { key: 'importance', header: <>Import<br />Level</>, width: 54, align: 'center', render: (r) => r.fields.importance },
    { key: 's', header: 'S', width: 24, align: 'center', render: (r, i) => <PBCheckbox checked={r.fields.sensitive} tutorialId={`host.mois.field.goal-sensitive-${i}`} onChange={(v) => { updateGoal(patient.chart, r.id, { sensitive: v }); setSaved(false) }} /> },
    { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center', render: (r) => r.record?.num_attachments && r.record.num_attachments !== '0' ? r.record.num_attachments : '-' },
  ]

  /* the Linked tabs' command strips */
  const linkedCommand = (label: string) => {
    if (!goalId) return
    switch (label) {
      case 'Link Health Issue(s)': openWindow('goal-link-health-issues', { goalId }); return
      case 'Unlink Health Issue': if (linkRow) unlinkRow(patient.chart, linkRow, goalId); return
      case 'New Action': openWindow('goal-action-detail', { goalId }); return
      case 'Link Action(s)': openWindow('goal-link-actions', { goalId }); return
      case 'Unlink Action': if (linkRow) unlinkRow(patient.chart, linkRow, goalId); return
      case 'Edit Action': if (linkRow) openWindow('goal-action-detail', { goalId, actionId: linkRow.id }); return
      case 'Delete Action':
        if (!linkRow) return
        setPrompt(goalCountOf(data, patient.chart, linkRow.id) > 1 ? 'action-multi' : 'delete-action')
    }
  }

  return (
    <>
      <PBViewHeader title="Goals" />
      <PBCommandRow
        commands={[
          { label: 'New Record', onClick: newRecord },
          /* the Quick Entry windows own this button */
          /* art. 3071982 "Using Quick Entry in Goals": Quick Entry - Chart Goal
             (screens/QuickEntryWindows.tsx); Continue files the templated goal
             through addGoal, listed first and current */
          { label: 'Quick Entry', onClick: () => openWindow('quick-entry-chart', { group: 'Goal' }) },
          { label: 'Delete Record', disabled: !row, onClick: () => setPrompt('delete-goal') },
          { label: 'Save', onClick: () => setSaved(true) },
          { label: 'Undo' },
          { label: 'Refresh', onClick: () => { setSearch(''); setPhase(''); setCur(0) } },
          { label: 'Attachment', disabled: !row, onClick: () => { openWindow('add-attachment') } },
        ]}
      />

      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first },
          { label: 'MIDDLE:', value: patient.middle },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: patient.dob },
        ]}
        encounter="NO ENCOUNTER"
      />

      <div className="pb-row" style={{ padding: '2px 8px' }}>
        <span>Search For:</span>
        <PBLookup
          w="100%" value={search} name="goal-search" fieldId="host.mois.field.goal-search"
          onChange={(v) => { setSearch(v); setCur(0) }}
          onDots={() => setAdvanced((a) => !a)}
          onKeyDown={(e) => { if (e.key === 'F4') { e.preventDefault(); setAdvanced((a) => !a) } }}
        />
      </div>
      {advanced && (
        <div className="pb-row" style={{ padding: '0 8px 2px' }} data-tutorial-id="host.mois.group.goal-advanced-search">
          <span className="pb-form__label">Phase:</span>
          <PBSelect options={GOAL_PHASES} w={140} value={phase} data-tutorial-id="host.mois.field.goal-search-phase" onChange={(e) => { setPhase(e.target.value); setCur(0) }} />
        </div>
      )}

      <div style={{ height: 212, display: 'flex', padding: '0 3px' }}>
        <PBDataWindow
          columns={columns} rows={rows} current={cur} onCurrentChange={setCur}
          rowTutorialId={(_r, i) => `host.mois.row.goal-${i}`}
          empty="No goals on file."
        />
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '4px 3px 3px' }}>
        <div className="pb-tabs__strip pb-tabs__strip--justified">
          {TABS.map((t) => {
            /* MOIS greys this tab out unless the row is a quantitative goal */
            const off = t === 'Quantitative Settings' && !quant
            return (
              <button
                key={t}
                type="button"
                className={`pb-tabs__tab${t === activeTab ? ' is-active' : ''}`}
                disabled={off}
                data-tutorial-id={host?.anchor('tab', pbSlug(t))}
                onClick={() => { if (off) return; host?.report('selectTab', { tab: pbSlug(t) }); setTab(t) }}
              >
                {t}
              </button>
            )
          })}
        </div>
        <div key={goalId ?? 'none'} className="pb-tabs__page">
          {row && activeTab === 'Quantitative Settings' && <QuantitativePage fields={row.fields} set={set} />}
          {row && activeTab === 'Detail' && <DetailPage fields={row.fields} set={set} />}
          {row && activeTab === 'Evaluation' && <EvaluationPage fields={row.fields} set={set} />}
          {row && (activeTab === 'Linked Health Issue(s)' || activeTab === 'Linked Action(s)') && (
            <LinkedPage
              title={activeTab}
              rows={linkedRows}
              current={linkCur}
              onCurrent={setLinkCur}
              onCommand={linkedCommand}
            />
          )}
        </div>
      </div>

      <div className="pb-row" style={{ padding: '2px 8px 4px', borderTop: '1px solid #d6d6d6', gap: 0 }}>
        <span>Created: {row?.created ?? ''}</span>
        <span className="pb-row__spacer" />
        {row?.record?.id_encounter && <button className="pb-link">ENC# {row.record.id_encounter}</button>}
      </div>

      {prompt === 'delete-goal' && row && (
        <PBMessageBox
          title="Delete Record" icon="question"
          buttons={[
            { label: 'Yes', value: 'yes', default: true, tutorialId: 'host.mois.command.goal-delete-yes' },
            { label: 'No', value: 'no', tutorialId: 'host.mois.command.goal-delete-no' },
          ]}
          onClose={(v) => { if (v === 'yes') { deleteGoal(patient.chart, row.id); setCur(0) } setPrompt(null) }}
        >
          Are you sure you want to delete this goal?
        </PBMessageBox>
      )}
      {prompt === 'delete-action' && linkRow && goalId && (
        <PBMessageBox
          title="Delete Action" icon="question"
          buttons={[
            { label: 'Yes', value: 'yes', default: true, tutorialId: 'host.mois.command.goal-delete-yes' },
            { label: 'No', value: 'no', tutorialId: 'host.mois.command.goal-delete-no' },
          ]}
          onClose={(v) => { if (v === 'yes') deleteActionRow(patient.chart, linkRow, goalId); setPrompt(null) }}
        >
          This will remove the action from this goal AND from the patient's action list. Continue?
        </PBMessageBox>
      )}
      {prompt === 'action-multi' && (
        <PBMessageBox
          title="Delete Action" icon="warn"
          buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.goal-message-ok' }]}
          onClose={() => setPrompt(null)}
        >
          This action is linked to more than one goal. Unlink it from the other goals before deleting it.
        </PBMessageBox>
      )}
    </>
  )
}

type PageProps = { fields: GoalFields; set: (patch: Partial<GoalFields>) => void }

/* The quantitative page is a stack of rule-separated sections, not a single
   grid — each band holds one logical setting. */
function QuantitativePage({ fields, set }: PageProps) {
  return (
    <div>
      <PBSection>
        <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '100px 1fr' }}>
          <span className="pb-form__label">Goal:</span>
          <PBInput w="100%" value={fields.goal} data-tutorial-id="host.mois.field.goal-tab-description" onChange={(e) => set({ goal: e.target.value })} />
        </div>
      </PBSection>
      <PBSection>
        <QuantitativeFields value={fields} onChange={set} />
      </PBSection>
    </div>
  )
}

function DetailPage({ fields, set }: PageProps) {
  const BARS = [
    ['Patient Commitment Level', 'Not Committed', 'Very Committed', 'commitment'],
    ['Patient Confidence Level', 'Not Confident', 'Very Confident', 'confidence'],
    ['Provider Importance Level', 'Not Important', 'Very Important', 'importance'],
  ] as const

  return (
    <div style={{ display: 'flex', gap: 14, padding: '8px 10px', alignItems: 'flex-start' }}>
      <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '70px 1fr', flex: '1 1 auto', minWidth: 0, alignItems: 'start' }}>
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Goal:</span>
        <PBInput w="100%" value={fields.goal} data-tutorial-id="host.mois.field.goal-tab-description" onChange={(e) => set({ goal: e.target.value })} />
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Detail:</span>
        <PBTextArea rows={5} w="100%" value={fields.detail} data-tutorial-id="host.mois.field.goal-tab-detail" onChange={(e) => set({ detail: e.target.value })} />
        <span className="pb-form__label" style={{ lineHeight: '14px' }}>Expected<br />Outcome:</span>
        <PBTextArea rows={5} w="100%" value={fields.expectedOutcome} data-tutorial-id="host.mois.field.goal-tab-expected-outcome" onChange={(e) => set({ expectedOutcome: e.target.value })} />
      </div>

      <div style={{ width: 340, flex: 'none' }}>
        {BARS.map(([title, low, high, key]) => (
          <div key={key} style={{ marginBottom: 10 }} data-tutorial-id={`host.mois.field.goal-${key}`}>
            <div style={{ fontWeight: 700, marginBottom: 1 }}>{title}:</div>
            <div className="pb-row" style={{ gap: 0 }}>
              <span style={{ color: 'var(--pb-text-dim)' }}>{low}</span>
              <span className="pb-row__spacer" />
              <span style={{ color: 'var(--pb-text-dim)' }}>{high}</span>
              <span style={{ width: 12 }} />
              <span>Value</span>
            </div>
            <div className="pb-row">
              {/* the slide is a picture of the value: moving it sets the value */}
              <PBSlider
                value={fields[key] === '' ? 0 : Number(fields[key])}
                min={0}
                max={10}
                onChange={(v) => set({ [key]: v ? String(v) : '' })}
                style={{ flex: '1 1 auto' }}
              />
              <PBInput
                w={40} align="center" value={fields[key]}
                data-tutorial-id={`host.mois.field.goal-${key}-value`}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 2)
                  set({ [key]: v === '' ? '' : String(Math.min(10, Math.max(1, Number(v)))) })
                }}
              />
              <span>(/10)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* art. 303498 Evaluation: "how the goal reaching process is evaluated" —
   Evaluation Method, Actual Outcome (field audit: the same two captions) */
function EvaluationPage({ fields, set }: PageProps) {
  return (
    <div className="pb-form" style={{ gridTemplateColumns: '110px 1fr', alignItems: 'start', padding: '8px 10px', rowGap: 8 }}>
      <span className="pb-form__label" style={{ lineHeight: '14px' }}>Evaluation<br />Method:</span>
      <PBTextArea rows={5} w="100%" value={fields.evaluationMethod} data-tutorial-id="host.mois.field.goal-evaluation-method" onChange={(e) => set({ evaluationMethod: e.target.value })} />
      <span className="pb-form__label" style={{ lineHeight: '14px' }}>Actual<br />Outcome:</span>
      <PBTextArea rows={5} w="100%" value={fields.actualOutcome} data-tutorial-id="host.mois.field.goal-actual-outcome" onChange={(e) => set({ actualOutcome: e.target.value })} />
    </div>
  )
}

function LinkedPage({ title, rows, current, onCurrent, onCommand }: {
  title: keyof typeof goalLinkedTabs
  rows: LinkedRow[]
  current: number
  onCurrent: (i: number) => void
  onCommand: (label: string) => void
}) {
  const cfg = goalLinkedTabs[title]
  const host = usePBInstrumentation()
  const needsRow = (c: string) => c.startsWith('Unlink') || c === 'Delete Action' || c === 'Edit Action'
  return (
    <>
      <div className="pb-cmdrow" style={{ padding: 2 }}>
        {cfg.commands.map((c) => (
          <button
            key={c}
            type="button"
            className="pb-cmdrow__btn"
            style={{ minWidth: 110 }}
            disabled={needsRow(c) && !rows.length}
            data-tutorial-id={host?.anchor('command', pbSlug(c))}
            onClick={() => { host?.report('command', { command: pbSlug(c) }); onCommand(c) }}
          >
            {c}
          </button>
        ))}
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          flush
          rows={rows}
          current={current}
          onCurrentChange={onCurrent}
          groupBy={(r) => r.group}
          rowTutorialId={linkedRowAnchor}
          columns={[
            { key: 'start', header: 'Start', width: 84, align: 'center' },
            { key: 'end', header: 'End', width: 76, align: 'center' },
            {
              key: 'desc', header: 'Description', width: 260,
              /* a hyperlink to the record in its own folder */
              render: (r, i) => (r.desc ? (
                <button
                  type="button"
                  className="pb-link"
                  data-tutorial-id={`host.mois.link.goal-linked-${i}`}
                  onClick={(e) => { e.stopPropagation(); host?.report('link', { link: `goal-linked-${pbSlug(r.object)}` }); openFrameNode(FOLDER_OF[r.object], r.id) }}
                >
                  {r.desc}
                </button>
              ) : ''),
            },
            ...cfg.flags.map((f) => ({
              key: f.key,
              header: f.header,
              width: f.width,
              align: 'center' as const,
              render: (r: LinkedRow) => <PBCheckbox checked={f.key === 'completed' ? r.completed : r.sensitive} />,
            })),
            { key: 'by', header: 'Linked By', width: 130 },
            { key: 'when', header: 'Linked Date', width: 140 },
          ]}
          empty="Nothing linked."
        />
      </div>
    </>
  )
}
