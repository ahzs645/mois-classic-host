import { useState, type CSSProperties, type ReactNode } from 'react'
import { usePatient } from '../data/patient-context'
import { isPatientSaved, savePatient, updatePatient } from '../data/patient-edits'
import {
  FAMILY_MD, TIME_TO_RTW, claimFromForm, mergeClaim, withClaim,
  type WcbFormState, type YesNo,
} from '../data/wcbForm'
import type { SessionNote } from '../host/encounterArea'
import { useScreenReport } from '../host/screen-state'
import { PrintPreviewWindow } from './PrintPreviewWindow'
import {
  PBButton, PBCheckbox, PBDataWindow, PBGroup, PBInput, PBLookup, PBMessageBox, PBRadio, PBSelect,
  PBTextArea, PBWindow, pbSlug, usePBInstrumentation,
} from '../pb'

/* ============================================================================
   WCB Form — the encounter form behind a WCB REPORT row (form window
   WP_FORM_HEADER_WCB). Double-click the row on the Encounter Detail Window's
   Encounter Forms tab, or create one there with New Form ▸ WCB Report.

   PROVENANCE:
     · art. 303118 "Create a WCB Form", image `1800dc96…` (1495×736: the
       Select Form list behind, with INSURANCE FORMS / WCB REPORT ringed, and
       the whole WCB Form window over it, 875 wide). Transcribed from it:
       the title bar `WCB Form` with only a close box; the grey band reading
       `WCB Form`; the tool bar `Save` (floppy) · `Create MSP Claim` ·
       `Print Form` · `Assign Progress Note` · `Update Patient Chart` ·
       `View Previous Form` · `Close/Exit`; the two identity rows (CHART /
       FIRST / MIDDLE / LAST / DoB, then Enc # / Attending / Create by /
       Date); the `Claim Information` group (Claim No. …, DOI, Area of
       Injury …, Anatomic Position ▾, Nature of Injury …, ICD9 …, Fee ▾,
       Bill Status [ ] (B or I), MSP Seq. No. greyed) beside `Employer
       Information` (Company, Address, City / Postal Code, Province /
       Country, Phone); `General Claim Information` (Who rendered 1st
       treatment, Are you the family MD: No · 1-6 m · 7 - 12 m · > 12 m,
       Prior/Other Medical Problems, Diagnosis) and `Return to Work Plan`
       (Since injury/last report - Disabled from work place? Yes/No + If
       yes, when; Now capable of Full Time / Full Duties: Yes/No + If no,
       restrictions; Time to RTW Place: At Work · 1-6 days · 7-13 days ·
       14-20 days · >20 days; Ready for Rehab Program? Yes/No + If yes,
       type ▾; Consult WCB Adviser; Est. MMR; Report to Follow). The radio
       defaults are that capture's new form.
     · art. 356054 "WCB Report" (images missing from the export): what each
       tool-bar button does, the field notes, and "There is a character
       limit of 800 for the progress note length".
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
   Patient Chart prompt's wording, the claim picker behind Claim No. F4 /
   "…", and the `Progress Note` section at the foot of the form, which is
   where the assigned note is shown — `1800dc96…` is cut off below Report
   to Follow. Create MSP Claim and View Previous Form report their press and
   change nothing: the bill they raise and the previous forms' list are not
   modelled. The Area of Injury / Nature of Injury / ICD9 "…" pickers are
   not captured either; the fields are typeable.
   ========================================================================= */

const NAVY = '#000080'
const RULE = '1px solid #b9b9b9'

/** what the window reports as host.screen.*; slugs and counts only */
type Prompt = 'assign-progress-note' | 'update-wcb-claim-list' | 'wcb-claim-list' | null

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
  /* Print Form's pages, in the frame's Print Preview — held here, over this
     window, because the frame's own area layer sits under it */
  const [printing, setPrinting] = useState<string[] | null>(null)
  const set = <K extends keyof WcbFormState>(key: K, value: WcbFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }
  const claims = patient.wcbClaims ?? []

  useScreenReport({
    dialog: printing ? 'print-preview' : prompt ?? 'wcb-form',
    saved,
    assignedNote: form.note?.number ?? 0,
    wcbClaims: claims.length,
  })

  const save = () => { onSave(form); setSaved(true) }

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
  const lookup = (key: keyof WcbFormState, w: number, onDots?: () => void) => (
    <PBLookup
      w={w}
      name={`wcb-${pbSlug(key)}`}
      fieldId={`host.mois.field.wcb-${pbSlug(key)}`}
      value={String(form[key] ?? '')}
      onChange={(v) => set(key, v as never)}
      onDots={onDots}
      onKeyDown={(e) => { if (e.key === 'F4' && onDots) { e.preventDefault(); onDots() } }}
    />
  )
  const yesNo = (key: 'disabled' | 'fullDuties' | 'rehab' | 'consult' | 'followUp') => (
    <>
      {(['Yes', 'No'] as YesNo[]).map((v) => (
        <span key={v} style={{ width: 46 }}>
          <PBRadio
            name={`wcb-${key}`}
            label={v}
            checked={form[key] === v}
            onChange={() => set(key, v)}
            tutorialId={`host.mois.field.wcb-${pbSlug(key)}-${pbSlug(v)}`}
          />
        </span>
      ))}
    </>
  )

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', padding: 8, zIndex: 92 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.wcb-form"
        title="WCB Form"
        onClose={onClose}
        style={{ width: 'min(875px, 100%)', height: 'min(800px, 100%)' }}
      >
        <div
          style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}
          onKeyDown={(e) => { if (e.key === 'F2') { e.preventDefault(); save() } }}
        >
          <div style={{ background: '#6f6f6f', color: '#fff', fontSize: 18, padding: '1px 6px 2px', flex: 'none' }}>WCB Form</div>

          {/* the tool bar: flat captions between rules, Save with its floppy */}
          <div className="pb-row" style={{ gap: 0, padding: '2px 4px', borderBottom: RULE, background: 'var(--pb-face)', flex: 'none' }}>
            <ToolButton id="wcb-save" onClick={save}><FloppyGlyph /> Save</ToolButton>
            <ToolButton id="wcb-create-msp-claim">Create MSP Claim</ToolButton>
            <ToolButton id="wcb-print-form" onClick={() => setPrinting(printPages(form, { patient, encounterId, encounterDate, attending, createdBy, created }))}>Print Form</ToolButton>
            <ToolButton id="assign-progress-note" onClick={() => setPrompt('assign-progress-note')}>Assign Progress Note</ToolButton>
            <ToolButton id="update-patient-chart" onClick={() => setPrompt('update-wcb-claim-list')}>Update Patient Chart</ToolButton>
            <ToolButton id="view-previous-form">View Previous Form</ToolButton>
            <ToolButton id="wcb-close" onClick={onClose}>Close/Exit</ToolButton>
          </div>

          <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
            {/* identity: two white rows */}
            <div style={{ background: '#fff', borderBottom: RULE }}>
              <IdRow cells={[
                ['CHART:', patient.chart, 150], ['FIRST:', patient.first.toUpperCase(), 170], ['MIDDLE:', patient.middle.toUpperCase(), 170],
                ['LAST:', patient.last.toUpperCase(), 196], ['DoB:', patient.dob],
              ]} />
              <IdRow cells={[
                ['Enc #:', encounterId, 136], ['Attending:', attending, 340], ['Create by:', createdBy, 214], ['Date:', created],
              ]} />
            </div>

            <div style={{ display: 'flex', gap: 12, padding: '6px 8px', borderBottom: RULE }}>
              <PBGroup title="Claim Information" style={{ flex: '1 1 0', minWidth: 0, margin: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '94px auto 1fr auto', gap: '3px 6px', alignItems: 'center' }}>
                  <span>Claim No.:</span>{lookup('claim', 100, () => setPrompt('wcb-claim-list'))}
                  <Right>ICD9:</Right>{lookup('icd9', 74)}
                  <span>DOI:</span>{text('doi', 96, { align: 'center' })}
                  <Right>Fee:</Right>
                  <PBSelect w={78} options={['', '19937']} value={form.fee} onChange={(e) => set('fee', e.target.value)} data-tutorial-id="host.mois.field.wcb-fee" />
                  <span>Area of Injury:</span>{lookup('area', 100)}
                  <Right>Bill Status:</Right>
                  <span className="pb-row" style={{ gap: 4 }}>{text('billStatus', 30, { align: 'center' })}<span>(B or I)</span></span>
                  <span>Anatomic Position:</span>
                  <PBSelect w={52} options={['', 'B', 'N', 'L', 'R']} value={form.position} onChange={(e) => set('position', e.target.value)} data-tutorial-id="host.mois.field.wcb-position" />
                  <Right>MSP Seq. No.:</Right>{text('mspSeq', 62, { disabled: true })}
                  <span>Nature of Injury:</span>{lookup('nature', 100)}
                  <span /><span />
                </div>
              </PBGroup>
              <PBGroup title="Employer Information" style={{ flex: '1 1 0', minWidth: 0, margin: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto 80px', gap: '3px 6px', alignItems: 'center' }}>
                  <span>Company:</span><span style={{ gridColumn: 'span 3' }}>{text('company', '100%')}</span>
                  <span>Address:</span><span style={{ gridColumn: 'span 3' }}>{text('address', '100%')}</span>
                  <span>City:</span>{text('city', '100%')}<Right>Postal Code:</Right>{text('postal', 80)}
                  <span>Province:</span>{text('province', '100%')}<Right>Country:</Right>{text('country', 80)}
                  <span>Phone:</span>{text('phone', 104)}<span /><span />
                </div>
              </PBGroup>
            </div>

            <Section title="General Claim Information">
              <Line label="Who rendered 1st treatment:">{text('firstTreatment', 234)}</Line>
              <Line label="Are you the family MD:">
                {FAMILY_MD.map((v) => (
                  <span key={v} style={{ width: 80 }}>
                    <PBRadio name="wcb-family-md" label={v} checked={form.familyMd === v} onChange={() => set('familyMd', v)}
                      tutorialId={`host.mois.field.wcb-family-md-${pbSlug(v)}`} />
                  </span>
                ))}
              </Line>
              <Line label="Prior/Other Medical Problems:" top>
                <PBTextArea rows={3} w={300} value={form.prior} onChange={(e) => set('prior', e.target.value)} data-tutorial-id="host.mois.field.wcb-prior" />
                <span style={{ width: 24 }} />
                <span style={{ alignSelf: 'flex-start' }}>Diagnosis:</span>
                <PBTextArea rows={3} w={300} value={form.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} data-tutorial-id="host.mois.field.wcb-diagnosis" />
              </Line>
            </Section>

            <Section title="Return to Work Plan">
              <Line label={<>Since injury/last report -<br />Disabled from work place?</>}>
                {yesNo('disabled')}<span style={{ width: 16 }} /><span>If yes, when:</span>{text('disabledWhen', 90)}
              </Line>
              <Line label={<>Now capable of Full Time /<br />Full Duties:</>} top>
                {yesNo('fullDuties')}<span style={{ width: 16 }} /><span>If no,<br />restrictions:</span>
                <PBTextArea rows={3} w={300} value={form.restrictions} onChange={(e) => set('restrictions', e.target.value)} data-tutorial-id="host.mois.field.wcb-restrictions" />
              </Line>
              <Line label="Time to RTW Place:">
                {TIME_TO_RTW.map((v) => (
                  <span key={v} style={{ width: 88 }}>
                    <PBRadio name="wcb-rtw" label={v} checked={form.rtw === v} onChange={() => set('rtw', v)}
                      tutorialId={`host.mois.field.wcb-rtw-${pbSlug(v)}`} />
                  </span>
                ))}
              </Line>
              <Line label="Ready for Rehab Program?">
                {yesNo('rehab')}<span style={{ width: 16 }} /><span>If yes, type:</span>
                <PBSelect w={70} options={['']} value={form.rehabType} onChange={(e) => set('rehabType', e.target.value)} />
              </Line>
              <Line label="Consult WCB Adviser:">{yesNo('consult')}</Line>
              <Line label="Est. MMR:">{text('mmr', 96)}</Line>
              <Line label="Report to Follow:">{yesNo('followUp')}</Line>
            </Section>

            {/* past the capture's foot: where the assigned note is shown */}
            <Section title="Progress Note">
              <div style={{ padding: '4px 20px 8px' }}>
                <div data-tutorial-id="host.mois.field.wcb-progress-note-caption" style={{ marginBottom: 3 }}>
                  {form.note ? `Note ${form.note.number}  —  ${form.note.author}` : 'No progress note assigned. Press Assign Progress Note.'}
                </div>
                <PBTextArea
                  rows={5}
                  w="100%"
                  readOnly
                  value={form.note?.text ?? ''}
                  data-tutorial-id="host.mois.field.wcb-progress-note"
                  style={{ fontFamily: '"Courier New", monospace' }}
                />
                {/* art. 356054: the note is cut at 800 characters on submission */}
                {form.note && form.note.text.length > 800 && (
                  <div style={{ color: '#a00000', marginTop: 2 }}>
                    {form.note.text.length} characters: WCB will receive the first 800.
                  </div>
                )}
              </div>
            </Section>
          </div>
        </div>
      </PBWindow>

      {printing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 94 }}>
          <PrintPreviewWindow args={{ title: 'WCB Form', pages: printing }} close={() => setPrinting(null)} open={() => false} />
        </div>
      )}
      {prompt === 'assign-progress-note' && (
        <AssignProgressNoteDialog
          notes={notes}
          onOk={(note) => { if (note) set('note', note); setPrompt(null) }}
          onClose={() => setPrompt(null)}
        />
      )}
      {prompt === 'wcb-claim-list' && (
        <WcbClaimListDialog
          onPick={(i) => { const c = claims[i]; if (c) { setForm((f) => withClaim(f, c)); setSaved(false) } setPrompt(null) }}
          onClose={() => setPrompt(null)}
        />
      )}
      {prompt === 'update-wcb-claim-list' && (
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
      style={{ border: 'none', borderRight: RULE, background: 'transparent', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, font: 'inherit', cursor: 'default' }}
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

function IdRow({ cells }: { cells: [string, string, number?][] }) {
  return (
    <div className="pb-row" style={{ gap: 0, padding: '3px 6px', borderBottom: '1px solid #e2e2e2' }}>
      {cells.map(([label, value, w], i) => (
        <span key={i} style={{ width: w, flex: w ? 'none' : '1 1 auto', whiteSpace: 'nowrap' }}>
          {label}&nbsp;<b>{value}</b>
        </span>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid #6d6d6d' }}>
      <div style={{ color: NAVY, fontWeight: 700, padding: '4px 8px 2px' }}>{title}</div>
      {children}
    </div>
  )
}

function Line({ label, top, children }: { label: ReactNode; top?: boolean; children: ReactNode }) {
  const style: CSSProperties = { display: 'flex', alignItems: top ? 'flex-start' : 'center', gap: 6, padding: '4px 8px 4px 20px', borderTop: '1px solid #e6e6e6' }
  return (
    <div style={style}>
      <span style={{ width: 170, flex: 'none' }}>{label}</span>
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

/* --- Claim No. F4 / "…" -----------------------------------------------------
   Art. 303852: "press F4 in the Claim Number Field and select the correct
   claim". The chart's WCB Claims rows, in the columns Demographics shows
   them (DemographicsView WcbClaimsPage). */
function WcbClaimListDialog({ onPick, onClose }: { onPick: (i: number) => void; onClose: () => void }) {
  const patient = usePatient()
  const [cur, setCur] = useState(0)
  const rows = (patient.wcbClaims ?? []).map((c, i) => ({
    i: String(i), doi: c.doi ?? '', claim: c.claim ?? '', area: c.area ?? '', nature: c.nature ?? '',
    icd9: c.icd9 ?? '', employer: c.employer ?? c.company ?? '', default: c.isDefault ? 'Y' : '',
  }))
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ position: 'fixed', padding: 8, zIndex: 93 }}>
      <PBWindow child controls={false} tutorialId="host.mois.dialog.wcb-claim-list" title="WCB Claim List" onClose={onClose}
        style={{ width: 'min(640px, 100%)', height: 'min(300px, 100%)' }}>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 6 }}>
          <PBDataWindow
            columns={[
              { key: 'doi', header: 'DOI', width: 80, align: 'center' },
              { key: 'claim', header: 'Claim No.', width: 90 },
              { key: 'area', header: 'Area of Injury', width: 90 },
              { key: 'nature', header: 'Nature of Injury', width: 94 },
              { key: 'icd9', header: 'Diagnosis', width: 66 },
              { key: 'employer', header: 'Employer' },
              { key: 'default', header: 'Default', width: 48, align: 'center' },
            ]}
            rows={rows}
            current={cur}
            onCurrentChange={setCur}
            onActivate={(r) => onPick(Number(r.i))}
            rowTutorialId={(r) => `host.mois.row.wcb-claim-${Number(r.i) + 1}`}
            empty="No WCB claims on file."
          />
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 19, padding: '6px 0 10px', flex: 'none' }}>
          <CommandButton id="wcb-claim-select" disabled={!rows.length} onClick={() => onPick(cur)}>Select</CommandButton>
          <CommandButton id="wcb-claim-cancel" onClick={onClose}>Cancel</CommandButton>
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
   "Allows you to print the form instead of sending it electronically" (art.
   356054). No printed WCB form is captured; the page is the form's own
   captions and values in its own order, in the page markup ReportPage reads
   (screens/PrintFlow). */
function printPages(form: WcbFormState, ctx: {
  patient: { chart: string; first: string; middle: string; last: string; dob: string }
  encounterId: string; encounterDate: string; attending: string; createdBy: string; created: string
}): string[] {
  const p = ctx.patient
  const clean = (v: string) => v.replace(/\|/g, '/').replace(/\*\*/g, '')
  const row = (...cells: string[]) => `%TR%${cells.map(clean).join('|')}`
  const lines = [
    '%TITLE%WCB Form',
    '',
    '%COLS:20,30,20,30%',
    row('CHART:', p.chart, 'DoB:', p.dob),
    row('FIRST:', p.first.toUpperCase(), 'LAST:', p.last.toUpperCase()),
    row('Enc #:', ctx.encounterId, 'Date:', ctx.created || ctx.encounterDate),
    row('Attending:', ctx.attending, 'Create by:', ctx.createdBy),
    '%S%Claim Information',
    '%COLS:20,30,20,30%',
    row('Claim No.:', form.claim, 'ICD9:', form.icd9),
    row('DOI:', form.doi, 'Fee:', form.fee),
    row('Area of Injury:', form.area, 'Bill Status:', form.billStatus),
    row('Anatomic Position:', form.position, 'MSP Seq. No.:', form.mspSeq),
    row('Nature of Injury:', form.nature, '', ''),
    '%S%Employer Information',
    '%COLS:20,30,20,30%',
    row('Company:', form.company, 'Phone:', form.phone),
    row('Address:', form.address, 'City:', form.city),
    row('Province:', form.province, 'Postal Code:', form.postal),
    row('Country:', form.country, '', ''),
    '%S%General Claim Information',
    '%COLS:40,60%',
    row('Who rendered 1st treatment:', form.firstTreatment),
    row('Are you the family MD:', form.familyMd),
    row('Prior/Other Medical Problems:', form.prior),
    row('Diagnosis:', form.diagnosis),
    '%S%Return to Work Plan',
    '%COLS:40,60%',
    row('Disabled from work place?', [form.disabled, form.disabledWhen].filter(Boolean).join(', ')),
    row('Capable of Full Time / Full Duties:', [form.fullDuties, form.restrictions].filter(Boolean).join(', ')),
    row('Time to RTW Place:', form.rtw),
    row('Ready for Rehab Program?', [form.rehab, form.rehabType].filter(Boolean).join(', ')),
    row('Consult WCB Adviser:', form.consult),
    row('Est. MMR:', form.mmr),
    row('Report to Follow:', form.followUp),
  ]
  if (form.note) lines.push('%S%Progress Note', `Author: ${clean(form.note.author)}`, ...clean(form.note.text).split('\n'))
  return [lines.join('\n')]
}
