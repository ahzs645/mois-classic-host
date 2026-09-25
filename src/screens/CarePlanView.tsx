import { useState } from 'react'
import { useChartExport, useChartRows, useNodeRecords } from '../data/chart-records'
import type { MoisRecord } from '../data/charts'
import { stamp } from '../data/charts/detail'
import { linkedGoals } from '../data/charts/relations'
import { carePlanScreens, type CarePlanKey } from '../data/mois'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import {
  PBBand, PBCheckbox, PBCommandRow, PBDataWindow, PBDropField, PBIdentityStrip, PBInput, PBLookup,
  PBSlider, PBTextArea, PBViewHeader, type PBColumn, type PBCommand,
} from '../pb'

/* Needs for Care, Planned Actions, Barriers to Care, Risks for Conditions and
   Conditions are all the same PowerBuilder window with a different DataWindow
   bound to it: identity strip, search, a list, then a Detail tab beside one or
   more read-only "Linked X" tabs.

   The Detail *page* is not shared. The field audit captures five different
   panes behind the one tab, so the pane is keyed off the screen here rather
   than assembled from `carePlanScreens`:

     needs       MATRIX-R0869-need-description
     risks       MATRIX-R0847-rank
     conditions  MATRIX-R0830-severity
     actions     MATRIX-R0970-action
     barriers    MATRIX-R0993-barrier-to-care                                */

type Row = Record<string, any>

/* art. MATRIX-R0830-severity: Condition is the one screen in the family that
   carries two extra commands and a review band over the grid. */

export function CarePlanView({ screen, onNew }: { screen: CarePlanKey; onNew?: () => void }) {
  /* a chart with a real export behind it lists its own records */
  const exportedRows = useChartRows(screen)
  const patient = usePatient()
  const cfg = carePlanScreens[screen]
  const rows = exportedRows
  const [tab, setTab] = useState<string>(cfg.tabs[0])
  const data = useChartExport()
  const records = useNodeRecords(screen)
  const [cur, setCur] = useState(0)
  const record = records[cur]
  const linked = linkedGoals(data, { conditions: 'health_issue', risks: 'risk', needs: 'need', actions: 'action', barriers: 'chart_barrier' }[screen], record)

  /* each screen carries its own DataWindow, not a shared one */
  const columns: PBColumn<Row>[] = cfg.columns.map((c) => ({
    key: c.key,
    header: c.header,
    width: c.width,
    align: c.align,
    dots: c.dots,
    render: c.check ? (r) => <PBCheckbox checked={r[c.key] === '✓' || r[c.key] === 'Y'} /> : undefined,
  }))

  const commands: PBCommand[] = [
    { label: 'New Record', onClick: onNew }, { label: 'Delete Record' }, { label: 'Save' },
    { label: 'Undo' }, { label: 'Refresh' }, { label: 'Attachment' },
    ...(screen === 'conditions' ? [{ label: 'Review' }, { label: 'No Known', width: 80 }] : []),
  ]

  return (
    <>
      <PBViewHeader title={cfg.title} right={<ChartHeaderIdentity />} />
      <PBCommandRow commands={commands} />

      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first },
          { label: 'MIDDLE:', value: patient.middle },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: patient.dob },
        ]}
        encounter="NO ENCOUNTER"
      />

      <div className="pb-row" style={{ padding: '2px 8px' }}>
        <span>Search For:</span><PBLookup w="100%" />
      </div>



      <div style={{ height: 260, flex: 'none', display: 'flex', padding: '0 3px' }}>
        <PBDataWindow columns={columns} rows={rows} current={cur} onCurrentChange={setCur} empty=" " />
      </div>

      {/* tab strip is rendered by hand: MOIS puts these tabs hard against the
          left edge with no strip rule under the inactive ones */}
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '4px 3px 3px' }}>
        <div className="pb-tabs__strip pb-tabs__strip--compact" style={{ paddingLeft: 4 }}>
          {cfg.tabs.map((t) => (
            <button
              key={t}
              className={`pb-tabs__tab${t === tab ? ' is-active' : ''}`}
              style={{ minWidth: 86 }}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="pb-tabs__page" style={{ background: 'var(--pb-face)', overflow: 'auto' }}>
          {tab === 'Detail'
            ? rows.length > 0 && <DetailPage key={cur} screen={screen} record={record} />
            : <LinkedPage band={tab === 'Linked Goals' ? cfg.linkedBand : tab} goals={tab === 'Linked Goals'} rows={tab === 'Linked Goals' ? linked : []} />}
        </div>
      </div>

      {/* the Created / Last Modified strip belongs to the Detail page: the
          Linked Goals captures (action-linked-goals-populated.png,
          health-issues-linked-goals-empty.png) run the linked grid to the
          bottom of the window with no strip under it */}
      {tab === 'Detail' && rows.length > 0 && (
        <div className="pb-row" style={{ padding: '2px 8px 4px', borderTop: '1px solid #d6d6d6', gap: 0 }}>
          <span>Created: {stamp(record)}</span>
          <span className="pb-row__spacer" />
          {record?.id_encounter && <button className="pb-link">ENC# {record.id_encounter}</button>}
        </div>
      )}
    </>
  )
}

/* --- the Detail page -------------------------------------------------------
   One tab caption, five panes. Each is transcribed from its own capture; the
   label column and the field widths are the ones MOIS paints.             */

function DetailPage({
  screen, record,
}: { screen: CarePlanKey; record?: MoisRecord }) {
  if (screen === 'actions') return <ActionDetail record={record} />
  if (screen === 'barriers') return <NoteDetail record={record} />
  if (screen === 'conditions') return <ConditionDetail record={record} />
  if (screen === 'risks') return <RiskDetail record={record} />
  return <NeedDetail record={record} />
}

/** `Low Risk … High Risk`, the value box and its `(/10)` suffix.
    PowerBuilder paints the scale at a fixed width — roughly 320 px of track —
    rather than stretching it to the pane. */
function RiskScale({ value = '' }: { value?: string }) {
  return (
    <div style={{ width: 396 }}>
      <div className="pb-row" style={{ gap: 0 }}>
        <span>Low Risk</span>
        <span className="pb-row__spacer" />
        <span>High Risk</span>
        <span style={{ width: 14 }} />
        <span>Value</span>
      </div>
      <div className="pb-row">
        {value !== '' ? <PBSlider value={Number(value)} onChange={() => {}} style={{ flex: '1 1 auto' }} /> : <span className="pb-row__spacer" />}
        <PBInput w={40} align="center" value={value} readOnly />
        <span>(/10)</span>
      </div>
    </div>
  )
}

const PAGE: React.CSSProperties = { display: 'grid', padding: '8px 10px', gap: '6px 8px', alignItems: 'start' }

/* Need for Care — the Participants box sits beside the description and the
   risk scale, and Comment runs the full width underneath it. */
function NeedDetail({ record }: { record?: MoisRecord }) {
  return (
    <div style={{ ...PAGE, gridTemplateColumns: '84px minmax(0, 1fr) auto 210px' }}>
      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Need Desc.:</span>
      <PBInput w="100%" value={record?.str_description ?? ''} readOnly />
      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Participants:</span>
      <PBTextArea value={record?.str_participants ?? ''} readOnly rows={3} w="100%" style={{ gridRow: 'span 2' }} />

      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Risk Rating:</span>
      <RiskScale value={record?.num_risk} />

      <span className="pb-form__label" style={{ gridColumn: 1, lineHeight: '19px' }}>Comment:</span>
      <PBTextArea value={record?.str_comment ?? ''} readOnly rows={9} w="100%" style={{ gridColumn: '2 / -1' }} />
    </div>
  )
}

/* Risk for Condition — the description is painted, not editable, and the scale
   is captioned "Risk Severity". No Participants box. */
function RiskDetail({ record }: { record?: MoisRecord }) {
  return (
    <div style={{ ...PAGE, gridTemplateColumns: '110px minmax(0, 1fr)' }}>
      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Risk Description:</span>
      <div className="pb-row" style={{ gap: 0 }}>
        <span>{record?.str_description ?? ''}</span>
        <span className="pb-row__spacer" />
        <span />
      </div>

      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Risk Severity:</span>
      <RiskScale value={record?.num_risk} />

      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Comment:</span>
      <PBTextArea value={record?.str_comment ?? ''} readOnly rows={11} w="100%" />
    </div>
  )
}

/* Condition — Severity System and Severity Code hang off the right of the
   Problem Name row; Source is a drop-down of its own. */
function ConditionDetail({ record }: { record?: MoisRecord }) {
  return (
    <div style={{ ...PAGE, gridTemplateColumns: '92px minmax(0, 1fr) auto 210px' }}>
      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Problem Name:</span>
      <PBLookup w="100%" value={record?.str_problem_name ?? ''} readOnly />
      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Severity System:</span>
      <PBDropField w="100%" />

      <span />
      <span />
      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Severity Code:</span>
      <PBDropField w="100%" />

      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Source:</span>
      <PBDropField w={210} />
      <span />
      <span />

      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Comment:</span>
      <PBTextArea value={record?.str_comment ?? ''} readOnly rows={10} w="100%" style={{ gridColumn: '2 / -1' }} />
    </div>
  )
}

/* Planned Actions — two blocks divided by a hairline: Detail beside the
   participant list, then Outcome beside the completion flags. */
function ActionDetail({ record }: { record?: MoisRecord }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ ...PAGE, gridTemplateColumns: '60px minmax(0, 1fr) auto 210px', paddingBottom: 8 }}>
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Detail:</span>
        <PBTextArea value={record?.str_action ?? ''} readOnly rows={8} w="100%" />
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Participant(s):</span>
        <PBInput w="100%" value={record?.str_participants ?? ''} readOnly />
      </div>

      <div style={{ borderTop: '1px solid #d6d6d6' }} />

      <div style={{ ...PAGE, gridTemplateColumns: '60px minmax(0, 1fr) auto 210px' }}>
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Outcome:</span>
        <PBTextArea value={record?.str_outcome ?? ''} readOnly rows={3} w="100%" style={{ gridRow: 'span 2' }} />
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Completed:</span>
        <PBCheckbox label="Yes" checked={record?.str_completed === 'Y'} />

        <span className="pb-form__label" style={{ gridColumn: 3, lineHeight: '19px' }}>Completed Date:</span>
        <PBInput w={140} value={record?.dtm_completed?.replace(/\//g, '.') ?? ''} readOnly />
      </div>
    </div>
  )
}

/* Barrier to Care (and Patient Resources, which shares the window): one Note
   field, full width. */
function NoteDetail({ record }: { record?: MoisRecord }) {
  return (
    <div style={{ ...PAGE, gridTemplateColumns: '60px minmax(0, 1fr)' }}>
      <span className="pb-form__label" style={{ lineHeight: '19px' }}>Note:</span>
      <PBTextArea value={record?.str_note ?? ''} readOnly rows={10} w="100%" />
    </div>
  )
}

function LinkedPage({ band, goals, rows }: { band: string; goals: boolean; rows: Record<string, string>[] }) {
  return (
    <>
      <PBBand>{band}</PBBand>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <PBDataWindow
          flush
          rows={rows}
          groupBy={goals ? (r) => r.group : undefined}
          rowStatus={() => 'highlight'}
          columns={[
            { key: 'start', header: 'Start', width: 76 },
            { key: 'end', header: 'End', width: 70 },
            {
              key: 'desc', header: 'Description', width: 240,
              render: (r) => <button className="pb-link">{r.desc}</button>,
            },
            { key: 'phase', header: 'Phase', width: 86 },
            { key: 's', header: 'S', width: 24, align: 'center', render: () => <PBCheckbox /> },
            { key: 'by', header: 'Linked By', width: 130 },
            { key: 'when', header: 'Linked Date', width: 130 },
          ]}
        />
      </div>
    </>
  )
}
