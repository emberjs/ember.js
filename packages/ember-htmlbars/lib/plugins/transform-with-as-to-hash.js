import Walker from "htmlbars-compiler/walker";

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
      var stringNode = {
        type: 'STRING',
        string: keyword,
        stringModeValue: keyword,
        original: keyword
      };

      if (!node.sexpr.hash) {
        node.sexpr.hash = {
          type: 'hash',
          pairs: []
        };
      }

      node.sexpr.hash.pairs.push(['keywordName', stringNode]);
    }
  });

  return ast;
}

function validate(node) {
  return node.type === 'block' &&
    node.sexpr.id.original === 'with' &&
    node.sexpr.params.length === 3 &&
    node.sexpr.params[1].type === 'ID' &&
    node.sexpr.params[1].original === 'as';
}
