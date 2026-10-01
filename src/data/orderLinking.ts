/* ============================================================================
   Order Linking Service — the data the dialog's captures print.

   PROVENANCE: 2026-09-29 TRAINING capture c04 (the dialog on chart 3924,
   raised by a Measurements record's `Link to Order`) and c05 (the same
   window with the first row's Status drop-down dropped). React-free.
   ========================================================================= */
import type { OrderLinkRow } from './chartUtilities'

/** The Status cell's drop-down, Status and Description, in the order c05
    drops them. Sixteen rows; the list shows them all at once.

    `ASSESSMENT COMPLETE` is clipped by its column in c05 ("ASSESSMENT
    COMPLET…"); the last letter is INFERRED from its description. */
export const ORDER_LINK_STATUSES: { status: string; description: string }[] = [
  { status: 'IN PROCESS', description: 'In process, unspecified' },
  { status: 'WAITLISTED', description: 'Waitlisted' },
  { status: 'SCHEDULED', description: 'In process, scheduled' },
  { status: 'ASSESSMENT COMPLETE', description: 'Assessment completed' },
  { status: 'COMPLETED', description: 'Order is completed' },
  { status: 'SERVICES IN PLACE', description: 'Services are in place per Service Request' },
  { status: 'REFER OUT', description: 'Refer order to another service' },
  { status: 'CANCELLED', description: 'Order was cancelled' },
  { status: 'DECLINE SERVICES', description: 'Client declines services' },
  { status: 'ON HOLD', description: 'Order is on hold' },
  { status: 'CONTACT ATTEMPTED', description: 'Contact attempted' },
  { status: 'DISCONTINUED', description: 'Order was discontinued' },
  { status: 'RESULTS AVAILABLE', description: 'Some, but not all, results available' },
  { status: 'ERROR', description: 'Error, order not found' },
  { status: 'REPLACED', description: 'Order has been replaced' },
  { status: 'MRC ASSIGNED', description: 'MRC Assigned' },
]

/** The chart identity strip as c04 prints it. The roster record for 3924
    has no middle name and no BC Health No. (patients.ts takes those from the
    newer Patient Summary capture), so this window's own reading is kept here
    rather than derived. */
export const ORDER_LINK_IDENTITY: Record<string, { patient: string; bchn: string }> = {
  '3924': { patient: 'PATCH J. AADAMS', bchn: '*WFvx0zyo' },
}

/** The chart's outstanding orders, newest first, verbatim from c04. The grid
    cuts the three long descriptions to "NH STANDARD OUTPATIENT LABORATORY
    REQUISI…"; their full text is INFERRED from the other lab requisitions'
    wording, and the grid's own ellipsis cuts them the same way. */
const NH_LAB = 'NH STANDARD OUTPATIENT LABORATORY REQUISITION'
const PLMS_LAB = 'PLMS STANDARD OUTPATIENT LAB REQUISITION'
const order = (date: string, orderBy: string, description: string): OrderLinkRow => ({
  date, orderBy, referral: '', description, detail: '', status: 'IN PROCESS', priority: 'ROUTINE', links: '-',
})

export const ORDER_LINK_ORDERS: Record<string, OrderLinkRow[]> = {
  '3924': [
    order('2026.04.27', 'AMIN, MONA', PLMS_LAB),
    order('2026.04.27', 'AMIN, MONA', PLMS_LAB),
    order('2026.03.03', 'PCIPT 1 NURSE 6 PRG', 'BCCDC PARASITOLOGY REQUISITION (09/2019)'),
    order('2026.02.25', 'UPCC 1 NURSE 4 PRG', NH_LAB),
    order('2025.10.21', 'TEST, TEST TEST', PLMS_LAB),
    order('2025.09.10', 'TEST, TEST TEST', NH_LAB),
    order('2025.09.09', 'TEST, TEST TEST', NH_LAB),
  ],
}
