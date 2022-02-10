import { assert } from '@ember/debug';
import { AST, ASTPlugin } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';
import { EmberASTPluginEnvironment } from '../types';

/**
 @module ember
*/

/**
  A Glimmer2 AST transformation that asserts against

  ```handlebars
  {{attrs.foo.bar}}
  ```

  ...as well as `{{#if attrs.foo}}`, `{{deeply (nested attrs.foobar.baz)}}`.

  @private
  @class AssertAgainstAttrs
*/

export default function assertAgainstAttrs(env: EmberASTPluginEnvironment): ASTPlugin {
  let { builders: b } = env.syntax;
  let moduleName = env.meta?.moduleName;

  let stack: string[][] = [[]];

  function updateBlockParamsStack(blockParams: string[]) {
    let parent = stack[stack.length - 1];
    assert('has parent', parent);
    stack.push(parent.concat(blockParams));
  }

  return {
    name: 'assert-against-attrs',

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
        if (isAttrs(node, stack[stack.length - 1]!)) {
          let path = b.path(node.original.substr(6));

          assert(
            `Using {{attrs}} to reference named arguments is not supported. {{attrs.${
              path.original
            }}} should be updated to {{@${path.original}}}. ${calculateLocationDisplay(
              moduleName,
              node.loc
            )}`,
            node.this !== false
          );
        }
      },
    },
  };
}

function isAttrs(node: AST.PathExpression, symbols: string[]) {
  let name = node.parts[0];

  if (name && symbols.indexOf(name) !== -1) {
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
