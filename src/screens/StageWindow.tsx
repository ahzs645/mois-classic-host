import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePatient } from '../data/patient-context'
import { useReportDialog } from '../host/screen-windows'
import { PBBand, PBButton, PBMessageBox, PBWindow, pbSlug } from '../pb'

/* ============================================================================
   The frame a folder's modal windows share.

   MOIS opens these as top-level modal windows centred on the screen, over
   the whole MDI frame — not inside the work area that raised them — so the
   window is portalled onto the `.pb-desktop`, the same box `pb/popup` places
   menus in. Each one reports itself as `host.dialog` while it is up
   (host/screen-state.tsx) and is anchored `host.mois.dialog.<id>`.
   ========================================================================= */

/** Render `children` on the desktop the calling screen sits on. */
export function DesktopLayer({ children }: { children: ReactNode }) {
  const probe = useRef<HTMLSpanElement>(null)
  const [layer, setLayer] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => {
    setLayer((probe.current?.closest('.pb-desktop') as HTMLElement | null) ?? null)
  }, [])
  return (
    <>
      <span ref={probe} hidden />
      {/* until the desktop is found (or with no desktop at all) the window
          still renders, in place */}
      {layer ? createPortal(children, layer) : children}
    </>
  )
}

export function StageWindow({
  id, title, width, height, onClose, children, footer, style, bodyStyle,
}: {
  /** the dialog id: reported as `host.dialog` and anchored `host.mois.dialog.<id>` */
  id: string
  title: ReactNode
  width: number
  height?: number
  onClose: () => void
  children: ReactNode
  /** the button strip along the bottom, on the window face */
  footer?: ReactNode
  style?: CSSProperties
  bodyStyle?: CSSProperties
}) {
  useReportDialog(id)
  return (
    <DesktopLayer>
      <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 85 }}>
        <PBWindow
          tutorialId={`host.mois.dialog.${id}`}
          child
          controls={false}
          title={title}
          onClose={onClose}
          style={{
            width: `min(${width}px, calc(100% - 24px))`,
            ...(height ? { height: `min(${height}px, calc(100% - 24px))` } : null),
            ...style,
          }}
        >
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--pb-face)', ...bodyStyle }}>
            {children}
          </div>
          {footer && <div className="pb-footer">{footer}</div>}
        </PBWindow>
      </div>
    </DesktopLayer>
  )
}

/** A Win32 message box, reported as a dialog like any other window. */
export function StageMessageBox({
  id, title, icon = 'question', children, buttons, onClose,
}: {
  id: string
  title: string
  icon?: 'info' | 'warn' | 'error' | 'question'
  children: ReactNode
  buttons: { label: string; value: string; default?: boolean }[]
  onClose: (value: string) => void
}) {
  useReportDialog(id)
  return (
    <DesktopLayer>
      <div data-tutorial-id={`host.mois.dialog.${id}`} style={{ display: 'contents' }}>
        {/* each button is anchored `host.mois.command.<label>` (Yes → .yes) */}
        <PBMessageBox title={title} icon={icon} onClose={onClose}
          buttons={buttons.map((b) => ({ ...b, tutorialId: `host.mois.command.${pbSlug(b.label)}` }))}>{children}</PBMessageBox>
      </div>
    </DesktopLayer>
  )
}

/** A default-button footer entry: the one F2 presses. */
export function FooterButton({ children, onClick, primary, disabled, tutorialId, wide = true }: {
  children: ReactNode
  onClick?: () => void
  primary?: boolean
  disabled?: boolean
  tutorialId?: string
  wide?: boolean
}) {
  return (
    <PBButton wide={wide} className={primary ? 'pb-btn--default' : undefined} disabled={disabled} onClick={onClick} data-tutorial-id={tutorialId}>
      {children}
    </PBButton>
  )
}

/** The `Current Patient` / `Patient Information` block most of these windows open with. */
export function CurrentPatientBlock({ title = 'Current Patient', healthNo = false }: {
  title?: string
  /** v2.27's Select Medications to Print prints `BC Health No.:` where
      Drug Interaction Results prints `Insurance:` (303227 `b8e5665f…png`) */
  healthNo?: boolean
}) {
  const p = usePatient()
  return (
    <div className="pb-groupbox" style={{ margin: '6px 6px 0', flex: 'none' }}>
      <PBBand>{title}</PBBand>
      <div className="pb-row" style={{ padding: '3px 8px', gap: 0, background: '#fff' }}>
        <span style={{ width: 150 }}>Chart:&nbsp;&nbsp;<b>{p.chart}</b></span>
        <span style={{ flex: '1 1 auto' }}>Patient:&nbsp;&nbsp;<b>{`${p.last}, ${p.first}`.toUpperCase()}</b></span>
        <span style={{ width: 140 }}>DoB:&nbsp;<b>{p.dob}</b></span>
        <span style={{ width: 70 }}>Sex:&nbsp;<b>{p.sex}</b></span>
        {healthNo
          ? <span style={{ width: 190 }}>BC Health No.:&nbsp;&nbsp;<b>{p.bchn ?? p.insurance ?? ''}</b></span>
          : <span style={{ width: 170 }}>Insurance:&nbsp;&nbsp;<b>{p.insuranceBy ?? 'BC'}&nbsp;&nbsp;{p.bchn ?? p.insurance ?? ''}</b></span>}
      </div>
    </div>
  )
}
