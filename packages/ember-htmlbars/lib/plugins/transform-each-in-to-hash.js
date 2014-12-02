import Walker from "htmlbars-compiler/walker";

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
      var stringNode = {
        type: 'StringLiteral',
        value: keyword,
        original: keyword
      };

      if (!node.sexpr.hash) {
        node.sexpr.hash = {
          type: 'Hash',
          pairs: []
        };
      }

      var hashPair = {
        type: 'HashPair',
        key: 'keyword',
        value: stringNode
      };

      node.sexpr.hash.pairs.push(hashPair);
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
