# Keeply — Context

**Updated:** April 21, 2026  
**Phase:** Beta → Pre-Launch (GoLive imminent)  
**Founder:** Garry Hoffman (solo) · Co-owner: Marty (20%, community/social OKR)  
**Target:** $5K MRR to quit day job

---

## Strategic frame

Keeply is a **vessel intelligence platform**, not a maintenance app.  
The app UI is a read-only dashboard; **First Mate is the primary interaction layer.**  
Copy rule: never use "sailors" — always "boaters."

---

## Current state (Apr 21, 2026)

- **5 active beta testers** (3 Active Cruisers, 2 Liveaboards, 0 Upgraders). +2 imminent (1 Cruiser, 1 Liveaboard) → 4/3/0 split.
- **Biggest OKR risk:** 0/5 testers have completed the structured task plan. Worth sending re-engagement note now that signup friction is gone.
- **1/3 personas validated** (Upgrader still unvalidated — gap in cohort)
- **iOS/Android:** DUNS in hand, Google Play account in flight, iOS build pending
- **Apr 21 session wins:** Tier 1 hygiene complete (error boundaries + PostHog exceptions + Prettier). Beta feedback from first personal run-through closed: onboarding urgent task, First Mate formatting, feedback copy, and biggest activation win — **email verification no longer blocks signup.** Users land in the app immediately.

---

## What's shipped

**Core product**
- Equipment cards (with docs, service logs, status)
- Maintenance tasks with urgency panels
- Repairs tracker
- Documentation (registration, insurance, renewals)
- Multi-vessel support + share vessel
- Context-aware FAB per tab
- Push notifications
- Admin dashboard at `/admin` (whitelist-gated on `garry@keeply.boats` + user-ID allowlist in Vercel env)
- OKR/roadmap page at `/admin/okr` with feature backlog

**Platform**
- Supabase auth + RLS
- Database-driven pricing (live tuning via `/admin/pricing`, no redeploy)
- Stripe subscriptions, webhooks, customer portal
- Resend transactional email
- **Frictionless signup** — "Confirm email" gate OFF in Supabase (Apr 21); users land in app immediately. "Secure email change" ON for account-change protection. Branded confirmation email template ships from `Keeply <noreply@keeply.boats>` (used for explicit resend, password reset, email-change verify).
- Weekly digest cron (Mon 10:00 UTC / 6 AM ET)
- PostHog, GA4, Search Console, Google Ads, Microsoft Clarity
- **PostHog exception capture** (Apr 21) — `capture_exceptions: true` + `trackException` helper wired into route + global error boundaries
- SEO: sitemap, robots.txt, JSON-LD
- 14-day Standard trial

**Stability (Apr 21)**
- Route-level error boundary (`app/error.tsx`) — "Something went aground" with Retry
- Global error boundary (`app/global-error.tsx`) — catches root-layout crashes with inline dark-mode styles
- Prettier config + entire repo formatted; dead `KeeplyApp.stripped.jsx` removed

**Onboarding polish (Apr 21)**
- "Complete your vessel setup" synthetic maintenance task auto-created on signup (both free + paid AI-build paths). Lands in Due Soon urgent card. Interval 36,500 days so completion doesn't resurface.
- First Mate explicit formatting rules in system prompt — no markdown, plain dash lists, 1-2 sentence short answers, no "Great question!" preamble
- Feedback confirmation copy: *"We'll respond when we get back to the dock."* (nautical, no founder name)

**Roughly done (post-launch polish queued)**
- **Logbook ~90%** — passages, watch entries, pre-departure & arrival checklists
- **First Mate ~90%** — conversational AI assistant, bottom sheet, query limits by tier

---

## Active work

- **Beta tester activation** — structured task plan still 0/5. Now that signup friction is gone, worth sending re-engagement: "Hey, verification is now instant — try again."
- **Multi-engine support** (beta items #3 + #5 from Apr 21 run-through) — needs a dedicated half-day design+build session. Schema: `vessels.engine_hours` is single-value today, needs to become per-engine (port/stbd/kicker). AI onboarding prompt assumes one engine → hallucinates wrong single engine on twin-engine boats (Garry reported this from every test build). Engine IS already its own equipment category, so structurally multiple engine cards are possible — blocker is onboarding prompt + vessel-level hours schema + logbook passage hours input.
- **Google Play** account verification + 12-tester closed testing setup
- **iOS** build prep
- **Final polish** on Logbook + First Mate (the last 10%)

### Post-session pending (Apr 21)

Queued but NOT urgent. Order by discretion:

- **Unverified-email banner** — thin nudge at top of app when `user.email_confirmed_at == null`: "⚠️ Please verify your email. [Resend]". Reappears on reload. Uses `supabase.auth.resend({ type: 'signup' })` to explicitly trigger the email.
- **Three soft gates** on email-verification:
  - `/api/stripe/checkout` — prevents chargeback fraud from unverified signups
  - `/api/invite` — prevents Keeply being used as a spam vector
  - `/api/cron/weekly-digest` — skip unverified users (don't waste Resend sends)
- **Env vars to mark Sensitive in Vercel** (in priority order, each requires copying current value to password manager first since you can't view after upgrade):
  1. `ANTHROPIC_API_KEY` (biggest blast radius)
  2. `RESEND_API_KEY`
  3. `SIGNUP_WEBHOOK_SECRET`
  4. `CRON_SECRET`
  5. `VAPID_PRIVATE_KEY`
  - Skip `VAPID_PUBLIC_KEY` — public keys stay public, false-positive flag.
- **VS Code format-on-save** — install `esbenp.prettier-vscode` + add `.vscode/settings.json` with `formatOnSave: true`. 30 seconds.
- **Tier 2 code hygiene** — Husky pre-commit hook (~30 min) + Playwright smoke tests for 5 critical paths (~3–4 hrs total, spread across sessions).

---

## Code hygiene plan

**Current state (Apr 21, 2026):** Tier 1 complete. ESLint v9 + TypeScript v5 installed. Prettier configured and entire repo formatted. Route + global error boundaries shipped. PostHog exception capture wired up. **Still missing:** tests (zero), pre-commit hooks. File mix: 34 `.js/.jsx` (including the 7,900-line monolith) vs 18 `.ts/.tsx`.

### Tier 1 — this week (~3 hrs)
1. **Error boundary at app root.** Prevents white-screen-of-death from any uncaught React error. ✅ Shipped Apr 21.
2. **PostHog error tracking** (not Sentry — chose PostHog because it's already installed; one fewer service to manage; switching cost is low if insufficient). `capture_exceptions: true` + `trackException` helper wired into both error boundaries. ✅ Shipped Apr 21.
3. **Prettier + format-on-save.** Kills style drift, makes diffs clean. ✅ Shipped Apr 21 (also removed dead `KeeplyApp.stripped.jsx` file that was caught by the format pass).

### Tier 2 — next 2 weeks (~4 hrs)
4. **Husky + lint-staged pre-commit.** Solo-founder substitute for PR review; blocks unformatted/ESLint-failing commits.
5. **Playwright smoke tests — 5 critical paths.** Signup + email verify, add vessel, add equipment + mark maintenance done, Stripe subscribe, First Mate query. One test per path is enough.

### Tier 3 — post-launch ONLY
- Split `KeeplyApp.jsx` into sub-components
- Convert remaining `.jsx` → `.tsx`
- Zod schemas at API boundaries
- Component-level unit tests
- Full theme audit / design tokens / CSS variables

### Deliberately NOT doing
- CI/CD beyond Vercel built-in (it's enough)
- Monorepo tooling (no need at this scale)
- TypeScript strict mode blitz (gradual adoption on new files only)
- Unit tests for every component (ROI too low for 1-person team)
- Custom test infrastructure beyond Playwright defaults

---

## First Mate build order (remaining)

Ordered by strategic value:

1. **Engine hours** tracking (dual-trigger consumables: time AND hours)
2. **Consumables on equipment cards** (pre-populated at onboarding)
3. **Text First Mate**
4. **Weather API** — NOAA/Open-Meteo free tier (Windy/PredictWind partnership is Phase 2)
5. **Provisioning & par system**
6. **Voice input** for First Mate
7. **Departure Check enrichment** (voice + weather on existing checklist)
8. **Voice output**

---

## Icebox

- **Camera equipment ID** — Take a photo of an engine plate/equipment label → AI identifies make/model. Genuinely differentiated (no competitor does this); net-new work, not a prompt tweak. Requires new API route or extension of `scan-document`. Added to OKR backlog Apr 21. **Note:** current AI equipment ID is text-only via `identify-vessel` route. `scan-document` exists but only handles registration documents, not equipment.
- Quick Capture (photo → AI ID → one-time or recurring) — depends on Camera equipment ID above
- Windy partnership (strategic, co-marketing)
- Vessel notes freeform field (marina slip, contacts, radio channels)
- Terminology audit: "task" → "maintenance" throughout app UI (website already done)
- Offline-first logbook for offshore use
- Native mobile shells (vs. PWA/TWA path)
- Insurance sponsorship model (BoatUS/Geico) — requires consumer scale first

### Away Mode / Layup Mode (design parked)

**Status:** Icebox. Re-evaluate fall 2026 when PNW/Northeast users approach layup season.  
**Why parked:** Current April beta cohort has no one in a layup-relevant state (Florida doesn't layup; PNW boats are commissioning, not decommissioning).

**Design direction when we pick it up:**

- **Name it "Layup Mode," not "Away Mode."** Boaters already understand "layup" — specific framing prevents scope creep into vacation/storm/sale cases.
- **Option C with simplicity of A.** Layup Mode with winterization checklist on entry and spring commissioning checklist on wake-up. Checklist is skippable — user can just pick a return date for speed.
- **Repairs stay live.** Maintenance gets deferred; repairs don't. A broken through-hull doesn't care that you're away.
- **Show muted, don't hide.** Tasks dim/collapse under an "In Layup — paused items" header. Hiding them creates data-loss anxiety.
- **Health score shows "🛌 Vessel in Layup — resume [date]" explicitly.** Don't silently freeze the score; silent freezing looks like a bug.

---

## Hard rules

**Deploy workflow — never skip**
1. `npm run build` locally
2. `git push origin HEAD:staging` → test at `keeply-git-staging-garry-cmds-projects.vercel.app`
3. Only if clean: `git push origin HEAD:main`
4. **Never push straight to main**
5. Rollback: Vercel → Deployments → READY deploy → Promote to Production
6. Always end coding sessions with PowerShell commands (staging first, then production)

**Coding**
- Discuss architecture and show mockups before writing code
- Flag honest tradeoffs; don't just build what's asked
- Batch non-critical bugs; fix blockers immediately
- **Do NOT split `KeeplyApp.jsx` (~7,900 lines) pre-launch** — post-launch tech debt
- When applying multiple patches, always work from the most recent file state
- TypeScript errors in the container are pre-existing env issues, not regressions

**Content**
- Never "sailors" → always "boaters"
- Never reposition as "maintenance app" — vessel intelligence
- First Mate is the product

**Admin**
- Admin email: `garry@keeply.boats` (not svirene.com)
- Additional admins via UUID whitelist in Vercel env var
- Personal email: `garry@svirene.com`

---

## Stack

- **Frontend:** Next.js/React, monolithic `components/KeeplyApp.jsx`
- **DB/Auth:** Supabase — project `waapqyshmqaaamiiitso`
- **Hosting:** Vercel — project `prj_494TKw1owvgGjSW8UNFB4oplrBMU`, team `team_FD2H6R0bDq59mIOZWsPE8YLg`
- **AI:** Anthropic API — Sonnet for quality, Haiku for volume
- **Payments:** Stripe
- **Email:** Resend
- **Local path:** `C:\Users\garry\keeply`
- **Repo:** `github.com/garry-cmd/keeply` (toggles public/private)

### Pricing (Apr 17 2026)

| Tier | Monthly | Annual | Limits |
|---|---|---|---|
| Free | $0 | — | 1 vessel, 10 equipment, 5 First Mate queries |
| Standard | $15 | $144 | unlimited equipment, 30 AI queries, 14-day trial |
| Pro | $25 | $240 | + voice + weather + departure checks |
| Fleet | $49.99+ | — | multi-vessel |

### Stripe price IDs

- Standard Monthly: `price_1TKJ3GA726uGRX5eqmN6Rwr4`
- Standard Annual:  `price_1TKJ3GA726uGRX5eroj4WEUp`
- Pro Monthly:      `price_1TKJ3TA726uGRX5epzWsSkbN`
- Pro Annual:       `price_1TKJ3kA726uGRX5eRna7Gr4P`

---

## Session-start ritual

1. `recent_chats` — last 3–5 threads
2. Read this file (CONTEXT.md)
3. `tool_search` to load Chrome MCP tools, then navigate to `https://keeply.boats/admin/okr` for live state (auth-gated on `garry@keeply.boats`; Chrome extension must be active in browser)

---

## Connector access

Claude's connectors split into two layers — knowing which is which prevents wasted setup time.

**Direct (callable in chat):**
- **Gmail** — threads, search, drafts, labels
- **Supabase** — SQL, logs, migrations against `waapqyshmqaaamiiitso`
- **Vercel** — `list_deployments`, `get_deployment_build_logs`, `get_runtime_logs`
- **QuickBooks** — full accounting
- **Claude in Chrome** — live site review, DOM inspection, localStorage reads, network/console monitoring. Requires the Chrome extension active in Garry's browser.

**Artifact-only (MCP server, only reachable from AI-powered artifacts):**
- **Google Calendar**
- **Google Drive**
- **Stripe** — for Stripe data in chat, workarounds: query Supabase for subscription records, check Vercel logs for webhook activity, or build a small Stripe artifact on demand.

**All deferred tools require `tool_search` first.** Chrome, Gmail, Vercel, Supabase, QuickBooks tools are NOT in the default toolset — Claude must call `tool_search` with a relevant query to load them before first use in each session. Easy to forget. If Claude says "I don't have X access," check this before re-running connector setup.

### Other tooling notes

- **Supabase auth token key:** `sb-waapqyshmqaaamiiitso-auth-token`
- `raw.githubusercontent.com` is blocked — use GitHub API (`api.github.com/repos/.../contents/...`) instead
- User deletion in Supabase: `DELETE FROM auth.users` cascades to all child tables
- Auth diagnostics via Supabase `get_logs` with `service: "auth"`

---

## Git gotcha

Running git commands from `C:\Users\garry` instead of `C:\Users\garry\keeply` produces fatal "not a git repository" errors. Catch early.

---

## Key learnings (Apr 21 session)

- **Vercel dashboard "preview" iframe is unreliable** — every Vercel deploy sends `x-frame-options: DENY`, which makes the embedded preview panel flash white. Always test deploys via the direct staging URL (`keeply-git-staging-garry-cmds-projects.vercel.app`), NOT the Vercel dashboard preview.
- **Env vars must be set per environment.** `SUPABASE_SERVICE_ROLE_KEY` was set for Production only, not Preview. First Mate on staging crashed with "supabaseKey is required" until Preview was checked. Check Vercel → Settings → Env Vars → each row's Environments column when debugging route crashes.
- **Supabase "Confirm email" toggle disables BOTH the gate AND the email send** — not just the gate. Verified via auth logs: no `user_confirmation_requested` events after the toggle flipped. For future verification prompts, use `supabase.auth.resend({ type: 'signup' })` to explicitly trigger.
- **Don't trust memory about what's shipped — verify in code.** Claude claimed photo equipment ID existed when only text-based `identify-vessel` does. `scan-document` accepts photos but only for registration docs, not equipment. Lesson: grep before asserting state.
- **When fixing UX friction, question the requirement before coding around it.** Was about to ship a 100-line PKCE callback route to smooth the post-verify flow. The right fix was a single Supabase dashboard toggle. Saved a day of code + testing + maintenance.
- **"Due Soon" is the correct urgency bucket for a day-zero onboarding task.** Bumping to "Critical" would feel manipulative. The system escalates organically if ignored.
- **Vercel deploy rollbacks are cheap, and rollback instincts from ambiguous symptoms can be wrong.** The error-boundary "white screen" was the iframe quirk, not a code bug. Rollback cost ~10 min; the bigger cost was the confidence hit. Always verify symptom via direct URL before rolling back.

---

## Persona reference

- **Active Cruiser** — validated. 42–65, $150K–$400K HHI, 35–65ft vessel, 20–60 days/year on water, $8K–$40K/yr spend.
- **Liveaboard** — validated. Brand loyalist, word-of-mouth engine.
- **Upgrader** — unvalidated in beta. Gap in current cohort.
