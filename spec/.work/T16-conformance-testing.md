# T16: conformance testing chapter (author request, 2026-10-07)

Resume from the first unticked item. Commit after each item.

Request: a new spec section on testing, i.e. how to verify that an implementation meets the
spec. It must give an actionable plan for refactoring the test suite before a new
implementation is generated:

1. What refactors of the existing ember.js test suite are needed so it can also run against an
   alternate spec-compliant implementation. Especially: existing testing patterns that rely on
   non-spec implementation details (wire format, opcodes, tags/references, ASTv1 plugins, VM
   internals, run loop internals, private `@glimmer/*` imports, ...).
2. Which parts of the spec lack test coverage. Incorporate existing spec content by reference
   (§05-14 item 16, "(untested)" markers, T9 experiments, T3 unsupported claims, ...).

Output: `spec/09-conformance-testing.md`, plus survey data in `spec/.work/T16-*.md`.

## Checklist

- [x] A. Harness survey (Sonnet agent) → `.work/T16-harness.md`: the glimmer
      `RenderDelegate`/`RenderTest`/suites harness and ember's `internal-test-helpers`
      (`moduleFor`, `RenderingTestCase`, `ApplicationTestCase`, `buildOwner`, `runTask`, ...):
      what each depends on, where an implementation adapter seam would go.
- [x] B. Coupling survey (Sonnet agent) → `.work/T16-coupling.md`: per test file in the
      template-relevant packages, the non-spec details it relies on, by category, with a
      portability class.
- [x] C. Spec coverage scan (script `tools/test-coverage.py`) → `.work/T16-coverage.md`:
      sections with no test citation, plus every existing "untested"/"by experiment" marker.
- [x] D. Write `spec/09-conformance-testing.md`: scope, test tiers, adapter interface, coupling
      catalogue with refactor actions, coverage gaps by reference, ordered work plan.
- [ ] E. Wire it in: §00 chapter table/reading guide, CONVENTIONS chapter table, STATUS (task
      row, next steps), `xref.py` and `check-citations.py` clean.

Notes from reading the surveys (for D):
- Coupling survey misclassifies two things against the spec: `backtrackingMessageFor`
  (`glimmer/tests/utils/debug-stack.js`) checks the normative §07-1.9 message, so its tests are
  P in the Dev profile; `render-settled-test.js` pins §07-1.10 item 8, so it is P in the Ember
  profile, not I.
- "Delete" in the coupling survey's action column means "exclude from the conformance suite":
  implementation tests stay in ember.js.
