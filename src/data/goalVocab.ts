/* ============================================================================
   Goal vocabularies — the lists a goal's fields drop, read by the Goals
   folder (screens/GoalsView, screens/GoalWindows: New Goal and Quantitative
   Settings), the chart's Quick Entry - Chart Goal window and the Quick Entry
   Template - Goal editor (screens/QuickEntryWindows, QuickEntryEditors).
   Each list is bare; a window that offers a blank puts it first. React-free.

   None of these drop-downs is opened in a capture; the sources are the
   chart export (data/charts), art. 303498 (Goals) and art. 3071982 (Quick
   Entry Templates).
   ========================================================================= */
import { MEASURE_CONCEPTS } from './carePlanVocab'

/** Phase. The chart export writes INITIATION and TERMINATION (chart 87288);
    art. 303498 says "initiation, completion, etc."; IN PROGRESS and
    MAINTENANCE are INFERRED. The Quick Entry - Chart Goal window used to
    carry its own INITIATION / MOTIVATION / MAINTENANCE / TERMINATION, with
    no source — it reads this list now. */
export const GOAL_PHASES = ['INITIATION', 'IN PROGRESS', 'MAINTENANCE', 'COMPLETION', 'TERMINATION']

/** Quantitative Settings' Subject on a chart goal — the article's "Category
    … allows MOIS to use the proper coding list"; the export's quantitative
    goal is a MEASURE. INFERRED beyond that. */
export const GOAL_SUBJECTS = ['MEASURE', 'MAR', 'CONSULT', 'IMAGE', 'PROCEDURE', 'INTERVENTION']

/** The Quick Entry Template - Goal editor's Subject — art. 3071982 ("Quick
    Entry Template - Goal", `70b9b8b9c10b…`). Kept apart from GOAL_SUBJECTS:
    the article's list has no MAR, and nothing shows the folder's list
    without it. */
export const QE_GOAL_SUBJECTS = ['CONSULT', 'IMAGE', 'INTERVENTION', 'MEASURE', 'PROCEDURE']

/** Target Value's operator — art. 303498 "less than, greater than, etc.";
    `<` is captured on a template (`8b8958b7ddc6…`), the rest INFERRED.
    BETWEEN opens a second value box (data/goalRecords' target2). */
export const GOAL_OPERATORS = ['=', '<', '<=', '>', '>=', 'BETWEEN']

/** The operators a single Target Value box can hold — a Quick Entry goal
    template stores one target, so it offers no BETWEEN. */
export const GOAL_SINGLE_OPERATORS = GOAL_OPERATORS.filter((o) => o !== 'BETWEEN')

/** Require Every / Perform Every units — art. 3071982 "a recurrent time
    period (e.g. days, hours, weeks, months, years)"; art. 303498's "(day,
    week, etc.)" names no full list. */
export const GOAL_UNITS = ['HOURS', 'DAYS', 'WEEKS', 'MONTHS', 'YEARS']

/** the concept list per Subject, alphabetical as the Concept drop-down lists
    them. MEASURE is data/carePlanVocab's; the rest INFERRED. */
export const GOAL_CONCEPTS: Record<string, string[]> = {
  MEASURE: [...MEASURE_CONCEPTS].sort(),
  MAR: ['INFLUENZA VACCINE', 'PNEUMOCOCCAL VACCINE'],
  CONSULT: ['DIABETES EDUCATION ASSESSMENT', 'OPHTHALMOLOGY ASSESSMENT'],
  IMAGE: ['MAMMOGRAM', 'CHEST X-RAY'],
  PROCEDURE: ['PAP TEST', 'SPIROMETRY'],
  INTERVENTION: ['SMOKING CESSATION COUNSELLING'],
}

/** codes, for Identified By: Code — INFERRED */
export const GOAL_CODES: Record<string, string[]> = {
  MEASURE: ['951', '1950', '22732', '27540', '43894', 'HBA1C'],
}
