# T20 — Literal mustaches with arguments become an error (upstream PR)

Author ruling (2026-10-13, on §02-11 item 1, "Literal mustaches discard params"): fix this in the existing implementation.

Today `{{"foo" bar baz=1}}` silently becomes `{{"foo"}}`
(`packages/@glimmer/syntax/lib/parser/handlebars-node-visitors.ts:247-255`: `isHBSLiteral`
branch builds the mustache with `params: []` and an empty hash). `{{#"foo"}}` and `("foo")`
already error (E16, `handlebars-node-visitors.ts:693-716`). `{{"foo"}}`, `{{1}}`, `{{null}}` with
no arguments stay valid.

Resume from the first unticked item. Worktree `/Users/edward/hacking/ember.js-t20`, branch
`fix/literal-mustache-arguments` from `origin/main`; nothing outside the PR branch is
committed except this file and the spec.

- [x] 1. Decide with the author whether this lands as an error now or as a [Dev] deprecation
      first. It changes a template that compiles and renders today into a compile error, so
      Ember's semver policy probably calls for a deprecation (`until: '8.0.0'`). Record the answer
      here.
      **Answer (author, 2026-10-13, `036d98ba70`):** an error right away, no deprecation. The PR
      argues it is a bugfix, and a new compile error is low risk for users: easy to detect and
      easy to fix.

- [x] 2. Usage check: grep this repo's templates and tests (`.hbs`, `.gjs`, `.gts`, inline `hbs`
      and `precompileTemplate` strings) for a literal callee with arguments. Note any hits; they
      must be updated in the same PR.
      Corpus (`spec/tools/compare-parsers.mjs` over `~/hacking`): 28,770 distinct templates, 0 newly
      rejected.
      Done: no hits in `packages/` or `smoke-tests/` (`.ts`, `.js`, `.hbs`, `.gjs`, `.gts`), so no
      template needs updating.
- [x] 3. Implement in the `isHBSLiteral` branch: when `params.length > 0` or `hash.pairs.length > 0`,
      throw a syntax error (or emit the deprecation). Proposed message, in the style of E16:
      ``${Type} "${text}" cannot be called with arguments, replace {{${value} …}} with {{${value}}}``
      Span: the whole mustache. Applies to `{{…}}`, `{{{…}}}`, and attribute-value and modifier
      positions (a literal modifier is already E19; check that the order of the checks keeps E19
      for modifiers).
      Done (worktree commit `985c4f5a0e`): `assertNoLiteralArguments`, called only in the content
      and attribute-value cases, so tag and modifier positions keep E18/E19 and HTML comments are
      unaffected. The E16 literal-printing code is factored into `describeLiteral` and shared.
- [x] 4. Tests in `packages/@glimmer/syntax/test/parser-node-test.ts` next to the E16 tests
      (`:1027-1100`): params only, hash only, both, triple curly, in a quoted attribute value, in
      an unquoted attribute value; and that `{{"foo"}}`, `{{1}}`, `{{null}}`, `{{undefined}}` still
      parse.
      Done: 3 tests (8 error cases incl. triple curly and both attribute forms; argument-free
      literals still parse; modifier position keeps E19). Lint and `tsc` clean; `[glimmer-syntax]`
      370/370 in the browser.
- [x] 5. Run the `@glimmer/syntax` tests and the integration tests that render literals.
      Done: full suite in the worktree, 9232 tests, 9212 pass, 20 skip, 0 fail.
- [x] 6. PR description: the current behavior, why it is a bug (arguments vanish without a
      warning; the block and sub-expression forms already error), the usage check result.
      Done: draft below ("PR description"). Not pushed: waiting for the author's go-ahead.
- [ ] 7. When it lands: rewrite §02-3.7 and the E-catalogue (§02-9.2, new row), remove §02-11
      item 1 and the matching §00-0.7.2 sentence, update STATUS "Upstream fix branches".

## PR description (draft)

Title: Report a syntax error for a literal mustache with arguments

`{{"foo" bar baz=1}}` currently parses as `{{"foo"}}`: the parser keeps the literal and silently
drops every positional and named argument. The block and sub-expression forms are already syntax
errors (`{{#"foo"}}…{{/"foo"}}`, `("foo" bar)` → `StringLiteral "foo" cannot be called as a
sub-expression, …`), so only the plain mustache loses its arguments without a word.

This PR makes a literal mustache with arguments a syntax error, worded like the sub-expression
one:

```
StringLiteral "foo" cannot be called with arguments, replace {{"foo" ...}} with {{"foo"}}
```

- `{{"foo"}}`, `{{1}}`, `{{true}}`, `{{null}}`, `{{undefined}}` (no arguments) are unchanged, in
  content and in attribute values.
- In tag and modifier positions the existing, more specific errors still win (`Cannot use
  mustaches in an elements tagname`, `In <div ... {{"foo"}} ..., {{"foo"}} is not a valid
  modifier`). Inside an HTML comment the mustache is still comment text.

**Why this is a bugfix, not a breaking change.** The arguments never did anything: no template
can depend on them, because they were discarded before compilation. A template that has them
almost certainly meant something else (a typo'd helper name in quotes, for instance), and today
it renders the bare literal silently. After this change it fails at build time with a message
that names the fix. The new error is easy to detect (it is a compile error, reported with the
module name and position) and easy to fix (delete the arguments, or call the intended helper).

No template in this repository uses the form, and none in a local corpus of Ember apps and addons
(Ghost admin, several large private apps, and the published addons in their `node_modules`):
57,329 templates, 28,770 distinct, none newly rejected (`spec/tools/compare-parsers.mjs`). Tests: `packages/@glimmer/syntax/test/parser-node-test.ts`
(8 error cases, including triple curlies and both attribute-value forms; the argument-free
literals; the modifier position).

Found while writing the template language spec (§02-3.7).
