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

  as well as `{{#if attrs.foo}}`, `{{deeply (nested attrs.foobar.baz)}}`,
  `{{this.attrs.foo}}` etc

  @private
  @class TransformAttrsToProps
*/

export default function TransformAttrsToProps() {
  // set later within Glimmer2 to the syntax package
  this.syntax = null;
}

function isAttrs(node, symbols) {
  let name = node.parts[0];

  if (symbols.indexOf(name) !== -1) {
    return false;
  }

  if (name === 'attrs') {
    if (node.this === true) {
      node.parts.shift();
      node.original = node.original.slice(5);
    }

    return true;
  }

  return false;
}

/**
  @private
  @method transform
  @param {AST} ast The AST to be transformed.
*/
TransformAttrsToProps.prototype.transform = function TransformAttrsToProps_transform(ast) {
  let { traverse, builders: b } = this.syntax;

  let stack = [[]];

  traverse(ast, {
    Program: {
      enter(node) {
        let parent = stack[stack.length - 1];
        stack.push(parent.concat(node.blockParams));
      },
      exit(node) {
        stack.pop();
      }
    },

    PathExpression(node) {
      if (isAttrs(node, stack[stack.length - 1])) {
        let path = b.path(node.original.substr(6));
        path.original = `@${path.original}`;
        path.data = true;
        return path;
      }
    }
  });

  return ast;
};
