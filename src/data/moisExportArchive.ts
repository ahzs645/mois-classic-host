/* ============================================================================
   MOIS export files on the learner's own disk: an Import reads a real MOIS
   export and an Export writes one (data/moisExportXml.ts is the format).

   A MOIS export is `<prefix>_<stamp>_<n>.7z` (unencrypted, LZMA) holding
   meta.xml and the full XML (quick_entrys.xml, concepts.xml, …). Import takes
   the 7z or either XML file on its own; Export writes the 7z, or — where the
   7-Zip runtime cannot load — the full XML, which Import reads back the same.

   The 7-Zip runtime is 7z-wasm's UMD build, which the Webforms app already
   serves for chart exports (public/vendor/7z-wasm/, lib/client-mois-test-
   chart.ts). It is loaded on first use, from under the page's own base path;
   a standalone build without it still imports and exports XML.
   ========================================================================= */
import { MoisExportFileError, decodeLatin1, encodeLatin1 } from './moisExportXml'

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

export const is7z = (bytes: Uint8Array) => bytes[0] === 0x37 && bytes[1] === 0x7a && bytes[2] === 0xbc && bytes[3] === 0xaf

/** the XML inside a 7z export: `full` (e.g. concepts.xml), else meta.xml */
async function xmlFrom7z(bytes: Uint8Array, full: string, what: string): Promise<string> {
  const z = await sevenZip()
  z.FS.writeFile('in.7z', bytes)
  z.FS.mkdir('out')
  /* -p with no password: an encrypted archive fails instead of prompting */
  if (z.callMain(['x', 'in.7z', '-oout', '-y', '-p']) !== 0) {
    throw new MoisExportFileError(`This 7z could not be opened. Is it a MOIS ${what} export?`)
  }
  const names = z.FS.readdir('out')
  const pick = names.find((n) => n.toLowerCase() === full) ?? names.find((n) => n.toLowerCase() === 'meta.xml')
  if (!pick) throw new MoisExportFileError(`This 7z holds no ${full} or meta.xml.`)
  return decodeLatin1(z.FS.readFile(`out/${pick}`))
}

/** the XML of a picked file — a MOIS export 7z, its full XML or meta.xml */
export async function readExportXml(file: File, full: string, what: string): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!is7z(bytes)) return decodeLatin1(bytes)
  try { return await xmlFrom7z(bytes, full, what) } catch (e) {
    if (e instanceof MoisExportFileError) throw e
    throw new MoisExportFileError(`${(e as Error).message} Open the ${full} inside the 7z instead.`)
  }
}

/** build the export: the MOIS 7z when 7-Zip loads, else the full XML (the
    last of `files`) */
export async function buildExportArchive(files: { name: string; text: string }[], name: string): Promise<{ blob: Blob; name: string }> {
  const stem = name.replace(/\.(7z|xml)$/i, '')
  try {
    const z = await sevenZip()
    /* written at the root so the archive holds the names flat, as MOIS's does */
    for (const f of files) z.FS.writeFile(f.name, encodeLatin1(f.text))
    if (z.callMain(['a', '-t7z', '-m0=lzma', 'out.7z', ...files.map((f) => f.name)]) !== 0) throw new Error('7-Zip failed')
    const bytes = z.FS.readFile('out.7z')
    return { blob: new Blob([bytes.slice()], { type: 'application/x-7z-compressed' }), name: `${stem}.7z` }
  } catch {
    const xml = files[files.length - 1]!
    return { blob: new Blob([encodeLatin1(xml.text).slice()], { type: 'application/xml' }), name: `${stem}.xml` }
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
