import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { addressBookEntries } from '../data/addressBook'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { DESKTOP_USER, useEncounterSession } from '../host/encounterArea'
import { useReportDialog, useSessionState } from '../host/screen-windows'
import { useScreenReport } from '../host/screen-state'
import { PBWindow, pbSlug, usePBInstrumentation } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DesktopLayer } from './StageWindow'

/* ============================================================================
   PHSA eFORMs — the eForm Browser MOIS opens a provincial web form in.

   Reached two ways, both through Add Attachment's PHSA eFORMS band
   (screens/AddAttachmentDialog.tsx, data/chartUtilities.ts):
   · a prescription row's paper clip — "At the end of the row, double click
     on the dash under the paperclip to add an attachment" (3001611, 3001613
     `b1bbc9de…png`), then pick the eFORM and Ok;
   · the Encounter Detail Window's Action ▸ Attachments ▸ PHSA eFORMs ▸
     Special Authority by Medication, "If a provider is filling out the
     Special Authority without prescribing the medication" (3001613).

   PROVENANCE
   · 3001613 `85cd1715…png`: the browser — a plain Windows 10 window titled
     "eForm Browser" with its three caption buttons; the BC PharmaCare /
     Special Authority header; "Special Authority Request"; "Red asterisks
     indicate mandatory fields."; "1. Complete Patient and Prescriber
     details:"; two panels, ⊟ Patient Information (BC Personal Health Number
     *, Patient Last Name *, Patient First Name *, Patient Middle Name, Date
     of Birth * with a calendar button, Phone Number, Address) and ⊟
     Prescriber Information (Prescriber First Name *, Prescriber Last Name *,
     Prescriber Role ⓘ ▾, Prescriber Specialty ▾, Phone Number, Extension).
     Both pre-fill from the chart and the desktop provider ("It may take up
     to 5 seconds for this information to pre-fill").
   · 3001613 `58fe42a9…png`: "Postal Code" closing the prescriber panel, the
     red "Expand Prescriber Information panel to ensure all mandatory fields
     are complete", and "Select medication: *" as a searchable list ("Type to
     search", then abatacept (Orencia) 250mg/15mL, 125mg/mL · abobotulinum
     toxin A (Dysport) 300U, 500U · acamprosate (Campral) 333mg ·
     acetaminophen (Tylenol and generics) 500mg · aclidinium (Tudorza
     Genuair) 400mcg · aclidinium/formoterol (Duaklir Genuair)
     400mcg/12mcg · adalimumab (…) 40mg/0.8mL …).
   · 3001611 `ab239f99…png`: Paxlovid's Prescription section — Current kidney
     function ⓘ * (eGFR greater than or equal to 60 mL/min · eGFR 30-59
     mL/min), • Fax to location * ▾, the italic pharmacy note, "For the list
     of pharmacies that dispense nirmatrelvir/ritonavir (Paxlovid), please
     see: https://www.bcpharmacy.ca/paxlovid", ☐ I can't find the fax number
     on the list above - I will type it in ⓘ, ☐ Assessment completed by
     pharmacist (if applicable), and "If this fax is received in error - or
     you have questions for the prescriber - please call:".
   · 3001611 `829e65c3…png`: Signature — "Drop files to attach, Use Camera,
     or browse" ("Drop Files/Use Camera are not available options at this
     time", so only browse does anything here).
   · both `8404acbe…png`: Submit (blue) over Save Draft · Download Draft PDF
     (grey).

   INFERRED (no capture): the Paxlovid form's heading and its patient /
   prescriber panels (the article only says to "Fill out the applicable
   information within the eFORM"; the same two panels as Special Authority
   are drawn); what the Special Authority form asks once a medication is
   picked ("as selections are made the form will add additional choices" —
   a request type, the criteria and a justification box stand in); the
   Submit confirmation; the eFORM's pre-fill delay (one second here).

   Submit files the eFORM: the record it was opened from gets its paper-clip
   count, and a copy is listed in Patient Chart ▸ Documents ("a copy of the
   document will be in the Patient Chart > Documents folder",
   `useFiledEforms`). Save Draft keeps the draft for the session.

   Window id `phsa-eform` (args: form = special-authority | paxlovid,
   target = the record's attachment key). Anchors host.mois.dialog.phsa-eform;
   host.mois.field.eform-<field>; host.mois.command.eform-{submit,
   save-draft, download-draft-pdf, browse, close, patient-panel,
   prescriber-panel}; medication options host.mois.row.eform-med-<slug>.
   Reported: host.dialog = phsa-eform, host.screen.eform = the form,
   host.screen.eformMedication (the picked medication's slug),
   host.screen.eformStatus = open | draft | submitted.
   ========================================================================= */

export const PHSA_EFORM_WINDOW = 'phsa-eform'

export type PhsaForm = 'special-authority' | 'paxlovid'

/** The Add Attachment row → the eFORM it opens. */
export const phsaFormFor = (description: string): PhsaForm => (/PAXLOVID/i.test(description) ? 'paxlovid' : 'special-authority')

/* 3001613 `58fe42a9…png`, the list's first run, word for word; the rest are
   the stage's own so a search has something to land on */
const SA_MEDICATIONS = [
  'abatacept (Orencia) 250mg/15mL, 125mg/mL',
  'abobotulinum toxin A (Dysport) 300U, 500U',
  'acamprosate (Campral) 333mg',
  'acetaminophen (Tylenol and generics) 500mg',
  'aclidinium (Tudorza Genuair) 400mcg',
  'aclidinium/formoterol (Duaklir Genuair) 400mcg/12mcg',
  'adalimumab (Amgevita™ CF, Idacio, Hadlima, Hulio CF, Hyrimoz™) 40mg/0.8mL, 20mg/0.4mL',
  'apixaban (Eliquis) 2.5mg, 5mg',
  'dabigatran (Pradaxa) 110mg, 150mg',
  'empagliflozin (Jardiance) 10mg, 25mg',
  'rivaroxaban (Xarelto) 10mg, 15mg, 20mg',
  'semaglutide (Ozempic) 0.25mg, 0.5mg, 1mg, 2mg',
]

/** A submitted or drafted eFORM, as Documents lists it. */
export type FiledEform = { date: string; author: string; type: string; note: string; status: 'DRAFT' | 'SUBMITTED' }

/** The eFORMs filed on the open chart this session (Patient Chart ▸ Documents). */
export function useFiledEforms() {
  const { chart } = usePatient()
  return useSessionState<FiledEform[]>(`phsa-eforms:${chart}`, [])
}

/* --- the page's web look (Bootstrap-like, not PowerBuilder) --------------- */
const WEB: CSSProperties = { fontFamily: '"Lato", "Segoe UI", Arial, sans-serif', fontSize: 13, color: '#333' }
const INPUT: CSSProperties = { display: 'block', width: '100%', boxSizing: 'border-box', height: 30, padding: '4px 8px', border: '1px solid #ccc', borderRadius: 3, font: 'inherit', background: '#fff' }
const LABEL: CSSProperties = { display: 'block', margin: '10px 0 4px' }
const STAR = <span style={{ color: '#d9534f' }}> *</span>
const BTN: CSSProperties = { border: 0, borderRadius: 4, padding: '8px 16px', font: 'inherit', fontWeight: 700, color: '#fff', cursor: 'pointer' }

function Field({ id, label, required, value, onChange, width, after }: {
  id: string; label: string; required?: boolean; value: string; onChange: (v: string) => void; width?: number; after?: ReactNode
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={LABEL}>{label}{required && STAR}</span>
      <span style={{ display: 'flex', gap: 0, width }}>
        <input style={{ ...INPUT, borderRadius: after ? '3px 0 0 3px' : 3 }} value={value} data-tutorial-id={`host.mois.field.eform-${id}`} onChange={(e) => onChange(e.target.value)} />
        {after}
      </span>
    </label>
  )
}

function Panel({ id, title, open, onToggle, children }: { id: string; title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  const host = usePBInstrumentation()
  return (
    <div style={{ flex: '1 1 0', minWidth: 0, border: '1px solid #ddd', borderRadius: 4, background: '#fff', alignSelf: 'flex-start' }}>
      <button type="button" aria-expanded={open} aria-controls={`eform-${id}-body`}
        data-tutorial-id={host?.anchor('command', `eform-${id}-panel`)}
        onClick={() => { host?.report('command', { command: `eform-${id}-panel` }); onToggle() }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', border: 0, borderBottom: open ? '1px solid #ddd' : 0, background: '#f5f5f5', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
        <span style={{ display: 'inline-grid', placeItems: 'center', width: 12, height: 12, border: '1px solid #777', fontSize: 10, lineHeight: 1 }}>{open ? '−' : '+'}</span>
        {title}
      </button>
      {open && <div id={`eform-${id}-body`} style={{ padding: '0 12px 12px' }}>{children}</div>}
    </div>
  )
}

function PhsaEformWindow({ args, close }: AreaWindowProps) {
  const form: PhsaForm = args.form === 'paxlovid' ? 'paxlovid' : 'special-authority'
  const target = typeof args.target === 'string' ? args.target : null
  const p = usePatient()
  const area = useEncounterSession()
  const [, setFiled] = useFiledEforms()
  const host = usePBInstrumentation()
  useReportDialog(PHSA_EFORM_WINDOW)

  /* "It may take up to 5 seconds for this information to pre-fill" */
  const [filled, setFilled] = useState(false)
  useEffect(() => { const t = setTimeout(() => setFilled(true), 1000); return () => clearTimeout(t) }, [])
  const [patientOpen, setPatientOpen] = useState(true)
  const [prescriberOpen, setPrescriberOpen] = useState(true)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const prescriber = DESKTOP_USER.split(' ')
  const prefill: Record<string, string> = filled ? {
    phn: (p.bchn ?? p.insurance ?? '').replace(/\s/g, ''), last: p.last.toUpperCase(), first: p.first.toUpperCase(), middle: (p.middle ?? '').toUpperCase(),
    dob: p.dob.replace(/\./g, '-'), phone: (p.home ?? '').replace(/\D/g, ''), street: p.address ?? '', city: p.city ?? '', province: p.province ?? 'BC', postal: p.postal ?? '',
    'prescriber-first': prescriber[0] ?? '', 'prescriber-last': prescriber.slice(1).join(' '), 'prescriber-phone': '', 'prescriber-ext': '', 'prescriber-postal': '',
  } : {}
  const v = (k: string) => edits[k] ?? prefill[k] ?? ''
  const set = (k: string) => (value: string) => setEdits((e) => ({ ...e, [k]: value }))
  const [role, setRole] = useState('')
  const [specialty, setSpecialty] = useState('')

  /* Special Authority: the searchable medication list, then its questions */
  const [med, setMed] = useState('')
  const [medOpen, setMedOpen] = useState(false)
  const [medSearch, setMedSearch] = useState('')
  const [request, setRequest] = useState('')
  const [criteria, setCriteria] = useState<Record<string, boolean>>({})
  /* Paxlovid: the Prescription section and the signature */
  const [kidney, setKidney] = useState('')
  const [fax, setFax] = useState('')
  const [typeFax, setTypeFax] = useState(false)
  const [pharmacist, setPharmacist] = useState(false)
  const [signature, setSignature] = useState('')
  const [status, setStatus] = useState<'open' | 'draft' | 'submitted'>('open')
  const [missing, setMissing] = useState(false)

  useScreenReport({ eform: form, eformMedication: med ? pbSlug(med).slice(0, 40) : null, eformStatus: status })

  const pharmacies = useMemo(() => addressBookEntries.filter((r) => r.pharmacy).map((r) => `${r.name} - ${r.city}`), [])
  const title = form === 'paxlovid' ? 'Paxlovid Prescription' : 'Special Authority Request'
  const complete = form === 'paxlovid'
    ? !!(v('phn') && v('last') && v('first') && v('dob') && kidney && (fax || (typeFax && v('fax-number'))))
    : !!(v('phn') && v('last') && v('first') && v('dob') && med)

  const file = (state: FiledEform['status']) => {
    setFiled((all) => [{ date: MOIS_TODAY, author: DESKTOP_USER, type: 'PHSA EFORM', note: form === 'paxlovid' ? 'PAXLOVID PRESCRIPTION' : `SPECIAL AUTHORITY REQUEST${med ? ` - ${med.split(' (')[0]!.toUpperCase()}` : ''}`, status: state }, ...all])
  }
  const command = (id: string, fn: () => void) => () => { host?.report('command', { command: `eform-${id}` }); fn() }
  const submit = command('submit', () => {
    if (!complete) { setMissing(true); return }
    file('SUBMITTED')
    if (target) area.update((s) => ({ ...s, attachments: { ...s.attachments, [target]: (s.attachments[target] ?? 0) + 1 } }))
    setStatus('submitted')
  })

  const patientPanel = (
    <Panel id="patient" title="Patient Information" open={patientOpen} onToggle={() => setPatientOpen((o) => !o)}>
      <Field id="phn" label="BC Personal Health Number" required value={v('phn')} onChange={set('phn')} width={200} />
      <Field id="last" label="Patient Last Name" required value={v('last')} onChange={set('last')} />
      <Field id="first" label="Patient First Name" required value={v('first')} onChange={set('first')} />
      <Field id="middle" label="Patient Middle Name" value={v('middle')} onChange={set('middle')} />
      <Field id="dob" label="Date of Birth" required value={v('dob')} onChange={set('dob')}
        after={<span style={{ ...INPUT, width: 34, borderLeft: 0, borderRadius: '0 3px 3px 0', background: '#eee', textAlign: 'center' }}>&#128197;</span>} />
      <Field id="phone" label="Phone Number" value={v('phone')} onChange={set('phone')} width={200} />
      <div style={{ ...LABEL, fontWeight: 700, borderTop: '1px solid #eee', paddingTop: 8 }}>Address</div>
      <Field id="street" label="Street" value={v('street')} onChange={set('street')} />
      <Field id="city" label="City" value={v('city')} onChange={set('city')} />
      <Field id="postal" label="Postal Code" value={v('postal')} onChange={set('postal')} width={160} />
    </Panel>
  )
  const select = (id: string, value: string, onChange: (v: string) => void, options: string[]) => (
    <select style={INPUT} value={value} data-tutorial-id={`host.mois.field.eform-${id}`} onChange={(e) => onChange(e.target.value)}>
      <option value="" />
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  )
  const prescriberPanel = (
    <Panel id="prescriber" title="Prescriber Information" open={prescriberOpen} onToggle={() => setPrescriberOpen((o) => !o)}>
      <Field id="prescriber-first" label="Prescriber First Name" required value={v('prescriber-first')} onChange={set('prescriber-first')} />
      <Field id="prescriber-last" label="Prescriber Last Name" required value={v('prescriber-last')} onChange={set('prescriber-last')} />
      <div style={{ border: '1px solid #eee', borderRadius: 3, padding: '0 10px 10px', margin: '10px 0' }}>
        <span style={LABEL}>Prescriber Role <span title="Your role as prescriber" style={{ color: '#337ab7' }}>&#9432;</span></span>
        {select('prescriber-role', role, setRole, ['Physician', 'Nurse Practitioner', 'Pharmacist', 'Midwife', 'Dentist'])}
        <span style={LABEL}>Prescriber Specialty</span>
        {select('prescriber-specialty', specialty, setSpecialty, ['Family Practice', 'Internal Medicine', 'Psychiatry', 'Cardiology', 'Other'])}
      </div>
      <Field id="prescriber-phone" label="Phone Number" value={v('prescriber-phone')} onChange={set('prescriber-phone')} width={200} />
      <Field id="prescriber-ext" label="Extension" value={v('prescriber-ext')} onChange={set('prescriber-ext')} width={120} />
      <Field id="prescriber-postal" label="Postal Code" value={v('prescriber-postal')} onChange={set('prescriber-postal')} width={160} />
    </Panel>
  )

  const shownMeds = SA_MEDICATIONS.filter((m) => m.toLowerCase().includes(medSearch.toLowerCase()))
  const specialAuthority = (
    <>
      {!prescriberOpen && <div style={{ color: '#d9534f', margin: '8px 0' }}>Expand Prescriber Information panel to ensure all mandatory fields are complete</div>}
      <span style={LABEL}>Select medication:{STAR}</span>
      <div style={{ position: 'relative' }}>
        <button type="button" aria-expanded={medOpen} aria-controls="eform-med-list" data-tutorial-id="host.mois.field.eform-medication"
          onClick={() => setMedOpen((o) => !o)} style={{ ...INPUT, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span style={{ flex: '1 1 auto' }}>{med}</span><span>&#9662;</span>
        </button>
        {medOpen && (
          <div id="eform-med-list" style={{ border: '1px solid #ccc', borderTop: 0, background: '#fff', maxHeight: 220, overflow: 'auto' }}>
            <input style={{ ...INPUT, margin: 4, width: 'calc(100% - 8px)' }} placeholder="Type to search" value={medSearch}
              data-tutorial-id="host.mois.field.eform-medication-search" onChange={(e) => setMedSearch(e.target.value)} />
            {shownMeds.map((m) => (
              <button key={m} type="button" data-tutorial-id={`host.mois.row.eform-med-${pbSlug(m).slice(0, 40)}`}
                onClick={() => { setMed(m); setMedOpen(false); setMedSearch('') }}
                style={{ display: 'block', width: '100%', padding: '6px 10px', border: 0, borderTop: '1px solid #eee', background: m === med ? '#e8e8e8' : '#fff', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
                {m}
              </button>
            ))}
          </div>
        )}
      </div>
      {med && (
        <div data-tutorial-id="host.mois.group.eform-request" style={{ marginTop: 16 }}>
          <h4 style={{ margin: '12px 0 6px' }}>2. Request details for {med.split(' (')[0]}</h4>
          <span style={LABEL}>Is this a new request or a renewal?{STAR}</span>
          {['New request', 'Renewal'].map((r) => (
            <label key={r} style={{ display: 'block', margin: '3px 0' }}>
              <input type="radio" name="eform-request" checked={request === r} data-tutorial-id={`host.mois.field.eform-request-${pbSlug(r)}`} onChange={() => setRequest(r)} /> {r}
            </label>
          ))}
          {request && (
            <>
              <span style={LABEL}>Which criteria does the patient meet?</span>
              {['Meets the PharmaCare Special Authority criteria for this drug', 'Has tried and failed first-line therapy', 'Has a contraindication to first-line therapy'].map((c) => (
                <label key={c} style={{ display: 'block', margin: '3px 0' }}>
                  <input type="checkbox" checked={!!criteria[c]} data-tutorial-id={`host.mois.field.eform-criteria-${pbSlug(c).slice(0, 30)}`} onChange={(e) => setCriteria((x) => ({ ...x, [c]: e.target.checked }))} /> {c}
                </label>
              ))}
              <span style={LABEL}>Additional information</span>
              <textarea style={{ ...INPUT, height: 70 }} data-tutorial-id="host.mois.field.eform-additional" value={v('additional')} onChange={(e) => set('additional')(e.target.value)} />
            </>
          )}
        </div>
      )}
    </>
  )

  const paxlovid = (
    <div data-tutorial-id="host.mois.group.eform-prescription">
      <h3 style={{ fontWeight: 400, fontSize: 20, margin: '18px 0 6px' }}>Prescription</h3>
      <span style={LABEL}>Current kidney function <span style={{ color: '#337ab7' }}>&#9432;</span>{STAR}</span>
      {['eGFR greater than or equal to 60 mL/min', 'eGFR 30-59 mL/min'].map((k) => (
        <label key={k} style={{ display: 'block', margin: '3px 0' }}>
          <input type="radio" name="eform-kidney" checked={kidney === k} data-tutorial-id={`host.mois.field.eform-kidney-${k.includes('60') ? 'normal' : 'reduced'}`} onChange={() => setKidney(k)} /> {k}
        </label>
      ))}
      <span style={LABEL}><span style={{ color: '#d9534f' }}>&bull; </span>Fax to location{STAR}</span>
      {select('fax-location', fax, setFax, pharmacies)}
      <p style={{ fontStyle: 'italic', fontSize: 12 }}>Please use the drop down list above to find the pharmacy. If you cannot find the pharmacy of choice, you can manually enter a fax number by clicking the check box below.</p>
      <p style={{ margin: '4px 0' }}>For the list of pharmacies that dispense nirmatrelvir/ritonavir (Paxlovid), please see:</p>
      <p style={{ margin: '4px 0', color: '#337ab7' }}>https://www.bcpharmacy.ca/paxlovid</p>
      <label style={{ display: 'block', margin: '8px 0' }}>
        <input type="checkbox" checked={typeFax} data-tutorial-id="host.mois.field.eform-type-fax" onChange={(e) => setTypeFax(e.target.checked)} /> I can&apos;t find the fax number on the list above - I will type it in <span style={{ color: '#337ab7' }}>&#9432;</span>
      </label>
      {typeFax && <Field id="fax-number" label="Fax number" required value={v('fax-number')} onChange={set('fax-number')} width={220} />}
      <label style={{ display: 'block', margin: '8px 0' }}>
        <input type="checkbox" checked={pharmacist} data-tutorial-id="host.mois.field.eform-pharmacist" onChange={(e) => setPharmacist(e.target.checked)} /> Assessment completed by pharmacist (if applicable)
      </label>
      <span style={LABEL}>If this fax is received in error - or you have questions for the prescriber - please call:</span>
      <input style={INPUT} value={v('callback')} data-tutorial-id="host.mois.field.eform-callback" onChange={(e) => set('callback')(e.target.value)} />
      <h3 style={{ fontWeight: 400, fontSize: 20, margin: '20px 0 6px' }}>Signature</h3>
      <div data-tutorial-id="host.mois.group.eform-signature" style={{ border: '1px solid #e3e3e3', background: '#f7f7f7', padding: 10 }}>
        <div style={{ border: '2px dashed #ccc', padding: '14px 10px', textAlign: 'center' }}>
          {signature
            ? <span>&#128206; {signature} <button type="button" style={{ border: 0, background: 'none', color: '#337ab7', cursor: 'pointer' }} onClick={() => setSignature('')}>remove</button></span>
            : <>&#9729; Drop files to attach, <span style={{ color: '#337ab7' }}>&#128247; Use Camera</span>, or{' '}
              <button type="button" data-tutorial-id="host.mois.command.eform-browse"
                onClick={command('browse', () => setSignature('signature.png'))}
                style={{ border: 0, background: 'none', padding: 0, color: '#337ab7', font: 'inherit', cursor: 'pointer' }}>browse</button></>}
        </div>
      </div>
    </div>
  )

  return (
    <DesktopLayer>
      <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 86 }}>
        <PBWindow child title="eForm Browser" onClose={close} tutorialId={`host.mois.dialog.${PHSA_EFORM_WINDOW}`}
          style={{ width: 'min(900px, calc(100% - 24px))', height: 'min(820px, calc(100% - 24px))' }}>
          <div style={{ ...WEB, flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff', padding: '0 22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '3px solid #fcba19' }}>
              <span style={{ color: '#003366', fontWeight: 700, lineHeight: '14px' }}>BRITISH<br />COLUMBIA</span>
              <span style={{ color: '#003366' }}><b>BC PharmaCare</b><br />{form === 'paxlovid' ? 'Paxlovid' : 'Special Authority'}</span>
            </div>
            {status === 'submitted' ? (
              <div data-tutorial-id="host.mois.group.eform-submitted" style={{ padding: '40px 0', textAlign: 'center' }}>
                <h2 style={{ fontWeight: 400 }}>Thank you. Your {form === 'paxlovid' ? 'prescription' : 'request'} has been submitted.</h2>
                <p>A copy has been saved to the patient&apos;s chart (Documents).</p>
                <button type="button" style={{ ...BTN, background: '#337ab7' }} data-tutorial-id="host.mois.command.eform-close" onClick={close}>Close</button>
              </div>
            ) : (
              <>
                <h1 style={{ fontWeight: 400, fontSize: 28, margin: '16px 0 8px' }}>{title}</h1>
                <p style={{ margin: '4px 0 12px' }}>Red asterisks indicate mandatory fields.</p>
                <h4 style={{ margin: '8px 0' }}>1. Complete Patient and Prescriber details:</h4>
                {!filled && <p style={{ color: '#777', fontStyle: 'italic' }}>Loading patient and prescriber information…</p>}
                <div style={{ display: 'flex', gap: 16 }}>{patientPanel}{prescriberPanel}</div>
                {form === 'paxlovid' ? paxlovid : specialAuthority}
                {missing && !complete && <p style={{ color: '#d9534f', marginTop: 14 }}>Please complete all mandatory fields.</p>}
                {status === 'draft' && <p style={{ color: '#3c763d', marginTop: 14 }}>Draft saved.</p>}
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <button type="button" style={{ ...BTN, background: '#0d6efd', padding: '8px 26px' }} data-tutorial-id="host.mois.command.eform-submit" onClick={submit}>Submit</button>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
                    <button type="button" style={{ ...BTN, background: '#6c757d', fontWeight: 400 }} data-tutorial-id="host.mois.command.eform-save-draft"
                      onClick={command('save-draft', () => { file('DRAFT'); setStatus('draft') })}>Save Draft</button>
                    <button type="button" style={{ ...BTN, background: '#6c757d', fontWeight: 400 }} data-tutorial-id="host.mois.command.eform-download-draft-pdf"
                      onClick={command('download-draft-pdf', () => undefined)}>Download Draft PDF</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </PBWindow>
      </div>
    </DesktopLayer>
  )
}

registerAreaWindow(PHSA_EFORM_WINDOW, PhsaEformWindow)
