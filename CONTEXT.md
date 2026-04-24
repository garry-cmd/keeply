# Keeply — Context

**Updated:** April 23, 2026  
**Phase:** Beta → Pre-Launch (GoLive imminent)  
**Founder:** Garry Hoffman (solo) · Co-owner: Marty (20%, community/social OKR)  
**Target:** $5K MRR to quit day job

---

## Strategic frame

Keeply is a **vessel intelligence platform**, not a maintenance app.  
The app UI is a read-only dashboard; **First Mate is the primary interaction layer.**  
Copy rule: never use "sailors" — always "boaters."

---

## Current state (Apr 23, 2026)

- **5 active beta testers** (3 Active Cruisers, 2 Liveaboards, 0 Upgraders). +2 imminent (1 Cruiser, 1 Liveaboard) → 4/3/0 split.
- **Beta close deadline: May 1.** Structured task plan still 0/5 — KR moved from on-track → at-risk.
- **Active KR: "Deliver final features" (due May 31):** Logbook Custom Checklists (Pro), First Mate Conversation History (all tiers), Multi-engine tracking. See `/admin/okr`.
- **1/3 personas validated** (Upgrader still unvalidated — gap in cohort)
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
- 14-day Standard trial

**Stability (Apr 21)**
- Route-level error boundary (`app/error.tsx`) — "Something went aground" with Retry
- Global error boundary (`app/global-error.tsx`) — catches root-layout crashes with inline dark-mode styles
- Prettier config + entire repo formatted; dead `KeeplyApp.stripped.jsx` removed

**Onboarding polish (Apr 21)**
- "Complete your vessel setup" synthetic maintenance task auto-created on signup (both free + paid AI-build paths). Lands in Due Soon urgent card. Interval 36,500 days so completion doesn't resurface.
- First Mate explicit formatting rules in system prompt — no markdown, plain dash lists, 1-2 sentence short answers, no "Great question!" preamble
- Feedback confirmation copy: *"We'll respond when we get back to the dock."* (nautical, no founder name)

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

**Moved to icebox (Apr 22):** Unverified-email banner + three soft gates. The `.resend({type:'signup'})` path that Apr 21's plan relied on turns out to be a no-op on auto-confirmed users — blocked by Supabase's toggle-off behavior. At 14 users the underlying risks (chargeback fraud, invite spam, digest cost) are theoretical; revisit pre-scale or couple with a broader OAuth-primary auth decision. See ROADMAP icebox for detail.

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

### Pricing (Apr 17 2026)

| Tier | Monthly | Annual | Limits |
|---|---|---|---|
| Free | $0 | — | 1 vessel, 10 equipment, 3 repairs, 5 First Mate queries |
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

## Key learnings (Apr 24 session)

- **The Apr 23 FM_LIMITS fix killed the symptom, not the class.** Apr 23 migrated three FirstMate enforcement constants into `lib/pricing.js`, correctly fixing Standard users being cut off at 10 queries while their UI showed 30. But the same numbers also lived as hardcoded text inside the First Mate system prompt (`APP_GUIDE` in `app/api/firstmate/route.js`) and the public support FAQ — neither touched by the constant unification. A Free-tier user asking First Mate *"why can't I add more repairs?"* got back an answer citing a 3-repair limit that does not exist in code. Aspirational text drifts faster than code because it has no compiler.
- **The fix for this class of bug is a rule, not a patch.** Added a `CAPABILITIES` registry, storage as first-class fields, and derived constants (`PLAN_PROMPT_LINES`, `UPGRADE_FAQ_ANSWER`, `formatPlanSummary`). File header now asserts: *"every natural-language description of a plan must come from a helper in this file."* Future plan changes surface any remaining hardcoded strings automatically — wrong numbers become immediately visible the moment a limit shifts.
- **Numeric limits and boolean gates are different axes; one schema was fighting both.** PLANS previously carried both vessel counts and feature flags (inside `features: []` arrays). Splitting boolean gating into a separate `CAPABILITIES` object means the pricing comparison table on LandingPage can render directly from the registry, and runtime gates use `hasCapability(plan, key)` instead of hardcoded `plan === 'pro'` checks scattered across the monolith. Adding a new gated feature is now a 1-line registry entry plus a 1-line call-site check.
- **Scope discipline on the refactor.** 12 call sites reference plan data across the codebase. 5 had drift-bug-level problems; 7 are currently correct but hardcoded (FAQ page, LandingPage pricing-table rows, LandingPage feature bullets). Phase 1 migrated only the 5 broken sites — the other 7 stay on a Phase 1b backlog, to migrate organically when the next plan change surfaces drift. Smaller deploy, smaller blast radius, cheaper rollback.
- **`canAddRepair()` has been defined-but-unused since Apr 22.** Grep confirmed zero imports anywhere. The repair paywall the beta task plan warned about does not exist — no code enforces a repair limit on any tier. Left the function in place because Garry has a repair gate planned; flipping `repairs: 3` on Free plus one `canAddRepair()` call site in KeeplyApp is now the complete enforcement path (Phase 2, separate deploy).

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
- **Upgrader** — unvalidated in beta. Gap in current cohort.
