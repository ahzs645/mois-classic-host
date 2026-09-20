import { useState, type CSSProperties } from 'react'
import { PBButton, PBDropField, PBGroup, PBInput, PBWindow } from '../pb'
import { tagCarePlanRecords, type TagCarePlanRecord } from '../data/chartUtilities'

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

   Gaps left deliberately (spec §13.10): the `Section` drop-down's list is not
   in the corpus — only the prefilled `CONSULTS` is ever shown — so the arrow
   drops nothing, and `Rank` has no documented semantics beyond "the rank".
   ========================================================================= */

const W = 436
const H = 275
const TITLEBAR_H = 21

/** capture y → client y */
const y = (captureY: number) => captureY - 393 - TITLEBAR_H

/** The greyed labels and read-only grey faces of the Record Information group. */
const READONLY: CSSProperties = { background: 'var(--pb-field-ro)' }

export function TagToCarePlanDialog({ node, record, onOk, onClose }: {
  /** the folder the record was right-clicked in */
  node?: string
  /** or the record itself, when the caller already has it */
  record?: TagCarePlanRecord
  onOk?: (section: string, rank: string) => void
  onClose: () => void
}) {
  /* Only the Consults record was captured. A caller tagging out of another
     folder passes its own; nothing here derives one, because the Category and
     Section vocabularies are not in the corpus. */
  const rec = record ?? (node ? tagCarePlanRecords[node] : undefined) ?? tagCarePlanRecords.consults!
  const [section, setSection] = useState(rec.section)
  const [rank, setRank] = useState('0')

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
                <PBDropField
                  w={200}
                  value={section}
                  onChange={setSection}
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
              onClick={() => onOk?.(section, rank)}
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
