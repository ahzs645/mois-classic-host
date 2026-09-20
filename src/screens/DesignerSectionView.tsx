import { useMemo, useState } from 'react'
import {
  PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBRadio, PBSelect,
  PBTextArea, PBViewHeader, PBWindow, pbSlug, usePBInstrumentation,
} from '../pb'
import {
  DESIGNER_COMMANDS, designerScreen,
  type DesignerColumn, type DesignerListScreen, type DesignerNewDialog, type DesignerRow,
} from '../data/designerSection'
import { DesignerDetailWindow, ImportPaperFormsDialog } from './DesignerDetailWindow'

/* ============================================================================
   Administration ▸ Designer Section — the list view ("Skeleton L").

   Eight nodes, one window. The command row is the same four buttons in the
   same order on every one of them; the only variables are the view-header
   caption, the column set, the filter set, the detail-band pitch and an
   optional right-anchored Import/Export pair. All of that lives in
   `data/designerSection.ts`, cited capture by capture, so this file is the
   frame and nothing else.

   Two nodes of the ten in the tree are NOT handled here — `ad-panel-setup`
   and `ad-quick-entry`. Neither has a capture anywhere in the corpus, so the
   frame's labelled fallback is what they should show.

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

/** A blank record, so Create Record can put a row in the list. */
const blankRow = (columns: DesignerColumn[]): DesignerRow =>
  Object.fromEntries(columns.map((c) => [c.key, c.check ? false : '']))

export function DesignerSectionView({ node }: { node: string }) {
  const screen = designerScreen(node)
  if (!screen) return null
  return <DesignerList key={screen.node} screen={screen} />
}

function DesignerList({ screen }: { screen: DesignerListScreen }) {
  const host = usePBInstrumentation()
  const [added, setAdded] = useState<DesignerRow[]>([])
  const [filter, setFilter] = useState<Record<string, string>>({})
  const [cur, setCur] = useState(0)
  const [detail, setDetail] = useState<DesignerRow | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const all = useMemo(() => [...screen.rows, ...added], [screen.rows, added])
  const rows = useMemo(() => all.filter((r) => screen.columns.every((c) => {
    const term = filter[c.key]?.trim().toLowerCase()
    if (!term) return true
    return String(r[c.key] ?? '').toLowerCase().includes(term)
  })), [all, filter, screen.columns])

  /* `Create Record` closes the dialog, puts the row in the list with the
     chevron on it, and opens the detail window on the new record — the
     Concept Mapping capture shows both windows stacked (f05574eb03be), and
     every other article's step list says the detail window opens next. */
  const createRecord = () => {
    const row = blankRow(screen.columns)
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
          onClick:
            label === 'New Record'
              /* three of the eight have no captured New Record dialog
                 (Encounter Form, Paper Forms, Care Plan Templates), so the
                 button raises nothing there rather than an invented one */
              ? (screen.newDialog ? () => setNewOpen(true) : undefined)
              : label === 'Edit Record'
                ? () => { const r = rows[cur]; if (r) openDetail(r) }
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
          filters={screen.columns.map((c) => (c.filter
            ? (
              <PBInput
                key={c.key}
                data-tutorial-id={`host.mois.field.filter-${pbSlug(c.header)}`}
                value={filter[c.key] ?? ''}
                onChange={(e) => { setFilter({ ...filter, [c.key]: e.target.value }); setCur(0) }}
              />
            )
            : null))}
          rowTutorialId={(r) => {
            const first = String(r[screen.columns[0]!.key] ?? '')
            return first ? `host.mois.row.${pbSlug(first.slice(0, 32))}` : undefined
          }}
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

      {importOpen && <ImportPaperFormsDialog onClose={() => setImportOpen(false)} />}

      {detail && (
        <DesignerDetailWindow screen={screen} row={detail} onClose={() => setDetail(null)} />
      )}
    </>
  )
}

/* ---------------------------------------------------------------------------
   The New Record dialog.

   Captured for five of the eight nodes. One shape: a `#DCD7D2` group band,
   a short stack of fields, and a footer. The band caption is different on
   every one of them and is reproduced verbatim.
   ------------------------------------------------------------------------ */
function DesignerNewRecordDialog({
  dialog, onCreate, onClose,
}: { dialog: DesignerNewDialog; onCreate: () => void; onClose: () => void }) {
  const host = usePBInstrumentation()

  return (
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
        <div className="pb-band">{dialog.band}</div>

        <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: 'var(--pb-face)' }}>
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
                        checked={o === f.value}
                        onChange={() => {}}
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
                        defaultValue={f.value}
                        data-tutorial-id={`host.mois.field.${pbSlug(f.label)}`}
                        /* the focused edit takes MOIS's #FFC09C dirty fill */
                        style={f.focus ? { background: '#ffc09c' } : undefined}
                      />
                    )}
                    {f.kind === 'drop' && (
                      <PBSelect
                        w={f.w}
                        options={f.options}
                        defaultValue={f.value}
                        data-tutorial-id={`host.mois.field.${pbSlug(f.label)}`}
                      />
                    )}
                    {f.kind === 'memo' && (
                      <PBTextArea rows={f.rows ?? 3} w="100%" data-tutorial-id={`host.mois.field.${pbSlug(f.label)}`} />
                    )}
                  </span>
                )
            ))}
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
                if (b === 'Create Record') onCreate()
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
  )
}
