/* ============================================================================
   Order vocabularies — the Order Type and Order Status code tables.

   One definition each, read by the chart's Order window (screens/OrderView)
   and by the Quick Entry Order template editor (screens/QuickEntryEditors,
   through data/quickEntryTemplates' `QE_ORDER_TYPES`), so a template's type
   is always one the Order window can show. React-free.
   ========================================================================= */

/** Order Type DDDW, type and description — 303588 `48e7423c…` (Order ▸ New
    Record). The Quick Entry Order template editor (art. 3071982) drops the
    same list; its old copy read IMAGE "Medical Imaging Request", which no
    capture shows — the 303588 capture prints "Medical Imaging Requisition". */
export const ORDER_TYPES: { type: string; description: string }[] = [
  { type: 'CONSULTATION', description: 'Medical Consultation Request' },
  { type: 'IMAGE', description: 'Medical Imaging Requisition' },
  { type: 'INTERVENTION', description: 'Medical Intervention Request' },
  { type: 'LAB', description: 'Medical Laboratory Requisition' },
  { type: 'PROCEDURE', description: 'Medical Procedure Request' },
  { type: 'MISC', description: 'Miscellaneous' },
]

/** Order Management's Status DDDW, Status and Description — 2961349
    `2d067ff2…`. The Order window's ST column carries the HL7 order-status
    code behind each.

    data/basket.ts `ORDER_STATUSES` (the Basket's Status drop-down, 1802763
    `6a620b43…`) shows these six in the same order and wording, then ON HOLD,
    DISCONTINUED and REPLACED; the two are kept apart because each is what
    its own capture shows. */
export const ORDER_STATUS_ROWS: { code: string; status: string; description: string }[] = [
  { code: 'IP', status: 'IN PROCESS', description: 'In process, unspecified' },
  { code: 'SC', status: 'SCHEDULED', description: 'In process, scheduled' },
  { code: 'A', status: 'RESULTS AVAILABLE', description: 'Some, but not all, results available' },
  { code: 'CA', status: 'CANCELLED', description: 'Order was cancelled' },
  { code: 'CM', status: 'COMPLETED', description: 'Order is completed' },
  { code: 'ER', status: 'ERROR', description: 'Error, order not found' },
]

/** the status word for an ST code; an unknown code shows as itself */
export const orderStatusWord = (code?: string): string =>
  ORDER_STATUS_ROWS.find((s) => s.code === code)?.status ?? code ?? ''
