import { useState } from 'react'
import { useChartExport } from '../data/chart-records'
import { linkGoal, linkedGoalIds, useCarePlanRecords, type GoalLinkObject } from '../data/carePlanRecords'
import { date } from '../data/charts/relations'
import { useGoalRecords } from '../data/goalRecords'
import { usePatient } from '../data/patient-context'
import { PBBand, PBCheckbox, PBDataWindow } from '../pb'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

/* ============================================================================
   Link Goal — pick a Goal to link the current Planned Action to.

   Opened by `Link Goal...` on Planned Actions' Linked Goals band
   (screens/CarePlanView.tsx) as `link-goal`, args `{ object, objectId }`.
   Lists the chart's Goals (the export's `goal` rows and those entered this
   session, data/goalRecords.ts) that the record is not already linked to;
   `Link` files the link in data/carePlanRecords.ts, and the Linked Goals tab
   lists it with Linked By / Linked Date, as the export's `goal_link` rows
   do.

   PROVENANCE: art. 303511 ("A single action can be linked to more than one
   goal"; the Linked Goals subsection "allows the users to view all goals
   that an action is linked to"). The grid's columns are the Linked Goals
   grid's own (303447 `fdaeb59f…png`: Start, End, Description, Phase, S).
   INFERRED: the whole window — no capture shows how a link is made from
   the action's side.

   Anchors: host.mois.dialog.link-goal; rows host.mois.row.goal-{id};
   host.mois.command.link-goal-link / link-goal-cancel.
   ========================================================================= */

export type ChartGoal = { id: string; start: string; end: string; desc: string; phase: string; s: string }

/** the chart's Goals now: this session's (data/goalRecords.ts), then the
    export's with their edits, less deleted ones */
export function useChartGoals(): ChartGoal[] {
  const { chart } = usePatient()
  const data = useChartExport()
  const g = useGoalRecords(chart)
  return [
    ...g.goals.map((x) => ({ id: x.id, start: x.start, end: x.end, desc: x.goal, phase: x.phase, s: x.sensitive ? 'Y' : '' })),
    ...(data?.goal ?? []).filter((x) => x.id_goal && !g.deletedGoals.includes(x.id_goal)).map((x) => {
      const e = g.edits[x.id_goal!] ?? {}
      return {
        id: x.id_goal!, start: e.start ?? date(x.dtm_start), end: e.end ?? date(x.dtm_end), desc: e.goal ?? x.str_goal ?? '',
        phase: e.phase ?? x.str_phase ?? '', s: e.sensitive !== undefined ? (e.sensitive ? 'Y' : '') : x.str_sensitive ?? '',
      }
    }),
  ]
}

function LinkGoalWindow({ args, close }: AreaWindowProps) {
  const { chart } = usePatient()
  const data = useChartExport()
  const store = useCarePlanRecords(chart)
  const object = (typeof args.object === 'string' ? args.object : 'action') as GoalLinkObject
  const objectId = typeof args.objectId === 'string' ? args.objectId : ''
  const already = new Set(linkedGoalIds(data, store, object, objectId).map((l) => l.goalId))
  const rows = useChartGoals().filter((g) => !already.has(g.id))
  const [cur, setCur] = useState(0)
  const pick = rows[Math.min(cur, rows.length - 1)]
  const link = (id?: string) => {
    if (!id || !objectId) return
    linkGoal(chart, object, objectId, id)
    close()
  }
  return (
    <WorkspaceDialogFrame id="link-goal" title="Link Goal" width={640} height={360} onClose={close} controls={false}>
      <div style={{ margin: '10px 12px 0', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <PBBand>Goals</PBBand>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBDataWindow
            rows={rows}
            current={cur}
            onCurrentChange={setCur}
            onActivate={(r) => link(r.id)}
            rowTutorialId={(r) => `host.mois.row.goal-${r.id}`}
            empty="No other goals on file for this patient."
            columns={[
              { key: 'start', header: 'Start', width: 76, align: 'center' },
              { key: 'end', header: 'End', width: 70, align: 'center' },
              { key: 'desc', header: 'Description' },
              { key: 'phase', header: 'Phase', width: 96 },
              { key: 's', header: 'S', width: 24, align: 'center', render: (r) => <PBCheckbox checked={r.s === 'Y'} /> },
            ]}
          />
        </div>
      </div>
      <div className="pb-row" style={{ justifyContent: 'center', gap: 10, padding: '10px 0', flex: 'none' }}>
        <DialogButton id="link-goal-link" width={75} isDefault disabled={!pick} onClick={() => link(pick?.id)}>Link</DialogButton>
        <DialogButton id="link-goal-cancel" width={75} onClick={close}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow('link-goal', LinkGoalWindow)
