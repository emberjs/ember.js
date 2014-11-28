import { preprocess } from '../htmlbars-compiler/parser';
import Walker from '../htmlbars-compiler/walker';

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
    'program',
    'element',
    'element'
  ]);
});

test('walks blocks', function() {
  compareWalkedNodes('{{#foo}}<li></li>{{/foo}}', [
    'program',
    'text',
    'block',
    'program',
    'element',
    'text'
  ]);
});

test('walks components', function() {
  compareWalkedNodes('<my-foo><li></li></my-foo>', [
    'program',
    'text',
    'component',
    'program',
    'element',
    'text'
  ]);
});
