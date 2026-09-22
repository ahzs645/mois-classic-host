import { useState, type ReactNode } from 'react'
import { useChartRecords } from '../data/chart-records'
import { date } from '../data/charts/relations'
import {
  chartFacilities, chartLocations,
  countries,
  genders, incentiveRows, insuranceCarriers,
  preferredPhones, serviceProviders
} from '../data/mois'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import type { Patient } from '../data/patients'
import {
  PBBand, PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBFixed, PBGroup,
  PBIdentityStrip,
  PBInput, PBLookup, PBSelect, PBTabs, PBTextArea, PBViewHeader, type PBColumn,
} from '../pb'
import { AdvancedGenderDialog } from './AdvancedGenderDialog'
import { BenefitEditor } from './BenefitEditor'
import { PatientDetailPage } from './PatientDetailPage'
import { savePatient, undoPatient, refreshPatient, updatePatient } from '../data/patient-edits'
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

export function DemographicsView() {
  const patient = usePatient()
  const [tab, setTab] = useState('Demographics')
  const [editBenefit, setEditBenefit] = useState(false)

  return (
    <div className="pb-screen pb-demographics-screen" style={{ ['--pb-design-w' as string]: `${DESIGN_W}px` }}>
      <PBViewHeader title="Demographics" right={<ChartHeaderIdentity />} />
      <PBCommandRow
        commands={[
          { label: 'New Record' }, { label: 'Delete Record' }, { label: 'Save', active: true, onClick: () => savePatient(patient.chart) },
          { label: 'Undo', onClick: () => undoPatient(patient.chart) }, { label: 'Refresh', onClick: () => refreshPatient(patient.chart) }, { label: 'Search' },
          /* no widths: the row is uniform at the kit's 80.5, and the 94/82
             these carried were a 1.5x reading of a 2x capture (4/3 too wide) */
          { label: 'Previous Chart' }, { label: 'Next Chart' },
        ]}
      />

      {/* the painter's tab stops, measured off reference/demographics-full.png */}
      <PBIdentityStrip
        fields={[
          { label: 'CHART:', value: patient.chart, w: 129 },
          { label: 'FIRST:', value: patient.first, w: 145 },
          { label: 'MIDDLE:', value: patient.middle, w: 163 },
          { label: 'LAST:', value: patient.last, w: 173 },
          { label: 'DoB:', value: patient.dob },
        ]}
      />

      <PBFixed style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '3px 3px 3px' }}>
        <PBTabs tabs={TABS} active={tab} onChange={setTab} compact face boldSelected={false}>
          {tab === 'Demographics' && <DemographicsPage />}
          {tab === 'Patient Detail' && <PatientDetailPage />}
          {tab === 'ID Alias' && <IdAliasPage />}
          {tab === 'Connections' && <ConnectionsPage />}
          {tab === 'Services' && <ServicesPage />}
          {tab === 'Associated Parties' && <AssociatedPartiesPage />}
          {tab === 'WCB Claims' && <WcbClaimsPage />}
          {tab === 'Other Claims' && <OtherClaimsPage />}
          {tab === 'Incentives' && <IncentivesPage />}
          {tab === 'Settings' && <SettingsPage />}
          {tab === 'Benefits' && <BenefitsPage onEdit={() => setEditBenefit(true)} />}
        </PBTabs>
      </PBFixed>

      {editBenefit && <BenefitEditor onClose={() => setEditBenefit(false)} />}
    </div>
  )
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
  band, filters, columns, rows = [], empty, detail, detailHeight, current, onCurrentChange,
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
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
      <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
        {band}
      </PBBand>
      <FilterStrip>{filters}</FilterStrip>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 6px 4px' }}>
        <PBDataWindow columns={columns} rows={rows} current={current} onCurrentChange={onCurrentChange} empty={empty} />
      </div>
      {detail && (
        <div style={{ flex: 'none', height: detailHeight, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {detail}
        </div>
      )}
    </div>
  )
}

/* --- ID Alias ------------------------------------------------------------ */
function IdAliasPage() {
  return (
    <ListShell
      band="Alias Identification List"
      filters={<><Gap w={91} /><PBInput w={190} /><FlexFilter /></>}
      columns={[
        { key: 'code', header: 'Code', width: 91 },
        { key: 'desc', header: 'Description', width: 190 },
        { key: 'value', header: 'Value' },
        { key: 'effective', header: 'Effective', width: 72, align: 'center' },
        { key: 'note', header: 'Note', width: 156 },
        { key: 'demo', header: 'Show On Demo.', width: 82, align: 'center' },
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
            <PBTextArea rows={4} w="100%" style={{ height: '100%' }} />
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

/* --- Associated Parties -------------------------------------------------- */
function AssociatedPartiesPage() {
  return (
    <ListShell
      band="Associated Party List"
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
        { key: 'demo', header: <>Show On<br />Demo.</>, width: 66, align: 'center' },
        { key: 'careplan', header: <>Show on<br />Care Plan</>, width: 67, align: 'center' },
        { key: 'clip', header: '\u{1F4CE}', width: 18, align: 'center' },
      ]}
      empty="No associated parties on file."
      detailHeight={280}
      detail={
        <>
          <PBBand>Associated Party Detail</PBBand>
          <PBGroup title="Contact Information" fill>
            <div style={{ display: 'flex', gap: 14, flex: '1 1 auto', minHeight: 0 }}>
              <div className="pb-form" style={{ gridTemplateColumns: '92px 1fr', flex: '1 1 auto', minWidth: 0, padding: 0, alignItems: 'start' }}>
                <span className="pb-form__label">Name:</span><PBInput w="100%" />
                <span className="pb-form__label">Type:</span>
                <PBSelect options={['', 'STEP FATHER', 'BROTHER', 'FATHER', 'OTHER']} w={172} />
                <span className="pb-form__label">Relationship:</span><PBLookup w="100%" />
                <span className="pb-form__label">General Notes:</span>
                <PBTextArea rows={6} w="100%" />
              </div>
              <div className="pb-form" style={{ gridTemplateColumns: '80px 1fr', flex: '1 1 auto', minWidth: 0, padding: 0 }}>
                <span className="pb-form__label">Address:</span><PBInput w="100%" />
                <span /><PBInput w="100%" />
                <span className="pb-form__label">City:</span>
                <div className="pb-row"><PBInput w={128} /><span className="pb-row__spacer" /><span>Province:</span><PBInput w={104} /></div>
                <span className="pb-form__label">Postal Code:</span>
                <div className="pb-row"><PBInput w={96} /><span className="pb-row__spacer" /><span>Country:</span><PBInput w={104} /></div>
                {/* MOIS underlines whichever number the party prefers */}
                <span className="pb-form__label pb-form__label--linked">Home:</span>
                <div className="pb-row">
                  <PBInput w={96} /><span className="pb-row__spacer" /><PBCheckbox label="Leave Message" />
                </div>
                <span className="pb-form__label">Work:</span>
                <div className="pb-row">
                  <PBInput w={96} /><span>Ext.:</span><PBInput w={56} />
                  <span className="pb-row__spacer" /><PBCheckbox label="Leave Message" />
                </div>
                <span className="pb-form__label">Cell:</span>
                {/* the audit and the screen both call it "Page", not Pager */}
                <div className="pb-row"><PBInput w={96} /><span className="pb-row__spacer" /><span>Page:</span><PBInput w={104} /></div>
                <span className="pb-form__label">Pref'd Phone:</span>
                <PBSelect options={preferredPhones} w={96} />
                <span className="pb-form__label">eMail (Home):</span><PBInput w="100%" />
                <span className="pb-form__label">eMail (Work):</span><PBInput w="100%" />
              </div>
            </div>
          </PBGroup>
        </>
      }
    />
  )
}

/* --- WCB Claims ---------------------------------------------------------- */
function WcbClaimsPage() {
  return (
    <ListShell
      band="WCB Claim List"
      filters={
        <>
          <Gap w={83} /><PBInput w={95} /><PBInput w={89} />
          <Gap w={15} /><PBInput w={51} /><PBInput w={94} />
          <Gap w={15} /><PBInput w={66} />
        </>
      }
      columns={[
        { key: 'doi', header: 'DOI', width: 83, align: 'center' },
        { key: 'claim', header: 'Claim No.', width: 95 },
        { key: 'area', header: 'Area of Injury', width: 89 },
        { key: 'd1', header: '', dots: true, width: 15 },
        { key: 'position', header: 'Position', width: 51 },
        { key: 'nature', header: 'Nature of Injury', width: 94 },
        { key: 'd2', header: '', dots: true, width: 15 },
        { key: 'diagnosis', header: 'Diagnosis', width: 66 },
        { key: 'd3', header: '', dots: true, width: 15 },
        { key: 'employer', header: 'Employer' },
        { key: 'default', header: 'Default', width: 47, align: 'center' },
        { key: 'clip', header: '\u{1F4CE}', width: 19, align: 'center' },
      ]}
      empty="No WCB claims on file."
      detailHeight={160}
      detail={
        <>
          <PBBand>WCB Claim Detail</PBBand>
          <div style={{ display: 'flex', gap: 14, padding: '5px 8px', flex: '1 1 auto', minHeight: 0 }}>
            <div className="pb-form" style={{ gridTemplateColumns: '76px 1fr', flex: '1 1 auto', minWidth: 0, padding: 0 }}>
              <span className="pb-form__label">Company:</span><PBInput w="100%" />
              <span className="pb-form__label">Address:</span><PBInput w="100%" />
              <span className="pb-form__label">City:</span>
              <div className="pb-row"><PBInput w={128} /><span className="pb-row__spacer" /><span>Postal Code:</span><PBInput w={116} /></div>
              <span className="pb-form__label">Province:</span>
              <div className="pb-row"><PBInput w={128} /><span className="pb-row__spacer" /><span>Country:</span><PBInput w={116} /></div>
              <span className="pb-form__label">Phone:</span><PBInput w={128} align="center" />
            </div>
            <div className="pb-form" style={{ gridTemplateColumns: '44px 1fr', flex: '1 1 auto', minWidth: 0, padding: 0, alignItems: 'start' }}>
              <span className="pb-form__label">Note:</span>
              <PBTextArea rows={5} w="100%" style={{ fontFamily: 'var(--pb-font-mono)' }} />
            </div>
          </div>
        </>
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
function SettingsPage() {
  const patient = usePatient()
  const prefCols: PBColumn<ListRow>[] = [
    { key: 'reason', header: 'Reason', width: 138, align: 'center' },
    { key: 'order', header: 'Order', width: 61, align: 'center' },
    { key: 'method', header: 'Method', width: 137, align: 'center' },
    { key: 'source', header: 'Source', width: 138, align: 'center' },
    { key: 'contact', header: 'Contact' },
    { key: 'd', header: '', dots: true, width: 21 },
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

      <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
        Patient Contact Preferences
      </PBBand>
      <div style={{ height: 200, flex: 'none', display: 'flex', padding: '0 6px 4px' }}>
        <PBDataWindow columns={prefCols} rows={[]} />
      </div>

      <PBBand>Clinic Contact Preferences (READ-ONLY)</PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 6px 4px' }}>
        <PBDataWindow columns={prefCols} rows={[]} />
      </div>
    </>
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
function BenefitsPage({ onEdit }: { onEdit: () => void }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const sources: string[] = []
  return (
    <>
      <div className="pb-row" style={{ gap: 12, padding: '3px 6px', background: '#cde6f7', flex: 'none' }}>
        <button className="pb-link" onClick={() => setCollapsed(new Set())}>Expand All</button>
        <button className="pb-link" onClick={() => setCollapsed(new Set(sources))}>Collapse All</button>
        <span style={{ paddingLeft: 12 }}>View:</span>
        <PBSelect options={['Active Records']} w={150} />
        <span className="pb-row__spacer" />
        <PBButton size="sm" onClick={onEdit}>New</PBButton>
        <PBButton size="sm" onClick={onEdit}>Edit</PBButton>
        <PBButton size="sm">Delete</PBButton>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 6px 4px' }}>
        <PBDataWindow
          rows={[] as ListRow[]}
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

function DemographicsPage() {
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
  const items = patient.selectedItems ?? []
  return (
    <div className="pb-demog">
      <div className="pb-demog__cols">
        <div className="pb-demog__col" style={{ width: COL_L }}>
          <PBGroup title="Patient Identification">
            <div className="pb-form pb-demog__form">
              <span className="pb-form__label">Chart No.:</span>
              <Row>
                <PBLookup w={110} value={patient.chart} readOnly />
                <span className="pb-row__spacer" />
                <PBButton style={{ width: 92 }} onClick={() => setDialog('photo')}>Patient Photo</PBButton>
              </Row>

              <span className="pb-form__label">Name (F/M/L):</span>
              <Row>
                <PBInput aria-label="Demographics first" w={92} value={patient.first} data-mois-audit-id="MATRIX-R0009-first-name" onChange={e => change({ first: e.target.value })} />
                <PBInput aria-label="Demographics middle" w={86} value={patient.middle} data-mois-audit-id="MATRIX-R0010-middle-name" onChange={e => change({ middle: e.target.value })} />
                <PBInput aria-label="Demographics last" w={95} value={patient.last} data-mois-audit-id="MATRIX-R0011-last-name" onChange={e => change({ last: e.target.value })} />
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
                <span className={patient.genderDesignations?.preferred || patient.genderDesignations?.genotypic ? 'pb-flag' : undefined}>Gender:</span>
                <PBSelect options={genders} w={71} value={patient.gender} onChange={e => change({ gender: e.target.value as Patient['gender'] })} />
                {/* the `.*.` opens Advanced Gender Designations, where the
                    preferred and genotypic designations are maintained */}
                <PBButton
                  style={{ width: 19, padding: 0 }}
                  title="Advanced Gender Designations"
                  data-tutorial-id="host.mois.command.gender-designations"
                  onClick={() => setGenderOpen(true)}
                >
                  .*.
                </PBButton>
              </Row>

              <span className="pb-form__label">Current Status:</span>
              <Row>
                <PBInput aria-label="Demographics status" w={56} align="center" value={patient.status} readOnly />
                <span style={{ paddingLeft: 18 }}>Date:</span>
                <PBInput aria-label="Demographics registered" w={85} align="center" value={patient.registered ?? ''} readOnly />
                <span className="pb-row__spacer" />
                <PBButton style={{ width: 92 }} onClick={() => setDialog('status')}>Update Status</PBButton>
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
              <PBButton style={{ width: 81 }} onClick={() => setCopied({ address: patient.address, address2: patient.address2, city: patient.city, province: patient.province, postal: patient.postal, country: patient.country })}>Copy Addr.</PBButton>
              <PBButton style={{ width: 70 }} disabled={!copied} onClick={() => copied && change(copied)}>Paste Addr.</PBButton>
              <PBButton style={{ width: 115 }} onClick={() => setDialog('wizard')}>Change Addr. Wizard</PBButton>
              <span className="pb-row__spacer" />
              <PBButton style={{ width: 94 }} onClick={() => setDialog('archive')}>Archive Addr.</PBButton>
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
                <PBInput aria-label="Demographics insurance" w={110} value={patient.insurance ?? ''} onChange={e => change({ insurance: e.target.value })} />
                <PBButton style={{ width: 43 }} onClick={() => setDialog('msp')}>Check</PBButton>
                <span style={{ paddingLeft: 8 }}>Dep. No.:</span>
                <PBInput aria-label="Demographics dep" w={46} value={patient.dep ?? ''} onChange={e => change({ dep: e.target.value })} />
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

function DemographicStatusDialog({ onClose }: { onClose: () => void }) {
  const patient = usePatient()
  const [status, setStatus] = useState(patient.status)
  const [effective, setEffective] = useState(today)
  const [note, setNote] = useState('')
  return <DemographicModal title="Update Status" width={400} onClose={onClose}>
    <div className="pb-form" style={{ padding: 20, gridTemplateColumns: '100px 1fr' }}>
      <span>Status:</span><PBSelect aria-label="New patient status" options={[...new Set(['A', 'LU', patient.status])]} value={status} onChange={e => setStatus(e.target.value as Patient['status'])} />
      <span>Effective:</span><PBInput aria-label="Status effective date" value={effective} onChange={e => setEffective(e.target.value)} />
      <span>Note:</span><PBTextArea aria-label="Status note" value={note} onChange={e => setNote(e.target.value)} />
    </div>
    <DialogButtons><PBButton onClick={() => { updatePatient(patient.chart, { status, registered: effective,
      statusHistory: [{ code: status, effective, note }, ...(patient.statusHistory ?? [])] }); onClose() }}>Ok</PBButton><PBButton onClick={onClose}>Cancel</PBButton></DialogButtons>
  </DemographicModal>
}

function DemographicPharmacyDialog({ onClose }: { onClose: () => void }) {
  const patient = usePatient()
  const connections = useChartRecords('connection').filter(r => r.str_connection_type === 'PHARMACY' && r.str_provider)
  const [cur, setCur] = useState(0)
  return <DemographicModal title="Select Pharmacy" width={700} height={400} onClose={onClose}>
    <PBBand>Pharmacy Connections</PBBand>
    <PBDataWindow columns={[{ key: 'str_provider', header: 'Pharmacy' }, { key: 'dtm_end', header: 'End Date', width: 90 }]}
      rows={connections} current={cur} onCurrentChange={setCur} empty="No pharmacy connections in this chart export." />
    <DialogButtons><PBButton disabled={!connections[cur]} onClick={() => { updatePatient(patient.chart, { pharmacy: { name: connections[cur].str_provider } }); onClose() }}>Select</PBButton>
      <PBButton onClick={() => { updatePatient(patient.chart, { pharmacy: {} }); onClose() }}>Clear Pharmacy</PBButton><PBButton onClick={onClose}>Cancel</PBButton></DialogButtons>
  </DemographicModal>
}
