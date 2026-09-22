import { useState } from 'react'
import { useChartRows, useNodeRecords } from '../data/chart-records'
import type { MoisRecord } from '../data/charts'
import { stamp } from '../data/charts/detail'
import { adminSites } from '../data/mois'
import { usePatient } from '../data/patient-context'
import {
  PBButton, PBCommandRow, PBDataWindow, PBDropDownDataWindow, PBIdentityStrip,
  PBInput, PBLookup, PBPatientBannerBlue, PBSelect, PBTextArea, PBViewHeader,
  PBWindow, type PBColumn,
} from '../pb'

/* MAR list, plus the Medication Administration Detail Record child window it
   opens. Transcribed from the tdt_mar evidence capture. */

const columns: PBColumn<Record<string, string>>[] = [
  { key: 'when', header: 'Date/Time', width: 120, align: 'center' },
  { key: 'by', header: 'Given By', width: 160 },
  { key: 'med', header: 'Medication' },
  { key: 'd', header: '', dots: true },
  { key: 'dosage', header: 'Dosage', width: 100, align: 'center' },
  { key: 'route', header: 'Route', width: 80, align: 'center' },
  { key: 'site', header: 'Site', width: 110, align: 'center' },
]

export function MarView() {
  /* a chart with a real export behind it lists its own records */
  const exportedRows = useChartRows('mar')
  const records = useNodeRecords('mar')
  const [creating, setCreating] = useState(false)
  const patient = usePatient()
  const [open, setOpen] = useState(false)
  const [cur, setCur] = useState(0)

  return (
    <>
      <PBViewHeader title="MAR" />
      <PBCommandRow
        commands={[
          { label: 'New Record', onClick: () => { setCreating(true); setOpen(true) } },
          { label: 'Delete Record' }, { label: 'Save', disabled: true },
          { label: 'Undo', disabled: true }, { label: 'Refresh' }, { label: 'Print' },
        ]}
      />
      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first },
          { label: 'MIDDLE:' },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: patient.dob },
        ]}
        encounter="NO ENCOUNTER"
      />
      <div className="pb-row" style={{ padding: '2px 8px' }}>
        <span>Search For:</span><PBLookup w="100%" />
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 3px 3px' }}>
        <PBDataWindow
          columns={columns}
          rows={exportedRows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={() => { setCreating(false); setOpen(true) }}
          empty="No medication administrations recorded."
        />
      </div>

      {open && <MarDetailDialog record={creating ? undefined : records[cur]} onClose={() => setOpen(false)} />}
    </>
  )
}

/* --- Medication Administration Detail Record ----------------------------- */
export function MarDetailDialog({ onClose, record }: { onClose: () => void; record?: MoisRecord }) {
  const patient = usePatient()
  return (
    <div className="pb-modal-layer">
      <PBWindow
        child
        title="Medication Administration Detail Record"
        onClose={onClose}
        style={{ width: 760, height: 630 }}
      >
        <PBPatientBannerBlue
          top={[
            { label: 'CHART NO.', value: patient.chart, w: 92 },
            { label: 'PATIENT (F/M/L)', value: patient.full, w: 220 },
            { label: 'DATE OF BIRTH', value: patient.dob, w: 150 },
            { label: 'GENDER', value: patient.sex, w: 74 },
            { label: 'BC HEALTH NO.', value: patient.bchn ?? '' },
          ]}
          bottom={[
            { label: 'SCHEDULED', value: record?.dtm_scheduled ?? '' },
          ]}
        />

        <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff' }}>
          <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
            <div className="pb-form" style={{ gridTemplateColumns: '104px 1fr', padding: '6px 8px', flex: '1 1 auto', minWidth: 0, alignItems: 'start' }}>
              <span className="pb-form__label">Ordered By:</span><PBLookup w="100%" />
              <span className="pb-form__label">Scheduled Start:</span><PBInput w={130} align="center" />

              <span className="pb-form__full"><div className="pb-hrule" /></span>

              <span className="pb-form__label">Action:</span><PBSelect defaultValue={record?.str_action_type ?? ''} options={['', record?.str_action_type ?? '', 'GIVEN', 'HELD', 'REFUSED']} w={170} />
              <span className="pb-form__label">Date / Time:</span>
              <div className="pb-row"><PBInput w={104} align="center" value={record?.dtm_admin_date?.replace(/\//g, '.') ?? ''} readOnly /><PBInput w={64} align="center" value={record?.dtm_admin_time ?? ''} readOnly /></div>
              <span className="pb-form__label">Given By:</span><PBLookup w="100%" value={record?.str_admin_by ?? ''} readOnly />

              <span className="pb-form__full"><div className="pb-hrule" /></span>

              <span className="pb-form__label">Medication:</span><PBLookup w="100%" value={record?.str_medication ?? ''} readOnly />
              <span className="pb-form__label">Lot Number:</span><PBInput w={170} value={record?.str_lot_number ?? ''} readOnly />
              <span className="pb-form__label" style={{ alignSelf: 'start', paddingTop: 2 }}>Details:</span>
              <PBTextArea rows={3} w="100%" />
              <span className="pb-form__label">Route:</span><PBSelect defaultValue={record?.str_route ?? ''} options={['', record?.str_route ?? '', 'IM', 'SC', 'PO', 'IV']} w={170} />
              <span className="pb-form__label">Site:</span>
              <PBDropDownDataWindow
                w={230}
                columns={[{ key: 'site', header: 'Site', width: 86 }, { key: 'desc', header: 'Description' }]}
                rows={adminSites} value={record?.str_site ?? ''}
                display="site"
              />
            </div>

            <span className="pb-vrule" style={{ margin: '6px 0' }} />

            <div className="pb-form" style={{ gridTemplateColumns: '78px 1fr', padding: '6px 8px', width: 320, flex: 'none', alignItems: 'start' }}>
              <span className="pb-form__label" style={{ lineHeight: '14px' }}>Administration<br />Note:</span>
              <PBTextArea rows={4} w="100%" />
              <span className="pb-form__label" style={{ lineHeight: '14px' }}>Preparation<br />Note:</span>
              <PBTextArea rows={3} w="100%" />
              <span className="pb-form__label" style={{ lineHeight: '14px' }}>Consent<br />Note:</span>
              <PBTextArea rows={3} w="100%" />
            </div>
          </div>

          <div style={{ padding: '2px 8px' }}><b>Other</b></div>
          <div className="pb-form" style={{ gridTemplateColumns: '104px 1fr', padding: '0 8px 6px', width: 420 }}>
            <span className="pb-form__label">Reason:</span>
            <PBSelect defaultValue={record?.str_reason_for_immun ?? ''} options={['', record?.str_reason_for_immun ?? '', 'AS PRESCRIBED (NON-IMMUNIZATIONS)', 'IMMUNIZATION']} w={230} />
            <span className="pb-form__label">Informed Consent:</span>
            <PBSelect defaultValue={record?.str_informed_consent ?? ''} options={['', record?.str_informed_consent ?? '', 'YES', 'NO']} w={230} />
            <span className="pb-form__label">Form of Consent:</span>
            <PBSelect defaultValue={record?.str_form_of_consent ?? ''} options={['', record?.str_form_of_consent ?? '', 'IN PERSON', 'WRITTEN', 'VERBAL']} w={230} />
            <span className="pb-form__label">Consented By:</span>
            <PBSelect defaultValue={record?.str_consented_by ?? ''} options={['', record?.str_consented_by ?? '', 'CLIENT', 'GUARDIAN', 'SUBSTITUTE']} w={230} />
            <span className="pb-form__label" style={{ lineHeight: '14px' }}>Client Facility /<br />Worksite:</span>
            <PBLookup w={230} />
            <span className="pb-form__label">Client Employee ID:</span>
            <PBInput w={230} />
          </div>

          <div className="pb-row" style={{ padding: '2px 8px 6px', gap: 0 }}>
            <span>Created: {stamp(record)}</span>
            <span className="pb-row__spacer" />
            {record?.id_encounter && <button className="pb-link">ENC# {record.id_encounter}</button>}
          </div>
        </div>

        <div className="pb-footer">
          <PBButton wide>Delete Record</PBButton>
          <span className="pb-footer__spacer" />
          <PBButton wide onClick={onClose}>Save and Close</PBButton>
          <PBButton wide onClick={onClose}>Close</PBButton>
        </div>
      </PBWindow>
    </div>
  )
}
