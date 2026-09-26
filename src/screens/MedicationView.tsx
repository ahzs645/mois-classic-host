import { useEffect, useMemo, useState } from 'react'
import { useChartExport, useNodeRecords } from '../data/chart-records'
import { useFolderReviews } from '../data/folder-reviews'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import { useScreenWindow } from '../host/screen-windows'
import {
  PBBand, PBCheckbox, PBCommandRow, PBDataWindow, PBIdentityStrip, PBInput,
  PBLookup, PBTabs, PBTextArea, PBViewHeader, pbSlug, type PBColumn, type PBMenuItem,
} from '../pb'
import { useOpenWindow } from './areaWindowRegistry'
import { blankMed, newMedId, STAGE_USER, useMedRows, useMedSession, type Med } from './medication-model'
import {
  AddFavouriteWindow, DeleteAskBox, DoseWizardWindow, DrugLookupWindow,
  FavouriteListWindow, LtmDoseWindow, MED_WINDOWS, PrescriptionHistoryWindow,
  RenewLtmWindow, UnvoidAskBox, VoidAskBox, VoidReasonWindow,
} from './MedicationWindows'
import {
  DoseTree, DrugInteractionWindow, findInteractions, isPrintJob, PharmacokineticsAllergiesWindow, PleaseSignWindow,
  SelectMedsToPrintWindow, useFilePrint, type PrintJob,
} from './PrescriptionPrintWindows'
import { RECORD_OPTION_WINDOWS } from './RecordOptionWindows'
import { recordKeyOf } from './reportRecordEdits'
import { contextPoint, RowContextMenu, type ContextMenuAt } from './RowContextMenu'
import './medication.css'

/* ============================================================================
   Rx - Prescription and Long Term Medication are one window family: same
   grid shape, same untabbed detail pane, same instruction checkbox block.

   PROVENANCE
   - Rx: 303229 `bff5df51…png` / `e57da376…png`, 303232 `0949562b…png`,
     303233 `55d29d3f…png`; the command row and the grid's column set are the
     current build's (the tdt_prescription evidence capture, reference/NOTES.md
     "Screens found in the evidence captures" — Order · Medication · Dose /
     Frequency · Amount · Type · M, no CDIC column), which 303236
     `4a1aafbc…png` (current, "Rx Favourite") agrees with as far as it shows.
     The drug's code is picked with the "…" beside Medication.
   - Long Term Medications: the user's MOIS DEV captures of v02.31.23
     b250508 (2026-09-25, chart 10006), which supersede the older manual
     ones (303215 `0baf096f…png`, 303217, 303218, v02.2x): title "Long Term
     Medications - (date of the last review)", the command row New ·
     Rx Favourite · Delete · Save · Undo · Refresh · Duplicate · Renew ·
     Attachment · Print Rx · Review · No Known, a "…" after Medication,
     Dose / Frequency and Indic., and a `Detail` / `CPP` tab pair over the
     detail pane (CPP: Type OAT / Dual OAT / Prescribed Safer Supply,
     Witness and Carries days/week). Dose Detail heads the tree with
     "duration: 0.0 ENTER ON RENEW".
   - Rx - Prescription on the current build (user capture 2026-09-25 #36
     (v02.31.23)): the ten-button row New Record · Rx Wizard · Rx Favourite ·
     Delete Record · Save · Undo · Refresh · Duplicate · Attachment · Print
     Rx, and the same Detail / CPP tab pair as Long Term Medication (the
     manual's v02.2x Rx captures are untabbed). Detail: ATC Code · Ordered
     By, Generic Name, Indication, Comment ("Printed on Prescription"),
     Office Note (not Printed), Last Printed + View Print History; the
     Instructions / PRN / Repeat ticks on the right. #36's row has no dose,
     and no Dose Detail box is drawn, so on Rx the box shows only for a row
     that has a dose tree (#39 draws that tree as "⊟ duration: 28.0 DAY").
     The footer has Created and ENC#, and no Last Modified label for a row
     never modified.
   - Voided rows are struck through and greyed, and the detail shows the pink
     VOIDED panel (Voided By / Voided Date / Reason) where Comment and Office
     Note were (303233 `55d29d3f…png`).
   - Rx's footer carries `Last Printed:` and the blue `View Print History`
     link (303229 `e57da376…png`).

   Row right-click menus (user capture 2026-09-25 #36 Rx, #45 LTM
   (v02.31.23)): New Record · Delete Record · Save Changes | Create Task ·
   Create Message · Create Reminder · Create Recall · View Recalls · Tag to
   Care Plan | Attachments | Audit Report · Access Control | Workflow
   Summary | Add to My Favourites — Rx adds Void Prescription · UnVoid
   Prescription straight under it. Neither has Mark for Review (the chart
   report folders' list does, RecordOptionList.tsx). They supersede 303232
   `b6a3367f…png` (v02.22.92).
   ========================================================================= */

const RX_COLUMNS: PBColumn<Med>[] = [
  { key: 'order', header: 'Order', width: 84, align: 'center' },
  { key: 'med', header: 'Medication' },
  { key: 'd1', header: '', dots: true },
  /* left-aligned, as #36 paints them */
  { key: 'dose', header: 'Dose / Frequency', width: 150 },
  { key: 'd2', header: '', dots: true },
  { key: 'amount', header: 'Amount', width: 110 },
  { key: 'type', header: 'Type', width: 56, align: 'center' },
  { key: 'm', header: 'M', width: 22, align: 'center' },
  { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center' },
]

/* both folders (user capture 2026-09-25 #36 Rx, #45 LTM (v02.31.23)) */
const DETAIL_TABS = ['Detail', 'CPP']

const LTM_COLUMNS: PBColumn<Med>[] = [
  { key: 'order', header: 'Start', width: 80, align: 'center' },
  { key: 'end', header: 'End', width: 80, align: 'center' },
  { key: 'med', header: 'Medication' },
  { key: 'd1', header: '', dots: true },
  { key: 'dose', header: 'Dose / Frequency', width: 140, align: 'center' },
  { key: 'd2', header: '', dots: true },
  { key: 'indic', header: 'Indic.', width: 60, align: 'center' },
  { key: 'd3', header: '', dots: true },
  { key: 'type', header: 'Type', width: 58, align: 'center' },
  { key: 'm', header: 'M', width: 22, align: 'center' },
]

export function MedicationView({ mode }: { mode: 'rx' | 'ltm' }) {
  const patient = usePatient()
  const rx = mode === 'rx'
  const rows = useMedRows(mode)
  const [, update] = useMedSession()
  const win = useScreenWindow()
  const openFrameWindow = useOpenWindow()
  const [reviews] = useFolderReviews(mode)
  /* an unsaved row — New Record, Duplicate, a favourite or the wizard's pick —
     sits at the top of the list until Save or Undo */
  const [draft, setDraft] = useState<Med | null>(null)
  const [record, setRecord] = useState('')
  const [cur, setCur] = useState(0)
  const [menuAt, setMenuAt] = useState<ContextMenuAt>(null)
  /* the print chain's checks and filing (PrescriptionPrintWindows.tsx) */
  const data = useChartExport()
  const rxRows = useMedRows('rx')
  const ltmRows = useMedRows('ltm')
  const filePrint = useFilePrint()
  const interactionsFor = (job: PrintJob) => findInteractions(rxRows.filter((m) => job.include.includes(m.id) && !m.voided), ltmRows, data?.allergy ?? [])
  /* Print (F2) prints; the Sign and … buttons sign first */
  const printJob = (job: PrintJob) => {
    if (job.mode === 'print') { filePrint(job, false); win.close(); setRecord('printed') }
    else win.open(MED_WINDOWS.pleaseSign, { job })
  }
  const shown = draft ? [draft, ...rows] : rows
  const current = shown[Math.min(cur, shown.length - 1)]

  /* `row` is the current row's anchor slug, which host.mois.selectRow grades */
  const rowSlug = (m?: Med) => (!m ? '' : m === draft ? `${mode}-new` : `${mode}-${pbSlug(m.med).slice(0, 32)}`)
  useScreenReport({ draft: !!draft, record, rows: shown.length, row: rowSlug(current) })

  const startDraft = (m: Med) => { setDraft(m); setCur(0); setRecord('') }
  const save = () => {
    if (!draft) return
    const saved = { ...draft, modified: `${MOIS_TODAY}  ${STAGE_USER}` }
    update((s) => (rx ? { ...s, rxAdded: [saved, ...s.rxAdded] } : { ...s, ltmAdded: [saved, ...s.ltmAdded] }))
    setDraft(null)
    setRecord('saved')
  }
  const undo = () => { setDraft(null); setRecord('') }
  const duplicate = () => {
    if (!current) return
    if (!rx) { win.open(MED_WINDOWS.ltmDose); return }
    startDraft({ ...current, id: newMedId('rx'), order: MOIS_TODAY, voided: undefined, lastPrinted: '', created: `${MOIS_TODAY}  ${STAGE_USER}`, modified: '', record: undefined })
    setRecord('duplicated')
  }
  const addToLtm = () => {
    if (!current) return
    update((s) => ({ ...s, ltmAdded: [{ ...current, id: newMedId('ltm'), voided: undefined, record: undefined }, ...s.ltmAdded] }))
    setRecord('added-to-long-term')
  }

  /* The Action menu's row commands arrive by name (data/menus/chart-meds.ts):
     do the thing, then clear the slot. */
  const slot = win.window?.id
  useEffect(() => {
    if (slot === MED_WINDOWS.duplicate) { win.close(); duplicate() }
    else if (slot === MED_WINDOWS.addToLtm) { win.close(); addToLtm() }
    else if (slot === MED_WINDOWS.printRx) { win.open(MED_WINDOWS.allergyWarning) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot])

  const reviewed = reviews[0]
  const [detailTab, setDetailTab] = useState<string>(DETAIL_TABS[0]!)
  const title = rx ? 'Rx - Prescription' : `Long Term Medications${reviewed ? ` - (${reviewed.date})` : ''}`

  const commands = rx
    ? [
        { label: 'New Record', onClick: () => startDraft(blankMed(newMedId('rx'))) },
        { label: 'Rx Wizard', onClick: () => win.open(MED_WINDOWS.drugLookup, { then: MED_WINDOWS.doseWizard }) },
        { label: 'Rx Favourite', onClick: () => win.open(MED_WINDOWS.favourites) },
        { label: 'Delete Record', disabled: !current, onClick: () => (current === draft ? undo() : win.open(MED_WINDOWS.deleteAsk)) },
        { label: 'Save', onClick: save },
        { label: 'Undo', onClick: undo },
        { label: 'Refresh', onClick: () => setRecord('') },
        { label: 'Duplicate', disabled: !current, onClick: duplicate },
        { label: 'Attachment', onClick: () => openFrameWindow('add-attachment') },
        { label: 'Print Rx', onClick: () => win.open(MED_WINDOWS.allergyWarning) },
      ]
    : [
        { label: 'New', onClick: () => startDraft(blankMed(newMedId('ltm'))) },
        { label: 'Rx Favourite', onClick: () => win.open(MED_WINDOWS.favourites) },
        { label: 'Delete', disabled: !current, onClick: () => (current === draft ? undo() : win.open(MED_WINDOWS.deleteAsk)) },
        { label: 'Save', onClick: save },
        { label: 'Undo', onClick: undo },
        { label: 'Refresh', onClick: () => setRecord('') },
        { label: 'Duplicate', disabled: !current, onClick: duplicate },
        { label: 'Renew', onClick: () => win.open(MED_WINDOWS.renew, { preselect: current?.id }) },
        { label: 'Attachment', onClick: () => openFrameWindow('add-attachment') },
        { label: 'Print Rx', onClick: () => win.open(MED_WINDOWS.allergyWarning) },
        /* the frame opens the Reviewing window on this button (onKitAction) */
        { label: 'Review' },
        { label: 'No Known' },
      ]

  const about = {
    recordKey: recordKeyOf(patient.chart, mode, current?.record),
    category: rx ? 'PRESCRIPTION' : 'LONG TERM MEDICATION',
    date: current?.order ?? '', description: [current?.med, current?.dose].filter(Boolean).join('  '),
  }
  const who = { chart: patient.chart, patient: `${patient.last}, ${patient.first}`.toUpperCase() }
  const linkedTo = [about.category, about.date, current?.med].filter(Boolean).join(' ')
  const contextItems: PBMenuItem[] = [
    { label: 'New Record', onSelect: () => startDraft(blankMed(newMedId(mode))) },
    { label: 'Delete Record', disabled: !current, onSelect: () => (current === draft ? undo() : win.open(MED_WINDOWS.deleteAsk)) },
    { label: 'Save Changes', disabled: !draft, onSelect: save },
    { sep: true },
    { label: 'Create Task', onSelect: () => openFrameWindow('create-task', { ...who, linkedTo }) },
    { label: 'Create Message', onSelect: () => openFrameWindow('create-message', { ...who, linkedTo }) },
    { label: 'Create Reminder' },
    { label: 'Create Recall', onSelect: () => openFrameWindow('create-recall', who) },
    { label: 'View Recalls', onSelect: () => openFrameWindow('patient-recall-list', who) },
    { label: 'Tag to Care Plan', onSelect: () => openFrameWindow('tag-to-care-plan') },
    { sep: true },
    { label: 'Attachments', onSelect: () => openFrameWindow('add-attachment') },
    { sep: true },
    /* the record's provenance windows (RecordOptionWindows.tsx) */
    { label: 'Audit Report', disabled: !current?.record, onSelect: () => openFrameWindow(RECORD_OPTION_WINDOWS.auditReport, about) },
    { label: 'Access Control', disabled: !current?.record, onSelect: () => openFrameWindow(RECORD_OPTION_WINDOWS.accessControl, about) },
    { sep: true },
    { label: 'Workflow Summary', disabled: !current?.record, onSelect: () => openFrameWindow(RECORD_OPTION_WINDOWS.workflowSummary, about) },
    { sep: true },
    { label: 'Add to My Favourites', onSelect: () => win.open(MED_WINDOWS.addFavourite) },
    ...(rx ? [
      { label: 'Void Prescription', disabled: !!current?.voided, onSelect: () => win.open(MED_WINDOWS.voidAsk) },
      { label: 'UnVoid Prescription', disabled: !current?.voided, onSelect: () => win.open(MED_WINDOWS.unvoid) },
    ] : []),
  ]

  const dots = (m: Med, i: number, which: 'd1' | 'd2') => (
    <button
      type="button" className="pb-dw__dots"
      data-tutorial-id={i === cur ? `host.mois.lookup.${which === 'd1' ? 'medication' : 'dose'}` : undefined}
      onMouseDown={() => setCur(i)}
      onClick={() => {
        if (m !== draft) startDraft({ ...m, id: newMedId(mode), order: MOIS_TODAY, record: undefined, voided: undefined })
        win.open(which === 'd1' ? MED_WINDOWS.drugLookup : MED_WINDOWS.doseWizard)
      }}
    >…</button>
  )
  const columns = (rx ? RX_COLUMNS : LTM_COLUMNS).map((c) => (
    c.key === 'd1' || c.key === 'd2'
      ? { ...c, render: (m: Med, i: number) => dots(m, i, c.key as 'd1' | 'd2') }
      : c.key === 'clip' ? { ...c, render: (m: Med) => (m.record?.num_attachments && m.record.num_attachments !== '0' ? m.record.num_attachments : '-') }
      : c
  ))

  /* what the drug lookup and the wizard write into: the draft, or a new one */
  const intoDraft = (patch: Partial<Med>) => {
    const base = draft ?? blankMed(newMedId(mode))
    setDraft({ ...base, ...patch })
    setCur(0)
  }

  return (
    <>
      <PBViewHeader title={title} right={<ChartHeaderIdentity />} />
      <div className={rx ? undefined : 'pb-ltm-cmdrow'}>
        <PBCommandRow commands={commands} />
      </div>

      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first },
          { label: 'MIDDLE:', value: patient.middle },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: patient.dob },
        ]}
        encounter="NO ENCOUNTER"
      />

      <div className="pb-row" style={{ padding: '2px 8px' }}>
        <span>Search For:</span><PBLookup w="100%" />
      </div>

      {!rx && (reviewed
        ? <div className="pb-row" style={{ padding: '0 8px 3px', gap: 18 }} data-tutorial-id="host.mois.field.last-reviewed">
            <span>Last Reviewed</span><span>{reviewed.date}</span><span>{reviewed.name}</span>
          </div>
        : <div style={{ padding: '0 8px 3px', flex: 'none' }} data-tutorial-id="host.mois.field.review-banner">Long Term Medications have not been reviewed for this patient</div>)}

      <div
        style={{ padding: '0 3px', height: rx ? 256 : 214, flex: 'none', display: 'flex', position: 'relative' }}
        onContextMenu={(e) => {
          const tr = (e.target as HTMLElement).closest('tbody tr')
          if (!tr) return
          const i = Array.from(tr.parentElement!.children).indexOf(tr)
          if (i >= 0 && i < shown.length) setCur(i)
          setMenuAt(contextPoint(e))
        }}
      >
        <PBDataWindow
          columns={columns}
          rows={shown}
          current={Math.min(cur, Math.max(0, shown.length - 1))}
          onCurrentChange={setCur}
          rowClassName={(m) => (m.voided ? 'pb-dw--struck' : !rx && m.end ? 'pb-dw--checked' : undefined)}
          rowTutorialId={(m) => `host.mois.row.${rowSlug(m)}`}
          empty={rx ? 'No prescriptions on file.' : 'No long term medications on file.'}
        />
        {menuAt && <OptionMenu at={menuAt} items={contextItems} onClose={() => setMenuAt(null)} />}
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '4px 3px 0' }}>
        <div data-tutorial-id="host.mois.group.medication-detail" style={{ flex: '1 1 auto', minWidth: 0, background: 'var(--pb-face)', border: '1px solid var(--pb-border)', overflow: 'hidden' }}>
          <PBTabs tabs={DETAIL_TABS} active={detailTab} onChange={setDetailTab} compact>
            <DetailPage key={current?.id ?? 'none'} rx={rx} cpp={detailTab === 'CPP'} med={current} onPrintHistory={() => win.open(MED_WINDOWS.history)} />
          </PBTabs>
        </div>
      </div>

      <div className="pb-row" style={{ padding: '2px 8px 4px', borderTop: '1px solid #d6d6d6', gap: 0 }}>
        <span>Created: {current?.created}</span>
        <span style={{ width: 24 }} />
        {(!rx || current?.modified) && <span>Last Modified: {current?.modified}</span>}
        <span className="pb-row__spacer" />
        <button className="pb-link">ENC# {current?.encounter && current.encounter !== '-1' ? current.encounter : 'EMPTY'}</button>
      </div>

      {/* ---- the windows this folder raises ---- */}
      {win.is(MED_WINDOWS.drugLookup) && (
        <DrugLookupWindow
          initial={typeof win.window?.args?.search === 'string' ? win.window.args.search : draft?.med ? draft.med.split(' ')[0] : ''}
          onClose={win.close}
          onPick={(d) => {
            intoDraft({ med: d.generic, generic: d.generic, atc: d.atc, cdic: d.cdic })
            const then = win.window?.args?.then
            if (then === MED_WINDOWS.doseWizard) win.open(MED_WINDOWS.doseWizard)
            else win.close()
          }}
        />
      )}
      {win.is(MED_WINDOWS.doseWizard) && (
        <DoseWizardWindow
          med={draft ?? current}
          multi={win.window?.args?.multi === true}
          onClose={win.close}
          onSave={(built, close) => {
            intoDraft({ dose: built.dose, amount: built.amount, dispense: built.dispense, doses: built.doses, doseKind: 'S' })
            if (close) win.close()
          }}
        />
      )}
      {win.is(MED_WINDOWS.favourites) && (
        <FavouriteListWindow
          onClose={win.close}
          onPick={(f) => {
            intoDraft({ med: f.med, generic: f.generic, cdic: f.cdic, dose: f.dose, amount: f.amount, doseKind: 'F' })
            win.close()
          }}
        />
      )}
      {win.is(MED_WINDOWS.addFavourite) && (
        <AddFavouriteWindow med={current} onClose={win.close} onDone={() => { win.close(); setRecord('favourite') }} />
      )}
      {/* The print chain, in the current build's order (user capture
          2026-09-25 #37–#47 (v02.31.23), PrescriptionPrintWindows.tsx): Print
          Rx and Renew / Print (F2) open Pharmacokinetics and Allergies;
          closing it opens Select Medications to Print (a renewal's new rows
          ticked); its buttons check the ticked drugs for interactions —
          Drug Interaction Results when there are any — then print, or, for
          the Sign and … buttons, open Please Sign; Sign and Task ends on
          Create New Task. */}
      {win.is(MED_WINDOWS.allergyWarning) && (
        <PharmacokineticsAllergiesWindow
          onClose={() => {
            const include = win.window?.args?.include
            win.open(MED_WINDOWS.selectToPrint, { include: Array.isArray(include) ? include : [] })
          }}
        />
      )}
      {win.is(MED_WINDOWS.selectToPrint) && (
        <SelectMedsToPrintWindow
          include={Array.isArray(win.window?.args?.include) ? (win.window!.args!.include as string[]) : []}
          onClose={win.close}
          onPrint={(job) => {
            /* nothing ticked, nothing to print */
            if (!job.include.length) { win.close(); return }
            if (interactionsFor(job).length) win.open(MED_WINDOWS.interaction, { job })
            else printJob(job)
          }}
        />
      )}
      {win.is(MED_WINDOWS.interaction) && isPrintJob(win.window?.args?.job) && (
        <DrugInteractionWindow
          found={interactionsFor(win.window!.args!.job as PrintJob)}
          onClose={win.close}
          onPrint={() => printJob(win.window!.args!.job as PrintJob)}
        />
      )}
      {win.is(MED_WINDOWS.pleaseSign) && isPrintJob(win.window?.args?.job) && (
        <PleaseSignWindow
          job={win.window!.args!.job as PrintJob}
          onClose={win.close}
          onAccept={() => {
            const job = win.window!.args!.job as PrintJob
            filePrint(job, true)
            win.close()
            setRecord('printed')
            /* #47: Create New Task, "PLEASE SEND PRESCRIPTION", linked to the
               prescription log record the signed print made. The stage keeps
               no tdt_prescription_log rows, so the first prescription's id
               stands in for the log record's */
            if (job.mode === 'sign-task') {
              openFrameWindow('create-task', {
                chart: patient.chart,
                patient: `${patient.last}, ${patient.first}`.toUpperCase(),
                task: 'PLEASE SEND PRESCRIPTION',
                linkedTo: `tdt_prescription_log - record id: ${job.include[0]?.replace(/\D/g, '') || '1'}`,
              })
            }
          }}
        />
      )}
      {win.is(MED_WINDOWS.history) && <PrescriptionHistoryWindow onClose={win.close} onReprint={() => setRecord('reprinted')} />}
      {win.is(MED_WINDOWS.renew) && (
        <RenewLtmWindow
          preselect={typeof win.window?.args?.preselect === 'string' ? win.window.args.preselect : rows.find((m) => !m.end)?.id}
          onClose={win.close}
          onRenewed={(made, print) => {
            const scripts = made.map((m) => ({
              ...m, id: newMedId('rx'), order: MOIS_TODAY, end: '', lastPrinted: '', created: `${MOIS_TODAY}  ${STAGE_USER}`, modified: '', record: undefined,
              dispense: m.amount === '0 ENTER ON RENEW' ? '0.0 ENTER ON RENEW' : m.amount,
            }))
            update((s) => ({ ...s, rxAdded: [...scripts, ...s.rxAdded] }))
            setRecord('renewed')
            /* Renew / Print (F2): Pharmacokinetics and Allergies, then the list (303229) */
            if (print) win.open(MED_WINDOWS.allergyWarning, { include: scripts.map((m) => m.id) })
            else win.close()
          }}
        />
      )}
      {win.is(MED_WINDOWS.ltmDose) && (
        <LtmDoseWindow
          onClose={win.close}
          onOk={(dose) => {
            if (!current) { win.close(); return }
            /* 303132: the old record gets an end date with its old dose; the
               new dose starts today, and the issue lands in Prescriptions */
            const newDose = dose.trim() || current.dose
            const fresh = { ...current, dose: newDose, order: MOIS_TODAY, end: '', created: `${MOIS_TODAY}  ${STAGE_USER}`, modified: '', record: undefined, doses: [] }
            update((s) => ({
              ...s,
              ltmEnded: { ...s.ltmEnded, [current.id]: MOIS_TODAY },
              ltmAdded: [{ ...fresh, id: newMedId('ltm') }, ...s.ltmAdded],
              rxAdded: [{ ...fresh, id: newMedId('rx'), amount: current.amount }, ...s.rxAdded],
            }))
            win.close()
            setCur(0)
            setRecord('duplicated')
          }}
        />
      )}
      {win.is(MED_WINDOWS.voidAsk) && <VoidAskBox med={current} onClose={win.close} onYes={() => win.open(MED_WINDOWS.voidReason)} />}
      {win.is(MED_WINDOWS.voidReason) && (
        <VoidReasonWindow
          onClose={win.close}
          onVoid={(reason) => {
            if (current) update((s) => ({ ...s, voided: { ...s.voided, [current.id]: { by: STAGE_USER, date: MOIS_TODAY, reason } } }))
            win.close()
            setRecord('voided')
          }}
        />
      )}
      {win.is(MED_WINDOWS.unvoid) && (
        <UnvoidAskBox
          onClose={win.close}
          onYes={() => {
            if (current) update((s) => { const voided = { ...s.voided }; delete voided[current.id]; return { ...s, voided } })
            win.close()
            setRecord('unvoided')
          }}
        />
      )}
      {win.is(MED_WINDOWS.deleteAsk) && (
        <DeleteAskBox
          onClose={win.close}
          onYes={() => {
            if (current) update((s) => ({ ...s, deleted: [...s.deleted, current.id] }))
            win.close()
            setRecord('deleted')
          }}
        />
      )}
    </>
  )
}

/** The row's right-click menu, reported as `host.dialog = 'record-option-list'`
    while it is down, the way the report folders' Option List is. */
function OptionMenu({ at, items, onClose }: { at: ContextMenuAt; items: PBMenuItem[]; onClose: () => void }) {
  useScreenReport({ dialog: 'record-option-list' })
  return <RowContextMenu at={at} items={items} onClose={onClose} />
}

function DetailPage({ rx, cpp = false, med, onPrintHistory }: { rx: boolean; cpp?: boolean; med?: Med; onPrintHistory: () => void }) {
  const flag = (key: string) => med?.record?.[key] === 'Y'
  return (
    <div className="pb-medication-detail" style={{ display: 'flex', gap: 8, padding: '6px 8px', alignItems: 'flex-start', minWidth: 0 }}>
      <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '78px 1fr', flex: '1 1 auto', minWidth: 0, alignItems: 'start' }}>
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>ATC Code:</span>
        <div className="pb-row">
          <PBInput w={84} readOnly defaultValue={med?.atc ?? ''} style={{ background: 'var(--pb-face)' }} />
          <span style={{ marginLeft: 8 }}>{rx ? 'Ordered By:' : 'Started By:'}</span>
          <PBLookup w={206} defaultValue={med?.orderBy ?? ''} />
        </div>

        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Generic Name:</span>
        <PBTextArea rows={2} w="100%" readOnly defaultValue={med?.generic ?? ''} style={{ background: 'var(--pb-face)' }} />

        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Indication:</span>
        <PBLookup w="100%" />

        {cpp ? (
          <>
            {/* CPP: the controlled-prescription flags (the tdt_prescription
                columns str_is_oat / str_is_oat_dual / str_safer_supply) and
                the witnessed-dose and carry schedule */}
            <span className="pb-form__label" style={{ lineHeight: '19px' }}>Type:</span>
            <div className="pb-row" style={{ gap: 18 }}>
              <PBCheckbox label="OAT" checked={flag('str_is_oat')} />
              <PBCheckbox label="Dual OAT" checked={flag('str_is_oat_dual')} />
              <PBCheckbox label="Prescribed Safer Supply" checked={flag('str_safer_supply')} />
            </div>
            <span className="pb-form__label" style={{ lineHeight: '19px' }}>Witness:</span>
            <div className="pb-row" style={{ gap: 6 }}>
              <PBInput w={46} /><span>days/week</span>
              <span style={{ marginLeft: 70 }}>Carries:</span><PBInput w={46} /><span>days/week</span>
            </div>
          </>
        ) : med?.voided ? (
          <>
            <span className="pb-form__label" style={{ color: '#d00', fontWeight: 700, lineHeight: '19px' }}>VOIDED</span>
            <div data-tutorial-id="host.mois.field.voided" className="pb-form" style={{ background: '#fbbcbc', gridTemplateColumns: '80px 1fr', padding: '8px 10px', minHeight: 90, alignContent: 'start' }}>
              <span>Voided By:</span><b>{med.voided.by}</b>
              <span>Voided Date:</span><b>{med.voided.date}</b>
              <span>Reason:</span><b>{med.voided.reason}</b>
            </div>
          </>
        ) : (
          <>
            <span className="pb-form__label" style={{ lineHeight: '14px' }}>
              {rx ? <>Comment:<br /><br />Printed on<br />Prescription</> : <>Instructions:<br /><br />(copied to<br />prescriptions)</>}
            </span>
            <PBTextArea rows={5} w="100%" defaultValue={med?.comment ?? ''} />

            <span className="pb-form__label" style={{ lineHeight: '14px' }}>Office Note<br />(not Printed):</span>
            <PBTextArea rows={2} w="100%" defaultValue={med?.office ?? ''} data-tutorial-id="host.mois.field.office-note" />
          </>
        )}

        {rx && (
          <>
            <span />
            <div className="pb-row" style={{ gap: 0 }}>
              <span style={{ width: 70 }}>Last Printed:</span>
              <span style={{ width: 140 }}>{med?.lastPrinted}</span>
              {med?.lastPrinted && (
                <button type="button" className="pb-link" data-tutorial-id="host.mois.command.view-print-history" onClick={onPrintHistory}>View Print History</button>
              )}
            </div>
          </>
        )}
      </div>

      {/* the instruction flags and the Dose Detail tree, on the right. The
          box is white with a bold "Dose Detail" caption over a black rule
          (user capture 2026-09-25 #45 (v02.31.23)); on Rx it is drawn only
          for a row with a dose tree (#36) */}
      <div style={{ width: 340, flex: 'none', alignSelf: 'stretch', display: 'flex', flexDirection: 'column' }}>
        <div className="pb-form" style={{ padding: 0, gridTemplateColumns: '68px 1fr', gap: '0px 6px' }}>
          <span className="pb-form__label pb-form__label--right">Instructions:</span>
          <div className="pb-row" style={{ gap: 18 }}>
            <PBCheckbox label="Do Not Substitute" checked={med?.record?.str_no_substitute === 'Y'} />
            <PBCheckbox label="Do Not Adapt" checked={med?.record?.str_do_not_adapt === 'Y'} />
          </div>
          <span className="pb-form__label pb-form__label--right">PRN:</span>
          <PBCheckbox label="(when necessary)" checked={med?.record?.str_prn === 'Y'} />
          {rx && (
            <>
              <span className="pb-form__label pb-form__label--right">Repeat:</span>
              <div className="pb-row">
                <PBCheckbox checked={med?.record?.str_refill === 'Y'} /><PBInput w={46} defaultValue={med?.record?.str_refill === 'Y' ? med.record.num_repeat ?? '' : ''} /><span style={{ fontWeight: 700 }}>&#10007;</span>
              </div>
            </>
          )}
        </div>
        {(!rx || (med && (med.dispense || med.dose))) && (
          <div data-tutorial-id="host.mois.group.dose-detail" style={{ marginTop: rx ? 8 : 34, flex: '1 1 auto', minHeight: 118, border: '1px solid #000', background: '#fff' }}>
            <div style={{ fontWeight: 700, padding: '0 4px', borderBottom: '1px solid #000' }}>Dose Detail</div>
            <DoseTree med={med} rx={rx} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================================
   `Prescription Print Hx` — the chart view that appears under Prescriptions
   once e-signatures are on (303227 `557a4dc1…png`): Refresh · Preview; the
   identity strip with Active ENC#; Search For; Created By / Create Date &
   Time / Signed / Method / By / Date & Time / Version; Prescription Items |
   Distribution under it with the Workflow Summary box.

   Rows: every prescription the export records a print for (its
   `dtm_last_printed`, signed when it carries a signing method) and every print
   or re-print made on this stage — Version Original for a print, Copy for a
   Reprint Prescription. The other print-history surface, the `Prescription
   History` modal behind the Rx footer's View Print History link, is
   PrescriptionHistoryWindow.
   ========================================================================= */

type PrintHxRow = { by: string; created: string; signed: string; method: string; mby: string; mwhen: string; version: string; items: Med[] }

export function PrintHistoryView() {
  const patient = usePatient()
  const [session] = useMedSession()
  const records = useNodeRecords('rx')
  const rxRows = useMedRows('rx')
  const [tab, setTab] = useState('Prescription Items')
  const [cur, setCur] = useState(0)
  const rows = useMemo<PrintHxRow[]>(() => {
    const dot = (v?: string) => (v ?? '').replace(/\//g, '.').replace(/:\d\d$/, '').replace(' ', ' @ ')
    const fromStage = session.printLog.map((e) => ({
      by: e.by, created: e.date.replace('  ', ' @ '), signed: e.signed ? 'Y' : '', method: e.method ?? 'PRINT', mby: e.by, mwhen: e.date.replace('  ', ' @ '), version: e.version, items: e.items,
    }))
    const fromExport = records.filter((r) => r.dtm_last_printed).map((r) => ({
      by: r.stp_user_create ?? '', created: dot(r.stp_date_create), signed: r.str_signing_method ? 'Y' : '',
      method: 'PRINT', mby: r.stp_user_modify ?? r.stp_user_create ?? '', mwhen: dot(r.dtm_last_printed), version: 'Original',
      items: rxRows.filter((m) => m.id === r.id_prescription),
    }))
    return [...fromStage, ...fromExport]
  }, [records, rxRows, session.printLog])
  const row = rows[Math.min(cur, rows.length - 1)]
  return (
    <>
      <PBViewHeader title="Prescription Print Hx" right={<ChartHeaderIdentity />} />
      <PBCommandRow commands={[{ label: 'Refresh' }, { label: 'Preview' }]} />
      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first },
          { label: 'MIDDLE:', value: patient.middle },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: patient.dob },
        ]}
        encounter="NO ENCOUNTER"
      />
      <div className="pb-row" style={{ padding: '2px 8px' }}>
        <span>Search For:</span><PBLookup w="100%" />
      </div>
      <div style={{ padding: '0 3px', height: 190, display: 'flex', flex: 'none' }}>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(_r, i) => `host.mois.row.print-hx-${i}`}
          columns={[
            { key: 'by', header: 'Created By', width: 150 },
            { key: 'created', header: 'Create Date & Time', width: 140, align: 'center' },
            { key: 'signed', header: 'Signed', width: 52, align: 'center', render: (r) => <PBCheckbox checked={r.signed === 'Y'} /> },
            { key: 'method', header: 'Method', width: 62, align: 'center' },
            { key: 'mby', header: 'By', width: 150 },
            { key: 'mwhen', header: 'Date & Time', width: 140, align: 'center' },
            { key: 'version', header: 'Version' },
          ]}
          empty="No prescription has been printed for this patient."
        />
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 4, padding: '4px 3px 3px' }}>
        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex' }}>
          <PBTabsCompact tab={tab} setTab={setTab} items={tab === 'Prescription Items' ? row?.items ?? [] : []} />
        </div>
        <div style={{ width: 170, display: 'flex', flexDirection: 'column', border: '1px solid var(--pb-border)' }}>
          <PBBand>Workflow Summary</PBBand>
          <div className="pb-form" style={{ gridTemplateColumns: '1fr auto', padding: '6px 8px', gap: 4 }}>
            <span>Messages:</span><span>0</span>
            <span>Tasks:</span><span>0</span>
            <span>Acknowledgements:</span><span>0</span>
          </div>
          <button className="pb-link">View Detail...</button>
        </div>
      </div>
    </>
  )
}

function PBTabsCompact({ tab, setTab, items }: { tab: string; setTab: (t: string) => void; items: Med[] }) {
  return (
    <PBTabs tabs={['Prescription Items', 'Distribution']} active={tab} onChange={setTab} compact>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow
          /* the Distribution tab exists in the capture but is never the
             active tab anywhere in the corpus, so its columns are unknown */
          rows={items}
          gutter={false}
          columns={[
            { key: 'cdic', header: 'Code', width: 90 },
            { key: 'med', header: 'Medication' },
            { key: 'dose', header: 'Dose / Frequency', width: 180 },
            { key: 'amount', header: 'Amount', width: 90 },
          ]}
          empty={tab === 'Distribution' ? 'Not captured in the manual.' : 'Select a print above.'}
        />
      </div>
    </PBTabs>
  )
}
