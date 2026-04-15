# Keeply Roadmap
_Last updated: April 14, 2026_

---

## 6-Month Objective (April–October 2026)
**Stand up a viable product.**

A viable product means: stable app, live on both app stores, offline capable, with a community-driven acquisition engine that brings users in without paid ads at scale.

Revenue ($2K → $5K MRR) is the outcome that proves viability — not the objective itself.

---

## Current State

- Web app live at keeply.boats (Next.js / Supabase / Vercel)
- Stripe billing active — Standard ($15/mo) and Pro ($25/mo) tiers
- 5-person closed beta underway (BETA2026 coupon, 100% off)
- TWA (Bubblewrap) built and signed, awaiting Play Store submission
- Google Ads live ($450/mo), Search Console verified
- Admin dashboard live at /admin (garry@keeply.boats only)
- First Mate AI assistant live as bottom-sheet component
- Known bugs batched for post-beta deploy (see Bugs section)

---

## Active Sprint — Beta Stabilisation (April–May 2026)

**Goal:** Close beta cleanly before any infrastructure or store work.

- [ ] Fix: vessel name appearing as equipment item from AI auto-population
- [ ] Fix: pasted spec sheet text stored verbatim in model/make fields (no truncation)
- [ ] Collect structured feedback from all 5 beta testers
- [ ] Validate all 3 personas (Active Cruiser, Liveaboard, Upgrader)
- [ ] Mobile UX audit — identify layout issues before Capacitor wrap

**Do not start Capacitor or social buildout until beta is closed.**

---

## Phase 1 — Community & Social Foundation (May 2026)

_This runs in parallel with PWA/Capacitor work. Organic community is the primary
acquisition channel — paid ads only make sense once conversion is validated._

**Content & Community:**
- [ ] Add keeply.boats to all YouTube video descriptions (58 videos — quick win)
- [ ] Produce "built by a sailor, for sailors" founder story video
- [ ] Join and be present in top 5 Facebook Groups (Cruisers Forum, Pacific Puddle Jump, Women Who Sail, Sailing Anarchy, Bluewater Cruising)
- [ ] Post 3x/week in groups — maintenance tips, not product pitches — for 4 weeks before any product post
- [ ] Identify 15 micro-influencer targets (5K–50K followers, sailing/cruising niche)
- [ ] Send 10 personalised outreach DMs — free Pro access in exchange for honest post
- [ ] Register @keeplyapp on Instagram, TikTok, YouTube, Facebook, X

**The math:** Community + YouTube + 5 micro-influencers gets to ~2,000–5,000 visitors/month organically. At 4% signup and 7% conversion, that's 5–14 new paid users/month at near-zero CAC. That's the real path to $2K MRR — not $49K/month in ads.

---

## Phase 2 — PWA Foundation (May 2026)

_Prerequisite for Capacitor. Low risk, high value regardless._

- [ ] Add next-pwa service worker — app shell loads offline
- [ ] Audit all flows that require live internet — document them
- [ ] Verify back-button / navigation behaviour on mobile devices
- [ ] Fix any mobile layout issues surfaced in beta audit

---

## Phase 3 — Capacitor Integration (May–June 2026)

_Single integration targeting both Android and iOS. Replaces TWA._

- [ ] Install and configure Capacitor for iOS + Android targets
- [ ] Wire native push notifications (FCM for Android, APNs for iOS)
- [ ] Build overdue + coming-due push alert triggers
- [ ] Replace TWA with Capacitor-built APK for Google Play
- [ ] Offline data: IndexedDB local mirror via PowerSync or ElectricSQL
- [ ] Test offline: open app, kill wifi, core flows still work
- [ ] Sync queue — mutations replay on reconnect

---

## Phase 4 — Android Launch (June–July 2026)

- [ ] Deploy /.well-known/assetlinks.json to keeply.boats
- [ ] Create Google Play developer account ($25 one-time)
- [ ] Complete Play Store listing (copy ready in marketing plan)
- [ ] Submit for review (3–7 day turnaround)
- [ ] App live on Google Play

---

## Phase 5 — iOS Launch (July 2026)

_Blocked on DUNS → Apple Developer Program ($99/yr)_

- [ ] DUNS number received ← **BLOCKED**
- [ ] Apple Developer Program approved ← **BLOCKED**
- [ ] Build iOS target in Xcode, pass App Store review
- [ ] App live on App Store

---

## Phase 6 — Growth (August–October 2026)

_Viable product is live. Now scale what's working._

- [ ] Analyse actual free→paid conversion from first 60 days
- [ ] If CAC < LTV/3: increase ad budget
- [ ] Hire/contract social media creator (boating enthusiast, $500–1K/mo + rev share)
- [ ] Activate top-tier influencer outreach once social proof exists
- [ ] $2K MRR milestone
- [ ] $5K MRR milestone — quit day job

---

## Feature Backlog (Priority Order)

1. **Logbook** — passages + daily entries, auto-enriched with weather/GPS/engine hours
2. **Engine hours** — dual-trigger consumables (time AND hours)
3. **Consumables tab** on equipment cards (pre-populated at onboarding)
4. **Text First Mate** — chat with full vessel context
5. **Weather API** — NOAA/Open-Meteo free tier
6. **Provisioning & par system**
7. **Voice input**
8. **Full Departure Check** — north star feature
9. **Voice output**
10. **Windy partnership** — Phase 2 co-marketing
11. **Trigger-based email notifications** — overdue + 7-day warning (Supabase cron + Resend)
12. **FAB (floating action button)** — context-aware per tab (deferred pending beta feedback)

---

## Infrastructure — Pre-Scale Upgrades Needed

| Service | Upgrade | Cost | Trigger |
|---|---|---|---|
| Supabase | Pro | $25/mo | Before public launch |
| Resend | Starter paid | $20/mo | Before public launch |

---

## Known Bugs (Post-Beta Deploy)

- Vessel name appearing as equipment item from AI auto-population
- Pasted spec sheet text stored verbatim in model/make fields (no truncation)

---

## Post-Launch Tech Debt

- Split KeeplyApp.jsx (~7,900 lines) into sub-components
- Stripe webhook coverage: trial_will_end, invoice.payment_failed, subscription.updated
- 14-day trial Stripe flow cleanup

---

## Decisions Made / Won't Do

- TWA will be retired once Capacitor APK is built — do not submit TWA to Play Store
- No React Native rewrite — Capacitor wraps existing Next.js app
- Share Vessel stays ungated (viral growth mechanic — deliberate)
- No Capacitor or offline work before beta sprint is closed
- Fleet tier deferred until $2K MRR is reached
- Paid ads are a validation tool only until CAC/LTV math is proven
- Primary acquisition = community, YouTube, micro-influencers — not paid search
