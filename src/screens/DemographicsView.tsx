import { createContext, useContext, useState, type ReactNode } from 'react'
import { useChartRecords } from '../data/chart-records'
import { date } from '../data/charts/relations'
import {
  chartFacilities, chartLocations,
  countries,
  genders, incentiveRows, insuranceCarriers,
  preferredPhones, serviceProviders
} from '../data/mois'
import { ChartHeaderIdentity, PatientOverride, usePatient, usePatientRoster } from '../data/patient-context'
import type { AliasIdEntry, AssociatedPartyEntry, BenefitEntry, Patient, WcbClaimEntry } from '../data/patients'
import {
  PBBand, PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBFixed, PBGroup,
  PBIdentityStrip, PBMessageBox,
  PBInput, PBLookup, PBSelect, PBTabs, PBTextArea, PBViewHeader, type PBColumn,
} from '../pb'
import { useScreenReport } from '../host/screen-state'
import { BenefitSourceServiceWindow, SelectBenefitSourceDialog } from './BenefitDialogs'
import { CmdButton } from './CmdButton'
import { AdvancedGenderDialog } from './AdvancedGenderDialog'
import { PatientDetailPage } from './PatientDetailPage'
import { patientEdits, renamePatientEdits, savePatient, undoPatient, refreshPatient, updatePatient, usePatientEdits, usePatientSaved } from '../data/patient-edits'
import { demographicServiceCenters } from '../data/demographic-lookups'
import { PBDropDownDataWindow } from '../pb'
import { AddressExpiryDialog, AddressWizardDialog, PatientPhotoDialog, MspEligibilityDialog, DemographicLookupDialog,
  DemographicModal, DialogButtons, geographicTerms, today } from './DemographicDialogs'

const TABS = [
  'Demographics', 'Patient Detail', 'ID Alias', 'Connections', 'Services',
  'Associated Parties', 'WCB Claims', 'Other Claims', 'Incentives', 'Settings', 'Benefits',
]

type Incentive = typeof incentiveRows[number]

const incentiveCols: PBColumn<Incentive>[] = [
  { key: 'start', header: 'Start', width: 84, align: 'center' },
  { key: 'end', header: 'End', width: 84, align: 'center' },
  { key: 'diag', header: 'Diag Code', width: 76, align: 'center' },
  { key: 'd1', header: '', dots: true },
  { key: 'fee', header: 'Fee Code Description' },
  { key: 'd2', header: '', dots: true },
  { key: 'freq', header: 'Freq. (mnth)', width: 82, align: 'center' },
]

/** Live TRAINING client: about 800px of content inside the 1000px frame. */
const DESIGN_W = 800

/* --- the record the command row acts on ----------------------------------
   New Record and Delete Record act on the tab in front: on Demographics and
   Patient Detail the record is the chart itself (art. 301171: New Record
   empties the window for a chart that has no number yet), and on a list tab
   it is a row of that list (art. 301554 / 301555: New Record adds a party /
   a claim). The list tabs keep their current row here so the command row
   can add to and delete from the right list. */
type ListKey = 'aliasIds' | 'associatedParties' | 'wcbClaims'
const LIST_TABS: Record<string, ListKey> = {
  'ID Alias': 'aliasIds',
  'Associated Parties': 'associatedParties',
  'WCB Claims': 'wcbClaims',
}
type Cursors = { current: Partial<Record<ListKey, number>>; set: (key: ListKey, i: number) => void }
const CursorContext = createContext<Cursors>({ current: {}, set: () => {} })

/** A chart number MOIS has not used yet: the next one after the highest on file. */
function nextChartNumber(roster: Patient[]) {
  const top = roster.reduce((m, p) => Math.max(m, /^\d+$/.test(p.chart) ? Number(p.chart) : 0), 0)
  return String(top + 1)
}

/** A registration in progress. `chart` is blank until Save assigns it; the
    blank chart's edits are keyed '' so every window that writes
    `updatePatient(patient.chart, …)` writes to the new record, and Save moves
    them to the number it assigns. */
type NewChart = { chart: string }

const BLANK: Patient = { chart: '', status: 'A', first: '', middle: '', last: '', dob: '', gender: '' }

export function DemographicsView({ onLookup, onStepChart }: {
  /** the "…" beside Chart No. and F4: the Patient Chart List */
  onLookup?: () => void
  /** Previous Chart / Next Chart */
  onStepChart?: (delta: 1 | -1) => void
} = {}) {
  const open = usePatient()
  const roster = usePatientRoster()
  const [tab, setTab] = useState('Demographics')
  const [cursor, setCursor] = useState<Partial<Record<ListKey, number>>>({})
  const [fresh, setFresh] = useState<NewChart | null>(null)
  const [duplicate, setDuplicate] = useState<Patient | null>(null)
  const freshEdits = usePatientEdits(fresh?.chart ?? '')
  const patient = fresh ? { ...BLANK, ...freshEdits, chart: fresh.chart } : null
  const cursors: Cursors = { current: cursor, set: (key, i) => setCursor((c) => ({ ...c, [key]: i })) }
  const listKey = LIST_TABS[tab]
  const target = fresh ? fresh.chart : open.chart
  const current = fresh ? { ...BLANK, ...freshEdits } : open
  const saved = usePatientSaved(target)

  /* host.screen.draft while a new chart has no number yet, record 'saved'
     once Save has given it one; saved = no unsaved edits on the chart */
  useScreenReport({
    ...(fresh && !fresh.chart ? { draft: true } : {}),
    ...(fresh?.chart ? { record: 'saved' } : {}),
    saved,
    chartStatus: current.status ?? '',
    ...(listKey ? { rows: (current[listKey] ?? []).length }
      : tab === 'Benefits' ? { rows: (current.benefits ?? []).length }
      : tab === 'Settings' ? { rows: (current.contactPreferences ?? []).length } : {}),
    designation: current.genderDesignations?.preferred || current.genderDesignations?.genotypic ? 'set' : 'none',
  })

  const newRecord = () => {
    if (listKey) {
      const list = (current[listKey] ?? []) as object[]
      updatePatient(target, { [listKey]: [{}, ...list] } as Partial<Patient>)
      cursors.set(listKey, 0)
      return
    }
    /* a new chart: the window empties, and Chart No. stays blank until Save */
    refreshPatient('')
    setFresh({ chart: '' })
    setTab('Demographics')
  }
  const deleteRecord = () => {
    if (listKey) {
      const list = (current[listKey] ?? []) as object[]
      const i = Math.min(cursor[listKey] ?? 0, list.length - 1)
      if (i < 0) return
      updatePatient(target, { [listKey]: list.filter((_, n) => n !== i) } as Partial<Patient>)
      cursors.set(listKey, Math.max(0, i - 1))
      return
    }
    /* an unsaved registration is simply thrown away */
    if (fresh && !fresh.chart) { refreshPatient(''); setFresh(null) }
  }
  const commitNew = () => {
    if (!fresh) return
    const chart = fresh.chart || nextChartNumber(roster)
    savePatient('')
    renamePatientEdits('', chart)
    setFresh({ chart })
    setDuplicate(null)
  }
  const save = () => {
    if (!fresh) { savePatient(open.chart); return }
    if (fresh.chart) { savePatient(fresh.chart); return }
    /* art. 301149 (v2.10): first, middle and last name plus DOB are checked
       against the charts on file before a new chart is saved */
    const d = patientEdits('')
    const same = (a?: string, b?: string) => (a ?? '').trim().toUpperCase() === (b ?? '').trim().toUpperCase()
    const match = roster.find((p) => d.last && same(p.first, d.first) && same(p.middle, d.middle) && same(p.last, d.last) && same(p.dob, d.dob))
    if (match) { setDuplicate(match); return }
    commitNew()
  }
  const undo = () => {
    if (fresh && !fresh.chart) { refreshPatient(''); setFresh(null); return }
    undoPatient(target)
  }
  const refresh = () => {
    if (fresh) { setFresh(null); return }
    refreshPatient(open.chart)
  }

  const body = (
    <div className="pb-screen pb-demographics-screen" style={{ ['--pb-design-w' as string]: `${DESIGN_W}px` }}>
      <PBViewHeader title="Demographics" right={<ChartHeaderIdentity />} />
      <PBCommandRow
        commands={[
          { label: 'New Record', onClick: newRecord }, { label: 'Delete Record', onClick: deleteRecord },
          { label: 'Save', onClick: save },
          { label: 'Undo', onClick: undo }, { label: 'Refresh', onClick: refresh }, { label: 'Search' },
          /* no widths: the row is uniform at the kit's 80.5, and the 94/82
             these carried were a 1.5x reading of a 2x capture (4/3 too wide) */
          { label: 'Previous Chart', onClick: () => { setFresh(null); onStepChart?.(-1) } },
          { label: 'Next Chart', onClick: () => { setFresh(null); onStepChart?.(1) } },
        ]}
      />

      {/* the painter's tab stops, measured off reference/demographics-full.png */}
      <IdentityStrip />

      <PBFixed style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '3px 3px 3px' }}>
        <PBTabs tabs={TABS} active={tab} onChange={setTab} compact face boldSelected={false}>
          {tab === 'Demographics' && <DemographicsPage onLookup={onLookup} />}
          {tab === 'Patient Detail' && <PatientDetailPage />}
          {tab === 'ID Alias' && <IdAliasPage />}
          {tab === 'Connections' && <ConnectionsPage />}
          {tab === 'Services' && <ServicesPage />}
          {tab === 'Associated Parties' && <AssociatedPartiesPage />}
          {tab === 'WCB Claims' && <WcbClaimsPage />}
          {tab === 'Other Claims' && <OtherClaimsPage />}
          {tab === 'Incentives' && <IncentivesPage />}
          {tab === 'Settings' && <SettingsPage />}
          {tab === 'Benefits' && <BenefitsPage />}
        </PBTabs>
      </PBFixed>

      {duplicate && (
        /* the duplicate check's window is described (art. 301171, 301149) but
           never captured, so its title and wording are this emulator's */
        <PBMessageBox
          title="Possible Duplicate Chart"
          icon="warn"
          buttons={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no', default: true }]}
          onClose={(v) => { if (v === 'yes') commitNew(); else setDuplicate(null) }}
        >
          Chart {duplicate.chart} ({duplicate.last}, {duplicate.first}, born {duplicate.dob}) has the same name and birth date.
          <br />Save this chart anyway?
        </PBMessageBox>
      )}
    </div>
  )
  return (
    <CursorContext.Provider value={cursors}>
      {patient ? <PatientOverride patient={patient}>{body}</PatientOverride> : body}
    </CursorContext.Provider>
  )
}

/** The IA / DE rule: art. 301149 (`79c69da3…png`) — a chart whose status is
    IA or DE shows the patient's name in red on Demographics and Patient
    Summary. */
export const nameInRed = (status?: string) => status === 'IA' || status === 'DE'

function IdentityStrip() {
  const patient = usePatient()
  const red = nameInRed(patient.status) ? { color: '#d00000' } : undefined
  return (
    <PBIdentityStrip
      fields={[
        { label: 'CHART:', value: patient.chart, w: 129 },
        { label: 'FIRST:', value: <span style={red}>{patient.first}</span>, w: 145 },
        { label: 'MIDDLE:', value: <span style={red}>{patient.middle}</span>, w: 163 },
        { label: 'LAST:', value: <span style={red}>{patient.last}</span>, w: 173 },
        { label: 'DoB:', value: patient.dob },
      ]}
    />
  )
}

/** A list tab's rows and current row, kept on the chart (see Patient). */
function useListTab<K extends ListKey>(key: K) {
  const patient = usePatient()
  const cursors = useContext(CursorContext)
  const rows = (patient[key] ?? []) as NonNullable<Patient[K]>
  const cur = Math.min(cursors.current[key] ?? 0, Math.max(0, rows.length - 1))
  const target = patient.chart || ''
  const setRows = (next: NonNullable<Patient[K]>) => updatePatient(target, { [key]: next } as Partial<Patient>)
  const change = (patch: object) => setRows(rows.map((r, i) => (i === cur ? { ...r, ...patch } : r)) as NonNullable<Patient[K]>)
  return { rows, cur, setCur: (i: number) => cursors.set(key, i), setRows, change, add: () => { setRows([{}, ...rows] as NonNullable<Patient[K]>); cursors.set(key, 0) } }
}

/* --- Patient Detail ------------------------------------------------------
   Three Ethnicity rows — the patient's, their father's and their mother's,
   which is what tdt_chart's str_race_self / _father / _mother triples are —
   the background block, a Status History grid and Name History form on the
   right, and a paging Historical Contact Information block underneath.

   Note the yellow "Preferred Gender" and "Genotypic Gender" labels: MOIS
   paints a control's label yellow once the value has been changed — see
   `.pb-form__label--flagged`.

   PROVENANCE: the field audit's Patient Detail captures, chart 87297
   (evidence/MATRIX-R0082 … MATRIX-R0121). */
/* --- the list tabs -------------------------------------------------------
   ID Alias, Connections, Services, Associated Parties, WCB Claims and Other
   Claims are all the same window: a band with New / Delete, a strip of
   filter boxes on the band face, a grid, and a detail pane underneath.

   The captions, the column sets and which columns carry a filter box are
   read off the field-audit captures (evidence/MATRIX-R0124 … R0225). Two-line
   captions are explicit <br>s because a Win32 header clips a caption it
   cannot fit and never re-wraps one.

   What the captures could not settle: the heights below. The audit machine
   painted MOIS into a different window size. Splits are now reconciled against
   the live TRAINING session on 2026-09-21 at a 1000px reference frame. */

type ListRow = Record<string, string>

/** The strip of filter boxes MOIS paints between a list band and its grid.
    A child's width is the width of the column it sits over, so each box
    keeps its column as the frame grows. */
function FilterStrip({ children }: { children?: ReactNode }) {
  return (
    <div
      className="pb-row"
      style={{ gap: 0, padding: '2px 3px 3px', background: 'var(--pb-band)', flex: 'none' }}
    >
      {/* the grid's row-arrow gutter, which carries no filter */}
      <span style={{ width: 13, flex: 'none' }} />
      {children}
    </div>
  )
}

/** A run of painted band: a column the strip leaves without a filter box. */
const Gap = ({ w }: { w: number }) => <span style={{ width: w, flex: 'none' }} />
/** The filter box over the column that takes the grid's slack. */
const FlexFilter = () => <PBInput style={{ flex: '1 1 auto', minWidth: 0 }} />

function ListShell({
  band, filters, columns, rows = [], empty, detail, detailHeight, current, onCurrentChange, onNew, onDelete, slug,
}: {
  band: string
  filters?: ReactNode
  columns: PBColumn<ListRow>[]
  rows?: ListRow[]
  empty?: string
  detail?: ReactNode
  detailHeight?: number
  current?: number
  onCurrentChange?: (index: number) => void
  /** the band's own New / Delete: the same row the command row adds */
  onNew?: () => void
  onDelete?: () => void
  /** anchors the band buttons `host.mois.command.new-{slug}` / `delete-{slug}` */
  slug?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
      <PBBand right={<>
        {slug ? <CmdButton command={`new-${slug}`} size="sm" onClick={onNew}>New</CmdButton> : <PBButton size="sm">New</PBButton>}
        {slug ? <CmdButton command={`delete-${slug}`} size="sm" disabled={!rows.length} onClick={onDelete}>Delete</CmdButton> : <PBButton size="sm">Delete</PBButton>}
      </>}>
        {band}
      </PBBand>
      <FilterStrip>{filters}</FilterStrip>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 6px 4px' }}>
        <PBDataWindow columns={columns} rows={rows} current={current} onCurrentChange={onCurrentChange} empty={empty}
          rowTutorialId={slug ? (_r, i) => `host.mois.row.${slug}-${i + 1}` : undefined} />
      </div>
      {detail && (
        <div style={{ flex: 'none', height: detailHeight, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {detail}
        </div>
      )}
    </div>
  )
}

/** A grid cell typed into in place, the way a DataWindow edit column is. */
const cellEdit = (value: string, label: string, onChange: (v: string) => void, align?: 'center') => (
  <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
    style={{ border: 0, background: 'transparent', width: '100%', padding: 0, font: 'inherit', color: 'inherit', textAlign: align }} />
)

/** A tick column cell that edits its row: Show On Demo., Default. */
const tick = (checked: boolean | undefined, onChange: (v: boolean) => void) => <PBCheckbox checked={!!checked} onChange={onChange} />

/* --- ID Alias ------------------------------------------------------------ */
function IdAliasPage() {
  const list = useListTab('aliasIds')
  const row: AliasIdEntry = list.rows[list.cur] ?? {}
  return (
    <ListShell
      band="Alias Identification List"
      slug="alias"
      rows={list.rows.map((r, i) => ({ code: r.code ?? '', desc: r.desc ?? '', value: r.value ?? '', effective: r.effective ?? '', note: r.note ?? '', demo: r.demo ? 'Y' : '', m: '', clip: '-', _i: String(i) }))}
      current={list.cur} onCurrentChange={list.setCur} onNew={list.add}
      onDelete={() => list.setRows(list.rows.filter((_, i) => i !== list.cur))}
      filters={<><Gap w={91} /><PBInput w={190} /><FlexFilter /></>}
      columns={[
        { key: 'code', header: 'Code', width: 91 },
        { key: 'desc', header: 'Description', width: 190 },
        { key: 'value', header: 'Value' },
        { key: 'effective', header: 'Effective', width: 72, align: 'center' },
        { key: 'note', header: 'Note', width: 156 },
        { key: 'demo', header: 'Show On Demo.', width: 82, align: 'center', render: (r) => tick(r.demo === 'Y', (v) => list.setRows(list.rows.map((x, i) => (String(i) === r._i ? { ...x, demo: v } : x)))) },
        { key: 'm', header: 'M', width: 25, align: 'center' },
        { key: 'clip', header: '\u{1F4CE}', width: 17, align: 'center' },
      ]}
      empty="No alias identifiers on file."
      detailHeight={186}
      detail={
        <>
          <PBBand>Alias ID Detail</PBBand>
          <div
            className="pb-form"
            style={{ gridTemplateColumns: '108px 1fr', padding: '5px 8px', alignItems: 'start', flex: '1 1 auto', minHeight: 0 }}
          >
            <span className="pb-form__label">Comment:</span>
            <PBTextArea rows={4} w="100%" style={{ height: '100%' }} value={row.note ?? ''} disabled={!list.rows.length} onChange={(e) => list.change({ note: e.target.value })} />
          </div>
        </>
      }
    />
  )
}

/* --- Connections --------------------------------------------------------- */
function ConnectionsPage() {
  const [sub, setSub] = useState('Connection Detail')
  const records = useChartRecords('connection')
  return (
    <ListShell
      band="Connections"
      rows={records.map(r => ({ role: r.str_connection_type ?? '', resource: r.str_provider_source ?? '', connection: r.str_provider ?? '', start: date(r.dtm_start), end: date(r.dtm_end), demo: r.str_include_demo === 'Y' ? '✓' : '', team: r.str_member_care_team === 'Y' ? '✓' : '' }))}
      filters={
        <>
          <PBInput w={114} /><PBInput w={134} /><FlexFilter />
          <Gap w={18 + 72 + 71} />
          <PBCheckbox label="Hide Ended Connections" />
        </>
      }
      columns={[
        { key: 'role', header: <>Connection<br />Role</>, width: 114 },
        { key: 'resource', header: <>Connection<br />Resource</>, width: 134 },
        { key: 'connection', header: 'Connection' },
        { key: 'd', header: '', dots: true, width: 18 },
        { key: 'start', header: 'Start', width: 72, align: 'center' },
        { key: 'end', header: 'End', width: 71, align: 'center' },
        { key: 'demo', header: <>Show On<br />Demo.</>, width: 60, align: 'center' },
        { key: 'team', header: <>Care Team<br />Member</>, width: 60, align: 'center' },
        { key: 'clip', header: '\u{1F4CE}', width: 18, align: 'center' },
      ]}
      empty="No connections on file."
      detailHeight={292}
      detail={
        <PBTabs
          tabs={['Connection Detail', 'Contact Information', 'Services']}
          active={sub}
          onChange={setSub}
          compact
          face
        >
          {sub === 'Connection Detail' && (
            <div style={{ display: 'flex', gap: 8, padding: '4px 6px', flex: '1 1 auto', minHeight: 0 }}>
              <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span>General Comment</span>
                <PBTextArea style={{ flex: '1 1 auto', width: '100%' }} />
              </div>
              <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span>Stopped Reason</span>
                <PBLookup w="100%" />
                <span style={{ paddingTop: 3 }}>Stopped Note</span>
                <PBTextArea style={{ flex: '1 1 auto', width: '100%' }} />
              </div>
            </div>
          )}
          {/* The capture shows this pane empty — no band and no column
              captions — for a connection with no contact record, so nothing
              is drawn here. The audit lists Start / End / Location / Address
              behind it, all read-only, but never showed them. */}
          {sub === 'Contact Information' && (
            <div className="pb-groupbox" style={{ flex: '1 1 auto', minHeight: 0, margin: '4px 6px' }} />
          )}
          {sub === 'Services' && (
            <>
              <PBBand>Services provided by Members of Current Connection</PBBand>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 6px 4px' }}>
                <PBDataWindow
                  rows={[]}
                  columns={[
                    { key: 'start', header: 'Start', width: 86, align: 'center' },
                    { key: 'stop', header: 'Stop', width: 86, align: 'center' },
                    { key: 'mrp', header: 'Service MRP', width: 230 },
                    { key: 'episode', header: 'Service Episode' },
                  ]}
                  empty=" "
                />
              </div>
            </>
          )}
        </PBTabs>
      }
    />
  )
}

/* --- Services ------------------------------------------------------------ */
function ServicesPage() {
  const [sub, setSub] = useState('Detail')
  const records = useChartRecords('chart_service')
  const [cur, setCur] = useState(0)
  const record = records[cur]
  return (
    <ListShell
      band="Services" current={cur} onCurrentChange={setCur}
      rows={records.map(r => ({ episode: r.str_service_code_term ?? '', mrp: r.str_service_mrp ?? '', start: date(r.dtm_start), stop: date(r.dtm_end), demo: r.str_include_demo === 'Y' ? '✓' : '' }))}
      filters={
        <>
          <FlexFilter />
          <Gap w={20} />
          <PBInput w={212} />
          <Gap w={21 + 73 + 73} />
          <PBCheckbox label="Hide Stopped Services" />
        </>
      }
      columns={[
        { key: 'episode', header: 'Service Episode' },
        { key: 'd1', header: '', dots: true, width: 20 },
        { key: 'mrp', header: 'Service MRP', width: 212 },
        { key: 'd2', header: '', dots: true, width: 21 },
        { key: 'start', header: 'Start', width: 73, align: 'center' },
        { key: 'stop', header: 'Stop', width: 73, align: 'center' },
        { key: 'demo', header: <>Show On<br />Demo.</>, width: 56, align: 'center' },
        { key: 'clip', header: '\u{1F4CE}', width: 20, align: 'center' },
      ]}
      empty="No service episodes on file."
      detailHeight={240}
      detail={
        <PBTabs
          tabs={['Detail', 'Linked Orders (0)', 'Summary']}
          active={sub}
          onChange={setSub}
          compact
          face
        >
          {sub === 'Detail' && (
            <>
              <div style={{ display: 'flex', gap: 12, padding: '5px 8px', flex: '1 1 auto', minHeight: 0 }}>
                <div className="pb-form" style={{ gridTemplateColumns: '104px 1fr', flex: '1 1 auto', minWidth: 0, padding: 0, alignItems: 'start' }}>
                  <span className="pb-form__label">Service Episode:</span><PBLookup w="100%" value={record?.str_service_code_term ?? ''} readOnly />
                  <span className="pb-form__label">Service MRP:</span><PBLookup w="100%" value={record?.str_service_mrp ?? ''} readOnly />
                  <span />
                  <button className="pb-link" style={{ justifySelf: 'start' }}>View Members</button>
                  {/* maintained by the episode, never typed — the capture
                      paints this label and its field grey */}
                  <span className="pb-form__label pb-form__label--dim">As a Member Of:</span>
                  <PBLookup w="100%" disabled />
                  {/* the only label on the block MOIS leaves without a colon */}
                  <span className="pb-form__label">General Note</span>
                  <PBTextArea rows={4} w="100%" />
                </div>
                <div className="pb-form" style={{ gridTemplateColumns: '84px 1fr', flex: '1 1 auto', minWidth: 0, padding: 0, alignItems: 'start' }}>
                  <span className="pb-form__label">Stop Date:</span><PBInput w={104} align="center" value={date(record?.dtm_end)} readOnly />
                  <span className="pb-form__label">Stop Reason:</span><PBLookup w="100%" value={record?.str_stop_code_term ?? ''} readOnly />
                  <span className="pb-form__label">Stop Note:</span><PBTextArea rows={3} w="100%" />
                  <span />
                  <button className="pb-link" style={{ justifySelf: 'end' }}>Show History</button>
                </div>
              </div>
              <div style={{ display: 'flex', padding: '2px 8px 4px', flex: 'none' }}>
                <span style={{ width: '50%' }}>Record Created:</span>
                <span>Last Modified:</span>
              </div>
            </>
          )}
          {sub !== 'Detail' && (
            <div className="pb-dw__empty" style={{ padding: 18 }}>{sub} — no content retrieved.</div>
          )}
        </PBTabs>
      }
    />
  )
}

/* --- Associated Parties --------------------------------------------------
   The Detail pane is the current row, edited in place. Its Type list is the
   v02.31 one — Emergency Contact, Lawyer (e.g. Guardian of Will), Next of
   Kin, Power of Attorney, Substitute Decision Maker (field audit
   evidence/MATRIX-R0186-type, chart 87297); the v02.20 manual shows the
   first and third only (art. 301554 `4eeb5e4f…png`). The grid prints Type as
   Role, and a relationship (MOTHER, SON) is picked from its own "…" list. */
const PARTY_TYPES = ['', 'Emergency Contact', 'Lawyer (e.g. Guardian of Will)', 'Next of Kin', 'Power of Attorney', 'Substitute Decision Maker']
const RELATIONSHIPS = ['BROTHER', 'DAUGHTER', 'FATHER', 'FRIEND', 'GUARDIAN', 'MOTHER', 'OTHER', 'SISTER', 'SON', 'SPOUSE', 'STEP FATHER']

function AssociatedPartiesPage() {
  const list = useListTab('associatedParties')
  const row: AssociatedPartyEntry = list.rows[list.cur] ?? {}
  const off = !list.rows.length
  const set = (patch: Partial<AssociatedPartyEntry>) => list.change(patch)
  const [relLookup, setRelLookup] = useState(false)
  const input = (key: keyof AssociatedPartyEntry, w: number | string, label: string) =>
    <PBInput aria-label={`Associated party ${label}`} w={w} disabled={off} value={String(row[key] ?? '')} onChange={(e) => set({ [key]: e.target.value })} />
  return (
    <ListShell
      band="Associated Party List"
      slug="associated-party"
      rows={list.rows.map((r, i) => ({ name: r.name ?? '', relationship: r.relationship ?? '', role: r.type ?? '', home: r.home ?? '', work: r.work ?? '', ext: r.ext ?? '', demo: r.demo ? 'Y' : '', careplan: r.carePlan ? 'Y' : '', clip: '-', _i: String(i) }))}
      current={list.cur} onCurrentChange={list.setCur} onNew={list.add}
      onDelete={() => list.setRows(list.rows.filter((_, i) => i !== list.cur))}
      filters={<><PBInput w={133} /><PBInput w={116} /><Gap w={19} /><FlexFilter /></>}
      columns={[
        { key: 'name', header: 'Name', width: 133 },
        { key: 'relationship', header: 'Relationship', width: 116 },
        { key: 'd', header: '', dots: true, width: 19 },
        /* the capture's Role column is 133 wide; it takes the grid's slack
           here because it carries the longest values on the list */
        { key: 'role', header: 'Role' },
        { key: 'home', header: 'Home', width: 87 },
        { key: 'work', header: 'Work', width: 87 },
        { key: 'ext', header: 'Ext.', width: 40, align: 'center' },
        { key: 'demo', header: <>Show On<br />Demo.</>, width: 66, align: 'center', render: (r) => tick(r.demo === 'Y', (v) => list.setRows(list.rows.map((x, i) => (String(i) === r._i ? { ...x, demo: v } : x)))) },
        { key: 'careplan', header: <>Show on<br />Care Plan</>, width: 67, align: 'center', render: (r) => tick(r.careplan === 'Y', (v) => list.setRows(list.rows.map((x, i) => (String(i) === r._i ? { ...x, carePlan: v } : x)))) },
        { key: 'clip', header: '\u{1F4CE}', width: 18, align: 'center' },
      ]}
      empty="No associated parties on file."
      detailHeight={280}
      detail={
        <div data-tutorial-id="host.mois.field.associated-party-detail" style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
          <PBBand>Associated Party Detail</PBBand>
          <PBGroup title="Contact Information" fill>
            <div style={{ display: 'flex', gap: 14, flex: '1 1 auto', minHeight: 0 }}>
              <div className="pb-form" style={{ gridTemplateColumns: '92px 1fr', flex: '1 1 auto', minWidth: 0, padding: 0, alignItems: 'start' }}>
                <span className="pb-form__label">Name:</span>{input('name', '100%', 'name')}
                <span className="pb-form__label">Type:</span>
                <span data-tutorial-id="host.mois.field.associated-party-type" style={{ display: 'inline-flex' }}>
                  <PBSelect aria-label="Associated party type" disabled={off} options={[...new Set([...PARTY_TYPES, row.type ?? ''])]} w={172} value={row.type ?? ''} onChange={(e) => set({ type: e.target.value })} />
                </span>
                <span className="pb-form__label">Relationship:</span>
                <PBLookup w="100%" name="associated-party-relationship" disabled={off} value={row.relationship ?? ''} onChange={(v) => set({ relationship: v })} onDots={() => setRelLookup(true)} />
                <span className="pb-form__label">General Notes:</span>
                <PBTextArea rows={6} w="100%" disabled={off} value={row.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
              </div>
              <div className="pb-form" style={{ gridTemplateColumns: '80px 1fr', flex: '1 1 auto', minWidth: 0, padding: 0 }}>
                <span className="pb-form__label">Address:</span>{input('address', '100%', 'address')}
                <span />{input('address2', '100%', 'address 2')}
                <span className="pb-form__label">City:</span>
                <div className="pb-row">{input('city', 128, 'city')}<span className="pb-row__spacer" /><span>Province:</span>{input('province', 104, 'province')}</div>
                <span className="pb-form__label">Postal Code:</span>
                <div className="pb-row">{input('postal', 96, 'postal code')}<span className="pb-row__spacer" /><span>Country:</span>{input('country', 104, 'country')}</div>
                {/* MOIS underlines whichever number the party prefers */}
                <PhoneLabel label="Home:" preferred={row.preferredPhone} />
                <div className="pb-row">
                  {input('home', 96, 'home')}<span className="pb-row__spacer" /><PBCheckbox label="Leave Message" disabled={off} checked={!!row.homeMessage} onChange={(v) => set({ homeMessage: v })} />
                </div>
                <PhoneLabel label="Work:" preferred={row.preferredPhone} />
                <div className="pb-row">
                  {input('work', 96, 'work')}<span>Ext.:</span>{input('ext', 56, 'ext')}
                  <span className="pb-row__spacer" /><PBCheckbox label="Leave Message" disabled={off} checked={!!row.workMessage} onChange={(v) => set({ workMessage: v })} />
                </div>
                <PhoneLabel label="Cell:" preferred={row.preferredPhone} />
                {/* the audit and the screen both call it "Page", not Pager */}
                <div className="pb-row">{input('cell', 96, 'cell')}<span className="pb-row__spacer" /><span>Page:</span>{input('pager', 104, 'page')}</div>
                <span className="pb-form__label">Pref'd Phone:</span>
                <span data-tutorial-id="host.mois.field.associated-party-preferred-phone" style={{ display: 'inline-flex' }}>
                  <PBSelect aria-label="Associated party preferred phone" disabled={off} options={preferredPhones} w={96} value={row.preferredPhone ?? ''} onChange={(e) => set({ preferredPhone: e.target.value })} />
                </span>
                <span className="pb-form__label">eMail (Home):</span>{input('emailHome', '100%', 'email home')}
                <span className="pb-form__label">eMail (Work):</span>{input('emailWork', '100%', 'email work')}
              </div>
            </div>
          </PBGroup>
          {relLookup && <DemographicLookupDialog title="Relationship" value={row.relationship ?? ''}
            rows={RELATIONSHIPS.map((term) => ({ term, category: 'RELATIONSHIP', code: '', system: 'MOIS' }))}
            onPick={(r) => { set({ relationship: r.term }); setRelLookup(false) }} onClose={() => setRelLookup(false)} />}
        </div>
      }
    />
  )
}

/* --- WCB Claims ------------------------------------------------------------
   The v02.31 grid (field audit evidence/MATRIX-R0209-diagnosis, chart 87297)
   captions the code column Diagnosis; the v02.20 manual (art. 301555
   `1a4ec3cf…png`) and art. 301149 call it ICD9. Position is a plain drop-down
   (L / R in the captures); Area of Injury, Nature of Injury and Diagnosis
   carry an ellipsis. The Detail pane is the current claim. */
function WcbClaimsPage() {
  const list = useListTab('wcbClaims')
  const row: WcbClaimEntry = list.rows[list.cur] ?? {}
  const off = !list.rows.length
  const set = (patch: Partial<WcbClaimEntry>) => list.change(patch)
  const edit = (i: string, patch: Partial<WcbClaimEntry>) => list.setRows(list.rows.map((x, n) => (String(n) === i ? { ...x, ...patch } : x)))
  const input = (key: keyof WcbClaimEntry, w: number | string, label: string, align?: 'center') =>
    <PBInput aria-label={`WCB ${label}`} w={w} align={align} disabled={off} value={String(row[key] ?? '')} onChange={(e) => set({ [key]: e.target.value })} />
  return (
    <ListShell
      band="WCB Claim List"
      slug="wcb-claim"
      rows={list.rows.map((r, i) => ({ doi: r.doi ?? '', claim: r.claim ?? '', area: r.area ?? '', position: r.position ?? '', nature: r.nature ?? '', diagnosis: r.icd9 ?? '', employer: r.employer ?? r.company ?? '', default: r.isDefault ? 'Y' : '', clip: '-', _i: String(i) }))}
      current={list.cur} onCurrentChange={list.setCur} onNew={list.add}
      onDelete={() => list.setRows(list.rows.filter((_, i) => i !== list.cur))}
      filters={
        <>
          <Gap w={83} /><PBInput w={95} /><PBInput w={89} />
          <Gap w={15} /><PBInput w={51} /><PBInput w={94} />
          <Gap w={15} /><PBInput w={66} />
        </>
      }
      columns={[
        { key: 'doi', header: 'DOI', width: 83, align: 'center', render: (r) => cellEdit(r.doi, 'WCB date of injury', (v) => edit(r._i, { doi: v }), 'center') },
        { key: 'claim', header: 'Claim No.', width: 95, render: (r) => cellEdit(r.claim, 'WCB claim number', (v) => edit(r._i, { claim: v })) },
        { key: 'area', header: 'Area of Injury', width: 89, render: (r) => cellEdit(r.area, 'WCB area of injury', (v) => edit(r._i, { area: v })) },
        { key: 'd1', header: '', dots: true, width: 15 },
        { key: 'position', header: 'Position', width: 51, render: (r) => (
          <PBSelect aria-label="WCB position" options={['', 'L', 'R']} w="100%" value={r.position} onChange={(e) => edit(r._i, { position: e.target.value })} />
        ) },
        { key: 'nature', header: 'Nature of Injury', width: 94, render: (r) => cellEdit(r.nature, 'WCB nature of injury', (v) => edit(r._i, { nature: v })) },
        { key: 'd2', header: '', dots: true, width: 15 },
        { key: 'diagnosis', header: 'Diagnosis', width: 66, render: (r) => cellEdit(r.diagnosis, 'WCB diagnosis', (v) => edit(r._i, { icd9: v })) },
        { key: 'd3', header: '', dots: true, width: 15 },
        { key: 'employer', header: 'Employer', render: (r) => cellEdit(r.employer, 'WCB employer', (v) => edit(r._i, { employer: v })) },
        { key: 'default', header: 'Default', width: 47, align: 'center', render: (r) => (
          <PBCheckbox tutorialId={`host.mois.field.wcb-default-${Number(r._i) + 1}`} checked={r.default === 'Y'}
            onChange={(v) => list.setRows(list.rows.map((x, i) => (String(i) === r._i ? { ...x, isDefault: v } : x)))} />
        ) },
        { key: 'clip', header: '\u{1F4CE}', width: 19, align: 'center' },
      ]}
      empty="No WCB claims on file."
      detailHeight={160}
      detail={
        <div data-tutorial-id="host.mois.field.wcb-claim-detail" style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
          <PBBand>WCB Claim Detail</PBBand>
          <div style={{ display: 'flex', gap: 14, padding: '5px 8px', flex: '1 1 auto', minHeight: 0 }}>
            <div className="pb-form" style={{ gridTemplateColumns: '76px 1fr', flex: '1 1 auto', minWidth: 0, padding: 0 }}>
              <span className="pb-form__label">Company:</span>{input('company', '100%', 'company')}
              <span className="pb-form__label">Address:</span>{input('address', '100%', 'address')}
              <span className="pb-form__label">City:</span>
              <div className="pb-row">{input('city', 128, 'city')}<span className="pb-row__spacer" /><span>Postal Code:</span>{input('postal', 116, 'postal code')}</div>
              <span className="pb-form__label">Province:</span>
              <div className="pb-row">{input('province', 128, 'province')}<span className="pb-row__spacer" /><span>Country:</span>{input('country', 116, 'country')}</div>
              <span className="pb-form__label">Phone:</span>{input('phone', 128, 'phone', 'center')}
            </div>
            <div className="pb-form" style={{ gridTemplateColumns: '44px 1fr', flex: '1 1 auto', minWidth: 0, padding: 0, alignItems: 'start' }}>
              <span className="pb-form__label">Note:</span>
              <PBTextArea rows={5} w="100%" disabled={off} style={{ fontFamily: 'var(--pb-font-mono)' }} value={row.note ?? ''} onChange={(e) => set({ note: e.target.value })} />
            </div>
          </div>
        </div>
      }
    />
  )
}

/* --- Other Claims -------------------------------------------------------- */
function OtherClaimsPage() {
  return (
    <ListShell
      band="Other Claim List"
      /* the strip is painted, but this list carries no filter boxes */
      columns={[
        { key: 'issued', header: 'Date Issued', width: 90, align: 'center' },
        { key: 'claim', header: 'Claim Number', width: 112 },
        { key: 'desc', header: 'Description' },
      ]}
      empty="No other claims on file."
    />
  )
}

/* --- Settings: contact information and the two preference grids ----------
   The contact block is a group box, not a band: four label columns, with the
   Leave Message ticks between the phone numbers and the two eMail fields. */
/* Clinic Contact Preferences are the clinic's, not the chart's: the rows art.
   303800 (`c29f4d83…png`) shows under the read-only band. Only the Reason
   column is legible in that capture. */
const CLINIC_CONTACT_PREFERENCES = [{ reason: 'OTHER' }, { reason: 'RECALL' }, { reason: 'SCHEDULER' }]

function SettingsPage() {
  const patient = usePatient()
  const prefs = patient.contactPreferences ?? []
  const [cur, setCur] = useState(0)
  const [picking, setPicking] = useState<number | null>(null)
  const setPrefs = (next: typeof prefs) => updatePatient(patient.chart, { contactPreferences: next })
  const edit = (i: number, patch: Partial<typeof prefs[number]>) => setPrefs(prefs.map((p, n) => (n === i ? { ...p, ...patch } : p)))
  const prefCols = (editable: boolean): PBColumn<ListRow>[] => [
    { key: 'reason', header: 'Reason', width: 138, align: 'center', render: editable ? (r, i) => cellEdit(r.reason, 'Contact preference reason', (v) => edit(i, { reason: v }), 'center') : undefined },
    { key: 'order', header: 'Order', width: 61, align: 'center', render: editable ? (r, i) => cellEdit(r.order, 'Contact preference order', (v) => edit(i, { order: v }), 'center') : undefined },
    { key: 'method', header: 'Method', width: 137, align: 'center', render: editable ? (r, i) => cellEdit(r.method, 'Contact preference method', (v) => edit(i, { method: v }), 'center') : undefined },
    { key: 'source', header: 'Source', width: 138, align: 'center', render: editable ? (r, i) => cellEdit(r.source, 'Contact preference source', (v) => edit(i, { source: v }), 'center') : undefined },
    { key: 'contact', header: 'Contact' },
    { key: 'd', header: '', width: 21, align: 'center', render: editable ? (_r, i) => (
      <CmdButton command={`contact-lookup-${i + 1}`} className="pb-dw__dots" style={{ border: 0, padding: 0, minWidth: 0, background: 'none' }} onClick={() => setPicking(i)}>…</CmdButton>
    ) : () => <span className="pb-dw__dots">…</span> },
  ]
  return (
    <>
      <PBGroup title="Patient Contact Information">
        <div style={{ display: 'flex', gap: 18, padding: '4px 0' }}>
          <div className="pb-form" style={{ gridTemplateColumns: '88px 1fr', width: 390, flex: 'none', padding: 0 }}>
            <PhoneLabel label="Home:" preferred={patient.preferredPhone} />
            <div className="pb-row"><PBInput w={88} value={patient.home ?? ''} readOnly /><span className="pb-row__spacer" /><PBCheckbox label="Leave Message" checked={patient.homeMessage ?? false} /></div>
            <PhoneLabel label="Work:" preferred={patient.preferredPhone} />
            <div className="pb-row"><PBInput w={88} value={patient.work ?? ''} readOnly /><span>Ext.:</span><PBInput w={56} value={patient.workExt ?? ''} readOnly /><span className="pb-row__spacer" /><PBCheckbox label="Leave Message" checked={patient.workMessage ?? false} /></div>
            <PhoneLabel label="Cell:" preferred={patient.preferredPhone} />
            <div className="pb-row"><PBInput w={88} value={patient.cell ?? ''} readOnly /><span className="pb-row__spacer" /><span>Pager:</span><PBInput w={96} value={patient.pager ?? ''} readOnly /></div>
            <span className="pb-form__label">Preferred Phone:</span>
            <div className="pb-row"><PBSelect options={preferredPhones} w={88} value={patient.preferredPhone ?? ''} onChange={() => {}} /><span className="pb-row__spacer" /><span>Fax:</span><PBInput w={96} value={patient.fax ?? ''} readOnly /></div>
          </div>
          <div className="pb-form" style={{ gridTemplateColumns: '70px 1fr', flex: 1, minWidth: 0, padding: 0, alignContent: 'start' }}>
            <span className="pb-form__label">eMail (Home):</span><PBInput value={patient.emailHome ?? ''} readOnly />
            <span className="pb-form__label">eMail (Work):</span><PBInput value={patient.emailWork ?? ''} readOnly />
          </div>
        </div>
      </PBGroup>

      <PBBand right={<>
        <CmdButton command="new-contact-preference" size="sm" onClick={() => { setPrefs([...prefs, {}]); setCur(prefs.length) }}>New</CmdButton>
        <CmdButton command="delete-contact-preference" size="sm" disabled={!prefs.length} onClick={() => { setPrefs(prefs.filter((_, i) => i !== cur)); setCur(0) }}>Delete</CmdButton>
      </>}>
        Patient Contact Preferences
      </PBBand>
      <div style={{ height: 200, flex: 'none', display: 'flex', padding: '0 6px 4px' }}>
        <PBDataWindow columns={prefCols(true)} current={Math.min(cur, Math.max(0, prefs.length - 1))} onCurrentChange={setCur}
          rowTutorialId={(_r, i) => `host.mois.row.contact-preference-${i + 1}`}
          rows={prefs.map((p) => ({ reason: p.reason ?? '', order: p.order ?? '', method: p.method ?? '', source: p.source ?? '', contact: p.contact ?? '' }))} />
      </div>

      <PBBand>Clinic Contact Preferences (READ-ONLY)</PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 6px 4px' }}>
        <PBDataWindow columns={prefCols(false)} rows={CLINIC_CONTACT_PREFERENCES.map((r) => ({ order: '', method: '', source: '', contact: '', ...r }))} />
      </div>
      {picking !== null && (
        <SelectSecondaryContactDialog
          parties={patient.associatedParties ?? []}
          onPick={(name) => { edit(picking, { contact: name }); setPicking(null) }}
          onClose={() => setPicking(null)}
        />
      )}
    </>
  )
}

/* Select Secondary Contact — art. 303800 `c29f4d83…png`: a Secondary
   Contacts band over Type / Name / Relationship, one row per associated
   party, then Ok / Cancel. */
function SelectSecondaryContactDialog({ parties, onPick, onClose }: {
  parties: AssociatedPartyEntry[]
  onPick: (name: string) => void
  onClose: () => void
}) {
  const [cur, setCur] = useState(0)
  const rows = parties.filter((p) => p.name).map((p) => ({ type: p.type ?? '', name: p.name ?? '', relationship: p.relationship ?? '' }))
  return (
    <DemographicModal title="Select Secondary Contact" width={600} height={380} onClose={onClose} dialog="select-secondary-contact">
      <div style={{ padding: 10, flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <PBBand>Secondary Contacts</PBBand>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBDataWindow gutter={false} rows={rows} current={cur} onCurrentChange={setCur} onActivate={(r) => onPick(r.name)}
            columns={[{ key: 'type', header: 'Type', width: 140 }, { key: 'name', header: 'Name', width: 250 }, { key: 'relationship', header: 'Relationship' }]}
            empty="No associated parties on file." />
        </div>
      </div>
      <DialogButtons>
        <CmdButton command="secondary-contact-ok" wide disabled={!rows[cur]} onClick={() => rows[cur] && onPick(rows[cur].name)}>Ok</CmdButton>
        <CmdButton command="secondary-contact-cancel" wide onClick={onClose}>Cancel</CmdButton>
      </DialogButtons>
    </DemographicModal>
  )
}

/* --- Benefits ------------------------------------------------------------
   A grouped list under a pale-blue strip: Expand All / Collapse All and the
   View selector on the left, New / Edit / Delete on the right. The grid's
   group level is the benefit source, which is why "Benefit Source" sits
   above "Benefit Service" in the header rather than in a column of its own.

   The strip's fill is sampled off the capture; `--pb-band` is the grey the
   list tabs use and would be wrong here. The View list is transcribed from
   the one value the capture shows selected — what else it drops is unknown. */
function BenefitsPage() {
  const patient = usePatient()
  const benefits = patient.benefits ?? []
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [cur, setCur] = useState(0)
  const [win, setWin] = useState<null | { mode: 'select' } | { mode: 'new'; entry: BenefitEntry } | { mode: 'edit'; index: number }>(null)
  const sources = [...new Set(benefits.map((b) => b.source))]
  /* grouped by source, as the grid bands them */
  const ordered = benefits.map((b, i) => ({ b, i })).sort((x, y) => sources.indexOf(x.b.source) - sources.indexOf(y.b.source))
  const rows = ordered.map(({ b, i }) => ({
    group: b.source, benefit: `   ${b.service}`, start: b.start ?? '', stop: b.stop ?? '',
    deductible: b.deductible ?? '', coverage: b.coverage ?? b.description ?? '', demo: b.demo ? 'X' : '', careplan: b.carePlan ? 'X' : '', _i: String(i),
  }))
  const current = rows[Math.min(cur, rows.length - 1)]
  return (
    <>
      <div className="pb-row" style={{ gap: 12, padding: '3px 6px', background: '#cde6f7', flex: 'none' }}>
        <button className="pb-link" onClick={() => setCollapsed(new Set())}>Expand All</button>
        <button className="pb-link" onClick={() => setCollapsed(new Set(sources))}>Collapse All</button>
        <span style={{ paddingLeft: 12 }}>View:</span>
        <PBSelect options={['Active Records']} w={150} />
        <span className="pb-row__spacer" />
        <CmdButton command="new-benefit" size="sm" onClick={() => setWin({ mode: 'select' })}>New</CmdButton>
        <CmdButton command="edit-benefit" size="sm" disabled={!current} onClick={() => current && setWin({ mode: 'edit', index: Number(current._i) })}>Edit</CmdButton>
        <PBButton size="sm">Delete</PBButton>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 6px 4px' }}>
        <PBDataWindow
          rows={rows as ListRow[]}
          current={Math.min(cur, Math.max(0, rows.length - 1))}
          onCurrentChange={setCur}
          onActivate={(r) => setWin({ mode: 'edit', index: Number(r._i) })}
          rowTutorialId={(r) => `host.mois.row.benefit-${(benefits[Number(r._i)]?.service ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
          groupBy={(r) => r.group}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          columns={[
            {
              key: 'benefit',
              header: <><b>Benefit Source</b><br />&nbsp;&nbsp;&nbsp;Benefit Service</>,
              headAlign: 'left',
            },
            { key: 'start', header: <><br />Start Date</>, width: 83, headAlign: 'left' },
            { key: 'stop', header: <><br />Stop Date</>, width: 88, headAlign: 'left' },
            { key: 'deductible', header: <><br />Deductible</>, width: 77, headAlign: 'left' },
            { key: 'coverage', header: <><br />Coverage</>, width: 190, headAlign: 'left' },
            { key: 'demo', header: <>Show on<br />Demo</>, width: 60, align: 'center' },
            { key: 'careplan', header: <>Tagged to<br />Care Plan</>, width: 67, align: 'center' },
          ]}
          empty="No benefits on file."
        />
      </div>
      {win?.mode === 'select' && (
        <SelectBenefitSourceDialog
          onContinue={(pick) => setWin({ mode: 'new', entry: { source: pick.source, service: pick.service, description: pick.description } })}
          onClose={() => setWin(null)}
        />
      )}
      {win?.mode === 'new' && <BenefitSourceServiceWindow mode="new" entry={win.entry} onClose={() => setWin(null)} />}
      {win?.mode === 'edit' && benefits[win.index] && (
        <BenefitSourceServiceWindow mode="edit" entry={benefits[win.index]} index={win.index} onClose={() => setWin(null)} />
      )}
    </>
  )
}

function IncentivesPage() {
  const [cur, setCur] = useState(0)
  return (
    <>
      <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
        Incentive Claim List
      </PBBand>

      <div className="pb-row" style={{ padding: '3px 6px', gap: 6 }}>
        <PBInput w={96} /><PBInput w={400} />
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 6px' }}>
        <PBDataWindow columns={incentiveCols} rows={[]} current={cur} onCurrentChange={setCur} />
      </div>

      <div style={{ padding: '4px 6px', flex: 'none' }}>
        NOTE: Freq represents the allowable BILLING FREQUENCY for the claim.
        &nbsp; This value is used for reporting purposes.
      </div>

      {/* split footer: free-text detail on the left, MSP history on the right */}
      <div style={{ display: 'flex', gap: 6, padding: '0 6px 4px', height: 226, flex: 'none' }}>
        <div className="pb-groupbox" style={{ width: 268, display: 'flex', flexDirection: 'column' }}>
          <PBBand>Claim Detail</PBBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, padding: 4, display: 'flex' }}>
            <PBTextArea style={{ flex: '1 1 auto', height: '100%' }} />
          </div>
        </div>
        <div className="pb-groupbox" style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <PBBand>MSP Claim History</PBBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <PBDataWindow
              flush
              gutter={false}
              rows={[]}
              columns={[
                { key: 'service', header: 'Service', width: 72, align: 'center' },
                { key: 'provider', header: 'Provider', width: 160 },
                { key: 'diag', header: 'Diag Code', width: 76, align: 'center' },
                { key: 'net', header: 'Net Paid', width: 74, align: 'right' },
                { key: 'billed', header: 'Billed Date', width: 84, align: 'center' },
                { key: 'r1', header: 'R1', width: 32, align: 'center' },
                { key: 'r2', header: 'R2', width: 32, align: 'center' },
              ]}
              empty="No MSP claims submitted."
            />
          </div>
        </div>
      </div>

      <div style={{ padding: '2px 6px 4px', borderTop: '1px solid #d6d6d6', flex: 'none' }}>
        Created:
      </div>
    </>
  )
}

/* --- Demographics --------------------------------------------------------
   The chart's own window: identification, contact and notes down the left,
   office / insurance / pharmacy and the coded Selected Items down the right,
   over the create + last-modified audit line.

   PROVENANCE: reference/demographics-full.png, reconciled against the live
   Windows App TRAINING session on 2026-09-21. The old widths used a 1.5x
   divisor for a 2x capture: they were 4/3 too large. Widths now use the same
   scale as the 1000px outer frame; typography retains the native 11px size.

   Two details worth keeping: `Gender:` is painted yellow because MOIS
   flags a label whose value has been changed, and the whole Pharmacy block
   is disabled — it is maintained through the `Change...` link, not typed.

   UNRESOLVED: the two real instances disagree about the Pharmacy block. The
   TRAINING capture this window was built from paints Pharmacy / Address /
   Phone / Fax, and the field audit's DEV captures paint Pharmacy / Comment
   with the address, phone and fax only reachable through `Change...`. Both
   run v02.31.23 b250508. The audit sheet lists Pharmacy, Pharmacy Desc,
   Phone and Fax, which is the TRAINING shape, so that is what is kept. */

/** Left column, right column, and the gap the painter left between them. */
const COL_L = 391
const COL_R = 387

/** Width of the value column inside a group: 88px of label, then 283. */
const FIELD_COL = 283
/** …and the same for the narrower right-hand column (86px of label). */
const FIELD_COL_R = 284

function DemographicsPage({ onLookup }: { onLookup?: () => void }) {
  const patient = usePatient()
  const [genderOpen, setGenderOpen] = useState(false)
  const [dialog, setDialog] = useState<'photo' | 'msp' | 'wizard' | 'archive' | 'status' | 'pharmacy' | null>(null)
  const [cityOpen, setCityOpen] = useState(false)
  const [copied, setCopied] = useState<Partial<Patient> | null>(null)
  const change = (patch: Partial<Patient>) => updatePatient(patient.chart, patch)
  /* The open chart is the only source for this window. A host hands its own
     charts in — Webforms projects them out of the same `PatientScenario` a
     form binds against — so what shows here is what a form bound to this chart
     would read. Nothing stands in when a chart is missing a block: MOIS shows
     empty fields there, and a fallback would print one patient's pharmacy or
     audit line on another's record. */
  const pharmacy = patient.pharmacy ?? {}
  const items = selectedItemsOf(patient)
  const red = nameInRed(patient.status) ? { color: '#d00000' } : undefined
  const designated = !!(patient.genderDesignations?.preferred || patient.genderDesignations?.genotypic)
  return (
    <div className="pb-demog">
      <div className="pb-demog__cols">
        <div className="pb-demog__col" style={{ width: COL_L }}>
          <PBGroup title="Patient Identification">
            <div className="pb-form pb-demog__form">
              <span className="pb-form__label">Chart No.:</span>
              <Row>
                {/* art. 301172 / 301149: the "…" (or F4) opens the list of patient charts */}
                <PBLookup w={110} name="demographic-chart" value={patient.chart} readOnly onDots={onLookup} />
                <span className="pb-row__spacer" />
                <CmdButton command="patient-photo" style={{ width: 92 }} onClick={() => setDialog('photo')}>Patient Photo</CmdButton>
              </Row>

              <span className="pb-form__label">Name (F/M/L):</span>
              <Row>
                <PBInput aria-label="Demographics first" w={92} style={red} value={patient.first} data-mois-audit-id="MATRIX-R0009-first-name" onChange={e => change({ first: e.target.value })} />
                <PBInput aria-label="Demographics middle" w={86} style={red} value={patient.middle} data-mois-audit-id="MATRIX-R0010-middle-name" onChange={e => change({ middle: e.target.value })} />
                <PBInput aria-label="Demographics last" w={95} style={red} value={patient.last} data-mois-audit-id="MATRIX-R0011-last-name" onChange={e => change({ last: e.target.value })} />
              </Row>

              <span className="pb-form__label">Alias (F/L):</span>
              <Row>
                <PBInput aria-label="Demographics alias" w={92} value={patient.alias ?? ''} onChange={e => change({ alias: e.target.value })} />
                <span className="pb-row__spacer" />
                <PBInput aria-label="Last alias" w={95} value={patient.aliasLast ?? ''} onChange={e => change({ aliasLast: e.target.value })} />
              </Row>

              <span className="pb-form__label">Birth Date:</span>
              <Row>
                <PBInput aria-label="Demographics dob" w={92} align="center" value={patient.dob} data-mois-audit-id="MATRIX-R0014-birth-date" onChange={e => change({ dob: e.target.value })} />
                {patient.age && <span aria-label="Age">({patient.age.replace(' YR OLD', '').replace(' MTH OLD', ' mth')})</span>}
                <span className="pb-row__spacer" />
                {/* MOIS paints a label yellow once its value has been changed */}
                <span className={designated ? 'pb-flag' : undefined}>Gender:</span>
                <PBSelect options={genders} w={71} value={patient.gender} onChange={e => change({ gender: e.target.value as Patient['gender'] })} />
                {/* opens Advanced Gender Designations, where the preferred and
                    genotypic designations are maintained. It reads "..." until
                    a designation is saved and ".*." after (art. 332748:
                    `1f91bde8…png` before, `c41bf639…png` after; the v02.31
                    capture draws the asterisk between dots) */}
                <PBButton
                  style={{ width: 19, padding: 0 }}
                  title="Advanced Gender Designations"
                  data-tutorial-id="host.mois.command.gender-designations"
                  onClick={() => setGenderOpen(true)}
                >
                  {designated ? '.*.' : '...'}
                </PBButton>
              </Row>

              <span className="pb-form__label">Current Status:</span>
              <Row>
                <PBInput aria-label="Demographics status" w={56} align="center" value={patient.status} readOnly data-tutorial-id="host.mois.field.current-status" />
                <span style={{ paddingLeft: 18 }}>Date:</span>
                <PBInput aria-label="Demographics registered" w={85} align="center" value={patient.registered ?? ''} readOnly />
                <span className="pb-row__spacer" />
                <CmdButton command="update-status" style={{ width: 92 }} onClick={() => setDialog('status')}>Update Status</CmdButton>
              </Row>

              <span className="pb-form__label">BC Health No.:</span>
              <Row><PBInput aria-label="Demographics bchn" w={92} value={patient.bchn ?? ''} onChange={e => change({ bchn: e.target.value })} /></Row>
            </div>
          </PBGroup>

          <PBGroup title="Contact Information">
            <div className="pb-form pb-demog__form">
              <span className="pb-form__label">Address:</span>
              <Row><PBInput aria-label="Demographics address" w={281} value={patient.address ?? ''} onChange={e => change({ address: e.target.value })} /></Row>
              <span className="pb-form__label">Address:</span>
              <Row><PBInput aria-label="Demographics address2" w={281} value={patient.address2 ?? ''} onChange={e => change({ address2: e.target.value })} /></Row>

              <span className="pb-form__label">City:</span>
              <Row>
                <PBLookup w={123} name="demographic-city" value={patient.city ?? ''} onChange={city => change({ city })} onDots={() => setCityOpen(true)} />
                <span className="pb-row__spacer" />
                <span>Province:</span>
                <PBInput aria-label="Demographics province" w={94} value={patient.province ?? ''} onChange={e => change({ province: e.target.value })} />
              </Row>

              <span className="pb-form__label">Postal Code:</span>
              <Row>
                <PBInput aria-label="Demographics postal" w={86} value={patient.postal ?? ''} data-mois-audit-id="MATRIX-R0037-postal-code" onChange={e => change({ postal: e.target.value })} />
                <span className="pb-row__spacer" />
                <span>Country:</span>
                <PBSelect options={[...new Set([...countries, patient.country ?? ''])]} w={94} value={patient.country ?? ''} onChange={e => change({ country: e.target.value as Patient['country'] })} />
              </Row>

              {/* the preferred phone is the one MOIS underlines */}
              {/* MOIS underlines whichever contact method the chart prefers */}
              <PhoneLabel label="Home:" preferred={patient.preferredPhone} />
              <Row>
                <PBInput aria-label="Demographics home" w={86} align="center" value={patient.home ?? ''} data-mois-audit-id="MATRIX-R0039-home-phone" onChange={e => change({ home: e.target.value })} />
                <span className="pb-row__spacer" />
                <PBCheckbox label="Leave Message" checked={patient.homeMessage ?? false} onChange={e => change({ homeMessage: e })} />
              </Row>

              <PhoneLabel label="Work:" preferred={patient.preferredPhone} />
              <Row>
                <PBInput aria-label="Demographics work" w={83} value={patient.work ?? ''} data-mois-audit-id="MATRIX-R0041-work-phone" onChange={e => change({ work: e.target.value })} />
                <span style={{ paddingLeft: 9 }}>Ext.:</span>
                <PBInput aria-label="Demographics workExt" w={60} value={patient.workExt ?? ''} onChange={e => change({ workExt: e.target.value })} />
                <span className="pb-row__spacer" />
                <PBCheckbox label="Leave Message" checked={patient.workMessage ?? false} onChange={e => change({ workMessage: e })} />
              </Row>

              <PhoneLabel label="Cell:" preferred={patient.preferredPhone} />
              <Row>
                <PBInput aria-label="Demographics cell" w={83} value={patient.cell ?? ''} data-mois-audit-id="MATRIX-R0044-cell-phone" onChange={e => change({ cell: e.target.value })} />
                <span className="pb-row__spacer" />
                <span>Pager:</span>
                <PBInput aria-label="Demographics pager" w={94} value={patient.pager ?? ''} onChange={e => change({ pager: e.target.value })} />
              </Row>

              <span className="pb-form__label">Preferred Phone:</span>
              <Row>
                <PBSelect
                  options={preferredPhones}
                  w={86}
                  value={patient.preferredPhone ?? ''}
                  onChange={e => change({ preferredPhone: e.target.value as Patient['preferredPhone'] })}
                />
                <span className="pb-row__spacer" />
                <span>Fax:</span>
                <PBInput aria-label="Demographics fax" w={94} value={patient.fax ?? ''} onChange={e => change({ fax: e.target.value })} />
              </Row>

              <span className="pb-form__label">eMail (Home):</span>
              <Row><PBInput aria-label="Demographics emailHome" w={281} value={patient.emailHome ?? ''} onChange={e => change({ emailHome: e.target.value })} /></Row>
              <span className="pb-form__label">eMail (Work):</span>
              <Row><PBInput aria-label="Demographics emailWork" w={281} value={patient.emailWork ?? ''} onChange={e => change({ emailWork: e.target.value })} /></Row>
            </div>

            <div className="pb-row" style={{ gap: 6, padding: '4px 0 1px' }}>
              {/* art. 301149: Copy Addr. carries Address, City, Province,
                  Country, the Home number and Preferred Phone */}
              <CmdButton command="copy-addr" style={{ width: 81 }} onClick={() => setCopied({ address: patient.address, address2: patient.address2, city: patient.city, province: patient.province, postal: patient.postal, country: patient.country, home: patient.home, preferredPhone: patient.preferredPhone })}>Copy Addr.</CmdButton>
              <CmdButton command="paste-addr" style={{ width: 70 }} disabled={!copied} onClick={() => copied && change(copied)}>Paste Addr.</CmdButton>
              <CmdButton command="change-addr-wizard" style={{ width: 115 }} onClick={() => setDialog('wizard')}>Change Addr. Wizard</CmdButton>
              <span className="pb-row__spacer" />
              <CmdButton command="archive-addr" style={{ width: 94 }} onClick={() => setDialog('archive')}>Archive Addr.</CmdButton>
            </div>
          </PBGroup>

          <PBGroup title="General Information" fill>
            <div className="pb-form pb-demog__form" style={{ paddingBottom: 3 }}>
              <span className="pb-form__label">Short Note:</span>
              <Row><PBInput aria-label="Demographics note" w={281} value={patient.note ?? ''} onChange={e => change({ note: e.target.value })} /></Row>
            </div>
            <div className="pb-demog__notes">
              <span className="pb-form__label">General Notes:</span>
              {/* tdt_chart.str_note, the column Patient Detail also shows */}
              <PBTextArea
                style={{ width: 281, height: '100%', fontFamily: 'var(--pb-font-mono)' }}
                aria-label="Demographics general notes" value={patient.generalNotes ?? ''}
                onChange={e => change({ generalNotes: e.target.value })}
              />
            </div>
          </PBGroup>
        </div>

        <div className="pb-demog__col" style={{ width: COL_R }}>
          <PBGroup title="Office Information">
            {/* Last Contact and Invoice Balance are captioned above their
                fields, so each takes two rows of the right-hand stack */}
            <div className="pb-form pb-demog__form pb-demog__form--right">
              <span className="pb-form__label">Facility:</span>
              <RowR>
                <PBSelect options={[...new Set([...chartFacilities, patient.facility ?? ''])]} w={188} value={patient.facility ?? ''} onChange={e => change({ facility: e.target.value as Patient['facility'] })} />
                <span className="pb-row__spacer" />
                <span className="pb-demog__stacked">Last Contact</span>
              </RowR>

              <span className="pb-form__label">Location:</span>
              <RowR>
                <PBSelect options={[...new Set([...chartLocations, patient.officeLocation ?? ''])]} w={188} value={patient.officeLocation ?? ''} onChange={e => change({ officeLocation: e.target.value as Patient['officeLocation'] })} />
                <span className="pb-row__spacer" />
                <PBInput aria-label="Demographics lastContact" w={85} align="center" value={patient.lastContact ?? ''} readOnly />
              </RowR>

              <span className="pb-form__label">Service:</span>
              <RowR>
                <PBDropDownDataWindow w={188} listW={420} tutorialId="host.mois.field.demographic-service" value={patient.service ?? ''} display="code"
                  rows={demographicServiceCenters} onSelect={r => change({ service: r.code })}
                  columns={[{ key: 'code', header: 'Service Center', width: 135, render: r => <span style={{ color: r.inactive ? 'red' : undefined }}>{r.code}</span> },
                    { key: 'description', header: 'Description', render: r => <span style={{ color: r.inactive ? 'red' : undefined }}>{r.description}</span> }]} />
                <span className="pb-row__spacer" />
                <span className="pb-demog__stacked">Invoice Balance</span>
              </RowR>

              <span className="pb-form__label">Service Provider:</span>
              <RowR>
                <PBSelect options={[...new Set([...serviceProviders, patient.provider ?? ''])]} w={188} value={patient.provider ?? ''} onChange={e => change({ provider: e.target.value as Patient['provider'] })} />
                <span className="pb-row__spacer" />
                {/* a balance MOIS has nothing to print reads as a dash */}
                <PBInput aria-label="Demographics invoiceBalance" w={85} align="right" value={patient.invoiceBalance ?? '-'} readOnly />
              </RowR>

              <span className="pb-form__label">Chart Loc.:</span>
              <RowR><PBInput aria-label="Demographics location" w={188} value={patient.location ?? ''} onChange={e => change({ location: e.target.value })} /></RowR>
            </div>
          </PBGroup>

          <PBGroup title="Insurance Information">
            <div className="pb-form pb-demog__form pb-demog__form--right">
              <span className="pb-form__label">Insurance by:</span>
              <RowR>
                <PBSelect options={[...new Set([...insuranceCarriers, patient.insuranceBy ?? ''])]} w={67} value={patient.insuranceBy ?? ''} onChange={e => change({ insuranceBy: e.target.value as Patient['insuranceBy'] })} />
              </RowR>

              <span className="pb-form__label">Insurance No.:</span>
              <RowR>
                <PBInput aria-label="Demographics insurance" w={110} value={patient.insurance ?? ''} onChange={e => change({ insurance: e.target.value })} data-tutorial-id="host.mois.field.insurance-no" />
                <CmdButton command="msp-check" style={{ width: 43 }} onClick={() => setDialog('msp')}>Check</CmdButton>
                <span style={{ paddingLeft: 8 }}>Dep. No.:</span>
                <PBInput aria-label="Demographics dep" w={46} value={patient.dep ?? ''} onChange={e => change({ dep: e.target.value })} data-tutorial-id="host.mois.field.dep-no" />
              </RowR>

              <span className="pb-form__label">Benefit Source:</span>
              <RowR><PBInput aria-label="Demographics benefitSource" w={110} value={patient.benefitSource ?? ''} onChange={e => change({ benefitSource: e.target.value })} /></RowR>
            </div>
          </PBGroup>

          {/* maintained through Change…, never typed — so the whole block is
              disabled, which is why its labels read grey in the capture */}
          <PBGroup title="Pharmacy Information">
            <div className="pb-form pb-demog__form pb-demog__form--right">
              <span className="pb-form__label pb-form__label--dim">Pharmacy:</span>
              <RowR>
                <PBInput aria-label="Pharmacy name" title={pharmacy.name} w={227} value={pharmacy.name ?? ''} disabled readOnly />
                <span className="pb-row__spacer" />
                <button className="pb-link" onClick={() => setDialog('pharmacy')}>Change...</button>
              </RowR>

              <span className="pb-form__label pb-form__label--dim">Address:</span>
              <RowR><PBInput aria-label="Pharmacy address" w={284} value={pharmacy.address ?? ''} disabled readOnly /></RowR>

              <span className="pb-form__label pb-form__label--dim">Phone:</span>
              <RowR>
                <PBInput aria-label="Pharmacy phone" w={124} align="center" value={pharmacy.phone ?? ''} disabled readOnly />
                <span style={{ paddingLeft: 8 }}>Fax:</span>
                <PBInput aria-label="Pharmacy fax" w={130} align="center" value={pharmacy.fax ?? ''} disabled readOnly />
              </RowR>
            </div>
          </PBGroup>

          <PBGroup title="Selected Items" fill bodyStyle={{ display: 'flex', minHeight: 0 }}>
            <PBDataWindow
              flush
              head={false}
              gutter={false}
              zebra={false}
              rules={false}
              rows={items}
              columns={[
                { key: 'code', header: '', width: 159 },
                { key: 'value', header: '', render: (r) => <PBInput w="100%" value={r.value} readOnly /> },
              ]}
              empty=" "
            />
          </PBGroup>
        </div>
      </div>

      <div className="pb-demog__audit">
        <span className="pb-demog__auditcell" style={{ width: COL_L }}>
          <span className="pb-demog__auditkey">Created:</span>{patient.created ?? ''}
        </span>
        <span className="pb-demog__auditcell">
          <span className="pb-demog__auditkey">Last Modified:</span>{patient.modified ?? ''}
        </span>
      </div>

      {dialog === 'photo' && <PatientPhotoDialog onClose={() => setDialog(null)} />}
      {dialog === 'msp' && <MspEligibilityDialog onClose={() => setDialog(null)} />}
      {dialog === 'wizard' && <AddressWizardDialog onClose={() => setDialog(null)} />}
      {dialog === 'archive' && <AddressExpiryDialog onClose={() => setDialog(null)} />}
      {dialog === 'status' && <DemographicStatusDialog onClose={() => setDialog(null)} />}
      {dialog === 'pharmacy' && <DemographicPharmacyDialog onClose={() => setDialog(null)} />}
      {cityOpen && <DemographicLookupDialog title="City" value={patient.city ?? ''} city
        rows={[...geographicTerms, ...(patient.city && !geographicTerms.some(r => r.term === patient.city) ? [{ term: patient.city, category: 'CITY', code: '', system: `PP-${patient.province ?? 'BC'}` }] : [])]}
        onPick={r => { change({ city: r.term, province: r.system.replace('PP-', '') }); setCityOpen(false) }} onClose={() => setCityOpen(false)} />}
      {genderOpen && <AdvancedGenderDialog onClose={() => setGenderOpen(false)} />}
    </div>
  )
}

/** A value cell in the left column: fixed width so the right-hand control in
    the row lands on the tab stop the painter put it on. */
const Row = ({ children }: { children: ReactNode }) => (
  <div className="pb-row" style={{ width: FIELD_COL }}>{children}</div>
)
const RowR = ({ children }: { children: ReactNode }) => (
  <div className="pb-row" style={{ width: FIELD_COL_R }}>{children}</div>
)

/** A phone label, underlined when the chart prefers that number. */
function PhoneLabel({ label, preferred }: { label: string; preferred?: string }) {
  const linked = !!preferred && label.toLowerCase().startsWith(preferred.trim().toLowerCase())
  return <span className={linked ? 'pb-form__label pb-form__label--linked' : 'pb-form__label'}>{label}</span>
}

/* Change Patient Status — art. 301173 `411705ba…png` (v02.20.18): a New
   Status Information band, a Status Information group with Status Code (a
   drop-down) and Effective Date (today), then Ok / Cancel. The codes are art.
   301149's six: A, CD, DE, IA, MV, TR. Ok writes a Status History row, and
   the Date beside Current Status follows the new effective date ("Updates
   automatically every time the patient's status is updated", art. 301149). */
const STATUS_CODES = [
  { code: 'A', name: 'Active Patient' },
  { code: 'CD', name: 'Changed Doctors' },
  { code: 'DE', name: 'Deceased Patient' },
  { code: 'IA', name: 'Inactive Patient' },
  { code: 'MV', name: 'Moved Away' },
  { code: 'TR', name: 'Transient Patient' },
]

function DemographicStatusDialog({ onClose }: { onClose: () => void }) {
  const patient = usePatient()
  const [status, setStatus] = useState('')
  const [effective, setEffective] = useState(today)
  const codes = [...new Set(['', ...STATUS_CODES.map((c) => c.code)])]
  return <DemographicModal title="Change Patient Status" width={360} onClose={onClose} dialog="change-patient-status">
    <div style={{ padding: 10 }}>
      <div className="pb-groupbox">
        <PBBand>New Status Information</PBBand>
        <div style={{ padding: '8px 22px 12px' }}>
          <PBGroup title="Status Information">
            <div className="pb-form" style={{ padding: '4px 6px', gridTemplateColumns: '100px 1fr', alignItems: 'center' }}>
              <span className="pb-form__label">Status Code:</span>
              <span data-tutorial-id="host.mois.field.status-code" style={{ display: 'inline-flex' }}>
                <PBSelect aria-label="Status Code" options={codes} w={120} value={status}
                  title={STATUS_CODES.map((c) => `${c.code} ${c.name}`).join(', ')}
                  onChange={e => setStatus(e.target.value)} />
              </span>
              <span className="pb-form__label">Effective Date:</span>
              <PBInput aria-label="Effective Date" w={120} align="center" value={effective} onChange={e => setEffective(e.target.value)} />
            </div>
          </PBGroup>
        </div>
      </div>
    </div>
    <DialogButtons>
      <CmdButton command="status-ok" wide disabled={!status} onClick={() => {
        updatePatient(patient.chart, { status, registered: effective,
          statusHistory: [{ code: status, effective, note: '' }, ...(patient.statusHistory ?? [])] }); onClose()
      }}>Ok</CmdButton>
      <CmdButton command="status-cancel" wide onClick={onClose}>Cancel</CmdButton>
    </DialogButtons>
  </DemographicModal>
}

/** Selected Items: the chart's own coded flags, then everything another tab
    has ticked "Show On Demo." / "Include on Demographics" — an associated
    party as EMERGENCY CONTACT / NEXT OF KIN with name and number (art.
    301173 `411705ba…png`), an alias as its description and value, a
    benefit as its source and service, a gender designation. The captions
    for the designations are not in any capture and are inferred. */
function selectedItemsOf(p: Patient): { code: string; value: string }[] {
  const party = (p.associatedParties ?? []).filter((a) => a.demo && a.name)
    .map((a) => ({ code: (a.type || 'ASSOCIATED PARTY').toUpperCase(), value: `${a.name}  ${a.home || a.cell || a.work || ''}`.trim() }))
  const alias = (p.aliasIds ?? []).filter((a) => a.demo && a.value).map((a) => ({ code: (a.desc || a.code || '').toUpperCase(), value: a.value ?? '' }))
  const benefit = (p.benefits ?? []).filter((b) => b.demo).map((b) => ({ code: b.source, value: b.service }))
  const g = p.genderDesignations
  const gender = [
    ...(g?.preferred && g.onDemographics?.includes('preferred') ? [{ code: 'PREFERRED GENDER', value: g.preferred }] : []),
    ...(g?.genotypic && g.onDemographics?.includes('genotypic') ? [{ code: 'GENOTYPIC GENDER', value: g.genotypic }] : []),
  ]
  return [...(p.selectedItems ?? []), ...party, ...alias, ...benefit, ...gender].sort((x, y) => x.code.localeCompare(y.code))
}

function DemographicPharmacyDialog({ onClose }: { onClose: () => void }) {
  const patient = usePatient()
  const connections = useChartRecords('connection').filter(r => r.str_connection_type === 'PHARMACY' && r.str_provider)
  const [cur, setCur] = useState(0)
  return <DemographicModal title="Select Pharmacy" width={700} height={400} onClose={onClose} dialog="select-pharmacy">
    <PBBand>Pharmacy Connections</PBBand>
    <PBDataWindow columns={[{ key: 'str_provider', header: 'Pharmacy' }, { key: 'dtm_end', header: 'End Date', width: 90 }]}
      rows={connections} current={cur} onCurrentChange={setCur} empty="No pharmacy connections in this chart export." />
    <DialogButtons><PBButton disabled={!connections[cur]} onClick={() => { updatePatient(patient.chart, { pharmacy: { name: connections[cur].str_provider } }); onClose() }}>Select</PBButton>
      <PBButton onClick={() => { updatePatient(patient.chart, { pharmacy: {} }); onClose() }}>Clear Pharmacy</PBButton><PBButton onClick={onClose}>Cancel</PBButton></DialogButtons>
  </DemographicModal>
}
