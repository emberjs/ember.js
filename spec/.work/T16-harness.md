# T16 harness survey

- [x] 1. Glimmer integration-test harness
- [x] 2. Ember harness (internal-test-helpers)
- [x] 3. Other harness-like patterns
- [x] 4. Seam proposal + how tests are run

All paths repo-relative. `IT` = `packages/@glimmer-workspace/integration-tests`.

---

## 1. Glimmer integration-test harness (`IT/lib`, `IT/test`)

### 1.1 Shape of the thing

* ~9.7k lines in `IT/lib`, ~12.6k lines in `IT/test` (~60 test files). Public barrel: `IT/index.ts:1-27`
  (re-exports lib/*). Tests import everything from `@glimmer-workspace/integration-tests`.
* A test is a **class extending `RenderTest`** with a `static suiteName` and methods decorated `@test`.
  A *suite function* instantiates the class once per test with a fresh **`RenderDelegate`**.
  The delegate is the *only* implementation seam: everything implementation-specific
  (compiling, registering, rendering, DOM builder) is behind it. `RenderTest` itself, however, also
  leaks internals (see 1.5).
* All Glimmer tests run in the **same browser page as Ember's tests** (`index.html:56-80` globs
  `packages/{@glimmer,@glimmer-workspace}/*/test/**/*-test.ts`). Consequently the Glimmer harness
  runs under **Ember's global context** (`@glimmer/global-context`), installed as an import-time side
  effect of `packages/@ember/-internals/glimmer/lib/environment.ts:22-` (scheduleRevalidate ->
  backburner, `toBool`, `toIterator`, `getProp/setProp/getPath/setPath`, `scheduleDestroy` ->
  `schedule('actions')`, `scheduleDestroyed` -> `schedule('destroy')`, `warnIfStyleNotTrusted`,
  `assert`, `deprecate`). `RenderTest.render/rerender/destroy` wrap work in `run()` from
  `@ember/runloop` (`IT/lib/render-test.ts:19,386,421-431,443`). So the "Glimmer" harness is not
  Ember-free; the global context *is* the host-integration contract (spec: ch. 07 / host hooks).

### 1.2 `RenderDelegate` interface (`IT/lib/render-delegate.ts:25-61`)

| Method | Meaning | Spec-observable? | Spec-level replacement |
|---|---|---|---|
| `getInitialElement(): SimpleElement` | Container the test renders into. JIT: `#qunit-fixture` if a browser doc, else a fresh `div` (`modes/jit/delegate.ts:121-127`); rehydration: new `div` on client doc (`rehydration/delegate.ts:86`) | Harness plumbing | Keep; DOM-only |
| `createElement/createTextNode/createElementNS/createDocumentFragment` | Thin passthrough to the delegate's `SimpleDocument` (`jit/delegate.ts:129-143`). Used by tests that build expected DOM / call `assertElementShape` | Harness plumbing | Keep (DOM only). `SimpleDocument` (`@simple-dom`) is a DOM-subset abstraction; a new impl must render into it or a real `Document` |
| `registerComponent(type, testType, name, layout, Class?)` | Register a component under a *classic-resolver name*, with `type` in `Glimmer|Curly|Dynamic|TemplateOnly` (see 1.4). Jit impl: `modes/jit/register.ts:110-137` | **Yes**: component name resolution in loose mode (name -> definition), `setComponentTemplate`, managers | `registerComponent(kind, name, layoutSource, Class)` in adapter; impl decides how names resolve (ch. loose-mode resolution) |
| `registerPlugin(plugin: ASTPluginBuilder)` | Add an AST plugin used on every subsequent compile (`jit/delegate.ts:149`, `precompileOptions` at 235-241) | **Public-ish**: AST plugins are a template-compiler API (ember-template-compiler `plugins.ast`). AST node shapes are `@glimmer/syntax` types | Adapter `compile(src, {plugins})`. Requires impl to expose `@glimmer/syntax`-compatible AST to plugins; if AST transforms are a spec non-goal (MEMORY note), plugin-using tests must be tagged "needs-ast-plugins" |
| `registerHelper(name, (args, named)=>unknown)` | Classic helper: wraps in `createComputeRef` + `reifyPositional/Named`, registers via `setInternalHelperManager` (`register.ts:72-77`, `helpers.ts:10-15`) | **Yes** (helper invoked with (positional[], named{}), re-evaluated on tracked dep change) | `registerHelper(name, fn)` |
| `registerInternalHelper(name, Helper)` | Registers a raw Glimmer-VM `Helper` (`(args: CapturedArguments, vm) => Reference`) (`register.ts:79-87`) | **No** - VM/Reference internals | Drop, or re-express as plain helper. Used by few tests; see grep in 1.5 |
| `registerModifier(name, Class)` | Registers a `TestModifierManager` (custom `InternalModifierManager`: create/getTag/install/update/getDestroyable) (`modifiers.ts:30-84`, `register.ts:99-108`) | Hooks (didInsertElement/didUpdate/willDestroyElement) timing is observable; the manager shape is internal (`getTag`, `UpdatableTag`) | Public `setModifierManager` + `modifierCapabilities('3.22')` manager (as in `test-helpers/define.ts:57-89`) |
| `renderTemplate(template, context, element, snapshotFn): RenderResult` | Compile `template` *loose-mode* against the registry, render with `this = context` into `element`, return a `RenderResult`. `snapshotFn` lets the delegate call back to snapshot DOM mid-way (used by rehydration: server-side output snapshot) | **Yes** (core) | `render(source, context, element)` returning an opaque handle with `rerender()`/`destroy()` |
| `renderComponent?(component, args, element, dynamicScope?)` | Optional. Render a *component definition object* (strict-mode, `defineComponent`) with args directly, no template string. Only JIT delegate implements it (`jit/delegate.ts:221-233`) | **Yes** (strict-mode / `renderComponent` API; `@glimmer/runtime` `renderComponent` is a public-ish low-level API) | `renderComponent(definition, args, element)`; `dynamicScope` only for `-with-dynamic-vars` tests - internal |
| `getElementBuilder(env, cursor): TreeBuilder` | Choose DOM builder: `clientBuilder` (JIT), `serializeBuilder` (SSR), `debugRehydrateTree` (rehydration) (`jit/delegate.ts:189`, `custom-dom-helper.ts:`, `rehydration/delegate.ts:106-112`) | Builder choice is a mode switch: client vs SSR-serialized (`<!--%glmr%-->` markers) vs rehydrate. Output serialization is observable (ch. SSR/rehydration) | Adapter mode flag `{mode:'client'|'serialize'|'rehydrate'}` |
| `getSelf(env, context): Reference` | Build the `this` Reference (`createConstRef(context,'this')`) (`jit/delegate.ts:193-199`) | **No** (Reference) | Hidden inside `render(...)` |

Extra, non-interface members used by tests via subclassing/casting: `JitRenderDelegate.context`
(`EvaluationContext`), `.getCapturedRenderTree()` (`jit/delegate.ts:114-119`), `.createCurriedComponent`,
`.compileTemplate` (returns `HandleResult` - VM handle!), `registry`, `resolver` (protected). Rehydration
adds `renderServerSide`, `renderClientSide`, `serialize`, `rehydrationStats.clearedNodes`
(`rehydration/delegate.ts:114-168`); `PartialRehydrationDelegate` adds `renderComponentServerSide/ClientSide`
(`partial-rehydration-delegate.ts`).

### 1.3 Delegates that exist

| Class | File | `style` | Notes |
|---|---|---|---|
| `JitRenderDelegate` | `IT/lib/modes/jit/delegate.ts:76` | `jit` | Main. Builds an `EvaluationContext` with `artifacts()`, `runtimeOptions`, `EvaluationContextImpl`, `RuntimeOpImpl` (`:60-74`). Pre-registers `on` modifier and `fn/hash/array/get/concat` helpers into registry (`:98-103`) |
| `NodeJitRenderDelegate` | `IT/lib/modes/node/env.ts:21` | `node jit` | Same but `doc = createHTMLDocument()` (`@simple-dom/document`) - no real DOM. `AbstractNodeTest` overrides `assertHTML` to serialize via `@simple-dom/serializer` (`:30-51`) |
| `JitSerializationDelegate` | `IT/lib/suites/custom-dom-helper.ts:` | `jit serialization` | Node delegate with `serializeBuilder` (emits `%glmr%` block markers) |
| `RehydrationDelegate` | `IT/lib/modes/rehydration/delegate.ts:50` | `rehydration` | Two independent contexts+registries (client & server); `renderTemplate` = SSR serialize -> `replaceHTML` -> client rehydrate via `debugRehydrateTree` (`modes/rehydration/builder.ts`) |
| `PartialRehydrationDelegate` | `.../partial-rehydration-delegate.ts` | `rehydration` | Component-level SSR+rehydrate with `renderComponent` |
| (subclasses in tests) | `IT/test/debug-render-tree-test.ts:56` `DebugRenderTreeDelegate extends JitRenderDelegate` (custom `env` with `enableDebugTooling: true`), `chaos-rehydration-test.ts`, `ember-component-test.ts` (`JitRenderDelegate`), `env-test.ts`, `style-warnings-test.ts` | | |

`isEager` is a vestigial static (`jit/delegate.ts:77`; `test-helpers/module.ts:236-248` - always runs
because typed arrays exist). `RenderDelegateOptions` = `{doc?, env?: EnvironmentDelegate, resolver?}`
(`render-delegate.ts:21-25`); `EnvironmentDelegate` (`isInteractive`, `enableDebugTooling`,
`onTransactionCommit`) is `@glimmer/runtime` internal, default `BaseEnv` in `IT/lib/base-env.ts:20-35`
(it also drains `scheduleWillDestroy`/`scheduleDidDestroy` queues on commit - a manual destroy scheduler).

### 1.4 Component "kinds" and how invoked

`ComponentKind = Glimmer|Curly|Dynamic|TemplateOnly|Custom|unknown` (`IT/lib/components/types.ts:7`).
`RenderTest.testType` is set by the suite; `registerComponent(type,...)` forwards (`render-test.ts:99-106`).
`RenderTest.buildComponent(blueprint)` (`render-test.ts:108-130`) turns a `ComponentBlueprint`
`{layout, tag, else, template, name, args, attributes, layoutAttributes, blockParams}` (`types.ts:22-32`)
into an **invocation string** depending on `testType`:

* **Glimmer** (`buildGlimmerComponent`, `render-test.ts:221`): angle-bracket `<TestComponent @a={{..}} attr=..>`; class
  `GlimmerishComponent` (`IT/lib/components/emberish-glimmer.ts:8`) with a public-API-style manager
  (`componentCapabilities('3.13',{destructor:true})`, `setComponentManager`) -> *spec-observable* (the
  manager API is definitive per CONVENTIONS). Registered name must not contain `-` (`register.ts:64`).
* **Curly** (`buildCurlyComponent`, `:254`): `{{test-component a=b}}` / block form; class `EmberishCurlyComponent`
  (`components/emberish-curly.ts:~50-325`) with a *custom internal manager* (`setInternalComponentManager`,
  `WithCreateInstance`, `WithDynamicLayout`, `WithDynamicTagName`, `dirtinessTag`, `didReceiveAttrs`, `didInsertElement`... hooks,
  wrapper `<div class="ember-view" id="ember123">`). Emulates classic Ember components (curly invocation, `positionalParams`,
  `attributeBindings`, `tagName`). *Mostly internal manager API but encodes classic behavior* (hook order is the spec-observable part).
* **Dynamic** (`buildDynamicComponent`, `:305`): `{{component this.componentName ...}}` with the Curly class, registering a
  helper layout.
* **TemplateOnly** (`buildTemplateOnlyComponent`, `:296`): `templateOnlyComponent()` (`@glimmer/runtime`) with `<TestComponent>` invocation.
* **Custom/unknown**: tests that do their own thing.

`componentModule` (`IT/lib/test-helpers/module.ts:113-197`) fans each `@test` out across kinds: no `kind` => run for
glimmer + curly + dynamic; `@test({kind:'curly'})` => curly + dynamic; `{kind:'glimmer'}`; `{kind:'templateOnly'}`;
`{skip:'glimmer'|...|true}` (decorator in `IT/lib/test-decorator.ts:18-54`; supports legacy and stable decorators). QUnit
module names: `[integration] <style> :: Components :: <suiteName>` -> nested `[integration] Glimmer|Curly|Dynamic|TemplateOnly`.

Strict-mode components do **not** use kinds: `defineComponent(scope, src, {definition?, strictMode?, keywords?})`
(`IT/lib/test-helpers/define.ts:118-136`) = `createTemplate(src, {strictMode, keywords}, scope)` +
`setComponentTemplate(factory, definition ?? templateOnlyComponent())`; `defComponent` (:105-116) always strict. Used with
`this.renderComponent(Def, args)` (`render-test.ts:~395-417`). `defineSimpleHelper/Modifier` use public `setHelperManager`/`setModifierManager`
with `helperCapabilities('3.23')`/`modifierCapabilities('3.22')` (:138-144); `TestHelper` base uses `setHelperManager` + `setOwner` (:174-189).
These are the **most implementation-neutral** hooks in the harness (public manager APIs + `setComponentTemplate`).

### 1.5 Suite registration (`jitSuite`, `suite`, `@test`)

`IT/lib/test-helpers/module.ts`:
* `suite(klass, Delegate, {componentModule?, env?})` (`:65-111`). Non-component: `QUnit.module('[integration] ${Delegate.style} :: ${suiteName}')`
  with `beforeEach` `new klass(new Delegate({env}))` + `instance.beforeEach?()`, `afterEach` -> `instance.afterEach?()`. For each
  `@test`-marked method found on the prototype chain (`testFunctions`, `:263-280`) -> `QUnit.test(name, assert => test.call(instance, assert, instance.count); instance.count.assert())`;
  skipped -> `QUnit.skip`. Component: `componentModule` (above), constructing `new Delegate()` per test (no `env` option!, `:134`).
* Wrappers: `jitSuite` (`:19`), `jitComponentSuite` (`:39`), `nodeSuite` (`:26`), `nodeComponentSuite` (`:33`), `jitSerializeSuite` (`:45`), `componentSuite(klass, Delegate)` (`:58`).
* **There is no hard-coded delegate choice outside module.ts and a handful of test files** that call `suite(X, SomeDelegate)` directly
  (`IT/test/node-suites-node-test.ts:17-22`, `debug-render-tree-test.ts`, `chaos-rehydration-test.ts`, `ember-component-test.ts`, `partial-rehydration-test.ts`).
  So a single `jitSuite -> suite(klass, DefaultDelegate)` swap covers most tests; direct `JitRenderDelegate`
  subclasses / imports need adapter-izing separately.
* Registrations in tests: `IT/test/jit-suites-test.ts:1-30` registers the shared lib suites (`EachSuite`, `InElementSuite`, `GlimmerishComponents`,
  `TemplateOnlyComponents`, `EmberishComponentTests`, `HasBlockSuite`, `YieldSuite`, `ScopeSuite`, `ShadowingSuite`, `WithDynamicVarsSuite`, `DebuggerSuite` ...);
  suite sources live in `IT/lib/suites/*.ts` (initial-render is registered via `IT/test/initial-render-test.ts`).
* `Count` (`render-test.ts:43-56`) is a per-test hook-call counter `count.expect(name)`; asserted after each test.

### 1.6 How templates are compiled (`IT/lib/compile.ts`)

* `createTemplate(src, options={}, scopeValues={}) -> TemplateFactory` (`compile.ts:20-41`):
  1. `precompileJSON(src, options)` from `@glimmer/compiler` -> `[block, usedLocals]` (wire-format **JSON**)
  2. builds `SerializedTemplateWithLazyBlock {id, block: JSON.stringify(block), moduleName, scope: ()=>reifiedScope|null, isStrictMode}`
  3. `templateFactory(templateBlock)` from `@glimmer/opcode-compiler` -> `TemplateFactory` (callable `factory(owner?) -> Template`).
* `preprocess(src, opts) -> Template` = `createTemplate(src,opts)({})` (`:14-16`).
* Loose-mode render: `renderTemplate` (`modes/jit/render.ts:9-20`): `preprocess` -> `unwrapTemplate(t).asLayout()` -> `renderMain(context, {}, self, builder, layout)` -> `renderSync(context.env, iterator)`.
* Component layout compile: `templateFactory(CIRCULAR_OBJECT)` inside `TestJitRegistry.lookupComponent` (`modes/jit/registry.ts:77-102`) - note the `CIRCULAR_OBJECT` owner emulating Ember's rule that template meta must not be serializable.
* Locals/scope: `options.locals = Object.keys(scopeValues)`; `scope: () => reifiedScope` (only *used* locals). `strictMode`, `keywords` from `PrecompileOptions`.
* **Spec-level replacement:** `compile(source, {strictMode, locals/scope, moduleName, keywords, plugins}) -> TemplateFactory`-like thing
  `(owner) -> Template` that can be attached with `setComponentTemplate(factory, def)` and rendered via `renderComponent`. This matches the *public* shape in
  `@ember/template-compiler` (`template(src, {scope, strictMode,...})` - see 3.9) far better than `precompileJSON`.

### 1.7 Rerender / settle

* `RenderTest.set(key,v)` = `this.context[key]=v; dirtyTagFor(this.context,key)` (`render-test.ts:629-632`) - **notifies via `@glimmer/validator` tags directly**
  (so the "context" object is a plain object auto-tracked by tag, *not* by `@tracked`). Replacement: `tracked`/`TrackedObject`-based context or `trackedObj` (`IT/lib/test-helpers/tracked-object.ts`, also validator-based) or
  an adapter-provided `set(context,key,value)`.
* `rerender(props?)` (`:419-438`): `run(() => { setProperties; result.env.begin(); result.rerender(); result.env.commit(); })`. `RenderResult` (`@glimmer/interfaces`) has `.env`, `.rerender()`, and is the argument to `destroy`.
  Replacement: `handle.rerender()` / `await settled()`; harness is synchronous (QUnit tests don't await).
* `runTask(cb)` in RenderTest is **identity** (`:807-809`) - a stub; real scheduling is `run()` (backburner).
* `destroy()` (`:440-446`): `run(() => inTransaction(result.env, () => destroy(result)))`, uses `@glimmer/destroyable` `destroy` + `@glimmer/runtime` `inTransaction`.
* `assertStableRerender()` (`:674-678`): take DOM-node snapshot, rerender, `assertStableNodes` -> compares **node identity** before/after (`snapshot.ts`, `takeSnapshot` `:640-672`, `normalizeSnapshot`). Node-identity stability is **spec-observable** (no unnecessary DOM replacement). Replacement: keep verbatim (pure DOM).
* HTML assertions: `assertHTML` -> `equalTokens` (`snapshot.ts`) via `simple-html-tokenizer`, token-wise comparison ignoring attr order/quoting. `assertComponent`/`assertEmberishElement`/`assertElementShape` (`dom/assertions.ts`) check wrapper `div.ember-view`. All DOM-only: **reusable as-is**.

### 1.8 Non-public `@glimmer/*` imports

Harness `IT/lib` (counted via grep): `@glimmer/interfaces` (types, ~all files), `@glimmer/runtime`, `@glimmer/validator`, `@glimmer/reference`, `@glimmer/manager`, `@glimmer/util`,
`@glimmer/debug-util`, `@glimmer/destroyable`, `@glimmer/opcode-compiler`, `@glimmer/program`, `@glimmer/compiler`, `@glimmer/syntax`, `@glimmer/node`, `@glimmer/constants`, `@glimmer/owner`, `@glimmer/env`, `@glimmer/local-debug-flags`, `@ember/runloop`.

| Import (file:line) | What it's for | Class | Replacement |
|---|---|---|---|
| `@glimmer/opcode-compiler` `EvaluationContextImpl`, `templateFactory` (`jit/delegate.ts:23,73`; `compile.ts:9,40`) | build VM evaluation context; make template factory from serialized wire JSON | **Impl detail** | adapter `compile()` |
| `@glimmer/program` `artifacts`, `RuntimeOpImpl` (`jit/delegate.ts:24,65,73`) | bytecode heap/constant pool | **Impl detail** (VM) | none needed |
| `@glimmer/compiler` `precompileJSON` (`compile.ts:8,26`), `precompile` (`custom-dom-helper.ts:2`, `precompile-test.ts:4`) | template -> wire format | **Impl detail** (wire format non-goal); `precompile` as an *API* is public (ember-template-compiler) | adapter `compile` |
| `@glimmer/runtime` `renderMain`, `renderSync`, `renderComponent`, `runtimeOptions`, `clientBuilder`, `inTransaction`, `curry`, `templateOnlyComponent`, `reifyNamed/Positional`, `DynamicScopeImpl`, `EnvironmentDelegate`, `EnvironmentImpl`, `normalizeProperty`, `array/concat/fn/get/hash/on`, `setDebuggerCallback`, `TemplateOnlyComponentManager`, `EMPTY_ARGS` | execute templates | Mixed: `renderComponent`, `templateOnlyComponent`, `array/concat/fn/get/hash/on` (keywords/built-ins; also re-exported from `@ember/helper`/`@ember/modifier`) are **spec-observable** (public-ish); `renderMain`, `renderSync`, `runtimeOptions`, `clientBuilder`, `inTransaction`, `curry`, `DynamicScopeImpl`, `EnvironmentImpl`, `EMPTY_ARGS`, `TemplateOnlyComponentManager`, `reify*` are **VM internals**; `setDebuggerCallback` backs `{{debugger}}` (observable, test hook) | see 4 |
| `@glimmer/reference` `createConstRef`, `createComputeRef`, `createPrimitiveRef`, `childRefFor`, `valueForRef`, `createInvokableRef`, `NULL_REFERENCE`, `IteratorDelegate` | `this` ref, helper refs, curly attr refs (`emberish-curly.ts`), `NativeIteratorDelegate` | **Impl detail** (CONVENTIONS: Reference not normative) | context object + JS functions; helper = plain function |
| `@glimmer/validator` `dirtyTagFor`, `tagFor`, `consumeTag`, `createTag`, `dirtyTag`, `createUpdatableTag`, `debug.resetTrackingTransaction`, `trackedArray/Map/Set/WeakMap/WeakSet/Object/Value` (tests) | notify/consume tags | Tags = **impl detail**; `trackedX` collections and `tracked` = **spec-observable (ch. 07)**. `debug.resetTrackingTransaction` (`setup-harness.ts:60`) resets a DEBUG-only autotracking-transaction guard | spec abstract model: `tracked`, `TrackedObject`, `cell`... ; `dirtyTagFor(context,key)` -> `set`-like |
| `@glimmer/manager` `setInternalComponentManager`, `setInternalHelperManager`, `setInternalModifierManager`, `getInternalComponentManager`, `getInternalModifierManager`, `getComponentTemplate`, `componentCapabilities`, `helperCapabilities`, `modifierCapabilities`, `setComponentManager`, `setHelperManager`, `setModifierManager`, `setComponentTemplate` | register things | Public manager API (`set*Manager`, `*Capabilities`, `setComponentTemplate`) = **spec-observable**; `*Internal*Manager` = **impl detail** | use public API only; Curly emulation needs an internal-manager-equivalent (see 4.3) |
| `@glimmer/destroyable` `destroy`, `registerDestructor`, `isDestroying/isDestroyed` | lifecycle | **spec-observable** (public Ember API via `@ember/destroyable`) | as-is |
| `@glimmer/owner` `setOwner/getOwner` | owner | spec-observable (`@ember/owner`) | as-is |
| `@glimmer/util` (`dict`, `assign`, `keys`, `strip`, `clearElement`, `EMPTY_ARRAY`, `beginTestSteps/endTestSteps/verifySteps`), `@glimmer/debug-util` (`castToSimple/Browser`, `unwrap`, `expect`, `assert`, `unwrapTemplate`, `isPresent`...), `@glimmer/constants` (`NS_SVG`, `ELEMENT_NODE`, `CURRIED_COMPONENT`...) | helpers | Utility, **not behavior** (copy/shim). `unwrapTemplate` + `CURRIED_COMPONENT` are VM-ish |
| `@glimmer/interfaces` types: `RenderResult`, `Environment`, `EvaluationContext`, `TreeBuilder`, `Cursor`, `Reference`, `VMArguments`, `CapturedArguments`, `InternalComponentManager`, `WithCreateInstance/DynamicLayout/DynamicTagName`, `Template`, `TemplateFactory`, `CapturedRenderNode`, `HandleResult`, `ClassicResolver` ... | types | Mostly **impl detail** | adapter-owned type aliases |
| `@glimmer/node` `serializeBuilder`, `NodeDOMTreeConstruction` | SSR builder | **Impl detail** of SSR; output format (`<!--%glmr%-->` markers, `%+b:N%`) **is observable** (ch. SSR/rehydration) | adapter `mode:'serialize'` |
| `@glimmer/syntax` `ASTPluginBuilder`, `PrecompileOptions`, `AST` | plugin & options types | `PrecompileOptions` shape (`strictMode`, `locals`, `meta`, `plugins`, `keywords`) = spec-observable compile options | adapter option bag |
| `@glimmer/global-context` `testOverrideGlobalContext` (`style-warnings-test.ts:3`) | swap host hooks for test | **Spec-observable host contract** | adapter `setHost({warnIfStyleNotTrusted,...})` |
| `@glimmer/wire-format` `SexpOpcodes` (1 test) | | **Impl detail** | skip test |
| `@glimmer/local-debug-flags` (`each.ts`, `helpers.ts`) | LOCAL_DEBUG logging | impl detail | n/a |
| `@ember/runloop` `run` (`render-test.ts:19`) | batch a render in a run loop | Ember integration, observable only via Ember hooks (scheduling) | adapter `act(fn)` |

### 1.9 Tests that reach deepest into internals (cannot port without VM)

Grep over `IT/test` and `IT/lib` for opcodes/references: `IT/test/precompile-test.ts` (`templateFactory` `__id`, `__meta`, `referrer`: factory/Template identity - spec-observable only partly), `IT/test/debug-render-tree-test.ts` (`JitRenderDelegate.getCapturedRenderTree()`, `CapturedRenderNode` + `enableDebugTooling` env; ember inspector API - see 3), `IT/test/env-test.ts` (`EnvironmentImpl` internals), `IT/test/render-test.ts` (`RenderResult`/`render` API tests), `IT/test/compiler/compile-options-test.ts`, `IT/test/owner-test.ts`, `style-warnings-test.ts` (global-context override), `modifiers/*`/`managers/*` (public manager APIs - portable), `suites/debugger.ts` (`setDebuggerCallback` - hook for `{{debugger}}`; observable + `get('foo')` scope accessor), `suites/entry-point.ts` (`DynamicScopeImpl`, `renderComponent` with dynamic scope).

---

## 2. Ember harness (`packages/internal-test-helpers/lib`)

`IH` = `packages/internal-test-helpers`. Barrel: `IH/index.ts:1-54`.

### 2.1 Shape

* Tests are **`moduleFor(description, class extends TestCase)`** (`IH/lib/module-for.ts:56-76`). Methods whose *name* begins with
  `'@test '` become `QUnit.test` (also `@only `, `@skip `, `@feature(FLAG) `) (`module-for.ts:152-179`); mixins via `applyMixins`.
  There is **no delegate abstraction**: tests talk to real Ember (Application/Engine/owner/container/registry/resolver/run loop/Renderer).
* `moduleFor` also installs per-module QUnit hooks (`:66-75`): `setupContainersCheck` (container leak), `setupNamespacesCheck`,
  `setupObserversCheck`, `setupRunLoopCheck` (`ember-dev/run-loop.ts:3-32`: fail if run loop / timers left over),
  `setupAssertionHelpers` (`expectAssertion`/`ignoreAssertion`), `setupDeprecationHelpers` (`expectDeprecation`...), `setupWarningHelpers`.
  `afterEachFinally` calls `unsetContext` and, with `?assertDestroyables`, `assertDestroyablesDestroyed` (`module-for.ts:78-84`).
* Global QUnit setup (`index.html:34-38` -> `IH/lib/ember-dev/setup-qunit.ts`): `assert.rejects`, `assert.throwsAssertion`
  (no-op `ok(true)` when `!DEBUG`), `rejectsAssertion`; `QUnit.testStart -> resetTracking()` (`@glimmer/validator`, `setup-qunit.ts:57-59`).
  `index.html:15-30` sets `EmberENV` (`_DEFAULT_ASYNC_OBSERVERS`, `RAISE_ON_DEPRECATION`, `_ALL_DEPRECATIONS_ENABLED`, `_OVERRIDE_DEPRECATION_VERSION`, `ENABLE_OPTIONAL_FEATURES`) from query params (set by `testem.cjs:3-29` env vars).

### 2.2 `RenderingTestCase` (`IH/lib/test-cases/rendering.ts:20-228`) - the workhorse

(~70 of the 83 `moduleFor` files under `packages/@ember/-internals/glimmer/tests` extend it; ~1.2k `@test` cases there.)

* **Construct** (`:26-52`): `buildOwner({ownerOptions, resolver: new ModuleBasedResolver(), bootOptions})` (`IH/lib/build-owner.ts:20-63`:
  `Application.create({autoboot:false, Resolver: wrapper})` -> `namespace.buildInstance()` -> `ApplicationInstance.setupRegistry`; engine variant),
  registers `-view-registry:main` + `event_dispatcher:main`, looks up `renderer:-dom` (`Renderer`, `@ember/-internals/glimmer/lib/renderer.ts:182`),
  `this.element = #qunit-fixture`, sets up `EventDispatcher` on the fixture.
* **Registering things (resolver/registry style, loose mode)**: `owner.register('component:foo', Class)`, `'template:components/foo'`, `'helper:x'`,
  `'modifier:x'`, `'component-manager:x'`, `'service:x'` (`rendering.ts:133-213`: `registerHelper` (function -> `helper(fn)`, object -> `Helper.extend`),
  `registerCustomHelper`, `registerModifier`, `registerComponentManager`, `registerTemplate`, `registerService`, `add(specifier, factory)` -> `TestResolver.add` (`IH/lib/test-resolver.ts:14-47`: `type:name` keys, `serializeKey` with `%source%namespace`)).
  Loose-mode name->definition resolution happens in Ember's `RuntimeResolver` (`@ember/-internals/glimmer/lib/resolver.ts`), which is *not* part of the harness; it sits behind `owner.lookup`/`factoryFor`.
* **Strict-mode style** (no resolver): `setComponentTemplate(precompileTemplate('...', {strictMode:true, scope:()=>({Foo})}), templateOnly())`
  (e.g. `glimmer/tests/integration/components/strict-mode-test.js:1-50`); or runtime `template('...', {scope})` from `@ember/template-compiler/runtime`
  (`runtime-template-compiler-explicit-test.ts`), or `.gjs` files (`glimmer-component-test.gjs`, `custom-helper-test.gjs`, `if-laziness-test.gjs`; `templateTag()` vite plugin `vite.config.mjs:37`). `defineSimpleHelper/Modifier` (`IH/lib/define-template-values.ts:82-90`) = public `setHelperManager/setModifierManager`.
* **Compile**: `this.compile(src, opts)` -> `compile` (`IH/lib/compile.ts:20-40`): `compileOptions(opts)` from `ember-template-compiler` (adds Ember's AST plugins + keyword/ALLOWED_GLOBALS config) -> `precompileJSON` -> `SerializedTemplateWithLazyBlock` -> `templateFactory` (opcode-compiler). Same recipe as Glimmer's `createTemplate`, plus Ember's plugins. Used by `registerTemplate`, `render`, `addTemplate`.
* **Render** (`render(templateStr, context)` `rendering.ts:99-119`): registers compiled template as `template:-top-level`, creates a
  `component:-top-level` = `Component.extend({...context, tagName:'', layoutName:'-top-level'})`, looks it up, **`runAppend(component)`** (`IH/lib/run.ts:6-8`: `run(view,'appendTo',#qunit-fixture)`).
  The test's "context" (`this`) is therefore a **classic Ember `Component` instance** (so `this.component.set('x', v)` is `@ember/object` `set`; `get`/computed/observers all live).
  `renderComponent(Class, {expect})` (`:121-126`) registers `component:root`, renders `<Root />`, `assertHTML`, `assertStableRerender`.
  Component-module style: `renderComponentModule(() => template(...))` -> `define` awaits a microtask, registers `component:test-component`, renders `<TestComponent />` with the component as context (`:165-175`).
* **Update**: `runTask(fn)` = `run(fn)` (`run.ts:16-18`); `this.rerender()` -> `this.component.rerender()` (`rendering.ts:128-131`, Ember `Component#rerender`, i.e. schedule re-render on the renderer); `runTaskNext()` (`next` + RSVP Promise), `runLoopSettled()` (poll 5ms until no run loop/timers, `run.ts:27-43`); `renderSettled()` (`@ember/-internals/glimmer/lib/base-renderer.ts:174-198`, tied to `_backburner.on('begin'|'end')` `:217-218`). Event simulation: `this.click(sel)` (`abstract.ts:159-170`), `clickElement` (`IH/lib/event-helpers.ts`), `system/synthetic-events.ts` (`triggerEvent`, `fireEvent`).
* **Assert DOM**: `assertHTML(html)` -> `equalTokens(getElement(), html)` (`IH/lib/equal-tokens.ts:33-57`: `simple-html-tokenizer` tokens, attributes sorted; QUnit pushResult; falls back to deepEqual when tokens equal but raw strings differ), `assertInnerHTML` -> exact `innerHTML` (`equal-inner-html.ts`), `assertText`, `assertElement`/`assertComponentElement` -> `equalsElement` (`IH/lib/matchers.ts:~1-172`: `regex(...)`, `classes(...)`, `styles(...)` matchers; classic wrapper `id=/^ember\d*$/ class=ember-view`), `nthChild/firstChild/nodesCount` that **skip empty text/comment "marker" nodes** (`abstract.ts:17-27,105-141`) - **spec-observable**: empty markers are allowed but invisible to tests; `assertInvariants`/`assertStableRerender` (`abstract.ts:260-274`, `rendering.ts:223-227`) = node-identity snapshot (`takeSnapshot` omits markers) before/after `runTask(rerender)`.
  `NodeQuery` (`IH/lib/node-query.ts`) = tiny jQuery replacement. Real browser DOM (`window.Text/HTMLElement/Comment` captured at import).
* **Assertions / deprecations / warnings**: `expectAssertion(fn, msg|regex)` (global injected on `window` per test by `ember-dev/assertion.ts:26-80`): swaps the `assert` debug function via `getDebugFunction/setDebugFunction` from `@ember/debug` (`callWithStub`, `ember-dev/utils.ts:12-23`), throws a sentinel `BREAK` on the first failing assert to unwind, then compares message; `!DEBUG` => `ok(true,'Assertions disabled in production builds.')`. Template-engine assertions come through Glimmer's global-context `assert` hook -> Ember `assert` (`environment.ts:56-64`, with `VM_ASSERTION_OVERRIDES` remapping ids -> Ember messages). `expectDeprecation(fn?, msg|regex)`, `expectNoDeprecation`, `...Async`, `ignoreDeprecation` (`ember-dev/deprecation.ts`, `method-call-tracker.ts:1-185` records calls to stubbed `deprecate`, asserts at `afterEach`; unmatched deprecations fail the test; `RAISE_ON_DEPRECATION` true by default `index.html:21-23`). `expectWarning` (`ember-dev/warning.ts`). Also `assert.throwsAssertion` for async. Messages are matched **verbatim** (string equality unless regex), so error text is spec-observable in DEBUG.
* **Teardown** (`rendering.ts:82-93`): `runDestroy(this.component)`, `runDestroy(this.owner)` (`run(destroy, x)`, `run.ts:10-14`) in `finally { _resetRenderers() }`; then `ember-dev/*` leak checks (containers: `Container._leakTracking`; NAMESPACES; observers; run loop; optionally destroyables).

### 2.3 Other cases

* `AbstractTestCase` (`abstract.ts:76-280`): fixture, DOM helpers above, uses `getElement()` from test context (`IH/lib/test-context.ts` set by `setupTestClass` `module-for.ts:99`).
* `AbstractStrictTestCase` (`abstract.ts:31-74`): no owner built by default; `rerender()` via `rerenderComponent()` (`component-helper.ts:27-35`, calls `context.component.rerender()`). Used by `render-component-test.ts` (`RenderComponentTestCase`, builds its own owner via `buildOwner({})` and calls the **new low-level `renderComponent(component, {owner, args, env:{document,isInteractive,hasDOM}, into: element})`** from `@ember/-internals/glimmer/lib/renderer` (`base-renderer.ts:459`), returns `RenderResult` with `.destroy()`; `captureRenderTree` from `@ember/debug`). **This is the closest thing to an implementation-neutral "render a component into an element" entry point already in Ember.**
* `AbstractApplicationTestCase` / `ApplicationTestCase` (`abstract-application.ts`, `application.ts`; ~16 glimmer test files): full `Application` with `autoboot:false`, `TestResolver`, `Router.extend({location:'none'})`; `visit(url)` -> `application.boot()` -> `buildInstance().boot()` -> `instance.visit(url)` then `runLoopSettled()` (`abstract-application.ts:17-41`); `this.addTemplate/addComponent` (resolver.add of compiled templates); `transitionTo`, `currentURL`, `controllerFor`. Exercises route/outlet templates (`{{outlet}}`, `-outlet`), `link-to`, engines (`mount`).
* `RouterNonApplicationTestCase` (`router-non-application.ts:18-120+`): engine owner (`ownerType:'engine'`), fake `-application-instance:main` whose `renderRootComponent` calls `setRenderer(owner, renderer)` + `renderComponent(component, {into:{element, nextSibling:null}, owner})` (`:44-52`) -> `_setOutlets` path. `addTemplate/addComponent` helpers.
* `RouterTestCase`, `QueryParamTestCase`, `AutobootApplicationTestCase`, `TestResolverApplicationTestCase`: routing / boot; marginal for the template language (outlets only).

### 2.4 Non-public (non-`@ember`-public) imports in IH/lib

`@glimmer/compiler` `precompileJSON`; `@glimmer/opcode-compiler` `templateFactory` (`compile.ts:4-6`); `@glimmer/interfaces` types; `@glimmer/destroyable` (`assertDestroyablesDestroyed`, `enableDestroyableTracking`, `destroy`); `@glimmer/validator` `resetTracking`; `@glimmer/manager` `setHelperManager/...` (public); `@glimmer/env`; `ember-template-compiler` `compileOptions`, `EmberPrecompileOptions` (`compile.ts:7-8`); `@ember/-internals/glimmer` (`_resetRenderers`, `helper`, `Helper`, `renderComponent`, `setRenderer`, `Renderer` type); `@ember/-internals/{views (EventDispatcher),owner,metal (NAMESPACES, ASYNC/SYNC_OBSERVERS),container (Container._leakTracking),error-handling}`; `@ember/runloop` private exports `_getCurrentRunLoop`, `_hasScheduledTimers`, `_cancelTimers`; `@ember/debug` `getDebugFunction/setDebugFunction`. In the glimmer tests themselves (counted by grep over `glimmer/tests`): `@glimmer/manager` 53 (mostly `setComponentTemplate` + capabilities - public), `@glimmer/component` 36, `@glimmer/tracking` 7, `@glimmer/runtime` 7 (`on`, `array`, `hash`, `concat`, `fn`, `get`, `templateOnlyComponent`, `invokeHelper`), `@glimmer/validator` 2 (`getValue`), `@glimmer/interfaces` 2 (`CapturedRenderNode` type), `@ember/-internals/glimmer` 14 (`Helper/helper/Component/setComponentManager/htmlSafe/renderSettled/templateCacheCounters/template`), `../../../lib/renderer` 1.

Classification:

| Piece | Class | Spec-level replacement |
|---|---|---|
| `precompileTemplate(src,{strictMode,scope})`, `template(src,{scope})`, `setComponentTemplate`, `templateOnly()`, `@glimmer/component`, `setComponentManager`, `setHelperManager`, `setModifierManager`, `*Capabilities`, `on/fn/hash/array/concat/get` | public API; **spec-observable** | adapter keeps these names; implementation provides them |
| `owner.register('component:x')` + resolver lookup (loose mode) | Ember public API / container; **spec-observable** as the loose-mode resolution protocol | adapter must plug into the *Ember resolver chain* (`owner.factoryFor`) - see 4 |
| `compile()` using `precompileJSON`+`templateFactory`+`compileOptions` | impl detail | `compile(src, opts) -> TemplateFactory` from adapter (opts include Ember plugins) |
| `renderComponent`/`setRenderer`/`_resetRenderers`/`renderSettled`/`Renderer`/`appendTo`/`rerender` | Ember-internal-but-stable-ish glue between owner, run loop and VM | replace `base-renderer.ts` while keeping signatures |
| `templateCacheCounters` (`template-factory-test.js`, `runtime-resolver-cache-test.js`) | impl detail (cache hit counts) | skip |
| `ENV._DEBUG_RENDER_TREE` + `captureRenderTree` | observable debug API (Ember Inspector); `env.ts:62-87` | optional capability |
| `expectAssertion` / `expectDeprecation` stubs | harness over `@ember/debug`; **messages spec-observable [Dev]** | keep: impl must route all asserts/deprecations through `@ember/debug` (or global-context hooks `assert`/`deprecate`) |

---

## 3. Other harness-like patterns

All of these run in the same QUnit page (`index.html:56-80` globs), unless noted. None go through a delegate.

* **`@glimmer/syntax/test`** (`packages/@glimmer/syntax/test/*`, 17 files, ~4.3k lines; biggest `parser-node-test.ts` 1276, `loc-node-test.ts` 782, `traversal/*`, `generation/print-test.ts`). Pure parser/AST tests: `preprocess(src, opts)` -> AST, compared with `astEqual` (`test/support.ts:46-59`, deep-equal after stripping `loc`/`openTag`/`closeTag`) or builders (`builders-test.ts`); plugins via `preprocess(src,{plugins:{ast:[...]}})` + `assert.step` (`plugin-node-test.ts:1-30`); `Walker`, `traverse`, `print`/`Printer` (`generation/print-test.ts`); locations (`loc-node-test.ts`, `source-boundary-test.ts`); `template-locals-test.ts` (`getTemplateLocals`); `public-api-test.ts`. Internal API: the whole `@glimmer/syntax` public surface (`preprocess`, `print`, `traverse`, `Walker`, `builders`, `ASTv1/ASTv2`, `Source`/`SourceSpan`, `getTemplateLocals`, `sortByLoc`), compiled to `dist/` too (`rollup.config.mjs:150-170`). **Spec relevance:** syntax/parse errors (messages) and entity/whitespace handling are spec-observable (ch. syntax); AST shapes, `loc`, builders, printer are **not** (CONVENTIONS/MEMORY: AST transforms and hbs re-printing are non-goals) -> mark as out-of-scope for an alternate implementation unless it reuses `@glimmer/syntax`.
* **`@glimmer/compiler/test`** (`packages/@glimmer/compiler/test/compiler-test.ts`, 677 lines). Calls `precompile(src, {})` -> `JSON.parse` -> block (wire format), compares to expected built with `buildStatements`/`ProgramSymbols`/`c`/`s`/`WireFormatDebugger` (`:1-45`). **Pure wire-format snapshot tests; implementation detail** (ch. 04 informative). Some tests are syntax-error assertions at compile time (`:50-`, e.g. "@arguments on regular HTML nodes throws"), which *are* spec-observable (error messages) but go through `precompile`. Skip wholesale for a JS-function backend; port the error-message subset to an `compile()` adapter.
* **`ember-template-compiler/tests`** (`packages/ember-template-compiler/tests`: `plugins/*` 9 files, `system/*` 2, `utils/transform-test-case.ts`, `basic-usage-test.js`). Two flavors: (a) *AST-transform tests* via `assertTransformed(before, after)` (`utils/transform-test-case.ts:7-62`: `precompile` with an injected `extractProgram` plugin, deloc'd AST deep-equal) - AST-level, impl detail; (b) *behavior tests* using `RenderingTestCase` + `precompileTemplate`/`setComponentTemplate` and `expectAssertion` for compile-time asserts (`assert-array-test.js`, `assert-input-helper-without-block-test.js`, `assert-against-attrs-test.js`...) - **spec-observable** (compile assertions in Dev). `system/compile_options_test.js:7-30` checks `compileOptions()` shape (`customizeComponentName`, `plugins.ast` lists `RESOLUTION_MODE_TRANSFORMS`/`STRICT_MODE_TRANSFORMS`) - Ember-specific compile contract; `basic-usage-test.js:1-40` tests `_buildCompileOptions({mode:'codemod'})`, `_preprocess`, `_print` (hbs re-print: non-goal). Internal API: `compileOptions`, `precompile`, `_buildCompileOptions`, `_preprocess`, `_print` from `ember-template-compiler` (`index.ts`, `minimal.ts:10-12`), `@glimmer/compiler.precompile`, `@glimmer/syntax` AST.
* **`@ember/template-compiler/tests`** (`packages/@ember/template-compiler/tests/template_test.ts`, one smoke test). `template('<template>hello</template>', {eval})` then `getComponentTemplate(component)` / `getInternalComponentManager(component)` non-null (`:1-25`). Public API of `@ember/template-compiler` (`lib/template.ts` uses `glimmerPrecompile` + `templateFactory` + `setComponentTemplate` + `templateOnly`, lines 1-7). Behavior of `template()` is mostly tested through glimmer integration tests (`runtime-template-compiler-{explicit,implicit}-test.ts`). `@ember/template-compiler/runtime` + `/index` public-api (`packages/@ember/template-compiler/lib/public-api.ts`; `index.ts:1-4` registers via `__registerTemplateCompiler`) is the **supported public compile seam**.
* **`@glimmer/validator/test`** (`packages/@glimmer/validator/test`, 10 files ~2.1k lines: `tracking-test.ts`, `validators-test.ts`, `collections/*`, `tracked-value-test.ts`, `meta-test.ts`). Unit tests of tags/autotracking: `createTag`, `dirtyTag`, `consumeTag`, `track`, `untrack`, `valueForTag`, `validateTag`, `createCache/getValue/isConst`, `trackedData`, `beginTrackFrame/endTrackFrame`, `debug.runInTrackingTransaction` (DEBUG-only "you attempted to update X after it was consumed" assertion, `tracking-test.ts:503-530`), plus `trackedArray/Map/Set/WeakMap/WeakSet/Object` collections (`collections/*`). Tags/revisions are **not normative** (CONVENTIONS) -> `tracking-test`/`validators-test` are impl detail; **the collections and `tracked`/`cached` semantics are spec-observable** (ch. 07) and can be re-expressed via `createCache`/`getValue` (public `@glimmer/tracking`/`@ember/reactive`), and the backtracking assertion text is observable [Dev].
* **`@glimmer/manager/test`** (`packages/@glimmer/manager/test/managers-test.ts` 414 lines, `capabilities-test.ts` 170). Registers managers with `setComponentManager`/`setHelperManager`/`setModifierManager`/`setInternal*Manager`, checks `getInternal*Manager(def)` returns `CustomComponentManager`/`CustomModifierManager` (`:42-47` asserts `instance instanceof CustomComponentManager`, `instance['factory']`) and capability-flag computation (`componentCapabilities('3.13', {...})`, `helperCapabilities`, `modifierCapabilities`; version gating asserts). Capabilities argument validation (invalid versions, missing required flags) is **spec-observable [Dev]**; `getInternal*Manager`/`Custom*Manager` class identity is **impl detail**.
* **`@ember/-internals/metal/tests`** (`tracked/*.js`, `cached/get_test.js`, computed/observer/etc.). Use `AbstractTestCase` (no rendering) and `@glimmer/validator` `track`/`valueForTag`/`validateTag` + `tagForProperty` from metal (`tracked/validation_test.js:1-40`) to check that `@tracked`, `get`, `set`, computed, `notifyPropertyChange` dirty/consume tags. Template relevance: the classic `get/set` + tag-bridge that templates rely on (`{{this.foo}}` reads via `getProp` of the global context, `environment.ts:30-33`). **Tag-level assertions are impl detail**, the *"reading a property in a template re-renders when `set` is called"* contract is observable and covered by glimmer tests (`syntax/*`, `components/tracked-test.js`, `helpers/tracked-test.js`).
* **`IT/test/precompile-test.ts`** (`packages/@glimmer-workspace/integration-tests/test/precompile-test.ts`, QUnit module `templateFactory`). `precompile(src,{meta})` -> `JSON.parse` -> `templateFactory(serialized)` and checks `factory.__id` (provided or generated, distinct per factory), `factory.__meta`, `template.id`, `template.referrer = {moduleName, owner}`, `factory(owner)` injects owner (`:1-80`). Wire-format JSON + `TemplateFactoryWithIdAndMeta` internals: **impl detail**, except "factory(owner) -> template whose referrer.owner is the owner" (needed for loose-mode lookup relative to owner) - observable only indirectly.
* **Debug render tree tests**: `IT/test/debug-render-tree-test.ts` (Glimmer; `DebugRenderTreeDelegate extends JitRenderDelegate` with `enableDebugTooling:true`, `delegate.getCapturedRenderTree()` -> `CapturedRenderNode[]` `{id,type,name,args,instance,template,bounds,children}`; `Expected<T>` matchers; custom component managers with `getDebugName/getDebugCustomRenderTree`; modifiers; template-only; `:1-60`) and `packages/@ember/-internals/glimmer/tests/integration/application/debug-render-tree-test.ts` (Ember; `ApplicationTestCase` + `captureRenderTree(owner)` from `@ember/debug`; gated by `ENV._DEBUG_RENDER_TREE` (default `DEBUG`, `@ember/-internals/environment/lib/env.ts:87`) `:44-`). Internal API: `@glimmer/runtime` `DebugRenderTree` via `env.debugRenderTree.capture()`, `CapturedRenderNode`, `EMPTY_ARGS`, `TemplateOnlyComponentManager`, bounds (`firstNode/lastNode/parentElement`). **Debug-only observable behavior** (Ember Inspector contract): a conforming impl may omit if declared out of scope; if supported, the tree shape (type: `component|modifier|helper|keyword|engine|route-template|outlet`, name, args `{positional,named}`, bounds, children) is the spec.
* **`@glimmer/{constants,debug,debug-util,destroyable,owner,program,reference,util}/test`** also exist (`find` shows 1-2 files each): `program`/`reference` are VM internals (skip); `destroyable` + `owner` + `util` are public-ish.
* **Node-side tests** (`pnpm test:node` -> `qunit tests/node/**/*-test.cjs`, `package.json:71`; `tests/node/build-info-test.cjs`): build artifact checks, not template behavior. `tests/node-vitest`, `tests/node-blueprints`: packaging smoke tests.
* **SSR/FastBoot-like in node**: `IT/test/node-suites-node-test.ts:1-22` runs `ServerSideSuite`/`ServerSideComponentSuite` with `NodeJitRenderDelegate` (no DOM, `@simple-dom`), but under the same browser page (guarded by `typeof process` only for `CompilationTests`, `:20-22`).

---

## 4. Seam proposal and how tests are run

### 4.1 How tests run today

* **One page, one QUnit run.** `index.html` is the only test entry: `index.html:5-30` sets `window.EmberENV` from URL params;
  `:32-48` imports `internal-test-helpers/lib/ember-dev/setup-qunit.ts`, `setTesting(true)`, loads `/testem.js`; `:50-82` `import.meta.glob(..., {eager:true})`
  every `packages/@ember/-internals/*/tests/**`, `packages/*/*/tests/**`, `packages/*/tests/**`, plus `packages/{@glimmer,@glimmer-workspace}/*/test/**/*-test.*`.
  Hence **Glimmer-vm and Ember tests share a runtime, a QUnit instance, and Ember's global context**.
  `#qunit` / `#qunit-fixture` divs are in the page (`index.html:~84-85`); `setup-harness.ts:24-86` (`setupQunit`) is an alternative bootstrap that creates them (not used by the root `index.html`).
* **Build**: `vite build --mode development|production` (`vite.config.mjs:20-79`; `package.json:73` `test:wip`; CI `.github/workflows/ci-jobs.yml:94,134`) emits `dist/` (preserveModules, no treeshake, `:23-33`).
  Babel (`babel.test.config.mjs`): TS strip, decorators (`decorator-transforms` legacy by default; `VITE_STABLE_DECORATORS=true|typescript` for 2023-11 / TS emit), `babel-plugin-ember-template-compilation`
  with `compilerPath: broccoli/glimmer-template-compiler.mjs` (-> `packages/ember-template-compiler/minimal.ts` `precompile`, `babel.config.mjs:~35-45`) so **`precompileTemplate(...)`, `.gjs/.gts` (`templateTag()` plugin, `vite.config.mjs:37`) are compiled at build time to wire-format JSON** (`@ember/template-compilation` `precompileTemplate` is a build-time macro; at runtime it is `undefined`/throws),
  and `babel-plugin-debug-macros` (`broccoli/build-debug-macro-plugin.cjs:1-30`) which statically sets `DEBUG` for `@glimmer/env` and strips `assert`/`deprecate` calls when `isDebug` is false (`babel.test.config.mjs`: `isProduction = EMBER_ENV==='production'`).
* **Module resolution**: `resolvePackages()` (`rollup.config.mjs:~408-470`, used from `vite.config.mjs:44-55`) maps *every bare specifier* (`@glimmer/*`, `@ember/*`, `ember-template-compiler`, `internal-test-helpers`) to `packages/<name>/index.ts` **source** (not `dist/dev`) and throws for anything not in `testDependencies` (`rollup.config.mjs:25-32`: qunit, vite, js-reporters, `@simple-dom/*`, expect-type). A `deps[source]` override map exists (`rollup.config.mjs:443`) - used for `@glimmer/component` (`vite.config.mjs:49-53`). `@glimmer/local-debug-flags` is redirected to a `disabled.ts` unless `enableLocalDebug` (the vite config passes true, `:54`).
  `dist/dev` / `dist/prod` (`rollup.config.mjs:75-` `sharedESMConfig`, `debugMacrosMode`) are the **published** builds, not what tests use.
* **Run**: `pnpm test` = `testem ci -f testem.cjs --host 127.0.0.1 --port 13141` (`package.json:68`); `testem.cjs:31-56`: `cwd:'dist'`, `test_page: index.html/?<variant query>`, headless Chrome, `parallel:1`, `FailureOnlyReporter`. Variants via env -> URL: `ALL_DEPRECATIONS_ENABLED`, `OVERRIDE_DEPRECATION_VERSION`, `ENABLE_OPTIONAL_FEATURES`, `RAISE_ON_DEPRECATION` (`testem.cjs:3-29`). CI matrix (`ci-jobs.yml:100-149`): dev, all-deprecations, optional-features, deprecations-as-errors, **production build** (`BUILD: production` -> `vite build --mode=production`; DEBUG=false so every `expectAssertion`/`throwsAssertion` degrades to `ok(true)` and tests under `if (DEBUG)` are not defined), stable decorators x2. Browserstack Safari/Edge (`ci-jobs.yml:~160-178`). `pnpm start` = `vite dev` (same index.html live). Single test filtering: QUnit URL params `?filter=` / `?module=` (testem `-- ` not needed).
* **Node-only**: `pnpm test:node` (`qunit tests/node/**/*-test.cjs`), vitest/blueprint smoke tests. No template tests run in node except via `@simple-dom` delegates inside the browser page.
* **Dev vs prod semantics seen by tests**: `import { DEBUG } from '@glimmer/env'` appears in glimmer tests (19 hits in IT, `moduleFor(...)` guards) and `moduleForDevelopment` checks `import.meta.env.MODE === 'development'` (`module-for.ts:40-48`). `ENV._DEBUG_RENDER_TREE` defaults to `DEBUG`.

### 4.2 Where an implementation seam can go

Three independent seams, from cheapest to most intrusive. They can be combined (A for Ember tests, B for Glimmer tests, C for compile-only tests).

**Seam A - module aliasing (Ember-level tests, zero harness change).** Because Ember tests only use (i) public APIs (`precompileTemplate`, `template`, `setComponentTemplate`, `@glimmer/component`, managers, `owner.register`) and (ii) `renderComponent/setRenderer/_resetRenderers/renderSettled/Renderer/appendTo/rerender` from `@ember/-internals/glimmer`, the replacement point is *inside* `@ember/-internals/glimmer` + the three `@glimmer` packages it calls. Concretely:
1. **Compile-time**: change `compilerPath` in `babel.config.mjs:~37-43` (and the runtime `@ember/template-compiler/lib/template.ts:1-7`, `IH/lib/compile.ts`) to a compiler that emits **JS template functions** instead of wire-format JSON; `precompileTemplate` output is then fed to the new runtime. Constraint: `@ember/template-compiler/lib/template.ts` and `@ember/-internals/glimmer/lib/template.ts` (`StaticTemplate = SerializedTemplateWithLazyBlock`) assume the wire-format object - they are the two files to abstract. (Wire format is a non-goal per CONVENTIONS; here it is only a *carrier*.)
2. **Runtime**: replace `renderMain`/`curry`/`clientBuilder`/`inTransaction`/`EvaluationContext` consumed by `@ember/-internals/glimmer/lib/renderer.ts:20-30,102-160` & `base-renderer.ts`, and the manager glue (`component-managers/{curly,root,outlet,mount,internal}.ts`, `resolver.ts`, `router-resolver.ts`, `syntax/*`). Use the `deps` override (`rollup.config.mjs:443`, `vite.config.mjs:44-55`) to alias e.g. `@glimmer/runtime`, `@glimmer/opcode-compiler`, `@glimmer/compiler` to the new package while keeping `@glimmer/manager`, `@glimmer/validator`, `@glimmer/reference`(?), `@glimmer/destroyable`, `@glimmer/owner`, `@glimmer/global-context` (shared host contract) intact.
3. **Gate by env var** (like `VITE_STABLE_DECORATORS`, `vite.config.mjs:38`) -> a new CI matrix row.
Constraint: `renderer.ts` imports deep paths (`@glimmer/runtime/lib/curried-value`, `.../vm/element-builder`, `.../environment`, `.../render`, `@glimmer/reference/lib/reference`, `@glimmer/validator/lib/debug`; `renderer.ts:20-30`, `environment.ts:11-13`) - so the alias must cover those deep paths or `renderer.ts` must be forked.

**Seam B - `RenderDelegate` adapter (Glimmer integration tests).** Implement `class JsFnRenderDelegate implements RenderDelegate` next to `JitRenderDelegate` and let `jitSuite`/`jitComponentSuite` pick it (`IT/lib/test-helpers/module.ts:19-43`, e.g. via `globalThis`/URL flag), plus `NodeJit`/`Serialization`/`Rehydration` variants. ~85 of the 86 test files import only from `@glimmer-workspace/integration-tests`, so a single delegate swap covers them. Gaps in `RenderTest` itself to refactor first (they bypass the delegate):
* `RenderTest.set` -> `dirtyTagFor(context,key)` (`render-test.ts:629-632`), `rerender` -> `result.env.begin(); result.rerender(); result.env.commit()` (`:419-438`), `destroy` -> `inTransaction(result.env, () => destroy(result))` (`:440-446`), `import { run } from '@ember/runloop'` (`:19`). Proposal: add `delegate.rerender(result)`, `delegate.destroy(result)`, `delegate.set(context,key,value)` with defaults equal to the current code.
* `RenderResult` is a VM type (`@glimmer/interfaces`); the spec-level handle is `{rerender(): void; destroy(): void}` (+ optional `bounds()`, `env` only for the Glimmer delegate).
* Component kinds Curly/Dynamic use an **internal manager** (`emberish-curly.ts`: `setInternalComponentManager`, `WithCreateInstance`/`WithDynamicLayout`/`WithDynamicTagName`/`PreparedArguments`, `VMArguments`, `childRefFor/createComputeRef` refs, `DirtyableTag`). Either (a) alt impl exposes the internal-manager protocol for definitions (then the class ports unchanged), or (b) re-implement `EmberishCurlyComponent` on top of the *public* manager API with `componentCapabilities('3.13', {updateHook, createInstance, ...})` + `{{component}}`-style invocation; (b) is more portable and is a harness-only rewrite (`emberish-curly.ts`, 325 lines).

**Seam C - compile-only API adapter** (`compile`, `precompile`, errors). `IT/lib/compile.ts:20-41` and `IH/lib/compile.ts:20-40` are the **only two places** where tests call `precompileJSON` + `templateFactory`; every other compile goes through them or through `precompileTemplate`/`template()`. Redirect both to the adapter `compile()`.

### 4.3 Minimal interface a new implementation must provide

```ts
// spec-level adapter; every method has a current-harness counterpart (right column)
interface TemplateImplementation {
  // --- compile -----------------------------------------------------------
  compile(src: string, opts?: {
    strictMode?: boolean;          // PrecompileOptions.strictMode
    scope?: Record<string, unknown>| (() => Record<string, unknown>); // locals / lexical scope (createTemplate scopeValues)
    keywords?: string[];           // define.ts DefineComponentOptions.keywords
    moduleName?: string;           // meta.moduleName; also Ember's compileOptions(...)
    plugins?: { ast: ASTPluginBuilder[] }; // registerPlugin; optional capability 'ast-plugins'
    emberOptions?: EmberPrecompileOptions;  // customizeComponentName, ... (ember-template-compiler)
  }): TemplateFactory;             // (owner?) => Template; accepted by setComponentTemplate()
  //                                  <- createTemplate/preprocess (IT/lib/compile.ts:14-41), compile (IH/lib/compile.ts:20-40), precompileTemplate, template()

  // --- definitions (all PUBLIC already) ----------------------------------
  setComponentTemplate, setComponentManager, setHelperManager, setModifierManager,
  componentCapabilities, helperCapabilities, modifierCapabilities,
  templateOnlyComponent,           // @glimmer/manager, @glimmer/runtime
  // built-ins: array concat fn get hash on (+ keywords: if unless each let in-element yield has-block ... log debugger unique-id input textarea link-to mount outlet)

  // --- loose-mode resolution ---------------------------------------------
  // Either a ClassicResolver-like object (lookupComponent/Helper/Modifier(name, owner)) given to the renderer,
  // or (Ember) owner.factoryFor('component:x'|'helper:x'|'modifier:x'|'template:components/x'); see resolver.ts

  // --- host hooks (global context) ---------------------------------------
  setGlobalContext({ scheduleRevalidate, toBool, toIterator, getProp, setProp, getPath, setPath,
                     scheduleDestroy, scheduleDestroyed, warnIfStyleNotTrusted, assert, deprecate }) // @glimmer/global-context (environment.ts:22-)

  // --- render ------------------------------------------------------------
  renderTemplate(src|TemplateFactory, self: object, into: Element|SimpleElement,
                 opts?: { owner?, mode?: 'client'|'serialize'|'rehydrate', document?, isInteractive? }): RenderHandle
  renderComponent(definition: object, args: Record<string, unknown>, into: Element|SimpleElement,
                  opts?: { owner?, dynamicScope? /*optional*/, env? }): RenderHandle
  //   <- delegate.renderTemplate/renderComponent (render-delegate.ts:39-55); base-renderer.ts:459 renderComponent({owner,args,env,into})
  interface RenderHandle { rerender(): void; destroy(): void; /* optional */ bounds?(): Bounds; capture?(): CapturedRenderNode[] }

  // --- reactivity (spec ch.07 abstract model) ----------------------------
  // tracked, cached/createCache+getValue, trackedArray/Map/Set/WeakMap/WeakSet/Object, dirty-on-set for plain-object context
  // <- RenderTest.set -> dirtyTagFor (render-test.ts:629); tracked-object.ts uses tagFor/consumeTag/dirtyTagFor; replace with a 'cell'/tracked-object helper

  // --- lifecycle ---------------------------------------------------------
  destroy(handle), registerDestructor, isDestroying, isDestroyed, associateDestroyableChild  // @glimmer/destroyable (public via @ember/destroyable)
  owner: setOwner/getOwner

  // --- settle ------------------------------------------------------------
  settle(): void | Promise<void>   // sync flush (Glimmer: result.env.begin/rerender/commit; Ember: run(fn) / Component#rerender); async renderSettled()
}
```

Mapping of existing harness methods:

| Existing | Adapter |
|---|---|
| `RenderDelegate.renderTemplate` / `renderComponent` | `renderTemplate` / `renderComponent` |
| `RenderDelegate.registerComponent/Helper/Modifier/Plugin`, `registerInternalHelper` | resolver-registry object (loose) + `compile(...plugins)`; `registerInternalHelper` dropped/unsupported |
| `getElementBuilder`, `getSelf`, `getInitialElement`, `create*` | internal to adapter / DOM only (`mode` option) |
| `RenderTest.rerender/destroy/set/runTask/assertStableRerender` | `RenderHandle.rerender/destroy`; `set` via tracked context; `runTask` stays identity (Glimmer) or `run` (Ember) |
| `createTemplate`, `defineComponent`, `defComponent` (`define.ts:105-136`) | `compile(...strictMode)` + `setComponentTemplate` |
| `IH` `RenderingTestCase.render/renderComponent/rerender/registerHelper/...` | stay; run on top of Seam A |
| `runAppend/runDestroy/runTask/runLoopSettled/renderSettled` | `settle()` + Ember run loop (shared; scheduler is Ember's backburner, `environment.ts:22-41`) |
| `expectAssertion/expectDeprecation` | unchanged; require adapter to call `assert`/`deprecate` from global context |

### 4.4 What can be supported without implementation internals

Fully portable through the adapter (spec-observable): the shared `IT/lib/suites/*` (components, each, in-element, has-block, yield, scope, shadowing, initial-render, ssr, with-dynamic-vars, debugger [needs debugger hook]), strict-mode/keyword/helper/modifier/collections/syntax-error tests in `IT/test`, all of `glimmer/tests/integration/**` (Ember-level), `ember-template-compiler/tests/plugins/*` behavior flavor, `@glimmer/validator` collections tests, `@glimmer/manager` capabilities tests (validation messages).

**Cannot be supported without implementation internals** (explicitly mark `out-of-scope` / `needs-vm` in the spec conformance chapter):
* wire-format assertions: `@glimmer/compiler/test/compiler-test.ts` (whole file), `IT/test/compiler/compile-options-test.ts` (`SexpOpcodes` at `:5,64`), `IT/test/precompile-test.ts` (`__id`, `__meta`, `Template.id`, `referrer`).
* opcode/heap/program internals: only reached via `JitDelegateContext` (`jit/delegate.ts:60-74`: `artifacts`, `RuntimeOpImpl`, `EvaluationContextImpl`); there are **no opcode-snapshot tests** in `IT/test` or `IT/lib/suites` (verified by grep) - only construction plumbing.
* Reference/Tag-level tests: `@glimmer/validator/test/{tracking,validators}-test.ts` (tag API), `@glimmer/reference/test`, `@glimmer/program/test`, `@ember/-internals/metal/tests/tracked/*` (tag assertions via `track/valueForTag/validateTag`), `registerInternalHelper` consumers (`IT/test/updating-test.ts` 6 uses, `IT/test/helpers/fn-test.ts` 2), `IT/test/env-test.ts` (`EnvironmentImpl.begin/commit` nesting assert, message text), `IT/test/modifiers/on-test.ts:41` (`getInternalModifierManager(on)` internals), `@glimmer/manager/test/managers-test.ts:42-47` (`CustomComponentManager` class identity).
* AST-level: `@glimmer/syntax/test/*` (unless the new impl reuses `@glimmer/syntax`), `ember-template-compiler/tests/utils/transform-test-case.ts` users (AST deep-equal), `_print` (non-goal).
* Debug render tree: `IT/test/debug-render-tree-test.ts` (needs `getCapturedRenderTree()` on delegate + `enableDebugTooling` env), Ember `debug-render-tree-test.ts` (`captureRenderTree`); optional capability, with the shape in 3.
* Template/resolver cache counters: `glimmer/tests/unit/runtime-resolver-cache-test.js`, `template-factory-test.js` (`templateCacheCounters` from `@ember/-internals/glimmer`), `hot-reload-test.js`.
* `style-warnings-test.ts` + `testOverrideGlobalContext`: supportable if the adapter honors the same `@glimmer/global-context` hooks (it is a host contract - recommend specifying the hook set in ch. 07/host integration).
* `DynamicScopeImpl` in `suites/entry-point.ts:79` / `renderComponent(..., dynamicScope)`: internal; `-with-dynamic-vars` is a legacy keyword - tag `[Legacy]`.

### 4.5 Practical caveats

1. Because Glimmer tests run **inside Ember's page**, `@glimmer/global-context` is set once for the whole run by importing `@ember/-internals/glimmer/lib/environment.ts`; an alternate impl must be wired to the same hooks (or the Glimmer harness must set its own via `testOverrideGlobalContext`, as `style-warnings-test.ts:18-30` does).
2. The harness assumes **synchronous rendering** (`renderSync`, `iterator.sync()`) - `RenderHandle.rerender()` must be synchronous (`render-test.ts:419-438`; Ember `renderer.ts:123-131`); async settle is only used by `renderSettled`/`runLoopSettled`.
3. DOM node identity across rerender is checked everywhere (`assertStableRerender`), so a JS-function compiler must patch in place rather than re-create DOM.
4. Marker handling: Ember harness ignores empty text/comment nodes (`abstract.ts:17-27`), Glimmer harness `takeSnapshot` skips server markers (`snapshot.ts` `isServerMarker`) - spec must state which markers are permitted. SSR/rehydration suites compare **exact serialized HTML incl. `<!--%glmr%-->`, `<!--%+b:N%-->`** markers (`custom-dom-helper.ts`, `initial-render-test.ts` `Rehydration` suite at `:1596`) and `rehydrationStats.clearedNodes` -> either specify the serialization format or exclude those suites.
5. Production build: assertions become no-ops; an alt impl must keep `DEBUG` stripping semantics (`@glimmer/env` flag via `babel-plugin-debug-macros`) so that the `!DEBUG` branches of `expectAssertion` remain valid.
6. Ember's `{{input}}`, `<Input>`, `<LinkTo>`, `{{outlet}}`, `{{mount}}`, `{{yield}}`-in-curly, `Component` classic lifecycle (`didInsertElement` ...) live in `@ember/-internals/glimmer` and `@ember/routing` (managers), not in `@glimmer/*`; Seam A must reimplement or reuse these on top of the new core.
