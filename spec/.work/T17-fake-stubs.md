# T17 fake-stub survey (B1)

Ruling (Q6): Glimmer was written in another repo, so Ember and Glimmer each test fake stubs of
the other. Everything remaining is flagged for elimination. Glimmer tests now run in Ember's
page (one `index.html`, Ember's global context), so the real thing is available to both.

## Checklist
- [x] 1. Glimmer harness emulating Ember
- [ ] 2. Ember tests emulating Glimmer / bypassing it
- [ ] 3. Duplicated suites
- [ ] 4. Summary table and sequence

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
  (`packages/@glimmer/component/src/addon/-private/component.ts` and its manager
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

### 1.8 Things in the harness that are real (no action)
- `defineComponent`/`defComponent`/`defineSimpleHelper`/`defineSimpleModifier` (public APIs).
- `TemplateOnly` kind (`templateOnlyComponent` from `@glimmer/runtime`, also exported by `@ember/component/template-only`).
- `@glimmer/destroyable`, `@glimmer/owner` (re-exported by `@ember/destroyable`, `@ember/owner`).
