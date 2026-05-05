// Route-level config — matches haul-plan/route.js (60s).
// Sonnet generating 12-22 equipment items typically takes 20-30s; the
// platform default (10-15s depending on plan) was killing the function
// and returning an empty body, surfacing client-side as the cryptic
// "Unexpected end of JSON input" parse error.
export const runtime = 'nodejs';
export const maxDuration = 60;

// Three request shapes supported:
//
// 1. singleItem  — { description, singleItem: true }
//    Identifies a single piece of equipment. Returns { equipment: {…} }.
//
// 2. structured  — { vessel: {make, model, year}, engines: [{make, model, year?, horsepower?, fuel_type?, cylinders?, position?}, …] }
//    New onboarding path (April 2026). Uses structured form data from the
//    Make/Model catalog dropdowns, so the AI doesn't have to extract or
//    guess identity. Returns { vesselInfo: {vesselType}, equipment: [...] }.
//
// 3. description — { description }
//    Legacy path for the old freeform "describe your vessel" input.
//    Kept for back-compat; not used by current UI.
//
export async function POST(request) {
  try {
    const body = await request.json();
    const isSingleItem = body.singleItem === true;
    const hasStructured = body.vessel && body.vessel.make && body.vessel.model;
    const description = (body.description || '').trim();

    if (!isSingleItem && !hasStructured && !description) {
      return Response.json(
        { error: 'No vessel identity provided' },
        { status: 400 }
      );
    }

    let prompt;

    if (isSingleItem) {
      prompt = `You are an expert marine equipment specialist with deep knowledge of marine hardware, anchoring systems, electronics, engines, and all boat equipment.

The user wants to add this piece of equipment: "${description}"

Identify the specific equipment and return a single JSON object with:
- name: Full descriptive name (e.g. "Vulcan 20kg Galvanised Steel Anchor")
- manufacturer: Brand/manufacturer name (e.g. "Vulcan") or null if unknown
- model: Specific model name or spec (e.g. "20kg Bruce-Style") or null if unknown
- category: One of: Engine|Electrical|Electronics|Rigging|Sails|Plumbing|Safety|Navigation|Deck|Bilge|Hull|Dinghy|Generator|Galley|Anchor|Mechanical|Steering|Watermaker
- tasks: Array of 2-5 specific maintenance tasks for THIS exact equipment

Return ONLY valid JSON — no prose, no markdown, no code fences:
{ "name": "string", "manufacturer": "string|null", "model": "string|null", "category": "string", "tasks": [{ "task": "string", "interval_days": number }] }

Maintenance intervals: 365=annual, 180=biannual, 90=quarterly, 730=2years. Be specific to the equipment — a Vulcan anchor needs different tasks than a windlass.`;
    } else if (hasStructured) {
      const v = body.vessel;
      const vesselLine = [v.year, v.make, v.model].filter(Boolean).join(' ').trim();
      const engines = Array.isArray(body.engines) ? body.engines : [];
      const anyHours = engines.some(function (e) {
        return e.engine_hours != null;
      });
      const engineLines = engines.map(function (e) {
        const parts = [];
        if (e.year) parts.push(String(e.year));
        if (e.make) parts.push(String(e.make));
        if (e.model) parts.push(String(e.model));
        const idBit = parts.join(' ');
        const specs = [];
        if (e.fuel_type) specs.push(String(e.fuel_type));
        if (e.engine_hours != null) specs.push(e.engine_hours + ' hrs');
        const specBit = specs.length ? ' (' + specs.join(', ') + ')' : '';
        const posBit = e.position ? ' — ' + e.position : '';
        return '- ' + idBit + specBit + posBit;
      });
      const engineBlock =
        engineLines.length > 0
          ? engineLines.join('\n')
          : '- (engine details not provided)';

      const hourGuidance = anyHours
        ? `\n\nEngine hours are provided, so engine-category maintenance tasks MUST include interval_hours in addition to interval_days — this lets the app trigger whichever comes first. Typical marine diesel intervals: oil & filter 100 hrs / 365 days, impeller 300 hrs / 365 days, primary fuel filter 250 hrs / 365 days, transmission fluid 300 hrs / 730 days, engine zincs 200 hrs / 365 days, raw water strainer 50 hrs / 30 days, belts & hoses inspection 200 hrs / 365 days, injector service 1000 hrs / 1095 days. Adjust for the specific engine make/model/year. Non-engine tasks (rigging, sails, hull, etc.) should have interval_days only.`
        : '';

      // hours_tracking guidance — three-state model. Phase 1 (May 5, 2026):
      //   "meter"          equipment has its own hour meter (Generator,
      //                    Watermaker, dive compressor, aux outboard);
      //                    set interval_hours on relevant tasks.
      //   "parent_engine"  equipment is a child of an engine and inherits
      //                    its hours (fuel filter, Racor, raw-water pump
      //                    when generated as separate cards from the Engine
      //                    entry); set interval_hours on relevant tasks.
      //   "none"           date-based maintenance only. Default for most.
      const hoursTrackingGuidance = `\n\nFor each equipment item, also classify hours_tracking:
- "meter" — the equipment has its own runtime hour meter and accumulates hours independently. Use for: Generator, Watermaker, dive/scuba compressor, refrigeration compressor, aux/dinghy Outboard. Tasks SHOULD include interval_hours when relevant (e.g. generator oil 100 hrs / 365 days, watermaker membrane clean 250 hrs / 180 days, watermaker pre-filter 100 hrs / 90 days).
- "parent_engine" — the equipment is a child of a propulsion engine and is serviced based on that engine's hours. Use for: standalone fuel filter, Racor, raw-water pump, primary water pump, engine zincs, transmission cooler when generated as separate cards. Tasks MUST include interval_hours.
- "none" — date-based maintenance only. Use for: rigging, sails, anchors, hull, deck, navigation electronics, plumbing fixtures, lights, batteries, safety gear, most other categories.
The Engine card itself stays "none" — its hours are tracked on the engines table, not the equipment row.`;

      prompt = `You are an expert marine surveyor and boat maintenance specialist with deep knowledge of production boats, custom builds, and all types of vessels.

VESSEL: ${vesselLine || '(unknown)'}
ENGINE${engines.length === 1 ? '' : 'S'}:
${engineBlock}

The engine year is especially important — the same model name often spans multiple generations with different base engines, cylinder counts, displacements, and part numbers. Reason about the SPECIFIC year variant when generating tasks and part specs. If the year falls in a transition period where you're not sure which variant, note that in the relevant task text rather than guess.

Generate a complete, specific equipment list that an owner of THIS exact vessel would track for maintenance. Tailor tasks to the actual engine(s) listed — oil specs, impeller size, fuel filter part numbers, zinc locations, and service intervals should match the specific engine make/model/year.${hourGuidance}${hoursTrackingGuidance}

For each equipment item, return TWO separate arrays — tasks and parts:
- tasks: the ACTION to perform, clean and action-focused. Good: "Replace raw water impeller". Bad: "Replace raw water impeller (Johnson 09-812B or equivalent)". Do NOT put part numbers, fluid specs, or quantities in task names — those belong in parts.
- parts: the specific parts / fluids needed for this equipment's maintenance. Include part number in part_number when you're confident, otherwise leave null. Parts are best-guess and the user can correct them.

Classify the vessel type based on the make/model: 'sail' for sailboats (monohull or catamaran), 'motor' for powerboats (center console, trawler, cruiser, sportfisher, etc.), 'other' only if genuinely unclear. Base this on vessel identity, not on equipment categories.

Return ONLY valid JSON — no prose, no markdown, no code fences:
{
  "vesselInfo": {
    "vesselType": "sail | motor | other"
  },
  "equipment": [
    {
      "name": "string",
      "manufacturer": "string|null",
      "model": "string|null",
      "category": "string (Engine|Electrical|Electronics|Rigging|Sails|Plumbing|Safety|Navigation|Deck|Bilge|Hull|Dinghy|Generator|Galley|Anchor|Mechanical|Steering|Watermaker)",
      "hours_tracking": "meter | parent_engine | none",
      "tasks": [
        { "task": "string (action only, no part numbers)", "interval_days": number, "interval_hours": number | null }
      ],
      "parts": [
        { "name": "string", "part_number": "string | null", "notes": "string | null (e.g. quantity, spec)" }
      ]
    }
  ]
}

Include 12-22 equipment items. Each should have 2-5 tasks and 0-6 parts (parts only for equipment where specific consumables/replacements matter — oil, filters, zincs, belts, impellers, batteries, etc.). Realistic intervals: 365=annual, 180=biannual, 90=quarterly, 730=2years. Include one Engine entry that reflects the engine(s) listed above — for twin-engine vessels, one Engine entry covering both is fine.`;
    } else {
      prompt = `You are an expert marine surveyor and boat maintenance specialist with deep knowledge of production boats, custom builds, and all types of vessels.

The user has this vessel: "${description}"

First, extract the vessel identity. Then generate a complete, specific equipment list an owner of this exact vessel would track for maintenance. Be specific to this make/model/year — not generic.

Return ONLY valid JSON — no prose, no markdown, no code fences. The JSON must be an object with these keys:
{
  "vesselInfo": {
    "year": "4-digit year string, or empty string if not found",
    "make": "manufacturer name only — max 30 characters, no dimensions, specs, or extra attributes (e.g. 'Fountaine Pajot', 'Catalina', 'Ranger Tug')",
    "model": "model name only — max 40 characters, no dimensions, specs, or extra attributes (e.g. 'Elba 45', '30', 'R-27')",
    "vesselType": "EXACTLY one of: 'sail' for any sailboat (monohull or catamaran); 'motor' for any powerboat; 'other' only if genuinely unclear. Base this on the make/model, not on equipment."
  },
  "equipment": [{ "name": "string", "manufacturer": "string|null", "model": "string|null", "category": "string (Engine|Electrical|Electronics|Rigging|Sails|Plumbing|Safety|Navigation|Deck|Bilge|Hull|Dinghy|Generator|Galley|Anchor|Mechanical|Steering|Watermaker)", "tasks": [{ "task": "string", "interval_days": number }] }]
}

Include 12-22 equipment items, each with 2-5 tasks and realistic intervals (365=annual, 180=biannual, 90=quarterly, 730=2years).`;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();
    if (data.error) {
      const errType = data.error.type || '';
      const errMsg = data.error.message || '';
      if (
        errType === 'rate_limit_error' ||
        errType === 'overloaded_error' ||
        errMsg.includes('rate limit') ||
        errMsg.includes('overloaded') ||
        errMsg.includes('token') ||
        errMsg.includes('capacity') ||
        errMsg.includes('quota')
      ) {
        return Response.json({ error: 'ai_busy', errorType: 'capacity' }, { status: 503 });
      }
      return Response.json({ error: 'ai_error', errorType: errType }, { status: 500 });
    }

    const raw = data.content[0].text
      .trim()
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    const parsed = JSON.parse(raw);

    if (isSingleItem) {
      return Response.json({ equipment: parsed });
    }

    const equipment = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.equipment)
        ? parsed.equipment
        : [];
    const vesselInfo = parsed.vesselInfo || null;
    return Response.json({ equipment, vesselInfo });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
