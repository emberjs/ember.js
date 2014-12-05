import Walker from "htmlbars-syntax/walker";
import b from "htmlbars-syntax/builders";

/**
  An HTMLBars AST transformation that replaces all instances of

  ```handlebars
  {{#with foo.bar as bar}}
  {{/with}}
  ```

  with

  ```handlebars
  {{#with foo.bar keywordName="bar"}}
  {{/with}}
  ```

  @private
  @param {AST} The AST to be transformed.
*/
export default function(ast) {
  var walker = new Walker();

  walker.visit(ast, function(node) {
    if (validate(node)) {
      var removedParams = node.sexpr.params.splice(1, 2);
      var keyword = removedParams[1].original;

      // TODO: This may not be necessary.
      if (!node.sexpr.hash) {
        node.sexpr.hash = b.hash();
      }

      node.sexpr.hash.pairs.push(b.pair(
        'keywordName',
        b.string(keyword)
      ));
    }
  });

  return ast;
}

function validate(node) {
  return node.type === 'BlockStatement' &&
    node.sexpr.path.original === 'with' &&
    node.sexpr.params.length === 3 &&
    node.sexpr.params[1].type === 'PathExpression' &&
    node.sexpr.params[1].original === 'as';
}
