import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { PBBand, PBButton, PBSelect, pbSlug, usePBInstrumentation, type PBSelectOption } from '../pb'

/* ============================================================================
   Small pieces the admin/reference windows share: an edit box that sits in
   a DataWindow cell (MOIS edits these grids in place), a band with its
   right-hand buttons, the centred footer, and a labelled line. Every button
   is anchored `host.mois.command.<id>` and reports `host.mois.command`, the
   way the kit's command rows do, so autoplay and a learner's click press
   the same control.
   ========================================================================= */

const S = (v: unknown) => (v == null ? '' : String(v))

/** An edit box filling a grid cell: no border of its own, the cell's ink. */
export function CellText({ value, onChange, anchor, readOnly, align, placeholder, onKeyDown }: {
  value: unknown
  onChange: (v: string) => void
  /** `host.mois.field.<anchor>` */
  anchor?: string
  readOnly?: boolean
  align?: 'left' | 'center' | 'right'
  placeholder?: string
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
}) {
  return (
    <input
      type="text"
      className="pb-field"
      value={S(value)}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      data-tutorial-id={anchor ? `host.mois.field.${anchor}` : undefined}
      style={{
        width: '100%', height: 16, border: 0, padding: '0 3px', boxSizing: 'border-box', background: 'transparent', textIndent: 1,
        textAlign: align, color: readOnly ? '#606060' : undefined,
      }}
    />
  )
}

/** A drop-down filling a grid cell. */
export function CellSelect({ value, options, onChange, anchor, disabled }: {
  value: unknown; options: readonly PBSelectOption[]; onChange: (v: string) => void; anchor?: string; disabled?: boolean
}) {
  return (
    <PBSelect
      w="100%"
      options={options}
      value={S(value)}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      data-tutorial-id={anchor ? `host.mois.field.${anchor}` : undefined}
    />
  )
}

/** A push button anchored and reported as `host.mois.command.<id>`. */
export function Cmd({ id, children, onClick, w, disabled, sm, primary, style }: {
  id: string; children: ReactNode; onClick?: () => void; w?: number; disabled?: boolean; sm?: boolean; primary?: boolean; style?: CSSProperties
}) {
  const host = usePBInstrumentation()
  return (
    <PBButton
      size={sm ? 'sm' : undefined}
      className={primary ? 'pb-btn--default' : undefined}
      disabled={disabled}
      style={{ ...(w ? { width: w, minWidth: 0 } : null), ...style }}
      data-tutorial-id={host?.anchor('command', id)}
      onClick={() => { host?.report('command', { command: id }); onClick?.() }}
    >
      {children}
    </PBButton>
  )
}

/** A grey band with buttons at its right: "Alternate Terms [Add] [Delete]". */
export function ButtonBand({ caption, scope, buttons, extra }: {
  caption: ReactNode
  /** prefixes each button's anchor: `<scope>-<slug of label>` */
  scope: string
  buttons: { label: string; onPress: () => void; disabled?: boolean; w?: number }[]
  extra?: ReactNode
}) {
  return (
    <PBBand
      right={(
        <>
          {extra}
          {buttons.map((b) => (
            <Cmd key={b.label} id={`${scope}-${pbSlug(b.label)}`} sm w={b.w ?? 80} disabled={b.disabled} onClick={b.onPress}>{b.label}</Cmd>
          ))}
        </>
      )}
    >
      {caption}
    </PBBand>
  )
}

/** The centred button strip along a window's foot. */
export function CentredFooter({ left, children }: { left?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '8px 9px', flex: 'none', borderTop: '1px solid #c9c9c9', background: 'var(--pb-face)' }}>
      <span>{left}</span>
      <span className="pb-row" style={{ gap: 8 }}>{children}</span>
      <span />
    </div>
  )
}

/** label, then the control(s), on one line */
export function Line({ label, w = 92, children, style, right }: {
  label?: ReactNode; w?: number; children?: ReactNode; style?: CSSProperties; right?: boolean
}) {
  return (
    <div className="pb-row" style={{ gap: 6, padding: '1px 0', alignItems: 'center', minHeight: 22, ...style }}>
      <span className="pb-form__label" style={{ width: w, flex: 'none', textAlign: right ? 'right' : undefined }}>{label}</span>
      {children}
    </div>
  )
}

/** A navy caption with a rule under it — "Clinic Identification". */
export function NavyHead({ children }: { children: ReactNode }) {
  return <div style={{ color: '#000080', fontWeight: 700, padding: '6px 8px 3px', borderBottom: '1px solid #a0a0a0', flex: 'none' }}>{children}</div>
}

/** The navy title band a detail window opens with ("Value Set", "Clinic"). */
export function NavyBand({ children }: { children: ReactNode }) {
  return <div className="pb-viewhead" style={{ flex: 'none' }}><span className="pb-viewhead__title">{children}</span></div>
}

/** F2 presses a window's default button (Save Changes (F2), Add New (F2)). */
export const onF2 = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'F2') { e.preventDefault(); fn() }
}
