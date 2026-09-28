/* ============================================================================
   MSP location codes — the list both default-billing-location routes drop
   and the claim window's Location (3295094 "Default Billing Location").

   PROVENANCE: 3295094 `4eb31491` (the day book's MSP Loc., v02.30.11) and
   `707d1e64` (Provider ▸ Billing ▸ MSP Location): the same sixteen rows,
   Code | Description, in this order and with these captions.

   Its own module so data/clinicManagement.ts (the Provider window) and
   data/billingStore.ts (Billing) can share it without importing each other.
   ========================================================================= */
export const MSP_LOCATION_ROWS: { code: string; desc: string }[] = [
  { code: 'A', desc: "Practitioner's Office in Community" },
  { code: 'B', desc: 'Community Health Centre' },
  { code: 'C', desc: 'Residential Care/Assisted Living Residence' },
  { code: 'D', desc: 'Diagnostic Facility' },
  { code: 'E', desc: 'Hospital - Emergency Room Unscheduled' },
  { code: 'G', desc: 'Hospital - Day Care (surgery)' },
  { code: 'I', desc: 'Hospital - Inpatient' },
  { code: 'J', desc: 'First Nations Primary Health Care Clinic' },
  { code: 'K', desc: 'Hybrid Primary Care Practice (part-time longitudinal practice)' },
  { code: 'L', desc: 'Longitudinal Primary Care Practice (e.g. GP family practice)' },
  { code: 'M', desc: 'Mental Health Centre' },
  { code: 'N', desc: 'Health Care Practitioner Office (non-physician)' },
  { code: 'P', desc: 'Hospital - Outpatient' },
  { code: 'Q', desc: 'Specialist Physician Office' },
  { code: 'R', desc: "Patient's Private Home Service" },
  { code: 'T', desc: "Practitioner's Office in Public Admin Facility" },
]
