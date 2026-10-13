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

- [x] A1. `python3 spec/tools/remap-citations.py 9bec1cb2a8 a9501d5d40 --apply`; record the
      counts (moved, FLAG) in the notes.
- [x] A2. Resolve every FLAG line by hand against the new code (26 in the dry run).
- [x] A3. Re-derive every citation to a test file that moved, split, merged or was deleted
      (`git diff -M --name-status 9bec1cb2a8 a9501d5d40 -- packages`), as T17 A2 did: match unique
      source lines of the old file (`git show 9bec1cb2a8:<path>`) against the new files, then check
      each result by its first line. The remap tool does not follow moves and may have shifted
      such citations wrongly in A1, so check every citation into a changed test file, not only the
      FLAGs. For a cited test that W2 deleted, cite its twin from the coverage ledger and adjust
      the prose if the twin is in the other harness (Ember vs Glimmer). If a claim loses its only
      test, mark it "(untested)" as CONVENTIONS requires and record it in the notes.
- [x] A4. `python3 spec/tools/check-citations.py` reports nothing; `python3 spec/tools/xref.py`
      prints nothing.

## B. Prose (Opus)

- [x] B1. W2 is upstream: rewrite every "on branch `test/w2-glimmer-harness`" / "not yet
      upstream" passage (§05-7.6 ~l.1616, §06-2.2 ~l.351, §08 ~l.954 and ~l.1108, §09 seam B
      ~l.194, C1, C18, W2 row) to describe and cite `main`; give the W2 citations added in W2 step
      8.4 line numbers.
- [x] B2. §09 against the landed code: harness description (adapter, `RenderHandle`, delegates,
      `lib/modes/`), C-table rows touched by W2, test counts (re-run `tools/test-coverage.py` and
      the T17 C1 counts), W3+ plan items that W2 changed.
- [x] B3. Prose vs behavior for the non-W2 changes: read
      `git diff 9bec1cb2a8 a9501d5d40 -- packages ':!*test*'` for changes to cited behavior
      (#21685 tracking reset on cleanup throw, #21688 computed-macro deprecations, #21707 types,
      `transform-resolutions` fix from PR 6, server render non-interactive from PR 10, router
      service getters) and update the owning items; record each in the notes.
- [x] B4. STATUS: base line, T18 row, "Keep citations current"; `xref.py` and
      `check-citations.py` clean.

## Notes

- Before A1, `check-citations.py` reports 44 problems (20 missing files, 24 out of range), all
  from the merge. (STATUS at `61911c201d` said they predated the merge; that check was wrong,
  because the tool resolves paths in `/Users/edward/hacking/ember.js` regardless of cwd.)
- A1: remap-citations moved 142 citations, 26 FLAGs left (committed). A1 left 40 problems in
  `check-citations.py`.
- A2/A3 (done together). The remap tool does not touch bare continuation spans (`` `573-595` ``
  with no `:`), and `check-citations.py` does not check them either. I re-derived every citation
  (including 59 bare ones that follow a citation, plus ~15 found by eye: §05 in-element list,
  modifiers-test, updating-test 1545-2055, §03 normalize) with a script (unique-line matching of
  the old file at `9bec1cb2a8` against the new tree, then first/last-line check). Bare ranges
  after a citation should be handled by hand after the next merge. ~45 spans changed by hand.
  Note: the §03 edit for 'Non-native keyword' removed one line, so §03 lines after 623 shifted by -1.
- Claims that lost their only test, now marked untested: `keywords` compile option (§01 table, §03
  7.x; test 'Non-native keyword' dropped by W2); `insertBefore=<node>` VM semantics (§05 in-element
  list; test 'With insertBefore' deleted, Ember rejects non-null insertBefore).
- Deleted tests re-pointed to Ember twins (prose unchanged): modifiers-test forwarding (§05:1570),
  modifier-manager-test (§05:1846, §06), helper-manager-test (§06), modifiers/on-test (§06),
  default-helper-manager, array/fn/unique-id/refinements/render-settled (.js -> .gjs, §07/§08),
  in-element 'Components are destroyed' and 'Inside the current constructing element' (§05, §05:2043),
  style-warnings (§05:698), emberish-components (§05:1289-1291, now `component-invocation.ts` and Ember tests).
- Notes for B (prose now stale, not fixed):
  - `skip: 'glimmer'` is gone: yield.ts tests now run for all kinds, module.ts componentModule
    rewritten (blueprint test without `kind` runs glimmer+curly+dynamic; `kinds` option; `kind: 'curly'`
    on has-block suites became plain `@test`). §05:1320 and §05 item 12 (~l.2306-2308, "§14 item 12") are
    resolved/false; §05:1347 "all of these are `kind: 'curly'`" too. Citations only were re-numbered.
  - in-element 'Changing to falsey' / 'With pre-existing content' are now `skip: DEBUG` (production only).
  - Glimmer harness `lib/compile.ts` now goes through `internal-test-helpers/lib/compile.ts` (Ember's
    compileOptions); §09 item 3 text ("precompileJSON plus templateFactory" in both) and the
    `RenderDelegate` (RenderHandle, registerHelperDefinition, teardown, no registerInternalHelper)
    need B2. `rehydration` componentSuite now `kinds: ['glimmer','templateOnly']`.
  - #21685 (append.ts ~790): resetTracking now in `finally` after popBlock; §05:2061, §07:126 cite it
    (new range 741-797) but prose does not mention the try/finally.
  - modifier.ts: `castToBrowser` removed from `CustomModifierManager.install` (element cast to Element);
    no prose change needed unless §06 mentions the cast.
  - Dropped IT duplicates: each.ts 'it renders all items with duplicate key values' and 'else template is
    displayed with context' (twins in syntax/each-test.js, §05:992/1093 now cite each-test.js:655-674).
  - Several W2-moved tests are Ember-harness now (async, ember-qunit .gjs); §09 counts need re-run.
- A4: `check-citations.py` reports every citation ok (no problems); `xref.py` prints nothing.
- B1 (Opus): W2 tests in §05-7.6, §06-2.2, §08-6.1, §08-6.6 cited on `main` with line ranges.
  §05-14 item 12 removed (`prune-open-questions.py`): the yield and has-block-params suites run
  for angle-bracket invocation too, with `{{else}}` passed as `<:else>` (`render-test.ts:207-210`);
  §05-6.2/§05-6.3 prose updated; old items 13-15 are now 12-14.
- B2 (Opus): §09 item 3 (one compile), item 4 (delegates on Ember's renderer), item 6 counts at
  `a9501d5d40` (runTask 1,582 / 71 files; await settled() 80 / 12; setupRenderingTest 16 files;
  moduleFor 98 files; Glimmer `test/*.ts` 72), seam B, `RenderDelegate` interface, C1, C11, C15
  (style warnings moved to `content-test.js`), C18, W2/W3 rows, §9.6.2 table re-run.
- B3 (Opus), behavior changes:
  - #21685: the render-error cleanup (close blocks, `resetTracking`) is inside `if (DEBUG)`;
    production does neither. §05-12 and §07-1.2 had stated it unconditionally. Recorded as a
    suspected bug, new §05-14 item 15, plus §00-0.7 item 25 and STATUS; open upstream PR #21634
    fixes it.
  - `transform-resolutions` (PR 6 bugfix): production leaves a bare `{{helper}}`/`{{modifier}}`
    to the keyword's validation (§03-7.11, §08-3).
  - `@dependentKeyCompat` read fix (`cca9b7ab39`) and the sync-observer limitation (§07-3.6.7).
  - Computed-macro deprecation (#21688, available, not enabled) (§07-3.6.5).
  - Router state `@tracked`, router-service getters, `LinkTo` consuming the router's tag
    (`2c39804641`, `f6f874acc2`): §08 only says "reactive to router state"; no change.
  - `castToBrowser` removed from `CustomModifierManager.install`: not in the spec; no change.
  - In-element 'Changing to falsey' / 'With pre-existing content' are production-only now
    (`skip: DEBUG`); §05 does not cite them by name; no change.
- B4: STATUS updated; `xref.py` silent, `check-citations.py` all ok.
