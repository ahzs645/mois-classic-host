import { useSyncExternalStore } from 'react'
import type { TaskRow } from './tasks'

/* ============================================================================
   What the learner has done to the Workspace this session.

   The Workspace's lists are static training data (`basket.ts`, `tasks.ts`);
   the windows opened on them change them: Create New Task puts a task in the
   Inbox or Sent Tasks, Create New Message a message in Sent Messages, Create
   Task From Message acknowledges the message it converted, Reassign Items
   takes a record out of the basket, Change Workspace recolours the banner.
   The frame's work area remounts on every tree node, so none of that can live
   in a screen's own state — it lives here, and every screen reads it.

   One store per frame: the shell calls `resetWorkspaceStore()` when it mounts
   (see `AreaWindowLayer`), so a second stage — or the next test — starts from
   the training data again.
   ========================================================================= */

/** Whose workspace the banner says this is (art. 1802749, "Workspace Banner"). */
export type WorkspaceBlend = 'own' | 'blend-with-me' | 'blend-without-me' | 'other'

export type WorkspaceState = {
  /** tasks raised this session: `inbox` when assigned to yourself */
  tasks: (TaskRow & { box: 'inbox' | 'sent' })[]
  /** messages sent this session (Sent Messages) */
  messages: TaskRow[]
  /** Message Inbox subjects acknowledged by Create Task From Message */
  ackedMessages: string[]
  /** basket rows (`folder:patient`) reassigned away */
  reassigned: string[]
  /** basket rows (`folder:patient`) marked for review this session */
  reviews: string[]
  /** extra attachments added to a basket row this session, by `folder:patient` */
  attachments: Record<string, number>
  blend: WorkspaceBlend
  /** the other users whose workspace is blended in */
  sharedWith: string[]
}

const initial = (): WorkspaceState => ({
  tasks: [], messages: [], ackedMessages: [], reassigned: [], reviews: [], attachments: {},
  blend: 'own', sharedWith: [],
})

let state: WorkspaceState = initial()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function set(next: Partial<WorkspaceState>) {
  state = { ...state, ...next }
  emit()
}

/** Back to the training data. The frame calls this while it first renders,
    before anything has subscribed, so it does not notify — a notification
    from inside a render is a state update React refuses. */
export function resetWorkspaceStore() {
  state = initial()
  currentRow = null
}

export function useWorkspaceStore(): WorkspaceState {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => state,
    () => state,
  )
}

export const workspaceStore = {
  get: () => state,
  addTask(task: TaskRow, toSelf: boolean) {
    set({ tasks: [...state.tasks, { ...task, box: toSelf ? 'inbox' : 'sent' }] })
  },
  addMessage(message: TaskRow) {
    set({ messages: [...state.messages, message] })
  },
  ackMessage(subject: string) {
    if (!state.ackedMessages.includes(subject)) set({ ackedMessages: [...state.ackedMessages, subject] })
  },
  reassign(keys: string[]) {
    set({ reassigned: [...new Set([...state.reassigned, ...keys])] })
  },
  markForReview(key: string) {
    if (!state.reviews.includes(key)) set({ reviews: [...state.reviews, key] })
  },
  attach(key: string) {
    set({ attachments: { ...state.attachments, [key]: (state.attachments[key] ?? 0) + 1 } })
  },
  changeWorkspace(blend: WorkspaceBlend, sharedWith: string[]) {
    set({ blend, sharedWith })
  },
}

/* The row a Workspace screen has current, and what a window opened on it
   should carry (chart, patient, linked record, detail). The menus read it at
   the moment an item is picked — Action ▸ Create Task, Mark For Review,
   Attachments, Create Message from Task all "work on the current row" — so
   it is kept outside the render state: moving the cursor re-renders nothing. */
export type CurrentWorkspaceRow = { node: string; row: string; args: Record<string, unknown> }
let currentRow: CurrentWorkspaceRow | null = null
export const setCurrentWorkspaceRow = (next: CurrentWorkspaceRow | null) => { currentRow = next }
export const currentWorkspaceRow = (node: string): CurrentWorkspaceRow | null =>
  currentRow && currentRow.node === node ? currentRow : null

/** The key a basket row is tracked by across screens. */
export const basketKey = (folder: string, patient: string) => `${folder}:${patient}`
