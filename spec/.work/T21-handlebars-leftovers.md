# T21 — Audit the Handlebars leftovers: remove the unusable ones, test the rest as legacy

Author ruling (2026-10-13, on §02-11 item 15, "Upstream-Handlebars leftovers"): (1) prove which of these features cannot actually
be used in current Ember; (2) remove each unusable one from the parser entirely; (3) add test
coverage for each usable one, designated as "inherited from Handlebars, legacy behavior".

Resume from the first unticked item. Experiments run in the worktree
`/Users/edward/hacking/ember.js-t21` (branch `spike/t21-handlebars-leftovers`, never pushed). Each removal and each batch of tests is its own upstream
PR, branched from `origin/main`.

## Features in scope

| # | Feature | Spec | Starting hypothesis (to be proved, not assumed) |
|---|---|---|---|
| F1 | `{{&foo}}` (trusting, like `{{{foo}}}`) | §02-3.2 | usable: compiles and renders unescaped |
| F2 | `{{^}}` as a synonym for `{{else}}` | §02-3.3 | usable |
| F3 | `{{^foo}}a{{else}}b{{/foo}}` | §02-3.3 | usable today, but already **[Out of spec]** (author ruling of 2026-10-13, §02-3.3); candidate for removal regardless |
| F4 | `foo/bar` slash paths | §02-4.2 | usable in loose mode (`{{foo/bar}}` resolves a nested component or helper); probably unusable in strict mode, where no JS binding can be named `foo/bar` |
| F5 | `{{{{raw}}}}…{{{{/raw}}}}` raw blocks | §02-2.7 | usable if a component or helper named `raw` takes a block; the content is HTML-parsed, so it is "raw" only for mustaches |
| F6 | `\{{` and `\\{{` escapes | §02-2.2 | usable and common (documentation templates) |
| F7 | standalone-line stripping | §02-5.3 | always on in precompile mode, so every template uses it; not removable without changing rendered whitespace |
| F8 | `{{else}}` chains with any helper (`{{else each b}}`, `{{else-thing}}`) | §02-3.3 | parse; which ones mean anything is §03 |

Partials, decorators, and inverse sections without `{{else}}` are already syntax errors and are
out of scope.

## Steps

- [x] 1. For each feature, prove usability by compiling and rendering through the real pipelines:
      the babel plugin (strict `<template>`, and loose `hbs`/colocated `.hbs`) and the runtime
      `template()`. Use throwaway rendering tests in `packages/@ember/-internals/glimmer/tests/`
      (as T9b did) and `spec/tools/probe-precompile.mjs`. Record per feature: strict usable?
      loose usable? the evidence (test name or probe output).
- [x] 2. For each feature that is usable in neither mode, check that no published usage
      exists that still compiles (e.g. search addons on GitHub code search) and write the case for
      removal. Ask the author before opening the removal PR, since a removal turns accepted
      source into a syntax error.
      Done (2026-10-13): no feature is usable in neither mode (step 1), so none qualifies for
      removal. **Question for the author:** `foo/bar` slash paths can never resolve in strict mode
      (no public pipeline can bind such a name). That is not "unusable in current Ember" (loose
      mode uses them), so it is out of this rule; a strict-mode compile error with a clear message
      (§03) would be a separate, optional change.
- [x] 3. Removal PRs: make the parser reject the feature with a Glimmer syntax error that names
      it ("… is inherited from Handlebars and not supported"), with tests in
      `packages/@glimmer/syntax/test/parser-error-test.ts`.
      Nothing to remove (step 2).
- [x] 4. Coverage PRs for each usable feature: parser tests in `packages/@glimmer/syntax/test/`
      and rendering tests, each in a module or with a comment that marks it as "inherited from
      Handlebars, legacy behavior" (agree the exact wording once and reuse it). Prefer tests that
      the §09 conformance suite can run unchanged. Wording chosen: module names start with
      `Inherited from Handlebars (legacy behavior):`, and each file starts with a comment saying
      these features are inherited from Handlebars, kept for compatibility, and not to be extended.
      Branch `test/handlebars-legacy-features` in the t21 worktree (the spike branch had no
      commits and is replaced by it).
      Done (2026-10-13), branch `test/handlebars-legacy-features` in `/Users/edward/hacking/ember.js-t21`
      (from origin/main, not pushed):
      - `19b4f331e0`: `packages/@glimmer/syntax/test/handlebars-legacy-test.ts`, 24 parser tests (F1-F8).
      - `466996dd68`: `packages/@glimmer-workspace/integration-tests/test/handlebars-legacy-test.ts`, 28 rendering
        tests (strict and loose for F1, F2, F3, F5, F6, F7, F8; F4 loose only, registered as `foo/bar` through the
        glimmer harness, so no Ember-internals test was needed).
      - Filter `Inherited from Handlebars`: 52 tests, 52 pass. `[glimmer-syntax]`: 367 pass. Full suite: 9281 tests,
        9261 pass, 20 skip, 0 fail.
      **Revised (2026-10-14, author):** only F1, F2, F3 and F5 are inherited legacy (see "Review"
      below). The branch was rewritten, now on `origin/main` `c02a9ee118`: `4b96a37a2c` (8 parser
      tests) and `8aea3f031a` (10 rendering tests), F1, F2, F3, F5 only. No new tests for F4, F6,
      F7 (existing coverage suffices). F8 rendering coverage is task T23 (the removed F8 tests are
      its seed). Filter `Inherited from Handlebars`: 18 tests, 18 pass. Full suite: 9249 tests,
      9229 pass, 20 skip, 0 fail.
- [ ] 5. Spec follow-up (F1, F2, F3, F5 only): mark each kept feature **[Legacy]** in its §02 section and cite the new
      tests; describe the removed ones as errors (new E-catalogue rows); remove §02-11 item 15.

## Step 1 results

Method: throwaway QUnit modules in `packages/@ember/-internals/glimmer/tests/integration/` of the t21 worktree (copies in the session
scratchpad `t21/t21-test.js`, `t21b-test.js`, raw output `run2.txt`, `raw3.txt`), one fresh render per case. Loose = classic
`compile(..., {strictMode:false})` plus component/helper registered in the owner. Strict = `compileWithScope(..., {strictMode:true})` with
a scope object (harness-only, see F4), `template()` from `@ember/template-compiler`, and a node script driving
`babel-plugin-ember-template-compilation@4.0.0` over `<template>` (content-tag) and `precompileTemplate` (`babel-probe-run.mjs`).
"Usable" = compiles and has a meaningful rendered effect.

| # | Feature | Strict usable? | Loose usable? | Evidence | Notes |
|---|---|---|---|---|---|
| F1 | `{{&foo}}` | yes | yes | `[{{&this.x}}]` with x=`<b>x</b>` renders `[<b>x</b>]` in both modes (control `{{this.x}}` renders `[&lt;b&gt;x&lt;/b&gt;]`). Babel: block `[[[2,[30,0,["x"]]]],[],[]]` for both `<template>` and `precompileTemplate(strictMode:false)` (opcode 2 = trusting append, same as `{{{x}}}`). | In an attribute (`title={{&this.x}}`) it is escaped, like `{{{x}}}`; no effect there. |
| F2 | `{{^}}` as `{{else}}` | yes | yes | `{{#if this.x}}A{{^}}B{{/if}}`: x=false renders `B`, x=true renders `A`; `{{#unless this.x}}A{{^}}B{{/unless}}` x=true renders `B`. Same in both modes. Babel output identical to the `{{else}}` form. | |
| F3 | `{{^foo}}a{{else}}b{{/foo}}` | yes | yes | `{{^if this.x}}A{{else}}B{{/if}}`: x=true renders `B`, x=false renders `A` (blocks swapped). `{{^each this.x}}A{{else}}B{{/each}}` with x=[] renders `A`. Babel block shows `if` with the A/B blocks swapped. `{{^if this.x}}A{{/if}}` (no else) is already a syntax error: "Inverse sections (`{{^foo}}...{{/foo}}`) are not supported. Use `{{#unless foo}}...{{/unless}}` instead". | Meaningful (it is `unless`-with-else spelled differently) and already **[Out of spec]**; removal candidate is a policy choice, not a usability one. |
| F4 | `foo/bar` slash paths | **NO** (every public strict pipeline fails) | yes | Loose, `{{foo/bar}}` with `component:foo/bar` registered renders the component (`<div class="ember-view">COMP</div>`); `{{#foo/bar}}body{{/foo/bar}}` yields (`(body)`); `{{foo/bar k=1}}` renders `COMP1`; with `helper:foo/bar` `{{foo/bar 1}}` renders `H1` and `{{if true (foo/bar 2)}}` renders `H2`. Babel loose: `precompileTemplate('{{foo/bar}}',{strictMode:false})` gives `[[[1,[35,0]]],[],["foo/bar"]]`. Strict: babel `<template>{{foo/bar}}</template>` throws "Attempted to resolve a value in a strict mode template, but that value was not in scope: foo/bar"; `precompileTemplate(..., {strictMode:true, scope: () => ({ 'foo/bar': x })})` compiles but emits `scope:()=>({foo/bar})`, a JS syntax error ("Unexpected token, expected ','"); runtime `template('[{{foo/bar}}]', {scope: () => ({'foo/bar': C})})` throws "Arg string terminates parameters early" (scope keys become `new Function` parameter names); with no scope: "not in scope: foo/bar". | Only the test harness `internal-test-helpers/lib/compile` (which takes the scope object directly) renders it in strict mode (`[COMP]`), so that is not a user-reachable path. Loose `{{this/foo}}`, `{{this/a/b}}`, `{{a/b}}`, `{{p/k}}` (block param) render empty: slash is not a property accessor; in strict they are "not in scope: foo / a/b / p/k". `{{[foo/bar]}}` behaves like `{{foo/bar}}` (loose resolves the component, strict needs the same impossible binding). `{{@foo/bar}}` renders empty in both modes (arg not passed). |
| F5 | `{{{{raw}}}}...{{{{/raw}}}}` | yes (identifier names only) | yes | Loose: `[{{{{myComp}}}}hi {{this.x}}{{{{/myComp}}}}]` with a component whose layout is `({{yield}})` renders `[<div class="ember-view">(hi {{this.x}})</div>]`: body yielded, the mustache inside is literal text. Also with args `{{{{myComp 1 k=2}}}}` (`@k` is 2), with a hyphenated name `{{{{my-comp}}}}`, with HTML in the body (`<b>{{this.x}}</b>` is kept as an element with literal mustache), and with built-in `{{{{if this.y}}}}hi {{this.x}}{{{{/if}}}}` renders `[hi {{this.x}}]`. Strict (`compileWithScope` and runtime `template(src,{scope:()=>({myComp: C})})`): `[(hi {{this.x}})]`; babel `<template>` with `myComp` unbound errors "not in scope: myComp" (same as `{{#myComp}}`). Failures: helper-only `{{{{myH}}}}x{{{{/myH}}}}` with `helper:myH` -> "Attempted to resolve `myH`, which was expected to be a component, but nothing was found" (strict: "there wasn't a component manager"); nothing registered -> same resolution error; `{{{{myComp}}}}<b>{{{{/myComp}}}}` -> "Unclosed element `b`". | Behaves exactly as a block `{{#myComp}}` whose body mustaches are text. Strict mode needs a JS-identifier name (a hyphenated one fails as in F4). |
| F6 | `\{{` and `\\{{` escapes | yes | yes | Same output in both modes. `a\{{foo}} b` renders `a{{foo}} b`; `a\\{{this.foo}} b` (foo=FOO) renders `a\FOO b` (literal backslash, mustache evaluated); `a\\\{{this.foo}} b` renders `a\\FOO b`; `a\{{{foo}}} b` renders `a{{{foo}}} b`; `\{{#if x}}y\{{/if}}` renders `{{#if x}}y{{/if}}`; in an attribute `title="\{{foo}}"` renders `title="{{foo}}"`. Babel: `a\{{foo}} b` becomes two text statements `"a"`, `"{{foo}} b"` in both `<template>` and `precompileTemplate`. | Three backslashes before `{{` give two literal backslashes plus an evaluated mustache (i.e. only the last two backslashes are examined, as §02-2.2 says). |
| F7 | standalone-line stripping | yes | yes | Both modes: `a\n  {{#if this.x}}\n  b\n  {{/if}}\nc` (x=true) renders `a\n  b\nc`; `a\n  {{! c }}\nb` renders `a\nb`; `a\n{{#if this.x}}\nX\n{{else}}\nY\n{{/if}}\nz` (x=false) renders `a\nY\nz`; inline control `a {{#if this.x}} b {{/if}} c` renders `a  b  c` (not stripped); raw block lines are stripped too (`[\n{{{{myComp}}}}\n x\n{{{{/myComp}}}}\n]` renders `[\n( x\n)]`). | Applies to every template compiled by the precompile path, so it is not removable without changing rendered whitespace. |
| F8 | `{{else}}` chains with any helper | yes | yes | Both modes: `{{#if a}}A{{else if b}}B{{else}}C{{/if}}` (a=false,b=true) renders `B`; `{{else each this.b as |i|}}` renders `[1][2]` for [1,2] and falls through to `C` for []; `{{else let 5 as |v|}}` renders `v=5`; `{{else unless this.b}}` renders `U`; with a user component `{{#myComp}}A{{else myOther}}B{{/myComp}}` (myComp yields `to="inverse"`) renders `(B)` (myOther wraps). Babel: `{{else each ...}}` compiles to `if` whose inverse block contains the `each` block. **`{{else-thing}}` is not a helper call named `else-thing`**: it lexes as `{{else -thing}}`, i.e. the else-chain with component `-thing`. Loose with `component:-thing` registered: `{{#if this.a}}A{{else-thing}}B{{/if}}` (a=false) renders `(TB)`, identical to `{{else -thing}}`; with a helper `else-thing` registered the error is "Attempted to resolve `-thing`, which was expected to be a component, but nothing was found" (compile still succeeds; error only when the else branch is reached; a=true renders `A`). Strict: compile error "not in scope: -thing" (no JS binding can be `-thing`). | Which chained helpers are meaningful is §03; the chain syntax itself works with any in-scope block-capable callee. |

### Findings (step 1)

- Only F4 is unusable in strict mode, and only in strict mode: no public strict pipeline (`<template>`/babel, `precompileTemplate`
  scope, runtime `template()` scope) can bind a name containing `/`. F4 is therefore usable in loose mode (components, helpers, blocks,
  subexpressions) and so it cannot be removed outright without breaking loose templates; a strict-only rejection (e.g. a strict-mode
  error for slash paths) is a separate question for the author.
- No feature is unusable in both modes, so by the author's rule no feature qualifies for removal on usability grounds; F3 stays a
  policy candidate (already **[Out of spec]**).
- `{{else-thing}}` is `{{else -thing}}` (else-chain into component `-thing`), not a mustache named `else-thing`. Check that §02-3.3 and the
  lexer notes say so.
- `{{^if x}}A{{else}}B{{/if}}` swaps the two blocks (A is the inverse), i.e. it is `unless`-with-else for any callee (F3).
- In loose mode, unresolved `{{foo/bar}}` with no args and `{{this/foo}}` render empty without error (fallback property lookup of a
  literal-slash name); not in §02 as far as checked.
- Strict-mode `{{@foo/bar}}` and loose `{{@foo/bar}}` render empty (not investigated further; relevant to §02-4.2 only).
- `internal-test-helpers/lib/compile` accepts scope keys such as `foo/bar` that no real pipeline can produce, so conformance tests built
  on it could wrongly suggest strict-mode slash paths work.
- Parse-only coverage not re-run via the `hbs` babel target for every feature: the loose babel path is `precompileTemplate(..., {strictMode:false})`,
  which shares the parser and compiler with the rest (probed for F1-F6, F8).

### Findings (step 4)

- Every step 1 behavior reproduced; no test needed a changed expectation.
- Raw blocks record empty strip flags (`openStrip`, `inverseStrip`, `closeStrip` are `{}`), whereas `{{#raw}}` records
  `{open:false, close:false}`. So `astEqual` of a raw block against the same `{{#raw}}` block fails, and the raw-block parser
  tests assert structure instead. Not observable in rendering.

## Review (2026-10-14): which features are really "inherited legacy"?

Author's question: are slash paths really untested elsewhere? If a feature is already tested in
Ember/Glimmer's own suite, it is a deliberate feature, not an inherited leftover. Grep of
`origin/main` tests (excluding `packages/@handlebars/parser/spec`, which is the upstream parser's
own suite):

| # | Existing Ember/Glimmer coverage | Verdict |
|---|---|---|
| F1 `{{&foo}}` | none | inherited, legacy |
| F2 `{{^}}` | none | inherited, legacy |
| F3 `{{^foo}}…{{else}}` | only the error without `{{else}}` (`parser-error-test.ts`) | inherited, legacy, out of spec |
| F4 `foo/bar` | rendering test `curly-components-test.js:2336` ("a component with a slashed name can be invoked with curlies"); Glimmer's own handling and errors at `handlebars-node-visitors.ts:471-490` | **Ember feature** (loose-mode nested names). Glimmer *redefines* the syntax: in Handlebars `foo/bar` is the property path `foo.bar`, in Glimmer a single name |
| F5 raw blocks | none | inherited, legacy |
| F6 `\{{` escapes | `parser-escape-test.ts` (19 tests) | **Ember feature** (also documented in the Guides) |
| F7 standalone stripping / `~` | `parser-whitespace-test.ts`, `parser-node-test.ts` (whitespace control tests) | **Ember feature** |
| F8 `{{else if …}}` chains | parser/loc/print tests (`loc-node-test.ts`, `print-test.ts`) and the `@ember/helper` docs; **no rendering test** found | **Ember feature** (core syntax); rendering coverage is a gap |

Consequence: the "Inherited from Handlebars (legacy behavior)" label fits only F1, F2, F3 and F5.
F4, F6, F7 and F8 tests on `test/handlebars-legacy-features` should move to ordinary modules
(dropping parser tests that duplicate `parser-escape-test.ts`/`parser-whitespace-test.ts`, keeping
the new rendering tests, which add coverage, notably for F8). **Author (2026-10-14):** keep
only F1, F2, F3, F5 in T21; no new tests for F4, F6, F7; F8 rendering coverage becomes task T23.
Done (step 4 note); §02-4.2 and §02-11 item 15 updated.

## Deprecation guides (2026-10-14)

Author request: deprecation guides for F1, F2, F3, F5, `until: 8.0.0`. Written in
`/Users/edward/hacking/deprecation-app`, branch `deprecate-legacy-handlebars-syntax`, commit
`46ae444` (not pushed), `content/ember/v7/`. The file names are the deprecation ids, which the
Ember deprecations (not implemented yet) must use, with `url: 'https://deprecations.emberjs.com/id/<id>'`:

| Feature | Id | Prettier auto-fix |
|---|---|---|
| F1 `{{&foo}}` | `template-ampersand-mustache` | yes, `{{{foo}}}`; **broken with `~`**: prints `{{{~foo}}}` / `{{{foo~}}}`, a parse error (correct: `{{~{foo}}}`, `{{{foo}~}}`) |
| F2 `{{^}}` | `template-caret-else` | yes, `{{else}}`, tildes kept |
| F3 `{{^foo}}a{{else}}b{{/foo}}` | `template-inverse-block-with-else` | yes, `{{#foo}}b{{else}}a{{/foo}}`, tildes kept (same tree). Block params on such a block are dropped by the parser itself (they attach to the swapped half), so `{{^each xs as \|i\|}}…{{else}}{{i}}` never bound `i`; Prettier drops `as \|i\|` too |
| F5 raw blocks | `template-raw-block` | yes, `{{#foo}}…{{/foo}}` with `\{{` in the body |

Checked with Prettier 2.8.8, 3.0.0, 3.8.3 and 3.9.10 (`glimmer` parser and
`prettier-plugin-ember-template-tag` 2.1.8); every before/after pair in the guides parsed with
`@glimmer/syntax` to the same tree. `since: 7.5.0` is a placeholder for the release that ships the
deprecations. The Prettier `~` bug for `{{&foo}}` could be reported upstream.
