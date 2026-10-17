// The syntax covered in this file is inherited from Handlebars. It is kept for
// compatibility with existing templates and is not to be extended or relied on
// in new code.

import type { ASTv1 } from '@glimmer/syntax';
import { builders as b, preprocess as parse } from '@glimmer/syntax';

import { astEqual } from './support';

const { test } = QUnit;

function onlyStatement<T extends ASTv1.Statement>(source: string): T {
  let { body } = parse(source);
  QUnit.assert.strictEqual(body.length, 1, `${source} parses to one statement`);
  return body[0] as T;
}

function inverseOf(block: ASTv1.BlockStatement): ASTv1.Block {
  if (!block.inverse) {
    throw new Error('expected an inverse block');
  }
  return block.inverse;
}

function textOf(nodes: ASTv1.Statement[]): string[] {
  return nodes.map((n) => (n.type === 'TextNode' ? n.chars : `<${n.type}>`));
}

QUnit.module('Inherited from Handlebars (legacy behavior): {{&foo}} trusting mustache');

test('{{&foo}} is the same as {{{foo}}}', (assert) => {
  let amp = onlyStatement<ASTv1.MustacheStatement>('{{&foo}}');
  assert.true(amp.trusting);

  astEqual('{{&foo}}', '{{{foo}}}');
  astEqual('{{&foo}}', b.template([b.mustache(b.path('foo'), [], b.hash(), true)]));
});

test('{{&foo}} accepts params and hash like any mustache', () => {
  astEqual(
    '{{&foo "a" k=1}}',
    b.template([
      b.mustache(b.path('foo'), [b.string('a')], b.hash([b.pair('k', b.number(1))]), true),
    ])
  );
});

QUnit.module('Inherited from Handlebars (legacy behavior): {{^}} as {{else}}');

test('{{^}} produces the same block as {{else}}', () => {
  astEqual('{{#if a}}A{{^}}B{{/if}}', '{{#if a}}A{{else}}B{{/if}}');
  astEqual(
    '{{#if a}}A{{^}}B{{/if}}',
    b.template([
      b.block(
        b.path('if'),
        [b.path('a')],
        b.hash(),
        b.blockItself([b.text('A')]),
        b.blockItself([b.text('B')])
      ),
    ])
  );
});

QUnit.module('Inherited from Handlebars (legacy behavior): {{^foo}} inverse block opener');

// {{^foo}}...{{else}}...{{/foo}} is not meant to be supported going forward. These tests only
// document what the parser does today.
test('{{^foo}}a{{else}}b{{/foo}} swaps the program and the inverse', (assert) => {
  let swapped = onlyStatement<ASTv1.BlockStatement>('{{^foo bar}}a{{else}}b{{/foo}}');
  assert.deepEqual(textOf(swapped.program.body), ['b']);
  assert.deepEqual(textOf(inverseOf(swapped).body), ['a']);

  astEqual('{{^foo bar}}a{{else}}b{{/foo}}', '{{#foo bar}}b{{else}}a{{/foo}}');
});

test('{{^foo}} without {{else}} is a syntax error', (assert) => {
  assert.throws(() => parse('{{^foo}}a{{/foo}}'), /Inverse sections .* are not supported/);
});

QUnit.module('Inherited from Handlebars (legacy behavior): raw blocks');

test('a raw block is an ordinary block whose body is text', (assert) => {
  let block = onlyStatement<ASTv1.BlockStatement>('{{{{raw}}}}a {{x}} b{{{{/raw}}}}');
  assert.strictEqual((block.path as ASTv1.PathExpression).original, 'raw');
  assert.deepEqual(textOf(block.program.body), ['a {{x}} b']);
  assert.strictEqual(block.inverse, null);
});

test('a raw block takes params and a hash', (assert) => {
  let block = onlyStatement<ASTv1.BlockStatement>('{{{{raw 1 k=2}}}}x{{{{/raw}}}}');
  assert.strictEqual(block.params.length, 1);
  assert.strictEqual((block.params[0] as ASTv1.NumberLiteral).value, 1);
  assert.strictEqual(block.hash.pairs[0]?.key, 'k');
  assert.deepEqual(textOf(block.program.body), ['x']);
});

test('mustaches inside a raw block stay text, but HTML is still parsed', (assert) => {
  let block = onlyStatement<ASTv1.BlockStatement>('{{{{raw}}}}<b>{{x}}</b>{{{{/raw}}}}');
  let [el] = block.program.body as [ASTv1.ElementNode];
  assert.strictEqual(el.type, 'ElementNode');
  assert.strictEqual(el.tag, 'b');
  assert.deepEqual(textOf(el.children), ['{{x}}']);
});
