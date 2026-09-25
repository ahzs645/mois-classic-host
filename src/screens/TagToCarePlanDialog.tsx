import { useState, type CSSProperties } from 'react'
import { recordsForNode, useChartExport } from '../data/chart-records'
import { CARE_PLAN_SECTIONS } from '../data/carePlanRows'
import { addCarePlanTag } from '../data/chartSession'
import { tagCarePlanRecords, type TagCarePlanRecord } from '../data/chartUtilities'
import type { MoisChartExport, MoisRecord } from '../data/charts'
import { usePatient } from '../data/patient-context'
import { PBButton, PBGroup, PBInput, PBSelect, PBWindow } from '../pb'

/* ============================================================================
   Tag Information to Care Plan — the right-click option list's
   `Tag to Care Plan`.

   Absolute tagging: one specific record, from anywhere in the chart, pinned
   into a section of the Care Plan Summary at a rank. (Relative tagging — a
   rule for an always-changing value such as the most recent BP — is done in
   the Care Plan Elements folder, not here, and elements are removed there
   too.)

   This window is the one in the family with no `#DCD7D2` band: it is two
   plain framed groups with bold navy `#000078` headings.

   PROVENANCE: `304731 / fc801c1cfa93` @1.00x (a v2.20 build with a Win7 Aero
   caption and a boxed close glyph) — dialog x ≈379–814, y ≈393–667, title bar
   21 tall.

   The record is the one current in the folder behind (the first row, as the
   folder opens): Category is the folder, Code and the description are the
   record's own, and Section is prefilled from the folder — CONSULT / 25061 /
   NEUROPATHY - DIABETIC / CONSULTS in the capture. OK files the tag, and the
   record then shows in the Care Plan summary under that section.

   The Section drop-down offers the summary's own section names (2070139
   `3d93f580…`); `Rank` has no documented semantics beyond "the rank".
   ========================================================================= */

/** Category and Section per folder; the capture shows only Consults. */
const FOLDER_TAG: Record<string, { category: string; section: string; code: (r: MoisRecord) => string; description: (r: MoisRecord) => string }> = {
  consults: { category: 'CONSULT', section: 'CONSULTS', code: (r) => r.str_code ?? '', description: (r) => r.str_description ?? r.str_code_term ?? '' },
  imaging: { category: 'IMAGE', section: 'GENERAL', code: (r) => r.str_code ?? '', description: (r) => r.str_description ?? '' },
  procedures: { category: 'PROCEDURE', section: 'GENERAL', code: (r) => r.str_code ?? '', description: (r) => r.str_description ?? '' },
  measures: { category: 'MEASURE', section: 'MEASUREMENTS', code: (r) => r.str_loinic_num ?? r.str_code ?? '', description: (r) => r.str_description ?? r.str_order_name ?? '' },
  conditions: { category: 'HEALTH ISSUE', section: 'HEALTH ISSUES', code: (r) => r.str_icd ?? '', description: (r) => r.str_problem_name ?? '' },
  admissions: { category: 'FACILITY ADMISSION', section: 'GENERAL', code: (r) => r.str_code ?? '', description: (r) => r.str_description ?? '' },
}

/** What the window shows for a record of `node`: the one right-clicked
    (`source`), or the folder's first as it opens. The right-click Option List
    (screens/RecordOptionList.tsx) reuses it to name the record it acts on. */
export function tagRecordFor(node: string | undefined, data: MoisChartExport | null, source?: MoisRecord): TagCarePlanRecord & { date: string } {
  const spec = node ? FOLDER_TAG[node] : undefined
  const r = spec ? (source ?? recordsForNode(data, node!)[0]) : undefined
  if (spec && r) {
    const date = (r.dtm_ord_date ?? r.dtm_start ?? r.dtm_collect_date ?? '').split(' ')[0]!.replace(/\//g, '.')
    return { category: spec.category, code: spec.code(r), description: spec.description(r), section: spec.section, date }
  }
  const fallback = node ? tagCarePlanRecords[node] : undefined
  return { ...(fallback ?? { category: '', code: '', description: '', section: '' }), date: '' }
}

const W = 436
const H = 275
const TITLEBAR_H = 21

/** capture y → client y */
const y = (captureY: number) => captureY - 393 - TITLEBAR_H

/** The greyed labels and read-only grey faces of the Record Information group. */
const READONLY: CSSProperties = { background: 'var(--pb-field-ro)' }

export function TagToCarePlanDialog({ node, source, record, onOk, onClose }: {
  /** the folder the record was right-clicked in */
  node?: string
  /** the record right-clicked, when it is not the folder's first */
  source?: MoisRecord
  /** or the record itself, when the caller already has it */
  record?: TagCarePlanRecord
  onOk?: (section: string, rank: string) => void
  onClose: () => void
}) {
  const patient = usePatient()
  const data = useChartExport()
  const rec = record ? { ...record, date: '' } : tagRecordFor(node, data, source)
  const [section, setSection] = useState(rec.section)
  const [rank, setRank] = useState('0')
  const ok = () => {
    if (rec.description) {
      addCarePlanTag(patient.chart, {
        section: section || 'GENERAL', rank, date: rec.date, description: rec.description,
        detail: '', category: rec.category, code: rec.code,
      })
    }
    onOk?.(section, rank)
  }

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <PBWindow
        child
        controls={false}
        title="Tag Information to Care Plan"
        onClose={onClose}
        style={{ width: W, height: H, ['--pb-titlebar-h' as string]: `${TITLEBAR_H}px` }}
      >
        <div
          data-tutorial-id="host.mois.dialog.tag-to-care-plan"
          style={{
            position: 'relative', flex: '1 1 auto', minHeight: 0,
            background: 'var(--pb-face)',
            /* the two group captions are #000078, a shade darker than the
               #000080 the rest of the kit paints a navy caption in */
            ['--pb-text-head' as string]: '#000078',
          }}
        >
          {/* group 1 runs from the top of the client area down to y ≈487 */}
          <div style={{ position: 'absolute', left: 10, right: 10, top: 8, height: y(487) - 8 }}>
            <PBGroup title="Record Information">
              <div className="pb-row" style={{ gap: 6, padding: '4px 0' }}>
                <span className="pb-form__label pb-form__label--dim">Category</span>
                <PBInput w={150} readOnly value={rec.category} style={READONLY} />
              </div>
              <div className="pb-row" style={{ gap: 6, padding: '2px 0 4px' }}>
                <span className="pb-form__label pb-form__label--dim">Code:</span>
                <PBInput w={64} readOnly value={rec.code} style={READONLY} />
                {/* the wide description shares the row and carries no label */}
                <PBInput w={218} readOnly value={rec.description} style={READONLY} />
              </div>
            </PBGroup>
          </div>

          {/* group 2 begins where group 1 ends; its body is otherwise empty —
              a large blank area down to y ≈620 in the capture */}
          <div style={{ position: 'absolute', left: 10, right: 10, top: y(487), height: y(628) - y(487) }}>
            <PBGroup title="Care Plan Location" fill style={{ height: '100%' }}>
              <div className="pb-row" style={{ gap: 6, padding: '4px 0' }}>
                <span className="pb-form__label">Section:</span>
                <PBSelect
                  w={200}
                  value={section}
                  options={['', ...CARE_PLAN_SECTIONS]}
                  data-tutorial-id="host.mois.field.care-plan-section"
                  onChange={(e) => setSection(e.target.value)}
                />
              </div>
              <div className="pb-row" style={{ gap: 6, padding: '2px 0' }}>
                <span className="pb-form__label">Rank:</span>
                <PBInput
                  w={44}
                  align="center"
                  value={rank}
                  data-tutorial-id="host.mois.field.care-plan-rank"
                  onChange={(e) => setRank(e.target.value)}
                />
              </div>
            </PBGroup>
          </div>

          <div
            style={{
              position: 'absolute', left: 0, right: 0, top: y(635),
              display: 'flex', justifyContent: 'center', gap: 14,
            }}
          >
            <PBButton
              style={{ width: 75, minWidth: 0 }}
              data-tutorial-id="host.mois.command.tag-to-care-plan-ok"
              onClick={ok}
            >
              Ok
            </PBButton>
            <PBButton
              style={{ width: 75, minWidth: 0 }}
              data-tutorial-id="host.mois.command.tag-to-care-plan-cancel"
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
