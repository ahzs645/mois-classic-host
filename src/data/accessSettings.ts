import { useSessionState } from '../host/screen-windows'
import { SYSTEM_SETTINGS, SYSTEM_SETTINGS_KEY, settingRowId } from './systemSettings'
import { SPECIAL_FUNCTION_ROWS } from './userManagement'

/* ============================================================================
   Reading what Administration has switched on, from the screens it switches.

   Two stores decide whether a chart window offers a feature:

   · System Settings (Administration ▸ Configuration ▸ System Settings) keeps
     what its Save commits in the frame's session store under
     SYSTEM_SETTINGS_KEY, by row id (screens/SystemSettingsView.tsx). A row
     nobody has saved still reads its shipped value. The MAR reads `MAR
     Ordering` (303427 `0f376e75…png`), the prescription folder reads the
     APP SETTING - CPP RX band (303227 `6473f689…png`) and the paper-form
     viewer reads `MOIS Viewer Mode` (3073634 `36e533a0…png`) through here.
   · Special Functions (Security Profile / User Account ▸ Special Functions,
     screens/UserAccessTabs.tsx) keeps the Execute ticks the learner leaves
     under SPECIAL_FUNCTIONS_KEY, by function name. The emulator has one
     desktop user, so a tick there is that user's permission: Make Private
     Notes and Break Glass Private Notes (3799750), Can create controlled
     prescriptions (303227 `51c5bd38…png`).

   Neither store is a database: both live as long as the frame does.
   ========================================================================= */

/** A System Settings row's value: the saved one, else the shipped one. */
export function useSystemSetting(name: string): string {
  const [saved] = useSessionState<Record<string, string>>(SYSTEM_SETTINGS_KEY, {})
  const row = SYSTEM_SETTINGS.find((s) => s.name === name)
  if (!row) return ''
  return (saved[settingRowId(row)] ?? row.value).trim()
}

/** Session key: the Special Functions Execute ticks, by function name. */
export const SPECIAL_FUNCTIONS_KEY = 'admin:special-functions'

/** Every function's Execute tick: what the learner set, else the row's own. */
export function useSpecialFunctions(): [Record<string, boolean>, (fn: string, on: boolean) => void] {
  const [ticks, setTicks] = useSessionState<Record<string, boolean>>(SPECIAL_FUNCTIONS_KEY, {})
  const all = Object.fromEntries(SPECIAL_FUNCTION_ROWS.map((r) => [r.fn, ticks[r.fn] ?? Boolean(r.execute)]))
  return [all, (fn, on) => setTicks((t) => ({ ...t, [fn]: on }))]
}

/** Whether the desktop user may run one special function. */
export function useSpecialFunction(fn: string): boolean {
  const [all] = useSpecialFunctions()
  return all[fn] ?? false
}

/* the function names the chart windows check, as Special Functions lists them */
export const FN_MAKE_PRIVATE = 'Access Control - Make Private Notes'
export const FN_BREAK_GLASS_PRIVATE = 'Access Control - Break Glass Private Notes'
export const FN_CONTROLLED_RX = 'Can create controlled prescriptions'
export const FN_OAT = 'OAT Prescribing'

/** `Y`/`YES`/`ON` as the settings write a yes. */
export const isOn = (v: string) => /^(y|yes|on)$/i.test(v)
