/* eslint-disable @typescript-eslint/no-implied-eval -- the test evaluates printed source */
import type { SerializedTemplateBlock } from '@glimmer/interfaces';
import { precompileJSON, precompileModule } from '@glimmer/compiler';

QUnit.module('@glimmer/compiler - precompileModule');

/**
 * Evaluates the printed block with each opcode identifier bound to its
 * numeric value, which must give back the JSON block.
 */
function roundTrip(source: string, strictMode = false): SerializedTemplateBlock {
  let { imports, expression } = precompileModule(source, { strictMode });
  let names = imports.map((imp) => imp.local);
  let values = imports.map((imp) => {
    QUnit.assert.strictEqual(imp.module, '@glimmer/opcode-compiler/ops');
    return imp.id;
  });

  let evaluate = new Function(...names, `return (${expression});`) as (...args: number[]) => {
    block: SerializedTemplateBlock;
  };

  return evaluate(...values).block;
}

const TEMPLATES: Record<string, string> = {
  'static text': 'hi ',
  'element with attributes':
    '<div class="a" id={{this.b}} title="{{this.c}}!" ...attributes></div>',
  'if and else': '{{#if this.a}}{{this.b}}{{else}}{{this.c}}{{/if}}',
  'each with key': '{{#each this.items key="id" as |item i|}}{{item}}{{i}}{{else}}none{{/each}}',
  'let and yield': '{{#let this.a as |b|}}{{yield b}}{{/let}}',
  'in-element': '{{#in-element this.dest insertBefore=null}}x{{/in-element}}',
  'component with blocks':
    '<Foo @bar={{1}} {{on "click" this.go}}><:default as |x|>{{x}}</:default></Foo>',
  'helpers and keywords':
    '{{concat (if this.a "b" "c") (not this.d) (has-block "x") (log this.e)}}',
  'trusting and comment': '{{{this.html}}}<!-- note -->',
  debugger: '{{debugger}}',
  'curly component and block': '{{foo-bar a=1}}{{#foo-bar}}x{{/foo-bar}}',
  'dynamic component and modifier': '{{component this.name}}<div {{this.mod 1}}></div>',
  'with dynamic vars': '{{#-with-dynamic-vars a=1}}{{-get-dynamic-var "a"}}{{/-with-dynamic-vars}}',
};

for (let [name, source] of Object.entries(TEMPLATES)) {
  QUnit.test(name, (assert) => {
    let [expected] = precompileJSON(source, {});
    assert.deepEqual(roundTrip(source), expected);
  });
}

QUnit.test('strict mode with lexical scope', (assert) => {
  let source = '<Foo @x={{bar}} />{{baz}}';
  let options = { strictMode: true, lexicalScope: () => true };
  let [expected] = precompileJSON(source, options);
  let { imports, expression } = precompileModule(source, options);

  let evaluate = new Function(
    'Foo',
    'bar',
    'baz',
    ...imports.map((imp) => imp.local),
    `return (${expression});`
  ) as (...args: unknown[]) => { block: SerializedTemplateBlock; scope: () => object };

  let result = evaluate('foo', 'bar', 'baz', ...imports.map((imp) => imp.id));

  assert.deepEqual(result.block, expected);
  assert.deepEqual(result.scope(), { Foo: 'foo', bar: 'bar', baz: 'baz' });
});

QUnit.test('strict keywords become lexical imports', (assert) => {
  let source = '{{mut this.value}}';
  let options = {
    strictMode: true,
    keywords: ['mut'],
    lexicalScope: () => false,
    lexicalKeywords: { mut: { module: '@app/keywords', name: 'mut' } },
  };
  let { imports, expression } = precompileModule(source, options);
  let keyword = imports.find((imp) => imp.module === '@app/keywords');

  assert.ok(keyword, 'the keyword is imported');
  assert.strictEqual(keyword?.name, 'mut');

  let MUT = {};
  let evaluate = new Function(...imports.map((imp) => imp.local), `return (${expression});`) as (
    ...args: unknown[]
  ) => { block: SerializedTemplateBlock; scope: () => object };
  let result = evaluate(...imports.map((imp) => (imp.id === -1 ? MUT : imp.id)));

  let scope = result.scope();
  let slot = Object.values(scope).indexOf(MUT);

  assert.ok(slot >= 0, 'the keyword has a scope slot');
  assert.true(
    JSON.stringify(result.block).includes(`[32,${slot}]`),
    'GetLexicalSymbol points at the slot'
  );
  assert.false(JSON.stringify(result.block).includes('[31,'), 'no GetStrictKeyword remains');
});
