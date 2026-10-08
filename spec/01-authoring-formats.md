# 01 — Authoring Formats and the Compiler API

This chapter specifies how template source text is written by authors and how it becomes a
*component* (or a bare *template factory*) that the rendering layer can use. It covers:

- the `<template>` tag in `.gjs` / `.gts` files and its preprocessing by `content-tag` (§1.2);
- the RFC 0931 `template()` API, the older `precompileTemplate` / `hbs` forms, and the
  explicit (`scope`) and implicit (`eval`) forms of lexical-scope access (§1.3, §1.4);
- the build-time implementation in `babel-plugin-ember-template-compilation` (§1.5);
- Ember's template compiler entry points and option normalization, including runtime
  compilation (§1.6);
- strict mode vs. loose mode: what they are and how a template gets its mode (§1.7);
- template factories, owner binding, `setComponentTemplate` / `getComponentTemplate`,
  `templateOnly` (§1.8);
- classic `.hbs` colocation and standalone `.hbs` modules (§1.9).

It deliberately does **not** specify: the grammar of template contents (→ `02-syntax.md`),
how free variables resolve and which keywords exist in each mode (→ `03-static-semantics.md`),
the wire format payload (→ `04-wire-format.md`), evaluation (→ `05-runtime-semantics.md`),
manager APIs (→ `06-managers.md`), and loose-mode resolution / route templates
(→ `08-ember-integration.md`). Those chapters are cross-referenced as `§NN-x.y`.

Versions examined: ember.js 7.5 alpha (this repo), `content-tag` 4.1.1
(`content-tag/package.json:3`), its swc fork at commit `26dfc9db0b`
(`content-tag/Cargo.lock`, `ef4/swc` branch `content-tag`; cited as `swc/…`),
`babel-plugin-ember-template-compilation` 4.0.0.

---

## 1.0 Pipeline overview (non-normative)

```
 .gjs/.gts source
      │  content-tag  (§1.2)            ── purely syntactic; no scope analysis
      ▼
 JS with  template("…", { eval() { return eval(arguments[0]) } })   (RFC 0931 implicit form)
      │  babel-plugin-ember-template-compilation (§1.5)
      │     targetFormat "wire"  ──────────────► setComponentTemplate(createTemplateFactory({…wire…}), templateOnly() | Class)
      │     targetFormat "hbs"   ──────────────► setComponentTemplate(precompileTemplate("…", {strictMode, scope}), …)
      ▼
 runtime: component definition object ── getComponentTemplate ──► template factory ── (owner) ──► template
```

Colocated `.hbs` files and standalone `.hbs` modules enter the same pipeline one step later,
as `precompileTemplate(...)` / `hbs(...)` calls synthesized by the build (§1.9). Runtime
compilation (`@ember/template-compiler/runtime`, `ember-template-compiler`'s `compile`)
short-circuits the build and produces the same objects at run time (§1.6.5).

A conforming new implementation that compiles templates to JS functions replaces the
"wire" step. It MUST preserve every observable property listed in this chapter of the
*inputs* (source forms, options, scoping, mode selection, association with component
objects, owner binding, timing of scope evaluation). It MAY change the shape of the
compiled payload freely: wire format is not a compatibility requirement (§00-0.2, §04 is
informative), and addons ship template source. See §1.10.

---

## 1.1 Terminology

- **Template source** — a string in the Glimmer template language (§02).
- **Template factory** — a function `(owner?) => Template` produced by
  `createTemplateFactory(wire)` (§1.8.1). Historically called a "bare template". Route
  templates and `precompileTemplate` results are template factories.
- **Component definition** — any JS object or function that has an associated component
  manager (§06). A template is *associated* with a definition via `setComponentTemplate`.
- **Template-only component** — the definition object returned by `templateOnly()`
  (§1.8.4); its manager provides no instance (`this` is `null`).
- **Strict mode** / **loose mode** — the two compilation modes of RFC 0496 (§1.7). The
  implementation calls loose mode "resolution mode" (`RESOLUTION_MODE_TRANSFORMS`).
- **Lexical scope** (a.k.a. "ambient scope", "scope bag", "locals", "upvars") — the set of
  JavaScript bindings made visible to a template by name, via `scope`, `eval`, or `locals`.
- **Explicit form** / **implicit form** — the two ways of passing lexical scope to
  `template()` (RFC 0931): a `scope` function, or an `eval` function.

---

## 1.2 The `<template>` tag (`.gjs` / `.gts`)

### 1.2.1 File types

`.gjs` files are JavaScript and `.gts` files are TypeScript, each extended with the
`<template>` content tag (`rfcs/text/0779-first-class-component-templates.md` §"Custom file
extension"). `content-tag` parses *both* as TypeScript with decorators enabled
(`content-tag/src/lib.rs:79-87`, `:116-124`); it does not distinguish the two extensions, and
it preserves TypeScript syntax in its output (`content-tag/src/lib.rs:293-336`;
`content-tag/test/node/process.test.js` "Preserves typescript declare", "Preserves
typescript export type"). Stripping types is left to later tools.

Template contents are always compiled in **strict mode** (§1.7.1), and always receive lexical
scope via the implicit form (§1.4.3).

### 1.2.2 Lexical recognition

The content tag is recognized by the JS *tokenizer*, not by a separate pre-pass:

```
ContentTag      ::= "<template>" ContentTagBody "</template>"
ContentTagBody  ::= any sequence of source characters that does not contain "</template>"
```

Normative rules (all from `swc/crates/swc_ecma_parser/src/lexer/mod.rs:421-466`):

1. Whenever the JS lexer would produce a `<` punctuator token and the next nine characters are
   exactly `template>`, it instead produces a *content-tag start* token covering the ten
   characters `<template>`. The match is case-sensitive and exact: `<template >`,
   `<template foo="x">`, `<Template>` are **not** content tags (they lex as ordinary `<`).
2. The body is then read *raw*: every character up to (not including) the **first**
   subsequent occurrence of the eleven characters `</template>` is the body. There is no
   nesting, no escape mechanism, and no awareness of Handlebars/HTML structure: a
   `</template>` inside a Handlebars comment, string literal, or attribute terminates the
   tag. Consequently a nested HTML `<template>` element may be opened inside a content tag
   but its closing tag terminates the outer content tag. This is a deliberate design choice,
   not an omission: the content tag is meant to be usable as a JS syntax extension for
   embedding *any* language, so it assumes no interior syntax other than the literal closing
   bytes. Authors who need the text `</template>` in a body must spell it some other way
   (for example the entity `&lt;/template>`).
3. Reaching end of input before `</template>` is a parse error (`SyntaxError::Eof`).
4. Because recognition happens at the token level, `<template>` inside JS string literals,
   template literals, regular-expression literals and comments is never recognized
   (`content-tag/src/locate.rs:414-466` test "template inside a regexp";
   `content-tag/test/node/parse.test.js` "/<template>/ inside a regexp").
5. Because the check precedes TypeScript type-context handling in `read_token_lt_gt`
   (`swc/crates/swc_ecma_parser/src/lexer/mod.rs:454-466`), the character sequence
   `<template>` is claimed as a content tag in *every* position where `<` would be lexed,
   including e.g. `a<template>b` or a generic type argument written `Foo<template>`.
   *Note:* This is observable only as a parse error or a surprising parse; see Open
   Questions.

### 1.2.3 Syntactic positions

The parser accepts a content tag in exactly two grammatical positions:

- **Expression position** — as a *PrimaryExpression*
  (`swc/crates/swc_ecma_parser/src/parser/expr.rs:445-450`). It can therefore appear
  anywhere an expression can: variable initializer, argument, return value, class field
  initializer, array element, etc. (`content-tag/src/transform.rs:289-333` tests
  `content_tag_template_expression`, `expression_inside_class_member`, `inner_expression`).
  A content-tag expression is not a valid assignment target
  (`swc/crates/swc_ecma_parser/src/parser/util.rs:123`).
- **Class-member position** — as a *ClassElement* directly in a class body
  (`swc/crates/swc_ecma_parser/src/parser/class_and_fn.rs:1495-1507`). The check happens
  before decorators and modifiers are parsed, so a class-member content tag cannot be
  decorated, cannot be `static`, and cannot carry a TypeScript modifier. Works in class
  declarations and class expressions (`content-tag/src/transform.rs:313-321`).

`content-tag`'s `parse()` API reports these as `type: "expression"` and
`type: "class-member"` respectively (`content-tag/src/locate.rs:16-21`).

In addition, a module-level **expression statement** whose expression is exactly a content
tag, or exactly `ContentTag satisfies Type` (TypeScript), is rewritten into
`export default …` (§1.2.6). This applies only to statements that are direct children of
the module body (`content-tag/src/transform.rs:189-257`); a bare `<template>` expression
statement nested inside a block or function body is left as an (unused) expression
statement.

### 1.2.4 Indentation stripping

The body text is normalized before being embedded (introduced by content-tag 4.1.0,
"indentation stripping", referred to in tests as RFC #1121 —
`content-tag/test/node/process.test.js` `describe("indentation stripping (RFC #1121)")`).
The algorithm as of content-tag 4.2.1 (`content-tag/src/transform.rs:80-157`), which a
conforming preprocessor MUST reproduce exactly because it changes the template text (and
hence text-node contents). "Whitespace" here means only ASCII space and tab; every other
character, including other Unicode whitespace such as U+00A0 or U+3000, is content.

```
indentation(L) := the longest prefix of L made of ' ' and '\t'
blank(L)       := indentation(L) is all of L

strip_indent(input):
  lines := split input on "\n", removing a trailing "\r" from each line   (Rust str::lines)
  if count(lines) <= 1: return input unchanged          -- single-line bodies are untouched,
                                                        -- including their leading/trailing spaces
  drop leading and trailing blank lines
  if nothing remains: return ""
  min_indent := none; has_spaces := false; has_tabs := false
  for each remaining line L that is not blank:
     indent := indentation(L)
     has_spaces |= indent contains ' '
     has_tabs   |= indent contains '\t'
     if has_spaces and has_tabs:            -- cumulative across lines
        return remaining lines joined with "\n"      (no de-indent)
     min_indent := min(min_indent, length of indent)
  if min_indent is none or 0: return remaining lines joined with "\n"
  for each remaining line L:
     if length of L >= min_indent: L := L with its first min_indent characters removed
     (otherwise L is kept as is)
  return lines joined with "\n"
```

Every character removed is a space or tab: a non-blank line has at least `min_indent` of
indentation, and a blank line longer than `min_indent` consists only of spaces and tabs.

Consequences pinned by tests:

- `<template>\n  <span>Hello</span>\n</template>` → `<span>Hello</span>`
  (`content-tag/src/transform.rs:366-372`).
- Relative indentation is preserved (`content-tag/src/transform.rs:436-452`).
- A body whose first non-blank line is at column 0 is not de-indented — this is the
  documented opt-out (`{{!-- prevent automatic de-indent --}}` on its own line at column 0;
  `content-tag/src/transform.rs:454-466`). Leading/trailing blank lines are still removed.
- A single-line body is emitted verbatim, e.g. `<template> <span>Hello</span> </template>`
  keeps both spaces (`content-tag/test/node/process.test.js` "prerves whitespace when
  component is one line").
- Multi-line bodies have CRLF line endings converted to LF; single-line bodies keep any
  `\r`.
- Whitespace-only interior lines longer than `min_indent` keep their excess whitespace.
- A line that starts with non-ASCII whitespace is content with no indentation, so it
  disables de-indenting for the whole body: `<template>\n\u3000<a></a>\n  <b></b>\n</template>`
  → `\u3000<a></a>\n  <b></b>` (`content-tag/src/transform.rs:468-480`).
- Before content-tag 4.2.1, indentation was measured with Unicode `trim_start` but removed by
  byte count, so mixing multi-byte and ASCII whitespace could panic the preprocessor
  (§1.11 item 7).

`content-tag`'s `parse()` API returns the **raw, unstripped** body in `contents`
(`content-tag/src/locate.rs:44`).

### 1.2.5 Embedding the body in JavaScript

The stripped body is emitted as the raw text of a JS *NoSubstitutionTemplate* literal with
three characters escaped, in this order (`content-tag/src/transform.rs:73-79`):
`\` → `\\`, `` ` `` → `` \` ``, `$` → `\$`. Every other character, including line
terminators, is emitted as-is.

Because template-literal *cooking* reverses exactly these escapes, the cooked value of the
literal is byte-for-byte the stripped body. In particular, JS escape sequences written in a
template are **not** interpreted: `<template>Hello\nWorldሴ</template>` yields a
template whose source contains the characters `\`, `n`, `\`, `u`, … (test
`do_not_interpret_js_escapes_in_hbs`, `content-tag/src/transform.rs:347-351`; also
`backtick_in_template`, `dollar_in_template` at `:335-345`).

### 1.2.6 Emitted JavaScript

Let `T` be the identifier `template_fd9b2463e5f141cfb5666b64daa1f11a`
(`content-tag/src/lib.rs:44`; constant since content-tag 3.1.1, previously randomized). If
at least one content tag was transformed, `content-tag` inserts as the **first** module item:

```js
import { template as template_fd9b2463e5f141cfb5666b64daa1f11a } from "@ember/template-compiler";
```

(`content-tag/src/lib.rs:105-138`, `:199-224`). It does not reuse or disturb a
pre-existing import of `template`, and user bindings named `template` are unaffected
(tests `preexisting_import`, `avoids_top_level_collision`, `avoids_local_collision`,
`content-tag/src/lib.rs:245-291`).

Each content tag is replaced as follows (`content-tag/src/transform.rs:38-187`,
`content-tag/src/snippets.rs:9-16`):

| Position | Replacement |
|---|---|
| Expression | `T(`BODY`, { eval() { return eval(arguments[0]); } })` |
| Module-level expression statement | `export default T(`BODY`, { eval() { return eval(arguments[0]); } });` |
| Module-level `<template>…</template> satisfies X` | `export default T(`BODY`, {…}) satisfies X;` |
| Class member | a `static { T(`BODY`, { component: this, eval() { return eval(arguments[0]); } }); }` block **in the same position** among the class elements |

Normative consequences:

- The class-member form associates the template while the class definition is being
  evaluated, at the point in class-element order where the tag appeared (static blocks
  and static field initializers run in textual order).
- The expression form evaluates to whatever `template()` returns — a new template-only
  component each time the expression is evaluated (§1.3.2). A `<template>` inside a
  function body creates a new component definition per call
  (`rfcs/text/0779-first-class-component-templates.md` §"Performance").
- Multiple module-level bare `<template>` statements produce multiple `export default`
  declarations; `content-tag` does not diagnose this, it surfaces as a later JS error.
- Two class-member tags in one class produce two `template(..., {component: this})` calls
  on the same class, which is a [Dev] error at run time (§1.8.3).

The `eval` method is the RFC 0931 implicit form. The call is placed in the lexical position
of the original tag, so direct `eval` inside it sees exactly the JS scope in which the tag
was written, including `this` (the class constructor inside a static block; the enclosing
`this` in expression position).

### 1.2.7 `parse()` API and errors [non-normative for rendering]

`Preprocessor.parse(src, {filename?})` returns an array of occurrences
`{ type, tagName: "template", contents, range, startRange, contentRange, endRange }` in
source order (`content-tag/src/locate.rs:95-108`), where every range carries byte,
Unicode-scalar and UTF-16 offsets (`content-tag/src/locate.rs:110-145`). This is used by
editors/linters, not by rendering.

JS parse errors are thrown as `Error("Parse Error at <file>:<line>:<col>: <line>:<col>")`
where `<file>` is the `filename` option or `<anon>`, with `source_code` and
`source_code_color` properties containing a rendered snippet
(`content-tag/src/bindings.rs:105-125`; `content-tag/test/node/process.test.js` "Emits parse
errors…"). Option `inline_source_map: true` appends a base64 source map comment
(`content-tag/src/lib.rs:173-184`).

---

## 1.3 The `template()` API (RFC 0931)

### 1.3.1 Signature

```ts
import { template } from '@ember/template-compiler';          // build-time optimizable
import { template } from '@ember/template-compiler/runtime';  // never touched by build tools

template(source: string, options?: {
  component?: object;                 // backing definition to associate with
  scope?: (instance?) => Record<string, unknown>;   // explicit form
  eval?: () => unknown;               // implicit form: exactly `eval() { return eval(arguments[0]) }`
  strictMode?: boolean;               // implementation's name; default true  (see §1.3.4)
  strict?: boolean;                   // RFC 0931's name; see §1.3.4 and Open Questions
  moduleName?: string;
}): object
```

(`rfcs/text/0931-template-compiler-api.md:242-275`;
`packages/@ember/template-compiler/lib/template.ts:14-254`.)

### 1.3.2 Return value and association

`template()` always returns a **component definition**, never a bare template factory
(`rfcs/text/0931-template-compiler-api.md:277-283`):

- If `component` is given, the compiled template is associated with it via
  `setComponentTemplate` and `component` itself is returned.
- Otherwise a fresh `templateOnly()` definition is created, associated, and returned.

(`packages/@ember/template-compiler/lib/template.ts:244-253`.) Build-time compilation emits
exactly `setComponentTemplate(<factory>, component ?? templateOnly())`
(`babel-plugin-ember-template-compilation/src/plugin.ts:498-517`, `:612-634`).

### 1.3.3 Scope access: explicit vs implicit

Exactly one of `scope` / `eval` SHOULD be given. If both are given, build-time compilation
uses `eval` (`babel-plugin-ember-template-compilation/src/plugin.ts:379-385`) and runtime
compilation also prefers `eval` for evaluation (`packages/@ember/template-compiler/lib/template.ts:262-277`)
but *both* are consulted to build the compile-time `lexicalScope` predicate, with `scope`
winning because it is processed second (`packages/@ember/template-compiler/lib/compile-options.ts:88-120`).
If neither is given, the template has an empty lexical scope.

Explicit and implicit forms are specified in §1.4.

### 1.3.4 Strict by default

RFC 0931 specifies an option named `strict` defaulting to `true`
(`rfcs/text/0931-template-compiler-api.md:271-275`). The implementations disagree on the
name:

| Implementation | honoured key | default |
|---|---|---|
| runtime `template()` | `strictMode` (`strict` ignored) | `true` (`packages/@ember/template-compiler/lib/template.ts:240`) |
| babel plugin, `targetFormat: 'hbs'` | `strict` (renamed to `strictMode`) | `true` (`babel-plugin-ember-template-compilation/src/plugin.ts:731-753`; test "respects user's strict option on template()", `__tests__/all.test.ts:1658`) |
| babel plugin, `targetFormat: 'wire'` | neither — always strict | `true` (`babel-plugin-ember-template-compilation/src/plugin.ts:428-430`) |

A conforming implementation MUST treat `template()` without either key as strict mode. The
`<template>` tag never passes either key, so `.gjs`/`.gts` templates are always strict.
Behaviour of an explicit `false` is inconsistent today (see Open Questions).

### 1.3.5 `moduleName`

`moduleName` is optional. It is recorded as the template's module name
(`packages/@ember/template-compiler/lib/compile-options.ts:137-142`) and appears in: compiled
payload (`moduleName`, defaulting to `"(unknown template module)"`,
`packages/@glimmer/compiler/lib/compiler.ts:127-137`), [Dev] assertion/deprecation messages
and syntax-error locations (e.g. `packages/@ember/template-compiler/lib/system/calculate-location-display.ts:3-28`),
the default template id hash (§1.6.4), and debug tooling. It has no effect on rendering
semantics. RFC 0496 notes it "does not correspond to anything meaningful at runtime"
(`packages/@ember/template-compiler/lib/types.ts:31-35`).

### 1.3.6 Build-time vs runtime equivalence

RFC 0931 intends the build-time transformation to be a pure optimization: same signature
and semantics, except that custom build-time AST plugins are absent at run time
(`rfcs/text/0931-template-compiler-api.md:288-311`). Build time imposes *syntactic
restrictions* (§1.5.3); run time imposes none (`…:313-347`). Where the two implementations
differ observably today it is listed in Open Questions; a new implementation SHOULD follow
the build-time behaviour, since that is what shipping applications observe.

*Note:* In this repository `@ember/template-compiler` and
`@ember/template-compiler/runtime` both export the same fully functional runtime
`template()` (`packages/@ember/template-compiler/index.ts:1`,
`packages/@ember/template-compiler/lib/public-api.ts:1`,
`packages/@ember/template-compiler/lib/runtime.ts:1`). RFC 0931 anticipated that the
non-`/runtime` entry point would throw at run time when the compiler is not included
(`rfcs/text/0931-template-compiler-api.md:128`); in practice the build tool removes the
import, and whether the compiler is present is a bundling question.

---

## 1.4 Lexical scope: explicit and implicit forms

### 1.4.1 What lexical scope means

A template's lexical scope is a mapping from **template-level names** to JS values. A name
in the lexical scope behaves like an outermost block parameter: it takes precedence over
keywords, over HTML element names in element position, and (loose mode) over resolution.
Full resolution rules are in §03; this chapter specifies how the mapping is *constructed*.

Normative properties:

1. **Names** are JS identifier names, plus the special name `this` (§1.4.4).
2. **Shadowing by block params**: a block parameter (`as |x|`) with the same name shadows the
   lexical binding within its block (`babel-plugin-ember-template-compilation/src/hbs-utils.ts:3-28`).
   Element block params are in scope only in the element's children, not its attributes or
   modifiers (`…/hbs-utils.ts:7-14`; test "understands that block params are only defined in
   the body, not the arguments, of an element", `__tests__/all.test.ts:1057`).
3. **Evaluation timing**: see §1.8.5. The values are read once and then *snapshotted*;
   later reassignment of the JS binding is not observed, even with `@tracked`
   (`rfcs/text/0496-handlebars-strict-mode.md` §"The ambient scope";
   `rfcs/text/0779-first-class-component-templates.md` §"Compilation").

### 1.4.2 Explicit form (`scope`)

```js
template("<Headline>{{@title}}</Headline>", { scope: () => ({ Headline }) });
precompileTemplate("…", { scope: () => ({ Foo: bar, MyButton }) });
```

The `scope` function returns an object whose keys are template names and whose values are
the bound JS values. Keys may differ from the JS identifiers (`{ Foo: bar }` makes `bar`
available as `Foo` in the template).

Build-time restrictions (`babel-plugin-ember-template-compilation/src/expression-parser.ts:40-120`):

- `scope` MUST be an arrow function, function expression, or object method. Passing an
  object literal directly is an error: *"Passing an object as the `scope` property to inline
  templates is no longer supported. Please pass a function that returns an object expression
  instead."*
- The body MUST be an object expression, or a block containing **exactly one** `return`
  statement whose argument is an object expression (other statements are ignored — test
  "correctly handles scope function with coverage", `__tests__/all.test.ts:1843`).
- Every property MUST have a static key (identifier or string literal), MUST NOT be a spread
  or method, and its value MUST be an identifier or `this`. Violations raise errors whose
  messages begin *"Scope objects for `<callee>` …"* (`…/expression-parser.ts:76-115`; tests
  `__tests__/all.test.ts:1879-1897`).
- The build pipeline *prunes* explicit scope entries the template does not reference
  (`babel-plugin-ember-template-compilation/src/scope-locals.ts:176-189`; test "correctly
  removes not used scope", `__tests__/all.test.ts:1899`), and never *adds* entries except via
  the AST-plugin `jsutils` API (§1.5.7) (test "does not automagically add to scope when not
  using implicit-scope-form", `__tests__/all.test.ts:1908`).
- In strict mode, a free name not in the explicit scope and not a keyword is a compile-time
  error (§1.7.2) — the explicit scope is authoritative.

RFC 0931 additionally permits `scope: (instance) => ({ "#secret": instance.#secret })` for
private fields (`rfcs/text/0931-template-compiler-api.md:168-185`, `:324-335`). This is **not
implemented**: the parser rejects member-expression values and the template grammar has no
`#private` paths; the runtime compiler calls `scope()` with no argument
(`packages/@ember/template-compiler/lib/template.ts:278`,
`packages/@ember/template-compiler/lib/compile-options.ts:114`).

Runtime compilation with `scope` (`packages/@ember/template-compiler/lib/compile-options.ts:113-120`,
`packages/@ember/template-compiler/lib/template.ts:278-307`): a name is in lexical scope iff
`name in scopeObject` (see Open Questions re prototype properties). The compiled payload's
scope closure is evaluated inside `new Function(...names, body)` invoked with the values
(and with `this` bound to `scope.this` if present), so the values are those returned by
`scope()` at `template()` call time.

### 1.4.3 Implicit form (`eval`)

```js
template("<Headline>{{@title}}</Headline>", { eval() { return eval(arguments[0]); } });
```

The `eval` option lets the compiler discover bindings in the caller's scope without the
author (or a preprocessor) doing lexical analysis
(`rfcs/text/0931-template-compiler-api.md:187-240`). Direct `eval` inside a method defined
at the call site evaluates code in that scope; `arguments[0]` avoids shadowing any binding
(`…:238-239`).

**Build-time syntactic requirements** (`babel-plugin-ember-template-compilation/src/expression-parser.ts:122-193`):
`eval` MUST be an object method or a property whose value is a (non-arrow) function
expression; its body MUST contain exactly one `return` statement; the returned expression
MUST be exactly `eval(arguments[0])` (callee identifier `eval`, one argument, a member
expression on identifier `arguments` with numeric literal property `0`). Each deviation has
a specific error message (e.g. *"eval function must return `eval(arguments[0])`. Found wrong
property."*). The `eval` function itself is never called at build time.

**Build-time scope discovery** ("implicit mode" of `ScopeLocals`,
`babel-plugin-ember-template-compilation/src/scope-locals.ts:153-216`). After all user AST
transforms have run (§1.5.7), the compiler walks the template and collects every *candidate
name*:

- for every `PathExpression` whose head is a variable (`foo` in `foo`, `foo.bar`,
  `(foo)`, `{{foo}}`, modifier/helper/component heads alike), its head name;
- for every `PathExpression` whose head is `this`, the name `this`;
- for every `ElementNode`, the part of its tag before the first `.` (so `<div>` → `div`,
  `<Foo.Bar>` → `Foo`, `<this.x>` → `this`, `<@arg>` → `@arg`, `<:named>` → `:named`);

in each case only if the name is not bound by an enclosing block param (§1.4.1). Then for
each candidate name `n`:

- if `n` is `this`: add it only if lexical `this` is permitted (§1.4.4);
- else if `n` ∈ **ALLOWED_GLOBALS** (§1.4.5) or `n` has a binding in the JS scope at the
  call site (Babel scope analysis — any `var`/`let`/`const`/function/class/import/parameter
  binding, regardless of its current value): add `n → n`.

Names that are neither bound nor allowed globals are left free; in strict mode they then
must be keywords or the compile fails (§1.7.2).

Normative consequences (all pinned by tests in `babel-plugin-ember-template-compilation/__tests__/all.test.ts`):

- A JS binding shadows an HTML element of the same name: with `let div = 1`, `<div></div>`
  is a *component invocation* of the value `1` (test "shadows html elements with locals",
  `:2006`). This applies to *any* tag name, including lower-case and SVG names.
- A JS binding shadows a template keyword: with `let hasBlock = 1`, `{{hasBlock "thing"}}`
  invokes the local (test "shadows ember keywords with locals", `:2032`); without the local
  the keyword is used (`:2249`).
- The innermost JS binding wins, like JS (test "respects local priority…", `:2340`).
- Allowed globals are captured even though they are not declared (tests
  "implements RFC#1070: default globals", `:1972-2004`).

(verified: babel hbs/wire; T9a. Build-time claims checked against plugin output: `let div = 1` in a
function puts `div` in `scope` for `<div></div>`; a block param `|A|` over an imported `A` leaves `scope`
out; `let hasBlock = 1` is captured for `{{hasBlock "thing"}}`; `JSON` is captured without a declaration;
`this` is captured as `scope: () => ({ this: this })` in a function but not when `component: this` is
given; unused explicit entries are pruned, `scope: () => ({ A, B })` with `<A/>` keeping only `A`; and
in the explicit form `{{nope}}` fails with "not in scope".)

**Runtime scope discovery** (`packages/@ember/template-compiler/lib/compile-options.ts:88-111`,
`:176-201`). The runtime compiler cannot inspect bindings, so it probes:

```
lexicalScope(name):
  if name == "__ember_keywords__": true                         -- internal, §1.6.3
  if name ∈ ALLOWED_GLOBALS: return (name in globalThis)
  if not /^[\p{ID_Start}$_][\p{ID_Continue}$_‌‍]*$/u matches name: false
  local  := userEval(`typeof ${name} !== "undefined"`) === true   -- SyntaxError ⇒ false
  if not local: false
  global := new Function(`return typeof ${name} !== "undefined";`)() === true
  return not global
```

and evaluates the compiled payload by passing
`(function(__ember_keywords__){ return (<payload>); })` through the user's `eval` and
calling it with the keyword table (`packages/@ember/template-compiler/lib/template.ts:262-277`).
Consequently runtime discovery differs from build-time discovery in three observable ways
(see Open Questions): a binding whose value is `undefined` is not found; a local that shadows
a global name (e.g. `name`, `status`, `open` in browsers) is not found; `this` is never found.

### 1.4.4 Lexical `this`

A template's `this` normally refers to the component instance (the manager's `self`, §06).
The name `this` can instead be bound lexically:

- Explicit form: a scope entry whose key is `this` (`scope: () => ({ this: state })`) binds
  `this` in the template (runtime test "Can use `this` from explicit scope",
  `packages/@ember/-internals/glimmer/tests/integration/components/runtime-template-compiler-explicit-test.ts:75-86`;
  babel test "can pass lexically scoped \"this\"", `__tests__/all.test.ts` in
  `describe('scope')`). The compiled scope closure then contains `"this": this`
  (`packages/@glimmer/compiler/lib/compiler.ts:148-155`) and, being an arrow function,
  captures the `this` of the surrounding JS.
- Implicit form at build time: `this` is captured lexically **iff no `component` option is
  given** (`mayUseLexicalThis = !backingClass`,
  `babel-plugin-ember-template-compilation/src/plugin.ts:463`, `:533`). Thus
  `<template>{{this.message}}</template>` in expression position inside a function refers to
  that function's `this`, while in class-member position `this` is the component instance
  (tests "captures lexical \"this\"…", "does not captures lexical \"this\" when template is
  used in class body", `__tests__/all.test.ts:2151-2247`, `:2424-2555`).
- When `this` is lexically bound, `{{this}}`, `{{this.x}}` and `<this.x>` all read the
  lexical value, not the component's self (`packages/@glimmer/syntax/lib/v2/normalize.ts:322-328`).

*Note:* Some babel tests are skipped under `NO_LEXICAL_THIS`
(`__tests__/all.test.ts:22`), indicating older Ember versions lacked lexical `this`
support in the compiler. Ember 7.5 supports it.

### 1.4.5 Default globals (RFC 1070)

`ALLOWED_GLOBALS` is the fixed set (`packages/@ember/template-compiler/lib/plugins/allowed-globals.ts:24-72`;
identical copy in `babel-plugin-ember-template-compilation/src/scope-locals.ts:36-84`):

```
globalThis Atomics JSON Math Reflect localStorage sessionStorage URL
isNaN isFinite parseInt parseFloat decodeURI decodeURIComponent encodeURI encodeURIComponent
postMessage structuredClone Array BigInt Boolean Date Number Object String
Infinity NaN isSecureContext
```

In the implicit form these names are always treated as in scope and bound to the JS
identifier of the same name (i.e., the global, unless shadowed). In the explicit form they
are *not* added automatically. The list is part of the public contract
(`rfcs/text/1070-default-globals-for-strict-mode.md`; re-exported as `ALLOWED_GLOBALS` from
`@ember/template-compiler`, `packages/@ember/template-compiler/index.ts:3`).

### 1.4.6 `locals` (low-level)

The Ember/Glimmer precompiler also accepts `locals: string[]` — the list of template names
to treat as outer block parameters (`packages/@glimmer/syntax/lib/parser/tokenizer-event-handlers.ts:693-695`, `:786-789`).
This is how the babel plugin passes lexical scope (§1.5.5). The compiled payload's scope
closure references each *used* local by the same identifier, in order of first use
(`packages/@glimmer/syntax/lib/symbol-table.ts:96-114`, `packages/@glimmer/compiler/lib/compiler.ts:147-158`);
the babel plugin then renames identifiers whose JS name differs from the template name
(`babel-plugin-ember-template-compilation/src/plugin.ts:435-450`). `locals: null` is
accepted and treated as absent (`packages/@ember/template-compiler/lib/compile-options.ts:128-135`).

A separate predicate option `lexicalScope(name) => boolean` is used by the runtime
compiler (§1.4.2, §1.4.3); the default is "nothing is lexical"
(`packages/@glimmer/compiler/lib/compiler.ts:87`).

---

## 1.5 babel-plugin-ember-template-compilation

### 1.5.1 Options

(`babel-plugin-ember-template-compilation/src/plugin.ts:53-95`,
`babel-plugin-ember-template-compilation/src/node-main.ts:14-90`.)

| Option | Meaning |
|---|---|
| `targetFormat: 'wire'` (default) \| `'hbs'` | `'wire'`: replace calls with compiled payloads. `'hbs'`: keep template source, only run user AST transforms and normalize the call form (for codemods and library pre-publication). |
| `compiler` / `compilerPath` | The Ember template compiler module (required for `'wire'`). If neither is given, resolved from cwd as `ember-source/ember-template-compiler/index.js`, falling back to `ember-source/dist/ember-template-compiler.js`. Must expose `_preprocess` (`src/ember-template-compiler.ts:13-19`). |
| `transforms` | Extra Glimmer AST plugins (functions, module names, or `[moduleName, options]`). Implementation-defined; not part of the spec (§1.5.7). |
| `enableLegacyModules` | Subset of `'ember-cli-htmlbars'`, `'ember-cli-htmlbars-inline-precompile'`, `'htmlbars-inline-precompile'` whose exports are also recognized (§1.5.2). |
| `outputModuleOverrides` | Remaps emitted imports, e.g. `createTemplateFactory` from another module (`src/plugin.ts:641-648`). |

The plugin performs its whole traversal in Babel's `pre` hook, before other plugins
(`src/plugin.ts:330-337`).

### 1.5.2 Recognized call sites

A call is processed iff its callee is an identifier that *references an import* (Babel
binding analysis, so renamed imports work) of one of (`src/plugin.ts:24-51`, `:341-364`):

| Module | Export | Tagged-template form | `scope` | RFC 0931 (`eval`, `component`, strict default, component result) |
|---|---|---|---|---|
| `@ember/template-compiler` | `template` | no | yes | yes |
| `@ember/template-compilation` | `precompileTemplate` | no | yes | no |
| `ember-cli-htmlbars` † | `hbs` | yes | no | no |
| `ember-cli-htmlbars-inline-precompile` † | default | yes | no | no |
| `htmlbars-inline-precompile` † | default | yes | no | no |

† only with `enableLegacyModules`. `@ember/template-compiler/runtime` is never recognized,
so imports from it always compile at run time (`rfcs/text/0931-template-compiler-api.md:305-311`).

Argument rules (`src/plugin.ts:178-326`):

- Tagged form (`` hbs`…` ``): no `${}` placeholders ("placeholders inside a tagged template
  string are not supported"); rejected for non-legacy modules ("…can only be called as a
  function with a string passed to it").
- Call form: at most 2 arguments. First MUST be a string literal or a placeholder-free
  template literal; the *cooked* value is the template source. A tagged template as first
  argument is an error. Second, if present, MUST be an object literal.
- The template source is the literal's value — JS escapes in ordinary string literals *are*
  interpreted (e.g. `precompileTemplate('a\nb')` has a newline), unlike `<template>` (§1.2.5).

### 1.5.3 Static option parsing

Options are parsed statically (`src/expression-parser.ts:195-241`): no spreads, no computed
keys; keys are identifiers or string literals; values MUST be string, boolean or numeric
literals, or nested array/object literals thereof — `null`, `undefined`, identifiers and
template literals are errors ("… can only accept static options but you passed …"). Special
keys:

- `scope` (not for legacy modules): parsed per §1.4.2;
- `eval` (`template` only): parsed per §1.4.3;
- `component` (`template` only): any expression; kept as a JS expression and used as the
  second argument of `setComponentTemplate`.

All other keys are passed through to the Ember compiler unchanged (test "allows static
userland options…", `__tests__/all.test.ts:177-192`), including `moduleName`,
`isProduction`, `parseOptions`, `strictMode`, and unknown keys. `meta` is merged with the
plugin's `jsutils` (`src/plugin.ts:398-399`).

`insertRuntimeErrors: true` [Legacy] (not for `template`): if compilation throws, the call
is replaced with `(function(){ throw new Error(<message>) })()` instead of failing the build
(`src/plugin.ts:477-487`; test `__tests__/all.test.ts:194`).

### 1.5.4 Options handed to the Ember compiler

(`src/plugin.ts:388-433`.) `contents` (the source), `meta` (user meta + `jsutils`),
`filename` (Babel's filename), `plugins.ast = [...transforms, scopeCrawl]`, all user static
options except `scope`, `locals` (the scope-locals array, §1.4.6), and — for `template()` —
`strictMode: true` (overriding any user value; see §1.3.4). For `precompileTemplate` and
legacy forms, `strictMode` is whatever the user passed (default loose).

### 1.5.5 Output, `targetFormat: 'wire'`

(`src/plugin.ts:452-520`.) The call is replaced by

```js
createTemplateFactory(/*\n  <original source with "*/" escaped as "*\/">\n*/ <payload>)
```

where `createTemplateFactory` is imported from `@ember/template-factory` (unless
overridden) and `<payload>` is the string returned by `compiler.precompile(source, options)`
parsed as a JS expression. For `template()` it is further wrapped:
`setComponentTemplate(<that>, <component expression> ?? templateOnly())` with imports
`setComponentTemplate` from `@ember/component` and default `templateOnly` from
`@ember/component/template-only`. At program exit, the now-unused imports of the recognized
modules are removed (`src/plugin.ts:169-175`).

Example (tests "emits setComponentTemplate … wire format", `__tests__/all.test.ts:1718-1802`):

```js
// in
import { template } from '@ember/template-compiler';
import HelloWorld from 'somewhere';
export default template('<HelloWorld />', { scope: () => ({ HelloWorld }) });
// out
import HelloWorld from "somewhere";
import { setComponentTemplate } from "@ember/component";
import { createTemplateFactory } from "@ember/template-factory";
import templateOnly from "@ember/component/template-only";
export default setComponentTemplate(createTemplateFactory(
  /* <HelloWorld /> */
  { id: "…", block: "…", moduleName: "…", scope: () => ({ HelloWorld }), isStrictMode: true }
), templateOnly());
```

The payload is an object literal expression `{id, block, moduleName, scope?, isStrictMode}`
where `block` is a JSON *string*, and `scope`, present only if some lexical name is used,
is a zero-argument arrow function returning an object whose values are the lexical values in
first-use order (`packages/@glimmer/compiler/lib/compiler.ts:121-161`). Older Ember versions
emitted `scope: () => [a, b]`; the runtime consumes the object positionally via
`Object.values` (`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/shared.ts:108-123`),
so key names are debug-only. Details: §04.

### 1.5.6 Output, `targetFormat: 'hbs'`

*Informative.* The `hbs` target is addon pre-publication tooling: it produces the source an
addon publishes. It is outside the primary scope (§00-0.1 "Non-goals"). What the spec requires
is that the published source, once compiled by the app, behaves as §02–§08 describe.

(`src/plugin.ts:522-639`.) The template is parsed with `@glimmer/syntax` `preprocess` in
`codemod` mode (no whitespace control processing, no entity decoding), user transforms and
the scope crawl run, and the AST is printed back with `entityEncoding: 'raw'`; the printed
text replaces the first argument. Printing may normalize whitespace inside mustaches (e.g.
`{{a (b c) }}` → `{{a (b c)}}`, `__tests__/all.test.ts:2191-2247`) but preserves entities
(`:1486`). Then:

- If new lexical bindings were introduced into a form that does not support `scope`
  (legacy `hbs`), the call is converted to `precompileTemplate` (`src/plugin.ts:562-586`,
  `:605-610`).
- `template()` is converted to
  `setComponentTemplate(precompileTemplate(src, { strictMode, scope? , …}), component ?? templateOnly())`:
  `strict` is renamed to `strictMode` or `strictMode: true` appended; `eval` and `component`
  are removed; the computed scope is written as `scope: () => ({ … })`
  (`src/plugin.ts:612-705`, `:707-753`). (verified: babel hbs; T9a. `template("<Foo/>{{bar}}", { strict: true, scope })`
  gives `setComponentTemplate(precompileTemplate("<Foo />{{bar}}", { strictMode: true, scope: () => ({ Foo, bar }) }), templateOnly())`;
  an `eval` form with `component: this` in a static block gives `…, this)` with the computed `scope`
  and no `eval`/`component` keys; `{ strictMode: false }` gives `{ strictMode: false, strictMode: true }`.
  The source is re-printed, so `<Foo/>` becomes `<Foo />`. Built-ins are not rewritten: `{{on …}}` and
  `{{#each-in}}` stay as written, while `wire` adds `import { on as __keyword__on }`.)

Ember's own built-in AST transforms (§1.6.3) do *not* run in `hbs` mode; they run when the
emitted `precompileTemplate` is later compiled to wire.

**Meaning of the emitted source.** The parse and print use the babel plugin's own
`@glimmer/syntax` dependency (`babel-plugin-ember-template-compilation/src/plugin.ts:10`,
`package.json` `"@glimmer/syntax": ">= 0.94.9"`), not the app's Ember compiler. The
emitted source is `print(preprocess(src, { mode: 'codemod' }), { entityEncoding: 'raw' })`
(`src/plugin.ts:544-545`), and it is that text, not the author's original, that the consuming
app later compiles. The current printer does not always preserve meaning. §02-10 lists the
round trips that change it: `\{{` escapes become live mustaches, raw blocks become ordinary
blocks, and bracketed path segments lose their brackets (`{{foo.[bar baz]}}` →
`{{foo.bar baz}}`, which is a different invocation). Output already published this way is
ordinary template source, and a conforming implementation MUST run it as §02–§08 describe;
it need not reproduce the re-printing itself. A newer `hbs` target that preserves meaning is
a tooling change that addons can adopt independently (§00-0.1 "Non-goals").

### 1.5.7 AST transform hook and `jsutils`

*Informative.* User-authored AST transforms are not part of the spec (§00-0.1 "Non-goals"):
the plugin interface and the tree it exposes are implementation-defined, and a conforming
implementation need not support them. This section documents the current hook because
Ember's own `AutoImportBuiltins` uses `jsutils`, and because it explains where lexical
bindings added at build time come from.

User transforms are Glimmer AST plugins (§02/§03 describe the plugin interface: a function
`env => { name, visitor }`). They run in order, before the scope crawl and before Ember's
built-in transforms (§1.6.3). The environment's `meta.jsutils` lets a transform affect the
surrounding JS (`babel-plugin-ember-template-compilation/src/js-utils.ts:15-190`):

- `bindExpression(expr, path, {nameHint})` — emits `let <name> = <expr>;` after the module's
  imports and returns a template name bound to it; the name avoids collisions with both JS
  bindings at the template site and block params at `path` (`unusedNameLike`: `a`, `a0`,
  `a1`, …).
- `bindImport(module, exportName, path, {nameHint})` — reuses or creates an import; if the
  imported identifier is shadowed by a block param at `path`, emits an alias `let`.
- `emitExpression(expr)`, `importForSideEffect(module)`.
- `expr` may be a string or `(ctx) => string` with `ctx.import(module, name, hint)`.

Bindings created this way are added to the lexical scope in *both* explicit and implicit
forms. The `locals` array is read-only to transforms ("The only supported way to manipulate
locals is via the jsutils API", `src/scope-locals.ts:115-120`; test `__tests__/all.test.ts:1170`).
Ember's `AutoImportBuiltins` transform uses `bindImport` (§1.6.3).

Runtime compilation has no `jsutils`; user transforms are not available at run time
(`rfcs/text/0931-template-compiler-api.md:301`).

---

## 1.6 The Ember template compiler

### 1.6.1 Entry points

| Entry | Returns | Default mode | Source |
|---|---|---|---|
| `ember-template-compiler` `precompile(src, opts)` | JS expression string (wire payload) | loose | `packages/ember-template-compiler/lib/system/precompile.ts:19-24` |
| `ember-template-compiler` `compile(src, opts)` | template factory | loose | `packages/ember-template-compiler/lib/system/compile.ts:17-32` |
| `@ember/template-compilation` `compileTemplate` | same as `compile`; throws unless the compiler module has been loaded (loading `ember-template-compiler` registers itself) | loose | `packages/@ember/template-compilation/index.ts:22-44`, `packages/ember-template-compiler/index.ts:1-5` |
| `@ember/template-compilation` `precompileTemplate` | build-time only; at run time throws in [Dev], is `undefined` in prod | loose | `packages/@ember/template-compilation/index.ts:32-40` |
| `@ember/template-compiler` `template` | component | strict | `packages/@ember/template-compiler/lib/template.ts:227-254` |
| `ember-template-compiler/minimal` | `precompile`, `_buildCompileOptions`, `_preprocess`, `_print` (subset used by the babel plugin) | — | `packages/ember-template-compiler/minimal.ts:10-12` |

`compile` evaluates the payload with `new Function("return " + payload)()` — i.e. in global
scope, so a payload with a `scope` closure referencing locals cannot be compiled this way.

### 1.6.2 Option normalization

`compileOptions(options)` (`packages/ember-template-compiler/lib/system/compile-options.ts:16-82`;
the `@ember/template-compiler` variant, `packages/@ember/template-compiler/lib/compile-options.ts:56-174`,
additionally handles `eval`/`scope`):

1. Defaults: `isProduction: false`, `plugins: { ast: [] }`, `meta: {}`.
2. `customizeComponentName` is installed: in loose mode an angle-bracket name is mapped to a
   resolver name by `SIMPLE_DASHERIZE` (`packages/@ember/template-compiler/lib/dasherize-component-name.ts:7-22`:
   `::` → `/`; each upper-case letter → lower-case, preceded by `-` unless at index 0 or
   after a non-alphanumeric), and [Dev] asserts against a single `:` (*"You tried to invoke a
   component named <…> in "…", but that is not a valid name for a component. Did you mean to
   use the "::" syntax for nested components?"*). See §08.
3. `moduleName` is copied into `meta.moduleName`.
4. `locals: null` removed.
5. If `strictMode`, `keywords = STRICT_MODE_KEYWORDS` (§1.6.3).
6. AST plugins: the user's `plugins.ast`, followed by the built-in transforms for the mode
   that are not already present (dedup by identity). (`USER_PLUGINS` is always empty in this
   version — there is no longer a global plugin registration API.)
7. [@ember/template-compiler only] `meta.emberRuntime.lookupKeyword` is installed, and
   `eval`/`scope` are converted into a `lexicalScope` predicate and deleted (§1.4.2–1.4.3);
   without either, `lexicalScope` admits only `__ember_keywords__`.

Observable options:

| Option | Effect |
|---|---|
| `strictMode` | §1.7. |
| `moduleName` | §1.3.5. |
| `isProduction` | When true, `{{#in-element}}` does not wrap its destination in the [Dev] null check (`packages/@ember/template-compiler/lib/plugins/transform-in-element.ts:35-43`). No other built-in effect. |
| `locals`, `lexicalScope` | §1.4.6. |
| `keywords` | Additional names treated as keywords in strict mode (resolved by the runtime environment rather than erroring; `packages/@glimmer/syntax/lib/parser/tokenizer-event-handlers.ts:663-676`; test "Non-native keyword", `packages/@glimmer-workspace/integration-tests/test/strict-mode-test.ts:98-118`). Normally set only by step 5. |
| `plugins.ast` | Extra AST transforms. Implementation-defined; not part of the spec (§00-0.1 "Non-goals"). |
| `parseOptions` | Passed to the Handlebars parser (`srcName` etc., §02). |
| `mode: 'codemod'` | Parse-only mode used by tooling (§02). |
| `id` | Template id function; default is the first 8 base64 chars of SHA-1 over `JSON.stringify(meta) + blockJSON` when Node's `crypto` is available, else `null` (`packages/@glimmer/compiler/lib/compiler.ts:30-66`, `:131`). Not semantically observable. |

### 1.6.3 Built-in AST transforms and strict-mode keywords

The behavior these transforms produce is normative (it is specified in §03-7 and §08-1.4);
their existence and order as AST transforms is not (§00-0.1 "Non-goals"). The built-in transforms are selected by mode (`packages/@ember/template-compiler/lib/plugins/index.ts:27-50`), in this order:

- **Loose** (`RESOLUTION_MODE_TRANSFORMS`): TransformQuotedBindingsIntoJustBindings,
  AssertReservedNamedArguments, AssertAgainstAttrs,
  TransformEachInIntoEach, AssertInputHelperWithoutBlock, TransformInElement,
  TransformEachTrackArray, AssertAgainstNamedOutlets, TransformWrapMountAndOutlet,
  TransformResolutions.
- **Strict** (`STRICT_MODE_TRANSFORMS`): **AutoImportBuiltins**, TransformQuotedBindingsIntoJustBindings,
  AssertReservedNamedArguments, TransformEachInIntoEach,
  TransformInElement, TransformEachTrackArray, AssertAgainstNamedOutlets,
  TransformWrapMountAndOutlet.

Their individual semantics belong to §03 and §08. `STRICT_MODE_KEYWORDS`
(`…/plugins/index.ts:52-65`) = `mut`, `readonly`, `unbound`, and the internal
names `-each-in`, `-in-el-null`, `-track-array`, `-mount` introduced by the transforms.
(TransformActionSyntax and `action` were removed by emberjs/ember.js#21641; §03-7.3.)

**AutoImportBuiltins** (strict mode only; `packages/@ember/template-compiler/lib/plugins/auto-import-builtins.ts:10-69`;
normative in §03-7.1, runtime meaning in §08-1.3):
every `PathExpression` whose *entire* original text is one of
`array eq element and fn hash neq gt gte lt lte not on or` and that is not a local (block
param or lexical name, `…/plugins/utils.ts:28-65`) is rewritten to a lexical reference to the
corresponding export — `on` from `@ember/modifier`, all others from `@ember/helper`. At
build time this adds an import via `jsutils.bindImport` (name hint `__keyword__<name>`); at
run time it becomes a property read on the internal `__ember_keywords__` table
(`packages/@ember/template-compiler/lib/compile-options.ts:37-54`, `:76-86`). Observable
semantics: in strict mode these 14 names are available without import, but a JS binding or
block param of the same name takes precedence (RFCs 0997–1000 "make … built in").

### 1.6.4 Wire payload envelope

`precompile` returns (`packages/@glimmer/compiler/lib/compiler.ts:121-161`):

```
{ "id": string|null, "block": "<JSON string>", "moduleName": string,
  "scope": () => ({ name1, name2, "this": this, … }),   // omitted if no lexical names used
  "isStrictMode": boolean }
```

Note that `scope` is JS, not JSON; the whole string is a JS expression that must be placed
where the referenced identifiers are in scope. The payload is not a stable public format
(`rfcs/text/0496-handlebars-strict-mode.md` §"Low-level APIs"). See §04.

### 1.6.5 Runtime `template()` algorithm

(`packages/@ember/template-compiler/lib/template.ts:236-309`.)

```
template(source, provided):
  options   := { strictMode: true, ...provided }
  evaluate  := buildEvaluator(options)          -- captures eval, or calls scope() once
  compileOpts := compileOptions(options)        -- calls scope() again if present (§1.6.2 step 7)
  component := compileOpts.component ?? templateOnly()
  payloadJS := glimmerPrecompile(source, compileOpts)   -- throws on syntax / strict-mode errors
  wire      := evaluate("(" + payloadJS + ")")
  setComponentTemplate(createTemplateFactory(wire), component)
  return component
```

Compile errors are thrown synchronously from `template()` and can be caught
(`rfcs/text/0931-template-compiler-api.md:344-353`). The evaluator for the explicit form
passes each own enumerable scope entry (except `this`) as a `new Function` parameter; for
the implicit form it uses the user's `eval`; with neither it uses `new Function` in global
scope. All three inject the keyword table as `__ember_keywords__`.

---

## 1.7 Strict mode and loose mode

### 1.7.1 How a template gets its mode

The mode is a per-template compile-time flag, recorded in the payload as `isStrictMode`
and consulted at run time (§1.7.4).

| Authoring form | Mode |
|---|---|
| `<template>` in `.gjs` / `.gts` | strict (always) |
| `template()` from `@ember/template-compiler` | strict unless `strictMode: false` (runtime) / `strict: false` (babel hbs) — §1.3.4 |
| `precompileTemplate(src, opts)` | `opts.strictMode`, default **loose** |
| `hbs` / legacy inline precompile | loose (`strictMode` may be passed in the call form) |
| Colocated component `.hbs` | loose (§1.9.1) |
| Standalone `.hbs` modules (route templates, classic `templates/components/*.hbs`) | loose (§1.9.3) |
| `ember-template-compiler` `precompile` / `compile` | `opts.strictMode`, default loose |

A conforming implementation MUST support both modes, and templates of different modes MUST
interoperate: strict templates can invoke components authored in loose mode and vice versa
(`rfcs/text/0779-first-class-component-templates.md` §"Interop"; test "works with a curried
string component defined in a resolution mode component",
`packages/@glimmer-workspace/integration-tests/test/strict-mode-test.ts:246`).

### 1.7.2 Strict mode rules (RFC 0496)

`rfcs/text/0496-handlebars-strict-mode.md` defines five restrictions. Their status and
the observable errors (§03 has the full resolution algorithm):

1. **No implicit globals.** A free variable (not a block param, not lexical, not a keyword)
   is a compile-time syntax error. Messages (`packages/@glimmer/compiler/lib/passes/1-normalization/visitors/strict-mode.ts:385-395`,
   `packages/@glimmer/syntax/lib/v2/normalize.ts:802-817`; tests
   `packages/@glimmer-workspace/integration-tests/test/strict-mode-test.ts:74-97`, `:413-561`):
   - `Attempted to resolve a value in a strict mode template, but that value was not in scope: foo`
   - `Attempted to resolve a component or helper in a strict mode template, but that value was not in scope: foo`
     (and `… a helper …`, `… a modifier …`, `… a component …` by position)
   - `Attempted to invoke a component that was not in scope in a strict mode template, \`<Foo>\`. If you wanted to create an element with that name, convert it to lowercase - \`<foo>\``
   - A lower-case tag name not in scope is always an HTML element; a dotted tag whose head is
     not in scope is an error (`You used foo.bar as a tag name, but foo is not in scope`).
2. **No implicit `this` fallback.** `{{foo}}` never means `{{this.foo}}` (test "Undefined
   references is an error" asserts the component getter is not consulted). *Note:* loose
   mode no longer has `this` fallback either (removed per RFC 0308); see §03/§08.
3. **No implicit invocation of argument-less helpers in argument position.** In strict mode
   `@x={{helper}}` passes the helper value; `@x={{(helper)}}` invokes it. In content and
   attribute positions a helper value is invoked (§05).
4. **No dynamic resolution.** `(component "name")`, `(helper "name")`, `(modifier "name")`
   with a string literal is a compile error `(component) cannot resolve string values in
   strict mode templates` (`packages/@glimmer/compiler/lib/passes/1-normalization/keywords/utils/curry.ts:51`);
   a string reaching those at run time is a [Dev] run-time error (`Attempted to resolve a
   dynamic component with a string definition, \`…\` in a strict mode template…`,
   `packages/@glimmer/runtime/lib/references/curry-value.ts:45`,
   `packages/@glimmer/runtime/lib/compiled/opcodes/component.ts:181-191`).
5. **No partials / eval.** `{{partial}}` does not exist in this version in either mode.
   `{{debugger}}` is permitted in strict mode.

Keywords available without import are specified in §03 (RFC 0496's list, as amended by
later RFCs and the implementation's `STRICT_MODE_KEYWORDS` plus AutoImportBuiltins,
§1.6.3). The RFC's `scope: [...]` allow-list option (`rfcs/text/0496-handlebars-strict-mode.md`
§"The ambient scope") is realized as `locals` / `lexicalScope` (§1.4.6); in strict mode
*every* free name must be lexical or a keyword — there is no "emit a JS reference and hope"
path in the current implementation.

### 1.7.3 Loose mode **[Loose mode]**

Loose mode allows free names to be resolved at run time against the template's owner
(components, helpers, modifiers by string name), string-based `(component "x")`, and the
classic Ember keyword set and transforms (§03, §08). Loose templates MAY still have lexical
scope (`precompileTemplate(src, { scope })` without `strictMode`): lexical names take
precedence over resolution (`packages/@glimmer-workspace/integration-tests/test/lexical-scope-test.ts:6-14`;
`packages/@glimmer/syntax/lib/v2/normalize.ts:834-836`) — this is **[Loose mode]** behaviour
used by colocated templates after AST transforms add bindings (§1.5.7, converted per §1.5.6).

### 1.7.4 Run-time effects of the mode flag

`isStrictMode` is not only a compile-time switch. At run time it controls whether a
*string* value reaching dynamic component invocation or `component`/`helper`/`modifier`
currying is resolved via the owner (loose) or rejected (strict)
(`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/vm.ts:134`,
`…/helpers/components.ts:177`). A new implementation MUST carry the mode into run time for
these cases (§05).

---

## 1.8 Template factories and component association

### 1.8.1 `createTemplateFactory`

`createTemplateFactory(payload)` (exported from `@ember/template-factory`,
`packages/@ember/template-factory/index.ts:1`; implementation
`packages/@glimmer/opcode-compiler/lib/template.ts:44-103`) returns a function
`factory(owner?) => Template`:

- The `block` JSON is parsed lazily on first call, once per factory.
- Without an owner, a single ownerless `Template` is cached and returned.
- With an owner, one `Template` per owner is cached (WeakMap keyed by owner); repeated calls
  with the same owner return the identical object (test
  `packages/@ember/-internals/glimmer/tests/unit/template-factory-test.js:13-80`, which also
  pins that `precompile` + `createTemplateFactory` and `compile` produce equivalent factories).
- `factory.__id` and `factory.__meta = { moduleName }` exist for [Legacy] addon
  compatibility; a missing id is replaced by `client-<n>`.
- The resulting `Template` exposes `id`, `moduleName`, `referrer: { moduleName, owner }`
  [Legacy], and compiled layouts.

### 1.8.2 Template ownership

A template instance is bound to an owner when the factory is called with it. Ember calls the
factory with the owner that is resolving/instantiating the component definition
(`packages/@glimmer/program/lib/constants.ts:175-205`,
`packages/@ember/-internals/glimmer/lib/resolver.ts:233-248`). The bound owner is what loose
mode uses to resolve free names (`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/resolution.ts:54-129`);
attempting loose-mode resolution from a template with no owner is a [Dev] error (`Attempted
to resolve a component, helper, or modifier, but no owner was associated with the template
it was being resolved from`, `…/resolution.ts:68-70`). Strict-mode templates do not use the
owner for name resolution. Owner flow into component *instances* is §06.

*Note:* the component-definition cache in `constants.component` is keyed by the definition
object only (`packages/@glimmer/program/lib/constants.ts:181`), so within one renderer the
template of a given definition is bound to the owner of its first use (§06-1.7; open
question §06-12 Q15).

### 1.8.3 `setComponentTemplate` / `getComponentTemplate`

Exported from `@ember/component` (`packages/@ember/component/index.ts:6`); implementation
`packages/@glimmer/manager/lib/public/template.ts:5-43` (RFC 0481 §"Low-level primitives").

```
setComponentTemplate(factory, obj):
  [Dev] obj must be a non-null object or function, else
        Error("Cannot call `setComponentTemplate` on `<debugToString(obj)>`")
  [Dev] obj must not already have its own template, else
        Error("Cannot call `setComponentTemplate` multiple times on the same class (`<name>`)")
  record obj → factory          (weakly; not visible as a property)
  return obj

getComponentTemplate(obj):
  for p in obj, getPrototypeOf(obj), getPrototypeOf(that), … until null:
     if p has a recorded factory: return it
  return undefined
```

Pinned by `packages/@ember/-internals/glimmer/tests/integration/components/component-template-test.js`:
primitives rejected (`:27-59`), double-set rejected (`:61-74`), templates inherited through
both `EmberObject.extend` and native `extends` (`:77-104`, because a subclass constructor's
prototype is its parent constructor), a factory may be shared between classes (`:88-101`).
In production builds the checks are skipped and a second `set` overwrites.

The template is found only via this association: a component definition with a manager and
no associated template renders the manager's default layout (§06). RFC 0481 says it is
"illegal" to set a template after the definition has been rendered; this is not enforced,
but a later association is not observed because definitions are cached (§1.8.2 Note).

### 1.8.4 `templateOnly()`

`templateOnly(moduleName?, name?)` (default export of `@ember/component/template-only`,
`packages/@ember/component/template-only.ts:59-62`;
`packages/@glimmer/runtime/lib/component/template-only.ts:6-57`) returns a **new, distinct**
object on each call (an instance of `TemplateOnlyComponentDefinition` whose prototype carries
the template-only internal component manager). Its manager has all capabilities off; `self`
is `null`, so `{{this}}` is `null` and `{{this.x}}` is `undefined`; there is no instance,
no destroyable and no wrapper element (RFC 0278). `moduleName` / `name` are debug names
(defaults `'@glimmer/component/template-only'`, `'(unknown template-only component)'`).

### 1.8.5 When lexical scope is evaluated

This section is the owner of lexical-scope timing; §04-4.3.3 and §05-1.1 refer to it.

The payload's `scope` closure is called when a `Template`'s layout is first built — i.e.
lazily, per (template factory, owner) — and its values are snapshotted into the compiled
layout (`packages/@glimmer/opcode-compiler/lib/opcode-builder/helpers/shared.ts:108-123`,
called from `packages/@glimmer/opcode-compiler/lib/compilable-template.ts:57-60` and
`packages/@glimmer/opcode-compiler/lib/template.ts:130-141`). For a component template the
layout is built when the component definition is first created
(`packages/@glimmer/program/lib/constants.ts:197-219`). That is at the latest its first
render, and can be earlier: when a template block that statically invokes the component is
first compiled, even if the invocation itself is not rendered then.

The closure may be *called* more than once per template object. A wrapped layout (classic
components with a tag) calls it in its constructor and again when it compiles, so a thunk can
run up to three times (§04-4.14 item 4). The values that the compiled code uses are those of
a single call, made no earlier than the first build of the layout, and they never change
afterwards: lexical values are constants for the life of the template object (§05-1.1).

Normative consequences for build-time compiled templates:

- A template MAY reference a `const`/`let`/`class` binding declared *later* in the module
  (temporal dead zone is not hit because `scope` is not called at definition time), as long
  as the binding is initialized before the first render.
- Reassigning a binding after the first render has no effect on already-bound templates.
- Reassigning before the first render *is* observed (for the build-time and runtime implicit
  forms). *This is observable and differs from the runtime explicit form*, where `scope()`
  is invoked eagerly (twice) at `template()` time (§1.6.5), so later-declared bindings throw
  a `ReferenceError` there and pre-render reassignment is not observed.

A new implementation MUST preserve, for build-time forms, "evaluated no earlier than the
template is first needed, and captured once per template instance". It MAY call the closure
fewer times than the current implementation does (see §1.11 item 3 for the runtime explicit
form, where the calls are observable).

---

## 1.9 Classic `.hbs` templates **[Loose mode]**

### 1.9.1 Colocated component templates (RFC 0481)

A file `components/foo.hbs` next to `components/foo.{js,ts}` (or `foo/index.hbs` next to
`foo/index.js`) is merged into the JS module at build time. Two implementations exist; both
produce the same observable result:

- ember-cli-htmlbars (classic builds): prepends
  `import { hbs } from 'ember-cli-htmlbars'; const __COLOCATED_TEMPLATE__ = hbs(<source>, {contents, moduleName: <relative path>, parseOptions: {srcName}});`
  and wraps the default export in `setComponentTemplate(__COLOCATED_TEMPLATE__, <default export>)`
  (named class declarations are left in place and associated by a trailing statement; an
  `export { x as default }` is associated after the fact)
  (`ember-cli-htmlbars-main/lib/colocated-broccoli-plugin.js:134-155`,
  `ember-cli-htmlbars-main/lib/colocated-babel-plugin.js:77-162`).
  If the JS file re-exports `export { default } from …`, or has no default export, the
  module is replaced with a thrown error (`…/colocated-broccoli-plugin.js:165-179`).
- Embroider: imports the sibling `./foo.hbs` module's default (a template factory, §1.9.3)
  and emits `setComponentTemplate(TEMPLATE, <default export>)`, handling class/function
  declarations, anonymous declarations, and `export { x as default }` re-exports
  (`embroider/packages/shared-internals/src/template-colocation-plugin.ts:95-192`).

Colocated templates are compiled in **loose mode** with `moduleName` set to the template's
path (e.g. `my-app/components/foo.hbs`). Because association mutates the default-exported
object, exporting a shared parent class would give the parent (and all its subclasses) this
template (RFC 0481 §"Build-time transformations").

### 1.9.2 Template-only colocated components

A `components/foo.hbs` with no sibling JS file yields a synthesized module
`export default templateOnly()` associated with the template
(`ember-cli-htmlbars-main/lib/colocated-broccoli-plugin.js:180-184`; RFC 0481
§"Template-only components"). Semantics: §1.8.4.

### 1.9.3 Standalone `.hbs` modules

Any other `.hbs` module (route templates under `app/templates/`, [Legacy] non-colocated
component templates under `app/templates/components/`) compiles to a module whose default
export is a **template factory** in loose mode:

```js
import { precompileTemplate } from "@ember/template-compilation";
export default precompileTemplate("<source>", { moduleName: "<app-name>/templates/foo.hbs" })
```

(`embroider/packages/shared-internals/src/hbs-to-js.ts:17-35`.) How the router and classic
component lookup consume these factories — and how RFC 1046 lets a route template module
export a *component* instead, invoked with `@model` and `@controller` — is §08
(`rfcs/text/1046-template-tag-in-routes.md` §"Specification";
`packages/@ember/-internals/glimmer/lib/component-managers/route-template.ts`).

Non-colocated component templates and pods layouts are deprecated by RFC 0995
(`rfcs/text/0995-deprecate-non-colocated-components.md`). This checkout no longer supports
them. The resolver pairs a component with its template only through `getComponentTemplate`,
which reads what `setComponentTemplate` recorded, and otherwise returns `layout: null`
(`packages/@ember/-internals/glimmer/lib/resolver.ts:69-85`). There is no `template:components/*`
or pods lookup (§08-5). The one remaining registry lookup of a template is the classic
`layoutName` path (`packages/@ember/-internals/glimmer/lib/component-managers/curly.ts:155`,
§08-6) **[Legacy]**.

---

## 1.10 Conformance notes for a new implementation (non-normative)

- Everything upstream of the Ember compiler — `content-tag`, the babel plugin's call-site
  recognition, option parsing and scope discovery — is independent of the VM and can be
  reused unchanged. The contract a new compiler must honour at that boundary is:
  `precompile(source, { strictMode, locals | lexicalScope, moduleName, meta, plugins, isProduction, keywords, customizeComponentName })`
  returning a JS expression string that, when placed in the caller's lexical scope and passed
  to `createTemplateFactory`, yields a factory with the semantics of §1.8.1, reading lexical
  values no earlier than first use (§1.8.5).
- Wire payloads are not a compatibility surface (§00-0.2): addons ship template source, not
  precompiled templates. An implementation is not required to accept the wire envelope of
  §1.6.4 (or the older array-form `scope`) for templates it did not compile itself. The
  babel plugin's `hbs` target (§1.5), by contrast, is compatibility-relevant because it
  is how addons ship source.
- The owner-keyed caching and ownerless template of §1.8.1 are observable only through
  identity and resolution; a new implementation may restructure them provided loose-mode
  resolution uses the correct owner.

---

## 1.11 Open questions / inconsistencies

1. **`strict` vs `strictMode` in `template()`.** RFC 0931 names the option `strict`. The
   runtime `template()` honours only `strictMode` and ignores `strict`; the babel plugin in
   `hbs` target honours only `strict` (renaming it) and, if the user passed `strictMode:
   false` without `strict`, appends a second `strictMode: true` key (last one wins → strict);
   in `wire` target it forces `strictMode: true` regardless of either key
   (`babel-plugin-ember-template-compilation/src/plugin.ts:418-430`, `:731-753`;
   `packages/@ember/template-compiler/lib/template.ts:240`). So `template(src, {strict:false})`
   is loose via babel-hbs, strict via babel-wire, strict at run time (verified: babel hbs, babel wire, runtime;
   T9a). *Naming settled:* `template()`'s option is `strict` (RFC 0931, default `true`);
   `strictMode` belongs to the older lower-level APIs (`precompileTemplate`, `precompile`,
   `compile`), so the spec treats `strictMode` passed to `template()` as unsupported.
   *Still open:* RFC 0931 says `strict: false` selects loose mode, and only the babel `hbs`
   path honours it. Either the babel `wire` path and the runtime should honour it, or
   `template()` should be declared strict-only (loose mode is being phased out).
2. **Runtime implicit form misses some bindings.** `inScope` uses `typeof x !== "undefined"`
   and excludes names that are also globals (`packages/@ember/template-compiler/lib/compile-options.ts:99-104`, `:181-200`).
   Hence at run time a local whose value is `undefined`, or a local that shadows a global
   (browser `name`, `status`, `open`, `event`, …), is not lexical — a strict-mode compile
   error or (for keywords) keyword behaviour — whereas the babel plugin binds them. `this`
   is never found at run time (the global evaluator is a sloppy `new Function`, where `this`
   is defined), whereas babel captures lexical `this` in expression position.
   (verified: babel wire, runtime; T9a. At run time `{{u}}`, `{{name}}` and `{{status}}` fail
   with "not in scope" while `{{ok}}` renders, and `{{this.message}}` reads the component's
   `this`, not the caller's. Babel wire binds all of them.)
3. **Runtime explicit scope uses `in`.** `lexicalScope = name in scope`
   (`…/compile-options.ts:116-117`) includes inherited properties (`toString`,
   `constructor`, `hasOwnProperty`, …), but the evaluator binds only own enumerable entries
   (`…/template.ts:295-306`), so `{{toString}}` compiles and then reads whatever
   `toString` means inside `new Function` (the global). Also `scope()` is called twice
   eagerly (`…/template.ts:278`, `…/compile-options.ts:114`), observable with side effects,
   and at a different time than build-time compilation (§1.8.5). (verified: runtime, T9a: with
   `scope: () => ({})`, `{{toString}}` compiles and renders `[object Undefined]`, `{{constructor}}`
   throws `Illegal constructor`, `{{hasOwnProperty}}` throws a `TypeError`, `{{nope}}` is "not in scope";
   a `scope()` with a counter ran twice, first from `buildEvaluator`, then from `buildCompileOptions`.)
4. **Private fields in scope** (`scope: (instance) => ({ "#x": instance.#x })`) are specified by
   RFC 0931 but unimplemented in the babel parser, the runtime, and the template grammar.
5. **`hasLocal` counting bug in `trackLocals`.** Recorded as §03-10 item 12, which owns it.
   It affects which names AutoImportBuiltins (§1.6.3) treats as shadowed.
6. **`content-tag` claims `<template>` in any `<`-token position**, including TypeScript
   type arguments and relational expressions (`swc/crates/swc_ecma_parser/src/lexer/mod.rs:454-466`).
   Probably acceptable but unspecified.
7. **Indentation edge cases left unspecified.** CRLF normalization happens only for
   multi-line bodies, and RFC #1121 is not in the local RFC repo, so the intended specification
   of §1.2.4 cannot be checked against the implementation.
8. **Multiple top-level `<template>`s / multiple class-member `<template>`s** are not
   diagnosed by `content-tag`; they fail later (duplicate `export default`, or the [Dev]
   `setComponentTemplate` double-set error; silently last-wins in production).
9. **Rename of shorthand scope entries.** The compiled scope object uses shorthand keys
   (`()=>({Foo})`) and the babel plugin renames *all* matching identifiers
   (`babel-plugin-ember-template-compilation/src/plugin.ts:435-450`), which may rewrite the
   key as well as the value for `{ Foo: bar }`. Harmless because values are consumed
   positionally (§1.5.5) and keys are debug-only, but the debug names may be wrong. The
   babel tests normalize this away (`__tests__/all.test.ts` `canonicalizeWireScope`).
10. **Definition cache ignores owner.** Recorded as §06-12 Q15, which owns it.
11. **`@ember/template-compiler` (non-runtime) at run time.** RFC 0931 says calling it without
    the compiler should throw; the implementation always ships a working compiler behind both
    entry points. Whether apps can rely on this is unspecified.
12. **`ember-template-compiler/lib/plugins/index.ts`** duplicates the plugin lists of
    `@ember/template-compiler/lib/plugins/index.ts` but appears unused by
    `ember-template-compiler/lib/system/compile-options.ts` (which imports from
    `@ember/template-compiler/-internal-primitives`); the two copies differ in whether
    `AutoImportBuiltins` is in `INTERNAL_PLUGINS`. Possible drift hazard.
13. **`compile()` cannot handle lexical scope.** It evaluates the payload in global scope
    (`packages/ember-template-compiler/lib/system/compile.ts:30-32`), so
    `compile(src, { strictMode: true, locals: [...] })` produces a scope closure referring to
    globals. Probably intended; unspecified.