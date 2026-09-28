import { useEffect, useMemo, useState } from 'react'
import { useChartRecords } from '../data/chart-records'
import {
  FORM_WINDOW, LAB_CODES, MEASURE_FORMS, QUESTIONNAIRE_CODES, clearDraft, markSent, messageDate, nextEntryId,
  patchDraft, saveRowForm, setDraftCode, useMeasureEntry, type LabCode,
} from '../data/measureEntry'
import { measureCalculators } from '../data/measures'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { CURRENT_USER, TASK_PRIORITIES, WORKSPACE_USERS } from '../data/tasks'
import { workspaceStore } from '../data/workspaceStore'
import { DESKTOP_USER, useEncounterSession } from '../host/encounterArea'
import { useScreenReport } from '../host/screen-state'
import { PBCheckbox, PBDataWindow, PBInput, PBSelect, PBTextArea } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { BloodPressureFormWindow } from './BloodPressureFormWindow'
import { MeasureCalculatorDialog, type MeasurementRow } from './MeasureDialogs'
import { Phq9FormWindow } from './Phq9FormWindow'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   The windows the Measures folder's New Record row and its record options
   open by id (art. 302837).

     lab-code-selection     the Code column's "…" (or F4 in Code): the lab
                            code list — Code | Class | Quick Code | Test Name
                            (`90db334a…`), searchable by quick code, the blue
                            headers re-sort it ("you can also search by quick
                            code and click on the blue column headers to
                            reorganize your search results"). Select puts the
                            code on the New Record row.
     measure-dynamic-form   the "…" right of Value (or F4 in Value): the
                            measure's form — BLOOD PRESSURE MEASUREMENT or
                            PATIENT HEALTH QUESTIONNAIRE — over the New
                            Record row; args `{ rowId, code }` reopen the form
                            saved on a filed row (its `.*.`).
     measure-create-message the Measures record's Create Message (right-click
                            and Action ▸ Create Message): a PHQ-9
                            questionnaire row opens New Message; anything
                            else hands over to Create New Message.
     questionnaire-message  New Message (v02.31.27), the window that can send
                            to the patient through myhealthkey.
     measure-calculator     Utilities ▸ Calculators … from the Measures folder
                            (args `{ calculator }`), filing its result as a
                            Measures row the way the encounter's does.

   PROVENANCE (New Message): 302837 `725eeb09…` (To button, "Send msg to
   patient" ticked, the PATIENT row with the myhealthkey heart, "Can reply to
   msg"), `78ad9fd7…` (Subject box, Priority drop-down on Medium),
   `575e5a6e…` (Detail pre-filled "Test Name: …" / "Date Collected: May 04
   2025", then Linked Chart, Linked Record "Measurement - record id: 502787",
   Patient Name "WHO, LUCY LOU"), `0c1ad1a1…` (Send), and `f036097f…` (the
   window whole, over the Encounter Detail Window: the left recipients pane
   with its `>` row and red X, the blue "Message" band on the right).
   INFERRED: the Lab Code Selection window's caption, search box and buttons
   (only its rows are captured); New Message's overall size and where Send
   sits (captured on its own); that the To button adds a recipient row.
   The v02.31.23 build this stage follows raises Create New Message for other
   records; New Message is the questionnaire-capable window of v02.31.27
   (the article's prerequisite), so it is used for the PHQ-9 codes only.
   ========================================================================= */

const str = (v: unknown) => (typeof v === 'string' ? v : '')

/* --- Lab Code Selection -------------------------------------------------- */
function LabCodeSelection({ close }: AreaWindowProps) {
  const chart = usePatient().chart
  const entry = useMeasureEntry(chart)
  const [text, setText] = useState(() => entry.draft?.test ? '' : entry.draft?.code ?? '')
  const [sort, setSort] = useState<keyof LabCode>('code')
  const rows = useMemo(() => {
    const t = text.trim().toUpperCase()
    const hit = (c: LabCode) => !t || c.code.startsWith(t) || c.quick.includes(t) || c.test.includes(t) || c.klass.includes(t)
    const key = sort
    return LAB_CODES.filter(hit).sort((a, b) => (key === 'code' ? Number(a.code) - Number(b.code) : String(a[key]).localeCompare(String(b[key]))))
  }, [text, sort])
  const [cur, setCur] = useState(0)
  const pick = (c: LabCode | undefined) => { if (c) { setDraftCode(chart, c); close() } }

  return (
    <WorkspaceDialogFrame id="lab-code-selection" title="Lab Code Selection" width={720} height={480} onClose={close} controls={false}>
      <div className="pb-row" style={{ gap: 6, padding: '8px 10px 4px', flex: 'none' }}>
        <span>Search For:</span>
        <PBInput
          w={320}
          value={text}
          data-tutorial-id="host.mois.field.lab-code-search"
          onChange={(e) => { setText(e.target.value); setCur(0) }}
          onKeyDown={(e) => { if (e.key === 'Enter') pick(rows[cur]) }}
        />
        <span style={{ color: '#6a6a6a' }}>code, quick code or test name</span>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: '0 10px', border: '1px solid var(--pb-border)' }}>
        <PBDataWindow
          flush
          columns={[
            { key: 'code', header: 'Code', width: 80 },
            { key: 'klass', header: 'Class', width: 130 },
            { key: 'quick', header: 'Quick Code', width: 100 },
            { key: 'test', header: 'Test Name' },
          ]}
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(r) => pick(r)}
          onSort={(k) => setSort(k as keyof LabCode)}
          rowTutorialId={(r) => `host.mois.row.lab-code-${r.code}`}
          empty="No lab code matches."
        />
      </div>
      <div className="pb-row" style={{ gap: 14, padding: '10px 0', justifyContent: 'center', flex: 'none' }}>
        <DialogButton id="lab-code-select" isDefault disabled={!rows[cur]} onClick={() => pick(rows[cur])}>Select</DialogButton>
        <DialogButton id="lab-code-cancel" onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- the measure's dynamic form ------------------------------------------ */
function MeasureDynamicForm({ args, close }: AreaWindowProps) {
  const chart = usePatient().chart
  const entry = useMeasureEntry(chart)
  const { session, update } = useEncounterSession()
  const headers = useChartRecords('dform_header')
  const data = useChartRecords('dform_data')
  const rowId = str(args.rowId)
  const draft = rowId ? null : entry.draft
  const code = rowId ? str(args.code) : draft?.code ?? ''
  const kind = MEASURE_FORMS[code]
  const header = rowId && kind ? headers.find((h) => h.str_object === 'tdt_measure' && h.id_object === rowId && h.id_dform_window === FORM_WINDOW[kind]) : undefined
  const saved = rowId ? entry.forms[rowId] : draft?.marker === '.*.' ? { phq9: draft.phq9, modified: draft.formModified } : undefined
  const sessionRow = rowId ? session.measureRows.find((r) => r.id === rowId) : undefined
  const value = draft?.value ?? sessionRow?.value ?? ''

  /* Save Form writes back to the row it was opened from: the New Record
     row, or a row filed this session (the export's own rows stay as MOIS
     sent them) */
  const writeBack = (patch: Record<string, string>, form: Parameters<typeof saveRowForm>[2]) => {
    if (!rowId) {
      patchDraft(chart, { ...patch, marker: '.*.', formModified: form.modified, phq9: form.phq9 })
    } else if (sessionRow) {
      update((s) => ({ ...s, measureRows: s.measureRows.map((r) => (r.id === rowId ? { ...r, ...patch, marker: '.*.' } : r)) }))
      saveRowForm(chart, rowId, form)
    }
  }

  if (kind === 'phq9') {
    return (
      <Phq9FormWindow
        header={saved ? undefined : header}
        records={data}
        initial={saved?.phq9}
        modified={saved?.modified}
        onSave={(r) => writeBack({ value: r.total, flag: r.flag, report: r.report }, { phq9: r.answers, modified: r.modified })}
        onClose={close}
      />
    )
  }
  if (kind === 'bp') {
    const [systolic, diastolic] = value.includes('/') ? value.split('/') : ['', '']
    return (
      <BloodPressureFormWindow
        header={header}
        records={data}
        initial={value ? { systolic, diastolic } : undefined}
        onSave={(r) => writeBack({ value: `${r.systolic}/${r.diastolic}` }, { modified: `${MOIS_TODAY}  ${DESKTOP_USER}` })}
        onClose={close}
      />
    )
  }
  return null
}

/* --- Create Message on a Measures record --------------------------------- */
function MeasureCreateMessage({ args: given, open }: AreaWindowProps) {
  const p = usePatient()
  const chart = p.chart
  const entry = useMeasureEntry(chart)
  const { session } = useEncounterSession()
  /* the Action menu cannot see the chart; the right-click passes it */
  const args = { chart, patient: `${p.last}, ${p.first}`.toUpperCase(), ...given }
  useEffect(() => {
    const row = session.measureSelected
    const code = row?.id === 'new' ? entry.draft?.code ?? '' : row?.code ?? ''
    if (row && QUESTIONNAIRE_CODES.has(code)) {
      open('questionnaire-message', {
        ...args, rowId: row.id ?? '', code,
        test: row.id === 'new' ? entry.draft?.test ?? '' : row.test ?? '',
        collected: row.collected ?? MOIS_TODAY,
      })
    } else {
      open('create-message', args)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

/* --- New Message (v02.31.27) --------------------------------------------- */
function QuestionnaireMessage({ args, close }: AreaWindowProps) {
  const patient = usePatient()
  const chart = patient.chart
  const entry = useMeasureEntry(chart)
  const { update } = useEncounterSession()
  const rowId = str(args.rowId)
  const [toPatient, setToPatient] = useState(false)
  const [canReply, setCanReply] = useState(false)
  const [users, setUsers] = useState<string[]>([''])
  const [subject, setSubject] = useState(str(args.subject))
  const [priority, setPriority] = useState('M')
  const [detail, setDetail] = useState(() => `\nTest Name: ${str(args.test)}\nDate Collected: ${messageDate(str(args.collected))}\n\n`)
  const recipients = users.filter(Boolean)
  const canSend = toPatient || recipients.length > 0
  useScreenReport({ toPatient, canReply, recipients: recipients.length, subject: subject.trim() !== '' })

  /* Send: a New Record row not yet saved is filed first, so the message has
     a record to link to — "Measurement - record id: …" */
  const [filedId] = useState(() => (rowId === 'new' ? nextEntryId(chart) : rowId))
  const send = () => {
    if (!canSend) return
    const d = entry.draft
    if (rowId === 'new' && d) {
      update((s) => ({
        ...s,
        measureRows: [{
          id: filedId, collected: MOIS_TODAY, by: DESKTOP_USER, code: d.code, test: d.test, value: d.value,
          flag: d.flag || '-', units: d.units, status: 'F', clip: '-', marker: d.marker, report: d.report,
          lower: d.lower, upper: d.upper, category: d.category,
        }, ...s.measureRows],
      }))
      clearDraft(chart)
    }
    if (toPatient) markSent(chart, filedId, { date: MOIS_TODAY, subject, priority, canReply })
    workspaceStore.addMessage({
      p: priority,
      sent: MOIS_TODAY,
      patient: `${patient.last}, ${patient.first} ${patient.middle}`.trim().toUpperCase(),
      subject: subject || '(no subject)',
      sentBy: CURRENT_USER.login,
      sentTo: [...(toPatient ? ['PATIENT'] : []), ...recipients].join('; '),
      copiedTo: '',
      detail,
      chart,
    })
    close()
  }

  const blueRow = { background: '#c6dcf5', borderBottom: '1px solid #a8c4e4' }
  const caption = { color: '#8a8a8a' }

  return (
    <WorkspaceDialogFrame id="questionnaire-message" title="New Message" width={940} height={600} onClose={close}>
      <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, margin: '8px 8px 0', border: '1px solid #a0a0a0', background: '#fff' }}>
        {/* recipients */}
        <div style={{ width: 324, flex: 'none', display: 'flex', flexDirection: 'column', borderRight: '1px solid #a0a0a0' }}>
          <div className="pb-row" style={{ ...blueRow, gap: 0, height: 30, flex: 'none', padding: '0 6px' }}>
            <span style={{ width: 146, display: 'flex', justifyContent: 'center' }}>
              <DialogButton id="message-to" width={50} onClick={() => setUsers((u) => [...u, ''])}>To</DialogButton>
            </span>
            <PBCheckbox label="Send msg to patient" checked={toPatient} onChange={(v) => { setToPatient(v); if (!v) setCanReply(false) }} tutorialId="host.mois.field.send-msg-to-patient" />
          </div>
          <div className="pb-row" style={{ gap: 0, height: 28, flex: 'none', padding: '0 6px', borderBottom: '1px solid #e0e0e0' }}>
            <span className="pb-row" style={{ width: 146, gap: 4 }} data-tutorial-id="host.mois.field.message-patient-recipient">
              {toPatient && <><HeartKey />PATIENT</>}
            </span>
            <PBCheckbox label="Can reply to msg" checked={canReply} disabled={!toPatient} onChange={setCanReply} tutorialId="host.mois.field.can-reply-to-msg" />
          </div>
          {users.map((u, i) => (
            <div key={i} className="pb-row" style={{ gap: 4, height: 26, flex: 'none', padding: '0 6px', background: '#f0f0f0', borderBottom: '1px solid #e0e0e0' }}>
              <span style={{ width: 10, fontSize: 9 }}>&gt;</span>
              <PBSelect
                w={230}
                value={u}
                options={[{ value: '', label: '' }, ...WORKSPACE_USERS.filter((w) => w === u || !users.includes(w))]}
                data-tutorial-id={`host.mois.field.message-recipient-${i}`}
                onChange={(e) => setUsers((all) => all.map((x, j) => (j === i ? e.target.value : x)))}
              />
              <button
                type="button"
                className="pb-btn"
                aria-label="Remove recipient"
                data-tutorial-id={`host.mois.command.message-remove-recipient-${i}`}
                style={{ minWidth: 0, width: 26, height: 20, color: '#e02020', fontWeight: 700 }}
                onClick={() => setUsers((all) => (all.length > 1 ? all.filter((_, j) => j !== i) : ['']))}
              >
                X
              </button>
            </div>
          ))}
        </div>

        {/* the message */}
        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...blueRow, ...caption, height: 30, flex: 'none', display: 'flex', alignItems: 'center', padding: '0 10px' }}>Message</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', columnGap: 12, rowGap: 2, padding: '6px 10px 0', flex: 'none' }}>
            <span style={caption}>Subject</span>
            <span style={caption}>Priority</span>
            <PBInput w="100%" value={subject} data-tutorial-id="host.mois.field.message-subject" onChange={(e) => setSubject(e.target.value)} />
            <PBSelect
              w="100%"
              value={priority}
              options={TASK_PRIORITIES.map((p) => ({ value: p.code, label: p.label }))}
              data-tutorial-id="host.mois.field.message-priority"
              onChange={(e) => setPriority(e.target.value)}
            />
          </div>
          <div style={{ ...caption, padding: '8px 10px 2px', flex: 'none' }}>Detail</div>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 10px' }}>
            <PBTextArea
              value={detail}
              data-tutorial-id="host.mois.field.message-detail"
              onChange={(e) => setDetail(e.target.value)}
              style={{ flex: '1 1 auto', height: '100%', resize: 'none' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 24, rowGap: 2, padding: '8px 10px 10px', flex: 'none', borderTop: '1px solid #d0d0d0', marginTop: 6 }}>
            <span style={caption}>Linked Chart</span>
            <span style={caption}>Linked Record</span>
            <PBInput w={86} value={chart} readOnly />
            <PBInput w="100%" value={`Measurement - record id: ${filedId}`} readOnly />
            <span style={caption}>Patient Name</span>
            <span />
            <PBInput w={300} value={`${patient.last}, ${patient.first} ${patient.middle}`.trim().toUpperCase()} readOnly />
            <span />
          </div>
        </div>
      </div>
      <div className="pb-row" style={{ gap: 14, padding: '10px 16px', justifyContent: 'flex-end', flex: 'none' }}>
        <DialogButton id="message-send" isDefault disabled={!canSend} width={96} onClick={send}>Send</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/** the myhealthkey mark beside PATIENT (`725eeb09…`) */
function HeartKey() {
  return (
    <svg width="16" height="15" viewBox="0 0 14 13" aria-hidden="true">
      <path d="M7 12 1.6 6.6A3.1 3.1 0 0 1 7 2.4a3.1 3.1 0 0 1 5.4 4.2Z" fill="none" stroke="#f08030" strokeWidth="1.4" />
      <path d="M3 11 8.6 5.4" stroke="#707070" strokeWidth="1.4" />
      <circle cx="9.4" cy="4.6" r="1.4" fill="none" stroke="#707070" strokeWidth="1.1" />
    </svg>
  )
}

/* --- Utilities ▸ Calculators … from the Measures folder ------------------ */
function FolderCalculator({ args, close }: AreaWindowProps) {
  const { update } = useEncounterSession()
  const calculator = measureCalculators.includes(str(args.calculator)) ? str(args.calculator) : 'BMI'
  const file = (row: MeasurementRow) => {
    update((s) => ({
      ...s,
      measureRows: [{
        collected: MOIS_TODAY, by: DESKTOP_USER, code: row.code, test: row.name, value: row.value,
        flag: row.flag || '-', units: row.units, status: 'F', clip: '-', marker: '…',
      }, ...s.measureRows],
    }))
    close()
  }
  return <MeasureCalculatorDialog calculator={calculator} onSave={file} onClose={close} />
}

/** the ids, for openers that would rather not repeat the strings */
export const MEASURE_ENTRY_WINDOWS = {
  labCodes: 'lab-code-selection',
  dynamicForm: 'measure-dynamic-form',
  createMessage: 'measure-create-message',
  newMessage: 'questionnaire-message',
  calculator: 'measure-calculator',
} as const

registerAreaWindow(MEASURE_ENTRY_WINDOWS.labCodes, LabCodeSelection)
registerAreaWindow(MEASURE_ENTRY_WINDOWS.dynamicForm, MeasureDynamicForm)
registerAreaWindow(MEASURE_ENTRY_WINDOWS.createMessage, MeasureCreateMessage)
registerAreaWindow(MEASURE_ENTRY_WINDOWS.newMessage, QuestionnaireMessage)
registerAreaWindow(MEASURE_ENTRY_WINDOWS.calculator, FolderCalculator)
