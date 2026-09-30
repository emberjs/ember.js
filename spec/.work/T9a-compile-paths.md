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

- [x] §01-1.11 item 1 / §0.7.1 item 2 (verified all three; see Results): `template(src, { strict: false })` is loose through babel `hbs`, strict through babel `wire`, strict at run time. Check all three.
- [x] §01-1.11 item 2 (verified, babel wire + runtime): runtime implicit (`eval`) form misses locals that are `undefined`, that shadow a global (`name`, `status`), or `this`. Compare with babel.
- [x] §01-1.11 item 3 (verified, runtime): runtime explicit `scope` uses `in` (inherited names like `toString` accepted) and calls `scope()` twice.
- [x] §03-10 item 1 (verified, babel wire + runtime): `action`, `mut`, `readonly`, `unbound` can be shadowed via runtime `lexicalScope` but not via babel `locals`.
- [x] §03-10 items 12–14 (verified, babel wire + runtime) (trackLocals counter bug, element block params, `helper`/`modifier`/`each-in`/`in-element` block params still rewritten): confirm with the babel wire path and at run time.
- [x] §01-1.5.6 (verified, babel hbs): the `hbs` target conversions (`template()` → `setComponentTemplate(precompileTemplate(...))`, `strict` → `strictMode`). Spot-check 3 examples.
- [x] §01-1.4 (verified, babel wire + hbs) implicit vs explicit scope capture at build time: spot-check 3 claims against babel output.
- [x] Update STATUS chapter table "Verification" for 01 and 03; update §00-0.6.

## Results

Setup notes. `pnpm build` was run first. `dist/` is emptied by `npx vite build`, so `pnpm build`
must be re-run afterwards before using the babel scripts again (do all babel work first or
rebuild). The test build runs the babel plugin over test files, so throwaway runtime tests must
import `template` from `@ember/template-compiler/runtime` (the plugin only rewrites imports from
`@ember/template-compiler`). Tap output hides passing assertions; results were printed with
`console.log` and read from the testem "browser log". One `moduleFor` per case, because a
component can only be registered once per test.

### Item 1: `strict` vs `strictMode` (babel hbs, babel wire, runtime)
- babel `hbs`: `template("{{foo}}", { strict: false, scope: () => ({}) })` becomes
  `precompileTemplate("{{foo}}", { strictMode: false })` (loose).
  `template("{{foo}}", { strictMode: false })` becomes `{ strictMode: false, strictMode: true }`.
- babel `wire`: both inputs fail with "Attempted to resolve a value in a strict mode template, but
  that value was not in scope: foo" (strict).
- runtime: `template("{{foo}}", { strict: false })` and `template("{{foo}}")` throw the same strict
  error. `template("{{foo}}", { strictMode: false })` renders `<!---->` (loose, no error).
- Result: chapter right. Added "(verified: ...)" to §01-1.11 item 1 and §0.7.1 item 2.

### Item 2: runtime implicit scope misses (babel wire, runtime)
- babel wire, `eval` form: `const u = undefined`, `const name = "N"`, `const status = "S"` each give
  `{{x}}` as `[32,0]` (lexical symbol) with a `scope` closure, the same as control `const ok = 1`.
  In a function, `{{this.message}}` becomes `scope: () => ({ "this": this })`.
- runtime, `eval` form: `{{ok}}` renders `OKVAL`. `{{u}}`, `{{name}}`, `{{status}}` each throw "not in
  scope". `{{this.message}}` inside `f.call({message})` renders `[]` (the component's own
  `this`). With explicit `scope: () => ({ this })` it renders the message.
- Result: chapter right. The "Untested" remark was replaced by the verification note.

### Item 3: runtime explicit scope (runtime)
- `scope: () => ({})`: `{{toString}}` renders `[object Undefined]`; `{{constructor}}` throws
  "Illegal constructor"; `{{hasOwnProperty}}` throws "Cannot convert undefined or null to object";
  `<toString />` fails with "no component manager"; `{{nope}}` is "not in scope".
- A counting `scope()` was called 2 times; the stack shows `buildEvaluator` (template.ts:278) then
  `buildCompileOptions` (compile-options.ts:114).
- Result: chapter right; verification note added to §01-1.11 item 3.

### Item 4: shadowing `action`/`mut`/`readonly`/`unbound`
- babel wire: for each of the four, with the name in `scope` (via `template()` and
  `precompileTemplate`), or captured by `eval`, `{{k 1}}` compiles to `[28,[31,0],[1],null]`
  (31 = GetStrictKeyword), identical to the control with no binding. `{{#let 1 as |mut|}}{{mut 1}}`
  is also `[31,1]`.
- runtime: `scope: () => ({ k: () => "SHADOW" })` renders `SHADOW` for all four; `eval` with a local
  `mut` renders `SHADOW`. Without a binding: `mut` asserts "You can only pass a path to mut",
  `readonly` and `unbound` render `x`, `action` throws "Strict mode errors should already be handled
  at compile time". A block param `|mut|` still gets the keyword (same assertion).
- Result: chapter right; note added to §03-10 item 1.

### Item 5: §03-10 items 12-14
- 12 (babel wire): `{{#let "a" as |on|}}{{#let "b" as |on|}}{{/let}}{{on}}{{/let}}` compiles to
  `[[[44,["a"],[[[44,["b"],[[],[2]]],[1,[32,0]]],[1]]]],["on","on"],["let"]]`, so the outer `{{on}}`
  is a lexical reference (the auto-imported built-in), where the control without the inner let gives
  `[30,1]` (block param). runtime: renders `[[object Object]]` vs `[a]` for the control.
  `<Foo {{on "click" this.x}} as |on|></Foo>` fails with "...modifier in a strict mode template...
  not in scope: on" on both paths; `as |x|` compiles.
- 13: babel `template()` forces strict, so used `precompileTemplate` (loose):
  `{{#let 1 as |helper|}}{{helper "foo"}}{{/let}}` gives `[28,[30,1],[[28,[37,1],["helper:foo"],null]],null]`,
  so `-resolve` is still inserted (free list `["let","-resolve"]`); same for `(modifier "foo")` via
  `@ember/template-compiler` `precompile`. runtime loose `template()`: the local helper receives the
  `-resolve` result (errors "Attempted to invoke `(-resolve \"helper:foo\")`, but foo was not a valid
  helper name" for the subexpression form). `<div {{modifier "foo"}}>` is not a rewrite target.
- 14 (babel wire): `|each-in|` + `{{#each-in this.x as |k v|}}` gives `[42,[28,[31,2],…]]` with free
  list `["let","each","-each-in"]`; `|in-element|` + `{{#in-element this.x}}` gives a component
  invocation `[6,[30,1],[[28,[31,1],…` with `-in-el-null`. Runtime: each-in case renders `<!---->`
  like control; in-element case throws "Got 1, expected:".
- Result: chapter right on all three; notes added.

### Item 6: §01-1.5.6 `hbs` conversions (babel hbs)
1. `template("<Foo/>{{bar}}", { strict: true, scope: () => ({ Foo, bar }) })` becomes
   `setComponentTemplate(precompileTemplate("<Foo />{{bar}}", { strictMode: true, scope: () => ({ Foo, bar }) }), templateOnly())`.
2. `class A { static { template("<Foo/>{{this.x}}", { component: this, eval() {...} }) } }` becomes
   `setComponentTemplate(precompileTemplate("<Foo />{{this.x}}", { strictMode: true, scope: () => ({ Foo }) }), this)`;
   `eval`/`component` keys removed, no `templateOnly` import.
3. `template("{{foo}}", { strictMode: false, scope: () => ({}) })` becomes `{ strictMode: false, strictMode: true }`
   (empty scope dropped). Also: `{{on}}`/`{{#each-in}}` not rewritten in `hbs`, rewritten in `wire`.
- Result: chapter right; note added to §01-1.5.6.

### Item 7: §01-1.4 build-time scope capture (babel wire/hbs)
- `let div = 1` inside a function with `<div></div>` implicit: `scope: () => ({ div })`.
- Block param `|A|` over imported `A`: no `scope`. `let hasBlock = 1`: captured. `JSON`: captured.
- `this`: `scope: () => ({ this: this })` in a function; absent with `component: this`.
- Explicit `scope: () => ({ A, B })` with `<A/>`: output keeps only `A` (hbs and wire);
  `{{nope}}` explicit: "not in scope" error. `{ Foo: bar }` is kept as `Foo: bar`.
- Result: chapter right; a summary note was added after the "Normative consequences" list.

### Item 8
- STATUS chapter table, STATUS "Next steps" item 4 and §00-0.6 updated.
