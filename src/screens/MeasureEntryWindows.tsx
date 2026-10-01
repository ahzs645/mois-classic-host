import { useEffect, useMemo, useState } from 'react'
import { useChartRecords } from '../data/chart-records'
import {
  FORM_WINDOW, MEASURE_FORMS, QUESTIONNAIRE_CODES, clearDraft, markSent, messageDate, nextEntryId,
  patchDraft, saveRowForm, setDraftCode, useMeasureEntry,
} from '../data/measureEntry'
import { toLabCode, withChartCodes, type MasterLabCode } from '../data/labCodeMaster'
import { measureCalculators } from '../data/measures'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { argStr } from '../data/text'
import { CURRENT_USER, TASK_PRIORITIES, WORKSPACE_USERS } from '../data/tasks'
import { workspaceStore } from '../data/workspaceStore'
import { DESKTOP_USER, useEncounterSession } from '../host/encounterArea'
import { useScreenReport } from '../host/screen-state'
import { PBButton, PBCheckbox, PBInput, PBLookup, PBSelect, PBTextArea, pbSlug } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { BloodPressureFormWindow } from './BloodPressureFormWindow'
import {
  FILL_GRID, LOOKUP_BODY, LOOKUP_PANEL, LookupBand, LookupNote, LookupPager, PickListWindow, SearchForRow,
  usePagedCursor,
} from './lookupKit'
import { MeasureCalculatorDialog, type MeasurementRow } from './MeasureDialogs'
import { Phq9FormWindow } from './Phq9FormWindow'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   The windows the Measures folder's New Record row and its record options
   open by id (art. 302837).

     lab-code-selection     any Code "…" (or F4 in Code): Advanced Lookup
                            Service ▸ Master Lab Code List, as the
                            2026-09-29 TRAINING capture shows it — Test ID |
                            Category | Lab Code | Test Name | Units | System |
                            Property | Time Aspect | LOINC in lab-code order,
                            Search For with its "…", Synonyms:, the
                            description pane, Home / PgUp / Ok / Cancel /
                            PgDwn / End and Source / Save on Close
                            (data/labCodeMaster.ts). Ok puts the code on the
                            New Record row; args `{ code }` (a filed row's
                            "…") open it on that row's code.
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
   The older help-site capture of this list (`90db334a…`, Code | Class |
   Quick Code | Test Name) is a previous build's; the TRAINING capture
   replaces it. INFERRED: that Search For filters (the capture leaves it
   empty); what Synonyms: and Source do. New Message's overall size and where Send
   sits (captured on its own); that the To button adds a recipient row.
   The v02.31.23 build this stage follows raises Create New Message for other
   records; New Message is the questionnaire-capable window of v02.31.27
   (the article's prerequisite), so it is used for the PHQ-9 codes only.
   ========================================================================= */

/* --- Advanced Lookup Service ▸ Master Lab Code List ----------------------- */
/* Column widths read off the 2026-09-29 TRAINING capture (2x): gutter 14,
   Test ID 64, Category 99, Lab Code 84, Test Name 184, Units 85, System 81,
   Property 57, Time Aspect 75, LOINC the rest; the window 866 x 692. */
function LabCodeSelection({ args, close }: AreaWindowProps) {
  const chart = usePatient().chart
  const entry = useMeasureEntry(chart)
  /* a filed row's "…" opens the list on that row's code; only the New
     Record row takes a pick (INFERRED: a filed row's code is not changed
     from here) */
  const filed = argStr(args.code)
  const [text, setText] = useState('')
  const [source, setSource] = useState('STANDARD')
  const [saveOnClose, setSaveOnClose] = useState(false)
  const measures = useChartRecords('measure')
  const master = useMemo(() => withChartCodes(measures), [measures])
  const rows = useMemo(() => {
    const t = text.trim().toUpperCase()
    if (!t) return master
    /* a lab code or Test ID that starts with what was typed comes first, then
       test names that contain it, each group in lab-code order */
    const lead = master.filter((c) => c.labCode.startsWith(t) || c.id.startsWith(t))
    const named = master.filter((c) => !lead.includes(c) && c.test.toUpperCase().includes(t))
    return [...lead, ...named]
  }, [text, master])
  /* a Measures Code holds either the Test ID (363) or the lab code (HBA1C) */
  const landOn = (filed || entry.draft?.code || '').toUpperCase()
  const cursor = usePagedCursor(rows.length, 20, () => Math.max(0, master.findIndex((c) => (c.id || c.labCode) && (c.id === landOn || c.labCode === landOn))))
  const row = rows[cursor.at]
  /* the list keeps its current row in view, the way a DataWindow scrolls to
     the row it is set on (and to where Home / PgUp / PgDwn / End move it) */
  const rowId = row ? row.id || pbSlug(row.labCode) : ''
  useEffect(() => {
    if (rowId) document.querySelector(`[data-tutorial-id="host.mois.row.lab-code-${rowId}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [rowId])
  const pick = (c: MasterLabCode | undefined) => {
    if (!c) return
    if (!filed) setDraftCode(chart, toLabCode(c))
    close()
  }

  return (
    <PickListWindow<MasterLabCode>
      frame={(content, footer) => (
        <WorkspaceDialogFrame id="lab-code-selection" title="Advanced Lookup Service" width={866} height={692} onClose={close} controls={false}>
          {content}{footer}
        </WorkspaceDialogFrame>
      )}
      body={LOOKUP_BODY}
      panel={LOOKUP_PANEL}
      band={<LookupBand variant="bold">Master Lab Code List</LookupBand>}
      search={(
        <SearchForRow
          link={false}
          style={{ gap: 4, padding: '3px 4px', flex: 'none' }}
          input={(
            <PBLookup
              w="100%"
              value={text}
              name="lab-code-search"
              fieldId="host.mois.field.lab-code-search"
              onChange={(v) => { setText(v); cursor.setCurrent(0) }}
              onEnter={() => pick(row)}
            />
          )}
        />
      )}
      gridBox={null}
      grid={{
        flush: true,
        rules: 'white',
        style: { ...FILL_GRID, ['--pb-dw-gutter-width' as string]: '14px' },
        columns: [
          { key: 'id', header: 'Test ID', width: 64 },
          { key: 'category', header: 'Category', width: 99 },
          { key: 'labCode', header: 'Lab Code', width: 84 },
          { key: 'test', header: 'Test Name', width: 184 },
          { key: 'units', header: 'Units', width: 85 },
          { key: 'system', header: 'System', width: 81 },
          { key: 'property', header: 'Property', width: 57 },
          { key: 'time', header: 'Time Aspect', width: 75 },
          { key: 'loinc', header: 'LOINC' },
        ],
        rows,
        current: cursor.at,
        onCurrentChange: cursor.setCurrent,
        onActivate: (r) => pick(r),
        rowTutorialId: (r) => `host.mois.row.lab-code-${r.id || pbSlug(r.labCode)}`,
        empty: 'No lab code matches.',
      }}
      belowGrid={(
        <div className="pb-row" style={{ gap: 8, padding: '2px 4px', borderTop: '1px solid #9a9a9a', flex: 'none', minHeight: 30, alignItems: 'flex-start', background: '#fff' }}>
          <PBButton bare className="pb-link" style={{ textDecoration: 'underline' }} command="lab-code-synonyms">Synonyms:</PBButton>
        </div>
      )}
      below={<LookupNote height={64}>This is the master lab code (unfiltered) selection list</LookupNote>}
      footerInside
      footer={(
        <LookupPager
          cursor={cursor}
          ok={{ command: 'lab-code-select', isDefault: true, disabled: !row, onClick: () => pick(row) }}
          cancel={{ command: 'lab-code-cancel', onClick: close }}
        />
      )}
      after={(
        <div className="pb-row" style={{ gap: 10, flex: 'none', paddingLeft: 8 }}>
          <span>Source:</span>
          <PBSelect w={176} options={['STANDARD']} value={source} onChange={(e) => setSource(e.target.value)} />
          <PBCheckbox label="Save on Close" checked={saveOnClose} onChange={setSaveOnClose} />
        </div>
      )}
    />
  )
}

/* --- the measure's dynamic form ------------------------------------------ */
function MeasureDynamicForm({ args, close }: AreaWindowProps) {
  const chart = usePatient().chart
  const entry = useMeasureEntry(chart)
  const { session, update } = useEncounterSession()
  const headers = useChartRecords('dform_header')
  const data = useChartRecords('dform_data')
  const rowId = argStr(args.rowId)
  const draft = rowId ? null : entry.draft
  const code = rowId ? argStr(args.code) : draft?.code ?? ''
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
  const rowId = argStr(args.rowId)
  const [toPatient, setToPatient] = useState(false)
  const [canReply, setCanReply] = useState(false)
  const [users, setUsers] = useState<string[]>([''])
  const [subject, setSubject] = useState(argStr(args.subject))
  const [priority, setPriority] = useState('M')
  const [detail, setDetail] = useState(() => `\nTest Name: ${argStr(args.test)}\nDate Collected: ${messageDate(argStr(args.collected))}\n\n`)
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
              <PBButton
                aria-label="Remove recipient"
                command={`message-remove-recipient-${i}`}
                style={{ minWidth: 0, width: 26, height: 20, color: '#e02020', fontWeight: 700 }}
                onClick={() => setUsers((all) => (all.length > 1 ? all.filter((_, j) => j !== i) : ['']))}
              >
                X
              </PBButton>
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
  const calculator = measureCalculators.includes(argStr(args.calculator)) ? argStr(args.calculator) : 'BMI'
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
