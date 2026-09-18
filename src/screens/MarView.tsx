import { useState } from 'react'
import {
  PBButton, PBCommandRow, PBDataWindow, PBDropDownDataWindow, PBIdentityStrip,
  PBInput, PBLookup, PBPatientBannerBlue, PBSelect, PBTextArea, PBViewHeader,
  PBWindow, type PBColumn,
} from '../pb'
import { adminSites, marRows, patient } from '../data/mois'

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
  const [open, setOpen] = useState(false)
  const [cur, setCur] = useState(0)

  return (
    <>
      <PBViewHeader title="MAR" />
      <PBCommandRow
        commands={[
          { label: 'New Record', onClick: () => setOpen(true) },
          { label: 'Delete Record' }, { label: 'Save', disabled: true },
          { label: 'Undo', disabled: true }, { label: 'Refresh' }, { label: 'Print' },
        ]}
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
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 3px 3px' }}>
        <PBDataWindow
          columns={columns}
          rows={marRows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={() => setOpen(true)}
          empty="No medication administrations recorded."
        />
      </div>

      {open && <MarDetailDialog onClose={() => setOpen(false)} />}
    </>
  )
}

/* --- Medication Administration Detail Record ----------------------------- */
export function MarDetailDialog({ onClose }: { onClose: () => void }) {
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
            { label: 'CHART NO.', value: '87297', w: 92 },
            { label: 'PATIENT (F/M/L)', value: patient.full, w: 220 },
            { label: 'DATE OF BIRTH', value: '1986.12.19', w: 150 },
            { label: 'GENDER', value: patient.sex, w: 74 },
            { label: 'BC HEALTH NO.', value: '666666667' },
          ]}
          bottom={[
            { label: 'SCHEDULED', value: '2025.10.08   10:47' },
          ]}
        />

        <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff' }}>
          <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
            <div className="pb-form" style={{ gridTemplateColumns: '104px 1fr', padding: '6px 8px', flex: '1 1 auto', minWidth: 0, alignItems: 'start' }}>
              <span className="pb-form__label">Ordered By:</span><PBLookup w="100%" />
              <span className="pb-form__label">Scheduled Start:</span><PBInput w={130} align="center" />

              <span className="pb-form__full"><div className="pb-hrule" /></span>

              <span className="pb-form__label">Action:</span><PBSelect options={['', 'GIVEN', 'HELD', 'REFUSED']} w={170} />
              <span className="pb-form__label">Date / Time:</span>
              <div className="pb-row"><PBInput w={104} align="center" /><PBInput w={64} align="center" /></div>
              <span className="pb-form__label">Given By:</span><PBLookup w="100%" />

              <span className="pb-form__full"><div className="pb-hrule" /></span>

              <span className="pb-form__label">Medication:</span><PBLookup w="100%" />
              <span className="pb-form__label">Lot Number:</span><PBInput w={170} />
              <span className="pb-form__label" style={{ alignSelf: 'start', paddingTop: 2 }}>Details:</span>
              <PBTextArea rows={3} w="100%" />
              <span className="pb-form__label">Route:</span><PBSelect options={['', 'IM', 'SC', 'PO', 'IV']} w={170} />
              <span className="pb-form__label">Site:</span>
              <PBDropDownDataWindow
                w={230}
                columns={[{ key: 'site', header: 'Site', width: 86 }, { key: 'desc', header: 'Description' }]}
                rows={adminSites}
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
            <PBSelect options={['AS PRESCRIBED (NON-IMMUNIZATIONS)', 'IMMUNIZATION']} w={230} />
            <span className="pb-form__label">Informed Consent:</span>
            <PBSelect options={['YES', 'NO']} w={230} />
            <span className="pb-form__label">Form of Consent:</span>
            <PBSelect options={['IN PERSON', 'WRITTEN', 'VERBAL']} w={230} />
            <span className="pb-form__label">Consented By:</span>
            <PBSelect options={['CLIENT', 'GUARDIAN', 'SUBSTITUTE']} w={230} />
            <span className="pb-form__label" style={{ lineHeight: '14px' }}>Client Facility /<br />Worksite:</span>
            <PBLookup w={230} />
            <span className="pb-form__label">Client Employee ID:</span>
            <PBInput w={230} />
          </div>

          <div className="pb-row" style={{ padding: '2px 8px 6px', gap: 0 }}>
            <span>Created:&nbsp;&nbsp;&nbsp;&nbsp;2025.10.08&nbsp; 10:48&nbsp; JORGENSON, ELLA</span>
            <span className="pb-row__spacer" />
            <button className="pb-link">ENC# 533920</button>
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
