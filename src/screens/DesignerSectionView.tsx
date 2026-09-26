import { useMemo, useState } from 'react'
import {
  PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBRadio, PBSelect,
  PBTextArea, PBViewHeader, PBWindow, pbSlug, usePBInstrumentation,
} from '../pb'
import {
  DESIGNER_COMMANDS, DESIGNER_COMMAND_WIDTH, designerScreen,
  type DesignerColumn, type DesignerListScreen, type DesignerNewDialog, type DesignerRow,
} from '../data/designerSection'
import { DesignerDetailWindow, ImportPaperFormsDialog } from './DesignerDetailWindow'
import { useScreenReport } from '../host/screen-state'
import { DesktopLayer } from './StageWindow'

/* ============================================================================
   Administration ▸ Designer Section — the list view ("Skeleton L").

   Eight nodes, one window. The command row is the same buttons in the
   same order on every one of them (five on the current build: New Record,
   Delete Record, Edit Record, Find / Replace, Close Window — user capture
   2026-09-25 #49, #50); the only variables are the view-header
   caption, the column set, the filter set, the detail-band pitch and an
   optional right-anchored Import/Export pair. All of that lives in
   `data/designerSection.ts`, cited capture by capture, so this file is the
   frame and nothing else.

   Nine of the eleven nodes in the tree are handled here. `ad-panel-setup`'s
   list is the user's v02.31.23 capture (#49); its New dialog and detail are
   article 2594035's. `ad-web-forms-admin` and `ad-quick-entry` have no
   capture of their windows, so the frame's labelled fallback is what they
   show.

   The New Record dialog and the detail window are top-level windows: they
   float over the whole MOIS frame, tree included (user capture 2026-09-25
   #51, #52), so both are portalled onto the desktop (StageWindow's
   DesktopLayer) rather than laid over the work area.

   MEASURED vs KIT. Three skeleton values are the kit's rather than the
   capture's, and are not presented as measured:
     - the filter strip paints at the kit's 22px, not the measured 17px;
     - the gutter paints at the kit's fixed 13px, not the measured 16px
       (17px on Letter Templates) — `screen.gutter` records the real figure;
     - `--pb-dw-row-h` sets the detail-band pitch, which also sets the column
       header's, so the header paints at 18/19px rather than the measured
       16px.
   Everything else — column widths, captions, button widths, colours — is as
   measured. The kit's DataWindow already ships the family's palette:
   `#c8dcfa` header, `#ffffff`/`#e8e8e8` bands, `#e89c84` current row.
   ========================================================================= */

/** A blank record, so Create Record can put a row in the list. `__new`
    tells the detail window to open empty rather than on sample rows. */
const blankRow = (columns: DesignerColumn[]): DesignerRow => ({
  ...Object.fromEntries(columns.map((c) => [c.key, c.check ? false : ''])),
  __new: true,
})

/**
 * What the New dialog's fields put on the new row: a field whose label
 * matches a column (Name → name, Concept → concept, Group → group,
 * Description → desc) fills it; Concept Mapping's Classification radio fills
 * Type with GRP or SYM (`f05574eb…`).
 */
function rowFromDialog(columns: DesignerColumn[], values: Record<string, string>, defaults?: DesignerRow): DesignerRow {
  const row = { ...blankRow(columns), ...defaults }
  for (const [label, value] of Object.entries(values)) {
    const key = label.replace(/:$/, '').trim().toLowerCase()
    if (key === 'classification') { row.type = value === 'Synonym' ? 'SYM' : 'GRP'; continue }
    const col = columns.find((c) => c.header.toLowerCase() === key || c.key === key)
    if (col) row[col.key] = value
  }
  return row
}

export function DesignerSectionView({ node, onClose }: { node: string; onClose?: () => void }) {
  const screen = designerScreen(node)
  if (!screen) return null
  return <DesignerList key={screen.node} screen={screen} onClose={onClose} />
}

function DesignerList({ screen, onClose }: { screen: DesignerListScreen; onClose?: () => void }) {
  const host = usePBInstrumentation()
  const [added, setAdded] = useState<DesignerRow[]>([])
  const [filter, setFilter] = useState<Record<string, string>>({})
  const [cur, setCur] = useState(0)
  const [detail, setDetail] = useState<DesignerRow | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  /* the HM Item filter tick (Concept Mapping only) */
  const [onlyTicked, setOnlyTicked] = useState<Record<string, boolean>>({})

  const all = useMemo(() => [...screen.rows, ...added], [screen.rows, added])
  const rows = useMemo(() => all.filter((r) => screen.columns.every((c) => {
    if (c.filterCheck && onlyTicked[c.key]) return Boolean(r[c.key])
    const term = filter[c.key]?.trim().toLowerCase()
    if (!term) return true
    return String(r[c.key] ?? '').toLowerCase().includes(term)
  })), [all, filter, onlyTicked, screen.columns])
  const anchorKey = screen.anchorKey ?? screen.columns[0]!.key
  const rowId = (r: DesignerRow) => {
    const v = String(r[anchorKey] ?? '')
    return v ? pbSlug(v.slice(0, 32)) : ''
  }
  useScreenReport({ rows: all.length, row: rows[cur] ? rowId(rows[cur]!) || null : null })

  /* `Create Record` closes the dialog, puts the row in the list with the
     chevron on it, and opens the detail window on the new record — the
     Concept Mapping capture shows both windows stacked (f05574eb03be), and
     every other article's step list says the detail window opens next. */
  const createRecord = (values: Record<string, string>) => {
    const row = rowFromDialog(screen.columns, values, screen.newRow)
    setAdded((a) => [...a, row])
    setNewOpen(false)
    setCur(all.length)
    setDetail(row)
  }
  const openDetail = (row: DesignerRow) => setDetail(row)

  return (
    <>
      <PBViewHeader title={screen.header} />

      <PBCommandRow
        commands={DESIGNER_COMMANDS.map((label) => ({
          label,
          width: DESIGNER_COMMAND_WIDTH[label],
          onClick:
            label === 'New Record'
              /* two have no New Record dialog, captured or described (Paper
                 Forms, Care Plan Templates), so the button raises nothing
                 there rather than an invented one. Encounter Form's is
                 described by 303174's step list (data/designerSection.ts). */
              ? (screen.newDialog ? () => setNewOpen(true) : undefined)
              : label === 'Edit Record'
                ? () => { const r = rows[cur]; if (r) openDetail(r) }
                : label === 'Close Window' ? () => onClose?.()
                  : undefined,
        }))}
        right={screen.right && (
          /* the block's right edge sits 17px inside the pane's, measured */
          <span className="pb-row" style={{ gap: 0, marginRight: 17 }}>
            {screen.right.map((b) => (
              <button
                key={b.label}
                type="button"
                className="pb-cmdrow__btn"
                /* the right block sizes to its captions, not to the 81px grid */
                style={{ width: b.width }}
                data-tutorial-id={host?.anchor('command', pbSlug(b.label))}
                onClick={() => {
                  host?.report('command', { command: pbSlug(b.label) })
                  /* `Import Paper Forms` is the only one of the six
                     Import/Export dialogs captured anywhere in the corpus;
                     the other five raise nothing rather than a guess. */
                  if (b.label === 'Import Forms') setImportOpen(true)
                }}
              >
                {b.label}
              </button>
            ))}
          </span>
        )}
      />

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={openDetail}
          /* art. 303173: "Double click on the concept" opens the detail window */
          style={{ ['--pb-dw-row-h' as string]: `${screen.pitch}px` }}
          columns={screen.columns.map((c) => ({
            key: c.key,
            header: c.header,
            width: c.width,
            align: c.align,
            dots: c.dots,
            render: c.check
              ? (r: DesignerRow) => <PBCheckbox checked={Boolean(r[c.key])} />
              : (r: DesignerRow) => String(r[c.key] ?? ''),
          }))}
          /* one box per filterable column, pixel-aligned to that column and
             never over the gutter — which is what the `filters` row gives */
          filters={screen.columns.map((c) => (c.filterCheck
            ? (
              <PBCheckbox
                key={c.key}
                checked={Boolean(onlyTicked[c.key])}
                onChange={(v) => { setOnlyTicked({ ...onlyTicked, [c.key]: v }); setCur(0) }}
                tutorialId={`host.mois.field.filter-${pbSlug(c.header)}`}
              />
            )
            : c.filter
            ? (
              <PBInput
                key={c.key}
                data-tutorial-id={`host.mois.field.filter-${pbSlug(c.header)}`}
                value={filter[c.key] ?? ''}
                onChange={(e) => { setFilter({ ...filter, [c.key]: e.target.value }); setCur(0) }}
              />
            )
            : null))}
          rowTutorialId={(r) => (rowId(r) ? `host.mois.row.${rowId(r)}` : undefined)}
          empty="No rows retrieved."
        />
      </div>

      {newOpen && screen.newDialog && (
        <DesignerNewRecordDialog
          dialog={screen.newDialog}
          onCreate={createRecord}
          onClose={() => setNewOpen(false)}
        />
      )}

      {importOpen && (
        <ImportPaperFormsDialog
          onClose={() => setImportOpen(false)}
          /* the imported forms join the list under their original names */
          onImport={(picked) => setAdded((a) => [...a, ...picked.map((r) => ({
            name: String(r.original ?? ''), code: String(r.code ?? ''), desc: String(r.desc ?? ''),
            author: String(r.author ?? ''), group: String(r.group ?? ''),
          }))])}
        />
      )}

      {detail && (
        <DesignerDetailWindow screen={screen} row={detail} onClose={() => setDetail(null)} />
      )}
    </>
  )
}

/* ---------------------------------------------------------------------------
   The New Record dialog.

   Captured for six of the eight nodes (Encounter Form's is user capture
   2026-09-25 #51). One shape: a `#DCD7D2` group band,
   a short stack of fields, and a footer. The band caption is different on
   every one of them and is reproduced verbatim.
   ------------------------------------------------------------------------ */
function DesignerNewRecordDialog({
  dialog, onCreate, onClose,
}: { dialog: DesignerNewDialog; onCreate: (values: Record<string, string>) => void; onClose: () => void }) {
  const host = usePBInstrumentation()
  /* what the learner types or picks, by field label; Create Record hands it on */
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(
    dialog.fields.map((f) => [f.label, 'value' in f && f.value ? f.value : '']),
  ))
  const set = (label: string) => (v: string) => setValues((x) => ({ ...x, [label]: v }))
  useScreenReport({ dialog: pbSlug(dialog.title) })

  return (
    <DesktopLayer>
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      {/* PBWindow does not forward attributes, so the anchor rides a wrapper
          that shrink-wraps the frame — a lesson rings the window, not the layer */}
      <div data-tutorial-id={host?.anchor('dialog', pbSlug(dialog.title))}>
      <PBWindow
        child
        controls={false}
        title={dialog.title}
        onClose={onClose}
        style={{ width: dialog.w, height: dialog.h }}
      >
        {/* #51 insets the band and its fields in an outlined box, with the
            buttons under the box; the older dialogs run the band edge to edge */}
        <div style={dialog.boxed
          ? { flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--pb-face)', padding: '10px 18px 0' }
          : { display: 'contents' }}
        >
        <div style={dialog.boxed ? { border: '1px solid #a0a0a0', display: 'flex', flexDirection: 'column', paddingBottom: 12 } : { display: 'contents' }}>
        <div className="pb-band">{dialog.band}</div>

        <div style={{ flex: dialog.boxed ? 'none' : '1 1 auto', minHeight: 0, overflow: 'auto', background: 'var(--pb-face)' }}>
          <div className="pb-form" style={{ gridTemplateColumns: 'auto 1fr', alignItems: 'start', padding: '8px 10px' }}>
            {dialog.fields.map((f) => (
              f.kind === 'radio'
                ? (
                  <span key={f.label} className="pb-form__full pb-row" style={{ gap: 14 }}>
                    <span className="pb-form__label">{f.label}</span>
                    {f.options.map((o) => (
                      <PBRadio
                        key={o}
                        name={`${pbSlug(dialog.title)}-${pbSlug(f.label)}`}
                        label={o}
                        checked={o === values[f.label]}
                        onChange={() => set(f.label)(o)}
                      />
                    ))}
                  </span>
                )
                : (
                  <span key={f.label} style={{ display: 'contents' }}>
                    <span className="pb-form__label" style={{ lineHeight: '19px' }}>{f.label}</span>
                    {f.kind === 'text' && (
                      <PBInput
                        w={f.w}
                        value={values[f.label] ?? ''}
                        onChange={(e) => set(f.label)(e.target.value)}
                        data-tutorial-id={`host.mois.field.${pbSlug(f.label)}`}
                        /* the focused edit takes MOIS's #FFC09C dirty fill */
                        style={f.focus ? { background: '#ffc09c' } : undefined}
                      />
                    )}
                    {f.kind === 'drop' && (
                      <PBSelect
                        w={f.w}
                        options={f.options}
                        value={values[f.label] ?? ''}
                        onChange={(e) => set(f.label)(e.target.value)}
                        data-tutorial-id={`host.mois.field.${pbSlug(f.label)}`}
                      />
                    )}
                    {f.kind === 'memo' && (
                      <PBTextArea rows={f.rows ?? 3} w="100%" value={values[f.label] ?? ''} onChange={(e) => set(f.label)(e.target.value)} data-tutorial-id={`host.mois.field.${pbSlug(f.label)}`} />
                    )}
                  </span>
                )
            ))}
          </div>
        </div>
        </div>
        </div>

        <div className="pb-footer">
          <span className="pb-footer__spacer" />
          {dialog.buttons.map((b) => (
            <PBButton
              key={b}
              wide
              data-tutorial-id={host?.anchor('command', pbSlug(b))}
              onClick={() => {
                host?.report('command', { command: pbSlug(b) })
                if (b === 'Create Record') onCreate(values)
                else onClose()
              }}
            >
              {b}
            </PBButton>
          ))}
          <span className="pb-footer__spacer" />
        </div>
      </PBWindow>
      </div>
    </div>
    </DesktopLayer>
  )
}
