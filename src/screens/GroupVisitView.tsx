import { useState } from 'react'
import { groupVisitRows } from '../data/mois'
import {
  PBBand, PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBDropField, PBInput,
  PBSelect, PBTabs, PBTextArea, PBViewHeader, type PBColumn,
} from '../pb'

type Visit = typeof groupVisitRows[number]

const columns: PBColumn<Visit>[] = [
  { key: 'date', header: 'Date', width: 78, align: 'center' },
  { key: 'hr', header: 'HR', width: 28, align: 'center' },
  { key: 'min', header: 'MIN', width: 32, align: 'center' },
  { key: 'n', header: '#', width: 26, align: 'center' },
  { key: 'provider', header: 'Provider', width: 150 },
  { key: 'topic', header: 'Topic Code', width: 78, align: 'center' },
  { key: 'd', header: '', dots: true },
  { key: 'desc', header: 'Topic Description' },
  { key: 'code', header: 'Code', width: 44, align: 'center' },
  { key: 'loc', header: 'Service Location', width: 130 },
]

/* PowerBuilder parks a tiny recurrence glyph in the gutter of a series row. */
const SeriesGlyph = () => (
  <svg width="11" height="11" viewBox="0 0 11 11">
    <circle cx="5.5" cy="5.5" r="4" fill="none" stroke="#2f5a8c" />
    <path d="M5.5 3v3l2 1.2" stroke="#2f5a8c" fill="none" strokeWidth="1.1" />
  </svg>
)

export function GroupVisitView() {
  const [tab, setTab] = useState('Patient List')
  const [cur, setCur] = useState(0)

  return (
    <>
      <PBViewHeader title="Group Visit List" />
      <PBCommandRow
        commands={[
          { label: 'New Appt' }, { label: 'Appt Series' }, { label: 'Save', disabled: true },
          { label: 'Delete Appt' }, { label: 'Undo', disabled: true }, { label: 'Refresh' },
          { label: 'Prepare for Meeting', width: 116 }, { label: 'Create MSP Claims', width: 108 },
          { label: 'Clone Appt' },
        ]}
      />

      <div className="pb-row" style={{ padding: '3px 6px', gap: 6 }}>
        <PBDropField w={296} />
        <PBInput w={230} />
        <PBInput w={172} />
      </div>

      <div className="pb-row" style={{ padding: '0 8px 4px', gap: 28 }}>
        <PBCheckbox label="Hide Future Appointment Series" />
        <PBCheckbox label="Hide Future Appointments All" />
      </div>

      <div style={{ height: 244, display: 'flex', padding: '0 3px' }}>
        <PBDataWindow
          columns={columns}
          rows={[] as Visit[]}
          current={cur}
          onCurrentChange={setCur}
          rowIcon={(r) => (r.series ? <SeriesGlyph /> : null)}
        />
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '4px 3px 3px' }}>
        <PBTabs
          tabs={['Patient List', 'Other Provider(s)', 'Other Resource(s)', 'Additional Information']}
          active={tab}
          onChange={setTab}
          justified
        >
          {tab === 'Additional Information' ? <VisitDetailPage /> : (
          <>
          <PBBand right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}>
            {tab === 'Patient List' ? 'Patient List'
              : tab === 'Other Provider(s)' ? 'Other Provider List' : 'Other Resource List'}
          </PBBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            {tab === 'Patient List' ? (
              <PBDataWindow
                flush
                gutter={false}
                rows={[]}
                columns={[
                  { key: 'chart', header: 'Chart', width: 72, align: 'center' },
                  { key: 'first', header: 'First Name', width: 92 },
                  { key: 'last', header: 'Last Name', width: 92 },
                  { key: 'code', header: 'Code', width: 46, align: 'center' },
                  { key: 'mode', header: 'Mode', width: 46, align: 'center' },
                  { key: 'reason', header: 'Visit Reason', width: 176 },
                  { key: 'issue', header: 'Health Issue', width: 108 },
                  { key: 'services', header: 'Services', width: 92 },
                  { key: 'as', header: 'AS', width: 30, align: 'center' },
                  { key: 'ds', header: 'DS', width: 30, align: 'center' },
                  { key: 'bs', header: 'BS', width: 30, align: 'center' },
                  { key: 't', header: 'T', width: 24, align: 'center' },
                ]}
                empty="No patients booked into this group visit."
              />
            ) : (
              <PBDataWindow
                flush
                gutter={false}
                rows={[]}
                columns={[
                  {
                    key: tab === 'Other Provider(s)' ? 'provider' : 'resource',
                    header: tab === 'Other Provider(s)' ? 'Provider' : 'Resource',
                    width: 228, align: 'center',
                  },
                  { key: 'd', header: '', dots: true },
                  { key: 'note', header: 'Note', align: 'center' },
                  { key: 'reserve', header: 'Reserve Time on Schedule', width: 160, align: 'center' },
                ]}
                empty={`No ${tab.replace(/\(s\)/, 's').toLowerCase()} attached to this visit.`}
              />
            )}
          </div>
          </>
          )}
        </PBTabs>
      </div>
    </>
  )
}

/* Additional Information is a plain detail form, not another list. */
function VisitDetailPage() {
  return (
    <>
      <PBBand>Visit Detail</PBBand>
      <div className="pb-form" style={{ gridTemplateColumns: '92px 1fr', alignItems: 'start', padding: '6px 10px' }}>
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Resource:</span>
        <PBSelect options={['', 'ROOM 1', 'ROOM 2', 'GROUP ROOM']} w={130} />
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Room Number:</span>
        <PBInput w={82} />
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Comment:</span>
        <PBTextArea rows={8} w="100%" />
      </div>
      <div className="pb-row" style={{ padding: '2px 10px 4px', gap: 0 }}>
        <span>Record Created:</span>
        <span style={{ width: 60 }} />
        <span>Last Modified:</span>
      </div>
    </>
  )
}
