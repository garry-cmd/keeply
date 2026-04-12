const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, 'lib', 'pricing.js')
let src = fs.readFileSync(file, 'utf8')

// 1. Free tier equipment limit: 3 → 1
src = src.replace('equipment:    3,', 'equipment:    1,')

// 2. Free tier features: update equipment card text
src = src.replace('"3 equipment cards",', '"1 equipment card (Engine)",')

// 3. Free tier features: update repairs text (keep 3 repairs as-is, that's correct)
// Already correct per the file

// 4. Pro trial: null → 14
src = src.replace(
  'trial:        null,',
  'trial:        14,          // 14-day free trial'
)

// 5. Pro trialDays already set to 14 at top — remove the duplicate stray line
// It was added by the previous patch script at wrong position, clean it up
// Check if trialDays appears before the id field (wrong spot) and remove it
src = src.replace(/  pro: \{\n    trialDays: 14,\n/, '  pro: {\n')

fs.writeFileSync(file, src)
console.log('Done. Changes made:')
console.log('  ✓ free.equipment: 3 → 1')
console.log('  ✓ free.features: "3 equipment cards" → "1 equipment card (Engine)"')
console.log('  ✓ pro.trial: null → 14')
console.log('  ✓ removed stray trialDays line from pro block')
