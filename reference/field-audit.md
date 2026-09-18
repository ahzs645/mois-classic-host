# MOIS field audit — extracted inventory

Source: `evidence/` in the MOIS output folder — 1074 entries, each a
verified mapping from a visible control to its database column, with its own
`ui-original.png`, red-arrow annotation and audit dialog.

The evidence set holds **786 distinct screenshots**, of which only 34 also appear
among the 43 top-level captures — so 752 of them show screens or states that the
top-level set never did.

## Verification status

| status | count |
|---|---|
| Verified | 584 |
| Needs manual review | 211 |
| Not testable | 172 |
| Not auditable | 75 |
| Discrepancy | 25 |
| Not a data field | 7 |

## Fields by table

These are what the kit's column sets are now built from. A screen marked
`audited: true` in `src/data/chartScreens.tsx` draws its columns from here.

### `tdt_measure` (29 distinct fields)

`Code` · `Units` · `Collected` · `Ordered By` · `Test Name` · `Value` · `Flag` · `Status` · `Ref Ranges` · `Order Date` · `Copies To` · `Order #` · `MOIS Code` · `LOINC` · `Perform By` · `Perform By:Date/Tme` · `Report By` · `Report By:Date` · `Transcribed` · `Transcribed:Date/Time` · `Collect By` · `Collect By:Date/Time` · `Facility` · `Facility Loc` · `Facility Ref` · `Ord. Name` · `Volume` · `Class` · `Specimen Src`

### `tdt_image` (25 distinct fields)

`Performed` · `Ordered By` · `Test Name` · `Region` · `Laterality` · `Modality` · `Contrast` · `Status` · `M` · `Paper clip` · `Flag` · `Order Date` · `Copies To` · `Perform By` · `Perform By:Date/Tme` · `Report By` · `Report By:Date` · `Transcribed` · `Transcribed:Date/Time` · `Exam Reasn` · `Diag Desc` · `Key Word` · `Facility` · `Facility Loc` · `Facility Ref`

### `tdt_document` (23 distinct fields)

`Date` · `Author` · `Document Type` · `Source Venue` · `Author Type` · `Author Role` · `Note` · `S` · `Attending` · `Responsible Org` · `Recipient` · `Copies To` · `Transcribed` · `Transcribed:Date/Time` · `Diagnosis` · `Facility` · `Facility Ref` · `Facility Loc` · `Form Name` · `M` · `Paper clip` · `Diag Descr` · `Primary Recipient`

### `tdt_chart` (37 distinct fields)

`Chart No` · `First Name` · `Middle Name` · `Last Name` · `Alias - First Name` · `Alias - Last Name` · `Birth Date` · `Gender` · `Address 1` · `Address 2` · `City` · `Province` · `Country` · `Preferred Phone` · `eMail (Home)` · `eMail (Work)` · `Short Note` · `General Note` · `Facility` · `Location` · `Insurance by` · `Insurance No` · `Dep. No:` · `Benefit Source` · `Preferred Gender` · `Genotypic Gender` · `Country Origin` · `First Language` · `Religion` · `First Nation Status` · `Patient Adopted` · `Multi-Gestation` · `Relationship` · `Education Level` · `Socioeconomic` · `Living Arranegments` · `General Notes`

### `tdt_wait_list` (27 distinct fields)

`Row#` · `Last Name` · `First Name` · `Chart` · `Date Added` · `W.T.` · `Bk'd` · `List` · `Reason` · `Priority` · `Patient Name` · `DOB` · `Sex` · `Address 1` · `Address 2` · `City` · `Province` · `Postal Code` · `Country` · `Home` · `Work` · `Ext` · `Cell` · `Pager` · `Pref'd Phone` · `Fax` · `eMail`

### `tdt_consult` (19 distinct fields)

`Refer Date` · `Seen Date` · `Referred By` · `Seen By` · `Reason for Consult Request` · `S` · `M` · `Reason` · `Seen By:Date` · `Consultant's Diagnosis` · `Report By` · `Report By:Date` · `Copies To` · `Transcribed` · `Transcribed:Date/Time` · `Key Word` · `Facility` · `Facility Loc` · `Facility Ref`

### `tdt_goal` (20 distinct fields)

`Start` · `End` · `Goal` · `Phase` · `Quantitative Goal` · `Commit Level` · `Import Level` · `S` · `Goal Type` · `Expected Outcome` · `Detail` · `Patient Commitment Level` · `Patient Confidence Level` · `Provider Importance Level` · `Subject` · `Identified By` · `Concept` · `Target Value` · `Evaluation Method` · `Actual Outcome`

### `tdt_procedure` (17 distinct fields)

`Performed` · `Performed By` · `Description` · `Diag Desc` · `Order Date` · `Ordered By` · `Report By` · `Report By:Date` · `Copies To` · `Perform By` · `Perform By:Date/Tme` · `Transcribed` · `Transcribed:Date/Time` · `Key Word` · `Facility` · `Facility Loc` · `Facility Ref`

### `tdt_order` (21 distinct fields)

`Date` · `Order Type` · `Ordered By` · `Order To` · `Order For` · `ST` · `Paper clip` · `Attending` · `Responsible Org` · `Referred To` · `Copies To` · `Transcribed` · `Facility` · `Facility Ref` · `Facility Loc` · `Payor` · `Notify` · `Order Assigned to` · `Referral Source` · `Priority` · `Status`

### `tdt_admission` (18 distinct fields)

`Admitted` · `Discharged` · `Admit By` · `Facility` · `Description` · `Paper clip` · `Attending` · `Diag Descr` · `Admit Date` · `Admitted By` · `Copies To` · `Transcribed` · `Transcribed:Date/Time` · `Report By` · `Report By:Date` · `Key Word` · `Facility Loc` · `Facility Ref`

### `tdt_allergy` (17 distinct fields)

`Onset` · `~` · `Type` · `Category` · `Code` · `Agent` · `Date of Onset` · `Stop Date` · `Risk Status` · `Certainty` · `Criticality` · `Severity` · `Phase at Onset` · `Informant` · `Observer` · `Documenter` · `Comment`

### `tdt_chart_preference` (16 distinct fields)

`Start` · `Type` · `Subject` · `Detail` · `S` · `Show on Demo` · `Concept/Code Desc./Description` · `Subject Detail` · `Start Date` · `Mark as Sensitive` · `Show on Demographics` · `Form` · `By` · `Instruction:Detail` · `Reason:` · `Reason:Detail`

### `tdt_chart_service` (11 distinct fields)

`Service Episode` · `Service MRP` · `Start` · `Stop` · `Show on Demo` · `Paper clip` · `General Note` · `Stop Date` · `Stop Reason` · `Stop Note` · `Start Date`

### `tdt_occupation` (13 distinct fields)

`Start` · `End` · `Occupation` · `Hrs/Wk` · `Company` · `Phone (M)` · `Paper clip` · `City` · `Province` · `Postal Code` · `Country` · `Office  - Main` · `Office - Other`

### `tdt_encounter` (13 distinct fields)

`Date` · `HR` · `Code` · `#` · `Visit Reason` · `Health Issue` · `Services` · `Payor` · `Room` · `Duration of Care` · `Service Location` · `Billing Status` · `General Note`

### `tdt_mar` (15 distinct fields)

`Date/Time` · `Given By` · `Medication` · `Lot Number` · `Series Number` · `Dosage` · `Route` · `Site` · `Administration Note` · `Preparation Note` · `Consent Note` · `Reason` · `Informed Consent` · `Form of Consent` · `Consent By`

### `tdt_associated_party` (11 distinct fields)

`Name` · `Relationship` · `Show on Demo` · `Show on Care Plan` · `Paper clip` · `City` · `Province` · `Postal Code` · `Country` · `Pref'd Phone` · `eMail (Home)`

### `tdt_education` (11 distinct fields)

`Start` · `Stop` · `Educational Institution` · `Level of Education` · `Completed` · `Paper clip` · `Institution Category` · `Completed Date` · `Field of Study` · `Enrolled As` · `Comment`

### `tdt_action` (11 distinct fields)

`Planned Start` · `Planned End` · `Action` · `Participant(s)` · `Action Completed` · `Completed Date` · `S` · `Paper clip` · `Detail` · `Outcome` · `Completed`

### `tdt_claim_wcb` (11 distinct fields)

`DOI` · `Claim No` · `Position` · `Employer` · `Default` · `Paper clip` · `Address` · `City` · `Postal Code` · `Province` · `Country`

### `tdt_health_issue` (10 distinct fields)

`Start` · `End` · `Problem Name` · `Rank` · `Certainty` · `Severity` · `S` · `Severity System` · `Severity Code` · `Source`

### `tdt_alert` (10 distinct fields)

`Start` · `End` · `Code` · `Description` · `Detail` · `S` · `M` · `Paper clip` · `Sensitive` · `Comment`

### `tdt_chart_address` (10 distinct fields)

`Expiry Date` · `City` · `Province` · `Home Phone` · `Work Phone` · `Other Phone` · `Cell Phone` · `eMail (Home)` · `eMail (Work)` · `Note`

### `tdt_connection` (10 distinct fields)

`Connection Role` · `Connection` · `Start` · `End` · `Show on Demo` · `Care Team Member` · `Paper clip` · `General Comment` · `Stopped Reason` · `Stopped Note`

### `tdt_risk` (10 distinct fields)

`Start` · `End` · `Risk Code/Description` · `Rank` · `Source` · `S` · `Neg` · `Risk Description` · `Value` · `Comment`

### `tdt_need` (10 distinct fields)

`Start` · `End` · `Need Description` · `Participant(s)` · `S` · `Paper clip` · `Need Desc` · `Value` · `Participant` · `Comment`

### `tdt_alias_id` (9 distinct fields)

`Code` · `Description` · `Value` · `Effective` · `Note` · `Show on Demo` · `M` · `Paper clip` · `Comment`

### `tdt_medication_lt` (9 distinct fields)

`Start` · `End` · `Medication` · `Dose/Frequency` · `Indic` · `Started By` · `Generic Name` · `Indication` · `Instructions`

### `tdt_prescription` (9 distinct fields)

`Order` · `Medication` · `Dose/Frequency` · `Amount` · `Started By` · `Generic Name` · `Indication` · `Comment` · `Office Note`

### `tdt_group_visit` (9 distinct fields)

`Date` · `HR` · `MN` · `#` · `Topic Code` · `Topic Description` · `Code` · `Service Location` · `Comment`

### `tdt_adverse_agent` (8 distinct fields)

`Generic Name` · `Brand Name` · `Manufacturer` · `Lot Number` · `Series Number` · `Dose (qnty/unit)` · `Route` · `Site`

### `tdt_chart_barrier` (7 distinct fields)

`Start` · `End` · `Barrier to Care` · `S` · `M` · `Paper clip` · `Note`

### `tdt_chart_resource` (7 distinct fields)

`Start` · `End` · `Barrier to Care` · `S` · `M` · `Paper clip` · `Note`

### `tdt_chart_name` (5 distinct fields)

`First` · `Middle` · `Last` · `Expiry` · `Note`

### `tdt_benefit_service` (5 distinct fields)

`Service Start` · `Service End` · `Description` · `Include on Demographics` · `Note`

### `tdt_chart_occupant` (5 distinct fields)

`Start` · `Stop` · `Quantity` · `Note` · `Paper clip`

### `tdt_intervention` (5 distinct fields)

`Date` · `Performed By` · `Description` · `Declined` · `Not Indicated`

### `tdt_family_hx` (5 distinct fields)

`Chart` · `Name` · `Relationship` · `Condition` · `Comment`

### `tdt_social_hx` (4 distinct fields)

`Start` · `End` · `Description` · `S`

### `tdt_claim_other` (3 distinct fields)

`Date Issued` · `Claim Number` · `Description`

### `tdt_claim_incentive` (3 distinct fields)

`Start` · `Diag Code` · `Freq (mnth)`

### `tdt_reaction_risk` (3 distinct fields)

`Code` · `Reaction` · `Rank`

### `tdt_reaction_event` (3 distinct fields)

`Code` · `Reaction` · `Rank`

### `tdt_cp_section` (3 distinct fields)

`Order` · `Section Label` · `Type`

### `tdt_contact_method` (2 distinct fields)

`Reason` · `Method`

### `tdt_benefit_source` (1 distinct fields)

`Patient ID`

### `tdt_service_event` (1 distinct fields)

`Service Event`

### `tdt_service_event_diag` (1 distinct fields)

`Health Issue`
