import { useState } from 'react'
import { chartRowsFor } from '../data/chart-records'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { useEncounterSession } from '../host/encounterArea'
import { useOpenWindow } from './areaWindowRegistry'
import { AttachmentListWindow, useAttachmentLog } from './AttachmentListWindow'
import { PHSA_EFORM_WINDOW, phsaFormFor } from './PhsaEformWindows'
import {
  AFTER_ATTACHING, ATTACH_FILE_MODES,
  type AttachFileMode, type AttachFileRow, type FormLetterRow
} from '../data/chartUtilities'
import { DEFAULT_RECENT_LIMIT, attachFormRowsFor } from '../data/attachFormLetters'
import {
  PBBand, PBButton, PBCheckbox, PBDataWindow, PBInput, PBRadio, PBSelect,
  PBTabs, pbSlug,
} from '../pb'
import { ModalWindow } from './dialogKit'
import { useTickSet } from './listKit'

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

   2026-09-29 TRAINING capture c09 (chart 3924, Attachment on a chart report
   folder, 2x) is the reference for the window as it stands now: 934x732
   with a 29px title bar; the tab strip 23 tall, 5px in and 5px down, both
   captions bold on 125px tabs; one #656565 frame round the band, the filter
   row and the grid; a heart in the filter row's first cell and on every
   row; the recent list at 0, so the grid opens on FORMS; the ruleless 22px
   grid, zebra from the first row, the current row's `>` in the heart cell;
   and the bottom bar's 17px combo box and 22px buttons. Its rows are in
   data/attachFormLetters.ts. c09 shows the recent-list box without spin
   arrows, so it is a plain box here. Tab B is not in c09 and is unchanged
   apart from the shared strip and page.

   Gaps left deliberately (spec §13): the `Select Form / Letter` and
   `Letter Setup` dialogs named in `303790` step 4a were never captured, the
   Attach Form / Letter grid has no column-title cells anywhere in the corpus
   (the filter row is the only header), the Location `...` file picker is not
   shown, and the separate `Document / Attachment List` window that a second
   attachment opens is a different window and is not built here.

   Added for 303793 / 3001611 / 3001613 (stream C2):
   · A record that already carries an attachment opens the Document /
     Attachment List first (screens/AttachmentListWindow.tsx, 303793
     `0f6603c1…png`); its Add Attachment comes back here.
   · The PHSA eFORMS band (data/chartUtilities.ts): Ok on one of its rows
     opens the eForm Browser (screens/PhsaEformWindows.tsx) instead of
     filing a template, the way 3001613 `4399305d…png` and 3001611
     `17e72105…png` go on to the form.
   · An attachment filed on a chart record while an encounter is active (the
     identity strip's Active ENC#, screens/ActiveEncounterWindow.tsx) is
     associated with that encounter (303793 "These files will now be
     associated with the Active Encounter selected").
   ========================================================================= */

const W = 934
const H = 732
const TITLEBAR_H = 29
/** c09: the tab page's bottom edge to the window's bottom border */
const BAR_H = 55

const TAB_FORM = 'Attach Form / Letter'
const TAB_FILE = 'Attach File(s)'

/* --- c09 geometry ----------------------------------------------------------
   Measured off the 2x capture, halved. One frame (1px #656565) holds the
   band, the filter row and the grid; the grid has no column rules and no
   tile inset, and its rows run flush at a 22px pitch. */
const FRAME_LINE = '#656565'
/** filter boxes: the heart cell, then one box per column, 1px apart */
const FILTER = { heart: 24, description: 651, source: 81, docType: 76, spare: 76 }
/** data columns: arrow + heart, then the three the capture fills; the spare
    column (no values in any capture) takes the rest, under the spare box */
const COLS = { heart: 23, description: 650, source: 86, docType: 76 }
/** c09: the heart and expander grey, the band blue, the current-row salmon */
const HEART_GREY = '#9c9c9c'
const GROUP_BLUE = '#a9cef6'
const CURRENT_SALMON = '#e89c84'
const BAND_FACE = '#e0dcd7'

/* The tab labels are both bold in c09, and the two tabs are the same 125px.
   The page hangs from the strip with a #dadada hairline on its other sides. */
const SCOPE = 'pb-add-attachment'
const SCOPED_CSS = `
.${SCOPE} .pb-tabs__tab { font-weight: 700; min-width: 125px; padding: 0; }
.${SCOPE} .pb-tabs__page { border: 1px solid var(--pb-tab-line); border-top: 0; }
.${SCOPE} .pb-attach-forms .pb-dw__table > tbody > tr.pb-dw__group td { padding-left: 12px; border-bottom: 0; }
.${SCOPE} .pb-attach-forms .pb-dw__groupcell { gap: 3px; }
/* the grid's text runs ~7% wider than the kit's at the same cap height */
.${SCOPE} .pb-attach-forms .pb-dw__table > tbody > tr > td { letter-spacing: .4px; }
`

/** The favourite heart — grey on every row in c09. No kit glyph carries it. */
function Heart({ on }: { on?: boolean }) {
  return (
    <svg width="10" height="9" viewBox="0 0 10 9" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <path
        d="M5 8.6 L1 4.7 A2.3 2.3 0 0 1 5 1.7 A2.3 2.3 0 0 1 9 4.7 Z"
        /* the red of a favourited row is INFERRED: c09 has none */
        fill={on ? '#c02020' : HEART_GREY}
      />
    </svg>
  )
}

/** The current-row chevron, which c09 paints in the heart cell's left edge. */
const ROW_ARROW = (
  <svg width="5" height="8" viewBox="0 0 5 8" aria-hidden="true" style={{ display: 'block' }}>
    <path d="M1 1 L3.9 4 L1 7" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </svg>
)

/* --- Tab A ----------------------------------------------------------------
   One filter box per data column. The heart cell carries a heart and no box.
   There are no column-title cells: this row is the header. */
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
    <div className="pb-row" style={{ gap: 1, flex: 'none', padding: '3px 0', alignItems: 'center' }}>
      <span style={{ width: FILTER.heart - 1, flex: 'none', display: 'flex', paddingLeft: 9 }}>
        <Heart />
      </span>
      {box('description', FILTER.description)}
      {box('source', FILTER.source)}
      {box('doc-type', FILTER.docType)}
      {box('spare', FILTER.spare)}
    </div>
  )
}

function AttachFormTab({ recentLimit, onRecentLimit, onPick }: {
  recentLimit: number
  onRecentLimit: (v: number) => void
  /** the row the cursor is on, for Ok */
  onPick?: (row: FormLetterRow | undefined) => void
}) {
  const rows = attachFormRowsFor(recentLimit)
  const [current, setCurrentRow] = useState(0)
  const setCurrent = (i: number) => { setCurrentRow(i); onPick?.(rows[i]) }
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  /* which rows carry a red heart is not shown in any capture, so none do */
  const favourites = useTickSet<string>()

  const key = (r: FormLetterRow) => `${r.group}:${r.description}`
  const toggleFavourite = (r: FormLetterRow) => favourites.flip(key(r))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: '4px 3px 6px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: `1px solid ${FRAME_LINE}` }}>
        <div
          style={{
            ['--pb-band' as string]: BAND_FACE, ['--pb-band-h' as string]: '21px',
            flex: 'none', borderBottom: `1px solid ${FRAME_LINE}`,
          }}
        >
          <PBBand
            right={(
              <span className="pb-row" style={{ gap: 8, fontWeight: 400, marginRight: -2 }}>
                <span>Maximum Items in Your Recent List:</span>
                {/* c09 paints a plain box here, no spin arrows */}
                <PBInput
                  w={37}
                  align="center"
                  inputMode="numeric"
                  value={String(recentLimit)}
                  data-tutorial-id="host.mois.field.attach-recent-limit"
                  style={{ height: 17 }}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value.replace(/\D/g, '') || '0', 10)
                    const limit = Number.isFinite(n) ? n : 0
                    onRecentLimit(limit)
                    setCurrentRow(0)
                    onPick?.(attachFormRowsFor(limit)[0])
                  }}
                />
              </span>
            )}
          >
            Select Form / Letter
          </PBBand>
        </div>

        <FilterRow />

        <div className="pb-attach-forms" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBDataWindow
            rows={rows}
            current={current}
            onCurrentChange={setCurrent}
            gutter={false}
            head={false}
            groupBy={(r) => r.group}
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            groupTutorialId={(g) => `host.mois.group.${pbSlug(g)}`}
            rowTutorialId={(r) => `host.mois.row.form-${pbSlug(r.description)}`}
            /* c09 bands the rows by their place in the list: the first grey,
               the second white, and so on (the first is under the salmon) */
            rowFill={(_r, i) => (i % 2 === 0 ? '#e6e6e6' : '#ffffff')}
            columns={[
              {
                key: 'favourite',
                header: '',
                width: COLS.heart,
                render: (r, i) => (
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ width: 9, flex: 'none' }}>{i === current ? ROW_ARROW : null}</span>
                    <button
                      type="button"
                      style={{ border: 0, background: 'none', padding: 0, cursor: 'default', display: 'flex' }}
                      onClick={() => toggleFavourite(r)}
                      aria-label="Favourite"
                      aria-pressed={favourites.has(key(r))}
                    >
                      <Heart on={favourites.has(key(r))} />
                    </button>
                  </span>
                ),
              },
              {
                key: 'description',
                header: '',
                width: COLS.description,
                /* the current row's text sits 3px further in (c09) */
                render: (r, i) => <span style={{ paddingLeft: i === current ? 3 : 0 }}>{r.description}</span>,
              },
              { key: 'source', header: '', width: COLS.source },
              { key: 'docType', header: '', width: COLS.docType },
              { key: 'spare', header: '' },
            ]}
            style={{
              flex: '1 1 auto', minWidth: 0,
              border: 0, borderTop: `1px solid ${FRAME_LINE}`,
              ['--pb-dw-row-h' as string]: '22px',
              ['--pb-dw-pad-x' as string]: '2px',
              ['--pb-dw-cell-gap' as string]: '0px',
              ['--pb-dw-line-soft' as string]: 'transparent',
              ['--pb-dw-line' as string]: 'transparent',
              ['--pb-dw-group' as string]: GROUP_BLUE,
              ['--pb-dw-select' as string]: CURRENT_SALMON,
            }}
          />
        </div>
      </div>
    </div>
  )
}

/* --- Tab B --------------------------------------------------------------- */
function AttachFileTab({ mode, onMode }: { mode: AttachFileMode; onMode: (m: AttachFileMode) => void }) {
  /* a blank spare row carrying only the `...` sits under the last populated
     row, which is how MOIS offers the next file */
  const [rows, setRows] = useState<AttachFileRow[]>(
    () => [{ location: '', note: '', clip: '' }],
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

export function AddAttachmentDialog({ onOk, onClose, target }: {
  /** Ok — the caller bumps the source row's paper-clip count */
  onOk?: (after: string) => void
  onClose: () => void
  /** the record the attachment hangs from (`encounter:<id>`); defaults to
      the row the folder behind had current when Attachment was pressed */
  target?: string
}) {
  /* Ok files the attachment: the source row's paper-clip count goes up
     (303793) — kept in the frame's session copy (host/encounterArea) */
  const encounters = useEncounterSession()
  const attachTo = target ?? encounters.session.attachTarget
  const { chart } = usePatient()
  const openWindow = useOpenWindow()
  const [log, setLog] = useAttachmentLog(attachTo)
  const [picked, setPicked] = useState<FormLetterRow | undefined>(() => attachFormRowsFor(DEFAULT_RECENT_LIMIT)[0])
  /* what the chart export already counts on an encounter row's paper clip */
  const exported = attachTo?.startsWith('encounter:')
    ? Number(chartRowsFor(chart, 'encounters').find((r) => `encounter:${r.id}` === attachTo)?.attach) || 0
    : 0
  const existing = exported + (attachTo ? encounters.session.attachments[attachTo] ?? 0 : 0)
  const [stage, setStage] = useState<'list' | 'add'>(() => (existing > 0 ? 'list' : 'add'))
  const file = () => {
    /* a PHSA eFORM is filled in the eForm Browser, which files it on Submit */
    if (tab === TAB_FORM && picked?.group === 'PHSA eFORMS') {
      openWindow(PHSA_EFORM_WINDOW, { form: phsaFormFor(picked.description), target: attachTo })
      onOk?.(after)
      return
    }
    if (attachTo) {
      const active = encounters.activeEncounter
      encounters.update((s) => ({
        ...s,
        attachments: { ...s.attachments, [attachTo]: (s.attachments[attachTo] ?? 0) + 1 },
        ...(active && !attachTo.startsWith('encounter:')
          ? { attachmentEncounters: { ...(s.attachmentEncounters ?? {}), [attachTo]: active } }
          : {}),
      }))
      setLog([...log, {
        date: MOIS_TODAY, author: '', docType: tab === TAB_FORM ? 'PAPER FORM' : 'ATTACHMENT',
        note: tab === TAB_FORM ? picked?.description ?? '' : '', file: '',
      }])
    }
    onOk?.(after)
  }
  const [tab, setTab] = useState(TAB_FORM)
  const [recentLimit, setRecentLimit] = useState(DEFAULT_RECENT_LIMIT)
  const [mode, setMode] = useState<AttachFileMode>('Copy Original File(s)')
  const [after, setAfter] = useState(AFTER_ATTACHING[0])
  const [saveChoice, setSaveChoice] = useState(false)

  if (stage === 'list') {
    return <AttachmentListWindow target={attachTo} exported={exported} onAddAttachment={() => setStage('add')} onClose={onClose} />
  }

  return (
    <ModalWindow
      title="Add Attachment"
      onClose={onClose}
      zIndex={80}
      windowStyle={{ width: W, height: H, ['--pb-titlebar-h' as string]: `${TITLEBAR_H}px` }}
    >
      <div
        data-tutorial-id="host.mois.dialog.add-attachment"
        className={SCOPE}
        style={{
          display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0,
          background: 'var(--pb-face)',
          /* c09: the strip stands 5px under the title bar and 5px in from
             either side, and is 23 tall (the selected tab; the other 21) */
          padding: '5px 5px 0',
          ['--pb-tabstrip-h' as string]: '23px',
        }}
      >
        <style>{SCOPED_CSS}</style>
        <PBTabs tabs={[TAB_FORM, TAB_FILE]} active={tab} onChange={setTab} face>
          {tab === TAB_FORM
            ? <AttachFormTab recentLimit={recentLimit} onRecentLimit={setRecentLimit} onPick={setPicked} />
            : <AttachFileTab mode={mode} onMode={setMode} />}
        </PBTabs>

        {/* --- the window's bottom bar, outside both tabs (c09) --- */}
        <div style={{ position: 'relative', flex: 'none', height: BAR_H, margin: '0 -5px' }}>
          <span className="pb-form__label" style={{ position: 'absolute', left: 5, top: 11 }}>
            After Attaching:
          </span>
          <span style={{ position: 'absolute', left: 84, top: 10, ['--pb-row-h' as string]: '17px' }}>
            <PBSelect
              w={163}
              options={AFTER_ATTACHING}
              value={after}
              data-tutorial-id="host.mois.field.after-attaching"
              onChange={(e) => setAfter(e.target.value)}
            />
          </span>
          <span style={{ position: 'absolute', left: 85, top: 26 }}>
            <PBCheckbox label="Save Choice" checked={saveChoice} onChange={setSaveChoice} />
          </span>
          <span style={{ position: 'absolute', left: 382, top: 17 }}>
            <PBButton
              style={{ width: 75, height: 22, minWidth: 0 }}
              command="add-attachment-ok"
              onClick={file}
            >
              Ok
            </PBButton>
          </span>
          <span style={{ position: 'absolute', left: 462, top: 17 }}>
            <PBButton
              style={{ width: 75, height: 22, minWidth: 0 }}
              command="add-attachment-cancel"
              onClick={onClose}
            >
              Cancel
            </PBButton>
          </span>
        </div>
      </div>
    </ModalWindow>
  )
}
