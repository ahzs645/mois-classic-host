import { useState, type DragEvent, type ReactNode } from 'react'
import { useEfaxAccounts, useFaxLog, nowStamp, useSrfaxEnabled } from '../data/letterDocs'
import type { AddressBookEntry } from '../data/addressBook'
import { usePatient } from '../data/patient-context'
import { useScreenReport } from '../host/screen-state'
import {
  PBButton, PBDataWindow, PBMenuBar, PBMessageBox, PBTabs, PBWindow, pbSlug, usePBInstrumentation, type PBMenuItem,
} from '../pb'
import { AddressBookWindow } from './AddressBookWindow'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { ModalLayer, ModalWindow } from './dialogKit'

/* ============================================================================
   The MOIS Viewer's own sub-windows and its bottom toolbar
   (screens/MoisViewerWindow.tsx draws the viewer).

     send-efax            2616562 `a38e5ffb…` — Send eFax: the "eFax Account"
                          band ("Fax:SRFax  Test (139663)  250.277.3594" and a
                          blue Change... link), the "Recipient List" band with
                          New / Delete at its right, a Recipient · Fax grid
                          whose row ends in a "…" (the Address Book,
                          `1f459f81…`), Send / Cancel. "You must enter a
                          Recipient and fax number … Pressing 'Send' will
                          distribute the fax electronically via the SRFax
                          account assigned in the window." Send queues it
                          (the "Success: Fax Queued" box, `c85ea0f7…`).
     customize-toolbars   304734 `da4862fc…` — Customize Toolbars: tabs
                          Toolbars · Commands · Options; the Commands tab's
                          sentence, Categories: and Commands: lists, New...
                          (grey) / Properties, Reset All / Close. "Drag the
                          selected item onto the MOIS toolbar to the location
                          you want" (`c15f6dde…`): a dragged command dropped
                          on the viewer's first toolbar is added there. The
                          Toolbars and Options tabs are not captured; the
                          Toolbars tab lists the View ▸ Toolbars names
                          (INFERRED), Options is empty.
     bottom toolbar       304734 `5d1a2af1…` (Options ▾ · Show Fields Pane ·
                          Highlight Form Fields ▾ | the Pages Navigation bar
                          |< < [1] of 2 > >| · back · forward | the Pages
                          Layout icons | Launch), `594e0cda…` (Options ▸ View
                          ▸ Bookmarks … Launch Toolbar) and `cbd0bd6c…`
                          (Highlight Form Fields' list).
   Also registered by id: `send-efax` (Send eFax, for E2's Inbound Documents
   Fax button) and `fax-queued` (the Success: Fax Queued box).
   ========================================================================= */

/* --- Send eFax -------------------------------------------------------------- */
type FaxRow = { recipient: string; fax: string }

export function SendEfaxWindow({ title, onClose }: { title: string; onClose: () => void }) {
  const host = usePBInstrumentation()
  const p = usePatient()
  const [accounts] = useEfaxAccounts()
  const [, queue] = useFaxLog()
  const [account, setAccount] = useState(0)
  const [rows, setRows] = useState<FaxRow[]>([{ recipient: '', fax: '' }])
  const [cur, setCur] = useState(0)
  const [book, setBook] = useState(false)
  const [message, setMessage] = useState<'queued' | 'missing' | null>(null)
  const acct = accounts[account]
  useScreenReport({ dialog: book ? 'address-book' : 'send-efax', efaxRecipients: rows.filter((r) => r.recipient && r.fax).length })
  const edit = (i: number, key: keyof FaxRow, value: string) => setRows((all) => all.map((r, j) => (j === i ? { ...r, [key]: value } : r)))
  const send = () => {
    const ready = rows.filter((r) => r.recipient.trim() && r.fax.trim())
    if (!ready.length || !acct) { setMessage('missing'); return }
    ready.forEach((r) => queue({ date: nowStamp(), chart: p.chart, title, recipient: r.recipient, fax: r.fax, status: 'QUEUED', from: 'viewer' }))
    setMessage('queued')
  }
  const cell = (i: number, key: keyof FaxRow, w?: number) => (
    <input
      className="pb-field"
      value={rows[i]![key]}
      onChange={(e) => edit(i, key, e.target.value)}
      data-tutorial-id={`host.mois.field.efax-${key}-${i}`}
      style={{ width: w ?? '100%', border: 0, background: i === cur ? '#ffc09c' : 'transparent', padding: '0 3px' }}
    />
  )
  return (
    <ModalLayer zIndex={92}>
      <PBWindow child controls={false} title="Send eFax" onClose={onClose} tutorialId="host.mois.dialog.send-efax" style={{ width: 650, height: 390, maxWidth: 'calc(100% - 16px)' }}>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '10px 14px 0', background: 'var(--pb-face)' }}>
          <div style={{ border: '1px solid #a0a0a0', background: '#fff', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
            <div className="pb-band">eFax Account</div>
            <div className="pb-row" style={{ gap: 18, padding: '3px 8px', borderBottom: '1px solid #c8c8c8' }} data-tutorial-id="host.mois.field.efax-account">
              <span>Fax:SRFax</span>
              <span>{acct ? `${acct.alias}  (${acct.account})` : '(no eFax account)'}</span>
              <span>{acct?.fax.replace(/-/g, '.') ?? ''}</span>
              <span className="pb-row__spacer" />
              <button type="button" className="pb-link" style={{ color: '#0000ff', textDecoration: 'underline' }}
                data-tutorial-id={host?.anchor('command', 'efax-change')}
                onClick={() => { host?.report('command', { command: 'efax-change' }); setAccount((a) => (accounts.length ? (a + 1) % accounts.length : 0)) }}>
                Change...
              </button>
            </div>
            <div className="pb-band">
              <span>Recipient List</span><span className="pb-band__spacer" />
              <PBButton size="sm" style={{ width: 60 }} command="efax-new" onClick={() => { setRows((r) => [...r, { recipient: '', fax: '' }]); setCur(rows.length) }}>New</PBButton>
              <PBButton size="sm" style={{ width: 60 }} command="efax-delete" onClick={() => { setRows((r) => (r.length > 1 ? r.filter((_, j) => j !== cur) : [{ recipient: '', fax: '' }])); setCur(0) }}>Delete</PBButton>
            </div>
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
              <PBDataWindow
                rows={rows}
                current={cur}
                onCurrentChange={setCur}
                rowTutorialId={(_r, i) => `host.mois.row.efax-recipient-${i}`}
                columns={[
                  { key: 'recipient', header: 'Recipient', width: 380, render: (_r, i) => cell(i, 'recipient') },
                  { key: 'fax', header: 'Fax', width: 120, render: (_r, i) => cell(i, 'fax') },
                  {
                    key: 'dots', header: '', width: 20, align: 'center',
                    render: (_r, i) => (
                      <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--dots"
                        data-tutorial-id={host?.anchor('lookup', `efax-recipient-${i}`)}
                        onClick={() => { setCur(i); setBook(true) }}>…</button>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </div>
        <div className="pb-footer">
          <span className="pb-footer__spacer" />
          <PBButton wide className="pb-btn--default" command="efax-send" onClick={send}>Send</PBButton>
          <PBButton wide command="efax-cancel" onClick={onClose}>Cancel</PBButton>
          <span className="pb-footer__spacer" />
        </div>
      </PBWindow>
      {book && (
        <AddressBookWindow
          mode="recipient"
          onClose={() => setBook(false)}
          onSelect={(e: AddressBookEntry) => {
            /* "ensure to include the country code in front of the fax number" */
            setRows((all) => all.map((r, j) => (j === cur ? { recipient: e.name, fax: e.fax ? (e.fax.startsWith('1') ? e.fax : `1${e.fax}`) : r.fax } : r)))
            setBook(false)
          }}
        />
      )}
      {message === 'queued' && (
        <PBMessageBox title="Success: Fax Queued" buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.fax-queued-ok' }]} onClose={() => { setMessage(null); onClose() }}>
          Successfully queued file to SRFax.<br />Please check your SRFax account for the faxing status.
        </PBMessageBox>
      )}
      {message === 'missing' && (
        <PBMessageBox title="Send eFax" icon="warn" buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.efax-missing-ok' }]} onClose={() => setMessage(null)}>
          You must enter a Recipient and a fax number.
        </PBMessageBox>
      )}
    </ModalLayer>
  )
}

/* --- Customize Toolbars ----------------------------------------------------- */
export const TOOLBAR_NAMES = [
  'File Toolbar', 'Standard Toolbar', 'Zoom Toolbar', 'Find Toolbar', 'Rotate View Toolbar', 'Comment And Markup Toolbar',
  'Links Editor Toolbar', 'Measuring Toolbar', 'Document Options Toolbar', 'Pages Navigation Toolbar', 'Pages Layout Toolbar',
  'Launch Toolbar', 'Properties Toolbar',
]

const CATEGORIES: Record<string, string[]> = {
  Comments: ['Flatten Comments', 'Show Comments List', 'Summarize Comments'],
  Document: ['Crop Pages', 'Delete Pages', 'Extract Pages', 'Insert Pages', 'Rotate Pages'],
  Edit: ['Copy', 'Cut', 'Find', 'Paste', 'Undo'],
  File: ['Open', 'Print', 'Save', 'Save As'],
  Format: ['Align Left', 'Align Right', 'Center'],
  Help: ['Contents', 'Home Page'],
  'Java Script Console': ['Show Java Script Console'],
  /* `da4862fc…`, the list as captured from its visible top */
  Tools: [
    'Show Comments Styles Palette', 'Show Stamps Palette', 'Sign Document', 'Snapshot Tool', 'Stamp Tool', 'Sticky Note Tool',
    'Text Box Tool', 'Typewriter Tool', 'Underline Text', 'Underline Text Tool', 'Validate All Signatures', 'Zoom In Tool', 'Zoom Out Tool',
  ],
  View: ['Actual Size', 'Fit Page', 'Fit Width', 'Full Screen'],
  Window: ['Close All Documents', 'Tile Horizontally', 'Tile Vertically'],
}

export const DRAG_COMMAND_TYPE = 'application/x-mois-viewer-command'

export function CustomizeToolbarsDialog({ visible, onToggle, onReset, onClose }: {
  visible: Record<string, boolean>
  onToggle: (name: string) => void
  onReset: () => void
  onClose: () => void
}) {
  const [tab, setTab] = useState('Commands')
  const [category, setCategory] = useState('Tools')
  const [command, setCommand] = useState('Text Box Tool')
  useScreenReport({ dialog: 'customize-toolbars', viewerCategory: pbSlug(category), viewerCommand: pbSlug(command) })
  const list = (items: string[], selected: string, pick: (s: string) => void, prefix: string, drag = false) => (
    <div style={{ flex: '1 1 auto', overflow: 'auto', background: '#fff', border: '1px solid #9a9a9a' }}>
      {items.map((it) => (
        <div
          key={it}
          draggable={drag}
          onDragStart={drag ? (e: DragEvent<HTMLDivElement>) => { e.dataTransfer.setData(DRAG_COMMAND_TYPE, it); e.dataTransfer.setData('text/plain', it) } : undefined}
          data-tutorial-id={`host.mois.row.${prefix}-${pbSlug(it)}`}
          onMouseDown={() => pick(it)}
          style={{ padding: '3px 8px', background: it === selected ? '#cce8ff' : undefined, border: it === selected ? '1px solid #99d1ff' : '1px solid transparent', cursor: 'default' }}
        >
          {it}
        </div>
      ))}
    </div>
  )
  return (
    <ModalWindow id="customize-toolbars" title="Customize Toolbars" onClose={onClose} zIndex={92}
      windowStyle={{ width: 778, height: 647, maxWidth: 'calc(100% - 16px)', maxHeight: 'calc(100% - 16px)' }}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 12, background: 'var(--pb-face)' }}>
        <PBTabs tabs={['Toolbars', 'Commands', 'Options']} active={tab} onChange={setTab} compact>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: 10, gap: 8 }}>
            {tab === 'Commands' && (
              <>
                <div>To add a command, drag the command from the Commands list and drop the command on the target toolbar or menu.</div>
                <div style={{ display: 'flex', gap: 10, flex: '1 1 auto', minHeight: 0 }}>
                  <div style={{ width: 176, display: 'flex', flexDirection: 'column' }}>
                    <div>Categories:</div>
                    {list(Object.keys(CATEGORIES), category, (c) => { setCategory(c); setCommand(CATEGORIES[c]![0]!) }, 'viewer-category')}
                  </div>
                  <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
                    <div>Commands:</div>
                    {list(CATEGORIES[category]!, command, setCommand, 'viewer-command', true)}
                    <div className="pb-row" style={{ justifyContent: 'flex-end', gap: 10, paddingTop: 8 }}>
                      <PBButton wide disabled>New...</PBButton>
                      <PBButton wide command="customize-properties">Properties</PBButton>
                    </div>
                  </div>
                </div>
              </>
            )}
            {tab === 'Toolbars' && (
              <div style={{ flex: '1 1 auto', overflow: 'auto', background: '#fff', border: '1px solid #9a9a9a', padding: 4 }}>
                {TOOLBAR_NAMES.map((n) => (
                  <label key={n} className="pb-check" style={{ display: 'flex', padding: '2px 4px' }}>
                    <input type="checkbox" checked={!!visible[n]} onChange={() => onToggle(n)} data-tutorial-id={`host.mois.field.toolbar-${pbSlug(n)}`} />
                    <span className="pb-check__box" /><span className="pb-check__label">{n}</span>
                  </label>
                ))}
              </div>
            )}
            {tab === 'Options' && <div style={{ color: '#606060' }}>Show ScreenTips on toolbars.</div>}
          </div>
        </PBTabs>
      </div>
      <div className="pb-footer">
        <PBButton wide command="customize-reset-all" onClick={onReset}>Reset All</PBButton>
        <span className="pb-footer__spacer" />
        <PBButton wide className="pb-btn--default" command="customize-close" onClick={onClose}>Close</PBButton>
      </div>
    </ModalWindow>
  )
}

/* --- the bottom toolbar ----------------------------------------------------- */
const Glyph = ({ children, title, onClick, pressed, id }: { children: ReactNode; title: string; onClick?: () => void; pressed?: boolean; id: string }) => {
  const host = usePBInstrumentation()
  return (
    <button type="button" title={title} aria-pressed={pressed || undefined} data-tutorial-id={host?.anchor('command', `viewer-${id}`)}
      onClick={() => { host?.report('command', { command: `viewer-${id}` }); onClick?.() }}
      style={{ height: 22, minWidth: 22, padding: '0 3px', border: pressed ? '1px solid #c9a24a' : '1px solid transparent', background: pressed ? 'linear-gradient(#fdf3d0, #f6dc90)' : 'none', font: 'inherit', cursor: 'default' }}>
      {children}
    </button>
  )
}

export function ViewerBottomToolbar({ show, fieldsPane, onFieldsPane, onToggleToolbar, visible }: {
  /** which of the four bottom toolbars are on */
  show: { options: boolean; navigation: boolean; layout: boolean; launch: boolean }
  fieldsPane: boolean
  onFieldsPane: () => void
  onToggleToolbar: (name: string) => void
  visible: Record<string, boolean>
}) {
  const [highlight, setHighlight] = useState(true)
  const tick = (on: boolean, label: string) => `${on ? '✓ ' : '   '}${label}`
  const optionsMenu: PBMenuItem[] = [
    {
      label: 'View',
      menu: [
        { label: 'Bookmarks', key: 'Ctrl+B' }, { label: 'Pages Thumbnails', key: 'Ctrl+T' }, { label: 'Layers', key: 'Ctrl+L' },
        { label: 'Fields', key: 'Ctrl+I', onSelect: onFieldsPane }, { label: 'Comments', key: 'Ctrl+M' }, { label: 'Attachments', key: 'Ctrl+Shift+A' },
        { sep: true },
        ...['Document Options Toolbar', 'Pages Navigation Toolbar', 'Pages Layout Toolbar', 'Launch Toolbar'].map((n) => ({ label: tick(!!visible[n], n), onSelect: () => onToggleToolbar(n) })),
      ],
    },
    { sep: true },
    { label: 'Full Screen', key: 'F11', disabled: true },
    { label: 'Show/Hide All Bars', key: 'F12' },
    { sep: true },
    { label: 'Document Properties...', key: 'Ctrl+D' },
  ]
  const highlightMenu: PBMenuItem[] = [
    { label: 'Highlight Form Fields', key: 'Ctrl+H', onSelect: () => setHighlight((h) => !h) },
    { sep: true },
    ...['List Boxes', 'Text Boxes', 'Radio Buttons', 'Signature Fields'].map((l) => ({ label: tick(true, l) })),
    { label: tick(false, 'Push Buttons') },
    { sep: true },
    { label: 'Required Fields Only' },
  ]
  if (!show.options && !show.navigation && !show.layout && !show.launch) return null
  return (
    <div data-tutorial-id="host.mois.group.viewer-bottom-toolbar" className="pb-row" style={{ flex: 'none', gap: 4, height: 28, padding: '0 6px', background: 'linear-gradient(#fbfbfb, #eeeeee)', borderTop: '1px solid #dadada' }}>
      {show.options && (
        <span className="pb-row" style={{ gap: 2 }} data-tutorial-id="host.mois.group.viewer-options">
          <PBMenuBar items={[{ label: '⚑ Options', menu: optionsMenu }]} />
          <Glyph id="show-fields-pane" title="Show Fields Pane" pressed={fieldsPane} onClick={onFieldsPane}>▤</Glyph>
          <PBMenuBar items={[{ label: highlight ? '💡▾' : '○▾', menu: highlightMenu }]} />
        </span>
      )}
      <span className="pb-row__spacer" />
      {show.navigation && (
        <span className="pb-row" style={{ gap: 2 }} data-tutorial-id="host.mois.group.viewer-pages-navigation">
          <Glyph id="first-page" title="First Page">⏮</Glyph><Glyph id="previous-page" title="Previous Page">◀</Glyph>
          <span className="pb-field" style={{ width: 40, padding: '0 4px', textAlign: 'center' }}>1</span><span>of 1</span>
          <Glyph id="next-page" title="Next Page">▶</Glyph><Glyph id="last-page" title="Last Page">⏭</Glyph>
        </span>
      )}
      <span className="pb-row__spacer" />
      {show.layout && (
        <span className="pb-row" style={{ gap: 2 }} data-tutorial-id="host.mois.group.viewer-pages-layout">
          <Glyph id="single-page" title="Single Page">▯</Glyph><Glyph id="continuous" title="Continuous">▥</Glyph>
          <Glyph id="facing" title="Facing">▯▯</Glyph><Glyph id="continuous-facing" title="Continuous Facing">▥▥</Glyph>
        </span>
      )}
      {show.launch && (
        <span data-tutorial-id="host.mois.group.viewer-launch">
          <Glyph id="launch-adobe" title="Open in Adobe Reader"><span style={{ color: '#c8242c', fontWeight: 700 }}>A</span></Glyph>
        </span>
      )}
    </div>
  )
}

/* --- fax-queued --------------------------------------------------------------
   2616562 `c85ea0f7…`: "Success: Fax Queued — Successfully queued file to
   SRFax. Please check your SRFax account for the faxing status." — what a
   prescription's Sign and Fax raises after Accept. Opened by id so the
   Prescriptions window (another stream's) only has to name it. */
function FaxQueuedBox({ close }: AreaWindowProps) {
  useScreenReport({ dialog: 'fax-queued' })
  return (
    <PBMessageBox title="Success: Fax Queued" buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.fax-queued-ok' }]} onClose={close}>
      Successfully queued file to SRFax.<br />Please check your SRFax account for the faxing status.
    </PBMessageBox>
  )
}
registerAreaWindow('fax-queued', FaxQueuedBox)

/* --- send-efax by id -----------------------------------------------------------
   The same Send eFax, opened by name — Data Exchange ▸ Inbound Documents'
   Fax button (stream E2) and `host.mois.openUtility {window: 'send-efax'}`.
   `args.title` (or E2's `args.files`) names what is being faxed. Gated like the Viewer's button:
   with APP SETTING - SRFAX ▸ Enabled = N it explains instead of opening. */
function SendEfaxById({ args, close }: AreaWindowProps) {
  const srfax = useSrfaxEnabled()
  if (!srfax) {
    return (
      <PBMessageBox title="Send eFax" icon="warn" buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.efax-disabled-ok' }]} onClose={close}>
        SRFax is not enabled. Set APP SETTING - SRFAX ▸ Enabled to Y in System Settings and restart MOIS.
      </PBMessageBox>
    )
  }
  return <SendEfaxWindow title={typeof args.title === 'string' ? args.title : typeof args.files === 'string' && args.files ? args.files : 'Document'} onClose={close} />
}
registerAreaWindow('send-efax', SendEfaxById)
