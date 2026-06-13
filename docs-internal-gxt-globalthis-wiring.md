# Retiring `globalThis` from the GXT integration — audit + idiomatic-wiring (IMPLEMENTED)

Date: 2026-06-12, updated 2026-06-13 · Branch `gxt-rebase-main`
Status: **implemented.** This began as a design audit; the plan below has since
landed in full. Each §2 item is marked DONE with its commit. Companion to
`docs-internal-gxt-packaging-design.md` and the Cluster-B closure notes
(125 bridge slices landed; the residual was documented as irreducible _within
the then-current architecture_ — this work changed that architecture).

## 0. Verdict

**Done.** ~80% of the surface (by use count) was removed ember-side with the
`gxt-bridge.ts` typed-bridge pattern plus an owner-threading refactor; the final
~20% landed via the three glimmer-next API shapes — two now formal `@lifeart/gxt`
exports (`registerHostHooks` / `registerHostManagers`) and the runtime-template
symbol table threaded as `Function` parameters. None of it was architecturally
impossible. The remaining globals existed because (a) runtime-compiled template
functions need a scope to resolve `$_tag`/`$_maybeHelper`/… in, (b) the host and
the runtime exchange hooks in both directions, and (c) globals historically
papered over dual-module-copy hazards. (c) is now closed — the rollup
subpath-collapse fix (5f0b60f3e8) plus the fail-loud dual-copy guard
(63d27aca98) — and (a)/(b) got the natural API shapes that were already
half-present in the gxt dist.

The two production bugs that motivated this were the class in miniature: the
`{{on}}` split-brain (registration landed in a manager copy the renderer never
consulted) and the order-dependent `on-ext` alias gap, both global-mutable-state
failures. Idiomatic wiring eliminated the class.

## 1. Inventory (2026-06-12 — the pre-refactor baseline, now retired per §2)

| Surface                     | Unique slots | Heaviest                                                                                                                                                                                                     | Class              |
| --------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| `gxt-backend/*` shims       | **84**       | `owner` ×67, `$_MANAGERS` ×16, `COMPONENT_TEMPLATES` ×14, `INTERNAL_MANAGERS` ×13, `__EMBER_BUILTIN_HELPERS__` ×12, `COMPONENT_MANAGERS` ×12, `INTERNAL_MODIFIER_MANAGERS` ×11                               | mixed (see §2)     |
| other `@ember/*` packages   | ~25          | `owner` ×24, `__DEBUG_GXT_RENDER` ×12, `__gxtCellFor` ×8, outlet state ×14, `__lifeartGxt` ×6                                                                                                                | mostly bridge-able |
| **gxt dist itself (reads)** | ~10          | `__gxtRegisterListMarker`, `$_eval`, `__gxtUnboundEval`, `__gxtExternalSchedule`, `__gxtToBool`, `__gxtRebindEachItem`, `__gxtGetCellOrFormula`, `__gxtCurrentTemplateThis`, `__gxtRegisterObjectValueOwner` | needs gxt API      |
| gxt dist (writes)           | ~25          | `setupGlobalScope()` publishes the `$_*` symbol table + `__gxtCellFor`/`__gxtFormula`/… for eval'd code                                                                                                      | needs gxt API      |

Debug-only toggles (`__DEBUG_GXT_RENDER`, `__GXT_LEAK_DEBUG__`, `GXT_DEBUG*`)
and build-time consts (`__GXT_MODE__` — inlined, never a runtime global in
dist) are out of scope: keep.

## 2. Why each class existed, and what replaced it — all DONE

### 2a. `owner` ambient (67 + 24 uses) — ember-side only, biggest win — DONE

**Commits `99a38c17b5` (route the ambient owner through gxt-bridge accessors) +
`a249a89eeb` (move the ambient-owner storage off globalThis).**
`(globalThis as any).owner` was an ambient "current owner" that render paths
set/restore around every boundary (root render, engine mount, component create).
The ambient owner now lives in `gxt-bridge.ts` (`getAmbientOwner` /
`setAmbientOwner`, module-local `_ambientOwner`); the runtime-compiled template
functions read it via the injected `__gxtAmbientOwner` `Function` parameter
(§2e), not globalThis. Most call sites already received `renderContext.owner`;
the bridge accessor is the fallback for paths that lost the thread (helpers
resolving `owner.factoryFor`, dynamic component resolution). The save/restore
discipline (and its bugs — engine mount swapped it twice) is gone.

### 2b. Manager/template registries (5 WeakMap slots, ~57 uses) — ember-side — DONE

**Commits `b875ec3ef9` (retire the manager/template registry globals) +
`63d27aca98` (fail loudly when two `@lifeart/gxt` copies load in one page).**
`COMPONENT_MANAGERS`, `INTERNAL_MANAGERS`, `INTERNAL_MODIFIER_MANAGERS`,
`INTERNAL_HELPER_MANAGERS`, `COMPONENT_TEMPLATES` used to live on globalThis so a
second copy of the shim module would share state. That hazard was real — it bit
`{{on}}` — but globals only _masked_ it (the classic copy still forked). They are
now module-local `WeakMap`s in `manager.ts` with exported accessors, and the
single-copy invariant is enforced by the `Symbol.for` sentinel guard that throws
loudly if a second `@lifeart/gxt` copy initializes — one deliberate global
_constant_, not mutable state. The exact+subpath shim collapse in both pipelines
(5f0b60f3e8) is what made single-copy enforceable rather than papered-over.

### 2c. Ember↔ember cross-package hooks (~20 slots) — finish Cluster B — DONE

**Commits `eed23e3245` (`__captureRenderError` + `__classic*` slots),
`e401aaafa9` (`__lifeartGxt` stash + outlet-state globals), `a55b02c3b6`
(render-state + scope-stash globals), `5ea2402fef` (six ember-internal channels),
`4b43218331` (the remaining cross-file channels).**
`__captureRenderError`, `__classicDirtyTagFor`, `__currentOutletState`,
`__activeOutletElements`, `__gxtCellFor` (metal→shim), `__lifeartGxt` stash,
`__EMBER_BUILTIN_HELPERS__`, etc. — all migrated onto the `gxt-bridge.ts` typed
bridge (the same bridge that carried the original 125 slices). The stragglers
that were written for _emitted_ code (see 2e) ride the symbol-parameter table
instead. Pure continuation work, no design risk; landed across the five commits
above.

### 2d. gxt-consulted host hooks (~10 slots) — DONE (upstream API SHIPPED)

**Commit `2dd61dc6cd` (adopt the `registerHostHooks()` API behind capability
detection).** `registerHostHooks` is now a formal `@lifeart/gxt` export
(`@lifeart/gxt` 0.0.66+; pinned at 0.0.67) — the runtime keeps module-local hook
slots and the ember integration calls it once at `manager.ts` module init
(behind a capability probe so an older dist degrades gracefully). It replaces the
old `globalThis.__gxtRegisterListMarker` / `__gxtUnboundEval` / `__gxtToBool` /
`__gxtExternalSchedule` / `__gxtRebindEachItem` / `$_eval` extension points:

```ts
// @lifeart/gxt — shipped
export function registerHostHooks(hooks: HostHooks): void;
```

### 2e. The eval'd-template symbol scope — DONE (symbol-parameter injection)

**Commit `7a9c7b22d0` (bind runtime-template symbols as `Function` parameters).**
Runtime-compiled templates are `Function` bodies referencing bare `$_tag`,
`$_maybeHelper`, `$_maybeModifier`, `$slots`, … — previously resolved through
`setupGlobalScope()` writing them onto globalThis with the _ember_ integration
swapping those globals (`$_tag_ember`, `$_maybeHelper_ember`, …). The
`compile.ts` `templateFnCode` builder now threads the full public
`GXT_RUNTIME_SYMBOLS` table (`_GXT_SYMBOL_PARAM_NAMES`) plus the ember
emitted-code hooks (`__gxtBuiltinHelpers`, `__gxtGetTemplateThis`,
`__gxtAmbientOwner`, `__gxtGetSlots`/`Fw`/`Scope`, `$_blockParam`) as `Function`
constructor _parameters_, so the compiled body binds `$_tag` / `$_maybeHelper` /
… as locals instead of resolving through globalThis on every render. The other
emitted-code hooks (`__gxtQuotedAttr`, `__gxtCurrentTemplateThis`,
`__blockParamsStack`, `__slotsContextStack`, `__contextBlockParams`, `$slots`)
ride the same parameter table or are inlined directly into the function body.

**Honest caveat (the one residual):** the injection is _additive_ — the symbol
_values_ are snapshotted from globalThis at `Function`-creation time
(`..._GXT_SYMBOL_PARAM_NAMES.map((n) => globalThis[n])`), so `setupGlobalScope()`
still publishes the symbol table once as the snapshot source, and any unlisted
identifier still falls through to globalThis. Per-render resolution and the
ember-side global swaps are gone; the one-time publish remains by design (it is
the gxt runtime's own boot contract, not an ember channel).

### 2f. `$_MANAGERS` (16 uses) — DONE (upstream API SHIPPED)

**Commit `2975cd9244` (adopt the `registerHostManagers()` API behind capability
detection).** `registerHostManagers({ component, modifier, helper })` is now a
formal `@lifeart/gxt` export (0.0.66+); `manager.ts` calls it at module init
behind capability detection, replacing the "mutate the module object gxt closes
over" contract. The remaining `globalThis.$_MANAGERS` reads are for eval'd code
and ride the §2e parameter table.

## 3. Order landed (each phase was independently shippable; gated after each)

1. **2c stragglers → bridge** ✅ — small, zero design risk; reused the Cluster B
   bridge mechanics and slice discipline.
2. **2b registries → module-local + single-copy guard** ✅ — removed the biggest
   _mutable_ cross-copy surface; the guard converts silent forks into loud errors.
3. **2a owner threading** ✅ — landed after 2b so resolution paths were stable;
   the `gxt-bridge.ts` ambient-owner accessors + the §2e parameter as carrier.
4. **2d/2e/2f glimmer-next APIs** ✅ — `registerHostHooks` / `registerHostManagers`
   shipped as formal `@lifeart/gxt` exports and the symbol table threaded as
   `Function` parameters; ember adopted them behind capability detection (the
   existing `__lifeartGxtForOptional` pattern), so no lockstep release was needed.

## 4. What deliberately stays

- Debug toggles (`__DEBUG_GXT_RENDER`, `__GXT_LEAK_DEBUG__`) — opt-in
  diagnostics, host-settable from a console; idiomatic enough.
- `Symbol.for('gxt-slots')`-style registry keys and the single-copy
  sentinel (§2b) — global _constants_, not state.
- `__GXT_MODE__` — build-time define, already inlined in dist output.

## 5. Risks / notes (as resolved)

- The eval'd-code parameter injection (2e) changes `Function` arity for every
  compiled template — the dist's `_functionCodeCache` keys on the body string,
  which stays valid, and the one host site reconstructing functions from `_code`
  passes the same table.
- Owner threading kept the `globalThis.owner` WRITE alive until every reader was
  migrated (readers first, writes last); the writes are now gone. A
  `no-restricted-globals`-style rule on `globalThis` in `gxt-backend/` is the
  recommended regression guard.
- Cluster B's "33 irreducible sites" conclusion was scoped to `__gxt*` slots and
  predated both the subpath-collapse fix and this work's gxt-API additions — it
  is superseded by this doc (the architecture it assumed has since changed).
