import { useState } from 'react'
import {
  PBBand, PBButton, PBCheckbox, PBDataWindow, PBInput, PBRadio, PBSelect, PBSpinner,
  PBTabs, PBWindow, pbSlug,
} from '../pb'
import {
  AFTER_ATTACHING, ATTACH_FILE_MODES, FORM_LETTER_GROUPS, FORM_LETTER_WIDTHS,
  attachFileRows, formLetterRows,
  type AttachFileMode, type AttachFileRow, type FormLetterRow,
} from '../data/chartUtilities'

/* ============================================================================
   Add Attachment.

   Reached from the Encounter detail window's `Action` menu, from a
   right-click on a Scheduler or Encounters row, from the paper-clip cell on
   such a row, and from the Patient Chart's Taskbar `Attachment` button with a
   record highlighted. All of them open this one window.

   Two tabs: a form or letter template out of the library, or files off disk.
   Attaching also creates a record in the Documents folder, and the source
   row's paper-clip cell goes from `-` to the attachment count.

   PROVENANCE: `303790 / c4c825549fd1` @1.00x is the canonical capture
   (window x 371–1300, y 133–863; flat white title bar 27 tall). Tab B is
   `303790 / 2cb9854773cc`, 934x169 at ≈1.02x — a 2% overshoot the report
   leaves in its figures, so the widths below are the capture's rather than
   divided down. The XP-era build `303803 / 22f5f74485c3` labels the second
   tab `Attach File` (singular); the current build's plural is used here.

   Gaps left deliberately (spec §13): the `Select Form / Letter` and
   `Letter Setup` dialogs named in `303790` step 4a were never captured, the
   Attach Form / Letter grid has no column-title cells anywhere in the corpus
   (the filter row is the only header), the Location `...` file picker is not
   shown, and the separate `Document / Attachment List` window that a second
   attachment opens is a different window and is not built here.
   ========================================================================= */

const W = 930
const H = 731
const TITLEBAR_H = 27

/** capture y → client y */
const y = (captureY: number) => captureY - 161

const TAB_FORM = 'Attach Form / Letter'
const TAB_FILE = 'Attach File(s)'

/* --- Tab A ----------------------------------------------------------------
   One filter box per data column, sized off `c4c825549fd1`. The heart gutter
   carries no box. There are no column-title cells: this row is the header. */
function FilterRow() {
  const box = (key: string, width: number) => (
    <PBInput
      key={key}
      w={width}
      data-tutorial-id={`host.mois.field.attach-filter-${key}`}
      style={{ height: 17, borderColor: '#abadb3' }}
    />
  )
  return (
    <div className="pb-row" style={{ gap: 2, flex: 'none', padding: '4px 0' }}>
      <span style={{ width: FORM_LETTER_WIDTHS.favourite, flex: 'none' }} />
      {box('description', FORM_LETTER_WIDTHS.description)}
      {box('source', FORM_LETTER_WIDTHS.source)}
      {box('doc-type', FORM_LETTER_WIDTHS.docType)}
      {box('spare', FORM_LETTER_WIDTHS.spare)}
    </div>
  )
}

function AttachFormTab({ recentLimit, onRecentLimit }: {
  recentLimit: number
  onRecentLimit: (v: number) => void
}) {
  const [current, setCurrent] = useState(0)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  /* which rows carry the heart is not shown in any capture, so none do */
  const [favourites, setFavourites] = useState<Set<string>>(new Set())

  const key = (r: FormLetterRow) => `${r.group}:${r.description}`
  const toggleFavourite = (r: FormLetterRow) => setFavourites((prev) => {
    const next = new Set(prev)
    next.has(key(r)) ? next.delete(key(r)) : next.add(key(r))
    return next
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: '6px 8px 8px' }}>
      <div style={{ ['--pb-band' as string]: '#dcd7d2', ['--pb-band-h' as string]: '21px', flex: 'none' }}>
        <PBBand
          right={(
            <span className="pb-row" style={{ gap: 6 }}>
              <span>Maximum Items in Your Recent List:</span>
              <PBSpinner w={44} align="center" min={0} value={recentLimit} onChange={onRecentLimit} />
            </span>
          )}
        >
          Select Form / Letter
        </PBBand>
      </div>

      <FilterRow />

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          rows={formLetterRows}
          current={current}
          onCurrentChange={setCurrent}
          gutter={false}
          head={false}
          groupBy={(r) => r.group}
          groups={FORM_LETTER_GROUPS}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          groupTutorialId={(g) => `host.mois.group.${pbSlug(g)}`}
          rowTutorialId={(r) => `host.mois.row.form-${pbSlug(r.description)}`}
          columns={[
            {
              key: 'favourite',
              header: '',
              width: FORM_LETTER_WIDTHS.favourite,
              align: 'center',
              render: (r) => (
                <button
                  type="button"
                  style={{
                    border: 0, background: 'none', padding: 0, font: 'inherit', cursor: 'default',
                    color: favourites.has(key(r)) ? '#c02020' : '#909090',
                  }}
                  onClick={() => toggleFavourite(r)}
                  aria-label="Favourite"
                >
                  {favourites.has(key(r)) ? '♥' : '♡'}
                </button>
              ),
            },
            { key: 'description', header: '', width: FORM_LETTER_WIDTHS.description },
            { key: 'source', header: '', width: FORM_LETTER_WIDTHS.source },
            { key: 'docType', header: '', width: FORM_LETTER_WIDTHS.docType },
            { key: 'spare', header: '', width: FORM_LETTER_WIDTHS.spare },
          ]}
          style={{
            flex: '1 1 auto', minWidth: 0,
            /* the tree-grid runs a 22px pitch, and its two band rows are
               #A6CAF0 rather than the kit's pale blue */
            ['--pb-dw-row-h' as string]: '22px',
            ['--pb-dw-group' as string]: '#a6caf0',
            ['--pb-dw-row-alt' as string]: '#e6e6e6',
          }}
        />
      </div>
    </div>
  )
}

/* --- Tab B --------------------------------------------------------------- */
function AttachFileTab({ mode, onMode }: { mode: AttachFileMode; onMode: (m: AttachFileMode) => void }) {
  /* a blank spare row carrying only the `...` sits under the last populated
     row, which is how MOIS offers the next file */
  const [rows, setRows] = useState<AttachFileRow[]>(
    () => [...attachFileRows, { location: '', note: '', clip: '' }],
  )
  const [current, setCurrent] = useState(0)

  const setNote = (i: number, note: string) =>
    setRows((all) => all.map((r, j) => (j === i ? { ...r, note } : r)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: '6px 8px 8px' }}>
      <div style={{ ['--pb-band' as string]: '#dcd7d2', ['--pb-band-h' as string]: '21px', flex: 'none' }}>
        <PBBand>Attach File(s)</PBBand>
      </div>

      {/* `Would you like to  ( ) Move Original File(s)  (o) Copy Original
          File(s)` — Copy is the default. Move deletes the original once it is
          attached; Copy leaves it where it is. The circles are measured at
          x 126 and 272 on a ≈1.02x crop, so they are laid out in flow here
          rather than pinned to those stops. */}
      <div className="pb-row" style={{ gap: 14, flex: 'none', padding: '8px 4px' }}>
        <span>Would you like to</span>
        {ATTACH_FILE_MODES.map((m) => (
          <PBRadio
            key={m}
            name="attach-file-mode"
            label={m}
            checked={mode === m}
            onChange={() => onMode(m)}
          />
        ))}
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          rows={rows}
          current={current}
          onCurrentChange={setCurrent}
          rowTutorialId={(_r, i) => `host.mois.row.attach-file-${i}`}
          columns={[
            { key: 'location', header: 'Location', width: 432 },
            /* opens the file picker; that picker is not in the corpus, so
               this one opens nothing */
            { key: 'pick', header: '', width: 16, dots: true },
            {
              key: 'note',
              header: 'Note',
              width: 429,
              /* editable: it renames the file as it appears in Documents */
              render: (r, i) => (
                <span style={{ display: 'block', ['--pb-row-h' as string]: '14px' }}>
                  <PBInput
                    w="100%"
                    value={r.note}
                    data-tutorial-id={`host.mois.cell.note-${i}`}
                    onChange={(e) => setNote(i, e.target.value)}
                  />
                </span>
              ),
            },
            { key: 'clip', header: '\u{1F4CE}', width: 17, align: 'center' },
          ]}
          style={{
            flex: '1 1 auto', minWidth: 0,
            /* header band 17, detail band 16 — one variable drives both here,
               so the header is drawn at 16 */
            ['--pb-dw-row-h' as string]: '16px',
          }}
        />
      </div>
    </div>
  )
}

export function AddAttachmentDialog({ onOk, onClose }: {
  /** Ok — the caller bumps the source row's paper-clip count */
  onOk?: (after: string) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState(TAB_FORM)
  const [recentLimit, setRecentLimit] = useState(10)
  const [mode, setMode] = useState<AttachFileMode>('Copy Original File(s)')
  const [after, setAfter] = useState(AFTER_ATTACHING[0])
  const [saveChoice, setSaveChoice] = useState(false)

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <PBWindow
        child
        controls={false}
        title="Add Attachment"
        onClose={onClose}
        style={{ width: W, height: H, ['--pb-titlebar-h' as string]: `${TITLEBAR_H}px` }}
      >
        <div
          data-tutorial-id="host.mois.dialog.add-attachment"
          style={{
            display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0,
            background: 'var(--pb-face)',
            /* the tab strip is 32 tall here, not the chart windows' 24 */
            ['--pb-tabstrip-h' as string]: '32px',
          }}
        >
          <PBTabs tabs={[TAB_FORM, TAB_FILE]} active={tab} onChange={setTab} face>
            {tab === TAB_FORM
              ? <AttachFormTab recentLimit={recentLimit} onRecentLimit={setRecentLimit} />
              : <AttachFileTab mode={mode} onMode={setMode} />}
          </PBTabs>

          {/* --- the window's bottom bar, outside both tabs --- */}
          <div style={{ position: 'relative', flex: 'none', height: y(863) - y(809) }}>
            <span className="pb-form__label" style={{ position: 'absolute', left: 0, top: 10 }}>
              After Attaching:
            </span>
            <span style={{ position: 'absolute', left: 84, top: 8 }}>
              <PBSelect
                w={163}
                options={AFTER_ATTACHING}
                value={after}
                data-tutorial-id="host.mois.field.after-attaching"
                onChange={(e) => setAfter(e.target.value)}
              />
            </span>
            <span style={{ position: 'absolute', left: 87, top: 29 }}>
              <PBCheckbox label="Save Choice" checked={saveChoice} onChange={setSaveChoice} />
            </span>
            <span style={{ position: 'absolute', left: 382, top: 14 }}>
              <PBButton
                style={{ width: 75, height: 25, minWidth: 0 }}
                data-tutorial-id="host.mois.command.add-attachment-ok"
                onClick={() => onOk?.(after)}
              >
                Ok
              </PBButton>
            </span>
            <span style={{ position: 'absolute', left: 462, top: 14 }}>
              <PBButton
                style={{ width: 75, height: 25, minWidth: 0 }}
                data-tutorial-id="host.mois.command.add-attachment-cancel"
                onClick={onClose}
              >
                Cancel
              </PBButton>
            </span>
          </div>
        </div>
      </PBWindow>
    </div>
  )
}
