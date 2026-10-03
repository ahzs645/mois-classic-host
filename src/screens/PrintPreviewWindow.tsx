import { useMemo, useState } from 'react'
import { useScreenReport } from '../host/screen-state'
import { argBool, argStr } from '../data/text'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { ReportPage } from './PrintFlow'
import { PrintPreviewFrame } from './printKit'
import { WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   Print Preview — the classic PowerBuilder DataWindow print preview.

   Where a Reports-module report (and a Workspace list print) comes back when
   it is not sent to Excel: the page on the right, the print panel on the
   left. Distinct from the chart's Richtext Report window (screens/PrintFlow),
   which is an editable RTF document with Print and Attach.

   PROVENANCE: 303518 image `8fec3b9c` (Print a Care Plan: "The Print Preview
   window will open. Press 'Print All'"), 1334x724 — left panel, top to
   bottom: `Zoom To` group (200% · 100% · 75% · 50% · 25%), Percent [125],
   Copies [1], Apply, Change Header (greyed), Sort, then Print All,
   Print Range, a range box reading `All Pages`, `Ex. 1,2,5-10,39`, Cancel,
   Save As, `Printer Type` [Report Printer ▼]; the `Preview` group with the
   page; and `Printer:  CutePDFWriter   Change...` under it. 304020 uses the
   same window for Complete Unsent Records ("Click 'Print All'. Click Cancel
   or close out of the above window once the report is printed").

   ARGS (the contract other areas open it with — `open('print-preview', …)`):
     title    string    the report's name; the window's caption stays
                        `Print Preview`, as in the capture
     pages?   string[]  preformatted pages, one string per page, in the page
                        markup `ReportPage` reads (screens/PrintFlow +
                        data/printPages.ts: plain lines, %TITLE%, %TH%/%TR%
                        table rows under %COLS:…%, %RULE%, **bold**)
     heading? string    printed bold at the top of every page built from rows
     bare?    boolean   no `title · Page n` line over each page: the page is
                        only what the report prints (the Encounter Note and
                        WCB Physician Report prints, user capture 2026-09-25
                        #23 / #24 / #31, v02.31.23)
     columns? { key, header, width? }[]   a table report: its columns …
     rows?    Record<string,string>[]     … and its rows, paginated
                        ROWS_PER_PAGE to a page with the header repeated
     landscape? boolean   the page is 11in wide rather than 8.5in
   `pages` wins when both are given. With neither, one empty page.

   GEOMETRY (2026-10-03 fidelity pass; 303518 `8fec3b9c` 1:1 and the
   v02.31.23 capture Drive `Bright Health Presentation/` 2026-08-11 3.41.34 PM,
   ≈1.19×): only a close box in the caption; the rail (screens/printKit
   `report` skin); the `Preview` group (legend regular weight) holding a
   black-ruled viewport 10px in and 13px under the group's rule, the page
   flush in its top-left corner — a Letter page, 816px a side at 100%
   (8.5in; 1056 landscape), white with a black edge, the window face beyond
   it — and under the viewport, 2px down, a white black-ruled box 31px tall:
   `Printer:` 6px in, the printer name 48px in, and `Change...` a link at a
   fixed 480px. Both captures open with the 100% radio set and Percent 125,
   and the page drawn at 125% (816 × 1.25 = the 1020px page of 8fec3b9c), so
   the window opens at 125. v02.31.23 prints the printer as `CutePDFWriter ()`.
   INFERRED: the gap between stacked pages (one page is all either capture
   shows).

   Behaviour: the zoom radios / Percent + Apply scale the page; Print All
   and Print Range record what was sent (reported as `host.screen.printed`:
   `all` or the range text) and the window stays open, as the article says;
   Cancel and the title-bar × close it.
   ========================================================================= */

export type PrintPreviewColumn = { key: string; header: string; width?: number }
export type PrintPreviewArgs = {
  title: string
  pages?: string[]
  heading?: string
  bare?: boolean
  columns?: PrintPreviewColumn[]
  rows?: Record<string, string>[]
  landscape?: boolean
}

const ROWS_PER_PAGE = 32
const ZOOMS = ['200', '100', '75', '50', '25']

/** Rows → page markup, the header row repeated on every page. */
export function paginateRows(heading: string | undefined, columns: PrintPreviewColumn[], rows: Record<string, string>[]): string[] {
  const total = columns.reduce((s, c) => s + (c.width ?? 100), 0) || 1
  const cols = `%COLS:${columns.map((c) => Math.max(1, Math.round(((c.width ?? 100) / total) * 100))).join(',')}%`
  const head = `%TH%${columns.map((c) => c.header).join('|')}`
  const pages: string[] = []
  for (let i = 0; i < Math.max(1, rows.length); i += ROWS_PER_PAGE) {
    const slice = rows.slice(i, i + ROWS_PER_PAGE)
    pages.push([
      ...(heading ? [`%TITLE%${heading}`, ''] : []),
      cols, head,
      ...slice.map((r) => `%TR%${columns.map((c) => (r[c.key] ?? '').replace(/\|/g, '/')).join('|')}`),
    ].join('\n'))
  }
  return pages
}

function asArgs(args: Record<string, unknown>): PrintPreviewArgs {
  return {
    title: argStr(args.title),
    pages: Array.isArray(args.pages) ? args.pages.map(String) : undefined,
    heading: typeof args.heading === 'string' ? args.heading : undefined,
    bare: argBool(args.bare),
    columns: Array.isArray(args.columns) ? (args.columns as PrintPreviewColumn[]) : undefined,
    rows: Array.isArray(args.rows) ? (args.rows as Record<string, string>[]) : undefined,
    landscape: argBool(args.landscape),
  }
}

export function PrintPreviewWindow({ args, close }: AreaWindowProps) {
  const a = asArgs(args)
  const pages = useMemo(() => (
    a.pages?.length ? a.pages
      : a.columns?.length ? paginateRows(a.heading ?? a.title, a.columns, a.rows ?? [])
        : ['']
  ), [a.pages, a.columns, a.rows, a.heading, a.title])
  const [zoom, setZoom] = useState('100')
  const [percent, setPercent] = useState('125')
  const [scale, setScale] = useState(125)
  const [copies, setCopies] = useState('1')
  const [range, setRange] = useState('All Pages')
  const [printed, setPrinted] = useState<string | null>(null)

  useScreenReport({ report: a.title ? a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '', pages: pages.length, printed: printed ?? '' })

  const pickZoom = (z: string) => { setZoom(z); setPercent(z); setScale(Number(z)) }

  return (
    <WorkspaceDialogFrame id="print-preview" title="Print Preview" width={1000} height={700} controls={false} onClose={close}>
      <PrintPreviewFrame
        skin="report"
        zooms={ZOOMS}
        zoomLabel={(z) => `${z}%`}
        zoomName="preview-zoom"
        zoom={zoom}
        onZoom={pickZoom}
        fax
        percent={{ value: percent, onChange: (e) => setPercent(e.target.value) }}
        copies={{ value: copies, onChange: (e) => setCopies(e.target.value) }}
        range={{ value: range, onChange: (e) => setRange(e.target.value) }}
        onApply={() => { const n = Number(percent); if (n > 0) setScale(n) }}
        onPrintAll={() => setPrinted('all')}
        onPrintRange={() => setPrinted(range || 'all')}
        onCancel={close}
        printerTypes={['Report Printer', 'Form Printer']}
      >
        {/* ---- the preview -------------------------------------------- */}
        <fieldset className="pb-fieldset pb-fieldset--fill" style={{ margin: 0, padding: '6px 6px 2px 9px', flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <legend className="pb-fieldset__legend" style={{ color: '#000', fontWeight: 400, marginLeft: 5, padding: '0 3px' }}>Preview</legend>
          <div
            data-tutorial-id="host.mois.field.preview-page"
            style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: 'var(--pb-face)', border: '1px solid #000' }}
          >
            {pages.map((page, i) => (
              <div
                key={i}
                style={{
                  width: a.landscape ? 1056 : 816, minHeight: a.landscape ? 816 : 1056, boxSizing: 'border-box',
                  margin: i ? '10px 0 0' : 0, background: '#fff', borderRight: '1px solid #000', borderBottom: '1px solid #000',
                  padding: '30px 30px', zoom: scale / 100,
                  fontFamily: 'Arial, "Helvetica Neue", sans-serif', fontSize: 12, lineHeight: 1.35,
                }}
              >
                {!a.bare && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 6 }}>
                    <span>{a.title}</span>
                    <span>Page {i + 1}</span>
                  </div>
                )}
                <ReportPage page={page} font="sans" />
              </div>
            ))}
          </div>
          <div style={{ position: 'relative', height: 31, marginTop: 2, flex: 'none', boxSizing: 'border-box', border: '1px solid #000', background: '#fff', display: 'flex', alignItems: 'center' }}>
            <span className="pb-form__label" style={{ position: 'absolute', left: 6 }}>Printer:</span>
            <span style={{ position: 'absolute', left: 48 }}>CutePDFWriter ()</span>
            <button type="button" className="pb-link" style={{ position: 'absolute', left: 480 }}>Change...</button>
            {/* emulator affordance: MOIS hands the job to Windows and says
                nothing; the stage names what was sent so the step shows it */}
            {printed && (
              <span data-tutorial-id="host.mois.field.preview-printed" style={{ position: 'absolute', left: 560, right: 6, color: '#404040', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Sent to printer: {printed === 'all' ? `all ${pages.length} page(s)` : `pages ${printed}`}, {copies || '1'} cop{copies === '1' ? 'y' : 'ies'}
              </span>
            )}
          </div>
        </fieldset>
      </PrintPreviewFrame>
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow('print-preview', PrintPreviewWindow)
