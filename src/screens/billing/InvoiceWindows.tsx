import { useMemo, useState } from 'react'
import { PBBand, PBCheckbox, PBDataWindow, PBInput } from '../../pb'
import {
  CLAIM_FEE_ROWS, invoiceTotals, useInvoices, useProviderLetterhead, useSentClaims, type Invoice, type InvoiceTrans, type Payor,
} from '../../data/billingStore'
import { usePatientRoster } from '../../data/patient-context'
import { MOIS_TODAY } from '../../data/patients'
import { useScreenReport } from '../../host/screen-state'
import { registerAreaWindow, useOpenWindow, type AreaWindowProps } from '../areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from '../WorkspaceDialogFrame'

/* ============================================================================
   The Invoice window's own windows (303603).

   PROVENANCE: 303603 text only — the archive's one Invoices capture
   (`7726fa98`) is the main window. Every layout below is INFERRED from the
   article's words and drawn in the house idiom (WorkspaceDialogFrame, a
   band, a DataWindow, centred buttons):

   · Statement (Ctrl+A / Statement)  → Print Preview. "Statement will
     display: Provider letterhead · Bill to information (from invoice payor
     information) · Patient Information · Invoice information and details."
   · Receipt for Services — `receipt-for-services` (Ctrl+R / Receipt).
     "Opens the Receipt for Services window where you can select which
     transactions to include on the receipt. Press print to open a print
     preview window." "Select items marked type P = paid to include Amount
     Paid … type B = bill to include Amount Owing". The receipt shows the
     letterhead, Invoice #, the receipt date, the Internal ID # and the
     patient.
   · Label → Print Preview of the payor's Detail lines ("Information in the
     Detail section of the Payor information will print to your selected
     label printer").
   · Add Payor / Edit Payor — `invoice-payor`: Code, Name and the Detail
     lines. ("Click Add Payor to add new or Edit Payor to edit details.")
   · Change Tax Rates — `invoice-tax-rates`: the invoice's GST % and PST %.
     ("This allows the users to change the amount of tax that is due, by
     changing the % of tax charged.")
   · Prompt by Reconciliation Code (Alt+F1) / Payor Code (Alt+F2) / Invoice #
     (Alt+F3) — `invoice-prompt`, args `{ by: 'recon' | 'payor' | 'invoice',
     chart? }`: the invoices, sorted by that column, a filter box over it,
     Ok / Cancel. "Type in the Invoice number on the first filter field above
     the Invoice column and hit Enter. Select the correct invoice and press
     'Ok'."
   · Transaction Note — `invoice-transaction-note`, args `{ trans }`: "the
     transaction date, type, amount billed, amount paid, activity date (last
     date active), and an additional comment box … The date the invoice was
     created is also stated, with who created the invoice."
   · Paste Sent MSP Claim — `paste-msp-claim`: "Opens the list of sent claims
     to select from. The selected claim will be pasted into a transaction
     record."
   · Fee Code "…" on a transaction — `invoice-fee-lookup`, args `{ trans }`.
   ========================================================================= */

const money = (n: number) => (Math.abs(n) < 0.005 ? '-' : n.toFixed(2))

/** The statement and label prints, as the Invoice window's buttons call them. */
export function useInvoicePrint() {
  const { state, current } = useInvoices()
  const roster = usePatientRoster()
  const open = useOpenWindow()
  const letterhead = useProviderLetterhead(current.provider)
  const payor = state.payors.find((p) => p.code === current.payor)
  return {
    statement: () => open('print-preview', { title: 'Invoice Statement', bare: true, pages: [statementPage(current, letterhead, payor, roster)] }),
    /** false when the invoice has no payor with a Detail block to print */
    label: () => {
      if (!payor || !payor.detail.length) return false
      open('print-preview', { title: 'Payor Label', bare: true, pages: [payor.detail.map((l) => `**${l}**`).join('\n')] })
      return true
    },
    receipt: (lines: InvoiceTrans[]) => open('print-preview', { title: 'Receipt for Services', bare: true, pages: [receiptPage(current, letterhead, lines, roster)] }),
  }
}

type Roster = ReturnType<typeof usePatientRoster>

function patientLines(inv: Invoice, roster: Roster): string[] {
  const p = roster.find((r) => r.chart === inv.chart)
  return [
    `Patient: **${inv.patient}**     Chart: ${inv.chart}`,
    `DoB: ${p?.dob ?? ''}     Insurance: ${p?.insuranceBy ?? 'BC'} ${p?.insurance ?? ''}`,
  ]
}

function statementPage(inv: Invoice, letterhead: string[], payor: Payor | undefined, roster: Roster): string {
  const t = invoiceTotals(inv)
  const billTo = payor && payor.code !== 'SELF PAY' ? (payor.detail.length ? payor.detail : [payor.name]) : [inv.patient]
  return [
    `**${letterhead[0] ?? ''}**`, ...letterhead.slice(1),
    '%RULE%',
    '%TITLE%STATEMENT',
    `Invoice #: **${inv.no || '(unsaved)'}**     Billing Date: ${inv.billDate}     Payment Due: ${inv.due}`,
    '',
    '**Bill To:**', ...billTo,
    '',
    ...patientLines(inv, roster),
    '%RULE%',
    '%COLS:14,8,10,14,12,14,14,14%',
    '%TH%Date|Code|No. Serv|Fee Code|Diag|Unit Amount|Paid|Adjusted',
    ...inv.trans.map((x) => `%TR%${x.date}|${x.tran}|${x.serv}|${x.fee}|${x.diag}|${x.unit}|${x.paid}|${x.adjAmt}`),
    '%RULE%',
    ...(inv.taxable ? [`GST ${(inv.gst * 100).toFixed(0)}% + PST ${(inv.pst * 100).toFixed(0)}%: ${money(t.tax)}`] : []),
    `Billed: **${money(t.billed)}**   Paid: ${money(t.paid)}   Written Off: ${money(t.writtenOff)}   Adjustments: ${money(t.adjusted)}`,
    `**Balance Owing: ${money(t.owed)}**`,
    '',
    ...(inv.message.trim() ? [inv.message] : []),
  ].join('\n')
}

function receiptPage(inv: Invoice, letterhead: string[], lines: InvoiceTrans[], roster: Roster): string {
  const paid = lines.filter((l) => l.tran === 'P').reduce((s, l) => s + (Number(l.paid) || 0), 0)
  const owing = lines.filter((l) => l.tran === 'B').reduce((s, l) => s + (Number(l.unit) || 0) * (Number(l.serv) || 1), 0)
  return [
    `**${letterhead[0] ?? ''}**`, ...letterhead.slice(1),
    '%RULE%',
    '%TITLE%RECEIPT FOR SERVICES',
    `Invoice #: **${inv.no || '(unsaved)'}**     Receipt Date: ${MOIS_TODAY}     Internal ID #: ${inv.chart}`,
    '',
    ...patientLines(inv, roster),
    '%RULE%',
    '%COLS:18,10,16,18,18%',
    '%TH%Date|Type|Fee Code|Amount|Method',
    ...lines.map((x) => `%TR%${x.date}|${x.tran}|${x.fee}|${x.tran === 'P' ? x.paid : x.unit}|${x.method}`),
    '%RULE%',
    ...(lines.some((l) => l.tran === 'P') ? [`**Amount Paid: ${money(paid)}**`] : []),
    ...(lines.some((l) => l.tran === 'B') ? [`**Amount Owing: ${money(owing)}**`] : []),
  ].join('\n')
}

/* --- Receipt for Services -------------------------------------------------- */

export function ReceiptForServicesWindow({ close }: AreaWindowProps) {
  const { current } = useInvoices()
  const print = useInvoicePrint()
  const [picked, setPicked] = useState<Set<string>>(() => new Set(current.trans.filter((t) => t.tran === 'P').map((t) => t.id)))
  useScreenReport({ included: picked.size })
  const lines = current.trans.filter((t) => picked.has(t.id))
  return (
    <WorkspaceDialogFrame id="receipt-for-services" title="Receipt for Services" width={620} height={400} controls={false} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 8, gap: 6 }}>
        <div>Select the transactions to include on the receipt. P (paid) lines print the Amount Paid; B (bill) lines the Amount Owing.</div>
        <PBDataWindow
          style={{ flex: '1 1 auto', minHeight: 0 }}
          columns={[
            {
              key: 'inc', header: 'Include', width: 60, align: 'center',
              render: (t: InvoiceTrans) => (
                <PBCheckbox
                  checked={picked.has(t.id)}
                  onChange={(v) => setPicked((prev) => { const n = new Set(prev); if (v) n.add(t.id); else n.delete(t.id); return n })}
                  tutorialId={`host.mois.check.receipt-${t.tran.toLowerCase()}-${current.trans.filter((x) => x.tran === t.tran).indexOf(t) + 1}`}
                />
              ),
            },
            { key: 'date', header: 'Date', width: 90, align: 'center' },
            { key: 'tran', header: 'Tran Code', width: 70, align: 'center' },
            { key: 'fee', header: 'Fee Code', width: 80 },
            { key: 'unit', header: 'Unit Amount', width: 90, align: 'right' },
            { key: 'paid', header: 'Paid Amount', width: 90, align: 'right' },
            { key: 'method', header: 'Payment Method', width: 100 },
          ]}
          rows={current.trans}
          rowTutorialId={(t) => `host.mois.row.receipt-${t.tran.toLowerCase()}`}
          empty="This invoice has no transactions."
        />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flex: 'none' }}>
          <DialogButton id="receipt-print" isDefault disabled={!lines.length} onClick={() => print.receipt(lines)}>Print</DialogButton>
          <DialogButton id="receipt-cancel" onClick={close}>Cancel</DialogButton>
        </div>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- Add / Edit Payor ------------------------------------------------------- */

export function PayorWindow({ args, close }: AreaWindowProps) {
  const { state, setState, patchCurrent } = useInvoices()
  const editing = args.mode === 'edit' ? state.payors.find((p) => p.code === args.code) : undefined
  const [code, setCode] = useState(editing?.code ?? '')
  const [name, setName] = useState(editing?.name ?? '')
  const [detail, setDetail] = useState<string[]>(() => [0, 1, 2, 3].map((i) => editing?.detail[i] ?? ''))
  const [err, setErr] = useState('')
  useScreenReport({ mode: editing ? 'edit' : 'add' })
  const save = () => {
    const c = code.trim().toUpperCase()
    if (!c) { setErr('Enter a payor code.'); return }
    if (!editing && state.payors.some((p) => p.code === c)) { setErr('That payor code is already on the list.'); return }
    const payor: Payor = { code: c, name: name.trim().toUpperCase() || c, detail: detail.map((d) => d.trim()).filter(Boolean) }
    setState((prev) => ({
      ...prev,
      payors: editing ? prev.payors.map((p) => (p.code === editing.code ? payor : p)) : [...prev.payors, payor],
    }))
    patchCurrent({ payor: c })
    close()
  }
  return (
    <WorkspaceDialogFrame id="invoice-payor" title={editing ? 'Edit Payor' : 'Add Payor'} width={440} height={300} controls={false} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', padding: 10, gap: 4 }}>
        <div className="pb-row" style={{ gap: 6 }}><span style={{ width: 70 }}>Code:</span>
          <PBInput w={120} value={code} readOnly={Boolean(editing)} onChange={(e) => setCode(e.target.value)} data-tutorial-id="host.mois.field.payor-code" /></div>
        <div className="pb-row" style={{ gap: 6 }}><span style={{ width: 70 }}>Name:</span>
          <PBInput w={300} value={name} onChange={(e) => setName(e.target.value)} data-tutorial-id="host.mois.field.payor-name" /></div>
        <div style={{ fontWeight: 700, color: '#000080', paddingTop: 6 }}>Detail</div>
        {detail.map((d, i) => (
          <div key={i} className="pb-row" style={{ gap: 6 }}><span style={{ width: 70 }}>{`Line ${i + 1}:`}</span>
            <PBInput w={300} value={d} onChange={(e) => setDetail(detail.map((x, j) => (j === i ? e.target.value : x)))} data-tutorial-id={`host.mois.field.payor-detail-${i + 1}`} /></div>
        ))}
        {err && <div style={{ color: '#c00000' }}>{err}</div>}
        <span style={{ flex: '1 1 auto' }} />
        <div className="pb-row" style={{ justifyContent: 'center', gap: 12 }}>
          <DialogButton id="payor-save" isDefault onClick={save}>Save</DialogButton>
          <DialogButton id="payor-cancel" onClick={close}>Cancel</DialogButton>
        </div>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- Change Tax Rates --------------------------------------------------------- */

export function TaxRatesWindow({ close }: AreaWindowProps) {
  const { current, patchCurrent } = useInvoices()
  const [gst, setGst] = useState((current.gst * 100).toFixed(2))
  const [pst, setPst] = useState((current.pst * 100).toFixed(2))
  return (
    <WorkspaceDialogFrame id="invoice-tax-rates" title="Change Tax Rates" width={320} height={200} controls={false} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', padding: 12, gap: 6 }}>
        <div className="pb-row" style={{ gap: 6 }}><span style={{ width: 60 }}>GST %:</span>
          <PBInput w={70} align="right" value={gst} onChange={(e) => setGst(e.target.value)} data-tutorial-id="host.mois.field.tax-gst" /></div>
        <div className="pb-row" style={{ gap: 6 }}><span style={{ width: 60 }}>PST %:</span>
          <PBInput w={70} align="right" value={pst} onChange={(e) => setPst(e.target.value)} data-tutorial-id="host.mois.field.tax-pst" /></div>
        <div style={{ color: '#404040' }}>The clinic's defaults are in Administration ▸ System Settings ▸ Global.</div>
        <span style={{ flex: '1 1 auto' }} />
        <div className="pb-row" style={{ justifyContent: 'center', gap: 12 }}>
          <DialogButton id="tax-rates-ok" isDefault onClick={() => {
            const g = Number(gst) / 100
            const p = Number(pst) / 100
            patchCurrent({ gst: Number.isFinite(g) ? g : current.gst, pst: Number.isFinite(p) ? p : current.pst })
            close()
          }}>Ok</DialogButton>
          <DialogButton id="tax-rates-cancel" onClick={close}>Cancel</DialogButton>
        </div>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- Prompt by Reconciliation Code / Payor Code / Invoice # ------------------- */

const PROMPT_TITLES: Record<string, string> = {
  recon: 'Invoices - Ordered by Reconciliation Code',
  payor: 'Invoices - Ordered by Payor Code',
  invoice: 'Invoices - Ordered by Invoice #',
}

export function InvoicePromptWindow({ args, close }: AreaWindowProps) {
  const { state, setState } = useInvoices()
  const by = (args.by as string) || 'invoice'
  const chart = typeof args.chart === 'string' ? args.chart : ''
  const [filter, setFilter] = useState<Record<string, string>>({})
  const [cur, setCur] = useState(0)
  const rows = useMemo(() => state.invoices
    .filter((i) => i.no && (!chart || i.chart === chart))
    .map((i) => ({ invoice: i.no, recon: i.recon, payor: i.payor, chart: i.chart, patient: i.patient, billDate: i.billDate, balance: invoiceTotals(i).owed.toFixed(2) }))
    .filter((r) => Object.entries(filter).every(([k, v]) => !v.trim() || String(r[k as keyof typeof r]).toUpperCase().includes(v.trim().toUpperCase())))
    .sort((a, b) => String(a[by as keyof typeof a]).localeCompare(String(b[by as keyof typeof b]))), [by, chart, filter, state.invoices])
  useScreenReport({ rows: rows.length })
  const picked = rows[Math.min(cur, rows.length - 1)]
  const pick = () => { if (picked) { setState((prev) => ({ ...prev, current: picked.invoice })); close() } }
  const cols = by === 'recon' ? ['recon', 'invoice', 'payor'] : by === 'payor' ? ['payor', 'invoice', 'recon'] : ['invoice', 'recon', 'payor']
  const head: Record<string, string> = { invoice: 'Invoice', recon: 'Recon', payor: 'Payor' }
  return (
    <WorkspaceDialogFrame id="invoice-prompt" title="Advanced Lookup Service" width={720} height={440} controls={false} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 8, gap: 6 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid var(--pb-border)' }}>
          <div className="pb-band--ruled"><PBBand>{PROMPT_TITLES[by] ?? PROMPT_TITLES.invoice}</PBBand></div>
          <PBDataWindow
            flush
            rules="white"
            style={{ flex: '1 1 auto', minHeight: 0 }}
            columns={[
              ...cols.map((k) => ({ key: k, header: head[k]!, width: k === 'payor' ? 110 : 70 })),
              { key: 'chart', header: 'Chart', width: 60 },
              { key: 'patient', header: 'Patient', width: 170 },
              { key: 'billDate', header: 'Bill Date', width: 84, align: 'center' as const },
              { key: 'balance', header: 'Balance', width: 80, align: 'right' as const },
            ]}
            rows={rows}
            filters={[...cols.map((k) => (
              <PBInput key={k} value={filter[k] ?? ''} onChange={(e) => setFilter({ ...filter, [k]: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') setCur(0) }} data-tutorial-id={`host.mois.field.invoice-filter-${k}`} />
            )), null, null, null, null]}
            current={Math.min(cur, Math.max(0, rows.length - 1))}
            onCurrentChange={setCur}
            onActivate={pick}
            rowTutorialId={(r) => `host.mois.row.invoice-${r.invoice}`}
            empty="No invoice matches."
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flex: 'none' }}>
          <DialogButton id="invoice-prompt-ok" isDefault disabled={!picked} onClick={pick}>Ok</DialogButton>
          <DialogButton id="invoice-prompt-cancel" onClick={close}>Cancel</DialogButton>
        </div>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- Transaction Note ------------------------------------------------------------ */

export function TransactionNoteWindow({ args, close }: AreaWindowProps) {
  const { current, patchCurrent } = useInvoices()
  const t = current.trans.find((x) => x.id === args.trans) ?? current.trans[0]
  const [note, setNote] = useState(t?.note ?? '')
  const KV = ({ k, v }: { k: string; v: string }) => <div className="pb-row" style={{ gap: 6 }}><span style={{ width: 110 }}>{k}</span><b>{v}</b></div>
  return (
    <WorkspaceDialogFrame id="invoice-transaction-note" title="Transaction Note" width={460} height={360} controls={false} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', padding: 10, gap: 3 }}>
        {t ? (
          <>
            <KV k="Transaction Date:" v={t.date} />
            <KV k="Type:" v={t.tran === 'B' ? 'B - Bill' : t.tran === 'P' ? 'P - Payment' : 'A - Adjustment'} />
            <KV k="Amount Billed:" v={t.tran === 'B' ? t.unit : '-'} />
            <KV k="Amount Paid:" v={t.tran === 'P' ? t.paid : '-'} />
            <KV k="Activity Date:" v={MOIS_TODAY} />
            <div style={{ paddingTop: 6 }}>Comment:</div>
            <textarea className="pb-field" rows={4} value={note} onChange={(e) => setNote(e.target.value)} data-tutorial-id="host.mois.field.transaction-note" />
            <div style={{ color: '#404040', paddingTop: 4 }}>Invoice created: {current.created || '(not yet saved)'}</div>
          </>
        ) : <div>This invoice has no transactions.</div>}
        <span style={{ flex: '1 1 auto' }} />
        <div className="pb-row" style={{ justifyContent: 'center', gap: 12 }}>
          <DialogButton id="transaction-note-save" isDefault disabled={!t} onClick={() => {
            if (t) patchCurrent((i) => ({ trans: i.trans.map((x) => (x.id === t.id ? { ...x, note } : x)) }))
            close()
          }}>Save</DialogButton>
          <DialogButton id="transaction-note-cancel" onClick={close}>Cancel</DialogButton>
        </div>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- Paste Sent MSP Claim -------------------------------------------------------- */

export function PasteMspClaimWindow({ close }: AreaWindowProps) {
  const { current, patchCurrent } = useInvoices()
  const sent = useSentClaims()
  const [cur, setCur] = useState(0)
  const rows = sent.rows
  const picked = rows[Math.min(cur, rows.length - 1)]
  const paste = () => {
    if (!picked) return
    const id = `m${picked.id}${current.trans.length}`
    patchCurrent((i) => ({
      claimNo: picked.id.replace('s', '18276'),
      trans: [...i.trans, { id, date: picked.service, tran: 'B', serv: '1', fee: picked.fee, unit: picked.billed, diag: picked.diag, method: '', paid: '', adj: '', adjAmt: '' }],
    }))
    /* R1 V — "Private invoice created for claim" (303602) */
    sent.patch([picked.id], { r1: 'V', privateFlag: true })
    close()
  }
  return (
    <WorkspaceDialogFrame id="paste-msp-claim" title="Claim Summary: Sent to MSP" width={760} height={420} controls={false} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 8, gap: 6 }}>
        <PBDataWindow
          style={{ flex: '1 1 auto', minHeight: 0 }}
          columns={[
            { key: 'service', header: 'Service', width: 80, align: 'center' },
            { key: 'last', header: 'Last Name', width: 110 },
            { key: 'first', header: 'First Name', width: 90 },
            { key: 'diag', header: 'Diag', width: 55 },
            { key: 'fee', header: 'Fee', width: 55 },
            { key: 'billed', header: 'Billed', width: 65, align: 'right' },
            { key: 'paid', header: 'Paid', width: 65, align: 'right' },
            { key: 'r1', header: 'R1', width: 28, align: 'center' },
            { key: 'r2', header: 'R2', width: 28, align: 'center' },
            { key: 'doctor', header: 'Doctor', width: 140 },
          ]}
          rows={rows}
          current={Math.min(cur, Math.max(0, rows.length - 1))}
          onCurrentChange={setCur}
          onActivate={paste}
          rowTutorialId={(r) => `host.mois.row.paste-claim-${r.last.toLowerCase()}`}
        />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flex: 'none' }}>
          <DialogButton id="paste-claim-select" isDefault disabled={!picked} onClick={paste}>Select</DialogButton>
          <DialogButton id="paste-claim-cancel" onClick={close}>Cancel</DialogButton>
        </div>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* --- a transaction's Fee Code "…" ------------------------------------------------ */

export function InvoiceFeeLookupWindow({ args, close }: AreaWindowProps) {
  const { patchCurrent } = useInvoices()
  const [cur, setCur] = useState(0)
  const picked = CLAIM_FEE_ROWS[cur]
  const pick = () => {
    if (!picked) return
    patchCurrent((i) => ({ trans: i.trans.map((t) => (t.id === args.trans ? { ...t, fee: picked.code, unit: picked.fee } : t)) }))
    close()
  }
  return (
    <WorkspaceDialogFrame id="invoice-fee-lookup" title="Advanced Lookup Service" width={560} height={420} controls={false} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 8, gap: 6 }}>
        <PBDataWindow
          style={{ flex: '1 1 auto', minHeight: 0 }}
          columns={[
            { key: 'code', header: 'Fee Code', width: 80 },
            { key: 'desc', header: 'Description', width: 330 },
            { key: 'fee', header: 'Amount', width: 80, align: 'right' },
          ]}
          rows={CLAIM_FEE_ROWS}
          current={cur}
          onCurrentChange={setCur}
          onActivate={pick}
          rowTutorialId={(r) => `host.mois.row.invoice-fee-${r.code}`}
        />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flex: 'none' }}>
          <DialogButton id="invoice-fee-select" isDefault onClick={pick}>Select</DialogButton>
          <DialogButton id="invoice-fee-cancel" onClick={close}>Cancel</DialogButton>
        </div>
      </div>
    </WorkspaceDialogFrame>
  )
}

export function registerInvoiceWindows() {
  registerAreaWindow('receipt-for-services', ReceiptForServicesWindow)
  registerAreaWindow('invoice-payor', PayorWindow)
  registerAreaWindow('invoice-tax-rates', TaxRatesWindow)
  registerAreaWindow('invoice-prompt', InvoicePromptWindow)
  registerAreaWindow('invoice-transaction-note', TransactionNoteWindow)
  registerAreaWindow('paste-msp-claim', PasteMspClaimWindow)
  registerAreaWindow('invoice-fee-lookup', InvoiceFeeLookupWindow)
}

registerInvoiceWindows()
