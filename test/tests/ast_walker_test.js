import { preprocess } from "htmlbars/parser";
import { walkTree } from "htmlbars/compiler/ast_walker";

module("walkTree");

test("visits ast depth-first in reverse order", function () {
  var ast = preprocess('A{{#if}}B{{#block}}C{{/block}}{{#block}}D{{/block}}{{else}}E{{#block}}F{{/block}}{{/if}}');
  var stack = [];
  walkTree(ast, function (ast, childCount) {
    var children = [];
    while (childCount--) children.push(stack.pop());
    var name = ast.length > 0 ? ast[0] : 'empty';
    if (children.length > 0) {
      name += ' ('+children.join(' ')+')';
    }
    stack.push(name);
  });

  equal(stack.pop(), "A (B (C empty D empty) E (F empty))");
});
