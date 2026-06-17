# compile.ts incremental refactor plan (step-by-step, regression-gated)

**Target:** `packages/@ember/-internals/gxt-backend/compile.ts` (17,260 lines).
**Source of truth:** the full-read teardown in `[[project-gxt-compile-ts-refactor]]` (memory). Every line range below comes from that read — re-verify against the live file before editing (line numbers drift as steps land).

## Guiding principles (non-negotiable)
1. **Delegate, don't embed.** `compile.ts` must USE the runtime exported by `@lifeart/gxt`, not carry a parallel re-implementation of it. Every `$_*` override and runtime helper that duplicates something `@lifeart/gxt` already provides should become a thin ember-specific wrapper around the real export (or be deleted).
2. **Improve compile logic on the `@lifeart/gxt` side.** Where a hack exists because the GXT compiler/serializer didn't expose what ember needs (emitted-JS string surgery, `.toString()` metadata recovery), the FIX is a new option/flag/metadata on the `@lifeart/gxt` side, then ember delegates to it — NOT a smarter hack in `compile.ts`.
3. **Incremental, not a rewrite.** One concern per step. Never replace the whole module. Each step lands green before the next starts.
4. **No regressions, proven.** Gate after every step (focused) and every phase (full). Zero delta vs baseline is the gate to proceed.

## Repo split of work (who can do what)
- **EMBER-SIDE** (an agent in this repo CAN execute): dead-code, dedup, `@glimmer/syntax` AST-visitor ports, module split, silent-catch sweep, delegating to **already-exported** `@lifeart/gxt` runtime.
- **GXT-SIDE** (the `@lifeart/gxt` author does in that repo; flagged `⚠GXT` below): new serializer flags, compile-time metadata on emitted thunks, parser hooks. These are cross-repo — after a gxt-side change ships, ember delegates and the seam is verified against the REAL built artifact (the 0.0.66 lesson: never trust a gxt-side change without gating ember against the real dist).

## Gating protocol (run at every step)
- **Baseline (main checkout):** dev `9460/9443/0`, prod `9310/9246/0`. In a worktree the baseline is `9460/9434/9` (the 9 `jit :: #each :: swap` are a symlink artifact — ignore).
- **Per STEP:** `node scripts/gxt-test-runner/runner.mjs --filter "<affected modules>"` → must match the step's expected modules with zero new failures.
- **Per PHASE:** `node scripts/gxt-test-runner/runner.mjs --full` → zero delta vs baseline. Do NOT start the next phase until green.
- **⚠GXT steps:** build `@lifeart/gxt` dist → copy into `node_modules/.pnpm/@lifeart+gxt@<ver>/node_modules/@lifeart/gxt/dist` → `rm -rf node_modules/.vite` → rebuild ember → full gate against that real artifact.
- **STOP rule:** if any step goes red and the cause isn't a known flake, REVERT that step and report — never stack a second change on a red.

---

## PHASE 0 — De-noise (ember-side, zero-behavior, makes the rest navigable)
Pure cleanup; output must be byte-behavior-identical. Do these first so later phases work on a smaller, clearer file.

- **0.1 Delete the dead `if (false as boolean)` block** (1185–1447, ~262 lines — the abandoned `$_TO_VALUE_ember` renderer). It never executes. Acceptance: file compiles, full gate zero-delta.
- **0.2 Hoist duplicated constants + one `protectGlobal()` helper.**
  - `BUILTIN_HELPERS` (inline ×7: 10431/14771/16455/1153/12956/13356) → one module const.
  - `JS_RESERVED_WORDS` Set (verbatim ×2: 14675/14813) → one module const.
  - `Symbol.for('gxt-slots'|'gxt-props'|'gxt-args')` (inline ×25) → use the existing module-level `_SLOTS_SYM` (989) + sibling consts everywhere.
  - The `Object.defineProperty(g, name, {get…,set(){}})` "protect from setupGlobalScope" trap (×11) → one `protectGlobal(name, value)` helper.
  Acceptance: focused gate on Helpers/Components/Syntax modules + full gate zero-delta.
- **0.3 Extract the duplicated runtime builders into single helpers** (behavior-identical extraction, same call sites):
  - curried-component reactive renderer ×4 (1224–1428 already deleted in 0.1, 15466, 15685, 7478) → `renderCurriedRegion(getter, owner)`.
  - `namedArgs`-from-`args` ×7 (9099/9174/9250/9391/9490 + $_tag 9719 + $_dc 12692) → `buildNamedArgs(args, opts)`.
  - splat/fw merge ×2 (10755, 11673) → `mergeSplatAttributes(tagProps)`.
  - htmlRaw reactive-fragment builder ×3 (10128, 15373, 15860) → `buildHtmlRawRegion(...)`.
  Acceptance: per-extraction focused gate (each builder's feature: curried `{{component}}`, contextual components, `{{html-safe}}`/triple-mustache, splattributes), then full gate zero-delta.

**Phase 0 exit:** ~1,500 fewer lines, identical behavior, full gate green. This is the safe, high-signal win.

---

## PHASE 1 — Delegate to the `@lifeart/gxt` runtime ("stop embedding its parts")
For EACH `$_*` override / runtime helper in `compile.ts`, classify and act. Do them ONE AT A TIME, each gated.

- **1.0 Build the case map (no edits).** Enumerate every `globalThis.$_*` / runtime override and reactivity helper in `compile.ts` (the §-map regions: 1037–1182, 1591–2080, 2276–2920, 2922–4587, 4589–7575, 7949–8964, 8966–12774). For each, record: (a) what it does, (b) whether `@lifeart/gxt` already exports an equivalent, (c) WHY ember overrides it (the ember-specific delta — Ember-spec truthiness, mut-cells, owner threading, lifecycle), (d) target = DELEGATE / THIN-WRAP / KEEP / ⚠GXT-needs-hook. This map IS the "address all cases" checklist; everything below executes a row of it.
- **1.1..1.N — per override, in ascending risk order.** For each row whose target is DELEGATE/THIN-WRAP:
  - Import the real `@lifeart/gxt` export; replace the embedded copy with a thin wrapper that adds ONLY the ember-specific delta (and document that delta inline).
  - If the only reason for the embedded copy is a missing hook on the gxt export → mark the row **⚠GXT** and defer to Phase 2/handoff (add the hook gxt-side, then delegate). Do NOT invent a new ember-side reimplementation.
  - Acceptance per step: focused gate on that primitive's feature (`$__if`/`$__eq`→conditionals & equality; `$_eachSync`→`{{#each}}`; `$_inElement`→in-element; `$_c`/`$_tag`/`$_dc`→component/element/dynamic rendering; `_emberBuiltinHelpers`→Helpers) + no new failures elsewhere.
  - Start with the lowest-risk, most-clearly-duplicated (the truthiness/equality/builtin-helper overrides), end with the highest-coupling (`$_tag_ember` 9607–12603, `_gxtSyncDomNow` 7058–7575) — those may end up KEEP (genuinely ember-specific) and that's fine; the goal is to shrink the embedded surface, not force-delegate load-bearing glue.

**Phase 1 exit:** every embedded runtime piece is either a thin documented wrapper around a `@lifeart/gxt` export, a flagged ⚠GXT row, or an explicitly-justified KEEP. Full gate green.

---

## PHASE 2 — Move compile-logic hacks onto the `@lifeart/gxt` side
The remaining string-surgery exists because the gxt compiler/serializer didn't expose what ember needs. Fix it at the source.

- **2.1 (ember-side) Finish the AST-visitor migration.** Port the remaining source-regex scanners to the established `@glimmer/syntax` visitor pattern (12776–13963, which is GOOD — extend it, don't rebuild): `_rewriteShadowedBlockKeyword` (14004), `_templateMayNeedScopeThreading`/`_scopeNameAppearsAsReference` (14039–14096), the pre-parse asserts using the §1 hand-rolled scanners (14201–14272: `findDottedTags`/`findAttrsPatterns`/`hasDynamicHelper`…), the in-element literal-id scan (14393). Each → a 30–80-line visitor + delete the matching string scanner from §1. Gate each against the feature it asserts.
- **2.2 ⚠GXT Replace the emitted-JS post-processors with serializer options.** The regex surgery over GXT's GENERATED code (14598–15005: `$_each→$_eachSync`, the `].join("")` bracket-matching surgery 14619–14666, `$_maybeHelper("name"` rewrites, and the fragile IIFE-shadow rewrite 14947–15005) must become **`@lifeart/gxt` serializer flags / `CompileOptions`** so ember passes an option instead of rewriting output. Sequence: add the option gxt-side → publish/build → ember passes it + deletes the regex → gate against the real artifact. The IIFE-shadow rewrite is the riskiest single item in the file — do it last in this phase, isolated.
- **2.3 ⚠GXT Kill the `.toString()` source-sniffing (×13).** `fnStr.includes('$_tag(')` (10956/11065/11180), `__getterSrc.includes('$_bp')` (12643), `extractThisPath(String(getter))` (1149/11806/11894/15595) recover info the compiler already had. Thread that as **compile-time metadata on the emitted thunks** from the gxt compiler (e.g. a tagged property: is-component-child, this-path). Sequence: emit metadata gxt-side → ember reads metadata instead of `String(fn)` → delete the sniffers → gate. This removes the file's most fragile coupling (breaks under any codegen/minify change).

**Phase 2 exit:** zero regex over generated JS, zero `.toString()`-of-codegen; the compiler consumes structured AST + GXT metadata/flags. Full gate green against the real gxt artifact.

---

## PHASE 3 — Module split (structural; do AFTER 0–2 so each piece is already clean)
Mechanical relocation, no logic change, each extraction gated.

- **3.1** Extract `ast-transforms.ts` ← 12776–14096 (already self-contained; the good code). Re-export from compile.ts; gate.
- **3.2** Extract `reactivity-state.ts` ← the ~30 flag/`with*` wrappers + `_gxtTriggerReRender*` (2922–4587). Gate.
- **3.3** Extract `runtime-render.ts` ← all surviving `$_*` overrides + `itemToNode` (15348–16309) + `$_inElement` (1591–2080) + `$_tag_ember` (9607–12603) + `$_c_ember` (8966–12603) + `_gxtSyncDomNow` (7058–7575). These are installed for side-effects today; make `runtime-render.ts` an explicit module the renderer imports. Gate.
- **3.4** `compile.ts` is now `precompileTemplate`/`compileTemplate`/codegen + the `installCompilePipelinePart` bridge only (~2,700 lines). Gate.

**Phase 3 exit:** four focused modules; `compile.ts` is actually a compiler.

---

## PHASE 4 — Retire the dangerous hacks (root-cause, highest risk — last)
Each is a band-aid for a real root cause; fix the cause, then remove the patch. One at a time, full gate each.

- **4.1 `Element.prototype.setAttribute` global patch** (2160–2193) — root cause = Vite loads two GXT dom chunks. Fix the bundling (the `manualChunks` consolidation the comment references) so there's one dom chunk, then delete the prototype patch. ⚠ may touch build config.
- **4.2 `$_bp0..9` getters on `Object.prototype`** (8846–8888) — re-scope block-param access to a per-render context object instead of the global prototype. May be ⚠GXT (block-param scheme is shared). Highest behavioral risk — extensive `{{#each as |..|}}` / named-block / yield gating.
- **4.3 `QUnit.equiv` monkey-patch** (7711–7810) — move to the test harness; the underlying GXT whitespace-stripping is a real behavior gap to document/fix, not hide from the compiler.
- **4.4 16ms `setInterval` global flush** (7598–7614) — replace with proper schedule integration (the host `scheduleRevalidate` hook already exists at ~2775–2920). Verify no orphaned re-render path depends on the timer.
- **4.5 Silent-catch sweep** (244 `catch {}`) — per the no-silent-swallow house rule: each becomes a `if (DEBUG)` warn or a rethrow (mirror the bound `catch(e)`→`console.warn` sites that are already correct). Do in small batches by region, gating each batch; expected-throw paths (probe/feature-detect) get a one-line comment instead.

**Phase 4 exit:** no global-prototype mutations, no forever-timers, no codegen string-sniffing, no silent swallows. Full gate green, prod gate green.

---

## Execution notes for the agent
- Work on a branch off the current PR head; commit per step with the step id in the message.
- After each PHASE, report: lines removed, what delegated to `@lifeart/gxt` vs flagged ⚠GXT, the gate result (must be zero-delta), and any KEEP justifications.
- Never batch two phases. Never proceed past a red. The file is deeply test-coupled ("every hack maps to a real test") — the gate IS the spec.
- ⚠GXT rows are handoffs to the `@lifeart/gxt` author: produce a precise spec (the option/metadata signature ember needs) rather than a workaround.
