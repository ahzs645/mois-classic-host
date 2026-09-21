import { Fragment, useState, type ReactNode } from 'react'
import {
  PBIdentityStrip, PBBand, PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBFixed, PBGroup,
  PBInput, PBLookup, PBSelect, PBTabs, PBTextArea, PBViewHeader, type PBColumn,
} from '../pb'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import {
  benefitRows, chartFacilities, chartLocations, chartServices, clinicContactRows, countries,
  genders, genotypicGenderRows, incentiveRows, insuranceCarriers, mspClaimRows,
  patientContactRows, preferredGenderRows, preferredPhones, serviceProviders,
} from '../data/mois'
import type { ChartAddressEntry } from '../data/patients'
import { AdvancedGenderDialog } from './AdvancedGenderDialog'
import { BenefitEditor } from './BenefitEditor'

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
          { label: 'New Record' }, { label: 'Delete Record' }, { label: 'Save', active: true },
          { label: 'Undo' }, { label: 'Refresh' }, { label: 'Search' },
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
function PatientDetailPage() {
  const patient = usePatient()
  const race = patient.ethnicity ?? {}
  const rows: [string, typeof race.self][] = [
    ['self', race.self], ['father', race.father], ['mother', race.mother],
  ]
  const history = patient.addressHistory ?? []
  /* MOIS pages this block one record at a time through a scrollbar down the
     right edge of the pane. That control is not reproduced, so the window
     shows the first record and says so. */
  const addr: ChartAddressEntry = history[0] ?? {}
  const name = patient.nameHistory?.[0] ?? {}
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto' }}>
      <div style={{ display: 'flex', gap: 0, flex: '0 0 68%', minHeight: 0 }}>
        {/* background information */}
        <div className="pb-groupbox" style={{ flex: '1 1 auto', minWidth: 0 }}>
          <PBBand>Background Information</PBBand>
          <div className="pb-form" style={{ gridTemplateColumns: '108px 1fr', padding: '5px 8px' }}>
            {rows.map(([who, e]) => (
              <Fragment key={who}>
                <span className="pb-form__label">Ethnicity:</span>
                <div className="pb-row">
                  {/* who reported it — the capture's small "Self" box */}
                  <PBInput w={54} value={e?.type ?? ''} readOnly />
                  {/* the race itself is maintained through the "…", never typed */}
                  <PBLookup w={160} value={e?.race ?? ''} readOnly />
                  <PBCheckbox label="Self ID'd" checked={e?.selfIdd ?? false} />
                </div>
              </Fragment>
            ))}

            <span className="pb-form__label pb-form__label--flagged">Preferred Gender:</span>
            <div className="pb-row">
              <PBSelect
                options={['', ...preferredGenderRows.map((g) => g.gender)]}
                w={62}
                value={patient.genderDesignations?.preferred ?? ''}
                onChange={() => {}}
              />
              <span className="pb-flag" style={{ marginLeft: 8 }}>Genotypic Gender:</span>
              <PBSelect
                options={['', ...genotypicGenderRows.map((g) => g.gender)]}
                w={62}
                value={patient.genderDesignations?.genotypic ?? ''}
                onChange={() => {}}
              />
            </div>

            <span className="pb-form__label">Country Origin:</span>
            <PBLookup w={230} value={patient.countryOrigin ?? ''} readOnly />
            <span className="pb-form__label">First Language:</span>
            <PBLookup w={230} value={patient.firstLanguage ?? ''} readOnly />
            <span className="pb-form__label">Religion:</span>
            <PBInput w={230} value={patient.religion ?? ''} readOnly />
            <span className="pb-form__label">First Nation Status:</span>
            <PBSelect
              options={['', 'Status Indian', 'Non-Status', 'Not Applicable']}
              w={200}
              value={patient.firstNationStatus ?? ''}
              onChange={() => {}}
            />

            <span className="pb-form__label">Patient Adopted:</span>
            <div className="pb-row">
              <PBCheckbox label="Yes" checked={patient.adopted ?? false} />
              <span style={{ marginLeft: 18 }}>Multi-Gestation:</span>
              <PBCheckbox label="Yes" checked={patient.multiGestation ?? false} />
            </div>

            <span className="pb-form__label">Relationship:</span>
            <PBSelect
              options={['', 'Married', 'Single', 'Common Law', 'Widowed']}
              w={166}
              value={patient.relationshipStatus ?? ''}
              onChange={() => {}}
            />
            <span className="pb-form__label">Education Level:</span>
            <PBSelect
              options={['', 'POST SECONDARY CERTIFICATE', 'SECONDARY', 'NONE']}
              w={230}
              value={patient.educationLevel ?? ''}
              onChange={() => {}}
            />
            <span className="pb-form__label">Socioeconomic:</span>
            <PBLookup w={230} value={patient.socioeconomic ?? ''} readOnly />
            <span className="pb-form__label">Living Arrangements:</span>
            <PBLookup w={230} value={patient.livingArrangements ?? ''} readOnly />

            <span className="pb-form__label" style={{ alignSelf: 'start', paddingTop: 2 }}>General Notes:</span>
            {/* tdt_chart.str_note — the same column the Demographics tab's
                General Notes box shows, so the two never disagree */}
            <PBTextArea
              rows={4}
              w="100%"
              style={{ fontFamily: 'var(--pb-font-mono)' }}
              value={patient.generalNotes ?? ''}
              readOnly
            />
          </div>
        </div>

        {/* status and name history */}
        <div style={{ width: '50%', flex: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="pb-groupbox" style={{ flex: '0 0 36%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <PBBand>Status History</PBBand>
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
              <PBDataWindow
                flush
                gutter={false}
                rows={patient.statusHistory ?? []}
                columns={[
                  { key: 'code', header: 'Status Code', width: 84, align: 'center' },
                  { key: 'effective', header: 'Effective', width: 74, align: 'center' },
                  { key: 'note', header: 'Note' },
                ]}
                empty=" "
              />
            </div>
          </div>

          <div className="pb-groupbox" style={{ flex: '1 1 auto' }}>
            <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
              Name History
            </PBBand>
            {patient.nameHistory?.length ? <div className="pb-form" style={{ gridTemplateColumns: 'auto 1fr auto 1fr', padding: '5px 8px' }}>
              <span className="pb-form__label">First:</span>
              <PBInput value={name.first ?? ''} readOnly />
              <span className="pb-form__label pb-form__label--right">Expiry:</span>
              <div className="pb-row">
                <PBInput w={88} value={name.expiry ?? ''} readOnly />
                <span>{`${patient.nameHistory?.length ? 1 : 0} or ${patient.nameHistory?.length ?? 0}`}</span>
              </div>
              <span className="pb-form__label">Middle:</span>
              <PBInput value={name.middle ?? ''} readOnly />
              <span className="pb-form__label pb-form__label--right">Note:</span>
              <PBTextArea rows={2} w="100%" value={name.note ?? ''} readOnly />
              <span className="pb-form__label">Last:</span>
              <PBInput value={name.last ?? ''} readOnly />
              <span /><span />
            </div> : null}
          </div>
        </div>
      </div>

      {/* Historical Contact Information, paged.

          The capture (the MOIS window is only 685px tall on the audit
          machine) is cut off below "Province:" and "Cell:", so the last two
          rows of the left and middle columns are placed from the audit's own
          row order — Expiry Date, Address, Address, City, Province, Postal
          Code, Country, Home, Work, Other, Cell, Ext, Fax, eMail (Home),
          eMail (Work), Note — which reads the block column by column. */}
      <div className="pb-groupbox" style={{ marginTop: 0, flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
        <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
          Historical Contact Information
        </PBBand>
        {/* the record's own strip: the DataWindow blue, bold at both ends */}
        <div
          className="pb-row"
          style={{ padding: '2px 8px', background: 'var(--pb-dw-header)', fontWeight: 700, flex: 'none' }}
        >
          <span>Expiry Date:</span>
          <PBInput w={104} align="center" value={addr.expiry ?? ''} readOnly style={{ fontWeight: 400 }} />
          <span className="pb-row__spacer" />
          <span>{`This is ${history.length ? 1 : 0} of ${history.length} records`}</span>
        </div>
        <div className="pb-form pb-form--cols4" style={{ gridTemplateColumns: 'auto 1fr auto 1fr auto 1fr', padding: '0 8px 6px' }}>
          <span className="pb-form__label pb-form__label--right">Address:</span>
          <PBInput value={addr.address ?? ''} readOnly />
          <span className="pb-form__label pb-form__label--right">Home:</span>
          <PBInput w={116} value={addr.home ?? ''} readOnly />
          <span className="pb-form__label pb-form__label--right">eMail (H):</span>
          <PBInput value={addr.emailHome ?? ''} readOnly />

          <span />
          <PBInput value={addr.address2 ?? ''} readOnly />
          <span className="pb-form__label pb-form__label--right">Work:</span>
          <PBInput w={116} value={addr.work ?? ''} readOnly />
          <span className="pb-form__label pb-form__label--right">eMail (W):</span>
          <PBInput value={addr.emailWork ?? ''} readOnly />

          <span className="pb-form__label pb-form__label--right">City:</span>
          <PBInput w={150} value={addr.city ?? ''} readOnly />
          <span className="pb-form__label pb-form__label--right">Other:</span>
          <PBInput w={116} value={addr.other ?? ''} readOnly />
          <span className="pb-form__label pb-form__label--right">Note:</span>
          <PBTextArea rows={2} w="100%" value={addr.note ?? ''} readOnly />

          <span className="pb-form__label pb-form__label--right">Province:</span>
          <PBInput w={150} value={addr.province ?? ''} readOnly />
          <span className="pb-form__label pb-form__label--right">Cell:</span>
          <PBInput w={116} value={addr.cell ?? ''} readOnly />
          <span /><span />

          <span className="pb-form__label pb-form__label--right">Postal Code:</span>
          <PBInput w={150} value={addr.postal ?? ''} readOnly />
          <span className="pb-form__label pb-form__label--right">Ext.:</span>
          <PBInput w={116} value={addr.ext ?? ''} readOnly />
          <span /><span />

          <span className="pb-form__label pb-form__label--right">Country:</span>
          <PBInput w={150} value={addr.country ?? ''} readOnly />
          <span className="pb-form__label pb-form__label--right">Fax:</span>
          <PBInput w={116} value={addr.fax ?? ''} readOnly />
          <span /><span />
        </div>
      </div>
    </div>
  )
}

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
  band, filters, columns, rows = [], empty, detail, detailHeight,
}: {
  band: string
  filters?: ReactNode
  columns: PBColumn<ListRow>[]
  rows?: ListRow[]
  empty?: string
  detail?: ReactNode
  detailHeight?: number
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
      <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
        {band}
      </PBBand>
      <FilterStrip>{filters}</FilterStrip>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 6px 4px' }}>
        <PBDataWindow columns={columns} rows={rows} empty={empty} />
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
  return (
    <ListShell
      band="Connections"
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
  return (
    <ListShell
      band="Services"
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
                  <span className="pb-form__label">Service Episode:</span><PBLookup w="100%" />
                  <span className="pb-form__label">Service MRP:</span><PBLookup w="100%" />
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
                  <span className="pb-form__label">Stop Date:</span><PBInput w={104} align="center" />
                  <span className="pb-form__label">Stop Reason:</span><PBLookup w="100%" />
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
        <PBDataWindow columns={prefCols} rows={patientContactRows} />
      </div>

      <PBBand>Clinic Contact Preferences (READ-ONLY)</PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 6px 4px' }}>
        <PBDataWindow columns={prefCols} rows={clinicContactRows} />
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
  const sources = [...new Set(benefitRows.map((r) => r.group))]
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
          rows={benefitRows}
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
        <PBDataWindow columns={incentiveCols} rows={incentiveRows} current={cur} onCurrentChange={setCur} />
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
              rows={mspClaimRows}
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
        Created:&nbsp;&nbsp;&nbsp;2026.08.12&nbsp; 10:38&nbsp;&nbsp; JALIL, AHMAD
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
                <PBButton style={{ width: 92 }}>Patient Photo</PBButton>
              </Row>

              <span className="pb-form__label">Name (F/M/L):</span>
              <Row>
                <PBInput w={92} value={patient.first} data-mois-audit-id="MATRIX-R0009-first-name" readOnly />
                <PBInput w={86} value={patient.middle} data-mois-audit-id="MATRIX-R0010-middle-name" readOnly />
                <PBInput w={95} value={patient.last} data-mois-audit-id="MATRIX-R0011-last-name" readOnly />
              </Row>

              <span className="pb-form__label">Alias (F/L):</span>
              <Row>
                <PBInput w={92} value={patient.alias ?? ''} readOnly />
                <span className="pb-row__spacer" />
                <PBInput w={95} />
              </Row>

              <span className="pb-form__label">Birth Date:</span>
              <Row>
                <PBInput w={92} align="center" value={patient.dob} data-mois-audit-id="MATRIX-R0014-birth-date" readOnly />
                {patient.age && <span aria-label="Age">({patient.age.replace(' YR OLD', '').replace(' MTH OLD', ' mth')})</span>}
                <span className="pb-row__spacer" />
                {/* MOIS paints a label yellow once its value has been changed */}
                <span className="pb-flag">Gender:</span>
                <PBSelect options={genders} w={71} value={patient.gender} onChange={() => {}} />
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
                <PBInput w={56} align="center" value={patient.status} readOnly />
                <span style={{ paddingLeft: 18 }}>Date:</span>
                <PBInput w={85} align="center" value={patient.registered ?? ''} readOnly />
                <span className="pb-row__spacer" />
                <PBButton style={{ width: 92 }}>Update Status</PBButton>
              </Row>

              <span className="pb-form__label">BC Health No.:</span>
              <Row><PBInput w={92} value={patient.bchn ?? ''} readOnly /></Row>
            </div>
          </PBGroup>

          <PBGroup title="Contact Information">
            <div className="pb-form pb-demog__form">
              <span className="pb-form__label">Address:</span>
              <Row><PBInput w={281} value={patient.address ?? ''} readOnly /></Row>
              <span className="pb-form__label">Address:</span>
              <Row><PBInput w={281} value={patient.address2 ?? ''} readOnly /></Row>

              <span className="pb-form__label">City:</span>
              <Row>
                <PBLookup w={123} value={patient.city ?? ''} readOnly />
                <span className="pb-row__spacer" />
                <span>Province:</span>
                <PBInput w={94} value={patient.province ?? ''} readOnly />
              </Row>

              <span className="pb-form__label">Postal Code:</span>
              <Row>
                <PBInput w={86} value={patient.postal ?? ''} data-mois-audit-id="MATRIX-R0037-postal-code" readOnly />
                <span className="pb-row__spacer" />
                <span>Country:</span>
                <PBSelect options={countries} w={94} value={patient.country ?? ''} onChange={() => {}} />
              </Row>

              {/* the preferred phone is the one MOIS underlines */}
              {/* MOIS underlines whichever contact method the chart prefers */}
              <PhoneLabel label="Home:" preferred={patient.preferredPhone} />
              <Row>
                <PBInput w={86} align="center" value={patient.home ?? ''} data-mois-audit-id="MATRIX-R0039-home-phone" readOnly />
                <span className="pb-row__spacer" />
                <PBCheckbox label="Leave Message" checked={patient.homeMessage ?? false} />
              </Row>

              <PhoneLabel label="Work:" preferred={patient.preferredPhone} />
              <Row>
                <PBInput w={83} value={patient.work ?? ''} data-mois-audit-id="MATRIX-R0041-work-phone" readOnly />
                <span style={{ paddingLeft: 9 }}>Ext.:</span>
                <PBInput w={60} value={patient.workExt ?? ''} readOnly />
                <span className="pb-row__spacer" />
                <PBCheckbox label="Leave Message" checked={patient.workMessage ?? false} />
              </Row>

              <PhoneLabel label="Cell:" preferred={patient.preferredPhone} />
              <Row>
                <PBInput w={83} value={patient.cell ?? ''} data-mois-audit-id="MATRIX-R0044-cell-phone" readOnly />
                <span className="pb-row__spacer" />
                <span>Pager:</span>
                <PBInput w={94} value={patient.pager ?? ''} readOnly />
              </Row>

              <span className="pb-form__label">Preferred Phone:</span>
              <Row>
                <PBSelect
                  options={preferredPhones}
                  w={86}
                  value={patient.preferredPhone ?? ''}
                  onChange={() => {}}
                />
                <span className="pb-row__spacer" />
                <span>Fax:</span>
                <PBInput w={94} value={patient.fax ?? ''} readOnly />
              </Row>

              <span className="pb-form__label">eMail (Home):</span>
              <Row><PBInput w={281} value={patient.emailHome ?? ''} readOnly /></Row>
              <span className="pb-form__label">eMail (Work):</span>
              <Row><PBInput w={281} value={patient.emailWork ?? ''} readOnly /></Row>
            </div>

            <div className="pb-row" style={{ gap: 6, padding: '4px 0 1px' }}>
              <PBButton style={{ width: 81 }}>Copy Addr.</PBButton>
              <PBButton style={{ width: 70 }}>Paste Addr.</PBButton>
              <PBButton style={{ width: 115 }}>Change Addr. Wizard</PBButton>
              <span className="pb-row__spacer" />
              <PBButton style={{ width: 94 }}>Archive Addr.</PBButton>
            </div>
          </PBGroup>

          <PBGroup title="General Information" fill>
            <div className="pb-form pb-demog__form" style={{ paddingBottom: 3 }}>
              <span className="pb-form__label">Short Note:</span>
              <Row><PBInput w={281} value={patient.note ?? ''} readOnly /></Row>
            </div>
            <div className="pb-demog__notes">
              <span className="pb-form__label">General Notes:</span>
              {/* tdt_chart.str_note, the column Patient Detail also shows */}
              <PBTextArea
                style={{ width: 281, height: '100%', fontFamily: 'var(--pb-font-mono)' }}
                value={patient.generalNotes ?? ''}
                readOnly
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
                <PBSelect options={chartFacilities} w={188} value={patient.facility ?? ''} onChange={() => {}} />
                <span className="pb-row__spacer" />
                <span className="pb-demog__stacked">Last Contact</span>
              </RowR>

              <span className="pb-form__label">Location:</span>
              <RowR>
                <PBSelect options={chartLocations} w={188} value={patient.officeLocation ?? ''} onChange={() => {}} />
                <span className="pb-row__spacer" />
                <PBInput w={85} align="center" value={patient.lastContact ?? ''} readOnly />
              </RowR>

              <span className="pb-form__label">Service:</span>
              <RowR>
                <PBSelect options={chartServices} w={188} value={patient.service ?? ''} onChange={() => {}} />
                <span className="pb-row__spacer" />
                <span className="pb-demog__stacked">Invoice Balance</span>
              </RowR>

              <span className="pb-form__label">Service Provider:</span>
              <RowR>
                <PBSelect options={serviceProviders} w={188} value={patient.provider ?? ''} onChange={() => {}} />
                <span className="pb-row__spacer" />
                {/* a balance MOIS has nothing to print reads as a dash */}
                <PBInput w={85} align="right" value={patient.invoiceBalance ?? '-'} readOnly />
              </RowR>

              <span className="pb-form__label">Chart Loc.:</span>
              <RowR><PBInput w={188} value={patient.location ?? ''} readOnly /></RowR>
            </div>
          </PBGroup>

          <PBGroup title="Insurance Information">
            <div className="pb-form pb-demog__form pb-demog__form--right">
              <span className="pb-form__label">Insurance by:</span>
              <RowR>
                <PBSelect options={insuranceCarriers} w={67} value={patient.insuranceBy ?? ''} onChange={() => {}} />
              </RowR>

              <span className="pb-form__label">Insurance No.:</span>
              <RowR>
                <PBInput w={110} value={patient.insurance ?? ''} readOnly />
                <PBButton style={{ width: 43 }}>Check</PBButton>
                <span style={{ paddingLeft: 8 }}>Dep. No.:</span>
                <PBInput w={46} value={patient.dep ?? ''} readOnly />
              </RowR>

              <span className="pb-form__label">Benefit Source:</span>
              <RowR><PBInput w={110} value={patient.benefitSource ?? ''} readOnly /></RowR>
            </div>
          </PBGroup>

          {/* maintained through Change…, never typed — so the whole block is
              disabled, which is why its labels read grey in the capture */}
          <PBGroup title="Pharmacy Information">
            <div className="pb-form pb-demog__form pb-demog__form--right">
              <span className="pb-form__label pb-form__label--dim">Pharmacy:</span>
              <RowR>
                <PBInput w={227} value={pharmacy.name ?? ''} disabled readOnly />
                <span className="pb-row__spacer" />
                <button className="pb-link">Change...</button>
              </RowR>

              <span className="pb-form__label pb-form__label--dim">Address:</span>
              <RowR><PBInput w={284} value={pharmacy.address ?? ''} disabled readOnly /></RowR>

              <span className="pb-form__label pb-form__label--dim">Phone:</span>
              <RowR>
                <PBInput w={124} align="center" value={pharmacy.phone ?? ''} disabled readOnly />
                <span style={{ paddingLeft: 8 }}>Fax:</span>
                <PBInput w={130} align="center" value={pharmacy.fax ?? ''} disabled readOnly />
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
