# Spec work status

This file is the single source of truth for resuming work on the spec. Keep it current: an
agent or session that has only this file, `plan.md`, and the git history must be able to
continue the work. Last updated: 2026-09-30.

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

- **Wire format is not a compatibility requirement** (the author's input of 2026-09-29). Addons ship template source, not wire format. Chapter 04 is **informative**:
  it documents the current encoding and must contain no conformance requirements. Other
  chapters must not require accepting wire format.
- **Non-goals** (`plan.md`, author's input of 2026-09-30, commit `8b343781b3`; §00-0.1):
  - *AST transforms.* The behavior of Ember's internal transforms is normative; the ASTv1
    shape, the transforms' existence and order, and user AST plugins (`plugins.ast`, babel
    `transforms`/`jsutils`) are not. §02 uses ASTv1 as notation, §02-7 is informative as a
    data structure, and §03-7 states meaning through rewrites.
  - *Addon pre-publication tooling.* The babel `hbs` re-printing (§01-1.5.6, §02-10) is
    outside the primary scope; already-published source must run faithfully (§0.1 "Non-goals",
    §01-1.5.6, §02-10). This reverses the earlier note that the re-printing was part
    of the compatibility surface.
- **Reactivity is spec'd abstractly** (§07-0). The **[Proposed]** consumption primitive is
  `isValid(cache)`, a public `untrack(fn)`, and a host-level `onInvalidate(listener)`
  (§07-2.2). It builds on the existing `createCache`, `getValue` and `isConst`.
- **Loose mode and classic components are in scope,** marked **[Loose mode]** or **[Legacy]**.
- **Author rulings of 2026-09-30** (commit `a135fe1862`):
  - `</template>` cannot appear in a content-tag body, by design: the content tag assumes no
    interior syntax (§01-1.2.2 rule 2).
  - The legacy vs stage-3 `@tracked` timing difference is accepted and is orthogonal to the
    renderer (§07-3.1.4).
  - Private `@glimmer/validator` APIs: shim them if cheap; otherwise the main users must
    migrate (§07-2.6).
  - The 7.1 built-ins (`eq`, `and`, `element`, …) are strict-only on purpose; loose mode gains
    no new features (§08-1.2).
  - Modifier destruction order must not differ between development and production; the
    production (child-first) order is correct for both (2026-09-30, after T9b).
  - Loose mode stays as stable as possible while it is phased out: the silent `{{foo}}` is
    kept (2026-09-30, commit `fa282f6d78`; §08-5.1).
  - Upstream fixes were requested for the parser `TypeError` crashes (§0.7.2 item 5), the
    content-tag indentation panic (§01-1.11 item 7), and `@tracked accessor` not dirtying the
    object-level cell (§07-3.1.5). Their branches are listed under "Upstream fix branches".
- **Suspected bugs are recorded, not "fixed" in the spec.** Each goes in its chapter's
  *Open questions* section, for the reader to decide whether to preserve it.

## Upstream fix branches

Fixes requested by the author during review. The spec branch has `origin/main` merged in at
`98fa794473` (base `675744ab35`), so the landed fixes below are in this checkout and the spec
cites their code directly. Branches still open for review are based on that `origin/main`.

| Spec item | Repo | Branch | State | Summary |
|---|---|---|---|---|
| §0.7.2 item 5 | ember.js | `fix/parser-typeerror-crashes` | **Landed on main** (emberjs/ember.js#21635, merge `e1d334284e`) | Syntax errors for inverse sections without `{{else}}`, hash literals, sub-expression-rooted paths, mustaches or comments in end tags, and mustaches in markup declarations. Handlebars syntax in any HTML-comment state becomes comment text. `<div /{{x}}>` treats the stray `/` as HTML does (ignored). `{{#each-in}}` with no params is a syntax error. |
| §01-1.11 item 7 | content-tag | `fix-multibyte-indentation-panic` | **Shipped in content-tag 4.2.1** (embroider-build/content-tag#134) | `strip_indent` counts only ASCII spaces and tabs as indentation. |
| §07-3.1.5 | ember.js | `fix/tracked-accessor-object-tag` | **Landed on main** (emberjs/ember.js#21636) | The `@tracked accessor` setter also dirties the object-level cell. Test in the stable-decorator smoke tests. |
| §05-11.3 | ember.js | `fix/modifier-destruction-order` | **Landed on main** (emberjs/ember.js#21639) | With the debug render tree on, modifiers are now destroyed child-first, as in production (author ruling, 2026-09-30). |
| §08-14 Q2 | ember.js | `test/outlet-inside-component` | **PR open**: emberjs/ember.js#21640 (test only) | Tests showing that `{{outlet}}` inside a component stopped rendering with the route manager merge (`4b5d79a6d7d1b`). No fix yet. |
| §08-2.20 | ember.js | `cleanup/remove-action-keyword` | **Landed on main** (emberjs/ember.js#21641) | `action` is no longer a syntax keyword, a strict-mode keyword, or rewritten by `transform-action-syntax`. |
| §05-14 item 14 | ember.js | `fix/triple-curly-literals-and-keywords` | Open for review | String literals and append keywords (`if`, `unless`, `helper`, …) honour `{{{…}}}`. |
| §05-14 item 1 | ember.js | `fix/namespaced-attribute-updates` | Open for review | Updates of a namespaced attribute keep its namespace after removal. |
| §05-14 item 7 | ember.js | `fix/svg-inside-foreign-object` | Open for review | `<svg>`/`<math>` inside `<foreignObject>` get their own namespace. |
| §05-14 item 15 | ember.js | `proposal/duplicate-attributes-and-arguments-are-errors` | For team discussion (author opens the PR) | Duplicate attributes and named arguments become compile errors; the commit message is the full explainer. |

When a branch is merged, update the owning item to describe the new behavior. Done for the two
that have landed (T7, `.work/T6-feedback-8b34378.md`): §02-3.3, §02-3.8, §02-6.7, §02-6.9–6.11,
§02-9, §03-7.6, §01-1.2.4 and §01-1.11 item 7 now
describe the fixed behavior. The content-tag citations point at `src/transform.rs` as released
in 4.2.1 (identical to the `fix-multibyte-indentation-panic` branch checked out beside this
repo).

## Chapters

| Chapter | Lines | State | Verification |
|---|---|---|---|
| 00 overview | ~350 | Drafted. §0.1 and §0.2 were updated for the wire-format decision and the non-goals (T6). §0.6 matches this table. §0.7 (consolidated open questions) written by T2b; pruned to 31 open items by T12. | — |
| 01 authoring formats | ~1220 | Drafted | From source. T3 hand-checked every flagged citation; one unsupported claim (§01-1.9) was rewritten. T9a ran the babel plugin (`wire`, `hbs`) and the runtime `template()` against §01-1.11 items 1–3, §01-1.4 and §01-1.5.6 (all confirmed; `.work/T9a-compile-paths.md`). |
| 02 syntax | ~1410 | Drafted | Edge cases were run through the built `@glimmer/syntax` (more than 200 probes). |
| 03 static semantics | ~1300 | Drafted | Many claims were compiled against `dist/dev`. T9a ran §03-10 items 1, 12–14 through the babel plugin and the runtime `template()` path (all confirmed). Other §03 claims still have only compiler-level checks. |
| 04 wire format | ~1560 | Drafted; recast as informative (T1 done). | All examples are real compiler output. |
| 05 runtime semantics | ~2210 | Drafted | From source. Attribute and SSR/rehydration behavior is test-cited. T4 added test citations for `each`, `in-element`, `yield`/blocks, modifier ordering, classic lifecycle hooks and destruction order. Claims with no test are marked "(untested)" and gathered in §05-14 item 16. `each` sync step sequences are asserted only in `LOCAL_DEBUG` builds. T9b ran throwaway browser tests for the public-manager component ordering across a tree, component-hook vs modifier-install order, update ordering, deferred destructors and modifier destruction: all confirmed except modifier destruction order, which is creation order (not child-first) when the debug render tree is on (Ember DEBUG default) (§05-11.3; since fixed, #21639). None of these have upstream tests. |
| 06 managers | ~1470 | Drafted | From source. Citations verified by T3. |
| 07 reactivity | ~1490 | Drafted | From source. Citations verified by T3. |
| 08 Ember integration | ~1890 | Drafted | Compile-output claims were checked against `dist/dev`. |

All `§NN-x.y` cross-references resolve (`python3 spec/tools/xref.py`). All file:line citations
exist and are in range (`python3 spec/tools/check-citations.py`), and T3 checked that the NEAR/MISS ones point at the construct named.

All planned tasks (T1–T5) are done. Every chapter is a complete draft that has had a
consistency pass, citation verification and a final CONVENTIONS read-through. None of it has
been reviewed by the plan's author yet.

## Task queue

Run these in order, one at a time.

| ID | Task | Model | Checklist | State |
|---|---|---|---|---|
| T1 | Recast 04 as informative and remove wire-compat requirements from other chapters | Sonnet | `.work/T1-wire-informative.md` | done |
| T2 | Cross-chapter consistency pass | Opus | `.work/T2-consistency.md` | done |
| T3 | Citation verification (ranges, then whether cited lines contain the claim), 06 and 07 first | Sonnet | `.work/T3-citations.md` | done; unsupported claims are listed under "Unsupported claims" in `.work/T3-citations.md` (2 items) |
| T4 | Find test assertions for 05's source-only areas and cite them, or record them as untested | Sonnet | `.work/T4-ch05-tests.md` | done; untested claims are §05-14 item 16 |
| T2b | Consolidated open questions in §00-0.7 | Opus | `.work/T2b-open-questions.md` | done |
| T5 | Final read-through: CONVENTIONS compliance, markers, `[Dev]` tags, a tidy STATUS | Opus | `.work/T5-final.md` | done; markers and normative-language fixes, §0.4/§0.6 wording, 41 cross-references spot-checked (1 fixed) |
| T6 | Author feedback `8b343781b3`: `hbs` re-printing and AST transforms are non-goals | Opus | `.work/T6-feedback-8b34378.md` | done; §00-0.1 "Non-goals", §02 uses ASTv1 as notation, §02-7/§02-10/§01-1.5.6/§01-1.5.7 informative, §03-7 states meaning through rewrites |
| T7 | Rewrite the owning items for the landed parser and content-tag fixes | Opus | `.work/T6-feedback-8b34378.md` | done |
| T8 | Citation refresh after merging `main` (`7364f4b36d`) | Sonnet | `.work/T8-citations.md` | done; ≈70 citations renumbered; one behavior change (lazy plain-array iteration, #21598) written into §05-5.4.1 |
| T9a | Run the babel plugin and runtime `template()` against §01/§03 claims | Sonnet | `.work/T9a-compile-paths.md` | done; 8 items, all confirmed |
| T9b | Throwaway browser tests for the orderings in §05-14 item 16 | Sonnet | `.work/T9b-orderings.md` | done; 5 confirmed, 1 corrected (modifier destruction order depends on the debug render tree) |
| T10 | Hand-check every §-cross-reference | Sonnet | `.work/T10-xrefs.md` | done; 1,054 checked, 0 wrong; every "item N"/"QN" reference resolves to an existing item |
| T11 | Author feedback `fa282f6d78` (Q1 ruling, outlet regression test, `action` cleanup) | Opus | `.work/T11-feedback-fa282f6.md` | done |
| T12 | The ten notes swept into `8e838d47cd`; four bugfix/proposal branches; open-question cleanup | Opus | `.work/T12-cleanup.md` | done; resolved items removed from every list, lists renumbered and references rewritten (`tools/prune-open-questions.py`) |
| T13 | Merge `origin/main` (`98fa794473`: #21636, #21639, #21641) and follow up | Opus | — | done; 68 citations shifted with `tools/remap-citations.py`, the "after this checkout's base" notes rewritten against the new code |

## Cross-chapter findings (from chapter authors' reports)

The 21 findings from the chapter authors were all reconciled by T2 and removed from this list.
`.work/T2-consistency.md` records, for each one, which chapter now owns it and what changed.
Where the code did not settle a question, it is an *Open questions* item in the owning chapter.
New cross-cutting notes from T2:

1. **`xref.py` only checks that a target exists, not that it is the right one.** T2 found six
   `§05-12` references (Errors) that meant `§05-11` (Destruction). T5 spot-checked 41 and
   fixed one; T10 then checked all 1,054 by eye with `tools/xref-context.py` and found none
   wrong. Re-run that check after large edits.
2. **Ownership conventions introduced by T2.** Each duplicated rule now has one owner, and the
   other chapters cite it. The main owners are: commit-phase order §06-11; destroy algorithm
   §06-10.2; destruction order §05-11; component-region skipping §05-1.6; element parameter
   order §05-4.1; triple-curly text rule §05-3.5 item 6; lexical-scope timing §01-1.8.5;
   auto-import rewrite §03-7.1; loose free names §03-5.3 (static) and §08-5 (runtime);
   `trackLocals` bug §03-10 item 12; `hbs` round trip §01-1.5.6. Duplicate open
   questions were merged into one item, and the others now say "Recorded as …". T2b should
   collect from the owners.
3. **Several fixes came from the source, not from the chapters.** These were: classic
   `willDestroy` runs in the `actions` queue (§08-6.7); `style="a {{x}}"` does trigger the
   style warning (§08-10.6); `type` is applied *last*, which is why range inputs clamp
   (§05-4.5.2); roots added during a render are rendered in a later runtime transaction
   (§07-1.10 item 5); and `-get-dynamic-var`/`-with-dynamic-vars` are no longer emitted by
   Ember (§05-5.8). T3 and T4 should not "restore" the older wording.

## Notable suspected bugs (for §0.7)

These are collected from the chapters' open-questions sections. T2b wrote the curated version
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
  - The babel `hbs` target loses `\{{` escapes, raw blocks and bracketed segments (§01-1.5.6;
    outside the primary scope since `8b343781b3`).
  - `-track-array` is applied twice (harmless, §03-7.8).
- **Wire format (informative).** There is no version marker, and Ember 5.9–6.3 blocks are
  misread silently. Not a requirement now; keep it as a note only.

## Next steps

Suggestions for the plan's author, based on what is still open:

1. **Decide the remaining "preserve or change" items in §00-0.7.1** (item 1 is resolved).
   The most urgent is the `strict`/`strictMode` option split (item 2; T9a confirmed all three
   behaviors). Each decision changes normative text in the owning chapter.
2. **Review the [Proposed] consumption primitive** (§07-2.2, the review points in §00-0.7.10).
   Only chapter 07 uses it. If it is accepted, other chapters could state update rules with it
   directly; if it is rejected, §07-2.4 needs another way to show sufficiency.
3. **Rule on the suspected bugs** in §00-0.7.2–0.7.8, deciding for each whether a new
   implementation must keep it. The babel-vs-runtime differences (§0.7.4) are confirmed by
   running both paths (T9a).
4. **Upstream the ordering experiments?** T9b's throwaway tests pinned orderings that Ember's
   suite does not test; `.work/T9b-orderings.md` "Upstream candidates" lists the ones worth
   turning into real tests.
5. **Remaining verification gaps.** §05-14 item 16 still lists the `each`, `in-element` and
   `yield`/block claims with no test. Most of §01 and §03 beyond the T9a items is checked only
   against source and `dist/dev`.
6. **Turn the spec into a conformance suite.** Many rules already cite the tests that pin
   them. Collecting those into one implementation-independent suite, keyed by section number,
   would give a new implementation something to run against.
7. **Keep citations current.** Line numbers are accurate for this checkout (`origin/main`
   merged at `98fa794473`, upstream base `675744ab35`). After the next merge, run
   `python3 spec/tools/remap-citations.py 675744ab35 --apply` once, fix its FLAG lines by hand,
   then run `check-citations.py` and check the prose against what the merge changed
   (`git diff 675744ab35 <new base> -- packages`), as T8 and T13 did.
