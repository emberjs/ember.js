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
| T2 | Cross-chapter consistency pass | Opus | `.work/T2-consistency.md` | done |
| T3 | Citation verification (ranges, then whether cited lines contain the claim), 06 and 07 first | Sonnet | `.work/T3-citations.md` | pending; a first attempt fixed 10 citations (`tools/fixes.log`) |
| T4 | Find test assertions for 05's source-only areas and cite them, or record them as untested | Sonnet | `.work/T4-ch05-tests.md` | pending |
| T2b | Consolidated open questions in §00-0.7 | Opus | `.work/T2b-open-questions.md` | pending |
| T5 | Final read-through: CONVENTIONS compliance, markers, `[Dev]` tags, a tidy STATUS | Opus | `.work/T5-final.md` | pending |

## Cross-chapter findings (from chapter authors' reports)

The 21 findings from the chapter authors were all reconciled by T2 and removed from this list.
`.work/T2-consistency.md` records, for each one, which chapter now owns it and what changed.
Where the code did not settle a question, it is an *Open questions* item in the owning chapter.
New cross-cutting notes from T2:

1. **`xref.py` only checks that a target exists, not that it is the right one.** T2 found six
   `§05-12` references (Errors) that meant `§05-11` (Destruction). T5 should spot-check that
   cross-references point at the intended section, especially in 05.
2. **Ownership conventions introduced by T2.** Each duplicated rule now has one owner, and the
   other chapters cite it. The main owners are: commit-phase order §06-11; destroy algorithm
   §06-10.2; destruction order §05-11; component-region skipping §05-1.6; element parameter
   order §05-4.1; triple-curly text rule §05-3.5 item 6; lexical-scope timing §01-1.8.5;
   auto-import rewrite §03-7.1; loose free names §03-5.3 (static) and §08-5 (runtime);
   `trackLocals` bug §03-10 item 12; `hbs` round trip §01-1.11 item 15. Duplicate open
   questions were merged into one item, and the others now say "Recorded as …". T2b should
   collect from the owners.
3. **Several fixes came from the source, not from the chapters.** These were: classic
   `willDestroy` runs in the `actions` queue (§08-6.7); `style="a {{x}}"` does trigger the
   style warning (§08-10.6); `type` is applied *last*, which is why range inputs clamp
   (§05-4.5.2); roots added during a render are rendered in a later runtime transaction
   (§07-1.10 item 5); and `-get-dynamic-var`/`-with-dynamic-vars` are no longer emitted by
   Ember (§05-5.8). T3 and T4 should not "restore" the older wording.

## Notable suspected bugs (for §0.7)

These are collected from the chapters' open-questions sections. T2b writes the curated version
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
- **Found during T2.**
  - Duplicate named arguments: a component's layout `@a` sees the first occurrence, while its
    manager's `args` sees the last (§05-7.3, from source).
  - Duplicate attributes: `class` is merged only when the element has modifiers or
    `...attributes`, and a duplicate `type` keeps only the last occurrence (§05-4.9).
  - `{{{"<b>"}}}` and `{{{if c x}}}`/`{{{helper h}}}` render text (§05-3.5 item 6).
  - The babel `hbs` target loses `\{{` escapes, raw blocks and bracketed segments (§01-1.11
    item 15).
  - `-track-array` is applied twice (harmless, §03-7.8).
- **Wire format (informative).** There is no version marker, and Ember 5.9–6.3 blocks are
  misread silently. Not a requirement now; keep it as a note only.
