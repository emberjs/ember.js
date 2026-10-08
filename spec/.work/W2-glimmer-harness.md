# W2: Glimmer harness — eliminate the fake stubs and refactor (§09-9.7 W2)

Resume from the first unticked item. Tick items (`- [x]`) with a one-line note as you go.

## Where the work lives

- **Code:** worktree `/Users/edward/hacking/ember.js-w2`, branch `test/w2-glimmer-harness`,
  created from `origin/main` at `9bec1cb2a8` (the spec's upstream base). Code commits go on
  that branch only, message form `test(glimmer-harness): <what>`. Each step is a run of commits
  that can become its own upstream PR. Do not push.
- **Status:** this file and `W2-coverage-ledger.md`, on branch `template-language-spec` in
  `/Users/edward/hacking/ember.js`. Commit them there after each item, `spec(W2): <what>`.
  Stage only your own files (`git add <path>`); the author edits `spec/` concurrently.
- `IT` = `packages/@glimmer-workspace/integration-tests`; `EG` =
  `packages/@ember/-internals/glimmer/tests/integration`. Survey with line numbers:
  `.work/T17-fake-stubs.md` (its §4 table and "Recommended sequence" drive the steps below).

## How to run tests (in the worktree)

```sh
cd /Users/edward/hacking/ember.js-w2
npx vite build --mode development --minify false        # empties and rebuilds dist/
FILTER='<module-name substring>' npx testem ci -f testem.filter.cjs --host 127.0.0.1
```

`testem.filter.cjs` at the worktree root (never commit it):

```js
const base = require('./testem.cjs');
module.exports = { ...base, test_page: `index.html?hidepassed&filter=${encodeURIComponent(process.env.FILTER)}`, reporter: 'tap', port: 13142 };
```

The full suite is `pnpm test` (after the build). Also `pnpm type-check:internals` and
`pnpm lint:eslint` on changed files before each commit.

## Rules for every step

- **No coverage loss.** Before deleting a test, find its twin (a test of the same behavior on
  the real thing) and record the pair in `W2-coverage-ledger.md`. No twin → port the test
  (to `@glimmer/component`/template-only in `IT`, or to a real classic component in `EG`
  `components/classic/`), never just delete it. This is the W2 exit criterion "the Legacy
  profile's coverage is unchanged".
- **Pass counts.** After each step, record in the notes the pass/fail/skip totals of the
  modules you touched, against the baseline (item 0.2). A drop in count must be fully explained
  by ledger entries.
- A step that turns out larger than its item: split it into sub-items here first, then work
  them one at a time.

## 0. Baseline

- [x] 0.1 Worktree and branch created; `pnpm install` done.
- [x] 0.2 Build and run the whole suite on the untouched branch. Record the totals, and per
      module the counts for every module from `IT` and `packages/@glimmer/*/test` (save the
      per-module list as `.work/W2-baseline.tsv`: module, pass, fail, skip). Note any failures
      already present on `origin/main`.

## 1. Mechanical swaps (C18 sequence step 1)

- [x] 1.1 `IT`: replace `GlimmerishComponent` (`IT/lib/components/emberish-glimmer.ts`) with
      `@glimmer/component` in every user (about 42 files); delete the file and its exports.
      Check the differences listed in T17-fake-stubs §1.2 (`isDestroying`/`isDestroyed`, owner
      argument) against tests that rely on them.
- [x] 1.2 Ember tests: replace `tests/utils/glimmerish-component.js` with `@glimmer/component`
      (7 files, about 48 uses); delete the file.
- [x] 1.3 Ember tests: import public keywords from `@ember/helper`, `@ember/modifier`,
      `@ember/component/template-only` instead of `@glimmer/runtime` (8 files, T17 §2.4).

## 2. Delete fakes that have twins (step 2)

- [x] 2.1 `IT/test/helpers/fn-test.ts` fake-`mut` tests (twins `EG/helpers/fn-test.js:195,208`). Done, see notes.
- [x] 2.2 `makeSafeString` and the `{toHTML}` literal → `htmlSafe` from `@ember/template`.
- [x] 2.3 `IT/test/owner-test.ts`: ledger each of its 6 tests against
      `EG/application/engine-test.js`, `mount-test.js`, `@glimmer/owner/test`; port any without
      a twin; delete the file and `OwnerJitRuntimeResolver`.
- [x] 2.4 `IT/test/ember-component-test.ts` (74 tests): ledger every test (twin or "port");
      delete those with twins. The residue (about 10, mostly destruction order) stays until
      step 4.

## 3. Public-manager helpers and modifiers (step 3; C6)

- [x] 3.1 Port `registerHelper` call sites to `defineSimpleHelper` (about 55 sites). Done at the harness level, see notes.
- [x] 3.2 Port `registerModifier`/`registerInternalModifier` sites to `defineSimpleModifier` or a
      class with `setModifierManager`; `modifiers-test.ts` (17) is ported, not deleted. Done, see notes.
- [x] 3.3 Rewrite the 6 `registerInternalHelper` uses in `updating-test.ts` as plain helpers
      (keep 1–2 destroyable cases as `@glimmer/destroyable` unit tests if needed). Done, none needed to be kept.
- [x] 3.4 Delete `TestModifierManager`, `createHelperRef`, `registerInternalModifier`, and
      `registerInternalHelper` if unused.

## 4. Collapse the component fan-out (step 4; the big deletion)

- [x] 4.1 Ledger every Curly/Dynamic registration of the suites (`emberish-components.ts`,
      `has-block.ts`, `has-block-params.ts`, `yield.ts`, `scope.ts`, `with-dynamic-vars.ts`,
      `debugger.ts`, SSR `ServerSideComponentSuite`, `RehydratingComponents`): Ember twin, or
      "port". Opus reviews this ledger before any deletion.
- [x] 4.2 (done, see notes) Port the "port" cases: classic-specific ones to `EG/components/classic/`, the rest to
      `@glimmer/component`/template-only, plus a curly-invocation variant through a real owner.
- [x] 4.3 (done, see notes) Port the `ember-component-test.ts` residue (step 2.4) and `input-range-test.ts`; delete
      `ember-component-test.ts`.
- [x] 4.4 (done, see notes) Collapse `componentModule` to Glimmer + TemplateOnly; delete the Curly/Dynamic kinds,
      `buildCurlyComponent`/`buildDynamicComponent`, `EmberishCurlyComponent` and its manager,
      `registerEmberishCurlyComponent`, the `ember-view` branches (`initial-render-test.ts`).

## 5. Real environment, resolver and renderer (step 5; C1, C2)

- [x] 5.1 Design (Opus): the `RenderDelegate` API additions `set`/`rerender`/`destroy`, the
      `RenderHandle` that replaces `RenderResult` in tests, the tracked test context, and how
      the delegate uses Ember's `EmberEnvironmentDelegate`, resolver/owner and renderer. Write
      it into this file as sub-items before coding. Design drafted; reviewed and approved 2026-10-08 (see "5.1 review") (see "5.1
      design" below; sub-items 5.2a–5.6 replace the old 5.2–5.5).

### 5.1 design

Paths: `IT` as above; `EGL` = `packages/@ember/-internals/glimmer/lib`; `ITH` =
`packages/internal-test-helpers/lib`. "Green" = whole suite, per-test diff against the previous
run (`cmp.py`-style, see 2.4 notes), not only the totals.

**Prototypes run for this design** (throwaway, reverted; worktree clean at `bf935f7c7a`):
P2 = jit and node delegates render through an Ember `BaseRenderer` (fake resolver kept),
templates through a root object in the renderer, components through public `renderComponent`,
`RenderTest.rerender/destroy` through the handle: **full suite 9111 / 9093 pass / 0 fail / 18
skip, identical to after 4.4.** P3 = P2 + a `buildOwner()` owner per delegate destroyed in
`afterEach`: **3 failures** (listed under 5.3a). P4 = P3 + Ember's `ResolverImpl` with
registrations on the owner: **15 failures** (the 3 + 12 listed under 5.3b). P5 = IT compile
through Ember's `compileOptions` with the fake resolver: 115 failures, about 95 of them only
because the fake resolver lacks Ember's private keyword helpers (see 5.5b).

**Facts the design rests on (checked in source):**

- `BaseEnv` is almost empty: its `scheduleWillDestroy`/`scheduleDidDestroy` queues have no
  callers (T17 §1.4 is out of date there). Destruction already runs through Ember's
  global-context `scheduleDestroy`/`scheduleDestroyed` (`EGL/environment.ts`, queues `actions`
  and `destroy`), because `@ember/-internals/glimmer` is loaded in the page. What `BaseEnv`
  still provides is `isInteractive: true`, `enableDebugTooling: false` and an
  `onTransactionCommit` that drains empty arrays. `EmberEnvironmentDelegate` is the same with
  `enableDebugTooling = ENV._DEBUG_RENDER_TREE` (read at construction) and an owner. So the
  environment swap is trivial; the real change is *who drives transactions*.
- `BaseRenderer` (`EGL/base-renderer.ts`) is the class behind both public `renderComponent`
  and the application `Renderer`. Its constructor takes `(owner, {isInteractive, hasDOM},
  document, resolver: ClassicResolver, builder: IBuilder)`: the document, the resolver and the
  tree builder are parameters. It builds the `EmberEnvironmentDelegate`, the
  `EvaluationContext` and a `RendererState` whose `renderRoot(root)` accepts any
  `RendererRoot` (`ComponentRootState` and `ClassicRootState` are the two existing ones).
  `setRenderer(owner, renderer)` (exported from `@ember/-internals/glimmer`) makes public
  `renderComponent(def, {owner})` use that renderer. `BaseRenderer` and `ResolverImpl` are not
  exported from the package index; deep imports (`@ember/-internals/glimmer/lib/base-renderer`,
  `.../lib/resolver`) build fine, as Ember's own code does for `@glimmer/*`.
- Ember's renderer **does** have serialize and rehydrate modes: the builder. The application
  path picks it from `-environment:main._renderMode` (`EGL/setup-registry.ts`, the
  `service:-dom-builder` factory; `@ember/application/tests/visit_test.js` "_renderMode:
  rehydration"). So the SSR delegates need no separate VM render path, only their own builder
  and document passed to `BaseRenderer`.
- Public `renderComponent` clears a DOM-element target on its first render
  (`replaceLastRender`, `into.innerHTML = ''`) but never clears a `Cursor` target. The
  rehydration path must therefore pass `{ element, nextSibling: null }`, or it would wipe the
  server HTML and rehydrate nothing while the "no cleared nodes" assertions still pass.
- `EntryPointTest` (`IT/lib/suites/entry-point.ts`) is exported but never registered: it has
  no row in `W2-baseline-tests.tsv`. `CompilationTests` (`lib/suites/custom-dom-helper.ts`)
  runs only under a Node `process`, so never in the browser suite.
- Classic components inject `renderer:-dom` (`views/lib/views/core_view.ts:69`), which needs
  `-view-registry:main` registered on the owner (`ITH/test-cases/rendering.ts:36` does this).
  They do not need that renderer to be the one rendering them (they use it for the view
  registry, `getElement`, `getBounds`).

**1. Environment and renderer (5.2).** Decision: **every IT render goes through an Ember
`BaseRenderer`**, one per delegate (two for the rehydration delegate: client and server). Not
`renderMain` with the real env alone.

- Components: `JitRenderDelegate.renderComponent` calls public `renderComponent` from
  `@ember/renderer` with `{ into: { element, nextSibling: null }, owner: this.owner, args }`,
  after `setRenderer(this.owner, this.renderer)`. This is exactly seam A's path (what
  `adapter.renderComponent` does in the reference adapter), so all `renderComponent`-based IT
  tests (strict mode, managers, collections, tracked-value, debug render tree; 45 files) now
  check the real entry point.
- Loose templates with a `self`: Ember has no public "render this template with this `this`".
  A new `TemplateRootState implements RendererRoot` in `IT/lib/modes/template-root.ts`, a copy
  of `ComponentRootState` that calls `renderMain(context, owner, self, builder(env, cursor),
  layout, dynamicScope?)` the way `ClassicRootState` does, added with
  `renderer.state.renderRoot(root)`. This keeps top-level-template semantics (no wrapper
  component, `this` is the test context; unlike the Ember harness's `-top-level` classic
  component) while transactions, revalidation, error-loop guard and the run-loop hooks are
  Ember's. Weighed alternative: wrap the template in a component with a custom manager whose
  context is the test context and use public `renderComponent`; rejected because it changes
  what the debug render tree, `{{yield}}`/`has-block` and `...attributes` see at the top level
  (a behavior change in many tests, for no conformance gain: `renderTemplate` is
  implementation glue in §09 anyway).
- Rerender: `run(() => renderer.rerender())`; in fact any `run()` revalidates every
  registered renderer (`loopBegin` → `scheduleOnce('render', revalidate)`), and a renderer
  re-renders only if `CURRENT_TAG` moved. P2 shows no test depends on the old unconditional
  `result.rerender()`.
- Destroy: `run(() => handle.destroy())`. The root's `destroy` runs outside an env
  transaction, as Ember's does; P2 shows the destruction-order tests unchanged.
- SSR/serialization/rehydration: `BaseRenderer` with `serializeBuilder` + the simple-dom server
  document, or `debugRehydrateTree` (`lib/modes/rehydration/builder.ts`, kept for
  `clearedNodes`) + the client document. The builder argument is a closure
  `(env, cursor) => this.getElementBuilder(env, cursor)` so `JitSerializationDelegate` and the
  rehydration delegate keep overriding it; the rehydration delegate's closure also stores the
  last `DebugRehydrateTree` to read `clearedNodes`. Partial rehydration renders components
  through public `renderComponent` into a `Cursor` (see facts). What legitimately stays
  VM-level inside `lib/modes/`: `TemplateRootState` (`renderMain`), `createConstRef` for
  `self`, the builders, `DebugRehydrateTree`, the deep imports of `BaseRenderer`/`ResolverImpl`.
- Kept as today, to change nothing in 5.x: `isInteractive: true` and `hasDOM: true` in every
  mode, including serialize (real FastBoot serializes non-interactive; noted as a §09 edit,
  not changed here); the VM's default `DynamicScopeImpl` (Finding 5).
- Debug render tree: `EmberEnvironmentDelegate` reads `ENV._DEBUG_RENDER_TREE` when the
  renderer is created. The delegate creates its renderer lazily and sets
  `ENV._DEBUG_RENDER_TREE` to its `debugRenderTree` option around the constructor (restore in
  `finally`). `getCapturedRenderTree()` becomes `captureRenderTree(owner)` from `@ember/debug`,
  which captures every registered renderer: hence the per-test `_resetRenderers()`.
- Teardown: renderers stay in the global `renderers` list while they have roots, and every
  later `run()` would revalidate them. `suite()` and `componentModule()` in
  `IT/lib/test-helpers/module.ts` get an `afterEach` that calls `delegate.teardown()`:
  `_resetRenderers()` in 5.2a; plus `run(() => destroy(owner))` from 5.3a. In
  `componentModule` the delegate is created inside `QUnit.test`, so keep it in a module-level
  variable read by a `hooks.afterEach` of the `QUnit.module(name, (hooks) => …)` callback.

**2. Owner and resolver (5.3).** Per delegate (per owner for the rehydration delegate's two
renderers) one `buildOwner()` from `internal-test-helpers` (an `ApplicationInstance`, as the
Ember harness uses), plus `owner.register('-view-registry:main', Object.create(null),
{ instantiate: false })`. `associateDestroyableChild(owner, renderer)`; `teardown()` destroys
the owner, which destroys the renderer, every root and the `Application` namespace (needed:
Ember's `moduleFor` modules assert that no `NAMESPACES` leak, so leaked IT owners would fail
later Ember tests). Resolver: `new ResolverImpl()` passed to `BaseRenderer`. Registration
methods stay on `RenderTest`/the delegate as conveniences that register on the owner:
`registerComponent(type, …, name, layout, Class)` → `setComponentTemplate(createTemplate(layout),
Class ?? templateOnlyComponent())` then `owner.register(`component:${name}`, Class)`;
`registerHelper(name, fn)` → `owner.register(`helper:${name}`, defineUserHelper(fn))`;
`registerHelperDefinition` → `owner.register(`helper:${name}`, definition)`; `registerModifier`
→ `owner.register(`modifier:${name}`, defineTestModifier(Class))`. The rehydration delegate
registers on both owners. Loose templates find names through the owner in the template meta:
`renderTemplate` instantiates its factory with the delegate's owner
(`createTemplate(src, opts)(this.owner)`), registered layouts are instantiated by
`ResolverImpl.lookupComponent` with the owner (`pair.layout(owner)`), and strict-mode
factories by the manager at render time; `CIRCULAR_OBJECT` and `templateFactory({})` go.
Keywords (`on`, `fn`, `hash`, `array`, `get`, `concat`, plus `mut`, `readonly`, `unique-id`,
`-track-array`, …) come from `ResolverImpl`'s built-in tables; the pre-registration goes.
Curly invocation through a real owner (5.6): register a classic `Component` (from
`@ember/component`) with `setComponentTemplate` under `component:foo-bar` on the delegate's
owner(s); `{{foo-bar}}`, `{{#foo-bar}}` and `{{component "foo-bar"}}` then resolve through
`ResolverImpl`; the injected `renderer:-dom` works once `-view-registry:main` is registered.
Fallback if a classic component misbehaves because its injected renderer is not the rendering
one: make the delegate use `owner.lookup('renderer:-dom')` (an Ember `Renderer`, also a
`BaseRenderer`) with `bootOptions: { document, isInteractive: true, _renderMode }` passed to
`buildOwner`, and register the debug builder as `service:-dom-builder` before the lookup.

**3. Test context and handle (5.4).**

- Context: `RenderTest.context` becomes `trackedObject({})` from `@ember/reactive/collections`;
  `set(key, value)` is `this.context[key] = value`; `dirtyTagFor` goes. Tests that assign a
  plain object to `this.context` and render it themselves (`initial-render-test.ts:42-53,
  392`, `chaos-rehydration-test.ts:187-198`) wrap it first: `let context =
  trackedObject(props)`, pass that same object to the server and client render, then
  `this.context = context` (`trackedObject` copies, so the rendered object and the written one
  must be the same proxy). `lib/test-helpers/tracked-object.ts` (`trackedObj`, built on
  `tagFor`/`dirtyTagFor`) becomes a re-export of `trackedObject`. No `delegate.set`: writing a
  public tracked object needs no implementation hook.
- `RenderHandle` (in `IT/lib/render-delegate.ts`): `{ rerender(): void; destroy(): void }`
  as in §09, both synchronous because the delegate wraps them in `run()`; `rerender` is
  renderer-wide. `RenderTest.renderResult` → `handle`. `RenderTest.rerender(props)` =
  `run(() => this.setProperties(props)); this.handle.rerender()`; `destroy()` =
  `this.handle.destroy()`. Optional impl-only hooks on the delegate, absent in a second
  adapter and skipped then: `debugBounds?(handle): { firstNode, lastNode }` and
  `isArgumentCaptureError?(value)`.
- Reach-ins and what replaces them: `lib/suites/in-element.ts:344`
  `destroy(unwrap(this.renderResult))` → `this.destroy()`; `test/updating-test.ts:1440`
  `assertInvariants` (`result.firstNode()/lastNode()`, 2 tests, 9 calls) → `this.delegate.
  debugBounds?.(this.handle)`; `test/debug-render-tree-test.ts`
  `this.delegate.getCapturedRenderTree()` (4 sites) → `captureRenderTree(owner)` inside the
  delegate's `getCapturedRenderTree()`, `this.delegate.context.env.isArgumentCaptureError`
  (`:321-322`) → `this.delegate.isArgumentCaptureError?.(…)`, `env: assign({}, BaseEnv,
  {enableDebugTooling: true})` (`:908`) → `{ debugRenderTree: true }`;
  `test/updating-test.ts:866` `this.delegate.compileTemplate('{{helo world}}')` → assert the
  throw from `this.render('{{helo world}}')` (Ember resolves at render, not at compile);
  `test/components-test.ts:591-668` `createCurriedComponent('FooBar')` (5 tests) stays a
  delegate method, reimplemented in `lib/modes` from `ResolverImpl.lookupComponent(name,
  owner)` + `curry`; the rehydration tests' `this.renderResult = this.delegate.renderClientSide
  /renderComponentClientSide(…)` just change type. `RenderDelegate` loses `getElementBuilder`,
  `getSelf` (they stay as class members in `lib/modes`) and the `env`/`resolver` options.

**4. Compile (5.5).** One function, `compile(source, options): TemplateFactory`, in
`ITH/compile.ts` (IT will already depend on `internal-test-helpers` for `buildOwner`; one
module is also what W6 aliases for seam C). Signature as the adapter's:
`{ strictMode?, scope?: () => Record<string, unknown>, moduleName?, plugins? }` (`plugins`
is impl-only, for `registerPlugin`; `keywords` dropped, see §09 edits). It calls
`precompileJSON(source, compileOptions({ …, locals: Object.keys(scope?.() ?? {}) }))` and
`templateFactory`, keeping only used locals in the scope, as both copies do now. Wrappers keep
the call sites unchanged: `ITH/compile.ts`'s old `(source, options, scopeValues)` export and
`IT/lib/compile.ts`'s `createTemplate`/`preprocess` become thin calls of it. After 5.5,
`IT/lib/compile.ts` imports neither `@glimmer/compiler` nor `@glimmer/opcode-compiler`.

**5. Import boundary** (no `@glimmer/{runtime,validator,reference,opcode-compiler,compiler}`
import in IT outside `lib/modes/`; grep of `IT/lib`, `IT/test`, `IT/index.ts` at `bf935f7c7a`):

| File | Import | Removed by |
|---|---|---|
| `lib/base-env.ts` | `EnvironmentDelegate` type | 5.2b (file deleted; `index.ts` export too) |
| `lib/render-delegate.ts` | `Reference`, `EnvironmentDelegate` types | 5.2b (`env` option), 5.4b (`getSelf`, `getElementBuilder` leave the interface) |
| `lib/render-test.ts` | `inTransaction`; `dirtyTagFor` | 5.2a; 5.4a |
| `lib/test-helpers/module.ts` | `EnvironmentDelegate` type | 5.2b (`debugRenderTree` option) |
| `lib/setup-harness.ts` | `debug.resetTrackingTransaction` | 5.2b (move the call into `lib/modes/env.ts`, call it from there) |
| `lib/suites/custom-dom-helper.ts` | `precompile` (CompilationTests, C3; Node-only); `serializeBuilder` is `@glimmer/node` | 5.2b moves `JitSerializationDelegate` to `lib/modes/node/`; `CompilationTests` is an implementation test (W5) |
| `lib/suites/entry-point.ts` | `createPrimitiveRef`, `DynamicScopeImpl` | 5.4b (delete: never registered, 0 tests) |
| `lib/suites/each.ts`, `test/updating-test.ts` | `createTag/consumeTag/dirtyTag` (hand-made tracked iterable/value) | 5.4a (a `@tracked` version counter read in the iterator / getter) |
| `lib/test-helpers/tracked-object.ts` | `consumeTag/dirtyTagFor/tagFor` | 5.4a |
| `lib/test-helpers/define.ts`, `lib/components/types.ts` | `templateOnlyComponent`, `TemplateOnlyComponent` type | 5.3c (`@ember/component/template-only`) |
| `lib/compile.ts` | `precompileJSON`, `templateFactory` | 5.5a |
| `test/strict-mode-test.ts`, `test/modifiers/on-test.ts` | `array, concat, fn, get, hash, on` | 5.3c (`@ember/helper`, `@ember/modifier`; C8) |
| `test/collections/*-test.ts` (6) | `tracked{Array,Map,Object,Set,WeakMap,WeakSet}` | 5.4a (`@ember/reactive/collections`; C5) |
| `test/debug-render-tree-test.ts` | `templateOnlyComponent`, `TemplateOnlyComponent`; `EMPTY_ARGS`, `TemplateOnlyComponentManager` | 5.3c for the first two; the other two serve the 2 `getDebugCustomRenderTree` tests (internal manager API, C7): implementation, W5 split |
| `lib/suites/debugger.ts` | `setDebuggerCallback/resetDebuggerCallback` | implementation (VM debug hook, no Ember API); W5 |
| `test/owner-test.ts` | `Reference`, `NULL_REFERENCE` (fake internal `MountManager`) | implementation (internal manager API, C7); W5 |
| `test/env-test.ts` | `EnvironmentImpl` | implementation (C7); W5 |
| `test/attributes-test.ts` | `normalizeProperty` | implementation (C7); W5 |
| `test/precompile-test.ts`, `test/compiler/compile-options-test.ts` | `precompile`, `templateFactory`, opcode-compiler types | implementation (C3); W5 |
| `test/tracked-value-test.ts` | `trackedValue` | no public export (`@ember/reactive` is empty): [Proposed] §07-2 core or implementation; W1 decides |

So after 5.x, the remaining offenders are all W5 implementation tests; 8.1 needs either the
§09 edit below or W5 to have moved them.

**6. Order and risk.** Sub-items below, each one commit (or a small run), each green with
**zero count change** unless stated. The riskiest point is not `BaseEnv`'s queues (dead code)
but **destruction at teardown** (5.3a): destroying the owner after each test runs component and
modifier destructors after the test body, where an `assert.step`/`assert.ok` in a destructor
counts against `assert.expect` or leaves unverified steps (P3: exactly 2 such tests), and a
root whose DOM the test already removed fails in `clear` (P3: 1 test). Second risk: the
render loop auto-flushes (a tracked write after the `render` queue starts another run loop);
P2 found no test that observed stale DOM. Third: 5.5b changes compile semantics. How to
detect: per-test diff against the previous full run (missing/new/failed by name); grep the
TAP for `Expected assert.verifySteps`, `Expected N assertions`, `afterEach failed`,
`NAMESPACES`; run the whole suite, not a filter (leaks show up in later Ember modules).

**7. Proposed §09 edits** (for 8.4; not applied):

1. §9.4.2 `RenderHandle`: Ember's `renderComponent` result has only `destroy()`; re-rendering
   is renderer-wide (`renderer.rerender()`/any run loop), not per root. Proposal: `RenderHandle
   { destroy(): void }`, and an adapter-level synchronous `rerender(): void` (flush every root;
   what `run()`/`runTask` gives) next to async `settle()`. State that `destroy()` only
   schedules destructors (run-loop `actions`/`destroy` queues) and they have run after
   `rerender()`/`settle()`.
2. §9.4.2 `renderTemplate`: no public Ember API renders a loose template with an arbitrary
   `self`. The reference adapter does it with an internal root type in Ember's renderer (like
   `ClassicRootState`); the Ember harness instead renders a `-top-level` classic component, so
   `this` differs between the two harnesses. Say so, and say which one the Legacy profile means.
3. §9.4.2 `mode`: Ember's serialize/rehydrate modes are the renderer's tree builder
   (`_renderMode`, `service:-dom-builder`), not a `renderComponent` option. Also decide
   `isInteractive` for `serialize`: FastBoot is non-interactive; the Glimmer SSR suites have
   always serialized interactive (modifiers run on the server).
4. §9.4.2 `compile` `keywords`: Ember fixes it (`STRICT_MODE_KEYWORDS`); extra keywords are a
   VM host hook (`ClassicResolver.lookupBuiltInHelper`) with no Ember API. Drop it; the IT test
   "Non-native keyword" is an implementation test.
5. §9.4.2: loose/legacy profiles need an owner with `register()`; add `createOwner()` to the
   adapter (reference: `buildOwner` + `-view-registry:main`) and say that destroying it tears
   down every render made with it (C17 teardown contract). Also note that `<FooBar>` resolves
   `component:foo-bar` because Ember's compile dasherizes (`customizeComponentName`).
6. §9.4.2 `captureRenderTree`: Ember needs `ENV._DEBUG_RENDER_TREE` set before the renderer is
   created, and `captureRenderTree(owner)` ignores the owner and captures every registered
   renderer. The adapter needs a way to enable capture per test (an option on `render*`, or
   the render-tree profile implies it).
7. §9.4.1 seam B: after W2 the seam is `JitRenderDelegate` and its node/serialization/
   rehydration variants over Ember's `BaseRenderer`; they differ only in document and builder.
   Its `lib/modes` code deep-imports `BaseRenderer` and `ResolverImpl` (not exported), which
   seam A must also replace.
8. §9.7 W2 exit criterion: "no … import outside `lib/modes/`" should exempt files classified
   I by W1/W5 (list in item 5 above), or W2 cannot meet it without doing W5's split.
9. T17 §1.4 is wrong that `BaseEnv` drains real destroy queues: they had no callers (fix the
   C18 row's wording).

### 5.1 review (Opus, 2026-10-08)

Approved as written. Decisions:
- Client rendering through Ember's `BaseRenderer` + public `renderComponent` (seam A path) is
  accepted; the loose-template root stays inside `lib/modes/`.
- 5.3b may drop `strict-mode-test.ts` › "Non-native keyword" as an implementation test (compiler
  `keywords` option + `$keyword.` resolver lookup; no Ember API). Ledger it as
  `kept → implementation test (W5)` if it can stay in a W5-classified file, else `drop
  (implementation)`. The 8 `hash` overrides are ledgered as `drop (fake-only)` (Ember refuses
  to override a built-in helper).
- Proposed §09 edit 8 (exempt W1/W5 implementation-test files from the import-boundary exit
  criterion) is adopted for 8.1: list each exempt file with its reason in the 8.1 note. Edits
  1, 4–7 and 9 are applied at 8.4. Edits 2 and 3 need the author: added as findings 6 and 7.

### 5.2–5.6 sub-items

Dependencies: add each newly imported package to IT's `package.json` (and the matching
`pnpm-lock.yaml` link lines, as in 2.2) — expected: `@ember/renderer`, `@ember/debug`,
`@ember/-internals`, `internal-test-helpers`, `@ember/reactive`, `@ember/helper`,
`@ember/modifier`, `@ember/component`, `ember-template-compiler`. Check `vite build`,
`type-check:internals`, prettier, eslint each time.

- [x] 5.2a (done, see notes) Jit + node delegates on Ember's renderer (P2). In `lib/modes/`: new
      `template-root.ts` (`TemplateRootState`, see design 1); `JitRenderDelegate` gets
      `owner = {}` (real owner in 5.3a) and a lazy `renderer` = `new BaseRenderer(owner,
      {isInteractive: true, hasDOM: true}, doc, new JitCompileTimeLookup(this.resolver),
      (env, cursor) => this.getElementBuilder(env, cursor))` with `ENV._DEBUG_RENDER_TREE` set
      from `options.env?.enableDebugTooling` around construction, then `setRenderer`; `context`
      = `renderer.state.context`; `renderTemplate` → `TemplateRootState`; `renderComponent` →
      public `renderComponent` into a `Cursor` (drop the `dynamicScope` parameter: its only
      caller is the unregistered `EntryPointTest`); both return a `RenderHandle` (add the type
      to `lib/render-delegate.ts`; `updating-test` `assertInvariants` keeps working through a
      `debugBounds` on the handle until 5.4b). `RenderTest.rerender/destroy` use the handle;
      `inTransaction` leaves `render-test.ts`. The rehydration delegate keeps its VM path for
      now but returns a handle from a `legacyHandle(result, env)` helper in
      `lib/modes/rehydration/` (the old `begin/commit` and `inTransaction` code, moved). Add
      `teardown()` (`_resetRenderers()`) and the `afterEach` hooks in `module.ts`. Expected:
      9111 / 9093 / 0 / 18, no per-test change.
- [x] 5.2b (done, see notes) Rehydration delegates on Ember's renderer; delete `BaseEnv`. Client `BaseRenderer`
      (client doc, `debugRehydrateTree` builder that records the last tree for
      `rehydrationStats`) and server `BaseRenderer` (server doc, `serializeBuilder`), separate
      `{}` owners; `renderServerSide`/`renderClientSide` through `TemplateRootState`, partial
      rehydration through public `renderComponent` with a `Cursor` (never an element: it would
      be cleared). Delete `legacyHandle`, `JitDelegateContext`, `lib/base-env.ts` and its
      `index.ts` export; `RenderDelegateOptions.env` → `debugRenderTree?: boolean`
      (debug-render-tree suite passes `{ debugRenderTree: true }`; `module.ts` option type
      follows). Move `JitSerializationDelegate` to `lib/modes/node/` and
      `debug.resetTrackingTransaction` into `lib/modes/env.ts`. Expected: zero change; watch
      `rehydration ::` and `Rehydration` modules and `clearedNodes` assertions.
- [x] 5.3a (done, see notes) Real owner + teardown destroy (the risky step). `buildOwner()` per delegate (two in
      the rehydration delegate) + `-view-registry:main`; `associateDestroyableChild(owner,
      renderer)`; `teardown()` = `run(() => destroy(owner)); _resetRenderers()`. Fake resolver
      still in use. Fix the 3 P3 failures without weakening them: `initial render (client):
      Void Elements` (`RenderTest.shouldBeVoid` renders one template per void tag into one element with
      `clearElement` between them; destroy each previous handle in `run()` instead of
      clearing), `Basic Custom Modifier Manager: 3.22: custom lifecycle hooks` and `… can give
      consistent access to underlying DOM element` (`test/managers/modifier-manager-test.ts`;
      destructors assert: end the tests with `this.destroy()` and verify the
      `willDestroyElement` step / raise `assert.expect` by the one destructor assertion). Note
      each adjusted test in the notes (not a ledger row: nothing removed). Expected: zero count
      change.
- [x] 5.3b (done, see notes) Ember's resolver and owner registrations (P4); registration follows the phase: both owners until the server render, then client only. `new ResolverImpl()` replaces
      `JitCompileTimeLookup(this.resolver)`; `registerComponent/Helper/HelperDefinition/
      Modifier` register on the owner(s) (design 2; names as they are, dasherized in 5.5b);
      `renderTemplate` and the rehydration renders instantiate templates with the owner;
      partial rehydration finds components with `owner.factoryFor('component:' + name).class`.
      Delete `registry.ts`, `resolver.ts`, `compilation-context.ts`, `CIRCULAR_OBJECT`, the
      keyword pre-registration, `RenderDelegateOptions.resolver`. Fix the 12 P4 failures: the 8
      `registerHelper('hash', …)` overrides (`lib/suites/components.ts:92,109,130,282`,
      `test/components-test.ts:217,233,249,266`; Ember asserts on overriding a built-in):
      delete the override, the real `hash` is what the tests mean; debug-render-tree
      `registerCustomComponent` (2 `getDebugCustomRenderTree` tests):
      `setInternalComponentManager(new Manager(), ComponentClass)` then `owner.register`;
      `Updating: missing helper`: through `render` (design 3); `strict mode: general
      properties: Non-native keyword`: no Ember equivalent (§09 edit 4) — ledger row "drop
      (implementation: host keyword hook)", Opus confirms before deleting (count −1, the only
      planned drop in step 5). `createCurriedComponent` on the owner (design 3). Expected:
      9110 / 9092 / 0 / 18.
- [x] 5.3c (done, see notes) Public imports (C8): `templateOnlyComponent`/`TemplateOnlyComponent` from
      `@ember/component/template-only` in `lib/test-helpers/define.ts`, `lib/components/
      types.ts`, `test/debug-render-tree-test.ts`; `array, concat, fn, get, hash` from
      `@ember/helper` and `on` from `@ember/modifier` in `test/strict-mode-test.ts`,
      `test/modifiers/on-test.ts`. Zero change.
- [x] 5.4a (done, see notes) Tracked context (design 3): `trackedObject` context, `set` without `dirtyTagFor`,
      the plain-context overrides in `initial-render-test.ts`/`chaos-rehydration-test.ts`
      wrapped, `trackedObj` → `trackedObject`, collections tests from
      `@ember/reactive/collections`, the hand-made tags in `lib/suites/each.ts` and
      `test/updating-test.ts:473-518` → `@tracked` counters. Zero change; watch `#each`,
      `Updating`, `log` (`{{log this}}` now logs the proxy, which is still `this.context`).
- [x] 5.4b (done, see notes) Handle cleanup (design 3): `renderResult` → `handle`; the reach-ins listed there;
      `debugBounds?`/`isArgumentCaptureError?` as optional delegate hooks; `captureRenderTree`
      in `getCapturedRenderTree`; `getSelf`/`getElementBuilder` out of the `RenderDelegate`
      interface; delete `lib/suites/entry-point.ts` and its `lib/suites.ts` export (never
      registered; ledger note, 0 tests). Then grep: no `RenderResult`, `Reference`,
      `EnvironmentDelegate` outside `lib/modes/`. Zero change.
- [x] 5.5a (done, see notes) One compile (design 4) in `ITH/compile.ts`, both harnesses through it; IT passes
      an internal `glimmerOnly: true` flag that skips `compileOptions()` so its output is
      unchanged. Zero change (Ember harness: about 1,600 `this.render` sites, no test change).
- [x] 5.5b (done, code `0f5d5afdbe`; see "5.5b triage" and notes) IT compiles with Ember's `compileOptions` (drop `glimmerOnly`); `registerComponent`
      registers `component:${dasherize(name)}` (Ember's `customizeComponentName` dasherizes
      `<FooBar>`). From P5, after 5.3b, expect about 20 real differences to triage one by one:
      `{{in-element}}` with a non-null `insertBefore` (Ember asserts "Can only pass null to
      insertBefore"; 3 tests in `lib/suites/in-element.ts`/rehydration), capitalized named
      arguments `@Foo`/`@Bar` reserved in Ember (2), debug-render-tree names for registered
      components, anything from `transform-each-in-into-each`/`-track-array`. For each: if the
      Ember behavior is the specified one, change the expectation (e.g. `assert.throws` with
      the Ember message) and add a Finding; if it is a Glimmer-only capability, ledger it
      (implementation) for Opus review. Count change only by ledger rows.
- [x] 5.6 (done, see notes) Restore the rehydration ports deferred from 4.2 (ledger rows "deferred to 5.6": the
      `RehydratingComponents` multiple/mismatched invocations with a real classic Component, and
      the `{{component}}` dynamic-form rehydration), now that curly invocation through a real
      owner exists. Until this item is done those behaviors are untested on the branch.
      How (design 2): in the rehydration delegate, a `registerClassicComponent(name, layout,
      Class = Component)` (registration follows the phase like the other `register*` methods: both owners until the server render, then client only; see 5.3b) that does `setComponentTemplate` + `owner.register('component:' +
      name, Class)` (on both owners until the server render, then on the client owner only); the 4 deferred tests invoke `{{foo-bar}}`/`{{#foo-bar}}`/
      `{{component "foo-bar"}}`. If the injected `renderer:-dom` breaks them, use the fallback
      in design 2. Count +4 (or as the ledger rows say).

### 5.5b triage

Run `full55b` (after code `89429e7685`, since amended into `0f5d5afdbe`; decisions applied, see the 5.5b note): 9110 total / 9073 pass / 19 fail / 18 skip. Against
`full55a` (9110 / 9092 / 0 / 18): 0 missing, 0 new, exactly 19 pass -> fail, nothing else
changed. The 19 tests are left failing in the worktree; the code commit says "WIP: 19 known
failures". None is class (a): the harness plumbing is finished. Governing rules are in
`03-static-semantics.md` §03-7.4, §03-7.9, §03-5.6 and `08-ember-integration.md` §2.17, §13.

| # | Test (all `[integration] jit` unless noted) | Failure | Cause | Class and proposal |
|---|---|---|---|---|
| 1-7 | `Application test: debug render tree`: `template-only components`, `glimmerish components`, `glimmerish components with an argument that throws`, `in-element in tree`, `modifiers`, `getDebugCustomRenderTree works`, `empty getDebugCustomRenderTree works` | `actual: hello-world expected: HelloWorld` (`hello-world2`/`HelloWorld2`, `hi-world`/`HiWorld` in the same trees) | The components are registered with `registerComponent(..., 'HelloWorld', ...)` and invoked as `<HelloWorld />` through the resolver. Ember's compile dasherizes the tag (`customizeComponentName`, §03-5.6) and the node name is the resolved name `hello-world`. The plain-Glimmer harness used the tag text. Components bound in strict-mode scope (`defComponent`, first 3 tests of the file) keep the local name and pass. | (b). Rewrite the expected `name` to the dasherized form (`hello-world`, `hello-world2`, `hi-world`). Real Ember: the EG twin `application/debug-render-tree-test.ts:797-829` pins `component:hello-world` / `name: 'hello-world'`; §08-13 says the name is the factory `fullName`/debug name. Only the name strings change. |
| 8 | `#in-element: With insertBefore` | `Assertion Failed: Can only pass null to insertBefore in in-element, received: {"type":"PathExpression",...}` at compile | `transform-in-element` (§03-7.9) rejects any `insertBefore` that is not the literal `null`/`undefined`. The VM supports inserting before a node. | (c). The test is about the VM's `InElement` insertBefore, which Ember's template language does not expose. Move to a W5-classified file compiled with plain Glimmer options. Add one (b) test: `assert.throws(() => this.render('{{#in-element this.el insertBefore=this.x}}x{{/in-element}}', ...), /Can only pass null to insertBefore in in-element, received: \{"type":"PathExpression"/)`, plus a passing `insertBefore=null` variant (already covered by `With pre-existing content`). |
| 9-10 | `rehydration :: rehydration: in-element with insertBefore=element can rehydrate` and `... can rehydrate into pre-existing content` | Same compile-time assertion | Same as 8: the two tests render `insertBefore=this.prefix` (a node) on the server and rehydrate it. | (c). VM serialization/rehydration of an in-element with an insertBefore node; Ember cannot express it. Keep with plain Glimmer options in a W5 file. Real Ember rehydrates `in-element` only without `insertBefore` (the null case is already covered by the other `in-element` rehydration tests). |
| 11 | `#in-element: Changing to falsey` | `Assertion Failed: You cannot pass a null or undefined destination element to in-element` at render | Ember wraps the destination in `(-in-el-null x)` in non-production compiles (§03-7.9, §08-2.17). The VM treats a null destination as "render nothing" and tears the content down; the test renders `second: null` and later rerenders `first: null`. | (b) for the dev behavior, (c) for the VM behavior. Real Ember (dev): the render throws the assertion above for `second: null`; for a later `rerender({ first: null })` the revalidation throws the same. Proposal: replace this test by `assert.throws` on initial render with a null destination and on rerender to null; keep the original (null = render nothing) as a VM test with plain options in a W5 file (Ember production builds compile with `isProduction`, which skips the check; §01 `isProduction`, so the original behavior is real in production). Opus to decide whether the Legacy profile wants the production variant too. |
| 12 | `#in-element: With pre-existing content` | Same assertion | Uses `insertBefore=null` (fine) but `rerender({ externalElement: null })` makes the destination null. | (b)/(c) as 11. Smallest rewrite: drop the `externalElement: null` step and the re-add step, move them into the (c) copy. |
| 13 | `Updating: helpers passed as arguments to {{#in-element}} are not torn down when switching between blocks` | Same assertion | `testStatefulHelper` switches `{{#in-element (stateful-foo)}}` between an element and `null`. | (b) rewrite, (d) on exact shape: switch between two elements instead of `null`, which keeps the "helper in the destination position is not recreated" check; Opus to confirm the helper does not get torn down when the destination swaps between elements (the `{{#if}}`/`{{component}}` siblings of this test switch blocks, not destinations). |
| 14-16 | `strict mode: general properties: {{component}} throws an error if a string is used indirectly in strict after first render` (append, block and expression position) | `Assertion Failed: '@Bar' is reserved.` at compile | `assert-reserved-named-arguments` (§03-7.4): `@Bar` matches `/^@[^a-z]/`, so capitalized named arguments are reserved in Ember. The test passes `{ Bar }` as component arguments (`defineComponent({}, '{{component @Bar}}')`). | (b). Rename the argument to lowercase (`@bar`, `args.bar`); nothing else in the test depends on the capital. Real Ember: `'@Bar' is reserved.` (also pinned by `ember-template-compiler/tests/plugins/assert-reserved-named-arguments-test.js`, so no new test needed). |
| 17-18 | `strict mode: dynamic template values: Can use a dynamic component with a changing definition` (append position; append position, with args) | `Assertion Failed: '@Foo' is reserved.` | Same as 14-16 (`{{@Foo}}`, `{{@Foo value="world"}}`, args `{ Foo }`). | (b). Rename to `@foo`. The sibling tests with block/expression positions of the same name already pass because they do not use `@Foo`. |
| 19 | `` `modifier` keyword syntax errors: non-append keywords cannot be used as appends `` | `Assertion Failed: The modifier keyword requires at least one positional arguments ('test-module' @ L1:C0)` instead of the Glimmer message ``The `modifier` keyword was used incorrectly. It was used as an append statement...`` | Ember's `transform-resolutions` (§03-7.x, "No first positional") runs before Glimmer's keyword validation and asserts for `{{modifier}}` with no argument. Only `modifier` hits it (`helper` and the others fall through to the VM message). | (b). Real Ember gives the transform-resolutions assertion for a bare `{{modifier}}`. Proposal: in this test, for `keyword === 'modifier'` expect the Ember message (`/The modifier keyword requires at least one positional arguments/`); the other keywords keep the Glimmer message, which Ember passes through unchanged. |

Summary by class: (a) 0; (b) 14-19 (6 tests: reserved `@Foo`/`@Bar` x5, `modifier` keyword) plus
1-7 (7 debug-render-tree names), plus the (b)/(c) split in 11-12 and the (d)-ish rewrite in 13;
(c) 8-10 and the VM halves of 11-12; (d) 13 (what exactly to rewrite).

Plumbing done in phase 1 that a reviewer may want to see, because it touched test inputs without
changing what they check: (1) string component names in templates were dasherized
(`{{component "Foo"}}` -> `{{component "foo"}}`, ~35 sites in `lib/suites/{components,has-block,
has-block-params,in-element}.ts`, `test/components-test.ts`, `test/strict-mode-test.ts`, plus the
data values `name: 'Foo'`, `something: 'FooBar'`, `truthyValue: 'XYasss'` -> `'xyasss'`; Ember's
resolver does not dasherize a string given to `{{component}}`, so the harness registers
`component:foo` and the template names it that way); (2) `createCurriedComponent(name)`
dasherizes before the lookup; (3) `createTemplate` maps `meta.moduleName`/`plugins.ast`/`locals`
(locals become scope names), and drops `keywords` (no test uses it any more since "Non-native
keyword" went in 5.3b).

## 6. Remaining stubs (step 6)

- [x] 6.1 (done, see notes) `style-warnings-test.ts` → Ember harness with `expectWarning`.
- [x] 6.2 (done, see notes) `PositionalComponent` users → real classic components with `positionalParams`; delete
      `tests/utils/positional-component.js`.
      Then re-check every ledger row whose twin runs on `PositionalComponent` (grep the ledger
      for the twin files; e.g. `curly-components-test.js:861`): the twin must now be a real
      classic Component.
- [x] 6.3 (done, see notes) `@glimmer/reference/test/iterable-test.ts` → Ember's `toIterator`; mark
      `references-test`/`validators-test` as implementation tests (W1/W5), not conformance.

## 7. Merge duplicated suites (step 7)

- [ ] 7.1 For each row of T17-fake-stubs §3, diff the two copies test by test (assertions, not
      names), move unique cases into the stronger copy, delete the weaker duplicates; ledger every
      deletion/move (`7.1x` rows). Split into the sub-items below (one commit each, full suite and
      per-test diff after each). Rows of §3 already handled: classic/curly components (step 2.4/4.x),
      has-block/has-block-params/yield (4.x), debug render tree (5.5b, 4.4), owner (2.3), style
      warning (6.1), SSR (no twin). Pure-registry parts of `@glimmer/manager/test/managers-test.ts`
      stay and go on the W5 list.
  - [x] 7.1a (done, code `a135f9b3b0`; 2 deleted, 25 kept, see notes) `{{#each}}`: `IT/lib/suites/each.ts` vs `EG/syntax/each-test.js`, `classic/each-test.js` (complementary: keep both, delete exact duplicates).
  - [x] 7.1b (done, code `9a486d218e`; 3 deleted, 7 kept) `{{in-element}}`: `IT/lib/suites/in-element.ts` vs `EG/syntax/public-in-element-test.js`.
  - [x] 7.1c (done, code `c7f204af33`; 53 IT tests: 45 deleted (twin), 8 moved) `fn`/`hash`/`array`/`get`/`concat`: `IT/test/helpers/*.ts` vs `EG/helpers/*.js`.
  - [x] 7.1d (done, code `d669d705fe`; 19 IT tests: 9 deleted (twin), 10 moved; `on-runtime-test.ts` kept) `on`: `IT/test/modifiers/on-test.ts`, `keywords/on-runtime-test.ts` vs `EG/modifiers/on-test.js`.
  - [x] 7.1e (done, code `68fcd3260a`; 15 deleted (twin), 2 moved, 14 kept) custom modifier manager: `IT/test/managers/modifier-manager-test.ts`, `modifiers-test.ts`, `updating-modifiers-test.ts` vs `EG/custom-modifier-manager-test.js`.
  - [x] 7.1f (done, code `8f427a1ed0`; 14 deleted (twin), 9 kept) custom helper manager: `IT/test/managers/helper-manager-test.ts` vs `EG/helpers/helper-manager-test.js`, `custom-helper-test.js`, `invoke-helper-test.js`.
  - [x] 7.1g (done, no code change; nothing deleted or moved; file added to the W5 list) custom component manager: `@glimmer/manager/test/managers-test.ts` vs `EG/custom-component-manager-test.js` (registry-only parts stay, W5 list).
  - [x] 7.1h (done, code `51887e1701`; 8 IT tests deleted (twin), 86 kept) strict mode and lexical scope: `IT/test/strict-mode-test.ts`, `lexical-scope-test.ts` vs `EG/components/strict-mode-test.js`, `runtime-template-compiler-*.ts`.
  - [ ] 7.1i `if`/`unless`: `IT/test/syntax/if-unless-test.ts` vs `EG/syntax/if-unless-test.js`, `helpers/if-unless-test.js`, `shared-conditional-tests.js`.
  - [ ] 7.1j tracked/collections: `IT/test/tracked-value-test.ts`, `collections/*` vs `EG/helpers/tracked-test.js`, `components/tracked-test.js`, `@ember/-internals/metal/tests/tracked/*`.
  - [ ] 7.1k run-loop settle: `IT/test/render-test.ts` vs `EG/render-settled-test.js`.

  Progress note (7.1): 7.1a-7.1h done (worktree `a135f9b3b0`, `9a486d218e`, `c7f204af33`, `d669d705fe`, `68fcd3260a`, `8f427a1ed0`, 7.1g no code, `51887e1701`). Next: 7.1i (`if`/`unless`). Last full run `full71h`
  (9013 / 8995 / 0 / 18) in the session scratchpad is the baseline for the next per-test diff (`run.sh NEW PREV` builds, runs and diffs; `post.sh` is the diff and greps). Ledger rows go in the `7.1 rows` section.

## 8. Exit check (Opus)

- [ ] 8.1 No `@glimmer/runtime`, `@glimmer/validator`, `@glimmer/reference`,
      `@glimmer/opcode-compiler` or `@glimmer/compiler` import in `IT` outside `lib/modes/`.
- [ ] 8.2 C18 table empty: every row of T17-fake-stubs §4 is done or explicitly kept (with why).
- [ ] 8.3 Coverage diff: the ledger accounts for every removed test; whole suite green;
      counts compared with the baseline.
- [ ] 8.4 Update §09 (C1, C2, C6, C18 rows; §9.7 W2 state) and STATUS.

### W5 classification list

Files W2 leaves as implementation tests (not conformance): W5 moves them out of the conformance suite
and 8.1 exempts them from the import boundary (5.1 review decision 3). Keep adding to this list.

- `packages/@glimmer/reference/test/references-test.ts`: references and tags are the reactive core's internals, not normative; it also installs a fake global context (`getProp`/`setProp`) for its own cases.
- `packages/@glimmer/validator/test/validators-test.ts`: tag and validator internals, not normative; one case overrides `scheduleRevalidate` through `testOverrideGlobalContext`.
- `IT/lib/suites/debugger.ts`: the VM's `setDebuggerCallback`/`resetDebuggerCallback` debug hook, no Ember API (5.1 table).
- `IT/lib/suites/custom-dom-helper.ts` (`CompilationTests`): `precompile` plus `serializeBuilder`, Node-only (C3) (5.1 table).
- `IT/test/tracked-value-test.ts`: `trackedValue` has no public export; W1 decides whether it is core or implementation (5.1 table).
- `IT/test/attributes-test.ts`: `normalizeProperty`, a VM-internal DOM helper (C7) (5.1 table, 5.4b).
- `IT/test/owner-test.ts`: a fake internal `MountManager` (`Reference`, `NULL_REFERENCE`), internal manager API (C7) (5.1 table, 2.3).
- `IT/test/env-test.ts`: `EnvironmentImpl` (C7) (5.1 table).
- `IT/test/debug-render-tree-test.ts`, the 2 `getDebugCustomRenderTree` tests only: `EMPTY_ARGS` and `TemplateOnlyComponentManager`, internal manager API (C7); the rest of the file is conformance (5.1 table, 5.3c).
- `IT/test/precompile-test.ts`, `IT/test/compiler/compile-options-test.ts`: `precompile`, `templateFactory`, opcode-compiler types (C3) (5.1 table).
- `IT/test/vm/in-element-vm-test.ts` (5 tests, `jit` and `rehydration (plain Glimmer compile)`): the VM's `{{#in-element}}` with a null destination or a non-null `insertBefore`, compiled with plain Glimmer options; Ember's template language rejects both (5.5b).
- `IT/lib/modes/plain/{compile,delegates}.ts` (helpers for the previous entry, no tests of their own).
- `packages/@glimmer/manager/test/managers-test.ts`: every test is at the registry level (`set*Manager`/`getInternal*Manager`, `CustomComponentManager['factory']`, hand-built internal managers, `create()` called directly); no render-level Ember twin (7.1g).
- `packages/@glimmer/manager/test/capabilities-test.ts`: `capabilityFlagsFrom`/`managerHasCapability` bitmaps, internal VM flags (seen while doing 7.1g; not part of the §3 table).
- Not kept, so not on the list: `iterable-test.ts` (6.3: every case was observable through `{{#each}}`, ported or ledgered; deleted), `style-warnings-test.ts` (6.1), `entry-point.ts` (5.4b, never registered), the strict-mode "Non-native keyword" test (5.3b, deleted).

## Findings for the author

Behavior questions W2 turns up. Carry each into the owning chapter's open questions at 8.4.

1. (2.3) A component curried in the application (`(component "x")` passed via `{{mount}}`'s
   `model`) and rendered inside the engine is created with the **engine** as owner in real
   Ember. The Glimmer harness's `owner-test.ts` ("owner is preserved in curried closure
   components", and the non-curried variant, which has a TODO) expects the defining owner. No
   Ember test pins either. Owner: §06-12 / §08 (owner threading).
2. (2.4) `attributeBindings = ['class']` is an assertion in real Ember
   (`EG/components/attribute-bindings-test.js:872`) but worked on the fake classic component
   ("Setting class attributeBinding does not clobber ember-view"); fake-only behavior, no
   spec change, noted so step 4 does not port it.
3. (4.1) Classic angle-bracket attribute precedence: IT's fake classic component lets an invocation
   attribute (`<FooBar data-foo="outer" />`) win over `attributeBindings = ['data-foo']`, and puts
   `data-foo` on both the wrapper `div` and an inner `<h1 ...attributes>` when the layout has an
   explicit `...attributes`. No EG test pins either on a real classic `Component`. Ported to EG
   classic in 4.2 to learn the real answer. Owner: §08 (splattributes) / classic-component chapter.
4. (4.1) Named blocks on a classic `Component`: IT tests `<:baz>`, `<:default>`, `<:else as |v|>`
   on the fake classic component; EG only tests named blocks on glimmer `Component`s
   (`helpers/yield-test.js:35,60`), and the comment at `yield-test.js:37` claims it fails with the
   default backing class. Unknown whether that is stale. Check in 4.2 with a real classic test. OBSERVED (4.2): named blocks (`<:baz>`, `<:default>`, `<:else as |v|>`, `<:inverse>`) work on a registered classic `Component`; the comment at yield-test.js:37 concerns an unregistered default backing class, not classic subclasses. Pinned in the same EG classic file.
5. (4.1) `-with-dynamic-vars`/`-get-dynamic-var`: the IT tests (collapsed onto Glimmer) use arbitrary
   keys such as `myKeyword`; real Ember allows only `outletState` (`EG/syntax/with-dynamic-var-test.js`).
   So the VM supports a general dynamic scope that Ember's template language does not expose; no
   change, noted for the dynamic-scope open question.

6. (5.1) **Legacy-profile `this` at the top level.** §09 `renderTemplate` has no public Ember
   equivalent. The Glimmer harness renders a loose template with an arbitrary `self` through an
   internal root; the Ember harness renders a `-top-level` classic component, so `this` differs.
   Which does the Legacy profile mean? (§09-9.4.2 proposed edit 2.)
7. (5.1) **Serialize mode interactivity.** FastBoot serializes non-interactive; the Glimmer SSR
   suites always serialized with `isInteractive: true` (kept so in W2). Which is normative for
   the SSR profile? (§09-9.4.2 proposed edit 3; §05-13.)
8. (6.2) **Classic components have no args at construction time.** A test that read the positional param in the constructor of the former
   `PositionalComponent` (contextual-components-test 'renders with dot path and rest parameter does not leak') sees `undefined` on a real classic
   `Component`: positional and named args are assigned as properties after the constructor and before `init()`. A glimmer `Component` has `this.args`
   in the constructor. Owner: §08 (classic component lifecycle). Not a behavior change of the feature under test (the value is right at `init`).

## Notes

- 0.1 (2026-10-08): `git worktree add -b test/w2-glimmer-harness ../ember.js-w2 origin/main`
  (the local `main` is stale at `e1d334284e`; `origin/main` is `9bec1cb2a8`). `pnpm install
  --frozen-lockfile` succeeded.
- 0.2 (2026-10-08): baseline on untouched `origin/main` (9bec1cb2a8): 9541 tests, 9523 pass,
  0 fail, 18 skip (no failures pre-exist; run twice, identical). 54 modules come from
  `packages/@glimmer*/*/test` (3018 tests: 3015 pass, 3 skip, all in `[integration] jit :`);
  `IT` alone is 2163 tests: `[integration] jit :` 1638, `rehydration :` 432, `node jit :` 39, etc.
  Files: `.work/W2-baseline.tsv` (module, pass, fail, skip; only tests whose source chunk is under
  `packages/@glimmer*`) and `.work/W2-baseline-tests.tsv` (all 9541 tests: module, test, status,
  source_chunk; the chunk is the first stack frame, so Ember `moduleFor` tests show
  `internal-test-helpers/lib/module-for`). Module names alone are ambiguous: `Owner` is 2 Glimmer + 1
  Ember test; `Helpers test`, `Application test`, `Basic Custom Modifier Manager`, `Cache`, `Registry`
  etc. are Ember-only. Method: throwaway `testem` tap config plus a QUnit `testStart` hook in a copy
  of `dist/index.html` (see `spec/tools/w2-baseline-parse.py`). The 3 `jit` skips: `{{#each}}
  each with undefined item` and two `trackedArray() (rendering): {{each-in}}`. For comparison
  after later steps, filter `W2-baseline-tests.tsv` by `source_chunk`, not by module name.
- 1.1-1.3 (2026-10-08, branch `test/w2-glimmer-harness`): 1.1 `37682d8d97` (37 files: 36 users
  switched to `import GlimmerComponent from '@glimmer/component'`, `emberish-glimmer.ts` deleted and
  its re-export removed; `Glimmer` kind in `types.ts` is now `typeof` the real class;
  `registerGlimmerishComponent` kept as a name, its default class is the real one). No
  `package.json` change: `@glimmer/component` resolves via the root workspace dep plus the vite
  alias and tsconfig `paths`; IT's own `package.json` does not list it. Real class is stricter:
  typed `owner` (use `ConstructorParameters<typeof Component>[0]` in hand-written constructors
  instead of `Owner`/`object`) and typed `args` (`Component<Dict>` where tests index `args`;
  `debugger.ts` uses a signature generic instead of `declare args`). Behavior differences did not
  matter: the real manager schedules `willDestroy` through the Ember runloop, no test pinned the
  fake's synchronous destroy. Nothing left behind. 1.2 `548bc5cdb3` (7 test files, 48 uses;
  `tests/utils/glimmerish-component.js` deleted; 3 files already imported `@glimmer/component`
  so the duplicate import was merged; real manager also has `updateHook:false`, no user depended
  on it). 1.3 (3rd commit, 9 files): `hash/array/concat/get/fn/invokeHelper` from `@ember/helper`,
  `on` from `@ember/modifier`, `templateOnlyComponent` -> default import of
  `@ember/component/template-only` (kept the local name). All names had public re-exports; no
  `@glimmer/runtime` import left in `EG`. Results after each item: full suite 9541 tests, 9523
  pass, 0 fail, 18 skip, identical to the baseline; no test deleted, ledger untouched.
  `pnpm type-check:internals`, eslint and prettier clean on changed files. (`testem.filter.cjs`
  added to the worktree's `info/exclude`, not committed.)
- 2.1-2.4 (2026-10-08, branch `test/w2-glimmer-harness`): 2.1 `c1e68fe3ff` deleted the two `mut` tests
  (EG twins verified assertion by assertion); the fake `mut` registration lived only in them, and
  the `createInvokableRef`/`CapturedArguments` imports went too. 2.2 `1cbe9f6b78`: `htmlSafe` from
  `@ember/template` replaces `makeSafeString` in `updating-test.ts` and `updating-content-matrix-test.ts`
  and the `{toHTML}` literals in `lib/suites/initial-render.ts` and `test/initial-render-test.ts`
  (the second one is a hand-written literal in `handles empty trusted content`). `@ember/template` did
  NOT resolve from IT like `@glimmer/component` did: added `"@ember/template": "workspace:*"` to IT's
  `package.json` and the matching 3-line `pnpm-lock.yaml` entry (an offline `pnpm install` also
  rewrote an unrelated rolldown line; I reverted that and kept only the link). The plain-object
  `{toHTML}` in `updating-test.ts` 'updating a curly with a safe and unsafe string' is kept: it checks
  duck-typing, not a fake of Ember. 2.3 `fc8536394f` (EG port) + `93d54aa9f9`: of the 6 owner tests
  2 deleted (twin: engine-test sharing template/layout), 4 kept (see ledger); a new EG test
  `{{mount}} owner tests` was added; `OwnerJitRuntimeResolver` is gone but `owner-test.ts` stays with
  4 tests, so it is not deleted. FINDING for the author: in real Ember a component curried in the
  application and rendered inside a `{{mount}}`ed engine is created with the engine as owner, while
  the IT test 'owner is preserved in curried closure components' expects the curried owner; no EG test
  pins either. 2.4 ledger rows `157348c3fe`..`cd5a05610a` (4 batches), code `8d8030598c`: 74 tests
  ledgered, 34 deleted (twin) and 40 kept as "port" for step 4.3 (many are not curly tests at
  all: scope tests on template-only components, plain `class={{...}}` tests, rest-style positional
  params whose only EG twins use the `PositionalComponent` stub until 6.2, destruction-order tests,
  and the 5 curried-definition-in-`{{this.foo}}` tests). Sub-note: all 74 done, no partial state.
  Counts: baseline 9541 / 9523 pass / 18 skip. Deleted 2+2+34 = 38 tests, added 1 (the mount port):
  9541 - 38 + 1 = 9504 total, 9523 - 38 + 1 = 9486 pass, 0 fail, 18 skip. Observed: 9504 / 9486 / 0 /
  18; a per-test diff (module+name+chunk, dates normalised) shows exactly the 38 ledgered tests
  missing and the 1 port new. `type-check:internals` and prettier clean; eslint ignores IT files
  (the EG file is clean). Tooling in the scratchpad: `runfull.sh` (map.html + testem tap) and `cmp.py`.
- 3.1-3.4 (2026-10-08, branch `test/w2-glimmer-harness`): commits `e8163f76b0` (3.1+3.2), `29e2f90191`
  (3.3+3.4), `cce8d18557` (rename). Approach: no call site was edited (except the 6 in 3.3), the harness
  was changed instead. 3.1: `IT/lib/helpers.ts` now has `defineUserHelper(fn)`, a `setHelperManager`
  helper (`helperCapabilities('3.23', {hasValue})`) whose `getValue` calls `fn([...positional], {...named})`;
  `registerHelper` registers that instead of `createHelperRef`/`setInternalHelperManager`. I did NOT route
  through `defineSimpleHelper`: it spreads positional args and drops named args, and about 20 sites (the
  `hash` overrides, `say-hello`, `testing` with a hash) read `named`; keeping the `(positional, named)`
  signature means ~55 sites unchanged. Name-based registration on the fake resolver is kept until step 5.
  `UserHelper` type stays. The EG `this.registerHelper` calls (~100) are the Ember harness's own, which
  already uses real helpers; not touched. 3.2: `IT/lib/modifiers.ts` is now `defineTestModifier(Klass)`:
  a `setModifierManager` 3.22 manager (`LegacyHookModifierManager`) mapping `didInsertElement` ->
  `installModifier`, `didUpdate` -> `updateModifier`, `willDestroyElement` -> `destroyModifier`; the
  definition is a named function so the default debug name is the class name, and the manager state is the
  instance (the debug-render-tree test checks `instance`). No test needed adapting: the real manager also
  updates only when consumed args change (the harness reads args eagerly in install/update), and
  `modifiers-test.ts` (17), `updating-modifiers-test.ts`, `style-warnings-test.ts` etc. pass unchanged,
  so they are "ported" by exercising the public manager. `registerInternalModifier` had no users; deleted.
  3.3: the 6 `registerInternalHelper` tests are plain `registerHelper` (4 `const-foobar` tests) or
  `TestHelper` subclasses (`destroy-me`, `stateful-foo`, the latter run by 5 tests; `TestHelper` is the
  existing public-manager class in `define.ts`, `hasDestroyable`), registered through a new
  `registerHelperDefinition(name, definition)` (delegates: jit, rehydration), replacing
  `registerInternalHelper`. Destroy semantics are observed the same way (destructor count after
  `destroy()`), no test kept as an implementation test. 3.4: deleted `createHelperRef`,
  `registerInternalHelper` (+ delegate/RenderTest/interface methods), `registerInternalModifier`, the old
  `TestModifierManager`/`TestModifierDefinitionState`/`TestModifier`. Remaining internal-ref use in IT, not
  in scope here: `lib/components/emberish-curly.ts` (`createComputeRef`, `createConstRef`,
  `reifyNamed/Positional`, goes in 4.4) and `createConstRef` for `self` in the jit and rehydration delegates
  (step 5.4). No ledger rows: no test removed or changed in what it checks. Counts after: 9504 total /
  9486 pass / 0 fail / 18 skip, equal to the after-step-2 totals (9541 - 38 + 1 = 9504; step 3 adds and
  removes no test); `w2-baseline-parse`-style diff against `W2-baseline-tests.tsv`: exactly the same 38
  missing and 1 new as after step 2. `type-check:internals` and prettier clean; eslint on IT shows only 3
  pre-existing unused-var errors (`smokeTest`, `name`, `Owner`).
- 4.1 (2026-10-08): ledger drafted; awaiting Opus review (item left unticked). 189 tests, 378 Curly/Dynamic
  registrations, ledgered in 10 per-suite commits (`165f841a4a`..`52a1dfc191` on `template-language-spec`):
  274 collapsed, 34 deleted (twin), 68 port, 2 drop (fake-only: `attributeBindings=['class']`, Finding 2).
  Summary table and reviewer notes at the end of `W2-coverage-ledger.md`. No code touched; no test deleted.
- 4.2 (2026-10-08): EG commit `f76a25d5ce` (7 new tests: 6 in classic/angle-bracket-invocation-test.js, `yield to else` next to CC:899),
  IT commit `79517d806a`. 20 has-block-params + 4 has-block + 1 yield + 3 named-block tests re-kinded to run as Glimmer
  (`else` in a blueprint now becomes `<:default>`/`<:else>` named blocks in `buildAngleBracketComponent`; +1 generation test).
  3 has-block-params tests fixed (stray template/else removed); no duplicate found, none deleted. 4 rehydration rows set to
  `deferred to 5.6`. Their curly/dynamic registrations are simply removed in 4.4 (Glimmer registrations remain). Until 5.6 the
  wrapper-rehydration and `{{component}}` rehydration behaviors are untested. Ledger: 32 ported, 4 deferred. Tests still carrying
  `kind: 'curly'` (twin-deleted or ported to EG) are removed in 4.4. `Components ::` filter: 595 pass, 0 fail.
- 4.3 (2026-10-08): EG commit `73aa8f83c3` (10 tests: 7 in classic/curly-components-test.js, 2 in classic/contextual-components-test.js, 6
  in attribute-bindings-test.js incl. the 5 range-input ones, i.e. 15 new EG tests with the range ones), IT commit `dd4714ac3c`
  (`ember-component-test.ts` renamed to `components-test.ts`, 26 tests as @glimmer/component; the 'ember-component-test.ts' file is
  therefore gone; `input-range-test.ts` lost only its fake-curly `EmberComponentRangeTests`, its 5 tests ported to EG). The 40 rows:
  26 ported to IT, 10 ported to EG, 4 `drop (fake-only)` (`targetObject` threading, `fromDynamicScope`, `attributeBindings=['class']`,
  `recompute()`; real Ember: no `targetObject`; no dynamic-scope access for components; asserts on class binding; `rerender()` fires
  willUpdate/willRender/didUpdate/didRender but not didReceiveAttrs). Plus 5 input-range rows. Destruction order in the Glimmer
  teardown tests came out identical to the fake's (root before inner, outer before nested), no assertion had to change.
- 4.4 (2026-10-08): code `bf935f7c7a` (+ EG fix `eac1ad7182`: my 4.3 append had truncated classic/contextual-components-test.js
  after its first module, losing the applyMixins and mutable-params modules; caught by the count diff, restored, 10 tests). Removed:
  Curly/Dynamic kinds (`componentModule` is Glimmer + TemplateOnly; `DeclaredComponentKind`, `ComponentKind`, `ComponentTypes`),
  `lib/components/emberish-curly.ts` (fake component, manager, `Attrs`, `AttrsDiff`, factory types), `registerEmberishCurlyComponent`,
  `buildCurlyComponent`/`buildDynamicComponent`/`buildCurlyBlockTemplate`/`buildElse`, `assertEmberishElement`, the `ember-view` and
  `Dynamic` branches in `render-test.ts`, `initial-render-test.ts` (`_buildComponent`, id offsets, wrapper checks), `node/env.ts`,
  `in-element.ts`; the 24 curly-only tests (has-block 7, has-block-params 6, yield 2, emberish 9 incl. 3 never-registered ariaRole),
  14 curly/dynamic generation tests. `debug-render-tree-test`'s curly test is a Glimmer test now (see ledger). `RehydratingComponents`
  keeps its 4 deferred-to-5.6 tests (Glimmer registrations only). Counts: 9504 (after 2.4) -> 9111 total / 9093 pass / 0 fail / 18 skip.
  Arithmetic: 9504 - 378 (Curly/Dynamic registrations) - 14 (generation tests) - 33 (inherited attribute copies of the fake range
  suite) - 5 (fake range tests) - 40 (ember-component-test.ts residue) - 1 (debug-render-tree curly) + 22 (EG: 7 in 4.2 + 15 in 4.3)
  + 1 (generation with else) + 26 (components-test.ts) + 1 (debug-render-tree renamed) + 28 (re-kinded Glimmer registrations: 3 named
  blocks, 4 has-block, 20 has-block-params, 1 yield) = 9111. Per-test diff against `W2-baseline-tests.tsv`: 509 missing (4 from 2.1/2.3 + 74 old
  `[curly ...]` tests: 34 step 2.4 twins + 40 ports + 38 input-range module: 5 ported + 33 inherited + 378 + 14 + 1; all matched to rows) and 79 new (all matched to ports); no unmatched
  names. `type-check:internals`, prettier, eslint (EG files) clean; eslint on IT shows only the pre-existing `Owner` unused import.
- 5.2a (2026-10-08): code `5f76825492`. As designed (P2): `lib/modes/template-root.ts` (`TemplateRootState`), lazy
  `JitRenderDelegate.renderer` (`BaseRenderer`, `owner = {}`, `_DEBUG_RENDER_TREE` around the constructor), templates through
  `TemplateRootState`, components through public `renderComponent` with a `Cursor`; `RenderHandle` (`rerender`, `destroy`,
  `debugBounds?`) in `lib/render-delegate.ts`; `RenderTest.rerender/destroy` use it (`inTransaction`, `destroy` imports gone);
  `RenderDelegate.teardown?()` = `_resetRenderers()`, called through `RenderTest.teardownDelegate()` from `afterEach` in `suite()` and
  from a `hooks.afterEach` in `componentModule()`. `updating-test` `assertInvariants` uses `debugBounds`, `in-element.ts:344` uses
  `this.destroy()`. Rehydration got a temporary `legacyHandle` (deleted in 5.2b). Deviations: (1) the `dynamicScope` parameter is
  dropped and the one test that used it ('supports passing in an initial dynamic context') is removed from `lib/suites/entry-point.ts`
  (never registered, 0 tests run, the file goes in 5.4b). (2) `@ember/-internals` and `@ember/renderer` added to IT `devDependencies`
  plus 6 `pnpm-lock.yaml` lines (`@ember/runloop` was already there; `@ember/debug` not needed yet). Full suite 9111 / 9093 / 0 / 18;
  per-test diff against the P2 run: identical (7 name-only whitespace artifacts of the two logs' formats). No hit for `Expected
  assert.verifySteps`, `Expected N assertions`, `afterEach failed`, `NAMESPACES`. `type-check:internals` and prettier clean.
- 5.2b (2026-10-08): code `c562908ff0`. `RehydrationDelegate` has a client `BaseRenderer` (client doc, builder closure that stores the
  last `DebugRehydrateTree` for `rehydrationStats`) and a server `BaseRenderer` (server doc, `serializeBuilder`), each with its own `{}`
  owner, both through a new shared `createRenderer()` in `lib/modes/renderer.ts` (jit uses it too); templates through
  `TemplateRootState`. Deleted: `legacyHandle`, `JitDelegateContext`, `lib/base-env.ts` + export, `lib/modes/jit/render.ts`.
  `RenderDelegateOptions.env` is `debugRenderTree?: boolean` (`module.ts` options and the debug-render-tree suite follow);
  `JitSerializationDelegate` moved into `lib/modes/node/env.ts` (still exported from the index); `resetTrackingTransaction()` is in
  `lib/modes/env.ts`, called from `setup-harness.ts`. DEVIATION from the design (found by the first full run: 2 `chaos-partial-rehydration`
  tests failed with "Rehydration with nextSibling not supported" and the run aborted at 6615 tests): public `renderComponent` replaces the
  previous render into the same element by rendering *before its first node* (`replaceLastRender`, `LAST_RENDER_INTO` keyed by element),
  which gives the rehydration builder a non-null `nextSibling`; the chaos tests render into one element once per iteration. So partial
  rehydration on the client side calls `this.clientRenderer.render(component.state, { into: cursor, args })` (`BaseRenderer.render`, what
  `renderComponent` itself uses, minus the replace/clear logic); server-side partial rendering uses the public `renderComponent` (fresh
  element each time). Design 1's remark that public `renderComponent` into a Cursor is enough for rehydration is thus incomplete; the
  §09 note (proposed edit 7 area) should say that `renderComponent` replaces earlier renders into the same element. Full suite
  9111 / 9093 / 0 / 18; per-test diff against the 5.2a run: 0 missing, 0 new; same greps all zero. `type-check:internals`, prettier clean.
  For 5.3a: the server `BaseRenderer`'s roots stay alive after `renderServerSide` (as the old VM results did, but now registered in
  Ember's `renderers` until `teardown`'s `_resetRenderers()`); with a real owner, destroy both owners in `teardown()`. For 5.4a: the same
  context object is passed to the server and the client render in the rehydration tests, so once it is a tracked object the server root
  will also revalidate on writes; check that in `initial-render-test`/`chaos` (the server root could be destroyed after serialization if it
  matters, but that would run server-side destructors, so avoid unless needed). The `RehydrationDelegate` now exposes `clientRenderer`,
  `serverRenderer`, `clientOwner`, `serverOwner` (protected) instead of `clientContext`/`serverContext` (no test used them).
- 5.2 review (Opus, 2026-10-08): both deviations accepted. Client-side partial rehydration
  calling `BaseRenderer.render` directly (no replace/clear) stays within the design: same
  renderer method public `renderComponent` uses, inside `lib/modes/`. For 5.3a: destroy both
  rehydration owners in `teardown()`. For 5.4a: the shared server/client context becomes
  tracked, so check that server roots revalidating on writes changes no rehydration result.
- 5.3a (2026-10-08): code `5c0b5156be`. New `lib/modes/owner.ts` (`createOwner` = `buildOwner()` + `-view-registry:main`, `ownRenderer`
  = `associateDestroyableChild(owner, renderer)`, called from `createRenderer`; `teardownOwners(...owners)` = `run(() => destroy(owner))` then
  `_resetRenderers()`). Jit/node delegates have one owner, the rehydration delegate two (client, server), all destroyed in `teardown()`.
  `package.json`: `@ember/destroyable`, `internal-test-helpers` added to IT devDependencies (+6 lock lines; `pnpm install --offline
  --frozen-lockfile` accepts the lockfile). Fixes as designed: `shouldBeVoid` destroys the previous handle in `run()` before
  `clearElement` (`RenderTest.voidHandle`); `Basic Custom Modifier Manager: 3.22` 'custom lifecycle hooks' ends with `this.destroy()` +
  `verifySteps(['Called willDestroyElement'])`; 'can give consistent access to underlying DOM element' ends with `this.destroy()` and
  `assert.expect(6)` -> `expect(7)` (the destructor's assertion). Nothing removed, no ledger row. NOT in the design: 4 `chaos-rehydration`
  / `chaos-partial-rehydration` tests ('adjacent text nodes', '<p> invoking a block which emits a <div>') failed in `afterEach` with
  `removeChild ... not a child` (same mechanism as Void Elements: each iteration renders, then `finally` resets `element.innerHTML`, and
  the last root is destroyed at teardown on DOM that is gone). Same fix in kind: `runIterations`' `finally` destroys that iteration's
  handle in `run()` before resetting the HTML (expectations untouched). Full suite 9111 / 9093 / 0 / 18; per-test diff against
  `full52b`: 0 missing, 0 new; greps for `Expected assert.verifySteps`, `Expected N assertions`, `afterEach failed`, `NAMESPACES`: 0.
  `type-check:internals` and prettier clean.
- 5.3b (2026-10-08, NOT DONE, stopped by rule; WIP code commit `e72c374b7e`): implemented as designed: `ResolverImpl` replaces the fake resolver
  (`createRenderer` takes it; jit delegate keeps one for `createCurriedComponent`, rehydration delegate one per side); `lib/modes/jit/register.ts`
  registers `component:/helper:/modifier:` on the owner(s) (`registerHelperDefinition` moved there; non-class values with
  `{ instantiate: false }`); `preprocess(src, options, owner)` instantiates templates with the delegate's owner (server/client owner in the
  rehydration delegate); partial rehydration finds components with `owner.factoryFor('component:' + name).class`. Deleted `registry.ts`,
  `resolver.ts`, `compilation-context.ts` (with `CIRCULAR_OBJECT`), the keyword pre-registration, `RenderDelegateOptions.resolver`,
  `JitRenderDelegate.compileTemplate` and the index export of `jit/resolver`. The anticipated P4 failures are fixed: 8 `hash` overrides removed
  (ledger rows), debug-render-tree `registerCustomComponent` via `setInternalComponentManager` + `owner.register`, `Updating: missing helper`
  via `this.render('{{helo world}}')` (passes), `createCurriedComponent` from `ResolverImpl.lookupComponent(name, owner)` + `curry`
  (5 `components-test` tests pass), 'Non-native keyword' deleted (ledger row). Full suite: 9110 total / 9079 pass / 13 fail / 18 skip; per-test diff
  against `full53a`: 1 missing (Non-native keyword), 13 pass -> fail, nothing else changed; greps for `Expected assert.verifySteps`,
  `Expected N assertions`, `afterEach failed`, `NAMESPACES`: 0. `type-check:internals`, prettier clean.
  UNANTICIPATED FAILURE (13 tests, all `rehydration :: Components :: initial render > [integration] Glimmer: …` from `RehydratingComponents`:
  'Component invocations', 'Mismatched Component invocations', '… with template', '… with block params', 'with empty args', 'Multiple invocations',
  'Mismatched Multiple invocations', 'interacting with builtins', 'mismatched (blocks) interacting with builtins', '<p> invoking a block which emits
  a <div>'): `Assertion Failed: Cannot re-register: 'component:TestComponent', as it has already been resolved.` Cause: `RehydratingComponents`
  calls `buildComponent` (hence `registerComponent`) in both `renderServerSide` and `renderClientSide`; `RehydrationDelegate.registerComponent`
  registers on both owners, and the server owner already resolved the name when it rendered. The fake registry silently overwrote; Ember's registry
  refuses to re-register a resolved name. The 'Mismatched …' tests register a different layout for the client under the same name, so skipping the
  second registration is not an option: the registration must go to the side that is rendering (server registrations on the server owner at
  `renderServerSide`, client ones on the client owner at `renderClientSide`), or the delegate must replace a resolved registration. No test
  expectation was changed. RESOLVED (coordinator decision): registration follows the phase, both owners until the server render, then client
  only (`RehydrationDelegate.serverRendered`, set by `renderServerSide` and the partial `renderComponentServerSide`; every `register*` registers on
  the client owner always and on the server owner only while the flag is unset). The client owner resolves nothing before `renderClientSide`, so a
  client-phase registration replaces the first on it and the 'Mismatched …' tests keep their different client layout. Final 5.3b: code `e41d3c7792`
  (the WIP commit amended). Full suite 9110 / 9092 pass / 0 fail / 18 skip; per-test diff against `full53a`: only 'Non-native keyword' missing;
  greps (incl. `already been resolved`): 0. `type-check:internals` and prettier clean.
- 5.3a review: the chaos-test fix (destroy each iteration's handle in `run()` before resetting innerHTML) is accepted in review.
- 5.3c (2026-10-08): code `3ebe247030`. `templateOnlyComponent` / `TemplateOnlyComponent` from
  `@ember/component/template-only` in `lib/test-helpers/define.ts`, `lib/components/types.ts`, `test/debug-render-tree-test.ts` (that file keeps
  `EMPTY_ARGS`/`TemplateOnlyComponentManager` from `@glimmer/runtime`: implementation tests, W5); `array, concat, fn, get, hash` from `@ember/helper` and
  `on` from `@ember/modifier` in `test/strict-mode-test.ts`, `test/modifiers/on-test.ts`. `@ember/component` added to IT devDependencies (+3 lock
  lines). Full suite 9110 / 9092 / 0 / 18; per-test diff against the 5.3b run: 0 missing, 0 new; greps 0; type-check and prettier clean.
- 5.4a (2026-10-08): code `fedd0647fb`. `RenderTest.context` is `trackedObject({}, { equals: () => false })` from `@ember/reactive/collections`
  (`@ember/reactive` added to IT devDependencies + lock lines), `set` has no `dirtyTagFor`. `trackedObj` is now a `trackedObject`; new
  `trackedContext(plain)` in `lib/test-helpers/tracked-object.ts` (a WeakMap, so one plain context object always maps to the same tracked
  object) is used by the `renderServerSide`/`renderClientSide` overrides of `initial-render-test.ts` and `chaos-rehydration-test.ts`
  (instead of wrapping at each of the ~100 call sites, as design 3 said; same effect: server and client share one tracked object). The
  `this.context = { node: clientNode }` line in `initial-render-test.ts` went (`renderClientSide` sets it). The 6 collections tests import from
  `@ember/reactive/collections`; `lib/suites/each.ts` and `updating-test.ts` use a `trackedObject({count|version: 0})` counter instead of
  `createTag/consumeTag/dirtyTag`. DEVIATIONS from the design (first full run: 20 failures): (1) default `trackedObject` skips a write of an
  equal value, but 16 `#each`, `Updating: weird paths` and `block arguments (ensure balanced push/pop)` mutate a nested plain object and then
  `rerender({ list })` / `rerender({ person })` with the same object, relying on the old unconditional `dirtyTagFor`; the context (and
  `trackedContext`) therefore pass `{ equals: () => false }` so every `set` dirties, as before; no expectation changed. (2)
  `style-warnings-test.ts` overrides the global context with a minimal one that has no `scheduleRevalidate`, and the tracked write now calls
  it: added `scheduleRevalidate() {}` to that override (the file moves to the Ember harness in 6.1 anyway). Final: 9110 / 9092 / 0 / 18;
  per-test diff against `full53c`: 0 missing, 0 new; greps for `Expected assert.verifySteps`, `Expected N assertions`, `afterEach failed`,
  `NAMESPACES`, `already been resolved`: 0. type-check and prettier clean (no eslint-checked file changed). REHYDRATION CHECK (the 5.2 review
  ask): server roots now revalidate on writes, and no rehydration result changed (zero per-test diff, all `rehydration ::` modules, chaos and
  `clearedNodes` assertions included). No rehydration test writes to the context between the server and the client render: in
  `initial-render-test.ts`, `chaos-rehydration-test.ts` and `partial-rehydration-test.ts` the only calls after `renderClientSide` are
  `assertStableRerender()`/`rerender()` with no properties, and no `set`/`setProperties`/`rerender({...})` appears in those files, so the
  revalidating server root is never exercised by a write; the check is therefore only that tracked contexts change nothing at render time.
- 5.4b (2026-10-08): code `f482d68ebb`. `renderResult` -> `handle`; `RenderHandle` is `{ rerender, destroy }`; `debugBounds?(handle)`,
  `isArgumentCaptureError?(value)` and `getCapturedRenderTree?()` are optional methods of `RenderDelegate` (new `DebugBounds` type; the handle's
  bounds live in a WeakMap in `lib/modes/renderer.ts`: `handleWithBounds`/`boundsOf`); `getCapturedRenderTree` is `captureRenderTree(owner)` from
  `@ember/debug` (added to IT devDependencies + lock); `debug-render-tree-test` calls `this.delegate.isArgumentCaptureError(...)`;
  `updating-test` `assertInvariants` calls `this.delegate.debugBounds`. `getElementBuilder`/`getSelf` left the interface. `lib/suites/entry-point.ts`
  and its export deleted (ledger rows 5.2a/5.4b). `in-element.ts:344` already used `this.destroy()` (5.2a), the `Updating: missing helper`
  and `createCurriedComponent` items were done in 5.3b. Grep: no `RenderResult`/`EnvironmentDelegate` outside `lib/modes/`. Remaining
  `@glimmer/{runtime,validator,reference,opcode-compiler,compiler}` imports in IT outside `lib/modes/` (all implementation tests, W5):
  `lib/suites/debugger.ts`, `lib/suites/custom-dom-helper.ts`, `test/tracked-value-test.ts`, `test/attributes-test.ts`, `test/owner-test.ts`,
  `test/env-test.ts`, `test/debug-render-tree-test.ts`, `test/precompile-test.ts`, `test/compiler/compile-options-test.ts`. Full suite 9110 / 9092 /
  0 / 18; per-test diff against the 5.4a run: 0 missing, 0 new; greps 0.
- 5.5a (2026-10-08): code `a6ae9273b9`. `internal-test-helpers/lib/compile.ts` has the named `compile(source, { strictMode, scope, moduleName,
  plugins, glimmerOnly })` (adapter shape) and keeps its default export `(source, options, scopeValues)`; both over one `build()`. The IT
  `createTemplate`/`preprocess` call `compile(..., { scope, glimmerOnly: { options } })`: `glimmerOnly` takes the Glimmer options exactly as
  given (all of IT's options: `meta`, `plugins.ast`, `keywords`, `locals`), skips `compileOptions()` and keeps the per-template `id`, so the IT
  output is unchanged. (Design said an internal `glimmerOnly: true` flag; it is an object carrying the options so no IT option has to be mapped
  onto the adapter shape. 5.5b removes it.) `internal-test-helpers/package.json` exports `./lib/compile`. `IT/lib/compile.ts` imports neither
  `@glimmer/compiler` nor `@glimmer/opcode-compiler`. The build no longer mutates the caller's `options.locals`. Full suite 9110 / 9092 / 0 / 18;
  per-test diff against the 5.4b run: 0 missing, 0 new; greps 0; type-check, prettier and eslint (on `compile.ts`) clean.
- 5.4–5.5a review (Opus, 2026-10-08): accepted. `trackedObject(…, { equals: () => false })` keeps
  the harness convention that `rerender({ k })`/`set` means "k changed" even for the same
  object; 18 tests (16 `#each`, `Updating: weird paths`, `block arguments`) depend on it
  because they mutate untracked nested plain objects. That is a test-level coupling for W4
  (rewrite them over tracked data, then drop `equals`), not a W2 blocker. `glimmerOnly: {options}`
  in 5.5a is fine as an interim; 5.5b removes it.
- 5.5b (2026-10-08): phase 1 code `89429e7685` (worktree). `glimmerOnly` removed from `internal-test-helpers/lib/compile.ts`; IT
  `createTemplate` maps `meta.moduleName`, `plugins.ast`, `locals`; `registerSomeComponent` registers `component:${dasherize(name)}`;
  partial-rehydration `componentFor` and `createCurriedComponent` dasherize; string names in templates dasherized (see triage). First run
  after the switch: 156 failures (strict-mode `locals` unmapped 95, un-dasherized string names ~40, 20 real); after plumbing: 19 failures,
  all triaged above, none changed. Full suite 9110 / 9073 / 19 / 18; per-test diff against `full55a`: 0 missing, 0 new, 19 pass -> fail.
  `type-check:internals` and prettier clean. Phase 2 (changing the 19 tests) waits for Opus decisions per row.
- 5.5b decisions applied (2026-10-08, Opus review): code `0f5d5afdbe` (the WIP commit amended; message no longer WIP). Debug-render-tree names
  dasherized (7; twin `EG/application/debug-render-tree-test.ts:797-829`); `@Foo`/`@Bar` args renamed lowercase (5; the reserved assertion is pinned by
  `ember-template-compiler/tests/plugins/assert-reserved-named-arguments-test.js`, no new test); bare `{{modifier}}` expects Ember's message (1);
  the 5 in-element tests that need a null destination or non-null `insertBefore` moved to `IT/test/vm/in-element-vm-test.ts` (3 jit + 2
  rehydration), compiled with plain Glimmer options through new `PlainGlimmerJitDelegate`/`PlainGlimmerRehydrationDelegate`
  (`lib/modes/plain/{compile,delegates}.ts`; delegates got a protected `compileTemplate`, `precompileOptions` is protected). The Ember-side null
  and `insertBefore` assertions already have twins in `EG/syntax/public-in-element-test.js` (null, undefined, `insertBefore=non-null-value`), so
  no Ember-side duplicate and no `DEBUG`-gated copy was added (the twins run in the dev suite). The updating `{{#in-element}}` helper test switches
  between two elements; it still asserts didCreate 1 / didDestroy 0 after the switch and after switching back (the same assertions that guard the
  `{{#if}}`/`{{component}}` siblings), plus new content assertions in both elements. I did not run an engine-level mutation proving that a teardown
  would fail it; the count assertions are the unchanged ones of its siblings. Ledger: 19 rows (`5.5b rows`). Counts: 9110 total / 9092 pass / 0
  fail / 18 skip, identical to 5.4b/5.5a (5 tests moved to a new module, none added or removed; the plain-compile VM module names are `jit (plain
  Glimmer compile)` and `rehydration (plain Glimmer compile)`). Per-test diff against `full55a`, ignoring date-stamped Helpers names: 5 renamed
  modules, 0 missing, 0 new. type-check and prettier clean.
- 5.6 (2026-10-08): code `bf7d0d21ec`. `registerClassicComponent(owner, name, layout, Class = Component)` in `lib/modes/jit/register.ts` (a fresh
  subclass per call: `setComponentTemplate` is once per class) and `RehydrationDelegate.registerClassicComponent` (phase rule as the other `register*`).
  The 4 ledger rows became 4 new tests in the `Rehydration` class of `initial-render-test.ts` (module `rehydration :: rehydration`; not in
  `RehydratingComponents`, which runs per Glimmer/TemplateOnly kind and builds angle-bracket invocations from blueprints): 'curly invocation of a
  classic Component: multiple invocations' and '... mismatched multiple invocations' (`{{#foo-bar}}`, wrapper `class="ember-view"`, 0 nodes removed),
  '{{component}} invocation: component invocations' and '... interacting with builtins' (a Glimmer component through `{{component this.componentName}}`;
  server output has the angle-bracket form's markers shifted by one). The injected `renderer:-dom` caused no problem: the design-2 fallback was not
  needed. Counts: 9110 -> 9114 total / 9096 pass / 0 fail / 18 skip; per-test diff against `full55b2`: 0 missing, 4 new (the 4 above); greps 0.
  type-check and prettier clean (eslint ignores IT).
- 6.1 (2026-10-08): code `4b82b0fea8`. The 5 IT tests compared with
  `EG/content-test.js` 'Inline style tests - warnings' (which uses its own `setDebugFunction('warn')` stub, kept): only 'triple curlies are trusted'
  has a twin. 4 ported to a new module in `content-test.js` (`expectWarning`/`expectNoWarning`, real modifier via `defineSimpleModifier`, real
  `warnIfStyleNotTrusted`); IT file deleted (5.4a's `scheduleRevalidate` workaround went with it). Ledger: 5 rows (`6.1 rows`). Counts: 9114 -> 9113
  total / 9095 pass / 0 fail / 18 skip; per-test diff against `full56`: 5 missing (the 5 rows), 4 new (the 4 ports); greps 0. type-check, prettier,
  eslint (content-test.js) clean.
- 6.2 (2026-10-08): code `545a412a29`. 26 sites in 4 EG files (contextual 14, dynamic 6, curly 5, angle-bracket 1) went from `PositionalComponent` to `class extends ClassicComponent`
  (`import ClassicComponent from '@ember/component'`, `static positionalParams` as before); `tests/utils/positional-component.js` deleted. No `tagName`
  change was needed (all those tests assert text). One difference: 'renders with dot path and rest parameter does not leak' read `this.value` in the
  constructor, which a classic component does not have yet (props are assigned after construction); it now reads it in `init()`, same expectation (see Finding 8).
  Everything else passed unchanged: 0 failures in the first run apart from that one. Re-check: 9 ledger rows (42, 43, 45, 49, 50, 53, 55, 61, 62 of the
  ledger) cited a twin that ran on the stub; each now cites a twin that runs on a real classic `Component` (note `6.2 re-check` in the row); the citation
  `contextual-components-test.js:367` in the 'curry arguments' row never used the stub. Counts: 9113 / 9095 / 0 / 18, per-test diff against `full61`: 0
  missing, 0 new; greps 0; type-check, prettier, eslint clean.
- 6.3 (2026-10-08): code `62ccb8ba1f`. `iterable-test.ts` (12 tests, not 13) compared with `EG/syntax/each-test.js`, `classic/each-test.js` and `IT/lib/suites/each.ts`.
  Premise corrected: the test installs no global context, so in the shared page it already ran on Ember's real `toIterator`; the fake iterator
  (`ObjectIterator`/`TestContext`) lived in `reference/test/utils/template.ts`, which nothing imported (deleted, ledger row). 5 cases have twins (iterate,
  synchronize, null, `@index`, paths) and 7 had none or only a text-level twin: null items, several nulls, duplicate objects, non-null primitives, `@key`, object
  identity (control) and null-prototype items. All are observable as DOM node identity, so they are ported as 7 tests in a new module `Syntax test: {{#each}}
  keys and DOM identity` in `EG/syntax/each-test.js`; none is kept as an implementation test, so `iterable-test.ts` is deleted. The unit-level key values
  (`'0'`/`'1'` strings for `@index`, `[0, 1]` for `@key`, key equal to value for primitives) are not observable and are not ported (ledger notes). 12 ledger
  rows (`6.3 rows`). Counts: 9113 -> 9108 total / 9090 pass / 0 fail / 18 skip (-12 +7); per-test diff against `full62`: exactly the 12 missing, 7 new; greps 0;
  type-check, prettier, eslint (each-test.js) clean. W5 classification list added above. After 6.3 the 18 skips are unchanged.
- 7.1a (2026-10-08): code `a135f9b3b0`. IT `each.ts` (27) vs EG `syntax/each-test.js` (run for 6 list kinds) and `components/classic/each-test.js` (1 test). Kept both
  as complementary. Deleted 2 exact behavioral twins (`else template is displayed with context`, `it renders all items with duplicate key values`) after
  moving their one effective assertion (`assertStableRerender`) into the EG twins. Harness observation: IT's `assertStableNodes()` right after `assertHTML()` is
  vacuous (`assertHTML` re-takes the snapshot), so only `assertStableRerender` checks node stability; and swap #1-#12 return early unless `LOCAL_DEBUG`
  (VM_LOCAL_DEV), so in the shared build they assert nothing (VM list-update steps: implementation tests, W5). Full suite 9108 -> 9106 total / 9088 pass / 0 fail / 18
  skip (-2); per-test diff against `full63`: exactly the 2 ledgered tests missing, 0 new; greps 0; type-check, prettier and eslint (EG file) clean.
- 7.1b (2026-10-08): code `9a486d218e`. IT `in-element.ts` (13, jit only) vs EG `public-in-element-test.js` (8). The IT copy is the stronger one (update/switch/loop/nesting/AST
  transform cases) and stays in IT; 3 of its tests duplicate EG tests (ledger) and were deleted; nothing needed moving (the twins are supersets). The EG assertion tests
  stay in EG. Full suite 9106 -> 9103 total / 9085 pass / 0 fail / 18 skip (-3); per-test diff against `full71a`: exactly the 3 ledgered tests missing, 0 new; greps 0;
  type-check and prettier clean. The vite build prints one sourcemap warning for `runtime-template-compiler-implicit-test.ts`, already in `build63` (pre-existing).
- 7.1c (2026-10-08): code `c7f204af33`. IT `test/helpers/{array,concat,fn,get,hash}-test.ts` (11+4+11+19+8 = 53 tests) vs EG `helpers/*-test.js`. EG is the stronger copy (as §3 says) and is the
  superset: every IT test has a same-name twin with the same template (checked by comparing the render templates; the twins differ only in curly vs angle-bracket
  invocation, `set` vs `@tracked`/`rerender`, text vs HTML assertions) except 7 cases moved into the EG files: fn 4 DEBUG assertion tests (no argument, undefined, null, unbound
  `this`) as new tests plus the DEBUG half of "there is no `this` context" merged into its twin (EG ran that test only in production builds); get 2 string-length tests; hash
  "individual hash values are accessed lazily". All five IT files deleted (`dynamic-helpers-test.ts` is not in this item). Ledger: 53 rows (45 deleted (twin), 8 moved).
  Full suite 9103 -> 9057 total / 9039 pass / 0 fail / 18 skip (-53 +7); per-test diff against `full71b`: exactly the 53 ledgered tests missing, the 7 new ones all EG
  tests added above; greps 0; type-check, prettier and eslint (3 EG files) clean.
- 7.1d (2026-10-08): code `d669d705fe`. IT `test/modifiers/on-test.ts` (19) vs EG `modifiers/on-test.js`; `keywords/on-runtime-test.ts` (3) examined too. Nine tests have same-name twins in EG and were
  deleted; ten had none and moved to EG (passive, unrelated updates, eight assertion tests; the two bound callback ones were renamed `... is a bound undefined/null value` because the EG
  file already has same-purpose tests with literal `undefined`/`null`). `on-runtime-test.ts` stays: it uses `on` as an implicit keyword, which no EG test does (they put it in scope). IT
  asserted listener counts through the same internal `getInternalModifierManager(on).counters` as EG, so no new use of private API. Ledger: 20 rows (9 deleted, 10 moved, 1 kept).
  Full suite 9057 -> 9048 total / 9030 pass / 0 fail / 18 skip (-19 +10); per-test diff against `full71c`: exactly the 19 ledgered tests missing, the 10 new ones the EG tests above;
  greps 0; type-check, prettier and eslint (EG file) clean.
- 7.1e (2026-10-08): code `68fcd3260a`. IT `managers/modifier-manager-test.ts` (9), `modifiers-test.ts` (17), `updating-modifiers-test.ts` (3) vs EG `custom-modifier-manager-test.js` (and
  `components/angle-bracket-invocation-test.js`, which holds the EG twins of the splattributes tests; it defines its own public-manager `BaseModifier`). EG is the stronger copy for the manager tests:
  7 of the 9 manager tests have same-name twins and went; the other 2 (mutating a consumed tracked field in the constructor; not reading arguments during destruction) moved
  to EG. `modifiers-test.ts`: the 6 modifiers-on-components tests duplicate the EG "Element modifiers on AngleBracket components" tests and went; the other 11, and the 3 tests of
  `updating-modifiers-test.ts`, stay in IT (the order of installing/destroying several modifiers and hook-by-hook update checks have no EG twin; 5 of them kept as unsure because
  of partial overlap). Ledger: 19 rows incl. 4 grouped kept rows. Full suite 9048 -> 9035 total / 9017 pass / 0 fail / 18 skip (-15 +2); per-test diff against `full71d`: exactly the
  15 ledgered tests missing, the 2 new ones the moved EG tests; greps 0; type-check, prettier and eslint (EG file) clean.
- 7.1f (2026-10-08): code `8f427a1ed0`. IT `managers/helper-manager-test.ts` (23) vs EG `helpers/helper-manager-test.js` (15), `custom-helper-test.js`, `invoke-helper-test.js`, plus
  `default-helper-manager-test.js`. The 14 manager tests have same-name twins in `helper-manager-test.js` (stronger: the EG ones match the full backtracking message
  with the debug name where IT matched only the prefix); deleted, nothing to move. The 9 "(Default Helper Manager)" tests stay: their closest EG tests (default-helper-manager-test.js)
  check text only; IT adds render counts and unused-argument tracking (3 near-twins kept as unsure, 6 without twin). The §3 "capability combinations" claim for Glimmer does not
  hold any more: the capability tests (`hasValue`/`hasScheduledEffect`/version/capabilities function) are all in the EG file too. `custom-helper-test.js` and
  `invoke-helper-test.js` have no IT counterpart. Ledger: 16 rows (14 deleted, 2 grouped kept). Full suite 9035 -> 9021 total / 9003 pass / 0 fail / 18 skip (-14); per-test
  diff against `full71e`: exactly the 14 ledgered tests missing, 0 new; greps 0; type-check and prettier clean.
- 7.1g (2026-10-08): no code change, no worktree commit, no full run (the tree is the one of `full71f`). `@glimmer/manager/test/managers-test.ts` (20 tests) vs
  `EG/custom-component-manager-test.js` (23 render tests): the file is entirely registry level, so it stays as the item says (one grouped `kept` ledger row) and is on the W5 list, with
  `capabilities-test.ts` next to it. EG's render tests of the component manager (create/update/destroy hooks, args, positional params, async lifecycle, capabilities helper)
  have no IT twin, as IT has no render-level component-manager test.
- 7.1h (2026-10-08): code `51887e1701`. IT `strict-mode-test.ts` (93) and `lexical-scope-test.ts` (1) vs EG `components/strict-mode-test.js` (22), `runtime-template-compiler-explicit-test.ts` (22),
  `-implicit-test.ts` (23). DEVIATION from §3 (which names IT as the stronger copy): IT is far larger (85 of its tests have no EG counterpart and stay), but the EG files are three
  *different compile entry points* of the same small smoke suite (build-time `precompileTemplate`, public runtime `template()` with `scope`, runtime with `eval`), so none of them can go;
  the only overlap is 8 IT tests whose template, scope values and assertions are identical to the `explicit` runtime tests (the same path as IT's `defineComponent`): those 8 were deleted
  from IT (the 5 built-ins hash/array/concat/get/on+fn, component and modifier in scope, constant values). Two same-name pairs differ (helper manager vs plain function; `if` vs `each`
  shadowed) and are kept as unsure. The `BuiltInsStrictModeTest` class went with its last test. Ledger: 12 rows (8 deleted, 4 kept groups). Full suite 9021 -> 9013 total / 8995 pass /
  0 fail / 18 skip (-8); per-test diff against `full71f`: exactly the 8 ledgered tests missing, 0 new; greps 0; type-check and prettier clean.
