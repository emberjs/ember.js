# Spec work status

This file is the single source of truth for resuming work on the spec. Keep it current: an
agent or session that has only this file, `plan.md`, and the git history must be able to
continue the work. Last updated: 2026-09-29.

## Working protocol

- **Low parallelism.** Run at most one or two agents at a time and prefer steady progress.
  Delegate mechanical tasks, such as citation checks and test-assertion hunting, to cheaper
  models (Sonnet or Haiku). Keep judgment-heavy editing, such as cross-chapter
  reconciliation and design sections, on Opus.
- **Every task has a checklist on disk** at `spec/.work/<task>.md`. The agent ticks items off
  (`- [x]`) and adds short notes as it goes, so a new agent can resume from the file alone.
  Agent prompts say: *"If the checklist already has ticked items, continue from the first
  unticked one."*
- **Commit early and often.** An agent commits its `spec/` changes after each completed
  checklist item or small group of items, with a message of the form
  `spec(<task>): <what>`. Nothing outside `spec/` is committed by agents.
- **Durable findings.** Anything an agent learns that matters beyond its own task (a
  cross-chapter issue, a suspected bug, a caveat on verification) goes into the relevant
  chapter's *Open questions* section, or into "Cross-chapter findings" below. It never
  lives only in the agent's final report.
- **Tools live in `spec/tools/`** (see its README), not in the temp scratchpad.

## Decisions

- **Wire format is not a compatibility requirement** (plan.md, "new inputs for this
  session"). Addons ship template source, not wire format. Chapter 04 is **informative**:
  it documents the current encoding and must contain no conformance requirements. Other
  chapters must not require accepting wire format. Because addons ship source, the babel
  plugin's `hbs` re-printing (§02-10) *is* part of the compatibility surface.
- **Reactivity is spec'd abstractly** (§07-0). The **[Proposed]** consumption primitive is
  `isValid(cache)`, a public `untrack(fn)`, and a host-level `onInvalidate(listener)`
  (§07-2.2). It builds on the existing `createCache`, `getValue` and `isConst`.
- **Loose mode and classic components are in scope,** marked **[Loose mode]** or **[Legacy]**.
- **Suspected bugs are recorded, not "fixed" in the spec.** Each goes in its chapter's
  *Open questions* section, for the reader to decide whether to preserve it.

## Chapters

| Chapter | Lines | State | Verification |
|---|---|---|---|
| 00 overview | ~150 | Drafted. §0.1 and §0.2 were updated for the wire-format decision. §0.7 (consolidated open questions) is not yet written. | — |
| 01 authoring formats | ~1190 | Drafted | From source. A few citations were spot-checked. |
| 02 syntax | ~1410 | Drafted | Edge cases were run through the built `@glimmer/syntax` (more than 200 probes). |
| 03 static semantics | ~1300 | Drafted | Many claims were compiled against `dist/dev` (built Sep 27). The runtime `eval` form, the babel plugin and runtime rendering were not run. |
| 04 wire format | ~1560 | Drafted; recast as informative (T1 done). | All examples are real compiler output. |
| 05 runtime semantics | ~1990 | Drafted | From source. Attribute and SSR/rehydration behavior is test-cited. **`each`/`in-element`/`yield` behavior and lifecycle/destruction ordering are source-only** (task T4). |
| 06 managers | ~1470 | Drafted | From source. Citations were not all re-verified (task T3). |
| 07 reactivity | ~1490 | Drafted | From source. Citations were not all re-verified (task T3). |
| 08 Ember integration | ~1890 | Drafted | Compile-output claims were checked against `dist/dev`. |

All `§NN-x.y` cross-references resolve (`python3 spec/tools/xref.py`). All file:line citations
exist and are in range, except two in 07 (`python3 spec/tools/check-citations.py`).

## Task queue

Run these in order, one at a time.

| ID | Task | Model | Checklist | State |
|---|---|---|---|---|
| T1 | Recast 04 as informative and remove wire-compat requirements from other chapters | Sonnet | `.work/T1-wire-informative.md` | done |
| T2 | Cross-chapter consistency pass (items below) | Opus | `.work/T2-consistency.md` | pending; a first attempt was interrupted and may have made a few edits |
| T3 | Citation verification (ranges, then whether cited lines contain the claim), 06 and 07 first | Sonnet | `.work/T3-citations.md` | pending; a first attempt fixed 10 citations (`tools/fixes.log`) |
| T4 | Find test assertions for 05's source-only areas and cite them, or record them as untested | Sonnet | `.work/T4-ch05-tests.md` | pending |
| T2b | Consolidated open questions in §00-0.7 | Opus | `.work/T2b-open-questions.md` | pending |
| T5 | Final read-through: CONVENTIONS compliance, markers, `[Dev]` tags, a tidy STATUS | Opus | `.work/T5-final.md` | pending |

## Cross-chapter findings (from chapter authors' reports)

These are the inputs to T2. Each should end up either reconciled in the chapters or listed in
an *Open questions* section. After that, it can be deleted from this list.

1. **Terminology.** Every chapter uses §07-0's vocabulary. §06 also uses the terms "region" and
   "re-validated", and §05 uses "render transaction" and "commit phase". Define each once and
   use it consistently.
2. **No default modifier or component manager exists.** Plain functions get only the default
   helper manager (§06). Neither 01, 05 nor 08 may claim otherwise.
3. **`updateComponent` and `didUpdate`/`didRender` fire on any change within the component's
   region,** not only when its arguments change. §05-1.6, §06 and §07 must agree.
4. **Commit-phase ordering.** §06-11 gives component `didCreate`, then `didUpdate`, then
   modifier installs, then modifier updates. §05 says installs run children-first and
   updates parent-first. Destruction:
   - a parent component's destructor is scheduled before its children's;
   - eager destructors run synchronously, deferred ones in the `actions` queue, and
     "destroyed" is marked in the `destroy` queue.

   §05-11 and §06-10/§06-11 must agree. Parts of this are inferred from source, not tested (T4).
5. **Owner for curried components.** The manager's `create` gets the invoking scope's owner,
   but the layout renders with the curried owner. Helpers and modifiers use the curried owner.
   §05, §06 and §08 (engines) must agree.
6. **`{{outlet}}` compiles to `<@outlet />`** and is lexical within route templates (§08-8.3).
   03, 04 and 05 must not describe it as dynamically scoped.
7. **`action` remains a syntax keyword and a strict-mode keyword,** and is still rewritten at
   compile time, but its runtime implementation was removed (§03, §08-2.20).
8. **Free names in loose mode.** A free identifier in argument position (`{{foo bar}}`)
   compiles to a strict-keyword lookup, and the dev error then says "strict mode template".
   A loose `{{foo}}` that resolves to nothing renders nothing silently. §03 owns the static
   side and §08 the runtime side.
9. **Auto-imported strict-mode built-ins** must be listed identically in §01 (14 names),
   §03 and §08-1.3. `eq`/`neq`/`gt`/`gte`/`lt`/`lte`/`and`/`or`/`not`/`element` exist only in
   strict mode.
10. **Lexical scope timing.**
    - §01: lexical values are read at first compile per (template, owner); the runtime
      explicit form calls `scope()` eagerly, and twice.
    - §04: the factory calls `scope()` lazily.
    - §05-1.1: lexical values are constant.

    Reconcile these.
11. **The component-definition cache ignores the owner** (`@glimmer/program/lib/constants.ts`),
    so the component's template factory effectively runs only with the first owner (§01, §04,
    §06-1.7).
12. **`trackLocals` bug** in `@ember/template-compiler/lib/plugins/utils.ts`. The block-param
    count is keyed wrongly, so closing an inner block un-shadows the outer binding. §01 and §03
    both report it; describe it once.
13. **`{{this.fn}}` with a plain function is invoked as a helper.** The component manager is
    checked before the helper manager. §05-3 and §06 must agree.
14. **Eager helper creation.** `{{if c (a) (b)}}` creates both helpers, in the order falsy,
    truthy, condition (§06). §05-1.1 says "values are lazy". Distinguish instance creation
    from value computation. Also, a statically compiled template-only invocation never
    evaluates named arguments that its template doesn't use.
15. **A triple-curly keyword or string literal renders as text** (`{{{if …}}}`,
    `{{{"<b>"}}}`) (§03, §04). Pick one owner chapter and reference it from the others.
16. **The babel `hbs` target round-trip loses meaning** (§02-10, §01-1.5):
    - `\{{` becomes a live mustache;
    - raw blocks become ordinary blocks;
    - `foo.[bar baz]` changes meaning.

    Given the wire-format decision, this is a compatibility-relevant issue.
17. **Ember transforms summarized in §05** (`-track-array`, which §04 says is applied twice;
    `-each-in` with swapped block params; `-in-el-null`; quoted `style` becoming unquoted) must
    match §03-7 and §08-1.4.
18. **The parser keeps duplicate attributes and duplicate hash keys** (§02). §05 must specify
    their runtime meaning or list it as an open question.
19. **Element parameter order.** Attributes come in source order, then modifiers, and `type`
    moves last when there is no `...attributes`. `unless` compiles to `if (not …)`. §05, §03
    and §04 must agree.
20. **`renderComponent` inside a render transaction** returns `undefined`, so its destroy and
    replace logic do nothing (§08 Q9). §05's transaction model must be consistent with this.
21. **Chapter 07 must define the terms other chapters depend on:**
    - "a computation that read no tracked storage never re-runs";
    - per-component skipping;
    - the `[]` collection-contents cell.

    §06 must define the named-arguments object that the default helper manager appends
    (§08-2.6 depends on it).

## Notable suspected bugs (for §0.7)

These are collected from the chapters' open-questions sections. T2 writes the curated version
into §00-0.7.

- **Parser.** Some inputs crash with a `TypeError` instead of a syntax error:
  `{{^foo}}…{{/foo}}`, `{{foo=bar}}`, `{{(foo).bar}}`, `</div {{x}}>`, `<div /{{x}}>`,
  `<!--{{x}}-->`, `{{#each-in}}` with no params. Some input is silently dropped: `a < b`
  becomes `"a "`, and an unterminated tag or comment at EOF disappears. `&#128512;` decodes
  wrongly.
- **Static semantics.**
  - `action`, `mut`, `readonly` and `unbound` can't be shadowed in strict mode on the babel
    path, but can on the runtime path.
  - A strict `<x.y/>` with `x` unbound becomes an element.
  - `{{#let v as |this|}}` rebinds `this`.
  - `{{"foo" 1}}` drops its arguments, and `{{#in-element}}` drops its `{{else}}` block.
- **Authoring.** The runtime `template()` honours only `strictMode`, while babel `hbs`
  honours only `strict`. Runtime implicit scope misses locals that are `undefined`, that
  shadow globals, or are `this`.
- **Runtime DOM.**
  - A namespaced attribute loses its namespace after being removed and set again (untested).
  - `false` in a merged `class` becomes the class `"false"`.
  - An `<svg>` inside `<foreignObject>` is created in the HTML namespace.
  - SSR `in-element` never clears its destination.
  - The `each` `key=` value is read only once.
  - `{{this.str 1}}` on a primitive silently renders nothing.
- **Managers.**
  - The dev-only `willDestroy` capability check never fires (`'string' in d`).
  - `disableAutoTracking: true` means `updateModifier` never runs.
  - A curried dynamic helper re-prepends its positional arguments.
  - In production, `Object.isExtensible(args.named)` throws.
- **Reactivity.**
  - `trackedArray`'s per-index cells never narrow invalidation.
  - `trackedObject` breaks `instanceof`.
  - `getValue` after a throw returns a stale value.
- **Wire format (informative).** There is no version marker, and Ember 5.9–6.3 blocks are
  misread silently. Not a requirement now; keep it as a note only.
