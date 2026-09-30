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

- [ ] handlebars-node-visitors.ts (≈29 citations; §02 mostly, some §03). Note: §02-3.3, §02-3.8, §02-6.7, §02-6.9–6.11 and catalogue rows E18, E42–E47 were just rewritten against the new code — verify them too, but they should already be right. Catalogue rows E6–E21 still use pre-merge numbers.
- [ ] parser-node-test.ts (≈15)
- [ ] integration-tests/lib/suites/each.ts (≈12)
- [ ] reference/lib/iterable.ts (≈8)
- [ ] syntax/lib/parser.ts (≈5; distinguish from @handlebars `lib/parser.js`)
- [ ] parser-error-test.ts (≈4)
- [ ] integration-tests/lib/render-test.ts (≈3)
- [ ] template-compiler/lib/plugins/transform-each-in-into-each.ts (≈2, plus the §08-1.4 item 5 `:26-65` range)
- [ ] run `python3 spec/tools/check-citations.py` — all ok; `python3 spec/tools/xref.py` — silent

## Behavior changes found
