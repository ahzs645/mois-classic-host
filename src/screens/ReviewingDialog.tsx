import { useState, type ReactNode } from 'react'
import { PBBand, PBButton, PBDataWindow, PBTextArea, PBWindow, pbSlug } from '../pb'
import {
  REVIEW_NOUNS, REVIEW_TODAY, REVIEW_USER, reviewHistory, type ReviewRow,
} from '../data/chartUtilities'
import { usePatient } from '../data/patient-context'

/* ============================================================================
   Reviewing: <folder> — the Patient Chart's Taskbar `Review`.

   Available from Allergy / Intolerances ▸ Reaction Risks, Long Term Meds and
   Health Issues ▸ Conditions. The window shows who has reviewed this folder
   for this patient and when; `Mark Reviewed` files a new one under the
   current user with whatever is in the Note box, and the folder's workspace
   title then gains `- (yyyy.mm.dd)`.

   The title's noun tracks the folder — only `Reviewing: Health Condition` was
   ever captured; see `REVIEW_NOUNS` for the two that are derived rather than
   measured.

   PROVENANCE: `303791 / 7d42bca76bd7` @1.00x — window x 460–1040 (w 581),
   y 178–≈672, flat white title bar 25 tall. Note the Review History column
   header band is `#A6CAF0`, not the `#C8DCFA` every other MOIS grid uses.
   ========================================================================= */

const W = 581
const H = 494
const TITLEBAR_H = 25

/** capture x → window x */
const x = (captureX: number) => captureX - 460
/** capture y → client y */
const y = (captureY: number) => captureY - 178 - TITLEBAR_H

/** A `Patient` / `Review History` / `Mark Reviewed` band: #DCD7D2, 20 tall. */
function Band({ top, children }: { top: number; children: ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute', left: 0, right: 0, top,
        ['--pb-band' as string]: '#dcd7d2',
        ['--pb-band-h' as string]: '20px',
      }}
    >
      <PBBand>{children}</PBBand>
    </div>
  )
}

/** One read-only `Label: value` pair in the Patient block. */
function Stat({ left, top, label, value }: { left: number; top: number; label: string; value: ReactNode }) {
  return (
    <span className="pb-row" style={{ position: 'absolute', left, top, gap: 5 }}>
      <span className="pb-form__label">{label}</span>
      <span>{value}</span>
    </span>
  )
}

export function ReviewingDialog({ node, onClose }: {
  /** the folder that invoked Review — it picks the window's noun */
  node: string
  onClose: () => void
}) {
  const patient = usePatient()
  const noun = REVIEW_NOUNS[node]
  const [rows, setRows] = useState<ReviewRow[]>(reviewHistory)
  const [note, setNote] = useState('')

  if (!noun) return null

  const markReviewed = () => {
    setRows((r) => [{ date: REVIEW_TODAY, by: REVIEW_USER, note }, ...r])
    setNote('')
  }

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <PBWindow
        child
        controls={false}
        title={`Reviewing: ${noun}`}
        onClose={onClose}
        style={{ width: W, height: H, ['--pb-titlebar-h' as string]: `${TITLEBAR_H}px` }}
      >
        <div
          data-tutorial-id="host.mois.dialog.reviewing"
          style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, background: 'var(--pb-face)' }}
        >
          <Band top={y(211)}>Patient</Band>

          {/* read-only statics in two rows; the capture's chart is the
              training environment's, this one's is whatever chart is open */}
          <Stat left={x(467)} top={y(236)} label="Chart:" value={patient.chart} />
          <Stat left={x(560)} top={y(236)} label="Patient:" value={`${patient.last}, ${patient.first}`} />
          <Stat left={x(820)} top={y(236)} label="DoB:" value={patient.dob} />
          <Stat left={x(467)} top={y(256)} label="Sex:" value={patient.sex} />
          <Stat left={x(560)} top={y(256)} label="BC Health No.:" value={patient.bchn ?? ''} />

          <Band top={y(278)}>Review History</Band>

          {/* grid x 467–1032. The column widths are inferred from the blank
              first-row cells — this grid paints no column separators, so they
              are not measured off rules (spec §13.8). */}
          <div
            style={{
              position: 'absolute', left: x(467), width: x(1032) - x(467),
              top: y(299), height: y(552) - y(299) - 6, display: 'flex',
            }}
          >
            <PBDataWindow
              rows={rows}
              gutter={false}
              rowTutorialId={(r) => `host.mois.row.review-${pbSlug(r.date)}`}
              columns={[
                { key: 'date', header: 'Review Date', width: 89 },
                { key: 'by', header: 'Reviewed By', width: 88 },
                { key: 'note', header: 'Note', width: 389 },
              ]}
              empty="This folder has not been reviewed for this patient."
              style={{
                flex: '1 1 auto', minWidth: 0,
                /* v2.30 Cloud chart grid: ≈19–20px pitch under an 18px band,
                   and the band is #A6CAF0 here rather than #C8DCFA */
                ['--pb-dw-row-h' as string]: '19px',
                ['--pb-dw-header' as string]: '#a6caf0',
                ['--pb-dw-row-alt' as string]: '#e6e6e6',
              }}
            />
          </div>

          <Band top={y(552)}>Mark Reviewed</Band>

          <span className="pb-form__label" style={{ position: 'absolute', left: x(480), top: y(581) }}>Note:</span>
          <PBTextArea
            w={x(1013) - x(519)}
            value={note}
            data-tutorial-id="host.mois.field.review-note"
            onChange={(e) => setNote(e.target.value)}
            style={{ position: 'absolute', left: x(519), top: y(579), height: 44 }}
          />

          <span style={{ position: 'absolute', left: x(638), top: y(640) }}>
            <PBButton
              style={{ width: 98, height: 21, minWidth: 0 }}
              data-tutorial-id="host.mois.command.mark-reviewed"
              onClick={markReviewed}
            >
              Mark Reviewed
            </PBButton>
          </span>
          <span style={{ position: 'absolute', left: x(751), top: y(640) }}>
            <PBButton
              style={{ width: 75, height: 21, minWidth: 0 }}
              data-tutorial-id="host.mois.command.review-close"
              onClick={onClose}
            >
              Close
            </PBButton>
          </span>
        </div>
      </PBWindow>
    </div>
  )
}
