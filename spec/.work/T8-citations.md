# T8 — citation refresh after merging main (7364f4b36d)

The spec was written against `0abb844957`. The merge brought in changes to the files below.
For every citation into one of them, check that the cited lines still contain the construct
the surrounding prose names; fix the line numbers if they moved. If the *behavior* described
changed (not just the line numbers), do not rewrite the prose yourself: add a short note under
"Behavior changes found" below and continue. `git diff 0abb844957 HEAD -- <file>` shows what changed.

Tools: `python3 spec/tools/check-citation-semantics.py <chapter.md>` (heuristic),
`python3 spec/tools/fix-citations.py <chapter.md> 'old-span' 'new-span'` (logs to fixes.log).
Bare `:NN-MM` citations continue the most recent full path in the same paragraph/table.

Resume from the first unticked item. Commit after each item: `spec(T8): <file>`.

- [x] (30 checked: 02/03 cites all verified; 28 renumbered, 2 already right + E42-E47/02-6.x already correct, catalogue E6-E22 renumbered; note: 02-6.7 `323-350`, E18 `270-274`, 02-6.9 `228-321` tightened) handlebars-node-visitors.ts (≈29 citations; §02 mostly, some §03). Note: §02-3.3, §02-3.8, §02-6.7, §02-6.9–6.11 and catalogue rows E18, E42–E47 were just rewritten against the new code — verify them too, but they should already be right. Catalogue rows E6–E21 still use pre-merge numbers.
- [x] parser-node-test.ts (15 checked, 5 renumbered; 02:971 already pointed at the new tests)
- [x] integration-tests/lib/suites/each.ts (10 checked, 10 renumbered +40 after two inserted tests)
- [x] reference/lib/iterable.ts (8 checked, 0 renumbered; diff only touches ArrayIterator at line 199+, no citation reaches it; behavior change noted below)
- [x] (1 citation found, at 02:969 `sourceForNode`, renumbered 175-211; the `HashLiteral` abstract line added at :111 is not cited) syntax/lib/parser.ts (≈5; distinguish from @handlebars `lib/parser.js`)
- [x] parser-error-test.ts (4 checked, 0 renumbered; all cite the new tests correctly)
- [ ] integration-tests/lib/render-test.ts (≈3)
- [ ] template-compiler/lib/plugins/transform-each-in-into-each.ts (≈2, plus the §08-1.4 item 5 `:26-65` range)
- [ ] run `python3 spec/tools/check-citations.py` — all ok; `python3 spec/tools/xref.py` — silent

## Behavior changes found
- 05-runtime-semantics §05-5.4.1 (`iterable.ts:141-160`, pseudocode "items are L[0..n-1]" and "for sources converted eagerly (arrays, `forEach`) the count is known"): `ArrayIterator` (iterable.ts:201-225) now reads only `length` at construction (for `isEmpty`) and reads `iterator.length` live on every `next()`, so a plain array that shrinks or grows during iteration stops early or renders the new items (new tests suites/each.ts:49-87). Items are no longer read eagerly; the first item is read in `next()`, not the constructor.
