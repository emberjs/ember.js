/**
@module ember
@submodule ember-htmlbars
*/

/**
  An HTMLBars AST transformation that replaces all instances of

  ```handlebars
  {{#with foo.bar as bar}}
  {{/with}}
  ```

  with

  ```handlebars
  {{#with foo.bar as |bar|}}
  {{/with}}
  ```

  @private
  @class TransformWithAsToHash
*/
function TransformWithAsToHash() {
  // set later within HTMLBars to the syntax package
  this.syntax = null;
}

/**
  @private
  @method transform
  @param {AST} The AST to be transformed.
*/
TransformWithAsToHash.prototype.transform = function TransformWithAsToHash_transform(ast) {
  var pluginContext = this;
  var walker = new pluginContext.syntax.Walker();

  walker.visit(ast, function(node) {
    if (pluginContext.validate(node)) {

      if (node.program && node.program.blockParams.length) {
        throw new Error('You cannot use keyword (`{{with foo as bar}}`) and block params (`{{with foo as |bar|}}`) at the same time.');
      }

      Ember.deprecate(
        "Using {{with}} without block syntax is deprecated. " +
        "Please use standard block form (`{{#with foo as |bar|}}`) instead.",
        false,
        { url: "http://emberjs.com/deprecations/v1.x/#toc_code-as-code-sytnax-for-code-with-code" }
      );

      var removedParams = node.sexpr.params.splice(1, 2);
      var keyword = removedParams[1].original;
      node.program.blockParams = [keyword];
    }
  });

  return ast;
};

TransformWithAsToHash.prototype.validate = function TransformWithAsToHash_validate(node) {
  return node.type === 'BlockStatement' &&
    node.sexpr.path.original === 'with' &&
    node.sexpr.params.length === 3 &&
    node.sexpr.params[1].type === 'PathExpression' &&
    node.sexpr.params[1].original === 'as';
};

export default TransformWithAsToHash;
