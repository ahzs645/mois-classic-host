import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { useChartExport } from '../data/chart-records'
import type { MoisRecord } from '../data/charts'
import { usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { PBBand, PBButton, PBCheckbox, PBDataWindow, PBInput, PBRadio, PBSelect, PBTextArea, pbSlug } from '../pb'
import { STAGE_USER, useMedRows, useMedSession, type Med } from './medication-model'
import { MED_WINDOWS } from './MedicationWindows'
import { CurrentPatientBlock, FooterButton, StageWindow } from './StageWindow'

/* ============================================================================
   Printing a prescription, window by window, in the order the current build
   raises them.

   PROVENANCE — user capture 2026-09-25 #36–#47 (v02.31.23), which outrank the
   manual's v02.1x–v02.27 captures (303229, 303227) wherever they differ:

     Print Rx (#36)  or  Renew ▸ Renew / Print (F2) (#45)
       → Pharmacokinetics and Allergies / Adverse Reactions for Current
         Patient (#37), read-only, Close
       → Select Medications to Print (#38, #39): tick the Rx rows, the
         pharmacy, Print Height / Weight / GFR; Printer / Fax "Change..."
         opens Select Printer (#41) over it
       → Print (F2) · Sign and Print · Sign and Fax · Sign and Task
       → Drug Interaction Results (#43) when the ticked drugs interact —
         between themselves, with the Long Term Medication list, or with a
         recorded adverse reaction — Print Anyway / Cancel Print
       → the signing routes: Please Sign (#44, #46 from LTM), Accept
       → Sign and Task: Create New Task (#47) with "PLEASE SEND PRESCRIPTION"
         linked to the prescription log record.

   The windows here are drawn by MedicationView, which owns the rows and the
   one screen-window slot; Select Printer is a child of Select Medications to
   Print (#41 shows both up at once) so it lives inside that window.
   ========================================================================= */

/** Which button on Select Medications to Print started the print. */
export type PrintMode = 'print' | 'sign-print' | 'sign-fax' | 'sign-task'

/** What Select Medications to Print hands on down the chain. */
export type PrintJob = {
  mode: PrintMode
  /** the ticked prescriptions, by Med id */
  include: string[]
  /** the Pharmacy / Other Recipient Include tick */
  pharmacy: boolean
  printer: string
  fax: string
}

export function isPrintJob(v: unknown): v is PrintJob {
  return !!v && typeof v === 'object' && Array.isArray((v as PrintJob).include) && typeof (v as PrintJob).mode === 'string'
}

const nowTime = () => new Date().toTimeString().slice(0, 5)

/** File a print (or a signed print / fax) in the session: Last Printed on
    each row, and a Print History entry. */
export function useFilePrint() {
  const rows = useMedRows('rx')
  const [, update] = useMedSession()
  return (job: PrintJob, signed: boolean) => {
    const picked = rows.filter((m) => job.include.includes(m.id))
    if (!picked.length) return
    const when = `${MOIS_TODAY}  ${nowTime()}`
    update((s) => ({
      ...s,
      printed: { ...s.printed, ...Object.fromEntries(picked.map((m) => [m.id, when])) },
      printLog: [{
        date: when, by: STAGE_USER, station: 'MOIS-STAGE', items: picked, version: 'Original',
        signed, method: job.mode === 'sign-fax' ? 'FAX' : 'PRINT',
      }, ...s.printLog],
    }))
  }
}

/* --- Pharmacokinetics and Allergies / Adverse Reactions for Current Patient -
   user capture 2026-09-25 #37 (v02.31.23): about 1090×790, over nearly the
   whole frame. A "Current Patient" band (Chart · Patient · DoB · Sex · BC
   Health No.), then two panes side by side: "Most Recent Measures" — HEIGHT,
   WEIGHT and GFR, each with its value and date (or "No record"), on
   alternating rows with no column headers and a heavy black rule under the
   last — and "Allergies / Adverse Reactions", a Substance · Reactions grid
   whose rows wrap. One Close, centred. Read-only; Esc closes it too (303229
   "Close or press ESC to continue").

   The measures are the chart's latest HEIGHT (1948), WEIGHT (22732) and GFR
   (27540); the allergies its Reaction Risks. */
const PK_MEASURES: { label: string; match: (code: string, name: string) => boolean }[] = [
  { label: 'HEIGHT', match: (code, name) => code === '1948' || name === 'HEIGHT' },
  { label: 'WEIGHT', match: (code, name) => code === '22732' || name === 'WEIGHT' },
  { label: 'GFR', match: (code, name) => code === '27540' || /\bGFR\b/.test(name) },
]

export function PharmacokineticsAllergiesWindow({ onClose }: { onClose: () => void }) {
  const data = useChartExport()
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  const measures = PK_MEASURES.map(({ label, match }) => {
    const latest = (data?.measure ?? [])
      .filter((m) => match(m.str_code ?? '', (m.str_description ?? '').toUpperCase()))
      .sort((a, b) => (b.dtm_collect_date ?? '').localeCompare(a.dtm_collect_date ?? ''))[0]
    return {
      measure: label,
      value: latest?.str_value ? `${latest.str_value} ${latest.str_units ?? ''}`.trim() : 'No record',
      collected: (latest?.dtm_collect_date ?? '').split(' ')[0]!.replace(/\//g, '.'),
    }
  })
  const allergies = (data?.allergy ?? []).map((a) => ({
    substance: a.str_substance ?? '',
    reactions: a.str_reactions ?? a.str_reaction ?? '',
  }))
  return (
    <StageWindow id={MED_WINDOWS.allergyWarning} title="Pharmacokinetics and Allergies / Adverse Reactions for Current Patient" width={1090} height={790} onClose={onClose}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={onClose} tutorialId="host.mois.command.pharmacokinetics-close">Close</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <CurrentPatientBlock healthNo />
      <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, margin: '0 6px 6px', border: '1px solid var(--pb-border)', background: '#fff' }}>
        <div data-tutorial-id="host.mois.group.pharmacokinetics" style={{ width: 370, flex: 'none', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--pb-border)' }}>
          <PBBand>Most Recent Measures</PBBand>
          <div style={{ borderBottom: '4px solid #000' }}>
            {measures.map((m, i) => (
              <div key={m.measure} className="pb-row" style={{ gap: 0, height: 30, padding: '0 6px', background: i % 2 ? '#d7d7d7' : '#fff' }}>
                <span style={{ width: 134 }}>{m.measure}</span>
                <span style={{ width: 130 }}>{m.value}</span>
                <span>{m.collected}</span>
              </div>
            ))}
          </div>
        </div>
        <div data-tutorial-id="host.mois.group.allergies" style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <PBBand>Allergies / Adverse Reactions</PBBand>
          <PBDataWindow
            flush wrap gutter={false} zebra={false}
            style={{ flex: '1 1 auto', minHeight: 0 }}
            rows={allergies}
            current={-1}
            columns={[
              { key: 'substance', header: 'Substance', width: 310 },
              { key: 'reactions', header: 'Reactions' },
            ]}
            empty="No allergies or adverse reactions recorded for this patient."
          />
        </div>
      </div>
    </StageWindow>
  )
}

/* --- Drug interactions -----------------------------------------------------
   #43 lists each interacting pair as "⊞ drugA  and  drugB" under a band per
   severity — Major (pink), Moderate (orange) — and counts them per kind on
   the Show: radios (All / Drug-Drug / Drug-Adverse Reaction). The scope line
   says what is checked: "drugs on this Prescription between themselves and
   with the Long Term Medication list", plus the patient's adverse reactions.

   The real list comes from a licensed drug-interaction database the stage
   does not have, and its monographs are not reproduced. DRUG_PAIRS is a
   short, stage-made sample of well-known interactions between generic
   names; the note under each pair is written for the stage. A drug-adverse
   pair is a prescription that meets one of the chart's recorded reaction
   risks (a penicillin allergy meets every penicillin, ATC J01C). */
export type InteractionSeverity = 'Major' | 'Moderate' | 'Minor'
export type Interaction = { kind: 'drug-drug' | 'drug-adverse'; severity: InteractionSeverity; a: string; b: string; text: string }

const DRUG_PAIRS: { a: string; b: string; severity: InteractionSeverity; note: string }[] = [
  { a: 'morphine', b: 'lorazepam', severity: 'Major', note: 'An opioid with a benzodiazepine deepens sedation and respiratory depression.' },
  { a: 'codeine', b: 'lorazepam', severity: 'Major', note: 'An opioid with a benzodiazepine deepens sedation and respiratory depression.' },
  { a: 'morphine', b: 'codeine', severity: 'Major', note: 'Two opioids together add their sedation and respiratory depression.' },
  { a: 'morphine', b: 'ipratropium', severity: 'Moderate', note: 'An anticholinergic adds to the constipation and urinary retention an opioid causes.' },
  { a: 'codeine', b: 'ipratropium', severity: 'Moderate', note: 'An anticholinergic adds to the constipation and urinary retention an opioid causes.' },
  { a: 'rosuvastatin', b: 'atazanavir', severity: 'Major', note: 'Atazanavir raises rosuvastatin levels and with them the risk of myopathy.' },
  { a: 'amoxicillin', b: 'methotrexate', severity: 'Moderate', note: 'Penicillins can slow methotrexate clearance and raise its toxicity.' },
]

/** The generic's first word, lower case: "MORPHINE HYDROCHLORIDE 1MG SYRUP" → "morphine". */
const baseName = (m: Med) => ((m.generic || m.med).split(/[\s(]/)[0] ?? '').toLowerCase()
/** An LTM row and the prescription it reads are one record on this stage. */
const recordId = (m: Med) => m.id.replace(/^ltm-/, '')

export function findInteractions(onScript: Med[], longTerm: Med[], allergies: MoisRecord[]): Interaction[] {
  const out: Interaction[] = []
  const seen = new Set<string>()
  const others = [...onScript, ...longTerm.filter((m) => !m.end)]
  for (const m of onScript) {
    const a = baseName(m)
    if (!a) continue
    for (const o of others) {
      const b = baseName(o)
      if (!b || b === a || recordId(o) === recordId(m)) continue
      const pair = DRUG_PAIRS.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a))
      if (!pair) continue
      const key = [recordId(m), recordId(o)].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ kind: 'drug-drug', severity: pair.severity, a, b, text: pair.note })
    }
    for (const allergy of allergies) {
      const substance = (allergy.str_substance ?? '').toUpperCase()
      if (!substance) continue
      const hit = m.med.toUpperCase().includes(substance) || m.generic.toUpperCase().includes(substance)
        || (substance.includes('PENICILLIN') && m.atc.startsWith('J01C'))
      if (!hit) continue
      out.push({
        kind: 'drug-adverse',
        severity: /SEVERE|LIFE/i.test(allergy.str_severity ?? '') ? 'Major' : 'Moderate',
        a,
        b: substance.toLowerCase(),
        text: `${m.generic || m.med} meets the recorded ${String(allergy.str_intolerance_type ?? 'reaction risk').toLowerCase()} to ${substance} `
          + `(${allergy.str_reactions ?? allergy.str_reaction ?? 'reaction not recorded'}; ${String(allergy.str_severity ?? 'severity not recorded').toLowerCase()}).`,
      })
    }
  }
  return out
}

/* --- Drug Interaction Results ----------------------------------------------
   user capture 2026-09-25 #43 (v02.31.23), about 930×830: Current Patient
   (BC Health No.), then the bold "Interactions" and "Show:" radios ◉ All (n)
   · ○ Drug-Drug (n) · ○ Drug-Adverse Reaction (n) spread across the row, the
   grey scope line under them, and a white list of severity bands —
   "⊟ Major Drug Interaction ( n )" on pink, "⊟ Moderate Drug Interaction
   ( n )" on orange — each pair "⊞ a  and  b" on its own ruled row. Print
   Anyway · Cancel Print. The band colours are sampled off the capture. */
const BAND_FILL: Record<InteractionSeverity, string> = { Major: '#ea8d9c', Moderate: '#e3894d', Minor: '#f2d27c' }

export function DrugInteractionWindow({ found, onPrint, onClose }: { found: Interaction[]; onPrint: () => void; onClose: () => void }) {
  const [show, setShow] = useState<'all' | 'drug-drug' | 'drug-adverse'>('all')
  const [shut, setShut] = useState<Set<string>>(new Set())
  const [openRows, setOpenRows] = useState<Set<number>>(new Set())
  const shown = found.filter((f) => show === 'all' || f.kind === show)
  const count = (k: Interaction['kind']) => found.filter((f) => f.kind === k).length
  const bands: { key: string; title: string; fill: string; rows: Interaction[] }[] = [
    ...(['Major', 'Moderate', 'Minor'] as const).map((sev) => ({
      key: `dd-${sev}`, title: `${sev} Drug Interaction`, fill: BAND_FILL[sev], rows: shown.filter((f) => f.kind === 'drug-drug' && f.severity === sev),
    })),
    { key: 'da', title: 'Drug-Adverse Reaction', fill: BAND_FILL.Major, rows: shown.filter((f) => f.kind === 'drug-adverse') },
  ].filter((b) => b.rows.length)
  const box = (open: boolean) => (
    <span style={{ display: 'inline-block', width: 9, height: 9, border: '1px solid #808080', background: '#fff', fontSize: 9, lineHeight: '8px', textAlign: 'center', marginRight: 8, verticalAlign: 'middle' }}>
      {open ? '−' : '+'}
    </span>
  )
  return (
    <StageWindow id={MED_WINDOWS.interaction} title="Drug Interaction Results" width={930} height={830} onClose={onClose}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary onClick={onPrint} tutorialId="host.mois.command.print-anyway">Print Anyway</FooterButton>
        <FooterButton onClick={onClose} tutorialId="host.mois.command.cancel-print">Cancel Print</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <CurrentPatientBlock healthNo />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: '0 6px 6px', background: '#fff', border: '1px solid var(--pb-border)' }}>
        <div style={{ padding: '6px 8px 4px', flex: 'none' }}>
          <div className="pb-row" style={{ gap: 12 }}>
            <b>Interactions</b><span>Show:</span>
            <PBRadio name="ix" tutorialId="host.mois.field.interactions-all" label={`All (${found.length})`} checked={show === 'all'} onChange={() => setShow('all')} />
            <span style={{ flex: '1 1 auto' }} />
            <PBRadio name="ix" tutorialId="host.mois.field.interactions-drug-drug" label={`Drug-Drug (${count('drug-drug')})`} checked={show === 'drug-drug'} onChange={() => setShow('drug-drug')} />
            <span style={{ flex: '1 1 auto' }} />
            <PBRadio name="ix" tutorialId="host.mois.field.interactions-drug-adverse" label={`Drug-Adverse Reaction (${count('drug-adverse')})`} checked={show === 'drug-adverse'} onChange={() => setShow('drug-adverse')} />
            <span style={{ flex: '1 1 auto' }} />
          </div>
          <div style={{ color: '#6d6d6d', textAlign: 'center', paddingTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip' }}>
            Showing interactions, including Adverse Reactions, for drugs on this Prescription between themselves and with the Long Term Medication list.
          </div>
        </div>
        <div data-tutorial-id="host.mois.group.interactions" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
          {bands.length === 0 ? <div className="pb-dw__empty">No interactions found.</div> : bands.map((band) => {
            const open = !shut.has(band.key)
            return (
              <div key={band.key}>
                <div
                  role="button" tabIndex={0} aria-expanded={open}
                  style={{ background: band.fill, padding: '2px 6px 2px 14px', fontWeight: 700, cursor: 'default' }}
                  onClick={() => setShut((s) => { const n = new Set(s); open ? n.add(band.key) : n.delete(band.key); return n })}
                >
                  {box(open)}{band.title} ( {band.rows.length} )
                </div>
                {open && band.rows.map((f) => {
                  const i = found.indexOf(f)
                  const expanded = openRows.has(i)
                  return (
                    <div key={i} style={{ borderBottom: '1px solid #e2e2e2', padding: '6px 10px 6px 32px' }}>
                      <div role="button" tabIndex={0} aria-expanded={expanded} style={{ cursor: 'default' }}
                        onClick={() => setOpenRows((s) => { const n = new Set(s); expanded ? n.delete(i) : n.add(i); return n })}>
                        {box(expanded)}<b>{f.a}</b>&nbsp;&nbsp; and &nbsp;&nbsp;<b>{f.b}</b>
                      </div>
                      {expanded && <div style={{ background: '#d4ebf8', margin: '4px 0 0 17px', padding: '4px 6px' }}>{f.text}</div>}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </StageWindow>
  )
}

/* --- Select Printer ----------------------------------------------------------
   user capture 2026-09-25 #41 (v02.31.23): about 620×660, over Select
   Medications to Print when a Printer or Fax "Change..." is pressed. One
   "Printer Name" column, the first row current; "Set as default" bottom
   left, Select Printer · Cancel bottom right. The workstation's own queues
   in the capture are replaced by generic Windows ones. */
const PRINTERS = [
  'Client/MOIS-STAGE#/OneNote (Desktop)',
  'Client/MOIS-STAGE#/Prescription Printer',
  'Microsoft Print to PDF',
  'Microsoft XPS Document Writer',
  'OneNote (Desktop)',
  'XM Fax',
].map((name) => ({ name }))

function SelectPrinterWindow({ onPick, onClose }: { onPick: (printer: string) => void; onClose: () => void }) {
  const [cur, setCur] = useState(0)
  return (
    <StageWindow id="select-printer" title="Select Printer" width={620} height={660} onClose={onClose} bodyStyle={{ padding: '10px 10px 6px' }}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', border: '1px solid var(--pb-border)', background: '#fff' }}>
        <PBDataWindow
          flush style={{ flex: '1 1 auto', minHeight: 0 }}
          rows={PRINTERS}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(r) => onPick(r.name)}
          rowTutorialId={(r) => `host.mois.row.printer-${pbSlug(r.name).slice(0, 40)}`}
          columns={[{ key: 'name', header: 'Printer Name', width: 560 }]}
        />
      </div>
      <div className="pb-row" style={{ flex: 'none', paddingTop: 12 }}>
        <PBCheckbox label="Set as default" />
        <span style={{ flex: '1 1 auto' }} />
        <FooterButton primary onClick={() => onPick(PRINTERS[cur]!.name)} tutorialId="host.mois.command.select-printer">Select Printer</FooterButton>
        <FooterButton onClick={onClose} tutorialId="host.mois.command.select-printer-cancel">Cancel</FooterButton>
      </div>
    </StageWindow>
  )
}

/** A Dose Detail tree: "⊟ duration: 28.0 DAY" over one line per dose (#39, #45). */
export function DoseTree({ med, rx = true, style }: { med?: Med; rx?: boolean; style?: CSSProperties }) {
  if (!med || !(med.dispense || med.dose)) return null
  const lines = med.doses.length ? med.doses : [med.dose]
  /* a long-term row's tree reads "0.0 ENTER ON RENEW" until a renewal sets
     the amount (#45); a prescription with no duration record falls back to
     its Amount */
  const duration = med.dispense || (rx ? med.amount || '0.0' : '0.0 ENTER ON RENEW')
  return (
    <div style={{ fontFamily: 'var(--pb-font-mono)', whiteSpace: 'pre', padding: '3px 12px', ...style }}>
      <b>&#8863; duration: {duration}</b>
      {lines.map((d, i) => <div key={i} style={{ paddingLeft: 4 }}><span style={{ color: '#808080' }}>&#9492;</span> {d}</div>)}
    </div>
  )
}

/* --- Select Medications to Print --------------------------------------------
   user capture 2026-09-25 #38 / #39 / #41 (v02.31.23), about 1100×800:
   - "Current Patient" band (Chart · Patient · DoB · Sex · BC Health No.)
   - "Pharmacy / Other Recipient": ☐ Include, the chart's pharmacy in a bold
     drop-down, "Fax:" and its number in bold, "Add One" at the right; the
     row turns green once Include is ticked (#41)
   - "Prescription List": Include · Order · CDIC · Medication · Dose /
     Frequency · Amount; a ticked row is light green, the current row pale
     yellow even when ticked (colours sampled off #39)
   - under it the current row's Generic Name / Comment (grey, read-only),
     its Instructions / PRN / Repeat ticks and Last Printed, and its Dose
     Detail tree in a box on the right
   - Print Height · Print Weight · Print GFR (GFR greyed with no GFR on
     file) and the note under them; Printer: Default / Fax: DEFAULT, each
     with "Change..."
   - Print (F2) · Sign and Print · Sign and Fax · Sign and Task · Cancel. */
export function SelectMedsToPrintWindow({ include: preset = [], onPrint, onClose }: {
  include?: string[]
  onPrint: (job: PrintJob) => void
  onClose: () => void
}) {
  const p = usePatient()
  const data = useChartExport()
  const rows = useMedRows('rx').filter((m) => !m.voided)
  const [include, setInclude] = useState<Set<string>>(() => new Set(preset))
  const [pharmacy, setPharmacy] = useState(false)
  const [printer, setPrinter] = useState('Default')
  const [fax, setFax] = useState('DEFAULT')
  const [picking, setPicking] = useState<'printer' | 'fax' | null>(null)
  const [cur, setCur] = useState(0)
  const row = rows[Math.min(cur, Math.max(0, rows.length - 1))]
  const hasGfr = (data?.measure ?? []).some((m) => m.str_code === '27540' || /\bGFR\b/i.test(m.str_description ?? ''))
  const ph = p.pharmacy
  const pharmacyLabel = ph?.name ? [ph.name, ph.address].filter(Boolean).join(' - ') : ''
  const job = (mode: PrintMode): PrintJob => ({ mode, include: rows.filter((m) => include.has(m.id)).map((m) => m.id), pharmacy, printer, fax })
  const button = (mode: PrintMode, label: string, primary = false) => (
    <FooterButton primary={primary} onClick={() => onPrint(job(mode))} tutorialId={`host.mois.command.${mode === 'print' ? 'print-f2' : pbSlug(label)}`}>{label}</FooterButton>
  )
  const flag = (m: Med | undefined, key: string) => m?.record?.[key] === 'Y'
  const box: CSSProperties = { border: '1px solid var(--pb-border)', background: '#fff' }
  return (
    <StageWindow id={MED_WINDOWS.selectToPrint} title="Select Medications to Print" width={1100} height={800} onClose={onClose}
      footer={<>
        <span className="pb-footer__spacer" />
        {button('print', 'Print (F2)', true)}
        {button('sign-print', 'Sign and Print')}
        {button('sign-fax', 'Sign and Fax')}
        {button('sign-task', 'Sign and Task')}
        <FooterButton onClick={onClose} tutorialId="host.mois.command.select-medications-cancel">Cancel</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <CurrentPatientBlock healthNo />
      <div style={{ margin: '0 6px', flex: 'none', border: '1px solid var(--pb-border)', borderTop: 0 }}>
        <PBBand>Pharmacy / Other Recipient</PBBand>
        <div className="pb-row" style={{ background: pharmacy ? '#d4fdc8' : '#fff', padding: '2px 8px 2px 30px', gap: 10 }}>
          <PBCheckbox label="Include" checked={pharmacy} onChange={setPharmacy} tutorialId="host.mois.field.pharmacy-include" />
          <span style={{ width: 20 }} />
          <span style={{ fontWeight: 700 }}>
            <PBSelect w={560} value={pharmacyLabel} options={[pharmacyLabel]} data-tutorial-id="host.mois.field.pharmacy" />
          </span>
          <span>Fax:&nbsp;<b>{ph?.fax ?? ''}</b></span>
          <span style={{ flex: '1 1 auto' }} />
          {/* TODO(user capture 2026-09-25 #40): "Add One" opens the MOIS -
              Address Book for Pharmacy List (Limit to Pharmacy List records
              ticked). That window is being built elsewhere; wire it here
              when it lands. Until then the link does nothing. */}
          <button type="button" className="pb-link" data-tutorial-id="host.mois.command.add-one" style={{ marginRight: 60 }}>Add One</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, margin: '0 6px', border: '1px solid var(--pb-border)', borderTop: 0, ['--pb-dw-select' as string]: '#fdffc9' }}>
        <PBBand>Prescription List</PBBand>
        <PBDataWindow
          flush zebra={false} style={{ flex: '1 1 auto', minHeight: 0 }}
          rows={rows}
          current={Math.min(cur, Math.max(0, rows.length - 1))}
          onCurrentChange={setCur}
          rowFill={(m) => (include.has(m.id) ? '#d4fdc8' : undefined)}
          rowTutorialId={(_r, i) => `host.mois.row.print-${i}`}
          columns={[
            {
              key: 'include', header: 'Include', width: 52, align: 'center',
              render: (m) => <PBCheckbox checked={include.has(m.id)} tutorialId={`host.mois.cell.include-${pbSlug(m.med || m.order).slice(0, 32)}`}
                onChange={(on) => setInclude((s) => { const n = new Set(s); on ? n.add(m.id) : n.delete(m.id); return n })} />,
            },
            { key: 'order', header: 'Order', width: 78, align: 'center' },
            { key: 'cdic', header: 'CDIC', width: 78, align: 'center' },
            { key: 'med', header: 'Medication' },
            { key: 'dose', header: 'Dose / Frequency', width: 190 },
            { key: 'amount', header: 'Amount', width: 150 },
          ]}
          empty="No prescriptions to print."
        />
      </div>
      <div data-tutorial-id="host.mois.group.print-instructions" style={{ display: 'flex', margin: '0 6px', height: 150, flex: 'none', border: '1px solid var(--pb-border)', borderTop: 0, background: 'var(--pb-face)' }}>
        <div className="pb-form" style={{ gridTemplateColumns: '86px 1fr', flex: '1 1 auto', padding: '6px 8px', alignItems: 'start', alignContent: 'start' }}>
          <span className="pb-form__label">Generic Name:</span><PBTextArea rows={2} w="100%" readOnly value={row?.generic ?? ''} style={{ background: 'var(--pb-face)' }} />
          <span className="pb-form__label">Comment:</span><PBTextArea rows={5} w="100%" readOnly value={row?.comment ?? ''} style={{ background: 'var(--pb-face)' }} />
        </div>
        <div style={{ width: 210, flex: 'none', display: 'flex', flexDirection: 'column', padding: '6px 6px 4px 0' }}>
          <div className="pb-form" style={{ gridTemplateColumns: '66px auto', padding: 0, gap: '2px 6px' }}>
            <span className="pb-form__label pb-form__label--right">Instructions:</span><PBCheckbox label="Do Not Substitute" checked={flag(row, 'str_no_substitute')} />
            <span /><PBCheckbox label="Do Not Adapt" checked={flag(row, 'str_do_not_adapt')} />
            <span className="pb-form__label pb-form__label--right">PRN:</span><PBCheckbox label="(when necessary)" checked={flag(row, 'str_prn')} />
            <span className="pb-form__label pb-form__label--right">Repeat:</span>
            <div className="pb-row"><PBCheckbox checked={flag(row, 'str_refill')} /><PBInput w={46} align="center" readOnly value={flag(row, 'str_refill') ? row?.record?.num_repeat ?? '' : ''} /><b>&#10007;</b></div>
          </div>
          <span style={{ flex: '1 1 auto' }} />
          <div className="pb-row" style={{ gap: 12 }}><span>Last Printed:</span><span>{row?.lastPrinted}</span></div>
        </div>
        <div data-tutorial-id="host.mois.group.print-dose-detail" style={{ ...box, width: 340, flex: 'none', borderTop: 0, borderRight: 0, borderBottom: 0 }}>
          <DoseTree med={row} />
        </div>
      </div>
      <div style={{ display: 'flex', margin: '0 6px 6px', border: '1px solid var(--pb-border)', borderTop: 0, background: '#fff', flex: 'none' }}>
        <div data-tutorial-id="host.mois.group.print-measures" style={{ flex: '1 1 auto', padding: '4px 10px' }}>
          <div className="pb-row" style={{ gap: 26 }}>
            <PBCheckbox label="Print Height" /><PBCheckbox label="Print Weight" /><PBCheckbox label="Print GFR" disabled={!hasGfr} />
          </div>
          <div style={{ paddingTop: 3 }}>
            When patient age is less than 12 and Height or Weight measures occurred within the past month, then the associated measure is selected for printing by default.  GFR selected by default for all patients if value is less than 60.
          </div>
        </div>
        <div style={{ width: 620, flex: 'none', borderLeft: '1px solid var(--pb-border)' }}>
          {([['Printer:', printer, 'printer'], ['Fax:', fax, 'fax']] as const).map(([k, v, which]) => (
            <div key={k} className="pb-row" style={{ padding: '6px 8px', height: 37, borderBottom: which === 'printer' ? '1px solid var(--pb-border)' : 0 }}>
              <span style={{ width: 46 }}>{k}</span><span style={{ flex: '1 1 auto' }}>{v}</span>
              <button type="button" className="pb-link" data-tutorial-id={`host.mois.command.change-${which}`} onClick={() => setPicking(which)}>Change...</button>
            </div>
          ))}
        </div>
      </div>
      {picking && (
        <SelectPrinterWindow
          onClose={() => setPicking(null)}
          onPick={(name) => { if (picking === 'printer') setPrinter(name); else setFax(name); setPicking(null) }}
        />
      )}
    </StageWindow>
  )
}

/* --- Please Sign --------------------------------------------------------------
   user capture 2026-09-25 #44 (v02.31.23, from Rx) and #46 (from Long Term
   Meds after Renew / Print), a tall window about 540×800: the prescription
   as it will print, in monospace — the prescriber block top right, "Rx FOR:"
   with the patient's name (alias in brackets), address, DOB / SEX, TEL, INS
   and BCHN, "Rx DATE:", "Rx TO:" the pharmacy and its FAX when the pharmacy
   is included, a bullet per medication, "Electronically hand-signed on
   <day> <Month> <d>, <yyyy> at <h:mm AM>", then "Created By:" / "Created
   For:  Prof. ID:" — and under it the signature pad (grey "Sign Here..."),
   More... on the left, Clear and Accept on the right.

   The pad takes a mouse stroke (#46 shows one drawn). Nothing in the
   captures says Accept waits for ink, so it does not. */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function signedOn(): string {
  const [y, m, d] = MOIS_TODAY.split('.').map(Number)
  const at = new Date(y!, m! - 1, d!)
  const now = new Date()
  const h = now.getHours()
  const time = `${h % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
  return `${DAYS[at.getDay()]} ${MONTHS[at.getMonth()]} ${at.getDate()}, ${at.getFullYear()} at ${time}`
}

function SignaturePad({ strokes, setStrokes }: { strokes: string[]; setStrokes: (fn: (s: string[]) => string[]) => void }) {
  const drawing = useRef(false)
  const svg = useRef<SVGSVGElement>(null)
  const point = (e: ReactPointerEvent) => {
    const r = svg.current!.getBoundingClientRect()
    return `${Math.round(e.clientX - r.left)},${Math.round(e.clientY - r.top)}`
  }
  return (
    <svg
      ref={svg}
      data-tutorial-id="host.mois.field.signature-pad"
      style={{ display: 'block', width: '100%', height: 84, background: '#fff', border: '1px solid #a0a0a0', touchAction: 'none' }}
      onPointerDown={(e) => { drawing.current = true; const pt = point(e); setStrokes((s) => [...s, pt]) }}
      onPointerMove={(e) => { if (!drawing.current) return; const pt = point(e); setStrokes((s) => [...s.slice(0, -1), `${s[s.length - 1]} ${pt}`]) }}
      onPointerUp={() => { drawing.current = false }}
      onPointerLeave={() => { drawing.current = false }}
    >
      {strokes.map((pts, i) => <polyline key={i} points={pts} fill="none" stroke="#000" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />)}
    </svg>
  )
}

export function PleaseSignWindow({ job, onAccept, onClose }: { job: PrintJob; onAccept: () => void; onClose: () => void }) {
  const p = usePatient()
  const meds = useMedRows('rx').filter((m) => job.include.includes(m.id))
  const [strokes, setStrokes] = useState<string[]>([])
  const [stamp] = useState(signedOn)
  const prescriber = meds.find((m) => m.orderBy)?.orderBy ?? STAGE_USER
  const name = `${p.first}${p.alias ? ` (${p.alias})` : ''} ${p.last}`.toUpperCase()
  const ph = p.pharmacy
  const section: CSSProperties = { borderBottom: '1px solid #000', padding: '3px 4px' }
  const mono: CSSProperties = { fontFamily: 'var(--pb-font-mono)', whiteSpace: 'pre-wrap', fontSize: 11, lineHeight: '15px' }
  const tag = (text: string) => <span style={{ display: 'inline-block', width: 58 }}>{text}</span>
  const lines = (...xs: (string | false | undefined)[]) => xs.filter(Boolean).join('\n')
  return (
    <StageWindow id={MED_WINDOWS.pleaseSign} title="Please Sign" width={540} height={800} onClose={onClose} bodyStyle={{ padding: '8px 18px 10px', background: '#f0f0f0' }}>
      <div data-tutorial-id="host.mois.group.prescription-preview" style={{ ...mono, flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff', border: '1px solid #000', display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...section, textAlign: 'right', minHeight: 72 }}>{lines(prescriber, 'MOIS DEV')}</div>
        <div style={section}>
          {tag('Rx FOR:')}{name}
          <div style={{ paddingLeft: 58 }}>{lines(
            p.address,
            [p.city, p.province].filter(Boolean).join(' '),
            `DOB: ${p.dob}    SEX: ${p.sex}`,
            `TEL: H ${p.home ?? ''}${p.work ? ` W ${p.work}` : ''}`,
            `INS: ${p.insuranceBy ?? 'BC'}  ${p.bchn ?? p.insurance ?? ''}`,
          )}</div>
          <div style={{ paddingLeft: 30 }}>BCHN: {p.bchn ?? p.insurance ?? ''}</div>
          <div>{tag('Rx DATE:')}{meds[0]?.order ?? MOIS_TODAY}</div>
        </div>
        <div style={section}>
          {job.pharmacy && ph?.name && <div>{lines(` Rx TO: ${[ph.name, ph.address].filter(Boolean).join(' - ')}`, `    FAX: ${(ph.fax ?? '').replace(/\D/g, '')}`)}</div>}
          {meds.map((m) => (
            <div key={m.id} style={{ paddingTop: 8 }}>{lines(`• ${m.med}`, m.dose && `  ${m.dose}`, m.amount && `  ${m.amount}`)}</div>
          ))}
        </div>
        <div style={{ ...section, flex: '1 1 auto', fontFamily: 'var(--pb-font)' }}>Electronically hand-signed on {stamp}</div>
        <div style={{ padding: '3px 4px' }}>
          <div><span style={{ display: 'inline-block', width: 100 }}>Created By:</span>{STAGE_USER}</div>
          <div><span style={{ display: 'inline-block', width: 100 }}>Created For:</span>{prescriber}&nbsp;&nbsp;Prof. ID:</div>
        </div>
      </div>
      <div style={{ flex: 'none', padding: '6px 20px 0', border: '1px solid #d0d0d0', borderTop: 0, background: '#f7f7f7' }}>
        <div style={{ color: '#a0a0a0', paddingBottom: 4 }}>Sign Here...</div>
        <SignaturePad strokes={strokes} setStrokes={setStrokes} />
        <div className="pb-row" style={{ padding: '6px 0 6px', gap: 6 }}>
          <PBButton wide data-tutorial-id="host.mois.command.sign-more">More...</PBButton>
          <span style={{ flex: '1 1 auto' }} />
          <PBButton wide data-tutorial-id="host.mois.command.sign-clear" onClick={() => setStrokes(() => [])}>Clear</PBButton>
          <PBButton wide className="pb-btn--default" data-tutorial-id="host.mois.command.sign-accept" onClick={onAccept}>Accept</PBButton>
        </div>
      </div>
    </StageWindow>
  )
}
