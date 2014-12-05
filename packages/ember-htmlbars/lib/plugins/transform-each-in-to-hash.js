import Walker from "htmlbars-syntax/walker";
import b from "htmlbars-syntax/builders";

/**
  An HTMLBars AST transformation that replaces all instances of

  ```handlebars
  {{#each item in items}}
  {{/each}}
  ```

  with

  ```handlebars
  {{#each items keyword="item"}}
  {{/each}}
  ```

  @private
  @param {AST} The AST to be transformed.
*/
export default function(ast) {
  var walker = new Walker();

  walker.visit(ast, function(node) {
    if (validate(node)) {
      var removedParams = node.sexpr.params.splice(0, 2);
      var keyword = removedParams[0].original;

      // TODO: This may not be necessary.
      if (!node.sexpr.hash) {
        node.sexpr.hash = b.hash();
      }

      node.sexpr.hash.pairs.push(b.pair(
        'keyword',
        b.string(keyword)
      ));
    }
  });

  return ast;
}

function validate(node) {
  return (node.type === 'BlockStatement' || node.type === 'MustacheStatement') &&
    node.sexpr.path.original === 'each' &&
    node.sexpr.params.length === 3 &&
    node.sexpr.params[1].type === 'PathExpression' &&
    node.sexpr.params[1].original === 'in';
}
