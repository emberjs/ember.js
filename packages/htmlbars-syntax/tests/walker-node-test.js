import { preprocess } from '../htmlbars-syntax/parser';
import Walker from '../htmlbars-syntax/walker';

function compareWalkedNodes(html, expected) {
  var ast = preprocess(html);
  var walker = new Walker();
  var nodes = [];

  walker.visit(ast, function(node) {
    nodes.push(node.type);
  });

  deepEqual(nodes, expected);
}

QUnit.module('AST Walker');

test('walks elements', function() {
  compareWalkedNodes('<div><li></li></div>', [
    'Program',
    'ElementNode',
    'ElementNode'
  ]);
});

test('walks blocks', function() {
  compareWalkedNodes('{{#foo}}<li></li>{{/foo}}', [
    'Program',
    'BlockStatement',
    'Program',
    'ElementNode'
  ]);
});

test('walks components', function() {
  compareWalkedNodes('<my-foo><li></li></my-foo>', [
    'Program',
    'ComponentNode',
    'Program',
    'ElementNode'
  ]);
});
