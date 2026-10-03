import { useState, type ReactNode } from 'react'
import type { ChartPatient } from '../data/patient-context'
import { ageOf } from '../data/patients'
import { pad2 } from '../data/clock'
import { PBButton, PBCheckbox, PBInput } from '../pb'
import { ModalWindow } from './dialogKit'
import { DialogFooter } from './formKit'
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
  /* A chart with no alias paints no ALIAS caption at all: the TRAINING
     capture of chart 3924 (encounter-detail-header.png, v02.31.23) runs
     NAME straight on to DoB at the same x, while #21/#22/#33 were all of a
     chart that has one. The cell keeps its width either way. Both rows are
     on an 18px pitch there (NAME 125, BCHN 143). */
  const alias = (patient.alias ?? '').trim()
  return (
    <div className="pb-banner-yellow" style={{ display: 'block', padding: '1px 8px 2px' }} data-tutorial-id="host.mois.field.encounter-banner">
      <div className="pb-row" style={{ gap: 0, height: 18 }}>
        <Cell w={281}>NAME:&nbsp;<b>{`${patient.first} ${patient.last}`.toUpperCase()}</b></Cell>
        <Cell w={200}>{alias && <>ALIAS:&nbsp;&nbsp;<b>{alias.toUpperCase()}</b></>}</Cell>
        <Cell w={108}>DoB:&nbsp;<b>{patient.dob}</b></Cell>
        <Cell w={29}><b>{patient.sex}</b></Cell>
        <span>Service Provider:</span>
      </div>
      <div className="pb-row" style={{ gap: 0, height: 18 }}>
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
  const [start, setStart] = useState(' : ')
  const [finish, setFinish] = useState(' : ')
  const now = () => { const d = new Date(); return `${pad2(d.getHours())} : ${pad2(d.getMinutes())}` }
  const grey = { color: '#9a9a9a' }
  return (
    <div className="pb-row" style={{ gap: 0, padding: '2px 8px', borderBottom: '1px solid #a0a0a0', flex: 'none' }}>
      <span style={{ ...grey, width: 140, flex: 'none' }}>MSP Appointment Time(s):</span>
      <span style={{ width: 61, flex: 'none' }}>Start Time:</span>
      <PBInput w={47} align="center" value={start} onChange={(e) => setStart(e.target.value)} data-tutorial-id="host.mois.field.msp-start-time" />
      <PBButton style={{ width: 52, minWidth: 0, height: 20, marginLeft: 4 }} command="msp-start" onClick={() => setStart(now())}>Start</PBButton>
      <span style={{ ...grey, width: 82, flex: 'none', paddingLeft: 5 }}>(seen)</span>
      <span style={{ width: 75, flex: 'none' }}>Finished Time:</span>
      <PBInput w={47} align="center" value={finish} onChange={(e) => setFinish(e.target.value)} data-tutorial-id="host.mois.field.msp-finish-time" />
      <PBButton style={{ width: 52, minWidth: 0, height: 20, marginLeft: 4 }} command="msp-finish" onClick={() => setFinish(now())}>Finish</PBButton>
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
    <ModalWindow
      id="new-note-prompt"
      title="Confirmation: Create another Progress Note"
      onClose={() => onAnswer(false, false)}
      zIndex={96}
      layerStyle={{ position: 'fixed', padding: 8 }}
      windowStyle={{ width: 'min(405px, 100%)' }}
    >
        {/* Spacing off Drive Mois 2026-09-20 11.43.19 (the same prompt at
            2.28×, 405 × 177 with its 31px title bar): the icon 11px into
            the face and 22 in, the question at 75, Yes / No 79px down the
            face at 120 and 210, the check box 121px down and 11 in, 18px of
            face under it. */}
        <div className="pb-row" style={{ gap: 20, alignItems: 'flex-start', padding: '9px 18px 0 20px' }}>
          <QuestionGlyph />
          <span style={{ paddingTop: 6 }}>Would you like to create another progress note?</span>
        </div>
        <DialogFooter gap={16} padding="36px 0 10px">
          <DialogButton id="new-note-yes" width={74} isDefault onClick={() => onAnswer(true, always)}>Yes</DialogButton>
          <DialogButton id="new-note-no" width={74} onClick={() => onAnswer(false, false)}>No</DialogButton>
        </DialogFooter>
        <div style={{ padding: '0 10px 14px' }}>
          <PBCheckbox label="Always create new note" checked={always} onChange={setAlways} tutorialId="host.mois.field.always-create-new-note" />
        </div>
    </ModalWindow>
  )
}

/** the Win32 question icon, the pb message box's own glyph at its size */
function QuestionGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" style={{ flex: 'none' }}>
      {/* the Windows 7 question glyph 11.43.19 shows: a glossy blue disc,
          lighter at the top left, in a pale grey ring */}
      <defs>
        <radialGradient id="pb-question-disc" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#7aa6e8" />
          <stop offset=".55" stopColor="#2a5fbe" />
          <stop offset="1" stopColor="#173f8c" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill="#d9dde4" stroke="#9aa3b2" />
      <circle cx="16" cy="16" r="13" fill="url(#pb-question-disc)" stroke="#16357a" strokeWidth=".8" />
      <path d="M11.6 12.2c0-2.6 2-4.4 4.6-4.4 2.7 0 4.5 1.6 4.5 4 0 3.4-4 3.2-4 6.6h-3c0-4.4 4-4.2 4-6.4 0-1-.7-1.6-1.6-1.6-1 0-1.7.7-1.7 1.8z" fill="#fff" />
      <circle cx="16" cy="23.5" r="2" fill="#fff" />
    </svg>
  )
}
