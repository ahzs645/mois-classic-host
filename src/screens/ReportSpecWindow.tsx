import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useScreenReport } from '../host/screen-state'
import { loadReportNavigator } from '../data/reportParams'
import { patients } from '../data/patients'
import { REPORT_SPECS, reportSpecWindow } from '../data/reportSpecs'
import {
  MOIS_TODAY, rsLike, rsMatchOf, rsOptions,
  type ReportSpec, type RSContext, type RSField, type RSPick, type RSTable,
} from '../data/reportSpecs/types'
import {
  PBCheckbox, PBDataWindow, PBDropGlyph, PBInput, PBPopup, PBSelect, pbSlug, usePBPopupOwner,
} from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogFooter } from './formKit'
import { useTickSet } from './listKit'
import { CmdCheck, CmdRadio, DotsButton, FieldInput, Hint, ParamFrame, ParamLine, ParamSection } from './reportKit'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   The Reports module's generic Selection Parameter window, and the Excel
   sheet a report sent to Excel lands in.

   WHAT IT IS. Nearly every report in the catalogue opens the same window:
   caption `Report: <Folder> - <Name>`, a bordered pane with the grey
   `Selection Parameter` band, navy section headings ruled below,
   label / control / grey-hint lines, and Ok / Cancel bottom-centre, 75px
   wide and 12px apart (screens/reportKit ParamFrame). This component draws that window from a declarative
   `ReportSpec` (data/reportSpecs), one registered area window per spec,
   `report-params-<spec.id>`, so the hundred-odd reports share one layout and
   differ only in their fields — each with its own title and parameters.

   PROVENANCE: the frame is measured off 304042 `bcde4768` (Aging Report)
   and `10cf8bd2` (Detailed Activity Report), 670x540, and matches the older
   hand-built windows in screens/ReportParameterWindows.tsx (304026
   `8a07e40a`, 304028 `bb9b44f3`). Each spec cites its own window and page
   captures in its `provenance`.

   BEHAVIOUR
   · "…" opens the field's picker — a small list window over the parameter
     window (the Patient Status picker ticks several; the others pick one).
     INFERRED: the pickers are not captured for most reports; their shape
     follows the Patient Status list the Age/Sex article describes ("Use the
     ellipsis to view to list of patient statuses … Check the boxes").
   · The `%` wildcard (304049): "For any report that has a CONTAINS argument,
     BEGINS with, or ENDS with, this single, wildcard character will find all
     entries (e.g. use A%A to find every item with two A's in it)". Text
     parameters filter the sample rows through `rsLike`; a drop-down marked
     `editable` takes a typed `%`.
   · Ok: a ticked Chart Navigator switch loads the navigator with the rows'
     charts and opens it; a ticked Excel switch (or an Excel-only report)
     opens the rows in the Excel sheet below; anything else prints into the
     Print Preview (`print-preview`), where Print All / Cancel finish it.
   · Cancel and the title-bar × close.

   THE EXCEL SHEET (`report-excel`) is an emulator affordance: MOIS writes a
   CSV and Windows opens it in Excel, outside MOIS. The stage draws a plain
   Excel-2010-style sheet (formula bar, column letters, row numbers, the
   report's header row in row 1) so a lesson can show where the output went.
   INFERRED — no capture of the Excel window is in the manual.

   ANCHORS (all derived from the spec and field ids)
     window        host.mois.dialog.report-params-<spec>
     edit / list   host.mois.field.<spec>-<field>      (a list: -<field>-<n>)
     range         host.mois.field.<spec>-<field>-from / -to
     drop-down     host.mois.field.<spec>-<field>
     tick box      host.mois.command.<spec>-<field>
     radio option  host.mois.command.<spec>-<field>-<option slug>
     "…"           host.mois.lookup.<spec>-<field>
     Ok / Cancel   host.mois.command.<spec>-ok / <spec>-cancel
     picker        host.mois.dialog.report-picker, its rows
                   host.mois.row.report-pick-<slug>, Ok `report-picker-ok`
   `host.screen` carries `report` (spec id), `output` (print / excel /
   chart-navigator), `choices` (`<field>:<option slug>` for every radio and
   ticked box) and `filled` (the ids of text parameters with a value — never
   the value itself).
   ========================================================================= */

type Values = Record<string, string | boolean>

/* --- initial values ------------------------------------------------------- */
function collect(fields: RSField[], out: Values, args: Record<string, unknown>) {
  const seed = (k: string, v: string | boolean) => {
    const a = args[k]
    out[k] = typeof a === typeof v ? (a as string | boolean) : v
  }
  for (const f of fields) {
    switch (f.kind) {
      case 'section': if (f.right) collect([f.right], out, args); break
      case 'text': seed(f.id, f.value ?? ''); break
      case 'range': seed(`${f.id}From`, f.from ?? ''); seed(`${f.id}To`, f.to ?? ''); break
      case 'select': seed(f.id, f.value ?? ''); break
      case 'radio': seed(f.id, f.value ?? f.options[0] ?? ''); break
      case 'check': seed(f.id, f.checked ?? false); break
      case 'list': for (let i = 1; i <= f.count; i++) seed(`${f.id}${i}`, ''); break
      case 'row': collect(f.fields, out, args); break
      case 'columns': f.columns.forEach((c) => collect(c, out, args)); break
      default: break
    }
  }
}

function walk(fields: RSField[], visit: (f: RSField) => void) {
  for (const f of fields) {
    visit(f)
    if (f.kind === 'section' && f.right) walk([f.right], visit)
    if (f.kind === 'row') walk(f.fields, visit)
    if (f.kind === 'columns') f.columns.forEach((c) => walk(c, visit))
  }
}

export function reportContext(values: Values): RSContext {
  const val = (id: string) => (typeof values[id] === 'string' ? (values[id] as string) : '')
  return {
    p: values, val, on: (id) => values[id] === true, like: rsLike, today: MOIS_TODAY, patients,
  }
}

/* --- the output ----------------------------------------------------------- */
const fill = (s: string, ctx: RSContext) => s.replace(/\{(\w+)\}/g, (_, k: string) => ctx.val(k) || (k === 'today' ? ctx.today : ''))

/** the table's rows after its parameter filters; raw markup lines kept */
export function reportRows(t: RSTable, ctx: RSContext): (string[] | string)[] {
  const all = typeof t.rows === 'function' ? t.rows(ctx) : t.rows
  const keep = (r: string[]) => (t.filters ?? []).every((f) => {
    const mode = f.modeField ? rsMatchOf(ctx.val(f.modeField)) : f.mode
    return rsLike(ctx.val(f.field), r[f.col] ?? '', mode)
  })
  return all.filter((r) => typeof r === 'string' || keep(r))
}

export function reportPages(spec: ReportSpec, ctx: RSContext): string[] {
  if (spec.pages) return spec.pages(ctx)
  const t = spec.output
  if (!t) return ['']
  const rows = reportRows(t, ctx)
  const cells = rows.filter((r): r is string[] => typeof r !== 'string')
  const footer = typeof t.footer === 'function' ? t.footer(ctx, cells)
    : t.footer ?? ['', `**TOTAL RECORDS: ${cells.length}**`]
  const cols = `%COLS:${t.cols.join(',')}%`
  const head = [
    ...(t.clinic === false ? [] : [`**${t.clinic ?? 'MOIS TEST CLINIC'}**`]),
    ...fill(t.title, ctx).split('\n').map((l) => (l.startsWith('%') ? l : `%TITLE%${l}`)),
    ...(t.subtitle ? fill(t.subtitle, ctx).split('\n').map((l) => (l.startsWith('%') ? l : `%SUB%${l}`)) : []),
    cols,
    `%TH%${t.head.join('|')}`,
  ]
  /* 32 body lines to a page, the header repeated */
  const body = rows.map((r) => (typeof r === 'string' ? r : `%TR%${r.join('|')}`))
  const pages: string[] = []
  for (let i = 0; i < Math.max(1, body.length); i += 32) {
    const slice = body.slice(i, i + 32)
    /* a raw line resets the column grid; put it back after one */
    const lines = slice.flatMap((l, j) => (l.startsWith('%TR%') && j > 0 && !slice[j - 1]!.startsWith('%TR%') ? [cols, l] : [l]))
    pages.push([...head, ...lines, ...(i + 32 >= body.length ? footer : [])].join('\n'))
  }
  return pages
}

function excelSheet(spec: ReportSpec, ctx: RSContext): { head: string[]; rows: string[][] } {
  const t = spec.output
  if (!t) return { head: [], rows: [] }
  const cells = reportRows(t, ctx).filter((r): r is string[] => typeof r !== 'string')
    .map((r) => r.map((c) => c.replace(/\*\*/g, '')))
  const rows = t.excelRows ? t.excelRows(ctx, cells) : cells
  /* the head after the rows: a sheet whose columns follow the parameters may
     settle them while building its rows (practiceAccess.ts) */
  const head = typeof t.excelHead === 'function' ? t.excelHead(ctx) : t.excelHead ?? t.head
  return { head, rows }
}

/* --- the controls ----------------------------------------------------------- */
const REQUIRED_FILL: CSSProperties = { background: 'var(--pb-dw-flag, #f8c7a8)' }

/** a drop-down a value can be typed into — `%` included */
function EditCombo({ value, options, w, anchor, disabled, onChange }: {
  value: string; options: readonly string[]; w: number; anchor?: string; disabled?: boolean; onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const owner = usePBPopupOwner()
  const listId = `${owner}-list`
  return (
    <span ref={ref} className="pb-inputgroup" style={{ width: w }}>
      <input
        className="pb-field"
        value={value}
        disabled={disabled}
        data-tutorial-id={anchor}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'F4' || (e.altKey && e.key === 'ArrowDown')) { e.preventDefault(); setOpen((o) => !o) } if (e.key === 'Escape') setOpen(false) }}
        onBlur={() => setOpen(false)}
      />
      <button
        type="button" className="pb-inputgroup__btn pb-inputgroup__btn--drop" tabIndex={-1} disabled={disabled}
        onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o) }}
      >
        <PBDropGlyph />
      </button>
      {open && (
        <PBPopup id={listId} anchorRef={ref} owner={owner} className="pb-dddw__list" minWidth="anchor">
          <table className="pb-dddw__table" role="listbox">
            <tbody>
              {options.map((o) => (
                <tr key={o} role="option" aria-selected={o === value} className={o === value ? 'is-current' : undefined}
                  onMouseDown={(e) => { e.preventDefault(); onChange(o); setOpen(false) }}>
                  <td>{o || ' '}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PBPopup>
      )}
    </span>
  )
}

/** the "…" picker: a list over the parameter window (also the report
    builders' concept pickers) */
export function ReportPicker({ pick, value, onOk, onCancel }: { pick: RSPick; value: string; onOk: (v: string) => void; onCancel: () => void }) {
  const options = rsOptions(pick.options).filter(Boolean)
  const code = (o: string) => o.split(' - ')[0]!.trim()
  const [cur, setCur] = useState(() => Math.max(0, options.findIndex((o) => code(o) === value || o === value)))
  const ticked = useTickSet<string>(() => value.split(',').map((s) => s.trim()).filter(Boolean))
  const rows = options.map((o) => ({ o, code: code(o) }))
  const ok = () => {
    if (pick.multi) onOk(options.map(code).filter((c) => ticked.has(c)).join(','))
    else onOk(pick.options === 'charts' ? code(options[cur] ?? '') : options[cur] ?? '')
  }
  return (
      <WorkspaceDialogFrame id="report-picker" title={pick.title} width={380} height={360} controls={false} onClose={onCancel} zIndex={90}>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 6 }}>
          <PBDataWindow
            rows={rows}
            current={cur}
            onCurrentChange={setCur}
            onActivate={pick.multi ? undefined : () => ok()}
            rowTutorialId={(r) => `host.mois.row.report-pick-${pbSlug(r.code)}`}
            columns={[
              ...(pick.multi ? [{
                key: 'tick', header: '', width: 26,
                render: (r: { o: string; code: string }) => (
                  <PBCheckbox checked={ticked.has(r.code)} onChange={(v) => ticked.set(r.code, v)} />
                ),
              }] : []),
              { key: 'o', header: pick.multi ? 'Code - Description' : 'Description' },
            ]}
          />
        </div>
        <DialogFooter plain gap={19} padding="4px 0 10px">
          <DialogButton id="report-picker-ok" width={75} isDefault onClick={ok}>Ok</DialogButton>
          <DialogButton id="report-picker-cancel" width={75} onClick={onCancel}>Cancel</DialogButton>
        </DialogFooter>
      </WorkspaceDialogFrame>
  )
}

/* --- the window ------------------------------------------------------------ */
function ReportSpecParams({ spec, args, close, open }: AreaWindowProps & { spec: ReportSpec }) {
  const [values, setValues] = useState<Values>(() => { const v: Values = {}; collect(spec.fields, v, args); return v })
  const [picking, setPicking] = useState<{ key: string; pick: RSPick } | null>(null)
  const set = (k: string, v: string | boolean) => setValues((p) => ({ ...p, [k]: v }))
  const str = (k: string) => (typeof values[k] === 'string' ? (values[k] as string) : '')
  const labelW = spec.labelW ?? 90
  const sid = spec.id

  /* what the window reports: slugs and booleans, never typed text */
  let excel = spec.excelOnly === true
  let navigator = false
  const choices: string[] = []
  const filled: string[] = []
  walk(spec.fields, (f) => {
    if (f.kind === 'check') {
      const greyed = f.disabled === true || (!!f.disabledIf && values[f.disabledIf.field] === f.disabledIf.is)
      if (values[f.id] === true && !greyed) {
        choices.push(f.id)
        if (f.output === 'excel') excel = true
        if (f.output === 'navigator') navigator = true
      }
    } else if (f.kind === 'radio' || (f.kind === 'select' && !f.editable)) {
      if (str(f.id)) choices.push(`${f.id}:${pbSlug(str(f.id))}`)
      const out = f.kind === 'radio' ? f.outputs?.[str(f.id)] : undefined
      if (out === 'excel') excel = true
      if (out === 'navigator') navigator = true
    } else if (f.kind === 'text' || f.kind === 'select') {
      if (str(f.id)) filled.push(f.id)
    } else if (f.kind === 'range') {
      if (str(`${f.id}From`) || str(`${f.id}To`)) filled.push(f.id)
    } else if (f.kind === 'list') {
      for (let i = 1; i <= f.count; i++) if (str(`${f.id}${i}`)) filled.push(`${f.id}${i}`)
    }
  })
  const output = navigator ? 'chart-navigator' : excel ? 'excel' : 'print'
  useScreenReport({ report: sid, output, choices: choices.join(','), filled: filled.join(',') })

  const ok = () => {
    const ctx = reportContext(values)
    const name = spec.name
    if (navigator) {
      const t = spec.output
      const rows = t ? reportRows(t, ctx).filter((r): r is string[] => typeof r !== 'string') : []
      const charts = rows.map((r) => r[t?.chartCol ?? -1] ?? '').filter((c) => patients.some((p) => p.chart === c))
      const list = (charts.length ? [...new Set(charts)] : ['3609', '3658', '3093']).map((chart) => {
        const p = patients.find((x) => x.chart === chart)
        return { chart, name: p ? `${p.last},${p.first}` : chart, description: spec.navigatorLabel ?? name.toUpperCase() }
      })
      loadReportNavigator(list)
      close()
      open('chart-navigator')
      return
    }
    if (excel) {
      const sheet = excelSheet(spec, ctx)
      open('report-excel', { title: name, head: sheet.head, rows: sheet.rows })
      return
    }
    /* `bare`: the page is only what the report prints — no emulator
       `title · Page n` line over it (v02.31.23 Print Preview, Drive `Bright
       Health Presentation/` 2026-08-11 3.41.34 PM) */
    open('print-preview', { title: name, pages: reportPages(spec, ctx), bare: true, landscape: spec.landscape })
  }

  const dots = (key: string, pick: RSPick | undefined, disabled?: boolean) => pick && (
    <DotsButton id={`${sid}-${key}`} disabled={disabled} onClick={() => setPicking({ key, pick })} />
  )

  const off = (f: { disabled?: boolean; disabledIf?: { field: string; is: string | boolean } }) =>
    f.disabled === true || (!!f.disabledIf && values[f.disabledIf.field] === f.disabledIf.is)
  const control = (f: RSField, k: number): ReactNode => {
    switch (f.kind) {
      case 'text': {
        const input = (
          <FieldInput
            id={`${sid}-${f.id}`}
            align={f.align}
            w={f.dots ? '100%' : f.w ?? 172}
            style={f.required ? REQUIRED_FILL : {}}
            value={str(f.id)}
            disabled={off(f)}
            onChange={(v) => set(f.id, v)}
          />
        )
        return (
          <span key={k} className="pb-row" style={{ gap: 6 }}>
            {f.dots ? <span className="pb-inputgroup" style={{ width: f.w ?? 172 }}>{input}{dots(f.id, f.dots, off(f))}</span> : input}
            <Hint>{f.hint}</Hint>
          </span>
        )
      }
      case 'range': {
        const box = (end: 'From' | 'To') => (
          <FieldInput
            id={`${sid}-${f.id}-${end.toLowerCase()}`}
            align="center"
            w={f.w ?? 84}
            style={f.required && end === 'From' ? REQUIRED_FILL : {}}
            value={str(`${f.id}${end}`)}
            onChange={(v) => set(`${f.id}${end}`, v)}
          />
        )
        return <span key={k} className="pb-row" style={{ gap: 6 }}>{box('From')}<span style={{ padding: '0 8px' }}>{f.joiner ?? 'to'}</span>{box('To')}<Hint>{f.hint}</Hint></span>
      }
      case 'select': {
        const options = rsOptions(f.options)
        const anchor = `host.mois.field.${sid}-${f.id}`
        return (
          <span key={k} className="pb-row" style={{ gap: 6 }}>
            {f.editable
              ? <EditCombo value={str(f.id)} options={options} w={f.w ?? 172} anchor={anchor} disabled={off(f)} onChange={(v) => set(f.id, v)} />
              : <PBSelect w={f.w ?? 172} options={options} value={str(f.id)} disabled={off(f)} data-tutorial-id={anchor} onChange={(e) => set(f.id, e.target.value)} />}
            <Hint>{f.hint}</Hint>
          </span>
        )
      }
      case 'radio':
        return (
          <span key={k} style={{ display: 'flex', flexDirection: f.column ? 'column' : 'row', gap: f.column ? 5 : 18, alignItems: f.column ? 'flex-start' : 'center' }}>
            {f.options.map((o) => {
              return (
                <CmdRadio key={o} id={`${sid}-${f.id}-${pbSlug(o)}`} name={`${sid}-${f.id}`} label={o}
                  checked={str(f.id) === o} onChange={() => set(f.id, o)} />
              )
            })}
            <Hint>{f.hint}</Hint>
          </span>
        )
      case 'check': {
        return (
          <span key={k} className="pb-row" style={{ gap: 6, color: '#000', fontWeight: 400 }}>
            <CmdCheck
              id={`${sid}-${f.id}`}
              label={f.text}
              checked={values[f.id] === true}
              disabled={off(f)}
              onChange={(v) => set(f.id, v)}
            />
            <Hint>{f.hint}</Hint>
          </span>
        )
      }
      case 'note':
        return <span key={k} style={{ whiteSpace: 'nowrap', color: '#000', fontWeight: 400 }}>{f.text}</span>
      case 'row':
        return <span key={k} className="pb-row" style={{ gap: 10 }}>{f.fields.map((x, j) => control(x, j))}</span>
      default:
        return null
    }
  }

  const line = (label: ReactNode, body: ReactNode, key: number | string) => (
    <ParamLine key={key} label={label} w={labelW} style={spec.labelIndent !== undefined ? { paddingLeft: spec.labelIndent } : undefined}>{body}</ParamLine>
  )

  const render = (fields: RSField[]): ReactNode => fields.map((f, i) => {
    switch (f.kind) {
      case 'section':
        return (
          <ParamSection key={i}>
            {f.right ? <span className="pb-row" style={{ gap: 24 }}>{f.label}{control(f.right, 0)}</span> : f.label}
          </ParamSection>
        )
      case 'note':
        return <div key={i} style={{ padding: `3px 10px 3px ${10 + (f.indent ?? 0)}px` }}>{f.text}</div>
      case 'rule':
        return <div key={i} style={{ borderTop: '1px solid #c8c8c8', margin: '4px 0' }} />
      case 'row':
        return line(f.label ? `${f.label}` : '', <span className="pb-row" style={{ gap: 10 }}>{f.fields.map((x, j) => control(x, j))}</span>, i)
      case 'columns':
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: f.columns.map(() => '1fr').join(' '), padding: '2px 0' }}>
            {f.columns.map((c, j) => <div key={j}>{render(c)}</div>)}
          </div>
        )
      case 'list': {
        const per = f.columns ?? 2
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: Array.from({ length: per }, () => `${labelW}px ${f.w ?? 184}px`).join(' 1fr '), rowGap: 2, columnGap: 6, padding: '4px 10px', alignItems: 'center' }}>
            {Array.from({ length: f.count }, (_, n) => {
              const key = `${f.id}${n + 1}`
              const input = (
                <FieldInput id={`${sid}-${f.id}-${n + 1}`} w="100%" value={str(key)} onChange={(v) => set(key, v)} />
              )
              const cells = [
                <span key={`l${n}`} className="pb-form__label">{f.label} {n + 1}:</span>,
                f.dots ? <span key={`f${n}`} className="pb-inputgroup" style={{ width: f.w ?? 184 }}>{input}{dots(key, f.dots)}</span>
                  : <span key={`f${n}`} style={{ width: f.w ?? 184 }}>{input}</span>,
              ]
              return per > 1 && n % per !== per - 1 ? [...cells, <span key={`s${n}`} />] : cells
            })}
          </div>
        )
      }
      default:
        return line(f.label ?? '', control(f, 0), i)
    }
  })

  return (
    <ParamFrame
      id={`report-params-${sid}`}
      prefix={sid}
      title={spec.title ?? `Report: ${spec.folder} - ${spec.name}`}
      w={spec.width ?? 640}
      h={spec.height ?? 505}
      band={spec.band !== false}
      okLabel={spec.okLabel ?? 'Ok'}
      onOk={ok}
      onCancel={close}
      after={picking && (
        <ReportPicker
          pick={picking.pick}
          value={str(picking.key)}
          onCancel={() => setPicking(null)}
          onOk={(v) => { set(picking.key, v); setPicking(null) }}
        />
      )}
    >
      {render(spec.fields)}
    </ParamFrame>
  )
}

/* --- the Excel sheet --------------------------------------------------------- */
const letter = (i: number) => (i < 26 ? String.fromCharCode(65 + i) : `${String.fromCharCode(64 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}`)

function ExcelSheetWindow({ args, close }: AreaWindowProps) {
  const title = typeof args.title === 'string' ? args.title : 'Report'
  const head = Array.isArray(args.head) ? args.head.map(String) : []
  const rows = Array.isArray(args.rows) ? (args.rows as unknown[]).map((r) => (Array.isArray(r) ? r.map(String) : [])) : []
  const file = `${title.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')}.csv`
  const [cell, setCell] = useState('A1')
  useScreenReport({ report: pbSlug(title), sheet: 'excel', rows: rows.length })
  const cols = Math.max(head.length, 8)
  const grid = [head, ...rows]
  const th: CSSProperties = { background: '#e4ecf7', border: '1px solid #c5d2e3', fontWeight: 400, color: '#27413e', padding: '0 4px', textAlign: 'center' }
  return (
    <WorkspaceDialogFrame id="report-excel" title={`Microsoft Excel - ${file}`} width={1000} height={620} onClose={close}>
      <div style={{ background: '#1e7145', color: '#fff', padding: '3px 8px', flex: 'none', display: 'flex', gap: 18 }}>
        {['File', 'Home', 'Insert', 'Page Layout', 'Formulas', 'Data', 'Review', 'View'].map((m) => <span key={m}>{m}</span>)}
      </div>
      <div className="pb-row" style={{ gap: 6, padding: '3px 6px', background: '#fff', borderBottom: '1px solid #c5d2e3', flex: 'none' }}>
        <PBInput w={64} value={cell} readOnly />
        <span style={{ fontStyle: 'italic', color: '#555' }}>fx</span>
        <PBInput w="100%" readOnly value={(() => {
          const m = /^([A-Z]+)(\d+)$/.exec(cell)
          if (!m) return ''
          const c = m[1]!.charCodeAt(0) - 65
          return grid[Number(m[2]) - 1]?.[c] ?? ''
        })()} />
      </div>
      <div data-tutorial-id="host.mois.field.excel-sheet" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff' }}>
        <table style={{ borderCollapse: 'collapse', fontFamily: 'Calibri, Arial, sans-serif', fontSize: 13, whiteSpace: 'nowrap' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 34 }} />
              {Array.from({ length: cols }, (_, i) => <th key={i} style={{ ...th, minWidth: 90 }}>{letter(i)}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.max(grid.length, 30) }, (_, r) => (
              <tr key={r}>
                <th style={th}>{r + 1}</th>
                {Array.from({ length: cols }, (_, c) => {
                  const ref = `${letter(c)}${r + 1}`
                  return (
                    <td
                      key={c}
                      onClick={() => setCell(ref)}
                      style={{
                        border: '1px solid #d4d4d4', padding: '1px 4px', height: 18, fontWeight: r === 0 ? 700 : 400,
                        outline: cell === ref ? '2px solid #217346' : undefined, outlineOffset: -2,
                      }}
                    >
                      {grid[r]?.[c] ?? ''}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pb-row" style={{ gap: 0, background: '#f0f0f0', borderTop: '1px solid #c5d2e3', flex: 'none' }}>
        <span style={{ background: '#fff', padding: '2px 14px', borderRight: '1px solid #c5d2e3', color: '#217346', fontWeight: 700 }}>{file.replace(/\.csv$/, '').slice(0, 31)}</span>
        <span className="pb-row__spacer" />
        <span style={{ padding: '2px 8px' }}>Ready</span>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- registration: one window per spec ------------------------------------- */
for (const spec of REPORT_SPECS) {
  if (spec.window) continue
  const Window = (props: AreaWindowProps) => <ReportSpecParams {...props} spec={spec} />
  Window.displayName = `ReportParams(${spec.id})`
  registerAreaWindow(reportSpecWindow(spec), Window)
}
registerAreaWindow('report-excel', ExcelSheetWindow)
