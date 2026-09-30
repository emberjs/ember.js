# T9b — pin down orderings that §05 derives from source only

§05-14 item 20 lists orderings with no test. Write throwaway browser tests to observe the
actual order, then record it in the spec: if the spec is right, replace "(untested)" with
"(verified by experiment, T9b)" and remove it from item 20; if wrong, correct the text and
note it here. These are experiments, not additions to Ember's test suite: do NOT commit test
files; delete them when done. (Whether to upstream them as real tests is the author's call —
list good candidates under "Upstream candidates".)

## How to run
Put a throwaway test module in `packages/@ember/-internals/glimmer/tests/integration/`
(look at neighbouring tests, e.g. `custom-component-manager-test.js`,
`custom-modifier-manager-test.js`, `components/life-cycle-test.js`, for the harness:
`moduleFor`, `RenderingTestCase`, `this.render`, `runTask`). Then
`npx vite build --mode development --minify false` and
`FILTER='<module name>' npx testem ci -f testem.filter.cjs --host 127.0.0.1`, with
`testem.filter.cjs` at the repo root (do not commit it):
```js
const base = require('./testem.cjs');
module.exports = { ...base, test_page: `index.html?hidepassed&filter=${encodeURIComponent(process.env.FILTER)}`, reporter: 'tap', port: 13142 };
```
Notes from T9a: `npx vite build` empties `dist/` (fine for these tests). The tap reporter
hides passing assertions, so also `console.log(JSON.stringify(log))` and read the testem
"browser log"; a failing assertion prints actual vs expected. Use one `moduleFor` per case if
components need registering under the same name.

Log calls into an array and `assert.deepEqual` against the order the spec claims; a failing
assertion prints the actual order.

Resume from the first unticked item. Commit spec/ changes after each item: `spec(T9b): ...`.

- [ ] Hook order across a tree of public-manager (custom component manager) components: create/didCreate/update/didUpdate/destroy for parent + two children (§06-11, §05-11).
- [ ] `didCreate` of a component vs `installModifier` of modifiers on its elements (§06-11).
- [ ] `updateModifier` vs `didUpdate` order in the same render (§06-11).
- [ ] Deferred destructors (`registerDestructor`) run after DOM removal, in the `actions` queue; `isDestroyed` becomes true in the `destroy` queue (§05-11, §06-10.2).
- [ ] `destroyComponent` order for public managers across a tree (§05-14 item 11).
- [ ] Modifiers: `updateModifier` never in the same transaction as `installModifier`; element already detached when `destroyModifier` runs (§05-14 item 20 "Modifiers").
- [ ] Update §05-14 item 20, STATUS chapter table (05 row), §00-0.6, §0.7.9.

## Results
## Upstream candidates
