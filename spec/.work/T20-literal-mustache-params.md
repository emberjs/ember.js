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
- [ ] 5. Run the `@glimmer/syntax` tests and the integration tests that render literals.
- [ ] 6. PR description: the current behavior, why it is a bug (arguments vanish without a
      warning; the block and sub-expression forms already error), the usage check result.
- [ ] 7. When it lands: rewrite §02-3.7 and the E-catalogue (§02-9.2, new row), remove §02-11
      item 1 and the matching §00-0.7.2 sentence, update STATUS "Upstream fix branches".
