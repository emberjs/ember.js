# T18: merge of origin/main (`a7fc67e74b`, upstream `a9501d5d40`) with W2 landed

Resume from the first unticked item. Commit after each item (`spec(T18): …`), staging only the
files you changed. Never `git commit -a`. Nothing outside `spec/` is committed.

Old citation base: `9bec1cb2a8`. New base: `a9501d5d40`. The upstream diff (199 files, 51 of them
added, deleted or renamed) is mostly the ten W2 test-cleanup PRs (#21676–#21679, #21684, #21692,
#21695, #21702, #21703, #21709), plus #21710 (interactive SSR smoke tests), #21707 (published
types), #21688 (computed-macro deprecations), #21685 (reset tracking when cleanup throws), router
services getters and the `@ember/test-helpers` 5.7.0 upgrade. The W2 history and the twin of every
removed test are in `.work/W2-glimmer-harness.md` and `.work/W2-coverage-ledger.md`.

## A. Citation refresh (Sonnet; chapters 00–09)

- [ ] A1. `python3 spec/tools/remap-citations.py 9bec1cb2a8 a9501d5d40 --apply`; record the
      counts (moved, FLAG) in the notes.
- [ ] A2. Resolve every FLAG line by hand against the new code (26 in the dry run).
- [ ] A3. Re-derive every citation to a test file that moved, split, merged or was deleted
      (`git diff -M --name-status 9bec1cb2a8 a9501d5d40 -- packages`), as T17 A2 did: match unique
      source lines of the old file (`git show 9bec1cb2a8:<path>`) against the new files, then check
      each result by its first line. The remap tool does not follow moves and may have shifted
      such citations wrongly in A1, so check every citation into a changed test file, not only the
      FLAGs. For a cited test that W2 deleted, cite its twin from the coverage ledger and adjust
      the prose if the twin is in the other harness (Ember vs Glimmer). If a claim loses its only
      test, mark it "(untested)" as CONVENTIONS requires and record it in the notes.
- [ ] A4. `python3 spec/tools/check-citations.py` reports nothing; `python3 spec/tools/xref.py`
      prints nothing.

## B. Prose (Opus)

- [ ] B1. W2 is upstream: rewrite every "on branch `test/w2-glimmer-harness`" / "not yet
      upstream" passage (§05-7.6 ~l.1616, §06-2.2 ~l.351, §08 ~l.954 and ~l.1108, §09 seam B
      ~l.194, C1, C18, W2 row) to describe and cite `main`; give the W2 citations added in W2 step
      8.4 line numbers.
- [ ] B2. §09 against the landed code: harness description (adapter, `RenderHandle`, delegates,
      `lib/modes/`), C-table rows touched by W2, test counts (re-run `tools/test-coverage.py` and
      the T17 C1 counts), W3+ plan items that W2 changed.
- [ ] B3. Prose vs behavior for the non-W2 changes: read
      `git diff 9bec1cb2a8 a9501d5d40 -- packages ':!*test*'` for changes to cited behavior
      (#21685 tracking reset on cleanup throw, #21688 computed-macro deprecations, #21707 types,
      `transform-resolutions` fix from PR 6, server render non-interactive from PR 10, router
      service getters) and update the owning items; record each in the notes.
- [ ] B4. STATUS: base line, T18 row, "Keep citations current"; `xref.py` and
      `check-citations.py` clean.

## Notes

- Before A1, `check-citations.py` reports 44 problems (20 missing files, 24 out of range), all
  from the merge. (STATUS at `61911c201d` said they predated the merge; that check was wrong,
  because the tool resolves paths in `/Users/edward/hacking/ember.js` regardless of cwd.)
