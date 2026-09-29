import { useState } from 'react'
import { useChartExport, useChartRecords } from '../data/chart-records'
import { carePlanRows, carePlanSnapshotText } from '../data/carePlanRows'
import { useChartSession } from '../data/chartSession'
import {
  RESPONSE_DOC_TYPES, SEND_BAND, useAttachedLetters, useOrderResponses, useTemplateMeta,
  type AttachedLetter, type OrderResponse,
} from '../data/letterDocs'
import { DESKTOP_PROVIDER, beginLetter, docOfType, setLetterFlow, type LetterDocId } from '../data/letterFlow'
import { LETTER_TEMPLATES } from '../data/letterSetup'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import {
  PBBand, PBCheckbox, PBDataWindow, PBDropDownDataWindow, PBGroup, PBInput, PBLookup, PBRadio, PBTextArea, pbSlug,
} from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogFooter } from './formKit'
import { SendWindow } from './LetterWindows'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   The windows that continue, correct and answer a letter.

     attached-letters   303589 `e5cee8b0…` / `61160ce7…` — Attached Letters:
                        "Letter Options" band, three radios (Create New
                        Letter · Continue an Undistributed Letter · Correct a
                        Distributed Letter), a Date / Author / Document Type /
                        Note / Status grid of the Order's letters, Continue
                        (F2) / Cancel. Opened by Order Detail's Create
                        Referral Note… when the Order already has a letter.
     respond-to-order   2961349 `71ab5b8c…` — Respond to Order: "Please
                        Choose" band, Create a New Response · Continue an
                        Undistributed Response · Correct a Distributed
                        Response, the same five columns, Ok / Cancel. The
                        Orders folder's Respond button opens it; with no
                        response on the Order yet it goes straight to Send.
     send-document      the shared Send window (LetterWindows.tsx SendWindow).
                        2961349 `0480d274…` (Responding With Patient
                        Summary: Document Type DDDW MISC / NOTE /
                        NOTIFICATION / PATIENT SUMMARY with their
                        descriptions, "In Response to Order #:" and its "…")
                        and `9a83e429…` (Send General Purpose Notification
                        from Documents ▸ Distribute): Text and Labels / Paste
                        Care Plan, the patient row, Document Type, Author,
                        Primary Recipient, ENC# EMPTY, then Send As and the
                        Report. The Send As block is the Information Request
                        Send window's (2961349 `dbab69f9…`); the response
                        captures crop above it, so its place here is
                        INFERRED from that window.
     Paste Care Plan    2961349 `94ec6660…` — its Report Letterhead (Choose
                        Source · Letterhead · Save as default source ·
                        Continue (F2) / Cancel) pastes the care plan into the
                        Report. Drawn inside Send, with the Care Plan
                        stream's own anchors (`host.mois.dialog.report-
                        letterhead`, `…command.letterhead-continue`).

   Next… goes to the Letter Writer when a letter template is picked and
   straight to Create Distribution for a plain-text report, exactly as the
   Information Request Send window does.

   Reported: host.dialog = the window id; host.screen.sendDocType (slug),
   host.screen.sendAs ('template' | 'plain'), host.screen.letterOption.
   ========================================================================= */

const dot = (v?: string) => (v ?? '').split(' ')[0]!.replace(/\//g, '.')

const LETTER_OPTIONS = ['Create New Letter', 'Continue an Undistributed Letter', 'Correct a Distributed Letter'] as const
const RESPONSE_OPTIONS = ['Create a New Response', 'Continue an Undistributed Response', 'Correct a Distributed Response'] as const

function OptionsGrid<T extends AttachedLetter | OrderResponse>({ rows, cur, setCur, prefix }: { rows: T[]; cur: number; setCur: (i: number) => void; prefix: string }) {
  return (
    <PBDataWindow
      rows={rows.map((r) => ({ date: r.date, author: r.author, type: r.type, note: r.note, status: r.status }))}
      current={cur}
      onCurrentChange={setCur}
      rowTutorialId={(_r, i) => `host.mois.row.${prefix}-${i}`}
      columns={[
        { key: 'date', header: 'Date', width: 88, align: 'center' },
        { key: 'author', header: 'Author', width: 120 },
        { key: 'type', header: 'Document Type', width: 120 },
        { key: 'note', header: 'Note', width: 300 },
        { key: 'status', header: 'Status' },
      ]}
      empty=" "
    />
  )
}

/* --- Attached Letters ------------------------------------------------------ */
function AttachedLettersWindow({ args, close, open }: AreaWindowProps) {
  const p = usePatient()
  const orderId = String(args.orderId ?? '')
  const [letters] = useAttachedLetters()
  const mine = letters.filter((l) => l.chart === p.chart && l.orderId === orderId)
  const [option, setOption] = useState<number>(() => (mine.some((l) => l.status === 'UNDISTRIBUTED') ? 1 : mine.length ? 2 : 0))
  const shown = option === 0 ? mine : mine.filter((l) => l.status === (option === 1 ? 'UNDISTRIBUTED' : 'DISTRIBUTED'))
  const [cur, setCur] = useState(0)
  useScreenReport({ letterOption: pbSlug(LETTER_OPTIONS[option]!), rows: shown.length })
  const go = () => {
    const picked = shown[cur]
    if (option === 0 || !picked) {
      beginLetter('referral')
      setLetterFlow({ orderId })
      close()
      open('select-letter-template')
      return
    }
    beginLetter(picked.doc as LetterDocId)
    /* Continue: the same letter, still undistributed. Correct: "MOIS will
       create a duplicate of the original that the user can edit and then
       distribute" — a new letter pointing back at the one it corrects. */
    setLetterFlow({
      orderId, template: picked.template, selected: { 'HEALTH ISSUES': 99, ALLERGIES: 99 },
      letterId: option === 1 ? picked.id : null, correctionOf: option === 2 ? picked.id : null,
    })
    close()
    open('letter-writer', { doc: picked.doc })
  }
  return (
    <WorkspaceDialogFrame id="attached-letters" title="Attached Letters" width={753} height={320} onClose={close} controls={false}>
      <div style={{ margin: '8px 8px 0', border: '1px solid #646464', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, background: '#fff' }}>
        <PBBand>Letter Options</PBBand>
        <div className="pb-row" data-tutorial-id="host.mois.group.letter-options" style={{ justifyContent: 'space-around', padding: '6px 0', background: 'var(--pb-face)', borderBottom: '1px solid #9a9a9a' }}>
          {LETTER_OPTIONS.map((o, i) => (
            <PBRadio key={o} name="attached-letter-option" label={o} checked={option === i} onChange={() => { setOption(i); setCur(0) }} tutorialId={`host.mois.field.letter-option-${pbSlug(o)}`} />
          ))}
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <OptionsGrid rows={shown} cur={cur} setCur={setCur} prefix="attached-letter" />
        </div>
      </div>
      <DialogFooter gap={6} padding="10px 0">
        <DialogButton id="attached-letters-continue" width={78} isDefault onClick={go}>Continue (F2)</DialogButton>
        <DialogButton id="attached-letters-cancel" width={78} onClick={close}>Cancel</DialogButton>
      </DialogFooter>
    </WorkspaceDialogFrame>
  )
}

/* --- Respond to Order ------------------------------------------------------ */
function RespondToOrderWindow({ args, close, open }: AreaWindowProps) {
  const p = usePatient()
  const orderId = String(args.orderId ?? '')
  const [responses] = useOrderResponses()
  const mine = responses.filter((r) => r.chart === p.chart && r.orderId === orderId)
  const [option, setOption] = useState<number>(() => (mine.some((r) => r.status === 'UNDISTRIBUTED') ? 1 : 0))
  const shown = option === 0 ? mine : mine.filter((r) => r.status === (option === 1 ? 'UNDISTRIBUTED' : 'DISTRIBUTED'))
  const [cur, setCur] = useState(0)
  useScreenReport({ letterOption: pbSlug(RESPONSE_OPTIONS[option]!), rows: shown.length })
  const ok = () => {
    const picked = shown[cur]
    close()
    if (option === 0 || !picked) { open('send-document', { mode: 'response', orderId }); return }
    beginLetter(docOfType(picked.type))
    setLetterFlow({
      responseTo: orderId, recipient: picked.recipient,
      letterId: option === 1 ? picked.id : null, correctionOf: option === 2 ? picked.id : null,
    })
    open('letter-writer', { doc: docOfType(picked.type) })
  }
  return (
    <WorkspaceDialogFrame id="respond-to-order" title="Respond to Order" width={845} height={390} onClose={close} controls={false}>
      <div style={{ margin: '12px 18px 0', border: '1px solid #646464', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, background: '#fff' }}>
        <PBBand>Please Choose</PBBand>
        <div className="pb-row" data-tutorial-id="host.mois.group.response-options" style={{ justifyContent: 'space-around', padding: '8px 0', background: 'var(--pb-face)', borderBottom: '1px solid #9a9a9a' }}>
          {RESPONSE_OPTIONS.map((o, i) => (
            <PBRadio key={o} name="respond-option" label={o} checked={option === i} onChange={() => { setOption(i); setCur(0) }} tutorialId={`host.mois.field.response-option-${pbSlug(o)}`} />
          ))}
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <OptionsGrid rows={shown} cur={cur} setCur={setCur} prefix="response" />
        </div>
      </div>
      <DialogFooter gap={14} padding="12px 0">
        <DialogButton id="respond-ok" width={88} isDefault onClick={ok}>Ok</DialogButton>
        <DialogButton id="respond-cancel" width={88} onClick={close}>Cancel</DialogButton>
      </DialogFooter>
    </WorkspaceDialogFrame>
  )
}

/* --- Send (response · notification · a Documents record) ------------------ */
const CLINIC_LINES = ['HALLIWELL MEDICAL CLINIC', '1100 - 6TH AVE', 'PRINCE GEORGE, BC', 'Phone Number: 2505642644', 'Fax Number: 2505642655']
const LETTERHEAD_SOURCES = ['Clinic', 'Primary Care Provider', 'Desktop Provider', 'None'] as const

/** Every template of a document type: the stage's list plus any the Designer
    has saved this session. */
function useTemplatesOfType(type: string): string[] {
  const [meta] = useTemplateMeta()
  const all = [...LETTER_TEMPLATES.map((t) => ({ name: t.name, type: t.type })), ...meta]
  return [...new Set(all.filter((t) => t.type === type).map((t) => t.name))]
}

function SendDocumentWindow({ args, close, open }: AreaWindowProps) {
  const p = usePatient()
  const data = useChartExport()
  const session = useChartSession(p.chart)
  const mode = args.mode === 'document' ? 'document' : 'response'
  const orderId = typeof args.orderId === 'string' ? args.orderId : ''
  const documentId = typeof args.documentId === 'string' ? args.documentId : ''
  const orders = useChartRecords('order', 'dtm_ord_date')
  const order = orders.find((o) => o.id_order === orderId)
  const [docType, setDocType] = useState(typeof args.docType === 'string' ? args.docType : mode === 'response' ? 'PATIENT SUMMARY' : 'NOTIFICATION')
  const [author, setAuthor] = useState(DESKTOP_PROVIDER)
  const [recipient, setRecipient] = useState(
    typeof args.recipient === 'string' ? args.recipient : mode === 'response' ? order?.str_order_by ?? '' : '',
  )
  const templates = useTemplatesOfType(docType)
  const [sendAs, setSendAs] = useState<'template' | 'plain'>('plain')
  const [template, setTemplate] = useState('')
  const [report, setReport] = useState(docType === 'NOTIFICATION' ? 'To Whom It May Concern,\n\n This is a notification. \n\nSincerely yours,' : '')
  const [letterhead, setLetterhead] = useState(false)
  const [source, setSource] = useState<typeof LETTERHEAD_SOURCES[number]>('Clinic')
  const band = mode === 'response' ? `Responding With ${SEND_BAND[docType] ?? docType}` : `Send ${SEND_BAND[docType] ?? docType}`
  useScreenReport({ dialog: letterhead ? 'report-letterhead' : 'send-document', sendDocType: pbSlug(docType), sendAs, sendMode: mode })
  const useTemplate = sendAs === 'template' && templates.length > 0

  const pasteCarePlan = () => {
    const head = source === 'None' ? [] : source === 'Clinic' ? CLINIC_LINES : [DESKTOP_PROVIDER, ...CLINIC_LINES.slice(1)]
    setReport(carePlanSnapshotText(carePlanRows(data, session.tags), p, MOIS_TODAY, head))
    setSendAs('plain')
    setLetterhead(false)
  }

  return (
    <SendWindow
      id="send-document"
      anchorPrefix="send-document"
      toolPrefix="send-"
      onPasteCarePlan={() => setLetterhead(true)}
      band={band}
      docType={(
        <span className="pb-row" style={{ gap: 12 }}>
          <PBDropDownDataWindow
            w={170}
            listW={450}
            value={docType}
            tutorialId="host.mois.field.send-document-type"
            columns={[{ key: 'type', header: 'Document Type', width: 190 }, { key: 'description', header: 'Description' }]}
            rows={RESPONSE_DOC_TYPES}
            onSelect={(r) => { setDocType(r.type); setTemplate('') }}
          />
          {mode === 'response' && (
            <>
              <span className="pb-form__label">In Response to Order #:</span>
              <span data-tutorial-id="host.mois.field.in-response-to"><PBLookup w={110} value={orderId} readOnly name="in-response-to" /></span>
            </>
          )}
        </span>
      )}
      author={author} setAuthor={setAuthor} recipient={recipient} setRecipient={setRecipient}
      useTemplate={useTemplate}
      /* "a letter template will not show as an option if you have not
         previously created a letter template for the document type" */
      templateRadio={templates.length > 0 || <span style={{ color: '#8a8a8a' }}>(no {docType} letter template)</span>}
      template={template} setTemplate={setTemplate}
      onTemplate={() => { setSendAs('template'); setTemplate(templates[0]!) }}
      onPlain={() => setSendAs('plain')}
      radioAnchors
      report={(
        <PBTextArea
          value={useTemplate ? '' : report}
          readOnly={useTemplate}
          onChange={(e) => setReport(e.target.value)}
          data-tutorial-id="host.mois.field.send-document-report"
          style={{ height: '100%', resize: 'none', fontFamily: '"Lucida Console", monospace', background: useTemplate ? '#d8d8d8' : '#fff' }}
        />
      )}
      onNext={() => {
        const doc = docOfType(docType)
        beginLetter(doc)
        setLetterFlow({
          author, recipient, template: useTemplate ? template : '', plainText: useTemplate ? '' : report,
          responseTo: mode === 'response' ? orderId : null, documentId: documentId || null,
        })
        close()
        open(useTemplate ? 'letter-writer' : 'create-distribution', { doc })
      }}
      onClose={close}
      after={letterhead && (
        <WorkspaceDialogFrame id="report-letterhead" title="Report Letterhead" width={648} height={310} onClose={() => setLetterhead(false)} controls={false} zIndex={97}>
          <div style={{ margin: '10px 20px 0', border: '1px solid #9a9a9a', padding: '10px 18px', display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 auto' }}>
            <div className="pb-row" style={{ gap: 14, alignItems: 'stretch' }}>
              <div style={{ width: 150 }} data-tutorial-id="host.mois.group.choose-source">
                <PBGroup title="Choose Source">
                  {LETTERHEAD_SOURCES.map((s) => (
                    <div key={s} style={{ padding: '4px 0' }}><PBRadio name="send-letterhead-source" label={s} checked={source === s} onChange={() => setSource(s)} tutorialId={`host.mois.field.letterhead-${pbSlug(s)}`} /></div>
                  ))}
                </PBGroup>
              </div>
              <div style={{ flex: '1 1 auto' }} data-tutorial-id="host.mois.group.letterhead">
                <PBGroup title="Letterhead">
                  {(source === 'None' ? ['', '', '', '', ''] : source === 'Clinic' ? CLINIC_LINES : [DESKTOP_PROVIDER, ...CLINIC_LINES.slice(1)]).map((l, i) => (
                    <div key={i} style={{ padding: '1px 0' }}><PBInput w="100%" value={l} readOnly /></div>
                  ))}
                </PBGroup>
              </div>
            </div>
            <PBCheckbox label="Save as default source" checked={false} />
          </div>
          <DialogFooter gap={10} padding="12px 0">
            <DialogButton id="letterhead-continue" width={75} isDefault onClick={pasteCarePlan}>Continue (F2)</DialogButton>
            <DialogButton id="letterhead-cancel" width={75} onClick={() => setLetterhead(false)}>Cancel</DialogButton>
          </DialogFooter>
        </WorkspaceDialogFrame>
      )}
    />
  )
}

/** The response rows an Order's Links tab lists (2961349 `03485f9c…`:
    Section · Date · Description, the description a blue link). */
export function useResponseLinks(orderId: string | undefined) {
  const p = usePatient()
  const [responses] = useOrderResponses()
  return responses
    .filter((r) => r.chart === p.chart && r.orderId === orderId && r.status === 'DISTRIBUTED')
    .map((r) => ({ section: 'DOCUMENT', date: dot(r.date), desc: r.type }))
}

/** The Respond button (the Orders folder and the Workspace's Orders
    basket, 2961349 `ad5aba34…`, `5617984b…`): the Send window straight away
    the first time, Respond to Order once the Order has a response. */
export function useRespondToOrder() {
  const p = usePatient()
  const [responses] = useOrderResponses()
  return (orderId: string | undefined, open: (id: string, args?: Record<string, unknown>) => boolean) => {
    if (!orderId) return
    const any = responses.some((r) => r.chart === p.chart && r.orderId === orderId)
    open(any ? 'respond-to-order' : 'send-document', { mode: 'response', orderId })
  }
}

registerAreaWindow('attached-letters', AttachedLettersWindow)
registerAreaWindow('respond-to-order', RespondToOrderWindow)
registerAreaWindow('send-document', SendDocumentWindow)
