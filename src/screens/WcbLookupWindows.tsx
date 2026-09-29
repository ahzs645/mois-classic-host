import { useMemo, useState } from 'react'
import { universalSearchRows } from '../data/encounterPickers'
import { usePatient } from '../data/patient-context'
import type { WcbClaimEntry } from '../data/patients'
import { WCB_AREA_OF_INJURY, type WcbCode, type WcbValidation } from '../data/wcbForm'
import { PBBand, PBButton, PBDataWindow, pbSlug } from '../pb'
import { ModalWindow } from './dialogKit'
import { LookupBand, LookupPager, PickListWindow, SIZE, SearchForRow, usePagedCursor } from './lookupKit'
import { PatientFieldRow } from './patientKit'
import { DialogButton } from './WorkspaceDialogFrame'

/* ============================================================================
   The windows the WCB Form (screens/WcbFormWindow) opens over itself: the
   Claim No. "…" claim lookup, the Advanced Lookup Service behind Area of
   Injury / Nature of Injury / ICD9 "…", and Create MSP Claim's validation
   list.

   Sizes are the captures' divided by 1.1 — the user captures of 2026-09-25
   were taken at a display scale about 10% larger than the manual's, which
   the rest of the emulator is sized from (the WCB Form is 955 px wide in
   #25 and 875 in art. 303118 `1800dc96…`).

   Each window's `host.dialog` slug is reported by the WCB Form, which owns
   the stack; the window itself carries the `host.mois.dialog.<slug>` ring.
   ========================================================================= */

const LAYER = { position: 'fixed' as const, padding: 8, zIndex: 93 }
const PANEL = { border: '1px solid #a0a0a0', background: '#fff', display: 'flex', flexDirection: 'column' as const }

/* --- WCB Claim Lookup ---------------------------------------------------------
   PROVENANCE: user capture 2026-09-25 #26 (v02.31.23), the Claim No. "…"
   over a new WCB Form: title `WCB Claim Lookup` with only a close box; a
   white panel holding the grey band `WCB Claim List`, the identity line
   CHART · FIRST · MIDDLE · LAST (values bold), and the grid DOI · Claim No. ·
   Area of Injury · Position · Nature of Injury · ICD9 · Employee; Ok and
   Cancel centred under it. The capture's chart has no claim on file and the
   grid shows a single blank row, current (salmon) — kept here: Ok on it
   closes the lookup and fills nothing. Employee is the column caption; it
   prints the claim's employer. The slug stays `wcb-claim-list` (the band's
   caption), which the lessons already ring. */
export function WcbClaimLookupDialog({ onPick, onClose }: { onPick: (i: number | null) => void; onClose: () => void }) {
  const patient = usePatient()
  const claims: WcbClaimEntry[] = patient.wcbClaims ?? []
  const [cur, setCur] = useState(0)
  const rows = claims.length
    ? claims.map((c, i) => ({
      i: String(i), doi: c.doi ?? '', claim: c.claim ?? '', area: c.area ?? '', position: c.position ?? '',
      nature: c.nature ?? '', icd9: c.icd9 ?? '', employee: c.employer ?? c.company ?? '',
    }))
    : [{ i: '', doi: '', claim: '', area: '', position: '', nature: '', icd9: '', employee: '' }]
  const pick = (i: number) => onPick(rows[i]?.i ? Number(rows[i]!.i) : null)
  return (
    <ModalWindow id="wcb-claim-list" title="WCB Claim Lookup" onClose={onClose} layerStyle={LAYER}
      windowStyle={{ width: 'min(690px, 100%)', height: 'min(365px, 100%)' }}>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '10px 8px 0' }}>
          <div style={{ ...PANEL, flex: '1 1 auto', minHeight: 0 }}>
            <PBBand><b>WCB Claim List</b></PBBand>
            <PatientFieldRow layout="inline" sep={'\u00a0'} style={{ gap: 0, padding: '3px 6px', borderBottom: '1px solid #e2e2e2', flex: 'none' }} fields={[
              { label: 'CHART:', value: patient.chart, w: 150, sep: '\u00a0\u00a0\u00a0' },
              { label: 'FIRST:', value: patient.first.toUpperCase(), w: 170 },
              { label: 'MIDDLE:', value: patient.middle.toUpperCase(), w: 172 },
              { label: 'LAST:', value: patient.last.toUpperCase() },
            ]} />
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
              <PBDataWindow
                flush
                columns={[
                  { key: 'doi', header: 'DOI', width: 84, headAlign: 'center' },
                  { key: 'claim', header: 'Claim No.', width: 85, headAlign: 'center' },
                  { key: 'area', header: 'Area of Injury', width: 89, headAlign: 'center' },
                  { key: 'position', header: 'Position', width: 51, headAlign: 'center' },
                  { key: 'nature', header: 'Nature of Injury', width: 90, headAlign: 'center' },
                  { key: 'icd9', header: 'ICD9', width: 67, headAlign: 'center' },
                  { key: 'employee', header: 'Employee', width: 177, headAlign: 'center' },
                ]}
                rows={rows}
                current={cur}
                onCurrentChange={setCur}
                onActivate={(_, i) => pick(i)}
                rowTutorialId={(r) => (r.i ? `host.mois.row.wcb-claim-${Number(r.i) + 1}` : undefined)}
              />
            </div>
          </div>
        </div>
        <div className="pb-row" style={{ justifyContent: 'center', gap: 18, padding: '12px 0 10px', flex: 'none' }}>
          <DialogButton id="wcb-claim-ok" width={75} onClick={() => pick(cur)}>Ok</DialogButton>
          <DialogButton id="wcb-claim-cancel" width={75} onClick={onClose}>Cancel</DialogButton>
        </div>
    </ModalWindow>
  )
}

/* --- Advanced Lookup Service: a WCB code set ------------------------------------
   PROVENANCE: user capture 2026-09-25 #29 (v02.31.23), Area of Injury "…":
   title `Advanced Lookup Service`; inside a bordered panel the grey band
   `Area of Injury`, then `Search For:` (blue caption) with a salmon-filled
   box and a "…" button; the grid Code · Description · Category (zero-padded
   codes, the first row current); under it a `Synonyms:` box (blue underlined
   caption, its own scroll bar) and a memo reading `Code set from WCB`; then
   Home · PgUp at the left, Ok · Cancel in the middle (Ok painted greyed in
   the capture, though a row is current) and PgDwn · End at the right.

   Nature of Injury and ICD9 "…" are NOT captured. They are assumed to open
   the same window with their own band: ICD9 lists the ICD-9 terms the
   Universal Search Window already carries (data/encounterPickers), and
   Nature of Injury lists nothing — its WCB code set is not in any capture,
   and no code is invented for it. */
export type WcbLookupKind = 'area' | 'nature' | 'icd9'

const LOOKUPS: Record<WcbLookupKind, { band: string; slug: string; note: string; rows: () => WcbCode[] }> = {
  area: { band: 'Area of Injury', slug: 'wcb-area-of-injury-lookup', note: 'Code set from WCB', rows: () => WCB_AREA_OF_INJURY },
  nature: { band: 'Nature of Injury', slug: 'wcb-nature-of-injury-lookup', note: 'Code set from WCB', rows: () => [] },
  icd9: {
    band: 'ICD9', slug: 'wcb-icd9-lookup', note: 'ICD-9',
    rows: () => universalSearchRows.filter((r) => r.system === 'ICD-9').map((r) => ({ code: r.code, description: r.term, category: r.category })),
  },
}

export const wcbLookupSlug = (kind: WcbLookupKind) => LOOKUPS[kind].slug

const PAGE = 20

export function WcbCodeLookupDialog({ kind, initial = '', onPick, onClose }: {
  kind: WcbLookupKind
  /** what the field held: the search starts from it */
  initial?: string
  onPick: (row: WcbCode) => void
  onClose: () => void
}) {
  const set = LOOKUPS[kind]
  const all = useMemo(() => set.rows(), [set])
  const [search, setSearch] = useState(initial)
  const rows = useMemo(() => {
    const want = search.trim().toUpperCase()
    return want ? all.filter((r) => r.code.startsWith(want) || r.description.toUpperCase().startsWith(want)) : all
  }, [all, search])
  const cursor = usePagedCursor(rows.length, PAGE)
  const row = rows[cursor.at]
  return (
    <PickListWindow
      window={{ id: set.slug, title: 'Advanced Lookup Service', onClose, layerStyle: LAYER, windowStyle: { width: 'min(673px, 100%)', height: 'min(673px, 100%)' } }}
      body={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '8px 8px 0', gap: 0 }}
      panel={{ ...PANEL, flex: '1 1 auto', minHeight: 0 }}
      band={<LookupBand variant="bold">{set.band}</LookupBand>}
      search={(
        <SearchForRow
          salmon
          value={search}
          onChange={(v) => { setSearch(v); cursor.setCurrent(0) }}
          onKeyDown={(e) => { if (e.key === 'Enter' && row) { e.preventDefault(); onPick(row) } }}
          inputStyle={{ flex: '1 1 auto' }}
          field={`${set.slug}-search`}
          after={<PBButton size="sm" style={{ minWidth: 20 }} onClick={() => cursor.setCurrent(0)}>…</PBButton>}
        />
      )}
      grid={{
        flush: true,
        rules: 'white',
        columns: [
          { key: 'code', header: 'Code', width: 128, headAlign: 'center' },
          { key: 'description', header: 'Description', width: 322, headAlign: 'center' },
          { key: 'category', header: 'Category', headAlign: 'center' },
        ],
        rows,
        current: cursor.at,
        onCurrentChange: cursor.setCurrent,
        onActivate: (r) => onPick(r),
        rowTutorialId: (r) => `host.mois.row.${set.slug}-${pbSlug(r.code)}`,
        empty: all.length ? 'No code matches.' : 'This code set is not in the practice data.',
      }}
      belowGrid={(
        <>
          <div style={{ flex: 'none', borderTop: '1px solid #a0a0a0', height: 34, padding: '1px 3px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--pb-link)', textDecoration: 'underline' }}>Synonyms:</span>
            <ScrollStub />
          </div>
          <div style={{ flex: 'none', borderTop: '1px solid #a0a0a0', height: 64, padding: '2px 3px' }} data-tutorial-id={`host.mois.field.${set.slug}-note`}>
            {set.note}
          </div>
        </>
      )}
      footer={(
        <LookupPager
          cursor={cursor}
          className="pb-row"
          style={{ gap: 0, padding: '10px 8px', flex: 'none' }}
          navSize={SIZE.lookupNav}
          pickSize={SIZE.dialog(74)}
          pickGap={22}
          ok={{ command: `${set.slug}-ok`, disabled: !row, onClick: () => { if (row) onPick(row) } }}
          cancel={{ command: `${set.slug}-cancel`, onClick: onClose }}
        />
      )}
    />
  )
}

/** the Synonyms box's idle scroll bar: two arrows, nothing to scroll */
const ScrollStub = () => (
  <span style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#a0a0a0', fontSize: 8, lineHeight: 1 }} aria-hidden="true">
    <span>&#9650;</span><span>&#9660;</span>
  </span>
)

/* --- Create MSP Claim: WCB Form MSP Claim Validation Warnings / Errors -----------
   PROVENANCE: user capture 2026-09-25 #32 (v02.31.23): a yellow warning
   triangle and `WCB Form MSP Claim Validation Warnings / Errors` in the title
   bar (close box only), about the WCB Form's size; a panel with the grey band
   `Validation Warning and Error List for WCB Form MSP Claim submission`, the
   intro text (verbatim, "correct them items" included), and the grid Code ·
   Type · Description, the first Description's text highlighted blue; Print,
   E-Mail (greyed), Save (greyed) at the left and Close at the right. The
   rows themselves are data/wcbForm `wcbMspValidation`. Print hands the list
   to the frame's Print Preview, as MOIS's other list prints do. */
export function WcbMspValidationWindow({ rows, onPrint, onClose }: {
  rows: WcbValidation[]
  onPrint: () => void
  onClose: () => void
}) {
  return (
    <ModalWindow id="wcb-msp-claim-validation" icon={<WarnGlyph />} layerStyle={LAYER}
      title="WCB Form MSP Claim Validation Warnings / Errors" onClose={onClose}
      windowStyle={{ width: 'min(868px, 100%)', height: 'min(625px, 100%)' }}>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '10px 12px 0' }}>
          <div style={{ ...PANEL, flex: '1 1 auto', minHeight: 0 }}>
            <PBBand><b>Validation Warning and Error List for WCB Form MSP Claim submission</b></PBBand>
            <div style={{ padding: '4px 5px 6px', background: '#fffffd', flex: 'none' }}>
              The following is a list of validation warnings and/or errors that must be fixed before an MSP Claim can be created for the current WCB Form.&nbsp; Please review and correct them items to ensure data integrity.
            </div>
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
              <PBDataWindow
                flush
                gutter={false}
                columns={[
                  { key: 'code', header: 'Code', width: 72, headAlign: 'center' },
                  { key: 'type', header: 'Type', width: 164, headAlign: 'center' },
                  {
                    key: 'description', header: 'Description', headAlign: 'center',
                    render: (r, i) => (i === 0 ? <span style={{ background: '#80b2d5', color: '#fff' }}>{r.description}</span> : r.description),
                  },
                ]}
                rows={rows}
                /* no current row: #32 shows none, only the first message's text selected */
                current={-1}
                rowTutorialId={(r) => `host.mois.row.wcb-validation-${pbSlug(r.type)}`}
                empty=""
              />
            </div>
          </div>
        </div>
        <div className="pb-row" style={{ gap: 6, padding: '10px 18px 10px', flex: 'none' }}>
          <DialogButton id="wcb-validation-print" width={82} onClick={onPrint}>Print</DialogButton>
          <DialogButton id="wcb-validation-email" width={82} disabled>E-Mail</DialogButton>
          <DialogButton id="wcb-validation-save" width={82} disabled>Save</DialogButton>
          <span style={{ flex: '1 1 auto' }} />
          <DialogButton id="wcb-validation-close" width={75} isDefault onClick={onClose}>Close</DialogButton>
        </div>
    </ModalWindow>
  )
}

function WarnGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 2l14 26H2z" fill="#f2c200" stroke="#b08c00" />
      <path d="M14.4 11h3.2v9h-3.2z" fill="#3a2f00" />
      <circle cx="16" cy="23.5" r="1.9" fill="#3a2f00" />
    </svg>
  )
}
