# Spec tools

Verification helpers used while writing the spec. Run from anywhere. Python scripts need only the
standard library, and Node probes need the repo built (`pnpm build`).

| Script | Purpose |
|---|---|
| `xref.py` | Checks that every `§NN-x.y` cross-reference points at an existing section heading. Prints nothing when all resolve. |
| `check-citations.py [chapter.md ...]` | Extracts every `path:line` citation. Checks that the file exists (in this repo or a sibling repo under `~/hacking`) and that the lines are in range. `--json out.json` dumps all citations. |
| `check-citation-semantics.py chapter.md [--only NEAR,MISS]` | Heuristic check that the cited lines contain the identifiers or message text named in the surrounding prose. |
| `fix-citations.py chapter.md 'old-span' 'new-span' ...` | Replaces backticked citation spans and appends each change to `fixes.log`. |
| `probe-parser.mjs`, `probe-parser-locs.mjs` | Run the built `@glimmer/syntax` (`packages/@glimmer/syntax/dist/es`) on probe inputs (§02). |
| `probe-precompile.mjs '<template>' ...` | Runs the built `ember-template-compiler` (`dist/dev`) `precompile` on each argument (§03, §04, §08). |

`check-citations.py` and `check-citation-semantics.py` hard-code the sibling-repo root
`/Users/edward/hacking`. Edit `HACK` at the top if your checkout lives elsewhere.
