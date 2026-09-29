import { useState } from 'react'
import { PBCheckbox, PBDataWindow, PBInput, PBSelect, pbSlug } from '../pb'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import { CentredFooter, Cmd, Line } from './adminKit'
import { DemographicModal } from './DemographicDialogs'
import { SelectAllPair, useTickSet } from './listKit'
import { StageMessageBox } from './StageWindow'

/* ============================================================================
   Designer Section ▸ Concept Mapping ▸ Import Concepts / Export Concepts.

   PROVENANCE: 302269 "Concept Mapping", New Taskbar Options — "Import
   Concepts: Allows you to select a file from a folder to import concepts
   (For example: from another clinic)"; "Export Concepts: Allows you to
   export certain concepts (select by checking the boxes next to them) to a
   selected file". The two buttons are on the Concept Mapping List's command
   row (`251267e4…`, DesignerSectionView).

   INFERRED — neither window is captured anywhere in the manual:
     · Import: the Windows "Open" file dialog (Look in, the folder's files,
       File name, Files of type, Open / Cancel), then an "Import Concepts"
       list of what the file holds — Select · Group · Concept · Description
       · HM Item · Type, a concept already on the list flagged "exists" and
       left unticked — Select All / Unselect All, Import / Cancel. Import
       adds the ticked concepts to the list; a message says how many.
     · Export: an "Export Concepts" list of the clinic's concepts with the
       Select ticks the article describes, Select All / Unselect All,
       Export... / Cancel; Export... raises the Windows "Save As" dialog
       (File name, Save as type), and Save confirms how many were written.
       An exported file is kept for the stage session, so it is in the Open
       dialog's folder when the learner imports.

   The files in the folder are fictional ("another clinic").

   Anchors: dialogs open-concept-file, import-concepts, export-concepts,
   save-concept-file, concept-transfer-done; fields concept-file-<slug>,
   file-name, select-concept-<slug>; commands open, save, cancel,
   select-all, unselect-all, import, export.
   ========================================================================= */

export type ConceptRow = Record<string, string | boolean | undefined>

type ConceptFile = { name: string; concepts: ConceptRow[] }

const c = (group: string, concept: string, desc: string, type: 'GRP' | 'SYM', hm = false): ConceptRow => ({ group, concept, desc, hm, type })

const FOLDER_FILES: ConceptFile[] = [
  {
    name: 'VANDERHOOF CLINIC CONCEPTS.txt',
    concepts: [
      c('HEALTH ISSUE', 'CHRONIC KIDNEY DISEASE', 'CHRONIC KIDNEY DISEASE', 'SYM', true),
      c('HEALTH ISSUE', 'DEPRESSION', 'DEPRESSION', 'SYM', true),
      c('HEALTH ISSUE', 'DIABETES', 'DIABETES', 'SYM', true),
      c('MEASURE', 'CHOLESTEROL', 'CHOLESTEROL', 'GRP'),
      c('CONSULT', 'NEPHROLOGY ASSESSMENT', 'NEPHROLOGY ASSESSMENT', 'SYM', true),
    ],
  },
  {
    name: 'HOME CARE CONCEPTS.txt',
    concepts: [
      c('INTERVENTION', 'WOUND CARE', 'WOUND CARE VISITS', 'GRP'),
      c('PROCEDURE', 'FOOT EXAM', 'DIABETIC FOOT EXAMINATION', 'SYM', true),
    ],
  },
]

/** Files this session's Export Concepts wrote, so Import can read them back. */
const EXPORTED_KEY = 'admin:concept-files'

export function ConceptTransfer({ mode, concepts, onImported, onClose }: {
  mode: 'import' | 'export'
  /** the Concept Mapping List as it stands */
  concepts: ConceptRow[]
  onImported: (rows: ConceptRow[]) => void
  onClose: () => void
}) {
  const [exported, setExported] = useSessionState<ConceptFile[]>(EXPORTED_KEY, [])
  const [step, setStep] = useState<'pick' | 'list' | 'save' | 'done'>(mode === 'import' ? 'pick' : 'list')
  const [file, setFile] = useState<ConceptFile | null>(null)
  const picked = useTickSet()
  const [message, setMessage] = useState('')
  const exists = (r: ConceptRow) => concepts.some((x) => x.group === r.group && x.concept === r.concept)
  const listed = mode === 'import' ? file?.concepts ?? [] : concepts
  useScreenReport({ conceptTransfer: `${mode}-${step}`, conceptsPicked: picked.size })

  if (step === 'pick') {
    return (
      <FileDialog
        mode="open"
        files={[...FOLDER_FILES, ...exported]}
        onOk={(name) => {
          const f = [...FOLDER_FILES, ...exported].find((x) => x.name === name)
          if (!f) return
          setFile(f)
          picked.selectAll(f.concepts.map((r, i) => (exists(r) ? -1 : i)).filter((i) => i >= 0))
          setStep('list')
        }}
        onClose={onClose}
      />
    )
  }
  if (step === 'save') {
    return (
      <FileDialog
        mode="save"
        files={[...FOLDER_FILES, ...exported]}
        onOk={(name) => {
          const n = /\.txt$/i.test(name) ? name : `${name}.txt`
          const rows = concepts.filter((_, i) => picked.has(i))
          setExported((all) => [...all.filter((f) => f.name !== n), { name: n, concepts: rows }])
          setMessage(`${rows.length} concept(s) were exported to ${n}.`)
          setStep('done')
        }}
        onClose={() => setStep('list')}
      />
    )
  }
  if (step === 'done') {
    return (
      <StageMessageBox id="concept-transfer-done" title={mode === 'import' ? 'Import Concepts' : 'Export Concepts'} icon="info"
        buttons={[{ label: 'OK', value: 'ok', default: true }]} onClose={onClose}>
        {message}
      </StageMessageBox>
    )
  }

  const title = mode === 'import' ? 'Import Concepts' : 'Export Concepts'
  return (
    <DemographicModal title={title} width={820} height={560} onClose={onClose} dialog={mode === 'import' ? 'import-concepts' : 'export-concepts'}>
      <div style={{ padding: '6px 10px', flex: 'none' }}>
        {mode === 'import'
          ? <>File: <b>{file?.name}</b> — tick the concepts to add. A concept already on the list is marked and left out.</>
          : <>Tick the concepts to export, then press Export... and choose a file.</>}
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: '0 10px', background: '#fff', border: '1px solid #9a9a9a' }}>
        <PBDataWindow<ConceptRow>
          rows={listed}
          empty=" "
          rowTutorialId={(r) => `host.mois.row.transfer-${pbSlug(String(r.concept ?? ''))}`}
          columns={[
            {
              key: 'sel', header: 'Select', width: 46, align: 'center',
              render: (r, i) => (
                <PBCheckbox
                  checked={picked.has(i)}
                  disabled={mode === 'import' && exists(r)}
                  onChange={(v) => picked.set(i, v)}
                  tutorialId={`host.mois.field.select-concept-${pbSlug(String(r.concept ?? ''))}`}
                />
              ),
            },
            { key: 'group', header: 'Group', width: 110, headAlign: 'center' },
            { key: 'concept', header: 'Concept', width: 220, headAlign: 'center' },
            { key: 'desc', header: 'Description', width: 260, headAlign: 'center' },
            { key: 'hm', header: 'HM Item', width: 52, align: 'center', render: (r) => <PBCheckbox checked={Boolean(r.hm)} disabled /> },
            { key: 'type', header: mode === 'import' ? 'Type' : 'Type', width: 44, align: 'center', render: (r) => (mode === 'import' && exists(r) ? <i style={{ color: '#808080' }}>exists</i> : String(r.type ?? '')) },
          ]}
        />
      </div>
      <div className="pb-row" style={{ padding: '8px 10px', gap: 8, flex: 'none' }}>
        <SelectAllPair as="cmd" ids={['select-all', 'unselect-all']} width={80}
          onSelectAll={() => picked.selectAll(listed.map((r, i) => (mode === 'import' && exists(r) ? -1 : i)).filter((i) => i >= 0))}
          onUnselectAll={picked.clear} />
        <span style={{ flex: '1 1 auto' }} />
        {mode === 'import'
          ? <Cmd id="import" w={88} disabled={!picked.size} onClick={() => {
            const rows = listed.filter((r, i) => picked.has(i) && !exists(r))
            onImported(rows)
            setMessage(`${rows.length} concept(s) were imported from ${file?.name}.`)
            setStep('done')
          }}>Import</Cmd>
          : <Cmd id="export" w={88} disabled={!picked.size} onClick={() => setStep('save')}>Export...</Cmd>}
        <Cmd id="cancel" w={88} onClick={onClose}>Cancel</Cmd>
        <span style={{ flex: '1 1 auto' }} />
      </div>
    </DemographicModal>
  )
}

/** The Windows Open / Save As dialog, reduced to what a lesson needs. */
function FileDialog({ mode, files, onOk, onClose }: {
  mode: 'open' | 'save'; files: ConceptFile[]; onOk: (name: string) => void; onClose: () => void
}) {
  const [name, setName] = useState(mode === 'save' ? 'CONCEPTS EXPORT.txt' : '')
  const [cur, setCur] = useState(-1)
  return (
    <DemographicModal title={mode === 'open' ? 'Open' : 'Save As'} width={560} height={400} onClose={onClose} dialog={mode === 'open' ? 'open-concept-file' : 'save-concept-file'}>
      <div style={{ padding: '8px 10px 0', flex: 'none' }}>
        <Line label={mode === 'open' ? 'Look in:' : 'Save in:'} w={70}><PBSelect w={300} options={['Concept Exports']} /></Line>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: '4px 10px', background: '#fff', border: '1px solid #9a9a9a' }}>
        <PBDataWindow<ConceptFile>
          rows={files}
          current={cur < 0 ? undefined : cur}
          gutter={false}
          head={false}
          onCurrentChange={(i) => { setCur(i); setName(files[i]!.name) }}
          onActivate={(f) => onOk(f.name)}
          rowTutorialId={(f) => `host.mois.field.concept-file-${pbSlug(f.name)}`}
          empty=" "
          columns={[{ key: 'name', header: 'Name', render: (f) => <span>🗎 {f.name}</span> }]}
        />
      </div>
      <div style={{ padding: '0 10px', flex: 'none' }}>
        <Line label="File name:" w={90}><PBInput w={330} value={name} onChange={(e) => setName(e.target.value)} data-tutorial-id="host.mois.field.file-name" /></Line>
        <Line label={mode === 'open' ? 'Files of type:' : 'Save as type:'} w={90}><PBSelect w={330} options={['Concept Files (*.txt)']} /></Line>
      </div>
      <CentredFooter>
        <Cmd id={mode === 'open' ? 'open' : 'save'} w={80} onClick={() => name.trim() && onOk(name.trim())}>{mode === 'open' ? 'Open' : 'Save'}</Cmd>
        <Cmd id="file-cancel" w={80} onClick={onClose}>Cancel</Cmd>
      </CentredFooter>
    </DemographicModal>
  )
}
