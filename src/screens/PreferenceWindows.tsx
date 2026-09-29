import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { MoisRecord } from '../data/charts'
import {
  addPreference, deleteFolderRecord, mergedFolderRecords, saveFolderRecord, useCarePlanRecords,
  type SessionPreference,
} from '../data/carePlanRecords'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import {
  PREFERENCE_BY, PREFERENCE_FORMS, PREFERENCE_IDENTIFIED_BY, PREFERENCE_REASONS, PREFERENCE_SUBJECTS,
  PREFERENCE_TYPES, defaultIdentifiedBy, preferenceInstructions, preferenceTerms,
  type PreferenceIdentifiedBy, type PreferenceTerm, type PreferenceType,
} from '../data/preferenceVocab'
import { useScreenReport } from '../host/screen-state'
import {
  PBCheckbox, PBInput, PBLookup, PBMessageBox, PBRadio, PBTextArea, pbSlug,
  type PBCommand,
} from '../pb'
import { registerAreaWindow, useOpenWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogFooter } from './formKit'
import { LookupBand, PickButtons, PickListWindow, SIZE, SearchForRow } from './lookupKit'
import { PreferenceChoice } from './PreferenceChoice'
import { applyQuickEntry, type QuickEntryApplied } from './quickEntryApply'
import type { SearchField } from './SearchForBand'
import { DialogButton, FormRule, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   Care Plan ▸ Preferences: the New Preference dialog, its Concept / Code
   lookup, and the folder's New / Delete / Save / Undo / Refresh, Search and
   sortable headers (`usePreferenceFolder`, used by ClinicalReportView).

   New Preference (area window `new-preference`, opened by the folder's New
   Record) — art. 300925 "Creating a New Preference":
     step 5  Type: seven radio options (Consent, Directive, Disclosure,
             Advance Directive, Not Indicated, Contraindicated, Precaution).
             Nothing else shows until one is chosen; "After selecting this
             type, you see the remainder of the information".
     step 6  Subject list; Identified By Concept / Code / Free Text (Advance
             Directive defaults to Code, every other type to Concept); the
             Concept / Code / Description field whose `…` lists the concepts
             or codes of the chosen Subject; Subject Detail.
     step 7  Instruction list — it changes with the type and the concept or
             code (Cardiopulmonary Resuscitation: CPR / DNR; Pharmanet
             Access: Allow / Not Allow) — and Instruction Detail.
     step 8  Reason list and Reason Detail.
     step 9  Other: Start Date (today), End Date, Mark as Sensitive, Show on
             Demographics, Form (In person / Paper / Phone / Verbal), By
             (Client / Guardian / Mature Minor / Parent / Other).
   "All information entered in this dialog is copied to the list": Save files
   the preference (data/carePlanRecords.ts `addPreference`) and it is listed
   first in the grid, where Type, Subject and Instruction are read-only.

   The folder (`usePreferenceFolder`): New Record opens New Preference;
   Delete Record takes the current row out, pending until Save (Undo puts it
   back), as the other chart folders do (screens/reportRecords.tsx); Save
   files Detail-tab edits; Search For (the shared SearchForBand, wired in
   ClinicalReportView) searches `PREFERENCE_SEARCH_FIELDS` — Detail and
   Instruction by default, Type and Subject from Advanced Search ("MOIS
   searches for the Default and Instruction default fields … Other
   searchable fields … are Type and Subject"); the blue column titles sort
   ("Click the header to sort the patient's preferences by Type, Subject,
   and so forth"), a second click reversing.

   The lists are data/preferenceVocab.ts, shared with the Quick Entry
   windows.

   PROVENANCE: art. 300925 (text; the article's captures are not in the local
   manual copy). Layout follows the Quick Entry Template - Chart Preference
   capture, art. 3071982 `8533ea5acbce…` — Type radios down the left; Subject
   with Identified By, Instruction and Other in rule-divided blocks on the
   right; Save / Cancel centred at the foot — with the Detail tab's own
   blocks (PreferencesDetail, 2026-09-22 capture) for what the template
   leaves out (Concept/Code, the Detail boxes, Reason, dates, Form, By).
   INFERRED: the dialog's exact geometry, the lookup window, the required-
   field messages, and sorting being immediate rather than a round trip.

   Anchors: host.mois.dialog.new-preference;
     host.mois.field.new-preference-type-{consent|directive|disclosure|
       advance-directive|not-indicated|contraindicated|precaution} (radios);
     host.mois.field.new-preference-subject (+ command …-subject-list);
     host.mois.field.new-preference-identified-{concept|code|free-text};
     host.mois.field.new-preference-concept, host.mois.lookup.new-preference-concept (the …);
     host.mois.field.new-preference-{subject-detail|instruction|instruction-detail|
       reason|reason-detail|start-date|end-date|sensitive|show-on-demographics|form|by};
     host.mois.command.new-preference-save / new-preference-cancel;
     lookup: host.mois.dialog.preference-lookup, host.mois.row.preference-term-{code},
     host.mois.command.preference-lookup-select / -cancel.
   ========================================================================= */

/* --- the folder --------------------------------------------------------- */

/** Search For's fields on Preferences (the grid's own row keys) */
export const PREFERENCE_SEARCH_FIELDS: SearchField[] = [
  { key: 'detail', label: 'Detail', isDefault: true },
  { key: 'instruction', label: 'Instruction', isDefault: true },
  { key: 'type', label: 'Type' },
  { key: 'subject', label: 'Subject' },
]

/** a grid column → the export field it sorts on */
const SORT_FIELD: Record<string, string> = {
  start: 'dtm_start', type: 'str_classification', subject: 'str_type', detail: 'str_preference',
  instruction: 'str_instruction_code', s: 'str_sensitive', demo: 'str_include_demo',
}

export function usePreferenceFolder(active: boolean, exported: MoisRecord[], onAdded?: () => void) {
  const { chart } = usePatient()
  const store = useCarePlanRecords(chart)
  const open = useOpenWindow()
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const [removed, setRemoved] = useState<string[]>([])
  const [status, setStatus] = useState('')

  const records = useMemo(() => {
    if (!active) return exported
    let list = mergedFolderRecords(store, 'prefs', exported)
      .filter((r) => !removed.includes(r.id_chart_preference ?? ''))
    if (sort) {
      const f = SORT_FIELD[sort.key] ?? sort.key
      list = [...list].sort((a, b) => String(a[f] ?? '').localeCompare(String(b[f] ?? '')) * sort.dir)
    }
    return list
  }, [active, exported, store, sort, removed])

  /* a preference filed from New Preference (or Quick Entry) becomes current */
  const count = store.preferences.length
  const seen = useRef(count)
  const added = useRef(onAdded)
  added.current = onAdded
  useEffect(() => {
    if (active && count > seen.current) added.current?.()
    seen.current = count
  }, [active, count])

  useScreenReport(active ? { record: status, rows: records.length, ...(removed.length ? { draft: true } : {}) } : {})

  return {
    records,
    onSort: (key: string) => setSort((s) => ({ key, dir: s?.key === key && s.dir === 1 ? -1 : 1 })),
    newRecord: () => { open('new-preference'); setStatus('') },
    /* art. 3071982 "Using Quick Entry in Preferences": Quick Entry - Chart
       Preference (screens/QuickEntryWindows.tsx); Continue files the
       templated preference through addPreference, listed first and current */
    quickEntry: () => {
      setStatus('')
      open('quick-entry-chart', {
        group: 'Chart Preference',
        onApply: (applied: QuickEntryApplied) => { applyQuickEntry(applied); setStatus('saved') },
      })
    },
    deleteRecord: (record?: MoisRecord) => {
      if (record?.id_chart_preference) { setRemoved((r) => [...r, record.id_chart_preference!]); setStatus('') }
    },
    /** file the Detail-tab edits and the pending deletions */
    save: (drafts: Record<string, MoisRecord>) => {
      const all = mergedFolderRecords(store, 'prefs', exported)
      let edited = false
      for (const [id, patch] of Object.entries(drafts)) {
        const base = all.find((r) => r.id_chart_preference === id)
        if (base && Object.keys(patch).length && !removed.includes(id)) { saveFolderRecord(chart, 'prefs', { ...base, ...patch }); edited = true }
      }
      removed.forEach((id) => deleteFolderRecord(chart, 'prefs', id))
      setStatus(removed.length && !edited ? 'deleted' : edited || removed.length ? 'saved' : '')
      setRemoved([])
    },
    undo: () => { setRemoved([]); setStatus('') },
    refresh: () => { setRemoved([]); setStatus('') },
  }
}

/** Wire the folder's command row to `usePreferenceFolder`, Quick Entry included. */
export function preferenceCommands(
  cmds: PBCommand[],
  folder: ReturnType<typeof usePreferenceFolder>,
  { record, drafts, clearDrafts, undoDraft }: {
    record?: MoisRecord; drafts: Record<string, MoisRecord>; clearDrafts: () => void; undoDraft: () => void
  },
): PBCommand[] {
  return cmds.map((c) => {
    if (!c) return c
    switch (c.label) {
      case 'New Record': return { ...c, onClick: folder.newRecord }
      case 'Quick Entry': return { ...c, onClick: folder.quickEntry }
      case 'Delete Record': return { ...c, disabled: !record, onClick: () => folder.deleteRecord(record) }
      case 'Save': return { ...c, onClick: () => { folder.save(drafts); clearDrafts() } }
      case 'Undo': return { ...c, onClick: () => { undoDraft(); folder.undo() } }
      case 'Refresh': return { ...c, onClick: () => { clearDrafts(); folder.refresh() } }
      default: return c
    }
  })
}

/* --- New Preference ----------------------------------------------------- */

const LABEL: React.CSSProperties = { lineHeight: '19px' }

function Block({ title, children, columns = '92px minmax(0, 1fr)' }: { title: string; children: ReactNode; columns?: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: columns, gap: '5px 8px', alignItems: 'center', padding: '8px 12px' }}>
      <strong style={LABEL}>{title}</strong>
      {children}
    </div>
  )
}

function NewPreferenceDialog({ close }: AreaWindowProps) {
  const { chart } = usePatient()
  const [type, setType] = useState<PreferenceType | ''>('')
  const [subject, setSubject] = useState('')
  const [by, setBy] = useState<PreferenceIdentifiedBy>('Concept')
  const [term, setTerm] = useState<PreferenceTerm>({ code: '', description: '' })
  const [subjectDetail, setSubjectDetail] = useState('')
  const [instruction, setInstruction] = useState('')
  const [instructionDetail, setInstructionDetail] = useState('')
  const [reason, setReason] = useState('')
  const [reasonDetail, setReasonDetail] = useState('')
  const [start, setStart] = useState(MOIS_TODAY)
  const [end, setEnd] = useState('')
  const [sensitive, setSensitive] = useState(false)
  const [showOnDemo, setShowOnDemo] = useState(false)
  const [form, setForm] = useState('')
  const [consentBy, setConsentBy] = useState('')
  const [lookup, setLookup] = useState(false)
  const [message, setMessage] = useState('')
  useScreenReport(lookup ? { dialog: 'preference-lookup' } : {})

  const instructions = type ? preferenceInstructions(type, term.description) : []
  const termLabel = by === 'Concept' ? 'Concept:' : by === 'Code' ? 'Code:' : 'Description:'

  const chooseType = (t: PreferenceType) => {
    setType(t)
    setBy(defaultIdentifiedBy(t))
    setTerm({ code: '', description: '' })
    setInstruction('')
  }
  const chooseTerm = (next: PreferenceTerm) => {
    setTerm(next)
    if (type && !preferenceInstructions(type, next.description).includes(instruction)) setInstruction('')
  }

  const save = () => {
    /* the drop lists are typed into as well as picked from; what is typed
       has to be one of the list's entries, as PowerBuilder's edit-mask
       drop-downs insist */
    const missing = !type ? 'Type' : !PREFERENCE_SUBJECTS.includes(subject) ? 'Subject'
      : !term.description.trim() ? termLabel.replace(':', '') : !instructions.includes(instruction) ? 'Instruction' : ''
    if (missing) { setMessage(`${missing} is required.`); return }
    const pref: Omit<SessionPreference, 'id'> = {
      type: type as string, subject, identifiedBy: by, code: by === 'Free Text' ? '' : term.code,
      concept: term.description.trim().toUpperCase(), subjectDetail, instruction, instructionDetail,
      reason: PREFERENCE_REASONS.includes(reason) ? reason : '', reasonDetail, start, end, sensitive, showOnDemo,
      form: PREFERENCE_FORMS.includes(form) ? form : '', by: PREFERENCE_BY.includes(consentBy) ? consentBy : '',
    }
    addPreference(chart, pref)
    close()
  }

  const field = (id: string) => `host.mois.field.new-preference-${id}`

  return (
    <WorkspaceDialogFrame id="new-preference" title="New Preference" width={860} height={660} onClose={close} controls={false}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#fff', borderBottom: '1px solid #a0a0a0' }}>
        {/* Type — annotation 1 of the article's step 5 capture */}
        <div style={{ width: 140, flex: 'none', padding: '8px 10px', borderRight: '1px solid #c8c8c8' }} data-tutorial-id="host.mois.group.new-preference-type">
          <strong style={LABEL}>Type:</strong>
          {PREFERENCE_TYPES.map((t) => (
            <div key={t} style={{ padding: '6px 0 0 2px' }}>
              <PBRadio name="new-preference-type" label={t} checked={type === t} tutorialId={field(`type-${pbSlug(t)}`)} onChange={() => chooseType(t)} />
            </div>
          ))}
        </div>

        {/* the remainder — annotation 2 — once a type is chosen */}
        <div style={{ flex: '1 1 auto', minWidth: 0, overflow: 'auto' }} data-tutorial-id="host.mois.group.new-preference-detail">
          {type && (
            <>
              <Block title="Subject:">
                <span style={{ width: 220 }}>
                  <PreferenceChoice label="Preference subject" value={subject} options={PREFERENCE_SUBJECTS}
                    tutorialId="new-preference-subject"
                    onChange={(v) => { setSubject(v.toUpperCase()); setTerm({ code: '', description: '' }); setInstruction('') }} />
                </span>
                <span className="pb-form__label" style={{ ...LABEL, textAlign: 'right' }}>Identified By:</span>
                <div className="pb-row" style={{ gap: 22 }}>
                  {PREFERENCE_IDENTIFIED_BY.map((b) => (
                    <PBRadio key={b} name="new-preference-identified-by" label={b} checked={by === b}
                      tutorialId={field(`identified-${pbSlug(b)}`)}
                      onChange={() => { setBy(b); setTerm({ code: '', description: '' }); setInstruction('') }} />
                  ))}
                </div>
                <span className="pb-form__label" style={{ ...LABEL, textAlign: 'right' }}>{termLabel}</span>
                {by === 'Free Text' ? (
                  <PBInput w="100%" value={term.description} data-tutorial-id={field('concept')}
                    onChange={(e) => chooseTerm({ code: '', description: e.target.value })} />
                ) : (
                  <PBLookup
                    w="100%" readOnly name="new-preference-concept" fieldId={field('concept')}
                    value={term.description ? (term.code && by === 'Code' ? `${term.code} - ${term.description}` : term.description) : ''}
                    onDots={() => setLookup(true)}
                    onKeyDown={(e) => { if (e.key === 'F4') { e.preventDefault(); setLookup(true) } }}
                  />
                )}
                <span className="pb-form__label" style={{ ...LABEL, textAlign: 'right', alignSelf: 'start' }}>Subject Detail:</span>
                <PBTextArea rows={2} w="100%" value={subjectDetail} data-tutorial-id={field('subject-detail')}
                  onChange={(e) => setSubjectDetail(e.target.value)} />
              </Block>
              <FormRule />

              <Block title="Instruction:">
                <span style={{ width: 380 }}>
                  <PreferenceChoice label="Preference instruction" value={instruction} options={instructions}
                    tutorialId="new-preference-instruction"
                    onChange={(v) => setInstruction(v.toUpperCase())} />
                </span>
                <span className="pb-form__label" style={{ ...LABEL, textAlign: 'right', alignSelf: 'start' }}>Detail:</span>
                <PBTextArea rows={2} w="100%" value={instructionDetail} data-tutorial-id={field('instruction-detail')}
                  onChange={(e) => setInstructionDetail(e.target.value)} />
              </Block>
              <FormRule />

              <Block title="Reason:">
                <span style={{ width: 300 }}>
                  <PreferenceChoice label="Preference reason" value={reason} options={PREFERENCE_REASONS}
                    tutorialId="new-preference-reason"
                    onChange={(v) => setReason(v.toUpperCase())} />
                </span>
                <span className="pb-form__label" style={{ ...LABEL, textAlign: 'right', alignSelf: 'start' }}>Detail:</span>
                <PBTextArea rows={2} w="100%" value={reasonDetail} data-tutorial-id={field('reason-detail')}
                  onChange={(e) => setReasonDetail(e.target.value)} />
              </Block>
              <FormRule />

              <Block title="Other:" columns="92px 70px 160px 60px 160px minmax(0, 1fr)">
                <span className="pb-form__label" style={LABEL}>Start Date:</span>
                <PBInput w={96} align="center" value={start} data-tutorial-id={field('start-date')} onChange={(e) => setStart(e.target.value)} />
                <span className="pb-form__label" style={LABEL}>End Date:</span>
                <PBInput w={96} align="center" value={end} data-tutorial-id={field('end-date')} onChange={(e) => setEnd(e.target.value)} />
                <span />
                <span style={{ gridColumn: '2 / span 2' }}>
                  <PBCheckbox label="Mark as Sensitive" checked={sensitive} tutorialId={field('sensitive')} onChange={setSensitive} />
                </span>
                <span style={{ gridColumn: '4 / span 3' }}>
                  <PBCheckbox label="Show on Demographics" checked={showOnDemo} tutorialId={field('show-on-demographics')} onChange={setShowOnDemo} />
                </span>
                <span />
                <span className="pb-form__label" style={LABEL}>Form:</span>
                <span>
                  <PreferenceChoice label="Preference form" value={form} options={PREFERENCE_FORMS} tutorialId="new-preference-form"
                    onChange={(v) => setForm(v.toUpperCase())} />
                </span>
                <span className="pb-form__label" style={{ ...LABEL, textAlign: 'right' }}>By:</span>
                <span>
                  <PreferenceChoice label="Preference by" value={consentBy} options={PREFERENCE_BY} tutorialId="new-preference-by"
                    onChange={(v) => setConsentBy(v.toUpperCase())} />
                </span>
              </Block>
            </>
          )}
        </div>
      </div>
      <DialogFooter gap={10} padding="10px 0">
        <DialogButton id="new-preference-save" width={75} isDefault onClick={save}>Save</DialogButton>
        <DialogButton id="new-preference-cancel" width={75} onClick={close}>Cancel</DialogButton>
      </DialogFooter>

      {lookup && (
        <PreferenceLookup
          subject={subject} by={by === 'Code' ? 'Code' : 'Concept'}
          onPick={(t) => { chooseTerm(t); setLookup(false) }}
          onClose={() => setLookup(false)}
        />
      )}
      {message && (
        <PBMessageBox title="New Preference" icon="warn" onClose={() => setMessage('')}
          buttons={[{ label: 'OK', value: 'ok', default: true, tutorialId: 'host.mois.command.new-preference-message-ok' }]}>
          {message}
        </PBMessageBox>
      )}
    </WorkspaceDialogFrame>
  )
}

/* --- the Concept / Code lookup ------------------------------------------
   The `…` beside Concept / Code: the Subject's concepts or codes, searchable,
   Select (or a double-click) hands the pick back. INFERRED layout. */
function PreferenceLookup({ subject, by, onPick, onClose }: {
  subject: string; by: 'Concept' | 'Code'; onPick: (t: PreferenceTerm) => void; onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [cur, setCur] = useState(0)
  const q = search.trim().toUpperCase()
  const rows = preferenceTerms(subject, by).filter((t) => !q || t.description.includes(q) || t.code.toUpperCase().includes(q))
  const pick = rows[Math.min(cur, rows.length - 1)]
  const title = `${by} Lookup${subject ? ` - ${subject}` : ''}`
  return (
    <PickListWindow
      window={{
        id: 'preference-lookup', title, onClose, zIndex: 90,
        windowStyle: { width: 520, height: 400, maxWidth: 'calc(100% - 16px)', maxHeight: 'calc(100% - 16px)' },
      }}
      body={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, background: 'var(--pb-face)', padding: '8px 10px 0' }}
      searchFirst
      search={(
        <SearchForRow link={false} value={search} autoFocus field="preference-lookup-search" style={{ paddingBottom: 4 }}
          onChange={(v) => { setSearch(v); setCur(0) }} />
      )}
      band={<LookupBand>{subject ? `${subject} ${by === 'Concept' ? 'Concepts' : 'Codes'}` : 'Choose a Subject first'}</LookupBand>}
      grid={{
        rows,
        current: cur,
        onCurrentChange: setCur,
        onActivate: (r) => onPick(r),
        rowTutorialId: (r) => `host.mois.row.preference-term-${pbSlug(r.code)}`,
        empty: subject ? 'No entries.' : 'Pick a Subject to list its concepts and codes.',
        columns: [
          { key: 'code', header: 'Code', width: 90 },
          { key: 'description', header: 'Description' },
        ],
      }}
      footer={(
        <PickButtons className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: '10px 0', flex: 'none', background: 'var(--pb-face)' }}
          size={SIZE.dialog(75)}
          buttons={[
            { label: 'Select', command: 'preference-lookup-select', isDefault: true, disabled: !pick, onClick: () => pick && onPick(pick) },
            { label: 'Cancel', command: 'preference-lookup-cancel', onClick: onClose },
          ]} />
      )}
    />
  )
}

registerAreaWindow('new-preference', NewPreferenceDialog)
