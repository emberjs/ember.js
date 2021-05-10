import { deprecate } from '@ember/debug';
import { AST, ASTPlugin } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';
import { EmberASTPluginEnvironment } from '../types';

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

export default function transformAttrsIntoArgs(env: EmberASTPluginEnvironment): ASTPlugin {
  let { builders: b } = env.syntax;
  let moduleName = env.meta?.moduleName;

  let stack: string[][] = [[]];

  function updateBlockParamsStack(blockParams: string[]) {
    let parent = stack[stack.length - 1];
    stack.push(parent.concat(blockParams));
  }

  return {
    name: 'transform-attrs-into-args',

    visitor: {
      Program: {
        enter(node: AST.Program) {
          updateBlockParamsStack(node.blockParams);
        },
        exit() {
          stack.pop();
        },
      },

      ElementNode: {
        enter(node: AST.ElementNode) {
          updateBlockParamsStack(node.blockParams);
        },
        exit() {
          stack.pop();
        },
      },

      PathExpression(node: AST.PathExpression): AST.Node | void {
        if (isAttrs(node, stack[stack.length - 1])) {
          let path = b.path(node.original.substr(6)) as AST.PathExpression;

          deprecate(
            `Using {{attrs}} to reference named arguments has been deprecated. {{attrs.${
              path.original
            }}} should be updated to {{@${path.original}}}. ${calculateLocationDisplay(
              moduleName,
              node.loc
            )}`,
            false,
            {
              id: 'attrs-arg-access',
              url: 'https://deprecations.emberjs.com/v3.x/#toc_attrs-arg-access',
              until: '4.0.0',
              for: 'ember-source',
              since: {
                enabled: '3.26.0',
              },
            }
          );

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
