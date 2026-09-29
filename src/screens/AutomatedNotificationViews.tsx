import { useState } from 'react'
import {
  CALL_LISTS, CALL_LISTS_KEY, NRS_PROVIDERS, NRS_SETUP, NRS_SETUP_KEY, callListDot,
  type CallList, type NrsSetup,
} from '../data/notificationService'
import { MOIS_TODAY } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import {
  PBCheckbox, PBCommandRow, PBDataWindow, PBGroup, PBInput, PBLookup, PBRadio, PBSelect, PBTextArea, PBViewHeader, pbSlug,
} from '../pb'
import { Btn, DetailWindow, FieldLabel, FilterBand, TopMessage } from './AdminExchangeKit'
import { registerFolderView, type FolderViewProps } from './folderViewRegistry'
import { ReadOnlyField } from './formKit'

/* ============================================================================
   Data Exchange ▸ Automated Notifications — Setup / Registration, Call Lists
   and a Call List's detail (the patients' SMS / e-mail responses).
   Article 303385 "Automated Notifications"; data in data/notificationService.ts.

   PROVENANCE
   · Setup / Registration — `77bc0623…` (v02.31.27): Save / Close Window.
     Left: "General Settings" (Enable the Automated Notifications service
     Yes/No; Automatically close Call Lists past ending date Yes/No; Comment)
     and "Scheduler Settings" (three EXCLUDED/INCLUDED drop-downs beside
     Appointment Statuses / Patient Statuses / Visit Codes, each with "…";
     Exclude Day Book items with 00:00 appointments; Automatically generate
     Call Lists for Provider Day Books; Generate … once daily at hh : mm;
     For the following Providers: Select / Provider grid). Right: "Call List
     Defaults" (Call List Type / Default Message / Days Ahead) and "Clinic
     Settings" (consent Yes/No, Assume consent for patients aged or older
     than, the Contact Preferences grid with Add / Remove, and the note
     "Clinic Contact Preferences can be overridden on a patient level").
     Turning Automatically generate off hides everything below it (the
     article: "If set to No - everything below disappears"); turning consent
     off hides the assume-consent line.
   · Call Lists — `23760faf…` (v02.18.07): Edit Record, Delete Record, Close
     Call List, Refresh, Close Window; filter Beginning (between) two dates,
     Call List Type, Status, Description; grid Beginning / Ending / Type /
     Description / Excluded / Included / Responded / Status / dot; the
     legend "Active: No Responses (red), Some Responses (blue), All Responded
     (green) | Inactive: Past Ending Date (grey), Closed (black)".
     "Double Clicking on a record will open the corresponding 'Call List
     Detail' window."
   · Call List Detail — `68d46b7e…`: title "Call List"; Description, List
     Type, Provider, Begin Calling n Days in Advance, Message, Status,
     Calling Begins, Day Book Date, Note; Created / Last Modified; an
     "Items" band with Show Excluded, Open Chart, Create Task, Ack. All; the
     grid Contact / Chart / First Name / Last Name / Appointment / Service
     Location / Last Call / Status / Response / Acknowledge. The contact
     block under the grid ("viewing the email address or cell number the
     reminder was sent to, at the bottom of this window") and the Save (F2)
     / Close buttons are below the capture's crop: INFERRED.
     Open Chart opens the patient's Encounters folder ("which will take you
     to their Encounters folder"); Create Task opens Create New Task on
     that chart.

   Reported: `host.screen.rows`, `host.screen.row` (call list id),
   `host.screen.saved`, `host.screen.acknowledged`, `host.dialog`
   call-list-detail.
   ========================================================================= */

/* --- Setup / Registration ---------------------------------------------------- */
function YesNo({ name, value, onChange }: { name: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <span className="pb-row" style={{ gap: 8 }}>
      <PBRadio name={name} label="Yes" checked={value} onChange={() => onChange(true)} tutorialId={`host.mois.field.${name}-yes`} />
      <PBRadio name={name} label="No" checked={!value} onChange={() => onChange(false)} tutorialId={`host.mois.field.${name}-no`} />
    </span>
  )
}

function NrsSetupView({ close }: FolderViewProps) {
  const [saved, setSaved] = useSessionState<NrsSetup>(NRS_SETUP_KEY, NRS_SETUP)
  const [s, setS] = useState<NrsSetup>(saved)
  const [prefRow, setPrefRow] = useState(0)
  const dirty = JSON.stringify(s) !== JSON.stringify(saved)
  useScreenReport({ saved: !dirty, enabled: s.enabled })
  const set = (patch: Partial<NrsSetup>) => setS((x) => ({ ...x, ...patch }))
  const statusRow = (label: string, mode: 'apptMode' | 'patientMode' | 'visitMode', list: 'apptStatuses' | 'patientStatuses' | 'visitCodes') => (
    <div className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
      <PBSelect w={100} options={['EXCLUDED', 'INCLUDED']} value={s[mode]} onChange={(e) => set({ [mode]: e.target.value } as Partial<NrsSetup>)} data-tutorial-id={`host.mois.field.nrs-${pbSlug(label)}-mode`} />
      <FieldLabel w={130}>{label}</FieldLabel>
      <PBLookup w={190} value={s[list]} name={`nrs-${pbSlug(label)}`} onChange={(v) => set({ [list]: v } as Partial<NrsSetup>)} />
    </div>
  )
  return (
    <>
      <PBViewHeader title="Setup / Registration" />
      <PBCommandRow commands={[
        { label: 'Save', onClick: () => setSaved(s) },
        { label: 'Close Window', onClick: close },
      ]} />
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', display: 'flex', gap: 10, padding: 10, background: 'var(--pb-face)' }}>
        <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PBGroup title="General Settings">
            <div data-tutorial-id="host.mois.group.nrs-general-settings">
              <div className="pb-row"><span style={{ flex: 1 }}>Enable the Automated Notifications service:</span><YesNo name="nrs-enabled" value={s.enabled} onChange={(enabled) => set({ enabled })} /></div>
              <div className="pb-row"><span style={{ flex: 1 }}>Automatically close Call Lists past ending date:</span><YesNo name="nrs-close-past" value={s.closePast} onChange={(closePast) => set({ closePast })} /></div>
              <div className="pb-row" style={{ alignItems: 'flex-start' }}>
                <span style={{ width: 70 }}>Comment:</span>
                <PBTextArea rows={5} value={s.comment} onChange={(e) => set({ comment: e.target.value })} style={{ flex: 1, resize: 'none' }} data-tutorial-id="host.mois.field.nrs-comment" />
              </div>
            </div>
          </PBGroup>
          <PBGroup title="Scheduler Settings">
            <div data-tutorial-id="host.mois.group.nrs-scheduler-settings">
              {statusRow('Appointment Statuses:', 'apptMode', 'apptStatuses')}
              {statusRow('Patient Statuses:', 'patientMode', 'patientStatuses')}
              {statusRow('Visit Codes:', 'visitMode', 'visitCodes')}
              <div className="pb-row"><span style={{ flex: 1 }}>Exclude Day Book items with 00:00 appointments:</span><YesNo name="nrs-exclude-midnight" value={s.excludeMidnight} onChange={(excludeMidnight) => set({ excludeMidnight })} /></div>
              <div className="pb-row"><span style={{ flex: 1 }}>Automatically generate Call Lists for Provider Day Books:</span><YesNo name="nrs-auto-generate" value={s.autoGenerate} onChange={(autoGenerate) => set({ autoGenerate })} /></div>
              {s.autoGenerate && (
                <>
                  <div className="pb-row" style={{ gap: 6, paddingLeft: 50 }}>
                    <span>Generate Call Lists for Day Books once daily at:</span>
                    <PBInput w={34} align="center" value={s.atHour} onChange={(e) => set({ atHour: e.target.value })} data-tutorial-id="host.mois.field.nrs-generate-hour" />
                    <span>:</span>
                    <PBInput w={34} align="center" value={s.atMinute} onChange={(e) => set({ atMinute: e.target.value })} data-tutorial-id="host.mois.field.nrs-generate-minute" />
                  </div>
                  <div style={{ paddingLeft: 50 }}>For the following Providers:</div>
                  <div style={{ height: 220, display: 'flex', margin: '2px 0 0 50px' }}>
                    <PBDataWindow
                      rows={NRS_PROVIDERS.map((name) => ({ name }))}
                      rowTutorialId={(r) => `host.mois.row.nrs-provider-${pbSlug(r.name)}`}
                      columns={[
                        {
                          key: 'select', header: 'Select', width: 60, align: 'center',
                          render: (r) => (
                            <PBCheckbox checked={s.providers.includes(r.name)} tutorialId={`host.mois.cell.nrs-provider-${pbSlug(r.name)}`}
                              onChange={(on) => set({ providers: on ? [...s.providers, r.name] : s.providers.filter((p) => p !== r.name) })} />
                          ),
                        },
                        { key: 'name', header: 'Provider', width: 300 },
                      ]}
                    />
                  </div>
                </>
              )}
            </div>
          </PBGroup>
        </div>
        <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PBGroup title="Call List Defaults">
            <div style={{ whiteSpace: 'normal' }}>Default messages when Call Lists are created; Default number of days before calling begins:</div>
            <div style={{ height: 90, display: 'flex', marginTop: 4 }} data-tutorial-id="host.mois.group.nrs-call-list-defaults">
              <PBDataWindow
                rows={s.defaults}
                rowTutorialId={(r) => `host.mois.row.nrs-default-${pbSlug(r.type)}`}
                columns={[
                  { key: 'type', header: 'Call List Type', width: 150 },
                  { key: 'message', header: 'Default Message', width: 150 },
                  {
                    key: 'days', header: 'Days Ahead', width: 90, align: 'center',
                    render: (r, i) => (
                      <PBInput w={60} align="center" value={r.days} data-tutorial-id={`host.mois.field.nrs-days-ahead-${pbSlug(r.type)}`}
                        onChange={(e) => set({ defaults: s.defaults.map((d, j) => (j === i ? { ...d, days: e.target.value } : d)) })} />
                    ),
                  },
                ]}
              />
            </div>
          </PBGroup>
          <PBGroup title="Clinic Settings" fill>
            <div data-tutorial-id="host.mois.group.nrs-clinic-settings">
              <div className="pb-row"><span style={{ flex: 1 }}>Patients must provide consent to Automated Notifications:</span><YesNo name="nrs-consent" value={s.consentRequired} onChange={(consentRequired) => set({ consentRequired })} /></div>
              {s.consentRequired && (
                <div className="pb-row" style={{ gap: 6, paddingLeft: 30 }}>
                  <PBCheckbox label="Assume consent for patients aged or older than:" checked={s.assumeConsent} onChange={(assumeConsent) => set({ assumeConsent })} tutorialId="host.mois.field.nrs-assume-consent" />
                  <PBInput w={80} value={s.assumeAge} onChange={(e) => set({ assumeAge: e.target.value })} data-tutorial-id="host.mois.field.nrs-assume-age" />
                </div>
              )}
              <div className="pb-row" style={{ marginTop: 8, background: '#e0e0e0', border: '1px solid #666', fontWeight: 700, padding: '0 0 0 6px' }}>
                <span style={{ flex: 1 }}>Contact Preferences</span>
                <Btn id="nrs-preference-add" width={90} onClick={() => { set({ preferences: [...s.preferences, { reason: 'SCHEDULER', order: '', method: 'SMS', source: '' }] }); setPrefRow(s.preferences.length) }}>Add</Btn>
                <Btn id="nrs-preference-remove" width={90} onClick={() => { set({ preferences: s.preferences.filter((_, i) => i !== prefRow) }); setPrefRow(0) }}>Remove</Btn>
              </div>
              <div style={{ height: 180, display: 'flex' }}>
                <PBDataWindow
                  rows={s.preferences}
                  current={prefRow}
                  onCurrentChange={setPrefRow}
                  gutter={false}
                  rowTutorialId={(_, i) => `host.mois.row.nrs-preference-${i + 1}`}
                  columns={[
                    { key: 'reason', header: 'Reason', width: 130, render: (r, i) => (i === prefRow ? <PBSelect w={120} options={['SCHEDULER', 'RECALL', 'OTHER']} value={r.reason} onChange={(e) => set({ preferences: s.preferences.map((p, j) => (j === i ? { ...p, reason: e.target.value } : p)) })} data-tutorial-id="host.mois.field.nrs-preference-reason" /> : r.reason) },
                    { key: 'order', header: 'Order', width: 50, align: 'center' },
                    { key: 'method', header: 'Method', width: 110, render: (r, i) => (i === prefRow ? <PBSelect w={100} options={['SMS', 'EMAIL']} value={r.method} onChange={(e) => set({ preferences: s.preferences.map((p, j) => (j === i ? { ...p, method: e.target.value } : p)) })} data-tutorial-id="host.mois.field.nrs-preference-method" /> : r.method) },
                    { key: 'source', header: 'Source', width: 140 },
                  ]}
                />
              </div>
              <div style={{ textAlign: 'center', padding: '6px 0', whiteSpace: 'normal' }}>
                Clinic Contact Preferences can be overridden on a patient level<br />(Chart -&gt; Demographics -&gt; Settings Tab).
              </div>
            </div>
          </PBGroup>
        </div>
      </div>
    </>
  )
}

/* --- Call Lists ------------------------------------------------------------------ */
const DOT: Record<ReturnType<typeof callListDot>, string> = { red: '#e02020', blue: '#1f5fb0', green: '#20b040', grey: '#8a8a8a', black: '#000' }
const Dot = ({ colour }: { colour: string }) => <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: colour }} />

function CallListsView({ close, openNode, open }: FolderViewProps) {
  const [lists, setLists] = useSessionState<CallList[]>(CALL_LISTS_KEY, CALL_LISTS)
  const [from, setFrom] = useState('2026.08.18')
  const [to, setTo] = useState(MOIS_TODAY)
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [desc, setDesc] = useState('')
  const [applied, setApplied] = useState({ from: '2026.08.18', to: MOIS_TODAY, type: '', status: '', desc: '' })
  const [cur, setCur] = useState(0)
  const [detail, setDetail] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<null | 'delete' | 'close'>(null)

  const rows = lists
    .filter((l) => (!applied.from || l.beginning >= applied.from) && (!applied.to || l.beginning <= applied.to))
    .filter((l) => (!applied.type || l.type === applied.type) && (!applied.status || l.status === applied.status))
    .filter((l) => !applied.desc || l.description.toLowerCase().includes(applied.desc.toLowerCase()))
    .map((l) => {
      const included = l.items.filter((i) => !i.excluded)
      return {
        id: l.id, beginning: l.beginning, ending: l.ending, type: l.type, description: l.description,
        excluded: l.items.length - included.length, included: included.length,
        responded: included.filter((i) => i.response).length, status: l.status, dot: callListDot(l, MOIS_TODAY),
      }
    })
  const row = rows[cur]
  const opened = lists.find((l) => l.id === detail) ?? null
  useScreenReport({ rows: rows.length, row: row?.id ?? null })
  const refresh = () => { setApplied({ from, to, type, status, desc }); setCur(0) }

  return (
    <>
      <PBViewHeader title="Call Lists" />
      <PBCommandRow commands={[
        { label: 'Edit Record', onClick: () => { if (row) setDetail(row.id) } },
        { label: 'Delete Record', onClick: () => { if (row) setConfirm('delete') } },
        { label: 'Close Call List', onClick: () => { if (row && row.status !== 'CLOSED') setConfirm('close') } },
        { label: 'Refresh', onClick: refresh },
        { label: 'Close Window', onClick: close },
      ]} />
      <FilterBand anchor="host.mois.group.call-list-filter">
        <div style={{ display: 'grid', gridTemplateColumns: '70px 90px 100px 130px 90px 1fr', gap: '3px 6px', alignItems: 'center' }}>
          <span>Beginning:</span><PBInput w={80} value={from} onChange={(e) => setFrom(e.target.value)} data-tutorial-id="host.mois.field.call-list-from" />
          <span style={{ textAlign: 'right' }}>Call List Type:</span>
          <PBSelect w={120} options={['', 'SCHEDULER', 'RECALL', 'OTHER']} value={type} onChange={(e) => setType(e.target.value)} data-tutorial-id="host.mois.field.call-list-type" />
          <span style={{ textAlign: 'right' }}>Description:</span><PBInput w={260} value={desc} onChange={(e) => setDesc(e.target.value)} data-tutorial-id="host.mois.field.call-list-description" />
          <span>(between)</span><PBInput w={80} value={to} onChange={(e) => setTo(e.target.value)} data-tutorial-id="host.mois.field.call-list-to" />
          <span style={{ textAlign: 'right' }}>Status:</span>
          <PBSelect w={120} options={['', 'NEW', 'STARTED', 'CLOSED']} value={status} onChange={(e) => setStatus(e.target.value)} data-tutorial-id="host.mois.field.call-list-status" />
          <span /><span />
        </div>
      </FilterBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(r) => setDetail(r.id)}
          rowTutorialId={(r) => `host.mois.row.call-list-${r.id}`}
          columns={[
            { key: 'beginning', header: 'Beginning', width: 76, align: 'center' },
            { key: 'ending', header: 'Ending', width: 76, align: 'center' },
            { key: 'type', header: 'Type', width: 100, align: 'center' },
            { key: 'description', header: 'Description', width: 280 },
            { key: 'excluded', header: 'Excluded', width: 66, align: 'center' },
            { key: 'included', header: 'Included', width: 66, align: 'center' },
            { key: 'responded', header: 'Responded', width: 70, align: 'center' },
            { key: 'status', header: 'Status', width: 76, align: 'center' },
            { key: 'dot', header: '', width: 26, align: 'center', render: (r) => <Dot colour={DOT[r.dot]} /> },
          ]}
          empty="No call lists match the filter."
        />
      </div>
      <div className="pb-row" style={{ gap: 12, padding: 6, flex: 'none' }} data-tutorial-id="host.mois.group.call-list-legend">
        <PBGroup title="Active" style={{ flex: '1 1 60%' }}>
          <div className="pb-row" style={{ gap: 40 }}>
            <span><Dot colour={DOT.red} />&nbsp; No Responses</span><span><Dot colour={DOT.blue} />&nbsp; Some Responses</span><span><Dot colour={DOT.green} />&nbsp; All Responded</span>
          </div>
        </PBGroup>
        <PBGroup title="Inactive" style={{ flex: '1 1 40%' }}>
          <div className="pb-row" style={{ gap: 40 }}><span><Dot colour={DOT.grey} />&nbsp; Past Ending Date</span><span><Dot colour={DOT.black} />&nbsp; Closed</span></div>
        </PBGroup>
      </div>
      {confirm && row && (
        <TopMessage id={confirm === 'delete' ? 'delete-call-list' : 'close-call-list'} title={confirm === 'delete' ? 'Delete Record' : 'Close Call List'} icon="question" buttons={['Yes', 'No']} prefix="call-list-confirm-"
          onClose={(b) => {
            if (b === 'Yes') {
              if (confirm === 'delete') { setLists((all) => all.filter((l) => l.id !== row.id)); setCur(0) }
              else setLists((all) => all.map((l) => (l.id === row.id ? { ...l, status: 'CLOSED' } : l)))
            }
            setConfirm(null)
          }}>
          {confirm === 'delete' ? 'Are you sure you want to delete this call list?' : 'Close this call list? No further calls will be made.'}
        </TopMessage>
      )}
      {opened && (
        <CallListDetail
          list={opened}
          onClose={() => setDetail(null)}
          onSave={(next) => { setLists((all) => all.map((l) => (l.id === next.id ? next : l))); setDetail(null) }}
          onOpenChart={() => { setDetail(null); openNode('encounters') }}
          onCreateTask={(chart, patient) => open('create-task', { chart, patient })}
        />
      )}
    </>
  )
}

function CallListDetail({ list, onClose, onSave, onOpenChart, onCreateTask }: {
  list: CallList
  onClose: () => void
  onSave: (l: CallList) => void
  onOpenChart: () => void
  onCreateTask: (chart: string, patient: string) => void
}) {
  const [l, setL] = useState(list)
  const [showExcluded, setShowExcluded] = useState(true)
  const [cur, setCur] = useState(0)
  const items = l.items.filter((i) => showExcluded || !i.excluded)
  const item = items[cur]
  useScreenReport({ acknowledged: l.items.filter((i) => i.ack).length, response: item ? pbSlug(item.response || 'none') : null })
  const ro = (value: string, w: number | string) => <ReadOnlyField w={w} value={value} />
  const ack = (chart: string, on: boolean) => setL((x) => ({ ...x, items: x.items.map((i) => (i.chart === chart ? { ...i, ack: on } : i)) }))
  return (
    <DetailWindow id="call-list-detail" title="Call List" width={900} height={600} onClose={onClose}
      buttons={<>
        <Btn id="call-detail-save" isDefault width={90} onClick={() => onSave(l)}>Save (F2)</Btn>
        <Btn id="call-detail-close" width={90} onClick={onClose}>Close</Btn>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '84px 340px 100px 110px 1fr', rowGap: 3, columnGap: 6, padding: '6px 8px', background: '#fff', flex: 'none', alignItems: 'center' }}>
        <span>Description:</span><PBInput w={330} value={l.description} onChange={(e) => setL({ ...l, description: e.target.value })} data-tutorial-id="host.mois.field.call-detail-description" /><span /><span />
        <span style={{ gridRow: 'span 5', display: 'flex', gap: 4 }}>Note:<PBTextArea rows={5} value={l.note} onChange={(e) => setL({ ...l, note: e.target.value })} style={{ flex: 1, resize: 'none' }} /></span>
        <span>List Type:</span>{ro(l.type, 120)}<span>Status:</span>{ro(l.status, 100)}
        <span>Provider:</span>{ro(l.provider, 120)}<span /><span />
        <span>Begin Calling:</span><span className="pb-row" style={{ gap: 6 }}>{ro(l.daysAhead, 40)} Days in Advance</span><span>Calling Begins:</span>{ro(l.callingBegins, 100)}
        <span>Message:</span>{ro(l.message, 120)}<span>Day Book Date:</span>{ro(l.daybookDate, 100)}
      </div>
      <div className="pb-row" style={{ gap: 30, padding: '3px 8px', background: '#fff', borderTop: '1px solid #c8c8c8', flex: 'none' }}>
        <span>Created:&nbsp;&nbsp; {l.created}</span><span>Last Modified:&nbsp;&nbsp; {l.modified}</span>
      </div>
      <div className="pb-row" style={{ gap: 6, padding: '4px 8px', background: '#f0f0f0', borderTop: '1px solid #c0c0c0', flex: 'none' }}>
        <b>Items</b>
        <span className="pb-row__spacer" />
        <PBCheckbox label="Show Excluded" checked={showExcluded} onChange={setShowExcluded} tutorialId="host.mois.field.call-detail-show-excluded" />
        <Btn id="call-detail-open-chart" width={84} disabled={!item} onClick={onOpenChart}>Open Chart</Btn>
        <Btn id="call-detail-create-task" width={84} disabled={!item} onClick={() => { if (item) onCreateTask(item.chart, `${item.last}, ${item.first}`) }}>Create Task</Btn>
        <Btn id="call-detail-ack-all" width={84} onClick={() => setL((x) => ({ ...x, items: x.items.map((i) => ({ ...i, ack: true })) }))}>Ack. All</Btn>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: '0 4px' }}>
        <PBDataWindow
          rows={items}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(r) => `host.mois.row.call-item-${r.chart}`}
          rowFill={(r) => (r.excluded ? '#eeeeee' : undefined)}
          columns={[
            { key: 'contact', header: 'Contact', width: 80 },
            { key: 'chart', header: 'Chart', width: 56 },
            { key: 'first', header: 'First Name', width: 100 },
            { key: 'last', header: 'Last Name', width: 90 },
            { key: 'appt', header: 'Appointment', width: 76, align: 'center' },
            { key: 'location', header: 'Service Location', width: 110 },
            { key: 'lastCall', header: 'Last Call', width: 110 },
            { key: 'status', header: 'Status', width: 80 },
            { key: 'response', header: 'Response', width: 90 },
            { key: 'ack', header: 'Acknowledge', width: 76, align: 'center', render: (r) => <PBCheckbox checked={r.ack} onChange={(on) => ack(r.chart, on)} tutorialId={`host.mois.cell.call-ack-${r.chart}`} /> },
          ]}
        />
      </div>
      {/* INFERRED — see the header */}
      <div className="pb-row" style={{ gap: 20, padding: '5px 10px', background: '#fff', borderTop: '1px solid #c0c0c0', flex: 'none' }} data-tutorial-id="host.mois.group.call-item-contact">
        <span>Method:&nbsp; <b>{item?.method ?? ''}</b></span>
        <span>{item?.method === 'EMAIL' ? 'eMail:' : 'Cell:'}&nbsp; <b>{item?.to ?? ''}</b></span>
        <span>Response:&nbsp; <b>{item?.response ?? ''}</b></span>
      </div>
    </DetailWindow>
  )
}

registerFolderView(['dx-notif-setup'], NrsSetupView)
registerFolderView(['dx-call-lists'], CallListsView)
