# T9a — run the babel plugin and the runtime `template()` path against §01 and §03

§01 and §03 were checked against source and `dist/dev` only; the babel plugin and the runtime
`eval` form were never run (STATUS "Next steps" item 4). For each item below, run the actual
code, compare with what the spec says, and record the result here. If the spec is right, add
"(verified: <how>)" next to the claim in the chapter. If it is wrong, correct the chapter text
(small, precise edits; keep citations) and note what changed here.

## How to run things
- **Babel plugin:** `node_modules/babel-plugin-ember-template-compilation` (v4.0.0) with
  `@babel/core` from this repo's node_modules. Write throwaway scripts in the session
  scratchpad (NOT in the repo). Use `targetFormat: 'wire'` with the compiler from
  `dist/dev/packages/ember-template-compiler/index.js` (run `pnpm build` once if `dist/` is
  missing or stale — check `ls -la dist/dev`), and `targetFormat: 'hbs'` where relevant.
- **Runtime `template()`:** needs a browser. Write a throwaway QUnit test file under
  `packages/@ember/template-compiler/tests/` (do NOT commit it; delete it when done), then:
  `npx vite build --mode development --minify false` and run just that module with
  `FILTER='<module name>' npx testem ci -f testem.filter.cjs --host 127.0.0.1`, where
  `testem.filter.cjs` is (create it at the repo root, do not commit it):
  ```js
  const base = require('./testem.cjs');
  module.exports = { ...base, test_page: `index.html?hidepassed&filter=${encodeURIComponent(process.env.FILTER)}`, reporter: 'tap', port: 13142 };
  ```
  Look at existing tests in `packages/@ember/template-compiler/tests/template_test.ts` for how
  to render a `template()` component.

Resume from the first unticked item. Commit spec/ changes after each item: `spec(T9a): ...`.

- [ ] §01-1.11 item 1 / §0.7.1 item 2: `template(src, { strict: false })` is loose through babel `hbs`, strict through babel `wire`, strict at run time. Check all three.
- [ ] §01-1.11 item 2: runtime implicit (`eval`) form misses locals that are `undefined`, that shadow a global (`name`, `status`), or `this`. Compare with babel.
- [ ] §01-1.11 item 3: runtime explicit `scope` uses `in` (inherited names like `toString` accepted) and calls `scope()` twice.
- [ ] §03-10 item 1: `action`, `mut`, `readonly`, `unbound` can be shadowed via runtime `lexicalScope` but not via babel `locals`.
- [ ] §03-10 items 12–14 (trackLocals counter bug, element block params, `helper`/`modifier`/`each-in`/`in-element` block params still rewritten): confirm with the babel wire path and at run time.
- [ ] §01-1.5.6: the `hbs` target conversions (`template()` → `setComponentTemplate(precompileTemplate(...))`, `strict` → `strictMode`). Spot-check 3 examples.
- [ ] §01-1.4 implicit vs explicit scope capture at build time: spot-check 3 claims against babel output.
- [ ] Update STATUS chapter table "Verification" for 01 and 03; update §00-0.6.

## Results
