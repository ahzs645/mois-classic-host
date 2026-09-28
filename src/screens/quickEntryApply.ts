import { addReactionRisk } from '../data/allergySession'
import { addPreference } from '../data/carePlanRecords'
import { addGoal } from '../data/goalRecords'
import type { QuickEntryTemplate } from '../data/quickEntryTemplates'

/* ============================================================================
   What Continue on a chart Quick Entry window writes.

   art. 3071982: "The new entry will appear in the Preferences folder / the
   Goal subfolder / the Orders folder / Allergy / Intolerances ▸ Reaction
   Risks of the patient chart it is created in." The window hands the chosen
   template and the chart fields typed above it here, and each group lands
   in the session store its folder lists from:

     Chart Preference  data/carePlanRecords.ts  addPreference
     Goal              data/goalRecords.ts      addGoal
     Reaction Risk     data/allergySession.ts   addReactionRisk
     Order             no store: Orders' unsaved draft is the folder's own
                       state, so OrderView passes `onApply` in the window's
                       args and this is not called.

   A folder that wants to report its own `host.screen.record` after the
   write (Reaction Risks' `own.mark('saved', true)`) also passes `onApply`
   and calls `applyQuickEntry` itself.
   ========================================================================= */

export type QuickEntryApplied = {
  group: 'Chart Preference' | 'Goal' | 'Order' | 'Reaction Risk'
  chart: string
  template: QuickEntryTemplate
  /** the editable chart fields, keyed as QuickEntryWindows' INITIAL names them */
  values: Record<string, string>
}

type Applier = (applied: QuickEntryApplied) => void
const appliers = new Map<QuickEntryApplied['group'], Applier>()

/** a store outside this file registers how a Quick Entry becomes its record */
export function registerQuickEntryApplier(group: QuickEntryApplied['group'], apply: Applier) {
  appliers.set(group, apply)
}

registerQuickEntryApplier('Chart Preference', ({ chart, template, values: v }) => {
  const p = template.preference
  if (!p) return
  addPreference(chart, {
    type: p.type, subject: p.subject, identifiedBy: p.identifiedBy, concept: p.concept,
    subjectDetail: v.subjectDetail ?? '', instruction: v.instruction || p.instruction, instructionDetail: v.instructionDetail ?? '',
    reason: v.reason ?? '', reasonDetail: v.reasonDetail ?? '', start: v.start ?? '', end: v.stopped ?? '',
    sensitive: p.sensitive, showOnDemo: p.showOnDemo, form: v.form ?? '', by: v.by ?? '',
  })
})

registerQuickEntryApplier('Reaction Risk', ({ chart, template, values: v }) => {
  const r = template.reaction
  if (!r) return
  addReactionRisk(chart, {
    reactionType: r.reactionType, agentType: r.agentType, agentCode: r.agent.code, agentTerm: r.agent.term,
    reactions: r.reactions.filter((x) => x.code || x.term), severity: v.severity || r.severity,
    firstOccurrence: v.firstOccurrence || undefined, age: v.age || undefined, stopped: v.stopped || undefined,
    comments: v.comments || undefined,
  })
})

registerQuickEntryApplier('Goal', ({ chart, template, values: v }) => {
  const g = template.goal
  if (!g) return
  addGoal(chart, {
    goal: template.name.toUpperCase(), start: v.start || undefined, end: v.end || undefined, phase: v.phase || undefined,
    quantitative: g.quantitative, subject: g.subject, identifiedBy: g.identifiedBy, concept: g.concept,
    operator: v.operator || g.operator, target: v.target || g.target, every: v.every || g.every,
    units: v.units || g.units, detail: v.detail || undefined, expectedOutcome: v.expectedOutcome || undefined,
  })
})

export function applyQuickEntry(applied: QuickEntryApplied) {
  appliers.get(applied.group)?.(applied)
}
