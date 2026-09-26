import { useState, type ReactNode } from 'react'
import type { ChartPatient } from '../data/patient-context'
import { ageOf } from '../data/patients'
import { PBButton, PBCheckbox, PBInput, PBWindow, usePBInstrumentation } from '../pb'
import { DialogButton } from './WorkspaceDialogFrame'

/* ============================================================================
   The Encounter Detail Window's own chrome, as the current build paints it:
   the title, the yellow patient banner, the MSP Appointment Time(s) strip
   and the "create another progress note" confirmation.

   PROVENANCE: user captures 2026-09-25 #21, #22, #33 (v02.31.23), three
   encounters of one chart, all at ~1.1x the manual's scale (the positions
   below are the capture's / 1.1).
   ========================================================================= */

/** `[alias: JOY] PATCH AADAMS 66 YEAR OLD M` — the unit spelt out, the
    alias bracketed in front when the chart has one (#21, #22, #33). */
export function encounterTitle(p: ChartPatient): string {
  const age = ageOf(p.dob).replace(/\bYR\b/g, 'YEAR')
  const alias = p.alias?.trim() ? `[alias: ${p.alias.trim()}] ` : ''
  return `${alias}${p.first} ${p.last} ${age} ${p.sex}`.replace(/\s+/g, ' ').toUpperCase().trim()
}

/* --- the yellow banner ------------------------------------------------------
   Row 1: NAME: · ALIAS: · DoB: + sex · Service Provider:. Row 2: BCHN: ·
   Home: · Work: · Cell: · the service provider's name, under its caption.
   The chart's preferred number is the underlined one (Work in the captures;
   the Demographics rule, screens/DemographicsView `PhoneLabel`). Replaces
   pb `PBPatientBannerYellow` here, which has no ALIAS, underlines Home
   always and prints the provider on the first row. */
export function EncounterBanner({ patient }: { patient: ChartPatient }) {
  const preferred = (patient.preferredPhone ?? '').trim().toLowerCase()
  const phone = (label: string, value: string | undefined, w: number) => {
    const linked = !!preferred && label.toLowerCase().startsWith(preferred)
    const u = linked ? { textDecoration: 'underline' } : undefined
    return <Cell w={w}><span style={u}>{label}</span>&nbsp;<b style={u}>{value ?? ''}</b></Cell>
  }
  return (
    <div className="pb-banner-yellow" style={{ display: 'block', padding: '1px 8px 2px' }} data-tutorial-id="host.mois.field.encounter-banner">
      <div className="pb-row" style={{ gap: 0 }}>
        <Cell w={281}>NAME:&nbsp;<b>{`${patient.first} ${patient.last}`.toUpperCase()}</b></Cell>
        <Cell w={200}>ALIAS:&nbsp;&nbsp;<b>{(patient.alias ?? '').toUpperCase()}</b></Cell>
        <Cell w={108}>DoB:&nbsp;<b>{patient.dob}</b></Cell>
        <Cell w={29}><b>{patient.sex}</b></Cell>
        <span>Service Provider:</span>
      </div>
      <div className="pb-row" style={{ gap: 0 }}>
        <Cell w={182}>BCHN:&nbsp;<b>{patient.bchn ?? ''}</b></Cell>
        {phone('Home:', patient.home, 151)}
        {phone('Work:', patient.work, 152)}
        {phone('Cell:', patient.cell, 133)}
        <b>{(patient.provider ?? '').toUpperCase()}</b>
      </div>
    </div>
  )
}

const Cell = ({ w, children }: { w: number; children: ReactNode }) => (
  <span style={{ width: w, flex: 'none', whiteSpace: 'nowrap', overflow: 'hidden' }}>{children}</span>
)

/* --- MSP Appointment Time(s) -------------------------------------------------
   The strip between the banner and the header form (#21, #22, #33): a greyed
   `MSP Appointment Time(s):` caption, Start Time: [ : ] [Start] (seen),
   Finished Time: [ : ] [Finish] (discharge), the hints greyed too. What the
   buttons do is not captured; here Start / Finish stamp the box with the
   time of the press, the way the day book's Arrived / Seen buttons do. */
export function MspAppointmentTimes() {
  const host = usePBInstrumentation()
  const [start, setStart] = useState(' : ')
  const [finish, setFinish] = useState(' : ')
  const now = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')} : ${String(d.getMinutes()).padStart(2, '0')}` }
  const press = (id: string, set: (v: string) => void) => { host?.report('command', { command: id }); set(now()) }
  const grey = { color: '#9a9a9a' }
  return (
    <div className="pb-row" style={{ gap: 0, padding: '2px 8px', borderBottom: '1px solid #a0a0a0', flex: 'none' }}>
      <span style={{ ...grey, width: 140, flex: 'none' }}>MSP Appointment Time(s):</span>
      <span style={{ width: 61, flex: 'none' }}>Start Time:</span>
      <PBInput w={47} align="center" value={start} onChange={(e) => setStart(e.target.value)} data-tutorial-id="host.mois.field.msp-start-time" />
      <PBButton style={{ width: 52, minWidth: 0, height: 20, marginLeft: 4 }} data-tutorial-id={host?.anchor('command', 'msp-start')} onClick={() => press('msp-start', setStart)}>Start</PBButton>
      <span style={{ ...grey, width: 82, flex: 'none', paddingLeft: 5 }}>(seen)</span>
      <span style={{ width: 75, flex: 'none' }}>Finished Time:</span>
      <PBInput w={47} align="center" value={finish} onChange={(e) => setFinish(e.target.value)} data-tutorial-id="host.mois.field.msp-finish-time" />
      <PBButton style={{ width: 52, minWidth: 0, height: 20, marginLeft: 4 }} data-tutorial-id={host?.anchor('command', 'msp-finish')} onClick={() => press('msp-finish', setFinish)}>Finish</PBButton>
      <span style={{ ...grey, paddingLeft: 5 }}>(discharge)</span>
    </div>
  )
}

/* --- Confirmation: Create another Progress Note ---------------------------------
   #22: title `Confirmation: Create another Progress Note` (close box only),
   ~445×195 at the capture's scale; the blue "?" icon and "Would you like to
   create another progress note?"; Yes (the default, focus border) and No
   centred; ☐ Always create new note at the lower left. The prompt came up
   over a blank New Note (*of 0), so MOIS asks even then. Ticking the box
   and answering Yes stops the question for the rest of the session. */
export function NewNoteConfirmation({ onAnswer }: { onAnswer: (yes: boolean, always: boolean) => void }) {
  const [always, setAlways] = useState(false)
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', padding: 8, zIndex: 96 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.new-note-prompt"
        title="Confirmation: Create another Progress Note"
        onClose={() => onAnswer(false, false)}
        style={{ width: 'min(405px, 100%)' }}
      >
        <div className="pb-row" style={{ gap: 14, alignItems: 'flex-start', padding: '14px 18px 0' }}>
          <QuestionGlyph />
          <span style={{ paddingTop: 6 }}>Would you like to create another progress note?</span>
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 16, padding: '26px 0 8px', flex: 'none' }}>
          <DialogButton id="new-note-yes" width={74} isDefault onClick={() => onAnswer(true, always)}>Yes</DialogButton>
          <DialogButton id="new-note-no" width={74} onClick={() => onAnswer(false, false)}>No</DialogButton>
        </div>
        <div style={{ padding: '0 10px 8px' }}>
          <PBCheckbox label="Always create new note" checked={always} onChange={setAlways} tutorialId="host.mois.field.always-create-new-note" />
        </div>
      </PBWindow>
    </div>
  )
}

/** the Win32 question icon, the pb message box's own glyph at its size */
function QuestionGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" style={{ flex: 'none' }}>
      <circle cx="16" cy="16" r="14" fill="#1f5fb8" stroke="#123f80" />
      <path d="M11.6 12.2c0-2.6 2-4.4 4.6-4.4 2.7 0 4.5 1.6 4.5 4 0 3.4-4 3.2-4 6.6h-3c0-4.4 4-4.2 4-6.4 0-1-.7-1.6-1.6-1.6-1 0-1.7.7-1.7 1.8z" fill="#fff" />
      <circle cx="16" cy="23.5" r="2" fill="#fff" />
    </svg>
  )
}
