import { useState, type ReactNode } from 'react'
import {
  INBOX_DISTRIBUTION, INTERFACE_AUDIT, LAB_DETAIL, LAB_RESULTS_COLUMNS, LAB_RESULTS_COMMANDS,
  LAB_RESULTS_FILTERS, LAB_RESULTS_ROWS, LAB_RESULTS_TABS, MANUAL_LAB, MATCHING_HISTORY_NOTES,
  SEND_RECEIVE, SETUP_REGISTRATION,
} from '../data/exchange'
import { useScreenReport } from '../host/screen-state'
import {
  PBBand, PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBSelect, PBTabs,
  PBViewHeader, PBWindow, pbSlug,
} from '../pb'
import { QualityReviewTab } from './CdxMessageViews'
import { Body, CellCheck, GreenBand, Heading, Lbl, Radio, ReportPage } from './ExchangeKit'
import type { ExchangeGo } from './ExchangeView'

/* ============================================================================
   Data Exchange ▸ Electronic Interfaces — 303384 and its How-To's (303491
   Download Electronic Results, 303492 Match Unmatched Labs, 303504 / 303506
   lab-download setup, 303507 Use The Quality Review). Inbound and Outbound
   Messages are the CDX windows in `CdxMessageViews.tsx`.
   ========================================================================= */

/* --- Send/Receive Data — 303491 image fcf7937c ----------------------------
   Download Data / Close Window; a Download Options band (Select, Interface,
   Description, and its own Download Data button) and a Default User Inbox
   band linking to Setup / Registration. MOIS runs the download in a console
   window it closes itself, then opens a Summary of Received Items with Print
   List and Close; the stage goes straight to that summary. */
export function SendReceiveView({ go }: { go: ExchangeGo }) {
  const [picked, setPicked] = useState(() => SEND_RECEIVE.interfaces.map(() => true))
  const [summary, setSummary] = useState(false)
  useScreenReport({
    selected: picked.filter(Boolean).length,
    ...(summary ? { dialog: 'summary-of-received-items' } : {}),
  })
  const download = () => setSummary(true)
  return (
    <>
      <PBViewHeader title="Send/Receive Electronic Data" />
      <PBCommandRow commands={[{ label: 'Download Data', onClick: download }, { label: 'Close Window' }]} />
      <Body style={{ position: 'relative' }}>
        <div data-tutorial-id="host.mois.group.download-options" style={{ borderBottom: '1px solid #888', paddingBottom: 12 }}>
          <Heading>Download Options:</Heading>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 80px 1fr', rowGap: 6, padding: '0 28px', fontWeight: 400 }}>
            <b>Select</b><b>Interface</b><b>Description</b>
            {SEND_RECEIVE.interfaces.map((it, i) => (
              <div key={it.code} style={{ display: 'contents' }}>
                <span style={{ paddingLeft: 12 }}>
                  <PBCheckbox
                    checked={picked[i]}
                    tutorialId={`host.mois.field.interface-${pbSlug(it.code)}`}
                    onChange={(v) => setPicked((p) => p.map((x, j) => (j === i ? v : x)))}
                  />
                </span>
                <span>{it.code}</span>
                <span>{it.description}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 28px 0' }}>
            <PBButton style={{ width: 110 }} onClick={download}>Download Data</PBButton>
          </div>
        </div>
        <div data-tutorial-id="host.mois.group.default-user-inbox">
          <Heading>Default User Inbox:</Heading>
          <div style={{ padding: '0 64px', whiteSpace: 'normal', maxWidth: 700 }}>{SEND_RECEIVE.inboxText}</div>
          <div className="pb-row" style={{ padding: '8px 22px 0', gap: 20 }}>
            <span>User:</span><b>{SEND_RECEIVE.user}</b>
          </div>
          <div style={{ padding: '6px 64px', fontWeight: 700 }}>
            This information must be changed using the{' '}
            <button type="button" className="pb-link" data-tutorial-id="host.mois.status.setup-registration" onClick={() => go.node('dx-setup')}>
              Setup / Registration Screen.
            </button>
          </div>
        </div>
        {summary && <ReceivedItemsWindow onClose={() => setSummary(false)} />}
      </Body>
    </>
  )
}

/** "Once the download is complete a Summary of Received Items opens with the
    option to Print List or Close the window" (303491). No capture of it
    exists, so only what the article names is drawn: the window, Print List
    and Close, over an empty page — the stage has nothing waiting at the
    interfaces to list. */
function ReceivedItemsWindow({ onClose }: { onClose: () => void }) {
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 60 }}>
      <PBWindow child controls={false} title="Summary of Received Items" onClose={onClose}
        tutorialId="host.mois.dialog.summary-of-received-items" style={{ width: 'min(620px, calc(100% - 20px))', height: 300 }}>
        <PBCommandRow commands={[{ label: 'Print List' }, { label: 'Close', onClick: onClose }]} />
        <div style={{ flex: '1 1 auto', minHeight: 0, background: '#fff', margin: 3, border: '1px solid #888' }} />
      </PBWindow>
    </div>
  )
}

/* --- Lab Results — 303384 image dd8676f0, 333106 image 8780d505 ------------
   Open Detail (F4), Refresh List (F5), Print List, Close Window and, at the
   far right, Print ALL Reports; a Messages tab (green filter band over the
   list) and a Quality Review tab — the same tab Inbound Messages carries.
   Refresh List applies the filter; double-click or Open Detail opens Patient
   Lab Detail; Match Patient there opens Manual Lab Result Processing. */
export function LabResultsView({ onTearOff }: { onTearOff?: () => void }) {
  const [tab, setTab] = useState(LAB_RESULTS_TABS[0]!)
  const [status, setStatus] = useState(LAB_RESULTS_FILTERS.processingStatus[0]!)
  const [applied, setApplied] = useState(status)
  const [cur, setCur] = useState(0)
  const [warnings, setWarnings] = useState(true)
  const [processed, setProcessed] = useState<Set<number>>(new Set())
  const [window_, setWindow] = useState<null | 'detail' | 'manual'>(null)

  const rows = LAB_RESULTS_ROWS
    .map((r, i) => ({ ...r, status: processed.has(i) ? 'PROCESSED' : r.status, index: i }))
    .filter((r) => applied === 'ALL' || r.status === applied)
  useScreenReport({
    rows: rows.length,
    filter: pbSlug(applied),
    ...(window_ === 'detail' ? { dialog: 'patient-lab-detail' } : {}),
    ...(window_ === 'manual' ? { dialog: 'manual-lab-result-processing' } : {}),
  })
  const openDetail = () => { if (tab === LAB_RESULTS_TABS[0]) setWindow('detail') }

  return (
    <>
      <PBViewHeader title="Lab Results" />
      <PBCommandRow
        commands={LAB_RESULTS_COMMANDS.map((label) => ({
          label,
          width: 93,
          onClick: label.startsWith('Open Detail') ? openDetail
            : label.startsWith('Refresh') ? () => { setApplied(status); setCur(0) }
            : undefined,
        }))}
        right={<PBButton data-tutorial-id="host.mois.command.print-all-reports">Print ALL Reports</PBButton>}
      />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '4px 3px 3px', position: 'relative' }}>
        <PBTabs tabs={LAB_RESULTS_TABS} active={tab} onChange={setTab} compact>
          {tab === LAB_RESULTS_TABS[0] ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
              <GreenBand anchor="host.mois.group.lab-results-filter">
                <Lbl>Date Range:</Lbl>
                <PBInput w={76} align="center" defaultValue={LAB_RESULTS_FILTERS.from} />
                <span>(optional)</span>
                <PBInput w={76} align="center" defaultValue={LAB_RESULTS_FILTERS.to} />
                <span>(inclusive)</span>
                <Lbl>Processing Status:</Lbl>
                <PBSelect
                  w={100}
                  options={[...LAB_RESULTS_FILTERS.processingStatus]}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  data-tutorial-id="host.mois.field.processing-status"
                />
                <Lbl>Batch Ref.:</Lbl><PBSelect w={100} options={['']} />
                <Lbl>Patient Name:</Lbl><PBInput w={150} />
                <Lbl>Chart Num.:</Lbl><PBInput w={84} />
                <Lbl>ALIAS 01:</Lbl><PBInput w={100} />
                <Lbl>ALIAS 02:</Lbl><PBInput w={100} />
              </GreenBand>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
                <PBDataWindow
                  rows={rows}
                  current={cur}
                  onCurrentChange={setCur}
                  onActivate={() => setWindow('detail')}
                  rowTutorialId={(r, i) => `host.mois.row.lab-${i}-${pbSlug(r.patient)}`}
                  columns={LAB_RESULTS_COLUMNS.map((c) => ({ key: c.key, header: c.header, width: c.width, align: c.align }))}
                  empty="No lab results match the filter."
                />
              </div>
            </div>
          ) : (
            <QualityReviewTab includeWarnings={warnings} onIncludeWarnings={setWarnings} onTearOff={() => onTearOff?.()} />
          )}
        </PBTabs>
        {window_ === 'detail' && (
          <PatientLabDetailWindow onClose={() => setWindow(null)} onMatch={() => setWindow('manual')} />
        )}
        {window_ === 'manual' && (
          <ManualLabProcessingWindow
            onClose={() => setWindow(null)}
            onProcess={() => {
              const row = rows[cur]
              if (row) setProcessed((p) => new Set(p).add(row.index))
              setWindow(null)
            }}
          />
        )}
      </div>
    </>
  )
}

/* --- Patient Lab Detail — 303492 image cd14c83a --------------------------- */
function PatientLabDetailWindow({ onClose, onMatch }: { onClose: () => void; onMatch: () => void }) {
  const stat = (label: string, value: string) => (
    <div className="pb-row" style={{ gap: 6 }}><Lbl w={62}>{label}</Lbl><b>{value}</b></div>
  )
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 60 }}>
      <PBWindow child controls={false} title="Patient Lab Detail" onClose={onClose}
        tutorialId="host.mois.dialog.patient-lab-detail" style={{ width: 'calc(100% - 8px)', height: 'calc(100% - 8px)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, gap: 3, padding: 3 }}>
          <div className="pb-row" style={{ gap: 4, alignItems: 'stretch', flex: 'none' }}>
            <div className="pb-groupbox" data-tutorial-id="host.mois.group.patient-data-from-lab-provider" style={{ flex: '1 1 auto' }}>
              <PBBand>Patient Data From Lab Provider</PBBand>
              <div style={{ padding: '4px 8px' }}>
                {stat('Patient:', LAB_DETAIL.patient)}
                <div className="pb-row" style={{ gap: 6 }}><Lbl w={62}>DOB:</Lbl><b style={{ width: 150 }}>{LAB_DETAIL.dob}</b><Lbl>Sex:</Lbl><b>{LAB_DETAIL.sex}</b></div>
                {stat('Alias 01:', LAB_DETAIL.alias1)}
                {stat('Alias 02:', LAB_DETAIL.alias2)}
              </div>
            </div>
            <div className="pb-groupbox" data-tutorial-id="host.mois.group.matching-patient-chart-information" style={{ width: 300, flex: 'none' }}>
              <PBBand>Matching Patient Chart Information</PBBand>
              <div style={{ padding: '4px 8px', whiteSpace: 'normal' }}>
                {LAB_DETAIL.matchText.map((t) => <div key={t}>{t}</div>)}
                <PBButton data-tutorial-id="host.mois.command.match-patient" style={{ marginTop: 6 }} onClick={onMatch}>Match Patient</PBButton>
              </div>
            </div>
          </div>
          <div className="pb-groupbox" style={{ flex: 'none', height: 124, display: 'flex', flexDirection: 'column' }}>
            <PBBand>Lab Message List</PBBand>
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
              <PBDataWindow flush rows={LAB_DETAIL.rows} columns={LAB_DETAIL.columns.map((c) => ({ key: c.key, header: c.header, width: c.width, align: c.align }))} />
            </div>
          </div>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 3 }}>
            <pre style={{ flex: '1 1 auto', margin: 0, background: '#fff', border: '1px solid #888', padding: 10, overflow: 'auto', fontSize: 11 }}>{LAB_DETAIL.report}</pre>
            <div data-tutorial-id="host.mois.group.actions" style={{ width: 170, flex: 'none', display: 'flex', flexDirection: 'column', gap: 10, padding: 6, background: '#fff', border: '1px solid #888' }}>
              <b className="pb-link" style={{ textDecoration: 'underline' }}>Actions:</b>
              {LAB_DETAIL.actions.map((a) => (
                <div key={a.label}>
                  <button type="button" className="pb-link" data-tutorial-id={`host.mois.command.${a.anchor}`} style={{ textAlign: 'left', whiteSpace: 'normal' }}>{a.label}</button>
                  {a.key && <div>{a.key}</div>}
                </div>
              ))}
              <span style={{ flex: '1 1 auto' }} />
              <PBButton data-tutorial-id="host.mois.command.close-window-esc" onClick={onClose}>Close Window (Esc)</PBButton>
            </div>
          </div>
        </div>
      </PBWindow>
    </div>
  )
}

/* --- Manual Lab Result Processing — 303492 image a6474f86 ------------------ */
function ManualLabProcessingWindow({ onClose, onProcess }: { onClose: () => void; onProcess: () => void }) {
  const [picked, setPicked] = useState(MANUAL_LAB.picked)
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 65 }}>
      <PBWindow child controls={false} title="Manual Lab Result Processing" onClose={onClose}
        tutorialId="host.mois.dialog.manual-lab-result-processing" style={{ width: 'calc(100% - 8px)', height: 'calc(100% - 8px)' }}>
        <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, gap: 6, padding: 4 }}>
          <div style={{ width: 252, flex: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div className="pb-groupbox" data-tutorial-id="host.mois.group.find-chart">
              <PBBand>Find Chart</PBBand>
              <div className="pb-row" style={{ gap: 6, padding: 4 }}><Lbl>Chart No.:</Lbl><PBInput w={84} defaultValue={MANUAL_LAB.chart} /><PBButton size="sm">…</PBButton></div>
            </div>
            <div className="pb-groupbox" data-tutorial-id="host.mois.group.potential-matches">
              <PBBand>Potential Matches</PBBand>
              <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 40px', background: '#c8dcfa', padding: '1px 4px' }}><span /><span>Patient</span><span>Match</span></div>
              {MANUAL_LAB.matches.map((m, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 40px', padding: '1px 4px', background: i === picked ? '#c8f0c8' : i % 2 ? '#fff' : '#efefef' }}>
                  <PBCheckbox checked={i === picked} onChange={() => setPicked(i)} />
                  <span>{m.patient}</span><span style={{ textAlign: 'right' }}>{m.match}</span>
                </div>
              ))}
            </div>
            <div className="pb-groupbox" data-tutorial-id="host.mois.group.patient-information" style={{ flex: '1 1 auto' }}>
              <PBBand>Patient Information</PBBand>
              {MANUAL_LAB.info.map(([k, v], i) => (
                <div key={k} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', padding: '1px 6px', background: i % 2 ? '#fff' : '#efefef', fontWeight: MANUAL_LAB.bold.includes(k) ? 700 : 400 }}>
                  <span>{k}</span><span>{v}</span>
                </div>
              ))}
            </div>
            <div className="pb-groupbox">
              <PBBand>Alias List</PBBand>
              <pre style={{ margin: 0, padding: '2px 6px', fontFamily: 'inherit' }}>{MANUAL_LAB.alias.join('\n')}</pre>
            </div>
          </div>
          <div className="pb-groupbox" style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <PBBand>Lab Report Detail</PBBand>
            <pre style={{ flex: '1 1 auto', margin: 0, background: '#fff', padding: 10, overflow: 'auto', fontSize: 11 }}>{MANUAL_LAB.report}</pre>
          </div>
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 8, padding: '4px 0 8px' }}>
          <PBButton data-tutorial-id="host.mois.command.process-lab-report" onClick={onProcess}>Process Lab Report</PBButton>
          <PBButton onClick={onClose}>Cancel</PBButton>
        </div>
      </PBWindow>
    </div>
  )
}

/* --- Inbox Distribution — 303384 image f6fddf3f ---------------------------- */
export function InboxDistributionView() {
  const [detail, setDetail] = useState('User')
  useScreenReport({ detail: pbSlug(detail) })
  return (
    <>
      <PBViewHeader title="Inbox Distribution" />
      <PBCommandRow commands={[{ label: 'Refresh List (F5)' }, { label: 'Print List' }, { label: 'Close Window' }]} />
      <GreenBand anchor="host.mois.group.inbox-distribution-filter" style={{ display: 'grid', gridTemplateColumns: 'auto auto auto auto auto', justifyContent: 'start' }}>
        <Lbl>Date Range:</Lbl><PBInput w={76} align="center" defaultValue={INBOX_DISTRIBUTION.from} /><span />
        <Lbl>Report Detail:</Lbl>
        <span className="pb-row" style={{ gap: 12 }}>
          {['User', 'Patient', 'Measure'].map((d) => (
            <Radio key={d} name="inbox-detail" label={d} checked={detail === d} onChange={() => setDetail(d)} anchor={`host.mois.field.report-detail-${pbSlug(d)}`} />
          ))}
        </span>
        <Lbl>To</Lbl><PBInput w={76} align="center" defaultValue={INBOX_DISTRIBUTION.to} /><span>(optional)</span>
        <Lbl>User Account:</Lbl><PBSelect w={160} options={['']} />
      </GreenBand>
      <ReportPage
        anchor="host.mois.field.inbox-summary"
        heading={INBOX_DISTRIBUTION.heading}
        columns={INBOX_DISTRIBUTION.columns}
        footer={INBOX_DISTRIBUTION.footer}
      />
    </>
  )
}

/* --- Setup / Registration — 303384 image de324c30, 303504 image 6f2b2b61 ---
   New Record / Delete Record / Save / Close Window; the Default User Inbox
   strip with its Change Default link (which opens the Default User Inbox
   window); then one row per interface: Interface Code (a drop-down of NHA,
   EXC, IHA, CDX), Interface User Name, Interface Password, Active. */
export function SetupRegistrationView() {
  const [rows, setRows] = useState(SETUP_REGISTRATION.rows)
  const [cur, setCur] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [inbox, setInbox] = useState(SETUP_REGISTRATION.defaultInbox)
  const [changing, setChanging] = useState(false)
  useScreenReport({ rows: rows.length, saved: !dirty, ...(changing ? { dialog: 'default-user-inbox' } : {}) })
  return (
    <>
      <PBViewHeader title="Setup / Registration" />
      <PBCommandRow commands={[
        { label: 'New Record', onClick: () => { setRows((r) => [...r, { code: 'NHA', user: '', password: '', active: true }]); setCur(rows.length); setDirty(true) } },
        { label: 'Delete Record', onClick: () => { setRows((r) => r.filter((_, i) => i !== cur)); setCur(0); setDirty(true) } },
        { label: 'Save', disabled: !dirty, onClick: () => setDirty(false) },
        { label: 'Close Window' },
      ]} />
      <div className="pb-row" data-tutorial-id="host.mois.group.default-user-inbox" style={{ gap: 8, padding: '6px 10px', background: 'var(--pb-face)', borderBottom: '1px solid #888', flex: 'none' }}>
        <Lbl>Default User Inbox:</Lbl>
        <PBInput w={170} readOnly value={inbox} style={{ background: '#e8e8e8' }} />
        <button type="button" className="pb-link" data-tutorial-id="host.mois.command.change-default" onClick={() => setChanging(true)}>Change Default</button>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3, position: 'relative' }}>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(r, i) => `host.mois.row.interface-${i}-${pbSlug(r.code)}`}
          columns={[
            {
              key: 'code', header: 'Interface Code', width: 148,
              render: (r, i) => (i === cur && i >= SETUP_REGISTRATION.rows.length
                ? (
                  <PBSelect w={140} options={SETUP_REGISTRATION.codes} value={r.code} data-tutorial-id="host.mois.field.interface-code"
                    onChange={(e) => setRows((all) => all.map((x, j) => (j === i ? { ...x, code: e.target.value } : x)))} />
                )
                : r.code),
            },
            { key: 'user', header: 'Interface User Name', width: 150 },
            { key: 'password', header: 'Interface Password', width: 228 },
            { key: 'active', header: 'Active', width: 68, align: 'center', render: (r) => <CellCheck checked={r.active} /> },
          ]}
        />
        {changing && (
          <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 60 }}>
            <PBWindow child controls={false} title="Default User Inbox" onClose={() => setChanging(false)}
              tutorialId="host.mois.dialog.default-user-inbox" style={{ width: 330 }}>
              <div className="pb-groupbox" style={{ margin: 8 }}>
                <PBBand>Select User Inbox</PBBand>
                <div className="pb-row" style={{ gap: 6, padding: 6 }}>
                  <Lbl>User Account:</Lbl>
                  <PBSelect w={170} options={SETUP_REGISTRATION.users} value={inbox} onChange={(e) => setInbox(e.target.value)} />
                </div>
                <div style={{ padding: '4px 6px 8px', whiteSpace: 'normal', borderTop: '1px solid #b8b8b8' }}>
                  {SETUP_REGISTRATION.inboxNote.map((t) => <div key={t} style={{ marginBottom: 6 }}>{t}</div>)}
                </div>
              </div>
              <div className="pb-row" style={{ justifyContent: 'center', gap: 10, paddingBottom: 10 }}>
                <PBButton data-tutorial-id="host.mois.command.default-inbox-save" onClick={() => setChanging(false)}>Save</PBButton>
                <PBButton data-tutorial-id="host.mois.command.default-inbox-cancel" onClick={() => setChanging(false)}>Cancel</PBButton>
              </div>
            </PBWindow>
          </div>
        )}
      </div>
    </>
  )
}

/* --- Matching History — 303384 image 2d6f7f9c ----------------------------- */
export function MatchingHistoryView() {
  const [auto, setAuto] = useState(false)
  const row = (label: string, input: ReactNode, note: string) => (
    <div className="pb-row" style={{ gap: 6, padding: '2px 22px' }}><Lbl w={86}>{label}</Lbl>{input}<span>{note}</span></div>
  )
  return (
    <>
      <PBViewHeader title="Matching History" />
      <PBCommandRow commands={[{ label: 'Run Report' }, { label: 'Close Window' }]} />
      <Body>
        <Heading style={{ borderBottom: 0 }}>Report Parameters:</Heading>
        <div data-tutorial-id="host.mois.group.report-parameters" style={{ paddingTop: 6 }}>
          {row('Matching Date:', <span className="pb-row" style={{ gap: 6 }}><PBInput w={76} defaultValue="0000.00.00" /><span>to</span><PBInput w={76} /></span>, MATCHING_HISTORY_NOTES.date)}
          {row('Patient Name:', <PBInput w={184} />, MATCHING_HISTORY_NOTES.patient)}
          {row('User Name:', <PBInput w={184} />, MATCHING_HISTORY_NOTES.user)}
          <div className="pb-row" style={{ gap: 6, padding: '2px 22px' }}>
            <Lbl w={86}>Auto-Matches:</Lbl>
            <PBCheckbox label={MATCHING_HISTORY_NOTES.auto} checked={auto} onChange={setAuto} />
          </div>
        </div>
      </Body>
    </>
  )
}

/* --- Interface Data Audit — 303384 image 8489439b ------------------------- */
export function InterfaceAuditView() {
  const [type, setType] = useState(INTERFACE_AUDIT.types[0]!)
  useScreenReport({ audit: pbSlug(type) })
  return (
    <>
      <PBViewHeader title="Interface Data Audit" />
      <PBCommandRow commands={[{ label: 'Refresh List (F5)' }, { label: 'Print List' }, { label: 'Close Window' }]} />
      <div className="pb-row" data-tutorial-id="host.mois.group.audit-type" style={{ gap: 90, padding: '6px 14px', background: 'var(--pb-face)', borderBottom: '1px solid #b8b8b8', flex: 'none' }}>
        <Lbl>Audit Type:</Lbl>
        {INTERFACE_AUDIT.types.map((t) => (
          <Radio key={t} name="audit-type" label={t} checked={type === t} onChange={() => setType(t)} anchor={`host.mois.field.audit-${pbSlug(t)}`} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto auto auto auto auto', gap: '3px 8px', padding: '6px 14px', background: 'var(--pb-face)', flex: 'none', justifyContent: 'start', alignItems: 'center' }}>
        <Lbl>Interface:</Lbl><PBSelect w={120} options={['', 'NHA', 'EXC', 'IHA', 'CDX']} /><span />
        <Lbl>MOIS Code:</Lbl><PBInput w={86} /><Lbl>Description:</Lbl><PBInput w={220} />
        <Lbl>Date Range:</Lbl>
        <span className="pb-row" style={{ gap: 6 }}><PBInput w={76} defaultValue={INTERFACE_AUDIT.from} /><span>to</span><PBInput w={76} defaultValue={INTERFACE_AUDIT.to} /></span>
        <span />
        <Lbl>Supplier Code:</Lbl><PBInput w={86} /><Lbl>Description:</Lbl><PBInput w={220} />
      </div>
      <ReportPage heading={INTERFACE_AUDIT.heading} columns={INTERFACE_AUDIT.columns} footer={INTERFACE_AUDIT.footer} />
    </>
  )
}
