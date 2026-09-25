import { basketFolders } from './basket'
import { CURRENT_USER, taskScreenByNode, type TaskRow } from './tasks'
import { basketKey, type WorkspaceState } from './workspaceStore'

/* ============================================================================
   The Workspace's lists as the session has left them, and the counts every
   summary of them shows — the Workspace Summary's three panels and the
   status bar's Task Item / Msg Item cells — derived from the same rows, so
   the summary can never disagree with the folders it counts.
   ========================================================================= */

/** A list screen's rows: the training data plus what this session raised. */
export function taskListRows(node: string, ws: WorkspaceState): TaskRow[] {
  const screen = taskScreenByNode(node)
  if (!screen) return []
  const base = screen.rows.map((r) => (
    node === 'ws-msg-inbox' && ws.ackedMessages.includes(String(r.subject)) ? { ...r, ack: true } : r
  ))
  if (node === 'ws-task-inbox') return [...ws.tasks.filter((t) => t.box === 'inbox'), ...base]
  if (node === 'ws-task-sent') return [...ws.tasks.filter((t) => t.box === 'sent'), ...base]
  if (node === 'ws-msg-sent') return [...ws.messages, ...base]
  return base
}

/** Not yet acknowledged, or acknowledged and not yet completed. */
const outstanding = (r: TaskRow) => !(r.ack && r.comp)

/** The status bar's two counters (art. 3268648 / 303757: they flash pink
    while anything is unacknowledged or uncompleted). */
export function workspaceItemCounts(ws: WorkspaceState): { tasks: number; messages: number } {
  return {
    /* the captures count what is not yet acknowledged: 1802744 c734bd09 reads Task Item 2 over two unacknowledged tasks, 303753 180bb8f4 Msg Item 1 over one */
    tasks: taskListRows('ws-task-inbox', ws).filter((r) => !r.ack).length,
    messages: taskListRows('ws-msg-inbox', ws).filter((r) => !r.ack).length,
  }
}

export type PriorityCounts = { vhigh: string; high: string; med: string; low: string }

function byPriority(rows: TaskRow[]): PriorityCounts {
  const n = (p: string) => rows.filter((r) => r.p === p).length
  const show = (v: number) => (v ? String(v) : '-')
  return { vhigh: show(n('V')), high: show(n('H')), med: show(n('M')), low: show(n('L')) }
}

/** Workspace Summary (art. 301166; 303599 image `74b97af2`). */
export function workspaceSummary(ws: WorkspaceState) {
  const basket = basketFolders.map((f) => {
    const rows = f.rows.filter((r) => !ws.reassigned.includes(basketKey(f.id, String(r.patient))))
    const reviews = rows.filter((r) => r.t === 'R').length
      + f.rows.filter((r) => r.t !== 'R' && ws.reviews.includes(basketKey(f.id, String(r.patient)))).length
    const acks = rows.filter((r) => r.t !== 'R').length
    /* the summary names the folder in the plural where the tree does not */
    const item = f.id === 'ws-progress' ? 'Progress Notes' : f.label
    return { item, ack: acks ? String(acks) : '-', review: reviews ? String(reviews) : '-', acks, reviews }
  })
  const total = (k: 'acks' | 'reviews') => basket.reduce((sum, b) => sum + b[k], 0)
  const tasks = taskListRows('ws-task-inbox', ws).filter(outstanding)
  const messages = taskListRows('ws-msg-inbox', ws)
  return {
    basket: [
      ...basket.map(({ item, ack, review }) => ({ item, ack, review })),
      { item: '', ack: String(total('acks') || '-'), review: String(total('reviews') || '-') },
    ],
    tasks: [{ list: `${CURRENT_USER.name} (USER)`, ...byPriority(tasks) }],
    /* acknowledged but not completed, and not yet acknowledged */
    incomplete: [{ who: CURRENT_USER.name, ...byPriority(messages.filter((r) => r.ack && !r.comp)) }],
    fresh: [{ who: CURRENT_USER.name, ...byPriority(messages.filter((r) => !r.ack)) }],
  }
}
