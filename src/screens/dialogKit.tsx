import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useReportDialog } from '../host/screen-windows'
import { PBWindow } from '../pb'

/* ============================================================================
   The one modal window every screen's dialogs are drawn with.

   MOIS's dialogs are all the same Win32 child window — a title bar, the
   window face, an optional button strip — laid over the frame on a
   transparent modal layer. The screens grew several frames for it
   (WorkspaceDialogFrame, StageWindow, DemographicModal, AdminExchangeKit's
   DetailWindow, billingProgramsKit's ScreenDialog, the Scheduler's
   SchedulerDialog) and some eighty windows that drew the layer and PBWindow
   by hand. They differ only in where the window is mounted, how high it
   stacks, how it clamps to the desktop and what face it gives its body, so
   those are the parameters here and the named frames are presets of it that
   keep their exact markup.

   Stacking. MOIS stacks a raised window over the one that raised it; these
   are the layers the screens use, from the work area up:            */
export const LAYER = {
  /** a work area's own sheet window (Billing / PBF screens) */
  screen: 76,
  /** Workspace / Billing / Reports windows opened by id */
  workspace: 80,
  /** a folder's modal windows (StageWindow, SchedulerDialog) */
  stage: 85,
  /** a detail / new-record window over a list window */
  detail: 86,
  /** the Demographics dialogs, over the whole desktop */
  demographic: 90,
  /** a message box or window raised over one of the above */
  raised: 96,
  top: 97,
  topmost: 98,
} as const

/* --- where a window is mounted -------------------------------------------
   A modal MOIS window sits over the whole MDI frame, not inside the work
   area that raised it, so most are portalled onto the `.pb-desktop` (the
   box pb/popup places menus in). Until the desktop is found:
     'inline'  render in place (StageWindow's behaviour)
     'none'    render nothing (the Change Address Wizard's list)
     'parent'  portal into the probe's parent instead (DemographicModal)   */
export type DesktopFallback = 'inline' | 'none' | 'parent'

export function DesktopLayer({ children, fallback = 'inline' }: { children: ReactNode; fallback?: DesktopFallback }) {
  const probe = useRef<HTMLSpanElement>(null)
  const [layer, setLayer] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => {
    const desktop = probe.current?.closest<HTMLElement>('.pb-desktop') ?? null
    setLayer(desktop ?? (fallback === 'parent' ? probe.current?.parentElement ?? null : null))
  }, [fallback])
  return (
    <>
      <span ref={probe} hidden />
      {layer ? createPortal(children, layer) : fallback === 'inline' ? children : null}
    </>
  )
}

/** The transparent layer a modal window sits on. */
export function ModalLayer({ zIndex, className, style, children, attrs }: {
  zIndex?: number
  /** replaces the plain layer's classes (a few windows use a tinted layer) */
  className?: string
  style?: CSSProperties
  children: ReactNode
  /** further attributes on the layer (role, aria-*) */
  attrs?: HTMLAttributes<HTMLDivElement>
}) {
  return (
    <div {...attrs} className={className ?? 'pb-modal-layer pb-modal-layer--plain'} style={{ ...(zIndex != null ? { zIndex } : null), ...style }}>
      {children}
    </div>
  )
}

/** Escape closes, Tab cycles inside, focus returns on close — the keyboard
    contract a Win32 modal keeps (DemographicModal's, now any window's). */
function FocusTrap({ label, width, style, onClose, children }: { label: string; width?: string; style?: CSSProperties; onClose: () => void; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    box.current?.focus()
    return () => previous?.focus()
  }, [])
  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
      style={width || style ? { ...(width ? { width } : null), ...style } : undefined} onKeyDown={(e) => {
        if (e.key === 'Escape') { e.stopPropagation(); onClose() }
        if (e.key === 'Tab') {
          const fields = [...(box.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea, select, [tabindex="0"]') ?? [])]
          const first = fields[0], last = fields[fields.length - 1]
          if (e.shiftKey && (document.activeElement === first || document.activeElement === box.current)) { e.preventDefault(); last?.focus() }
          if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
        }
      }}>
      {children}
    </div>
  )
}

function Reported({ id }: { id: string }) {
  useReportDialog(id)
  return null
}

export type ModalWindowProps = {
  /** anchors the window `host.mois.dialog.{id}` */
  id?: string
  title: ReactNode
  onClose: () => void
  children: ReactNode
  /** the window's own style: its size and how it clamps to the desktop */
  windowStyle?: CSSProperties
  /** minimise / maximise boxes (sheet windows have them, dialogs do not) */
  controls?: boolean
  zIndex?: number
  layerClassName?: string
  layerStyle?: CSSProperties
  /** mount on the `.pb-desktop`, and what to do until it is found; omitted,
      the window renders where it is */
  portal?: DesktopFallback
  /** report `id` as `host.dialog` while the window is up */
  report?: boolean
  /** a focus-trapping dialog box around the window, with this width */
  trap?: { label: string; width?: string; style?: CSSProperties }
  /** an anchor other than `host.mois.dialog.{id}` */
  tutorialId?: string
  /* --- the rest of PBWindow, for the windows that need it --------------- */
  windowClassName?: string
  icon?: ReactNode
  sub?: ReactNode
  /** false draws a top-level window frame rather than an MDI child's */
  child?: boolean
  maximized?: boolean
  onMinimize?: () => void
  onMaximize?: () => void
  /* --- around the window ------------------------------------------------ */
  /** an element between the layer and the window (some windows carry their
      anchor or a placement style on a wrapper) */
  wrap?: { className?: string; style?: CSSProperties; tutorialId?: string }
  /** further attributes on the layer (role, aria-*) */
  layerAttrs?: HTMLAttributes<HTMLDivElement>
  /** drawn in the layer after the window: a window raised beside it, a
      <style> the window needs */
  after?: ReactNode
}

export function ModalWindow({
  id, title, onClose, children, windowStyle, controls = false, zIndex, layerClassName, layerStyle, portal, report, trap, tutorialId,
  windowClassName, icon, sub, child = true, maximized, onMinimize, onMaximize, wrap, layerAttrs, after,
}: ModalWindowProps) {
  const window = (
    <PBWindow child={child} controls={controls} title={title} onClose={onClose} className={windowClassName} icon={icon} sub={sub}
      maximized={maximized} onMinimize={onMinimize} onMaximize={onMaximize}
      tutorialId={tutorialId ?? (id ? `host.mois.dialog.${id}` : undefined)} style={windowStyle}>
      {children}
    </PBWindow>
  )
  const wrapped = wrap
    ? <div className={wrap.className} style={wrap.style} data-tutorial-id={wrap.tutorialId}>{window}</div>
    : window
  const layered = (
    <ModalLayer zIndex={zIndex} className={layerClassName} style={layerStyle} attrs={layerAttrs}>
      {trap ? <FocusTrap label={trap.label} width={trap.width} style={trap.style} onClose={onClose}>{wrapped}</FocusTrap> : wrapped}
      {after}
    </ModalLayer>
  )
  return (
    <>
      {report && id && <Reported id={id} />}
      {portal ? <DesktopLayer fallback={portal}>{layered}</DesktopLayer> : layered}
    </>
  )
}

/** The window face under a title bar: a column that fills the window. */
export const FACE: CSSProperties = { flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--pb-face)' }

/** A window clamped `inset` px inside the desktop: `min(w, 100% - inset)`. */
export const clampTo = (inset: number, width: number, height?: number): CSSProperties => ({
  width: `min(${width}px, calc(100% - ${inset}px))`,
  ...(height ? { height: `min(${height}px, calc(100% - ${inset}px))` } : null),
})
