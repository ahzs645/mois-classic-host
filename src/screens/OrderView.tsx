import { useState } from 'react'
import {
  PBIdentityStrip, PBBand, PBButton, PBCommandRow, PBDataWindow, PBInput, PBLookup, PBTabs, PBViewHeader,
  type PBColumn,
} from '../pb'
import {
  encounterRows, orderDistributionRows, orderHistoryRows, orderLinkRows, orderRows, patient,
} from '../data/mois'

type Order = typeof orderRows[number]

const columns: PBColumn<Order>[] = [
  { key: 'date', header: 'Date', width: 78, align: 'center' },
  { key: 'type', header: 'Order Type', width: 104, align: 'center' },
  { key: 'by', header: 'Ordered By', width: 140 },
  { key: 'd1', header: '', dots: true },
  { key: 'to', header: 'Order To', width: 140 },
  { key: 'd2', header: '', dots: true },
  { key: 'for', header: 'Order For' },
  { key: 'd3', header: '', dots: true },
  { key: 'st', header: 'ST', width: 30, align: 'center' },
  { key: 'links', header: 'Links', width: 34, align: 'center' },
  { key: 'clip', header: '\u{1F4CE}', width: 20, align: 'center' },
]

export function OrderView({ onAttachment }: { onAttachment: () => void }) {
  const [tab, setTab] = useState('Office Notes (0)')
  const [cur, setCur] = useState(0)

  return (
    <>
      <PBViewHeader title="Order" />
      <PBCommandRow
        commands={[
          { label: 'New Record' }, { label: 'Quick Entry' }, { label: 'Delete Record' },
          { label: 'Save', disabled: true }, { label: 'Undo', disabled: true }, { label: 'Refresh' },
          { label: 'Mark for Review' }, { label: 'Attachment', onClick: onAttachment },
          { label: 'Print' }, { label: 'Paste Provider Addr.', width: 118 }, { label: 'Respond' },
        ]}
      />

      {/* patient identity strip */}
      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first },
          { label: 'MIDDLE:' },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: '2025.01.01' },
        ]}
        encounter="NO ENCOUNTER"
      />

      <div className="pb-row" style={{ padding: '2px 8px' }}>
        <span>Search For:</span>
        <PBLookup w="100%" />
      </div>

      <div style={{ padding: '0 3px', height: 142, display: 'flex' }}>
        <PBDataWindow columns={columns} rows={orderRows} current={cur} onCurrentChange={setCur} />
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '4px 3px 3px' }}>
        <PBTabs
          tabs={['Report', 'Distribution (0)', 'Links (0)', 'Office Notes (0)', 'History (0)']}
          active={tab}
          onChange={setTab}
          compact
        >
          {tab === 'Office Notes (0)' ? (
            <>
              <PBBand
                right={<><PBButton size="sm">New</PBButton><PBButton size="sm">Delete</PBButton></>}
              >
                Office Notes
              </PBBand>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                <PBDataWindow
                  flush
                  gutter={false}
                  columns={[
                    { key: 'date', header: 'Date', width: 96, align: 'center' },
                    { key: 'author', header: 'Author', width: 140, align: 'center' },
                    { key: 'note', header: 'Note' },
                  ]}
                  rows={[]}
                  empty="No office notes on this order."
                />
              </div>
            </>
          ) : tab === 'Distribution (0)' ? (
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
              <PBDataWindow
                flush
                gutter={false}
                columns={[
                  { key: 'method', header: 'Method', width: 96, align: 'center' },
                  { key: 'type', header: 'Recipient Type', width: 116, align: 'center' },
                  { key: 'name', header: 'Name', width: 180, align: 'center' },
                  { key: 'location', header: 'Location', width: 200, align: 'center' },
                  { key: 'status', header: 'Status' },
                ]}
                rows={orderDistributionRows}
                empty="This order has not been distributed."
              />
            </div>
          ) : tab === 'Links (0)' ? (
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
              <PBDataWindow
                flush
                gutter={false}
                columns={[
                  { key: 'section', header: 'Section', width: 110 },
                  { key: 'date', header: 'Date', width: 74 },
                  { key: 'desc', header: 'Description' },
                ]}
                rows={orderLinkRows}
                empty="No linked records."
              />
            </div>
          ) : tab === 'History (0)' ? (
            <>
              <PBBand right={<><PBButton size="sm">Edit</PBButton><PBButton size="sm">Delete</PBButton></>}>
                Status / Assigned to History
              </PBBand>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                <PBDataWindow
                  flush
                  columns={[
                    { key: 'when', header: 'Date / Time', width: 120, align: 'center' },
                    { key: 'by', header: 'Changed By', width: 168 },
                    { key: 'field', header: 'Field', width: 132, align: 'center' },
                    { key: 'to', header: 'Changed To', width: 150, align: 'center' },
                    { key: 'reason', header: 'Reason for Change' },
                  ]}
                  rows={orderHistoryRows}
                  empty="No status changes recorded for this order."
                />
              </div>
            </>
          ) : (
            <div style={{ padding: 10, color: 'var(--pb-text-dim)', fontStyle: 'italic' }}>
              {tab} — nothing to display.
            </div>
          )}
        </PBTabs>
      </div>
    </>
  )
}

export function EncounterListView({ onOpen }: { onOpen?: (row: typeof encounterRows[number]) => void }) {
  const [cur, setCur] = useState(0)
  return (
    <>
      <PBViewHeader title="Encounter" />
      <PBCommandRow
        commands={[
          { label: 'New Record' }, { label: 'Delete Record' }, { label: 'Save', disabled: true },
          { label: 'Undo', disabled: true }, { label: 'Refresh' }, { label: 'Print' }, { label: 'Attachment' },
        ]}
      />
      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first },
          { label: 'MIDDLE:' },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: '2025.01.01' },
        ]}
      />
      <div className="pb-row" style={{ padding: '3px 8px' }}>
        <PBInput w={64} /><PBInput w={330} /><PBInput w={96} /><PBInput w={72} /><PBInput w={180} />
      </div>
      <div className="pb-row" style={{ padding: '0 8px 4px', gap: 28 }}>
        <label className="pb-check">
          <input type="checkbox" /><span className="pb-check__box" />
          <span className="pb-check__label">Hide Future Appointment Series</span>
        </label>
        <label className="pb-check">
          <input type="checkbox" /><span className="pb-check__box" />
          <span className="pb-check__label">Hide Future Appointments All</span>
        </label>
      </div>
      <div style={{ padding: '0 3px', height: 190, display: 'flex' }}>
        <PBDataWindow
          rows={encounterRows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(r) => onOpen?.(r)}
          rowStatus={(r) => (r.alert ? 'alert' : 'normal')}
          columns={[
            { key: 'date', header: 'Date', width: 74, align: 'center', italic: true },
            { key: 'hr', header: 'HR', width: 26, align: 'center', italic: true },
            { key: 'mn', header: 'MN', width: 30, align: 'center', italic: true },
            { key: 'code', header: 'Code', width: 40, align: 'center', italic: true },
            { key: 'mode', header: 'Mode', width: 40, align: 'center', italic: true },
            { key: 'nbr', header: '#', width: 26, align: 'center', italic: true },
            { key: 'provider', header: 'Provider', width: 106, italic: true },
            { key: 'reason', header: 'Visit Reason', width: 160 },
            { key: 'issue', header: 'Health Issue', width: 84 },
            { key: 'd1', header: '', dots: true },
            { key: 'services', header: 'Services', width: 68 },
            { key: 'd2', header: '', dots: true },
            { key: 'payor', header: 'Payor', width: 54 },
            { key: 'room', header: 'Room', width: 52 },
            { key: 'loc', header: 'Service Location', width: 138 },
          ]}
        />
      </div>
    </>
  )
}
