import { useMemo, useState } from 'react'
import { PBCheckbox, PBLookup, PBSelect } from '../../pb'
import { CLAIM_FEE_ROWS } from '../../data/billingStore'
import { DOCTORS } from '../../data/claims'
import { rosterProvider } from '../../data/clinicRoster'
import { serviceCodeRows, type ServiceCodeRow } from '../../data/encounterPickers'
import { registerConfirmCurrent } from '../../host/confirmCurrent'
import { registerScreenWindows, useReportDialog } from '../../host/screen-windows'
import { useScreenReport } from '../../host/screen-state'
import { WorkspaceDialogFrame } from '../WorkspaceDialogFrame'
import {
  FILL_GRID, LOOKUP_BODY, LOOKUP_PANEL, LookupBand, LookupNote, LookupPager, PickButtons, PickListWindow, SearchForRow, SIZE,
  usePagedCursor,
} from '../lookupKit'

/* ============================================================================
   The small pickers Unsent MSP raises over itself.

   · Fee Item "…" / F4. 303601: "The next field is the Fee Code to identify
     what is being billed. Press F4 or click the ellipsis to choose the
     correct code from the prompt list." Which prompt list: the fee codes
     live in the Service Code prompt list (303219: "press F4 in the code
     field to select the fee code"; its description is "Master Service Code
     List", data/adminLists PROMPT_LISTS), and in the current build a
     Service Code "…" opens Advanced Lookup Service ▸ Master Service Code
     List (user capture 2026-09-25 #74/#75, Provider ▸ Billing; the
     encounter's Services "…" opens the same window, CodeLookupDialogs.tsx
     ServiceCodeLookupDialog). INFERRED: that the claim's Fee Item opens it
     too — no capture of a claim's fee prompt exists. It is laid out as that
     captured window: band, Search For with Status, Code · Description ·
     MSP · WCB · Private · Code System · Category · Type, the description
     pane, Home / PgUp · Ok / Cancel · PgDwn / End, Source / Save on Close.
     Its rows are the billing fee items (data/billingStore CLAIM_FEE_ROWS)
     ahead of the Master Service Code List's first page.
   · Registered Provider List — Action ▸ Change Claim Provider (Ctrl+D),
     Duplicate Claim diff Provider (Ctrl+F3) and the Doctor "…". 303601:
     "prompts you with a registered provider list to select a new
     provider"; 304741 (Common Windows Described, text only): "a list of
     registered providers that includes the practitioner number and payee
     number". INFERRED layout (no capture): Provider | Pract. No. | Payee No.
     and Select / Cancel.

   Both are screen windows (host/screen-windows): ids below, opened by
   `openWindowById` as well as by the view's own buttons, reported as
   `host.dialog` while up.
   ========================================================================= */

export const UNSENT_WINDOWS = {
  fee: 'claim-fee-lookup',
  provider: 'claim-provider-list',
  patient: 'claim-patient-lookup',
  diagnosis: 'claim-diagnosis-lookup',
} as const

registerScreenWindows(Object.values(UNSENT_WINDOWS))

registerConfirmCurrent([
  {
    target: { anchor: `host.mois.dialog.${UNSENT_WINDOWS.fee}` },
    source: 'INFERRED from 303219 + the Master Service Code List (user capture 2026-09-25 #74/#75, Provider ▸ Billing); no capture of a claim\'s Fee Item prompt',
    check: 'which list the Fee Item … opens',
  },
  {
    target: { anchor: `host.mois.dialog.${UNSENT_WINDOWS.provider}` },
    source: 'INFERRED from 303601 / 304741 text; no capture',
    check: 'title, columns, buttons',
  },
])

/** A billing fee item as a Master Service Code List row. */
type FeeRow = ServiceCodeRow & { time?: 'received' | 'start-finish'; diag?: string }

const FEE_ROWS: FeeRow[] = [
  ...CLAIM_FEE_ROWS.map((r) => ({
    code: r.code, description: r.desc, msp: r.fee, wcb: '', private: '', system: 'BCMSPFEE', category: '', type: 'EVENT',
    time: r.time, diag: r.diag,
  })),
  ...serviceCodeRows.filter((r) => !CLAIM_FEE_ROWS.some((f) => f.code === r.code)),
]

export function FeeCodeLookupWindow({ onPick, onClose }: { onPick: (row: FeeRow) => void; onClose: () => void }) {
  useReportDialog(UNSENT_WINDOWS.fee)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [source, setSource] = useState('ALL')
  const [saveOnClose, setSaveOnClose] = useState(false)
  const rows = useMemo(() => {
    const want = search.trim().toUpperCase()
    return FEE_ROWS.filter((r) => (source === 'ALL' || r.system === source)
      && (!want || r.code.toUpperCase().includes(want) || r.description.toUpperCase().includes(want)))
  }, [search, source])
  const cursor = usePagedCursor(rows.length, 12)
  useScreenReport({ rows: rows.length })
  const picked = rows[cursor.at]
  return (
    <PickListWindow<FeeRow>
      frame={(content, footer) => (
        <WorkspaceDialogFrame id={UNSENT_WINDOWS.fee} title="Advanced Lookup Service" width={1000} height={720} controls={false} onClose={onClose}>
          {content}{footer}
        </WorkspaceDialogFrame>
      )}
      body={LOOKUP_BODY}
      panel={LOOKUP_PANEL}
      band={<LookupBand variant="ruled">Master Service Code List</LookupBand>}
      search={(
        <SearchForRow
          style={{ gap: 4, padding: '3px 4px', flex: 'none' }}
          input={<PBLookup w="100%" value={search} onChange={setSearch} name="fee-search" fieldId="host.mois.field.fee-search" />}
          after={(
            <>
              <span>Status:</span>
              <PBSelect w={92} options={['ALL', 'Active', 'Inactive']} value={status} onChange={(e) => setStatus(e.target.value)} />
            </>
          )}
        />
      )}
      gridBox={null}
      grid={{
        flush: true,
        rules: 'white',
        style: FILL_GRID,
        columns: [
          { key: 'code', header: 'Code', width: 86, align: 'center' },
          { key: 'description', header: 'Description' },
          { key: 'msp', header: 'MSP', width: 78, align: 'right' },
          { key: 'wcb', header: 'WCB', width: 78, align: 'right' },
          { key: 'private', header: 'Private', width: 82, align: 'right' },
          { key: 'system', header: 'Code System', width: 108 },
          { key: 'category', header: 'Category', width: 128 },
          { key: 'type', header: 'Type', width: 88 },
        ],
        rows,
        current: cursor.at,
        onCurrentChange: cursor.setCurrent,
        onActivate: (r) => onPick(r),
        rowTutorialId: (r) => `host.mois.row.fee-${r.code.trim().toLowerCase()}`,
        empty: 'No service code matches.',
      }}
      below={<LookupNote height={96}>This is the master service code selection list</LookupNote>}
      footerInside
      footer={(
        <LookupPager
          cursor={cursor}
          ok={{ command: 'fee-select', isDefault: true, disabled: !picked, onClick: () => picked && onPick(picked) }}
          cancel={{ command: 'fee-cancel', onClick: onClose }}
        />
      )}
      after={(
        <div className="pb-row" style={{ gap: 10, flex: 'none' }}>
          <span>Source:</span>
          <PBSelect w={200} options={['ALL', 'BCMSPFEE', 'BCMAFEE', 'USER']} value={source} onChange={(e) => setSource(e.target.value)} />
          <PBCheckbox label="Save on Close" checked={saveOnClose} onChange={setSaveOnClose} />
        </div>
      )}
    />
  )
}

export function ProviderListWindow({ title = 'Registered Provider List', onPick, onClose }: {
  title?: string
  onPick: (doctor: string) => void
  onClose: () => void
}) {
  useReportDialog(UNSENT_WINDOWS.provider)
  const [cur, setCur] = useState(0)
  /* 304741: "a list of registered providers that includes the practitioner
     number and payee number" (data/clinicRoster) */
  const rows = DOCTORS.map((d) => ({ doctor: d, pract: rosterProvider(d)?.pract ?? '', payee: rosterProvider(d)?.payee ?? '' }))
  const picked = rows[cur]?.doctor
  return (
    <PickListWindow
      frame={(content, footer) => (
        <WorkspaceDialogFrame id={UNSENT_WINDOWS.provider} title={title} width={440} height={320} controls={false} onClose={onClose}>
          {content}{footer}
        </WorkspaceDialogFrame>
      )}
      body={LOOKUP_BODY}
      gridBox={null}
      grid={{
        style: FILL_GRID,
        columns: [
          { key: 'doctor', header: 'Provider', width: 240 },
          { key: 'pract', header: 'Pract. No.', width: 76, align: 'center' },
          { key: 'payee', header: 'Payee No.', width: 76, align: 'center' },
        ],
        rows,
        current: cur,
        onCurrentChange: setCur,
        onActivate: () => picked && onPick(picked),
        rowTutorialId: (r) => `host.mois.row.provider-${r.doctor.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`,
      }}
      footerInside
      footer={(
        <PickButtons style={{ display: 'flex', justifyContent: 'center', gap: 12, flex: 'none' }} size={SIZE.dialog()} buttons={[
          { label: 'Select', command: 'provider-select', isDefault: true, disabled: !picked, onClick: () => picked && onPick(picked) },
          { label: 'Cancel', command: 'provider-cancel', onClick: onClose },
        ]} />
      )}
    />
  )
}
