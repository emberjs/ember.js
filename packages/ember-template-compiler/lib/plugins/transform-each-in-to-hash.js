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
  {{#each items keyword="item"}}
  {{/each}}
  ```

  @class TransformEachInToHash
  @private
*/
function TransformEachInToHash(options) {
  // set later within HTMLBars to the syntax package
  this.syntax = null;
  this.options = options || {};
}

/**
  @private
  @method transform
  @param {AST} The AST to be transformed.
*/
TransformEachInToHash.prototype.transform = function TransformEachInToHash_transform(ast) {
  var pluginContext = this;
  var walker = new pluginContext.syntax.Walker();
  var b = pluginContext.syntax.builders;

  walker.visit(ast, function(node) {
    if (pluginContext.validate(node)) {

      if (node.program && node.program.blockParams.length) {
        throw new Error('You cannot use keyword (`{{each foo in bar}}`) and block params (`{{each bar as |foo|}}`) at the same time.');
      }

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
};

TransformEachInToHash.prototype.validate = function TransformEachInToHash_validate(node) {
  return (node.type === 'BlockStatement' || node.type === 'MustacheStatement') &&
    node.sexpr.path.original === 'each' &&
    node.sexpr.params.length === 3 &&
    node.sexpr.params[1].type === 'PathExpression' &&
    node.sexpr.params[1].original === 'in';
};

export default TransformEachInToHash;
