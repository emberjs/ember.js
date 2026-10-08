# T16 — Test-suite coupling survey

Portability classes: P = portable with a harness adapter; R = portable after refactor; I = implementation-internal (exclude); M = mixed.

## Categories

- WIRE, OPCODE, TAG, REF, AST, RUNTIME-PRIV, DRT, RUNLOOP, EMBER-PRIV, STRING-HTML, BUILD (as defined in the task brief)

## Checklist

- [x] 1. integration-tests/test/**
- [x] 2. @ember/-internals/glimmer/tests/**
- [x] 3. @glimmer/*/test/**
- [x] 4. template-compiler tests
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

Totals (89 files; 6 are util files and 1 empty): P 60 (incl. 3 `.gjs` and 3 util), R 13, M 4 (`curly-components-test.js`, `render-component-test.ts`, `custom-modifier-manager-test.js`, `modifiers/on-test.js`), I 6 (`instrumentation-compile-test.js`, `instrumentation-test.js`, `to-string-test.js`, `render-settled-test.js`, `runtime-resolver-cache-test.js`, `template-factory-test.js`).

## Group 3 — `packages/@glimmer/*/test/**` (paths relative to `packages/@glimmer/`; 12 packages, 46 non-package.json files incl. 5 support files)

These are unit tests of the private `@glimmer/*` packages. By the spec's own rules nearly all are implementation-internal; the portable value is in the behavioral assertions that can be re-expressed through public API (destroyables, tracked collections, caches, parse errors).

| file | class | categories | note |
|---|---|---|---|
| compiler/test/compiler-test.ts | I | WIRE, AST | 88 tests: `precompile` -> `JSON.parse` -> deep-equal against `buildStatements`/`ProgramSymbols`/`WireFormatDebugger` wire statements (:1-40). Pure wire-format test. Exclude. |
| constants/test/debug-to-string-test.ts | I | BUILD | 9 lines, `debugToString`. |
| constants/test/immediate-test.ts | I | OPCODE | SMI immediate encoding (`encodeImmediate`/`MAX_SMI`). |
| debug-util/test/debug-to-string-test.ts | I | BUILD, EMBER-PRIV | `debugToString` naming helper; DEBUG-gated. |
| debug/test/metadata-test.ts | I | OPCODE | empty (`export {}`). |
| destroyable/test/destroyables-test.ts | R | RUNLOOP, BUILD | ~25 tests of `registerDestructor`/`associateDestroyableChild`/`destroy`/`destroyChildren`/`isDestroying` (same semantics as public `@ember/destroyable`; normative §05/§06 destruction order); imports `run` from `@ember/runloop` (:4) for async destruction flush; DEBUG-gated throw messages. Swap import path; keep. |
| manager/test/capabilities-test.ts | I | OPCODE, RUNTIME-PRIV | `capabilityFlagsFrom` bitmap vs `InternalComponentCapabilities` from `@glimmer/vm`. Exclude. |
| manager/test/managers-test.ts | M | RUNTIME-PRIV, REF, TAG | 3 manager kinds x ~6 tests. "it works" (set/get manager, default helper manager, throws on multiple managers or primitives, error messages for missing/invalid capabilities) are R via public `setComponentManager`/`setHelperManager`/`setModifierManager`; "works with internal managers" (3) and tests that call `getInternalXManager` and use `createConstRef`/`valueForRef` are I. About 12 R, 9 I. |
| owner/test/owner-test.ts | R | EMBER-PRIV | `getOwner`/`setOwner` (public as `@ember/owner`); 27 lines. |
| program/test/artifacts-test.ts | I | OPCODE | constants pool does not serialize metas. |
| program/test/heap-test.ts | I | OPCODE | `ProgramHeapImpl` growth. |
| reference/test/iterable-test.ts | R | REF, TAG | 14 tests of `IterableReference` delegates and key functions `@identity`, `@key`, `@index`, paths, dictionaries, null handling; keys semantics are normative (§05 `each`), but tested through the private ref/iterator; refactor to `{{#each ... key=...}}` render + reorder assertions (several exist in `integration-tests/test/...each` already). |
| reference/test/references-test.ts | I | REF, TAG, BUILD | const/compute/unbound/invokable/readonly refs, `childRefFor`, `createComputeRef` caching; `@glimmer/global-context` override. Exclude. |
| reference/test/support.ts, utils/qunit.ts, utils/template.ts | - | REF | test support only. |
| syntax/test/builders-test.ts | I | AST | |
| syntax/test/generation/print-test.ts | I | AST | `print` round trip (hbs re-printing is a non-goal). |
| syntax/test/legacy-interop-test.ts | I | AST | `path.parts` shape. |
| syntax/test/loc-node-test.ts | I | AST | 30 tests on `loc` of AST nodes. (Locs in thrown syntax errors are normative; AST `loc` is not.) |
| syntax/test/location-test.ts | I | AST | `Source`/`hbsPosFor`/`charPosFor` position math. |
| syntax/test/parser-error-test.ts | P | AST (error text) | Parse-error regression fixtures: `assert.throws` with messages + loc via `syntaxErrorFor` (normative parse errors; harness-independent because only needs `preprocess`/`precompile` that throws). |
| syntax/test/parser-escape-test.ts | R | AST | `\{{` escapes; asserts TextNode splitting/merging (`astEqual` on ASTv1) (:1-5). Refactor: assert rendered text. |
| syntax/test/parser-node-test.ts | M | AST | 75 tests (1,276 lines) assert ASTv1 shapes via `b.*` builders; maybe 5 (disallowed quote/equals, parse rejection) are P, the rest I. |
| syntax/test/parser-whitespace-test.ts | R | AST | `~` and standalone stripping, asserted as AST; semantics normative (§02), refactor to rendered text. |
| syntax/test/plugin-node-test.ts | I | AST | AST plugins/transform API. Non-goal. |
| syntax/test/public-api-test.ts | I | AST | pins the export list of `@glimmer/syntax`. |
| syntax/test/source-boundary-test.ts | I | AST | `hbsPosFor`/`charPosFor`. |
| syntax/test/template-locals-test.ts | R | AST | `getTemplateLocals` behavior (which free identifiers are locals, keyword handling); semi-public (used by tooling); if spec has an "analysis" API, port, else I. |
| syntax/test/traversal/manipulating-node-test.ts | I | AST | |
| syntax/test/traversal/visiting-keys-node-test.ts | I | AST | |
| syntax/test/traversal/visiting-node-test.ts | I | AST | |
| syntax/test/traversal/walker-node-test.ts | I | AST | |
| syntax/test/support.ts | - | AST | `astEqual` support. |
| util/test/object-utils-test.ts | I | - | 9 lines, `@glimmer/util`. |
| validator/test/collections/array-test.ts | R | TAG | `trackedArray` (public as `@ember/reactive/collections`); also uses `expect-type` (type-level test); behavior asserted through `createCache`/`getValue` (public). Near-duplicate of integration-tests/test/collections (render-level). |
| validator/test/collections/map-test.ts | R | TAG | `trackedMap`. |
| validator/test/collections/object-test.ts | R | TAG | `trackedObject`. |
| validator/test/collections/set-test.ts | R | TAG | `trackedSet`. |
| validator/test/collections/weak-map-test.ts | R | TAG | `trackedWeakMap`. |
| validator/test/collections/weak-set-test.ts | R | TAG | `trackedWeakSet`. |
| validator/test/meta-test.ts | I | TAG | `tagFor`/`dirtyTagFor`/`validateTag`/`valueForTag`. |
| validator/test/tracked-value-test.ts | R | TAG | `trackedValue` storage: set/update/reactivity through `createCache`; refactor to public cell/`tracked`. |
| validator/test/tracking-test.ts | M | TAG, BUILD | ~35 tests (:1-581). `track`/`beginTrackFrame`/`endTrackFrame`/`consumeTag`/`createTag`/`validateTag` tests (~18) = I. `createCache`/`getValue`/`isConst`/`untrack`-in-cache memoization, nested memoization, `trackedData` storage cells and the "update a value already consumed in same transaction" assertion (~15) = R via public `@glimmer/tracking/primitives/cache` + `tracked`; DEBUG-gated messages. |
| validator/test/validators-test.ts | I | TAG, BUILD | `createTag`, `createUpdatableTag`, `combine`, `CONSTANT_TAG`, `scheduleRevalidate`, `ALLOW_CYCLES`; `@glimmer/global-context` hooks. Exclude. |
| validator/test/-utils.ts | - | TAG | support. |

### Group 3 recurring patterns

| pattern | files | examples |
|---|---|---|
| Wire-format/Builder assertions | 1 (88 tests) | `compiler/test/compiler-test.ts:25-40` |
| ASTv1 shape/location/plugin/traversal/print | 13 syntax files (~270 tests) | `syntax/test/parser-node-test.ts`, `syntax/test/plugin-node-test.ts` |
| Tag/revision/track-frame primitives | 3 files (`meta-test`, `validators-test`, half of `tracking-test`) | `validator/test/meta-test.ts:5-20` |
| References | 2 files | `reference/test/references-test.ts` |
| Opcode/heap/bitmap/immediates | 5 files | `program/test/heap-test.ts`, `manager/test/capabilities-test.ts:3` |
| Public-API-equivalent semantics through private import path (destroyable, tracked collections, caches, owner, managers) | 12 files | `destroyable/test/destroyables-test.ts`, `validator/test/collections/array-test.ts:1` |
| Syntax-error text assertions (normative) | 1 file | `syntax/test/parser-error-test.ts:9-20` |

Totals (41 classified test files, plus 5 support files): P 1, R 13, M 3, I 24.

## Group 4 — `packages/ember-template-compiler/tests/**`, `packages/@ember/template-compiler/tests/**` (14 files)

Harness: `moduleFor` + `AbstractTestCase`/`RenderingTestCase`; most tests call `compile(...)` from `packages/ember-template-compiler/index` and assert on thrown dev assertions (`expectAssertion`) or render output. Dev-only compile-time assertions are normative with **[Dev]** (messages include ` ('module' @ L1:C2) ` location suffix).

| file | class | categories | note |
|---|---|---|---|
| ember-template-compiler/tests/basic-usage-test.js | I | AST, EMBER-PRIV | "Embroider-like compilation": `_buildCompileOptions`, `_preprocess`, `_print` with a custom AST plugin (`ElementNode` visitor), then `print` back to hbs (:1-43). AST plugins and re-printing are non-goals. |
| ember-template-compiler/tests/plugins/assert-against-attrs-test.js | M | AST, BUILD | `{{attrs.x}}`/`this.attrs` assertion messages (P, [Dev], uses `expectAssertion` via `precompileTemplate`); uses `utils/transform-test-case.ts` `assertTransformed` (deep-equals de-located ASTv1) for some cases = I. |
| ember-template-compiler/tests/plugins/assert-against-named-outlets-test.js | P | BUILD | `{{outlet "named"}}` assertion message. |
| ember-template-compiler/tests/plugins/assert-array-test.js | P | - | Render tests: block param/lexical `array` shadows the keyword (`precompileTemplate` strict + `scope`, `assertHTML`, `assertStableRerender`). Behavior only. |
| ember-template-compiler/tests/plugins/assert-input-helper-without-block-test.js | P | BUILD | `{{#input}}` assertion text. |
| ember-template-compiler/tests/plugins/assert-reserved-named-arguments-test.js | P | BUILD | 426 lines: `@arguments`, `@args`, `@block`, `@else` reserved: `expectAssertion(..., "'@arguments' is reserved. ('baz/foo-bar' @ L1:C2) ")` (:12-30); messages with `L:C` locations are normative [Dev]. |
| ember-template-compiler/tests/plugins/assert-splattribute-expression-test.js | P | BUILD | `{{...attributes}}` assertion. |
| ember-template-compiler/tests/plugins/transform-component-invocation-test.js | P | - | `assert.expect(0)`: "compiles without error" for 11 invocation forms (`{{this.modal open}}`, `{{@modal}}`...). Pure parse/compile acceptance. |
| ember-template-compiler/tests/plugins/transform-each-in-into-each-test.js | P | BUILD | `{{#each-in}}` without argument throws "requires an object ... first positional parameter" (:9-14); the name of the plugin is irrelevant. |
| ember-template-compiler/tests/plugins/transform-input-type-syntax-test.js | P | - | Compile-accepts `{{input type=...}}` forms. |
| ember-template-compiler/tests/system/compile_options_test.js | I | AST, EMBER-PRIV | `compileOptions()` copy identity, `RESOLUTION_MODE_TRANSFORMS`/`STRICT_MODE_TRANSFORMS` list membership (:20-40), `customizeComponentName` assertion (P-able message, :12-18), custom AST plugin passed to `compile`. 1 of 5 tests portable. |
| ember-template-compiler/tests/system/dasherize-component-name-test.js | R | EMBER-PRIV | Name-dasherization cache (`COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get`, :1-20); the mapping `Foo::BarBaz` -> `foo/bar-baz` is observable (component resolution, §03/§08) — refactor to resolution tests; the cache object is private. |
| ember-template-compiler/tests/utils/transform-test-case.ts | - | AST, WIRE | helper: runs `precompile` with an extra AST plugin to capture the transformed Template and compares ASTv1 after stripping `loc`. |
| @ember/template-compiler/tests/template_test.ts | R | RUNTIME-PRIV | `template()` with `<template>` implicit form (smoke); reads `getComponentTemplate` (public) and `getInternalComponentManager` (private). Refactor: render the result. |

### Group 4 recurring patterns

| pattern | files | examples |
|---|---|---|
| `compile`/`precompileTemplate` + `expectAssertion` of exact dev messages (normative [Dev]) | 6 | `plugins/assert-reserved-named-arguments-test.js:12`, `plugins/assert-against-named-outlets-test.js` |
| Compile-acceptance only (`assert.expect(0)`) | 2 | `plugins/transform-component-invocation-test.js:8` |
| AST plugin/ASTv1 deep-equal/`_preprocess`/`_print` | 4 | `basic-usage-test.js:1-43`, `utils/transform-test-case.ts:10` |
| Internal lists (`*_TRANSFORMS`) | 1 | `system/compile_options_test.js:20-40` |

Totals (13 test files; excluding the helper): P 7, R 2, M 1, I 2 (+ `compile_options_test.js` is 1 test P of 5 but counted I... see note). Note: of the 13 test files, `assert-against-attrs-test.js` is M and `compile_options_test.js` is I.
