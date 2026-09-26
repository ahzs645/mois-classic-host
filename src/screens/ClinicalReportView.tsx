import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import { useChartExport, useNodeRecords } from '../data/chart-records'
import { bindReportField, stamp } from '../data/charts/detail'
import type { MoisRecord } from '../data/charts'
import { rowsFromExport } from '../data/charts/to-rows'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import type { ReportField, ReportScreen } from '../data/reportScreens'
import {
  PBBand, PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBIdentityStrip, PBInput, PBLookup,
  PBSelect, PBTabs, PBTextArea, PBViewHeader, type PBColumn, type PBCommand,
} from '../pb'
import { PreferencesDetail } from './PreferencesDetail'
import { PreferenceEncounterDialog } from './PreferenceEncounterDialog'
import { MeasurePanelPane, MeasureReportPane } from './MeasureReportPane'
import { useMeasuresFolder } from './measuresFolder'
import { SignatureLink, recordKeyOf, useReportRecordEdits } from './reportRecordEdits'
import { RECORD_FOLDERS, useReportRecords } from './reportRecords'
import { useFolderReviews } from '../data/folder-reviews'
import { AdverseEventTab, ALLERGY_WINDOWS, AllergyFolderWindows } from './AllergyWindows'
import { useRecordOptionList } from './RecordOptionList'
import { PaperFormsView } from './PaperFormsView'
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

type ReportViewProps = { screen: ReportScreen; node?: string; initialRecordId?: string }

/* Paper Forms has its own window since the v02.31.23 captures (no Code
   caption, full-width Comment, File Name, the MOIS Viewer on double-click):
   screens/PaperFormsView.tsx. A different component per node, so switching
   folders remounts rather than changing the hooks this one calls. */
export function ClinicalReportView(props: ReportViewProps) {
  return props.node === 'paper' ? <PaperFormsView screen={props.screen} node="paper" /> : <ReportView {...props} />
}

function ReportView({ screen: layout, node = '', initialRecordId }: ReportViewProps) {
  const data = useChartExport()
  const records = useNodeRecords(node)
  const encounters = useNodeRecords('encounters')
  // Preference edits are local to this mounted chart view, never export writes.
  const [drafts, setDrafts] = useState<Record<string, MoisRecord>>({})
  const [saved, setSaved] = useState<Record<string, MoisRecord>>({})
  const [encounterOpen, setEncounterOpen] = useState(false)
  /* "… have not been reviewed for this patient" stands until a review is
     filed; then the title carries its date and a Last Reviewed line takes the
     banner's place (303791 `7d42bca7…png`, data/folder-reviews.ts) */
  const [nodeReviews] = useFolderReviews(node)
  const reviewed = layout.banner ? nodeReviews[0] : undefined
  const screen = { ...layout, banner: reviewed ? undefined : layout.banner, title: reviewed ? `${layout.title} - (${reviewed.date})` : layout.title }

  const patient = usePatient()
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
    newWindow: node === 'reaction' || node === 'allergy' ? ALLERGY_WINDOWS.newRisk : undefined,
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
  const changePreference = (field: string, value: string) => {
    if (recordId) setDrafts(previous => ({ ...previous, [recordId]: { ...previous[recordId], [field]: value } }))
  }
  const encounterId = record?.id_encounter && record.id_encounter !== '-1' && record.id_encounter !== '0' ? record.id_encounter : ''
  const form = screen.forms?.[tab] ?? screen
  const reactions = record ? (node === 'events' ? data?.reaction_event.filter(r => r.id_adverse_event === record.id_adverse_event) : data?.reaction_risk.filter(r => r.id_allergy === record.id_allergy)) ?? [] : []

  const commands: PBCommand[] = own.commands(edits.commands(measures.commands(screen.commands.map((c) =>
    c === null ? null : { label: c, disabled: screen.disabled?.includes(c), onClick: node !== 'prefs' ? undefined
      : c === 'Save' ? () => setSaved(drafts)
      : c === 'Undo' ? () => setDrafts(previous => ({ ...previous, [recordId]: saved[recordId] ?? {} }))
      : c === 'Refresh' ? () => { setDrafts({}); setSaved({}) } : undefined },
  ))))
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
    render: c.check ? (r) => <PBCheckbox checked={r[c.key] === '✓' || r[c.key] === 'Y'} /> : undefined,
  })))

  const detail = (
    <div style={{ display: 'flex', gap: 10, padding: '6px 8px', alignItems: 'flex-start', minWidth: 0 }}>
      <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '104px 1fr', flex: '1 1 auto', minWidth: 0, alignItems: 'start' }}>
        {form.left.map((f, i) => <Fragment key={`${cur}:${tab}:${i}`}><Field f={bindReportField(f, record)} /></Fragment>)}
      </div>
      <div className="pb-form" style={{ padding: 0, gridTemplateColumns: 'auto 1fr', flex: 'none', alignItems: 'start' }}>
        {form.right.map((f, i) => <Fragment key={`${cur}:${tab}:${i}`}><Field f={bindReportField(f, record)} /></Fragment>)}
      </div>
    </div>
  )

  return (
    <>
      <PBViewHeader title={screen.title} right={<ChartHeaderIdentity />} />
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

      <div className="pb-row" style={{ padding: '2px 8px' }}>
        <span>Search For:</span><PBLookup w="100%" />
        {screen.viewSelect && <PBSelect options={screen.viewSelect} w={120} />}
      </div>

      {screen.filters && (
        <div className="pb-row pb-row--gap-lg" style={{ padding: '0 8px 3px' }}>
          <span>Show:</span>
          {screen.filters.map((f) => <PBCheckbox key={f.label} label={f.label} checked={f.checked} />)}
          <span className="pb-row__spacer" />
          <span>Category:</span><PBSelect options={['', 'PSYCH', 'LAB', 'VITALS']} w={130} />
        </div>
      )}

      {screen.banner && <div style={{ padding: '2px 8px 3px', flex: 'none' }} data-tutorial-id="host.mois.field.review-banner">{screen.banner}</div>}
      {reviewed && (
        <div className="pb-row" style={{ padding: '0 8px 3px', gap: 18, flex: 'none' }} data-tutorial-id="host.mois.field.last-reviewed">
          <span>Last Reviewed</span><span>{reviewed.date}</span><span>{reviewed.name}</span>
        </div>
      )}

      <div ref={preferenceGrid} onContextMenu={options.active ? options.onContextMenu : undefined} style={{ padding: '0 3px', height: node === 'prefs' ? 278 : 220, flex: 'none', display: 'flex', position: 'relative' }}>
        <PBDataWindow
          columns={columns}
          rows={node === 'prefs' ? rowsFromExport('prefs', records.map(r => ({ ...r, ...drafts[r.id_chart_preference ?? ''] }))) : own.active ? own.rows : edits.rows}
          current={cur}
          rowTutorialId={node === 'prefs' ? (_r, i) => `host.mois.row.preference-${records[i]?.id_chart_preference}` : measures.rowTutorialId ?? options.rowTutorialId}
          onCurrentChange={i => { setCur(i); setEncounterOpen(false) }}
          rowStatus={(r) => (!measures.active && screen.flagKey && r[screen.flagKey] === 'H' ? 'flag' : 'normal')}
          empty={`No ${screen.title.toLowerCase()} on file.`}
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
              <PBTabs tabs={tabs ?? screen.tabs} active={activeTab} onChange={setTab} compact>
                {tab === 'Office Notes (0)' ? (
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
                ) : node === 'events' && tab !== 'Reactions' ? (
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
                  <>
                    <PBBand>Linked Events - Read Only</PBBand>
                    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                      <PBDataWindow
                        flush gutter={false} rows={[]}
                        columns={[
                          { key: 'date', header: 'Date', width: 96, align: 'center' },
                          { key: 'agent', header: 'Agent', width: 240 },
                          { key: 'event', header: 'Event' },
                          { key: 'outcome', header: 'Outcome', width: 130, align: 'center' },
                        ]}
                        empty="No linked events."
                      />
                    </div>
                  </>
                ) : measures.active && activeTab === measures.panel.caption ? (
                  <MeasurePanelPane panel={measures.panel} />
                ) : tab === 'Panel (0)' ? (
                  <div className="pb-dw__empty" style={{ padding: 24 }}>No panel detail available.</div>
                ) : node === 'prefs' ? <PreferencesDetail key={recordId} record={record} records={records} onChange={changePreference} /> : screen.title === 'Measurements' ? <MeasureReportPane detail={tab === 'Detail'} row={measures.rows[cur]} /> : detail}
              </PBTabs>
            ) : (
              <div style={{ flex: '1 1 auto', minWidth: 0, background: 'var(--pb-window)', border: '1px solid var(--pb-border)', overflow: 'auto' }}>
                {detail}
              </div>
            )}
          </div>

          {/* the signature / provenance footer */}
          {screen.footer && !screen.plain && (
            <div className="pb-row" style={{ padding: '2px 5px 0', gap: 0, flex: 'none' }}>
              <span style={{ width: 70 }}>Source:</span>
              <span style={{ width: 92 }}>{record?.str_source ?? ''}</span>
              <span>Sent Date:&nbsp;</span><span style={{ width: 100 }}>{record?.dtm_sent ?? ''}</span>
              <span>Code:&nbsp;&nbsp;{record?.str_code ?? ''}</span>
              <span className="pb-row__spacer" />
              <SignatureLink key={recordKeyOf(patient.chart, node, record)} recordKey={recordKeyOf(patient.chart, node, record)} source={record?.str_source} hidden={!record} />
            </div>
          )}
          <div className="pb-row" style={{ padding: '0 5px 4px', gap: 0, flex: 'none' }}>
            <span>Created:&nbsp;&nbsp;&nbsp;{stamp(record)}</span>
            <span style={{ width: 28 }} />
            <span>Last Modified: {stamp(record, 'modify')}</span>
            <span className="pb-row__spacer" />
            {/* every record carries the link, EMPTY when it hangs off no
                encounter (#34, #35: "ENC# EMPTY") */}
            {node === 'prefs'
              ? record && <button type="button" className="pb-link" onClick={() => setEncounterOpen(true)}>ENC# {encounterId || 'EMPTY'}</button>
              : record && <button type="button" className="pb-link">ENC# {encounterId || 'EMPTY'}</button>}
          </div>
        </div>

        {screen.rail && !screen.plain && (
          <div style={{ width: 170, flex: 'none', display: 'flex', flexDirection: 'column', paddingBottom: 3 }}>
            {/* who has acknowledged the record: a Mark for Review filed on it
                lists its reviewer (#34 lists one name) */}
            <div className="pb-groupbox" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
              <PBBand>Acknowledgement History</PBBand>
              <div data-tutorial-id="host.mois.group.acknowledgement-history" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '2px 6px 0 14px' }}>
                {marked && <div>{CURRENT_USER.name}</div>}
              </div>
            </div>
            <div className="pb-groupbox" style={{ flex: 'none' }}>
              <PBBand>Workflow Summary</PBBand>
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
      {own.active && <AllergyFolderWindows record={record} onFile={own.file} />}
      {options.windows}
    </>
  )
}
