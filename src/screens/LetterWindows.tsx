import { useState } from 'react'
import { useChartExport } from '../data/chart-records'
import { addLetterDistribution } from '../data/chartSession'
import {
  DEFAULT_TEMPLATE, DESKTOP_PROVIDER, beginLetter, consultOrders, letterHeader, letterOrder, setLetterFlow, useLetterFlow,
} from '../data/letterFlow'
import { LW } from '../data/letterWriter'
import { usePatient } from '../data/patient-context'
import { PBBand, PBDataWindow, PBInput, PBLookup, PBRadio, PBSelect, PBTextArea, pbSlug } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

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
   ========================================================================= */

const dot = (v?: string) => (v ?? '').split(' ')[0]!.replace(/\//g, '.')

/** The yellow two-line patient block Order Detail and Letter Setup share. */
function PatientBlock() {
  const p = usePatient()
  return (
    <div style={{ background: '#ffffc0', padding: '2px 10px', borderBottom: '1px solid #9a9a9a', flex: 'none' }}>
      <div className="pb-row" style={{ gap: 0 }}>
        <span>FIRST:&nbsp;</span><b style={{ width: 150 }}>{p.first}</b>
        <span>MIDDLE:&nbsp;</span><b style={{ width: 130 }}>{p.middle}</b>
        <span>LAST:&nbsp;</span><b style={{ width: 170 }}>{p.last}</b>
        <span>DoB:&nbsp;</span><b style={{ width: 90 }}>{p.dob}</b><b>{p.sex}</b>
      </div>
      <div className="pb-row" style={{ gap: 0 }}>
        <span>PHN:&nbsp;</span><b style={{ width: 160 }}>{[p.insuranceBy, p.bchn ?? p.insurance, p.dep].filter(Boolean).join(' ')}</b>
        <span>Home:&nbsp;</span><b style={{ width: 120 }}>{p.home}</b>
        <span>Work:&nbsp;</span><b style={{ width: 120 }}>{p.work}</b>
        <span style={{ textDecoration: 'underline' }}>Cell:</span>&nbsp;<b>{p.cell}</b>
      </div>
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
  const orderId = typeof args.orderId === 'string' ? args.orderId : null
  const order = orderId ? consultOrders(data).find((r) => r.id_order === orderId) : undefined
  const [text, setText] = useState(order?.str_note ?? '')
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
            {field('Order Date:', dot(order?.dtm_ord_date) || '2026.09.18', 82)}
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
        <DialogButton id="order-detail-spelling" width={78}>Spelling...</DialogButton>
        <span className="pb-row__spacer" />
        <DialogButton id="order-detail-save" width={78}>Save (F2)</DialogButton>
        <DialogButton id="order-detail-save-close" width={78} onClick={close}>Save / Close</DialogButton>
        <DialogButton id="order-detail-cancel" width={78} onClick={close}>Cancel</DialogButton>
        <span style={{ width: 40 }} />
        <DialogButton
          id="create-referral-note"
          width={122}
          isDefault
          onClick={() => {
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
        <div className="pb-row" style={{ gap: 0, padding: '3px 12px', borderBottom: '1px solid #9a9a9a', background: '#fff' }}>
          <span>FIRST:&nbsp;</span><b style={{ width: 160 }}>{p.first}</b>
          <span>MIDDLE:&nbsp;</span><b style={{ width: 150 }}>{p.middle}</b>
          <span>LAST:&nbsp;</span><b style={{ width: 180 }}>{p.last}</b>
          <span>DoB:&nbsp;</span><b style={{ width: 110 }}>{p.dob}</b>
          <span>SEX:&nbsp;</span><b>{p.sex}</b>
        </div>
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
  const cdx = order?.str_recipient_id_system === 'CDXCLINICID' || flow.doc === 'information-request'
  const copies = (header.right.find((f) => f.label === 'Copies To:')?.value ?? '').split(';').map((s) => s.trim()).filter(Boolean)
  const [rows, setRows] = useState(() => [
    { method: cdx ? 'CDX' : 'MAIL', type: 'PRIMARY RECIPIENT', name: primary, id: order?.str_recipient_id ? `${order.str_recipient_id_system}: ${order.str_recipient_id}` : '', location: '' },
    ...copies.map((name) => ({ method: 'MAIL', type: 'SECONDARY RECIPIENT', name, id: '', location: '' })),
  ])
  const right = header.right
  return (
    <WorkspaceDialogFrame id="create-distribution" title="Create Distribution" width={1000} height={700} onClose={close} zIndex={96}>
      <div style={{ margin: '8px 10px 0', border: '1px solid #646464', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, background: '#fff' }}>
        <PBBand>{header.title}</PBBand>
        <div className="pb-row" style={{ gap: 0, padding: '3px 8px', borderBottom: '1px solid #9a9a9a' }}>
          <span>FIRST:&nbsp;</span><b style={{ width: 180 }}>{p.first}</b>
          <span>MIDDLE:&nbsp;</span><b style={{ width: 150 }}>{p.middle}</b>
          <span>LAST:&nbsp;</span><b style={{ width: 180 }}>{p.last}</b>
          <span>DoB:&nbsp;</span><b style={{ width: 110 }}>{p.dob}</b>
          <span>SEX:&nbsp;</span><b>{p.sex}</b>
        </div>
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
            current={0}
            columns={[
              {
                key: 'method', header: 'Method', width: 130,
                render: (r, i) => (
                  <PBSelect w={120} options={['CDX', 'FAX', 'MAIL', 'INTERNAL']} value={r.method}
                    onChange={(e) => setRows((v) => v.map((x, j) => (j === i ? { ...x, method: e.target.value } : x)))} />
                ),
              },
              { key: 'type', header: 'Recipient Type', width: 170 },
              { key: 'name', header: 'Recipient Name', width: 250 },
              { key: 'id', header: 'Recipient ID', width: 250 },
              { key: 'location', header: 'Recipient Location' },
            ]}
          />
        </div>
        <PBBand>Report (Read Only)</PBBand>
        <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '8px 10px', fontFamily: '"Lucida Console", monospace', whiteSpace: 'pre-wrap' }}>
          {flow.doc === 'information-request' ? TEMPLATE_TEXT
            : `${header.title}\n\n${p.last}, ${p.first}   DOB: ${p.dob}\n\nDear Dr. ${primary},\n\n<ENTER REPORT HERE>\n\nSincerely,\n\n${header.left[1]!.value}`}
        </div>
      </div>
      <div className="pb-row" style={{ justifyContent: 'center', gap: 6, padding: '10px 0', flex: 'none' }}>
        <DialogButton
          id="distribute-f2"
          width={92}
          isDefault
          onClick={() => {
            addLetterDistribution(p.chart, {
              orderId: order?.id_order ?? null, doc: flow.doc, date: header.date, title: header.title,
              rows: rows.map((r) => ({ method: r.method, type: r.type, name: r.name, status: r.method === 'CDX' ? 'SUCCESS' : '' })),
            })
            setLetterFlow({ distributed: true })
            close()
          }}
        >
          Distribute (F2)
        </DialogButton>
        <DialogButton id="distribution-cancel" width={78} onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow('select-consultation-order', SelectConsultationOrderWindow)
registerAreaWindow('order-detail', OrderDetailWindow)
registerAreaWindow('send-information-request', SendInformationRequestWindow)
registerAreaWindow('create-distribution', CreateDistributionWindow)
