import { useSessionState } from '../host/screen-windows'
import { MOIS_TODAY } from './patients'

/* ============================================================================
   Private progress notes — who may read which encounter note.

   3799725 / 3799734 / 3799750: an author marks one progress note Private;
   an access-control list then says who may read it — the owner (the author,
   or whoever an administrator made owner with Change Owner), users or groups
   the owner added ("direct" access, no Break Glass needed), and users who
   broke glass (temporary access with a reason, a note and a duration). The
   note stays private while the owner's own access record is running: "If all
   access records expire, the note is no longer private", and deleting or
   end-dating the owner's record "makes the note public immediately".

   The owner's record also carries the Break Glass settings (Authorized Users
   Only / Selected Users Only / Nobody) and the alert (method, priority) —
   "Break Glass Access can only be accessed by the owner" (`2f61265f…png`).

   Kept for the life of the frame in one session store for every chart, so
   Workspace ▸ Other ▸ My Private Notes and Administration ▸ Chart Access
   Control ▸ Private Notes can list them all.

   TRAINING OVERLAY (not in the chart export): chart 87288's exported note on
   encounter 530235 (author LOCKHART, JUSTINE) is private to its author with
   Break Glass open to Authorized Users Only, and the note on 530241 (created
   by MEYER, DEVON) is private with Break Glass set to Nobody — so a lesson can
   show how another user's private note looks, break glass on one, and be
   "Blocked by Author" on the other. Neither encounter is used by another
   lesson. All names are the export's own fictional users.
   ========================================================================= */

export type AccessKind = 'owner' | 'direct' | 'temporary'

export type AccessRow = {
  id: string
  /** a user ("LAST, FIRST") or a group / org role ("MENTAL HEALTH") */
  who: string
  kind: AccessKind
  start: string
  /** '' while it runs */
  stop: string
  note: string
  /** Delete: "Adds an end date for 'right now'" — stopped today, at once */
  ended?: boolean
}

export type BreakGlassMode = 'authorized' | 'selected' | 'nobody'

export type PrivateNote = {
  /** `${chart}:${encounter}:${noteKey}` */
  id: string
  chart: string
  patient: string
  encounter: string
  noteKey: string
  apptDate: string
  apptTime: string
  visitReason: string
  /** who the note is private to, and who manages its access */
  owner: string
  author: string
  /** the note's creator (a transcriptionist marking it for the author) */
  creator: string
  reason: string
  breakGlass: BreakGlassMode
  breakGlassUsers: string[]
  alert: boolean
  method: string
  priority: string
  access: AccessRow[]
}

export const BREAK_GLASS_REASONS = ['', 'CHECK FOR DUPLICATE', 'REGISTER NEW PATIENT', 'STANDARD CARE', "UPDATE PATIENT'S RECORD", 'EMERGENCY CARE', 'OTHER']
export const BREAK_GLASS_DURATIONS = ['Just today', 'Today and Tomorrow', 'For a week'] as const
export const ALERT_METHODS = ['MOIS Message', 'MOIS Task']
export const ALERT_PRIORITIES = ['V. High', 'High', 'Medium', 'Low']

/** The MOIS - Search Window's directory (`15469d8b…png`): users, providers,
    org. roles and organizations, as that capture and the Access Control
    captures name them (all fictional test accounts). */
export type DirectoryRow = { name: string; group: string; type: 'USER' | 'PROVIDER' | 'ORG. ROLE' | 'ORGANIZATION'; members: string; status: 'A' | 'I' }
export const ACCESS_DIRECTORY: DirectoryRow[] = [
  { name: 'ADMIN, TRACKINGBOARD', group: 'ADMINISTRATION', type: 'USER', members: '', status: 'A' },
  { name: 'ADMINISTRATOR, FIRSTNAME', group: 'ADMINISTRATION', type: 'PROVIDER', members: '.; 2, TEST2; MOIS, UNIVERSITY; RADIOLOGIST', status: 'A' },
  { name: 'BILLERSON, BILLY', group: 'ADMINISTRATION', type: 'USER', members: '', status: 'A' },
  { name: 'CANDYLAND', group: '', type: 'ORGANIZATION', members: 'View Members', status: 'A' },
  { name: 'DUCHARME, AMARILYS', group: 'NURSING', type: 'PROVIDER', members: '', status: 'A' },
  { name: 'GIESBRECHT, ABBY', group: 'NURSING', type: 'PROVIDER', members: '', status: 'A' },
  { name: 'LOCKHART, JUSTINE', group: 'NURSING', type: 'PROVIDER', members: '', status: 'A' },
  { name: 'MARTY PSYCHIATRIST', group: 'MENTAL HEALTH', type: 'PROVIDER', members: '', status: 'A' },
  { name: 'MENTAL HEALTH', group: '', type: 'ORG. ROLE', members: 'View Members', status: 'A' },
  { name: 'MEYER, DEVON', group: 'NURSING', type: 'PROVIDER', members: '', status: 'A' },
  { name: 'NEPHROLOGY, LAWRENCE', group: 'SPECIALIST', type: 'PROVIDER', members: '', status: 'A' },
  { name: 'PAYNE, LIZ', group: 'MENTAL HEALTH', type: 'PROVIDER', members: '', status: 'A' },
  { name: 'TECHNICAL SUPPORT', group: 'ADMINISTRATION', type: 'USER', members: '', status: 'A' },
  { name: 'USERACCOUNT, TESTING', group: 'ADMINISTRATION', type: 'USER', members: '', status: 'A' },
]

/** Does an access row run today? */
export const running = (r: AccessRow, today = MOIS_TODAY) => !r.ended && r.start <= today && (!r.stop || r.stop >= today)

/** A note is private while its owner's own record runs. */
export const isPrivate = (n: PrivateNote | undefined) => !!n && n.access.some((r) => r.kind === 'owner' && r.who === n.owner && running(r))

/** Can `user` read the note without breaking glass (or has broken it)? */
export function canRead(n: PrivateNote, user: string): boolean {
  if (!isPrivate(n)) return true
  return n.access.some((r) => r.who === user && running(r))
}

/** Can `user` manage the note's access list (the owner, or directly added)? */
export function canManage(n: PrivateNote, user: string): boolean {
  return n.owner === user || n.access.some((r) => r.who === user && r.kind === 'direct' && running(r))
}

/** Has the owner's Break Glass setting shut `user` out? */
export function blockedByAuthor(n: PrivateNote, user: string): boolean {
  if (n.breakGlass === 'nobody') return true
  if (n.breakGlass === 'selected') return !n.breakGlassUsers.includes(user)
  return false
}

export const noteId = (chart: string, encounter: string, noteKey: string) => `${chart}:${encounter}:${noteKey}`

let seq = 0
export const accessId = () => `access-${Date.now()}-${++seq}`

/* the training overlay (see the header) */
const SEED: Record<string, PrivateNote> = Object.fromEntries([
  {
    id: noteId('87288', '530235', '501165'), chart: '87288', patient: 'AADAMS, PATCH', encounter: '530235', noteKey: '501165',
    apptDate: '', apptTime: '', visitReason: '', owner: 'LOCKHART, JUSTINE', author: 'LOCKHART, JUSTINE', creator: 'LOCKHART, JUSTINE',
    reason: '', breakGlass: 'authorized' as const, breakGlassUsers: [], alert: true, method: 'MOIS Message', priority: 'High',
    access: [{ id: 'seed-530235-owner', who: 'LOCKHART, JUSTINE', kind: 'owner' as const, start: '2025.04.09', stop: '', note: '' }],
  },
  {
    id: noteId('87288', '530241', '501167'), chart: '87288', patient: 'AADAMS, PATCH', encounter: '530241', noteKey: '501167',
    apptDate: '', apptTime: '', visitReason: '', owner: 'MEYER, DEVON', author: 'MEYER, DEVON', creator: 'MEYER, DEVON',
    reason: '', breakGlass: 'nobody' as const, breakGlassUsers: [], alert: false, method: 'MOIS Message', priority: 'High',
    access: [{ id: 'seed-530241-owner', who: 'MEYER, DEVON', kind: 'owner' as const, start: '2025.04.09', stop: '', note: '' }],
  },
].map((n) => [n.id, n]))

export const PRIVATE_NOTES_KEY = 'private-notes'

/** Every private note this frame knows, and a way to change one. */
export function usePrivateNotes(): [Record<string, PrivateNote>, (id: string, fn: (n: PrivateNote | undefined) => PrivateNote | undefined) => void] {
  const [notes, setNotes] = useSessionState<Record<string, PrivateNote>>(PRIVATE_NOTES_KEY, SEED)
  const update = (id: string, fn: (n: PrivateNote | undefined) => PrivateNote | undefined) => setNotes((all) => {
    const next = fn(all[id])
    const copy = { ...all }
    if (next) copy[id] = next
    else delete copy[id]
    return copy
  })
  return [notes, update]
}

/** "<AUTHOR> has marked this note private." — what a reader without access
    sees, in the encounter and in the summaries (`e039b91c…png`). */
export const privateLine = (n: PrivateNote) => `${firstLast(n.author || n.owner)} has marked this note private.`

/** "PAYNE, LIZ" → "LIZ PAYNE", the way the private line prints a name. */
export const firstLast = (name: string) => (name.includes(', ') ? name.split(', ').reverse().join(' ') : name)

/** A date `days` after today, yyyy.mm.dd. */
export function daysFromToday(days: number): string {
  const [y, m, d] = MOIS_TODAY.split('.').map(Number)
  const t = new Date(Date.UTC(y!, m! - 1, d! + days))
  return `${t.getUTCFullYear()}.${String(t.getUTCMonth() + 1).padStart(2, '0')}.${String(t.getUTCDate()).padStart(2, '0')}`
}
