import { useMemo, useState, type ReactNode } from 'react'
import {
  PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBSelect, PBTabs, PBViewHeader, pbSlug,
} from '../pb'
import {
  CODE_SOURCES_KEY, CODE_SOURCE_ROWS, CODE_SYSTEMS_KEY, CODE_SYSTEM_ROWS, codeKey,
  type AltTerm, type CodeMapping, type CodeRecord, type CodeSourceRow, type CodeSystemRow, type ValueSet, type ValueSetValue,
} from '../data/codesets'
import { REFERENCE_SETS } from '../data/adminLists'
import { useScreenReport } from '../host/screen-state'
import { useCodeMappings, useCodeRecords, useStoredList, useValueSets } from './adminSession'
import { ButtonBand, CellSelect, CellText, CentredFooter, Cmd, Line, NavyBand, onF2 } from './adminKit'
import { UniversalSearchDialog } from './CodeLookupDialogs'
import { DemographicModal } from './DemographicDialogs'
import { StageMessageBox } from './StageWindow'

/* ============================================================================
   Administration ▸ Codeset Management — Sources, Systems, Codes, Value Sets
   and Mapping. (Reference Sets and Lookup Settings are AdminListsView's.)

   PROVENANCE: 2069355 and its captures, as listed in data/codesets.ts —
   Codes `7bd01e69…` and `36fd5bcb…`; Value Set List `12a10efa…`,
   `35d919e2…`; Value Set Detail `927c8e00…`, `040ba125…`; Code Mapping
   `e44221079…`. The user's build (v02.31.23) has not been captured for any
   of these, so the latest manual capture of each is what is drawn.

   INFERRED — no capture, built from 2069355's prose:
     · Code Source List (Sources): inline Legal Name · Common Name · Abbrev.
       · Active; New Record adds a row; there is no Delete ("Code sources
       cannot be deleted"); a source is retired by unticking Active and Save.
     · Code System List (Systems) and its pop-ups New Code System ("Add New
       (F2)") and Code System Detail (Save Changes (F2)): the grid's Active
       tick is read-only, the pop-up's is not; only user-created systems
       delete.
     · New Value Set (Value Sets ▸ New Record): Common Name, Description,
       Create Record / Cancel — then Value Set Detail opens on it.
     · The messages MOIS gives when a delete is refused.

   Behaviour: every list is this stage session's (screens/adminSession.ts);
   Save / Save Changes (F2) commit, Undo / Cancel drop the edits. A value
   added to EXTERNAL ORGANIZATION TYPE or CONTACT LIST GROUP is in the
   Organization List's and New Contact List's drop-downs; a preferred term or
   an alternate term saved under Codes is what the Universal Search Window
   finds and shows.

   Anchors (beyond the command rows' host.mois.command.<label>):
     rows    host.mois.row.source-<abbrev>, system-<system>,
             value-set-<name>, value-<value>, mapping-<n>, alt-term-<n>
     fields  host.mois.field.source-<col>-<n>, code, code-system, term,
             category, code-active, alt-term-<n>, value-<col>-<n> …
     bands   host.mois.command.alternate-terms-add / -delete,
             reference-sets-add / -delete, mappings-add-from / -add-to /
             -delete, value-list-add-record / -insert-record / -delete-value
     dialogs new-code-system, code-system-detail, new-value-set,
             value-set-detail, codeset-message
   ========================================================================= */

const S = (v: unknown) => (v == null ? '' : String(v))

export const codesetNodes = ['ad-code-sources', 'ad-code-systems', 'ad-codes', 'ad-value-sets', 'ad-code-mapping']

export function CodesetManagementView({ node, onClose }: { node: string; onClose: () => void }) {
  switch (node) {
    case 'ad-code-sources': return <CodeSourceList onClose={onClose} />
    case 'ad-code-systems': return <CodeSystemList onClose={onClose} />
    case 'ad-codes': return <CodesWindow />
    case 'ad-value-sets': return <ValueSetList onClose={onClose} />
    case 'ad-code-mapping': return <CodeMappingWindow />
    default: return null
  }
}

/** A refusal or a confirmation, reported as `host.dialog = codeset-message`. */
function Notice({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <StageMessageBox id="codeset-message" title="MOIS" icon="info" buttons={[{ label: 'OK', value: 'ok', default: true }]} onClose={onClose}>
      {text}
    </StageMessageBox>
  )
}

function Grid({ children }: { children: ReactNode }) {
  return <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3, background: '#fff' }}>{children}</div>
}

/* ===========================================================================
   Sources — INFERRED (2069355 prose)
   ======================================================================== */

function CodeSourceList({ onClose }: { onClose: () => void }) {
  const [saved, setSavedRows] = useStoredList<CodeSourceRow>(CODE_SOURCES_KEY, CODE_SOURCE_ROWS)
  const [rows, setRows] = useState<CodeSourceRow[]>(saved)
  const [cur, setCur] = useState(0)
  const [savedFlag, setSavedFlag] = useState(false)
  const dirty = rows !== saved
  useScreenReport({ rows: rows.length, row: rows[cur] ? `source-${pbSlug(rows[cur]!.abbrev) || cur + 1}` : null, saved: savedFlag && !dirty, draft: dirty })
  const edit = (i: number, patch: Partial<CodeSourceRow>) => { setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x))); setSavedFlag(false) }
  return (
    <>
      <PBViewHeader title="Code Source List" />
      <PBCommandRow
        commands={[
          { label: 'New Record', onClick: () => { setRows((r) => [...r, { legal: '', common: '', abbrev: '', active: true }]); setCur(rows.length); setSavedFlag(false) } },
          { label: 'Save', onClick: () => { const next = rows.filter((r) => r.legal.trim() || r.abbrev.trim()); setSavedRows(() => next); setRows(next); setSavedFlag(true) } },
          { label: 'Undo', onClick: () => { setRows(saved); setCur(0); setSavedFlag(false) } },
          { label: 'Close Window', onClick: onClose },
        ]}
      />
      <Grid>
        <PBDataWindow<CodeSourceRow>
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(r, i) => `host.mois.row.source-${pbSlug(r.abbrev) || i + 1}`}
          columns={[
            { key: 'legal', header: 'Legal Name', width: 330, headAlign: 'center', render: (r, i) => <CellText value={r.legal} readOnly={r.preloaded} onChange={(v) => edit(i, { legal: v })} anchor={`source-legal-name-${i + 1}`} /> },
            { key: 'common', header: 'Common Name', width: 200, headAlign: 'center', render: (r, i) => <CellText value={r.common} readOnly={r.preloaded} onChange={(v) => edit(i, { common: v })} anchor={`source-common-name-${i + 1}`} /> },
            { key: 'abbrev', header: 'Abbrev.', width: 110, headAlign: 'center', render: (r, i) => <CellText value={r.abbrev} readOnly={r.preloaded} onChange={(v) => edit(i, { abbrev: v.toUpperCase() })} anchor={`source-abbrev-${i + 1}`} /> },
            { key: 'active', header: 'Active', width: 50, align: 'center', render: (r, i) => <PBCheckbox checked={r.active} onChange={(v) => edit(i, { active: v })} tutorialId={`host.mois.field.source-active-${i + 1}`} /> },
          ]}
        />
      </Grid>
    </>
  )
}

/* ===========================================================================
   Systems — INFERRED (2069355 prose)
   ======================================================================== */

function CodeSystemList({ onClose }: { onClose: () => void }) {
  const [rows, update] = useStoredList<CodeSystemRow>(CODE_SYSTEMS_KEY, CODE_SYSTEM_ROWS)
  const [sources] = useStoredList<CodeSourceRow>(CODE_SOURCES_KEY, CODE_SOURCE_ROWS)
  const [cur, setCur] = useState(0)
  const [dialog, setDialog] = useState<'new' | 'edit' | null>(null)
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState<Record<string, string>>({})
  const shown = rows.filter((r) => ['system', 'desc'].every((k) => S(r[k as keyof CodeSystemRow]).toUpperCase().includes((filter[k] ?? '').trim().toUpperCase())))
  const row = shown[Math.min(cur, Math.max(0, shown.length - 1))]
  useScreenReport({ rows: rows.length, row: row ? `system-${pbSlug(row.system)}` : null })
  const del = () => {
    if (!row) return
    if (row.preloaded) { setNotice('Pre-loaded code systems cannot be deleted. Use Edit Record and untick Active to make it inactive.'); return }
    update((r) => r.filter((x) => x !== row)); setCur(0)
  }
  return (
    <>
      <PBViewHeader title="Code System List" />
      <PBCommandRow
        commands={[
          { label: 'New Record', onClick: () => setDialog('new') },
          { label: 'Delete Record', onClick: del },
          { label: 'Edit Record', onClick: () => row && setDialog('edit') },
          { label: 'Close Window', onClick: onClose },
        ]}
      />
      <Grid>
        <PBDataWindow<CodeSystemRow>
          rows={shown}
          current={Math.min(cur, Math.max(0, shown.length - 1))}
          onCurrentChange={setCur}
          onActivate={(_r, i) => { setCur(i); setDialog('edit') }}
          rowTutorialId={(r) => `host.mois.row.system-${pbSlug(r.system)}`}
          filters={[
            <PBInput key="s" value={filter.system ?? ''} onChange={(e) => setFilter({ ...filter, system: e.target.value })} data-tutorial-id="host.mois.field.filter-code-system" />,
            <PBInput key="d" value={filter.desc ?? ''} onChange={(e) => setFilter({ ...filter, desc: e.target.value })} data-tutorial-id="host.mois.field.filter-description" />,
            null, null, null,
          ]}
          style={{ ['--pb-band' as string]: '#ffffff' }}
          rowClassName={(r) => (r.active ? undefined : 'is-inactive')}
          columns={[
            { key: 'system', header: 'Code System', width: 150, headAlign: 'center' },
            { key: 'desc', header: 'Description', width: 330, headAlign: 'center' },
            { key: 'source', header: 'Source', width: 100, headAlign: 'center' },
            { key: 'oid', header: 'OID', width: 150, headAlign: 'center' },
            /* read-only here: "you cannot un-check the ticky box on the main page" */
            { key: 'active', header: 'Active', width: 50, align: 'center', render: (r) => <PBCheckbox checked={r.active} disabled /> },
          ]}
        />
      </Grid>
      <style>{'.is-inactive > td { color: #9c9c9c; }'}</style>
      {dialog && (
        <CodeSystemDialog
          mode={dialog}
          row={dialog === 'edit' ? row : undefined}
          sources={sources.filter((s) => s.active).map((s) => s.abbrev)}
          taken={rows.map((r) => r.system)}
          onSave={(next) => {
            if (dialog === 'new') { update((r) => [...r, next]); setCur(rows.length) } else if (row) update((r) => r.map((x) => (x === row ? next : x)))
            setDialog(null)
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {notice && <Notice text={notice} onClose={() => setNotice('')} />}
    </>
  )
}

function CodeSystemDialog({ mode, row, sources, taken, onSave, onClose }: {
  mode: 'new' | 'edit'; row?: CodeSystemRow; sources: string[]; taken: string[]
  onSave: (row: CodeSystemRow) => void; onClose: () => void
}) {
  const [d, setD] = useState<CodeSystemRow>(row ?? { system: '', desc: '', source: sources[0] ?? '', oid: '', active: true })
  const ok = () => {
    const system = d.system.trim().toUpperCase()
    if (!system || (mode === 'new' && taken.includes(system))) return
    onSave({ ...d, system })
  }
  const id = mode === 'new' ? 'new-code-system' : 'code-system-detail'
  return (
    <DemographicModal title={mode === 'new' ? 'New Code System' : 'Code System Detail'} width={520} onClose={onClose} dialog={id}>
      <div style={{ padding: '10px 16px', background: 'var(--pb-face)' }} onKeyDown={onF2(ok)}>
        <Line label="Code System:" w={96}>
          <PBInput w={200} value={d.system} readOnly={mode === 'edit'} style={mode === 'edit' ? { background: '#e8e8e8', fontWeight: 700 } : undefined}
            onChange={(e) => setD({ ...d, system: e.target.value })} data-tutorial-id="host.mois.field.code-system-name" />
          {mode === 'new' && <span style={{ color: '#808080' }}>(required - unique)</span>}
        </Line>
        <Line label="Description:" w={96}><PBInput w={340} value={d.desc} onChange={(e) => setD({ ...d, desc: e.target.value })} data-tutorial-id="host.mois.field.code-system-description" /></Line>
        <Line label="Source:" w={96}><PBSelect w={200} options={['', ...sources]} value={d.source} onChange={(e) => setD({ ...d, source: e.target.value })} data-tutorial-id="host.mois.field.code-system-source" /></Line>
        <Line label="OID:" w={96}><PBInput w={200} value={d.oid} onChange={(e) => setD({ ...d, oid: e.target.value })} data-tutorial-id="host.mois.field.code-system-oid" /></Line>
        <Line label="Active:" w={96}><PBCheckbox label="Yes" checked={d.active} onChange={(v) => setD({ ...d, active: v })} tutorialId="host.mois.field.code-system-active" /></Line>
      </div>
      <CentredFooter>
        <Cmd id={mode === 'new' ? 'add-new' : 'save-changes'} w={112} primary onClick={ok}>{mode === 'new' ? 'Add New (F2)' : 'Save Changes (F2)'}</Cmd>
        <Cmd id="code-system-cancel" w={88} onClick={onClose}>Cancel</Cmd>
      </CentredFooter>
    </DemographicModal>
  )
}

/* ===========================================================================
   Codes                                  `7bd01e69…`, `36fd5bcb…`
   ======================================================================== */

const BLANK_CODE: CodeRecord = { code: '', system: '', term: '', category: '', active: true, alternates: [], sets: [], user: true }

function CodesWindow() {
  const [records, updateRecords] = useCodeRecords()
  const [mappings, updateMappings] = useCodeMappings()
  const [systems] = useStoredList<CodeSystemRow>(CODE_SYSTEMS_KEY, CODE_SYSTEM_ROWS)
  const [draft, setDraft] = useState<CodeRecord | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [maps, setMaps] = useState<CodeMapping[]>([])
  const [finding, setFinding] = useState(false)
  const [notice, setNotice] = useState('')
  const [saved, setSaved] = useState(false)
  const [altCur, setAltCur] = useState(0)
  const [setCur, setSetCur] = useState(0)
  const [mapCur, setMapCur] = useState(0)

  const keyOf = (r: { system: string; code: string }) => codeKey(r.system, r.code)
  const stored = draft && !isNew ? records.find((r) => keyOf(r) === keyOf(draft)) : undefined
  useScreenReport({ row: draft?.code ? `code-${pbSlug(draft.code)}` : null, saved, draft: Boolean(draft) && !saved, altTerms: draft?.alternates.length ?? 0 })

  const load = (rec: CodeRecord) => {
    setDraft(structuredClone(rec)); setIsNew(false); setSaved(false); setAltCur(0); setSetCur(0); setMapCur(0)
    setMaps(mappings.filter((m) => keyOf({ system: m.fromSystem, code: m.fromCode }) === keyOf(rec) || keyOf({ system: m.toSystem, code: m.toCode }) === keyOf(rec)))
  }
  const termOf = (system: string, code: string) => records.find((r) => r.system === system && r.code === code)?.term ?? ''
  const set = (patch: Partial<CodeRecord>) => { setDraft((d) => (d ? { ...d, ...patch } : d)); setSaved(false) }

  const save = () => {
    if (!draft) return
    if (!draft.code.trim() || !draft.system || !draft.term.trim()) { setNotice('A code needs a Code, a Code System and a Term.'); return }
    if (isNew && records.some((r) => keyOf(r) === keyOf(draft))) { setNotice(`Code ${draft.code} already exists in ${draft.system}.`); return }
    const next: CodeRecord = { ...draft, code: draft.code.trim(), term: draft.term.trim().toUpperCase() }
    updateRecords((all) => (isNew ? [...all, next] : all.map((r) => (keyOf(r) === keyOf(next) ? next : r))))
    updateMappings((all) => [
      ...all.filter((m) => keyOf({ system: m.fromSystem, code: m.fromCode }) !== keyOf(next) && keyOf({ system: m.toSystem, code: m.toCode }) !== keyOf(next)),
      ...maps.filter((m) => m.fromCode && m.toCode).map((m) => ({ ...m, fromTerm: m.fromTerm || termOf(m.fromSystem, m.fromCode), toTerm: m.toTerm || termOf(m.toSystem, m.toCode) })),
    ])
    setDraft(next); setIsNew(false); setSaved(true)
  }
  const command = (label: string) => {
    if (label === 'New') { setDraft(structuredClone(BLANK_CODE)); setIsNew(true); setMaps([]); setSaved(false) }
    if (label === 'Save') save()
    if (label === 'Undo') { if (stored) load(stored); else { setDraft(null); setIsNew(false) } }
    if (label === 'Find') setFinding(true)
    if (label === 'Reset') { setDraft(null); setIsNew(false); setMaps([]); setSaved(false) }
    if (label === 'Delete' && draft) {
      if (!draft.user) { setNotice('Pre-loaded codes cannot be deleted. Untick Active and Save to retire the code.'); return }
      updateRecords((all) => all.filter((r) => keyOf(r) !== keyOf(draft)))
      setDraft(null); setIsNew(false)
    }
  }

  const alts = draft?.alternates ?? []
  const editAlt = (i: number, patch: Partial<AltTerm>) => set({ alternates: alts.map((a, j) => (j === i ? { ...a, ...patch } : a)) })
  const refs = draft?.sets ?? []
  const lockedField = { background: '#e8e8e8' }

  return (
    <>
      <PBViewHeader title="Codes" />
      <PBCommandRow commands={['New', 'Delete', 'Save', 'Undo', 'Find', 'Reset'].map((label) => ({ label, onClick: () => command(label), disabled: !draft && ['Delete', 'Save', 'Undo'].includes(label) }))} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--pb-face)' }}>
        {/* the code's own fields: the light-blue header block */}
        <div style={{ padding: '4px 10px', background: 'linear-gradient(#f3f9fd, #d9ecf9)', borderBottom: '1px solid #9ab', flex: 'none' }}>
          <Line label="Code:" w={86}>
            <PBInput w={156} value={draft?.code ?? ''} readOnly={!isNew} style={isNew ? undefined : lockedField} onChange={(e) => set({ code: e.target.value })} data-tutorial-id="host.mois.field.code" />
          </Line>
          <Line label="Code System:" w={86}>
            {isNew
              ? <PBSelect w={156} options={['', ...systems.filter((s) => s.active).map((s) => s.system)]} value={draft?.system ?? ''} onChange={(e) => set({ system: e.target.value })} data-tutorial-id="host.mois.field.code-system" />
              : <PBInput w={156} value={draft?.system ?? ''} readOnly style={lockedField} data-tutorial-id="host.mois.field.code-system" />}
          </Line>
          <Line label={<><span style={{ color: '#e00000' }}>●</span> Term:</>} w={86}>
            {/* the preferred description a coded row shows (2069363) */}
            <PBInput w={414} value={draft?.term ?? ''} readOnly={!draft} onChange={(e) => set({ term: e.target.value.toUpperCase() })} data-tutorial-id="host.mois.field.term" />
          </Line>
          <Line label="Category:" w={86}>
            <PBInput w={156} value={draft?.category ?? ''} readOnly={!draft} onChange={(e) => set({ category: e.target.value.toUpperCase() })} data-tutorial-id="host.mois.field.category" />
            <span style={{ marginLeft: 'auto', paddingRight: 150 }}>Active</span>
            <PBCheckbox checked={draft?.active ?? true} disabled={!draft} onChange={(v) => set({ active: v })} tutorialId="host.mois.field.code-active" />
          </Line>
        </div>

        {/* Alternate Terms */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', minHeight: 110, borderBottom: '1px solid #a0a0a0' }}>
          <ButtonBand
            caption="Alternate Terms"
            scope="alternate-terms"
            buttons={[
              { label: 'Add', disabled: !draft, onPress: () => { set({ alternates: [...alts, { term: '', lang: 'EN', active: true, type: 'SYN', subtype: 'QUICK CODE', user: true }] }); setAltCur(alts.length) } },
              { label: 'Delete', disabled: !draft, onPress: () => {
                const a = alts[altCur]
                if (!a) return
                if (!a.user) { setNotice('Pre-loaded terms cannot be deleted or edited. Untick Active to hide a term.'); return }
                set({ alternates: alts.filter((_, j) => j !== altCur) }); setAltCur(0)
              } },
            ]}
          />
          <Grid>
            <PBDataWindow<AltTerm>
              rows={alts}
              current={altCur}
              onCurrentChange={setAltCur}
              empty=" "
              rowTutorialId={(_r, i) => `host.mois.row.alt-term-${i + 1}`}
              columns={[
                { key: 'term', header: 'Term', width: 540, headAlign: 'center', render: (a, i) => (a.user ? <CellText value={a.term} onChange={(t) => editAlt(i, { term: t.toUpperCase() })} anchor={`alt-term-${i + 1}`} /> : a.term) },
                { key: 'lang', header: 'Lang', width: 34, align: 'center' },
                { key: 'active', header: 'Active', width: 44, align: 'center', render: (a, i) => <PBCheckbox checked={a.active} onChange={(v) => editAlt(i, { active: v })} tutorialId={`host.mois.field.alt-term-active-${i + 1}`} /> },
                { key: 'type', header: 'Type', width: 56, align: 'center' },
                { key: 'subtype', header: 'Subtype', width: 110, align: 'center' },
              ]}
            />
          </Grid>
        </div>

        {/* Associated Reference Sets */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', minHeight: 90, borderBottom: '1px solid #a0a0a0' }}>
          <ButtonBand
            caption="Associated Reference Sets"
            scope="reference-sets"
            buttons={[
              { label: 'Add', disabled: !draft, onPress: () => { set({ sets: [...refs, { set: '', active: true }] }); setSetCur(refs.length) } },
              { label: 'Delete', disabled: !draft, onPress: () => { set({ sets: refs.filter((_, j) => j !== setCur) }); setSetCur(0) } },
            ]}
          />
          <Grid>
            <PBDataWindow<{ set: string; active: boolean }>
              rows={refs}
              current={setCur}
              onCurrentChange={setSetCur}
              empty=" "
              columns={[
                { key: 'set', header: 'Reference Set', width: 414, headAlign: 'center', render: (r, i) => <CellSelect value={r.set} options={['', ...REFERENCE_SETS.map((x) => String(x.set))]} onChange={(val) => set({ sets: refs.map((x, j) => (j === i ? { ...x, set: val } : x)) })} anchor={`reference-set-${i + 1}`} /> },
                { key: 'active', header: 'Active', width: 44, align: 'center', render: (r, i) => <PBCheckbox checked={r.active} onChange={(val) => set({ sets: refs.map((x, j) => (j === i ? { ...x, active: val } : x)) })} /> },
              ]}
            />
          </Grid>
        </div>

        {/* Associated Mappings */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', minHeight: 110 }}>
          <ButtonBand
            caption="Associated Mappings"
            scope="mappings"
            buttons={[
              { label: 'Add From', disabled: !draft, onPress: () => { if (!draft) return; setMaps((m) => [...m, { fromSystem: draft.system, fromCode: draft.code, fromTerm: draft.term, toSystem: '', toCode: '', toTerm: '', active: true }]); setMapCur(maps.length); setSaved(false) } },
              { label: 'Add To', disabled: !draft, onPress: () => { if (!draft) return; setMaps((m) => [...m, { fromSystem: '', fromCode: '', fromTerm: '', toSystem: draft.system, toCode: draft.code, toTerm: draft.term, active: true }]); setMapCur(maps.length); setSaved(false) } },
              { label: 'Delete', disabled: !draft, onPress: () => {
                const m = maps[mapCur]
                if (!m) return
                if (m.preloaded) { setNotice('Mappings that are pre-loaded into the system cannot be modified.'); return }
                setMaps((all) => all.filter((_, j) => j !== mapCur)); setMapCur(0); setSaved(false)
              } },
            ]}
          />
          <Grid>
            <MappingGrid rows={maps} cur={mapCur} setCur={setMapCur} systems={systems.map((s) => s.system)} termOf={termOf}
              onEdit={(i, patch) => { setMaps((all) => all.map((m, j) => (j === i ? { ...m, ...patch } : m))); setSaved(false) }} />
          </Grid>
          <div style={{ padding: '2px 14px', color: '#404040', flex: 'none' }}>Rows:&nbsp;&nbsp;&nbsp;&nbsp;{maps.length}</div>
        </div>
      </div>

      {finding && (
        <UniversalSearchDialog
          admin
          onClose={() => setFinding(false)}
          onPick={(r) => {
            const rec = records.find((x) => x.system === r.system && x.code === r.code)
            load(rec ?? { code: r.code, system: r.system, term: r.term, category: r.category, active: true, alternates: r.alternates.map((t) => ({ term: t, lang: 'EN', active: true, type: 'SYN', subtype: '' })), sets: [] })
            if (!rec) setIsNew(false)
            setFinding(false)
          }}
        />
      )}
      {notice && <Notice text={notice} onClose={() => setNotice('')} />}
    </>
  )
}

/** From · Code · From Term · … · To · Code · To Term · … · Active — `e44221079…`, `36fd5bcb…`. */
function MappingGrid({ rows, cur, setCur, systems, termOf, onEdit, anchorPrefix = 'mapping' }: {
  rows: CodeMapping[]; cur: number; setCur: (i: number) => void; systems: string[]
  termOf: (system: string, code: string) => string
  onEdit: (i: number, patch: Partial<CodeMapping>) => void
  anchorPrefix?: string
}) {
  const ro = (m: CodeMapping) => Boolean(m.preloaded)
  const sys = (m: CodeMapping, i: number, side: 'from' | 'to') => (ro(m)
    ? S(side === 'from' ? m.fromSystem : m.toSystem)
    : <CellSelect value={side === 'from' ? m.fromSystem : m.toSystem} options={['', ...systems]} onChange={(val) => onEdit(i, side === 'from' ? { fromSystem: val, fromTerm: '' } : { toSystem: val, toTerm: '' })} anchor={`${anchorPrefix}-${side}-system-${i + 1}`} />)
  const code = (m: CodeMapping, i: number, side: 'from' | 'to') => (ro(m)
    ? S(side === 'from' ? m.fromCode : m.toCode)
    : <CellText value={side === 'from' ? m.fromCode : m.toCode} onChange={(val) => onEdit(i, side === 'from'
      ? { fromCode: val, fromTerm: termOf(m.fromSystem, val) }
      : { toCode: val, toTerm: termOf(m.toSystem, val) })} anchor={`${anchorPrefix}-${side}-code-${i + 1}`} />)
  return (
    <PBDataWindow<CodeMapping>
      rows={rows}
      current={cur}
      onCurrentChange={setCur}
      empty=" "
      rowTutorialId={(_m, i) => `host.mois.row.${anchorPrefix}-${i + 1}`}
      columns={[
        { key: 'fromSystem', header: 'From', width: 90, headAlign: 'center', render: (m, i) => sys(m, i, 'from') },
        { key: 'fromCode', header: 'Code', width: 90, headAlign: 'center', render: (m, i) => code(m, i, 'from') },
        { key: 'fromTerm', header: 'From Term', width: 200, headAlign: 'center' },
        { key: 'gap', header: '', width: 14 },
        { key: 'toSystem', header: 'To', width: 90, headAlign: 'center', render: (m, i) => sys(m, i, 'to') },
        { key: 'toCode', header: 'Code', width: 90, headAlign: 'center', render: (m, i) => code(m, i, 'to') },
        { key: 'toTerm', header: 'To Term', width: 200, headAlign: 'center' },
        { key: 'active', header: 'Active', width: 44, align: 'center', render: (m, i) => <PBCheckbox checked={m.active} disabled={ro(m)} onChange={(val) => onEdit(i, { active: val })} /> },
      ]}
    />
  )
}

/* ===========================================================================
   Code Mapping                           `e44221079…`
   ======================================================================== */

function CodeMappingWindow() {
  const [saved, update] = useCodeMappings()
  const [records] = useCodeRecords()
  const [systems] = useStoredList<CodeSystemRow>(CODE_SYSTEMS_KEY, CODE_SYSTEM_ROWS)
  const [rows, setRows] = useState<CodeMapping[]>(saved)
  const [cur, setCur] = useState(0)
  const [q, setQ] = useState({ fromSystem: '', fromCode: '', toSystem: '', toCode: '' })
  const [limit, setLimit] = useState('200')
  const [picking, setPicking] = useState<'from' | 'to' | null>(null)
  const [notice, setNotice] = useState('')
  const [savedFlag, setSavedFlag] = useState(false)
  const termOf = (system: string, code: string) => records.find((r) => r.system === system && r.code === code)?.term ?? ''
  const match = (have: string, want: string) => !want.trim() || have.toUpperCase().startsWith(want.trim().toUpperCase())
  const shown = useMemo(() => rows
    .map((m, index) => ({ m, index }))
    .filter(({ m }) => !m.fromCode || (match(m.fromSystem, q.fromSystem) && match(m.fromCode, q.fromCode) && match(m.toSystem, q.toSystem) && match(m.toCode, q.toCode)))
    .slice(0, Math.max(0, Number(limit) || 0)), [rows, q, limit])
  const at = Math.min(cur, Math.max(0, shown.length - 1))
  useScreenReport({ rows: shown.length, saved: savedFlag, draft: rows !== saved })
  /* "Search fields can be cleared by hitting Delete or Backspace … when your
     cursor is in the field" */
  const box = (key: keyof typeof q, w: number, anchor: string) => (
    <PBInput w={w} value={q[key]} data-tutorial-id={`host.mois.field.${anchor}`}
      onChange={(e) => { setQ({ ...q, [key]: e.target.value }); setCur(0) }}
      onKeyDown={(e) => { if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); setQ({ ...q, [key]: '' }) } }} />
  )
  const edit = (i: number, patch: Partial<CodeMapping>) => { setRows((all) => all.map((m, j) => (j === i ? { ...m, ...patch } : m))); setSavedFlag(false) }
  return (
    <>
      <PBViewHeader title="Code Mapping" />
      <PBCommandRow
        commands={[
          { label: 'New', onClick: () => { setRows((r) => [...r, { fromSystem: '', fromCode: '', fromTerm: '', toSystem: '', toCode: '', toTerm: '', active: true }]); setCur(shown.length); setSavedFlag(false) } },
          { label: 'Delete', onClick: () => {
            const hit = shown[at]
            if (!hit) return
            if (hit.m.preloaded) { setNotice('Mappings that are pre-loaded into the system cannot be modified.'); return }
            setRows((r) => r.filter((_, j) => j !== hit.index)); setCur(0)
          } },
          { label: 'Save', onClick: () => { const next = rows.filter((m) => m.fromCode && m.toCode); update(() => next); setRows(next); setSavedFlag(true) } },
          { label: 'Undo', onClick: () => { setRows(saved); setSavedFlag(false) } },
          { label: 'Reset', onClick: () => { setQ({ fromSystem: '', fromCode: '', toSystem: '', toCode: '' }); setCur(0) } },
        ]}
      />
      <div className="pb-row" style={{ gap: 2, padding: '3px 3px 3px 18px', background: 'var(--pb-face)', flex: 'none' }}>
        {box('fromSystem', 70, 'mapping-search-from-system')}{box('fromCode', 70, 'mapping-search-from-code')}
        <Cmd id="mapping-search-from-dots" w={18} sm onClick={() => setPicking('from')}>…</Cmd>
        <span style={{ width: 220 }} />
        {box('toSystem', 70, 'mapping-search-to-system')}{box('toCode', 70, 'mapping-search-to-code')}
        <Cmd id="mapping-search-to-dots" w={18} sm onClick={() => setPicking('to')}>…</Cmd>
        <span style={{ flex: '1 1 auto' }} />
        Max row limit:<PBInput w={50} value={limit} onChange={(e) => setLimit(e.target.value)} data-tutorial-id="host.mois.field.max-row-limit" />
      </div>
      <Grid>
        <MappingGrid rows={shown.map((x) => x.m)} cur={at} setCur={setCur} systems={systems.map((s) => s.system)} termOf={termOf}
          onEdit={(i, patch) => { const hit = shown[i]; if (hit) edit(hit.index, patch) }} />
      </Grid>
      {picking && (
        <UniversalSearchDialog
          admin
          onClose={() => setPicking(null)}
          onPick={(r) => {
            setQ(picking === 'from' ? { ...q, fromSystem: r.system, fromCode: r.code } : { ...q, toSystem: r.system, toCode: r.code })
            setPicking(null)
          }}
        />
      )}
      {notice && <Notice text={notice} onClose={() => setNotice('')} />}
    </>
  )
}

/* ===========================================================================
   Value Sets                             `12a10efa…`, `35d919e2…`
   ======================================================================== */

function ValueSetList({ onClose }: { onClose: () => void }) {
  const [sets, update] = useValueSets()
  const [cur, setCur] = useState(0)
  const [filter, setFilter] = useState({ name: '', desc: '' })
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const shown = sets.filter((s) => s.name.toUpperCase().includes(filter.name.trim().toUpperCase()) && s.desc.toUpperCase().includes(filter.desc.trim().toUpperCase()))
  const at = Math.min(cur, Math.max(0, shown.length - 1))
  const row = shown[at]
  useScreenReport({ rows: sets.length, row: row ? `value-set-${pbSlug(row.name)}` : null })
  return (
    <>
      <PBViewHeader title="Value Set List" />
      <PBCommandRow
        commands={[
          { label: 'New Record', onClick: () => setCreating(true) },
          { label: 'Delete Record', onClick: () => {
            if (!row) return
            if (row.system || row.labCodes?.length) { setNotice('A system level value set or a value set assigned to a lab code cannot be deleted from the system.'); return }
            update((all) => all.filter((s) => s.name !== row.name)); setCur(0)
          } },
          { label: 'Edit Record', onClick: () => row && setOpen(row.name) },
          { label: 'Close Window', onClick: onClose },
        ]}
      />
      <Grid>
        <PBDataWindow<ValueSet>
          rows={shown}
          current={at}
          onCurrentChange={setCur}
          onActivate={(r) => setOpen(r.name)}
          rowTutorialId={(r) => `host.mois.row.value-set-${pbSlug(r.name)}`}
          style={{ ['--pb-band' as string]: '#ffffff' }}
          filters={[
            <PBInput key="n" value={filter.name} onChange={(e) => { setFilter({ ...filter, name: e.target.value }); setCur(0) }} data-tutorial-id="host.mois.field.filter-common-name" />,
            <PBInput key="d" value={filter.desc} onChange={(e) => { setFilter({ ...filter, desc: e.target.value }); setCur(0) }} data-tutorial-id="host.mois.field.filter-description" />,
          ]}
          columns={[
            { key: 'name', header: 'Common Name', width: 314, headAlign: 'center' },
            { key: 'desc', header: 'Description', width: 414, headAlign: 'center' },
          ]}
        />
      </Grid>
      {creating && (
        <NewValueSetDialog
          taken={sets.map((s) => s.name)}
          onCreate={(name, desc) => {
            update((all) => [...all, { name, desc, values: [] }].sort((a, b) => a.name.localeCompare(b.name)))
            setCreating(false)
            setOpen(name)
          }}
          onClose={() => setCreating(false)}
        />
      )}
      {open && <ValueSetDetailWindow name={open} onClose={() => setOpen(null)} />}
      {notice && <Notice text={notice} onClose={() => setNotice('')} />}
    </>
  )
}

function NewValueSetDialog({ taken, onCreate, onClose }: { taken: string[]; onCreate: (name: string, desc: string) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const create = () => {
    const n = name.trim().toUpperCase()
    if (!n || taken.includes(n)) return
    onCreate(n, desc.trim())
  }
  return (
    <DemographicModal title="New Value Set" width={460} onClose={onClose} dialog="new-value-set">
      <div style={{ padding: '12px 18px', background: 'var(--pb-face)' }}>
        <Line label="Common Name:" w={96}><PBInput w={300} value={name} onChange={(e) => setName(e.target.value)} data-tutorial-id="host.mois.field.common-name" /></Line>
        <Line label="Description:" w={96}><PBInput w={300} value={desc} onChange={(e) => setDesc(e.target.value)} data-tutorial-id="host.mois.field.description" /></Line>
      </div>
      <CentredFooter>
        <Cmd id="create-record" w={96} onClick={create}>Create Record</Cmd>
        <Cmd id="cancel" w={88} onClick={onClose}>Cancel</Cmd>
      </CentredFooter>
    </DemographicModal>
  )
}

/** Value Set Detail — `040ba125…` (the columns), `927c8e00…` (the frame, Linked Lab Codes). */
export function ValueSetDetailWindow({ name, onClose }: { name: string; onClose: () => void }) {
  const [sets, update] = useValueSets()
  const set = sets.find((s) => s.name === name)
  const [values, setValues] = useState<ValueSetValue[]>(() => structuredClone(set?.values ?? []))
  const [cur, setCur] = useState(0)
  const [tab, setTab] = useState('Value List')
  const labCodes = set?.labCodes ?? []
  const linkedTab = labCodes.length ? `Linked Lab Codes (${labCodes.length})` : 'Linked Lab Codes'
  useScreenReport({ dialog: 'value-set-detail', values: values.length })
  const blank = (): ValueSetValue => ({ value: '', quick: '', desc: '', sort: '0', rank: '0', active: true })
  const edit = (i: number, patch: Partial<ValueSetValue>) => setValues((all) => all.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const save = () => {
    update((all) => all.map((s) => (s.name === name ? { ...s, values: values.filter((x) => x.value.trim()).map((x) => ({ ...x, value: x.value.trim().toUpperCase() })) } : s)))
    onClose()
  }
  const cell = (key: keyof ValueSetValue, align?: 'center' | 'right') => (x: ValueSetValue, i: number) => (
    <CellText value={x[key]} align={align} onChange={(t) => edit(i, { [key]: key === 'value' ? t.toUpperCase() : t })} anchor={`value-${key}-${i + 1}`} />
  )
  return (
    <DemographicModal title="Value Set Detail" width={850} height={720} onClose={onClose} dialog="value-set-detail">
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }} onKeyDown={onF2(save)}>
        <NavyBand>Value Set</NavyBand>
        <div style={{ background: '#a7c9ed', padding: '4px 10px', flex: 'none' }}>
          <div className="pb-row" style={{ gap: 0 }}><span style={{ width: 86 }}>Common Name:</span><span data-tutorial-id="host.mois.field.value-set-name">{set?.name}</span></div>
          <div className="pb-row" style={{ gap: 0 }}><span style={{ width: 86 }}>Description:</span><span>{set?.desc}</span></div>
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '6px 6px 0' }}>
          <PBTabs tabs={['Value List', linkedTab]} active={tab === 'Value List' ? tab : linkedTab} onChange={setTab} compact>
            {tab === 'Value List'
              ? (
                <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <div className="pb-row" style={{ gap: 0, padding: 2, background: '#dcd7d2', flex: 'none' }}>
                    <Cmd id="value-list-add-record" w={80} sm onClick={() => { setValues((all) => [...all, blank()]); setCur(values.length) }}>Add Record</Cmd>
                    <Cmd id="value-list-insert-record" w={86} sm onClick={() => { setValues((all) => [...all.slice(0, cur), blank(), ...all.slice(cur)]) }}>Insert Record</Cmd>
                    <Cmd id="value-list-delete-value" w={82} sm onClick={() => { setValues((all) => all.filter((_, j) => j !== cur)); setCur(Math.max(0, cur - 1)) }}>Delete Value</Cmd>
                  </div>
                  <Grid>
                    <PBDataWindow<ValueSetValue>
                      rows={values}
                      current={Math.min(cur, Math.max(0, values.length - 1))}
                      onCurrentChange={setCur}
                      empty=" "
                      rowTutorialId={(x, i) => `host.mois.row.value-${pbSlug(x.value) || i + 1}`}
                      columns={[
                        { key: 'value', header: 'Value', width: 190, headAlign: 'center', render: cell('value') },
                        { key: 'quick', header: 'Quick Code', width: 76, headAlign: 'center', render: cell('quick') },
                        { key: 'desc', header: 'Description', width: 290, headAlign: 'center', render: cell('desc') },
                        { key: 'sort', header: 'Sort Order', width: 64, align: 'center', render: cell('sort', 'center') },
                        { key: 'rank', header: 'Rank', width: 50, align: 'center', render: cell('rank', 'center') },
                        { key: 'active', header: 'Active', width: 44, align: 'center', render: (x, i) => <PBCheckbox checked={x.active} onChange={(v) => edit(i, { active: v })} tutorialId={`host.mois.field.value-active-${i + 1}`} /> },
                      ]}
                    />
                  </Grid>
                </div>
              )
              : (
                <Grid>
                  <PBDataWindow<{ code: string; desc: string }>
                    rows={labCodes}
                    empty="This value set is not linked to a lab code."
                    columns={[
                      { key: 'code', header: 'Lab Code', width: 160, headAlign: 'center' },
                      { key: 'desc', header: 'Description', width: 400, headAlign: 'center' },
                    ]}
                  />
                </Grid>
              )}
          </PBTabs>
        </div>
        <CentredFooter>
          <Cmd id="save-changes" w={112} primary onClick={save}>Save Changes (F2)</Cmd>
          <Cmd id="value-set-cancel" w={108} onClick={onClose}>Cancel</Cmd>
        </CentredFooter>
      </div>
    </DemographicModal>
  )
}
