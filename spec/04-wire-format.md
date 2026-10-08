# 04 — The Wire Format

**This chapter is informative.** It documents the *current* wire format: the serialized,
precompiled form of a template that the build step (the template compiler) emits and the
runtime consumes. Wire format is not a compatibility requirement (§00-0.2): Ember makes no
guarantee that it is stable across versions, and addons ship template source, not wire
format. Nothing in this chapter is a conformance requirement on an implementation; where it
says "the consumer does X" it describes what the current runtime does. It documents


- the outer serialized template object and the JavaScript expression it is shipped in
  (§4.2);
- the template factory function that wraps it, including scope evaluation and per-owner
  caching (§4.3);
- the template block, its symbol tables and inline blocks (§4.4);
- the shared sub-encodings (arguments, paths, named blocks, attribute and tag names)
  (§4.5);
- every expression opcode (§4.6) and every statement opcode (§4.8), with numeric value,
  tuple layout, meaning of each field, source construct that produces it, and the
  semantics the current consumer implements;
- how names in a *callee's* symbol table bind the caller's arguments and blocks (§4.9);
- the version history of wire-visible changes (§4.11);
- worked examples with exact compiler output (§4.12).

Detailed runtime behavior (what "append a value", "invoke a component", "iterate" etc.
*do*) lives in `05-runtime-semantics.md`; this chapter describes each construct at the
level needed to map it onto those semantics, and cites §05 for the rest. Resolution of
free names against the owner is described in `08-ember-integration.md`; how names are
classified at compile time is `03-static-semantics.md`.

Throughout, "consumer" means the runtime that accepts wire-format input; "producer" means
the template compiler that emits it.

*Note:* In the current implementation the consumer is `@glimmer/opcode-compiler`, which
lazily translates each wire-format block into VM bytecode the first time it is needed
(`packages/@glimmer/opcode-compiler/lib/compilable-template.ts:68-111`). A new
implementation need not consume this format at all (it could, for example, compile
template source directly to JavaScript functions). Where the current consumer's bytecode
strategy leaks into observable behavior it is called out explicitly.

---

## 4.1 Status and scope

### 4.1.1 What the wire format is for

The wire format is the output of `precompile()` (`packages/@glimmer/compiler/lib/compiler.ts:121-161`),
wrapped by Ember's `precompile` (`packages/ember-template-compiler/lib/system/precompile.ts:19-24`),
which is what `babel-plugin-ember-template-compilation` calls when `targetFormat` is
`'wire'` (the default) (`babel-plugin-ember-template-compilation/src/plugin.ts:480-486`).
The runtime `template()` function from `@ember/template-compiler` also produces it at
runtime and immediately feeds it to the template factory
(`packages/@ember/template-compiler/lib/template.ts:236-253`).

### 4.1.2 There is no version marker

The serialized template carries **no version field**, and the runtime performs **no
version check**: `templateFactory` destructures `id`, `moduleName`, `block`, `scope` and
`isStrictMode` and does nothing else to validate them
(`packages/@glimmer/opcode-compiler/lib/template.ts:44-50`). Unknown opcodes are not
detected up front; the current consumer dispatches through a table and fails with a
`[BUG]`-style assertion (DEV) or a `TypeError` (prod) when it hits an opcode with no
handler (`packages/@glimmer/opcode-compiler/lib/syntax/compilers.ts:33-40`).

The maintainers treat the format as *version-locked*: "The wire format is version-locked
(templates must be compiled by the matching compiler), so removing never-emitted opcodes
is safe" (commit `b6e26a9e69`, "Remove dead opcodes").

### 4.1.3 Status: informative, not a compatibility surface

Wire format is not a compatibility requirement (§00-0.2; STATUS decision). Nothing in this
chapter obliges an implementation to accept any wire-format input, current or historical.
In practice, wire-format templates reach a running application in three ways:

1. Compiled by the application's own build, with the `ember-template-compiler` that ships
   in the application's own `ember-source`. This is by far the dominant path (v2 addons
   publish `precompileTemplate(...)` calls in *hbs* format, and v1 addons have their
   templates compiled by the host application's build).
2. Compiled at runtime by `@ember/template-compiler`'s `template()` (same version by
   construction).
3. Genuinely pre-built wire output published inside an npm package and executed by a
   *different* `ember-source` version. The current runtime does not support this
   reliably (§4.11 lists shapes that break).

Because addons ship template source, what *is* part of the compatibility surface is the
source-level path, including the babel plugin's `hbs` re-printing (§02-10). Descriptions
below of shapes that the current producer emits (§4.2 to §4.10), of the legacy scope-array
form (§4.3.3, **[Legacy]**), and of historical shapes (§4.11) are documentation of current
and past behavior only. The current runtime accepts the scope-array form, and does not
support the opcodes of §4.11.4.

*Note:* The alternative "compact string encoding" described in
`packages/@glimmer/compiler/lib/wire-encoding.md` is an unimplemented proposal. No
producer emits it and no consumer reads it. It is **out of scope**.

### 4.1.4 JSON-ness

Everything inside the template block (§4.4) is JSON: arrays, strings, finite numbers,
booleans, `null` and plain objects (the last only in `Debugger`, §4.8.18). The block is
shipped *as a JSON string* (§4.2) and parsed with `JSON.parse`
(`packages/@glimmer/opcode-compiler/lib/template.ts:64-66`). Consequently JavaScript
`undefined` never survives inside a block: a producer-side `undefined` in array position
becomes `null`, and trailing optional elements are omitted instead. The current
consumer treats a *missing* trailing element and (where noted) `null` identically, and
does not distinguish `undefined` from absence inside a block.

---

## 4.2 The serialized template object

### 4.2.1 Shape

```ts
interface SerializedTemplateWithLazyBlock {
  id?: string | null;            // opaque identifier
  block: string;                 // JSON text of a SerializedTemplateBlock (§4.4)
  moduleName: string;            // for diagnostics
  scope?: (() => Record<string, unknown>) | null;  // lexical scope thunk (§4.3.3)
  isStrictMode: boolean;
}
```

(`packages/@glimmer/interfaces/lib/compile/wire-format/api.d.ts:387-393`)

`precompile()` returns this object *as JavaScript source text*, not as a value
(`packages/@glimmer/compiler/lib/compiler.ts:121-161`):

- `id` is `idFn(JSON.stringify(options.meta) + blockJSON)`. The default `idFn` is the
  first 8 characters of the base64 SHA-1 of that string when a Node-style `require('crypto')`
  is available, and otherwise returns `null` (`compiler.ts:30-62`, `131`). Hosts may pass
  their own `id` option.
- `block` is `JSON.stringify(block)` — a **string**, so the object literal contains the
  block JSON doubly encoded (`compiler.ts:129`).
- `moduleName` is `options.meta.moduleName` or the literal `'(unknown template module)'`
  (`compiler.ts:133`).
- `scope` is present only if the template used at least one lexical (template-local)
  name. It is emitted as an arrow function returning an object literal whose properties
  are the used names in order of first use; `this` is written `"this":this` because it
  cannot be a shorthand property (`compiler.ts:140-158`). Example:
  `"scope":()=>({on,Card})`. When no lexical names are used the property is *deleted*
  (`compiler.ts:140-142`), not set to `null`.
- `isStrictMode` is `options.strictMode ?? false` (`compiler.ts:137`).

Because `scope` is a real function, the result is not JSON; it is a JavaScript
expression meant to be embedded in a module (and the identifiers inside `scope` are real
JavaScript references to the enclosing module scope).

Example (loose mode, no lexical names):

```js
{"id":"UpvSVFJy","block":"[[[10,0],[12],[1,[30,0,[\"x\"]]],[13]],[],[\"div\"]]","moduleName":"demo.hbs","isStrictMode":false}
```

### 4.2.2 Field semantics for consumers

| Field | Required | Current consumer behavior |
|---|---|---|
| `block` | yes | Is a string; parsed lazily (on the first factory call) and the parse result shared by all templates produced by that factory (`template.ts:58-66`). Passing an already-parsed array is not supported by the current runtime (`JSON.parse` of a non-string coerces it to a string and throws). |
| `id` | no | If falsy, the factory synthesizes `"client-" + n` from a module-global counter (`template.ts:53`). Exposed as `factory.__id` and `template.id` (`template.ts:99`, `117-119`). Not otherwise used. |
| `moduleName` | yes | Exposed as `factory.__meta = { moduleName }` and `template.moduleName`/`template.referrer.moduleName` (`template.ts:100`, `113-128`); used in error messages and debug tooling. |
| `scope` | no | See §4.3.3. `undefined`, `null` and absent are equivalent. |
| `isStrictMode` | yes | Selects strict-mode behaviors at runtime (§4.10). Absent is treated as falsy. |

`factory.__id`, `factory.__meta`, `template.id` and `template.referrer` are documented in
source as intimate APIs kept "for backwards compatibility, some addons use these"
(`template.ts:25-37`). The current factory exposes them. **[Legacy]**

### 4.2.3 The shipped module form

`babel-plugin-ember-template-compilation` (wire target) replaces a template with

```js
import { createTemplateFactory } from '@ember/template-factory';
createTemplateFactory(/* <precompile() output> */)
```

and, for the RFC 931 `template()` form, additionally wraps it as
`setComponentTemplate(createTemplateFactory(...), backingClassOrTemplateOnly())`
(`babel-plugin-ember-template-compilation/src/plugin.ts:500-517`). The import source and
name can be overridden via `outputModuleOverrides` (`plugin.ts:640-648`). After insertion
the plugin renames identifiers inside the `scope` function when the template-side name
differs from the JavaScript binding (`plugin.ts` `remapAndBindIdentifiers`), so the
property *keys* of the scope object are template names while the *values* are the
JavaScript bindings.

`@ember/template-factory` re-exports the Glimmer template factory unchanged as
`createTemplateFactory` (`packages/@ember/template-factory/index.ts:1`). Compiled
code in the wild imports this module specifier and export name; since wire format is not
a compatibility requirement (§4.1.3), this is a description of the current shipped form,
not a requirement.

---

## 4.3 The template factory

### 4.3.1 `createTemplateFactory(serialized) → factory`

`createTemplateFactory` takes a `SerializedTemplateWithLazyBlock` and returns a function
`factory(owner?)` (`packages/@glimmer/opcode-compiler/lib/template.ts:44-103`). Creating
the factory does not parse the block, call `scope`, or touch the owner; all of that is
deferred.

*Rationale:* modules evaluate `createTemplateFactory(...)` at import time, and the
`scope` thunk may reference bindings (e.g. classes declared later in the module) that are
still in their temporal dead zone at that point.

### 4.3.2 `factory(owner?) → template`

- Calling `factory()` with `owner === undefined` returns a single *ownerless* template,
  created on first call and cached for the lifetime of the factory (`template.ts:68-84`).
- Calling `factory(owner)` returns a template cached per owner in a `WeakMap` keyed by
  the owner object (`template.ts:86-96`). Repeated calls with the same owner return
  the identical template object.
- Every template produced by one factory shares the same parsed block (`template.ts:58`,
  `64-66`).

The template object has (`template.ts:105-142`):

- `result: 'ok'` (a marker the runtime's `unwrapTemplate` checks);
- `id`, `moduleName`, `referrer: { moduleName, owner }`;
- `asLayout()` — the template as a component layout / render root (memoized);
- `asWrappedLayout()` — the template wrapped in the component's own element, used for
  components whose manager has the `wrapped` internal capability (classic curly
  components with a `tagName`) (memoized). See §4.9.4.

The *owner* bound to a template is used for two things: resolving loose-mode free names
(§4.7) and as the owner associated with lexically-scoped component definitions
(`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/resolution.ts:104-121`).
Resolving a free name in an ownerless template is a **[Dev]** error "Attempted to resolve
a component, helper, or modifier, but no owner was associated with the template it was
being resolved from" (`resolution.ts:60-76`).

*Note:* Who calls the factory, and with which owner, is host behavior. For components the
current runtime calls `templateFactory(owner)` when it first builds a component
definition and caches that definition per definition object, not per owner
(`packages/@glimmer/program/lib/constants.ts:176-235`, call at `:205`). See Open
question 4.

A component with no associated template and without the `dynamicLayout` capability uses a
built-in default template whose block is `[[[18,1,null]],["&default"],[]]` — i.e. just
`{{yield}}` — with `isStrictMode: true`
(`packages/@glimmer/program/lib/util/default-template.ts:7-16`,
`packages/@glimmer/program/lib/constants.ts:38`, `205`).

### 4.3.3 The `scope` thunk and lexical values

When a template is first turned into a layout, the consumer calls `scope()` **once per
template object** (i.e. once per owner per factory) and derives
(`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/shared.ts:108-124`):

```
record       = scope?.() ?? null
lexicalNames = record ? Object.keys(record)   : undefined   // for diagnostics only
lexicalValues= record ? Object.values(record) : null
```

A `GetLexicalSymbol` index `n` (§4.6.4) denotes `lexicalValues[n]`. **Only the order of
values is semantically significant**; names are used only in error messages and debug
tooling (e.g. `lexical?.at(n)` as a debug name, `resolution.ts:119`, `215`).

Current behavior (the timing is specified normatively in §01-1.8.5):

- The consumer calls `scope` lazily (not before the template is first needed for
  rendering) and, on the ordinary path, calls it once per template object for the purpose of
  capturing lexical values. The captured values are then *constants*: later reassignment
  of the underlying JavaScript binding is not observed.
  *Note:* the wrapped-layout path of the current implementation calls `meta()` (and so
  `scope()`) in both its constructor and `compile()` (`packages/@glimmer/opcode-compiler/lib/wrapped-component.ts:49`, `55`); see Open question 4.
- **[Legacy]** A `scope` that returns an **array** `[v0, v1, …]` is accepted, with
  `lexicalValues` = the array elements in order. Producers before commit `9498833de2`
  (Ember ≤ 6.11) emitted `()=>[a,b]` (`git show 9498833de2 -- packages/@glimmer/compiler/lib/compiler.ts`).
  The current runtime accepts it by accident: `Object.values([a,b])` is `[a,b]` and
  `Object.keys` yields `"0","1"`.
- The producer emits object keys that are JavaScript identifiers (or `"this"`). Integer-like
  keys would be reordered by `Object.values`; the producer never emits them, and
  the consumer assumes they do not occur.

**[Legacy]** Before commit `3cd64941e8` (Ember < 7.1), a fourth element `lexicalSymbols`
(an array of names) could appear in the block (§4.4.1). It was only a debug aid; the current
consumer ignores any elements of the template block beyond the third.

---

## 4.4 The template block

### 4.4.1 `SerializedTemplateBlock`

```ts
type SerializedTemplateBlock = [
  statements: Statement[],   // §4.8
  symbols:    string[],      // local symbol names, slot = index + 1
  upvars:     string[],      // free-name table
];
```

(`packages/@glimmer/interfaces/lib/compile/wire-format/api.d.ts:364-368`; produced at
`packages/@glimmer/compiler/lib/passes/2-encoding/index.ts:10-13`)

### 4.4.2 Symbols (local slots)

A template has a single flat frame of *slots* numbered from 0:

- Slot **0** is always `this` (the component instance / render context "self"). It has no
  entry in `symbols`. `{{this}}` encodes as `[30,0]`
  (`packages/@glimmer/compiler/lib/passes/2-encoding/expressions.ts:32-33`).
- Slot **k ≥ 1** is named `symbols[k-1]` (`packages/@glimmer/syntax/lib/symbol-table.ts:75`,
  `169-172`).

Symbols are allocated in order of first encounter during compilation, from one counter
shared by the whole template, *including* all nested inline blocks
(`symbol-table.ts:46-49`, `244-246`). There are three kinds, distinguished by spelling:

| Spelling | Meaning | Allocated when |
|---|---|---|
| `@name` | the named argument `@name` of this template's component | first reference to `@name` (`symbol-table.ts:145-153`) |
| `&name` | the block (named block) `name` passed to this template's component; `&default`, `&else`, `&attrs`, `&header`, … | first `{{yield to=…}}`, `(has-block …)`, `(has-block-params …)`, or `...attributes` referring to it (`symbol-table.ts:155-167`) |
| anything else | a block parameter (`as \|x\|`) of some inline block in this template | when that block's parameters are declared (`symbol-table.ts:46-49`) |

The block name `inverse` is normalized to `else` in symbol names (`&else`)
(`symbol-table.ts:156-158`) and in named-block lists (§4.5.4).

Two different block parameters with the same source name in different blocks receive
*different* slots (each declaration allocates). Example:
`{{#each-in @obj as |k v|}}` yields `symbols = ["@obj","v","k"]` after Ember's
`each-in` rewrite (§4.12.5).

**Semantics.** Symbol names matter in two ways:

1. Within the template, only slot numbers matter; the current consumer ignores names.
2. When this template is the **layout of a component**, the caller binds named arguments
   and blocks into the callee's slots **by name**, by searching the callee's `symbols` for
   `"@argName"` and `"&blockName"` (§4.9). The current consumer therefore relies on the
   names of `@…` and `&…` symbols of every layout being preserved.

The number of slots of a layout is `symbols.length + 1`
(`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/shared.ts:122`,
`packages/@glimmer/runtime/lib/compiled/opcodes/component.ts:853`).

### 4.4.3 Upvars (the free-name table)

`upvars` lists every *free* name (a name not bound by a block parameter, not an `@arg`,
not `this`, and not a lexical template local) referenced by the template, deduplicated by
exact string, in order of first allocation (`symbol-table.ts:124-143`). Opcodes
`GetStrictKeyword` (31) and `GetFreeAs*` (35, 37, 38, 39) carry an index into this table
(§4.6.3, §4.6.5).

Notes on the current encoding:

- **Angle-bracket component names are already normalized.** When a free name is used as
  an angle-bracket component tag in loose mode, the producer applies the host's
  `customizeComponentName` *before* storing it (`symbol-table.ts:125-132`). Ember's
  customization dasherizes and maps `::` to `/` (`<XFoo />` → `"x-foo"`,
  `<Foo::BarBaz />` → `"foo/bar-baz"`; §4.12.4). The consumer uses the stored string
  as-is.
- **Deduplication is by string only, across roles.** `<div {{foo}}></div><Foo />` stores a
  single `"foo"` used both as a modifier head and as a component head (§4.12.4). The
  *opcode* at the use site, not the table, determines how the name is resolved.
- **Keywords and plain element names appear too.** The producer records every keyword it
  consumed (`"if"`, `"each"`, `"yield"`, `"let"`, `"debugger"`, `"component"`, …) and, in
  loose mode, the tag name of every plain HTML element (`"div"`, `"h1"`, `"input"`)
  (`packages/@glimmer/syntax/lib/v2/normalize.ts:847`). No opcode references these
  entries. The consumer tolerates unreferenced entries and does not resolve them.
  See Open question 1.

### 4.4.4 Inline blocks

```ts
type SerializedInlineBlock = [statements: Statement[], parameters: number[]];
```

(`api.d.ts:359`)

An inline block is a nested block of statements — the body of a `{{#…}}` block, an
`{{else}}` block, a named block `<:name>`, a component's default block, etc. It shares the
enclosing template's slot frame; it has no symbols or upvars of its own.

`parameters` lists the slot numbers into which the block's positional block parameters
are written when it is invoked, in declaration order. E.g. `as |item idx|` might encode as
`[2,3]`. `[]` means the block declares no parameters. (The consumer treats a missing
`parameters` as `[]`, `packages/@glimmer/opcode-compiler/lib/compilable-template.ts:117-119`.)

Semantics of invoking an inline block with values `v0…vn-1` (the "yield" operation,
§05-6.2): a new child scope of the frame the block was *defined* in is created; for
`i < min(n, parameters.length)`, slot `parameters[i]` is set to `vi`; the statements are
evaluated in that scope (`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/blocks.ts:86-120`).
Extra values are ignored; extra parameters are left unassigned (see Open question 6).

*Note:* Because a block is defined in its enclosing template's frame, a block passed to a
component and yielded to from inside that component still evaluates `this`, `@args` and
outer block parameters in the *caller's* frame. This is ordinary lexical scoping, see
§05-6.1.

---

## 4.5 Shared sub-encodings

### 4.5.1 Expressions (overview)

```ts
type Expression =
  | string | number | boolean | null      // literal values
  | TupleExpression                       // [opcode, ...operands]
  | undefined;                            // "missing"; never survives JSON (§4.1.4)
```

(`api.d.ts:131-153`)

A non-array expression is a literal constant evaluating to itself
(`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/expr.ts:9-16`). Numbers
may be any JSON number (`{{1.5}}` → `1.5`). The literal `undefined` in source is encoded as
the tuple `[27]` (§4.6.1) because a bare `undefined` would not survive JSON
(`packages/@glimmer/compiler/lib/passes/2-encoding/expressions.ts:55-63`).

### 4.5.2 Positional parameters (`Params`)

```ts
type Params = [Expression, ...Expression[]] | null;
```

A non-empty array of expressions, or `null` when there are none. The producer never emits
`[]` (`expressions.ts:122-124`, `toPresentArray`). The consumer treats `[]` like `null`.

### 4.5.3 Named parameters (`Hash`)

```ts
type Hash = [names: [string, ...string[]], values: [Expression, ...Expression[]]] | null;
```

Parallel arrays of names and values in **source order**, or `null` when empty
(`expressions.ts:130-150`). The names are the literal key text. In `Component` (§4.8.10)
the keys include the leading `@` (`[["@x"],[1]]`); everywhere else (helper calls,
modifiers, `Block`, `InvokeComponent`, `Curry`, `WithDynamicVars`) they do not
(`[["a"],[2]]`). Duplicate keys are rejected at compile time (§03) and need not be
handled.

### 4.5.4 Named blocks (`Blocks`)

```ts
type Blocks = [names: string[], blocks: SerializedInlineBlock[]] | null;
```

Parallel arrays, source order, `null` when there are no blocks
(`packages/@glimmer/compiler/lib/passes/2-encoding/content.ts:173-185`). The name of the
implicit block of `{{#x}}…{{/x}}` / `<X>…</X>` is `"default"`; the `{{else}}` block's
name is `"else"` (the producer rewrites `"inverse"` to `"else"`, `content.ts:187-193`).
Named-block syntax `<:header>` yields the name `"header"`.

### 4.5.5 Paths

A property path on a variable is expressed by appending a third element to a get-tuple:

```ts
[GetSymbol | GetLexicalSymbol, index, path: [string, ...string[]]]
```

(`api.d.ts:111-127`, producer `expressions.ts:100-104`). `path` is a non-empty array of
property names in order; `{{this.a.b.c}}` → `[30,0,["a","b","c"]]`. Evaluation reads the
head and then each key in turn with the host's property-read semantics (§05-2,
§07 for tracking): `null`/`undefined` along the way yield `undefined` rather than throwing
(`packages/@glimmer/opcode-compiler/lib/syntax/expressions.ts:83-89` issues one property
get per segment).

The current producer never attaches a path to `GetStrictKeyword` (it asserts,
`expressions.ts:102`) or to the `GetFreeAs*` opcodes (loose mode rejects `{{foo.bar}}` with
free `foo` at compile time). See §4.6.5 for how the current consumer treats such tuples if they
appear.

### 4.5.6 Well-known tag and attribute names

To save bytes, a few element and attribute names are encoded as small integers wherever
the grammar says `string | WellKnown…` (`packages/@glimmer/wire-format/lib/well-known.ts:15-30`,
producer `packages/@glimmer/compiler/lib/utils.ts:41-84`, consumer
`packages/@glimmer/opcode-compiler/lib/syntax/statements.ts:80-93`):

| Integer | Tag name (OpenElement*) | Attribute name (attribute opcodes) |
|---|---|---|
| 0 | `div` | `class` |
| 1 | `span` | `id` |
| 2 | `p` | `value` |
| 3 | `a` | `name` |
| 4 | — | `type` |
| 5 | — | `style` |
| 6 | — | `href` |

The current consumer inflates an integer to its name before any other processing, and
treats the string and integer spellings identically (the producer always deflates, but a
string `"div"` is equally valid).

### 4.5.7 Attribute namespaces

Attribute tuples take an optional trailing namespace URI (§4.8.6). The producer emits it
only for this fixed set of attribute names (`packages/@glimmer/compiler/lib/utils.ts:18-39`):

| Attribute | Namespace |
|---|---|
| `xlink:actuate`, `xlink:arcrole`, `xlink:href`, `xlink:role`, `xlink:show`, `xlink:title`, `xlink:type` | `http://www.w3.org/1999/xlink` |
| `xml:base`, `xml:lang`, `xml:space` | `http://www.w3.org/XML/1998/namespace` |
| `xmlns`, `xmlns:xlink` | `http://www.w3.org/2000/xmlns/` |

The attribute *name* keeps its prefix (`"xlink:href"`). When a namespace is present the
attribute is set with namespace-aware DOM APIs (§05-4.4).

### 4.5.8 Element parameters

```ts
type ElementParameters = [ElementParameter, ...ElementParameter[]] | null;
type ElementParameter = Attribute /* 14,15,16,22,23,24 */ | Modifier /* 4 */ | AttrSplat /* 17 */;
```

(`api.d.ts:83`, `324-334`) — the attributes, modifiers and `...attributes` of an
angle-bracket *component* invocation, carried inside `Component` (§4.8.10). The order is
that of §05-4.1: attributes (with `AttrSplat` at its source position) in source order, then
modifiers in source order, with `type` moved after the other attributes when there is no
`AttrSplat`.
For plain elements the same tuples appear inline as statements between `OpenElement`
and `FlushElement` (§4.8.4).

---

## 4.6 Expression opcodes

Summary (`packages/@glimmer/wire-format/lib/opcodes.ts:46-89`,
`packages/@glimmer/interfaces/lib/compile/wire-format/opcodes.d.ts`):

| Op | Name | Layout | Valid positions |
|---|---|---|---|
| 27 | Undefined | `[27]` | any expression |
| 28 | Call | `[28, head, Params, Hash]` | any expression |
| 29 | Concat | `[29, [Expression, ...]]` | any expression (produced only for attribute values) |
| 30 | GetSymbol | `[30, slot]` / `[30, slot, path]` | any expression |
| 31 | GetStrictKeyword | `[31, upvar]` | any expression; resolvable head |
| 32 | GetLexicalSymbol | `[32, index]` / `[32, index, path]` | any expression; resolvable head (without path) |
| 35 | GetFreeAsComponentOrHelperHead | `[35, upvar]` | only as `Append` value or head of a `Call` that is an `Append` value |
| 37 | GetFreeAsHelperHead | `[37, upvar]` | any expression; resolvable helper head |
| 38 | GetFreeAsModifierHead | `[38, upvar]` | only as `Modifier` head |
| 39 | GetFreeAsComponentHead | `[39, upvar]` | only as head of `Component`, `Block`, `InvokeComponent` |
| 48 | HasBlock | `[48, [30, slot]]` | any expression |
| 49 | HasBlockParams | `[49, [30, slot]]` | any expression |
| 50 | Curry | `[50, definition, CurriedType, Params, Hash]` | any expression |
| 51 | Not | `[51, Expression]` | any expression |
| 52 | IfInline | `[52, cond, truthy]` / `[52, cond, truthy, falsy]` | any expression |
| 53 | GetDynamicVar | `[53, Expression]` | any expression |
| 54 | Log | `[54, Params]` | any expression |

Numbers 33, 34, 36, 43, 47, 99 (and all others not listed) are not valid in the current
format; see §4.11.

All expressions evaluate to *reactive values* in the sense of `07-reactivity.md`: a
consumer evaluates them as reactive computations that are re-evaluated when tracked state
they consumed changes. Literals and lexical values are constant.

### 4.6.1 `Undefined` (27)

`[27]` — the literal `undefined`. Source: `{{undefined}}` or `undefined` as an argument
(`packages/@glimmer/compiler/lib/passes/2-encoding/expressions.ts:55-63`; consumer
`packages/@glimmer/opcode-compiler/lib/syntax/expressions.ts:91`).

### 4.6.2 `GetSymbol` (30)

`[30, slot]` or `[30, slot, path]`.

Reads local slot `slot` of the current frame (§4.4.2), then follows `path` (§4.5.5)
(consumer `expressions.ts:55-58`). Produced for:

- `this` → slot 0 (`expressions.ts:32-33` in the encoder);
- `@name` → the `@name` symbol (`encoder expressions.ts:28-29`);
- a block parameter → its slot (`encoder expressions.ts:87-94`);
- `(has-block)` / `(has-block-params)` operands (§4.6.9).

Semantics of each kind of slot:

- slot 0: the self value of the render context (§05-1.1, §06 `getSelf`).
- `@name` slot: the value of named argument `@name` as passed by the caller (§4.9); if
  the caller did not pass it, `undefined`.
- block-parameter slot: the value most recently bound by the invocation of the block that
  declares it (§4.4.4).
- `&name` slot: a *block value* (an opaque handle to a caller-supplied block, or
  "no block"). Block slots are only read via `HasBlock`, `HasBlockParams`, `Yield` and
  `AttrSplat`; the producer emits no `GetSymbol` of a block slot in any other position.

### 4.6.3 `GetStrictKeyword` (31)

`[31, upvar]` — a free name that the producer did not classify contextually. `upvars[upvar]`
is the name. Emitted for **every** free variable in "strict resolution", which covers
(`packages/@glimmer/syntax/lib/v2/objects/resolution.ts:21-25`,
`packages/@glimmer/syntax/lib/v2/normalize.ts:225-236`, `320-345`):

1. In strict mode, a host-provided *keyword* name (the `keywords` compile option; Ember
   passes `STRICT_MODE_KEYWORDS`: `mut`, `readonly`, `unbound`, `-each-in`,
   `-in-el-null`, `-track-array`, `-mount`,
   `packages/@ember/template-compiler/lib/plugins/index.ts:52-65`).
2. In loose mode, a free name in an *argument* position of a call, e.g. `bar` in
   `{{foo bar}}` → `[1,[28,[35,0],[[31,1]],null]]` (§4.12.4). See Open question 2.

Semantics (consumer `packages/@glimmer/opcode-compiler/lib/syntax/expressions.ts:67-73`,
`resolution.ts:148-189`, `425-454`):

- As a **value** (not in a head position): resolve `name` with the host's
  `lookupBuiltInHelper(name)`; **[Dev]** if it returns `null`, throw
  ``Attempted to resolve a helper in a strict mode template, but that value was not in scope: ${name}``;
  otherwise invoke that helper with *no arguments* and use its result.
- As the **head** of `Call`, `Append`-call, or `Modifier` (§4.7): resolve with
  `lookupBuiltInHelper` (helpers) or `lookupBuiltInModifier` (modifiers) and invoke with
  the given arguments. As the head of a component invocation it is a **[Dev]** error
  "Attempted to resolve a component in a strict mode template, but that value was not in
  scope: …" (`resolution.ts:93-102`).

In Ember, `lookupBuiltInHelper` knows exactly `mut`, `readonly`, `unbound`, `-hash`,
`-each-in`, `-normalize-class`, `-resolve`, `-track-array`, `-in-el-null`, and asserts on
`-mount` outside an application (`packages/@ember/-internals/glimmer/lib/resolver.ts:88-98`,
`188-196`); `lookupBuiltInModifier` knows nothing (`resolver.ts:121`, `214-220`). §08
specifies these built-ins.

### 4.6.4 `GetLexicalSymbol` (32)

`[32, index]` or `[32, index, path]` — the value `lexicalValues[index]` of §4.3.3, then
`path`. Produced for every reference to a name that the host reported as in lexical scope
(`lexicalScope(name) === true`), in both strict and loose templates
(`encoder expressions.ts:87-94`, `packages/@glimmer/syntax/lib/symbol-table.ts:104-114`).
Indexes are assigned in order of first use and match the key order of the emitted
`scope` object (`compiler.ts:147-158`).

The head value is a constant captured when `scope()` was called; `path` reads are
reactive as usual (consumer `expressions.ts:60-65`,
`packages/@glimmer/opcode-compiler/lib/opcode-builder/encoder.ts:112-123`).

When a `GetLexicalSymbol` **without a path** is a head (§4.7), the lexical value itself
is the component/helper/modifier definition. With a path (e.g. Ember's
`__ember_keywords__.on` rewrite, `packages/@ember/template-compiler/lib/compile-options.ts:77-86`),
the tuple is not a resolvable head; the value is used as a *dynamic* definition.

### 4.6.5 Contextual free-variable opcodes (35, 37, 38, 39) **[Loose mode]**

`[op, upvar]`, where `upvars[upvar]` is a name to be resolved through the owner. The
opcode records the syntactic position, which determines which resolver namespaces are
consulted (`resolution.ts:100-113` in `@glimmer/syntax`; loose-resolution contexts in
`packages/@glimmer/syntax/lib/v2/loose-resolution.ts:15-77`):

| Op | Produced for | Resolution (§08) |
|---|---|---|
| 35 `GetFreeAsComponentOrHelperHead` | `{{x}}` / `{{x …}}` in content (append) position | component, then helper |
| 37 `GetFreeAsHelperHead` | `(x …)`, `{{{x …}}}`, attribute values `a={{x}}`, `a="{{x}}"` | helper |
| 38 `GetFreeAsModifierHead` | `<div {{x …}}>` | modifier |
| 39 `GetFreeAsComponentHead` | `{{#x}}…{{/x}}`, `<X/>` | component |

These are produced only in loose mode and only for a simple identifier with no path.

The current consumer implements them as follows (`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/resolution.ts`,
`packages/@glimmer/opcode-compiler/lib/syntax/expressions.ts:75-81`):

- 37 as a **value** (e.g. `class={{foo}}`) means "resolve `foo` as a helper and invoke it
  with no arguments" — it is *not* the helper definition itself. **[Dev]** error if not
  found: ``Attempted to resolve `${name}`, which was expected to be a helper, but nothing was found.``
  (`resolution.ts:175-188`).
- 35, 38 and 39 have **no value semantics**; the current consumer has no expression
  handler for them and fails if one appears outside its head position, so they are effectively
  rejected outside the positions listed in the table of §4.6.
- In head positions, see §4.7.

Free-variable resolution happens once, when the block is first compiled for a given
template object (i.e. per owner), not on every render: the resolved definition is a
constant (`packages/@glimmer/opcode-compiler/lib/opcode-builder/encoder.ts:88-97`). The
current consumer does not re-resolve on re-render.

### 4.6.6 `Call` (28)

`[28, head, Params, Hash]` — invoke a helper. Source: `(head a b k=v)` subexpressions,
and `{{head …}}` mustaches with arguments (as the value of `Append`, attributes, etc.)
(`encoder expressions.ts:110-112`).

Semantics (consumer `expressions.ts:40-49`):

- If `head` is a resolvable **helper head** (§4.7: `[31,n]`, `[32,n]` without path, or
  `[37,n]`), resolve it statically and invoke the helper through its helper manager with
  the given arguments (§06). The result is the value of the call.
- Otherwise evaluate `head` as an expression and invoke its *value* as a helper
  dynamically (the value must be a helper definition or a curried helper; re-evaluated if
  the head value changes). See §05-2 for dynamic helper semantics.

When `Call` is the direct value of `Append` or `TrustingAppend`, different rules apply
(§4.8.1).

The current producer also emits `Call` for Ember's internal helpers, e.g. `-track-array`
around `{{#each}}` operands and `-in-el-null` around `{{#in-element}}` destinations
(§4.12.5); these are ordinary calls whose heads are `31` (strict) or `37` (loose).

### 4.6.7 `Concat` (29)

`[29, parts]` where `parts` is a non-empty array of expressions. Source: a quoted
attribute value containing at least one mustache, e.g. `class="a {{b}}"` →
`[29,["a ",[37,1]]]`; `data-x="{{foo}}"` → `[29,[[37,1]]]` (a single part is still
wrapped, which forces string conversion) (`encoder expressions.ts:106-108`; consumer
`expressions.ts:32-38`).

Semantics: evaluate each part, convert each value to a string with the concat rules of
§05-4.6 (`null`/`undefined` → `""`; SafeString → its HTML string), and join with no
separator. Ember's `transform-quoted-bindings-into-just-bindings` removes the `Concat`
when the value is exactly one mustache in some cases (§08).

### 4.6.8 `Curry` (50)

`[50, definition, curriedType, Params, Hash]` — produced by `(component …)`,
`(helper …)`, `(modifier …)` in expression position (§4.12.3).

`curriedType` (`packages/@glimmer/interfaces/lib/curry.d.ts`,
`packages/@glimmer/constants/lib/curried.ts:3-5`):

| Value | Kind |
|---|---|
| 0 | component |
| 1 | helper |
| 2 | modifier |

`definition` is any expression. The first positional source argument becomes
`definition`; the remaining source arguments become `Params`/`Hash`
(`packages/@glimmer/compiler/lib/passes/1-normalization/keywords/utils/curry.ts:23-77`).
A string literal definition is only allowed for components in loose mode
(`curry.ts:48-64`); it appears on the wire as a plain string.

Semantics: produce a *curried value* of the given kind that closes over the evaluated
definition, the captured arguments, and the current owner; strings are resolved as
component names through the owner (loose mode only; **[Dev]** error in strict mode)
(consumer `expressions.ts:51-53`, `helpers/vm.ts` `Curry`; runtime
`packages/@glimmer/runtime/lib/compiled/opcodes/expressions.ts:73-94`). A `null` or
`undefined` definition curries to "nothing". Full semantics (argument merging order,
owner capture) are in §05-8.

The special case of `(component …)` directly as an `Append` value is encoded as
`InvokeComponent` instead (§4.8.12).

### 4.6.9 `HasBlock` (48) and `HasBlockParams` (49)

`[48, [30, slot]]`, `[49, [30, slot]]` where `slot` is a `&name` symbol
(`encoder expressions.ts:69-75`). Source: `(has-block)`, `(has-block "name")`,
`{{has-block-params}}` etc.; the name defaults to `default` and `"inverse"` maps to
`&else`.

Semantics: `HasBlock` is `true` iff the caller supplied that block; `HasBlockParams` is
`true` iff the caller supplied that block **and** it declares at least one block parameter
(consumer `expressions.ts:92-102`). Both are constant for a given invocation. §05-6.3.

### 4.6.10 `Not` (51)

`[51, value]` — boolean negation using the template truthiness rules (§05-5.1;
Ember's `toBool`: empty arrays and proxies with falsy `isTruthy` are falsy). Produced by
`unless` (block, inline, and sub-expression forms) wrapping the condition
(`packages/@glimmer/compiler/lib/passes/1-normalization/keywords/block.ts:205-212`).
Ember's `{{not}}` keyword is *not* this opcode (it is a lexically-scoped helper, §08).

### 4.6.11 `IfInline` (52)

`[52, condition, truthy]` or `[52, condition, truthy, falsy]` — inline `{{if c a b}}`,
`(if c a)`, `{{unless c a}}` (the latter as `[52,[51,c],a]`) (`encoder expressions.ts:156-164`).

Semantics: evaluate `condition` with template truthiness; if truthy, the value is
`truthy`, else `falsy` (absent `falsy` means `undefined`). Only the selected branch is
evaluated (§05-5.3). *Note:* the current consumer pushes all three onto its stack
(`consumer expressions.ts:104-110`) but values are lazy, so only the selected branch is
observed.

### 4.6.12 `GetDynamicVar` (53)

`[53, name]` — `(-get-dynamic-var name)`; reads the named entry of the *dynamic scope*
(§05-5.8). `name` is any expression (in practice a string literal).
A private keyword. Ember's outlets once used it, but `{{outlet}}` now compiles to
`<@outlet />` (§08-8.3) and no current Ember template emits it. Consumer `expressions.ts:117-120`.

### 4.6.13 `Log` (54)

`[54, Params]` — `{{log a b}}` / `(log a b)`. Semantics: each time it is evaluated, pass
the evaluated positional values to `console.log`; the expression's value is `undefined`
(§05-5.9). Consumer `expressions.ts:122-128`.

---

## 4.7 Head resolution

Several constructs have a *head*: the callee of `Call` (28), the value of `Append` (1),
the head of a `Call` that is an `Append` value, the callee of `Modifier` (4), and the
definition of `Component` (8), `Block` (6) and `InvokeComponent` (46).

A head is **resolvable** iff it is an array of length exactly 2 whose opcode is 31, 32, or
the contextual opcode appropriate for the position (`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/resolution.ts:23-51`):

| Position | Contextual opcode also accepted |
|---|---|
| helper head (`Call`) | 37 |
| modifier head (`Modifier`) | 38 |
| component head (`Component`, `Block`, `InvokeComponent`) | 39 |
| append head (`Append` value, head of `Append`'s `Call`) | 35 |

(A path on a 32 therefore makes it non-resolvable.)

A resolvable head is resolved **statically** (once per template object) to a definition:

```
resolveStatic(position, [op, n]):
  if op == 32:   value = lexicalValues[n]                       // §4.3.3
     component position: def = component manager for value (owner = template owner);
                         [Dev] error if none
     helper position:    def = helper manager for value
     modifier position:  def = modifier manager for value
     append position:    see §4.8.1
  elif op == 31: name = upvars[n]
     helper/append position: def = host.lookupBuiltInHelper(name)   // [Dev] error if null
     modifier position:      def = host.lookupBuiltInModifier(name) // [Dev] error if null
     component position:     [Dev] error "…component in a strict mode template…"
  else:          name = upvars[n]                               // loose mode
     component position: def = host.lookupComponent(name, owner)   // [Dev] error if null
     helper position:    def = host.lookupHelper(name, owner)      // [Dev] error if null
     modifier position:  def = host.lookupModifier(name, owner)    // [Dev] error if null
     append position:    see §4.8.1
```

(`resolution.ts:83-454`.) The exact **[Dev]** messages that tests assert on are:

- ``Attempted to resolve `${name}`, which was expected to be a component, but nothing was found.``
  (`resolution.ts:134-136`; asserted in `packages/@ember/-internals/glimmer/tests/integration/components/dynamic-components-test.js:484`)
- ``Attempted to resolve `${name}`, which was expected to be a helper, but nothing was found.`` (`resolution.ts:181-183`)
- ``Attempted to resolve `${name}`, which was expected to be a modifier, but nothing was found.`` (`resolution.ts:244-246`; `custom-helper-test.js:495`)
- ``Attempted to resolve `${name}`, which was expected to be a component or helper, but nothing was found.``
  (`resolution.ts:333-335`; `packages/@glimmer-workspace/integration-tests/test/updating-test.ts:881`)

In production builds these checks are compiled out and a missing definition leads to an
undefined failure; the current runtime does not throw a descriptive error in production.

A non-resolvable head is evaluated as an ordinary expression and its value is used as a
**dynamic** definition, re-examined whenever it changes (§05-7.2).

---

## 4.8 Statement opcodes

Summary:

| Op | Name | Layout |
|---|---|---|
| 1 | Append | `[1, value]` |
| 2 | TrustingAppend | `[2, value]` |
| 3 | Comment | `[3, text]` |
| 4 | Modifier | `[4, head, Params, Hash]` |
| 6 | Block | `[6, head, Params, Hash, Blocks]` |
| 8 | Component | `[8, tag, ElementParameters, Hash, Blocks]` |
| 10 | OpenElement | `[10, tagName]` |
| 11 | OpenElementWithSplat | `[11, tagName]` |
| 12 | FlushElement | `[12]` |
| 13 | CloseElement | `[13]` |
| 14 | StaticAttr | `[14, name, value]` / `[14, name, value, ns]` |
| 15 | DynamicAttr | `[15, name, expr]` / `[15, name, expr, ns]` |
| 16 | ComponentAttr | `[16, name, expr]` / `[16, name, expr, ns]` |
| 17 | AttrSplat | `[17, slot]` |
| 18 | Yield | `[18, slot, Params]` |
| 22 | TrustingDynamicAttr | `[22, name, expr]` / `[22, name, expr, ns]` |
| 23 | TrustingComponentAttr | `[23, name, expr]` / `[23, name, expr, ns]` |
| 24 | StaticComponentAttr | `[24, name, value]` / `[24, name, value, ns]` |
| 26 | Debugger | `[26, locals, upvars, lexical]` |
| 40 | InElement | `[40, block, guid, destination]` / `[40, block, guid, destination, insertBefore]` |
| 41 | If | `[41, condition, block, inverse]` |
| 42 | Each | `[42, iterable, key, block, inverse]` |
| 44 | Let | `[44, Params, block]` |
| 45 | WithDynamicVars | `[45, Hash, block]` |
| 46 | InvokeComponent | `[46, definition, Params, Hash, Blocks]` |

(`packages/@glimmer/wire-format/lib/opcodes.ts:46-66`, `76-81`;
`packages/@glimmer/interfaces/lib/compile/wire-format/api.d.ts:204-335`.)

Statements are evaluated in order; each appends DOM content or structure at the current
insertion point (§05-1.2). A statement list is the `statements` array of a template block
or an inline block.

### 4.8.1 `Append` (1)

`[1, value]` — a double-curly mustache in content position, and also every piece of
static text (`hi` → `[1,"hi"]`) (`packages/@glimmer/compiler/lib/passes/2-encoding/content.ts:121-123`).

Consumer behavior (`packages/@glimmer/opcode-compiler/lib/syntax/statements.ts:174-249`)
has four cases, which differ observably (they are the runtime semantics of §05-3):

1. **Literal** (`value` not an array): append a text node containing `String(value)`, or
   `""` for `null`/`undefined` (`statements.ts:176-177`). This is static content (§05-3.1).
2. **Resolvable append head** (`[35,n]`, `[31,n]`, `[32,n]`) — `{{foo}}`:
   - `[32,n]` (lexical value `v`): if `v` is neither an object nor a function, append it
     as a constant value; else if `v` has a component manager, invoke it as a component
     with no arguments and no blocks; else if it has a helper manager, invoke the helper
     with no arguments and append the result *non-dynamically* (see below); else append
     `v` as a constant value (`resolution.ts:360-398`).
   - `[35,n]` (loose): if `lookupComponent(name, owner)` finds a component, invoke it;
     else if `lookupHelper(name, owner)` finds a helper, invoke it with no arguments and
     append the result non-dynamically; **else render nothing** (no DEV error)
     (`resolution.ts:403-422`); this is required behavior (§08-5.1).
   - `[31,n]`: `lookupBuiltInHelper(name)`, invoke with no arguments, append non-dynamically
     (`resolution.ts:399-402`).
3. **Call** (`[28, head, Params, Hash]`):
   - resolvable append head: resolve as *component or helper*: `[32,n]` → component if it
     has a component manager, else helper (**[Dev]** error "Attempted to use a value as
     either a component or helper, but it did not have a component manager or helper
     manager associated with it. The value was: …" if neither) (`resolution.ts:270-305`);
     `[35,n]` → `lookupComponent` then `lookupHelper` (**[Dev]** error if neither,
     `resolution.ts:316-341`); `[31,n]` → built-in helper. A component is invoked with the
     positional params and the hash as named arguments (`@`-prefixed), no blocks; a helper
     is invoked and its result appended non-dynamically.
   - otherwise (dynamic head, e.g. `{{@foo 1}}`, `{{this.foo 1}}`): evaluate `head`; if its
     value is a component (component manager or curried component), invoke it with the
     args; otherwise treat it as a helper (curried helper or helper manager), invoke it and
     append the result non-dynamically. **[Dev]** error for a non-string value with neither
     manager: "Attempted use a dynamic value as a component or helper, but that value did
     not have an associated component or helper manager. The value was: …"
     (`statements.ts:213-241`, `packages/@glimmer/runtime/lib/compiled/opcodes/content.ts:52-69`).
     If the head value's kind changes on update, the whole region is re-rendered.
4. **Any other expression** (e.g. `{{this.x}}`, `{{@x}}`, `{{(concat …)}}`): evaluate and
   append *dynamically* ("cautious append", `statements.ts:243-247`).

"Append dynamically" (cautious) means (`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/stdlib.ts:33-88`,
`packages/@glimmer/runtime/lib/compiled/opcodes/content.ts:34-50`): classify the value —
string-like (primitives, `null`, `undefined`), component (curried component or has a
component manager), helper (curried helper or helper manager), SafeString, DocumentFragment,
Node, otherwise string — and: append text; **invoke** a component with no args; **invoke**
a helper with no args and then append its result *non-dynamically*; insert SafeString HTML;
insert the fragment/node. "Append non-dynamically" is the same except components and
helpers are **not** invoked again; they are stringified as text (this prevents
infinite helper-returns-helper loops). The full rules, including updating when the kind
changes, are §05-3.2–3.5.

### 4.8.2 `TrustingAppend` (2)

`[2, value]` — triple-curly `{{{value}}}` (`content.ts:117-119`).

- Literal: append as text exactly like `Append` (the consumer does *not* parse a literal
  as HTML: `{{{"<b>x</b>"}}}` compiles to `[2,"<b>x</b>"]` and renders the *text*
  `<b>x</b>`) (`statements.ts:251-253`). This is observable
  behavior of the current implementation; see Open question 5.
- Otherwise: evaluate and "append dynamically, trusting": like cautious append, but a
  string value is inserted as raw HTML (`statements.ts:254-259`, `stdlib.ts:42-47`). A
  `Call` value is *not* special-cased: `{{{foo 1}}}` evaluates the `Call` expression
  (helper head, §4.6.6) and appends its result dynamically — so if a helper returns a
  component or helper, it is invoked (unlike `{{foo 1}}`).

### 4.8.3 `Comment` (3)

`[3, text]` — an HTML comment `<!--text-->`; `text` excludes the delimiters
(`content.ts:125-127`). Append a DOM comment node with that data (`statements.ts:95`).
Handlebars comments `{{! … }}` produce nothing.

### 4.8.4 Plain elements: `OpenElement` (10), `OpenElementWithSplat` (11), `FlushElement` (12), `CloseElement` (13)

A plain HTML/SVG element is encoded as a flat sequence
(`packages/@glimmer/compiler/lib/passes/2-encoding/content.ts:129-138`):

```
[10 | 11, tagName]
  ...element parameters (attributes 14/15/16/22/23/24, modifiers 4, splat 17)
[12]
  ...body statements
[13]
```

- `tagName` is a string or a well-known integer (§4.5.6), in source case
  (`"svg"`, `"foreignObject"`, `"use-the-platform"`).
- `11 OpenElementWithSplat` is used instead of 10 when the element has *dynamic features*:
  `...attributes` or at least one modifier (`content.ts:130`; the producer's
  `dynamicFeatures`). Semantically it opens the element in a mode where attributes are
  merged with those supplied via `...attributes` according to the component-attribute
  rules (§4.8.7); the consumer emits `PutComponentOperations` first
  (`statements.ts:149-152`). The consumer implements 11 exactly as 10 plus
  "attributes on this element go through the component-attribute merge (§05-7.5)".
- Between the open and `FlushElement`, only element parameters appear. `FlushElement`
  ends the attribute list: at that point the element's attributes are committed and the
  element is inserted into the DOM (§05-4.1); modifiers are
  installed *after* the element's children are rendered, at `CloseElement` (§05-4.1, §05-10.1).
- `CloseElement` closes the element. The element namespace (SVG, MathML) is determined by
  the tag and its parent exactly as in §05-4.2; the wire format carries no namespace for
  elements.

The producer never emits unbalanced sequences, and the current consumer does not check for them.

### 4.8.5 `StaticAttr` (14) and `StaticComponentAttr` (24)

`[14|24, name, value]` or `[14|24, name, value, namespace]`; `name` is a string or
well-known integer (§4.5.6); `value` is a **string**; `namespace` per §4.5.7
(producer `content.ts:241-249`, `267-274`).

Source: an attribute whose value is text only (`class="x"` → `[14,0,"x"]`;
`disabled` → `[14,"disabled",""]`).

- 14 is used on elements without dynamic features: set the attribute (§05-4.3).
- 24 is used on (a) component invocations (inside `Component`'s element parameters) and
  (b) plain elements with dynamic features (`OpenElementWithSplat`). It participates in
  `...attributes` merging: static attributes on the element set a value that later
  `...attributes` may override, and `class` values are concatenated (§05-7.5)
  (consumer `statements.ts:117-123`).

### 4.8.6 `DynamicAttr` (15) and `TrustingDynamicAttr` (22)

`[15|22, name, expr]` or with trailing `namespace`. Source: `attr={{expr}}`,
`attr="text {{expr}}"` (with a `Concat` value), and `attr={{{expr}}}` (22)
(`content.ts:257-265`, `276-288`).

Semantics: evaluate `expr` reactively and set the attribute or *property* per the DOM
attribute/property rules of §05-4.4–4.5 (including `null`/`undefined`/`false` removing the
attribute, and URL sanitization for `href`/`src` etc. unless trusting). 22 differs only
in skipping sanitization ("trusting") (consumer `statements.ts:125-133`: `trusting` flag).

### 4.8.7 `ComponentAttr` (16) and `TrustingComponentAttr` (23)

Same layout and meaning as 15/22, used under the same conditions as 24 (§4.8.5): on
component invocations and on elements with dynamic features. They participate in
`...attributes` merging (consumer `statements.ts:135-143`,
`packages/@glimmer/runtime/lib/compiled/opcodes/component.ts:490`).

### 4.8.8 `AttrSplat` (17)

`[17, slot]` — `...attributes` (`content.ts:162-163`). `slot` is the `&attrs` symbol.

Semantics: at this point in the attribute list, apply the attributes and modifiers passed
by the invoker of the current component (the "attrs block", §4.9.3), as if they were
written here; for merging rules (later wins; `class` concatenates) see §05-7.5. If no attrs
block was passed, nothing. Consumer: yields to the block in `slot` with no arguments
(`statements.ts:168`).

`AttrSplat` may appear among the element parameters of a plain element (then the element
uses 11) or of a `Component` (forwarding `...attributes` to a child component).

### 4.8.9 `Modifier` (4)

`[4, head, Params, Hash]` — `{{head args}}` in element position (`content.ts:168-169`).
Appears only among element parameters (after `OpenElement*` or inside `Component`).

- Resolvable modifier head (`[38,n]`, `[31,n]`, `[32,n]`): resolve statically (§4.7) and
  install the modifier through its modifier manager on the element (§06).
- Otherwise: evaluate `head` dynamically; the value must be a modifier definition or
  curried modifier; `null`/`undefined` installs nothing; changes tear down and reinstall
  (consumer `statements.ts:99-115`; §05-10.2).

Hash keys have no `@`.

### 4.8.10 `Component` (8)

`[8, tag, ElementParameters, Hash, Blocks]` — an angle-bracket component invocation
`<Tag attrs @args ...attributes {{mods}}>…</Tag>` (`content.ts:140-154`).

- `tag`: the component head. `<Foo>` with `Foo` lexical → `[32,n]`; loose free `<Foo>` →
  `[39,n]` (with the customized name in `upvars`); `<@comp>` → `[30,slot]`;
  `<this.comp>` → `[30,0,["comp"]]`; `<x.y>` with block param `x` → `[30,slot,["y"]]`.
- `ElementParameters` (§4.5.8): attributes (only 24, 16, 23 — never 14/15/22), modifiers,
  and `AttrSplat`, in the order of §4.5.8; `null` if none.
- `Hash`: the named arguments; **keys include the `@`** (`[["@a","@b"],["s",1]]`).
- `Blocks`: `default` for the body (`<Foo as |x|>{{x}}</Foo>`), or the named blocks
  `<:name>` (§4.5.4). `null` if self-closing or empty.

Semantics (consumer `statements.ts:154-164`,
`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/components.ts:109-190`):

- If `tag` is a resolvable component head, resolve it statically and invoke the resulting
  definition.
- Otherwise evaluate `tag` dynamically. Its value must be a component definition (an
  object/function with a component manager) or a curried component; `null`/`undefined`
  renders nothing; a string is **[Dev]** error ("Expected a component definition, but
  received …") — angle-bracket syntax never resolves strings
  (`packages/@glimmer/runtime/lib/compiled/opcodes/component.ts:214-260`). If the value
  changes, the invocation is torn down and re-created.
- The element parameters become the component's *attrs block* (§4.9.3); the named args
  and blocks are bound per §4.9.
- Full invocation semantics are §05-7 and §06.

### 4.8.11 `Block` (6)

`[6, head, Params, Hash, Blocks]` — a curly block invocation `{{#head a k=v as |x|}}…{{else}}…{{/head}}`
that is not a built-in keyword (`content.ts:113-115`). Hash keys have no `@`.

Semantics (consumer `statements.ts:262-270`):

- resolvable component head (`[39,n]`, `[32,n]`, `[31,n]`): resolve statically as a
  component and invoke it with the positional params, the hash as `@`-prefixed named
  arguments (`statements.ts:389-393`), and the blocks;
- otherwise evaluate `head` dynamically and invoke its value as a component with the same
  rules as `{{component}}` (strings are resolved through the owner in loose mode, **[Dev]**
  error in strict mode, `packages/@glimmer/runtime/lib/compiled/opcodes/component.ts:162-212`).

Curly block invocation of a *helper* is not supported; the head must be a component.

### 4.8.12 `InvokeComponent` (46)

`[46, definition, Params, Hash, Blocks]` — the `{{component …}}` keyword in append and
block form, and `{{(component …)}}` as an append value (`content.ts:222-234`;
normalization `packages/@glimmer/compiler/lib/passes/1-normalization/keywords/append.ts:106-126`,
`block.ts:364-385`). The first positional source argument becomes `definition`; `Blocks`
is `null` for the append form. Hash keys have no `@`.

Semantics are those of `Block` (§4.8.11) — statically resolvable heads are resolved,
otherwise dynamic with string resolution in loose mode (`statements.ts:379-387`).
Examples: `{{component "x-y" a=1}}` → `[46,"x-y",null,[["a"],[1]],null]`;
Ember's `{{mount "engine"}}` → `[46,[28,[37,1],["engine"],null],null,null,null]` (§08).

### 4.8.13 `Yield` (18)

`[18, slot, Params]` — `{{yield a b}}` / `{{yield to="name"}}` (`content.ts:91-93`).
`slot` is the `&name` symbol (default `&default`; `to="inverse"` → `&else`). `Params` is
the yielded values or `null`.

Semantics: if a block was passed in that slot, invoke it with the evaluated params as its
block parameters (§4.4.4); otherwise render nothing (consumer
`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/blocks.ts:34-46`). §05-6.2.

### 4.8.14 `If` (41)

`[41, condition, block, inverse]` — `{{#if}}` and `{{#unless}}` (with `condition`
wrapped in `Not`, §4.6.10); `{{else if …}}` chains nest a new `If` as the only statement
of `inverse` (`content.ts:195-202`; §4.12.3). `block` is an inline block; `inverse` is an
inline block or `null`. Neither declares parameters.

Semantics: evaluate `condition` with template truthiness; render `block` if truthy, else
`inverse` (or nothing). When truthiness changes, tear down the rendered branch and
render the other (consumer `statements.ts:299-319`; §05-5.2).

### 4.8.15 `Each` (42)

`[42, iterable, key, block, inverse]` — `{{#each iterable key=… as |item index|}}…{{else}}…{{/each}}`
(`content.ts:204-212`). `key` is an expression or `null` (source `key="@index"`,
`"@identity"`, a property name, all strings in practice). `block`'s parameters are
bound to (item, index/memo). `inverse` renders when the iteration is empty.

Semantics: §05-5.4 (iteration protocol, key semantics, stable-identity DOM moves).
Consumer `statements.ts:321-359`. Ember wraps `iterable` in `-track-array` and rewrites
`{{#each-in}}` to `{{#each (-each-in x)}}`, both visible on the wire (§4.12.5, §08).

### 4.8.16 `Let` (44)

`[44, Params, block]` — `{{#let a b as |x y|}}…{{/let}}` (`content.ts:214-216`). Params is
non-null (compile-time error otherwise).

Semantics: invoke `block` once with the evaluated params as block parameters; values stay
reactive (consumer `statements.ts:361-364`). No teardown on change.

### 4.8.17 `WithDynamicVars` (45)

`[45, Hash, block]` — `{{#-with-dynamic-vars name=value}}…{{/-with-dynamic-vars}}`
(`content.ts:218-220`). Semantics: render `block` in a child dynamic scope in which each
hash entry is bound (§05-5.8). A `null` hash renders the block unchanged
(consumer `statements.ts:366-377`). A private keyword; no current Ember template emits it
(§4.6.12).

### 4.8.18 `Debugger` (26)

`[26, locals, upvars, lexical]` — `{{debugger}}` (`content.ts:59`,
`packages/@glimmer/syntax/lib/symbol-table.ts:120-122`, `224-230`). Each of the three is a
plain JSON object mapping names to numbers:

- `locals`: name → slot, for the block parameters in scope at this point and (inside a
  nested block) the template's `@args`;
- `upvars`: inside a nested block, name → upvar index for all upvars; **at top level,
  this position instead holds the `@args` map** (name → slot), because the program-level
  `getDebugInfo` returns `[{}, named]`;
- `lexical`: always `{}` in the current producer.

Examples: top-level `{{log @a 1}}{{debugger}}` → `[26,{},{"@a":1},{}]`; inside
`{{#let … as |h|}}` → `[26,{"h":1},{"let":0,"debugger":1},{}]` (§4.12.6).

Semantics: **[Dev]**-oriented. Invoke the host's debugger callback with
`(self, get)` where `get(path)` resolves `this…` against self, a head in `locals` against
that slot, and anything else as a property path on self
(`packages/@glimmer/runtime/lib/compiled/opcodes/debugger.ts:46-83`). The default callback
logs a hint and executes a JavaScript `debugger` statement. Only `locals` is consulted by
the current runtime. Producing no DOM, `Debugger` could be treated as a no-op in
production. See Open question 7.

### 4.8.19 `InElement` (40)

`[40, block, guid, destination]` or `[40, block, guid, destination, insertBefore]` —
`{{#in-element destination insertBefore=…}}…{{/in-element}}` (`content.ts:95-111`;
normalization `packages/@glimmer/compiler/lib/passes/1-normalization/keywords/block.ts:15-91`).

- `block`: inline block (no parameters).
- `guid`: a string `"%cursor:N%"`, `N` counting from 0 per compiled template
  (`packages/@glimmer/compiler/lib/passes/1-normalization/context.ts:24-26`). Used only
  for SSR/rehydration: the serializer writes `<script glmr="%cursor:N%">` into the
  destination and the rehydrator looks it up with
  `querySelector('script[glmr="…"]')` (`packages/@glimmer/node/lib/serialize-builder.ts:132-142`,
  `packages/@glimmer/runtime/lib/vm/rehydrate-builder.ts:460-495`).
- `destination`: expression evaluating to a DOM element.
- `insertBefore`: **presence is significant.** Absent (4-element tuple) means "replace":
  the destination's existing children are removed before rendering. Present means
  "insert before this node"; `null` means "append at the end"
  (`packages/@glimmer/runtime/lib/vm/element-builder.ts:240-255`;
  `packages/@glimmer/runtime/lib/compiled/opcodes/dom.ts:75-110`). Because JSON cannot
  carry `undefined`, the producer omits the element instead (§4.1.4).

Semantics: render `block` into `destination` (at `insertBefore`) instead of the current
insertion point; if `destination` or `insertBefore` changes, tear down and re-render
(consumer `statements.ts:272-297`). §05-5.7. Ember's `transform-in-element`
makes `insertBefore=null` explicit and wraps `destination` in `-in-el-null`
(§4.12.5, §08).

---

## 4.9 Invocation binding between caller and callee

Component invocation (`Component`, `Block`, `InvokeComponent`, and component-valued
`Append`/`Call`) connects *two* wire-format blocks compiled independently: the caller's
statement and the callee's layout. This section is normative because both sides must
agree.

### 4.9.1 Named arguments

The caller supplies named arguments as a Hash (keys with `@` for `Component`; the consumer
adds `@` for `Block`/`InvokeComponent`, `statements.ts:389-393`). In the callee's layout,
the argument `@name` is visible in slot `symbols.indexOf("@name") + 1`, if present
(`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/components.ts:277`, `301`;
runtime `packages/@glimmer/runtime/lib/compiled/opcodes/component.ts:856-871`). Arguments the
callee's layout never references are still passed to the component manager (§06) but
bound to no slot.

### 4.9.2 Blocks

For each named block `n` supplied by the caller, the callee slot
`symbols.indexOf("&" + n) + 1`, if present, holds that block
(`components.ts:246`, `component.ts:873-894`). The caller's `default`/`else` blocks bind
to `&default`/`&else`. The "has default block" flag passed to the manager's `create`
(§06) is whether a `default` block was supplied (`components.ts:319-320`).

### 4.9.3 The attrs block

A `Component` invocation's element parameters form an inline block with no parameters
(`[elementParameters, []]`, `components.ts:117-119`), passed to the callee as the block
named `attrs` (`components.ts:233-240`, `388`). The callee accesses it via
`AttrSplat [17, slot of "&attrs"]`. Its statements are attribute and modifier tuples and
nested `AttrSplat`s, evaluated in the *caller's* frame, applied to whichever element the
callee splats onto. If the callee never uses `...attributes`, the attrs block is ignored.

### 4.9.4 Wrapped layouts

For components whose manager has the `wrapped` capability (classic components), the
consumer renders the layout inside an element whose tag name comes from the manager,
applies the attrs block to it, and uses `symbols` extended with `&attrs` if absent
(`packages/@glimmer/opcode-compiler/lib/wrapped-component.ts:28-50`,
`components.ts:413-439`). §08.

---

## 4.10 Effects of `isStrictMode`

`isStrictMode` changes consumer behavior only in these places:

1. Dynamic component heads (`Block`/`InvokeComponent` non-resolvable): a string value is a
   **[Dev]** error ("Attempted to resolve a dynamic component with a string definition,
   `…` in a strict mode template. …") instead of an owner lookup
   (`packages/@glimmer/runtime/lib/compiled/opcodes/component.ts:188-194`).
2. `Curry` of a string component definition: **[Dev]** error instead of lookup
   (`packages/@glimmer/runtime/lib/compiled/opcodes/expressions.ts:83-94`).
3. The **[Dev]** assertions inside head resolution assume strict-mode templates never
   reach "not found" paths (`resolution.ts` `assert(!meta.isStrictMode, …)`).

Everything else is already decided by which opcodes the producer emitted. A strict-mode
template never contains 35/37/38/39.

---

## 4.11 Version history and compatibility

### 4.11.1 Timeline of wire-visible changes

Glimmer versions map to Ember via `ember-source`'s `@glimmer/compiler` dependency
(`git show vX:package.json`); from Ember 6.12 the Glimmer packages live in this repository.

| Ember | Glimmer | Change |
|---|---|---|
| ≤ 3.24 | ≤ 0.65 | Object-form block `{statements, symbols, hasEval, upvars}`; different opcode numbering (e.g. `GetSymbol` 32, `GetFree` 33, `GetFreeInAppendSingleId` 34…, `Partial` 19). **Out of scope.** |
| 3.25–3.28 | 0.74–0.80 | Array-form block `[statements, symbols, hasEval, upvars]`; current opcode numbering introduced; also `Partial` (19), `GetFreeAsFallback` (33), `GetFreeAsComponentOrHelperHeadOrThisFallback` (34), `GetFreeAsHelperHeadOrThisFallback` (36), `GetFreeAsDeprecatedHelperHeadOrThisFallback` (99, from 0.80), `With` (43); `GetStrictFree` (31), `GetTemplateSymbol` (32). |
| 4.0–5.8 | 0.83–0.87 | `Partial` and 33 removed. 34/36/99/43 still emitted in loose mode (implicit-this fallback machinery, `{{#with}}`). |
| 5.9–6.3 | 0.92.x | Commits `27197c273c` (drop `With` 43) and `8685023a9c` (drop 34, 36, 99; `GetStrictFree` becomes `GetStrictKeyword`; strict-mode unresolved names become compile errors). Block still `[statements, symbols, hasEval, upvars]`; `Debugger` is `[26, number[]]`. |
| 6.4–6.11 | 0.94.x | Commit `99d023278b` "Remove eval infrastructure": block becomes `[statements, locals, upvars, lexicalSymbols?]` (the boolean at index 2 is **removed**, shifting `upvars`); `Debugger` becomes `[26, locals, upvars, lexical]`. Commit `90a133100b` adds optional `lexicalSymbols`. `scope: () => [values]`. |
| 6.12 (alpha.8)–7.0 | in-repo | Commit `9498833de2`: `scope: () => ({name: value})` (object form). |
| 7.1 | in-repo | Commit `3cd64941e8`: `lexicalSymbols` removed from the block. |
| 7.3 | in-repo | Commit `b6e26a9e69`: never-emitted `StrictModifier` (5), `StrictBlock` (7), `DynamicArg` (20), `StaticArg` (21) removed from the type/opcode tables. |

(Diffs: `git show <commit> -- packages/@glimmer/interfaces/lib/compile/wire-format/api.d.ts`;
tag lookups via `git tag --contains <commit>`.)

### 4.11.2 What the current runtime actually accepts

- Current format (§4.2–§4.10): yes.
- Array-returning `scope` (≤ 6.11): yes, by accident (§4.3.3).
- A 4th `lexicalSymbols` block element (6.4–7.0): yes, ignored (`shared.ts:109` reads only
  the first three).
- The 0.92-era block `[statements, symbols, hasEval, upvars]` (Ember 5.9–6.3): **no** —
  `upvars` would be read from the boolean at index 2, breaking every free-name
  resolution; and `Debugger` `[26, number[]]` would be mis-read.
- Opcodes 34, 36, 43, 99, 33, 19: **no** — no handler exists.

### 4.11.3 Historical shapes that could be recognized

*Note:* Wire format is not a compatibility requirement (§4.1.3), so this section is a
note, not a recommendation. **[Legacy]** These historical shapes are detectable without
ambiguity, should a tool ever want to read old wire output:

1. `scope` returning an array (accepted by the current runtime, §4.3.3).
2. Template blocks of length ≥ 4 whose third element (index 2) is a **boolean**:
   would be read as `[statements, symbols, hasEval, upvars]`, ignoring `hasEval`
   (Ember 3.25–6.3). A block of length 4 whose index 2 is an array is the 6.4–7.0 shape
   `[statements, symbols, upvars, lexicalSymbols]`, where index 3 is ignorable.
3. `Debugger` of the form `[26, number[]]` (any second element that is an array) would be a
   debugger statement with no symbol information.
4. `31` tuples carrying a path (`[31, n, path]`, possible before `025e7429bc` in 0.92):
   would be the keyword value followed by the path.

### 4.11.4 Legacy shapes the current runtime does not support

The following require semantics that no longer exist (implicit `this` fallback, partials,
`{{#with}}`) and cannot be executed by the current runtime (no handler exists):

| Op | Name | Former meaning |
|---|---|---|
| 19 | Partial | `{{partial}}` (removed in Ember 4) |
| 33 | GetFreeAsFallback | free name falling back to `this.name` |
| 34 | GetFreeAsComponentOrHelperHeadOrThisFallback | `{{x}}` append: component, helper, else `this.x` |
| 36 | GetFreeAsHelperHeadOrThisFallback | `attr={{x}}`: helper, else `this.x` |
| 43 | With | `{{#with x as \|y\|}}` |
| 99 | GetFreeAsDeprecatedHelperHeadOrThisFallback | `@arg={{x}}`: helper (deprecated) else `this.x` |
| 5, 7, 20, 21 | StrictModifier, StrictBlock, DynamicArg, StaticArg | declared but never emitted by any producer since 0.74 |

*Note:* the historical semantics of 34/36/99 were:
resolve as the stated kinds; if not found, evaluate `this.<name>` (with the path, if any).
This is not part of the current language.

---

## 4.12 Worked examples

All output below was produced by running this repository's `ember-template-compiler`
(`packages/ember-template-compiler/minimal.ts` bundled with esbuild) with
`moduleName: 'demo.hbs'`; strict examples pass `lexicalScope` for the names listed. Block
JSON is shown decoded (the actual `block` property is this text as a JSON string).

### 4.12.1 Complete output, loose mode

```hbs
<h1 class="title">Hello, {{@name}}!</h1>
{{#if this.show}}<MyWidget @value={{this.v}} {{my-mod 1}} />{{else}}{{format-date this.d}}{{/if}}
```

`precompile()` returns the JavaScript text:

```js
{"id":"rlSG5XXh","block":"[[[10,\"h1\"],[14,0,\"title\"],[12],[1,\"Hello, \"],[1,[30,1]],[1,\"!\"],[13],[1,\"\\n\"],[41,[30,0,[\"show\"]],[[[8,[39,2],[[4,[38,3],[1],null]],[[\"@value\"],[[30,0,[\"v\"]]]],null]],[]],[[[1,[28,[35,4],[[30,0,[\"d\"]]],null]]],[]]]],[\"@name\"],[\"h1\",\"if\",\"my-widget\",\"my-mod\",\"format-date\"]]","moduleName":"demo.hbs","isStrictMode":false}
```

Decoded block, annotated:

```js
[
  [
    [10, "h1"],                 // <h1
    [14, 0, "title"],           //   class="title"   (0 = class)
    [12],                       // >
    [1, "Hello, "],             // text
    [1, [30, 1]],               // {{@name}}  slot 1 = symbols[0] = "@name"
    [1, "!"],
    [13],                       // </h1>
    [1, "\n"],
    [41, [30, 0, ["show"]],     // {{#if this.show}}
      [[                        //   default block, no params
        [8, [39, 2],            //   <MyWidget …/>  upvars[2] = "my-widget"
            [[4, [38, 3], [1], null]],       //  {{my-mod 1}}  upvars[3]
            [["@value"], [[30, 0, ["v"]]]],  //  @value={{this.v}}
            null]
      ], []],
      [[                        //   {{else}}
        [1, [28, [35, 4], [[30, 0, ["d"]]], null]]  // {{format-date this.d}}
      ], []]
    ]
  ],
  ["@name"],                                        // symbols
  ["h1", "if", "my-widget", "my-mod", "format-date"] // upvars ("h1","if" unused)
]
```

### 4.12.2 Complete output, strict mode with lexical scope

```hbs
<button type="button" {{on "click" this.go}} ...attributes>{{yield this.count to="label"}}</button>
<Card @title={{@title}}>
  <:header as |h|>{{h.text}}</:header>
  <:default>{{#each @items key="id" as |item|}}{{item.name}}{{/each}}</:default>
</Card>
```

(lexical: `on`, `Card`)

```js
{"id":"MOsi2ZNr","block":"[[[11,\"button\"],[24,4,\"button\"],[17,1],[4,[32,0],[\"click\",[30,0,[\"go\"]]],null],[12],[18,6,[[30,0,[\"count\"]]]],[13],[1,\"\\n\"],[8,[32,1],null,[[\"@title\"],[[30,2]]],[[\"header\",\"default\"],[[[[1,[30,3,[\"text\"]]]],[3]],[[[42,[28,[31,2],[[28,[31,2],[[30,4]],null]],null],\"id\",[[[1,[30,5,[\"name\"]]]],[5]],null]],[]]]]]],[\"&attrs\",\"@title\",\"h\",\"@items\",\"item\",\"&label\"],[\"yield\",\"each\",\"-track-array\"]]","moduleName":"demo.hbs","scope":()=>({on,Card}),"isStrictMode":true}
```

Notes:

- `<button>` has `...attributes` and a modifier, so it opens with 11 and its static
  `type` attribute is 24 (`4` = `type`).
- `[17,1]`: slot 1 = `&attrs`. `[18,6,…]`: slot 6 = `&label`.
- `on` is lexical index 0 (`[32,0]`), `Card` index 1 (`[32,1]`), matching the order of
  `()=>({on,Card})`.
- The `<:header>` block binds `h` to slot 3; `<:default>` has no params.
- Ember wrapped `@items` in `-track-array` (twice; see Open question 8), a strict keyword
  (`[31,2]`).

### 4.12.3 Control flow and curried values (strict)

| Template | Block |
|---|---|
| `{{#if @a}}A{{else if @b}}B{{else}}C{{/if}}` | `[[[41,[30,1],[[[1,"A"]],[]],[[[41,[30,2],[[[1,"B"]],[]],[[[1,"C"]],[]]]],[]]]],["@a","@b"],["if"]]` |
| `{{#unless @a}}A{{/unless}}` | `[[[41,[51,[30,1]],[[[1,"A"]],[]],null]],["@a"],["unless"]]` |
| `{{if @a 1}}{{if @a 1 2}}{{unless @a 1}}` | `[[[1,[52,[30,1],1]],[1,[52,[30,1],1,2]],[1,[52,[51,[30,1]],1]]],["@a"],["if","unless"]]` |
| `{{#let (component Foo a=1) as \|C\|}}<C />{{/let}}` (Foo lexical) | `[[[44,[[50,[32,0],0,null,[["a"],[1]]]],[[[8,[30,1],null,null,null]],[1]]]],["C"],["let","component"]]` |
| `<div {{(modifier @m 1)}}></div>` | `[[[11,0],[4,[50,[30,1],2,[1],null],null,null],[12],[13]],["@m"],["modifier"]]` |
| `{{yield 1 to="inverse"}}{{yield to="foo"}}` | `[[[18,1,[1]],[18,2,null]],["&else","&foo"],["yield"]]` |
| `{{has-block "foo"}}{{has-block-params}}{{(has-block)}}` | `[[[1,[48,[30,1]]],[1,[49,[30,2]]],[1,[48,[30,2]]]],["&foo","&default"],["has-block","has-block-params"]]` |
| `{{undefined}}{{null}}{{true}}{{1.5}}{{"s"}}` | `[[[1,[27]],[1,null],[1,true],[1,1.5],[1,"s"]],[],[]]` |
| `{{this}}{{this.a.b.c}}{{@a.b}}` | `[[[1,[30,0]],[1,[30,0,["a","b","c"]]],[1,[30,1,["b"]]]],["@a"],[]]` |
| `{{{@html}}}{{@text}}<!-- c -->{{! hb comment}}` | `[[[2,[30,1]],[1,[30,2]],[3," c "]],["@html","@text"],[]]` |
| `{{mut @x}}{{unbound @x}}` | `[[[1,[28,[31,0],[[30,1]],null]],[1,[28,[31,1],[[30,1]],null]]],["@x"],["mut","unbound"]]` |
| `<@comp @x={{1}} />` | `[[[8,[30,1],null,[["@x"],[1]],null]],["@comp"],[]]` |
| `<this.comp />` | `[[[8,[30,0,["comp"]],null,null,null]],[],[]]` |

### 4.12.4 Loose-mode resolution

| Template | Block |
|---|---|
| `{{foo}}` | `[[[1,[35,0]]],[],["foo"]]` |
| `{{foo 1 a=2}}` | `[[[1,[28,[35,0],[1],[["a"],[2]]]]],[],["foo"]]` |
| `{{foo bar}}` | `[[[1,[28,[35,0],[[31,1]],null]]],[],["foo","bar"]]` |
| `{{{foo 1}}}` | `[[[2,[28,[37,0],[1],null]]],[],["foo"]]` |
| `<div class={{foo}} title={{foo 1}} data-x="{{foo}}"></div>` | `[[[10,0],[15,0,[37,1]],[15,"title",[28,[37,1],[1],null]],[15,"data-x",[29,[[37,1]]]],[12],[13]],[],["div","foo"]]` |
| `<div class={{{this.x}}}></div><Foo class={{{this.x}}} title={{this.y}} />` | `[[[10,0],[22,0,[30,0,["x"]]],[12],[13],[8,[39,1],[[23,0,[30,0,["x"]]],[16,"title",[30,0,["y"]]]],null,null]],[],["div","foo"]]` |
| `{{#foo 1 a=2 as \|x\|}}{{x}}{{else}}no{{/foo}}` | `[[[6,[39,0],[1],[["a"],[2]],[["default","else"],[[[[1,[30,1]]],[1]],[[[1,"no"]],[]]]]]],["x"],["foo"]]` |
| `{{#this.foo}}x{{/this.foo}}` | `[[[6,[30,0,["foo"]],null,null,[["default"],[[[[1,"x"]],[]]]]]],[],[]]` |
| `{{@foo 1}}{{this.foo 1}}{{(this.foo 1)}}` | `[[[1,[28,[30,1],[1],null]],[1,[28,[30,0,["foo"]],[1],null]],[1,[28,[30,0,["foo"]],[1],null]]],["@foo"],[]]` |
| `{{component "x-y" a=1}}{{#component this.c}}b{{/component}}{{(component "x-y")}}` | `[[[46,"x-y",null,[["a"],[1]],null],[46,[30,0,["c"]],null,null,[["default"],[[[[1,"b"]],[]]]]],[46,"x-y",null,null,null]],[],["component"]]` |
| `<XFoo /><Foo::BarBaz />` | `[[[8,[39,0],null,null,null],[8,[39,1],null,null,null]],[],["x-foo","foo/bar-baz"]]` |
| `<div {{foo 1}}></div><Foo {{foo}} />` | `[[[11,0],[4,[38,1],[1],null],[12],[13],[8,[39,1],[[4,[38,1],null,null]],null,null]],[],["div","foo"]]` |
| `{{#let this.a this.b as \|a b\|}}{{a}}{{b}}{{/let}}` | `[[[44,[[30,0,["a"]],[30,0,["b"]]],[[[1,[30,1]],[1,[30,2]]],[1,2]]]],["a","b"],["let"]]` |
| `{{yield (hash a=1)}}` | `[[[18,1,[[28,[37,1],null,[["a"],[1]]]]]],["&default"],["yield","hash"]]` |
| `<input disabled value="x" />` | `[[[10,"input"],[14,"disabled",""],[14,2,"x"],[12],[13]],[],["input"]]` |
| `{{-get-dynamic-var "outletState"}}{{#-with-dynamic-vars outletState=@x}}y{{/-with-dynamic-vars}}` | `[[[1,[53,"outletState"]],[45,[["outletState"],[[30,1]]],[[[1,"y"]],[]]]],["@x"],["-get-dynamic-var","-with-dynamic-vars"]]` |
| `{{outlet}}` (Ember) | `[[[8,[30,1],null,null,null]],["@outlet"],[]]` |
| `{{mount "engine"}}` (Ember) | `[[[46,[28,[37,1],["engine"],null],null,null,null]],[],["component","-mount"]]` |

Note in the `<XFoo/>` row how the component name is stored post-customization, and in
the `<Foo {{foo}}/>` row how `"foo"` is shared by a modifier head (38) and a component
head (39).

### 4.12.5 Ember rewrites visible on the wire (strict)

| Template | Block |
|---|---|
| `{{#each @list key="id" as \|item idx\|}}{{item}}{{idx}}{{else}}empty{{/each}}` | `[[[42,[28,[31,1],[[28,[31,1],[[30,1]],null]],null],"id",[[[1,[30,2]],[1,[30,3]]],[2,3]],[[[1,"empty"]],[]]]],["@list","item","idx"],["each","-track-array"]]` |
| `{{#each-in @obj as \|k v\|}}{{k}}{{/each-in}}` | `[[[42,[28,[31,1],[[30,1]],null],null,[[[1,[30,3]]],[2,3]],null]],["@obj","v","k"],["each","-each-in"]]` |
| `{{#in-element @dest insertBefore=null}}x{{/in-element}}` | `[[[40,[[[1,"x"]],[]],"%cursor:0%",[28,[31,1],[[30,1]],null],null]],["@dest"],["in-element","-in-el-null"]]` |
| `{{#in-element @dest}}x{{/in-element}}` | `[[[40,[[[1,"x"]],[]],"%cursor:0%",[28,[31,1],[[30,1]],null]]],["@dest"],["in-element","-in-el-null"]]` |
| `<div ...attributes {{on "click" this.f}}></div>` (on lexical) | `[[[11,0],[17,1],[4,[32,0],["click",[30,0,["f"]]],null],[12],[13]],["&attrs"],[]]`, `scope: ()=>({on})` |
| `<Foo class="c" @a="s" @b={{1}} ...attributes {{m}} />` (Foo, m lexical) | `[[[8,[32,0],[[24,0,"c"],[17,1],[4,[32,1],null,null]],[["@a","@b"],["s",1]],null]],["&attrs"],[]]`, `scope: ()=>({Foo,m})` |
| `<svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href={{this.h}} /></svg>` | `[[[10,"svg"],[14,"xmlns:xlink","http://www.w3.org/1999/xlink","http://www.w3.org/2000/xmlns/"],[12],[10,"use"],[15,"xlink:href",[30,0,["h"]],"http://www.w3.org/1999/xlink"],[12],[13],[13]],[],[]]` |

### 4.12.6 Debugger

| Template | Block |
|---|---|
| `{{log @a 1}}{{debugger}}` | `[[[1,[54,[[30,1],1]]],[26,{},{"@a":1},{}]],["@a"],["log","debugger"]]` |
| `{{#let (hash a=1) as \|h\|}}{{h.a}}{{debugger}}{{/let}}` (hash lexical) | `[[[44,[[28,[32,0],null,[["a"],[1]]]],[[[1,[30,1,["a"]]],[26,{"h":1},{"let":0,"debugger":1},{}]],[1]]]],["h"],["let","debugger"]]` |

### 4.12.7 Minimal default template

`[[[18,1,null]],["&default"],[]]` — the built-in layout used for components without a
template (§4.3.2).

---

## 4.13 Reading aid: how the current consumer processes a template

This is a non-normative summary of what the current consumer does, as an aid to reading
the chapter. It is not a checklist that any implementation must satisfy.

1. It takes `{id, block: string, moduleName, scope?, isStrictMode}`; does nothing at factory
   creation time; and parses `block` on first `factory()` call.
2. It caches templates per owner (WeakMap) and one ownerless template.
3. On first use of a template, it calls `scope()` and takes `Object.values` (the array form works too).
4. It reads the block as `[statements, symbols, upvars]` (index ≥ 3 is ignored; the legacy
   boolean at index 2 is not handled, §4.11.2).
5. It allocates `symbols.length + 1` slots; slot 0 = self.
6. It compiles statements per §4.8, expressions per §4.6 and heads per §4.7, resolving
   resolvable heads once per template object.
7. It relies on the `@…`/`&…` names of layouts for invocation binding (§4.9).
8. It inflates well-known tag/attribute integers and honors attribute namespaces.
9. It distinguishes absent from present `insertBefore` on `InElement`.
10. It fails, without a clear error, on unknown opcodes (§4.1.2).

---

## 4.14 Open questions / inconsistencies

1. **Unused upvars.** The producer records keywords (`if`, `each`, `yield`, `let`,
   `debugger`, `component`, `has-block`, …) and, in loose mode, every plain element tag
   name (`packages/@glimmer/syntax/lib/v2/normalize.ts:847`) in `upvars`, although no
   opcode references them. This bloats output and could mislead tools that treat `upvars`
   as "names to resolve". Unclear whether any external tool depends on it.
2. **Free argument names in loose mode become `GetStrictKeyword`.** `{{foo bar}}` with free
   `bar` compiles to `[31,1]`. The static rule is §03-5.3, and the runtime failure is
   recorded as §08-14 Q16. The wire format has no dedicated opcode for it.
3. **Owner used for component templates.** Component definitions are cached per
   definition object in the program constants, so a component's `templateFactory(owner)`
   is invoked with the first owner that rendered it (`packages/@glimmer/program/lib/constants.ts:176-235`).
   This is host behavior, not wire format. It is recorded as §06-12 Q15.
4. **`scope()` call count.** `WrappedBuilder` calls `meta(layout)` (and thus `scope()`)
   in its constructor and again in `compile()`
   (`packages/@glimmer/opcode-compiler/lib/wrapped-component.ts:49`, `55`), and
   `asLayout`/`asWrappedLayout` each call it — so a scope thunk can run up to three times
   per template object. With side-effect-free thunks this is unobservable, but the values
   could differ if the underlying bindings were reassigned in between.
5. **Literal `TrustingAppend` renders as text.** `{{{"<b>x</b>"}}}` compiles to
   `[2,"<b>x</b>"]`, and the consumer's literal fast path appends it as a *text* node
   (`statements.ts:251-253`). The behavior is specified in §05-3.5 item 6 and recorded as
   §05-14 item 14.
6. **Block parameter under-supply.** When a block declares more parameters than values
   are yielded, the extra slots are not written (`blocks.ts:92-109`) and retain whatever
   the child scope inherited; since slots are unique per template this is normally
   "unset", but the exact value (`undefined` reference vs. stale value in re-invocations)
   is untested.
7. **`Debugger` symbol maps are inconsistent.** At top level the second element holds the
   `@args` map and the first is empty, so `get('@a')` in the debugger callback falls back
   to `this['@a']` (`packages/@glimmer/runtime/lib/compiled/opcodes/debugger.ts:56-76`);
   inside a block `@args` are in the first map and the second holds upvars. The third
   (`lexical`) map is always `{}` although its name suggests lexical names. The upvars map
   is computed after the entire template is normalized, so it includes names first used
   after the `{{debugger}}`.
8. **Double `-track-array`.** Ember's output wraps `{{#each}}` iterables in `-track-array`
   twice (`[28,[31,2],[[28,[31,2],[[30,4]],null]],null]`, §4.12.2), because the transform
   re-visits its own output. Recorded as §03-10 item 21.
9. **`InElement` guid collisions.** `"%cursor:N%"` restarts at 0 for every compiled
   template, so two templates each containing `{{#in-element}}` produce the same guid;
   rehydration's `querySelector('script[glmr="%cursor:0%"]')` scoped to the destination
   element can then pick the wrong marker when two remote blocks target the same element.
10. **`wire-format-debug.ts` mis-decodes `InElement`.** It prints `opcode[1]` (the block)
    as the guid position (`packages/@glimmer/compiler/lib/wire-format-debug.ts`); debug
    output only.
11. **Paths on contextual free opcodes.** The interface types still allow
    `[35|37|38|39, n, path]` (`api.d.ts:111-127`) but the producer never emits them. If
    one appears, the current consumer treats it as non-resolvable and, for 37, *ignores
    the path* (`expressions.ts:75-81`). The current consumer does not reject such tuples.
12. **Version-lock vs. published wire output.** The maintainers consider the format
    version-locked, yet `createTemplateFactory` output in published packages is still
    loaded by newer runtimes without any version marker; the 5.9–6.3 → 6.4 block-shape
    change silently breaks such packages. Adding a version field (or a shape check) would
    make failures diagnosable. Since wire format is not a compatibility requirement
    (§4.1.3), this is recorded as a note only.
13. **`Append` of a string head in a dynamic `Call`.** `{{@foo 1}}` where `@foo` is a
    string classifies as "string" content type, but the switch only has component and
    helper clauses; the fall-through lands in the helper clause and fails inside dynamic
    helper invocation with a less helpful error (`statements.ts:213-241`,
    `packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/conditional.ts:25-67`).
