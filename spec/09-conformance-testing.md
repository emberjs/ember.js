# 09 — Conformance testing

This chapter is **informative**. It sets out how to check that an implementation meets this
specification, and it is a work plan for getting there: what has to change in ember.js's own
test suite so that the suite can also run against a different implementation, and which parts
of the specification have no test yet.

The plan's goal (`plan.md`) is a new implementation that compiles templates to JavaScript
functions instead of running the Glimmer VM. Such an implementation can only be called
backward compatible if it passes the same tests as the current one. Today, many tests reach
into the VM's internals or into the harness's own wiring to it, so they cannot be pointed at
anything else. Most of that coupling is in two harnesses, not in the tests (§9.4).

Sources for this chapter (author's request of 2026-10-07, T16):

- `.work/T16-harness.md`: how the two test harnesses work and where an adapter can go.
- `.work/T16-coupling.md`: every test file in the template-relevant packages, with the
  implementation details it relies on and a portability class.
- `.work/T16-coverage.md`: sections of this specification without a test, from
  `tools/test-coverage.py`, plus the gaps that the chapters already record.

The counts below come from those surveys. They are based on grep and sampling, so they are
approximate.

---

## 9.1 Conformance and the conformance suite

1. An implementation **conforms** to a profile (§9.2) of this specification when it passes the
   **conformance suite** for that profile, in both a development and a production build
   (§9.5, C10).
2. The conformance suite is the subset of ember.js's tests that checks behavior this
   specification makes normative, run through an **implementation adapter** (§9.4). It is not
   a separate test suite. The tests stay in ember.js, where they also keep checking the
   current implementation, and the same files run against a new one through its adapter.
3. Each conformance test names the specification sections it checks (§9.7, W8). A test that
   checks only behavior this specification leaves to the implementation is an
   **implementation test**. It stays in ember.js and is excluded from the conformance suite. It
   is never deleted because of this chapter.
4. Evidence levels used in this specification, from strongest to weakest:
   - *test-pinned*: a cited upstream test asserts the rule;
   - *experiment*: confirmed by a throwaway test or probe that was not upstreamed (T9a, T9b,
     the §02 parser probes, the §03/§04 `precompile` probes);
   - *source-derived*: read from the implementation only.

   The conformance suite can contain only the first. §9.6 lists the rules that are at the
   other two levels.

## 9.2 Profiles

The specification's markers (§00-0.5) divide it into profiles. An implementation declares
which profiles it supports. The suite is organized so that each test belongs to exactly one.

| Profile | Covers | Marker | Notes |
|---|---|---|---|
| **Core** | Strict-mode templates, runtime semantics, managers, reactivity (§01–§03 strict parts, §05 except §05-13, §06, §07) | — | Required |
| **Dev** | Development-only assertions, deprecations, and their exact messages | **[Dev]** | Required. Messages are matched verbatim (§9.5, C16) |
| **Loose mode** | Resolution of free names through the owner, `{{foo}}` vs `this.foo` | **[Loose mode]** | Required for Ember compatibility |
| **Legacy** | Classic components, `get`/`set` interop, curly invocation | **[Legacy]** | Required for Ember compatibility |
| **Ember integration** | §08: owner and resolver, built-ins (`Input`, `LinkTo`, …), outlets, routing, engines, `renderComponent`, `renderSettled`, run-loop timing (§07-1.10) | — | Required for Ember. Partly depends on the run loop (§9.5, C11) |
| **SSR** | Serialization and rehydration (§05-13), including the marker format of §05-13.1 | — | Open question Q1 (§9.8) |
| **Debug render tree** | `captureRenderTree` and the tree shape (§08-13) | **[Dev]** | Optional. Ember Inspector depends on it |
| **Proposed** | The [Proposed] reactive core (§07-2) | **[Proposed]** | Only `spec/prototype/reactive/test.mjs` for now |

## 9.3 The current suite

Facts an adapter has to work with (details and citations in `.work/T16-harness.md`):

1. **One page, one QUnit run.** `index.html` globs every test file in the repository,
   including the Glimmer packages' tests (`index.html:60-76`). So Glimmer's tests run under
   Ember's global context (§9.5, C15) and share QUnit, the fixture element and the leak checks
   with Ember's tests.
2. **From source, not from `dist/`.** Vite maps every `@glimmer/*` and `@ember/*` specifier
   to `packages/<name>/index.ts` (`rollup.config.mjs` `resolvePackages`, used by
   `vite.config.mjs`). This is the hook for swapping an implementation in (§9.4, seam A).
3. **Templates are compiled at build time.** `precompileTemplate(...)`, `.gjs` and `.gts` go
   through `babel-plugin-ember-template-compilation` with the `compilerPath` set in
   `babel.config.mjs:41`, which emits the wire format. The two harnesses compile test-time
   strings with `precompileJSON` plus `templateFactory`
   (`packages/@glimmer-workspace/integration-tests/lib/compile.ts:20-41`,
   `packages/internal-test-helpers/lib/compile.ts:20-39`).
4. **Two harnesses.**
   - The **Glimmer harness** (`packages/@glimmer-workspace/integration-tests/lib/`): test
     classes extend `RenderTest` and are registered with `jitSuite` and friends
     (`lib/test-helpers/module.ts:19-111`). Each test gets a fresh `RenderDelegate`
     (`lib/render-delegate.ts:30-61`), which compiles, registers and renders. The `RenderDelegate`
     interface is already the seam. Five delegates exist: client (JIT), node, serialization,
     rehydration, partial rehydration.
   - The **Ember harness** (`packages/internal-test-helpers/lib/`): `moduleFor` and
     `RenderingTestCase` build a real application owner, register things through the
     resolver, render through a classic top-level component with `runAppend`
     (`lib/test-cases/rendering.ts:99-119`), and update with `runTask`, which is `run()`
     (`lib/run.ts:16-18`). There is no delegate. Its tests talk to Ember directly.
5. **Build matrix.** CI runs development and production builds, and variants for deprecations,
   optional features and stable decorators (`.github/workflows/ci-jobs.yml`, `testem.cjs`). In a
   production build, `expectAssertion` degrades to `ok(true)` and `if (DEBUG)` tests are not
   defined.

Classification of the template-relevant test files (`.work/T16-coupling.md`; P portable once
the harness has an adapter, R portable after refactoring the test, M mixed, I implementation
test):

| Group | P | R | M | I | Files |
|---|---|---|---|---|---|
| `@glimmer-workspace/integration-tests/test` | 52 | 19 | 4 | 4 | 79 |
| `@ember/-internals/glimmer/tests` | 62 | 13 | 4 | 4 | 83 |
| `@glimmer/*/test` | 1 | 13 | 3 | 24 | 41 |
| `ember-template-compiler/tests`, `@ember/template-compiler/tests` | 8 | 2 | 1 | 2 | 13 |
| **Total** | **123** | **47** | **12** | **34** | **216** |

The second row moves two files from I to P compared with the survey: `render-settled-test.js`
pins §07-1.10 item 8, and the `backtrackingMessageFor` helper checks the normative message of
§07-1.9 (both Ember profile, the latter Dev).

The remaining packages (`@ember/-internals/metal`, `@ember/object`, `@ember/-internals/runtime`,
`ember/tests`, routing, application, engine, run loop; about 270 files) were surveyed by
directory. About 11 files test `@tracked`/`@cached` directly (R: they observe tags), about 45
test classic computed properties, observers and proxies (relevant only to §07-3.6 interop), and
about 30 render templates through the application harness (P, Ember profile). The rest are
outside the template language.

**About 60% of the template-relevant tests are portable as written once the harnesses have an
adapter.** The main work is in the harnesses (§9.4), then in about 60 test files (R and M).

## 9.4 The implementation adapter

### 9.4.1 Seams

Three seams, which can be combined. Each runs the same test files against either
implementation.

- **Seam A: module aliasing (Ember harness, Ember-level tests).** Ember's tests use public API
  (`precompileTemplate`, `template()`, `setComponentTemplate`, managers, `owner.register`) plus
  a handful of renderer entry points in `@ember/-internals/glimmer` (`renderComponent`,
  `setRenderer`, `_resetRenderers`, `renderSettled`, `Component#rerender`). The new
  implementation replaces those packages and the build-time `compilerPath`, selected by an
  environment variable in `vite.config.mjs`, as `VITE_STABLE_DECORATORS` already is. The tests
  do not change. The constraint is that `@ember/-internals/glimmer/lib/renderer.ts` imports
  deep VM paths, so it is part of what gets replaced, not a fixed point.
- **Seam B: a `RenderDelegate` for the Glimmer harness.** A new delegate class next to
  `JitRenderDelegate`, picked by `jitSuite`/`jitComponentSuite`
  (`lib/test-helpers/module.ts:19-43`), plus node, serialization and rehydration variants for
  the SSR profile. About 85 of the 86 Glimmer test files import only from the harness barrel,
  so one swap covers them, after the refactors of §9.5 C1.
- **Seam C: one compile function.** The two harness compile helpers (§9.3 item 3) become calls
  to the adapter's `compile`. Every other test-time compile already goes through them or
  through `precompileTemplate`/`template()`.

### 9.4.2 The adapter interface

What an implementation provides to run the suite. Everything except `compile`, `render*` and
the handle is public API that the implementation provides anyway.

```ts
interface ConformanceAdapter {
  // Profiles it claims (§9.2); the suite skips the others.
  profiles: Set<'core' | 'dev' | 'loose' | 'legacy' | 'ember' | 'ssr' | 'render-tree' | 'proposed'>;
  build: 'development' | 'production';

  // Compile a template string, as precompileTemplate()/template() would (§01).
  compile(source: string, options?: {
    strictMode?: boolean;
    scope?: () => Record<string, unknown>;      // lexical scope (§01-1.8)
    moduleName?: string;
    keywords?: string[];                        // extra strict-mode keywords
  }): object;                                   // a template factory accepted by setComponentTemplate

  // Render, as renderComponent (§08) or the loose top-level template does.
  renderComponent(definition: object, options: {
    into: Element; args?: Record<string, unknown>; owner?: object;
    mode?: 'client' | 'serialize' | 'rehydrate';   // SSR profile only
  }): RenderHandle;
  renderTemplate(template: object, self: object, options: {          // loose / legacy profiles
    into: Element; owner?: object; mode?: 'client' | 'serialize' | 'rehydrate';
  }): RenderHandle;

  // Bring the DOM up to date after writes (§07-1.10). Synchronous today (C11).
  settle(): void;

  // Host hooks the suite may override per test (C15): warnIfStyleNotTrusted, assert, deprecate.
  withHost?(hooks: Partial<HostHooks>, fn: () => void): void;

  captureRenderTree?(owner: object): unknown[];   // render-tree profile (§08-13)
}

interface RenderHandle { rerender(): void; destroy(): void }
```

Everything else the suite uses is public: `setComponentTemplate`, `templateOnly`, the three
`set*Manager` functions and capabilities, `@glimmer/component`, `@glimmer/tracking`,
`@ember/reactive/collections`, `@ember/destroyable`, `@ember/owner`, `@ember/helper`,
`@ember/modifier`. A plugin hook for AST transforms is deliberately absent (§00-0.1
"Non-goals"; C9).

A **reference adapter** wraps the current implementation (seam A as the identity, seam B as
`JitRenderDelegate`). Keeping it green is how the refactors of §9.7 are checked: they must not
change what the current implementation passes.

## 9.5 Coupling catalogue

Each pattern: what the tests do, why it is not part of the specification, and the refactor.
Counts are files in the four template-relevant groups unless noted.

| ID | Pattern | Where (count) | Why not spec | Refactor |
|---|---|---|---|---|
| C1 | **Glimmer harness bypasses its delegate.** `RenderTest.set` writes the context and calls `dirtyTagFor`; `rerender` calls `result.env.begin()`/`commit()`; `destroy` uses `inTransaction`; all wrap `run()` from `@ember/runloop` | `integration-tests/lib/render-test.ts:19,419-446,629-632`; used by every Glimmer test | Tags, environment transactions and `RenderResult` are VM types (§07-2.6) | Add `delegate.set`, `delegate.rerender`, `delegate.destroy` with the current code as the default; make the test context a tracked object instead of tag-dirtied; reduce `RenderResult` to `RenderHandle` |
| C2 | **Compiling to wire format in the harness.** `precompileJSON` + `templateFactory`; registered layouts built with `templateFactory(CIRCULAR_OBJECT)`; build-time `compilerPath` | two harness `compile` helpers; `modes/jit/registry.ts`; `babel.config.mjs:41` | Wire format is informative (§00-0.2, §04) | Seam C; seam A swaps `compilerPath` |
| C3 | **Assertions on wire format or template-factory internals** (`__id`, `__meta`, `referrer`, sexp opcodes) | `@glimmer/compiler/test/compiler-test.ts` (88 tests), `integration-tests/test/precompile-test.ts`, `compiler/compile-options-test.ts` (partly), `glimmer/tests/unit/template-factory-test.js`, `runtime-resolver-cache-test.js` (5) | §04 is informative | Exclude. Move the compile-time *error* cases of `compiler-test.ts` to compile-error tests through the adapter |
| C4 | **Opcodes, program, heap, capability bitmaps** | `@glimmer/program/test`, `@glimmer/vm`-level tests, `manager/test/capabilities-test.ts` (bitmaps) (7) | Not normative (CONVENTIONS) | Exclude. No opcode-snapshot tests exist |
| C5 | **Observing tags to test reactivity.** `track(() => obj.x)` + `valueForTag`/`validateTag`; `tagForProperty`; tracked collections imported from `@glimmer/validator`; `getValue` on `invokeHelper` results | `@glimmer/validator/test` (tag tests), `@ember/-internals/metal/tests/tracked/*`, `alias_test.js`, `integration-tests/test/collections/*` (25 + about 6 in metal) | Tags and revisions are not normative (§07-2.6) | Re-express with public reactivity: `createCache`/`getValue` today, `cached`/`isValid` if §07-2 is accepted; import collections from `@ember/reactive/collections`. Raw tag tests (`validators-test`, `meta-test`) are implementation tests |
| C6 | **References built by hand.** Helpers registered as `createComputeRef` over reified args; `registerInternalHelper`; the `EmberishCurlyComponent` test manager uses references and `DirtyableTag` | `integration-tests/lib/helpers.ts`, `modes/jit/register.ts`, `components/emberish-curly.ts`; `updating-test.ts` (6 uses), `helpers/fn-test.ts` (2) (6) | References are not normative | Register helpers through `setHelperManager` (public); drop `registerInternalHelper` uses or rewrite them as plain helpers; reimplement `EmberishCurlyComponent` on the public component manager API (`componentCapabilities` with `updateHook`, `createInstance`), or render real classic components through the Ember harness |
| C7 | **Internal managers.** `setInternal*Manager`, `getInternal*Manager`, `instanceof CustomComponentManager`, `normalizeProperty`, `EnvironmentImpl` | `manager/test/managers-test.ts`, `env-test.ts`, `modifiers/on-test.ts`, `template_test.ts` (part of 29 RUNTIME-PRIV files) | §06 makes only the public manager API normative | Use the public API; assert behavior (rendering, hook calls) instead of manager identity; `env-test.ts` is an implementation test |
| C8 | **Keywords and built-ins imported from `@glimmer/runtime`/`@glimmer/manager`** (`array`, `concat`, `fn`, `get`, `hash`, `on`, `setComponentTemplate`, capabilities) | about 10 files | Public equivalents exist | Import from `@ember/helper`, `@ember/modifier`, `@ember/component`. Mechanical |
| C9 | **AST shape, plugins, traversal, printing, locations** | `@glimmer/syntax/test` (13 files, about 270 tests), `ember-template-compiler/tests/utils/transform-test-case.ts` users, `basic-usage-test.js`, `compile_options_test.js` (31) | Non-goals (§00-0.1) | Implementation tests. Keep what is normative: syntax-error messages (`syntaxErrorFor`, `parser-error-test.ts`, `invalid-html-test.ts`, `syntax/general-errors-test.ts`) through `adapter.compile`, and convert whitespace/entity tests to rendered-output assertions |
| C10 | **Build-mode gating.** `if (DEBUG)` around tests, `@glimmer/env`, `LOCAL_DEBUG`/`LOCAL_TRACE_LOGGING`; `each` sync-step sequences asserted only with `LOCAL_DEBUG` (§05-14 item 16) | 70 files | The Dev profile is normative, the debug flags are not | Gate on `adapter.build` and the Dev profile instead of `@glimmer/env`; replace `LOCAL_DEBUG` sync-step assertions with DOM node-identity assertions (`assertStableNodes`) that check the same retain/move/insert behavior |
| C11 | **Run-loop specifics.** `runTask` as "write, then synchronously flush" (1,606 call sites in 68 files); `schedule('afterRender')`, `next`, `_backburner`, `_getCurrentRunLoop` | Ember harness; 6 test files directly | §07-1.10 makes the run-loop timing normative for the Ember profile only; RFC 957 would replace it (§07-2.8) | Keep `runTask` as a harness function implemented by `adapter.settle()`. Tests that assert queue names belong to the Ember profile. New tests should `await settled()` rather than rely on a synchronous flush, so they survive an asynchronous renderer (Q4) |
| C12 | **Debug render tree.** `captureRenderTree`, `ENV._DEBUG_RENDER_TREE`, `getCapturedRenderTree()` on the JIT delegate, custom `getDebugCustomRenderTree` | `debug-render-tree-test.ts` (both harnesses; about 13 tests), 6 files toggle the flag | §08-13 specifies the tree; the toggles and internals are not | Render-tree profile through `adapter.captureRenderTree`; tests that only toggle the flag to reach other behavior should stop doing so (§05-11.3 is now flag-independent) |
| C13 | **Ember private APIs.** `meta`/`peekMeta`, view registry (`getViewId`, `getViewBounds`), `@ember/instrumentation` render events, `templateCacheCounters`, `DEPRECATIONS.*` flags | about 24 files, mostly outside the template groups | Not specified | Implementation tests, except `DEPRECATIONS.*` gating, which becomes adapter-reported feature state |
| C14 | **HTML strings and markers.** `assertHTML` compares tokens; the Ember harness's node helpers (`nthChild`, `nodesCount`, snapshots) skip empty text and comment nodes (`internal-test-helpers/lib/test-cases/abstract.ts:17-27`); `assertInnerHTML` compares strings; SSR suites compare exact marker strings | about 100 `assertInnerHTML` sites; SSR suites | The empty comment of an empty region is required (§05-1.3), but helpers that skip it cannot check it; SSR markers are specified (§05-13.1) | Prefer `assertHTML`; add direct tests of the §05-1.3 empty-region comment (W7); keep exact SSR strings in the SSR profile (Q1) |
| C15 | **Global context as the host contract.** Glimmer tests run under Ember's `@glimmer/global-context` hooks; `style-warnings-test.ts` overrides them | whole Glimmer harness | The hook set is an implementation detail, but the behaviors behind it (style warning, `toBool`, iteration, assertions) are specified | `adapter.withHost` for the few tests that override hooks; nothing else depends on the hook names |
| C16 | **Assertion plumbing.** `expectAssertion`/`expectDeprecation` stub `@ember/debug`'s functions and match messages verbatim; template-engine assertions reach them through the global context `assert` hook | about 145 sites in the Ember harness, about 70 files overall | Messages are normative [Dev]; the stubbing mechanism is not | Requirement on implementations: report every [Dev] assertion and deprecation through `@ember/debug` (`assert`, `deprecate`, `warn`). No test change |
| C17 | **Leak and teardown checks.** Container, namespace, observer, run-loop and (optional) destroyable leak checks in `moduleFor` | every Ember-harness module | Harness hygiene | Keep. They are implementation-neutral as long as the adapter destroys what it created |

## 9.6 Coverage gaps

### 9.6.1 Gaps the chapters already record

These are incorporated by reference. The owning section has the detail.

| Where | Gap |
|---|---|
| §05-14 item 16 | §05 claims without a test: `each` edge cases (other iterables, `key` `@`-paths, occurrence numbering, sync step order outside `LOCAL_DEBUG`), `in-element` edge cases, multiple yields, `has-block-params` of curried blocks, argument edge cases (§05-7.3) |
| §05-14 items 12, 13 | `createModifier` sees an element without attributes, outside the document; `yield to="inverse"`/`to="else"` and extra block params under angle-bracket invocation |
| "verified by experiment, T9b" (§05-7.4, §05-11, §06-10, §06-11) | Orderings with no upstream test: hook order across a tree of public-manager components, `didCreate` vs `installModifier`, modifier update pre-order, deferred destructor timing, modifier destruction order. `.work/T9b-orderings.md` "Upstream candidates" has the tests to write |
| §01, §03 (T9a) | Compile-path claims run through both compile paths by experiment (§01-1.11 items 1–3, §01-1.4, §01-1.5.6, §03-10 items 1 and 12–14); the rest of §01 and §03 is checked against source and compiler output only |
| §02 | More than 200 parser probes (`tools/probe-parser*.mjs`); individual "untested" notes in §02-3.3 and §02-11 |
| §03-10 | Block-param shadowing of `on` in nested positions |
| §06-12 | Owner fallback and a partly effective §01-1.8.1 rule, both untested |
| §07-4.3 | `@x` vs `this.args.x` equivalence (T3 "Unsupported claims") |
| §07-5 items 3, 11 | `getValue` after a throw; frozen `TrackedValue` with equal writes |
| §08-14 | `Class.create(ownerInjection)` path; one ordering; `{{outlet}}` inside a component (emberjs/ember.js#21640 adds the test) |
| §07-2 | The [Proposed] core is tested only by `spec/prototype/reactive/test.mjs` |

### 9.6.2 Sections without a test citation

`tools/test-coverage.py` classifies every section of the normative chapters by what it cites
(full list in `.work/T16-coverage.md`):

| Chapter | Tested | Source only | Marked untested | No citation |
|---|---|---|---|---|
| 01 authoring formats | 18 | 24 | 0 | 1 |
| 02 syntax | 20 | 21 | 0 | 8 |
| 03 static semantics | 12 | 42 | 0 | 3 |
| 05 runtime semantics | 39 | 24 | 3 | 5 |
| 06 managers | 24 | 22 | 0 | 0 |
| 07 reactivity | 24 | 39 | 0 | 6 |
| 08 Ember integration | 36 | 36 | 0 | 8 |

"Source only" means the chapter cites no test, not that none exists: authors cited source
when that was quicker. The first step for each such section is therefore a search for an
existing test (W7), and only then a new one. §03 and §07 have the largest share. For §03 the
likely outcome is that rules are tested only indirectly, through rendering; for §07 that tests
exist but observe tags (C5).

## 9.7 Work plan

Workstreams in dependency order. Each is a task with a checklist in `.work/`, following
STATUS.md's working protocol. Most of the refactors are worth upstreaming to ember.js on their
own, because they remove test dependencies on VM internals that Ember is itself changing.

| # | Workstream | Depends on | Exit criterion | Model |
|---|---|---|---|---|
| W0 | **Author decisions** §9.8 Q1–Q6 | — | Recorded in STATUS "Decisions" | Author |
| W1 | **Manifest.** Tag every test file (later every test) with its profile and class (P/R/M/I) and the spec sections it checks, seeded from `.work/T16-coupling.md`. A QUnit module-name prefix or a checked-in manifest, plus a filter so `testem` can run one profile | W0 | Every template-relevant test file is classified; `profile=core` runs only conformance tests | Sonnet |
| W2 | **Glimmer harness refactor** (C1, C2, C6): `delegate.set/rerender/destroy`; `RenderHandle`; one `compile`; helpers via the public helper manager; `EmberishCurlyComponent` on the public manager API; tracked test context | — | No `@glimmer/runtime`, `@glimmer/validator`, `@glimmer/reference`, `@glimmer/opcode-compiler` or `@glimmer/compiler` import outside `lib/modes/`; all Glimmer tests pass with `JitRenderDelegate` | Opus for the API, Sonnet for the edits |
| W3 | **Ember harness refactor** (C2, C11): `compile` through the adapter; `runTask`/`runAppend`/`rerender` through `adapter.settle`/`RenderHandle`; the renderer entry points behind one module that seam A replaces | — | All Ember-harness tests pass; one file names the renderer entry points | Opus/Sonnet |
| W4 | **Test-level refactors** (C5, C7, C8, C10, C12, C14): public imports, reactivity tests without tags, `LOCAL_DEBUG` sync steps as node-identity assertions, `DEBUG` gating via the adapter | W1 | The 47 R files and the R part of the 12 M files are P | Sonnet, one package group at a time |
| W5 | **Separate implementation tests** (C3, C4, C9, C13): mark them I in the manifest; split M files so each file is one class | W1 | No M files remain | Sonnet |
| W6 | **Build wiring** (seams A–C): an environment variable selects the implementation for vite aliasing, `compilerPath` and the delegate; a CI row per profile set; development and production builds | W2, W3 | The reference adapter passes in CI under the new variable | Opus |
| W7 | **Coverage**: (a) write the T9b upstream candidates and the §05-14 items 12, 13 and 16 tests; (b) turn the §02 probes and the T9a/§03 compiler probes into compile/render tests; (c) for each "source only" section, find an existing test and cite it, or write one; chapters in the order 07, 03, 08, 05, 01, 06, 02 | W1 (tags new tests) | `test-coverage.py` shows no "marked untested" sections and a falling "source only" count; each new test names its section | Sonnet per chapter; Opus reviews |
| W8 | **Section index**: a tool that reads the manifest and reports, per section, the conformance tests that check it; it replaces the heuristic of `test-coverage.py` | W1, W7 | Every normative section has at least one test, or an entry in the chapter's open questions explaining why not | Sonnet |
| W9 | **Second adapter**: when a new implementation exists, its adapter runs the same profiles. Failures are triaged as implementation bug, test that is really an implementation test (back to W5), or specification gap (an open question in the owning chapter) | W6 | — | — |

W2 and W3 can start now and in either order; they need no decisions. W1 needs Q1–Q3 to know
the profile list.

## 9.8 Open questions

1. **Q1. Is the SSR marker format normative?** §05-13.1 specifies it, and the SSR suites assert
   exact marker strings. The format matters only when the server and the client are different
   implementations (for example a Glimmer server with a new client during a migration). If
   both sides are always the same implementation, the SSR profile could require "rehydration
   reproduces the client render and reuses server nodes" and leave the markers to the
   implementation.
2. **Q2. Which profiles are required?** §9.2 proposes Core, Dev, Loose mode, Legacy and Ember
   integration as required, with SSR (Q1), Debug render tree and Proposed optional.
3. **Q3. Are all [Dev] messages normative verbatim?** The harness matches them verbatim
   (C16), and this specification has treated them as normative. Requiring every message
   (about 145 assertion sites) commits a new implementation to Ember's exact wording,
   including location suffixes such as `('module' @ L1:C2)`.
4. **Q4. Synchronous settling.** The harnesses assume rendering settles synchronously inside
   `runTask`/`rerender`. That is current behavior (§07-1.10), but RFC 957 would make rendering
   asynchronous (§07-2.8). Should conformance tests move to `await settled()` now (a larger W3
   and W4), or keep the synchronous form until RFC 957 decides?
5. **Q5. Where does the suite live?** In ember.js, as this chapter assumes, or extracted into
   its own package that both implementations depend on? Extraction is cleaner, but it would
   separate the tests from the code they currently guard.
6. **Q6. Classic components in the Glimmer harness.** The `Curly` and `Dynamic` component
   kinds emulate classic components with an internal manager (C6). Should they be rebuilt on
   the public manager API (portable, but an emulation of an emulation), or dropped in favor of
   the Ember harness's real classic components?
