import { useEffect, useId, useRef, useState } from 'react'
import { pbSlug, usePBInstrumentation } from '../instrumentation'
import { PBPopup, pbInPopup, usePBPopupOwner } from '../popup'
import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, KeyboardEvent, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const cx = (...v: (string | false | undefined | null)[]) => v.filter(Boolean).join(' ')

/* --- PBDropGlyph ---------------------------------------------------------
   The one arrow every drop-down button draws (PBSelect, PBDropField,
   PBDropDownDataWindow, PreferenceChoice). MOIS's combos are Windows 10's: a
   thin grey chevron in a light box (reference/demographics-full.png —
   Facility, Gender, Insurance by; the Dynamic Form captures' Provider and
   "created by"). The classic theme swaps in Windows 98's filled triangle. */
export function PBDropGlyph() {
  return (
    <svg className="pb-drop-glyph" width="9" height="5" viewBox="0 0 9 5" aria-hidden="true">
      <path className="pb-drop-glyph__chevron" d="M.5.5 4.5 4.3 8.5.5" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path className="pb-drop-glyph__triangle" d="M1 0h7L4.5 4.5z" fill="currentColor" />
    </svg>
  )
}

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
export type PBCommand = {
  label: string; disabled?: boolean; active?: boolean; onClick?: () => void; width?: number
  /** an exact width, narrower than the uniform 80.5 if need be — the older
      text-sized Task Bars (Message Inbox, v02.21) whose twelve buttons have
      to fit the window */
  exactWidth?: number
} | null

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
            style={c.exactWidth ? { width: c.exactWidth, minWidth: 0 } : c.width ? { minWidth: c.width } : undefined}
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

/* --- PBSelect -------------------------------------------------------------
   A drop-down list: the same closed field, drop button and dropped list as
   PBDropDownDataWindow (one column, no header), so Facility and Service in
   Demographics ▸ Office Information are the same control. They were a
   styled native <select> beside a PB-drawn DDDW: another face, another
   button, and the browser's own menu when opened.

   The native <select> is still here, transparent over the face: it sets the
   control's width from its longest option, takes focus and keyboard input,
   carries `value`, `onChange`, `name` and the tutorial anchor, and is what
   replay (host/field-input.ts) and tests set a value on. It never opens its
   own menu; the list is a PBPopup like every other drop-down here.         */
const setSelectValue = (el: HTMLSelectElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(el, value)
  dispatchLearnerChange(el)
}

/**
 * A `change` the learner made through a PB-drawn list rather than the native
 * control, marked as theirs. The browser flags its own events `isTrusted`; a
 * pick in a PBPopup list is dispatched here and would read as a replay, so
 * the frame, which reports a learner's edits to the tutorial layer
 * (host/MoisClassicShell.tsx), takes the mark in its place.
 */
export function dispatchLearnerChange(el: HTMLElement) {
  el.setAttribute('data-pb-learner', '')
  try { el.dispatchEvent(new Event('change', { bubbles: true })) } finally { el.removeAttribute('data-pb-learner') }
}

/** An entry whose shown text is not its value — `<No Selection>` for ''. */
export type PBSelectOption = string | { value: string; label: string }

export function PBSelect({
  options: entries, w, className, style, value, defaultValue, onChange, onKeyDown, onClick, onMouseDown, onBlur, disabled, ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { options: readonly PBSelectOption[]; w?: number | string }) {
  const items = entries.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  const options = items.map((o) => o.value)
  const labelOf = (v: string) => items.find((o) => o.value === v)?.label ?? v
  const [open, setOpen] = useState(false)
  const [own, setOwn] = useState(() => String(defaultValue ?? options[0] ?? ''))
  const current = value !== undefined ? String(value) : own
  const ref = useRef<HTMLSpanElement>(null)
  const selectRef = useRef<HTMLSelectElement>(null)
  const owner = usePBPopupOwner()
  const listId = useId()
  /* a caller's fill (Billing's yellow required fields) belongs on the face */
  const { background, backgroundColor, color, ...box } = style ?? {}

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node) || pbInPopup(e.target, owner)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open, owner])

  const pick = (next: string) => {
    const el = selectRef.current
    setOpen(false)
    if (!el || el.value === next) return
    setSelectValue(el, next)
  }
  /* the keys a closed combo box answers: the arrows step through the list,
     F4 / Alt+Down / Space drop it, Enter / Escape / Tab put it away. The
     native keys are all taken, since some of them open the browser's menu. */
  const key = (e: KeyboardEvent<HTMLSelectElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented || disabled) return
    const drop = e.key === 'F4' || e.key === ' ' || (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp'))
    if (drop) { e.preventDefault(); setOpen((o) => !o); return }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      const i = options.indexOf(current)
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1
        : Math.min(options.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))
      const el = selectRef.current
      if (el && options[next] !== undefined && options[next] !== current) setSelectValue(el, options[next])
      return
    }
    if (open && (e.key === 'Enter' || e.key === 'Escape')) { e.preventDefault(); setOpen(false) }
  }

  return (
    <span
      ref={ref}
      className={cx('pb-select', open && 'is-open', disabled && 'is-disabled', className)}
      style={{ width: w, ...box }}
    >
      <select
        ref={selectRef}
        className="pb-select__native"
        /* how a tutorial's ring and spotlight find the open list */
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        {...(value !== undefined ? { value } : { defaultValue })}
        disabled={disabled}
        onChange={(e) => { if (value === undefined) setOwn(e.target.value); onChange?.(e) }}
        /* no browser menu: the mouse drops the PB list instead */
        onMouseDown={(e) => { onMouseDown?.(e); if (e.button === 0) { e.preventDefault(); e.currentTarget.focus() } }}
        onClick={(e) => { onClick?.(e); if (!disabled) setOpen((o) => !o) }}
        onKeyDown={key}
        onBlur={(e) => { onBlur?.(e); setOpen(false) }}
        {...rest}
      >
        {items.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span className="pb-select__face" style={{ background, backgroundColor, color }} aria-hidden="true">{labelOf(current)}</span>
      <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--drop" disabled={disabled} tabIndex={-1} aria-hidden="true">
        <PBDropGlyph />
      </button>

      {open && (
        <PBPopup id={listId} anchorRef={ref} owner={owner} className="pb-dddw__list" minWidth="anchor">
          <table className="pb-dddw__table" role="listbox">
            <tbody>
              {items.map((o) => (
                <tr
                  key={o.value}
                  role="option"
                  aria-selected={o.value === current}
                  className={o.value === current ? 'is-current' : undefined}
                  /* mousedown, and default prevented, so focus stays on the field */
                  onMouseDown={(e) => { e.preventDefault(); pick(o.value) }}
                >
                  <td>{o.label || '\u00a0'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PBPopup>
      )}
    </span>
  )
}

/* --- PBLookup — field with the "..." button PowerBuilder uses everywhere -- */
export function PBLookup({
  value, defaultValue, placeholder, w, disabled, readOnly, name, onDots, onChange, onEnter, fieldId, onKeyDown,
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
  /** opt-in: a tutorial anchor on the edit field itself (host.mois.field.*),
      so a lesson can type into it; the "…" keeps the `lookup` anchor */
  fieldId?: string
  /** opt-in: any other key in the field — F4 opens a prompt in PowerBuilder */
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
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
        data-tutorial-id={fieldId}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onEnter?.(e.currentTarget.value); onKeyDown?.(e) }}
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
        <PBDropGlyph />
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
  label, name, checked, disabled, onChange, tutorialId,
}: {
  label?: ReactNode; name: string; checked?: boolean; disabled?: boolean; onChange?: () => void
  /* optional; stamped on the `input` for the same reason as PBCheckbox's */
  tutorialId?: string
}) {
  return (
    <label className="pb-check pb-check--radio">
      <input type="radio" name={name} data-tutorial-id={tutorialId} checked={!!checked} disabled={disabled} onChange={() => onChange?.()} />
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
  const listId = useId()
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
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
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
        <PBDropGlyph />
      </button>

      {open && (
        <PBPopup id={listId} anchorRef={ref} owner={owner} className="pb-dddw__list" minWidth={listW ?? 'anchor'}>
          {/* a listbox, so a guided tutorial step lets a click on a row through */}
          <table className="pb-dddw__table" role="listbox">
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
                  onMouseDown={() => {
                    setText(String(r[key] ?? '')); onSelect?.(r); setOpen(false)
                    /* the pick changes React state, not the input: say so, as a learner's edit */
                    const input = ref.current?.querySelector('input')
                    if (input) dispatchLearnerChange(input)
                  }}
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
