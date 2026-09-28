import { useState } from 'react'
import { usePatient, usePatientRoster } from '../data/patient-context'
import { useScreenReport } from '../host/screen-state'
import { PBBand, PBCheckbox, PBDataWindow, PBInput, PBSelect, PBTextArea, pbSlug } from '../pb'
import { Btn, DetailWindow, TopMessage } from './AdminExchangeKit'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { MasterProviderListDialog } from './MasterProviderListDialog'

/* ============================================================================
   Administration ▸ Utilities — the address-to-clipboard pickers, the SQL
   Editor and the Intervention to MAR Converter (303377 "Administration
   Contents"). All four are opened by id from the Utilities menus
   (data/menus/admin.ts, and the Patient Chart's in data/mois.tsx).

   PROVENANCE
   · provider-address-clipboard — 303377: "Opens the Master Provider List to
     select from. The selected provider's information will be copied so it
     may then be pasted into another system". The list is the existing
     Master Provider List (screens/MasterProviderListDialog.tsx, 304741
     `6127fb59…`); Ok copies. MOIS copies silently; the stage says so in a
     small Information box so the step has something to grade and ring —
     that box is INFERRED.
   · patient-address-clipboard — the same for "Patient Address to Clipboard
     (lookup)" ("Opens the Patient Chart List to select from") and, without
     `args.lookup`, "(current)", which copies the open chart's address
     straight away. The Patient Chart List here is INFERRED from the
     Advanced Lookup Service's columns (Chart, Last Name, First Name, DOB).
   · sql-editor — 303377 `4a1842a5…` (407 × 227, small): title "SQL Editor";
     a "SQL Statement" band with Browse… at its right; the statement box;
     Retrieve Data at the left and Save Results… at the right; a "Results"
     band and grid. The text: only SELECT on `tdt_` (data) and `tlp_`
     (lookup) tables; Browse loads a SQL file into the statement; Save
     prompts for a file name and format. The Open / Save As dialogs and the
     error wording are INFERRED; results are a small fictional set.
   · intervention-mar-converter — 303377 `5aa489ff…` (1127 × 740):
     "Intervention to MAR Clean-Up"; a navy header over Line / Intervention
     Description / Move to MAR Folder / "Convert to the following
     Medication" Code (optional) … Description / "Optional" Series, Dose
     Size, Dose Unit; rows grey until their tick is set; Continue / Cancel.
     The row list is the capture's (blank, ALLERGY DESENSITIZATION
     INJECTION, COUNSELING - DIET, COUNSELING - EXERCISE, DNR (DO NOT
     RESUSCITATE), VACCINATION - TETANUS → 00514462 Td). The "…" medication
     lookup and the result message are INFERRED.

   Reported: `host.dialog`; `host.screen.copied` (provider / patient),
   `host.screen.sql` (empty / select / restricted / retrieved),
   `host.screen.checked` (rows ticked to move), `host.screen.converted`.
   ========================================================================= */

/* --- Provider Address to Clipboard ---------------------------------------- */
function ProviderAddressClipboard({ close }: AreaWindowProps) {
  const [copied, setCopied] = useState(false)
  useScreenReport({ copied: copied ? 'provider' : null })
  if (copied) {
    return (
      <TopMessage id="address-copied" title="Provider Address to Clipboard" buttons={['OK']} prefix="copied-" onClose={close}>
        The provider's address has been copied to the clipboard.
      </TopMessage>
    )
  }
  return <MasterProviderListDialog onPick={() => setCopied(true)} onClose={close} />
}

/* --- Patient Address to Clipboard ----------------------------------------- */
function PatientAddressClipboard({ args, close }: AreaWindowProps) {
  const current = usePatient()
  const roster = usePatientRoster()
  const [copied, setCopied] = useState(!args.lookup)
  const [cur, setCur] = useState(0)
  const [filter, setFilter] = useState('')
  useScreenReport({ copied: copied ? 'patient' : null })
  if (copied) {
    return (
      <TopMessage id="address-copied" title="Patient Address to Clipboard" buttons={['OK']} prefix="copied-" onClose={close}>
        {args.lookup || current.chart
          ? "The patient's address has been copied to the clipboard."
          : 'There is no chart open to copy an address from.'}
      </TopMessage>
    )
  }
  const rows = roster
    .filter((p) => !filter || `${p.last} ${p.first} ${p.chart}`.toLowerCase().includes(filter.toLowerCase()))
    .map((p) => ({ chart: p.chart, last: p.last.toUpperCase(), first: p.first.toUpperCase(), dob: p.dob ?? '' }))
  return (
    <DetailWindow id="patient-chart-list" title="Patient Chart List" width={560} height={440} onClose={close}
      buttons={<>
        <Btn id="patient-chart-list-ok" isDefault width={80} disabled={!rows[cur]} onClick={() => setCopied(true)}>Ok</Btn>
        <Btn id="patient-chart-list-cancel" width={80} onClick={close}>Cancel</Btn>
      </>}>
      <div className="pb-row" style={{ gap: 6, padding: 6 }}>
        <span>Find:</span>
        <PBInput w={260} value={filter} onChange={(e) => { setFilter(e.target.value); setCur(0) }} data-tutorial-id="host.mois.field.patient-chart-list-find" />
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 6px 6px' }}>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={() => setCopied(true)}
          rowTutorialId={(r) => `host.mois.row.chart-${r.chart}`}
          columns={[
            { key: 'chart', header: 'Chart', width: 70, align: 'center' },
            { key: 'last', header: 'Last Name', width: 150 },
            { key: 'first', header: 'First Name', width: 150 },
            { key: 'dob', header: 'DOB', width: 90, align: 'center' },
          ]}
        />
      </div>
    </DetailWindow>
  )
}

/* --- SQL Editor ------------------------------------------------------------- */
const SQL_FILES: Record<string, string> = {
  'active_patients.sql': "select chart_no, last_name, first_name, status from tdt_chart where status = 'A'",
  'visit_codes.sql': 'select code, description from tlp_visit_code',
}
const SAMPLE_RESULTS: Record<string, { columns: string[]; rows: string[][] }> = {
  tdt_chart: {
    columns: ['chart_no', 'last_name', 'first_name', 'status'],
    rows: [['10018', 'DIABETES', 'BETTY', 'A'], ['10026', 'MORRISON', 'ASHLEE', 'A'], ['10046', 'WHO', 'LUCY', 'A'], ['10055', 'MOIS', 'SAM', 'A']],
  },
  tlp_visit_code: {
    columns: ['code', 'description'],
    rows: [['C', 'Consultation Visit'], ['F', 'Follow Up'], ['R', 'Routine'], ['TL', 'Telephone'], ['V', 'Virtual']],
  },
}

type SqlState = 'empty' | 'retrieved' | 'restricted' | 'invalid'

function SqlEditor({ close }: AreaWindowProps) {
  const [sql, setSql] = useState('')
  const [state, setState] = useState<SqlState>('empty')
  const [result, setResult] = useState<{ columns: string[]; rows: string[][] } | null>(null)
  const [dialog, setDialog] = useState<null | 'open' | 'save' | 'saved' | 'error'>(null)
  const [openPick, setOpenPick] = useState(Object.keys(SQL_FILES)[0]!)
  const [saveName, setSaveName] = useState('results')
  const [saveFormat, setSaveFormat] = useState('Excel (*.xls)')
  useScreenReport({ sql: state === 'empty' ? (sql.trim() ? 'select' : 'empty') : state })

  const retrieve = () => {
    const text = sql.trim().replace(/;$/, '')
    const m = /^select\s+.+\s+from\s+([a-z0-9_]+)/i.exec(text)
    if (!m) { setState('invalid'); setResult(null); setDialog('error'); return }
    const table = m[1]!.toLowerCase()
    if (!/^(tdt_|tlp_)/.test(table)) { setState('restricted'); setResult(null); setDialog('error'); return }
    setResult(SAMPLE_RESULTS[table] ?? { columns: ['result'], rows: [] })
    setState('retrieved')
  }

  return (
    <DetailWindow id="sql-editor" title="SQL Editor" width={820} height={600} onClose={close}>
      <PBBand right={<Btn id="sql-browse" width={80} onClick={() => setDialog('open')}>Browse...</Btn>}>SQL Statement</PBBand>
      <div style={{ flex: '1 1 45%', minHeight: 0, display: 'flex', padding: 4 }}>
        <PBTextArea value={sql} onChange={(e) => { setSql(e.target.value); setState('empty') }}
          data-tutorial-id="host.mois.field.sql-statement"
          style={{ flex: '1 1 auto', resize: 'none', fontFamily: 'var(--pb-font-mono, monospace)' }} />
      </div>
      <div className="pb-row" style={{ padding: '4px 6px', flex: 'none' }}>
        <Btn id="retrieve-data" width={100} onClick={retrieve}>Retrieve Data</Btn>
        <span className="pb-row__spacer" />
        <Btn id="save-results" width={100} disabled={!result} onClick={() => setDialog('save')}>Save Results...</Btn>
      </div>
      <PBBand>Results</PBBand>
      <div style={{ flex: '1 1 55%', minHeight: 0, display: 'flex', padding: 4 }}>
        {result && (
          <PBDataWindow
            rows={result.rows.map((r) => Object.fromEntries(r.map((v, i) => [result.columns[i]!, v])))}
            columns={result.columns.map((c) => ({ key: c, header: c, width: 140 }))}
            empty="No rows returned."
          />
        )}
      </div>
      {dialog === 'error' && (
        <TopMessage id="sql-error" title="SQL Editor" icon="error" buttons={['OK']} prefix="sql-error-" onClose={() => setDialog(null)}>
          {state === 'restricted'
            ? 'Only SELECT statements on tables prefixed tdt_ (data tables) or tlp_ (lookup tables) are permitted.'
            : 'The SQL statement could not be executed. Enter a valid SELECT statement.'}
        </TopMessage>
      )}
      {dialog === 'open' && (
        <DetailWindow id="sql-open-file" title="Open" width={420} height={300} zIndex={92} onClose={() => setDialog(null)}
          buttons={<>
            <Btn id="sql-open" isDefault width={80} onClick={() => { setSql(SQL_FILES[openPick]!); setState('empty'); setDialog(null) }}>Open</Btn>
            <Btn id="sql-open-cancel" width={80} onClick={() => setDialog(null)}>Cancel</Btn>
          </>}>
          <div style={{ flex: '1 1 auto', display: 'flex', padding: 6 }}>
            <PBDataWindow
              rows={Object.keys(SQL_FILES).map((name) => ({ name }))}
              current={Object.keys(SQL_FILES).indexOf(openPick)}
              onCurrentChange={(i) => setOpenPick(Object.keys(SQL_FILES)[i]!)}
              rowTutorialId={(r) => `host.mois.row.sql-file-${pbSlug(r.name)}`}
              columns={[{ key: 'name', header: 'Name', width: 300 }]}
            />
          </div>
        </DetailWindow>
      )}
      {dialog === 'save' && (
        <DetailWindow id="sql-save-results" title="Save As" width={440} zIndex={92} onClose={() => setDialog(null)}
          buttons={<>
            <Btn id="sql-save" isDefault width={80} disabled={!saveName.trim()} onClick={() => setDialog('saved')}>Save</Btn>
            <Btn id="sql-save-cancel" width={80} onClick={() => setDialog(null)}>Cancel</Btn>
          </>}>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 6, padding: 10 }}>
            <span>File name:</span><PBInput w="100%" value={saveName} onChange={(e) => setSaveName(e.target.value)} data-tutorial-id="host.mois.field.sql-file-name" />
            <span>Save as type:</span>
            <PBSelect w="100%" options={['Excel (*.xls)', 'CSV (*.csv)', 'Text (*.txt)', 'PDF (*.pdf)']} value={saveFormat}
              onChange={(e) => setSaveFormat(e.target.value)} data-tutorial-id="host.mois.field.sql-file-format" />
          </div>
        </DetailWindow>
      )}
      {dialog === 'saved' && (
        <TopMessage id="sql-saved" title="SQL Editor" buttons={['OK']} prefix="sql-saved-" onClose={() => setDialog(null)}>
          The results have been saved.
        </TopMessage>
      )}
    </DetailWindow>
  )
}

/* --- Intervention to MAR Converter ------------------------------------------ */
type ConvertRow = { description: string; move: boolean; code: string; drug: string; series: string; dose: string; unit: string }

const INTERVENTIONS = ['', 'ALLERGY DESENSITIZATION INJECTION', 'COUNSELING - DIET', 'COUNSELING - EXERCISE', 'DNR (DO NOT RESUSCITATE)', 'VACCINATION - TETANUS']
/* INFERRED — what the Code "…" offers */
const MAR_MEDICATIONS = [
  { code: '00514462', drug: 'Td' },
  { code: '02243167', drug: 'Tdap (Adacel)' },
  { code: '02231015', drug: 'Hepatitis B vaccine' },
  { code: '02478889', drug: 'Influenza vaccine' },
]

function InterventionMarConverter({ close }: AreaWindowProps) {
  const [rows, setRows] = useState<ConvertRow[]>(INTERVENTIONS.map((description) => ({ description, move: false, code: '', drug: '', series: '', dose: '', unit: '' })))
  const [lookup, setLookup] = useState<number | null>(null)
  const [pick, setPick] = useState(0)
  const [done, setDone] = useState(false)
  const ticked = rows.filter((r) => r.move).length
  useScreenReport({ checked: ticked, converted: done })
  const set = (i: number, patch: Partial<ConvertRow>) => setRows((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const head = { color: '#fff', padding: '0 4px' }
  const cols = '36px 1fr 90px 90px 18px 1fr 70px 70px 70px'

  return (
    <DetailWindow id="intervention-mar-converter" title="Intervention to MAR Clean-Up" width={1127} height={740} onClose={close}
      buttons={<>
        <span style={{ flex: '1 1 auto' }} />
        <Btn id="convert-continue" isDefault width={80} disabled={!ticked} onClick={() => setDone(true)}>Continue</Btn>
        <Btn id="convert-cancel" width={80} onClick={close}>Cancel</Btn>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'end', background: '#0b5fa0', padding: '4px 0', gap: 4, flex: 'none' }}>
        <span style={head}>Line</span><span style={head}>Intervention Description</span>
        <span style={{ ...head, textAlign: 'center' }}>Move to<br />MAR Folder</span>
        <span style={{ ...head, gridColumn: 'span 3' }}>Convert to the following Medication<br /><span style={{ color: '#f0c080' }}>Code (optional)</span><span style={{ color: '#f0c080', marginLeft: 70 }}>Description</span></span>
        <span style={{ ...head, gridColumn: 'span 3' }}>Optional<br /><span style={{ color: '#f0c080' }}>Series&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Dose Size&nbsp;&nbsp;&nbsp; Dose Unit</span></span>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff' }} data-tutorial-id="host.mois.group.intervention-codes">
        {rows.map((r, i) => (
          <div key={i} data-tutorial-id={`host.mois.row.intervention-${i + 1}`}
            style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 4, height: 26, borderBottom: '1px solid #d8d8d8', background: r.move ? '#e0f0fc' : undefined, color: r.move ? '#000' : '#999' }}>
            <span style={{ padding: '0 4px' }}>{i + 1}</span>
            <span>{r.description}</span>
            <span style={{ textAlign: 'center' }}>
              <PBCheckbox checked={r.move} onChange={(v) => set(i, { move: v })} tutorialId={`host.mois.cell.move-to-mar-${i + 1}`} />
            </span>
            {r.move ? (
              <>
                <PBInput w="100%" value={r.code} onChange={(e) => set(i, { code: e.target.value })} data-tutorial-id={`host.mois.field.convert-code-${i + 1}`} />
                <button type="button" className="pb-btn" style={{ minWidth: 0, width: 18, height: 18, padding: 0 }}
                  data-tutorial-id={`host.mois.lookup.convert-code-${i + 1}`} onClick={() => { setLookup(i); setPick(0) }}>…</button>
                <PBInput w="100%" value={r.drug} onChange={(e) => set(i, { drug: e.target.value })} data-tutorial-id={`host.mois.field.convert-description-${i + 1}`} />
                <PBInput w="100%" value={r.series} onChange={(e) => set(i, { series: e.target.value })} />
                <PBInput w="100%" value={r.dose} onChange={(e) => set(i, { dose: e.target.value })} />
                <PBInput w="100%" value={r.unit} onChange={(e) => set(i, { unit: e.target.value })} />
              </>
            ) : <span style={{ gridColumn: 'span 6' }} />}
          </div>
        ))}
      </div>
      {lookup !== null && (
        <DetailWindow id="mar-medication-lookup" title="Medication Lookup" width={420} height={300} zIndex={92} onClose={() => setLookup(null)}
          buttons={<>
            <Btn id="mar-medication-select" isDefault width={80} onClick={() => { set(lookup, MAR_MEDICATIONS[pick]!); setLookup(null) }}>Select</Btn>
            <Btn id="mar-medication-cancel" width={80} onClick={() => setLookup(null)}>Cancel</Btn>
          </>}>
          <div style={{ flex: '1 1 auto', display: 'flex', padding: 6 }}>
            <PBDataWindow rows={MAR_MEDICATIONS} current={pick} onCurrentChange={setPick}
              onActivate={(m) => { set(lookup, m); setLookup(null) }}
              rowTutorialId={(m) => `host.mois.row.medication-${m.code}`}
              columns={[{ key: 'code', header: 'Code', width: 90 }, { key: 'drug', header: 'Description', width: 260 }]} />
          </div>
        </DetailWindow>
      )}
      {done && (
        <TopMessage id="conversion-complete" title="Intervention to MAR Clean-Up" buttons={['OK']} prefix="convert-" onClose={close}>
          {`The intervention records for ${ticked} code${ticked === 1 ? '' : 's'} have been moved to the MAR folder.`}
        </TopMessage>
      )}
    </DetailWindow>
  )
}

registerAreaWindow('provider-address-clipboard', ProviderAddressClipboard)
registerAreaWindow('patient-address-clipboard', PatientAddressClipboard)
registerAreaWindow('sql-editor', SqlEditor)
registerAreaWindow('intervention-mar-converter', InterventionMarConverter)
