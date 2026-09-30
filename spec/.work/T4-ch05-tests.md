# T4 — Test backing for chapter 05's source-only areas

For each area, search the tests: `packages/@glimmer-workspace/integration-tests/test/` and
`packages/@ember/-internals/glimmer/tests/`.

- If an assertion confirms the chapter, add a test citation next to the claim.
- If an assertion contradicts it, fix the chapter text to match the test, and note it here.
- If nothing tests it, add "(untested)" to the claim and make sure §05-14 lists it.

Commit after each area.

- [x] `each`: keys (`@identity`, `@index`, property keys), duplicate keys, move/insert/remove, `{{else}}`, iterables
- [x] `in-element`: `insertBefore`, null/undefined destination, destination change, clearing
- [x] `yield` / named blocks / `has-block` / `has-block-params`
- [x] Modifier install/update/destroy ordering (child vs parent)
- [x] Component lifecycle hook ordering (didCreate/didUpdate vs modifier install; classic hooks)
- [x] Destruction order (parent vs child destructors; eager vs deferred; which queue)

## Notes

### each
- Confirmed: retain/move sequences (`each.ts` swap #1, #2, #8, #9; LOCAL_DEBUG only), duplicates render, `@index`/`@identity`/path keys, `else`, holes, Set/forEach/Symbol.iterator, destroy on remove/empty, each-in key tests (already cited).
- No contradictions found.
- Untested (added to §05-14 item 20): `@key` on plain each, invalid-keypath assertion, key read once, occurrence numbering of duplicate keys, NaN keys, Map entries in plain each, non-iterable objects, lazy native iterator consumption, extra block params, node non-reuse across empty transition, insert-before-revalidate and delete ordering. Sync step tests are LOCAL_DEBUG-only.

### in-element
- Confirmed by `lib/suites/in-element.ts` and `public-in-element-test.js`: clearing, insertBefore null/node, node-to-null move, falsy destination, destination change, nesting, destroy. No contradictions.
- Untested (in §05-5.7 test list): explicit `insertBefore=undefined`, node-to-node insertBefore change, remote-not-in-bounds rule, `guid` error, isProduction omission of `-in-el-null`. Added to §05-14 item 20.

### yield / blocks
- Confirmed: named blocks, `<:else>`/`<:inverse>` aliasing, has-block/has-block-params matrix, absent-block yield, lexical context, block-param shadowing.
- Corrected/clarified: §05-6.3 said "else blocks cannot declare params"; only `{{else}}` cannot, `<:else as |x|>` can (emberish-components.ts:263-295). §14 item 16 said Glimmer "skips" the inverse/else yield tests; `skip:'glimmer'` skips only the angle-bracket kind, curly and dynamic still run them (lib/test-helpers/module.ts:143-160). Reworded item 16.
- Untested (added to §14 item 20): owner inside yielded block, yielding one block several times, has-block constancy, non-literal has-block error, has-block-params for `<:else as |x|>`.

### Modifier ordering
- Confirmed: install order (same element source order; children before parents; siblings doc order), destroy order (identical), update on changed arg only, non-interactive skip, dynamic modifier install/destroy. No contradictions.
- Untested: update pre-order across elements, update never in same transaction as install, dynamic modifier definition replacement timing, element detached at destroy time, element attribute-less/undocumented at create.

### Lifecycle and destruction
- Confirmed: classic hook order create/update (child-first post hooks, parent-first pre hooks), destroy phases and order (life-cycle-test.js:305-537, 1161-1222), eager hooks run with DOM attached (1429-1587), eager hooks before replacement content, deferred after; @glimmer/destroyable unit tests for the algorithm (bonus, outside the two named dirs).
- Clarified: 05-11.3 replacement bullet now says eager hooks of removed items run before the else content's init. 06-10.2/10.3/11 now carry test status and agree with 05-11 and 05-14 item 11. 06-11 test range widened to 304-458.
- Untested (05-14 item 20): component hooks vs modifier installs across the commit phase; parent-first modifier update order; public-manager tree ordering and destroyComponent order; deferred destructors after DOM removal / actions queue.
