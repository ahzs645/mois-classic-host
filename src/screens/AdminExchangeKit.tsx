import { useState, type CSSProperties, type ReactNode } from 'react'
import { stageStamp } from '../data/clock'
import { useReportDialog } from '../host/screen-windows'
import { PBButton, PBCheckbox, PBMessageBox, pbSlug } from '../pb'
import { DesktopLayer, FACE, LAYER, ModalWindow, clampTo } from './dialogKit'
import { FormLabel, NAVY, SectionCaption } from './formKit'

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
  return stageStamp('  ')
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
  return <SectionCaption color={NAVY.caption} padding="6px 6px 3px" rule="#b8b8b8" fixed row grow right={right}>{children}</SectionCaption>
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
      <PBMessageBox plain zIndex={LAYER.top} title={title} icon={icon} closeValue="close" onClose={onClose}
        tutorialId={`host.mois.dialog.${id}`} textStyle={{ whiteSpace: 'pre-line' }}
        buttons={buttons.map((b, i) => ({
          label: b, value: b, default: i === 0, command: `${prefix}${pbSlug(b)}`, style: { minWidth: 0, height: 23, width: 80 },
        }))}>
        {children}
      </PBMessageBox>
    </DesktopLayer>
  )
}

/** A label column cell, right-aligned the way MOIS forms print them. */
export const FieldLabel = ({ children, w = 90, right }: { children: ReactNode; w?: number; right?: boolean }) => (
  <FormLabel w={w} align={right ? 'right' : undefined}>{children}</FormLabel>
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
