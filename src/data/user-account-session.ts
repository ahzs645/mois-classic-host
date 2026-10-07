import { useSessionState } from '../host/screen-windows'
import { clinicListSpec, clinicRowsKey, type ClinicRow } from './clinicManagement'
import { userListSpec, USER_ALIAS_ROWS, SHARING_WORKSPACE_ROWS, type UserRow } from './userManagement'
import { daybookProviders } from './mois'
import { RESOURCES } from './daybook'

/** Administration and scheduler read one per-stage roster; no live accounts are created. */
export function useUserAccounts() {
  return useSessionState<UserRow[]>('admin:user-accounts', userListSpec('ad-users')?.rows ?? [])
}
export function useProviderRoster() {
  const [rows] = useSessionState<ClinicRow[] | null>(clinicRowsKey('ad-provider-list'), null)
  const providers = rows ?? clinicListSpec('ad-provider-list')?.rows ?? []
  return [...daybookProviders, ...providers.filter(r => !daybookProviders.some(p => p.provider === r.name))
    .map(r => ({ provider: String(r.name), type: String(r.ptype ?? ''), loc: '' }))]
}
export function useResourceRoster() {
  const [rows] = useSessionState<ClinicRow[] | null>(clinicRowsKey('ad-resource-list'), null)
  return [...new Set([...RESOURCES, ...(rows ?? clinicListSpec('ad-resource-list')?.rows ?? []).map(r => String(r.code ?? '')).filter(Boolean)])]
}
export type AccountSettings = {
  desktopProvider: string; author: string; ackProgressNotes: boolean;
  profiles: string[]; aliases: UserRow[]; sharing: UserRow[]; saves: number;
}
export const accountSettingsKey = (row: UserRow) => `admin:user-settings:${row.user ?? row.display}`
export const initialAccountSettings = (row: UserRow): AccountSettings => ({
  desktopProvider: '', author: '', ackProgressNotes: false,
  profiles: typeof row.profiles === 'string' ? row.profiles.split('|').filter(Boolean) : [String(row.role || 'MOA')],
  aliases: row.profiles !== undefined ? [] : USER_ALIAS_ROWS, sharing: row.profiles !== undefined ? [] : SHARING_WORKSPACE_ROWS, saves: 0,
})
export function accountOutcomes(settings: AccountSettings, row: UserRow) {
  return {
    residentProfile: settings.profiles.includes('RESIDENT'),
    clericalSupportAccount: row.user === 'ctraining',
    primaryCareAssistantProfile: settings.profiles.includes('PRIMARY CARE ASSISTANT'),
    readOnlyProfile: settings.profiles.includes('READ ONLY'),
    defaultAuthorSelf: Boolean(settings.author && settings.author === row.display),
    desktopProviderPresent: Boolean(settings.desktopProvider),
    manualProgressNotesAcknowledged: !settings.ackProgressNotes,
    completeAliases: settings.aliases.filter(r => r.source && r.value).length,
    workspaceShares: new Set(settings.sharing.filter(r => r.user && !r.stop).map(r => r.user)).size,
    accountSaves: settings.saves,
  }
}
