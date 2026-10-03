import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useChartExport, useChartRecords } from '../data/chart-records'
import type { MoisRecord } from '../data/charts'
import { date, encounterStamp, serviceEpisodes } from '../data/charts/relations'
import {
  selectFormRows,
  type EncounterFormRow, type FormListRow
} from '../data/encounterForms'
import {
  apptStatusCodes, providerSearchRows,
  serviceLocations,
  type ProviderSearchRow, type ServiceEpisodeRow
} from '../data/encounterPickers'
import { measureCalculators, type MeasureTemplate } from '../data/measures'
import { NEW_WCB_FORM, wcbFormFromExport, withDefaultClaim, type WcbFormState } from '../data/wcbForm'
import { stageStamp } from '../data/clock'
import { VISIT_MODE_CONCEPTS } from '../data/clinicManagement'
import { MOIS_TODAY } from '../data/patients'
import { usePatient } from '../data/patient-context'
import { DESKTOP_USER, useEncounterSession, type SessionNote } from '../host/encounterArea'
import { openFrameNode } from '../host/frame-nav'
import { useScreenReport } from '../host/screen-state'
import type { HostShellProps } from '../host/types'
import {
  IconIdCard,
  PBBand, PBButton, PBCaption, PBCheckbox, PBDataWindow, PBDropDownDataWindow,
  PBInput, PBInstrumentationProvider, PBLookup, PBMenuBar, PBPatientBannerBlue,
  PBSelect, PBTabs, PBTextArea, PBWindow,
  pbSlug, usePBInstrumentation, type PBMenuBarEntry, type PBMenuItem,
} from '../pb'
import { AddAttachmentDialog } from './AddAttachmentDialog'
import { useOpenWindow } from './areaWindowRegistry'
import { startLetter } from './LetterFlow'
import { BloodPressureFormWindow } from './BloodPressureFormWindow'
import { Phq9FormWindow } from './Phq9FormWindow'
import { ServiceCodeLookupDialog, UniversalSearchDialog } from './CodeLookupDialogs'
import { EncounterBanner, MspAppointmentTimes, NewNoteConfirmation, encounterTitle } from './EncounterChrome'
import {
  MeasureCalculatorDialog, MeasureCalculatorsDialog, MeasureTemplateGridDialog,
  MeasureTemplateSelectionDialog, MeasurementDetailDialog, defaultMeasureTemplate,
  type MeasurementRow,
} from './MeasureDialogs'
import { PrintEncounterNoteDialog } from './PrintEncounterNoteDialog'
import { PrintNoteForPatientDialog } from './PrintNoteForPatientDialog'
import { ServiceEventDialog, type ServiceEventRecord, type ServiceEventVisit } from './ServiceEventDialog'
import { WcbFormWindow } from './WcbFormWindow'
import { ModalLayer, ModalWindow } from './dialogKit'
import { DialogFooter } from './formKit'
import { useColumnFilters } from './listKit'
import { GRID_BOX, LookupBand, PickButtons, PickListWindow, SearchForRow } from './lookupKit'
import { usePrivateNoteBand, usePrivateNoteMask } from './PrivateNoteWindows'

/* ============================================================================
   The Encounter Detail Window (Ctrl+Z on an encounter, art. 301931).

   Its menu bar is the window's own, not the frame's, and is transcribed from
   the manual's captures of each menu:
     Save       — a command on the bar, F2 (301931 "Encounter Detail Toolbar")
     Chart Views — every chart folder with its hot key (`45a6e1c0…`)
     Action     — `fffcd6fe…` (the newer build: "Create Lab Requisition Order")
     Print      — one item, Selected Text (303092 `a4f8fc82…`); older builds
                  caption the whole menu "Print Selected Text"
     Utilities  — `84aeeadb…`: Health Maintenance, Spelling…, Create MSP Bill,
                  Calculators … (only on the Measurements tab), Paste Patient
                  Text, Flow Sheet Review
     Close      — a command on the bar, Esc
   The bar's anchors are namespaced `host.mois.encounter.menu.*` so a lesson
   can ring this window's Print rather than the frame's.

   The title, banner, MSP Appointment Time(s) strip, header form and tabs are
   checked against user captures 2026-09-25 #21, #22 and #33 (v02.31.23),
   three encounters of one chart: `[alias: …] NAME nn YEAR OLD s  chart no.:
   … -  encounter no.: …`; the banner and strip in screens/EncounterChrome;
   Date / time / Slots, Provider and Visit Code as greyed read-only boxes
   (Visit Code a plain box, not a drop-down), Ser. Loc. and Appt Status
   drop-downs, Visit Reason and Attending "…" editable; the Times column
   (Arrived / In-Room / Seen / Discharge, Duration of Care (minutes)); Health
   Issues · Services · Nbr. of · General Note; and the six tabs Progress
   Note(s) · Measurements · Service(s) · Detail / Coding · Encounter Summary
   · Encounter Forms.
   ========================================================================= */

const TABS = ['Progress Note(s)', 'Measurements', 'Service(s)', 'Detail / Coding', 'Encounter Summary', 'Encounter Forms']

/* The six tabs are one fixed width, 124px each, whichever is selected — the
   strip runs 276–1020 in every v02.31.23 TRAINING capture of the window
   (encounter-detail-progress.png, encounter-detail-measurements.png,
   encounter-detail-coding.png); the selected one is the usual 2px proud
   plate either side. The kit's fixed tab is 96px and grows with its caption,
   which made the strip shift as the bold caption moved, so the strip asks
   for PBTabs' `tabWidth`. */
const TAB_WIDTH = 124
const SCOPE = 'pb-encounter-detail'

/** Chart Views, `45a6e1c0…`: caption, hot key, and the tree node it opens. */
const CHART_VIEWS: [string, string | undefined, string][] = [
  ['Summary', 'Alt+H', 'summary'], ['Demographics', 'Alt+1', 'demographic'], ['Encounters', 'Alt+2', 'encounters'],
  ['Measures', 'Alt+3', 'measures'], ['Imaging', 'Alt+4', 'imaging'], ['Consults', 'Alt+5', 'consults'],
  ['Procedures', 'Alt+6', 'procedures'], ['Interventions', undefined, 'interventions'], ['Family History', 'Alt+7', 'famhx'],
  ['Reaction Risks', 'Alt+A', 'reaction'], ['Long Term Meds', 'Alt+C', 'ltm'], ['Medication Administration', undefined, 'mar'],
  ['Prescriptions', 'Alt+S', 'rx'], ['Social History / Risks', 'Alt+O', 'socialhx'], ['Documents', 'Alt+K', 'documents'],
  ['Health Issues', 'Alt+P', 'conditions'], ['Orders', 'Alt+F', 'orders'], ['Facility Admission', undefined, 'admissions'],
  ['Notifications', undefined, 'notifications'], ['Alerts', undefined, 'alerts'],
]

/* A window class in the PowerBuilder sense: one instance per encounter, so
   several can be open at once and each carries its own record. */
export type EncounterRecord = {
  id: string
  date?: string
  hr?: string
  mn?: string
  reason?: string
  loc?: string
  code?: string
  provider?: string
}

/* The Times column: caption and the stem of its tdt_encounter columns —
   dtm_<stem> the date, num_<stem>_hr / num_<stem>_min the time (the Data
   Dictionary workbook's Matrix rows 393–400; data/charts/relations.ts
   `encounterStamp` formats them). */
const ENCOUNTER_TIMES: [string, string][] = [
  ['Arrived:', 'arrived'], ['In-Room:', 'inroom'], ['Seen:', 'seen'], ['Discharge:', 'discharge'],
]

/** The note band's pending note: New Note, or the first note of an empty encounter. */
type Pending = { text: string; author: string; complete: boolean | null }

/* a blank New Note is stamped Created when it appears, before it is saved
   (#21/#22: "Created: 2026.09.25 10:41 JALIL, AHMAD" under an empty New
   Note *of 0) */
const stamp = () => `${stageStamp()}  ${DESKTOP_USER}`

/** a dialog the window has open over it; its id is what the tutorial snapshot reports */
type EncounterDialog =
  | { id: 'new-note-prompt' }
  | { id: 'print-note-for-patient'; text: string }
  /* the note band's Print Note (screens/PrintEncounterNoteDialog) */
  | { id: 'print-encounter-note' }
  | { id: 'add-attachment' }
  | null

export function EncounterWindow({ encounter, onClose, loadEncounterForms, encounterFormSlot }: {
  encounter?: EncounterRecord
  onClose: () => void
  encounterFormSlot?: HostShellProps['encounterFormSlot']
  loadEncounterForms?: () => Promise<FormListRow[]>
}) {
  const patient = usePatient()
  const area = useEncounterSession()
  const [tab, setTab] = useState('Progress Note(s)')
  const enc: EncounterRecord = encounter ?? { id: patient.encounter ?? 'NO ENCOUNTER' }
  const record = useChartRecords('encounter').find(r => r.id_encounter === enc.id)
  const time = enc.hr && enc.mn ? `${enc.hr} : ${enc.mn}` : ''

  /* the four coded-link rows and the attending provider, each of which is
     filled either by typing or by the picker its "…" opens */
  const [issues, setIssues] = useState([1, 2, 3, 4].map(i => record?.[`str_diag_code_${i}`] ?? ''))
  const [services, setServices] = useState([1, 2, 3, 4].map(i => record?.[`str_fee_code_${i}`] ?? ''))
  const [attending, setAttending] = useState(record?.str_attending ?? '')
  const [picking, setPicking] = useState<
    { kind: 'issue' | 'service'; row: number } | { kind: 'attending' } | null
  >(null)

  /* ---- the progress notes -------------------------------------------------
     The chart's own notes until the window first changes one; after that the
     session's copy, so a saved note survives the window being closed. */
  const exported = useChartRecords('encounter_note')
  const exportedNotes = useMemo<SessionNote[]>(() => exported
    .filter((r) => r.id_encounter === enc.id)
    .sort((a, b) => String(a.dtm_note_create ?? a.stp_date_create ?? '').localeCompare(String(b.dtm_note_create ?? b.stp_date_create ?? '')))
    .map((r, i) => ({
      key: r.id_encounter_note ?? `x${i}`,
      /* Author is tdt_encounter_note.id_author (MATRIX-R0420); the export
         names it in str_author, or — on a note written through the web
         forms API, which sets only the ids — in the computed cmp_author */
      author: r.str_author || r.cmp_author || '',
      text: r.str_note ?? '',
      complete: r.str_complete === 'Y',
      createdBy: r.stp_user_create || r.cmp_creator || '',
      created: [r.stp_date_create?.replace(/\//g, '.'), r.stp_user_create].filter(Boolean).join('  '),
      modified: [r.stp_date_modify?.replace(/\//g, '.'), r.stp_user_modify].filter(Boolean).join('  '),
      exported: true,
      lockedByAuthor: r.str_lock_by_author === 'Y',
      isPrivate: r.isprivate === 'Y',
    })), [exported, enc.id])
  const notes = area.session.notes[enc.id] ?? exportedNotes
  const setNotes = (next: SessionNote[]) => area.update((s) => ({ ...s, notes: { ...s.notes, [enc.id]: next } }))
  const [noteIndex, setNoteIndex] = useState(() => Math.max(0, notes.length - 1))
  /* an encounter with no note opens on a blank one, the band reading New Note */
  const [pending, setPending] = useState<Pending | null>(() => (notes.length ? null : { text: '', author: '', complete: null }))
  const [pendingCreated, setPendingCreated] = useState(stamp)
  const noteBox = useRef<HTMLTextAreaElement | null>(null)

  const [dialog, setDialog] = useState<EncounterDialog>(null)

  const showing = pending ? null : notes[Math.min(noteIndex, notes.length - 1)]
  /* private notes print and summarise as their private line (3799734,
     screens/PrivateNoteWindows.tsx) */
  const maskPrivate = usePrivateNoteMask(enc.id)
  /* only the creator or the author may change a note (the Encounter Note User
     Lock, on by default); the chart's other users' notes open read-only.
     A note its author completed is locked outright — "MOIS will also mark
     your progress note as Complete … If you do not want to lock the
     Progress Note, simply deselect the Complete checkbox" (301931); the
     export records that lock as str_lock_by_author = Y with the day in
     dtm_lock_by_author, on exactly its completed, authored notes. */
  const editable = (n: SessionNote) => !n.lockedByAuthor && (!n.exported || n.createdBy === DESKTOP_USER || n.author === DESKTOP_USER)
  const noteStatus = pending ? (pending.text.trim() ? 'draft' : 'empty')
    : showing ? (showing.complete ? 'complete' : 'incomplete') : 'none'

  /* what the tutorial snapshot reads back as host.screen.* */
  useScreenReport({
    encounter: enc.id, notes: notes.length, noteStatus,
    /* The visible note counter, without its text or author. It distinguishes
       walking back to an existing note from merely opening the note tab. */
    noteIndex: pending ? 0 : notes.length ? Math.min(noteIndex, notes.length - 1) + 1 : 0,
    completeNotes: notes.filter((note) => note.complete).length,
    reviews: area.session.reviews[enc.id]?.length ?? 0,
  })
  useScreenReport(dialog ? { dialog: dialog.id } : {})

  /* the open window is the active encounter (301931 "Active Encounter"):
     what a review done in the chart behind it reports onto */
  useEffect(() => {
    area.update((s) => ({ ...s, open: [...s.open.filter((id) => id !== enc.id), enc.id] }))
    return () => area.update((s) => ({ ...s, open: s.open.filter((id) => id !== enc.id) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enc.id])

  /* Use the frame's navigation route: the Patient Chart tree may not be
     mounted while an encounter is open over another module's workspace. */
  const chartView = (node: string) => {
    openFrameNode(node)
  }

  /* Save (F2): "MOIS will save anything done in the Encounter Detail Window.
     MOIS will also mark your progress note as Complete, by entering your name
     … beside 'Created By'. … If you do not want to lock the Progress Note,
     simply deselect the Complete checkbox and click 'Save'." */
  const save = () => {
    if (pending) {
      if (!pending.text.trim()) return
      const stampNow = `${MOIS_TODAY}  ${DESKTOP_USER}`
      const note: SessionNote = {
        key: `s${Date.now()}`,
        author: pending.author || DESKTOP_USER,
        text: pending.text,
        complete: pending.complete ?? true,
        createdBy: DESKTOP_USER,
        created: stampNow,
      }
      setNotes([...notes, note])
      setNoteIndex(notes.length)
      setPending(null)
      return
    }
    /* an existing note of one's own: Save stamps it again */
    if (showing && editable(showing)) {
      setNotes(notes.map((n) => (n.key === showing.key ? { ...n, modified: `${MOIS_TODAY}  ${DESKTOP_USER}` } : n)))
    }
  }

  /* New Note asks every time, even over a blank New Note (#22), unless
     "Always create new note" was ticked */
  const createNote = () => {
    /* a note typed but not yet saved is kept as the note before it */
    if (pending?.text.trim()) {
      setNotes([...notes, { key: `s${Date.now()}`, author: pending.author || DESKTOP_USER, text: pending.text, complete: false, createdBy: DESKTOP_USER, created: `${MOIS_TODAY}  ${DESKTOP_USER}` }])
    }
    if (!pending || pending.text.trim()) setPendingCreated(stamp())
    setPending({ text: '', author: '', complete: null })
    setTab('Progress Note(s)')
  }
  const newNote = () => {
    if (area.session.alwaysNewNote) createNote()
    else setDialog({ id: 'new-note-prompt' })
  }

  /* Print ▸ Selected Text: the highlight in the note box, or in whichever
     free-text field of this window has one */
  const printSelected = () => {
    const box = noteBox.current
    const active = typeof document !== 'undefined' ? document.activeElement : null
    const field = active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement ? active : box
    const text = field && field.selectionStart != null && field.selectionEnd != null
      ? field.value.slice(field.selectionStart, field.selectionEnd)
      : ''
    setDialog({ id: 'print-note-for-patient', text })
  }

  const openWindow = useOpenWindow()
  const letter = (doc: string) => startLetter(doc, () => { openWindow('select-letter-template') }, openWindow)
  const menu: PBMenuBarEntry[] = [
    { label: 'Save', onSelect: save },
    { label: 'Chart Views', menu: [
      ...CHART_VIEWS.map(([label, key, node]) => ({ label, key, onSelect: () => chartView(node) })),
      { sep: true },
      { label: 'Unsent', key: 'Alt+9' },
    ] },
    { label: 'Action', menu: [
      /* the frame's letter flow, the way Action on a chart folder starts it
         (screens/LetterFlow.tsx): the type rides with the letter */
      { label: 'Create Referral Note', key: 'Ctrl+R', onSelect: () => letter('referral') },
      { label: 'Create Consult Note', key: 'Ctrl+Shift+R', onSelect: () => letter('consult') },
      /* "MOIS automatically creates an Order record with the Order Type listed
         as the option you've chosen. MOIS then opens the attachment window,
         allowing you to choose the appropriate form." (301931, 303062) */
      ...['Lab', 'Image', 'Procedure', 'Misc.'].map((kind) => ({
        label: `Create ${kind} Requisition Order`,
        onSelect: () => setDialog({ id: 'add-attachment' }),
      })),
      { label: 'Create Information Request', onSelect: () => letter('information-request') },
      { label: 'Administer a Medication' },
      { label: 'Administer an Immunization' },
      { label: 'Distribute Care Plan' },
      { label: 'Print Label', key: 'Ctrl+L' },
      { sep: true },
      { label: 'Create Recall' },
      { label: 'Show Recall List' },
      { sep: true },
      { label: 'Default Service Code 1', key: 'F11' },
      { label: 'Default Service Code 2', key: 'F12' },
      { sep: true },
      { label: 'Create Task', key: 'Ctrl+K' },
      { label: 'Create Message', key: 'Ctrl+M' },
      { label: 'Attachments', onSelect: () => setDialog({ id: 'add-attachment' }) },
      { label: 'Prompt', key: 'F4' },
    ] },
    { label: 'Print', menu: [{ label: 'Selected Text', onSelect: printSelected }] },
    { label: 'Utilities', menu: [
      { label: 'Health Maintenance', key: 'Ctrl+H', onSelect: () => { area.open('health-maintenance-review') } },
      { label: 'Spelling...', key: 'Ctrl+F7' },
      { label: 'Create MSP Bill', key: 'Ctrl+B' },
      /* greyed off the Measurements tab, the way `84aeeadb…` shows it */
      {
        label: 'Calculators ...',
        disabled: tab !== 'Measurements',
        menu: measureCalculators.map((c): PBMenuItem => ({ label: c, onSelect: () => setCalculator(c) })),
      },
      { label: 'Paste Patient Text' },
      { label: 'Flow Sheet Review', onSelect: () => { area.open('flow-sheet-review') } },
    ] },
    { label: 'Close', onSelect: onClose },
  ]

  /* the Calculators … fly-out opens the calculator over the Measurements tab */
  const [calculator, setCalculator] = useState<string | null>(null)

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'F2') { e.preventDefault(); save() }
    else if (e.key === 'Escape' && !dialog) { e.preventDefault(); onClose() }
    else if (e.ctrlKey && e.shiftKey && (e.key === 'N' || e.key === 'n')) { e.preventDefault(); printSelected() }
  }

  return (
    <PBWindow
      /* the MDI child a lesson rings when it is talking about the open
         encounter rather than the chart behind it */
      tutorialId="host.mois.window.encounter"
      child
      icon={<IconIdCard />}
      title={encounterTitle(patient)}
      sub={<>chart no.: {patient.chart} -&nbsp;&nbsp;&nbsp;encounter no.: {enc.id}</>}
      onClose={onClose}
      /* 800 wide in the manual's captures (d11b4456…, a02db6dd…); the live
         v02.31.23 TRAINING window measures 824 at the stage's 1:1 scale
         (encounter-detail-header.png, x 276–1100), so the chart folder behind
         still stays in view beside it */
      style={{ width: 824, height: 770, maxWidth: '100%', maxHeight: '100%' }}
    >
      <div className={SCOPE} style={{ display: 'contents' }} onKeyDown={onKeyDown}>
        <EncounterMenuBar items={menu} />

        <EncounterBanner patient={patient} />
        <MspAppointmentTimes />

        {/* ---- the dense encounter header form ------------------------------
            Four visual columns: identity, times, coded links, general note.
            Every row is on a 19px pitch (Date 163 … Attending 277, Arrived
            182 … Duration of Care 258) and the columns sit at the x the
            TRAINING capture paints them, measured from the window's left
            edge: Arrived 316 / its time 378–418, Health Issues 445–524,
            Services 533–612, Nbr. of 618–654, General Note 659–814
            (encounter-detail-header.png; evidence/MATRIX-R0383-date,
            MATRIX-R0401-duration-of-care). */}
        <div style={{ display: 'flex', alignItems: 'flex-start', padding: '4px 6px 6px', gap: 0, flex: 'none' }}>
          {/* column 1 — identity */}
          <div className="pb-form" style={{ padding: 0, gridTemplateColumns: 'auto 1fr', width: 250, flex: 'none', ['--pb-row-gap' as string]: '0px' }}>
            <span className="pb-form__label">Date:</span>
            <div className="pb-row">
              <PBInput key={enc.id + 'd'} w={62} align="center" readOnly defaultValue={enc.date ?? ''} />
              <PBInput key={enc.id + 't'} w={42} align="center" readOnly defaultValue={time || '0 : 00'} />
              <span style={{ marginLeft: 12 }}>Slots:</span>
              <PBInput w={25} align="center" readOnly defaultValue={record?.num_time_slots ?? ''} />
            </div>

            <span className="pb-form__label">Provider:</span>
            <PBInput w={182} readOnly defaultValue={record?.lkp_provider ?? enc.provider ?? ''} />

            <span className="pb-form__label">Ser. Loc.:</span>
            <PBDropDownDataWindow
              key={enc.id + 'l'}
              columns={[{ key: 'name', header: 'Service Location' }]}
              rows={serviceLocations}
              value={enc.loc || ''}
              listW={330}
              tutorialId="host.mois.lookup.service-location"
            />

            <span className="pb-form__label">Visit Code:</span>
            {/* a greyed box in v02.31.23 (#21, #33), not the drop-down the
                older manual captures show */}
            <PBInput w={62} readOnly defaultValue={record?.str_visit_code ?? enc.code ?? ''} data-tutorial-id="host.mois.field.visit-code" />

            <span className="pb-form__label">Visit Reason:</span>
            <PBInput key={enc.id + 'r'} defaultValue={enc.reason ?? ''} />

            <span className="pb-form__label">Appt Status:</span>
            <PBDropDownDataWindow
              columns={[
                { key: 'code', header: 'Code', width: 52 },
                { key: 'description', header: 'Description', width: 160 },
              ]}
              rows={apptStatusCodes}
              value={record?.str_appt_status ?? ''}
              display="code"
              /* 350–405 in encounter-detail-header.png */
              w={56}
              listW={214}
              tutorialId="host.mois.lookup.appt-status"
            />

            <span className="pb-form__label">Attending:</span>
            <PBLookup
              name="attending"
              value={attending}
              onChange={setAttending}
              onDots={() => setPicking({ kind: 'attending' })}
            />
          </div>

          {/* column 2 — times: a 58px date box and a 40px time box per row,
              the caption over the labels rather than the boxes */}
          <div style={{ width: 162, flex: 'none' }}>
            <div style={{ height: 19, lineHeight: '19px', paddingLeft: 41 }}><PBCaption>Times</PBCaption></div>
            {/* the four labels flush left at 263, not right against the box */}
            {/* each row is the stamp's date box and its hour : minute box,
                tdt_encounter.dtm_<stamp> and num_<stamp>_hr / _min (the
                Data Dictionary workbook's Matrix rows 393–400, Times ▸
                Arrived … Discharge ▸ Date / Time) */}
            {ENCOUNTER_TIMES.map(([l, stem]) => {
              const at = encounterStamp(record, stem)
              return (
                <div className="pb-row" key={l} style={{ height: 19, gap: 4, justifyContent: 'flex-end' }}>
                  <span style={{ width: 49, flex: 'none' }}>{l}</span>
                  <PBInput key={`${enc.id}${stem}d`} w={58} defaultValue={at.date} data-tutorial-id={`host.mois.field.${stem}-date`} />
                  <PBInput key={`${enc.id}${stem}t`} w={40} align="center" defaultValue={at.time || ':'} data-tutorial-id={`host.mois.field.${stem}-time`} />
                </div>
              )
            })}
            <div className="pb-row" style={{ height: 19, gap: 4, justifyContent: 'flex-end' }}>
              {/* `(minutes)` after the box, as the v02.31 capture paints it:
                  the box lines up under Arrived's date box (592–650) */}
              <span>Duration of Care:</span><PBInput w={58} defaultValue={record?.num_duration_of_care ?? ''} /><span style={{ width: 40, overflow: 'visible' }}>(minutes)</span>
            </div>
          </div>

          {/* column 3 — coded links */}
          <div style={{ flex: 'none', paddingLeft: 27 }}>
            <div className="pb-row" style={{ height: 19, gap: 0 }}>
              <span style={{ width: 88 }}><PBCaption>Health Issues</PBCaption></span>
              <span style={{ width: 80 }}><PBCaption>Services</PBCaption></span>
              <span style={{ whiteSpace: 'nowrap' }}><PBCaption>Nbr. of</PBCaption></span>
            </div>
            {/* each pair is a lookup: Health Issues opens the Universal Search
                Window, Services the Master Service Code List */}
            {[0, 1, 2, 3].map((i) => (
              <div className="pb-row" key={i} style={{ height: 19, gap: 0 }}>
                <PBLookup
                  w={79}
                  name={`health-issue-${i + 1}`}
                  value={issues[i] ?? ''}
                  onChange={(v) => setIssues((r) => r.map((x, j) => (j === i ? v : x)))}
                  onDots={() => setPicking({ kind: 'issue', row: i })}
                />
                <span style={{ width: 9, flex: 'none' }} />
                <PBLookup
                  w={79}
                  name={`service-${i + 1}`}
                  value={services[i] ?? ''}
                  onChange={(v) => setServices((r) => r.map((x, j) => (j === i ? v : x)))}
                  onDots={() => setPicking({ kind: 'service', row: i })}
                />
                <span style={{ width: 6, flex: 'none' }} />
                {/* Nbr. Of n is tdt_encounter.num_no_service_n, shown with
                    its .00 (workbook rows 413–416); an unbilled row is "-" */}
                <PBInput key={`${enc.id}n${i}`} w={36} align="center" defaultValue={record?.[`num_no_service_${i + 1}`] || '-'} />
              </div>
            ))}
          </div>

          {/* column 4 — general note, 155 × 70 beside Nbr. of */}
          <div style={{ flex: '1 1 auto', minWidth: 0, paddingLeft: 5 }}>
            <div style={{ height: 19, lineHeight: '19px', paddingLeft: 3 }}><PBCaption>General Note</PBCaption></div>
            {/* tdt_encounter.str_office_note (MATRIX-R0417-general-note) */}
            <PBTextArea key={`${enc.id}g`} rows={4} w="100%" style={{ height: 70, marginTop: 3 }} defaultValue={record?.str_office_note ?? ''} />
          </div>
        </div>

        {/* ---- tabbed detail ---- */}
        <div className="pb-encounter-detail__tabs" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 3px 3px' }}>
          <PBTabs tabs={TABS} active={tab} onChange={setTab} tabWidth={TAB_WIDTH}>
            {tab === 'Progress Note(s)' && (
              <ProgressNotePage
                notes={notes}
                index={Math.min(noteIndex, Math.max(0, notes.length - 1))}
                onIndex={(i) => { setPending(null); setNoteIndex(i) }}
                pending={pending}
                pendingCreated={pendingCreated}
                onPending={setPending}
                onNote={(n) => setNotes(notes.map((x) => (x.key === n.key ? n : x)))}
                editable={editable}
                onNewNote={newNote}
                onPrintNote={() => setDialog({ id: 'print-encounter-note' })}
                encounter={enc}
                onDelete={() => {
                  if (pending) { if (notes.length) setPending(null); else setPending({ text: '', author: '', complete: null }); return }
                  if (!showing || !editable(showing)) return
                  const rest = notes.filter((n) => n.key !== showing.key)
                  setNotes(rest)
                  setNoteIndex(Math.max(0, rest.length - 1))
                  if (!rest.length) setPending({ text: '', author: '', complete: null })
                }}
                boxRef={noteBox}
              />
            )}
            {tab === 'Measurements' && (
              <MeasurementsPage
                encounter={enc.id}
                encounterDate={enc.date ?? ''}
                calculator={calculator}
                onCalculator={setCalculator}
              />
            )}
            {tab === 'Service(s)' && (
              <ServicesPage
                encounter={enc.id}
                visit={{
                  date: enc.date ?? '', time,
                  visit: record?.str_visit_code ?? enc.code ?? '',
                  /* the banner's ATTENDING is the encounter's provider */
                  attending: record?.lkp_provider ?? enc.provider ?? record?.str_attending ?? '',
                  location: record?.str_service_location ?? enc.loc ?? '',
                  note: record?.str_appt_note ?? enc.reason ?? '',
                }}
              />
            )}
            {tab === 'Detail / Coding' && (
              <CodingPage
                record={record}
                /* Docu. Status follows the notes: C once one is complete */
                docuStatus={area.session.notes[enc.id] ? (notes.some((n) => n.complete) ? 'C' : 'I') : undefined}
              />
            )}
            {tab === 'Encounter Summary' && <EncounterSummaryPage encounter={enc.id} encounterDate={enc.date ?? ''} notes={maskPrivate(notes)} />}
            <div style={{ display: tab === 'Encounter Forms' ? 'flex' : 'none', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
              <EncounterFormsPage encounterId={enc.id} encounterDate={enc.date ?? ''} notes={notes} attendingFallback={record?.str_attending ?? ''} loadEncounterForms={loadEncounterForms} encounterFormSlot={encounterFormSlot} />
            </div>
          </PBTabs>
        </div>
      </div>

      {picking?.kind === 'issue' && (
        <UniversalSearchDialog
          onPick={(r) => {
            setIssues((rows) => rows.map((x, j) => (j === picking.row ? r.term : x)))
            setPicking(null)
          }}
          onClose={() => setPicking(null)}
        />
      )}
      {picking?.kind === 'service' && (
        <ServiceCodeLookupDialog
          onPick={(r) => {
            setServices((rows) => rows.map((x, j) => (j === picking.row ? r.code : x)))
            setPicking(null)
          }}
          onClose={() => setPicking(null)}
        />
      )}
      {picking?.kind === 'attending' && (
        <ProviderSearchDialog
          onPick={(r) => { setAttending(r.name); setPicking(null) }}
          onClose={() => setPicking(null)}
        />
      )}

      {/* New Note: "press Yes when prompted to create another progress note"
          (art. 2646482); the prompt itself is user capture 2026-09-25 #22 */}
      {dialog?.id === 'new-note-prompt' && (
        <NewNoteConfirmation
          onAnswer={(yes, always) => {
            setDialog(null)
            if (!yes) return
            if (always) area.update((s) => ({ ...s, alwaysNewNote: true }))
            createNote()
          }}
        />
      )}
      {dialog?.id === 'print-note-for-patient' && (
        <PrintNoteForPatientDialog
          text={dialog.text}
          onOk={({ attach }) => {
            if (attach) area.update((s) => ({ ...s, attachments: { ...s.attachments, [`documents:${enc.id}`]: (s.attachments[`documents:${enc.id}`] ?? 0) + 1 } }))
            setDialog(null)
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.id === 'print-encounter-note' && (
        <PrintEncounterNoteDialog
          encounter={{ id: enc.id, date: enc.date ?? '', reason: enc.reason ?? record?.str_appt_note ?? '', provider: record?.lkp_provider ?? enc.provider ?? record?.str_attending ?? '' }}
          notes={maskPrivate(notes)}
          current={showing ?? null}
          onOk={({ title, pages }) => { setDialog(null); openWindow('print-preview', { title, pages, bare: true }) }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.id === 'add-attachment' && (
        <AddAttachmentDialog
          target={`encounter:${enc.id}`}
          onOk={() => setDialog(null)}
          onClose={() => setDialog(null)}
        />
      )}
    </PBWindow>
  )
}

/* The window's menu bar under its own anchor namespace. The frame's bar and
   this one both have a Print, an Action and a Utilities; without the prefix
   a lesson could only ever ring the frame's. Clicks are reported to the frame
   as `host.mois.encounterMenu`. */
function EncounterMenuBar({ items }: { items: PBMenuBarEntry[] }) {
  const outer = usePBInstrumentation()
  return (
    <PBInstrumentationProvider
      namespace="host.mois.encounter"
      onAction={(action, payload) => { if (action === 'host.mois.encounter.menu') outer?.report('encounterMenu', payload) }}
    >
      <PBMenuBar items={items} />
    </PBInstrumentationProvider>
  )
}

/* ============================================================================
   Encounter Forms — the forms filed against this encounter.

   `New Form` opens the Select Form picker; picking one and pressing
   `Create Form` files it here. MOIS lists a completed web form under the
   ASSESSMENT type rather than the ATTACHMENT type it is registered as.
   ========================================================================= */

/* The export stores a form's type and window by id; MOIS prints their names
   (301931 `268ad625…`: "ENCOUNTER FORMS / ASTHMA / DR. DEREK SHEPHERD").
   Only the ids chart 87288 carries are named here. Form type 1001 is the
   one its WCB REPORT form is filed under, and the current build lists WCB
   REPORT as INSURANCE FORMS on this tab (user capture 2026-09-25 #33,
   v02.31.23: ENCOUNTER FORMS / DIABETES, then INSURANCE FORMS / WCB REPORT);
   data/charts/to-rows.ts `encforms` names it the same way. */
const FORM_TYPES: Record<string, string> = { '1001': 'INSURANCE FORMS' }
const FORM_WINDOWS: Record<string, string> = { WP_FORM_HEADER_WCB: 'WCB REPORT' }

/* The built-in forms the Select Form list carries beside the registered
   ones. 303118 `1800dc96…` (and the older 303852 `b838ba20…`) list WCB
   Report under INSURANCE FORMS, and the form it creates is filed under that
   type on the Encounter Forms tab. */
const WCB_REPORT = 'WCB REPORT'
const BUILT_IN_FORMS: FormListRow[] = [{ type: 'INSURANCE FORMS', name: WCB_REPORT, version: '' }]

/** a filed form, with who made it and when — the WCB Form's `Create by` / `Date` */
type FiledForm = EncounterFormRow & { createdBy?: string; created?: string }

function EncounterFormsPage({ encounterId, encounterDate, notes, attendingFallback, loadEncounterForms, encounterFormSlot }: {
  encounterId: string
  encounterDate: string
  /** the encounter's progress notes — what Assign Progress Note offers */
  notes: SessionNote[]
  /** the encounter's attending, for a form whose author is the export's -1 */
  attendingFallback: string
  loadEncounterForms?: () => Promise<FormListRow[]>
  encounterFormSlot?: HostShellProps['encounterFormSlot']
}) {
  const patient = usePatient()
  const area = useEncounterSession()
  const forms = useChartRecords('form_header').filter(r => r.id_encounter === encounterId)
  const wcbRecords = useChartRecords('form_wcb')
  const [rows, setRows] = useState<FiledForm[]>(() => forms.map(r => ({
    type: FORM_TYPES[r.id_form_type ?? ''] ?? r.id_form_type ?? '',
    name: FORM_WINDOWS[r.str_form_window ?? ''] ?? r.str_form_window ?? '',
    attending: r.id_author && r.id_author !== '-1' ? r.id_author : attendingFallback,
    formId: r.id_form_header,
    createdBy: r.stp_user_create ?? '',
    created: date(r.dtm_created),
  })))
  const [opened, setOpened] = useState<FiledForm | null>(null)
  /* the WCB Form open over the window */
  const [wcb, setWcb] = useState<FiledForm | null>(null)
  const formData = useRef<Record<string, Record<string, unknown>>>({})
  const [cur, setCur] = useState(0)
  const [picking, setPicking] = useState(false)
  useScreenReport(picking ? { dialog: 'select-form' } : opened?.presetKey && encounterFormSlot ? { dialog: 'webform' } : {})

  /* what the WCB Form opens on: this session's save, else the chart's saved
     form, else a new form with the chart's Default claim pulled in */
  const wcbInitial = (row: FiledForm): WcbFormState => {
    const id = row.formId ?? ''
    const savedForm = area.session.wcbForms[id]
    if (savedForm) return savedForm
    const record = wcbRecords.find((r) => r.id_form_header === id)
    return record ? wcbFormFromExport(record) : withDefaultClaim({ ...NEW_WCB_FORM }, patient.wcbClaims)
  }
  const open = (row: FiledForm) => {
    if (row.presetKey) setOpened(row)
    else if (row.name === WCB_REPORT) setWcb(row)
  }
  return (
    <>
      <div className="pb-cmdrow" style={{ padding: 2 }}>
        <PBButton
          bare
          className="pb-cmdrow__btn"
          command="new-form"
          onClick={() => setPicking(true)}
        >
          New Form
        </PBButton>
        <PBButton
          bare
          className="pb-cmdrow__btn"
          command="delete-form"
          onClick={() => setRows((r) => r.filter((_, i) => i !== cur))}
        >
          Delete Form
        </PBButton>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          flush
          columns={[
            { key: 'type', header: 'Form Type', width: 268, headAlign: 'center' },
            { key: 'name', header: 'Form Name', width: 302, headAlign: 'center' },
            { key: 'attending', header: 'Attending', width: 222, headAlign: 'center' },
          ]}
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(row) => open(row)}
          rowTutorialId={(r) => `host.mois.row.form-${pbSlug(String(r.name))}`}
          empty=""
        />
      </div>
      {opened?.presetKey && opened.formId && encounterFormSlot && (
        <EncounterWebformWindow onClose={() => setOpened(null)}>
          {encounterFormSlot({
            presetKey: opened.presetKey, encounterId, formId: opened.formId,
            initialData: formData.current[opened.formId],
            onFormDataChange: (data) => { formData.current[opened.formId!] = data },
            onClose: () => setOpened(null),
          })}
        </EncounterWebformWindow>
      )}
      {wcb && (
        <WcbFormWindow
          encounterId={encounterId}
          encounterDate={encounterDate}
          attending={attendingFallback}
          createdBy={wcb.createdBy ?? ''}
          created={wcb.created ?? ''}
          initial={wcbInitial(wcb)}
          notes={notes}
          onSave={(form) => area.update((s) => ({ ...s, wcbForms: { ...s.wcbForms, [wcb.formId ?? '']: form } }))}
          onClose={() => setWcb(null)}
        />
      )}
      {picking && (
        <SelectFormDialog
          loadEncounterForms={loadEncounterForms}
          builtIn={BUILT_IN_FORMS}
          onCreate={(f) => {
            /* an ATTACHMENT web form is filed under the clinical type MOIS
               assigns it (ASSESSMENT); every other type keeps its own — a
               built-in form (INSURANCE FORMS for the WCB Report, `1800dc96…`)
               and an encounter form alike: Create Form on ENCOUNTER FORMS /
               DIABETES leaves an "ENCOUNTER FORMS / DIABETES" row (Mois
               references/patient-chart.md "Diabetes Encounter Template";
               301931 `268ad625…` ENCOUNTER FORMS / ASTHMA / its attending) */
            const attachment = f.type === 'ATTACHMENT'
            const row: FiledForm = {
              type: attachment ? 'ASSESSMENT' : f.type, name: f.name, attending: attachment ? '' : attendingFallback,
              presetKey: f.presetKey, formId: crypto.randomUUID(), createdBy: DESKTOP_USER, created: MOIS_TODAY,
            }
            setRows((r) => [...r, row])
            setCur(rows.length)
            setPicking(false)
            open(row)
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  )
}

/** The `Select Form` picker: a filterable list of every registered form. */
/** MOIS hosts the modern webform renderer in a separate File / View window. */
export function EncounterWebformWindow({ children, onClose, title = 'MOIS' }: { children: ReactNode; onClose: () => void; title?: string }) {
  const [maximized, setMaximized] = useState(false)
  const toggleMaximized = () => setMaximized((value) => !value)
  return (
    <ModalLayer zIndex={91} style={{ position: 'fixed', padding: maximized ? 0 : 8 }}>
      <PBWindow title={title} child onClose={onClose} onMinimize={onClose}
        tutorialId="host.mois.window.webform"
        maximized={maximized} onMaximize={toggleMaximized}
        style={{ width: maximized ? '100%' : 'min(1020px, 100%)', height: maximized ? '100%' : 'min(830px, 100%)' }}>
        <PBMenuBar items={[
          { label: 'File', menu: [{ label: 'Close', onSelect: onClose }] },
          { label: 'View', menu: [{ label: maximized ? 'Restore Down' : 'Maximize', onSelect: toggleMaximized }] },
        ]} />
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
          {children}
        </div>
      </PBWindow>
    </ModalLayer>
  )
}

export function SelectFormDialog({ onCreate, onClose, loadEncounterForms, builtIn = [] }: {
  onCreate: (form: FormListRow) => void
  onClose: () => void
  loadEncounterForms?: () => Promise<FormListRow[]>
  /** the window-backed forms listed after the registered ones */
  builtIn?: FormListRow[]
}) {
  const [cur, setCur] = useState(0)
  const [forms, setForms] = useState(loadEncounterForms ? [] : selectFormRows)
  const [loading, setLoading] = useState(Boolean(loadEncounterForms))
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!loadEncounterForms) return
    let active = true
    loadEncounterForms().then((rows) => {
      if (active) { setForms(rows); setLoading(false); setCur(0) }
    }).catch(() => {
      if (active) { setError('Could not load the MOIS forms. Close this window and try again.'); setLoading(false) }
    })
    return () => { active = false }
  }, [loadEncounterForms])
  const { shown, filterRow } = useColumnFilters([...forms, ...(loading ? [] : builtIn)], [
    { key: 'type', anchor: 'form-type' },
    { key: 'name', anchor: 'form-name' },
    { key: 'version' },
  ], { match: 'lower', onChange: () => setCur(0) })
  return (
    <ModalLayer zIndex={90} style={{ position: 'fixed', padding: 8 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.select-form"
        className="pb-select-form"
        title="Select Form"
        onClose={onClose}
        style={{ width: 'min(735px, 100%)', height: 'min(698px, 100%)' }}
      >
        <div className="pb-select-form__list">
          <PBBand>Form List</PBBand>
          {error && <div role="alert" style={{ padding: 8 }}>{error}</div>}
          <PBDataWindow
            flush
            columns={[
              { key: 'type', header: 'Form Type', width: 252, headAlign: 'center' },
              { key: 'name', header: 'Form Name', headAlign: 'center' },
              { key: 'version', header: 'Version', width: 48, headAlign: 'center' },
            ]}
            filters={filterRow}
            rows={shown}
            empty={loading ? 'Loading MOIS forms…' : 'No matching forms'}
            current={cur}
            onCurrentChange={setCur}
            rowTutorialId={(r) => `host.mois.row.select-form-${pbSlug(String(r.name))}`}
          />
        </div>
        <div className="pb-row pb-select-form__actions">
          <PBButton
            style={{ minWidth: 108 }}
            command="create-form"
            disabled={loading || !shown[cur]}
            onClick={() => shown[cur] && onCreate(shown[cur]!)}
          >
            Create Form
          </PBButton>
          <PBButton style={{ minWidth: 108 }} onClick={onClose}>Cancel</PBButton>
        </div>
      </PBWindow>
    </ModalLayer>
  )
}


/* ============================================================================
   Encounter Summary — the visit as one text page.

   MOIS paints this tab as a report, not a grid (301931 `a02db6dd…`, 303116
   `92edff12…`): grey fixed-pitch bands — PROGRESS NOTE with the author and
   Last Modified under it, TEST NAME : LINKED TO ENCOUNTER / VALUE / UNITS /
   FL, and one REVIEW DATE / REVIEW BY / REVIEWED <folder> band per folder
   reviewed while the encounter was open.
   ========================================================================= */
const REVIEWED: Record<string, string> = {
  conditions: 'HEALTH ISSUES', reaction: 'REACTION RISKS', ltm: 'LONG TERM MEDICATIONS',
}

function EncounterSummaryPage({ encounter, encounterDate, notes }: {
  encounter: string
  encounterDate: string
  notes: SessionNote[]
}) {
  const area = useEncounterSession()
  const measures = useEncounterMeasures(encounter, encounterDate)
  const reviews = area.session.reviews[encounter] ?? []
  const band = (children: ReactNode, id?: string) => (
    <div data-tutorial-id={id} style={{ background: '#d6d3ce', borderTop: '1px solid #808080', fontWeight: 700, padding: '1px 3px', marginTop: 12 }}>{children}</div>
  )
  const col = (text: string, width: number) => <span style={{ display: 'inline-block', width: `${width}ch`, whiteSpace: 'pre' }}>{text}</span>
  const dash = (d: string) => d.replace(/\./g, '-')
  return (
    <div
      data-tutorial-id="host.mois.field.encounter-summary"
      style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff', padding: '2px 4px', fontFamily: '"Courier New", monospace', fontSize: 12 }}
    >
      <div style={{ width: '82ch' }}>
        {notes.length > 0 && <>
          {band('PROGRESS NOTE', 'host.mois.group.summary-progress-note')}
          {notes.map((n) => (
            <div key={n.key} style={{ marginBottom: 8 }}>
              <div>{col(n.author || n.createdBy, 40)}Last Modified: {(n.modified || n.created).split('  ')[0]}</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{n.text}</div>
            </div>
          ))}
        </>}
        {measures.length > 0 && <>
          {band(<>{col('TEST NAME : LINKED TO ENCOUNTER', 52)}{col('VALUE', 16)}{col('UNITS', 10)}FL</>, 'host.mois.group.summary-measurements')}
          {measures.map((m, i) => (
            <div key={i} style={{ borderBottom: '1px solid #e0e0e0' }}>
              {col(`${dash(m.collected ?? '')}  ${m.name}`, 52)}{col(m.value, 16)}{col(m.units, 10)}{m.flag === '-' ? '' : m.flag}
            </div>
          ))}
        </>}
        {Object.entries(REVIEWED).map(([folder, noun]) => {
          const rows = reviews.filter((r) => r.folder === folder)
          if (!rows.length) return null
          return (
            <div key={folder}>
              {band(<>{col('REVIEW DATE', 14)}{col('REVIEW BY', 13)}REVIEWED {noun}</>, `host.mois.group.summary-reviewed-${pbSlug(noun)}`)}
              {rows.map((r, i) => <div key={i}>{col(dash(r.date), 14)}{col(r.by, 13)}{r.note}</div>)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ============================================================================
   Progress Note(s).

   The band caption reads `Note n of m` over a saved note and `New Note` over
   one that has not been saved yet; the counter at the right of the Author
   row reads `nof m`, or `*of m` for the new one (d11b4456…, fffcd6fe…, and
   the v02.31 reference capture). The arrows either side walk the notes.
   ========================================================================= */
function ProgressNotePage({
  notes, index, onIndex, pending, pendingCreated, onPending, onNote, editable, onNewNote, onPrintNote, onDelete, boxRef, encounter,
}: {
  /** the encounter the notes belong to — for a note's private status */
  encounter: EncounterRecord
  notes: SessionNote[]
  index: number
  onIndex: (i: number) => void
  pending: Pending | null
  /** the Created stamp a blank New Note shows before it is saved */
  pendingCreated: string
  onPending: (p: Pending | null) => void
  onNote: (n: SessionNote) => void
  editable: (n: SessionNote) => boolean
  onNewNote: () => void
  /** Print Note: the Print Encounter Note window */
  onPrintNote: () => void
  onDelete: () => void
  boxRef: React.MutableRefObject<HTMLTextAreaElement | null>
}) {
  const instrumentation = usePBInstrumentation()
  const note = pending ? null : notes[index]
  /* Private Progress Notes (3799734): the band's Make Private / View Access /
     Break Glass button, the yellow band, and the line a reader without
     access sees in place of the note */
  const priv = usePrivateNoteBand(encounter, note)
  const locked = note ? !editable(note) || !!priv.hidden : false
  const author = pending ? pending.author : note?.author ?? ''
  const complete = pending ? pending.complete ?? false : note?.complete ?? false
  const authors = [...new Set(['', DESKTOP_USER, ...providerSearchRows.map((p) => p.name), author])]
  const caption = pending ? 'New Note' : `Note ${index + 1} of ${notes.length}`
  const counter = pending ? `*of ${notes.length}` : `${index + 1}of ${notes.length}`
  return (
    <>
      <div style={priv.private ? { ['--pb-band' as string]: '#fbf59f' } : undefined} data-tutorial-id={priv.private ? 'host.mois.group.private-note-band' : undefined}>
      {/* the band's buttons are Task Bar buttons, 77px each and butted
          together at the band's right end (encounter-detail-progress.png:
          Print Note 861–938, New Note 938–1015, Delete Note 1015–1092) */}
      <PBBand right={<span className="pb-row" style={{ gap: 0 }}>
        {priv.button && (
          <PBButton bare className="pb-cmdrow__btn" style={{ width: 'auto', minWidth: 77 }} command={priv.button.id}
            onClick={() => priv.button!.onClick()}>
            {priv.button.label}
          </PBButton>
        )}
        <PBButton
          bare
          className="pb-cmdrow__btn"
          style={{ width: 77 }}
          command="print-note"
          onClick={() => onPrintNote()}
        >
          Print Note
        </PBButton>
        <PBButton bare className="pb-cmdrow__btn" style={{ width: 77 }} command="new-note" onClick={onNewNote}>New Note</PBButton>
        <PBButton bare className="pb-cmdrow__btn" style={{ width: 77 }} command="delete-note" onClick={onDelete}>Delete Note</PBButton>
      </span>}>
        <span data-tutorial-id="host.mois.field.note-caption">{caption}</span>
        {priv.private && <span style={{ marginLeft: 60, fontWeight: 400, color: '#9a9a9a' }}>This is a private note.</span>}
      </PBBand>
      </div>
      <div className="pb-row" style={{ padding: '3px 6px' }}>
        <span>Author:</span>
        <PBSelect
          w={158}
          options={authors}
          value={author}
          disabled={locked}
          data-tutorial-id="host.mois.field.note-author"
          onChange={(e) => (pending ? onPending({ ...pending, author: e.target.value }) : note && onNote({ ...note, author: e.target.value }))}
        />
        <span style={{ width: 8 }} />
        <PBCheckbox
          label="Complete"
          checked={complete}
          disabled={locked}
          tutorialId="host.mois.check.note-complete"
          onChange={(v) => (pending ? onPending({ ...pending, complete: v }) : note && onNote({ ...note, complete: v }))}
        />
        <span style={{ width: 8 }} />
        <span>Created By: {note?.complete ? note.createdBy : ''}</span>
        <span className="pb-row__spacer" />
        {/* the arrows are never greyed: at either end, or over a New Note
            *of 0, they stay live and a press goes nowhere
            (encounter-detail-progress.png) */}
        <PBButton size="sm" command="previous-note" style={{ minWidth: 20 }} onClick={() => {
          if (pending ? notes.length : index > 0) onIndex(pending ? notes.length - 1 : index - 1)
        }}>&lsaquo;</PBButton>
        <span style={{ width: 46, textAlign: 'center' }} data-tutorial-id="host.mois.field.note-counter">{counter}</span>
        <PBButton size="sm" command="next-note" style={{ minWidth: 20 }} onClick={() => {
          if (pending == null && index < notes.length - 1) onIndex(index + 1)
        }}>&rsaquo;</PBButton>
      </div>
      <div
        ref={(el) => { boxRef.current = el?.querySelector('textarea') ?? null }}
        style={{ flex: '1 1 auto', minHeight: 0, padding: '0 6px 4px', display: 'flex' }}
      >
        <PBTextArea
          value={pending ? pending.text : priv.hidden ?? note?.text ?? ''}
          readOnly={locked}
          data-tutorial-id="host.mois.field.progress-note"
          /* a highlight is what Print ▸ Selected Text prints; the frame hears
             that one was made, never what it says */
          onSelect={(e) => {
            const box = e.currentTarget
            if (box.selectionEnd > box.selectionStart) instrumentation?.report('selectText', { field: 'progress-note' })
          }}
          onChange={(e) => (pending ? onPending({ ...pending, text: e.target.value }) : note && onNote({ ...note, text: e.target.value }))}
          style={{ flex: '1 1 auto', height: '100%', fontFamily: '"Courier New", monospace' }}
        />
      </div>
      <div className="pb-row" style={{ padding: '2px 6px 4px', borderTop: '1px solid #d6d6d6', gap: 0 }}>
        <span>Created: {pending ? pendingCreated : note?.created ?? ''}</span>
        <span style={{ width: 90 }} />
        <span>Last Modified: {note?.modified ?? ''}</span>
      </div>
    </>
  )
}

/* ============================================================================
   Measurements — the measures recorded at this encounter.

   The chart's measures that carry this encounter, the ones the Encounter
   Link Service tied to it this session, and the ones filed from this tab.
   Anything filed here lands in the Measures folder too ("Values added in the
   Measurements tab will automatically be added to the Measures folder",
   301931).

   Columns per 303066 `4f6a3da3…`: Code, the code's "…", Test Name, Value, a
   narrow unnamed marker column (a dash, or the "…" that opens a measure's
   dynamic form), Flag, Units.
   ========================================================================= */
type MeasurementCommand = 'detail' | 'template' | 'other-template' | 'calculators' | 'bp-form' | 'phq9-form'

/** Folder-shaped rows (Measures' own keys) → the encounter grid's. */
function useEncounterMeasures(encounter: string, encounterDate: string): MeasurementRow[] {
  const area = useEncounterSession()
  const measures = useChartRecords('measure')
  const links = area.session.measureLinks ?? {}
  const own = measures
    .filter((r) => r.id_encounter === encounter || links[r.id_measure ?? ''] === encounter)
    .map((r): MeasurementRow => ({
      code: r.str_code ?? '', name: r.str_description ?? '', value: r.str_value ?? '', flag: r.str_abnormal || '-',
      units: r.str_units ?? '', collected: date(r.dtm_collect_date), by: r.str_collect_by, report: r.str_report,
      lower: r.str_normal_lower, upper: r.str_normal_high, id: r.id_measure,
    }))
  const filed = (area.session.measureRows ?? [])
    .filter((r) => r.encounter === encounter)
    .map((r): MeasurementRow => ({ code: r.code ?? '', name: r.test ?? '', value: r.value ?? '', flag: r.flag ?? '-', units: r.units ?? '', collected: r.collected || encounterDate, fresh: true, marker: r.marker }))
  return [...own, ...filed]
}

function MeasurementsPage({ encounter, encounterDate, calculator, onCalculator }: {
  encounter: string
  encounterDate: string
  /** the calculator open over the tab (Calculator, or Utilities ▸ Calculators …) */
  calculator: string | null
  onCalculator: (c: string | null) => void
}) {
  const area = useEncounterSession()
  const instrumentation = usePBInstrumentation()
  const rows = useEncounterMeasures(encounter, encounterDate)
  const [cur, setCur] = useState(0)
  const [open, setOpen] = useState<MeasurementCommand | null>(null)
  /* Other Template picks a template first, then opens its grid */
  const [template, setTemplate] = useState<MeasureTemplate | null>(null)
  /* which row Measurement Detail is over: a new blank one, or the current */
  const [editing, setEditing] = useState<MeasurementRow | null>(null)
  const dialog = calculator ? 'measure-calculator'
    : open === 'detail' ? 'measurement-detail'
    : open === 'template' ? 'measure-template'
    : open === 'other-template' ? 'measure-template-selection'
    : open === 'calculators' ? 'measure-calculators'
    : open === 'bp-form' ? 'blood-pressure-form'
    : open === 'phq9-form' ? 'phq9-form' : undefined
  useScreenReport(dialog ? { dialog, measurements: rows.length } : { measurements: rows.length })

  /* filing writes the Measures folder's row; this grid reads it back */
  const file = (added: MeasurementRow[]) => {
    if (!added.length) return
    area.update((s) => ({
      ...s,
      measureRows: [...added.map((r) => ({
        collected: encounterDate || MOIS_TODAY, by: DESKTOP_USER, code: r.code, test: r.name, value: r.value,
        flag: r.flag || '-', units: r.units, status: '', clip: '-', encounter,
        /* a PHQ-9 saved from its form carries the form's report and `.*.` (303102) */
        ...(r.report ? { report: r.report } : {}), ...(r.marker ? { marker: r.marker } : {}),
      })), ...s.measureRows],
    }))
    setCur(rows.length + added.length - 1)
  }

  /* 77px Task Bar buttons, Other Template 87 (encounter-detail-measurements
     .png: New Record 280–357 … Other Template 665–752) */
  const command = (label: string, onClick: () => void, width = 77) => (
    <button
      className="pb-cmdrow__btn"
      style={{ width }}
      /* namespaced: the chart's own Encounters screen is still behind this
         window and carries a `New Record` of its own */
      data-tutorial-id={`host.mois.command.measure-${pbSlug(label)}`}
      onClick={() => {
        instrumentation?.report('command', { command: `measure-${pbSlug(label)}` })
        onClick()
      }}
    >
      {label}
    </button>
  )

  const current = rows[cur]
  /* the grid's current values by code, which is what a template retrieves */
  const recorded = Object.fromEntries(rows.map((r) => [r.code, { value: r.value, flag: r.flag === '-' ? '' : r.flag }]))

  return (
    <>
      <div className="pb-cmdrow" style={{ padding: 2 }}>
        {command('New Record', () => { setEditing({ code: '', name: '', value: '', flag: '', units: '', fresh: true }); setOpen('detail') })}
        {command('Delete Record', () => {
          if (!current?.fresh) return
          area.update((s) => {
            const at = s.measureRows.findIndex((r) => r.encounter === encounter && r.code === current.code && r.value === current.value)
            return at < 0 ? s : { ...s, measureRows: s.measureRows.filter((_, i) => i !== at) }
          })
        })}
        {/* every value the chart has for the current row's code, plotted */}
        {command('Graph', () => { if (current) area.open('measurement-graph', { code: current.code }) })}
        {command('Calculator', () => setOpen('calculators'))}
        {command('Template', () => { setTemplate(null); setOpen('template') })}
        {command('Other Template', () => setOpen('other-template'), 87)}
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          flush
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(r) => { setEditing(r); setOpen('detail') }}
          rowTutorialId={(r) => `host.mois.row.measure-${pbSlug(String(r.code || r.name || 'new'))}`}
          /* an encounter with no measurements is the grid's white body, no
             "No rows retrieved." (encounter-detail-measurements.png) */
          empty={false}
          /* every column has its painted width, so the header band stops at
             Units (x 996) the way the capture's does: Code 56, "…" 16,
             Test Name 354, Value 130, the marker 16, Flag 60, Units 68
             (encounter-detail-measurements.png; evidence/MATRIX-R0425-code
             … MATRIX-R0429-units) */
          columns={[
            { key: 'code', header: 'Code', width: 56, align: 'center' },
            { key: 'd', header: '', dots: true, width: 16 },
            { key: 'name', header: 'Test Name', width: 354 },
            { key: 'value', header: 'Value', width: 130, align: 'center' },
            {
              key: 'm',
              header: '',
              width: 16,
              align: 'center',
              /* a blood pressure's value has a form behind it: F4 in Value, or
                 this "…" (303104; 302837 `17afb92b…`) */
              render: (r) => (r.code === '43894'
                /* PHQ-9 TOTAL SCORE: the PATIENT HEALTH QUESTIONNAIRE (303102) */
                ? <button className="pb-link" data-tutorial-id="host.mois.command.measure-form-43894" onClick={() => { instrumentation?.report('command', { command: 'measure-form-43894' }); setEditing(r); setOpen('phq9-form') }}>{r.marker === '.*.' ? '.*.' : '…'}</button>
                : r.code === '1950' || r.code === 'BP'
                ? <button className="pb-link" data-tutorial-id={`host.mois.command.measure-form-${pbSlug(r.code)}`} onClick={() => { instrumentation?.report('command', { command: `measure-form-${pbSlug(r.code)}` }); setEditing(r); setOpen('bp-form') }}>…</button>
                : '-'),
            },
            { key: 'flag', header: 'Flag', width: 60, align: 'center' },
            /* "mg/kg; ppm" starts at the column's left edge
               (encounter-measurement-populated.png) */
            { key: 'units', header: 'Units', width: 68 },
          ]}
        />
      </div>

      {open === 'detail' && editing && (
        <MeasurementDetailDialog
          row={editing}
          encounter={encounter}
          onOk={(row) => {
            if (editing.fresh && !editing.code && !editing.value) file([{ ...row, fresh: true }])
            setOpen(null)
            setEditing(null)
          }}
          onClose={() => { setOpen(null); setEditing(null) }}
        />
      )}
      {open === 'phq9-form' && (
        <Phq9FormWindow
          onSave={(r) => {
            if (editing?.fresh && !editing.value) {
              file([{ code: '43894', name: 'PHQ-9 TOTAL SCORE', value: r.total, flag: r.flag, units: '', report: r.report, marker: '.*.', fresh: true }])
              /* a second Save Form updates the form, it does not file again */
              setEditing({ ...editing, value: r.total })
            }
          }}
          onClose={() => { setOpen(null); setEditing(null) }}
        />
      )}
      {open === 'bp-form' && (
        <BloodPressureFormWindow
          initial={editing?.value.includes('/') ? { systolic: editing.value.split('/')[0], diastolic: editing.value.split('/')[1] } : undefined}
          onSave={(reading) => {
            const value = `${reading.systolic}/${reading.diastolic}`
            if (editing?.fresh && !editing.value) {
              file([{ code: '1950', name: 'BLOOD PRESSURE (SYSTOLIC/DIASTOLIC)', value, flag: '-', units: 'mm Hg', fresh: true }])
            }
          }}
          onClose={() => { setOpen(null); setEditing(null) }}
        />
      )}
      {open === 'template' && (
        <MeasureTemplateGridDialog
          title={template?.name ?? defaultMeasureTemplate.name}
          /* ENCOUNTER WINDOW is the one template whose measure list was
             captured. Another one opens its grid empty rather than showing
             the encounter measures under someone else's name. */
          slots={!template || template.name === defaultMeasureTemplate.name
            ? defaultMeasureTemplate.slots
            : []}
          /* "If the template is entered from the Encounter Detail Window, the
             measurements will pull from records associated to the Encounter"
             (303070) */
          initial={recorded}
          onSave={(added) => { file(added.filter((r) => recorded[r.code]?.value !== r.value)); setOpen(null) }}
          onClose={() => setOpen(null)}
        />
      )}
      {open === 'other-template' && (
        <MeasureTemplateSelectionDialog
          onOpen={(t) => { setTemplate(t); setOpen('template') }}
          onClose={() => setOpen(null)}
        />
      )}
      {open === 'calculators' && !calculator && (
        <MeasureCalculatorsDialog
          onOpen={(c) => { onCalculator(c); setOpen(null) }}
          onClose={() => setOpen(null)}
        />
      )}
      {calculator && (
        <MeasureCalculatorDialog
          calculator={calculator}
          onSave={(row) => { file([row]); onCalculator(null) }}
          onClose={() => onCalculator(null)}
        />
      )}
    </>
  )
}

/* ============================================================================
   Service(s) — the service events recorded against this encounter.

   `New…` picks the episode the event belongs to first — MOIS will not file a
   service event outside one of the patient's episodes — and then opens the
   Patient Service Event window over it (reference/
   encounter-service-event-populated.png, v02.31). `Edit…` opens the same
   window over the selected event.
   ========================================================================= */
type ServiceRow = ServiceEventRecord & { id: string }

function ServicesPage({ encounter, visit }: { encounter: string; visit: ServiceEventVisit }) {
  const instrumentation = usePBInstrumentation()
  const data = useChartExport()
  const events = (data?.service_event ?? []).filter(r => r.str_object === 'tdt_encounter' && r.id_object === encounter)
  /* each event with its episode (tdt_chart_service) and its health issues
     (tdt_service_event_diag) — what the Patient Service Event window shows
     when the event is reopened (evidence/MATRIX-R0432-start-date …
     MATRIX-R0445-certainty) */
  const rows: ServiceRow[] = events.map(r => {
    const service = data?.chart_service.find(s => s.id_chart_service === r.id_chart_service)
    return {
      id: r.id_service_event ?? '',
      start: date(service?.dtm_start), stop: date(service?.dtm_end),
      episode: service?.str_service_code_term ?? '', mrp: service?.str_service_mrp ?? '',
      memberOf: '', stopReason: service?.str_stop_code_term ?? '',
      event: r.str_service_code_term ?? '', phase: r.str_service_phase ?? '',
      issues: (data?.service_event_diag ?? [])
        .filter((d) => d.id_service_event === r.id_service_event)
        .map((d) => ({ issue: d.str_diag_code_term ?? '', certainty: d.str_certainty ?? '' })),
    }
  })
  const [cur, setCur] = useState(0)
  const [step, setStep] = useState<
    { kind: 'episodes' } | { kind: 'new'; episode: ServiceEpisodeRow } | { kind: 'edit'; row: ServiceRow } | null
  >(null)
  useScreenReport(step ? { dialog: step.kind === 'episodes' ? 'service-episodes' : 'service-event' } : {})
  const current = rows[Math.min(cur, rows.length - 1)]
  /* Task Bar buttons, 77px each (encounter-detail-services.png: New… 280–357,
     Edit… 357–434, Delete 434–511); all three are live with no event listed */
  const button = (label: string, anchor: string | undefined, onClick?: () => void) => (
    <button className="pb-cmdrow__btn" style={{ width: 77 }} data-tutorial-id={anchor} onClick={() => {
      if (anchor) instrumentation?.report('command', { command: anchor.slice('host.mois.command.'.length) })
      onClick?.()
    }}>{label}</button>
  )
  return (
    <>
      <div className="pb-cmdrow" style={{ padding: 2 }}>
        {button('New…', 'host.mois.command.new-service', () => setStep({ kind: 'episodes' }))}
        {button('Edit…', 'host.mois.command.edit-service', () => { if (current) setStep({ kind: 'edit', row: current }) })}
        {button('Delete', undefined)}
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        {/* An encounter with no service event is a blank white page — no
            header band, no "No rows retrieved." (encounter-detail-services
            .png). The grid an event lists under is not captured; its columns
            are the window's own fields. */}
        {rows.length ? (
          <PBDataWindow
            flush
            columns={[
              { key: 'start', header: 'Start Date', width: 88, align: 'center' },
              { key: 'episode', header: 'Service Episode', width: 150 },
              { key: 'event', header: 'Service Event' },
              { key: 'phase', header: 'Phase', width: 82, align: 'center' },
              { key: 'mrp', header: 'Service MRP', width: 140 },
            ]}
            rows={rows}
            current={Math.min(cur, rows.length - 1)}
            onCurrentChange={setCur}
            onActivate={(row) => setStep({ kind: 'edit', row })}
          />
        ) : <div style={{ flex: '1 1 auto', background: '#fff' }} />}
      </div>
      {step?.kind === 'episodes' && (
        <ServiceEpisodesDialog
          onPick={(episode) => setStep({ kind: 'new', episode })}
          onClose={() => setStep(null)}
        />
      )}
      {step?.kind === 'new' && (
        <ServiceEventDialog
          mode="new"
          visit={visit}
          record={{ start: step.episode.start, stop: step.episode.stop, episode: step.episode.episode, mrp: step.episode.mrp }}
          /* the export carries no order links for a service event */
          linkedOrders={[]}
          onClose={() => setStep(null)}
        />
      )}
      {step?.kind === 'edit' && (
        <ServiceEventDialog
          mode="edit"
          visit={visit}
          record={step.row}
          linkedOrders={[]}
          onClose={() => setStep(null)}
        />
      )}
    </>
  )
}

/* The episode picker: every episode the patient is enrolled in, a stopped one
   greyed rather than hidden.

   The rows, the banner and the button *count* are from the capture; the four
   action labels are reconstructed, so they are the one part of this dialog
   that is not transcribed. Re-capture the window to confirm them. */
function ServiceEpisodesDialog({ onPick, onClose }: {
  onPick: (row: ServiceEpisodeRow) => void
  onClose: () => void
}) {
  const patient = usePatient()
  const [cur, setCur] = useState(0)
  const serviceEpisodeRows = serviceEpisodes(useChartExport())
  const row = serviceEpisodeRows[cur]
  return (
    <ModalWindow
      id="service-episodes"
      title="Patient's Service Episodes"
      onClose={onClose}
      zIndex={95}
      windowStyle={{ width: 'min(720px, 100%)', height: 'min(420px, 100%)' }}
    >
        <PBPatientBannerBlue
          top={[{ label: 'Patient', value: patient.short }, { label: 'Chart', value: patient.chart }]}
          bottom={[{ label: 'DoB', value: patient.dob }, { label: 'Sex', value: patient.sex }]}
        />
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 6 }}>
          <PBDataWindow
            columns={[
              { key: 'episode', header: 'Service Episode', width: 300 },
              { key: 'mrp', header: 'Episode MRP', width: 180 },
              { key: 'start', header: 'Start Date', width: 90, align: 'center' },
              { key: 'stop', header: 'Stop Date', width: 90, align: 'center' },
            ]}
            rows={serviceEpisodeRows}
            current={cur}
            onCurrentChange={setCur}
            onActivate={(r) => onPick(r)}
            /* a stopped episode is struck through rather than dropped */
            rowClassName={(r) => (r.stop ? 'pb-dw--struck' : undefined)}
            rowTutorialId={(r) => `host.mois.row.episode-${pbSlug(String(r.episode))}`}
          />
        </div>
        <DialogFooter gap={8} padding="4px 0 10px">
          <PBButton
            style={{ minWidth: 150 }}
            command="use-episode"
            onClick={() => row && onPick(row)}
          >
            Use This Episode
          </PBButton>
          <PBButton style={{ minWidth: 150 }}>New Episode…</PBButton>
          <PBButton style={{ minWidth: 150 }}>Edit Episode…</PBButton>
          <PBButton style={{ minWidth: 150 }}>Stop Episode</PBButton>
          <PBButton style={{ minWidth: 100 }} onClick={onClose}>Cancel</PBButton>
        </DialogFooter>
    </ModalWindow>
  )
}

/* ============================================================================
   MOIS - Search Window — the `Attending` ellipsis.

   Every provider and provider group on file. A group's Members column lists
   the providers it stands for, which is how a lesson can tell the two apart.
   ========================================================================= */
function ProviderSearchDialog({ onPick, onClose }: {
  onPick: (row: ProviderSearchRow) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [cur, setCur] = useState(0)
  const rows = providerSearchRows.filter((r) => (
    r.name.toUpperCase().includes(search.trim().toUpperCase())
  ))
  const row = rows[Math.min(cur, rows.length - 1)]
  return (
    <PickListWindow<ProviderSearchRow>
      window={{
        id: 'provider-search',
        title: 'MOIS - Search Window',
        onClose,
        zIndex: 95,
        windowStyle: { width: 'min(880px, 100%)', height: 'min(600px, 100%)' },
      }}
      band={<LookupBand>Provider List</LookupBand>}
      search={(
        <SearchForRow
          style={{ gap: 4, padding: '3px 4px', flex: 'none' }}
          input={<PBLookup w="100%" value={search} onChange={setSearch} name="provider-search" />}
        />
      )}
      gridBox={{ ...GRID_BOX, padding: '0 4px' }}
      grid={{
        columns: [
          { key: 'name', header: 'Name', width: 210 },
          { key: 'role', header: 'Role', width: 150 },
          { key: 'type', header: 'Type', width: 96 },
          { key: 'members', header: 'Members' },
          { key: 'status', header: 'Status', width: 56, align: 'center' },
        ],
        rows,
        current: Math.min(cur, Math.max(0, rows.length - 1)),
        onCurrentChange: setCur,
        onActivate: (r) => onPick(r),
        rowTutorialId: (r) => `host.mois.row.provider-${pbSlug(String(r.name))}`,
        empty: 'No provider matches.',
      }}
      footer={(
        <PickButtons
          className="pb-row"
          style={{ justifyContent: 'center', gap: 14, padding: '8px 0 10px', flex: 'none' }}
          size={{ minWidth: 108 }}
          buttons={[
            { label: 'Select', command: 'select-provider', disabled: !row, onClick: () => row && onPick(row) },
            { label: 'Cancel', onClick: onClose },
          ]}
        />
      )}
    />
  )
}

/* ============================================================================
   Detail / Coding.

   Placed where the v02.31.23 TRAINING capture paints it, x and y from the
   tab page's top-left (encounter-detail-coding.png; evidence/MATRIX-R0448-
   resource … MATRIX-R0474-general-note): captions at 6 and their boxes at
   95 on a 19px pitch; the right-hand captions set right against their boxes
   at 368; a hairline under Payor, under the two Visit Reason rows, and
   under the Coding header and each of its three rows, all 547 long; and the
   coding matrix on a 91px pitch — Procedure two codes, Health Issue five,
   Service four. Resource is a greyed read-only box (the resource the
   encounter was booked on).

   Visit Mode prints the name behind its stored SNOMED CT concept —
   data/clinicManagement `VISIT_MODE_CONCEPTS` (301931 `a9bd769a…`).
   ========================================================================= */
const CODE_SLOTS: [string, number][] = [
  ['Procedure:', 2],
  ['Health Issue:', 5],
  ['Service:', 4],
]
/* each matrix row's tdt_encounter column stem: Code n is `<stem>_n` (the
   workbook's Matrix rows 463–473: str_proc_code_1–2, str_diag_code_1–5,
   str_fee_code_1–4) */
const CODE_COLUMN: Record<string, string> = {
  'Procedure:': 'str_proc_code', 'Health Issue:': 'str_diag_code', 'Service:': 'str_fee_code',
}
const CODE_X = (i: number) => 95 + 91 * i

function CodingPage({ record, docuStatus }: { record?: MoisRecord; docuStatus?: string }) {
  const mode = record?.str_visit_mode ? VISIT_MODE_CONCEPTS[record.str_visit_mode]?.name ?? record.str_visit_mode : ''
  const location = record?.str_service_location ?? ''
  /** a control whose vertical centre is `y` */
  const at = (x: number, y: number, node: ReactNode, style?: React.CSSProperties) => (
    <div style={{ position: 'absolute', left: x, top: Math.round(y - 9.5), height: 19, display: 'flex', alignItems: 'center', ...style }}>{node}</div>
  )
  const right = (y: number, text: string) => at(0, y, <span>{text}</span>, { width: 362, justifyContent: 'flex-end' })
  const rule = (y: number) => <div style={{ position: 'absolute', left: 0, top: y, width: 547, height: 1, background: '#c9c9c9' }} />
  const caption = { fontWeight: 700, color: 'var(--pb-text-head)' }
  return (
    <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 360, background: 'var(--pb-face)' }}>
      {at(6, 18.5, <span>Resource:</span>)}
      {at(95, 18.5, <PBInput w={182} readOnly defaultValue={record?.str_resource ?? ''} />)}
      {at(6, 37.5, <span>Room:</span>)}
      {at(95, 37.5, <PBInput w={58} defaultValue={record?.str_room_number ?? ''} />)}
      {at(6, 56.5, <span>Docu. Status:</span>)}
      {at(95, 56.5, <><PBInput key={docuStatus ?? 'x'} w={25} align="center" defaultValue={docuStatus ?? record?.str_status_docu ?? ''} data-tutorial-id="host.mois.field.docu-status" /><span style={{ marginLeft: 8 }}>(C = Complete)</span></>)}
      {at(6, 75.5, <span>Billing Status:</span>)}
      {at(95, 75.5, <><PBInput w={25} align="center" defaultValue={record?.str_status_bill ?? ''} /><span style={{ marginLeft: 8 }}>(B = Billed)</span></>)}
      {at(6, 94.5, <span>Payor:</span>)}
      {at(95, 94.5, <PBSelect options={[...new Set(['', record?.str_payor ?? '', 'MSP', 'ICBC', 'WCB'])]} defaultValue={record?.str_payor ?? ''} w={88} />)}

      {right(18.5, 'Appt Status:')}
      {/* tdt_encounter.str_appt_status (MATRIX-R0449), the header's own
          code list */}
      {at(368, 18.5, <PBDropDownDataWindow
        columns={[{ key: 'code', header: 'Code', width: 52 }, { key: 'description', header: 'Description', width: 160 }]}
        rows={apptStatusCodes}
        value={record?.str_appt_status ?? ''}
        display="code"
        w={56}
        listW={214}
      />)}
      {right(37.5, 'Service Location:')}
      {at(368, 37.5, <PBSelect options={location ? ['', location] : ['']} defaultValue={location} w={171} />)}
      {right(56.5, 'Visit Mode:')}
      {at(368, 56.5, <PBSelect options={[...new Set(['', mode, 'DIRECT ENCOUNTER WITH CLIENT ALONE', 'TELEPHONE WITH CLIENT ALONE', 'TELEMEDICINE WITH CLIENT ALONE'])]} defaultValue={mode} w={362} />)}
      {right(75.5, 'Priority:')}
      {/* str_priority (MATRIX-R0455), str_encompassing_encounter (R0457) */}
      {at(368, 75.5, <PBSelect options={[...new Set(['', record?.str_priority ?? '', 'ROUTINE', 'URGENT'])]} defaultValue={record?.str_priority ?? ''} w={171} />)}
      {right(94.5, 'Encounter Ref.:')}
      {at(368, 94.5, <PBInput w={171} defaultValue={record?.str_encompassing_encounter ?? ''} />)}

      {rule(106)}
      {/* two Visit Reason rows, each a code lookup and its own text box */}
      {at(6, 117.5, <span>Visit Reason:</span>)}
      {/* Code 1 / Code 2 are tdt_encounter.str_rfe_code_1 / _2, the reason-
          for-encounter codes (SNOMED in str_rfe_code_n_source); Description 1
          is str_appt_note (the workbook's Matrix rows 458–461). The second
          text box is blank under a filled first one in encounter-detail-
          coding.png, so the visit reason is not repeated there. */}
      {at(95, 117.5, <PBLookup w={79} defaultValue={record?.str_rfe_code_1 ?? ''} fieldId="host.mois.field.rfe-code-1" />)}
      {at(186, 117.5, <PBInput w={323} defaultValue={record?.str_appt_note ?? ''} />)}
      {at(95, 138, <PBLookup w={79} defaultValue={record?.str_rfe_code_2 ?? ''} />)}
      {at(186, 138, <PBInput w={323} />)}
      {rule(151)}

      {/* the coding matrix, its captions in the header navy */}
      {at(6, 163, <span style={caption}>Coding:</span>)}
      {[0, 1, 2, 3, 4].map((i) => at(CODE_X(i), 163, <span style={caption}>Code {i + 1}</span>, { width: 79, justifyContent: 'center' }))}
      {rule(175)}
      {CODE_SLOTS.map(([label, n], row) => {
        const y = 184 + row * 20
        return (
          <div key={label}>
            {at(6, y, <span>{label}</span>)}
            {Array.from({ length: n }, (_, i) => <div key={i}>{at(CODE_X(i), y, <PBLookup w={79} defaultValue={record?.[`${CODE_COLUMN[label]}_${i + 1}`] ?? ''} />)}</div>)}
            {rule(y + 11)}
          </div>
        )
      })}

      {at(6, 251, <span>General Note:</span>)}
      <div style={{ position: 'absolute', left: 95, top: 244 }}>
        {/* the header's General Note again: str_office_note (MATRIX-R0474) */}
        <PBTextArea w={443} style={{ height: 106 }} defaultValue={record?.str_office_note ?? ''} />
      </div>
    </div>
  )
}
