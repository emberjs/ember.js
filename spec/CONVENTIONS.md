# Spec Writing Conventions

These conventions apply to every chapter of the Ember Template Language Specification.

## Audience and purpose

The reader is an engineer building a new, fully backward-compatible implementation of the
template language that compiles templates to plain JavaScript functions (no bytecode VM).
Describe *observable behavior* — what a conforming implementation must do — not how the
current Glimmer VM happens to do it. When a current implementation detail is observable
(ordering of DOM operations, timing of hooks, error messages that tests assert on, etc.)
it *is* behavior and must be specified.

## Normative language

- **MUST / MUST NOT / SHOULD / MAY** are used in the RFC 2119 sense.
- Mark non-normative text with a leading "*Note:*" or put it in a "Rationale" / "Implementation note" subsection.
- Mark behaviors that exist only for legacy compatibility with **[Legacy]**, and behaviors
  that only apply in loose (non-strict) mode with **[Loose mode]**.
- Mark development-only behavior (assertions, deprecations, debug-only checks) with **[Dev]**.

## Abstraction rules

- Do not describe the Glimmer VM's opcodes, stack, heap, or register machine as normative.
  Where they matter for observable behavior, describe that behavior, not the VM that
  produces it. Chapter 04 documents the current wire format as *informative* only: wire
  format is not a compatibility requirement, and no chapter may require accepting it.
- Do not make references (`Reference`), tags (`Tag`), revisions, or validators part of the
  normative model. Reactivity is specified in terms of the abstract model in
  `07-reactivity.md` (tracked storage, reactive computations, validity, and invalidation).
  Other chapters refer to that model with phrases like "evaluated as a reactive computation"
  or "re-evaluated when any tracked storage it consumed has changed".
- Manager APIs are definitive for components, helpers, and modifiers. Never assume a value is
  a subclass of any particular base class.

## Citations

- Cite source for every non-obvious claim, using repo-relative paths with line numbers, e.g.
  `packages/@glimmer/runtime/lib/compiled/opcodes/dom.ts:123`. Sibling repos are cited as
  `babel-plugin-ember-template-compilation/src/plugin.ts:40`, `content-tag/src/lib.rs:10`,
  `rfcs/text/0496-handlebars-strict-mode.md`.
- Where tests pin down behavior, cite them too (integration tests in
  `packages/@glimmer-workspace/integration-tests/test/` and
  `packages/@ember/-internals/glimmer/tests/`).

## Format

- GitHub-flavored Markdown. Number sections (`## 3.2 Attribute values`) so chapters can
  cross-reference each other as `§05-3.2` (chapter-section).
- Use grammar productions (EBNF-ish) for syntax, pseudocode for algorithms, and small
  template/JS examples with the resulting DOM for semantics.
- Each chapter ends with an "Open questions / inconsistencies" section listing places where
  the current implementation is ambiguous, buggy-looking, or untested — do not silently
  paper over these.

## Chapters

| File | Topic |
|---|---|
| `00-overview.md` | Scope, layering, glossary, reading guide |
| `01-authoring-formats.md` | Template tag (.gjs/.gts), content-tag, babel plugin, `template()` / `precompileTemplate` APIs, scope & `eval`, strict vs loose mode, colocation, `setComponentTemplate`, `templateOnly` |
| `02-syntax.md` | Lexing & parsing: Handlebars layer, HTML tokenizer layer, AST (ASTv1), whitespace control, entities, errors |
| `03-static-semantics.md` | Scoping, symbol resolution, keywords, reserved names, normalization (ASTv2), Ember AST transforms, compile-time errors |
| `04-wire-format.md` | **Informative.** The current serialized precompiled template format and the meaning of each construct. Documents the current encoding only; wire format is not a compatibility requirement (§00-0.2) |
| `05-runtime-semantics.md` | Evaluation: content, attributes/properties, elements, blocks, control flow keywords, component invocation, yield, curried values, destruction & ordering, rehydration/SSR |
| `06-managers.md` | Component, helper, modifier manager APIs (public + internal capabilities), default managers, arguments, owner |
| `07-reactivity.md` | Abstract reactivity model, `tracked`, caches, update semantics, proposed reactive core (`cached`, `effect`) |
| `08-ember-integration.md` | Ember-specific keywords, built-in helpers/components/modifiers, loose-mode resolution, classic component behaviors, outlets/mount/routing, render entry points |
