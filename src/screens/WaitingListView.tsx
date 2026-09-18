import { Fragment, useState } from 'react'
import {
  PBBand, PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBDropDownDataWindow,
  PBInput, PBLookup, PBRadio, PBSelect, PBTabs, PBTextArea, PBViewHeader, type PBColumn,
} from '../pb'
import { waitListRows, waitListNames } from '../data/mois'

/* Provider Waiting List — transcribed from the tdt_wait_list evidence
   capture, including the DropDownDataWindow on the Wait List field. */

type Wait = Record<string, string>

const columns: PBColumn<Wait>[] = [
  { key: 'row', header: 'Row#', width: 44, align: 'center' },
  { key: 'last', header: 'Last Name', width: 116 },
  { key: 'first', header: 'First Name', width: 106 },
  { key: 'chart', header: 'Chart', width: 62, align: 'center' },
  { key: 'd', header: '', dots: true },
  { key: 'added', header: 'Date Added', width: 88, align: 'center' },
  { key: 'wt', header: 'W.T.', width: 50, align: 'center' },
  { key: 'bkd', header: "Bk'd", width: 40, align: 'center' },
  { key: 'list', header: 'List', width: 200 },
  { key: 'reason', header: 'Reason', width: 160 },
  { key: 'priority', header: 'Priority', width: 60, align: 'center' },
]

export function WaitingListView({ mode = 'provider' }: { mode?: 'provider' | 'resource' }) {
  const [tab, setTab] = useState('Contact Information')
  const [show, setShow] = useState('waiting')
  const [cur, setCur] = useState(2)

  return (
    <>
      <PBViewHeader title={mode === 'provider' ? 'Provider Waiting List' : 'Resource Waiting List'} />
      <PBCommandRow
        commands={[
          { label: 'New Appt' }, { label: 'Delete Appt' }, { label: 'Save', disabled: true },
          { label: 'Undo', disabled: true }, { label: 'Refresh' },
          { label: 'Create Appointment', width: 112 }, { label: 'Print Report', width: 88 },
          { label: 'Print List' }, { label: 'Open Chart' }, { label: 'Close Window', width: 90 },
        ]}
      />

      {/* filter block: a required owner, an optional list, and the record scope */}
      <div className="pb-form" style={{ gridTemplateColumns: 'auto auto 1fr', padding: '4px 8px', alignItems: 'center' }}>
        <span className="pb-form__label">{mode === 'provider' ? 'Provider:' : 'Resource:'}</span>
        <PBSelect options={['TECHNICAL SUPPORT', 'MURPHY, JOAN', 'GRAHAM, CHELSEA']} w={224} />
        <div className="pb-row">
          <span>(required)</span>
          <span style={{ width: 20 }} />
          <span>Show:</span>
          <PBRadio name="wlshow" label="All Records" checked={show === 'all'} onChange={() => setShow('all')} />
        </div>

        <span className="pb-form__label">Wait List:</span>
        <PBDropDownDataWindow
          w={224}
          columns={[{ key: 'name', header: 'Name', width: 210 }, { key: 'desc', header: 'Description' }]}
          rows={waitListNames}
          display="name"
        />
        <div className="pb-row">
          <span>(optional)</span>
          <span style={{ width: 20 }} />
          <PBRadio
            name="wlshow"
            label="Waiting Records (w/o outcome date)"
            checked={show === 'waiting'}
            onChange={() => setShow('waiting')}
          />
          <span style={{ width: 14 }} />
          <PBCheckbox label="Hide booked patients" />
        </div>
      </div>

      <div className="pb-row" style={{ padding: '2px 8px' }}>
        <span>Search For:</span><PBLookup w="100%" />
      </div>

      <div style={{ padding: '0 3px', height: 226, display: 'flex' }}>
        <PBDataWindow columns={columns} rows={waitListRows} current={cur} onCurrentChange={setCur} />
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '4px 3px 3px' }}>
        <PBTabs
          tabs={['Contact Information', 'List Detail', 'Procedure List', 'Unavailability']}
          active={tab}
          onChange={setTab}
          compact
        >
          {tab === 'Contact Information' && <ContactPage row={waitListRows[cur]} />}
          {tab === 'List Detail' && <ListDetailPage />}
          {tab === 'Procedure List' && (
            <>
              <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
                Procedure List
              </PBBand>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                <PBDataWindow
                  flush
                  gutter={false}
                  rows={[]}
                  columns={[
                    { key: 'procedure', header: 'Procedure', width: 240 },
                    { key: 'requested', header: 'Requested', width: 96, align: 'center' },
                    { key: 'priority', header: 'Priority', width: 76, align: 'center' },
                    { key: 'note', header: 'Note' },
                  ]}
                  empty="No procedures requested for this entry."
                />
              </div>
            </>
          )}
          {tab === 'Unavailability' && (
            <>
              <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
                Unavailability
              </PBBand>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                <PBDataWindow
                  flush
                  gutter={false}
                  rows={[]}
                  columns={[
                    { key: 'from', header: 'From', width: 100, align: 'center' },
                    { key: 'to', header: 'To', width: 100, align: 'center' },
                    { key: 'reason', header: 'Reason' },
                    { key: 'by', header: 'Recorded By', width: 160 },
                  ]}
                  empty="No unavailability recorded."
                />
              </div>
            </>
          )}
        </PBTabs>
      </div>
    </>
  )
}

/* the entry's own detail: which list, why, and how long it has waited */
function ListDetailPage() {
  return (
    <>
      <PBBand>Wait List Entry Detail</PBBand>
      <div style={{ display: 'flex', gap: 0, padding: '5px 8px', alignItems: 'flex-start' }}>
        <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '96px 1fr', width: 420, flex: 'none' }}>
          <span className="pb-form__label pb-form__label--right">Wait List:</span>
          <PBDropDownDataWindow
            w={244}
            columns={[{ key: 'name', header: 'Name', width: 210 }, { key: 'desc', header: 'Description' }]}
            rows={waitListNames}
            display="name"
          />
          <span className="pb-form__label pb-form__label--right">Date Added:</span>
          <PBInput w={104} align="center" defaultValue="2019.01.14" />
          <span className="pb-form__label pb-form__label--right">Wait Time:</span>
          <div className="pb-row"><PBInput w={72} align="center" defaultValue="2767" /><span>days</span></div>
          <span className="pb-form__label pb-form__label--right">Priority:</span>
          <PBSelect options={['', 'ROUTINE', 'URGENT', 'EMERGENT']} w={130} />
          <span className="pb-form__label pb-form__label--right">Booked:</span>
          <PBCheckbox label="Appointment booked" checked />
          <span className="pb-form__label pb-form__label--right">Outcome Date:</span>
          <PBInput w={104} align="center" />
        </div>

        <span className="pb-vrule" />

        <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '84px 1fr', flex: '1 1 auto', minWidth: 0, alignItems: 'start' }}>
          <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px' }}>Reason:</span>
          <PBLookup w="100%" />
          <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px' }}>Note:</span>
          <PBTextArea rows={6} w="100%" />
        </div>
      </div>
    </>
  )
}

function ContactPage({ row }: { row?: Wait }) {
  const name = row ? `${row.first} ${row.last}` : ''
  return (
    <>
      <PBBand>Patient Detail / Contact Information</PBBand>
      <div style={{ display: 'flex', gap: 0, padding: '5px 8px', alignItems: 'flex-start' }}>
        <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '84px 1fr', width: 400, flex: 'none' }}>
          <span className="pb-form__label pb-form__label--right">Patient Name:</span>
          <b style={{ lineHeight: '19px' }}>{name}</b>
          <span className="pb-form__label pb-form__label--right">DoB:</span>
          <div className="pb-row">
            <PBInput w={110} align="center" defaultValue="2021.01.04" />
            <span style={{ marginLeft: 10 }}>Sex:</span>
            <PBSelect options={['F', 'M', 'X', 'U']} w={62} />
          </div>
          <span className="pb-form__label pb-form__label--right">Address:</span>
          <PBInput defaultValue="1234 street" />
          <span className="pb-form__label pb-form__label--right">Address:</span>
          <PBInput />
          <span className="pb-form__label pb-form__label--right">City:</span>
          <div className="pb-row">
            <PBInput w={132} defaultValue="PRINCE GEORGE" />
            <span style={{ marginLeft: 10 }}>Province:</span>
            <PBInput w={72} defaultValue="BC" />
          </div>
          <span className="pb-form__label pb-form__label--right">Postal Code:</span>
          <div className="pb-row">
            <PBInput w={92} defaultValue="TEST" />
            <span style={{ marginLeft: 10 }}>Country:</span>
            <PBInput w={92} defaultValue="CANADA" />
          </div>
        </div>

        <div style={{ flex: '1 1 auto', minWidth: 0, paddingLeft: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>Contact Information</div>
          <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '58px 1fr' }}>
            {([
              ['Home:', '(250) 555-1234', true, false],
              ['Work:', '(250) 555-3215', true, true],
              ['Cell:', '(250) 555-3215', false, false],
            ] as const).map(([label, val, leave, underline]) => (
              <Fragment key={label}>
                <span
                  className="pb-form__label pb-form__label--right"
                  style={underline ? { textDecoration: 'underline' } : undefined}
                >
                  {label}
                </span>
                <div className="pb-row">
                  <PBInput w={116} defaultValue={val} />
                  {label === 'Work:' && (<><span>Ext.:</span><PBInput w={72} /></>)}
                  {label === 'Cell:' && (<><span>Pager:</span><PBInput w={104} /></>)}
                  {leave && <><span className="pb-row__spacer" /><PBCheckbox label="Leave Message" /></>}
                </div>
              </Fragment>
            ))}
            <span className="pb-form__label pb-form__label--right">Pref'd Phone:</span>
            <div className="pb-row">
              <PBSelect options={['Work', 'Home', 'Cell']} w={116} />
              <span>Fax:</span><PBInput w={130} />
            </div>
            <span className="pb-form__label pb-form__label--right">eMail:</span>
            <PBInput defaultValue="test@test.com" />
          </div>
        </div>
      </div>

      <div className="pb-row" style={{ padding: '4px 10px' }}>
        <span>
          ** Please note this is a registered patient. Any changes to the data must be made in the chart module.
        </span>
        <span className="pb-row__spacer" />
        <PBButton wide>Refresh</PBButton>
      </div>
    </>
  )
}
