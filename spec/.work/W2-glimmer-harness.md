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
- [x] 0.2 Build and run the whole suite on the untouched branch. Record the totals, and per
      module the counts for every module from `IT` and `packages/@glimmer/*/test` (save the
      per-module list as `.work/W2-baseline.tsv`: module, pass, fail, skip). Note any failures
      already present on `origin/main`.

## 1. Mechanical swaps (C18 sequence step 1)

- [x] 1.1 `IT`: replace `GlimmerishComponent` (`IT/lib/components/emberish-glimmer.ts`) with
      `@glimmer/component` in every user (about 42 files); delete the file and its exports.
      Check the differences listed in T17-fake-stubs §1.2 (`isDestroying`/`isDestroyed`, owner
      argument) against tests that rely on them.
- [x] 1.2 Ember tests: replace `tests/utils/glimmerish-component.js` with `@glimmer/component`
      (7 files, about 48 uses); delete the file.
- [x] 1.3 Ember tests: import public keywords from `@ember/helper`, `@ember/modifier`,
      `@ember/component/template-only` instead of `@glimmer/runtime` (8 files, T17 §2.4).

## 2. Delete fakes that have twins (step 2)

- [x] 2.1 `IT/test/helpers/fn-test.ts` fake-`mut` tests (twins `EG/helpers/fn-test.js:195,208`). Done, see notes.
- [x] 2.2 `makeSafeString` and the `{toHTML}` literal → `htmlSafe` from `@ember/template`.
- [x] 2.3 `IT/test/owner-test.ts`: ledger each of its 6 tests against
      `EG/application/engine-test.js`, `mount-test.js`, `@glimmer/owner/test`; port any without
      a twin; delete the file and `OwnerJitRuntimeResolver`.
- [x] 2.4 `IT/test/ember-component-test.ts` (74 tests): ledger every test (twin or "port");
      delete those with twins. The residue (about 10, mostly destruction order) stays until
      step 4.

## 3. Public-manager helpers and modifiers (step 3; C6)

- [x] 3.1 Port `registerHelper` call sites to `defineSimpleHelper` (about 55 sites). Done at the harness level, see notes.
- [x] 3.2 Port `registerModifier`/`registerInternalModifier` sites to `defineSimpleModifier` or a
      class with `setModifierManager`; `modifiers-test.ts` (17) is ported, not deleted. Done, see notes.
- [x] 3.3 Rewrite the 6 `registerInternalHelper` uses in `updating-test.ts` as plain helpers
      (keep 1–2 destroyable cases as `@glimmer/destroyable` unit tests if needed). Done, none needed to be kept.
- [x] 3.4 Delete `TestModifierManager`, `createHelperRef`, `registerInternalModifier`, and
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
      Then re-check every ledger row whose twin runs on `PositionalComponent` (grep the ledger
      for the twin files; e.g. `curly-components-test.js:861`): the twin must now be a real
      classic Component.
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

## Findings for the author

Behavior questions W2 turns up. Carry each into the owning chapter's open questions at 8.4.

1. (2.3) A component curried in the application (`(component "x")` passed via `{{mount}}`'s
   `model`) and rendered inside the engine is created with the **engine** as owner in real
   Ember. The Glimmer harness's `owner-test.ts` ("owner is preserved in curried closure
   components", and the non-curried variant, which has a TODO) expects the defining owner. No
   Ember test pins either. Owner: §06-12 / §08 (owner threading).
2. (2.4) `attributeBindings = ['class']` is an assertion in real Ember
   (`EG/components/attribute-bindings-test.js:872`) but worked on the fake classic component
   ("Setting class attributeBinding does not clobber ember-view"); fake-only behavior, no
   spec change, noted so step 4 does not port it.

## Notes

- 0.1 (2026-10-08): `git worktree add -b test/w2-glimmer-harness ../ember.js-w2 origin/main`
  (the local `main` is stale at `e1d334284e`; `origin/main` is `9bec1cb2a8`). `pnpm install
  --frozen-lockfile` succeeded.
- 0.2 (2026-10-08): baseline on untouched `origin/main` (9bec1cb2a8): 9541 tests, 9523 pass,
  0 fail, 18 skip (no failures pre-exist; run twice, identical). 54 modules come from
  `packages/@glimmer*/*/test` (3018 tests: 3015 pass, 3 skip, all in `[integration] jit :`);
  `IT` alone is 2163 tests: `[integration] jit :` 1638, `rehydration :` 432, `node jit :` 39, etc.
  Files: `.work/W2-baseline.tsv` (module, pass, fail, skip; only tests whose source chunk is under
  `packages/@glimmer*`) and `.work/W2-baseline-tests.tsv` (all 9541 tests: module, test, status,
  source_chunk; the chunk is the first stack frame, so Ember `moduleFor` tests show
  `internal-test-helpers/lib/module-for`). Module names alone are ambiguous: `Owner` is 2 Glimmer + 1
  Ember test; `Helpers test`, `Application test`, `Basic Custom Modifier Manager`, `Cache`, `Registry`
  etc. are Ember-only. Method: throwaway `testem` tap config plus a QUnit `testStart` hook in a copy
  of `dist/index.html` (see `spec/tools/w2-baseline-parse.py`). The 3 `jit` skips: `{{#each}}
  each with undefined item` and two `trackedArray() (rendering): {{each-in}}`. For comparison
  after later steps, filter `W2-baseline-tests.tsv` by `source_chunk`, not by module name.
- 1.1-1.3 (2026-10-08, branch `test/w2-glimmer-harness`): 1.1 `37682d8d97` (37 files: 36 users
  switched to `import GlimmerComponent from '@glimmer/component'`, `emberish-glimmer.ts` deleted and
  its re-export removed; `Glimmer` kind in `types.ts` is now `typeof` the real class;
  `registerGlimmerishComponent` kept as a name, its default class is the real one). No
  `package.json` change: `@glimmer/component` resolves via the root workspace dep plus the vite
  alias and tsconfig `paths`; IT's own `package.json` does not list it. Real class is stricter:
  typed `owner` (use `ConstructorParameters<typeof Component>[0]` in hand-written constructors
  instead of `Owner`/`object`) and typed `args` (`Component<Dict>` where tests index `args`;
  `debugger.ts` uses a signature generic instead of `declare args`). Behavior differences did not
  matter: the real manager schedules `willDestroy` through the Ember runloop, no test pinned the
  fake's synchronous destroy. Nothing left behind. 1.2 `548bc5cdb3` (7 test files, 48 uses;
  `tests/utils/glimmerish-component.js` deleted; 3 files already imported `@glimmer/component`
  so the duplicate import was merged; real manager also has `updateHook:false`, no user depended
  on it). 1.3 (3rd commit, 9 files): `hash/array/concat/get/fn/invokeHelper` from `@ember/helper`,
  `on` from `@ember/modifier`, `templateOnlyComponent` -> default import of
  `@ember/component/template-only` (kept the local name). All names had public re-exports; no
  `@glimmer/runtime` import left in `EG`. Results after each item: full suite 9541 tests, 9523
  pass, 0 fail, 18 skip, identical to the baseline; no test deleted, ledger untouched.
  `pnpm type-check:internals`, eslint and prettier clean on changed files. (`testem.filter.cjs`
  added to the worktree's `info/exclude`, not committed.)
- 2.1-2.4 (2026-10-08, branch `test/w2-glimmer-harness`): 2.1 `c1e68fe3ff` deleted the two `mut` tests
  (EG twins verified assertion by assertion); the fake `mut` registration lived only in them, and
  the `createInvokableRef`/`CapturedArguments` imports went too. 2.2 `1cbe9f6b78`: `htmlSafe` from
  `@ember/template` replaces `makeSafeString` in `updating-test.ts` and `updating-content-matrix-test.ts`
  and the `{toHTML}` literals in `lib/suites/initial-render.ts` and `test/initial-render-test.ts`
  (the second one is a hand-written literal in `handles empty trusted content`). `@ember/template` did
  NOT resolve from IT like `@glimmer/component` did: added `"@ember/template": "workspace:*"` to IT's
  `package.json` and the matching 3-line `pnpm-lock.yaml` entry (an offline `pnpm install` also
  rewrote an unrelated rolldown line; I reverted that and kept only the link). The plain-object
  `{toHTML}` in `updating-test.ts` 'updating a curly with a safe and unsafe string' is kept: it checks
  duck-typing, not a fake of Ember. 2.3 `fc8536394f` (EG port) + `93d54aa9f9`: of the 6 owner tests
  2 deleted (twin: engine-test sharing template/layout), 4 kept (see ledger); a new EG test
  `{{mount}} owner tests` was added; `OwnerJitRuntimeResolver` is gone but `owner-test.ts` stays with
  4 tests, so it is not deleted. FINDING for the author: in real Ember a component curried in the
  application and rendered inside a `{{mount}}`ed engine is created with the engine as owner, while
  the IT test 'owner is preserved in curried closure components' expects the curried owner; no EG test
  pins either. 2.4 ledger rows `157348c3fe`..`cd5a05610a` (4 batches), code `8d8030598c`: 74 tests
  ledgered, 34 deleted (twin) and 40 kept as "port" for step 4.3 (many are not curly tests at
  all: scope tests on template-only components, plain `class={{...}}` tests, rest-style positional
  params whose only EG twins use the `PositionalComponent` stub until 6.2, destruction-order tests,
  and the 5 curried-definition-in-`{{this.foo}}` tests). Sub-note: all 74 done, no partial state.
  Counts: baseline 9541 / 9523 pass / 18 skip. Deleted 2+2+34 = 38 tests, added 1 (the mount port):
  9541 - 38 + 1 = 9504 total, 9523 - 38 + 1 = 9486 pass, 0 fail, 18 skip. Observed: 9504 / 9486 / 0 /
  18; a per-test diff (module+name+chunk, dates normalised) shows exactly the 38 ledgered tests
  missing and the 1 port new. `type-check:internals` and prettier clean; eslint ignores IT files
  (the EG file is clean). Tooling in the scratchpad: `runfull.sh` (map.html + testem tap) and `cmp.py`.
- 3.1-3.4 (2026-10-08, branch `test/w2-glimmer-harness`): commits `e8163f76b0` (3.1+3.2), `29e2f90191`
  (3.3+3.4), `cce8d18557` (rename). Approach: no call site was edited (except the 6 in 3.3), the harness
  was changed instead. 3.1: `IT/lib/helpers.ts` now has `defineUserHelper(fn)`, a `setHelperManager`
  helper (`helperCapabilities('3.23', {hasValue})`) whose `getValue` calls `fn([...positional], {...named})`;
  `registerHelper` registers that instead of `createHelperRef`/`setInternalHelperManager`. I did NOT route
  through `defineSimpleHelper`: it spreads positional args and drops named args, and about 20 sites (the
  `hash` overrides, `say-hello`, `testing` with a hash) read `named`; keeping the `(positional, named)`
  signature means ~55 sites unchanged. Name-based registration on the fake resolver is kept until step 5.
  `UserHelper` type stays. The EG `this.registerHelper` calls (~100) are the Ember harness's own, which
  already uses real helpers; not touched. 3.2: `IT/lib/modifiers.ts` is now `defineTestModifier(Klass)`:
  a `setModifierManager` 3.22 manager (`LegacyHookModifierManager`) mapping `didInsertElement` ->
  `installModifier`, `didUpdate` -> `updateModifier`, `willDestroyElement` -> `destroyModifier`; the
  definition is a named function so the default debug name is the class name, and the manager state is the
  instance (the debug-render-tree test checks `instance`). No test needed adapting: the real manager also
  updates only when consumed args change (the harness reads args eagerly in install/update), and
  `modifiers-test.ts` (17), `updating-modifiers-test.ts`, `style-warnings-test.ts` etc. pass unchanged,
  so they are "ported" by exercising the public manager. `registerInternalModifier` had no users; deleted.
  3.3: the 6 `registerInternalHelper` tests are plain `registerHelper` (4 `const-foobar` tests) or
  `TestHelper` subclasses (`destroy-me`, `stateful-foo`, the latter run by 5 tests; `TestHelper` is the
  existing public-manager class in `define.ts`, `hasDestroyable`), registered through a new
  `registerHelperDefinition(name, definition)` (delegates: jit, rehydration), replacing
  `registerInternalHelper`. Destroy semantics are observed the same way (destructor count after
  `destroy()`), no test kept as an implementation test. 3.4: deleted `createHelperRef`,
  `registerInternalHelper` (+ delegate/RenderTest/interface methods), `registerInternalModifier`, the old
  `TestModifierManager`/`TestModifierDefinitionState`/`TestModifier`. Remaining internal-ref use in IT, not
  in scope here: `lib/components/emberish-curly.ts` (`createComputeRef`, `createConstRef`,
  `reifyNamed/Positional`, goes in 4.4) and `createConstRef` for `self` in the jit and rehydration delegates
  (step 5.4). No ledger rows: no test removed or changed in what it checks. Counts after: 9504 total /
  9486 pass / 0 fail / 18 skip, equal to the after-step-2 totals (9541 - 38 + 1 = 9504; step 3 adds and
  removes no test); `w2-baseline-parse`-style diff against `W2-baseline-tests.tsv`: exactly the same 38
  missing and 1 new as after step 2. `type-check:internals` and prettier clean; eslint on IT shows only 3
  pre-existing unused-var errors (`smokeTest`, `name`, `Owner`).
- 4.1 progress (ledger rows, one batch per suite; resume at the first suite not listed): done: emberish, has-block, has-block-params, yield, scope, with-dynamic-vars; 4 suite batches left (order: emberish, has-block, has-block-params, yield, scope, with-dynamic-vars, debugger, ssr, rehydrating-own, rehydrating-inherited).
