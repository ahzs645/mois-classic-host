/* ============================================================================
   Quick Entry export files on the learner's own disk: Import Records reads a
   real MOIS export and Export Records writes one.

   A MOIS export is `quick_entrys_<stamp>_<n>.7z` (unencrypted, LZMA) holding
   meta.xml and quick_entrys.xml (data/quickEntryXml.ts). Import takes the 7z
   or either XML file on its own; Export writes the 7z, or — where the 7-Zip
   runtime cannot load — quick_entrys.xml, which Import reads back the same.

   The 7-Zip runtime is 7z-wasm's UMD build, which the Webforms app already
   serves for chart exports (public/vendor/7z-wasm/, lib/client-mois-test-
   chart.ts). It is loaded on first use, from under the page's own base path;
   a standalone build without it still imports and exports XML.
   ========================================================================= */
import {
  QuickEntryFileError, decodeLatin1, encodeLatin1, parseQuickEntryXml, quickEntryExportFiles,
  type QuickEntryFile, type QuickEntryFileHeader,
} from './quickEntryXml'
import type { QuickEntryTemplate } from './quickEntryTemplates'

type SevenZipModule = {
  FS: {
    writeFile(path: string, data: Uint8Array): void
    readFile(path: string): Uint8Array
    readdir(path: string): string[]
    mkdir(path: string): void
  }
  callMain(args: string[]): number
}
type SevenZipFactory = (options?: {
  print?: (line: string) => void
  printErr?: (line: string) => void
  locateFile?: (url: string) => string
}) => Promise<SevenZipModule>

/** the app's base path: whatever prefixes its own /_next/ scripts */
function basePath(): string {
  if (typeof document === 'undefined') return ''
  for (const s of Array.from(document.scripts)) {
    const at = s.src.indexOf('/_next/')
    if (at >= 0) return new URL(s.src).pathname.slice(0, new URL(s.src).pathname.indexOf('/_next/'))
  }
  return ''
}

let runtime: Promise<SevenZipFactory> | null = null
function loadSevenZip(): Promise<SevenZipFactory> {
  const w = window as unknown as { SevenZip?: SevenZipFactory }
  if (w.SevenZip) return Promise.resolve(w.SevenZip)
  runtime ??= new Promise<SevenZipFactory>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${basePath()}/vendor/7z-wasm/7zz.umd.js`
    script.async = true
    script.onload = () => (w.SevenZip ? resolve(w.SevenZip) : reject(new Error('7-Zip did not initialize.')))
    script.onerror = () => { runtime = null; reject(new Error('The 7-Zip runtime is not available here.')) }
    document.head.appendChild(script)
  })
  return runtime
}

async function sevenZip(): Promise<SevenZipModule> {
  const create = await loadSevenZip()
  return create({
    print: () => undefined,
    printErr: () => undefined,
    locateFile: (url) => (url.endsWith('.wasm') ? `${basePath()}/vendor/7z-wasm/7zz.wasm` : url),
  })
}

/** the XML inside a 7z export: quick_entrys.xml, else meta.xml */
async function xmlFrom7z(bytes: Uint8Array): Promise<string> {
  const z = await sevenZip()
  z.FS.writeFile('in.7z', bytes)
  z.FS.mkdir('out')
  /* -p with no password: an encrypted archive fails instead of prompting */
  if (z.callMain(['x', 'in.7z', '-oout', '-y', '-p']) !== 0) {
    throw new QuickEntryFileError('This 7z could not be opened. Is it a MOIS Quick Entry export?')
  }
  const names = z.FS.readdir('out')
  const pick = names.find((n) => n.toLowerCase() === 'quick_entrys.xml') ?? names.find((n) => n.toLowerCase() === 'meta.xml')
  if (!pick) throw new QuickEntryFileError('This 7z holds no quick_entrys.xml or meta.xml.')
  return decodeLatin1(z.FS.readFile(`out/${pick}`))
}

/** read a picked file — a MOIS export 7z, quick_entrys.xml or meta.xml */
export async function readQuickEntryFile(file: File, id?: (i: number) => string): Promise<QuickEntryFile> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const is7z = bytes[0] === 0x37 && bytes[1] === 0x7a && bytes[2] === 0xbc && bytes[3] === 0xaf
  let xml: string
  if (is7z) {
    try { xml = await xmlFrom7z(bytes) } catch (e) {
      if (e instanceof QuickEntryFileError) throw e
      throw new QuickEntryFileError(`${(e as Error).message} Open the quick_entrys.xml inside the 7z instead.`)
    }
  } else {
    xml = decodeLatin1(bytes)
  }
  return parseQuickEntryXml(xml, id)
}

/** the header an Export stamps: the site's own, at the session's clock */
export function exportHeader(site: QuickEntryFileHeader, contact: string, now = new Date()): QuickEntryFileHeader {
  const p = (n: number) => String(n).padStart(2, '0')
  return {
    ...site,
    date: `${now.getFullYear()}/${p(now.getMonth() + 1)}/${p(now.getDate())}`,
    time: `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`,
    contact,
  }
}

/** build the export: the MOIS 7z when 7-Zip loads, else quick_entrys.xml */
export async function buildQuickEntryExport(templates: QuickEntryTemplate[], header: QuickEntryFileHeader, name: string): Promise<{ blob: Blob; name: string }> {
  const files = quickEntryExportFiles(templates, header)
  try {
    const z = await sevenZip()
    /* written at the root so the archive holds the two names flat, as MOIS's does */
    for (const f of files) z.FS.writeFile(f.name, encodeLatin1(f.text))
    if (z.callMain(['a', '-t7z', '-m0=lzma', 'out.7z', ...files.map((f) => f.name)]) !== 0) throw new Error('7-Zip failed')
    const bytes = z.FS.readFile('out.7z')
    return { blob: new Blob([bytes.slice()], { type: 'application/x-7z-compressed' }), name: name.replace(/\.7z$/i, '') + '.7z' }
  } catch {
    const xml = files.find((f) => f.name === 'quick_entrys.xml')!
    return { blob: new Blob([encodeLatin1(xml.text).slice()], { type: 'application/xml' }), name: name.replace(/\.7z$/i, '') + '.xml' }
  }
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
