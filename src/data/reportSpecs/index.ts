import { pbSlug } from '../../pb/instrumentation'
import type { ReportSpec } from './types'
import { specs as accountsGeneral } from './accountsGeneral'
import { specs as accountsMsp } from './accountsMsp'
import { specs as accountsPrivateInv } from './accountsPrivateInv'
import { specs as accountsPrivateTrans } from './accountsPrivateTrans'
import { specs as billsByDiagnosis } from './billsByDiagnosis'
import { specs as billsFeeCode } from './billsFeeCode'
import { specs as clinicalAudits } from './clinicalAudits'
import { specs as clinicalMain } from './clinicalMain'
import { specs as clinicalProObs } from './clinicalProObs'
import { specs as dynamicForms } from './dynamicForms'
import { specs as practiceManagement } from './practiceManagement'
import { specs as practiceAccess } from './practiceAccess'
import { specs as securityAudit } from './securityAudit'

/* ============================================================================
   Every report spec, one file per Reports article (see ./types.ts).
   ========================================================================= */

export const REPORT_SPECS: ReportSpec[] = [
  ...accountsGeneral, ...accountsMsp, ...accountsPrivateInv, ...accountsPrivateTrans,
  ...billsByDiagnosis, ...billsFeeCode, ...clinicalAudits, ...clinicalMain, ...clinicalProObs,
  ...dynamicForms, ...practiceManagement, ...practiceAccess, ...securityAudit,
]

const key = (folder: string, name: string) => `${pbSlug(folder)}/${pbSlug(name)}`
const byRow = new Map(REPORT_SPECS.map((s) => [key(s.folder, s.name), s]))

/** the spec a catalogue row runs, if one is written */
export const reportSpecFor = (folder: string, name: string): ReportSpec | undefined => byRow.get(key(folder, name))

/** the window a spec opens */
export const reportSpecWindow = (s: ReportSpec): string => s.window ?? `report-params-${s.id}`

export type { ReportSpec } from './types'
