import { Fragment, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useChartExport, useNodeRecords } from '../data/chart-records'
import { bindReportField, stamp } from '../data/charts/detail'
import type { MoisRecord } from '../data/charts'
import { rowsFromExport } from '../data/charts/to-rows'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import type { PaintedField, ReportField, ReportScreen } from '../data/reportScreens'
import {
  PBBand, PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBDropField, PBInput, PBLookup,
  PBSelect, PBTabs, PBTextArea, PBViewHeader, type PBColumn, type PBCommand,
} from '../pb'
import { PreferencesDetail } from './PreferencesDetail'
import { PREFERENCE_SEARCH_FIELDS, preferenceCommands, usePreferenceFolder } from './PreferenceWindows'
import { CarePlanNoteFolder } from './CarePlanNoteFolder'
import { useNoKnown } from './NoKnown'
import { SearchForBand, searchFieldsFor, useFolderSearch } from './SearchForBand'
import { ChartIdentityStrip } from './patientKit'
import { PreferenceEncounterDialog } from './PreferenceEncounterDialog'
import { MeasurePanelPane, MeasureReportPane } from './MeasureReportPane'
import { useMeasuresFolder } from './measuresFolder'
import { SignatureLink, recordKeyOf, useReportRecordEdits } from './reportRecordEdits'
import { RECORD_FOLDERS, useReportRecords } from './reportRecords'
import { useFolderReviews } from '../data/folder-reviews'
import { AdverseEventTab, ALLERGY_WINDOWS, AllergyFolderWindows } from './AllergyWindows'
import { ADVERSE_WINDOWS, LinkedEventsPane, NoKnownMark } from './AdverseEventWindows'
import { storedRiskReactions } from '../data/allergySession'
import { useScreenWindow } from '../host/screen-windows'
import { useOpenWindow } from './areaWindowRegistry'
import { useRecordOptionList } from './RecordOptionList'
import { PaperFormsView } from './PaperFormsView'
import { useDocumentsDistribution } from './documentsDistribution'
import { reviewKeyOf } from './RecordOptionWindows'
import { useWorkspaceStore } from '../data/workspaceStore'
import { CURRENT_USER } from '../data/tasks'


/* One component for Imaging Reports, Consult Reports, Procedure and Paper
   Forms — they are the same PowerBuilder window with a different binding. */

function Field({ f }: { f: ReportField }) {
  if (f.kind === 'gap') return <><span /><span /></>
  const label = (
    <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px', whiteSpace: 'pre-line' }}>
      {f.label}
    </span>
  )
  switch (f.kind) {
    case 'lookup':
      return <>{label}<PBLookup w={f.w ?? '100%'} defaultValue={f.value} /></>
    case 'area':
      return <>{label}<PBTextArea rows={f.rows ?? 4} w={f.w ?? '100%'} defaultValue={f.value} /></>
    case 'check':
      return <>{label}<PBCheckbox checked={f.value === 'Y'} /></>
    case 'range':
      return (
        <>{label}
          <div className="pb-row">
            <PBInput w={92} style={{ background: 'var(--pb-dw-flag)' }} />
            <span>to</span>
            <PBInput w={92} style={{ background: 'var(--pb-dw-flag)' }} />
            <span style={{ marginLeft: 10 }}>Status:</span>
            <PBInput w={44} align="center" defaultValue="" />
          </div>
        </>
      )
    case 'date':
      return (
        <>{label}
          <div className="pb-row">
            <PBInput w={f.w ?? 92} align="center" defaultValue={f.value} />
            {f.time && <PBInput w={38} align="center" defaultValue=":" />}
          </div>
        </>
      )
    default:
      return <>{label}<PBInput w={f.w ?? '100%'} defaultValue={f.value} /></>
  }
}

/* A detail page painted field by field (reportScreens' PaintedField): each
   caption and box at the x / y / width the capture measures, 16px boxes on
   the window face. */
function PaintedForm({ fields, record, onSearch }: { fields: PaintedField[]; record?: MoisRecord; onSearch: (preset: string) => void }) {
  const at = (f: PaintedField): CSSProperties => ({ position: 'absolute', left: f.x, top: f.y, width: f.w, height: f.h ?? 16 })
  return (
    <div className="pb-painted" style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, minWidth: 0 }}>
      {fields.map((f, i) => {
        const bound = f.kind === 'time' || f.kind === 'dots' ? f.value ?? '' : bindReportField({ label: f.label, kind: f.kind === 'date' ? 'date' : 'text' }, record)
        /* a fixed caption the capture prints inside the box (Reaction Risks'
           "Agent Category:" selector) wins over the record */
        const value = f.value !== undefined && f.kind !== 'time' ? f.value : typeof bound === 'string' ? bound : ('value' in bound ? bound.value ?? '' : '')
        const caption = f.cap === false ? null : (
          <span
            className="pb-form__label"
            style={{
              position: 'absolute', top: f.y, lineHeight: '16px', whiteSpace: 'pre-line',
              ...(f.cap && 'right' in f.cap ? { right: `calc(100% - ${f.cap.right}px)`, textAlign: 'right' } : { left: f.cap ? f.cap.left : 3 }),
            }}
          >
            {f.label}
          </span>
        )
        if (f.kind === 'rule') return <div key={`${f.label}:${i}`} style={{ position: 'absolute', left: f.x, top: f.y, right: 0, borderTop: '1px solid #a0a0a0' }} />
        const box = f.kind === 'combo'
          ? <span style={at(f)}><PBDropField w="100%" defaultValue={value} disabled={f.disabled} /></span>
          : f.kind === 'lookup'
          ? <span style={at(f)}><PBLookup w="100%" defaultValue={value} disabled={f.disabled} name={f.search ? `${f.search}-search` : undefined} onDots={f.search ? () => onSearch(f.search!) : undefined} /></span>
          : f.kind === 'area'
            ? <PBTextArea w={f.w} defaultValue={value} style={{ ...at(f), resize: 'none' }} />
            : f.kind === 'dots'
              ? <PBButton bare className="pb-inputgroup__btn pb-inputgroup__btn--dots" style={{ ...at(f), height: 16 }}>…</PBButton>
              : <PBInput w={f.w} align={f.kind === 'date' || f.kind === 'time' ? 'center' : undefined} defaultValue={value} disabled={f.disabled} style={at(f)} />
        return <Fragment key={`${f.label}:${i}`}>{caption}{box}</Fragment>
      })}
    </div>
  )
}

type ReportViewProps = { screen: ReportScreen; node?: string; initialRecordId?: string }

/** "JALIL, AHMAD" → "AJ" */
const initialsOf = (name: string) => name.split(',').map((p) => p.trim()).reverse().filter(Boolean).map((p) => p[0]).join('')

/** a footer line: 20px under a hairline, text 3px in (captures c12, c16) */
const FOOT_ROW: CSSProperties = { height: 20, padding: '0 5px 0 3px', gap: 0, flex: 'none', borderTop: '1px solid #d9d9d9' }
/** the rail's captions are plain weight on the face (captures c01, c12, c16) */
const RAIL_CAPTION: CSSProperties = { fontWeight: 400, background: 'var(--pb-face)' }

/* Paper Forms has its own window since the v02.31.23 captures (no Code
   caption, full-width Comment, File Name, the MOIS Viewer on double-click):
   screens/PaperFormsView.tsx. A different component per node, so switching
   folders remounts rather than changing the hooks this one calls. */
export function ClinicalReportView(props: ReportViewProps) {
  if (props.node === 'barriers' || props.node === 'resources') {
    /* Barriers to Care / Patient Resources: entered in the grid, Note on
       Detail (screens/CarePlanNoteFolder.tsx, art. 303512 / 303513) */
    return <CarePlanNoteFolder key={props.node} screen={props.screen} node={props.node} />
  }
  return props.node === 'paper' ? <PaperFormsView screen={props.screen} node="paper" /> : <ReportView {...props} />
}

function ReportView({ screen: layout, node = '', initialRecordId }: ReportViewProps) {
  const data = useChartExport()
  const nodeRecords = useNodeRecords(node)
  /* Preferences: this session's (New Preference, Quick Entry) first, saved
     edits and deletions applied, sortable (PreferenceWindows.tsx); a newly
     filed one becomes the current row */
  const prefs = usePreferenceFolder(node === 'prefs', nodeRecords, () => setCur(0))
  const records = prefs.records
  const encounters = useNodeRecords('encounters')
  // Preference edits stay pending here until Save files them (data/carePlanRecords.ts), never export writes.
  const [drafts, setDrafts] = useState<Record<string, MoisRecord>>({})
  const [encounterOpen, setEncounterOpen] = useState(false)
  /* "… have not been reviewed for this patient" stands until a review is
     filed; then the title carries its date and a Last Reviewed line takes the
     banner's place (303791 `7d42bca7…png`, data/folder-reviews.ts) */
  const [nodeReviews] = useFolderReviews(node)
  const reviewed = layout.banner ? nodeReviews[0] : undefined
  const screen = { ...layout, banner: reviewed ? undefined : layout.banner, title: reviewed ? `${layout.title} - (${reviewed.date})` : layout.title }

  const patient = usePatient()
  const { open: openScreenWindow } = useScreenWindow()
  /* a "…" that searches codes opens the Universal Search Window on the
     field's preset (CodeLookupDialogs' `preset`, captures c11 / c13) */
  const openArea = useOpenWindow()
  const searchCodes = (preset: string) => openArea('universal-search-window', { preset })
  const [tab, setTab] = useState(screen.tabs?.[0] ?? '')
  const [cur, setCur] = useState(() => initialRecordId && node === 'prefs' ? Math.max(0, records.findIndex(r => r.id_chart_preference === initialRecordId)) : 0)
  /* Measures' own taskbar, flag painting, filter and Panel tab (measuresFolder.tsx) */
  const measures = useMeasuresFolder(node, screen.rows, cur)
  /* New Record / Delete Record on the other report folders (reportRecordEdits.tsx) */
  /* New Record / Delete Record / Save / Undo, with Reaction Risks' New
     Reaction Risk window, on the allergy, adverse-event, condition and
     intervention folders (reportRecords.tsx). Where it is active it owns the
     rows, and the generic handler below passes straight through. */
  const own = useReportRecords({
    node: RECORD_FOLDERS.has(node) ? node : '', rows: measures.rows, records, columns: layout.columns, cur, setCur,
    newWindow: node === 'reaction' || node === 'allergy' ? ALLERGY_WINDOWS.newRisk : node === 'events' ? ADVERSE_WINDOWS.newEvent : undefined,
  })
  const edits = useReportRecordEdits(own.active ? 'measures' : node, measures.rows, records, cur, setCur)
  const tabs = measures.active ? screen.tabs?.map((t) => (t.startsWith('Panel (') ? measures.panel.caption : t)) : screen.tabs
  const activeTab = measures.active && tab.startsWith('Panel (') ? measures.panel.caption : tab
  const preferenceGrid = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (node !== 'prefs') return
    preferenceGrid.current?.querySelectorAll('tbody tr')[cur]?.scrollIntoView?.({ block: 'nearest' })
  }, [cur, node, records.length])
  const sourceRecord = own.active ? own.recordAt(cur) : edits.records[cur]
  const recordId = sourceRecord?.id_chart_preference ?? ''
  const record = node === 'prefs' && sourceRecord ? { ...sourceRecord, ...drafts[recordId] } : sourceRecord
  /* Documents: Distribute, the editable Document Type, the Distribution tab (documentsDistribution.tsx, 303445) */
  const docs = useDocumentsDistribution({ node, record, records: edits.records, cur })
  const changePreference = (field: string, value: string) => {
    if (recordId) setDrafts(previous => ({ ...previous, [recordId]: { ...previous[recordId], [field]: value } }))
  }
  const encounterId = record?.id_encounter && record.id_encounter !== '-1' && record.id_encounter !== '0' ? record.id_encounter : ''
  const form = screen.forms?.[tab] ?? screen
  const reactions = record ? (node === 'events' ? data?.reaction_event.filter(r => r.id_adverse_event === record.id_adverse_event)
    : record.id_allergy?.startsWith('session-') ? storedRiskReactions(patient.chart, record.id_allergy)
    : data?.reaction_risk.filter(r => r.id_allergy === record.id_allergy)) ?? [] : []

  /* Conditions' No Known and its ** NO KNOWN ** assertion (NoKnown.tsx, art. 303447) */
  const noKnown = useNoKnown(node === 'conditions' ? 'conditions' : '', own.rows.length)
  const base: PBCommand[] = screen.commands.map((c) => (c === null ? null : { label: c, disabled: screen.disabled?.includes(c) }))
  const commands: PBCommand[] = noKnown.commands(own.commands(edits.commands(measures.commands(node !== 'prefs' ? base
    /* Preferences: New Record opens New Preference; Delete / Save / Undo /
       Refresh and Quick Entry as PreferenceWindows.tsx describes */
    : preferenceCommands(base, prefs, {
      record,
      drafts,
      clearDrafts: () => setDrafts({}),
      undoDraft: () => setDrafts(({ [recordId]: _undone, ...rest }) => rest),
    })))))
  /* the record's right-click Option List (RecordOptionList.tsx) */
  const options = useRecordOptionList({ node, record, commands, setCur })
  /* the rail's Acknowledgements: a Mark for Review filed on this record
     (RecordOptionWindows' reviewKeyOf, the same key its Workflow Summary reads) */
  const ws = useWorkspaceStore()
  const marked = !!record && ws.reviews.includes(reviewKeyOf(recordKeyOf(patient.chart, node, record)))
  const acknowledgements = marked ? 1 : 0
  const columns: PBColumn<Record<string, string>>[] = measures.columns(screen.columns.map((c) => ({
    key: c.key,
    auditId: c.auditId,
    header: c.header,
    width: c.width,
    align: c.align,
    dots: c.dots,
    render: c.check ? (r) => <PBCheckbox checked={r[c.key] === '✓' || r[c.key] === 'Y'} />
      : c.search ? () => (
        <PBButton bare command={`${c.search}-search`} onClick={(e) => { e.stopPropagation(); searchCodes(c.search!) }}
          style={{ border: 0, background: 'transparent', padding: 0, font: 'inherit', color: 'inherit', lineHeight: 'inherit' }}>...</PBButton>
      ) : undefined,
  })))
  /* Search For filters the grid (SearchForBand.tsx) without renumbering it:
     `cur` and the row anchors keep addressing the folder's own list */
  const searchFields = useMemo(() => (node === 'prefs' ? PREFERENCE_SEARCH_FIELDS
    : searchFieldsFor(layout.title, layout.columns, { concept: true })), [node, layout.title, layout.columns])
  const search = useFolderSearch(layout.title, searchFields)
  const gridRows = docs.rows(node === 'prefs' ? rowsFromExport('prefs', records.map(r => ({ ...r, ...drafts[r.id_chart_preference ?? ''] }))) : own.active ? own.rows : edits.rows)
  /* Measurements' Show: ticks. Show All ticks or clears the other three,
     and cleared it leaves the grid empty (2026-09-29 TRAINING capture c10).
     INFERRED: which class each tick admits — Direct Clinical Obs the DCOBS
     rows, Pathology the pathology / cytology ones, Laboratory the rest. */
  const [ticks, setTicks] = useState<Record<string, boolean>>(() => Object.fromEntries((screen.filters ?? []).map((f) => [f.label, !!f.checked])))
  const tick = (label: string, on: boolean) => setTicks((t) => label === 'Show All'
    ? Object.fromEntries(Object.keys(t).map((k) => [k, on]))
    : { ...t, [label]: on, 'Show All': on && Object.entries(t).every(([k, v]) => k === 'Show All' || k === label || v) })
  const admits = (row: Record<string, string>) => {
    if (!screen.filters || ticks['Show All']) return true
    const cls = (row.category ?? '').toUpperCase()
    if (cls === 'DCOBS') return !!ticks['Direct Clinical Obs']
    if (/PATH|CYTO|HISTO/.test(cls)) return !!ticks.Pathology
    return !!ticks.Laboratory
  }
  const shown = gridRows.map((row, index) => ({ row, index })).filter((x) => search.test(x.row) && admits(x.row))

  /* the detail fields are uncontrolled (defaultValue), so they remount per
     record, not per row index: a record filed at the top of the list (New
     Reaction Risk, Quick Entry) arrives while the current index stays 0 */
  /* the grid ends on the same line in every 2026-09-29 TRAINING capture
     (Imaging, Consults: 244px; Measurements, whose Show: row sits above it:
     216px). */
  /* a review-banner folder's grid is 242 (set 3 c04 Reaction Risks, c34
     Condition — 220 was an older capture's) */
  const gridHeight = screen.gridHeight ?? (node === 'prefs' ? 278 : screen.banner || reviewed ? 242 : screen.filters ? 216
    /* a plain folder (Family Hx, c15) gives the grid most of the window */
    : screen.plain && screen.painted ? 396 : 244)
  const detailKey = recordKeyOf(patient.chart, node, record)
  const painted = tab && tab !== screen.tabs?.[0] ? screen.forms?.[tab]?.painted : screen.painted
  /* with no record behind the current row the detail page is bare — no
     fields, no footer (set 3 c01, set 2 c10) */
  const detail = !record && painted ? null : painted ? <PaintedForm key={`${detailKey}:${cur}:${tab}`} fields={painted} record={record} onSearch={searchCodes} /> : (
    <div style={{ display: 'flex', gap: 10, padding: '6px 8px', alignItems: 'flex-start', minWidth: 0 }}>
      <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '104px 1fr', flex: '1 1 auto', minWidth: 0, alignItems: 'start' }}>
        {form.left.map((f, i) => <Fragment key={`${detailKey}:${cur}:${tab}:${i}`}><Field f={bindReportField(f, record)} /></Fragment>)}
      </div>
      <div className="pb-form" style={{ padding: 0, gridTemplateColumns: 'auto 1fr', flex: 'none', alignItems: 'start' }}>
        {form.right.map((f, i) => <Fragment key={`${detailKey}:${cur}:${tab}:${i}`}><Field f={bindReportField(f, record)} /></Fragment>)}
      </div>
    </div>
  )

  return (
    <>
      <PBViewHeader title={screen.title} right={<ChartHeaderIdentity />} />
      <PBCommandRow commands={docs.commands(commands)} />

      <ChartIdentityStrip
        search={<SearchForBand context={layout.title} fields={searchFields} value={search.text} onChange={search.setText} style={{ padding: 0, flex: '1 1 auto' }}
          right={screen.viewSelect ? <PBSelect options={screen.viewSelect} w={120} />
            : screen.hideLinked ? <span style={{ marginLeft: 12, whiteSpace: 'nowrap' }}><PBCheckbox label="Hide Linked Elsewhere" /></span> : undefined} />}
      />

      {screen.filters && (
        <div className="pb-row pb-row--gap-lg" style={{ padding: '0 8px 3px' }}>
          <span>Show:</span>
          {screen.filters.map((f) => <PBCheckbox key={f.label} label={f.label} checked={!!ticks[f.label]} onChange={(on) => tick(f.label, on)} />)}
          <span className="pb-row__spacer" />
          <span>Category:</span><PBSelect options={['', 'PSYCH', 'LAB', 'VITALS']} w={130} />
        </div>
      )}

      {/* 303131 `8ed81b2c…`: a No Known assertion prints at the right of this line */}
      {/* 23px from the Search For rule to the grid (set 3 c34) */}
      {screen.banner && <div className="pb-row" style={{ padding: '3px 0 4px 8px', flex: 'none' }}><span data-tutorial-id="host.mois.field.review-banner">{screen.banner}</span><NoKnownMark node={node} />{noKnown.label}</div>}
      {reviewed && (
        <div className="pb-row" style={{ padding: '0 8px 3px', gap: 18, flex: 'none' }} data-tutorial-id="host.mois.field.last-reviewed">
          <span>Last Reviewed</span><span>{reviewed.date}</span><span>{reviewed.name}</span><NoKnownMark node={node} />{noKnown.label}
        </div>
      )}

      <div ref={preferenceGrid} onContextMenu={options.active ? options.onContextMenu : undefined} style={{ padding: '0 3px', height: gridHeight, flex: 'none', display: 'flex', position: 'relative' }}>
        <PBDataWindow
          columns={docs.columns(columns)}
          rows={shown.map((x) => x.row)}
          current={Math.max(0, shown.findIndex((x) => x.index === cur))}
          rowTutorialId={(r, i) => {
            const index = shown[i]?.index ?? i
            if (node === 'prefs') return `host.mois.row.preference-${records[index]?.id_chart_preference}`
            return (measures.rowTutorialId ?? options.rowTutorialId)?.(r, index)
          }}
          onCurrentChange={i => { setCur(shown[i]?.index ?? 0); setEncounterOpen(false) }}
          rowStatus={(r) => (!measures.active && screen.flagKey && r[screen.flagKey] === 'H' ? 'flag' : 'normal')}
          /* Preferences' blue column titles sort (art. 300925 step 3 note) */
          onSort={node === 'prefs' ? prefs.onSort : undefined}
          /* a folder with no records is its white grid body, nothing more
             (2026-09-29 TRAINING captures: Imaging, Consults, Measurements) */
          empty={false}
        />
        {options.menu}
      </div>

      {/* detail body and footer, with the acknowledgement rail alongside
          where present — the rail runs down beside the Source / Created
          lines to the bottom of the window (user capture 2026-09-25 #34,
          #35 (v02.31.23)) */}
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 4, padding: '4px 3px 0' }}>
        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            {screen.tabs ? (
              <PBTabs tabs={docs.tabs(tabs ?? screen.tabs) ?? []} active={docs.active && activeTab.startsWith('Distribution') ? docs.tabs([activeTab])![0]! : activeTab} onChange={setTab} compact={!screen.fixedTabs}
                /* the detail page is the window face, grey behind white
                   boxes (2026-09-29 TRAINING captures c01, c12, c16) */
                face>
                {docs.active && tab.startsWith('Distribution') ? docs.page(tab) : tab === 'Office Notes (0)' ? (
                  <>
                    <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
                      Office Notes
                    </PBBand>
                    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                      <PBDataWindow
                        flush gutter={false} rows={[]}
                        columns={[
                          { key: 'date', header: 'Date', width: 96, align: 'center' },
                          { key: 'author', header: 'Author', width: 150, align: 'center' },
                          { key: 'note', header: 'Note' },
                        ]}
                        empty="No office notes."
                      />
                    </div>
                  </>
                ) : node === 'events' ? (
                  <AdverseEventTab tab={tab} record={record} />
                ) : tab === 'Reactions' ? (
                  <>
                    <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
                      Reactions
                    </PBBand>
                    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                      <PBDataWindow
                        flush gutter={false}
                        rows={reactions.map(r => ({ reaction: r.str_reaction ?? '', rank: r.num_rank ?? '', severity: r.str_severity ?? '', comment: r.str_comment ?? '' }))}
                        columns={[
                          { key: 'reaction', header: 'Reaction', width: 240 },
                          { key: 'rank', header: 'Rank', width: 56, align: 'center' },
                          { key: 'severity', header: 'Severity', width: 100, align: 'center' },
                          { key: 'comment', header: 'Comment' },
                        ]}
                      />
                    </div>
                  </>
                ) : tab === 'Linked Events' ? (
                  /* 303131 `1a8f753b…`: Link Event(s) · Unlink Event(s) over the EVENTS band */
                  <LinkedEventsPane key={record?.id_allergy} record={record}
                    onLink={() => openScreenWindow(ADVERSE_WINDOWS.linkEvents, { risk: record?.id_allergy ?? '' })} />
                ) : measures.active && activeTab === measures.panel.caption ? (
                  <MeasurePanelPane panel={measures.panel} />
                ) : tab === 'Panel (0)' ? (
                  <div className="pb-dw__empty" style={{ padding: 24 }}>No panel detail available.</div>
                ) : node === 'prefs' ? <PreferencesDetail key={recordId} record={record} records={records} onChange={changePreference} /> : screen.title === 'Measurements' ? <MeasureReportPane detail={tab === 'Detail'} row={measures.rows[cur]} /> : detail}
              </PBTabs>
            ) : (
              <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', ...(painted ? { borderTop: '1px solid var(--pb-border)' } : { background: 'var(--pb-window)', border: '1px solid var(--pb-border)', overflow: 'auto' }) }}>
                {detail}
              </div>
            )}
          </div>

          {/* the signature / provenance footer, as the 2026-09-29 TRAINING
              captures (c12, c16) rule and space it: two 20px lines, each under
              a hairline — Source · Sent Date · Code with UNSIGNED at the right,
              then Created · Last Modified with ENC# at the right. A plain
              folder (Family Hx) prints Created and ENC# only. */}
          {record && screen.footer && !screen.plain && (
            <div className="pb-row" style={FOOT_ROW}>
              <span style={{ width: 67 }}>Source:</span>
              {/* MOIS's Source is the record's interface — SYSTEM, MOISFORM,
                  EXC … (str_interface in a chart export; `str_source` is a
                  different field, the table a document came from) */}
              <span style={{ width: 56 }}>{record?.str_interface ?? ''}</span>
              {/* set 3 c31: `Sent Date:` 123 in, its value 180, `Code:` 246,
                  the code 286 */}
              <span style={{ width: 57 }}>Sent Date:</span>
              <span style={{ width: 66 }}>{record?.dtm_sent ?? ''}</span>
              <span style={{ width: 40 }}>Code:</span><span>{record?.str_code || '-'}</span>
              <span className="pb-row__spacer" />
              <SignatureLink key={recordKeyOf(patient.chart, node, record)} recordKey={recordKeyOf(patient.chart, node, record)} source={record?.str_interface} hidden={!record} />
            </div>
          )}
          {record && <div className="pb-row" style={FOOT_ROW}>
            <span style={{ width: 67 }}>Created:</span>
            <span>{stamp(record)}</span>
            {!screen.plain && <><span style={{ width: 30 }} /><span>Last Modified:&nbsp;{stamp(record, 'modify')}</span></>}
            <span className="pb-row__spacer" />
            {/* every record carries the link, EMPTY when it hangs off no
                encounter (#34, #35: "ENC# EMPTY") */}
            {node === 'prefs'
              ? record && <button type="button" className="pb-link" onClick={() => setEncounterOpen(true)}>ENC# {encounterId || 'EMPTY'}</button>
              : record && <button type="button" className="pb-link">ENC# {encounterId || 'EMPTY'}</button>}
          </div>}
        </div>

        {screen.rail && !screen.plain && (
          /* the rail starts level with the detail page, under the tab strip */
          <div style={{ width: 156, flex: 'none', display: 'flex', flexDirection: 'column', paddingBottom: 3, paddingTop: screen.tabs ? 'var(--pb-tabstrip-h)' : 0 }}>
            {/* who has acknowledged the record: a Mark for Review filed on it
                lists its reviewer (#34 lists one name) */}
            <div className="pb-groupbox" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
              <div className="pb-band" style={RAIL_CAPTION}>Acknowledgement History</div>
              <div data-tutorial-id="host.mois.group.acknowledgement-history" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '2px 6px 0 14px' }}>
                {/* a review filed and not yet checked: a yellow line with an
                    empty tick, the reviewer, and "R" and their initials in
                    grey under it (2026-09-29 TRAINING capture c01; c03's
                    tooltip) */}
                {marked && (
                  <div title={'Marked for Review - Not Checked\nRecord age: 0 days old'} style={{ margin: '0 -6px 0 -14px', padding: '2px 4px 1px', background: '#ffff5f' }}>
                    <PBCheckbox label={CURRENT_USER.name} checked={false} />
                    <div style={{ color: '#a0a0a0', paddingLeft: 2 }}>R&nbsp;&nbsp;{initialsOf(CURRENT_USER.name)}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="pb-groupbox" style={{ flex: 'none' }}>
              <div className="pb-band" style={RAIL_CAPTION}>Workflow Summary</div>
              <div style={{ padding: '4px 6px' }}>
                {[['Messages:', '0'], ['Tasks:', '0'], ['Acknowledgements:', acknowledgements ? String(acknowledgements) : '0']].map(([k, v]) => (
                  <div className="pb-row" key={k} style={{ gap: 0 }}>
                    <span>{k}</span><span className="pb-row__spacer" /><span style={{ paddingRight: 18 }}>{v}</span>
                  </div>
                ))}
                <div style={{ textAlign: 'center', marginTop: 2 }}>
                  {/* 303741 / #34: the rail's View Detail... opens the record's Workflow Summary */}
                  <button className="pb-link" data-tutorial-id="host.mois.command.view-detail" onClick={options.active && record ? options.openWorkflowSummary : undefined}>View Detail...</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {node === 'prefs' && record && encounterOpen && <PreferenceEncounterDialog key={recordId} encounterId={encounterId}
        encounters={encounters} onChange={id => changePreference('id_encounter', id)} onClose={() => setEncounterOpen(false)} />}
      {own.active && <AllergyFolderWindows record={record} onMark={own.mark} />}
      {options.windows}
      {docs.windows}
      {noKnown.windows}
    </>
  )
}
