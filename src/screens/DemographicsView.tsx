import { Fragment, useState } from 'react'
import {
  PBIdentityStrip, PBBand, PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBInput,
  PBLookup, PBSelect, PBTabs, PBTextArea, PBViewHeader, type PBColumn,
} from '../pb'
import {
  benefitRows, clinicContactRows, incentiveRows, mspClaimRows, patientContactRows, patient,
} from '../data/mois'
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

export function DemographicsView() {
  const [tab, setTab] = useState('Incentives')
  const [editBenefit, setEditBenefit] = useState(false)

  return (
    <>
      <PBViewHeader title="Demographics" />
      <PBCommandRow
        commands={[
          { label: 'New Record' }, { label: 'Delete Record' }, { label: 'Save', active: true },
          { label: 'Undo' }, { label: 'Refresh' }, { label: 'Search' },
          { label: 'Previous Chart', width: 94 }, { label: 'Next Chart', width: 82 },
        ]}
      />

      <PBIdentityStrip
        fields={[
          { label: 'CHART:', value: '87288' },
          { label: 'FIRST:', value: patient.first },
          { label: 'MIDDLE:', value: patient.middle },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: '1986/12/19' },
        ]}
      />

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '3px 3px 3px' }}>
        <PBTabs tabs={TABS} active={tab} onChange={setTab} compact>
          {tab === 'Incentives' && <IncentivesPage />}
          {tab === 'Demographics' && <DemographicsPage />}
          {tab === 'Settings' && <SettingsPage />}
          {tab === 'Patient Detail' && <PatientDetailPage />}
          {tab === 'Benefits' && <BenefitsPage onEdit={() => setEditBenefit(true)} />}
          {SUB_TABS[tab] && <SubTabPage key={tab} cfg={SUB_TABS[tab]} />}
          {!['Incentives', 'Demographics', 'Settings', 'Benefits', 'Patient Detail'].includes(tab) && !SUB_TABS[tab] && (
            <div className="pb-dw__empty" style={{ padding: 24 }}>{tab} — no content retrieved.</div>
          )}
        </PBTabs>
      </div>

      {editBenefit && <BenefitEditor onClose={() => setEditBenefit(false)} />}
    </>
  )
}

/* --- Patient Detail ------------------------------------------------------
   Three Ethnicity rows each with a Self ID'd flag, the background block, a
   Status History grid and Name History form on the right, and a paging
   Historical Contact Information block underneath.

   Note the yellow "Preferred Gender" label: MOIS paints a control's label
   yellow once the value has been changed — see `.pb-form__label--flagged`. */
function PatientDetailPage() {
  const ETHNICITY = ['FIRST NATIONS', 'METIS', 'INUIT']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto' }}>
      <div style={{ display: 'flex', gap: 4, flex: 'none' }}>
        {/* background information */}
        <div className="pb-groupbox" style={{ flex: '1 1 auto', minWidth: 0 }}>
          <PBBand>Background Information</PBBand>
          <div className="pb-form" style={{ gridTemplateColumns: '108px 1fr', padding: '5px 8px' }}>
            {ETHNICITY.map((e, i) => (
              <Fragment key={e}>
                <span className="pb-form__label">Ethnicity:</span>
                <div className="pb-row">
                  <PBInput w={54} defaultValue="Self" />
                  <PBLookup w={190} defaultValue={e} />
                  <PBCheckbox label="Self ID'd" checked={i < 2} />
                </div>
              </Fragment>
            ))}

            <span className="pb-form__label pb-form__label--flagged">Preferred Gender:</span>
            <div className="pb-row">
              <PBSelect options={['N', 'F', 'M', 'X']} w={62} />
              <span className="pb-flag" style={{ marginLeft: 8 }}>Genotypic Gender:</span>
              <PBSelect options={['F', 'M', 'X']} w={62} />
            </div>

            <span className="pb-form__label">Country Origin:</span><PBLookup w={230} />
            <span className="pb-form__label">First Language:</span><PBLookup w={230} />
            <span className="pb-form__label">Religion:</span><PBInput w={230} />
            <span className="pb-form__label">First Nation Status:</span>
            <PBSelect options={['Status Indian', 'Non-Status', 'Not Applicable']} w={200} />

            <span className="pb-form__label">Patient Adopted:</span>
            <div className="pb-row">
              <PBCheckbox label="Yes" checked />
              <span style={{ marginLeft: 18 }}>Multi-Gestation:</span>
              <PBCheckbox label="Yes" checked />
            </div>

            <span className="pb-form__label">Relationship:</span>
            <PBSelect options={['Married', 'Single', 'Common Law', 'Widowed']} w={166} />
            <span className="pb-form__label">Education Level:</span>
            <PBSelect options={['POST SECONDARY CERTIFICATE', 'SECONDARY', 'NONE']} w={230} />
            <span className="pb-form__label">Socioeconomic:</span><PBLookup w={230} defaultValue="NO" />
            <span className="pb-form__label">Living Arrangements:</span><PBLookup w={230} defaultValue="Roommate" />

            <span className="pb-form__label" style={{ alignSelf: 'start', paddingTop: 2 }}>General Notes:</span>
            <PBTextArea
              rows={4}
              w="100%"
              style={{ fontFamily: 'var(--pb-font-mono)' }}
              defaultValue={'JANUARY 27, 2025  (NHVC-AK)\n   CLIENT WILL BE IN PG DURING APPT\n\nClient prefers to be called by alias name.'}
            />
          </div>
        </div>

        {/* status and name history */}
        <div style={{ width: 400, flex: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="pb-groupbox" style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <PBBand>Status History</PBBand>
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
              <PBDataWindow
                flush
                gutter={false}
                rows={[]}
                columns={[
                  { key: 'code', header: 'Status Code', width: 110, align: 'center' },
                  { key: 'effective', header: 'Effective', width: 96, align: 'center' },
                  { key: 'note', header: 'Note' },
                ]}
                empty=" "
              />
            </div>
          </div>

          <div className="pb-groupbox" style={{ flex: 'none' }}>
            <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
              Name History
            </PBBand>
            <div className="pb-form" style={{ gridTemplateColumns: 'auto 1fr auto 1fr', padding: '5px 8px' }}>
              <span className="pb-form__label">First:</span><PBInput />
              <span className="pb-form__label pb-form__label--right">Expiry:</span>
              <div className="pb-row"><PBInput w={88} /><span>1 or 1</span></div>
              <span className="pb-form__label">Middle:</span><PBInput />
              <span className="pb-form__label pb-form__label--right">Note:</span>
              <PBTextArea rows={2} w="100%" />
              <span className="pb-form__label">Last:</span><PBInput />
              <span /><span />
            </div>
          </div>
        </div>
      </div>

      {/* historical contact information, paged */}
      <div className="pb-groupbox" style={{ marginTop: 4, flex: '1 1 auto', minHeight: 0 }}>
        <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
          Historical Contact Information
        </PBBand>
        <div className="pb-row" style={{ padding: '3px 8px' }}>
          <span className="pb-flag">Expiry Date:</span>
          <PBInput w={104} align="center" defaultValue="2026.08.21" />
          <span className="pb-row__spacer" />
          <span>This is 1 of 17 records</span>
        </div>
        <div className="pb-form pb-form--cols4" style={{ gridTemplateColumns: 'auto 1fr auto 1fr auto 1fr', padding: '0 8px 6px' }}>
          <span className="pb-form__label pb-form__label--right">Address:</span>
          <PBInput defaultValue="1425 MY STREET" />
          <span className="pb-form__label pb-form__label--right">Home:</span>
          <PBInput w={116} defaultValue="(250) 960-957" />
          <span className="pb-form__label pb-form__label--right">eMail (H):</span>
          <PBInput />

          <span />
          <PBInput defaultValue="PO BOX 1245" />
          <span className="pb-form__label pb-form__label--right">Work:</span>
          <PBInput w={116} />
          <span className="pb-form__label pb-form__label--right">eMail (W):</span>
          <PBInput />

          <span className="pb-form__label pb-form__label--right">City:</span>
          <PBInput w={150} defaultValue="PRINCE GEORGE" />
          <span className="pb-form__label pb-form__label--right">Other:</span>
          <PBInput w={116} defaultValue="(250) 112-2321" />
          <span className="pb-form__label pb-form__label--right">Note:</span>
          <PBTextArea rows={2} w="100%" />

          <span className="pb-form__label pb-form__label--right">Province:</span>
          <PBInput w={150} defaultValue="BC" />
          <span className="pb-form__label pb-form__label--right">Cell:</span>
          <PBInput w={116} />
          <span /><span />
        </div>
      </div>
    </div>
  )
}

/* --- the remaining Demographics tabs -------------------------------------
   Column sets taken from the MOIS field audit (tdt_alias_id, tdt_connection,
   tdt_chart_service, tdt_associated_party, tdt_claim_wcb), not invented.  */
type SubTab = { band: string; columns: PBColumn<Record<string, string>>[] }

const SUB_TABS: Record<string, SubTab> = {
  'ID Alias': {
    band: 'Alias Identifiers',
    columns: [
      { key: 'code', header: 'Code', width: 90, align: 'center' },
      { key: 'desc', header: 'Description', width: 220 },
      { key: 'value', header: 'Value' },
      { key: 'effective', header: 'Effective', width: 96, align: 'center' },
      { key: 'note', header: 'Note', width: 180 },
      { key: 'demo', header: 'Show on Demo', width: 92, align: 'center' },
      { key: 'm', header: 'M', width: 24, align: 'center' },
      { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center' },
    ],
  },
  Connections: {
    band: 'Connections',
    columns: [
      { key: 'role', header: 'Connection Role', width: 150, align: 'center' },
      { key: 'connection', header: 'Connection' },
      { key: 'start', header: 'Start', width: 86, align: 'center' },
      { key: 'end', header: 'End', width: 86, align: 'center' },
      { key: 'demo', header: 'Show on Demo', width: 92, align: 'center' },
      { key: 'team', header: 'Care Team Member', width: 116, align: 'center' },
      { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center' },
    ],
  },
  Services: {
    band: 'Service Episodes',
    columns: [
      { key: 'episode', header: 'Service Episode', width: 230 },
      { key: 'mrp', header: 'Service MRP', width: 200 },
      { key: 'start', header: 'Start', width: 86, align: 'center' },
      { key: 'stop', header: 'Stop', width: 86, align: 'center' },
      { key: 'demo', header: 'Show on Demo', width: 92, align: 'center' },
      { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center' },
    ],
  },
  'Associated Parties': {
    band: 'Associated Parties',
    columns: [
      { key: 'name', header: 'Name', width: 220 },
      { key: 'relationship', header: 'Relationship', width: 150, align: 'center' },
      { key: 'demo', header: 'Show on Demo', width: 92, align: 'center' },
      { key: 'careplan', header: 'Show on Care Plan', width: 116, align: 'center' },
      { key: 'phone', header: "Pref'd Phone", width: 120, align: 'center' },
      { key: 'email', header: 'eMail (Home)' },
      { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center' },
    ],
  },
  'WCB Claims': {
    band: 'WCB Claims',
    columns: [
      { key: 'doi', header: 'DOI', width: 96, align: 'center' },
      { key: 'claim', header: 'Claim No', width: 120, align: 'center' },
      { key: 'position', header: 'Position', width: 170 },
      { key: 'employer', header: 'Employer' },
      { key: 'default', header: 'Default', width: 62, align: 'center' },
      { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center' },
    ],
  },
}

function SubTabPage({ cfg }: { cfg: SubTab }) {
  return (
    <>
      <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
        {cfg.band}
      </PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 6px 4px' }}>
        <PBDataWindow columns={cfg.columns} rows={[]} empty={`No ${cfg.band.toLowerCase()} on file.`} />
      </div>
    </>
  )
}

/* --- Settings: contact information and the two preference grids ---------- */
function SettingsPage() {
  const prefCols: PBColumn<Record<string, string>>[] = [
    { key: 'reason', header: 'Reason', width: 150, align: 'center' },
    { key: 'order', header: 'Order', width: 60, align: 'center' },
    { key: 'method', header: 'Method', width: 110, align: 'center' },
    { key: 'source', header: 'Source', width: 140, align: 'center' },
    { key: 'contact', header: 'Contact' },
    { key: 'd', header: '', dots: true },
  ]
  return (
    <>
      <PBBand>Patient Contact Information</PBBand>
      <div className="pb-form pb-form--cols4" style={{ gridTemplateColumns: 'auto 1fr auto 1fr', padding: '6px 10px' }}>
        <span className="pb-form__label" style={{ textDecoration: 'underline' }}>Home:</span>
        <PBInput w={150} defaultValue={patient.phone} />
        <span className="pb-form__label pb-form__label--right">Email:</span>
        <PBInput defaultValue="leminor@gmail.com" />
        <span className="pb-form__label">Work:</span><PBInput w={150} />
        <span className="pb-form__label pb-form__label--right">Alt Email:</span><PBInput />
        <span className="pb-form__label">Cell:</span><PBInput w={150} />
        <span /><span />
        <span className="pb-form__label">Preferred:</span>
        <PBSelect options={['HOME', 'WORK', 'CELL']} w={150} />
      </div>

      <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
        Patient Contact Preferences
      </PBBand>
      <div style={{ height: 96, display: 'flex', padding: '0 6px 4px' }}>
        <PBDataWindow columns={prefCols} rows={patientContactRows} />
      </div>

      <PBBand>Clinic Contact Preferences (READ-ONLY)</PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 6px 4px' }}>
        <PBDataWindow columns={prefCols} rows={clinicContactRows} />
      </div>
    </>
  )
}

/* --- Benefits: a grouped list with two X-mark flag columns --------------- */
function BenefitsPage({ onEdit }: { onEdit: () => void }) {
  return (
    <>
      <PBBand
        right={
          <>
            <PBButton size="sm" onClick={onEdit}>New</PBButton>
            <PBButton size="sm" onClick={onEdit}>Edit</PBButton>
            <PBButton size="sm">Delete</PBButton>
          </>
        }
      >
        Benefits
      </PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 6px 4px' }}>
        <PBDataWindow
          rows={benefitRows}
          groupBy={(r) => r.group}
          columns={[
            { key: 'benefit', header: 'Benefit / Service' },
            { key: 'demo', header: <>Show on<br />Demo</>, width: 78, align: 'center' },
            { key: 'careplan', header: <>Tagged to<br />Care Plan</>, width: 86, align: 'center' },
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

function DemographicsPage() {
  return (
    <div style={{ display: 'flex', gap: 0, padding: 6, alignItems: 'flex-start' }}>
      <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '92px 1fr', width: 376, flex: 'none' }}>
        <span className="pb-form__label">Surname:</span><PBInput defaultValue={patient.last} />
        <span className="pb-form__label">Given:</span><PBInput defaultValue={patient.first} />
        <span className="pb-form__label">Middle:</span><PBInput defaultValue={patient.middle} />
        <span className="pb-form__label">Preferred:</span><PBInput />
        <span className="pb-form__label">Birth Date:</span>
        <div className="pb-row"><PBInput w={92} align="center" defaultValue="1986/12/19" /><span>39 YR OLD</span></div>
        <span className="pb-form__label">Sex:</span><PBSelect options={['M', 'F', 'X', 'U']} w={62} />
        <span className="pb-form__label">BC Health No.:</span><PBInput defaultValue={patient.bchn} />
        <span className="pb-form__label">Status:</span><PBSelect options={['ACTIVE', 'INACTIVE', 'DECEASED']} w={140} />
      </div>

      <span className="pb-vrule" />

      <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '92px 1fr', flex: '1 1 auto', minWidth: 0 }}>
        <span className="pb-form__label">Address:</span><PBInput />
        <span className="pb-form__label">City:</span><PBInput w={190} />
        <span className="pb-form__label">Province:</span>
        <div className="pb-row"><PBSelect options={['BC', 'AB', 'SK', 'MB', 'ON']} w={62} /><span>Postal:</span><PBInput w={82} /></div>
        <span className="pb-form__label">Home Phone:</span><PBInput w={140} defaultValue={patient.phone} />
        <span className="pb-form__label">Work Phone:</span><PBInput w={140} />
        <span className="pb-form__label">Cell:</span><PBInput w={140} />
        <span className="pb-form__label">Email:</span><PBInput />
        <span className="pb-form__label">Service MRP:</span><PBLookup defaultValue="TECHNICAL SUPPORT" />
      </div>
    </div>
  )
}
