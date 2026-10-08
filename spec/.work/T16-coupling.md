# T16 — Test-suite coupling survey

Portability classes: P = portable with a harness adapter; R = portable after refactor; I = implementation-internal (exclude); M = mixed.

## Categories

- WIRE, OPCODE, TAG, REF, AST, RUNTIME-PRIV, DRT, RUNLOOP, EMBER-PRIV, STRING-HTML, BUILD (as defined in the task brief)

## Checklist

- [x] 1. integration-tests/test/**
- [x] 2. @ember/-internals/glimmer/tests/**
- [ ] 3. @glimmer/*/test/**
- [ ] 4. template-compiler tests
- [ ] 5. metal / object / other ember packages

## Group 1 — `packages/@glimmer-workspace/integration-tests/test/**` (81 files: 79 tests + package.json + support.ts)

Paths below are relative to `packages/@glimmer-workspace/integration-tests/test/`. All tests are written against the harness in `../lib` (`RenderTest`, `jitSuite`, `this.render/rerender/assertHTML/assertStableNodes/registerComponent/registerHelper/registerModifier`; about 2,500 call sites). The harness itself is the coupling point: `lib/modes/jit/render.ts:5,18-19` calls `renderMain`/`renderSync`; `lib/render-test.ts:16,444` uses `inTransaction`; `lib/modes/jit/resolver.ts`/`registry.ts` implement the private resolver. A conformance adapter has to re-implement `RenderDelegate` (`lib/render-test.ts`, `lib/modes/jit/delegate.ts`), not the tests. Also relevant: `lib/suites/*` (5,681 lines: initial-render, components, each, in-element, yield, has-block, ssr, ...) hold the bulk of the behavior tests and are instantiated from `jit-suites-test.ts` and `node-suites-node-test.ts`; they are P with the same adapter and carry a `DEBUG` skip in about 10 places (`lib/suites/components.ts:397,773,801,835`).

| file | class | categories | note |
|---|---|---|---|
| attributes-test.ts | R | RUNTIME-PRIV | 39 tests, all behavior. `readDOMAttr` (:17-30) calls `normalizeProperty` (private `@glimmer/runtime`) to decide prop vs attr when reading back; refactor: read `getAttribute`/property explicitly per §05 attribute rules. |
| chaos-rehydration-test.ts | R | RUNTIME-PRIV, STRING-HTML | Rehydration with random node removal; uses `@glimmer/util` `LOCAL_LOGGER` and the `RehydrationDelegate` harness. Marker comments (`OPEN`/`CLOSE`) are normative per §05-13.1. |
| collections/array-test.ts | R | TAG | `trackedArray` imported from `@glimmer/validator`; adapter should map to the public reactive collection export. Assertions are rendered output. |
| collections/map-test.ts | R | TAG | same, `trackedMap`; each-in tests are skipped (:383,397). |
| collections/object-test.ts | R | TAG | `trackedObject`. |
| collections/set-test.ts | R | TAG | `trackedSet`. |
| collections/weak-map-test.ts | R | TAG | `trackedWeakMap`. |
| collections/weak-set-test.ts | R | TAG | `trackedWeakSet`. |
| compiler/compile-options-test.ts | M | WIRE, OPCODE, AST | 4 tests: `moduleName` into `template.referrer` (via `unwrapTemplate`, `TemplateWithIdAndReferrer`) = I; `precompile` output `wire.moduleName` = I; `lexicalScope` tests assert the exact wire statements (`SexpOpcodes`, `wire.scope?.()`, :40-70) = I, but the behavior (lexicalScope callback makes `<hello />` a lexical component, `<div />` not) is spec-observable (R: render with a scope instead). |
| debug-render-tree-test.ts | M | DRT, RUNTIME-PRIV, BUILD | 13 tests. 10 assert `captureRenderTree`-shaped output through `assertRenderTree` (semi-public; R if the adapter exposes the DRT). 3 define managers extending `TemplateOnlyComponentManager`/`EMPTY_ARGS` and `getDebugCustomRenderTree` (:640-760) = I, except where §06 documents `getDebugCustomRenderTree`. Two `skip: !DEBUG` (:140,167). |
| ember-component-test.ts | P | STRING-HTML (mild) | 74 tests on emberish (curly) components through the harness; no private imports beyond `debug-util`. |
| env-test.ts | I | RUNTIME-PRIV, BUILD | Directly constructs `EnvironmentImpl`, tests nested `begin()` and the commit-failure cleanup, asserts a private error message. Exclude. |
| helpers/array-test.ts | P | - | |
| helpers/concat-test.ts | P | - | |
| helpers/dynamic-helpers-test.ts | P | - | |
| helpers/fn-test.ts | R | REF, BUILD | Uses `createInvokableRef` (:2) from `@glimmer/reference` for one test; refactor to a public tracked/`@ember/object` set. `@glimmer/env` DEBUG gating. |
| helpers/get-test.ts | P | - | 64 assertHTML calls; behavior only. |
| helpers/hash-test.ts | R | BUILD | `skip: LOCAL_TRACE_LOGGING` (:171) — drop the flag. |
| i-n-u-r-test.ts | I | RUNTIME-PRIV | Tests the harness itself (`setProperties`, `takeSnapshot`). Exclude. |
| initial-render-test.ts | P | STRING-HTML | 48 tests; imports only the `SafeString` type from `@glimmer/runtime`; uses `OPEN`/`CLOSE`/`blockStack` markers for SSR output (normative §05-13.1). |
| input-range-test.ts | P | - | |
| invalid-html-test.ts | P | AST (error text) | Asserts syntax errors via `preprocess` + `syntaxErrorFor` (normative: parse errors and messages). R only in that `preprocess` is a harness wrapper that must map to `precompile`. |
| invocation-generation-test.ts | P | - | |
| jit-suites-test.ts | P | RUNTIME-PRIV | Instantiates the `lib/suites` suites against the JIT delegate. |
| keywords/and-runtime-test.ts | P | BUILD (minor) | Compiles via `@ember/template-compiler/runtime`; asserts rendered output of the keyword. Imports `@glimmer/debug-util` helpers only. |
| keywords/and-test.ts | P | BUILD | Compile-time keyword usage + rendered output via `@ember/template-compiler`. DEBUG-gated assertion-message tests (`@glimmer/env`). |
| keywords/array-runtime-test.ts | P | BUILD (minor) | Compiles via `@ember/template-compiler/runtime`; asserts rendered output of the keyword. Imports `@glimmer/debug-util` helpers only. |
| keywords/array-test.ts | P | - | Compile-time keyword usage + rendered output via `@ember/template-compiler`. |
| keywords/each-test.ts | P | - | Compile-time keyword usage + rendered output via `@ember/template-compiler`. |
| keywords/element-runtime-test.ts | P | BUILD (minor) | Compiles via `@ember/template-compiler/runtime`; asserts rendered output of the keyword. Imports `@glimmer/debug-util` helpers only. |
| keywords/element-test.ts | P | - | Compile-time keyword usage + rendered output via `@ember/template-compiler`. |
| keywords/eq-runtime-test.ts | P | BUILD (minor) | Compiles via `@ember/template-compiler/runtime`; asserts rendered output of the keyword. Imports `@glimmer/debug-util` helpers only. |
| keywords/eq-test.ts | P | BUILD | Compile-time keyword usage + rendered output via `@ember/template-compiler`. DEBUG-gated assertion-message tests (`@glimmer/env`). |
| keywords/fn-runtime-test.ts | P | BUILD (minor) | Compiles via `@ember/template-compiler/runtime`; asserts rendered output of the keyword. Imports `@glimmer/debug-util` helpers only. |
| keywords/fn-test.ts | P | - | Compile-time keyword usage + rendered output via `@ember/template-compiler`. |
| keywords/gt-runtime-test.ts | P | BUILD (minor) | Compiles via `@ember/template-compiler/runtime`; asserts rendered output of the keyword. Imports `@glimmer/debug-util` helpers only. |
| keywords/gt-test.ts | P | BUILD | Compile-time keyword usage + rendered output via `@ember/template-compiler`. DEBUG-gated assertion-message tests (`@glimmer/env`). |
| keywords/gte-runtime-test.ts | P | BUILD (minor) | Compiles via `@ember/template-compiler/runtime`; asserts rendered output of the keyword. Imports `@glimmer/debug-util` helpers only. |
| keywords/gte-test.ts | P | BUILD | Compile-time keyword usage + rendered output via `@ember/template-compiler`. DEBUG-gated assertion-message tests (`@glimmer/env`). |
| keywords/hash-runtime-test.ts | P | BUILD (minor) | Compiles via `@ember/template-compiler/runtime`; asserts rendered output of the keyword. Imports `@glimmer/debug-util` helpers only. |
| keywords/hash-test.ts | P | - | Compile-time keyword usage + rendered output via `@ember/template-compiler`. |
| keywords/log-test.ts | R | BUILD | Skips under `LOCAL_TRACE_LOGGING` (`@glimmer/local-debug-flags`); drop the flag. |
| keywords/lt-runtime-test.ts | P | BUILD (minor) | Compiles via `@ember/template-compiler/runtime`; asserts rendered output of the keyword. Imports `@glimmer/debug-util` helpers only. |
| keywords/lt-test.ts | P | BUILD | Compile-time keyword usage + rendered output via `@ember/template-compiler`. DEBUG-gated assertion-message tests (`@glimmer/env`). |
| keywords/lte-runtime-test.ts | P | BUILD (minor) | Compiles via `@ember/template-compiler/runtime`; asserts rendered output of the keyword. Imports `@glimmer/debug-util` helpers only. |
| keywords/lte-test.ts | P | BUILD | Compile-time keyword usage + rendered output via `@ember/template-compiler`. DEBUG-gated assertion-message tests (`@glimmer/env`). |
| keywords/neq-runtime-test.ts | P | BUILD (minor) | Compiles via `@ember/template-compiler/runtime`; asserts rendered output of the keyword. Imports `@glimmer/debug-util` helpers only. |
| keywords/neq-test.ts | P | BUILD | Compile-time keyword usage + rendered output via `@ember/template-compiler`. DEBUG-gated assertion-message tests (`@glimmer/env`). |
| keywords/not-runtime-test.ts | P | BUILD (minor) | Compiles via `@ember/template-compiler/runtime`; asserts rendered output of the keyword. Imports `@glimmer/debug-util` helpers only. |
| keywords/not-test.ts | P | BUILD | Compile-time keyword usage + rendered output via `@ember/template-compiler`. DEBUG-gated assertion-message tests (`@glimmer/env`). |
| keywords/on-runtime-test.ts | P | BUILD (minor) | Compiles via `@ember/template-compiler/runtime`; asserts rendered output of the keyword. Imports `@glimmer/debug-util` helpers only. |
| keywords/on-test.ts | R | RUNTIME-PRIV | Uses `setModifierManager`/`modifierCapabilities` from `@glimmer/manager` (public-equivalent in `@ember/modifier`); swap import. |
| keywords/or-runtime-test.ts | P | BUILD (minor) | Compiles via `@ember/template-compiler/runtime`; asserts rendered output of the keyword. Imports `@glimmer/debug-util` helpers only. |
| keywords/or-test.ts | P | BUILD | Compile-time keyword usage + rendered output via `@ember/template-compiler`. DEBUG-gated assertion-message tests (`@glimmer/env`). |
| lexical-scope-test.ts | P | - | |
| managers/helper-manager-test.ts | R | RUNTIME-PRIV, BUILD | `helperCapabilities`/`setHelperManager` from `@glimmer/manager` (public as `@ember/helper`). Behavior of the manager API is normative §06; swap imports. DEBUG gating for assertion messages. |
| managers/modifier-manager-test.ts | R | RUNTIME-PRIV, BUILD | `modifierCapabilities`, `setModifierManager` (`@ember/modifier`), `getOwner`/`setOwner` from `@glimmer/owner`. |
| math-test.ts | P | - | MathML namespaces from `@glimmer/constants` (`NS_MATHML`), which is only a string constant. |
| modifiers-test.ts | P | - | |
| modifiers/dynamic-modifiers-test.ts | P | - | |
| modifiers/on-test.ts | M | RUNTIME-PRIV | 1 test calls `getInternalModifierManager(on)` (:41) to inspect `OnManager` internals = I; the rest (event listener, options, re-binding) P. |
| node-suites-node-test.ts | P | RUNTIME-PRIV | SSR suites; needs a Node harness adapter (`NodeJitRenderDelegate`, serialization delegate). |
| owner-test.ts | I | RUNTIME-PRIV, REF | Implements an internal component manager (`setInternalComponentManager`, `WithSubOwner`, `hasSubOwner`, `NULL_REFERENCE`, `getCapabilities` returning `InternalComponentCapabilities`). Only portable if sub-owners are spec'd (§06/§08); otherwise exclude. |
| package.json | - | | not a test |
| partial-rehydration-test.ts | R | RUNTIME-PRIV | Asserts `this.delegate.rehydrationStats.clearedNodes` (:68,160,186) — a harness/builder internal; refactor to assert node identity preserved. |
| precompile-test.ts | I | WIRE, OPCODE | 6 tests of `templateFactory` internals: `__id`, `__meta`, `template.id`, `referrer`; all `JSON.parse` of the precompiled wire. Exclude (only "meta/owner reachable by referrer" is observable and is covered by §06 owner tests). |
| render-test.ts | P | - | One test: Symbols are rendered as strings. |
| strict-mode-test.ts | R | RUNTIME-PRIV | 94 tests, 103 assertHTML. Imports the keywords `array, concat, fn, get, hash, on` as strict-mode scope values from `@glimmer/runtime` (:2); adapter provides public equivalents (`@ember/helper`, `@ember/modifier`). |
| style-warnings-test.ts | R | RUNTIME-PRIV, BUILD | Installs a GlobalContext via `testOverrideGlobalContext` (:3,18) to count `warnIfStyleNotTrusted`; a host hook (spec §08) but the override mechanism is private. |
| support.ts | - | | local helpers (`module`, `assert`) |
| syntax/argument-less-helper-paren-less-invoke-test.ts | P | AST (error text) | |
| syntax/general-errors-test.ts | P | AST (error text) | Parse/compile errors via `preprocess` + `syntaxErrorFor` (normative messages and loc). |
| syntax/if-unless-test.ts | P | AST (error text) | |
| syntax/keyword-errors-test.ts | R | AST | Iterates `KEYWORDS_TYPES` from `@glimmer/syntax` (:1-12) to generate tests; refactor: spec list of keywords and their allowed positions. |
| syntax/named-blocks-test.ts | P | AST (error text) | |
| syntax/yield-keywords-test.ts | P | AST (error text) | |
| tracked-value-test.ts | R | TAG | `trackedValue` from `@glimmer/validator` (private-ish: not in public `@glimmer/tracking`). |
| updating-content-matrix-test.ts | P | - | Content-type x update matrix; imports `SafeString` type. |
| updating-modifiers-test.ts | P | - | |
| updating-svg-test.ts | P | STRING-HTML | |
| updating-test.ts | M | REF, TAG, RUNTIME-PRIV | 66 tests. About 5 tests (:396-435 const refs as custom content; :449-460 and :490-535 destroyable-on-reference tests) build `createConstRef`/`createPrimitiveRef`/`createComputeRef` + `createTag`/`consumeTag`/`dirtyTag` (private reference API; I or R via a tracked property), plus `associateDestroyableChild`/`registerDestructor` (public in `@ember/destroyable`). Rest P. |

### Group 1 recurring patterns

| pattern | files | examples |
|---|---|---|
| Harness-mediated (`RenderTest`/`jitSuite`); portable once `RenderDelegate` is adapted | ~65 of 79 | `updating-test.ts`, `lib/render-test.ts:58` |
| Private/semi-private imports of `@glimmer/runtime` keywords (`array, concat, fn, get, hash, on`) as strict-mode scope values | 2 (`strict-mode-test.ts:2`, `modifiers/on-test.ts:3`) | `strict-mode-test.ts:1433` |
| Manager APIs via `@glimmer/manager` (public equivalents exist in `@ember/helper` / `@ember/modifier`) | 5 | `managers/helper-manager-test.ts:3`, `keywords/on-test.ts:3` |
| `@glimmer/validator` tracked collections / `trackedValue` | 7 | `collections/array-test.ts:2`, `tracked-value-test.ts:1` |
| References and tags built by hand | 3 (`updating-test.ts`, `helpers/fn-test.ts`, `owner-test.ts`) | `updating-test.ts:496-504` |
| Wire / templateFactory / opcode-compiler | 2 (`precompile-test.ts`, `compiler/compile-options-test.ts`) | `precompile-test.ts:19-60` |
| Syntax-error text via `preprocess` + `syntaxErrorFor` (normative) | 7 | `invalid-html-test.ts:16-45`, `syntax/general-errors-test.ts:16` |
| `DEBUG`/`LOCAL_TRACE_LOGGING` gating | about 20 files + 10 sites in `lib/suites` | `debug-render-tree-test.ts:140`, `helpers/hash-test.ts:171` |
| Rehydration internals (`rehydrationStats`) | 1 | `partial-rehydration-test.ts:68` |
| Environment / global-context | 2 | `env-test.ts:3`, `style-warnings-test.ts:18` |

Totals for group 1 (79 test files, excluding `package.json`; `support.ts` counted P-support): P 55, R 17, M 4 (`compiler/compile-options-test.ts`, `debug-render-tree-test.ts`, `modifiers/on-test.ts`, `updating-test.ts`), I 4 (`env-test.ts`, `i-n-u-r-test.ts`, `owner-test.ts`, `precompile-test.ts`). (Counts approximate; keywords/* are 30 files: 3 R, 27 P.)

## Group 2 — `packages/@ember/-internals/glimmer/tests/**` (89 files incl. 6 util files and 3 .gjs; paths relative to that dir)

Harness: every test is a `moduleFor(..., class extends RenderingTestCase | ApplicationTestCase)` from `packages/internal-test-helpers` (`lib/test-cases/rendering.ts`, `application.ts`). `RenderingTestCase` imports `_resetRenderers`, `Helper`, `EventDispatcher` from `@ember/-internals/*` and drives rendering with `runAppend`/`runTask` (`lib/test-cases/rendering.ts:2-3,15,118,225`). `runTask(...)` appears 1,606 times in 68 files: it is "run in a run loop and flush", which a conformance adapter can map to render-settled. A conformance run needs the whole Ember layer (container, router, `Component`, services), so these are "Ember-integration" tests (§08), not core language tests. Note: counts of `@ember/template-compilation` (58 files, `precompileTemplate`) are public API, not WIRE coupling.

| file | class | categories | note |
|---|---|---|---|
| integration/action-is-not-a-keyword-test.js | P | BUILD (mild) | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/application/debug-render-tree-test.ts | R | DRT, EMBER-PRIV, BUILD, RUNTIME-PRIV | ~45 `captureRenderTree` (`@ember/debug`, semi-public) assertions on the whole captured tree (`bounds`, `args`, `instance`, `meta`); gated by `ENV._DEBUG_RENDER_TREE` (:48); uses `componentCapabilities`, `templateOnlyComponent` (:18-19) and `CapturedRenderNode` from `@glimmer/interfaces`. Port only if DRT is in conformance scope (§08-13); node shape/`bounds` is semi-public. |
| integration/application/engine-test.js | R | RUNLOOP, RUNTIME-PRIV | Engine rendering through router; `next(...)` from `@ember/runloop` (:393-688) to wait for loading/error substate, `templateOnlyComponent` from `@glimmer/runtime` (:17). Replace with `settled()`/public template-only. |
| integration/application/helper-registration-test.js | P | EMBER-PRIV (mild) | `Helper` from `@ember/-internals/glimmer` (public as `@ember/component/helper`). |
| integration/application/hot-reload-test.js | P | - | Simulates hot reload with public `setComponentTemplate` + a class helper that recomputes; no VM coupling. |
| integration/application/rendering-test.js | P | EMBER-PRIV (mild) | Route/application rendering; `tracked` from `@ember/-internals/metal` (public `@glimmer/tracking`); `backtrackingMessageFor` (assertion text) from `utils/debug-stack`. |
| integration/components/angle-bracket-invocation-test.js | P | - | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/components/append-test.js | P | BUILD (mild) | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/components/attribute-bindings-test.js | P | BUILD (mild) | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/components/attrs-lookup-test.js | P | - | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/components/class-bindings-test.js | P | BUILD (mild) | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/components/component-template-test.js | P | BUILD (mild) | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/components/contextual-components-test.js | P | BUILD (mild) | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/components/curly-components-test.js | M | RUNLOOP, EMBER-PRIV, BUILD, TAG | 3,926 lines, ~150+ tests on classic `Component` (§08 legacy); a few tests use `run(...)` and `runLoopSettled` (:3382), `DEPRECATIONS` flags, `DEBUG`-gated assertion messages (21 sites), and `debug-stack` DRT backtracking messages (3). Mostly P once the Ember component layer exists. |
| integration/components/dynamic-components-test.js | P | BUILD (mild) | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/components/error-handling-test.js | P | BUILD | Error in template/exception recovery; DEBUG gating. |
| integration/components/fragment-components-test.js | P | BUILD (mild) | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/components/glimmer-component-test.gjs | P | - | .gjs: `<template>` authoring (§01). |
| integration/components/input-angle-test.js | P | - | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/components/input-curly-test.js | P | - | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/components/instrumentation-compile-test.js | I | EMBER-PRIV | Subscribes to `@ember/instrumentation` `render.compile`; events are an Ember-private profiling hook. |
| integration/components/instrumentation-test.js | I | EMBER-PRIV | `render.component` instrumentation payloads (`payload.view`, ordering). Not template semantics; exclude unless §08 specifies. |
| integration/components/life-cycle-test.js | R | RUNLOOP, EMBER-PRIV | `schedule('afterRender', ...)` (:182,1358,1381) and `getViewId`/`getViewElement` from `@ember/-internals/views` (:6,65,113); asserts lifecycle hook ordering (normative), but through private view registry and run-loop queue names. |
| integration/components/link-to/query-params-angle-test.js | P | RUNLOOP (mild) | `<LinkTo>` with routing; `runLoopSettled`. Requires full router; routing semantic is outside the pure template language (§08). |
| integration/components/link-to/query-params-curly-test.js | P | - | as above, curly invocation `{{link-to}}`. |
| integration/components/link-to/rendering-angle-test.js | P | BUILD (mild) | DEBUG-gated assertions. |
| integration/components/link-to/rendering-curly-test.js | P | BUILD (mild) | DEBUG-gated assertions. |
| integration/components/link-to/routing-angle-test.js | P | RUNLOOP (mild) | 2,026 lines; `runLoopSettled` after transitions. |
| integration/components/link-to/routing-curly-test.js | P | RUNLOOP (mild) | 1,965 lines; as above. |
| integration/components/link-to/transitioning-classes-angle-test.js | P | - | Transitioning CSS classes. |
| integration/components/link-to/transitioning-classes-curly-test.js | P | - | Transitioning CSS classes. |
| integration/components/render-component-test.ts | M | DRT, RUNTIME-PRIV, BUILD, RUNLOOP | `renderComponent` tests (public `@ember/renderer`-style API) = P; 2 `captureRenderTree` tests (:126,140) gated on `ENV._DEBUG_RENDER_TREE` = R; strict-mode scope values from `@glimmer/runtime` (:20) = R; `run` from runloop (:23). |
| integration/components/render-to-element-test.js | - | - | empty file (0 lines) |
| integration/components/runtime-template-compiler-explicit-test.ts | R | RUNTIME-PRIV, AST | Imports keywords from `@glimmer/runtime` (4 sites) as scope values; otherwise P (runtime template compile). |
| integration/components/runtime-template-compiler-implicit-test.ts | R | RUNTIME-PRIV, AST | As above, implicit scope (eval-based). |
| integration/components/strict-mode-test.js | R | RUNTIME-PRIV | `hash, array, concat, get, on, fn` from `@glimmer/runtime` (:16); swap to `@ember/helper`/`@ember/modifier`. |
| integration/components/target-action-test.js | P | BUILD (mild) | Legacy `targetObject`/`sendAction`. 9 DEBUG/deprecation sites. |
| integration/components/template-only-components-test.js | R | RUNTIME-PRIV, DRT | `templateOnlyComponent` from `@glimmer/runtime` (:3); one DRT check. |
| integration/components/textarea-angle-test.js | P | BUILD (mild) | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. |
| integration/components/textarea-curly-test.js | P | - | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. |
| integration/components/to-string-test.js | I | EMBER-PRIV | `toString()` output of component instance (internal naming, `getOwner` internals). |
| integration/components/tracked-test.js | P | EMBER-PRIV (mild), BUILD | `tracked` from `@ember/-internals/metal` (public `@glimmer/tracking`); `DEPRECATIONS` flags; tracked + computed/ArrayProxy interop (§07). |
| integration/components/utils-test.js | R | EMBER-PRIV | `getRootViews`, `getChildViews`, `getViewBounds`, `getViewClientRects` from `@ember/-internals/views` (:5-11): private view-tree utilities; refactor to DOM bounds assertions or exclude if view tree is not specced. |
| integration/components/web-component-fallback-test.js | P | - | Custom element tag fallback. |
| integration/components/will-destroy-element-hook-test.js | P | - | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/content-test.js | P | STRING-HTML, EMBER-PRIV (mild) | 1,829 lines; content-type matrix; `ENV`/`DEBUG` deprecations (7). |
| integration/custom-component-manager-test.js | P | BUILD (mild) | Public `setComponentManager` + `componentCapabilities` from `@glimmer/manager`/`@ember/component` (normative §06). DEBUG gating for capability assertions. |
| integration/custom-helper-test.gjs | P | - | 20 lines. |
| integration/custom-modifier-manager-test.js | M | DRT, EMBER-PRIV, BUILD | Modifier manager API (public, P); 1 test toggles `ENV._DEBUG_RENDER_TREE` (:690-695) = R/I; `tracked` from `@ember/-internals/metal`; ~9 DEBUG/assertion-message tests. |
| integration/event-dispatcher-test.js | R | EMBER-PRIV, RUNLOOP | `_getCurrentRunLoop` from `@ember/runloop` (:12) to assert handler runs in a run loop; `EventDispatcher`; event delegation semantics are §08-legacy. |
| integration/helpers/array-test.js | P | - | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/helpers/concat-test.js | P | - | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. |
| integration/helpers/custom-helper-test.js | P | EMBER-PRIV (mild), BUILD | Classic `Helper`/`helper()` (`@ember/component/helper`), 12 DEBUG sites (assertion text). |
| integration/helpers/default-helper-manager-test.js | P | - | Plain function helpers. |
| integration/helpers/element-test.js | P | BUILD | `{{element}}` keyword, DEBUG-gated errors. |
| integration/helpers/fn-test.js | P | BUILD (mild) | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. |
| integration/helpers/get-test.js | P | - | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/helpers/hash-test.js | P | - | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/helpers/helper-manager-test.js | R | RUNTIME-PRIV, TAG, DRT | `helperCapabilities`/`setHelperManager` (public); `getDebugName` hook on helper; 1 `@glimmer/validator` use; DRT label tests. |
| integration/helpers/if-laziness-test.gjs | P | - | .gjs. |
| integration/helpers/if-unless-test.js | P | - | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. |
| integration/helpers/invoke-helper-test.js | R | TAG, RUNTIME-PRIV | `invokeHelper` (public `@ember/helper`) results read with `getValue` from `@glimmer/validator` (14 sites) and `invokeHelper` imported from `@glimmer/runtime` (:13); refactor: public `invokeHelper` re-export + `getValue`/cache from `@glimmer/tracking/primitives/cache`. |
| integration/helpers/log-test.js | P | - | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. |
| integration/helpers/mut-test.js | P | BUILD (mild) | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/helpers/readonly-test.js | P | - | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/helpers/tracked-test.js | P | - | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/helpers/unbound-test.js | P | BUILD (mild) | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/helpers/unique-id-test.js | R | TAG | `getValue(invokeHelper({}, uniqueId))` (:30-31); same refactor as invoke-helper. |
| integration/helpers/yield-test.js | P | - | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/input-test.js | P | - | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. |
| integration/modifiers/on-test.js | M | RUNTIME-PRIV | 2 suites read `getInternalModifierManager(on)` `.counters` (:21,317) = I ("leveraging private APIs", :19); `on` imported from `@glimmer/runtime` (:3); ~rest P (listener behavior, options). |
| integration/mount-test.js | R | EMBER-PRIV, DRT | Engine `{{mount}}`; `backtrackingMessageFor` assertion text from `utils/debug-stack` (private DRT format). |
| integration/refinements-test.js | P | - | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. |
| integration/render-settled-test.js | I | RUNLOOP, EMBER-PRIV | `renderSettled` from `@ember/-internals/glimmer`; schedules into 'actions'/'afterRender' queues (:55,62). Internal Ember (not a template language behavior) — exclude or map to `settled()`. |
| integration/svg-test.js | P | - | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. |
| integration/syntax/each-in-test.js | P | RUNLOOP (mild) | `{{#each-in}}`. |
| integration/syntax/each-test.js | P | EMBER-PRIV (mild) | `{{#each}}` with ArrayProxy, keys; 3 internal-import hits are `tracked`/`ArrayProxy`. |
| integration/syntax/if-unless-test.js | P | - | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. Uses public `setComponentTemplate`. |
| integration/syntax/let-test.js | P | BUILD (mild) | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. |
| integration/syntax/public-in-element-test.js | P | BUILD | `{{in-element}}` public; DEBUG assert text. |
| integration/syntax/with-dynamic-var-test.js | P | BUILD (mild) | Behavior via `RenderingTestCase`/`ApplicationTestCase`; no private VM imports. |
| unit/runtime-resolver-cache-test.js | I | EMBER-PRIV, WIRE | Asserts `templateCacheCounters` hits/misses (:5,39,94,128) and `ENV._DEBUG_RENDER_TREE`-dependent counts: template cache internals. Exclude. |
| unit/template-factory-test.js | I | WIRE, EMBER-PRIV | `precompile` -> `template(spec)` -> factory identity; cache hit/miss counters (:4,69-81). Exclude (only "compiled and precompiled render identically" is portable). |
| utils/debug-stack.js | - | DRT | test util: reads DRT stack to format backtracking assertion message (`backtrackingMessageFor`); couples tests to private DRT format. |
| utils/glimmerish-component.js | - | RUNTIME-PRIV | test util: `setComponentManager` + `componentCapabilities`. |
| utils/helpers.js | - | EMBER-PRIV | test util: re-exports `Component`, `Helper`. |
| utils/positional-component.js | - | RUNTIME-PRIV | test util: custom component manager. |
| utils/shared-conditional-tests.js | - | - | shared test bodies for `if`/`unless` (999 lines); P. |
| utils/string-test.js | P | - | htmlSafe/SafeString. |

### Group 2 recurring patterns

| pattern | files | examples |
|---|---|---|
| `moduleFor`/`RenderingTestCase`/`ApplicationTestCase` harness (adapter must provide container + app + settle) | 83 | `internal-test-helpers/lib/test-cases/rendering.ts:118` |
| `runTask(...)` as "mutate, then synchronously flush" (RUNLOOP expectation: updates visible right after the call) | 68 files, 1,606 call sites | `integration/helpers/tracked-test.js`, `integration/components/curly-components-test.js` |
| Direct run loop API: `schedule('afterRender')`, `next`, `run`, `_getCurrentRunLoop` | 6 files | `components/life-cycle-test.js:182`, `application/engine-test.js:393`, `event-dispatcher-test.js:12` |
| `ENV._DEBUG_RENDER_TREE` gating/toggling | 6 files | `application/debug-render-tree-test.ts:48`, `custom-modifier-manager-test.js:690` |
| `captureRenderTree` from `@ember/debug` (semi-public) | 2 files (~13 tests) | `debug-render-tree-test.ts:1153`, `render-component-test.ts:190` |
| Private DRT backtracking-message helper `backtrackingMessageFor` | 4 files | `utils/debug-stack.js`, `rendering-test.js:9`, `mount-test.js:16` |
| Keywords imported from `@glimmer/runtime` as scope values | 4 | `strict-mode-test.js:16`, `render-component-test.ts:20` |
| `@glimmer/manager` imports: `setComponentTemplate` (50 sites, public), `componentCapabilities`, `helperCapabilities`, `modifierCapabilities`, `setHelperManager`, `setModifierManager` (all public equivalents), `getInternalModifierManager` (private, 1) | 53 | `modifiers/on-test.js:2,21,317` |
| Template cache/factory internals (`templateCacheCounters`, `template(spec)`) | 2 | `unit/runtime-resolver-cache-test.js:5`, `unit/template-factory-test.js:4` |
| `@glimmer/validator` `getValue` on `invokeHelper` results | 2 | `helpers/invoke-helper-test.js:11`, `helpers/unique-id-test.js:10` |
| Private views API (`getViewId`, `getViewElement`, `getRootViews`, `getViewBounds`) | 2 | `life-cycle-test.js:6`, `utils-test.js:5` |
| `@ember/instrumentation` render events | 2 | `instrumentation-test.js:5`, `instrumentation-compile-test.js` |
| Assertion/deprecation text with DEBUG gating (`expectAssertion`, `expectDeprecation`, `assert.throws`) | ~145 sites, 20 files import `@glimmer/env` | `curly-components-test.js` (21 DEBUG sites) |
| `DEPRECATIONS.*` flags from `@ember/-internals/deprecations` | 7 | `curly-components-test.js:13` |
| `assertInnerHTML`/`equalInnerHTML`/`.innerHTML` (via `equal-inner-html.ts`, normalizing helper) | ~100 sites | `hot-reload-test.js:115` |

Totals (89 files; 6 are util files and 1 empty): P 61 (incl. 3 `.gjs` and 3 util), R 13, M 4 (`curly-components-test.js`, `render-component-test.ts`, `custom-modifier-manager-test.js`, `modifiers/on-test.js`), I 6 (`instrumentation-compile-test.js`, `instrumentation-test.js`, `to-string-test.js`, `render-settled-test.js`, `runtime-resolver-cache-test.js`, `template-factory-test.js`).
