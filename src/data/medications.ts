/* ============================================================================
   The lists behind the medication windows (Rx - Prescription, Long Term
   Medication and the windows they raise).

   None of these lists is in a chart export — the drug catalogue, the dose
   code sets and a user's favourites belong to the site, not to the patient —
   so they are transcribed from the manual's captures of the same windows and
   carry that provenance per list. The rows the patient's own chart supplies
   (the prescriptions themselves) still come from the export.
   ========================================================================= */

/** One row of the Advanced Lookup Service's Medications / Drug List. */
export type DrugRow = {
  /** `*` marks a formulary / low-cost-alternative drug (art. 303132) */
  f: string
  generic: string
  brand: string
  atc: string
  atcName: string
  cost: string
  lca: string
  cdic: string
  manufacturer: string
}

/* The catalogue, cut down to what a lesson can search: the four drugs chart
   87288 is prescribed (so a search for any of them lands on its own code) and
   the CITALOPRAM run the manual's own capture shows (303229 `f23fd642…png`,
   including its `*` formulary rows and its Cost column). Codes are the
   captures' and the export's own. */
export const drugList: DrugRow[] = [
  { f: '', generic: 'AMOXICILLIN (AMOXICILLIN TRIHYDRATE) 250MG CAPSULE', brand: 'AMOXICILLIN', atc: 'J01CA04', atcName: 'AMOXICILLIN', cost: '-', lca: '-', cdic: '02434709', manufacturer: 'SANIS HEALTH INC' },
  { f: '*', generic: 'AMOXICILLIN (AMOXICILLIN TRIHYDRATE) 500MG CAPSULE', brand: 'APO-AMOXI', atc: 'J01CA04', atcName: 'AMOXICILLIN', cost: '0.18', lca: '-', cdic: '00628123', manufacturer: 'APOTEX INC' },
  { f: '', generic: 'CITALOPRAM (CITALOPRAM HYDROBROMIDE) 10 MG', brand: 'CITALOPRAM', atc: 'N06AB04', atcName: 'CITALOPRAM', cost: '-', lca: '-', cdic: '02301822', manufacturer: 'MELIAPHARM INC.' },
  { f: '', generic: 'CITALOPRAM (CITALOPRAM HYDROBROMIDE) 10MG TABLET', brand: 'AVA-CITALOPRAM', atc: 'N06AB04', atcName: 'CITALOPRAM', cost: '-', lca: '-', cdic: '02409003', manufacturer: 'AVANSTRA INC' },
  { f: '', generic: 'CITALOPRAM (CITALOPRAM HYDROBROMIDE) 10MG TABLET', brand: 'MINT-CITALOPRAM', atc: 'N06AB04', atcName: 'CITALOPRAM', cost: '0.27', lca: '-', cdic: '02430118', manufacturer: 'MINT PHARMACEUTICALS INC' },
  { f: '*', generic: 'CITALOPRAM (CITALOPRAM HYDROBROMIDE) 20 MG TABLET', brand: 'NG CITALOPRAM', atc: 'N06AB04', atcName: 'CITALOPRAM', cost: '0.72', lca: '-', cdic: '02325047', manufacturer: 'NORA PHARMA INC' },
  { f: '*', generic: 'CITALOPRAM (CITALOPRAM HYDROBROMIDE) 20 MG TABLET', brand: 'RAN-CITALOPRAM', atc: 'N06AB04', atcName: 'CITALOPRAM', cost: '0.94', lca: '-', cdic: '02285622', manufacturer: 'RANBAXY PHARMACEUTICALS CANADA INC.' },
  { f: '', generic: 'CITALOPRAM (CITALOPRAM HYDROBROMIDE) 20MG TABLET', brand: 'APO-CITALOPRAM', atc: 'N06AB04', atcName: 'CITALOPRAM', cost: '0.50', lca: '-', cdic: '02246057', manufacturer: 'APOTEX INC' },
  { f: '', generic: 'IPRATROPIUM BROMIDE 20 mcg [Inhalation Metered-Dose Aerosol]', brand: 'ATROVENT HFA', atc: 'R03BB01', atcName: 'IPRATROPIUM BROMIDE', cost: '-', lca: '-', cdic: '02247686', manufacturer: 'BOEHRINGER INGELHEIM (CANADA) LTD' },
  { f: '', generic: 'MORPHINE HYDROCHLORIDE 1MG SYRUP', brand: 'DOLORAL 1', atc: 'N02AA01', atcName: 'MORPHINE', cost: '-', lca: '-', cdic: '00614491', manufacturer: 'ATLANTIC PHARMACEUTICAL SERVICES INC' },
  { f: '', generic: 'ROSUVASTATIN (ROSUVASTATIN CALCIUM) 10MG TABLET', brand: 'CRESTOR', atc: 'C10AA07', atcName: 'ROSUVASTATIN', cost: '-', lca: '-', cdic: '02247162', manufacturer: 'ASTRAZENECA CANADA INC' },
  { f: '*', generic: 'ROSUVASTATIN (ROSUVASTATIN CALCIUM) 10MG TABLET', brand: 'APO-ROSUVASTATIN', atc: 'C10AA07', atcName: 'ROSUVASTATIN', cost: '0.21', lca: '-', cdic: '02337983', manufacturer: 'APOTEX INC' },
  { f: '', generic: 'VENLAFAXINE (VENLAFAXINE HYDROCHLORIDE) 75MG CAPSULE', brand: 'EFFEXOR XR', atc: 'N06AX16', atcName: 'VENLAFAXINE', cost: '-', lca: '-', cdic: '02237280', manufacturer: 'BGP PHARMA ULC' },
]

/* The Medication Dose Wizard's three drop-downs and the Dispense units.
   "Standard code sets that are editable from the Administration module"
   (303236); the values are the ones its captures show (`4a1aafbc`,
   `c351f94c`, `9eb0e82e`) and the export's own `drug_dose` rows. */
export const doseUnits = ['TAB', 'CAP', 'ML', 'DOSE', 'PUFF', 'Tablet', 'SOLUTION']
export const doseRoutes = ['ORAL', 'SUBLINGUAL', 'INHALATION', 'TOPICAL', 'INTRAMUSCULAR', 'SUBCUTANEOUS']
export const doseFrequencies = ['DAILY', 'BID', 'TID', 'QID', 'AM', 'PM', 'HS', 'Q HS', 'PRN']
export const dispenseUnits = ['DAY', 'WEEK', 'MONTH', 'CAPSULES', 'TABLETS', 'DOSE']

/** A row of the Favourite Medication List. */
export type FavouriteRow = {
  type: 'USER' | 'CLINIC'
  identifier: string
  med: string
  dose: string
  amount: string
  cdic: string
  generic: string
}

/* The user's favourites as the Favourite Medication List shows them (303235
   `fb8dab6b…png`: Type / Identifier / Medication Name / Dose / Freq /
   Amount), and the clinic list the Source drop-down switches to. */
export const favouriteSeed: FavouriteRow[] = [
  { type: 'USER', identifier: 'ERYTHROMYCIN 500 MG TABLET', med: 'ERYTHROMYCIN 500MG TABLET', dose: '1 bid', amount: '3/12', cdic: '00893862', generic: 'ERYTHROMYCIN 500MG TABLET' },
  { type: 'USER', identifier: 'TYLENOL WITH CODEINE NO. 3', med: 'TYLENOL WITH CODEINE NO. 3 - TAB', dose: 'MULTI-STEP DOSE', amount: 'SEE DETAIL', cdic: '02163926', generic: 'ACETAMINOPHEN 300MG CODEINE PHOSPHATE 30MG CAFFEINE 15MG TABLET' },
  { type: 'USER', identifier: 'VITAMIN C 100MG', med: 'VITAMIN C 100MG', dose: 'as needed', amount: '', cdic: '', generic: 'VITAMIN C 100MG' },
  { type: 'USER', identifier: 'WARFARIN SODIUM 10 MG TABLET', med: 'WARFARIN SODIUM 10MG TABLET', dose: '2 bid', amount: '3/12', cdic: '02344114', generic: 'WARFARIN SODIUM 10MG TABLET' },
  { type: 'CLINIC', identifier: 'T3', med: 'TYLENOL WITH CODEINE NO. 3 - TAB', dose: '1 TAB ORAL BID', amount: '30 DAY', cdic: '02163926', generic: 'ACETAMINOPHEN 300MG CODEINE PHOSPHATE 30MG CAFFEINE 15MG TABLET' },
  { type: 'CLINIC', identifier: 'ALESSE', med: 'ALESSE 28', dose: '1 TAB ORAL AM', amount: '30 DAY', cdic: '02236975', generic: 'LEVONORGESTREL 100uG ETHINYL ESTRADIOL 20uG TABLET' },
]

/** The Source drop-down under the favourites list. */
export const favouriteSources = ['ALL', 'My Favourites', 'Clinic Favourites']
