import { useState, type ReactNode } from 'react'
import type { DesignerRow } from '../data/designerSection'
import { useScreenReport } from '../host/screen-state'
import { PBBand, PBButton, PBCheckbox, PBDataWindow, PBInput, PBMessageBox, PBSelect, PBTextArea, PBWindow, pbSlug, usePBInstrumentation } from '../pb'
import { SelectAllPair, useTickSet } from './listKit'
import { DesktopLayer } from './StageWindow'

/* ============================================================================
   Administration ▸ Designer Section ▸ Paper (PDF) Forms — the two windows
   the Paper Form List's taskbar opens that the Import dialog does not cover.

   PROVENANCE: 303112. Neither window is captured anywhere in the corpus; both
   are reconstructed from the article's sentences and laid out on the one
   Paper Forms dialog that is captured, `Import Paper Forms` (303237
   `d837934e…`: a band with a file box and Browse…, an "Available Forms" band
   over a ticked grid, Select All / Unselect All left and Ok / Cancel
   centred). INFERRED throughout.

   new-paper-form     New Record — "In adding a new record, you will be
                      prompted to locate a fillable PDF document and at the
                      very least also give the form a name. After creating a
                      new record, an edit window is shown allowing you to
                      assign data to the text fields in your PDF file."
                      File (PDF) with Browse… (the stage's stand-in for the
                      OS picker, filling a fixed path), Name (required),
                      Code, Description, Form Author, Form Group; Create
                      Record / Cancel. Create Record hands the values to the
                      list, which opens Paper Form Detail on the new form.
                      MOIS "will not accept a form that has one or more form
                      fields with the same title" — a message box if the
                      picked PDF is the duplicate-titled sample.
     export-paper-forms Export Forms — "you will be prompted to select an
                      output location where the form package will be saved.
                      A list of all of the available forms is shown below and
                      you can make selections by clicking the checkboxes …
                      As soon as you click OK, MOIS will export all of the
                      forms you have selected and save them to the file that
                      you have specified."
   ========================================================================= */

const BAND = '#dcd7d2'

/** What Browse… picks, in turn: a good fillable PDF, then one whose fields
    repeat a title (303112 "Field Titles"). */
const PDF_PICKS = [
  { path: 'C:\\Users\\mois\\Documents\\Forms\\Home Care Referral.pdf', fields: 14, duplicate: false },
  { path: 'C:\\Users\\mois\\Documents\\Forms\\Wound Assessment (draft).pdf', fields: 9, duplicate: true },
]

function Frame({ id, title, w, h, onClose, children, footer }: {
  id: string; title: string; w: number; h: number; onClose: () => void; children: ReactNode; footer: ReactNode
}) {
  const host = usePBInstrumentation()
  useScreenReport({ dialog: id })
  return (
    <DesktopLayer>
      <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 82 }}>
        <div data-tutorial-id={host?.anchor('dialog', id)}>
          <PBWindow child controls={false} title={title} onClose={onClose} style={{ width: w, height: h, maxWidth: '100%', maxHeight: '100%' }}>
            {children}
            <div className="pb-footer">{footer}</div>
          </PBWindow>
        </div>
      </div>
    </DesktopLayer>
  )
}

function Button({ id, label, onClick, isDefault, disabled }: { id: string; label: string; onClick: () => void; isDefault?: boolean; disabled?: boolean }) {
  return (
    <PBButton wide className={isDefault ? 'pb-btn--default' : undefined} disabled={disabled} command={id} onClick={() => onClick()}>
      {label}
    </PBButton>
  )
}

export function NewPaperFormDialog({ onCreate, onClose }: { onCreate: (values: Record<string, string>) => void; onClose: () => void }) {
  const [pick, setPick] = useState(-1)
  const [values, setValues] = useState<Record<string, string>>({ 'Form Author:': 'CLINIC', 'Form Group:': 'FORMS' })
  const [error, setError] = useState<string | null>(null)
  const set = (k: string) => (v: string) => setValues((x) => ({ ...x, [k]: v }))
  const file = PDF_PICKS[pick]
  const create = () => {
    if (!file) { setError('Please select a fillable PDF document.'); return }
    if (file.duplicate) { setError('This PDF has more than one form field with the same title. MOIS will not accept a form whose field titles repeat; rename the fields in your form designer and try again.'); return }
    if (!values['Name:']?.trim()) { setError('Please enter a name for the form.'); return }
    onCreate({ ...values, 'File (PDF):': file.path })
  }
  const text = (label: string, w: number) => (
    <>
      <span className="pb-form__label">{label}</span>
      <PBInput w={w} value={values[label] ?? ''} onChange={(e) => set(label)(e.target.value)} data-tutorial-id={`host.mois.field.new-paper-form-${pbSlug(label)}`} />
    </>
  )
  return (
    <Frame id="new-paper-form" title="New Paper Form" w={560} h={360} onClose={onClose}
      footer={<><span className="pb-footer__spacer" /><Button id="new-paper-form-create" label="Create Record" isDefault onClick={create} /><Button id="new-paper-form-cancel" label="Cancel" onClick={onClose} /><span className="pb-footer__spacer" /></>}>
      <div style={{ flex: '1 1 auto', minHeight: 0, background: 'var(--pb-face)', padding: '10px 14px 0' }}>
        <div style={{ border: '1px solid #a0a0a0', background: 'var(--pb-face)' }}>
          <div className="pb-band" style={{ background: BAND }}>New Record</div>
          <div className="pb-form" style={{ gridTemplateColumns: '96px 1fr', padding: '8px 10px', alignItems: 'center' }}>
            <span className="pb-form__label">File (PDF):</span>
            <span className="pb-row" style={{ gap: 6 }}>
              <PBInput w={320} readOnly value={file?.path ?? ''} data-tutorial-id="host.mois.field.new-paper-form-file" />
              <PBButton command="new-paper-form-browse" onClick={() => setPick((p) => (p + 1) % PDF_PICKS.length)}>
                Browse...
              </PBButton>
            </span>
            <span />
            <span style={{ color: '#505050' }}>{file ? `${file.fields} fillable fields found.` : 'Locate a fillable PDF document.'}</span>
            {text('Name:', 300)}
            {text('Code:', 140)}
            <span className="pb-form__label">Description:</span>
            <PBTextArea rows={2} w={380} value={values['Description:'] ?? ''} onChange={(e) => set('Description:')(e.target.value)} data-tutorial-id="host.mois.field.new-paper-form-description" />
            <span className="pb-form__label">Form Author:</span>
            <PBSelect w={150} options={['CLINIC', 'MOIS', 'NH', 'GOVT-BC', 'MISC']} value={values['Form Author:']} onChange={(e) => set('Form Author:')(e.target.value)} data-tutorial-id="host.mois.field.new-paper-form-form-author" />
            <span className="pb-form__label">Form Group:</span>
            <PBSelect w={150} options={['FORMS', 'REFERRAL', 'LAB', 'IMAGING', 'REQ-LAB', 'MISC']} value={values['Form Group:']} onChange={(e) => set('Form Group:')(e.target.value)} data-tutorial-id="host.mois.field.new-paper-form-form-group" />
          </div>
        </div>
      </div>
      {error && (
        <PBMessageBox title="New Paper Form" icon="warn" buttons={[{ label: 'OK', value: 'ok', default: true, command: 'new-paper-form-error-ok' }]} onClose={() => setError(null)}>
          {error}
        </PBMessageBox>
      )}
    </Frame>
  )
}

export function ExportPaperFormsDialog({ forms, onClose }: { forms: DesignerRow[]; onClose: () => void }) {
  const [file, setFile] = useState('')
  const picked = useTickSet()
  const [cur, setCur] = useState(0)
  const [done, setDone] = useState<number | null>(null)
  const count = picked.size
  useScreenReport({ dialog: 'export-paper-forms', exportPicked: count, exportFile: !!file })
  return (
    <Frame id="export-paper-forms" title="Export Paper Forms" w={867} h={561} onClose={onClose}
      footer={<>
        <SelectAllPair as="anchor" ids={['export-select-all', 'export-unselect-all']}
          onSelectAll={() => picked.selectAll(forms.map((_, i) => i))} onUnselectAll={picked.clear} />
        <span className="pb-footer__spacer" />
        <Button id="export-paper-forms-ok" label="Ok" isDefault disabled={!file || !count} onClick={() => setDone(count)} />
        <Button id="export-paper-forms-cancel" label="Cancel" onClick={onClose} />
        <span className="pb-footer__spacer" />
      </>}>
      <div style={{ flex: 'none' }}>
        <div className="pb-band" style={{ background: BAND }}>Export File:</div>
        <div className="pb-row" style={{ gap: 6, padding: '5px 8px', background: 'var(--pb-face)' }}>
          <span className="pb-form__label">File (7z):</span>
          <PBInput w={560} readOnly value={file} data-tutorial-id="host.mois.field.export-file-7z" />
          <PBButton command="export-browse" onClick={() => setFile('M:\\0222\\paperforms\\ClinicForms.7z')}>
            Browse...
          </PBButton>
        </div>
      </div>
      <PBBand>Available Forms</PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 8px' }}>
        <PBDataWindow
          rows={forms}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(r) => `host.mois.row.export-${pbSlug(String(r.name ?? '').slice(0, 32))}`}
          style={{ ['--pb-dw-row-h' as string]: '18px' }}
          columns={[
            {
              key: 'select', header: 'Select', width: 46, align: 'center',
              render: (_r: DesignerRow, i: number) => <PBCheckbox checked={picked.has(i)} onChange={(v) => picked.set(i, v)} tutorialId={`host.mois.cell.export-select-${i}`} />,
            },
            { key: 'name', header: 'Name', width: 240 },
            { key: 'code', header: 'Code', width: 100 },
            { key: 'desc', header: 'Description', width: 240 },
            { key: 'author', header: 'Form Author', width: 90 },
            { key: 'group', header: 'Form Group' },
          ]}
        />
      </div>
      {done !== null && (
        <PBMessageBox title="Export Paper Forms" buttons={[{ label: 'OK', value: 'ok', default: true, command: 'export-done-ok' }]} onClose={() => { setDone(null); onClose() }}>
          {done} form(s) exported to {file}.
        </PBMessageBox>
      )}
    </Frame>
  )
}
