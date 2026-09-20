import { useEffect, useState } from 'react'
import {
  PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBSelect, PBViewHeader, pbSlug,
} from '../pb'

const cx = (...v: (string | false | undefined)[]) => v.filter(Boolean).join(' ')
import {
  BASKET_COMMAND_WIDTH, basketCommands, basketFolderById,
  type BasketFolder, type BasketRow,
} from '../data/basket'

/* ============================================================================
   A Workspace Basket folder — "Acknowledge - Measures" and its seven siblings.

   Transcribed from `source_info.PNG`, `AcknowledgeManualEntries.PNG`,
   `checked_since.PNG` and `review.PNG` (MOIS v02.21.18): a nine-button
   command row, a Search For / Showing Records filter strip with a rule
   between the two halves, and a flat grid whose Check column is the point of
   the screen.

   The behaviours the manual describes and this reproduces:
     · ticking Check greys the row's ink (#606060) but leaves it in place;
       Refresh — or F2, which in the Basket also saves — drops it from the
       Not Checked list (art. ID303756)
     · Showing Records switches between Not Checked and Checked, and Since is
       enabled only for the latter (art. ID303763)
     · an abnormal result paints four cells yellow — Test Name, Value, Units
       and Flag — not the whole row
     · the T column is A for an acknowledgement and a bold R for a review
     · the paperclip column shows a count, or "-" for none
   ========================================================================= */

/** Showing Records has exactly two entries in the capture. */
const SHOWING = ['Not Checked', 'Checked']

export function BasketFolderView({
  node, onOpenChart, onAcknowledged,
}: {
  node: string
  onOpenChart?: () => void
  /** how many items this folder has had acknowledged, so a lesson can grade it */
  onAcknowledged?: (count: number) => void
}) {
  const folder: BasketFolder | undefined = basketFolderById(node)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [saved, setSaved] = useState<Set<number>>(new Set())
  const [showing, setShowing] = useState(SHOWING[0]!)
  const [cur, setCur] = useState(0)

  if (!folder) return null

  const wantChecked = showing === 'Checked'
  const shown = folder.rows
    .map((r, i) => ({ r, i }))
    .filter(({ i }) => saved.has(i) === wantChecked)

  const refresh = () => setSaved(new Set(checked))
  useEffect(() => { onAcknowledged?.(saved.size) }, [onAcknowledged, saved])

  return (
    <>
      {/* the banner is not always the tree label: Imaging shows "Images",
          and the singular Progress Note node shows "Progress Notes" */}
      <PBViewHeader title={folder.header} right={<span>Your Workspace</span>} />
      <PBCommandRow commands={basketCommands(folder).map((label) => ({
        label,
        width: BASKET_COMMAND_WIDTH[label] ?? 81,
        onClick: label === 'Refresh' ? refresh : label === 'Open Chart' ? onOpenChart : undefined,
      }))} />

      {/* the filter strip: Search For on the left, Showing Records on the
          right, with a 1px #646464 rule between them */}
      <div className="pb-row" style={{ gap: 6, padding: '4px 6px', background: '#f0f0f0', flex: 'none', alignItems: 'center' }}>
        <span className="pb-form__label">Search For:</span>
        <PBInput w={420} />
        <button className="pb-inputgroup__btn pb-inputgroup__btn--dots" type="button" title="Advanced search…">…</button>
        <span style={{ width: 1, alignSelf: 'stretch', background: '#646464', margin: '0 8px' }} />
        <span className="pb-form__label">Showing Records:</span>
        <PBSelect
          w={113}
          options={SHOWING}
          value={showing}
          onChange={(e) => { setShowing(e.target.value); setCur(0) }}
        />
        <span className="pb-form__label" style={{ marginLeft: 8 }}>Since:</span>
        <PBInput w={96} disabled={!wantChecked} defaultValue={wantChecked ? '2026.03.01' : ''} />
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow
          rows={shown.map(({ r }) => r)}
          current={cur}
          onCurrentChange={setCur}
          onActivate={onOpenChart}
          rowClassName={(_r, n) => (checked.has(shown[n]!.i) ? 'pb-dw--checked' : undefined)}
          rowTutorialId={(r) => `host.mois.row.basket-${pbSlug(String(r.patient).split(',')[0] ?? '')}`}
          columns={folder.columns.map((c) => {
            if (c.key === 'check') {
              return {
                ...c,
                render: (r: BasketRow, n: number) => {
                  const i = shown[n]!.i
                  return (
                    <span style={{ display: 'block' }}>
                      <PBCheckbox
                        tutorialId={`host.mois.check.${pbSlug(String(r.patient).split(',')[0] ?? '')}`}
                        checked={checked.has(i)}
                        onChange={(v) => setChecked((s) => {
                          const next = new Set(s)
                          v ? next.add(i) : next.delete(i)
                          return next
                        })}
                      />
                    </span>
                  )
                },
              }
            }
            if (c.key === 't') {
              return { ...c, render: (r: BasketRow) => (r.t === 'R' ? <b>R</b> : r.t) }
            }
            /* the cells that carry the abnormal highlight — four in Measures
               (Units included even when empty), two in Imaging. Selection
               beats the flag: a flagged row that is current shows no yellow. */
            if (folder.abnormalCells?.includes(c.key)) {
              return {
                ...c,
                render: (r: BasketRow, n: number) => (
                  <span
                    style={r.abnormal && n !== cur
                      ? { background: '#ffff60', display: 'block', margin: '0 -4px', padding: '0 4px' }
                      : undefined}
                  >
                    {String(r[c.key] ?? '')}
                  </span>
                ),
              }
            }
            return c
          })}
          empty={wantChecked ? 'Nothing has been checked yet.' : 'Nothing is waiting in this folder.'}
        />
      </div>
      {/* Report / Detail / Panel — Documents and Progress Notes have Report only */}
      <div className="pb-row" style={{ gap: 0, padding: '0 3px', flex: 'none' }}>
        {folder.tabs.map((t, i) => (
          <span
            key={t}
            className={cx('pb-tabs__tab', i === 0 && 'is-active')}
            style={{ minWidth: 96, textAlign: 'center' }}
          >
            {t}
          </span>
        ))}
      </div>
    </>
  )
}
