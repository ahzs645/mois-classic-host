import { useEffect, useState } from 'react'
import { useChartExport } from '../data/chart-records'
import { addLetterDistribution } from '../data/chartSession'
import {
  DEFAULT_TEMPLATE, DESKTOP_PROVIDER, DOC_TYPE_OF, beginLetter, consultOrders, currentOrderId, letterBody, letterHeader, letterOrder, setLetterFlow, useLetterFlow,
} from '../data/letterFlow'
import {
  nowStamp, useAttachedLetters, useFaxLog, useOrderResponses, useSessionDocDistributions, useStandardReferralMode,
} from '../data/letterDocs'
import { MOIS_TODAY } from '../data/patients'
import { LW } from '../data/letterWriter'
import { usePatient } from '../data/patient-context'
import { PBBand, PBButton, PBCheckbox, PBDataWindow, PBInput, PBLookup, PBMessageBox, PBRadio, PBSelect, PBTextArea, pbSlug } from '../pb'
import { useScreenReport } from '../host/screen-state'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'
import { PatientFieldRow, patientPhn } from './patientKit'

/* ============================================================================
   The windows around the Letter Writer that open by name.

     select-consultation-order  303589 `4ac477c4…` — Action ▸ Create Referral
                                Note's first window: the chart's
                                consultation orders, then Create New Order /
                                Open Selected Order / Cancel.
     order-detail               303589 `b767f85a…` — the modal Order Detail,
                                whose `Create Referral Note...` reaches the
                                template list.
     send-information-request   2961349 `b6c1e819…` / `dbab69f9…` — the Send
                                window Create Information Request opens:
                                Document Type, Author, Primary Recipient,
                                Send As, Report, Next... / Cancel.
     create-distribution        303589 `87ae0c73…`, 2961349 `24dd02c9…` —
                                Distribute... on the Letter Writer: the letter's
                                header, the Recipient Distribution grid with
                                a Method drop-down, the Report (Read Only)
                                pane, Distribute (F2) / Cancel.

   Added for 303589 / 2961349 / 2616562 (stream C3):
     - Select Consultation Order in Standard Mode (APP SETTING Referral Mode
       = S) goes straight to Order Detail on the Orders folder's current
       order (303589 `a6252ce4…`), and Order Detail then carries Standard
       Mode's footer — Paste Provider Address…, Spelling…, Save (F2),
       Save / Close, Cancel, Quick Print, Print, Paste Encounter Note — and
       its Appointment Booking group (`2301b448…`). Print opens the Referral
       Note selection window (screens/StandardReferralWindows.tsx).
     - Create Referral Note… on an Order that already has a letter opens the
       Attached Letters window (`e5cee8b0…`, screens/LetterResponseWindows.tsx).
     - Create Distribution: a letter written in the Letter Writer shows the
       PDF Preview pane with its Filesize and Print button (`4464d8df…`,
       2616562 `c6bfdd98…`); a plain-text report keeps Report (Read Only)
       (2961349 `d7d34094…`). Method FAX queues the letter to SRFax (the
       "Success: Fax Queued" box, 2616562 `c85ea0f7…`), and its Distribution
       row reads QUEUED. Distribute (F2) marks the attached letter (or the
       Information Request response) DISTRIBUTED.
   ========================================================================= */

const dot = (v?: string) => (v ?? '').split(' ')[0]!.replace(/\//g, '.')

/** The yellow two-line patient block Order Detail and Letter Setup share. */
function PatientBlock() {
  const p = usePatient()
  return (
    <div style={{ background: '#ffffc0', padding: '2px 10px', borderBottom: '1px solid #9a9a9a', flex: 'none' }}>
      <PatientFieldRow fields={[
        { label: 'FIRST:', value: p.first, w: 150 }, { label: 'MIDDLE:', value: p.middle, w: 130 },
        { label: 'LAST:', value: p.last, w: 170 }, { label: 'DoB:', value: p.dob, w: 90 }, { value: p.sex },
      ]} />
      <PatientFieldRow fields={[
        { label: 'PHN:', value: patientPhn(p), w: 160 }, { label: 'Home:', value: p.home, w: 120 },
        { label: 'Work:', value: p.work, w: 120 },
        { node: <><span style={{ textDecoration: 'underline' }}>Cell:</span>&nbsp;<b>{p.cell}</b></> },
      ]} />
    </div>
  )
}

/* --- Select Consultation Order ------------------------------------------ */
function SelectConsultationOrderWindow({ close, open }: AreaWindowProps) {
  const data = useChartExport()
  const rows = consultOrders(data).map((r) => ({
    id: r.id_order ?? '', date: dot(r.dtm_ord_date), type: r.str_order_type ?? '',
    to: r.str_performed_by ?? '', code: r.str_code ?? '', description: r.str_description ?? r.str_code_term ?? '',
  }))
  const flow = useLetterFlow()
  const [cur, setCur] = useState(() => Math.max(0, rows.findIndex((r) => r.id === letterOrder(data, flow.orderId)?.id_order)))
  const go = (orderId: string | null) => {
    setLetterFlow({ orderId, recipient: '' })
    close()
    open('order-detail', { orderId })
  }
  /* Standard Mode has no order picker: Create Referral Note opens Order
     Detail on the order the Orders folder is on (303589 `a6252ce4…`) */
  const standard = useStandardReferralMode()
  useEffect(() => {
    if (standard) go(currentOrderId() ?? rows[0]?.id ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standard])
  return (
    <WorkspaceDialogFrame id="select-consultation-order" title="Select Consultation Order" width={682} height={500} onClose={close} controls={false}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: 12, border: '1px solid #646464' }}>
        <PBBand>Order list</PBBand>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(r) => go(r.id)}
          rowTutorialId={(r) => `host.mois.row.consultation-order-${pbSlug(r.date)}-${pbSlug(r.description)}`}
          columns={[
            { key: 'date', header: 'Date', width: 68 },
            { key: 'type', header: 'Order Type', width: 104 },
            { key: 'to', header: 'Referred To', width: 124 },
            { key: 'code', header: 'Code', width: 56 },
            { key: 'description', header: 'Description' },
          ]}
          empty="No consultation orders on file."
        />
      </div>
      <div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: '0 0 12px', flex: 'none' }}>
        <DialogButton id="create-new-order" width={168} onClick={() => go(null)}>Create New Order</DialogButton>
        <DialogButton id="open-selected-order" width={168} isDefault onClick={() => rows[cur] && go(rows[cur]!.id)}>Open Selected Order</DialogButton>
        <DialogButton id="consultation-order-cancel" width={168} onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- Order Detail ---------------------------------------------------------
   Modal: you cannot go back to another MOIS window until it is complete.
   The Referral Text box is the Order's Record Report / Comment — the blue
   field the Letter Writer reads back into. */
const ORDER_STATUSES = ['IN PROCESS', 'SCHEDULED', 'RESULTS AVAILABLE', 'CANCELLED', 'COMPLETED', 'ERROR']
const STATUS_WORD: Record<string, string> = { IP: 'IN PROCESS', SC: 'SCHEDULED', RA: 'RESULTS AVAILABLE', CA: 'CANCELLED', CM: 'COMPLETED', CT: 'COMPLETED', ER: 'ERROR' }

function OrderDetailWindow({ args, close, open }: AreaWindowProps) {
  const data = useChartExport()
  const p = usePatient()
  const orderId = typeof args.orderId === 'string' ? args.orderId : null
  const order = orderId ? consultOrders(data).find((r) => r.id_order === orderId) : undefined
  const [text, setText] = useState(order?.str_note ?? '')
  const standard = useStandardReferralMode()
  const [letters] = useAttachedLetters()
  const attached = letters.filter((l) => l.chart === p.chart && l.orderId === order?.id_order)
  const [bookedBy, setBookedBy] = useState('')
  useScreenReport({ referralMode: standard ? 'standard' : 'new', attachedLetters: attached.length })
  const field = (label: string, value: string, w: number, dots = false) => (
    <>
      <span className="pb-form__label" style={{ textAlign: 'right' }}>{label}</span>
      {dots ? <PBLookup w={w} defaultValue={value} /> : <PBInput w={w} defaultValue={value} />}
    </>
  )
  return (
    <WorkspaceDialogFrame id="order-detail" title="Order Detail" width={763} height={708} onClose={close} controls={false}>
      <div style={{ margin: '8px 10px 0', border: '1px solid #646464', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
        <PBBand>Order Information</PBBand>
        <PatientBlock />
        <fieldset style={{ margin: '6px 8px 0', border: '1px solid #c8c8c8', padding: '2px 8px 6px' }}>
          <legend>Order Information</legend>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 200px 90px 1fr', rowGap: 3, columnGap: 6, alignItems: 'center' }}>
            {field('Order Date:', dot(order?.dtm_ord_date) || MOIS_TODAY, 82)}
            {field('Code:', order?.str_code ?? '', 110, true)}
            {field('Order By:', order?.str_order_by ?? DESKTOP_PROVIDER, 180, true)}
            {field('Description:', order?.str_description ?? '', 280)}
            {field('Order Type:', 'CONSULTATION', 110)}
            <span className="pb-form__label" style={{ textAlign: 'right' }}>Status:</span>
            <span className="pb-row" style={{ gap: 6 }}>
              <PBSelect w={130} options={ORDER_STATUSES} defaultValue={STATUS_WORD[order?.str_status ?? 'IP'] ?? 'IN PROCESS'} />
              <span className="pb-form__label">Priority:</span><PBInput w={70} defaultValue={order?.str_priority_code ?? 'ROUTINE'} />
            </span>
          </div>
        </fieldset>
        <fieldset style={{ margin: '4px 8px 0', border: '1px solid #c8c8c8', padding: '2px 8px 6px' }}>
          <legend>Detail Information</legend>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 280px 80px 1fr', rowGap: 3, columnGap: 6, alignItems: 'center' }}>
            {field('Referred To:', order?.str_performed_by ?? '', 270, true)}
            {field('Facility:', '', 180)}
            {field('Copies To:', order?.str_copy_to ?? '', 270, true)}
            {field('Facility Ref.:', '', 180)}
            {field('Transcribed:', '', 270)}
            {field('Facility Loc.:', '', 180)}
            <span className="pb-form__label" style={{ textAlign: 'right' }}>Payor:</span><PBSelect w={110} options={['']} />
          </div>
        </fieldset>
        {standard && (
          /* 303589 `2301b448…`: Appointment Booking beside Detail Information */
          <fieldset data-tutorial-id="host.mois.group.appointment-booking" style={{ margin: '4px 8px 0', border: '1px solid #c8c8c8', padding: '2px 8px 6px' }}>
            <legend>Appointment Booking</legend>
            <div className="pb-row" style={{ gap: 12 }}>
              <span className="pb-form__label">Responsibility:</span>
              <PBRadio name="order-booking" label="OFFICE" checked={bookedBy === 'OFFICE'} onChange={() => setBookedBy('OFFICE')} tutorialId="host.mois.field.booking-office" />
              <PBRadio name="order-booking" label="PATIENT" checked={bookedBy === 'PATIENT'} onChange={() => setBookedBy('PATIENT')} tutorialId="host.mois.field.booking-patient" />
              <span className="pb-form__label" style={{ marginLeft: 16 }}>Date / Time:</span><PBInput w={82} /><PBInput w={40} defaultValue=":" />
              <span className="pb-form__label" style={{ marginLeft: 16 }}>Notify:</span><PBCheckbox label="Patient Notified" />
            </div>
          </fieldset>
        )}
        <fieldset style={{ margin: '4px 8px 6px', border: '1px solid #c8c8c8', padding: '2px 6px 6px', flex: '1 1 auto', display: 'flex', minHeight: 0 }}>
          <legend>Referral Text</legend>
          <PBTextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            data-tutorial-id="host.mois.field.referral-text"
            style={{ flex: '1 1 auto', width: '100%', background: LW.populator, fontFamily: '"Lucida Console", monospace', resize: 'none' }}
          />
        </fieldset>
        <div className="pb-row" style={{ padding: '0 10px 4px', gap: 0, flex: 'none' }}>
          <span style={{ width: 90 }}>Source:</span><span style={{ width: 110 }}>SYSTEM</span>
          <span style={{ width: 80 }}>Sent Date:</span><span>{dot(order?.dtm_ord_date)}</span>
          <span className="pb-row__spacer" /><span className="pb-link" style={{ color: LW.link }}>UNSIGNED</span>
        </div>
      </div>
      <div className="pb-row" style={{ gap: 6, padding: '8px 10px 10px', flex: 'none' }}>
        {standard && (
          /* 303589 `2301b448…`: Paste Provider Address... pastes the Referred
             To provider's address into Referral Text */
          <DialogButton id="order-detail-paste-provider-address" width={126} onClick={() => setText((t) => `${order?.str_performed_by ?? 'Dr. ' + DESKTOP_PROVIDER}\n1100 - 6th AVENUE\nPRINCE GEORGE, BC  V2L 3M6\n\n${t}`)}>
            Paste Provider Address...
          </DialogButton>
        )}
        <DialogButton id="order-detail-spelling" width={78}>Spelling...</DialogButton>
        <span className="pb-row__spacer" />
        <DialogButton id="order-detail-save" width={78}>Save (F2)</DialogButton>
        <DialogButton id="order-detail-save-close" width={78} onClick={close}>Save / Close</DialogButton>
        <DialogButton id="order-detail-cancel" width={78} onClick={close}>Cancel</DialogButton>
        <span style={{ width: standard ? 12 : 40 }} />
        {standard ? (
          <>
            <DialogButton id="order-detail-quick-print" width={78}>Quick Print</DialogButton>
            <DialogButton id="order-detail-print" width={78} isDefault onClick={() => { close(); open('referral-note-report', { orderId: order?.id_order ?? null, text }) }}>Print</DialogButton>
            <DialogButton id="order-detail-paste-encounter-note" width={122}
              onClick={() => {
                const note = [...(data?.encounter_note ?? [])].sort((a, b) => String(b.stp_date_create ?? '').localeCompare(String(a.stp_date_create ?? '')))[0]
                if (note?.str_note) setText((t) => `${t}${t ? '\n\n' : ''}${note.str_note}`)
              }}>
              Paste Encounter Note
            </DialogButton>
          </>
        ) : (
          <>
            <DialogButton
              id="create-referral-note"
              width={122}
              isDefault
              onClick={() => {
                /* an Order with a letter already on it asks what to do with it
                   first: Attached Letters (303589 `e5cee8b0…`) */
                if (attached.length && order?.id_order) {
                  close()
                  open('attached-letters', { orderId: order.id_order })
                  return
                }
                /* Create Referral Note... starts a referral: whatever the last
                   letter was (a consult, a sent one), its type, template, Letter
                   Setup counts and Distributed flag do not carry into this one */
                beginLetter('referral')
                setLetterFlow({ orderId: order?.id_order ?? null })
                close()
                open('select-letter-template')
              }}
            >
              Create Referral Note...
            </DialogButton>
            <DialogButton id="order-detail-quick-print" width={78}>Quick Print</DialogButton>
          </>
        )}
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- Send (New Information Request) ------------------------------------- */
const TEMPLATE_TEXT = 'To Whom It May Concern,\n\n This is an information request. Please respond.\n\nSincerely yours,'

function SendInformationRequestWindow({ close, open }: AreaWindowProps) {
  const p = usePatient()
  const data = useChartExport()
  /* the recipient the address book returns for this chart's CDX clinic */
  const cdx = consultOrders(data).find((r) => r.str_recipient_id_system === 'CDXCLINICID')
  const [author, setAuthor] = useState(DESKTOP_PROVIDER)
  const [recipient, setRecipient] = useState(cdx?.str_performed_by ?? '')
  const [sendAs, setSendAs] = useState<'template' | 'plain'>('template')
  /* the template named beside Use a Letter Template is the one the Letter
     Writer opens on, so a changed choice has to travel with the letter */
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE['information-request'])
  return (
    <WorkspaceDialogFrame id="send-information-request" title="Send" width={940} height={690} onClose={close}>
      <div className="pb-row" style={{ gap: 0, padding: '2px 4px', background: LW.band, borderBottom: '1px solid #646464', flex: 'none' }}>
        <DialogButton id="text-and-labels" width={112}>Text and Labels</DialogButton>
        <DialogButton id="paste-care-plan" width={112}>Paste Care Plan</DialogButton>
      </div>
      <div style={{ margin: '12px 16px 0', border: '1px solid #646464', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
        <PBBand>Send New Information Request</PBBand>
        <PatientFieldRow style={{ gap: 0, padding: '3px 12px', borderBottom: '1px solid #9a9a9a', background: '#fff' }} fields={[
          { label: 'FIRST:', value: p.first, w: 160 }, { label: 'MIDDLE:', value: p.middle, w: 150 },
          { label: 'LAST:', value: p.last, w: 180 }, { label: 'DoB:', value: p.dob, w: 110 }, { label: 'SEX:', value: p.sex },
        ]} />
        <div style={{ display: 'grid', gridTemplateColumns: '118px 1fr 110px', rowGap: 4, padding: '8px 12px', alignItems: 'center', borderBottom: '1px solid #9a9a9a' }}>
          <span className="pb-form__label">Document Type:</span>
          <span><b style={{ border: '1px solid #9a9a9a', padding: '1px 8px', background: 'var(--pb-face)' }}>INFORMATION REQUEST</b></span><span />
          <span className="pb-form__label">Author:</span>
          <span data-tutorial-id="host.mois.field.send-author"><PBLookup w={580} value={author} onChange={setAuthor} name="send-author" /></span><span />
          <span className="pb-form__label">Primary Recipient:</span>
          <span data-tutorial-id="host.mois.field.send-recipient"><PBLookup w={580} value={recipient} onChange={setRecipient} name="send-recipient" /></span>
          <span className="pb-link" style={{ color: LW.link, textDecoration: 'underline' }}>ENC# EMPTY</span>
        </div>
        <div data-tutorial-id="host.mois.group.send-as" style={{ display: 'grid', gridTemplateColumns: '118px auto 1fr', rowGap: 4, padding: '6px 12px', alignItems: 'center', borderBottom: '1px solid #9a9a9a' }}>
          <span className="pb-form__label">Send As:</span>
          <PBRadio name="send-as" label="Use a Letter Template" checked={sendAs === 'template'} onChange={() => setSendAs('template')} />
          <span style={{ paddingLeft: 12 }}>{sendAs === 'template' && <PBLookup w={340} value={template} onChange={setTemplate} name="send-template" />}</span>
          <span />
          <PBRadio name="send-as" label="Use Plain Text Report" checked={sendAs === 'plain'} onChange={() => setSendAs('plain')} />
          <span />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '118px 1fr', padding: '8px 12px', flex: '1 1 auto', minHeight: 0 }}>
          <span className="pb-form__label">Report:</span>
          <div style={{ border: '1px solid #9a9a9a', background: sendAs === 'template' ? '#d8d8d8' : '#fff', overflow: 'auto', padding: sendAs === 'template' ? 14 : 6 }}>
            {sendAs === 'template' ? (
              <div style={{ background: '#fff', padding: '14px 18px', minHeight: '100%' }}>
                <div style={{ background: LW.yellow, display: 'inline-block', fontSize: 18 }}>[Author Letterhead 1]</div>
                {[2, 3, 4, 5].map((n) => <div key={n}><span style={{ background: LW.yellow, color: '#8a8a3a' }}>[Author Letterhead {n}]</span></div>)}
                <div style={{ marginTop: 18 }}><b>Name: </b><span style={{ background: LW.yellow }}>[Patient Full Name]</span>   <b>Gender: </b><span style={{ background: LW.yellow }}>[Patient Gender]</span></div>
              </div>
            ) : (
              <div style={{ fontFamily: '"Lucida Console", monospace', whiteSpace: 'pre-wrap' }}>{TEMPLATE_TEXT}</div>
            )}
          </div>
        </div>
      </div>
      <div className="pb-row" style={{ justifyContent: 'center', gap: 14, padding: '12px 0', flex: 'none' }}>
        <DialogButton
          id="send-next"
          width={93}
          isDefault
          onClick={() => {
            setLetterFlow({ doc: 'information-request', author, recipient, template: sendAs === 'template' ? template : '' })
            close()
            /* a letter template goes on to the Letter Writer; a plain-text
               report straight to Create Distribution */
            open(sendAs === 'template' ? 'letter-writer' : 'create-distribution', { doc: 'information-request' })
          }}
        >
          Next...
        </DialogButton>
        <DialogButton id="send-cancel" width={93} onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- Create Distribution ------------------------------------------------- */
/** The PDF the Letter Writer made, as the Preview pane shows it: the letter's
    page at print scale (303589 `4464d8df…`). */
function DistributionPreview({ lines }: { lines: string[] }) {
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* the viewer's mini toolbar: hand · snapshot · select ▾ || Zoom In ▾ ·
          1:1 · Fit Page · Fit Width · 100% ▾ · − slider + */}
      <div className="pb-row" style={{ gap: 6, padding: '1px 6px', background: 'linear-gradient(#fbfbfb, #eeeeee)', borderBottom: '1px solid #dadada', flex: 'none', fontSize: 11 }}>
        <span>✋</span><span>📷</span><span>⌖▾</span><span style={{ width: 10 }} /><span>🔍 Zoom In ▾</span><span>1:1</span><span>⤢</span><span>↔</span>
        <span className="pb-field" style={{ width: 44, padding: '0 4px' }}>100%</span><span>▾</span><span>⊖ ── ⊕</span>
      </div>
      <div data-tutorial-id="host.mois.field.distribution-preview" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#808080', padding: 8 }}>
        <div style={{ width: 612, margin: '0 auto', background: '#fff', padding: '40px 60px', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 13, minHeight: 700 }}>
          {lines.map((l, i) => <div key={i} style={{ minHeight: '1.3em', fontSize: i === 0 ? 20 : undefined }}>{l}</div>)}
        </div>
      </div>
      <div className="pb-row" style={{ padding: '0 6px', flex: 'none', borderTop: '1px solid #c8c8c8' }}>8.50 x 11.00 in</div>
    </div>
  )
}

function CreateDistributionWindow({ close }: AreaWindowProps) {
  const p = usePatient()
  const data = useChartExport()
  const flow = useLetterFlow()
  const header = letterHeader(flow.doc, data, flow)
  const order = flow.doc === 'referral' || flow.doc === 'consult' ? letterOrder(data, flow.orderId) : undefined
  const primary = header.left.find((f) => f.label === 'Primary Recipient:')?.value ?? ''
  /* CDX when the recipient is a CDX clinic, else Mail (303589: "If you are
     not registered for CDX or your recipients are not registered for CDX,
     the Distribution method will say 'Mail'") */
  const cdx = order?.str_recipient_id_system === 'CDXCLINICID' || flow.doc === 'information-request' || !!flow.responseTo || flow.doc === 'notification'
  const copies = (header.right.find((f) => f.label === 'Copies To:')?.value ?? '').split(';').map((s) => s.trim()).filter(Boolean)
  const [rows, setRows] = useState(() => [
    { method: cdx ? 'CDX' : 'MAIL', type: 'PRIMARY RECIPIENT', name: primary, id: order?.str_recipient_id ? `${order.str_recipient_id_system}: ${order.str_recipient_id}` : '', location: '', fax: '' },
    ...copies.map((name) => ({ method: 'MAIL', type: 'SECONDARY RECIPIENT', name, id: '', location: '', fax: '' })),
  ])
  const [cur, setCur] = useState(0)
  const [letters, setLetters] = useAttachedLetters()
  const [, setResponses] = useOrderResponses()
  const [, queueFax] = useFaxLog()
  const [, addDocDistribution] = useSessionDocDistributions()
  const [queued, setQueued] = useState(false)
  /* a letter written in the Letter Writer is a PDF with a Preview pane; a
     plain-text report is shown as text (2961349 `d7d34094…`) */
  const plain = flow.template === '' && (flow.doc === 'information-request' || !!flow.plainText || flow.doc !== 'referral' && flow.doc !== 'consult' && flow.doc !== 'care-plan')
  const letterLines = letterBody(flow.doc, p, header).map((l) => l.runs.map((r) => r.s).join(''))
  const filesize = `${(38 + letterLines.length * 1.3).toFixed(1)} Kb`
  const right = header.right
  useScreenReport({ distributionMethods: rows.map((r) => pbSlug(r.method)).join(','), distributionPreview: !plain })

  const distribute = () => {
    const faxing = rows.filter((r) => r.method === 'FAX')
    const stamp = nowStamp()
    const title = flow.correctionOf ? `${header.title} (CORRECTED)` : header.title
    addLetterDistribution(p.chart, {
      orderId: order?.id_order ?? flow.responseTo ?? null, doc: flow.doc, date: header.date, title,
      rows: rows.map((r) => ({ method: r.method, type: r.type, name: r.name, status: r.method === 'CDX' ? 'SUCCESS' : r.method === 'FAX' ? 'QUEUED' : '' })),
    })
    faxing.forEach((r) => queueFax({ date: stamp, chart: p.chart, title, recipient: r.name, fax: r.fax, status: 'QUEUED', from: 'letter' }))
    if (flow.documentId) addDocDistribution({ chart: p.chart, documentId: flow.documentId, date: stamp, title, rows: rows.map((r) => ({ method: r.method, type: r.type, name: r.name, status: r.method === 'CDX' ? 'SUCCESS' : r.method === 'FAX' ? 'QUEUED' : '' })) })
    /* the letter this was: DISTRIBUTED now (data/letterDocs.ts) */
    if (flow.responseTo) {
      const id = flow.letterId ?? `response-${flow.responseTo}-${Date.now()}`
      setResponses((all) => [
        { id, chart: p.chart, orderId: flow.responseTo!, date: MOIS_TODAY, author: flow.author, type: DOC_TYPE_OF[flow.doc], note: header.title, status: 'DISTRIBUTED', recipient: primary, correctionOf: flow.correctionOf ?? undefined },
        ...all.filter((r) => r.id !== id),
      ])
    } else if (order?.id_order) {
      const id = flow.letterId ?? `letter-${order.id_order}-${Date.now()}`
      const was = letters.find((l) => l.id === id)
      setLetters((all) => [
        {
          id, chart: p.chart, orderId: order.id_order!, date: was?.date ?? MOIS_TODAY, author: flow.author, doc: flow.doc, type: DOC_TYPE_OF[flow.doc],
          note: order.str_description ?? '', status: 'DISTRIBUTED', template: flow.template, correctionOf: flow.correctionOf ?? undefined,
        },
        ...all.filter((l) => l.id !== id),
      ])
    }
    if (faxing.length) { setQueued(true); return }
    finish()
  }
  const finish = () => {
    setLetterFlow({ distributed: true })
    close()
  }

  return (
    <WorkspaceDialogFrame id="create-distribution" title="Create Distribution" width={1000} height={700} onClose={close} zIndex={96}>
      <div style={{ margin: '8px 10px 0', border: '1px solid #646464', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, background: '#fff' }}>
        <PBBand>{header.title}</PBBand>
        <PatientFieldRow style={{ gap: 0, padding: '3px 8px', borderBottom: '1px solid #9a9a9a' }} fields={[
          { label: 'FIRST:', value: p.first, w: 180 }, { label: 'MIDDLE:', value: p.middle, w: 150 },
          { label: 'LAST:', value: p.last, w: 180 }, { label: 'DoB:', value: p.dob, w: 110 }, { label: 'SEX:', value: p.sex },
        ]} />
        <div style={{ background: `linear-gradient(to bottom, ${LW.headerTop}, ${LW.headerBottom})`, padding: '6px 12px', display: 'grid', gridTemplateColumns: '140px 300px 150px 1fr', rowGap: 4 }}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} style={{ display: 'contents' }}>
              <b>{header.left[i]!.label}</b><span>{header.left[i]!.value}</span>
              <b style={{ textAlign: 'right', paddingRight: 4 }}>{right[i]!.label}</b><span>{right[i]!.value}</span>
            </span>
          ))}
        </div>
        <div className="pb-row" style={{ gap: 0, padding: '2px 12px', borderTop: `1px solid ${LW.ruleSoft}` }}>
          <span style={{ width: 90 }}>Source:</span><span style={{ width: 130 }}>SYSTEM</span>
          <span style={{ width: 50 }}>Date:</span><span style={{ width: 110 }}>{header.date}</span>
          <span>{header.loinc} {header.loincName}</span><span className="pb-row__spacer" /><b>{flow.distributed ? 'SIGNED' : 'UNSIGNED'}</b>
        </div>
        <PBBand>Recipient Distribution</PBBand>
        <div style={{ height: 110, flex: 'none', display: 'flex' }} data-tutorial-id="host.mois.group.recipient-distribution">
          <PBDataWindow
            rows={rows}
            current={cur}
            onCurrentChange={setCur}
            rowTutorialId={(_r, i) => `host.mois.row.distribution-${i}`}
            columns={[
              {
                key: 'method', header: 'Method', width: 130,
                render: (r, i) => (
                  <PBSelect w={120} options={['CDX', 'FAX', 'MAIL', 'PRINT', 'INTERNAL']} value={r.method}
                    data-tutorial-id={i === 0 ? 'host.mois.field.distribution-method' : `host.mois.field.distribution-method-${i}`}
                    onChange={(e) => setRows((v) => v.map((x, j) => (j === i ? { ...x, method: e.target.value, fax: e.target.value === 'FAX' ? x.fax || '250-565-7470' : x.fax } : x)))} />
                ),
              },
              { key: 'type', header: 'Recipient Type', width: 170 },
              { key: 'name', header: 'Recipient Name', width: 250 },
              {
                key: 'id', header: 'Recipient ID', width: 250,
                /* a FAX row carries the number SRFax dials (2616562) */
                render: (r) => (r.method === 'FAX' ? `FAX: ${r.fax}` : r.id),
              },
              { key: 'location', header: 'Recipient Location' },
            ]}
          />
        </div>
        {plain ? (
          <>
            <PBBand>Report (Read Only)</PBBand>
            <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '8px 10px', fontFamily: '"Lucida Console", monospace', whiteSpace: 'pre-wrap' }}>
              {flow.plainText || (flow.doc === 'information-request' ? TEMPLATE_TEXT
                : `${header.title}\n\n${p.last}, ${p.first}   DOB: ${p.dob}\n\nDear Dr. ${primary},\n\n<ENTER REPORT HERE>\n\nSincerely,\n\n${header.left[1]!.value}`)}
            </div>
          </>
        ) : (
          <>
            <div className="pb-band">
              <span>Preview</span><span className="pb-band__spacer" />
              <b style={{ color: '#0000ff', marginRight: 10 }} data-tutorial-id="host.mois.field.filesize">Filesize: {filesize}</b>
              <PBButton size="sm" style={{ width: 80 }} command="distribution-print">Print</PBButton>
            </div>
            <DistributionPreview lines={letterLines} />
          </>
        )}
      </div>
      <div className="pb-row" style={{ justifyContent: 'center', gap: 6, padding: '10px 0', flex: 'none' }}>
        <DialogButton
          id="distribute-f2"
          width={92}
          isDefault
          /* sends at once: the lessons grade "the writer has closed" right
             after the press. The "CDX Messaging — Initializing…" splash of
             2961349 `d7d34094…` is not drawn for that reason. */
          onClick={distribute}
        >
          Distribute (F2)
        </DialogButton>
        <DialogButton id="distribution-cancel" width={78} onClick={close}>Cancel</DialogButton>
      </div>
      {queued && (
        /* 2616562 `c85ea0f7…` */
        <PBMessageBox title="Success: Fax Queued" icon="info" buttons={[{ label: 'OK', value: 'ok', default: true, command: 'fax-queued-ok' }]} onClose={() => { setQueued(false); finish() }}>
          Successfully queued file to SRFax.<br />Please check your SRFax account for the faxing status.
        </PBMessageBox>
      )}
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow('select-consultation-order', SelectConsultationOrderWindow)
registerAreaWindow('order-detail', OrderDetailWindow)
registerAreaWindow('send-information-request', SendInformationRequestWindow)
registerAreaWindow('create-distribution', CreateDistributionWindow)
