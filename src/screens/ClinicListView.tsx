import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  PBBand, PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBLookup,
  PBSelect, PBTabs, PBTextArea, PBViewHeader, pbSlug,
} from '../pb'
import type { PBColumn } from '../pb'
import {
  CLINIC_COMMAND_WIDTH, CONVERTED_PROVIDERS_KEY, CURRENT_PROVIDER_KEY, clinicCommands, clinicListSpec,
  type ClinicColumn, type ClinicField, type ClinicListSpec, type ClinicPage, type ClinicRow, type ConvertedProviders,
} from '../data/clinicManagement'
import { useScreenReport } from '../host/screen-state'
import { useScreenWindow, useSessionState } from '../host/screen-windows'
import { ClinicEditorLayer, EDIT_RECORD_WINDOW, FIND_REPLACE_WINDOW, NEW_RECORD_WINDOW, useClinicRows } from './ClinicEditorWindows'

/* ============================================================================
   Administration ▸ Clinic Management — the twelve list screens.

   Eleven of these are one window with a different column set and a different
   four-to-six button command row; the twelfth (Immunization Inventory) is the
   same window with a nine-button row. So this is one parameterised screen
   driven by `data/clinicManagement.ts`, where each node's provenance,
   measured column spans and filter-box widths live beside it.

   Three layout variants come out of that table:
     1. grid only                   — eight nodes
     2. grid + tabbed detail pane   — Global Reminders, Immunization Inventory
     3. grid + untabbed detail form — Clinic Favourite Meds, Organizations

   The editor windows New Record, Edit Record and a double-click raise live
   in `ClinicEditorWindows.tsx`: New Provider Profile → Provider, New Provider
   → Master Provider, New Resource / Resource Detail, New Facility / Facility
   Detail and New Service Center → Service Center Detail, and the Service
   Center List's Find / Replace → Find and Replace: Service Center (user
   capture 2026-09-25 #55–#60, v02.31.23). Computer Detail is captured
   nowhere and is not built, so that list's Edit Record stays inert. A list's rows are this session's
   (`useClinicRows`): what a window creates or saves is there when the
   learner comes back to the list, and in the Master Provider List lookup the
   Letter Writer opens.
   ========================================================================= */

/* A caption MOIS wraps itself. Only Service Location has one — its
   `Make Available on Scheduler` header band is 28px over two lines where
   every other classic node's is a single 16px line. */
function caption(header: string): ReactNode {
  if (!header.includes('\n')) return header
  const lines = header.split('\n')
  return lines.map((line, i) => (i === 0 ? line : <span key={i}><br />{line}</span>))
}

/* --------------------------------------------------------------------------
   Two measured details the `pb` kit has no prop for, and which this wave may
   not add to `src/pb` — so they are applied as two scoped rules instead:

   1. the #FFC09C current-*cell* wash. A DataWindow's `td` takes its colour
      from the row, and paints the band's 1px edges and hairline back over
      itself as a gradient; setting the cell's own background-color therefore
      shows through the middle of the tile exactly the way the captures do.
   2. Immunization Inventory's 42px command-row spacer, where the kit's
      `null` gap is 9px.

   The right fix is a `cellClassName` (or `focusColumn`) hook on PBDataWindow
   and a width on PBCommandRow's gap; both are noted in this wave's report.
   ------------------------------------------------------------------------ */
const CMDGAP_CLASS = 'pb-clinic-cmdgap'

function scopedRules(gridClass: string, focusColumn: number | undefined, gutter: boolean): string {
  const rules = [`.${CMDGAP_CLASS} .pb-cmdrow__gap { width: 42px; }`]
  if (focusColumn !== undefined) {
    const nth = focusColumn + (gutter ? 1 : 0) + 1
    rules.push(
      `.${gridClass} .pb-dw__table > tbody > tr.is-current > td:nth-child(${nth}) { background-color: #ffc09c; }`,
    )
  }
  return rules.join('\n')
}

/* --------------------------------------------------------------------------
   Column and field renderers
   ------------------------------------------------------------------------ */

function toPBColumns(columns: ClinicColumn[]): PBColumn<ClinicRow>[] {
  return columns.map((c) => ({
    key: c.key,
    header: caption(c.header),
    width: c.width,
    align: c.align,
    /* B.1: the header band is black centred caption text, whatever the cells
       under it do — so a caption only leaves centre when the node's table
       says so explicitly. */
    headAlign: c.headAlign ?? 'center',
    dots: c.dots,
    render: c.check
      ? (r: ClinicRow) => <PBCheckbox checked={Boolean(r[c.key])} />
      : c.dim
        /* a read-only cell inside an editable grid is grey, not black */
        ? (r: ClinicRow) => <span style={{ color: '#606060' }}>{String(r[c.key] ?? '')}</span>
        : undefined,
  }))
}

function Field({ f }: { f: ClinicField }) {
  if (f.kind === 'static') {
    return <div style={{ color: '#606060', padding: '2px 0' }}>{f.text}</div>
  }
  if (f.kind === 'check') {
    return <div style={{ padding: '2px 0' }}><PBCheckbox label={f.label} checked={f.checked} /></div>
  }
  if (f.kind === 'checks') {
    return (
      <div className="pb-row" style={{ gap: 12, padding: '2px 0', alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="pb-form__label">{f.label}</span>
        {f.items.map((it) => <PBCheckbox key={it.label} label={it.label} checked={it.checked} />)}
      </div>
    )
  }
  if (f.kind === 'tree') {
    return (
      <fieldset className="pb-fieldset" style={{ marginTop: 4 }}>
        <legend className="pb-fieldset__legend">{f.caption}</legend>
        <div className="pb-fieldset__body" style={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
          {f.lines.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      </fieldset>
    )
  }
  if (f.kind === 'memo') {
    return (
      <div style={{ padding: '2px 0' }}>
        {f.label && <div className="pb-form__label">{f.label}</div>}
        <PBTextArea rows={f.rows ?? 2} w="100%" defaultValue={f.value} readOnly={f.readOnly} />
      </div>
    )
  }
  if (f.kind === 'pair') {
    return (
      <div className="pb-row" style={{ gap: 6, padding: '2px 0', alignItems: 'center', flexWrap: 'wrap' }}>
        {f.label && <span className="pb-form__label">{f.label}</span>}
        {f.fields.map((sub, i) => <Field key={i} f={sub} />)}
      </div>
    )
  }
  return (
    <div className="pb-row" style={{ gap: 6, padding: '2px 0', alignItems: 'center' }}>
      {f.label && <span className="pb-form__label">{f.label}</span>}
      {f.kind === 'text' && (
        <PBInput
          w={f.w}
          defaultValue={f.value}
          readOnly={f.readOnly}
          data-tutorial-id={f.label ? `host.mois.field.${pbSlug(f.label)}` : undefined}
        />
      )}
      {f.kind === 'lookup' && <PBLookup w={f.w} name={f.label ? pbSlug(f.label) : undefined} defaultValue={f.value} />}
      {f.kind === 'drop' && <PBSelect w={f.w} options={f.options} defaultValue={f.value} />}
      {f.kind === 'text' && f.hint && <span style={{ color: '#606060' }}>{f.hint}</span>}
    </div>
  )
}

/* One page of a detail pane: a form, a nested grid, or nothing at all where
   the corpus has no capture of it. */
function DetailPage({ page }: { page: ClinicPage }) {
  const [cur, setCur] = useState(0)
  /* a grid page's New adds an empty row (a condition, a lot number) and makes
     it current; Delete removes the current one */
  const [rows, setRows] = useState<ClinicRow[]>(page.kind === 'grid' ? page.rows : [])

  /* The tab is real — it is in the capture's strip — but its contents were
     never captured, so nothing is drawn rather than something invented. */
  if (page.kind === 'uncaptured') return <div style={{ flex: '1 1 auto' }} />

  if (page.kind === 'grid') {
    return (
      <>
        <PBBand
          right={page.buttons?.map((b) => (
            <span key={b}>
              {/* the anchor rides the button itself: `clickAnchor` clicks
                  whatever carries it, and a click on a wrapper never reaches
                  the button inside */}
              <PBButton
                size="sm"
                data-tutorial-id={`host.mois.command.${pbSlug(page.scope ?? page.caption ?? 'detail')}-${pbSlug(b)}`}
                onClick={() => {
                  if (b === 'New') { setRows((r) => [...r, Object.fromEntries(page.columns.map((c) => [c.key, '']))]); setCur(rows.length) }
                  if (b === 'Delete') { setRows((r) => r.filter((_, i) => i !== cur)); setCur(0) }
                }}
              >
                {b}
              </PBButton>
            </span>
          ))}
        >
          {page.caption ?? ''}
        </PBBand>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
          <PBDataWindow
            columns={toPBColumns(page.columns)}
            rows={rows}
            current={cur}
            onCurrentChange={setCur}
            empty=" "
          />
        </div>
        {page.legend && (
          <div className="pb-row" style={{ gap: 10, background: '#f0f0f0', padding: '3px 8px', flex: 'none' }}>
            <span>{page.legend.label}</span>
            {page.legend.keys.map((k) => <span key={k}>{k}</span>)}
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <div
        className="pb-row"
        style={{ alignItems: 'flex-start', gap: 18, padding: '6px 8px', flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}
      >
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          {page.left.map((f, i) => <Field key={i} f={f} />)}
        </div>
        {page.right && (
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            {page.right.map((f, i) => <Field key={i} f={f} />)}
          </div>
        )}
      </div>
      {page.footer && (
        <div style={{ background: '#f0f0f0', padding: '3px 8px', flex: 'none', whiteSpace: 'pre' }}>
          {page.footer}
        </div>
      )}
    </>
  )
}

/* --------------------------------------------------------------------------
   The screen
   ------------------------------------------------------------------------ */

/**
 * The rows a list shows this session: the Provider List loses a provider the
 * Provider Type Conversion Utility has converted, and the Org Role List or
 * Organization List gains it (2090817); every list keeps the rows New Record
 * added and the edits its windows saved (`base`, the session's copy).
 */
function sessionRows(view: ClinicListSpec, converted: ConvertedProviders, base: ClinicRow[]): ClinicRow[] {
  const moved = (to: string) => Object.entries(converted)
    .filter(([, kind]) => kind === to)
    .map(([name]) => ({ name, category: '' }))
  if (view.node === 'ad-provider-list') return base.filter((r) => !converted[String(r.name)])
  if (view.node === 'ad-org-role-list') return [...base, ...moved('org-role')]
  if (view.node === 'ad-org-list') return [...base, ...moved('organization')]
  return base
}

export function ClinicListView({ node, onClose }: { node: string; onClose?: () => void }) {
  const view: ClinicListSpec | undefined = clinicListSpec(node)
  const [cur, setCur] = useState(0)
  const [tab, setTab] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [base, updateRows] = useClinicRows(node)
  const win = useScreenWindow()
  const [converted] = useSessionState<ConvertedProviders>(CONVERTED_PROVIDERS_KEY, {})
  const [, setCurrentProvider] = useSessionState<string>(CURRENT_PROVIDER_KEY, '')
  const rows = view ? sessionRows(view, converted, base) : []
  const currentRow = rows[cur < rows.length ? cur : 0]
  useScreenReport({
    rows: rows.length,
    row: view && currentRow ? `${view.anchorPrefix}-${pbSlug(String(currentRow[view.anchorKey] ?? ''))}` : null,
  })

  if (!view) return null

  const gutter = !view.bare
  const gridClass = `pb-clinic-${view.node}`
  const columns = toPBColumns(view.columns)

  /* the Computer List's seven columns are wider than the work area, so a
     lesson rings its Computer Name cell rather than the row */
  if (view.anchorCell) {
    const i = view.columns.findIndex((c) => c.key === view.anchorCell)
    const col = columns[i]
    if (col) {
      col.render = (r: ClinicRow) => (
        <span data-tutorial-id={`host.mois.cell.${pbSlug(view.anchorCell!)}-${pbSlug(String(r[view.anchorCell!] ?? ''))}`}>
          {String(r[view.anchorCell!] ?? '')}
        </span>
      )
    }
  }

  const filters = view.filter?.kind === 'columns'
    ? view.columns.map((c, i) => {
      const box = view.filter?.kind === 'columns' ? view.filter.boxes.find((b) => b.col === i) : undefined
      return box
        ? <PBInput key={c.key} w={box.w} data-tutorial-id={`host.mois.field.filter-${pbSlug(c.key)}`} />
        : null
    })
    : undefined

  const detail = view.detail
  /* the frame keeps this component mounted across tree nodes, so a tab or a
     row index picked on one screen can outlive it — both fall back here
     rather than leaving the pane or the current row unpainted */
  const activeTab = detail?.tabs
    ? (tab && detail.pages[tab] ? tab : detail.tabs[0]!)
    : undefined
  const page = detail
    ? activeTab ? detail.pages[activeTab] : detail.pages.main
    : undefined
  const current = cur < rows.length ? cur : 0
  const pickRow = (i: number) => {
    setCur(i)
    if (view.node === 'ad-provider-list') setCurrentProvider(String(rows[i]?.name ?? ''))
  }
  /* New Record on an inline list adds an empty row and makes it current
     (303213, 303214, 303197: "New Record" then type into the new row); an
     edit-record list raises its New … dialog, where one is captured */
  const newRow = () => {
    const blank = Object.fromEntries(view.columns.map((c) => [c.key, c.check ? false : '']))
    updateRows((prev) => [...prev, blank])
    setCur(rows.length)
  }
  const newWindow = NEW_RECORD_WINDOW[view.node]
  const editWindow = EDIT_RECORD_WINDOW[view.node]
  const findWindow = FIND_REPLACE_WINDOW[view.node]
  /* Edit Record and a double-click open the current row's detail window */
  const editRow = (row: ClinicRow | undefined) => {
    if (row && editWindow) win.open(editWindow, { key: String(row[view.anchorKey] ?? '') })
  }

  return (
    <>
      <style>{scopedRules(gridClass, view.focusColumn, gutter)}</style>

      <PBViewHeader title={view.header} />

      <div className={CMDGAP_CLASS}>
        <PBCommandRow
          commands={clinicCommands(view).map((label) => (
            label === null ? null : {
              label,
              width: CLINIC_COMMAND_WIDTH[label],
              onClick: label === 'Close Window' ? () => onClose?.()
                : label === 'New Record' && view.editable ? newRow
                  : label === 'New Record' && newWindow ? () => win.open(newWindow)
                    : label === 'Edit Record' && editWindow ? () => editRow(rows[current])
                      : label === 'Find / Replace' && findWindow ? () => win.open(findWindow)
                        : undefined,
            }
          ))}
        />
      </div>

      {/* Clinic Favourite Meds and Immunization Inventory keep the band but
          put nothing in it: a plain full-width white expanse. */}
      {view.filter?.kind === 'blank' && (
        <div style={{ height: 21, background: '#ffffff', flex: 'none' }} />
      )}

      {/* the Contact List filters with one labelled box, not the per-column strip */}
      {view.filter?.kind === 'labelled' && (
        <div className="pb-row" style={{ gap: 6, padding: '3px 6px', flex: 'none', alignItems: 'center' }}>
          <span className="pb-form__label">{view.filter.label}</span>
          <PBInput w={view.filter.w} data-tutorial-id="host.mois.field.filter" />
        </div>
      )}

      {/* an inactive record is drawn grey (`439c4830…`: METHADONE, NURSING,
          PSYCHSOC on the Service Center List) */}
      <style>{`.${gridClass} .pb-dw__table > tbody > tr.is-inactive > td { color: #9c9c9c; }`}</style>
      <div className={gridClass} style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow
          columns={columns}
          rows={rows}
          current={current}
          onCurrentChange={pickRow}
          onActivate={editWindow ? (r) => editRow(r) : undefined}
          rowClassName={(r) => (r.active === false || r.active === 'N' ? 'is-inactive' : undefined)}
          gutter={gutter}
          head={view.bare ? false : 'blue'}
          rules={view.bare ? false : true}
          filters={filters}
          groupBy={view.groupKey ? (r) => String(r[view.groupKey!] ?? '') : undefined}
          groups={view.groups}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          groupTutorialId={(g) => `host.mois.group.${pbSlug(g)}`}
          rowTutorialId={view.anchorCell
            ? undefined
            : (r) => `host.mois.row.${view.anchorPrefix}-${pbSlug(String(r[view.anchorKey] ?? ''))}`}
          style={{
            /* the filter strip's boxes sit on white in every capture, not on
               the dialog face the kit's lookup grids use */
            ['--pb-band' as string]: '#ffffff',
            ...(view.groupFill ? { ['--pb-dw-group' as string]: view.groupFill } : null),
          }}
          empty="No records."
        />
      </div>

      {detail && page && (
        <>
          {/* the master/detail splitter */}
          <div style={{ height: 1, background: '#646464', flex: 'none' }} />
          <div
            style={{
              flex: 'none',
              height: detail.height,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              ...(detail.stripH ? { ['--pb-tabstrip-h' as string]: `${detail.stripH}px` } : null),
            }}
          >
            {detail.tabs
              ? (
                /* no capture measures these tabs' widths, so they keep PB's
                   fixed 96px rather than being sized to their captions */
                <PBTabs tabs={detail.tabs} active={activeTab!} onChange={setTab}>
                  <DetailPage key={activeTab} page={page} />
                </PBTabs>
              )
              : <DetailPage page={page} />}
          </div>
        </>
      )}

      <ClinicEditorLayer
        window={win.window}
        open={win.open}
        close={win.close}
        /* a created row lands at the end of the list and becomes current */
        onAdded={() => setCur(rows.length)}
      />
    </>
  )
}
