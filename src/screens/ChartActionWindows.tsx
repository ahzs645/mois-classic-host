import { useEffect } from 'react'
import { usePatient } from '../data/patient-context'
import { registerAreaWindow, type AreaWindowProps } from './areaWindowRegistry'

/* ============================================================================
   Action ▸ Create Task (Ctrl+K) and Action ▸ Create Message (Ctrl+M) from
   the Patient Chart.

   They open the Workspace's own Create New Task / Create New Message windows
   (screens/CreateTaskDialog.tsx, CreateMessageDialog.tsx), with the open
   chart already filled in — 303596 `1ef0075c…` and 303597 `2d2878a0…` show
   the footer's Chart and patient set when the window is raised from a chart.
   A menu cannot see the open chart, so these two ids hand over: they read
   the patient here and replace themselves with the real window.
   ========================================================================= */
function handOver(target: 'create-task' | 'create-message') {
  return function ChartRaised({ open }: AreaWindowProps) {
    const p = usePatient()
    useEffect(() => {
      open(target, { chart: p.chart, patient: `${p.last}, ${p.first}`.toUpperCase() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return null
  }
}

registerAreaWindow('chart-create-task', handOver('create-task'))
registerAreaWindow('chart-create-message', handOver('create-message'))
