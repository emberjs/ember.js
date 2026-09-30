# 03 — Static semantics: scope, resolution, keywords, and normalization

This chapter specifies everything a conforming implementation must decide about a template
*before it runs*: which names are bound where, which constructs are keywords, how each
invocation form is classified (component / helper / modifier / value / element), which
source-to-source rewrites Ember applies, and every compile-time error. Parsing (the ASTv1
tree, tokenizer errors) is in `02-syntax.md`. How the classified constructs evaluate is in
`05-runtime-semantics.md`. How they are serialized is in `04-wire-format.md`. How loose-mode
free variables are resolved against an owner at runtime is in `08-ember-integration.md`.

Throughout, "the reference implementation" means `@glimmer/syntax` + `@glimmer/compiler` +
the Ember AST plugins in `packages/@ember/template-compiler/lib/plugins`, as of Ember 7.5-alpha.

---

## 03-1 Pipeline and phase order

Compilation of one template has these static phases. Their **order matters**, because it
decides which error is reported when a template has more than one problem, and whether a
construct is rewritten before it is classified.

1. **Parse** to ASTv1 (§02). Parse-level errors (for example `Illegal use of ...attributes`,
   bad block-param syntax, literal callees in sub-expressions) happen here.
2. **Ember's source rewrites** (§03-7), implemented today as AST plugins run in array order
   over the ASTv1 tree. Each plugin is a full traversal
   (`packages/@glimmer/syntax/lib/parser/tokenizer-event-handlers.ts:794-802`). The Ember
   plugin list depends on the mode (§03-7). User plugins registered with the Ember compiler run
   *before* the built-in ones (`packages/@ember/template-compiler/lib/compile-options.ts:161-171`).
   Babel's `scope-locals-crawl` plugin runs *after* all of these
   (`babel-plugin-ember-template-compilation/src/plugin.ts:411-415`). User plugins are not part
   of the spec (§00-0.1 "Non-goals"); the order is stated here because it decides which error
   a template with several problems reports.
3. **Normalization** to ASTv2 (`packages/@glimmer/syntax/lib/v2/normalize.ts:37-66`). This
   phase builds the scope chain, turns every variable head into a typed reference
   (`This`, `Arg`, `Local`, `Free`, or strict-mode `Keyword`), gives each free variable
   its *resolution* (the namespaces it may be looked up in), classifies elements into
   simple elements, component invocations, and named blocks, and reports the
   "not in scope" errors for loose mode.
4. **Keyword translation** (`packages/@glimmer/compiler/lib/passes/1-normalization/`). Each
   `AppendContent`, `InvokeBlock`, `Call` expression, and `ElementModifier` whose callee is a
   bare free variable named after a keyword is checked against that keyword's rules and turned
   into a dedicated construct. Keyword misuse is reported here.
5. **Strict-mode validation** (strict mode only): any free variable that is still left
   after step 4 is a compile-time error
   (`packages/@glimmer/compiler/lib/passes/1-normalization/index.ts:96-98`,
   `.../visitors/strict-mode.ts`).
6. Encoding (§04).

Errors in steps 3–5 are `SyntaxError`s, built by `generateSyntaxError`
(`packages/@glimmer/syntax/lib/syntax-error.ts:8-24`). The message format is

```
<message>: \n\n|\n|  <source of the offending span, each line prefixed "|  ">\n|\n\n(error occurred in '<module>' @ line <L> : column <C>)
```

When the span is empty, the quoted-code part is left out. `<module>` is `meta.moduleName`,
or `an unknown module` when there is none. The error object has `name === 'SyntaxError'`,
`location` (the span), and `code` (the source text of the span). Tests assert on the message
and the span through `syntaxErrorFor(message, code, module, line, column)`
(for example `packages/@glimmer-workspace/integration-tests/test/syntax/named-blocks-test.ts`).
A conforming implementation MUST produce the same message text and point at the same span.
Wherever this chapter says "error *M* at *span*", it means this format.

Errors raised by the Ember plugins are **[Dev]** assertions (`assert` from `@ember/debug`),
thrown as `Error("Assertion Failed: <message>")`. They are removed in production builds of
the compiler. Most of them end with a location suffix built by `calculateLocationDisplay`
(`packages/@ember/template-compiler/lib/system/calculate-location-display.ts:3-28`):
`"('<moduleName>' @ L<line>:C<column>) "` when a module name is known, and
`"(L<line>:C<column>) "` when it is not. Note the trailing space.

---

## 03-2 Compile options that affect static semantics

| Option | Meaning |
|---|---|
| `strictMode: boolean` | Selects strict mode (RFC 0496) or **[Loose mode]**. The default is `false` for `precompile`, and `true` for the runtime `template()` API (`packages/@ember/template-compiler/lib/template.ts:240`). The babel plugin forces it to `true` for template-tag / RFC 931 input (`babel-plugin-ember-template-compilation/src/plugin.ts:428-430`). |
| `locals: string[]` | Names bound in the **template scope** from outside (JS bindings). The parser stores them as the template's `blockParams` (`tokenizer-event-handlers.ts:788-791`), and normalization uses them as the program's template locals (`normalize.ts:43-50`). The babel plugin fills this from the JS scope (§03-3.2). A `null` value is deleted (`compile-options.ts:128-135`). |
| `lexicalScope: (name) => boolean` | A predicate that also puts names in the template scope. The runtime `template()` API builds it from `scope` or `eval` (§03-3.2). `precompileJSON` defaults it to `() => false` (`packages/@glimmer/compiler/lib/compiler.ts:87`). |
| `keywords: string[]` | Extra "non-native" strict-mode keywords (§03-4.6). Ember sets it to `STRICT_MODE_KEYWORDS` whenever `strictMode` is true (`compile-options.ts:144-146`). It is ignored in loose mode (`tokenizer-event-handlers.ts:663-677`, `normalize.ts:127-129`). |
| `customizeComponentName(name)` | **[Loose mode]** Maps the name of a free angle-bracket component (§03-5.6). Ember installs the dasherizer (`compile-options.ts:64-73`). |
| `isProduction` | When true, `TransformInElement` does not add the `-in-el-null` check (§03-7.9). |
| `meta.moduleName` | Used in error messages. |
| `meta.jsutils` / `meta.emberRuntime` | Hooks used by `AutoImportBuiltins` (§03-7.1). `jsutils` is provided by the babel plugin. `emberRuntime` is provided by the runtime compiler (`compile-options.ts:76-86`). |
| `plugins.ast` | ASTv1 plugins (§03-1 step 2). |

---

## 03-3 Names, scopes, and free variables

### 03-3.1 Kinds of path heads

Every path expression `head(.member)*` and every angle-bracket tag `<head(.member)*>` has
exactly one head kind (heads are produced by the parser, §02):

| Surface | ASTv1 head | ASTv2 reference (after normalization) |
|---|---|---|
| `this`, `this.x` | `ThisHead` | `This`, or a `Local` named `this` when `this` is bound in scope (§03-3.5) |
| `@name`, `@name.x` | `AtHead` | `Arg` (a named-argument slot is allocated for `@name`) |
| `name`, `name.x` where `name` is bound | `VarHead` | `Local` |
| `name` where `name` is unbound | `VarHead` | `Free` (with a resolution, §03-5), or, in strict mode only, `Keyword` (§03-4.6) |

Normalization code: `normalize.ts:317-351` (`ref`) and `normalize.ts:220-256` (`path`).

### 03-3.2 The template scope

The outermost scope is the **template scope** (the "program symbol table",
`packages/@glimmer/syntax/lib/symbol-table.ts:52-173`). A name *N* is bound in the template
scope if either:

- *N* is in `locals` (`ProgramSymbolTable.has`, `symbol-table.ts:100-102`), or
- `lexicalScope(N)` returns true (`ProgramSymbolTable.hasLexical`, `symbol-table.ts:84-86`).

Both kinds are **template-local variables**: their values come from the JavaScript scope
that the compiled template is placed in (§01). The reference implementation records each
template local the first time it is used, in order of first use (`usedTemplateLocals`,
`symbol-table.ts:104-114`). This list becomes the template's `scope` closure (§04). Template
locals that are never referenced MUST NOT be captured.

How the host sets up the template scope (normative for the Ember APIs):

- **Babel / build time** (`babel-plugin-ember-template-compilation`): in *implicit* mode
  (template tag, `eval` form), every candidate upvar that the template references is added
  to `locals` when it has a JS binding in scope or is in the `ALLOWED_GLOBALS` set (§03-3.8).
  `this` is added when the template is somewhere that can see a lexical `this`
  (`babel-plugin-ember-template-compilation/src/scope-locals.ts:145-148, 153-216`). In
  *explicit* mode (`scope: () => ({...})`), `locals` is the keys of the scope object, minus
  any key that the template, after AST transforms, no longer references (`scope-locals.ts:176-189`).
- **Runtime `template()` with `scope`**: `lexicalScope(v) = v in scope() || v === '__ember_keywords__'`
  (`compile-options.ts:113-120`). The `scope` function is called **once, at compile time**,
  to find the names. The `ALLOWED_GLOBALS` are *not* consulted in this form.
- **Runtime `template()` with `eval`**: `lexicalScope(v)` is true when `v` is
  `__ember_keywords__`; otherwise, when `v` is in `ALLOWED_GLOBALS`, it is `v in globalThis`;
  otherwise it is true exactly when `v` is a syntactically valid JS identifier, `typeof v !==
  "undefined"` in the caller's scope (via the user's direct `eval`), **and** `typeof v` is
  `"undefined"` in the global scope. In other words, globals are not lexical except for the
  allowed ones (`compile-options.ts:88-111, 176-201`). If evaluating `typeof v` throws a
  `SyntaxError` (a reserved word), `v` is not in scope. Any other exception propagates.
- **Neither**: only `__ember_keywords__` is lexical (`compile-options.ts:122-126`).

*Note:* `__ember_keywords__` (`RUNTIME_KEYWORDS_NAME`, `compile-options.ts:37`) is an
implementation hook for auto-imported built-ins in the runtime compiler (§03-7.1). It is not
a valid template identifier that authors should use.

### 03-3.3 Block scopes

A new scope, which is a child of the enclosing scope, is created by:

1. **Curly blocks**: `{{#x ... as |a b|}} body {{else}} inverse {{/x}}`. The block params
   are in scope in `body` only. The inverse block (`{{else}}` and each chained
   `{{else if ...}}` section) is a separate child scope with its own block params, which
   in practice is none (`normalize.ts:494-535`: `Block()` creates `this.block.child(blockParams)`
   for each of program and inverse). Params, hash, and the callee of the block are evaluated
   in the **enclosing** scope.
2. **Element / component block params**: `<X ... as |a b|> children </X>`. The params are
   in scope in `children` only. The tag head, attributes, `@args`, and modifiers are
   evaluated in the **enclosing** scope (`normalize.ts:565-577`: the head, attrs, args, and
   modifiers are normalized with `this.ctx`, and children with `this.ctx.child(element.blockParams)`).
   For example, in `<Foo {{x}} as |x|>` the modifier `x` is the outer `x`, not the block
   param (verified: `x` compiles as a free modifier).
3. **Named blocks**: `<:name as |a|> ... </:name>`. The params are in scope in that named
   block's body. A named block is itself normalized as an element inside the component's
   child scope, so its own children get a further child scope (`normalize.ts:592-597`).

Block params are positional: the *i*-th name binds the *i*-th value that the block is
yielded (§05). A block may declare more params than it is yielded. The extra params are
still bound (for example `{{#let 1 2 as |a b c|}}{{c}}{{/let}}` compiles, and `c` is a
local). Block params are allowed syntactically on blocks that never yield values (for
example `{{#if a as |x|}}`). They are bound, but nothing ever assigns them (§03-10).

Duplicate names within one block-param list are not rejected by normalization. Lookup is
`indexOf` over the list, so the **first** occurrence wins (`symbol-table.ts:213-216`).
See §03-10.

### 03-3.4 Lookup and shadowing

Name lookup for a `VarHead` *N* at a given point:

```
lookup(N, scope):
  for s = scope; s is a block scope; s = s.parent:
    if N ∈ s.params: return Local(N, isTemplateLocal = false)      // innermost wins
  if N ∈ locals or lexicalScope(N): return Local(N, isTemplateLocal = true)
  return FREE
```

(`BlockSymbolTable.has/get`, `symbol-table.ts:204-216`, and `BlockContext.hasBinding`,
`normalize.ts:145-147`.)

Shadowing rules that a conforming implementation MUST follow:

- An inner block param shadows an outer block param with the same name, and any template
  local. Verified: `{{#let 1 as |x|}}{{#let 2 as |x|}}{{x}}{{/let}}{{x}}{{/let}}` refers to
  two different slots.
- A block param or template local shadows **every Glimmer-native keyword** (§03-4.2),
  because keyword matching requires a `Free` reference (`keywords/impl.ts:46-58`).
  For example, `{{#let this.foo as |if|}}{{if}}{{/let}}` renders the local `if`, and
  `{{#let this.foo as |yield|}}{{yield}}{{/let}}` renders the local `yield`. In strict mode,
  a template local named `if` used as `{{#if}}{{/if}}` is invoked as a component
  (`packages/@glimmer-workspace/integration-tests/test/strict-mode-test.ts:314-322`).
- A block param or template local shadows HTML-element interpretation of a lowercase tag
  (§03-5.4). For example, `{{#let this.foo as |div|}}<div></div>{{/let}}` invokes the local
  `div` as a component.
- A block param or template local shadows the auto-imported built-ins (`on`, `fn`, `array`,
  ...; §03-7.1).
- **Exception (strict mode, Ember keyword list)**: names in the `keywords` option
  (`mut`, `readonly`, `unbound`, and the internal `-each-in`, `-in-el-null`,
  `-track-array`, `-mount`) are shadowed **only** by `lexicalScope`. They are *not*
  shadowed by block params or by `locals` (`normalize.ts:127-129, 226-236`). This is
  observable: with `strictMode: true, locals: ['mut']`, `{{mut}}` compiles to the keyword
  and the JS binding is never captured. `{{#let 1 as |mut|}}{{mut}}{{/let}}` also compiles
  to the keyword (verified). This looks like a bug (§03-10). A conforming implementation
  aiming at bug-compatibility MUST reproduce it. An implementation MAY instead let locals
  shadow these names, since the current behavior is almost certainly unintended.
- `@args` and `this` are never shadowed by block params, because block params cannot be
  named `@x` (a parse error) and element block params cannot be named `this`
  (`tokenizer-event-handlers.ts:470`). But see §03-3.5 for curly block params named `this`.

### 03-3.5 `this`

`this` refers to the template's *self* (the component instance or other self value, §05),
unless `this` is bound in scope. In that case it is a `Local` named `this`
(`normalize.ts:323-328`). `this` is bound in scope when:

- `this` is a template local: the babel plugin adds `this` to `locals` when the template is
  in a position where JS `this` is lexically meaningful (`scope-locals.ts:168-171`), and the
  precompiler then emits `"this":this` in the scope closure
  (`packages/@glimmer/compiler/lib/compiler.ts:148-155`). The runtime `template()` with
  `scope: () => ({ this: ... })` does the same (`template.ts:288-306`).
- **[Quirk]** A *curly* block param is named `this`: `{{#let this.x as |this|}}{{this.y}}{{/let}}`
  compiles, and inside the block `this` is the block param (verified, in both modes). Element
  block params reject `this` (`tokenizer-event-handlers.ts:470`), but the Handlebars
  block-param grammar does not. See §03-10.

### 03-3.6 `@args`

`@name` always refers to the named argument `name` of the enclosing component invocation.
The enclosing invocation is the one whose template this is, not any block, because blocks
cannot rebind args. Each distinct `@name` used anywhere in the template is given one
named-argument slot (`symbol-table.ts:145-153`). A path such as `@a.b.c` is the arg `a`
followed by the member path `b.c`. `@args` are never free and never keywords.

Reserved argument names (**[Dev]**, Ember only, both modes; §03-7.4): `@arguments`, `@args`,
`@block`, `@else`, any `@` followed by a character other than `a`–`z`, and `@__ARGS__` as an
attribute name, or `__ARGS__` as a hash key.

### 03-3.7 Free variables

A **free variable** is a `VarHead` path head that `lookup` (§03-3.4) reports as `FREE`, or
an angle-bracket tag head that the element classifier (§03-5.4) decides is a component and
that is not bound. Free variables are recorded in the template's *upvar* list, in order of
first occurrence, with duplicates merged (`ProgramSymbolTable.allocateFree`,
`symbol-table.ts:124-143`). Angle-bracket component names are recorded *after*
`customizeComponentName` (§03-5.6).

- **Strict mode**: every free variable MUST be a keyword (§03-4) that is consumed by keyword
  translation. Any other free variable is a compile-time error (§03-5.2, §03-8).
- **[Loose mode]**: free variables are resolved at runtime through the owner's resolver
  (§08), in the namespaces given by their *resolution* (§03-5.3). Some forms of free
  variable are compile-time errors even in loose mode (§03-5.3).

*Note (wire format artifact):* in loose mode, the reference implementation also records the
tag name of every **simple element** (for example `div`) and every named-block tag (for
example `:default`, `:inverse`) as an upvar (`normalize.ts:846-848`). This has no semantic
effect, but it is visible in the serialized `upvars` (§04).

### 03-3.8 `ALLOWED_GLOBALS` (RFC 1070)

In strict mode, JS globals are *not* implicitly in scope. The exception is this fixed list,
which the babel plugin (implicit form) and the runtime `eval` form treat as bound when the
global exists: `globalThis, Atomics, JSON, Math, Reflect, localStorage, sessionStorage, URL,
isNaN, isFinite, parseInt, parseFloat, decodeURI, decodeURIComponent, encodeURI,
encodeURIComponent, postMessage, structuredClone, Array, BigInt, Boolean, Date, Number,
Object, String, Infinity, NaN, isSecureContext`
(`packages/@ember/template-compiler/lib/plugins/allowed-globals.ts:24-72`,
`babel-plugin-ember-template-compilation/src/scope-locals.ts:36-84`). The two copies MUST
stay identical. The explicit `scope` form does not add them. For example,
`template('{{Math.max 1 2}}', { scope: () => ({}) })` is a strict-mode "not in scope" error
(verified).

---

## 03-4 Keywords

### 03-4.1 Syntactic positions

A keyword is recognized by its **callee position**. There are four keyword positions, which
correspond to the four ASTv2 call-like nodes (`keywords/impl.ts:83-88`):

| Position | Surface forms | ASTv2 node |
|---|---|---|
| **Append** | `{{kw ...}}` and `{{{kw ...}}}` in content position | `AppendContent` |
| **Block** | `{{#kw ...}} ... {{/kw}}` | `InvokeBlock` |
| **Call** | `(kw ...)` anywhere, **and** a bare `{{kw}}` used as an attribute value, an `@arg` value, a hash-pair value, or an interpolation part (see below) | `Call` |
| **Modifier** | `<el {{kw ...}}>` | `ElementModifier` |

**Bare-path promotion.** In the following positions, a bare free path with no tail whose name
is in the keyword registry (§03-4.2) is first wrapped into a zero-argument `Call`, so that
Call keywords apply (`convertPathToCallIfKeyword`, `visitors/expressions.ts:166-176`):

- attribute values (`<div class={{has-block}}>`, `visitors/element/classified.ts:62`)
- component `@arg` values (`visitors/element/component.ts:22`)
- hash-pair values (`{{x a=has-block}}`, `visitors/expressions.ts:147-148`)
- each part of a quoted attribute interpolation (`visitors/expressions.ts:91`)

It is **not** applied to positional arguments. So `{{x has-block}}` passes a free variable
`has-block` (in loose mode it is looked up as a built-in keyword helper at runtime and fails;
in strict mode it is a "not in scope" error). See §03-10.

A keyword never matches when its callee has a path tail. Instead, when the head is a free
keyword name and there is a tail, the error is:

> ``The `<kw>` keyword was used incorrectly. It was used as `<source of path>`, but it cannot be used with additional path segments. \n\nError caused by`` at the whole node
> (`keywords/impl.ts:60-73`)

This error is only reachable in strict mode. In loose mode, `{{if.foo}}`, `{{#let.foo}}`, and
so on are rejected earlier by normalization with "You attempted to render/invoke a path ... but
`<kw>` was not in scope" (§03-5.3), because the dotted free path has no loose resolution
(verified).

### 03-4.2 The keyword registry

`KEYWORDS_TYPES` (`packages/@glimmer/syntax/lib/keywords.ts:24-44`) is the authoritative list
of Glimmer-native keyword names, with the positions in which each is *valid*:

| Keyword | Append | Block | Call | Modifier | Implemented by Glimmer compiler? |
|---|:-:|:-:|:-:|:-:|---|
| `component` | ✓ | ✓ | ✓ | | Yes |
| `debugger` | ✓ | | | | Yes |
| `each` | | ✓ | | | Yes |
| `each-in` | | ✓ | | | No (Ember rewrite to `each`, §03-7.6) |
| `has-block` | ✓ | | ✓ | | Yes |
| `has-block-params` | ✓ | | ✓ | | Yes |
| `helper` | ✓ | | ✓ | | Yes |
| `if` | ✓ | ✓ | ✓ | | Yes |
| `in-element` | | ✓ | | | Yes |
| `let` | | ✓ | | | Yes |
| `log` | ✓ | | ✓ | | Yes |
| `modifier` | | | ✓ | ✓ | Call: yes. Modifier position: no (§03-10) |
| `mount` | ✓ | | | | No (Ember rewrite, §03-7.10) |
| `mut` | ✓ | | ✓ | | No (runtime built-in keyword helper, §08) |
| `outlet` | ✓ | | | | No (Ember rewrite, §03-7.10) |
| `readonly` | ✓ | | ✓ | | No (runtime built-in keyword helper) |
| `unbound` | ✓ | | ✓ | | No (runtime built-in keyword helper) |
| `unless` | ✓ | ✓ | ✓ | | Yes |
| `yield` | ✓ | | | | Yes |

In addition, the Glimmer compiler implements two **internal** keywords that are *not* in
`KEYWORDS_TYPES` (so they get no misuse diagnostics and are not filtered by
`getTemplateLocals`):

| Keyword | Positions | Source |
|---|---|---|
| `-get-dynamic-var` | Append, Call | `keywords/call.ts:17`, `keywords/append.ts:22` |
| `-with-dynamic-vars` | Block | `keywords/block.ts:338-363` |

The set of names that the compiler actually translates, per position
(`keywords/append.ts:19-146`, `keywords/block.ts:14-385`, `keywords/call.ts:14-23`,
`keywords/modifier.ts:3`):

- **Append**: `has-block`, `has-block-params`, `-get-dynamic-var`, `log`, `if`, `unless`,
  `yield`, `debugger`, `component`, `helper`
- **Block**: `in-element`, `if`, `unless`, `each`, `let`, `-with-dynamic-vars`, `component`
- **Call**: `has-block`, `has-block-params`, `-get-dynamic-var`, `log`, `if`, `unless`,
  `component`, `helper`, `modifier`
- **Modifier**: *(none)*

### 03-4.3 Keyword matching algorithm

For a node *n* in position *P* (`keywords/impl.ts:46-80, 163-198`):

```
callee(n) = n.value (Append; unwrap Call to its callee) | n.callee (Block, Call, Modifier)
if callee(n) is Path with ref Free(name) and name is translated in P:
    if callee(n).tail non-empty: error "cannot be used with additional path segments" (§03-4.1)
    validate args (per keyword, §03-4.4); on failure: that keyword's error
    translate
else if callee(n) is Path with ref Free(name) and name ∈ KEYWORDS_TYPES
        and P ∉ KEYWORDS_TYPES[name]:
    error:
      "The `<name>` keyword was used incorrectly. It was used as <P-description>,
       but its valid usages are:\n\n<list>\n\nError caused by"  at n
else: not a keyword; continue with ordinary classification (§03-5)
```

`<P-description>` is `an append statement` | `a block statement` | `a call expression` |
`a modifier`. `<list>` is one line per valid position, joined by `"\n\n"`
(`keywords/impl.ts:201-225`):

- `- As an append statement, as in: {{<name>}}`
- `- As a block statement, as in: {{#<name>}}{{/<name>}}`
- `- As an expression, as in: (<name>)`
- `- As a modifier, as in: <div {{<name>}}></div>`

Notes:

- A name that is *valid* in *P* per `KEYWORDS_TYPES` but not *translated* in *P* (for
  example `mut` in Append, `unbound` in Call, `modifier` in Modifier, `outlet` in Append when
  no Ember plugin ran) falls through to ordinary classification as a free variable.
- The misuse check runs in both modes, and is covered by tests for every keyword and every
  invalid position (`packages/@glimmer-workspace/integration-tests/test/syntax/keyword-errors-test.ts:144-210`).
  Those tests also establish that every keyword **can be used as a plain value in argument
  position** without error (`{{some-helper <kw>}}`, lines 18-30), and can be a block param name.
- In strict mode, a name that has become a `Keyword` expression (§03-4.6) is never `Free`,
  so it never matches the Glimmer keyword table.

### 03-4.4 Per-keyword static rules

For each keyword: the accepted argument shape, the translation (described semantically;
evaluation is in §05), and the exact errors. "positional" and "named" refer to the call's
arguments. Unless noted, the error span is the whole node (`{{...}}` / `(...)` /
`{{#...}}...{{/...}}`).

#### `yield` (Append)

```
{{yield <positional>* (to=<string-literal>)?}}   (also {{{yield ...}}})
```

- Named arguments: none, or exactly `to`.
  - Any other named argument, or more than one: error ``yield only takes a single named argument: 'to'``
    at the named-arguments span (`keywords/append.ts:33-45`).
  - `to` whose value is not a string literal: error `you can only yield to a literal string value`
    at the value's span (`keywords/append.ts:47-53`).
- The target block name is `to`'s value, or `default`. The name `inverse` is normalized to
  `else` (`symbol-table.ts:155-158`), so `{{yield to="inverse"}}` and `{{yield to="else"}}`
  target the same block (verified).
- Positional arguments are the yielded values. Trusting (`{{{ }}}`) has no effect.

#### `has-block`, `has-block-params` (Append, Call)

```
(has-block) | (has-block <string-literal>)
```

- Named arguments: error `(<kw>) does not take any named arguments` (span: the call; for
  Append, the value's `Call` span, which equals the mustache span).
- No positionals: target `default`. One string literal: that block name (`inverse` → `else`).
  One non-string: error `(<kw>) can only receive a string literal as its first argument`.
  Two or more: error `(<kw>) only takes a single positional argument`
  (`keywords/utils/has-block.ts:12-43`).
- The result is a boolean-valued expression (§05). In Append position it is appended as
  text. Trusting has no effect.
- Tests: `packages/@glimmer-workspace/integration-tests/test/syntax/yield-keywords-test.ts`.

#### `if`, `unless` — inline form (Append, Call)

```
(if <cond> <truthy> <falsy>?)      (unless <cond> <falsy-branch> <truthy-branch>?)
```

- Named arguments: error `(<kw>) cannot receive named parameters, received <comma-separated names>`.
- 0 positionals: error `When used inline, (<kw>) requires at least two parameters 1. the condition that determines the state of the (<kw>), and 2. the value to return if the condition is <T>. Did not receive any parameters`
- 1 positional: the same prefix, ending `... is <T>. Received only one parameter, the condition`
- More than 3: `When used inline, (<kw>) can receive a maximum of three positional parameters 1. the condition that determines the state of the (<kw>), 2. the value to return if the condition is <T>, and 3. the value to return if the condition is <F>. Received <n> parameters`
- Here `<T>` is `true` for `if` and `false` for `unless`, and `<F>` is the other one
  (`keywords/utils/if-unless.ts:11-78`).
- `unless` is `if` with the condition negated (`if-unless.ts:104-106`). A missing third
  argument means `undefined` (§05).
- In Append position the result is appended as **text even inside `{{{ }}}`**: the trusting
  flag is dropped (`keywords/utils/call-to-append.ts:7-26`; verified
  `{{{if true "<b>"}}}` → a non-trusted append). The runtime rule is §05-3.5 item 6. See
  §03-10.
- Tests: `packages/@glimmer-workspace/integration-tests/test/syntax/if-unless-test.ts`.

#### `if`, `unless` — block form (Block)

```
{{#if <cond>}} ... ({{else}} ...)? {{/if}}
```

- Named arguments: error `{{#<kw>}} cannot receive named parameters, received <names>`.
- More than 1 positional: error `{{#<kw>}} can only receive one positional parameter in block form, the conditional value. Received <n> parameters`.
- 0 positionals: error `{{#<kw>}} requires a condition as its first positional parameter, did not receive any parameters`
  (`keywords/block.ts:92-215`).
- The `{{else}}` block, or chained `{{else if ...}}` (which the parser nests, §02), is the
  inverse. Block params are allowed but never bound.

#### `each` (Block)

```
{{#each <iterable> (key=<expr>)? as |item index|}} ... ({{else}} ...)? {{/each}}
```

- Named arguments other than `key`: error `{{#each}} can only receive the 'key' named parameter, received <names>`
  at the named-arguments span.
- More than 1 positional: error `{{#each}} can only receive one positional parameter, the collection being iterated. Received <n> parameters`
  at the positional span.
- 0 positionals: error `{{#each}} requires an iterable value to be passed as its first positional parameter, did not receive any parameters`
  at the args span (`keywords/block.ts:216-283`). **[Dev]** (Ember) In Ember this case is
  first caught by `TransformEachTrackArray` as `Assertion Failed: has firstParam` (§03-7.8).
- `key` may be any expression. Statically, nothing checks that it is a string.
- In Ember, the iterable is wrapped as `(-track-array <iterable>)` (§03-7.8).

#### `let` (Block)

```
{{#let <expr>+ as |a b ...|}} ... {{/let}}
```

- Named arguments: error `{{#let}} cannot receive named parameters, received <names>` at the named span.
- 0 positionals: error `{{#let}} requires at least one value as its first positional parameter, did not receive any parameters`
  at the positional span.
- An `{{else}}` block: error `{{#let}} cannot receive an {{else}} block` at the positional span
  (`keywords/block.ts:284-337`).

#### `in-element` (Block)

```
{{#in-element <destination> (insertBefore=<expr>)?}} ... {{/in-element}}
```

- A `guid` named argument: error ``Cannot pass `guid` to `{{#in-element}}` `` at the value span.
- 0 positionals: error `{{#in-element}} requires a target element as its first positional parameter`
  at the args span (`keywords/block.ts:15-43`).
- Extra positionals, other named arguments, and an `{{else}}` block are **silently ignored**
  (verified: the else block is dropped). See §03-10.
- **[Dev]** (Ember) `insertBefore` MUST be the literal `null` or `undefined`; otherwise
  `Assertion Failed: Can only pass null to insertBefore in in-element, received: <JSON of the ASTv1 node>`
  (§03-7.9).
- Each `in-element` gets a unique compile-time cursor id (`%cursor:<n>%`,
  `context.ts:24-26`), used by rehydration (§05, §04).

#### `-with-dynamic-vars` (Block, internal)

`{{#-with-dynamic-vars name=value ...}} ... {{/-with-dynamic-vars}}`: only the named
arguments are used. Positionals and `{{else}}` are silently ignored. There are no errors
(`keywords/block.ts:338-363`).

#### `-get-dynamic-var` (Append, Call, internal)

`(-get-dynamic-var <name-expr>)`:

- Named arguments: error `(-get-dynamic-vars) does not take any named arguments` (note the `s`).
- None: error `(-get-dynamic-vars) requires a var name to get`.
- More than 1: error `(-get-dynamic-vars) only receives one positional arg`
  (`keywords/utils/dynamic-vars.ts:12-37`).

#### `log` (Append, Call)

`(log <positional>*)`. Named arguments: error `(log) does not take any named arguments`
(`keywords/utils/log.ts:12-22`). The result is a value (`undefined`, §05). In Append position
it is appended as text.

#### `debugger` (Append)

`{{debugger}}` only. Any positional: error `debugger does not take any positional arguments`.
Otherwise, any named: error `debugger does not take any named arguments`
(`keywords/append.ts:78-105`). The translation captures the complete lexical scope at that
point (all visible block params, args, and template locals), for the debugger callback (§05).

#### `component`, `helper`, `modifier` (curry keywords)

```
(component <def> <positional>* <named>*)   {{component <def> ...}}   {{#component <def> ...}}...{{/component}}
(helper <def> ...)                          {{helper <def> ...}}
(modifier <def> ...)
```

Validation, shared by all positions (`keywords/utils/curry.ts:23-76`):

- 0 positionals: error `(<kw>) requires a <kw> definition or identifier as its first positional parameter, did not receive any parameters.`
  at the args span (note the final `.`).
- A *literal* first argument:
  - `component` in strict mode: error `(component) cannot resolve string values in strict mode templates`.
  - `helper` / `modifier` (either mode): error `(<kw>) cannot resolve string values, you must pass a <kw> definition directly`.
    **[Loose mode]** In Ember this is not reachable for *string* literals, because
    `TransformResolutions` rewrites them first (§03-7.11). It is reachable for other
    literals, such as `(helper 1)`.
  - `component` in loose mode: any literal is accepted and names a component to resolve at
    runtime (§08).

  Only the literal-ness of the first argument is checked. A non-string literal such as
  `(component 1)` is accepted in loose mode.
- The remaining positionals and the named arguments are curried (§05).

Translation by position:

| Keyword | Call `(kw ...)` | Append `{{kw ...}}` | Block `{{#kw}}` |
|---|---|---|---|
| `component` | a curried-component value | a dynamic component invocation with no blocks | a dynamic component invocation; `default` and `else` blocks are passed as the named blocks `default` / `else` (verified) |
| `helper` | a curried-helper value | the helper is **invoked** and its result appended as text (`keywords/append.ts:127-145`); `{{{ }}}` trusting is dropped | invalid (misuse error) |
| `modifier` | a curried-modifier value | invalid (misuse error) | invalid |

`{{modifier ...}}` in **modifier position** is not translated. It is an ordinary modifier
invocation whose callee is the free variable `modifier` (loose: resolved as a modifier named
`modifier`; strict: error `Attempted to resolve a modifier in a strict mode template, but that value was not in scope: modifier`).
Verified. Curried modifiers are applied through a dynamic callee: `<div {{(modifier this.m)}}>`
or `<div {{(if c (modifier on "click" f))}}>`.

### 03-4.5 Keywords that Glimmer recognizes but does not implement

`each-in`, `mount`, `outlet`, `mut`, `readonly`, `unbound` are in `KEYWORDS_TYPES`
only for misuse diagnostics and `getTemplateLocals` filtering. Their meaning comes from:

- Ember AST rewrites: `each-in` → `each` + `(-each-in)` (§03-7.6); `mount` →
  `{{component (-mount ...)}}` and `outlet` → `<@outlet />` (§03-7.10).
- Runtime built-in keyword helpers: `mut`, `readonly`, `unbound`, and the internal
  `-each-in`, `-track-array`, `-in-el-null`, `-resolve`, `-hash`, `-normalize-class`
  (`packages/@ember/-internals/glimmer/lib/resolver.ts:88-98`). In loose mode, a free
  `mut`/`readonly`/`unbound` callee resolves through the normal helper namespace. In strict
  mode it is a `Keyword` expression (§03-4.6) resolved against the built-in keyword helpers.

An implementation without the Ember plugins (plain Glimmer) treats `{{outlet}}`, `{{mount}}`,
and `{{#each-in}}` as ordinary free-variable invocations.

### 03-4.6 Non-native (host) keywords — strict mode

When `strictMode` is true, a bare `VarHead` path with **no tail** whose name is in the
`keywords` option, and for which `lexicalScope(name)` is false, is normalized to a `Keyword`
expression instead of a variable reference (`normalize.ts:226-236`). Such an expression:

- is never a strict-mode "not in scope" error (`strict-mode.ts:124`);
- is resolved at runtime by name against the host's built-in *keyword* helpers or modifiers
  (Ember: `lookupBuiltInHelper` / `lookupBuiltInModifier`, §08);
- is **not** shadowed by block params or `locals` (§03-3.4, §03-10).

Ember's list is `STRICT_MODE_KEYWORDS = ['mut', 'readonly', 'unbound', '-each-in',
'-in-el-null', '-track-array', '-mount']` (`packages/@ember/template-compiler/lib/plugins/index.ts:52-65`).
(`action` was removed from this list and from `KEYWORDS_TYPES` by emberjs/ember.js#21641; see
§03-7.3.) The `-` names can only arise from the Ember rewrites (§03-7), because they are not valid
JS identifiers. The Glimmer test `'Non-native keyword'` shows the generic mechanism
(`strict-mode-test.ts:98-118`).

In **[Loose mode]** the `keywords` option has no effect. The same names are just free
variables.

### 03-4.7 True keywords vs. strict-mode built-ins

RFC 0496 lists the strict-mode keywords as: `action, debugger, each-in, each, has-block-params,
has-block, hasBlock, if, in-element, let, link-to, loc, log, mount, mut, outlet, query-params,
readonly, unbound, unless, with, yield` (`rfcs/text/0496-handlebars-strict-mode.md`, "Keywords").
The current implementation differs:

- `action`, `hasBlock`, `link-to`, `loc`, `query-params`, and `with` are **not** keywords
  anymore (`with` was removed, RFC 0445; `action` by emberjs/ember.js#21641 after its helper and
  modifier were removed, RFC 1006; the others were removed with their features). In strict mode
  they are ordinary names and MUST be in scope.
- `component`, `helper`, `modifier` (RFC 0432), `debugger`, and the internal
  `-get-dynamic-var` / `-with-dynamic-vars` are keywords.

So a conforming strict-mode implementation MUST treat these as **keywords** (never needing to
be in scope, always shadowable by locals except as noted in §03-3.4):

> `component`, `debugger`, `each`, `each-in`, `has-block`, `has-block-params`, `helper`,
> `if`, `in-element`, `let`, `log`, `modifier` (Call only), `mount`, `outlet`, `unless`,
> `yield`, `mut`, `readonly`, `unbound`, `-get-dynamic-var`, `-with-dynamic-vars`.

Separately, these are **auto-imported built-ins** (RFCs 0997 `on`, 0998 `fn`, 0999 `hash`,
1000 `array`, 0560 `eq`/`neq`, 0561 `gt`/`gte`/`lt`/`lte`, 0562 `and`/`or`/`not`, 0389
`element`): `array, and, element, eq, fn, gt, gte, hash, lt, lte, neq, not, on, or`
(`plugins/auto-import-builtins.ts:10-25`). They are *not* keywords. They are ordinary values,
implicitly bound in the template scope in strict mode unless shadowed (§03-7.1). They can be
passed as values (for example `{{foo on}}`) and used in any position that fits their kind.
`concat`, `get`, `unique-id`, and the built-in components (`Input`, `Textarea`, `LinkTo`) are
**not** auto-imported, and in strict mode they MUST be imported.

**[Loose mode]** None of the built-ins are special at compile time. `{{array 1 2}}`,
`{{on ...}}`, and so on are free variables, resolved at runtime through the resolver's
built-in tables (§08).

---

## 03-5 Classification of invocation forms

### 03-5.1 Resolution classes

Every free variable gets one of these **resolutions**, which say how it is to be looked up
(`packages/@glimmer/syntax/lib/v2/objects/resolution.ts`):

| Resolution | Meaning (loose mode) |
|---|---|
| `Strict` | Not resolved through the owner. In strict mode it MUST be consumed by a keyword or be an error. In loose mode it is resolved only against the host's built-in *keyword* helpers (§08); failure is a **[Dev]** runtime-compile error (`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/resolution.ts:425-449`). |
| `Helper` | Resolve in the helper namespace. |
| `Modifier` | Resolve in the modifier namespace. |
| `Component` | Resolve in the component namespace. When it comes from an angle-bracket tag, the name was already mapped by `customizeComponentName`. |
| `ComponentOrHelper` | Try component first, then helper (§08). |

Two more reference kinds are bound, not free:

- `Lexical` (template-local): a `Local` with `isTemplateLocal = true`. Its value comes from
  the JS scope.
- `Local`: a block param.

In strict mode, every `Free` reference has resolution `Strict` (`normalize.ts:339`).

### 03-5.2 Strict mode classification

In strict mode, **no name is ever resolved by string**. Classification is purely by head
kind and position.

| Form | Head is local / template-local | Head is `this` / `@arg` | Head is a keyword for this position | Head is free (not keyword) |
|---|---|---|---|---|
| `{{x}}` | append the value of `x`, which, if it is a component/helper definition, is invoked (§05) | same, for the path | keyword | error: resolve a **value** |
| `{{x a}}` / `{{x k=v}}` | invoke `x` as helper or component (dynamic, §05) | same | keyword | error: resolve a **component or helper** |
| `{{x.y ...}}` | path `x.y` (value, or invoked if it has args) | same | error: keyword with additional path segments | error: resolve a value / component or helper, **name reported is the head** |
| `(x ...)` | helper invocation of `x` | same | keyword | error: resolve a **helper** |
| `{{#x}}...{{/x}}` | component invocation | same | keyword | error: resolve a **component** |
| `<div {{x}}>` | modifier invocation | same | (none) | error: resolve a **modifier** |
| `<X>` / `<x.y>` / `<@x>` / `<this.x>` | component invocation | component invocation | n/a | see §03-5.4 |
| attribute `a={{x}}`, `@a={{x}}`, `k=x`, positional `x` | value `x` | value | Call keywords only (§03-4.1) | error: resolve a **value** |
| attribute `a={{x y}}`, `@a={{x y}}` | helper call | helper call | keyword | error: resolve a **helper** |

Strict-mode "not in scope" error text (`visitors/strict-mode.ts:385-396`):

> `Attempted to resolve a <kind> in a strict mode template, but that value was not in scope: <name>`

`<kind>` is `value` | `component` | `helper` | `modifier` | `component or helper`, as in the
table. `<name>` is the head name only (for example `x` for `{{x.y}}`). The span rules come
from the validator (`strict-mode.ts:117-397`):

- An append with args reports kind `component or helper` at the append span. If the callee
  is fine but an argument is free, the argument is reported with kind `value`.
  `{{x (foo)}}` with neither bound reports `x` first (verified).
- A single positional argument is reported with the span of the enclosing statement for
  `{{yield foo}}`, `{{log foo}}`, `{{#if foo}}`, `{{#let foo}}`. With two or more positionals,
  each argument's own span is used (`strict-mode.ts:164-179`).
- A named argument is reported with the pair span (`a=foo`), and an attribute with the
  attribute span (`class={{foo}}`).
- A block's callee is reported with the callee span. A modifier's callee is reported with the
  modifier span.
- Validation is depth-first in document order, and the **first** error is reported.

Strict mode, angle brackets: see §03-5.4. The error for an uppercase tag that is not in scope
is raised during normalization (§03-5.4) and so happens before the strict validation pass.

Tests: `packages/@glimmer-workspace/integration-tests/test/strict-mode-test.ts:75-96, 414-562`.

### 03-5.3 Loose-mode classification

**[Loose mode]** The resolution of a free head depends on the syntactic position
(`packages/@glimmer/syntax/lib/v2/loose-resolution.ts:15-77`). Loose resolution applies only
to a **simple callee**: a `VarHead` with no tail. A free head with a tail in a callee
position is a compile-time error.

| Position | Simple free callee → resolution | Free head **with tail** → error |
|---|---|---|
| `{{x}}`, `{{x args}}` (append, `{{ }}`) | `ComponentOrHelper` | ``You attempted to render a path (`{{x.y}}`), but x was not in scope`` |
| `{{{x}}}`, `{{{x args}}}` | `Helper` | same message |
| `(x args)` | `Helper` | ``You attempted to invoke a path (`x.y`) but x was not in scope`` |
| `{{#x}}` | `Component` | ``You attempted to invoke a path (`{{#x.y}}`) but x was not in scope`` |
| `<div {{x}}>` | `Modifier` | ``You attempted to invoke a path (`{{x.y}}`) as a modifier, but x was not in scope`` |
| attribute `a={{x}}`, `a={{x args}}`, `a="..{{x}}.."` | `Helper` | ``You attempted to render a path (`{{x.y}}`), but x was not in scope`` |
| `@a={{x}}` (no args, no tail) | **error** (below) | render-path error above |
| `@a={{x args}}` / `@a="{{x}}"` | `Helper` | render-path error |
| `<X>` uppercase free | `Component` (angle bracket) | ``You attempted to invoke a path (`<X.y>`) but X was not in scope`` |
| `<x.y>` lowercase head free | — | ``You used x.y as a tag name, but x is not in scope`` |
| positional / hash **argument** `x` (value position) | `Strict` (built-in keyword helpers only, §03-5.1) | a value path `x.y` with a free head is **not** a compile error; its head is `Strict` |

Sources: `normalize.ts:197-216` (sexp), `446-489` (append), `494-525` (block), `611-628`
(modifier), `639-671` (attr), `796-860` (tag). The printed `<path>` is the path's source
printed with raw entity encoding (`normalize.ts:1076-1092`).

About the last row: for `{{foo bar.baz}}`, the argument `bar.baz` is normalized with
`STRICT_RESOLUTION` and does not go through `resolutionFor`, so there is no compile-time
error. The head `bar` becomes a `Strict` free variable (`normalize.ts:266, 339`).

This section owns the static side of loose-mode free names. §08-5 owns the runtime side. Two
runtime consequences are open questions there: a `Strict` value that is not a built-in keyword
helper fails with a **[Dev]** error whose text says "strict mode template" although the
template is loose (§08-14 Q16), and an argument-less `{{x}}` whose `ComponentOrHelper`
lookup finds nothing renders nothing, silently; this is required (§08-5.1).

**Arguments to components in loose mode.** An `@arg` whose value is `{{x}}`, where `x` is a
bare free `VarHead` with no tail, no params, and no hash, is an error unless `x` is
`has-block` (`normalize.ts:728-765`):

```
You attempted to pass a path as argument (`@a={{x}}`) but x was not in scope. Try:
* `@a={{this.x}}` if this is meant to be a property lookup, or
* `@a={{(x)}}` if this is meant to invoke the resolved helper, or
* `@a={{helper "x"}}` if this is meant to pass the resolved helper by value
```

The span is the whole attribute. Test:
`packages/@glimmer-workspace/integration-tests/test/syntax/argument-less-helper-paren-less-invoke-test.ts:13-34`.
Note that only `has-block` is exempt. `@a={{has-block-params}}`, `@a={{yield}}`, and so on
produce this error, and it happens *before* keyword processing. `@a="{{x}}"` (quoted) is
**allowed** and resolves `x` as a helper (same test, lines 48-58).

Why arguments are `Strict` in loose mode: the implicit `this`-fallback of `{{foo bar}}`
meaning `this.bar` (RFC 0308) and implicit invocation of argument-less helpers in argument
position (RFC 0432) were deprecated and removed. A free variable in value position therefore
has no loose-mode meaning, except for the built-in keyword helpers (`mut`, `readonly`,
`unbound`, and the internal `-…` helpers), which is what `Strict` resolution looks up. A
conforming implementation MUST NOT fall back to `this.<name>`.

**Loose-mode lexical scope quirk.** In loose mode with a `lexicalScope` predicate, the
"is this a free variable" test that `resolutionFor` uses checks only `locals`, not
`lexicalScope` (`normalize.ts:131-143`). So for a lexical `foo`, `{{foo}}` works (it becomes a
`Local`), but `{{foo.bar}}` fails with "You attempted to render a path (`{{foo.bar}}`), but foo
was not in scope" (verified). Angle-bracket tags handle this specially (`normalize.ts:834-836`),
so `<foo.bar>` works. See §03-10.

### 03-5.4 Element tag classification

Given an element tag *T* (the source tag name), split *T* on `.` into `head` and `rest`
(`normalize.ts:563`). Then:

```
if T starts with ':'                 → NamedBlock "T[1:]"  (see §03-5.5)
                                       (classifyTag still runs; loose mode records ":name" as an upvar)
uppercase(head) := first char c has c === c.toUpperCase() && c !== c.toLowerCase()
inScope := head starts with '@' || head === 'this' || lookup(head) ≠ FREE
                                       // lookup includes locals, lexicalScope, block params

STRICT:
  if !inScope and uppercase           → error (below)
  if !inScope                         → SimpleElement named T   (even if T contains '.'!)
  else                                → component; callee = path(head, rest)

LOOSE:
  if inScope or uppercase:            → component; callee = path(head, rest),
        resolution: if lexicalScope(head) → bound; else if head free:
            rest empty → Component (angle-bracket; name customized)
            rest non-empty → error "You attempted to invoke a path (`<T>`) but <head> was not in scope"
  else if rest non-empty              → error "You used <T> as a tag name, but <head> is not in scope"
  else                                → SimpleElement named T
```

(`normalize.ts:796-860`, `utils.ts:45-51`.) The strict-mode error for an uppercase tag that
is not in scope is:

> ``Attempted to invoke a component that was not in scope in a strict mode template, `<X>`. If you wanted to create an element with that name, convert it to lowercase - `<x>` ``

The span is the whole element, and `<x>` is `X.toLowerCase()` (`normalize.ts:804-810`). For a
dotted tag, `X` is the head only.

Consequences a conforming implementation MUST reproduce:

- `<foo-bar>` and `<foo>` are HTML elements when `foo-bar`/`foo` is not bound (custom elements
  are elements).
- A **lowercase** tag whose head is bound is a component: `{{#let x as |div|}}<div />{{/let}}`
  and, in strict mode, `<foo />` with `foo` in scope (verified).
- `<this>`, `<this.x>`, `<@x>`, `<@x.y>` are dynamic component invocations in both modes.
- Uppercase is decided by the first character only, and a character with no case (`_`, `$`,
  digits) is not uppercase. `<Foo-bar>` is a component named `foo-bar`.
- **[Strict quirk]** `<x.y />` with `x` not in scope is a simple element with the literal tag
  name `x.y`, and no error is raised (verified). See §03-10.

A simple element (`SimpleElement`) additionally MUST NOT have:

- block params: error `Unexpected block params in <tag>: simple elements cannot have block params`
  (`normalize.ts:973-978`);
- named-block children: error `Unexpected named block <:foo> inside <tag> HTML element` when there
  is one. The text literally says `<:foo>` whatever the block's name, a bug; see §03-10. With
  several: `Unexpected named blocks inside <tag> HTML element (<:a>, <:b>)`
  (`normalize.ts:980-995`);
- `@args`: error ``@a is not a valid attribute name. @arguments are only allowed on components, but the tag for this element (`div`) is a regular, non-component HTML element.``
  at the attribute (`visitors/element/simple-element.ts:21-28`).

### 03-5.5 Named blocks and component bodies

For a component invocation *C* that is not self-closing, the children are partitioned into
named blocks (`<:name>` children) and other content (`normalize.ts:867-1056`):

- If there are **no** named-block children, the whole body becomes the single named block
  `default`, with *C*'s block params.
- If there **are** named-block children:
  - Any other content that has semantic meaning is an error:
    `Unexpected content inside <C> component invocation: when using named blocks, the tag cannot contain other content`.
    Whitespace-only text, HTML comments, and `{{! }}` comments do not count (`normalize.ts:878-893`).
  - *C* having block params is an error:
    `Unexpected block params list on <C> component invocation: when passing named blocks, the invocation tag cannot take block params`.
  - Two blocks with the same name:
    ``Component had two named blocks with the same name, `<:n>`. Only one block with a given name may be passed``.
  - Both `<:else>` and `<:inverse>` (in either order):
    `Component has both <:else> and <:inverse> block. <:inverse> is an alias for <:else>`.
- A self-closing component has **no** blocks, not even an empty `default`
  (`builders.ts:370-385,388-403`). An empty non-self-closing component has an empty `default` block.

A named block element itself:

- MUST NOT be self-closing: `<:n/> is not a valid named block: named blocks cannot be self-closing`.
- MUST NOT contain named blocks: `Unexpected named block inside <:n> named block: named blocks cannot contain nested named blocks`.
- MUST begin with a lowercase letter (same case test as §03-5.4):
  `<:N> is not a valid named block, and named blocks must begin with a lowercase letter`.
- MUST NOT have attributes, `@args`, or modifiers: `named block <:n> cannot have attributes, arguments, or modifiers`.
  (`normalize.ts:930-970`)
- MAY have block params (`<:main as |x|>`).
- Is only valid as a direct child of a component invocation. At the template top level:
  `Unexpected named block at the top-level of a template`. Inside a curly block:
  `Unexpected named block nested in a normal block`. Inside an HTML element: see §03-5.4.
- `<:inverse>` is an alias of `<:else>`. The name is canonicalized to `else` when blocks are
  referenced (`yield to=`, `has-block`; `symbol-table.ts:155-158`) and when encoded
  (`packages/@glimmer/compiler/lib/passes/2-encoding/content.ts:189-191`).

Named blocks are RFC 0226 and RFC 0460.

### 03-5.6 Loose-mode component name mapping

**[Loose mode]** An angle-bracket free component head is passed through `customizeComponentName`
before it is recorded (`symbol-table.ts:127-132`). The mapping applies only to
`Component`-resolution free variables that come from an angle-bracket tag (`isAngleBracket`).
Curly `{{#FooBar}}` and `{{FooBar}}` are **not** mapped (verified: the upvar is `FooBar`).

Ember's mapping (`packages/@ember/template-compiler/lib/dasherize-component-name.ts:7-22`):
every `::` becomes `/`, and every uppercase ASCII letter `A`–`Z` becomes its lowercase form,
preceded by `-` unless it is at index 0 or the previous source character is not `[A-Za-z0-9]`.
Examples (verified): `Foo` → `foo`, `XFoo` → `x-foo`, `FooBAR` → `foo-b-a-r`,
`Foo1Bar` → `foo1-bar`, `Foo_Bar` → `foo_bar`, `Foo::Bar::BazQux` → `foo/bar/baz-qux`.

**[Dev]** A tag containing `:` but not `::` fails with ``Assertion Failed: You tried to invoke a
component named <Foo:bar /> in "<moduleName or [NO MODULE]>", but that is not a valid name for a
component. Did you mean to use the "::" syntax for nested components?``
(`compile-options.ts:27-29, 64-73`).

This is RFC 0311 (angle brackets) and RFC 0457 (nested `::` lookups). In strict mode none of
this applies, because a free uppercase tag is an error.

### 03-5.7 Other classification rules

- **Literals in callee position.** In the parser, a mustache whose path is a literal
  **drops** its params and hash: `{{"foo" 1}}` is `{{"foo"}}` and `{{true 1}}` is `{{true}}`
  (`packages/@glimmer/syntax/lib/parser/handlebars-node-visitors.ts:247-255`; verified). See
  §03-10. Normalization has an `Unexpected literal \`<v>\`` check for this case
  (`normalize.ts:451-456, 1071-1074`), but that check is unreachable for mustaches coming from
  the parser. It is reachable for block statements, sub-expressions, and modifiers built by
  AST plugins. Parser-produced literal callees in those positions fail earlier, in the parser:
  `(true)` → `BooleanLiteral "true" cannot be called as a sub-expression, replace (true) with true`,
  and `<div {{"foo"}}>` → `In <div ... {{"foo"}} ..., {{"foo"}} is not a valid modifier`
  (§02).
- **Sub-expression callee.** `{{(foo)}}` is the append of the call `(foo)`. `{{(foo) 1}}`
  (a call whose callee is itself a call) throws a plain `Error("unimplemented: subexpression at the head of a subexpression")`
  (`visitors/expressions.ts:102-103`; verified).
  `<div {{(modifier ...)}}>` works, because a modifier with a `Call` callee is fine.
- **Append without args.** `{{x}}` with an empty argument list is represented as appending the
  path itself, not a call (`normalize.ts:478`). `{{x.y}}` where `x` is bound is a path append.
  Whether the value is then invoked is a runtime decision (§05).
- **`...attributes`** is only valid as an attribute. On any element or component it allocates
  the `attrs` block symbol (`normalize.ts:712-714`). `{{...attributes}}` anywhere else is the
  parse error `Illegal use of ...attributes` (`handlebars-node-visitors.ts:240-244`).
- **`type` attribute ordering.** On an element with no `...attributes`, a `type` attribute is
  moved after all other attributes, and modifiers come after all attributes
  (`visitors/element/classified.ts:102-156`). This is a static reordering. §05-4.1 owns the
  full parameter-order rule and its DOM effect.
- **`@arg` values.** A valueless `@a` means the empty string `""` (verified: `<Foo @a />`).

---

## 03-6 The normalized model (ASTv2)

ASTv2 is the canonical semantic tree. Every node has a `loc` (source span). A conforming
implementation does not have to build ASTv2 literally, but its semantic model MUST make the
same distinctions. Definitions: `packages/@glimmer/syntax/lib/v2/objects/*.ts`. Informal
grammar: `packages/@glimmer/syntax/lib/v2/objects/ebnf/ASTv2.ebnf`.

### 03-6.1 Top level

- **`Template`** `{ table: ProgramSymbolTable, body: ContentNode[] }`
  (`objects/internal-node.ts:14-18`). The table records the used template locals (in order),
  the upvars (free names, in order), the named-arg slots, and the block slots
  (`&default`, `&else`, `&attrs`, `&<name>`).
- **`Block`** `{ scope: BlockSymbolTable, body }`. The scope lists the block params.
- **`NamedBlock`** `{ name: SourceSlice, block: Block, attrs: [], componentArgs: [], modifiers: [] }`.
  The attrs, args, and modifiers are always empty (they are reserved).
- **`NamedBlocks`** `{ blocks: NamedBlock[] }`, with `get(name)`.

### 03-6.2 Content nodes

| Node | Fields | Meaning |
|---|---|---|
| `HtmlText` | `chars` | literal text |
| `HtmlComment` | `text` | an HTML `<!-- -->` comment (rendered) |
| `GlimmerComment` | `text` | a `{{! }}` comment (not rendered; dropped by the compiler, `visitors/statements.ts:27-28`) |
| `AppendContent` | `value: Expr`, `trusting: bool`, `table` | `{{value}}` / `{{{value}}}`. The `callee` / `args` views unwrap a `Call` value. |
| `InvokeBlock` | `callee`, `args`, `blocks` (`default` and optional `else`) | `{{#callee args}}...{{else}}...{{/callee}}` (`builders.ts:294-321`) |
| `InvokeComponent` | `callee: Expr`, `attrs: (HtmlAttr|SplatAttr)[]`, `componentArgs: ComponentArg[]`, `modifiers`, `blocks` | an angle-bracket component invocation |
| `SimpleElement` | `tag`, `attrs`, `componentArgs` (always empty after validation), `modifiers`, `body` | an HTML element |

### 03-6.3 Attribute-block nodes

| Node | Meaning |
|---|---|
| `HtmlAttr { name, value: Expr, trusting }` | An attribute. `value` is a string `Literal` for static values, an expression for `a={{e}}`, or `Interpolate` for a quoted value with curlies. `trusting` is true for static text and `{{{ }}}` parts, and false for interpolations (`normalize.ts:677-707`). |
| `SplatAttr { symbol }` | `...attributes`. Its order relative to `HtmlAttr` is significant (§05). |
| `ComponentArg { name, value, trusting }` | `@name=value` |
| `ElementModifier { callee, args }` | `{{callee args}}` in an open tag |

### 03-6.4 Expressions

| Node | Meaning |
|---|---|
| `Literal { value: string\|number\|boolean\|null\|undefined }` | |
| `Path { ref: VariableReference, tail: SourceSlice[] }` | `ref` followed by member names. The tail is kept exactly as written (no splitting beyond `.`). |
| `Keyword { name, symbol }` | A strict-mode host keyword (§03-4.6). It never has a tail. |
| `Call { callee, args }` | `(callee args)`, or an append/attr with args. |
| `Interpolate { parts: Expr[] }` | A quoted attribute value with dynamic parts. Text parts are string literals. |

References: `This`, `Arg { name, symbol }`, `Local { name, isTemplateLocal, symbol }`, and
`Free { name, resolution, symbol }` (`objects/refs.ts`).

`Args { positional: { exprs }, named: { entries: { name, value }[] } }`. Named arguments keep
their source order. Positional and named arguments are normalized with `Strict` resolution
for any free heads they contain (`normalize.ts:266, 303`).

### 03-6.5 After keyword translation

Keyword translation (§03-4.4) replaces nodes with dedicated constructs: `Yield(target,
positional)`, `HasBlock(target)`, `HasBlockParams(target)`, `IfInline(cond, truthy, falsy?)`
(where `unless` is `IfInline(Not(cond), ...)`), `If(cond, block, inverse?)` (where
`unless` is `If(Not(cond), ...)`), `Each(value, key?, block, inverse?)`, `Let(positional, block)`,
`InElement(destination, insertBefore?, guid, block)`, `WithDynamicVars(named, block)`,
`GetDynamicVar(name)`, `Log(positional)`, `Debugger(scope)`, `Curry(type, definition, args)`,
`InvokeComponent(definition, args, blocks?)` (dynamic `component`), and a helper-call append
for `{{helper ...}}` (`packages/@glimmer/compiler/lib/passes/2-encoding/mir.ts`). Their
runtime semantics are in §05.

---

## 03-7 Ember AST transforms

The rewrites in this section are how the spec states the meaning of the constructs they
touch: a template means what its rewritten form means. That meaning, and the errors the
rewrites report, are normative. Implementing them as AST transforms, in this order and with
these names, is not (§00-0.1 "Non-goals"; §08-1.4 states the same for the runtime-relevant
rewrites). Where a rewrite's order is observable (for example, which error wins), the
section says so.

### 03-7.0 Order and applicability

**[Loose mode]** (`RESOLUTION_MODE_TRANSFORMS`, `plugins/index.ts:28-39`), in order:
1 `TransformQuotedBindingsIntoJustBindings`, 2 `AssertReservedNamedArguments`,
3 `TransformActionSyntax`, 4 `AssertAgainstAttrs`, 5 `TransformEachInIntoEach`,
6 `AssertInputHelperWithoutBlock`, 7 `TransformInElement`, 8 `TransformEachTrackArray`,
9 `AssertAgainstNamedOutlets`, 10 `TransformWrapMountAndOutlet`, 11 `TransformResolutions`.

Strict mode (`STRICT_MODE_TRANSFORMS`, `plugins/index.ts:41-50`), in order:
1 `AutoImportBuiltins`, 2 `TransformQuotedBindingsIntoJustBindings`,
3 `AssertReservedNamedArguments`, 4 `TransformActionSyntax`, 5 `TransformEachInIntoEach`,
6 `TransformInElement`, 7 `TransformEachTrackArray`, 8 `AssertAgainstNamedOutlets`,
9 `TransformWrapMountAndOutlet`.

The same lists live in `packages/ember-template-compiler/lib/plugins` (the build-time
entry point) through re-exports.

**Local tracking.** Several plugins skip a node when its name is a "local", using
`trackLocals` (`plugins/utils.ts:28-65`). `hasLocal(name)` is true when *name* is a block param
of an enclosing `Block` or `ElementNode`, is in the template's `locals`, or
`lexicalScope(name)` is true. Differences from normalization scoping (§03-3), which an
implementation must reproduce to match exactly:

- An `ElementNode`'s block params count as in scope **for the element's own attributes and
  modifiers**, not only its children, because the params are pushed on element `enter`.
- The counter bug: for `Block` and `ElementNode`, the count is read with the `VarHead` object
  as the map key instead of its name (`utils.ts:36`), so nested shadowing of the *same* name
  is not reference-counted. Leaving the inner scope removes the name completely. See §03-10.

#### 03-7.1 `AutoImportBuiltins` (strict only)

`plugins/auto-import-builtins.ts`. For every `PathExpression` whose `original` (the full
source path text) is **exactly** one of `array, eq, element, and, fn, hash, neq, gt, gte, lt,
lte, not, on, or`, and which is not `hasLocal`:

- with `meta.jsutils` (babel): replace `original` with the identifier returned by
  `jsutils.bindImport(<module>, <name>, node, { nameHint: "__keyword__<name>" })`. `<module>`
  is `@ember/modifier` for `on` and `@ember/helper` for the others. This adds a JS import (or
  reuses an existing binding) and makes the identifier a template local;
- else with `meta.emberRuntime` (runtime `template()`): replace `original` with
  `__ember_keywords__.<name>`, which is a path on the always-lexical `__ember_keywords__`
  binding whose value is the built-in (`compile-options.ts:39-54, 77-86`). **[Dev]** An
  unknown name asserts `<name> is not a known keyword. Available keywords: ...`, which is
  unreachable from this plugin;
- else (plain `precompile` in strict mode without babel): no rewrite, so the name must be
  in scope (verified: `{{on}}` is then "not in scope").

It applies in every path position (callee, argument, modifier). Paths with tails (`on.x`),
`this.on`, and `@on` are not affected. Tests: `packages/@glimmer-workspace/integration-tests/test/keywords/*-test.ts`
(for example `keywords/on-test.ts:77-` shadowing; `keywords/and-test.ts:57-69` "explicit
scope (shadowed)"), and `packages/ember-template-compiler/tests/plugins/assert-array-test.js`
(block-param and lexical `array` are not transformed).

#### 03-7.2 `TransformQuotedBindingsIntoJustBindings` (both)

`plugins/transform-quoted-bindings-into-just-bindings.ts`. For each element (or component,
because both are `ElementNode`s), find the **first** attribute named exactly `style`. If its
value is a quoted concatenation with exactly one part, and that part is a mustache, replace
the value with that mustache. So `style="{{x}}"` behaves like `style={{x}}`, and the value is
no longer stringified by concatenation (see §05 for the effect on `SafeString` warnings).
`style="a {{x}}"` is unchanged. No errors.

#### 03-7.3 `TransformActionSyntax` (removed)

This rewrite, which inserted `this` as the first argument of `{{action …}}`, `(action …)` and
`<div {{action …}}>`, was removed together with `action`'s keyword status by
emberjs/ember.js#21641 (which deleted `plugins/transform-action-syntax.ts`; test
`packages/@ember/-internals/glimmer/tests/integration/action-is-not-a-keyword-test.js`). The runtime `action` helper and modifier had already been
removed (RFC 1006). `action` is now an ordinary name: in strict mode it must be in scope, and a
lexical `action` binding is used like any other; in loose mode `action` resolves through the
registry like any other helper or modifier, and a registered `helper:action` receives exactly
the arguments written. What an unresolved `action` does at runtime is §08-2.20.

#### 03-7.4 `AssertReservedNamedArguments` (both) [Dev]

`plugins/assert-reserved-named-arguments.ts`. Assertion messages, each followed by `" " +
calculateLocationDisplay(...)`:

- attribute named `@__ARGS__`: `'@__ARGS__' is reserved.`
- hash pair key `__ARGS__`: `'__ARGS__' is reserved.`
- any path whose `original` is `@arguments`, `@args`, `@block`, `@else`, or matches
  `/^@[^a-z]/` (for example `@Foo`, `@_foo`, `@__ARGS__`): `'<original>' is reserved.`
  This applies to the **whole** original text, so `@args.foo` is *not* reserved, while
  `@Foo.bar` is (because of the regex).

Tests: `packages/ember-template-compiler/tests/plugins/assert-reserved-named-arguments-test.js`.

#### 03-7.5 `AssertAgainstAttrs` (loose) [Dev] [Legacy]

`plugins/assert-against-attrs.ts`:

- A path whose head is the free variable `attrs` (not `hasLocal`): assertion
  ``Using {{attrs}} to reference named arguments is not supported. {{<original>}} should be updated to {{@<original minus "attrs.">}}. <loc>``.
- A path `this.attrs...` (`ThisHead` and first tail segment `attrs`): a deprecation
  (`id: 'attrs-arg-access'`, `until: '6.0.0'`, `for: 'ember-source'`), and the path is
  **rewritten** to `@<original minus "this.attrs.">`. For example `this.attrs.foo` → `@foo`
  (verified). The deprecation's `until` is already past, but it still only logs (verified in
  a dev build). See §03-10. A bare `{{this.attrs}}` is rewritten to `@` plus the empty string,
  which is an invalid `@`-path (§03-10).

#### 03-7.6 `TransformEachInIntoEach` (both)

`plugins/transform-each-in-into-each.ts`. For every `BlockStatement` whose path's `original`
is `each-in` (**no local check**):

- `params[0]` is replaced by `(-each-in params[0])`. The remaining params are kept.
- Block params `|k v rest...|` become `|v k rest...|`. A single `|k|` becomes
  `|( unused value ) k|`, which uses an un-writable dummy name. No block params stay none.
- The result is `{{#each ...}}` with the same hash, program, and inverse.

Because `-each-in` wraps the value, `TransformEachTrackArray` later skips it. With no
params (`{{#each-in}}{{/each-in}}`) it is a syntax error, in every build:
`{{#each-in}} requires an object to be passed as its first positional parameter, did not receive any parameters`
(span: the block; `plugins/transform-each-in-into-each.ts:36-41`; test
`packages/ember-template-compiler/tests/plugins/transform-each-in-into-each-test.js`). Before
emberjs/ember.js#21635 this threw a `TypeError`.

#### 03-7.7 `AssertInputHelperWithoutBlock` (loose) [Dev]

`{{#input ...}}` (a block statement whose path's `original` is `input`, and `!hasLocal('input')`):
`The {{input}} helper cannot be used in block form. <loc>` (`plugins/assert-input-helper-without-block.ts`).

#### 03-7.8 `TransformEachTrackArray` (both)

`plugins/transform-each-track-array.ts`. For every `{{#each}}` (`original === 'each'`,
`!hasLocal('each')`):

- **[Dev]** A missing first param asserts `has firstParam`. In production builds the plugin
  goes on with `undefined`. See §03-10.
- If `params[0]` is already `(-each-in ...)`, leave it alone.
- Otherwise replace `params[0]` with `(-track-array params[0])`.
- The visitor returns a *new* `BlockStatement` (`transform-each-track-array.ts:49-57`), which
  the traversal visits again, so the current output wraps the iterable **twice**:
  `{{#each this.x}}` compiles to `(-track-array (-track-array this.x))` in both modes
  (verified). Because `-track-array` returns its argument unchanged, the second wrapper has no
  observable effect (§08-2.14). See §03-10 item 21.

#### 03-7.9 `TransformInElement` (both)

`plugins/transform-in-element.ts`. For every `{{#in-element}}` (**no local check**):

- If there is a first param and `!isProduction`, replace it with `(-in-el-null <param>)` (a
  development-time null check, §08).
- **[Dev]** For each hash pair `insertBefore` whose value is not a `NullLiteral` or
  `UndefinedLiteral`: ``Can only pass null to insertBefore in in-element, received: <JSON.stringify(ASTv1 value node)>``.
  There is no location suffix.

#### 03-7.10 `AssertAgainstNamedOutlets` and `TransformWrapMountAndOutlet` (both)

- `plugins/assert-against-named-outlets.ts` **[Dev]**: a mustache `{{outlet <any positional> ...}}`
  (`original === 'outlet'`, `!hasLocal('outlet')`) asserts
  `Named outlets were removed in Ember 4.0. See https://deprecations.emberjs.com/v3.x#toc_route-render-template for guidance on alternative APIs for named outlet use cases. <loc>`.
- `plugins/transform-wrap-mount-and-outlet.ts`: for a `MustacheStatement` (`{{ }}` or
  `{{{ }}}`) whose path is not `hasLocal`:
  - `{{mount <params> <hash>}}` → `{{component (-mount <params> <hash>)}}`. `-mount` is a
    `Helper` free variable in loose mode, and a `Keyword` in strict mode.
  - `{{outlet}}` → `<@outlet />`, a self-closing component invocation of the named argument
    `@outlet`. This allocates the arg slot `@outlet` (verified). Any hash is dropped. Positional
    args were already rejected in dev. So `{{outlet}}` is **lexically** scoped: it reads the
    `@outlet` argument of the template it is written in, and is not dynamically scoped
    (runtime meaning: §08-8.3).

  Only mustaches are handled. `(outlet)` and `(mount)` produce the keyword misuse error.

#### 03-7.11 `TransformResolutions` (loose)

`plugins/transform-resolutions.ts`. For every `MustacheStatement` or `SubExpression` (**not**
element modifiers) whose path's `original` is exactly `helper` or `modifier`:

- **[Dev]** No first positional: assertion `The <type> keyword requires at least one positional arguments <loc>`
  (note the grammar).
- A string-literal first argument `"name"` is replaced by `(-resolve "<type>:name")`, a
  build-time-described lookup of the named helper/modifier (§08). For example
  `{{helper "foo" 1}}` → `{{helper (-resolve "helper:foo") 1}}`.
- **[Dev]** Otherwise, in DEBUG builds, the first argument `e` is replaced by
  `(-disallow-dynamic-resolution e type="<type>" loc="<location display>" original="<printed e>")`,
  a runtime check that `e` is not a string (§08). In production the args are unchanged.
- The rewritten node is marked, so it is not processed again.
- The local check is dead code: `isLocalVariable` requires `tail.length === 1`, but the path
  has to be exactly `helper`/`modifier`, which has no tail (`transform-resolutions.ts:152-154`).
  So a block param named `helper` does **not** stop the rewrite. See §03-10.

In strict mode this plugin does not run. String arguments to `helper`/`modifier` are then
compile errors from the curry keyword (§03-4.4).

---

## 03-8 Compile-time error catalog

Messages are exact. "N" = normalization (§03-1 step 3), "K" = keyword pass, "S" = strict
validation, "E" = Ember plugin assertion **[Dev]**. Parse errors are in §02.

| # | Phase | Condition | Message |
|---|---|---|---|
| 1 | N | loose, append callee free with tail | ``You attempted to render a path (`{{<path>}}`), but <head> was not in scope`` |
| 2 | N | loose, attribute value callee free with tail | same as 1 |
| 3 | N | loose, sexp callee free with tail | ``You attempted to invoke a path (`<path>`) but <head> was not in scope`` |
| 4 | N | loose, block callee free with tail | ``You attempted to invoke a path (`{{#<path>}}`) but <head> was not in scope`` |
| 5 | N | loose, modifier callee free with tail | ``You attempted to invoke a path (`{{<path>}}`) as a modifier, but <head> was not in scope`` |
| 6 | N | loose, `<Head.tail>` with uppercase free head | ``You attempted to invoke a path (`<<path>>`) but <head> was not in scope`` |
| 7 | N | loose, `<head.tail>` with lowercase free head | `You used <tag> as a tag name, but <head> is not in scope` |
| 8 | N | loose, `@a={{x}}` with bare free x ≠ `has-block` | see §03-5.3 |
| 9 | N | strict, uppercase free tag | see §03-5.4 |
| 10 | N | literal callee with args (unreachable from the parser for mustaches) | ``Unexpected literal `<v>` `` |
| 11 | N | callee normalizes to a literal | ``Invalid invocation of a literal value (`<v>`)`` (`normalize.ts:278-283`) |
| 12 | N | named block at top level | `Unexpected named block at the top-level of a template` |
| 13 | N | named block in a curly block | `Unexpected named block nested in a normal block` |
| 14 | N | named block self-closing / nested / uppercase / with attrs | §03-5.5 |
| 15 | N | simple element with block params / named blocks | §03-5.4 |
| 16 | N | component: named blocks + content / + block params / duplicate / else+inverse | §03-5.5 |
| 17 | K | simple element with `@arg` | §03-5.4 |
| 18 | K | keyword in an invalid position | §03-4.3 |
| 19 | K | keyword with path tail (strict only in practice) | §03-4.1 |
| 20 | K | per-keyword argument errors | §03-4.4 |
| 21 | — | `{{(x) ...}}` with args | plain `Error`: `unimplemented: subexpression at the head of a subexpression` |
| 22 | S | free variable left over in strict mode | `Attempted to resolve a <kind> in a strict mode template, but that value was not in scope: <name>` |
| 23 | E | reserved names | §03-7.4 |
| 24 | E | `attrs.*` | §03-7.5 |
| 25 | E | `{{#input}}` | §03-7.7 |
| 26 | E | `in-element insertBefore` not null | §03-7.9 |
| 27 | E | named outlet | §03-7.10 |
| 28 | E | `helper`/`modifier` with no args (loose) | §03-7.11 |
| 29 | E | `{{#each}}` with no params | `has firstParam` |
| 30 | E | `<Foo:bar>` | §03-5.6 |

Runtime-compile errors that tests often treat as "compile" errors, but that happen when the
template is first *used* (**[Dev]**, loose mode resolution failures, and dynamic strings in
strict `component`) belong to §05/§08.

---

## 03-9 `getTemplateLocals`

`getTemplateLocals(html, { includeKeywords?, includeHtmlElements? })`
(`packages/@glimmer/syntax/lib/get-template-locals.ts:89-144`) is a public, *approximate*
free-variable analysis over ASTv1, used by tooling. It does **not** run normalization and does
not use the rules of §03-3. It returns, in first-occurrence order, the first segment of:

- every `PathExpression` with a `VarHead` whose name is not a currently-scoped block param;
- every element tag, except those starting with `:` or `@`, or starting with `this.`; except
  those whose first segment is a scoped block param; and except all-lowercase tags without a
  `.` (unless `includeHtmlElements`).

Element block params are pushed *before* the element's own tag is examined, so
`<x as |x|>` excludes `x`. Names in `KEYWORDS_TYPES` are removed unless `includeKeywords`.
Ember's auto-imported built-ins and `-with-dynamic-vars`/`-get-dynamic-var` are **not**
removed. Tests: `packages/@glimmer/syntax/test/template-locals-test.ts`.

---

## 03-10 Open questions / inconsistencies

1. **Strict-mode host keywords ignore block params and `locals`.** `isKeyword` checks only
   `lexicalScope` (`normalize.ts:127-129`), so `mut`/`readonly`/`unbound` cannot be
   shadowed by a block param, or by a JS binding passed through `locals` (the babel path).
   A lexical binding passed through `lexicalScope` (the runtime `template()`) does shadow.
   The two authoring paths therefore disagree (verified with `locals: ['mut']` against
   `scope: () => ({ mut })`). (verified: babel wire, runtime; T9a. Babel wire emits the keyword
   opcode (31) for `{{mut 1}}`, `{{readonly 1}}` and `{{unbound 1}}` (and, before #21641, `{{action 1}}`)
   whether the name is in `scope`, bound by `eval` capture, or a block param. At run time a `scope`
   or `eval` binding of each of them makes `{{k "x"}}` call the local and render its result, while a block param
   `|mut|` still gets the keyword, which asserts "You can only pass a path to mut".)
2. **Loose mode + `lexicalScope`**: `{{foo.bar}}` with a lexical `foo` is a "not in scope"
   error, because `isFreeVar` consults only `locals` (`normalize.ts:131-143`). Angle brackets
   special-case this, but curlies do not.
3. **Strict `<x.y>` with a free `x`** is silently a simple element named `x.y`
   (`normalize.ts:804-814`), while loose mode errors. Almost certainly unintended.
4. **Curly block params named `this`** rebind `this` (`{{#let v as |this|}}`). Element block
   params forbid it.
5. **Keyword appends drop `{{{ }}}` trusting**: `{{{if c x}}}`, `{{{helper h}}}`,
   `{{{has-block}}}`, `{{{log}}}` append as text (`call-to-append.ts`, `append.ts:127-145`).
   Recorded as §05-14 item 14, which owns it together with the literal case (fix proposed).
6. **Bare-path keyword promotion** happens in attribute, `@arg`, hash, and interpolation
   positions, but not in positional-argument positions. So `(x has-block)` and `(x (has-block))`
   differ.
7. **Silently ignored arguments**: `{{#in-element}}` extra positionals, unknown named args,
   and `{{else}}`; `{{#-with-dynamic-vars}}` positionals and `{{else}}`; `{{#if}}`/`{{#unless}}`
   block params (never bound); `{{outlet}}` hash.
8. **Literal mustache callee drops its arguments** in the parser (`{{"foo" 1}}` renders `foo`),
   and this makes the normalizer's `Unexpected literal` check dead for mustaches.
9. **Error text bug**: a single named block inside an HTML element always reports `<:foo>`
   (`normalize.ts:984-986`).
10. **`-get-dynamic-var` errors say `(-get-dynamic-vars)`** (with an `s`).
11. **`{{#each}}` with no params** gives the Ember assertion `has firstParam` instead of the
    Glimmer error, and in production continues with an `undefined` param. (`{{#each-in}}` with no
    params is a syntax error, §03-7.6.)
12. **`trackLocals` counter bug** (`plugins/utils.ts:36` reads the count with the `VarHead`
    object as the map key but writes it under the name, so the count never exceeds 1).
    Exiting an inner block that re-binds a name deletes the outer binding too. For example,
    in strict mode `{{#let a as |on|}}{{#let b as |on|}}{{/let}}{{on}}{{/let}}` rewrites the
    outer `{{on}}` to the built-in `on` instead of the block param. Untested. Separately,
    element block params count as visible for the element's own attributes and modifiers in
    the Ember plugins, but not in normalization. For example `<Foo {{on ...}} as |on|>` in
    strict mode: `AutoImportBuiltins` sees `on` as local and does not rewrite it, then
    normalization finds `on` free and reports "not in scope". (§01-1.11 item 5 refers here.)
    (verified: babel wire, runtime; T9a. The nested-`let` example compiles to a lexical reference to the
    built-in `on` (`[32,0]`), and at run time `[{{on}}]` renders `[[object Object]]` instead of
    `[b]`/`[a]`; the element example fails with "Attempted to resolve a modifier in a strict mode
    template, but that value was not in scope: on" on both paths, while `as |x|` compiles.)
13. **`TransformResolutions` local check is dead** (`tail.length === 1`), so shadowing
    `helper`/`modifier` with a block param does not stop the `-resolve` rewrite in loose mode.
    (verified: babel wire via `precompileTemplate`, and runtime loose `template()`; T9a.
    `{{#let 1 as |helper|}}{{helper "foo"}}{{/let}}` compiles to a call of the block param with
    `(-resolve "helper:foo")` as its first argument, and likewise for `(modifier "foo")`. Babel
    `template()` cannot show this, because it forces strict mode.)
14. **`TransformEachInIntoEach` and `TransformInElement` do no local check**, so a block param
    named `each-in` or `in-element` (legal identifiers in Handlebars block params) is still
    rewritten. (verified: babel wire, runtime; T9a. With `|each-in|`, `{{#each-in this.x}}` still
    compiles to `each` over `(-each-in …)` and the block param is unused; at run time it renders like
    the control. With `|in-element|`, `{{#in-element this.x}}` gets the `-in-el-null` argument and
    invokes the block param as a component, which fails at run time with "Got 1, expected:".)
15. **`modifier` in modifier position** is listed as valid in `KEYWORDS_TYPES`, but is never
    translated, so it is treated as a free modifier named `modifier`.
16. **`this.attrs` deprecation** is past its `until: '6.0.0'` but still only logs, and the
    rewrite of a bare `{{this.attrs}}` produces the invalid path `@`.
17. **Duplicate block-param names** (`as |a a|`) are accepted. Lookup picks the first index.
18. **Upvar noise**: in loose mode, simple element tag names and `:named-block` tags are
    recorded as upvars. This is harmless but observable in the wire format (§04).
19. **Tag-name tokenization oddities**: the parser/tokenizer produced surprising results for tags such
    as `<_foo />` (compiled as element `foo`) and `<É />` (compiled to nothing). These belong
    in §02, but they affect the element classification here.
20. **RFC 0496 keyword list vs implementation**: `action`, `hasBlock`, `with`, `link-to`, `loc`,
    and `query-params` are no longer keywords, and `component`/`helper`/`modifier`/`debugger` are.
    The RFC's import list (`concat`, `get`) is not auto-imported, although the other RFC
    built-ins are.
21. **`-track-array` is applied twice** (§03-7.8). This is harmless, because the helper is
    idempotent, but it is evidence that the transform re-visits its own output. An
    implementation need not reproduce it.
