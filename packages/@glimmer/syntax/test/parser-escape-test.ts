import type { ASTv1 } from '@glimmer/syntax';
import { builders as b, preprocess as parse } from '@glimmer/syntax';

import { element } from './parser-node-test';
import { astEqual } from './support';

const { module, test } = QUnit;

module('[glimmer-syntax] Parser - backslash escape sequences', function () {
  // k=1: \{{ → escape. Backslash consumed, {{content}} becomes literal text.
  test('\\{{ produces literal {{ in a TextNode', () => {
    astEqual('\\{{foo}}', b.template([b.text('{{foo}}')]));
  });

  test('\\{{ merges escaped content with following text (emu-state behaviour)', () => {
    astEqual('\\{{foo}} bar baz', b.template([b.text('{{foo}} bar baz')]));
  });

  test('text before \\{{ is emitted as a separate TextNode', () => {
    astEqual('prefix\\{{foo}} suffix', b.template([b.text('prefix'), b.text('{{foo}} suffix')]));
  });

  test('\\{{ followed by a real mustache stops the emu-state merge', () => {
    astEqual('\\{{foo}}{{bar}}', b.template([b.text('{{foo}}'), b.mustache(b.path('bar'))]));
  });

  test('emu-state merge stops at \\{{ (another escape)', () => {
    astEqual(
      '\\{{foo}} text \\{{bar}} done {{baz}}',
      b.template([b.text('{{foo}} text '), b.text('{{bar}} done '), b.mustache(b.path('baz'))])
    );
  });

  // k=2: \\{{ → real mustache, ONE literal backslash emitted as TextNode.
  test('\\\\{{ emits one literal backslash and a real mustache', () => {
    astEqual('\\\\{{foo}}', b.template([b.text('\\'), b.mustache(b.path('foo'))]));
  });

  // k=3: \\\{{ → real mustache, TWO literal backslashes emitted as TextNode.
  test('\\\\\\{{ emits two literal backslashes and a real mustache', () => {
    astEqual('\\\\\\{{foo}}', b.template([b.text('\\\\'), b.mustache(b.path('foo'))]));
  });

  test('full escaped.hbs sequence produces correct AST', () => {
    const input =
      'an escaped mustache:\n\\{{my-component}}\na non-escaped mustache:\n' +
      '\\\\{{my-component}}\nanother non-escaped mustache:\n\\\\\\{{my-component}}\n';
    astEqual(
      input,
      b.template([
        b.text('an escaped mustache:\n'),
        b.text('{{my-component}}\na non-escaped mustache:\n'),
        b.text('\\'),
        b.mustache(b.path('my-component')),
        b.text('\nanother non-escaped mustache:\n\\\\'),
        b.mustache(b.path('my-component')),
        b.text('\n'),
      ])
    );
  });

  // Inside HTML elements

  test('\\{{ in element text content produces literal {{', () => {
    astEqual('<div>\\{{foo}}</div>', b.template([element('div', ['body', b.text('{{foo}}')])]));
  });

  test('\\\\{{ in element text content produces one backslash + real mustache', () => {
    astEqual(
      '<div>\\\\{{foo}}</div>',
      b.template([element('div', ['body', b.text('\\'), b.mustache(b.path('foo'))])])
    );
  });

  // Inside quoted attribute values

  test('\\{{ inside a quoted attribute value emits {{ as literal text', (assert) => {
    const ast = parse('<div title="foo \\{{"></div>');
    const el = ast.body[0] as ASTv1.ElementNode;
    const attr = el.attributes[0] as ASTv1.AttrNode;
    const value = attr.value as ASTv1.TextNode;
    assert.strictEqual(value.chars, 'foo {{');
  });

  // Backslash NOT before {{ passes through unchanged

  test('plain backslash not before {{ is preserved in text', () => {
    astEqual('foo\\bar', b.template([b.text('foo\\bar')]));
  });

  test('double backslash not before {{ is preserved in text', () => {
    astEqual('foo\\\\bar', b.template([b.text('foo\\\\bar')]));
  });

  test('triple backslash not before {{ is preserved in text (backslashes.hbs)', () => {
    astEqual('<p>\\\\\\</p>', b.template([element('p', ['body', b.text('\\\\\\')])]));
  });

  test('triple backslash + \\\\{{ in element text (backslashes.hbs)', () => {
    astEqual(
      '<p>\\\\\\ \\\\{{foo}}</p>',
      b.template([element('p', ['body', b.text('\\\\\\ \\'), b.mustache(b.path('foo'))])])
    );
  });

  test('plain backslash in attribute value is preserved (backslashes-in-attributes.hbs)', (assert) => {
    const ast = parse('<p data-attr="backslash \\\\ in an attribute"></p>');
    const attr = (ast.body[0] as ASTv1.ElementNode).attributes[0] as ASTv1.AttrNode;
    assert.strictEqual((attr.value as ASTv1.TextNode).chars, 'backslash \\\\ in an attribute');
  });

  test('\\{{ in quoted class attribute value (mustache.hbs)', (assert) => {
    const ast = parse('<div class=" bar \\{{"></div>');
    const attr = (ast.body[0] as ASTv1.ElementNode).attributes[0] as ASTv1.AttrNode;
    assert.strictEqual((attr.value as ASTv1.TextNode).chars, ' bar {{');
  });

  // Unclosed escape

  test('\\{{ without closing }} emits {{ and following text up to end', () => {
    astEqual('\\{{ unclosed', b.template([b.text('{{ unclosed')]));
  });

  test('\\{{ without closing }} stops at < (HTML element boundary)', () => {
    astEqual(
      '<div>\\{{ unclosed</div>',
      b.template([element('div', ['body', b.text('{{ unclosed')])])
    );
  });
});
