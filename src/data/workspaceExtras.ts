import { useSyncExternalStore } from 'react'
import type { TaskRow } from './tasks'

/* ============================================================================
   The Workspace state the Blended Workspaces, Task Inbox, Workflow Summary
   and Basket windows keep — beside `workspaceStore`, which owns the lists'
   own session changes (tasks raised, rows reassigned, the blend).

   PROVENANCE (what each slice stands for):
   - `workgroups`, `defaultBlend`, `memberships`: art. 1802767 "Blended
     Workspaces" — Manage Workgroups (`6c28c301…`, `cc4a0583…`,
     `1e819daf…`), Save as Default (`829c5ad3…`), Default Blending Changed
     (`47ccdc42…`), Add Organization / Role to List → Create Temporary
     Membership (`c4aabf87…`, `9b638396…`).
   - `followUps`: art. 1802744 "Task Inbox" — the Follow Up Notes (n) tab
     (`d5b7a079…`).
   - `history`: art. 1802768 "Workflow Summary" — each basket record's
     Acknowledgement History: Mark for Review, Reassign Items and Copy Items
     notes (`9a1ef52e…`, `3d36d71e…`, `315269da…`).
   - `orderLinks`: art. 1802749 "Linking to Orders and Updating Order
     Status" (`a31c8698…`, `6a620b43…`).
   - `cleaned`: Action ▸ Clean List (art. 303599).

   One store per frame; `resetWorkspaceExtras()` is called from
   `resetWorkspaceStore()`. Reports carry slugs and counts only.
   ========================================================================= */

export type FollowUpNote = { id: string; date: string; author: string; note: string; modifiedBy?: string; modified?: string }

export type Workgroup = { name: string; users: string[] }

export type Membership = { org: string; reason: string; until: string; access: string }

export type HistoryEntry = {
  /** `folder:patient` — the basket row */
  key: string
  action: 'REASSIGNED' | 'COPIED' | 'MARKED FOR REVIEW'
  by: string
  to: string[]
  note: string
  at: string
}

export type WorkspaceExtrasState = {
  followUps: Record<string, FollowUpNote[]>
  workgroups: Workgroup[]
  /** the saved default blend (Save as Default), or null */
  defaultBlend: string[] | null
  memberships: Membership[]
  history: HistoryEntry[]
  orderLinks: Record<string, { order: string; status: string }>
  /** Show History ▸ Comment, by `folder:patient` */
  comments: Record<string, string>
  /** Order # set by Print Order's order-type prompt, by `folder:patient` */
  orderTypes: Record<string, string>
  /** Clean List ran this session */
  cleaned: boolean
  /** Task Inbox View 1 / View 2 */
  taskView: 'View 1' | 'View 2'
  /** Measures basket View: List View / Panel View (2.24) */
  measuresView: 'List View' | 'Panel View'
  /** Break Glass alerts sent to a private note's owner (art. 3268648 / the
      private-notes stream): a Message Inbox row, or a Task Inbox row when
      the owner chose MOIS Task. `sentTo` / `user` names whose inbox it is. */
  alerts: (TaskRow & { box: 'messages' | 'tasks' })[]
  last: string
}

const initial = (): WorkspaceExtrasState => ({
  followUps: {
    /* the training Task Inbox's first task carries one note, as the
       capture's does ("Follow Up Notes (1)") */
    'task-book-follow-up-for-abnor': [
      { id: 'f1', date: '2026.03.18', author: 'SHEWCHUK, LEAH', note: 'Called patient, no answer. Will try again tomorrow.' },
    ],
  },
  workgroups: [],
  defaultBlend: null,
  memberships: [],
  history: [],
  orderLinks: {},
  comments: {},
  orderTypes: {},
  cleaned: false,
  taskView: 'View 1',
  measuresView: 'List View',
  alerts: [],
  last: '',
})

let state: WorkspaceExtrasState = initial()
let serial = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
function set(next: Partial<WorkspaceExtrasState>) {
  state = { ...state, ...next }
  emit()
}

/** Back to the training data; the frame's first render calls this, so it
    does not notify (see resetWorkspaceStore). */
export function resetWorkspaceExtras() {
  state = initial()
  serial = 0
}

export function useWorkspaceExtras(): WorkspaceExtrasState {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => state,
    () => state,
  )
}

const stamp = () => {
  const d = new Date()
  const two = (n: number) => String(n).padStart(2, '0')
  return `${two(d.getHours())}:${two(d.getMinutes())}`
}

export const workspaceExtras = {
  get: () => state,

  addFollowUp(task: string, note: Omit<FollowUpNote, 'id'>) {
    const list = state.followUps[task] ?? []
    set({ followUps: { ...state.followUps, [task]: [...list, { ...note, id: `n${++serial}` }] }, last: 'follow-up-added' })
  },
  updateFollowUp(task: string, id: string, note: string, by: string, when: string) {
    const list = (state.followUps[task] ?? []).map((n) => (n.id === id ? { ...n, note, modifiedBy: by, modified: when } : n))
    set({ followUps: { ...state.followUps, [task]: list }, last: 'follow-up-changed' })
  },
  deleteFollowUp(task: string, id: string) {
    set({ followUps: { ...state.followUps, [task]: (state.followUps[task] ?? []).filter((n) => n.id !== id) }, last: 'follow-up-deleted' })
  },

  saveWorkgroup(name: string, users: string[], was?: string) {
    const rest = state.workgroups.filter((w) => w.name !== (was ?? name))
    set({ workgroups: [...rest, { name, users }].sort((a, b) => a.name.localeCompare(b.name)), last: was ? 'workgroup-modified' : 'workgroup-created' })
  },
  deleteWorkgroup(name: string) {
    set({ workgroups: state.workgroups.filter((w) => w.name !== name), last: 'workgroup-deleted' })
  },

  saveDefault(users: string[] | null) { set({ defaultBlend: users, last: users ? 'default-saved' : state.last }) },

  addMembership(m: Membership) {
    set({ memberships: [...state.memberships.filter((x) => x.org !== m.org), m], last: 'membership-added' })
  },

  record(entry: Omit<HistoryEntry, 'at'> & { at?: string }, date: string) {
    set({ history: [...state.history, { ...entry, at: entry.at ?? `${date} ${stamp()}` }] })
  },

  linkOrder(key: string, order: string, status: string) {
    set({ orderLinks: { ...state.orderLinks, [key]: { order, status } }, last: 'order-linked' })
  },

  setComment(key: string, text: string) { set({ comments: { ...state.comments, [key]: text }, last: 'measure-comment-saved' }) },
  setOrderType(key: string, type: string) { set({ orderTypes: { ...state.orderTypes, [key]: type } }) },

  clean() { set({ cleaned: true, last: 'list-cleaned' }) },
  setTaskView(v: WorkspaceExtrasState['taskView']) { set({ taskView: v }) },
  setMeasuresView(v: WorkspaceExtrasState['measuresView']) { set({ measuresView: v }) },
  /** A user broke glass on a private note whose owner asked to be alerted. */
  breakGlassAlert(a: { owner: string; by: string; chart: string; patient: string; reason: string; duration: string; method: string; priority: string; date: string }) {
    const p = a.priority.startsWith('V') ? 'V' : a.priority.charAt(0).toUpperCase() || 'H'
    const detail = `${a.by} broke glass on your private progress note.\n\nReason: ${a.reason}\nDuration: ${a.duration}`
    const row: TaskRow & { box: 'messages' | 'tasks' } = a.method === 'MOIS Task'
      ? { box: 'tasks', p, due: a.date, patient: a.patient, chart: a.chart, task: 'Break Glass - private note accessed', assignee: a.owner.split(',')[0]!.trim(), user: a.owner, created: a.date, createdAt: a.date, createdBy: a.by, detail }
      : { box: 'messages', p, sent: a.date, from: a.by, patient: a.patient, chart: a.chart, subject: 'Break Glass - private note accessed', assignee: a.owner.split(',')[0]!.trim(), sentTo: a.owner, detail }
    set({ alerts: [...state.alerts, row], last: 'break-glass-alert' })
  },

  done(last: string) { set({ last }) },
}
