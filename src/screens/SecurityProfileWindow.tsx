import { useState } from 'react'
import {
  PBBand, PBButton, PBCheckbox, PBDataWindow, PBGroupBox, PBInput, PBTabs, PBTextArea,
  pbSlug, usePBInstrumentation,
} from '../pb'
import {
  LAUNCH_MODE_BUTTONS, LAUNCH_MODE_LIST_HEAD, LAUNCH_MODE_LIST_W, LAUNCH_MODE_NOTE, LAUNCH_MODE_SETTING_HEAD,
  NEW_SECURITY_PROFILE, PROFILE_PICKER, PROFILE_USER_LIST_BAND, PROFILE_USER_LIST_COLUMNS,
  SECURITY_PROFILE_FOOTER, SECURITY_PROFILE_HEADER, SECURITY_PROFILE_SIZE, SECURITY_PROFILE_TAB_W,
  SECURITY_PROFILE_TABS, SECURITY_PROFILE_TITLE, userListSpec, type UserRow,
} from '../data/userManagement'
import {
  ALL_PERMISSIONS, LAUNCH_MODE_SETTINGS, PROFILE_LAUNCH_MODES, type LitePermissions, type ProfileLaunchMode,
} from '../data/launchModes'
import { useSessionState } from '../host/screen-windows'
import { LAYER, ModalWindow } from './dialogKit'
import { DialogFooter, FormLine, footerButtons } from './formKit'
import { useTickSet } from './listKit'
import { UM_CSS, umColumns } from './UserManagementKit'
import { ModuleWindowAccessTab, PANE_PAD, SpecialFunctionsTab, UM_ACCESS_CSS } from './UserAccessTabs'
import { ReportAccessPane } from './ReportAccessPane'
import { LaunchChooser } from './LaunchModeWindows'
import { useScreenReport } from '../host/screen-state'

/* ============================================================================
   Administration ▸ User Management ▸ Security Profiles — the editor, the
   New Security Profile dialog in front of it, plus the picker every "assign
   a security profile" step lands in.

     - `Security Profile Settings`  976 x 682, 5 tabs
       `a1bd18a6fdfa` / `e361c4e01d11` / `9e179125c6d6` / `415516e9d83a`,
       re-read whole off the 2026-10-02 TRAINING captures 03–13
     - `New Security Profile`       capture 02, raised by New Record
     - `User Security Profiles`     `e227667383d1`, the picker raised by the
       `Change` button on the New User dialog and on the User Account tab.

   Above the tab strip, always visible, a bordered band: `Security Profile:`
   — its text selected (the Windows highlight on a white field) as the window
   opens, 03 — and `Description:`. Footer: Apply Changes / Cancel, 88 x 23
   (100 x 27 capture px), 24px apart. The window is 682 high: the capture's
   frame runs 38–816 capture px.

   THE `User List` TAB IS NOT THE `User Accounts` GRID. They carry the same
   column set, but this one HAS gridlines, runs 19px rows under a 29px
   two-LINE header, and stacks `Overrides` over each sub-caption instead of
   spanning one banded super-column. The User Accounts grid's banded 34px
   header is unique to that screen — see `UserManagementView`.
   ========================================================================= */

/** Session key: the profile list, with the ones New Security Profile adds. */
export const SECURITY_PROFILES_KEY = 'admin:security-profiles'

/** The User Security Profiles rows — the seed plus any the learner created. */
export function useSecurityProfiles(): [UserRow[], (next: UserRow[] | ((prev: UserRow[]) => UserRow[])) => void] {
  return useSessionState<UserRow[]>(SECURITY_PROFILES_KEY, userListSpec('ad-security-profiles')?.rows ?? [])
}

/* the header band's own details: a field whose text is selected paints the
   Windows highlight (03), and the band is ruled top and bottom */
const PROFILE_CSS = `
.pb-um-profile-head { border-top: 1px solid #7d7d7d; border-bottom: 1px solid #6e6e6e; }
.pb-um-profile-head .pb-field::selection { background: #0078d7; color: #fff; }
`

export function SecurityProfileWindow({ row, onClose }: { row: UserRow; onClose: () => void }) {
  const host = usePBInstrumentation()
  const [tab, setTab] = useState(SECURITY_PROFILE_TABS[0]!)
  useScreenReport({ dialog: pbSlug(SECURITY_PROFILE_TITLE) })

  return (
    <ModalWindow
      title={SECURITY_PROFILE_TITLE}
      onClose={onClose}
      zIndex={LAYER.workspace}
      windowClassName="pb-um-dialog"
      windowStyle={{
        width: SECURITY_PROFILE_SIZE.w,
        height: SECURITY_PROFILE_SIZE.h,
        maxWidth: '100%',
        maxHeight: '100%',
      }}
      wrap={{ tutorialId: host?.anchor('dialog', pbSlug(SECURITY_PROFILE_TITLE)) }}
      after={<style>{UM_CSS}{PROFILE_CSS}</style>}
    >
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--pb-face)' }}>
            {/* 03: a 31px band, ruled, 2px under the title bar */}
            <div className="pb-row pb-um-profile-head" style={{ gap: 6, height: 31, padding: '0 8px', margin: '2px 1px 0', flex: 'none' }}>
              <span className="pb-form__label">Security Profile:</span>
              <PBInput
                w={SECURITY_PROFILE_HEADER.nameW}
                defaultValue={String(row.profile ?? '')}
                /* the name opens selected, so typing replaces it */
                autoFocus
                onFocus={(e) => e.currentTarget.select()}
                data-tutorial-id="host.mois.field.security-profile"
              />
              <span className="pb-form__label" style={{ marginLeft: 2 }}>Description:</span>
              <PBInput
                w={SECURITY_PROFILE_HEADER.descW}
                defaultValue={String(row.desc ?? '')}
                data-tutorial-id="host.mois.field.description"
              />
            </div>

            {/* five fixed 150px tabs (171 capture px), 10px under the band */}
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '10px 4px 0' }}>
              <PBTabs tabs={SECURITY_PROFILE_TABS} active={tab} onChange={setTab} tabWidth={SECURITY_PROFILE_TAB_W} face>
                <SecurityProfilePage key={tab} tab={tab} />
              </PBTabs>
            </div>
          </div>

          <DialogFooter
            frame="pb"
            gap={24}
            /* 03: the pair sits 14px left of the window's centre, and 33px
               above its bottom edge */
            padding="20px 37px 32px 9px"
            buttons={footerButtons(SECURITY_PROFILE_FOOTER, { wide: true, onPress: onClose }).map((b) => ({ ...b, width: 88, style: { height: 23 } }))}
          />
    </ModalWindow>
  )
}

function SecurityProfilePage({ tab }: { tab: string }) {
  switch (tab) {
    /* profile level: no Override column, unlike the user-level panes */
    case 'Module / Window Access': return <ModuleWindowAccessTab />
    case 'Special Functions': return <SpecialFunctionsTab />
    case 'Report Access': return <ReportAccessPane />
    case 'User List': return <ProfileUserListTab />
    case 'Launch Mode': return <LaunchModeTab />
    default: return <div style={{ flex: '1 1 auto' }} />
  }
}

/* --------------------------------------------------------------------------
   `User List`   `415516e9d83a`, capture 10
   ------------------------------------------------------------------------ */

/* 10: an 18px gutter (21 capture px), and every caption sits on the top
   line of the 29px header rather than centred in it */
const USER_LIST_CSS = `
.pb-um-userlist { --pb-dw-gutter-width: 18px; }
.pb-um-userlist .pb-dw__table > thead > tr > th { vertical-align: top; padding-top: 2px; }
`

function ProfileUserListTab() {
  const [cur, setCur] = useState(0)
  /* the users this profile is on. The `User Accounts` roster is the source,
     so the two grids agree about who is inactive and about the override ink. */
  /* 10 lists the active users first, then the inactive, each by name */
  const rows = [...(userListSpec('ad-users')?.rows ?? [])].sort((a, b) =>
    Number(a.status === 'I') - Number(b.status === 'I') || String(a.display).localeCompare(String(b.display)))

  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: PANE_PAD }}>
      <style>{UM_ACCESS_CSS}{USER_LIST_CSS}</style>
      <div className="pb-um-pane pb-um-userlist" style={{ flex: '1 1 auto' }}>
        <PBBand>{PROFILE_USER_LIST_BAND}</PBBand>
        {/* 29px two-line header, 19px rows, and — unlike User Accounts — rules */}
        <div className="pb-um-inactive pb-um-head29" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
          <PBDataWindow<UserRow>
            rows={rows}
            current={cur}
            onCurrentChange={setCur}
            columns={umColumns(PROFILE_USER_LIST_COLUMNS)}
            flush
            style={{ ['--pb-dw-row-h' as string]: '19px' }}
            rowClassName={(r) => (r.status === 'I' ? 'is-inactive' : undefined)}
            rowTutorialId={(r) => `host.mois.row.profile-user-${pbSlug(String(r.user ?? ''))}`}
            empty=" "
          />
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   `Launch Mode`   captures 11–13

   Add Launch Mode / Remove Launch Mode (98 / 122 x 21) and, from the right
   pane's edge, the note; under them two butted list boxes, `Launch Mode`
   (303px) and the selected mode's settings. Empty (11) the right box is
   captioned `Launch Mode Setting`; with Main Program selected (13) it reads
   `Core MOIS` over `Not additional settings`. Add raises Select Launch Mode
   (12) over the window; Ok adds the selected mode, which becomes current.
   Reported: `host.screen.launchModes` (the slugs, comma-joined) and
   `launchMode` (the current one).
   ------------------------------------------------------------------------ */

/* 11 / 13: captions and names sit 9px into their boxes */
const LAUNCH_CSS = `.pb-um-launch .pb-dw { border: 1px solid #a0a0a0; --pb-dw-pad-x: 9px; }`

function LaunchModeTab() {
  const [modes, setModes] = useState<ProfileLaunchMode[]>([])
  const [cur, setCur] = useState(0)
  const [picking, setPicking] = useState(false)
  const [perms, setPerms] = useState<LitePermissions>(ALL_PERMISSIONS)
  const selected = modes[cur]
  const setting = selected ? LAUNCH_MODE_SETTINGS[selected] : undefined
  useScreenReport({ launchModes: modes.map((m) => pbSlug(m)).join(','), launchMode: selected ? pbSlug(selected) : '' })

  const press = (b: string) => {
    if (b === 'Add Launch Mode') setPicking(true)
    if (b === 'Remove Launch Mode' && selected) {
      setModes((m) => m.filter((x) => x !== selected))
      setCur(0)
    }
  }

  type SettingRow = { text: string; key?: keyof LitePermissions }
  const settingRows: SettingRow[] = !setting
    ? []
    : setting.permissions
      ? setting.permissions.map((p) => ({ text: p.label, key: p.key }))
      : [{ text: setting.text ?? '' }]

  return (
    <div className="pb-um-access pb-um-launch" style={{ flex: '1 1 auto', minHeight: 0, display: 'grid', gridTemplateColumns: `${LAUNCH_MODE_LIST_W}px 1fr`, gridTemplateRows: 'auto 1fr', rowGap: 7, padding: '8px 8px 8px 7px' }}>
      <style>{UM_ACCESS_CSS}{LAUNCH_CSS}</style>
      <span className="pb-row" style={{ gap: 4, paddingLeft: 1 }}>
        {LAUNCH_MODE_BUTTONS.map((b) => (
          <PBButton key={b} command={pbSlug(b)} style={{ minWidth: 0, height: 21, width: b === 'Add Launch Mode' ? 98 : 122 }} onClick={() => press(b)}>
            {b}
          </PBButton>
        ))}
      </span>
      <span className="pb-row" style={{ paddingLeft: 1 }}>{LAUNCH_MODE_NOTE}</span>

      <div style={{ display: 'flex', minHeight: 0 }}>
        <PBDataWindow<{ mode: ProfileLaunchMode }>
          rows={modes.map((mode) => ({ mode }))}
          current={cur}
          onCurrentChange={setCur}
          gutter={false}
          rules={false}
          empty={false}
          rowTutorialId={(r) => `host.mois.row.launch-mode-${pbSlug(r.mode)}`}
          columns={[{ key: 'mode', header: LAUNCH_MODE_LIST_HEAD, headAlign: 'left' }]}
        />
      </div>
      {/* butted to the list: the two boxes share their border */}
      <div style={{ display: 'flex', minHeight: 0, marginLeft: -1 }} data-tutorial-id="host.mois.group.launch-mode-setting">
        <PBDataWindow<SettingRow>
          rows={settingRows}
          current={-1}
          gutter={false}
          rules={false}
          empty={false}
          columns={[{
            key: 'text',
            header: setting?.caption ?? LAUNCH_MODE_SETTING_HEAD,
            headAlign: 'left',
            render: (r: SettingRow) => (r.key
              ? (
                <PBCheckbox
                  label={r.text}
                  checked={perms[r.key]}
                  onChange={(v) => setPerms((p) => ({ ...p, [r.key!]: v }))}
                  tutorialId={`host.mois.cell.launch-${pbSlug(r.text)}`}
                />
              )
              /* 13: the line is the soft grey of the caption ink */
              : <span style={{ color: '#808080' }}>{r.text}</span>),
          }]}
        />
      </div>

      {picking && (
        <LaunchChooser
          id="select-launch-mode"
          title="Select Launch Mode"
          header={['Launch Mode']}
          rows={PROFILE_LAUNCH_MODES.map((m) => ({ cells: [m.label], mode: m.mode }))}
          buttons="ok-cancel"
          plain
          initial={0}
          zIndex={90}
          onPick={(_, i) => {
            const label = PROFILE_LAUNCH_MODES[i]!.label
            const next = modes.includes(label) ? modes : [...modes, label]
            setModes(next)
            setCur(next.indexOf(label))
            setPicking(false)
          }}
          onCancel={() => setPicking(false)}
        />
      )}
    </div>
  )
}

/* ===========================================================================
   `New Security Profile`   capture 02 (2026-10-02 TRAINING)

   New Record on User Security Profiles. The capture shows the dialog only,
   not what Continue does; INFERRED from the User Accounts flow (Create User
   adds the row and opens the editor, `303183`): Continue with a name adds
   the profile to the list — Number of Users 0 — and opens Security Profile
   Settings on it. A blank name does nothing.
   ======================================================================== */

const NEW_PROFILE_CSS = `.pb-um-newprofile > .pb-band { min-height: 20px; border-bottom: 1px solid #a2a09d; }`

export type NewSecurityProfileDraft = { profile: string; desc: string }

export function NewSecurityProfileDialog({ onContinue, onClose }: {
  onContinue: (draft: NewSecurityProfileDraft) => void
  onClose: () => void
}) {
  const d = NEW_SECURITY_PROFILE
  const [draft, setDraft] = useState<NewSecurityProfileDraft>({ profile: '', desc: '' })
  useScreenReport({ newSecurityProfileReady: Boolean(draft.profile.trim()) })

  return (
    <ModalWindow
      id="new-security-profile"
      title={d.title}
      onClose={onClose}
      portal="inline"
      report
      zIndex={80}
      windowClassName="pb-um-dialog"
      windowStyle={{ width: d.w }}
    >
      <style>{NEW_PROFILE_CSS}</style>
      <div style={{ background: 'var(--pb-face)', padding: '19px 17px 0' }}>
        <div className="pb-groupbox pb-um-newprofile" style={{ background: 'var(--pb-face)', borderColor: '#a0a0a0' }}>
          <PBBand>{d.band}</PBBand>
          {/* both captions start 11px into the panel, left-aligned */}
          <div style={{ padding: '9px 0 11px 11px' }}>
            <FormLine label="Security Profile:" minW={d.labelW} labelAlign="left" padding="1px 0">
              <PBInput
                w={d.nameW}
                value={draft.profile}
                autoFocus
                onChange={(e) => setDraft({ ...draft, profile: e.target.value })}
                data-tutorial-id="host.mois.field.security-profile"
              />
            </FormLine>
            <FormLine label="Description:" minW={d.labelW} labelAlign="left" padding="1px 0" align="flex-start">
              <PBTextArea
                rows={2}
                w={d.descW}
                value={draft.desc}
                onChange={(e) => setDraft({ ...draft, desc: e.target.value })}
                style={{ height: 31, resize: 'none' }}
                data-tutorial-id="host.mois.field.description"
              />
            </FormLine>
          </div>
        </div>
      </div>
      <DialogFooter
        frame="pb"
        gap={9}
        /* 02: the pair sits 11px left of the window's centre */
        padding="17px 31px 24px 9px"
        buttons={footerButtons(d.buttons, {
          prefix: 'new-security-profile-',
          onPress: (b) => {
            if (b !== 'Continue') { onClose(); return }
            if (draft.profile.trim()) onContinue({ profile: draft.profile.trim(), desc: draft.desc.trim() })
          },
        }).map((b) => ({ ...b, width: 75, style: { height: 21 } }))}
      />
    </ModalWindow>
  )
}

/* ===========================================================================
   The `User Security Profiles` picker  2026-10-06 capture (1:1)

   `303189`: check the boxes that apply, press `Change Privileges`. A checked
   row highlights #9CFB9C.

   Laid out to the 2026-10-06 capture of User Account ▸ Security Profiles ▸
   Change (the older help-site `e227667383d1` is resampled and drew a wider
   window): a 259px window holding one sunken box — 14 in from the left, 20
   from the right — opening with a 21px grey `Select Security Profiles`
   band, then a 16px blue header over `Select` (37) / `Security Profile`, and
   white 19px rows with no current-row gutter, 12½ of them before the list
   scrolls. The profiles are listed by name. `Change Privileges` (93) and
   `Cancel` (71), 22 tall, sit centred 13 under the box with 11 of face
   below them (re-measured with the 100% frame: the client is 338 tall).
   ======================================================================== */

const PICKER = { w: 259, padTop: 16, padLeft: 14, padRight: 20, band: 21, listH: 253, selectW: 37, gap: 13, foot: 11, buttonH: 22 }
const byProfileName = (a: UserRow, b: UserRow) => String(a.profile ?? '').localeCompare(String(b.profile ?? ''))

export function SecurityProfilePickerDialog({ selected, onApply, onClose }: {
  selected: string[]
  onApply: (next: string[]) => void
  onClose: () => void
}) {
  const host = usePBInstrumentation()
  const [cur, setCur] = useState(0)
  const picked = useTickSet<string>(selected)
  /* the list as User Security Profiles holds it, new profiles included */
  const [profiles] = useSecurityProfiles()
  const rows = [...profiles].sort(byProfileName)
  useScreenReport({
    dialog: pbSlug(PROFILE_PICKER.title),
    primaryCareAssistantProfile: picked.has('PRIMARY CARE ASSISTANT'),
    readOnlyProfile: picked.has('READ ONLY'),
  })
  const buttons = footerButtons(PROFILE_PICKER.buttons, {
    onPress: (b) => (b === 'Change Privileges' ? onApply([...picked.ticked]) : onClose()),
  }).map((button) => ({
    ...button,
    command: button.command === 'cancel' ? 'user-security-profiles-cancel' : button.command,
    width: button.label === 'Cancel' ? 71 : 93,
    style: { height: PICKER.buttonH },
  }))

  return (
    <ModalWindow
      title={PROFILE_PICKER.title}
      onClose={onClose}
      zIndex={LAYER.demographic}
      windowClassName="pb-um-dialog"
      windowStyle={{ width: PICKER.w }}
      wrap={{ tutorialId: host?.anchor('dialog', pbSlug(PROFILE_PICKER.title)) }}
      after={<style>{UM_CSS}</style>}
    >
          <div style={{ flex: '1 1 auto', minHeight: 0, background: 'var(--pb-face)', padding: `${PICKER.padTop}px ${PICKER.padRight}px 0 ${PICKER.padLeft}px` }}>
            <PBGroupBox title={PROFILE_PICKER.group} pad={false} style={{ ['--pb-band-h' as string]: `${PICKER.band}px`, borderColor: '#797979' }}>
              <div className="pb-um-picker" style={{ height: PICKER.listH, display: 'flex', ['--pb-dw-row-h' as string]: '19px' }}>
                <PBDataWindow<UserRow>
                  rows={rows}
                  current={cur}
                  onCurrentChange={setCur}
                  gutter={false}
                  zebra={false}
                  rowClassName={(r) => (picked.has(String(r.profile)) ? 'is-picked' : undefined)}
                  columns={[
                    {
                      key: 'select',
                      header: 'Select',
                      width: PICKER.selectW,
                      align: 'center',
                      render: (r: UserRow) => (
                        /* the anchor rides the input, not the cell around it */
                        <PBCheckbox
                          checked={picked.has(String(r.profile))}
                          onChange={() => picked.flip(String(r.profile))}
                          tutorialId={`host.mois.cell.select-${pbSlug(String(r.profile ?? ''))}`}
                        />
                      ),
                    },
                    /* centred over the left-set names */
                    { key: 'profile', header: 'Security Profile' },
                  ]}
                  rowTutorialId={(r) => `host.mois.row.pick-${pbSlug(String(r.profile ?? ''))}`}
                />
              </div>
            </PBGroupBox>
          </div>

          <DialogFooter gap={10} padding={`${PICKER.gap}px 0 ${PICKER.foot}px`} background="var(--pb-face)" buttons={buttons} />
    </ModalWindow>
  )
}
