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
approximate. The P/R/M/I classification (§9.3) was taken at upstream `675744ab35`; §9.3 item 6
has the counts after the merge of upstream `9bec1cb2a8` (T17).

**Author rulings of 2026-10-07** (commit `5740b4aeb7`, T17; the questions are in §9.8):

- SSR markers are left to the implementation; there is no interoperable marker format (Q1).
- [Dev] messages are matched verbatim, to be revisited only if a second implementation finds
  that inordinately hard (Q3).
- Tests move to `await settled()`; upstream has begun landing those refactors (Q4).
- The suite stays in this repository. The new implementation is developed here too, and a
  feature flag selects which implementation a test run uses (Q5).
- Glimmer and Ember tests that exercise fake stubs of each other, a leftover from Glimmer's
  separate repository, are flagged for elimination (Q6, §9.5 C18).

**Author rulings of 2026-10-08** (commit `eb4f794d62`, on questions that came out of W2):

- The adapter has no `renderTemplate`. Tests that need a top-level `this` render through
  `renderComponent` with a custom component manager, or are refactored to plain
  `renderComponent` (§9.4.2).
- The SSR profile serializes non-interactive, as Ember does under FastBoot: modifiers do not
  run during a server render (§9.4.2 `mode`, §05-13).

---

## 9.1 Conformance and the conformance suite

1. An implementation **conforms** to a profile (§9.2) of this specification when it passes the
   **conformance suite** for that profile, in both a development and a production build
   (§9.5, C10).
2. The conformance suite is the subset of ember.js's tests that checks behavior this
   specification makes normative, run through an **implementation adapter** (§9.4). It is not
   a separate test suite. The tests stay in ember.js, where they also keep checking the
   current implementation. The new implementation is developed in the same repository, and a
   build-time feature flag selects which implementation a test run uses, so the same files
   run against both (ruling Q5).
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
| **Dev** | Development-only assertions, deprecations, and their exact messages | **[Dev]** | Required. Messages are matched verbatim (ruling Q3; §9.5, C16) |
| **Loose mode** | Resolution of free names through the owner, `{{foo}}` vs `this.foo` | **[Loose mode]** | Required for Ember compatibility |
| **Legacy** | Classic components, `get`/`set` interop, curly invocation | **[Legacy]** | Required for Ember compatibility |
| **Ember integration** | §08: owner and resolver, built-ins (`Input`, `LinkTo`, …), outlets, routing, engines, `renderComponent`, `renderSettled`, run-loop timing (§07-1.10) | — | Required for Ember. Partly depends on the run loop (§9.5, C11) |
| **SSR** | Serialization and rehydration (§05-13). The marker format is implementation-defined (ruling Q1): tests check that the same implementation's server output, rehydrated, gives the client render's DOM and keeps the server's nodes, not marker strings | — | Optional (author ruling 2026-10-10, Q2 in part): needs stabilization before it can be a reliable part of the spec. Rehydration has no stable public API: an app selects it with the private `_renderMode` boot option, and `renderComponent` can neither serialize nor rehydrate (§05-13 item 3) |
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
6. **App-style tests (new upstream, `9bec1cb2a8`).** ember-qunit is now in the test build
   (a77fdba9b1), and `internal-test-helpers/lib/ember-dev/setup-test-helpers.js` gives each
   test its own `Application` through `setApplication`. A test can be written as an app writes
   it: `module`/`test` from `qunit`, `setupRenderingTest` from `ember-qunit`, `render` and
   `settled` from `@ember/test-helpers`, and `<template>` in a `.gjs` file. The first such file
   is `packages/@ember/-internals/glimmer/tests/integration/helpers/element-test.gjs`
   (cab58a29a1). This form uses only public API and is asynchronous, so it is the target form
   for the conformance suite (§9.4.3).

   Counts across the merge (upstream `675744ab35` → `9bec1cb2a8`, template-relevant groups):

   | Pattern | Before | After |
   |---|---|---|
   | `runTask(` call sites / files | 1,607 / 69 | 1,644 / 81 |
   | `await settled()` | 0 | 4 / 1 |
   | `renderSettled(` | 6 / 1 | 29 / 2 |
   | `moduleFor(` files | 96 | 113 |
   | files in `components/classic/` | 0 | 21 |

   `runTask` grew because Glimmer-component versions of classic tests were added in the old
   harness style (#21642, #21646, #21648), and classic-component tests moved to
   `integration/components/classic/`, which lines up with the Legacy profile. The move to
   `await settled()` (ruling Q4) has started, in `element-test.gjs` and
   `render-component-test.ts` (379a7ca59f), but it is about 1% done by call sites.

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
Converting tests to the app-style form (item 6) does both at once for the Ember harness: a
converted test no longer depends on the harness.

## 9.4 The implementation adapter

### 9.4.1 Seams

Three seams, which can be combined. Each runs the same test files against either
implementation.

- **Seam A: module aliasing (Ember harness, Ember-level tests).** Ember's tests use public API
  (`precompileTemplate`, `template()`, `setComponentTemplate`, managers, `owner.register`) plus
  a handful of renderer entry points in `@ember/-internals/glimmer` (`renderComponent`,
  `setRenderer`, `_resetRenderers`, `renderSettled`, `Component#rerender`). The new
  implementation replaces those packages and the build-time `compilerPath`. A build-time
  feature flag selects the implementation (ruling Q5): an environment variable read by
  `vite.config.mjs`, as `VITE_STABLE_DECORATORS` already is, which aliases the packages and
  picks the compiler. The tests do not change. The constraint is that `@ember/-internals/glimmer/lib/renderer.ts` imports
  deep VM paths, so it is part of what gets replaced, not a fixed point.
- **Seam B: a `RenderDelegate` for the Glimmer harness.** A new delegate class next to
  `JitRenderDelegate`, picked by `jitSuite`/`jitComponentSuite`
  (`lib/test-helpers/module.ts:19-43`), plus node, serialization and rehydration variants for
  the SSR profile. About 85 of the 86 Glimmer test files import only from the harness barrel,
  so one swap covers them, after the refactors of §9.5 C1.
  After W2 (branch `test/w2-glimmer-harness`, not yet upstream), the seam is
  `JitRenderDelegate` and its node, serialization and rehydration variants in `lib/modes/`.
  All of them render through Ember's `BaseRenderer`
  (`packages/@ember/-internals/glimmer/lib/base-renderer.ts:423`) with a real owner and
  Ember's `ResolverImpl`, and they differ only in the document and the DOM tree builder they
  pass to it. Components go through public `renderComponent`, and so does a loose template
  with a `self`: it is the layout of a component with a custom component manager whose
  context is the `self` (`lib/modes/loose-template.ts`; the ruling on top-level `this`,
  §9.4.2; `.work/W2-glimmer-harness.md` 9.3). `lib/modes/`
  deep-imports `BaseRenderer` and `ResolverImpl`, which `@ember/-internals/glimmer` does not
  export, so seam A must replace those modules too. Public `renderComponent` replaces an
  earlier render into the same element by rendering before that render's first node and
  destroying it (`replaceLastRender`, `base-renderer.ts:737-750`); the rehydration variant
  therefore renders its partial rehydrations with `BaseRenderer.render` directly.
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
  }): object;                                   // a template factory accepted by setComponentTemplate

  // An owner with register()/lookup() for the loose and legacy profiles. Destroying it
  // tears down every render made with it (C17).
  createOwner?(): object;

  // Render, as renderComponent (§08) does. The only render entry point: a test that needs a
  // top-level `this` renders a component with a custom manager (below).
  renderComponent(definition: object, options: {
    into: Element; args?: Record<string, unknown>; owner?: object;
    // SSR profile only. 'serialize' is a non-interactive render: no modifier runs (§05-13).
    mode?: 'client' | 'serialize' | 'rehydrate';
    debugRenderTree?: boolean;                     // render-tree profile
  }): RenderHandle;

  // Synchronously bring every root up to date after writes (what run()/runTask gives).
  rerender(): void;
  // Bring the DOM up to date after writes (§07-1.10); what `await settled()` waits for (C11).
  settle(): Promise<void>;

  // Host hooks the suite may override per test (C15): warnIfStyleNotTrusted, assert, deprecate.
  withHost?(hooks: Partial<HostHooks>, fn: () => void): void;

  captureRenderTree?(owner: object): unknown[];   // render-tree profile (§08-13)
}

interface RenderHandle { destroy(): void }
```

What W2 learned from running the reference adapter's Glimmer half over Ember's renderer, and
the author's rulings on it (commit `eb4f794d62`):

- **No `renderTemplate`.** No public Ember API renders a loose template with an arbitrary
  `self`: the Glimmer harness did it with an internal root type in Ember's renderer, as
  `ClassicRootState` does, and the Ember harness renders a `-top-level` classic component, so
  the two disagreed on what `this` is (`.work/W2-glimmer-harness.md` finding 6). The adapter
  therefore has only `renderComponent`. Few tests need a top-level `this`; they are refactored
  to plain `renderComponent` (the values become arguments or lexical scope), and where that
  would lose coverage they render through public API: a definition object with a custom
  component manager (`setComponentManager`, `componentCapabilities('3.13')`, a
  `createComponent` that returns the test's context object, `getContext` returning it) and the
  loose template attached with `setComponentTemplate`. `this` is then the context object.
  Unlike a root template, that template is a component's layout, so top-level `{{yield}}`,
  `has-block`, `...attributes` and the debug render tree may behave differently. On the W2
  branch none of the top-level `{{yield}}`/`has-block`/`...attributes` tests changed; what did
  change is that the wrapper component adds one block pair to serialized output and one root
  node to the debug render tree, which the harness's assertion helpers now account for in one
  place (`.work/W2-glimmer-harness.md` 9.3).
- **`mode`.** Ember has no per-render option: `_renderMode` on `-environment:main` picks the
  tree builder for the whole renderer
  (`packages/@ember/-internals/glimmer/lib/setup-registry.ts:16-32`), and interactivity is a
  separate boot option. The SSR profile follows Ember: `'serialize'` renders non-interactive, so
  modifiers do not run on the server, and `'rehydrate'` is interactive (§05-13). The Glimmer
  SSR suites had always serialized with `isInteractive: true`; their expectations that a
  modifier ran during a server render are not conformance expectations
  (`.work/W2-glimmer-harness.md` finding 7, 9.4).

- **`RenderHandle`.** Ember's `renderComponent` result has only `destroy()`. Re-rendering is
  renderer-wide, not per root: `renderer.rerender()` or any run loop revalidates every
  registered renderer whose state changed. So `rerender()` belongs to the adapter, next to
  `settle()`. `destroy()` only schedules the destructors (run-loop `actions` and `destroy`
  queues, §06-10.2); they have run after the next `rerender()` or `settle()`.
- **`compile` has no `keywords` option.** Ember fixes the strict-mode keyword set
  (`STRICT_MODE_KEYWORDS`, `packages/ember-template-compiler/lib/plugins/index.ts:52`).
  Extra keywords are a VM host hook (`lookupBuiltInHelper`,
  `packages/@ember/-internals/glimmer/lib/resolver.ts:188`) with no Ember API, so the
  Glimmer test that used it ("Non-native keyword") was an implementation test.
- **`createOwner`.** Loose-mode and legacy tests register components, helpers and modifiers by
  name, so they need an owner. The reference adapter uses `buildOwner` from
  `internal-test-helpers` and registers `-view-registry:main`, which classic components need.
  In loose mode `<FooBar>` resolves `component:foo-bar`, because Ember's compile dasherizes the
  tag (`customizeComponentName`,
  `packages/ember-template-compiler/lib/system/compile-options.ts:23`).
- **`captureRenderTree`.** Ember reads `ENV._DEBUG_RENDER_TREE` once, when a renderer's
  environment is created (`packages/@ember/-internals/glimmer/lib/environment.ts:129`), and
  `captureRenderTree(owner)` ignores the owner and captures every registered renderer
  (`packages/@ember/debug/lib/capture-render-tree.ts:24-34`). Capture must therefore be enabled
  before a test's first render (the `debugRenderTree` option, or implied by the render-tree
  profile), and earlier renderers must have been torn down.

Everything else the suite uses is public: `setComponentTemplate`, `templateOnly`, the three
`set*Manager` functions and capabilities, `@glimmer/component`, `@glimmer/tracking`,
`@ember/reactive/collections`, `@ember/destroyable`, `@ember/owner`, `@ember/helper`,
`@ember/modifier`. A plugin hook for AST transforms is deliberately absent (§00-0.1
"Non-goals"; C9).

A **reference adapter** wraps the current implementation (seam A as the identity, seam B as
`JitRenderDelegate`). Keeping it green is how the refactors of §9.7 are checked: they must not
change what the current implementation passes.

### 9.4.3 Target test form

New and converted conformance tests use the app-style form of §9.3 item 6:

```gjs
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import { tracked } from '@glimmer/tracking';

module('§05-3 content: text updates', function (hooks) {
  setupRenderingTest(hooks);

  test('a tracked write updates the text node in place', async function (assert) {
    class State { @tracked name = 'a'; }
    let state = new State();
    await render(<template><p>{{state.name}}</p></template>);
    let text = this.element.querySelector('p').firstChild;
    state.name = 'b';
    await settled();
    assert.strictEqual(this.element.querySelector('p').firstChild, text);
    assert.strictEqual(text.data, 'b');
  });
});
```

Such a test needs no adapter code at all: under the feature flag, `render`, `settled` and the
`<template>` compilation go to whichever implementation is selected. For the Ember harness,
converting a test to this form is therefore the refactor (W3). The Glimmer harness keeps its
delegate seam (seam B) for the suites that are shared across component kinds and for the SSR
modes, until those suites are converted too or retired (C18).

## 9.5 Coupling catalogue

Each pattern: what the tests do, why it is not part of the specification, and the refactor.
Counts are files in the four template-relevant groups unless noted.

| ID | Pattern | Where (count) | Why not spec | Refactor |
|---|---|---|---|---|
| C1 | **Glimmer harness bypasses its delegate.** `RenderTest.set` writes the context and calls `dirtyTagFor`; `rerender` calls `result.env.begin()`/`commit()`; `destroy` uses `inTransaction`; all wrap `run()` from `@ember/runloop` | `integration-tests/lib/render-test.ts:19,419-446,629-632`; used by every Glimmer test | Tags, environment transactions and `RenderResult` are VM types (§07-2.6) | Add `delegate.set`, `delegate.rerender`, `delegate.destroy` with the current code as the default; make the test context a tracked object instead of tag-dirtied; reduce `RenderResult` to `RenderHandle`. **W2 (done on branch `test/w2-glimmer-harness`):** the context is a `trackedObject` from `@ember/reactive/collections`, so `set` needs no delegate hook; `RenderHandle { rerender, destroy }` replaces `RenderResult`; render, rerender and destroy go through Ember's renderer inside `run()`. Remains: 18 tests mutate untracked nested objects and rely on the context dirtying on every write (`equals: () => false`); W4 rewrites them over tracked data |
| C2 | **Compiling to wire format in the harness.** `precompileJSON` + `templateFactory`; registered layouts built with `templateFactory(CIRCULAR_OBJECT)`; build-time `compilerPath` | two harness `compile` helpers; `modes/jit/registry.ts`; `babel.config.mjs:41` | Wire format is informative (§00-0.2, §04) | Seam C; seam A swaps `compilerPath`. **W2:** one `compile` in `internal-test-helpers/lib/compile.ts` serves both harnesses, and the Glimmer harness compiles with Ember's compile options; `CIRCULAR_OBJECT` and the fake registry are gone (the owner instantiates layouts). Remains: that function still calls `precompileJSON` (seam C replaces it), and `compilerPath` (seam A) |
| C3 | **Assertions on wire format or template-factory internals** (`__id`, `__meta`, `referrer`, sexp opcodes) | `@glimmer/compiler/test/compiler-test.ts` (88 tests), `integration-tests/test/precompile-test.ts`, `compiler/compile-options-test.ts` (partly), `glimmer/tests/unit/template-factory-test.js`, `runtime-resolver-cache-test.js` (5) | §04 is informative | Exclude. Move the compile-time *error* cases of `compiler-test.ts` to compile-error tests through the adapter |
| C4 | **Opcodes, program, heap, capability bitmaps** | `@glimmer/program/test`, `@glimmer/vm`-level tests, `manager/test/capabilities-test.ts` (bitmaps) (7) | Not normative (CONVENTIONS) | Exclude. No opcode-snapshot tests exist |
| C5 | **Observing tags to test reactivity.** `track(() => obj.x)` + `valueForTag`/`validateTag`; `tagForProperty`; tracked collections imported from `@glimmer/validator`; `getValue` on `invokeHelper` results | `@glimmer/validator/test` (tag tests), `@ember/-internals/metal/tests/tracked/*`, `alias_test.js`, `integration-tests/test/collections/*` (25 + about 6 in metal) | Tags and revisions are not normative (§07-2.6) | Re-express with public reactivity: `createCache`/`getValue` today, `cached`/`isValid` if §07-2 is accepted; import collections from `@ember/reactive/collections`. Raw tag tests (`validators-test`, `meta-test`) are implementation tests |
| C6 | **References built by hand.** Helpers registered as `createComputeRef` over reified args; `registerInternalHelper`; the `EmberishCurlyComponent` test manager uses references and `DirtyableTag` | `integration-tests/lib/helpers.ts`, `modes/jit/register.ts`, `components/emberish-curly.ts`; `updating-test.ts` (6 uses), `helpers/fn-test.ts` (2) (6) | References are not normative | Register helpers through `setHelperManager` (public); drop `registerInternalHelper` uses or rewrite them as plain helpers; reimplement `EmberishCurlyComponent` on the public component manager API (`componentCapabilities` with `updateHook`, `createInstance`), or render real classic components through the Ember harness. **W2:** helpers and modifiers are registered through `setHelperManager`/`setModifierManager`; `registerInternalHelper`, `createHelperRef` and `TestModifierManager` are deleted; `EmberishCurlyComponent` is deleted and its classic cases run on real classic components. Remains: only `createConstRef` for the root `self`, inside `lib/modes/` |
| C7 | **Internal managers.** `setInternal*Manager`, `getInternal*Manager`, `instanceof CustomComponentManager`, `normalizeProperty`, `EnvironmentImpl` | `manager/test/managers-test.ts`, `env-test.ts`, `modifiers/on-test.ts`, `template_test.ts` (part of 29 RUNTIME-PRIV files) | §06 makes only the public manager API normative | Use the public API; assert behavior (rendering, hook calls) instead of manager identity; `env-test.ts` is an implementation test |
| C8 | **Keywords and built-ins imported from `@glimmer/runtime`/`@glimmer/manager`** (`array`, `concat`, `fn`, `get`, `hash`, `on`, `setComponentTemplate`, capabilities) | about 10 files | Public equivalents exist | Import from `@ember/helper`, `@ember/modifier`, `@ember/component`. Mechanical |
| C9 | **AST shape, plugins, traversal, printing, locations** | `@glimmer/syntax/test` (13 files, about 270 tests), `ember-template-compiler/tests/utils/transform-test-case.ts` users, `basic-usage-test.js`, `compile_options_test.js` (31) | Non-goals (§00-0.1) | Implementation tests. Keep what is normative: syntax-error messages (`syntaxErrorFor`, `parser-error-test.ts`, `invalid-html-test.ts`, `syntax/general-errors-test.ts`) through `adapter.compile`, and convert whitespace/entity tests to rendered-output assertions |
| C10 | **Build-mode gating.** `if (DEBUG)` around tests, `@glimmer/env`, `LOCAL_DEBUG`/`LOCAL_TRACE_LOGGING`; `each` sync-step sequences asserted only with `LOCAL_DEBUG` (§05-14 item 15) | 70 files | The Dev profile is normative, the debug flags are not | Gate on `adapter.build` and the Dev profile instead of `@glimmer/env`; replace `LOCAL_DEBUG` sync-step assertions with DOM node-identity assertions (`assertStableNodes`) that check the same retain/move/insert behavior |
| C11 | **Run-loop specifics.** `runTask` as "write, then synchronously flush" (1,644 call sites in 81 files after the merge, §9.3 item 6); `schedule('afterRender')`, `next`, `_backburner`, `_getCurrentRunLoop` | Ember harness; 6 test files directly | §07-1.10 makes the run-loop timing normative for the Ember profile only; RFC 957 would replace it (§07-2.8) | Ruling Q4: move to `await settled()`. Convert tests to the app-style form (§9.4.3) rather than reimplementing `runTask`; until a file is converted, `runTask` stays a harness function. Tests that assert queue names belong to the Ember profile |
| C12 | **Debug render tree.** `captureRenderTree`, `ENV._DEBUG_RENDER_TREE`, `getCapturedRenderTree()` on the JIT delegate, custom `getDebugCustomRenderTree` | `debug-render-tree-test.ts` (both harnesses; about 13 tests), 6 files toggle the flag | §08-13 specifies the tree; the toggles and internals are not | Render-tree profile through `adapter.captureRenderTree`; tests that only toggle the flag to reach other behavior should stop doing so (§05-11.3 is now flag-independent) |
| C13 | **Ember private APIs.** `meta`/`peekMeta`, view registry (`getViewId`, `getViewBounds`), `@ember/instrumentation` render events, `templateCacheCounters`, `DEPRECATIONS.*` flags | about 24 files, mostly outside the template groups | Not specified | Implementation tests, except `DEPRECATIONS.*` gating, which becomes adapter-reported feature state |
| C14 | **HTML strings and markers.** `assertHTML` compares tokens; the Ember harness's node helpers (`nthChild`, `nodesCount`, snapshots) skip empty text and comment nodes (`internal-test-helpers/lib/test-cases/abstract.ts:18-28`); `assertInnerHTML` compares strings; SSR suites compare exact marker strings and `rehydrationStats.clearedNodes` | about 100 `assertInnerHTML` sites; SSR suites | The empty comment of an empty region is required (§05-1.3), but helpers that skip it cannot check it. SSR markers are implementation-defined (ruling Q1) | Prefer `assertHTML`; add direct tests of the §05-1.3 empty-region comment (W7). In the SSR suites, exact marker strings become implementation tests; the conformance form renders on the server, rehydrates, and compares the result with a client render and checks that server nodes were kept |
| C15 | **Global context as the host contract.** Glimmer tests run under Ember's `@glimmer/global-context` hooks; `style-warnings-test.ts` overrides them | whole Glimmer harness | The hook set is an implementation detail, but the behaviors behind it (style warning, `toBool`, iteration, assertions) are specified | `adapter.withHost` for the few tests that override hooks; nothing else depends on the hook names |
| C16 | **Assertion plumbing.** `expectAssertion`/`expectDeprecation` stub `@ember/debug`'s functions and match messages verbatim; template-engine assertions reach them through the global context `assert` hook | about 145 sites in the Ember harness, about 70 files overall | Messages are normative [Dev], verbatim (ruling Q3); the stubbing mechanism is not | Requirement on implementations: report every [Dev] assertion and deprecation through `@ember/debug` (`assert`, `deprecate`, `warn`), with Ember's exact text. No test change. App-style tests assert the same messages with `assert.rejects`/`assert.throws` |
| C17 | **Leak and teardown checks.** Container, namespace, observer, run-loop and (optional) destroyable leak checks in `moduleFor` | every Ember-harness module | Harness hygiene | Keep. They are implementation-neutral as long as the adapter destroys what it created |
| C18 | **Fake stubs of each other** (ruling Q6). Glimmer's harness fakes Ember: `EmberishCurlyComponent` and the Curly/Dynamic component kinds (about 160 fan-out tests, `ember-component-test.ts` 74, plus the SSR component suites), `BaseEnv` and hand-driven transactions (its destroy queues had no callers: destruction already ran through Ember's run loop), `TestJitRuntimeResolver`/`TestJitRegistry`, `TestModifierManager`/`registerHelper`/`createHelperRef` (about 76 sites), a fake `mut`, a fake `SafeString`, host-hook fakes in `@glimmer/*/test`. Ember's tests fake Glimmer: a `GlimmerishComponent` in each harness (about 50 files) and `PositionalComponent` (4 files). The survey listed about 15 behaviors as tested in both places; W2 found true test-for-test duplicates only for the `fn`/`hash`/`array`/`get`/`concat` helpers, `{{on}}`, and the custom modifier and helper manager suites; the other suites are complementary (`.work/W2-glimmer-harness.md`, 7.1 summary) | `.work/T17-fake-stubs.md` (table in its §4; duplicated suites in its §3) | A stub tests itself, not either implementation; both real things run in the same page | Eliminate, in the order of that file's "Recommended sequence": swap both `GlimmerishComponent`s for `@glimmer/component`; delete the fake-`mut`/`SafeString` and `owner-test.ts` cases and the `ember-component-test.ts` tests with Ember twins; port helper/modifier registration to the public managers; move the component fan-out off the fake: the Curly and Dynamic kinds stay, as `{{#x}}` and `{{component}}` invocations of a real `@glimmer/component` resolved by Ember's resolver on a real owner (they are the tests of the caller side of curly and dynamic invocation: blocks, `{{else}}`, block params), **after** porting to Ember's real classic components (`components/classic/`) every classic-specific case that has no Ember twin, so the Legacy profile loses no coverage; replace `BaseEnv`/resolver/transactions with Ember's (C1); merge duplicated suites, keeping the stronger copy. **Done on branch `test/w2-glimmer-harness` (W2):** every row of that table is done or kept with a reason; kept as implementation tests (W5): `@glimmer/reference`'s `references-test.ts` and `@glimmer/validator`'s `validators-test.ts` with their global-context overrides, and `owner-test.ts`'s internal `MountManager`. Each removed test is accounted for in `.work/W2-coverage-ledger.md` |

## 9.6 Coverage gaps

### 9.6.1 Gaps the chapters already record

These are incorporated by reference. The owning section has the detail.

| Where | Gap |
|---|---|
| §05-14 item 15 | §05 claims without a test: `each` edge cases (other iterables, `key` `@`-paths, occurrence numbering, sync step order outside `LOCAL_DEBUG`), `in-element` edge cases, multiple yields, `has-block-params` of curried blocks, argument edge cases (§05-7.3) |
| §05-14 items 11, 12 | `createModifier` sees an element without attributes, outside the document; `yield to="inverse"`/`to="else"` and extra block params under angle-bracket invocation |
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
| W0 | **Author decisions**: Q1, Q3–Q6 are ruled (2026-10-07); Q2 (required profiles) is partly ruled (SSR optional, 2026-10-10) | — | Recorded in STATUS "Decisions" | Author |
| W1 | **Manifest.** Tag every test file (later every test) with its profile and class (P/R/M/I) and the spec sections it checks, seeded from `.work/T16-coupling.md`. A QUnit module-name prefix or a checked-in manifest, plus a filter so `testem` can run one profile | W0 | Every template-relevant test file is classified; `profile=core` runs only conformance tests | Sonnet |
| W2 | **Glimmer harness: eliminate the fake stubs and refactor** (C1, C2, C6, C18): the C18 sequence first (it removes most of C6), then `delegate.set/rerender/destroy`, `RenderHandle`, one `compile`, a tracked test context. **Done** on branch `test/w2-glimmer-harness`, not yet upstreamed (`.work/W2-glimmer-harness.md`) | — | No fake Ember or Glimmer stand-ins remain (C18 table empty); no `@glimmer/runtime`, `@glimmer/validator`, `@glimmer/reference`, `@glimmer/opcode-compiler` or `@glimmer/compiler` import outside `lib/modes/`, except in files classified I by W1/W5 (W2's list: "W5 classification list" in its checklist); the Legacy profile's coverage is unchanged (every removed curly-kind case has an Ember twin); all Glimmer tests pass | Sonnet per step of the C18 sequence; Opus for the API and the coverage diff |
| W3 | **Convert the Ember harness's tests to the app-style form** (§9.4.3; C2, C11, rulings Q4/Q5): `render` + `await settled()` instead of `this.render`/`runTask`; `<template>` and `.gjs` instead of string templates; `assert.rejects` for [Dev] messages. Upstream has started (§9.3 item 6). Files that must stay on `RenderingTestCase` (loose-mode registry tests, classic `this`) keep it, with its renderer entry points behind one module that seam A replaces | — | No `runTask` in the conformance-profile files of `@ember/-internals/glimmer/tests`; every converted test passes | Sonnet, one directory per task; Opus reviews |
| W4 | **Test-level refactors** (C5, C7, C8, C10, C12, C14): public imports, reactivity tests without tags, `LOCAL_DEBUG` sync steps as node-identity assertions, `DEBUG` gating via the adapter | W1 | The 47 R files and the R part of the 12 M files are P | Sonnet, one package group at a time |
| W5 | **Separate implementation tests** (C3, C4, C9, C13): mark them I in the manifest; split M files so each file is one class | W1 | No M files remain | Sonnet |
| W6 | **Feature flag** (ruling Q5; seams A–C): one build-time flag selects the implementation for vite aliasing, `compilerPath` and the Glimmer delegate; a CI row per implementation and profile set; development and production builds | W2, W3 | The current implementation passes under both flag values' shared tests; the new one's row exists (expected to fail until W9) | Opus |
| W7 | **Coverage**: (a) write the T9b upstream candidates and the §05-14 items 11, 12 and 15 tests; (b) turn the §02 probes and the T9a/§03 compiler probes into compile/render tests; (c) for each "source only" section, find an existing test and cite it, or write one; chapters in the order 07, 03, 08, 05, 01, 06, 02 | W1 (tags new tests) | `test-coverage.py` shows no "marked untested" sections and a falling "source only" count; each new test names its section | Sonnet per chapter; Opus reviews |
| W8 | **Section index**: a tool that reads the manifest and reports, per section, the conformance tests that check it; it replaces the heuristic of `test-coverage.py` | W1, W7 | Every normative section has at least one test, or an entry in the chapter's open questions explaining why not | Sonnet |
| W9 | **Second adapter**: when a new implementation exists, its adapter runs the same profiles. Failures are triaged as implementation bug, test that is really an implementation test (back to W5), or specification gap (an open question in the owning chapter) | W6 | — | — |

W2 is done on its branch. W3 needs no decisions and can start now. W1 needs Q2 for the final
profile list, but can start with the proposal of §9.2.

## 9.8 Open questions

Q1 and Q3–Q6 were ruled by the plan's author on 2026-10-07 (commit `5740b4aeb7`). They are kept
here, with the ruling, so that the references above still resolve. Q2 is partly ruled.

1. **Q1. Is the SSR marker format normative?** *Ruled: no.* Markers are left to the
   implementation; there is no interoperable marker format. A server render and its
   rehydration are always done by the same implementation. §05-13.1 now documents the current
   markers as informative, and the SSR profile checks the rehydrated DOM and node reuse instead
   (§9.2, C14).
2. **Q2. Which profiles are required?** *Partly ruled (2026-10-10): SSR is optional* for a new
   implementation; it needs stabilization before it can be a reliable part of the spec (there is
   no stable public API for component-level serialization or rehydration, §05-13 item 3). The
   rest is open: §9.2 proposes Core, Dev, Loose mode, Legacy and Ember integration as required,
   with Debug render tree and Proposed optional.
3. **Q3. Are all [Dev] messages normative verbatim?** *Ruled: yes,* because it keeps the suite
   simple. To be revisited only if following Ember's exact wording, including location
   suffixes such as `('module' @ L1:C2)`, turns out to be inordinately hard for a second
   implementation (C16).
4. **Q4. Synchronous settling.** *Ruled: move to `await settled()`.* Upstream has begun landing
   such refactors (§9.3 item 6). The plan converts tests to the app-style form (§9.4.3, W3).
5. **Q5. Where does the suite live?** *Ruled: in this repository.* The new implementation is
   developed here too, and both are tested through a feature flag (§9.1 item 2, W6).
6. **Q6. Classic components in the Glimmer harness.** *Ruled:* Glimmer was originally written in
   a separate repository, so Ember and Glimmer each tested fake stubs of the other. Every
   remaining case is flagged for elimination in the test cleanup (C18; the survey is
   `.work/T17-fake-stubs.md`).
