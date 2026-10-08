# T17: merge of origin/main (`def1faa2cf`, upstream `9bec1cb2a8`) and the §09 rulings (`5740b4aeb7`)

Resume from the first unticked item. Commit after each item. Never `git commit -a`.

Author rulings in `5740b4aeb7` (inline notes under §09-9.8):
- Q1: SSR markers are left to the implementation; no interoperable marker format.
- Q3: [Dev] messages are verbatim; revisit only if a second implementation finds it too hard.
- Q4: move to `await settled()`; refactors that do this are already landing upstream; re-evaluate
  the counts after the merge.
- Q5: the suite stays in this repo; the new implementation lives here too while in development;
  both are tested via a feature-flag strategy.
- Q6: Glimmer started in another repo, so Ember and Glimmer each test fake stubs of the other;
  flag every remaining case for elimination in the test cleanup.
- Q2 (which profiles are required) is unanswered.

## A. Citation refresh (agent; chapters 01–08 only)

- [x] A1. `python3 spec/tools/remap-citations.py 675744ab35 9bec1cb2a8 --apply`; record the count.
- [ ] A2. Resolve every FLAG line by hand (44; list in the run's output), and every citation to a
      file that moved (e.g. `components/{ => classic}/…`, tests split out of `life-cycle-test.js`).
- [ ] A3. `check-citations.py` clean.
- [ ] A4. Prose vs behavior: read `git diff 675744ab35 9bec1cb2a8 -- packages` for changes to
      cited behavior (TrackedValue functions/setters, renderComponent root release on destroy,
      base-renderer cleanup, tracker pool, `get` helper dotted keys, `{{on}}` ordering docs,
      modifier-manager docs) and update the owning items; record each in the notes below.
- [ ] A5. STATUS "Upstream fix branches" base line and "Keep citations current" (new base
      `9bec1cb2a8`).

## B. Q6 survey (agent) → `.work/T17-fake-stubs.md`

- [x] B1. Every place where Glimmer's tests emulate Ember (Emberish components, curly/dynamic
      kinds, Ember-like helpers/modifiers/global context) or Ember's tests emulate Glimmer, with
      what real thing replaces each.

## C. §09 rulings and re-evaluation (Opus)

- [x] C1. Re-count after the merge: `runTask`/`run(` vs `await settled()`/`renderSettled`
      call sites, classic vs Glimmer component tests, ember-qunit/`@ember/test-helpers` usage,
      files moved to `components/classic`.
- [ ] C2. §09 rewritten for Q1, Q3, Q4, Q5, Q6 (rulings recorded, notes removed); §05-13.1
      markers become implementation-defined; C11/C14/C16 and the work plan updated; B1 result
      folded in.
- [ ] C3. STATUS decisions + task row; `xref.py`/`check-citations.py` clean.

## Notes

- A1: remap-citations moved 122 citations (44 FLAGs left for A2). The tool also moved one citation in
  `09-conformance-testing.md` (C14, `abstract.ts:17-27` -> `18-28`), committed with A1.

C1 (Opus), counts over `@ember/-internals/glimmer/tests`, `@glimmer-workspace`,
`ember-template-compiler`, `@ember/template-compiler`, old base `675744ab35` → new `9bec1cb2a8`:
- `runTask(`: 1,607 sites / 69 files → 1,644 / 81 (up: Glimmer versions of classic tests were
  added, #21642/#21646/#21648, in the old harness style).
- `await settled()`: 0 → 4 sites / 1 file (`integration/helpers/element-test.gjs`);
  `renderSettled(`: 6 / 1 → 29 / 2 (`render-component-test.ts` waits with `renderSettled`
  instead of `run()`, 379a7ca59f); `@ember/test-helpers`/`ember-qunit`: 0 → 1 file each.
- `moduleFor(`: 198 / 96 files → 217 / 113; `RenderingTestCase`: 180 / 75 → 208 / 88.
- New: `components/classic/` holds 21 files (classic-component tests moved there,
  bdc582852d, a3cc15a942); "Keep classic and Glimmer coverage for tests that can use both"
  (46ce689cd8).
- New test style (a77fdba9b1, cab58a29a1): ember-qunit in the test build;
  `internal-test-helpers/lib/ember-dev/setup-test-helpers.js` gives each test its own
  `Application` via `setApplication`; `element-test.gjs` uses `module`/`test` from `qunit`,
  `setupRenderingTest`, `render`/`settled` from `@ember/test-helpers`, `<template>`. Public API
  only and async: the target form for the conformance suite.
- So Q4's migration has started but is about 1% done by call sites.
