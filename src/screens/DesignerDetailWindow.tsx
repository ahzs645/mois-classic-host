import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  PBButton, PBCheckbox, PBDataWindow, PBInput, PBLookup, PBRadio, PBSelect,
  PBTabs, PBTextArea, PBWindow, pbSlug, usePBInstrumentation,
} from '../pb'
import {
  CARE_PLAN_COLUMNS, CARE_PLAN_ROWS,
  CONCEPT_CODE_RULE_COLUMNS, CONCEPT_HM_CAPTION,
  CONCEPT_HM_WARNING, CONCEPT_TEXT_RULE_COLUMNS, conceptRules,
  DETAIL_FOOTERS,
  ENCOUNTER_DATA_TYPES, ENCOUNTER_ELEMENT_COLUMNS, ENCOUNTER_ELEMENT_ROWS,
  ENCOUNTER_FORM_TABS, ENCOUNTER_GROUP_COLUMNS, ENCOUNTER_GROUP_ROWS,
  ENCOUNTER_REFERENCE_COLUMNS, ENCOUNTER_REFERENCE_NOTE, ENCOUNTER_REFERENCE_ROWS,
  ENCOUNTER_VERSION_COLUMNS, ENCOUNTER_VERSION_ROWS,
  FLOWSHEET_ELEMENT_COLUMNS, FLOWSHEET_ELEMENT_ROWS, FLOWSHEET_SOURCES,
  FLOWSHEET_SOURCE_TYPES,
  MEASUREMENT_ELEMENT_COLUMNS, MEASUREMENT_ELEMENT_ROWS,
  NEW_LETTER_OPTIONS,
  PANEL_ITEM_COLUMNS, PANEL_ITEMS,
  PAPER_FIELD_COLUMNS, PAPER_FIELD_ROWS, PAPER_IMPORT_COLUMNS, PAPER_IMPORT_ROWS,
  TASK_DUE_UNITS, TASK_PRIORITIES, TASK_SET_ROWS,
  type DesignerColumn, type DesignerListScreen, type DesignerRow,
} from '../data/designerSection'
import { determinantTabs } from '../data/mois'
import { useScreenReport } from '../host/screen-state'
import { MoisViewerWindow } from './MoisViewerWindow'

/* ============================================================================
   Administration ▸ Designer Section — the detail windows ("Skeleton D").

   Not an in-pane detail pane: a separate top-level window opened over the
   list. Seven of the eight nodes share the frame — title bar, an optional
   navy band, a grey header form, one or more `#DCD7D2` group bands with
   their button strips, a grid, and a centred footer — but their bodies are
   genuinely different windows rather than one skinned one, which is why the
   frame below is shared and the bodies are not.

   Letter Template Detail is the eighth and breaks the skeleton outright: no
   navy band, no grid, no band-and-strip, and a two-button footer.

   The footer set is the cleanest per-node discriminator, so it is what the
   caller passes in. See `data/designerSection.ts` for the citations.

   `Preview Form` opens the MOIS Viewer (screens/MoisViewerWindow.tsx), from
   article 304734's captures and 303327's field-numbered preview.

   NOT BUILT, deliberately:
     - The MOIS Letter Writer behind `New Letter`. Never visually read.
     - `Import Concepts` / `Export Concepts` / `Import Flowsheets` /
       `Export Flowsheets` / `Export Forms`. No dialog capture exists for any
       of the five; only `Import Paper Forms` was captured.

   A NOTE ON THE NAVY BAND. The skeleton sketch says 5 of 7 detail windows
   carry it; the per-node measurements name only 4 (Concept Mapping, Paper
   Form, Care Plan Tag Template, Task Set). The per-node figures are the ones
   followed here.

   A NOTE ON THE BAND FILL. The captures give `#DCD7D2`; the kit's own
   `--pb-band` token is `#dad5d1`. The measured value is used, per the
   spec.

   THREE VALUES STAY THE KIT'S, each within a unit or two of the measured
   figure, and none of them is presented here as measured: the window face is
   `--pb-face` `#efefef` against a measured `#F0F0F0`; the navy band is
   `--pb-navy` `#004081` against a measured `#004080`; and the tab strip is
   `--pb-tabstrip-h` 24px against a measured 25px.
   ========================================================================= */

/** The measured group-band fill, which is a shade off the kit's token. */
const BAND = '#dcd7d2'
/** The vertical/horizontal rules PowerBuilder draws around these bands. */
const RULE = '#646464'

/* ---------------------------------------------------------------------------
   Shared frame pieces
   ------------------------------------------------------------------------ */

/** A band button: `New Rule`, `New Element`, `New Row`, `Delete …`. */
function BandButton({ label, width, onPress }: { label: string; width: number; onPress?: () => void }) {
  const host = usePBInstrumentation()
  return (
    <button
      type="button"
      className="pb-btn pb-btn--sm"
      style={{ width }}
      data-tutorial-id={host?.anchor('command', pbSlug(label))}
      onClick={() => { host?.report('command', { command: pbSlug(label) }); onPress?.() }}
    >
      {label}
    </button>
  )
}

export type BandCommand = { label: string; width: number; onPress?: () => void }

/**
 * Variant A — the buttons sit RIGHT-anchored inside the 20–21px band itself.
 * Encounter Form, Flowsheet, Measurement Input.
 */
function BandA({ caption, buttons, h = 21 }: { caption: string; buttons?: BandCommand[]; h?: number }) {
  return (
    <div
      className="pb-band"
      style={{ background: BAND, height: h, minHeight: h, borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}` }}
    >
      <span>{caption}</span>
      <span className="pb-band__spacer" />
      {buttons?.map((b) => <BandButton key={b.label} label={b.label} width={b.width} onPress={b.onPress} />)}
    </div>
  )
}

/**
 * Variant B — the band, then a SECOND 20px `#DCD7D2` strip below it whose
 * buttons are LEFT-anchored. Concept Mapping, Care Plan, Task Set.
 */
function BandB({ caption, buttons, h = 20 }: { caption: string; buttons: BandCommand[]; h?: number }) {
  return (
    <>
      <div
        className="pb-band"
        style={{ background: BAND, height: h, minHeight: h, borderTop: `1px solid ${RULE}` }}
      >
        {caption}
      </div>
      <div
        className="pb-row"
        style={{ background: BAND, height: 20, gap: 0, padding: '0 1px', flex: 'none', borderBottom: `1px solid ${RULE}` }}
      >
        {buttons.map((b) => <BandButton key={b.label} label={b.label} width={b.width} onPress={b.onPress} />)}
      </div>
    </>
  )
}

/** The window frame: title bar, optional navy band, body, centred footer. */
function DetailFrame({
  title, navy, w, h, footer, onClose, children,
}: {
  title: string
  /** the `#004080` band caption, on the four windows that carry one */
  navy?: string
  w: number
  h: number
  footer: readonly string[]
  onClose: () => void
  children: ReactNode
}) {
  const host = usePBInstrumentation()
  useScreenReport({ dialog: pbSlug(title) })
  return (
    /* one track the size of the work area: without it the grid's implicit
       track grows to the window's measured width, the `100%` maxima below
       resolve against that, and a window measured wider or taller than the
       stage (Paper Form, Panel Setup) runs off it with its footer */
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 60, gridTemplateColumns: 'minmax(0, 1fr)', gridTemplateRows: 'minmax(0, 1fr)' }}>
      {/* PBWindow does not forward attributes, so the window's anchor rides a
          wrapper that shrink-wraps it rather than the whole modal layer. The
          wrapper is clamped to the work area too, so a window measured
          larger than the stage keeps its footer and right edge on screen. */}
      <div data-tutorial-id={host?.anchor('dialog', pbSlug(title))} style={{ maxWidth: '100%', maxHeight: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* `w` x `h` is the window's painted size, measured. The two maxima
            are the emulator's, not MOIS's: a real PB window would run off the
            frame, and clamping keeps the footer reachable in the work area. */}
        <PBWindow
          child
          controls={false}
          title={title}
          onClose={onClose}
          /* a column-flex item that may shrink: `maxHeight: 100%` alone never
             applied, the wrapper's height being indefinite */
          style={{ width: w, height: h, maxWidth: '100%', flex: '0 1 auto', minHeight: 0 }}
        >
          {/* 25px, `#004080`, caption inset 8px — the same band the list view
              paints, reused here as the window's own title band */}
          {navy && <div className="pb-viewhead"><span className="pb-viewhead__title">{navy}</span></div>}
          <div style={{ flex: '1 1 auto', minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--pb-face)', overflow: 'hidden' }}>
            {children}
          </div>
          <div className="pb-footer">
            <span className="pb-footer__spacer" />
            {footer.map((b) => (
              <FooterButton key={b} label={b} onClose={onClose} />
            ))}
            <span className="pb-footer__spacer" />
          </div>
        </PBWindow>
      </div>
    </div>
  )
}

function FooterButton({ label, onClose }: { label: string; onClose: () => void }) {
  const host = usePBInstrumentation()
  /* Save keeps the window open; the two Close/Cancel captions shut it */
  const shuts = label.startsWith('Cancel') || label.startsWith('Save and Close')
  return (
    <PBButton
      wide
      data-tutorial-id={host?.anchor('command', pbSlug(label))}
      onClick={() => {
        host?.report('command', { command: pbSlug(label) })
        if (shuts) onClose()
      }}
    >
      {label}
    </PBButton>
  )
}

/** A detail-window grid, at the family's 18px detail-band pitch. */
function DetailGrid({
  columns, rows, gutter = true, style,
}: {
  columns: DesignerColumn[]
  rows: DesignerRow[]
  gutter?: boolean
  style?: Record<string, string>
}) {
  const [cur, setCur] = useState(0)
  return (
    <PBDataWindow
      rows={rows}
      current={cur}
      onCurrentChange={setCur}
      gutter={gutter}
      style={{ ['--pb-dw-row-h' as string]: '18px', ...style }}
      columns={columns.map((c) => ({
        key: c.key,
        header: c.dim ? <span style={{ color: 'var(--pb-text-dim)' }}>{c.header}</span> : c.header,
        width: c.width,
        align: c.align,
        dots: c.dots,
        render: c.check
          ? (r: DesignerRow) => <PBCheckbox checked={Boolean(r[c.key])} />
          : (r: DesignerRow) => String(r[c.key] ?? ''),
      }))}
    />
  )
}

/** The bold navy sub-caption PowerBuilder puts over a block of fields. */
const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div style={{ padding: '4px 8px 6px' }}>
    <div className="pb-caption" style={{ marginBottom: 3 }}>{title}</div>
    {children}
  </div>
)

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
    <span className="pb-form__label" style={{ minWidth: 92 }}>{label}</span>
    {children}
  </div>
)

const anchorField = (label: string) => `host.mois.field.${pbSlug(label)}`

/* ===========================================================================
   The dispatcher
   ======================================================================== */
export function DesignerDetailWindow({
  screen, row, onClose,
}: { screen: DesignerListScreen; row: DesignerRow; onClose: () => void }) {
  const title = screen.detailTitle
  switch (screen.detail) {
    case 'concept': return <ConceptMappingDetail title={title} row={row} onClose={onClose} />
    case 'encounter-form': return <EncounterFormDetail title={title} row={row} onClose={onClose} />
    case 'flowsheet': return <FlowsheetDetail title={title} row={row} onClose={onClose} />
    case 'measurement': return <MeasurementDetail title={title} row={row} onClose={onClose} />
    case 'paper-form': return <PaperFormDetail title={title} row={row} onClose={onClose} />
    case 'care-plan': return <CarePlanDetail title={title} row={row} onClose={onClose} />
    case 'task-set': return <TaskSetDetail title={title} row={row} onClose={onClose} />
    case 'letter': return <LetterTemplateDetail title={title} row={row} onClose={onClose} />
    case 'panel-setup': return <PanelSetupDetail title={title} row={row} onClose={onClose} />
  }
}

type DetailProps = { title: string; row: DesignerRow; onClose: () => void }

/* ---------------------------------------------------------------------------
   302269 · Concept Mapping Detail — 968 x 715, navy band `Concept Mapping`.
   Form area 113px, then TWO stacked rule grids, each with its own band and
   its own left-anchored `New Rule` / `Delete Rule` strip (variant B).
   ------------------------------------------------------------------------ */
function ConceptMappingDetail({ title, row, onClose }: DetailProps) {
  const [hm, setHm] = useState(Boolean(row.hm))
  /* the open concept's own rules; New Rule adds an empty one to its grid */
  const [codeRules, setCodeRules] = useState(() => conceptRules(String(row.concept ?? '')).code)
  const [textRules, setTextRules] = useState(() => conceptRules(String(row.concept ?? '')).text)
  useScreenReport({ rows: codeRules.length + textRules.length })
  const buttons = (add: () => void, remove: () => void): BandCommand[] => [
    { label: 'New Rule', width: 81, onPress: add }, { label: 'Delete Rule', width: 81, onPress: remove },
  ]
  /* `62d4040117d3`: Type, Classification and Concept are grey read-only
     fields with bold values; only Description is an edit (the #FFC09C one) */
  const fixed = { background: '#e8e8e8', fontWeight: 700 }

  return (
    <DetailFrame title={title} navy="Concept Mapping" w={968} h={715} footer={DETAIL_FOOTERS.saveChanges} onClose={onClose}>
      {/* the 113px header form */}
      <div style={{ flex: 'none', background: '#f0f0f0', padding: '5px 8px' }}>
        <div className="pb-form pb-form--cols4" style={{ padding: 0 }}>
          <span className="pb-form__label">Type:</span>
          <PBInput w={150} value={String(row.group ?? '')} readOnly style={fixed} data-tutorial-id={anchorField('Type')} />
          <span className="pb-form__label pb-form__label--right">Classification:</span>
          <PBInput w={120} value={String(row.type ?? '')} readOnly style={fixed} data-tutorial-id={anchorField('Classification')} />

          <span className="pb-form__label">Concept:</span>
          <PBInput w={250} value={String(row.concept ?? '')} readOnly style={fixed} data-tutorial-id={anchorField('Concept')} />
          <span className="pb-form__label pb-form__label--right">Description:</span>
          {/* the dirty / focused edit takes MOIS's #FFC09C fill */}
          <PBInput
            w="100%"
            defaultValue={String(row.desc ?? '')}
            style={{ background: '#ffc09c' }}
            data-tutorial-id={anchorField('Description')}
          />
        </div>

        <div className="pb-row" style={{ gap: 6, marginTop: 4 }}>
          <PBCheckbox label="Health Maintenance Concept" checked={hm} onChange={setHm} tutorialId={anchorField('Health Maintenance Concept')} />
          <span style={{ color: 'var(--pb-text-dim)' }}>{CONCEPT_HM_CAPTION}</span>
        </div>

        {/* the warning only appears while the box is ticked, in the form's
            ordinary black (30a3bdf6f957) */}
        {hm && (
          <div style={{ marginTop: 3 }} data-tutorial-id="host.mois.field.hm-warning">
            {CONCEPT_HM_WARNING.map((line) => <div key={line}>{line}</div>)}
          </div>
        )}
      </div>

      <BandB
        caption="Code Based Concept Rules"
        buttons={buttons(
          () => setCodeRules((r) => [...r, { system: '', code: '', dots: '...', term: '' }]),
          () => setCodeRules((r) => r.slice(0, -1)),
        )}
      />
      <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex' }} data-tutorial-id="host.mois.field.code-rules">
        <DetailGrid columns={CONCEPT_CODE_RULE_COLUMNS} rows={codeRules} />
      </div>

      <BandB
        caption="Text Based Concept Rules"
        buttons={buttons(
          () => setTextRules((r) => [...r, { inc1: '', inc2: '', exc: '', rule: '' }]),
          () => setTextRules((r) => r.slice(0, -1)),
        )}
      />
      <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex' }} data-tutorial-id="host.mois.field.text-rules">
        <DetailGrid columns={CONCEPT_TEXT_RULE_COLUMNS} rows={textRules} />
      </div>
    </DetailFrame>
  )
}

/* ---------------------------------------------------------------------------
   303093 · Encounter Documentation Form Detail — 1019 x 713, NO navy band.
   An 80px header form, then the only tab strip in the family.
   ------------------------------------------------------------------------ */
function EncounterFormDetail({ title, row, onClose }: DetailProps) {
  const [tab, setTab] = useState(ENCOUNTER_FORM_TABS[0]!)

  return (
    <DetailFrame title={title} w={1019} h={713} footer={DETAIL_FOOTERS.saveAndClose} onClose={onClose}>
      {/* the 80px header form */}
      <div className="pb-row" style={{ alignItems: 'flex-start', gap: 12, padding: '5px 8px', flex: 'none', background: '#f0f0f0', height: 80 }}>
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <div className="pb-row" style={{ gap: 6 }}>
            <span className="pb-form__label">Name:</span>
            <PBInput w={220} defaultValue={String(row.name ?? '')} data-tutorial-id={anchorField('Name')} />
            <span className="pb-form__label" style={{ marginLeft: 10 }}>Version:</span>
            <PBInput w={44} align="center" defaultValue="3" data-tutorial-id={anchorField('Version')} />
          </div>
          <div className="pb-row" style={{ gap: 6, alignItems: 'flex-start', marginTop: 3 }}>
            <span className="pb-form__label">Description:</span>
            {/* multiline with a spinner — a PB multi-line edit with its own
                vertical scroll control */}
            <PBTextArea rows={2} w={330} defaultValue={String(row.desc ?? '')} data-tutorial-id={anchorField('Description')} />
          </div>
        </div>

        <div style={{ flex: 'none' }}>
          <div className="pb-row" style={{ gap: 6 }}>
            <span className="pb-form__label">Question Width:</span>
            <PBInput w={54} align="right" defaultValue="1200" data-tutorial-id={anchorField('Question Width')} />
          </div>
          <div className="pb-row" style={{ gap: 6, marginTop: 3 }}>
            <span className="pb-form__label">Answer Width:</span>
            <PBInput w={54} align="right" defaultValue="0" data-tutorial-id={anchorField('Answer Width')} />
          </div>
        </div>

        <div style={{ flex: 'none', textAlign: 'center' }}>
          {/* the one button in the family painted on a face of its own */}
          <PBButton style={{ background: '#a6caf0' }}>Try Me: Width = 850</PBButton>
          <div style={{ color: 'var(--pb-text-dim)' }}>Click corner and resize</div>
        </div>
      </div>

      {/* no capture measures the tab widths, so they keep PowerBuilder's own
          fixed 96px rather than being sized to their captions */}
      <PBTabs tabs={ENCOUNTER_FORM_TABS} active={tab} onChange={setTab}>
        {tab === 'Groups' && (
          <>
            <BandA caption="Group List" buttons={[{ label: 'New Group', width: 80 }, { label: 'Delete Group', width: 81 }]} />
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
              <DetailGrid columns={ENCOUNTER_GROUP_COLUMNS} rows={ENCOUNTER_GROUP_ROWS} />
            </div>
          </>
        )}

        {tab === 'Elements' && (
          <>
            <BandA caption="Element List" buttons={[{ label: 'New Element', width: 81 }, { label: 'Delete Element', width: 81 }]} />
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
              {/* the left list is 314px of Element plus a 15px gutter; the
                  #646464 split rule lands at x=366 */}
              <div style={{ width: 351, flex: 'none', display: 'flex', borderRight: `1px solid ${RULE}` }}>
                <DetailGrid columns={ENCOUNTER_ELEMENT_COLUMNS} rows={ENCOUNTER_ELEMENT_ROWS} />
              </div>
              <div style={{ flex: '1 1 auto', minWidth: 0, overflow: 'auto' }}>
                <Section title="Identification">
                  {/* `5bf2f5ef…`: a numeric id, read-only and bold */}
                  <Field label="Element ID:"><PBInput w={150} value="10000043" readOnly style={{ background: '#e8e8e8', fontWeight: 700 }} data-tutorial-id={anchorField('Element ID')} /></Field>
                  {/* Reference is read-only and sits at the right of the row */}
                  <Field label="Reference:"><PBInput w={110} value="fd10000043" readOnly /></Field>
                  <Field label="Group:"><PBSelect w={190} options={ENCOUNTER_GROUP_ROWS.map((g) => String(g.heading))} /></Field>
                  <Field label="Order:"><PBInput w={44} align="right" defaultValue="10" /></Field>
                </Section>
                <Section title="Question Settings">
                  <Field label="Question:"><PBInput w={260} defaultValue="Smoking status" /></Field>
                  <Field label="Text Alignment:"><PBSelect w={110} options={['Left Align']} /></Field>
                  <Field label="Indent Label:"><PBInput w={44} align="right" defaultValue="0" /></Field>
                  <Field label="Height:">
                    <PBInput w={44} align="right" defaultValue="1" />
                    <span style={{ color: 'var(--pb-text-dim)' }}>(# of rows to wrap the label)</span>
                  </Field>
                </Section>
                <Section title="Answer Settings">
                  <Field label="Data Type:"><PBSelect w={130} options={ENCOUNTER_DATA_TYPES} data-tutorial-id={anchorField('Data Type')} /></Field>
                  <Field label=""><PBCheckbox label="Has an answer" checked /></Field>
                  <Field label="Value List:"><PBLookup w={230} name="value-list" /></Field>
                  <Field label="Height:">
                    <PBInput w={44} align="right" defaultValue="1" />
                    <span style={{ color: 'var(--pb-text-dim)' }}>(# of rows to wrap the answer)</span>
                  </Field>
                  <Field label="Width:"><PBInput w={54} align="right" defaultValue="850" /></Field>
                  <Field label="Text:"><PBInput w={190} /></Field>
                  <Field label="Check On:"><PBInput w={90} /></Field>
                  <Field label="Check Off:"><PBInput w={90} /></Field>
                </Section>
                <Section title="Reference Information">
                  <Field label="Type:"><PBSelect w={130} options={['No Link']} /></Field>
                </Section>
                <Section title="Hint Information">
                  <Field label="Hint / Help:"><PBTextArea rows={3} w={260} /></Field>
                </Section>
              </div>
            </div>
          </>
        )}

        {tab === 'Reference List' && (
          <>
            <BandA caption="Reference / Resource List" buttons={[{ label: 'New Refer.', width: 81 }, { label: 'Delete Refer.', width: 81 }]} />
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
              <DetailGrid columns={ENCOUNTER_REFERENCE_COLUMNS} rows={ENCOUNTER_REFERENCE_ROWS} />
            </div>
            {/* the two-line note this tab alone prints above the button row */}
            <div style={{ flex: 'none', padding: '3px 8px', background: '#f0f0f0' }}>
              {ENCOUNTER_REFERENCE_NOTE.map((line) => <div key={line}>{line}</div>)}
            </div>
          </>
        )}

        {tab === 'Form Layout' && (
          /* The live preview, re-rendered from the Groups and Elements.
             Which element belongs to which group is NOT in any capture, so
             the distribution below is arbitrary — only the shape is
             evidenced: bold group headings, a question/answer pair per
             element, an `Open Web Page` link at the right, and a vertical
             scrollbar. */
          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff', padding: '6px 10px' }}>
            {ENCOUNTER_GROUP_ROWS.map((g, i) => (
              <div key={String(g.heading)} style={{ marginBottom: 10 }}>
                <div className="pb-row" style={{ gap: 8 }}>
                  <b>{String(g.heading)}</b>
                  <span className="pb-row__spacer" />
                  {i === 0 && <button className="pb-link" type="button">Open Web Page</button>}
                </div>
                {ENCOUNTER_ELEMENT_ROWS
                  .filter((_, j) => j % ENCOUNTER_GROUP_ROWS.length === i)
                  .map((el) => (
                    <div key={String(el.element)} className="pb-row" style={{ gap: 8, padding: '2px 0' }}>
                      <span style={{ width: 200 }}>{String(el.element)}</span>
                      <PBInput w={260} />
                    </div>
                  ))}
              </div>
            ))}
          </div>
        )}

        {tab === 'Version' && (
          <>
            <BandA caption="Version History" />
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
              {/* the one grid in the family with no gutter and no chevron */}
              <DetailGrid columns={ENCOUNTER_VERSION_COLUMNS} rows={ENCOUNTER_VERSION_ROWS} gutter={false} />
            </div>
          </>
        )}
      </PBTabs>
    </DetailFrame>
  )
}

/* ---------------------------------------------------------------------------
   303098 · Flowsheet Detail — 1011 x 713, NO navy band.
   `Name` is read-only after creation: art. 303098, "This cannot be changed
   once it has been created".
   ------------------------------------------------------------------------ */
function FlowsheetDetail({ title, row, onClose }: DetailProps) {
  const [order, setOrder] = useState('Default')
  /* a new flowsheet opens with no elements; New Element adds one */
  const [elements, setElements] = useState<DesignerRow[]>(row.__new ? [] : FLOWSHEET_ELEMENT_ROWS)
  useScreenReport({ rows: elements.length })

  return (
    <DetailFrame title={title} w={1011} h={713} footer={DETAIL_FOOTERS.saveAndClose} onClose={onClose}>
      <div className="pb-row" style={{ alignItems: 'flex-start', gap: 16, padding: '5px 8px', flex: 'none', background: '#f0f0f0' }}>
        <div>
          <div className="pb-row" style={{ gap: 6 }}>
            <span className="pb-form__label">Name:</span>
            <PBInput w={220} value={String(row.name ?? '')} readOnly style={{ background: '#e8e8e8', fontWeight: 700 }} data-tutorial-id={anchorField('Name')} />
          </div>
          <div className="pb-row" style={{ gap: 6, alignItems: 'flex-start', marginTop: 3 }}>
            <span className="pb-form__label">Description:</span>
            <PBTextArea rows={2} w={300} defaultValue={String(row.desc ?? '')} data-tutorial-id={anchorField('Description')} />
          </div>
        </div>
        <div>
          <div className="pb-row" style={{ gap: 12 }}>
            <span className="pb-form__label">Element Order:</span>
            {['Default', 'Ascending', 'Descending'].map((o) => (
              <PBRadio key={o} name="flowsheet-element-order" label={o} checked={order === o} onChange={() => setOrder(o)} />
            ))}
          </div>
          <div className="pb-row" style={{ gap: 6, alignItems: 'flex-start', marginTop: 3 }}>
            <span className="pb-form__label">General Note:</span>
            <PBTextArea rows={2} w={300} data-tutorial-id={anchorField('General Note')} />
          </div>
        </div>
      </div>

      <BandA
        caption="Element List"
        buttons={[
          { label: 'New Element', width: 81, onPress: () => setElements((e) => [...e, { order: String(e.length), label: '' }]) },
          { label: 'Delete Element', width: 81, onPress: () => setElements((e) => e.slice(0, -1)) },
        ]}
      />

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        {/* gutter 14 + Order 41 + Label 268, then the #646464 split rule */}
        <div style={{ width: 325, flex: 'none', display: 'flex', borderRight: `1px solid ${RULE}` }}>
          <DetailGrid columns={FLOWSHEET_ELEMENT_COLUMNS} rows={elements} />
        </div>
        <div style={{ flex: '1 1 auto', minWidth: 0, overflow: 'auto' }}>
          <Section title="Flowsheet Information">
            <Field label="Order:">
              <PBInput w={44} align="right" defaultValue="0" data-tutorial-id={anchorField('Order')} />
              <span style={{ color: 'var(--pb-text-dim)' }}>(where the item will show in the flowsheet)</span>
            </Field>
            <Field label="Label:"><PBInput w={260} defaultValue={elements.length ? String(elements[0]!.label ?? '') : ''} data-tutorial-id={anchorField('Label')} /></Field>
          </Section>
          <Section title="Data Source:">
            <Field label="Type:"><PBSelect w={200} options={FLOWSHEET_SOURCE_TYPES} data-tutorial-id={anchorField('Type')} /></Field>
            <Field label="Source:"><PBSelect w={200} options={FLOWSHEET_SOURCES} data-tutorial-id={anchorField('Source')} /></Field>
            <Field label="Field ID:">
              {/* art. 303224 calls this "Concept/Code"; the window labels it
                  `Field ID`, with a second static `Field ID` after the box */}
              <PBLookup w={130} name="field-id" defaultValue="3137" />
              <span>Field ID</span>
            </Field>
            <Field label="Field Name:"><PBInput w={260} value="HEIGHT" readOnly /></Field>
            {/* the manual's `<0>No;<1>Yes;` belongs to a yes/no element, not
                to a measure, so a measure's mapping is left empty */}
            <Field label="Value Mapping:"><PBInput w={260} /></Field>
          </Section>
          <Section title="Notes">
            <Field label="Note:"><PBTextArea rows={3} w={260} /></Field>
          </Section>
        </div>
      </div>
    </DetailFrame>
  )
}

/* ---------------------------------------------------------------------------
   303100 · Measurement Input Template Detail — 688 x 589.
   The only window in the family with no navy band, no third footer button
   and no right-hand element form.
   ------------------------------------------------------------------------ */
function MeasurementDetail({ title, row, onClose }: DetailProps) {
  /* a new template opens with no elements; New Element adds one */
  const [elements, setElements] = useState<DesignerRow[]>(row.__new ? [] : MEASUREMENT_ELEMENT_ROWS)
  useScreenReport({ rows: elements.length })
  return (
    <DetailFrame title={title} w={688} h={589} footer={DETAIL_FOOTERS.saveChanges} onClose={onClose}>
      <div style={{ flex: 'none', background: '#f0f0f0', padding: '5px 8px' }}>
        <div className="pb-row" style={{ gap: 6 }}>
          <span className="pb-form__label">Name:</span>
          {/* `26528e3f…`: the name carried over from the New dialog, grey,
              bold and read-only */}
          <PBInput w={250} value={String(row.name ?? '')} readOnly style={{ background: '#e8e8e8', fontWeight: 700 }} data-tutorial-id={anchorField('Name')} />
        </div>
        <div className="pb-row" style={{ gap: 6, alignItems: 'flex-start', marginTop: 3 }}>
          <span className="pb-form__label">Description:</span>
          <PBTextArea rows={2} w={380} defaultValue={String(row.desc ?? '')} data-tutorial-id={anchorField('Description')} />
        </div>
      </div>

      <BandA
        caption="Element List"
        buttons={[
          { label: 'New Element', width: 80, onPress: () => setElements((e) => [...e, { order: String(e.length + 1), code: '', dots: '...', test: '' }]) },
          { label: 'Delete Element', width: 82, onPress: () => setElements((e) => e.slice(0, -1)) },
        ]}
      />

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <DetailGrid columns={MEASUREMENT_ELEMENT_COLUMNS} rows={elements} />
      </div>
    </DetailFrame>
  )
}

/* ---------------------------------------------------------------------------
   303112 · Paper Form Detail — 1022 x 731, navy band `Paper Form`.
   ------------------------------------------------------------------------ */
function PaperFormDetail({ title, row, onClose }: DetailProps) {
  const host = usePBInstrumentation()
  /* 303327: "Click 'Preview Form' · The form will open, with the field number
     in each fillable field … Close the form preview" */
  const [previewing, setPreviewing] = useState(false)

  return (
    <>
    <DetailFrame title={title} navy="Paper Form" w={1022} h={731} footer={DETAIL_FOOTERS.saveChanges} onClose={onClose}>
      <div className="pb-row" style={{ alignItems: 'flex-start', gap: 16, padding: '5px 8px', flex: 'none', background: '#f0f0f0' }}>
        <div>
          <Field label="Name:"><PBInput w={230} defaultValue={String(row.name ?? '')} data-tutorial-id={anchorField('Name')} /></Field>
          <Field label="Original Name:"><PBInput w={230} value={String(row.name ?? '')} readOnly /></Field>
          <Field label="Form Author:"><PBSelect w={150} options={['MOIS', 'CLINIC']} defaultValue={String(row.author ?? 'MOIS')} data-tutorial-id={anchorField('Form Author')} /></Field>
          <Field label="Form Group:"><PBSelect w={150} options={['REFERRAL', 'LAB', 'IMAGING', 'FORMS']} defaultValue={String(row.group ?? 'FORMS')} data-tutorial-id={anchorField('Form Group')} /></Field>
        </div>
        <div>
          <Field label="Form Code:"><PBInput w={130} defaultValue={String(row.code ?? '')} data-tutorial-id={anchorField('Form Code')} /></Field>
          <Field label="Description:"><PBTextArea rows={3} w={280} defaultValue={String(row.desc ?? '')} data-tutorial-id={anchorField('Description')} /></Field>
        </div>
        <span className="pb-row__spacer" />
        <div style={{ flex: 'none' }}>
          {/* 303112: "This button opens the form in the MOIS viewer so you can
              view any changes you have made" */}
          <PBButton
            wide
            data-tutorial-id={host?.anchor('command', 'preview-form')}
            onClick={() => { host?.report('command', { command: 'preview-form' }); setPreviewing(true) }}
          >
            Preview Form
          </PBButton>
        </div>
      </div>

      <BandA caption="Field Data Assignment" />

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <DetailGrid columns={PAPER_FIELD_COLUMNS} rows={PAPER_FIELD_ROWS} />
      </div>
    </DetailFrame>
    {/* over the detail window, not inside it: a separate top-level window */}
    {previewing && (
      <MoisViewerWindow form={String(row.name ?? '')} fields={PAPER_FIELD_ROWS} onClose={() => setPreviewing(false)} />
    )}
    </>
  )
}

/* ---------------------------------------------------------------------------
   303115 · Care Plan Tag Template Detail — 1019 x 866, navy band
   `Care Plan Tag Template` (y 130..154), form area 113px (156..268), band
   270..289 and a separate button strip 291..310. The only node in the family
   whose strip carries a `Refresh`.
   ------------------------------------------------------------------------ */
function CarePlanDetail({ title, row, onClose }: DetailProps) {
  return (
    <DetailFrame title={title} navy="Care Plan Tag Template" w={1019} h={866} footer={DETAIL_FOOTERS.saveChanges} onClose={onClose}>
      <div style={{ flex: 'none', background: '#f0f0f0', padding: '5px 8px', height: 113 }}>
        <div className="pb-row" style={{ gap: 6 }}>
          <span className="pb-form__label">Description:</span>
          <PBInput w={320} defaultValue={String(row.desc ?? '')} data-tutorial-id={anchorField('Description')} />
        </div>
        <div className="pb-row" style={{ gap: 6, alignItems: 'flex-start', marginTop: 4 }}>
          <span className="pb-form__label">Detail:</span>
          <PBTextArea rows={4} w={560} defaultValue={String(row.detail ?? '')} data-tutorial-id={anchorField('Detail')} />
        </div>
      </div>

      <BandB
        caption="Element List"
        buttons={[
          { label: 'New Row', width: 82 },
          { label: 'Delete Row', width: 81 },
          { label: 'Refresh', width: 81 },
        ]}
      />

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <CarePlanGrid />
      </div>
    </DetailFrame>
  )
}

/** `Identified By` is a radio pair — `Code` / `Concept` — in every row. */
function CarePlanGrid() {
  const [cur, setCur] = useState(0)
  const [by, setBy] = useState<string[]>(CARE_PLAN_ROWS.map((r) => String(r.identifiedBy ?? 'Code')))

  return (
    <PBDataWindow
      rows={CARE_PLAN_ROWS}
      current={cur}
      onCurrentChange={setCur}
      style={{ ['--pb-dw-row-h' as string]: '18px' }}
      columns={CARE_PLAN_COLUMNS.map((c) => ({
        key: c.key,
        header: c.header,
        width: c.width,
        align: c.align,
        dots: c.dots,
        render: c.key === 'identifiedBy'
          ? (_r: DesignerRow, i: number) => (
            <span className="pb-row" style={{ gap: 8, justifyContent: 'center' }}>
              {['Code', 'Concept'].map((o) => (
                <PBRadio
                  key={o}
                  name={`careplan-identified-by-${i}`}
                  label={o}
                  checked={by[i] === o}
                  onChange={() => setBy(by.map((v, j) => (j === i ? o : v)))}
                />
              ))}
            </span>
          )
          : (r: DesignerRow) => String(r[c.key] ?? ''),
      }))}
    />
  )
}

/* ---------------------------------------------------------------------------
   1802764 · Task Set Detail — navy band `Task Set`.

   MEASURED AT 1.25x ONLY (0ffe065f893e). The band (25px capture -> 20px
   normalised) and the button widths divide cleanly; the sub-control widths
   do not, so none are claimed here — the row is laid out to the described
   order (left block, then a `Detail:` memo on the right) rather than to
   measured x offsets. The window size below is the capture's 1224 x 911
   divided by 1.25 and is therefore derived, not measured.

   The grid is not columnar: it is a free-form multi-line DataWindow, so it
   is built out of rows rather than out of `PBDataWindow`.
   ------------------------------------------------------------------------ */
function TaskSetDetail({ title, row, onClose }: DetailProps) {
  const [cur, setCur] = useState(0)
  const [priority, setPriority] = useState(TASK_SET_ROWS.map((r) => r.priority))

  return (
    <DetailFrame title={title} navy="Task Set" w={979} h={729} footer={DETAIL_FOOTERS.saveChanges} onClose={onClose}>
      <div style={{ flex: 'none', background: '#f0f0f0', padding: '5px 8px' }}>
        <div className="pb-row" style={{ gap: 6 }}>
          <span className="pb-form__label">Description:</span>
          <PBInput w={320} defaultValue={String(row.desc ?? '')} data-tutorial-id={anchorField('Description')} />
        </div>
        <div className="pb-row" style={{ gap: 6, alignItems: 'flex-start', marginTop: 4 }}>
          <span className="pb-form__label">Detail:</span>
          <PBTextArea rows={3} w={560} defaultValue={String(row.detail ?? '')} data-tutorial-id={anchorField('Detail')} />
        </div>
      </div>

      <BandB caption="Task List" buttons={[{ label: 'New Row', width: 82 }, { label: 'Delete Row', width: 80 }]} />

      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff' }}>
        {TASK_SET_ROWS.map((t, i) => (
          <div
            key={t.task}
            className="pb-row"
            style={{
              alignItems: 'flex-start',
              gap: 10,
              padding: '3px 6px',
              /* the current row fills #E89C84 across the whole multi-line row */
              background: i === cur ? 'var(--pb-dw-select)' : i % 2 ? '#e8e8e8' : '#ffffff',
              borderBottom: '1px solid var(--pb-dw-line-soft)',
            }}
            data-tutorial-id={`host.mois.row.${pbSlug(t.task.slice(0, 32))}`}
            onMouseDown={() => setCur(i)}
          >
            <div style={{ flex: '1 1 auto', minWidth: 0 }}>
              <div className="pb-row" style={{ gap: 10, flexWrap: 'wrap' }}>
                <span className="pb-form__label">Priority:</span>
                {TASK_PRIORITIES.map((p) => (
                  <PBRadio
                    key={p}
                    name={`task-priority-${i}`}
                    label={p}
                    checked={priority[i] === p}
                    onChange={() => setPriority(priority.map((v, j) => (j === i ? p : v)))}
                  />
                ))}
              </div>
              <div className="pb-row" style={{ gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                <span className="pb-form__label">Task:</span>
                <PBInput w={230} defaultValue={t.task} />
                <span className="pb-form__label">Group:</span>
                <PBSelect w={110} options={['', 'RECALL', 'LAB', 'REFERRAL']} defaultValue={t.group} />
                <span className="pb-form__label">Due After:</span>
                <PBInput w={40} align="right" defaultValue={t.dueAfter} />
                <PBSelect w={78} options={TASK_DUE_UNITS} defaultValue={t.dueUnit} />
              </div>
            </div>
            <div className="pb-row" style={{ gap: 6, alignItems: 'flex-start', flex: 'none' }}>
              <span className="pb-form__label">Detail:</span>
              <PBTextArea rows={2} w={300} defaultValue={t.detail} />
            </div>
          </div>
        ))}
      </div>
    </DetailFrame>
  )
}

/* ---------------------------------------------------------------------------
   303101 · Letter Template Detail — 975 x 697.
   The one window that breaks the skeleton: no navy band, no grid, no band
   and strip. Two side-by-side group boxes with `#DCD7D2` captions, and a
   two-button footer.
   ------------------------------------------------------------------------ */
function LetterTemplateDetail({ title, row, onClose }: DetailProps) {
  const [editing, setEditing] = useState(false)
  const host = usePBInstrumentation()

  return (
    <>
      <DetailFrame title={title} w={975} h={697} footer={DETAIL_FOOTERS.closeOnly} onClose={onClose}>
        <div className="pb-row" style={{ alignItems: 'stretch', gap: 8, padding: 6, flex: '1 1 auto', minHeight: 0 }}>
          {/* --- Letter Detail, ~470px wide ----------------------------- */}
          <div style={{ width: 470, flex: 'none', display: 'flex', flexDirection: 'column', border: '1px solid #b6b6b6', background: '#fff' }}>
            <div className="pb-band" style={{ background: BAND }}>Letter Detail</div>
            <div style={{ padding: '6px 8px' }}>
              <div className="pb-row" style={{ gap: 6 }}>
                <span className="pb-form__label">Name:</span>
                {/* static text, not an edit */}
                <span>{String(row.name ?? '')}</span>
              </div>
              <div className="pb-row" style={{ gap: 6, marginTop: 4 }}>
                <span className="pb-form__label">Description:</span>
                <PBInput w={330} defaultValue={String(row.desc ?? '')} data-tutorial-id={anchorField('Description')} />
              </div>
              {/* the dotted horizontal divider between Description and Note */}
              <div style={{ borderTop: '1px dotted #808080', margin: '8px 0' }} />
              <div className="pb-row" style={{ gap: 6, alignItems: 'flex-start' }}>
                <span className="pb-form__label">Note:</span>
                <PBInput w={330} data-tutorial-id={anchorField('Note')} />
              </div>
            </div>
          </div>

          {/* --- Letter Preview ----------------------------------------- */}
          <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', border: '1px solid #b6b6b6', background: '#fff' }}>
            <div className="pb-band" style={{ background: BAND }}>
              <span>Letter Preview</span>
              <span className="pb-band__spacer" />
              {/* the group's own Edit button, at its top-right */}
              <button
                type="button"
                className="pb-btn pb-btn--sm"
                style={{ width: 56 }}
                data-tutorial-id={host?.anchor('command', 'edit')}
                onClick={() => { host?.report('command', { command: 'edit' }); setEditing(true) }}
              >
                Edit
              </button>
            </div>
            <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#808080', padding: 10 }}>
              {/* the page-shaped white preview */}
              <div style={{ width: 360, minHeight: 466, margin: '0 auto', background: '#fff', border: '1px solid #404040' }} />
            </div>
          </div>
        </div>
      </DetailFrame>

      {editing && <NewLetterDialog onClose={() => setEditing(false)} />}
    </>
  )
}

/* ---------------------------------------------------------------------------
   `New Letter` (01d1c6ccb84c / d4e452efb29c) — the dialog behind `Edit`.
   Choosing the third option reveals a Browse control. The MOIS Letter Writer
   it opens onto was never visually read, so nothing is built behind
   `Continue`.
   ------------------------------------------------------------------------ */
function NewLetterDialog({ onClose }: { onClose: () => void }) {
  const [option, setOption] = useState(NEW_LETTER_OPTIONS[0]!)
  const host = usePBInstrumentation()
  const fromFile = option === NEW_LETTER_OPTIONS[2]

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <div data-tutorial-id={host?.anchor('dialog', 'new-letter')}>
        <PBWindow child controls={false} title="New Letter" onClose={onClose} style={{ width: 460, height: 420 }}>
          <div style={{ flex: 'none', padding: '8px 10px', background: 'var(--pb-face)' }}>
            <div className="pb-form__label" style={{ marginBottom: 4 }}>Options:</div>
            {NEW_LETTER_OPTIONS.map((o) => (
              <div key={o} style={{ padding: '2px 0' }}>
                <PBRadio name="new-letter-option" label={o} checked={option === o} onChange={() => setOption(o)} />
              </div>
            ))}
            {fromFile && (
              <div className="pb-row" style={{ gap: 6, marginTop: 6 }}>
                <PBInput w={300} readOnly />
                <PBButton data-tutorial-id={host?.anchor('command', 'browse')}>Browse</PBButton>
              </div>
            )}
          </div>

          {/* the large empty list area under the options */}
          <div style={{ flex: '1 1 auto', minHeight: 0, margin: '0 10px 8px', border: '1px solid var(--pb-border)', background: '#fff' }} />

          <div className="pb-footer">
            <span className="pb-footer__spacer" />
            {['Continue', 'Cancel'].map((b) => (
              <PBButton
                key={b}
                wide
                data-tutorial-id={host?.anchor('command', pbSlug(b))}
                onClick={() => { host?.report('command', { command: pbSlug(b) }); onClose() }}
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

/* ---------------------------------------------------------------------------
   303237 · `Import Paper Forms` — 867 x 561.

   The only one of the six Import/Export dialogs captured anywhere in the
   corpus. The chained OS `Select Import File` dialog (`Files of type: 7z
   Files (*.7z)`) is the platform's, not MOIS's, and is not built.
   ------------------------------------------------------------------------ */
export function ImportPaperFormsDialog({ onClose, onImport }: { onClose: () => void; onImport?: (rows: DesignerRow[]) => void }) {
  const host = usePBInstrumentation()
  const [cur, setCur] = useState(0)
  const [picked, setPicked] = useState<boolean[]>(PAPER_IMPORT_ROWS.map((r) => Boolean(r.select)))
  /* nothing is listed until Browse... has picked an archive (`d837934e…`
     shows the file, the provider block and the grid filled together) */
  const [file, setFile] = useState('')
  useScreenReport({ dialog: 'import-paper-forms', rows: file ? PAPER_IMPORT_ROWS.length : 0 })

  const setAll = (v: boolean) => setPicked(picked.map(() => v))

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <div data-tutorial-id={host?.anchor('dialog', 'import-paper-forms')}>
        <PBWindow child controls={false} title="Import Paper Forms" onClose={onClose} style={{ width: 867, height: 561, maxWidth: '100%', maxHeight: '100%' }}>
          {/* --- Import File: ------------------------------------------- */}
          <div style={{ flex: 'none' }}>
            <div className="pb-band" style={{ background: BAND }}>Import File:</div>
            <div className="pb-row" style={{ gap: 6, padding: '5px 8px', background: 'var(--pb-face)' }}>
              <span className="pb-form__label">File (7z):</span>
              <PBInput w={560} readOnly value={file} data-tutorial-id={anchorField('File (7z)')} />
              <PBButton
                data-tutorial-id={host?.anchor('command', 'browse')}
                /* the OS file picker is the platform's, not MOIS's: the pick
                   is the capture's own archive */
                onClick={() => { host?.report('command', { command: 'browse' }); setFile('M:\\0222\\paperforms\\LabRequisition.7z') }}
              >
                Browse...
              </PBButton>
            </div>
          </div>

          {/* --- Available Forms ---------------------------------------- */}
          <div className="pb-band" style={{ background: BAND, flex: 'none' }}>Available Forms</div>
          {/* `d837934e…`: label / value pairs, the Data Provider values bold,
              not edit boxes; they fill once an archive is picked */}
          <div className="pb-row" style={{ alignItems: 'flex-start', gap: 24, padding: '5px 8px', flex: 'none', background: 'var(--pb-face)' }}>
            <div style={{ width: 400 }}>
              <div className="pb-caption">Data Provider:</div>
              {([['Clinic:', 'MOIS Exchange'], ['Contact:', 'AIHS'], ['Reference:', 'Not Available']] as const).map(([l, v]) => (
                <div key={l} className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
                  <span className="pb-form__label" style={{ minWidth: 66 }}>{l}</span>
                  <b>{file ? v : ''}</b>
                </div>
              ))}
            </div>
            <div>
              <div className="pb-caption">Software Provider:</div>
              {([['Software:', 'MOIS Exchange', '', ''], ['Version:', '02.05.09', 'Build:', '110429'], ['Date:', '2019/10/02', 'Time:', '15:39:30']] as const).map(([l, v, l2, v2]) => (
                <div key={l} className="pb-row" style={{ gap: 6, padding: '1px 0' }}>
                  <span className="pb-form__label" style={{ minWidth: 60 }}>{l}</span>
                  <span style={{ width: 110 }}>{file ? v : ''}</span>
                  {l2 && <span className="pb-form__label">{l2}</span>}
                  {l2 && <span>{file ? v2 : ''}</span>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 8px' }}>
            <PBDataWindow
              rows={file ? PAPER_IMPORT_ROWS : []}
              empty=" "
              current={cur}
              onCurrentChange={setCur}
              style={{ ['--pb-dw-row-h' as string]: '18px' }}
              columns={PAPER_IMPORT_COLUMNS.map((c) => ({
                key: c.key,
                header: c.header,
                width: c.width,
                align: c.align,
                render: c.check
                  ? (_r: DesignerRow, i: number) => (
                    <PBCheckbox
                      checked={picked[i]}
                      onChange={(v) => setPicked(picked.map((p, j) => (j === i ? v : p)))}
                    />
                  )
                  /* `Duplicate` renders the literal `Y` or `N` */
                  : (r: DesignerRow) => String(r[c.key] ?? ''),
              }))}
            />
          </div>

          <div className="pb-footer">
            <PBButton onClick={() => setAll(true)}>Select All</PBButton>
            <PBButton onClick={() => setAll(false)}>Unselect All</PBButton>
            <span className="pb-footer__spacer" />
            {['Ok', 'Cancel'].map((b) => (
              <PBButton
                key={b}
                wide
                data-tutorial-id={host?.anchor('command', pbSlug(b))}
                onClick={() => {
                  host?.report('command', { command: pbSlug(b) })
                  /* Ok brings the ticked forms into the Paper Form List */
                  if (b === 'Ok' && file) onImport?.(PAPER_IMPORT_ROWS.filter((_, j) => picked[j]))
                  onClose()
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

/* ---------------------------------------------------------------------------
   2594035 · Panel Setup Detail — 974 x 722, navy band `Panel Setup`
   (`4533a187…`). Code is "immutable once added", so it paints grey and
   read-only; Name and Description stay editable. The item band is the
   variant-B pair: "Panel Items List", then a strip with New Item and Delete
   Item left-anchored. Set IDs number themselves and renumber when a row goes
   in between two others.
   ------------------------------------------------------------------------ */
const DETERMINANT_PANELS: Record<string, string> = {
  'EMPLOYMENT STATUS': 'Employment', 'EDUCATION STATUS': 'Education', 'HOUSING STATUS': 'Housing',
}

function panelItems(name: string) {
  const tab = DETERMINANT_PANELS[name]
  const items = PANEL_ITEMS[name]
    ?? (tab ? (determinantTabs[tab]?.status ?? []).map((st) => ({ code: '', desc: String(st.name ?? '') })) : [])
  return items.map((it) => ({ code: it.code, dots: '...', desc: it.desc }))
}

function PanelSetupDetail({ title, row, onClose }: DetailProps) {
  const [items, setItems] = useState<DesignerRow[]>(() => (row.__new ? [] : panelItems(String(row.name ?? ''))))
  const [cur, setCur] = useState(0)
  useScreenReport({ rows: items.length })
  const numbered = items.map((it, i) => ({ ...it, setId: String(i + 1) }))
  /* New Item goes in under the current row; everything below renumbers */
  const newItem = () => {
    const at = items.length ? Math.min(cur, items.length - 1) + 1 : 0
    setItems((all) => [...all.slice(0, at), { code: '', dots: '...', desc: '' }, ...all.slice(at)])
    setCur(at)
  }
  const deleteItem = () => {
    if (!items.length) return
    setItems((all) => all.filter((_, i) => i !== cur))
    setCur((c) => Math.max(0, Math.min(c, items.length - 2)))
  }
  return (
    <DetailFrame title={title} navy="Panel Setup" w={974} h={722} footer={DETAIL_FOOTERS.saveChanges} onClose={onClose}>
      <div style={{ flex: 'none', background: '#f0f0f0', padding: '5px 8px', height: 110 }}>
        <Field label="Code:">
          <PBInput w={226} value={String(row.code ?? '')} readOnly style={{ background: '#e8e8e8' }} data-tutorial-id={anchorField('Code')} />
        </Field>
        <Field label="Name:">
          <PBInput w={320} defaultValue={String(row.name ?? '')} data-tutorial-id={anchorField('Name')} />
        </Field>
        <Field label="Description:">
          <PBInput w={422} defaultValue={String(row.desc ?? '')} data-tutorial-id={anchorField('Description')} />
        </Field>
      </div>

      <BandB
        caption="Panel Items List"
        buttons={[
          { label: 'New Item', width: 82, onPress: newItem },
          { label: 'Delete Item', width: 81, onPress: deleteItem },
        ]}
      />

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#fff' }}>
        <PBDataWindow
          rows={numbered}
          current={cur}
          onCurrentChange={setCur}
          style={{ ['--pb-dw-row-h' as string]: '18px' }}
          rowTutorialId={(_, i) => `host.mois.row.panel-item-${i + 1}`}
          columns={PANEL_ITEM_COLUMNS.map((c) => ({
            key: c.key, header: c.header, width: c.width, align: c.align, dots: c.dots,
            render: (r: DesignerRow) => String(r[c.key] ?? ''),
          }))}
        />
      </div>
    </DetailFrame>
  )
}
