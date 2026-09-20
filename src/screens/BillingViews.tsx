import { useState } from 'react'
import { PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBLookup, PBSelect, PBViewHeader } from '../pb'

/* ============================================================================
   The three captured Billing views: Unsent MSP, Sent To MSP and Invoice.

   Transcribed from the MOIS help site:
     Unsent MSP   `unsent_claims1.PNG` (v02.20.02, 1:1) and the cloud
                  capture in article 303601, which adds Change Payee and
                  PBF Class. to the OTHER section.
     Sent To MSP  `unsent.PNG` (v02.17.34, 1:1) and `Screenshot_2026-03-16
                  _142613.png` (cloud v02.31.41).
     Invoice      `AgingReport_1_Parameters.png` — misfiled in the help site
                  under Reports, but the only unobstructed capture of the
                  Invoice header and its nine toolbar buttons — together with
                  `sent_invoice.png`, which shows the body under an open
                  Action menu.

   Field labels, section names and button order are the captures'. The claim
   and invoice values are synthetic training data, like the rest of this
   emulator.

   MOIS paints a required-but-empty field pink and an entered field yellow;
   the Sent view is read-only apart from Sequence No., which it paints the
   same salmon as a selected grid row.
   ========================================================================= */

/** A section rule: navy bold caption, hairline to the right margin. */
function Sect({ children }: { children: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '6px 0 3px' }}>
      <span style={{ color: '#000080', fontWeight: 700 }}>{children}</span>
      <span style={{ flex: '1 1 auto', height: 1, background: '#000080', opacity: 0.3 }} />
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="pb-row" style={{ gap: 6, padding: '1px 0', flex: 'none', alignItems: 'center' }}>{children}</div>
}

function L({ children, w = 92 }: { children: React.ReactNode; w?: number }) {
  return <span className="pb-form__label" style={{ width: w, flex: 'none' }}>{children}</span>
}

/** entered (yellow), required-and-empty (pink), or read-only (grey). */
const YELLOW = { background: '#ffffc8' }
const PINK = { background: '#ffc8c8' }
const GREY = { background: '#e8e8e8', color: '#404040' }
const SALMON = { background: '#e89c84' }

function Body({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '2px 8px 8px' }}>{children}</div>
  )
}

/* --- Unsent MSP ----------------------------------------------------------- */

export function UnsentMspView({ onPrompt }: { onPrompt?: (prompt: 'patient' | 'doctor') => void }) {
  return (
    <>
      <PBViewHeader title="Unsent MSP" />
      <PBCommandRow commands={[
        { label: 'New Claim' }, { label: 'Delete Claim' }, { label: 'Save' },
        { label: 'Prompt - Patient', onClick: () => onPrompt?.('patient') },
        { label: 'Prompt - Doctor', onClick: () => onPrompt?.('doctor') },
        { label: 'Close Window' },
      ]} />
      <Body>
        <Row>
          <L>Doctor:</L>
          <PBSelect w={220} options={['BEARDWOOD, WALTER', 'ADMIN, SYS [DR]']} style={YELLOW} />
          <L w={76}>Claim Status:</L>
          <PBSelect w={110} options={['Incomplete', 'Complete']} style={YELLOW} />
          <PBCheckbox label="Hold Claim" />
        </Row>

        <Sect>PATIENT:</Sect>
        <Row>
          <L>Chart:</L>
          <PBLookup w={110} name="chart" defaultValue="10035" />
          <L w={70}>First Name:</L>
          <PBInput w={140} defaultValue="FARMER" style={GREY} readOnly />
          <L w={70}>Last Name:</L>
          <PBInput w={160} defaultValue="BROWN" style={GREY} readOnly />
        </Row>

        <Sect>INSURER</Sect>
        <Row>
          <L>Insured By:</L>
          <PBInput w={44} defaultValue="BC" style={YELLOW} />
          <L w={80}>Insurance #:</L>
          <PBInput w={120} defaultValue="9151259051" style={YELLOW} />
          <L w={62}>Dep. No.:</L>
          <PBInput w={44} defaultValue="00" style={YELLOW} />
          <L w={40}>DoB:</L>
          <PBInput w={100} defaultValue="1990.10.23" style={GREY} readOnly />
          <span style={{ color: '#606060' }}>(read-only)</span>
        </Row>

        <Sect>SERVICE:</Sect>
        <Row>
          <L>Service Date:</L>
          <PBInput w={100} defaultValue="2026.03.18" style={YELLOW} />
          <L w={62}>Location:</L>
          <PBInput w={40} style={PINK} />
          <L w={104}>Service To Date:</L>
          <PBInput w={100} style={GREY} readOnly />
          <L w={72}>No. Service:</L>
          <PBInput w={40} align="right" defaultValue="1" style={YELLOW} />
        </Row>
        <Row>
          <L>Diag Code(s)</L>
          <span>1:</span><PBLookup w={92} name="diag-1" defaultValue="780" />
          <span>2:</span><PBInput w={66} />
          <span>3:</span><PBInput w={66} />
          <L w={54}>Fee Item:</L>
          <PBInput w={30} style={YELLOW} />
          <span>-</span>
          <PBInput w={76} defaultValue="13060" style={YELLOW} />
          <L w={84}>Unit Amount:</L>
          <PBInput w={80} align="right" defaultValue="71.50" style={YELLOW} />
        </Row>
        <Row>
          <L>Time(s)</L>
          <span>Received:</span><PBInput w={60} />
          <span>Start:</span><PBInput w={60} />
          <span>Finish:</span><PBInput w={60} />
          <L w={70}>Pay Mode:</L>
          <PBSelect w={100} options={['Normal', 'Alternate']} />
          <L w={104}>After-Hour Ind.:</L>
          <PBSelect w={90} options={['Normal', 'Night', 'Even', 'W/End']} />
        </Row>

        <Sect>REFER:</Sect>
        <Row>
          <L>Ref To/By:</L>
          <PBSelect w={70} options={['N/A', 'To', 'By']} />
          <PBSelect w={70} options={['N/A', 'To', 'By']} />
          <L w={76}>Pract. No.:</L>
          <PBInput w={90} />
        </Row>

        <Sect>OPTIONS:</Sect>
        <Row>
          <L>MVA:</L>
          <PBInput w={40} />
          <L w={66}>ICBC No.:</L>
          <PBInput w={110} />
          <L w={66}>Sub Code:</L>
          <PBInput w={40} />
          <L w={90}>Ext. Sub Cd:</L>
          <PBInput w={40} />
          <span style={{ color: '#606060' }}>(future use)</span>
        </Row>
        <Row>
          <L>Claim Note:</L>
          <PBInput w={300} />
          <L w={84}>MSP Note:</L>
          <PBInput w={240} />
        </Row>

        <Sect>WCB:</Sect>
        <Row>
          <L>WCB No.</L>
          <PBInput w={110} />
          <L w={84}>Area of Inj.:</L>
          <PBInput w={60} />
          <L w={102}>Nature of Inj.:</L>
          <PBInput w={60} />
          <L w={102}>Date of Injury:</L>
          <PBInput w={100} />
        </Row>

        <Sect>OTHER:</Sect>
        <Row>
          <L>Pract. No.:</L>
          <PBInput w={90} defaultValue="12345" style={YELLOW} />
          <L w={76}>Payee No.:</L>
          <PBInput w={90} defaultValue="00001" style={YELLOW} />
          <L w={86}>Facility No.:</L>
          <PBInput w={90} />
          <L w={90}>PBF Class.:</L>
          <PBInput w={60} defaultValue="FFS" style={GREY} readOnly />
          <PBCheckbox label="Change Payee" />
        </Row>
        <Row>
          <span style={{ color: '#404040' }}>Created:&nbsp;&nbsp;2026.03.18 15:38 ADMINISTRATOR</span>
        </Row>
      </Body>
    </>
  )
}

/* --- Sent To MSP ---------------------------------------------------------- */

export function SentMspView({ onPrompt }: { onPrompt?: (prompt: 'recon' | 'chart') => void }) {
  return (
    <>
      <PBViewHeader title="Sent To MSP" />
      <PBCommandRow commands={[
        { label: 'Resubmit Claim' }, { label: 'Debit Claim' }, { label: 'Duplicate Claim' },
        { label: 'Prompt - Recon', onClick: () => onPrompt?.('recon') },
        { label: 'Prompt - Chart', onClick: () => onPrompt?.('chart') },
        { label: 'Close Window' },
      ]} />
      <Body>
        <Row>
          <L>Doctor:</L>
          <PBInput w={220} defaultValue="BEARDWOOD, WALTER" style={GREY} readOnly />
          <span style={{ flex: '1 1 auto' }} />
          <L w={92}>Sequence No.:</L>
          <PBInput w={120} defaultValue="0000012345" style={SALMON} />
        </Row>

        <Sect>PATIENT:</Sect>
        <Row>
          <L>Chart:</L>
          <PBInput w={110} defaultValue="10035" style={GREY} readOnly />
          <L w={70}>First Name:</L>
          <PBInput w={140} defaultValue="FARMER" style={GREY} readOnly />
          <L w={70}>Last Name:</L>
          <PBInput w={160} defaultValue="BROWN" style={GREY} readOnly />
        </Row>

        <Sect>IDENTITY:</Sect>
        <Row>
          <L>Insured By:</L>
          <PBInput w={44} defaultValue="BC" style={GREY} readOnly />
          <L w={80}>Insurance #:</L>
          <PBInput w={120} defaultValue="9151259051" style={GREY} readOnly />
          <L w={40}>DoB:</L>
          <PBInput w={100} defaultValue="1990.10.23" style={GREY} readOnly />
        </Row>

        <Sect>RECON:</Sect>
        <Row>
          <L>Code:</L>
          <PBInput w={24} align="center" defaultValue="P" style={GREY} readOnly />
          <PBInput w={24} align="center" style={GREY} readOnly />
          <L w={54}>Billed:</L>
          <PBInput w={80} align="right" defaultValue="71.50" style={GREY} readOnly />
          <L w={72}>Write Off:</L>
          <PBInput w={24} align="center" defaultValue="N" style={GREY} readOnly />
          <L w={72}>Net Paid:</L>
          <PBInput w={80} align="right" defaultValue="71.50" style={GREY} readOnly />
        </Row>
        <Row>
          <L>Sent:</L>
          <PBInput w={100} defaultValue="2026.03.19" style={GREY} readOnly />
          <L w={48}>Paid:</L>
          <PBInput w={100} defaultValue="2026.04.02" style={GREY} readOnly />
          <L w={92}>Expl Code(s):</L>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <PBInput key={i} w={24} align="center" style={GREY} readOnly />
          ))}
        </Row>
        <Row>
          <L>Prev. Seq. No.:</L>
          <PBInput w={120} style={GREY} readOnly />
          <L w={104}>Next Seq No.:</L>
          <PBInput w={120} style={GREY} readOnly />
        </Row>

        <Sect>SERVICE:</Sect>
        <Row>
          <L>Service Date:</L>
          <PBInput w={100} defaultValue="2026.03.18" style={GREY} readOnly />
          <L w={62}>Location:</L>
          <PBInput w={40} defaultValue="A" style={GREY} readOnly />
          <L w={54}>Fee Item:</L>
          <PBInput w={80} defaultValue="13060" style={GREY} readOnly />
          <L w={72}>Diag. 1:</L>
          <PBInput w={80} defaultValue="780" style={GREY} readOnly />
        </Row>

        <Sect>OPTIONS:</Sect>
        <Row>
          <L>Referring 1:</L>
          <PBInput w={110} style={GREY} readOnly />
          <L w={92}>Referring 2:</L>
          <PBInput w={110} style={GREY} readOnly />
          <L w={128}>Office / MSP Note:</L>
          <PBInput w={200} style={GREY} readOnly />
        </Row>

        <Sect>OTHER:</Sect>
        <Row>
          <L>Pract. No.:</L>
          <PBInput w={90} defaultValue="12345" style={GREY} readOnly />
          <L w={76}>Payee No.:</L>
          <PBInput w={90} defaultValue="00001" style={GREY} readOnly />
          <L w={90}>PBF Class.:</L>
          <PBInput w={60} defaultValue="FFS" style={GREY} readOnly />
        </Row>
      </Body>
    </>
  )
}

/* --- Invoice -------------------------------------------------------------- */

type Trans = {
  date: string; tran: string; serv: string; fee: string; dots: string
  unit: string; diag: string; dots2: string; method: string
  paid: string; adj: string; adjAmt: string
}

const BILLED: Trans = {
  date: '2026.03.18', tran: 'B', serv: '1', fee: '13060', dots: '…',
  unit: '71.50', diag: '780', dots2: '…', method: '', paid: '', adj: '', adjAmt: '',
}

const PAYMENT: Trans = {
  date: '2026.03.18', tran: 'P', serv: '', fee: '', dots: '',
  unit: '', diag: '', dots2: '', method: 'Visa', paid: '71.50', adj: '', adjAmt: '',
}

/** Billed − Paid − Written Off − Adjustments = Balance / Owed (art. 303603). */
function money(n: number) { return n.toFixed(2) }

export function InvoiceView({ paid, onPaid }: { paid: boolean; onPaid: () => void }) {
  const [cur, setCur] = useState(0)
  const rows = paid ? [BILLED, PAYMENT] : [BILLED]
  const billed = 71.5
  const received = paid ? 71.5 : 0

  return (
    <>
      <PBViewHeader title="Invoice" />
      <PBCommandRow commands={[
        { label: 'New Invoice' }, { label: 'Delete Invoice' }, { label: 'Save' },
        { label: 'Statement' }, { label: 'Receipt' }, { label: 'Label' },
        { label: 'Add Payor' }, { label: 'Edit Payor' }, { label: 'Change Patient' },
      ]} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '2px 8px 6px' }}>
        <div className="pb-row" style={{ gap: 26, flex: 'none', padding: '2px 0' }}>
          <span>Chart:&nbsp; 75</span><span>Patient: BETTY BOOP</span>
          <span>DoB: 1961.11.19</span><span>Insurance by: BC</span><span>Phone: (250) 555-5555</span>
        </div>
        <div className="pb-row" style={{ gap: 26, flex: 'none', padding: '0 0 3px' }}>
          <span>Alias:</span><span>Gender: F</span><span>Insurance No.: 9151252098</span>
          <span>Work: (250) 555-1234</span>
        </div>

        <Row>
          <L w={70}>Invoice #:</L>
          <PBInput w={90} defaultValue="1042" style={GREY} readOnly />
          <L w={62}>Provider:</L>
          <PBSelect w={200} options={['BEARDWOOD, WALTER']} style={YELLOW} />
          <L w={50}>Payor:</L>
          <PBSelect w={140} options={['SELF PAY', 'RCMP', 'ICBC']} style={YELLOW} />
          <L w={84}>Recon Code:</L>
          <PBInput w={30} align="center" defaultValue="U" style={GREY} readOnly />
        </Row>
        <Row>
          <L w={70}>Bill Date:</L>
          <span>1:</span><PBInput w={90} defaultValue="0000.00.00" />
          <span>2:</span><PBInput w={90} />
          <span>3:</span><PBInput w={90} />
          <L w={66}>Claim No.:</L>
          <PBLookup w={120} name="claim-no" />
          <L w={72}>Write Off:</L>
          <PBInput w={30} align="center" defaultValue="N" style={GREY} readOnly />
        </Row>
        <Row>
          <L w={92}>No. Billings:</L>
          <PBInput w={40} align="right" defaultValue={String(rows.length)} style={GREY} readOnly />
          <L w={84}>Invoice Code:</L>
          <PBSelect w={140} options={['Standard', 'Third Party']} />
          <L w={60}>Taxable:</L>
          <PBCheckbox label="Apply Tax" />
          <L w={90}>Payment Due:</L>
          <PBInput w={100} defaultValue="2026.04.17" />
        </Row>

        {/* the pale-green summary band, y 315–381 in the capture */}
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
            <PBInput w={90} align="right" value={money(billed)} readOnly style={GREY} />
            <span>-</span>
            <PBInput w={90} align="right" value={money(received)} readOnly style={GREY} />
            <span>-</span>
            <PBInput w={90} align="right" value="0.00" readOnly style={GREY} />
            <span>-</span>
            <PBInput w={90} align="right" value="0.00" readOnly style={GREY} />
            <span>=</span>
            <PBInput
              w={110}
              align="right"
              value={money(billed - received)}
              readOnly
              style={GREY}
              data-tutorial-id="host.mois.field.balance-owed"
            />
          </div>
          <div className="pb-row" style={{ gap: 8, justifyContent: 'center', paddingTop: 2 }}>
            <span className="pb-form__label">Balance ALL Invoices for this patient:</span>
            <PBInput w={90} align="right" value={money(billed - received)} readOnly style={PINK} />
          </div>
        </div>

        <PBCommandRow commands={[
          { label: 'New Trans' }, { label: 'Delete Trans' },
          { label: 'Pay Balance', onClick: onPaid },
          { label: 'W/O Balance' }, { label: 'Paste MSP Claim' },
        ]} />
        <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, paddingTop: 3 }}>
          <PBDataWindow
            rows={rows}
            current={cur}
            onCurrentChange={setCur}
            rowTutorialId={(r) => `host.mois.row.trans-${r.tran.toLowerCase()}`}
            columns={[
              { key: 'date', header: 'Date', width: 83, align: 'center' },
              { key: 'tran', header: 'Tran Code', width: 44, align: 'center' },
              { key: 'serv', header: 'No. Serv', width: 60, align: 'center' },
              { key: 'fee', header: 'Fee Code', width: 74 },
              { key: 'dots', header: '', width: 16 },
              { key: 'unit', header: 'Unit Amount', width: 81, align: 'right' },
              { key: 'diag', header: 'Diag Code', width: 74 },
              { key: 'dots2', header: '', width: 16 },
              { key: 'method', header: 'Payment Method', width: 89 },
              { key: 'paid', header: 'Paid Amount', width: 81, align: 'right' },
              { key: 'adj', header: 'Adj Code', width: 65 },
              { key: 'adjAmt', header: 'Adjustment Amount', width: 81, align: 'right' },
            ]}
          />
        </div>
        <div className="pb-row" style={{ flex: 'none', padding: '2px 0', color: '#404040' }}>
          Created:&nbsp;&nbsp;2026.03.18 16:08 ADMINISTRATOR
        </div>
      </div>
    </>
  )
}
