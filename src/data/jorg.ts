/* ============================================================================
   The Jurisdictional Organization Unit chart (JORG) and the service locations a
   Dynamic Form's "..." lookups pick from.

   PROVENANCE: transcribed from the MOIS test environment, 2026-09-28 — Baby
   Birth Event (v2)'s "JORG List" (the Health Authority "...") and "Service
   Location Selection List" (the Responsible Service Delivery Location "...").
   Only the rows on screen were captured: both lists scroll past them, so this
   is the top of each list, not all of it. Names cut off by their column in the
   capture are kept as far as they show.
   ========================================================================= */

export interface JorgUnit {
  healthAuthority: string
  serviceDeliveryArea: string
  branch: string
  serviceDeliveryLocation: string
}

const NH = 'NORTHERN HEALTH'
const unit = (serviceDeliveryArea: string, branch: string, serviceDeliveryLocation: string): JorgUnit =>
  ({ healthAuthority: NH, serviceDeliveryArea, branch, serviceDeliveryLocation })

/** "This is the Jurisdictional Organizational Chart" — in the list's order. */
export const jorgUnits: JorgUnit[] = [
  unit('NORTHEAST', 'DAWSON CREEK', 'DAWSON CREEK'),
  unit('NORTHEAST', 'FORT NELSON', 'FORT NELSON'),
  unit('NORTHEAST', 'FORT NELSON', 'PROPHET RIVER'),
  unit('NORTHEAST', 'FORT ST JOHN', 'FORT ST JOHN'),
  unit('NORTHERN INTERIOR', 'BURNS LAKE', 'BURNS LAKE'),
  unit('NORTHERN INTERIOR', 'BURNS LAKE', 'SOUTH SIDE'),
  unit('NORTHERN INTERIOR', 'FORT ST JAMES', 'FORT ST JAMES'),
  unit('NORTHERN INTERIOR', 'FRASER LAKE', 'FRASER LAKE'),
  unit('NORTHERN INTERIOR', 'MACKENZIE', 'MACKENZIE'),
  unit('NORTHERN INTERIOR', 'MCBRIDE', 'MCBRIDE'),
  unit('NORTHERN INTERIOR', 'PRINCE GEORGE', 'NEEDLE EXCHANGE'),
  unit('NORTHERN INTERIOR', 'PRINCE GEORGE', 'PRINCE GEORGE'),
  unit('NORTHERN INTERIOR', 'QUESNEL', 'QUESNEL'),
  unit('NORTHERN INTERIOR', 'VALEMOUNT', 'VALEMOUNT'),
  unit('NORTHERN INTERIOR', 'VANDERHOOF', 'VANDERHOOF'),
  unit('NORTHWEST', 'ATLIN', 'ATLIN'),
  unit('NORTHWEST', 'HAZELTON', 'HAZELTON'),
  unit('NORTHWEST', 'HOUSTON', 'HOUSTON'),
  unit('NORTHWEST', 'KITIMAT', 'KITIMAT'),
  unit('NORTHWEST', 'MASSET', 'MASSET'),
  unit('NORTHWEST', 'MASSET', 'PORT CLEMENT'),
]

/** A column MOIS prints for a location with no JORG unit; picking it clears the form's JORG fields. */
export const NOT_ASSIGNED = 'NOT ASSIGNED'

export interface ServiceLocation extends JorgUnit {
  name: string
}

const unassigned = (name: string): ServiceLocation => ({
  name, healthAuthority: NOT_ASSIGNED, serviceDeliveryArea: NOT_ASSIGNED, branch: NOT_ASSIGNED, serviceDeliveryLocation: NOT_ASSIGNED,
})

/** The Service Location List, in its order; every captured row is NOT ASSIGNED to a JORG unit. */
export const dformServiceLocations: ServiceLocation[] = [
  'EMERGENCY DEPARTMENT',
  'PRINCE GEORGE HEART FUNCTION CLI',
  'RENAL-CARIBOO MEMORIAL',
  'RENAL-BULKLEY KCC - AC',
  'RENAL-CHETWYND KCC - AC',
  'RENAL-DAWSON CREEK KCC - AC',
  'RENAL-GR BAKER KCC - AC',
  'RENAL-FORT NELSON KCC - AC',
  'RENAL-HARTLEYBAY KCC - AC',
  'RENAL-FORT ST JOHN KCC - AC',
  'RENAL-LAKES DISTRICT KCC - AC',
  'RENAL-NISGA VALLEY KCC - AC',
  'RENAL-MACKENZIE KCC - AC',
  'RENAL-GRANISLE KCC - AC',
  'RENAL-KINCOLITH KCC - AC',
  'RENAL-STIKINE (DEASE) KCC - AC',
  'RENAL-HOUSTON KCC - AC',
  'RENAL-HUDSONS HOPE KCC - AC',
  'FRC FAMILY RESOURCE CENTRE',
  'RENAL-PRINCE RUPERT KCC - AC',
  'RENAL-FRASER LAKE KCC - AC',
  'FT NELSON AUDIOLOGY CLINIC - AC',
  'RENAL-PERITONEAL DIALYSIS CLINIC U',
  'RENAL-VASCULAR ACCESS UHNBC KCC',
  'RENAL-NORTHERN HAIDA GWAII MAS',
].map(unassigned)
