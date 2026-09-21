import { useMemo, useState } from 'react'
import { PBBand, PBButton, PBCheckbox, PBDataWindow, PBInput, PBWindow, type PBColumn } from '../pb'
import { sentClaims, unsentClaims, type UnsentClaim } from '../data/claims'

/* ============================================================================
   The four claim lookups behind Billing's "Prompt -" buttons.

   Unsent MSP offers Prompt - Patient and Prompt - Doctor; the Action menu adds
   a service-date ordering of the same list. Sent To MSP offers Prompt - Chart
   (a per-patient summary) and Prompt - Recon (the full Advanced Lookup
   Service over sent claims).

   Transcribed from `prompt patient.PNG`, `prompt provider.PNG`,
   `prompt service date.PNG`, `prompt sent to msp.PNG` and
   `prompt sent by recon.PNG`. Column widths are the captures' own, measured
   1:1; the filter row sits over only the columns that had a box in the
   capture, which is why `Ins`, `Billed` and the explanatory codes have none.
   ========================================================================= */

export type ClaimPrompt = 'patient' | 'doctor' | 'service' | 'chart' | 'recon'

type Col = PBColumn<Record<string, string>> & { filter?: boolean }

/* --- Unsent: one column set, three orderings ------------------------------ */

const U: Record<string, Col> = {
  last: { key: 'last', header: 'Last Name', width: 117, filter: true },
  first: { key: 'first', header: 'First Name', width: 94, filter: true },
  service: { key: 'service', header: 'Service', width: 71, align: 'center' },
  doctor: { key: 'doctor', header: 'Doctor', width: 111, filter: true },
  fee: { key: 'fee', header: 'Fee Code', width: 63 },
  dob: { key: 'dob', header: 'DoB', width: 71, align: 'center' },
  insrBy: { key: 'insrBy', header: 'Insr By', width: 70, align: 'center' },
  insrNbr: { key: 'insrNbr', header: 'Insr Nbr', width: 81, align: 'center' },
  billed: { key: 'billed', header: 'Billed', width: 83, align: 'right' },
  compl: { key: 'compl', header: 'Compl', width: 40, align: 'center' },
  hold: { key: 'hold', header: 'Hold', width: 36, align: 'center' },
  sub: { key: 'sub', header: 'Sub', width: 31, align: 'center' },
}

/* the three orderings differ only in which columns come first */
const UNSENT_ORDER: Record<'patient' | 'doctor' | 'service', (keyof typeof U)[]> = {
  patient: ['last', 'first', 'service', 'doctor', 'fee', 'dob', 'insrBy', 'insrNbr', 'billed', 'compl', 'hold', 'sub'],
  doctor: ['doctor', 'service', 'last', 'first', 'dob', 'fee', 'insrBy', 'insrNbr', 'billed', 'compl', 'hold', 'sub'],
  service: ['service', 'last', 'first', 'doctor', 'fee', 'dob', 'insrBy', 'insrNbr', 'billed', 'compl', 'hold', 'sub'],
}

const SORT: Record<'patient' | 'doctor' | 'service', (a: UnsentClaim, b: UnsentClaim) => number> = {
  patient: (a, b) => a.last.localeCompare(b.last),
  doctor: (a, b) => a.doctor.localeCompare(b.doctor),
  service: (a, b) => b.service.localeCompare(a.service),
}

/* --- Sent: the per-chart summary ----------------------------------------- */

const CHART_COLUMNS: Col[] = [
  { key: 'service', header: 'Service', width: 68, align: 'center' },
  { key: 'diag', header: 'Diag', width: 57 },
  { key: 'fee', header: 'Fee', width: 52 },
  { key: 'ins', header: 'Ins', width: 30, align: 'center' },
  { key: 'billed', header: 'Billed', width: 65, align: 'right' },
  { key: 'paid', header: 'Paid', width: 65, align: 'right' },
  { key: 'doctor', header: 'Doctor', width: 91 },
  { key: 'sent', header: 'Sent', width: 81, align: 'center' },
  { key: 'r1', header: 'R1', width: 25, align: 'center' },
  { key: 'r2', header: 'R2', width: 25, align: 'center' },
  { key: 'wo', header: 'WO', width: 26, align: 'center' },
  { key: 'e1', header: 'E1', width: 22, align: 'center' },
  { key: 'e2', header: 'E2', width: 22, align: 'center' },
  { key: 'e3', header: 'E3', width: 22, align: 'center' },
  { key: 'ref', header: 'Ref', width: 32, align: 'center' },
  { key: 'pract', header: 'Pract No.', width: 68 },
]

/* --- Sent: the reconciliation-code lookup -------------------------------- */

const RECON_COLUMNS: Col[] = [
  { key: 'r1', header: 'R1', width: 25, align: 'center', filter: true },
  { key: 'r2', header: 'R2', width: 25, align: 'center', filter: true },
  { key: 'wo', header: 'WO', width: 26, align: 'center', filter: true },
  { key: 'service', header: 'Service', width: 69, align: 'center', filter: true },
  { key: 'diag', header: 'Diag', width: 57, filter: true },
  { key: 'fee', header: 'Fee', width: 52, filter: true },
  { key: 'ins', header: 'Ins', width: 30, align: 'center' },
  { key: 'billed', header: 'Billed', width: 65, align: 'right' },
  { key: 'paid', header: 'Paid', width: 65, align: 'right', filter: true },
  { key: 'last', header: 'Last Name', width: 116, filter: true },
  { key: 'first', header: 'First Name', width: 80, filter: true },
  { key: 'm', header: 'M', width: 22, align: 'center' },
  { key: 'doctor', header: 'Doctor', width: 91, filter: true },
  { key: 'payee', header: 'Payee No.', width: 68, filter: true },
  { key: 'e1', header: 'E1', width: 22, align: 'center' },
  { key: 'e2', header: 'E2', width: 22, align: 'center' },
  { key: 'e3', header: 'E3', width: 22, align: 'center' },
]

const RECON_HELP = `List by reconciliation code(s), sent date and internal id.
NOTE: The Check Box in the FILTER section is used to include (if checked) or exclude (not checked) the RECON CODE 1 from the filter.  Since a 'BLANK' value is a valid entry, MOIS needs to know when the user wants to search for ALL RECON CODE 1 values.  By unchecking this box, MOIS will search for ALL values of the RECON CODE 1.`

const TITLES: Record<ClaimPrompt, string> = {
  patient: 'MSP Unsent Claims - Ordered by Patient',
  doctor: 'MSP Unsent Claims - Ordered by Doctor',
  /* the application's own bug: the service-date ordering keeps the
     "Ordered by Patient" caption. Kept so the window matches the capture. */
  service: 'MSP Unsent Claims - Ordered by Patient',
  chart: 'Claim Summary: Sent to MSP',
  recon: 'Advanced Lookup Service',
}

const PAGE = 12

export function ClaimPromptDialog({
  prompt, onPick, onClose,
}: {
  prompt: ClaimPrompt
  onPick?: () => void
  onClose?: () => void
}) {
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [current, setCurrent] = useState(0)
  const [includeR1, setIncludeR1] = useState(true)

  const unsent = prompt === 'patient' || prompt === 'doctor' || prompt === 'service'
  const columns: Col[] = unsent
    ? UNSENT_ORDER[prompt].map((k) => U[k]!)
    : prompt === 'chart' ? CHART_COLUMNS : RECON_COLUMNS

  const rows = useMemo(() => {
    const source: Record<string, string>[] = unsent
      ? [...unsentClaims].sort(SORT[prompt as 'patient' | 'doctor' | 'service'])
      : (sentClaims as unknown as Record<string, string>[])
    const active = Object.entries(filters).filter(([, v]) => v.trim())
    if (!active.length) return source
    return source.filter((r) => active.every(([k, v]) => (r[k] ?? '').toLowerCase().includes(v.trim().toLowerCase())))
  }, [filters, prompt, unsent])

  const filterRow = columns.some((c) => c.filter)
    ? columns.map((c) => (c.filter
      ? (
        <PBInput
          key={c.key}
          value={filters[c.key] ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
        />
      )
      : null))
    : undefined

  const step = (delta: number) => setCurrent((i) => Math.max(0, Math.min(rows.length - 1, i + delta)))
  const picked = rows[current]

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <PBWindow
        /* the snapshot reports `claim-{prompt}`, so the anchor has to match */
        tutorialId={`host.mois.dialog.claim-${prompt}`}
        child
        controls={false}
        title={TITLES[prompt]}
        onClose={onClose}
        style={{
          width: prompt === 'chart' ? 'min(860px, calc(100vw - 60px))' : 'min(980px, calc(100vw - 60px))',
          height: 'min(620px, calc(100vh - 80px))',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 8, gap: 6 }}>
          {prompt === 'chart' && (
            <div className="pb-row" style={{ gap: 26, flex: 'none' }}>
              <span>Chart: 10035</span><span>Patient: FARMER BROWN</span>
              <span>DoB: 1990.10.23</span><span>Sex:</span><span>Insurance: 9151259051</span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid var(--pb-border)' }}>
            <div className="pb-band--ruled">
              <PBBand>
                {unsent ? 'Unsent MSP Claims'
                  : prompt === 'chart' ? 'Claims Sent to MSP for the following Chart'
                    : 'MSP Sent Claim List'}
              </PBBand>
            </div>
            {prompt === 'recon' && (
              <div className="pb-row" style={{ gap: 6, padding: '2px 5px', flex: 'none' }}>
                <PBCheckbox label="Include RECON CODE 1 in the filter" checked={includeR1} onChange={setIncludeR1} />
              </div>
            )}
            <PBDataWindow
              flush
              rules="white"
              style={{ flex: '1 1 auto', minHeight: 0 }}
              columns={columns}
              rows={rows}
              filters={filterRow}
              current={Math.min(current, Math.max(0, rows.length - 1))}
              onCurrentChange={setCurrent}
              onActivate={() => onPick?.()}
              rowTutorialId={(r) => `host.mois.row.claim-${(r.last ?? '').toLowerCase() || 'row'}`}
              empty="No claim matches those filters."
            />
          </div>

          {prompt === 'recon' && (
            <div
              className="pb-field"
              style={{ height: 74, flex: 'none', padding: '3px 5px', whiteSpace: 'pre-wrap', background: '#fff', overflow: 'auto' }}
            >
              {RECON_HELP}
            </div>
          )}

          {/* the unsent prompts and the per-chart summary have one Select
              button; only the Advanced Lookup Service carries the six-button
              paging row */}
          {prompt === 'recon' ? (
            <div style={{ display: 'flex', alignItems: 'center', flex: 'none' }}>
              <PBButton wide onClick={() => setCurrent(0)}>Home</PBButton>
              <PBButton wide onClick={() => step(-PAGE)}>PgUp</PBButton>
              <span style={{ flex: '1 1 auto' }} />
              <PBButton wide className="pb-btn--default" disabled={!picked} onClick={() => onPick?.()}>Ok</PBButton>
              <span style={{ width: 14 }} />
              <PBButton wide onClick={onClose}>Cancel</PBButton>
              <span style={{ flex: '1 1 auto' }} />
              <PBButton wide onClick={() => step(PAGE)}>PgDwn</PBButton>
              <PBButton wide onClick={() => setCurrent(rows.length - 1)}>End</PBButton>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', flex: 'none' }}>
              <PBButton wide className="pb-btn--default" disabled={!picked} onClick={() => onPick?.()}>Select</PBButton>
            </div>
          )}
        </div>
      </PBWindow>
    </div>
  )
}
