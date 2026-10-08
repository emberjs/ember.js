# T17 fake-stub survey (B1)

Ruling (Q6): Glimmer was written in another repo, so Ember and Glimmer each test fake stubs of
the other. Everything remaining is flagged for elimination. Glimmer tests now run in Ember's
page (one `index.html`, Ember's global context), so the real thing is available to both.

## Checklist
- [x] 1. Glimmer harness emulating Ember
- [x] 2. Ember tests emulating Glimmer / bypassing it
- [x] 3. Duplicated suites
- [x] 4. Summary table and sequence

Abbreviations: `IT` = `packages/@glimmer-workspace/integration-tests`, `EG` =
`packages/@ember/-internals/glimmer/tests/integration`. Counts are `grep` counts of `@test`
or of the identifier, not executed QUnit tests; "registrations" multiplies by the
`componentModule` fan-out.

## 1. Glimmer harness emulating Ember

### 1.1 `EmberishCurlyComponent` and its manager  (largest stub)
- `IT/lib/components/emberish-curly.ts:51-113` (class), `:136-321` (manager),
  `:325` `setInternalComponentManager`.
- Imitates Ember's classic `Component` (`@ember/component`, `packages/@ember/-internals/glimmer/lib/component.ts`)
  and Ember's `CurlyComponentManager` (`packages/@ember/-internals/glimmer/lib/component-managers/curly.ts`).
  Fakes in particular:
  - `create/set/setProperties/recompute` via `dirtyTagFor`/`dirtyTag` and a `dirtinessTag` (`:54,86-99`);
    real classic components use `notifyPropertyChange`/`rerender`.
  - Lifecycle hooks `didInitAttrs`, `didUpdateAttrs`, `didReceiveAttrs`, `willInsertElement`,
    `willRender`, `didInsertElement`, `didRender`, `willUpdate`, `didUpdate`, `willDestroyElement`
    (`:103-112`, called from `:239-243,290-316`). The order is a hand-written copy of Ember's
    order; the real order is tested in `EG/components/life-cycle-test.js`,
    `classic/life-cycle-test.js`, `will-destroy-element-hook-test.js`.
  - `positionalParams` string and array forms with the same error messages (`:160-201`);
    real thing: `EG/components/curly-components-test.js`, `contextual-components-test.js`.
  - wrapper element `<div class="ember-view" id="emberN">` with a hand-made GUID counter
    (`:49,82,272-273`); real thing: Ember's view registry and `guidFor` (`ember-view`, `ember123`
    ids are asserted by Ember's own tests).
  - `tagName` null/""/string rules (`:255-263`), `attributeBindings` (`:275-283`), `HAS_BLOCK`
    (`:222`), `fromDynamicScope` (`:228-235`, no Ember counterpart; Ember has no such feature
    except via `{{-with-dynamic-vars}}`), `targetObject` as caller self (`:221`), `parentView` (`:62`, never set).
  - `args`/`attrs` are references reified by `reifyNamed`; the real thing is the classic `attrs`
    proxy plus `mut`/`readonly` cell semantics (not modelled at all here).
- Registered via `registerEmberishCurlyComponent` (`IT/lib/modes/jit/register.ts:42-56`).
- Dependents:
  - Directly: `IT/test/ember-component-test.ts` (43 identifier uses, 74 `@test`), `owner-test.ts`
    (5 uses, 6 tests), `input-range-test.ts` (4 uses, 5 tests), `debug-render-tree-test.ts` (5 uses).
  - Through the `Curly`/`Dynamic` kinds: see 1.3.
- Duplicates: `ember-component-test.ts` is a near-line-by-line mirror of
  `EG/components/curly-components-test.js` (58), `life-cycle-test.js`/`classic/life-cycle-test.js`,
  `contextual-components-test.js` (43), `dynamic-components-test.js` (20),
  `classic/curly-components-test.js`. Matching names: "component helper can curry arguments",
  "static/dynamic named positional parameters", "arbitrary positional parameter conflict",
  "emberish curly component should have unique IDs", "NonBlock ... replaced with a web
  component" (`EG/components/web-component-fallback-test.js`), "Curly component hooks",
  "curly components are destroyed", "Setting class attributeBinding does not clobber ember-view",
  "attributeBinding to null". Stronger copy: the Ember one (real classic components, real
  `ember-view` ids, real hook order). Genuinely Glimmer-only residue is small:
  `fromDynamicScope`, "components inside the root are destroyed when the render result is
  destroyed", "deeply nested destructions", "components that are destroyed twice are destroyed
  once" (check whether `EG/.../life-cycle-test.js` or `will-destroy-element-hook-test.js`
  cover them; they are destroy-ordering tests that can be rewritten with `@glimmer/component`
  + `registerDestructor` and need no classic component).
- Action: delete. Port the 5-10 residue tests to `GlimmerishComponent`/`@glimmer/component`.

### 1.2 `GlimmerishComponent` and `GlimmerComponentManager`
- `IT/lib/components/emberish-glimmer.ts:8-65`. Imitates `@glimmer/component`
  (`packages/@glimmer/component/src/-private/component.ts` and its manager
  `ember-component-manager.ts`), which is in this repo. It uses only the public manager API
  (`componentCapabilities('3.13', {destructor:true})`, `setComponentManager`), so it is a
  legitimate emulation only in a repo without `@glimmer/component`.
- Real replacement: `import Component from '@glimmer/component'` (or `@glimmer/component` via
  the `GlimmerComponent` in `packages/@glimmer/component`).
- Dependents: 42 files in `IT/test` and `IT/lib` mention it (grep above: `updating-test.ts`,
  `strict-mode-test.ts`, `owner-test.ts`, `ember-component-test.ts`, `tracked-value-test.ts`,
  `collections/*` (6), `keywords/*-runtime-test.ts` (11), `helpers/*` (5), `managers/helper-manager-test.ts`,
  `modifiers/dynamic-modifiers-test.ts`, `jit-suites-test.ts` and the suites
  `components.ts`, `has-block-params.ts`, `in-element.ts`, `debugger.ts`), mostly as the
  `class X extends GlimmerishComponent` base of a test component. Plus all `Glimmer` kind
  registrations (1.3).
- Differences from the real one that tests may silently depend on: `isDestroying`/`isDestroyed`
  getters, `willDestroy` registered through `registerDestructor` (real: same), `owner` passed as
  constructor arg (real: same). No `Symbol` owner trick. Behaviorally equivalent; replacement is
  mechanical (`import Component from '@glimmer/component'`).
- Action: replace with `@glimmer/component` (mechanical), then delete the file.

### 1.3 Component kinds and the `componentModule` fan-out
- `IT/lib/components/types.ts:7` (`ComponentKind`), `IT/lib/test-helpers/module.ts:113-197`
  (`componentModule`), `:19-111` (`jitComponentSuite`, `nodeComponentSuite`, `componentSuite`),
  `IT/lib/test-decorator.ts:18-54`, `IT/lib/render-test.ts:99-130,221-310`
  (`buildGlimmerComponent`, `buildCurlyComponent`, `buildDynamicComponent`).
- What it does: each un-kinded `@test` is registered three times (Glimmer, Curly, Dynamic).
  `Curly` and `Dynamic` run on the fake classic component of 1.1. `Glimmer` runs on 1.2.
- Dependent registrations (approximate, from `@test` counts and `kind:` options):
  | suite (`IT/lib/suites/`) | plain `@test` (x3) | `kind:'curly'` (x2) | `kind:'glimmer'` | curly+dynamic regs |
  |---|---|---|---|---|
  | `emberish-components.ts` | 6 | 9 (+3 skipped) | 0 | about 30 |
  | `has-block.ts` | 10 | 11 | 6 | about 42 |
  | `has-block-params.ts` | 0 | 26 | 0 | about 52 |
  | `yield.ts` | 12 | 0 | 0 | about 24 |
  | `scope.ts` | 2 | 0 | 0 | 4 |
  | `with-dynamic-vars.ts` | 3 | 0 | 0 | 6 |
  | `debugger.ts` | 2 | 0 | 0 | 4 |
  | `components.ts` (`GlimmerishComponents`) | 0 | 0 | 14 (+4 templateOnly) | 0 |
  | `shadowing.ts` | 0 | 0 | 5 | 0 |
  About 160 QUnit tests run on the fake classic component (curly + dynamic). Also
  `initial-render-test.ts` `RehydratingComponents` (`componentSuite(..., RehydrationDelegate)` at
  `:1598`), and `ServerSideComponentSuite` (`suites/ssr.ts:192`, 30 tests, node component suite,
  runs all three kinds).
- Real replacement: the Ember harness's classic components (`moduleFor` + `RenderingTestCase`,
  `packages/internal-test-helpers/lib/test-cases/rendering.ts`). Behaviors that these suites
  pin (has-block, has-block-params, yield, scope, shadowing, dynamic vars, debugger) are not
  classic-component behaviors; the Curly kind is only the second invocation syntax
  (`{{foo-bar}}` vs `<FooBar>`). A real alternative without classic components is the
  `Glimmer` kind plus a `TemplateOnly` kind plus a curly-invocation of a template-only
  component, which `{{foo}}` in strict mode cannot express; in Ember, curly invocation of
  `@glimmer/component` classes through the resolver works (`dynamic-components-test.js`).
- Duplicates: `has-block` and `has-block-params` are covered by
  `EG/components/curly-components-test.js` (`has-block`, `hasBlock` greps hit),
  `angle-bracket-invocation-test.js`, `contextual-components-test.js` and
  `EG/helpers/yield-test.js` (14). `yield.ts` (15) vs `yield-test.js` (14) and
  `classic/yield-test.js`. `with-dynamic-vars` (3) vs `EG/syntax/with-dynamic-var-test.js` (3).
- Action: stop fanning out to Curly/Dynamic. Keep one invocation form per test
  (`Glimmer` + `TemplateOnly`), plus a curly-invocation variant that runs through Ember's resolver
  in the Ember harness (a fixture owner with `register('component:foo', ...)` of an
  `@glimmer/component` class). Drop the 3-skipped tests. Net: delete about 160 registrations,
  keep the originals as single registrations.

### 1.4 `BaseEnv` manual destroy queues
- `IT/lib/base-env.ts:4-35`. Imitates Ember's `EmberEnvironmentDelegate`
  (`packages/@ember/-internals/glimmer/lib/environment.ts`): `scheduleDestroy`/`scheduleDestroyed`
  are run through the Ember run loop (`schedule('actions', ...)`, `schedule('destroy', ...)`),
  while the harness drains two module-level arrays in `onTransactionCommit`.
  `isInteractive: true`, `enableDebugTooling: false` are Ember's `ENV` flags, hard-coded.
  Also a module-level (cross-test) mutable queue: leaks between tests if a transaction aborts.
- Dependents: every `JitRenderDelegate` (`IT/lib/modes/jit/delegate.ts:22` `assign({}, env ?? BaseEnv)`),
  the rehydration delegates, `render-test.ts:441-446` (`run(() => inTransaction(env, () => destroy(result)))`).
  Effectively all of `IT/test`. Destruction-order tests (`ember-component-test.ts:1678-1953`,
  8 tests) depend on this timing; Ember's is "willDestroy synchronously, didDestroy in `destroy` queue".
- Real replacement: Ember's environment delegate (`EmberEnvironmentDelegate`) and the
  `schedule`-based queues; the Glimmer harness runs in Ember's page and global context
  (`@glimmer/global-context` is already set by `@ember/-internals/glimmer` import) so the
  real delegate can be passed as `env`.
- Action: replace with Ember's delegate (or with `@ember/destroyable` `destroy` + `await settled()`),
  then delete.
- *Correction (W2 5.1, 2026-10-08):* the two module-level queues had no callers.
  Destruction already ran through Ember's global-context `scheduleDestroy`/`scheduleDestroyed`
  (run-loop `actions` and `destroy` queues), because `@ember/-internals/glimmer` is loaded in
  the page. `BaseEnv` contributed only `isInteractive: true`, `enableDebugTooling: false` and an
  `onTransactionCommit` that drained empty arrays; the real change in W2 was who drives
  transactions (Ember's renderer).

### 1.5 `TestJitRuntimeResolver`, `TestJitRegistry`, `CIRCULAR_OBJECT`
- `IT/lib/modes/jit/resolver.ts:11-25`, `registry.ts:19-103`, `register.ts:139-160`.
  Imitates Ember's `ResolverImpl` (`packages/@ember/-internals/glimmer/lib/resolver.ts`:
  `lookupComponent`, `lookupHelper`, `lookupModifier`, with owner `factoryFor`) and the
  `ClassicResolver` interface. Name-to-definition map in a `dict()`, no owner, no
  `factoryFor`, no `template:`/`component:` split, no `-default` helper-manager fallback.
  `CIRCULAR_OBJECT` (`registry.ts:15-20`) is a fake template referrer ("replicate a requirement
  of Ember's template referrers", i.e. it exists to imitate Ember's owner-in-meta).
- Dependents: all tests that call `registerComponent`/`registerHelper`/`registerModifier` on the
  delegate, directly or via a suite; `IT/test/owner-test.ts` subclasses the resolver
  (`OwnerJitRuntimeResolver`, `:1-30`) to fake an owner callback. `@glimmer/owner` is separately
  tested by `packages/@glimmer/owner/test/owner-test.ts` (2 tests).
- Real replacement: a real application instance / `buildOwner` from `internal-test-helpers`
  (`packages/internal-test-helpers/lib/build-owner.ts`) and `owner.register(...)`.
  Strict-mode (`defineComponent`/`defComponent`) tests do not need a resolver at all and are
  not affected.
- Action: delete `owner-test.ts` fake (rewrite 6 tests against a real owner; most already exist as
  `EG/application/engine-test.js`, `mount-test.js`), then replace the registry by the real
  resolver for `registerX` users; port or delete the rest.

### 1.6 Helper and modifier test managers
- `IT/lib/helpers.ts:10-19` (`createHelperRef` = `createComputeRef` over reified args,
  `UserHelper = (positional, named) => unknown`), `register.ts:72-97`
  (`registerHelper`, `registerInternalHelper`, `registerInternalModifier`),
  `IT/lib/modifiers.ts:30-94` (`TestModifierManager`, an `InternalModifierManager`
  with `getTag`/`install`/`update` and `didInsertElement`/`didUpdate`/`willDestroyElement`
  hooks).
- Imitates: `setHelperManager`/`@ember/helper` `helper()` / `invokeHelper` for functions, and
  `setModifierManager`/`ember-modifier` for modifiers. `didInsertElement`/`didUpdate`/`willDestroyElement`
  are the old (pre-3.22) Ember modifier hook names; no real modifier in 3.22+ uses them.
- Dependents (call sites of `registerHelper|registerInternalHelper|registerModifier|registerInternalModifier`
  in tests): `modifiers-test.ts` 25, `updating-test.ts` 13, `ember-component-test.ts` 11,
  `argument-less-helper-paren-less-invoke-test.ts` 7, `strict-mode-test.ts` 4, `fn-test.ts` 3,
  `initial-render-test.ts` 3, `updating-modifiers-test.ts` 3, `attributes-test.ts` 2,
  `style-warnings-test.ts` 2, `array-test.ts` 1, `concat-test.ts` 1, `debug-render-tree-test.ts` 1;
  about 76 sites in 13 test files; plus `suites/initial-render.ts` 22, `components.ts` 5.
  `registerInternalHelper` is used where a test needs raw references
  (`updating-test.ts`, `fn-test.ts`).
- Duplicates: `IT/test/modifiers-test.ts` (17 tests) and `updating-modifiers-test.ts` (3)
  vs `EG/custom-modifier-manager-test.js` (17) and `EG/modifiers/on-test.js` (15); helper tests
  vs `EG/helpers/custom-helper-test.js` (44), `helper-manager-test.js` (15),
  `default-helper-manager-test.js`. `IT/test/managers/helper-manager-test.ts` (23) vs
  `EG/helpers/helper-manager-test.js` (15) and `invoke-helper-test.js`;
  `managers/modifier-manager-test.ts` (9) vs `custom-modifier-manager-test.js` (17).
  Both sides already use the public manager API. The Glimmer copy of the manager tests is
  the more thorough for capability combinations; the Ember copy exercises it through a real owner.
- Real replacement: `defineSimpleHelper`/`defineSimpleModifier` in
  `IT/lib/test-helpers/define.ts:138-189` (public `setHelperManager`/`setModifierManager`) already
  exist, and `@ember/helper` `helper`/`fn`, `@ember/modifier` `on`.
- Action: port `registerHelper` call sites to `defineSimpleHelper` (mechanical, about 55 sites),
  port `registerModifier` sites to `defineSimpleModifier`/class-based `setModifierManager`,
  delete `TestModifierManager`, `createHelperRef`, `registerInternalModifier`. Keep
  `registerInternalHelper` only for the 2-3 reference-level tests until they are rewritten (C6).

### 1.7 Run loop, owner and other Ember shims in `RenderTest`
- `IT/lib/render-test.ts:19,383,409,426,443`: wraps `render`, `rerender`, `destroy` in
  `run()` from `@ember/runloop`. This is the one place where the Glimmer harness uses the real
  thing, but wraps it around hand-driven `result.env.begin()/commit()` (`:431-436`), i.e. half
  real, half fake: Ember's renderer (`packages/@ember/-internals/glimmer/lib/renderer.ts`) does
  `_renderRoots` + `inTransaction`, `RenderTest.rerender` re-implements it.
  Also `setProperties` + `dirtyTagFor(context, key)` as `set` (C1).
- `IT/lib/setup-harness.ts:47-60`: sets up `#qunit`/`#qunit-fixture` elements and
  `debug.resetTrackingTransaction` per test; Ember's `internal-test-helpers` does its own
  fixture setup; two copies of the fixture/QUnit setup in the same page.
- `IT/lib/modes/jit/delegate.ts:98-103`: pre-registers `on`, `fn`, `hash`, `array`, `get`,
  `concat` into the fake registry from `@glimmer/runtime` by name; Ember's resolver gets them
  from the real keyword set (public: `@ember/helper`, `@ember/modifier`).
- Dependents: all tests extending `RenderTest` (79 files in `IT/test`, see T16-coupling).
- Action: after the Glimmer harness uses Ember's renderer (`renderSettled`/`runTask` and
  `Renderer`), these three disappear; this is what the seam work in 09 §9.4 (C1) already
  proposes, and it also removes the fake.

### 1.8 Fake Ember values inside Glimmer tests
- `mut`: `IT/test/helpers/fn-test.ts:242-282` registers a fake `mut` with
  `registerInternalHelper('mut', args => createInvokableRef(first))` (two tests: "can be used on
  the result of `mut`" and "... with a falsy value"). The real `mut` is
  `packages/@ember/-internals/glimmer/lib/helpers/mut.ts` and the same two tests exist under
  the same names at `EG/helpers/fn-test.js:195,208` (plus `EG/helpers/mut-test.js`).
  Action: delete the two Glimmer copies.
- `SafeString`: `makeSafeString` at `IT/test/updating-test.ts:24` (used at `:348,396,422`) and the
  `{toHTML(){}}` literal at `IT/lib/suites/initial-render.ts:884` imitate Ember's `htmlSafe`
  (`@ember/template`) and the `toHTML` protocol of the global context's `isTrusted`/`toHTML`
  hooks. Real: `htmlSafe`; covered by `EG/content-test.js` and `EG/components/classic/content-test.js`.
  Action: replace with `htmlSafe` from `@ember/template`.
- `ember-view` assertions inside shared Glimmer tests: `IT/test/initial-render-test.ts:1199-1261`
  branch on `emberishComponent` and assert `class === "ember-view"` (8 sites); `ember-component-test.ts`
  has 33 `ember-view`/`emberish` hits. Action: goes with 1.1.
- `style-warnings-test.ts:15-30` and `@glimmer/reference/test/references-test.ts:46-60`,
  `@glimmer/validator/test/validators-test.ts:46-58`, `@glimmer/reference/test/utils/template.ts:62-80`
  (`TestContext` with `getProp`, `getPath`, `setProp`, `toIterator`): the host hooks of
  `@glimmer/global-context` re-implemented as plain `Reflect.get/set` and `ObjectIterator`. See 2.3.

### 1.9 Things in the harness that are real (no action)
- `defineComponent`/`defComponent`/`defineSimpleHelper`/`defineSimpleModifier` (public APIs).
- `TemplateOnly` kind (`templateOnlyComponent` from `@glimmer/runtime`, also exported by `@ember/component/template-only`).
- `@glimmer/destroyable`, `@glimmer/owner` (re-exported by `@ember/destroyable`, `@ember/owner`).

## 2. Ember tests emulating Glimmer or bypassing it

### 2.1 `GlimmerishComponent` in Ember's tests
- `packages/@ember/-internals/glimmer/tests/utils/glimmerish-component.js:1-31`: a second,
  weaker copy of the Glimmer harness's `GlimmerishComponent` (no `willDestroy`, no
  `destroyComponent`, `componentCapabilities('3.13', {updateHook:false})`). Imitates
  `@glimmer/component`, which is in this repo and which `EG` tests already import in 10+
  files (`grep "@glimmer/component"`: `unit/template-factory-test.js:7`,
  `unit/runtime-resolver-cache-test.js:8`, `content-test.js`, `mount-test.js`,
  `event-dispatcher-test.js`, `components/life-cycle-test.js`, `contextual-components-test.js`,
  `custom-modifier-manager-test.js`, `error-handling-test.js`, `on-test.js`).
- Dependents (identifier count, file): `render-component-test.ts` 17, `tracked-test.js` 15,
  `runtime-template-compiler-implicit-test.ts` 4, `runtime-template-compiler-explicit-test.ts` 4,
  `strict-mode-test.js` 4, `dynamic-components-test.js` 2, `helpers/get-test.js` 2.
  7 files, about 48 uses, one more shim than needed.
- Action: replace with `import Component from '@glimmer/component'` (mechanical), delete the file.
  Third copy: `IT/lib/components/emberish-glimmer.ts` (1.2). Three implementations of one
  class, one of which is the real `@glimmer/component`.

### 2.2 `PositionalComponent`
- `EG/../utils/positional-component.js:1-60+`: a custom manager (`componentCapabilities('3.13')`,
  `createComponent(Factory, args)`) that emulates classic `positionalParams` on a non-classic
  class, because Glimmer components take only named arguments.
- Dependents: `contextual-components-test.js` 15 uses, `dynamic-components-test.js` 7,
  `curly-components-test.js` 6, `angle-bracket-invocation-test.js` 2 (4 files, 30 uses).
- Imitates: the classic `Component` with `static positionalParams` (real,
  `@ember/component`). These tests are about `{{component}}`/curly/angle invocation of
  something that takes positional params; the real thing is a classic `Component.extend({}).reopenClass({positionalParams: [...]})`
  (the files in `classic/` do that) and `{{helper}}`-style `invokeHelper` for non-component positional params.
- Action: port to real classic components (already the pattern in the `classic/` twin of each
  file); delete the shim. Note this is the reverse direction of 1.1: Ember tests fake classic-ness
  for glimmer components, Glimmer tests fake classic-ness for the VM.

### 2.3 Hand-written host hooks in `@glimmer/*/test`
- `@glimmer/reference/test/references-test.ts:46-60` (12 tests): overrides `getProp`/`setProp`/
  `scheduleRevalidate` with `Reflect`-like fakes; `utils/template.ts:62-80` `TestContext` imitates
  Ember's `toIterator` (`@ember/-internals/glimmer/lib/utils/iterator.ts`) with `ObjectIterator`;
  `iterable-test.ts` (12 tests) tests this fake iteration protocol. *Correction (W2 6.3,
  2026-10-08):* it did not. `iterable-test.ts` installs no global context, so in the shared page
  it already ran on Ember's real `toIterator`; nothing imported `utils/template.ts`. Real: Ember's
  `toIterator`, which handles arrays, `ArrayProxy`, native iterables, `Symbol.iterator`, and
  is tested by `EG/syntax/each-test.js` (28) and `components/classic/each-test.js`.
- `@glimmer/validator/test/validators-test.ts:46-58` (1 of 22): fake `scheduleRevalidate`
  to count calls; Ember's is `backburner` `_scheduleRevalidate`. Not a duplicate; keep it
  but make it observe the real Ember call.
- `IT/test/style-warnings-test.ts:15-30` (5 tests): fake `getProp` and `warnIfStyleNotTrusted`.
  Real: Ember's `warn` for style bindings, tested in `EG/components/attribute-bindings-test.js`
  / `class-bindings-test.js` / `content-test.js` (grep `style`). Action: move to the Ember
  harness using `expectWarning`.
- `@glimmer/manager/test/managers-test.ts` (20 tests): owners are literal `{}` and managers are
  hand-written, and tests assert `getInternalComponentManager`, `instanceof CustomComponentManager`
  (C7). The Ember copy: `EG/custom-component-manager-test.js` (23),
  `custom-modifier-manager-test.js` (17), `helpers/helper-manager-test.js` (15). Action: keep
  the pure-registry parts (they test `@glimmer/manager` in isolation); the render-behavior
  parts duplicate the Ember ones.
- `@glimmer/owner/test/owner-test.ts` (2 tests): not a stub (tests the real symbol), keep.
  `@glimmer/destroyable/test` (24): no Ember stubs, but Ember's `@ember/destroyable` tests
  re-test the same functions through the Ember re-export (not surveyed in detail).

### 2.4 Hand-built templates and wire format in Ember's test infra
- `packages/internal-test-helpers/lib/compile.ts:20-39`: `precompileJSON` + `templateFactory`
  with a hand-assembled `SerializedTemplateWithLazyBlock` (`block: JSON.stringify(block)`,
  `scope: () => reifiedScope`, `isStrictMode`). It imitates what
  `babel-plugin-ember-template-compilation` emits and what `@ember/template-compilation`
  `precompileTemplate` would produce at runtime; the Glimmer harness has an identical copy
  (`IT/lib/compile.ts:20-41`). Consumers: `internal-test-helpers` `compile` export
  (`RenderingTestCase.render` string templates, about 1,600 `this.render(...)` sites) and
  `unit/template-factory-test.js` (checks `__id`/`__meta`).
- Real replacement: `compileTemplate`/`template()` from `ember-template-compiler` via the public
  `@ember/template-compilation` runtime path, or `adapter.compile` of 09 §9.4 seam C.
  These two helpers should become one shared function used by both harnesses.
- Action: unify into one helper (it is the adapter's seam C); no test rewrite.
- `packages/internal-test-helpers/lib/test-resolver.ts:1-60`: a `Resolver` implementing
  `@ember/-internals/owner` `Resolver` with `%`-delimited serialized keys. Real Ember apps use
  `ember-resolver` (not in this repo); this test double is Ember's own registry contract
  (`resolve`), not a Glimmer stub. Keep.
- No fake renderers, fake component managers beyond 2.1 and 2.2, or stubbed `@glimmer/*` modules
  were found in `EG`, `internal-test-helpers`, `@ember/*/tests`, `ember/tests`
  (`grep` for `class (Fake|Mock|Stub)`, `setInternal*Manager`, `createComputeRef`,
  `templateFactory`, `precompileJSON`, `opcode-compiler`: only the hits above). The custom
  managers in `custom-component-manager-test.js:7-60`, `custom-modifier-manager-test.js`,
  `helpers/helper-manager-test.js` are tests *of* the public manager API and should stay.
- Imports of `@glimmer/runtime` for public keywords inside Ember tests: `EG/modifiers/on-test.js:3`
  (`on`), `helpers/invoke-helper-test.js:13` (`invokeHelper`), `components/strict-mode-test.js:16`
  (`hash, array, concat, get, on, fn`), `template-only-components-test.js:3`,
  `application/engine-test.js:17`, `application/debug-render-tree-test.ts:19`
  (`templateOnlyComponent`), `runtime-template-compiler-implicit-test.ts:315-365` (`hash`,
  `array`, `concat`, `get`). Not stubs, but they reach past the public re-export
  (`@ember/helper`, `@ember/modifier`, `@ember/component/template-only`). Mechanical (C8).
- `debug-render-tree-test.ts:1196` (`owner = {}` passed to `renderComponent`): a bare object as
  owner; only valid because `renderComponent` does not look anything up. Low priority.

## 3. Duplicated suites

Counts are `@test` markers. "Stronger" is the copy I would keep.

| Behavior | Glimmer copy | Ember copy | Overlap | Stronger |
|---|---|---|---|---|
| Classic/curly components: positional params, `{{component}}` currying, hooks, attributeBindings, tagName, ids, destruction | `IT/test/ember-component-test.ts` (74) + curly/dynamic fan-out of `IT/lib/suites/emberish-components.ts` (19) | `EG/components/curly-components-test.js` (58), `contextual-components-test.js` (43), `dynamic-components-test.js` (20), `life-cycle-test.js`/`classic/life-cycle-test.js`, `web-component-fallback-test.js`, `will-destroy-element-hook-test.js`, `classic/curly-components-test.js` | Same test names for roughly 40 of the 74 (positional-params block, `{{component}}` helper aliasing/currying block, hooks, attributeBinding null/class, "unique IDs", web-component NonBlock, tagless) | Ember (real classic `Component`, real hook order, real `ember-view`) |
| has-block / has-block-params / yield | `IT/lib/suites/has-block.ts` (27), `has-block-params.ts` (26), `yield.ts` (15) run in 3 kinds | `EG/helpers/yield-test.js` (14), `classic/yield-test.js`, `curly-components-test.js` (`has-block`), `angle-bracket-invocation-test.js` (`has-block`) , `contextual-components-test.js` | Same behaviors; Glimmer is the more exhaustive matrix (every block/inverse/param combination) | Glimmer for coverage, once ported to one invocation form; Ember for the two or three classic-specific cases (`hasBlock` in a classic component's JS, `{{yield}}` with `this.get`) |
| `{{#each}}` | `IT/lib/suites/each.ts` (27), run by `jitSuite(EachSuite)` | `EG/syntax/each-test.js` (28), `classic/each-test.js` | Ember has the same core cases (key, `@index`, `@identity`, duplicates, scope, inverse); Glimmer adds nine "re-iterated via swap #1-9" and "array grows/shrinks during iteration", "autotracked custom iterable". Ember adds ArrayProxy/native-array/holes/GH regressions | Complementary. Glimmer for iteration algorithm, Ember for host iteration protocol (`toIterator`). Merge into one spec chapter list (§05 each) |
| `{{in-element}}` | `IT/lib/suites/in-element.ts` (13) | `EG/syntax/public-in-element-test.js` (8) | basic render, `insertBefore`, cleanup, "components are destroyed"/"cleaned up" | Glimmer (more cases: update remote element, loop, constructing element). Ember adds the 3 assertion cases (non-null insertBefore, null/undefined destination), which Glimmer lacks |
| `fn`, `hash`, `array`, `get`, `concat` | `IT/test/helpers/*.ts` (13, 8, 11, 19, 4) | `EG/helpers/*.js` (10, 9, 12, 21, 4) | Near-identical names, e.g. `fn`: "updates when arguments change", "updates when the function changes", "partially applies each layer when nested [GH#17959]", "can be used on the result of `mut`" (+ falsy) | Ember: it uses real `mut` and real owner. Glimmer's two `mut` tests use a fake. Delete the Glimmer copies after diffing for any unique case |
| `on` modifier | `IT/test/modifiers/on-test.ts` (19), `keywords/on-runtime-test.ts` (3) | `EG/modifiers/on-test.js` (15) | most | Glimmer is larger; both run the real `on`; merge |
| Custom modifier manager | `IT/test/managers/modifier-manager-test.ts` (9), `modifiers-test.ts` (17), `updating-modifiers-test.ts` (3) | `EG/custom-modifier-manager-test.js` (17) | managers: capability and lifecycle behaviors | Ember for the owner-injection and error messages. `modifiers-test.ts` runs on the fake `TestModifierManager` and has no direct counterpart; port to `defineSimpleModifier`, not delete |
| Custom helper manager | `IT/test/managers/helper-manager-test.ts` (23) | `EG/helpers/helper-manager-test.js` (15), `custom-helper-test.js` (44), `invoke-helper-test.js` | capabilities, tracking, destroy | Glimmer on capability combinations, Ember on `helper()`/class helper/owner |
| Custom component manager | `@glimmer/manager/test/managers-test.ts` (20) | `EG/custom-component-manager-test.js` (23) | create/update/destroy hook order | Ember (through render); keep the manager-level pure tests |
| Strict mode and lexical scope | `IT/test/strict-mode-test.ts` (94), `lexical-scope-test.ts` | `EG/components/strict-mode-test.js` (22), `runtime-template-compiler-*.ts` | strict-mode component/helper/modifier resolution | Glimmer by count; neither uses a stub except `registerHelper/registerModifier` (4 sites in the Glimmer copy) |
| `if`/`unless` | `IT/test/syntax/if-unless-test.ts` (11) | `EG/syntax/if-unless-test.js` (2) + `helpers/if-unless-test.js` + `shared-conditional-tests.js` | truthiness cases. *Correction (W2 7.1i):* none; the IT file is a compile-time syntax-error suite (argument-count errors), not a truthiness suite | Ember (real `toBool`: `isArray`, proxies, `isTruthy`); the IT file has no twin and stays |
| Tracked / collections | `IT/test/tracked-value-test.ts` (3), `collections/*` (6 files) | `EG/helpers/tracked-test.js` (10), `components/tracked-test.js` (27), `@ember/-internals/metal/tests/tracked/*`, `@ember/reactive` | tracked rendering updates | Ember; collections are Glimmer-only (no Ember twin) |
| Debug render tree | `IT/test/debug-render-tree-test.ts` (13 on `DebugRenderTreeDelegate` using `EmberishCurlyComponent`) | `EG/application/debug-render-tree-test.ts` (16) | same API, `captureRenderTree` | Ember (real owner, real classic component and `{{outlet}}`/engine nodes); keep Glimmer only for strict-mode/template-only shapes |
| `owner` handling | `IT/test/owner-test.ts` (6) on fake resolver + fake classic | `EG/application/engine-test.js`, `mount-test.js`, `@glimmer/owner/test` | owner threaded to helper/modifier/component managers | Ember |
| `style` warning | `IT/test/style-warnings-test.ts` (5) | style cases in `EG/components/attribute-bindings-test.js`, `content-test.js` | warn on untrusted style | Ember (real warn); move |
| SSR / rehydration | `IT/lib/suites/ssr.ts` (30), `initial-render.ts` Rehydration (88 via 2 suites), `partial-rehydration-test.ts`, `chaos-rehydration-test.ts` | none (Ember has no SSR suite in this repo; FastBoot lives elsewhere) | n/a | Glimmer only. It uses the fake registry and fake classic component (`RehydratingComponents`, `ServerSideComponentSuite` x 3 kinds). Not a duplicate, but affected by 1.3 |
| Run-loop settle | `IT/test/render-test.ts` | `EG/render-settled-test.js` | n/a | Ember |

*Correction (W2 step 7, 2026-10-08):* the "Overlap" column overstates the duplication. Test-for-test
duplicates exist only for the `fn`/`hash`/`array`/`get`/`concat` helpers, `{{on}}`, and the custom
modifier and helper manager suites. `{{#each}}`, `{{in-element}}`, strict mode, `if`/`unless`,
tracked/collections and `render-test` are complementary or unrelated, and the "capability
combinations" advantage of the Glimmer helper-manager copy no longer holds (the Ember file has
those tests too). Details per row in `W2-glimmer-harness.md` 7.1a–7.1k.

Also duplicated infrastructure rather than tests: two `GlimmerishComponent`s (2.1, 1.2), two
`compile` helpers (2.4), two QUnit/fixture setups (`IT/lib/setup-harness.ts` vs
`internal-test-helpers`), two `assertHTML`/`equalTokens` implementations
(`IT/lib/dom/assertions.ts` vs `internal-test-helpers/lib/equal-tokens.ts`; not examined in detail).

## 4. Summary

Ordered by impact (dependent tests, then how fake the thing is).

| Stub | Imitates | Real replacement | Dependent tests | Action |
|---|---|---|---|---|
| `EmberishCurlyComponent` + manager (`IT/lib/components/emberish-curly.ts`) | classic `Component` + `CurlyComponentManager` | `@ember/component` classic `Component` via the Ember harness | about 160 fan-out tests (Curly+Dynamic) + `ember-component-test.ts` 74 + `owner-test.ts` 6 + `input-range-test.ts` 5 + `debug-render-tree-test.ts` 5 uses + Rehydration/SSR component suites (about 100 more via 3 kinds) | Delete. Port the roughly 10 tests with no Ember twin to `@glimmer/component`; drop the rest as duplicates |
| `Curly`/`Dynamic` kinds and `componentModule` fan-out (`module.ts:113-197`, `render-test.ts:221-310`) | running each test under classic invocation | one invocation form per test; curly invocation through a real owner | same as above | Stop the fan-out (collapse to Glimmer + TemplateOnly); delete `buildCurlyComponent`/`buildDynamicComponent` |
| `BaseEnv` queues (no callers, see the §1.4 correction) + hand-driven `env.begin()/commit()` (`base-env.ts`, `render-test.ts:431-446`) | `EmberEnvironmentDelegate` + Ember renderer transaction | Ember's delegate and renderer; `renderSettled` | every test in `IT/test` (about 79 files) | Replace by the real delegate (this is 09 C1/W2) |
| `TestJitRuntimeResolver` / `TestJitRegistry` / `CIRCULAR_OBJECT` | `ResolverImpl` + owner `factoryFor` | `buildOwner` + `owner.register` | every test using `registerComponent/Helper/Modifier` (about 150 sites in 22 files), `owner-test.ts` 6 | Replace with real resolver; `owner-test.ts` delete (Ember has twins) |
| `TestModifierManager`, `registerModifier`, `registerHelper`, `createHelperRef` | `ember-modifier`/`@ember/helper` | `defineSimpleHelper`/`defineSimpleModifier` (`IT/lib/test-helpers/define.ts:138-189`, public managers) | about 76 call sites in 13 test files | Port to the public-manager helpers (mechanical); delete the managers |
| `registerInternalHelper` with `createInvokableRef` for `mut` (`fn-test.ts:243,263`) | Ember's `mut` helper | real `mut` | 2 tests | Delete (twins at `EG/helpers/fn-test.js:195,208`) |
| `registerInternalHelper` with const/compute refs (`updating-test.ts:395-505`, 6) | reference-level helper | plain helpers via `defineSimpleHelper`; `htmlSafe` for SafeString | 6 tests + 3 (`makeSafeString`) | Rewrite as plain helpers (C6); keep 1-2 destroyable tests as `@glimmer/destroyable` unit tests |
| `GlimmerishComponent` (Glimmer harness) | `@glimmer/component` | `@glimmer/component` | about 42 files, all `Glimmer`-kind registrations | Replace import; delete |
| `GlimmerishComponent` (Ember tests, `tests/utils/glimmerish-component.js`) | `@glimmer/component` | `@glimmer/component` | 7 files, about 48 uses | Replace import; delete |
| `PositionalComponent` (`tests/utils/positional-component.js`) | classic `positionalParams` on a non-classic class | real classic `Component` with `positionalParams` | 4 files, 30 uses | Port to classic components (the `classic/` twins already do) |
| `makeSafeString`, `{toHTML}` literal | `htmlSafe`/`SafeString` | `htmlSafe` from `@ember/template` | about 5 tests | Replace |
| Host-hook fakes in `@glimmer/*/test` (`TestContext`, `testOverrideGlobalContext` in `reference`, `validator`, `style-warnings`) | Ember's global-context hooks (`getProp`, `toIterator`, `scheduleRevalidate`, `warnIfStyleNotTrusted`) | Ember's real hooks (already installed in the shared page) | references-test 12 + iterable-test 12 + validators-test 1 + style-warnings 5 | `style-warnings` and `iterable-test` port to Ember harness; `references-test`/`validators-test` are implementation tests of the reactive core (keep, but they are exactly the "tags/references are not normative" class; leave outside the conformance suite) |
| `internal-test-helpers/lib/compile.ts` + `IT/lib/compile.ts` | build-time template compiler | one shared `compile` (09 seam C) | about 1,600 `render` sites (no test change) | Unify, not delete |
| Public keywords imported from `@glimmer/runtime` in Ember tests | `@ember/helper`, `@ember/modifier` | those | 8 files | Mechanical import swap (C8) |
| `ember-view` branches in shared tests (`initial-render-test.ts:1199-1261`) | classic wrapper element | removed with 1.1 | 8 sites | Delete with the Curly kind |
| `TestJitRegistry` pre-registration of `on/fn/hash/array/get/concat` (`delegate.ts:98-103`) | built-in keywords through the owner | real resolver | whole harness | Goes with the resolver |

Keep (not fakes): tests of the public manager API (`custom-*-manager-test.js`, `managers-test.ts`
registry-level parts), `internal-test-helpers/lib/test-resolver.ts` (Ember registry contract),
`defineComponent`/`defComponent`/`defineSimpleHelper`/`defineSimpleModifier`,
`templateOnlyComponent` (also public), `@glimmer/owner` and `@glimmer/destroyable` unit tests,
Glimmer-only suites with no Ember twin (collections, rehydration, SSR, `each` swap sequences,
`in-element` update cases), `@glimmer/validator`/`reference` core tests as implementation tests.

### Recommended sequence
1. Mechanical, no risk: swap both `GlimmerishComponent`s for `@glimmer/component`
   (about 50 files); swap `@glimmer/runtime` keyword imports in Ember tests for `@ember/helper` and `@ember/modifier`.
2. Delete the two fake-`mut` tests, the fake-SafeString cases and `owner-test.ts`; delete
   `ember-component-test.ts` tests that have same-name twins in `EG` (diff first; keep about 10).
3. Port `registerHelper`/`registerModifier` to `defineSimpleHelper`/`defineSimpleModifier`;
   delete `TestModifierManager`, `createHelperRef`, `registerInternalModifier`; rewrite the 6
   `updating-test.ts` internal helpers.
4. Collapse `componentModule` to Glimmer + TemplateOnly (+ a curly-invocation variant through a
   real owner); delete the Curly/Dynamic kinds, `EmberishCurlyComponent`, the `ember-view`
   branches, `RehydratingComponents` curly cases. Biggest deletion (about 160 fan-out tests).
5. Replace `BaseEnv`, the registry/resolver and the hand-driven transaction code by Ember's
   `EmberEnvironmentDelegate`, resolver and renderer (09 W2/C1). Unify the two `compile` helpers.
6. Port `style-warnings-test.ts` and `PositionalComponent` users to real classic components;
   move `iterable-test.ts` onto Ember's `toIterator`.
7. Merge the duplicated suites (table in section 3), keeping the stronger copy.
