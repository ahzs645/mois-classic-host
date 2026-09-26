import { useState, type CSSProperties, type ReactNode } from 'react'
import { usePatient } from '../data/patient-context'
import { isPatientSaved, savePatient, updatePatient } from '../data/patient-edits'
import {
  FAMILY_MD, FAMILY_MD_PRINTED, TIME_TO_RTW, WCB_FEE_CODES, WCB_POSITION_CODES, WCB_REHAB_TYPES,
  claimFromForm, mergeClaim, wcbMspValidation, withClaim,
  type WcbCode, type WcbFormState, type YesNo,
} from '../data/wcbForm'
import type { SessionNote } from '../host/encounterArea'
import { useScreenReport } from '../host/screen-state'
import { PrintPreviewWindow, type PrintPreviewArgs } from './PrintPreviewWindow'
import {
  WcbClaimLookupDialog, WcbCodeLookupDialog, WcbMspValidationWindow, wcbLookupSlug, type WcbLookupKind,
} from './WcbLookupWindows'
import {
  PBButton, PBCheckbox, PBDataWindow, PBDropDownDataWindow, PBGroup, PBInput, PBLookup, PBMessageBox, PBRadio,
  PBTextArea, PBWindow, pbSlug, usePBInstrumentation,
} from '../pb'

/* ============================================================================
   WCB Form — the encounter form behind a WCB REPORT row (form window
   WP_FORM_HEADER_WCB), filed under INSURANCE FORMS. Double-click the row on
   the Encounter Detail Window's Encounter Forms tab, or create one there with
   New Form ▸ INSURANCE FORMS / WCB REPORT.

   PROVENANCE:
     · user capture 2026-09-25 #25 (v02.31.23), a new form, unscrolled, and
       #27 / #28 / #30 (the same form with Fee, Anatomic Position and "If
       yes, type" dropped): the title bar `WCB Form` with only a close box;
       the flat grey band reading `WCB Form` in bold white; the tool bar
       `Save` (floppy) · `Create MSP Claim` · `Print Form` · `Assign Progress
       Note` · `Update Patient Chart` · `View Previous Form` · `Close/Exit`;
       the two white identity rows (CHART / FIRST / MIDDLE / LAST / DoB, then
       Enc # / Attending / Create by / Date, values bold); the `Claim
       Information` group (Claim No. …, DOI, Area of Injury …, Anatomic
       Position ▾, Nature of Injury …; ICD9 …, Fee ▾, Bill Status [I] (B or
       I), MSP Seq. No. greyed) beside `Employer Information` (Company,
       Address, City / Postal Code, Province / Country, Phone); `General
       Claim Information` and `Return to Work Plan` with every row, radio set
       and default as below. The form ends at Report to Follow and the window
       does not scroll (#27 says so outright) — there is no section under it,
       so the assigned progress note is not shown on the form; it goes out on
       the Physician Report as CLINICAL INFORMATION (#31).
       The captures are ~1.1x the manual's scale (955 px wide here, 875 in
       art. 303118 `1800dc96…`); sizes below are the capture's / 1.1.
     · the drop lists and the Area of Injury code set: data/wcbForm.ts.
     · the windows over the form (#26 claim lookup, #29 Advanced Lookup
       Service, #32 MSP claim validation): screens/WcbLookupWindows.tsx.
     · #31, Print Form: the "Workers' Compensation Board of British Columbia
       - Physician Report" page in the frame's Print Preview (`printPages`).
     · art. 356054 "WCB Report" (images missing from the export): what each
       tool-bar button does, and "There is a character limit of 800 for the
       progress note length".
     · art. 361951 "Assign a Progress Note" (images missing): Assign
       Progress Note → "you have the option to select which one you want.
       Select the correct note. Click 'Ok'."
     · art. 361789 "Populate the Claim Information" (images missing): Update
       Patient Chart opens "a new window … asking if you would like to
       add/update the Patient's WCB Claim List", with a "Mark as Default"
       box; the Default claim is pulled into a new form by itself.
     · art. 303852: "press F4 in the Claim Number Field and select the
       correct claim".

   NOT IN ANY CAPTURE, so reconstructed and kept plain: the Assign Progress
   Note picker (a grid of this encounter's notes, Ok / Cancel), the Update
   Patient Chart prompt's wording, what Create MSP Claim does once every
   validation passes (it reports the press and raises nothing), and View
   Previous Form (reports its press).
   ========================================================================= */

const NAVY = '#000080'
const LIGHT_RULE = '1px solid #d2d2d2'
const SECTION_RULE = '1px solid #1d1d1d'

/** a window over the form; its slug is what `host.dialog` reads */
type Prompt =
  | { id: 'assign-progress-note' }
  | { id: 'update-wcb-claim-list' }
  | { id: 'wcb-claim-list' }
  | { id: 'wcb-msp-claim-validation' }
  | { id: 'lookup'; kind: WcbLookupKind }
  | null

const promptSlug = (p: Prompt) => (!p ? null : p.id === 'lookup' ? wcbLookupSlug(p.kind) : p.id)

export function WcbFormWindow({
  encounterId, encounterDate, attending, createdBy, created, initial, notes, onSave, onClose,
}: {
  encounterId: string
  encounterDate: string
  attending: string
  /** the form's creator and date, as the export (or New Form) stamped them */
  createdBy: string
  created: string
  initial: WcbFormState
  /** the encounter's progress notes, oldest first — what Assign offers */
  notes: SessionNote[]
  onSave: (form: WcbFormState) => void
  onClose: () => void
}) {
  const patient = usePatient()
  const [form, setForm] = useState<WcbFormState>(initial)
  const [saved, setSaved] = useState(true)
  const [prompt, setPrompt] = useState<Prompt>(null)
  /* Print Form's page (or the validation list's), in the frame's Print
     Preview — held here, over this window, because the frame's own area
     layer sits under it */
  const [printing, setPrinting] = useState<PrintPreviewArgs | null>(null)
  const set = <K extends keyof WcbFormState>(key: K, value: WcbFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }
  const claims = patient.wcbClaims ?? []
  const validation = wcbMspValidation(form, patient)

  useScreenReport({
    dialog: printing ? 'print-preview' : promptSlug(prompt) ?? 'wcb-form',
    saved,
    assignedNote: form.note?.number ?? 0,
    wcbClaims: claims.length,
    mspValidation: validation.length,
  })

  const save = () => { onSave(form); setSaved(true) }
  /* the date the form is dated — the encounter's, as #25 shows it */
  const formDate = encounterDate || created

  const text = (key: keyof WcbFormState, w: number | string, extra?: { align?: 'center'; disabled?: boolean }) => (
    <PBInput
      w={w}
      align={extra?.align}
      disabled={extra?.disabled}
      value={String(form[key] ?? '')}
      onChange={(e) => set(key, e.target.value as never)}
      data-tutorial-id={`host.mois.field.wcb-${pbSlug(key)}`}
    />
  )
  const lookup = (key: 'claim' | 'area' | 'nature' | 'icd9', w: number, onDots: () => void) => (
    <PBLookup
      w={w}
      name={`wcb-${pbSlug(key)}`}
      fieldId={`host.mois.field.wcb-${pbSlug(key)}`}
      value={String(form[key] ?? '')}
      onChange={(v) => set(key, v as never)}
      onDots={onDots}
      onKeyDown={(e) => { if (e.key === 'F4') { e.preventDefault(); onDots() } }}
    />
  )
  const codeList = (key: 'fee' | 'position' | 'rehabType', rows: WcbCode[], w: number, listW: number, codeW: number) => (
    <PBDropDownDataWindow
      columns={[
        { key: 'code', header: 'Code', width: codeW },
        { key: 'description', header: 'Description', width: listW - codeW - 2 },
      ]}
      rows={rows}
      value={form[key]}
      display="code"
      w={w}
      listW={listW}
      onSelect={(r) => set(key, r.code)}
      tutorialId={`host.mois.field.wcb-${pbSlug(key)}`}
    />
  )
  const radios = <T extends string>(name: string, key: 'disabled' | 'fullDuties' | 'rehab' | 'consult' | 'followUp' | 'familyMd' | 'rtw', values: readonly T[], width: number) => (
    <>
      {values.map((v) => (
        <span key={v} style={{ width, flex: 'none' }}>
          <PBRadio
            name={`wcb-${name}`}
            label={v}
            checked={form[key] === v}
            onChange={() => set(key, v as never)}
            tutorialId={`host.mois.field.wcb-${name}-${pbSlug(v)}`}
          />
        </span>
      ))}
    </>
  )
  const yesNo = (key: 'disabled' | 'fullDuties' | 'rehab' | 'consult' | 'followUp') =>
    radios(pbSlug(key), key, ['Yes', 'No'] as YesNo[], 48)

  const printForm = () => setPrinting({
    title: 'WCB Form',
    bare: true,
    pages: printPages(form, { patient, attending, date: formDate }),
  })
  const createMspClaim = () => { if (validation.length) setPrompt({ id: 'wcb-msp-claim-validation' }) }

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', padding: 8, zIndex: 92 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.wcb-form"
        title="WCB Form"
        onClose={onClose}
        style={{ width: 'min(875px, 100%)', height: 'min(645px, 100%)' }}
      >
        <div
          style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, background: '#f2f2f2' }}
          onKeyDown={(e) => { if (e.key === 'F2') { e.preventDefault(); save() } }}
        >
          {/* #25: a flat grey band, the caption in bold white */}
          <div style={{ background: '#8b8b8b', color: '#fff', fontSize: 17, fontWeight: 700, padding: '1px 5px 2px', flex: 'none', borderTop: '1px solid #5a5a5a' }}>WCB Form</div>

          {/* the tool bar: flat captions between rules, Save with its floppy */}
          <div className="pb-row" style={{ gap: 0, padding: '2px 4px', borderBottom: '1px solid #a0a0a0', background: 'linear-gradient(#ececec, #dcdcdc)', flex: 'none' }}>
            <ToolButton id="wcb-save" onClick={save}><FloppyGlyph /> Save</ToolButton>
            <ToolButton id="wcb-create-msp-claim" onClick={createMspClaim}>Create MSP Claim</ToolButton>
            <ToolButton id="wcb-print-form" onClick={printForm}>Print Form</ToolButton>
            <ToolButton id="assign-progress-note" onClick={() => setPrompt({ id: 'assign-progress-note' })}>Assign Progress Note</ToolButton>
            <ToolButton id="update-patient-chart" onClick={() => setPrompt({ id: 'update-wcb-claim-list' })}>Update Patient Chart</ToolButton>
            <ToolButton id="view-previous-form">View Previous Form</ToolButton>
            <ToolButton id="wcb-close" onClick={onClose}>Close/Exit</ToolButton>
          </div>

          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
            {/* identity: two white rows */}
            <div style={{ background: '#fff', borderBottom: '1px solid #a0a0a0' }}>
              <IdRow cells={[
                ['CHART:', patient.chart, 150, 48], ['FIRST:', patient.first.toUpperCase(), 170], ['MIDDLE:', patient.middle.toUpperCase(), 175],
                ['LAST:', patient.last.toUpperCase(), 194], ['DoB:', patient.dob],
              ]} />
              <IdRow cells={[
                ['Enc #:', encounterId, 136, 48], ['Attending:', attending, 339], ['Create by:', createdBy, 212], ['Date:', formDate],
              ]} />
            </div>

            <div style={{ display: 'flex', gap: 30, padding: '4px 12px 6px', borderBottom: SECTION_RULE }}>
              <PBGroup title="Claim Information" style={{ flex: '0 0 432px', margin: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '103px 118px 1fr 76px', gap: '3px 5px', alignItems: 'center' }}>
                  <span>Claim No.:</span>{lookup('claim', 113, () => setPrompt({ id: 'wcb-claim-list' }))}
                  <Right>ICD9:</Right>{lookup('icd9', 75, () => setPrompt({ id: 'lookup', kind: 'icd9' }))}
                  <span>DOI:</span>{text('doi', 97)}
                  <Right>Fee:</Right>{codeList('fee', WCB_FEE_CODES, 75, 296, 58)}
                  <span>Area of Injury:</span>{lookup('area', 107, () => setPrompt({ id: 'lookup', kind: 'area' }))}
                  <Right>Bill Status:</Right>
                  <span className="pb-row" style={{ gap: 6 }}>{text('billStatus', 30, { align: 'center' })}<span>(B or I)</span></span>
                  <span>Anatomic Position:</span>{codeList('position', WCB_POSITION_CODES, 50, 200, 46)}
                  <Right>MSP Seq. No.:</Right>{text('mspSeq', 60, { disabled: true })}
                  <span>Nature of Injury:</span>{lookup('nature', 107, () => setPrompt({ id: 'lookup', kind: 'nature' }))}
                  <span /><span />
                </div>
              </PBGroup>
              <PBGroup title="Employer Information" style={{ flex: '1 1 0', minWidth: 0, margin: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '72px 130px 1fr 81px', gap: '3px 5px', alignItems: 'center' }}>
                  <span>Company:</span><span style={{ gridColumn: 'span 3' }}>{text('company', '100%')}</span>
                  <span>Address:</span><span style={{ gridColumn: 'span 3' }}>{text('address', '100%')}</span>
                  <span>City:</span>{text('city', '100%')}<Right>Postal Code:</Right>{text('postal', 81)}
                  <span>Province:</span>{text('province', '100%')}<Right>Country:</Right>{text('country', 81)}
                  <span>Phone:</span>{text('phone', 107)}<span /><span />
                </div>
              </PBGroup>
            </div>

            <Section title="General Claim Information">
              <Line label="Who rendered 1st treatment:">{text('firstTreatment', 233)}</Line>
              <Line label="Are you the family MD:">{radios('family-md', 'familyMd', FAMILY_MD, 60)}</Line>
              <Line label={<>Prior/Other Medical<br />Problems:</>} top>
                <PBTextArea rows={2} w={295} value={form.prior} onChange={(e) => set('prior', e.target.value)} data-tutorial-id="host.mois.field.wcb-prior" />
                <span style={{ width: 23, flex: 'none' }} />
                <span style={{ width: 58, flex: 'none' }}>Diagnosis:</span>
                <PBTextArea rows={2} w={295} value={form.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} data-tutorial-id="host.mois.field.wcb-diagnosis" />
              </Line>
            </Section>

            <Section title="Return to Work Plan" last>
              <Line label={<>Since injury/last report -<br />Disabled from work place?</>} top>
                {yesNo('disabled')}<span style={{ width: 70, flex: 'none' }}>If yes, when:</span>{text('disabledWhen', 96)}
              </Line>
              <Line label={<>Now capable of Full Time /<br />Full Duties:</>} top>
                {yesNo('fullDuties')}<span style={{ width: 70, flex: 'none' }}>If no,<br />restrictions:</span>
                <PBTextArea rows={2} w={516} value={form.restrictions} onChange={(e) => set('restrictions', e.target.value)} data-tutorial-id="host.mois.field.wcb-restrictions" />
              </Line>
              <Line label="Time to RTW Place:">{radios('rtw', 'rtw', TIME_TO_RTW, 89)}</Line>
              <Line label="Ready for Rehab Program?">
                {yesNo('rehab')}<span style={{ width: 70, flex: 'none' }}>If yes, type:</span>
                {codeList('rehabType', WCB_REHAB_TYPES, 66, 200, 46)}
              </Line>
              <Line label="Consult WCB Adviser:">{yesNo('consult')}</Line>
              <Line label="Est. MMR:">{text('mmr', 96)}</Line>
              <Line label="Report to Follow:">{yesNo('followUp')}</Line>
            </Section>
          </div>
        </div>
      </PBWindow>

      {printing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 94 }}>
          <PrintPreviewWindow args={printing} close={() => setPrinting(null)} open={() => false} />
        </div>
      )}
      {prompt?.id === 'assign-progress-note' && (
        <AssignProgressNoteDialog
          notes={notes}
          onOk={(note) => { if (note) set('note', note); setPrompt(null) }}
          onClose={() => setPrompt(null)}
        />
      )}
      {prompt?.id === 'wcb-claim-list' && (
        <WcbClaimLookupDialog
          onPick={(i) => { const c = i == null ? undefined : claims[i]; if (c) { setForm((f) => withClaim(f, c)); setSaved(false) } setPrompt(null) }}
          onClose={() => setPrompt(null)}
        />
      )}
      {prompt?.id === 'lookup' && (
        <WcbCodeLookupDialog
          kind={prompt.kind}
          initial={form[prompt.kind]}
          onPick={(r) => { set(prompt.kind, r.code); setPrompt(null) }}
          onClose={() => setPrompt(null)}
        />
      )}
      {prompt?.id === 'wcb-msp-claim-validation' && (
        <WcbMspValidationWindow
          rows={validation}
          onPrint={() => setPrinting({
            title: 'WCB Form MSP Claim Validation Warnings / Errors',
            columns: [{ key: 'code', header: 'Code', width: 80 }, { key: 'type', header: 'Type', width: 160 }, { key: 'description', header: 'Description', width: 460 }],
            rows: validation,
          })}
          onClose={() => setPrompt(null)}
        />
      )}
      {prompt?.id === 'update-wcb-claim-list' && (
        <UpdateClaimListPrompt
          onClose={(answer, isDefault) => {
            setPrompt(null)
            if (answer !== 'yes' || !patient.chart) return
            /* the chart's claim list is written straight away, as MOIS's
               database is; only committed when Demographics holds no other
               unsaved edit of its own */
            const clean = isPatientSaved(patient.chart)
            updatePatient(patient.chart, { wcbClaims: mergeClaim(claims, claimFromForm(form, isDefault)) })
            if (clean) savePatient(patient.chart)
          }}
        />
      )}
    </div>
  )
}

/* --- pieces --------------------------------------------------------------- */

function ToolButton({ id, onClick, children }: { id: string; onClick?: () => void; children: ReactNode }) {
  const host = usePBInstrumentation()
  return (
    <button
      type="button"
      style={{ border: 'none', borderRight: '1px solid #b9b9b9', background: 'transparent', padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: 4, font: 'inherit', cursor: 'default' }}
      data-tutorial-id={host?.anchor('command', id)}
      onClick={() => { host?.report('command', { command: id }); onClick?.() }}
    >
      {children}
    </button>
  )
}

function FloppyGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="0.5" y="0.5" width="13" height="13" rx="1" fill="#1f4fa8" stroke="#0d2c66" />
      <rect x="3" y="1" width="8" height="4.5" fill="#fff" />
      <rect x="3.5" y="8.5" width="7" height="4.5" fill="#d7e3f7" />
    </svg>
  )
}

const Right = ({ children }: { children: ReactNode }) => <span style={{ textAlign: 'right' }}>{children}</span>

/** one identity row: [label, value, cell width, label width] */
function IdRow({ cells }: { cells: [string, string, number?, number?][] }) {
  return (
    <div className="pb-row" style={{ gap: 0, padding: '3px 8px', borderBottom: '1px solid #e2e2e2' }}>
      {cells.map(([label, value, w, lw], i) => (
        <span key={i} style={{ width: w, flex: w ? 'none' : '1 1 auto', whiteSpace: 'nowrap', display: 'inline-flex' }}>
          <span style={{ width: lw }}>{label}&nbsp;</span><b>{value}</b>
        </span>
      ))}
    </div>
  )
}

function Section({ title, last, children }: { title: string; last?: boolean; children: ReactNode }) {
  return (
    <div style={{ borderBottom: last ? undefined : SECTION_RULE }}>
      <div style={{ color: NAVY, fontWeight: 700, padding: '3px 12px 2px' }}>{title}</div>
      {children}
    </div>
  )
}

function Line({ label, top, children }: { label: ReactNode; top?: boolean; children: ReactNode }) {
  const style: CSSProperties = { display: 'flex', alignItems: top ? 'flex-start' : 'center', gap: 6, padding: '4px 8px 4px 23px', borderTop: LIGHT_RULE, minHeight: 25 }
  return (
    <div style={style}>
      <span style={{ width: 142, flex: 'none' }}>{label}</span>
      {children}
    </div>
  )
}

/* --- Assign Progress Note ---------------------------------------------------
   Art. 361951 steps 4–6: the encounter's notes, choose one, Ok. The window
   itself is missing from the export; its grid is the note band's own
   fields (number, author, completion, created). */
export function AssignProgressNoteDialog({ notes, onOk, onClose }: {
  notes: SessionNote[]
  onOk: (note: WcbFormState['note']) => void
  onClose: () => void
}) {
  const [cur, setCur] = useState(Math.max(0, notes.length - 1))
  const rows = notes.map((n, i) => ({
    key: n.key, number: String(i + 1), author: n.author || n.createdBy, complete: n.complete ? 'Y' : '',
    created: n.created.split('  ')[0] ?? '', text: n.text.replace(/\s+/g, ' ').trim(),
  }))
  const pick = (i: number) => {
    const n = notes[i]
    onOk(n ? { key: n.key, number: i + 1, author: n.author || n.createdBy, text: n.text } : null)
  }
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', padding: 8, zIndex: 93 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.assign-progress-note"
        title="Assign Progress Note"
        onClose={onClose}
        style={{ width: 'min(640px, 100%)', height: 'min(320px, 100%)' }}
      >
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 6 }}>
          <PBDataWindow
            columns={[
              { key: 'number', header: 'Note', width: 44, align: 'center' },
              { key: 'author', header: 'Author', width: 150 },
              { key: 'complete', header: 'Complete', width: 62, align: 'center' },
              { key: 'created', header: 'Created', width: 84, align: 'center' },
              { key: 'text', header: 'Progress Note' },
            ]}
            rows={rows}
            current={cur}
            onCurrentChange={setCur}
            onActivate={(_, i) => pick(i)}
            rowTutorialId={(r) => `host.mois.row.assign-note-${r.number}`}
            empty="This encounter has no progress note."
          />
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 19, padding: '6px 0 10px', flex: 'none' }}>
          <CommandButton id="assign-note-ok" disabled={!rows.length} onClick={() => pick(cur)}>Ok</CommandButton>
          <CommandButton id="assign-note-cancel" onClick={onClose}>Cancel</CommandButton>
        </div>
      </PBWindow>
    </div>
  )
}

/* --- Update Patient Chart ----------------------------------------------------
   Art. 361789: "A new window will open asking if you would like to
   add/update the Patient's WCB Claim List. You also have the option to 'Mark
   as Default'". The article's image is missing; the wording is its own. */
function UpdateClaimListPrompt({ onClose }: { onClose: (answer: string, isDefault: boolean) => void }) {
  const [isDefault, setDefault] = useState(false)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 93 }}>
      <PBMessageBox
        title="MOIS"
        icon="question"
        buttons={[
          { label: 'Yes', value: 'yes', default: true, tutorialId: 'host.mois.command.update-claims-yes' },
          { label: 'No', value: 'no', tutorialId: 'host.mois.command.update-claims-no' },
        ]}
        onClose={(v) => onClose(v, isDefault)}
      >
        <span data-tutorial-id="host.mois.dialog.update-wcb-claim-list">
          Would you like to add/update the Patient&apos;s WCB Claim List?
        </span>
        <span style={{ display: 'block', marginTop: 8 }}>
          <PBCheckbox label="Mark as Default" checked={isDefault} onChange={setDefault} tutorialId="host.mois.field.wcb-mark-as-default" />
        </span>
      </PBMessageBox>
    </div>
  )
}

function CommandButton({ id, onClick, disabled, children }: { id: string; onClick?: () => void; disabled?: boolean; children: ReactNode }) {
  const host = usePBInstrumentation()
  return (
    <PBButton
      style={{ minWidth: 75 }}
      disabled={disabled}
      data-tutorial-id={host?.anchor('command', id)}
      onClick={() => { host?.report('command', { command: id }); onClick?.() }}
    >
      {children}
    </PBButton>
  )
}

/* --- Print Form ---------------------------------------------------------------
   User capture 2026-09-25 #31 (v02.31.23): Print Form on a new form brings
   up the frame's Print Preview on "Workers' Compensation Board of British
   Columbia - Physician Report", no page header. Transcribed line for line
   from it: the title and "Physician's First Report:" (bold), EMPLOYER INFO:
   · WORKER INFO: (last, first with sex and DoB, street, city/province/postal,
   PHN) · CLAIM NO:; Date of Injury / Date of Service; Family physician for;
   the first-treatment line; PRIOR / OTHER PROBLEMS…; DIAGNOSIS: with the
   CODES line (ICD9 / BP / Side / NOI); the disabled-from-work sentence;
   CLINICAL INFORMATION (the assigned note, indented); the full-duties
   sentence; "Is currently at work"; Physician information: Payee Name (three
   lines) and Practitioner Name. The capture's form had every default
   answer, so only those sentences are captured: the wording of a Yes to
   Disabled, a No to Full Duties, a Time to RTW other than At Work and a
   named first treatment follows the captured ones and is not verified. The
   payee lines come from billing setup the emulator does not model and are
   left blank. */
function printPages(form: WcbFormState, ctx: {
  patient: { first: string; last: string; dob: string; gender: string; address?: string; city?: string; province?: string; postal?: string; bchn?: string }
  attending: string
  date: string
}): string[] {
  const p = ctx.patient
  const clean = (v: string) => v.replace(/\|/g, '/').replace(/\*\*/g, '')
  const four = (a: string, b: string, c = '', d = '') => `%LINE:47,23,15,15%${[a, b, c, d].map(clean).join('|')}`
  const noteLines = form.note ? clean(form.note.text).split(/\r\n|\r|\n/).map((l) => `%LINE:5,95%|${l}`) : []
  return [[
    "**Workers' Compensation Board of British Columbia - Physician Report**",
    "%LINE:2,98%|**Physician's First Report:**",
    `%LINE:47,23,15,15%**EMPLOYER INFO:**|**WORKER INFO:**|CLAIM NO:|${clean(form.claim)}`,
    four(form.company, `  ${p.last.toUpperCase()}`),
    four(form.address, `  ${p.first.toUpperCase()}`, p.gender, p.dob),
    four([form.city, form.province, form.postal].filter(Boolean).join('  '), `  ${p.address ?? ''}`),
    four(form.phone, `  ${[p.city, p.province, p.postal].filter(Boolean).join('   ')}`),
    four('', `  ${p.bchn ?? ''}`),
    `%LINE:47,53%Date of Injury: ${clean(form.doi)}|Date of Service: ${clean(ctx.date)}`,
    `Family physician for: ${FAMILY_MD_PRINTED[form.familyMd] ?? form.familyMd}`,
    form.firstTreatment.trim() ? `First treatment rendered by: ${clean(form.firstTreatment)}` : 'First treatment rendered here or unknown',
    `PRIOR / OTHER PROBLEMS affecting injury, recovery and disability: ${clean(form.prior)}`,
    `DIAGNOSIS: ${clean(form.diagnosis)}`,
    `%LINE:10,10,33,33,14%|CODES:|ICD9: ${clean(form.icd9)}|BP / Side: ${clean([form.area, form.position].filter(Boolean).join(' / '))}|NOI: ${clean(form.nature)}`,
    form.disabled === 'Yes'
      ? `From injury or last report, worker HAS BEEN DISABLED from work${form.disabledWhen ? ` since ${clean(form.disabledWhen)}` : ''}`
      : 'From injury or last report, worker HAS NOT BEEN DISABLED from work',
    '',
    'CLINICAL INFORMATION',
    ...noteLines,
    form.fullDuties === 'No'
      ? `Worker IS NOT NOW medically capable of working full duties, full time.${form.restrictions ? ` Restrictions: ${clean(form.restrictions)}` : ''}`
      : 'Worker IS NOW medically capable of working full duties, full time.',
    '',
    '',
    form.rtw === 'At Work' || !form.rtw ? 'Is currently at work' : `Estimated time before return to work: ${clean(form.rtw)}`,
    '', '', '', '',
    'Physician information:',
    '%LINE:2,98%|Payee Name:',
    '', '', '',
    `%LINE:2,18,80%|Practitioner Name:|${clean(ctx.attending)}`,
  ].join('\n')]
}
