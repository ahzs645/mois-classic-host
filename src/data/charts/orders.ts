/* ============================================================================
   What an order record keeps behind its Report tab's boxes.

   The Report tab prints an order's names — Attending, Ordered By and
   Responsible Org. are tdt_order.str_attending / str_order_by /
   str_responsible_org (MATRIX-R1060 / R1061 / R1062), Order Assigned to is
   str_assignedto (R1105), Copies To str_copy_to (R1064) — and screens/
   OrderView.tsx binds those. The record also keeps:

   - the coded identity behind Order Assigned to (str_assignedto_id /
     _id_system / _source: a MOIS.USER id);
   - id_attending / id_order_by / id_responsible_org, named here through the
     export's provider directory (charts/providers.ts). They are not what the
     boxes show: chart 87288 carries id_attending 500052 (LONG TERM CARE
     WAITLIST) and id_responsible_org 500116 (CALL CENTRE AGENTS) on all 28
     orders while str_attending / str_responsible_org name a different
     provider on nearly every one, so painting the id's name into a box
     would contradict what MOIS prints there;
   - str_responsible_org_id, the code behind the Responsible Org. name;
   - str_print_allergy / _family_hx / _health_issue / _med_lt, the chart
     sections a printed requisition carries ('Y' on all 28) — no capture shows
     a control for them;
   - str_author_id / _system / _source and str_recipient_source, the CDX
     identities of the order's author and recipient.

   None of these has a captured control, so they ride on the order's detail
   (`OrderDetail.record`) and are drawn nowhere.
   ========================================================================= */
import type { OrderRecordModel } from '../mois'
import { providerLabel } from './providers'
import type { MoisChartExport, MoisRecord } from './types'

const yes = (v?: string) => v === 'Y'

export function orderRecordModel(r: MoisRecord, data?: MoisChartExport | null): OrderRecordModel {
  return {
    assignedTo: {
      name: r.str_assignedto ?? '',
      id: r.str_assignedto_id ?? '',
      system: r.str_assignedto_id_system ?? '',
      source: r.str_assignedto_source ?? '',
    },
    attendingId: providerLabel(data, r.id_attending),
    orderById: providerLabel(data, r.id_order_by),
    responsibleOrgId: providerLabel(data, r.id_responsible_org),
    responsibleOrgCode: r.str_responsible_org_id && r.str_responsible_org_id !== '-1' ? r.str_responsible_org_id : '',
    prints: {
      allergy: yes(r.str_print_allergy),
      familyHx: yes(r.str_print_family_hx),
      healthIssue: yes(r.str_print_health_issue),
      longTermMeds: yes(r.str_print_med_lt),
    },
    author: { id: r.str_author_id ?? '', system: r.str_author_id_system ?? '', source: r.str_author_source ?? '' },
    recipientSource: r.str_recipient_source ?? '',
  }
}

/** Finished's time box: dtm_finish_time as HH:MM (303526 "Finished: … with
    the date and time of its completion") */
export const finishTime = (r?: MoisRecord) => (r?.dtm_finish_time ?? '').slice(0, 5)
