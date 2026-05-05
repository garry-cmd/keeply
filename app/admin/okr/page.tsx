"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_EMAIL = "garry@keeply.boats";

// ─── DARK MODE PALETTE — matches /admin/page.tsx ─────────────────────────────
const DARK_BG   = "#060d1a";
const CARD_BG   = "#0d1829";
const CARD_OPEN = "#12223a";
const BDR       = "#1a2d4a";
const MUTED     = "#4a6fa5";
const TEXT      = "#e2e8f0";
const GREEN     = "#34d399";
const RED       = "#f87171";
const AMBER     = "#fbbf24";
const BLUE      = "#7eb3f0";
const PURPLE    = "#a78bfa";
const ORANGE    = "#fb923c"; // rebrand phase — flag as blocker

// ─── DATA — updated each session by Claude ───────────────────────────────────
// Last updated: April 26, 2026 (PM, post-Session-5)

const MONTHS = ["Apr","May","Jun","Jul","Aug","Sep","Oct"];

const PHASES = [
  {
    id: "beta",
    label: "Beta sprint",
    color: BLUE,
    months: [0, 1],
    description: "Stabilise, close beta, mobile audit",
  },
  {
    id: "final",
    label: "Final features",
    color: "#10b981", // emerald — pre-GoLive feature delivery
    months: [0, 1],
    description: "Custom checklists, First Mate history, multi-engine tracking — due May 31",
  },
  {
    id: "hours",
    label: "Hours tracking",
    color: "#06b6d4", // cyan-600 — distinct from social cyan
    months: [0, 1],
    description: "Generalize engine-only hour tracking to any equipment (generators, watermakers, dive compressors, aux outboards) plus parent-engine inheritance for filters/Racors. Schema + AI + Add/Edit/Card UI.",
  },
  {
    id: "lists",
    label: "Lists",
    color: "#f5a623", // gold — strategic founder-driven feature
    months: [0, 1],
    description: "4 surfaces (Parts default / Supplies / Grocery / Haulout). Live for all users (no beta gate). Closes the additive-product gap surfaced by founder dogfooding (Garry kept 4 Todoist lists after a month using Keeply).",
  },
  {
    id: "hygiene",
    label: "Code hygiene",
    color: "#94a3b8", // slate — foundational/infrastructure
    months: [0, 1],
    description: "Error boundary, Prettier, pre-commit, smoke tests, API hardening",
  },
  {
    id: "rebrand",
    label: "Finalize rebrand",
    color: ORANGE,
    months: [0, 1],
    description: "Brand audit + asset generation — BLOCKS iOS/Android submission",
  },
  {
    id: "social",
    label: "Community & social",
    color: "#22d3ee", // cyan
    months: [1, 5],
    description: "YouTube, Facebook Groups, micro-influencers — primary acquisition engine",
  },
  {
    id: "pwa",
    label: "PWA foundation",
    color: PURPLE,
    months: [1, 1],
    description: "Service worker, offline audit",
  },
  {
    id: "capacitor",
    label: "Capacitor",
    color: PURPLE,
    months: [1, 2],
    description: "iOS + Android native shell, push notifications, offline data",
  },
  {
    id: "android",
    label: "Android launch",
    color: GREEN,
    months: [2, 3],
    description: "Google Play — blocked on rebrand",
    blocked: true,
  },
  {
    id: "ios",
    label: "iOS launch",
    color: GREEN,
    months: [3, 4],
    description: "App Store — blocked on rebrand",
    blocked: true,
  },
  {
    id: "growth",
    label: "Growth",
    color: AMBER,
    months: [4, 6],
    description: "Scale what's working — convert community to paid",
  },
];

const OKRS = [
  {
    phase: "beta",
    objective: "Close beta successfully",
    krs: [
      { text: "5 beta testers complete structured task plan (deadline May 1)", cur: 0, target: 5, unit: "testers", status: "on-track" },
      { text: "All 3 personas validated (Active Cruiser, Liveaboard, Upgrader)", cur: 1, target: 3, unit: "personas", status: "on-track" },
      { text: "Feedback received from all testers", cur: 0, target: 5, unit: "responses", status: "not-started" },
      { text: "First Mate query limits — single source of truth (imports from lib/pricing.js)", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "Push notifications validated end-to-end on real device", cur: 1, target: 1, unit: "complete", status: "done" },
    ],
  },
  {
    phase: "final",
    objective: "Deliver final features",
    krs: [
      { text: "Logbook — Custom Checklists (Pro tier)", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "First Mate — Conversation history (all tiers)", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Multi-engine tracking — engines table source of truth, equipment.engine_id FK, passage_engine_hours per-passage, KPI strip handles single/twin/triple+ with discrepancy pulse, FM context per-engine; Phase 3 legacy column drop deferred as hygiene", cur: 1, target: 1, unit: "complete", status: "done" },
    ],
  },
  {
    phase: "hours",
    objective: "Generalize hours tracking beyond engines",
    krs: [
      { text: "Schema: equipment.runtime_hours + runtime_hours_date columns (own-meter equipment)", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "Schema: equipment.hours_tracking column ('meter' | 'parent_engine' | 'none' | NULL legacy)", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "lib/engines.js: getEngineHoursForTask resolves runtime_hours > engine_id > fallback; getEquipmentHoursMode helper for UI dispatch", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "AI structured prompt emits hours_tracking on every equipment item (full vessel onboarding)", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "AI single-item prompt emits hours_tracking + interval_hours on tasks", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "VesselSetup: writes hours_tracking on AI insert with engine-card override (engine_id set → always 'parent_engine')", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "Add Equipment: three-state radio + meter-hours input + parent-engine picker (when vessel has engines)", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "Edit-tab radio: pre-populated from row state with legacy fallback; mode-switching clears unrelated columns correctly", cur: 1, target: 1, unit: "complete", status: "on-track" },
      { text: "Equipment card hours strip (expanded body only): meter / parent_engine variants; hidden for Engine + Vessel cards", cur: 1, target: 1, unit: "complete", status: "on-track" },
      { text: "Inline meter-update sheet — single number input, Enter saves; no full-edit-modal needed for meter bumps", cur: 1, target: 1, unit: "complete", status: "on-track" },
      { text: "Phase 3 deferred: First Mate runtime_hours awareness in vessel-context block", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Phase 3 deferred: 'linked to Port engine' hint badge on parent_engine cards", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Phase 3 deferred: stale-reading hint ('⏱ 845 hr · updated 67 days ago')", cur: 0, target: 1, unit: "complete", status: "not-started" },
    ],
  },
  {
    phase: "lists",
    objective: "Ship Lists — close the additive-product gap",
    krs: [
      { text: "Schema: supplies.completed_at + grocery_items + haulout_items tables (RLS via get_my_vessel_ids())", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "Bottom nav: Lists in slot 5; Profile to header avatar; First Mate kept in nav", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "ListsTab — 4-pill router (Parts default / Supplies / Grocery / Haulout); active pill highly visible (solid brand bg + white text + shadow)", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "PartsView — bubble + archive lifecycle (needed → ordered → received → hidden); action sheet, edit sheet, undo toast on archive", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "SimpleListView — generic component (Supplies + Grocery + Haulout) reading WHERE completed_at IS NULL; tap-bubble + 3.5s undo toast + edit/delete", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "Inline '+ Add item' row at bottom (no FAB) — tap activates input, Enter saves and stays focused, Escape/× cancels", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "Optimistic insert — temp row appears in <16ms; _isTemp flag disables interactions until DB reconciles", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "Killed legacy scaffolding: LandHoShell + useBetaFeature hook + NeedToBuy/old Supplies/old Haulout sub-views (~3000 LOC removed)", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "Admin Lists metrics: Parts Needed/Ordered (count + $value with $1 default + vessels), Supplies/Grocery/Haulout (count + vessels)", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "Polish: extract shared primitives (UndoToast/ActionSheet/EditSheet/Field/SheetButton) from PartsView + SimpleListView dup (~150 LOC)", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Empty-state copy pass after a few days of dogfooding the 4 surfaces", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Pro-gate: Supplies/Grocery/Haulout pills locked for Free/Standard via 'lists' capability; Parts stays free; locked pills tappable, route to 'Pro feature' panel with Upgrade CTA wired to UpgradeModal (May 5)", cur: 1, target: 1, unit: "complete", status: "done" },
    ],
  },
  {
    phase: "hygiene",
    objective: "Establish code hygiene baseline",
    krs: [
      { text: "Error boundary at app root — no white-screen crashes", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "Prettier + format-on-save configured", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "Pre-commit hook (Husky + lint-staged) blocking bad commits", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Playwright smoke tests for 5 critical user paths", cur: 0, target: 5, unit: "tests", status: "not-started" },
      { text: "/api/invite rate limit — 5 invites/hour per authed user", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "/api/stripe/checkout verifies caller JWT (no spoofed userId)", cur: 0, target: 1, unit: "complete", status: "not-started" },
    ],
  },
  {
    phase: "rebrand",
    objective: "Finalize rebrand (blocks iOS/Android)",
    krs: [
      { text: "Brand audit complete — every web/in-app/email surface uses Satoshi + navy + gold + shield", cur: 4, target: 12, unit: "surfaces", status: "on-track" },
      { text: "Mobile app icons generated (iOS 1024×1024 set + Android adaptive icon)", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "iOS launch screen + Android splash screen finalized", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "App Store screenshots + Play Store screenshots + feature graphic", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "OG / social share assets refreshed (og-image.jpg, twitter card, apple-touch-icon)", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Email template chrome aligned with site brand (Resend confirmation, welcome, weekly digest)", cur: 0, target: 1, unit: "complete", status: "not-started" },
    ],
  },
  {
    phase: "social",
    objective: "Build community acquisition engine",
    krs: [
      { text: "keeply.boats added to all 58 YouTube video descriptions", cur: 0, target: 58, unit: "videos", status: "not-started" },
      { text: "Founder story video produced and published", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Active in 5 Facebook sailing groups for 4 weeks pre-launch", cur: 0, target: 5, unit: "groups", status: "not-started" },
      { text: "10 micro-influencer DMs sent", cur: 0, target: 10, unit: "DMs", status: "not-started" },
      { text: "5 micro-influencer partnerships confirmed (free Pro access)", cur: 0, target: 5, unit: "partners", status: "not-started" },
      { text: "All @keeplyapp social handles registered", cur: 0, target: 1, unit: "complete", status: "not-started" },
    ],
  },
  {
    phase: "pwa",
    objective: "PWA foundation ready",
    krs: [
      { text: "Service worker added — app shell loads offline", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Full mobile UX audit complete", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "All internet-dependent flows documented", cur: 0, target: 1, unit: "complete", status: "not-started" },
    ],
  },
  {
    phase: "capacitor",
    objective: "Capacitor integration complete",
    krs: [
      { text: "Capacitor configured for iOS + Android", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Native push notifications wired (FCM + APNs)", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Overdue + coming-due push alerts firing on device", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Offline sync tested and passing", cur: 0, target: 1, unit: "complete", status: "not-started" },
    ],
  },
  {
    phase: "android",
    objective: "Android live on Google Play (blocked on rebrand)",
    krs: [
      { text: "assetlinks.json deployed to keeply.boats", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Play Store listing complete with brand-consistent screenshots", cur: 0, target: 1, unit: "complete", status: "blocked" },
      { text: "App passes review and is live", cur: 0, target: 1, unit: "complete", status: "blocked" },
    ],
  },
  {
    phase: "ios",
    objective: "iOS live on App Store (blocked on rebrand)",
    krs: [
      { text: "DUNS number received", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "Apple Developer account approved", cur: 0, target: 1, unit: "complete", status: "on-track" },
      { text: "App Store listing complete with brand-consistent screenshots", cur: 0, target: 1, unit: "complete", status: "blocked" },
      { text: "App passes App Store review", cur: 0, target: 1, unit: "complete", status: "blocked" },
    ],
  },
  {
    phase: "growth",
    objective: "Prove the acquisition engine works",
    krs: [
      { text: "500+ signups in first 30 days post-launch", cur: 0, target: 500, unit: "signups", status: "not-started" },
      { text: "Free-to-paid conversion ≥ 7%", cur: 0, target: 7, unit: "%", status: "not-started" },
      { text: "Day-7 retention ≥ 35%", cur: 0, target: 35, unit: "%", status: "not-started" },
      { text: "CAC < $50 (community-driven)", cur: 0, target: 50, unit: "$ CAC", status: "not-started" },
      { text: "App Store rating ≥ 4.4 with 50+ reviews", cur: 0, target: 50, unit: "reviews", status: "not-started" },
    ],
  },
];


const BACKLOG_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  "icebox":      { label: "Icebox",      color: MUTED,  bg: `${MUTED}18` },
  "planned":     { label: "Planned",     color: PURPLE, bg: `${PURPLE}18` },
  "in-progress": { label: "In progress", color: BLUE,   bg: `${BLUE}18` },
  "in-beta":     { label: "In beta",     color: AMBER,  bg: `${AMBER}18` },
  "done":        { label: "Done",        color: GREEN,  bg: `${GREEN}18` },
};

const BACKLOG = [
  { name: "Text First Mate",     status: "planned",     effort: "S", notes: "Post-GoLive. Chat with full vessel context." },
  { name: "Consumables tracker", status: "done",         effort: "L", notes: "SUPERSEDED — folded into Lists Session 3 Supplies as the inventory sub-surface (Apr 26). Originally scoped as a separate consumables-on-equipment-cards build; the Supplies pill in Lists now owns this surface area, with location tracking + +/− steppers + Mark received handoff from Need to buy." },
  { name: "Weather (NOAA)",      status: "planned",     effort: "M", notes: "Post-GoLive. Pro tier. Windy co-marketing in Phase 2." },
  { name: "Context-aware FAB",   status: "done",        effort: "S", notes: "Shipped. FAB action changes by active tab." },
  { name: "Departure Check",     status: "planned",     effort: "L", notes: "North star feature. Requires Logbook + Weather + Consumables first." },
  { name: "Layup Mode",          status: "icebox",      effort: "S", notes: "Re-evaluate fall 2026. Pauses maintenance alerts during seasonal layup; repairs stay live; shows 🛌 in health score." },
  { name: "Quick Capture",       status: "icebox",      effort: "M", notes: "Photo → AI ID → one-time or recurring. Phase 2." },
  { name: "Provisioning",        status: "icebox",      effort: "M", notes: "Par system for provisions. Phase 2 / liveaboard persona." },
  { name: "Voice input",         status: "icebox",      effort: "M", notes: "Depends on native mobile app existing." },
  { name: "Windy partnership",   status: "icebox",      effort: "S", notes: "Co-marketing. Approach after scale. Requires mobile app." },
  { name: "Camera equipment ID",status: "icebox",      effort: "M", notes: "Take a photo of an engine plate/equipment label → AI identifies make/model. Net-new feature (not a prompt tweak — requires new API route or extension of scan-document). Genuinely differentiated; no competitor does this. Post-launch." },
  { name: "AI Coins / Credits",  status: "icebox",      effort: "L", notes: "Replace per-month query limits with rollover coin balance. Revisit at 500+ users with real usage data." },
  { name: "Theme audit — restore light mode toggle", status: "icebox", effort: "L", notes: "Current state is dark-only. Full restoration requires auditing ~40% of KeeplyApp.jsx still using hardcoded colors and converting to CSS variables. Only do this if light mode is a real product requirement." },
  { name: "Email verification + soft gates", status: "done", effort: "M", notes: "Shipped Apr 25-26 as custom verification flag (app_metadata.email_self_verified) layered on Supabase autoconfirm. Keeps zero-friction signup; users can self-verify on demand." },
  { name: "Finalize Share Vessel Permissions", status: "planned", effort: "M", notes: "Audit + tighten the member/owner model surfaced during Apr 22 doc-attach debugging. Today: members can update equipment and upload docs (works, via get_my_vessel_ids() RLS function); the equipment table has two overlapping RLS policies (one owner-only, one owner-or-member) that should be consolidated; no UI indicator of who owns the vessel vs who's a member; no role hierarchy beyond owner/member. Scope to define: what can members do (delete vessel? invite/remove other members? change billing? delete docs uploaded by others?), whether to add a viewer/read-only role, RLS cleanup (single policy per table), and UI affordances showing role + attribution (who attached this doc, who closed this repair)." },
  { name: "Extract brand constants → lib/brand.ts", status: "icebox", effort: "S", notes: "Post-launch tech debt. Currently navy/gold/Satoshi constants are inlined in 4 files (SiteHeader, LandingPage, AboutClient, PricingClient). Extract to single source of truth so brand updates touch one file." },
  { name: "Marketing/auth extraction from KeeplyApp monolith", status: "done", effort: "L", notes: "Shipped Apr 28. LandingPage.jsx + AuthScreen.jsx pulled out of components/ root into 8 typed marketing sections at components/marketing/sections/ + components/marketing/{LandingPage.tsx, PhoneScreenshot.tsx} + components/auth/{AuthModal.tsx, PlanPickerModal.tsx, useAuthRedirects.ts}. HomeClient.tsx now owns modal state + lazy-loads KeeplyApp/AuthModal/PlanPickerModal via next/dynamic. Net diff +2754/−3318. KeeplyApp.jsx still ~7,800 lines but its marketing surface area is gone. Pattern is the post-launch template for splitting the rest of the monolith." },
  { name: "PageSpeed mobile — kill walkthrough video autoplay on small viewports", status: "planned", effort: "S", notes: "Apr 28 perf work landed at 78 mobile (was <50). The walkthrough video at public/videos/walkthrough.mp4 is 240 KB and currently autoplays on all viewports including mobile. Switch to preload='metadata' and only autoplay on viewport >= md breakpoint via a simple useMediaQuery + autoPlay prop. Saves up to 240 KB on mobile critical path. Probably 5-10 PageSpeed mobile points." },
  { name: "PageSpeed mobile — preload Satoshi brand font", status: "planned", effort: "S", notes: "Apr 28 LCP element is the H1 'Always ready to go.' which paints in 416ms locally but is gated on Satoshi font load on slow networks. Adding <link rel='preload' as='font' type='font/woff2' crossOrigin='anonymous'> for the headline weight Satoshi woff2 in app/layout.tsx should drop mobile LCP another 0.5-1s. ~3-5 points likely." },
  { name: "Cleanup unused hero-poster.jpg / hero-poster-mobile.jpg in public/images/", status: "planned", effort: "S", notes: "Apr 28: marketing rewrite swapped the image hero for text + phone-mockup-with-video. Apr 27's preload tags pointing at hero-poster.jpg + hero-poster-mobile.jpg were removed today. The two image files are still in the repo (~340 KB total) but referenced nowhere. Delete from public/images/ in a hygiene pass." },
  { name: "Messaging audit — pick canonical Keeply one-liner", status: "planned", effort: "S", notes: "Apr 26 surface: About scrub demoted FM and reframed around coverage (\"every system, every part, every passage\"), but root metadata + OG cards + Twitter still carry \"AI-powered\" / \"Your vessel's First Mate, always ready.\" Pre-launch: pick the canonical one-liner that defines Keeply, then propagate to (1) root metadata description + OG title/desc/alt + Twitter title/desc, (2) App Store listing copy, (3) Google Ads creative, (4) email templates (welcome, verify, digest). Strategic call, not just edit. CONTEXT Hard Rules currently flag the contested state." },
  { name: "FM silent-bail UX hardening", status: "planned", effort: "S", notes: "Apr 26 surfaced via DevTools-throttle debug. send() in FirstMateScreen.jsx L374 silently bails on !context (vessel data fetch failed). User clicks suggested-question chip, nothing happens. ~30 lines: disable chips while context loads, show inline 'Loading your boat's data...', console.warn on bail-out. Plus optional retry-on-network-error wrapper around vessel-data fetches (single 800ms retry catches most blips silently)." },
  { name: "Unify dual Supabase clients", status: "planned", effort: "M", notes: "Apr 26: components/supabase-client.js (hardcoded URL/key, used by KeeplyApp + supa() helper) AND lib/supabase.js (env-var-based, used elsewhere) both call createClient() separately. Produces visible 'Multiple GoTrueClient instances detected' console warning. Latent token-refresh-race risk. Pick env-var pattern, migrate all imports, delete the hardcoded one. ~1-2 hours focused work. Apr 28 update: lazy-load surgery in HomeClient defers supabase off the marketing critical path, so the warning fires less often (only after auth modal opens or for returning users) — but the underlying dual-instance condition is unchanged and still worth unifying." },
  { name: "Lists shared primitives extraction", status: "planned", effort: "S", notes: "Apr 29 tech debt. UndoToast, ActionSheet, EditSheet, Field, SheetButton duplicated (~150 LOC) across components/Lists/PartsView.jsx and components/Lists/SimpleListView.jsx. Extract to components/Lists/shared.jsx and have both views import. Code drift risk if either gets updated independently. ~1 hour focused work." },
  { name: "Engine identity edit affordance on equipment cards", status: "planned", effort: "S", notes: "Apr 29 tech debt. Phase 2G shipped a banner + bottom-sheet modal (~445 LOC) on My Boat tab targeting only 6 vessels (incl. Irene) needing make/model on auto-backfilled engine rows. Once those 6 backfill, the banner code is dead. The bottom-sheet edit modal itself is good UX — re-expose as a permanent 'Edit details' affordance on engine equipment cards (pencil/lock icon that opens this same editor) so it lives on after the banner dies." },
  { name: "Phase 3 multi-engine cleanup — drop vessels.engine_hours legacy columns", status: "planned", effort: "S", notes: "Apr 29: drop vessels.engine_hours, vessels.engine_hours_date, vessels.fuel_burn_rate columns + orphan engine_makes (21 rows) + engine_models (271 rows) tables. IRREVERSIBLE. Sweep codebase for vessels.engine_hours reads first — confirm zero remain — then run the migration. Low priority; current dual-write keeps the legacy columns useful as a safety net." },
];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  "done":        { label: "Done",        color: GREEN, bg: `${GREEN}18` },
  "on-track":    { label: "On track",    color: BLUE,  bg: `${BLUE}18` },
  "at-risk":     { label: "At risk",     color: AMBER, bg: `${AMBER}18` },
  "blocked":     { label: "Blocked",     color: RED,   bg: `${RED}18` },
  "not-started": { label: "Not started", color: MUTED, bg: `${MUTED}18` },
};

const TOTAL_COLS = MONTHS.length;

function pct(cur: number, target: number) {
  if (target === 0) return 100;
  return Math.min(100, Math.round((cur / target) * 100));
}

export default function OKRPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [expanded, setExpanded] = useState<string | null>("beta");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email;
      setAuthed(email === ADMIN_EMAIL);
    });
  }, []);

  if (authed === null) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:DARK_BG, color:MUTED, fontFamily:"system-ui" }}>
      Checking access…
    </div>
  );

  if (!authed) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:DARK_BG, fontFamily:"system-ui" }}>
      <div style={{ fontSize:32, marginBottom:12 }}>⚓</div>
      <div style={{ fontWeight:700, fontSize:18, color:TEXT }}>Admin only</div>
      <div style={{ color:MUTED, fontSize:14, marginTop:6 }}>Sign in as {ADMIN_EMAIL} to access this page.</div>
      <a href="/admin" style={{ marginTop:20, color:BLUE, fontSize:14 }}>← Back to admin</a>
    </div>
  );

  const krCount         = OKRS.length;
  const milestoneCount  = OKRS.flatMap(o => o.krs).length;
  const doneMilestones  = OKRS.flatMap(o => o.krs).filter(k => k.status === "done").length;
  const atRiskMilestones = OKRS.flatMap(o => o.krs).filter(k => k.status === "at-risk" || k.status === "blocked").length;

  return (
    <div style={{ background:DARK_BG, color:TEXT, minHeight:"100vh", fontFamily:"'Inter',system-ui,sans-serif" }}>
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"32px 24px" }}>

      {/* Header */}
      <div style={{ marginBottom:8 }}>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0, color:TEXT }}>⚓ Keeply — 6-Month Roadmap</h1>
          <a href="/admin" style={{ fontSize:13, color:BLUE, textDecoration:"none" }}>← Admin dashboard</a>
        </div>
        <div style={{ marginTop:8, background:`${BLUE}12`, border:`1px solid ${BLUE}40`, borderRadius:8, padding:"10px 14px" }}>
          <span style={{ fontSize:13, fontWeight:700, color:BLUE }}>Objective: </span>
          <span style={{ fontSize:13, color:TEXT }}>Stand up a viable product — stable app, live on both stores, offline capable, with a community-driven acquisition engine.</span>
        </div>
        <div style={{ display:"flex", gap:12, marginTop:12, flexWrap:"wrap" }}>
          {[
            { num: krCount,          label:"KRs",                 color: TEXT },
            { num: milestoneCount,   label:"Milestones",          color: TEXT },
            { num: doneMilestones,   label:"done",                color: GREEN },
            { num: atRiskMilestones, label:"at risk / blocked",   color: RED },
          ].map(s => (
            <div key={s.label} style={{ background:CARD_BG, border:`1px solid ${BDR}`, borderRadius:8, padding:"8px 14px" }}>
              <div style={{ fontSize:20, fontWeight:700, color: s.color }}>{s.num}</div>
              <div style={{ fontSize:12, color:MUTED }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ margin:"28px 0" }}>
        <div style={{ fontSize:12, fontWeight:600, color:MUTED, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>6-Month Sequence</div>

        {/* Month headers */}
        <div style={{ display:"grid", gridTemplateColumns:`130px repeat(${TOTAL_COLS}, 1fr)`, marginBottom:6 }}>
          <div />
          {MONTHS.map((m, i) => (
            <div key={m} style={{ fontSize:12, fontWeight:600, color: i === 0 ? BLUE : MUTED, textAlign:"center", paddingBottom:4, borderBottom: i === 0 ? `2px solid ${BLUE}` : `1px solid ${BDR}` }}>
              {m}{i === 0 ? " ◀ now" : ""}
            </div>
          ))}
        </div>

        {/* Phase bars */}
        {PHASES.map(phase => {
          const [start, end] = phase.months;
          const colStart = start + 2;
          const colEnd = end + 3;
          const barBg     = `${phase.color}1a`;   // ~10% tint
          const barBorder = `${phase.color}55`;   // ~33% border
          return (
            <div key={phase.id} style={{ display:"grid", gridTemplateColumns:`130px repeat(${TOTAL_COLS}, 1fr)`, marginBottom:5, alignItems:"center" }}>
              <div style={{ fontSize:11, fontWeight:600, color:TEXT, textAlign:"right", paddingRight:10 }}>{phase.label}</div>
              <div style={{ gridColumn:`${colStart} / ${colEnd}`, background: phase.blocked
                  ? `repeating-linear-gradient(45deg, ${barBg}, ${barBg} 6px, transparent 6px, transparent 12px)`
                  : barBg,
                border:`1.5px solid ${barBorder}`, borderRadius:6, padding:"5px 10px",
                fontSize:11, color:phase.color, fontWeight:500, display:"flex", alignItems:"center", gap:5 }}>
                {phase.blocked && <span>🔒</span>}
                {phase.description}
              </div>
            </div>
          );
        })}
      </div>

      {/* OKRs */}
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:MUTED, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>Key results by phase</div>

        {OKRS.map(obj => {
          const phase = PHASES.find(p => p.id === obj.phase)!;
          const isOpen = expanded === obj.phase;
          const doneCount = obj.krs.filter(k => k.status === "done").length;
          const anyBlocked = obj.krs.some(k => k.status === "blocked");
          const anyRisk    = obj.krs.some(k => k.status === "at-risk");
          const summaryStatus = anyBlocked ? "blocked" : anyRisk ? "at-risk" : doneCount === obj.krs.length ? "done" : "on-track";
          const sc = STATUS_CFG[summaryStatus];

          return (
            <div key={obj.phase} style={{ marginBottom:6, border:`1px solid ${BDR}`, borderRadius:10, overflow:"hidden", background: isOpen ? CARD_OPEN : CARD_BG }}>
              <div onClick={() => setExpanded(isOpen ? null : obj.phase)}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", cursor:"pointer" }}>
                <div style={{ width:9, height:9, borderRadius:"50%", background:phase.color, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:TEXT }}>{obj.objective}</div>
                  <div style={{ fontSize:11, color:MUTED, marginTop:1 }}>{phase.label}</div>
                </div>
                <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:5, background:sc.bg, color:sc.color }}>{sc.label}</span>
                <span style={{ fontSize:11, color:MUTED }}>{doneCount}/{obj.krs.length}</span>
                <span style={{ color:MUTED, fontSize:11, display:"inline-block", transform: isOpen ? "rotate(90deg)" : "none", transition:"transform 0.15s" }}>▶</span>
              </div>

              {isOpen && (
                <div style={{ borderTop:`1px solid ${BDR}` }}>
                  {obj.krs.map((kr, i) => {
                    const p = pct(kr.cur, kr.target);
                    const s = STATUS_CFG[kr.status];
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 14px", borderBottom: i < obj.krs.length-1 ? `1px solid ${BDR}60` : "none" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, color:TEXT, marginBottom:4 }}>{kr.text}</div>
                          <div style={{ height:4, background:BDR, borderRadius:2, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${p}%`, background:s.color, borderRadius:2 }} />
                          </div>
                          <div style={{ fontSize:11, color:MUTED, marginTop:3 }}>
                            {kr.unit === "$" ? `$${kr.cur} / $${kr.target}` : `${kr.cur} / ${kr.target}${kr.unit ? " "+kr.unit : ""}`} · {p}%
                          </div>
                        </div>
                        <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:5, background:s.bg, color:s.color, flexShrink:0, whiteSpace:"nowrap" }}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Feature Backlog */}
      <div style={{ marginTop:32 }}>
        <div style={{ fontSize:12, fontWeight:600, color:MUTED, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>Feature Backlog</div>
        <div style={{ border:`1px solid ${BDR}`, borderRadius:10, overflow:"hidden", background:CARD_BG }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 100px 60px 220px", background:CARD_OPEN, padding:"8px 14px", borderBottom:`1px solid ${BDR}` }}>
            {["Feature","Status","Effort","Notes"].map(h => (
              <div key={h} style={{ fontSize:11, fontWeight:600, color:MUTED, textTransform:"uppercase", letterSpacing:"0.04em" }}>{h}</div>
            ))}
          </div>
          {BACKLOG.map((item, i) => {
            const sc = BACKLOG_STATUS[item.status] ?? BACKLOG_STATUS["icebox"];
            return (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 100px 60px 220px", padding:"9px 14px", borderBottom: i < BACKLOG.length-1 ? `1px solid ${BDR}60` : "none", alignItems:"start" }}>
                <div style={{ fontSize:13, fontWeight:500, color:TEXT }}>{item.name}</div>
                <div><span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:5, background:sc.bg, color:sc.color }}>{sc.label}</span></div>
                <div style={{ fontSize:12, color:MUTED, fontWeight:600 }}>{item.effort}</div>
                <div style={{ fontSize:12, color:MUTED }}>{item.notes}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop:32, paddingTop:14, borderTop:`1px solid ${BDR}`, fontSize:11, color:MUTED }}>
        Updated by Claude · April 26, 2026 · Source of truth: <code style={{ color:TEXT }}>ROADMAP.md</code> in the repo.
      </div>
    </div>
    </div>
  );
}
