import { MSP_EXPLANATORY_CODES, SENT_CLAIM_KEY, explanatoryCodes, type SentClaim } from '../data/claims'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   Sent Claim Detail — Billing ▸ Sent Claims, Action ▸ Detail Expl Code
   (Ctrl+E).

   PROVENANCE:
     303602 (Sent Claims, Action menu): "Detail Expl Code  CTRL+E  Opens the
       'Sent Claim Detail' window which will list any explanatory codes from
       MSP regarding why claims were failed/rejected".
     303501: "press CONTROL+E, this will now populate a new window called the
       Sent Claim Detail. This window gives you a breakdown of what the code
       means".
     3786544 capture `810550956f…` (cloud v02.31.41, over Sent To MSP) and
     2257761 capture `fa942311f4…` (695 x 449) — the same window: title bar
     "Sent Claim Detail" with a close box only; a ruled box whose grey band
     reads "MSP Claim Explanation Codes"; a bold "CODE  DESCRIPTION" heading
     row; the codes one per row on alternating grey and white bands, eight
     bands deep whether or not they are filled; a single Ok centred below.

   The codes are the E1–E3 of the claim loaded in Sent To MSP (a Prompt -
   Recon / Prompt - Chart pick; data/claims.ts SENT_CLAIM_KEY); the
   descriptions are MSP_EXPLANATORY_CODES, which holds only the captions the
   manual prints. A claim that came back paid has none, and the window
   opens on its empty bands.

   Reported: `host.dialog` = sent-claim-detail; `host.screen.explCodes` —
   how many codes it lists.
   ========================================================================= */

const BANDS = 8

export function SentClaimDetailWindow({ close }: AreaWindowProps) {
  const [claim] = useSessionState<SentClaim | null>(SENT_CLAIM_KEY, null)
  const codes = explanatoryCodes(claim)
  useScreenReport({ explCodes: codes.length })
  const rows = Array.from({ length: Math.max(BANDS, codes.length) }, (_, i) => codes[i] ?? '')

  return (
    <WorkspaceDialogFrame id="sent-claim-detail" title="Sent Claim Detail" width={695} height={449} controls={false} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: '12px 22px 10px' }}>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid #646464', background: '#fff' }}>
          <div style={{ flex: 'none', height: 24, display: 'flex', alignItems: 'center', padding: '0 6px', fontWeight: 700, background: '#dcd7d2', borderBottom: '1px solid #646464' }}>
            MSP Claim Explanation Codes
          </div>
          <div style={{ flex: 'none', display: 'grid', gridTemplateColumns: '54px 1fr', padding: '4px 6px', fontWeight: 700, letterSpacing: '.02em' }}>
            <span>CODE</span><span>DESCRIPTION</span>
          </div>
          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }} data-tutorial-id="host.mois.field.explanation-codes">
            {rows.map((code, i) => (
              <div
                key={i}
                data-tutorial-id={code ? `host.mois.row.expl-${code.toLowerCase()}` : undefined}
                style={{
                  display: 'grid', gridTemplateColumns: '54px 1fr', alignItems: 'start',
                  minHeight: 38, padding: '4px 6px', background: i % 2 ? '#fff' : '#e8e8e8',
                }}
              >
                <span style={{ textAlign: 'center', paddingRight: 12 }}>{code}</span>
                <span>{code ? MSP_EXPLANATORY_CODES[code] ?? '' : ''}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flex: 'none' }}>
          <DialogButton id="sent-claim-detail-ok" isDefault width={94} onClick={close}>Ok</DialogButton>
        </div>
      </div>
    </WorkspaceDialogFrame>
  )
}

/** Registered at module load, and again from screens/BillingViews.tsx, which
    the frame imports for its exports. */
export function registerSentClaimDetail() {
  registerAreaWindow('sent-claim-detail', SentClaimDetailWindow)
}

registerSentClaimDetail()
