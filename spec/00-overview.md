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
references, tags, revisions, the program heap, and the **wire format** (§04).

**Evaluation is not part of the contract.** When, and how often, an implementation evaluates
template expressions is not behavior that user code may depend on. That covers getters reached
through paths, argument expressions, helper values, the tracked state they consume, and when
a helper manager's `createHelper` runs. An implementation MAY defer, cache, share or repeat
these evaluations, so evaluation counts and getter side effects are unspecified. Two
requirements remain: every rendered value MUST be up to date with the tracked state it reads
(§07), and code that the template does not reach (for example the branch of an `{{#if}}` that
is not taken) MUST NOT be evaluated. The "observable calls into user code" of item 3 are the
manager and lifecycle hooks, modifier hooks, destructors and event handlers, not these
evaluations. Where a chapter describes today's evaluation counts or timing, it does so as
information.

**Non-goals.** These are outside the contract as well (`plan.md`, "Non-goals"):

- **AST transforms and the AST shape.** The spec uses the parse tree (ASTv1, §02) and
  Ember's source-to-source rewrites (§03-7) as a notation for stating what a template means.
  The *behavior* they produce is normative. The trees themselves, the order and existence of
  individual transforms, and the plugin interface through which user-authored AST transforms
  run (`plugins.ast`, the babel plugin's `transforms` and `jsutils`, §01-1.5.7) are not. A
  conforming implementation need not build these trees or accept AST plugins.
- **Addon pre-publication tooling.** What the spec must reproduce is the meaning of template
  source that has already been published. How authoring tools map an author's source to the
  published source, including the babel plugin's `hbs` re-printing (§01-1.5.6, §02-10), can
  change and be adopted independently, and is outside the primary scope. They are named only in citations and
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
   │ Ember source rewrites (§03-7; AST transforms today)                 │
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
runtime. The source that matters is the source addons *publish*. How the babel plugin
re-prints templates in `hbs` mode on the way to publication is addon tooling, outside the
primary scope (§0.1 "Non-goals").

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
  template compiler (`dist/dev`). T9a additionally ran the babel plugin (`wire` and `hbs`) and the
  runtime `template()` path in a browser for the items listed in `.work/T9a-compile-paths.md`
  (§03-10 items 1, 12–14).
- **§04** worked examples are all real compiler output.
- **§08** compile-output claims were checked against `dist/dev` in the same way.
- **§05** is written from source. Its attribute and SSR/rehydration behavior, `each`,
  `in-element`, `yield` and blocks, modifier ordering, classic lifecycle hooks and
  destruction order cite the tests that pin them. Claims with no test are marked
  "(untested)" and gathered in §05-14 item 16. The lifecycle and destruction orderings that
  no test pins were checked by experiment in T9b and are marked "(verified by experiment, T9b)".
- **§06** and **§07** are written from source, and their citations were checked to point at
  the construct named.
- **§01** is written from source. T9a ran the babel plugin and the runtime `template()` path
  against §01-1.11 items 1–3, the `hbs` conversions of §01-1.5.6 and the scope-capture rules of §01-1.4;
  each confirmed claim is marked "(verified: …)".

Every file:line citation in every chapter was checked to exist and to be in range. In every
chapter, each citation whose cited lines did not obviously contain the identifiers named in
the prose was opened by hand and confirmed or corrected. Two claims that the cited code did
not support were rewritten (§01-1.9, §07-4.3).
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

1. `template()`'s option is `strict` (RFC 0931, default `true`); `strictMode` belongs to the
   older APIs. But `template(src, { strict: false })` is loose only through babel `hbs`; the
   babel `wire` path and the runtime ignore it and compile strict. Should they honour
   `strict: false`, or is `template()` strict-only? (§01-1.11 item 1; verified by T9a)
2. Duplicate attributes and duplicate named arguments are accepted. A component's layout
   sees the first `@a` while its manager sees the last, and `class` is merged only when the
   element has modifiers or `...attributes`. Should duplicates become a compile-time error?
   A proposal branch makes them errors, for team discussion. (§05-14 item 15)
3. Triple curlies are ignored for literals and keyword appends: `{{{"<b>"}}}`,
   `{{{if c x}}}` and `{{{helper h}}}` render text. Fix proposed. (§05-14 item 14)
4. `&#128512;` decodes through `String.fromCharCode` to U+F600. Templates may depend on
   this. (§02-11 item 7)

### 0.7.2 Parser robustness

5. `{{^foo}}a{{else}}b{{/foo}}` is accepted and means `{{#foo}}b{{else}}a{{/foo}}`; no test
   covers it, and the form without `{{else}}` is now an error. (§02-11 item 1)
6. Some input is dropped silently: `a < b` becomes `"a "`, `<>` disappears, and so does an
   unterminated tag or comment at EOF. (§02-11 item 5)
7. `{{"foo" bar baz=1}}` silently drops its arguments, while `{{#"foo"}}` and `("foo")` are
   errors. `this/foo` becomes the free variable `foo`, not `this.foo`. (§02-11 items 2, 3;
   §03-10 item 8)
8. `<pre>` and `<textarea>` newline stripping is re-applied after each mustache. `<title>`,
   `<script>` and `<style>` handling is keyed off the last tag name, and void elements are
   case-sensitive (`<BR>` needs a close tag). Tag names such as `<_foo />` (compiled as
   `foo`) and `<É />` (compiled to nothing), and segments containing `.`
   (`{{foo.[bar.baz]}}`), give surprising results. (§02-11 items 4, 8–10; §03-10 item 19)

### 0.7.3 Strict vs loose divergence

9. A strict `<x.y/>` with `x` unbound becomes an element named `x.y`. Loose mode reports
   an error. (§03-10 item 3)
10. In loose mode, a free name used as an argument (`{{foo bar}}`) is looked up as a strict
    keyword, and the error message says "strict mode". Should this be a compile-time error?
    (§08-14 Q16, §03-5.3)
11. `{{#let v as |this|}}` rebinds `this`, although element block params forbid it.
    (§03-10 item 4)

### 0.7.4 Babel vs runtime compile paths

12. `mut`, `readonly` and `unbound` can be shadowed by the runtime path's
    `lexicalScope` but not by babel's `locals`. (§03-10 item 1)
13. The runtime implicit form misses locals that are `undefined`, that shadow a global
    (`name`, `status`, …), or that are `this`. The explicit form uses `in`, so it accepts
    inherited names such as `toString`, and it calls `scope()` twice. (§01-1.11 items 2, 3)
14. The Ember AST transforms mishandle shadowing. The `trackLocals` counter bug lets an
    inner block param delete an outer one, so the outer `{{on}}` becomes the built-in.
    Element block params are visible to the Ember plugins but not to normalization. A block
    param named `helper`, `modifier`, `each-in` or `in-element` is still rewritten.
    (§03-10 items 12–14)

### 0.7.5 `hbs` round-trip fidelity (informative)

§0.1 "Non-goals" puts the `hbs` re-printing outside the primary scope, so these items matter only
to addon tooling.

15. The printer lower-cases void-tag checks while the parser does not. Raw blocks have no
    ASTv1 marker. The upstream-Handlebars leftovers (`{{&x}}`, `{{^}}`, `foo/bar`,
    standalone-line stripping) are only partly tested, so their re-printed form is also
    unpinned. (§02-11 items 10, 13, 16)

### 0.7.6 Runtime DOM behavior

16. Namespaces: a namespaced attribute that is removed and then set again loses its
    namespace, and an `<svg>` or `<math>` inside `<foreignObject>` is created in the HTML
    namespace. Fixes proposed for both. (§05-14 items 1, 7)
17. `false` in a merged `class` becomes the class `"false"`. (§05-14 item 2)
18. SSR `in-element` never clears its destination, unlike client rendering and rehydration.
    (§05-14 item 8)
19. `NaN` keys never match (`===`), so an item keyed by `NaN` is re-created on every sync.
    (§05-14 item 4)
20. `{{this.str 1}}` on a primitive silently renders nothing. Any function in content
    position is called as a helper, and a value with both managers renders as a component.
    (§05-14 items 5, 6)
21. `element` with `null` or `undefined`: the docs, the dev build and the production build
    all disagree. (§08-14 Q4)

### 0.7.7 Managers and owners

22. Owners are inconsistent. The component-definition cache ignores the owner, so a template
    factory runs with whichever owner renders it first. For a curried component, `create`
    gets the invoking owner while the layout gets the curried one. An `undefined` owner
    throws a raw `TypeError` in component and modifier managers. (§06-12 Q15, Q3, Q4)
23. Capability handling: the dev-only `willDestroy` check never fires (`'string' in d`), and
    with `disableAutoTracking: true` `updateModifier` never runs, even when arguments
    change. (§06-12 Q8, Q2)
24. A curried dynamic helper re-prepends its curried positional arguments each time it is
    re-created. (§06-12 Q11)
25. Production differs from development in ways code can observe.
    `Object.isExtensible(args.named)` throws, writes to the args proxy are silently lost,
    capability versions are not checked, and `on` reads different arguments.
    (§06-12 Q7, Q1, Q9)
26. `(helper "name")` in loose mode bypasses classic-helper factory injection.
    (§08-14 Q6)

### 0.7.8 Reactivity

27. Invalidation is coarser than it looks. `trackedArray`'s per-index cells never narrow
    invalidation, because every access also uses the collection cell. `trackedObject` breaks
    `instanceof`. (§07-5 items 6, 7)
28. Validity edge cases: `getValue` after a throw returns a stale value and does not
    rethrow; a write during a computation's own evaluation is invisible in production; and
    a write to a never-read cell does not schedule a run loop. (§07-5 items 1, 3, 4)

### 0.7.9 Ordering that is inferred or untested

29. Several orderings are confirmed only by T9b's throwaway experiments, with no upstream tests,
    and `each` sync step sequences are asserted only in `LOCAL_DEBUG` builds. (§05-14 item 16)
30. `createModifier` sees an element that has no attributes yet and is not in the document.
    (§05-14 item 12)
31. Ember render timing: `renderComponent` called during a render defers the new root, so
    its `destroy()` does nothing and both renders stay live. Each outlet level renders one
    microtask late, and nothing tests whether the empty intermediate state can be observed.
    `{{outlet}}` inside a component stopped rendering with the route manager merge
    (`4b5d79a6d7d1b`), a confirmed regression tracked in emberjs/ember.js#21640.
    (§08-14 Q2, Q9, Q14)

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
these should replace the private tag APIs that addons use today (§07-2.6).
