import { useState, type CSSProperties, type ReactNode } from 'react'
import { MOIS_TODAY } from '../data/patients'
import { useReportDialog } from '../host/screen-windows'
import { PBButton, PBCheckbox, PBWindow, pbSlug } from '../pb'
import { DesktopLayer, FACE, LAYER, ModalWindow, clampTo } from './dialogKit'

/* ============================================================================
   Small shared pieces for the Administration ▸ Configuration, Data Exchange
   (Automated Notifications, Document Center, unmatched results),
   myhealthkey and alternate-launch-mode screens (E2 stream, 2026-09-28).

   Nothing here is a MOIS window on its own; each is an idiom the captures
   repeat:
     - `DetailWindow` — a detail / new-record window centred on the desktop,
       optionally with the navy heading band MOIS paints under the title bar
       (`Printer Profile`, `Field Audit Setup`) and a centred button row;
     - `SectionHead` — the navy bold caption over a ruled-off block
       ("Identification", "Printer Settings");
     - `TopMessage` — a Win32 message box drawn above any detail window, with
       every button anchored `host.mois.command.<prefix><label>`;
     - `Btn` — a push button that reports `host.mois.command` like a
       command-row button;
     - `stampNow()` — MOIS's `yyyy.mm.dd hh:mm` stamp on the stage's day.
   ========================================================================= */

/** `yyyy.mm.dd hh:mm` on the stage's day. */
export function stampNow(): string {
  const now = new Date()
  return `${MOIS_TODAY}  ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

/** A push button that reports itself as `host.mois.command.{id}`. */
export function Btn({ id, children, onClick, disabled, width, isDefault, style }: {
  id: string
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  width?: number
  isDefault?: boolean
  style?: CSSProperties
}) {
  return (
    <PBButton
      command={id}
      className={isDefault ? 'pb-btn--default' : undefined}
      style={{ minWidth: 0, height: 23, ...(width ? { width } : { padding: '0 12px' }), ...style }}
      disabled={disabled}
      onClick={() => onClick?.()}
    >
      {children}
    </PBButton>
  )
}

/** The navy section caption with the rule under it ("Identification"). */
export function SectionHead({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="pb-row" style={{ color: '#0a246a', fontWeight: 700, padding: '6px 6px 3px', borderBottom: '1px solid #b8b8b8', flex: 'none' }}>
      <span style={{ flex: '1 1 auto' }}>{children}</span>
      {right}
    </div>
  )
}

/** A detail or new-record window: title bar, optional navy heading, body, centred buttons. */
export function DetailWindow({
  id, title, heading, width, height, onClose, children, buttons, zIndex = LAYER.detail, bodyStyle,
}: {
  /** reported as `host.dialog`, anchored `host.mois.dialog.{id}` */
  id: string
  title: string
  /** the navy band under the title bar some detail windows carry */
  heading?: string
  width: number
  height?: number
  onClose: () => void
  children: ReactNode
  buttons?: ReactNode
  zIndex?: number
  bodyStyle?: CSSProperties
}) {
  return (
    <ModalWindow id={id} title={title} onClose={onClose} portal="inline" report zIndex={zIndex} windowStyle={clampTo(24, width, height)}>
      {heading && <div className="pb-viewhead" style={{ flex: 'none' }}><span className="pb-viewhead__title">{heading}</span></div>}
      <div style={{ ...FACE, ...bodyStyle }}>
        {children}
      </div>
      {buttons && (
        <div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: '8px 0 10px', flex: 'none', borderTop: '1px solid #c8c8c8' }}>
          {buttons}
        </div>
      )}
    </ModalWindow>
  )
}

const ICON: Record<'info' | 'warn' | 'error' | 'question', ReactNode> = {
  info: (
    <svg viewBox="0 0 32 32" width="32" height="32"><circle cx="16" cy="16" r="14" fill="#1f7fd0" /><circle cx="16" cy="9.5" r="2" fill="#fff" /><path d="M13.6 14h4.2v10h-4.2z" fill="#fff" /></svg>
  ),
  warn: (
    <svg viewBox="0 0 32 32" width="32" height="32"><path d="M16 2l14 26H2z" fill="#f2c200" stroke="#b08c00" /><path d="M14.4 11h3.2v9h-3.2z" fill="#3a2f00" /><circle cx="16" cy="23.5" r="1.9" fill="#3a2f00" /></svg>
  ),
  error: (
    <svg viewBox="0 0 32 32" width="32" height="32"><circle cx="16" cy="16" r="14" fill="#d33" /><path d="M9 9l14 14M23 9L9 23" stroke="#fff" strokeWidth="3.4" /></svg>
  ),
  question: (
    <svg viewBox="0 0 32 32" width="32" height="32"><circle cx="16" cy="16" r="14" fill="#1f7fd0" /><path d="M11.6 12.2c0-2.6 2-4.4 4.6-4.4 2.7 0 4.5 1.6 4.5 4 0 3.4-4 3.2-4 6.6h-3c0-4.4 4-4.2 4-6.4 0-1-.7-1.6-1.6-1.6-1 0-1.7.7-1.7 1.8z" fill="#fff" /><circle cx="16" cy="23.5" r="2" fill="#fff" /></svg>
  ),
}

/**
 * A message box above any window this stream opens. Buttons are anchored
 * `host.mois.command.{prefix}{slug}` — the prefix keeps a Yes here from
 * matching a Yes in a window behind it.
 */
export function TopMessage({ id, title, icon = 'info', children, buttons, onClose, prefix = '' }: {
  id: string
  title: string
  icon?: 'info' | 'warn' | 'error' | 'question'
  children: ReactNode
  buttons: string[]
  onClose: (button: string) => void
  prefix?: string
}) {
  useReportDialog(id)
  return (
    <DesktopLayer>
      <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 97 }}>
        <PBWindow child controls={false} title={title} onClose={() => onClose('close')} className="pb-msgbox" tutorialId={`host.mois.dialog.${id}`}>
          <div className="pb-msgbox__body">
            <span className="pb-msgbox__icon">{ICON[icon]}</span>
            <span className="pb-msgbox__text" style={{ whiteSpace: 'pre-line' }}>{children}</span>
          </div>
          <div className="pb-msgbox__footer">
            {buttons.map((b, i) => (
              <Btn key={b} id={`${prefix}${pbSlug(b)}`} isDefault={i === 0} width={80} onClick={() => onClose(b)}>{b}</Btn>
            ))}
          </div>
        </PBWindow>
      </div>
    </DesktopLayer>
  )
}

/** A label column cell, right-aligned the way MOIS forms print them. */
export const FieldLabel = ({ children, w = 90, right }: { children: ReactNode; w?: number; right?: boolean }) => (
  <span className="pb-form__label" style={{ width: w, flex: 'none', textAlign: right ? 'right' : undefined }}>{children}</span>
)

/** The blue-grey filter band a list opens on (Call Lists, Outbound Documents). */
export function FilterBand({ children, anchor, style }: { children: ReactNode; anchor?: string; style?: CSSProperties }) {
  return (
    <div data-tutorial-id={anchor} style={{ background: 'var(--pb-face)', borderBottom: '1px solid #a0a0a0', padding: '4px 8px', flex: 'none', ...style }}>
      {children}
    </div>
  )
}

/** A grid tick box that keeps its own state — a list whose rows are data. */
export function ToggleCell({ initial, anchor, onChange }: { initial: boolean; anchor: string; onChange?: (v: boolean) => void }) {
  const [on, setOn] = useState(initial)
  return <PBCheckbox checked={on} onChange={(v) => { setOn(v); onChange?.(v) }} tutorialId={anchor} />
}
