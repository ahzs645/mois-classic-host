import type { ReactNode } from 'react'
import { PBMenuBar, PBWindow, type PBMenuItem } from '../pb'
import type { DesignerRow } from '../data/designerSection'
import { useScreenReport } from '../host/screen-state'

/* ============================================================================
   The MOIS Viewer — the Tracker Software PDF control MOIS opens documents in,
   here as Paper Form Detail's `Preview Form`.

   PROVENANCE
   · Article 304734 "MOIS Viewer" — the window: title bar "MOIS Viewer" with
     the viewer's own M icon and all three caption buttons (`d8c488e0…`,
     1000 x 690); the menu bar File · Edit · View · Document · Comments ·
     Tools · Window (`d8c488e0…`, and `b6697926…` below, carry no Help);
     one toolbar row of save / print / e-mail, back / forward, OCR, Zoom In
     with its drop, the three fit buttons (1:1, fit page, fit width), a
     zoom box reading 100% with its drop, and the − slider + zoom control;
     a grey desk with the white page on it; under it the page-size strip
     ("8.27 x 11.69 in") with the horizontal scroll bar, an "Options" bar
     with its flag icon, and a "Ready" status line.
   · The File menu: `292df567…` — Open... Ctrl+O, Open from URL... | Save
     F2 (grey), Save As... Ctrl+Shift+S, Save Copy As... | New Document ▸ |
     Send by E-mail as ZIP... ▸ | Close Ctrl+W, Close All | Recent Files ▸ |
     Export ▸ | Form Data ▸ | Print... Ctrl+P | Document Properties...
     Ctrl+D, Copy Full File Name, Open Containing Folder... | Exit (grey).
     Its fly-outs are named by the capture and 304734's prose only as far as
     "Send by E-mail..." / "Send by E-mail as ZIP..." and New Document's
     From Text File / From Rich Text Format (RTF) File / From Image File /
     From Scanner; the others are drawn without fly-outs.
   · Document and Comments menus: 304734's prose lists their items (Insert
     Pages…, Insert Empty Pages…, Extract Pages…, Delete Pages…, Rotate
     Pages…, Crop Pages…, Signing…, Attach a File…, OCR Pages…; Flatten
     Comments…, Summarize Comments…, Show Comments ▸, Import Comments…,
     Export Comments to Data File…, Show Comments List, Show Comments
     Styles Palette). Tools lists Basic, Zoom, Comment and Markup, Measuring
     and Link; View has Toolbars. Edit and Window are named but their items
     are not, so they drop nothing.
   · The preview itself: article 303327 "Edit a Paper Form", `b6697926…` —
     "The form will open, with the field number in each fillable field":
     each fillable box is the viewer's pale yellow, and its Index from the
     Field Data Assignment grid is printed in red inside it. The page here is
     drawn from the form's own field rows (title, then one labelled box per
     field), not from a PDF — the stage has no form file to render.

   Only the viewer's Close does anything (File ▸ Close, Ctrl+W's item, and
   the title bar's close box); the rest of the control is Tracker's, which
   "is for viewing only" on this stage.

   Reported: `host.dialog` = mois-viewer while it is open.
   ========================================================================= */

const VIEWER_ICON = (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#1d4f91" />
    <text x="8" y="12" textAnchor="middle" fontSize="10" fontStyle="italic" fontWeight="700" fill="#fff">M</text>
  </svg>
)

const sep: PBMenuItem = { sep: true }

function viewerMenus(onClose: () => void) {
  const file: PBMenuItem[] = [
    { label: 'Open...', key: 'Ctrl+O' },
    { label: 'Open from URL...' },
    sep,
    { label: 'Save', key: 'F2', disabled: true },
    { label: 'Save As...', key: 'Ctrl+Shift+S' },
    { label: 'Save Copy As...' },
    sep,
    {
      label: 'New Document',
      menu: [
        { label: 'From Text File...' }, { label: 'From Rich Text Format (RTF) File...' },
        { label: 'From Image File...' }, { label: 'From Scanner...' },
      ],
    },
    sep,
    { label: 'Send by E-mail as ZIP...', menu: [{ label: 'Send by E-mail...' }, { label: 'Send by E-mail as ZIP...' }] },
    sep,
    { label: 'Close', key: 'Ctrl+W', onSelect: onClose },
    { label: 'Close All', onSelect: onClose },
    sep,
    { label: 'Recent Files' },
    sep,
    { label: 'Export' },
    sep,
    { label: 'Form Data' },
    sep,
    { label: 'Print...', key: 'Ctrl+P' },
    sep,
    { label: 'Document Properties...', key: 'Ctrl+D' },
    { label: 'Copy Full File Name' },
    { label: 'Open Containing Folder...' },
    sep,
    { label: 'Exit', disabled: true },
  ]
  const document: PBMenuItem[] = [
    { label: 'Insert Pages...' }, { label: 'Insert Empty Pages...' }, { label: 'Extract Pages...' },
    { label: 'Delete Pages...' }, { label: 'Rotate Pages...' }, { label: 'Crop Pages...' },
    sep,
    { label: 'Signing...' }, { label: 'Attach a File...' }, { label: 'OCR Pages...' },
  ]
  const comments: PBMenuItem[] = [
    { label: 'Flatten Comments...' }, { label: 'Summarize Comments...' },
    sep,
    {
      label: 'Show Comments',
      menu: [
        { label: 'Show Comments List' }, { label: 'Hide All Comments' }, { label: 'Show All Comments' },
        { label: 'Show by Type' }, { label: 'Show by Author' }, { label: 'Open All Pop-Ups' }, { label: 'Close All Pop-Ups' },
      ],
    },
    sep,
    { label: 'Import Comments...' }, { label: 'Export Comments to Data File...' },
    sep,
    { label: 'Show Comments List' }, { label: 'Show Comments Styles Palette' },
  ]
  const tools: PBMenuItem[] = [
    { label: 'Basic' }, { label: 'Zoom' }, { label: 'Comment and Markup' }, { label: 'Measuring' }, { label: 'Link' },
  ]
  return [
    { label: 'File', menu: file },
    { label: 'Edit' },
    { label: 'View', menu: [{ label: 'Toolbars' }] },
    { label: 'Document', menu: document },
    { label: 'Comments', menu: comments },
    { label: 'Tools', menu: tools },
    { label: 'Window' },
  ]
}

/** A flat toolbar button: a glyph, and a caption where the capture has one. */
function Tool({ children, title, drop }: { children: ReactNode; title: string; drop?: boolean }) {
  return (
    <span
      title={title}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 2, height: 22, padding: '0 3px', color: '#1b1b1b' }}
    >
      {children}
      {drop && <span style={{ fontSize: 8, marginLeft: 1 }}>▼</span>}
    </span>
  )
}

/** The zoom control's round green − and + buttons. */
const ZoomGlyph = ({ sign }: { sign: string }) => (
  <span
    aria-hidden="true"
    style={{
      display: 'inline-grid', placeItems: 'center', width: 15, height: 15, borderRadius: '50%',
      background: '#3fa63f', color: '#fff', fontWeight: 700, fontSize: 12, lineHeight: 1,
    }}
  >
    {sign}
  </span>
)

const Grip = () => <span aria-hidden="true" style={{ width: 4, height: 18, margin: '0 3px', borderLeft: '2px dotted #a0a0a0' }} />

export function MoisViewerWindow({
  form, fields, onClose,
}: {
  /** the form's name, printed as the page's title */
  form: string
  /** the Field Data Assignment rows: each is one numbered box on the page */
  fields: DesignerRow[]
  onClose: () => void
}) {
  useScreenReport({ dialog: 'mois-viewer' })
  return (
    /* one work-area-sized track, so the maxima below clamp to the stage */
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 75, gridTemplateColumns: 'minmax(0, 1fr)', gridTemplateRows: 'minmax(0, 1fr)' }}>
      <PBWindow
        child
        icon={VIEWER_ICON}
        title="MOIS Viewer"
        onClose={onClose}
        tutorialId="host.mois.dialog.mois-viewer"
        style={{ width: 1000, height: 690, maxWidth: 'calc(100% - 16px)', maxHeight: 'calc(100% - 16px)' }}
      >
        <PBMenuBar items={viewerMenus(onClose)} />
        <div className="pb-row" style={{ flex: 'none', gap: 0, height: 28, padding: '0 4px', borderBottom: '1px solid #d0d0d0', background: 'var(--pb-face)' }}>
          <Grip />
          <Tool title="Save">💾</Tool>
          <Tool title="Print">🖨</Tool>
          <Tool title="Send by E-mail" drop>✉</Tool>
          <Grip />
          <Tool title="Back"><span style={{ color: '#2e8b2e' }}>◀</span></Tool>
          <Tool title="Forward"><span style={{ color: '#2e8b2e' }}>▶</span></Tool>
          <Grip />
          <Tool title="OCR" drop><b style={{ fontSize: 9, border: '1px solid #555', padding: '0 1px' }}>OCR</b></Tool>
          <Grip />
          <Tool title="Zoom In" drop>🔍 Zoom In</Tool>
          <Grip />
          <Tool title="Actual Size"><span style={{ fontSize: 9, border: '1px solid #3a6ea5', padding: '0 1px' }}>1:1</span></Tool>
          <Tool title="Fit Page"><span style={{ fontSize: 10, border: '1px solid #3a6ea5', padding: '0 2px' }}>⤢</span></Tool>
          <Tool title="Fit Width"><span style={{ fontSize: 10, border: '1px solid #3a6ea5', padding: '0 2px' }}>↔</span></Tool>
          <Grip />
          <span className="pb-field" style={{ width: 44, height: 18, display: 'inline-flex', alignItems: 'center', padding: '0 3px' }}>100%</span>
          <span style={{ fontSize: 8, margin: '0 6px 0 2px' }}>▼</span>
          <Tool title="Zoom Out"><ZoomGlyph sign="−" /></Tool>
          <span aria-hidden="true" style={{ width: 72, height: 2, margin: '0 4px', background: '#b0b0b0', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 30, top: -5, width: 8, height: 12, background: '#e8e8e8', border: '1px solid #808080' }} />
          </span>
          <Tool title="Zoom In"><ZoomGlyph sign="+" /></Tool>
        </div>

        {/* the desk and the page */}
        <div
          data-tutorial-id="host.mois.field.viewer-page"
          style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#9a9a9a', padding: '0 16px' }}
        >
          <div
            style={{
              width: 'min(760px, 100%)', margin: '0 auto', minHeight: '100%', background: '#fff',
              boxShadow: '0 0 0 1px #6a6a6a, 2px 2px 4px rgba(0,0,0,.35)', padding: '14px 28px 28px',
              color: '#000', fontFamily: 'Arial, Helvetica, sans-serif',
            }}
          >
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
          </div>
        </div>

        <div className="pb-row" style={{ flex: 'none', height: 18, gap: 8, padding: '0 6px', background: 'var(--pb-face)', borderTop: '1px solid #c0c0c0' }}>
          <span style={{ width: 96 }}>8.27 x 11.69 in</span>
          <span style={{ flex: '1 1 auto', height: 12, background: '#f0f0f0', border: '1px solid #d8d8d8' }} />
        </div>
        <div className="pb-row" style={{ flex: 'none', height: 26, gap: 4, padding: '0 4px', background: 'var(--pb-face)', borderTop: '1px solid #d0d0d0' }}>
          <Grip />
          <Tool title="Options" drop><span style={{ color: '#d4a000' }}>⚑</span> Options</Tool>
        </div>
        <div style={{ flex: 'none', height: 22, display: 'flex', alignItems: 'center', padding: '0 6px', background: 'var(--pb-face)', borderTop: '1px solid #d0d0d0' }}>
          Ready
        </div>
      </PBWindow>
    </div>
  )
}
