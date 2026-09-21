import { useEffect, useRef, useState } from 'react'
import { pbSlug, usePBInstrumentation } from '../instrumentation'
import { PBPopup, pbInPopup, usePBPopupOwner } from '../popup'
import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const cx = (...v: (string | false | undefined | null)[]) => v.filter(Boolean).join(' ')

/* --- PBButton ------------------------------------------------------------ */
export function PBButton({
  children, size, wide, className, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { size?: 'sm'; wide?: boolean }) {
  return (
    <button
      type="button"
      className={cx('pb-btn', size === 'sm' && 'pb-btn--sm', wide && 'pb-btn--wide', className)}
      {...rest}
    >
      {children}
    </button>
  )
}

/* --- PBCommandRow --------------------------------------------------------
   The hard-bordered button strip PowerBuilder puts under a view header.
   Pass `null` in the list to insert a group gap.                           */
export type PBCommand = { label: string; disabled?: boolean; active?: boolean; onClick?: () => void; width?: number } | null

export function PBCommandRow({ commands, right }: { commands: PBCommand[]; right?: ReactNode }) {
  const host = usePBInstrumentation()
  return (
    /* the manual's "Task Bar": the row of record actions under the header */
    <div className="pb-cmdrow" data-tutorial-id={host?.anchor('commandrow')}>
      {commands.map((c, i) =>
        c === null ? (
          <span key={i} className="pb-cmdrow__gap" />
        ) : (
          <button
            key={i}
            type="button"
            className="pb-cmdrow__btn"
            disabled={c.disabled}
            aria-pressed={c.active}
            data-tutorial-id={host?.anchor('command', pbSlug(c.label))}
            onClick={() => {
              host?.report('command', { command: pbSlug(c.label) })
              c.onClick?.()
            }}
            style={c.width ? { minWidth: c.width } : undefined}
          >
            {c.label}
          </button>
        ),
      )}
      {right && <><span className="pb-cmdrow__spacer" />{right}</>}
    </div>
  )
}

/* --- PBInput -------------------------------------------------------------- */
export function PBInput({
  w, align, className, style, ...rest
}: InputHTMLAttributes<HTMLInputElement> & { w?: number | string; align?: 'center' | 'right' }) {
  return (
    <input
      type="text"
      className={cx('pb-field', align === 'center' && 'pb-field--center', align === 'right' && 'pb-field--right', className)}
      style={{ width: w, ...style }}
      {...rest}
    />
  )
}

export function PBTextArea({
  rows = 3, w, className, style, ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { w?: number | string }) {
  return <textarea rows={rows} className={cx('pb-field', className)} style={{ width: w, ...style }} {...rest} />
}

/* --- PBSelect ------------------------------------------------------------- */
export function PBSelect({
  options, w, className, style, ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { options: string[]; w?: number | string }) {
  return (
    <select className={cx('pb-select', className)} style={{ width: w, ...style }} {...rest}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

/* --- PBLookup — field with the "..." button PowerBuilder uses everywhere -- */
export function PBLookup({
  value, defaultValue, placeholder, w, disabled, readOnly, name, onDots, onChange, onEnter,
}: {
  value?: string
  defaultValue?: string
  placeholder?: string
  w?: number | string
  disabled?: boolean
  readOnly?: boolean
  /** names the field for tutorials: anchors the "…" and reports opening it */
  name?: string
  onDots?: () => void
  onChange?: (v: string) => void
  /** Enter in the field — PowerBuilder commits an edit field on Enter */
  onEnter?: (v: string) => void
}) {
  const host = usePBInstrumentation()
  const bind = value !== undefined ? { value } : { defaultValue }
  return (
    <span className="pb-inputgroup" style={{ width: w }}>
      <input
        type="text"
        className="pb-field"
        {...bind}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onEnter?.(e.currentTarget.value) }}
      />
      <button
        type="button"
        className="pb-inputgroup__btn pb-inputgroup__btn--dots"
        disabled={disabled}
        data-tutorial-id={name ? host?.anchor('lookup', pbSlug(name)) : undefined}
        onClick={() => {
          if (name) host?.report('lookup', { field: pbSlug(name) })
          onDots?.()
        }}
        title="Look up…"
      >
        …
      </button>
    </span>
  )
}

/* --- PBDropField — text field with a drop arrow (an editable DDDW) -------- */
export function PBDropField({
  value, defaultValue, w, disabled, readOnly, onChange, onDrop,
}: {
  value?: string; defaultValue?: string; w?: number | string
  disabled?: boolean; readOnly?: boolean; onChange?: (v: string) => void; onDrop?: () => void
}) {
  const bind = value !== undefined ? { value } : { defaultValue }
  return (
    <span className="pb-inputgroup" style={{ width: w }}>
      <input
        type="text"
        className="pb-field"
        {...bind}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
      />
      <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--drop" disabled={disabled} onClick={onDrop}>
        <svg width="7" height="5" viewBox="0 0 7 5"><path d="M0 0h7L3.5 5z" fill="currentColor" /></svg>
      </button>
    </span>
  )
}

/* --- PBSpinner — edit field with up/down buttons ------------------------- */
export function PBSpinner({
  value, min, max, step = 1, w, align = 'right', disabled, onChange,
}: {
  value: number
  min?: number
  max?: number
  step?: number
  w?: number | string
  align?: 'center' | 'right'
  disabled?: boolean
  onChange?: (v: number) => void
}) {
  const clamp = (v: number) =>
    Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, v))
  return (
    <span className="pb-spin" style={{ width: w }}>
      <input
        type="text"
        className={cx('pb-field', align === 'center' && 'pb-field--center', align === 'right' && 'pb-field--right')}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (!Number.isNaN(n)) onChange?.(clamp(n))
        }}
      />
      <span className="pb-spin__buttons">
        <button
          type="button"
          className="pb-spin__btn pb-spin__btn--up"
          disabled={disabled || (max !== undefined && value >= max)}
          onClick={() => onChange?.(clamp(value + step))}
          aria-label="Increase"
        />
        <button
          type="button"
          className="pb-spin__btn pb-spin__btn--down"
          disabled={disabled || (min !== undefined && value <= min)}
          onClick={() => onChange?.(clamp(value - step))}
          aria-label="Decrease"
        />
      </span>
    </span>
  )
}

/* --- PBCheckbox / PBRadio ------------------------------------------------- */
export function PBCheckbox({
  label, checked, disabled, onChange, tutorialId,
}: {
  label?: ReactNode; checked?: boolean; disabled?: boolean; onChange?: (v: boolean) => void
  /* Stamped on the `input`, not on a wrapper. `clickAnchor` calls `.click()`
     on whatever carries the anchor, and a click on a wrapping element never
     reaches the control inside it — so an anchor on a surrounding span rings
     correctly and then silently toggles nothing. */
  tutorialId?: string
}) {
  return (
    <label className="pb-check">
      <input
        type="checkbox"
        data-tutorial-id={tutorialId}
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="pb-check__box" />
      {label != null && <span className="pb-check__label">{label}</span>}
    </label>
  )
}

export function PBRadio({
  label, name, checked, disabled, onChange,
}: { label?: ReactNode; name: string; checked?: boolean; disabled?: boolean; onChange?: () => void }) {
  return (
    <label className="pb-check pb-check--radio">
      <input type="radio" name={name} checked={!!checked} disabled={disabled} onChange={() => onChange?.()} />
      <span className="pb-check__box"><span className="pb-check__dot" /></span>
      {label != null && <span className="pb-check__label">{label}</span>}
    </label>
  )
}

/* --- PBSlider — the trackbar used on the Goal screens --------------------- */
export function PBSlider({
  value, min = 0, max = 10, onChange, style,
}: { value: number; min?: number; max?: number; onChange?: (v: number) => void; style?: CSSProperties }) {
  return (
    <input
      type="range"
      className="pb-slider"
      min={min}
      max={max}
      value={value}
      style={style}
      onChange={(e) => onChange?.(Number(e.target.value))}
    />
  )
}

/* --- layout helpers -------------------------------------------------------*/
export const PBRow = ({ gap, wrap, style, children }: { gap?: 'lg'; wrap?: boolean; style?: CSSProperties; children: ReactNode }) => (
  <div className={cx('pb-row', gap === 'lg' && 'pb-row--gap-lg', wrap && 'pb-row--wrap')} style={style}>{children}</div>
)
export const PBStack = ({ style, children }: { style?: CSSProperties; children: ReactNode }) => (
  <div className="pb-stack" style={style}>{children}</div>
)
export const PBLabel = ({ right, dim, children }: { right?: boolean; dim?: boolean; children: ReactNode }) => (
  <span className={cx('pb-form__label', right && 'pb-form__label--right', dim && 'pb-form__label--dim')}>{children}</span>
)
export const PBCaption = ({ center, children }: { center?: boolean; children: ReactNode }) => (
  <span className={cx('pb-caption', center && 'pb-caption--center')}>{children}</span>
)
export const PBVRule = () => <span className="pb-vrule" />
export const PBSpacer = () => <span className="pb-row__spacer" />

/* --- PBDropDownDataWindow -------------------------------------------------
   A DDDW: the dropped list is a grid with its own column headers, and the
   field shows the chosen row's display column. The list is a popup window
   (pb/popup), so a clipping ancestor — the frame, a scrolling DataWindow —
   never cuts it off.                                                      */
export function PBDropDownDataWindow<T extends Record<string, any>>({
  columns, rows, value, display, onSelect, w, listW, disabled, tutorialId,
}: {
  /* a DDDW column paints its own cell when it has to: the visit-code list
     fills the slot-count cell with the colour the day book books it in */
  columns: { key: string; header: string; width?: number; render?: (row: T) => ReactNode }[]
  rows: T[]
  value?: string
  /** which column fills the field when a row is chosen (defaults to the first) */
  display?: string
  onSelect?: (row: T) => void
  w?: number | string
  /**
   * The dropped list is painted at its own width, not the field's: the gender
   * designations drop a list twice as wide as the field they hang off. Omit
   * it and the list is at least as wide as the field, which is the common case.
   */
  listW?: number
  disabled?: boolean
  /* stamped on the input, not a wrapper — `clickAnchor` has to reach the
     control itself for a replayed step to open the list */
  tutorialId?: string
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(value ?? '')
  const ref = useRef<HTMLSpanElement>(null)
  const owner = usePBPopupOwner()
  const key = display ?? columns[0]?.key

  /* the field follows an externally set value — the frame owns "Daybook For",
     so a replayed pick has to show in the field as well as in the day */
  useEffect(() => { if (value !== undefined) setText(value) }, [value])

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      /* the list is portalled off the field, so "inside" is field *or* list */
      if (ref.current?.contains(e.target as Node) || pbInPopup(e.target, owner)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open, owner])

  return (
    <span className="pb-dddw" style={{ width: w }} ref={ref}>
      <input
        type="text"
        className="pb-field"
        data-tutorial-id={tutorialId}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      <button
        type="button"
        className="pb-inputgroup__btn pb-inputgroup__btn--drop"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <svg width="7" height="5" viewBox="0 0 7 5"><path d="M0 0h7L3.5 5z" fill="currentColor" /></svg>
      </button>

      {open && (
        <PBPopup anchorRef={ref} owner={owner} className="pb-dddw__list" minWidth={listW ?? 'anchor'}>
          <table className="pb-dddw__table">
            <thead>
              <tr>{columns.map((c) => (
                <th key={c.key} style={{ width: c.width }}>{c.header}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className={r[key] === text ? 'is-current' : undefined}
                  onMouseDown={() => { setText(String(r[key] ?? '')); onSelect?.(r); setOpen(false) }}
                >
                  {columns.map((c) => <td key={c.key}>{c.render ? c.render(r) : r[c.key]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </PBPopup>
      )}
    </span>
  )
}
