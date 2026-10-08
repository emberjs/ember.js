# Spec tools

Verification helpers used while writing the spec. Run from anywhere. Python scripts need only the
standard library, and Node probes need the repo built (`pnpm build`).

| Script | Purpose |
|---|---|
| `xref.py` | Checks that every `§NN-x.y` cross-reference points at an existing section heading. Prints nothing when all resolve. |
| `remap-citations.py OLD_BASE [NEW] [--apply]` | After merging upstream into the spec branch, moves every `path:line` citation into a changed file by the diff's hunk offsets. Citations inside a changed hunk are reported as FLAG for a hand check. |
| `prune-open-questions.py [--apply]` | Deletes open-question items marked `<!-- REMOVE -->`, renumbers the numbered lists (Q-lists keep their labels) and rewrites `§NN-x item N` references. Without `--apply` it reports the new numbering and every reference to a removed item, which must be fixed by hand first. Bare in-list references such as "(item 5)" and §04's "Open question N" are not rewritten. |
| `xref-context.py [chapter.md ...]` | Prints every §-reference with the heading it resolves to and the line it appears on, for checking by eye that each points at the intended section. |
| `check-citations.py [chapter.md ...]` | Extracts every `path:line` citation. Checks that the file exists (in this repo or a sibling repo under `~/hacking`) and that the lines are in range. `--json out.json` dumps all citations. |
| `check-citation-semantics.py chapter.md [--only NEAR,MISS]` | Heuristic check that the cited lines contain the identifiers or message text named in the surrounding prose. |
| `fix-citations.py chapter.md 'old-span' 'new-span' ...` | Replaces backticked citation spans and appends each change to `fixes.log`. |
| `test-coverage.py [--markdown out.md]` | Per section of the normative chapters, counts test-file citations vs source citations and collects "untested"/"by experiment" markers (§09). |
| `probe-parser.mjs`, `probe-parser-locs.mjs` | Run the built `@glimmer/syntax` (`packages/@glimmer/syntax/dist/es`) on probe inputs (§02). |
| `probe-precompile.mjs '<template>' ...` | Runs the built `ember-template-compiler` (`dist/dev`) `precompile` on each argument (§03, §04, §08). |
| `w2-baseline-parse.py` | Parses a testem tap log (with source-chunk suffixes, recipe in its docstring) into `.work/W2-baseline*.tsv` (W2). |

`check-citations.py` and `check-citation-semantics.py` hard-code the sibling-repo root
`/Users/edward/hacking`. Edit `HACK` at the top if your checkout lives elsewhere.
