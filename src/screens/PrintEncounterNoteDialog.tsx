import { useMemo, useState } from 'react'
import { useChartRecords } from '../data/chart-records'
import { date } from '../data/charts/relations'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { useEncounterSession, type SessionNote } from '../host/encounterArea'
import { useScreenReport } from '../host/screen-state'
import { PBButton, PBInput, PBRadio, PBWindow, usePBInstrumentation } from '../pb'

/* ============================================================================
   Print Encounter Note — what the note band's `Print Note` opens.

   PROVENANCE (text only; no capture of this window or of its printout is in
   the manual export):
     · art. 301931 "Encounters", under `d11b4456…` (the note band with
       Print Note / New Note / Delete Note): "The Print Note button allows
       you to print the Current Note, All Notes (both via the Offset Note from
       Top option) and Cumulative Notes. Cumulative Notes will print all
       notes from the specified appointment date ranges, with the most recent
       note first. Current Note will print the note that is shown in the
       Progress Notes view of the Encounter Detail Window. All Notes will
       print all notes included in this encounter, with the most recent note
       last."
     · art. 303239 "Scheduler Contents", Print Encounter: "Opens the Print
       Encounter Note window which allows you to choose between two print
       options: Offset Note from Top: This option prints the selected
       encounter with date, patient, provider and progress note (with
       author). You may select where on the page you'd like the information
       presented (enter the spaces from the top of the page). Cumulative
       Note: Enter the date range of Encounters you'd like printed. It will
       print the encounters found in this date range in list form including
       the date, patient's name and reason for encounter, provider and
       progress note (with author)."
   So the window is named, and its two options, the Current / All choice
   under the first, the spaces-from-top box and the date range under the
   second are all the manual's; their layout, the `Ok` / `Cancel` captions
   and the printout's typography are reconstructed, and kept plain. Ok hands
   the page to the frame's Print Preview (screens/PrintPreviewWindow), the
   window the manual's other day-book prints come back in (303239 Print
   List: "Pressing print will prompt a Print Preview window").
   ========================================================================= */

export type PrintNoteOption = 'current' | 'all' | 'cumulative'

export type PrintEncounterNoteJob = { title: string; pages: string[]; option: PrintNoteOption }

/** the encounter the window was opened from */
export type PrintNoteEncounter = { id: string; date: string; reason: string; provider: string }

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
  const [option, setOption] = useState<PrintNoteOption>(current ? 'current' : 'all')
  const [offset, setOffset] = useState('0')
  const [from, setFrom] = useState(encounter.date || MOIS_TODAY)
  const [to, setTo] = useState(MOIS_TODAY)
  useScreenReport({ dialog: 'print-encounter-note', printOption: option })

  const name = [patient.first, patient.middle, patient.last].filter(Boolean).join(' ').toUpperCase()

  /* Cumulative: every encounter of the chart in the range, the session's
     notes where the window has changed them, the chart's otherwise */
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
      .filter((v) => v.notes.length)
      /* "with the most recent note first" */
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [area.session.notes, area.session.saved, encounters, exported, from, to])

  const ok = () => {
    if (option === 'cumulative') {
      onOk({ option, title: 'Cumulative Progress Notes', pages: [cumulativePage(name, patient.chart, from, to, cumulative)] })
      return
    }
    const picked = option === 'current' ? (current ? [current] : []) : notes
    const blank = Math.max(0, Math.min(60, Number.parseInt(offset, 10) || 0))
    onOk({ option, title: 'Encounter Note', pages: [offsetPage(blank, name, encounter, picked)] })
  }

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', padding: 8, zIndex: 96 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.print-encounter-note"
        title="Print Encounter Note"
        onClose={onClose}
        style={{ width: 'min(430px, 100%)' }}
      >
        <div
          style={{ padding: '8px 12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}
          onKeyDown={(e) => { if (e.key === 'F2') { e.preventDefault(); ok() } }}
        >
          {/* no caption on the frame: none is in the manual's text */}
          <div style={{ border: '1px solid var(--pb-border)', padding: '8px 10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <PBRadio
                name="print-note-mode"
                label="Offset Note from Top"
                checked={option !== 'cumulative'}
                onChange={() => setOption(current ? 'current' : 'all')}
                tutorialId="host.mois.field.print-note-offset-mode"
              />
              <div className="pb-row" style={{ paddingLeft: 22, gap: 14 }}>
                <PBRadio name="print-note-which" label="Current Note" checked={option === 'current'} disabled={!current}
                  onChange={() => setOption('current')} tutorialId="host.mois.field.print-note-current" />
                <PBRadio name="print-note-which" label="All Notes" checked={option === 'all'}
                  onChange={() => setOption('all')} tutorialId="host.mois.field.print-note-all" />
              </div>
              <div className="pb-row" style={{ paddingLeft: 22, gap: 6 }}>
                <span>Spaces from Top:</span>
                <PBInput w={36} align="center" value={offset} disabled={option === 'cumulative'}
                  onChange={(e) => setOffset(e.target.value)} data-tutorial-id="host.mois.field.print-note-spaces" />
              </div>
              <PBRadio
                name="print-note-mode"
                label="Cumulative Note"
                checked={option === 'cumulative'}
                onChange={() => setOption('cumulative')}
                tutorialId="host.mois.field.print-note-cumulative"
              />
              <div className="pb-row" style={{ paddingLeft: 22, gap: 6 }}>
                <span>From:</span>
                <PBInput w={80} align="center" value={from} disabled={option !== 'cumulative'}
                  onChange={(e) => setFrom(e.target.value)} data-tutorial-id="host.mois.field.print-note-from" />
                <span style={{ marginLeft: 8 }}>To:</span>
                <PBInput w={80} align="center" value={to} disabled={option !== 'cumulative'}
                  onChange={(e) => setTo(e.target.value)} data-tutorial-id="host.mois.field.print-note-to" />
              </div>
            </div>
          </div>
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 19, padding: '12px 0 12px', flex: 'none' }}>
          <DialogCommand id="print-encounter-note-ok" isDefault onClick={ok}>Ok</DialogCommand>
          <DialogCommand id="print-encounter-note-cancel" onClick={onClose}>Cancel</DialogCommand>
        </div>
      </PBWindow>
    </div>
  )
}

function DialogCommand({ id, onClick, isDefault, children }: { id: string; onClick: () => void; isDefault?: boolean; children: string }) {
  const host = usePBInstrumentation()
  return (
    <PBButton
      className={isDefault ? 'pb-btn--default' : undefined}
      style={{ minWidth: 75 }}
      data-tutorial-id={host?.anchor('command', id)}
      onClick={() => { host?.report('command', { command: id }); onClick() }}
    >
      {children}
    </PBButton>
  )
}

/* --- the printouts (page markup: screens/PrintFlow ReportPage) ------------- */
const clean = (v: string) => v.replace(/\*\*/g, '').replace(/^%/gm, ' %')
const noteLines = (n: SessionNote) => [
  ...clean(n.text).split('\n'),
  `%G%Author: ${clean(n.author || n.createdBy)}`,
  '',
]

/** Offset Note from Top: the encounter's date, patient and provider, then
    its note(s) with their author, `blank` lines down the page. */
function offsetPage(blank: number, name: string, enc: PrintNoteEncounter, notes: SessionNote[]): string {
  return [
    ...Array.from({ length: blank }, () => ''),
    `**Date:** ${enc.date}`,
    `**Patient:** ${name}`,
    `**Provider:** ${clean(enc.provider)}`,
    '%RULE%',
    ...(notes.length ? notes.flatMap(noteLines) : ['%G%No progress note.']),
  ].join('\n')
}

/** Cumulative Note: the range's encounters in list form, most recent first. */
function cumulativePage(
  name: string, chart: string, from: string, to: string,
  visits: { date: string; reason: string; provider: string; notes: SessionNote[] }[],
): string {
  return [
    `%SUB%${name}   Chart: ${chart}   ${from} - ${to}`,
    ...(visits.length ? visits.flatMap((v) => [
      '%RULE%',
      `**${v.date}**   ${clean(v.reason)}   **Provider:** ${clean(v.provider)}`,
      /* "with the most recent note first" — within a visit too */
      ...[...v.notes].reverse().flatMap(noteLines),
    ]) : ['%RULE%', '%G%No encounter in this range has a progress note.']),
  ].join('\n')
}
