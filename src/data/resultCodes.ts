/* ============================================================================
   The two code lists a Measures row's Flag and Status cells drop.

   PROVENANCE:
     · Flag — tlp_abnormal_flag, exported from the test MOIS database
       (webforms data/mois-sql/abnormal-flags.csv), in num_order. The
       2026-09-29 TRAINING capture c06 drops the same list in the same
       order, <3% … HH first.
     · Status — HL7 table 0085 (observation result status) in the wording
       MOIS shows, read off the 2026-09-29 TRAINING capture c07: C, D, F, I,
       N, O, P, R, S, U, X. MOIS shortens N and U from the HL7 text.
   ========================================================================= */

export type ResultCode = { code: string; description: string }

export const ABNORMAL_FLAGS: ResultCode[] = [
  ['<3%', 'Below 3rd %'],
  ['<0.1%', 'Below 0.1%'],
  ['>85%', 'Above 85%'],
  ['FL%', 'Flat growth trend = no growth'],
  ['>97%', 'Above 97%'],
  ['VS', 'Very susceptible. Indicates for microbiology susceptibilities only.'],
  ['U', 'Significant change up'],
  ['S', 'Susceptible. Indicates for microbiology susceptibilities only.'],
  ['R', 'Resistant. Indicates for microbiology susceptibilities only.'],
  ['NULL', 'No range defined, or normal ranges dont apply'],
  ['N', 'Normal (applies to non-numeric results)'],
  ['LL', 'Below lower panic limits'],
  ['MS', 'Moderately susceptible. Indicates for microbiology susceptibilities only.'],
  ['L', 'Below low normal'],
  ['I', 'Intermediate. Indicates for microbiology susceptibilities only.'],
  ['HH', 'Above upper panic limits'],
  ['H', 'Above high normal'],
  ['D', 'Significant change down'],
  ['B', 'Better--use when direction not relevant'],
  ['AA', 'Very abnormal (applies to non-numeric units, analogous to panic limits for numeric units)'],
  ['A', 'Abnormal (applies to non-numeric results)'],
  ['>', 'Above absolute high-off instrument scale'],
  ['<', 'Below absolute low-off instrument scale'],
  ['W', 'Worse--use when direction not relevant'],
].map(([code, description]) => ({ code: code!, description: description! }))

export const RESULT_STATUSES: ResultCode[] = [
  ['C', 'Record coming over is a correction and thus replaces a final result'],
  ['D', 'Deletes the OBX record'],
  ['F', 'Final results; Can only be changed with a corrected result.'],
  ['I', 'Specimen in lab; results pending'],
  ['N', 'Not asked.'],
  ['O', 'Order detail description only (no result)'],
  ['P', 'Preliminary results'],
  ['R', 'Results entered -- not verified'],
  ['S', 'Partial results'],
  ['U', 'Results status change to final without retransmitting results'],
  ['X', 'Results cannot be obtained for this observation'],
].map(([code, description]) => ({ code: code!, description: description! }))
