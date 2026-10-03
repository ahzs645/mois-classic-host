#!/usr/bin/env node
/* How much of the MOIS Data Dictionary the stage can answer Ctrl+Shift+A for.

     node scripts/data-dictionary-coverage.mjs [--url http://localhost:5180/] [--json out.json]
       [--charts 3924,87288,2429,3598] [--nodes imaging,mar]   (a quick partial run)

   Needs the dev server (pnpm dev) and Playwright from the webforms root, like
   scripts/fidelity/shot.mjs. For every navigator node the dictionary has rows
   under, it opens the node, then every tab of the work area (and the tabs
   inside those), and asks host/field-audit.ts about every control on screen —
   each form control, and each grid column by its first cell or its header.
   That is exactly the lookup Ctrl+Shift+A makes. It does so once per chart in
   --charts, since a folder draws its detail fields only for a record, and a
   row counts as reached on any of them.

   Writes docs/data-dictionary-coverage.md:
   - per node, how many dictionary rows a control on screen resolves to;
   - the dictionary rows no control resolved to (missing on the stage, or a
     caption that does not match — the place to add a `data-mois-audit-id`);
   - captions on screen the dictionary has no row for under that node;
   - lookups that were ambiguous (two rows, different storage, same score).
   The pop-out windows in OPENERS are opened and walked the same way. */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '../../../node_modules/@playwright/test/index.mjs'

const args = process.argv.slice(2)
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d }
const url = opt('url', 'http://localhost:5180/')
const charts = opt('charts', '3924,87288,2429,3598').split(',').filter(Boolean)
const onlyNodes = opt('nodes')?.split(',').filter(Boolean)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
/* a control that never arrives fails the step, not the run */
page.setDefaultTimeout(5000)
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.goto(`${url}?scale=100`)
await page.waitForTimeout(1200)

/* the dictionary and the lookup, from the same modules the frame runs */
const nodes = await page.evaluate(async () => {
  const dd = await import('/src/data/dataDictionary.ts')
  const byNode = {}
  for (const entry of dd.DATA_DICTIONARY) {
    const node = dd.entryNode(entry) ?? '(no node)'
    ;(byNode[node] ??= []).push(entry.id)
  }
  return byNode
})

async function dismiss() {
  for (let i = 0; i < 3; i += 1) {
    const layer = page.locator('.pb-modal-layer').last()
    if (!(await layer.count())) return
    const button = layer.locator('button', { hasText: /^(Close|OK|Ok|Cancel|No)$/ }).first()
    if (await button.count()) await button.click({ timeout: 1000 }).catch(() => {})
    else await page.keyboard.press('Escape')
    await page.waitForTimeout(150)
  }
}

/** Resolve every control on screen; returns per-control results. */
const scan = (node) => page.evaluate(async (node) => {
  const fa = await import('/src/host/field-audit.ts')
  const area = document.querySelector('[data-tutorial-id="host.mois.workarea"]') ?? document.body
  const desktop = document.querySelector('.pb-desktop') ?? document.body
  /* the work area, and any window raised over the frame */
  const scopes = [area, ...desktop.querySelectorAll(':scope > .pb-modal-layer, :scope .pb-window--child')]
  const seen = new Set()
  const out = []
  for (const scope of scopes) {
    for (const el of fa.auditableControls(scope)) {
      if (seen.has(el)) continue
      seen.add(el)
      if (!(el.offsetParent || el.getClientRects().length)) continue
      const t = fa.describeAuditTarget(el, node)
      out.push({
        caption: t.context.caption, tabs: t.context.tabs, window: t.context.window ?? '',
        grid: !!t.context.gridCell, entry: t.entry?.id ?? '', via: t.via ?? '', ambiguous: !!t.ambiguous,
      })
    }
  }
  return out
}, node)

/** Click every tab of every strip reachable in `scope` (a CSS selector: the
    work area, or the window an opener raised), depth first. In the work area
    a box a tab raises is dismissed; inside a raised window nothing is. */
async function walkTabs(node, results, scope = AREA, depth = 0, path = []) {
  results.push(...await scan(node))
  if (depth > 2) return
  const strips = await page.evaluate(({ scope, path }) => {
    const root = document.querySelector(scope)
    if (!root) return []
    /* strips at this depth of the tab path — PBTabs' and the strips a few
       windows draw by hand (Goals, Care Plan) alike */
    return [...root.querySelectorAll('.pb-tabs__strip')].map((strip, i) => {
      let level = 0
      for (let p = strip.parentElement?.closest('.pb-tabs__page'); p && root.contains(p); p = p.parentElement?.closest('.pb-tabs__page')) level += 1
      return { i, level, tabs: [...strip.querySelectorAll(':scope > .pb-tabs__tab:not(:disabled)')].map((t) => t.textContent.trim()) }
    }).filter((s) => s.level === path.length)
  }, { scope, path })
  for (const strip of strips) {
    for (const tab of strip.tabs) {
      const button = page.locator(`${scope} .pb-tabs__strip`).nth(strip.i)
        .locator(':scope > .pb-tabs__tab', { hasText: tab }).first()
      if (!(await button.count())) continue
      await button.click({ timeout: 2000 }).catch(() => {})
      await page.waitForTimeout(250)
      if (scope === AREA) await dismiss()
      await walkTabs(node, results, scope, depth + 1, [...path, tab])
    }
  }
}

const AREA = '[data-tutorial-id="host.mois.workarea"]'
const RAISED = '[data-dd-raised]'

/* The pop-out windows the workbook files fields under, and how a learner
   opens each: a tab first, the first row made current, then a button by its
   command anchor — or a double-click on the row (an encounter's MDI window),
   or a list of `steps` (click by text or selector, press an anchor).
   `inPlace` openers raise no window: a folder none of the crawled charts has a
   record in draws its Report / Detail pages blank, as MOIS does, so New Record
   adds the unsaved row the field audit itself used to reach them, and the
   work area is walked again. */
const OPENERS = {
  demographic: [
    { tab: 'Demographics', press: 'host.mois.command.gender-designations' },
    { tab: 'Benefits', row: true, press: 'host.mois.command.edit-benefit' },
  ],
  determinants: ['Employment', 'Education', 'Housing', 'Socioeconomic']
    .map((tab) => ({ tab, press: 'host.mois.command.determinants-update' })),
  encounters: [{ open: true }],
  mar: [{ steps: [
    { text: 'Expand All' },
    { click: '[data-tutorial-id^="host.mois.row.mar-"]:not([data-tutorial-id^="host.mois.row.mar-order"]):not([data-tutorial-id^="host.mois.row.mar-grid"])' },
    { press: 'host.mois.command.open-record' },
  ] }],
  imaging: [{ inPlace: true, press: 'host.mois.command.new-record' }],
  procedures: [{ inPlace: true, press: 'host.mois.command.new-record' }],
  admissions: [{ inPlace: true, press: 'host.mois.command.new-record' }],
  goals: [{ press: 'host.mois.command.new-record' }],
}

async function openRaised(opener) {
  for (const step of opener.steps ?? []) {
    const target = step.text ? page.locator(AREA).getByText(step.text, { exact: true }).first()
      : step.click ? page.locator(step.click).first()
        : page.locator(`[data-tutorial-id="${step.press}"]`).first()
    if (!(await target.count())) return false
    await target.click({ timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(400)
  }
  if (opener.steps) return markRaised()
  if (opener.tab) {
    await page.locator(`${AREA} .pb-tabs__tab`, { hasText: opener.tab }).first().click({ timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(300)
  }
  const firstRow = page.locator(`${AREA} .pb-dw tbody tr`).filter({ has: page.locator('td:not(.pb-dw__gutter)') }).first()
  if (opener.row || opener.open) {
    if (!(await firstRow.count())) return false
    await firstRow.dispatchEvent('mousedown')
    await page.waitForTimeout(200)
  }
  if (opener.open) await firstRow.dblclick({ timeout: 2000 }).catch(() => {})
  if (opener.press) {
    const button = page.locator(`[data-tutorial-id="${opener.press}"]`).first()
    if (!(await button.count()) || await button.isDisabled()) return false
    await button.click({ timeout: 2000 }).catch(() => {})
  }
  await page.waitForTimeout(700)
  if (opener.inPlace) return 'area'
  return markRaised()
}

/* mark the topmost window raised over the frame as the scope */
function markRaised() {
  return page.evaluate(() => {
    const modal = [...document.querySelectorAll('.pb-modal-layer .pb-window')].at(-1)
    const child = [...document.querySelectorAll('.pb-window--child')].filter((w) => !w.closest('.pb-modal-layer')).at(-1)
    const win = modal ?? child
    if (!win) return false
    win.setAttribute('data-dd-raised', '')
    return true
  })
}

async function closeRaised() {
  await page.evaluate(() => {
    const win = document.querySelector('[data-dd-raised]')
    win?.removeAttribute('data-dd-raised')
    const close = win?.querySelector(':scope > .pb-titlebar button[title="Close"], :scope > .pb-titlebar .pb-titlebar__btn:last-child')
    close?.click()
  })
  await page.waitForTimeout(300)
  await dismiss()
}

/* open a chart through Go To Chart… and the Advanced Lookup Service */
async function openChart(chart) {
  await dismiss()
  await page.locator('[data-tutorial-id="host.mois.module.chart"]').first().click().catch(() => {})
  await page.waitForTimeout(300)
  await dismiss()
  await page.getByText(/Go To Chart/).first().click()
  await page.waitForTimeout(400)
  await page.locator('.pb-modal-layer td', { hasText: new RegExp(`^${chart}$`) }).first().dblclick({ timeout: 5000 })
  await page.waitForTimeout(1200)
  await dismiss()
}

const report = {}
for (const chart of charts) {
try { await openChart(chart) } catch { console.error(`chart ${chart}: could not be opened`); continue }
for (const node of Object.keys(nodes).filter((n) => n !== '(no node)' && (!onlyNodes || onlyNodes.includes(n)))) {
  await dismiss()
  const anchor = page.locator(`[data-tutorial-id="host.mois.tree.${node}"]`).first()
  if (!(await anchor.count())) {
    /* switch module through the module bar, then try again */
    const module = node.startsWith('p-') || node.startsWith('r-') || node.startsWith('w-') || node === 'group' ? 'scheduler' : 'chart'
    await page.locator(`[data-tutorial-id="host.mois.module.${module}"]`).first().click().catch(() => {})
    await page.waitForTimeout(400)
    await dismiss()
  }
  const target = page.locator(`[data-tutorial-id="host.mois.tree.${node}"]`).first()
  if (!(await target.count())) { report[node] ??= { error: 'node not in the navigator', controls: [] }; continue }
  await target.click()
  await page.waitForTimeout(700)
  await dismiss()
  const controls = []
  await walkTabs(node, controls)
  for (const opener of OPENERS[node] ?? []) {
    try {
      const opened = await openRaised(opener)
      if (opened === 'area') {
        await walkTabs(node, controls)
        await dismiss()
      } else if (opened) {
        await walkTabs(node, controls, RAISED)
        await closeRaised()
      }
    } catch (error) {
      console.error(`  ${chart} ${node}: opener ${JSON.stringify(opener)} failed — ${error.message.split('\n')[0]}`)
      await closeRaised().catch(() => {})
    }
  }
  report[node] = { controls: [...(report[node]?.controls ?? []), ...controls] }
  console.error(`  ${chart} ${node}: ${controls.filter((c) => c.entry).length}/${controls.length} controls resolved`)
}
console.error(`chart ${chart}: done`)
}
await browser.close()

/* --- the report ---------------------------------------------------------- */
const detail = await (async () => {
  const b = await chromium.launch()
  const p = await b.newPage()
  await p.goto(`${url}?scale=100`)
  const entries = await p.evaluate(async () => {
    const dd = await import('/src/data/dataDictionary.ts')
    return dd.DATA_DICTIONARY.map((e) => ({ id: e.id, at: e.at, status: e.status, audit: e.audit, verified: !!e.verified, node: dd.entryNode(e) ?? '' }))
  })
  await b.close()
  return new Map(entries.map((e) => [e.id, e]))
})()

const where = (e) => [e.at.tab, e.at.subTab, e.at.popOutWindow, e.at.popOutWindowTab, e.at.fieldHeading].filter(Boolean).join(' › ')
const lines = []
let totalRows = 0, totalReached = 0, totalVerified = 0, totalVerifiedReached = 0
const sections = []
for (const [node, ids] of Object.entries(nodes).filter(([n]) => !onlyNodes || onlyNodes.includes(n))) {
  const r = report[node] ?? { controls: [] }
  const reached = new Set(r.controls.filter((c) => c.entry).map((c) => c.entry))
  const verified = ids.filter((id) => detail.get(id)?.verified)
  totalRows += ids.length
  totalReached += ids.filter((id) => reached.has(id)).length
  totalVerified += verified.length
  totalVerifiedReached += verified.filter((id) => reached.has(id)).length
  const missing = ids.filter((id) => !reached.has(id)).map((id) => detail.get(id))
  const strays = [...new Set(r.controls.filter((c) => !c.entry && c.caption).map((c) => `${c.tabs.join(' › ') || '—'}: ${c.caption}`))]
  const ambiguous = [...new Set(r.controls.filter((c) => c.ambiguous).map((c) => `${c.caption} → ${c.entry}`))]
  sections.push({ node, ids, reached, verified, missing, strays, ambiguous, error: r.error })
}

lines.push('# MOIS Data Dictionary — Ctrl+Shift+A coverage', '')
lines.push('Generated by `node scripts/data-dictionary-coverage.mjs` against the dev server. Each row of the')
lines.push('dictionary (`src/data/dataDictionary.generated.ts`) counts as reached when a control on the stage')
lines.push('resolves to it the way Ctrl+Shift+A does (`src/host/field-audit.ts`), on any of the crawled charts.')
lines.push('The pop-out windows the script knows how to open (its `OPENERS`) are walked too. Regenerate after')
lines.push('changing a screen or the dictionary.', '')
lines.push(`**${totalReached} of ${totalRows}** dictionary rows reached; **${totalVerifiedReached} of ${totalVerified}** of the rows MOIS verified a column for.`, '')
lines.push('| Node | Rows | Reached | Verified rows | Verified reached |', '| --- | ---: | ---: | ---: | ---: |')
for (const s of sections) {
  lines.push(`| \`${s.node}\`${s.error ? ` (${s.error})` : ''} | ${s.ids.length} | ${s.ids.filter((id) => s.reached.has(id)).length} | ${s.verified.length} | ${s.verified.filter((id) => s.reached.has(id)).length} |`)
}
lines.push('')
for (const s of sections) {
  if (!s.missing.length && !s.strays.length && !s.ambiguous.length) continue
  lines.push(`## \`${s.node}\``, '')
  if (s.missing.length) {
    lines.push(`Unreached rows (${s.missing.length}):`, '')
    for (const e of s.missing) lines.push(`- \`${e.id}\` ${where(e) ? `${where(e)} › ` : ''}**${e.at.field}** — ${e.status}${e.verified ? ', verified' : ''}`)
    lines.push('')
  }
  if (s.ambiguous.length) {
    lines.push('Ambiguous lookups:', '')
    for (const a of s.ambiguous) lines.push(`- ${a}`)
    lines.push('')
  }
  if (s.strays.length) {
    lines.push(`Captions on screen with no row (${s.strays.length}):`, '')
    lines.push(s.strays.map((c) => `\`${c}\``).join(' · '), '')
  }
}
if (errors.length) lines.push('## Page errors', '', ...errors.map((e) => `- ${e}`), '')
/* a partial run prints its numbers but leaves the full report alone */
if (!onlyNodes) writeFileSync(join(root, 'docs', 'data-dictionary-coverage.md'), `${lines.join('\n')}\n`)
else for (const s of sections) console.log(`${s.node}: ${s.ids.filter((id) => s.reached.has(id)).length}/${s.ids.length} rows, ${s.verified.filter((id) => s.reached.has(id)).length}/${s.verified.length} verified`)
const json = opt('json')
if (json) writeFileSync(json, JSON.stringify({ report, nodes }, null, 1))
console.log(`reached ${totalReached}/${totalRows} rows (${totalVerifiedReached}/${totalVerified} verified)${onlyNodes ? ' — partial run, report left alone' : ' — wrote docs/data-dictionary-coverage.md'}`)
