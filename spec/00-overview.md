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
consumption primitive in §07-2.2 (`isValid`, a public `untrack`, `onInvalidate`), which the
other chapters use to describe updates without referring to references or tags. Existing
behavior never depends on a **[Proposed]** API.

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

- **§02** edge cases were checked by running the built `@glimmer/syntax` against a large set
  of probe inputs.
- **§03** and **§04** claims marked as verified, and all §04 worked examples, came from
  running this repository's template compilers.
- **§08** compile-output claims were checked the same way.
- **§01**, **§05**, **§06**, and **§07** are written mainly from reading source and tests.

Line-number citations were accurate when each chapter was written. Treat a citation that no
longer matches as a pointer to the nearby code.

Every chapter ends with an *Open questions / inconsistencies* section. These list suspected
bugs, untested paths, and places where the current implementations disagree. The main
disagreements are between the babel and runtime compilation paths, and between strict and
loose mode.
