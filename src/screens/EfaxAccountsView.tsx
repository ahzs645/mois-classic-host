import { useState } from 'react'
import { useEfaxAccounts, type EfaxAccount } from '../data/letterDocs'
import { useScreenReport } from '../host/screen-state'
import { PBCommandRow, PBDataWindow, PBViewHeader, pbSlug } from '../pb'
import { registerFolderView, type FolderViewProps } from './folderViewRegistry'
import { useRecordList } from './listKit'

/* ============================================================================
   Administration ▸ Clinic Management ▸ eFax Accounts — the eFax Account List.

   PROVENANCE: 2616562 `ac8030cc…` (967x109): the navy "eFax Account List"
   header; New Record · Delete Record · Save · Close; a grid Account Alias ·
   Account Number · Password (masked) · Email · Fax whose current row is the
   salmon edit row. The steps (2616562 "How to enable SRFax Integration"):

     Administration Module > eFax Accounts · New Record · Add an Account
     Alias · Account Number - Provided by SRFax · Fax Number - Provided by
     SRFax · Account Password · Account Email

   The grid is edited in place, like the other inline Clinic Management
   lists; Save commits to the session (data/letterDocs.ts EFAX_ACCOUNTS_KEY),
   which is the account Send eFax sends through. Enabling SRFax itself is
   System Settings ▸ APP SETTING - SRFAX ▸ Enabled (stream E2).

   Reported: `host.screen.rows`, `host.screen.draft` (an unsaved edit),
   `host.screen.saved`.
   ========================================================================= */

const BLANK: EfaxAccount = { alias: '', account: '', password: '', email: '', fax: '' }
const COLUMNS: { key: keyof EfaxAccount; header: string; width: number }[] = [
  { key: 'alias', header: 'Account Alias', width: 218 },
  { key: 'account', header: 'Account Number', width: 142 },
  { key: 'password', header: 'Password', width: 226 },
  { key: 'email', header: 'Email', width: 228 },
  { key: 'fax', header: 'Fax', width: 118 },
]

function EfaxAccountsView({ close }: FolderViewProps) {
  const [saved, setSaved] = useEfaxAccounts()
  const list = useRecordList<EfaxAccount>(saved)
  const { rows, cur, setCur } = list
  const [dirty, setDirty] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  useScreenReport({ rows: rows.length, draft: dirty, saved: justSaved && !dirty })
  const edit = (i: number, key: keyof EfaxAccount, value: string) => {
    list.edit(i, { [key]: value })
    setDirty(true)
  }
  return (
    <>
      <PBViewHeader title="eFax Account List" />
      <PBCommandRow
        commands={[
          { label: 'New Record', onClick: () => { list.add({ ...BLANK }); setDirty(true) } },
          { label: 'Delete Record', onClick: () => { list.remove(); setDirty(true) } },
          { label: 'Save', onClick: () => { setSaved(rows.filter((r) => r.alias || r.account)); setDirty(false); setJustSaved(true) } },
          { label: 'Close', onClick: close },
        ]}
      />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3 }}>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          rowTutorialId={(r, i) => `host.mois.row.efax-${pbSlug(r.alias) || i}`}
          columns={COLUMNS.map((c) => ({
            key: c.key,
            header: c.header,
            width: c.width,
            render: (r: EfaxAccount, i: number) => (i === cur
              ? (
                <input
                  className="pb-field"
                  type={c.key === 'password' ? 'password' : 'text'}
                  value={r[c.key]}
                  onChange={(e) => edit(i, c.key, e.target.value)}
                  data-tutorial-id={`host.mois.field.efax-${pbSlug(c.header)}`}
                  style={{ width: '100%', border: 0, background: 'transparent', padding: 0 }}
                />
              )
              : c.key === 'password' ? '*'.repeat(Math.min(16, r.password.length)) : r[c.key]),
          }))}
          empty="No eFax accounts."
        />
      </div>
    </>
  )
}

registerFolderView(['ad-efax'], EfaxAccountsView)
