import type { ComponentProps, CSSProperties, ReactNode } from 'react'
import { usePatient } from '../data/patient-context'
import { PBFixed, PBIdentityStrip, PBLookup } from '../pb'

/* ============================================================================
   The patient identity lines the chart folders and their windows repeat.

   Two idioms, both drawn by hand in a dozen places before this kit:
     - `ChartIdentityStrip` — the FIRST / MIDDLE / LAST / DoB strip under a
       chart folder's command row (the kit's PBIdentityStrip, fed from the
       chart), with the Active ENC# block and, usually, the "Search For:"
       lookup band under it;
     - `PatientFieldRow` — the hand-laid identity row a record window or a
       letter dialog carries ("FIRST: JOHN  MIDDLE: …  DoB: …  SEX: M").

   The single-band blue banner (CHART NO. / PATIENT (F/M/L) / DATE OF BIRTH
   …) is PBPatientBand in pb/components/banners.tsx.

   Each primitive reproduces its copies' markup exactly (same elements,
   classes, inline declarations and anchors) when given the props listed in
   its header; the order of style declarations and the splitting of text
   nodes may differ, which the DOM census (webforms
   lib/host-emulators/__tests__/mois-dom-census.test.tsx) normalises away.
   ========================================================================= */

type LookupProps = ComponentProps<typeof PBLookup>

/** The name fields a strip reads; the chart's patient unless one is passed. */
export type IdentityNames = { first?: string; middle?: string; last?: string; dob?: string }

/* --- ChartIdentityStrip ------------------------------------------------------
   Replaces (all `<PBIdentityStrip fields={[FIRST, MIDDLE, LAST, DoB]} …>`
   built from usePatient(), plus the band after it where noted):

     CarePlanNoteFolder:~95     — default; then <SearchForBand> as a sibling
     CarePlanSummaryView:~66    — default
     CarePlanView:~178          — default; then <SearchForBand> as a sibling
     ChartSectionView:~137      — noEncounter={screen.noEncounter}
                                  search={!screen.noSearch && <SearchForBand … style={{ padding: 0, flex: '1 1 auto' }} />}
                                  (the whole thing stays inside `!screen.noPatient &&`)
     ClinicalReportView:~205    — search={<SearchForBand … />} (its own right=)
     GoalsView:~190             — search lookup={{ value: search, name: 'goal-search',
                                  fieldId: 'host.mois.field.goal-search', onChange, onDots, onKeyDown }}
     MarView:~480               — default (the pb-mar-filter band stays a sibling)
     MedicationView:~319, ~739  — search
     NotificationView:~168      — noEncounter
     PaperFormsView:~163        — search
     OrderView:~200             — widths={{ first: 186, middle: 145, last: 208, dob: 113 }}
                                  encounter={patient.encounter ?? 'NO ENCOUNTER'}
                                  search fixedSearch   (the capture-measured offsets)
     OrderView:~684             — widths={{ first: 170, middle: 139, last: 171 }} noEncounter
                                  (the six-box search band stays hand-drawn)
     MyHealthKeyChartView:~133  — patient={p} upper widths={{ first: 170, middle: 150, last: 190 }}
     DeterminantsView:~159      — default
     SummarySettingsView:~168   — default

   Not covered: DemographicsView's IdentityStrip (CHART: first, red names for
   IA/DE) — a different field set; it keeps its own PBIdentityStrip.

   `search` is the "Search For:" band under the strip:
     `true`  → <div.pb-row padding 2px 8px><span>Search For:</span><PBLookup w="100%" {...lookup} /></div>
     a node  → that node inside the same padded row (SearchForBand);
     false / omitted → no band (`lookup` alone implies `true`).
   `fixedSearch` makes that row OrderView's PBFixed (`pb-fixed pb-row`,
   display flex) instead of a plain div.                                    */
const CHART_STRIP_WIDTHS = { first: 170, middle: 139, last: 171, dob: 120 }

export function ChartIdentityStrip({
  widths, upper, encounter = 'NO ENCOUNTER', noEncounter, onEncounterLookup, patient, search, lookup, fixedSearch,
}: {
  /** painted column widths, when a capture measured them */
  widths?: { first?: number; middle?: number; last?: number; dob?: number }
  /** print the three names upper-case (myhealthkey's strip) */
  upper?: boolean
  /** the Active ENC# value; "NO ENCOUNTER" shows the frame's active encounter */
  encounter?: ReactNode
  /** the window has no Active ENC# block at all */
  noEncounter?: boolean
  onEncounterLookup?: () => void
  /** names to print instead of the chart's (a patient with unsaved edits) */
  patient?: IdentityNames
  search?: ReactNode
  /** props for the default Search For lookup */
  lookup?: Partial<LookupProps>
  fixedSearch?: boolean
}) {
  const chart = usePatient()
  const p: IdentityNames = patient ?? chart
  /* the chart windows all print the four names on one grid — 170 · 139 ·
     171 · 120, measured alike on the 2026-09-29 TRAINING captures of
     Determinants of Health, Measurements, Imaging, Consults and Family Hx */
  widths ??= CHART_STRIP_WIDTHS
  const name = (v?: string) => (upper ? (v ?? '').toUpperCase() : v)
  const band = search === true || (search === undefined && lookup !== undefined)
    ? <><span>Search For:</span><PBLookup w="100%" {...lookup} /></>
    : search === false || search == null ? null : search
  return (
    <>
      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: name(p.first), w: widths?.first },
          { label: 'MIDDLE:', value: name(p.middle), w: widths?.middle },
          { label: 'LAST:', value: name(p.last), w: widths?.last },
          { label: 'DoB:', value: p.dob, w: widths?.dob },
        ]}
        encounter={noEncounter ? undefined : encounter}
        onEncounterLookup={onEncounterLookup}
      />
      {band && (fixedSearch
        ? <PBFixed className="pb-row pb-searchband" style={{ display: 'flex' }}>{band}</PBFixed>
        : <div className="pb-row pb-searchband">{band}</div>)}
    </>
  )
}

/* --- PatientFieldRow ----------------------------------------------------------
   One hand-laid identity row. A field is a caption and a value; `layout`
   says how the pair is drawn, because the windows draw it three ways:

     'split'  <span>FIRST:&nbsp;</span><b style={{ width }}>JOHN</b>
              — the width is on the bold value (Letter / Referral windows)
     'inline' <span style={{ width }}>FIRST:&nbsp;<b>JOHN</b></span>
              — the width is on the pair (record windows, Workflow Summary)
     'strong' <span><strong>FIRST:</strong> JOHN</span>
              — caption bold, value plain (Measurement Detail)

   `before` puts a `<span style={{ width }} />` spacer ahead of a field
   (LetterFlow's 24px gaps); a field with no `label` is the bare value (the
   SEX after DoB); `{ node }` is drawn as given, for the one-off cells
   (an underlined or linked "Cell:"). `sep` is the text between caption and
   value — ' ' for 'split', ' ' for the others, per field if need be.

   The row is `<div className="pb-row" style={{ gap: 0 }}>`; `className=""`
   drops the class and `style` replaces the default (pass `null` for none).

   Replaces — the row(s) only; the wrapper each window paints stays put:
     LetterWindows:~60 PatientBlock (yellow #ffffc0 wrapper stays)
       row 1: fields=[{label:'FIRST:', value:p.first, w:150}, {label:'MIDDLE:', value:p.middle, w:130},
              {label:'LAST:', value:p.last, w:170}, {label:'DoB:', value:p.dob, w:90}, {value:p.sex}]
       row 2: [{label:'PHN:', value:patientPhn(p), w:160}, {label:'Home:', value:p.home, w:120},
              {label:'Work:', value:p.work, w:120},
              {node:<><span style={{textDecoration:'underline'}}>Cell:</span>&nbsp;<b>{p.cell}</b></>}]
     LetterWindows:~296, LetterResponseWindows:~226 — style={{ gap: 0, padding: '3px 12px',
       borderBottom: '1px solid #9a9a9a', background: '#fff' }}, widths 160/150/180/110, then {label:'SEX:', value:p.sex}
     LetterWindows:~448 — style={{ gap: 0, padding: '3px 8px', borderBottom: '1px solid #9a9a9a' }},
       widths 180/150/180/110, then SEX
     LetterFlow:~336 (inside its pb-banner-yellow wrapper)
       row 1: FIRST, {before:24, MIDDLE}, {before:24, LAST}, {before:24, DoB}, {before:16, value:p.sex} — no widths
       row 2: {label:'PHN:', value:p.phn}, {before:12, value:p.phnSuffix}, {before:24, Home}, {before:24, Work},
              {before:24, node:<><button className="pb-link" data-tutorial-id="host.mois.field.cell">Cell:</button><span>&nbsp;</span><b>{p.cell}</b></>}
     StandardReferralWindows:~158 (yellow wrapper stays) — CHART w70, FIRST w140, MIDDLE w120,
       LAST w150, DoB w90, {value:p.sex, w:30}, {label:'PHN:', value:patientPhn(p)}
     MeasureDialogs:~98 — layout="strong" className="" style={{ display: 'flex', gap: 18, flex: 'none',
       padding: '3px 8px', background: 'var(--pb-yellow)', borderBottom: '1px solid var(--pb-yellow-border)' }}
       fields ENC #:, CHART:, FIRST:, LAST:
     MedicationWindows:~204 (white wrapper + pb-form stay) — layout="inline" sep={'  '},
       FIRST w180, MIDDLE w150, LAST w160, DoB w120, SEX
     OpeningChartReminderDialog:~56 — layout="inline" className="pb-opening-reminder__identity" style={null},
       CHART, FIRST, MIDDLE, LAST, DoB (value patient.dob.replace(/\./g, '/'))
     WcbLookupWindows:~56 — layout="inline" style={{ gap: 0, padding: '3px 6px', borderBottom: '1px solid #e2e2e2', flex: 'none' }},
       {label:'CHART:', sep:'   ', w:150}, {FIRST:, sep:' ', w:170, upper-cased}, {MIDDLE:, sep:' ', w:172}, {LAST:, sep:' '}
     RecordOptionWindows:~94, WorkspaceBasketWindows:~581 (BAND_DARK wrapper stays) — layout="inline"
       row 1: FIRST/MIDDLE/LAST upper-cased, DoB, {label:'Gender:', value:p.gender} (widths 200/180/200/130 and 220/200/220/130)
       row 2: style={{ gap: 0, paddingTop: 2 }}, PHN, {label:<u>Home:</u>}, Work, Cell                    */
export type PatientField = {
  label?: ReactNode
  value?: ReactNode
  w?: number
  /** a `<span style={{ width }} />` spacer ahead of the field */
  before?: number
  sep?: string
  /** drawn as given, instead of label + value */
  node?: ReactNode
}

export function PatientFieldRow({
  fields, layout = 'split', sep, className = 'pb-row', style = { gap: 0 }, anchor,
}: {
  fields: PatientField[]
  layout?: 'split' | 'inline' | 'strong'
  /** default caption/value separator for every field */
  sep?: string
  className?: string
  style?: CSSProperties | null
  /** data-tutorial-id on the row */
  anchor?: string
}) {
  const rowSep = sep ?? (layout === 'split' ? ' ' : ' ')
  return (
    <div className={className || undefined} data-tutorial-id={anchor} style={style ?? undefined}>
      {fields.map((f, i) => {
        const gap = f.before !== undefined ? <span style={{ width: f.before }} /> : null
        if (f.node !== undefined) return <FieldSlot key={i}>{gap}{f.node}</FieldSlot>
        const s = f.sep ?? rowSep
        const width = f.w !== undefined ? { width: f.w } : undefined
        if (layout === 'strong') {
          return <FieldSlot key={i}>{gap}<span style={width}><strong>{f.label}</strong>{s}{f.value}</span></FieldSlot>
        }
        if (layout === 'inline') {
          return <FieldSlot key={i}>{gap}<span style={width}>{f.label}{s}<b>{f.value}</b></span></FieldSlot>
        }
        return (
          <FieldSlot key={i}>
            {gap}
            {f.label !== undefined && <span>{f.label}{s}</span>}
            <b style={width}>{f.value}</b>
          </FieldSlot>
        )
      })}
    </div>
  )
}

/* a keyed fragment: a field adds its elements to the row, no wrapper */
const FieldSlot = ({ children }: { children: ReactNode }) => <>{children}</>

/** "BC 9876543210 00" — insurer, number and dependant, the way the Letter and
    Referral windows print a PHN (LetterWindows PatientBlock, StandardReferral). */
export const patientPhn = (p: { insuranceBy?: string; bchn?: string; insurance?: string; dep?: string }) =>
  [p.insuranceBy, p.bchn ?? p.insurance, p.dep].filter(Boolean).join(' ')
