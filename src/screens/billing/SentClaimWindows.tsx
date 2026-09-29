import type { CSSProperties, ReactNode } from 'react'
import { PBDataWindow } from '../../pb'
import {
  ADJUSTMENT_CODES, adjustmentsOf, paymentOf, remittanceOf, sequenceOf, useSentClaims,
} from '../../data/billingStore'
import { SENT_CLAIM_KEY, sentClaimPatient, sentClaims, type SentClaim } from '../../data/claims'
import { useScreenReport } from '../../host/screen-state'
import { useSessionState } from '../../host/screen-windows'
import { registerAreaWindow, type AreaWindowProps } from '../areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from '../WorkspaceDialogFrame'
import { FormLine } from '../formKit'

/* ============================================================================
   The two Sent Claim Detail windows behind Sent Claims ▸ Action beside
   Detail Expl Code (which is screens/SentClaimDetailWindow.tsx).

   · Detail Adjustment Summary (Alt+Z) — `sent-adjustment-summary`.
     PROVENANCE: 303602 `3acbf70b` (217 x 339): title "Sent Claim Detail",
     close box only; a ruled box captioned "Adjustment Summary"; "Gross
     Payment:" with the amount bold at the right; a centred "Adjustments"
     heading over "Code … Amount"; the adjustment rows, then "-" in every
     empty one down to six; a double rule; "Net Payment:" bold; Ok centred.
     "This will show you how much extra has been added or removed from a
     claim, and the code for why these adjustments have been made."

   · Remittance History — `sent-remittance-history`.
     PROVENANCE: 303602 `cb3b6af8` (871 x 572) and `aec03531` (858 x 564,
     the cloud build): title "Sent Claim Detail - Remittance History";
     a "Claim Information" box with Patient Information (First / Middle /
     Last Name; Insurance By, Number, Dependant) and Service Information
     (Service Date, Service No, Unit Amount; Fee Code, Total Billed), then
     Claim Information (Sent Date, Paid Date, Gross Paid, Adjustments with
     "(this reflects only the adjustments from the last remittance).", Net
     Paid; Sequence No., Recon Codes; Adjust 01–06 Code / Amount); under it
     a "Remittance History" grid — Paid | Payee No | Sequence No | Net Paid
     | Code | Expl 01 | Expl 02 | Expl 03 | Adj Code 01 — and Ok.

   Both read the claim Sent To MSP has loaded (SENT_CLAIM_KEY), with the
   session's R1 / WO toggles over it. The payments and adjustments are the
   training data in data/billingStore.ts.

   Reported: `host.screen.adjustments` / `host.screen.remittances` (counts).
   ========================================================================= */

function useCurrentSent(): SentClaim {
  const [picked] = useSessionState<SentClaim | null>(SENT_CLAIM_KEY, null)
  const { rows } = useSentClaims()
  const base = picked ?? sentClaims[0]!
  return rows.find((r) => r.id === base.id) ?? base
}

const money = (n: number) => (Math.abs(n) < 0.005 ? '-' : n < 0 ? `(${Math.abs(n).toFixed(2)})` : n.toFixed(2))

export function AdjustmentSummaryWindow({ close }: AreaWindowProps) {
  const c = useCurrentSent()
  const adj = adjustmentsOf(c)
  const { gross, net } = paymentOf(c)
  useScreenReport({ adjustments: adj.length })
  const rows = Array.from({ length: Math.max(6, adj.length) }, (_, i) => adj[i])
  return (
    <WorkspaceDialogFrame id="sent-adjustment-summary" title="Sent Claim Detail" width={217} height={339} controls={false} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: '8px 10px' }}>
        <div style={{ border: '1px solid #646464', background: '#fff', flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 700, padding: '3px 6px', background: '#dcd7d2', borderBottom: '1px solid #646464' }}>Adjustment Summary</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderBottom: '1px solid #c8c8c8' }}>
            <span>Gross Payment:</span><b data-tutorial-id="host.mois.field.adjustment-gross">{gross.toFixed(2)}</b>
          </div>
          <div style={{ textAlign: 'center', paddingTop: 3 }}>Adjustments</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 6px' }}><span>Code</span><span>Amount</span></div>
          <div style={{ flex: '1 1 auto' }} data-tutorial-id="host.mois.field.adjustment-rows">
            {rows.map((a, i) => (
              <div
                key={i}
                title={a ? ADJUSTMENT_CODES[a.code] : undefined}
                data-tutorial-id={a ? `host.mois.row.adjustment-${a.code}` : undefined}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '0 6px', lineHeight: '17px' }}
              >
                <span>{a?.code ?? ''}</span><span>{a ? a.amount.toFixed(2) : '-'}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderTop: '3px double #646464' }}>
            <span>Net Payment:</span><b data-tutorial-id="host.mois.field.adjustment-net">{net.toFixed(2)}</b>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, flex: 'none' }}>
          <DialogButton id="adjustment-summary-ok" isDefault width={72} onClick={close}>Ok</DialogButton>
        </div>
      </div>
    </WorkspaceDialogFrame>
  )
}

/** A label / bold value pair in the Claim Information box. */
function KV({ label, children, w = 96 }: { label: string; children: ReactNode; w?: number }) {
  return (
    <FormLine label={label} w={w} gap={8} className={false} labelClass={false} style={{ display: 'flex', lineHeight: '18px' }}>
      <b>{children}</b>
    </FormLine>
  )
}

function Box({ title, children, style }: { title: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ border: '1px solid #8c8c8c', background: '#f8f8f8', display: 'flex', flexDirection: 'column', ...style }}>
      <div style={{ fontWeight: 700, padding: '2px 6px', background: '#dcd7d2', borderBottom: '1px solid #8c8c8c' }}>{title}</div>
      {children}
    </div>
  )
}

export function RemittanceHistoryWindow({ close }: AreaWindowProps) {
  const c = useCurrentSent()
  const who = sentClaimPatient(c)
  const adj = adjustmentsOf(c)
  const { gross, adjust, net } = paymentOf(c)
  const lines = remittanceOf(c)
  const paid = lines.at(-1)?.paid ?? ''
  useScreenReport({ remittances: lines.length })
  return (
    <WorkspaceDialogFrame id="sent-remittance-history" title="Sent Claim Detail - Remittance History" width={871} height={572} controls={false} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: '8px 10px', gap: 8 }}>
        <Box title="Claim Information" style={{ flex: 'none' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '4px 10px', gap: 4 }} data-tutorial-id="host.mois.field.remittance-claim">
            <div>
              <div style={{ fontWeight: 700, paddingBottom: 2 }}>Patient Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div><KV label="First Name:" w={70}>{c.first}</KV><KV label="Middle Name:" w={70}>{c.m}</KV><KV label="Last Name:" w={70}>{c.last}</KV></div>
                <div><KV label="Insurance By:" w={80}>{c.ins}</KV><KV label="Number:" w={80}>{who?.insrNbr ?? ''}</KV><KV label="Dependant:" w={80}>00</KV></div>
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, paddingBottom: 2 }}>Service Information:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div><KV label="Service Date:" w={76}>{c.service}</KV><KV label="Service No:" w={76}>1.00</KV><KV label="Unit Amount:" w={76}>{c.billed}</KV></div>
                <div><KV label="Fee Code:" w={76}>{c.fee}</KV><div style={{ height: 18 }} /><KV label="Total Billed:" w={76}>{c.billed}</KV></div>
              </div>
            </div>
          </div>
          <div style={{ fontWeight: 700, padding: '2px 10px', borderTop: '1px solid #c8c8c8' }}>Claim Information:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.85fr 0.95fr 0.95fr', padding: '2px 10px 6px', gap: 6 }}>
            <div>
              <KV label="Sent Date:" w={80}>{c.sent}</KV>
              <KV label="Paid Date:" w={80}>{paid}</KV>
              <KV label="Gross Paid:" w={80}>{gross ? gross.toFixed(2) : '0.00'}</KV>
              <div style={{ display: 'flex', gap: 8, lineHeight: '18px' }}>
                <span style={{ width: 80, flex: 'none' }}>Adjustments:</span>
                <span>{adjust.toFixed(2)}</span>
                <span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>(this reflects only the adjustments from the last remittance).</span>
              </div>
              <KV label="Net Paid:" w={80}>{net.toFixed(2)}</KV>
            </div>
            <div>
              <KV label="Sequence No.:" w={82}>{sequenceOf(c)}</KV>
              <KV label="Recon Codes:" w={82}>{`${c.r1 || '-'}  -  ${c.r2}`}</KV>
            </div>
            <AdjustColumn from={0} rows={adj} />
            <AdjustColumn from={3} rows={adj} />
          </div>
        </Box>
        <Box title="Remittance History" style={{ flex: '1 1 auto', minHeight: 0 }}>
          <PBDataWindow
            style={{ flex: '1 1 auto', minHeight: 0 }}
            columns={[
              { key: 'paid', header: 'Paid', width: 88, align: 'center' },
              { key: 'payee', header: 'Payee No', width: 84, align: 'center' },
              { key: 'seq', header: 'Sequence No', width: 84, align: 'center' },
              { key: 'net', header: 'Net Paid', width: 100, align: 'right' },
              { key: 'code', header: 'Code', width: 56, align: 'center' },
              { key: 'e1', header: 'Expl 01', width: 62, align: 'center' },
              { key: 'e2', header: 'Expl 02', width: 62, align: 'center' },
              { key: 'e3', header: 'Expl 03', width: 62, align: 'center' },
              { key: 'adj', header: 'Adj Code 01', width: 90, align: 'center' },
            ]}
            rows={lines}
            rowTutorialId={(r) => `host.mois.row.remittance-${r.seq}`}
          />
        </Box>
        <div style={{ display: 'flex', justifyContent: 'center', flex: 'none' }}>
          <DialogButton id="remittance-history-ok" isDefault width={72} onClick={close}>Ok</DialogButton>
        </div>
      </div>
    </WorkspaceDialogFrame>
  )
}

function AdjustColumn({ from, rows }: { from: number; rows: { code: string; amount: number }[] }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '58px 36px 58px', lineHeight: '18px' }}>
        <span /><span>Code</span><span style={{ textAlign: 'right' }}>Amount</span>
      </div>
      {[0, 1, 2].map((i) => {
        const a = rows[from + i]
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '58px 36px 58px', lineHeight: '18px' }}>
            <span>{`Adjust 0${from + i + 1}:`}</span>
            <span>{a?.code ?? ''}</span>
            <span style={{ textAlign: 'right' }}>{a ? money(a.amount) : '-'}</span>
          </div>
        )
      })}
    </div>
  )
}

export function registerSentClaimWindows() {
  registerAreaWindow('sent-adjustment-summary', AdjustmentSummaryWindow)
  registerAreaWindow('sent-remittance-history', RemittanceHistoryWindow)
}

registerSentClaimWindows()
