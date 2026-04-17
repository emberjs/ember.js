import type { ASTv1 } from '@glimmer/syntax';
import { preprocess as parse } from '@glimmer/syntax';

const { module, test } = QUnit;

module('[glimmer-syntax] Parser - whitespace control (tilde and standalone)', function () {
  // Tilde (whitespace stripping)

  test('tilde on mustache strips adjacent whitespace text nodes, which are then removed', (assert) => {
    const ast = parse('  {{~comment~}} ');
    assert.strictEqual(ast.body.length, 1, 'empty text nodes are removed after tilde stripping');
    assert.strictEqual(ast.body[0]?.type, 'MustacheStatement');
  });

  test('tilde on block open/close strips program body content', (assert) => {
    const ast = parse('x{{# comment~}} \nfoo\n {{~/comment}}y');
    const block = ast.body[1] as ASTv1.BlockStatement;
    assert.strictEqual((block.program.body[0] as ASTv1.TextNode).chars, 'foo');
  });

  // ignoreStandalone (parseWithoutProcessing equivalent)

  test('ignoreStandalone: tilde still strips adjacent text nodes', (assert) => {
    const ast = parse('  {{~comment~}} ', { parseOptions: { ignoreStandalone: true } });
    assert.strictEqual(
      ast.body.length,
      1,
      'tilde-stripped empty nodes are removed even without standalone detection'
    );
    assert.strictEqual(ast.body[0]?.type, 'MustacheStatement');
  });

  // Standalone block detection

  test('standalone block: surrounding whitespace text nodes are removed after stripping', (assert) => {
    const ast = parse(' {{#comment}} \nfoo\n {{/comment}} ');
    assert.strictEqual(ast.body.length, 1, 'surrounding empty text nodes are removed');
    const block = ast.body[0] as ASTv1.BlockStatement;
    assert.strictEqual((block.program.body[0] as ASTv1.TextNode).chars, 'foo\n');
  });

  test('standalone block with else: surrounding nodes removed, inner content standalone-stripped', (assert) => {
    const ast = parse(' {{#comment}} \nfoo\n {{else}} \n  bar \n  {{/comment}} ');
    assert.strictEqual(ast.body.length, 1);
    const block = ast.body[0] as ASTv1.BlockStatement;
    assert.strictEqual((block.program.body[0] as ASTv1.TextNode).chars, 'foo\n');
    assert.strictEqual(
      ((block.inverse as ASTv1.Block).body[0] as ASTv1.TextNode).chars,
      '  bar \n'
    );
  });

  test('standalone block at start of line: program body strips leading newline', (assert) => {
    const ast = parse('{{#comment}} \nfoo\n {{/comment}}');
    const block = ast.body[0] as ASTv1.BlockStatement;
    assert.strictEqual((block.program.body[0] as ASTv1.TextNode).chars, 'foo\n');
  });

  test('standalone block containing mustache: surrounding text is stripped and empty node removed', (assert) => {
    const ast = parse('{{#comment}} \n{{foo}}\n {{/comment}}');
    const block = ast.body[0] as ASTv1.BlockStatement;
    assert.strictEqual(block.program.body.length, 2);
    assert.strictEqual(block.program.body[0]?.type, 'MustacheStatement');
    assert.strictEqual((block.program.body[1] as ASTv1.TextNode).chars, '\n');
  });

  test('non-standalone block (inline): whitespace is NOT stripped', (assert) => {
    const ast = parse('{{#foo}} {{#comment}} \nfoo\n {{/comment}} {{/foo}}');
    const outerBlock = ast.body[0] as ASTv1.BlockStatement;
    const innerBlock = outerBlock.program.body[1] as ASTv1.BlockStatement;
    assert.strictEqual(innerBlock.type, 'BlockStatement');
    assert.strictEqual((innerBlock.program.body[0] as ASTv1.TextNode).chars, ' \nfoo\n ');
  });

  // Standalone comment detection

  test('standalone comment: trailing whitespace node is removed after stripping', (assert) => {
    const ast = parse('{{! comment }} ');
    assert.strictEqual(ast.body.length, 1);
    assert.strictEqual(ast.body[0]?.type, 'MustacheCommentStatement');
  });

  test('standalone comment: both surrounding text nodes are removed after stripping', (assert) => {
    const ast = parse('  {{! comment }} ');
    assert.strictEqual(ast.body.length, 1);
    assert.strictEqual(ast.body[0]?.type, 'MustacheCommentStatement');
  });

  // ignoreStandalone: standalone detection is skipped

  test('ignoreStandalone: standalone block is NOT stripped', (assert) => {
    const ast = parse('{{#comment}} \nfoo\n {{/comment}}', {
      parseOptions: { ignoreStandalone: true },
    });
    const block = ast.body[0] as ASTv1.BlockStatement;
    assert.strictEqual((block.program.body[0] as ASTv1.TextNode).chars, ' \nfoo\n ');
  });
});
