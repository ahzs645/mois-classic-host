import { useState } from 'react'
import { PBCheckbox, PBInput } from '../pb'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogButton, FormBand, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   Utilities ▸ Change Teleplan Password — 304394 "How to Change Your MSP
   Teleplan Password", image `d2eded4d` (493 × 342).

   A grey "Change Password" band; a "Current MSP Login Information" group
   with Username and Password filled in and a Show Password checkbox beside
   the password; the 42-day question; three radios with "No thanks"
   selected by default ("so opening the window changes nothing by itself");
   a field beside "Yes, use this password:"; Ok and Cancel, bottom centre.
   The window has only a close box.

   The credentials are the capture's own training values. The frame sees
   which radio is chosen (`host.screen.teleplanChoice`: no / generate / own)
   and, after Ok, whether a new password was set — never the password.
   ========================================================================= */

type Choice = 'no' | 'generate' | 'own'

export const TELEPLAN_PASSWORD_KEY = 'teleplan:password'

const RADIOS: { value: Choice; label: string }[] = [
  { value: 'no', label: 'No thanks' },
  { value: 'generate', label: 'Yes, let MOIS choose a new password' },
  { value: 'own', label: 'Yes, use this password:' },
]

export function ChangeTeleplanPasswordDialog({ close }: AreaWindowProps) {
  const [show, setShow] = useState(false)
  const [choice, setChoice] = useState<Choice>('no')
  const [own, setOwn] = useState('')
  const [, setResult] = useSessionState<'unchanged' | 'changed'>(TELEPLAN_PASSWORD_KEY, 'unchanged')

  useScreenReport({ teleplanChoice: choice })

  const ok = () => {
    if (choice === 'generate' || (choice === 'own' && own.trim())) setResult('changed')
    close()
  }

  return (
    <WorkspaceDialogFrame
      id="change-teleplan-password"
      title="Change Teleplan Password"
      width={493}
      height={342}
      controls={false}
      onClose={close}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', padding: '8px 10px 10px' }}>
        <div style={{ border: '1px solid #a0a0a0', display: 'flex', flexDirection: 'column', flex: '1 1 auto', background: 'var(--pb-window, #fff)' }}>
          <FormBand>Change Password</FormBand>
          <fieldset style={{ margin: '8px 10px 4px', padding: '2px 10px 6px', border: '1px solid #c8c8c8', borderRadius: 3 }}>
            <legend style={{ fontWeight: 700, padding: '0 3px' }}>Current MSP Login Information</legend>
            <div className="pb-row" style={{ gap: 6, padding: '2px 0' }}>
              <span className="pb-form__label" style={{ width: 62, textAlign: 'right' }}>Username:</span>
              <PBInput w={226} value="ttut9999" readOnly />
            </div>
            <div className="pb-row" style={{ gap: 6, padding: '2px 0' }}>
              <span className="pb-form__label" style={{ width: 62, textAlign: 'right' }}>Password:</span>
              <PBInput w={226} value={show ? 'oldpass' : '*******'} readOnly />
              <PBCheckbox label="Show Password" checked={show} onChange={setShow} tutorialId="host.mois.check.teleplan-show-password" />
            </div>
          </fieldset>
          <div style={{ padding: '8px 12px 4px', lineHeight: 1.35 }}>
            MSP requires that your Teleplan password be changed every 42 days. Would you like to change it now?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '4px 0 6px 50px' }}>
            {RADIOS.map((r) => (
              <div key={r.value} className="pb-row" style={{ gap: 4 }}>
                <label className="pb-check pb-check--radio">
                  <input
                    type="radio"
                    name="teleplan-change"
                    value={r.value}
                    checked={choice === r.value}
                    onChange={() => setChoice(r.value)}
                    data-tutorial-id={`host.mois.field.teleplan-change-${r.value}`}
                  />
                  <span className="pb-check__box"><span className="pb-check__dot" /></span>
                  <span className="pb-check__label">{r.label}</span>
                </label>
                {r.value === 'own' && (
                  <PBInput
                    w={170}
                    value={own}
                    onChange={(e) => { setOwn(e.target.value); setChoice('own') }}
                    data-tutorial-id="host.mois.field.teleplan-new-password"
                  />
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, padding: '8px 0 10px', marginTop: 'auto' }}>
            <DialogButton id="teleplan-password-ok" isDefault width={75} onClick={ok}>Ok</DialogButton>
            <DialogButton id="teleplan-password-cancel" width={75} onClick={close}>Cancel</DialogButton>
          </div>
        </div>
      </div>
    </WorkspaceDialogFrame>
  )
}

/** Registered at module load, and again from screens/BillingViews.tsx, which
    the frame imports for its exports — the package's `"sideEffects"` field
    lets the Next bundler drop the side-effect-only import in
    areaWindows.register.ts (see WorkspaceSettingsView.tsx). */
export function registerChangeTeleplanPassword() {
  registerAreaWindow('change-teleplan-password', ChangeTeleplanPasswordDialog)
}

registerChangeTeleplanPassword()
