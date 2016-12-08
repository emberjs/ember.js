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
 {{@foo.bar}}
  ```

  as well as `{{#if attrs.foo}}`, `{{deeply (nested attrs.foobar.baz)}}` etc

  @private
  @class TransformAttrsToProps
*/

export default function TransformAttrsToProps() {
  // set later within Glimmer2 to the syntax package
  this.syntax = null;
}

function isAttrs(node) {
  if (node.parts[0] === 'attrs') {
    return true;
  }

  let _this = node.parts[0];
  let attrs = node.parts[1];

  if (_this === null && attrs === 'attrs') {
    node.parts.shift();
    node.original = node.original.slice(5);
    return true;
  }
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
      if (isAttrs(node)) {
        let path = b.path(node.original.substr(6));
        path.original = `@${path.original}`;
        path.data = true;
        return path;
      }
    }
  });

  return ast;
};
