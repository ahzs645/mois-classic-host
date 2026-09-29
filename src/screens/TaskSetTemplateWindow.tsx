import { useState } from 'react'
import { PBInput, PBRadio, PBSelect, PBTextArea, pbSlug } from '../pb'
import { TASK_DUE_UNITS, TASK_PRIORITIES, TASK_SET_ROWS, designerScreen, type DesignerRow, type TaskSetRow } from '../data/designerSection'
import { TASK_GROUPS } from '../data/tasks'
import { useScreenReport } from '../host/screen-state'
import { useSessionState } from '../host/screen-windows'
import { CentredFooter, Cmd, NavyBand, onF2 } from './adminKit'
import { DemographicModal } from './DemographicDialogs'
import { useRecordList } from './listKit'

/* ============================================================================
   Designer Section ▸ Task Set Templates ▸ Task Set Detail — creating and
   editing a template.

   PROVENANCE: 1802764 "Task Set Templates" and `0ffe065f…` (Task Set Detail,
   CHEMO, 1.25x): title "Task Set Detail"; navy "Task Set" band; Description
   grey, bold and read-only, a Detail memo; a "Task List" band over New Row /
   Delete Row; each task a multi-line row — Priority Low / Medium / High /
   V. High, Task, Group drop-down, Due After with a Days / Weeks / Months
   drop-down, and a Detail memo at the right; the current row salmon with
   the `>` marker; Save Changes (F2) / Cancel.
   The article's steps: New Record → Description and Detail → Create
   Record → "A new window opens where you can add the tasks" → New Row →
   Priority, Task, Group, Due After, Detail → Save Changes or F2. Editing:
   double-click or Edit Record, change, Save Changes or F2.

   This replaces the earlier read-only drawing (DesignerDetailWindow's
   TaskSetDetail): a new template starts with no tasks, a shipped one with
   the captured three, and what Save Changes writes is this stage session's
   (`admin:task-set:<description>`), so reopening the template shows it.

   Group's list is the Tasks - Type selection list the workspace windows use
   (data/tasks.ts TASK_GROUPS), plus PT NOTIFY from the capture.

   Anchors: host.mois.dialog.task-set-detail; host.mois.field.detail;
   host.mois.command.new-row / delete-row / save-changes / task-set-cancel;
   per task n (1-based): host.mois.row.task-<n>, host.mois.field.task-<n>,
   task-<n>-group, task-<n>-due-after, task-<n>-due-unit, task-<n>-detail,
   task-<n>-priority-<low|medium|high|v-high>.
   Reported: host.screen.tasks (how many), host.screen.saved.
   ========================================================================= */

export type TaskSetTemplate = { detail: string; tasks: TaskSetRow[] }

export const taskSetKey = (desc: string) => `admin:task-set:${desc}`

const GROUPS = [...TASK_GROUPS, 'PT NOTIFY', 'RECALL', 'LAB'].filter((g, i, a) => a.indexOf(g) === i)

export function TaskSetTemplateWindow({ title, row, onClose }: { title: string; row: DesignerRow; onClose: () => void }) {
  const desc = String(row.desc ?? '')
  const shipped = (designerScreen('ad-task-sets')?.rows ?? []).some((r) => r.desc === desc)
  const [stored, setStored] = useSessionState<TaskSetTemplate | null>(taskSetKey(desc), null)
  const initial: TaskSetTemplate = stored ?? { detail: String(row.detail ?? ''), tasks: shipped ? TASK_SET_ROWS : [] }
  const [detail, setDetail] = useState(initial.detail)
  const list = useRecordList<TaskSetRow>(() => initial.tasks.map((t) => ({ ...t })), { afterRemove: 'previous' })
  const { rows: tasks, cur, setCur } = list
  const [saved, setSaved] = useState(false)
  useScreenReport({ dialog: 'task-set-detail', tasks: tasks.length, saved })

  const edit = (i: number, patch: Partial<TaskSetRow>) => { list.edit(i, patch); setSaved(false) }
  const save = () => {
    setStored({ detail, tasks: tasks.filter((t) => t.task.trim()) })
    setSaved(true)
    onClose()
  }

  return (
    <DemographicModal title={title} width={979} height={729} onClose={onClose} dialog="task-set-detail">
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }} onKeyDown={onF2(save)}>
        <NavyBand>Task Set</NavyBand>
        <div style={{ flex: 'none', background: '#f0f0f0', padding: '5px 8px 30px', borderBottom: '1px solid #a0a0a0' }}>
          <div className="pb-row" style={{ gap: 6 }}>
            <span className="pb-form__label" style={{ width: 80 }}>Description:</span>
            <PBInput w={320} value={desc} readOnly style={{ background: '#e8e8e8', fontWeight: 700 }} data-tutorial-id="host.mois.field.description" />
          </div>
          <div className="pb-row" style={{ gap: 6, alignItems: 'flex-start', marginTop: 4 }}>
            <span className="pb-form__label" style={{ width: 80 }}>Detail:</span>
            <PBTextArea rows={3} w={320} value={detail} onChange={(e) => { setDetail(e.target.value); setSaved(false) }} data-tutorial-id="host.mois.field.detail" />
          </div>
        </div>

        <div className="pb-band" style={{ flex: 'none', fontWeight: 700 }}>Task List</div>
        <div className="pb-row" style={{ gap: 0, padding: 1, background: '#dcd7d2', borderBottom: '1px solid #a0a0a0', flex: 'none' }}>
          <Cmd id="new-row" w={82} onClick={() => {
            list.add({ priority: 'Medium', task: '', group: '', dueAfter: '0', dueUnit: 'Days', detail: '' })
            setSaved(false)
          }}>New Row</Cmd>
          <Cmd id="delete-row" w={80} disabled={!tasks.length} onClick={() => { list.remove(); setSaved(false) }}>Delete Row</Cmd>
        </div>

        <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff' }}>
          {tasks.map((t, i) => {
            const n = i + 1
            return (
              <div
                key={i}
                className="pb-row"
                data-tutorial-id={`host.mois.row.task-${n}`}
                onMouseDown={() => setCur(i)}
                style={{
                  alignItems: 'flex-start', gap: 10, padding: '4px 6px 6px 18px', position: 'relative',
                  /* the current row fills #E89C84 across the whole multi-line row */
                  background: i === cur ? 'var(--pb-dw-select)' : i % 2 ? '#e8e8e8' : '#ffffff',
                  borderBottom: '1px solid #c8c8c8',
                }}
              >
                {i === cur && <span style={{ position: 'absolute', left: 6, top: 24 }}>&gt;</span>}
                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <div className="pb-row" style={{ gap: 18 }}>
                    <span className="pb-form__label" style={{ width: 56 }}>Priority:</span>
                    {TASK_PRIORITIES.map((p) => (
                      <PBRadio key={p} name={`task-priority-${n}`} label={p} checked={t.priority === p} onChange={() => edit(i, { priority: p })}
                        tutorialId={`host.mois.field.task-${n}-priority-${pbSlug(p)}`} />
                    ))}
                  </div>
                  <div className="pb-row" style={{ gap: 6, marginTop: 2 }}>
                    <span className="pb-form__label" style={{ width: 56 }}>Task:</span>
                    <PBInput w={440} value={t.task} onChange={(e) => edit(i, { task: e.target.value.toUpperCase() })} data-tutorial-id={`host.mois.field.task-${n}`} />
                  </div>
                  <div className="pb-row" style={{ gap: 6, marginTop: 2 }}>
                    <span className="pb-form__label" style={{ width: 56 }}>Group:</span>
                    <PBSelect w={206} options={GROUPS} value={t.group} onChange={(e) => edit(i, { group: e.target.value })} data-tutorial-id={`host.mois.field.task-${n}-group`} />
                    <span className="pb-form__label" style={{ marginLeft: 12 }}>Due After:</span>
                    <PBInput w={56} align="right" value={t.dueAfter} onChange={(e) => edit(i, { dueAfter: e.target.value.replace(/[^0-9]/g, '') })} data-tutorial-id={`host.mois.field.task-${n}-due-after`} />
                    <PBSelect w={90} options={TASK_DUE_UNITS} value={t.dueUnit} onChange={(e) => edit(i, { dueUnit: e.target.value })} data-tutorial-id={`host.mois.field.task-${n}-due-unit`} />
                  </div>
                </div>
                <div className="pb-row" style={{ gap: 6, alignItems: 'flex-start', flex: 'none' }}>
                  <span className="pb-form__label">Detail:</span>
                  <PBTextArea rows={4} w={450} value={t.detail} onChange={(e) => edit(i, { detail: e.target.value })} data-tutorial-id={`host.mois.field.task-${n}-detail`} />
                </div>
              </div>
            )
          })}
        </div>

        <CentredFooter>
          <Cmd id="save-changes" w={132} primary onClick={save}>Save Changes (F2)</Cmd>
          <Cmd id="task-set-cancel" w={132} onClick={onClose}>Cancel</Cmd>
        </CentredFooter>
      </div>
    </DemographicModal>
  )
}
