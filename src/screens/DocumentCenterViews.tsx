import { useState } from 'react'
import { MOIS_TODAY } from '../data/patients'
import { SRFAX_ENABLED_ROW, isYes, useSystemSetting } from '../data/systemSettings'
import { useScreenReport } from '../host/screen-state'
import {
  PBBand, PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBLookup, PBSelect, PBTabs, PBTextArea, PBViewHeader, pbSlug,
} from '../pb'
import { TopMessage } from './AdminExchangeKit'
import { GreenBand, Lbl, Radio } from './ExchangeKit'
import { registerFolderView, type FolderViewProps } from './folderViewRegistry'
import { NAVY } from './formKit'

/* ============================================================================
   Data Exchange ▸ Document Center — Inbound Documents (3797121) and
   Outbound Documents (3797120).

   PROVENANCE
   · Inbound Documents — `b3f1d93d…`, `45bc17cd…`, `2964bfa3…`, `76fd6b13…`
     (current build, "MOIS - MARY'S CLINIC"): Scan, Refresh, Open Chart,
     Link to Order, Print, Fax, Rotate Pages, Tear Off, Close Window; a
     Folder drop-down (list headed "Folder": Scanning Folder, Faxes Folder)
     and "Run OCR After Scanning Finishes"; a Files band with Split / Merge /
     Delete over Select / Order / Filename (ticking a file numbers it in
     Order); Preview and OCR Text tabs; under them the Record band the
     Attach Files folder has (CHART NUM, TYPE, History). The folders are
     the ones Administration ▸ Clinic Management ▸ Folder Registration
     holds (`5eb2d158…`, `47480cb5…`) — the two captured names.
     "The highlighted functions below are the same as what can be found in
     the Scan Files and Attach files folder with the addition of the 'Fax'
     option": Scan / Split / Merge / Delete / Rotate behave as the list edit
     they are here, and Attach is the Record band's.
   · Fax — `76fd6b13…`: tick a file, press Fax, the Send eFax window opens
     (eFax Account, Recipient List, Send / Cancel / Cover Page). Send eFax
     belongs to the SRFax stream: this folder opens it by id `send-efax`
     with `{ files, source: 'inbound-documents' }`. While APP SETTING -
     SRFAX ▸ Enabled is not Y, Fax says integrated eFax is off (the
     article: "if you subscribe to efax integration (SR Fax)"). If no
     window is registered under `send-efax`, the same notice explains it.
   · Outbound Documents — `407817ba…`, `0eb0deff…`: Refresh, Check Status,
     Create Task, Create Message, Close Window; a green filter band with
     Status (ALL / FAIL / QUEUED / SUCCESS), Time Frame (All / In Last n
     Weeks / Since / Between … and …) and Other (Record Type ALL, Pat. First
     Name, Pat. Last Name, Fax Account SRFax Test, Sender, Recipient, Fax
     Num.); the grid Date / Time, Sender, Recipient, Patient, Record Type
     (a hyperlink "that will navigate to the record where the document
     lives"), Status. The captured row is kept (HAWES, MARY → BRIGHT HEALTH
     (2505642655), MORRISON, ASHLEE, PAPER FORM, SUCCESS); the rest are
     INFERRED.

   · The Record band as the live DEV client draws it (v02.31.23, 2026;
     ~/github/Mois/references/data-exchange.md "Inbound Documents"): CHART
     NUM, TYPE, BCHN and DOB; Attach and Unattach buttons; Clear After
     Attaching; the History Not Applicable pane; and a Distribute table with
     New and Delete. Attach and Unattach behave as Attach Files' do (the
     article: "the same as … the Attach files folder"): Attach files the
     current file and drops it greyed to the foot of the list, Unattach lifts
     it back. INFERRED: where the two buttons sit (the band's right, beside
     the checkbox), the band's height, and BCHN / DOB left blank until a
     chart is looked up, as Attach Files' PHN / DOB are.

   Reported: `host.screen.folder`, `host.screen.attached` (files attached), `host.screen.checked` (files ticked),
   `host.screen.rows`, `host.screen.filter` (outbound status),
   `host.screen.fax` (sent / disabled / unavailable).
   ========================================================================= */

const FOLDERS: Record<string, string[]> = {
  'Scanning Folder': ['12_10000053.rtf', '146_10000134.jpg', '146_10000135.gif', '20131007_110412_24.pdf', '20131007_110412_25.pdf', '20131007_110412_26.pdf'],
  'Faxes Folder': ['FAX_2026-09-17_0931.pdf', 'FAX_2026-09-17_1402.pdf', 'FAX_2026-09-18_0815.pdf'],
}
const RECORD_TYPES = ['', 'Consult', 'Document', 'Imaging', 'Measure', 'Procedure', 'Facility Admission']

type InFile = { name: string; order: number; attached?: boolean }

function InboundDocumentsView({ close, openNode, open }: FolderViewProps) {
  const srfax = isYes(useSystemSetting(SRFAX_ENABLED_ROW))
  const [folder, setFolder] = useState('Scanning Folder')
  const [ocr, setOcr] = useState(false)
  const [lists, setLists] = useState<Record<string, InFile[]>>(() =>
    Object.fromEntries(Object.entries(FOLDERS).map(([k, v]) => [k, v.map((name) => ({ name, order: 0 }))])))
  const [cur, setCur] = useState(0)
  const [tab, setTab] = useState('Preview')
  const [chart, setChart] = useState('')
  const [type, setType] = useState('')
  const [clear, setClear] = useState(false)
  const [notice, setNotice] = useState<null | 'disabled' | 'unavailable' | 'none'>(null)
  const files = lists[folder] ?? []
  const ticked = files.filter((f) => f.order > 0)
  const current = files[cur]
  useScreenReport({ folder: pbSlug(folder), attached: files.filter((f) => f.attached).length, checked: ticked.length, rows: files.length, fax: notice === 'disabled' ? 'disabled' : notice === 'unavailable' ? 'unavailable' : null })

  const setFiles = (next: InFile[]) => setLists((all) => ({ ...all, [folder]: next }))
  const tick = (i: number, on: boolean) => {
    const max = Math.max(0, ...files.map((f) => f.order))
    setFiles(files.map((f, j) => (j === i ? { ...f, order: on ? max + 1 : 0 } : f)).map((f) => f))
  }
  const attach = () => {
    if (!current || current.attached) return
    setFiles([...files.filter((_, i) => i !== cur), { ...current, attached: true, order: 0 }])
    if (clear) { setType(''); setChart('') }
  }
  const unattach = () => {
    if (!current?.attached) return
    setFiles([{ ...current, attached: false }, ...files.filter((_, i) => i !== cur)])
    setCur(0)
  }
  const fax = () => {
    if (!ticked.length) { setNotice('none'); return }
    if (!srfax) { setNotice('disabled'); return }
    if (!open('send-efax', { files: ticked.map((f) => f.name).join(';'), source: 'inbound-documents' })) setNotice('unavailable')
  }
  const commands = [
    { label: 'Scan', onClick: () => setFiles([...files, { name: `SCAN_${MOIS_TODAY.replace(/\./g, '')}_${files.length + 1}.pdf`, order: 0 }]) },
    { label: 'Refresh', onClick: () => setCur(0) },
    { label: 'Open Chart', onClick: () => openNode('summary') },
    { label: 'Link to Order', onClick: () => { open('order-linking-service') } },
    { label: 'Print' },
    { label: 'Fax', onClick: fax },
    { label: 'Rotate Pages' },
    { label: 'Tear Off' },
    { label: 'Close Window', onClick: close },
  ]

  return (
    <>
      <PBViewHeader title="Inbound Documents" />
      <PBCommandRow commands={commands} />
      <div className="pb-row" style={{ gap: 8, padding: '3px 6px', background: 'var(--pb-face)', flex: 'none' }} data-tutorial-id="host.mois.group.inbound-folder">
        <span>Folder:</span>
        <PBSelect w={260} options={Object.keys(FOLDERS)} value={folder} onChange={(e) => { setFolder(e.target.value); setCur(0) }} data-tutorial-id="host.mois.field.inbound-folder" />
        <PBCheckbox label="Run OCR After Scanning Finishes" checked={ocr} onChange={setOcr} tutorialId="host.mois.field.run-ocr-after-scanning" />
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 3, padding: '0 3px' }}>
        <div style={{ width: 230, flex: 'none', display: 'flex', flexDirection: 'column' }}>
          <PBBand right={<>
            <PBButton size="sm" command="split">Split</PBButton>
            <PBButton size="sm" command="merge" onClick={() => {
              if (ticked.length < 2) return
              const merged = { name: `MERGED_${ticked[0]!.name}`, order: 0 }
              setFiles([merged, ...files.filter((f) => f.order === 0)])
              setCur(0)
            }}>Merge</PBButton>
            <PBButton size="sm" command="delete-file" onClick={() => { setFiles(files.filter((_, i) => i !== cur)); setCur(0) }}>Delete</PBButton>
          </>}>Files</PBBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <PBDataWindow
              rows={files}
              current={cur}
              onCurrentChange={setCur}
              gutter={false}
              rowTutorialId={(f) => `host.mois.row.file-${pbSlug(f.name)}`}
              columns={[
                { key: 'select', header: 'Select', width: 42, align: 'center', render: (f, i) => <PBCheckbox checked={f.order > 0} onChange={(on) => tick(i, on)} tutorialId={`host.mois.cell.select-${pbSlug(f.name)}`} /> },
                { key: 'order', header: 'Order', width: 38, align: 'center', render: (f) => (f.order ? String(f.order) : '') },
                { key: 'name', header: 'Filename', width: 150, render: (f) => <span style={f.attached ? { color: '#a0a0a0' } : undefined}>{f.name}</span> },
              ]}
            />
          </div>
        </div>
        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <PBTabs tabs={['Preview', 'OCR Text']} active={tab} onChange={setTab} compact>
            {tab === 'Preview' ? (
              <div style={{ flex: '1 1 auto', minHeight: 0, background: '#808080', padding: 10, overflow: 'auto' }} data-tutorial-id="host.mois.field.inbound-preview">
                <div style={{ background: '#fff', maxWidth: 520, margin: '0 auto', minHeight: 320, padding: 24, fontFamily: 'var(--pb-font-mono, monospace)' }}>
                  {current ? <>Dr. Bill<br />2000 - Central Street<br /><br />{current.name}</> : null}
                </div>
              </div>
            ) : (
              <PBTextArea data-tutorial-id="host.mois.field.ocr-text" defaultValue="" style={{ flex: '1 1 auto', resize: 'none' }} />
            )}
          </PBTabs>
        </div>
      </div>
      <div style={{ flex: 'none', height: 150, display: 'flex', gap: 3, padding: 3 }}>
        <div className="pb-groupbox" data-tutorial-id="host.mois.group.record" style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <PBBand right={<>
            <PBButton size="sm" command="inbound-attach" onClick={attach}>Attach</PBButton>
            <PBButton size="sm" command="inbound-unattach" onClick={unattach}>Unattach</PBButton>
            <PBCheckbox label="Clear After Attaching" checked={clear} onChange={setClear} tutorialId="host.mois.field.clear-after-attaching" />
          </>}>Record</PBBand>
          <div style={{ background: 'linear-gradient(#1e86c8, #0b5fa0)', color: '#fff', padding: '4px 8px', display: 'grid', gridTemplateColumns: '80px 110px 1fr 40px 110px', gap: '3px 6px', alignItems: 'center' }}>
            <span>CHART NUM:</span><PBLookup w={104} value={chart} onChange={setChart} name="inbound-chart" />
            <span />
            <span>BCHN:</span><span />
            <span>TYPE:</span>
            <PBSelect w={104} options={RECORD_TYPES} value={type} onChange={(e) => setType(e.target.value)} data-tutorial-id="host.mois.field.record-type" />
            <span />
            <span>DOB:</span><span />
          </div>
          <div style={{ flex: '1 1 auto', background: 'var(--pb-face)' }} />
        </div>
        <div style={{ width: 220, flex: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div className="pb-groupbox" style={{ flex: '1 1 auto' }}>
            <PBBand>{type ? 'History (+/- 15 days from discharged)' : 'History Not Applicable'}</PBBand>
          </div>
          <div className="pb-groupbox" data-tutorial-id="host.mois.group.distribute" style={{ height: 70, flex: 'none' }}>
            <PBBand right={<><PBButton size="sm" command="distribute-new">New</PBButton><PBButton size="sm" command="distribute-delete">Delete</PBButton></>}>Distribute</PBBand>
            <div style={{ background: '#c8dcfa', padding: '1px 16px' }}>User Name</div>
          </div>
        </div>
      </div>
      {notice && (
        <TopMessage id="inbound-fax-notice" title="Fax" icon={notice === 'none' ? 'info' : 'warn'} buttons={['OK']} prefix="inbound-fax-" onClose={() => setNotice(null)}>
          {notice === 'none'
            ? 'Select the document(s) to fax by ticking the Select box.'
            : notice === 'disabled'
              ? 'Integrated eFax is not enabled.\nSee System Settings - APP SETTING - SRFAX.'
              : 'The Send eFax window is not available in this training stage.'}
        </TopMessage>
      )}
    </>
  )
}

/* --- Outbound Documents ------------------------------------------------------------ */
type Outbound = { when: string; sender: string; recipient: string; patient: string; type: string; status: 'SUCCESS' | 'FAIL' | 'QUEUED'; node: string }

const OUTBOUND: Outbound[] = [
  { when: '2026-09-17 15:19:09', sender: 'HAWES, MARY', recipient: 'BRIGHT HEALTH (2505642655)', patient: 'MORRISON, ASHLEE', type: 'PAPER FORM', status: 'SUCCESS', node: 'paper' },
  { when: '2026-09-16 10:02:44', sender: 'HAWES, MARY', recipient: 'NORTHERN IMAGING (2505550199)', patient: 'WHO, LUCY', type: 'CONSULT', status: 'SUCCESS', node: 'consults' },
  { when: '2026-09-15 16:40:12', sender: 'HALLIWELL, A.', recipient: 'PG PHARMACY (2505550155)', patient: 'DIABETES, BETTY', type: 'PRESCRIPTION', status: 'FAIL', node: 'rx' },
  { when: '2026-09-18 08:55:31', sender: 'HAWES, MARY', recipient: 'UHNBC LAB (2505550177)', patient: 'MOIS, SAM', type: 'DOCUMENT', status: 'QUEUED', node: 'documents' },
]

function OutboundDocumentsView({ close, openNode, open }: FolderViewProps) {
  const srfax = isYes(useSystemSetting(SRFAX_ENABLED_ROW))
  const [status, setStatus] = useState('ALL')
  const [frame, setFrame] = useState('In Last')
  const [n, setN] = useState('2')
  const [unit, setUnit] = useState('Weeks')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [cur, setCur] = useState(0)
  const [checked, setChecked] = useState(false)
  const rows = srfax
    ? OUTBOUND
      .filter((r) => status === 'ALL' || r.status === status)
      .filter((r) => (!first || r.patient.split(', ')[1]?.toLowerCase().startsWith(first.toLowerCase())) && (!last || r.patient.toLowerCase().startsWith(last.toLowerCase())))
      .sort((a, b) => b.when.localeCompare(a.when))
    : []
  const row = rows[cur]
  useScreenReport({ rows: rows.length, filter: pbSlug(status), status: checked ? 'checked' : null })
  return (
    <>
      <PBViewHeader title="Outbound Documents" />
      <PBCommandRow commands={[
        { label: 'Refresh', onClick: () => setCur(0) },
        { label: 'Check Status', onClick: () => setChecked(true) },
        { label: 'Create Task', onClick: () => { if (row) open('create-task', { patient: row.patient, detail: `Fax to ${row.recipient}: ${row.status}` }) } },
        { label: 'Create Message', onClick: () => { if (row) open('create-message', { patient: row.patient, subject: `Fax ${row.status}` }) } },
        { label: 'Close Window', onClick: close },
      ]} />
      <GreenBand anchor="host.mois.group.outbound-filter" style={{ display: 'flex', gap: 30, alignItems: 'flex-start' }}>
        <div data-tutorial-id="host.mois.group.outbound-status">
          <b style={{ color: NAVY.caption }}>Status</b>
          {['ALL', 'FAIL', 'QUEUED', 'SUCCESS'].map((s) => (
            <div key={s}><Radio name="outbound-status" label={s} checked={status === s} onChange={() => { setStatus(s); setCur(0) }} anchor={`host.mois.field.outbound-status-${pbSlug(s)}`} /></div>
          ))}
        </div>
        <div data-tutorial-id="host.mois.group.outbound-time-frame">
          <b style={{ color: NAVY.caption }}>Time Frame</b>
          <div><Radio name="outbound-frame" label="All" checked={frame === 'All'} onChange={() => setFrame('All')} anchor="host.mois.field.outbound-frame-all" /></div>
          <div className="pb-row" style={{ gap: 6 }}>
            <Radio name="outbound-frame" label="In Last" checked={frame === 'In Last'} onChange={() => setFrame('In Last')} anchor="host.mois.field.outbound-frame-in-last" />
            <PBInput w={40} value={n} onChange={(e) => setN(e.target.value)} />
            <PBSelect w={70} options={['Days', 'Weeks']} value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
          <div className="pb-row" style={{ gap: 6 }}><Radio name="outbound-frame" label="Since" checked={frame === 'Since'} onChange={() => setFrame('Since')} anchor="host.mois.field.outbound-frame-since" /><PBInput w={90} /></div>
          <div className="pb-row" style={{ gap: 6 }}><Radio name="outbound-frame" label="Between" checked={frame === 'Between'} onChange={() => setFrame('Between')} anchor="host.mois.field.outbound-frame-between" /><PBInput w={90} /><span>and</span><PBInput w={90} /></div>
        </div>
        <div data-tutorial-id="host.mois.group.outbound-other" style={{ display: 'grid', gridTemplateColumns: 'auto 150px auto 150px', gap: '2px 6px', alignItems: 'center' }}>
          <b style={{ color: NAVY.caption, gridColumn: 'span 4' }}>Other</b>
          <Lbl>Record Type:</Lbl><PBSelect w={150} options={['ALL', 'CONSULT', 'DOCUMENT', 'PAPER FORM', 'PRESCRIPTION']} /><Lbl>Sender:</Lbl><PBInput w={150} />
          <Lbl>Pat. First Name:</Lbl><PBInput w={150} value={first} onChange={(e) => setFirst(e.target.value)} /><Lbl>Recipient:</Lbl><PBInput w={150} />
          <Lbl>Pat. Last Name:</Lbl><PBInput w={150} value={last} onChange={(e) => setLast(e.target.value)} /><Lbl>Fax Num:</Lbl><PBInput w={150} />
          <Lbl>Fax Account:</Lbl><PBSelect w={150} options={['SRFax Test']} /><span /><span />
        </div>
      </GreenBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(r) => `host.mois.row.outbound-${pbSlug(r.when)}`}
          columns={[
            { key: 'when', header: 'Date / Time', width: 130 },
            { key: 'sender', header: 'Sender', width: 140 },
            { key: 'recipient', header: 'Recipient', width: 220 },
            { key: 'patient', header: 'Patient', width: 150 },
            {
              key: 'type', header: 'Record Type', width: 110, align: 'center',
              render: (r) => (
                <PBButton bare className="pb-link" style={{ textDecoration: 'underline' }}
                  command={`record-type-${pbSlug(r.type)}`} onClick={() => openNode(r.node)}>{r.type}</PBButton>
              ),
            },
            { key: 'status', header: 'Status', width: 80 },
          ]}
          empty={srfax ? 'No faxes match the filter.' : 'Outbound Documents lists faxes sent through integrated eFax, which is not enabled.'}
        />
      </div>
    </>
  )
}

registerFolderView(['dx-inbound-docs'], InboundDocumentsView)
registerFolderView(['dx-outbound-docs'], OutboundDocumentsView)
