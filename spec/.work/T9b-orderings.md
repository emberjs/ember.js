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

- [x] Hook order across a tree of public-manager (custom component manager) components: create/didCreate/update/didUpdate/destroy for parent + two children (§06-11, §05-11). Done: verified, no spec correction.
- [x] `didCreate` of a component vs `installModifier` of modifiers on its elements (§06-11). Done: verified, no correction.
- [x] `updateModifier` vs `didUpdate` order in the same render (§06-11). Done: verified, no correction.
- [x] Deferred destructors (`registerDestructor`) run after DOM removal, in the `actions` queue; `isDestroyed` becomes true in the `destroy` queue (§05-11, §06-10.2). Done: verified, no correction.
- [x] `destroyComponent` order for public managers across a tree (§05-14 item 11). Done: verified, no correction.
- [ ] Modifiers: `updateModifier` never in the same transaction as `installModifier`; element already detached when `destroyModifier` runs (§05-14 item 20 "Modifiers").
- [ ] Update §05-14 item 20, STATUS chapter table (05 row), §00-0.6, §0.7.9.


## Results

Harness: throwaway `packages/@ember/-internals/glimmer/tests/integration/t9b-orderings-test.js`
(copy in the scratchpad `t9b/`), Ember dev build, Chrome via testem. Public component manager with
`componentCapabilities('3.13', {asyncLifecycleCallbacks, destructor, updateHook})`; tree
`{{#if show}}{{x-parent}}{{/if}}` where `x-parent` renders `x-child` twice.

### 1. Hook order across a public-manager tree
Spec claimed: create pre-order; `didCreate` post-order (children first); `updateComponent`
pre-order; `didUpdate` post-order; destroy parent-first (§05-7.4, §06-11, §05-11.3).
Observed:
- initial: `p.create, c1.create, c2.create, c1.didCreate, c2.didCreate, p.didCreate`
- update (arg reaches all): `p.update, c1.update, c2.update, c1.didUpdate, c2.didUpdate, p.didUpdate`
- destroy (`if` turned off): `p.destroyComponent, c1.destroyComponent, c2.destroyComponent`, each in the
  `actions` queue.
Verified; no correction.

### 2. `didCreate` vs `installModifier`
Spec claimed (§06-11 steps 1, 3): all `didCreate` (children first) before any `installModifier`
(elements' modifiers child-first).
Observed, tree `p` (`<div {{m p}}>` with `c1`, `c2`, each `<i {{m}}>`):
`c1.didCreate, c2.didCreate, p.didCreate, m(c1).install, m(c2).install, m(p).install`.
Second tree with modifiers on plain elements between/inside components: all four `didCreate`
(`d0, d1, e0, d2`) precede all five installs (`b1, eb, e, b2, top`). Also seen: the modifier
`createModifier` hooks run interleaved with component `createComponent` hooks in document
pre-order (`p, mod p, c1, mod c1, ...`). Verified; no correction.

### 3. `updateModifier` vs `didUpdate`
Spec claimed (§06-11 steps 2, 4): all `didUpdate` (children first), then all `updateModifier`
(document pre-order, parents first).
Observed after an argument change: `p.update, c1.update, c2.update` (component updates pre-order),
then at commit `c1.didUpdate, c2.didUpdate, p.didUpdate, m(p).update, m(c1).update, m(c2).update`.
Plain elements `<div {{m a}}><div {{m b}}></div><div {{m c}}></div></div>{{#if}}<p {{m d}}>{{/if}}`:
updates `a, b, c, d`. Verified; no correction (this also settles "pre-order of scheduled updates"
in §05-14 item 20 and §05-10.3).

### 4. Deferred destructors: queue, DOM, `isDestroyed`
Spec claimed (§05-11.2, §06-10.2): deferred destructors are scheduled into `actions`, run after
the DOM is removed; `isDestroyed` becomes true in the `destroy` queue.
Observed (helper with `hasDestroyable` inside `{{#if}}<p id=gone>{{dh 1}}</p>{{/if}}`, `if` turned
false in `run`): the `registerDestructor` callback ran with current queue `actions`,
`isDestroying=true`, `isDestroyed=false`, `#gone` absent from the document. Order of events:
`destructor`, `probe(afterRender): isDestroyed=false`, `probe(destroy, scheduled before render):
false`, `probe(destroy, scheduled from afterRender): true`, then true after `run` returned.
(Current queue was detected through `_backburner.currentInstance.queues[name]._queueBeingFlushed`.)
Verified; no correction. The word "after the new content rendered" (§05-11.2) was not separately
tested here.

### 5. `destroyComponent` order across a public-manager tree
Spec claimed (§05-11.3, §05-14 item 11): parent before child, siblings in document order.
Observed: `p, c1, c2` for `p{c1, c2}`; for `top{d0, e0{d1}, d2}` (with modifiers present or not):
`d0, e0, d1, d2`. All in the `actions` queue. Verified; no correction for components. (The
modifier half of item 11 is corrected under item 6.)

## Upstream candidates
