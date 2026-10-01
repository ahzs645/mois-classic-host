/* ============================================================================
   The immunization inventory the MAR's Immunization Inventory Search lists
   (screens/MarImmunizationInventoryWindow.tsx).

   PROVENANCE: 2026-09-29 TRAINING capture c26 — the Lot Number Selection
   List as it first opens (no search parameters, expired and recalled lots
   hidden): Lot Number · Medication · Generic Name / Agent List · Size · Unit
   · Expiry · Recall Date. Every row below is transcribed from it, in its
   order. The grid's scroll bar shows it holds more lots than the 25 in view;
   those are not captured and are not invented. No row carries a Recall Date.
   ========================================================================= */

export type ImmunizationLot = {
  lot: string
  medication: string
  generic: string
  size: string
  unit: string
  expiry: string
  recall: string
}

const lot = (l: string, medication: string, generic: string, size: string, unit: string, expiry: string): ImmunizationLot =>
  ({ lot: l, medication, generic, size, unit, expiry, recall: '' })

const B100 = 'BEYFORTUS 100 MG SOLUTION'
const N100 = 'NIRSEVIMAB 100MG SOLUTION'
const B50 = 'BEYFORTUS 50 MG SOLUTION'
const N50 = 'NIRSEVIMAB 50MG SOLUTION'

export const IMMUNIZATION_LOTS: ImmunizationLot[] = [
  lot('UK418AB', 'ACT-HIB', 'Hib', '0.5', 'ML', '2027.02.11'),
  lot('Y3F49P2', 'AVAXIM 160 UNIT SUSPENSION', 'HEPATITIS A VIRUS, INACTIVATED 160UNIT SUSPENSION', '', '', '2027.06.30'),
  lot('5CA18C1', B100, N100, '1.0', 'ML', '2028.04.30'),
  lot('5CA18C1-CC01', B100, N100, '1.0', 'ML', '2028.04.30'),
  lot('AZ250060', B100, N100, '1.0', 'ML', '2027.11.30'),
  lot('AZ250060-CC01', B100, N100, '1.0', 'ML', '2027.11.30'),
  lot('AZ250060-CC02', B100, N100, '1.0', 'ML', '2027.11.30'),
  lot('AZ250060-CC04', B100, N100, '1.0', 'ML', '2027.11.30'),
  lot('5CA13C1', B50, N50, '0.5', 'ML', '2027.09.30'),
  lot('5CA13C1-CC01', B50, N50, '0.5', 'ML', '2027.09.30'),
  lot('5CA13C1-CC02', B50, N50, '0.5', 'ML', '2027.09.30'),
  lot('5CA13C1-CC03', B50, N50, '0.5', 'ML', '2027.09.30'),
  lot('5CA13C1-CC03-CC01', B50, N50, '0.5', 'ML', '2027.09.30'),
  lot('5CA13C1-CC03-CC02', B50, N50, '0.5', 'ML', '2027.09.30'),
  lot('AZ250073', B50, N50, '0.5', 'ML', '2027.12.31'),
  lot('22LJ2', 'BOOSTRIX', 'TdaP', '0.5', 'ML', '2028.06.30'),
  lot('22LJ2-CC01', 'BOOSTRIX', 'TdaP', '0.5', 'ML', '2028.06.30'),
  lot('2S9SJ', 'BOOSTRIX', 'TdaP', '0.5', 'ML', '2027.02.28'),
  lot('2S9SJ-CC02', 'BOOSTRIX', 'TdaP', '0.5', 'ML', '2027.02.28'),
  lot('3593R', 'BOOSTRIX', 'TdaP', '0.5', 'ML', '2028.06.30'),
  lot('3593R-CC01', 'BOOSTRIX', 'TdaP', '0.5', 'ML', '2028.06.30'),
  lot('3593R-CC04', 'BOOSTRIX', 'TdaP', '0.5', 'ML', '2028.06.30'),
  lot('43YS9', 'BOOSTRIX', 'TdaP', '0.5', 'ML', '2029.01.31'),
  lot('43YS9-CC01', 'BOOSTRIX', 'TdaP', '0.5', 'ML', '2029.01.31'),
  lot('43YS9-CC02', 'BOOSTRIX', 'TdaP', '0.5', 'ML', '2029.01.31'),
]
