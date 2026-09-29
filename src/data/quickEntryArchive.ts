/* ============================================================================
   Quick Entry export files on the learner's own disk: Import Records reads a
   real MOIS export and Export Records writes one.

   A MOIS export is `quick_entrys_<stamp>_<n>.7z` (unencrypted, LZMA) holding
   meta.xml and quick_entrys.xml (data/quickEntryXml.ts). The 7z handling is
   shared with every Designer Section export (data/moisExportArchive.ts).
   ========================================================================= */
import { buildExportArchive, readExportXml } from './moisExportArchive'
import { parseQuickEntryXml, quickEntryExportFiles, type QuickEntryFile, type QuickEntryFileHeader } from './quickEntryXml'
import type { QuickEntryTemplate } from './quickEntryTemplates'

export { exportHeader } from './moisExportXml'
export { saveBlob } from './moisExportArchive'

/** read a picked file — a MOIS export 7z, quick_entrys.xml or meta.xml */
export async function readQuickEntryFile(file: File, id?: (i: number) => string): Promise<QuickEntryFile> {
  return parseQuickEntryXml(await readExportXml(file, 'quick_entrys.xml', 'Quick Entry'), id)
}

/** build the export: the MOIS 7z when 7-Zip loads, else quick_entrys.xml */
export async function buildQuickEntryExport(templates: QuickEntryTemplate[], header: QuickEntryFileHeader, name: string): Promise<{ blob: Blob; name: string }> {
  return buildExportArchive(quickEntryExportFiles(templates, header), name)
}
