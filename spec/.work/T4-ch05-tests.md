# T4 — Test backing for chapter 05's source-only areas

For each area, search the tests: `packages/@glimmer-workspace/integration-tests/test/` and
`packages/@ember/-internals/glimmer/tests/`.

- If an assertion confirms the chapter, add a test citation next to the claim.
- If an assertion contradicts it, fix the chapter text to match the test, and note it here.
- If nothing tests it, add "(untested)" to the claim and make sure §05-14 lists it.

Commit after each area.

- [x] `each`: keys (`@identity`, `@index`, property keys), duplicate keys, move/insert/remove, `{{else}}`, iterables
- [x] `in-element`: `insertBefore`, null/undefined destination, destination change, clearing
- [ ] `yield` / named blocks / `has-block` / `has-block-params`
- [ ] Modifier install/update/destroy ordering (child vs parent)
- [ ] Component lifecycle hook ordering (didCreate/didUpdate vs modifier install; classic hooks)
- [ ] Destruction order (parent vs child destructors; eager vs deferred; which queue)

## Notes

### each
- Confirmed: retain/move sequences (`each.ts` swap #1, #2, #8, #9; LOCAL_DEBUG only), duplicates render, `@index`/`@identity`/path keys, `else`, holes, Set/forEach/Symbol.iterator, destroy on remove/empty, each-in key tests (already cited).
- No contradictions found.
- Untested (added to §05-14 item 20): `@key` on plain each, invalid-keypath assertion, key read once, occurrence numbering of duplicate keys, NaN keys, Map entries in plain each, non-iterable objects, lazy native iterator consumption, extra block params, node non-reuse across empty transition, insert-before-revalidate and delete ordering. Sync step tests are LOCAL_DEBUG-only.

### in-element
- Confirmed by `lib/suites/in-element.ts` and `public-in-element-test.js`: clearing, insertBefore null/node, node-to-null move, falsy destination, destination change, nesting, destroy. No contradictions.
- Untested (in §05-5.7 test list): explicit `insertBefore=undefined`, node-to-node insertBefore change, remote-not-in-bounds rule, `guid` error, isProduction omission of `-in-el-null`. Added to §05-14 item 20.
