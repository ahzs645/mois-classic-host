import type { PBMenuItem } from '../../pb/components/chrome'

/* ============================================================================
   Per-module (and per-folder) menus.

   MOIS rebuilds the Views, Action, Utilities, Print and Maintenance menus for
   the module you are in, and the Patient Chart's Action menu again for the
   folder you are on: Ctrl+R is Create Referral Note on a chart folder but
   Mark for Review in a Workspace basket. `makeMainMenu` builds the Patient
   Chart set (transcribed from reference/menus/) and then asks this registry
   whether the current module or folder replaces any of those top-level menus.

   Each module keeps its overrides in its own file here (workspace.ts,
   scheduler.ts, …) with the manual article and image each list was
   transcribed from, and registers it below. Return only the menus that
   differ; anything omitted keeps the Patient Chart version.
   ========================================================================= */

export type MenuName = 'Views' | 'Action' | 'Utilities' | 'Print' | 'Maintenance'

/** What an override can reach: the current place, and the frame's actions. */
export type MenuContext = {
  module: string
  node: string
  /** navigation and windows the frame owns — see `MenuGo` in data/mois.tsx */
  go: MenuGo
  /** the Patient Chart set this override replaces, so an override can extend
      a menu (and keep the emulator's own Appearance / Text items) rather
      than re-type it */
  base?: Partial<Record<MenuName, PBMenuItem[]>>
}

/**
 * Callbacks the frame wires. `open` is the general one: it asks the frame to
 * open a named window (the shell's `openWindowById`), so a new menu item does
 * not need a new prop threaded through the shell.
 */
export type MenuGo = {
  node?: (id: string) => void
  module?: (id: string) => void
  lookup?: () => void
  stepChart?: (delta: 1 | -1) => void
  /** a Print-menu item that has a Selection Parameter window behind it */
  print?: (menu: string) => void
  /** Action ▸ Create Referral / Consult Note / Information Request */
  letter?: (documentType?: string) => void
  /** open a window the frame knows by id, with optional arguments */
  open?: (id: string, args?: Record<string, unknown>) => void
  /** press the command-row button of the window in front, by slug
      (Record ▸ New → `new-record`); nothing when that window has none */
  command?: (slug: string) => void
  /** Record ▸ Prompt / F4: the "…" of the field the cursor is in */
  prompt?: () => void
}

export type MenuOverride = (ctx: MenuContext) => Partial<Record<MenuName, PBMenuItem[]>>

/** module id → override; a folder-specific override is keyed `module:node` */
export const menuOverrides: Record<string, MenuOverride> = {}

export function registerMenus(key: string, override: MenuOverride) {
  menuOverrides[key] = override
}

/** the menus the current place replaces, folder first, then module */
export function menusFor(ctx: MenuContext): Partial<Record<MenuName, PBMenuItem[]>> {
  const byModule = menuOverrides[ctx.module]?.(ctx) ?? {}
  const byNode = menuOverrides[`${ctx.module}:${ctx.node}`]?.(ctx) ?? {}
  return { ...byModule, ...byNode }
}
