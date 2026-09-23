import type { MoisRecord } from '../data/charts/types'
import { date } from '../data/charts/relations'
import { legacyDynamicFormTitle, savedDynamicFormSections } from '../data/legacy-dynamic-forms'
import { usePatient } from '../data/patient-context'
import { PBButton, PBInput, PBTextArea, PBWindow } from '../pb'
import './legacy-dynamic-form.css'

/** Read-only reconstruction of an exported native MOIS Dynamic Form instance. */
export function LegacyDynamicFormWindow({ header, records, onClose }: {
  header: MoisRecord
  records: MoisRecord[]
  onClose: () => void
}) {
  const patient = usePatient()
  const sections = savedDynamicFormSections(header, records)
  const title = legacyDynamicFormTitle(header.id_dform_window)
  const answered = sections.reduce((count, section) => count + section.fields.filter((field) => field.value !== '').length, 0)

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', padding: 8, zIndex: 91 }}>
      <PBWindow
        title={title.toUpperCase()}
        child
        controls={false}
        onClose={onClose}
        tutorialId="host.mois.window.dynamic-form"
        className="pb-legacy-dform"
        style={{ width: 'min(1000px, 100%)', height: 'min(840px, 100%)' }}
      >
        <div className="pb-legacy-dform__patient">
          <span>CHART NO.<strong>{patient.chart}</strong></span>
          <span>PATIENT (F/M/L)<strong>{[patient.first, patient.middle, patient.last].filter(Boolean).join(' ').toUpperCase()}</strong></span>
          <span>DATE OF BIRTH<strong>{patient.dob ?? ''}</strong></span>
        </div>
        <div className="pb-legacy-dform__metadata">
          <label>Form Date: <PBInput value={date(header.dtm_form)} readOnly w={100} /></label>
          <label>This form was created by: <PBInput value={header.stp_user_create ?? ''} readOnly w={220} /></label>
          <label>Provider: <PBInput value={header.id_provider && header.id_provider !== '-1' ? header.id_provider : ''} readOnly w={135} /></label>
          <span>Last Modified: {header.stp_date_modify ?? ''}</span>
        </div>
        <div className="pb-legacy-dform__body">
          <p className="pb-legacy-dform__provenance">
            Exported MOIS record · {answered} answered field{answered === 1 ? '' : 's'} · read only
          </p>
          {sections.length ? sections.map((section) => (
            <section key={section.id} className="pb-legacy-dform__section">
              <h2>{section.title}</h2>
              {section.fields.map((field) => (
                <label key={field.id} className="pb-legacy-dform__field">
                  <span>{field.label}</span>
                  {field.value.includes('\n') || field.value.length > 90 ? (
                    <PBTextArea value={field.value} readOnly rows={3} aria-label={field.label} />
                  ) : (
                    <PBInput value={field.value} readOnly aria-label={field.label} />
                  )}
                </label>
              ))}
            </section>
          )) : <p className="pb-legacy-dform__provenance">No field rows were included in this chart export.</p>}
        </div>
        <div className="pb-legacy-dform__footer">
          <PBButton disabled>Save Form</PBButton>
          <PBButton onClick={onClose}>Close Form</PBButton>
        </div>
      </PBWindow>
    </div>
  )
}
