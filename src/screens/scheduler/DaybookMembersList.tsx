import { useState, type CSSProperties, type ReactNode } from 'react'
import { PBButton, pbSlug } from '../../pb'
import { MOIS_TODAY } from '../../data/clock'
import { DESKTOP_PROVIDER_DEFAULT } from '../../data/session'
import { S, argStr } from '../../data/text'
import { userListSpec } from '../../data/userManagement'
import { useScreenReport } from '../../host/screen-state'
import { useSessionState } from '../../host/screen-windows'
import { membersKey, type Member } from '../OrgRoleWindows'
import { registerAreaWindow, type AreaWindowProps } from '../areaWindowRegistry'
import { WorkspaceDialogFrame } from '../WorkspaceDialogFrame'

/* ============================================================================
   Day Book ▸ Daybook For ▸ Members: "Members List: <provider>".

   PROVENANCE: 2026-10-02 TRAINING capture (Desktop 11.44.08 PM, v02.31.23,
   ≈1.13× CSS px). A window almost the frame's size (970 × 740) holding one
   read-only DataWindow in a ruled box and a Close button at the bottom right
   (74 × 21). The grid is the Organization ▸ Member grid's (OrgRoleWindows,
   TRAINING 2026-09-29 13:00): a 48 px two-row header on a pale blue gradient
   (#c2e8f8 → #f6fcfe) with "Access to Workspace Items" over Basket · Task
   List · Message Board, then Start and End; the same column widths (gutter
   20, Member 318, 70 / 60 / 98, Start 80, End 73); a 35 px grey-gradient
   band per member type with a ⊟ box; 20 px rows. What differs from the
   Member tab: the access columns print Y or N (never blank), a member whose
   End has passed is greyed (#969696) whole-row, and the current row is a
   lighter salmon (#f2c6b8). Dates print 2022-06-24, a current member's Start
   in bold. No rule closes the header after End.

   Who is listed: the members saved on the Organization's Member tab this
   session; when none were, this session's user accounts stand in (their
   Effective / Expiry as Start / End, full access until they expire).
   INFERRED — the capture's own members are real staff and are not copied.
   The grid is drawn here rather than through PBDataWindow because the kit
   has no two-row header; it repeats MemberGrid's geometry (kit candidate:
   lift MemberGrid out of OrgRoleWindows so both windows share it).
   ========================================================================= */

const COLS = [
  { key: 'gutter', w: 20 }, { key: 'member', w: 318 }, { key: 'basket', w: 70 }, { key: 'taskList', w: 60 },
  { key: 'messageBoard', w: 98 }, { key: 'start', w: 80 }, { key: 'end', w: 73 },
] as const
type ColKey = typeof COLS[number]['key']
const RULE = '1px solid #b9cddb'
const GREY = '#969696'
const BANDS: { type: Member['type']; label: string }[] = [
  { type: 'ORG ROLE', label: 'Org. Roles' }, { type: 'PROVIDER', label: 'Providers' }, { type: 'USER', label: 'Users' },
]

const x = (key: ColKey) => { let n = 0; for (const c of COLS) { if (c.key === key) return n; n += c.w } return n }
const w = (key: ColKey) => COLS.find((c) => c.key === key)!.w
const TOTAL = COLS.reduce((n, c) => n + c.w, 0)

/** this session's user accounts as members, when the organization has none saved */
function standIns(): Member[] {
  return (userListSpec('ad-users')?.rows ?? []).map((r) => {
    const end = S(r.expiry)
    const live = !end || end > MOIS_TODAY
    return { name: S(r.display), type: 'USER' as const, basket: live, taskList: live, messageBoard: live, start: S(r.effective), end, note: '' }
  }).filter((m) => m.name)
}

function DaybookMembersList({ args, close }: AreaWindowProps) {
  const provider = argStr(args.provider) || DESKTOP_PROVIDER_DEFAULT
  const [saved] = useSessionState<Member[]>(membersKey('organization', provider), [])
  const members = (saved.length ? saved : standIns()).slice().sort((a, b) => a.name.localeCompare(b.name))
  const [shut, setShut] = useState<Set<string>>(new Set())
  const [cur, setCur] = useState(0)
  useScreenReport({ dialog: 'daybook-members', members: members.length })

  const iso = (d: string) => d.replace(/\./g, '-')
  const yn = (v: boolean) => (v ? 'Y' : 'N')
  const cell = (key: ColKey, children: ReactNode, style?: CSSProperties) => (
    <span style={{ position: 'absolute', left: x(key), width: w(key), textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', ...style }}>{children}</span>
  )
  const wsLeft = x('basket')
  const wsWidth = x('start') - wsLeft
  let index = -1

  return (
    <WorkspaceDialogFrame id="daybook-members" title={`Members List: ${provider}`} width={970} height={740} onClose={close} controls={false} zIndex={85}>
      <div style={{ flex: '1 1 auto', minHeight: 0, margin: '6px 5px 0', border: '1px solid #878c8f', background: '#fff', overflow: 'auto' }} data-tutorial-id="host.mois.field.daybook-members-grid">
        <div style={{ position: 'relative', height: 48, minWidth: TOTAL, background: 'linear-gradient(#c2e8f8, #f6fcfe)', borderBottom: '2px solid #d6d6d6' }}>
          {[x('member'), wsLeft, x('start'), x('end')].map((l) => <span key={l} style={{ position: 'absolute', left: l, top: 4, bottom: 0, borderLeft: RULE }} />)}
          {[x('taskList'), x('messageBoard')].map((l) => <span key={l} style={{ position: 'absolute', left: l, top: 24, bottom: 0, borderLeft: RULE }} />)}
          <span style={{ position: 'absolute', left: wsLeft, width: wsWidth, top: 5, textAlign: 'center' }}>Access to Workspace Items</span>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 27 }}>
            {cell('member', 'Member', { textAlign: 'left', paddingLeft: 5 })}
            {cell('basket', 'Basket')}{cell('taskList', 'Task List')}{cell('messageBoard', 'Message Board')}
            {cell('start', 'Start')}{cell('end', 'End')}
          </div>
        </div>
        {BANDS.filter((b) => members.some((m) => m.type === b.type)).map((band) => {
          const open = !shut.has(band.type)
          return (
            <div key={band.type}>
              <div
                role="button" tabIndex={-1}
                data-tutorial-id={`host.mois.group.daybook-members-${pbSlug(band.label)}`}
                onClick={() => setShut((prev) => { const next = new Set(prev); if (next.has(band.type)) next.delete(band.type); else next.add(band.type); return next })}
                style={{ position: 'relative', height: 35, minWidth: TOTAL, background: 'linear-gradient(#cbccce, #f7f7f8)', display: 'flex', alignItems: 'center', cursor: 'default' }}
              >
                <span aria-hidden style={{ marginLeft: 13, width: 9, height: 9, border: '1px solid #8a8a8a', background: '#fff', fontSize: 9, lineHeight: '8px', textAlign: 'center' }}>{open ? '−' : '+'}</span>
                <strong style={{ marginLeft: 10 }}>{band.label}</strong>
              </div>
              {members.map((m) => {
                if (m.type !== band.type) return null
                index += 1
                if (!open) return null
                const i = index
                const ended = Boolean(m.end) && m.end <= MOIS_TODAY
                return (
                  <div
                    key={`${band.type}-${m.name}`}
                    data-tutorial-id={`host.mois.row.daybook-member-${pbSlug(m.name)}`}
                    onClick={() => setCur(i)}
                    style={{ position: 'relative', height: 20, lineHeight: '20px', minWidth: TOTAL, cursor: 'default', background: i === cur ? '#f2c6b8' : undefined, color: ended ? GREY : undefined }}
                  >
                    {cell('member', m.name, { textAlign: 'left', paddingLeft: 9 })}
                    {cell('basket', yn(m.basket))}{cell('taskList', yn(m.taskList))}{cell('messageBoard', yn(m.messageBoard))}
                    {cell('start', iso(m.start), ended ? undefined : { fontWeight: 700 })}{cell('end', iso(m.end))}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
      <div className="pb-row" style={{ justifyContent: 'flex-end', padding: '12px 8px 14px', flex: 'none' }}>
        <PBButton command="daybook-members-close" className="pb-btn--default" style={{ width: 74, minWidth: 0, height: 21 }} onClick={close}>Close</PBButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

registerAreaWindow('daybook-members', DaybookMembersList)
