/* ============================================================================
   The MOIS environment the frame stands in for.

   What a MOIS screen shows depends on the site as much as on the build: the
   frame's caption and Site ID, the build in the status bar, the System
   Settings rows the site ships differently, and the features a later build
   added. The emulator is confirmed against TRAINING on v02.31.23, so that is
   the default; another environment is chosen with `?env=<id>` on the
   standalone viewer or the shell's `environment` prop.

     training  MOIS: TRAINING, Site ID rain, v02.31.23 b250508 — the
               2026-09-29 / 2026-10-02 TRAINING captures. MAR Ordering is
               OFF there: c25's New … chooser offers five choices.
     dev       MOIS: MOIS DEV, Site ID _dev, v02.31.23 b250508 — the 2026-08
               field-audit evidence (~/github/Mois/outputs/019ff32b…), whose
               MAR also runs with Ordering OFF (MATRIX-R0758 greys Open
               Parent Order).
     manual    The help site's reference setup: every System Settings row as
               the articles ship it (MAR Ordering ON, the eight-choice
               chooser of `70e81e88…`), on the newest build the manual
               documents, v02.31.41 (article 303492). INFERRED: its Site ID,
               which no help image prints legibly.

   The environment is set once per frame, before its screens render
   (setMoisEnvironment, called by the shell), and read anywhere — data
   modules included — through currentEnvironment().
   ========================================================================= */

export type MoisEnvironment = {
  id: string
  label: string
  /** the MDI frame's caption */
  title: string
  /** the status bar's Site ID */
  siteId: string
  /** the build, `02.31.23` */
  build: string
  /** the build stamp printed after it */
  stamp: string
  /** System Settings rows this site ships differently, by row name */
  settings: Readonly<Record<string, string>>
}

export const MOIS_ENVIRONMENTS: Readonly<Record<string, MoisEnvironment>> = {
  training: {
    id: 'training', label: 'TRAINING (v02.31.23)', title: 'MOIS: TRAINING', siteId: 'rain',
    build: '02.31.23', stamp: 'b250508', settings: { 'MAR Ordering': 'OFF' },
  },
  dev: {
    id: 'dev', label: 'MOIS DEV (v02.31.23)', title: 'MOIS: MOIS DEV', siteId: '_dev',
    build: '02.31.23', stamp: 'b250508', settings: { 'MAR Ordering': 'OFF' },
  },
  manual: {
    id: 'manual', label: 'User manual reference (v02.31.41)', title: 'MOIS: RELEASE CANDIDATE', siteId: '_dev',
    build: '02.31.41', stamp: 'b250508', settings: {},
  },
}

export const DEFAULT_ENVIRONMENT = 'training'

let current: MoisEnvironment = MOIS_ENVIRONMENTS[DEFAULT_ENVIRONMENT]!

/** The id the viewer asked for: the shell's prop, else `?env=`, else TRAINING. */
export function requestedEnvironment(prop?: string): string {
  const asked = prop ?? (typeof window === 'undefined' ? undefined : new URLSearchParams(window.location.search).get('env') ?? undefined)
  return asked && MOIS_ENVIRONMENTS[asked] ? asked : DEFAULT_ENVIRONMENT
}

export function setMoisEnvironment(id: string) {
  current = MOIS_ENVIRONMENTS[id] ?? MOIS_ENVIRONMENTS[DEFAULT_ENVIRONMENT]!
}

export const currentEnvironment = (): MoisEnvironment => current

const parts = (build: string) => build.split('.').map((n) => Number.parseInt(n, 10) || 0)

/** Whether the environment's build is `build` or later — gates a feature a
    later build added (the Basket's More tab arrived in v02.31.41). */
export function buildAtLeast(build: string): boolean {
  const [a, b] = [parts(current.build), parts(build)]
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0)
  }
  return true
}
