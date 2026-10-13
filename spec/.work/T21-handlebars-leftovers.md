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

- [ ] 1. For each feature, prove usability by compiling and rendering through the real pipelines:
      the babel plugin (strict `<template>`, and loose `hbs`/colocated `.hbs`) and the runtime
      `template()`. Use throwaway rendering tests in `packages/@ember/-internals/glimmer/tests/`
      (as T9b did) and `spec/tools/probe-precompile.mjs`. Record per feature: strict usable?
      loose usable? the evidence (test name or probe output).
- [ ] 2. For each feature that is usable in neither mode, check that no published usage
      exists that still compiles (e.g. search addons on GitHub code search) and write the case for
      removal. Ask the author before opening the removal PR, since a removal turns accepted
      source into a syntax error.
- [ ] 3. Removal PRs: make the parser reject the feature with a Glimmer syntax error that names
      it ("… is inherited from Handlebars and not supported"), with tests in
      `packages/@glimmer/syntax/test/parser-error-test.ts`.
- [ ] 4. Coverage PRs for each usable feature: parser tests in `packages/@glimmer/syntax/test/`
      and rendering tests, each in a module or with a comment that marks it as "inherited from
      Handlebars, legacy behavior" (agree the exact wording once and reuse it). Prefer tests that
      the §09 conformance suite can run unchanged.
- [ ] 5. Spec follow-up: mark each kept feature **[Legacy]** in its §02 section and cite the new
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
