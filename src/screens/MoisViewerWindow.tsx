import { useState, type CSSProperties, type ReactNode } from 'react'
import { PBMenuBar, PBWindow, pbSlug, usePBInstrumentation, type PBMenuBarEntry, type PBMenuItem } from '../pb'
import type { DesignerRow } from '../data/designerSection'
import type { AddressBookEntry, AddressBookMode } from '../data/addressBook'
import { usePatient } from '../data/patient-context'
import { useScreenReport } from '../host/screen-state'
import { AddressBookWindow } from './AddressBookWindow'
import { HealthIssuesPicker, type HealthIssuePick } from './HealthIssuesPicker'

/* ============================================================================
   The MOIS Viewer — the Tracker Software PDF-XChange Viewer control MOIS
   opens a PDF in. Two callers:

   · Patient Chart ▸ Forms ▸ Paper Forms, double-clicking a row
     (screens/PaperFormsView.tsx) → "MOIS Viewer (Embedded)", with the Find
     bar that fills the form from the address book and the chart.
   · Administration ▸ Designer Section ▸ Paper (PDF) Forms ▸ Paper Form
     Detail's `Preview Form` (screens/DesignerDetailWindow.tsx) → "MOIS
     Viewer", the form's fields drawn with their index numbers.

   PROVENANCE
   · user capture 2026-09-25 #2, #3 (v02.31.23): the embedded window — title
     "MOIS Viewer (Embedded)" with the MOIS icon and all three caption
     buttons; the light-blue "Find:" bar with three flat buttons, Provider +
     MSP · Provider + Address · Patient Health Issues; the menu bar File ·
     Edit · View · Document · Comments · Tools · Window · Help behind a grip;
     two toolbar rows (below); the page on a near-white desk with a vertical
     scroll bar; a status strip reading the page size ("8.44 x 6.00 in" for
     the BC Controlled Prescription Form) beside a horizontal scroll bar.
     #3: a focused fillable field's tooltip is its PDF field name ("phn").
   · Toolbar row 1 (#2, #17): Open... ▾ · Save (grey) · Print · sign · text
     selection · export ▾ · scan · OCR | back · forward (grey) · undo ▾ ·
     redo ▾ (grey) · overflow ▾ || Zoom In ▾ · 1:1 · Fit Page · Fit Width
     (pressed) · 120% ▾ · − · slider · + · overflow ▾.
     Toolbar row 2: comment · Typewriter · text box · callout · highlight ·
     strikeout · underline · arrow · line · rectangle · oval · polyline ·
     polygon · cloud · pin · pencil · eraser | stamp · DRAFT ▾ · overflow ▾.
     The tooltips are not captured; the titles below are the tools' names.
   · #17: the chosen markup tool is drawn pressed — a pale-gold face in a
     darker gold frame (the Cloud tool there). Here a tool only toggles that
     state; nothing is drawn on the page.
   · Menus: File #7, Edit #8, View #10, Document #11, Comments #12, Tools
     #13, Window #14, Help #15 — items, separators, shortcuts, arrows and
     greyed items transcribed. What the fly-outs hold is NOT captured; the
     few filled in below are named as such, and the rest open empty.
     #16 (Help ▸ About) confirms PDF-XChange Viewer 2.5 (Build 201.0).
   · The Administration preview keeps article 304734 / 303327's title "MOIS
     Viewer", its own M icon and no Find bar; its chrome now follows the
     current build's viewer (the same control) — two toolbar rows, no
     "Options"/"Ready" strips, which v02.31.23 no longer shows.
   · The page: the stage has no PDF. The Administration preview draws the
     form's Field Data Assignment rows, each box carrying its Index in red
     (303327 "the field number in each fillable field"). A chart paper form
     draws a neutral page: the form's name over a set of the viewer's yellow
     fillable fields, the patient's identity filled from the open chart.

   Only Close (File ▸ Close / Close All, Ctrl+W's item, the caption ×), the
   tool buttons' pressed state, the zoom controls and the Find bar do
   anything; the rest of the control is inert on this stage.

   Reported: `host.dialog` = mois-viewer while it is open, and
   `host.screen.viewerTool` = the pressed tool's slug (or null).
   ========================================================================= */

const VIEWER_ICON = (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#1d4f91" />
    <text x="8" y="12" textAnchor="middle" fontSize="10" fontStyle="italic" fontWeight="700" fill="#fff">M</text>
  </svg>
)

const sep: PBMenuItem = { sep: true }

/* --- toolbar glyphs --------------------------------------------------------
   16x16, drawn to read like the captures' icons at their size. */
const S = ({ children, w = 16 }: { children: ReactNode; w?: number }) => (
  <svg viewBox={`0 0 ${w} 16`} width={w} height="16" aria-hidden="true" style={{ display: 'block' }}>{children}</svg>
)
const RED = '#c8242c'
const G: Record<string, ReactNode> = {
  open: <S><path d="M1 4h5l1 1.5h7v8H1z" fill="#e8c24a" stroke="#9a7a1c" /><circle cx="4" cy="11" r="3.2" fill="#62b030" stroke="#3a7a18" /></S>,
  save: <S><path d="M2 2h10l2 2v10H2z" fill="#7d9ec4" stroke="#4d6d94" /><rect x="4.5" y="2.5" width="6" height="4" fill="#e8eef6" /><rect x="4" y="9" width="8" height="4.5" fill="#e8eef6" /></S>,
  print: <S><rect x="4" y="1.5" width="8" height="5" fill="#fff" stroke="#777" /><rect x="1.5" y="6" width="13" height="6" rx="1" fill="#b9bcc2" stroke="#6e7176" /><rect x="4" y="10" width="8" height="4.5" fill="#fff" stroke="#777" /></S>,
  sign: <S><path d="M2 13c2-3 3 1 5-1s1-3 3-2" fill="none" stroke="#333" /><path d="M9 9l5-6 1 1-5 6z" fill="#4a7a2a" /></S>,
  select: <S><text x="2" y="12" fontSize="12" fontWeight="700" fill="#444" fontFamily="serif">T</text><path d="M10 7v8l2-2 1.5 3 1-.5-1.5-3h2.5z" fill="#fff" stroke="#222" strokeWidth=".8" /></S>,
  export: <S><rect x="1.5" y="5" width="11" height="9" fill="#6fae3a" stroke="#3f7a1c" /><path d="M1.5 5l3-3h11l-3 3z" fill="#e7c64c" stroke="#9a7a1c" /></S>,
  scan: <S><rect x="2" y="3" width="9" height="11" fill="#fff" stroke="#888" /><path d="M8 11l6-8 1.2 1-6 8z" fill="#3c7fd0" /><path d="M7 12l1-1 1.2 1-1.4.8z" fill="#caa13c" /></S>,
  ocr: <S w={20}><rect x=".5" y="2.5" width="19" height="11" fill="#fff" stroke="#555" /><text x="10" y="11.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#222">OCR</text></S>,
  back: <S><circle cx="8" cy="8" r="6.5" fill="#dfe3dc" stroke="#b9beb4" /></S>,
  undo: <S><path d="M4 9a5 5 0 0 1 9-2" fill="none" stroke="#b8c2cf" strokeWidth="2" /><path d="M2 6l3 5 2-4z" fill="#b8c2cf" /></S>,
  redo: <S><path d="M12 9a5 5 0 0 0-9-2" fill="none" stroke="#b8c2cf" strokeWidth="2" /><path d="M14 6l-3 5-2-4z" fill="#b8c2cf" /></S>,
  zoom: <S><circle cx="6.5" cy="6.5" r="4.5" fill="#dbeefd" stroke="#3f6fa8" strokeWidth="1.4" /><path d="M10 10l4.5 4.5" stroke="#6a4a2a" strokeWidth="2.4" /><path d="M4.5 6.5h4M6.5 4.5v4" stroke="#1d7f1d" strokeWidth="1.3" /></S>,
  actual: <S><rect x="2.5" y="1.5" width="11" height="13" fill="#fff" stroke="#6d8fbf" /><text x="8" y="11" textAnchor="middle" fontSize="6.5" fill="#3a5f96">1:1</text></S>,
  fitPage: <S><rect x="2.5" y="1.5" width="11" height="13" fill="#fff" stroke="#6d8fbf" /><path d="M8 3.5v9M5.5 6 8 3.5 10.5 6M5.5 10 8 12.5 10.5 10" fill="none" stroke="#3a5f96" /></S>,
  fitWidth: <S><rect x="2.5" y="1.5" width="11" height="13" fill="#fff" stroke="#6d8fbf" /><path d="M3.5 8h9M6 5.5 3.5 8 6 10.5M10 5.5 12.5 8 10 10.5" fill="none" stroke="#3a5f96" /></S>,
  minus: <S><circle cx="8" cy="8" r="6.5" fill="#43a83c" stroke="#2c7c26" /><path d="M4.5 8h7" stroke="#fff" strokeWidth="2" /></S>,
  plus: <S><circle cx="8" cy="8" r="6.5" fill="#43a83c" stroke="#2c7c26" /><path d="M4.5 8h7M8 4.5v7" stroke="#fff" strokeWidth="2" /></S>,
  comment: <S><path d="M1.5 2.5h13v8h-7l-3 3v-3h-3z" fill="#f7e84a" stroke="#a79317" /></S>,
  typewriter: <S><rect x="1.5" y="2.5" width="13" height="11" fill="#fff" stroke="#8b1c22" /><path d="M4 5.5h8M4 8h8M4 10.5h8" stroke="#333" /></S>,
  textbox: <S><rect x="1.5" y="2.5" width="13" height="11" fill="#fff" stroke={RED} /><path d="M4 5.5h8M4 8h8M4 10.5h5" stroke="#333" /></S>,
  callout: <S><rect x="5.5" y="1.5" width="9" height="8" fill="#fff" stroke={RED} /><path d="M7 4h6M7 6.5h6" stroke="#333" /><path d="M5.5 8 1.5 14.5 7 9.5" fill="none" stroke={RED} /></S>,
  highlight: <S><rect x="1" y="1" width="14" height="14" fill="#fff36a" /><text x="8" y="13.5" textAnchor="middle" fontSize="15" fill="#1c55a8" fontFamily="serif">T</text></S>,
  strike: <S><text x="8" y="13.5" textAnchor="middle" fontSize="15" fill="#1c55a8" fontFamily="serif">T</text><path d="M1.5 8.5h13" stroke={RED} strokeWidth="1.4" /></S>,
  underline: <S><text x="8" y="12.5" textAnchor="middle" fontSize="15" fill="#1c55a8" fontFamily="serif">T</text><path d="M2 14.5h12" stroke="#2c9a2c" strokeWidth="1.4" /></S>,
  arrow: <S><path d="M2 14 13 3" stroke={RED} strokeWidth="1.6" /><path d="M14.5 1.5 8.5 3.5l4 4z" fill={RED} /></S>,
  line: <S><path d="M2 14 14 2" stroke={RED} strokeWidth="1.6" /></S>,
  rect: <S><rect x="2" y="3" width="12" height="10" fill="none" stroke={RED} strokeWidth="1.6" /></S>,
  oval: <S><ellipse cx="8" cy="8" rx="6.2" ry="5" fill="none" stroke={RED} strokeWidth="1.6" /></S>,
  polyline: <S><path d="M2 12 5 3l6 2 3 5-4 4-3-3" fill="none" stroke={RED} strokeWidth="1.6" /></S>,
  polygon: <S><path d="M8 1.8 14.3 6.4 11.9 13.8H4.1L1.7 6.4z" fill="none" stroke={RED} strokeWidth="1.6" /></S>,
  cloud: <S><path d="M4 5a2.2 2.2 0 0 1 4-1 2.2 2.2 0 0 1 4 1 2.2 2.2 0 0 1 0 4.5 2.2 2.2 0 0 1-2.5 3 2.2 2.2 0 0 1-4 0A2.2 2.2 0 0 1 3 9.5 2.2 2.2 0 0 1 4 5z" fill="#f7d0a0" stroke={RED} strokeWidth="1.3" /></S>,
  pin: <S><path d="M5 1.5h6l-1 5 2.5 2.5h-9L6 6.5z" fill="#2a5fb8" stroke="#163a78" /><path d="M8 9v6" stroke="#333" strokeWidth="1.4" /></S>,
  pencil: <S><path d="M2.5 13.5 3.5 10 11.5 2l2.5 2.5-8 8z" fill="#8aa0b8" stroke="#333" strokeWidth=".8" /><path d="M2.5 13.5 3.5 10l2.5 2.5z" fill="#e8c28a" /></S>,
  eraser: <S><path d="M2 11 9 3.5l5 4.5-6.5 7H4.5z" fill="#f2cd2e" stroke="#8a6a0a" /><path d="M4.5 8.5 9.5 13" stroke="#8a6a0a" /></S>,
  stamp: <S><path d="M3 12h10v2.5H3z" fill="#c8a040" /><path d="M6 12 7 5h2l1 7z" fill="#f1c84a" stroke="#8a6a0a" /><circle cx="8" cy="3.5" r="2.4" fill="#f1c84a" stroke="#8a6a0a" /></S>,
}

type ToolDef = { slug: string; title: string; glyph: keyof typeof G | ReactNode; label?: string; drop?: boolean; corner?: boolean; disabled?: boolean }

/* row 2's markup tools, in toolbar order — also the Comment And Markup Tools
   fly-out, which is how the manual reaches the Pencil and Eraser */
const MARKUP: ToolDef[] = [
  { slug: 'sticky-note', title: 'Sticky Note Tool', glyph: 'comment', corner: true },
  { slug: 'typewriter', title: 'Typewriter Tool', glyph: 'typewriter', label: 'Typewriter', corner: true },
  { slug: 'text-box', title: 'Text Box Tool', glyph: 'textbox', corner: true },
  { slug: 'callout', title: 'Callout Tool', glyph: 'callout', corner: true },
  { slug: 'highlight-text', title: 'Highlight Text Tool', glyph: 'highlight', corner: true },
  { slug: 'strikeout-text', title: 'Strikeout Text Tool', glyph: 'strike', corner: true },
  { slug: 'underline-text', title: 'Underline Text Tool', glyph: 'underline', corner: true },
  { slug: 'arrow', title: 'Arrow Tool', glyph: 'arrow', corner: true },
  { slug: 'line', title: 'Line Tool', glyph: 'line', corner: true },
  { slug: 'rectangle', title: 'Rectangle Tool', glyph: 'rect', corner: true },
  { slug: 'oval', title: 'Oval Tool', glyph: 'oval', corner: true },
  { slug: 'polygon-line', title: 'Polygon Line Tool', glyph: 'polyline', corner: true },
  { slug: 'polygon', title: 'Polygon Tool', glyph: 'polygon', corner: true },
  { slug: 'cloud', title: 'Cloud Tool', glyph: 'cloud', corner: true },
  { slug: 'file-attachment', title: 'File Attachment Tool', glyph: 'pin', corner: true },
  { slug: 'pencil', title: 'Pencil Tool', glyph: 'pencil', corner: true },
  { slug: 'eraser', title: 'Eraser Tool', glyph: 'eraser' },
]

const ZOOMS = [25, 50, 75, 100, 120, 150, 200, 300, 400]
type Fit = 'actual' | 'page' | 'width'

function viewerMenus({
  onClose, fileName, setTool, setFit,
}: {
  onClose: () => void
  fileName: string
  setTool: (slug: string) => void
  setFit: (fit: Fit) => void
}): PBMenuBarEntry[] {
  /* #7 */
  const file: PBMenuItem[] = [
    { label: 'Open...', key: 'Ctrl+O' },
    { label: 'Open from URL...' },
    sep,
    { label: 'Save', key: 'F2', disabled: true },
    { label: 'Save As...', key: 'Ctrl+Shift+S' },
    { label: 'Save Copy As...' },
    sep,
    /* fly-out: 304734's prose names these four */
    {
      label: 'New Document...',
      menu: [
        { label: 'From Text File...' }, { label: 'From Rich Text Format (RTF) File...' },
        { label: 'From Image File...' }, { label: 'From Scanner...' },
      ],
    },
    sep,
    /* fly-out: 304734's prose */
    { label: 'Send by E-mail as ZIP...', menu: [{ label: 'Send by E-mail...' }, { label: 'Send by E-mail as ZIP...' }] },
    sep,
    { label: 'Close', key: 'Ctrl+W', onSelect: onClose },
    { label: 'Close All', onSelect: onClose },
    sep,
    /* not captured: the one file this viewer has opened */
    { label: 'Recent Files', menu: [{ label: fileName }] },
    sep,
    { label: 'Export', menu: [] },
    sep,
    { label: 'Form Data', menu: [] },
    sep,
    { label: 'Print...', key: 'Ctrl+P' },
    sep,
    { label: 'Document Properties...', key: 'Ctrl+D' },
    { label: 'Copy Full File Name' },
    { label: 'Open Containing Folder...' },
    sep,
    { label: 'Exit', disabled: true },
  ]
  /* #8 */
  const edit: PBMenuItem[] = [
    { label: 'Undo', key: 'Ctrl+Z', disabled: true, menu: [] },
    { label: 'Redo', key: 'Ctrl+Y', disabled: true, menu: [] },
    sep,
    { label: 'Cut', key: 'Ctrl+X', disabled: true },
    { label: 'Copy', key: 'Ctrl+C', disabled: true },
    { label: 'Paste', key: 'Ctrl+V', disabled: true },
    sep,
    { label: 'Delete', key: 'Delete', disabled: true },
    sep,
    { label: 'Find', key: 'Ctrl+F' },
    { label: 'Search', key: 'Ctrl+Shift+F' },
    sep,
    { label: 'Import All Settings from Data File...' },
    { label: 'Export All Settings to Data File...' },
    { label: 'Reset All Settings to Defaults...' },
    sep,
    { label: 'Preferences...', key: 'Ctrl+K' },
  ]
  /* #10 */
  const view: PBMenuItem[] = [
    { label: 'Toolbars', menu: [] },
    { label: 'Status Bar' },
    { label: 'Navigation Tabs', disabled: true },
    sep,
    { label: 'Customize User Interface...' },
    sep,
    { label: 'Bookmarks', key: 'Ctrl+B' },
    { label: 'Pages Thumbnails', key: 'Ctrl+T' },
    { label: 'Other Panes', menu: [] },
    sep,
    { label: 'Actual Size', key: 'Ctrl+0', onSelect: () => setFit('actual') },
    { label: 'Fit Page', key: 'Ctrl+1', onSelect: () => setFit('page') },
    { label: 'Fit Width', key: 'Ctrl+2', onSelect: () => setFit('width') },
    { label: 'Zoom To...', key: 'Ctrl+Shift+M' },
    sep,
    { label: 'Show Grid', key: "Ctrl+'" },
    { label: 'Show Guides', key: 'Ctrl+;' },
    { label: 'Show Rulers', key: 'Ctrl+R' },
    { label: 'Snap', key: 'Ctrl+Shift+;', menu: [] },
    sep,
    { label: 'Go To', menu: [] },
    sep,
    { label: 'Page Layout', menu: [] },
    sep,
    { label: 'Rotate View', menu: [] },
    sep,
    { label: 'Full Screen', key: 'F12', disabled: true },
  ]
  /* #11 — the first caption sits under the pointer there; "Insert Pages..."
     is 304734's prose */
  const document: PBMenuItem[] = [
    { label: 'Insert Pages...', key: 'Ctrl+Shift+I' },
    { label: 'Insert Empty Pages...' },
    sep,
    { label: 'Extract Pages...' },
    { label: 'Delete Pages...', key: 'Ctrl+Shift+D', disabled: true },
    sep,
    { label: 'Rotate Pages...', key: 'Ctrl+Shift+R' },
    { label: 'Crop Pages...', key: 'Ctrl+Shift+T' },
    sep,
    { label: 'Signing', menu: [] },
    sep,
    { label: 'Attach a File...' },
    sep,
    { label: 'OCR Pages...', key: 'Ctrl+Shift+C' },
  ]
  /* #12 — "Flatten Comments..." is partly under the pointer there */
  const comments: PBMenuItem[] = [
    { label: 'Flatten Comments...' },
    { label: 'Summarize Comments...' },
    sep,
    /* fly-out: 304734's prose */
    {
      label: 'Show Comments',
      menu: [
        { label: 'Show Comments List' }, { label: 'Hide All Comments' }, { label: 'Show All Comments' },
        { label: 'Show by Type' }, { label: 'Show by Author' }, { label: 'Open All Pop-Ups' }, { label: 'Close All Pop-Ups' },
      ],
    },
    sep,
    { label: 'Import Comments...' },
    { label: 'Export Comments to Data File...' },
    sep,
    { label: 'Show Comments List' },
    { label: 'Show Comments Styles Palette' },
  ]
  /* #13. Comment And Markup Tools' fly-out is the toolbar's row 2 (the
     catalog lesson quotes the manual: "Tools ▸ Comment And Markup Tools ▸
     Pencil Tool"); the other fly-outs are not captured. */
  const tools: PBMenuItem[] = [
    { label: 'Tools', menu: [] },
    { label: 'Zoom Tools', menu: [] },
    { label: 'Comment And Markup Tools', menu: MARKUP.map((t) => ({ label: t.title, onSelect: () => setTool(t.slug) })) },
    { label: 'Measuring Tools', menu: [] },
    { label: 'Link Tools', menu: [] },
  ]
  /* #14: the open document is the last entry, highlighted, with its
     thumbnail, bold name, path and "Page: 1 of 1" — drawn as one row here */
  const window: PBMenuItem[] = [
    { label: 'Tile Horizontally', disabled: true },
    { label: 'Tile Vertically', disabled: true },
    { label: 'Arrange Icons', disabled: true },
    sep,
    { label: 'Close All Documents', onSelect: onClose },
    sep,
    { label: fileName.replace(/\.pdf$/i, ''), key: 'Page: 1 of 1' },
  ]
  /* #15 */
  const help: PBMenuItem[] = [
    { label: 'Contents', key: 'F1' },
    { label: 'Home Page' },
    sep,
    { label: 'Report a Problem...' },
    { label: 'Support Forum' },
    sep,
    { label: 'Check for Updates...', disabled: true },
    sep,
    { label: 'About PDF-XChange Viewer...' },
  ]
  return [
    { label: 'File', menu: file },
    { label: 'Edit', menu: edit },
    { label: 'View', menu: view },
    { label: 'Document', menu: document },
    { label: 'Comments', menu: comments },
    { label: 'Tools', menu: tools },
    { label: 'Window', menu: window },
    { label: 'Help', menu: help },
  ]
}

/** The dotted grip a PDF-XChange toolbar band starts with. */
const Grip = () => <span aria-hidden="true" style={{ flex: 'none', width: 3, height: 16, margin: '0 4px 0 2px', borderLeft: '2px dotted #a8a8a8' }} />
/** A thin divider between groups on one band. */
const Rule = () => <span aria-hidden="true" style={{ flex: 'none', width: 1, height: 18, margin: '0 3px', background: '#d4d4d4' }} />
/** The tiny ▾ a band ends with (its overflow chevron). */
const Overflow = () => <span aria-hidden="true" style={{ fontSize: 7, alignSelf: 'flex-end', marginBottom: 3, color: '#333' }}>▼</span>

const PRESSED: CSSProperties = { borderColor: '#c9a24a', background: 'linear-gradient(#fdf3d0, #f6dc90)' }
const CHECKED: CSSProperties = { borderColor: '#9fb0c8', background: '#fbfcfe' }

/** One toolbar button. Anchored `host.mois.command.viewer-{slug}`. */
function ToolButton({
  def, pressed, checked, onClick,
}: { def: ToolDef; pressed?: boolean; checked?: boolean; onClick?: () => void }) {
  const host = usePBInstrumentation()
  const glyph = typeof def.glyph === 'string' && def.glyph in G ? G[def.glyph] : def.glyph
  return (
    <button
      type="button"
      title={def.title}
      disabled={def.disabled}
      aria-pressed={pressed || checked || undefined}
      data-tutorial-id={host?.anchor('command', `viewer-${def.slug}`)}
      onClick={() => { host?.report('command', { command: `viewer-${def.slug}` }); onClick?.() }}
      style={{
        position: 'relative', flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
        height: 23, padding: def.label ? '0 5px 0 3px' : '0 3px', margin: 0,
        border: '1px solid transparent', borderRadius: 2, background: 'none', color: '#1b1b1b',
        font: 'inherit', cursor: 'default', opacity: def.disabled ? 0.45 : 1,
        ...(checked ? CHECKED : null), ...(pressed ? PRESSED : null),
      }}
    >
      {glyph}
      {def.label && <span>{def.label}</span>}
      {def.drop && <span style={{ fontSize: 8, marginLeft: -1 }}>▼</span>}
      {def.corner && (
        <span aria-hidden="true" style={{ position: 'absolute', right: 1, bottom: 1, width: 0, height: 0, borderLeft: '3px solid transparent', borderBottom: '3px solid #222' }} />
      )}
    </button>
  )
}

const band: CSSProperties = {
  flex: 'none', display: 'flex', alignItems: 'center', height: 28, padding: '0 2px',
  background: 'linear-gradient(#fbfbfb, #eeeeee)', borderBottom: '1px solid #dadada', overflow: 'hidden', whiteSpace: 'nowrap',
}

/* --- the neutral page a chart paper form is drawn on ---------------------- */
type PageField = { name: string; caption: string; flex?: number; tall?: boolean }
const NEUTRAL_ROWS: { heading?: string; fields: PageField[] }[] = [
  { fields: [{ name: 'phn', caption: 'Personal Health No.', flex: 2 }, { name: 'date', caption: 'Date' }] },
  { heading: 'Patient Name', fields: [{ name: 'first', caption: 'First (Given)' }, { name: 'middle', caption: 'Middle Initial' }, { name: 'last', caption: 'Last (Surname)' }] },
  { heading: 'Patient Address', fields: [{ name: 'street', caption: 'Street', flex: 2 }, { name: 'city', caption: 'City' }, { name: 'dob', caption: 'Date of Birth' }] },
  { fields: [{ name: 'diagnosis', caption: 'Diagnosis / Health Issues', tall: true }] },
  { fields: [{ name: 'provider', caption: 'Provider (Name and MSP No.)' }, { name: 'copy-to', caption: 'Copy To (Name and Address)' }] },
  { fields: [{ name: 'comments', caption: 'Comments / Special Instructions', tall: true }] },
  { fields: [{ name: 'signature', caption: "Provider's Signature", flex: 2 }, { name: 'provider-id', caption: 'Provider ID' }] },
]
const FIELD_FILL = '#fbf7b8'

function NeutralPage({
  form, values, onField, onFocusField,
}: {
  form: string
  values: Record<string, string>
  onField: (name: string, value: string) => void
  onFocusField: (name: string) => void
}) {
  return (
    <>
      <div style={{ textAlign: 'center', fontSize: 13, margin: '0 0 6px', letterSpacing: '.3px' }}>
        <span style={{ color: '#666' }}>{'- - - - - - '}</span>{form.toUpperCase()}<span style={{ color: '#666' }}>{' - - - - - -'}</span>
      </div>
      <div style={{ border: '2px solid #222', borderRadius: '14px 14px 0 0', overflow: 'hidden' }}>
        {NEUTRAL_ROWS.map((row, r) => (
          <div key={r} style={{ display: 'flex', borderTop: r ? '1.5px solid #222' : undefined }}>
            {row.heading && (
              <div style={{ width: 70, flex: 'none', padding: '4px 5px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', borderRight: '1px solid #222' }}>
                {row.heading}
              </div>
            )}
            {row.fields.map((f, i) => (
              <label key={f.name} style={{ flex: `${f.flex ?? 1} 1 0`, minWidth: 0, padding: '2px 4px 4px', borderLeft: i ? '1px solid #222' : undefined, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 7.5, textTransform: 'uppercase', color: '#333' }}>{f.caption}</span>
                {f.tall ? (
                  <textarea
                    title={f.name}
                    data-tutorial-id={`host.mois.field.viewer-${f.name}`}
                    value={values[f.name] ?? ''}
                    onChange={(e) => onField(f.name, e.target.value)}
                    onFocus={() => onFocusField(f.name)}
                    rows={4}
                    style={{ resize: 'none', border: 0, background: FIELD_FILL, font: '12px Arial, Helvetica, sans-serif', padding: '2px 3px' }}
                  />
                ) : (
                  <input
                    title={f.name}
                    data-tutorial-id={`host.mois.field.viewer-${f.name}`}
                    value={values[f.name] ?? ''}
                    onChange={(e) => onField(f.name, e.target.value)}
                    onFocus={() => onFocusField(f.name)}
                    style={{ height: 20, border: 0, background: FIELD_FILL, font: '12px Arial, Helvetica, sans-serif', padding: '0 3px', minWidth: 0 }}
                  />
                )}
              </label>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

/** The Designer preview's page: one numbered box per Field Data Assignment row. */
function NumberedPage({ form, fields }: { form: string; fields: DesignerRow[] }) {
  return (
    <>
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 18, margin: '0 0 12px' }}>
        {form.toUpperCase()}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1.5px solid #000' }}>
        {fields.map((f, i) => (
          <div
            key={String(f.index ?? i)}
            data-tutorial-id={`host.mois.row.viewer-field-${String(f.index ?? i + 1)}`}
            style={{ borderRight: i % 2 ? undefined : '1px solid #000', borderBottom: '1px solid #000', padding: '2px 4px 3px' }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{String(f.desc || f.title || '')}</div>
            <div style={{ height: 20, background: '#ffffa6', display: 'flex', alignItems: 'center', padding: '0 3px' }}>
              <span style={{ color: '#e00000', fontSize: 14 }}>{String(f.index ?? '')}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/** A chart paper form's printed size: #2's Controlled Prescription is 8.44 x 6.00. */
export const paperFormPageSize = (form: string) => (/CONTROLLED PRESCRIPTION/i.test(form) ? '8.44 x 6.00 in' : '8.50 x 11.00 in')

export function MoisViewerWindow({
  form, fields, onClose, embedded = false, fileName, pageSize,
}: {
  /** the form's name, printed as the page's title */
  form: string
  /** the Field Data Assignment rows (Designer preview): one numbered box each */
  fields?: DesignerRow[]
  onClose: () => void
  /** the chart's paper-form viewer: "(Embedded)" title and the Find bar */
  embedded?: boolean
  /** the PDF's file name (a chart paper form's File Name) */
  fileName?: string
  /** the status strip's page size */
  pageSize?: string
}) {
  const host = usePBInstrumentation()
  const patient = usePatient()
  const [tool, setTool] = useState<string | null>(null)
  const [fit, setFit] = useState<Fit | null>('width')
  const [zoom, setZoom] = useState(120)
  const [maximized, setMaximized] = useState(false)
  const [picker, setPicker] = useState<AddressBookMode | 'health-issues' | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>(() => ({
    phn: [patient.insuranceBy, patient.bchn ?? patient.insurance].filter(Boolean).join('  '),
    first: patient.first, middle: patient.middle?.slice(0, 1) ?? '', last: patient.last,
    dob: patient.dob, street: patient.address ?? '', city: patient.city ?? '',
  }))
  useScreenReport({ dialog: 'mois-viewer', viewerTool: tool, viewerEmbedded: embedded })

  const file = fileName ?? `${pbSlug(form) || 'form'}.pdf`
  const pickTool = (slug: string) => setTool((t) => (t === slug ? null : slug))
  const fitTo = (f: Fit) => { setFit(f); setZoom(f === 'actual' ? 100 : f === 'width' ? 120 : 75) }
  const zoomBy = (dir: 1 | -1) => {
    setFit(null)
    setZoom((z) => (dir > 0 ? ZOOMS.find((v) => v > z) ?? z : [...ZOOMS].reverse().find((v) => v < z) ?? z))
  }
  /* a pick from the address book or the health issues goes into the field
     the cursor was last in (the manual: "clicking into the Diagnosis box
     offers Patient Health Issue"); with none, it goes nowhere */
  const fill = (text: string) => {
    if (focused) setValues((v) => ({ ...v, [focused]: v[focused] ? `${v[focused]}\n${text}` : text }))
  }
  const findButton = (label: string, open: () => void) => (
    <button
      type="button"
      data-tutorial-id={host?.anchor('command', pbSlug(label))}
      onClick={() => { host?.report('command', { command: pbSlug(label) }); open() }}
      style={{
        flex: 'none', height: 26, padding: '0 11px', margin: '0 0 0 3px', font: 'inherit', color: '#111',
        border: '1px solid #c3cbd6', background: '#e2e5e6', cursor: 'default',
      }}
    >
      {label}
    </button>
  )

  const row1: (ToolDef | 'rule' | 'grip' | 'overflow' | 'zoombox' | 'slider')[] = [
    'grip',
    { slug: 'open', title: 'Open', glyph: 'open', label: 'Open...', drop: true },
    'rule',
    { slug: 'save', title: 'Save', glyph: 'save', disabled: true },
    { slug: 'print', title: 'Print', glyph: 'print' },
    { slug: 'sign-document', title: 'Sign Document', glyph: 'sign', corner: true },
    { slug: 'select-text', title: 'Select Text', glyph: 'select' },
    { slug: 'export', title: 'Export', glyph: 'export', drop: true },
    { slug: 'scan', title: 'Scan', glyph: 'scan' },
    { slug: 'ocr', title: 'OCR', glyph: 'ocr' },
    'rule',
    { slug: 'back', title: 'Previous View', glyph: 'back', disabled: true },
    { slug: 'forward', title: 'Next View', glyph: 'back', disabled: true },
    'rule',
    { slug: 'undo', title: 'Undo', glyph: 'undo', drop: true, disabled: true },
    { slug: 'redo', title: 'Redo', glyph: 'redo', drop: true, disabled: true },
    'overflow',
    'grip',
    { slug: 'zoom-in-tool', title: 'Zoom In Tool', glyph: 'zoom', label: 'Zoom In', drop: true },
    'rule',
    { slug: 'actual-size', title: 'Actual Size', glyph: 'actual' },
    { slug: 'fit-page', title: 'Fit Page', glyph: 'fitPage' },
    { slug: 'fit-width', title: 'Fit Width', glyph: 'fitWidth' },
    'rule',
    'zoombox',
    { slug: 'zoom-out', title: 'Zoom Out', glyph: 'minus' },
    'slider',
    { slug: 'zoom-in', title: 'Zoom In', glyph: 'plus' },
    'overflow',
  ]
  const clickOf = (slug: string): (() => void) | undefined => {
    if (slug === 'actual-size') return () => fitTo('actual')
    if (slug === 'fit-page') return () => fitTo('page')
    if (slug === 'fit-width') return () => fitTo('width')
    if (slug === 'zoom-in') return () => zoomBy(1)
    if (slug === 'zoom-out') return () => zoomBy(-1)
    if (slug === 'zoom-in-tool' || slug === 'select-text') return () => pickTool(slug)
    return undefined
  }

  const width = embedded ? 1150 : 1000
  const height = embedded ? 870 : 690

  return (
    /* one work-area-sized track, so the maxima below clamp to the stage */
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80, gridTemplateColumns: 'minmax(0, 1fr)', gridTemplateRows: 'minmax(0, 1fr)' }}>
      <PBWindow
        child
        icon={embedded ? undefined : VIEWER_ICON}
        title={embedded ? 'MOIS Viewer (Embedded)' : 'MOIS Viewer'}
        onClose={onClose}
        maximized={maximized}
        onMaximize={() => setMaximized((m) => !m)}
        tutorialId="host.mois.dialog.mois-viewer"
        style={maximized
          ? { width: '100%', height: '100%' }
          : { width, height, maxWidth: 'calc(100% - 16px)', maxHeight: 'calc(100% - 16px)' }}
      >
        {/* #2: the embedded viewer's Find bar */}
        {embedded && (
          <div style={{ flex: 'none', display: 'flex', alignItems: 'center', height: 32, padding: '0 4px', background: '#b7cff0' }}>
            <span style={{ margin: '0 8px 0 2px' }}>Find:</span>
            {findButton('Provider + MSP', () => setPicker('provider-msp'))}
            {findButton('Provider + Address', () => setPicker('provider-address'))}
            {findButton('Patient Health Issues', () => setPicker('health-issues'))}
          </div>
        )}

        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #e2e2e2' }}>
          <Grip />
          <PBMenuBar items={viewerMenus({ onClose, fileName: file, setTool: (slug) => setTool(slug), setFit: fitTo })} />
        </div>

        {/* toolbar row 1 */}
        <div style={band}>
          {row1.map((item, i) => {
            if (item === 'grip') return <Grip key={i} />
            if (item === 'rule') return <Rule key={i} />
            if (item === 'overflow') return <Overflow key={i} />
            if (item === 'zoombox') {
              return (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', flex: 'none' }}>
                  <span className="pb-field" data-tutorial-id={host?.anchor('field', 'viewer-zoom')} style={{ width: 46, height: 20, display: 'inline-flex', alignItems: 'center', padding: '0 4px' }}>{zoom}%</span>
                  <span style={{ fontSize: 8, margin: '0 8px 0 4px' }}>▼</span>
                </span>
              )
            }
            if (item === 'slider') {
              return (
                <span key={i} aria-hidden="true" style={{ flex: 'none', position: 'relative', width: 84, height: 2, margin: '0 6px', background: '#c4c4c4' }}>
                  <span style={{ position: 'absolute', left: `${Math.round((ZOOMS.indexOf(zoom) / (ZOOMS.length - 1)) * 76)}px`, top: -6, width: 8, height: 13, background: '#f1f1f1', border: '1px solid #8c8c8c', borderRadius: '2px 2px 4px 4px' }} />
                </span>
              )
            }
            const fitSlug = fit === 'actual' ? 'actual-size' : fit === 'page' ? 'fit-page' : fit === 'width' ? 'fit-width' : ''
            return (
              <ToolButton
                key={item.slug}
                def={item}
                pressed={tool === item.slug}
                checked={item.slug === fitSlug}
                onClick={clickOf(item.slug)}
              />
            )
          })}
        </div>

        {/* toolbar row 2: comment and markup */}
        <div style={band}>
          <Grip />
          {MARKUP.map((t, i) => (
            <span key={t.slug} style={{ display: 'contents' }}>
              {(i === 1 || i === 4 || i === 7) && <Rule />}
              <ToolButton def={t} pressed={tool === t.slug} onClick={() => pickTool(t.slug)} />
            </span>
          ))}
          <Rule />
          <ToolButton def={{ slug: 'stamp', title: 'Stamp Tool', glyph: 'stamp', corner: true }} pressed={tool === 'stamp'} onClick={() => pickTool('stamp')} />
          <ToolButton
            def={{
              slug: 'stamps-palette', title: 'Stamps Palette', drop: true,
              glyph: (
                <span style={{ display: 'inline-block', padding: '0 10px', border: `1.5px solid ${RED}`, borderRadius: 3, color: RED, fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 10, lineHeight: '13px', letterSpacing: 1 }}>DRAFT</span>
              ),
            }}
          />
          <Overflow />
        </div>

        {/* the desk and the page */}
        <div
          data-tutorial-id="host.mois.field.viewer-page"
          style={{
            flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fcfcfc', padding: '6px 10px 10px',
            cursor: tool ? 'crosshair' : undefined,
          }}
        >
          <div
            style={{
              width: 760, margin: '0 auto', background: '#fff', zoom: zoom / 120,
              boxShadow: '0 0 0 1px #8a8a8a, 2px 2px 3px rgba(0,0,0,.25)', padding: '14px 24px 28px',
              color: '#000', fontFamily: 'Arial, Helvetica, sans-serif',
            }}
          >
            {fields
              ? <NumberedPage form={form} fields={fields} />
              : <NeutralPage form={form} values={values} onField={(n, v) => setValues((x) => ({ ...x, [n]: v }))} onFocusField={setFocused} />}
          </div>
        </div>

        {/* the status strip: page size, then the horizontal scroll bar */}
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, height: 20, padding: '0 6px', background: '#f3f3f3', borderTop: '1px solid #d6d6d6' }}>
          <span data-tutorial-id={host?.anchor('field', 'viewer-page-size')} style={{ width: 92, flex: 'none' }}>{pageSize ?? (fields ? '8.27 x 11.69 in' : paperFormPageSize(form))}</span>
          <span style={{ flex: '1 1 auto', height: 12, background: '#f7f7f7', border: '1px solid #e2e2e2' }} />
        </div>
      </PBWindow>

      {(picker === 'provider-msp' || picker === 'provider-address') && (
        <AddressBookWindow
          mode={picker}
          onClose={() => setPicker(null)}
          onSelect={(e: AddressBookEntry) => {
            fill(picker === 'provider-msp'
              ? [e.name, e.practNo].filter(Boolean).join('  ')
              : [e.name, e.location, e.city, e.phone && `Ph ${e.phone}`, e.fax && `Fax ${e.fax}`].filter(Boolean).join(', '))
            setPicker(null)
          }}
        />
      )}
      {picker === 'health-issues' && (
        <HealthIssuesPicker
          onClose={() => setPicker(null)}
          onSelect={(issue: HealthIssuePick) => { fill(issue.problem); setPicker(null) }}
        />
      )}
    </div>
  )
}
