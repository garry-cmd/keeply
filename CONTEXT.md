# Keeply — Context

**Updated:** April 25–26, 2026  
**Phase:** GoLive Ready (both pre-launch blockers closed)  
**Founder:** Garry Hoffman (solo)  
**Target:** $5K MRR to quit day job

---

## Strategic frame

Keeply is a **vessel intelligence platform**, not a maintenance app.  
The app UI is a read-only dashboard; **First Mate is the primary interaction layer.**  
Copy rule: never use "sailors" — always "boaters."

---

## Current state (Apr 23, 2026)

- **Apr 25–26 session — GoLive blockers closed.** Both pre-launch blockers identified and shipped: (a) document-scan partial-fields data-loss bug — scanning a second document (e.g., insurance) was wiping fields saved by the first (e.g., registration); (b) `/api/delete-account` had no auth check AND scoped its cascading deletes to `vessel_members`, meaning a crew member deleting their account would wipe the OWNER's vessel data. With 3 active member relationships in production, that risk was live, not theoretical. Both fixed. Self-delete verified end-to-end with `garry+test@keeply.boats`. **Real signups can now turn on whenever Garry is ready to triage Day-1 issues.**
- **5 active beta testers** (2 Active Cruisers, 2 Liveaboards, 1 Upgrader). +2 imminent (1 Cruiser, 1 Liveaboard) → 3/3/1 split.
- **Beta close deadline: May 1.** 5 testers actively working through the structured task plan; 0/5 fully complete. KR in flight.
- **Active KR: "Deliver final features" (due May 31):** Logbook Custom Checklists (Pro), First Mate Conversation History (all tiers), Multi-engine tracking. See `/admin/okr`.
- **3/3 personas validated** (all three personas represented in beta cohort)
- **iOS/Android:** DUNS in hand, Google Play account in flight, iOS build pending
- **Apr 23 session win:** Doc attach bug fixed — regular-equipment Docs tab file picker now auto-fills the label from the filename, matching the vessel-scoped tab. Closes the bug that blocked attaching files to the Jabsco bilge pump on SV Irene (and every other regular equipment card since commit `a166837`).
- **Apr 22 audit finding (still open):**
  - `push_subscriptions` table has **1 row across 10 users.** Infrastructure complete (subscribe route, cron at 13:00 UTC, VAPID keys, web-push) but enrollment flow likely broken. Needs end-to-end real-device validation.
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
- Static pricing config in `lib/pricing.js` — single source of truth for prices, Stripe price IDs, plan limits, storage quotas (`storageBytes`/`storageLabel`), and a `CAPABILITIES` registry for boolean feature gates (11 capabilities). Exposes `hasCapability()`, `requiredPlanFor()`, and natural-language formatters (`formatPlanSummary`, `PLAN_PROMPT_LINES`, `UPGRADE_FAQ_ANSWER`) so every user-facing plan description derives from PLANS/CAPABILITIES — no more hardcoded limit strings at call sites. Consumed by webhook, LandingPage, First Mate route/components, Support FAQ, KeeplyApp upgrade cards, LogbookPage (watch entries + passage export gates), and KeeplyApp haul-out gate.
- Stripe subscriptions, webhooks, customer portal
- Resend transactional email
- **Frictionless signup** — "Confirm email" gate OFF in Supabase (Apr 21); users land in app immediately. "Secure email change" ON for account-change protection. Branded confirmation email template ships from `Keeply <noreply@keeply.boats>` (used for explicit resend, password reset, email-change verify).
- Weekly digest cron (Mon 10:00 UTC / 6 AM ET)
- PostHog, GA4, Search Console, Google Ads, Microsoft Clarity
- **PostHog exception capture** (Apr 21) — `capture_exceptions: true` + `trackException` helper wired into route + global error boundaries
- SEO: sitemap, robots.txt, JSON-LD

**Stability (Apr 21)**
- Route-level error boundary (`app/error.tsx`) — "Something went aground" with Retry
- Global error boundary (`app/global-error.tsx`) — catches root-layout crashes with inline dark-mode styles
- Prettier config + entire repo formatted; dead `KeeplyApp.stripped.jsx` removed

**Onboarding polish (Apr 21)**
- "Complete your vessel setup" synthetic maintenance task auto-created on signup (both free + paid AI-build paths). Lands in Due Soon urgent card. Interval 36,500 days so completion doesn't resurface.
- First Mate explicit formatting rules in system prompt — no markdown, plain dash lists, 1-2 sentence short answers, no "Great question!" preamble
- Feedback confirmation copy: *"We'll respond when we get back to the dock."* (nautical, no founder name)

**Free-tier gates finalized (Apr 25)**
- **Parts catalog removed from Free tier copy across the app.** The bullet was on the plan-picker card, the comparison table, the secondary feature strip, the support FAQ, and the `partsCatalog` capability registry — all gone. Reason: the curated browseable catalog described in marketing was never built. The actual user-facing parts feature is the per-equipment "My Parts" block, which is too modest for a marketing bullet. Honest Free tier copy beats aspirational copy that drifts. Same lesson as DOC_LIBRARY (Apr 23): aspirational copy without shipped consumers is a liability, not an asset.
- **Free tier locked at 1 vessel · 2 equipment · 3 repairs · 5 First Mate queries/mo.** No rollover (engineering-cheap but solves the wrong problem — seasonal users want pause-subscription, not banked queries; that's Layup Mode in fall 2026). 3-repair limit is intentional and counts onboarding repairs (the 2 system-created onboarding rows + 1 user repair = paywall). Garry's call against the beta task plan's earlier flag: "all they have to do is mark the first two complete." Conversion math beats UX comfort here.
- **Existing Free users above limits are auto-grandfathered.** No code change needed — `canAddEquipment(plan, currentCount)` only blocks new adds when `currentCount >= limit`, never retroactively. A user with 5 equipment cards keeps them; can't add a 6th.
- **CONTEXT.md correction:** the Apr 24 entry stating `canAddRepair()` is "defined-but-unused" is stale. As of this session it IS wired up at `KeeplyApp.jsx:4198` (`if (!canAddRepair(userPlan, repairs.length))`). Repair gate is live.

**Customer-facing BETA / early-access language removed (Apr 25)**
- Beta is wrapping; the website was still loud with "early access," "Join the beta," and `BETA2026` discount-code copy in 9 different sites of `LandingPage.jsx`. All 9 scrubbed in a single pass: top banner, social-proof "IN EARLY ACCESS" pill, pricing-section green pill + headline + subhead ("Choose the plan that fits your boat" replaces "Join the beta"), comparison-table discount-code row, "Use code BETA2026" line below the table, the full BETA2026 promo callout `<div>` block in the plan-picker modal, and the strikethrough-price + "2 months free with BETA2026" badge in the signup modal price column.
- Replacement copy originally leaned on the 14-day free trial — but the trial itself was removed Apr 25 (see "Trial removed" entry below). No new promotional language was introduced; the goal was to make the site read like a shipped product, not an ongoing beta.
- "Beta" refs left in active code are all legitimate and intentionally kept: `app/admin/okr/page.tsx` (internal OKR dashboard), `VesselSetup.jsx` Beta Marine engine comment, and the `anthropic-beta` HTTP header in the First Mate route (Anthropic prompt-caching API flag, unrelated to Keeply beta).

**Trial removed (Apr 25)**
- The 14-day free trial is gone — both the marketing callouts and the backend mechanic. `lib/pricing.js`: `trial: 14` removed from Standard and Pro. `app/api/firstmate/route.js`: the "free users with `daysSinceSignup < 14` get Pro-level First Mate access" gate is deleted; effective plan is now just `plan`. `components/KeeplyApp.jsx`: `trialActive` state, three `setTrialActive(false)` setters, three conditional checks, and four prop passes all removed. `components/FirstMate.jsx` and `FirstMateScreen.jsx`: `trialActive` prop dropped; `effectivePlan` simplified to `plan`. `components/LandingPage.jsx`: four user-visible callouts removed (top banner segment, pricing-section badge text, pricing-table footer line, signup-modal price sub-line). `app/layout.tsx`: trial removed from main meta description, Open Graph, and Twitter card.
- Reason: clean up the offer. Free tier limits (1 vessel · 2 equipment · 3 repairs · 5 First Mate/mo) are tight enough that a true conversion event happens at the limit, not at trial expiration. Trial-expiration churn is also a worse signal than limit-hit conversion.
- **Stale dev cruft NOT deleted:** `patch-pricing.js` and `patch-pricing2.js` are one-off migration scripts that originally added the trial. Already-run, no longer referenced — safe to delete in a future pass.
- **Stripe price-level trials are NOT touched here.** The four Stripe price IDs may still have a `trial_period_days` configured at the Stripe dashboard. Our `app/api/stripe/checkout/route.js` doesn't pass trial params, so subs created after this change won't trial — but if a price-level trial is configured, it'll still apply. Verify in Stripe dashboard if any subs are created with `status: 'trialing'`.
- **Admin "Trialing" stat left in place** at `app/admin/page.tsx:894` — it reads from Stripe's `subscriptions.list({ status: 'trialing' })` and is now a passive diagnostic. Should always be 0 going forward; if non-zero, something is configured at the Stripe price level.

**Pre-launch hardening (Apr 25–26)**
- **Custom email verification system** — runs alongside Supabase autoconfirm (autoconfirm stays ON, no signup gate). Three new endpoints: `app/api/send-verification/route.ts` (generates 32-char hex token, stores in `app_metadata`, emails via Resend), `app/api/verify-email/route.ts` (validates token, flips `app_metadata.email_self_verified=true`, redirects to `/?verified=1` or `/?verified=0&reason=...`), `app/api/change-email/route.ts` (admin API updates email + triggers fresh verification). UI: dismissable banner in `KeeplyApp.jsx` (trigger: `app_metadata.email_self_verified !== false`); existing users + Google OAuth exempt because their flag is undefined. `LandingPage.jsx` AWAITs send-verification then `refreshSession()` so JWT picks up app_metadata before user enters app; also handles `?verified=1`/`?verified=0&reason=...` URL params with success/error banner.
- **Admin email verification observability card** — collapsible card on `/admin` next to Orphans card. Shows `pending`, `expired`, `verified`, and `legacy/OAuth (exempt)` counts. Expanded view lists pending users with token-sent date + signup age, sorted with expired tokens first. Reuses existing delete-test-user modal for cleanup actions. Same pattern as the orphans card.
- **Admin orphan visibility** — collapsible card on `/admin` showing users with `pending_plan=standard|pro` who never completed payment. Expanded view shows email, intended plan, joined date, age. Delete action wired to the new test-user endpoint.
- **`/api/admin/delete-test-user`** — atomic Stripe + Supabase cleanup endpoint, auth-gated by `ADMIN_USER_ID` env. Used by all admin-side delete actions (orphans card, verification card). Tested end-to-end during the session.
- **Free→Standard charging bug fix** — clicking Free button left stale `localStorage.keeply_pending_price_id` from a prior Standard/Pro click, causing the Free user to hit Stripe Checkout. Fix: clear localStorage in Free button click handler.
- **Google Ads conversion tracking** — gtag added to `app/layout.tsx`, `lib/analytics.ts` (~79 lines) created with three conversions: Signup Started ($0), Plan Selected ($5), Sign Up Completed ($15, Primary). Conversion ID `AW-18080905583`; labels `a5AJCPXAv6IcEO_y0q1D`, `jsS9CPLAv6IcEO_y0q1D`, `1wl0CO_Av6IcEO_y0q1D`. Stripe purchase as 4th conversion is on the post-launch backlog. Discovered an existing GTM container `GT-NNMKZQC5` of unknown origin during this work; investigation deferred. PostHog events appearing empty in dashboard is likely the local ad blocker; not confirmed.
- **Document scan partial-fields data-loss bug fix** — scanning a registration doc then an insurance doc was wiping the registration's `hin`/`uscg_doc`/`state_reg`/`home_port`. Root cause: `scanCommitPayload` called `vesselInfoPayload(fields)` which builds the FULL passport shape with explicit nulls for absent keys — correct for the manual edit form (empty input = clear), wrong for partial scans (absent = "this doc didn't have it"). Fix: inlined passport-building logic in `scanCommitPayload` to include only keys actually present in the response. `vesselInfoPayload` itself unchanged (still correct for form-edit save path; the second scan-document caller uses `setInfoForm` to merge into form state first, which already worked).
- **`/api/delete-account` auth + scope hardening** — endpoint accepted `userId` from request body with no Bearer token verification, so anyone with a userId (which leaks via vessel_members invites, share links, etc.) could delete that account. ALSO: `vesselIds` was sourced from `vessel_members?user_id=eq.X`, which includes vessels the user is just CREW on. Cascading deletes then wiped child data for those shared vessels — destroying the OWNER's data. Both fixed: Bearer token verified via `/auth/v1/user`, rejected with 401/403 on missing/mismatched. `vesselIds` now sourced from `vessels.user_id` (owned only). `vessel_members?user_id=eq.X` DELETE moved outside the if-owned-vessels block so crew-only users still get removed from shared vessels they're on. Client (`KeeplyApp.jsx`) now reads access token from `supabase.auth.getSession()` and sends `Authorization: Bearer <token>`.

**Bug fixes & polish (Apr 23)**
- **FM_LIMITS single source of truth** — `app/api/firstmate/route.js`, `components/FirstMate.jsx`, and `components/FirstMateScreen.jsx` now all import `PLANS` from `lib/pricing.js`. The three hardcoded constants (each with different values, none matching the DB) are deleted. Standard users now see 30 in both UI surfaces and get 30 from the server, not 10. Stale 403 message ("First Mate is not available on the Free plan…") reworded to plan-agnostic and hardened with a `console.error` log so the now-unreachable branch becomes observable if it ever fires.
- **Orphan pricing schema cleanup** — dropped five unreferenced tables: `plan_limits`, `plan_marketing_features`, `pricing_plans`, `pricing_experiments`, `user_experiment_assignments`. Zero code references existed; they were seed data / A/B testing scaffolding from prior sessions that never got consumers. `lib/pricing.js` is now the unambiguous single source of truth with no parallel DB system creating drift.
- Doc attach auto-fill parity — the file picker on the regular-equipment Docs tab now auto-fills the label field from the filename, matching the vessel-scoped tab. Commit `a166837` ("Doc attach UX: auto-fill label from filename") only updated one of two file picker sites; today's one-line fix (onChange handler at line ~17017 in `KeeplyApp.jsx`) restores parity. Diagnostic logs from `4147a7d` made the diagnosis trivial — `[addCustomDoc] aborted: empty label` with a dumped form state told the whole story.
- DOC_LIBRARY removed (-335 LOC) — the "Suggested Documents" feature linked to `google.com/search?q=...` URLs dressed up as curated manufacturer manuals. Misleading; user clicks "Beta Marine Operators Manual" and gets a Google results page. Verified zero existing equipment rows had these URLs persisted (208 equipment rows checked), so no data cleanup. Replaced with a small empty-state on the Docs tab pointing users to "+ Add Document".
- Settings Danger Zone separator — Sign Out went from red to neutral text color (it's a routine action, not destructive); a "DANGER ZONE" muted label now sits between Sign Out and Delete Account. Prevents the misclick where two adjacent red buttons did very different things.
- FAB "Add Task" → "Add Maintenance" — beta users were confused by "Add Task" since the action creates a maintenance item attached to equipment. Updated the FAB sub-menu label, modal heading, and form placeholder. Tab labels (`Maintenance Tasks`) intentionally left alone — the broader task→maintenance audit stays in the icebox.

**Roughly done (remaining items tracked in "Deliver final features" KR, due May 31)**
- **Logbook** — passages, watch entries, pre-departure & arrival checklists all working. **Remaining:** Custom Checklists (Pro tier) — currently checklist items are hardcoded JS constants in `LogbookPage.jsx`.
- **First Mate** — conversational AI assistant, bottom sheet, query limits by tier (all three sites now import from `lib/pricing.js`), `APP_GUIDE` system prompt with prompt caching. **Remaining:** Conversation history (all tiers — beta tester request).
- **Engine hours (single-engine)** — `vessels.engine_hours` + `vessels.engine_hours_date` columns shipped; logbook passages auto-update them; KPI card on My Boat tab. **Remaining:** Multi-engine extension (schema + UI + passage form + First Mate context).

---

## Active work

Organized around two KRs pre-GoLive:

**KR: Close beta successfully (deadline May 1)**
- **Beta tester activation** — structured task plan still 0/5. Signup friction is gone; send re-engagement: "Hey, verification is now instant — try again."
- **Push notifications validated end-to-end** — diagnose why `push_subscriptions` has only 1 row across 10 users. Test real-device delivery on the 13:00 UTC cron.

**KR: Deliver final features (due May 31)**
- ~~**Custom Checklists**~~ — ✅ Shipped Apr 24 (narrow scope, all tiers). New `vessel_checklist_items` table; Pre-Departure and Arrival tabs get an "Edit" button that lets users add/remove/reorder/rename items. First edit seeds from the hardcoded defaults and replaces them; "Reset to defaults" deletes custom rows and falls back. Hardcoded sail-only flag and category grouping NOT ported to custom items — simpler edit UI, users can name/prefix items as they like. Full version (arbitrary new checklists with trigger binding) moved to post-launch backlog in ROADMAP.md.
- **First Mate Conversation History** — new `first_mate_messages` table (user_id, vessel_id, role, content, created_at). Single rolling thread per vessel, free for all tiers, context-window cap at ~30 messages. Beta-user request.
- **Multi-engine tracking** — schema change (one-to-many engines per vessel), UI (two meters on twin-engine boats), passage form changes, onboarding prompt fixes (AI currently hallucinates single engine on twin-engine boats per Apr 21 run-through).

**Other in-flight (not in above KRs)**
- **Google Play** account verification + 12-tester closed testing setup
- **iOS** build prep

### Post-session pending (Apr 21)

Queued but NOT urgent. Order by discretion:

- **Env vars to mark Sensitive in Vercel** (in priority order, each requires copying current value to password manager first since you can't view after upgrade):
  1. `ANTHROPIC_API_KEY` (biggest blast radius)
  2. `RESEND_API_KEY`
  3. `SIGNUP_WEBHOOK_SECRET`
  4. `CRON_SECRET`
  5. `VAPID_PRIVATE_KEY`
  - Skip `VAPID_PUBLIC_KEY` — public keys stay public, false-positive flag.
- **VS Code format-on-save** — install `esbenp.prettier-vscode` + add `.vscode/settings.json` with `formatOnSave: true`. 30 seconds.
- **Tier 2 code hygiene** — Husky pre-commit hook (~30 min), Playwright smoke tests for 5 critical paths (~3–4 hrs), `/api/invite` rate limit (~30 min), `/api/stripe/checkout` JWT verification (~30 min). ~5 hrs total, spread across sessions.

### Post-session pending (Apr 25–26)

All low-priority cleanup; nothing here blocks GoLive.

- **Token cleanup bug in `/api/verify-email`** — `delete newAppMeta.verify_token` doesn't actually clear the key when sent through `updateUserById` (Supabase merges, doesn't replace). Cosmetic only — `email_self_verified=true` short-circuits everything else. 2-line fix: change `delete newAppMeta.verify_token` and `delete newAppMeta.verify_token_expires` to assignment-to-null instead.
- **Stale verification email UX** — clicking a verify link from a deleted/expired test account redirects to `/?verified=0&reason=notfound`. The LandingPage banner explains the failure but the copy could be friendlier ("This link is from a deleted or expired test account").
- **Orphan-row cleanup on user delete** — `firstmate_usage`, `push_subscriptions`, `affiliate_clicks` rows aren't cleaned up when a user is deleted. Harmless (no foreign-key constraints on `auth.users` so nothing breaks); accumulates as cleanup debt over time.
- **Stripe purchase as 4th Google Ads conversion** — currently the Sign Up Completed event fires for ALL signups including Free. A separate Purchase event for paid checkouts would tighten conversion attribution.
- **PostHog silent issue investigation** — events appear empty in dashboard. Likely Garry's own ad blocker (never confirmed). Worth checking from an unblocked browser session.
- **Existing GTM container `GT-NNMKZQC5`** — discovered during ads tracking work; source unknown. Audit and decide whether to keep or remove.
- **"Check your inbox" modal copy on LandingPage** — copy says "click to activate" but autoconfirm is ON now, so users land in the app immediately. Modal copy is misleading; minor update needed.

**~~Moved to icebox (Apr 22)~~ — superseded Apr 25–26.** Original Apr 22 decision was to ice the unverified-email banner because `.resend({type:'signup'})` is a no-op on auto-confirmed users. That decision was reversed Apr 25–26 by building a custom verification system that runs alongside autoconfirm: `app_metadata.email_self_verified` flag, custom token in `app_metadata`, banner trigger reads the flag, three new endpoints, all detailed in the "Pre-launch hardening" block above. Autoconfirm stays ON (no signup gate); the custom system layered on top is what delivers the safety property without the friction.

---

## Code hygiene plan

**Current state (Apr 21, 2026):** Tier 1 complete. ESLint v9 + TypeScript v5 installed. Prettier configured and entire repo formatted. Route + global error boundaries shipped. PostHog exception capture wired up. **Still missing:** tests (zero), pre-commit hooks. File mix: 34 `.js/.jsx` (including the ~26k-line monolith — Prettier reformat, ~8k substantive) vs 18 `.ts/.tsx`.

### Tier 1 — this week (~3 hrs)
1. **Error boundary at app root.** Prevents white-screen-of-death from any uncaught React error. ✅ Shipped Apr 21.
2. **PostHog error tracking** (not Sentry — chose PostHog because it's already installed; one fewer service to manage; switching cost is low if insufficient). `capture_exceptions: true` + `trackException` helper wired into both error boundaries. ✅ Shipped Apr 21.
3. **Prettier + format-on-save.** Kills style drift, makes diffs clean. ✅ Shipped Apr 21 (also removed dead `KeeplyApp.stripped.jsx` file that was caught by the format pass).

### Tier 2 — next 2 weeks (~5 hrs)
4. **Husky + lint-staged pre-commit.** Solo-founder substitute for PR review; blocks unformatted/ESLint-failing commits.
5. **Playwright smoke tests — 5 critical paths.** Signup → lands in app, add vessel, add equipment + mark maintenance done, Stripe subscribe, First Mate query. One test per path is enough.
6. **`/api/invite` rate limit.** Route currently has no auth; anyone knowing the endpoint can blast Keeply-branded emails. Verify Bearer token, reject if caller has sent >5 invites in the past hour (Supabase count query on `vessel_members` by inviter). Two-line check. Closes the spam-vector hole without needing verification plumbing. ~30 min.
7. **`/api/stripe/checkout` JWT verification.** Route trusts client-sent `userId`. Add `supabase.auth.getUser(token)` check, reject if `userId !== token.sub`. Prevents a logged-in user from starting a checkout attributed to another user. ~30 min.

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

_Engine hours foundation is shipped; multi-engine is in the active "Deliver final features" KR. List below is post-GoLive._

Ordered by strategic value:

1. **Consumables on equipment cards** (pre-populated at onboarding; pairs with engine hours for dual-trigger)
2. **Text First Mate**
3. **Weather API** — NOAA/Open-Meteo free tier (Windy/PredictWind partnership is Phase 2)
4. **Provisioning & par system**
5. **Voice input** for First Mate
6. **Departure Check enrichment** (voice + weather on existing checklist)
7. **Voice output**

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
7. **Code and docs deploy together.** Any PowerShell deploy bundle that ships code must either include matching CONTEXT.md / ROADMAP.md / OKR page updates in the same commit, or Claude must explicitly state "no context changes needed" at the top of the deploy instructions. Never ship code in one push and reconcile docs in the next session — that is exactly how "Database-driven pricing" made it into CONTEXT.md for months while the code did something else entirely.

**Coding**
- Discuss architecture and show mockups before writing code
- Flag honest tradeoffs; don't just build what's asked
- Batch non-critical bugs; fix blockers immediately
- **Do NOT split `KeeplyApp.jsx` (~26,000 lines post-Prettier, ~8k substantive) pre-launch** — post-launch tech debt
- When applying multiple patches, always work from the most recent file state
- TypeScript errors in the container are pre-existing env issues, not regressions
- **Verify handoff specs against live DB / live code before executing them.** Specs written in one session and executed in another can silently drift out of sync with reality. Preflight (grep counts + DB state check) takes a minute and prevents catastrophic edits.

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

### Pricing (Apr 25 2026)

| Tier | Monthly | Annual | Limits |
|---|---|---|---|
| Free | $0 | — | 1 vessel, 2 equipment, 3 repairs, 5 First Mate queries |
| Standard | $15 | $144 | unlimited equipment, 30 AI queries |
| Pro | $25 | $240 | + voice + weather + departure checks |
| Fleet | $49.99+ | — | multi-vessel |

### Stripe price IDs

- Standard Monthly: `price_1TKJ3GA726uGRX5eqmN6Rwr4`
- Standard Annual:  `price_1TKJ3GA726uGRX5eroj4WEUp`
- Pro Monthly:      `price_1TKJ3TA726uGRX5epzWsSkbN`
- Pro Annual:       `price_1TKJ3kA726uGRX5eRna7Gr4P`

---

## Session-start ritual

CONTEXT.md and ROADMAP.md live in git as the single source of truth. They are **not** kept in Claude project knowledge — project knowledge is reserved for reference material that doesn't change (ICP, marketing plan, logo). Session-start fetches the live docs directly from the repo.

1. `recent_chats` — last 3–5 threads
2. Clone the repo: `git clone --depth 1 https://github.com/garry-cmd/keeply.git /home/claude/keeply` (~4 sec, gets whole codebase ready for grep/edit as a side effect)
3. Read `/home/claude/keeply/CONTEXT.md` and `/home/claude/keeply/ROADMAP.md`
4. `tool_search` to load Chrome MCP tools, then navigate to `https://keeply.boats/admin/okr` for live OKR state (auth-gated on `garry@keeply.boats`; Chrome extension must be active in browser)

**If the clone fails with auth error:** repo is private. Ask Garry to flip it public (his standard pattern) or supply a read-only GitHub PAT in-chat. Don't silently fall back to project knowledge — that defeats the single-source-of-truth rule.

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
- `raw.githubusercontent.com` and `api.github.com` are both blocked in Claude's network allowlist. Only `github.com` itself is reachable, which means `git clone --depth 1 https://github.com/garry-cmd/keeply.git` is the canonical way to read repo contents. Don't attempt API or raw-content URLs — they'll 403.
- User deletion in Supabase: `DELETE FROM auth.users` cascades to all child tables
- Auth diagnostics via Supabase `get_logs` with `service: "auth"`

---

## Git gotcha

Running git commands from `C:\Users\garry` instead of `C:\Users\garry\keeply` produces fatal "not a git repository" errors. Catch early.

---

## Key learnings (Apr 25–26 session)

- **Two functions, two write paths, two different rules.** `vesselInfoPayload` builds a FULL-shape vessel passport object with explicit nulls for absent keys — correct for the manual edit form, where an empty input means "clear this field." `scanCommitPayload` was calling it for partial scan results, where an absent key means "this document didn't contain that field." Same data shape, opposite semantics. The fix wasn't to change `vesselInfoPayload` (it's right for the form path); it was to inline a partial-builder in `scanCommitPayload`. Lesson: when two callers want different null-handling behavior, they need different builders. Don't refactor toward a "general" helper unless its callers actually want the same semantics.
- **"15-minute auth fix" was actually a 45-minute auth + scope fix once you read the file.** `/api/delete-account` had two distinct vulnerabilities: missing Bearer token verification (the security issue Garry asked about) AND over-broad cascading deletes scoped to `vessel_members` instead of `vessels.user_id` (a data-loss issue I'd noted earlier in the session but hadn't tracked). With 3 active member relationships in production, the data-loss path was a live risk, not theoretical. Lesson: when you're already inside a security-critical file, audit the WHOLE flow, not just the field the user pointed at. Bundling both fixes into one commit also ensured the new auth check actually protected against a meaningful attack — without the scope fix, the auth check would let a properly-authenticated crew member still wipe an owner's data via self-delete.
- **CASCADE relationships eliminate manual delete chains.** Schema audit showed most vessel-scoped tables (`engines`, `equipment`, `logbook`, `maintenance_tasks`, `repairs`, `vessel_admin_tasks`, `vessel_checklist_items`, `vessel_members`, `watch_entries`) have `ON DELETE CASCADE` on `vessel_id`. The existing manual deletes in `/api/delete-account` are belt-and-suspenders against the cascade, not strictly required. `service_logs` doesn't even exist anymore — the DELETE on it has been a no-op for unknown duration. Kept the manual deletes in place this pass (low risk, idempotent) but a future cleanup pass can lean entirely on cascades. Schema-first thinking beats endpoint-by-endpoint cleanup discipline.
- **Custom verification on top of autoconfirm beats flipping autoconfirm.** Apr 22 ran into Supabase's "Confirm email" toggle disabling both the gate AND the email send. Apr 25–26 went a different direction: keep autoconfirm ON (no signup friction, no `.resend({type:'signup'})` dependency), add an `app_metadata.email_self_verified` flag set by our own endpoint, banner triggers off the flag. Autoconfirm + custom flag = best of both: zero signup friction, full observability, no Supabase dashboard couples. Trade-off: two systems to reason about (a "verified" auth user can have `email_self_verified: false`); the comment in `KeeplyApp.jsx` makes this explicit. **Not** a long-term sustainable pattern if more verification dimensions appear (phone, identity), but right-sized for the actual need.
- **`app_metadata` vs `user_metadata` — clients can write to user_metadata.** `app_metadata` is server-controlled (only writable via service role / admin API); `user_metadata` is editable by the authenticated user. Verification flag MUST live in `app_metadata`, otherwise a malicious user could flip their own flag from the client. Subtle Supabase distinction worth keeping in mind for any future trust-bearing flag.
- **`updateUserById` merges metadata, doesn't replace.** When clearing a token via `delete newAppMeta.verify_token`, the property doesn't actually disappear from the row because Supabase merges the partial object instead of replacing. To clear, set the value to `null` instead. Functionally harmless in this case (`email_self_verified=true` short-circuits any verify-token check), but a 2-line follow-up fix to clean up cosmetically. Same gotcha applies to any future metadata-clearing logic.
- **Aspirational copy is technical debt.** April had two cases where copy promised features that weren't shipped: parts catalog (Apr 25, removed across 5 sites) and DOC_LIBRARY (Apr 23, removed). Today's add was the inverse direction — `keeply-ai-usage.docx` reference document. The act of writing it surfaced an honest accounting of where AI works (First Mate, identify-vessel, scan-document) and where it's weak (older/foreign equipment, glare on phone-camera scans, multi-page PDFs). Documents written for INTERNAL reference can be more honest than copy written for external readers; they should be — that's their job.

## Key learnings (Apr 24 session)

- **The Apr 23 FM_LIMITS fix killed the symptom, not the class.** Apr 23 migrated three FirstMate enforcement constants into `lib/pricing.js`, correctly fixing Standard users being cut off at 10 queries while their UI showed 30. But the same numbers also lived as hardcoded text inside the First Mate system prompt (`APP_GUIDE` in `app/api/firstmate/route.js`) and the public support FAQ — neither touched by the constant unification. A Free-tier user asking First Mate *"why can't I add more repairs?"* got back an answer citing a 3-repair limit that does not exist in code. Aspirational text drifts faster than code because it has no compiler.
- **The fix for this class of bug is a rule, not a patch.** Added a `CAPABILITIES` registry, storage as first-class fields, and derived constants (`PLAN_PROMPT_LINES`, `UPGRADE_FAQ_ANSWER`, `formatPlanSummary`). File header now asserts: *"every natural-language description of a plan must come from a helper in this file."* Future plan changes surface any remaining hardcoded strings automatically — wrong numbers become immediately visible the moment a limit shifts.
- **Numeric limits and boolean gates are different axes; one schema was fighting both.** PLANS previously carried both vessel counts and feature flags (inside `features: []` arrays). Splitting boolean gating into a separate `CAPABILITIES` object means the pricing comparison table on LandingPage can render directly from the registry, and runtime gates use `hasCapability(plan, key)` instead of hardcoded `plan === 'pro'` checks scattered across the monolith. Adding a new gated feature is now a 1-line registry entry plus a 1-line call-site check.
- **Scope discipline on the refactor.** 12 call sites reference plan data across the codebase. 5 had drift-bug-level problems; 7 are currently correct but hardcoded (FAQ page, LandingPage pricing-table rows, LandingPage feature bullets). Phase 1 migrated only the 5 broken sites — the other 7 stay on a Phase 1b backlog, to migrate organically when the next plan change surfaces drift. Smaller deploy, smaller blast radius, cheaper rollback.
- **`canAddRepair()` has been defined-but-unused since Apr 22.** Grep confirmed zero imports anywhere. The repair paywall the beta task plan warned about does not exist — no code enforces a repair limit on any tier. Left the function in place because Garry has a repair gate planned; flipping `repairs: 3` on Free plus one `canAddRepair()` call site in KeeplyApp is now the complete enforcement path (Phase 2, separate deploy).
- **Cross-component DB writes need explicit state-sync callbacks.** The engine-hours KPI on My Boat went stale when a passage's `hours_end` was edited inside LogbookPage. KeeplyApp's own internal passage save updates both DB and React state (`setVessels(...)`); LogbookPage's save only updated the DB because it had no way to push back. Fix: pass an `onEngineHoursUpdate(hours, dateStr)` prop callback from KeeplyApp into LogbookPage; LogbookPage calls it after a successful vessels-table write. **Lesson:** any sub-component that writes to a table the parent is already holding in state needs a callback contract — DB is the source of truth, but React state is what the user sees, and "last write wins to the DB" doesn't propagate to siblings without explicit wiring. Watch for this same pattern with future sub-components (Repairs, Equipment, MaintenanceTab when those get extracted from KeeplyApp post-launch).
- **Engine hours auto-update is "latest write wins" regardless of passage chronology.** Editing an old passage's `hours_end` overwrites `vessels.engine_hours` with that older value, even when newer passages exist with higher numbers. Correct behavior: `vessels.engine_hours` should be `MAX(hours_end)` across all passages. Not fixed today — the visual bug was the user-reported issue and got resolved with the state-sync callback. Real-data correctness fix added to backlog (Phase 2c-followup) — ~10-15 min, requires changing the auto-update to compute MAX rather than blindly assign.
- **Gesture UX is a high-cost detour pre-launch.** Spent two iterations chasing a click-to-move and then a long-press-anywhere reorder for the checklist editor before reverting to plain up/down arrows. Both attempts had subtle event-handling bugs (input capture, propagation, drag thresholds) that made the feature unusable on mobile. Lesson: for low-frequency interactions (reorder happens occasionally, not on the hot path), pick the boring solution first. Arrows with adequate touch targets (28px min) are not pretty, but they work on every device immediately. Save the gesture-pattern reach for things users actually do hundreds of times.

---

## Key learnings (Apr 23 session)

- **Orphan schema creates recurring forensic cost.** CONTEXT.md claimed "Database-driven pricing (live tuning via `/admin/pricing`, no redeploy)" — but zero code referenced the `plan_limits` / `pricing_plans` / `plan_marketing_features` tables, and `/admin/pricing` didn't exist. 15 minutes of the session went to reconciling stated state vs. actual state. The right fix wasn't to build the missing consumers — it was to delete the unused tables so CONTEXT.md could tell the truth in one line. Rule: infrastructure without a consumer is a liability, not an asset. At 14 users, speculative schema is pure forensic tax on every future session.
- **Also: aspirational docs rot faster than code.** `lib/pricing.js` has declared itself "SINGLE SOURCE OF TRUTH" in its header for months, yet three FirstMate files each hardcoded their own version of the same data. The rule was written; the rule wasn't enforced. If a file's header asserts a cross-file invariant, add a grep check to CI or to the deploy PowerShell — otherwise the invariant will drift.
- **Verify handoff specs before executing them.** A prior session produced `keeply-docs-photos-rebuild.md` — a 900-line surgical-edit spec whose opening paragraph stated a DB migration was already applied. It wasn't: the `documents` and `photos` tables don't exist, and the old JSONB columns (`equipment.docs`, `maintenance_tasks.photos`, `maintenance_tasks.attachments`, `repairs.photos`) are all still present. Running Phase 1 of that spec would have removed working code to match a non-existent schema. Preflight (one SQL query + one grep) caught it in under a minute. Spec has been deleted from project knowledge; it was never safe to execute as written.
- **Diagnostic logs pay for themselves.** The `[addCustomDoc] aborted: empty label` log line with a dumped form state told the whole story of today's bug. Commit `4147a7d` ("replace silent returns with visible errors + diagnostic logs") was the exact tool that made the fix trivial. Next time there's a temptation to remove verbose logging from a sensitive flow, don't.
- **Duplicated UI patterns will drift.** Two file-picker sites, same `newDocForm` state, one updated with auto-fill in commit `a166837` and the other missed. Monolithic `KeeplyApp.jsx` makes this pattern inevitable until the post-launch component split. For now: whenever a UX change touches a pattern that may appear twice in a single state object, grep the file for all callers before committing.
- **Equipment RLS overlap was real but not today's bug.** The `equipment` table carries two ALL-command policies — one owner-only (`vessels.user_id = auth.uid()`), one member-aware (`get_my_vessel_ids()`). For owners on their own vessels both pass; for shared members with certain access patterns UPDATE can silently fail. Already on the backlog as "Finalize Share Vessel Permissions." Doc-attach debugging surfaced it, didn't cause it.
- **The actual user-visible symptom ≠ the root cause in the last Claude's head.** The prior session went to a full JSONB→normalized-tables refactor when the bug was a single missing line in one of two onChange handlers. Resist the urge to rewrite architecture when a bug can be explained by drift between two sites of the same pattern.

---

## Key learnings (Apr 22 session)

- **Supabase auto-confirm breaks `.resend({type:'signup'})`.** Verified empirically: with "Confirm email" toggle OFF, signups return `email_confirmed_at = created_at` instantly and `.resend({type:'signup'})` returns 200 but is a silent no-op (confirmation_sent_at stays null, zero audit events). Any future verification-flow design has to either un-confirm users post-signup via service role, roll its own verification column, or move to OAuth-primary. Don't trust Supabase's toggle semantics without an empirical check.
- **Verify a feature is still needed before building around a constraint.** Spent a chunk of the session designing a banner for a risk (chargeback fraud, invite spam, digest cost) that at 14 users is theoretical. The 30-minute mitigation — rate-limit `/api/invite` + verify auth token on `/api/stripe/checkout` — covers the actual surface without the architectural cost of a verification system. Scope question beats design question.
- **Constants drift: `FM_LIMITS` hardcoded in 3 places with 3 values.** API route (`route.js`) enforced `free: 3 / standard: 10 / pro: 50`, `FirstMate.jsx` displayed `5/30/50`, `FirstMateScreen.jsx` displayed `3/10/50`. None read from the `plan_limits` table. A Standard user saw "30 queries/mo" in UI but got cut off at 10 by the server. Correctness bug that explained mixed beta feedback. Shipped fix Apr 23: all three sites now import from `lib/pricing.js`; orphan `plan_limits`/`pricing_plans`/`plan_marketing_features`/`pricing_experiments`/`user_experiment_assignments` tables dropped. Lesson: DB-driven pricing isn't real just because a table exists — and at this scale, "static config in a lib file" beats "half-built DB-driven system with no admin UI." The right fix for speculative infrastructure is often deletion, not completion.
- **Infrastructure built ≠ infrastructure working.** Push notifications have subscribe route, unsubscribe route, VAPID keys, web-push lib, and a daily cron — but `push_subscriptions` has 1 row across 10 users. Code shipping and users being served are separate things. Always verify end-to-end on a real device before marking "done."
- **Engine hours is already done for single-engine.** `vessels.engine_hours` + `engine_hours_date` columns, logbook passages auto-update them, KPI card renders them. The actual work in the new KR is *multi-engine extension*, not "add engine hours from scratch." Grepping the codebase surfaced this in under a minute.
- **Prettier reformat changed the monolith from 7,900 → 26,180 lines without adding features.** CONTEXT.md has been repeating the old number. Line count is a poor proxy for complexity after a mechanical reformat. Substantive code is closer to 8k.
- **Backlog items in an active KR should exit the backlog.** Having Logbook, First Mate, and Engine hours in both the KR and the Feature Backlog table created implicit duplication. Rule going forward: once something enters an active KR, remove it from the backlog table; re-add if de-scoped.
- **Repo root has accidental artifacts.** `ersgarrykeeply` (no extension, 10KB), `patch-pricing.js`, `patch-pricing2.js`, `strip-parts.py`, and `.bak` files are all one-shot tools living in main. Non-urgent cleanup.

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
- **Upgrader** — validated. Tester engaged in beta for weeks; demographics to be filled in post-debrief.
