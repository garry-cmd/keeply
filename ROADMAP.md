# Keeply Roadmap
_Last updated: April 22, 2026_

> **Granular tracking lives at [`/admin/okr`](https://keeply.boats/admin/okr).**
> This document is the strategic frame — swim lanes, sequencing, and decisions.
> KR-level progress, milestone counts, and status flags are maintained on the OKR page.

---

## 6-Month Objective (April–October 2026)

**Stand up a viable product.**

A viable product means: stable app, live on both app stores, offline capable, with a community-driven acquisition engine that brings users in without paid ads at scale.

Revenue ($2K → $5K MRR) is the outcome that proves viability — not the objective itself.

---

## Swim lanes

The OKR page visualises these as a 6-month timeline. Summary here:

| # | Swim lane              | When       | Owner   | State          |
|---|------------------------|------------|---------|----------------|
| 1 | Close beta             | Apr–May 1  | Garry   | At risk (0/5)  |
| 2 | Deliver final features | Apr–May 31 | Garry   | In progress    |
| 3 | Code hygiene           | Apr–May    | Garry   | On track (3/7) |
| 4 | Community & social     | May–Sep    | Marty   | Not started    |
| 5 | PWA foundation         | May        | Garry   | Not started    |
| 6 | Capacitor integration  | May–Jun    | Garry   | Not started    |
| 7 | Android launch         | Jun–Jul    | Garry   | Not started    |
| 8 | iOS launch             | Jul–Aug    | Garry   | 1/3 (DUNS ✓)   |
| 9 | Growth                 | Aug–Oct    | Both    | Not started    |

---

## Current state

- Web app live at keeply.boats (Next.js / Supabase / Vercel)
- 5-person closed beta underway; +2 testers joining this week
- Stripe billing active — Free / Standard / Pro / Fleet tiers, DB-driven pricing
- First Mate AI assistant live (bottom sheet + full screen), ~90% feature-complete
- Logbook live (passages + watch entries + pre-departure + arrival checklists), ~90% feature-complete
- Engine hours shipped for single-engine (vessels.engine_hours + auto-update from logbook)
- Admin dashboard at `/admin`; OKR tracker at `/admin/okr`
- Google Ads live, Search Console + GA4 + PostHog + Microsoft Clarity instrumented
- DUNS number received — Apple Developer application in flight
- Google Play account verification in flight

---

## Active sprint — Close beta + Deliver final features (April–May 2026)

Two KRs run in parallel pre-GoLive:

### Close beta successfully (deadline May 1)

Stabilise and validate before any infrastructure or store work.

- 5 beta testers complete structured task plan
- All 3 personas validated (Active Cruiser ✓, Liveaboard ✓, Upgrader ✗)
- Structured feedback received from all testers
- Zero critical bugs outstanding
- First Mate query limits unified against `plan_limits` table (UI + API agree)
- Push notifications validated end-to-end on real device

### Deliver final features (due May 31)

Three net-new features that need to ship before GoLive:

- **Logbook — Custom Checklists** (Pro tier)
- **First Mate — Conversation history** (all tiers)
- **Multi-engine tracking**

**Do not start Capacitor or community buildout until beta is closed.**

---

## Code hygiene (April–May 2026)

Pre-launch baseline to prevent scaling pain.

- ✓ Error boundary at app root — no white-screen crashes
- ✓ PostHog capturing production errors
- ✓ Prettier + format-on-save configured
- Pre-commit hook (Husky + lint-staged) blocking bad commits
- Playwright smoke tests for 5 critical user paths
- `/api/invite` rate limit — reject if caller sent >5 invites in the past hour (closes the spam-vector surface without verification plumbing)
- `/api/stripe/checkout` verifies caller JWT — rejects if client-sent `userId` doesn't match `token.sub` (closes userId spoofing)

---

## Community & Social (May–September 2026) — Marty's OKR

Organic community is the primary acquisition channel. Paid ads only make sense once conversion is validated.

- Add keeply.boats to all 58 YouTube video descriptions (quick win)
- Produce founder story video — "built by a boater, for boaters"
- Active presence in 5 Facebook sailing groups for 4 weeks pre-launch
- 10 micro-influencer DMs, 5 partnerships (free Pro in exchange for honest content)
- All @keeplyapp social handles registered

**The math:** Community + YouTube + 5 micro-influencers ≈ 2,000–5,000 visitors/month organically. At 4% signup and 7% conversion, that's 5–14 new paid users/month at near-zero CAC.

---

## PWA foundation (May 2026)

Prerequisite for Capacitor. Low risk, high value regardless.

- Service worker — app shell loads offline
- Full mobile UX audit
- Document all internet-dependent flows

---

## Capacitor integration (May–June 2026)

Single integration targeting both Android and iOS. Not TWA — Capacitor wraps the Next.js app directly.

- Capacitor configured for iOS + Android
- Native push notifications wired (FCM + APNs)
- Overdue + coming-due push alerts firing on device
- Offline sync tested and passing

---

## Android launch (June–July 2026)

- `assetlinks.json` deployed to keeply.boats
- Play Store listing complete with screenshots
- App passes review and is live

---

## iOS launch (July–August 2026)

- ✓ DUNS number received
- Apple Developer account approved
- App passes App Store review

---

## Growth (August–October 2026)

Viable product is live. Scale what's working.

- 500+ signups in first 30 days post-launch
- Free-to-paid conversion ≥ 7%
- Day-7 retention ≥ 35%
- CAC < $50 (community-driven)
- App Store rating ≥ 4.4 with 50+ reviews

---

## Post-GoLive feature backlog (priority order)

Features deferred until after GoLive ships. Ordered by strategic value:

1. **Consumables tracker** — fluids, filters, spare parts on equipment cards (pairs with engine hours for dual-trigger)
2. **Text First Mate** — chat with full vessel context
3. **Weather API** — NOAA/Open-Meteo free tier; Pro tier
4. **Departure Check** — north star; requires Weather + Consumables first
5. **Voice input** for First Mate (depends on native shell)
6. **Provisioning & par system**
7. **Voice output**
8. **Windy partnership** — co-marketing, Phase 2
9. **Quick Capture** — photo → AI identify → one-time or recurring (depends on Camera equipment ID)
10. **Camera equipment ID** — photo of engine plate → AI identifies make/model (net-new, differentiated)
11. **AI Coins / Credits** — replace per-month query limits with rollover balance (revisit at 500+ users)

---

## Icebox (re-evaluate later)

- **Layup Mode** — re-evaluate fall 2026 when PNW/Northeast users approach layup. Named "Layup Mode" not "Away Mode" (boaters understand the term). Pauses maintenance alerts; repairs stay live; shows 🛌 in health score explicitly.
- **Vessel notes** — freeform field for marina slip, radio channels, anchorage depths
- **Terminology audit** — replace "task" with "maintenance" throughout app UI (website already done)
- **Offline-first logbook** for offshore use
- **Theme audit** — restore light mode toggle (currently dark-only; ~40% of KeeplyApp.jsx uses hardcoded colors)
- **Insurance sponsorship model** (BoatUS/Geico) — requires consumer scale first
- **Email verification + soft gates** — banner nudge + gates on `/api/stripe/checkout`, `/api/invite`, `/api/cron/weekly-digest`. Blocked by Supabase auto-confirm: with "Confirm email" OFF, `email_confirmed_at` is populated at signup and `.resend({type:'signup'})` is a no-op on already-confirmed users (verified empirically Apr 22). Implementation paths: (a) service-role un-confirm immediately post-signup, (b) roll our own `user_profiles.email_verified_at` column + token flow, (c) move to OAuth-primary (Google/Apple) and treat email/password as the minority path. At 14 users the fraud/spam/cost risk is theoretical; revisit at 500+ users or earlier if invite abuse surfaces.

---

## Infrastructure — pre-scale upgrades

| Service   | Upgrade       | Cost     | Trigger               |
|-----------|---------------|----------|-----------------------|
| Supabase  | Pro           | $25/mo   | Before public launch  |
| Resend    | Starter paid  | $20/mo   | Before public launch  |

---

## Post-launch tech debt

- Split `KeeplyApp.jsx` (~26k lines post-Prettier, ~8k substantive) into sub-components
- Convert remaining `.jsx` → `.tsx`
- Stripe webhook coverage: `trial_will_end`, `invoice.payment_failed`, `subscription.updated`
- Full theme audit / CSS variables
- Repo cleanup: remove `.bak` files, one-shot patch scripts at repo root

---

## Decisions made / won't do

- **No TWA** — Capacitor wraps Next.js directly. TWA path retired.
- **No React Native rewrite** — Capacitor is the answer.
- **Share Vessel stays ungated** — viral growth mechanic, deliberate.
- **No Capacitor or community buildout before beta closes.**
- **Fleet tier deferred** until $2K MRR is reached.
- **Paid ads are a validation tool** only, until CAC/LTV math is proven.
- **Primary acquisition = community + YouTube + micro-influencers**, not paid search.
- **Dark mode only** through launch. Light mode toggle is icebox unless a real product requirement emerges.
