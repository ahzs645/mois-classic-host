import { useState } from 'react'
import { useChartRows, useNodeRecords } from '../data/chart-records'
import type { MoisRecord } from '../data/charts'
import { stamp } from '../data/charts/detail'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import {
  PBBand, PBCheckbox, PBCommandRow, PBDataWindow, PBIdentityStrip, PBInput,
  PBLookup, PBTabs, PBTextArea, PBViewHeader, type PBColumn,
} from '../pb'

/* ============================================================================
   Rx - Prescription and Long Term Medications are one window family: same
   grid shape, same untabbed detail pane, same instruction checkbox block.
   Transcribed from the evidence captures for tdt_prescription and
   tdt_medication_lt.

   This window used to carry a `Detail` / `CPP` tab pair. No capture in the
   manual shows one — the classic Rx detail pane is untabbed, and the CPP
   fields it held (On CPP / Sort Order / Heading / Note) appear nowhere in the
   corpus. Controlled prescribing is a separate window in a different UI
   toolkit entirely (flat WPF chrome, cyan title bar, orange primary button),
   so it cannot reuse this kit and is not modelled here.
   ========================================================================= */

type Med = Record<string, string>

const RX_COLUMNS: PBColumn<Med>[] = [
  { key: 'order', header: 'Order', width: 84, align: 'center' },
  { key: 'med', header: 'Medication' },
  { key: 'd1', header: '', dots: true },
  { key: 'dose', header: 'Dose / Frequency', width: 150, align: 'center' },
  { key: 'd2', header: '', dots: true },
  { key: 'amount', header: 'Amount', width: 110, align: 'center' },
  { key: 'type', header: 'Type', width: 56, align: 'center' },
  { key: 'm', header: 'M', width: 22, align: 'center' },
  { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center' },
]

const LTM_COLUMNS: PBColumn<Med>[] = [
  { key: 'start', header: 'Start', width: 80, align: 'center' },
  { key: 'end', header: 'End', width: 80, align: 'center' },
  { key: 'med', header: 'Medication' },
  { key: 'd1', header: '', dots: true },
  { key: 'dose', header: 'Dose / Frequency', width: 140, align: 'center' },
  { key: 'd2', header: '', dots: true },
  { key: 'indic', header: 'Indic.', width: 60, align: 'center' },
  { key: 'type', header: 'Type', width: 58, align: 'center' },
  { key: 'm', header: 'M', width: 22, align: 'center' },
]

export function MedicationView({ mode }: { mode: 'rx' | 'ltm' }) {
  const patient = usePatient()
  const rx = mode === 'rx'
  const [cur, setCur] = useState(0)
  const [tab, setTab] = useState('Detail')
  /* a chart with a real export behind it lists its own medications; MOIS keeps
     prescriptions and long-term meds in one export table, so both folders read
     it and the LT list is the subset still running */
  const exported = useChartRows(rx ? 'rx' : 'ltm')
  const records = useNodeRecords(rx ? 'rx' : 'ltm')
  const record = records[cur]
  const rows = exported

  return (
    <>
      <PBViewHeader title={rx ? 'Rx - Prescription' : 'Long Term Medications'} right={<ChartHeaderIdentity />} />
      <PBCommandRow
        commands={
          rx
            ? [
                { label: 'New Record' }, { label: 'Rx Wizard' }, { label: 'Rx Favourite' },
                { label: 'Delete Record' }, { label: 'Save', disabled: true },
                { label: 'Undo', disabled: true }, { label: 'Refresh' },
                { label: 'Duplicate' }, { label: 'Attachment' }, { label: 'Print Rx' },
              ]
            : [
                { width: 66, label: 'New' }, { width: 66, label: 'Rx Favourite' }, { width: 66, label: 'Delete' },
                { width: 66, label: 'Save', disabled: true }, { width: 66, label: 'Undo', disabled: true },
                { width: 66, label: 'Refresh' }, { width: 66, label: 'Duplicate' }, { width: 66, label: 'Renew' },
                { width: 66, label: 'Attachment' }, { width: 66, label: 'Print Rx' }, { width: 66, label: 'Review' },
                { width: 66, label: 'No Known' },
              ]
        }
      />

      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first },
          { label: 'MIDDLE:', value: patient.middle },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: patient.dob },
        ]}
        encounter="NO ENCOUNTER"
      />

      <div className="pb-row" style={{ padding: '2px 8px' }}>
        <span>Search For:</span><PBLookup w="100%" />
      </div>

      <div style={{ padding: '0 3px', height: rx ? 256 : 232, flex: 'none', display: 'flex' }}>
        <PBDataWindow
          columns={rx ? RX_COLUMNS : LTM_COLUMNS}
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
        />
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '4px 3px 0' }}>
        <PBTabs tabs={['Detail', 'CPP']} active={tab} onChange={setTab} compact face>
          {tab === 'Detail' && <DetailPage key={cur} rx={rx} row={rows[cur]} record={record} />}
        </PBTabs>
      </div>

      <div className="pb-row" style={{ padding: '2px 8px 4px', borderTop: '1px solid #d6d6d6', gap: 0 }}>
        <span>Created: {stamp(record)}</span>
        <span style={{ width: 24 }} />
        <span>Last Modified: {stamp(record, 'modify')}</span>
        <span className="pb-row__spacer" />
        {record?.id_encounter && <button className="pb-link">ENC# {record.id_encounter}</button>}
      </div>
    </>
  )
}

function DetailPage({ rx, row, record }: { rx: boolean; row?: Med; record?: MoisRecord }) {
  return (
    <div className="pb-medication-detail" style={{ display: 'flex', gap: 8, padding: '6px 8px', alignItems: 'flex-start', minWidth: 0 }}>
      <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '78px 1fr', flex: '1 1 auto', minWidth: 0, alignItems: 'start' }}>
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>ATC Code:</span>
        <div className="pb-row">
          <PBInput w={84} defaultValue={record?.str_atc_code ?? ''} />
          <span style={{ marginLeft: 8 }}>{rx ? 'Ordered By:' : 'Started By:'}</span>
          <PBLookup w={206} defaultValue={record?.str_order_by ?? ''} />
        </div>

        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Generic Name:</span>
        <PBTextArea key={row?.med} rows={2} w="100%" defaultValue={row?.generic ?? ''} />

        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Indication:</span>
        <PBLookup w="100%" />

        <span className="pb-form__label" style={{ lineHeight: '14px' }}>
          {rx ? <>Comment:<br /><br />Printed on<br />Prescription</> : <>Instructions:<br /><br />(copied to<br />prescriptions)</>}
        </span>
        <PBTextArea rows={6} w="100%" defaultValue={record?.str_comment ?? ''} />

        <span className="pb-form__label" style={{ lineHeight: '14px' }}>Office Note<br />(not Printed):</span>
        <PBTextArea rows={2} w="100%" defaultValue={record?.str_office_note ?? ''} />

        {rx && <><span className="pb-form__label">Last Printed:</span><span /></>}
      </div>

      {/* the instruction flags sit in their own column on the right */}
      <div style={{ width: 290, flex: 'none' }}>
        <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '68px 1fr', gap: '0px 6px' }}>
          <span className="pb-form__label">Instructions:</span>
          <div className="pb-row" style={{ gap: 12 }}>
            <PBCheckbox label="Do Not Substitute" checked={record?.str_no_substitute === 'Y'} />
            <PBCheckbox label="Do Not Adapt" checked={record?.str_do_not_adapt === 'Y'} />
          </div>
          <span className="pb-form__label">PRN:</span>
          <PBCheckbox label="(when necessary)" checked={record?.str_prn === 'Y'} />
          {rx && (
            <>
              <span className="pb-form__label">Repeat:</span>
              <div className="pb-row">
                <PBCheckbox /><PBInput w={46} /><span style={{ fontWeight: 700 }}>&#10007;</span>
              </div>
            </>
          )}
        </div>
        {!rx && <div className="pb-groupbox" style={{ marginTop: 24, minHeight: 126 }}>
          <PBBand>Dose Detail</PBBand>
          <div style={{ padding: '4px 12px', fontFamily: 'var(--pb-font-mono)', whiteSpace: 'pre-wrap' }}>{row?.dose ?? ''}</div>
        </div>}
      </div>
    </div>
  )
}

/* ============================================================================
   `Prescription Print Hx` — the chart view that appears under Prescriptions
   once e-signatures are on. The only tabbed window in this family.

   The previous version of this function invented a `Prescription Print History`
   window with Printed / Medication / Printed By / Copies. That matches neither
   real surface. The other one is the `Prescription History` modal reached from
   the `View Print History` link in the Rx footer, which is a different window
   again (Date Printed | Printed By over CDIC | MEDICATION | DOSE/FREQ | AMOUNT,
   one `Reprint Prescription` button) and is not modelled here.

   A reprint appends a row with Version = Copy; the original reads Original.
   ========================================================================= */

export function PrintHistoryView() {
  /* an exported chart has no print history in the export, so it is empty
     rather than showing another patient's reprints */
  const exportedPrintHx = useChartRows('printhx')
  const patient = usePatient()
  const [tab, setTab] = useState('Prescription Items')
  const [cur, setCur] = useState(0)
  return (
    <>
      <PBViewHeader title="Prescription Print Hx" />
      <PBCommandRow commands={[{ label: 'Refresh' }, { label: 'Preview' }]} />
      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: patient.dob },
        ]}
      />
      <div style={{ padding: '0 3px', height: 150, display: 'flex' }}>
        <PBDataWindow
          rows={exportedPrintHx}
          current={cur}
          onCurrentChange={setCur}
          columns={[
            { key: 'by', header: 'Created By', width: 160 },
            { key: 'created', header: 'Create Date & Time', width: 140, align: 'center' },
            { key: 'signed', header: 'Signed', width: 52, align: 'center' },
            { key: 'method', header: 'Method', width: 66, align: 'center' },
            { key: 'mby', header: 'By', width: 160 },
            { key: 'mwhen', header: 'Date & Time', width: 140, align: 'center' },
            { key: 'version', header: 'Version', width: 70, align: 'center' },
          ]}
        />
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 4, padding: '4px 3px 3px' }}>
        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex' }}>
          <PBTabs
            tabs={['Prescription Items', 'Distribution']}
            active={tab}
            onChange={setTab}
            compact
          >
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
              <PBDataWindow
                /* the Distribution tab exists in the capture but is never the
                   active tab anywhere in the corpus, so its columns are unknown */
                rows={[]}
                columns={[
                  { key: 'code', header: 'Code', width: 90 },
                  { key: 'med', header: 'Medication' },
                  { key: 'dose', header: 'Dose / Frequency', width: 180, align: 'center' },
                  { key: 'amount', header: 'Amount', width: 90, align: 'center' },
                ]}
                empty={tab === 'Distribution' ? 'Not captured in the manual.' : undefined}
              />
            </div>
          </PBTabs>
        </div>

        <div style={{ width: 190, display: 'flex', flexDirection: 'column' }}>
          <PBBand>Workflow Summary</PBBand>
          <div className="pb-form" style={{ gridTemplateColumns: '1fr', padding: '6px 8px', gap: 4 }}>
            <span>Messages: 0</span>
            <span>Tasks: 0</span>
            <span>Acknowledgements: 0</span>
            <button className="pb-link" style={{ textAlign: 'left' }}>View Detail...</button>
          </div>
        </div>
      </div>
    </>
  )
}
