const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname)
const log = (icon, msg) => console.log(`${icon} ${msg}`)

// ── 1. layout.tsx ─────────────────────────────────────────────────────────────
;(function patchLayout() {
  const file = path.join(ROOT, 'app', 'layout.tsx')
  let src = fs.readFileSync(file, 'utf8')
  if (src.includes('posthog')) return log('~', 'layout.tsx: already patched')

  // Add Script import after first import line
  src = src.replace(/(import [^\n]+\n)/, `$1import Script from 'next/script'\n`)

  const snippet = `
      <Script id="posthog" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: \`
        !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]);t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}var u=e;for(var c=0;c<["capture","identify","alias","people.set","people.set_once","set","set_once","unset","increment","append","union","track_links","track_forms","track_pageview","register","register_once","unregister","reset","isFeatureEnabled","reloadFeatureFlags","group","resetGroups","startSessionRecording","stopSessionRecording"].length;c++)g(u,["capture","identify","alias","people.set","people.set_once","set","set_once","unset","increment","append","union","track_links","track_forms","track_pageview","register","register_once","unregister","reset","isFeatureEnabled","reloadFeatureFlags","group","resetGroups","startSessionRecording","stopSessionRecording"][c]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||(window.posthog=[]));
        posthog.init('phc_ABYwoFdJFXnSD5QZc25DivMHPULWCgGSyutHX7jia4VD',{api_host:'https://us.i.posthog.com',capture_pageview:true,autocapture:false,person_profiles:'identified_only'});
      \` }} />`

  if (src.includes('</body>')) {
    src = src.replace('</body>', snippet + '\n      </body>')
    fs.writeFileSync(file, src)
    log('✓', 'layout.tsx: PostHog snippet injected')
  } else {
    log('✗', 'layout.tsx: no </body> found — skipping')
  }
})()

// ── 2. AuthScreen.jsx ─────────────────────────────────────────────────────────
;(function patchAuth() {
  const file = path.join(ROOT, 'components', 'AuthScreen.jsx')
  let src = fs.readFileSync(file, 'utf8')
  if (src.includes('posthog')) return log('~', 'AuthScreen.jsx: already patched')

  let changed = false

  // signup_completed: after successful signUp call
  const signupPattern = /(\}\s*=\s*await supabase\.auth\.signUp\([^)]+\))([\s\S]{0,200}?)(if\s*\(!error\)\s*\{)/
  if (signupPattern.test(src)) {
    src = src.replace(signupPattern, (m, a, b, c) => {
      changed = true
      return a + b + c + `\n        window.posthog?.capture('signup_completed');`
    })
  }

  // signup_started: when user switches to signup mode
  src = src.replace(/(setMode|setView|setTab)\(['"]sign.?up['"]\)/g, m => {
    changed = true
    return `window.posthog?.capture('signup_started'); ${m}`
  })

  fs.writeFileSync(file, src)
  log(changed ? '✓' : '~', `AuthScreen.jsx: ${changed ? 'signup events added' : 'no patterns matched, check manually'}`)
})()

// ── 3. LandingPage.jsx ───────────────────────────────────────────────────────
;(function patchLanding() {
  const file = path.join(ROOT, 'components', 'LandingPage.jsx')
  let src = fs.readFileSync(file, 'utf8')
  if (src.includes('posthog')) return log('~', 'LandingPage.jsx: already patched')

  // Find onClick handlers on elements and prepend a posthog capture
  // Look for CTA-like onClick patterns (anything calling a setter or handler)
  let count = 0
  src = src.replace(/onClick=\{(\(\) => [^}]{5,100})\}/g, (match, fn) => {
    count++
    return `onClick={() => { window.posthog?.capture('cta_clicked', {fn: ${count}}); (${fn})(); }}`
  })

  fs.writeFileSync(file, src)
  log(count > 0 ? '✓' : '~', `LandingPage.jsx: ${count} onClick handlers wrapped with tracking`)
})()

console.log('\nDone! Now run: npm run build && git add . && git commit -m "feat: posthog analytics" && git push')
