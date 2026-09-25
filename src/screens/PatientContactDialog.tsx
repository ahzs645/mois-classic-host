import { useState } from 'react'
import { useScreenReport } from '../host/screen-state'
import { PBBand, PBCheckbox, PBDataWindow, PBInput, PBRadio, PBSelect, pbSlug, usePBInstrumentation } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   The Chart Navigator's Mail Merge: Patient Contact → Select Letter Template
   → (letterhead populators) Primary Provider List.

   PROVENANCE — 304025 "Create a Recall List Using Mail Merge" (v02.17.15
   b150210):
   · `1a6d9804` / `7b846020` — Patient Contact, opened by the navigator's
     Mail Merge... : a `Patient Contact` band, then the `Contact Type` group
     (Mail Merge Only · Call List Only · Call List / Mail Merge Combination,
     Mail Merge Only set) and the `Mail Merge Settings` group (Letter
     Template [read-only] [...], ☑ Add letter record to patient charts after
     printing); Continue / Cancel.
   · `6afe2341` (v02.17.32) — Select Letter Template: Search:, a two-band
     list (Recent, Letter) and the Letter Preview; Select (F2) / Cancel. The
     template names are the capture's, MOIS's "LETER" typo included.
   · `180b1b38` — Primary Provider List, for a letter with provider-letterhead
     populators: a `Primary Provider List` band, two filter boxes, Registered
     Provider / Pract. No. / Payee No., a description box, Home · PgUp · Ok ·
     Cancel · PgDwn · End, and Source [ALL] ☐ Save on Close.
   304381's older single "Mail Merge" window (`3d2e719d`, a Select
   Template/Form Letter drop-down with the preview beside it and Print) is the
   earlier build of the same step and is not reproduced.

   Each window swaps itself for the next through `open` (the frame holds one
   area window), carrying the choices along in args, so the Chart Navigator
   stays open underneath the whole time. Ok on the provider list closes the
   last window: MOIS prints one letter per patient left on the list.

   Window ids: `patient-contact`, `mail-merge-letter-template`,
   `primary-provider-list`. Reports `host.screen.contactType` /
   `letterTemplate` / `mergeProvider`.
   ========================================================================= */

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)

/* 6afe2341: the capture's own lists */
const RECENT = ['REFERRAL LETER', 'DEFAULT CONSULTATION NOTE', 'RECALLS', 'TESTING', 'OLD REFERRAL LETTER']
const LETTER = ['DEFAULT CONSULTATION NOTE', 'OLD REFERRAL LETTER', 'PAP RECALL LETTER', 'RECALLS', 'REFERRAL LETER', 'TESTING']
type TemplateRow = { group: string; name: string }
const TEMPLATES: TemplateRow[] = [
  ...RECENT.map((name) => ({ group: 'Recent', name })),
  ...LETTER.map((name) => ({ group: 'Letter', name })),
]

/** templates whose letterhead is filled from a provider (304025 `180b1b38`) */
const PROVIDER_LETTERHEAD = new Set(['PAP RECALL LETTER', 'RECALLS'])

/* ===========================================================================
   Patient Contact
   ======================================================================== */
function PatientContactWindow({ args, close, open }: AreaWindowProps) {
  const [type, setType] = useState(str(args.contactType, 'mail-merge'))
  const [addRecord, setAddRecord] = useState(args.addRecord !== false)
  const template = str(args.template)
  useScreenReport({ contactType: type, letterTemplate: pbSlug(template) })
  const carry = { contactType: type, addRecord, template }
  const cont = () => {
    if (!template && type !== 'call-list') return
    if (PROVIDER_LETTERHEAD.has(template)) { open('primary-provider-list', carry); return }
    close()
  }
  const host = usePBInstrumentation()
  return (
    <WorkspaceDialogFrame id="patient-contact" title="Patient Contact" width={410} height={370} controls={false} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', padding: '10px 16px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', border: '1px solid #646464' }}>
          <PBBand>Patient Contact</PBBand>
          <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <fieldset className="pb-fieldset" style={{ margin: 0 }}>
              <legend className="pb-fieldset__legend" style={{ fontWeight: 700, color: '#000' }}>Contact Type</legend>
              <div className="pb-fieldset__body" style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '4px 20px 8px' }}>
                <PBRadio name="contact-type" label="Mail Merge Only" checked={type === 'mail-merge'} onChange={() => setType('mail-merge')} />
                <PBRadio name="contact-type" label="Call List Only" checked={type === 'call-list'} onChange={() => setType('call-list')} />
                <PBRadio name="contact-type" label="Call List / Mail Merge Combination" checked={type === 'combination'} onChange={() => setType('combination')} />
              </div>
            </fieldset>
            <fieldset className="pb-fieldset" style={{ margin: 0 }}>
              <legend className="pb-fieldset__legend" style={{ fontWeight: 700, color: '#000' }}>Mail Merge Settings</legend>
              <div className="pb-fieldset__body" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 8px 8px' }}>
                <div className="pb-row" style={{ gap: 6 }}>
                  <span className="pb-form__label">Letter Template:</span>
                  <span className="pb-inputgroup" style={{ width: 226 }}>
                    <input className="pb-field" readOnly value={template} data-tutorial-id="host.mois.field.merge-letter-template" style={{ background: '#e8e8e8' }} />
                    <button
                      type="button"
                      className="pb-inputgroup__btn pb-inputgroup__btn--dots"
                      disabled={type === 'call-list'}
                      data-tutorial-id={host?.anchor('command', 'contact-template')}
                      onClick={() => { host?.report('command', { command: 'contact-template' }); open('mail-merge-letter-template', carry) }}
                    >
                      …
                    </button>
                  </span>
                </div>
                <div style={{ paddingLeft: 44 }}>
                  <PBCheckbox label="Add letter record to patient charts after printing" checked={addRecord} onChange={setAddRecord} />
                </div>
              </div>
            </fieldset>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, padding: '10px 0', flex: 'none' }}>
          <DialogButton id="contact-continue" width={90} isDefault onClick={cont}>Continue</DialogButton>
          <DialogButton id="contact-cancel" width={90} onClick={close}>Cancel</DialogButton>
        </div>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* ===========================================================================
   Select Letter Template (for a merge)
   ======================================================================== */
const Pop = ({ children, big }: { children: string; big?: boolean }) => (
  <span style={{ background: '#ffff9c', fontSize: big ? 15 : undefined, color: big ? '#808000' : undefined }}>{children}</span>
)

function LetterPreview({ name }: { name: string }) {
  const recall = name === 'PAP RECALL LETTER' || name === 'RECALLS'
  return (
    <div style={{ width: 360, minHeight: 470, margin: '14px auto', background: '#fff', boxShadow: '2px 2px 4px #7a7a7a', padding: '26px 34px', fontSize: 11, lineHeight: 1.35 }}>
      <div><Pop big>[Author Letterhead 1]</Pop></div>
      {[2, 3, 4, 5].map((n) => <div key={n} style={{ fontSize: 9 }}><Pop>{`[Author Letterhead ${n}]`}</Pop></div>)}
      <div style={{ marginTop: 18 }}><Pop>[Record Date]</Pop></div>
      <div style={{ marginTop: 10 }}><Pop>[Provider Altered Name]</Pop></div>
      {recall && (
        <>
          <div style={{ marginTop: 24 }}><Pop>[Patient Full Name]</Pop></div>
          <div><Pop>[Patient Address 1]</Pop></div>
          <div><Pop>[Patient City]</Pop> , <Pop>[Patient Province]</Pop></div>
          <div>DOB: <Pop>[Patient Date of Birth]</Pop></div>
          <div>Insurance: <Pop>[Patient PHN Province]</Pop> <Pop>[Patient PHN]</Pop></div>
          <div>H: <Pop>[Patient Primary Phone]</Pop> W: <Pop>[Patient Secondary Phone]</Pop> C: <Pop>[Patient Tertiary Phone]</Pop></div>
          <div style={{ marginTop: 14 }}>Dear <Pop>[Patient First Name]</Pop> ,</div>
          <div style={{ marginTop: 10 }}>Our records indicate that you are overdue for your Pap Smear. Please call our office to schedule this appointment.</div>
          <div style={{ marginTop: 10 }}>Sincerely,</div>
          <div style={{ marginTop: 10 }}><Pop>[Provider Signature]</Pop></div>
        </>
      )}
    </div>
  )
}

function MergeTemplateWindow({ args, open }: AreaWindowProps) {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const q = search.trim().toUpperCase()
  const rows = !q ? TEMPLATES : TEMPLATES.filter((t) => (q.startsWith('*') ? t.name.includes(q.slice(1)) : t.name.startsWith(q)))
  const start = rows.findIndex((t) => t.name === str(args.template))
  const [cur, setCur] = useState(start >= 0 ? start : 0)
  const picked = rows[cur] ?? rows[0]
  useScreenReport({ letterTemplate: pbSlug(picked?.name ?? '') })
  const back = (template?: string) => open('patient-contact', { ...args, ...(template ? { template } : {}) })
  return (
    <WorkspaceDialogFrame id="mail-merge-letter-template" title="Select Letter Template" width={935} height={680} controls={false} onClose={() => back()}>
      <div className="pb-row" style={{ gap: 6, padding: '6px 8px', flex: 'none' }}>
        <span className="pb-form__label">Search:</span>
        <PBInput w={310} value={search} onChange={(e) => { setSearch(e.target.value); setCur(0) }} />
      </div>
      <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, gap: 4, padding: '0 6px 6px' }}>
        <div style={{ width: 462, flex: 'none', display: 'flex', minHeight: 0 }}>
          <PBDataWindow
            rows={rows}
            current={cur}
            onCurrentChange={setCur}
            onActivate={(t) => back(t.name)}
            groupBy={(t: TemplateRow) => t.group}
            groupLabel={(g) => g}
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            rowTutorialId={(t) => (t.group === 'Letter' ? `host.mois.row.template-${pbSlug(t.name)}` : undefined)}
            head={false}
            style={{ ['--pb-dw-group' as string]: '#a6caf0', ['--pb-dw-select' as string]: '#f0a088', ['--pb-dw-row-h' as string]: '21px' }}
            columns={[{ key: 'name', header: '' }]}
            empty="No templates match that search."
          />
        </div>
        <div className="pb-groupbox" style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <PBBand>Letter Preview</PBBand>
          <div data-tutorial-id="host.mois.field.merge-letter-preview" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#cfc8c2' }}>
            {picked && <LetterPreview name={picked.name} />}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '4px 0 10px', flex: 'none' }}>
        <DialogButton id="template-select" width={92} isDefault onClick={() => picked && back(picked.name)}>Select (F2)</DialogButton>
        <DialogButton id="template-cancel" width={92} onClick={() => back()}>Cancel</DialogButton>
      </div>
      {/* the frame's × and Cancel go back to Patient Contact */}
    </WorkspaceDialogFrame>
  )
}

/* ===========================================================================
   Primary Provider List
   ======================================================================== */
const MERGE_PROVIDERS = [
  { provider: 'BEARDWOOD, WALTER', pract: '12345', payee: '00001' },
  { provider: 'DUCHARME, AMARILYS', pract: '', payee: '' },
  { provider: 'FAIRCHILD, NESRIN L', pract: '41903', payee: '00001' },
  { provider: 'HOWSER, DOOGIE', pract: '30117', payee: '00001' },
  { provider: 'SHEWCHUK, LEAH', pract: '22781', payee: '00001' },
  { provider: 'TECHNICAL SUPPORT', pract: '', payee: '' },
]

function PrimaryProviderListWindow({ close }: AreaWindowProps) {
  const [cur, setCur] = useState(0)
  useScreenReport({ mergeProvider: pbSlug(MERGE_PROVIDERS[cur]?.provider ?? '') })
  return (
    <WorkspaceDialogFrame id="primary-provider-list" title="Primary Provider List" width={680} height={575} controls={false} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: '8px 10px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid #646464' }}>
          <PBBand>Primary Provider List</PBBand>
          <div className="pb-row" style={{ gap: 0, padding: '2px 0 2px 16px', background: 'var(--pb-face)', flex: 'none' }}>
            <PBInput w={270} /><PBInput w={104} />
          </div>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#fff' }}>
            <PBDataWindow
              rows={MERGE_PROVIDERS}
              current={cur}
              onCurrentChange={setCur}
              onActivate={() => close()}
              rowTutorialId={(r) => `host.mois.row.provider-${pbSlug(r.provider)}`}
              columns={[
                { key: 'provider', header: 'Registered Provider', width: 270 },
                { key: 'pract', header: 'Pract. No.', width: 104 },
                { key: 'payee', header: 'Payee No.', width: 104 },
              ]}
            />
          </div>
          <div style={{ height: 54, borderTop: '1px solid #a0a0a0', background: '#fff', padding: '3px 4px', flex: 'none' }}>
            This is the Primary Provider list box
          </div>
        </div>
        <div className="pb-row" style={{ gap: 2, padding: '8px 0 4px', flex: 'none' }}>
          <DialogButton id="provider-home" width={76}>Home</DialogButton>
          <DialogButton id="provider-pgup" width={76}>PgUp</DialogButton>
          <span style={{ flex: '1 1 auto' }} />
          <DialogButton id="provider-ok" width={86} isDefault onClick={close}>Ok</DialogButton>
          <DialogButton id="provider-cancel" width={86} onClick={close}>Cancel</DialogButton>
          <span style={{ flex: '1 1 auto' }} />
          <DialogButton id="provider-pgdwn" width={76}>PgDwn</DialogButton>
          <DialogButton id="provider-end" width={76}>End</DialogButton>
        </div>
        <div className="pb-row" style={{ gap: 6, padding: '2px 0 8px', flex: 'none' }}>
          <span className="pb-form__label">Source:</span>
          <PBSelect w={190} options={['ALL']} />
          <PBCheckbox label="Save on Close" />
        </div>
      </div>
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow('patient-contact', PatientContactWindow)
registerAreaWindow('mail-merge-letter-template', MergeTemplateWindow)
registerAreaWindow('primary-provider-list', PrimaryProviderListWindow)
