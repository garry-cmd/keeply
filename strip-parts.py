"""
Keeply — strip-parts.py
Removes all cart / parts / AI-suggestions code from App.jsx
Run: python strip-parts.py path/to/App.jsx
"""

import sys, re

# ─── helpers ──────────────────────────────────────────────────────────────────

def remove_block(src, start_marker, end_marker=None, inclusive_end=True):
    """Remove from start_marker to the matching closing bracket (or end_marker)."""
    idx = src.find(start_marker)
    if idx == -1:
        return src, False
    if end_marker:
        end_idx = src.find(end_marker, idx)
        if end_idx == -1:
            return src, False
        cut_end = end_idx + len(end_marker) if inclusive_end else end_idx
        # eat trailing newline
        if cut_end < len(src) and src[cut_end] == '\n':
            cut_end += 1
        return src[:idx] + src[cut_end:], True
    # bracket-count to find the end of the block
    depth = 0
    i = idx
    started = False
    while i < len(src):
        if src[i] in ('{', '(', '['):
            depth += 1; started = True
        elif src[i] in ('}', ')', ']'):
            depth -= 1
            if started and depth == 0:
                cut = i + 1
                if cut < len(src) and src[cut] == '\n':
                    cut += 1
                return src[:idx] + src[cut:], True
        i += 1
    return src, False


def remove_line(src, marker):
    """Remove every line that contains marker."""
    lines = src.splitlines(keepends=True)
    new = [l for l in lines if marker not in l]
    removed = len(lines) - len(new)
    return ''.join(new), removed


def remove_block_between(src, open_marker, close_marker):
    """Remove everything from open_marker up to and including close_marker."""
    start = src.find(open_marker)
    if start == -1:
        return src, False
    end = src.find(close_marker, start)
    if end == -1:
        return src, False
    cut = end + len(close_marker)
    if cut < len(src) and src[cut] == '\n':
        cut += 1
    return src[:start] + src[cut:], True


def balance(src):
    p = b = br = 0
    for ch in src:
        if ch == '(':    p += 1
        elif ch == ')':  p -= 1
        elif ch == '{':  b += 1
        elif ch == '}':  b -= 1
        elif ch == '[':  br += 1
        elif ch == ']':  br -= 1
    return p, b, br


def report(label, ok, src):
    p, b, br = balance(src)
    bal = f"parens={p} braces={b} brackets={br}"
    status = "✓" if (p == 0 and b == 0 and br == 0) else "⚠"
    print(f"  {status} {label:50s}  {bal}  {ok}")


# ─── main ──────────────────────────────────────────────────────────────────────

def strip(path):
    with open(path, encoding='utf-8') as f:
        src = f.read()

    orig_lines = len(src.splitlines())
    print(f"\nStripping: {path}  ({orig_lines} lines)\n")

    # ── 1. Affiliate / retailer constants block ───────────────────────────────
    src, ok = remove_block_between(
        src,
        "// ── Affiliate link helpers ────────────────────────────────────────────────────",
        "// ─────────────────────────────────────────────────────────────────────────────"
    )
    report("Affiliate/RETAILERS constants block", ok, src)

    # ── 2. SUPA_CONFIG block (keep — needed for API calls) ───────────────────
    # Leave this alone

    # ── 3. Cart-related state declarations ───────────────────────────────────
    for marker in [
        "const [cart, setCart]",
        "const [showCartPanel, setShowCartPanel]",
        "const [cartLoaded, setCartLoaded]",
        "const [showCartOnly, setShowCartOnly]",
    ]:
        src, n = remove_line(src, marker)
        report(f"State: {marker[:40]}", n, src)

    # ── 4. AI / parts state declarations ─────────────────────────────────────
    for marker in [
        "const [confirmPart, setConfirmPart]",
        # repairTab stays — still used for the Notes tab on repair cards
        "const [findPartResults, setFindPartResults]",
        "const [inlinePartResults, setInlinePartResults]",
        "const [savedParts, setSavedParts]",
        "const savingPartsRef =",
        "const [findPartLoading, setFindPartLoading]",
        "const [findPartError, setFindPartError]",
        "const findPartSearched",
        "const [rejectedParts, setRejectedParts]",
        "const [equipSuggestions, setEquipSuggestions]",
        "const [aiSuggestions, setAiSuggestions]",
        "const [aiLoading, setAiLoading]",
        "const [aiLoaded, setAiLoaded]",
    ]:
        src, n = remove_line(src, marker)
        report(f"State: {marker[:40]}", n, src)

    # ── 5. loadCart function block ────────────────────────────────────────────
    src, ok = remove_block(src, "  const loadCart = async function")
    report("loadCart function", ok, src)

    # ── 6. addToCart function block ───────────────────────────────────────────
    src, ok = remove_block(src, "  const addToCart = async function")
    report("addToCart function", ok, src)

    # ── 7. removeFromCart function block ──────────────────────────────────────
    src, ok = remove_block(src, "  const removeFromCart = async function")
    report("removeFromCart function", ok, src)

    # ── 8. clearCart function block ───────────────────────────────────────────
    src, ok = remove_block(src, "  const clearCart = async function")
    report("clearCart function", ok, src)

    # ── 9. cartTotal / cartQty computed lines ────────────────────────────────
    for marker in ["const cartTotal =", "const cartQty ="]:
        src, n = remove_line(src, marker)
        report(f"Computed: {marker}", n, src)

    # ── 10. normalizePart function ────────────────────────────────────────────
    src, ok = remove_block(src, "  const normalizePart = function")
    report("normalizePart function", ok, src)

    # ── 11. saveAiPartToMyParts function ─────────────────────────────────────
    src, ok = remove_block(src, "  const saveAiPartToMyParts = async function")
    report("saveAiPartToMyParts function", ok, src)

    # ── 12. getSuggestionsForRepair function ──────────────────────────────────
    src, ok = remove_block(src, "  const getSuggestionsForRepair = async function")
    report("getSuggestionsForRepair function", ok, src)

    # ── 13. getAISuggestions function ─────────────────────────────────────────
    src, ok = remove_block(src, "  const getAISuggestions = function")
    report("getAISuggestions function", ok, src)

    # ── 14. getSuggestionsForEquipment function ───────────────────────────────
    src, ok = remove_block(src, "  const getSuggestionsForEquipment = async function")
    report("getSuggestionsForEquipment function", ok, src)

    # ── 15. findPartsInline function ──────────────────────────────────────────
    src, ok = remove_block(src, "  const findPartsInline = async function")
    report("findPartsInline function", ok, src)

    # ── 16. trackAffiliateClick function ──────────────────────────────────────
    src, ok = remove_block(src, "  const trackAffiliateClick = function")
    report("trackAffiliateClick function", ok, src)

    # ── 17. useEffect: showCartPanel → aiLoaded ───────────────────────────────
    src, ok = remove_block(src, "  useEffect(function(){\n    if (!showCartPanel)")
    report("useEffect: aiLoaded on cart close", ok, src)

    # ── 18. useEffect: confirmPart auto-search ────────────────────────────────
    src, ok = remove_block(src, "  useEffect(function(){\n    if (!confirmPart)")
    report("useEffect: confirmPart auto-search", ok, src)

    # ── 19. loadCart calls in loadAll and switchVessel ────────────────────────
    for marker in [
        "loadCart(firstId)",
        "loadCart(vid)",
        "setCart([]);",
    ]:
        src, n = remove_line(src, marker)
        report(f"Call: {marker}", n, src)

    # ── 20. Cart button in top bar ────────────────────────────────────────────
    # The cart button starts with: <button onClick={function(){ setShowCartPanel
    # and ends at the closing </button>
    # Use block-between approach
    src, ok = remove_block_between(
        src,
        "<button onClick={function(){ setShowCartPanel(function(v){ return !v; }); }}",
        "</button>"
    )
    report("Top bar cart button", ok, src)

    # ── 21. Parts tab from bottom nav ────────────────────────────────────────
    # { icon: "🔩", label: "Parts", ...
    src, n = remove_line(src, 'label: "Parts"')
    report("Bottom nav Parts tab", n, src)

    # ── 22. Parts tab in equipment card tab bar ───────────────────────────────
    # The tabs array ["maintenance","repairs","parts","docs","log","edit"]
    # Replace to remove "parts" from the array
    src = src.replace(
        '["maintenance","repairs","parts","docs","log","edit"]',
        '["maintenance","repairs","docs","log","edit"]'
    )
    report("Equipment card Parts tab from tab array", True, src)

    # ── 23. Parts tab content block in equipment card ─────────────────────────
    # {activeTab === "parts" && (<>
    src, ok = remove_block_between(
        src,
        '{activeTab === "parts" && (<>',
        '</>)}'
    )
    report("Equipment card Parts tab content", ok, src)

    # ── 24. Repair card "parts" tab button + content ──────────────────────────
    # In repair cards, the tab options include "parts"
    # Remove the parts tab button from repair expand panels (2 places)
    # Pattern: ["parts", "notes"] in setRepairTab contexts
    # We keep "notes" tab, remove "parts" references from repair tab bars

    # Remove repair tab bar reference to "parts"
    # The repair tab buttons appear in the format: {["parts", "notes"].map...
    # Replace with just notes
    src = src.replace(
        '["parts", "notes"].map(function(t){',
        '["notes"].map(function(t){'
    )
    report("Repair card tab bar: remove parts tab", True, src)

    # Also: (repairTab[r.id] || "parts") — change default to "notes"
    src = src.replace(
        '(repairTab[r.id] || "parts") === t',
        '(repairTab[r.id] || "notes") === t'
    )
    report("Repair card tab default: parts→notes", True, src)

    # ── 25. Repair card parts tab content blocks ──────────────────────────────
    # There are multiple: {(repairTab[r.id] || "parts") === "parts" && (
    # After step 24, default is "notes" so "parts" tab content will never show
    # But let's still remove it for cleanliness
    # Pattern varies - skip for safety; the tab button is gone so it's dead code

    # ── 26. AI part suggestions in fleet urgency panel ────────────────────────
    # The fleetPanel urgency panel has AI parts suggestions. Remove those blocks.
    # These start with: {/* AI parts */}  or similar
    # They contain getSuggestionsForRepair calls - already function removed
    # Leave for now - dead code since functions are gone, won't break render

    # ── 27. "Find Part" buttons throughout ───────────────────────────────────
    # Pattern: <button onClick={function(){ setExpandedTask... findPartsInline
    # These are in the "due items" sections on My Boat tab
    # Find Part buttons on task rows in the "Maintenance due" section:
    src, n = remove_line(src, "🔩 Find Part")
    report("Remove '🔩 Find Part' button lines", n, src)

    # The actual button blocks containing findPartsInline calls:
    # Remove Find Part button block (inline on task rows in My Boat)
    src, ok = remove_block_between(
        src,
        '<button onClick={function(e){ e.stopPropagation(); setExpandedTask(t.id); if (!inlinePartResults[t.id]) findPartsInline(',
        '/button>'
    )
    report("Find Part button on task rows", ok, src)

    # Remove Find Part button on repair rows (My Boat open repairs)
    src, ok = remove_block_between(
        src,
        '<button onClick={function(e){ e.stopPropagation(); setExpandedRepair(r.id); setRepairTab(',
        '/button>'
    )
    report("Find Part button on repair rows", ok, src)

    # ── 28. confirmPart modal block ───────────────────────────────────────────
    src, ok = remove_block_between(
        src,
        "{confirmPart && (",
        ")}\n\n      {showCartPanel"
    )
    if not ok:
        src, ok = remove_block_between(
            src,
            "{confirmPart && (",
            ")}\n\n            {showCartPanel"
        )
    report("confirmPart modal", ok, src)

    # ── 29. Cart panel overlay block ──────────────────────────────────────────
    src, ok = remove_block_between(
        src,
        "{showCartPanel && (",
        ")}\n\n\n\n      {/* ── FIRST MATE"
    )
    if not ok:
        # Try alternate boundary
        src, ok = remove_block_between(
            src,
            "{showCartPanel && (",
            ")}\n\n      {/* ── FIRST MATE"
        )
    report("Cart panel overlay", ok, src)

    # ── 30. Clean up remaining orphan references ──────────────────────────────
    # Any remaining lines that reference removed things but are just 1-liners
    orphans = [
        "setAiLoaded",
        "setAiLoading",
        "setShowCartOnly",
        "showCartOnly",
    ]
    for marker in orphans:
        # Only remove if it's the ONLY thing on the line (no JSX structural role)
        lines = src.splitlines(keepends=True)
        new_lines = []
        for l in lines:
            stripped = l.strip()
            if marker in l and len(stripped) < 80 and not stripped.startswith('<') and not stripped.startswith('{/*'):
                continue  # skip this line
            new_lines.append(l)
        removed = len(lines) - len(new_lines)
        src = ''.join(new_lines)
        if removed:
            report(f"Orphan: {marker}", removed, src)

    # ── Final report ──────────────────────────────────────────────────────────
    new_lines = len(src.splitlines())
    p, b, br = balance(src)
    print(f"\n{'='*60}")
    print(f"Lines: {orig_lines} → {new_lines} (removed {orig_lines - new_lines})")
    print(f"Balance: parens={p}  braces={b}  brackets={br}")
    if p == 0 and b == 0 and br == 0:
        print("✅ BALANCED — safe to write")
        out = path.replace('.jsx', '.stripped.jsx')
        with open(out, 'w', encoding='utf-8') as f:
            f.write(src)
        print(f"Written: {out}")
    else:
        print("⚠️  UNBALANCED — do not use, check script")
        # Write anyway for inspection
        out = path.replace('.jsx', '.stripped.jsx')
        with open(out, 'w', encoding='utf-8') as f:
            f.write(src)
        print(f"Written anyway for inspection: {out}")

    # ── Check for remaining dead references ───────────────────────────────────
    dead = [
        "addToCart", "removeFromCart", "clearCart", "loadCart",
        "saveAiPartToMyParts", "getSuggestionsForRepair", "getSuggestionsForEquipment",
        "findPartsInline", "trackAffiliateClick", "confirmPart",
        "showCartPanel", "cartTotal", "cartQty", "buyUrl", "retailerLinks",
        "RETAILERS", "AVANTLINK_ID", "inlinePartResults", "savedParts",
        "equipSuggestions", "aiSuggestions", "rejectedParts",
        "findPartResults", "findPartLoading", "findPartError",
    ]
    print("\n── Remaining references to removed items ──")
    found_any = False
    for d in dead:
        hits = [(i+1, l.rstrip()) for i, l in enumerate(src.splitlines()) if d in l]
        if hits:
            found_any = True
            print(f"  ⚠  {d}: {len(hits)} occurrence(s)")
            for ln, txt in hits[:2]:
                print(f"       line {ln}: {txt[:80]}")
    if not found_any:
        print("  ✅ None — clean removal")
    print()
    print()
    return src


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python strip-parts.py path/to/App.jsx")
        sys.exit(1)
    strip(sys.argv[1])

# ── PATCH: add reference checker after line 362 ──
