# Agent Log: CP cellFor Install Cycle Fixes — Session 3f42c432

## Summary

The agent was tasked with applying a proto-chain-walk fix (matching ref commit `2146839701`) to two suspected recursion sites: `renderer.ts:921` (morph freshContext loop) and `manager.ts:4830` (createRenderContext pre-install). It successfully committed the manager.ts fix (`845b3732ca`) but discovered the `renderer.ts:921` fix broke `{{input}}` tests and was reverted. Most critically: "Components test: curly components" **still hangs at HEAD** after both commits — the root recursion site is elsewhere, still unidentified.

---

## Root Causes Found

**Known cause (previously fixed, commit `2146839701`):** `ClassicRootState` at `renderer.ts:672` iterated `for...in component` (inherits keys) but called `Object.getOwnPropertyDescriptor(component, key)` (own-only). Mixin-installed CPs like `actionContextObject` from `TargetActionSupport` had no own-descriptor, so the guard failed, `_cellFor` was called, installing a cached Yt whose `__fn = () => component[key]` looped back through itself: `cell.value → __fn() → component[key] → cell.value ...`.

**Suspected cause (partially defensive, commit `845b3732ca`):** `manager.ts:4830`'s pre-install loop walked `Object.keys(obj)` per prototype level, which is correct for own keys; but a data-descriptor shadow at a shallower depth could mask an accessor CP on a deeper ancestor. The fix walks ancestors from that level upward; if any has `get || set`, cellFor install is skipped. The commit's own message admits this did not resolve the curly hang — it is a defensive guard only.

**Still-unknown cause:** "Components test: curly components" hangs with Chrome renderer at 100% CPU regardless of whether either fix is applied or reverted. The unbounded-recursion site responsible for this hang has not been identified in this session.

---

## Files Audited + Findings

- **`packages/@ember/-internals/glimmer/lib/renderer.ts`** — Lines 672–710 (ClassicRootState pre-install, already fixed by prior commit). Lines 900–940 (morph freshContext loop at 921): uses `Object.defineProperty(freshContext, key, {get(){ return comp[key]; }})` — does NOT call cellFor, so not a cellFor cycle site directly. Agent's first attempt to add a CP-skip here broke `{{input}}` due to receiver semantics: the explicit getter forces `comp` as `this` for CPs, and removing it makes inherited CP use `freshContext` as `this` — semantic difference.

- **`packages/@ember/-internals/gxt-backend/manager.ts`** — Lines 4830–4886 (createRenderContext pre-install loop): already uses `Object.getOwnPropertyDescriptor(obj, key)` at each depth. Guard `!desc.get && !desc.set` correctly skips accessors at the current depth. Gap: a data-shadow at a shallower level can mask a CP on a deeper ancestor. Fixed by commit `845b3732ca`. Lines 4903–5005 (Proxy `get` trap): already correctly walks prototype chain via while-loop (lines 4927–4935) before deciding whether to call cellFor lazily.

- **`packages/@ember/-internals/glimmer/lib/templates/outlet.ts:179`** — Another `_cellFor` call site, for outlet/route contexts. Agent noted it reads `controller[key]` through CP getter, then calls `cell.update(actualValue)` — pattern differs enough that it was not investigated further.

- **`packages/@ember/-internals/glimmer/lib/templates/root.ts:445,714`** — Two more cellFor call sites for route root rendering. Not deeply audited.

- **`packages/@ember/-internals/metal/lib/decorator.ts:57`** — Confirmed CPs default to `enumerable = true`, meaning `Object.keys(prototype)` will surface them — the manager.ts per-depth walk is correct.

---

## Fix Attempts + Outcomes

| Commit | File | Status | Result |
|--------|------|--------|--------|
| `2146839701` (prior session) | `renderer.ts:672` | Landed | Fixed ONE recursion site. Curly still hangs. |
| renderer.ts:921 change | `renderer.ts` morph loop | **Reverted** | Broke `Components test: {{input}}` — CP receiver semantics differ when pass-through getter is removed. |
| `845b3732ca` | `manager.ts:4830` | Landed | Defensive: ancestor-accessor check added. Does NOT fix curly hang. `{{input}}` 10/10 PASS confirmed. |

The agent also attempted and struggled with background task polling — the Bash harness re-promotes `until` loops to background, making sequential polling unreliable. Multiple orphaned chromium processes were observed pegged at 100% CPU from prior hung test runs.

---

## Gotchas / Surprising Findings

1. **renderer.ts:921 is NOT a cellFor site** — the morph freshContext loop only installs plain pass-through getters, not cells. The recursion hypothesis was based on a misread of the prior agent's audit. Skipping CPs there breaks receiver semantics for CPs that use `this`.

2. **Curly hangs at HEAD regardless of either fix** — The agent confirmed by stashing changes and re-running: curly components test hangs with or without the two fixes. The root recursion is elsewhere.

3. **The `until` loop Bash gotcha** — Any `until ...; do sleep N; done` command is automatically re-promoted to background by the Bash harness, making it impossible to use as a synchronous wait. The agent wasted several cycles on this.

4. **manager.ts Proxy get-trap already has correct proto-walk (lines 4927–4935)** — The lazy cellFor install in the Proxy handler already walks the full chain before deciding. Only the *pre-install* loop at 4850 had the ancestor-gap issue.

5. **CPs are enumerable by default** — ComputedProperty sets `enumerable = true` in decorator.ts. So `Object.keys(prototype)` does include CP-keyed properties, meaning the manager.ts depth-walk WAS catching most CPs already. The ancestor-shadow gap is a minor edge case.

6. **Module order matters** — Smoke suite runs alphabetically. "Components test: curly components" lands at module 3, causing the entire smoke suite to hang there. Individually running `{{input}}` passes fine.

---

## Remaining Hypotheses / Open Questions

- **Where is the actual recursion for curly components?** Candidates not yet audited: `templates/root.ts:445` and `root.ts:714`, `templates/outlet.ts:179`. One of these may install a cell for a curly-component CP that cycles.

- **What specific CP or property name triggers the hang in curly components?** Adding a `console.log(key)` guard before any `_cellFor` call would identify the offending key. Not possible without modifying test infrastructure.

- **Does the renderer.ts:921 fix need a different approach?** Instead of skipping CPs entirely, the fix could check if `comp` already has an own getter for `key` (a cell-backed getter from prior passes) and skip ONLY then. This would avoid the receiver-semantics break while still preventing cellFor-cycle interaction.

- **Is the module-timeout of 30s actually being respected?** The runner showed modules running for 5+ minutes without timeout. The `waitForFunction` in playwright may have its own 60s default that ignores the `moduleTimeout` option for stuck pages.
