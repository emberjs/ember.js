# W2: Glimmer harness — eliminate the fake stubs and refactor (§09-9.7 W2)

Resume from the first unticked item. Tick items (`- [x]`) with a one-line note as you go.

## Where the work lives

- **Code:** worktree `/Users/edward/hacking/ember.js-w2`, branch `test/w2-glimmer-harness`,
  created from `origin/main` at `9bec1cb2a8` (the spec's upstream base). Code commits go on
  that branch only, message form `test(glimmer-harness): <what>`. Each step is a run of commits
  that can become its own upstream PR. Do not push.
- **Status:** this file and `W2-coverage-ledger.md`, on branch `template-language-spec` in
  `/Users/edward/hacking/ember.js`. Commit them there after each item, `spec(W2): <what>`.
  Stage only your own files (`git add <path>`); the author edits `spec/` concurrently.
- `IT` = `packages/@glimmer-workspace/integration-tests`; `EG` =
  `packages/@ember/-internals/glimmer/tests/integration`. Survey with line numbers:
  `.work/T17-fake-stubs.md` (its §4 table and "Recommended sequence" drive the steps below).

## How to run tests (in the worktree)

```sh
cd /Users/edward/hacking/ember.js-w2
npx vite build --mode development --minify false        # empties and rebuilds dist/
FILTER='<module-name substring>' npx testem ci -f testem.filter.cjs --host 127.0.0.1
```

`testem.filter.cjs` at the worktree root (never commit it):

```js
const base = require('./testem.cjs');
module.exports = { ...base, test_page: `index.html?hidepassed&filter=${encodeURIComponent(process.env.FILTER)}`, reporter: 'tap', port: 13142 };
```

The full suite is `pnpm test` (after the build). Also `pnpm type-check:internals` and
`pnpm lint:eslint` on changed files before each commit.

## Rules for every step

- **No coverage loss.** Before deleting a test, find its twin (a test of the same behavior on
  the real thing) and record the pair in `W2-coverage-ledger.md`. No twin → port the test
  (to `@glimmer/component`/template-only in `IT`, or to a real classic component in `EG`
  `components/classic/`), never just delete it. This is the W2 exit criterion "the Legacy
  profile's coverage is unchanged".
- **Pass counts.** After each step, record in the notes the pass/fail/skip totals of the
  modules you touched, against the baseline (item 0.2). A drop in count must be fully explained
  by ledger entries.
- A step that turns out larger than its item: split it into sub-items here first, then work
  them one at a time.

## 0. Baseline

- [x] 0.1 Worktree and branch created; `pnpm install` done.
- [ ] 0.2 Build and run the whole suite on the untouched branch. Record the totals, and per
      module the counts for every module from `IT` and `packages/@glimmer/*/test` (save the
      per-module list as `.work/W2-baseline.tsv`: module, pass, fail, skip). Note any failures
      already present on `origin/main`.

## 1. Mechanical swaps (C18 sequence step 1)

- [ ] 1.1 `IT`: replace `GlimmerishComponent` (`IT/lib/components/emberish-glimmer.ts`) with
      `@glimmer/component` in every user (about 42 files); delete the file and its exports.
      Check the differences listed in T17-fake-stubs §1.2 (`isDestroying`/`isDestroyed`, owner
      argument) against tests that rely on them.
- [ ] 1.2 Ember tests: replace `tests/utils/glimmerish-component.js` with `@glimmer/component`
      (7 files, about 48 uses); delete the file.
- [ ] 1.3 Ember tests: import public keywords from `@ember/helper`, `@ember/modifier`,
      `@ember/component/template-only` instead of `@glimmer/runtime` (8 files, T17 §2.4).

## 2. Delete fakes that have twins (step 2)

- [ ] 2.1 `IT/test/helpers/fn-test.ts` fake-`mut` tests (twins `EG/helpers/fn-test.js:195,208`).
- [ ] 2.2 `makeSafeString` and the `{toHTML}` literal → `htmlSafe` from `@ember/template`.
- [ ] 2.3 `IT/test/owner-test.ts`: ledger each of its 6 tests against
      `EG/application/engine-test.js`, `mount-test.js`, `@glimmer/owner/test`; port any without
      a twin; delete the file and `OwnerJitRuntimeResolver`.
- [ ] 2.4 `IT/test/ember-component-test.ts` (74 tests): ledger every test (twin or "port");
      delete those with twins. The residue (about 10, mostly destruction order) stays until
      step 4.

## 3. Public-manager helpers and modifiers (step 3; C6)

- [ ] 3.1 Port `registerHelper` call sites to `defineSimpleHelper` (about 55 sites).
- [ ] 3.2 Port `registerModifier`/`registerInternalModifier` sites to `defineSimpleModifier` or a
      class with `setModifierManager`; `modifiers-test.ts` (17) is ported, not deleted.
- [ ] 3.3 Rewrite the 6 `registerInternalHelper` uses in `updating-test.ts` as plain helpers
      (keep 1–2 destroyable cases as `@glimmer/destroyable` unit tests if needed).
- [ ] 3.4 Delete `TestModifierManager`, `createHelperRef`, `registerInternalModifier`, and
      `registerInternalHelper` if unused.

## 4. Collapse the component fan-out (step 4; the big deletion)

- [ ] 4.1 Ledger every Curly/Dynamic registration of the suites (`emberish-components.ts`,
      `has-block.ts`, `has-block-params.ts`, `yield.ts`, `scope.ts`, `with-dynamic-vars.ts`,
      `debugger.ts`, SSR `ServerSideComponentSuite`, `RehydratingComponents`): Ember twin, or
      "port". Opus reviews this ledger before any deletion.
- [ ] 4.2 Port the "port" cases: classic-specific ones to `EG/components/classic/`, the rest to
      `@glimmer/component`/template-only, plus a curly-invocation variant through a real owner.
- [ ] 4.3 Port the `ember-component-test.ts` residue (step 2.4) and `input-range-test.ts`; delete
      `ember-component-test.ts`.
- [ ] 4.4 Collapse `componentModule` to Glimmer + TemplateOnly; delete the Curly/Dynamic kinds,
      `buildCurlyComponent`/`buildDynamicComponent`, `EmberishCurlyComponent` and its manager,
      `registerEmberishCurlyComponent`, the `ember-view` branches (`initial-render-test.ts`).

## 5. Real environment, resolver and renderer (step 5; C1, C2)

- [ ] 5.1 Design (Opus): the `RenderDelegate` API additions `set`/`rerender`/`destroy`, the
      `RenderHandle` that replaces `RenderResult` in tests, the tracked test context, and how
      the delegate uses Ember's `EmberEnvironmentDelegate`, resolver/owner and renderer. Write
      it into this file as sub-items before coding.
- [ ] 5.2 Replace `BaseEnv` with Ember's environment delegate; remove the hand-driven
      `env.begin()/commit()` and `inTransaction` from `RenderTest`.
- [ ] 5.3 Replace `TestJitRuntimeResolver`/`TestJitRegistry`/`CIRCULAR_OBJECT` and the keyword
      pre-registration with a real owner (`buildOwner` + `owner.register`).
- [ ] 5.4 Tracked test context instead of `dirtyTagFor`; `delegate.set/rerender/destroy`;
      `RenderHandle`.
- [ ] 5.5 One `compile` shared by both harnesses (`IT/lib/compile.ts` and
      `internal-test-helpers/lib/compile.ts`; seam C).

## 6. Remaining stubs (step 6)

- [ ] 6.1 `style-warnings-test.ts` → Ember harness with `expectWarning`.
- [ ] 6.2 `PositionalComponent` users → real classic components with `positionalParams`; delete
      `tests/utils/positional-component.js`.
- [ ] 6.3 `@glimmer/reference/test/iterable-test.ts` → Ember's `toIterator`; mark
      `references-test`/`validators-test` as implementation tests (W1/W5), not conformance.

## 7. Merge duplicated suites (step 7)

- [ ] 7.1 For each row of T17-fake-stubs §3, diff the two copies, move unique cases into the
      stronger copy, delete the weaker one; ledger every deletion.

## 8. Exit check (Opus)

- [ ] 8.1 No `@glimmer/runtime`, `@glimmer/validator`, `@glimmer/reference`,
      `@glimmer/opcode-compiler` or `@glimmer/compiler` import in `IT` outside `lib/modes/`.
- [ ] 8.2 C18 table empty: every row of T17-fake-stubs §4 is done or explicitly kept (with why).
- [ ] 8.3 Coverage diff: the ledger accounts for every removed test; whole suite green;
      counts compared with the baseline.
- [ ] 8.4 Update §09 (C1, C2, C6, C18 rows; §9.7 W2 state) and STATUS.

## Notes

- 0.1 (2026-10-08): `git worktree add -b test/w2-glimmer-harness ../ember.js-w2 origin/main`
  (the local `main` is stale at `e1d334284e`; `origin/main` is `9bec1cb2a8`). `pnpm install
  --frozen-lockfile` succeeded.
