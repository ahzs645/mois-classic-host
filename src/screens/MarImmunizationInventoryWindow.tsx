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

   PROVENANCE: 2026-09-29 TRAINING capture c26 (chart 2429), measured at 2x
   from the window's outer edge (re-measured: the earlier 988 × 675 was
   taken between the boxes):
   · a 998 × 682 window titled "Immunization Inventory Search", nearly the
     frame's width, 3px in from its left;
   · two boxes 3px in, ruled #666, 2px apart, each under a 25px band with a
     dark rule beneath it;
   · "Enter Search Parametes" (MOIS's own spelling) over Brand or Agent:
     [349px] and Lot Number: [118px], labels 13px and fields 100px into the
     box, 17px tall, 20px apart, 9px of face above and below; the ticks
     "Show Expired Lot Numbers" (461px into the box) and "Show Recalled Lot
     Numbers" (651px) on Lot Number's row;
   · "Lot Number Selection List" over a 21px head and the grid Lot Number
     (120) · Medication (205) · Generic Name / Agent List (347) · Size (60,
     right) · Unit (70) · Expiry (77, centred) · Recall Date (76), 19px rows,
     the first three captions 10px further in than their cells' text;
   · a 40px strip under it, Select 436px in and Cancel 9px after it (75 ×
     21), right of centre (screens/mar.css).
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
  { key: 'medication', header: 'Medication', width: 205 },
  { key: 'generic', header: 'Generic Name / Agent List', width: 347 },
  { key: 'size', header: 'Size', width: 60, align: 'right', headAlign: 'center' },
  { key: 'unit', header: 'Unit', width: 70, headAlign: 'center' },
  { key: 'expiry', header: 'Expiry', width: 77, align: 'center' },
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
    <StageWindow id={MAR_IMMUNIZATION_INVENTORY} title="Immunization Inventory Search" width={998} height={682} onClose={onClose}
      /* wider than StageWindow's 24px clamp allows: 4.5px a side in a 1007px frame */
      style={{ width: 'min(998px, calc(100% - 8px))' }}
      bodyStyle={{ padding: '1px 2px 0' }}
      footer={<>
        <FooterButton primary wide={false} disabled={!row} onClick={() => row && onPick(row)} tutorialId="host.mois.command.mar-lot-select">Select</FooterButton>
        <FooterButton wide={false} onClick={onClose}>Cancel</FooterButton>
      </>}>
      <div className="pb-mar-lots__box" style={{ flex: 'none' }}>
        <PBBand>Enter Search Parametes</PBBand>
        <div className="pb-mar-lots__search">
          <span>Brand or Agent:</span>
          <PBInput w={349} value={brand} onChange={(e) => { setBrand(e.target.value); setCur(0) }} data-tutorial-id="host.mois.field.mar-lot-brand" />
          <span>Lot Number:</span>
          <div style={{ position: 'relative' }}>
            <PBInput w={118} value={lotNo} onChange={(e) => { setLotNo(e.target.value); setCur(0) }} data-tutorial-id="host.mois.field.mar-lot-number" />
            {/* the ticks sit 461 and 651px into the box; the field is 100px in */}
            <span className="pb-mar-lots__tick" style={{ left: 461 - 100 }}><PBCheckbox label="Show Expired Lot Numbers" checked={expired} onChange={setExpired} tutorialId="host.mois.field.mar-lot-expired" /></span>
            <span className="pb-mar-lots__tick" style={{ left: 651 - 100 }}><PBCheckbox label="Show Recalled Lot Numbers" checked={recalled} onChange={setRecalled} tutorialId="host.mois.field.mar-lot-recalled" /></span>
          </div>
        </div>
      </div>
      <div className="pb-mar-lots__box" style={{ flex: '1 1 auto', minHeight: 0, marginTop: 2 }}>
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
