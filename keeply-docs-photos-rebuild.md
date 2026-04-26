# Keeply — Docs/Photos Rebuild: Corrected Edit Map

**Updated:** April 22, 2026
**Target branch:** `staging`
**File:** `components/KeeplyApp.jsx` (26,261 lines) — with one edit also to `components/supabase-client.js` and no edits to any API route.

---

## Why this document exists

The Supabase migration for this work is **already applied** on production. Two old JSONB columns have been dropped (`equipment.docs`, `maintenance_tasks.photos`, `maintenance_tasks.attachments`, `repairs.photos`) and replaced with two normalized tables (`documents`, `photos`). Five existing docs and four existing photos have been migrated over.

**Client code has not been updated.** Every load path that selects the old columns crashes. Every POST body that includes them 400s. Every render block that reads `eq.docs`, `r.photos`, `t.photos` throws `undefined`. Production works only because no user has hit those code paths in the last 24 hours.

Two prior sessions have attempted this cleanup. Both have been defeated by a combination of:
- Container-time tool failures mid-pass (edits stranded, nothing pushed).
- An underestimated edit count — handoffs listed ~15 sites; actual count is ~22, with several "cosmetic" items being runtime crashes.
- Line-number drift after each str_replace invalidating downstream anchors.

This document is the **third and intended-final** attempt. It is written to be executed in a single pass, preferably in **Claude Code** where git is the save point and tool failures don't vaporize work. It uses only unique text anchors — no line numbers.

---

## Preflight (do this first, no exceptions)

```bash
cd /home/claude
rm -rf keeply
git clone --depth 1 --branch staging https://github.com/garry-cmd/keeply.git
cd keeply
```

Verify scaffolding exists (should show both files, each ≥ 290 lines):

```bash
ls components/DocumentAttachments.jsx components/PhotoGallery.jsx components/supabase-client.js
wc -l components/DocumentAttachments.jsx components/PhotoGallery.jsx
```

Verify DB state (expected counts in parentheses):

```
documents:                     5
photos:                        4
equipment.docs col exists:     0  (dropped)
maintenance_tasks.photos:      0  (dropped)
maintenance_tasks.attachments: 0  (dropped)
repairs.photos:                0  (dropped)
```

Use Supabase MCP if available, or this URL pattern:
```
https://waapqyshmqaaamiiitso.supabase.co/rest/v1/information_schema.columns?select=table_name,column_name&table_schema=eq.public&column_name=in.(docs,photos,attachments)
```

If any of those columns still exist, **stop** — the migration isn't applied and this whole plan is premature.

Verify expected grep counts (sanity check against drift since this doc was written):

```bash
# Should be exactly 8 matches
grep -c 'docs: \[\]' components/KeeplyApp.jsx

# Should be exactly 5 matches
grep -c 'attachments: \[\]\|attachments: initialAtts' components/KeeplyApp.jsx

# Should be exactly 5 matches
grep -c 'photos: \[\]' components/KeeplyApp.jsx

# Should be exactly 2 matches (the two scan-document POSTs)
grep -c "fetch('/api/scan-document'" components/KeeplyApp.jsx

# Should be exactly 1 match (DOC_LIBRARY declaration)
grep -c 'const DOC_LIBRARY = \[' components/KeeplyApp.jsx
```

If any count drifts, resync this doc against the live file before proceeding.

---

## Schema reference — the two new tables

Don't guess at column names. These are the POST body shapes taken from `components/DocumentAttachments.jsx` and `components/PhotoGallery.jsx`, which are the authoritative clients.

### `documents` — POST body

```js
{
  vessel_id: <uuid>,
  parent_type: 'equipment' | 'task' | 'repair' | 'vessel',
  parent_id:   <uuid>,
  label:       <string>,           // display name, required
  doc_type:    'Manual' | 'Warranty' | 'Receipt' | 'Registration' | 'Insurance' | 'Other',
  file_url:    <string | null>,    // null if external_url is set
  file_name:   <string | null>,
  external_url:<string | null>,    // null if file_url is set
  mime_type:   <string | null>,
  file_size_bytes: <int | null>,
}
```

### `photos` — POST body

```js
{
  vessel_id:   <uuid>,
  parent_type: 'equipment' | 'task' | 'repair' | 'vessel',
  parent_id:   <uuid>,
  url:         <string>,   // public storage URL
  caption:     <string>,
  // created_at is server-set
}
```

Both tables have RLS scoped by `vessel_id`; `supa('documents', ...)` and `supa('photos', ...)` will automatically forward the user's JWT via the helper in `components/supabase-client.js`.

---

## Execution order (seven phases)

Order matters. Phase 1 fixes the load-path crashes first, so if anything breaks mid-pass you've still made forward progress. Phase 3 is the big render swap — do it last among the structural changes because it's the highest-risk block replacement.

**If you run out of time: push through Phase 1 and Phase 2. Those alone get staging to a non-crashing state.** Phases 3–5 can ship in a second push.

---

# Phase 1 — Load-path stabilization (fix crashes)

These edits are all small str_replace operations. Each one prevents a runtime error. **Complete all of Phase 1 before building.**

## 1.1 — Add component imports

**Anchor:**
```
import FirstMateScreen from './FirstMateScreen';
```

**Replace with:**
```
import FirstMateScreen from './FirstMateScreen';
import DocumentAttachments from './DocumentAttachments';
import PhotoGallery from './PhotoGallery';
```

## 1.2 — Remove `docs` from equipment SELECT that loads all equipment

**Anchor:**
```
supa('equipment', { query: 'select=id,vessel_id,category,docs,logs,custom_parts' }),
```

**Replace with:**
```
supa('equipment', { query: 'select=id,vessel_id,category,logs,custom_parts' }),
```

## 1.3 — Remove `docs` from copyItemsToVessel SELECT

**Anchor:**
```
'vessel_id=eq.' + sourceId + '&select=name,category,status,notes,custom_parts,docs',
```

**Replace with:**
```
'vessel_id=eq.' + sourceId + '&select=name,category,status,notes,custom_parts',
```

## 1.4 — Remove `docs: eq.docs || [],` from copyItemsToVessel equipment POST

**Anchor (unique by `last_service: today(),\n              custom_parts: eq.custom_parts || [],\n              docs: eq.docs || [],`):**
```
              last_service: today(),
              custom_parts: eq.custom_parts || [],
              docs: eq.docs || [],
              logs: [],
```

**Replace with:**
```
              last_service: today(),
              custom_parts: eq.custom_parts || [],
              logs: [],
```

## 1.5 — Remove `attachments: []` from copyItemsToVessel task POST

**Anchor:**
```
              service_logs: [],
              attachments: [],
            },
          });
        }
      }
      // Reload data for the new vessel
```

**Replace with:**
```
              service_logs: [],
            },
          });
        }
      }
      // Reload data for the new vessel
```

## 1.6 — Remove `docs: []` from first auto-create vessel-card POST (after initial load)

There are eight `docs: []` sites total; each needs its own unique anchor. This is the first.

**Anchor:**
```
              vessel_id: firstId,
              name: vname0,
              category: 'Vessel',
              status: 'good',
              notes: '',
              custom_parts: [],
              docs: [],
              logs: [],
```

**Replace with:**
```
              vessel_id: firstId,
              name: vname0,
              category: 'Vessel',
              status: 'good',
              notes: '',
              custom_parts: [],
              logs: [],
```

## 1.7 — Remove `docs: []` and `photos: []` from local-state push after 1.6

**Anchor:**
```
                    category: 'Vessel',
                    status: 'good',
                    lastService: null,
                    notes: '',
                    customParts: [],
                    docs: [],
                    logs: [],
                    photos: [],
                    _vesselId: firstId,
```

**Replace with:**
```
                    category: 'Vessel',
                    status: 'good',
                    lastService: null,
                    notes: '',
                    customParts: [],
                    logs: [],
                    _vesselId: firstId,
```

## 1.8 — Remove `docs: []` from second auto-create vessel-card POST (on vessel switch)

**Anchor:**
```
              vessel_id: vid,
              name: vname,
              category: 'Vessel',
              status: 'good',
              notes: '',
              custom_parts: [],
              docs: [],
              logs: [],
```

**Replace with:**
```
              vessel_id: vid,
              name: vname,
              category: 'Vessel',
              status: 'good',
              notes: '',
              custom_parts: [],
              logs: [],
```

## 1.9 — Remove `docs: []` and `photos: []` from local-state push after 1.8

**Anchor:**
```
                category: 'Vessel',
                status: 'good',
                lastService: null,
                notes: '',
                customParts: [],
                docs: [],
                logs: [],
                photos: [],
                _vesselId: vid,
```

**Replace with:**
```
                category: 'Vessel',
                status: 'good',
                lastService: null,
                notes: '',
                customParts: [],
                logs: [],
                _vesselId: vid,
```

## 1.10 — addEquipment: gut DOC_LIBRARY auto-suggest, drop `docs` from POST and local state

This is the biggest structural edit in Phase 1 — replaces the whole addEquipment function body from `if (!newEquip.name.trim()) return;` down through `setShowAddEquip(false);`.

**Anchor (full block):**
```
  const addEquipment = async function () {
    if (!newEquip.name.trim()) return;
    const autoSuggested = getAutoSuggestedDocs(newEquip.name);
    setSaving(true);
    if (newEquip.fileObj) setUploadingDoc(true);
    try {
      const initialDocs = [...autoSuggested];
      if (newEquip.fileObj) {
        const tempId = 'eq-new-' + Date.now();
        const fileUrl = await uploadToStorage(newEquip.fileObj, tempId);
        initialDocs.push({
          id: 'doc-' + Date.now(),
          label: newEquip.fileName,
          type: newEquip.fileType,
          url: fileUrl,
          fileName: newEquip.fileName,
          isFile: true,
        });
      }
      const notes = [
        newEquip.notes,
        newEquip.model ? 'Model: ' + newEquip.model : '',
        newEquip.serial ? 'S/N: ' + newEquip.serial : '',
      ]
        .filter(Boolean)
        .join(' | ');
      const payload = {
        vessel_id: activeVesselId,
        name: newEquip.name,
        category: newEquip.category,
        status: newEquip.status,
        notes: notes,
        last_service: today(),
        custom_parts: [],
        docs: initialDocs,
      };
      const created = await supa('equipment', { method: 'POST', body: payload });
      const e = created[0];
      setEquipment(function (eq) {
        return [
          ...eq,
          {
            id: e.id,
            name: e.name,
            category: e.category,
            status: e.status,
            lastService: e.last_service,
            notes: e.notes || '',
            customParts: safeJsonbArray(e.custom_parts),
            docs: e.docs || [],
            _vesselId: e.vessel_id,
          },
        ];
      });
      setNewEquip({
        name: '',
        category: 'Engine',
        status: 'good',
        notes: '',
        model: '',
        serial: '',
        fileObj: null,
        fileName: '',
        fileType: 'Manual',
      });
      setShowAddEquip(false);
```

**Replace with:**
```
  const addEquipment = async function () {
    if (!newEquip.name.trim()) return;
    setSaving(true);
    if (newEquip.fileObj) setUploadingDoc(true);
    try {
      let uploadedFileUrl = null;
      if (newEquip.fileObj) {
        const tempId = 'eq-new-' + Date.now();
        uploadedFileUrl = await uploadToStorage(newEquip.fileObj, tempId);
      }
      const notes = [
        newEquip.notes,
        newEquip.model ? 'Model: ' + newEquip.model : '',
        newEquip.serial ? 'S/N: ' + newEquip.serial : '',
      ]
        .filter(Boolean)
        .join(' | ');
      const payload = {
        vessel_id: activeVesselId,
        name: newEquip.name,
        category: newEquip.category,
        status: newEquip.status,
        notes: notes,
        last_service: today(),
        custom_parts: [],
      };
      const created = await supa('equipment', { method: 'POST', body: payload });
      const e = created[0];
      if (uploadedFileUrl) {
        try {
          await supa('documents', {
            method: 'POST',
            body: {
              vessel_id: activeVesselId,
              parent_type: 'equipment',
              parent_id: e.id,
              label: newEquip.fileName,
              doc_type: newEquip.fileType || 'Manual',
              file_url: uploadedFileUrl,
              file_name: newEquip.fileName,
              external_url: null,
              mime_type: newEquip.fileObj ? newEquip.fileObj.type || null : null,
              file_size_bytes: newEquip.fileObj ? newEquip.fileObj.size || null : null,
            },
          });
        } catch (docErr) {
          console.error('Document save error:', docErr);
        }
      }
      setEquipment(function (eq) {
        return [
          ...eq,
          {
            id: e.id,
            name: e.name,
            category: e.category,
            status: e.status,
            lastService: e.last_service,
            notes: e.notes || '',
            customParts: safeJsonbArray(e.custom_parts),
            _vesselId: e.vessel_id,
          },
        ];
      });
      setNewEquip({
        name: '',
        category: 'Engine',
        status: 'good',
        notes: '',
        model: '',
        serial: '',
        fileObj: null,
        fileName: '',
        fileType: 'Manual',
      });
      setShowAddEquip(false);
```

## 1.11 — Remove `photos: []` from single-task create local-state push

**Anchor:**
```
            dueDate: t.due_date,
            serviceLogs: [],
            photos: [],
            interval_hours: t.interval_hours || null,
            last_service_hours: t.last_service_hours || null,
            due_hours: t.due_hours || null,
            pendingComment: '',
            _vesselId: t.vessel_id,
            equipment_id: t.equipment_id || null,
          },
        ];
      });
      setNewTask({
```

**Replace with:**
```
            dueDate: t.due_date,
            serviceLogs: [],
            interval_hours: t.interval_hours || null,
            last_service_hours: t.last_service_hours || null,
            due_hours: t.due_hours || null,
            pendingComment: '',
            _vesselId: t.vessel_id,
            equipment_id: t.equipment_id || null,
          },
        ];
      });
      setNewTask({
```

## 1.12 — Remove `attachments: []` + `photos: []` from createDefaultEngineTasks POST

**Anchor:**
```
          due_date: addDays(now2, t.interval_days),
          due_hours: baseHrs + t.interval_hours,
          service_logs: [],
          attachments: [],
          photos: [],
          equipment_id: eqId,
```

**Replace with:**
```
          due_date: addDays(now2, t.interval_days),
          due_hours: baseHrs + t.interval_hours,
          service_logs: [],
          equipment_id: eqId,
```

## 1.13 — Remove `photos: []` from createDefaultEngineTasks local-state

**Anchor (unique by `dueDate: t.due_date,\n              serviceLogs: [],\n              photos: [],\n              interval_hours:`, appears twice — the second one after local setTasks):**

This anchor appears twice. Do the **second** occurrence (inside createDefaultEngineTasks, after `var created = await supa('maintenance_tasks'`). Safer: locate by the wider anchor:

```
        setTasks(function (prev) {
          var newTasks = created.map(function (t) {
            return {
              id: t.id,
              section: t.section,
              task: t.task,
              interval: t.interval_days + ' days',
              interval_days: t.interval_days,
              priority: t.priority,
              lastService: t.last_service,
              dueDate: t.due_date,
              serviceLogs: [],
              photos: [],
              interval_hours: t.interval_hours || null,
```

**Replace with:**
```
        setTasks(function (prev) {
          var newTasks = created.map(function (t) {
            return {
              id: t.id,
              section: t.section,
              task: t.task,
              interval: t.interval_days + ' days',
              interval_days: t.interval_days,
              priority: t.priority,
              lastService: t.last_service,
              dueDate: t.due_date,
              serviceLogs: [],
              interval_hours: t.interval_hours || null,
```

## 1.14 — Remove `docs: []` from CSV-import equipment POST

**Anchor:**
```
              last_service: today(),
              custom_parts: [],
              docs: [],
              logs: [],
            };
          });
        for (let i = 0; i < payloads.length; i++) {
          const created = await supa('equipment', { method: 'POST', body: payloads[i] });
```

**Replace with:**
```
              last_service: today(),
              custom_parts: [],
              logs: [],
            };
          });
        for (let i = 0; i < payloads.length; i++) {
          const created = await supa('equipment', { method: 'POST', body: payloads[i] });
```

## 1.15 — Remove `docs: []` + `photos: []` from CSV-import equipment local-state

**Anchor:**
```
                lastService: e.last_service,
                notes: e.notes || '',
                customParts: [],
                docs: [],
                logs: [],
                photos: [],
                _vesselId: e.vessel_id,
              },
            ];
          });
          done++;
```

**Replace with:**
```
                lastService: e.last_service,
                notes: e.notes || '',
                customParts: [],
                logs: [],
                _vesselId: e.vessel_id,
              },
            ];
          });
          done++;
```

## 1.16 — Remove `attachments: []` from CSV-import task POST

**Anchor:**
```
              due_date: due,
              service_logs: [],
              attachments: [],
            };
          });
        for (let i = 0; i < payloads.length; i++) {
          const created = await supa('maintenance_tasks', { method: 'POST', body: payloads[i] });
```

**Replace with:**
```
              due_date: due,
              service_logs: [],
            };
          });
        for (let i = 0; i < payloads.length; i++) {
          const created = await supa('maintenance_tasks', { method: 'POST', body: payloads[i] });
```

## 1.17 — Remove `photos: []` from CSV-import task local-state

**Anchor (note the `equipment_id: t.equipment_id || null,` trailing comma — this is the CSV-import path, distinct from 1.11):**
```
                dueDate: t.due_date,
                serviceLogs: [],
                photos: [],
                interval_hours: t.interval_hours || null,
                last_service_hours: t.last_service_hours || null,
                due_hours: t.due_hours || null,
                pendingComment: '',
                _vesselId: t.vessel_id,
                equipment_id: t.equipment_id || null,
              },
            ];
          });
```

**Replace with:**
```
                dueDate: t.due_date,
                serviceLogs: [],
                interval_hours: t.interval_hours || null,
                last_service_hours: t.last_service_hours || null,
                due_hours: t.due_hours || null,
                pendingComment: '',
                _vesselId: t.vessel_id,
                equipment_id: t.equipment_id || null,
              },
            ];
          });
```

## 1.18 — Remove `docs: []` from AI-generated equipment POST (paid-path)

**Anchor:**
```
                              vessel_id: activeVesselId,
                              name: equipAiResult.name,
                              category: equipAiResult.category,
                              status: 'good',
                              notes: aiNotes,
                              custom_parts: [],
                              docs: [],
                              logs: [],
                            };
```

**Replace with:**
```
                              vessel_id: activeVesselId,
                              name: equipAiResult.name,
                              category: equipAiResult.category,
                              status: 'good',
                              notes: aiNotes,
                              custom_parts: [],
                              logs: [],
                            };
```

## 1.19 — Remove `docs: eq.docs || [],` + `photos: []` from AI-generated equipment local-state

**Anchor:**
```
                                  lastService: eq.last_service,
                                  notes: eq.notes || '',
                                  customParts: safeJsonbArray(eq.custom_parts),
                                  docs: eq.docs || [],
                                  logs: [],
                                  photos: [],
                                  _vesselId: eq.vessel_id,
                                },
```

**Replace with:**
```
                                  lastService: eq.last_service,
                                  notes: eq.notes || '',
                                  customParts: safeJsonbArray(eq.custom_parts),
                                  logs: [],
                                  _vesselId: eq.vessel_id,
                                },
```

## 1.20 — Remove `docs: []` from onboarding AI-generated equipment POST

**Anchor:**
```
                          const eq = await supa('equipment', {
                            method: 'POST',
                            body: {
                              vessel_id: nv.id,
                              name: item.name,
                              category: item.category,
                              status: 'good',
                              notes: '',
                              custom_parts: [],
                              docs: [],
                              logs: [],
                            },
                          });
```

**Replace with:**
```
                          const eq = await supa('equipment', {
                            method: 'POST',
                            body: {
                              vessel_id: nv.id,
                              name: item.name,
                              category: item.category,
                              status: 'good',
                              notes: '',
                              custom_parts: [],
                              logs: [],
                            },
                          });
```

---

**Phase 1 checkpoint:** Run a build here. Do not push — build is just to catch syntax errors from any slipped edit.

```bash
rm -rf .next
npm run build 2>&1 | tail -30
```

Expected: clean build, TypeScript errors allowed (pre-existing env issue per CONTEXT.md).
Unexpected: "Unexpected token" / parse error → locate by error line, fix the bad edit, re-build.

If clean: commit (local only, do not push yet):
```
git add -A && git commit -m "phase 1: docs/photos column removal from data layer"
```

---

# Phase 2 — Render site replacements

These are the eight big block replacements. Each replaces dozens to hundreds of lines of JSX with a single component call. Because these blocks are long, **do not use str_replace for them — use a Python script that replaces line ranges directly.** See the helper script at the end of this document.

Alternatively, in Claude Code: use the Edit tool with the exact multi-line old_str (components are all uniquely anchored by their surrounding JSX comments like `{/* docs tab */}`, `{/* Photos tab */}`).

For each, the replacement is a single component call. The blocks are:

| # | Site                         | Open anchor                                    | Close anchor                                    | Replace with |
|---|------------------------------|------------------------------------------------|-------------------------------------------------|--------------|
| 2.1 | Vessel-scoped Docs tab     | `{(equipTab[vesselEq.id] \|\| 'info') === 'docs' && (` | matching `)}` at same indent | `<DocumentAttachments parentType="equipment" parentId={vesselEq.id} vesselId={vesselEq._vesselId \|\| activeVesselId} />` wrapped in matching `{...&& (<div>...</div>)}` |
| 2.2 | Task photos block          | `{/* ── Photos ── */}` (preceded by `/* Part results */` block close) | closing `</div>` before `</div>\n                          );` | see 2.2 below |
| 2.3 | Repair photos #1           | `{(repairTab[r.id] \|\| 'parts') === 'photos' && (` — first occurrence | matching `)}` | see 2.3 below |
| 2.4 | Repair photos #2           | second occurrence (inside vessel detail view)  | matching `)}` | same as 2.3 |
| 2.5 | Repair photos #3           | third occurrence                               | matching `)}` | same as 2.3 |
| 2.6 | Repair photos #4           | fourth occurrence                              | matching `)}` | same as 2.3 |
| 2.7 | Equipment Photos tab       | `{/* Photos tab */}` followed by `{activeTab === 'photos' && (` | matching `)}` | `<PhotoGallery parentType="equipment" parentId={eq.id} vesselId={eq._vesselId \|\| activeVesselId} />` |
| 2.8 | Equipment Docs tab         | `{/* docs tab */}` followed by `{activeTab === 'docs' && (` | matching `)}` | `<DocumentAttachments parentType="equipment" parentId={eq.id} vesselId={eq._vesselId \|\| activeVesselId} />` |

### 2.1 — Vessel-scoped Docs tab replacement

Replace the entire block:
```jsx
{(equipTab[vesselEq.id] || 'info') === 'docs' && (
  <div
    onClick={function (e) {
      e.stopPropagation();
    }}
  >
    {docSavedMsg && docSavedMsg.eqId === vesselEq.id && (
      ... ~300 lines of inline add/rename/delete UI ...
    )}
  </div>
)}
```

With:
```jsx
{(equipTab[vesselEq.id] || 'info') === 'docs' && (
  <div onClick={function (e) { e.stopPropagation(); }}>
    <DocumentAttachments
      parentType="equipment"
      parentId={vesselEq.id}
      vesselId={vesselEq._vesselId || activeVesselId}
    />
  </div>
)}
```

### 2.2 — Task photos block replacement

Replace from the opening `{/* ── Photos ── */}` comment block through the closing `</div>` of the photo-gallery container. The block starts with a `<div>` with style `borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10`.

Replacement:
```jsx
<div
  style={{
    borderTop: '1px solid var(--border)',
    paddingTop: 10,
    marginTop: 10,
  }}
>
  <PhotoGallery
    parentType="task"
    parentId={t.id}
    vesselId={t._vesselId || activeVesselId}
  />
</div>
```

### 2.3–2.6 — Repair photos replacements (four sites)

Each site starts with `{(repairTab[r.id] || 'parts') === 'photos' && (` (or with `repair.id` in one — check) and ends with the matching `)}` at the same indent. Inside is an inline photo gallery with upload UI.

For each, replace the entire block with:

```jsx
{(repairTab[r.id] || 'parts') === 'photos' && (
  <div
    style={{ padding: '14px 16px' }}
    onClick={function (e) {
      e.stopPropagation();
    }}
  >
    <PhotoGallery
      parentType="repair"
      parentId={r.id}
      vesselId={r._vesselId || activeVesselId}
    />
  </div>
)}
```

**Careful:** some repair-photo blocks use `repair.id` instead of `r.id` — check the surrounding map-function variable name and match it. There are four blocks total; confirm each one's variable before swapping.

### 2.7 — Equipment Photos tab

Replace entire `{activeTab === 'photos' && (...)}` block (preceded by `{/* Photos tab */}` comment) with:

```jsx
{activeTab === 'photos' && (
  <div style={{ padding: '14px 16px' }}>
    <PhotoGallery
      parentType="equipment"
      parentId={eq.id}
      vesselId={eq._vesselId || activeVesselId}
    />
  </div>
)}
```

### 2.8 — Equipment Docs tab

Replace entire `{activeTab === 'docs' && (...)}` block (preceded by `{/* docs tab */}` comment) with:

```jsx
{activeTab === 'docs' && (
  <div style={{ padding: '14px 16px' }}>
    <DocumentAttachments
      parentType="equipment"
      parentId={eq.id}
      vesselId={eq._vesselId || activeVesselId}
    />
  </div>
)}
```

**Phase 2 checkpoint:** Build again. Should still be clean.

```bash
rm -rf .next && npm run build 2>&1 | tail -30
git add -A && git commit -m "phase 2: replace inline docs/photos UI with components"
```

---

# Phase 3 — scan-document rewrites

Two sites, both in KeeplyApp.jsx. Both currently do `PATCH /equipment { docs: updatedDocs }` which fails because the column is gone. Replace with `POST /documents`.

## 3.1 — First scan-document site (vessel registration upload, VesselSetup flow)

**Anchor (the whole "Also save..." try block that does the PATCH):**

```js
                                  // Also save the scanned document to the vessel's Docs tab
                                  try {
                                    const docLabel =
                                      d.fields && d.fields.uscg_doc
                                        ? 'USCG Documentation'
                                        : d.fields && d.fields.state_reg
                                          ? 'Vessel Registration'
                                          : d.fields && d.fields.insurance_carrier
                                            ? 'Insurance Document'
                                            : d.fields && d.fields.policy_no
                                              ? 'Insurance Policy'
                                              : 'Vessel Document';
                                    const ext =
                                      uploadFile.name.split('.').pop().toLowerCase() || 'jpg';
                                    const vesselName =
                                      (
                                        vessels.find(function (v) {
                                          return v.id === activeVesselId;
                                        }) || {}
                                      ).vesselName || '';
                                    const cleanName =
                                      (docLabel + (vesselName ? '-' + vesselName : '')).replace(
                                        /[^a-zA-Z0-9-]/g,
                                        '-'
                                      ) +
                                      '.' +
                                      ext;
                                    const renamedFile = new File([uploadFile], cleanName, {
                                      type: uploadFile.type,
                                    });
                                    const fileUrl = await uploadToStorage(renamedFile, vesselEq.id);
                                    const newDoc = {
                                      id: 'doc-' + Date.now(),
                                      label: docLabel,
                                      type: 'Registration',
                                      url: fileUrl,
                                      fileName: cleanName,
                                      isFile: true,
                                    };
                                    const updatedDocs = [...(vesselEq.docs || []), newDoc];
                                    await supa('equipment', {
                                      method: 'PATCH',
                                      query: 'id=eq.' + vesselEq.id,
                                      body: { docs: updatedDocs },
                                      prefer: 'return=minimal',
                                    });
                                    setEquipment(function (prev) {
                                      return prev.map(function (e) {
                                        return e.id === vesselEq.id
                                          ? { ...e, docs: updatedDocs }
                                          : e;
                                      });
                                    });
                                  } catch (docErr) {
                                    console.error('Doc save error:', docErr);
                                  }
```

**Replace with:**

```js
                                  // Also save the scanned document to the documents table
                                  try {
                                    const docLabel =
                                      d.fields && d.fields.uscg_doc
                                        ? 'USCG Documentation'
                                        : d.fields && d.fields.state_reg
                                          ? 'Vessel Registration'
                                          : d.fields && d.fields.insurance_carrier
                                            ? 'Insurance Document'
                                            : d.fields && d.fields.policy_no
                                              ? 'Insurance Policy'
                                              : 'Vessel Document';
                                    const ext =
                                      uploadFile.name.split('.').pop().toLowerCase() || 'jpg';
                                    const vesselName =
                                      (
                                        vessels.find(function (v) {
                                          return v.id === activeVesselId;
                                        }) || {}
                                      ).vesselName || '';
                                    const cleanName =
                                      (docLabel + (vesselName ? '-' + vesselName : '')).replace(
                                        /[^a-zA-Z0-9-]/g,
                                        '-'
                                      ) +
                                      '.' +
                                      ext;
                                    const renamedFile = new File([uploadFile], cleanName, {
                                      type: uploadFile.type,
                                    });
                                    const fileUrl = await uploadToStorage(renamedFile, vesselEq.id);
                                    await supa('documents', {
                                      method: 'POST',
                                      body: {
                                        vessel_id: activeVesselId,
                                        parent_type: 'equipment',
                                        parent_id: vesselEq.id,
                                        label: docLabel,
                                        doc_type: 'Registration',
                                        file_url: fileUrl,
                                        file_name: cleanName,
                                        external_url: null,
                                        mime_type: uploadFile.type || null,
                                        file_size_bytes: uploadFile.size || null,
                                      },
                                    });
                                  } catch (docErr) {
                                    console.error('Doc save error:', docErr);
                                  }
```

## 3.2 — Second scan-document site (equipment Info-tab rescan)

Same structure, slightly different surrounding indentation (`eq.id` not `vesselEq.id`). Apply the same transformation — replace `uploadToStorage → PATCH equipment.docs → setEquipment` with `uploadToStorage → POST documents`. Use `eq._vesselId || activeVesselId` for the `vessel_id` field.

**Phase 3 checkpoint:**

```bash
rm -rf .next && npm run build 2>&1 | tail -30
git add -A && git commit -m "phase 3: scan-document now writes to documents table"
```

---

# Phase 4 — Equipment edit save handler

One onClick to make async + redirect to `documents` table.

**Anchor:**

```js
                    <button
                      onClick={function () {
                        const notes = [
                          editEquipForm.notes,
                          editEquipForm.model ? 'Model: ' + editEquipForm.model : '',
                          editEquipForm.serial ? 'S/N: ' + editEquipForm.serial : '',
                        ]
                          .filter(Boolean)
                          .join(' | ');
                        const eq = equipment.find(function (e) {
                          return e.id === editingEquip;
                        });
                        const newDocs = editEquipForm.fileUrl
                          ? [
                              ...(eq ? eq.docs || [] : []),
                              {
                                id: 'doc-' + Date.now(),
                                label: editEquipForm.fileName,
                                type: editEquipForm.fileType || 'Manual',
                                url: editEquipForm.fileUrl,
                                fileName: editEquipForm.fileName,
                                isFile: true,
                              },
                            ]
                          : undefined;
                        const patch = {
                          name: editEquipForm.name,
                          category: editEquipForm.category,
                          status: editEquipForm.status,
                          notes,
                        };
                        if (newDocs) patch.docs = newDocs;
                        updateEquipment(editingEquip, patch);
                      }}
```

**Replace with:**

```js
                    <button
                      onClick={async function () {
                        const notes = [
                          editEquipForm.notes,
                          editEquipForm.model ? 'Model: ' + editEquipForm.model : '',
                          editEquipForm.serial ? 'S/N: ' + editEquipForm.serial : '',
                        ]
                          .filter(Boolean)
                          .join(' | ');
                        const eq = equipment.find(function (e) {
                          return e.id === editingEquip;
                        });
                        const patch = {
                          name: editEquipForm.name,
                          category: editEquipForm.category,
                          status: editEquipForm.status,
                          notes,
                        };
                        updateEquipment(editingEquip, patch);
                        if (editEquipForm.fileUrl) {
                          try {
                            await supa('documents', {
                              method: 'POST',
                              body: {
                                vessel_id: (eq && eq._vesselId) || activeVesselId,
                                parent_type: 'equipment',
                                parent_id: editingEquip,
                                label: editEquipForm.fileName,
                                doc_type: editEquipForm.fileType || 'Manual',
                                file_url: editEquipForm.fileUrl,
                                file_name: editEquipForm.fileName,
                                external_url: null,
                                mime_type: null,
                                file_size_bytes: null,
                              },
                            });
                          } catch (docErr) {
                            console.error('Document save error:', docErr);
                          }
                        }
                      }}
```

---

# Phase 5 — Dead code removal (pure cleanup, no functional change)

Do this in one pass — all items in this phase are strictly deletions. Build is guaranteed to pass after each as long as nothing still references the deleted symbols (verified below).

## 5.1 — Delete `DOC_LIBRARY` const

**Anchor:** starts at `const DOC_LIBRARY = [` — delete through the matching `];`. Roughly 230 lines. Use a line-range delete or match the entire const literal.

Grep confirms zero references to `DOC_LIBRARY` remain after Phase 2 (only used inside `getAutoSuggestedDocs` which is also deleted).

## 5.2 — Delete `getAutoSuggestedDocs` function

**Anchor:**
```js
function getAutoSuggestedDocs(equipmentName) {
  return DOC_LIBRARY.filter((doc) =>
    doc.keywords.some((kw) => equipmentName.toLowerCase().includes(kw))
  );
}
```

Delete the whole function.

## 5.3 — Delete the autoSugDocs computation in the equipment map

**Anchor:**
```js
                const autoSugDocs = getAutoSuggestedDocs(eq.name).filter(function (d) {
                  return !(eq.docs || []).find(function (ed) {
                    return ed.id === d.id;
                  });
                });
```

Delete those five lines.

## 5.4 — Delete dead helper: `addCustomDoc`

Starts with `const addCustomDoc = async function (eqId) {`. Delete through the matching closing `};`.

## 5.5 — Delete dead helper: `saveDocLabel`

Starts with `const saveDocLabel = async function (eqId, docId, newLabel) {`. Delete through closing `};`.

## 5.6 — Delete dead helper: `removeDoc`

Starts with `const removeDoc = async function (eqId, docId) {`. Delete through closing `};`.

## 5.7 — Delete dead helper: `addSuggestedDoc`

Starts with `const addSuggestedDoc = async function (eqId, doc) {`. Delete through closing `};`.

## 5.8 — Delete dead helper: `addDoc` (creates Paperwork tasks)

Starts with `const addDoc = async function () {`. This is a longer function (~60 lines). Delete through closing `};`.

## 5.9 — Delete dead helpers: `addDocAttachment` and `removeDocAttachment`

Both start with `const ... = async function (taskId, ...) {`. Delete each entirely.

## 5.10 — Delete Documentation tab render block

**Anchor:**
```jsx
        {/* ── DOCUMENTATION TAB ── */}
        {view === 'customer' && tab === 'documentation' && (
```

Delete from that comment through the matching `)}` (approximately 523 lines). The closing signature is:
```jsx
          </>
        )}
      </div>
```
Delete up to but not including the final `</div>` — keep that line.

## 5.11 — Delete lightbox modal block

**Anchor:**
```jsx
      {lightboxPhoto && (
```

Delete from there through the matching `)}` (approximately 260 lines). PhotoGallery handles its own lightbox.

## 5.12 — Delete unused state hooks

These are now all orphaned. Delete each line:

- `const [lightboxPhoto, setLightboxPhoto] = useState(null);`
- `const [lightboxCaptionEdit, setLightboxCaptionEdit] = useState('');`
- `const [renamingDoc, setRenamingDoc] = useState(null);` (with its comment)
- `const [renameDocLabel, setRenameDocLabel] = useState('');`
- `const [docSavedMsg, setDocSavedMsg] = useState(null);` (with its comment)
- `const [showAddDoc, setShowAddDoc] = useState(false);`
- `const [newDoc, setNewDoc] = useState({ ... });` — multi-line, delete the whole `useState({...})` call

Also delete the derived values (search and remove):
- `const docTasks = tasks.filter(function (t) { return t.section === 'Paperwork'; });`
- `const docUrgencyCounts = { ... };` — multi-line object
- `const expiringDocs = (docs || []).filter(...);`  — inside loadFleetData
- In loadFleetData `Promise.all([...])`, remove the `docs` destructure position and the `supa('maintenance_tasks', { query: 'vessel_id=eq.' + vid + '&select=id,task,due_date,priority&section=eq.Paperwork' })` call entirely.
- In loadFleetData result object, remove `expiringDocs: expiringDocs.slice(0, 3),`.
- In fleet defaults object at around `expiringDocs: [],` — remove that key.

## 5.13 — Delete "Expiring Docs" KPI from fleet dashboard

**Anchor:**
```jsx
                        {
                          label: 'Expiring Docs',
                          val: d.expiringDocs.length,
                          color: d.expiringDocs.length > 0 ? 'var(--brand)' : 'var(--text-muted)',
                          bg: d.expiringDocs.length > 0 ? 'var(--brand-deep)' : 'var(--bg-subtle)',
                          tab: 'documentation',
                        },
```

Delete that whole object literal including the trailing comma.

## 5.14 — Delete Expiring Docs expanded-list block in fleet dashboard

**Anchor:**
```jsx
                    {/* Priority items */}
                    {d.expiringDocs.length > 0 && (
                      <div
                        style={{
                          padding: '12px 20px',
                          borderTop: '1px solid var(--border)',
                          background: 'var(--bg-subtle)',
                        }}
                      >
                        <div
                          ...
                        >
                          EXPIRING SOON
                        </div>
                        {d.expiringDocs.map(function (doc) {
                          ...
                        })}
                      </div>
                    )}
```

Delete entire block from the comment through matching `)}`.

## 5.15 — Delete the Expiring Docs click handler

**Anchor:**
```jsx
                              if (stat.label === 'Expiring Docs') {
                                switchVessel(vessel.id);
                                setTab('maintenance');
                                setView('customer');
                                return;
                              }
```

Delete those six lines.

## 5.16 — Paperwork filter cleanup (optional, low-risk)

The `&section=neq.Paperwork` filter on the main fleet tasks query can stay — it's defensive against legacy data. The `&section=eq.Paperwork` query was deleted in 5.12. Nothing more to do here.

Also keep the `SECTIONS.Paperwork` entry and its icon (line ~836) — they're harmless constants. Future-proofing against users with legacy Paperwork rows in the DB.

---

# Phase 6 — Final build + staging push

```bash
# Clean everything
rm -rf .next node_modules/.cache

# Build must be clean (TS errors on env types allowed per CONTEXT.md)
npm run build 2>&1 | tee /tmp/build.log | tail -40

# Squash commits if you want
git log --oneline -10

# Push to staging only
git push origin HEAD:staging
```

**Then stop.** Verify on the live staging URL (not the Vercel dashboard iframe — per CONTEXT.md Apr 21 learning):

```
https://keeply-git-staging-garry-cmds-projects.vercel.app
```

---

# Success criteria (must all pass before production push)

1. **Staging build is green** in Vercel dashboard.
2. **Signed-in user lands in app without error.** No white screen, no error boundary, no "Could not load equipment" message.
3. **Equipment Docs tab shows the 5 migrated documents.** Pick any vessel card with attached docs (pre-migration) — the Docs tab should render them via DocumentAttachments.
4. **Equipment Photos tab shows the 4 migrated photos.** Same check — pick equipment with photos attached.
5. **Upload a new document via the Docs tab.** Should appear immediately in the list. Verify via Supabase:
   ```
   SELECT count(*) FROM documents;  -- should now be 6
   ```
6. **Upload a new photo via the Photos tab.** Same check against `photos` table.
7. **Upload a photo to a repair via the Photos sub-tab.** Verify `photos` table has a row with `parent_type='repair'`.
8. **Upload a photo to a maintenance task.** Verify `photos` table has a row with `parent_type='task'`.
9. **Scan a vessel registration via VesselSetup.** Verify a new `documents` row with `parent_type='equipment'`, `doc_type='Registration'`.
10. **Edit an equipment item and attach a file.** Verify a new `documents` row.
11. **Fleet dashboard renders without the Expiring Docs KPI.** Other KPIs (Overdue Tasks, Open Repairs, etc.) still present and correct.
12. **First Mate still works** — no regressions. System prompt mentions docs/photos in the APP_GUIDE; those references are now about the real UI.

---

# Production push (only if all 12 success criteria pass)

```bash
git push origin HEAD:main
```

Then:
- Watch the production deploy in Vercel dashboard until READY.
- Smoke-test once on production.
- Check PostHog exceptions for the next hour.

---

# Rollback (if needed)

Cheap. Vercel → Deployments → find the previous READY production deploy → Promote to Production. No DB rollback needed: the migration already ran, old columns are gone, new tables are populated. Rolling back the code puts the app in the same broken state it's been in since the migration — users won't see new regressions, they'll just see the same load-path errors they haven't hit yet.

---

# Helper: Python script for bulk block replacement (Phase 2)

Save as `apply-blocks.py` in repo root, run with `python apply-blocks.py`. This is safer than hand-written str_replace for 150-line blocks.

```python
#!/usr/bin/env python3
"""Replace big render blocks in KeeplyApp.jsx by line range.
Edit the RANGES list with current line numbers (re-grep each session — they drift).
"""
import sys
from pathlib import Path

FILE = Path('components/KeeplyApp.jsx')
lines = FILE.read_text().splitlines(keepends=True)

# Format: (start_line_inclusive, end_line_inclusive, replacement_text_ending_in_newline)
# RE-GREP BEFORE USE — line numbers drift after each Phase 1 edit.
RANGES = [
    # (14254, 14403, '''{activeTab === 'photos' && (\n  <div style={{ padding: '14px 16px' }}>\n    <PhotoGallery parentType="equipment" parentId={eq.id} vesselId={eq._vesselId || activeVesselId} />\n  </div>\n)}\n'''),
    # add more tuples here — work bottom-up so earlier ranges don't shift
]

# Apply bottom-up so indices don't invalidate
for start, end, replacement in sorted(RANGES, key=lambda r: -r[0]):
    before = lines[:start-1]
    after = lines[end:]
    lines = before + [replacement] + after

FILE.write_text(''.join(lines))
print(f"Applied {len(RANGES)} block replacements.")
```

**Important:** if you use this script, re-grep for current line numbers AFTER Phase 1 is committed. Phase 1 removes ~40 lines; every Phase 2 anchor will have drifted upward.

---

# Known risks, by phase

| Phase | Risk                                                       | Mitigation                                               |
|-------|------------------------------------------------------------|----------------------------------------------------------|
| 1     | Missed a `docs: []` site — load still crashes              | Grep check in preflight; expected 8 → should reach 0 after Phase 1.10 + 1.14 + 1.18 + 1.20 + six others |
| 1.10  | addEquipment is the most-changed function; syntax slip     | Build immediately after                                  |
| 2     | Hundred-line JSX block replacements can leave mismatched braces | Build after each of the 8 block swaps; commit between   |
| 2.3–2.6 | Variable name inside repair-photos blocks not always `r.id` — could be `repair.id`, `rr.id` | Read each block's surrounding `.map(function (X) {` before generating replacement |
| 3     | Two scan-document sites have different surrounding indent levels | Verify indent matches before str_replace                |
| 5.10, 5.11, 5.12 | Delete cascades can leave dangling state references   | After all of Phase 5: `grep -E 'lightboxPhoto\|renamingDoc\|showAddDoc\|docSavedMsg\|expiringDocs\|autoSugDocs' components/KeeplyApp.jsx` — must return zero |
| 6     | Staging or prod has cached bundle; user sees old code      | Hard refresh; check deploy SHA in page source            |

---

# File touch summary

| File                                     | Change scope                              |
|------------------------------------------|-------------------------------------------|
| `components/KeeplyApp.jsx`               | ~22 str_replace + 8 block replacements + ~10 pure deletions |
| `components/DocumentAttachments.jsx`     | none (already scaffolded)                 |
| `components/PhotoGallery.jsx`            | none (already scaffolded)                 |
| `components/supabase-client.js`          | none (already has `supa`, `uploadToStorage`, `compressImage`) |
| `app/api/scan-document/route.*`          | none — route still parses fields only; client-side handles the save |
| `app/api/admin/stats/route.ts`           | none — uses `select('*', { count: 'exact', head: true })`, no column refs |
| `app/api/firstmate/route.js`             | none — references docs/photos only in APP_GUIDE strings which remain user-accurate |

---

# One more thing

If the next session is burning tokens grepping for the same anchors three times: they're trying to be helpful but wasting context. Trust the anchors in this document. If an anchor doesn't match exactly, **one** diagnostic grep is allowed; after that, just view the file and re-anchor.

Good luck.
