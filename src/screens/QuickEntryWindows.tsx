import { useMemo, useState, type ReactNode } from 'react'
import {
  QUICK_ENTRY_CHART_TITLE, QUICK_ENTRY_EDITOR_TITLE, QUICK_ENTRY_GROUPS, TRAINING_QUICK_ENTRY_HEADER, exportedQuickEntries,
  importQuickEntryTemplates, nextQuickEntryId, quickEntryExportName, quickEntryTemplates, saveQuickEntryTemplate,
  setExportedQuickEntries, useQuickEntryTemplates, type QuickEntryGroup, type QuickEntryTemplate,
} from '../data/quickEntryTemplates'
import { buildQuickEntryExport, exportHeader, readQuickEntryFile, saveBlob } from '../data/quickEntryArchive'
import type { QuickEntryFileHeader } from '../data/quickEntryXml'
import { SESSION_USER } from '../data/chartSession'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { DESKTOP_PROVIDER } from '../data/letterFlow'
import { PBCheckbox, PBDataWindow, PBInput, PBPatientBand, PBSelect, PBTextArea, pbSlug } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { RaisedMessageBox } from './RaisedMessageBox'
import { Win32FileDialog } from './fileDialog'
import { DialogFooter } from './formKit'
import { SelectAllPair, useTickSet } from './listKit'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'
import {
  BLANK_GOAL, BLANK_MSP, BLANK_ORDER, BLANK_PREFERENCE, BLANK_REACTION, GoalEditor, MspEditor, OrderEditor,
  PreferenceEditor, QeBand, ReactionEditor,
} from './QuickEntryEditors'
import { applyQuickEntry, type QuickEntryApplied } from './quickEntryApply'

/* ============================================================================
   Quick Entry Templates — every window art. 3071982 walks through.

   Administration ▸ Designer Section ▸ Quick Entry (the list itself is
   screens/QuickEntryListView.tsx):
     quick-entry-select-option  New Record's Select Option: the five Template
                                Groups, Continue / Cancel.        `c797c87cb7c0…`
     quick-entry-template       Quick Entry Template - <group>: Quick Entry
                                Identification (Name, Description) over Quick
                                Entry Detail (screens/QuickEntryEditors.tsx),
                                Save / Cancel. args { group } for a new one,
                                { id } to edit.   `8533ea5a…` `70b9b8b9…`
                                `b5c63c1c…` `0dfc31a3…` `9d5aadd7…` `1032aefc…`
     quick-entry-export         Quick Entry Export: Output + Browse..., the
                                template grid with a Select tick, Select All /
                                Unselect All / Ok / Cancel, then Export
                                Complete.   `1036f91d…` `17cae4e6…` `6eef7071…`
     quick-entry-import         Import Quick Entry: File (7z) + Browse...,
                                Concepts / Data Provider / Software Provider,
                                Duplicate / Select grid, Select All / Unselect
                                All / Ok / Cancel.     `772d0a9c…` `5696fac5…`
     (Browse... raises the Windows Export To... / Select Import File common
     dialog, drawn here as a reduced stand-in: `1036f91d…`, `772d0a9c…`.)

   Patient Chart, from a folder's Quick Entry button:
     quick-entry-chart          Quick Entry - Chart Preference / Chart Goal /
                                Chart Order / Reaction Risks. args { group,
                                onApply? }. A blue patient band; "Quick Enty
                                Templates" [sic] with a find box and the
                                group's templates on the left; the editable
                                chart fields top right; the template's Quick
                                Entry Detail greyed under "Read Only" bottom
                                right; Continue / Cancel.
                                `9ce42050…` `8b8958b7…` `3a1f89a7…` `9ac10271…`

   Real files: the Select Import File stand-in's "From this computer..."
   opens the browser's own file picker, so a MOIS export 7z (or its
   quick_entrys.xml / meta.xml) from a real site imports, its header filling
   Data Provider / Software Provider; Export's Ok also saves the MOIS-shaped
   7z to the learner's downloads (data/quickEntryArchive.ts).

   INFERRED: the Delete Record confirmation and the "Name is required" /
   "select a template" messages (no capture); the common file dialog is a
   stand-in, not the Windows shell dialog; the stand-in's "From this
   computer..." button (the emulator's door to the real disk).
   ========================================================================= */

const DEFAULT_OUTPUT = 'C:\\AIHS\\SHARED_FOLDER\\'
const DESKTOP_DIR = 'C:\\Users\\Public\\Desktop\\'

/** a message box that stacks above a dialog */
function Message({ title, icon = 'info', children, buttons, onClose }: {
  title: string
  icon?: 'info' | 'error' | 'warn' | 'question'
  children: ReactNode
  buttons: { label: string; value: string; id: string; default?: boolean }[]
  onClose: (value: string) => void
}) {
  return (
    <RaisedMessageBox zIndex={98} title={title} icon={icon}
      buttons={buttons.map((b) => ({ label: b.label, value: b.value, default: b.default, tutorialId: `host.mois.command.${b.id}` }))}
      onClose={onClose}>
      {children}
    </RaisedMessageBox>
  )
}

/* --- Select Option -------------------------------------------------------- */
function SelectOptionDialog({ close, open }: AreaWindowProps) {
  const [cur, setCur] = useState(0)
  const go = (i = cur) => { const group = QUICK_ENTRY_GROUPS[i]; if (!group) return; close(); open('quick-entry-template', { group }) }
  return (
    <WorkspaceDialogFrame id="quick-entry-select-option" title="Select Option" width={452} height={464} onClose={close} controls={false}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '12px 12px 0' }}>
        <PBDataWindow
          gutter={false}
          rows={QUICK_ENTRY_GROUPS.map((group) => ({ group }))}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(_r, i) => go(i)}
          rowTutorialId={(r) => `host.mois.row.qe-option-${pbSlug(r.group)}`}
          columns={[{ key: 'group', header: 'Template Group' }]}
        />
      </div>
      <DialogFooter gap={12} padding="10px 0">
        <DialogButton id="qe-option-continue" width={75} isDefault onClick={() => go()}>Continue</DialogButton>
        <DialogButton id="qe-option-cancel" width={75} onClick={close}>Cancel</DialogButton>
      </DialogFooter>
    </WorkspaceDialogFrame>
  )
}

/* --- Quick Entry Template - <group> -------------------------------------- */
function blankTemplate(group: QuickEntryGroup): QuickEntryTemplate {
  const t: QuickEntryTemplate = { id: '', group, name: '', description: '' }
  if (group === 'Chart Preference') t.preference = { ...BLANK_PREFERENCE }
  if (group === 'Goal') t.goal = { ...BLANK_GOAL }
  if (group === 'Order') t.order = { ...BLANK_ORDER }
  if (group === 'Reaction Risk') t.reaction = { ...BLANK_REACTION, reactions: BLANK_REACTION.reactions.map((r) => ({ ...r })) }
  if (group === 'MSP Secondary Claims') t.msp = { ...BLANK_MSP, secondary: [] }
  return t
}

/** the Quick Entry Detail editor for a template, editable or read-only */
export function TemplateDetail({ t, onChange, readOnly }: {
  t: QuickEntryTemplate
  onChange: (next: QuickEntryTemplate) => void
  readOnly?: boolean
}) {
  switch (t.group) {
    case 'Chart Preference':
      return <PreferenceEditor readOnly={readOnly} value={t.preference ?? BLANK_PREFERENCE} onChange={(preference) => onChange({ ...t, preference })} />
    case 'Goal':
      return <GoalEditor readOnly={readOnly} value={t.goal ?? BLANK_GOAL} onChange={(goal) => onChange({ ...t, goal })} />
    case 'Order':
      return <OrderEditor readOnly={readOnly} value={t.order ?? BLANK_ORDER} onChange={(order) => onChange({ ...t, order })} />
    case 'Reaction Risk':
      return <ReactionEditor readOnly={readOnly} value={t.reaction ?? BLANK_REACTION} onChange={(reaction) => onChange({ ...t, reaction })} />
    case 'MSP Secondary Claims':
      return (
        <MspEditor readOnly={readOnly} value={t.msp ?? BLANK_MSP} onChange={(msp) => onChange({ ...t, msp })}
          onPrimary={(fee) => onChange({ ...t, msp: { ...(t.msp ?? BLANK_MSP), primary: fee }, name: fee.code, description: fee.term })} />
      )
  }
}

function TemplateEditorDialog({ args, close }: AreaWindowProps) {
  const existing = typeof args.id === 'string' ? quickEntryTemplates().find((t) => t.id === args.id) : undefined
  const group = (existing?.group ?? (QUICK_ENTRY_GROUPS.includes(args.group as QuickEntryGroup) ? args.group : 'Chart Preference')) as QuickEntryGroup
  const [t, setT] = useState<QuickEntryTemplate>(() => existing ? structuredClone(existing) : blankTemplate(group))
  const [missing, setMissing] = useState(false)
  const save = () => {
    if (!t.name.trim()) { setMissing(true); return }
    saveQuickEntryTemplate({ ...t, id: t.id || nextQuickEntryId() })
    close()
  }
  return (
    <WorkspaceDialogFrame id="quick-entry-template" title={QUICK_ENTRY_EDITOR_TITLE[group]} width={880} height={660} onClose={close} controls={false}>
      <div style={{ margin: '8px 6px 0', border: '1px solid #9a9a9a', background: '#fff', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <QeBand>Quick Entry Identification</QeBand>
        <div className="pb-row" style={{ padding: '6px 8px', alignItems: 'flex-start', gap: 8, flex: 'none' }}>
          <span style={{ width: 60, lineHeight: '19px' }}>Name:</span>
          <PBInput w={350} value={t.name} data-tutorial-id="host.mois.field.qe-name" onChange={(e) => setT({ ...t, name: e.target.value })} />
          <span style={{ marginLeft: 16, lineHeight: '19px' }}>Description:</span>
          <PBTextArea rows={2} w={300} value={t.description} data-tutorial-id="host.mois.field.qe-description"
            onChange={(e) => setT({ ...t, description: e.target.value })} />
        </div>
        <QeBand>Quick Entry Detail</QeBand>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <TemplateDetail t={t} onChange={setT} />
        </div>
      </div>
      <DialogFooter gap={8} padding="10px 0">
        <DialogButton id="qe-template-save" width={75} isDefault onClick={save}>Save</DialogButton>
        <DialogButton id="qe-template-cancel" width={75} onClick={close}>Cancel</DialogButton>
      </DialogFooter>
      {missing && (
        <Message title="Quick Entry" icon="warn" onClose={() => setMissing(false)}
          buttons={[{ label: 'OK', value: 'ok', id: 'qe-template-missing-ok', default: true }]}>
          Please enter a Name for this Quick Entry template.
        </Message>
      )}
    </WorkspaceDialogFrame>
  )
}

/* --- the common file dialog stand-in ------------------------------------- */
function FileDialog({ mode, initial, files, onDone, onClose, onLocal }: {
  mode: 'save' | 'open'
  initial: string
  files: string[]
  onDone: (path: string) => void
  onClose: () => void
  /** a file the learner picked from their own computer */
  onLocal?: (file: File) => void
}) {
  return (
    <Win32FileDialog
      id={mode === 'save' ? 'qe-export-to' : 'qe-select-import-file'}
      mode={mode}
      title={mode === 'save' ? 'Export To...' : 'Select Import File'}
      zIndex={97}
      initialName={initial}
      files={files}
      extension=".7z"
      empty={mode === 'open' ? 'No 7z files in this folder.' : ''}
      fileTypes={[mode === 'save' ? 'All Files (*.*)' : '7z Files (*.7z)']}
      onDone={(name) => onDone(`${DESKTOP_DIR}${name}`)}
      onClose={onClose}
      onLocal={onLocal}
      localHint="a MOIS Quick Entry export (.7z) or its quick_entrys.xml"
      localAccept=".7z,.xml"
    />
  )
}

/* the Select-tick grid both Export and Import draw */
function SelectGrid({ rows, selected, onToggle, duplicate }: {
  rows: QuickEntryTemplate[]
  selected: Set<number>
  onToggle: (i: number, v: boolean) => void
  duplicate?: (t: QuickEntryTemplate) => boolean
}) {
  const [cur, setCur] = useState(0)
  return (
    <PBDataWindow
      flush gutter={false}
      rows={rows}
      current={cur}
      onCurrentChange={setCur}
      rowTutorialId={(r) => `host.mois.row.qe-select-${pbSlug(r.name)}`}
      empty="No templates."
      columns={[
        ...(duplicate ? [{ key: 'dup', header: 'Duplicate', width: 80, align: 'center' as const, render: (r: QuickEntryTemplate) => (duplicate(r) ? 'Y' : 'N') }] : []),
        {
          key: 'select', header: 'Select', width: 60, align: 'center' as const,
          render: (r: QuickEntryTemplate, i: number) => (
            <PBCheckbox checked={selected.has(i)} onChange={(v) => onToggle(i, v)} tutorialId={`host.mois.field.qe-select-${pbSlug(r.name)}`} />
          ),
        },
        { key: 'group', header: 'Template Group', width: 180 },
        { key: 'name', header: 'Name', width: 280 },
        { key: 'description', header: 'Description' },
      ]}
    />
  )
}

/* --- Quick Entry Export --------------------------------------------------- */
function ExportDialog({ close }: AreaWindowProps) {
  const rows = useQuickEntryTemplates()
  const [output, setOutput] = useState(() => `${DEFAULT_OUTPUT}${quickEntryExportName()}`)
  const selected = useTickSet()
  const [browse, setBrowse] = useState(false)
  const [message, setMessage] = useState<null | 'done' | 'none'>(null)
  const [saved, setSaved] = useState('')
  const write = async (chosen: QuickEntryTemplate[]) => {
    const name = output.split('\\').pop() || quickEntryExportName()
    const file = await buildQuickEntryExport(chosen, exportHeader(TRAINING_QUICK_ENTRY_HEADER, SESSION_USER), name)
    saveBlob(file.blob, file.name)
    setSaved(file.name)
  }
  return (
    <WorkspaceDialogFrame id="quick-entry-export" title="Quick Entry Export" width={1000} height={640} onClose={close} controls={false}>
      <div style={{ margin: '8px 8px 0', border: '1px solid #9a9a9a', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, background: '#fff' }}>
        <div style={{ background: 'var(--pb-face)', padding: '4px 8px', color: '#000080', fontWeight: 700, borderBottom: '1px solid #9a9a9a' }}>Export File:</div>
        <div className="pb-row" style={{ padding: '6px 8px', background: 'var(--pb-face)', borderBottom: '1px solid #9a9a9a' }}>
          <span>Output:</span>
          <PBInput w={620} value={output} data-tutorial-id="host.mois.field.qe-export-output" onChange={(e) => setOutput(e.target.value)} />
          <DialogButton id="qe-export-browse" width={80} onClick={() => setBrowse(true)}>Browse...</DialogButton>
        </div>
        <div style={{ background: 'var(--pb-face)', padding: '4px 8px', fontWeight: 700, borderBottom: '1px solid #9a9a9a' }}>Quick Entry Templates</div>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <SelectGrid rows={rows} selected={selected.ticked} onToggle={selected.set} />
        </div>
      </div>
      <div className="pb-row" style={{ padding: '8px', gap: 8, flex: 'none' }}>
        <SelectAllPair ids={['qe-export-select-all', 'qe-export-unselect-all']} width={88}
          onSelectAll={() => selected.selectAll(rows.map((_, i) => i))} onUnselectAll={selected.clear} />
        <span style={{ width: 260 }} />
        <DialogButton id="qe-export-ok" width={88} isDefault onClick={() => {
          if (selected.size === 0) { setMessage('none'); return }
          const chosen = rows.filter((_, i) => selected.has(i)).map((t) => structuredClone(t))
          setExportedQuickEntries(chosen)
          setMessage('done')
          void write(chosen)
        }}>Ok</DialogButton>
        <DialogButton id="qe-export-cancel" width={88} onClick={close}>Cancel</DialogButton>
      </div>
      {browse && (
        <FileDialog mode="save" initial={output.split('\\').pop()?.replace(/\.7z$/, '') ?? ''} files={[]}
          onDone={(path) => { setOutput(path); setBrowse(false) }} onClose={() => setBrowse(false)} />
      )}
      {message === 'done' && (
        <Message title="Export Complete" onClose={() => { setMessage(null); close() }}
          buttons={[{ label: 'OK', value: 'ok', id: 'qe-export-complete-ok', default: true }]}>
          Exported to {output}
          {saved && <><br />Saved a copy to this computer as {saved}.</>}
        </Message>
      )}
      {message === 'none' && (
        <Message title="Quick Entry Export" icon="warn" onClose={() => setMessage(null)}
          buttons={[{ label: 'OK', value: 'ok', id: 'qe-export-none-ok', default: true }]}>
          Please select at least one Quick Entry template to export.
        </Message>
      )}
    </WorkspaceDialogFrame>
  )
}

/* --- Import Quick Entry --------------------------------------------------- */
/** what a file exported from another MOIS clinic carries when this session
    has not exported anything itself — the capture's single PENICILLIN row */
const SAMPLE_IMPORT = (): QuickEntryTemplate[] => quickEntryTemplates().filter((t) => t.group === 'Reaction Risk').slice(0, 1).map((t) => structuredClone(t))

function ImportDialog({ close }: AreaWindowProps) {
  const current = useQuickEntryTemplates()
  const [file, setFile] = useState('')
  const [rows, setRows] = useState<QuickEntryTemplate[]>([])
  const [header, setHeader] = useState<QuickEntryFileHeader>(TRAINING_QUICK_ENTRY_HEADER)
  const selected = useTickSet()
  const [browse, setBrowse] = useState(false)
  const [message, setMessage] = useState<null | 'none' | 'done'>(null)
  const [problem, setProblem] = useState('')
  const [notice, setNotice] = useState('')
  const openLocal = async (picked: File) => {
    try {
      const read = await readQuickEntryFile(picked)
      setFile(`${DESKTOP_DIR}${picked.name}`); setRows(read.templates); setHeader(read.header); selected.clear(); setBrowse(false)
      if (read.skipped.length) {
        const types = [...new Set(read.skipped.map((x) => x.recordType || '(none)'))].join(', ')
        setNotice(`${read.skipped.length} template(s) of a type this window cannot import were left out (${types}).`)
      }
    } catch (e) {
      setProblem((e as Error).message || 'This file could not be read.')
    }
  }
  const isDuplicate = (t: QuickEntryTemplate) => current.some((c) => c.group === t.group && c.name === t.name)
  const available = exportedQuickEntries()
  const fileName = useMemo(() => quickEntryExportName(), [])
  const info = (k: string, v: string) => <><span>{k}</span><strong style={{ fontWeight: 700 }}>{file ? v : ''}</strong></>
  return (
    <WorkspaceDialogFrame id="quick-entry-import" title="Import Quick Entry" width={1000} height={660} onClose={close} controls={false}>
      <div style={{ margin: '8px 8px 0', border: '1px solid #9a9a9a', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, background: '#fff' }}>
        <div style={{ background: 'var(--pb-face)', padding: '4px 8px', color: '#000080', fontWeight: 700, borderBottom: '1px solid #9a9a9a' }}>Import File:</div>
        <div className="pb-row" style={{ padding: '6px 8px', background: 'var(--pb-face)', borderBottom: '1px solid #9a9a9a' }}>
          <span>File (7z):</span>
          <PBInput w={640} value={file} readOnly data-tutorial-id="host.mois.field.qe-import-file" />
          <DialogButton id="qe-import-browse" width={80} onClick={() => setBrowse(true)}>Browse...</DialogButton>
        </div>
        <div style={{ background: 'var(--pb-face)', padding: '4px 8px', fontWeight: 700, borderBottom: '1px solid #9a9a9a' }}>Concepts</div>
        <div style={{ display: 'flex', borderBottom: '1px solid #9a9a9a', flex: 'none' }}>
          <div style={{ flex: '1 1 50%', padding: '4px 8px' }}>
            <div style={{ color: '#000080', fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 2 }}>Data Provider:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', rowGap: 4, paddingTop: 4 }}>
              {info('Clinic:', header.site)}{info('Contact:', header.contact)}{info('Reference:', header.reference && header.reference !== '0' ? header.reference : 'Not Available')}
            </div>
          </div>
          <div style={{ flex: '1 1 50%', padding: '4px 8px' }}>
            <div style={{ color: '#000080', fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 2 }}>Software Provider:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '70px 110px 90px 1fr', rowGap: 4, paddingTop: 4 }}>
              {info('Software:', header.supplier)}<span /><span />
              {info('Version:', header.version)}{info('Build:', header.build)}
              {info('Date:', header.date)}{info('Time:', header.time)}
            </div>
          </div>
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <SelectGrid rows={rows} selected={selected.ticked} onToggle={selected.set} duplicate={isDuplicate} />
        </div>
      </div>
      <div className="pb-row" style={{ padding: '8px', gap: 8, flex: 'none' }}>
        <SelectAllPair ids={['qe-import-select-all', 'qe-import-unselect-all']} width={88}
          onSelectAll={() => selected.selectAll(rows.map((_, i) => i))} onUnselectAll={selected.clear} />
        <span style={{ width: 260 }} />
        <DialogButton id="qe-import-ok" width={88} isDefault onClick={() => {
          if (selected.size === 0) { setMessage('none'); return }
          importQuickEntryTemplates(rows.filter((_, i) => selected.has(i)))
          setMessage('done')
        }}>Ok</DialogButton>
        <DialogButton id="qe-import-cancel" width={88} onClick={close}>Cancel</DialogButton>
      </div>
      {browse && (
        <FileDialog mode="open" initial={fileName.replace(/\.7z$/, '')} files={[fileName]}
          onDone={(path) => {
            const incoming = available.length ? available.map((t) => structuredClone(t)) : SAMPLE_IMPORT()
            setFile(path); setRows(incoming); setHeader(TRAINING_QUICK_ENTRY_HEADER); selected.clear(); setBrowse(false)
          }}
          onLocal={(f) => { void openLocal(f) }}
          onClose={() => setBrowse(false)} />
      )}
      {message === 'none' && (
        <Message title="Import Quick Entry" icon="warn" onClose={() => setMessage(null)}
          buttons={[{ label: 'OK', value: 'ok', id: 'qe-import-none-ok', default: true }]}>
          Please select at least one Quick Entry template to import.
        </Message>
      )}
      {problem && (
        <Message title="Import Quick Entry" icon="error" onClose={() => setProblem('')}
          buttons={[{ label: 'OK', value: 'ok', id: 'qe-import-error-ok', default: true }]}>
          {problem}
        </Message>
      )}
      {notice && !problem && (
        <Message title="Import Quick Entry" icon="warn" onClose={() => setNotice('')}
          buttons={[{ label: 'OK', value: 'ok', id: 'qe-import-notice-ok', default: true }]}>
          {notice}
        </Message>
      )}
      {message === 'done' && (
        <Message title="Import Quick Entry" onClose={() => { setMessage(null); close() }}
          buttons={[{ label: 'OK', value: 'ok', id: 'qe-import-complete-ok', default: true }]}>
          {selected.size} Quick Entry template(s) imported.
        </Message>
      )}
    </WorkspaceDialogFrame>
  )
}

/* --- Quick Entry - <chart group> ----------------------------------------- */
type ChartGroup = 'Chart Preference' | 'Goal' | 'Order' | 'Reaction Risk'
const CHART_GROUPS: ChartGroup[] = ['Chart Preference', 'Goal', 'Order', 'Reaction Risk']

export type QuickEntryChartValues = Record<string, string>

const INITIAL: Record<ChartGroup, (t?: QuickEntryTemplate) => QuickEntryChartValues> = {
  /* a template's own chart fields (the ROI ones carry Form / By / an
     instruction comment) start the window; its dates do not — a template
     filed today starts today (INFERRED) */
  'Chart Preference': (t) => {
    const c = t?.preference?.chart ?? {}
    return {
      start: MOIS_TODAY, stopped: '', subjectDetail: c.subjectDetail ?? '', instruction: t?.preference?.instruction ?? '',
      instructionDetail: c.instructionDetail ?? '', reason: c.reason ?? '', reasonDetail: c.reasonDetail ?? '', form: c.form ?? '', by: c.by ?? '',
    }
  },
  Goal: (t) => ({ start: MOIS_TODAY, end: '', phase: '', operator: t?.goal?.operator ?? '', target: t?.goal?.target ?? '', every: t?.goal?.every ?? '', units: t?.goal?.units ?? '', detail: '', expectedOutcome: '' }),
  Order: () => ({ orderDate: MOIS_TODAY, orderBy: DESKTOP_PROVIDER, orderTo: '', copyTo1: '', copyTo2: '', attending: DESKTOP_PROVIDER.replace(/ \[DR\]$/, ''), note: '' }),
  'Reaction Risk': (t) => ({ firstOccurrence: '', age: '', stopped: '', severity: t?.reaction?.severity ?? '', comments: '' }),
}

const REASONS = ['', 'ALREADY IMMUNE', 'INELIGIBLE FOR VACCINE', 'NO VALID CONSENT', 'OTHER', 'PARENT DIRECTED SCHEDULING', 'SELF CHOICE']
const PHASES = ['', 'INITIATION', 'MOTIVATION', 'MAINTENANCE', 'TERMINATION']

function ChartFields({ group, t, v, set }: {
  group: ChartGroup
  t: QuickEntryTemplate | undefined
  v: QuickEntryChartValues
  set: (k: string, value: string) => void
}) {
  const f = (k: string) => `host.mois.field.qe-chart-${pbSlug(k)}`
  const input = (k: string, w: number | string = 116) => <PBInput w={w} value={v[k] ?? ''} data-tutorial-id={f(k)} onChange={(e) => set(k, e.target.value)} />
  const area = (k: string, w: number | string = 512) => <PBTextArea rows={3} w={w} value={v[k] ?? ''} data-tutorial-id={f(k)} onChange={(e) => set(k, e.target.value)} />
  const select = (k: string, options: string[], w: number | string = 420) => (
    <PBSelect w={w} options={options} value={v[k] ?? ''} data-tutorial-id={f(k)} onChange={(e) => set(k, e.target.value)} />
  )
  if (group === 'Chart Preference') {
    const instructions = t?.preference ? ['', ...new Set([t.preference.instruction, ...['ALLOW', 'NOT ALLOW', 'DESIRED', 'NOT DESIRED']].filter(Boolean))] : ['']
    const reasons = [...new Set([...REASONS, v.reason ?? ''])]
    return (
      <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="pb-row" style={{ gap: 8 }}>
          <span style={{ width: 110 }}>Start:</span>{input('start')}
          <span style={{ marginLeft: 50 }}>Stopped:</span>{input('stopped')}
        </div>
        <span>Subject Detail:</span>{area('subjectDetail')}
        <span>Instruction:</span>{select('instruction', instructions)}{area('instructionDetail')}
        <span>Reason:</span>{select('reason', reasons)}{area('reasonDetail')}
        <div className="pb-row" style={{ gap: 0 }}>
          <span style={{ width: 290 }}>Form:</span><span>By:</span>
        </div>
        <div className="pb-row" style={{ gap: 68 }}>
          {select('form', ['', 'IN PERSON', 'PAPER', 'PHONE', 'VERBAL'], 222)}
          {select('by', ['', 'CLIENT', 'GUARDIAN', 'MATURE MINOR', 'PARENT', 'OTHER'], 222)}
        </div>
      </div>
    )
  }
  if (group === 'Goal') {
    return (
      <div style={{ padding: '6px 10px', display: 'grid', gridTemplateColumns: '128px auto', rowGap: 5, alignItems: 'center', justifyContent: 'start' }}>
        <span>Start:</span>
        <div className="pb-row">{input('start')}<span style={{ marginLeft: 20 }}>End:</span>{input('end')}</div>
        <span>Phase:</span>{select('phase', PHASES, 172)}
        <span>Target Value:</span>
        <div className="pb-row" style={{ gap: 4 }}>{select('operator', ['', '<', '<=', '=', '>=', '>'], 138)}{input('target', 150)}</div>
        <span>Perform Every:</span>
        <div className="pb-row" style={{ gap: 4 }}>{input('every', 138)}{select('units', ['', 'HOURS', 'DAYS', 'WEEKS', 'MONTHS', 'YEARS'], 150)}</div>
        <span style={{ gridColumn: 'span 2', color: '#000080', fontWeight: 700 }}>Additional Information:</span>
        <span style={{ gridColumn: 'span 2' }}>Detail:</span>
        <div style={{ gridColumn: 'span 2' }}>{area('detail')}</div>
        <span style={{ gridColumn: 'span 2' }}>Expected Outcome:</span>
        <div style={{ gridColumn: 'span 2' }}>{area('expectedOutcome')}</div>
      </div>
    )
  }
  if (group === 'Order') {
    return (
      <div style={{ padding: '6px 10px', display: 'grid', gridTemplateColumns: '96px auto', rowGap: 4, alignItems: 'center', justifyContent: 'start' }}>
        <span>Order Date:</span>{input('orderDate', 110)}
        <span>Order By:</span>{input('orderBy', 424)}
        <span>Order To:</span>{input('orderTo', 424)}
        <span>Copy To:</span>{input('copyTo1', 424)}
        <span />{input('copyTo2', 424)}
        <span>Attending:</span>{input('attending', 424)}
        <span style={{ alignSelf: 'start' }}>Note:</span>
        <PBTextArea rows={6} w={736} value={v.note ?? ''} data-tutorial-id={f('note')} onChange={(e) => set('note', e.target.value)} />
      </div>
    )
  }
  return (
    <div style={{ padding: '6px 10px', display: 'grid', gridTemplateColumns: '126px auto', rowGap: 4, alignItems: 'center', justifyContent: 'start' }}>
      <span>First Occurence:</span>
      <div className="pb-row">{input('firstOccurrence')}<span style={{ color: '#6d6d6d' }}>(date)</span>
        <span style={{ marginLeft: 10 }}>Your Age:</span>{input('age', 60)}<span style={{ color: '#6d6d6d' }}>(years old)</span></div>
      <span>Stopped:</span>{input('stopped')}
      <span>Severity:</span>{select('severity', ['', 'MILD', 'MODERATE', 'SEVERE', 'SEVERE TO LIFE THREATENING'], 334)}
      <span style={{ alignSelf: 'start' }}>Comments:</span>
      <PBTextArea rows={3} w={576} value={v.comments ?? ''} data-tutorial-id={f('comments')} onChange={(e) => set('comments', e.target.value)} />
    </div>
  )
}

function ChartQuickEntryWindow({ args, close }: AreaWindowProps) {
  const patient = usePatient()
  const group: ChartGroup = CHART_GROUPS.includes(args.group as ChartGroup) ? args.group as ChartGroup : 'Chart Preference'
  const all = useQuickEntryTemplates()
  const [find, setFind] = useState('')
  const templates = all.filter((t) => t.group === group && t.name.toLowerCase().includes(find.trim().toLowerCase()))
  const [cur, setCur] = useState(0)
  const t = templates[cur]
  const [values, setValues] = useState<QuickEntryChartValues>(() => INITIAL[group](templates[0]))
  const [message, setMessage] = useState(false)
  const pick = (i: number) => { setCur(i); setValues(INITIAL[group](templates[i])) }
  const onApply = typeof args.onApply === 'function' ? args.onApply as (applied: QuickEntryApplied) => void : undefined
  const proceed = () => {
    if (!t) { setMessage(true); return }
    const applied: QuickEntryApplied = { group, chart: patient.chart, template: t, values }
    if (onApply) onApply(applied)
    else applyQuickEntry(applied)
    close()
  }
  return (
    <WorkspaceDialogFrame id="quick-entry-chart" title={`Quick Entry - ${QUICK_ENTRY_CHART_TITLE[group]}`} width={1120} height={760} onClose={close}>
      <PBPatientBand layout="stack" className="pb-row" anchor="host.mois.field.qe-chart-banner"
        style={{ background: 'linear-gradient(#2f8fd0, #1d6aa8)', color: '#fff', padding: '4px 8px', gap: 10, flex: 'none', margin: '6px 6px 0' }}
        cells={[
          { label: 'CHART NO.', value: patient.chart, w: 90 },
          { label: 'PATIENT (F/M/L)', value: `${patient.first}  ${patient.last}`.toUpperCase(), w: 230 },
          { label: 'DATE OF BIRTH', value: `${patient.dob}  ${patient.age.toUpperCase()}`, w: 240 },
          { label: 'GENDER', value: patient.sex, w: 70 },
          { label: 'PERSONAL HEALTH NO.', value: patient.bchn ?? '', w: 150 },
          { label: 'PREFERRED PHONE NUMBER', value: patient.phone ?? '' },
        ]} />
      <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, margin: '0 6px', border: '1px solid #9a9a9a', background: '#fff' }}>
        <div style={{ width: 340, flex: 'none', borderRight: '1px solid #9a9a9a', display: 'flex', flexDirection: 'column' }}>
          <QeBand style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>Quick Enty Templates</span>
            <PBInput w="100%" value={find} data-tutorial-id="host.mois.field.qe-chart-find" onChange={(e) => { setFind(e.target.value); pick(0) }} />
          </QeBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }} role="listbox" aria-label="Quick Entry templates">
            {templates.map((x, i) => (
              <div key={x.id} role="option" aria-selected={i === cur}
                data-tutorial-id={`host.mois.row.quick-entry-${pbSlug(x.name)}`}
                onClick={() => pick(i)} onDoubleClick={() => { pick(i) }}
                style={{ padding: '4px 6px', cursor: 'default', background: i === cur ? '#0078d7' : undefined, color: i === cur ? '#fff' : undefined }}>
                {x.name}
              </div>
            ))}
            {templates.length === 0 && <div style={{ padding: 6, color: '#6d6d6d' }}>No Quick Entry templates.</div>}
          </div>
        </div>
        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <QeBand>{QUICK_ENTRY_CHART_TITLE[group] === 'Reaction Risks' ? 'Reaction Risk' : QUICK_ENTRY_CHART_TITLE[group]}</QeBand>
          <div style={{ flex: 'none' }}>
            {t ? <ChartFields key={t.id} group={group} t={t} v={values} set={(k, value) => setValues((prev) => ({ ...prev, [k]: value }))} /> : <div style={{ height: 120 }} />}
          </div>
          <QeBand style={{ color: '#6d6d6d' }}>Quick Entry Detail</QeBand>
          <div style={{ position: 'relative', flex: '1 1 auto', background: 'var(--pb-face)', color: '#6d6d6d', minHeight: 200 }}
            data-tutorial-id="host.mois.field.qe-chart-detail">
            {t && <TemplateDetail t={t} onChange={() => undefined} readOnly />}
            {t && (
              <div aria-hidden style={{
                position: 'absolute', left: '50%', top: '45%', transform: 'translate(-50%, -50%) rotate(-50deg)',
                fontSize: 64, color: 'rgba(60,60,60,0.55)', fontFamily: 'Arial, sans-serif', pointerEvents: 'none', whiteSpace: 'nowrap',
              }}>Read Only</div>
            )}
          </div>
        </div>
      </div>
      <DialogFooter gap={8} padding="10px 0">
        <DialogButton id="qe-chart-continue" width={110} isDefault onClick={proceed}>Continue</DialogButton>
        <DialogButton id="qe-chart-cancel" width={110} onClick={close}>Cancel</DialogButton>
      </DialogFooter>
      {message && (
        <Message title="Quick Entry" icon="warn" onClose={() => setMessage(false)}
          buttons={[{ label: 'OK', value: 'ok', id: 'qe-chart-none-ok', default: true }]}>
          Please select a Quick Entry template.
        </Message>
      )}
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow('quick-entry-select-option', SelectOptionDialog)
registerAreaWindow('quick-entry-template', TemplateEditorDialog)
registerAreaWindow('quick-entry-export', ExportDialog)
registerAreaWindow('quick-entry-import', ImportDialog)
registerAreaWindow('quick-entry-chart', ChartQuickEntryWindow)
