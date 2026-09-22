import { useState } from 'react'
import { recordsForNode, useChartExport } from '../data/chart-records'
import {
  LETTER_SETUP_COLUMNS, LETTER_SETUP_GLOSSARY,
  LETTER_SETUP_ROWS,
  LETTER_TEMPLATES, TEMPLATE_PICKER, TEMPLATE_PREVIEW, TEMPLATE_SEARCH_HELP,
  type LetterSetupRow, type LetterTemplate
} from '../data/letterSetup'
import { LW } from '../data/letterWriter'
import { usePatient } from '../data/patient-context'
import {
  PBBand, PBButton, PBCheckbox, PBDataWindow, PBInput, PBLookup, PBRadio, PBWindow,
  pbSlug,
} from '../pb'

/* ============================================================================
   The two windows the Letter Writer opens behind.

   `Select Letter Template` picks the template; `Letter Setup` picks which of
   the patient's records the template's tags will pull in; `Continue (F2)` on
   Letter Setup is what opens the Letter Writer.

   Measurements and citations are in `data/letterSetup.ts`. Two things about
   them are worth repeating here:

   1. The template picker's group-header rows measure (165,203,247), NOT the
      #c8dcfa every data grid uses. That is not a quantisation artefact: the
      same palettised capture renders #c8dcfa elsewhere as (206,223,255).

   2. Letter Setup's only capture has no Patient Chart tree in frame, so its
      scale could not be calibrated the way every other capture was. It was
      INFERRED at ~1:1 from a 30px title bar and 22px push buttons, so its
      23px row pitch and its column widths are +/-25%, not measured.
   ========================================================================= */

/* Letter Setup's cyan caption. The kit paints a flat white Win10 title bar
   and its colour is not a token, so this one window carries its own rule
   rather than the kit growing a variant. React 19 hoists and de-duplicates it
   by `href`; React 18 leaves it in place, where it still applies.

   The template picker's own caption colour was never measured, so it keeps
   the kit's default rather than being guessed at. */
const SETUP_CAPTION = `
.pb-window--mois-lettersetup > .pb-titlebar { height: 30px; background: ${LW.titleBar}; }
`

/* ===========================================================================
   Select Letter Template
   ======================================================================== */
export function SelectLetterTemplateDialog({
  onSelect, onClose,
}: {
  onSelect?: (template: LetterTemplate) => void
  onClose?: () => void
}) {
  const [search, setSearch] = useState('')
  const [cur, setCur] = useState(0)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  /* "begin typing the name that the letter starts with. If you want to search
     anywhere in the name, add a * to the beginning (wildcard search)" */
  const q = search.trim().toUpperCase()
  const rows = !q
    ? LETTER_TEMPLATES
    : LETTER_TEMPLATES.filter((t) => (
      q.startsWith('*')
        ? t.name.toUpperCase().includes(q.slice(1))
        : t.name.toUpperCase().startsWith(q)
    ))

  const picked = rows[cur] ?? rows[0]

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <PBWindow
        child
        controls={false}
        title="Select Letter Template"
        onClose={onClose}
        style={{
          width: `min(${TEMPLATE_PICKER.width}px, calc(100vw - 40px))`,
          height: `min(${TEMPLATE_PICKER.height}px, calc(100vh - 60px))`,
        }}
      >
        <div
          data-tutorial-id="host.mois.dialog.select-letter-template"
          style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}
        >
        <div className="pb-row" style={{ gap: 6, padding: '6px 8px', flex: 'none' }}>
          <span className="pb-form__label">Search:</span>
          {/* the edit runs x~65-375 */}
          <PBInput
            w={310}
            value={search}
            title={TEMPLATE_SEARCH_HELP}
            data-tutorial-id="host.mois.field.search"
            onChange={(e) => { setSearch(e.target.value); setCur(0) }}
          />
        </div>

        <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, gap: 6, padding: '0 8px 6px' }}>
          {/* ---- the two-level list --------------------------------------
              `Recent` first, then `Letter`; the same template appears under
              both, which is what "this window shows the most recently used
              letters at the top" means.                                   */}
          <div style={{ width: TEMPLATE_PICKER.listW, flex: 'none', display: 'flex', minHeight: 0 }}>
            <PBDataWindow
              rows={rows}
              current={cur}
              onCurrentChange={setCur}
              onActivate={(t) => onSelect?.(t)}
              groupBy={(t: LetterTemplate) => t.group}
              groupLabel={(group) => group}
              groupTutorialId={(group) => `host.mois.group.${pbSlug(group)}`}
              collapsed={collapsed}
              onCollapsedChange={setCollapsed}
              rowTutorialId={(t) => `host.mois.row.${pbSlug(t.name)}`}
              /* the picker has no column-header row: the first band sits under
                 the Search field */
              head={false}
              style={{
                ['--pb-dw-row-h' as string]: `${TEMPLATE_PICKER.rowPitch}px`,
                ['--pb-dw-group' as string]: TEMPLATE_PICKER.groupFill,
                ['--pb-dw-row' as string]: TEMPLATE_PICKER.rowFill,
                ['--pb-dw-row-alt' as string]: TEMPLATE_PICKER.rowAltFill,
                ['--pb-dw-select' as string]: TEMPLATE_PICKER.selectFill,
              }}
              columns={[{ key: 'name', header: '' }]}
              empty="No templates match that search."
            />
          </div>

          {/* ---- Letter Preview -------------------------------------------
              The template as authored: #ffff9c populators, and olive/yellow
              tags for the sections its Letter Setup will offer.           */}
          <div
            className="pb-groupbox"
            style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            <PBBand>Letter Preview</PBBand>
            <div
              data-tutorial-id="host.mois.field.letter-preview"
              style={{
                flex: '1 1 auto',
                minHeight: 0,
                overflow: 'auto',
                background: '#ffffff',
                padding: '12px 16px',
                lineHeight: 1.35,
              }}
            >
              {picked && <div style={{ fontWeight: 700, marginBottom: 10 }}>{picked.name}</div>}
              {TEMPLATE_PREVIEW.map((p, i) => (
                <div key={i} style={{ marginBottom: p.gap ?? 0, minHeight: '1.4em' }}>
                  {p.tokens.map((t, j) => (
                    <span
                      key={j}
                      style={
                        t.t === 'field'
                          ? { background: LW.yellow }
                          : t.t === 'tag'
                            ? { background: LW.yellow, color: '#6b6b00', fontWeight: 700 }
                            : undefined
                      }
                    >
                      {t.s}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 19, padding: '0 0 10px', flex: 'none' }}>
          <PBButton
            className="pb-btn--default"
            style={{ width: 92 }}
            data-tutorial-id="host.mois.command.select"
            onClick={() => picked && onSelect?.(picked)}
          >
            Select (F2)
          </PBButton>
          <PBButton style={{ width: 92 }} data-tutorial-id="host.mois.command.cancel" onClick={onClose}>
            Cancel
          </PBButton>
        </div>
        </div>
      </PBWindow>
    </div>
  )
}

/* ===========================================================================
   Letter Setup
   ======================================================================== */
export function LetterSetupWindow({
  onContinue, onClose,
}: {
  onContinue?: () => void
  onClose?: () => void
}) {
  const patient = usePatient()
  const data = useChartExport()
  const nodes: Record<string, string> = { CONSULT: 'consults', ENCOUNTERS: 'encounters', 'HEALTH ISSUES': 'conditions', IMAGES: 'imaging', 'LT MEDS': 'ltm', MEASURES: 'measures', PROCEDURE: 'procedures', ALLERGIES: 'allergy', DOCUMENTS: 'documents', 'FAMILY HX': 'famhx' }
  const [rows, setRows] = useState<LetterSetupRow[]>(() => LETTER_SETUP_ROWS.map(row => {
    const count = recordsForNode(data, nodes[row.section] ?? '').length
    return { ...row, available: count, selected: 0, attachAvailable: 0, attachSelected: 0, tooltip: undefined }
  }))
  const p = { ...patient, phn: patient.bchn ?? '', phnSuffix: patient.dep ?? '' }

  const setAction = (section: string, action: 'all' | 'choose') =>
    setRows((v) => v.map((r) => (r.section === section ? { ...r, action } : r)))

  const C = LETTER_SETUP_COLUMNS

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <style href="mois-classic/letter-setup" precedence="medium">{SETUP_CAPTION}</style>
      <PBWindow
        child
        controls={false}
        title="Letter Setup"
        className="pb-window--mois-lettersetup"
        onClose={onClose}
        style={{
          width: `min(${C.width}px, calc(100vw - 40px))`,
          height: `min(${C.height}px, calc(100vh - 60px))`,
        }}
      >
        <div
          data-tutorial-id="host.mois.dialog.letter-setup"
          style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}
        >
        {/* window face down to the rule at y=43, then the banner from y=44 */}
        <div style={{ height: 13, flex: 'none' }} />
        <div style={{ height: 1, background: LW.rule, flex: 'none' }} />

        {/* --- #ffffc0 patient banner ----------------------------------- */}
        <div
          className="pb-banner-yellow"
          data-tutorial-id="host.mois.field.patient-banner"
          style={{ display: 'block', background: '#ffffc0', flex: 'none' }}
        >
          <div className="pb-row" style={{ gap: 0 }}>
            <span>FIRST:&nbsp;</span><b>{p.first}</b>
            <span style={{ width: 24 }} /><span>MIDDLE:&nbsp;</span><b>{p.middle}</b>
            <span style={{ width: 24 }} /><span>LAST:&nbsp;</span><b>{p.last}</b>
            <span style={{ width: 24 }} /><span>DoB:&nbsp;</span><b>{p.dob}</b>
            <span style={{ width: 16 }} /><b>{p.sex}</b>
          </div>
          <div className="pb-row" style={{ gap: 0 }}>
            <span>PHN:&nbsp;</span><b>{p.phn}</b>
            <span style={{ width: 12 }} /><b>{p.phnSuffix}</b>
            <span style={{ width: 24 }} /><span>Home:&nbsp;</span><b>{p.home}</b>
            <span style={{ width: 24 }} /><span>Work:&nbsp;</span><b>{p.work}</b>
            <span style={{ width: 24 }} />
            {/* `Cell:` is a blue underlined link in the capture */}
            <button className="pb-link" data-tutorial-id="host.mois.field.cell">Cell:</button>
            <span>&nbsp;</span><b>{p.cell}</b>
          </div>
        </div>

        {/* --- Letter Details ------------------------------------------- */}
        <div className="pb-band" data-tutorial-id="host.mois.group.letter-details">
          <span>Letter Details</span>
        </div>
        <div style={{ padding: '5px 10px', flex: 'none' }}>
          <div className="pb-row" style={{ gap: 6, marginBottom: 3 }}>
            <span className="pb-form__label" style={{ width: 110 }}>Author:</span>
            <PBLookup w={300} name="Author" defaultValue="" />
          </div>
          <div className="pb-row" style={{ gap: 6 }}>
            <span className="pb-form__label" style={{ width: 110 }}>Primary Recipient:</span>
            {/* the ellipsis opens the Master Provider List, which is named in
                prose but captured in NO article — so it is not built here */}
            <PBLookup w={300} name="Primary Recipient" defaultValue="" />
          </div>
        </div>

        {/* --- Patient Records ------------------------------------------- */}
        <div className="pb-band" data-tutorial-id="host.mois.group.patient-records">
          <span>Patient Records</span>
        </div>

        {/* The two-tier header (`Records` and `Attachments` each spanning an
            Available/Selected pair) is why this grid is a table of its own
            rather than a PBDataWindow: the kit's grid has one header row. It
            uses the kit's own classes, so it is the same DataWindow. */}
        <div
          className="pb-dw"
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            margin: '3px 5px',
            ['--pb-dw-row-h' as string]: `${C.rowPitch}px`,
          }}
        >
          <div className="pb-dw__scroll">
            <table className="pb-dw__table">
              <colgroup>
                <col style={{ width: C.section }} />
                <col style={{ width: C.recordsAvailable }} />
                <col style={{ width: C.recordsSelected }} />
                <col style={{ width: C.action }} />
                <col style={{ width: C.attachAvailable }} />
                <col style={{ width: C.attachSelected }} />
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2} title={LETTER_SETUP_GLOSSARY.Section}>Section</th>
                  <th colSpan={2}>Records</th>
                  <th rowSpan={2}>Action</th>
                  <th colSpan={2}>Attachments</th>
                </tr>
                <tr>
                  <th title={LETTER_SETUP_GLOSSARY.Available}>Available</th>
                  <th title={LETTER_SETUP_GLOSSARY.Selected}>Selected</th>
                  <th title={LETTER_SETUP_GLOSSARY.Available}>Available</th>
                  <th title={LETTER_SETUP_GLOSSARY.Selected}>Selected</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const dim = r.disabled ? { color: '#808080' } : undefined
                  return (
                    <tr key={r.section}>
                      <td
                        style={dim}
                        /* the row runs the full window width, so the anchor
                           goes on the Section cell */
                        data-tutorial-id={`host.mois.cell.section-${pbSlug(r.section)}`}
                        /* the capture catches this tooltip live on LT MEDS,
                           where Selected is one short of Available */
                        title={r.tooltip}
                      >
                        {r.section}
                      </td>
                      <td className="pb-dw__c--center" style={dim}>{r.available || ''}</td>
                      <td className="pb-dw__c--center" style={dim}>{r.selected || ''}</td>
                      <td style={dim}>
                        {r.actionText ? r.actionText : (
                          <span className="pb-row" style={{ gap: 12 }}>
                            <PBRadio
                              name={`act-${pbSlug(r.section)}`}
                              label={<span title={LETTER_SETUP_GLOSSARY['Select All']}>Select All</span>}
                              checked={r.action === 'all'}
                              onChange={() => setAction(r.section, 'all')}
                            />
                            <PBRadio
                              name={`act-${pbSlug(r.section)}`}
                              label={<span title={LETTER_SETUP_GLOSSARY.Choose}>Choose</span>}
                              checked={r.action === 'choose'}
                              onChange={() => setAction(r.section, 'choose')}
                            />
                            {r.action === 'choose' && (
                              <button
                                className="pb-link"
                                data-tutorial-id={`host.mois.command.choose-records-${pbSlug(r.section)}`}
                              >
                                Choose Records
                              </button>
                            )}
                            {r.action === 'all' && r.stoppedRecords && (
                              /* only HEALTH ISSUES and LT MEDS offer this,
                                 and it is unchecked by default */
                              <PBCheckbox label="Include Stopped Records" />
                            )}
                          </span>
                        )}
                      </td>
                      <td className="pb-dw__c--center" style={dim}>{r.attachAvailable || ''}</td>
                      <td className="pb-dw__c--center" style={dim}>{r.attachSelected || ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Measured butted, not gapped: Continue x 360-452 (92), Cancel
            x 452-551 (99), both 22px tall. */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 0, padding: '6px 0 10px', flex: 'none' }}>
          <PBButton
            className="pb-btn--default"
            style={{ width: 92, height: 22 }}
            data-tutorial-id="host.mois.command.continue"
            onClick={onContinue}
          >
            Continue (F2)
          </PBButton>
          <PBButton
            style={{ width: 99, height: 22 }}
            data-tutorial-id="host.mois.command.cancel"
            onClick={onClose}
          >
            Cancel
          </PBButton>
        </div>
        </div>
      </PBWindow>
    </div>
  )
}
