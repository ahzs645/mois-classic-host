import { useState, type ReactNode } from 'react'
import {
  AGREEMENT_PDF_FILES, AGREEMENT_RESPONSES, AGREEMENT_RESPONSES_KEY, USER_AGREEMENTS, USER_AGREEMENTS_KEY,
  newAgreementVersion, pendingAgreement,
  type AgreementAnnotation, type AgreementResponse, type AgreementResponseMode, type AgreementVersion, type UserAgreement,
} from '../data/adminConfig'
import { MOIS_TODAY } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import { PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBRadio, PBViewHeader, pbSlug } from '../pb'
import { Btn, DetailWindow, FieldLabel, TopMessage } from './AdminExchangeKit'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { registerFolderView, type FolderViewProps } from './folderViewRegistry'

/* ============================================================================
   Administration ▸ Configuration ▸ User Agreements, and the agreement a user
   must answer at login — 3363428 "User Agreements".

   PROVENANCE
   · The tree node — 3768908 `5e0a163c…` (current build): User Agreements
     under Printer Profiles in Configuration.
   · The folder's list window has NO capture. It is INFERRED as the
     Configuration folders' list idiom (New Record / Delete Record / Edit
     Record / Close Window over a grid): Agreement Name, Current Version,
     Expiry, Response.
   · New User Agreement — `ab957477…`: Name, PDF File, Browse, Create New /
     Cancel. Create New opens Edit User Agreement on the new agreement
     ("Then, click 'Create New'" → "Make additional selections").
   · Edit User Agreement — `633d9338…`: Agreement Name with Create New
     Version and Update PDF at the top; left, an "Expiry Date" list of the
     versions (Perpetual); "Version Detail": Title, Expiry, User response
     option(s) Accept / Decline · Read / Ignore · Ignore Only, "Save PDF w/
     annotation for each user response: Yes / No", then the header / footer /
     watermark groups (Accepted / Declined / Read / Ignored ticks, text,
     Font Size, Font Colour "…", Alignment or Rotation) and the dynamic-text
     note; right, the PDF preview; Save / Cancel.
   · New Version of Current User Agreement — `1fa0e931…`: "Set previous
     agreement's expiry date to:" 0000.00.00, New version's Title, File,
     Browse. Its buttons are below the capture's edge: Ok / Cancel INFERRED.
   · The file Browse opens is Windows' Open dialog — INFERRED as a list of
     PDFs in "MOIS Cloud Files" (the article: "If using MOIS Cloud, ensure
     you have put the file in MOIS Cloud Files").
   · What the user sees — `07f8f771…`: a PDF viewer titled "<agreement> -
     <version title>" with the viewer toolbar, Later at the bottom left and
     Decline / Accept at the right. Read / Ignore and Ignore Only show
     those buttons instead (INFERRED from "User can select as Read or
     Ignore").
   · Decline — `10d50c43…`: "Access Denied": "You are not permitted to
     access MOIS without accepting the previous user agreement. Please
     contact your system administrator for further instructions." OK.
   · User Account ▸ Other ▸ User Agreements — `c4de1672…`: a grid headed by
     the agreement name (Terms of Use) listing version, date and response;
     a Declined row is grey. "Click on 'View' to view, save, or print a copy
     of the User's response" — View opens the saved copy with its header
     and watermark (`86770703…`, `f8dba004…`).

   Session: USER_AGREEMENTS_KEY (the agreements and versions),
   AGREEMENT_RESPONSES_KEY (the stage user's responses). The bundled user has
   accepted Terms of Use v2024, so a login meets nothing until a lesson adds
   an agreement or a new version.

   Reported: `host.dialog`; `host.screen.rows`, `host.screen.row`;
   `host.screen.agreement` (accepted / declined / read / ignored / later) on
   the login prompt; `host.screen.saved` on Edit User Agreement.
   ========================================================================= */

export const USER_AGREEMENT_PROMPT = 'user-agreement-prompt'

export function useAgreements() {
  return useSessionState<UserAgreement[]>(USER_AGREEMENTS_KEY, USER_AGREEMENTS)
}
export function useAgreementResponses() {
  return useSessionState<AgreementResponse[]>(AGREEMENT_RESPONSES_KEY, AGREEMENT_RESPONSES)
}

/** The agreement the next login must answer, if any (LoginDialog reads it). */
export function usePendingAgreement() {
  const [agreements] = useAgreements()
  const [responses] = useAgreementResponses()
  return pendingAgreement(agreements, responses, MOIS_TODAY)
}

const MODE_LABEL: Record<AgreementResponseMode, string> = {
  'accept-decline': 'Accept / Decline', 'read-ignore': 'Read / Ignore', 'ignore-only': 'Ignore Only',
}

/* --- the Browse file picker (INFERRED) --------------------------------------- */
function PdfBrowse({ onPick, onClose }: { onPick: (file: string) => void; onClose: () => void }) {
  const [cur, setCur] = useState(0)
  return (
    <DetailWindow id="agreement-browse" title="Open" width={460} height={320} zIndex={95} onClose={onClose}
      buttons={<>
        <Btn id="agreement-browse-open" isDefault width={80} onClick={() => onPick(AGREEMENT_PDF_FILES[cur]!)}>Open</Btn>
        <Btn id="agreement-browse-cancel" width={80} onClick={onClose}>Cancel</Btn>
      </>}>
      <div style={{ padding: '4px 8px' }}>Look in: <b>MOIS Cloud Files</b></div>
      <div style={{ flex: '1 1 auto', display: 'flex', padding: '0 8px 6px' }}>
        <PBDataWindow rows={AGREEMENT_PDF_FILES.map((name) => ({ name }))} current={cur} onCurrentChange={setCur}
          onActivate={(r) => onPick(r.name)}
          rowTutorialId={(r) => `host.mois.row.file-${pbSlug(r.name)}`}
          columns={[{ key: 'name', header: 'Name', width: 360 }]} />
      </div>
    </DetailWindow>
  )
}

/* --- a drawn PDF page ----------------------------------------------------------- */
function AgreementPage({ title, header, watermark }: { title: string; header?: string; watermark?: string }) {
  const bar = (n: number, label: string) => (
    <div style={{ background: '#d83b01', color: '#fff', fontWeight: 700, padding: '2px 8px', margin: '0 0 70px' }}>{n}.&nbsp;&nbsp;&nbsp; {label}</div>
  )
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#808080', padding: 12 }}>
      <div style={{ position: 'relative', background: '#fff', maxWidth: 560, margin: '0 auto', padding: '14px 50px 40px', minHeight: 520, overflow: 'hidden' }}>
        {header && <div style={{ position: 'absolute', left: 6, top: 4, fontSize: 11 }}>{header}</div>}
        <div style={{ color: '#d83b01', fontWeight: 700, fontSize: 16, margin: '50px 0 8px' }}>{title}</div>
        {bar(1, 'Part A')}{bar(2, 'Part B')}{bar(3, 'Part C')}
        {watermark && (
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)', color: 'rgba(220,0,0,.75)', fontSize: 40, fontWeight: 700 }}>
            {watermark}
          </div>
        )}
      </div>
    </div>
  )
}

function ViewerToolbar() {
  return (
    <div className="pb-row" style={{ gap: 8, padding: '2px 6px', borderBottom: '1px solid #b8b8b8', flex: 'none' }}>
      <span>✋</span><span>📷</span><span>🔍 Zoom In ▾</span><span>1:1</span><span>79% ▾</span><span>⊖ ──●── ⊕</span>
    </div>
  )
}

/* ===========================================================================
   The folder
   ======================================================================== */
function UserAgreementsView({ close }: FolderViewProps) {
  const [agreements, setAgreements] = useAgreements()
  const [cur, setCur] = useState(0)
  const [win, setWin] = useState<null | 'new' | 'edit'>(null)
  const row = agreements[cur]
  useScreenReport({ rows: agreements.length, row: row ? pbSlug(row.name) : null })
  const rows = agreements.map((a) => {
    const v = a.versions[a.versions.length - 1]
    return { name: a.name, version: v?.title ?? '', expiry: v?.expiry || 'Perpetual', mode: v ? MODE_LABEL[v.mode] : '' }
  })
  return (
    <>
      <PBViewHeader title="User Agreement List" />
      <PBCommandRow commands={[
        { label: 'New Record', onClick: () => setWin('new') },
        { label: 'Delete Record', onClick: () => { setAgreements((all) => all.filter((_, i) => i !== cur)); setCur(0) } },
        { label: 'Edit Record', onClick: () => { if (row) setWin('edit') } },
        { label: 'Close Window', onClick: close },
      ]} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow rows={rows} current={cur} onCurrentChange={setCur} onActivate={(_, i) => { setCur(i); setWin('edit') }}
          rowTutorialId={(r) => `host.mois.row.agreement-${pbSlug(r.name)}`}
          columns={[
            { key: 'name', header: 'Agreement Name', width: 300 },
            { key: 'version', header: 'Current Version', width: 200 },
            { key: 'expiry', header: 'Expiry', width: 100, align: 'center' },
            { key: 'mode', header: 'Response', width: 140 },
          ]} />
      </div>
      {win === 'new' && (
        <NewUserAgreement
          onClose={() => setWin(null)}
          onCreate={(name, file) => {
            setAgreements((all) => [...all, { name, versions: [newAgreementVersion(name, file)] }])
            setCur(agreements.length)
            setWin('edit')
          }}
        />
      )}
      {win === 'edit' && row && (
        <EditUserAgreement
          agreement={row}
          onClose={() => setWin(null)}
          onSave={(next) => { setAgreements((all) => all.map((a, i) => (i === cur ? next : a))); setWin(null) }}
        />
      )}
    </>
  )
}

function NewUserAgreement({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, file: string) => void }) {
  const [name, setName] = useState('')
  const [file, setFile] = useState('')
  const [browsing, setBrowsing] = useState(false)
  return (
    <DetailWindow id="new-user-agreement" title="New User Agreement" width={420} onClose={onClose}
      buttons={<>
        <Btn id="agreement-create-new" isDefault width={90} disabled={!name.trim() || !file} onClick={() => onCreate(name.trim(), file)}>Create New</Btn>
        <Btn id="agreement-new-cancel" width={80} onClick={onClose}>Cancel</Btn>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '10px 14px', background: '#fff' }}>
        <span>Name</span>
        <PBInput w="100%" value={name} onChange={(e) => setName(e.target.value)} data-tutorial-id="host.mois.field.agreement-name" />
        <span>PDF File</span>
        <PBInput w="100%" value={file} readOnly data-tutorial-id="host.mois.field.agreement-file" />
        <div className="pb-row" style={{ justifyContent: 'flex-end' }}><Btn id="agreement-browse" width={70} onClick={() => setBrowsing(true)}>Browse</Btn></div>
      </div>
      {browsing && <PdfBrowse onClose={() => setBrowsing(false)} onPick={(f) => { setFile(f); setBrowsing(false) }} />}
    </DetailWindow>
  )
}

function AnnotationGroup({ title, value, onChange, third, prefix }: {
  title: string; value: AgreementAnnotation; onChange: (a: AgreementAnnotation) => void; third: 'Alignment' | 'Rotation'; prefix: string
}) {
  return (
    <fieldset className="pb-fieldset" style={{ margin: '4px 10px' }} data-tutorial-id={`host.mois.group.${prefix}`}>
      <legend className="pb-fieldset__legend">{title}</legend>
      <div className="pb-row" style={{ gap: 18 }}>
        {(['Accepted', 'Declined', 'Read', 'Ignored'] as const).map((k) => (
          <PBCheckbox key={k} label={k} checked={value.on[k]} onChange={(v) => onChange({ ...value, on: { ...value.on, [k]: v } })}
            tutorialId={`host.mois.field.${prefix}-${pbSlug(k)}`} />
        ))}
      </div>
      <div style={{ color: '#666', marginTop: 3 }}>{title.includes('watermark') ? 'Watermark Text*' : title.includes('footer') ? 'Footer Text*' : 'Header Text*'}</div>
      <PBInput w="100%" value={value.text} onChange={(e) => onChange({ ...value, text: e.target.value })} data-tutorial-id={`host.mois.field.${prefix}-text`} />
      <div className="pb-row" style={{ gap: 10, marginTop: 3, color: '#666' }}>
        <span style={{ width: 56 }}>Font Size</span><span style={{ width: 110 }}>Font Colour</span><span>{third}</span>
      </div>
      <div className="pb-row" style={{ gap: 10 }}>
        <PBInput w={56} value={value.size} onChange={(e) => onChange({ ...value, size: e.target.value })} />
        <span className="pb-row" style={{ width: 110, gap: 2 }}><PBInput w={88} value={value.colour} onChange={(e) => onChange({ ...value, colour: e.target.value })} /><button type="button" className="pb-btn" style={{ minWidth: 0, width: 18, padding: 0 }}>…</button></span>
        <PBInput w={60} value={value.align} onChange={(e) => onChange({ ...value, align: e.target.value })} />
      </div>
    </fieldset>
  )
}

function EditUserAgreement({ agreement, onClose, onSave }: { agreement: UserAgreement; onClose: () => void; onSave: (a: UserAgreement) => void }) {
  const [name, setName] = useState(agreement.name)
  const [versions, setVersions] = useState<AgreementVersion[]>(agreement.versions)
  const [vi, setVi] = useState(agreement.versions.length - 1)
  const [dialog, setDialog] = useState<null | 'version' | 'update-pdf'>(null)
  const [nvExpiry, setNvExpiry] = useState('0000.00.00')
  const [nvTitle, setNvTitle] = useState('')
  const [nvFile, setNvFile] = useState('')
  const [browsing, setBrowsing] = useState(false)
  const v = versions[vi] ?? versions[0]!
  const set = (patch: Partial<AgreementVersion>) => setVersions((all) => all.map((x, i) => (i === vi ? { ...x, ...patch } : x)))

  const createVersion = () => {
    setVersions((all) => [
      ...all.map((x, i) => (i === all.length - 1 ? { ...x, expiry: nvExpiry } : x)),
      { ...all[all.length - 1]!, title: nvTitle.trim(), file: nvFile, expiry: '' },
    ])
    setVi(versions.length)
    setDialog(null)
  }

  return (
    <DetailWindow id="edit-user-agreement" title="Edit User Agreement" width={972} height={718} onClose={onClose}
      buttons={<>
        <Btn id="agreement-save" isDefault width={90} onClick={() => onSave({ name, versions })}>Save</Btn>
        <Btn id="agreement-cancel" width={90} onClick={onClose}>Cancel</Btn>
      </>}>
      <div className="pb-row" style={{ gap: 8, padding: '5px 8px', flex: 'none', borderBottom: '1px solid #b8b8b8' }}>
        <FieldLabel w={96}>Agreement Name:</FieldLabel>
        <PBInput w={390} value={name} onChange={(e) => setName(e.target.value)} data-tutorial-id="host.mois.field.agreement-name" />
        <Btn id="create-new-version" onClick={() => { setNvTitle(''); setNvFile(''); setNvExpiry('0000.00.00'); setDialog('version') }}>Create New Version</Btn>
        <span className="pb-row__spacer" />
        <Btn id="update-pdf" onClick={() => setBrowsing(true)}>Update PDF</Btn>
      </div>
      <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0 }}>
        <div style={{ width: 100, flex: 'none', background: '#fff', borderRight: '1px solid #b8b8b8' }} data-tutorial-id="host.mois.group.agreement-versions">
          <div style={{ background: '#c8dcfa', color: '#666', padding: '2px 6px' }}>Expiry Date</div>
          {versions.map((x, i) => (
            <div key={i} onMouseDown={() => setVi(i)} data-tutorial-id={`host.mois.row.agreement-version-${i + 1}`}
              style={{ padding: '2px 6px', background: i === vi ? '#e8a08a' : undefined, cursor: 'default' }}>
              {i === vi ? '> ' : '  '}{x.expiry || 'Perpetual'}
            </div>
          ))}
        </div>
        <div style={{ width: 400, flex: 'none', overflow: 'auto', borderRight: '1px solid #b8b8b8' }}>
          <div style={{ background: '#c8dcfa', color: '#0a246a', fontWeight: 700, padding: '3px 8px' }}>Version Detail</div>
          <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 3, padding: '4px 10px' }}>
            <FieldLabel w={44}>Title:</FieldLabel><PBInput w="100%" value={v.title} onChange={(e) => set({ title: e.target.value })} data-tutorial-id="host.mois.field.agreement-title" />
            <FieldLabel w={44}>Expiry:</FieldLabel><PBInput w={80} value={v.expiry} placeholder="" onChange={(e) => set({ expiry: e.target.value })} data-tutorial-id="host.mois.field.agreement-expiry" />
          </div>
          <div style={{ padding: '2px 10px', color: '#666' }}>User response option(s)</div>
          <div className="pb-row" style={{ gap: 20, padding: '2px 16px' }}>
            {(Object.keys(MODE_LABEL) as AgreementResponseMode[]).map((m) => (
              <PBRadio key={m} name="agreement-mode" label={MODE_LABEL[m]} checked={v.mode === m} onChange={() => set({ mode: m })} tutorialId={`host.mois.field.agreement-mode-${m}`} />
            ))}
          </div>
          <div className="pb-row" style={{ gap: 10, padding: '4px 10px', color: '#666' }}>
            <span>Save PDF w/ annotation for each user response:</span>
            <PBRadio name="agreement-save-pdf" label="Yes" checked={v.savePdf} onChange={() => set({ savePdf: true })} tutorialId="host.mois.field.agreement-save-pdf-yes" />
            <PBRadio name="agreement-save-pdf" label="No" checked={!v.savePdf} onChange={() => set({ savePdf: false })} tutorialId="host.mois.field.agreement-save-pdf-no" />
          </div>
          {v.savePdf && (
            <>
              <div style={{ padding: '2px 10px', color: '#0a246a' }}>Add following annotation to the saved PDF document</div>
              <AnnotationGroup title="Add header when response is:" value={v.header} onChange={(header) => set({ header })} third="Alignment" prefix="agreement-header" />
              <AnnotationGroup title="Add footer when user response is:" value={v.footer} onChange={(footer) => set({ footer })} third="Alignment" prefix="agreement-footer" />
              <AnnotationGroup title="Add watermark when response is:" value={v.watermark} onChange={(watermark) => set({ watermark })} third="Rotation" prefix="agreement-watermark" />
            </>
          )}
          <div style={{ padding: '4px 10px', color: '#666', whiteSpace: 'normal' }}>
            *Dynamic text options: {'{action}'} , {'{user}'} , {'{date}'} , {'{time}'}<br />
            For example:  {'{action}'} on {'{date}'} -&gt; Accepted on Friday Dec 15, 2023
          </div>
        </div>
        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <ViewerToolbar />
          <AgreementPage title={v.title || name} />
          <div style={{ padding: '2px 6px', color: '#666' }}>{v.file}</div>
        </div>
      </div>
      {dialog === 'version' && (
        <DetailWindow id="new-agreement-version" title="New Version of Current User Agreement" width={480} zIndex={92} onClose={() => setDialog(null)}
          buttons={<>
            <Btn id="new-version-ok" isDefault width={80} disabled={!nvTitle.trim() || !nvFile} onClick={createVersion}>Ok</Btn>
            <Btn id="new-version-cancel" width={80} onClick={() => setDialog(null)}>Cancel</Btn>
          </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '8px 14px', background: '#fff' }}>
            <div className="pb-row" style={{ gap: 8 }}>
              <span style={{ color: '#666' }}>Set previous agreement's expiry date to:</span>
              <PBInput w={80} value={nvExpiry} onChange={(e) => setNvExpiry(e.target.value)} data-tutorial-id="host.mois.field.previous-expiry" />
            </div>
            <span style={{ color: '#666' }}>New version's:</span>
            <span>Title</span>
            <PBInput w="100%" value={nvTitle} onChange={(e) => setNvTitle(e.target.value)} data-tutorial-id="host.mois.field.new-version-title" />
            <span>File</span>
            <PBInput w="100%" value={nvFile} readOnly data-tutorial-id="host.mois.field.new-version-file" />
            <div className="pb-row" style={{ justifyContent: 'flex-end' }}><Btn id="new-version-browse" width={70} onClick={() => setDialog('update-pdf')}>Browse</Btn></div>
          </div>
        </DetailWindow>
      )}
      {dialog === 'update-pdf' && <PdfBrowse onClose={() => setDialog('version')} onPick={(f) => { setNvFile(f); setDialog('version') }} />}
      {browsing && <PdfBrowse onClose={() => setBrowsing(false)} onPick={(f) => { set({ file: f }); setBrowsing(false) }} />}
    </DetailWindow>
  )
}

/* ===========================================================================
   At login — what the user sees
   ======================================================================== */
function UserAgreementPrompt({ close }: AreaWindowProps) {
  const pending = usePendingAgreement()
  const [, setResponses] = useAgreementResponses()
  const [outcome, setOutcome] = useState<null | 'declined' | 'later' | 'accepted' | 'read' | 'ignored'>(null)
  useScreenReport({ agreement: outcome })
  if (outcome === 'declined') {
    return (
      <TopMessage id="access-denied" title="Access Denied" icon="error" buttons={['OK']} prefix="access-denied-" onClose={close}>
        {'You are not permitted to access MOIS without accepting the previous user agreement.\n\nPlease contact your system administrator for further instructions.'}
      </TopMessage>
    )
  }
  if (!pending) return null
  const { agreement, version } = pending
  const answer = (action: AgreementResponse['action']) => {
    setResponses((all) => [{ agreement: agreement.name, version: version.title, date: MOIS_TODAY, action }, ...all])
    if (action === 'Declined') { setOutcome('declined'); return }
    close()
  }
  const buttons: ReactNode = version.mode === 'accept-decline'
    ? <><Btn id="agreement-decline" width={76} onClick={() => answer('Declined')}>Decline</Btn><Btn id="agreement-accept" isDefault width={76} onClick={() => answer('Accepted')}>Accept</Btn></>
    : version.mode === 'read-ignore'
      ? <><Btn id="agreement-ignore" width={76} onClick={() => answer('Ignored')}>Ignore</Btn><Btn id="agreement-read" isDefault width={76} onClick={() => answer('Read')}>Read</Btn></>
      : <Btn id="agreement-ignore" isDefault width={76} onClick={() => answer('Ignored')}>Ignore</Btn>
  return (
    <DetailWindow id={USER_AGREEMENT_PROMPT} title={`${agreement.name} - ${version.title}`} width={680} height={718} zIndex={90}
      onClose={() => { setOutcome('later'); close() }}>
      <ViewerToolbar />
      <AgreementPage title={version.title} />
      <div className="pb-row" style={{ padding: '6px 8px', flex: 'none', borderTop: '1px solid #b8b8b8' }}>
        <Btn id="agreement-later" width={76} onClick={() => { setOutcome('later'); close() }}>Later</Btn>
        <span className="pb-row__spacer" />
        {buttons}
      </div>
    </DetailWindow>
  )
}

/* ===========================================================================
   User Account ▸ Other ▸ User Agreements
   ======================================================================== */
export function UserAgreementResponses() {
  const [responses] = useAgreementResponses()
  const [cur, setCur] = useState(0)
  const [viewing, setViewing] = useState<AgreementResponse | null>(null)
  const names = [...new Set(responses.map((r) => r.agreement))]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }} data-tutorial-id="host.mois.group.user-agreement-responses">
      {names.map((name) => {
        const rows = responses.filter((r) => r.agreement === name)
        return (
          <div key={name} style={{ display: 'flex', flexDirection: 'column' }}>
            <PBDataWindow
              rows={rows}
              current={cur}
              onCurrentChange={setCur}
              onActivate={(r) => setViewing(r)}
              rowClassName={(r) => (r.action === 'Declined' ? 'pb-dw--struck' : undefined)}
              rowTutorialId={(r, i) => `host.mois.row.agreement-response-${pbSlug(r.version)}-${i}`}
              columns={[
                { key: 'version', header: name, width: 200, headAlign: 'left' },
                { key: 'date', header: '', width: 90, align: 'center' },
                { key: 'action', header: '', width: 90, render: (r) => <span style={{ color: r.action === 'Declined' ? '#a0a0a0' : undefined }}>{r.action}</span> },
                { key: 'view', header: '', width: 50, render: (r) => <button type="button" className="pb-link" data-tutorial-id="host.mois.command.view-agreement" onClick={() => setViewing(r)}>View</button> },
              ]}
            />
          </div>
        )
      })}
      {viewing && (
        <DetailWindow id="user-agreement-copy" title={`${viewing.agreement} - ${viewing.version}`} width={680} height={700} zIndex={95} onClose={() => setViewing(null)}
          buttons={<Btn id="agreement-copy-close" width={80} onClick={() => setViewing(null)}>Close</Btn>}>
          <ViewerToolbar />
          <AgreementPage
            title={viewing.version}
            header={`${viewing.action} by ADMIN, SYS on ${viewing.date}`}
            watermark={viewing.action.toUpperCase()}
          />
        </DetailWindow>
      )}
    </div>
  )
}

registerFolderView(['ad-user-agreements'], UserAgreementsView)
registerAreaWindow(USER_AGREEMENT_PROMPT, UserAgreementPrompt)
