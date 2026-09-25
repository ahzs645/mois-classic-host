import { useState } from 'react'
import {
  AUTO_UPDATE_ROWS, DOBC_UPDATE, PREPARE_BILLS, RECONCILE, TELEPLAN_LOGIN, TELEPLAN_OPTIONS, TELEPLAN_RESULTS,
} from '../data/exchange'
import { useScreenReport } from '../host/screen-state'
import {
  PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBTextArea, PBViewHeader, PBWindow, pbSlug,
} from '../pb'
import { Body, Heading, Lbl, Prompt, Radio, StatusList } from './ExchangeKit'

/* ============================================================================
   Data Exchange ▸ MSP, and Administration ▸ Auto-Update Utilities.

   303383 "MSP" and 303500 "How to Submit to Teleplan" give the three steps:
   Prepare Bills (Run), Launch Teleplan (Teleplan Web Access), Reconcile
   Remittance (Run). 303502 / 303223 add the fee and explanatory code
   downloads and the Download Successful prompt, and 303084 / 3134339 the
   Code List Auto-Update Utilities window they fall back to.
   ========================================================================= */

/* --- Prepare Bills — 303383 image 81237c69 -------------------------------- */
export function PrepareBillsView() {
  const [at, setAt] = useState(0)
  useScreenReport({ status: at === PREPARE_BILLS.status.length - 1 ? 'complete' : 'ready' })
  const row = (label: string, value: string, w = 62) => (
    <div key={label} className="pb-row" style={{ gap: 6, padding: '2px 10px' }}>
      <Lbl w={160}>{label}</Lbl>
      <PBInput w={w} align={w < 100 ? 'right' : undefined} readOnly value={value} style={{ background: '#e8e8e8' }} />
    </div>
  )
  return (
    <>
      <PBViewHeader title={PREPARE_BILLS.title} />
      <PBCommandRow commands={[
        { label: 'Run', onClick: () => setAt(PREPARE_BILLS.status.length - 1) },
        { label: 'Close Window' },
      ]} />
      <Body>
        <Heading>Claim Information</Heading>
        <div data-tutorial-id="host.mois.group.claim-information">
          {PREPARE_BILLS.claims.map((c) => row(c.label, c.value))}
        </div>
        <Heading style={{ marginTop: 8 }}>User Information</Heading>
        {row('Current User:', PREPARE_BILLS.user, 150)}
        {row('Current Date:', PREPARE_BILLS.date, 84)}
        <div className="pb-row" style={{ gap: 6, padding: '2px 10px', alignItems: 'flex-start' }}>
          <Lbl w={160}>User Comment / Note:</Lbl>
          <PBTextArea w={358} rows={3} />
        </div>
        <Heading style={{ marginTop: 8 }}>File Location</Heading>
        <div style={{ padding: '0 10px' }}>
          <Lbl>System Path:</Lbl>
          <div style={{ padding: '2px 24px' }}>
            <PBInput w={496} readOnly value={PREPARE_BILLS.path} style={{ background: '#e8e8e8' }} />
          </div>
        </div>
        <div style={{ borderTop: '1px solid #b8b8b8', marginTop: 8 }} />
        <StatusList steps={PREPARE_BILLS.status} at={at} />
      </Body>
    </>
  )
}

/* --- Reconcile Remittance — 303383 image 723d1c60 ------------------------- */
export function ReconcileRemittanceView() {
  const [at, setAt] = useState(0)
  useScreenReport({ status: at === RECONCILE.status.length - 1 ? 'complete' : 'ready' })
  return (
    <>
      <PBViewHeader title={RECONCILE.title} />
      <PBCommandRow commands={[
        { label: 'Run', onClick: () => setAt(RECONCILE.status.length - 1) },
        { label: 'Close Window' },
      ]} />
      <Body>
        <div className="pb-row" style={{ gap: 6, padding: '10px 16px 30px' }}>
          <Lbl>Receive File:</Lbl>
          <PBInput w={454} readOnly value={RECONCILE.file} style={{ background: '#e8e8e8' }} />
        </div>
        <StatusList steps={RECONCILE.status} at={at} />
      </Body>
    </>
  )
}

/* --- Launch Teleplan — Teleplan Web Access ---------------------------------
   303383 image 3b42f701: a Close Window taskbar, a grey column of eight
   radio options over one Go! button and a Show Detail tick, and a white log
   pane whose green header reads "Login Result - SUCCESS". 303502 images
   3073580c / e0dd550c: after Download Fee Codes and Go!, a Download
   Successful prompt — "Would you like to update MOIS now with the
   downloaded codes?" — with Yes and No. */
export function TeleplanView() {
  const [option, setOption] = useState(TELEPLAN_OPTIONS[0]!)
  const [log, setLog] = useState<string[]>([])
  const [detail, setDetail] = useState(true)
  const [prompt, setPrompt] = useState(false)
  const [answer, setAnswer] = useState('')
  useScreenReport({
    option: pbSlug(option),
    ran: log.length,
    ...(answer ? { answer } : {}),
    ...(prompt ? { dialog: 'download-successful' } : {}),
  })
  const go = () => {
    setLog((l) => [...l, ...(TELEPLAN_RESULTS[option] ?? [])])
    if (option.startsWith('Download')) setPrompt(true)
  }
  const band = (text: string, i: number) => (
    <div key={i} style={{
      fontFamily: 'var(--pb-font-mono)', fontWeight: 700, padding: '4px 12px 14px',
      background: 'linear-gradient(#b8e8c8, #ffffff)',
    }}>
      {text}
    </div>
  )
  return (
    <>
      <PBViewHeader title="Teleplan Web Access" />
      <PBCommandRow commands={[{ label: 'Close Window' }]} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', position: 'relative' }}>
        <div
          data-tutorial-id="host.mois.group.teleplan-options"
          style={{ width: 168, flex: 'none', background: 'var(--pb-face)', borderRight: '1px solid #888', display: 'flex', flexDirection: 'column', padding: '8px 6px' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {TELEPLAN_OPTIONS.map((o) => (
              <Radio
                key={o}
                name="teleplan"
                label={o}
                checked={option === o}
                onChange={() => setOption(o)}
                anchor={`host.mois.field.teleplan-${pbSlug(o)}`}
              />
            ))}
          </div>
          <PBButton data-tutorial-id="host.mois.command.go" style={{ width: 56, height: 28, marginTop: 16 }} onClick={go}>Go!</PBButton>
          <span style={{ flex: '1 1 auto' }} />
          <PBCheckbox label="Show Detail" checked={detail} onChange={setDetail} tutorialId="host.mois.field.show-detail" />
        </div>
        <div data-tutorial-id="host.mois.field.teleplan-log" style={{ flex: '1 1 auto', minWidth: 0, background: '#fff', overflow: 'auto' }}>
          {band(TELEPLAN_LOGIN, -1)}
          {log.map((line, i) => (detail || i === log.length - 1 ? band(line, i) : null))}
        </div>
        {prompt && (
          <Prompt
            title="Download Successful"
            buttons={['Yes', 'No']}
            onClose={(b) => { setPrompt(false); setAnswer(b === 'Yes' ? 'yes' : 'no') }}
          >
            Would you like to update MOIS now with the downloaded codes?
          </Prompt>
        )}
      </div>
    </>
  )
}

/* --- Administration ▸ Prompt / Selection List Mgt ▸ Auto-Update Utilities --
   303084 image f5dda7e0 (v02.22.92): "Code List Auto-Update Utilities",
   Open List / Close Window, a Utility / Description grid of four rows. Open
   List on DOBC Private Fee Codes opens Update DOBC Private Fees (3134339
   image 358fa649); Update Fees ends on the Update Completed box (27aa84bc).
   The MSP rows open an Update Utility window the manual names but never
   shows, so it is not drawn here. */
export function AutoUpdateView() {
  const [cur, setCur] = useState(0)
  const [dobc, setDobc] = useState(false)
  useScreenReport({
    row: pbSlug(AUTO_UPDATE_ROWS[cur]!.utility),
    ...(dobc ? { dialog: 'update-dobc-private-fees' } : {}),
  })
  return (
    <>
      <PBViewHeader title="Code List Auto-Update Utilities" />
      <PBCommandRow commands={[
        { label: 'Open List', onClick: () => { if (AUTO_UPDATE_ROWS[cur]!.utility.startsWith('DOBC')) setDobc(true) } },
        { label: 'Close Window' },
      ]} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3, position: 'relative' }}>
        <PBDataWindow
          rows={AUTO_UPDATE_ROWS}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(_r, i) => { setCur(i) }}
          rowTutorialId={(r) => `host.mois.row.${pbSlug(r.utility)}`}
          columns={[
            { key: 'utility', header: 'Utility', width: 234 },
            { key: 'description', header: 'Description' },
          ]}
        />
        {dobc && <UpdateDobcWindow onClose={() => setDobc(false)} />}
      </div>
    </>
  )
}

function UpdateDobcWindow({ onClose }: { onClose: () => void }) {
  const [create, setCreate] = useState(true)
  const [done, setDone] = useState(false)
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 60, placeItems: 'start center', paddingTop: 30 }}>
      <PBWindow
        child
        controls={false}
        title="Update DOBC Private Fees"
        onClose={onClose}
        tutorialId="host.mois.dialog.update-dobc-private-fees"
        style={{ width: 'min(760px, calc(100% - 16px))' }}
      >
        <div style={{ background: '#c8dcfa', padding: '4px 8px', fontWeight: 700 }}>{DOBC_UPDATE.band}</div>
        <div className="pb-row" style={{ padding: '6px 8px', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: '1 1 auto' }}>
            <div style={{ color: '#707070' }}>Fee Code File</div>
            <div className="pb-row" style={{ gap: 6 }}>
              <PBInput w={420} readOnly value={DOBC_UPDATE.file} style={{ background: '#e8e8e8' }} />
              <PBButton data-tutorial-id="host.mois.command.select-file">Select File</PBButton>
            </div>
            <div style={{ color: '#707070' }}>Created: {DOBC_UPDATE.created}&nbsp;&nbsp;&nbsp;&nbsp;Modified: {DOBC_UPDATE.modified}</div>
          </div>
          <div>
            <div>Options:</div>
            <PBCheckbox label="Create new fee codes" checked={create} onChange={setCreate} tutorialId="host.mois.field.create-new-fee-codes" />
          </div>
        </div>
        <div style={{ background: '#c8dcfa', display: 'grid', gridTemplateColumns: '60px 1fr 70px 70px 60px 110px', padding: '3px 8px', color: '#404040' }}>
          <span>Code</span><span>Description</span><span>Current</span><span>New Fee</span><span>Accept</span><span>Note</span>
        </div>
        <div data-tutorial-id="host.mois.group.dobc-changes">
          {DOBC_UPDATE.groups.map((g) => (
            <div key={g.group} className="pb-row" style={{ background: g.fill, padding: '3px 8px', gap: 0 }}>
              <span style={{ width: 20 }}>⊞</span>
              <span style={{ width: 90 }}>{g.group}</span>
              <span style={{ width: 120, color: '#606060' }}>Changes: {g.changes}</span>
              <span style={{ width: 120, color: '#606060' }}>Accepted: {g.accepted}</span>
              <span style={{ color: '#606060' }}>Rejected: {g.rejected}</span>
            </div>
          ))}
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 8, padding: 8 }}>
          {/* "click on the 'Update Fees' button at the bottom of the prompt"
              (3134339; the capture is cropped above it) */}
          <PBButton data-tutorial-id="host.mois.command.update-fees" onClick={() => setDone(true)}>Update Fees</PBButton>
        </div>
      </PBWindow>
      {done && (
        <Prompt title="Update Completed" icon="info" buttons={['OK']} onClose={() => { setDone(false); onClose() }}>
          Your private fee codes have been updated.
        </Prompt>
      )}
    </div>
  )
}
