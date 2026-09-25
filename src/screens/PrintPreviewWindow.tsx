import { useMemo, useState } from 'react'
import { useScreenReport } from '../host/screen-state'
import { PBInput, PBRadio, PBSelect } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { ReportPage } from './PrintFlow'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

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
     columns? { key, header, width? }[]   a table report: its columns …
     rows?    Record<string,string>[]     … and its rows, paginated
                        ROWS_PER_PAGE to a page with the header repeated
   `pages` wins when both are given. With neither, one empty page.

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
  columns?: PrintPreviewColumn[]
  rows?: Record<string, string>[]
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
    title: typeof args.title === 'string' ? args.title : '',
    pages: Array.isArray(args.pages) ? args.pages.map(String) : undefined,
    heading: typeof args.heading === 'string' ? args.heading : undefined,
    columns: Array.isArray(args.columns) ? (args.columns as PrintPreviewColumn[]) : undefined,
    rows: Array.isArray(args.rows) ? (args.rows as Record<string, string>[]) : undefined,
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
  const [percent, setPercent] = useState('100')
  const [scale, setScale] = useState(100)
  const [copies, setCopies] = useState('1')
  const [range, setRange] = useState('All Pages')
  const [printed, setPrinted] = useState<string | null>(null)

  useScreenReport({ report: a.title ? a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '', pages: pages.length, printed: printed ?? '' })

  const pickZoom = (z: string) => { setZoom(z); setPercent(z); setScale(Number(z)) }
  const side = { display: 'flex', flexDirection: 'column' as const, gap: 4, alignItems: 'stretch' }

  return (
    <WorkspaceDialogFrame id="print-preview" title="Print Preview" width={1000} height={700} onClose={close}>
      <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, gap: 8, padding: '4px 6px 6px' }}>
        {/* ---- the print panel ---------------------------------------- */}
        <div style={{ ...side, width: 96, flex: 'none' }}>
          <fieldset className="pb-fieldset" style={{ margin: 0 }}>
            <legend className="pb-fieldset__legend" style={{ color: '#000' }}>Zoom To</legend>
            <div className="pb-fieldset__body" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {ZOOMS.map((z) => (
                <PBRadio key={z} name="preview-zoom" label={`${z}%`} checked={zoom === z} onChange={() => pickZoom(z)} />
              ))}
              <span className="pb-form__label" style={{ marginTop: 6 }}>Percent:</span>
              <PBInput w={38} value={percent} onChange={(e) => setPercent(e.target.value)} />
              <span className="pb-form__label">Copies:</span>
              <PBInput w={38} value={copies} onChange={(e) => setCopies(e.target.value)} />
              <DialogButton id="preview-apply" width={84} onClick={() => { const n = Number(percent); if (n > 0) setScale(n) }}>Apply</DialogButton>
              <DialogButton id="preview-change-header" width={84} disabled>Change Header</DialogButton>
              <DialogButton id="preview-sort" width={84}>Sort</DialogButton>
              <span style={{ height: 14 }} />
              <DialogButton id="preview-print-all" width={84} onClick={() => setPrinted('all')}>Print All</DialogButton>
              <DialogButton id="preview-print-range" width={84} onClick={() => setPrinted(range || 'all')}>Print Range</DialogButton>
              <PBInput w={86} value={range} onChange={(e) => setRange(e.target.value)} />
              <span style={{ fontSize: 11 }}>Ex. 1,2,5-10,39</span>
              <DialogButton id="preview-cancel" width={84} onClick={close}>Cancel</DialogButton>
              <DialogButton id="preview-save-as" width={84}>Save As</DialogButton>
              <span className="pb-form__label">Printer Type</span>
              <PBSelect w={88} options={['Report Printer', 'Form Printer']} />
            </div>
          </fieldset>
        </div>

        {/* ---- the preview -------------------------------------------- */}
        <fieldset className="pb-fieldset pb-fieldset--fill" style={{ margin: 0, flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <legend className="pb-fieldset__legend" style={{ color: '#000' }}>Preview</legend>
          <div
            data-tutorial-id="host.mois.field.preview-page"
            style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#d4d0c8', padding: '8px 0' }}
          >
            {pages.map((page, i) => (
              <div
                key={i}
                style={{
                  width: 720, margin: '0 auto 10px', background: '#fff', border: '1px solid #808080',
                  boxShadow: '2px 2px 0 #9a9a9a', padding: '18px 26px 26px', zoom: scale / 100,
                  fontFamily: 'Arial, "Helvetica Neue", sans-serif', fontSize: 12, lineHeight: 1.35, minHeight: 360,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 6 }}>
                  <span>{a.title}</span>
                  <span>Page {i + 1}</span>
                </div>
                <ReportPage page={page} font="sans" />
              </div>
            ))}
          </div>
          <div className="pb-row" style={{ gap: 8, padding: '4px 6px', borderTop: '1px solid #a0a0a0', flex: 'none' }}>
            <span className="pb-form__label">Printer:</span>
            <span>CutePDFWriter</span>
            <button type="button" className="pb-link" style={{ marginLeft: 'auto', marginRight: 'auto' }}>Change...</button>
            {/* emulator affordance: MOIS hands the job to Windows and says
                nothing; the stage names what was sent so the step shows it */}
            {printed && (
              <span data-tutorial-id="host.mois.field.preview-printed" style={{ color: '#404040' }}>
                Sent to printer: {printed === 'all' ? `all ${pages.length} page(s)` : `pages ${printed}`}, {copies || '1'} cop{copies === '1' ? 'y' : 'ies'}
              </span>
            )}
          </div>
        </fieldset>
      </div>
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow('print-preview', PrintPreviewWindow)
