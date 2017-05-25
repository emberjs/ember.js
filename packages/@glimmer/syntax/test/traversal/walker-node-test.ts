import { preprocess as parse, Walker } from "@glimmer/syntax";

function compareWalkedNodes(html: string, expected: string[]) {
  let ast = parse(html);
  let walker = new Walker();
  let nodes: string[] = [];

  walker.visit(ast, function(node) {
    nodes.push(node.type);
  });

  QUnit.assert.deepEqual(nodes, expected);
}

QUnit.module('[glimmer-syntax] (Legacy) Traversal - Walker');

QUnit.test('walks elements', function() {
  compareWalkedNodes('<div><li></li></div>', [
    'Program',
    'ElementNode',
    'ElementNode'
  ]);
});

QUnit.test('walks blocks', function() {
  compareWalkedNodes('{{#foo}}<li></li>{{/foo}}', [
    'Program',
    'BlockStatement',
    'Program',
    'ElementNode'
  ]);
});
