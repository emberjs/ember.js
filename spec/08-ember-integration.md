# 08 — Ember integration: built-ins, resolution, classic components, and rendering entry points

This chapter specifies the layer that Ember (the `ember-source` package, version 7.5 alpha at the
time of writing) adds on top of the generic template runtime described in chapters 04–07. It
covers:

- the set of built-in helpers, modifiers and components that Ember provides, how each one is made
  available (strict-mode keyword, auto-import, explicit import, or loose-mode resolution), and
  the exact semantics of each (§2–§4, §7);
- loose-mode ("resolution mode") name resolution through the owner / registry (§5);
- classic components (`@ember/component`) as observed from templates (§6);
- the built-in `Input`, `Textarea` and `LinkTo` components (§7);
- routing integration: `{{outlet}}`, route templates, `{{mount}}` and engines (§8);
- rendering entry points: the application renderer, `renderComponent`, classic `appendTo`,
  `renderSettled`, the render loop and its scheduling (§9);
- the Ember implementation of the global-context hooks the runtime depends on (truthiness,
  iteration, property access, scheduling, assertions, deprecations) (§10);
- trusted HTML (`trustHTML` / `htmlSafe`) (§11);
- the classic event dispatcher (§12);
- the debug render tree consumed by Ember Inspector (§13).

Throughout, "the runtime" means a conforming implementation of chapters 04–07. Component,
helper and modifier *managers* are specified in chapter 06; this chapter describes the managers
Ember ships only to the extent their observable behaviour matters, and never assumes a value
is a subclass of a particular base class. Reactivity is phrased in terms of the abstract model of
chapter 07: *tracked storage*, *reactive computations*, *consumption*, and *invalidation*.
Where Ember consumes "the storage for property `k` of object `o`" this means the tracked storage
cell that Ember's `set`/`notifyPropertyChange` (and `@tracked`) dirty for that `(o, k)` pair
(§07-3.6.2); the special key `[]` denotes an array's "collection contents" cell (§07-3.6.6),
which Ember array mutation methods (`pushObject`, `A()` KVO) and
`notifyPropertyChange(arr, '[]')` dirty. Tracked arrays (`trackedArray`, §07-3.5.1) do not use
the `[]` cell; they invalidate their own collection cell, which iteration consumes.

Conventions follow `CONVENTIONS.md`: **[Legacy]**, **[Loose mode]**, **[Dev]** markers are used;
source citations are repo-relative.

---

## 1. Layering and where things live

| Concern | Source |
|---|---|
| Resolver used by all Ember renderers (built-in helper/modifier tables, component/helper/modifier lookup) | `packages/@ember/-internals/glimmer/lib/resolver.ts` |
| Resolver extension that adds router keywords (`-mount`) | `packages/@ember/-internals/glimmer/lib/router-resolver.ts` |
| Environment delegate and global-context hooks | `packages/@ember/-internals/glimmer/lib/environment.ts` |
| Base renderer, render loop, `renderComponent`, `renderSettled` | `packages/@ember/-internals/glimmer/lib/base-renderer.ts` |
| Application renderer (`renderer:-dom`), classic roots, `DynamicScope` | `packages/@ember/-internals/glimmer/lib/renderer.ts` |
| Registry setup (`component:input`, …) | `packages/@ember/-internals/glimmer/lib/setup-registry.ts` |
| Classic component class | `packages/@ember/-internals/glimmer/lib/component.ts` |
| Classic ("curly") component manager | `packages/@ember/-internals/glimmer/lib/component-managers/curly.ts` |
| Built-in components | `packages/@ember/-internals/glimmer/lib/components/*.ts`, templates in `lib/templates/*.ts` |
| Ember-only helpers | `packages/@ember/-internals/glimmer/lib/helpers/*.ts`, `lib/syntax/mount.ts` |
| Generic helpers re-exported by Ember (`array`, `hash`, `fn`, …) and `on` | `packages/@glimmer/runtime/lib/helpers/*.ts`, `packages/@glimmer/runtime/lib/modifiers/on.ts` |
| Outlet / route-template machinery | `packages/@ember/-internals/routing/route-managers/*.ts`, `lib/component-managers/route-template.ts` |
| Compile-time Ember AST plugins, keyword tables, allowed globals | `packages/@ember/template-compiler/lib/plugins/*.ts`, `lib/compile-options.ts` |
| Public entry modules | `packages/@ember/helper/index.ts`, `@ember/modifier`, `@ember/component`, `@ember/template`, `@ember/renderer`, `@ember/routing/index.ts` |

*Note:* `packages/ember-template-compiler/lib/plugins/*.ts` are thin re-exports of the
`@ember/template-compiler` plugins (e.g. `packages/ember-template-compiler/lib/plugins/assert-against-attrs.ts:1-4`);
they are not a second implementation.

### 1.1 The resolver contract

Every Ember renderer is constructed with a *classic resolver* object (§06 defines the abstract
interface). Ember's resolver implements five lookups
(`packages/@ember/-internals/glimmer/lib/resolver.ts:130-284`):

| Method | Used for | Behaviour summary |
|---|---|---|
| `lookupBuiltInHelper(name)` | names the compiler emitted as *strict keywords* (wire opcode `GetStrictKeyword`, §04) | returns an entry of `BUILTIN_KEYWORD_HELPERS` (§1.3) or `null`; router resolver also returns `-mount` |
| `lookupHelper(name, owner)` | loose-mode helper heads | built-in table first, then `owner.factoryFor('helper:'+name)` (§5.3) |
| `lookupBuiltInModifier(name)` | strict-keyword modifiers | always `null` in Ember 7 (the table is empty, `resolver.ts:119-121`) |
| `lookupModifier(name, owner)` | loose-mode modifier heads | `on`, then `owner.factoryFor('modifier:'+name).class` (§5.4) |
| `lookupComponent(name, owner)` | loose-mode component heads and string component names | `owner.factoryFor('component:'+name)` + associated template (§5.2) |

`lookupPartial` exists and always returns `null` (`resolver.ts:133-135`); partials are not
supported.

Two resolvers exist:

- `ResolverImpl` — used by `renderComponent` (`base-renderer.ts:604-616`).
- `RouterResolver extends ResolverImpl` — used by the application `Renderer`
  (`renderer.ts:200-212`). It adds the `-mount` keyword helper to *both*
  `lookupBuiltInHelper` and `lookupHelper` (`router-resolver.ts:6-28`).

A conforming implementation MUST make `{{mount}}` fail in a `renderComponent` tree with the
**[Dev]** assertion
`` The `{{mount}}` keyword requires the router, which is not available here. It is only supported in templates rendered by an Ember application (e.g. not via `renderComponent`). ``
(`resolver.ts:188-196`; the message slices the leading `-` off `-mount`).

### 1.2 Built-in helper and modifier tables

```text
BUILTIN_KEYWORD_HELPERS  (resolver.ts:88-98)
  mut, readonly, unbound,
  -hash          → the `hash` helper
  -each-in       → §2.13
  -normalize-class → §2.16
  -resolve       → §2.18
  -track-array   → §2.14
  -in-el-null    → §2.17

BUILTIN_HELPERS = BUILTIN_KEYWORD_HELPERS ∪   (resolver.ts:100-117)
  array, concat, fn, get, hash,
  unique-id      → §2.10
  -disallow-dynamic-resolution → §2.19

ROUTER_KEYWORD_HELPERS  (router-resolver.ts:6-8)
  -mount         → §8.5

BUILTIN_KEYWORD_MODIFIERS = {}           (resolver.ts:119-121)
BUILTIN_MODIFIERS = { on }               (resolver.ts:123-126)
```

Consequences:

- In loose mode, the names `array`, `concat`, `fn`, `get`, `hash`, `unique-id`, `mut`,
  `readonly`, `unbound` and the dash-prefixed internal names resolve to built-ins *without*
  consulting the registry.
- **[Dev]** Registering a helper under one of the `BUILTIN_HELPERS` names and then resolving it
  fails with `You attempted to overwrite the built-in helper "${name}" which is not allowed. Please rename the helper.`
  (`resolver.ts:137-141`). Note the assertion fires on lookup, not on registration.
- The strict-mode auto-imported built-ins `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `and`, `or`,
  `not`, `element` (§1.3(a)) are **not** in these tables; in loose mode those names resolve
  through the registry like any user helper (and are therefore unavailable unless an app
  registers them). This is intentional: they are recent additions designed for strict mode
  only, and loose mode is maintained but gains no new features. A new implementation MUST NOT
  add them to the loose-mode table.

### 1.3 Strict-mode keywords and auto-imported built-ins

Strict-mode templates (§01, §03) have three Ember-specific mechanisms that make built-ins
available without an explicit import:

**(a) Auto-imported built-ins.** The AST plugin `auto-import-builtins`
(`packages/@ember/template-compiler/lib/plugins/auto-import-builtins.ts:10-69`) runs first in
strict mode (`plugins/index.ts:41-50`). §03-7.1 specifies the rewrite normatively; this
section records its runtime meaning. They are not keywords (§03-4.7). For every
`PathExpression` whose `original` is one of

```text
array  eq  element  and  fn  hash  neq  gt  gte  lt  lte  not  on  or
```

and which is not a local binding (block param, element block param) and not in the template's
lexical scope (`hasLocal`, `plugins/utils.ts:28-65`), the plugin rewrites the reference to an
import binding:

- When compiled by `babel-plugin-ember-template-compilation` (`env.meta.jsutils` present), it
  inserts `import { <name> } from '<module>'` with name hint `__keyword__<name>` and rewrites
  the path to that local. `<module>` is `@ember/modifier` for `on` and `@ember/helper` for all
  others (`auto-import-builtins.ts:27-29,50,62-65`).
- When compiled at runtime by `template()` from `@ember/template-compiler`
  (`env.meta.emberRuntime` present), it rewrites the path to `__ember_keywords__.<name>`, a
  variable the runtime compiler injects (`compile-options.ts:37-54,77-86`). **[Dev]** an
  unknown name asserts `${name} is not a known keyword. Available keywords: …`.

Because the rewrite happens on `PathExpression.original`, a *local* named e.g. `on` or `fn`
shadows the built-in (test: `render-component-test.ts:314-331` "Can shadow keywords").

Observable requirement: in a strict-mode template, the free identifiers listed above MUST
behave exactly as if the corresponding export had been imported from `@ember/helper` /
`@ember/modifier`, unless shadowed by a local or lexical-scope binding. The resulting values
are the same objects as the module exports (identity is observable, e.g. passing `hash` as a
value).

`unique-id`/`uniqueId`, `concat`, `get`, and the built-in components are **not**
auto-imported; they must be imported (`import { concat, get, uniqueId } from '@ember/helper'`,
`import { Input, Textarea } from '@ember/component'`, `import { LinkTo } from '@ember/routing'`).

**(b) Strict-mode keywords passed to the compiler.** When `strictMode` is set, Ember passes
`keywords = STRICT_MODE_KEYWORDS` to the template compiler (`compile-options.ts:144-146`):

```text
mut, readonly, unbound, -each-in, -in-el-null, -track-array, -mount
```

(`plugins/index.ts:52-65`). These free names compile to strict-keyword references
(`GetStrictKeyword`, §04) and are resolved at runtime by `lookupBuiltInHelper`
(§1.1). `action` was removed from this list by emberjs/ember.js#21641 (§2.20).

**(c) Syntax keywords** handled by the generic compiler — `if`, `unless`, `each`, `let`,
`yield`, `has-block`, `has-block-params`, `component`, `helper`, `modifier`, `in-element`,
`debugger`, `log`, plus the Ember-routed `outlet`, `mount`, `each-in` (`packages/@glimmer/syntax/lib/keywords.ts`).
Their generic semantics are chapter 05; Ember's rewrites of `outlet`, `mount`, `each-in`
and `in-element` are §1.4.

**(d) Allowed globals** (RFC 1070, `rfcs/text/1070-default-globals-for-strict-mode.md`).
When a runtime-compiled template uses the `eval` form of `template()`, a free name that is in
`ALLOWED_GLOBALS` is considered in scope iff `name in globalThis`
(`compile-options.ts:92-101`). The list (`plugins/allowed-globals.ts:24-72`):

```text
globalThis Atomics JSON Math Reflect localStorage sessionStorage URL
isNaN isFinite parseInt parseFloat decodeURI decodeURIComponent encodeURI encodeURIComponent
postMessage structuredClone
Array BigInt Boolean Date Number Object String
Infinity NaN isSecureContext
```

The same list is applied by `babel-plugin-ember-template-compilation` for build-time
compilation (chapter 01). Such names evaluate to the global value (e.g. `{{JSON.stringify x}}`
calls `JSON.stringify` through the default helper manager). `Array` and `Object` behave as the
JS globals, *not* like `(array)`/`(hash)`.

### 1.4 Ember AST transforms (runtime-relevant summary)

Chapter 03 specifies the Ember AST plugins precisely. This section records the rewrites whose
*runtime* consequences this chapter depends on. Loose-mode order is
(`plugins/index.ts:28-39`):

1. `transform-quoted-bindings-into-just-bindings` — `style="{{x}}"` (a single mustache in quotes)
   becomes `style={{x}}` (`transform-quoted-bindings-into-just-bindings.ts:4-47`). This matters
   because the style-XSS warning (§10.6) is skipped for a `TrustedHTML` value, and a quoted
   concatenation would have turned that value into a plain string first (§05-4.5.3).
2. `assert-reserved-named-arguments` — **[Dev]** `@arguments`, `@args`, `@block`, `@else`, any
   `@` followed by a non-lowercase character, and `@__ARGS__` / `__ARGS__=` are compile errors
   `'${name}' is reserved.` (`assert-reserved-named-arguments.ts:19-48`).
3. *(removed)* `transform-action-syntax`, which inserted `this` as the first argument of
   `action`, was removed by emberjs/ember.js#21641 (§03-7.3, §2.20).
4. `assert-against-attrs` (loose only) — **[Dev]** `{{attrs.x}}` is a compile error
   `Using {{attrs}} to reference named arguments is not supported. {{attrs.x}} should be updated to {{@x}}. <loc>`;
   `{{this.attrs.x}}` emits deprecation `attrs-arg-access` and is **rewritten to `@x`**
   (`assert-against-attrs.ts:25-85`, test `curly-components-test.js:1315-1358,1554-1596`).
5. `transform-each-in-into-each` — `{{#each-in X as |k v|}}` → `{{#each (-each-in X) as |v k|}}`;
   with a single block param `|k|` the params become `['( unused value )', k]`
   (`transform-each-in-into-each.ts:27-73`). The `key=` hash pair is preserved.
6. `assert-input-helper-without-block` (loose only) — **[Dev]** `{{#input}}` is a compile error
   `The {{input}} helper cannot be used in block form. <loc>`.
7. `transform-in-element` — in non-production builds, wraps the first param of
   `{{#in-element X}}` as `(-in-el-null X)`; **[Dev]** `insertBefore=` with anything other than a
   `null`/`undefined` literal is a compile error
   `Can only pass null to insertBefore in in-element, received: <json>` (`transform-in-element.ts:25-59`).
8. `transform-each-track-array` — `{{#each X}}` → `{{#each (-track-array X)}}` unless `X` is
   already `(-each-in …)` or `each` is a local (`transform-each-track-array.ts:27-63`). The
   current output applies the wrapper twice, with no observable effect (§03-7.8).
9. `assert-against-named-outlets` — **[Dev]** `{{outlet "name"}}` is a compile error
   `Named outlets were removed in Ember 4.0. See https://deprecations.emberjs.com/v3.x#toc_route-render-template for guidance on alternative APIs for named outlet use cases. <loc>`.
10. `transform-wrap-mount-and-outlet` — `{{mount …}}` → `{{component (-mount …)}}`;
    `{{outlet}}` → `<@outlet />` (`transform-wrap-mount-and-outlet.ts:38-69`). Both are
    skipped if the name is a local.
11. `transform-resolutions` (loose only) — first param of `{{helper "x"}}`, `(helper "x")`,
    `{{modifier "x"}}`, `(modifier "x")` becomes `(-resolve "helper:x")` / `(-resolve "modifier:x")`;
    a non-literal first param becomes, in DEBUG builds only,
    `(-disallow-dynamic-resolution <p> type="helper" loc="<loc>" original="<printed p>")`
    (`transform-resolutions.ts:66-200`). **[Dev]** zero params is a compile error
    `The ${type} keyword requires at least one positional arguments <loc>`.

Strict mode runs `auto-import-builtins` first, then steps 1, 2, 5, 7, 8, 9, 10
(`plugins/index.ts:41-50`) — i.e. no `attrs` assertion, no `input` assertion, no
`transform-resolutions`.

Verified output (loose mode, dev build of `ember-template-compiler`):

```text
{{outlet}}                          => [[8,[30,1],null,null,null]]      symbols ["@outlet"]
{{#each-in x as |k v|}}{{/each-in}} => [[42,[28,[37,1],[[31,2]],null],null,[[],[1,2]],null]]
                                        symbols ["v","k"], upvars ["each","-each-in","x"]
<Foo::Bar />                        => [[8,[39,0],null,null,null]]      upvars ["foo/bar"]
```

AST transforms themselves are not part of the contract (§00-0.1 "Non-goals"). A new
implementation that does not reuse Ember's AST plugins MUST still produce the same
observable results: `{{outlet}}` MUST read the `@outlet` argument of the
enclosing template (lexically), `{{#each-in}}` MUST behave per §2.13, `{{#each}}` MUST consume the
collection-contents storage per §2.14, etc.

---

## 2. Built-in helpers

For every helper below the notation is:

- **Access**: how a template reaches it (strict: keyword / auto-import / import; loose: name).
- **Semantics**: what value the helper expression produces, as a reactive computation.

"Positional/named argument" means an argument computation in the sense of §07-2.4.4 and §06-3:
evaluating it is a reactive computation that consumes whatever its expression consumes. Some
arguments are **updatable**: a path argument (`this.x`, `@x`, `local.x`), and the results of
`get`, `mut`, and `hash` child paths, can also be *written*, which sets the underlying
property with Ember `set` semantics (§10.3, §07-4.2 "update targets"). Literals and helper
results are not updatable. A **constant** value is a computation that never changes (§07-0).
Unless stated otherwise, a helper result is a reactive computation that is re-evaluated when
any tracked storage consumed during its previous evaluation has changed, and whose last value
is reused otherwise (chapter 07 caching semantics).

### 2.1 `array`

- **Access**: strict auto-import (`@ember/helper` `array`); loose name `array`.
- **Source**: `packages/@glimmer/runtime/lib/helpers/array.ts:8-10`.
- **Semantics**: returns a new JS `Array` containing the current values of all positional
  arguments in order. Named arguments are ignored. Evaluating the result consumes every
  positional argument.
- Identity: a new array is produced on each re-evaluation, i.e. whenever *any* argument's
  consumed storage changed; otherwise the cached array (same identity) is returned
  (test: `tests/integration/helpers/array-test.js:272-300` "should return an entirely new array when any argument change").
- The array is a plain mutable array; no reactivity is attached to it.

### 2.2 `hash`

- **Access**: strict auto-import; loose names `hash` and `-hash`.
- **Source**: `packages/@glimmer/runtime/lib/helpers/hash.ts:8-28`.
- **Semantics**: returns a new object with a `null` prototype (`Object.create(null)`,
  `packages/@glimmer/runtime/lib/vm/arguments.ts:521-529`) whose own enumerable properties are the
  named arguments, each set to its current value. Positional arguments are ignored. The whole
  object is re-created whenever any named argument's consumed storage changes.
- **Per-key laziness (observable)**: a *template path* on the hash result — `(hash a=x b=y).a`,
  or `@h.a` / `h.a` where `@h` / `h` is bound directly to a `hash` result — MUST evaluate only
  the corresponding named argument (`x`) and MUST NOT evaluate the others (`y`). The current
  implementation achieves this by pre-populating the result's child-path table with the named
  argument computations (`hash.ts:17-25`), so property access on the hash result in a template
  resolves to the argument itself. Consequently:
  - the child path is reactive to `x` only;
  - the child path is *updatable* iff the argument is (e.g. `@h.a` where `a=this.foo` can be
    two-way bound by a classic component or `<Input @value={{@h.a}}>`).
  Access from JavaScript (`this.args.h.a`) evaluates the whole hash (all named arguments).
- Because the object has no prototype, `toString`/`hasOwnProperty` are not available on it
  (documented in `packages/@ember/helper/index.ts:350-382`).
- The object is an ordinary mutable object; writing to it from JS is not reactive and is
  lost on the next re-evaluation.
  *Note:* `environment.ts:107-120` still carries a `setting-on-hash` deprecation override
  (`until: '4.4.0'`) but nothing in the current runtime emits it.

### 2.3 `concat`

- **Access**: import `concat` from `@ember/helper` (strict); loose name `concat`.
- **Source**: `packages/@glimmer/runtime/lib/helpers/concat.ts:7-24`.
- **Semantics**: evaluates all positional arguments and joins them with `''`. Each value `v` is
  normalized as:

  ```text
  normalize(v) = ''          if v === null || v === undefined || typeof v.toString !== 'function'
               = String(v)   otherwise
  ```

  So `(concat 1 true undefined null "x")` is `"1truex"`; an object created with
  `Object.create(null)` contributes `''`; a `TrustedHTML` contributes its string (the result
  is a plain string, *not* trusted). Named arguments are ignored.

### 2.4 `fn`

- **Access**: strict auto-import; loose name `fn`. RFC `rfcs/text/0998-make-fn-built-in.md`.
- **Source**: `packages/@glimmer/runtime/lib/helpers/fn.ts:18-55`.
- **Semantics**: `(fn f a1 … an)` evaluates to a JS function `g`. The helper's reactive value is
  created once and returns the *same* `g` until re-evaluated; `g` itself captures the argument
  computations, not their values. The helper value does not consume its arguments while
  producing `g` (the returned closure reads them lazily), so `g`'s identity is stable across
  argument changes. When `g(...rest)` is called:

  ```text
  [fnValue, ...args] = current values of all positional arguments  (read at call time)
  [Dev] if the first argument is not an invokable (`mut`) value and fnValue is not a function:
        throw Error("You must pass a function as the `fn` helper's first argument, you passed <v>. While rendering:\n\n<debug label>")
  if first argument is an invokable value (result of `mut`, §2.11):
        value = args.length > 0 ? args[0] : rest[0]
        update the referenced path to value;  return undefined
  else:
        return fnValue.call(THIS, ...args, ...rest)
  ```

  where `THIS` is `undefined` in production and, **[Dev]**, an "untouchable" object that throws
  on any property access (`buildUntouchableThis('`fn` helper')`). Tests:
  `tests/integration/helpers/fn-test.js:84-130` (stashed results see updated args/function),
  `:132-161` (no `this`), `:163-193` (nested `fn` partially applies each layer), `:195-230`
  (`fn (mut x)` sets `x`, including falsy values).
- **[Dev]** The same assertion is also performed eagerly when the helper is first evaluated
  (`check(positional[0], assertCallbackIsFn)`, `fn.ts:19`).
- Arity: any number of curried arguments; there is no arity checking of `f`.

### 2.5 `get`

- **Access**: import `get` from `@ember/helper`; loose name `get`.
- **Source**: `packages/@glimmer/runtime/lib/helpers/get.ts:12-33`.
- **Semantics**: `(get obj path)`:

  ```text
  source = value(positional[0] ?? undefined)
  if source is null or undefined: result undefined
  else result = EmberGet(source, String(value(positional[1] ?? undefined)))
  ```

  `EmberGet` is Ember's `get` (`packages/@ember/-internals/metal/lib/property_get.ts:79-98`),
  so:
  - a key containing `.` is a *path*: split on `.` and each segment read in turn; a `null`,
    `undefined` or `isDestroyed` intermediate yields `undefined`
    (`property_get.ts:140-157`);
  - each segment read is Ember's `_getProp` (§10.3): consumes the storage for `(obj, key)`;
    calls `unknownProperty(key)` when the value is `undefined`, the key is not `in` the object
    and the object implements `unknownProperty`; if the value is an array/Ember array also
    consumes its `[]` storage;
  - numbers are stringified: `(get arr 0)` reads `arr["0"]`.
  - `null`/`undefined` key becomes the string `"null"`/`"undefined"`.
  - **[Dev]** `EmberGet` asserts `'this' in paths is not supported` if the key starts with
    `this.` and asserts the key type (string or non-NaN number) — only reachable for keys that
    remain non-strings, which cannot happen after `String()`.
- **Updatable**: the result is updatable. Updating it (via two-way binding, `mut`, or
  `<Input @value=(get …)>`) calls Ember's `set(source, String(key), value)` when `source` is not
  null/undefined, else does nothing. Tests: `get-test.js:488-625`.
- Re-evaluates when the source, the key, or any consumed property storage changes (dynamic
  keys: `get-test.js:162-390`).

### 2.6 `eq`, `neq`

- **Access**: strict auto-import only (`@ember/helper`); not built-in in loose mode (§1.2).
  Since 7.1.0.
- **Source**: `packages/@glimmer/runtime/lib/helpers/eq.ts`, `neq.ts`.
- These are *plain functions* invoked through the default helper manager (§06): `eq(a, b)` is
  `a === b`; `neq(a, b)` is `a !== b`.
- **[Dev]** If the call receives an argument count other than 2, throws
  `` `eq` expects exactly two arguments, but received N. `` (resp. `neq`). Under the default
  helper manager, passing any named argument appends the named-arguments proxy as an extra
  argument (§06-6.3, §06-3.2), so `(eq a b c=1)` also throws (3 arguments).

### 2.7 `gt`, `gte`, `lt`, `lte`

- Same access and mechanism as `eq`. `gt(a,b) = a > b`, `gte = a >= b`, `lt = a < b`,
  `lte = a <= b` using JS relational semantics (no coercion beyond JS's). **[Dev]** exactly two
  arguments (`packages/@glimmer/runtime/lib/helpers/gt.ts:3-9` et al.).

### 2.8 `and`, `or`, `not`

- **Access**: strict auto-import only; since 7.1.0.
- `and` / `or` are internal helpers with **short-circuit, lazy** evaluation
  (`packages/@glimmer/runtime/lib/helpers/and.ts:8-26`, `or.ts:8-26`):

  ```text
  and: [Dev] positional.length >= 2 else throw "`and` expects at least two arguments, but received N."
       last = undefined
       for each positional argument p in order:
           last = value(p)
           if not toBool(last): return last       // later arguments are NOT evaluated
       return last
  or:  same, but returns the first `last` for which toBool(last) is true
  ```

  The result is the *operand value*, not a boolean (JS `&&`/`||` semantics with Ember
  truthiness). Only the evaluated operands are consumed, so the result is reactive only to
  them.
- `not` is a plain function: `!toBool(x)`; **[Dev]** exactly one argument
  (`not.ts:4-10`).
- `toBool` is Ember's truthiness (§10.1): empty arrays are falsy, proxies use `isTruthy`,
  `TrustedHTML('')` is falsy.

### 2.9 `element`

- **Access**: strict auto-import (`@ember/helper` `element`); since 7.1.0. Not built-in in loose
  mode. RFC `rfcs/text/0389-dynamic-tag-names.md`.
- **Source**: `packages/@ember/-internals/glimmer/lib/helpers/element.ts:12-113`.
- **Semantics**: `(element tagName)` returns a *component definition* that, when invoked
  (`<Tag …>…</Tag>`, typically via `{{#let (element "h1") as |Tag|}}`), renders:
  - for a non-empty string `t`: an element `<t>` wrapping the invocation's default block, with
    the invocation's attributes and modifiers applied to that element (the definition's
    manager has the `wrapped` capability and no `self`, `element.ts:16-53`);
  - for `""`: the block content with no wrapping element; attributes and modifiers are dropped.
  - Definitions are cached per tag name (`element.ts:70-80`), so `(element "h1")` evaluated twice
    yields the same identity, and changing the tag name produces a different definition (the
    old element is torn down and a new one rendered: `element-test.js:79-106`).
  - Debug name / `toString()` is `(element "<tag>")`.
- **[Dev]** assertions (thrown during evaluation): exactly one positional argument
  (`The \`element\` helper takes a single positional argument`), no named arguments
  (`The \`element\` helper does not take any named arguments`), and the argument must be a
  string (`` The argument passed to the `element` helper must be a string (you passed `<v>`) ``, the
  parenthetical omitted for `null`, `undefined` and objects). Tests `element-test.js:27-205`.
  See Q4 for a documentation mismatch about `null`/`undefined`.

### 2.10 `uniqueId` (strict) / `unique-id` (loose)

- **Strict**: `import { uniqueId } from '@ember/helper'` is the *plain function*
  `uniqueId()` (`packages/@ember/helper/index.ts:715`,
  `packages/@ember/-internals/glimmer/lib/helpers/unique-id.ts:22-29`), invoked through the
  default helper manager. Since it takes no arguments, its value is computed once per
  invocation site instance and is stable thereafter (no tracked storage consumed).
- **Loose**: the name `unique-id` resolves to an internal helper that returns a constant
  (constant) value, a fresh id each time the helper is instantiated
  (`unique-id.ts:5-12`).
- **Value format**: a UUID-shaped string of the form `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
  whose first character is always a letter `a`–`f`, so that it is a valid CSS identifier /
  HTML id (`unique-id-test.js:140-199`). It is generated by the expression in
  `unique-id.ts:26-28`; implementations MAY use any generator that produces the same format
  with a letter first and uniqueness per call.
- Each separate invocation produces a different id; the id is stable across re-renders of the
  same invocation, including when concatenated with changing values
  (`unique-id-test.js:44-139`).
- It is also callable directly from JS (`uniqueId()`) and via `invokeHelper`.

### 2.11 `mut` **[Legacy]**

- **Access**: strict keyword (`STRICT_MODE_KEYWORDS`); loose name `mut`.
- **Source**: `packages/@ember/-internals/glimmer/lib/helpers/mut.ts:53-72`.
- **Semantics**: `(mut path)` requires its single positional argument to be *updatable*
  (§2) — a path (`this.x`, `@x`, block param `.x`, `(get …)`, a `hash` child path, or
  another `mut`). **[Dev]** otherwise `You can only pass a path to mut`
  (tests `mut-test.js:121-142`: literals and helper results assert).
- The result's *value* is the current value of the path (reading it is reactive to the path).
  The result is additionally marked *invokable*, which has two observable effects:
  1. `fn` treats it specially (§2.4): `(fn (mut this.x))` returns a setter; `(fn (mut this.x) v)`
     returns a function that sets `x` to `v`.
  2. Passed as a named argument to a classic component, it is updatable (two-way) like any
     path (§6.5).
- Named arguments are ignored; extra positionals ignored.
- *Note:* the old "mut cell" object (`{ value, update() }`) is not produced by `mut` itself; it
  appears in a classic component's `attrs` for *any* updatable argument (§6.5,
  `mut-test.js:385-513`).

### 2.12 `readonly` **[Legacy]**

- **Access**: strict keyword; loose name `readonly`.
- **Source**: `packages/@ember/-internals/glimmer/lib/helpers/readonly.ts:122-126`,
  `packages/@glimmer/reference/lib/reference.ts:120-124`.
- **Semantics**: returns the first positional argument's value as a reactive value that is
  *not updatable* (§2). If the argument is already non-updatable it is returned as-is. The
  result follows upstream changes but writes downstream (e.g. a classic child `set`ting the
  property) do not propagate upstream. Only the binding is protected — mutating properties of an
  object value is still visible to all (tests `readonly-test.js:12-270`;
  `mut-test.js:177-232` "{{readonly}} of a {{mut}} is converted into an immutable binding").

### 2.13 `each-in` (keyword) / `-each-in`

- **Access**: block keyword `{{#each-in}}` in both modes, rewritten per §1.4(5).
- **Source**: `packages/@ember/-internals/glimmer/lib/helpers/each-in.ts:301-322`,
  iteration in `lib/utils/iterator.ts:12-34,119-189,249-257`.
- `(-each-in x)` evaluates to an opaque wrapper around the iterable; evaluation:

  ```text
  v = value(x)
  consume the whole-object storage of v          // tagForObject: dirtied by notifyPropertyChange on any key
  if v is an Ember proxy (ObjectProxy/ArrayProxy): v = content of v   // bypasses unknownProperty
  return EachInWrapper(v)
  ```

  The `{{#each}}` machinery (§05) asks the environment's `toIterator` (§10.2) to iterate it.
  For an `EachInWrapper(v)`:

  | `v` | iteration (value, memo) |
  |---|---|
  | not an object or function | empty → `{{else}}` |
  | JS array or Ember array | as an *object*: `Object.keys(v)` order; memo = the key string (`"0"`, `"1"`, …); holes skipped (`each-in-test.js:459-476`) |
  | has `Symbol.iterator` (e.g. `Map`) | each entry `[k, val]` → value `val`, memo `k` (any type, e.g. object keys) |
  | has `forEach` | if callback observed with ≥2 arguments: value/key pairs; else list of values with index memos |
  | otherwise | own enumerable string keys (`Object.keys`), value `v[k]`, memo `k` |

  For the plain-object/array case each key read consumes the storage for `(v, k)` and, if the
  value is an array, its `[]` storage (`iterator.ts:119-146`). Direct property mutation or
  `delete` that bypasses Ember `set`/tracking is not observed (`each-in-test.js:392-458`);
  replacing the object or `set`ting keys is.
- **Block params**: the rewrite makes the template's first block param the *memo* (key) and
  the second the *value*; `{{#each-in obj as |key value|}}`.
- **Keys** (`key=` hash argument; `packages/@glimmer/reference/lib/iterable.ts:40-76`):
  - default `@identity`: the entry's **value** (so a changed value replaces that entry's DOM;
    `each-in-test.js:733-749`);
  - `@key`: the memo, i.e. the property name / Map key — values update in place;
  - `@index`: `String(memo)` — for objects this is the property *name* (not the position);
    for Maps with object keys all keys stringify to `"[object Object]"` and collide
    (`each-in-test.js:770-830`);
  - any other string: a path read (Ember `get`) on the entry's value.
  Duplicate keys are disambiguated per occurrence (§05).
- An empty key string `''` is a valid property name (`each-in-test.js:305-320`); keys with
  periods are rendered correctly (`:321-360`).
- Prototype properties are not iterated (`:361-391`); proxies iterate their content
  (`:560`).

### 2.14 `-track-array`

- Inserted around the iterable of every `{{#each}}` (§1.4(8)).
- **Source**: `packages/@ember/-internals/glimmer/lib/helpers/-track-array.ts:17-30`.
- **Semantics**: returns the argument's value unchanged; if it is an object, also consumes its
  `[]` (collection contents) storage. This makes `{{#each}}` over an Ember array re-render on
  KVO-style mutation (`pushObject`, `removeAt`, …) that does not change the array's identity.

The runtime `toIterator` for plain `{{#each}}` (§10.2) is also Ember's.

### 2.15 `unbound` **[Legacy]**

- **Access**: strict keyword; loose name `unbound`.
- **Source**: `packages/@ember/-internals/glimmer/lib/helpers/unbound.ts:42-49`.
- **Semantics**: evaluates its single positional argument once, when the helper is
  instantiated, and produces a *constant* value (§07-0). Property paths off the
  result (`(unbound this.obj).x`) are also constant, read once
  (`packages/@glimmer/reference/lib/reference.ts:207-217`). Nothing inside an `unbound`
  invocation site updates afterwards, including across parent re-renders, `{{#each}}` item
  changes, yields, and helpers with dependent keys (`unbound-test.js:197-674`). URL-unsafe
  values are still sanitized when bound to `href` (`:114-196`).
- **[Dev]** `unbound helper cannot be called with multiple params or hash params`.

### 2.16 `-normalize-class`

- Internal; used by ASTv1→wire compilation of classic `class` bindings in some inputs. Source
  `lib/helpers/-normalize-class.ts:7-26`.
- `(-normalize-class "path.to.prop" value)`: let `name` be the last `.`-segment of the first
  argument. Result: `dasherize(name)` if `value === true`; `''` if `value` is falsy and not `0`;
  else `String(value)`.
  *Note:* No current Ember AST plugin emits this helper; it remains in the table for
  precompiled templates from older compilers. Because the wire format is not a compatibility
  requirement (§00-0.2), a new implementation need not support it.

### 2.17 `-in-el-null`

- Inserted by §1.4(7) in non-production compiles only.
- **[Dev]** Evaluates to its argument; asserts
  `You cannot pass a null or undefined destination element to in-element` when the value is
  `null`/`undefined` (`lib/helpers/-in-element-null-check.ts:9-24`). In production it returns
  the argument unchanged.

### 2.18 `-resolve` **[Loose mode]**

- Inserted by `transform-resolutions` for `(helper "name")` / `(modifier "name")`.
- `(-resolve "type:name")`: returns the *constant* value `owner.factoryFor("type:name")?.class`
  (`lib/helpers/-resolve.ts:11-44`). **[Dev]** asserts the owner exists, exactly one
  positional, a constant string literal of the form `a:b`, and
  `` Attempted to invoke `(-resolve "type:name")`, but name was not a valid type name. `` when
  `owner.hasRegistration(fullName)` is false.
  The resolved value is then treated by the `helper`/`modifier` keyword (§05) as a helper or
  modifier definition. *Note:* this bypasses the classic-helper factory wrapping of §5.3 —
  see Q6.

### 2.19 `-disallow-dynamic-resolution` **[Loose mode]** **[Dev]**

- Inserted (DEBUG builds only) by `transform-resolutions` for non-literal first params of
  `helper`/`modifier`. Named args `type`, `loc`, `original` (string literals).
- Evaluates to its argument's value; **[Dev]** asserts that the value is not a string:
  ``Passing a dynamic string to the `(${type})` keyword is disallowed. (You specified `(${type} ${original})` and `${original}` evaluated into "${value}".) This ensures we can statically analyze the template and determine which ${type}s are used. If the ${type} name is always the same, use a string literal instead, i.e. `(${type} "${value}")`. Otherwise, import the ${type}s into JavaScript and pass them directly. See https://github.com/emberjs/rfcs/blob/master/text/0496-handlebars-strict-mode.md#4-no-dynamic-resolution for details. ${loc}``
  (`lib/helpers/-disallow-dynamic-resolution.ts:9-57`). In production the transform does not
  insert it and the table entry is a pass-through.
  Consequently dynamic *string* helper/modifier resolution is never supported; dynamic string
  *component* resolution (`{{component this.name}}`) is supported in loose mode (§5.2).

### 2.20 `action` (removed) **[Legacy]**

The `{{action}}` helper and modifier were removed (RFC
`rfcs/text/1006-deprecate-action-template-helper.md`; commit `c1c8b00f70` "Remove
DEPRECATE_TEMPLATE_ACTION"), and emberjs/ember.js#21641 removed what was left: `action` is no
longer a syntax keyword, a strict keyword (§1.3(b)), or rewritten by `transform-action-syntax`
(§03-7.3). It is an ordinary name. At runtime:

- **[Loose mode]** `{{action …}}`, `(action …)` and `<div {{action …}}>` resolve
  `helper:action` / `modifier:action` through the registry (§5.3, §5.4), and a registered one
  receives exactly the arguments written. Unless an app registers one, the **[Dev]** error is the
  generic ``Attempted to resolve `action`, which was expected to be a component or helper, but
  nothing was found.`` (or `…a helper…`, `…a modifier…`).
- Strict mode: an unbound `action` is the ordinary compile-time "not in scope" error
  (`Attempted to resolve a helper in a strict mode template, but that value was not in scope: action`,
  and the component-or-helper and modifier variants), and a lexical `action` binding works.

(Tests: `packages/@ember/-internals/glimmer/tests/integration/action-is-not-a-keyword-test.js`.)
The `@action` *decorator* from `@ember/object` is unrelated and remains.

### 2.21 `on` modifier

- **Access**: strict auto-import (`@ember/modifier` `on`); loose name `on` (built-in modifier
  table). Source: `packages/@glimmer/runtime/lib/modifiers/on.ts`.
- **Semantics** (install and every update):

  ```text
  eventName = value(positional[0])   [Dev] must be a non-empty string:
      "You must pass a valid DOM event name as the first argument to the `on` modifier on <selector>"
  callback  = value(positional[1])   [Dev] must be a function:
      "You must pass a function as the second argument to the `on` modifier; you passed <typeof|null>. While rendering:\n\n<label> on <selector>"
  [Dev] positional.length === 2 else
      "You can only pass two positional arguments (event name and callback) to the `on` modifier, but you provided N. Consider using the `fn` helper to provide additional arguments to the `on` callback on <selector>"
  once, passive, capture = values of named args (each boolean|undefined; [Dev] type-checked;
      [Dev] any other named arg → "You can only `once`, `passive` or `capture` named arguments to the `on` modifier, but you provided <keys> on <selector>")
  if first install, or any of (eventName, callback identity, once, passive, capture) changed:
      options = (once, passive, capture all undefined) ? undefined : { once, passive, capture }
      remove the previous listener (with its previous options) if any
      addEventListener(eventName, listener, options)
  ```

  `<selector>` is `tagname#id.class1.class2` of the element. The listener is the user callback
  called with the event (and `this` = `undefined`; **[Dev]** `this` is an untouchable object,
  and when `passive` is true `event.preventDefault` is replaced by a function that throws
  `You marked this listener as 'passive', meaning that you must not call 'event.preventDefault()': …`).
  On destruction the listener is removed. In production, named args are read only if present.
  Tests: `tests/integration/modifiers/on-test.js`.
- The modifier's args are all consumed on install/update, so it updates when any of them
  changes.

---
## 3. Classic helpers (`@ember/component/helper`) **[Legacy]**

Ember provides two helper forms in addition to plain functions (default helper manager, §06).
Both are ordinary helper-manager clients; this section specifies their observable contract.

### 3.1 Class-based `Helper`

Source: `packages/@ember/-internals/glimmer/lib/helper.ts:128-270`.

- `Helper` is an `EmberObject` subclass carrying a helper manager (`setHelperManager`,
  capabilities `hasValue: true, hasDestroyable: true`, `helper.ts:206-270`) and the brand
  `IS_CLASSIC_HELPER` (`lib/helper-brand.ts`).
- **Instantiation**: one instance per helper invocation site instance (§06 `createHelper`),
  created when the invocation is first evaluated.
  - When resolved through the registry (loose mode), the instance is created with
    `factory.create()` on the owner's factory (so injections apply) — see §5.3.
  - When used as a value (strict mode, or `(helper SomeClass)`), the class's `create()` is
    called with an object whose owner is the rendering owner (`helper.ts:212-227`).
  - **[Dev]** the instance must have `compute` and `destroy` functions; `init` asserts
    `expected compute to be defined`.
- **Value**: each evaluation calls `instance.compute(positional, named)` where `positional` is
  an array-like and `named` an object whose element/property reads lazily evaluate the
  corresponding argument (the §06 "arguments proxy"); only the arguments actually read are
  consumed. The value is a reactive computation re-evaluated when any storage consumed by
  `compute` changes, or when `recompute()` is called.
- `recompute()` invalidates the helper's private storage inside a run-loop `join`
  (`helper.ts:190-192`).
- **Destruction**: the instance is destroyed (Ember `destroy()`, i.e. `willDestroy` and
  destruction hooks per `@ember/destroyable`) when the invocation is torn down.

### 3.2 Function-based `helper(fn)`

Source: `helper.ts:274-307, 388-410`.

- `helper(fn)` returns an opaque `Wrapper` object (not a function, not constructible) with a
  helper manager (`hasValue: true`, no destroyable).
- Value: `fn.call(null, positional, named)` with the same lazy argument objects as §3.1.
- The debug name is the function's name.

---

## 4. Other public Ember modules relevant to templates

| Module | Exports that matter for templates | Source |
|---|---|---|
| `@ember/helper` | `array concat eq fn get gt gte hash lt lte neq and or not element uniqueId`, `invokeHelper`, `setHelperManager`, `capabilities` | `packages/@ember/helper/index.ts` |
| `@ember/modifier` | `on`, `setModifierManager`, `capabilities` | `packages/@ember/modifier/index.ts`, `on.ts` |
| `@ember/component` | default `Component` (classic), `Input`, `Textarea`, `setComponentTemplate`, `getComponentTemplate`, `setComponentManager`, `capabilities` | `packages/@ember/component/index.ts` |
| `@ember/component/template-only` | `templateOnly(moduleName?, name?)` | `packages/@ember/component/template-only.ts` |
| `@ember/component/helper` | default `Helper`, `helper` | `packages/@ember/component/helper.ts` |
| `@ember/routing` | `LinkTo`, `setRouteManager`, `routeCapabilities` | `packages/@ember/routing/index.ts:1-6` |
| `@ember/template` | `trustHTML`, `htmlSafe`, `isTrustedHTML`, `isHTMLSafe`, types `TrustedHTML`/`SafeString` | `packages/@ember/template/index.ts` |
| `@ember/renderer` | `renderSettled`, `renderComponent` | `packages/@ember/renderer/index.ts` |
| `@ember/debug` | `captureRenderTree` (§13) | `packages/@ember/debug/lib/capture-render-tree.ts` |

`templateOnly(moduleName)` returns a template-only component definition whose `toString()`
returns `moduleName` (`template-only-components-test.js:223-229`).

---

## 5. Loose-mode resolution **[Loose mode]**

Loose-mode templates (not `strictMode`, chapter 01) may refer to components, helpers and
modifiers by *free names* that are resolved at runtime through the template's owner. Chapter 03
defines which syntactic positions produce free-name references and in which namespaces; this
section defines what Ember does with them.

### 5.1 Syntactic positions and namespaces

From `packages/@glimmer/syntax/lib/v2/loose-resolution.ts:15-122` (see §03 for normative detail).
A *simple* callee is a path with a variable head and no tail that is not a local.

| Position | Example | Namespaces tried, in order |
|---|---|---|
| append with args | `{{foo a}}`, `{{foo a=b}}` | component, then helper; error if neither |
| append without args | `{{foo}}` | component, then helper; **nothing rendered, and no error,** if neither. This is required: loose mode stays as stable as possible while it is phased out, and the ember-template-lint rules `no-curly-component-invocation` and `no-implicit-this` flag the case (`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/resolution.ts:403-422`). Under the removed implicit-`this` fallback a typo also rendered empty, but raised the **[Dev]** `this-property-fallback` deprecation from 3.26 until 4.0. |
| trusting append | `{{{foo}}}` | helper only |
| block | `{{#foo}}…{{/foo}}` | component only |
| sub-expression | `(foo …)` | helper only |
| attribute / argument value | `<div class={{foo}}>`, `<X @a={{foo a}} />` | helper only |
| element modifier | `<div {{foo}}>` | modifier only |
| angle-bracket tag (capitalized or containing `::`; lowercase tags are HTML elements, §03) | `<Foo />`, `<Foo::Bar />` | component only |
| bare free identifier used as a value | `{{foo bar}}` (the `bar`) | built-in keyword helper only (§1.2 `BUILTIN_KEYWORD_HELPERS`, plus `-mount` with the router resolver) |

Paths with a free head and a tail (`{{foo.bar}}`) are compile-time errors in loose mode as in
strict mode (e.g. `You attempted to render a path (\`{{hello.world}}\`), but hello was not in scope`,
`custom-helper-test.js:38-52`). There is **no implicit-`this` fallback** in Ember 7: a free
name never resolves to a property of `this` (RFC `rfcs/text/0308-deprecate-property-lookup-fallback.md`;
test `curly-components-test.js:1274-1313` "lookup of component takes priority over property",
"component without dash is looked up").

### 5.2 Components

**Name normalization.** Before lookup, angle-bracket tag names are converted by the compiler's
`customizeComponentName` (`packages/@ember/template-compiler/lib/compile-options.ts:64-73`,
`dasherize-component-name.ts:7-22`):

```text
normalize(tag) = tag with every match of /[A-Z]|::/g replaced by:
   '::'                          → '/'
   uppercase at index 0, or preceded by a non-[A-Za-z0-9] char → lowercase letter
   other uppercase               → '-' + lowercase letter
```

Examples: `FooBar`→`foo-bar`, `XFoo`→`x-foo`, `Foo::BarBaz`→`foo/bar-baz`, `Foo::Bar`→`foo/bar`.
**[Dev]** a tag containing `:` but not `::` asserts
`You tried to invoke a component named <${tag} /> in "${moduleName ?? '[NO MODULE]'}", but that is not a valid name for a component. Did you mean to use the "::" syntax for nested components?`.
Curly names (`{{foo-bar}}`, `{{foo/bar}}`) and `{{component "foo/bar"}}` strings are used
verbatim.

**Lookup** (`resolver.ts:48-86, 222-283`):

```text
lookupComponent(name, owner):
  factory = owner.factoryFor("component:" + name)     // or null
  if factory == null:
      [Dev] if name == "text-area": assert "Could not find component `<TextArea />` (did you mean `<Textarea />`?)"
      return null
  template = getComponentTemplate(factory.class)       // setComponentTemplate association, inherited along prototype chain
  key = factory   (cache key)
  if a definition is cached for key: return it
  manager = internal component manager of factory.class
  definition = {
     state:    isClassicCurlyManager(manager) ? factory : factory.class,
     manager,
     template: template ? template(owner) : null
  }
  cache definition per resolver instance; return it
```

There is **no** lookup of `template:components/<name>` anymore (removed with
`DEPRECATE_COMPONENT_TEMPLATE_RESOLVING`, commit `1c8c8129e5`): a component's template is
found only through `setComponentTemplate` (colocation, template tag) or, for classic
components, their `layout`/`layoutName` (§6.2). A registered template-only component is a
`templateOnly()` value with an associated template (`template-only-components-test.js:15-26`).

The cache means repeated resolution of the same factory yields the same definition
(`tests/unit/runtime-resolver-cache-test.js`); the resolver instance is per renderer.
`render.getComponentDefinition` instrumentation is emitted around definition creation.

**Not found**: **[Dev]** `Attempted to resolve \`${name}\`, which was expected to be a component, but nothing was found.`
(`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/resolution.ts:129-137`); for
`{{foo a}}` (component-or-helper) the message says `expected to be a component or helper`
(`resolution.ts:323-339`). The error is raised when the template is first compiled for
execution (lazily, on first render of that block), not when the template module is loaded.
`{{#some-helper}}` with only a helper registered fails with the *component* message
(`custom-helper-test.js:457-483`); `<div {{some-helper}}>` fails with the *modifier* message.

**Dynamic string names.** `{{component this.name}}` / `(component "x")`: when the value is a
non-empty string, it is resolved with `lookupComponent` at the time the value is (re)evaluated
(`packages/@glimmer/runtime/lib/references/curry-value.ts:29-71`). **[Dev]** not found →
the same "expected to be a component" error (`dynamic-components-test.js:552-572`). In strict
mode a string value throws **[Dev]**
`Attempted to resolve a dynamic component with a string definition, \`${value}\` in a strict mode template. In strict mode, using strings to resolve component definitions is prohibited. You can instead import the component definition and use it directly.`

**Ambiguity**: in append position with or without arguments, the component namespace wins
over the helper namespace when both exist.

**Owner**: the owner used for resolution is the owner associated with the template's block
(§06); inside an engine this is the engine instance (§8.5).

### 5.3 Helpers

```text
lookupHelper(name, owner):                               // resolver.ts:137-186
  [Dev] assert not (name ∈ BUILTIN_HELPERS and owner.hasRegistration("helper:"+name))
  if name ∈ BUILTIN_HELPERS: return it
  factory = owner.factoryFor("helper:" + name);  if none: return null
  def = factory.class;                            if undefined: return null
  if def is a function branded IS_CLASSIC_HELPER (a `Helper` subclass):
      associate def's helper manager with `factory` itself; return factory   // injections come from the factory
  return def            // plain function (default helper manager), helper() Wrapper, or any value with a helper manager
```

The registry is configured with `helper: { instantiate: false }` (`setup-registry.ts:43`), so
registering a plain function as `helper:foo` makes `{{foo}}` call it via the default helper
manager (`render-component-test.ts:973-989`). Names without a dash resolve
(`custom-helper-test.js:30-36`); names containing `.` cannot be expressed (§5.1).
**[Dev]** not found: `Attempted to resolve \`${name}\`, which was expected to be a helper, but nothing was found.`

In an `(sexpr)`/attribute position where a *component* is registered but no helper, the
lookup fails (helper namespace only).

### 5.4 Modifiers

```text
lookupModifier(name, owner):                             // resolver.ts:198-212
  if name == "on": return on
  factory = owner.factoryFor("modifier:" + name);  if none: return null
  return factory.class || null
```

**[Dev]** not found: `Attempted to resolve \`${name}\`, which was expected to be a modifier, but nothing was found.`
A registered value without a modifier manager, such as a plain function, is returned as is
and fails when invoked, because there is no default modifier manager (§06-1.5).

### 5.5 Strict-mode templates inside a loose-mode app

Strict-mode templates never consult the registry for free names; a free name that is neither
lexically in scope nor a strict keyword is a compile-time error (§03) or, for names that reach
the runtime as strict keywords, **[Dev]**
`Attempted to resolve a <kind> in a strict mode template, but that value was not in scope: <name>`
(`resolution.ts:425-454`; test `render-component-test.ts:991-1000`). A loose-mode component
invoked *from* a strict template still resolves through the owner passed down the tree
(`render-component-test.ts:973-989`).

### 5.6 Built-in component registrations

`setupEngineRegistry` registers, for every application and engine
(`setup-registry.ts:40-49`):

```text
component:input     → Input
component:link-to   → LinkTo
component:textarea  → Textarea
```

so loose-mode `<Input>`, `{{input}}`, `<Textarea>`, `{{textarea}}`, `<LinkTo>`,
`{{#link-to}}` resolve to the built-ins. `setupApplicationRegistry` additionally registers the
DOM builder service, `template:-root`, and `renderer:-dom` (`setup-registry.ts:12-38`).

---

## 6. Classic components (`@ember/component`) **[Legacy]**

A classic component is any class whose internal component manager is the *curly component
manager* (`component-managers/curly.ts`); `Component` from `@ember/component` has it
(`component.ts:1694`). Subclasses inherit it. This section specifies what templates and
component authors observe. Capabilities of the manager (`curly.ts:550-564`): dynamic layout,
dynamic tag, prepare-args, create-args, attribute hook, element hook, create-caller, dynamic
scope, update hook, create-instance, wrapped, will-destroy.

### 6.1 Invocation and argument processing

A classic component may be invoked with curly syntax (`{{foo-bar a=1}}`, `{{#foo-bar}}…{{/foo-bar}}`,
`{{component "foo-bar"}}`) or angle brackets (`<FooBar @a={{1}} class="x" />`). Arguments:

**Positional parameters** (`curly.ts:189-254`). The class's static `positionalParams`
(default `[]`, set via `reopenClass`, `component.ts:1690-1692`) maps positional args to named
args:

- `positionalParams` is a **string** `P` and positional args were passed: named arg `P` is a
  reactive array of all positional values (re-created when any changes). **[Dev]** if `P` is
  also passed as a named arg: `You cannot specify positional parameters and the hash argument \`${P}\`.`
- an **array** `[n0, n1, …]`: for `i < min(len, positional.length)`, named arg `n_i` is the
  i-th positional argument (the same argument computation, so updatable). **[Dev]** conflict with a named
  arg: `You cannot specify both a positional param (at position ${i}) and the hash argument \`${n_i}\`.`
- extra positional args beyond the array length are dropped; after mapping, the component
  receives no positional args.
- `__ARGS__` (internal, used by the `{{component}}` curried form) merges curried args.

**Named arguments → properties** (`curly.ts:262-369`, `utils/process-args.ts:10-49`). At
creation:

```text
captured = the named argument computations (stable for the component's lifetime)
props = {}; attrs = {}
for each name k in captured:            // this whole loop is a tracked computation → argsValidity
    v = value(captured[k])
    attrs[k] = isUpdatable(captured[k]) ? MutableCell{ value: v, update(x) → update captured[k] to x } : v
    props[k] = v
props.attrs = attrs
if "id" was passed: props.elementId = props.id      [Dev] "You cannot invoke a component with both 'id' and 'elementId' at the same time."
props.parentView = nearest enclosing classic component instance (dynamic scope), or null
props._target = the caller's `this`
setOwner(props, owner)
component = factory.create(props)        // untracked; init() runs, then `didReceiveAttrs`
```

So every named argument is reflected as an own property of the instance and available as
`this.k`, `{{this.k}}`, `{{@k}}`, and `this.attrs.k` (value or mutable cell; *[Legacy]*
`{{this.attrs.k}}` in templates is rewritten to `@k`, §1.4(4)). Tests
`curly-components-test.js:724-777,1554-1596`.

**Updates** (`curly.ts:442-473`). When the component's update hook runs and the tracked
computation that read the argument values is invalid (any argument changed):

```text
props = processComponentArgs(captured)   (as above)
component.setProperties(props)  while suppressing upstream write-back (§6.5)
send didUpdateAttrs; send didReceiveAttrs
```

Note that re-processing assigns *all* argument properties, not just changed ones.

### 6.2 Template selection (layout)

In priority order (`curly.ts:146-173`; `packages/@glimmer/program/lib/constants.ts:190-270`;
`packages/@glimmer/runtime/lib/compiled/opcodes/component.ts:769-791`):

1. A template associated with the class via `setComponentTemplate` (colocated `.hbs`, template
   tag, or explicit) — inherited through the class hierarchy
   (`component-template-test.js:77-107`). Determined once per definition; `layout` is ignored
   in this case.
2. Otherwise the instance's `layout` property, if it is a template factory (a function).
3. Otherwise, if `layoutName` is set, `owner.lookup("template:" + layoutName)`; **[Dev]**
   ``Layout `${layoutName}` not found!`` if missing (`append-test.js:386-395`).
4. Otherwise the default template, which is exactly `{{yield}}`
   (`packages/@glimmer/program/lib/util/default-template.ts:7`).

`layout`/`layoutName` are read per instance at render time (dynamic layout); both are
**[Legacy]**. A `template` property on the class is ignored (`curly-components-test.js:2000-2041`).

### 6.3 The wrapper element

A classic component is *wrapped*: unless `tagName === ''` it renders an outer element around
its template, and invocation attributes (`<Foo class="x" data-a="b" ...>` in angle-bracket
form) and element modifiers are applied to that element (the "attribute hook", §05/§06).

- **Tag name**: `component.tagName || 'div'` (`curly.ts:175-183`). `tagName` may be passed as an
  argument (`{{foo-bar tagName="span"}}`), set in the class or in `init`
  (`curly-components-test.js:270-343`). **[Dev]** `tagName` may not be a computed property
  (`component.ts:986-989`). It is read once when the element is created; later changes are
  ignored.
- **Tagless** (`tagName === ''`): no element. **[Dev]** assertions
  (`curly.ts:491-540`): no `classNameBindings`
  (`You cannot use \`classNameBindings\` on a tag-less component: ${component}`), no
  `attributeBindings`, no `elementId` unless it equals the passed `id`
  (`You cannot use \`elementId\` on a tag-less component: ${component}`); no DOM event handler
  methods (`component.ts:941-962`,
  ``You can not define `${names}` function(s) to handle DOM event in the `${this}` tagless component since it doesn't have any DOM element.``).
  `this.element` is `null`.
- **Element attributes**, applied when the element is created (`curly.ts:381-427`), *in this
  order* (the runtime merges multiple `class` contributions per §05 and gives later/invocation
  attributes precedence for non-class attributes per §05):
  1. `attributeBindings` (§6.4), then — if no binding targets `id` — `id` =
     `elementId` or `guidFor(component)` (`"ember" + n`).
  2. The `class` *named argument* (curly `class=`): a class-name binding using the simple
     rule of §6.4 without a property name (`true` would assert
     `You must pass a path when binding a to a class name using classNameBindings`).
  3. Each entry of `classNames` as a static class.
  4. Each `classNameBindings` entry (§6.4).
  5. The static class `ember-view`.
  6. If `'ariaRole' in component`: attribute `role` bound reactively to `this.ariaRole`
     (absent when `null`/`undefined`; `curly-components-test.js:1916-1999`).
- **elementId**: if not provided and the component is not tagless, `init` sets
  `elementId = guidFor(this)` (`component.ts:991-993`). It is not reactive: changing the bound
  `id`/`elementId` argument later does not change the DOM (`curly-components-test.js:52-166`).
  **[Dev]** after insertion, setting a different `elementId` throws
  `Changing a view's elementId after creation is not allowed`
  (`packages/@ember/-internals/views/lib/views/states.ts:66-94`). **[Dev]** `elementId` may
  not be a computed property.
- `classNames` and `classNameBindings` are *concatenated properties* (subclasses append to
  superclass values) and `attributeBindings` too (`component.ts:806-822`). **[Dev]** must be
  arrays, not computed properties; `classNames` entries must be static strings
  (`component.ts:963-989`).

### 6.4 `attributeBindings` and `classNameBindings` micro-syntax

Source: `packages/@ember/-internals/glimmer/lib/utils/bindings.ts`.

**attributeBindings** entries (processed from the *end* of the concatenated array to the
start; the first time an *attribute name* is seen wins, so subclass entries override
superclass entries for the same attribute — `curly.ts:93-120`,
`attribute-bindings-test.js:682-716`):

```text
"prop"            → attribute "prop" bound to this.prop       [Dev] prop may not contain '.' ("Illegal attributeBinding: '${prop}' is not a valid attribute name.")
"prop:attr"       → attribute "attr" bound to path this.prop (prop may be a dotted path; a leading "attrs." segment is stripped [Legacy])
[Dev] attr === "class" → "You cannot use class as an attributeBinding, use classNameBindings instead."
attr === "id"     → evaluated ONCE: get(component, prop); if null/undefined use elementId; set as a static id
```

Bound attributes use the normal dynamic-attribute semantics of §05 (property-vs-attribute
normalization, `null`/`undefined`/`false` remove, URL sanitization of `href` etc.:
`attribute-bindings-test.js:887-906` gives `unsafe:javascript:…`). Attribute names are
case-normalized as HTML (`data-FOO` → `data-foo`), but SVG mixed case is preserved
(`viewBox`) (`:280-353`). The property name is looked up as written (`tiTLe` binds attribute
`title` because the attribute name is normalized; `:241-278`). The bound value is a reactive
read of the component property (so both internal `set` and upstream argument changes update
it).

**classNameBindings** entries (`bindings.ts:83-142`):

```text
":static"             → static class "static"
"prop"                → reactive: v = this.prop
                          v === true         → dasherize(last segment of prop)   (e.g. isUrgent → "is-urgent")
                          v truthy or v === 0 → String(v)
                          otherwise           → no class
"prop:yes"            → v truthy → "yes", else no class
"prop:yes:no"         → v truthy → "yes", else "no"
"prop::no"            → v truthy → no class (empty string), else "no"
```

`prop` may be a dotted path (and may start with `attrs.` **[Legacy]**). "truthy" here is JS
truthiness, not Ember `toBool`. **[Dev]** entries must be non-empty strings without spaces
(`curly.ts:491-518`). Tests: `class-bindings-test.js`.

### 6.5 Two-way binding

Classic components implement two-way binding for *every* named argument that is
updatable (§2) (paths, `mut`, `get`, `hash` children …), not only `mut`:

- When a property `k` of the component is changed through Ember's property-change machinery
  (`set`, `this.set`, tracked/`notifyPropertyChange`), and the component is not currently
  receiving attrs (§6.1 update), and `k` is an updatable named argument,
  the new value is written to that argument (`component.ts:1039-1050`). This propagates
  through intermediate classic components (`mut-test.js:13-120, 144-175`,
  `curly-components-test.js:2900-3113`).
- `this.attrs.k.update(v)` (mutable cell) writes `v` upstream (`mut-test.js:385-513`).
- `readonly` breaks the chain upward (§2.12).
- Literal/helper-result arguments are not updatable; setting the property only changes the
  local property ("tolerate constant inputs", `mut-test.js:465-513`).
- Glimmer components (`@glimmer/component`) receive no such behaviour — arguments are
  read-only (§06).

### 6.6 `this`, blocks and `{{yield}}`

- Inside the component's template `this` is the component instance; `{{this}}` renders its
  `toString()` (`curly-components-test.js:3589-3643`).
- A block passed to the component (`{{#foo-bar}}…{{/foo-bar}}`) is evaluated with the
  *caller's* `this` and scope ("it preserves the outer context when yielding",
  `:827-849`); `{{yield a b}}` passes block params; `{{yield to="inverse"}}` renders the
  `{{else}}` block; `(has-block)`/`(has-block-params)` work as in §05 (`:2043-2510`).
- `@component` or other `@`-names that are not passed are `undefined`.

### 6.7 Lifecycle hooks

Hooks are methods on the instance and are also sent as Evented events (so `on('didInsertElement', …)`
listeners fire first, then the method; `packages/@ember/-internals/views/lib/views/core-view-utils.ts:4-10`).
Hook invocations are not tracked (reads inside hooks do not become dependencies of the
render; `curly-components-test.js:3808-3882`).

**"Interactive"** means the renderer's environment is interactive (browser, not FastBoot/SSR
serialization). Hooks marked (I) fire only when interactive.

**Initial render** of a component (`curly.ts:262-440`):

```text
create:        init  (on(init) listeners)             — inside factory.create
               didReceiveAttrs
               if tagless: (I) willRender; state → hasElement; (I) willInsertElement
               if tagged:  (I) willRender
element created (tagged only): state → hasElement; (I) willInsertElement   // attributes already set, not yet in DOM
... children render ...
after the whole render transaction commits, in post-order (children before parent,
siblings in document order):
               (I) state → inDOM; didInsertElement; didRender
```

Test: `life-cycle-test.js:305-420, 538-640` (the exact sequence including `on(init)`).
Non-interactive environments get only `init`, `on(init)`, `didReceiveAttrs` (and on update
`didUpdateAttrs`, `didReceiveAttrs`).

**Update** — when the component's region is invalid during a revalidation (§05-1.6). The
region covers everything consumed while the component was created and rendered: its
argument values, its own template's reads, blocks rendered inside it, descendants, and its
private "dirty" storage (invalidated by `rerender()`):

```text
(pre-order, during revalidation)
    if any argument changed: setProperties(args); didUpdateAttrs; didReceiveAttrs
    (I) willUpdate; willRender
(post-order, after commit)
    (I) didUpdate; didRender
```

- The `didUpdateAttrs`/`didReceiveAttrs` pair runs only when an argument value changed
  (`curly.ts:449-462`). `willUpdate`/`willRender`/`didUpdate`/`didRender` run whenever the
  region is invalid, even when no argument changed (§06-8.5). Because the region includes
  descendants, calling `rerender()` on a component also runs
  `willUpdate/willRender/didUpdate/didRender` on **every ancestor classic component** (not
  descendants): `life-cycle-test.js:380-470`. Changing an argument used only by the top
  component runs hooks only on that component (`:470-501`). This ancestor behavior is
  required, for the same reason as `updateComponent`'s coarse granularity (§06-4.4): these
  hooks exist for older component patterns that depend on it. An implementation with
  finer-grained invalidation MUST still run them on every ancestor classic component.
- `rerender()` in states `preRender` does nothing, in `hasElement`/`inDOM` schedules a
  revalidation of the renderer, in `destroying` throws
  `You can't call rerender on a view being destroyed` (`views/lib/views/states.ts:18-107`).

**Destruction** (`utils/curly-component-state-bucket.ts:47-69`, `component.ts:1596-1600`,
`renderer.ts:262-270`), when the component's region is torn down:

```text
synchronously, top-down (parent before children), during teardown:
    (I) willDestroyElement; willClearRender        (element still present, state inDOM)
    element ↔ view association cleared; view unregistered from the view registry
scheduled (runloop 'actions' queue), top-down:
    component.destroy(): state → destroying; (I) didDestroyElement   (no element)
    (component.destroy() calls destroy(component), which schedules willDestroy as a
    deferred destructor, again in the 'actions' queue, so it runs after every
    didDestroyElement of this batch)
then, in the same 'actions' flush, top-down:
    willDestroy, then other deferred destructors registered on the component
later (runloop 'destroy' queue):
    the component is marked destroyed
```

(`packages/@ember/object/core.ts:300-301`, `packages/@ember/-internals/glimmer/lib/component.ts:1596-1600`;
§06-10.2 gives the queue mapping.) Test: `life-cycle-test.js:502-534` — the full order for three nested components is
`top.willDestroyElement, top.willClearRender, middle.willDestroyElement, middle.willClearRender,
bottom.willDestroyElement, bottom.willClearRender, top.didDestroyElement, middle.didDestroyElement,
bottom.didDestroyElement, top.willDestroy, middle.willDestroy, bottom.willDestroy`.

Setting properties in `willDestroyElement` must not assert (`curly-components-test.js:3322-3347`).

### 6.8 Element access and view hierarchy

- `this.element` (`component.ts:1427-1429`, `renderer.ts:301-309`): the wrapper element once
  created (available from `willInsertElement` on), `null` for tagless components and before
  creation. In a non-interactive environment accessing it throws
  `Accessing \`this.element\` is not allowed in non-interactive environments (such as FastBoot).`
- `readDOMAttr(name)` reads a live property/attribute of the element using the same
  property-vs-attribute normalization as rendering (`component.ts:1088-1105`).
- `parentView` is the nearest enclosing classic component (tracked through the dynamic
  scope; template-only and Glimmer components are skipped; it propagates across `{{outlet}}`
  boundaries and is `null` at the top of the tree — `route-managers/classic/outlet-component.ts:106-125`). `childViews` lists child
  classic components (`component.ts:1321-1323`). `nearestOfType` / `nearestWithProperty` walk
  `parentView` **[Legacy]**.
- `getViewId(view)` is `elementId` for tagged views with an id, else `guidFor`
  (`views/lib/system/utils.ts:64-70`); the renderer keeps a registry id → view used by the
  event dispatcher and `-view-registry:main`. **[Dev]** registering a duplicate id asserts
  `Attempted to register a view with an id already in use: ${id}` (`renderer.ts:288-295`).
- **Bounds**: after render the component's DOM bounds (first/last node) are recorded
  (`curly.ts:429-432`) and exposed via `renderer.getBounds(view)`.

### 6.9 Classic event handler methods

If a classic component (tagged) defines a method named after an event in the dispatcher's
mapping (§12.1: `click`, `keyDown`, `doubleClick`, `focusIn`, …), the event dispatcher
invokes it for events whose target is within the component's element; see §12.2 for
dispatch and bubbling. When a component class is first instantiated, the dispatcher lazily
installs root listeners for the events it handles (`component.ts:923-944`). Calling
`component.on(eventName, …)` also ensures the listener exists (`component.ts:1019-1031`).

### 6.10 `send`, `target`, and actions **[Legacy]**

`component.send(name, ...args)` emits the `DEPRECATE_TARGET_ACTION_SUPPORT` deprecation, then
calls `this.actions[name]` if present; if absent or it returns `true`, forwards to
`this.target.send(...)`; **[Dev]** asserts `${this} had no action handler for: ${name}` when
there is neither (`packages/@ember/-internals/views/lib/mixins/action_support.ts:19-51`).
`_target` defaults to the caller's `this`. These are not template features and are listed only
for completeness.

### 6.11 Root classic components (`appendTo`) **[Legacy]**

`component.appendTo(target)` / `append()` render a classic component as a new root
(`component.ts:1448-1515`, `renderer.ts:216-239`). The root is rendered with the root template
`{{component this}}` where `this` is a curried definition of the instance (`templates/root.ts`),
using a special manager that uses the existing instance instead of creating one
(`component-managers/root.ts:26-115`). **[Dev]** assertions: target must exist
(`You tried to append to (${selector}) but that isn't in the DOM`), must not be or be inside an
`.ember-view` (`You cannot append to an existing Ember.View.`); without a DOM, a string
selector or non-element asserts. Destroying the component removes the root
(`renderer.ts:241-270`).

---
## 7. Built-in components: `Input`, `Textarea`, `LinkTo`

RFC `rfcs/text/0459-angle-bracket-built-in-components.md`.

### 7.1 Common machinery ("internal components")

Source: `packages/@ember/-internals/glimmer/lib/components/internal.ts`.

- Each built-in is an opaque definition object (`opaquify`, `internal.ts:125-151`) with a
  private manager (capabilities: create-args, create-caller, create-instance; *not* wrapped,
  no dynamic scope, no update hook — `internal.ts:159-173`) and a strict-mode template
  (`lib/templates/*.ts`). Its `create()` throws (**[Dev]** `Use constructor instead of create`);
  it cannot be subclassed or instantiated by users. `toString()` is `Input` / `Textarea` / `LinkTo`.
- One instance per invocation; `this` in the template is the instance; arguments are read
  lazily and reactively (`this.named(name)` evaluates the argument computation).
- **Unsupported named arguments are silently ignored** except where noted
  (`internal.ts:62-99`); `validateArguments` runs untracked at creation.
- **Default attributes**: the template sets `id={{this.id}}` and `class={{this.class}}`
  *before* `...attributes`, where `id` is `guidFor(instance)` (`"ember" + n`) and `class`
  includes `ember-view`. An invocation `id="x"` therefore overrides the default id, and an
  invocation `class="x"` is merged with the default class (§05 class merging). The
  instance's destruction is tied to the invocation.
- **Curly invocation** (`{{input value=x}}`) passes only named arguments; curly invocations
  cannot pass HTML attributes, so unsupported named arguments (e.g. `placeholder=`) are
  dropped. See Q8.

### 7.2 `Input`

Access: `import { Input } from '@ember/component'` (strict); `<Input>` / `{{input}}` (loose).
Source: `components/input.ts`, `components/abstract-input.ts`, template `templates/input.ts:4-20`:

```hbs
<input id={{this.id}} class={{this.class}} ...attributes
       type={{this.type}} checked={{this.checked}} value={{this.value}}
       {{on "change" this.change}} {{on "input" this.input}} {{on "keyup" this.keyUp}}
       {{on "paste" this.valueDidChange}} {{on "cut" this.valueDidChange}} />
```

Because `type`, `checked` and `value` come *after* `...attributes`, invocation HTML attributes
of those names are overridden; users must pass `@type`, `@checked`, `@value`.

Supported arguments: `@type`, `@value`, `@checked`, `@enter`, `@insert-newline`,
`@escape-press` (`input.ts:244-255`). **[Dev]** positional arguments assert
`The Input component does not take any positional arguments` (`abstract-input.ts:109-116`).

**Type** (`input.ts:165-178`): `@type` `null`/`undefined` → `"text"`; **[Dev]** must be a string
(`The \`@type\` argument to the <Input> component must be a string`); if the browser does not
support the type (probe: assign to a scratch `<input>`'s `type` and read it back; `""` is
never valid) → `"text"`. Without a DOM, any non-empty string is accepted
(`input.ts:14-44`). Reactive; the rendered `type` attribute updates
(`input-angle-test.js:344-383`).

**Class**: `"ember-checkbox ember-view"` when `@type === "checkbox"`, else
`"ember-text-field ember-view"` (`input.ts:154-163`).

**Value binding** (`abstract-input.ts:35-106`). The component keeps a *value cell* chosen once
from the kind of `@value` argument:

| `@value` | cell |
|---|---|
| absent | local tracked value, initially `undefined` |
| constant (literal) | local tracked value initialised to the literal |
| updatable (path, `mut`, `get`, …) | reads/writes go directly to the upstream argument (two-way) |
| non-updatable, non-constant (e.g. helper result) | *forked*: local copy that is reset to the upstream value whenever the upstream value changes |

On `input`, `change` (non-checkbox), `paste`, `cut` events the cell is set to
`event.target.value`. The `value` DOM property is rendered from the cell. Setting the same
value the DOM already has does not reset the cursor/selection (`input-curly-test.js:118-152`,
per §05 property-update semantics). `null`/`undefined` values render an empty input
(`input-test.js:130-141`).

**Checkbox** (`input.ts:180-242`): when `@type === "checkbox"`, `checked` is rendered from a
cell chosen from `@checked` exactly as above; the `change` event sets it to
`event.target.checked`; `input` events are ignored; for other types `checked` renders
`undefined`. **[Dev]** warning (id `ember.built-in-components.input-checkbox-value`) when a
checkbox receives a non-string `@value` and no `@checked`:
`` `<Input @type="checkbox" />` reflects its checked state via the `@checked` argument. You wrote `<Input @type="checkbox" @value={{...}} />` which is likely not what you intended. Did you mean `<Input @type="checkbox" @checked={{...}} />`? ``

**Key events** (`abstract-input.ts:154-184`): on `keyup` with `event.key === "Enter"`, call
`@enter(value, event)` then `@insert-newline(value, event)`; with `"Escape"`, call
`@escape-press(value, event)`, where `value` is `event.target.value`. Missing callbacks are
no-ops; **[Dev]** a non-function asserts
``The `@${name}` argument to the <Input> component must be a function``.

### 7.3 `Textarea`

Access: `import { Textarea } from '@ember/component'`; `<Textarea>` / `{{textarea}}` (loose).
Template `templates/textarea.ts:5-19`: a `<textarea>` with the same `id`, `class`,
`...attributes`, `value={{this.value}}` and the same five event modifiers. Class
`"ember-text-area ember-view"`. Supported arguments: `@type` (ignored), `@value`, `@enter`,
`@insert-newline`, `@escape-press` (`textarea.ts:146-149`). Value binding and key events as
§7.2. The element has no children; `layout`/`layoutName` do not apply. `<TextArea />` in
loose mode asserts (**[Dev]**) `Could not find component \`<TextArea />\` (did you mean \`<Textarea />\`?)`
(`textarea-angle-test.js:68-72`).

### 7.4 `LinkTo`

Access: `import { LinkTo } from '@ember/routing'`; `<LinkTo>` / `{{#link-to}}` (loose).
Source `components/link-to.ts:265-701`; template `templates/link-to.ts:5-22`:

```hbs
<a id={{this.id}} class={{this.class}}
   role={{this.role}} title={{this.title}} rel={{this.rel}} tabindex={{this.tabindex}} target={{this.target}}
   ...attributes href={{this.href}} {{on 'click' this.click}}>{{yield}}</a>
```

`role`/`title`/`rel`/`tabindex`/`target` are always `undefined` on the instance (legacy
bindings), so they render only when passed as invocation attributes. `href` comes after
`...attributes` and cannot be overridden. It uses the `-routing` service.

**Arguments**: `@route`, `@model`, `@models`, `@query`, `@replace`, `@disabled`,
`@current-when`, `@activeClass`, `@loadingClass`, `@disabledClass` (`link-to.ts:567-582`).
**[Dev]** assertions at creation (`link-to.ts:272-294`, `598-613`):
- in a routeless engine: `You attempted to use the <LinkTo> component within a routeless engine, this is not supported. If you are using the ember-engines addon, use the <LinkToExternal> component instead. See https://github.com/ember-engines/ember-engines for more info.`
- none of route/model/models/query: `You must provide at least one of the \`@route\`, \`@model\`, \`@models\` or \`@query\` arguments to \`<LinkTo>\`.`
- both model and models: `You cannot provide both the \`@model\` and \`@models\` arguments to the <LinkTo> component.`
- `@href`: `Passing the \`@href\` argument to <LinkTo> is not supported.`
- `params` is silently ignored; positional arguments are ignored.

**Derived state** (all reactive):

```text
route    = '@route' passed ? namespace(@route)            [Dev] string or null/undefined
                           : current route name (reactive to router state)
namespace(r) = no engine mount point ? r : r == 'application' ? mountPoint : mountPoint + '.' + r
models   = @models (array; [Dev] "must be an array") | [@model] | []
           — if @query is NOT passed and the last model is a QueryParams object ({isQueryParams:true, values}),
             it is removed from models and its `values` (if non-null) become the query   [Legacy]
query    = @query passed ? ({...@query} | {} if null/undefined; QueryParams → values ?? {}) : as above
isLoading = route is null/undefined OR any model is null/undefined
isDisabled = Boolean(@disabled)
isActive  = router has a current state AND not isLoading AND
              (@current-when boolean ? it
               : @current-when string ? any of its space-separated route names (namespaced) is active (ignoring models/query)
               : routing.isActiveForRoute(models, query, route, currentState))
willBeActive = currentState === targetState ? null : isActive evaluated against targetState
href     = isLoading ? '#' : routing.generateURL(route, models, query)
           (reactive to router state; [Dev] errors re-thrown as "While generating link to route \"${route}\": ${message}")
```

**Class** (`link-to.ts:296-318`): `"ember-view"`, then
`+ classFor('active')` if active (and `" ember-transitioning-out"` if `willBeActive === false`),
else `" ember-transitioning-in"` if `willBeActive` is true; `+ classFor('loading')` if loading;
`+ classFor('disabled')` if disabled, where
`classFor(s) = @sClass true/null/undefined → " s"; non-empty string → " " + string; false/"" → ""`
(**[Dev]** must be string or boolean).

**Click** (`link-to.ts:351-401`): on `click`:
1. If not a *simple click* (not a `MouseEvent`, or any of shift/meta/alt/ctrl pressed, or
   `button !== 0`), do nothing (browser default).
2. If the element's `target` is neither `""` nor `"_self"`, do nothing.
3. Otherwise `preventDefault()`.
4. If disabled: stop. If loading: **[Dev]** warn (`ember-glimmer.link-to.inactive-loading-state`)
   `This link is in an inactive loading state because at least one of its models currently has a null/undefined value, or the provided route name is invalid.`
   and stop.
5. Otherwise `routing.transitionTo(route, models, query, replace)` inside instrumentation
   `interaction.link-to` with payload `{ routeName, queryParams, transition }`.

LinkTo renders without a router (href falls back per the routing service;
`link-to/rendering-curly-test.js:116-124`).

---

## 8. Routing integration

### 8.1 Overview

The router renders the application by rendering a single root component (the *root outlet*)
with `renderComponent` (§9.3) into the application's `rootElement`. Each active route
contributes one *outlet level*; `{{outlet}}` in a level's template renders the next level.
Route behaviour is abstracted by *route managers* (`setRouteManager`, `routeCapabilities`
from `@ember/routing`; `packages/@ember/-internals/routing/route-managers/*`); this chapter
specifies only the classic route manager's rendering contract and the outlet protocol that any
route manager's output is rendered through.

### 8.2 Outlet state

`packages/@ember/-internals/routing/route-managers/outlet-state.ts:29-77`,
`packages/@ember/routing/router.ts:780-840`.

After each transition settles (`_setOutlets`), the router builds a chain of `OutletState`
objects, one per active route info, parent → child (`outlets.main` links to the child; named
outlets no longer exist). Each `OutletState` holds:

- `manager`, `bucket`, `routeInfo` (and `name` = route name);
- `context` — **tracked storage**, initialised to `routeInfo.context`, and set again when the
  route info's `enterPromise` resolves;
- `invokable` — **tracked storage**, the component to render for this level, obtained from the
  route manager (`invokableFor(manager, bucket)`); if that is a promise it is assigned when it
  resolves (nothing renders at this level until then; rejection renders nothing).

The first time, the router creates an *updatable root* (`createRootOutletState`) whose
`outlets.main` getter consumes a private tracked storage, and calls
`applicationInstance.renderRootComponent(new RootOutlet(root))`. On later transitions it only
replaces the root's current chain and invalidates that storage
(`root-outlet.ts:94-115`). If the application instance was booted with
`shouldRender: false`, no rendering happens (`router.ts:787-790`).

### 8.3 The outlet protocol (`{{outlet}}` ≡ `<@outlet />`)

`{{outlet}}` is compiled to `<@outlet />` (§1.4(10)): it invokes whatever component value is in
the lexically enclosing template's `@outlet` argument. `@outlet` is supplied by the outlet
machinery to each route template (below). Therefore:

- `{{outlet}}` is meaningful only in a route template (or in a block lexically inside one,
  e.g. passed to a classic component: `utils-test.js:118-132`). In an ordinary component's
  own template `@outlet` is not supplied and nothing renders (see Q2).
- A block param named `outlet` shadows it (`refinements-test.js:19-21`).

The value of `@outlet` for a level whose parent state is `P` is a reactive computation
(`root-outlet.ts:206-244`):

```text
childOutlet(P) = let S = P.outlets.main in
                 S undefined → null  (renders nothing)
                 else → provider(S.bucket)   — cached per bucket (WeakMap), created from
                        S.manager.getRouteWrapper() the first time
```

The *provider* for a bucket is a component with template (`root-outlet.ts:129-136`)

```hbs
<this.component @Component={{this.state.invokable}} @bucket={{this.bucket}}
                @context={{this.state.context}} @outlet={{childOutlet(this.state)}} />
```

where `this.component` is the manager's *route wrapper* and `this.state` is the current
`OutletState` for that bucket, except that if the parent now points at a *different* bucket
the provider keeps reporting its **last** state for its own bucket (so an exiting level
continues to render its old content until it is torn down, `root-outlet.ts:142-163`).

Observable consequences:

- While the same route (same bucket) stays active, its level's component instance and DOM are
  preserved; only `@model` (context) and the invokable may change.
- Changing to a different route at a level tears down that level's subtree and renders a new
  one.
- The root outlet itself renders `{{this}}` where `this` is `childOutlet(root)`; it and the
  providers contribute no debug-render-tree nodes (§13).

### 8.4 Classic routes and route templates

The classic route manager's route wrapper (`route-managers/classic/outlet-component.ts:62-68`)
renders:

```hbs
<@Component @model={{@context}} @controller={{@bucket.controller}} @outlet={{@outlet}} />
```

and the invokable for a classic route (`classic/manager.ts:404-457`) is built from
`owner.lookup("template:" + (route.templateName || route.routeName))`:

1. If the registered value has a component manager (e.g. a template-tag component,
   `template()`, or a class — RFC `rfcs/text/1046-template-tag-in-routes.md`), it is invoked
   directly as a component with arguments `@model`, `@controller`, `@outlet`
   (`rendering-test.js:548-631`).
2. Else it must be a template factory (**[Dev]** otherwise:
   ``Failed to render the ${name} route, expected `template:${name}` to resolve into a component or a `TemplateFactory`, got: ${label}. Most likely an improperly defined class or an invalid module export.``);
   it is wrapped as a *route template* component: its `this` is the route's **controller**
   and it receives the arguments `@model`, `@controller`, `@outlet`
   (`component-managers/route-template.ts:38-122`). So both `{{this.model}}` (controller
   property) and `{{@model}}` work (`rendering-test.js:26-76`).
3. If no template is registered, a built-in template `<@outlet />` is used (the route is a
   pass-through), with the controller as `this`; **[Dev]** with `LOG_VIEW_LOOKUPS` an info
   message `Could not find "${name}" template. Nothing will be rendered` is logged.

The controller is created (idempotently) before the route renders (`classic/manager.ts:94-99`).
`@model` is the route's resolved model (the outlet state's `context`). A route template is
always a "fragment" (no wrapper element; `rendering-test.js:436-446`). The outlet level runs
under the route's owner (engine instance for routes in routable engines) and propagates the
enclosing classic `parentView` through (`outlet-component.ts:106-178`). Instrumentation
`render.outlet` with payload `{ object: "<route>:main" }` wraps each level's initial render.

### 8.5 `{{mount}}` and routeless engines

`{{mount "name" model=x}}` is compiled to `{{component (-mount "name" model=x)}}` (§1.4(10)).
`-mount` is a router keyword helper (§1.1) (`lib/syntax/mount.ts:63-118`):

```text
[Dev] owner present ("{{mount}} must be used within a component that has an owner")
[Dev] exactly one positional ("You can only pass a single positional argument to the {{mount}} helper, e.g. {{mount \"chat-engine\"}}.")
[Dev] only `model` named ("You can only pass a `model` argument to the {{mount}} helper, e.g. {{mount \"profile-engine\" model=this.profile}}. You passed <extra>.")
value (reactive on the name):
  name is a string:
      same as last time → same curried definition (identity stable)
      [Dev] owner.hasRegistration("engine:" + name) else "You used `{{mount '${name}'}}`, but the engine '${name}' can not be found."
      → curried component (MountDefinition(name), args {model})
  name null/undefined → null (renders nothing: an empty comment placeholder in the DOM, mount-test.js:172-242)
  otherwise [Dev] "Invalid engine name '${name}' specified, engine name must be either a string, null or undefined."
```

Rendering a mount definition (`component-managers/mount.ts:54-167`):

- On create: `owner.buildChildEngineInstance(name)` then `engine.boot()`; the engine's
  `controller:application` (or a generated one) is created — with `{ model }` if `model` was
  passed; the controller is `this` for the engine's `template:application`, which is looked up
  on the engine instance (dynamic layout).
- The engine instance becomes the owner for everything rendered inside (sub-owner capability).
- On update, if `model` was passed, `controller.set('model', currentModel)`.
- Changing the name tears down the old engine instance and boots a new one; the engine
  instance is destroyed with the invocation.

### 8.6 Engine owner boundaries

Components, helpers and modifiers inside an engine's templates resolve against the engine
instance (§5.2). LinkTo inside a routable engine namespaces route names with the mount point
(§7.4).

A value curried inside an engine, such as `(component X)` passed out to the host, captures
the engine instance as its owner (§05-8.2). When the host invokes it, the component's layout,
and helpers and modifiers created in it, use the engine owner, but the component manager's
`create` (and so a public manager's factory and `@glimmer/component`'s `owner`) receives
the host's owner (§05-7.8; open question §06-12 Q3). Curried helpers and modifiers use the
engine owner throughout.

---

## 9. Rendering entry points and the render loop

### 9.1 Renderers and roots

A *renderer* owns an environment (owner, document, `isInteractive`, `hasDOM`), a resolver, a
DOM tree-builder factory, and an ordered list of *roots* (`base-renderer.ts:228-402, 603-687`).

- Adding a root (`renderRoot`) appends it, registers the renderer in the global live-renderer
  list when it becomes non-empty, and synchronously runs a *render transaction* — unless the
  renderer is already inside one, in which case the new root is rendered by the ongoing
  transaction's loop and **the call returns before the root has rendered** (see Q9).
- A render transaction (`renderRoots`, `base-renderer.ts:320-368`) repeats: inside one runtime
  transaction (§05: modifiers installed / `didInsertElement`-class hooks run at its commit
  phase, §06-11), render (first time) or revalidate every non-destroyed root that existed at
  the start of the iteration; if roots were added during the iteration, loop again, in a new
  runtime transaction, which renders the new roots and revalidates the others. Destroyed roots
  are removed afterwards; if none remain the renderer is deregistered. The renderer records the
  "last validated" point in the reactivity timeline.
- A renderer is *valid* iff it is destroyed, has no roots, or no tracked storage has changed
  since its last validated point (the renderer's own `isValid` method, `base-renderer.ts:374-378`;
  not the **[Proposed]** primitive of §07-2.2.2).
- **[Dev]** If a render throws, that root's render function is replaced by one that only logs
  `Attempted to rerender, but the Ember application has had an unrecoverable error occur during render. You should reload the application after fixing the cause of the error.`
  (`errorLoopTransaction`, `base-renderer.ts:43-67`); the renderer is marked validated so it
  does not immediately retry.

### 9.2 Scheduling (Backburner run loop)

(`base-renderer.ts:153-218`, `environment.ts:22-41`)

- At the **begin** of every run loop, every live renderer schedules (once) a `revalidate` into
  the run loop's `render` queue.
- `revalidate` does nothing if the renderer is valid, otherwise runs a render transaction.
- When tracked storage is invalidated outside a run loop, the runtime's `scheduleRevalidate`
  hook calls `_backburner.ensureInstance()`, which starts an autorun, so a run loop (and thus
  revalidation) happens.
- At the **end** of every run loop: if any live renderer is invalid, a new run loop is joined
  immediately (causing another revalidation); after more than `ENV._RERENDER_LOOP_LIMIT`
  (default 1000) consecutive such loops, the offending renderer is destroyed and
  `Error('infinite rendering invalidation detected')` is thrown. When all renderers are valid,
  the pending `renderSettled` promise (if any) is resolved (inside a `join`).
- Destruction scheduling: the runtime's `scheduleDestroy(destroyable, destructor)` schedules
  into the `actions` queue and `scheduleDestroyed` into the `destroy` queue (chapter 05/07
  destruction ordering).

### 9.3 `renderComponent` (`@ember/renderer`)

`renderComponent(component, { into, owner = {}, env, args })` (`base-renderer.ts:459-593`):

- `component`: any value with a component manager.
- `into`: an `Element`, a `SimpleElement`, or a cursor `{ element, nextSibling }`.
- `owner`: any object (default: a fresh `{}`); used for injections, resolution of loose-mode
  names (§5), and lifetime: the render result is associated as a destroyable child of the
  owner, so destroying the owner destroys the render (`render-component-test.ts:112-282`).
- `env.isInteractive` (default `true`), `env.hasDOM` (default `true`), `env.document`
  (default `globalThis.document`); other keys are forwarded (private).
- `args`: an object whose properties become the component's named arguments; reads are
  reactive if the object's properties are tracked (e.g. `trackedObject`, getters reading
  tracked state: `render-component-test.ts:438-465, 578-650`).

Algorithm:

```text
renderer = per-owner cached renderer, or create one: BaseRenderer.strict(owner, document, env)
           (ResolverImpl, client DOM builder); a renderer set via setRenderer(owner, r) is reused
key = into.element if cursor else into
existing = cache[key];  existing?.destroy()           // destruction is asynchronous
if no existing and `into` is a real DOM Element: into.innerHTML = ''     // first time only
target = existing had a render result ? { element: key, nextSibling: existing.firstNode() } : into
root = renderer.render(component, { into: target, args })   // renders synchronously unless inside a transaction (§9.1)
associate root's result with owner; cache[key] = { result, glimmerResult }
return { destroy(): destroys the render result (clears its DOM) }
```

Observable details pinned by tests (`render-component-test.ts`):
- Existing children of `into` are removed on the first render into a DOM element
  (`:546-576`).
- Rendering again into the same element inserts the new content *before* the previous
  content and destroys the previous render (`:747-917`, including the quirks listed in Q9).
- Multiple `renderComponent` roots with the same owner share one renderer and therefore one
  render loop/reactivity (`:651-746`). Rendering into a detached element works (`:485-545`).
- Modifiers may call `renderComponent` (`:466-484`); `captureRenderTree` includes these roots
  regardless of owner (`:126-199`).
- `{{mount}}` is not available (§1.1).

### 9.4 Application rendering

- The application registers `renderer:-dom` = `Renderer.create()` (`setup-registry.ts:37`),
  whose constructor looks up `service:-document`, `-environment:main` (`isInteractive`,
  `hasDOM`), `template:-root`, `service:-dom-builder`, uses a `RouterResolver`, and the view
  registry `-view-registry:main` (`renderer.ts:182-212`).
- `service:-dom-builder` selects the tree builder by `-environment:main`'s `_renderMode`:
  `"serialize"` (SSR with rehydration markers), `"rehydrate"` (rehydrate existing server
  DOM), otherwise client rendering (`setup-registry.ts:16-33`). Rehydration semantics are
  chapter 05.
- `ApplicationInstance.renderRootComponent(c)` calls `setRenderer(instance, renderer:-dom)` and
  then `renderComponent(c, { into: { element: rootElement, nextSibling: null }, owner: instance })`
  (`packages/@ember/application/instance.ts:145-151`). Because `into` is a cursor, existing
  `rootElement` content is **not** cleared; route content is appended to it.
- The event dispatcher is set up only when `isInteractive` (`instance.ts:120-122`; §12).

### 9.5 `renderSettled` (`@ember/renderer`)

`renderSettled()` returns a promise resolved at the end of the first run loop in which all
live renderers are valid (§9.2). Repeated calls before resolution return the *same* promise.
If there is no current run loop, calling it schedules a no-op in the `actions` queue so that a
run loop occurs (`base-renderer.ts:174-197`, tests `render-settled-test.js:11-74`).

### 9.6 Dynamic scope

Ember's dynamic scope object (`renderer.ts:66-92`) carries `view` (the nearest classic
component, §6.8) and `outletState`. **[Dev]** `-get-dynamic-scope` / `-with-dynamic-scope`
(private keywords) with any key other than `outletState` assert
``Using `-get-dynamic-scope` is only supported for `outletState` (you used `${key}`).``.

---

## 10. Global-context hooks supplied by Ember

The runtime depends on a small set of host hooks (the "global context", §05/§07). Ember's
implementation (`environment.ts:22-89`) defines template-observable behaviour:

### 10.1 Truthiness (`toBool`)

Used by `if`, `unless`, `and`, `or`, `not`, `{{#if}}` inline forms, etc.
(`lib/utils/to-bool.ts:8-22`):

```text
toBool(v):
  if v is an Ember proxy (ObjectProxy/ArrayProxy):
      consume storage (v, 'content'); return Boolean(get(v, 'isTruthy'))
  if isArray(v):                         // Ember isArray, below
      consume storage (v, '[]'); return v.length !== 0
  if v is TrustedHTML (has toHTML()):     return Boolean(v.toString())
  return Boolean(v)
```

Ember `isArray` (`packages/@ember/array/lib/is-array.ts`): false for falsy values and for
objects with a `setInterval` property (windows); true for native arrays, Ember arrays, values
whose `typeOf` is `'array'`, and plain objects (`typeOf === 'object'`) with a numeric,
non-NaN `length`. Consequently `[]`, `A()`, an empty `ArrayProxy`, `{ length: 0 }`, and
`htmlSafe('')` are **falsy**; `"0"`, `{}` are truthy; `0`, `""`, `NaN` falsy.

### 10.2 Iteration (`toIterator`)

For `{{#each}}` (after the runtime's own fast path for native arrays) and `{{#each-in}}`
(§2.13) (`lib/utils/iterator.ts:12-52`):

```text
toEachIterator(v):
  not an object/function → empty
  native array           → items, memo = index
  Ember array            → objectAt(i) for i < length, memo = index
  has Symbol.iterator    → iterator values, memo = position
  has forEach            → collected values, memo = index
  otherwise              → empty  (renders {{else}})
```

Length 0 is empty. Iteration happens during evaluation, so `objectAt`/property reads are
consumed.

### 10.3 Property access

- Template path segments (`this.a.b`, `@x.y`) read with Ember `_getProp`
  (`property_get.ts:100-138`): `null`/`undefined` parent → `undefined`; object/function parent →
  `obj[key]`, falling back to `obj.unknownProperty(key)` when the value is `undefined`, `key`
  is not `in` obj, and `unknownProperty` is a function; consumes storage `(obj, key)` and, if the
  value is an array/Ember array, its `[]` storage; primitives → `prim[key]` (no consumption).
  **[Dev]** mandatory-setter/proxy checks may assert for proxies accessed without `get`.
- Path writes (two-way bindings, `mut`, `Input`) use Ember `_setProp`
  (`property_set.ts:70-106`): computed setters are invoked; `setUnknownProperty` is used when
  the key is absent; otherwise assign and `notifyPropertyChange(obj, key)` if the value
  changed.
- `get` helper paths use full Ember `get`/`set` with dotted-path support (§2.5).

### 10.4 Assertions and deprecations

- `assert(test, msg, {id})` → Ember `assert` in DEBUG (with a currently empty override table).
- `deprecate(msg, test, {id})` → Ember `deprecate` using an override table; **[Dev]** an id not
  in the table throws `deprecation override for ${id} not found`. The special id
  `argument-less-helper-paren-less-invocation` instead throws
  ``A resolved helper cannot be passed as a named argument as the syntax is ambiguously a pass-by-reference or invocation. Use the `{{helper 'foo-helper}}` helper to pass by reference or explicitly invoke the helper with parens: `{{(fooHelper)}}`.``
  (`environment.ts:66-88`).
- **[Dev]** Backtracking re-render ("you updated X after it was consumed") message:
  ``You attempted to update `${key}` on `${debugName(obj)}`, but it had already been used previously in the same computation.  Attempting to update a value after using it in a computation can cause logical errors, infinite revalidation bugs, and performance issues, and is not supported.``
  (note two spaces; `environment.ts:91-101`), followed by the render-tree path
  (`rendering-test.js:472-523`).

### 10.5 Destruction scheduling

See §9.2.

### 10.6 Style XSS warning **[Dev]**

For a dynamic `style` attribute value that is not `null`/`undefined`/TrustedHTML, Ember warns
(id `ember-htmlbars.style-xss-warning`):
`Binding style attributes may introduce cross-site scripting vulnerabilities; please ensure that values being bound are properly escaped. For more information, including how to disable this warning, see https://deprecations.emberjs.com/v1.x/#toc_binding-style-attributes. Style affected: "<value>"`
(`environment.ts:43-54`, `views/lib/system/utils.ts:24-35`). The check runs on every initial
application and update of a dynamic, non-triple-curly `style` (§05-4.5.3). Quoted
`style="{{x}}"` is first converted to unquoted (§1.4(1)), so a `TrustedHTML` `x` does not warn.
`style="a {{x}}"` is a real concatenation. Its value is a plain string, so it warns unless every
part is `null`/`undefined` (`packages/@glimmer/runtime/lib/vm/attributes/dynamic.ts:31-33,254-266`;
verified that it compiles to an ordinary dynamic attribute).

### 10.7 Debug tooling flag

`enableDebugTooling` (debug render tree, §13) is `ENV._DEBUG_RENDER_TREE`, which defaults to
`true` in DEBUG builds and `false` in production (settable via `EmberENV` before load)
(`environment.ts:129`, `packages/@ember/-internals/environment/lib/env.ts:62-87`).

---

## 11. Trusted HTML (`@ember/template`)

Source `lib/utils/string.ts:40-225`.

- `trustHTML(str)` (alias `htmlSafe`): `null`/`undefined` → `''`; non-strings → `String(str)`;
  returns a `TrustedHTML` instance with `toString()` and `toHTML()` both returning the string.
  `SafeString` is an alias of the class (type-only export publicly).
- `isTrustedHTML(v)` (alias `isHTMLSafe`): `v !== null && typeof v === 'object' && typeof v.toHTML === 'function'`
  — duck-typed, so any object with a `toHTML` method is treated as trusted by the runtime.
- In content position (`{{v}}`) a trusted value is inserted as HTML (parsed), not text
  (`curly-components-test.js:1164-1197`); in attribute position its `toString()` is used; as a
  `style` value it suppresses the XSS warning; it is falsy iff its string is empty (§10.1).
  Chapter 05 defines the insertion semantics.

---

## 12. Classic event dispatcher **[Legacy]**

Source `packages/@ember/-internals/views/lib/system/event_dispatcher.ts`. Only relevant to
classic components' event-handler *methods* (§6.9); `{{on}}` uses native listeners directly.

### 12.1 Setup

When an interactive application instance boots, the dispatcher `setup(customEvents, rootElement)`:

- event map = default map ∪ `Application.customEvents` (a `null` value disables an event):

  ```text
  touchstart→touchStart touchmove→touchMove touchend→touchEnd touchcancel→touchCancel
  keydown→keyDown keyup→keyUp keypress→keyPress mousedown→mouseDown mouseup→mouseUp
  contextmenu→contextMenu click→click dblclick→doubleClick focusin→focusIn focusout→focusOut
  submit→submit input→input change→change dragstart→dragStart drag→drag dragenter→dragEnter
  dragleave→dragLeave dragover→dragOver drop→drop dragend→dragEnd
  ```
- root element: the given element/selector, else `'body'`; **[Dev]** assertions for a missing
  root, reuse, nesting inside/around another application
  (`You cannot use the same root element (${x}) multiple times in an Ember.Application`, etc.);
  the class `ember-application` is added to it (and removed on destroy).
- Listeners are **lazy**: for each event, a single listener on the root element is added the
  first time a component class whose prototype has a function for the mapped method name is
  instantiated, or when `component.on(<method name>)` is called (`event_dispatcher.ts:196-293`,
  `component.ts:923-944,1019-1031`).

### 12.2 Dispatch

On a DOM event of type `e` at the root element:

```text
target = event.target
loop while target is an Element:
    view = the classic component whose wrapper element is `target` (if any)
    if view:
        if view is in hasElement/inDOM state and has the method or an Evented listener for methodName:
            result = run-loop-join( sendCoreViewEvent(view, methodName, [event]) )   // instrumented as `interaction.<method>`
        else result = true
        if result === false: event.preventDefault(); event.stopPropagation(); stop
        else if event.cancelBubble (stopPropagation called): stop
    target = target.parentNode
```

So handlers bubble through ancestor classic components' elements (including form elements,
`event-dispatcher-test.js:198-219`), returning `false` stops and prevents default, and
handlers run inside a run loop (`:362-396`).

---

## 13. Debug render tree

When debug tooling is enabled (§10.7), the runtime maintains a tree of render nodes for
Ember Inspector; `captureRenderTree(app)` from `@ember/debug` returns the concatenated
captured trees of **every live renderer** (applications and `renderComponent` roots;
the `app` argument is ignored) (`packages/@ember/debug/lib/capture-render-tree.ts:24-34`).
**[Dev]** accessing a renderer's tree when disabled asserts
`Attempted to access the DebugRenderTree, but it did not exist. Is the Ember Inspector open?`.

Each captured node is `{ id, type, name, args: { positional, named }, instance, template?, bounds: { parentElement, firstNode, lastNode }, children }`
(generic shape in `packages/@glimmer/runtime/lib/debug-render-tree.ts:60-200`, §05/§06).
Ember-specific node types and names (`tests/integration/application/debug-render-tree-test.ts`):

| Construct | Nodes |
|---|---|
| root outlet, outlet providers | none (they return an empty custom render tree) |
| each route level | `{ type: 'outlet', name: 'main', instance: undefined, args: {positional:[],named:{}} }` containing `{ type: 'route-template', name: <route name>, args: { named: { model, controller, outlet? } }, instance: <controller> }` for template-factory routes; a component-valued route template appears as a `component` node |
| outlet level entering a routable engine | additional `{ type: 'engine', name: <mountPoint>, instance: <engine instance> }` |
| `{{mount}}` | `{ type: 'engine', name, instance: engine }` then `{ type: 'route-template', name: 'application', instance: controller }` |
| classic / Glimmer / custom / template-only components | `{ type: 'component', name: <debug name> }` — classic name is the factory `fullName`/`normalizedName`/class name (`curly.ts:371-375`) |
| `Input`, `Textarea`, `LinkTo` | `component` nodes named `Input`/`Textarea`/`LinkTo` |
| modifiers (e.g. `on`) | `{ type: 'modifier', name }` |
| `(element "t")` | component named `(element "t")` |

For debug labels in the backtracking message (§10.4) the outlet providers are named
`{{outlet}} for <route>` and a route level's component `@Component`
(`root-outlet.ts:184-186`, `rendering-test.js:494-503`).

---
## 14. Open questions / inconsistencies

**Q2. `{{outlet}}` outside route templates.** `{{outlet}}` is now `<@outlet />`, i.e.
lexically scoped to the enclosing template's `@outlet` argument. Historically `{{outlet}}` was
dynamically scoped (it worked inside any component rendered by a route template). A component
template containing `{{outlet}}` now silently renders nothing; and a component passed `@outlet`
explicitly could render the outlet anywhere. Also, `@outlet` is visible as an ordinary named
argument (e.g. `{{#if @outlet}}`), which is new surface.
*Confirmed regression.* The change came with the route manager merge (`4b5d79a6d7d1b`,
emberjs/ember.js#21460), which changed `transform-wrap-mount-and-outlet` from
`{{component (-outlet)}}` (which read the outlet state from the dynamic scope) to `<@outlet />`.
Branch `test/outlet-inside-component` (tracked in emberjs/ember.js#21640) adds tests for
`{{outlet}}` inside a template-only and a classic component rendered by the application
template: both pass at `4b5d79a6d7d1b^1` and fail at `4b5d79a6d7d1b` and on current `main`,
where the outlet renders as an empty comment. Whether to restore the dynamically scoped
behavior is open.

**Q4. `element` with `null`/`undefined`.** The public docs say "When `@tagName` is `null` or
`undefined`, nothing is rendered" (`packages/@ember/helper/index.ts:674-675`), but the
implementation asserts in DEBUG (tests `element-test.js:27-56` expect a throw). In production,
`null` produces a definition whose tag is `null`, which renders the block *without* a
wrapper (same as `""`), not nothing. The three behaviours disagree.

**Q6. `(helper "name")` in loose mode bypasses classic-helper factory handling.**
`-resolve` returns `factoryFor(...).class` (`-resolve.ts:42`), whereas `lookupHelper`
returns the *factory* for classic `Helper` subclasses so injections apply
(`resolver.ts:160-183`). A classic helper obtained via `(helper "x")` is therefore created with
`Class.create(ownerInjection)` rather than through the container. Untested.

**Q8. Curly `{{input}}`/`{{textarea}}`/`{{link-to}}` and HTML attributes.** Internal
components ignore unsupported named arguments, so `{{input placeholder="x" disabled=true}}`
drops them silently (curly invocations cannot pass attributes). The `Textarea` doc comment
still refers to a list of "attributes mapped onto arguments" that no longer exists
(`textarea.ts` docs), and the `Input` docs show `<Input @id="input-name">`, but `@id` is
ignored (the element gets the default guid id). No test covers these.

**Q9. `renderComponent` during a render transaction.** When `renderComponent` is called
while the target renderer (same owner) is already rendering (e.g. from a getter or modifier
during render), `renderRoot` defers the new root and `root.result` is `undefined` at return
(`base-renderer.ts:282-318`, `568-587`). Consequently the returned `destroy()` is a no-op,
the "replace previous render into the same element" logic sees no previous render, and both
renders remain live — which is exactly what `render-component-test.ts:791-917` asserts
("appear as siblings", with a comment calling the resulting order "kinda bonkers"). The
source comment claims "Replace all contents". The intended semantics are unclear.

**Q10. `this.attrs` deprecation past its `until`.** `attrs-arg-access` has `until: '6.0.0'`
but is still emitted (and rewritten) in 7.x (`assert-against-attrs.ts:52-72`).

**Q12. Class attribute ordering on classic wrappers.** The order in which `class`
contributions are set (§6.3) is deterministic in the implementation but tests compare class
lists order-insensitively (`classes()` helper). Whether the final `class` string order is
part of the contract is unspecified.

**Q13. `setting-on-hash` deprecation override** remains in `environment.ts:107-120` with
`until: '4.4.0'`, but nothing emits it; dead code.

**Q14. Asynchronous route invokables.** The classic route manager always returns a promise
for the invokable (`classic/manager.ts:217-219`), so each outlet level renders one microtask
(RSVP turn) after its `OutletState` is created, after initially rendering nothing. Whether any
code can observe the empty intermediate state (e.g. `didInsertElement` of a parent level
before the child exists) is not tested.

**Q15. `{{mount}}` null placeholder.** A null engine name renders an empty comment
(`<!---->`, `mount-test.js:217-241`). This is the generic "dynamic component is null"
behaviour of §05; implementations must preserve the comment only if DOM-shape compatibility
at that level is required.

**Q16. Free identifiers as values in loose mode.** `{{foo bar}}` compiles `bar` as a
*strict keyword* lookup even in loose mode (verified: `[28,[35,0],[[31,1]],null]`), so a
non-keyword `bar` fails at runtime in DEBUG with a message that mentions "strict mode
template" even though the template is loose (`resolution.ts:425-454`). In production the
failure mode is unspecified. §03-5.3 explains why arguments get `Strict` resolution; whether
this should instead be a compile-time error is open.
