import type { ReactNode } from 'react'

/* ============================================================================
   host/types — the contract between this emulator and a host page.

   Webforms declares the canonical version of these types in
   lib/host-emulators/contract.ts; this file restates what the shell needs so
   the package compiles on its own. TypeScript's structural typing checks the
   two against each other where Webforms registers the emulator.
   ========================================================================= */

/**
 * One chart in the frame's roster. Only `chart` and the name parts are needed;
 * everything else fills a column in the Advanced Lookup Service or a field on
 * Patient Summary or Demographics, and is blank when the host does not have
 * it. Administrative only — nothing clinical crosses this boundary.
 */
export interface HostPatient {
  chart: string
  reminders?: { code: string; reminder: string; level: string; note: string; due: string; stopped?: boolean }[]
  status?: string
  first: string
  middle?: string
  last: string
  alias?: string
  /** YYYY.MM.DD */
  dob?: string
  gender?: string
  home?: string
  insurance?: string
  insuranceBy?: string
  dep?: string
  bchn?: string
  note?: string
  location?: string
  provider?: string
  registered?: string
  encounter?: string
  /* --- Contact Information, as Demographics paints it ------------------
     A host supplies these from the chart it already holds (Webforms projects
     them out of the same PatientScenario a form binds against), so the
     emulator's Demographics window and a form's patient fields never
     disagree. The training roster fills them from the captures. */
  address?: string
  address2?: string
  city?: string
  province?: string
  postal?: string
  country?: string
  work?: string
  workExt?: string
  cell?: string
  fax?: string
  emailHome?: string
  emailWork?: string
  /** the contact method the chart prefers — MOIS underlines that label */
  preferredPhone?: string
  /** the "Leave Message" flag beside each number */
  homeMessage?: boolean
  workMessage?: boolean

  /* --- Office / Pharmacy / audit --------------------------------------- */
  lastContact?: string
  pharmacy?: { name?: string; address?: string; phone?: string; fax?: string }
  /** `YYYY.MM.DD  HH:MM  USER` — the window's Created / Last Modified line */
  created?: string
  modified?: string
  /** the chart's coded flags, as the Selected Items grid lists them */
  selectedItems?: { code: string; value: string }[]
}

/** JSON-shaped values the tutorial layer accepts: slugs, booleans, numbers. */
export type HostValue =
  | string
  | number
  | boolean
  | null
  | HostValue[]
  | { [key: string]: HostValue }

export type HostRecord = Record<string, HostValue>

/** One semantic action the emulator reports and can replay. */
export interface HostActionSpec {
  label: string
  description?: string
  /**
   * Anchor template with `{arg}` placeholders filled from the action's
   * payload — `host.mois.tree.{node}`. Omitted for actions without a
   * single control to ring (opening a record from a grid row).
   */
  anchor?: string
  /**
   * The snapshot path the action changes and which payload key holds the new
   * value, so the studio can propose an outcome check ("host.node equals
   * dynamic") and know when that outcome is already true.
   */
  outcome?: { path: string; arg: string }
}

/** A starting point: which module and screen the shell opens on. */
export interface HostFixtureSpec {
  id: string
  label: string
  description?: string
  /** The `host.*` snapshot the shell reports before any action. */
  initialState: HostRecord
}

export interface HostEmulatorManifest {
  contractVersion: 1
  id: string
  label: string
  description: string
  fixtures: HostFixtureSpec[]
  defaultFixture: string
  /** Snapshot paths checks may grade, shown as hints in the studio. */
  snapshotPaths: string[]
  actions: Record<string, HostActionSpec>
  /** Every anchor the shell can stamp, as `{slug}` templates. */
  anchors: string[]
  /**
   * The size the target system's own window is painted at. A PowerBuilder
   * window does not reflow, so a stage opens the desktop full screen and sets
   * the window to this rather than stretching it to the browser.
   */
  windowSize?: { width: number; height: number }
}

/** Imperative surface the host drives for autoplay and resume. */
export interface HostShellApi {
  /** Perform a manifest action as the learner would; resolves with its result, if any. */
  perform(actionId: string, args?: HostRecord): Promise<HostValue | undefined>
  getState(): HostRecord
}

export interface HostEncounterForm {
  presetKey?: string
  type: string
  name: string
  version: string
}

export interface HostEncounterFormSlot {
  initialData?: Record<string, unknown>;
  onFormDataChange?: (data: Record<string, unknown>) => void;
  presetKey: string
  encounterId: string
  formId: string
  onClose: () => void
}

export interface HostShellProps {
  loadEncounterForms?: () => Promise<HostEncounterForm[]>
  encounterFormSlot?: (slot: HostEncounterFormSlot) => ReactNode
  /**
   * Open the frame at the size MOIS paints this window, centred on the
   * desktop, instead of maximised. The desktop still fills the host's box.
   */
  windowSize?: { width: number; height: number }
  /** Fixture id from the manifest; unknown ids fall back to the default. */
  fixture?: string
  /**
   * The charts this frame can open. A host that has its own patients (the
   * Webforms preview roster) passes them here; omitted, the emulator uses the
   * training roster it ships with.
   */
  patients?: HostPatient[]
  /** The open chart, by chart number. Pass with `onChartChange` to control it. */
  chart?: string
  /** The learner opened another chart — from the lookup, Next/Previous, or by typing one. */
  onChartChange?: (chart: string) => void
  /** A semantic action the learner performed, or the shell replayed. Payloads carry slugs only. */
  onAction?: (actionId: string, payload?: HostRecord, result?: HostValue) => void
  /** The shell's structural state whenever it changes; the host merges it as `host.*`. */
  onStateChange?: (state: HostRecord) => void
  onReady?: (api: HostShellApi) => void
  /** Rendered inside the Dynamic Forms window in place of the sample grid. */
  formSlot?: ReactNode
  className?: string
}
