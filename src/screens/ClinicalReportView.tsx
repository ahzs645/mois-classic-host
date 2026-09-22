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
import { MeasureReportPane } from './MeasureReportPane'


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

export function ClinicalReportView({ screen: layout, node = '', initialRecordId }: { screen: ReportScreen; node?: string; initialRecordId?: string }) {
  const data = useChartExport()
  const records = useNodeRecords(node)
  const encounters = useNodeRecords('encounters')
  // Preference edits are local to this mounted chart view, never export writes.
  const [drafts, setDrafts] = useState<Record<string, MoisRecord>>({})
  const [saved, setSaved] = useState<Record<string, MoisRecord>>({})
  const [encounterOpen, setEncounterOpen] = useState(false)
  const screen = { ...layout, banner: undefined }

  const patient = usePatient()
  const [tab, setTab] = useState(screen.tabs?.[0] ?? '')
  const [cur, setCur] = useState(() => initialRecordId && node === 'prefs' ? Math.max(0, records.findIndex(r => r.id_chart_preference === initialRecordId)) : 0)
  const preferenceGrid = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (node !== 'prefs') return
    preferenceGrid.current?.querySelectorAll('tbody tr')[cur]?.scrollIntoView?.({ block: 'nearest' })
  }, [cur, node, records.length])
  const sourceRecord = records[cur]
  const recordId = sourceRecord?.id_chart_preference ?? ''
  const record = node === 'prefs' && sourceRecord ? { ...sourceRecord, ...drafts[recordId] } : sourceRecord
  const changePreference = (field: string, value: string) => {
    if (recordId) setDrafts(previous => ({ ...previous, [recordId]: { ...previous[recordId], [field]: value } }))
  }
  const encounterId = record?.id_encounter && record.id_encounter !== '-1' && record.id_encounter !== '0' ? record.id_encounter : ''
  const form = screen.forms?.[tab] ?? screen
  const reactions = record ? (node === 'events' ? data?.reaction_event.filter(r => r.id_adverse_event === record.id_adverse_event) : data?.reaction_risk.filter(r => r.id_allergy === record.id_allergy)) ?? [] : []

  const commands: PBCommand[] = screen.commands.map((c) =>
    c === null ? null : { label: c, disabled: screen.disabled?.includes(c), onClick: node !== 'prefs' ? undefined
      : c === 'Save' ? () => setSaved(drafts)
      : c === 'Undo' ? () => setDrafts(previous => ({ ...previous, [recordId]: saved[recordId] ?? {} }))
      : c === 'Refresh' ? () => { setDrafts({}); setSaved({}) } : undefined },
  )
  const columns: PBColumn<Record<string, string>>[] = screen.columns.map((c) => ({
    key: c.key,
    auditId: c.auditId,
    header: c.header,
    width: c.width,
    align: c.align,
    dots: c.dots,
    render: c.check ? (r) => <PBCheckbox checked={r[c.key] === '✓' || r[c.key] === 'Y'} /> : undefined,
  }))

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
        {screen.viewSelect && <PBSelect options={screen.viewSelect} w={104} />}
      </div>

      {screen.filters && (
        <div className="pb-row pb-row--gap-lg" style={{ padding: '0 8px 3px' }}>
          <span>Show:</span>
          {screen.filters.map((f) => <PBCheckbox key={f.label} label={f.label} checked={f.checked} />)}
          <span className="pb-row__spacer" />
          <span>Category:</span><PBSelect options={['', 'PSYCH', 'LAB', 'VITALS']} w={130} />
        </div>
      )}

      {screen.banner && <div style={{ padding: '2px 8px 3px', flex: 'none' }}>{screen.banner}</div>}

      <div ref={preferenceGrid} style={{ padding: '0 3px', height: node === 'prefs' ? 278 : 220, flex: 'none', display: 'flex' }}>
        <PBDataWindow
          columns={columns}
          rows={node === 'prefs' ? rowsFromExport('prefs', records.map(r => ({ ...r, ...drafts[r.id_chart_preference ?? ''] }))) : screen.rows}
          current={cur}
          rowTutorialId={node === 'prefs' ? (_r, i) => `host.mois.row.preference-${records[i]?.id_chart_preference}` : undefined}
          onCurrentChange={i => { setCur(i); setEncounterOpen(false) }}
          rowStatus={(r) => (screen.flagKey && r[screen.flagKey] === 'H' ? 'flag' : 'normal')}
          empty={`No ${screen.title.toLowerCase()} on file.`}
        />
      </div>

      {/* detail body, with the acknowledgement rail alongside where present */}
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 4, padding: '4px 3px 0' }}>
        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex' }}>
          {screen.tabs ? (
            <PBTabs tabs={screen.tabs} active={tab} onChange={setTab} compact>
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
              ) : tab === 'Panel (0)' ? (
                <div className="pb-dw__empty" style={{ padding: 24 }}>No panel detail available.</div>
              ) : node === 'prefs' ? <PreferencesDetail key={recordId} record={record} records={records} onChange={changePreference} /> : screen.title === 'Measurements' ? <MeasureReportPane detail={tab === 'Detail'} row={screen.rows[cur]} /> : detail}
            </PBTabs>
          ) : (
            <div style={{ flex: '1 1 auto', minWidth: 0, background: 'var(--pb-window)', border: '1px solid var(--pb-border)', overflow: 'auto' }}>
              {detail}
            </div>
          )}
        </div>

        {screen.rail && !screen.plain && (
          <div style={{ width: 156, flex: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="pb-groupbox" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <PBBand>Acknowledgement History</PBBand>
              <div style={{ flex: '1 1 auto', minHeight: 0 }} />
            </div>
            <div className="pb-groupbox" style={{ flex: 'none' }}>
              <PBBand>Workflow Summary</PBBand>
              <div style={{ padding: '4px 6px' }}>
                {[['Messages:', '0'], ['Tasks:', '0'], ['Acknowledgements:', '0']].map(([k, v]) => (
                  <div className="pb-row" key={k} style={{ gap: 0 }}>
                    <span>{k}</span><span className="pb-row__spacer" /><span>{v}</span>
                  </div>
                ))}
                <div style={{ textAlign: 'center', marginTop: 2 }}>
                  <button className="pb-link">View Detail…</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* the signature / provenance footer */}
      {screen.footer && !screen.plain && (
        <div className="pb-row" style={{ padding: '2px 8px 0', gap: 0 }}>
          <span style={{ width: 70 }}>Source:</span>
          <span style={{ width: 92 }}>{record?.str_source ?? ''}</span>
          <span>Sent Date:&nbsp;</span><span style={{ width: 100 }}>{record?.dtm_sent ?? ''}</span>
          <span>Code:&nbsp;&nbsp;{record?.str_code ?? ''}</span>
          <span className="pb-row__spacer" />
          <button className="pb-link">{record?.str_signature ?? ''}</button>
        </div>
      )}
      <div className="pb-row" style={{ padding: '0 8px 4px', gap: 0 }}>
        <span>Created:&nbsp;&nbsp;&nbsp;{stamp(record)}</span>
        <span style={{ width: 28 }} />
        <span>Last Modified: {stamp(record, 'modify')}</span>
        <span className="pb-row__spacer" />
        {node === 'prefs' ? record && <button type="button" className="pb-link" onClick={() => setEncounterOpen(true)}>ENC# {encounterId || 'EMPTY'}</button> : record?.id_encounter && <button className="pb-link">ENC# {record.id_encounter}</button>}
      </div>
      {node === 'prefs' && record && encounterOpen && <PreferenceEncounterDialog key={recordId} encounterId={encounterId}
        encounters={encounters} onChange={id => changePreference('id_encounter', id)} onClose={() => setEncounterOpen(false)} />}
    </>
  )
}
