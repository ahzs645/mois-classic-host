/* ============================================================================
   The small value coercions every screen needs, React-free.

   The chart export and the session records are loose `Record<string,
   unknown>` rows, and a window's `args` arrive untyped, so the screens kept
   re-declaring the same one-liners. One copy each here.
   ========================================================================= */

/** any value as display text: null / undefined → '' */
export const S = (v: unknown): string => (v == null ? '' : String(v))

/** a window argument that should be a string ('' otherwise) */
export const argStr = (v: unknown): string => (typeof v === 'string' ? v : '')

/** a window argument that should be a boolean (false otherwise) */
export const argBool = (v: unknown): boolean => v === true

/** a boolean as MOIS stores it: 'Y' / 'N' */
export const yn = (v: boolean | null | undefined): 'Y' | 'N' => (v ? 'Y' : 'N')

/** a label as the slug anchors and payloads use: lower case, `&` → `and`,
    runs of anything else → `-` (`Reports & Letters` → `reports-and-letters`).
    The same rule as pb/instrumentation's pbSlug, without its React. */
export const slug = (label: string): string => label
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

/** 'Y' (any case) → true; 'N', '' and anything else → false */
export const isY = (v: unknown): boolean => typeof v === 'string' && v.trim().toUpperCase() === 'Y'
