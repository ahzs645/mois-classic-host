import type { CSSProperties, ReactNode } from 'react'
import { PBInput, usePBInstrumentation } from '../../pb'

/* ============================================================================
   The claim-window furniture Unsent MSP and Sent To MSP share.

   Moved out of screens/BillingViews.tsx unchanged so the Sent To MSP window
   (screens/billing/SentToMspView.tsx) can be laid out on the same grid: both
   windows are one PowerBuilder DataWindow class in MOIS, with the PATIENT /
   INSURER (IDENTITY) / SERVICE / REFER / OPTIONS / WCB / OTHER bands, the
   navy caption at the left of each band and three label columns — the first
   left-aligned at capture x 273, the second and third right-aligned on 578
   and 838 — measured 1:1 on the v02.20.02 capture `12299570` (303601), whose
   view starts at x 200.

   PROVENANCE: 303601 `12299570`, `fa0339f2`, `dcf77aa9`, `6aeef025`;
   303602 / 3786544 `86eedb19` (the Sent To MSP window on the same grid).
   ========================================================================= */

export const Y: CSSProperties = { background: '#ffffc8' }
export const PK: CSSProperties = { background: '#ffc8c8' }
export const G: CSSProperties = { background: '#e8e8e8', color: '#404040' }
export const SALMON: CSSProperties = { background: '#f9c29f' }

/** capture x → view x */
export const vx = (x: number) => x - 200

/** One 19px line of the form; children are placed with `At`. */
export function Line({ h = 19, children }: { h?: number; children: ReactNode }) {
  return <div style={{ position: 'relative', height: h, flex: 'none', minWidth: 810 }}>{children}</div>
}

/** Something at capture x `x` (its left edge). */
export function At({ x, children, top = 1 }: { x: number; children: ReactNode; top?: number }) {
  return <span style={{ position: 'absolute', left: vx(x), top, display: 'inline-flex', alignItems: 'center', gap: 4 }}>{children}</span>
}

/** A label whose right edge is at capture x `end` (the second and third columns). */
export function RL({ end, children, red }: { end: number; children: ReactNode; red?: boolean }) {
  return (
    <span
      className="pb-form__label"
      style={{ position: 'absolute', right: `calc(100% - ${vx(end)}px)`, top: 3, whiteSpace: 'nowrap', color: red ? '#e00000' : undefined }}
    >
      {children}
    </span>
  )
}

/** A first-column label, left-aligned at x 273. */
export function LL({ children, red, x = 273, bold }: { children: ReactNode; red?: boolean; x?: number; bold?: boolean }) {
  return (
    <span className="pb-form__label" style={{ position: 'absolute', left: vx(x), top: 3, whiteSpace: 'nowrap', color: red ? '#e00000' : undefined, fontWeight: bold ? 700 : undefined }}>
      {children}
    </span>
  )
}

/** A navy section caption with its rule (PATIENT:, INSURER, SERVICE: …). */
export function Band({ caption, children, pad = 4 }: { caption?: string; children: ReactNode; pad?: number }) {
  return (
    <div style={{ position: 'relative', borderTop: '2px solid #1c2f8c', padding: `${pad}px 0`, flex: 'none' }}>
      {caption && (
        <span style={{ position: 'absolute', left: 6, top: pad + 2, color: '#1c2f8c', fontWeight: 700, fontSize: 12 }}>{caption}</span>
      )}
      {children}
    </div>
  )
}

/** The grey hairline MOIS draws between groups inside a band. */
export const Hair = () => <div style={{ margin: '3px 0 3px 70px', borderTop: '1px solid #c8c8c8', flex: 'none' }} />

/** The red dot MOIS paints inside a code field whose code came through a
    code-set mapping (2069402 `39508486`, Diag Code 1 reading 42682 ●; the
    day book prints the same dot beside the SNOMED-CT code, `9a4e6f99`). */
export function MappedDot({ title }: { title?: string }) {
  return (
    <span
      title={title}
      data-mapped-code=""
      style={{ position: 'absolute', right: 21, top: '50%', width: 8, height: 8, marginTop: -4, borderRadius: '50%', background: '#e00000', pointerEvents: 'none' }}
    />
  )
}

/** A field with the "…" button, its input anchored as `host.mois.field.{id}`.
    The "…" is `host.mois.lookup.{id}` when it opens something, and F4 in the
    field presses it, as in MOIS ("press F4 or click the ellipsis"). */
export function Dots({ w, value, onChange, onEnter, onDots, style, id, readOnly, marker }: {
  w: number; value?: string; onChange?: (v: string) => void; onEnter?: (v: string) => void
  onDots?: () => void
  style?: CSSProperties; id?: string; readOnly?: boolean
  /** a mapped code: paint MappedDot inside the field */
  marker?: string
}) {
  const host = usePBInstrumentation()
  return (
    <span className="pb-inputgroup" style={{ width: w + 17, position: 'relative' }}>
      <input
        type="text"
        className="pb-field"
        value={value ?? ''}
        readOnly={readOnly}
        style={style}
        data-tutorial-id={id ? `host.mois.field.${id}` : undefined}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEnter?.(e.currentTarget.value)
          if (e.key === 'F4' && onDots) { e.preventDefault(); onDots() }
        }}
      />
      {marker && <MappedDot title={`Mapped from SNOMED-CT ${marker}`} />}
      <button
        type="button"
        className="pb-inputgroup__btn pb-inputgroup__btn--dots"
        title="Look up…"
        data-tutorial-id={id && onDots ? host?.anchor('lookup', id) : undefined}
        onClick={() => {
          if (id && onDots) host?.report('lookup', { field: id })
          onDots?.()
        }}
      >
        …
      </button>
    </span>
  )
}

export function Field({ w, value, onChange, style, align, id, readOnly }: {
  w: number; value?: string; onChange?: (v: string) => void; style?: CSSProperties
  align?: 'center' | 'right'; id?: string; readOnly?: boolean
}) {
  return (
    <PBInput
      w={w}
      align={align}
      /* a field this window does not track is still an edit box: uncontrolled */
      {...(onChange || readOnly ? { value: value ?? '' } : { defaultValue: value ?? '' })}
      readOnly={readOnly}
      style={style}
      data-tutorial-id={id ? `host.mois.field.${id}` : undefined}
      onChange={(e) => onChange?.(e.target.value)}
    />
  )
}

/** A radio group; each radio carries its `value`, so `host.mois.enterField`
    can pick one through the group's anchor. */
export function Radios<T extends string>({ name, options, value, onChange, at, group, bold, disabled }: {
  name: string
  /** anchors each radio `host.mois.radio.{group}-{value}` without stamping
      the group anchor — for a group whose radios are split over two lines */
  group?: string
  options: { value: T; label: string; x: number; dy?: number }[]
  value: T
  onChange?: (v: T) => void
  at?: string
  bold?: boolean
  disabled?: boolean
}) {
  return (
    <span data-tutorial-id={at ? `host.mois.field.${at}` : undefined}>
      {options.map((o) => (
        <At key={o.value} x={o.x} top={o.dy ?? 1}>
          <label className="pb-check pb-check--radio">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              disabled={disabled}
              data-tutorial-id={(group ?? at) ? `host.mois.radio.${group ?? at}-${o.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined}
              onChange={() => onChange?.(o.value)}
            />
            <span className="pb-check__box"><span className="pb-check__dot" /></span>
            <span className="pb-check__label" style={bold ? { fontWeight: 700 } : undefined}>{o.label}</span>
          </label>
        </At>
      ))}
    </span>
  )
}

/** The scrolling body under a view's command row. */
export function Body({ children }: { children: ReactNode }) {
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '2px 8px 8px' }}>{children}</div>
  )
}
