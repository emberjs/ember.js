import { assert, deprecate } from '@ember/debug';
import type { AST, ASTPlugin } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';
import type { EmberASTPluginEnvironment } from '../types';

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
      Template: {
        enter(node: AST.Template) {
          updateBlockParamsStack(node.blockParams);
        },
        exit() {
          stack.pop();
        },
      },

      Block: {
        enter(node: AST.Block) {
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
          assert(
            `Using {{attrs}} to reference named arguments is not supported. {{${
              node.original
            }}} should be updated to {{@${node.original.slice(6)}}}. ${calculateLocationDisplay(
              moduleName,
              node.loc
            )}`
          );
        } else if (isThisDotAttrs(node)) {
          // When removing this, ensure `{{this.attrs.foo}}` is left as-is, without triggering
          // any assertions/deprecations. It's perfectly legal to reference `{{this.attrs.foo}}`
          // in the template since it is a real property on the backing class – it will give you
          // a `MutableCell` wrapper object, but maybe that's what you want. And in any case,
          // there is no compelling to special case that property access.
          deprecate(
            `Using {{this.attrs}} to reference named arguments has been deprecated. {{${
              node.original
            }}} should be updated to {{@${node.original.slice(11)}}}. ${calculateLocationDisplay(
              moduleName,
              node.loc
            )}`,
            false,
            {
              id: 'attrs-arg-access',
              url: 'https://deprecations.emberjs.com/v3.x/#toc_attrs-arg-access',
              until: '6.0.0',
              for: 'ember-source',
              since: {
                available: '3.26.0',
                enabled: '3.26.0',
              },
            }
          );

          return b.path(`@${node.original.slice(11)}`, node.loc);
        }
      },
    },
  };
}

function isAttrs(node: AST.PathExpression, symbols: string[]) {
  return (
    node.head.type === 'VarHead' &&
    node.head.name === 'attrs' &&
    symbols.indexOf(node.head.name) === -1
  );
}

function isThisDotAttrs(node: AST.PathExpression) {
  return node.head.type === 'ThisHead' && node.tail[0] === 'attrs';
}
