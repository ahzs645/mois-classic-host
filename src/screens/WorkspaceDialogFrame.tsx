import type { CSSProperties, ReactNode } from 'react'
import { PBButton, PBWindow, usePBInstrumentation } from '../pb'

/* ============================================================================
   The frame the Workspace / Billing / Reports windows share: a modal layer
   over the desktop and a child PBWindow, ringed by `host.mois.dialog.{id}`.

   Their buttons are anchored `host.mois.command.{id}` and report a
   `host.mois.command` the same way a command-row button does, so a lesson can
   press "Create (F2)" in autoplay and a learner's click in practice mode
   matches the same step. The ids are prefixed per window (`task-create`,
   `message-save`) because `clickAnchor` takes the first match in the DOM, and
   the command row behind the window carries its own Refresh and Print.
   ========================================================================= */

export function WorkspaceDialogFrame({
  id, title, width, height, onClose, children, style, controls = true, zIndex = 80,
}: {
  /** the window's anchor slug — `host.mois.dialog.{id}` */
  id: string
  title: ReactNode
  width: number
  height?: number
  onClose: () => void
  children: ReactNode
  style?: CSSProperties
  /** minimise / maximise boxes: MOIS's sheet windows have them, message boxes do not */
  controls?: boolean
  zIndex?: number
}) {
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex }}>
      <PBWindow
        child
        controls={controls}
        title={title}
        onClose={onClose}
        tutorialId={`host.mois.dialog.${id}`}
        style={{ width, height, maxWidth: 'calc(100% - 16px)', maxHeight: 'calc(100% - 16px)' }}
      >
        <div
          style={{
            display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0,
            background: 'var(--pb-face)', ...style,
          }}
        >
          {children}
        </div>
      </PBWindow>
    </div>
  )
}

/** A dialog push button that reports itself as `host.mois.command.{id}`. */
export function DialogButton({
  id, children, onClick, disabled, width = 88, isDefault,
}: {
  id: string
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  width?: number
  isDefault?: boolean
}) {
  const host = usePBInstrumentation()
  return (
    <PBButton
      className={isDefault ? 'pb-btn--default' : undefined}
      style={{ width, minWidth: 0, height: 24 }}
      disabled={disabled}
      data-tutorial-id={host?.anchor('command', id)}
      onClick={() => {
        host?.report('command', { command: id })
        onClick?.()
      }}
    >
      {children}
    </PBButton>
  )
}

/** The grey band a MOIS form window opens on ("Task Information"). */
export function FormBand({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', height: 28, flex: 'none', padding: '0 0 0 6px',
        background: 'linear-gradient(#e4e0dc, #d6d1cc)', borderBottom: '1px solid #a0a0a0',
        fontWeight: 'bold',
      }}
    >
      <span style={{ flex: '1 1 auto' }}>{children}</span>
      {right}
    </div>
  )
}

/** A thin sunken rule between a form's sections. */
export const FormRule = () => (
  <div style={{ height: 0, borderTop: '1px solid #a0a0a0', borderBottom: '1px solid #fff', flex: 'none' }} />
)
