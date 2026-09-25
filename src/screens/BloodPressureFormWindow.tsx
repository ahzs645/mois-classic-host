import { useState, type CSSProperties, type ReactNode } from 'react'
import { date } from '../data/charts/relations'
import type { MoisRecord } from '../data/charts/types'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { PBButton, PBCheckbox, PBDropField, PBInput, PBTextArea, PBWindow } from '../pb'
import './legacy-dynamic-form.css'

/* ============================================================================
   BLOOD PRESSURE MEASUREMENT (v1) — dynamic form window 100.

   Opened by F4 (or the `…` right of the cell, in the newer build) in the
   Value field of a BLOOD PRESSURE (SYSTOLIC/DIASTOLIC) measure row. MOIS
   fills Form Date, "This form was created by" and Provider itself; Save Form
   writes `systolic/diastolic` back into the measure's Value, and F4 on that
   Value later reopens the saved instance.

   PROVENANCE:
     · manual article 303104 "Enter Blood Pressure", image `62132587030c…`
       (785×695 @1.00x — the whole window). Every x/y below is off this
       capture: title bar 0–22; blue patient band 22–90; the metadata strip
       90–137; `Last Modified:` 137–162; the form box x 6–766, y 162–553 with
       the scrollbar at 766–782; the navy footer (#005594) 657–695 with
       `Save Form` x 587–680 and `Close Form` x 685–778.
     · manual article 302837 images `46bf7ec59a57…` (Measures folder, the
       `…` right of Value) and `17afb92bdb38…` (the same window opened from
       that `…` in build v02.30.22 — identical layout, header now
       `Home Phone`).
     · field names and saved values: chart 87288 dform_header 10000483
       (id_dform_window 100, 2026/02/19) and its dform_data rows —
       num_field_0001 Systolic, num_field_0002 Diastolic, str_field_0003
       Patient State - Position, str_field_0004 Extension Level,
       str_field_0005 Patient Status - Exercise, str_field_0006 Instrument,
       str_field_0007 Blood Pressure - Cuff Size, str_field_0008 Blood
       Pressure - Location of measurement. The unlabelled str_field_0009
       (field order 30, between Diastolic and Position) is taken to be the
       Comment.
   Transcribed verbatim, MOIS's own typo included: the Instrument note reads
   "for the measurement of blood pressue.".

   Gaps: the drop-down lists behind Position, Exercise, Cuff size and
   Location are not shown in any capture, so those are editable drop fields
   whose arrow drops nothing. Defaults (Sitting / At Rest / blank / Right Arm)
   are the capture's; `Appropriate for age` is the only other cuff value the
   export carries. Provider and "created by" are drop-downs in MOIS too; here
   they are typeable.
   ========================================================================= */

const W = 785
const H = 695
const TITLEBAR_H = 22
const NAVY = '#000094'

/** the emulator's desktop user — the Day Book's default provider */
const DESKTOP_USER = 'TECHNICAL SUPPORT'

/** capture coordinates → position inside the form box (x 7, y 163) */
const at = (captureX: number, captureY: number): CSSProperties => ({
  position: 'absolute', left: captureX - 7, top: captureY - 163,
})

type Reading = {
  systolic: string
  diastolic: string
  comment: string
  position: string
  extension: string
  exercise: string
  instrument: string
  cuff: string
  location: string
}

const FIELD_OF: Record<string, keyof Reading> = {
  num_field_0001: 'systolic',
  num_field_0002: 'diastolic',
  str_field_0009: 'comment',
  str_field_0003: 'position',
  str_field_0004: 'extension',
  str_field_0005: 'exercise',
  str_field_0006: 'instrument',
  str_field_0007: 'cuff',
  str_field_0008: 'location',
}

const NEW_READING: Reading = {
  systolic: '', diastolic: '', comment: '',
  position: 'Sitting', extension: '', exercise: 'At Rest',
  instrument: '', cuff: '', location: 'Right Arm',
}

function readingFrom(header: MoisRecord | undefined, records: MoisRecord[] | undefined): Reading {
  if (!header) return { ...NEW_READING }
  const saved: Reading = { ...NEW_READING, position: '', exercise: '', location: '' }
  for (const row of records ?? []) {
    if (row.id_dform_header !== header.id_dform_header) continue
    const key = FIELD_OF[row.str_field_name ?? '']
    if (key) saved[key] = row.str_value ?? ''
  }
  return saved
}

/** `2026/02/19 10:18:51` → `2026.02.19 10:18:51` */
const stamp = (v?: string) => v?.replace(/\//g, '.') ?? ''

function Caption({ style, children }: { style: CSSProperties; children: ReactNode }) {
  return <div style={{ ...style, color: NAVY, fontSize: 13 }}>{children}</div>
}

function Label({ style, children }: { style: CSSProperties; children: ReactNode }) {
  return <div style={{ ...style, lineHeight: '13px' }}>{children}</div>
}

function PatientCell({ label, style, children }: { label: string; style: CSSProperties; children: ReactNode }) {
  return (
    <span style={{ position: 'absolute', display: 'flex', flexDirection: 'column', ...style }}>
      <span style={{ fontSize: 11 }}>{label}</span>
      <strong style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{children}</strong>
    </span>
  )
}

export function BloodPressureFormWindow({ header, records, initial, onSave, onClose }: {
  /** a saved instance to show (dform_header record) — omitted for a new reading */
  header?: MoisRecord
  records?: MoisRecord[]   // dform_data rows
  initial?: { systolic?: string; diastolic?: string }
  onSave: (reading: { systolic: string; diastolic: string }) => void  // Save Form
  onClose: () => void                                                // Close Form
}) {
  const patient = usePatient()
  const [form, setForm] = useState<Reading>(() => {
    const r = readingFrom(header, records)
    return { ...r, systolic: initial?.systolic ?? r.systolic, diastolic: initial?.diastolic ?? r.diastolic }
  })
  const set = (key: keyof Reading) => (v: string) => setForm((f) => ({ ...f, [key]: v }))

  const [formDate, setFormDate] = useState(header ? date(header.dtm_form) : MOIS_TODAY)
  const [createdBy, setCreatedBy] = useState(header ? header.stp_user_create ?? '' : DESKTOP_USER)
  const [provider, setProvider] = useState(
    header ? (header.id_provider && header.id_provider !== '-1' ? header.id_provider : '') : DESKTOP_USER,
  )
  const [allowOthers, setAllowOthers] = useState(header ? header.str_lock_to_user !== 'Y' : true)

  const phoneKind = patient.preferredPhone ?? 'Home'
  const phone = phoneKind === 'Cell' ? patient.cell : phoneKind === 'Work' ? patient.work : patient.home
  const name = [patient.first, patient.middle, patient.last].filter(Boolean).join(' ').toUpperCase()

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', padding: 8, zIndex: 96 }}>
      <PBWindow
        child
        controls={false}
        title="BLOOD PRESSURE MEASUREMENT  (v1)"
        onClose={onClose}
        tutorialId="host.mois.dialog.blood-pressure-form"
        className="pb-legacy-dform"
        style={{
          width: W, height: H, maxWidth: '100%', maxHeight: '100%',
          ['--pb-titlebar-h' as string]: `${TITLEBAR_H}px`,
        }}
      >
        {/* the blue patient band, 22–90 */}
        <div
          className="pb-legacy-dform__patient"
          style={{
            position: 'relative', display: 'block', height: 68, flex: '0 0 auto', padding: 0,
            background: 'linear-gradient(#1871b5, #4ab2e7)',
          }}
        >
          <PatientCell label="CHART NO." style={{ left: 8, top: 5 }}>{patient.chart}</PatientCell>
          <PatientCell label="PATIENT (F/M/L)" style={{ left: 93, top: 5 }}>{name}</PatientCell>
          <PatientCell label="DATE OF BIRTH" style={{ left: 310, top: 5 }}>
            {patient.dob}&nbsp;&nbsp;{patient.age}
          </PatientCell>
          <PatientCell label="GENDER" style={{ left: 93, top: 37 }}>{patient.sex}</PatientCell>
          <PatientCell label="PERSONAL HEALTH NO." style={{ left: 169, top: 37 }}>
            {patient.bchn ? <>{patient.insuranceBy ?? 'BC'}&nbsp;&nbsp;{patient.bchn}</> : ''}
          </PatientCell>
          <PatientCell label="PREFERRED PHONE NUMBER" style={{ left: 310, top: 37 }}>
            {phone ?? ''}
            {/* inline: the band's css makes every span in it a flex column */}
            {phone && <span style={{ display: 'inline', minWidth: 0, fontWeight: 400, fontSize: 11, marginLeft: 8 }}>{phoneKind} Phone</span>}
          </PatientCell>
        </div>

        {/* metadata strip, 90–137, then Last Modified 137–162 */}
        <div style={{ position: 'relative', height: 47, flex: '0 0 auto', background: '#fff', borderBottom: '1px solid #4ab2e7' }}>
          <Label style={{ position: 'absolute', left: 15, top: 9 }}>Form Date:</Label>
          <PBInput
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            align="center"
            w={77}
            style={{ position: 'absolute', left: 85, top: 5 }}
          />
          <Label style={{ position: 'absolute', left: 206, top: 9 }}>This form was created by:</Label>
          <span style={{ position: 'absolute', left: 337, top: 5 }}>
            <PBDropField value={createdBy} onChange={setCreatedBy} w={175} />
          </span>
          <Label style={{ position: 'absolute', left: 15, top: 29 }}>Provider:</Label>
          <span style={{ position: 'absolute', left: 85, top: 25 }}>
            <PBDropField value={provider} onChange={setProvider} w={175} />
          </span>
          <span style={{ position: 'absolute', left: 337, top: 26 }}>
            <PBCheckbox label="Allow other users to edit form" checked={allowOthers} onChange={setAllowOthers} />
          </span>
        </div>
        <div style={{ height: 25, flex: '0 0 auto', display: 'flex', alignItems: 'center', padding: '0 14px', background: '#fff', borderBottom: '1px solid #000' }}>
          Last Modified:{header?.stp_date_modify ? <span style={{ marginLeft: 6 }}>{stamp(header.stp_date_modify)}</span> : null}
        </div>

        {/* the form, 162–657, scrolling */}
        <div className="pb-legacy-dform__body" style={{ padding: 0, overflowY: 'scroll', overflowX: 'hidden' }}>
          <div style={{ position: 'relative', margin: '0 0 0 6px', width: 760, height: 391, border: '1px solid #000', borderTop: 0 }}>
            <Caption style={{ ...at(15, 170) }}>BLOOD PRESSURE MEASUREMENT</Caption>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 188 - 163, borderTop: `1px solid ${NAVY}` }} />

            <Caption style={at(15, 194)}>Clinical Data:</Caption>
            <Label style={at(28, 216)}>Systolic</Label>
            <PBInput
              value={form.systolic}
              onChange={(e) => set('systolic')(e.target.value)}
              w={52}
              data-tutorial-id="host.mois.field.bp-systolic"
              style={at(121, 213)}
            />
            <Label style={at(181, 216)}>mm[Hg]</Label>
            <Label style={at(28, 238)}>Diastolic</Label>
            <PBInput
              value={form.diastolic}
              onChange={(e) => set('diastolic')(e.target.value)}
              w={52}
              data-tutorial-id="host.mois.field.bp-diastolic"
              style={at(121, 235)}
            />
            <Label style={at(181, 238)}>mm[Hg]</Label>
            <Label style={at(28, 260)}>Comment</Label>
            <PBTextArea
              value={form.comment}
              onChange={(e) => set('comment')(e.target.value)}
              w={219}
              style={{ ...at(121, 257), height: 40, resize: 'none' }}
            />

            <Caption style={at(15, 312)}>Patient State Information</Caption>
            <Label style={at(28, 337)}>Position</Label>
            <span style={at(121, 334)}><PBDropField value={form.position} onChange={set('position')} w={166} /></span>
            <Label style={at(28, 358)}>Extension Level</Label>
            <PBInput value={form.extension} onChange={(e) => set('extension')(e.target.value)} w={80} style={at(121, 356)} />
            <Label style={at(291, 358)}>(J/min)</Label>
            <Label style={at(28, 381)}>Exercise</Label>
            <span style={at(121, 378)}><PBDropField value={form.exercise} onChange={set('exercise')} w={166} /></span>

            <Caption style={at(15, 421)}>Protocol Information</Caption>
            <Label style={at(28, 446)}>Instrument</Label>
            <PBInput value={form.instrument} onChange={(e) => set('instrument')(e.target.value)} w={166} style={at(121, 443)} />
            <Label style={at(294, 446)}>
              instrument type: any valid instrument<br />for the measurement of blood pressue.
            </Label>
            <Label style={at(28, 484)}>Cuff size</Label>
            <span style={at(121, 481)}><PBDropField value={form.cuff} onChange={set('cuff')} w={166} /></span>
            <Label style={at(28, 506)}>Location of<br />measurement</Label>
            <span style={at(121, 503)}><PBDropField value={form.location} onChange={set('location')} w={166} /></span>
          </div>
        </div>

        <div
          className="pb-legacy-dform__footer"
          style={{ height: 38, flex: '0 0 auto', alignItems: 'center', gap: 5, padding: '0 6px', background: '#005594' }}
        >
          <PBButton
            style={{ width: 93, height: 25, minWidth: 0 }}
            data-tutorial-id="host.mois.command.save-form"
            onClick={() => onSave({ systolic: form.systolic, diastolic: form.diastolic })}
          >
            Save Form
          </PBButton>
          <PBButton
            style={{ width: 93, height: 25, minWidth: 0 }}
            data-tutorial-id="host.mois.command.close-form"
            onClick={onClose}
          >
            Close Form
          </PBButton>
        </div>
      </PBWindow>
    </div>
  )
}
