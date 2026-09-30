# 06 — Managers: components, helpers, modifiers

This chapter covers the **manager layer**: the only interface between the template
language and the JavaScript values that templates invoke as components, helpers, and
modifiers. What matters is the manager API. A component is *any* JavaScript object or
function with an associated component manager. It need not extend `@glimmer/component`,
`@ember/component`, or any other base class. Helpers and modifiers work the same way.

The chapter covers:

- how a value is associated with a manager, and how that association is looked up (§1);
- the owner, and how it reaches managers (§2);
- the argument objects ("args proxies") that user-facing managers receive (§3);
- the public component manager API (§4) and template-only components (§5);
- the public helper manager API, the default (plain function) helper manager, and the
  classic `Helper` / `helper()` APIs (§6);
- the public modifier manager API and the built-in `on` modifier (§7);
- internal component managers and their capability flags. Ember's classic, mount,
  outlet, root, and internal (`<Input>`/`<Textarea>`) components depend on these (§8);
- `@glimmer/component` (§9);
- the destroyables API, and how template-created objects join the destroyable tree (§10);
- commit-phase ordering across all three manager kinds (§11).

Reactivity terms (*tracked storage*, *consume*, *reactive computation*, *valid /
invalidated*, *untracked*) come from `07-reactivity.md`. Where this chapter says a hook
"is autotracked", it means the hook runs as a reactive computation and its dependency set
is whatever tracked storage it consumes. Where it says "untracked", consumption during the
hook is not recorded by any enclosing computation.

The terms *render transaction*, *revalidation* (which §05 calls an *update pass*),
*commit phase*, and *component region* are defined in §07-0. A component's **region** in
this chapter is its component update region (§05-1.6), and a region is **re-validated**
when a revalidation finds it invalid and descends into it. *Initial render* and *block*
are §05 terms (§05-1.4, §05-1.1). This chapter owns the commit-phase ordering (§11).

---

## 1 Associating values with managers

### 1.1 Three independent association tables

An implementation MUST keep three independent associations, one each for component,
helper, and modifier managers. Each maps an object (the *definition*) to a manager.
The public setters are:

```ts
setComponentManager(factory: (owner) => ComponentManager, definition: T): T  // @ember/component
setHelperManager   (factory: (owner | undefined) => HelperManager, definition: T): T  // @ember/helper
setModifierManager (factory: (owner) => ModifierManager, definition: T): T  // @ember/modifier
```

Source: `packages/@glimmer/manager/lib/public/api.ts:16-35`. Ember re-exports these from
`packages/@ember/-internals/glimmer/lib/utils/managers.ts:18-23`,
`packages/@ember/helper/index.ts:274`, and `packages/@ember/modifier/index.ts:10-13`.

Each setter returns its `definition` argument unchanged, so it can be used as an
expression, for example `export default setComponentManager(f, class {})`.

A single value MAY have managers of more than one kind, at most one of each.
`packages/@glimmer/manager/test/managers-test.ts:365` ("Can set different types of
managers") and
`packages/@glimmer-workspace/integration-tests/test/managers/helper-manager-test.ts:407`
("helper manager and modifier manager can be associated with the same value") both
exercise this.

**Errors [Dev]** (`packages/@glimmer/manager/lib/internal/api.ts:42-57`):

- If `definition` is not a non-null object or function, the setter throws: `Attempted to
  set a manager on a non-object value. Managers can only be associated with objects or
  functions. Value was <debug string>`.
- If `definition` *itself* already has a manager of the same kind, the setter throws:
  `Attempted to set the same type of manager multiple times on a value. You can only
  associate one manager of each type with a given value. Value was <debug string>`. The
  check covers only an association stored directly on `definition`. Setting a manager on
  a subclass whose superclass already has one is allowed, and the subclass's manager wins
  (§1.2).

Tests: `packages/@glimmer/manager/test/managers-test.ts:108,210,321,385-412`.

In production builds neither check runs. A second association on the same object silently
replaces the first.

### 1.2 Lookup through the prototype chain

To find the manager of kind K for a value `v`, walk `v`'s prototype chain and take the
nearest association:

```
lookup(table, v):
  p := v
  while p !== null:
    if table has entry for p: return table[p]
    p := Object.getPrototypeOf(p)
  return undefined
```

Source: `packages/@glimmer/manager/lib/internal/api.ts:63-79`.

Consequences:

- A class inherits its superclass's manager, because `Object.getPrototypeOf(Child) ===
  Parent` for ES classes. This is how every subclass of `@glimmer/component`'s
  `Component` finds the Glimmer component manager. Tests:
  `packages/@ember/-internals/glimmer/tests/integration/custom-component-manager-test.js:152-206`
  and
  `packages/@glimmer-workspace/integration-tests/test/managers/modifier-manager-test.ts:103`.
- An object instance inherits the manager associated with its prototype object. Template-only
  component definitions work this way: the manager is set on
  `TemplateOnlyComponentDefinition.prototype`
  (`packages/@glimmer/runtime/lib/component/template-only.ts:54-57`). Ember's
  `RouteTemplate` does the same
  (`packages/@ember/-internals/glimmer/lib/component-managers/route-template.ts:110`).
- Lookup is by identity of the object and its prototypes. It is not keyed by class name
  or by structure.

`setComponentTemplate` / `getComponentTemplate` use the same prototype-chain lookup for
templates (`packages/@glimmer/manager/lib/public/template.ts:29-43`); see
`01-authoring-formats.md`.

### 1.3 Manager factories and the owner

The public setters take a **factory**, not a manager. The factory is called lazily, the
first time the runtime needs the manager for a particular owner. The result is cached per
(association, owner):

- Component and modifier managers are cached in a `WeakMap` keyed by owner
  (`packages/@glimmer/manager/lib/public/component.ts:114-141`,
  `packages/@glimmer/manager/lib/public/modifier.ts:78-105`).
- Helper managers are cached the same way. In addition, `owner === undefined` has its own
  single cached delegate, created by calling `factory(undefined)`
  (`packages/@glimmer/manager/lib/public/helper.ts:78-118`).

So a manager instance MUST be shared by every definition that has the same association
and is used under the same owner. Every subclass of a class with a manager counts as
sharing that association. A factory MUST be called at most once per (association, owner).
It MUST NOT be called before a definition with that association is first invoked under
that owner. Managers therefore SHOULD be stateless, or hold only the owner (see the
`setHelperManager` documentation, `packages/@ember/helper/index.ts:107-113`).

Timing: the factory is called during rendering, immediately before the first
`createComponent` / `createHelper` / `createModifier` call for that owner.

**Capabilities validation [Dev].** Right after the factory returns, the runtime checks that
`delegate.capabilities` is an object produced by the matching `capabilities()` function
(§4.1, §6.1, §7.1). Each `capabilities()` result is recorded in a private set and, in dev
builds, frozen (`packages/@glimmer/manager/lib/util/capabilities.ts:30-40`). If the check
fails, the runtime throws one of these, where the prefix is asserted by tests:

- ``Custom component managers must have a `capabilities` property that is the result of calling the `capabilities('3.13')` (imported via `import { capabilities } from '@ember/component';`). Received: `<JSON>` for: `<delegate>` ``
- ``Custom helper managers must have a `capabilities` property that is the result of calling the `capabilities('3.23')` (imported via `import { capabilities } from '@ember/helper';`). Received: ...``
- ``Custom modifier managers must have a `capabilities` property that is the result of calling the `capabilities('3.22')` (imported via `import { capabilities } from '@ember/modifier';`). Received: ...``

Sources: `packages/@glimmer/manager/lib/public/component.ts:127-135`,
`helper.ts:89-97`, `modifier.ts:91-99`. Tests:
`packages/@ember/-internals/glimmer/tests/integration/custom-component-manager-test.js:535-583`,
`custom-modifier-manager-test.js:18-39,315-353`,
`packages/@glimmer-workspace/integration-tests/test/managers/helper-manager-test.ts:427-451`.

In production builds this check is skipped, and any object with the right boolean fields
is accepted.

### 1.4 Internal managers

Besides the public factory-based API, the runtime has **internal managers**. These are
manager objects associated directly, without a factory or an owner cache, through
`setInternalComponentManager`, `setInternalHelperManager`, and
`setInternalModifierManager` (`packages/@glimmer/manager/lib/internal/api.ts:83-181`). The
public setters wrap the user's factory in an internal adapter (`CustomComponentManager`,
`CustomHelperManager`, `CustomModifierManager`) and register that adapter internally.

Internal managers are not public API. They matter to this specification because Ember's
built-in constructs are defined as internal managers with behaviors public managers cannot
express: classic components, `{{mount}}`, `{{outlet}}`, route templates, the root
component, `<Input>`, `<Textarea>`, `on`, `hash`, `array`, `fn`, `concat`, `get`, and the
comparison helpers. §8 specifies the component capabilities those behaviors need.

An internal helper manager has a different shape from a public one. It is a plain function
`(capturedArgs, owner, dynamicScope) => reactiveValue`, and the function *is* the manager
(`packages/@glimmer/runtime/lib/helpers/internal-helper.ts:4-6`). `invokeHelper` rejects
internal helpers in dev: ``Found a helper manager, but it was an internal built-in helper
manager. `invokeHelper` does not support internal helpers yet.``
(`packages/@glimmer/runtime/lib/helpers/invoke.ts:63-67`).

*Implementation note:* a new implementation may implement built-in helpers and modifiers
however it likes. It MUST preserve these observable facts:

- The exported values (for example `import { hash } from '@ember/helper'`, `import { on }
  from '@ember/modifier'`) are objects or functions that the template runtime recognizes
  as helpers / modifiers.
- `hasInternalHelperManager`-style checks (§1.6) report them correctly.
- `invokeHelper` rejects the built-in helpers.

### 1.5 Values without an associated manager (defaults)

| Invocation position | Value lacks a manager of that kind | Behavior |
|---|---|---|
| Helper | `typeof v === 'function'` | The **default helper manager** (§6.3) applies (RFC 0756). |
| Helper | any other object | Error (below). |
| Modifier | anything, including plain functions | Error. **There is no default modifier manager** in this codebase. `hasDefaultModifierManager` always returns `false` (`packages/@glimmer/manager/lib/internal/api.ts:246-248`). |
| Component | anything | Error. **There is no default component manager** (`api.ts:238-240`). Template-only components have an explicit manager (§5). |
| Component | a component definition with a manager but no associated template | The **default template** is used: a template consisting only of `{{yield}}` (strict mode, no `this`), unless the manager has the `dynamicLayout` capability (§8). Sources: `packages/@glimmer/program/lib/util/default-template.ts:7-16`, `packages/@glimmer/program/lib/constants.ts:202-208`. |

The error messages (all [Dev]; production behavior is unspecified and typically a
`TypeError`) are:

- Static helper lookup: `Attempted to load a helper, but there wasn't a helper manager
  associated with the definition. The definition was: <v>` (`api.ts:164-170`).
- Dynamic helper (`{{(this.x)}}`, `(this.x)`): ``Expected a dynamic helper definition, but
  received an object or function that did not have a helper manager associated with it.
  The dynamic invocation was `{{<label>}}` or `(<label>)`, and the incorrect definition is
  the value at the path `<label>`, which was: <v>``
  (`packages/@glimmer/runtime/lib/compiled/opcodes/expressions.ts:162-170`).
- Static modifier: `Attempted to load a modifier, but there wasn't a modifier manager
  associated with the definition. The definition was: <v>` (`api.ts:110-122`).
- Dynamic modifier: ``Expected a dynamic modifier definition, but received an object or
  function that did not have a modifier manager associated with it. The dynamic
  invocation was `{{<label>}}`, and the incorrect definition is the value at the path
  `<label>`, which was: <v>``
  (`packages/@glimmer/runtime/lib/compiled/opcodes/dom.ts:244-257`).
- Static component: `Attempted to load a component, but there wasn't a component manager
  associated with the definition. The definition was: <v>` (`api.ts:199-212`).
- Dynamic / curried component: ``Expected a dynamic component definition, but received an
  object or function that did not have a component manager associated with it. The
  dynamic invocation was `<label>` or `{{label}}`, and the incorrect definition is the
  value at the path `label`, which was: <v>``
  (`packages/@glimmer/runtime/lib/compiled/opcodes/component.ts:233-243`).
- Non-object passed where a definition is expected: `Attempted to use a value as a
  {component|helper|modifier}, but it was not an object or function. ...`
  (`api.ts:99-106,145-150,192-197`).

**Nullish and primitive values in dynamic positions** (details in
`05-runtime-semantics.md`):

- Dynamic helper: if the value is not a non-null object or function, the helper produces
  `undefined` and no error is raised (`expressions.ts:134-136`).
- Dynamic modifier: if the value is not a non-null object or function, no modifier is
  installed (`dom.ts:205-208`). A modifier installed later, when the value becomes a
  definition, is installed at that time. Test:
  `packages/@ember/-internals/glimmer/tests/integration/custom-modifier-manager-test.js:108-135`.
- Dynamic component: a falsy definition renders nothing
  (`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/components.ts`,
  `InvokeDynamicComponent`, `JumpUnless 'ELSE'`).

**Strings [Loose mode].** Strings are never definitions. In loose mode:

- `{{component "name"}}` and a curried component whose definition is a string resolve the
  string through the owner's resolver at invocation time
  (`component.ts:188-198,329-337`). §8.6 covers what resolution returns.
- In strict mode, passing a string to `{{component}}` is a dev error: ``Attempted to
  resolve a dynamic component with a string definition, `<s>` in a strict mode template.
  In strict mode, using strings to resolve component definitions is prohibited. You can
  instead import the component definition and use it directly.``
  (`component.ts:189-193`).
- Dynamic strings are never accepted by `(modifier)` / `(helper)` (see
  `08-ember-integration.md`).

### 1.6 Presence checks

The runtime sometimes needs to classify a value without invoking it, for example when
`{{x}}` in content position may be a component, a helper, or plain content
(`05-runtime-semantics.md`). The checks are:

- `hasComponentManager(v)`: a component association exists on `v`'s prototype chain.
- `hasHelperManager(v)`: `typeof v === 'function'`, or a helper association exists on the
  chain.
- `hasModifierManager(v)`: a modifier association exists on the chain.

Source: `packages/@glimmer/manager/lib/internal/api.ts:219-236`.

In content position the component check comes before the helper check
(`packages/@glimmer/runtime/lib/compiled/opcodes/content.ts:34-50`). A value with both
managers is therefore rendered as a component. A *plain function* in content position,
such as `{{this.fn}}`, is invoked as a helper with no arguments and its return value is
rendered (the default helper manager). §05-3.2 and §05-3.5 own the content-position rules.

### 1.7 Definition-level caching

The runtime turns each definition into an internal "definition record" once, and caches it
by definition identity (`packages/@glimmer/program/lib/constants.ts:94-242`). Observable
consequences:

1. A component manager's `getCapabilities(definition)` (internal) is called once per
   definition. Changing capabilities later has no effect.
2. A component's template factory is resolved once per definition, via
   `getComponentTemplate` and then `templateFactory(owner)`. It is called with the owner
   in effect at the definition's *first* use (`constants.ts:197-208`). The cache is keyed
   by the definition only, not by owner (`constants.ts:183`), and there is one cache per
   renderer (`packages/@ember/-internals/glimmer/lib/base-renderer.ts:627`). So within one
   renderer (an application and all its engines share one), a definition's template stays
   bound to the first owner that rendered it. For a loose-mode template this decides which
   owner resolves its free names. See Q15.
3. For helpers, `CustomHelperManager.getHelper(definition)` runs once per definition
   (`constants.ts:114-135`). This is invisible to user code, because the delegate factory
   is still per-owner.

---

## 2 Owners

### 2.1 `getOwner` / `setOwner`

An owner is an arbitrary object. Ember uses an `ApplicationInstance` or `EngineInstance`,
but the rendering layer treats owners as opaque. `setOwner(obj, owner)` stores the owner on
`obj` under a private symbol-keyed property, and `getOwner(obj)` reads that property
(`packages/@glimmer/owner/index.ts`). Because `getOwner` is an ordinary property read, an
owner set on a prototype is inherited by objects created from it. Ember's `@ember/owner`
functions wrap these (`packages/@ember/-internals/owner/index.ts:542-561`).

### 2.2 How owners flow

Every template scope has a current owner. For the root of a render, it is the owner passed
to the render entry point (`08-ember-integration.md`). A component's layout normally runs
with the owner of the scope that invoked it, with these exceptions:

- A curried component (`(component X)`, see `05-runtime-semantics.md`) captures the owner
  that was current when the currying happened. Its layout runs with **that** captured
  owner (`packages/@glimmer/runtime/lib/compiled/opcodes/component.ts:356-359,825-853`).
- A component whose internal manager has the `hasSubOwner` capability (§8) supplies a new
  owner for its layout through `manager.getOwner(instanceState)`. `{{mount}}` uses this to
  give an engine's templates the engine instance as owner (`component.ts:833-835`,
  `packages/@ember/-internals/glimmer/lib/component-managers/mount.ts:70-72`).

Owners reach managers as follows:

| Kind | Owner passed to the factory / `create` |
|---|---|
| Component | The owner of the **invoking** scope (`vm.getOwner()` at `create` time, `component.ts:429-437`). This holds even for curried components. See Open Question Q3. |
| Helper (static) | The owner of the invoking scope (`expressions.ts:179`). |
| Helper (dynamic, curried) | The owner captured when the helper was curried (`expressions.ts:111,124`). |
| Helper (dynamic, not curried) | The invoking scope's owner (`expressions.ts:101,129`). |
| Modifier (static) | The invoking scope's owner (`dom.ts:158`). |
| Modifier (dynamic, curried) | The captured owner (`dom.ts:220-233`). |
| `invokeHelper(context, …)` | `getOwner(context)`, which MAY be `undefined` (`invoke.ts:59`). |

A public manager factory receives this owner as its only argument. A manager commonly gives
it to instances with `setOwner(instance, owner)`, which is what `@glimmer/component` does
(§9). Classic helpers receive it through `create()` injections (§6.5).

*Note:* public component and modifier managers keep their per-owner caches in a `WeakMap`.
An `undefined` owner therefore makes caching throw (`WeakMap` keys must be objects). In
Ember an owner is always present for templates, so this cannot be observed there. See Q4.

---

## 3 Arguments objects ("args proxies")

Public component, helper, and modifier managers never see references or the runtime's
internal argument structures. They receive an **arguments object** `{ named, positional }`,
produced by `argsProxyFor(capturedArgs, kind)`
(`packages/@glimmer/manager/lib/util/args-proxy.ts:139-188`).

One arguments object is created per component / helper / modifier instance, when the
instance is created. The **same object** is passed to every later hook for that instance:
`updateComponent`, `getValue`, `installModifier`, `updateModifier`, and `destroyModifier`
(`component.ts:149-153,161-168`, `helper.ts:124-125`, `modifier.ts:110-124`). Hooks MAY keep
it and read it at any later time. Each read returns the argument's current value.

### 3.1 Captured arguments

Each argument is a reactive computation that evaluates the argument expression in the
caller's scope (`05-runtime-semantics.md`):

- one per positional argument, in source order;
- one per named argument, keyed by name in source order.

For curried definitions, the curried arguments are merged in first. The key set and the
positional length are fixed when the instance is created. They never change for the
lifetime of the instance.

### 3.2 `args.named`

`args.named` is a Proxy over a null-prototype target (`args-proxy.ts:59-102,152`). Its
behavior:

| Operation | Behavior |
|---|---|
| `named.k` / `named[k]` where `k` is an argument name | Evaluates argument `k` and returns its current value. The read **consumes** the argument: the tracked storage the argument expression depends on joins the current reactive computation. The argument computation is cached, so repeated reads with no invalidation do not re-evaluate the expression. |
| `named.k` where `k` is not an argument name, including `toString`, `constructor`, and symbols | `undefined`. Nothing is consumed. |
| `k in named` | `true` iff `k` is an argument name. **Does not** consume. |
| `Object.keys(named)`, `for…in`, `Object.entries` enumeration of keys | The argument names in order. Enumeration itself does not consume. `Object.entries` / spreading then reads each value, which consumes each value. |
| `Object.getOwnPropertyDescriptor(named, k)` | For an argument name, returns `{ enumerable: true, configurable: true }` with no `value`. [Dev] For a non-argument name it throws: ``args proxies do not have real property descriptors, so you should never need to call getOwnPropertyDescriptor yourself. This code exists for enumerability, such as in for-in loops and Object.keys(). Attempted to get the descriptor for `<k>` `` (`args-proxy.ts:88-101`). |
| `Object.isExtensible(named)` | The trap returns `false` (`args-proxy.ts:83-85`). See Q7. |
| `named.k = v` (any `k`) | [Dev] throws: `You attempted to set <k> on the arguments of a component, helper, or modifier. Arguments are immutable and cannot be updated directly; they always represent the values that are passed down. If you want to set default values, you should use a getter and local tracked state instead.` (`args-proxy.ts:156-162`). Tests: `packages/@ember/-internals/glimmer/tests/integration/helpers/custom-helper-test.js:806-895`. In production the write is not intercepted (Q7). |

Laziness: in the current implementation an argument is not evaluated until something reads it,
so a manager or instance that never reads an argument never evaluates its expression. When
arguments are evaluated is not part of the contract (§00-0.1). Test: "does not eagerly access
arguments during destruction",
`packages/@glimmer-workspace/integration-tests/test/managers/modifier-manager-test.ts:251-295`.

### 3.3 `args.positional`

`args.positional` is a Proxy whose target is an empty array, so
`Array.isArray(args.positional) === true` (`args-proxy.ts:104-137,153`). Its behavior:

| Operation | Behavior |
|---|---|
| `positional.length` | The number of positional arguments. Does not consume. |
| `positional[i]` for an integer `0 ≤ i < length` (a number, or a string such as `"0"`) | Evaluates and returns argument `i`, consuming it. |
| `positional[i]` for other integers (including negative) or other keys | Delegates to the target array: `undefined` for indices, `Array.prototype` methods for method names. Test: "accessing negative index of positional args returns undefined", `custom-helper-test.js:800-812`. |
| `i in positional` | `true` iff `i` is an integer in range. Does not consume. |
| Iteration (`for…of`, spread, `map`, `forEach`, `slice`, destructuring `[a, b]`) | Works through `length` and indexed reads, so it consumes every element it visits. |
| `Object.keys(positional)` / `for…in` | [Dev] throws: `Object.keys() was called on the positional arguments array for a <kind>, which is not supported. ... You may be attempting to iterate over the array using for...in instead of for...of.` (`args-proxy.ts:164-168`). |
| Assignment (`positional[0] = x`, `push`) | [Dev] throws the same immutability error as named (`args-proxy.ts:171`). |

### 3.4 Property-dependency integration [Legacy]

Both proxies are registered with a "custom dependency" hook (`setCustomTagFor`,
`args-proxy.ts:12-20,180-181`). Ember's property-based dependency system then treats them
as follows (`computed` dependent keys, `get`-based tracking; see `07-reactivity.md` and
`08-ember-integration.md`):

- On `named`, a dependency on key `k` is a dependency on argument `k`, when it exists
  (`args-proxy.ts:32-39`).
- On `positional`, a dependency on `'[]'` is a dependency on **all** positional arguments.
  A dependency on an in-range integer key is a dependency on that argument. Any other key,
  including `'length'`, depends on nothing (`args-proxy.ts:41-56`).

Tests: `computed('args.named.firstName', ...)`, `computed('args.positional.[]')`,
`computed('args.positional.0', ...)` in
`packages/@ember/-internals/glimmer/tests/integration/custom-component-manager-test.js:253-424`.

### 3.5 `invokeHelper` arguments

`invokeHelper` builds a *different* arguments object: `positional` and `named` are getters
that return whatever the user's `computeArgs(context)` returned. The fallback is a frozen
empty array / object. `computeArgs` itself runs as a cached reactive computation
(`packages/@glimmer/runtime/lib/helpers/invoke.ts:19-44`). The object is frozen in dev
(`invoke.ts:28-31`; test
`packages/@ember/-internals/glimmer/tests/integration/helpers/invoke-helper-test.js:588`).

The returned arrays and objects are the user's own values, not proxies. Reading
`args.positional` consumes whatever `computeArgs` consumed, all at once.

---

## 4 Public component manager API

### 4.1 `capabilities(version, options)`

```ts
import { capabilities } from '@ember/component';
capabilities('3.13', { asyncLifecycleCallbacks?, destructor?, updateHook? })
```

Source: `packages/@glimmer/manager/lib/public/component.ts:44-59`.

- The only accepted version is `'3.13'`. [Dev] Any other version, **including `'3.4'`**,
  throws `Invalid component manager compatibility specified`. RFC 0686 deprecated
  `'3.4'`, and it is now removed (`rfcs/text/0686-deprecate-old-manager-capabilities-versions.md`).
  In production the version is not checked. `'3.4'` then behaves exactly like `'3.13'`,
  so `updateHook` defaults to `false` (see Q1).
- The result is `{ asyncLifeCycleCallbacks, destructor, updateHook }`. Each value is the
  `Boolean()` of the corresponding option, defaulting to `false`. The option key is spelled
  `asyncLifecycleCallbacks` (lowercase "c"), but the result key is
  `asyncLifeCycleCallbacks`. Only the result key is read afterwards.
- Unknown option keys are ignored.

Capability meanings:

| Capability | Default | When `true` |
|---|---|---|
| `asyncLifecycleCallbacks` | false | `didCreateComponent` is called in the commit phase after initial render. `didUpdateComponent` is called in the commit phase after updates, **only if `updateHook` is also true**. |
| `destructor` | false | `destroyComponent` is called when the component is destroyed. |
| `updateHook` | false | `updateComponent` is called during update passes (§4.4). |

### 4.2 Manager interface

```ts
interface ComponentManager<I> {
  capabilities: ComponentCapabilities;
  createComponent(definition: object, args: Arguments): I;
  getContext(instance: I): unknown;
  updateComponent?(instance: I, args: Arguments): void;   // if updateHook
  didCreateComponent?(instance: I): void;                 // if asyncLifecycleCallbacks
  didUpdateComponent?(instance: I): void;                 // if asyncLifecycleCallbacks && updateHook
  destroyComponent?(instance: I): void;                   // if destructor
}
```

Source: `packages/@glimmer/interfaces/lib/managers/component.d.ts:23-52`.

A hook whose capability is off is never called, even if it is defined. Test: "updating
arguments does not trigger updateComponent or didUpdateComponent if `updateHook` is false",
`custom-component-manager-test.js:810-850`.

### 4.3 Initial render sequence

Suppose a component definition `D` with a public manager is invoked, by any invocation
syntax (angle bracket, curly, `{{component}}`, dynamic, curried). The steps below happen in
this order:

1. **Argument capture.** The arguments object (§3) is created from the invocation's
   arguments. Curried arguments come first. Every named and positional argument passed at
   the invocation site is included, because the public adapter has the internal
   `createArgs` capability (§8). The expressions are not evaluated yet.
2. **Region start.** The component's reactive region begins (§4.4). From here until step 7,
   every consumption of tracked storage is attributed to this component's region.
3. **Manager resolution.** If this (association, owner) pair has not been seen before, the
   factory is called with the owner (§1.3) and its capabilities are validated.
4. **`createComponent(D, args)`.** `D` is the definition value itself: the class, or
   whatever object carries the association. In loose-mode resolution it is the resolved
   class (`factoryFor(...).class`) (§8.6). The return value is the opaque *instance*.
   - The hook runs inside the component's region. Tracked storage it consumes becomes a
     dependency of the region, which can cause `updateComponent` to run later (§4.4). It
     never causes the instance to be recreated.
   - Reading and then writing the same tracked storage inside the hook hits the
     "backtracking" assertion [Dev] (`07-reactivity.md`). Tests:
     `packages/@glimmer-workspace/integration-tests/test/managers/helper-manager-test.ts:453`
     (helpers), `modifier-manager-test.ts:219` (modifiers).
5. **Destructor registration.** If `destructor` is true, a destructor that calls
   `destroyComponent(instance)` is registered on an internal bucket. That bucket is
   associated as a destroyable child of the enclosing block (§10.3)
   (`component.ts:190-201`, `packages/@glimmer/runtime/lib/compiled/opcodes/component.ts:448-468`).
6. **`getContext(instance)`.** This is called exactly **once** per instance. Its return
   value becomes the template's `this` for the component's layout for the whole lifetime
   of the instance. The result is not reactive, so a later change to what `getContext`
   would return has no effect (`component.ts:186-188`). The context MAY be any value,
   including `null`. With `null`, `{{this.x}}` renders empty and `@args` still work. Test:
   "it can have no template context", `custom-component-manager-test.js:120-150`. It MAY
   also be an object unrelated to the instance. Test: "it can customize the template
   context", `custom-component-manager-test.js:208-251`.
7. **Layout render.** The component's template renders with `this` = context, `@name`
   bound to the named arguments, and the invocation's blocks and `...attributes`
   available (`05-runtime-semantics.md`). Positional arguments are not accessible from the
   layout.
8. **Region end.**
9. **Commit phase** (§11). If `asyncLifecycleCallbacks` is true,
   `didCreateComponent(instance)` is called.

Observed step order: `createComponent`, `getContext`, *(render)*, `didCreateComponent`
(`custom-component-manager-test.js:474-532`).

`didCreateComponent` is called at the end of the same render transaction, synchronously. It
is "async" only relative to the render. It is **not** deferred to a later task.

### 4.4 Update semantics

Each component invocation owns a **component region** (§07-0), which §05-1.6 defines as the
*component update region* together with its skipping rule. It is the tracked storage
consumed while the invocation rendered. For a public manager that covers:

- its `createComponent` and `getContext` calls;
- its layout, including every nested component, block, and modifier rendered inside it;
- blocks passed *into* it by the caller and yielded from inside it;
- attribute and argument values evaluated inside it.

During an update pass, a component's region is **re-validated** when (a) the enclosing
region is itself being re-validated, and (b) any tracked storage in the component's region
has been invalidated since the region was last validated. If the region is still valid, the
whole invocation, including its hooks and its descendants, is skipped (§05-1.6).

When the region is re-validated:

1. If `updateHook` is true, **`updateComponent(instance, args)`** is called *before*
   anything inside the component's layout is updated. `args` is the same arguments object
   as at creation (`component.ts:161-168`,
   `packages/@glimmer/runtime/lib/compiled/opcodes/component.ts:940-952`).
2. The layout's contents are updated (`05-runtime-semantics.md`).
3. The component is recorded as "updated". In the commit phase, if
   `asyncLifecycleCallbacks && updateHook`, **`didUpdateComponent(instance)`** is called
   (`component.ts:176-180`).

Because the region contains everything rendered inside the component, `updateComponent`
does **not** run only when an argument changes. It runs whenever *anything* tracked inside
the component's region changed. Examples:

- a change in a block the caller passed in (content that belongs to the caller);
- a change in an attribute passed with `...attributes`;
- a change in a descendant component.

A change deep in a descendant re-validates every ancestor region, so every ancestor with
`updateHook` gets `updateComponent`. This coarse granularity is **required**, even though
RFC 0213 describes the hook as running when arguments change: `updateHook`, like the classic
update hooks (§08-6.7), exists for compatibility with older component patterns, which
depend on it. Typical modern components do not use these hooks, so they do not pay for the
coarse granularity. A conforming implementation MUST NOT narrow when `updateComponent`
runs, even if its own invalidation is finer-grained. Tests:

- "updateComponent fires consistently with or without args": three invocations with no
  args, a static `@id`, and a dynamic `@id`. Changing only `{{this.value}}` inside their
  yielded blocks calls `updateComponent` on all three
  (`custom-component-manager-test.js:750-808`).
- "updating attributes triggers updateComponent and didUpdateComponent"
  (`custom-component-manager-test.js:689-748`).

Conversely, if an argument changes but nothing in the region consumed it (no read of
`args.named.x`, no `@x` in the layout), the region stays valid and `updateComponent` is not
called.

A new implementation MUST reproduce this region-granular trigger. A narrower rule
such as "only when arguments changed" would change the number of `updateComponent` calls,
and classic components' `willUpdate` / `didUpdate` / `didRender` hooks depend on it (§8.5).

Ordering across components: `updateComponent` calls happen top-down, parent before child,
in document order. `didUpdateComponent` calls happen in the commit phase in the order
component *updates finished*: child before parent, siblings in document order (§11).

### 4.5 Destruction

When the block containing the component is torn down (`05-runtime-semantics.md`; §10):

- If `destructor` is true, `destroyComponent(instance)` is called once, as a **deferred**
  destructor (§10.2). In Ember it runs in the run loop's `actions` queue, after the
  render-queue work that removed the DOM
  (`packages/@ember/-internals/glimmer/lib/environment.ts:35-41`). The component's DOM has
  already been removed by then. Test: "it can opt-in to running destructor",
  `custom-component-manager-test.js:426-473`.
- If `destructor` is false, nothing is called. The instance is simply dropped.
- The instance **itself is not** associated into the destroyable tree by the adapter. Only
  the adapter's internal bucket is. So `isDestroying(instance)` stays `false` unless the
  manager calls `destroy(instance)`, as the Glimmer component manager does (§9.1).

### 4.6 `getDebugName`

The adapter uses `definition.name` for functions and `String(definition)` otherwise
(`component.ts:156-159`). This affects only debug tooling (the debug render tree) and error
messages.

---

## 5 Template-only components

`templateOnly(moduleName?, name?)` from `@ember/component/template-only` returns a **new**
definition object on every call (`packages/@glimmer/runtime/lib/component/template-only.ts:82-87`,
`packages/@ember/component/template-only.ts:59-62`). The object is a
`TemplateOnlyComponentDefinition`. Its manager is inherited from the prototype (§1.2), and
its template is attached with `setComponentTemplate` (`01-authoring-formats.md`). `toString()`
returns `moduleName`, which defaults to `'@glimmer/component/template-only'`. The debug name
is `name`, defaulting to `'(unknown template-only component)'`
(`template-only.ts:43-52`).

The template-only manager has every capability false (`template-only.ts:6-20`). Observable
semantics:

- No instance is created and no hook runs. `this` in the layout is `null`
  (`template-only.ts:31-33`), so `{{this.x}}` renders empty.
- Named arguments are available as `@name`. Positional arguments are ignored.
- The component has no destroyable of its own (`template-only.ts:35-37`).
- **[Optimization-visible]** When the invocation is compiled statically, only the named
  arguments that the layout references are evaluated. Unreferenced argument expressions
  are never evaluated, so helpers in them are never created
  (`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/components.ts`,
  `InvokeStaticComponent`, the `else if (named !== null)` branch). This is an optimization
  that implementations MAY make or not; evaluation is not part of the contract (§00-0.1).
- Loose-mode resolution: a template registered with no component class resolves to a fresh
  template-only definition (§8.6).

---

## 6 Helper managers

### 6.1 `capabilities('3.23', options)`

`packages/@glimmer/manager/lib/public/helper.ts:26-57`:

- The version must be `'3.23'`. [Dev] Otherwise it throws ``Invalid helper manager
  compatibility specified; you specified <v>, but only '3.23' is supported.``
- Exactly one of `hasValue` / `hasScheduledEffect` MUST be true. [Dev] Otherwise it throws
  ``You must pass either the `hasValue` OR the `hasScheduledEffect` capability when defining
  a helper manager. Passing neither, or both, is not permitted.``
- `hasScheduledEffect: true` is not implemented. [Dev] It throws ``The `hasScheduledEffect`
  capability has not yet been implemented for helper managers. Please pass `hasValue`
  instead``.
- `hasDestroyable` defaults to false.
- The result is `{ hasValue, hasDestroyable, hasScheduledEffect }`, each coerced with
  `Boolean()`.

Tests: `packages/@glimmer-workspace/integration-tests/test/managers/helper-manager-test.ts:370-405`.

In production none of the checks run (§6.2 covers the resulting behavior).

### 6.2 Manager interface and semantics

```ts
interface HelperManager<B> {
  capabilities: HelperCapabilities;
  createHelper(definition: object, args: Arguments): B;
  getValue?(bucket: B): unknown;          // if hasValue
  getDestroyable?(bucket: B): object;     // if hasDestroyable
  getDebugName?(definition: object): string;
}
```

Source: `packages/@glimmer/interfaces/lib/managers/helper.d.ts:17-35`. `runEffect` appears
in the Ember documentation (`packages/@ember/helper/index.ts:115-131`) but is never called.

For each evaluation of a helper invocation expression, whether `{{h ...}}` in content,
attribute, or argument position, or `(h ...)` as a sub-expression:

1. **Creation.** The manager is resolved for the current owner (§2.2). The arguments object
   is created (§3), then `createHelper(definition, args)` is called. It returns an opaque
   bucket.
   - *Timing, static invocation* (the helper is known when the template is compiled, or is
     resolved by name): `createHelper` runs **eagerly**, when the rendering process
     evaluates the helper expression. This happens even if the resulting value is never
     read. Example: in `{{if true (a) (b)}}`, both `(a)` and `(b)` are created, in the
     order falsy, truthy, condition, but only `(a)`'s value is computed. Test: "helpers are
     not computed eagerly when used with if expressions",
     `packages/@ember/-internals/glimmer/tests/integration/helpers/custom-helper-test.js:787-798`;
     order from `packages/@glimmer/opcode-compiler/lib/syntax/expressions.ts:104-110`.
     `createHelper` runs within the enclosing region. Its consumption is attributed to that
     region, and the helper is never recreated because of it. In effect `createHelper` "is
     not autotracked" (`rfcs/text/0625-helper-managers.md`), and a new implementation MAY
     run it untracked. The timing of `createHelper`, eager here and lazy in dynamic position,
     describes the current implementation; it is not part of the contract (§00-0.1).
   - *Timing, dynamic invocation* (`(this.h)`, `{{(@h)}}`, `(helper …)`-curried values):
     creation is **lazy**. It happens the first time the helper's value is read, inside a
     reactive computation that also reads the definition value. If the definition value
     changes, or anything `createHelper` consumed changes, the previous helper instance is
     **destroyed** (§10) and a new one is created on the next read (`expressions.ts:95-147`).
2. **Destroyable.** If `hasDestroyable`, `getDestroyable(bucket)` is called **immediately
   after** `createHelper`. The returned object becomes a destroyable child of the helper
   instance, which is in turn a child of the enclosing block (§10.3)
   (`helper.ts:134-136,139-147`).
3. **Value.** If `hasValue`, the helper's value is a cached reactive computation that calls
   `getValue(bucket)` (`helper.ts:127-138`):
   - It is called the first time the value is read, not at creation.
   - It is called again on a later read only if tracked storage it consumed last time has
     changed. Arguments count as consumed only if `getValue` (or code it calls) actually
     read them from the arguments object (§3). Unread arguments never trigger it.
   - Between invalidations, reads return the cached value without calling `getValue`.

   Tests: "tracks changes to named arguments", "tracks changes to positional arguments",
   "tracks changes to tracked properties", and "it works" (a rerender without changes does
   not re-call `getValue`) (`helper-manager-test.ts:21-37,245-337`).
4. If `hasValue` is false (reachable only in production, §6.1), the helper's value is
   always `undefined`. `getDestroyable` is still honored if `hasDestroyable`
   (`helper.ts:139-150`).

The helper's value is then used by the surrounding construct (content, attribute,
argument, …). If the surrounding construct re-reads the value in an update pass,
`getValue` may run again as described in step 3.

**Blocks and element position [Loose mode].** Helpers cannot be invoked with a block or in
element-modifier position. These are compile-time or dev errors covered in
`03-static-semantics.md`. Tests: `custom-helper-test.js:458-511`.

### 6.3 Default helper manager (plain functions)

A value `f` with `typeof f === 'function'` and no helper association on its prototype chain
uses the default manager (RFC 0756; `packages/@glimmer/manager/lib/internal/defaults.ts:21-59`,
`api.ts:134,154-158`). Its capabilities are `hasValue: true`, `hasDestroyable: false`.

- `createHelper(f, args)` records `f` and `args`.
- `getValue` computes, as a reactive computation (§6.2 step 3):
  - if there is **at least one** named argument: `f(...positional, named)`;
  - otherwise: `f(...positional)`.

  `positional` is spread from the positional proxy, so **every positional argument is
  consumed** on every call. `named` is passed as the named-args proxy itself. Checking for
  named arguments enumerates keys without consuming values (`defaults.ts:43-49`), so a named
  argument is consumed only if `f` reads it.
- `this` is `undefined` inside `f`, since it is called as a plain function. Class methods
  work only if they don't use `this`, unless they are bound (for example with `@action`).
  Tests: `packages/@ember/-internals/glimmer/tests/integration/helpers/default-helper-manager-test.js:135-172`.
- The debug name is `(helper function <name>)` or `(anonymous helper function)`
  (`defaults.ts:52-58`).

Examples:

```gjs
const greet = (name, opts) => `${opts?.greeting ?? 'hi'} ${name}`;
<template>{{greet "Ann"}}|{{greet "Ann" greeting="yo"}}</template>
```

This renders `hi Ann|yo Ann`. In the first call `opts` is `undefined`, because there are no
named arguments and so no trailing argument is passed.

Tracking tests:

- "plain functions track positional args": changing an unused positional arg still re-runs
  `f`.
- "plain functions do not track unused named args".
- "plain functions tracked used named args".
- "plain function helpers can have default values": a missing trailing positional argument
  is simply not passed, so JS default parameters apply. An explicitly passed `undefined`
  also triggers the default.

These are in `packages/@glimmer-workspace/integration-tests/test/managers/helper-manager-test.ts:39-243`.

A function that *has* a helper association (via `setHelperManager` on it or on its
prototype chain) uses that association instead. Examples are classic helper classes (§6.5)
and `Function.prototype` if someone associated a manager there.

### 6.4 `invokeHelper(context, definition, computeArgs?)`

`packages/@glimmer/runtime/lib/helpers/invoke.ts:48-98`, `@ember/helper` (RFC 0626):

1. [Dev] If `context` is not a non-null object, it throws: `Expected a context object to be
   passed as the first parameter to invokeHelper, got <context>`.
2. The owner is `getOwner(context)`. The delegate is the manager for that owner, which may
   be `undefined`. Internal (built-in) helpers are rejected (§1.4).
3. The arguments object is built as in §3.5. `createHelper(definition, args)` is called
   immediately and synchronously.
4. If `hasValue`, a cache (a reactive computation, `07-reactivity.md`) wrapping `getValue`
   is created. It is **associated as a destroyable child of `context`**. [Dev] Reading it
   after it is destroying or destroyed throws: `You attempted to get the value of a helper
   after the helper was destroyed, which is not allowed`.
   If `hasValue` is false, it throws `TODO: unreachable, to be implemented with
   hasScheduledEffect` (this path is always taken, not only in dev).
5. If `hasDestroyable`, `getDestroyable(bucket)` is called and associated as a child of the
   cache.
6. It returns the cache. Its value is read with `getValue` from
   `@glimmer/tracking/primitives/cache`.

Destruction order when `context` is destroyed: the helper's destroyable's destructors run
first, then the cache's, then the context's (§10.2; test
`packages/@ember/-internals/glimmer/tests/integration/helpers/invoke-helper-test.js:562-586`,
"destructors ran in correct order": `['instance', 'cache', 'context']`).

### 6.5 Classic `Helper` class [Legacy]

`import Helper from '@ember/component/helper'`
(`packages/@ember/-internals/glimmer/lib/helper.ts`). `Helper` extends Ember's framework
object model (`08-ember-integration.md`), and a helper manager is associated with the
`Helper` class (`helper.ts:268`). So every subclass is a helper through prototype lookup.

Manager semantics (`ClassicHelperManager`, `helper.ts:206-262`):

- Capabilities: `hasValue: true, hasDestroyable: true`.
- The factory receives the owner, which may be undefined. It builds an "owner injection"
  object `{}` with that owner set on it (`setOwner`).
- `createHelper(definition, args)`:
  - If `definition` is a factory-manager object, meaning it has a `class` property (what
    loose-mode resolution produces, §8.6), the instance is `definition.create()`.
  - Otherwise the instance is `definition.create(ownerInjection)`, so the instance's owner
    is the render owner.
  - [Dev] The runtime asserts the instance has `compute` and `destroy` functions (`expected
    HelperInstance`). The class's `init` asserts that `compute` exists.
  - Instance construction runs the class's `init` / constructor at creation time (§6.2
    step 1 timing).
- `getDestroyable` returns the instance itself.
- `getValue` calls `instance.compute(args.positional, args.named)`, passing the two
  **proxies** (§3), not plain copies. After `compute` returns, it consumes the instance's
  private *recompute* storage.
- `recompute()` invalidates that recompute storage, wrapped in `join` so that it schedules a
  render when called outside a run loop (`helper.ts:190-192`). It causes `compute` to run
  again the next time the value is read. Tests: "class-based helper can recompute a new
  value", including without a run loop, `custom-helper-test.js:86-231`.
- Destruction: the instance is destroyed through the destroyable tree. Ember's object model
  registers an *eager* destructor that calls `instance.destroy()` and a deferred destructor
  that calls `instance.willDestroy()` (`packages/@ember/object/core.ts:300-301`). Observed
  order: `destroy`, then `willDestroy`. Test: "class-based helper lifecycle", with the
  sequence `['init','compute','compute','destroy','willDestroy']`
  (`custom-helper-test.js:120-160`).

### 6.6 `helper(fn)` simple helpers [Legacy]

`helper(fn)` returns a `Wrapper` object `{ isHelperFactory: true, compute: fn, create() }`
whose prototype has the `SimpleClassicHelperManager` association (`helper.ts:274-307,388+`).
Semantics:

- One shared manager for all owners, capabilities `hasValue: true` only.
- `getValue` calls `fn.call(null, args.positional, args.named)`. Both are the **proxies**.
  So `fn([a], {b})` destructuring consumes only what it destructures: array destructuring
  reads indexes, and object destructuring reads keys.
- There is no instance, no owner, and no destruction.
- `Wrapper.create()` returns `{ compute }`, which supports
  `owner.factoryFor('helper:x').create().compute(...)`. Test:
  `custom-helper-test.js:671-700`.

---

## 7 Modifier managers

### 7.1 `capabilities('3.22', options)`

`packages/@glimmer/manager/lib/public/modifier.ts:26-39`:

- The version must be `'3.22'`. [Dev] Otherwise it throws ``Invalid modifier manager
  compatibility specified; you specified <v>, but only '3.22' is supported.`` In
  particular `'3.13'` is rejected; it was deprecated by RFC 0686. In production any
  version string is accepted and behaves as `'3.22'` (Q1).
- The only option is `disableAutoTracking` (default false). The result is
  `{ disableAutoTracking }`.

### 7.2 Manager interface

```ts
interface ModifierManager<I> {
  capabilities: ModifierCapabilities;
  createModifier(definition: unknown, args: Arguments): I;
  installModifier(instance: I, element: Element, args: Arguments): void;
  updateModifier(instance: I, args: Arguments): void;
  destroyModifier(instance: I, args: Arguments): void;
}
```

Source: `packages/@glimmer/interfaces/lib/managers/modifier.d.ts:16-22`. All four hooks are
required. The runtime calls them unconditionally.

### 7.3 Lifecycle

Consider an element modifier invocation `<el {{m ...args}}>`, which may also reach an
element through `...attributes` (`05-runtime-semantics.md`).

**Non-interactive environments.** If the environment is non-interactive (SSR, or
`isInteractive: false`), the modifier is **not created at all**. No hook is called and no
argument is evaluated (`packages/@glimmer/runtime/lib/compiled/opcodes/dom.ts:153-157,201-203`).
Tests: `packages/@ember/-internals/glimmer/tests/integration/custom-modifier-manager-test.js:584-641`,
and the `on` equivalent in `packages/@ember/-internals/glimmer/tests/integration/modifiers/on-test.js:333`.

**Interactive environments:**

1. **Create.** During element construction, while the element is still being built, the
   manager is resolved for the owner (§2.2) and the arguments object is created. Then
   `createModifier(definition, args)` is called. `definition` is the modifier value; for
   loose-mode resolution it is `factoryFor('modifier:x').class` (§8.6).
   - `createModifier` runs during render, like `createHelper` (§6.2). It is not a
     dependency source for the modifier, and in the static case consumption in it never
     causes recreation. It MUST NOT be relied on to see the element.
   - A destructor that calls `destroyModifier(instance, args)` is registered on the
     modifier's internal state object (`modifier.ts:124`).
   - Several modifiers on the same element are created in source order.
2. **Schedule install.** When the element is *closed* (its children have been rendered),
   each of its modifiers is scheduled for installation, in source order. Its state object
   becomes a destroyable child of the enclosing block (`dom.ts:138-150`). An inner element
   closes before its parent, so an inner element's modifiers are scheduled before the
   outer element's.
3. **Install (commit phase).** For each scheduled modifier in schedule order,
   `installModifier(instance, element, args)` runs as a reactive computation. The set of
   tracked storage it consumes becomes the modifier's **dependency set**
   (`packages/@glimmer/runtime/lib/environment.ts:63-77`, `modifier.ts:145-153`). The
   element is in the DOM at this point.

   Order tests: "same element insertion order" (`foo`, `bar`), "parent -> child insertion
   order" (`bar` inner, then `foo` outer), "sibling insertion order" (`bar`, `baz`, `foo`)
   (`packages/@glimmer-workspace/integration-tests/test/modifiers-test.ts:304-424`).
4. **Update.** During an update pass, when the region containing the modifier is
   re-validated and the modifier's dependency set has been invalidated, the modifier is
   scheduled for update (`dom.ts:308-328`). In the commit phase, after all installs,
   `updateModifier(instance, args)` runs as a reactive computation. Its consumption
   **replaces** the dependency set.

   Only storage read by the most recent install or update call is tracked. Test "lifecycle
   hooks are autotracked by default": `install` reads `trackedOne`, `update` reads
   `trackedTwo`. The first `trackedTwo` change does nothing. A `trackedOne` change triggers
   update, after which only `trackedTwo` changes trigger update
   (`packages/@glimmer-workspace/integration-tests/test/managers/modifier-manager-test.ts:165-217`).

   Arguments count only if consumed through the arguments object: "modifers only track
   positional arguments they consume" and "... named arguments they consume"
   (`modifier-manager-test.ts:329-424`). A modifier that consumes nothing is never updated.
   Test: "didUpdate is not called when params are constants",
   `modifiers-test.ts:56`.
5. **Destroy.** When the enclosing block is torn down, `destroyModifier(instance, args)` is
   called as a **deferred** destructor (§10.2). The element has already been removed from
   the DOM by then. It is the same element object that was passed to `installModifier`
   (`modifier-manager-test.ts:128-163`). Arguments are **not** read eagerly during
   destruction (§3.2).

   Destruction order matches installation order: "same element destruction order"
   (`foo`, `bar`), "parent -> child destruction order" (`bar`, `foo`), "sibling destruction
   order" (`bar`, `baz`, `foo`) (`modifiers-test.ts:326-460`). The block's destroyable
   children are destroyed in association order (§10.2), and modifier state is associated
   at element close.

`disableAutoTracking: true`: `installModifier` and `updateModifier` run **untracked**
(`modifier.ts:148-150,158-160`). Their consumption, including argument reads, is recorded
nowhere, so the dependency set is empty and `updateModifier` is never called. No test
covers this (Q2).

**Dynamic modifiers** (`<el {{this.m}}>`, `{{(modifier …)}}` curried values):

- The definition value is read inside a reactive computation that also runs
  `createModifier`.
- If the definition value changes identity, or anything `createModifier` consumed changes,
  then in the update pass:
  - the old modifier instance (if any) is destroyed (deferred);
  - a new one is created and scheduled for install;
  - its destroyable is associated with the dynamic-modifier slot, which belongs to the
    enclosing block.
- If the value becomes a non-object, the old modifier is destroyed and none is installed.
- If the value starts as a non-object and later becomes a modifier, the new modifier is
  installed in the commit phase of that update.

Sources: `dom.ts:194-306,330-384`. Tests:
`packages/@glimmer-workspace/integration-tests/test/modifiers/dynamic-modifiers-test.ts:204-251`,
`custom-modifier-manager-test.js:108-135`.

For a curried modifier, the curried positional arguments come first, followed by the
invocation's positional arguments. Curried named arguments are overridden by
invocation-site named arguments of the same name (`dom.ts:225-232`).

### 7.4 The `on` modifier

`on` (`packages/@glimmer/runtime/lib/modifiers/on.ts`, RFC 0471) is an internal modifier.
It is exported as `on` from `@ember/modifier` and is also available as a keyword
(`03-static-semantics.md`). Usage: `{{on eventName callback capture=? once=? passive=?}}`.

Semantics:

- **Install** runs the *listener update* procedure below. **Update** runs it again whenever
  the modifier's dependencies change. Those dependencies are exactly what the procedure
  read: the event name, the callback, and in production only the `once`, `passive`, and
  `capture` named arguments. [Dev] builds read *all* named arguments while validating, so
  they may trigger extra no-op updates (Q9).
- Listener update (`on.ts:57-222`):
  1. Read `eventName = positional[0]`. [Dev] It must be a non-empty string: ``You must pass
     a valid DOM event name as the first argument to the `on` modifier``. The error has a
     second form with ` on <selector>` appended, where the selector is `tag#id.class...`.
  2. Read `callback = positional[1]`. [Dev] It must be a function: ``You must pass a
     function as the second argument to the `on` modifier; you passed <null|typeof>.
     While rendering:\n\n<label>`` (plus ` on <selector>` in one variant). Tests
     `on-test.js:249-271`.
  3. [Dev] Exactly two positional arguments: ``You can only pass two positional arguments
     (event name and callback) to the `on` modifier, but you provided <n>. Consider using
     the `fn` helper to provide additional arguments to the `on` callback on <selector>``.
  4. Read `once`, `passive`, and `capture` if present. [Dev] Each must be boolean or
     undefined, and any other named argument is an error: ``You can only `once`,
     `passive` or `capture` named arguments to the `on` modifier, but you provided <keys>
     on <selector>``.
  5. If there is no current listener, or any of (eventName, callback identity, once,
     passive, capture) differs from the current listener:
     - Build `options = { once, passive, capture }` if any of the three is not
       `undefined`. Otherwise `options` is `undefined`. Explicit `false` values are passed
       through.
     - Record the new listener.
     - Remove the old listener, if any, with its old name, wrapped callback, and options.
     - Call `element.addEventListener(eventName, wrappedCallback, options)`.

     If nothing differs, the procedure does nothing. Test: "unrelated updates to `this`
     context does not result in removing + re-adding"
     (`packages/@glimmer-workspace/integration-tests/test/modifiers/on-test.ts:301-320`).
- The callback is invoked by the DOM with the event, with the DOM's arguments. In
  production, `this` is the element, as the DOM passes it, because the callback is not
  rebound. [Dev] The callback is bound to a sentinel `this`. Property access on it throws
  ``You accessed `this.<k>` from a function passed to the `on` modifier, but the function
  itself was not bound to a valid `this` context. Consider updating to use a bound
  function`` (`on.ts:25,186-187`; test `on-test.ts:370-385`). With `passive`, [Dev] wraps
  `event.preventDefault` so that calling it throws.
- `once`: the browser removes the listener after the first dispatch. If the arguments
  later change, the procedure runs again: it removes the listener (a no-op) and re-adds it.
  Test: "changing from `once=false` to `once=true`" (adds 2, removes 1),
  `on-test.ts:179-210`.
- Destruction (deferred) removes the current listener (`on.ts:47-53`).
- *Implementation note:* `getInternalModifierManager(on).counters` returns cumulative
  `{adds, removes}` counts, which tests use. It is not user-facing API.

---

## 8 Internal component managers and capabilities

Internal component managers declare a record of thirteen boolean capabilities
(`packages/@glimmer/interfaces/lib/managers/internal/component.d.ts:30-109`). The runtime
reads the record once per definition (§1.7) and encodes it as a bitmask
(`packages/@glimmer/manager/lib/util/capabilities.ts:51-73`; bit values in
`component.d.ts:115-128`, e.g. `dynamicLayout = 1 << 0`, `hasSubOwner = 1 << 12`).

The bitmask is an implementation detail. This section specifies the **observable behavior**
each capability enables. The hook names (`create`, `getSelf`, …) are the internal manager
interface. A new implementation may choose different internal names, but it must provide
equivalent behavior for Ember's built-in component kinds.

### 8.1 The internal manager interface

Every internal component manager provides:

- `getCapabilities(definition)`;
- `getSelf(state) → reactive value for this`;
- `getDestroyable(state) → object | null`;
- `getDebugName(definition)`.

Source: `component.d.ts:148-156`.

A manager with `createInstance` also provides `create`, `didRenderLayout`,
`didUpdateLayout`, `didCreate`, and `didUpdate` (`component.d.ts:193-230`). The following
are enabled by capabilities: `prepareArgs`, `update`, `getDynamicLayout`, `getTagName`,
`didCreateElement`, `getOwner`. Debug tooling may also use `getDebugCustomRenderTree`.

Invocation sequence for an internal manager, with capability gates in brackets
(`packages/@glimmer/runtime/lib/compiled/opcodes/component.ts:304-938`,
`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/components.ts`):

```
resolve definition; merge curried args
[prepareArgs]    prepared := manager.prepareArgs(definitionState, args); if non-null, replace args
begin region
[dynamicScope]   push a child dynamic-scope frame
[createInstance] state := manager.create(owner, definitionState,
                             [createArgs] args | null, env,
                             [dynamicScope] dynamicScope | null,
                             [createCaller] callerSelf | null,
                             hasDefaultBlock)
                 [updateHook] schedule manager.update(state, dynamicScope) for future updates
[dynamicLayout]  (if definition has no static template) layout := manager.getDynamicLayout(state, resolver)
                 ?? default template
d := manager.getDestroyable(state); if d, associate d with enclosing block
self := manager.getSelf(state)
[hasSubOwner]    layout owner := manager.getOwner(state)   else invoking/curried owner (§2.2)
render layout:
  [wrapped]      tag := manager.getTagName(state); if tag !== null:
                   open <tag>; manager.didCreateElement(state, element, operations);
                   apply invocation-site attributes (...attributes of the caller);
                   flush element
                 layout body
                 [wrapped] close </tag>
[createInstance] manager.didRenderLayout(state, bounds); record for didCreate in commit
[dynamicScope]   pop dynamic-scope frame
end region
```

On update, when the region is re-validated, for `[createInstance]` managers:

- `[updateHook] update(state, dynamicScope)` runs first;
- then the contents update;
- then `didUpdateLayout(state, bounds)` runs and the component is recorded for `didUpdate`
  in the commit phase (`component.ts:940-968`).

### 8.2 Capability reference

| Capability | Observable behavior when `true` | When `false` |
|---|---|---|
| `createInstance` | The manager's `create` hook runs and produces instance state. `didRenderLayout` / `didUpdateLayout` run after the layout renders / updates, and `didCreate` / `didUpdate` run in the commit phase (§11). | No instance. No lifecycle hooks at all. This is the template-only case (§5). |
| `createArgs` | `create` receives the invocation's arguments object (internal form). **Every** argument passed at the invocation site is captured, even ones the layout doesn't reference. | `create` receives `null`. With static invocation, only arguments the layout references are evaluated (§5; current behavior, not part of the contract, §00-0.1). |
| `prepareArgs` | Before the instance is created, `prepareArgs(definitionState, args)` may return `{ positional, named }` to **replace** the arguments. Blocks are preserved. It also forces the invocation to be compiled the dynamic way. Classic components use this for `positionalParams` (§8.5). | Arguments are used as passed. |
| `createCaller` | `create` receives the *caller's* `this` as a reactive value. Classic components store it as `_target` for action bubbling. | `null`. |
| `dynamicScope` | A child frame of the *dynamic scope* is pushed for the component's duration. The frame is passed to `create` and `update`. Writes to it (for example Ember's `view` / `outletState` entries) are visible to descendants only. | No frame is pushed. The component and its descendants share the caller's dynamic scope. |
| `updateHook` | `update(state, dynamicScope)` runs at the start of each re-validation of the component's region (§4.4). | No update hook. |
| `dynamicLayout` | If the definition has no statically associated template, `getDynamicLayout(state, resolver)` is called **after `create`** and chooses the layout per instance. A `null` result falls back to the default template. There is no fallback template at definition time (`constants.ts:202-208`, `component.ts:759-791`). | The template associated with the definition, or the default `{{yield}}` template. |
| `wrapped` | The layout is compiled in "wrapped" form. At render, `getTagName(state)` is called **once**. A non-null result makes the runtime create that element *around* the layout. `didCreateElement(state, element, operations)` is called after the element is opened and before invocation-site attributes are applied and the element is flushed. The manager may add attributes and classes through `operations` (§8.3). A `null` tag name renders the layout with no wrapper ("tagless"). The layout's own `...attributes` targets still receive invocation attributes (`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/components.ts`, `WrappedComponent`; `packages/@glimmer/opcode-compiler/lib/wrapped-component.ts`). | The layout renders as-is ("outer HTML" semantics). |
| `dynamicTag` | Declares that `getTagName` may be used. **Not consulted** by the runtime; `wrapped` alone governs the behavior. The tag name is read once and is not reactive. | — |
| `elementHook` | Declares `didCreateElement`. **Not consulted**; the hook is called whenever `wrapped` is on and a tag is rendered. | — |
| `attributeHook` | Declares `didSplatAttributes`. **Never called** by the current runtime. | — |
| `willDestroy` | Declares that the manager's destroyable registers *eager* destructors, which run synchronously at the moment of teardown, **before** the DOM is removed (§10.2). The flag itself only gates a dev-mode check, and that check is buggy (Q8). The observable behavior comes from the eager destructors themselves. | — |
| `hasSubOwner` | `getOwner(state)` supplies the owner for the layout's scope (§2.2). Used by `{{mount}}` and outlets for engines. | The layout's owner is the curried owner if curried, else the invoking owner. |

### 8.3 Element operations (`wrapped` components)

The `operations` object passed to `didCreateElement` records attributes for the wrapper
element (`packages/@glimmer/runtime/lib/compiled/opcodes/component.ts:525-651`):

- `setAttribute(name, reactiveValue, trusting, namespace)` and
  `setStaticAttribute(name, string, namespace)`. For a given name, a **later** set replaces
  an earlier one, **except `class`**. Every `class` value is kept and they are joined with
  spaces in order.
- `didCreateElement` runs before the invocation-site attributes are applied. So caller
  attributes override manager-set attributes of the same name (for example `id`), and
  caller classes are appended after the manager's classes.
- When the element is flushed, the attributes are written in insertion order, with `type`
  written **last** (`component.ts:592-616`). Dynamic values update reactively.
- Element modifiers from the invocation site attach to this element.

### 8.4 Built-in internal managers (summary)

The component-level contract of each Ember internal manager follows. Chapter 08 specifies
the user-facing semantics.

| Manager | Source | Capabilities set to true |
|---|---|---|
| Public adapter (`CustomComponentManager`) | `packages/@glimmer/manager/lib/public/component.ts:28-42` | createArgs, dynamicScope, updateHook, createInstance. Note `updateHook` is always true internally; the public `updateHook` capability only decides whether `updateComponent` is forwarded. |
| Template-only | `packages/@glimmer/runtime/lib/component/template-only.ts:6-20` | none |
| Classic curly (`@ember/component`) | `packages/@ember/-internals/glimmer/lib/component-managers/curly.ts:550-564` | dynamicLayout, dynamicTag, prepareArgs, createArgs, attributeHook, elementHook, createCaller, dynamicScope, updateHook, createInstance, wrapped, willDestroy |
| Root (top-level classic view) | `.../component-managers/root.ts:83-97` | dynamicLayout, dynamicTag, attributeHook, elementHook, createCaller, dynamicScope, updateHook, createInstance, wrapped |
| Mount (`{{mount}}`) | `.../component-managers/mount.ts:38-52` | dynamicLayout, createArgs, createCaller, dynamicScope, updateHook, createInstance, hasSubOwner |
| Route template | `.../component-managers/route-template.ts:22-36` | createArgs, createInstance |
| Classic outlet | `packages/@ember/-internals/routing/route-managers/classic/outlet-component.ts:70-94` | createArgs, dynamicScope, createInstance, hasSubOwner |
| Internal (`<Input>`, `<Textarea>`) | `packages/@ember/-internals/glimmer/lib/components/internal.ts:159-173` | createArgs, createCaller, createInstance |

### 8.5 Classic curly manager (manager-level contract) [Legacy]

This is the manager-level behavior only. Classic component features (`attributeBindings`,
`classNameBindings`, `tagName`, the view hierarchy, events) are specified in
`08-ember-integration.md`.

- **Definition state** is the resolved *factory* (`owner.factoryFor('component:x')`), not
  the class (§8.6).
- **`prepareArgs`** (`curly.ts:189-253`) returns `null`, meaning no change, unless:
  - a reserved `__ARGS__` named argument is present. Its value (captured args) is splatted:
    positional from it, named = rest ∪ its named;
  - or the class has `positionalParams` and positional arguments were passed.
    - A **string** `positionalParams: 'name'` binds a named arg `name` whose value is an
      array of all positional values, evaluated reactively. [Dev] It asserts that no named
      argument `name` also exists.
    - An **array** binds `positionalParams[i]` to positional `i`, for `i <
      min(len(params), len(positional))`. [Dev] It asserts no conflict with an explicit
      named argument.
    - The resulting positional list is empty.
- **`create`** (`curly.ts:262-368`):
  - Captures named arguments and evaluates them all. The values become initial properties,
    and the argument dependencies are tracked separately.
  - Aliases `id` to `elementId`.
  - Sets `parentView` from the dynamic scope, `_target` from the caller's `this`, and the
    owner.
  - Instantiates the class *untracked* and becomes the dynamic scope's `view`.
  - Fires `didReceiveAttrs`.
  - For tagless components (`tagName === ''`), fires `willRender` / `willInsertElement`
    here (interactive only). For tagged components, fires `willRender`.
  - Consumes the argument dependencies and the component's private "dirty" storage into
    the region. So any argument change, or a `rerender()`, re-validates the region.
- **`getDynamicLayout`** uses the instance's `layout` or `layoutName`. Otherwise it returns
  `null`, meaning the definition's template or the default.
- **`getTagName`** returns `null` when tagless, otherwise `tagName || 'div'`.
- **`didCreateElement`** installs `id`, the `class` list (including `ember-view`), bindings,
  and `role`, then fires `willInsertElement` untracked.
- **`update`** (`curly.ts:442-472`): if the argument dependencies changed, it re-reads the
  arguments, calls `setProperties`, and fires `didUpdateAttrs` and `didReceiveAttrs`. Then,
  if interactive, it fires `willUpdate` and `willRender`. It runs whenever the region
  re-validates (§4.4), so `willUpdate` / `willRender` fire even when only descendant or
  block content changed.
- **`didCreate`** (commit, interactive): `inDOM`, then `didInsertElement`, then `didRender`.
  **`didUpdate`** (commit, interactive): `didUpdate`, then `didRender`.
- **Destroyable** is the state bucket
  (`packages/@ember/-internals/glimmer/lib/utils/curly-component-state-bucket.ts:47-48`):
  - an **eager** destructor fires `willDestroyElement` and `willClearRender` while the
    element is still in the DOM, then unlinks the element;
  - a deferred destructor calls `component.destroy()`.

### 8.6 Loose-mode resolution results [Loose mode]

When a name is resolved through the owner
(`packages/@ember/-internals/glimmer/lib/resolver.ts:137-283`), the definition handed to the
manager is:

- **Components:** `factoryFor('component:name')` and the template from
  `getComponentTemplate(factory.class)`.
  - No class, but a template → a fresh template-only definition.
  - A class whose manager is the curly manager → the definition state is the **factory**.
  - Any other manager → the definition state is **`factory.class`**. Custom component
    managers therefore receive the registered class in `createComponent`.
  - Resolved definitions are cached per factory, or per template for template-only.
- **Helpers:** built-in names map to built-in helpers (`array`, `concat`, `fn`, `get`,
  `hash`, `unique-id`, …).
  - [Dev] Registering a helper whose name shadows a built-in is an error: `You attempted to
    overwrite the built-in helper "<name>" which is not allowed. Please rename the helper.`
  - For a classic `Helper` subclass, the **factory** (with the classic helper manager
    associated onto it) is returned, so that `createHelper` calls `factory.create()`, which
    includes injections.
  - Otherwise `factory.class` is returned.
- **Modifiers:** `on` is built in. Otherwise `factoryFor('modifier:name').class`.

---

## 9 `@glimmer/component`

Sources: `packages/@glimmer/component/src/index.ts:418-434` and
`packages/@glimmer/component/src/-private/{component,base-component-manager,ember-component-manager}.ts`.
RFCs 0416 and 0748.

### 9.1 Manager

`Component` (the default export) is associated with a manager built from `capabilities('3.13',
{ destructor: true, asyncLifecycleCallbacks: false, updateHook: false })`
(`ember-component-manager.ts:9-13`). Hooks:

- `createComponent(Class, args)` returns `new Class(owner, args.named)`, where `owner` is
  the factory's owner (`base-component-manager.ts:20-29`). **Positional arguments are not
  exposed.**
- `getContext(instance)` returns the instance.
- There is no `updateComponent`. Arguments are live proxies, so there is nothing to push.
- `destroyComponent(instance)` (`ember-component-manager.ts:33-42`): if
  `instance.isDestroying`, it returns. Otherwise it sets the instance's destroying flag and
  schedules two things in the run loop:
  - `instance.willDestroy()` in the `actions` queue;
  - in the `destroy` queue, a finalizer that returns early if the instance is already
    destroyed. Otherwise it calls `destroy(instance)` (the destroyables `destroy`, which
    runs destructors registered on the instance, §10) and sets the destroyed flag.

### 9.2 Class

- `constructor(owner, args)`:
  - Stores `this.args = args`, the named-args proxy (§3.2).
  - Calls `setOwner(this, owner)`.
  - [Dev] If `owner` is not a non-null object, or `args` is not an arguments object the
    manager created, it throws ``You must pass both the owner and args to super() in your
    component: <ClassName>. You can pass them directly, or use ...arguments to pass all
    arguments through.`` (`component.ts:231-239`, `index.ts:419-429`). So a Glimmer
    component cannot be constructed directly with a hand-made args object in dev.
- `args` is read-only. Assigning to `this.args.x` throws in dev (§3.2). Reading
  `this.args.x` from getters, the constructor, or `willDestroy` returns the current
  argument value and consumes it.
- `isDestroying` / `isDestroyed` are getters over the instance's own flags. They are
  **not** `@ember/destroyable`'s `isDestroying(instance)`, though the two agree after
  destruction completes. Timeline:
  - At construction both are `false`.
  - Once teardown starts, `isDestroying` is `true`.
  - `willDestroy()` sees `isDestroying === true` and `isDestroyed === false`.
  - After the `destroy`-queue finalizer, both are `true`.

  Test: `packages/@ember/-internals/glimmer/tests/integration/components/glimmer-component-test.gjs:17-54`.
- `willDestroy()` is a no-op for subclasses to override.
- The instance is constructed once per invocation. Argument changes update it in place;
  re-mounting constructs a new instance. Tests `glimmer-component-test.gjs:56-135`.

---

## 10 Destroyables

### 10.1 Public API (`@ember/destroyable`, RFC 0580)

Any non-null object or function can be a *destroyable*. The runtime keeps per-destroyable
metadata: a state (`live` → `destroying` → `destroyed`), parents, children, eager
destructors, and deferred destructors (`packages/@glimmer/destroyable/index.ts`). The API:

- `associateDestroyableChild(parent, child) → child`. Adds a parent→child edge. A child MAY
  have several parents. [Dev] If `parent` is already destroying, it throws `Attempted to
  associate a destroyable child with an object that is already destroying or destroyed`
  (`index.ts:138-152`).
- `registerDestructor(obj, fn) → fn`. Adds a deferred destructor, which will be called as
  `fn(obj)`. [Dev] If `obj` is already destroying, it throws `Attempted to register a
  destructor with an object that is already destroying or destroyed`. Internally there is
  also an `eager` flag, which is not exposed by `@ember/destroyable`
  (`packages/@ember/destroyable/index.ts:222-227`; `index.ts:154-174`).
- `unregisterDestructor(obj, fn)`. [Dev] It throws if `obj` is destroying (`Attempted to
  unregister a destructor ...`), or if `fn` was not registered (`attempted to remove a
  destructor that was not registered with the destroyable`).
- `destroy(obj)`, `isDestroying(obj)`, `isDestroyed(obj)`.
- `enableDestroyableTracking()` / `assertDestroyablesDestroyed()` **[Dev]** (test support). The
  latter throws `Some destroyables were not destroyed during this test:\n    <list>`
  (`index.ts:282-331`).

### 10.2 `destroy(obj)` algorithm

Source: `packages/@glimmer/destroyable/index.ts:210-227`.

```
destroy(d):
  if state(d) ≠ live: return
  state(d) := destroying
  for each child c of d, in association order: destroy(c)
  for each eager destructor e of d, in registration order: e(d)          // synchronous
  for each deferred destructor f of d, in registration order: scheduleDestroy(d, f)
  scheduleDestroyed(() => { remove d from each parent's children; state(d) := destroyed })
```

Consequences:

- The **whole subtree** becomes `destroying` synchronously, before any destructor runs.
- Eager destructors run synchronously in post-order (children before parents).
- Deferred destructors are scheduled in post-order, so they also run child-first.
- `isDestroyed` becomes true later, once the "destroyed" phase runs, and in the same
  post-order.

In Ember (`packages/@ember/-internals/glimmer/lib/environment.ts:35-41`):

- `scheduleDestroy(d, f)` = `schedule('actions', null, f, d)`;
- `scheduleDestroyed(fin)` = `schedule('destroy', null, fin)`.

So deferred destructors run in the next `actions` queue flush and "destroyed" marking runs
in the `destroy` queue. When teardown happens during rendering (the `render` queue), both
therefore run after the DOM mutations of that render.

A new implementation MUST preserve all three orderings:

- eager destructors synchronous;
- deferred destructors after the render's DOM changes;
- `isDestroyed` after all deferred destructors of that batch.

Tests: `packages/@glimmer/destroyable/test/destroyables-test.ts:126-143` (eager destructors run
inside `destroy()`, the others only when flushed), `158-192` (whole subtree is `destroying`
immediately, nothing `destroyed` and no deferred destructor has run; children first),
`336-366` (inside a destructor everything is `destroying` and nothing is `destroyed`). The
Ember queue mapping (`actions`/`destroy`) and the "after the render's DOM changes" guarantee
were observed by experiment (verified by experiment, T9b: deferred destructor in `actions`,
after DOM removal, `isDestroyed` false there and true after the `destroy` queue); the
`@glimmer/destroyable` tests use their own two-queue flush, and no upstream test pins the Ember
mapping. Eager-before-DOM-removal is pinned for classic
components (`packages/@ember/-internals/glimmer/tests/integration/components/life-cycle-test.js:1429-1587`).

### 10.3 How template-created objects join the tree

The rendering process keeps a stack of *destroyable owners*: the render result at the root,
then each block (conditional branch, each-item, component region, …) as it is entered
(`packages/@glimmer/runtime/lib/vm/append.ts:495-511,684-687`). Each of these is associated
as a child of the **innermost enclosing block**, at the time it is created:

| Object | Associated at | Source |
|---|---|---|
| Every nested block | Block entry | `append.ts:510` |
| Component destroyable (`manager.getDestroyable(state)`, if non-null) | After `create`, before `getSelf` | `component.ts:448-468` |
| Helper instance (static), if it has destroyable children, which is always the case with `hasDestroyable` | Helper evaluation | `expressions.ts:181-183` |
| Dynamic-helper slot, and through it the current helper instance | Helper evaluation / re-creation | `expressions.ts:126-133,145` |
| Modifier state (`getDestroyable`) | Element close. (Before emberjs/ember.js#21639, with the debug render tree enabled, the Ember DEBUG default, it was also associated at modifier creation, and that position won; §05-11.1) | `dom.ts:138-150`; `component.ts:581` |
| Dynamic-modifier slot, and through it each installed instance | Modifier evaluation / replacement | `dom.ts:296-305,356-361` |

A component's own content (its layout's blocks, modifiers, nested components) is associated
with the same enclosing block as the component's destroyable, as **later siblings**. It is
not associated as children of the component's destroyable. The resulting destruction order
(components parent-first, modifiers child-first in every build; development builds differed
until #21639, §05-11.3) is specified in §05-11.1 and §05-11.3.

When a block is torn down:

- conditional branch switch;
- each-item removal (`packages/@glimmer/runtime/lib/vm/update.ts:419-425`);
- re-render after an error (`update.ts:157-178`);
- whole render result destroyed.

`destroy(block)` is called and the block's DOM is cleared **after** `destroy()` returns. So
eager destructors, such as classic `willDestroyElement`, run while the DOM is still
attached (tested, `life-cycle-test.js:1429-1587`), and deferred ones run after it is detached
(verified by experiment, T9b; §05-11.2).

---

## 11 The render transaction and commit phase

Each render or re-render runs inside a transaction
(`packages/@glimmer/runtime/lib/environment.ts:28-93,140-201`). During the render or update
walk the runtime records:

- **created components**: `createInstance` managers, recorded when their layout *finishes*
  rendering: post-order, so children before parents and siblings in document order
  (`component.ts:902-934`);
- **updated components**: `createInstance` managers whose region was re-validated, recorded
  when their update finishes: post-order (`component.ts:940-968`);
- **scheduled installs**: modifiers, recorded when their element is *closed*, that is after
  the element's children have rendered. The order is post-order by element: an element's
  modifiers come after those of all its descendants, and several modifiers on one element
  keep their creation order (`dom.ts:137-150`; test `modifiers-test.ts:304-458`);
- **scheduled updates**: modifiers whose dependencies were invalidated, recorded when the
  update walk reaches the modifier's position. That position is at the element's *opening*,
  before its children (the update check is registered when the modifier is created,
  `dom.ts:186-191`), so the order is document **pre-order**: a parent element's modifiers
  before its descendants'.

At commit, the runtime runs these in order:

1. `didCreate` for every created component, in record order. For public managers this is
   `didCreateComponent`; for classic components, `didInsertElement` and `didRender`.
2. `didUpdate` for every updated component, in record order.
3. `installModifier` for every scheduled install, in record order.
4. `updateModifier` for every scheduled update, in record order.
5. (Ember) debug-render-tree commit and the environment's commit callback.

So a component's `didCreateComponent` / `didInsertElement` run **before** any modifier on
its own elements is installed. Children's creation hooks run before their parents'.
Installs run child-first and updates run parent-first. This section is the owner of the
commit-phase order. §05-1.4 and §07-1.10 refer to it.

Test status: the child-first order of creation and update hooks is pinned for classic
components (`life-cycle-test.js:305-537`: `didInsertElement`/`didRender` bottom → top, `didUpdate`
bottom → top), and the child-first order of modifier installs by
`packages/@glimmer-workspace/integration-tests/test/modifiers-test.ts:304-458`. The hook
order across a tree of public-manager components was observed by experiment (T9b; the hook list in §05-7.4 is
verified by experiment, T9b). Steps 1 and 3 relative to each other were observed by experiment
(verified by experiment, T9b): with `p` containing `<div {{m "p"}}>` and two children `c1`, `c2`
each with `<i {{m}}>`, the commit was `c1.didCreateComponent, c2.didCreateComponent,
p.didCreateComponent, m(c1).install, m(c2).install, m(p).install`; a second tree with
modifiers on nested plain elements between and inside the components gave all
`didCreateComponent` calls before any `installModifier`. Steps 2 and 4 and the
parent-first order of modifier updates were also observed (verified by experiment, T9b): after
an argument change reaching the same tree, the commit was `c1.didUpdateComponent,
c2.didUpdateComponent, p.didUpdateComponent, m(p).update, m(c1).update, m(c2).update`, and for
`<div {{m a}}><div {{m b}}></div><div {{m c}}></div></div>` followed by a sibling `<p {{m d}}>`
the updates ran `a, b, c, d` (document pre-order). No upstream test pins these orders.

*Note:* a transaction cannot be nested. Beginning one while another is open is a dev
assertion: `A glimmer transaction was begun, but one already exists...`
(`environment.ts:141-146`).

---

## 12 Open questions / inconsistencies

- **Q1: Unchecked capability versions in production.** `componentCapabilities` and
  `modifierCapabilities` validate the version only in dev builds.
  - In production `'3.4'` components silently lose the always-on update hook that 3.4 had.
  - In production `'3.13'` modifiers behave like `'3.22'`.

  Should a new implementation throw in production too?
- **Q2: `disableAutoTracking` is effectively "never update".** With it set, install and
  update run untracked, so the modifier's dependency set is empty and `updateModifier` can
  never be called, not even when arguments change. No RFC describes this capability, and no
  test covers `true`. Is "never update" the intent, or should argument consumption still be
  tracked?
- **Q3: Owner for curried components.** `create` (and so the public manager factory)
  receives the *invoking* scope's owner, while the layout renders with the *curried* owner.
  For a component curried inside an engine and invoked in the host, the manager delegate and
  `@glimmer/component`'s `owner` constructor argument would be the host owner. Helpers and
  modifiers use the curried owner. A third owner is involved too: the definition record for
  the curried inner definition is created with the curried owner
  (`constants.component(definition, owner)`, `component.ts:337`), so its template factory is
  bound to the curried owner if that is the definition's first use, and to whichever owner
  used it first otherwise (§1.7, Q15). This looks inconsistent and is untested. §05-7.8 and
  §08-8.6 describe the same behavior.
- **Q4: `undefined` owner.** Public component and modifier managers cache delegates in a
  `WeakMap` keyed by owner, so an `undefined` owner throws a raw `TypeError`. Helper managers
  special-case `undefined`. Should component and modifier managers do the same?
- **Q7: Args proxy mutation in production.** Only dev builds install the `set` trap and the
  positional `ownKeys` trap. In production, `args.named.x = 1` writes to the hidden target,
  and the write is invisible to later reads. `Object.keys(args.positional)` returns `[]`.
  The named proxy's `isExtensible` trap returns `false` while its target is extensible,
  which violates Proxy invariants, so `Object.isExtensible(args.named)` throws a
  `TypeError`. The same applies to `Object.isFrozen` / `Object.isSealed`.
- **Q8: `willDestroy` capability check is buggy.** The dev check
  `(typeof 'willDestroy') in d` evaluates `'string' in d`, so it never detects a
  `willDestroy` member (`packages/@glimmer/runtime/lib/compiled/opcodes/component.ts:456-465`).
  The flag gates nothing else, so eager destructors work regardless of it.
- **Q9: `on` modifier dev/prod divergence.** In dev, validation reads all named arguments,
  so changing an extraneous named argument (which is itself a dev error) or any named
  argument triggers an update. In prod, only `once`, `passive`, and `capture` are read. In
  dev the callback is rebound to a sentinel `this`; in prod `this` is the element.
- **Q11: Curried dynamic helper argument accumulation.** When a dynamic helper's definition
  is a curried helper and the selecting computation re-runs, the code prepends the curried
  positional arguments to `args.positional`, which already contains them from the previous
  run (`expressions.ts:115-122`). This looks like it duplicates curried positional
  arguments on each re-creation. The dynamic *modifier* code avoids this by keeping the
  original outer arguments.
- **Q13: `hasScheduledEffect` / `runEffect`.** These are documented in `@ember/helper`, but
  they throw in dev and produce `undefined` in prod. `invokeHelper` throws for them in every
  build. The `@ember/helper` docs also mention a nonexistent `hasDestructor` option and a
  `'3.21.0'` version string (`packages/@ember/helper/index.ts:44-47,140`).
- **Q14: Content-position precedence.** Recorded as §05-14 item 6, which owns it.
- **Q15: The component-definition cache ignores the owner.** Because definition records are
  cached per definition object, not per (definition, owner) (§1.7 item 2), a component's
  template factory effectively runs only with the first owner that renders it in a given
  renderer. A loose-mode component template that is associated through
  `setComponentTemplate` and rendered both in the host and in an engine resolves its free
  names against whichever owner rendered it first. The factory's own per-owner cache
  (§01-1.8.1) is therefore only partly effective. Untested. Is this intended? §01-1.11
  item 10 and §04-4.14 item 3 describe the same behavior.
