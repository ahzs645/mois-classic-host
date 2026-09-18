import type { ReactNode } from 'react'

/* ============================================================================
   host/types — the contract between this emulator and a host page.

   Webforms declares the canonical version of these types in
   lib/host-emulators/contract.ts; this file restates what the shell needs so
   the package compiles on its own. TypeScript's structural typing checks the
   two against each other where Webforms registers the emulator.
   ========================================================================= */

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
}

/** Imperative surface the host drives for autoplay and resume. */
export interface HostShellApi {
  /** Perform a manifest action as the learner would; resolves with its result, if any. */
  perform(actionId: string, args?: HostRecord): Promise<HostValue | undefined>
  getState(): HostRecord
}

export interface HostShellProps {
  /** Fixture id from the manifest; unknown ids fall back to the default. */
  fixture?: string
  /** A semantic action the learner performed, or the shell replayed. Payloads carry slugs only. */
  onAction?: (actionId: string, payload?: HostRecord, result?: HostValue) => void
  /** The shell's structural state whenever it changes; the host merges it as `host.*`. */
  onStateChange?: (state: HostRecord) => void
  onReady?: (api: HostShellApi) => void
  /** Rendered inside the Dynamic Forms window in place of the sample grid. */
  formSlot?: ReactNode
  className?: string
}
