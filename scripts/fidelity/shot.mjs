#!/usr/bin/env node
/* Screenshot the emulator's window at the captures' scale (2x).

     node scripts/fidelity/shot.mjs --chart 2429 --node Conditions --scale 200 --out /tmp/ours.png
       [--url http://localhost:5180/] [--click "Detail"]...

   Needs the dev server (pnpm dev) and Playwright from the webforms root. The
   window is screenshotted edge to edge, so it lines up with a capture of the
   MOIS window taken at 200% Windows scaling. */
import { chromium } from '../../../../node_modules/@playwright/test/index.mjs'

const args = process.argv.slice(2)
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d }
const clicks = args.flatMap((a, i) => (a === '--click' ? [args[i + 1]] : []))
const url = opt('url', 'http://localhost:5180/')
const scale = opt('scale', '200')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1120, height: 840 }, deviceScaleFactor: 2 })
await page.goto(`${url}?scale=${scale}`)
await page.waitForTimeout(800)
await page.locator('.pb-opening-reminder-layer').getByText('Close', { exact: true }).click().catch(() => {})
const chart = opt('chart')
if (chart) {
  await page.getByText(/Go To Chart/).first().click(); await page.waitForTimeout(300)
  await page.locator('td', { hasText: new RegExp(`^${chart}$`) }).first().dblclick(); await page.waitForTimeout(800)
  for (const t of ['Close', 'OK', 'Ok']) {
    const b = page.locator('.pb-modal-layer').getByText(t, { exact: true })
    if (await b.count()) await b.first().click().catch(() => {})
  }
}
const node = opt('node')
if (node) { await page.getByText(node, { exact: true }).first().click(); await page.waitForTimeout(500) }
for (const c of clicks) { await page.getByText(c, { exact: true }).first().click(); await page.waitForTimeout(300) }
await page.locator('.pb-desktop > .pb-window').first().screenshot({ path: opt('out', 'ours.png') })
console.log(`wrote ${opt('out', 'ours.png')}`)
await browser.close()
