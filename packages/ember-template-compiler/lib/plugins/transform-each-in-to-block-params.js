/**
@module ember
@submodule ember-htmlbars
*/


/**
  An HTMLBars AST transformation that replaces all instances of

  ```handlebars
  {{#each item in items}}
  {{/each}}
  ```

  with

  ```handlebars
  {{#each items as |item|}}
  {{/each}}
  ```

  @class TransformEachInToBlockParams
  @private
*/
function TransformEachInToBlockParams() {
  // set later within HTMLBars to the syntax package
  this.syntax = null;
}

/**
  @private
  @method transform
  @param {AST} The AST to be transformed.
*/
TransformEachInToBlockParams.prototype.transform = function TransformEachInToBlockParams_transform(ast) {
  var b = this.syntax.builders;
  var walker = new this.syntax.Walker();

  walker.visit(ast, function(node) {
    if (validate(node)) {

      var removedParams = node.sexpr.params.splice(0, 2);
      var keyword = removedParams[0].original;

      if (node.type === 'BlockStatement') {
        if (node.program.blockParams.length) {
          throw new Error('You cannot use keyword (`{{each foo in bar}}`) and block params (`{{each bar as |foo|}}`) at the same time.');
        }

        node.program.blockParams = [keyword];
      } else {
        node.sexpr.hash.pairs.push(b.pair(
          'keyword',
          b.string(keyword)
        ));
      }

    }
  });

  return ast;
};

function validate(node) {
  return (node.type === 'BlockStatement' || node.type === 'MustacheStatement') &&
    node.sexpr.path.original === 'each' &&
    node.sexpr.params.length === 3 &&
    node.sexpr.params[1].type === 'PathExpression' &&
    node.sexpr.params[1].original === 'in';
}

export default TransformEachInToBlockParams;
