import { useMemo, useState } from 'react'
import { PBBand, PBDataWindow, PBInput } from '../../pb'
import { CLAIM_FEE_ROWS } from '../../data/billingStore'
import { DOCTORS } from '../../data/claims'
import { registerScreenWindows, useReportDialog } from '../../host/screen-windows'
import { useScreenReport } from '../../host/screen-state'
import { DialogButton, WorkspaceDialogFrame } from '../WorkspaceDialogFrame'

/* ============================================================================
   The small pickers Unsent MSP raises over itself.

   · MSP Fee Code List — Fee Item "…" / F4. 303601: "The next field is the Fee
     Code to identify what is being billed. Press F4 or click the ellipsis to
     choose the correct code from the prompt list." INFERRED layout: no
     capture of this prompt exists in the archive; it is drawn as the
     Advanced Lookup Service family every other Billing prompt belongs to
     (a band, a filter row, the list, Select), with Fee Code / Description /
     Amount columns and a Time column naming the fee items that need
     Time(s) Received or Start / Finish.
   · Registered Provider List — Action ▸ Change Claim Provider (Ctrl+D),
     Duplicate Claim diff Provider (Ctrl+F3) and the Doctor "…". 303601:
     "prompts you with a registered provider list to select a new
     provider". INFERRED layout (no capture): a one-column Provider list and
     Select / Cancel.

   Both are screen windows (host/screen-windows): ids below, opened by
   `openWindowById` as well as by the view's own buttons, reported as
   `host.dialog` while up.
   ========================================================================= */

export const UNSENT_WINDOWS = {
  fee: 'claim-fee-lookup',
  provider: 'claim-provider-list',
  patient: 'claim-patient-lookup',
  diagnosis: 'claim-diagnosis-lookup',
} as const

registerScreenWindows(Object.values(UNSENT_WINDOWS))

type FeeRow = (typeof CLAIM_FEE_ROWS)[number]

export function FeeCodeLookupWindow({ onPick, onClose }: { onPick: (row: FeeRow) => void; onClose: () => void }) {
  useReportDialog(UNSENT_WINDOWS.fee)
  const [code, setCode] = useState('')
  const [desc, setDesc] = useState('')
  const [cur, setCur] = useState(0)
  const rows = useMemo(() => CLAIM_FEE_ROWS
    .filter((r) => r.code.includes(code.trim()) && r.desc.includes(desc.trim().toUpperCase()))
    .map((r) => ({ ...r, timeText: r.time === 'received' ? 'Received' : r.time === 'start-finish' ? 'Start / Finish' : '' })), [code, desc])
  useScreenReport({ rows: rows.length })
  const picked = rows[Math.min(cur, rows.length - 1)]
  return (
    <WorkspaceDialogFrame id={UNSENT_WINDOWS.fee} title="Advanced Lookup Service" width={640} height={460} controls={false} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 8, gap: 6 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid var(--pb-border)' }}>
          <div className="pb-band--ruled"><PBBand>MSP Fee Code List</PBBand></div>
          <PBDataWindow
            flush
            rules="white"
            style={{ flex: '1 1 auto', minHeight: 0 }}
            columns={[
              { key: 'code', header: 'Fee Code', width: 70 },
              { key: 'desc', header: 'Description', width: 330 },
              { key: 'fee', header: 'Amount', width: 70, align: 'right' },
              { key: 'timeText', header: 'Time', width: 100 },
            ]}
            rows={rows}
            filters={[
              <PBInput key="code" value={code} onChange={(e) => setCode(e.target.value)} data-tutorial-id="host.mois.field.fee-filter-code" />,
              <PBInput key="desc" value={desc} onChange={(e) => setDesc(e.target.value)} data-tutorial-id="host.mois.field.fee-filter-description" />,
              null, null,
            ]}
            current={Math.min(cur, Math.max(0, rows.length - 1))}
            onCurrentChange={setCur}
            onActivate={() => picked && onPick(picked)}
            rowTutorialId={(r) => `host.mois.row.fee-${r.code}`}
            empty="No fee code matches."
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flex: 'none' }}>
          <DialogButton id="fee-select" isDefault disabled={!picked} onClick={() => picked && onPick(picked)}>Select</DialogButton>
          <DialogButton id="fee-cancel" onClick={onClose}>Cancel</DialogButton>
        </div>
      </div>
    </WorkspaceDialogFrame>
  )
}

export function ProviderListWindow({ title = 'Registered Provider List', onPick, onClose }: {
  title?: string
  onPick: (doctor: string) => void
  onClose: () => void
}) {
  useReportDialog(UNSENT_WINDOWS.provider)
  const [cur, setCur] = useState(0)
  const rows = DOCTORS.map((d) => ({ doctor: d }))
  const picked = rows[cur]?.doctor
  return (
    <WorkspaceDialogFrame id={UNSENT_WINDOWS.provider} title={title} width={360} height={320} controls={false} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 8, gap: 6 }}>
        <PBDataWindow
          style={{ flex: '1 1 auto', minHeight: 0 }}
          columns={[{ key: 'doctor', header: 'Provider', width: 300 }]}
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={() => picked && onPick(picked)}
          rowTutorialId={(r) => `host.mois.row.provider-${r.doctor.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`}
        />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flex: 'none' }}>
          <DialogButton id="provider-select" isDefault disabled={!picked} onClick={() => picked && onPick(picked)}>Select</DialogButton>
          <DialogButton id="provider-cancel" onClick={onClose}>Cancel</DialogButton>
        </div>
      </div>
    </WorkspaceDialogFrame>
  )
}
