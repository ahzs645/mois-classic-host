import { Fragment, useEffect, useState } from 'react'
import {
  PBButton, PBCheckbox, PBDropDownDataWindow, PBGroup, PBGroupBox, PBTextArea, PBWindow,
} from '../pb'
import {
  administrativeGenderRows, genderDescription, genderDesignationColumns, genotypicGenderColumns,
  genotypicGenderRows, preferredGenderRows, type GenderDesignationRow,
} from '../data/mois'
import { usePatient } from '../data/patient-context'
import { updatePatient } from '../data/patient-edits'
import type { Patient } from '../data/patients'

/* ============================================================================
   Advanced Gender Designations — the window the `.*.` beside Gender opens.

   MOIS keeps three designations on a chart: the administrative gender it
   bills and reports on (`tdt_chart.gender`, the one the Gender field itself
   shows), the patient's preferred gender, and their genotypic gender. Each
   carries its own "Include on Demographics" flag, and a chart that has more
   than one is why the Gender label is painted yellow on Patient Summary.

   Each row drops its own list, and the three lists differ — see
   `data/mois.tsx`. The field shows the description; the code is what the
   chart stores.

   PROVENANCE: `reference/advanced-gender-designations.png`, with the three
   dropped lists in `reference/advanced-gender-*-list.png`. Every measurement
   below is that capture halved, the way the rest of the kit reads the 2x
   training-environment screenshots.
   ========================================================================= */

/** The window MOIS paints: 496 x 346, with only a close box on the frame.
    The height carries 12px the capture does not: the kit's field row is 19px
    against MOIS's 16, and three designations plus the group border is what
    that costs. Every other measurement here is the capture's. */
const DIALOG_W = 496
const DIALOG_H = 358

/** 111px of label, a 132px field, then the checkbox 5px past it. */
const LABEL_COL = 111
const FIELD_W = 132
/** the dropped list is painted at twice the field's width */
const LIST_W = 262

type DesignationKey = 'administrative' | 'preferred' | 'genotypic'

type Designation = {
  key: DesignationKey
  label: string
  rows: GenderDesignationRow[]
  columns: typeof genderDesignationColumns
}

const DESIGNATIONS: Designation[] = [
  {
    key: 'administrative', label: 'Administrative Gender:',
    rows: administrativeGenderRows, columns: genderDesignationColumns,
  },
  {
    key: 'preferred', label: 'Preferred Gender:',
    rows: preferredGenderRows, columns: genderDesignationColumns,
  },
  {
    key: 'genotypic', label: 'Genotypic Gender:',
    rows: genotypicGenderRows, columns: genotypicGenderColumns,
  },
]

export function AdvancedGenderDialog({ onClose }: { onClose: () => void }) {
  const patient = usePatient()
  const held = patient.genderDesignations

  /* Edit a copy, then apply it to the chart-scoped in-memory preview. */
  const [codes, setCodes] = useState<Record<DesignationKey, string>>({
    administrative: patient.gender,
    preferred: held?.preferred ?? '',
    genotypic: held?.genotypic ?? '',
  })
  const [shown, setShown] = useState<Record<DesignationKey, boolean>>({
    administrative: !!held?.onDemographics?.includes('administrative'),
    preferred: !!held?.onDemographics?.includes('preferred'),
    genotypic: !!held?.onDemographics?.includes('genotypic'),
  })
  const [comment, setComment] = useState(held?.comment ?? '')

  const save = () => {
    updatePatient(patient.chart, { gender: codes.administrative as Patient['gender'], genderDesignations: {
      preferred: codes.preferred, genotypic: codes.genotypic, comment,
      onDemographics: DESIGNATIONS.filter(d => shown[d.key]).map(d => d.key),
    } }); onClose()
  }
  /* the button says (F2), and in MOIS it means it */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); save() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  return (
    <div className="pb-modal-layer">
      <PBWindow
        child
        controls={false}
        title="Advanced Gender Designations"
        onClose={onClose}
        style={{ width: DIALOG_W, height: DIALOG_H }}
      >
        {/* window face, then the one group box the dialog is built from. Its
            header band is taller here than the group bands on the chart
            windows, so the band token is overridden for this window only. */}
        <div style={{ flex: '1 1 auto', background: 'var(--pb-face)', padding: '19px 18px 0 19px' }}>
          <PBGroupBox
            title="Update Patient Gender"
            pad={false}
            style={{ ['--pb-band-h' as string]: '26px' }}
          >
            <div style={{ padding: '8px 9px 12px' }}>
              <PBGroup title="Gender Designations">
                <div
                  className="pb-form"
                  style={{
                    padding: '2px 0 3px',
                    gridTemplateColumns: `${LABEL_COL}px 1fr`,
                    /* the label column is the painted tab stop, so the grid
                       adds nothing between it and the field */
                    columnGap: 0,
                    ['--pb-row-gap' as string]: '2px',
                  }}
                >
                  {DESIGNATIONS.map((d) => (
                    <Fragment key={d.key}>
                      <span className="pb-form__label">{d.label}</span>
                      <div className="pb-row">
                        <PBDropDownDataWindow
                          w={FIELD_W}
                          listW={LIST_W}
                          columns={d.columns}
                          rows={d.rows}
                          display="description"
                          value={genderDescription(d.rows, codes[d.key])}
                          onSelect={(row) => setCodes((c) => ({ ...c, [d.key]: row.gender }))}
                        />
                        <PBCheckbox
                          label="Include on Demographics"
                          checked={shown[d.key]}
                          onChange={(v) => setShown((s) => ({ ...s, [d.key]: v }))}
                        />
                      </div>
                    </Fragment>
                  ))}
                </div>
              </PBGroup>

              {/* the comment is the audit trail for the change, and it is not
                  a field in a form: caption above, box the width of the group */}
              <div style={{ marginTop: 11 }}>Comment:</div>
              <PBTextArea
                w="100%"
                style={{ height: 86, marginTop: 4 }}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </PBGroupBox>
        </div>

        <div className="pb-footer" style={{ padding: '11px 9px 14px', justifyContent: 'center' }}>
          <PBButton
            style={{ width: 91 }}
            data-tutorial-id="host.mois.command.save-gender-designations"
            onClick={save}
          >
            Save / Close (F2)
          </PBButton>
        </div>
      </PBWindow>
    </div>
  )
}
