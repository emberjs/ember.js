# 00 — Overview

This is a specification of the Ember template language: the syntax and meaning of Ember
templates, from source text through to DOM, as implemented by Ember 7.5 (alpha) and the
Glimmer VM that ships inside it.

The goal is a document complete enough that someone could write a **fully backward-compatible
new implementation**. In particular, one that compiles templates to plain JavaScript functions
written against a small runtime, and uses the JavaScript stack and heap, instead of compiling
to Glimmer VM bytecode and running on the VM's own stack and heap.

See [`CONVENTIONS.md`](./CONVENTIONS.md) for normative language, markers, and citation style.

## 0.1 What "backward compatible" means here

A conforming implementation MUST, for every input that the current implementation accepts:

1. accept the same **authoring forms**: `<template>` tags, `template()`, `precompileTemplate`,
   `hbs`, and colocated `.hbs` files (§01);
2. accept the same **template source text**, reject the same invalid text, and give each
   accepted template the same meaning (§02, §03);
3. produce the same **DOM**, with the same node identity preserved across updates, and make
   the same observable calls into user code, in the same order and at the same times (§05);
4. drive user-defined components, helpers, and modifiers only through the **manager APIs**
   (§06);
5. update in response to the same **tracked state** changes, and no others that are
   observable (§07);
6. provide the same **Ember built-ins**, resolution, classic component behavior, and
   rendering entry points (§08).

Implementation internals are not part of the contract. That includes the VM, its opcodes,
references, tags, revisions, the program heap, and the **wire format** (§04). They are named only in citations and
"implementation note" asides. Where the current implementation has an observable quirk, the
spec states it. When the quirk looks like a bug, the chapter's *Open questions* section
records it and leaves it to the reader to decide whether to preserve it.

## 0.2 Pipeline and layering

```
 .gjs/.gts source      .hbs file / hbs`…` / precompileTemplate("…") / template("…")
        │                              │
        ▼  content-tag (§01-1.2)       │
 JS with template("…", {eval|scope})   │
        │                              │
        └──────────────┬───────────────┘
                       ▼  babel-plugin-ember-template-compilation (§01-1.5)
                       │  or runtime compiler (§01-1.6)
                       ▼
   ┌─────────────── compile time ────────────────────────────────────────┐
   │ Lexing & parsing: Handlebars layer + HTML tokenizer → ASTv1  (§02)  │
   │ Ember AST transforms (§03-7)                                        │
   │ Scope, keyword and resolution analysis → ASTv2              (§03)   │
   │ Encoding → wire format                                      (§04)   │
   └─────────────────────────────────────────────────────────────────────┘
                       │  createTemplateFactory(wire) → template factory (§04-4.3, §01-1.8)
                       ▼
   ┌─────────────── run time ────────────────────────────────────────────┐
   │ Evaluation: content, elements, attributes, control flow,     (§05)  │
   │   components, blocks, curried values, destruction, SSR              │
   │ Manager protocol for components / helpers / modifiers        (§06)  │
   │ Reactivity: tracked storage, computations, revalidation      (§07)  │
   │ Ember host: resolver, built-ins, classic components,         (§08)  │
   │   outlets & routing, renderer & run-loop scheduling                 │
   └─────────────────────────────────────────────────────────────────────┘
```

The compatibility surface is **template source** together with the authoring APIs that carry
it (§01). The wire format is **not** part of it. Ember makes no promise that wire format stays
compatible across versions, and addons are expected to ship template source, not
precompiled templates. The source reaches the app's build either as `precompileTemplate` /
`template()` calls or as `.hbs` files, and the app's own Ember version compiles it. A new
implementation therefore MAY replace everything from ASTv2 (§03-6) down, for example by
compiling straight to JavaScript. Chapter 04 is **informative only**: it records how the
current implementation encodes each construct, as a guide to the existing compiler and
runtime. Because addons ship source, the way the babel plugin re-prints templates in `hbs`
mode is part of the compatibility surface (§02-10, §01-1.5).

## 0.3 Chapters

| Chapter | Covers | Primary sources |
|---|---|---|
| [01 Authoring formats](./01-authoring-formats.md) | `<template>` tag and content-tag; `template()` (RFC 0931); scope/`eval`; babel plugin; runtime compiler; strict vs loose mode; template factories; `setComponentTemplate`, `templateOnly`; colocation | content-tag, babel-plugin-ember-template-compilation, `@ember/template-compiler`, `@ember/template-factory` |
| [02 Syntax](./02-syntax.md) | Handlebars lexer & grammar, paths, whitespace control, HTML tokenizer layer, ASTv1, source spans, parse errors, codemod printing | `@handlebars/parser`, `@glimmer/syntax` |
| [03 Static semantics](./03-static-semantics.md) | Compile options, scopes, free variables, keywords, classification of invocation forms, ASTv2, Ember AST transforms, compile-time errors | `@glimmer/syntax/lib/v2`, `@glimmer/compiler` pass 1, `@ember/template-compiler/lib/plugins` |
| [04 Wire format](./04-wire-format.md) *(informative)* | Serialized template object, template factory contract, block/symbol layout, every opcode, caller/callee binding, version history | `@glimmer/wire-format`, `@glimmer/compiler` pass 2, `@glimmer/opcode-compiler` |
| [05 Runtime semantics](./05-runtime-semantics.md) | Render model and cursors, expressions, content, elements/attributes, truthiness and control flow, blocks/yield, component invocation, curried values, helpers, modifiers, destruction, runtime errors, SSR & rehydration | `@glimmer/runtime`, `@glimmer/reference`, `@glimmer/node`, integration tests |
| [06 Managers](./06-managers.md) | Associating values with managers, owners, args proxies, component/helper/modifier manager APIs and capabilities, template-only components, internal capabilities, `@glimmer/component`, destroyables, commit phase | `@glimmer/manager`, `@glimmer/component`, `@glimmer/destroyable`, Ember component managers |
| [07 Reactivity](./07-reactivity.md) | Abstract reactivity model, proposed consumption primitive, `tracked` in all forms, `@cached`, cache primitives, tracked collections, Ember object-model interop, mapping of template evaluation onto the model, render timing | `@glimmer/validator`, `@glimmer/tracking`, `@ember/-internals/metal`, `@ember/reactive` |
| [08 Ember integration](./08-ember-integration.md) | Built-in helpers/modifiers/components, loose-mode resolution, classic components, `Input`/`Textarea`/`LinkTo`, outlets/routing/engines, renderer & run loop, global-context hooks, trusted HTML, event dispatcher, debug render tree | `@ember/-internals/glimmer`, `@ember/helper`, `@ember/modifier`, `@ember/component`, `@ember/routing` |

### Reading guide

- **To build a compiler:** read §02, then §03. §01 describes what surrounds the compiler:
  the inputs it receives and what the emitted module looks like. §04 shows how the current
  compiler lowers each construct, which is useful as a worked reference but not a contract.
- **To build a runtime:** read §07-0 and §07-1 first, which cover the vocabulary and the
  reactivity model. Then §05, which is organized by template construct. Consult §06 whenever
  §05 invokes a manager.
- **For Ember-specific behavior:** read §08, which layers on top of §05–§07.

## 0.4 Core vocabulary

Each chapter defines its own terms. These are the cross-cutting ones:

| Term | Defined in |
|---|---|
| tracked storage / cell, read/consume, write/invalidate, reactive computation, tracking frame, untracked frame, dependency set, valid/invalid, constant, equality policy, render transaction, commit phase, revalidation, write-after-consume assertion, invalidation hook | §07-0 |
| template source, template factory, component definition, template-only component, strict / loose mode, lexical scope, explicit / implicit form | §01-1.1 |
| evaluation context (self, scope slots, lexical scope values, owner, dynamic scope), block, reactive value, cursor, bounds | §05-1 |
| keyword, free variable, upvar, lexical variable, resolution | §03-3, §03-4 |
| manager, capabilities, args proxy, owner, destroyable | §06 |
| wire format, serialized template, template block, symbol table | §04 |

Chapters use "**[Proposed]**" to mark new API that this spec introduces. That is chiefly the
consumption primitive in §07-2.2 (`isValid`, a public `untrack`, `onInvalidate`). Chapter 07
uses it (§07-2.4) to show that every renderer need can be expressed without references or
tags. The other chapters describe updates with the abstract model of §07-1 and do not call the
proposed API. Existing behavior never depends on a **[Proposed]** API.

## 0.5 Conformance markers

| Marker | Meaning |
|---|---|
| **[Loose mode]** | Applies only to templates compiled in loose (non-strict, "resolution") mode. |
| **[Legacy]** | Exists for backward compatibility, e.g. classic components. |
| **[Dev]** | Development-build-only behavior: assertions, deprecations, debug-only checks. A production build MUST NOT depend on it, and a conforming implementation SHOULD provide equivalent diagnostics in development. |
| **[Proposed]** | New API introduced by this spec; not in the current implementation. |

## 0.6 Status and verification

Each chapter was written from the source in this repository and in the sibling repositories
`rfcs`, `babel-plugin-ember-template-compilation`, and `content-tag`, and cites them
throughout. How much each chapter was verified by running code varies:

- **§02** edge cases were checked by running the built `@glimmer/syntax` against more than
  200 probe inputs.
- **§03** claims marked as verified came from compiling against this repository's built
  template compiler (`dist/dev`). The runtime `eval` form, the babel plugin and runtime
  rendering were not run.
- **§04** worked examples are all real compiler output.
- **§08** compile-output claims were checked against `dist/dev` in the same way.
- **§05** is written from source. Its attribute and SSR/rehydration behavior, `each`,
  `in-element`, `yield` and blocks, modifier ordering, classic lifecycle hooks and
  destruction order cite the tests that pin them. Claims with no test are marked
  "(untested)" and gathered in §05-14 item 20.
- **§06** and **§07** are written from source, and their citations were checked to point at
  the construct named.
- **§01** is written from source, with a few citations spot-checked.

Every file:line citation in every chapter was checked to exist and to be in range.
Line-number citations were accurate when each chapter was written. Treat a citation that no
longer matches as a pointer to the nearby code.

Every chapter ends with an *Open questions / inconsistencies* section. These list suspected
bugs, untested paths, and places where the current implementations disagree. The main
disagreements are between the babel and runtime compilation paths, and between strict and
loose mode. §0.7 collects the most important of them.

## 0.7 Consolidated open questions

This section is a curated index of the chapters' *Open questions / inconsistencies*
sections. Each line states a question or suspected bug and names the item that owns it.
The owning item has the details, citations, and test status. The list is not exhaustive:
minor items, such as error-message typos, dead code, and debug-only labels, stay in their
chapters. Nothing here changes the normative text. Where current behavior is specified and
looks like a bug, the spec still describes the current behavior (§0.1).

### 0.7.1 Decide first: preserve or change

A new implementation cannot stay neutral on these. Each one is observable, and either
choice breaks someone.

1. The babel `hbs` target re-prints `a \{{foo}}`, `{{{{raw}}}}…{{{{/raw}}}}` and
   `{{foo.[bar baz]}}` with a different meaning, and addons publish that output. Should a new
   `hbs` target preserve meaning or reproduce the output byte for byte? (§01-1.11 item 15,
   §02-10)
2. `template(src, { strict: false })` is loose through babel `hbs`, strict through babel
   `wire`, and strict at run time, because the runtime reads only `strictMode`. Which option
   name wins, and what does it mean? (§01-1.11 item 1)
3. `updateComponent` and the classic `willUpdate`/`didUpdate`/`didRender` hooks run on any
   invalidation inside the component's region, not only on argument changes. Tests pin this,
   so finer-grained regions would be incompatible. (§06-12 Q12, §08-14 Q11)
4. Duplicate attributes and duplicate named arguments are accepted. A component's layout
   sees the first `@a` while its manager sees the last, and `class` is merged only when the
   element has modifiers or `...attributes`. Should duplicates become a compile-time error?
   (§05-14 item 19)
5. Triple curlies are ignored for literals and keyword appends: `{{{"<b>"}}}`,
   `{{{if c x}}}` and `{{{helper h}}}` render text. (§05-14 item 18)
6. In loose mode, `{{foo}}` renders nothing, with no error, when neither `component:foo` nor
   `helper:foo` exists. (§08-14 Q1)
7. Legacy and stage-3 `@tracked` differ observably in initialization timing and accessor
   placement. An implementation must pick one per build mode. (§07-5 item 7)
8. Whether argument expressions are evaluated depends on how the component is invoked. A
   static invocation of a template-only component evaluates only the arguments its layout
   reads, while a dynamic one evaluates all of them. `createHelper` runs eagerly in static
   position but re-runs on tracked reads in dynamic position. (§06-12 Q5, Q6)
9. Path computations are shared per (parent, segment), so `{{this.foo}} {{this.foo}}` runs
   the `foo` getter once, and the sharing crosses component boundaries. §07-4.2 requires no
   more evaluations than today. Is that sharing a contract or an artifact? (§07-5 item 5)
10. `&#128512;` decodes through `String.fromCharCode` to U+F600. Templates may depend on
    this. (§02-11 item 9)

### 0.7.2 Parser robustness

11. Some inputs crash with a `TypeError` instead of a syntax error: `{{^foo}}…{{/foo}}`,
    `{{foo=bar}}`, `{{(foo).bar}}`, `</div {{x}}>`, `<div /{{x}}>`, `<!--{{x}}-->`, and
    `{{#each-in}}` with no params. (§02-11 items 1, 2, 7; §03-10 item 11)
12. Some input is dropped silently: `a < b` becomes `"a "`, `<>` disappears, and so does an
    unterminated tag or comment at EOF. (§02-11 item 6)
13. `{{"foo" bar baz=1}}` silently drops its arguments, while `{{#"foo"}}` and `("foo")` are
    errors. `this/foo` becomes the free variable `foo`, not `this.foo`. (§02-11 items 3, 4;
    §03-10 item 8)
14. `<pre>` and `<textarea>` newline stripping is re-applied after each mustache. `<title>`,
    `<script>` and `<style>` handling is keyed off the last tag name, and void elements are
    case-sensitive (`<BR>` needs a close tag). Tag names such as `<_foo />` (compiled as
    `foo`) and `<É />` (compiled to nothing), and segments containing `.`
    (`{{foo.[bar.baz]}}`), give surprising results. (§02-11 items 5, 10–12; §03-10 item 20)
15. There is no way to write `</template>` inside a `<template>` body. Mixing multi-byte and
    ASCII indentation can make content-tag panic. (§01-1.11 items 7, 8)

### 0.7.3 Strict vs loose divergence

16. A strict `<x.y/>` with `x` unbound becomes an element named `x.y`. Loose mode reports
    an error. (§03-10 item 3)
17. `eq`, `and`, `not`, `element` and the other 7.1 built-ins exist only in strict mode,
    while `concat`, `get` and `unique-id` are built in only in loose mode. (§08-14 Q3)
18. In loose mode, a free name used as an argument (`{{foo bar}}`) is looked up as a strict
    keyword, and the error message says "strict mode". Should this be a compile-time error?
    (§08-14 Q16, §03-5.3)
19. Reserved names: `{{#let v as |this|}}` rebinds `this`, although element block params
    forbid it, and `action` is still a reserved, rewritten keyword with no runtime
    implementation. (§03-10 item 4, §08-14 Q7)

### 0.7.4 Babel vs runtime compile paths

20. `action`, `mut`, `readonly` and `unbound` can be shadowed by the runtime path's
    `lexicalScope` but not by babel's `locals`. (§03-10 item 1)
21. The runtime implicit form misses locals that are `undefined`, that shadow a global
    (`name`, `status`, …), or that are `this`. The explicit form uses `in`, so it accepts
    inherited names such as `toString`, and it calls `scope()` twice. (§01-1.11 items 2, 3)
22. The Ember AST transforms mishandle shadowing. The `trackLocals` counter bug lets an
    inner block param delete an outer one, so the outer `{{on}}` becomes the built-in.
    Element block params are visible to the Ember plugins but not to normalization. A block
    param named `helper`, `modifier`, `each-in` or `in-element` is still rewritten.
    (§03-10 items 12–14)

### 0.7.5 `hbs` round-trip fidelity

The main item is 0.7.1 item 1.

23. The printer lower-cases void-tag checks while the parser does not. Raw blocks have no
    ASTv1 marker. The upstream-Handlebars leftovers (`{{&x}}`, `{{^}}`, `foo/bar`,
    standalone-line stripping) are only partly tested, so their re-printed form is also
    unpinned. (§02-11 items 12, 16, 19)

### 0.7.6 Runtime DOM behavior

24. Namespaces: a namespaced attribute that is removed and then set again loses its
    namespace (untested), and an `<svg>` inside `<foreignObject>` is created in the HTML
    namespace. (§05-14 items 1, 9)
25. `false` in a merged `class` becomes the class `"false"`. (§05-14 item 2)
26. SSR `in-element` never clears its destination, unlike client rendering and rehydration.
    (§05-14 item 10)
27. The `each` `key=` value is read only once, `NaN` keys never match, and `#each` visits
    sparse-array holes while `#each-in` skips them. (§05-14 items 5, 6, 17)
28. `{{this.str 1}}` on a primitive silently renders nothing. Any function in content
    position is called as a helper, and a value with both managers renders as a component.
    (§05-14 items 7, 8)
29. `element` with `null` or `undefined`: the docs, the dev build and the production build
    all disagree. (§08-14 Q4)

### 0.7.7 Managers and owners

30. Owners are inconsistent. The component-definition cache ignores the owner, so a template
    factory runs with whichever owner renders it first. For a curried component, `create`
    gets the invoking owner while the layout gets the curried one. An `undefined` owner
    throws a raw `TypeError` in component and modifier managers. (§06-12 Q15, Q3, Q4)
31. Capability handling: the dev-only `willDestroy` check never fires (`'string' in d`), and
    with `disableAutoTracking: true` `updateModifier` never runs, even when arguments
    change. (§06-12 Q8, Q2)
32. A curried dynamic helper re-prepends its curried positional arguments each time it is
    re-created. (§06-12 Q11)
33. Production differs from development in ways code can observe.
    `Object.isExtensible(args.named)` throws, writes to the args proxy are silently lost,
    capability versions are not checked, and `on` reads different arguments.
    (§06-12 Q7, Q1, Q9)
34. `(helper "name")` in loose mode bypasses classic-helper factory injection.
    (§08-14 Q6)

### 0.7.8 Reactivity

35. Invalidation is coarser than it looks. `trackedArray`'s per-index cells never narrow
    invalidation, because every access also uses the collection cell. `@tracked accessor`
    does not invalidate the object-level cell, so `{{#each-in}}` over such an object may
    not update. `trackedObject` breaks `instanceof`. (§07-5 items 8, 11, 12)
36. Validity edge cases: `getValue` after a throw returns a stale value and does not
    rethrow; a write during a computation's own evaluation is invisible in production; and
    a write to a never-read cell does not schedule a run loop. (§07-5 items 1, 3, 4)
37. Addons import private `@glimmer/validator` tag APIs directly, so a new implementation
    needs a shim or the §07-2.2 primitives. (§07-5 item 9)

### 0.7.9 Ordering that is inferred or untested

38. The following orders are derived from source only: hook order across a tree of
    public-manager components, `didCreate` against modifier installs, `updateModifier`
    against `didUpdate`, and the timing of deferred destructors. `each` sync step sequences
    are asserted only in `LOCAL_DEBUG` builds. (§05-14 item 20)
39. Components are destroyed parent-first but modifiers child-first, and the public-manager
    case is untested. `createModifier` sees an element that has no attributes yet and is
    not in the document. (§05-14 items 11, 15)
40. Ember render timing: `renderComponent` called during a render defers the new root, so
    its `destroy()` does nothing and both renders stay live. Each outlet level renders one
    microtask late, and nothing tests whether the empty intermediate state can be observed.
    (§08-14 Q9, Q14)

*Note:* §04-4.14 lists wire-format issues (no version marker, unused upvars, `InElement`
guid collisions). The wire format is informative (§0.2), so these are not requirements.

### 0.7.10 Proposed API to review

§07-2.2 introduces a **[Proposed]** consumption primitive. It keeps the existing
`createCache`, `getValue` and `isConst`, and adds `isValid(cache)`, a public `untrack(fn)`
and a host-level `onInvalidate(listener)`. §07-2.4 uses it to show that updates can be
described without references or tags; the other chapters rely only on the abstract model
of §07-1. This is a design decision for the plan's author, not a
record of existing behavior. Points to review: whether `isValid` of a never-evaluated cache
should return `false` (while `isConst` throws), whether a parameterless global
`onInvalidate` is enough or a per-computation watcher is wanted (§07-2.5), and whether
these should replace the private tag APIs that addons use today (item 37).
