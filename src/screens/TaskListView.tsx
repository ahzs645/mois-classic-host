import { useState } from 'react'
import {
  PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBSelect, PBViewHeader, pbSlug,
} from '../pb'
import { TASK_FILTER, taskScreenByNode, type TaskRow, type TaskScreen } from '../data/tasks'

/* ============================================================================
   The Workspace's four list screens: Task Inbox, Sent Tasks, Message Inbox
   and Sent Messages.

   One frame, four column sets — see `data/tasks.ts` for the per-screen
   provenance. What distinguishes them on screen is the command row (Sent
   Tasks has no New; Message Inbox has Reply / Reply All / Forward), the
   filter strip (Sent Messages alone has no Acknowledged / Completed
   drop-downs) and the View selector, which only the Task Inbox carries.

   State lives in the ink, not the fill: an unacknowledged row is bold, and
   an acknowledged-and-completed one is struck through in grey. The zebra is
   banding, and `TEAM` assignees are drawn in teal.
   ========================================================================= */

const cx = (...v: (string | false | undefined)[]) => v.filter(Boolean).join(' ')

const yesNo = (v: string, on: boolean | undefined) =>
  v === 'All' || (v === 'Yes') === Boolean(on)

export function TaskListView({ node, onOpenChart }: { node: string; onOpenChart?: () => void }) {
  const screen: TaskScreen | undefined = taskScreenByNode(node)
  const [ack, setAck] = useState(TASK_FILTER[0]!)
  const [comp, setComp] = useState(TASK_FILTER[0]!)
  const [cur, setCur] = useState(0)

  if (!screen) return null

  const rows = screen.filters
    ? screen.rows.filter((r) => yesNo(ack, r.ack) && yesNo(comp, r.comp))
    : screen.rows

  return (
    <>
      <PBViewHeader title={screen.title} right={<span>Your Workspace</span>} />
      <PBCommandRow
        commands={screen.commands.map((label) => ({
          label,
          onClick: label === 'Open Chart' ? onOpenChart : undefined,
        }))}
        right={screen.viewSelect
          ? (
            <span className="pb-row" style={{ gap: 6 }}>
              <span className="pb-form__label">View:</span>
              <PBSelect w={75} options={['View 1', 'View 2']} />
            </span>
          )
          : undefined}
      />

      <div className="pb-row" style={{ gap: 6, padding: '4px 6px', background: '#f0f0f0', flex: 'none', alignItems: 'center' }}>
        <span className="pb-form__label">Search For:</span>
        <PBInput w={screen.filters ? 420 : 728} />
        <button className="pb-inputgroup__btn pb-inputgroup__btn--dots" type="button" title="Advanced search…">…</button>
        {screen.filters && (
          <>
            <span className="pb-form__label" style={{ marginLeft: 12 }}>Acknowledged:</span>
            <PBSelect
              w={54}
              options={TASK_FILTER}
              value={ack}
              data-tutorial-id="host.mois.field.filter-acknowledged"
              onChange={(e) => { setAck(e.target.value); setCur(0) }}
            />
            <span className="pb-form__label" style={{ marginLeft: 8 }}>Completed:</span>
            <PBSelect
              w={54}
              options={TASK_FILTER}
              value={comp}
              data-tutorial-id="host.mois.field.filter-completed"
              onChange={(e) => { setComp(e.target.value); setCur(0) }}
            />
          </>
        )}
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={onOpenChart}
          rowClassName={(r: TaskRow) => cx(
            !r.ack && 'pb-dw--unread',
            r.ack && r.comp && 'pb-dw--done',
          )}
          rowTutorialId={(r) => `host.mois.row.task-${pbSlug(String(r.task ?? r.subject ?? '').slice(0, 24))}`}
          columns={screen.columns.map((c) => (c.check
            ? {
              ...c,
              render: (r: TaskRow) => <PBCheckbox checked={Boolean(r[c.key])} />,
            }
            : c.key === 'assignee'
              ? {
                ...c,
                /* a team assignee is drawn in teal, a user in black */
                render: (r: TaskRow) => (
                  <span style={String(r.assignee ?? '').startsWith('TEAM') ? { color: '#008585' } : undefined}>
                    {String(r.assignee ?? '')}
                  </span>
                ),
              }
              : c))}
          empty="Nothing matches those filters."
        />
      </div>
    </>
  )
}
