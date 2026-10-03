import type { MoisChartExport, MoisChartGroup, MoisRecord } from './types'
export const date = (v?: string) => v?.split(' ')[0]?.replace(/\//g, '.') ?? ''

/** An encounter's Times stamp (`arrived` / `inroom` / `seen` / `discharge`)
    as its two boxes show it: dtm_<stem> as `yyyy.mm.dd`, num_<stem>_hr /
    num_<stem>_min as `hh : mm` — the header's own Date / time pair
    ("2026.08.10 | 14 : 00", encounter-detail-header.png). The Data
    Dictionary workbook's Matrix rows 393–400 map each box. A stamp the export
    does not carry is blank. */
export function encounterStamp(record: MoisRecord | undefined, stem: string): { date: string; time: string } {
  const hr = record?.[`num_${stem}_hr`]
  const mn = record?.[`num_${stem}_min`]
  return {
    date: date(record?.[`dtm_${stem}`]),
    time: hr ? `${hr.padStart(2, '0')} : ${(mn || '0').padStart(2, '0')}` : '',
  }
}
export function linkedGoals(data: MoisChartExport | null, group: string, record?: MoisRecord) {
  const id = record?.[`id_${group}`]
  if (!data || !id) return []
  return data.goal_link.filter(link => link.str_object === `tdt_${group}` && link.id_object === id).flatMap(link => {
    const goal = data.goal.find(r => r.id_goal === link.id_goal)
    return goal ? [{ group: 'GOALS', start: date(goal.dtm_start), end: date(goal.dtm_end), desc: goal.str_goal ?? '', phase: goal.str_phase ?? '', s: goal.str_sensitive ?? '', by: link.stp_user_create ?? '', when: date(link.stp_date_create) }] : []
  })
}
export function goalTargets(data: MoisChartExport | null, goal?: MoisRecord, actions = false) {
  if (!data || !goal?.id_goal) return []
  const groups: MoisChartGroup[] = actions ? ['action'] : ['health_issue', 'risk', 'need']
  return data.goal_link.filter(link => link.id_goal === goal.id_goal).flatMap(link => {
    const group = groups.find(g => link.str_object === `tdt_${g}`)
    const target = group && data[group].find(r => r[`id_${group}`] === link.id_object)
    return target && group ? [{ group: group.replace(/_/g, ' ').toUpperCase(), start: date(target.dtm_start), end: date(target.dtm_end), desc: target.str_problem_name ?? target.str_description ?? target.str_action ?? '', by: link.stp_user_create ?? '', when: date(link.stp_date_create) }] : []
  })
}
export function serviceEpisodes(data: MoisChartExport | null) {
  return (data?.chart_service ?? []).map(r => ({ episode: r.str_service_code_term ?? '', mrp: r.str_service_mrp ?? '', start: date(r.dtm_start), stop: date(r.dtm_end) }))
}
