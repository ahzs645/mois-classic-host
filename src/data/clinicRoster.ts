/* ============================================================================
   The clinic's provider roster — the doctors the training clinic bills under,
   with the numbers every billing, report and provider window prints for them.

   These people and their numbers are invented (no capture shows this clinic's
   roster), so the only rule is that every window agrees. Where the old copies
   disagreed, the Provider List (Administration ▸ Clinic Management,
   data/clinicManagement.ts PROVIDER_LIST — the one screen that is a roster)
   won:
     BEARDWOOD, WALTER  40881 / 40881   was 12345 / 00001 in data/claims.ts and
                                        the Primary Provider List, J40881 on
                                        the user's Memberships tab
     SHEWCHUK, LEAH     33120 / 33120   was 22781 / 00001 in the same places
   HOWSER, FAIRCHILD and DUCHARME are not on the Provider List; their
   practitioner numbers are the ones data/claims.ts, the Primary Provider List
   and data/billingPrograms.ts already agreed on (DUCHARME's only from
   billingPrograms), and their payee is 54321, the clinic payee
   data/billingStore.ts `payeeOf` already gives them (the Provider List's own
   group payee, on HALLIWELL, ALYSSA).

   Order: the billing order (data/claims.ts DOCTORS — the Unsent MSP window's
   default doctor is the first, and the claim wizards deal patients to the
   doctors in turn). Report drop-downs list the names alphabetically
   (`CLINIC_PROVIDER_NAMES_AZ`). React-free.
   ========================================================================= */

export type RosterProvider = {
  /** SURNAME, GIVEN as every list prints it */
  name: string
  /** MSP practitioner number (Pract. No) */
  pract: string
  /** MSP payee number (Payee No.) */
  payee: string
  /** Practitioner Type, as the Provider List prints it */
  type: 'MD' | 'NP'
}

export const CLINIC_ROSTER: RosterProvider[] = [
  { name: 'BEARDWOOD, WALTER', pract: '40881', payee: '40881', type: 'MD' },
  { name: 'SHEWCHUK, LEAH', pract: '33120', payee: '33120', type: 'MD' },
  { name: 'HOWSER, DOOGIE', pract: '30117', payee: '54321', type: 'MD' },
  { name: 'FAIRCHILD, NESRIN L', pract: '41903', payee: '54321', type: 'NP' },
  { name: 'DUCHARME, AMARILYS', pract: '30442', payee: '54321', type: 'MD' },
]

/** the roster's names in billing order */
export const CLINIC_PROVIDER_NAMES = CLINIC_ROSTER.map((p) => p.name)
/** the roster's names A–Z, as the report drop-downs list them */
export const CLINIC_PROVIDER_NAMES_AZ = [...CLINIC_PROVIDER_NAMES].sort()

/** the roster entry for a name; undefined for anyone else */
export const rosterProvider = (name: string): RosterProvider | undefined =>
  CLINIC_ROSTER.find((p) => p.name === name)

/** a roster provider's full name by surname (`BEARDWOOD` → `BEARDWOOD,
    WALTER`), for specs that keep short handles on the names */
export function rosterName(surname: string): string {
  const hit = CLINIC_ROSTER.find((p) => p.name.startsWith(`${surname.toUpperCase()},`))
  if (!hit) throw new Error(`clinicRoster: no provider ${surname}`)
  return hit.name
}
