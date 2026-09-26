import { useMemo, useState, type ReactNode } from 'react'
import { useChartRecords } from '../data/chart-records'
import { date } from '../data/charts/relations'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { useEncounterSession, type SessionNote } from '../host/encounterArea'
import { useScreenReport } from '../host/screen-state'
import { PBButton, PBInput, PBRadio, PBWindow, usePBInstrumentation } from '../pb'

/* ============================================================================
   Print Encounter Note — what the note band's `Print Note` opens.

   PROVENANCE:
     · user capture 2026-09-25 #21 (v02.31.23): the window over the
       Encounter Detail Window, close box only, ~395×255 at the capture's
       scale (sized here /1.1, the manual's scale). One etched frame holding
       two navy captions, each over a rule: `Print Type` with the radios
       ○ Offset Note from Top / ◉ Cumulative Note — Cumulative is the default
       — and `Appointment Date Range (inclusive)` with Date(s): [date] to
       [date], both boxes on the encounter's own date. Under the frame
       `Print (F2)` and `Cancel`.
     · #23: Offset Note from Top's page in the Print Preview — no header;
       the encounter date and the patient on one line, the note text, the
       provider. #24: Cumulative Note's page — a header band between two
       rules (patient bold at the left, DOB: in the middle, INSURANCE: at
       the right), then each encounter in the range, most recent first,
       split by thin rules: the date, the patient "/ visit reason", the
       note text and a `PROVIDER … AUTHOR: …` line in Courier. An
       encounter with no note still prints, with its PROVIDER / AUTHOR:
       line alone (#24's first entry).
     · art. 301931 "Encounters" and 303239 "Scheduler Contents" describe an
       older window: Current Note / All Notes under Offset Note from Top and
       a "spaces from the top" box. Neither is on the v02.31.23 window, and
       no follow-up prompt for them is captured, so Offset prints the note
       on screen in the Progress Note(s) tab, or every note of the encounter
       (oldest first) when a blank New Note is on screen.
   ========================================================================= */

export type PrintNoteOption = 'offset' | 'cumulative'

export type PrintEncounterNoteJob = { title: string; pages: string[]; option: PrintNoteOption }

/** the encounter the window was opened from */
export type PrintNoteEncounter = { id: string; date: string; reason: string; provider: string }

const NAVY = '#000080'

export function PrintEncounterNoteDialog({ encounter, notes, current, onOk, onClose }: {
  encounter: PrintNoteEncounter
  /** this encounter's notes, oldest first */
  notes: SessionNote[]
  /** the note on screen in the Progress Note(s) tab; null on an unsaved one */
  current: SessionNote | null
  onOk: (job: PrintEncounterNoteJob) => void
  onClose: () => void
}) {
  const patient = usePatient()
  const area = useEncounterSession()
  const encounters = useChartRecords('encounter')
  const exported = useChartRecords('encounter_note')
  const [option, setOption] = useState<PrintNoteOption>('cumulative')
  const [from, setFrom] = useState(encounter.date || MOIS_TODAY)
  const [to, setTo] = useState(encounter.date || MOIS_TODAY)
  useScreenReport({ dialog: 'print-encounter-note', printOption: option })

  const name = `${patient.first} ${patient.last}`.toUpperCase()

  /* Cumulative: every encounter of the chart in the range, noted or not; the
     session's notes where the window has changed them, the chart's otherwise */
  const cumulative = useMemo(() => {
    const lo = from.trim(), hi = to.trim()
    const visits = [
      ...encounters.map((r) => ({
        id: r.id_encounter ?? '', date: date(r.dtm_appoint), reason: r.str_appt_note ?? '',
        provider: r.lkp_provider ?? r.str_attending ?? '',
      })),
      ...area.session.saved.map((s) => ({ id: s.id, date: s.date, reason: s.reason, provider: s.provider })),
    ]
    return visits
      .filter((v) => v.date && (!lo || v.date >= lo) && (!hi || v.date <= hi))
      .map((v) => ({
        ...v,
        notes: area.session.notes[v.id] ?? exported
          .filter((r) => r.id_encounter === v.id)
          .sort((a, b) => String(a.dtm_note_create ?? a.stp_date_create ?? '').localeCompare(String(b.dtm_note_create ?? b.stp_date_create ?? '')))
          .map((r): SessionNote => ({
            key: r.id_encounter_note ?? '', author: r.str_author ?? '', text: r.str_note ?? '',
            complete: r.str_complete === 'Y', createdBy: r.stp_user_create ?? '', created: '',
          })),
      }))
      /* most recent first */
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  }, [area.session.notes, area.session.saved, encounters, exported, from, to])

  const print = () => {
    if (option === 'cumulative') {
      const insurance = [patient.insuranceBy, patient.insurance].filter(Boolean).join(' ')
      onOk({ option, title: 'Cumulative Progress Notes', pages: [cumulativePage(name, patient.dob, insurance, cumulative)] })
      return
    }
    onOk({ option, title: 'Encounter Note', pages: [offsetPage(name, encounter, current ? [current] : notes)] })
  }

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', padding: 8, zIndex: 96 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.print-encounter-note"
        title="Print Encounter Note"
        onClose={onClose}
        style={{ width: 'min(360px, 100%)' }}
      >
        <div
          style={{ padding: '14px 12px 0' }}
          onKeyDown={(e) => { if (e.key === 'F2') { e.preventDefault(); print() } }}
        >
          <div style={{ border: '1px solid #a0a0a0', boxShadow: 'inset 1px 1px 0 #fff', paddingBottom: 18 }}>
            <Caption>Print Type</Caption>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 0 6px 82px' }}>
              <PBRadio
                name="print-note-mode"
                label="Offset Note from Top"
                checked={option === 'offset'}
                onChange={() => setOption('offset')}
                tutorialId="host.mois.field.print-note-offset-mode"
              />
              <PBRadio
                name="print-note-mode"
                label="Cumulative Note"
                checked={option === 'cumulative'}
                onChange={() => setOption('cumulative')}
                tutorialId="host.mois.field.print-note-cumulative"
              />
            </div>
            <Caption>Appointment Date Range (inclusive)</Caption>
            <div className="pb-row" style={{ gap: 6, padding: '4px 10px 0' }}>
              <span>Date(s):</span>
              <PBInput w={84} align="center" value={from}
                onChange={(e) => setFrom(e.target.value)} data-tutorial-id="host.mois.field.print-note-from" />
              <span style={{ margin: '0 4px' }}>to</span>
              <PBInput w={84} align="center" value={to}
                onChange={(e) => setTo(e.target.value)} data-tutorial-id="host.mois.field.print-note-to" />
            </div>
          </div>
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: '14px 0 14px', flex: 'none' }}>
          <DialogCommand id="print-encounter-note-print" onClick={print}>Print (F2)</DialogCommand>
          <DialogCommand id="print-encounter-note-cancel" onClick={onClose}>Cancel</DialogCommand>
        </div>
      </PBWindow>
    </div>
  )
}

/** a navy caption over a rule the width of the frame, as #21 paints both */
const Caption = ({ children }: { children: ReactNode }) => (
  <div style={{ color: NAVY, fontWeight: 700, padding: '5px 10px 3px', borderBottom: '1px solid #a0a0a0', boxShadow: '0 1px 0 #fff' }}>{children}</div>
)

function DialogCommand({ id, onClick, children }: { id: string; onClick: () => void; children: string }) {
  const host = usePBInstrumentation()
  return (
    <PBButton
      style={{ width: 74, minWidth: 0, height: 22 }}
      data-tutorial-id={host?.anchor('command', id)}
      onClick={() => { host?.report('command', { command: id }); onClick() }}
    >
      {children}
    </PBButton>
  )
}

/* --- the printouts (page markup: screens/PrintFlow ReportPage) ------------- */
const clean = (v: string) => v.replace(/\*\*/g, '').replace(/\|/g, '/').replace(/^%/gm, ' %')

/** Offset Note from Top (#23): date and patient, the note text, the provider. */
function offsetPage(name: string, enc: PrintNoteEncounter, notes: SessionNote[]): string {
  return [
    '',
    `%LINE:14,86%${enc.date}|${name}`,
    ...notes.flatMap((n) => clean(n.text).split(/\r\n|\r|\n/)),
    clean(enc.provider),
  ].join('\n')
}

/** Cumulative Note (#24): the header band, then every encounter in the
    range in list form, most recent first. */
function cumulativePage(
  name: string, dob: string, insurance: string,
  visits: { date: string; reason: string; provider: string; notes: SessionNote[] }[],
): string {
  const signOff = (provider: string, author: string) =>
    `%MONO%   PROVIDER ${clean(provider).padEnd(24)}  AUTHOR:  ${clean(author)}`
  return [
    `%BAND%**${name}**|**DOB: ${dob}**|**INSURANCE: ${clean(insurance)}**`,
    ...visits.flatMap((v) => [
      `%LINE:27,73%${v.date}|${name}${v.reason.trim() ? `  /  ${clean(v.reason)}` : ''}`,
      ...(v.notes.length
        ? v.notes.flatMap((n) => [
          ...clean(n.text).split(/\r\n|\r|\n/).map((l) => `%MONO% ${l}`),
          '',
          signOff(v.provider, n.author || n.createdBy),
        ])
        : [signOff(v.provider, '')]),
      '%HR%',
    ]),
  ].join('\n')
}
