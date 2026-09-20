import { useState, type ReactNode } from 'react'
import { PBBand, PBButton, PBCheckbox, PBDropField, PBInput, PBRadio, PBWindow } from '../pb'
import { CHART_SEARCH_MATCHES, CHART_SEARCH_NOTE, type ChartSearchMatch } from '../data/chartUtilities'

/* ============================================================================
   Advance Chart Search — the Patient Chart's Taskbar `Search`.

   Available from the Patient Summary and Demographic folders only. Ok opens a
   Search Results dialog, which is never captured or described anywhere in the
   corpus (spec §13.1) — so Ok here reports the search and closes, and this
   file deliberately does not invent that window.

   The title really is `Advance Chart Search`: the manual body calls it the
   "Advanced Chart Search Selection Parameter dialog", but the window itself
   is missing the d. The third match option really is `Begins\W`, with a
   backslash, where the body writes "Begins with".

   PROVENANCE: `301562 / 4118f296000c` @1.00x — dialog x 462–990, y 228–698.
   Every x below is the capture's, less the dialog's own left edge (462);
   every y is the capture's, less its top edge (228) and its 25px title bar.
   ========================================================================= */

const W = 529
const H = 471
const TITLEBAR_H = 25

/** capture x → dialog x */
const x = (captureX: number) => captureX - 462
/** capture y → client y */
const y = (captureY: number) => captureY - 228 - TITLEBAR_H

/** Every field is left-aligned on x 571; the labels end 4px short of it. */
const FIELD_X = x(571)

function Field({
  label, top, width, children,
}: { label: string; top: number; width: number; children?: ReactNode }) {
  return (
    <>
      <span
        className="pb-form__label"
        style={{ position: 'absolute', right: `calc(100% - ${FIELD_X - 4}px)`, top: top + 1 }}
      >
        {label}
      </span>
      <span style={{ position: 'absolute', left: FIELD_X, top, width }}>{children}</span>
    </>
  )
}

/** The #C0C0C0 rules that divide the dialog's four sections. */
function Rule({ top }: { top: number }) {
  return <div style={{ position: 'absolute', left: 8, right: 8, top, height: 1, background: '#c0c0c0' }} />
}

/** Circles Ø12, pitch 66, starting at capture x 716. */
const MATCH_X = [716, 782, 848, 914].map(x)

/** The four single-field rows under the three name rows; all 98 wide. */
const IDENTIFIERS: { label: string; slug: string; top: number }[] = [
  { label: 'Home Number:', slug: 'home-number', top: 364 },
  { label: 'Date of Birth:', slug: 'date-of-birth', top: 385 },
  { label: 'Insurance No.:', slug: 'insurance-no', top: 406 },
  { label: 'BC Health No.:', slug: 'bc-health-no', top: 427 },
]

/** The three name rows, in the order the dialog paints them. */
const NAMES: { label: string; slug: string }[] = [
  { label: 'First Name:', slug: 'first-name' },
  { label: 'Middle Name:', slug: 'middle-name' },
  { label: 'Last Name:', slug: 'last-name' },
]

export function AdvanceChartSearchDialog({ onOk, onClose }: {
  /** Ok — the Search Results dialog it opens is not in the corpus */
  onOk?: () => void
  onClose: () => void
}) {
  /* `Contains` is selected on all three name rows in the capture */
  const [match, setMatch] = useState<ChartSearchMatch[]>(['Contains', 'Contains', 'Contains'])
  const [archives, setArchives] = useState(false)

  const setRow = (row: number, v: ChartSearchMatch) =>
    setMatch((m) => m.map((old, i) => (i === row ? v : old)))

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 80 }}>
      <PBWindow
        child
        controls={false}
        title="Advance Chart Search"
        onClose={onClose}
        style={{ width: W, height: H, ['--pb-titlebar-h' as string]: `${TITLEBAR_H}px` }}
      >
        <div
          data-tutorial-id="host.mois.dialog.advance-chart-search"
          style={{
            position: 'relative', flex: '1 1 auto', minHeight: 0,
            background: 'var(--pb-face)',
            /* the capture's fields are 17px tall, not the kit's 19 */
            ['--pb-row-h' as string]: '17px',
          }}
        >
          {/* the window's one group band: #DCD7D2, 25px tall */}
          <div
            style={{
              position: 'absolute', left: 0, right: 0, top: y(261),
              ['--pb-band' as string]: '#dcd7d2',
              ['--pb-band-h' as string]: '25px',
            }}
          >
            <PBBand>Selection Parameter</PBBand>
          </div>

          {/* --- the three name rows: an edit plus a four-way match group --- */}
          {NAMES.map((name, row) => {
            const top = y(301 + row * 21)
            return (
              <div key={name.label}>
                <Field label={name.label} top={top} width={141}>
                  <PBInput w={141} data-tutorial-id={`host.mois.field.chart-search-${name.slug}`} />
                </Field>
                {CHART_SEARCH_MATCHES.map((option, i) => (
                  <span key={option} style={{ position: 'absolute', left: MATCH_X[i], top: top + 1 }}>
                    <PBRadio
                      name={`chart-search-match-${row}`}
                      label={option}
                      checked={match[row] === option}
                      onChange={() => setRow(row, option)}
                    />
                  </span>
                ))}
              </div>
            )
          })}

          {/* --- the four identifier rows, all 98 wide --- */}
          {IDENTIFIERS.map((f) => (
            <Field key={f.label} label={f.label} top={y(f.top)} width={98}>
              <PBInput w={98} data-tutorial-id={`host.mois.field.chart-search-${f.slug}`} />
            </Field>
          ))}

          <Rule top={y(449)} />

          {/* --- Patient Alias ID --- */}
          <span style={{ position: 'absolute', left: 8, top: y(460) }}>Patient Alias ID:</span>
          {/* the Type list's contents are not in the corpus, so the arrow
              drops nothing */}
          <Field label="Type:" top={y(478)} width={203}>
            <PBDropField w={203} />
          </Field>
          <Field label="Value:" top={y(498)} width={141}>
            <PBInput w={141} data-tutorial-id="host.mois.field.chart-search-alias-value" />
          </Field>

          <Rule top={y(525)} />

          {/* --- Archives: the checkbox sits on x 572, one past the fields --- */}
          <span
            className="pb-form__label"
            style={{ position: 'absolute', right: `calc(100% - ${FIELD_X - 4}px)`, top: y(537) }}
          >
            Archives:
          </span>
          <span style={{ position: 'absolute', left: x(572), top: y(537) }}>
            <PBCheckbox
              label="Include Archive Charts in the search"
              checked={archives}
              onChange={setArchives}
            />
          </span>

          <Rule top={y(562)} />

          <span style={{ position: 'absolute', left: 8, top: y(585), width: W - 24, whiteSpace: 'normal' }}>
            <span className="pb-form__label" style={{ marginRight: 4 }}>Note:</span>
            {CHART_SEARCH_NOTE}
          </span>

          {/* Ok is drawn as the default button with a 2px #0078D7 border; the
              kit's --default is a 1px accent border, so the second pixel is
              laid on as an inset ring. */}
          <span style={{ position: 'absolute', left: x(646), top: y(661) }}>
            <PBButton
              className="pb-btn--default"
              style={{ width: 75, height: 21, minWidth: 0, boxShadow: 'inset 0 0 0 1px #0078d7' }}
              data-tutorial-id="host.mois.command.chart-search-ok"
              onClick={onOk}
            >
              Ok
            </PBButton>
          </span>
          <span style={{ position: 'absolute', left: x(733), top: y(661) }}>
            <PBButton
              style={{ width: 75, height: 21, minWidth: 0, borderColor: '#adadad' }}
              data-tutorial-id="host.mois.command.chart-search-cancel"
              onClick={onClose}
            >
              Cancel
            </PBButton>
          </span>
        </div>
      </PBWindow>
    </div>
  )
}
