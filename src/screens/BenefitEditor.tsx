import { useState } from 'react'
import { usePatient } from '../data/patient-context'
import {
  PBButton, PBCheckbox, PBInput, PBMessageBox, PBPatientBannerBlue, PBSection,
  PBTextArea, PBWindow,
} from '../pb'


/* "Edit Benefit Source / Service" — a child window built from rule-separated
   sections rather than nested group boxes, with the audit stamps greyed at
   the foot. Saving raises the MOIS Data Audit message box. */
export function BenefitEditor({ onClose }: { onClose: () => void }) {
  const patient = usePatient()
  const [asking, setAsking] = useState(false)

  return (
    <div className="pb-modal-layer">
      <PBWindow
        child
        controls={false}
        title="Edit Benefit Source / Service"
        onClose={onClose}
        style={{ width: 516, height: 596 }}
      >
        <PBPatientBannerBlue
          top={[
            { label: 'CHART NO.', value: patient.chart, w: 88 },
            { label: 'PATIENT (F/M/L)', value: patient.full, w: 196 },
            { label: 'DATE OF BIRTH', value: <>{patient.dob}&nbsp;&nbsp;{patient.age}</>, w: 152 },
            { label: 'GENDER', value: patient.sex },
          ]}
          bottom={[]}
        />

        <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff' }}>
          <PBSection>
            <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '104px 1fr', alignItems: 'start' }}>
              <span className="pb-form__label" style={{ lineHeight: '19px' }}>Source:</span>
              <b style={{ lineHeight: '19px' }}></b>

              <span className="pb-form__label" style={{ lineHeight: '19px' }}>Patient ID:</span>
              <div className="pb-row">
                <PBInput w={190} value="" readOnly />
                <span style={{ marginLeft: 10 }}>ID Type:</span>
                <PBInput w={124} defaultValue="" />
              </div>

              <span className="pb-form__label" style={{ lineHeight: '14px' }}>Source Contact<br />Info:</span>
              <PBTextArea rows={2} w="100%" defaultValue="" />

              <span className="pb-form__label" style={{ lineHeight: '19px' }}>Source Note:</span>
              <PBTextArea rows={3} w="100%" defaultValue="" />
            </div>
          </PBSection>

          <PBSection>
            <div className="pb-row">
              <span className="pb-form__label" style={{ width: 104 }}>Service:</span>
              <b></b>
            </div>
          </PBSection>

          <PBSection title="Enrollment">
            <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '104px 1fr' }}>
              <span className="pb-form__label">Start Date:</span>
              <PBInput w={106} align="center" defaultValue="" />
              <span className="pb-form__label">Stop Date:</span>
              <PBInput w={106} align="center" />
            </div>
          </PBSection>

          <PBSection title="Coverage">
            <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '104px 1fr' }}>
              <span className="pb-form__label">Description:</span>
              <PBInput w="100%" />
              <span className="pb-form__label">Deductible:</span>
              <PBInput w={106} align="right" />
            </div>
          </PBSection>

          <PBSection>
            <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '104px 1fr' }}>
              <span className="pb-form__label">Other:</span>
              <PBCheckbox label="Include on Demographics" />
              <span />
              <PBCheckbox label="Include on Care Plan Summary" />
            </div>
          </PBSection>

          <PBSection>
            <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '104px 1fr', alignItems: 'start' }}>
              <span className="pb-form__label" style={{ lineHeight: '19px' }}>Note:</span>
              <PBTextArea rows={3} w="100%" defaultValue="" />
            </div>
          </PBSection>

          <div style={{ padding: '6px 10px', color: 'var(--pb-text-dim)' }}>
            <div>Record Created:</div>
            <div>Last Modified:</div>
          </div>
        </div>

        <div className="pb-footer">
          <span className="pb-footer__spacer" />
          <PBButton wide onClick={() => setAsking(true)}>Save</PBButton>
          <PBButton wide onClick={onClose}>Cancel</PBButton>
        </div>
      </PBWindow>

      {asking && (
        <PBMessageBox
          title="Register Table - Field"
          icon="info"
          buttons={[{ label: 'Yes', value: 'yes', default: true }, { label: 'No', value: 'no' }]}
          onClose={(v) => { setAsking(false); if (v !== 'cancel') onClose() }}
        >
          Would you like to register this field with the MOIS Data Audit Service?
        </PBMessageBox>
      )}
    </div>
  )
}
