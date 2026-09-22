import type { MoisChartExport, MoisChartGroup, MoisRecord } from './types'
export const date = (v?: string) => v?.split(' ')[0]?.replace(/\//g, '.') ?? ''
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
