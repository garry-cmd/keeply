"use client";
import { useState } from "react";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().split("T")[0]; }

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// Format YYYY-MM-DD → MM/DD/YY
function fmt(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}/${y.slice(2)}`;
}

function intervalToDays(interval) {
  const map = { "7 days": 7, "14 days": 14, "30 days": 30, "60 days": 60, "90 days": 90, "6 months": 180, "annual": 365, "2 years": 730, "10 years": 3650 };
  return map[interval] || 0;
}

function getDueBadge(dueDate) {
  if (!dueDate) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const due = new Date(dueDate); due.setHours(0,0,0,0);
  const diff = Math.round((due - now) / 86400000);
  if (diff <= -10) return { label: "🔴 Critical",  color: "var(--critical-text)", bg: "var(--critical-bg)", border: "var(--critical-border)" };
  if (diff <= -5)  return { label: "🟠 Overdue",   color: "var(--overdue-text)",  bg: "var(--overdue-bg)",  border: "var(--overdue-border)"  };
  if (diff <= 3)   return { label: "🟡 Due Soon",  color: "var(--duesoon-text)",  bg: "var(--duesoon-bg)",  border: "var(--duesoon-border)"  };
  return null;
}

// ─── MAINTENANCE TASKS ────────────────────────────────────────────────────────

const BASE_DATE = "2026-03-23";

const MAINTENANCE_TASKS = [
  { id: 1,  section: "Dink",       task: "Check dinghy oil",                interval: "14 days",  priority: "medium",   lastService: addDays(BASE_DATE, -16) },
  { id: 2,  section: "Dink",       task: "Clean dinghy bottom",             interval: "30 days",  priority: "medium",   lastService: addDays(BASE_DATE, -28) },
  { id: 3,  section: "General",    task: "Dockline chafe check",            interval: "30 days",  priority: "medium",   lastService: addDays(BASE_DATE, -12) },
  { id: 4,  section: "General",    task: "Inspect dinghy motor",            interval: "30 days",  priority: "medium",   lastService: addDays(BASE_DATE, -40) },
  { id: 5,  section: "General",    task: "Check lifelines",                 interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -8)  },
  { id: 6,  section: "General",    task: "Wash canvas",                     interval: "30 days",  priority: "low",      lastService: addDays(BASE_DATE, -20) },
  { id: 7,  section: "General",    task: "Sail chafe",                      interval: "7 days",   priority: "high",     lastService: addDays(BASE_DATE, -11) },
  { id: 8,  section: "General",    task: "Wash decks",                      interval: "30 days",  priority: "low",      lastService: addDays(BASE_DATE, -5)  },
  { id: 9,  section: "General",    task: "Inspect canvas",                  interval: "90 days",  priority: "medium",   lastService: addDays(BASE_DATE, -85) },
  { id: 10, section: "General",    task: "Pressure test propane",           interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -2)  },
  { id: 11, section: "General",    task: "Clean fridge",                    interval: "90 days",  priority: "low",      lastService: addDays(BASE_DATE, -60) },
  { id: 12, section: "General",    task: "Bilge strainers",                 interval: "30 days",  priority: "medium",   lastService: addDays(BASE_DATE, -30) },
  { id: 13, section: "General",    task: "Change batteries in stove",       interval: "annual",   priority: "low",      lastService: addDays(BASE_DATE, -200)},
  { id: 14, section: "General",    task: "Wash linens",                     interval: "14 days",  priority: "low",      lastService: addDays(BASE_DATE, -10) },
  { id: 15, section: "General",    task: "Clean bilge",                     interval: "30 days",  priority: "medium",   lastService: addDays(BASE_DATE, -33) },
  { id: 16, section: "General",    task: "Waterproof butterfly cover",      interval: "90 days",  priority: "medium",   lastService: addDays(BASE_DATE, -45) },
  { id: 17, section: "General",    task: "Check portlight fittings",        interval: "90 days",  priority: "medium",   lastService: addDays(BASE_DATE, -100)},
  { id: 18, section: "Anchor",     task: "Shackle relube",                  interval: "90 days",  priority: "medium",   lastService: addDays(BASE_DATE, -60) },
  { id: 19, section: "Anchor",     task: "Check rodes",                     interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -3)  },
  { id: 20, section: "Anchor",     task: "Inspect bow roller",              interval: "30 days",  priority: "medium",   lastService: addDays(BASE_DATE, -25) },
  { id: 21, section: "Electrical", task: "Clean solar panels",              interval: "30 days",  priority: "low",      lastService: addDays(BASE_DATE, -15) },
  { id: 22, section: "Electrical", task: "Inspect batteries",               interval: "90 days",  priority: "high",     lastService: addDays(BASE_DATE, -92) },
  { id: 23, section: "Electrical", task: "Test running lights",             interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -4)  },
  { id: 24, section: "Electrical", task: "Test deck lights",                interval: "30 days",  priority: "low",      lastService: addDays(BASE_DATE, -18) },
  { id: 25, section: "Electrical", task: "Test anchor light",               interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -62) },
  { id: 26, section: "Electrical", task: "Inspect panel wiring",            interval: "90 days",  priority: "high",     lastService: addDays(BASE_DATE, -80) },
  { id: 27, section: "Electrical", task: "Inspect solar chargers",          interval: "90 days",  priority: "medium",   lastService: addDays(BASE_DATE, -55) },
  { id: 28, section: "Engine",     task: "Check belt",                      interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -6)  },
  { id: 29, section: "Engine",     task: "Inspect zinc",                    interval: "60 days",  priority: "high",     lastService: addDays(BASE_DATE, -72) },
  { id: 30, section: "Engine",     task: "Check dripless shaft seal",       interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -1)  },
  { id: 31, section: "Engine",     task: "Inspect raw water filter",        interval: "14 days",  priority: "high",     lastService: addDays(BASE_DATE, -15) },
  { id: 32, section: "Engine",     task: "Clean prop",                      interval: "60 days",  priority: "medium",   lastService: addDays(BASE_DATE, -20) },
  { id: 33, section: "Engine",     task: "Check transmission fluid",        interval: "14 days",  priority: "high",     lastService: addDays(BASE_DATE, -3)  },
  { id: 34, section: "Engine",     task: "WD40 key switch",                 interval: "30 days",  priority: "low",      lastService: addDays(BASE_DATE, -7)  },
  { id: 35, section: "Engine",     task: "Change shaft zinc",               interval: "90 days",  priority: "high",     lastService: addDays(BASE_DATE, -50) },
  { id: 36, section: "Engine",     task: "Check engine oil",                interval: "14 days",  priority: "critical", lastService: addDays(BASE_DATE, -16) },
  { id: 37, section: "Engine",     task: "Inspect impeller",                interval: "90 days",  priority: "high",     lastService: addDays(BASE_DATE, -25) },
  { id: 38, section: "Engine",     task: "Inspect air filter",              interval: "90 days",  priority: "medium",   lastService: addDays(BASE_DATE, -30) },
  { id: 39, section: "Engine",     task: "Inspect Racor fuel filter",       interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -9)  },
  { id: 40, section: "Engine",     task: "Check engine well",               interval: "30 days",  priority: "medium",   lastService: addDays(BASE_DATE, -2)  },
  { id: 41, section: "Plumbing",   task: "Large galley seacock",            interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -3)  },
  { id: 42, section: "Plumbing",   task: "Head intake seacock",             interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -35) },
  { id: 43, section: "Plumbing",   task: "Inspect water tank",              interval: "90 days",  priority: "medium",   lastService: addDays(BASE_DATE, -63) },
  { id: 44, section: "Plumbing",   task: "Check refrigerant",               interval: "90 days",  priority: "medium",   lastService: addDays(BASE_DATE, -71) },
  { id: 45, section: "Plumbing",   task: "Head sink seacock",               interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -21) },
  { id: 46, section: "Plumbing",   task: "Head discharge seacock",          interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -21) },
  { id: 47, section: "Plumbing",   task: "Small galley seacock",            interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -3)  },
  { id: 48, section: "Plumbing",   task: "Quarterberth seacock",            interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -90) },
  { id: 49, section: "Plumbing",   task: "Engine seacock",                  interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -12) },
  { id: 50, section: "Plumbing",   task: "Vinegar the head",                interval: "30 days",  priority: "medium",   lastService: addDays(BASE_DATE, -28) },
  { id: 51, section: "Plumbing",   task: "Clean shower drain",              interval: "30 days",  priority: "low",      lastService: addDays(BASE_DATE, -12) },
  { id: 52, section: "Rigging",    task: "Inspect rudder post",             interval: "90 days",  priority: "high",     lastService: addDays(BASE_DATE, -95) },
  { id: 53, section: "Rigging",    task: "Check halyards",                  interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -4)  },
  { id: 54, section: "Rigging",    task: "Inspect tiller",                  interval: "30 days",  priority: "medium",   lastService: addDays(BASE_DATE, -1)  },
  { id: 55, section: "Rigging",    task: "Inspect mast base",               interval: "90 days",  priority: "high",     lastService: addDays(BASE_DATE, -88) },
  { id: 56, section: "Rigging",    task: "Inspect mast tape",               interval: "90 days",  priority: "medium",   lastService: addDays(BASE_DATE, -60) },
  { id: 57, section: "Rigging",    task: "Sampson post / bobstay",          interval: "90 days",  priority: "high",     lastService: addDays(BASE_DATE, -45) },
  { id: 58, section: "Rigging",    task: "Inspect chainplates",             interval: "90 days",  priority: "critical", lastService: addDays(BASE_DATE, -103)},
  { id: 59, section: "Rigging",    task: "Lube rudder bearing",             interval: "annual",   priority: "medium",   lastService: addDays(BASE_DATE, -400)},
  { id: 60, section: "Rigging",    task: "Test reefing lines",              interval: "90 days",  priority: "high",     lastService: addDays(BASE_DATE, -30) },
  { id: 61, section: "Rigging",    task: "Check mainsheet pins",            interval: "30 days",  priority: "critical", lastService: addDays(BASE_DATE, -38) },
  { id: 62, section: "Safety",     task: "Test bilge pumps",                interval: "7 days",   priority: "critical", lastService: addDays(BASE_DATE, -18) },
  { id: 63, section: "Safety",     task: "Test manual bilge pump",          interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -3)  },
  { id: 64, section: "Safety",     task: "Test / clear cockpit drains",     interval: "14 days",  priority: "high",     lastService: addDays(BASE_DATE, -8)  },
  { id: 65, section: "Safety",     task: "Test CO2 alarm",                  interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -28) },
  { id: 66, section: "Safety",     task: "Test smoke detectors (x2)",       interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -60) },
  { id: 67, section: "Safety",     task: "Inspect first aid kit",           interval: "annual",   priority: "medium",   lastService: addDays(BASE_DATE, -300)},
  { id: 68, section: "Safety",     task: "Inspect fire extinguishers (x3)", interval: "annual",   priority: "high",     lastService: addDays(BASE_DATE, -380)},
  { id: 69, section: "Safety",     task: "Inspect flares",                  interval: "annual",   priority: "high",     lastService: addDays(BASE_DATE, -200)},
  { id: 70, section: "Safety",     task: "Change batteries in detectors",   interval: "annual",   priority: "high",     lastService: addDays(BASE_DATE, -400)},
  { id: 71, section: "Safety",     task: "Inspect life jacket cartridges",  interval: "annual",   priority: "critical", lastService: addDays(BASE_DATE, -370)},
  { id: 72, section: "Safety",     task: "Check ditch bag",                 interval: "90 days",  priority: "high",     lastService: addDays(BASE_DATE, -130)},
  { id: 73, section: "Safety",     task: "Inspect & adjust lifelines",      interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -3)  },
  { id: 74, section: "Watermaker", task: "Flush system",                    interval: "7 days",   priority: "critical", lastService: addDays(BASE_DATE, -1)  },
  { id: 75, section: "Watermaker", task: "Inspect filter",                  interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -8)  },
  { id: 76, section: "Watermaker", task: "Replace membrane filter",         interval: "30 days",  priority: "high",     lastService: addDays(BASE_DATE, -35) },
  { id: 77, section: "Watermaker", task: "Replace charcoal filter",         interval: "6 months", priority: "medium",   lastService: addDays(BASE_DATE, -175)},
  { id: 78, section: "Watermaker", task: "Clear strainer",                  interval: "7 days",   priority: "high",     lastService: addDays(BASE_DATE, -4)  },
  { id: 79, section: "Watermaker", task: "Check / clean salt",              interval: "30 days",  priority: "medium",   lastService: addDays(BASE_DATE, -5)  },
  { id: 80, section: "Hydrovane",  task: "Tighten Hydrovane bolts",         interval: "30 days",  priority: "critical", lastService: addDays(BASE_DATE, -41) },
  { id: 81, section: "Hydrovane",  task: "WD40 Hydrovane",                  interval: "30 days",  priority: "medium",   lastService: addDays(BASE_DATE, -15) },
  { id: 82, section: "Hydrovane",  task: "Clean hydro rudder",              interval: "7 days",   priority: "medium",   lastService: addDays(BASE_DATE, -2)  },
  // Paperwork stays in MAINTENANCE_TASKS for the Documentation tab
  { id: 83, section: "Paperwork",  task: "Boat insurance renewal",          interval: "annual",   priority: "critical", lastService: addDays(BASE_DATE, -369)},
  { id: 84, section: "Paperwork",  task: "Boat registration renewal",       interval: "annual",   priority: "critical", lastService: addDays(BASE_DATE, -352)},
  { id: 85, section: "Paperwork",  task: "Coast Guard registration",        interval: "annual",   priority: "critical", lastService: addDays(BASE_DATE, -310)},
  { id: 86, section: "Paperwork",  task: "FCC license (renews 2033)",       interval: "10 years", priority: "low",      lastService: addDays(BASE_DATE, -1000)},
  { id: 87, section: "Paperwork",  task: "NOAA beacon registration",        interval: "2 years",  priority: "high",     lastService: addDays(BASE_DATE, -600)},
];


// ─── PARTS & EQUIPMENT ───────────────────────────────────────────────────────

const PARTS_CATALOG = [
  { id: "p1",  name: "Harken Roller Furling Bearing Kit",  category: "Rigging",    retailPrice: 89,  sku: "HRK-440",    vendor: "defender",   url: "https://www.defender.com/search?q=harken+furling+bearing" },
  { id: "p2",  name: "McLube Sailkote Lubricant Spray",    category: "Rigging",    retailPrice: 18,  sku: "MCL-SLK",    vendor: "westmarine", url: "https://www.westmarine.com/search?query=sailkote" },
  { id: "p3",  name: "Lewmar Windlass Gypsy 10mm",         category: "Deck",       retailPrice: 145, sku: "LEW-GYP10",  vendor: "defender",   url: "https://www.defender.com/search?q=lewmar+gypsy+10mm" },
  { id: "p4",  name: "Lewmar Windlass Shaft Seal Kit",     category: "Deck",       retailPrice: 42,  sku: "LEW-SK44",   vendor: "defender",   url: "https://www.defender.com/search?q=lewmar+seal+kit" },
  { id: "p5",  name: "Beta Marine 15W-40 Engine Oil 4L",   category: "Engine",     retailPrice: 28,  sku: "BET-OIL4",   vendor: "fishery",    url: "https://www.fisherysupply.com/search?q=beta+marine+oil" },
  { id: "p6",  name: "Beta Marine Fuel Filter",            category: "Engine",     retailPrice: 22,  sku: "BET-FF35",   vendor: "westmarine", url: "https://www.westmarine.com/search?query=beta+fuel+filter" },
  { id: "p7",  name: "Beta Marine Oil Filter",             category: "Engine",     retailPrice: 16,  sku: "BET-OF35",   vendor: "westmarine", url: "https://www.westmarine.com/search?query=beta+oil+filter" },
  { id: "p8",  name: "Engine Zinc Anode Set",              category: "Engine",     retailPrice: 24,  sku: "ZNC-ENG3",   vendor: "fishery",    url: "https://www.fisherysupply.com/search?q=engine+zinc+anode" },
  { id: "p9",  name: "Raw Water Impeller — Beta 35",       category: "Engine",     retailPrice: 35,  sku: "IMP-B35",    vendor: "westmarine", url: "https://www.westmarine.com/search?query=beta+35+impeller" },
  { id: "p10", name: "Whale Gusher Diaphragm Repair Kit",  category: "Bilge",      retailPrice: 28,  sku: "WHL-DPH",    vendor: "defender",   url: "https://www.defender.com/search?q=whale+gusher+diaphragm" },
  { id: "p11", name: "Victron Battery Monitor BMV-712",    category: "Electrical", retailPrice: 179, sku: "VIC-BMV712", vendor: "defender",   url: "https://www.defender.com/search?q=victron+bmv-712" },
  { id: "p12", name: "Ancor Marine Wire 10 AWG 50ft",      category: "Electrical", retailPrice: 54,  sku: "ANC-10-50",  vendor: "westmarine", url: "https://www.westmarine.com/search?query=ancor+10+awg+wire" },
  { id: "p13", name: "Garmin Transducer Thru-Hull",        category: "Navigation", retailPrice: 139, sku: "GRM-TH50",   vendor: "fishery",    url: "https://www.fisherysupply.com/search?q=garmin+transducer" },
  { id: "p14", name: "Spinlock PXR Cam Cleat",             category: "Rigging",    retailPrice: 48,  sku: "SPL-PXR",    vendor: "defender",   url: "https://www.defender.com/search?q=spinlock+pxr" },
  { id: "p15", name: "3M 5200 Marine Adhesive Sealant",    category: "Deck",       retailPrice: 19,  sku: "3M-5200",    vendor: "westmarine", url: "https://www.westmarine.com/search?query=3m+5200" },
  { id: "p16", name: "Watermaker Pre-filter Cartridge",    category: "Watermaker", retailPrice: 22,  sku: "WM-PF10",    vendor: "defender",   url: "https://www.defender.com/search?q=watermaker+prefilter" },
  { id: "p17", name: "Watermaker Charcoal Filter",         category: "Watermaker", retailPrice: 38,  sku: "WM-CF10",    vendor: "defender",   url: "https://www.defender.com/search?q=watermaker+charcoal+filter" },
  { id: "p18", name: "Hydrovane Hardware Kit",             category: "Hydrovane",  retailPrice: 65,  sku: "HV-HW01",    vendor: "defender",   url: "https://www.defender.com/search?q=hydrovane+hardware" },
  { id: "p19", name: "Shaft Zinc Anode",                   category: "Engine",     retailPrice: 18,  sku: "ZNC-SHF",    vendor: "fishery",    url: "https://www.fisherysupply.com/search?q=shaft+zinc+anode" },
  { id: "p20", name: "Racor Fuel Filter Element",          category: "Engine",     retailPrice: 14,  sku: "RAC-500",    vendor: "westmarine", url: "https://www.westmarine.com/search?query=racor+500+filter" },
];

const EQUIPMENT_PARTS = {
  Engine: ["p5","p6","p7","p8","p9","p19","p20"], Rigging: ["p1","p2","p14"],
  Deck: ["p3","p4","p15"], Bilge: ["p10"], Electrical: ["p11","p12"],
  Navigation: ["p13"], Watermaker: ["p16","p17"], Hydrovane: ["p18"],
};

// ─── MANUFACTURER DOCUMENT LIBRARY ──────────────────────────────────────────
// Keyed by lowercase keywords found in equipment name
const DOC_LIBRARY = [
  // Beta Marine
  { id: "beta-ops",     keywords: ["beta"],        type: "Manual",      label: "Beta Marine Operators Manual",        url: "https://www.betamarine.co.uk/wp-content/uploads/Beta-Marine-Operators-Manual.pdf" },
  { id: "beta-parts",   keywords: ["beta"],        type: "Parts List",  label: "Beta Marine Parts List",              url: "https://www.betamarine.co.uk/wp-content/uploads/Beta-Marine-Parts-List.pdf" },
  { id: "beta-install", keywords: ["beta"],        type: "Manual",      label: "Beta Marine Installation Manual",     url: "https://www.betamarine.co.uk/wp-content/uploads/Beta-Marine-Installation-Manual.pdf" },
  // Harken
  { id: "harken-furl",  keywords: ["harken","furling"], type: "Manual", label: "Harken Furling System Manual",        url: "https://www.harken.com/globalassets/harken/documents/installation-manuals/furling-installation.pdf" },
  { id: "harken-parts", keywords: ["harken"],      type: "Parts List",  label: "Harken Parts & Spares Guide",         url: "https://www.harken.com/en/support/manuals-instructions/" },
  // Lewmar
  { id: "lewmar-win",   keywords: ["lewmar","windlass"], type: "Manual", label: "Lewmar Windlass Installation Manual", url: "https://www.lewmar.com/en/support/manuals" },
  { id: "lewmar-parts", keywords: ["lewmar"],      type: "Parts List",  label: "Lewmar Windlass Parts Diagram",       url: "https://www.lewmar.com/en/support/manuals" },
  // Victron
  { id: "victron-mp",   keywords: ["victron","multiplus"], type: "Manual", label: "Victron MultiPlus Manual",         url: "https://www.victronenergy.com/upload/documents/Manual-MultiPlus-EN.pdf" },
  { id: "victron-wir",  keywords: ["victron"],     type: "Build Sheet", label: "Victron Wiring Unlimited Guide",      url: "https://www.victronenergy.com/upload/documents/Wiring-Unlimited-EN.pdf" },
  // Garmin
  { id: "garmin-chart", keywords: ["garmin","chart plotter","chartplotter"], type: "Manual", label: "Garmin Chartplotter Owner's Manual", url: "https://support.garmin.com/en-US/?partNumber=010-02390-00&tab=manuals" },
  // Whale
  { id: "whale-bilge",  keywords: ["whale","gusher","bilge pump"], type: "Manual", label: "Whale Gusher Service Manual",         url: "https://www.whalegroup.com/wp-content/uploads/Gusher-Orca-Manual.pdf" },
  { id: "whale-parts",  keywords: ["whale","gusher"],  type: "Parts List",  label: "Whale Gusher Spare Parts",           url: "https://www.whalegroup.com/product-category/spares/" },
  // Hydrovane
  { id: "hv-manual",    keywords: ["hydrovane"],   type: "Manual",      label: "Hydrovane Installation & User Manual", url: "https://hydrovane.com/wp-content/uploads/2019/09/Hydrovane-Manual-2019.pdf" },
  { id: "hv-parts",     keywords: ["hydrovane"],   type: "Parts List",  label: "Hydrovane Parts Diagram",              url: "https://hydrovane.com/spare-parts/" },
  // Generic watermaker
  { id: "wm-guide",     keywords: ["watermaker","water maker"], type: "Manual", label: "Watermaker Operation & Maintenance",  url: "https://www.villagemanineoutfitters.com/watermaker-guide" },
  // Racor
  { id: "racor-fuel",   keywords: ["racor"],       type: "Manual",      label: "Racor Fuel Filter Service Manual",    url: "https://www.parkerracor.com/resources/manuals" },
];

function getAutoSuggestedDocs(equipmentName) {
  const lower = equipmentName.toLowerCase();
  return DOC_LIBRARY.filter(doc => doc.keywords.some(kw => lower.includes(kw)));
}

const DOC_TYPE_CFG = {
  "Manual":      { color: "var(--brand)", bg: "#dbeafe", icon: "📖" },
  "Parts List":  { color: "#166534", bg: "#dcfce7", icon: "🔩" },
  "Build Sheet": { color: "var(--brand)", bg: "var(--brand-deep)", icon: "📋" },
  "Warranty":    { color: "#92400e", bg: "#fef3c7", icon: "📜" },
  "Photo":       { color: "#0e7490", bg: "#cffafe", icon: "📷" },
  "Other":       { color: "var(--text-secondary)", bg: "var(--border)", icon: "📄" },
};

const INIT_EQUIPMENT = [
  { id: 1, name: "Beta 35 Diesel Engine",   category: "Engine",     status: "good",          lastService: "2024-11-15", notes: "Winterized, fogged cylinders", customParts: [], docs: [] },
  { id: 2, name: "Harken Roller Furling",   category: "Rigging",    status: "watch",         lastService: "2024-08-01", notes: "Bearing feels slightly stiff",  customParts: [], docs: [] },
  { id: 3, name: "Victron MultiPlus 2000",  category: "Electrical", status: "good",          lastService: "2025-01-10", notes: "",                              customParts: [], docs: [] },
  { id: 4, name: "Lewmar #44 Windlass",     category: "Deck",       status: "needs-service", lastService: "2023-09-20", notes: "Gypsy worn, slipping on chain", customParts: [], docs: [] },
  { id: 5, name: "Garmin Chart Plotter",    category: "Navigation", status: "good",          lastService: "2025-02-01", notes: "",                              customParts: [], docs: [] },
  { id: 6, name: "Whale Gusher Bilge Pump", category: "Bilge",      status: "watch",         lastService: "2024-06-15", notes: "Diaphragm due for replacement", customParts: [], docs: [] },
  { id: 7, name: "Watermaker",              category: "Watermaker", status: "good",          lastService: "2026-03-19", notes: "Filter leaking - tightened",    customParts: [], docs: [] },
  { id: 8, name: "Hydrovane Self-Steering", category: "Hydrovane",  status: "watch",         lastService: "2026-01-13", notes: "Drive unit bolt failed - repaired", customParts: [], docs: [] },
];

const MOCK_ORDERS = [
  { id: "ORD-1041", customer: "S/V Patience — Bob & Linda Marsh", email: "bmarsh@cruisers.net", date: "2026-03-20", status: "pending", total: 213, items: [{ ...PARTS_CATALOG[2], qty: 1 }, { ...PARTS_CATALOG[3], qty: 1 }, { ...PARTS_CATALOG[1], qty: 2 }], vessel: "Hallberg-Rassy 42", location: "Barra de Navidad, Jalisco" },
  { id: "ORD-1040", customer: "M/Y Blue Horizon — Capt. Dave Torres", email: "dtorres@bluehor.com", date: "2026-03-19", status: "ordered", total: 357, items: [{ ...PARTS_CATALOG[10], qty: 1 }, { ...PARTS_CATALOG[11], qty: 2 }, { ...PARTS_CATALOG[6], qty: 1 }], vessel: "Nordhavn 47", location: "La Cruz, Nayarit" },
  { id: "ORD-1039", customer: "S/V Zephyr — Anna Kowalski", email: "anna@svzephyr.com", date: "2026-03-17", status: "fulfilled", total: 89, items: [{ ...PARTS_CATALOG[0], qty: 1 }], vessel: "Catalina 38", location: "Manzanillo, Colima" },
];

const VENDOR_COLORS = { westmarine: "#0057a8", defender: "#b91c1c", fishery: "#15803d" };
const VENDOR_LABELS = { westmarine: "West Marine", defender: "Defender", fishery: "Fishery Supply" };
const STATUS_CFG = {
  "good":          { label: "Good",          color: "var(--ok-text)",     bg: "var(--ok-bg)",     dot: "var(--ok-text)"     },
  "watch":         { label: "Watch",         color: "var(--warn-text)",   bg: "var(--warn-bg)",   dot: "var(--warn-text)"   },
  "needs-service": { label: "Needs Service", color: "var(--danger-text)", bg: "var(--danger-bg)", dot: "var(--danger-text)" },
};
const ORDER_STATUS = {
  pending:   { label: "Pending",   bg: "var(--order-pending-bg)",   color: "var(--order-pending-text)"   },
  ordered:   { label: "Ordered",   bg: "var(--order-ordered-bg)",   color: "var(--order-ordered-text)"   },
  fulfilled: { label: "Fulfilled", bg: "var(--order-fulfilled-bg)", color: "var(--order-fulfilled-text)" },
};
const PRIORITY_CFG = {
  critical: { color: "var(--priority-critical-text)", bg: "var(--priority-critical-bg)", order: 0 },
  high:     { color: "var(--priority-high-text)",     bg: "var(--priority-high-bg)",     order: 1 },
  medium:   { color: "var(--priority-medium-text)",   bg: "var(--priority-medium-bg)",   order: 2 },
  low:      { color: "var(--priority-low-text)",      bg: "var(--priority-low-bg)",      order: 3 },
};
// ─── UNIFIED SECTIONS TABLE ───────────────────────────────────────────────────
// Single source of truth for all section names + icons used across all tabs
const SECTIONS = {
  Anchor:      "⚓",
  Bilge:       "🪣",
  Deck:        "🛥",
  Dink:        "⛵",
  Electrical:  "⚡",
  Engine:      "🔧",
  General:     "🚢",
  Hydrovane:   "🧭",
  Navigation:  "🗺",
  Paperwork:   "📄",
  Plumbing:    "🔩",
  Rigging:     "🪢",
  Safety:      "🛟",
  Watermaker:  "💧",
};

// Convenience aliases used throughout the app
// SECTION_ICONS is SECTIONS (see above)

// Sections derived from SECTIONS table
const ALL_SECTIONS   = Object.keys(SECTIONS);
const MAINT_SECTIONS = ALL_SECTIONS.filter(s => s !== "Paperwork");
const EQ_CATEGORIES = Object.keys(SECTIONS).filter(s => s !== "Paperwork" && s !== "Dink");
// ─── REUSABLE RENDER HELPERS ─────────────────────────────────────────────────

function Badge({ label, color, bg, border }) {
  return <span style={{ background: bg, color, border: border ? `1px solid ${border}` : "none", borderRadius: 5, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>{label}</span>;
}

function PriorityBadge({ priority }) {
  const c = PRIORITY_CFG[priority];
  return <Badge label={priority.toUpperCase()} color={c.color} bg={c.bg} />;
}

function SectionBadge({ section }) {
  return <span style={{ fontSize: 10, fontWeight: 700, background: "var(--bg-subtle)", color: "var(--text-secondary)", borderRadius: 5, padding: "1px 6px" }}>{SECTIONS[section] || ""} {section}</span>;
}

function StatusBadge({ status }) {
  const c = STATUS_CFG[status];
  return <span style={{ fontSize: 10, fontWeight: 700, background: c.bg, color: c.color, borderRadius: 6, padding: "2px 8px" }}>{c.label}</span>;
}

function UrgencyCard({ label, sub, val, color, bg, active, onClick }) {
  return (
    <div onClick={onClick} style={{ background: bg, border: active ? `2px solid ${color}` : `1px solid ${color}25`, borderRadius: 12, padding: "12px 14px", cursor: onClick ? "pointer" : "default", boxShadow: active ? `0 0 0 3px ${color}20` : "none", userSelect: "none" }}>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{sub}</div>}
      {active && <div style={{ fontSize: 9, color, fontWeight: 700, marginTop: 4 }}>FILTERED ✕</div>}
    </div>
  );
}

function StripeCheckout({ cart, onSuccess, onClose }) {
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({ email: "", name: "", vessel: "", card: "", exp: "", cvc: "" });
  const total = cart.reduce((s, i) => s + i.retailPrice * i.qty, 0);
  const handlePay = () => {
    if (!form.email || !form.name || !form.card) return;
    setStep("processing");
    setTimeout(() => { setStep("done"); setTimeout(() => onSuccess({ ...form, total, items: cart, id: "ORD-" + (1042 + Math.floor(Math.random() * 10)) }), 1800); }, 2000);
  };
  const inp = (field, ph, half) => <input placeholder={ph} value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} style={{ width: half ? "calc(50% - 6px)" : "100%", border: "1.5px solid var(--border)", borderRadius: 8, padding: "10px 12px", fontSize: 14, background: "var(--bg-subtle)", color: "var(--text-primary)", boxSizing: "border-box", outline: "none" }} />;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,20,30,0.55)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--bg-elevated)", borderRadius: 20, width: "100%", maxWidth: 420, border: "1px solid var(--border-strong)", overflow: "hidden" }}>
        <div style={{ background: "var(--brand-deep)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>BilgeBoss Checkout</div>
          <div style={{ color: "var(--brand)", fontSize: 13, marginTop: 2 }}>{cart.length} item{cart.length !== 1 ? "s" : ""} · <strong style={{ color: "#fff" }}>${total.toFixed(2)}</strong></div></div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>
          {step === "form" && (<>
            <div style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
              {cart.map(item => (<div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}><span>{item.name} × {item.qty}</span><span style={{ fontWeight: 600 }}>${(item.retailPrice * item.qty).toFixed(2)}</span></div>))}
              <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14 }}><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.8px" }}>CONTACT</div>
              {inp("email","Email address")}{inp("name","Full name")}{inp("vessel","Vessel name (optional)")}
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.8px", marginTop: 4 }}>PAYMENT</div>
              {inp("card","Card number")}<div style={{ display: "flex", gap: 12 }}>{inp("exp","MM / YY",true)}{inp("cvc","CVC",true)}</div>
            </div>
            <button onClick={handlePay} style={{ width: "100%", background: "var(--brand)", color: "var(--text-on-brand)", border: "none", borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 20 }}>Pay ${total.toFixed(2)} →</button>
            <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>🔒 Secured by Stripe</div>
          </>)}
          {step === "processing" && <div style={{ textAlign: "center", padding: "40px 0" }}><div style={{ fontSize: 40 }}>⏳</div><div style={{ fontWeight: 700, fontSize: 16, marginTop: 12 }}>Processing…</div></div>}
          {step === "done" && <div style={{ textAlign: "center", padding: "40px 0" }}><div style={{ fontSize: 48 }}>✅</div><div style={{ fontWeight: 700, fontSize: 18, color: "var(--ok-text)", marginTop: 12 }}>Order Confirmed!</div></div>}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
function AdminDashboard({ orders, onUpdateStatus }) {
  const [selected, setSelected] = useState(null);
  const pending = orders.filter(o => o.status === "pending").length;
  return (
    <div className="admin-light">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        {[{ label: "Pending Orders", val: orders.filter(o=>o.status==="pending").length, color: "var(--order-pending-text)", bg: "var(--order-pending-bg)" },
          { label: "Ordered / In Transit", val: orders.filter(o=>o.status==="ordered").length, color: "var(--order-ordered-text)", bg: "var(--order-ordered-bg)" },
          { label: "Fulfilled This Month", val: orders.filter(o=>o.status==="fulfilled").length, color: "var(--order-fulfilled-text)", bg: "var(--order-fulfilled-bg)" },
        ].map(st => (<div key={st.label} style={{ background: st.bg, border: `1px solid ${st.color}`, borderRadius: 12, padding: "14px 18px" }}><div style={{ fontSize: 28, fontWeight: 800, color: st.color, lineHeight: 1 }}>{st.val}</div><div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>{st.label}</div></div>))}
      </div>
      {pending > 0 && (<div style={{ background: "var(--warn-bg)", border: "1px solid var(--warn-border)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 18 }}>🔔</span><span style={{ fontSize: 13, fontWeight: 600, color: "var(--warn-text)" }}>{pending} new order{pending !== 1 ? "s" : ""} need{pending === 1 ? "s" : ""} to be placed with your wholesale supplier.</span></div>)}
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>All Orders</div>
      {orders.map(order => (
        <div key={order.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setSelected(selected === order.id ? null : order.id)}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 14, fontWeight: 700 }}>{order.id}</span><span style={{ background: ORDER_STATUS[order.status].bg, color: ORDER_STATUS[order.status].color, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{ORDER_STATUS[order.status].label}</span></div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 3 }}>{order.customer}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{order.vessel} · {order.location} · {fmt(order.date)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--brand)" }}>${order.total}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{order.items.length} items</div>
              <div style={{ fontSize: 18, color: "var(--text-muted)", marginTop: 4 }}>{selected === order.id ? "▾" : "▸"}</div>
            </div>
          </div>
          {selected === order.id && (
            <div style={{ borderTop: "1px solid var(--border)", padding: "16px 20px", background: "var(--bg-subtle)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>ORDER ITEMS</div>
              {Object.entries(order.items.reduce((acc, item) => { const v = item.vendor; if (!acc[v]) acc[v] = []; acc[v].push(item); return acc; }, {})).map(([vendor, items]) => (
                <div key={vendor} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ background: VENDOR_COLORS[vendor], color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{VENDOR_LABELS[vendor]}</span><span style={{ fontSize: 11, color: "var(--text-muted)" }}>wholesale →</span></div>
                  {items.map(item => (<div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0 5px 8px", borderLeft: `3px solid ${VENDOR_COLORS[vendor]}30`, marginBottom: 2 }}><span>{item.name} <span style={{ color: "var(--text-muted)" }}>× {item.qty}</span></span><div><span style={{ fontWeight: 600 }}>${(item.retailPrice * item.qty).toFixed(2)}</span><div style={{ fontSize: 10, color: "var(--text-muted)" }}>SKU: {item.sku}</div></div></div>))}
                </div>
              ))}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>📧 <a href={`mailto:${order.email}`} style={{ color: "var(--brand)" }}>{order.email}</a></div>
                <div style={{ display: "flex", gap: 8 }}>
                  {order.status === "pending" && <button onClick={() => onUpdateStatus(order.id, "ordered")} style={{ background: "var(--order-ordered-bg)", color: "var(--order-ordered-text)", border: "1px solid var(--order-ordered-text)", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓ Ordered</button>}
                  {order.status === "ordered" && <button onClick={() => onUpdateStatus(order.id, "fulfilled")} style={{ background: "var(--ok-bg)", color: "var(--ok-text)", border: "1px solid var(--ok-border)", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓ Fulfilled</button>}
                  {order.status === "fulfilled" && <span style={{ fontSize: 12, color: "var(--ok-text)", fontWeight: 600 }}>✓ Complete</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── TASK ROW ─────────────────────────────────────────────────────────────────
function TaskRow({ task, idx, total, onToggle, onComment, showSection }) {
  const [logsOpen, setLogsOpen] = useState(false);
  const badge = getDueBadge(task.dueDate);
  return (
    <div style={{ borderBottom: idx < total - 1 ? "1px solid var(--border)" : "none", background: "var(--bg-card)" }}>
      <div style={{ padding: "12px 20px", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <input type="checkbox" checked={false} onChange={() => onToggle(task.id)} style={{ marginTop: 3, width: 16, height: 16, accentColor: "var(--brand)", cursor: "pointer", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{task.task}</span>
            <span style={{ background: PRIORITY_CFG[task.priority].bg, color: PRIORITY_CFG[task.priority].color, borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{task.priority}</span>
            {badge && <span style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{badge.label}</span>}
            {showSection && <span style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 600 }}>{SECTIONS[task.section]} {task.section}</span>}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            Every {task.interval}
            {task.lastService && <span> · Last: {fmt(task.lastService)}</span>}
            {task.dueDate && <span style={{ color: badge ? badge.color : "var(--text-muted)", fontWeight: badge ? 700 : 400 }}> · Next due: {fmt(task.dueDate)}</span>}
          </div>
          <div style={{ marginTop: 7 }}>
            <input placeholder="Add a comment (saved on check-off)" value={task.pendingComment} onChange={e => onComment(task.id, e.target.value)}
              style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 9px", fontSize: 11, color: "var(--text-primary)", background: "var(--bg-subtle)", outline: "none", boxSizing: "border-box" }} />
          </div>
          {task.serviceLogs && task.serviceLogs.length > 0 && (
            <div style={{ marginTop: 5 }}>
              <button onClick={() => setLogsOpen(o => !o)} style={{ background: "none", border: "none", fontSize: 11, color: "var(--brand)", cursor: "pointer", padding: 0, fontWeight: 600 }}>
                {logsOpen ? "▾" : "▸"} {task.serviceLogs.length} log{task.serviceLogs.length !== 1 ? "s" : ""}
              </button>
              {logsOpen && (
                <div style={{ marginTop: 5, paddingLeft: 8, borderLeft: "2px solid #bfdbfe" }}>
                  {[...task.serviceLogs].reverse().map((log, i) => (
                    <div key={i} style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, color: "var(--brand)" }}>{fmt(log.date)}</span> — {log.comment}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("customer");
  const [tab, setTab]   = useState("equipment"); // equipment | repairs | maintenance | documentation

  // Cart
  const [cart, setCart] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCartPanel, setShowCartPanel] = useState(false);
  const addToCart = (part) => setCart(prev => { const ex = prev.find(i => i.id === part.id); if (ex) return prev.map(i => i.id === part.id ? { ...i, qty: i.qty + 1 } : i); return [...prev, { ...part, qty: 1 }]; });
  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
  const cartTotal = cart.reduce((s, i) => s + i.retailPrice * i.qty, 0);
  const cartQty   = cart.reduce((s, i) => s + i.qty, 0);

  // Orders
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const handleOrderSuccess = (orderData) => {
    setOrders(prev => [{ id: orderData.id, customer: `${orderData.name}${orderData.vessel ? " — " + orderData.vessel : ""}`, email: orderData.email, date: today(), status: "pending", total: orderData.total, items: orderData.items, vessel: orderData.vessel || "Unknown", location: "Self-reported" }, ...prev]);
    setCart([]); setShowCheckout(false); setShowCartPanel(false);
    setOrderSuccess(orderData.id);
    setTimeout(() => setOrderSuccess(null), 4000);
  };
  const updateOrderStatus = (id, s) => setOrders(prev => prev.map(o => o.id === id ? { ...o, status: s } : o));

  // Equipment
  const [equipment, setEquipment]       = useState(INIT_EQUIPMENT);
  const [expandedEquip, setExpandedEquip] = useState(null);
  const [equipTab, setEquipTab]           = useState({}); // { [eqId]: "parts"|"docs" }
  const [equipFilter, setEquipFilter]   = useState("All");      // status filter
  const [equipSectionFilter, setEquipSectionFilter] = useState("All"); // section filter
  const [showAddEquip, setShowAddEquip] = useState(false);
  const [newEquip, setNewEquip]         = useState({ name: "", category: "Engine", status: "good", notes: "" });
  const [addingPartFor, setAddingPartFor] = useState(null);
  const [newPartForm, setNewPartForm]   = useState({ name: "", url: "", price: "" });
  const [addingDocFor, setAddingDocFor] = useState(null);
  const [newDocForm, setNewDocForm]     = useState({ label: "", url: "", type: "Manual", source: "url", fileData: null, fileName: "" });
  const [docSuggestFor, setDocSuggestFor] = useState(null); // eqId showing auto-suggest panel

  const updateEquipStatus = (id, status) => setEquipment(eq => eq.map(e => e.id === id ? { ...e, status } : e));
  const addEquipment = () => {
    if (!newEquip.name.trim()) return;
    const autoSuggested = getAutoSuggestedDocs(newEquip.name);
    setEquipment(eq => [...eq, { ...newEquip, id: Date.now(), lastService: today(), customParts: [], docs: autoSuggested }]);
    setNewEquip({ name: "", category: "Engine", status: "good", notes: "" });
    setShowAddEquip(false);
  };
  const addCustomPart = (eqId) => {
    if (!newPartForm.name.trim()) return;
    setEquipment(eq => eq.map(e => e.id === eqId ? { ...e, customParts: [...(e.customParts||[]), { id: "cp-" + Date.now(), name: newPartForm.name, url: newPartForm.url, price: newPartForm.price, vendor: "custom" }] } : e));
    setNewPartForm({ name: "", url: "", price: "" });
    setAddingPartFor(null);
  };
  const addCustomDoc = (eqId) => {
    if (!newDocForm.label.trim()) return;
    if (newDocForm.source === "url" && !newDocForm.url.trim()) return;
    if (newDocForm.source === "file" && !newDocForm.fileData) return;
    const doc = {
      id: "doc-" + Date.now(),
      label: newDocForm.label,
      type: newDocForm.type,
      url: newDocForm.source === "url" ? newDocForm.url : newDocForm.fileData,
      fileName: newDocForm.fileName || "",
      isFile: newDocForm.source === "file",
    };
    setEquipment(eq => eq.map(e => e.id === eqId ? { ...e, docs: [...(e.docs||[]), doc] } : e));
    setNewDocForm({ label: "", url: "", type: "Manual", source: "url", fileData: null, fileName: "" });
    setAddingDocFor(null);
  };
  const removeDoc = (eqId, docId) => setEquipment(eq => eq.map(e => e.id === eqId ? { ...e, docs: (e.docs||[]).filter(d => d.id !== docId) } : e));
  const addSuggestedDoc = (eqId, doc) => setEquipment(eq => eq.map(e => {
    if (e.id !== eqId) return e;
    if ((e.docs||[]).find(d => d.id === doc.id)) return e;
    return { ...e, docs: [...(e.docs||[]), doc] };
  }));

  // Maintenance
  const [tasks, setTasks] = useState(
    MAINTENANCE_TASKS.map(t => ({ ...t, done: false, dueDate: addDays(t.lastService, intervalToDays(t.interval)), serviceLogs: [], pendingComment: "" }))
  );
  const [expandedSection, setExpandedSection] = useState(null);
  const [filterSection, setFilterSection]     = useState("All");
  const [filterPriority, setFilterPriority]   = useState("All");
  const [filterUrgency, setFilterUrgency]     = useState("All");
  const [showAddTask, setShowAddTask]         = useState(false);
  const [newTask, setNewTask]                 = useState({ task: "", section: "General", interval: "30 days", priority: "medium" });
  const [showAddDoc, setShowAddDoc]           = useState(false);
  const [newDoc, setNewDoc]                   = useState({ task: "", dueDate: "", priority: "high" });
  const [showCartOnly, setShowCartOnly]       = useState(false);

  const addDoc = () => {
    if (!newDoc.task.trim()) return;
    setTasks(prev => [...prev, { ...newDoc, section: "Paperwork", id: Date.now(), done: false, lastService: today(), interval: "annual", dueDate: newDoc.dueDate || "", serviceLogs: [], pendingComment: "" }]);
    setNewDoc({ task: "", dueDate: "", priority: "high" });
    setShowAddDoc(false);
  };

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const serviceDate = today();
      const days = intervalToDays(t.interval);
      const newDue = days > 0 ? addDays(serviceDate, days) : t.dueDate;
      const log = { date: serviceDate, comment: t.pendingComment.trim() || "Service completed" };
      return { ...t, lastService: serviceDate, dueDate: newDue, serviceLogs: [...t.serviceLogs, log], pendingComment: "" };
    }));
  };
  const updateComment = (id, val) => setTasks(prev => prev.map(t => t.id === id ? { ...t, pendingComment: val } : t));
  const addTask = () => {
    if (!newTask.task.trim()) return;
    const days = intervalToDays(newTask.interval);
    const due  = days > 0 ? addDays(today(), days) : "";
    setTasks(prev => [...prev, { ...newTask, id: Date.now(), done: false, lastService: today(), dueDate: due, serviceLogs: [], pendingComment: "" }]);
    setNewTask({ task: "", section: "General", interval: "30 days", priority: "medium" });
    setShowAddTask(false);
  };

  const getTaskUrgency = (t) => {
    const b = getDueBadge(t.dueDate);
    if (!b) return null;
    return b.label.includes("Critical") ? "critical" : b.label.includes("Overdue") ? "overdue" : "due-soon";
  };

  const maintTasks = tasks.filter(t => t.section !== "Paperwork");
  const docTasks   = tasks.filter(t => t.section === "Paperwork");

  const visibleTasks = maintTasks.filter(t => {
    if (filterSection  !== "All" && t.section !== filterSection)  return false;
    if (filterPriority !== "All" && t.priority !== filterPriority) return false;
    if (filterUrgency  !== "All") {
      const u = getTaskUrgency(t);
      if (filterUrgency === "critical" && u !== "critical") return false;
      if (filterUrgency === "overdue"  && u !== "overdue")  return false;
      if (filterUrgency === "due-soon" && u !== "due-soon") return false;
    }
    return true;
  });
  const sortedTasks = [...visibleTasks].sort((a, b) => PRIORITY_CFG[a.priority].order - PRIORITY_CFG[b.priority].order);

  const sectionStats = MAINT_SECTIONS.map(sec => {
    const st = maintTasks.filter(t => t.section === sec);
    return { sec, total: st.length, critical: st.filter(t => t.priority === "critical").length };
  });

  const urgencyCounts = {
    critical: maintTasks.filter(t => getTaskUrgency(t) === "critical").length,
    overdue:  maintTasks.filter(t => getTaskUrgency(t) === "overdue").length,
    dueSoon:  maintTasks.filter(t => getTaskUrgency(t) === "due-soon").length,
  };

  const docUrgencyCounts = {
    critical: docTasks.filter(t => getTaskUrgency(t) === "critical").length,
    overdue:  docTasks.filter(t => getTaskUrgency(t) === "overdue").length,
    dueSoon:  docTasks.filter(t => getTaskUrgency(t) === "due-soon").length,
  };

  // Repairs
  const [repairs, setRepairs] = useState([
    { id: 1, date: "2026-02-14", section: "Rigging",  description: "Lubricated foil sections, bearing stiff", status: "open"   },
    { id: 2, date: "2026-01-08", section: "Deck",     description: "Chain slipping on windlass gypsy under load", status: "open" },
    { id: 3, date: "2025-11-20", section: "Engine",   description: "250hr service — oil, fuel & air filters replaced", status: "closed" },
  ]);
  const [showAddRepair, setShowAddRepair] = useState(false);
  const [newRepair, setNewRepair] = useState({ description: "", section: "Engine", status: "open" });

  const addRepair = () => {
    if (!newRepair.description.trim()) return;
    setRepairs(prev => [{ ...newRepair, id: Date.now(), date: today() }, ...prev]);
    setNewRepair({ description: "", section: "Engine", status: "open" });
    setShowAddRepair(false);
  };
  const toggleRepairStatus = (id) => setRepairs(prev => prev.map(r => r.id === id ? { ...r, status: r.status === "open" ? "closed" : "open" } : r));

  // Filtered equipment
  const filteredEquip = equipment.filter(e => {
    if (equipFilter !== "All" && e.status !== equipFilter) return false;
    if (equipSectionFilter !== "All" && e.category !== equipSectionFilter) return false;
    return true;
  });

  const s = {
    app:     { fontFamily: "'DM Sans','Helvetica Neue',sans-serif", background: "var(--bg-app)", minHeight: "100vh", color: "var(--text-primary)" },
    topBar:  { background: "var(--brand-deep)", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, borderBottom: "1px solid var(--border)" },
    vBtn:    (a) => ({ padding: "5px 14px", borderRadius: 6, border: "none", background: a ? "var(--brand)" : "transparent", color: a ? "var(--text-on-brand)" : "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, cursor: "pointer" }),
    nav:     { background: "var(--bg-card)", borderBottom: "1px solid var(--border)", padding: "0 24px", display: "flex", gap: 2, overflowX: "auto" },
    navBtn:  (a) => ({ padding: "13px 14px", fontSize: 13, fontWeight: a ? 700 : 500, color: a ? "var(--brand)" : "var(--text-muted)", background: "none", border: "none", borderBottom: a ? "2px solid var(--brand)" : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap" }),
    main:    { maxWidth: 960, margin: "0 auto", padding: "24px 16px" },
    card:    { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 10, overflow: "hidden" },
    pill:    (a, c) => ({ padding: "4px 11px", borderRadius: 20, border: a ? `1.5px solid ${c || "var(--brand)"}` : "1.5px solid var(--border)", background: a ? (c || "var(--brand-deep)") : "transparent", color: a ? "var(--brand)" : "var(--text-muted)", fontSize: 11, fontWeight: 700, cursor: "pointer" }),
    plusBtn: { background: "var(--brand)", color: "var(--text-on-brand)", border: "none", borderRadius: 10, width: 36, height: 36, fontSize: 22, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    modalBg: { position: "fixed", inset: 0, background: "var(--bg-overlay)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
    modalBox: { background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380 },
    inp:     { width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, marginBottom: 10, boxSizing: "border-box", outline: "none", background: "var(--bg-subtle)", color: "var(--text-primary)" },
    sel:     { width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, marginBottom: 10, boxSizing: "border-box", background: "var(--bg-subtle)", color: "var(--text-primary)" },
  };

  const tabHeader = (title, subtitle, showPlus, onPlus) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{subtitle}</div>}
      </div>
      {showPlus && <button onClick={onPlus} style={s.plusBtn}>+</button>}
    </div>
  );

  // Multi-vessel state
  const BLANK_VESSEL = { id: null, vesselType: "sail", vesselName: "", ownerName: "", address: "", make: "", model: "", year: "" };
  const [vessels, setVessels] = useState([
    { id: 1, vesselType: "sail", vesselName: "Irene", ownerName: "", address: "", make: "", model: "", year: "" },
  ]);
  const [activeVesselId, setActiveVesselId] = useState(1);
  const [showVesselDropdown, setShowVesselDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState(BLANK_VESSEL);
  const [editingVesselId, setEditingVesselId] = useState(null); // null = new vessel

  const settings = vessels.find(v => v.id === activeVesselId) || vessels[0];
  const prefix = settings.vesselType === "motor" ? "M/V" : "S/V";
  const boatName = settings.vesselName ? `${prefix} ${settings.vesselName}` : `${prefix} Vessel`;

  const openAddVessel = () => {
    setEditingVesselId(null);
    setSettingsForm({ ...BLANK_VESSEL });
    setShowVesselDropdown(false);
    setShowSettings(true);
  };
  const openEditVessel = (vessel) => {
    setEditingVesselId(vessel.id);
    setSettingsForm({ ...vessel });
    setShowVesselDropdown(false);
    setShowSettings(true);
  };
  const saveVessel = () => {
    if (!settingsForm.vesselName.trim()) return;
    if (editingVesselId) {
      setVessels(vs => vs.map(v => v.id === editingVesselId ? { ...settingsForm, id: editingVesselId } : v));
    } else {
      const newId = Date.now();
      setVessels(vs => [...vs, { ...settingsForm, id: newId }]);
      setActiveVesselId(newId);
    }
    setShowSettings(false);
  };
  const deleteVessel = (id) => {
    if (vessels.length <= 1) return; // can't delete the last one
    setVessels(vs => vs.filter(v => v.id !== id));
    if (activeVesselId === id) setActiveVesselId(vessels.find(v => v.id !== id)?.id);
    setShowSettings(false);
  };
  const openRepairs = repairs.filter(r => r.status === "open").length;
  const criticalMaint = maintTasks.filter(t => getTaskUrgency(t) === "critical").length;
  const totalAlerts = openRepairs + criticalMaint;
  const [showUrgentPanel, setShowUrgentPanel] = useState(false);

  return (
    <div style={s.app} onClick={() => setShowVesselDropdown(false)}>
      {/* TOP BAR */}
      <div style={s.topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Keeply logo — shield + gear + checkmark + wordmark */}
          <svg width="130" height="36" viewBox="0 0 130 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="ksg" x1="4" y1="2" x2="32" y2="34" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#5bbcf8"/>
                <stop offset="100%" stopColor="#0e5cc7"/>
              </linearGradient>
            </defs>
            <path d="M18 2L4 7.5V18c0 7.5 6 13.5 14 16 8-2.5 14-8.5 14-16V7.5L18 2Z" fill="url(#ksg)"/>
            <circle cx="18" cy="18" r="7.2" stroke="white" strokeWidth="2" fill="none"/>
            <line x1="18" y1="10.8" x2="18" y2="8.6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="18" y1="25.2" x2="18" y2="27.4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="10.8" y1="18" x2="8.6" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="25.2" y1="18" x2="27.4" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="13" y1="13" x2="11.4" y2="11.4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="23" y1="23" x2="24.6" y2="24.6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="23" y1="13" x2="24.6" y2="11.4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="13" y1="23" x2="11.4" y2="24.6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M13.5 18l3.2 3.2L23 13.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <text x="40" y="24" fontFamily="DM Sans,Helvetica Neue,sans-serif" fontWeight="800" fontSize="18" fill="white">Keeply</text>
          </svg>
          {/* Vessel switcher dropdown */}
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.25)", paddingLeft: 14, position: "relative" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowVesselDropdown(o => !o)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 9, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase" }}>Vessel</div>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, marginTop: 1, display: "flex", alignItems: "center", gap: 5 }}>
                {boatName}
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>▾</span>
              </div>
            </button>
            {showVesselDropdown && (
              <div style={{ position: "absolute", top: "calc(100% + 10px)", left: 0, background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: 12, minWidth: 220, zIndex: 500, overflow: "hidden" }}
                onClick={e => e.stopPropagation()}>
                <div style={{ padding: "8px 0" }}>
                  {vessels.map(v => {
                    const pfx = v.vesselType === "motor" ? "M/V" : "S/V";
                    const name = v.vesselName ? `${pfx} ${v.vesselName}` : `${pfx} Vessel`;
                    const isActive = v.id === activeVesselId;
                    return (
                      <div key={v.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: isActive ? "var(--brand-deep)" : "transparent", cursor: "pointer" }}
                        onClick={() => { setActiveVesselId(v.id); setShowVesselDropdown(false); }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? "var(--brand)" : "var(--text-primary)" }}>{name}</div>
                          {(v.make || v.year) && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{[v.year, v.make, v.model].filter(Boolean).join(" ")}</div>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {isActive && <span style={{ fontSize: 11, color: "var(--brand)", fontWeight: 700 }}>✓</span>}
                          <button onClick={e => { e.stopPropagation(); openEditVessel(v); }}
                            style={{ background: "none", border: "none", fontSize: 13, cursor: "pointer", color: "var(--text-muted)", padding: "2px 4px" }}>⚙️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ borderTop: "1px solid var(--border)", padding: "6px 8px" }}>
                  <button onClick={openAddVessel}
                    style={{ width: "100%", padding: "9px 12px", background: "var(--bg-subtle)", border: "1.5px dashed var(--border-strong)", borderRadius: 8, color: "var(--brand)", fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
                    + Add Vessel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Urgent notification — simplified to total count */}
          {view === "customer" && totalAlerts > 0 && (
            <button onClick={() => setShowUrgentPanel(true)}
              style={{ background: "var(--danger-text)", color: "var(--text-on-brand)", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              🔔 {totalAlerts} Urgent
            </button>
          )}
          {view === "customer" && <button onClick={() => setShowCartPanel(true)} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>🛒 {cartQty > 0 ? `(${cartQty})` : ""}</button>}
          {/* Settings gear — edits active vessel */}
          <button onClick={() => openEditVessel(settings)}
            style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "none", borderRadius: 8, width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
            ⚙️
          </button>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.12)", borderRadius: 8, padding: 3, gap: 2 }}>
            <button style={s.vBtn(view === "customer")} onClick={() => setView("customer")}>Customer</button>
            <button style={s.vBtn(view === "admin")} onClick={() => setView("admin")}>Admin</button>
          </div>
        </div>
      </div>

      {orderSuccess && <div style={{ background: "var(--ok-text)", color: "var(--text-on-brand)", padding: "12px 24px", fontSize: 14, fontWeight: 600, textAlign: "center" }}>✅ Order {orderSuccess} confirmed!</div>}

      {/* Welcome banner */}
      {settings.ownerName && view === "customer" && (
        <div style={{ background: "#0a3d70", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "8px 24px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>⚓</span>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}><a href="#" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "underline", textDecorationStyle: "dotted", cursor: "pointer" }}>Welcome Aboard</a>, <strong style={{ color: "#fff" }}>{settings.ownerName.trim().split(" ")[0]}</strong></span>
        </div>
      )}

      {/* CUSTOMER VIEW */}
      {view === "customer" && (
        <>
          <nav style={s.nav}>
            {[["equipment","⚙ My Equipment"],["repairs","🔧 Repairs"],["maintenance","📅 Maintenance"],["documentation","📄 Documentation"],["suggested","🛒 Suggested Items"]].map(([id,label]) => (
              <button key={id} style={s.navBtn(tab===id)} onClick={() => setTab(id)}>{label}</button>
            ))}
          </nav>

          <main style={s.main}>

            {/* ══════ EQUIPMENT TAB ══════ */}
            {tab === "equipment" && (
              <>
                {tabHeader("My Equipment", "Tap any item to see parts.", true, () => setShowAddEquip(true))}

                {/* Status filter */}
                <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", alignSelf: "center", letterSpacing: "0.5px" }}>STATUS</span>
                  {[["All","All",null],["good","Good","var(--ok-text)"],["watch","Watch","var(--warn-text)"],["needs-service","Needs Service","var(--danger-text)"]].map(([val,label,color]) => (
                    <button key={val} style={s.pill(equipFilter===val,color)} onClick={() => setEquipFilter(val)}>{label}</button>
                  ))}
                </div>
                {/* Section filter — unified with Maintenance icons */}
                <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", alignSelf: "center", letterSpacing: "0.5px" }}>SECTION</span>
                  <button style={s.pill(equipSectionFilter === "All", null)} onClick={() => setEquipSectionFilter("All")}>All</button>
                  {[...new Set(equipment.map(e => e.category))].sort().map(sec => (
                    <button key={sec} style={s.pill(equipSectionFilter === sec, null)} onClick={() => setEquipSectionFilter(sec)}>
                      {SECTIONS[sec] || ""} {sec}
                    </button>
                  ))}
                </div>

                {filteredEquip.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>No equipment matches these filters.</div>}

                {filteredEquip.map(eq => {
                  const isOpen = expandedEquip === eq.id;
                  const activeTab = equipTab[eq.id] || "parts";
                  const catalogParts = PARTS_CATALOG.filter(p => (EQUIPMENT_PARTS[eq.category]||[]).includes(p.id));
                  const allParts = [...catalogParts, ...(eq.customParts||[])];
                  const docs = eq.docs || [];
                  const docsAvail = getAutoSuggestedDocs(eq.name).filter(d => !docs.find(ed => ed.id === d.id));

                  const openTo = (tab) => {
                    setEquipTab(t => ({ ...t, [eq.id]: tab }));
                    setExpandedEquip(eq.id);
                  };

                  return (
                    <div key={eq.id} style={{ ...s.card, borderColor: isOpen ? "#c7d7ef" : "var(--border)" }}>
                      {/* CARD HEADER */}
                      <div style={{ padding: "13px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setExpandedEquip(isOpen ? null : eq.id)}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{eq.name}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                            {SECTIONS[eq.category] || ""} {eq.category} · {fmt(eq.lastService)}
                            {eq.notes && <span style={{ fontStyle: "italic", color: "#b0b8c8" }}> · {eq.notes}</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <select value={eq.status} onChange={e => { e.stopPropagation(); updateEquipStatus(eq.id, e.target.value); }}
                            style={{ fontSize: 11, fontWeight: 700, border: `1.5px solid ${STATUS_CFG[eq.status].color}50`, background: STATUS_CFG[eq.status].bg, color: STATUS_CFG[eq.status].color, borderRadius: 20, padding: "3px 7px", cursor: "pointer", outline: "none" }}>
                            <option value="good">● Good</option>
                            <option value="watch">● Watch</option>
                            <option value="needs-service">● Needs Service</option>
                          </select>
                          {/* Parts icon button */}
                          <button onClick={() => openTo("parts")} title={`${allParts.length} parts`}
                            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, background: isOpen && activeTab === "parts" ? "var(--brand-deep)" : "var(--bg-subtle)", border: `1.5px solid ${isOpen && activeTab === "parts" ? "var(--brand)" : "var(--border)"}`, borderRadius: 8, padding: "5px 9px", cursor: "pointer", minWidth: 44 }}>
                            <span style={{ fontSize: 15 }}>🔩</span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: isOpen && activeTab === "parts" ? "var(--brand)" : "var(--text-muted)" }}>{allParts.length}</span>
                          </button>
                          {/* Docs icon button */}
                          <button onClick={() => openTo("docs")} title={`${docs.length} docs`}
                            style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, background: isOpen && activeTab === "docs" ? "var(--brand-deep)" : "var(--bg-subtle)", border: `1.5px solid ${isOpen && activeTab === "docs" ? "var(--brand)" : docsAvail.length > 0 ? "var(--brand)" : "var(--border)"}`, borderRadius: 8, padding: "5px 9px", cursor: "pointer", minWidth: 44 }}>
                            <span style={{ fontSize: 15 }}>📄</span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: isOpen && activeTab === "docs" ? "var(--brand)" : "var(--text-muted)" }}>{docs.length}</span>
                            {docsAvail.length > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "var(--brand)", color: "var(--text-on-brand)", borderRadius: "50%", width: 14, height: 14, fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{docsAvail.length}</span>}
                          </button>
                          <span style={{ color: "#c4cdd8", fontSize: 16, cursor: "pointer" }} onClick={() => setExpandedEquip(isOpen ? null : eq.id)}>{isOpen ? "▾" : "▸"}</span>
                        </div>
                      </div>

                      {/* EXPANDED PANEL */}
                      {isOpen && (
                        <div style={{ borderTop: "1px solid #e8edf2", background: "#fafbfd" }}>
                          {/* Inner tab bar */}
                          <div style={{ display: "flex", borderBottom: "1px solid #e8edf2" }}>
                            {[["parts","🔩 Parts",allParts.length,"var(--brand)"],["docs","📄 Documents",docs.length,"var(--brand)"]].map(([id,label,count,color]) => (
                              <button key={id} onClick={() => setEquipTab(t => ({ ...t, [eq.id]: id }))}
                                style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: activeTab===id ? 700 : 500, color: activeTab===id ? color : "var(--text-muted)", background: "none", border: "none", borderBottom: activeTab===id ? `2px solid ${color}` : "2px solid transparent", cursor: "pointer" }}>
                                {label} <span style={{ fontSize: 10, background: activeTab===id ? `${color}15` : "var(--bg-subtle)", color: activeTab===id ? color : "var(--text-muted)", borderRadius: 10, padding: "1px 6px", marginLeft: 3, fontWeight: 700 }}>{count}</span>
                              </button>
                            ))}
                          </div>

                          <div style={{ padding: "14px 18px 16px" }}>
                            {/* PARTS TAB */}
                            {activeTab === "parts" && (<>
                              {allParts.length === 0 && <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "8px 0" }}>No parts yet.</div>}
                              {allParts.map((part, idx) => {
                                const inCart = cart.find(i => i.id === part.id);
                                return (
                                  <div key={part.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: idx < allParts.length - 1 ? "1px solid var(--border)" : "none" }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      {part.url ? <a href={part.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, color: "var(--brand)", textDecoration: "none" }}>{part.name} ↗</a>
                                        : <span style={{ fontSize: 13, fontWeight: 600 }}>{part.name}</span>}
                                      <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                                        {part.vendor !== "custom" && <span style={{ fontSize: 10, background: `${VENDOR_COLORS[part.vendor]}15`, color: VENDOR_COLORS[part.vendor], borderRadius: 4, padding: "2px 6px", fontWeight: 700 }}>{VENDOR_LABELS[part.vendor]}</span>}
                                        {part.vendor === "custom" && <span style={{ fontSize: 10, background: "var(--bg-subtle)", color: "var(--text-muted)", borderRadius: 4, padding: "2px 6px", fontWeight: 600 }}>Custom</span>}
                                        {part.sku && <span style={{ fontSize: 10, color: "#b0b8c8" }}>SKU: {part.sku}</span>}
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 12, flexShrink: 0 }}>
                                      <span style={{ fontSize: 14, fontWeight: 800, color: "var(--brand)" }}>${part.price || part.retailPrice}</span>
                                      {part.vendor !== "custom" && (inCart
                                        ? <div style={{ display: "flex", gap: 5, alignItems: "center" }}><span style={{ fontSize: 11, color: "var(--ok-text)", fontWeight: 700 }}>✓</span><button onClick={() => removeFromCart(part.id)} style={{ background: "#fee2e2", color: "var(--danger-text)", border: "none", borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer" }}>✕</button></div>
                                        : <button onClick={() => addToCart(part)} style={{ background: "var(--brand)", color: "var(--text-on-brand)", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Add</button>)}
                                    </div>
                                  </div>
                                );
                              })}
                              {addingPartFor === eq.id ? (
                                <div style={{ marginTop: 12, background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>ADD PART</div>
                                  <input placeholder="Part name *" value={newPartForm.name} onChange={e => setNewPartForm({...newPartForm, name: e.target.value})} style={s.inp} />
                                  <input placeholder="URL / Product link" value={newPartForm.url} onChange={e => setNewPartForm({...newPartForm, url: e.target.value})} style={s.inp} />
                                  <input placeholder="Price (e.g. 42)" value={newPartForm.price} onChange={e => setNewPartForm({...newPartForm, price: e.target.value})} style={s.inp} />
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button onClick={() => { setAddingPartFor(null); setNewPartForm({ name:"", url:"", price:"" }); }} style={{ flex: 1, padding: "7px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-subtle)", color: "var(--text-primary)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
                                    <button onClick={() => addCustomPart(eq.id)} style={{ flex: 1, padding: "7px", border: "none", borderRadius: 8, background: "var(--brand)", color: "var(--text-on-brand)", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Add Part</button>
                                  </div>
                                </div>
                              ) : (
                                <button onClick={() => { setAddingPartFor(eq.id); setNewPartForm({ name:"", url:"", price:"" }); }} style={{ marginTop: 10, background: "none", border: "1.5px dashed #c7d2e8", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", cursor: "pointer", width: "100%" }}>+ Add Part</button>
                              )}
                              {allParts.some(p => cart.find(i => i.id === p.id)) && (
                                <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                                  <button onClick={() => setShowCartPanel(true)} style={{ background: "#f0fdf4", color: "var(--ok-text)", border: "1px solid #86efac", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>View Cart ({cartQty}) →</button>
                                </div>
                              )}
                            </>)}

                            {/* DOCS TAB */}
                            {activeTab === "docs" && (<>
                              {docsAvail.length > 0 && (
                                <div style={{ background: "#faf5ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
                                  <div style={{ fontSize: 11, color: "var(--brand)", fontWeight: 700, marginBottom: 8 }}>✨ {docsAvail.length} MANUFACTURER DOCUMENT{docsAvail.length>1?"S":""} AVAILABLE</div>
                                  {docsAvail.map(doc => {
                                    const tc = DOC_TYPE_CFG[doc.type] || DOC_TYPE_CFG["Other"];
                                    return (
                                      <div key={doc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #ede9fe" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                          <span>{tc.icon}</span>
                                          <div>
                                            <div style={{ fontSize: 12, fontWeight: 600 }}>{doc.label}</div>
                                            <span style={{ fontSize: 10, background: tc.bg, color: tc.color, borderRadius: 4, padding: "1px 5px", fontWeight: 700 }}>{doc.type}</span>
                                          </div>
                                        </div>
                                        <button onClick={() => addSuggestedDoc(eq.id, doc)} style={{ background: "var(--brand)", color: "var(--text-on-brand)", border: "none", borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Add</button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {docs.length === 0 && addingDocFor !== eq.id && <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "8px 0" }}>No documents yet.</div>}
                              {docs.map((doc, idx) => {
                                const tc = DOC_TYPE_CFG[doc.type] || DOC_TYPE_CFG["Other"];
                                return (
                                  <div key={doc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: idx < docs.length - 1 ? "1px solid var(--border)" : "none" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                      <span style={{ fontSize: 16, flexShrink: 0 }}>{tc.icon}</span>
                                      <div style={{ minWidth: 0 }}>
                                        {doc.isFile
                                          ? <a href={doc.url} download={doc.fileName || doc.label} style={{ fontSize: 13, fontWeight: 600, color: "var(--brand)", textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.label} ⬇</a>
                                          : <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, color: "var(--brand)", textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.label} ↗</a>}
                                        <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                                          <span style={{ fontSize: 10, background: tc.bg, color: tc.color, borderRadius: 4, padding: "1px 5px", fontWeight: 700 }}>{doc.type}</span>
                                          {doc.isFile && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>📁 Local file</span>}
                                        </div>
                                      </div>
                                    </div>
                                    <button onClick={() => removeDoc(eq.id, doc.id)} style={{ background: "none", border: "none", color: "var(--danger-text)", cursor: "pointer", fontSize: 14, marginLeft: 8, flexShrink: 0 }}>✕</button>
                                  </div>
                                );
                              })}
                              {addingDocFor === eq.id ? (
                                <div style={{ marginTop: 10, background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>ADD DOCUMENT</div>
                                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                                    {[["url","🔗 URL"],["file","📁 File"]].map(([val,lbl]) => (
                                      <button key={val} onClick={() => setNewDocForm({...newDocForm, source: val})}
                                        style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: newDocForm.source===val ? "2px solid var(--brand)" : "1.5px solid var(--border)", background: newDocForm.source===val ? "var(--brand-deep)" : "var(--bg-subtle)", color: newDocForm.source===val ? "var(--brand)" : "var(--text-muted)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{lbl}</button>
                                    ))}
                                  </div>
                                  <input placeholder="Label *" value={newDocForm.label} onChange={e => setNewDocForm({...newDocForm, label: e.target.value})} style={s.inp} />
                                  {newDocForm.source === "url"
                                    ? <input placeholder="https:// link *" value={newDocForm.url} onChange={e => setNewDocForm({...newDocForm, url: e.target.value})} style={s.inp} />
                                    : <div style={{ marginBottom: 10 }}>
                                        <label style={{ display: "block", border: "1.5px dashed #ddd6fe", borderRadius: 8, padding: "12px", textAlign: "center", cursor: "pointer", background: newDocForm.fileData ? "#f5f3ff" : "#fafbff" }}>
                                          {newDocForm.fileData
                                            ? <div><div style={{ fontSize: 18 }}>✅</div><div style={{ fontSize: 12, fontWeight: 600, color: "var(--brand)" }}>{newDocForm.fileName}</div><div style={{ fontSize: 10, color: "var(--text-muted)" }}>Click to replace</div></div>
                                            : <div><div style={{ fontSize: 22 }}>📁</div><div style={{ fontSize: 12, fontWeight: 600, color: "var(--brand)" }}>Click to choose file</div><div style={{ fontSize: 10, color: "var(--text-muted)" }}>PDF, images, docs</div></div>}
                                          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt" style={{ display: "none" }}
                                            onChange={e => {
                                              const file = e.target.files[0]; if (!file) return;
                                              const reader = new FileReader();
                                              reader.onload = ev => setNewDocForm(f => ({ ...f, fileData: ev.target.result, fileName: file.name, label: f.label || file.name.replace(/\.[^/.]+$/, "") }));
                                              reader.readAsDataURL(file);
                                            }} />
                                        </label>
                                      </div>}
                                  <select value={newDocForm.type} onChange={e => setNewDocForm({...newDocForm, type: e.target.value})} style={{ ...s.sel, marginBottom: 10 }}>
                                    {Object.keys(DOC_TYPE_CFG).map(t => <option key={t} value={t}>{DOC_TYPE_CFG[t].icon} {t}</option>)}
                                  </select>
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button onClick={() => { setAddingDocFor(null); setNewDocForm({ label:"", url:"", type:"Manual", source:"url", fileData:null, fileName:"" }); }} style={{ flex: 1, padding: "7px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-subtle)", color: "var(--text-primary)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
                                    <button onClick={() => addCustomDoc(eq.id)} style={{ flex: 1, padding: "7px", border: "none", borderRadius: 8, background: "var(--brand)", color: "var(--text-on-brand)", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Add Document</button>
                                  </div>
                                </div>
                              ) : (
                                <button onClick={() => { setAddingDocFor(eq.id); setNewDocForm({ label:"", url:"", type:"Manual", source:"url", fileData:null, fileName:"" }); }} style={{ marginTop: 8, background: "none", border: "1.5px dashed var(--border-strong)", borderRadius: 8, padding: "6px 16px", fontSize: 12, fontWeight: 600, color: "var(--brand)", cursor: "pointer", width: "100%" }}>+ Add Document</button>
                              )}
                            </>)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* ══════ REPAIRS TAB ══════ */}
            {tab === "repairs" && (
              <>
                {tabHeader("Repair Log", "Track open and closed repair items.", true, () => setShowAddRepair(true))}

                {/* Summary counts */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
                  {[
                    { label: "Open",   val: repairs.filter(r=>r.status==="open").length,   color: "#ea580c", bg: "#fff7ed" },
                    { label: "Closed", val: repairs.filter(r=>r.status==="closed").length, color: "var(--ok-text)", bg: "#f0fdf4" },
                    { label: "Total",  val: repairs.length,                                color: "var(--brand)", bg: "#eff6ff" },
                  ].map(st => (
                    <div key={st.label} style={{ background: st.bg, border: `1px solid ${st.color}25`, borderRadius: 12, padding: "12px 16px" }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: st.color, lineHeight: 1 }}>{st.val}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, fontWeight: 500 }}>{st.label}</div>
                    </div>
                  ))}
                </div>

                {repairs.length === 0 && <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>No repairs logged yet.</div>}

                {repairs.map(repair => (
                  <div key={repair.id} style={{ ...s.card, opacity: repair.status === "closed" ? 0.65 : 1 }}>
                    <div style={{ padding: "13px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                      {/* Toggle open/closed */}
                      <button onClick={() => toggleRepairStatus(repair.id)}
                        style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${repair.status === "open" ? "var(--warn-text)" : "var(--ok-text)"}`, background: repair.status === "closed" ? "var(--ok-text)" : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: repair.status === "closed" ? "var(--text-on-brand)" : "transparent", fontSize: 12 }}>
                        ✓
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: repair.status === "closed" ? "var(--text-muted)" : "var(--text-primary)", textDecoration: repair.status === "closed" ? "line-through" : "none" }}>{repair.description}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, background: "var(--bg-subtle)", color: "var(--text-secondary)", borderRadius: 5, padding: "1px 6px" }}>{SECTIONS[repair.section] || "🔧"} {repair.section}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{fmt(repair.date)} · {repair.status === "open" ? "Open" : "Closed"}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "2px 8px", background: repair.status === "open" ? "var(--warn-bg)" : "var(--ok-bg)", color: repair.status === "open" ? "var(--warn-text)" : "var(--ok-text)", flexShrink: 0 }}>
                        {repair.status === "open" ? "Open" : "Closed"}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* ══════ MAINTENANCE TAB ══════ */}
            {tab === "maintenance" && (
              <>
                {tabHeader("Maintenance", "Check off to log service and reset due date.", true, () => setShowAddTask(true))}

                {/* Urgency cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
                  {[
                    { label: "🔴 Critical",  sub: "10+ days past due", val: urgencyCounts.critical, color: "var(--danger-text)", bg: "#fee2e2", key: "critical" },
                    { label: "🟠 Overdue",   sub: "5–9 days past due", val: urgencyCounts.overdue,  color: "#ea580c", bg: "#fff7ed", key: "overdue"  },
                    { label: "🟡 Due Soon",  sub: "within 3 days",     val: urgencyCounts.dueSoon,  color: "#ca8a04", bg: "#fefce8", key: "due-soon" },
                  ].map(st => {
                    const active = filterUrgency === st.key;
                    return (
                      <div key={st.key} onClick={() => { setFilterUrgency(active ? "All" : st.key); setFilterSection("All"); setFilterPriority("All"); }}
                        style={{ background: st.bg, border: active ? `2px solid ${st.color}` : `1px solid ${st.color}25`, borderRadius: 12, padding: "12px 14px", cursor: "pointer", boxShadow: active ? `0 0 0 3px ${st.color}20` : "none", userSelect: "none" }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: st.color, lineHeight: 1 }}>{st.val}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: st.color, marginTop: 2 }}>{st.label}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{st.sub}</div>
                        {active && <div style={{ fontSize: 9, color: st.color, fontWeight: 700, marginTop: 4 }}>FILTERED ✕</div>}
                      </div>
                    );
                  })}
                </div>

                {/* Section + Priority filters */}
                <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", alignSelf: "center", letterSpacing: "0.5px" }}>SECTION</span>
                  {["All",...MAINT_SECTIONS].map(sec => <button key={sec} style={s.pill(filterSection===sec,null)} onClick={() => { setFilterSection(sec); setFilterUrgency("All"); setFilterPriority("All"); }}>{SECTIONS[sec]||""} {sec}</button>)}
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", alignSelf: "center", letterSpacing: "0.5px" }}>PRIORITY</span>
                  {["All","critical","high","medium","low"].map(p => <button key={p} style={s.pill(filterPriority===p, PRIORITY_CFG[p]?.color)} onClick={() => { setFilterPriority(p); setFilterUrgency("All"); }}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>)}
                </div>

                {/* Accordion or flat list */}
                {filterSection==="All" && filterPriority==="All" && filterUrgency==="All" ? (
                  MAINT_SECTIONS.map(sec => {
                    const stat = sectionStats.find(s => s.sec === sec);
                    const isOpen = expandedSection === sec;
                    const secTasks = [...maintTasks.filter(t => t.section===sec)].sort((a,b) => PRIORITY_CFG[a.priority].order-PRIORITY_CFG[b.priority].order);
                    return (
                      <div key={sec} style={s.card}>
                        <div onClick={() => setExpandedSection(isOpen ? null : sec)} style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 20 }}>{SECTIONS[sec]||"📋"}</span>
                            <div>
                              <span style={{ fontSize: 14, fontWeight: 700 }}>{sec}</span>
                              <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>{stat.total} tasks</span>
                            </div>
                            {stat.critical > 0 && <span style={{ background: "#fee2e2", color: "var(--danger-text)", borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 700 }}>⚠ {stat.critical} critical</span>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 70, height: 5, background: "var(--bg-subtle)", borderRadius: 3 }}>
                              <div style={{ height: "100%", width: `${Math.min(100, (secTasks.filter(t=>t.serviceLogs.length>0).length/stat.total)*100)}%`, background: "var(--ok-text)", borderRadius: 3 }} />
                            </div>
                            <span style={{ color: "var(--text-muted)", fontSize: 18 }}>{isOpen ? "▾" : "▸"}</span>
                          </div>
                        </div>
                        {isOpen && (
                          <div style={{ borderTop: "1px solid var(--border)" }}>
                            {secTasks.map((task,idx) => <TaskRow key={task.id} task={task} idx={idx} total={secTasks.length} onToggle={toggleTask} onComment={updateComment} />)}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  sortedTasks.length === 0
                    ? <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}><div style={{ fontSize: 32 }}>✅</div><div style={{ marginTop: 8 }}>No tasks match this filter</div></div>
                    : sortedTasks.map((task,idx) => <TaskRow key={task.id} task={task} idx={idx} total={sortedTasks.length} onToggle={toggleTask} onComment={updateComment} showSection />)
                )}
              </>
            )}

            {/* ══════ DOCUMENTATION TAB ══════ */}
            {tab === "documentation" && (
              <>
                {tabHeader("Documentation", "Registration, insurance, and license renewals.", true, () => setShowAddDoc(true))}

                {/* Urgency cards — same as Maintenance */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
                  {[
                    { label: "🔴 Critical",  sub: "10+ days past due", val: docUrgencyCounts.critical, color: "var(--danger-text)", bg: "#fee2e2", key: "critical" },
                    { label: "🟠 Overdue",   sub: "5–9 days past due", val: docUrgencyCounts.overdue,  color: "#ea580c", bg: "#fff7ed", key: "overdue"  },
                    { label: "🟡 Due Soon",  sub: "within 3 days",     val: docUrgencyCounts.dueSoon,  color: "#ca8a04", bg: "#fefce8", key: "due-soon" },
                  ].map(st => (
                    <div key={st.key} style={{ background: st.bg, border: `1px solid ${st.color}25`, borderRadius: 12, padding: "12px 14px" }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: st.color, lineHeight: 1 }}>{st.val}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: st.color, marginTop: 2 }}>{st.label}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{st.sub}</div>
                    </div>
                  ))}
                </div>

                <div style={s.card}>
                  {docTasks.sort((a,b) => PRIORITY_CFG[a.priority].order - PRIORITY_CFG[b.priority].order)
                    .map((task, idx) => <TaskRow key={task.id} task={task} idx={idx} total={docTasks.length} onToggle={toggleTask} onComment={updateComment} />)}
                  {docTasks.length === 0 && <div style={{ padding: "24px 20px", color: "var(--text-muted)", fontSize: 13 }}>No documentation items yet. Tap + to add one.</div>}
                </div>
              </>
            )}

            {/* ══════ SUGGESTED ITEMS TAB ══════ */}
            {tab === "suggested" && (() => {
              // Build suggestions — compute outside useState, purely from existing state
              const suggestions = [];
              const seen = new Set();
              const addSuggestion = (part, reason, priority) => {
                if (seen.has(part.id)) {
                  const ex = suggestions.find(s => s.part.id === part.id);
                  if (ex && PRIORITY_CFG[priority].order < PRIORITY_CFG[ex.priority].order) { ex.priority = priority; ex.reasons.unshift(reason); }
                  else if (ex) ex.reasons.push(reason);
                  return;
                }
                seen.add(part.id);
                suggestions.push({ part, reasons: [reason], priority });
              };
              equipment.forEach(eq => {
                PARTS_CATALOG.filter(p => (EQUIPMENT_PARTS[eq.category]||[]).includes(p.id)).forEach(part => {
                  if (eq.status === "needs-service") addSuggestion(part, `${eq.name} needs service`, "high");
                  else if (eq.status === "watch")    addSuggestion(part, `${eq.name} on watch list`, "medium");
                });
                (eq.customParts||[]).filter(() => eq.status === "needs-service").forEach(cp =>
                  addSuggestion({ ...cp, retailPrice: cp.price, vendor: "custom" }, `${eq.name} needs service`, "high"));
              });
              repairs.filter(r => r.status === "open").forEach(repair =>
                PARTS_CATALOG.filter(p => p.category === repair.section).forEach(part =>
                  addSuggestion(part, `Open repair: ${repair.description.slice(0,45)}${repair.description.length>45?"…":""}`, "high")));
              maintTasks.filter(t => getTaskUrgency(t) === "critical").forEach(task =>
                PARTS_CATALOG.filter(p => p.category === task.section).forEach(part =>
                  addSuggestion(part, `Maintenance: ${task.task}`, "medium")));
              suggestions.sort((a,b) => PRIORITY_CFG[a.priority].order - PRIORITY_CFG[b.priority].order);

              const inCartSuggestions = suggestions.filter(s => cart.find(i => i.id === s.part.id));
              const cartTotal2 = inCartSuggestions.reduce((sum, s) => {
                const qty = cart.find(i => i.id === s.part.id)?.qty || 0;
                return sum + parseFloat(s.part.retailPrice || s.part.price || 0) * qty;
              }, 0);
              const visibleSuggestions = showCartOnly ? inCartSuggestions : suggestions;

              return (
                <>
                  {tabHeader("Suggested Items", "Parts recommended based on your equipment, open repairs, and maintenance.", false)}

                  {/* Stat cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
                    {/* Suggestions count */}
                    <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "12px 14px" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--brand)", lineHeight: 1 }}>{suggestions.length}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, fontWeight: 500 }}>Suggestions</div>
                    </div>
                    {/* In Cart — clickable filter */}
                    <div onClick={() => setShowCartOnly(o => !o)}
                      style={{ background: showCartOnly ? "#dcfce7" : "#f0fdf4", border: showCartOnly ? "2px solid #16a34a" : "1px solid #bbf7d0", borderRadius: 12, padding: "12px 14px", cursor: "pointer", userSelect: "none", boxShadow: showCartOnly ? "0 0 0 3px #16a34a20" : "none" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ok-text)", lineHeight: 1 }}>{inCartSuggestions.length}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, fontWeight: 500 }}>In Cart</div>
                      {showCartOnly && <div style={{ fontSize: 9, color: "var(--ok-text)", fontWeight: 700, marginTop: 3, letterSpacing: "0.4px" }}>FILTERED ✕</div>}
                    </div>
                    {/* Checkout / Buy Now */}
                    <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--brand)", lineHeight: 1 }}>${cartTotal2.toFixed(0)}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, fontWeight: 500 }}>Checkout</div>
                      </div>
                      {inCartSuggestions.length > 0 && (
                        <button onClick={() => setShowCartPanel(true)}
                          style={{ marginTop: 8, background: "var(--brand)", color: "var(--text-on-brand)", border: "none", borderRadius: 7, padding: "5px 0", fontSize: 11, fontWeight: 700, cursor: "pointer", width: "100%" }}>
                          Buy Now →
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List */}
                  {suggestions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-muted)" }}>
                      <div style={{ fontSize: 36 }}>✅</div>
                      <div style={{ marginTop: 10, fontSize: 15, fontWeight: 600 }}>Nothing needed right now</div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>Suggestions appear when equipment needs service, repairs are open, or maintenance is overdue.</div>
                    </div>
                  ) : visibleSuggestions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 24px", color: "var(--text-muted)" }}>
                      <div style={{ fontSize: 28 }}>🛒</div>
                      <div style={{ marginTop: 8, fontSize: 14 }}>No suggested items in cart yet.</div>
                      <button onClick={() => setShowCartOnly(false)} style={{ marginTop: 10, background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>Show all suggestions</button>
                    </div>
                  ) : visibleSuggestions.map(({ part, reasons, priority }) => {
                    const inCart = cart.find(i => i.id === part.id);
                    const price = part.retailPrice || part.price;
                    return (
                      <div key={part.id} style={{ background: "var(--bg-card)", border: `1px solid var(--border)`, borderLeft: `3px solid ${PRIORITY_CFG[priority].color}`, borderRadius: 12, marginBottom: 10, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            {part.url
                              ? <a href={part.url} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 700, color: "var(--brand)", textDecoration: "none" }}>{part.name} ↗</a>
                              : <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{part.name}</span>}
                            <span style={{ background: PRIORITY_CFG[priority].bg, color: PRIORITY_CFG[priority].color, borderRadius: 5, padding: "1px 7px", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{priority}</span>
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                            {part.vendor && part.vendor !== "custom" && <span style={{ fontSize: 10, background: `${VENDOR_COLORS[part.vendor]}15`, color: VENDOR_COLORS[part.vendor], borderRadius: 4, padding: "2px 6px", fontWeight: 700 }}>{VENDOR_LABELS[part.vendor]}</span>}
                            {part.sku && <span style={{ fontSize: 10, color: "#b0b8c8" }}>SKU: {part.sku}</span>}
                          </div>
                          <div style={{ marginTop: 6 }}>
                            {reasons.slice(0,3).map((r, i) => (
                              <div key={i} style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, marginBottom: 1 }}>
                                <span style={{ color: PRIORITY_CFG[priority].color }}>›</span> {r}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 17, fontWeight: 800, color: "var(--brand)" }}>${price}</span>
                          {part.vendor !== "custom" && (
                            inCart
                              ? <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <span style={{ fontSize: 11, color: "var(--ok-text)", fontWeight: 700 }}>✓ In Cart</span>
                                  <button onClick={() => removeFromCart(part.id)} style={{ background: "#fee2e2", color: "var(--danger-text)", border: "none", borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer" }}>✕</button>
                                </div>
                              : <button onClick={() => addToCart(part)} style={{ background: "var(--brand)", color: "var(--text-on-brand)", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Add</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}

          </main>
        </>
      )}

      {/* ADMIN VIEW */}
      {view === "admin" && (
        <>
          <div style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)", padding: "12px 24px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚙</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Admin Dashboard</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 4 }}>Order management & fulfillment queue</span>
          </div>
          <main style={s.main}><AdminDashboard orders={orders} onUpdateStatus={updateOrderStatus} /></main>
        </>
      )}

      {/* ── ADD REPAIR MODAL ── */}
      {showAddRepair && (
        <div style={s.modalBg}>
          <div style={s.modalBox}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Log Repair Item</div>
            <textarea placeholder="Description *" value={newRepair.description} onChange={e => setNewRepair({...newRepair, description: e.target.value})}
              style={{ ...s.inp, height: 80, resize: "vertical" }} />
            <select value={newRepair.section} onChange={e => setNewRepair({...newRepair, section: e.target.value})} style={s.sel}>
              {ALL_SECTIONS.filter(s => s !== "Paperwork").map(sec => <option key={sec} value={sec}>{sec}</option>)}
            </select>
            <select value={newRepair.status} onChange={e => setNewRepair({...newRepair, status: e.target.value})} style={s.sel}>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowAddRepair(false)} style={{ flex: 1, padding: 10, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-subtle)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={addRepair} style={{ flex: 1, padding: 10, border: "none", borderRadius: 8, background: "var(--brand)", color: "var(--text-on-brand)", cursor: "pointer", fontWeight: 700 }}>Log Repair</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD MAINTENANCE MODAL ── */}
      {showAddTask && (
        <div style={s.modalBg}>
          <div style={s.modalBox}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Add Maintenance Item</div>
            <input placeholder="Task name *" value={newTask.task} onChange={e => setNewTask({...newTask, task: e.target.value})} style={s.inp} />
            <select value={newTask.section} onChange={e => setNewTask({...newTask, section: e.target.value})} style={s.sel}>
              {MAINT_SECTIONS.map(sec => <option key={sec} value={sec}>{sec}</option>)}
            </select>
            <select value={newTask.interval} onChange={e => setNewTask({...newTask, interval: e.target.value})} style={s.sel}>
              {["7 days","14 days","30 days","60 days","90 days","6 months","annual","2 years"].map(iv => <option key={iv} value={iv}>{iv}</option>)}
            </select>
            <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})} style={{ ...s.sel, marginBottom: 16 }}>
              <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowAddTask(false)} style={{ flex: 1, padding: 10, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-subtle)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={addTask} style={{ flex: 1, padding: 10, border: "none", borderRadius: 8, background: "var(--brand)", color: "var(--text-on-brand)", cursor: "pointer", fontWeight: 700 }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD EQUIPMENT MODAL ── */}
      {showAddEquip && (
        <div style={s.modalBg}>
          <div style={s.modalBox}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Add Equipment</div>
            <input placeholder="Name *" value={newEquip.name} onChange={e => setNewEquip({...newEquip, name: e.target.value})} style={s.inp} />
            <input placeholder="Notes" value={newEquip.notes} onChange={e => setNewEquip({...newEquip, notes: e.target.value})} style={s.inp} />
            <select value={newEquip.category} onChange={e => setNewEquip({...newEquip, category: e.target.value})} style={s.sel}>
              {EQ_CATEGORIES.sort().map(c => <option key={c} value={c}>{SECTIONS[c] || ""} {c}</option>)}
            </select>
            <select value={newEquip.status} onChange={e => setNewEquip({...newEquip, status: e.target.value})} style={{ ...s.sel, marginBottom: 16 }}>
              <option value="good">Good</option><option value="watch">Watch</option><option value="needs-service">Needs Service</option>
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowAddEquip(false)} style={{ flex: 1, padding: 10, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-subtle)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={addEquipment} style={{ flex: 1, padding: 10, border: "none", borderRadius: 8, background: "var(--brand)", color: "var(--text-on-brand)", cursor: "pointer", fontWeight: 700 }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD DOCUMENTATION MODAL ── */}
      {showAddDoc && (
        <div style={s.modalBg}>
          <div style={s.modalBox}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Add Documentation Item</div>
            <input placeholder="Item name (e.g. Boat Insurance)" value={newDoc.task} onChange={e => setNewDoc({...newDoc, task: e.target.value})} style={s.inp} />
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 5, letterSpacing: "0.5px" }}>DUE / RENEWAL DATE</div>
              <input type="date" value={newDoc.dueDate} onChange={e => setNewDoc({...newDoc, dueDate: e.target.value})}
                style={{ ...s.inp, marginBottom: 0, color: newDoc.dueDate ? "var(--text-primary)" : "var(--text-muted)" }} />
            </div>
            <select value={newDoc.priority} onChange={e => setNewDoc({...newDoc, priority: e.target.value})} style={{ ...s.sel, marginBottom: 16 }}>
              <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowAddDoc(false)} style={{ flex: 1, padding: 10, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-subtle)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={addDoc} style={{ flex: 1, padding: 10, border: "none", borderRadius: 8, background: "var(--brand)", color: "var(--text-on-brand)", cursor: "pointer", fontWeight: 700 }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* ── URGENT PANEL ── */}
      {showUrgentPanel && (
        <div style={{ position: "fixed", inset: 0, background: "var(--bg-overlay)", zIndex: 250 }} onClick={() => setShowUrgentPanel(false)}>
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 360, background: "var(--bg-elevated)", borderLeft: "1px solid var(--border-strong)", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ background: "#ef4444", padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>🔔 {totalAlerts} Urgent Items</div>
                <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 }}>Requires immediate attention</div>
              </div>
              <button onClick={() => setShowUrgentPanel(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {/* Open repairs */}
              {openRepairs > 0 && (
                <div style={{ padding: "14px 20px 8px" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#ea580c", letterSpacing: "0.6px", marginBottom: 8 }}>🔧 OPEN REPAIRS ({openRepairs})</div>
                  {repairs.filter(r => r.status === "open").map(r => (
                    <div key={r.id} style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{r.description}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{SECTIONS[r.section]||"🔧"} {r.section} · {fmt(r.date)}</div>
                    </div>
                  ))}
                </div>
              )}
              {/* Critical maintenance */}
              {criticalMaint > 0 && (
                <div style={{ padding: "8px 20px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--danger-text)", letterSpacing: "0.6px", marginBottom: 8 }}>🔴 CRITICAL MAINTENANCE ({criticalMaint})</div>
                  {maintTasks.filter(t => getTaskUrgency(t) === "critical").map(t => {
                    const badge = getDueBadge(t.dueDate);
                    return (
                      <div key={t.id} style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{t.task}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                          {SECTIONS[t.section]||"📋"} {t.section}
                          {badge && <span style={{ color: badge.color, fontWeight: 700 }}> · {badge.label} · Next due: {fmt(t.dueDate)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {totalAlerts === 0 && <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-muted)" }}><div style={{ fontSize: 32 }}>✅</div><div style={{ marginTop: 8 }}>No urgent items</div></div>}
            </div>
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)" }}>
              <button onClick={() => { setShowUrgentPanel(false); setTab("repairs"); }} style={{ width: "100%", background: "#fff7ed", color: "#ea580c", border: "1px solid #fed7aa", borderRadius: 8, padding: "9px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>Go to Repairs →</button>
              <button onClick={() => { setShowUrgentPanel(false); setTab("maintenance"); }} style={{ width: "100%", background: "#fee2e2", color: "var(--danger-text)", border: "1px solid #fca5a5", borderRadius: 8, padding: "9px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Go to Maintenance →</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SETTINGS MODAL ── */}
      {showSettings && (
        <div style={{ ...s.modalBg, zIndex: 350, alignItems: "flex-start", paddingTop: 0 }}>
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 400, background: "var(--bg-elevated)", borderLeft: "1px solid var(--border-strong)", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ background: "var(--brand-deep)", padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>
                {editingVesselId ? "⚙️ Edit Vessel" : "⚙️ Add Vessel"}
              </div>
              <button onClick={() => setShowSettings(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              {/* Vessel Type */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 8 }}>VESSEL TYPE</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {[["sail","⛵ Sail Vessel","S/V"],["motor","🚢 Motor Vessel","M/V"]].map(([val, label, pfx]) => (
                  <button key={val} onClick={() => setSettingsForm({...settingsForm, vesselType: val})}
                    style={{ flex: 1, padding: "10px 8px", borderRadius: 10, border: settingsForm.vesselType === val ? "2px solid var(--brand)" : "1.5px solid var(--border)", background: settingsForm.vesselType === val ? "var(--brand-deep)" : "var(--bg-subtle)", color: settingsForm.vesselType === val ? "var(--brand)" : "var(--text-muted)", cursor: "pointer", fontWeight: 700, fontSize: 13, textAlign: "center" }}>
                    <div>{label}</div>
                    <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>Prefix: {pfx}</div>
                  </button>
                ))}
              </div>

              {/* Vessel Name */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>VESSEL NAME</div>
              <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 16 }}>
                <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRight: "none", borderRadius: "8px 0 0 8px", padding: "9px 10px", fontSize: 13, fontWeight: 700, color: "var(--brand)", whiteSpace: "nowrap" }}>
                  {settingsForm.vesselType === "motor" ? "M/V" : "S/V"}
                </div>
                <input placeholder="Irene" value={settingsForm.vesselName}
                  onChange={e => setSettingsForm({...settingsForm, vesselName: e.target.value})}
                  style={{ ...s.inp, marginBottom: 0, borderRadius: "0 8px 8px 0", flex: 1 }} />
              </div>

              {/* Divider */}
              <div style={{ borderTop: "1px solid var(--border)", marginBottom: 16 }} />

              {/* Owner */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>OWNER / CAPTAIN NAME</div>
              <input placeholder="Full name" value={settingsForm.ownerName}
                onChange={e => setSettingsForm({...settingsForm, ownerName: e.target.value})}
                style={s.inp} />

              {/* Address */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>HOME PORT</div>
              <input placeholder="City (e.g. Seattle, La Cruz, Annapolis)" value={settingsForm.address}
                onChange={e => setSettingsForm({...settingsForm, address: e.target.value})}
                style={s.inp} />

              {/* Divider */}
              <div style={{ borderTop: "1px solid var(--border)", marginBottom: 16 }} />

              {/* Vessel details */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>VESSEL MAKE</div>
              <input placeholder="e.g. Hallberg-Rassy, Nordhavn, Hunter" value={settingsForm.make}
                onChange={e => setSettingsForm({...settingsForm, make: e.target.value})}
                style={s.inp} />

              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>MODEL</div>
              <input placeholder="e.g. 42, 47, 40" value={settingsForm.model}
                onChange={e => setSettingsForm({...settingsForm, model: e.target.value})}
                style={s.inp} />

              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>YEAR</div>
              <input placeholder="e.g. 1998" value={settingsForm.year}
                onChange={e => setSettingsForm({...settingsForm, year: e.target.value})}
                style={{ ...s.inp, marginBottom: 0 }} />

              {/* Preview */}
              {(settingsForm.vesselName || settingsForm.make || settingsForm.model || settingsForm.year) && (
                <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", marginTop: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>PREVIEW</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--brand)" }}>
                    {settingsForm.vesselType === "motor" ? "M/V" : "S/V"} {settingsForm.vesselName || "—"}
                  </div>
                  {(settingsForm.make || settingsForm.model || settingsForm.year) && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                      {[settingsForm.year, settingsForm.make, settingsForm.model].filter(Boolean).join(" ")}
                    </div>
                  )}
                  {settingsForm.ownerName && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>Capt. {settingsForm.ownerName}</div>}
                  {settingsForm.address && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>⚓ Home Port: {settingsForm.address}</div>}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
              {editingVesselId && vessels.length > 1 && (
                <button onClick={() => deleteVessel(editingVesselId)}
                  style={{ width: "100%", padding: 10, border: "1px solid var(--danger-border)", borderRadius: 8, background: "var(--danger-bg)", color: "var(--danger-text)", cursor: "pointer", fontWeight: 600, fontSize: 12, marginBottom: 8 }}>
                  🗑 Remove This Vessel
                </button>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowSettings(false)} style={{ flex: 1, padding: 11, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-subtle)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Cancel</button>
                <button onClick={saveVessel} style={{ flex: 2, padding: 11, border: "none", borderRadius: 8, background: "var(--brand)", color: "var(--text-on-brand)", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                  {editingVesselId ? "Save Changes" : "Add Vessel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CART PANEL ── */}
      {showCartPanel && (
        <div style={{ position: "fixed", inset: 0, background: "var(--bg-overlay)", zIndex: 200 }} onClick={() => setShowCartPanel(false)}>
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 340, background: "var(--bg-elevated)", borderLeft: "1px solid var(--border-strong)", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Your Cart ({cartQty})</span>
              <button onClick={() => setShowCartPanel(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {cart.length === 0
                ? <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-muted)" }}><div style={{ fontSize: 36 }}>🛒</div><div style={{ marginTop: 8, fontSize: 14 }}>Cart is empty</div></div>
                : cart.map(item => (<div key={item.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div><div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Qty: {item.qty} · ${(item.retailPrice * item.qty).toFixed(2)}</div></div><button onClick={() => removeFromCart(item.id)} style={{ background: "none", border: "none", color: "var(--danger-text)", cursor: "pointer", fontSize: 16 }}>✕</button></div>))}
            </div>
            {cart.length > 0 && (
              <div style={{ padding: 20, borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, marginBottom: 14 }}><span>Total</span><span>${cartTotal.toFixed(2)}</span></div>
                <button onClick={() => { setShowCartPanel(false); setShowCheckout(true); }} style={{ width: "100%", background: "var(--brand)", color: "var(--text-on-brand)", border: "none", borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Checkout →</button>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 8 }}>🔒 Secure checkout via Stripe</div>
              </div>
            )}
          </div>
        </div>
      )}

      {showCheckout && <StripeCheckout cart={cart} onSuccess={handleOrderSuccess} onClose={() => setShowCheckout(false)} />}
    </div>
  );
}
