import { useState } from 'react'
import { PBMessageBox, usePBInstrumentation } from '../pb'
import { MOIS_TODAY } from '../data/patients'
import {
  LOCKOUT_ENDS_ROW, LOCKOUT_MESSAGE_ROW, LOCKOUT_RELEASED_KEY, SYSTEM_SETTINGS_KEY, lockoutOf,
} from '../data/systemSettings'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   Clinic-wide MOIS Lockout — what a login meets while an administrator's
   lock is set (Administration ▸ System Settings ▸ LOCKOUT).

   PROVENANCE: article 303352 "Create a Lockout", capture `fc7d615f…` —
     - title bar "Clinic-wide MOIS Lockout", close box only;
     - a ruled box headed by a grey "Lockout Message" band, the message
       top-left in it and "Lock Expires: 2012-10-12 10:00:00" along its
       foot (the Lockout Ends value with the seconds MOIS appends);
     - Release Lock bottom-left, Close bottom-right;
     - Release Lock raises "Confirm Lock Release", a red-cross message box:
       "MOIS has been locked by an administrator.  It is not recommended
       that you remove the lock unless you are certain it is safe to do so.
       Are you sure you want to remove the lock?" — Yes / No.
   303352's prose: "They will then see a confirmation message letting them
   know that are removing the lock. By doing so they will release the lock
   for all workstations." Yes therefore clears the LOCKOUT rows and lets the
   login through (the window closes); No leaves the lock and the window.

   Reached on the stage the way the article reaches it — by logging in:
   Maintenance ▸ Lock MOIS / Switch User opens the login panel
   (LoginDialog.tsx), whose Ok raises this window while a lock is set.
   Close shuts the window without logging in; the stage has no "exit MOIS"
   to fall back to, so the frame stays behind it.

   Reported: `host.screen.lockPrompt` while the confirmation is up, and
   `host.screen.lockout` — `none` / `set` / `released` — from the always-
   mounted LockoutStatusReporter below, so a lesson can grade Save (the lock
   is set) and Yes (it was released) after the windows have closed.
   ========================================================================= */

export const LOCKOUT_WINDOW_ID = 'clinic-wide-mois-lockout'

/** The committed LOCKOUT band, as a lock (or null) — for the login panel. */
export function useActiveLockout() {
  const [saved] = useSessionState<Record<string, string>>(SYSTEM_SETTINGS_KEY, {})
  return lockoutOf(saved, MOIS_TODAY)
}

/** Reports `host.screen.lockout` for as long as the frame is up. */
export function LockoutStatusReporter() {
  const lock = useActiveLockout()
  const [released] = useSessionState<boolean>(LOCKOUT_RELEASED_KEY, false)
  useScreenReport({ lockout: lock ? 'set' : released ? 'released' : 'none' })
  return null
}

export function ClinicLockoutWindow({ close }: AreaWindowProps) {
  const host = usePBInstrumentation()
  const lock = useActiveLockout()
  const [, setSaved] = useSessionState<Record<string, string>>(SYSTEM_SETTINGS_KEY, {})
  const [, setReleased] = useSessionState<boolean>(LOCKOUT_RELEASED_KEY, false)
  const [confirming, setConfirming] = useState(false)
  useScreenReport({ lockPrompt: confirming })

  const answer = (value: string) => {
    const yes = value === 'yes'
    host?.report('command', { command: yes ? 'lock-release-yes' : 'lock-release-no' })
    setConfirming(false)
    if (!yes) return
    /* "release the lock for all workstations": the setting itself is cleared */
    setSaved((s) => ({ ...s, [LOCKOUT_MESSAGE_ROW]: '', [LOCKOUT_ENDS_ROW]: '' }))
    setReleased(true)
    close()
  }

  return (
    <>
      <WorkspaceDialogFrame id={LOCKOUT_WINDOW_ID} title="Clinic-wide MOIS Lockout" width={338} height={222} controls={false} onClose={close}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', padding: '8px 12px 10px', minHeight: 0 }}>
          <div
            style={{
              flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column',
              border: '1px solid #646464', background: 'var(--pb-face)',
            }}
          >
            <div
              style={{
                flex: 'none', height: 20, display: 'flex', alignItems: 'center', padding: '0 6px',
                fontWeight: 700, background: '#dcd7d2', borderBottom: '1px solid #646464',
              }}
            >
              Lockout Message
            </div>
            <div
              data-tutorial-id="host.mois.field.lockout-message"
              style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '6px 6px 0', whiteSpace: 'pre-wrap' }}
            >
              {lock?.message ?? ''}
            </div>
            <div data-tutorial-id="host.mois.field.lock-expires" style={{ flex: 'none', padding: '0 6px 4px' }}>
              Lock Expires: {lock ? `${lock.ends}:00` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', paddingTop: 8, flex: 'none' }}>
            <DialogButton id="release-lock" width={90} onClick={() => setConfirming(true)}>Release Lock</DialogButton>
            <span style={{ flex: '1 1 auto' }} />
            <DialogButton id="lockout-close" width={75} onClick={close}>Close</DialogButton>
          </div>
        </div>
      </WorkspaceDialogFrame>
      {confirming && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 90 }}>
          <PBMessageBox
            title="Confirm Lock Release"
            icon="error"
            buttons={[
              { label: 'Yes', value: 'yes', tutorialId: 'host.mois.command.lock-release-yes' },
              { label: 'No', value: 'no', default: true, tutorialId: 'host.mois.command.lock-release-no' },
            ]}
            onClose={answer}
          >
            MOIS has been locked by an administrator.  It is not recommended that you remove the lock unless you are
            certain it is safe to do so. Are you sure you want to remove the lock?
          </PBMessageBox>
        </div>
      )}
    </>
  )
}

/** Registered at module load, and again from the frame, which imports this
    file for its exports (see ChangeTeleplanPasswordDialog.tsx). */
export function registerLockoutWindows() {
  registerAreaWindow(LOCKOUT_WINDOW_ID, ClinicLockoutWindow)
}

registerLockoutWindows()
