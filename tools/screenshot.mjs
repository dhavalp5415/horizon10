/**
 * Capture Horizon10 screenshots for the docs / GitHub / LinkedIn.
 *
 * The app must be running (Start Horizon10.bat) at http://localhost:8000.
 * Run:  node tools/screenshot.mjs
 * Out:  docs/screenshots/*.png
 */
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'docs', 'screenshots')
const BASE = process.env.HORIZON_URL || 'http://localhost:8000'
const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

mkdirSync(OUT, { recursive: true })

/** page recipes: [file, path, settleMs, options] */
const SHOTS = [
  ['01-screener', '/', 5000, { full: false }],
  ['02-industries', '/industries', 5000, { full: false }],
  ['03-legend-lens', '/legends', 6000, { full: false }],
  ['04-multibaggers', '/multibaggers', 6000, { full: false }],
  ['05-round-table', '/roundtable', 6000, { full: false }],
  ['06-stock-overview', '/stock/CANFINHOME.NS', 8000, { full: false }],
  ['07-stock-legends', '/stock/CANFINHOME.NS', 8000, { full: false, scrollTo: 'What the legends say' }],
  ['08-stock-deepdive', '/stock/CANFINHOME.NS', 8000, { full: false, scrollTo: "Legends' Round Table" }],
  ['09-commodities', '/commodities', 7000, { full: false }],
  ['10-portfolio', '/portfolio', 5000, { full: false }],
  ['11-pulse', '/pulse', 4000, { full: false }],
  ['12-compare', '/compare', 4000, { full: false }],
  ['13-stock-full', '/stock/CANFINHOME.NS', 8000, { full: true }],
  ['14-guide', '/guide/', 2500, { full: false }],
  ['15-guide-full', '/guide/', 2500, { full: true, expandAll: true }],
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 2 },
  args: ['--hide-scrollbars', '--force-color-profile=srgb'],
})

const page = await browser.newPage()
page.setDefaultNavigationTimeout(120000)

for (const [name, path, settle, opts] of SHOTS) {
  try {
    await page.goto(BASE + path, { waitUntil: 'networkidle2' })
    await sleep(settle)

    if (opts.expandAll) {
      await page.evaluate(() =>
        document.querySelectorAll('details').forEach((d) => (d.open = true)))
      await sleep(600)
    }

    if (opts.scrollTo) {
      await page.evaluate((label) => {
        const el = [...document.querySelectorAll('h2, .font-semibold')]
          .find((n) => n.textContent?.includes(label))
        if (el) el.scrollIntoView({ block: 'start' })
      }, opts.scrollTo)
      await sleep(1200)
    }

    await page.screenshot({
      path: `${OUT}/${name}.png`,
      fullPage: !!opts.full,
    })
    console.log(`✓ ${name}.png`)
  } catch (e) {
    console.log(`✗ ${name}: ${String(e).slice(0, 120)}`)
  }
}

await browser.close()
console.log(`\nSaved to ${OUT}`)
