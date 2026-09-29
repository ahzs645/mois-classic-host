import { useRef, useState } from 'react'
import { PBCheckbox, PBDataWindow, PBInput, PBSelect, pbSlug } from '../pb'
import { useScreenReport } from '../host/screen-state'
import { CentredFooter, Cmd, Line } from './adminKit'
import { DemographicModal } from './DemographicDialogs'
import { StageMessageBox } from './StageWindow'
import {
  TRAINING_CONCEPT_HEADER, conceptExists, exportedConceptFiles, importConcepts, rememberConceptExport, type ConceptEntry,
} from '../data/concepts'
import { conceptExportFiles, parseConceptXml, type MoisConcept } from '../data/conceptXml'
import { buildExportArchive, readExportXml, saveBlob } from '../data/moisExportArchive'
import { exportFileName, exportHeader, type MoisExportHeader } from '../data/moisExportXml'
import { SESSION_USER } from '../data/chartSession'

/* ============================================================================
   Designer Section ▸ Concept Mapping ▸ Import Concepts / Export Concepts.

   PROVENANCE: 302269 "Concept Mapping", New Taskbar Options — "Import
   Concepts: Allows you to select a file from a folder to import concepts
   (For example: from another clinic)"; "Export Concepts: Allows you to
   export certain concepts (select by checking the boxes next to them) to a
   selected file". The two buttons are on the Concept Mapping List's command
   row (`251267e4…`, DesignerSectionView).

   THE FILE is real: the user's TRAINING export (2026-09-29) is a MOIS
   Designer export — meta.xml plus concepts.xml, the concepts with their
   rules (data/conceptXml.ts). Export writes that pair as a 7z (or, where the
   7-Zip runtime cannot load, concepts.xml) to the learner's downloads and
   keeps it for the session, so Import finds it in the folder. Import reads
   a real export from the learner's own disk ("From this computer...") — a
   7z, concepts.xml or meta.xml (meta.xml carries no rules).

   INFERRED — neither window is captured anywhere in the manual:
     · the file's name, `concepts_<stamp>_<n>.7z`, after the captured Quick
       Entry export's `quick_entrys_<stamp>_<n>.7z`;
     · Import: the Windows "Open" file dialog, then an "Import Concepts" list
       of what the file holds — Select · Group · Concept · Description · HM
       Item · Type · Rules, a concept already on the list flagged "exists"
       and left unticked — Select All / Unselect All, Import / Cancel;
     · Export: an "Export Concepts" list with the Select ticks the article
       describes, Select All / Unselect All, Export... / Cancel; Export...
       raises the Windows "Save As" dialog, and Save confirms how many were
       written;
     · the two files already in the folder are fictional "other clinic"
       exports, in the real format.

   Anchors: dialogs open-concept-file, import-concepts, export-concepts,
   save-concept-file, concept-transfer-done; fields concept-file-<slug>,
   file-name, concept-file-local, select-concept-<slug>; commands open,
   save, cancel, select-all, unselect-all, import, export, from-this-computer.
   ========================================================================= */

type ConceptFile = { name: string; header: MoisExportHeader; concepts: MoisConcept[] }

const text = (include1: string, extra: Partial<MoisConcept['rules'][number]> = {}) =>
  ({ ruleType: 'TEXT' as const, codeField: 'MOIS', codeSystem: 'ICD-9', include1, ...extra })
const other = (site: string, date: string): MoisExportHeader => ({ ...TRAINING_CONCEPT_HEADER, site, date, time: '09:30:12', contact: 'CLINIC ADMIN', reference: '0' })

const FOLDER_FILES: ConceptFile[] = [
  {
    name: 'concepts_20260915093012_500021.7z',
    header: other('VANDERHOOF CLINIC', '2026/09/15'),
    concepts: [
      { type: 'SYM', hm: true, group: 'HEALTH ISSUE', hmCode: '5', concept: 'DIABETES', description: 'DIABETES', rules: [text('DIABETES', { exclude: 'GESTA' }), text('DM')] },
      {
        type: 'GRP', hm: false, group: 'HEALTH ISSUE', hmCode: '0', concept: 'HYPOTHYROIDISM', description: 'HYPOTHYROIDISM',
        rules: [{ ruleType: 'CODE', codeField: 'MOIS', codeSystem: 'ICD-9', code: '244*', note: 'ACQUIRED HYPOTHYROIDISM' }, text('HYPOTHYR')],
      },
      {
        type: 'GRP', hm: false, group: 'MEDICATION', hmCode: '0', concept: 'STATINS', description: 'HMG CoA reductase inhibitors',
        rules: [{ ruleType: 'CODE', codeField: 'str_atc_code', code: 'C10AA*' }, { ruleType: 'TEXT', codeField: 'MOIS', include1: 'STATIN' }],
      },
    ],
  },
  {
    name: 'concepts_20260902141544_500017.7z',
    header: other('HOME CARE', '2026/09/02'),
    concepts: [
      { type: 'GRP', hm: false, group: 'INTERVENTION', hmCode: '0', concept: 'WOUND CARE', description: 'WOUND CARE VISITS', rules: [{ ruleType: 'TEXT', codeField: 'MOIS', codeSystem: 'AIHS-INTERVENTION', include1: 'WOUND' }] },
      { type: 'SYM', hm: true, group: 'PROCEDURE', hmCode: '3', concept: 'FOOT EXAM', description: 'DIABETIC FOOT EXAMINATION', rules: [{ ruleType: 'TEXT', codeField: 'MOIS', codeSystem: 'SNOMED-CT', include1: 'FOOT', include2: 'EXAM' }] },
    ],
  },
]

export function ConceptTransfer({ mode, concepts, onClose }: {
  mode: 'import' | 'export'
  /** the Concept Mapping List as it stands */
  concepts: ConceptEntry[]
  onClose: () => void
}) {
  const [step, setStep] = useState<'pick' | 'list' | 'save' | 'done'>(mode === 'import' ? 'pick' : 'list')
  const [file, setFile] = useState<ConceptFile | null>(null)
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [message, setMessage] = useState('')
  const [problem, setProblem] = useState('')
  const listed: MoisConcept[] = mode === 'import' ? file?.concepts ?? [] : concepts
  const folder = (): ConceptFile[] => [...FOLDER_FILES, ...exportedConceptFiles().map((f) => ({ ...f, header: exportHeader(TRAINING_CONCEPT_HEADER, SESSION_USER) }))]
  useScreenReport({ conceptTransfer: `${mode}-${step}`, conceptsPicked: picked.size })

  const open = (f: ConceptFile) => {
    setFile(f)
    setPicked(new Set(f.concepts.map((r, i) => (conceptExists(r) ? -1 : i)).filter((i) => i >= 0)))
    setStep('list')
  }
  const openLocal = async (picked: File) => {
    try {
      const read = parseConceptXml(await readExportXml(picked, 'concepts.xml', 'Concept Mapping'))
      open({ name: picked.name, header: read.header, concepts: read.concepts })
    } catch (e) {
      setProblem((e as Error).message || 'This file could not be read.')
    }
  }

  if (problem) {
    return (
      <StageMessageBox id="concept-transfer-error" title="Import Concepts" icon="error"
        buttons={[{ label: 'OK', value: 'ok', default: true }]} onClose={() => setProblem('')}>
        {problem}
      </StageMessageBox>
    )
  }
  if (step === 'pick') {
    return (
      <FileDialog
        mode="open"
        files={folder()}
        onOk={(name) => { const f = folder().find((x) => x.name === name); if (f) open(f) }}
        onLocal={(f) => { void openLocal(f) }}
        onClose={onClose}
      />
    )
  }
  if (step === 'save') {
    return (
      <FileDialog
        mode="save"
        files={folder()}
        initial={exportFileName('concepts')}
        onOk={(name) => {
          const n = /\.7z$/i.test(name) ? name : `${name.replace(/\.xml$/i, '')}.7z`
          const rows = concepts.filter((_, i) => picked.has(i)).map(({ id: _id, ...c }) => structuredClone(c))
          rememberConceptExport({ name: n, concepts: rows })
          setMessage(`${rows.length} concept(s) were exported to ${n}.`)
          setStep('done')
          void buildExportArchive(conceptExportFiles(rows, exportHeader(TRAINING_CONCEPT_HEADER, SESSION_USER)), n)
            .then((out) => saveBlob(out.blob, out.name))
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
  const exists = (r: MoisConcept) => mode === 'import' && conceptExists(r)
  const h = file?.header
  return (
    <DemographicModal title={title} width={880} height={560} onClose={onClose} dialog={mode === 'import' ? 'import-concepts' : 'export-concepts'}>
      <div style={{ padding: '6px 10px', flex: 'none' }}>
        {mode === 'import'
          ? <>File: <b>{file?.name}</b>{h && <> — {h.site}, {h.supplier} {h.version} build {h.build}, exported {h.date} {h.time} by {h.contact}</>}.
            {' '}Tick the concepts to add. A concept already on the list is marked and left out.</>
          : <>Tick the concepts to export, then press Export... and choose a file.</>}
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: '0 10px', background: '#fff', border: '1px solid #9a9a9a' }}>
        <PBDataWindow<MoisConcept>
          rows={listed}
          empty=" "
          rowTutorialId={(r) => `host.mois.row.transfer-${pbSlug(r.concept)}`}
          columns={[
            {
              key: 'sel', header: 'Select', width: 46, align: 'center',
              render: (r, i) => (
                <PBCheckbox
                  checked={picked.has(i)}
                  disabled={exists(r)}
                  onChange={(v) => setPicked((p) => { const n = new Set(p); if (v) n.add(i); else n.delete(i); return n })}
                  tutorialId={`host.mois.field.select-concept-${pbSlug(r.concept)}`}
                />
              ),
            },
            { key: 'group', header: 'Group', width: 120, headAlign: 'center' },
            { key: 'concept', header: 'Concept', width: 220, headAlign: 'center' },
            { key: 'description', header: 'Description', width: 250, headAlign: 'center', render: (r) => r.description ?? '' },
            { key: 'hm', header: 'HM Item', width: 52, align: 'center', render: (r) => <PBCheckbox checked={r.hm} disabled /> },
            { key: 'type', header: 'Type', width: 44, align: 'center', render: (r) => (exists(r) ? <i style={{ color: '#808080' }}>exists</i> : r.type) },
            { key: 'rules', header: 'Rules', width: 44, align: 'right', render: (r) => String(r.rules.length) },
          ]}
        />
      </div>
      <div className="pb-row" style={{ padding: '8px 10px', gap: 8, flex: 'none' }}>
        <Cmd id="select-all" w={80} onClick={() => setPicked(new Set(listed.map((r, i) => (exists(r) ? -1 : i)).filter((i) => i >= 0)))}>Select All</Cmd>
        <Cmd id="unselect-all" w={80} onClick={() => setPicked(new Set())}>Unselect All</Cmd>
        <span style={{ flex: '1 1 auto' }} />
        {mode === 'import'
          ? <Cmd id="import" w={88} disabled={!picked.size} onClick={() => {
            const n = importConcepts(listed.filter((_, i) => picked.has(i)))
            setMessage(`${n} concept(s) were imported from ${file?.name}.`)
            setStep('done')
          }}>Import</Cmd>
          : <Cmd id="export" w={88} disabled={!picked.size} onClick={() => setStep('save')}>Export...</Cmd>}
        <Cmd id="cancel" w={88} onClick={onClose}>Cancel</Cmd>
        <span style={{ flex: '1 1 auto' }} />
      </div>
    </DemographicModal>
  )
}

/** The Windows Open / Save As dialog, reduced to what a lesson needs, with
    the emulator's door to the learner's real disk under it. */
function FileDialog({ mode, files, initial, onOk, onLocal, onClose }: {
  mode: 'open' | 'save'
  files: ConceptFile[]
  initial?: string
  onOk: (name: string) => void
  /** a file the learner picked from their own computer */
  onLocal?: (file: File) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial ?? '')
  const [cur, setCur] = useState(-1)
  const picker = useRef<HTMLInputElement>(null)
  return (
    <DemographicModal title={mode === 'open' ? 'Open' : 'Save As'} width={560} height={onLocal ? 430 : 400} onClose={onClose} dialog={mode === 'open' ? 'open-concept-file' : 'save-concept-file'}>
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
        <Line label={mode === 'open' ? 'Files of type:' : 'Save as type:'} w={90}><PBSelect w={330} options={['Concept Exports (*.7z)']} /></Line>
      </div>
      {onLocal && (
        <div className="pb-row" style={{ padding: '4px 10px 0', flex: 'none' }}>
          <Cmd id="from-this-computer" w={150} onClick={() => picker.current?.click()}>From this computer...</Cmd>
          <span style={{ color: '#6d6d6d' }}>a MOIS Concept export (.7z), or its concepts.xml</span>
          <input ref={picker} type="file" accept=".7z,.xml" hidden data-tutorial-id="host.mois.field.concept-file-local"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onLocal(f) }} />
        </div>
      )}
      <CentredFooter>
        <Cmd id={mode === 'open' ? 'open' : 'save'} w={80} onClick={() => name.trim() && onOk(name.trim())}>{mode === 'open' ? 'Open' : 'Save'}</Cmd>
        <Cmd id="file-cancel" w={80} onClick={onClose}>Cancel</Cmd>
      </CentredFooter>
    </DemographicModal>
  )
}
