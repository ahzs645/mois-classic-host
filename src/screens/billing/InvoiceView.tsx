import { useState } from 'react'
import {
  PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBDropDownDataWindow, PBInput, PBMessageBox, PBSelect,
  PBTextArea, PBViewHeader,
} from '../../pb'
import { useBillingCommands } from '../../data/billingCommands'
import {
  INVOICE_CODES, invoiceTotals, nextInvoiceStamp, useClinicTaxRates, useInvoices, type Invoice, type InvoiceTrans,
} from '../../data/billingStore'
import { DOCTORS } from '../../data/claims'
import { usePatient, usePatientRoster } from '../../data/patient-context'
import { MOIS_TODAY } from '../../data/patients'
import { yn } from '../../data/text'
import { useScreenReport } from '../../host/screen-state'
import { useOpenWindow } from '../areaWindowRegistry'
import { AdvancedLookupDialog } from '../AdvancedLookupDialog'
import { FormLabel, FormLine } from '../formKit'
import { useInvoicePrint } from './InvoiceWindows'

/* ============================================================================
   Invoice — Billing ▸ Invoices.

   PROVENANCE: 303603 (Invoices) and its capture `7726fa98` (v02.20.02, the
   header under an open Action menu): the nine-button task bar (New
   Invoice · Delete Invoice · Save · Statement · Receipt · Label · Add Payor
   · Edit Payor · Change Patient), the patient strip (Chart, Patient, DoB,
   Gender, Insurance by / No., Phone / Work), Provider and Payor drop-downs,
   Bill Date 1–3, Claim No. "…", Recon Code, Write Off, Taxable ☐ Apply Tax,
   Comment and Message boxes, the pale-green Summary band (BILLED − PAID −
   WRITTEN OFF − ADJUSTMENTS = BALANCE / OWED, zero printed as "-", and
   "Balance ALL Invoices for this patient" in pink), the Created line, and
   the transaction task bar (New Trans · Delete Trans · Pay Balance · W/O
   Balance · Paste MSP Claim) over Date | Tran Code | No. Serv | Fee Code |
   Unit Amount | Diag Code | Payment Method | Paid Amount | Adj Code |
   Adjustment Amount. Earlier transcription: `AgingReport_1_Parameters.png`
   and `sent_invoice.png`.

   BEHAVIOUR (303603):
     New Invoice      a blank invoice for the patient on screen (the open
                      chart, or the one Change Patient picked); Save assigns
                      the next invoice number ("Tab past and save to start a
                      new invoice and MOIS will assign an invoice number").
     Payor            SELF PAY or a third party (RCMP, WORKSAFEBC, ICBC, and
                      any Add Payor added) — a third-party invoice.
     New Trans        a B (bill) line dated today; No. Serv takes a partial
                      number ("0.5 for half a service"), Unit Amount can be
                      typed over the fee code's amount.
     Apply Tax        GST + PST on the billed lines, at the invoice's rates;
                      Change Tax Rates (INFERRED position: beside Apply Tax)
                      edits them for this invoice, starting from System
                      Settings ▸ Global ▸ GST / PST.
     Pay Balance      "A new line will be created indicating the Transaction
                      code is P (paid) with the paid amount present. The
                      Balance Owed field will be empty."
     W/O Balance      writes the rest off; Write Off reads Y.
     Statement / Receipt / Label, Add / Edit Payor, Change Tax Rates, the
     three Prompt lists, Transaction Note and Paste Sent MSP Claim are the
     windows in billing/InvoiceWindows.tsx.

   The invoices live in the session (data/billingStore `useInvoices`); the
   one the window opens on is the training invoice pay-an-invoice-in-mois
   pays, and `paid` / `onPaid` still tell the frame (host.invoice).
   ========================================================================= */

const GREY = { background: '#e8e8e8', color: '#404040' }
const PINK = { background: '#ffc8c8' }
const YELLOW = { background: '#ffffc8' }

const PAYMENT_METHODS = ['Cash', 'Cheque', 'Interact', 'Mastercard', 'Other', 'Visa']

/** MOIS's money format prints zero as "-". */
function money(n: number) { return Math.abs(n) < 0.005 ? '-' : n.toFixed(2) }

export function InvoiceView({ paid, onPaid }: { paid: boolean; onPaid: () => void }) {
  const { state, setState, current: inv, patchCurrent } = useInvoices()
  const patient = usePatient()
  const roster = usePatientRoster()
  const tax = useClinicTaxRates()
  const openWindow = useOpenWindow()
  const print = useInvoicePrint()
  const [cur, setCur] = useState(0)
  const [lookup, setLookup] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  /* the patient New Invoice is for, when Change Patient picked one */
  const [forChart, setForChart] = useState<string | null>(null)
  const totals = invoiceTotals(inv)
  const allOwed = state.invoices.filter((i) => i.chart === inv.chart).reduce((s, i) => s + invoiceTotals(i).owed, 0)
  const who = roster.find((p) => p.chart === inv.chart)

  const setTrans = (id: string, patch: Partial<InvoiceTrans>) =>
    patchCurrent((i) => ({ trans: i.trans.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))

  const newInvoice = () => {
    const chart = forChart ?? patient.chart ?? inv.chart
    const p = roster.find((r) => r.chart === chart)
    const draft: Invoice = {
      no: '', chart, patient: p ? `${p.first} ${p.last}` : inv.patient, provider: inv.provider, payor: 'SELF PAY', recon: 'U',
      billDate: MOIS_TODAY, claimNo: '', code: 'Standard', taxable: false, gst: tax.gst, pst: tax.pst,
      due: '', comment: '', message: '', trans: [], writtenOff: 0, created: '',
    }
    setState((prev) => ({ ...prev, invoices: [...prev.invoices.filter((i) => i.no !== ''), draft], current: '' }))
    setCur(0)
  }

  const save = () => {
    if (inv.no) { setMessage(null); return }
    setState((prev) => {
      const no = String(prev.serial + 1)
      return {
        ...prev,
        serial: prev.serial + 1,
        current: no,
        invoices: prev.invoices.map((i) => (i.no === '' ? { ...i, no, created: nextInvoiceStamp() } : i)),
      }
    })
  }

  const deleteInvoice = () => {
    setState((prev) => {
      const rest = prev.invoices.filter((i) => i.no !== prev.current)
      return rest.length ? { ...prev, invoices: rest, current: rest[rest.length - 1]!.no } : prev
    })
  }

  const newTrans = () => {
    const id = `t${Date.now().toString(36)}${inv.trans.length}`
    patchCurrent((i) => ({ trans: [...i.trans, { id, date: MOIS_TODAY, tran: 'B', serv: '1', fee: '', unit: '', diag: '', method: '', paid: '', adj: '', adjAmt: '' }] }))
    setCur(inv.trans.length)
  }

  const deleteTrans = () => {
    const t = inv.trans[Math.min(cur, inv.trans.length - 1)]
    if (t) patchCurrent((i) => ({ trans: i.trans.filter((x) => x.id !== t.id) }))
  }

  /* Pay Balance "creates a new line … Transaction code is P (paid) with the
     paid amount present"; W/O Balance writes the rest off. Both are also on
     the folder's Action menu (Ctrl+P, Ctrl+W) — data/menus/billing.ts. */
  const payBalance = () => {
    if (totals.owed <= 0) return
    const id = `p${inv.trans.length}`
    patchCurrent((i) => ({ trans: [...i.trans, { id, date: MOIS_TODAY, tran: 'P', serv: '', fee: '', unit: '', diag: '', method: 'Visa', paid: totals.owed.toFixed(2), adj: '', adjAmt: '' }] }))
    setCur(inv.trans.length)
    if (!paid) onPaid()
  }
  const writeOff = () => { if (totals.owed > 0) patchCurrent((i) => ({ writtenOff: (i.writtenOff || 0) + totals.owed })) }

  useBillingCommands((cmd) => {
    if (cmd === 'pay-balance') payBalance()
    else if (cmd === 'write-off-balance') writeOff()
    else if (cmd === 'recalculate') setMessage(`Balance owing recalculated: ${money(totals.owed)}`)
    else if (cmd === 'prompt-invoice') openWindow('invoice-prompt', { by: 'invoice' })
    else if (cmd === 'prompt-invoice-recon') openWindow('invoice-prompt', { by: 'recon' })
    else if (cmd === 'prompt-invoice-payor') openWindow('invoice-prompt', { by: 'payor' })
    else if (cmd === 'transaction-note') openWindow('invoice-transaction-note', { trans: inv.trans[cur]?.id ?? '' })
    else if (cmd === 'paste-msp-claim') openWindow('paste-msp-claim')
    else if (cmd === 'print-statement') print.statement()
    else if (cmd === 'print-receipt') openWindow('receipt-for-services')
  })

  const thirdParty = inv.payor !== 'SELF PAY'
  useScreenReport({
    invoiceNo: inv.no ? 'assigned' : 'new',
    invoices: state.invoices.length,
    payor: thirdParty ? 'third-party' : 'self-pay',
    taxable: inv.taxable,
    trans: inv.trans.length,
    balance: totals.owed > 0 ? 'owing' : 'paid',
    writeOff: yn(inv.writtenOff > 0),
    ...(lookup ? { dialog: 'invoice-change-patient' } : message ? { dialog: 'invoice-message' } : {}),
  })

  const rows = inv.trans.map((t, i) => ({ ...t, n: i }))
  /* the first B / P / A line is `host.mois.row.trans-b` (what
     pay-an-invoice-in-mois rings), later ones `trans-b-2` … */
  const anchors = new Map<string, string>()
  const seen: Record<string, number> = {}
  for (const t of inv.trans) {
    const k = t.tran.toLowerCase()
    seen[k] = (seen[k] ?? 0) + 1
    anchors.set(t.id, seen[k] === 1 ? `host.mois.row.trans-${k}` : `host.mois.row.trans-${k}-${seen[k]}`)
  }
  const anchorOf = (t: InvoiceTrans) => anchors.get(t.id) ?? `host.mois.row.trans-${t.tran.toLowerCase()}`
  const edit = (t: InvoiceTrans, key: keyof InvoiceTrans, w: number | string = '100%', align?: 'right' | 'center') => (
    <PBInput
      w={w}
      align={align}
      value={String(t[key] ?? '')}
      onChange={(e) => setTrans(t.id, { [key]: e.target.value } as Partial<InvoiceTrans>)}
      data-tutorial-id={t.id === inv.trans[cur]?.id ? `host.mois.field.trans-${String(key).toLowerCase()}` : undefined}
      style={{ border: 0, background: 'transparent' }}
    />
  )

  return (
    <>
      <PBViewHeader title="Invoice" />
      <PBCommandRow commands={[
        { label: 'New Invoice', onClick: newInvoice },
        { label: 'Delete Invoice', onClick: deleteInvoice },
        { label: 'Save', onClick: save },
        { label: 'Statement', onClick: print.statement },
        { label: 'Receipt', onClick: () => openWindow('receipt-for-services') },
        { label: 'Label', onClick: () => { if (!print.label()) setMessage('Select a Payor for this invoice before printing a label.') } },
        { label: 'Add Payor', onClick: () => openWindow('invoice-payor', { mode: 'add' }) },
        { label: 'Edit Payor', onClick: () => openWindow('invoice-payor', { mode: 'edit', code: inv.payor }) },
        { label: 'Change Patient', onClick: () => setLookup(true) },
      ]} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '2px 8px 6px' }}>
        <div className="pb-row" style={{ gap: 26, flex: 'none', padding: '2px 0' }}>
          <span>Chart:&nbsp; {inv.chart}</span><span>Patient: {inv.patient}</span>
          <span>DoB: {who?.dob ?? (inv.chart === '75' ? '1961.11.19' : '')}</span><span>Insurance by: {who?.insuranceBy ?? 'BC'}</span>
          <span>Phone: {who?.home ?? (inv.chart === '75' ? '(250) 555-5555' : '')}</span>
        </div>
        <div className="pb-row" style={{ gap: 26, flex: 'none', padding: '0 0 3px' }}>
          <span>Alias:</span><span>Gender: {who?.gender ?? 'F'}</span><span>Insurance No.: {who?.insurance ?? (inv.chart === '75' ? '9151252098' : '')}</span>
          <span>Work: {inv.chart === '75' ? '(250) 555-1234' : ''}</span>
        </div>

        <FormLine noLabel padding="1px 0" align="center" style={{ flex: 'none' }}>
          <FormLabel w={70}>Invoice #:</FormLabel>
          {/* "Press F4 to prompt a list of all invoices for the patient" */}
          <span className="pb-inputgroup" style={{ width: 107 }}>
            <input className="pb-field" readOnly value={inv.no} style={GREY} data-tutorial-id="host.mois.field.invoice-number"
              onKeyDown={(e) => { if (e.key === 'F4') { e.preventDefault(); openWindow('invoice-prompt', { by: 'invoice', chart: inv.chart }) } }} />
            <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--dots" data-tutorial-id="host.mois.lookup.invoice-number"
              onClick={() => openWindow('invoice-prompt', { by: 'invoice', chart: inv.chart })}>…</button>
          </span>
          <FormLabel w={62}>Provider:</FormLabel>
          <PBSelect w={200} options={DOCTORS} value={inv.provider} style={YELLOW} onChange={(e) => patchCurrent({ provider: e.target.value })} data-tutorial-id="host.mois.field.invoice-provider" />
          <FormLabel w={50}>Payor:</FormLabel>
          <PBDropDownDataWindow
            w={150}
            listW={320}
            value={inv.payor}
            display="code"
            columns={[{ key: 'code', header: 'Payor', width: 90 }, { key: 'name', header: 'Name', width: 200 }]}
            rows={state.payors}
            onSelect={(r) => patchCurrent({ payor: r.code })}
            tutorialId="host.mois.field.invoice-payor"
          />
          <FormLabel w={84}>Recon Code:</FormLabel>
          <PBInput w={30} align="center" value={inv.recon} style={GREY} readOnly />
        </FormLine>
        <FormLine noLabel padding="1px 0" align="center" style={{ flex: 'none' }}>
          <FormLabel w={70}>Bill Date:</FormLabel>
          <span>1:</span><PBInput w={90} value={inv.billDate} onChange={(e) => patchCurrent({ billDate: e.target.value })} data-tutorial-id="host.mois.field.invoice-bill-date" />
          <span>2:</span><PBInput w={90} />
          <span>3:</span><PBInput w={90} />
          <FormLabel w={66}>Claim No.:</FormLabel>
          <span className="pb-inputgroup" style={{ width: 137 }}>
            <input className="pb-field" value={inv.claimNo} onChange={(e) => patchCurrent({ claimNo: e.target.value })} data-tutorial-id="host.mois.field.invoice-claim-no" />
            <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--dots" onClick={() => openWindow('paste-msp-claim')}>…</button>
          </span>
          <FormLabel w={72}>Write Off:</FormLabel>
          <PBInput w={30} align="center" value={yn(inv.writtenOff > 0)} style={GREY} readOnly data-tutorial-id="host.mois.field.invoice-write-off" />
        </FormLine>
        <FormLine noLabel padding="1px 0" align="center" style={{ flex: 'none' }}>
          <FormLabel w={92}>No. Billings:</FormLabel>
          <PBInput w={40} align="right" value={String(inv.trans.filter((t) => t.tran === 'B').length)} style={GREY} readOnly />
          <FormLabel w={84}>Invoice Code:</FormLabel>
          <PBSelect w={140} options={INVOICE_CODES} value={inv.code} onChange={(e) => patchCurrent({ code: e.target.value })} data-tutorial-id="host.mois.field.invoice-code" />
          <FormLabel w={60}>Taxable:</FormLabel>
          <PBCheckbox label="Apply Tax" checked={inv.taxable} onChange={(v) => patchCurrent({ taxable: v })} tutorialId="host.mois.check.apply-tax" />
          <PBButton size="sm" command="change-tax-rates" onClick={() => openWindow('invoice-tax-rates')}>Change Tax Rates</PBButton>
          <FormLabel w={90}>Payment Due:</FormLabel>
          <PBInput w={100} value={inv.due} onChange={(e) => patchCurrent({ due: e.target.value })} data-tutorial-id="host.mois.field.invoice-payment-due" />
        </FormLine>
        <div className="pb-row" style={{ gap: 6, flex: 'none', padding: '2px 0', alignItems: 'flex-start' }}>
          <FormLabel w={70}>Comment:</FormLabel>
          <PBTextArea rows={2} w={320} style={{ height: 40, resize: 'none' }} value={inv.comment} onChange={(e) => patchCurrent({ comment: e.target.value })} data-tutorial-id="host.mois.field.invoice-comment" />
          <FormLabel w={62}>Message:</FormLabel>
          <PBTextArea rows={2} w={320} style={{ height: 40, resize: 'none' }} value={inv.message} onChange={(e) => patchCurrent({ message: e.target.value })} data-tutorial-id="host.mois.field.invoice-message" />
        </div>

        {/* the pale-green summary band */}
        <div style={{ background: '#c8ebdc', border: '1px solid #9ab5aa', margin: '5px 0', padding: '3px 6px', flex: 'none' }}>
          <div className="pb-row" style={{ gap: 10, justifyContent: 'center', fontWeight: 700 }}>
            <span style={{ width: 90, textAlign: 'center' }}>BILLED</span><span>-</span>
            <span style={{ width: 90, textAlign: 'center' }}>PAID</span><span>-</span>
            <span style={{ width: 90, textAlign: 'center' }}>WRITTEN OFF</span><span>-</span>
            <span style={{ width: 90, textAlign: 'center' }}>ADJUSTMENTS</span><span>=</span>
            <span style={{ width: 110, textAlign: 'center' }}>BALANCE / OWED</span>
          </div>
          <div className="pb-row" style={{ gap: 10, alignItems: 'center', paddingTop: 2 }}>
            <span className="pb-form__label" style={{ flex: '1 1 auto' }}>Summary:</span>
            <PBInput w={90} align="right" value={money(totals.billed)} readOnly style={GREY} data-tutorial-id="host.mois.field.invoice-billed" />
            <span>-</span>
            <PBInput w={90} align="right" value={money(totals.paid)} readOnly style={GREY} />
            <span>-</span>
            <PBInput w={90} align="right" value={money(totals.writtenOff)} readOnly style={GREY} />
            <span>-</span>
            <PBInput w={90} align="right" value={money(totals.adjusted)} readOnly style={GREY} />
            <span>=</span>
            <PBInput w={110} align="right" value={money(totals.owed)} readOnly style={GREY} data-tutorial-id="host.mois.field.balance-owed" />
          </div>
          <div className="pb-row" style={{ gap: 8, justifyContent: 'center', paddingTop: 2 }}>
            {inv.taxable && <span style={{ color: '#404040' }}>{`incl. GST ${(inv.gst * 100).toFixed(0)}% + PST ${(inv.pst * 100).toFixed(0)}%: ${money(totals.tax)}`}</span>}
            <span className="pb-form__label">Balance ALL Invoices for this patient:</span>
            <PBInput w={90} align="right" value={money(allOwed)} readOnly style={PINK} />
          </div>
        </div>
        <div className="pb-row" style={{ flex: 'none', padding: '0 0 3px', color: '#404040' }}>
          Created:&nbsp;&nbsp;{inv.created}
        </div>

        <PBCommandRow commands={[
          { label: 'New Trans', onClick: newTrans },
          { label: 'Delete Trans', onClick: deleteTrans },
          { label: 'Pay Balance', onClick: payBalance },
          { label: 'W/O Balance', onClick: writeOff },
          { label: 'Paste MSP Claim', onClick: () => openWindow('paste-msp-claim') },
        ]} />
        <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, paddingTop: 3 }}>
          <PBDataWindow
            rows={rows}
            current={Math.min(cur, Math.max(0, rows.length - 1))}
            onCurrentChange={setCur}
            rowTutorialId={anchorOf}
            columns={[
              { key: 'date', header: 'Date', width: 83, align: 'center', render: (t) => (t.id === inv.trans[cur]?.id ? edit(t, 'date') : t.date) },
              {
                key: 'tran', header: 'Tran Code', width: 50, align: 'center',
                render: (t) => (t.id === inv.trans[cur]?.id
                  ? <PBSelect w="100%" options={['B', 'P', 'A']} value={t.tran} onChange={(e) => setTrans(t.id, { tran: e.target.value as InvoiceTrans['tran'] })} data-tutorial-id="host.mois.field.trans-tran" />
                  : t.tran),
              },
              { key: 'serv', header: 'No. Serv', width: 60, align: 'center', render: (t) => (t.tran === 'B' ? edit(t, 'serv', '100%', 'center') : '') },
              {
                key: 'fee', header: 'Fee Code', width: 90,
                render: (t) => (t.tran === 'B' ? (
                  <span className="pb-inputgroup" style={{ width: '100%' }}>
                    {edit(t, 'fee')}
                    <button type="button" className="pb-inputgroup__btn pb-inputgroup__btn--dots"
                      data-tutorial-id={t.id === inv.trans[cur]?.id ? 'host.mois.lookup.trans-fee' : undefined}
                      onClick={() => openWindow('invoice-fee-lookup', { trans: t.id })}>…</button>
                  </span>
                ) : ''),
              },
              { key: 'unit', header: 'Unit Amount', width: 81, align: 'right', render: (t) => (t.tran === 'B' ? edit(t, 'unit', '100%', 'right') : '') },
              { key: 'diag', header: 'Diag Code', width: 74, render: (t) => (t.tran === 'B' ? edit(t, 'diag') : '') },
              {
                key: 'method', header: 'Payment Method', width: 96,
                render: (t) => (t.tran === 'P'
                  ? (
                    <PBSelect
                      w="100%"
                      options={PAYMENT_METHODS}
                      value={t.method}
                      onChange={(e) => setTrans(t.id, { method: e.target.value })}
                      data-tutorial-id="host.mois.field.payment-method"
                    />
                  )
                  : t.method),
              },
              { key: 'paid', header: 'Paid Amount', width: 81, align: 'right', render: (t) => (t.tran === 'P' ? edit(t, 'paid', '100%', 'right') : '') },
              { key: 'adj', header: 'Adj Code', width: 65, render: (t) => (t.tran === 'A' ? edit(t, 'adj') : '') },
              { key: 'adjAmt', header: 'Adjustment Amount', width: 81, align: 'right', render: (t) => (t.tran === 'A' ? edit(t, 'adjAmt', '100%', 'right') : '') },
            ]}
          />
        </div>
      </div>

      {lookup && (
        <AdvancedLookupDialog
          chart={inv.chart}
          roster={roster}
          onPick={(chart) => {
            setLookup(false)
            setForChart(chart)
            /* the patient's latest invoice, if there is one */
            const theirs = state.invoices.filter((i) => i.chart === chart && i.no)
            if (theirs.length) setState((prev) => ({ ...prev, current: theirs[theirs.length - 1]!.no }))
            else {
              const p = roster.find((r) => r.chart === chart)
              const draft: Invoice = {
                no: '', chart, patient: p ? `${p.first} ${p.last}` : '', provider: inv.provider, payor: 'SELF PAY', recon: 'U',
                billDate: MOIS_TODAY, claimNo: '', code: 'Standard', taxable: false, gst: tax.gst, pst: tax.pst,
                due: '', comment: '', message: '', trans: [], writtenOff: 0, created: '',
              }
              setState((prev) => ({ ...prev, invoices: [...prev.invoices.filter((i) => i.no !== ''), draft], current: '' }))
            }
          }}
          onClose={() => setLookup(false)}
        />
      )}
      {message && (
        <PBMessageBox title="Invoice" buttons={[{ label: 'OK', value: 'ok', default: true, command: 'invoice-ok' }]} onClose={() => setMessage(null)}>
          {message}
        </PBMessageBox>
      )}
    </>
  )
}
