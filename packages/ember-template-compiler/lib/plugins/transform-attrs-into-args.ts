import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';

/**
 @module ember
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

export default function transformAttrsIntoArgs(env: ASTPluginEnvironment): ASTPlugin {
  let { builders: b } = env.syntax;

  let stack: string[][] = [[]];

  return {
    name: 'transform-attrs-into-args',

    visitor: {
      Program: {
        enter(node: AST.Program) {
          let parent = stack[stack.length - 1];
          stack.push(parent.concat(node.blockParams));
        },
        exit() {
          stack.pop();
        },
      },

      PathExpression(node: AST.PathExpression): AST.Node | void {
        if (isAttrs(node, stack[stack.length - 1])) {
          let path = b.path(node.original.substr(6)) as AST.PathExpression;
          path.original = `@${path.original}`;
          path.data = true;
          return path;
        }
      },
    },
  };
}

function isAttrs(node: AST.PathExpression, symbols: string[]) {
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
