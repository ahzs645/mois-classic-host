import { useCallback, useMemo, useState } from 'react'
import { useChartExport, useNodeRecords } from '../data/chart-records'
import type { MoisRecord } from '../data/charts'
import { stamp } from '../data/charts/detail'
import { rowsFromExport } from '../data/charts/to-rows'
import { linkedGoalIds, unlinkGoal, useCarePlanRecords, type GoalLinkObject } from '../data/carePlanRecords'
import { carePlanScreens, type CarePlanKey } from '../data/mois'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import {
  PBBand, PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBDropField, PBIdentityStrip, PBInput, PBLookup,
  PBSlider, PBTextArea, PBViewHeader, pbSlug, usePBInstrumentation, type PBColumn, type PBCommand,
} from '../pb'
import { useOpenWindow } from './areaWindowRegistry'
import { useChartGoals } from './CarePlanRecordWindows'
import { dot, editableColumns, searchView, slash, useCarePlanFolder, type CellEdit } from './carePlanFolder'
import { SearchForBand, useFolderSearch, type SearchField } from './SearchForBand'
import { UniversalSearchDialog } from './CodeLookupDialogs'
import { DesktopLayer } from './StageWindow'

/* Needs for Care, Planned Actions, Barriers to Care, Risks for Conditions and
   Conditions are all the same PowerBuilder window with a different DataWindow
   bound to it: identity strip, search, a list, then a Detail tab beside one or
   more read-only "Linked X" tabs.

   The Detail *page* is not shared. The field audit captures five different
   panes behind the one tab, so the pane is keyed off the screen here rather
   than assembled from `carePlanScreens`:

     needs       MATRIX-R0869-need-description
     risks       MATRIX-R0847-rank
     conditions  MATRIX-R0830-severity
     actions     MATRIX-R0970-action
     barriers    MATRIX-R0993-barrier-to-care

   Routing (host/MoisClassicShell.tsx `routeNode`): reportScreens is checked
   before CARE_PLAN, so Conditions and Barriers to Care land on
   ClinicalReportView; this window is what Planned Actions, Risks for
   Conditions and Needs for Care show. The conditions / barriers branches
   below stay for the frame's direct `CarePlanView screen=…` uses.

   Entry (art. 303511 Planned Actions, 303447 Risks for Conditions and Needs
   for Care): New Record, Delete Record, Save, Undo and Refresh work through
   screens/carePlanFolder.tsx; the current row's grid cells and the Detail
   pane are editable, the risk scale is a working slider (1 low – 10 high,
   art. 303447 "The value can be modified by moving the slider"), and saved
   records live in data/carePlanRecords.ts. Search For is the chart's shared
   band (SearchForBand.tsx) over each folder's default field. Planned
   Actions' Linked Goals tab links and unlinks Goals (`Link Goal...` opens the `link-goal` window,
   screens/CarePlanRecordWindows.tsx); on the Health Issue folders the tab is
   "Linked Goals - Read Only" (303447 `fdaeb59f…png`).

   PROVENANCE: 303447 `1df53843…png` (Risk for Condition: Risk Description
   painted, Risk Severity slider with Value (/10), Comment), `bcfa0a6a…png`
   (Need for Care: Need Desc., Participants, Risk Rating, Comment),
   `fdaeb59f…png` (Linked Goals - Read Only band and grid).
   INFERRED: the Link Goal... / Unlink buttons on Planned Actions' Linked
   Goals band (the article says only that an action "can be linked to more
   than one goal"), and editing grid cells in place.                        */

type Row = Record<string, any>

/** which goal_link object a folder's records are */
const LINK_OBJECT: Partial<Record<CarePlanKey, GoalLinkObject>> = {
  conditions: 'health_issue', risks: 'risk', needs: 'need', actions: 'action',
}

/** the editable cells of the current row, per folder */
const CELLS: Partial<Record<CarePlanKey, Record<string, CellEdit>>> = {
  actions: {
    start: { kind: 'date', field: 'dtm_start' },
    end: { kind: 'date', field: 'dtm_end' },
    desc: { kind: 'text', field: 'str_action' },
    participants: { kind: 'text', field: 'str_participants' },
    /* art. 303511: "Checking the box will update the Completed Date.
       Unchecking the box will clear the Completed Date." */
    completed: { kind: 'check', field: 'str_completed', onToggle: (on) => ({ dtm_completed: on ? slash(MOIS_TODAY) : '' }) },
    compdate: { kind: 'date', field: 'dtm_completed' },
    s: { kind: 'check', field: 'str_sensitive' },
  },
  risks: {
    start: { kind: 'date', field: 'dtm_start' },
    end: { kind: 'date', field: 'dtm_end' },
    desc: { kind: 'text', field: 'str_description' },
    rank: { kind: 'text', field: 'num_rank' },
    source: { kind: 'text', field: 'str_source' },
    s: { kind: 'check', field: 'str_sensitive' },
    neg: { kind: 'check', field: 'str_negation' },
  },
  needs: {
    start: { kind: 'date', field: 'dtm_start' },
    end: { kind: 'date', field: 'dtm_end' },
    desc: { kind: 'text', field: 'str_description' },
    participants: { kind: 'text', field: 'str_participants' },
    s: { kind: 'check', field: 'str_sensitive' },
  },
}

/** Search For's fields (SearchForBand.tsx), the default first: 303511
    Action + Participant; 303447 Risks Description + Code, Source; Needs
    Need + Participant(s) */
const SEARCH: Partial<Record<CarePlanKey, SearchField[]>> = {
  actions: [{ key: 'desc', label: 'Action', isDefault: true }, { key: 'participants', label: 'Participant' }],
  risks: [{ key: 'desc', label: 'Description', isDefault: true }, { key: 'code', label: 'Code' }, { key: 'source', label: 'Source' }],
  needs: [{ key: 'desc', label: 'Need', isDefault: true }, { key: 'participants', label: 'Participant(s)' }],
}
const NO_FIELDS: SearchField[] = [{ key: 'desc', label: 'Description', isDefault: true }]

type Edit = (field: string, value: string, more?: MoisRecord) => void

export function CarePlanView({ screen }: { screen: CarePlanKey; onNew?: () => void }) {
  const patient = usePatient()
  const cfg = carePlanScreens[screen]
  const [tab, setTab] = useState<string>(cfg.tabs[0])
  const data = useChartExport()
  const exported = useNodeRecords(screen)
  const store = useCarePlanRecords(patient.chart)
  const blank = useCallback((): MoisRecord => (screen === 'actions' ? { str_completed: 'N' } : screen === 'risks' ? { str_negation: 'N' } : {}), [screen])
  /* Conditions never reaches this window (see Routing above); its key only
     has to be a folder the store knows */
  const folder = useCarePlanFolder(screen === 'conditions' ? 'risks' : screen, exported, { blank })
  const { list, cur, setCur, record, edit } = folder
  const rows = useMemo(() => rowsFromExport(screen, list).map((r, i) => ({ ...r, code: list[i]?.str_code ?? '' })), [screen, list])
  const search = useFolderSearch(cfg.title, SEARCH[screen] ?? NO_FIELDS)
  const view = searchView(rows, search.test, cur, setCur)
  const object = LINK_OBJECT[screen]
  const idKey = object ? `id_${object}` : ''
  const goals = useChartGoals()
  const links = object ? linkedGoalIds(data, store, object, record?.[idKey]) : []
  const linked = links.flatMap((l) => {
    const goal = goals.find((g) => g.id === l.goalId)
    return goal ? [{ group: 'GOALS', goalId: l.goalId, start: goal.start, end: goal.end, desc: goal.desc, phase: goal.phase, s: goal.s, by: l.by, when: l.when }] : []
  })
  const [lookup, setLookup] = useState(false)
  useScreenReport(lookup ? { dialog: 'universal-search' } : {})
  const host = usePBInstrumentation()

  /* each screen carries its own DataWindow, not a shared one */
  const base: PBColumn<Row>[] = cfg.columns.map((c) => ({
    key: c.key,
    header: c.header,
    width: c.width,
    align: c.align,
    dots: c.dots,
    render: c.check ? (r) => <PBCheckbox checked={r[c.key] === '✓' || r[c.key] === 'Y'} /> : undefined,
  }))
  const columns = editableColumns(screen, base, CELLS[screen] ?? {}, { cur: view.editRow, record, edit }).map((c) => (
    /* Risk Code/Description's "…": the Universal Search Window, as on
       Conditions' Problem Name */
    c.dots && screen === 'risks'
      ? {
        ...c,
        render: (_r: Row, i: number) => (i === view.editRow && record
          ? (
            <button
              type="button" className="pb-dw__dots"
              data-tutorial-id={host?.anchor('lookup', 'risk-code')}
              onClick={() => { host?.report('lookup', { field: 'risk-code' }); setLookup(true) }}
            >…</button>
          )
          : '…'),
      }
      : c
  ))

  const commands: PBCommand[] = folder.commands([
    { label: 'New Record' }, { label: 'Delete Record' }, { label: 'Save' },
    { label: 'Undo' }, { label: 'Refresh' }, { label: 'Attachment' },
    ...(screen === 'conditions' ? [{ label: 'Review' }, { label: 'No Known', width: 80 }] : []),
  ])

  return (
    <>
      <PBViewHeader title={cfg.title} right={<ChartHeaderIdentity />} />
      <PBCommandRow commands={commands} />

      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first },
          { label: 'MIDDLE:', value: patient.middle },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: patient.dob },
        ]}
        encounter="NO ENCOUNTER"
      />

      <SearchForBand context={cfg.title} fields={SEARCH[screen] ?? NO_FIELDS} value={search.text} onChange={search.setText} />



      <div style={{ height: 260, flex: 'none', display: 'flex', padding: '0 3px' }}>
        <PBDataWindow
          columns={columns} rows={view.rows} current={view.current} onCurrentChange={view.onCurrentChange} empty=" "
          rowTutorialId={(_r, i) => (i === view.editRow ? `host.mois.row.${screen}-current` : undefined)}
        />
      </div>

      {/* tab strip is rendered by hand: MOIS puts these tabs hard against the
          left edge with no strip rule under the inactive ones */}
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '4px 3px 3px' }}>
        <div className="pb-tabs__strip pb-tabs__strip--compact" style={{ paddingLeft: 4 }}>
          {cfg.tabs.map((t) => (
            <button
              key={t}
              className={`pb-tabs__tab${t === tab ? ' is-active' : ''}`}
              style={{ minWidth: 86 }}
              data-tutorial-id={host?.anchor('tab', pbSlug(t))}
              onClick={() => { host?.report('selectTab', { tab: pbSlug(t) }); setTab(t) }}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="pb-tabs__page" style={{ background: 'var(--pb-face)', overflow: 'auto' }}>
          {tab === 'Detail'
            ? rows.length > 0 && <DetailPage key={record?.[idKey || 'id_chart_barrier'] ?? cur} screen={screen} record={record} edit={edit} />
            : (
              <LinkedPage
                band={tab === 'Linked Goals' ? cfg.linkedBand : tab}
                goals={tab === 'Linked Goals'}
                rows={tab === 'Linked Goals' ? linked : []}
                /* only Planned Actions' band is not Read Only */
                editable={screen === 'actions' && !!record}
                objectId={record?.[idKey]}
                chart={patient.chart}
              />
            )}
        </div>
      </div>

      {/* the Created / Last Modified strip belongs to the Detail page: the
          Linked Goals captures (action-linked-goals-populated.png,
          health-issues-linked-goals-empty.png) run the linked grid to the
          bottom of the window with no strip under it */}
      {tab === 'Detail' && rows.length > 0 && (
        <div className="pb-row" style={{ padding: '2px 8px 4px', borderTop: '1px solid #d6d6d6', gap: 0 }}>
          <span>Created: {stamp(record)}</span>
          <span style={{ width: 28 }} />
          {record?.stp_date_modify && <span>Last Modified: {stamp(record, 'modify')}</span>}
          <span className="pb-row__spacer" />
          <button className="pb-link">ENC# {record?.id_encounter && record.id_encounter !== '-1' ? record.id_encounter : 'EMPTY'}</button>
        </div>
      )}

      {lookup && (
        <DesktopLayer>
          <UniversalSearchDialog
            onClose={() => setLookup(false)}
            onPick={(r) => { edit('str_description', r.term.toUpperCase(), { str_code: r.code, str_code_system: r.system }); setLookup(false) }}
          />
        </DesktopLayer>
      )}
    </>
  )
}

/* --- the Detail page -------------------------------------------------------
   One tab caption, five panes. Each is transcribed from its own capture; the
   label column and the field widths are the ones MOIS paints.             */

function DetailPage({
  screen, record, edit,
}: { screen: CarePlanKey; record?: MoisRecord; edit: Edit }) {
  if (screen === 'actions') return <ActionDetail record={record} edit={edit} />
  if (screen === 'barriers') return <NoteDetail record={record} edit={edit} />
  if (screen === 'conditions') return <ConditionDetail record={record} />
  if (screen === 'risks') return <RiskDetail record={record} edit={edit} />
  return <NeedDetail record={record} edit={edit} />
}

/** `Low Risk … High Risk`, the value box and its `(/10)` suffix.
    PowerBuilder paints the scale at a fixed width — roughly 320 px of track —
    rather than stretching it to the pane. Dragging the slider or typing a
    value 1–10 sets the record's `num_risk` (art. 303447). */
function RiskScale({ value = '', onChange, anchor }: { value?: string; onChange?: (v: string) => void; anchor: string }) {
  return (
    <div style={{ width: 396 }}>
      <div className="pb-row" style={{ gap: 0 }}>
        <span>Low Risk</span>
        <span className="pb-row__spacer" />
        <span>High Risk</span>
        <span style={{ width: 14 }} />
        <span>Value</span>
      </div>
      <div className="pb-row">
        <span style={{ flex: '1 1 auto', display: 'flex' }} data-tutorial-id={`host.mois.field.${anchor}`}>
          <PBSlider min={1} max={10} value={Number(value) || 1} onChange={(v) => onChange?.(String(v))} style={{ flex: '1 1 auto' }} />
        </span>
        <PBInput
          w={40} align="center" value={value} readOnly={!onChange}
          data-tutorial-id={`host.mois.field.${anchor}-value`}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '')
            if (v === '' || (Number(v) >= 1 && Number(v) <= 10)) onChange?.(v)
          }}
        />
        <span>(/10)</span>
      </div>
    </div>
  )
}

const PAGE: React.CSSProperties = { display: 'grid', padding: '8px 10px', gap: '6px 8px', alignItems: 'start' }

/* Need for Care — the Participants box sits beside the description and the
   risk scale, and Comment runs the full width underneath it. */
function NeedDetail({ record, edit }: { record?: MoisRecord; edit: Edit }) {
  return (
    <div style={{ ...PAGE, gridTemplateColumns: '84px minmax(0, 1fr) auto 210px' }}>
      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Need Desc.:</span>
      <PBInput w="100%" value={record?.str_description ?? ''} data-tutorial-id="host.mois.field.need-description"
        onChange={(e) => edit('str_description', e.target.value.toUpperCase())} />
      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Participants:</span>
      <PBTextArea value={record?.str_participants ?? ''} rows={3} w="100%" style={{ gridRow: 'span 2' }}
        data-tutorial-id="host.mois.field.need-participants" onChange={(e) => edit('str_participants', e.target.value)} />

      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Risk Rating:</span>
      <RiskScale value={record?.num_risk} anchor="need-risk-rating" onChange={(v) => edit('num_risk', v)} />

      <span className="pb-form__label" style={{ gridColumn: 1, lineHeight: '19px' }}>Comment:</span>
      <PBTextArea value={record?.str_comment ?? ''} rows={9} w="100%" style={{ gridColumn: '2 / -1' }}
        data-tutorial-id="host.mois.field.need-comment" onChange={(e) => edit('str_comment', e.target.value)} />
    </div>
  )
}

/* Risk for Condition — the description is painted, not editable (it is
   typed or looked up in the grid), and the scale is captioned "Risk
   Severity". No Participants box. */
function RiskDetail({ record, edit }: { record?: MoisRecord; edit: Edit }) {
  return (
    <div style={{ ...PAGE, gridTemplateColumns: '110px minmax(0, 1fr)' }}>
      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Risk Description:</span>
      <div className="pb-row" style={{ gap: 0 }} data-tutorial-id="host.mois.field.risk-description">
        <span>{record?.str_description ?? ''}</span>
        <span className="pb-row__spacer" />
        <span />
      </div>

      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Risk Severity:</span>
      <RiskScale value={record?.num_risk} anchor="risk-severity" onChange={(v) => edit('num_risk', v)} />

      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Comment:</span>
      <PBTextArea value={record?.str_comment ?? ''} rows={11} w="100%"
        data-tutorial-id="host.mois.field.risk-comment" onChange={(e) => edit('str_comment', e.target.value)} />
    </div>
  )
}

/* Condition — Severity System and Severity Code hang off the right of the
   Problem Name row; Source is a drop-down of its own. */
function ConditionDetail({ record }: { record?: MoisRecord }) {
  return (
    <div style={{ ...PAGE, gridTemplateColumns: '92px minmax(0, 1fr) auto 210px' }}>
      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Problem Name:</span>
      <PBLookup w="100%" value={record?.str_problem_name ?? ''} readOnly />
      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Severity System:</span>
      <PBDropField w="100%" />

      <span />
      <span />
      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Severity Code:</span>
      <PBDropField w="100%" />

      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Source:</span>
      <PBDropField w={210} />
      <span />
      <span />

      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Comment:</span>
      <PBTextArea value={record?.str_comment ?? ''} readOnly rows={10} w="100%" style={{ gridColumn: '2 / -1' }} />
    </div>
  )
}

/* Planned Actions — two blocks divided by a hairline: Detail beside the
   participant list, then Outcome beside the completion flags. The grid's
   Action is the short description; Detail is the long one (field audit
   tdt_action: Action · … · Detail · Outcome · Completed). */
function ActionDetail({ record, edit }: { record?: MoisRecord; edit: Edit }) {
  const completed = record?.str_completed === 'Y'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ ...PAGE, gridTemplateColumns: '60px minmax(0, 1fr) auto 210px', paddingBottom: 8 }}>
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Detail:</span>
        <PBTextArea value={record?.str_comment ?? ''} rows={8} w="100%"
          data-tutorial-id="host.mois.field.action-detail" onChange={(e) => edit('str_comment', e.target.value)} />
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Participant(s):</span>
        <PBInput w="100%" value={record?.str_participants ?? ''}
          data-tutorial-id="host.mois.field.action-participants" onChange={(e) => edit('str_participants', e.target.value.toUpperCase())} />
      </div>

      <div style={{ borderTop: '1px solid #d6d6d6' }} />

      <div style={{ ...PAGE, gridTemplateColumns: '60px minmax(0, 1fr) auto 210px' }}>
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Outcome:</span>
        <PBTextArea value={record?.str_outcome ?? ''} rows={3} w="100%" style={{ gridRow: 'span 2' }}
          data-tutorial-id="host.mois.field.action-outcome" onChange={(e) => edit('str_outcome', e.target.value)} />
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Completed:</span>
        <PBCheckbox
          label="Yes" checked={completed} tutorialId="host.mois.field.action-completed"
          onChange={(on) => edit('str_completed', on ? 'Y' : 'N', { dtm_completed: on ? slash(MOIS_TODAY) : '' })}
        />

        <span className="pb-form__label" style={{ gridColumn: 3, lineHeight: '19px' }}>Completed Date:</span>
        <PBInput w={140} value={dot(record?.dtm_completed)} data-tutorial-id="host.mois.field.action-completed-date"
          onChange={(e) => edit('dtm_completed', slash(e.target.value))} />
      </div>
    </div>
  )
}

/* Barrier to Care (and Patient Resources, which shares the window): one Note
   field, full width. */
function NoteDetail({ record, edit }: { record?: MoisRecord; edit: Edit }) {
  return (
    <div style={{ ...PAGE, gridTemplateColumns: '60px minmax(0, 1fr)' }}>
      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Note:</span>
      <PBTextArea value={record?.str_note ?? ''} rows={10} w="100%" onChange={(e) => edit('str_note', e.target.value)} />
    </div>
  )
}

function LinkedPage({ band, goals, rows, editable, objectId, chart }: {
  band: string; goals: boolean; rows: Record<string, string>[]
  /** Planned Actions: Link Goal... / Unlink on the band */
  editable?: boolean; objectId?: string; chart: string
}) {
  const [cur, setCur] = useState(0)
  const open = useOpenWindow()
  const host = usePBInstrumentation()
  const button = (id: string, label: string, onClick: () => void, disabled?: boolean) => (
    <PBButton
      size="sm" disabled={disabled}
      data-tutorial-id={host?.anchor('command', id)}
      onClick={() => { host?.report('command', { command: id }); onClick() }}
    >
      {label}
    </PBButton>
  )
  const current = rows[Math.min(cur, rows.length - 1)]
  return (
    <>
      <PBBand
        right={editable && objectId ? (
          <>
            {button('link-goal', 'Link Goal...', () => open('link-goal', { object: 'action', objectId }))}
            {button('unlink-goal', 'Unlink', () => { if (current) unlinkGoal(chart, 'action', objectId, current.goalId!) }, !current)}
          </>
        ) : undefined}
      >
        {band}
      </PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          flush
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          groupBy={goals ? (r) => r.group : undefined}
          rowStatus={() => 'highlight'}
          rowTutorialId={(r) => (r.goalId ? `host.mois.row.linked-goal-${r.goalId}` : undefined)}
          columns={[
            { key: 'start', header: 'Start', width: 76 },
            { key: 'end', header: 'End', width: 70 },
            {
              key: 'desc', header: 'Description', width: 240,
              render: (r) => <button className="pb-link">{r.desc}</button>,
            },
            { key: 'phase', header: 'Phase', width: 86 },
            { key: 's', header: 'S', width: 24, align: 'center', render: (r) => <PBCheckbox checked={r.s === 'Y'} /> },
            { key: 'by', header: 'Linked By', width: 130 },
            { key: 'when', header: 'Linked Date', width: 130 },
          ]}
        />
      </div>
    </>
  )
}
