import { assert } from '@ember/debug';
import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';

export default function assertModifiersNotInComponents(env: ASTPluginEnvironment): ASTPlugin {
  let { moduleName } = env.meta;
  let scopes: string[][] = [];

  function isComponentInvocation(node: AST.ElementNode) {
    return (
      node.tag[0] === '@' ||
      node.tag[0].toUpperCase() === node.tag[0] ||
      node.tag.indexOf('.') > -1 ||
      scopes.some(params => params.some(p => p === node.tag))
    );
  }

  return {
    name: 'assert-modifiers-not-in-components',

    visitor: {
      Program: {
        enter(node: AST.Program) {
          scopes.push(node.blockParams);
        },

        exit() {
          scopes.pop();
        },
      },
      ElementNode: {
        keys: {
          children: {
            enter(node: AST.ElementNode) {
              scopes.push(node.blockParams);
            },

            exit() {
              scopes.pop();
            },
          },
        },
        enter(node: AST.ElementNode) {
          if (node.modifiers.length > 0 && isComponentInvocation(node)) {
            assert(
              `Passing modifiers to components require the "ember-glimmer-forward-modifiers-with-splattributes" canary feature, which has not been stabilized yet. See RFC #435 for details. ${calculateLocationDisplay(
                moduleName,
                node.loc
              )}`
            );
          }
        },
      },
    },
  };
}
