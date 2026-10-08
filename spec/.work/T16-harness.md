# T16 harness survey

- [x] 1. Glimmer integration-test harness
- [ ] 2. Ember harness (internal-test-helpers)
- [ ] 3. Other harness-like patterns
- [ ] 4. Seam proposal + how tests are run

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
