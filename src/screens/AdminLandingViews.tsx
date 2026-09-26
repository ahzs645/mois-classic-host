import { PBViewHeader } from '../pb'

/* ============================================================================
   Administration ▸ the section landing pages a folder node opens.

   PROVENANCE: user capture 2026-09-25 #48 (Designer Management) and #54
   (Clinic Management), v02.31.23. Both are the same PowerBuilder page: the
   navy view header, a light-blue sub-band repeating the caption in bold, a
   white strip ruled off underneath, then "These pages are used to manage:"
   and a two-column list of a bold term and a one-line description.

   Measured off the captures (normalised 1:1 off the tree's 16px folder
   pitch, which the captures draw at 18.4px): the term column is ~124px on
   Designer Management — narrow enough that "Measurement Inputs:" wraps onto
   a second line, as captured — and ~145px on Clinic Management; the rows
   sit ~45px apart.

   Designer Management lists nine of the eleven Designer Section children:
   Panel Setup and Quick Entry have no entry on the page (#48). Clinic
   Management lists nine of fourteen: Org Role List, Organization List,
   Service Groups/Pathways, Folder Registration and eFax Accounts have none
   (#54), and Computer Registration is called `Computer Reg.` there.
   ========================================================================= */

type Entry = { term: string; text: string }

const DESIGNER_MANAGEMENT: Entry[] = [
  { term: 'Concept Mapping:', text: 'Create and manage Concept Mapping.' },
  { term: 'Encounter Form:', text: 'Create and manage Encounter documentation forms.' },
  { term: 'Flowsheet:', text: 'Create and manage flowsheets.' },
  { term: 'Measurement Inputs:', text: 'Create and manage measurement templates.' },
  { term: 'Letter Templates:', text: 'Create and manage Letter Templates to be used for things like Mail Merge or attached to directly to a chart.' },
  { term: 'Paper (PDF) Forms:', text: 'Create and manage Paper Forms such as requisitions.' },
  { term: 'Care Plan Templates:', text: 'Create and manage Care Plan Templates used for controlling patient Care Plans.' },
  { term: 'Task Set Templates:', text: 'Create and manage Task Set Templates used for creating a set of Tasks and assigning them in the same instant.' },
  { term: 'Web Forms Admin:', text: 'View, enable, disable, and other admin functions of Web Forms.' },
]

const CLINIC_MANAGEMENT: Entry[] = [
  /* the two spaces after the full stop are the product's */
  { term: 'Provider List:', text: 'All providers within the clinic.  A single provider may have more than one profile.' },
  { term: 'Resource List:', text: 'All managed resources for the clinic.' },
  { term: 'Facility List:', text: 'All facilities and locations managed by the clinic.' },
  { term: 'Service Centers:', text: 'All service centers managed by the clinic.' },
  { term: 'Service Location:', text: 'Create and manage service locations which are associated to patient encounters.' },
  { term: 'Computer Reg.:', text: 'Create and manage computer configuration information such as default printers.' },
  { term: 'Global Reminders:', text: 'Rules based service manager for alerting the user during certain activities within the software.' },
  { term: 'Clinic Favourite Meds:', text: 'Create and manage clinic-wide favourite medications.' },
  { term: 'Immunization Inventory:', text: 'Create and manage an immunization inventory to be used in the MAR.' },
]

export const ADMIN_LANDINGS: Record<string, { title: string; termW: number; entries: Entry[] }> = {
  'ad-designer': { title: 'Designer Management', termW: 124, entries: DESIGNER_MANAGEMENT },
  'ad-clinic-mgt': { title: 'Clinic Management', termW: 145, entries: CLINIC_MANAGEMENT },
}

export function AdminLanding({ node }: { node: string }) {
  const page = ADMIN_LANDINGS[node]
  if (!page) return null
  return (
    <>
      <PBViewHeader title={page.title} />
      {/* the light-blue sub-band repeating the caption, bold */}
      <div style={{ background: 'linear-gradient(#e4edfa, #ccdcf3)', padding: '8px 10px', fontWeight: 700, flex: 'none' }}>
        {page.title}
      </div>
      <div style={{ height: 32, background: 'white', borderBottom: '1px solid #666', flex: 'none' }} />
      <div style={{ background: 'white', flex: 1, minHeight: 0, overflow: 'auto', padding: '8px 18px' }}>
        <p style={{ margin: '6px 0 16px' }}>These pages are used to manage:</p>
        <dl style={{ display: 'grid', gridTemplateColumns: `${page.termW}px 1fr`, gap: '30px 8px', padding: '0 20px', margin: 0 }}>
          {page.entries.map((e) => (
            <div key={e.term} style={{ display: 'contents' }}>
              <dt style={{ fontWeight: 700 }}>{e.term}</dt>
              <dd style={{ margin: 0 }}>{e.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  )
}
