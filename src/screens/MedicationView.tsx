import { useState } from 'react'
import {
  PBBand, PBCheckbox, PBCommandRow, PBDataWindow, PBIdentityStrip, PBInput,
  PBLookup, PBTabs, PBTextArea, PBViewHeader, type PBColumn,
} from '../pb'
import { usePatient } from '../data/patient-context'
import { longTermMedRows, prescriptionRows } from '../data/mois'

/* ============================================================================
   Rx - Prescription and Long Term Medications are one window family: same
   grid shape, same Detail/CPP tab pair, same instruction checkbox block.
   Transcribed from the evidence captures for tdt_prescription and
   tdt_medication_lt.
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
  const [tab, setTab] = useState('Detail')
  const [cur, setCur] = useState(0)
  const rows = rx ? prescriptionRows : longTermMedRows

  return (
    <>
      <PBViewHeader title={rx ? 'Rx - Prescription' : 'Long Term Medications'} />
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
                { label: 'New' }, { label: 'Rx Favourite' }, { label: 'Delete' },
                { label: 'Save', disabled: true }, { label: 'Undo', disabled: true },
                { label: 'Refresh' }, { label: 'Duplicate' }, { label: 'Renew' },
                { label: 'Attachment' }, { label: 'Print Rx' }, { label: 'Review' },
                { label: 'No Known' },
              ]
        }
      />

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
        <span>Search For:</span><PBLookup w="100%" />
      </div>

      {/* the long-term list carries a review banner above the grid */}
      {!rx && (
        <div style={{ padding: '2px 8px 3px', flex: 'none' }}>
          Long Term Medications have not been reviewed for this patient
        </div>
      )}

      <div style={{ padding: '0 3px', height: 186, display: 'flex' }}>
        <PBDataWindow
          columns={rx ? RX_COLUMNS : LTM_COLUMNS}
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
        />
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '4px 3px 0' }}>
        <PBTabs tabs={['Detail', 'CPP']} active={tab} onChange={setTab} compact>
          {tab === 'Detail' ? <DetailPage rx={rx} row={rows[cur]} /> : <CppPage />}
        </PBTabs>
      </div>

      <div className="pb-row" style={{ padding: '2px 8px 4px', borderTop: '1px solid #d6d6d6', gap: 0 }}>
        <span>Created:&nbsp;&nbsp;&nbsp;2026.07.06&nbsp; 09:29&nbsp;&nbsp; (RN) MACDONALD, TERESA</span>
        <span style={{ width: 24 }} />
        <span>Last Modified: 2026.07.06&nbsp; 09:30&nbsp; (RN) MACDONALD, TERESA</span>
        <span className="pb-row__spacer" />
        <button className="pb-link">ENC# EMPTY</button>
      </div>
    </>
  )
}

function DetailPage({ rx, row }: { rx: boolean; row?: Med }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '6px 8px', alignItems: 'flex-start' }}>
      <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '92px 1fr', flex: '1 1 auto', minWidth: 0, alignItems: 'start' }}>
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>ATC Code:</span>
        <div className="pb-row">
          <PBInput w={92} defaultValue={rx ? 'J01DD04' : 'A10AE04'} />
          <span style={{ marginLeft: 12 }}>{rx ? 'Ordered By:' : 'Started By:'}</span>
          <PBLookup w={230} defaultValue={rx ? 'PH PHRN 3 PRG' : 'ROSS, ADRIENNE (NHVC)'} />
        </div>

        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Generic Name:</span>
        <PBTextArea key={row?.med} rows={2} w="100%" defaultValue={row?.generic ?? ''} />

        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Indication:</span>
        <PBLookup w="100%" />

        <span className="pb-form__label" style={{ lineHeight: '14px' }}>
          {rx ? <>Comment:<br /><br />Printed on<br />Prescription</> : <>Instructions:<br /><br />(copied to<br />prescriptions)</>}
        </span>
        <PBTextArea rows={6} w="100%" />

        <span className="pb-form__label" style={{ lineHeight: '14px' }}>Office Note<br />(not Printed):</span>
        <PBTextArea rows={2} w="100%" defaultValue={rx ? '' : 'SEE ORDER ATTACHED'} />

        {rx && <><span className="pb-form__label">Last Printed:</span><span /></>}
      </div>

      {/* the instruction flags sit in their own column on the right */}
      <div style={{ width: 236, flex: 'none' }}>
        <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '68px 1fr', gap: '4px 6px' }}>
          <span className="pb-form__label">Instructions:</span>
          <div className="pb-row" style={{ gap: 12 }}>
            <PBCheckbox label="Do Not Substitute" checked={rx} />
            <PBCheckbox label="Do Not Adapt" />
          </div>
          <span className="pb-form__label">PRN:</span>
          <PBCheckbox label="(when necessary)" />
          {rx && (
            <>
              <span className="pb-form__label">Repeat:</span>
              <div className="pb-row">
                <PBCheckbox /><PBInput w={46} /><span style={{ fontWeight: 700 }}>&#10007;</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* CPP — the cumulative patient profile entry this medication contributes to */
function CppPage() {
  return (
    <div className="pb-form" style={{ gridTemplateColumns: '116px 1fr', padding: '8px 10px', alignItems: 'start' }}>
      <span className="pb-form__label" style={{ lineHeight: '19px' }}>On CPP:</span>
      <PBCheckbox label="Include this medication on the Cumulative Patient Profile" />
      <span className="pb-form__label" style={{ lineHeight: '19px' }}>CPP Sort Order:</span>
      <PBInput w={64} align="center" />
      <span className="pb-form__label" style={{ lineHeight: '19px' }}>CPP Heading:</span>
      <PBLookup w={300} />
      <span className="pb-form__label" style={{ lineHeight: '19px' }}>CPP Note:</span>
      <PBTextArea rows={6} w="100%" />
    </div>
  )
}

export function PrintHistoryView() {
  const patient = usePatient()
  return (
    <>
      <PBViewHeader title="Prescription Print History" />
      <PBCommandRow commands={[{ label: 'Refresh' }, { label: 'Print' }]} />
      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: '2025.01.01' },
        ]}
      />
      <PBBand>Print History</PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 3px 3px' }}>
        <PBDataWindow
          rows={[]}
          columns={[
            { key: 'printed', header: 'Printed', width: 130, align: 'center' },
            { key: 'med', header: 'Medication' },
            { key: 'by', header: 'Printed By', width: 170 },
            { key: 'copies', header: 'Copies', width: 62, align: 'center' },
          ]}
          empty="Nothing printed for this patient."
        />
      </div>
    </>
  )
}
