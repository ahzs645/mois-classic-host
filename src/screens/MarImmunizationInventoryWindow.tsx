import { useMemo, useState } from 'react'
import { IMMUNIZATION_LOTS, type ImmunizationLot } from '../data/marImmunizationLots'
import { MOIS_TODAY } from '../data/patients'
import { registerScreenWindows } from '../host/screen-windows'
import { useScreenReport } from '../host/screen-state'
import { PBBand, PBCheckbox, PBDataWindow, PBInput, pbSlug, type PBColumn } from '../pb'
import { FooterButton, StageWindow } from './StageWindow'
import './mar.css'

/* ============================================================================
   Immunization Inventory Search — what New … ▸ Administer an Immunization
   opens before the record window: pick the lot being given, and the record
   opens with its agent, lot number and dose filled in.

   PROVENANCE: 2026-09-29 TRAINING capture c26 (chart 2429), measured at 2x.
   · a 988 × 675 window titled "Immunization Inventory Search";
   · a band "Enter Search Parametes" (MOIS's own spelling) over Brand or
     Agent: [346px] and Lot Number: [118px], fields 101px in, and the ticks
     "Show Expired Lot Numbers" (460px in) and "Show Recalled Lot Numbers"
     (649px in) on Lot Number's row;
   · a band "Lot Number Selection List" over the grid Lot Number (120) ·
     Medication (200) · Generic Name / Agent List (342) · Size (60, right) ·
     Unit (70) · Expiry (76, centred) · Recall Date (76), 19px rows;
   · Select · Cancel centred under it.
   The rows are data/marImmunizationLots.ts. c27 shows what Select carries:
   Medication "Hib" (the Generic Name / Agent List), Lot Number UK418AB,
   Dosage 0.5 ML.

   INFERRED: the search itself — Brand or Agent matches the Medication or the
   Generic Name / Agent List, Lot Number matches from the start of the lot;
   an expired lot (Expiry before today) or a recalled one (with a Recall
   Date) is listed only with its tick. c26 shows the window as it opens, with
   nothing typed.

   Window id `mar-immunization-inventory`. Anchors: host.mois.field.
   mar-lot-brand / mar-lot-number / mar-lot-expired / mar-lot-recalled, rows
   host.mois.row.mar-lot-<lot>, host.mois.command.mar-lot-select. Reported:
   host.screen.marLot (the picked row's lot).
   ========================================================================= */

export const MAR_IMMUNIZATION_INVENTORY = 'mar-immunization-inventory'

registerScreenWindows([MAR_IMMUNIZATION_INVENTORY])

const COLUMNS: PBColumn<ImmunizationLot>[] = [
  { key: 'lot', header: 'Lot Number', width: 120 },
  { key: 'medication', header: 'Medication', width: 200 },
  { key: 'generic', header: 'Generic Name / Agent List', width: 342 },
  { key: 'size', header: 'Size', width: 60, align: 'right', headAlign: 'center' },
  { key: 'unit', header: 'Unit', width: 70, headAlign: 'center' },
  { key: 'expiry', header: 'Expiry', width: 76, align: 'center' },
  { key: 'recall', header: 'Recall Date', width: 76, align: 'center' },
]

export function MarImmunizationInventoryWindow({ onPick, onClose }: {
  onPick: (lot: ImmunizationLot) => void
  onClose: () => void
}) {
  const [brand, setBrand] = useState('')
  const [lotNo, setLotNo] = useState('')
  const [expired, setExpired] = useState(false)
  const [recalled, setRecalled] = useState(false)
  const rows = useMemo(() => {
    const b = brand.trim().toLowerCase()
    const l = lotNo.trim().toLowerCase()
    return IMMUNIZATION_LOTS.filter((r) => (!b || r.medication.toLowerCase().includes(b) || r.generic.toLowerCase().includes(b))
      && (!l || r.lot.toLowerCase().startsWith(l))
      && (expired || !r.expiry || r.expiry >= MOIS_TODAY)
      && (recalled || !r.recall))
  }, [brand, lotNo, expired, recalled])
  const [cur, setCur] = useState(0)
  const row = rows[Math.min(cur, rows.length - 1)]
  useScreenReport({ marLot: row?.lot ?? null })
  return (
    <StageWindow id={MAR_IMMUNIZATION_INVENTORY} title="Immunization Inventory Search" width={988} height={675} onClose={onClose}
      bodyStyle={{ padding: '2px 3px 0' }}
      footer={<>
        <span className="pb-footer__spacer" />
        <FooterButton primary wide={false} disabled={!row} onClick={() => row && onPick(row)} tutorialId="host.mois.command.mar-lot-select">Select</FooterButton>
        <FooterButton wide={false} onClick={onClose}>Cancel</FooterButton>
        <span className="pb-footer__spacer" />
      </>}>
      <div className="pb-mar-lots__box" style={{ flex: 'none' }}>
        <PBBand>Enter Search Parametes</PBBand>
        <div className="pb-mar-lots__search">
          <span>Brand or Agent:</span>
          <PBInput w={346} value={brand} onChange={(e) => { setBrand(e.target.value); setCur(0) }} data-tutorial-id="host.mois.field.mar-lot-brand" />
          <span>Lot Number:</span>
          <div style={{ position: 'relative' }}>
            <PBInput w={118} value={lotNo} onChange={(e) => { setLotNo(e.target.value); setCur(0) }} data-tutorial-id="host.mois.field.mar-lot-number" />
            {/* the ticks sit 460 and 649px into the window */}
            <span className="pb-mar-lots__tick" style={{ left: 460 - 101 }}><PBCheckbox label="Show Expired Lot Numbers" checked={expired} onChange={setExpired} tutorialId="host.mois.field.mar-lot-expired" /></span>
            <span className="pb-mar-lots__tick" style={{ left: 649 - 101 }}><PBCheckbox label="Show Recalled Lot Numbers" checked={recalled} onChange={setRecalled} tutorialId="host.mois.field.mar-lot-recalled" /></span>
          </div>
        </div>
      </div>
      <div className="pb-mar-lots__box" style={{ flex: '1 1 auto', minHeight: 0, marginTop: 4 }}>
        <PBBand>Lot Number Selection List</PBBand>
        <PBDataWindow flush style={{ flex: '1 1 auto', minHeight: 0, ['--pb-dw-row-h' as string]: '19px', ['--pb-dw-gutter-width' as string]: '18px' }}
          columns={COLUMNS} rows={rows} current={Math.min(cur, Math.max(0, rows.length - 1))} onCurrentChange={setCur}
          onActivate={(r) => onPick(r)}
          rowTutorialId={(r) => `host.mois.row.mar-lot-${pbSlug(r.lot)}`}
          empty="No lot numbers match." />
      </div>
    </StageWindow>
  )
}
