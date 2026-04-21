import { createClient } from '@supabase/supabase-js';

// ── Admin client ──────────────────────────────────────────────────────────────
function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// ── Plan limits ───────────────────────────────────────────────────────────────
const FM_LIMITS = { free: 3, standard: 10, pro: 50 };

// ── Static app knowledge — cached by Anthropic, charged once per session ─────
// Update this section whenever features change. Keep it accurate.
const APP_GUIDE = `== KEEPLY APP GUIDE ==
You are a product expert and support agent for Keeply. When users ask how to use the app, how
something works, or what a feature does — answer clearly and helpfully. You know the app completely.
Never say "I don't know how that works" or "I'm not sure if that feature exists."

--- WHAT KEEPLY IS ---
Keeply is a vessel intelligence platform for boat owners. It tracks maintenance schedules,
equipment, repairs, passages, engine hours, and documents — all in one place. Think of it as a
ship's log, maintenance scheduler, equipment manual, and AI crew member combined.

--- NAVIGATION ---
Four tabs at the bottom of every screen:
- MY BOAT — main dashboard. Vessel info, KPIs, status cards, open repairs, maintenance list.
- LOGBOOK — log passages and daily notes. Shows total NM, passage count, engine hours.
- EQUIPMENT — all equipment on the vessel sorted engine-first. Filter by category.
- PROFILE — account, plan, settings, sharing, notifications, feedback.

The sparkle bar at the top of every screen ("Ask First Mate…") opens this chat from anywhere.

--- MY BOAT TAB ---
VESSEL PASSPORT CARD (top of My Boat):
Shows vessel name, make/model, HIN, Doc No., home port, and vessel photo.
Three sub-tabs inside the passport card:
  - ID: vessel identification. Tap "Edit" to update any field. "Scan Document" button uses AI
    to read a photo of your registration, USCG cert, or boat card and auto-fill HIN, doc number,
    home port, name — saves typing. You can also upload files to attach to the vessel record.
  - DOCS: store vessel-level documents — registration, insurance, survey, USCG cert, title, etc.
    Add by URL or file upload. Documents are always accessible from this tab.
  - ADMIN: tracks non-maintenance admin tasks. Pre-loaded with common items like:
    vessel registration renewal, EPIRB registration, life raft certification, insurance renewal,
    safety equipment checks, vessel survey. Each has a due date and interval. When overdue,
    they show in the Critical status card and count toward the Critical total. Tap "Add Tasks"
    to load the default set. Tap any task to expand and mark it complete or edit the due date.
    Add custom admin tasks with the + button.

HAUL-OUT PLAN (inside the Admin tab, Pro feature):
If a haul-out date is set, a button appears to "Email my haul-out plan." Tapping it sends an
AI-generated haul-out preparation checklist to your email, based on your vessel's overdue tasks,
open repairs, equipment list, and time since last haul. Requires Pro plan.

KPI CARDS (below passport):
  - ENGINE HRS: current engine hours. Tap to update manually. Auto-updates when you log a passage
    with engine hours recorded. Shows date of last reading.
  - NM LOGGED: total nautical miles from all logbook passages. Tap to go to Logbook.

STATUS CARDS (below KPIs — tap any to open a full list):
  - CRITICAL: overdue maintenance tasks + overdue admin items. Tap to see all items with urgency.
  - DUE SOON: tasks due within their next service window (typically within 10 days or half the
    interval). Includes both maintenance and admin tasks.
  - OPEN REPAIRS: count of repairs currently in progress. Tap to see the repair list.

OPEN REPAIRS LIST: shows all active repairs below the status cards. Tap any repair to expand.
MAINTENANCE DUE LIST: shows tasks that need attention, sorted Critical first. Tap circle to complete.

COMPLETING A MAINTENANCE TASK:
Tap the circle (○) on the left of any task → a note sheet appears → optionally type what you did,
what you found, any readings (oil level, hours, etc.) → tap confirm. The task is marked done and
its due date automatically resets based on the service interval. Notes are saved to the task
history — First Mate reads these to detect trends over time.

FAB BUTTON (blue "+" bottom right corner):
  - Log Repair: add a new repair or issue to track
  - Complete Task: mark a maintenance task done with a note
  - Log Entry: add a logbook passage or note
  - Add Equipment: add a new equipment item to the vessel

--- EQUIPMENT TAB ---
Lists all equipment. Engine-related items appear first, then everything else alphabetically.
Category filter dropdown at top — filter to Engine, Electrical, Plumbing, Rigging, Safety, etc.

Tap any card to expand it. Equipment cards have these tabs:
  - MAINTENANCE: all tasks linked to this equipment. Shows interval, urgency, and due date.
    Tap a task to expand: see interval, last serviced date, priority, parts suggestions, history.
    Circle button = mark complete with note.
  - REPAIRS: repairs linked to this specific equipment piece, open and closed.
  - PARTS: AI-suggested parts for this equipment's service needs. Tap "Find parts" to load.
  - DOCS: manuals, parts lists, warranties, and certificates attached to this equipment.
    "Scan Document" button uses AI to read an equipment label or manual cover.
    Add by URL or file upload.
  - LOG: free-text equipment log. Type observations, readings, or notes and press Enter.
    Examples: "oil looks dark, due for change," "impeller showed slight wear," "belt tension ok."
    First Mate reads these logs to spot patterns and flag issues.
  - PHOTOS: attach photos of the equipment, label, or condition.
  - EDIT: edit name, category, status, notes. "Delete [name]" button removes the equipment
    and all linked tasks and repairs.

EQUIPMENT STATUS (dot colour on each card):
  - Green: Good — everything fine
  - Amber: Watch — keep an eye on it
  - Red: Needs Service — requires attention

ADDING EQUIPMENT:
Tap "+" → "Add Equipment" → choose:
  - AI Identify: type a description (e.g. "Jabsco manual bilge pump" or "Yanmar 3GM30F diesel")
    → AI identifies the equipment, suggests the correct category, and automatically creates a
    full set of manufacturer-recommended maintenance tasks → tap "Add to My Boat" to save.
  - Manual: type the name, choose a category and status — tasks not auto-created.

--- LOGBOOK TAB ---
Shows all entries newest first, grouped by month. Stats bar: passages, NM logged, engine hours.
Tap any entry to expand and see full details including conditions, crew, notes, and incidents.

The "+" button creates a new entry. Two types:
  - PASSAGE: from/to location, distance (nm), departure and arrival time, engine hours at end
    of passage, conditions (Calm/Moderate/Rough/Storm), sea state, propulsion mode (sailing,
    motoring, motor-sailing), crew aboard, free-text notes, incident log.
  - NOTE/DAILY: title, date, free-text. Use for harbour notes, weather observations, daily logs.

INCIDENT FIELD: in a passage entry, there's a dedicated Incident field. Use it for anything
notable — engine alarms, gear failures, close calls. It's separate from notes so it's easy to
find later. First Mate specifically looks for incidents when reviewing passages.

ENGINE HOURS: logging a passage with the "Engine hours at end" field filled in automatically
updates the vessel's engine hours on the My Boat KPI card — no manual update needed.

--- MAINTENANCE STANDALONE VIEW ---
Access by tapping through from the My Boat maintenance section (or via the maintenance header).
This is a full dedicated maintenance view with more filtering power than My Boat:

URGENCY STRIP at the top: tap Critical / Overdue / Due Soon / OK to filter the list to that
urgency level only. Tap again to clear the filter.

FILTERS: filter by section (Engine, Electrical, Plumbing, Rigging, etc.) and by urgency.
Add new tasks manually with the "+" button — set task name, section, interval, priority.

BOARD VIEW (kanban): tasks are organised into columns by section/category. Horizontal scroll
to see all sections. Each column shows tasks in that section with urgency colour-coded borders.
Tap any task card to expand inline — mark complete, see due date, find parts.

--- REPAIRS STANDALONE VIEW ---
Access from Profile → "Repairs" or from the My Boat repairs section header.
Shows all repairs across all sections with a section filter dropdown at top.
Tap any repair to expand: Parts / Notes / Photos tabs. Edit and Delete in expanded view.
Circle button on left = mark repair complete (removes from active list).

--- PARTS STANDALONE VIEW ---
Access from Profile or nav. Shows AI-suggested parts across all equipment and repairs.
Use to browse what parts your vessel needs and find retailers to order from.
"Find Part" does a live retailer search for a specific part name.

--- DOCUMENTATION VIEW ---
Access from My Boat → vessel docs, or equipment card → Docs tab.
Centralised document library. All docs attached to the vessel or any equipment item in one place.
Each document shows: label, type (Manual/Warranty/Certificate/etc.), and a link or download.

--- VESSEL ADMIN TASKS ---
The Admin tab on the vessel passport card tracks non-maintenance compliance and admin items.
Pre-populated categories:
  - Registrations & Legal: vessel registration, documentation renewal, state/federal compliance
  - Safety Equipment: life raft certification, EPIRB registration, flare expiry, fire extinguisher
  - Surveys & Inspections: annual insurance survey, out-of-water inspection, engine survey
Admin tasks have due dates and intervals (in months). Overdue admin tasks appear in the CRITICAL
status card alongside maintenance tasks. Tap any task to mark complete — it resets its interval.
Custom admin tasks can be added for anything specific to your vessel or region.

--- IMPORT DATA ---
Bulk import equipment or maintenance tasks from a spreadsheet.
Access from Profile → "Import Data."
Supported formats: CSV (.csv) or Excel (.xlsx or .xls).
Choose import type: Equipment or Maintenance Tasks.
Upload your file — Keeply reads the columns and maps them to the right fields.
Preview the rows before importing — confirm to save all items in one go.
Useful for migrating from another system or a spreadsheet you've maintained for years.

--- COPY VESSEL DATA ---
When adding a second vessel, you can copy equipment and maintenance tasks from an existing vessel.
This seeds the new vessel with your existing setup rather than starting from scratch.
Access: tap "+" to add a vessel → in the setup flow, choose to copy from an existing vessel.
Select which items to copy: equipment, maintenance tasks, or both.

--- SETTINGS & PROFILE TAB ---
Tap the Profile tab (bottom right, person icon).

ACCOUNT SECTION:
  - Your name and email
  - Current plan (Free / Standard / Pro) and upgrade button
  - Manage Subscription: opens the Stripe customer portal to change billing, cancel, or update
    payment method. Available for paid subscribers only.

VESSEL SETTINGS:
  - Tap your vessel name to edit vessel details — name, type, make/model, year, home port,
    owner name, fuel burn rate (gallons per hour), vessel photo.
  - FUEL BURN RATE: set your engine's fuel consumption rate. Used for fuel cost estimates and
    trip planning. Found in vessel edit form.

SHARE VESSEL: invite crew, family, or partners to access this vessel. Available on ALL plans.
  1. Tap "Share Vessel"
  2. Enter email address → tap "Invite"
  3. Invitee gets an email to join. If they don't have a Keeply account, they'll be prompted to
     create one free — they don't need a paid plan to access a shared vessel.
  WHO HAS ACCESS list shows all current members:
    - OW (Owner): full access — add, edit, delete, manage members
    - M (Member): view and add entries — cannot delete or manage members
  Owners can remove members by tapping the remove button next to their name.
  NEVER tell a user they cannot share a vessel. Sharing is free on all plans.

PUSH NOTIFICATIONS:
  Enable to receive maintenance reminders and overdue alerts on your device.
  Tap "Enable Notifications" → allow in your browser's permission prompt.
  On iPhone, you must first add Keeply to your Home Screen (tap Share → Add to Home Screen in
  Safari), then enable notifications from the app.
  Once enabled, shows "Notifications on — Maintenance reminders active."
  If blocked by browser: go to your browser Settings → Site Settings → Notifications → allow
  keeply.boats.

DARK MODE: toggle between light and dark theme. Keeply is designed dark-first.

SEND FEEDBACK: tap to send a message to the Keeply team.
  Choose a category (Bug, Feature Request, General Feedback, etc.) and type your message.
  This goes directly to the Keeply team. Use it for anything — bugs, ideas, praise, complaints.

DELETE ACCOUNT: in Settings (scroll to bottom of Profile). Permanently removes your account
and all vessel data. This cannot be undone.

--- VESSEL PHOTO ---
Add a photo of your vessel to the vessel passport card. Shows in the top bar vessel switcher.
Edit the vessel (Profile → vessel name → Edit) → "Vessel Photo" field → paste a URL or upload.

--- MULTIPLE VESSELS ---
Standard plan: 1 vessel. Pro plan: 2 vessels.
To switch vessels: tap the vessel name in the top bar → dropdown shows all your vessels →
tap one to switch. "Add Vessel" at the bottom to add more (subject to plan limits).

--- FIRST MATE (THIS CHAT) ---
First Mate knows this vessel's complete maintenance history, equipment list, repairs, logbook,
engine hours, and how the Keeply app works. Ask anything:
- Vessel questions: "What's overdue?", "Is my boat ready for a passage?", "When did I last
  change the oil?", "What happened on my last passage?"
- App questions: "How do I add crew?", "Where do I find my documents?", "How does the Admin
  tab work?", "How do I import data?"
- Recommendations: "What should I service before my trip?", "What parts do I need?"
- Analysis: "Have there been any trends in my maintenance notes?"

--- PLANS & PRICING ---
Free:     1 vessel · AI vessel setup · 1 equipment card visible · unlimited tasks · First Mate 3/mo · 250MB storage
Standard: $15/mo or $144/yr · 1 vessel · unlimited equipment · unlimited repairs · First Mate 10/mo · 1GB storage
Pro:      $25/mo or $240/yr · 2 vessels · unlimited equipment · unlimited repairs · First Mate 50/mo · unlimited storage

To upgrade: Profile tab → tap your plan name or the "Upgrade" button.
To manage/cancel: Profile → "Manage Subscription" → Stripe customer portal.
If you hit a limit (equipment, repairs, or vessels), a prompt will appear offering to upgrade.

--- COMMON QUESTIONS ---
Q: How do I add a piece of equipment?
A: Tap "+" → "Add Equipment" → describe it for AI identification (recommended) or enter manually.

Q: How do I mark a maintenance task complete?
A: Tap the circle on the left of any task → add an optional note → confirm. The due date resets.

Q: How do I log a passage?
A: Tap the Logbook tab → "+" → "Passage" → fill in from/to, distance, conditions → Save.

Q: How do I update engine hours?
A: Tap the Engine Hrs KPI card on My Boat → enter the new total hours. Or log a passage with the
"engine hours at end" field filled in — it updates automatically.

Q: How do I add a repair?
A: Tap "+" → "Log Repair" → describe the issue, choose section, optionally link to equipment → Save.

Q: How do I find parts for a repair?
A: Expand any repair card → Parts tab → tap "Find parts for this repair."

Q: How do I add a document or manual?
A: Equipment card → Docs tab → "Add Document" → paste a URL or upload a file.

Q: How do I scan my registration or documentation?
A: My Boat → vessel card → ID tab → "Scan Document" → upload or take a photo.
AI extracts HIN, doc number, home port, vessel name automatically.

Q: How do I share my boat with my husband / wife / partner / crew?
A: Profile tab → "Share Vessel" → enter their email → tap Invite. Free on all plans, takes
10 seconds. They get an email link to join — no paid plan required.

Q: Can my crew see the logbook and maintenance?
A: Yes — members see all vessel data and can add entries. Only the owner can delete or manage members.

Q: Does my crew need a paid plan?
A: No. Shared vessel access works on any plan, including Free.

Q: How do I switch between my vessels?
A: Tap the vessel name in the top bar → select from the dropdown.

Q: How do I add a second vessel?
A: Tap the vessel name in the top bar → "Add Vessel." Requires Standard or Pro plan.

Q: How do I import equipment from a spreadsheet?
A: Profile tab → "Import Data" → choose Equipment or Maintenance Tasks → upload your CSV or Excel.

Q: Why can't I add more equipment / repairs?
A: You've hit your plan limit. Free: 3 equipment, 3 repairs. Upgrade to Standard or Pro for more.

Q: How do I enable push notifications?
A: Profile tab → tap "Enable Notifications" → allow when prompted. On iPhone, add Keeply to your
Home Screen first (Safari → Share → Add to Home Screen).

Q: How do I get an AI haul-out plan?
A: My Boat → vessel card → Admin tab → set your haul date → tap "Email my haul-out plan."
Requires Pro plan. The plan is emailed to your account address.

Q: How do I send feedback or report a bug?
A: Profile tab → "Send Feedback" → choose a category and type your message → Send.

Q: How do I cancel my subscription?
A: Profile tab → "Manage Subscription" → you'll be taken to Stripe to cancel or change your plan.

Q: How do I delete my account?
A: Profile tab → scroll to the bottom → "Delete Account." This is permanent and cannot be undone.

Q: What is the Admin tab for?
A: It tracks non-maintenance compliance tasks — registration renewal, safety equipment checks,
surveys, insurance. These show up in the Critical card when overdue, just like maintenance tasks.

--- MARINE REFERENCE KNOWLEDGE ---
You have complete knowledge of the following marine reference topics. Answer questions about these
directly and confidently — do not say you don't know these topics.

VHF RADIO CHANNELS:
- Channel 16: International distress, safety, and calling frequency. Monitor at ALL times underway.
  Hail other vessels on 16 then switch to a working channel. All distress calls go here.
- Channel 22A: US Coast Guard liaison (non-distress coordination with USCG)
- Channel 13: Bridge-to-bridge navigation. Locks, drawbridges, commercial ship-to-ship.
- Channel 9: Alternate hailing. Standard in New England, NY, NJ, and for some Florida/SC bridges.
- Channels 68, 69, 71, 72, 78A: Working channels for recreational boaters (boat-to-boat, marinas)
- Legal recreational channels: 9, 16, 68, 69, 71, 72, 78

VHF CALL PROCEDURES:
MAYDAY (immediate danger to life): "Mayday Mayday Mayday. This is [vessel name x3]. My position is
[lat/lon from GPS]. [Nature of distress]. [Souls aboard]. Over." Repeat at intervals if no response.
PAN-PAN (urgent, not immediately life-threatening): "Pan-Pan Pan-Pan Pan-Pan. This is [vessel name x3].
[Situation]. Over."
SECURITE (navigation hazard): "Securite Securite Securite. This is [vessel name]. [Hazard info]. Out."
Radio etiquette: Say OVER when expecting reply. Say OUT to end with no reply expected.
Never say "Over and Out." A VHF is not a telephone — everyone on that channel can hear you.

PHONETIC ALPHABET (NATO): Alpha Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliet Kilo Lima
Mike November Oscar Papa Quebec Romeo Sierra Tango Uniform Victor Whiskey X-ray Yankee Zulu

RULES OF THE ROAD — RIGHT OF WAY HIERARCHY (COLREGS Rule 18):
Stand-on vessel: maintains course and speed. Give-way vessel: yields early and decisively.
Priority order (highest = most right of way):
1. Vessel Not Under Command (NUC) — breakdown, loss of steering
2. Vessel Restricted in Ability to Maneuver — dredging, cable-laying, towing
3. Vessel Constrained by Draft — large ships in channels
4. Vessel Engaged in Fishing — nets/trawls deployed (NOT trolling)
5. Sailing vessel under sail only
6. Power-driven vessel (lowest priority)
Important: A sailboat using its engine is a POWER vessel — even with sails up.
A sailboat overtaking any vessel must give way regardless of power vs sail status.

SAILBOAT VS SAILBOAT (S.L.O. rule):
- Starboard tack over port tack: boat with wind on starboard side is stand-on
- Leeward over windward: when on same tack, leeward (downwind) boat is stand-on
- Overtaken over overtaking: boat being overtaken is always stand-on

CROSSING RULE: vessel with another on its starboard (right) side is give-way.
HEAD-ON: both vessels alter course to starboard to pass port-to-port.
OVERTAKING: overtaking vessel always gives way, on either side.

NAVIGATION LIGHTS:
- Red (port/left): 112.5° arc
- Green (starboard/right): 112.5° arc
- White (stern): 135° arc from dead astern
- White (masthead): power vessels only, forward 225°
Reading lights: Red+Green = head-on approach. White only from astern = safe to overtake.
Red over white = fishing vessel. Two whites vertical = towing. Three whites vertical = aground.
Rule: "Red right returning" — red buoys on your right when entering port.

ANCHORING:
- Scope ratio: 7:1 chain in normal conditions, 5:1 all-chain, 10:1+ in storm conditions
- Scope = (water depth + freeboard) × ratio. Measure from bow roller to seabed.
- Swing room: scope length + vessel length in all directions from anchor position
- Anchor light required when anchored: all-round white, 2nm visibility
- Day signal: black ball forward when anchored in restricted/traffic areas
- Fog signal when anchored: ring bell rapidly for 5 seconds every minute

NAUTICAL CONVERSIONS:
- 1 knot = 1.15 mph = 1.85 km/h
- 1 nautical mile = 1.15 statute miles = 1,852 meters = 1 minute of latitude
- 1 fathom = 6 feet = 1.83 meters
- Speed formula: Speed (kts) = Distance (nm) ÷ Time (hours)
- Beaufort: Force 0 = calm, F4 = 11-16 kts, F7 = near gale 28-33 kts, F10 = storm 48-55 kts

AUTHORITATIVE SOURCES: USCG Navigation Rules at navcen.uscg.gov, COLREGS (International Regs for
Preventing Collisions at Sea), Chapman Piloting & Seamanship.`;

// ── Vessel-specific prompt (dynamic, not cached) ──────────────────────────────
function buildVesselPrompt(ctx) {
  const { vessel, tasks, repairs, logbook, equipment } = ctx;
  const today = new Date().toISOString().split('T')[0];

  const overdue = tasks.filter(function (t) {
    return t.urgency === 'critical' || t.urgency === 'overdue';
  });
  const dueSoon = tasks.filter(function (t) {
    return t.urgency === 'due-soon';
  });
  const ok = tasks.filter(function (t) {
    return t.urgency === 'ok';
  });
  const withNotes = tasks.filter(function (t) {
    return t.recentNotes && t.recentNotes.length > 0;
  });

  const fmt = function (t) {
    let line =
      '- ' +
      t.task +
      ' (' +
      t.section +
      ', every ' +
      (t.interval || '?') +
      ')' +
      (t.dueDate ? ', due ' + t.dueDate : '') +
      (t.lastService ? ', last done ' + t.lastService : ', never serviced');
    if (t.recentNotes && t.recentNotes.length > 0) {
      line += '\n  Completion notes: ' + t.recentNotes.join(' | ');
    }
    return line;
  };

  const passages = (logbook || []).filter(function (e) {
    return e.entry_type === 'passage';
  });
  const totalNm = passages.reduce(function (acc, e) {
    return acc + (parseFloat(e.distance_nm) || 0);
  }, 0);
  const totalEngHrs = passages.reduce(function (acc, e) {
    return acc + (parseFloat(e.hours_end) || 0);
  }, 0);
  const lastPassage = passages[0];
  const recentLog = (logbook || []).slice(0, 20);
  const openRepairs = (repairs || []).filter(function (r) {
    return r.status !== 'closed';
  });
  const equipIssues = (equipment || []).filter(function (e) {
    return e.status === 'needs-service' || e.status === 'watch';
  });

  let p =
    '== THIS SESSION ==\n' +
    'You are speaking with the owner of ' +
    vessel.prefix +
    ' ' +
    vessel.name +
    '. Today is ' +
    today +
    '.\n\n';

  p +=
    '== VESSEL ==\n' +
    'Name: ' +
    vessel.prefix +
    ' ' +
    vessel.name +
    '\n' +
    (vessel.make
      ? 'Make/Model: ' + [vessel.year, vessel.make, vessel.model].filter(Boolean).join(' ') + '\n'
      : '') +
    'Engine hours: ' +
    (vessel.engineHours
      ? vessel.engineHours +
        ' hrs' +
        (vessel.engineHoursDate ? ' (as of ' + vessel.engineHoursDate + ')' : '')
      : 'not recorded') +
    '\n' +
    (vessel.fuelBurnRate ? 'Fuel burn rate: ' + vessel.fuelBurnRate + ' gal/hr\n' : '') +
    (vessel.homePort ? 'Home port: ' + vessel.homePort + '\n' : '') +
    '\n';

  p +=
    '== MAINTENANCE ==\n' +
    (overdue.length > 0
      ? 'OVERDUE (' + overdue.length + '):\n' + overdue.map(fmt).join('\n') + '\n\n'
      : 'No overdue tasks.\n\n') +
    (dueSoon.length > 0
      ? 'DUE SOON (' + dueSoon.length + '):\n' + dueSoon.map(fmt).join('\n') + '\n\n'
      : 'Nothing due soon.\n\n') +
    (ok.length > 0
      ? 'UP TO DATE (' + ok.length + ' tasks):\n' + ok.map(fmt).join('\n') + '\n\n'
      : '');

  if (withNotes.length > 0) {
    p +=
      '== COMPLETION NOTES & TRENDS ==\n' +
      'Notes recorded when tasks were marked done. Look for patterns and deterioration:\n' +
      withNotes
        .map(function (t) {
          return '- ' + t.task + ' (' + t.section + '):\n  ' + t.recentNotes.join('\n  ');
        })
        .join('\n') +
      '\n\n';
  }

  p +=
    '== OPEN REPAIRS (' +
    openRepairs.length +
    ') ==\n' +
    (openRepairs.length > 0
      ? openRepairs
          .map(function (r) {
            let line = '- ' + r.section + ': ' + r.description + ' (opened ' + r.date + ')';
            if (r.notes) line += '\n  Notes: ' + r.notes;
            return line;
          })
          .join('\n')
      : 'No open repairs.') +
    '\n\n';

  p +=
    '== LOGBOOK ==\n' +
    'Total: ' +
    Math.round(totalNm) +
    ' nm across ' +
    passages.length +
    ' passages\n' +
    (totalEngHrs > 0
      ? 'Engine hours logged across passages: ' + Math.round(totalEngHrs) + ' hrs\n'
      : '') +
    (lastPassage
      ? 'Last passage: ' +
        lastPassage.entry_date +
        (lastPassage.from_location || lastPassage.to_location
          ? ' (' +
            (lastPassage.from_location || '?') +
            ' → ' +
            (lastPassage.to_location || '?') +
            ')'
          : '') +
        (lastPassage.distance_nm ? ', ' + lastPassage.distance_nm + ' nm' : '') +
        '\n'
      : '') +
    '\n' +
    (recentLog.length > 0
      ? 'Recent entries (newest first):\n' +
        recentLog
          .map(function (e) {
            var line =
              '- ' + e.entry_date + ' [' + (e.entry_type === 'passage' ? 'passage' : 'note') + ']';
            if (e.entry_type === 'passage' && (e.from_location || e.to_location)) {
              line += ': ' + (e.from_location || '?') + ' → ' + (e.to_location || '?');
              if (e.distance_nm) line += ' (' + e.distance_nm + ' nm)';
            }
            if (e.hours_end) line += ' [eng: ' + e.hours_end + ' hrs]';
            if (e.crew) line += ' [crew: ' + e.crew + ']';
            if (e.conditions) line += ' [' + e.conditions + ']';
            if (e.sea_state) line += ' [sea: ' + e.sea_state + ']';
            if (e.title) line += ' — ' + e.title;
            if (e.notes) line += ' — notes: ' + e.notes;
            if (e.incident) line += ' — INCIDENT: ' + e.incident;
            return line;
          })
          .join('\n')
      : 'No entries.') +
    '\n\n';

  p +=
    '== EQUIPMENT ==\n' +
    (equipIssues.length > 0
      ? 'Issues:\n' +
        equipIssues
          .map(function (e) {
            return '- ' + e.name + ': ' + e.status;
          })
          .join('\n')
      : 'No issues flagged.') +
    '\n\n';

  p +=
    '== EQUIPMENT LOGS ==\n' +
    (function () {
      var withLogs = (equipment || []).filter(function (e) {
        return e.recentLogs && e.recentLogs.length > 0;
      });
      if (withLogs.length === 0) return 'No equipment log entries.\n\n';
      return (
        withLogs
          .map(function (e) {
            var info = e.notes ? ' [' + e.notes.replace(/\n/g, ' ').slice(0, 80) + ']' : '';
            return (
              '- ' + e.name + ' (' + e.category + ')' + info + ':\n  ' + e.recentLogs.join('\n  ')
            );
          })
          .join('\n') + '\n\n'
      );
    })();

  p +=
    '== BEHAVIOUR ==\n' +
    'Blend vessel intelligence with app support naturally. If asked about the vessel, use the data above. ' +
    'If asked how to do something in the app, use the APP GUIDE. ' +
    'If asked about both in one message, answer both. ' +
    'CRITICAL: Never tell a user they cannot share a vessel or invite crew — Share Vessel is ungated and available to everyone. ' +
    'Actively scan logbook notes and completion notes for anomalies — flag any concerning patterns. ' +
    'When asked if the boat is ready: check overdue tasks, open repairs, and equipment issues. ' +
    'Never invent vessel data. Speak directly and casually to the owner.\n\n' +
    '== FORMATTING ==\n' +
    'Your response is rendered as plain text on a mobile screen. Do NOT use markdown — no **bold**, no ## headers, no *italics*, no backticks, no tables. These show up as literal characters on screen and look broken.\n' +
    'For lists: use a plain dash and a space ("- item") at the start of each line. One line per item. No sub-bullets or nested lists.\n' +
    'For short answers: 1-2 sentences. No preamble like "Great question!" or "I\'d be happy to help."\n' +
    'For lists of tasks or repairs: one dash-prefixed line per item, no extra prose between items.\n' +
    'For recommendations: 2-4 sentences max. Lead with the action, explain after. Avoid wall-of-text.\n' +
    'Use paragraph breaks (blank lines) to separate distinct ideas — not for decoration.\n' +
    'Speak to the owner like a knowledgeable friend, not a support agent.';

  return p;
}

export async function POST(request) {
  try {
    const { messages, vesselContext } = await request.json();

    if (!vesselContext || !vesselContext.vessel) {
      return Response.json({ error: 'No vessel context' }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    // ── Auth + usage gating ───────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (token) {
      const admin = getAdmin();
      const {
        data: { user },
        error: authErr,
      } = await admin.auth.getUser(token);
      if (!authErr && user) {
        const { data: profile } = await admin
          .from('user_profiles')
          .select('plan,created_at')
          .eq('id', user.id)
          .single();
        const plan = profile?.plan || 'free';
        // Trial: free users within 14 days of signup get Pro-level access
        const daysSinceSignup = profile?.created_at
          ? (Date.now() - new Date(profile.created_at).getTime()) / 86400000
          : 999;
        const trialActive = plan === 'free' && daysSinceSignup < 14;
        const effectivePlan = trialActive ? 'pro' : plan;
        const limit = FM_LIMITS[effectivePlan] !== undefined ? FM_LIMITS[effectivePlan] : 0;
        if (limit === 0) {
          return Response.json(
            {
              error:
                'First Mate is not available on the Free plan. Upgrade to Standard or Pro to chat with First Mate.',
            },
            { status: 403 }
          );
        }
        if (limit > 0) {
          const monthKey = new Date().toISOString().slice(0, 7);
          const { data: usage } = await admin
            .from('firstmate_usage')
            .select('count')
            .eq('user_id', user.id)
            .eq('month_key', monthKey)
            .single();
          const currentCount = usage?.count || 0;
          if (currentCount >= limit) {
            return Response.json(
              {
                error:
                  "You've used all " +
                  limit +
                  ' First Mate queries this month. Upgrade to get more.',
              },
              { status: 429 }
            );
          }
          await admin.from('firstmate_usage').upsert(
            {
              user_id: user.id,
              month_key: monthKey,
              count: currentCount + 1,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,month_key' }
          );
          request._fmUsage = { count: currentCount + 1, limit, plan };
        }
      }
    }

    // ── Build system prompt — two blocks for cache_control ────────────────────
    // Block 1 (APP_GUIDE): static, cached by Anthropic — saves ~90% on repeated input tokens
    // Block 2 (vessel prompt): dynamic per session, not cached
    const systemBlocks = [
      {
        type: 'text',
        text: APP_GUIDE,
        cache_control: { type: 'ephemeral' },
      },
      {
        type: 'text',
        text: buildVesselPrompt(vesselContext),
      },
    ];

    // ── Call Anthropic ────────────────────────────────────────────────────────
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemBlocks,
        messages: messages.map(function (m) {
          return { role: m.role, content: m.content };
        }),
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(function () {
        return {};
      });
      return Response.json(
        { error: err.error?.message || 'Anthropic error ' + anthropicRes.status },
        { status: 500 }
      );
    }

    const data = await anthropicRes.json();
    const text = (data.content || [])
      .map(function (b) {
        return b.text || '';
      })
      .join('');
    const usageMeta = request._fmUsage || null;
    return Response.json({ response: text, usage: usageMeta });
  } catch (e) {
    console.error('First Mate error:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
