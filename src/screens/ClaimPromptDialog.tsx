import { useMemo, useState } from 'react'
import { PBBand, PBButton, PBCheckbox, PBDataWindow, PBInput, PBWindow, usePBInstrumentation, type PBColumn } from '../pb'
import {
  claimFromRow, sentClaims, unsentClaims, SENT_CLAIM_KEY, UNSENT_ADDED_KEY, UNSENT_CLAIM_KEY,
  type ClaimForm, type SentClaim, type UnsentClaim,
} from '../data/claims'
import { useSessionState } from '../host/screen-windows'
import { useScreenReport } from '../host/screen-state'

/* ============================================================================
   The four claim lookups behind Billing's "Prompt -" buttons.

   Unsent MSP offers Prompt - Patient and Prompt - Doctor; its Action menu
   adds a service-date ordering of the same list and Prompt Sent to MSP (the
   per-chart summary). Sent To MSP offers Prompt - Chart (that summary) and
   Prompt - Recon (the full Advanced Lookup Service over sent claims).

   Transcribed from `prompt patient.PNG` (303601 `0dc50190`), `prompt
   provider.PNG` (`28562098`), `prompt service date.PNG` (`41ab0bf4`, and the
   cloud build's `ca83fd70`, which adds the Fee Code filter and "Service Date
   from … to"), `prompt sent to msp.PNG` (`1f433175`) and `prompt sent by
   recon.PNG` (303602 `f2fa600c`, `cc1d8b11`). Column widths are the
   captures' own, measured 1:1; the filter row sits over only the columns that
   had a box in the capture, which is why `Ins`, `Billed` and the explanatory
   codes have none.

   · The unsent lists carry one button, Select, bottom centre — no Cancel in
     any capture; the title-bar × closes them.
   · Compl and Hold are checkboxes, Sub a code (303601).
   · The Advanced Lookup Service's unlabelled checkbox sits in the filter
     row's gutter, left of the R1 box: ticked, R1 is part of the filter (a
     blank R1 box then means "R1 is blank"); unticked, every R1 value
     matches (303602 "Hint", `cc1d8b11` / `a00e4760`). It pages with Home /
     PgUp / Ok / Cancel / PgDwn / End.
   · "Click on the blue column headers to re-sort" is 303601/303602's note on
     the per-chart summary, so only that list sorts.
   ========================================================================= */

export type ClaimPrompt = 'patient' | 'doctor' | 'service' | 'chart' | 'recon'

type Row = Record<string, unknown>
type Col = PBColumn<Row> & { filter?: boolean }

const tick = (key: 'compl' | 'hold') => (r: Row) => (
  <span style={{ display: 'inline-flex', pointerEvents: 'none' }}><PBCheckbox checked={!!r[key]} /></span>
)

/* --- Unsent: one column set, three orderings ------------------------------ */

const U: Record<string, Col> = {
  last: { key: 'last', header: 'Last Name', width: 117, filter: true },
  first: { key: 'first', header: 'First Name', width: 94, filter: true },
  service: { key: 'service', header: 'Service', width: 71, align: 'center' },
  doctor: { key: 'doctor', header: 'Doctor', width: 111, filter: true },
  fee: { key: 'fee', header: 'Fee Code', width: 63, filter: true },
  dob: { key: 'dob', header: 'DoB', width: 71, align: 'center' },
  insrBy: { key: 'insrBy', header: 'Insr By', width: 70, align: 'center' },
  insrNbr: { key: 'insrNbr', header: 'Insr Nbr', width: 81, align: 'center' },
  billed: { key: 'billed', header: 'Billed', width: 83, align: 'right' },
  compl: { key: 'compl', header: 'Compl', width: 40, align: 'center', render: tick('compl') },
  hold: { key: 'hold', header: 'Hold', width: 36, align: 'center', render: tick('hold') },
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
  /* "sorted chronologically by service date (oldest to newest)" — 303601 */
  service: (a, b) => a.service.localeCompare(b.service),
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
  /* the v02.20 build's own bug: the service-date ordering keeps the
     "Ordered by Patient" caption (`41ab0bf4`); the cloud build fixed it
     (`ca83fd70`). Kept so the window matches the older capture. */
  service: 'MSP Unsent Claims - Ordered by Patient',
  chart: 'Claim Summary: Sent to MSP',
  recon: 'Advanced Lookup Service',
}

const PAGE = 12

/** A dialog push button that reports itself as `host.mois.command.{id}`. */
function CmdButton({ id, children, onClick, disabled, isDefault }: {
  id: string; children: string; onClick?: () => void; disabled?: boolean; isDefault?: boolean
}) {
  const host = usePBInstrumentation()
  return (
    <PBButton
      wide
      className={isDefault ? 'pb-btn--default' : undefined}
      disabled={disabled}
      data-tutorial-id={host?.anchor('command', id)}
      onClick={() => { host?.report('command', { command: id }); onClick?.() }}
    >
      {children}
    </PBButton>
  )
}

export function ClaimPromptDialog({
  prompt, onPick, onClose,
}: {
  prompt: ClaimPrompt
  onPick?: () => void
  onClose?: () => void
}) {
  /* what is typed in the filter boxes, and what the list is filtered by.
     303602 says "Enter R or F in the filter above the R2 column. Press
     Enter"; the stage filters as you type as well, so a box never looks
     applied when it is not. Once any box is used, the Advanced Lookup
     Service's R1 rule applies (blank R1 box + ticked checkbox = blank R1). */
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [filters, setFilters] = useState<Record<string, string> | null>(null)
  const [current, setCurrent] = useState(0)
  const [includeR1, setIncludeR1] = useState(true)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [, setClaim] = useSessionState<ClaimForm | null>(UNSENT_CLAIM_KEY, null)
  const [, setSentClaim] = useSessionState<SentClaim | null>(SENT_CLAIM_KEY, null)
  const [added] = useSessionState<UnsentClaim[]>(UNSENT_ADDED_KEY, [])

  const unsent = prompt === 'patient' || prompt === 'doctor' || prompt === 'service'
  const columns: Col[] = unsent
    ? UNSENT_ORDER[prompt].map((k) => U[k]!)
    : prompt === 'chart' ? CHART_COLUMNS : RECON_COLUMNS

  const rows = useMemo(() => {
    let source: Row[] = unsent
      ? [...unsentClaims, ...added].sort(SORT[prompt as 'patient' | 'doctor' | 'service'])
      : (sentClaims as unknown as Row[])
    if (sortKey) source = [...source].sort((a, b) => String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? '')))
    if (!filters) return source
    const active = Object.entries(filters).filter(([k, v]) => v.trim() || (k === 'r1' && prompt === 'recon'))
    return source.filter((r) => active.every(([k, v]) => {
      const want = v.trim().toLowerCase()
      if (k === 'date-from') return String(r.service ?? '') >= v.trim()
      if (k === 'date-to') return String(r.service ?? '') <= v.trim()
      /* the recon lookup's R1 box: with the gutter checkbox ticked it is
         part of the filter, blank included; unticked, it matches anything */
      if (k === 'r1' && prompt === 'recon') return includeR1 ? String(r.r1 ?? '').toLowerCase() === want : true
      return String(r[k] ?? '').toLowerCase().includes(want)
    }))
  }, [added, filters, includeR1, prompt, sortKey, unsent])

  useScreenReport({ rows: rows.length, row: `claim-${String(rows[Math.min(current, Math.max(0, rows.length - 1))]?.last ?? '').toLowerCase()}` })

  const type = (key: string, value: string) => {
    const next = { ...draft, [key]: value }
    setDraft(next)
    setFilters(prompt === 'recon' ? { r1: '', ...next } : next)
  }
  const commit = () => setFilters(prompt === 'recon' ? { r1: '', ...draft } : draft)

  const filterRow = columns.some((c) => c.filter)
    ? columns.map((c) => (c.filter
      ? (
        <PBInput
          key={c.key}
          value={draft[c.key] ?? ''}
          onChange={(e) => type(c.key, e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit() }}
          data-tutorial-id={`host.mois.field.claim-filter-${c.key.toLowerCase()}`}
        />
      )
      : null))
    : undefined

  const step = (delta: number) => setCurrent((i) => Math.max(0, Math.min(rows.length - 1, i + delta)))
  const cur = Math.min(current, Math.max(0, rows.length - 1))
  const picked = rows[cur]

  const pick = () => {
    if (!picked) return
    /* an unsent claim is loaded into the window behind */
    if (unsent) setClaim(claimFromRow(picked as unknown as UnsentClaim))
    /* …and a sent one into Sent To MSP (303501: "Scroll down to select the
       person/claim … then press Enter or press the OK button"), where its
       Expl Code(s) and Ctrl+E's Sent Claim Detail read it */
    else setSentClaim(picked as unknown as SentClaim)
    onPick?.()
  }

  const bandCaption = unsent ? 'Unsent MSP Claims'
    : prompt === 'chart' ? 'Claims Sent to MSP for the following Chart'
      : 'MSP Sent Claim List'

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
              <PBBand
                right={prompt === 'service' ? (
                  /* ca83fd70: "Service Date from [ ] to [ ]" at the band's right */
                  <span className="pb-row" style={{ gap: 6, fontWeight: 400 }}>
                    <span>Service Date from</span>
                    <PBInput w={100} value={draft['date-from'] ?? ''} onChange={(e) => type('date-from', e.target.value)} />
                    <span>to</span>
                    <PBInput w={100} value={draft['date-to'] ?? ''} onChange={(e) => type('date-to', e.target.value)} />
                  </span>
                ) : undefined}
              >
                {bandCaption}
              </PBBand>
            </div>
            <PBDataWindow
              flush
              rules="white"
              style={{ flex: '1 1 auto', minHeight: 0 }}
              columns={columns}
              rows={rows}
              filters={filterRow}
              filterGutter={prompt === 'recon' ? (
                <span style={{ display: 'inline-flex', transform: 'translateX(-1px)' }}>
                  <PBCheckbox checked={includeR1} onChange={setIncludeR1} tutorialId="host.mois.check.claim-include-r1" />
                </span>
              ) : undefined}
              onSort={prompt === 'chart' ? (key) => setSortKey(key) : undefined}
              current={cur}
              onCurrentChange={setCurrent}
              onActivate={pick}
              rowTutorialId={(r) => `host.mois.row.claim-${String(r.last ?? '').toLowerCase() || 'row'}`}
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
              <CmdButton id="claim-ok" isDefault disabled={!picked} onClick={pick}>Ok</CmdButton>
              <span style={{ width: 14 }} />
              <CmdButton id="claim-cancel" onClick={onClose}>Cancel</CmdButton>
              <span style={{ flex: '1 1 auto' }} />
              <PBButton wide onClick={() => step(PAGE)}>PgDwn</PBButton>
              <PBButton wide onClick={() => setCurrent(rows.length - 1)}>End</PBButton>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', flex: 'none' }}>
              <CmdButton id="claim-select" isDefault disabled={!picked} onClick={pick}>Select</CmdButton>
            </div>
          )}
        </div>
      </PBWindow>
    </div>
  )
}
