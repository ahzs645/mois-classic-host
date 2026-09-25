import {
  useEffect, useLayoutEffect, useMemo, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactElement, type ReactNode, type RefObject,
} from 'react'
import type { MoisRecord } from '../data/charts/types'
import { usePatient } from '../data/patient-context'
import {
  GlyphCheck, GlyphClose, GlyphMaximize, GlyphMinimize, GlyphRestore,
  PBButton, PBGroup, PBInput, PBPopup, PBRadio, PBWindow, pbInPopup, pbSlug, usePBPopupOwner,
} from '../pb'

/* ============================================================================
   The measurement graph — the Measures folder's (and the Encounter window's
   Measurements tab's) `Graph` button, Ctrl+G.

   MOIS does not draw this itself: it writes the data out and hands it to
   gnuplot, so the window is wgnuplot's, not a PowerBuilder one. The caption
   is gnuplot's own `gnuplot graph`, the system menu is Windows' plus
   gnuplot's `Options` fly-out, and the zoom / grid keys are gnuplot's
   mouse-and-hotkey bindings.

   PROVENANCE (MOIS_User_Manual_v3_Supplemented_2026-09-20):
   - `302837` (Measures) §Graphing / §Printing a Graph / §Graph Options Available
       b8db8a55 — the window: caption `gnuplot graph`, title
         `MOIS Measurement Graph for Amy Anxiety (WEIGHT)`, blue series with `+`
         points, red Upper Normal / Lower Normal lines spanning the first to
         the last data point, key top-right (series, `Upper Normal`,
         `Lower Normal`), `%Y/%m` monthly x tics with two minor tics between,
         y tics every 20 from 0, x label `Date`, no y label, and the mouse
         readout `5.44724e+008, 103.676` bottom-left (x in seconds since
         2000-01-01, gnuplot's time epoch; `%g` with MSVC's 3-digit exponent).
         Geometry below is measured off this capture (1423 × 719 client).
       6d9a3dab — the system-icon menu: Restore (disabled) / Move / Size /
         Minimize / Maximize / — / Close Alt+F4 / — / Options › / About / — /
         Command Line, and the Options fly-out: ✓Bring to Top, ✓Color, Copy
         to Clipboard, Background..., Choose Font..., Line Styles..., Print...,
         Update C:\Users\<user>\AppData\Roaming\wgnuplot.ini. The fly-out says
         `Color`; the article's prose says `Colour` — the menu wins.
       324ed576 — `Print Size`: Size group (Default Size, Width 504 mm Height
         260 mm / Other Size, Width [216] mm Height [279] mm), Page Offset
         group (Left [0] mm Top [0] mm), OK / Cancel.
       aa3d2a32 — the WHO growth-chart variant (same window; not drawn here).
   - `1625529` (Zoom on a Graph) 50ecbdb4 — right-drag draws a dashed grey box
       with each corner's coordinates beside it (`8.04472e+007` / `98.2846`,
       trailing zeros kept: `82.3530`); `P` returns to the original, `G` adds
       grid lines.
   - `303067` 86e622bb and `304699` 6c9a284f — the same window over the
       Encounter window and pasted into the Letter Writer (Options → Copy to
       Clipboard); the latter shows `(HEIGHT)` and weekly tics repeating their
       `%Y/%m` labels on a two-month range.
   - `303849` d6954903 — the Scheduler route to the same `Graph` button.

   Gaps (guessed, not in any capture): the second series' colour and the
   Systolic / Diastolic legend labels for a paired value; the Windows account
   in the `Update ...wgnuplot.ini` item; the tic-step table beyond the four
   ranges the captures show; monochrome dash patterns. Background...,
   Choose Font..., Line Styles..., About and Command Line open Windows common
   dialogs / the gnuplot console in the real thing and are inert here.
   ========================================================================= */

export type GraphPoint = { date: string /* YYYY.MM.DD */; value: number }
export type GraphSeries = { label: string; points: GraphPoint[] }

type GraphSpec = { test: string; series: GraphSeries[]; lower?: number; upper?: number; units?: string }

/* --- data ----------------------------------------------------------------- */

const NUMBER = /^\s*[-+]?(\d+(\.\d*)?|\.\d+)\s*$/
const PAIR = /^\s*([-+]?\d+(?:\.\d+)?)\s*\/\s*([-+]?\d+(?:\.\d+)?)\s*$/
const COLLECT = /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/

const num = (v: string | undefined): number | undefined =>
  v !== undefined && NUMBER.test(v) ? Number(v) : undefined

/**
 * Build series from chart measure records: every record with the same
 * `str_code` whose `str_value` parses as a number (or "a/b" pairs -> two
 * series), sorted by `dtm_collect_date` ('YYYY/MM/DD ...' -> 'YYYY.MM.DD').
 * Returns null when nothing numeric. The manual: "In order to be graphed,
 * measurements must contain a date, a code, and a value."
 */
export function graphForCode(records: MoisRecord[], code: string): GraphSpec | null {
  const rows = records
    .filter((r) => r.str_code === code && COLLECT.test(r.dtm_collect_date ?? ''))
    .sort((a, b) => (a.dtm_collect_date ?? '').localeCompare(b.dtm_collect_date ?? ''))
  if (rows.length === 0) return null

  const day = (r: MoisRecord) => {
    const [, y, m, d] = COLLECT.exec(r.dtm_collect_date ?? '')!
    return `${y}.${m.padStart(2, '0')}.${d.padStart(2, '0')}`
  }
  const latest = [...rows].reverse()
  const test = latest.find((r) => r.str_description)?.str_description ?? code

  const pairs = rows.flatMap((r) => {
    const m = PAIR.exec(r.str_value ?? '')
    return m ? [{ date: day(r), a: Number(m[1]), b: Number(m[2]) }] : []
  })
  let series: GraphSeries[]
  if (pairs.length > 0) {
    /* a blood pressure: systolic and diastolic plot as two lines */
    series = [
      { label: 'Systolic', points: pairs.map((p) => ({ date: p.date, value: p.a })) },
      { label: 'Diastolic', points: pairs.map((p) => ({ date: p.date, value: p.b })) },
    ]
  } else {
    const points = rows.flatMap((r) => {
      const v = num(r.str_value)
      return v === undefined ? [] : [{ date: day(r), value: v }]
    })
    if (points.length === 0) return null
    series = [{ label: test, points }]
  }

  const lower = latest.map((r) => num(r.str_normal_lower)).find((v) => v !== undefined)
  const upper = latest.map((r) => num(r.str_normal_high)).find((v) => v !== undefined)
  const units = latest.find((r) => r.str_units)?.str_units
  return { test, series, lower, upper, units }
}

/* --- gnuplot's number and time conventions ------------------------------- */

/** gnuplot's time axis counts seconds from 2000-01-01 00:00 UTC. */
const EPOCH = Date.UTC(2000, 0, 1)
const DAY = 86400
const MONTH = 2629800 /* the mean month gnuplot uses to size time tics */

function toSec(date: string): number {
  const [y, m, d] = date.split(/[./-]/).map(Number)
  return (Date.UTC(y, (m || 1) - 1, d || 1) - EPOCH) / 1000
}

const utc = (sec: number) => new Date(EPOCH + sec * 1000)
const monthSec = (mi: number) => (Date.UTC(Math.floor(mi / 12), mi % 12, 1) - EPOCH) / 1000
const monthIndex = (sec: number) => { const d = utc(sec); return d.getUTCFullYear() * 12 + d.getUTCMonth() }

/**
 * C's `%g` as the Windows CRT prints it: six significant digits, exponent
 * form outside 1e-4..1e6 with a signed three-digit exponent (`5.44724e+008`).
 * `keep` is `%#g` — trailing zeros kept, as the zoom box prints `82.3530`.
 */
export function gnuplotG(v: number, keep = false): string {
  if (!Number.isFinite(v)) return String(v)
  if (v === 0) return keep ? '0.00000' : '0'
  const [mant, expText] = v.toExponential(5).split('e')
  const exp = Number(expText)
  const trim = (s: string) => (keep || !s.includes('.') ? s : s.replace(/\.?0+$/, ''))
  if (exp < -4 || exp >= 6) {
    return `${trim(mant)}e${exp < 0 ? '-' : '+'}${String(Math.abs(exp)).padStart(3, '0')}`
  }
  return trim(v.toPrecision(6))
}

/** gnuplot's `quantize_normal_tics`, guide 20. */
function normalTic(range: number): number {
  const power = 10 ** Math.floor(Math.log10(range))
  const xnorm = range / power
  const posns = 20 / xnorm
  const tics = posns > 40 ? 0.05 : posns > 20 ? 0.1 : posns > 10 ? 0.2 : posns > 4 ? 0.5
    : posns > 2 ? 1 : posns > 0.5 ? 2 : Math.ceil(xnorm)
  return tics * power
}

/** A time tic step: whole days, or whole calendar months; `minor` subdivisions. */
type TimeStep = { unit: 'day' | 'month'; n: number; minor: number }

/* Monthly tics carry two minor tics (b8db8a55), weekly steps on a two-month
   range (6c9a284f), quarterly on two years (86e622bb) and two-yearly with
   quarterly minors (50ecbdb4). The rest of the table is extrapolated. */
const TIME_STEPS: TimeStep[] = [
  { unit: 'day', n: 1, minor: 0 },
  { unit: 'day', n: 2, minor: 2 },
  { unit: 'day', n: 7, minor: 7 },
  { unit: 'day', n: 14, minor: 2 },
  { unit: 'month', n: 1, minor: 3 },
  { unit: 'month', n: 2, minor: 2 },
  { unit: 'month', n: 3, minor: 3 },
  { unit: 'month', n: 6, minor: 6 },
  { unit: 'month', n: 12, minor: 4 },
  { unit: 'month', n: 24, minor: 8 },
  { unit: 'month', n: 60, minor: 5 },
  { unit: 'month', n: 120, minor: 10 },
  { unit: 'month', n: 240, minor: 4 },
]
const MAX_INTERVALS = 12

function pickTimeStep(range: number): TimeStep {
  return TIME_STEPS.find((s) => range / (s.n * (s.unit === 'day' ? DAY : MONTH)) <= MAX_INTERVALS)
    ?? TIME_STEPS[TIME_STEPS.length - 1]
}

function floorTime(sec: number, s: TimeStep): number {
  if (s.unit === 'day') return Math.floor(sec / DAY / s.n) * s.n * DAY
  return monthSec(Math.floor(monthIndex(sec) / s.n) * s.n)
}

function nextTime(sec: number, s: TimeStep): number {
  if (s.unit === 'day') return sec + s.n * DAY
  return monthSec(monthIndex(sec) + s.n)
}

function ceilTime(sec: number, s: TimeStep): number {
  const f = floorTime(sec, s)
  return f >= sec ? f : nextTime(f, s)
}

/** Major tics in [x0, x1], plus the minor tics between (and just outside) them. */
function timeTics(x0: number, x1: number, s: TimeStep) {
  const major: number[] = []
  for (let t = floorTime(x0, s); t <= x1 + 1; t = nextTime(t, s)) major.push(t)
  const minor: number[] = []
  if (s.minor > 1) {
    const edges = [...major, nextTime(major[major.length - 1], s)]
    for (let i = 0; i + 1 < edges.length; i++) {
      const span = edges[i + 1] - edges[i]
      for (let k = 1; k < s.minor; k++) minor.push(edges[i] + (span * k) / s.minor)
    }
  }
  const inside = (t: number) => t >= x0 - 1 && t <= x1 + 1
  return { major: major.filter(inside), minor: minor.filter(inside) }
}

const timeLabel = (sec: number) => {
  const d = utc(sec)
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Linear tics in [y0, y1]; the step's decimals round away float noise. */
function valueTics(y0: number, y1: number, step: number): number[] {
  const out: number[] = []
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1)
  for (let v = Math.ceil(y0 / step - 1e-9) * step; v <= y1 + step * 1e-9; v += step) {
    out.push(Number(v.toFixed(decimals)))
  }
  return out
}

type Ranges = { x0: number; x1: number; y0: number; y1: number }

/** gnuplot autoscale: the data (and the normal lines) widened out to whole tics. */
function autoRanges(xs: number[], ys: number[]): Ranges {
  let xmin = Math.min(...xs)
  let xmax = Math.max(...xs)
  if (xmax === xmin) { xmin -= DAY; xmax += DAY }
  const ts = pickTimeStep(xmax - xmin)
  let ymin = Math.min(...ys)
  let ymax = Math.max(...ys)
  if (ymax === ymin) { const pad = Math.abs(ymin) * 0.01 || 1; ymin -= pad; ymax += pad }
  const step = normalTic(ymax - ymin)
  return {
    x0: floorTime(xmin, ts),
    x1: ceilTime(xmax, ts),
    y0: Math.floor(ymin / step + 1e-9) * step,
    y1: Math.ceil(ymax / step - 1e-9) * step,
  }
}

/* --- appearance ----------------------------------------------------------- */

/** Default client size of the graph (not measured: the captures are maximised). */
const CLIENT_W = 960
const CLIENT_H = 540

const FONT = 'Arial, Helvetica, sans-serif'
const FS = 13
const SERIES_COLOURS = ['#0000ff', '#008000', '#a000a0', '#00a0a0']
const NORMAL_COLOUR = '#ff0000'
/* monochrome (Color unchecked): gnuplot falls back to dash patterns */
const MONO_DASH = ['', '6 4', '2 3', '8 3 2 3']

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/* The wgnuplot window icon: a little plot with coloured curves (b8db8a55). */
function GnuplotIcon() {
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} style={{ display: 'block' }}>
      <rect x="0.5" y="0.5" width="15" height="15" fill="#fff" stroke="#6b6b6b" />
      <path d="M2.5 1.5v12h12" fill="none" stroke="#000" />
      <path d="M3 12 6 8l3 1 5-6" fill="none" stroke="#e00000" />
      <path d="M3 13l4-3 3 1 4-3" fill="none" stroke="#0000e0" strokeDasharray="1 1" />
      <path d="M3 9l3-4 4 2 4-4" fill="none" stroke="#00a000" strokeDasharray="2 1" />
    </svg>
  )
}

/* --- the system menu ------------------------------------------------------ */

type MenuEntry =
  | { sep: true }
  | {
    sep?: false
    label: string
    slug?: string
    key?: string
    glyph?: ReactNode
    checked?: boolean
    disabled?: boolean
    bold?: boolean
    submenu?: MenuEntry[]
    onSelect?: () => void
  }

function MenuPanel({
  items, owner, anchorRef, side, ns, onPick,
}: {
  items: MenuEntry[]
  owner: string
  anchorRef: RefObject<HTMLElement | null>
  side: 'below' | 'beside'
  /** the anchor namespace for this panel's rows */
  ns: string
  onPick: () => void
}) {
  const [open, setOpen] = useState<number | null>(null)
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([])
  /* one stable anchor object: PBPopup re-places whenever its ref changes */
  const flyAnchor = useRef<HTMLElement | null>(null)
  const arrows = items.some((m) => !m.sep && m.submenu)
  const flyout = open === null ? null : items[open]

  return (
    <PBPopup
      anchorRef={anchorRef}
      owner={owner}
      side={side}
      className={`pb-menu${arrows ? ' pb-menu--arrows' : ''}`}
      tutorialId={`host.mois.menu-region.${ns}`}
    >
      <div className="pb-menu__sizer" aria-hidden="true">
        <span>{items.map((m, i) => (m.sep ? null : <span key={i} style={m.bold ? { fontWeight: 700 } : undefined}>{m.label}</span>))}</span>
        <span className="pb-menu__sizer-keys">{items.map((m, i) => (!m.sep && m.key ? <span key={i}>{m.key}</span> : null))}</span>
      </div>
      {items.map((m, i) => (m.sep ? (
        <div key={i} className="pb-menu__sep" />
      ) : (
        <button
          key={i}
          ref={(el) => { rowRefs.current[i] = el }}
          type="button"
          className={`pb-menu__item${m.submenu ? ' pb-menu__item--parent' : ''}`}
          disabled={m.disabled}
          style={m.bold ? { fontWeight: 700 } : undefined}
          data-tutorial-id={`host.mois.menu.${ns}.${m.slug ?? pbSlug(m.label)}`}
          onMouseEnter={() => {
            if (m.submenu) flyAnchor.current = rowRefs.current[i]
            setOpen(m.submenu ? i : null)
          }}
          onClick={() => {
            if (m.submenu) { flyAnchor.current = rowRefs.current[i]; setOpen(open === i ? null : i); return }
            onPick()
            m.onSelect?.()
          }}
        >
          {(m.checked || m.glyph) && (
            <span style={{ position: 'absolute', left: 10, top: 0, bottom: 0, display: 'grid', placeItems: 'center', color: m.disabled ? '#a0a0a0' : '#1a1a1a' }}>
              {m.checked ? <GlyphCheck /> : m.glyph}
            </span>
          )}
          {m.label}
          {m.key && <span className="pb-menu__key" style={{ fontWeight: 400 }}>{m.key}</span>}
          {m.submenu && <span className="pb-menu__arrow">{'›'}</span>}
        </button>
      )))}
      {flyout && !flyout.sep && flyout.submenu && (
        <MenuPanel
          key={open}
          items={flyout.submenu}
          owner={owner}
          anchorRef={flyAnchor}
          side="beside"
          ns={`graph-${flyout.slug ?? pbSlug(flyout.label)}`}
          onPick={onPick}
        />
      )}
    </PBPopup>
  )
}

/* --- Print Size (324ed576) ------------------------------------------------ */

function PrintSizeDialog({ defaultMm, onClose }: { defaultMm: { w: number; h: number }; onClose: () => void }) {
  const [other, setOther] = useState(false)
  const [size, setSize] = useState({ w: '216', h: '279', left: '0', top: '0' })
  const cell = (left: number, top: number, children: ReactNode) => (
    <div style={{ position: 'absolute', left, top, display: 'flex', alignItems: 'center', height: 20, gap: 4, whiteSpace: 'nowrap' }}>{children}</div>
  )
  const field = (k: keyof typeof size, disabled = false) => (
    <PBInput w={32} value={size[k]} disabled={disabled} onChange={(e) => setSize((s) => ({ ...s, [k]: e.target.value }))} />
  )
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', zIndex: 97 }}>
      <PBWindow
        child
        controls={false}
        title="Print Size"
        tutorialId="host.mois.dialog.graph-print-size"
        onClose={onClose}
        style={{ width: 408, height: 216 }}
      >
        <div style={{ position: 'relative', flex: '1 1 auto', background: 'var(--pb-face)' }}>
          <PBGroup title="Size" style={{ position: 'absolute', left: 8, top: 4, width: 314, height: 106 }} bodyStyle={{ position: 'relative', height: 84 }}>
            {cell(2, 2, <PBRadio name="graph-print-size" label="Default Size" checked={!other} onChange={() => setOther(false)} />)}
            {cell(50, 24, <>Width <span style={{ marginLeft: 14 }}>{defaultMm.w}</span> mm</>)}
            {cell(180, 24, <>Height <span style={{ marginLeft: 14 }}>{defaultMm.h}</span> mm</>)}
            {cell(2, 44, <PBRadio name="graph-print-size" label="Other Size" checked={other} onChange={() => setOther(true)} />)}
            {cell(50, 66, <>Width {field('w', !other)} mm</>)}
            {cell(180, 66, <>Height {field('h', !other)} mm</>)}
          </PBGroup>
          <PBGroup title="Page Offset" style={{ position: 'absolute', left: 8, top: 116, width: 314, height: 56 }} bodyStyle={{ position: 'relative', height: 34 }}>
            {cell(62, 6, <>Left {field('left')} mm</>)}
            {cell(196, 6, <>Top {field('top')} mm</>)}
          </PBGroup>
          <PBButton className="pb-btn--default" style={{ position: 'absolute', left: 332, top: 12, width: 66 }} onClick={onClose}>OK</PBButton>
          <PBButton style={{ position: 'absolute', left: 332, top: 56, width: 66 }} onClick={onClose}>Cancel</PBButton>
        </div>
      </PBWindow>
    </div>
  )
}

/* --- the window ----------------------------------------------------------- */

export function MeasurementGraphWindow({
  test, series, lower, upper, units, onClose,
}: {
  test: string
  series: GraphSeries[]
  lower?: number
  upper?: number
  units?: string
  onClose: () => void
}): ReactElement {
  const patient = usePatient()
  const owner = usePBPopupOwner()
  const clientRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const iconRef = useRef<HTMLSpanElement>(null)
  const cursorRef = useRef<HTMLSpanElement>(null)

  const [size, setSize] = useState({ w: CLIENT_W, h: CLIENT_H })
  const [maximized, setMaximized] = useState(false)
  const [menu, setMenu] = useState<null | { at: 'icon' | 'cursor' }>(null)
  const [cursorAt, setCursorAt] = useState({ x: 0, y: 0 })
  const [colour, setColour] = useState(true)
  const [onTop, setOnTop] = useState(true)
  const [grid, setGrid] = useState(false)
  const [zoom, setZoom] = useState<Ranges | null>(null)
  const [drag, setDrag] = useState<null | { sx: number; sy: number; cx: number; cy: number }>(null)
  const [mouse, setMouse] = useState<string>('')
  const [printing, setPrinting] = useState(false)

  /* the plot follows the client area, as gnuplot redraws on WM_SIZE */
  useLayoutEffect(() => {
    const el = clientRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setSize({ w: Math.round(r.width), h: Math.round(r.height) })
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => { clientRef.current?.focus() }, [])

  /* click-away closes the system menu */
  useEffect(() => {
    if (!menu) return
    const away = (e: MouseEvent) => {
      if (pbInPopup(e.target, owner) || iconRef.current?.contains(e.target as Node)) return
      setMenu(null)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [menu, owner])

  /* --- data in axis units --- */
  const lines = useMemo(() => series.map((s) => ({
    label: s.label,
    pts: s.points.map((p) => ({ x: toSec(p.date), y: p.value })).sort((a, b) => a.x - b.x),
  })), [series])
  const { auto, dataX0, dataX1 } = useMemo(() => {
    const xs = lines.flatMap((l) => l.pts.map((p) => p.x))
    const ys = lines.flatMap((l) => l.pts.map((p) => p.y))
    if (lower !== undefined) ys.push(lower)
    if (upper !== undefined) ys.push(upper)
    return {
      auto: autoRanges(xs.length ? xs : [0, DAY], ys.length ? ys : [0, 1]),
      /* the normal lines run from the first data point to the last (b8db8a55) */
      dataX0: xs.length ? Math.min(...xs) : 0,
      dataX1: xs.length ? Math.max(...xs) : DAY,
    }
  }, [lines, lower, upper])
  const R = zoom ?? auto

  /* --- geometry, scaled off the 1423 × 719 capture --- */
  const { w, h } = size
  const left = clamp(Math.round(w * 0.113), 64, 161)
  const right = clamp(Math.round(w * 0.033), 16, 47)
  const top = clamp(Math.round(h * 0.12), 52, 86)
  const bottom = 92
  const pw = Math.max(40, w - left - right)
  const ph = Math.max(40, h - top - bottom)
  const px = (x: number) => left + ((x - R.x0) / (R.x1 - R.x0)) * pw
  const py = (y: number) => top + ph - ((y - R.y0) / (R.y1 - R.y0)) * ph
  const ax = (sx: number) => R.x0 + ((sx - left) / pw) * (R.x1 - R.x0)
  const ay = (sy: number) => R.y0 + ((top + ph - sy) / ph) * (R.y1 - R.y0)

  const xt = timeTics(R.x0, R.x1, pickTimeStep(R.x1 - R.x0))
  const yt = valueTics(R.y0, R.y1, normalTic(R.y1 - R.y0))

  const title = `MOIS Measurement Graph for ${patient.short} (${test})`
  const keyEntries: { label: string; colour: string; dash: string; point: boolean }[] = [
    ...lines.map((l, i) => ({
      label: l.label,
      colour: colour ? SERIES_COLOURS[i % SERIES_COLOURS.length] : '#000',
      dash: colour ? '' : MONO_DASH[i % MONO_DASH.length],
      point: true,
    })),
    ...(upper !== undefined ? [{ label: 'Upper Normal', colour: colour ? NORMAL_COLOUR : '#000', dash: colour ? '' : '4 3', point: false }] : []),
    ...(lower !== undefined ? [{ label: 'Lower Normal', colour: colour ? NORMAL_COLOUR : '#000', dash: colour ? '' : '4 3', point: false }] : []),
  ]
  const keyRow = clamp(h * 0.04, 20, 28.5)
  const plusMark = (x: number, y: number, c: string, k: string | number) => (
    <path key={k} d={`M${x - 4.5} ${y}h9M${x} ${y - 4.5}v9`} stroke={c} fill="none" />
  )

  /* --- pointer: the readout, and right-drag zoom --- */
  const local = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 2) return
    e.preventDefault()
    const p = local(e)
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* not capturable */ }
    setDrag({ sx: p.x, sy: p.y, cx: p.x, cy: p.y })
  }
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const p = local(e)
    setMouse(`${gnuplotG(ax(p.x))}, ${gnuplotG(ay(p.y))}`)
    if (drag) setDrag({ ...drag, cx: p.x, cy: p.y })
  }
  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag || e.button !== 2) return
    const { sx, sy, cx, cy } = drag
    setDrag(null)
    if (Math.abs(cx - sx) < 3 || Math.abs(cy - sy) < 3) return
    setZoom({
      x0: ax(Math.min(sx, cx)), x1: ax(Math.max(sx, cx)),
      y0: ay(Math.max(sy, cy)), y1: ay(Math.min(sy, cy)),
    })
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return
    const k = e.key.toLowerCase()
    if (k === 'p') { setZoom(null); e.preventDefault() }
    else if (k === 'g') { setGrid((g) => !g); e.preventDefault() }
    else if (k === 'escape' && drag) { setDrag(null); e.preventDefault() }
  }

  const copyToClipboard = () => {
    const svg = svgRef.current?.outerHTML
    if (!svg) return
    try {
      void navigator.clipboard?.writeText(svg).catch(() => { /* denied */ })
    } catch { /* no clipboard in this context */ }
  }

  const options: MenuEntry[] = [
    { label: 'Bring to Top', checked: onTop, onSelect: () => setOnTop((v) => !v) },
    { label: 'Color', checked: colour, onSelect: () => setColour((v) => !v) },
    { label: 'Copy to Clipboard', onSelect: copyToClipboard },
    { label: 'Background...', slug: 'background' },
    { label: 'Choose Font...', slug: 'choose-font' },
    { label: 'Line Styles...', slug: 'line-styles' },
    { label: 'Print...', slug: 'print', onSelect: () => setPrinting(true) },
    { label: 'Update C:\\Users\\mois\\AppData\\Roaming\\wgnuplot.ini', slug: 'update-wgnuplot-ini' },
  ]
  const systemMenu: MenuEntry[] = [
    { label: 'Restore', glyph: <GlyphRestore />, disabled: !maximized, onSelect: () => setMaximized(false) },
    { label: 'Move' },
    { label: 'Size' },
    { label: 'Minimize', glyph: <GlyphMinimize /> },
    { label: 'Maximize', glyph: <GlyphMaximize />, disabled: maximized, onSelect: () => setMaximized(true) },
    { sep: true },
    { label: 'Close', glyph: <GlyphClose />, bold: true, key: 'Alt+F4', onSelect: onClose },
    { sep: true },
    { label: 'Options', submenu: options },
    { label: 'About' },
    { sep: true },
    { label: 'Command Line' },
  ]

  const icon = (
    <span
      ref={iconRef}
      role="button"
      aria-label="System menu"
      data-tutorial-id="host.mois.menu.graph-system"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => setMenu(menu ? null : { at: 'icon' })}
      /* double-clicking a window's system icon closes it */
      onDoubleClick={(e) => { e.stopPropagation(); onClose() }}
    >
      <GnuplotIcon />
    </span>
  )

  const frameStyle = maximized
    ? { width: '100%', height: '100%' }
    : { width: CLIENT_W + 2, height: `calc(${CLIENT_H + 2}px + var(--pb-titlebar-h))` }

  /* a 72-dpi page, which is what gnuplot's Default Size works out to on 324ed576 */
  const defaultMm = { w: Math.round((w * 25.4) / 72), h: Math.round((h * 25.4) / 72) }

  const dragBox = drag && (() => {
    const x = Math.min(drag.sx, drag.cx)
    const y = Math.min(drag.sy, drag.cy)
    const corner = (cx: number, cy: number) => (
      <text x={cx + 4} y={cy - 4} fontFamily={FONT} fontSize={12} fontWeight={700} fill="#000">
        <tspan x={cx + 4}>{gnuplotG(ax(cx), true)}</tspan>
        <tspan x={cx + 4} dy={17}>{gnuplotG(ay(cy), true)}</tspan>
      </text>
    )
    return (
      <g pointerEvents="none">
        <rect x={x + 0.5} y={y + 0.5} width={Math.abs(drag.cx - drag.sx)} height={Math.abs(drag.cy - drag.sy)} fill="none" stroke="#a0a0a0" strokeDasharray="2 2" />
        {corner(drag.sx, drag.sy)}
        {corner(drag.cx, drag.cy)}
      </g>
    )
  })()

  const clipId = `${owner.replace(/[^a-zA-Z0-9_-]/g, '')}-plot`
  const X = (v: number) => Math.round(v) + 0.5

  return (
    <>
      <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', padding: 8, zIndex: 96 }}>
        <div
          style={{ display: 'contents' }}
          onContextMenu={(e) => {
            /* right-clicking the top bar opens the same menu as the icon */
            const bar = (e.target as HTMLElement).closest('.pb-titlebar')
            if (!bar) return
            e.preventDefault()
            const r = bar.parentElement!.getBoundingClientRect()
            setCursorAt({ x: e.clientX - r.left, y: e.clientY - r.top })
            setMenu({ at: 'cursor' })
          }}
        >
          <PBWindow
            title="gnuplot graph"
            icon={icon}
            tutorialId="host.mois.dialog.measurement-graph"
            maximized={maximized}
            onMaximize={() => setMaximized((m) => !m)}
            onClose={onClose}
            style={{ ...frameStyle, position: 'relative' }}
          >
            <span ref={cursorRef} aria-hidden="true" style={{ position: 'absolute', left: cursorAt.x, top: cursorAt.y, width: 0, height: 0 }} />
            <div
              ref={clientRef}
              tabIndex={0}
              onKeyDown={onKeyDown}
              style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, background: '#fff', outline: 'none', overflow: 'hidden' }}
            >
              <svg
                ref={svgRef}
                xmlns="http://www.w3.org/2000/svg"
                width={w}
                height={h}
                viewBox={`0 0 ${w} ${h}`}
                role="img"
                aria-label={`${title}${units ? `, ${units}` : ''}`}
                style={{ display: 'block', cursor: 'crosshair', userSelect: 'none' }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onContextMenu={(e) => e.preventDefault()}
              >
                <defs>
                  <clipPath id={clipId}><rect x={left} y={top} width={pw} height={ph} /></clipPath>
                </defs>
                <rect x={0} y={0} width={w} height={h} fill="#fff" />

                <text x={left + pw / 2} y={Math.round(top * 0.535) + 4} textAnchor="middle" fontFamily={FONT} fontSize={FS} fill="#000">{title}</text>

                {/* grid (G), under everything else */}
                {grid && (
                  <g stroke="#a0a0a0" strokeDasharray="1 3" shapeRendering="crispEdges">
                    {xt.major.map((t) => <line key={`gx${t}`} x1={X(px(t))} x2={X(px(t))} y1={top} y2={top + ph} />)}
                    {yt.map((v) => <line key={`gy${v}`} x1={left} x2={left + pw} y1={X(py(v))} y2={X(py(v))} />)}
                  </g>
                )}

                {/* border, with tics mirrored on the top and right */}
                <g stroke="#000" fill="none" shapeRendering="crispEdges">
                  <rect x={left + 0.5} y={top + 0.5} width={pw} height={ph} />
                  {xt.major.map((t) => {
                    const x = X(px(t))
                    return <path key={`xM${t}`} d={`M${x} ${top + ph}v-5M${x} ${top}v5`} />
                  })}
                  {xt.minor.map((t) => {
                    const x = X(px(t))
                    return <path key={`xm${t}`} d={`M${x} ${top + ph}v-2M${x} ${top}v2`} />
                  })}
                  {yt.map((v) => {
                    const y = X(py(v))
                    return <path key={`yM${v}`} d={`M${left} ${y}h8M${left + pw} ${y}h-8`} />
                  })}
                </g>

                {/* tic labels and the x label; there is no y label */}
                <g fontFamily={FONT} fontSize={FS} fill="#000">
                  {xt.major.map((t) => (
                    <text key={`xl${t}`} x={px(t)} y={top + ph + 36} textAnchor="middle">{timeLabel(t)}</text>
                  ))}
                  {yt.map((v) => (
                    <text key={`yl${v}`} x={left - 19} y={py(v) + 4.5} textAnchor="end">{gnuplotG(v)}</text>
                  ))}
                  <text x={left + pw / 2} y={top + ph + 80} textAnchor="middle">Date</text>
                </g>

                {/* the data, clipped to the plot as gnuplot clips a zoom */}
                <g clipPath={`url(#${clipId})`} fill="none">
                  {upper !== undefined && (
                    <line x1={px(dataX0)} x2={px(dataX1)} y1={X(py(upper))} y2={X(py(upper))} stroke={keyEntries[lines.length].colour} strokeDasharray={keyEntries[lines.length].dash || undefined} shapeRendering="crispEdges" />
                  )}
                  {lower !== undefined && (
                    <line x1={px(dataX0)} x2={px(dataX1)} y1={X(py(lower))} y2={X(py(lower))} stroke={keyEntries[keyEntries.length - 1].colour} strokeDasharray={keyEntries[keyEntries.length - 1].dash || undefined} shapeRendering="crispEdges" />
                  )}
                  {lines.map((l, i) => (
                    <g key={`s${i}`}>
                      <polyline points={l.pts.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')} stroke={keyEntries[i].colour} strokeDasharray={keyEntries[i].dash || undefined} />
                      {l.pts.map((p, j) => plusMark(Math.round(px(p.x)) + 0.5, Math.round(py(p.y)) + 0.5, keyEntries[i].colour, j))}
                    </g>
                  ))}
                </g>

                {/* the key, top right inside the border */}
                <g fontFamily={FONT} fontSize={FS} fill="#000">
                  {keyEntries.map((k, i) => {
                    const y = Math.round(top + 24 + i * keyRow) + 0.5
                    const x0 = left + pw - 123
                    const x1 = left + pw - 39
                    return (
                      <g key={`k${i}`}>
                        <text x={left + pw - 142} y={y + 4.5} textAnchor="end">{k.label}</text>
                        <line x1={x0} x2={x1} y1={y} y2={y} stroke={k.colour} strokeDasharray={k.dash || undefined} shapeRendering="crispEdges" />
                        {k.point && plusMark(Math.round((x0 + x1) / 2) + 0.5, y, k.colour, 'p')}
                      </g>
                    )
                  })}
                </g>

                {dragBox}

                {/* the mouse readout: x in seconds since 2000-01-01, then y */}
                <text x={5} y={h - 4} fontFamily={FONT} fontSize={12} fontWeight={700} fill="#000">{mouse}</text>
              </svg>
            </div>
          </PBWindow>
        </div>
      </div>

      {menu && (
        <MenuPanel
          items={systemMenu}
          owner={owner}
          anchorRef={menu.at === 'icon' ? iconRef : cursorRef}
          side="below"
          ns="graph-system"
          onPick={() => { setMenu(null); clientRef.current?.focus() }}
        />
      )}
      {printing && <PrintSizeDialog defaultMm={defaultMm} onClose={() => setPrinting(false)} />}
    </>
  )
}
