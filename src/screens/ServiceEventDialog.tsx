import { useState } from 'react'
import {
  PBBand, PBButton, PBDataWindow, PBGroupBox, PBInput, PBLookup, PBPatientBannerBlue,
  PBSelect, PBTabs, PBTextArea, PBWindow,
} from '../pb'
import { linkedOrderRows, patient, serviceHealthIssueRows } from '../data/mois'

export function ServiceEventDialog({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState('Service Event')

  return (
    <div className="pb-modal-layer">
      <PBWindow
        child
        controls={false}
        title="Patient Service Event"
        onClose={onClose}
        style={{ width: 930, height: 660 }}
      >
        <PBPatientBannerBlue
          top={[
            { label: 'CHART NO.', value: patient.chart, w: 92 },
            { label: 'PATIENT (F/M/L)', value: patient.full, w: 236 },
            { label: 'DATE OF BIRTH', value: <>{patient.dob}&nbsp;&nbsp;{patient.age}</>, w: 208 },
            { label: 'GENDER', value: patient.sex, w: 74 },
            { label: 'BC HEALTH NO.', value: patient.bchn, w: 176 },
            { label: 'PREFERRED PHONE NUMBER', value: <>{patient.phone}&nbsp;&nbsp;<span style={{ fontWeight: 400, fontSize: 11 }}>Home Phone</span></> },
          ]}
          bottom={[
            { label: 'DATE', value: '2026.08.10', w: 92 },
            { label: 'TIME', value: '14 : 00', w: 70 },
            { label: 'VISIT', value: 'R', w: 52 },
            { label: 'ATTENDING', value: 'FAKERRY, FAKER', w: 152 },
            { label: 'SERVICE LOCATION', value: 'ACROPOLIS MANOR', w: 240 },
            { label: 'APPOINTMENT NOTE', value: 'TEST 3' },
          ]}
        />

        {/* ---- Service Episode Detail ---- */}
        <PBBand>Service Episode Detail</PBBand>
        <div style={{ display: 'flex', padding: '6px 8px 8px', gap: 0, background: '#fff', flex: 'none' }}>
          <div className="pb-form" style={{ padding: 0, width: 452, flex: 'none', gridTemplateColumns: '96px 1fr' }}>
            <span className="pb-form__label">Start Date:</span>
            <PBInput w={92} align="center" defaultValue="2026.08.10" />

            <span className="pb-form__label pb-form__label--dim">Service Episode:</span>
            <PBInput defaultValue="PRENATAL CARE" disabled />

            <span className="pb-form__label">Service MRP:</span>
            <PBLookup defaultValue="TECHNICAL SUPPORT" />

            <span className="pb-form__label pb-form__label--right">As a Member Of:</span>
            <PBLookup w={300} />

            <span className="pb-form__label" style={{ alignSelf: 'start', paddingTop: 2 }}>General Note</span>
            <PBTextArea rows={4} w={300} />
          </div>

          <div className="pb-form" style={{ padding: 0, flex: '1 1 auto', minWidth: 0, gridTemplateColumns: '84px 1fr', alignItems: 'start' }}>
            <span className="pb-form__label" style={{ lineHeight: '19px' }}>Stop Date:</span>
            <PBInput w={92} align="center" defaultValue="2026.08.12" />

            <span className="pb-form__label" style={{ lineHeight: '19px' }}>Stop Reason:</span>
            <PBLookup disabled />

            <span className="pb-form__label" style={{ lineHeight: '19px' }}>Stop Note:</span>
            <PBTextArea rows={3} w="100%" />
          </div>
        </div>

        {/* ---- tabbed section ---- */}
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '2px 4px 0' }}>
          <PBTabs
            tabs={['Service Event', `Linked Orders (${linkedOrderRows.length})`]}
            active={tab}
            onChange={setTab}
            compact
            face
          >
            {tab === 'Service Event' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 4, minHeight: 0, flex: '1 1 auto' }}>
                <PBGroupBox title="Current Service Event">
                  <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '96px 1fr' }}>
                    <span className="pb-form__label">Service Phase:</span>
                    <PBSelect options={['One Time', 'Initiation', 'Maintenance', 'Completion']} w={108} />
                    <span className="pb-form__label">Service Event:</span>
                    <PBLookup w={362} defaultValue="REMOVAL OF EAR CANAL OSTEOMA" />
                  </div>
                </PBGroupBox>

                <div className="pb-groupbox" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <PBBand>Health Issues for Service Event</PBBand>
                  <div className="pb-cmdrow" style={{ padding: 2, background: 'var(--pb-band-alt)' }}>
                    <button className="pb-cmdrow__btn" style={{ minWidth: 104 }}>New Health Issue</button>
                    <button className="pb-cmdrow__btn" style={{ minWidth: 112 }}>Delete Health Issue</button>
                  </div>
                  <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                    <PBDataWindow
                      flush
                      columns={[
                        { key: 'issue', header: 'Health Issue', width: 460 },
                        { key: 'd', header: '', dots: true },
                        { key: 'certainty', header: 'Certainty', width: 120 },
                        { key: 'blank', header: '' },
                      ]}
                      rows={serviceHealthIssueRows}
                      empty="No health issues linked to this service event."
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto', padding: 4 }}>
                <div className="pb-cmdrow" style={{ paddingBottom: 3 }}>
                  <button className="pb-cmdrow__btn">Manage…</button>
                </div>
                <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                  <PBDataWindow
                    rows={linkedOrderRows}
                    columns={[
                      { key: 'date', header: 'Order Date', width: 100, align: 'center' },
                      { key: 'by', header: 'Ordered By', width: 136, align: 'center' },
                      { key: 'to', header: 'Order To', width: 148, align: 'center' },
                      {
                        key: 'desc', header: 'Description',
                        render: (r) => <button className="pb-link">{r.desc}</button>,
                      },
                    ]}
                    empty="No orders linked to this service event."
                  />
                </div>
              </div>
            )}
          </PBTabs>
        </div>

        <div className="pb-footer">
          <PBButton wide>Change <u>L</u>inked Service Episode…</PBButton>
          <span className="pb-footer__spacer" />
          <PBButton wide onClick={onClose}><u>S</u>ave</PBButton>
          <PBButton wide onClick={onClose}><u>C</u>ancel</PBButton>
          <span className="pb-footer__spacer" />
          <PBButton wide>View <u>H</u>istory…</PBButton>
        </div>
      </PBWindow>
    </div>
  )
}
