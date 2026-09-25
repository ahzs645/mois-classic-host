import type { PBMenuItem } from '../../pb/components/chrome'
import { CHART_FOLDER_FOR_BASKET, basketFolders } from '../basket'
import { currentWorkspaceRow } from '../workspaceStore'
import { registerMenus, type MenuContext } from './index'

/* ============================================================================
   The Workspace module's menus.

   MOIS rebuilds Views, Action, Utilities and Print for the Workspace, and
   Action and Print again per folder (art. 303599 "Workspace Contents": "The
   Action tool varies depending on the folder opened"; "The Print tool varies
   depending on the tree menu opened").

   PROVENANCE
   · Views   — 303599 image `0c968e9c` (v02.21.14): the eight baskets, the two
               task folders, the two message folders, then Workspace Settings
               and Favourite Medications, in four separated groups.
   · Action  — Workspace Summary: 303599 image `74b97af2` (Change Desktop
               Provider Alt+D | Change W/S, Clean List).
               Basket folder: 303764 image `22acb4da` and 303765 image
               `1fa8090b` (v02.21.18) — Change Desktop Provider Alt+D, Open
               Chart Alt+F9 | Change W/S, Mark For Review Ctrl+R, Workflow
               Summary | Create Task Ctrl+K, Create Message Ctrl+M, Attachments.
               Message folders: 303753 image `180bb8f4` — Change Desktop
               Provider, Open Chart | Change W/S | Create Task From Message.
               Task folders: the same shape with "Create Message from Task",
               the item 303599 names for the Task Inbox and Sent Tasks.
   · Print   — Task folders: 303771 image `b1ac2b08` / 303599 `ebe698cf`
               (Print Task - Current List, Print Task - Select Parameters |
               Print Select Text Ctrl+Shift+N, Basket Statistics… ▸). Message
               folders read "Print Messages - …" (303599 text). Basket
               Statistics' two reports are named in 303599.
   · Utilities — 303599 image `d0083f40` (v02.22.98): Provider Address to
               Clipboard, Patient Address to Clipboard (lookup) | Change
               Teleplan Password, Share W/S on Behalf Of… (greyed: it is a
               special function granted per security profile).
   · Maintenance — the Patient Chart set plus Save Column Sort Order on the
               list folders (art. 303750: "open the Maintenance menu and click
               'Save Column Sort Order'").
   ========================================================================= */

/* built on first use, not at module load (FIX-BRIEF update: menu files must
   not compute from another data module while the import graph is loading) */
const isBasket = (node: string) => basketFolders.some((f) => f.id === node)
const TASK_NODES = new Set(['ws-task-inbox', 'ws-task-sent'])
const MESSAGE_NODES = new Set(['ws-msg-inbox', 'ws-msg-sent'])


const sep: PBMenuItem = { sep: true }

function views(ctx: MenuContext): PBMenuItem[] {
  const go = (label: string, node: string) => ({ label, onSelect: () => ctx.go.node?.(node) })
  return [
    go('Measures Basket', 'ws-measures'),
    go('Imaging Basket', 'ws-imaging'),
    go('Consults Basket', 'ws-consults'),
    go('Procedures Basket', 'ws-procedures'),
    go('Documents Basket', 'ws-documents'),
    go('Facility Admission Basket', 'ws-admissions'),
    go('Progress Notes Basket', 'ws-progress'),
    go('Orders Basket', 'ws-orders'),
    sep,
    go('Task Inbox', 'ws-task-inbox'),
    go('Sent Tasks', 'ws-task-sent'),
    sep,
    go('Message Inbox', 'ws-msg-inbox'),
    go('Sent Messages', 'ws-msg-sent'),
    sep,
    go('Workspace Settings', 'ws-set-workspace'),
    go('Favourite Medications', 'ws-set-meds'),
  ]
}

function action(ctx: MenuContext): PBMenuItem[] {
  const { node, go } = ctx
  const current = () => currentWorkspaceRow(node)?.args ?? {}
  const desktopProvider: PBMenuItem = { label: 'Change Desktop Provider', key: 'Alt+D' }
  const openChart: PBMenuItem = {
    label: 'Open Chart', key: 'Alt+F9',
    onSelect: () => go.node?.(CHART_FOLDER_FOR_BASKET[node] ?? 'summary'),
  }
  const changeWs: PBMenuItem = { label: 'Change W/S', onSelect: () => go.open?.('change-workspace') }

  if (node === 'ws-summary') {
    return [desktopProvider, sep, changeWs, { label: 'Clean List' }]
  }
  if (isBasket(node)) {
    return [
      desktopProvider, openChart, sep,
      changeWs,
      { label: 'Mark For Review', key: 'Ctrl+R', onSelect: () => go.open?.('mark-for-review', { ...current(), folder: node }) },
      { label: 'Workflow Summary' },
      sep,
      { label: 'Create Task', key: 'Ctrl+K', onSelect: () => go.open?.('create-task', current()) },
      { label: 'Create Message', key: 'Ctrl+M', onSelect: () => go.open?.('create-message', current()) },
      { label: 'Attachments', onSelect: () => go.open?.('basket-attachments', { ...current(), folder: node }) },
    ]
  }
  if (TASK_NODES.has(node)) {
    return [
      desktopProvider, { ...openChart, onSelect: () => go.node?.('summary') }, sep,
      changeWs, sep,
      { label: 'Create Message from Task', onSelect: () => go.open?.('create-message', current()) },
    ]
  }
  if (MESSAGE_NODES.has(node)) {
    return [
      desktopProvider, { ...openChart, onSelect: () => go.node?.('summary') }, sep,
      changeWs, sep,
      { label: 'Create Task From Message', onSelect: () => go.open?.('confirm-task-from-message', current()) },
    ]
  }
  return [desktopProvider, sep, changeWs]
}

function print(ctx: MenuContext): PBMenuItem[] {
  const { node, go } = ctx
  const statistics: PBMenuItem = {
    label: 'Basket Statistics…',
    menu: [{ label: 'Acknowledgement Forwarding' }, { label: 'Acknowledgement Intended Recipient' }],
  }
  const selectText: PBMenuItem = { label: 'Print Select Text', key: 'Ctrl+Shift+N' }
  const list = (noun: 'Task' | 'Messages'): PBMenuItem[] => [
    { label: `Print ${noun} - Current List`, onSelect: () => go.open?.('print-task-list', { node }) },
    { label: `Print ${noun} - Select Parameters`, onSelect: () => go.open?.('report-task-list', { kind: noun === 'Task' ? 'task' : 'message' }) },
    sep,
  ]
  if (TASK_NODES.has(node)) return [...list('Task'), selectText, statistics]
  if (MESSAGE_NODES.has(node)) return [...list('Messages'), selectText, statistics]
  return [selectText, statistics]
}

function utilities(ctx: MenuContext): PBMenuItem[] {
  return [
    { label: 'Provider Address to Clipboard' },
    { label: 'Patient Address to Clipboard (lookup)', onSelect: () => ctx.go.lookup?.() },
    sep,
    { label: 'Change Teleplan Password', onSelect: () => ctx.go.open?.('change-teleplan-password') },
    { label: 'Share W/S on Behalf Of…', disabled: true },
  ]
}

function maintenance(ctx: MenuContext): PBMenuItem[] | undefined {
  const base = ctx.base?.Maintenance
  if (!base) return undefined
  if (!isBasket(ctx.node) && !TASK_NODES.has(ctx.node) && !MESSAGE_NODES.has(ctx.node)) return undefined
  /* after the three MOIS items, before the emulator's Appearance / Text */
  const cut = base.findIndex((item) => item.sep)
  const at = cut < 0 ? base.length : cut
  return [...base.slice(0, at), { label: 'Save Column Sort Order' }, ...base.slice(at)]
}

registerMenus('workspace', (ctx) => {
  const menus = { Views: views(ctx), Action: action(ctx), Print: print(ctx), Utilities: utilities(ctx) }
  const maint = maintenance(ctx)
  return maint ? { ...menus, Maintenance: maint } : menus
})
