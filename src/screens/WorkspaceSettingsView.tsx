import { PBCommandRow, PBViewHeader, pbSlug, usePBInstrumentation } from '../pb'
import { useScreenReport } from '../host/screen-state'
import { registerAreaWindow, useOpenWindow } from './areaWindowRegistry'
import { MyUserAccountWindow } from './MyUserAccountWindow'
import {
  MY_SETTINGS_USER, WORKSPACE_SETTINGS_COMMANDS, WORKSPACE_SETTINGS_PANELS, panelRows,
  useWorkspaceSettings, type SettingsPanel,
} from '../data/workspaceSettings'

/* ============================================================================
   Workspace ▸ My Settings ▸ Workspace — "Workspace Settings".

   PROVENANCE. 303743 "Workspace Settings", image `a2a1a0e8` (2023 build,
   v02.30.22), checked against 303747 "How to Share a Workspace", image
   `3e63da6d` (2016 build, Edit… ringed in red). Both show:

     - the navy header `Workspace Settings` with the user's name at the right
       and no patient banner — this is the user's screen, not a chart's;
     - a two-button command row, `Edit...` then `Refresh`;
     - four read-only panels in a 2 x 2 grid: Active Workspace Sharing Rules
       and Workspaces Shared With Me across the top, Active Inbox Forwarding
       Rules and Inboxes Forwarded To Me below, split by a dark rule. Each has
       a pale-blue caption band, a white header ruled underneath (the
       forwarding panels' captions wrap onto two lines), and zebra rows.

   Everything is changed through Edit…, which opens the signed-in user's own
   User Account window on its second tab, Workspace Management (303743:
   "This opens up the User Account window to the second tab labeled
   'Workspace Management'"). That window is `my-user-account`
   (MyUserAccountWindow.tsx); Apply Changes there writes the store this view
   reads, so a new rule appears here the moment the window closes.
   ========================================================================= */

/* Registered here as well as through areaWindows.register.ts. The package's
   `"sideEffects": ["**\/*.css"]` lets the Next bundler drop a side-effect-only
   import, so on the live stage `areaWindows.register` (and every window it
   pulls in) never runs. This view is imported for its export, so a
   registration made from it survives. */
registerAreaWindow('my-user-account', MyUserAccountWindow)

const RULE = '#646464'

function Panel({ panel, rows }: { panel: SettingsPanel; rows: Record<string, string>[] }) {
  const host = usePBInstrumentation()
  return (
    <div
      data-tutorial-id={host?.anchor('group', pbSlug(panel.caption))}
      style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, background: '#ffffff', overflow: 'hidden' }}
    >
      {/* the caption band is a tall pale-blue strip with the caption near its top */}
      <div
        style={{
          flex: 'none', height: 30, padding: '6px 10px 0', background: 'var(--pb-dw-header)',
          fontWeight: 'bold', whiteSpace: 'nowrap',
        }}
      >
        {panel.caption}
      </div>
      <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%' }}>
        <colgroup>
          {panel.columns.map((c) => <col key={c.key} style={{ width: c.width }} />)}
          <col />
        </colgroup>
        <thead>
          <tr style={{ borderBottom: '1px solid #3c3c3c' }}>
            {panel.columns.map((c) => (
              <th
                key={c.key}
                style={{
                  height: 34, padding: '0 8px 2px', verticalAlign: 'bottom', textAlign: 'left',
                  fontWeight: 'bold', whiteSpace: 'pre', lineHeight: '13px',
                }}
              >
                {c.header}
              </th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              data-tutorial-id={host?.anchor('row', `${panel.id}-${i + 1}`)}
              style={{ height: 23, background: i % 2 === 0 ? '#f0f0f0' : '#ffffff' }}
            >
              {panel.columns.map((c) => (
                <td key={c.key} style={{ padding: '0 8px', whiteSpace: 'nowrap', overflow: 'hidden' }}>{r[c.key]}</td>
              ))}
              <td />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function WorkspaceSettingsView() {
  const open = useOpenWindow()
  const settings = useWorkspaceSettings()
  const rows = Object.fromEntries(
    WORKSPACE_SETTINGS_PANELS.map((p) => [p.id, panelRows(p.id, settings)]),
  ) as Record<SettingsPanel['id'], Record<string, string>[]>

  /* `rows` is the number of active sharing rules, and `row` the account the
     newest one names (a user slug): a rule added under Sharing Workspace
     With and applied shows up here as the last row */
  const newest = rows.sharing[rows.sharing.length - 1]
  useScreenReport({ rows: rows.sharing.length, row: newest ? pbSlug(newest.user ?? '') || null : null })

  const [sharing, sharedWithMe, forwarding, forwardedToMe] = WORKSPACE_SETTINGS_PANELS

  return (
    <>
      <PBViewHeader title="Workspace Settings" right={<span style={{ fontWeight: 'bold' }}>{MY_SETTINGS_USER}</span>} />
      <PBCommandRow
        commands={WORKSPACE_SETTINGS_COMMANDS.map((label) => ({
          label,
          width: 81,
          /* Edit… opens the User Account window on Workspace Management;
             Refresh re-reads the panels, which already follow the store */
          onClick: label === 'Edit...'
            ? () => { open('my-user-account', { tab: 'Workspace Management' }) }
            : () => { /* the panels are read from the store on every render */ },
        }))}
      />
      <div
        style={{
          flex: '1 1 auto', minHeight: 0, display: 'grid',
          gridTemplateColumns: '1fr 1fr', gridTemplateRows: '57fr 43fr',
          gap: 1, background: RULE, borderTop: `1px solid ${RULE}`,
        }}
      >
        <Panel panel={sharing!} rows={rows.sharing} />
        <Panel panel={sharedWithMe!} rows={rows['shared-with-me']} />
        <Panel panel={forwarding!} rows={rows.forwarding} />
        <Panel panel={forwardedToMe!} rows={rows['forwarded-to-me']} />
      </div>
    </>
  )
}
