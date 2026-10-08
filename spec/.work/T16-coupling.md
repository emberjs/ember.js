# T16 — Test-suite coupling survey

Portability classes: P = portable with a harness adapter; R = portable after refactor; I = implementation-internal (exclude); M = mixed.

## Categories

- WIRE, OPCODE, TAG, REF, AST, RUNTIME-PRIV, DRT, RUNLOOP, EMBER-PRIV, STRING-HTML, BUILD (as defined in the task brief)

## Checklist

- [x] 1. integration-tests/test/**
- [ ] 2. @ember/-internals/glimmer/tests/**
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
