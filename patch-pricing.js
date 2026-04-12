const fs = require('fs')
const path = require('path')
const ROOT = path.resolve(__dirname)
const log = (icon, msg) => console.log(`${icon} ${msg}`)

// ── 1. lib/pricing.js ─────────────────────────────────────────────────────────
;(function patchPricing() {
  const file = path.join(ROOT, 'lib', 'pricing.js')
  if (!fs.existsSync(file)) return log('✗', 'lib/pricing.js not found')

  let src = fs.readFileSync(file, 'utf8')
  const orig = src

  // Free tier: equipment limit 3 → 1
  src = src.replace(
    /(\bbasic\b[\s\S]{0,300}?equipment[_]?[Cc]ards?\s*[:=]\s*)3/i,
    '$11'
  )
  src = src.replace(
    /(\bfree\b[\s\S]{0,300}?equipment[_]?[Cc]ards?\s*[:=]\s*)3/i,
    '$11'
  )
  // Generic fallback: maxEquipment: 3 → 1 near 'basic' or 'free'
  src = src.replace(
    /(maxEquipment\s*:\s*)3/g,
    '$11'
  )
  src = src.replace(
    /(equipmentLimit\s*:\s*)3/g,
    '$11'
  )

  // Pro trial: add trialDays: 14 if not present on pro tier
  src = src.replace(
    /(\bpro\b[\s\S]{0,500}?)(trialDays\s*:\s*\d+)/i,
    (m, before, trial) => before + 'trialDays: 14'
  )
  // If pro tier doesn't have trialDays at all, add it
  if (!/pro[\s\S]{0,300}trialDays/i.test(src)) {
    src = src.replace(
      /(\bpro\b[\s\S]{0,20}?\{)/i,
      '$1\n    trialDays: 14,'
    )
  }

  if (src !== orig) {
    fs.writeFileSync(file, src)
    log('✓', 'lib/pricing.js patched')
  } else {
    log('~', 'lib/pricing.js: no pattern matches — printing file so we can check manually')
    console.log('\n--- pricing.js content ---')
    console.log(src.slice(0, 3000))
  }
})()

// ── 2. LandingPage.jsx ────────────────────────────────────────────────────────
;(function patchLanding() {
  const file = path.join(ROOT, 'components', 'LandingPage.jsx')
  if (!fs.existsSync(file)) return log('✗', 'LandingPage.jsx not found')

  let src = fs.readFileSync(file, 'utf8')
  const orig = src

  // Free tier display: "3 equipment" → "1 equipment (Engine)"
  src = src.replace(
    /3\s*[Ee]quipment\s*[Cc]ards?/g,
    '1 Equipment Card (Engine)'
  )
  src = src.replace(
    /Up to 3 equipment/gi,
    'Up to 1 equipment'
  )
  src = src.replace(
    /3 equipment items/gi,
    '1 equipment card (Engine)'
  )

  // Pro trial: find Pro plan display and add trial badge
  // Look for Pro price display and add "14-day free trial" nearby
  src = src.replace(
    /(Pro[\s\S]{0,100}?\$25[\s\S]{0,200}?)(\/mo|per month)/i,
    '$1$2'
  )

  // Add 14-day trial text near Pro if not there
  if (!/pro[\s\S]{0,500}14.day/i.test(src)) {
    src = src.replace(
      /(\$25\s*\/\s*mo[\s\S]{0,100}?)(Pro Annual|\$240)/i,
      '$1\n              14-day free trial · $2'
    )
  }

  if (src !== orig) {
    fs.writeFileSync(file, src)
    log('✓', 'LandingPage.jsx patched')
  } else {
    log('~', 'LandingPage.jsx: no matches — printing pricing section so we can check')
    // Find and print the pricing section
    const idx = src.indexOf('pricing') !== -1 ? src.indexOf('pricing') :
                 src.indexOf('Pricing') !== -1 ? src.indexOf('Pricing') : 0
    console.log('\n--- LandingPage pricing section ---')
    console.log(src.slice(Math.max(0, idx - 100), idx + 3000))
  }
})()

log('', '\nDone. Check output above — if patterns matched, run: npm run build && git add . && git commit -m "feat: free tier 1 equipment card, pro trial" && git push')
