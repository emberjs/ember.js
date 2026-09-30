# T4 — Test backing for chapter 05's source-only areas

For each area, search the tests: `packages/@glimmer-workspace/integration-tests/test/` and
`packages/@ember/-internals/glimmer/tests/`.

- If an assertion confirms the chapter, add a test citation next to the claim.
- If an assertion contradicts it, fix the chapter text to match the test, and note it here.
- If nothing tests it, add "(untested)" to the claim and make sure §05-14 lists it.

Commit after each area.

- [ ] `each`: keys (`@identity`, `@index`, property keys), duplicate keys, move/insert/remove, `{{else}}`, iterables
- [ ] `in-element`: `insertBefore`, null/undefined destination, destination change, clearing
- [ ] `yield` / named blocks / `has-block` / `has-block-params`
- [ ] Modifier install/update/destroy ordering (child vs parent)
- [ ] Component lifecycle hook ordering (didCreate/didUpdate vs modifier install; classic hooks)
- [ ] Destruction order (parent vs child destructors; eager vs deferred; which queue)
