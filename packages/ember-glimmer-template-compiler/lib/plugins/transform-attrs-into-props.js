/**
 @module ember
 @submodule ember-glimmer
*/

/**
  A Glimmer2 AST transformation that replaces all instances of

  ```handlebars
 {{attrs.foo.bar}}
  ```

  to

  ```handlebars
 {{foo.bar}}
  ```

  as well as `{{#if attrs.foo}}`, `{{deeply (nested attrs.foobar.baz)}}` etc

  @private
  @class TransformAttrsToProps
*/

export default function TransformAttrsToProps() {
  // set later within Glimmer2 to the syntax package
  this.syntax = null;
}

/**
  @private
  @method transform
  @param {AST} ast The AST to be transformed.
*/
TransformAttrsToProps.prototype.transform = function TransformAttrsToProps_transform(ast) {
  let { traverse, builders: b } = this.syntax;

  traverse(ast, {
    PathExpression(node) {
      if (node.parts[0] === 'attrs') {
        return b.path(node.original.substr(6));
      }
    }
  });

  return ast;
};
