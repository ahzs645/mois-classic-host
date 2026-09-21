import { useState } from 'react'
import {
  PBBand, PBButton, PBCheckbox, PBDataWindow, PBGroup, PBInput, PBTabs, PBWindow,
  pbSlug, usePBInstrumentation,
} from '../pb'
import {
  PROFILE_PICKER, PROFILE_USER_LIST_BAND, PROFILE_USER_LIST_COLUMNS,
  SECURITY_PROFILE_FOOTER, SECURITY_PROFILE_SIZE, SECURITY_PROFILE_TABS,
  SECURITY_PROFILE_TITLE, UM_FOCUS, userListSpec, type UserRow,
} from '../data/userManagement'
import { UM_CSS, umColumns } from './UserManagementKit'
import { ModuleWindowAccessTab, ReportAccessTab, SpecialFunctionsTab } from './UserAccessTabs'

/* ============================================================================
   Administration ▸ User Management ▸ Security Profiles — the editor, plus the
   picker every "assign a security profile" step lands in.

     - `Security Profile Settings`  976 x 666, 4 tabs
       `a1bd18a6fdfa` / `e361c4e01d11` / `9e179125c6d6` / `415516e9d83a`
     - `User Security Profiles`     `e227667383d1`, the picker raised by the
       `Change` button on the New User dialog and on the User Account tab.

   Above the tab strip, always visible: `Security Profile:` (selected /
   highlighted in the capture) and `Description:`. Footer: Apply Changes /
   Cancel.

   THE `User List` TAB IS NOT THE `User Accounts` GRID. They carry the same
   column set, but this one HAS gridlines, runs 19px rows under a 29px
   two-LINE header, and stacks `Overrides` over each sub-caption instead of
   spanning one banded super-column. The User Accounts grid's banded 34px
   header is unique to that screen — see `UserManagementView`.
   ========================================================================= */

export function SecurityProfileWindow({ row, onClose }: { row: UserRow; onClose: () => void }) {
  const host = usePBInstrumentation()
  const [tab, setTab] = useState(SECURITY_PROFILE_TABS[0]!)

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 60 }}>
      <style>{UM_CSS}</style>
      <div data-tutorial-id={host?.anchor('dialog', pbSlug(SECURITY_PROFILE_TITLE))}>
        <PBWindow
          child
          controls={false}
          className="pb-um-dialog"
          title={SECURITY_PROFILE_TITLE}
          onClose={onClose}
          style={{
            width: SECURITY_PROFILE_SIZE.w,
            height: SECURITY_PROFILE_SIZE.h,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          <div className="pb-row" style={{ gap: 8, padding: '5px 8px', background: 'var(--pb-face)', flex: 'none' }}>
            <span className="pb-form__label">Security Profile:</span>
            <PBInput
              w={160}
              defaultValue={String(row.profile ?? '')}
              /* highlighted in the capture — the #FFC09C wash */
              style={{ background: UM_FOCUS }}
              data-tutorial-id="host.mois.field.security-profile"
            />
            <span className="pb-form__label">Description:</span>
            <PBInput
              w={380}
              defaultValue={String(row.desc ?? '')}
              data-tutorial-id="host.mois.field.description"
            />
          </div>

          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <PBTabs tabs={SECURITY_PROFILE_TABS} active={tab} onChange={setTab} compact>
              <SecurityProfilePage key={tab} tab={tab} />
            </PBTabs>
          </div>

          <div className="pb-footer">
            <span className="pb-footer__spacer" />
            {SECURITY_PROFILE_FOOTER.map((b) => (
              <PBButton
                key={b}
                wide
                data-tutorial-id={host?.anchor('command', pbSlug(b))}
                onClick={() => {
                  host?.report('command', { command: pbSlug(b) })
                  onClose()
                }}
              >
                {b}
              </PBButton>
            ))}
            <span className="pb-footer__spacer" />
          </div>
        </PBWindow>
      </div>
    </div>
  )
}

function SecurityProfilePage({ tab }: { tab: string }) {
  switch (tab) {
    /* profile level: no Override column, unlike the user-level pane */
    case 'Module / Window Access': return <ModuleWindowAccessTab />
    case 'Special Functions': return <SpecialFunctionsTab />
    case 'Report Access': return <ReportAccessTab />
    case 'User List': return <ProfileUserListTab />
    default: return <div style={{ flex: '1 1 auto' }} />
  }
}

/* --------------------------------------------------------------------------
   `User List`   `415516e9d83a`
   ------------------------------------------------------------------------ */

function ProfileUserListTab() {
  const [cur, setCur] = useState(0)
  /* the users this profile is on. The `User Accounts` roster is the source,
     so the two grids agree about who is inactive and about the override ink. */
  const rows = userListSpec('ad-users')?.rows ?? []

  return (
    <>
      <PBBand>{PROFILE_USER_LIST_BAND}</PBBand>
      {/* 29px two-line header, 19px rows, and — unlike User Accounts — rules */}
      <div className="pb-um-inactive pb-um-head29" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow<UserRow>
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          columns={umColumns(PROFILE_USER_LIST_COLUMNS)}
          style={{ ['--pb-dw-row-h' as string]: '19px' }}
          rowClassName={(r) => (r.status === 'I' ? 'is-inactive' : undefined)}
          rowTutorialId={(r) => `host.mois.row.profile-user-${pbSlug(String(r.user ?? ''))}`}
          empty=" "
        />
      </div>
    </>
  )
}

/* ===========================================================================
   The `User Security Profiles` picker  `e227667383d1`

   `303189`: check the boxes that apply, press `Change Privileges`. A checked
   row highlights #9CFB9C.

   NOTE ON THE HEADER FILL. That capture is 1125x756 — resampled — and its
   grid header measures #CEDFFF rather than the family's #C8DCFA. The spec
   reads that as theme-era drift rather than a second token, so the kit's
   #C8DCFA is what is drawn here.
   ======================================================================== */

export function SecurityProfilePickerDialog({ selected, onApply, onClose }: {
  selected: string[]
  onApply: (next: string[]) => void
  onClose: () => void
}) {
  const host = usePBInstrumentation()
  const [cur, setCur] = useState(0)
  const [picked, setPicked] = useState<Set<string>>(new Set(selected))
  const rows = userListSpec('ad-security-profiles')?.rows ?? []

  const toggle = (name: string) => {
    const next = new Set(picked)
    next.has(name) ? next.delete(name) : next.add(name)
    setPicked(next)
  }

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 90 }}>
      <style>{UM_CSS}</style>
      <div data-tutorial-id={host?.anchor('dialog', pbSlug(PROFILE_PICKER.title))}>
        <PBWindow
          child
          controls={false}
          className="pb-um-dialog"
          title={PROFILE_PICKER.title}
          onClose={onClose}
          style={{ width: 460 }}
        >
          <div style={{ flex: '1 1 auto', minHeight: 0, background: 'var(--pb-face)', padding: '6px 8px' }}>
            <PBGroup title={PROFILE_PICKER.group}>
              <div className="pb-um-picker" style={{ height: 180, display: 'flex' }}>
                <PBDataWindow<UserRow>
                  rows={rows}
                  current={cur}
                  onCurrentChange={setCur}
                  rowClassName={(r) => (picked.has(String(r.profile)) ? 'is-picked' : undefined)}
                  columns={[
                    {
                      key: 'select',
                      header: 'Select',
                      width: 56,
                      align: 'center',
                      render: (r: UserRow) => (
                        /* the anchor rides the input, not the cell around it */
                        <PBCheckbox
                          checked={picked.has(String(r.profile))}
                          onChange={() => toggle(String(r.profile))}
                          tutorialId={`host.mois.cell.select-${pbSlug(String(r.profile ?? ''))}`}
                        />
                      ),
                    },
                    { key: 'profile', header: 'Security Profile', headAlign: 'left' },
                  ]}
                  rowTutorialId={(r) => `host.mois.row.pick-${pbSlug(String(r.profile ?? ''))}`}
                />
              </div>
            </PBGroup>
          </div>

          <div className="pb-footer">
            <span className="pb-footer__spacer" />
            {PROFILE_PICKER.buttons.map((b) => (
              <PBButton
                key={b}
                wide
                data-tutorial-id={host?.anchor('command', pbSlug(b))}
                onClick={() => {
                  host?.report('command', { command: pbSlug(b) })
                  if (b === 'Change Privileges') onApply([...picked])
                  else onClose()
                }}
              >
                {b}
              </PBButton>
            ))}
            <span className="pb-footer__spacer" />
          </div>
        </PBWindow>
      </div>
    </div>
  )
}
