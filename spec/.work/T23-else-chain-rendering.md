# T23 — Rendering coverage for `{{else …}}` chains

Split out of T21 (author, 2026-10-14). `{{else if …}}` chains (and `{{else each …}}`,
`{{else let …}}`, `{{else <component>}}`) are core Ember syntax, not a Handlebars leftover. They have
parser, location and printer tests (`packages/@glimmer/syntax/test/loc-node-test.ts`,
`generation/print-test.ts`) and appear in the `@ember/helper` docs, but no *rendering* test was
found in Ember or Glimmer (T21 review, grep of `origin/main` at `c02a9ee118`). Spec: §02-3.3.

Resume from the first unticked item. Worktree: create one from `origin/main`
(`git worktree add -b test/else-chain-rendering ../ember.js-t23 origin/main`, then
`pnpm install --frozen-lockfile --offline`). Not pushed until the author says so.

- [ ] 1. Re-check for existing rendering coverage before writing anything (templates built by
      string interpolation too, e.g. the shared conditional suites in
      `packages/@ember/-internals/glimmer/tests/utils/shared-conditional-tests.js` and the
      `@glimmer-workspace/integration-tests` `if`/`unless`/`each` suites). Record what exists.
- [ ] 2. Add rendering tests in ordinary modules (not labelled legacy), in
      `packages/@glimmer-workspace/integration-tests/test/` so the §09 conformance suite can run
      them. Start from the seed below (written by T21 step 4 and verified green there), renamed out
      of the "Inherited from Handlebars" naming. Cover: `{{else if}}` picking the first true branch
      and updating on rerender (including switching between branches, which exercises teardown of
      the previous branch), `{{else each … as |x|}}` with its own `{{else}}`, `{{else let}}`,
      `{{else unless}}`, a user component as a chain link, strict and loose mode.
- [ ] 3. `{{else-thing}}` lexes as `{{else -thing}}` (§02-2.1). Decide whether to keep the seed's
      test for it here (it documents a lexer quirk, arguably legacy) or drop it; ask the author.
- [ ] 4. `tsc`, prettier, the filtered run and the full suite green; commit with a message that
      explains the gap; record totals here.
- [ ] 5. When it lands: cite the tests in §02-3.3.

## Seed: rendering tests (from T21 step 4, removed from the legacy suite)

```ts
class ElseChainTest extends RenderTest {
  static suiteName = 'Inherited from Handlebars (legacy behavior): {{else}} chains';

  @test
  'strict: {{else each}} chains into an {{each}} block'() {
    this.renderComponent(
      defineComponent({}, '{{#if false}}A{{else each @list as |i|}}[{{i}}]{{else}}C{{/if}}'),
      { list: [1, 2] }
    );
    this.assertHTML('[1][2]');
    this.assertStableRerender();
  }

  @test
  'strict: an empty list falls through to the final {{else}}'() {
    this.renderComponent(
      defineComponent({}, '{{#if false}}A{{else each @list as |i|}}[{{i}}]{{else}}C{{/if}}'),
      { list: [] }
    );
    this.assertHTML('C');
    this.assertStableRerender();
  }

  @test
  'loose: {{else if}} chain follows the first true condition and updates'() {
    this.render('{{#if this.a}}A{{else if this.b}}B{{else}}C{{/if}}', { a: false, b: true });
    this.assertHTML('B');
    this.assertStableRerender();

    this.rerender({ b: false });
    this.assertHTML('C');
  }

  @test
  'loose: {{else let}} and {{else unless}} chain'() {
    this.render(
      '{{#if false}}A{{else let 5 as |v|}}v={{v}}{{/if}}|{{#if false}}A{{else unless this.b}}U{{/if}}',
      { b: false }
    );
    this.assertHTML('v=5|U');
    this.assertStableRerender();
  }

  @test
  'loose: {{else myOther}} chains into a user component'() {
    this.registerComponent('TemplateOnly', 'my-comp', '{{yield to="inverse"}}');
    this.registerComponent('TemplateOnly', 'my-other', '({{yield}})');
    this.render('{{#my-comp}}A{{else my-other}}B{{/my-comp}}');
    this.assertHTML('(B)');
    this.assertStableRerender();
  }

  @test
  'loose: {{else-thing}} is an else-chain into -thing'() {
    this.registerComponent('TemplateOnly', '-thing', '(T{{yield}})');
    this.render('{{#if this.a}}A{{else-thing}}B{{/if}}', { a: false });
    this.assertHTML('(TB)');
    this.assertStableRerender();
  }
}

```

## Seed: parser tests (from T21 step 4; check against existing parser tests before keeping any)

```ts
QUnit.module('Inherited from Handlebars (legacy behavior): {{else}} chains');

test('{{else if}} chains nest as an inverse block holding another block', (assert) => {
  let block = onlyStatement<ASTv1.BlockStatement>('{{#if a}}A{{else if b}}B{{else}}C{{/if}}');
  assert.deepEqual(textOf(block.program.body), ['A']);
  let chained = inverseOf(block).body[0] as ASTv1.BlockStatement;
  assert.strictEqual(chained.type, 'BlockStatement');
  assert.strictEqual((chained.path as ASTv1.PathExpression).original, 'if');
  assert.deepEqual(textOf(chained.program.body), ['B']);
  assert.deepEqual(textOf(inverseOf(chained).body), ['C']);
});

test('{{else each b as |c|}} chains with any callee and keeps block params', (assert) => {
  let block = onlyStatement<ASTv1.BlockStatement>(
    '{{#if a}}A{{else each b as |c|}}{{c}}{{else}}D{{/if}}'
  );
  let chained = inverseOf(block).body[0] as ASTv1.BlockStatement;
  assert.strictEqual((chained.path as ASTv1.PathExpression).original, 'each');
  assert.deepEqual(
    chained.params.map((p) => (p as ASTv1.PathExpression).original),
    ['b']
  );
  assert.deepEqual(chained.program.blockParams, ['c']);
  assert.deepEqual(textOf(inverseOf(chained).body), ['D']);
});

test('{{else-thing}} is an else-chain into -thing, not a call to else-thing', (assert) => {
  let block = onlyStatement<ASTv1.BlockStatement>('{{#if a}}A{{else-thing}}B{{/if}}');
  let chained = inverseOf(block).body[0] as ASTv1.BlockStatement;
  assert.strictEqual(chained.type, 'BlockStatement');
  assert.strictEqual((chained.path as ASTv1.PathExpression).original, '-thing');

  astEqual('{{#if a}}A{{else-thing}}B{{/if}}', '{{#if a}}A{{else -thing}}B{{/if}}');
});
```
