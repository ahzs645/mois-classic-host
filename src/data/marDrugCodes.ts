/* ============================================================================
   The MAR's Drug Code Lookup list — the catalogue behind the Medication "…"
   (F4) of every MAR window (303427 "Drug Code Lookup").

   Like the prescription catalogue (data/medications.ts) this is the site's,
   not the patient's, so it is transcribed rather than read from the export.

   PROVENANCE: 303427 `8898305e…png` (v02.1x), a search for "tetanus": the
   grid F · Generic Name · Brand Name · ATC Code · ATC Name · Cost · LCA and
   its fifteen rows below, word for word as far as the columns show them
   (clipped names are completed only where the detail panel under the grid
   spells them out — the ADACEL-POLIO row: Agent Name TdaP-IPV, CDIC
   02352044, Ref. Sets BCIMM, Manufacturer SANOFI PASTEUR LIMITED).
   The rest are the stage's own, named after the MAR records the manual
   shows (1494e901 / cb60a024: INFLUENZA, Td, HAHB, PERTUSSIS, DTaP-IPV,
   CORTISONE ACETICUM 6 X LIQUID) so a friendly-name search ("td", "ha")
   lands on something. INFERRED: their codes, manufacturers and ref. sets.

   `agent` is the Friendly Name ("Medications will appear in a state known as
   the Friendly Name … When looking at the Drug Code entry, the Friendly Name
   is shown as the Agent Name"). `refSets`: BCIMM is the capture's
   abbreviation for Immunization - BC; APPMED stands in for Approved
   Medications.
   ========================================================================= */

export type MarDrugCode = {
  f: string
  generic: string
  brand: string
  atc: string
  atcName: string
  cost: string
  lca: string
  cdic: string
  manufacturer: string
  /** the Friendly Name MOIS matches typing against (`td` → Td) */
  agent: string
  /** the Code System it belongs to */
  system: 'HC-DPD' | 'HC-NHP' | 'HISTORICAL'
  /** Reference Set membership */
  refSets: ('BCIMM' | 'APPMED')[]
}

const dpd = (generic: string, brand: string, atc: string, atcName: string, agent = '', refSets: MarDrugCode['refSets'] = ['BCIMM'], extra: Partial<MarDrugCode> = {}): MarDrugCode => ({
  f: '', generic, brand, atc, atcName, cost: '-', lca: '-', cdic: '', manufacturer: '', agent, system: 'HC-DPD', refSets, ...extra,
})

export const MAR_DRUG_CODES: MarDrugCode[] = [
  /* 8898305e — the "tetanus" search, in the capture's order */
  dpd('MENINGOCOCCAL POLYSACCHARIDE VACCINE GRP C 10MCG', 'NEISVAC-C', 'J07AH07', 'MENINGOCOCCUS C, PURIFIED POLYSACCHARIDES ANTIGEN CONJUGATED', 'Men-C-C'),
  dpd('PNEUMOCOCCAL POLYSACC. SEROT. 18C CONJUG. TO TETANUS TOXOID', 'SYNFLORIX', 'J07AL02', 'PNEUMOCOCCUS, PURIFIED POLYSACCHARIDES ANTIGEN CONJUGATED', 'Pneu-C-10'),
  dpd('TETANUS', '', '', '', 'T', ['BCIMM'], { system: 'HISTORICAL' }),
  dpd('TETANUS IMMUNE GLOBULIN (HUMAN) 250UNIT SOLUTION', 'HYPERTET S/D', 'J06BB02', 'TETANUS IMMUNOGLOBULIN', 'TIg'),
  dpd('TETANUS PROTEIN 20MCG HAEMOPHILUS INFLUENZAE TYPE B', 'ACT-HIB', 'J07AG51', 'HEMOPHILUS INFLUENZAE B, COMBINATIONS WITH TOXOIDS', 'Hib'),
  dpd('TETANUS PROTEIN 20MCG TETANUS TOXOID 5LF DIPHTHERIA TOXOID', 'PENTACEL', 'J07CA06', 'DIPHT-HEMOPH INFLUEN B-PERTUSS-POLIOMYEL-TETANUS', 'DTaP-IPV-Hib'),
  dpd('TETANUS PROTEIN 20MCG TETANUS TOXOID 5LF DIPHTHERIA TOXOID 15LF', 'PEDIACEL', 'J07CA06', 'DIPHT-HEMOPH INFLUEN B-PERTUSS-POLIOMYEL-TETANUS', 'DTaP-IPV-Hib'),
  dpd('TETANUS TOXOID 20UNIT DIPHTHERIA TOXOID 2UNIT PERTUSSIS', 'BOOSTRIX', 'J07AX', 'OTHER BACTERIAL VACCINES', 'Tdap'),
  dpd('TETANUS TOXOID 5LF DIPHTHERIA TOXOID 15LF INACTIVATED POLIO', 'QUADRACEL', 'J07CA02', 'DIPHTHERIA-PERTUSSIS-POLIOMYELITIS-TETANUS', 'DTaP-IPV'),
  dpd('TETANUS TOXOID 5LF DIPHTHERIA TOXOID 15LF PERTACTIN', 'TRIPACEL HYBRID', 'J07AJ52', 'PERTUSSIS, PURIFIED ANTIGEN, COMBINATIONS WITH TOXOIDS', 'DTaP'),
  dpd('TETANUS TOXOID 5LF DIPHTHERIA TOXOID 2LF INACTIVATED POLIOMYELITIS VACCINE (D.C.O.) TYPES 1, 2, 3', 'ADACEL-POLIO', 'J07CA02', 'DIPHTHERIA-PERTUSSIS-POLIOMYELITIS-TETANUS', 'TdaP-IPV', ['BCIMM'], { cdic: '02352044', manufacturer: 'SANOFI PASTEUR LIMITED' }),
  dpd('TETANUS TOXOID 5LF DIPHTHERIA TOXOID 2LF INACTIVATED POLIO', 'TD POLIO ADSORBED', 'J07CA01', 'DIPHTHERIA-POLIOMYELITIS-TETANUS', 'Td-IPV'),
  dpd('TETANUS TOXOID 5LF DIPHTHERIA TOXOID 2LF PERTACTIN', 'ADACEL', 'J07AJ52', 'PERTUSSIS, PURIFIED ANTIGEN, COMBINATIONS WITH TOXOIDS', 'Tdap'),
  dpd('TETANUS TOXOID ADSORBED 40MCG TETANUS TOXOID HEPATITIS B', 'INFANRIX-HEXA', 'J07CA09', 'DIPHTHERIA-HEMOPHILUS INFLUENZAE B-PERTUSSIS-POLIOMYELITIS-TETANUS-HEPATITIS B', 'DTaP-HB-IPV-Hib'),
  dpd('TETANUS TOXOID ADSORBED 5.0LF DIPHTHERIA TOXOID ADSORBED', 'BOOSTRIX-POLIO', 'J07CA02', 'DIPHTHERIA-PERTUSSIS-POLIOMYELITIS-TETANUS', 'Tdap-IPV'),
  dpd('TETANUS TOXOID ADSORBED 5LF DIPHTHERIA TOXOID ADSORBED 2LF', 'TD ADSORBED', 'J07AM51', 'TETANUS TOXOID, COMBINATIONS WITH DIPHTHERIA TOXOID', 'Td'),
  /* the stage's own: the manual's MAR records, and one running order */
  dpd('INFLUENZA VACCINE (SPLIT VIRION, INACTIVATED)', 'FLUZONE QUADRIVALENT', 'J07BB02', 'INFLUENZA, INACTIVATED, SPLIT VIRUS OR SURFACE ANTIGEN', 'INFLUENZA'),
  dpd('HEPATITIS A VACCINE (INACTIVATED) HEPATITIS B SURFACE ANTIGEN', 'TWINRIX', 'J07BC20', 'COMBINATIONS', 'HAHB'),
  dpd('PERTUSSIS VACCINE', '', 'J07AJ', 'PERTUSSIS VACCINES', 'PERTUSSIS', ['BCIMM'], { system: 'HISTORICAL' }),
  dpd('CORTISONE ACETICUM 6 X LIQUID', 'CORTISONE ACETICUM', 'H02AB10', 'CORTISONE', '', ['APPMED'], { system: 'HC-NHP' }),
  dpd('ACETAMINOPHEN 500MG TABLET', 'TYLENOL EXTRA STRENGTH', 'N02BE01', 'PARACETAMOL', '', ['APPMED']),
]

/** The Code System drop-down (303427 "Code System: There are 4 code set options"). */
export const MAR_CODE_SYSTEMS = [
  'ALL Drug Codes',
  'Health Canada Drug Products Database',
  'Health Canada Natural Health Products',
  'Historical Drug Code',
] as const

/** The Reference Set drop-down ("two reference set options"). */
export const MAR_REFERENCE_SETS = ['', 'Immunization - BC', 'Approved Medications'] as const

/** `td` → Td: the drug whose Friendly Name the typing matches exactly. */
export function friendlyNameMatch(typed: string): MarDrugCode | undefined {
  const t = typed.trim().toLowerCase()
  if (!t) return undefined
  return MAR_DRUG_CODES.find((d) => d.agent.toLowerCase() === t)
}

/** What the lookup lists for a search, a code system and a reference set. */
export function searchMarDrugCodes(search: string, system: string, refSet: string): MarDrugCode[] {
  const t = search.trim().toLowerCase()
  return MAR_DRUG_CODES.filter((d) => {
    if (system === MAR_CODE_SYSTEMS[1] && d.system !== 'HC-DPD') return false
    if (system === MAR_CODE_SYSTEMS[2] && d.system !== 'HC-NHP') return false
    if (system === MAR_CODE_SYSTEMS[3] && d.system !== 'HISTORICAL') return false
    if (refSet === MAR_REFERENCE_SETS[1] && !d.refSets.includes('BCIMM')) return false
    if (refSet === MAR_REFERENCE_SETS[2] && !d.refSets.includes('APPMED')) return false
    if (!t) return true
    /* "Search Generic and Brand Names" and the Friendly Name */
    return [d.generic, d.brand, d.agent].some((x) => x.toLowerCase().includes(t))
  })
}

/** The name a MAR record shows for a picked drug: its Friendly Name when it has one. */
export const marDrugName = (d: MarDrugCode) => d.agent || d.generic
