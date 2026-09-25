import { useState } from 'react'
import { CONVERTED_PROVIDERS_KEY, CURRENT_PROVIDER_KEY, clinicListSpec, type ConvertedProviders } from '../data/clinicManagement'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import { PBButton, PBCheckbox, PBInput, PBWindow, pbSlug, usePBInstrumentation } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'

/* ============================================================================
   Provider Type Conversion Utility.
   Administration ▸ Provider List ▸ Utilities ▸ Convert to Different Provider
   Type (2090817, MOIS 2.22+).

   Transcribed from `8aef2a98…`: Name and Type read-only; a Workspace /
   Scheduling block of four ticks (the daybook one ticked for a provider that
   has one) and a greyed Short Name with "(Abbreviated Reference for
   Workspace identification)"; then Convert to Provider (greyed — the record
   already is one), Convert to Org Role, Convert to Organization, and Cancel.

   Converting moves the record: it leaves the Provider List and appears in
   the Org Role List or the Organization List (2090817: converting "will
   clean up your internal Provider list"). The move lasts for the stage
   session (`useSessionState`), not across a reload.

   Reports `host.dialog = provider-type-conversion` while open.
   ========================================================================= */

const WORKSPACE_TICKS = [
  'Will require a daybook for scheduling appointments / encounters',
  'Will require a workspace for acknowledging clinical documents',
  'Will require a workspace for receiving / managing internal tasks',
  'Will require a workspace for receiving / managing internal message.',
]

export function ProviderTypeConversionDialog({ close }: AreaWindowProps) {
  const host = usePBInstrumentation()
  const providers = clinicListSpec('ad-provider-list')?.rows ?? []
  const [current] = useSessionState<string>(CURRENT_PROVIDER_KEY, String(providers[0]?.name ?? ''))
  const [converted, setConverted] = useSessionState<ConvertedProviders>(CONVERTED_PROVIDERS_KEY, {})
  const [ticks, setTicks] = useState([true, false, false, false])
  useScreenReport({ dialog: 'provider-type-conversion' })

  const convert = (to: 'org-role' | 'organization') => {
    host?.report('command', { command: `convert-to-${to}` })
    setConverted({ ...converted, [current]: to })
    close()
  }
  const button = (label: string, onClick?: () => void, disabled?: boolean) => (
    <PBButton
      disabled={disabled}
      data-tutorial-id={host?.anchor('command', pbSlug(label))}
      onClick={onClick}
      style={{ minWidth: 116 }}
    >
      {label}
    </PBButton>
  )

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 75 }}>
      <PBWindow
        child
        controls={false}
        title="Provider Type Conversion Utility"
        onClose={close}
        tutorialId="host.mois.dialog.provider-type-conversion"
        style={{ width: 706, maxWidth: '100%' }}
      >
        <div style={{ background: '#fff', margin: 8, border: '1px solid #a0a0a0' }}>
          <div className="pb-row" style={{ gap: 8, padding: '12px 12px', borderBottom: '1px solid #c0c0c0' }}>
            <span style={{ width: 80 }}>Name:</span>
            <PBInput w={262} value={current} readOnly data-tutorial-id="host.mois.field.name" />
            <span style={{ marginLeft: 8, width: 70 }}>Type:</span>
            <PBInput w={162} value="PROVIDER" readOnly />
          </div>
          <div style={{ padding: '8px 12px 14px' }}>
            <div>Workspace / Scheduling:</div>
            <div style={{ paddingLeft: 88 }} data-tutorial-id="host.mois.field.workspace-scheduling">
              {WORKSPACE_TICKS.map((label, i) => (
                <div key={label} style={{ padding: '1px 0' }}>
                  <PBCheckbox
                    label={label}
                    checked={ticks[i]}
                    onChange={(v) => setTicks((t) => t.map((x, j) => (j === i ? v : x)))}
                  />
                </div>
              ))}
            </div>
            <div className="pb-row" style={{ gap: 8, paddingTop: 4 }}>
              <span style={{ width: 80 }}>Short Name:</span>
              <PBInput w={60} disabled={!ticks.slice(1).some(Boolean)} />
              <span style={{ color: '#a0a0a0' }}>(Abbreviated Reference for Workspace identification)</span>
            </div>
          </div>
          <div className="pb-row" style={{ gap: 2, padding: '8px 6px', borderTop: '1px solid #c0c0c0', background: 'var(--pb-face)' }}>
            {button('Convert to Provider', undefined, true)}
            {button('Convert to Org Role', () => convert('org-role'))}
            {button('Convert to Organization', () => convert('organization'))}
            <span style={{ flex: 1 }} />
            {button('Cancel', close)}
          </div>
        </div>
      </PBWindow>
    </div>
  )
}

registerAreaWindow('provider-type-conversion', ProviderTypeConversionDialog)
