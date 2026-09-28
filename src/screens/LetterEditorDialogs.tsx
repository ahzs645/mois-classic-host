import { useState, type ReactNode } from 'react'
import { LETTER_TEMPLATES } from '../data/letterSetup'
import { useScreenReport } from '../host/screen-state'
import {
  PBBand, PBButton, PBCheckbox, PBDataWindow, PBInput, PBRadio, PBSelect, PBTabs, PBWindow,
  pbSlug, usePBInstrumentation,
} from '../pb'

/* ============================================================================
   The word processor's own dialogs — what the Letter Writer's menus open.

   304687 names every one of them in its menu glossary ("Page Setup: Opens
   the 'Page Setup' window so you can edit Margins and Paper, Headers and
   Footers, Columns and Borders", "Character: Opens the 'Font' window. Here
   you can change the text type, size, colour, text background and add any
   attribute", …) and captures none of them. They are the TX Text Control
   dialogs the MOIS Letter Writer hosts, so their tabs and fields here are
   the ones the article's sentences list — INFERRED throughout, and laid out
   on one generic dialog frame rather than invented chrome.

   The exceptions, transcribed from captures:
     print        303589 `87ae0c73…` — the Print window: Printer (Name,
                  Properties..., Status, Type, Copies, Collate, Print to File,
                  Duplex Mode), Page Range (All, Current Page, Current View,
                  Pages, Selected Pages, Selected Graphic, Subset, Reverse
                  Order), Page Scaling, Print Options, the Paper preview,
                  Print Sheets, Print / Cancel.
     new-letter   303101 `01d1c6cc…` and `d4e452ef…` — New Letter: Options:
                  three radios; the third reveals a "Choose File" band with
                  File Name: and Browse; Continue / Cancel.

   Every dialog is anchored `host.mois.dialog.<id>`, its buttons
   `host.mois.command.<id>-<button>`, and reports `host.dialog = <id>` while
   open.
   ========================================================================= */

type Field =
  | { kind: 'section'; label: string }
  | { kind: 'text'; label: string; value?: string; w?: number }
  | { kind: 'select'; label: string; options: string[]; w?: number }
  | { kind: 'check'; label: string; checked?: boolean }
  | { kind: 'radios'; label?: string; options: string[] }
  | { kind: 'list'; label: string; items: string[] }
  | { kind: 'colors' }
  | { kind: 'note'; text: string }

type Spec = {
  title: string
  width: number
  height: number
  /** a tabbed dialog: one field list per tab */
  tabs?: Record<string, Field[]>
  fields?: Field[]
  buttons?: string[]
}

const COLORS = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff',
  '#ffffc0', '#ffc09c', '#bee6f8', '#c8dcfa', '#dcd7d2', '#e89c84', '#66cbea', '#ffff9c',
]

const MARGINS: Field[] = [
  { kind: 'section', label: 'Margins' },
  { kind: 'text', label: 'Top:', value: '1.00"', w: 60 },
  { kind: 'text', label: 'Bottom:', value: '1.00"', w: 60 },
  { kind: 'text', label: 'Left:', value: '1.00"', w: 60 },
  { kind: 'text', label: 'Right:', value: '1.00"', w: 60 },
  { kind: 'section', label: 'Paper' },
  { kind: 'select', label: 'Paper Size:', options: ['Letter', 'Legal', 'A4'] },
  { kind: 'radios', label: 'Orientation:', options: ['Portrait', 'Landscape'] },
]
const HEADERS_FOOTERS: Field[] = [
  { kind: 'section', label: 'Headers and Footers' },
  { kind: 'check', label: 'Header' },
  { kind: 'text', label: 'Distance from top:', value: '0.50"', w: 60 },
  { kind: 'check', label: 'Footer' },
  { kind: 'text', label: 'Distance from bottom:', value: '0.50"', w: 60 },
  { kind: 'check', label: 'Different first page' },
]
const COLUMNS: Field[] = [
  { kind: 'section', label: 'Columns' },
  { kind: 'text', label: 'Number of columns:', value: '1', w: 40 },
  { kind: 'text', label: 'Column width:', value: '6.50"', w: 60 },
  { kind: 'text', label: 'Spacing:', value: '0.50"', w: 60 },
  { kind: 'check', label: 'Line between' },
]
const BORDERS: Field[] = [
  { kind: 'section', label: 'Page Borders' },
  { kind: 'radios', options: ['None', 'Box', 'Shadow'] },
  { kind: 'select', label: 'Width:', options: ['1 pt', '2 pt', '3 pt'] },
]
const COLOR_FIELDS: Field[] = [{ kind: 'colors' }, { kind: 'text', label: 'Custom:', value: '#000000', w: 80 }]

export const EDITOR_DIALOGS: Record<string, Spec> = {
  'page-setup': { title: 'Page Setup', width: 470, height: 420, tabs: { 'Margins and Paper': MARGINS, 'Headers and Footers': HEADERS_FOOTERS, Columns: COLUMNS, Borders: BORDERS } },
  columns: { title: 'Page Setup', width: 470, height: 420, tabs: { Columns: COLUMNS, 'Margins and Paper': MARGINS, 'Headers and Footers': HEADERS_FOOTERS, Borders: BORDERS } },
  'header-footer': { title: 'Page Setup', width: 470, height: 420, tabs: { 'Headers and Footers': HEADERS_FOOTERS, 'Margins and Paper': MARGINS, Columns: COLUMNS, Borders: BORDERS } },
  find: {
    title: 'Find', width: 420, height: 190, buttons: ['Find Next', 'Cancel'],
    fields: [{ kind: 'text', label: 'Find what:', w: 240 }, { kind: 'check', label: 'Match case' }, { kind: 'check', label: 'Whole word only' }, { kind: 'radios', label: 'Direction:', options: ['Up', 'Down'] }],
  },
  replace: {
    title: 'Replace', width: 440, height: 230, buttons: ['Find Next', 'Replace', 'Replace All', 'Cancel'],
    fields: [{ kind: 'text', label: 'Find what:', w: 240 }, { kind: 'text', label: 'Replace with:', w: 240 }, { kind: 'check', label: 'Match case' }, { kind: 'check', label: 'Whole word only' }],
  },
  hyperlink: {
    title: 'Hyperlink', width: 440, height: 200,
    fields: [{ kind: 'text', label: 'Text to display:', w: 260 }, { kind: 'text', label: 'Address:', w: 260 }, { kind: 'check', label: 'Open in a new window' }],
  },
  target: {
    title: 'Target', width: 380, height: 220,
    fields: [{ kind: 'text', label: 'Target name:', w: 200 }, { kind: 'list', label: 'Existing targets:', items: [] }],
  },
  font: {
    title: 'Font', width: 460, height: 400,
    fields: [
      { kind: 'select', label: 'Font:', options: ['Arial', 'Times New Roman', 'Courier New', 'Lucida Console'], w: 200 },
      { kind: 'select', label: 'Size:', options: ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24'], w: 60 },
      { kind: 'select', label: 'Text Color:', options: ['Automatic', 'Black', 'Blue', 'Red', 'Green'], w: 120 },
      { kind: 'select', label: 'Text Background:', options: ['None', 'Yellow', 'Salmon', 'Light Blue'], w: 120 },
      { kind: 'section', label: 'Attributes' },
      { kind: 'check', label: 'Bold' }, { kind: 'check', label: 'Italic' }, { kind: 'check', label: 'Underline' },
      { kind: 'check', label: 'Strikeout' }, { kind: 'check', label: 'Superscript' }, { kind: 'check', label: 'Subscript' },
    ],
  },
  paragraph: {
    title: 'Paragraph', width: 460, height: 400,
    tabs: {
      'Formatting and Indents': [
        { kind: 'select', label: 'Alignment:', options: ['Left', 'Center', 'Right', 'Justify'] },
        { kind: 'text', label: 'Left indent:', value: '0.00"', w: 60 },
        { kind: 'text', label: 'Right indent:', value: '0.00"', w: 60 },
        { kind: 'text', label: 'First line:', value: '0.00"', w: 60 },
        { kind: 'text', label: 'Spacing before:', value: '0 pt', w: 60 },
        { kind: 'text', label: 'Spacing after:', value: '0 pt', w: 60 },
        { kind: 'select', label: 'Line spacing:', options: ['Single', '1.5 lines', 'Double'] },
      ],
      'Frame and Page Breaks': [
        { kind: 'check', label: 'Page break before' }, { kind: 'check', label: 'Keep lines together' },
        { kind: 'check', label: 'Keep with next' }, { kind: 'check', label: 'Widow/Orphan control', checked: true },
        { kind: 'section', label: 'Frame' }, { kind: 'radios', options: ['None', 'Box', 'Top line', 'Bottom line'] },
      ],
    },
  },
  tabs: {
    title: 'Tabs', width: 400, height: 320, buttons: ['Set', 'Clear', 'Clear All', 'OK', 'Cancel'],
    fields: [{ kind: 'text', label: 'Tab stop position:', value: '0.50"', w: 80 }, { kind: 'list', label: 'Tab stops:', items: ['0.50"', '1.00"', '1.50"'] }, { kind: 'radios', label: 'Alignment:', options: ['Left', 'Center', 'Right', 'Decimal'] }],
  },
  bullets: {
    title: 'Bullets and Numbering', width: 440, height: 360,
    tabs: {
      Bullets: [{ kind: 'radios', options: ['None', '•  Bullet', '○  Circle', '■  Square', '➤  Arrow'] }, { kind: 'text', label: 'Indent:', value: '0.25"', w: 60 }],
      Numbers: [{ kind: 'radios', options: ['None', '1. 2. 3.', 'a. b. c.', 'A. B. C.', 'i. ii. iii.', 'I. II. III.'] }, { kind: 'text', label: 'Start at:', value: '1', w: 40 }],
      'Structured List': [{ kind: 'radios', options: ['None', '1. 1.1 1.1.1', '1) a) i)'] }],
    },
  },
  styles: {
    title: 'Styles', width: 440, height: 340, buttons: ['New...', 'Modify...', 'Delete', 'Apply', 'Close'],
    fields: [{ kind: 'list', label: 'Styles:', items: ['[Normal]', 'Heading 1', 'Heading 2', 'Heading 3', 'Title', 'Address'] }, { kind: 'note', text: 'Format and writing styles; users can add their own if applicable.' }],
  },
  'image-attributes': {
    title: 'Image Attributes', width: 440, height: 340,
    tabs: {
      Size: [{ kind: 'text', label: 'Width:', value: '3.00"', w: 60 }, { kind: 'text', label: 'Height:', value: '2.00"', w: 60 }, { kind: 'check', label: 'Keep aspect ratio', checked: true }],
      'Wrapping Style': [{ kind: 'radios', options: ['Inline with text', 'Square', 'Top and bottom', 'Behind text', 'In front of text'] }],
      Position: [{ kind: 'text', label: 'Horizontal:', value: '0.00"', w: 60 }, { kind: 'text', label: 'Vertical:', value: '0.00"', w: 60 }],
    },
  },
  'text-color': { title: 'Color', width: 330, height: 270, fields: COLOR_FIELDS },
  'background-color': { title: 'Color', width: 330, height: 270, fields: COLOR_FIELDS },
  'insert-image': {
    title: 'Insert Image', width: 520, height: 360, buttons: ['Open', 'Cancel'],
    fields: [{ kind: 'text', label: 'Look in:', value: 'Images', w: 300 }, { kind: 'list', label: 'Files:', items: ['clinic-logo.png', 'signature.png', 'letterhead-banner.jpg'] }, { kind: 'text', label: 'File name:', w: 300 }, { kind: 'select', label: 'Files of type:', options: ['All Images (*.bmp;*.gif;*.jpg;*.png;*.tif)'], w: 300 }],
  },
  'insert-object': {
    title: 'Insert Object', width: 470, height: 330,
    fields: [{ kind: 'radios', options: ['Create New', 'Create from File'] }, { kind: 'list', label: 'Object Type:', items: ['Adobe Acrobat Document', 'Microsoft Excel Worksheet', 'Microsoft Word Document', 'Package', 'Paintbrush Picture'] }, { kind: 'check', label: 'Display as icon' }],
  },
  break: {
    title: 'Break', width: 330, height: 260,
    fields: [{ kind: 'section', label: 'Break type' }, { kind: 'radios', options: ['Page break', 'Text wrapping break'] }, { kind: 'section', label: 'Section break' }, { kind: 'radios', options: ['New page', 'New line'] }],
  },
  'insert-table': {
    title: 'Insert Table', width: 330, height: 230,
    fields: [{ kind: 'text', label: 'Number of columns:', value: '3', w: 40 }, { kind: 'text', label: 'Number of rows:', value: '2', w: 40 }, { kind: 'check', label: 'Gridlines', checked: true }],
  },
  'table-properties': {
    title: 'Table Properties', width: 460, height: 360,
    tabs: {
      Table: [{ kind: 'text', label: 'Width:', value: '6.50"', w: 60 }, { kind: 'select', label: 'Alignment:', options: ['Left', 'Center', 'Right'] }],
      'Borders and Colors': [{ kind: 'select', label: 'Border:', options: ['None', 'All', 'Outside', 'Inside'] }, { kind: 'select', label: 'Border width:', options: ['1 pt', '2 pt'] }, { kind: 'colors' }],
      Margins: [{ kind: 'text', label: 'Top:', value: '0.03"', w: 60 }, { kind: 'text', label: 'Bottom:', value: '0.03"', w: 60 }, { kind: 'text', label: 'Left:', value: '0.08"', w: 60 }, { kind: 'text', label: 'Right:', value: '0.08"', w: 60 }],
    },
  },
  'print-preview': {
    title: 'Print Preview', width: 560, height: 560, buttons: ['Print...', 'Close'],
    fields: [{ kind: 'note', text: 'Page 1 of 1 — the letter at printing scale.' }],
  },
  spelling: {
    title: 'Spelling', width: 440, height: 300, buttons: ['Ignore', 'Ignore All', 'Change', 'Change All', 'Close'],
    fields: [{ kind: 'text', label: 'Not in dictionary:', w: 240 }, { kind: 'list', label: 'Suggestions:', items: [] }, { kind: 'note', text: 'The spelling check is complete.' }],
  },
}

export const isEditorDialog = (id: string) => id in EDITOR_DIALOGS || id === 'print' || id === 'new-letter'

function FieldRow({ f, name }: { f: Field; name: string }) {
  const [radio, setRadio] = useState(0)
  const [checked, setChecked] = useState(f.kind === 'check' ? !!f.checked : false)
  const host = usePBInstrumentation()
  switch (f.kind) {
    case 'section':
      return <div style={{ color: '#000080', fontWeight: 700, borderBottom: '1px solid #bdbdbd', margin: '6px 0 3px' }}>{f.label}</div>
    case 'text':
      return (
        <div className="pb-row" style={{ gap: 6, padding: '2px 0' }}>
          <span className="pb-form__label" style={{ width: 130 }}>{f.label}</span>
          <PBInput w={f.w ?? 160} defaultValue={f.value} data-tutorial-id={host?.anchor('field', `${name}-${pbSlug(f.label)}`)} />
        </div>
      )
    case 'select':
      return (
        <div className="pb-row" style={{ gap: 6, padding: '2px 0' }}>
          <span className="pb-form__label" style={{ width: 130 }}>{f.label}</span>
          <PBSelect w={f.w ?? 160} options={f.options} data-tutorial-id={host?.anchor('field', `${name}-${pbSlug(f.label)}`)} />
        </div>
      )
    case 'check':
      return <div style={{ padding: '2px 0' }}><PBCheckbox label={f.label} checked={checked} onChange={setChecked} tutorialId={host?.anchor('field', `${name}-${pbSlug(f.label)}`)} /></div>
    case 'radios':
      return (
        <div className="pb-row" style={{ gap: 12, padding: '2px 0', flexWrap: 'wrap' }}>
          {f.label && <span className="pb-form__label" style={{ width: 130 }}>{f.label}</span>}
          {f.options.map((o, i) => <PBRadio key={o} name={`${name}-${pbSlug(f.label ?? 'r')}`} label={o} checked={radio === i} onChange={() => setRadio(i)} tutorialId={host?.anchor('field', `${name}-${pbSlug(o)}`)} />)}
        </div>
      )
    case 'list':
      return (
        <div style={{ padding: '2px 0' }}>
          <div className="pb-form__label">{f.label}</div>
          <div style={{ height: 90, overflow: 'auto', background: '#fff', border: '1px solid var(--pb-border)' }}>
            {f.items.map((it, i) => <div key={it} style={{ padding: '1px 4px', background: i === radio ? '#cce4f7' : undefined }} onMouseDown={() => setRadio(i)}>{it}</div>)}
          </div>
        </div>
      )
    case 'colors':
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 24px)', gap: 4, padding: '4px 0' }}>
          {COLORS.map((c, i) => (
            <button key={c} type="button" aria-label={c} onClick={() => setRadio(i)}
              style={{ width: 22, height: 18, background: c, border: radio === i ? '2px solid #000' : '1px solid #808080', padding: 0 }} />
          ))}
        </div>
      )
    default:
      return <div style={{ padding: '4px 0', color: '#404040' }}>{f.text}</div>
  }
}

function DialogShell({ id, title, width, height, onClose, children, buttons, onButton }: {
  id: string
  title: string
  width: number
  height: number
  onClose: () => void
  children: ReactNode
  buttons: string[]
  onButton: (b: string) => void
}) {
  const host = usePBInstrumentation()
  useScreenReport({ dialog: id })
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 98 }}>
      <PBWindow child controls={false} title={title} onClose={onClose} tutorialId={`host.mois.dialog.${id}`}
        style={{ width, height, maxWidth: 'calc(100% - 16px)', maxHeight: 'calc(100% - 16px)' }}>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--pb-face)', padding: 10, overflow: 'auto' }}>
          {children}
        </div>
        <div className="pb-footer">
          <span className="pb-footer__spacer" />
          {buttons.map((b) => (
            <PBButton key={b} wide className={b === buttons[0] ? 'pb-btn--default' : undefined}
              data-tutorial-id={host?.anchor('command', `${id}-${pbSlug(b)}`)}
              onClick={() => { host?.report('command', { command: `${id}-${pbSlug(b)}` }); onButton(b) }}>
              {b}
            </PBButton>
          ))}
          <span className="pb-footer__spacer" />
        </div>
      </PBWindow>
    </div>
  )
}

/** One of the word processor's dialogs, by id. `onOk` fires on the default
    (first) button; every button closes. */
export function LetterEditorDialog({ id, onClose, onOk }: { id: string; onClose: () => void; onOk?: () => void }) {
  const spec = EDITOR_DIALOGS[id]
  const tabs = spec?.tabs ? Object.keys(spec.tabs) : []
  const [tab, setTab] = useState(tabs[0] ?? '')
  if (id === 'print') return <PrintDialog onClose={onClose} onPrint={() => { onOk?.(); onClose() }} />
  if (!spec) return null
  const buttons = spec.buttons ?? ['OK', 'Cancel']
  return (
    <DialogShell id={id} title={spec.title} width={spec.width} height={spec.height} onClose={onClose} buttons={buttons}
      onButton={(b) => { if (b === buttons[0]) onOk?.(); if (b !== 'Find Next' && b !== 'Set' && b !== 'Clear' && b !== 'Ignore' && b !== 'Change') onClose() }}>
      {spec.tabs ? (
        <PBTabs tabs={tabs} active={tab} onChange={setTab} compact>
          <div key={tab} style={{ padding: 8, overflow: 'auto', flex: '1 1 auto' }}>
            {spec.tabs[tab]!.map((f, i) => <FieldRow key={i} f={f} name={`${id}-${pbSlug(tab)}`} />)}
          </div>
        </PBTabs>
      ) : spec.fields!.map((f, i) => <FieldRow key={i} f={f} name={id} />)}
    </DialogShell>
  )
}

/* --- Print (303589 `87ae0c73…`) ------------------------------------------ */
function PrintDialog({ onClose, onPrint }: { onClose: () => void; onPrint: () => void }) {
  const [range, setRange] = useState('All')
  const host = usePBInstrumentation()
  useScreenReport({ dialog: 'letter-print' })
  const group = (title: string, children: ReactNode) => (
    <fieldset style={{ border: '1px solid #c8c8c8', margin: '0 0 6px', padding: '2px 8px 6px' }}>
      <legend>{title}</legend>{children}
    </fieldset>
  )
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 98 }}>
      <PBWindow child controls={false} title="Print" onClose={onClose} tutorialId="host.mois.dialog.letter-print"
        style={{ width: 830, height: 650, maxWidth: 'calc(100% - 16px)', maxHeight: 'calc(100% - 16px)' }}>
        <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, gap: 8, padding: 8, background: 'var(--pb-face)' }}>
          <div style={{ width: 410, flex: 'none', overflow: 'auto' }}>
            {group('Printer', <>
              <div className="pb-row" style={{ gap: 6 }}><span className="pb-form__label" style={{ width: 60 }}>Name:</span>
                <PBSelect w={200} options={['HP LaserJet M1530 MFP Series', 'CutePDFWriter', 'SRFax']} data-tutorial-id="host.mois.field.print-printer" />
                <PBButton>Properties...</PBButton></div>
              <div>Status: Ready</div><div>Type: Remote Desktop Easy Print</div>
              <div className="pb-row" style={{ gap: 6 }}><span className="pb-form__label" style={{ width: 60 }}>Copies:</span><PBInput w={40} defaultValue="1" /><PBCheckbox label="Collate" />
                <span style={{ flex: 1 }} /><PBCheckbox label="Print to File" /></div>
              <div style={{ textAlign: 'right' }}><PBCheckbox label="Duplex Mode" /></div>
            </>)}
            {group('Page Range', <>
              {['All', 'Current Page', 'Current View', 'Pages:'].map((o) => (
                <div key={o}><PBRadio name="letter-print-range" label={o} checked={range === o} onChange={() => setRange(o)} /></div>
              ))}
              <div className="pb-row" style={{ gap: 6, paddingLeft: 20 }}><PBInput w={140} disabled={range !== 'Pages:'} /><span>(total 1 pages)</span></div>
              <div className="pb-row" style={{ gap: 6 }}><span className="pb-form__label">Subset:</span><PBSelect w={140} options={['All pages', 'Odd pages', 'Even pages']} /><PBCheckbox label="Reverse Order" /></div>
            </>)}
            {group('Page Scaling', <>
              <div className="pb-row" style={{ gap: 6 }}><span className="pb-form__label">Scaling Type:</span><PBSelect w={240} options={['None', 'Fit to printer margins', 'Reduce to printer margins']} /></div>
              <PBCheckbox label="Auto-rotate sheets" /><br /><PBCheckbox label="Auto-centre pages in sheets" /><br /><PBCheckbox label="Choose paper source by PDF-page size" />
            </>)}
            {group('Print Options', <>
              <div className="pb-row" style={{ gap: 6 }}><span className="pb-form__label">Print:</span><PBSelect w={240} options={['Document and Markups', 'Document', 'Form fields only']} /></div>
              <PBCheckbox label="Print as Images" /><br /><PBCheckbox label="Print as Grayscale" />
            </>)}
          </div>
          <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', background: '#6d6d6d', color: '#fff', padding: 6 }}>
            <div>Paper: &apos;Letter&apos;</div>
            <div style={{ flex: '1 1 auto', margin: '8px auto', width: 250, background: '#fff', border: '1px solid #222' }} />
            <div className="pb-row" style={{ gap: 6 }}><span>Print Sheets:</span><PBInput w={60} defaultValue="1" /><span>(1 total, 1 selected)</span></div>
          </div>
        </div>
        <div className="pb-footer">
          <span className="pb-footer__spacer" />
          <PBButton wide className="pb-btn--default" data-tutorial-id={host?.anchor('command', 'letter-print-print')}
            onClick={() => { host?.report('command', { command: 'letter-print-print' }); onPrint() }}>Print</PBButton>
          <PBButton wide data-tutorial-id={host?.anchor('command', 'letter-print-cancel')} onClick={onClose}>Cancel</PBButton>
        </div>
      </PBWindow>
    </div>
  )
}

/* --- New Letter (303101 `01d1c6cc…`, `d4e452ef…`) --------------------------
   Options: three radios. "Create a new letter from a MOIS template" fills the
   empty list pane with the clinic's templates (INFERRED — the capture shows
   the pane empty with the first option picked); "Create a new letter from an
   existing file" puts a "Choose File" band with File Name: and Browse over
   it. Browse stands in for the OS file picker and fills the capture's own
   kind of path. */
export const NEW_LETTER_OPTIONS = [
  'Create a new blank letter',
  'Create a new letter from a MOIS template',
  'Create a new letter from an existing file',
] as const

export type NewLetterChoice = { option: 'blank' | 'template' | 'file'; template?: string; file?: string }

export function NewLetterDialog({ onContinue, onClose }: { onContinue: (choice: NewLetterChoice) => void; onClose: () => void }) {
  const [option, setOption] = useState(0)
  const [file, setFile] = useState('')
  const [cur, setCur] = useState(0)
  const host = usePBInstrumentation()
  useScreenReport({ dialog: 'new-letter', newLetterOption: ['blank', 'template', 'file'][option]!, newLetterFile: !!file })
  const templates = [...new Map(LETTER_TEMPLATES.map((t) => [t.name, t])).values()]
  const cont = () => {
    if (option === 2 && !file) return
    onContinue(option === 0 ? { option: 'blank' } : option === 1 ? { option: 'template', template: templates[cur]?.name } : { option: 'file', file })
  }
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 95 }}>
      <PBWindow child controls={false} title="New Letter" onClose={onClose} tutorialId="host.mois.dialog.new-letter" style={{ width: 671, height: 498, maxWidth: 'calc(100% - 16px)' }}>
        <div className="pb-row" style={{ alignItems: 'flex-start', gap: 20, padding: '8px 10px', background: 'var(--pb-face)', flex: 'none', borderBottom: '1px solid #a0a0a0' }}>
          <span className="pb-form__label">Options:</span>
          <div>
            {NEW_LETTER_OPTIONS.map((o, i) => (
              <div key={o} style={{ padding: '2px 0' }}>
                <PBRadio name="new-letter-option" label={o} checked={option === i} onChange={() => setOption(i)} tutorialId={`host.mois.field.new-letter-${['blank', 'template', 'file'][i]}`} />
              </div>
            ))}
          </div>
        </div>
        {option === 2 && (
          <div style={{ flex: 'none', background: 'var(--pb-face)' }}>
            <PBBand>Choose File</PBBand>
            <div className="pb-row" style={{ gap: 6, padding: '4px 8px' }}>
              <span className="pb-form__label">File Name:</span>
              <PBInput w={420} readOnly value={file} data-tutorial-id="host.mois.field.new-letter-file-name" />
              <PBButton data-tutorial-id={host?.anchor('command', 'new-letter-browse')}
                onClick={() => { host?.report('command', { command: 'new-letter-browse' }); setFile('C:\\Users\\mois\\MOIS Cloud Files\\Letters\\Virtual Psychiatry Clinic Referral.docx') }}>
                Browse
              </PBButton>
            </div>
          </div>
        )}
        <div style={{ flex: '1 1 auto', minHeight: 0, margin: '0 10px 8px', border: '1px solid var(--pb-border)', background: '#fff', display: 'flex' }}>
          {option === 1 && (
            <PBDataWindow
              rows={templates}
              current={cur}
              onCurrentChange={setCur}
              rowTutorialId={(t) => `host.mois.row.new-letter-${pbSlug(t.name)}`}
              columns={[{ key: 'name', header: 'Letter Template', width: 300 }, { key: 'type', header: 'Type', width: 140 }, { key: 'description', header: 'Description' }]}
            />
          )}
        </div>
        <div className="pb-footer">
          <span className="pb-footer__spacer" />
          <PBButton wide className="pb-btn--default" disabled={option === 2 && !file} data-tutorial-id={host?.anchor('command', 'new-letter-continue')}
            onClick={() => { host?.report('command', { command: 'new-letter-continue' }); cont() }}>Continue</PBButton>
          <PBButton wide data-tutorial-id={host?.anchor('command', 'new-letter-cancel')} onClick={onClose}>Cancel</PBButton>
          <span className="pb-footer__spacer" />
        </div>
      </PBWindow>
    </div>
  )
}
