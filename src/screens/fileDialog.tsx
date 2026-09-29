import { useRef, useState, type ReactNode } from 'react'
import { PBDataWindow, PBInput, PBSelect } from '../pb'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   Win32FileDialog — the Windows Open / Save As common dialog, as MOIS
   raises it (Browse…, Export To…, Select Import File, Load from File).

   MOIS does not draw this window; Windows does, so no MOIS capture defines
   it, and the screens drew five different stand-ins. The canonical look is
   the most complete of them, QuickEntryWindows' FileDialog (INFERRED): Look
   in / Save in ▾ over a places bar (Home · Desktop · Libraries · This PC ·
   Network) beside the file list, then File name [ ] [Open] / Files of type
   ▾ [Cancel] in a 92px · 1fr · 90px grid, and — its addition — "From this
   computer..." to hand a real file from the learner's disk to the lesson
   (`onLocal`). With its defaults and QuickEntry's props it renders that
   copy's markup exactly.

   `view="details"` lists Name · Type · Size in a DataWindow instead of the
   plain list — the Details view of the same Windows dialog, and the shape
   of the one stand-in that cites a capture: ChartBasicsWindows'
   SelectFileDialog (art. 303794 `145afabe…png`, Chart Navigator ▸ Load
   from File). NB: that copy is the exception to "all INFERRED".

   Anchors (defaults, from QuickEntry's copy; `id` names the dialog):
     window   host.mois.dialog.<id>
     rows     host.mois.row.<id>-file        (every row — as drawn; pass
                                             `rowAnchor` for one per file)
     name box host.mois.field.<id>-name
     buttons  host.mois.command.<id>-<mode> · <id>-cancel · <id>-local
     picker   host.mois.field.<id>-local     (the hidden <input type=file>)

   MIGRATION:
   · QuickEntryWindows ~191 FileDialog — exact:
       id={mode === 'save' ? 'qe-export-to' : 'qe-select-import-file'}
       title={mode === 'save' ? 'Export To...' : 'Select Import File'} zIndex={97}
       initialName={initial} files={files} extension=".7z"
       empty={mode === 'open' ? 'No 7z files in this folder.' : ''}
       fileTypes={[mode === 'save' ? 'All Files (*.*)' : '7z Files (*.7z)']}
       onDone={(name) => onDone(`${DESKTOP_DIR}${name}`)} onLocal={onLocal}
       localHint="a MOIS Quick Entry export (.7z) or its quick_entrys.xml" localAccept=".7z,.xml"
   · ChartBasicsWindows ~261 SelectFileDialog — NOT exact (a pb-form grid of
       80px · 1fr · 90px in a DemographicModal, no places bar, CmdButtons);
       closest: frame=DemographicModal "Select File" 640×330 'select-file',
       places={false} lookIn={['Desktop']} view="details" initialName="CHART"
       fileTypes={['CSV Files (*.csv)', 'All Files (*.*)']} + onFileTypeChange
       filtering the list, rowAnchor={(f) => `host.mois.row.file-${f.name.toLowerCase()}`},
       okCommand="select-file-open" cancelCommand="select-file-cancel".
   · ConceptTransferWindows ~180 FileDialog — NOT exact (Line rows, a
       headless DataWindow, CentredFooter): frame=DemographicModal
       ('open-concept-file' / 'save-concept-file'), places={false},
       lookIn={['Concept Exports']}, files by name, fileTypes={['Concept
       Files (*.txt)']}, initialName save 'CONCEPTS EXPORT.txt', okCommand
       'open' / 'save', cancelCommand 'file-cancel', field anchor 'file-name'
       via nameAnchor.
   · UserAgreementWindows ~87 PdfBrowse, AdminUtilityWindows ~181 (Open) and
       ~200 (Save As) — NOT exact (DetailWindow + Btn, "Look in: <b>MOIS
       Cloud Files</b>" as text, the Save As with no list): frame=DetailWindow
       (buttons omitted — the dialog draws its own), lookIn={['MOIS Cloud
       Files']}, places={false}, okCommand / cancelCommand = the copies'
       (agreement-browse-open / -cancel, sql-open / sql-open-cancel, sql-save /
       sql-save-cancel), rowAnchor per copy; the SQL Save As passes files={[]}
       and its format list as fileTypes.
   Moving the NOT-exact copies onto this is a visible change: each would take
   on the canonical dialog's layout. Decide that per copy.
   ========================================================================= */

export type Win32File = { name: string; type?: string; size?: string }

const PLACES = ['Home', 'Desktop', 'Libraries', 'This PC', 'Network']
const LOOK_IN = ['Desktop', 'Documents', 'This PC']
const PICKED = '#cce8ff'

export function Win32FileDialog({
  id, mode, title, width = 640, height = 400, zIndex, onClose, frame,
  lookIn = LOOK_IN, initialPlace = 'Desktop', places = PLACES,
  files, view = 'list', empty = '', initialName = '', extension,
  fileTypes = ['All Files (*.*)'], fileType, onFileTypeChange,
  onDone, onLocal, localLabel = 'From this computer...', localHint, localAccept,
  rowAnchor, nameAnchor, okCommand, cancelCommand,
}: {
  /** names the dialog and seeds every anchor */
  id: string
  mode: 'open' | 'save'
  /** default: Windows' own "Open" / "Save As" */
  title?: string
  width?: number
  height?: number
  zIndex?: number
  onClose: () => void
  /** host the body in another frame (the default is a WorkspaceDialogFrame
      without min / max boxes) */
  frame?: (content: ReactNode) => ReactNode
  /** Look in / Save in ▾ */
  lookIn?: string[]
  initialPlace?: string
  /** the places bar; `false` leaves it out */
  places?: string[] | false
  files: (string | Win32File)[]
  /** 'list' = the plain file list; 'details' = Name · Type · Size */
  view?: 'list' | 'details'
  /** what an empty list says */
  empty?: ReactNode
  initialName?: string
  /** the files' extension (".7z"): shown without it, handed back with it */
  extension?: string
  /** Files of type / Save as type ▾ */
  fileTypes?: string[]
  fileType?: string
  onFileTypeChange?: (type: string) => void
  /** Open / Save, or a double-clicked file: the chosen file's name */
  onDone: (name: string) => void
  /** a file picked from the learner's own computer (draws the button) */
  onLocal?: (file: File) => void
  localLabel?: string
  localHint?: ReactNode
  localAccept?: string
  rowAnchor?: (file: Win32File) => string
  /** the File name box's anchor slug (`host.mois.field.<slug>`) */
  nameAnchor?: string
  okCommand?: string
  cancelCommand?: string
}) {
  const listed = files.map((f) => (typeof f === 'string' ? { name: f } : f))
  const ext = extension ? new RegExp(extension.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') : null
  const shown = (name: string) => (ext ? name.replace(ext, '') : name)
  const chosen = (name: string) => (ext && extension ? `${name.replace(ext, '')}${extension}` : name)
  const [place, setPlace] = useState(initialPlace)
  const [name, setName] = useState(initialName)
  const picker = useRef<HTMLInputElement>(null)
  const save = mode === 'save'
  const rowId = rowAnchor ?? (() => `host.mois.row.${id}-file`)
  const current = listed.findIndex((f) => shown(f.name) === name)

  const list = view === 'details'
    ? (
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow<Win32File>
          gutter={false}
          rows={listed}
          current={Math.max(0, current)}
          onCurrentChange={(i) => listed[i] && setName(shown(listed[i].name))}
          onActivate={(f) => onDone(f.name)}
          rowTutorialId={(f) => rowId(f)}
          columns={[
            { key: 'name', header: 'Name', width: 180 },
            { key: 'type', header: 'Type' },
            { key: 'size', header: 'Size', width: 80, align: 'right' },
          ]}
          empty={empty || ' '}
        />
      </div>
    )
    : (
      <div style={{ flex: '1 1 auto', background: '#fff', border: '1px solid #9a9a9a', padding: 4, overflow: 'auto' }}>
        {listed.length === 0 && <div style={{ color: '#6d6d6d', padding: 6 }}>{empty}</div>}
        {listed.map((f) => (
          <div key={f.name} data-tutorial-id={rowId(f)} onClick={() => setName(shown(f.name))}
            onDoubleClick={() => onDone(f.name)}
            style={{ padding: '4px 6px', background: name === shown(f.name) ? PICKED : undefined, cursor: 'default' }}>
            {f.name}
          </div>
        ))}
      </div>
    )

  const content = (
    <>
      <div className="pb-row" style={{ padding: '8px 10px', flex: 'none' }}>
        <span style={{ width: 64 }}>{save ? 'Save in:' : 'Look in:'}</span>
        <PBSelect w={300} options={lookIn} value={place} onChange={(e) => setPlace(e.target.value)} />
      </div>
      <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, gap: 6, padding: '0 10px' }}>
        {places && (
          <div style={{ width: 100, flex: 'none', background: '#fff', border: '1px solid #9a9a9a', padding: 4 }}>
            {places.map((p) => (
              <div key={p} onClick={() => setPlace(p)}
                style={{ padding: '8px 4px', textAlign: 'center', cursor: 'default', background: place === p ? PICKED : undefined }}>{p}</div>
            ))}
          </div>
        )}
        {list}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr 90px', gap: 6, padding: '8px 10px', alignItems: 'center', flex: 'none' }}>
        <span>File name:</span>
        <PBInput w="100%" value={name} data-tutorial-id={`host.mois.field.${nameAnchor ?? `${id}-name`}`} onChange={(e) => setName(e.target.value)} />
        <DialogButton id={okCommand ?? `${id}-${mode}`} width={84} isDefault onClick={() => name.trim() && onDone(chosen(name.trim()))}>
          {save ? 'Save' : 'Open'}
        </DialogButton>
        <span>{save ? 'Save as type:' : 'Files of type:'}</span>
        <PBSelect w="100%" options={fileTypes} value={fileType} onChange={onFileTypeChange ? (e) => onFileTypeChange(e.target.value) : undefined} />
        <DialogButton id={cancelCommand ?? `${id}-cancel`} width={84} onClick={onClose}>Cancel</DialogButton>
      </div>
      {onLocal && (
        <div className="pb-row" style={{ padding: '0 10px 8px', flex: 'none' }}>
          <DialogButton id={`${id}-local`} width={150} onClick={() => picker.current?.click()}>{localLabel}</DialogButton>
          {localHint != null && <span style={{ color: '#6d6d6d' }}>{localHint}</span>}
          <input ref={picker} type="file" accept={localAccept} hidden data-tutorial-id={`host.mois.field.${id}-local`}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onLocal(f) }} />
        </div>
      )}
    </>
  )

  if (frame) return <>{frame(content)}</>
  return (
    <WorkspaceDialogFrame id={id} title={title ?? (save ? 'Save As' : 'Open')} width={width} height={height} onClose={onClose} controls={false} zIndex={zIndex}>
      {content}
    </WorkspaceDialogFrame>
  )
}
