import { deprecate } from '@ember/debug';
import { AST, ASTPlugin } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';
import { EmberASTPluginEnvironment } from '../types';
import { isPath } from './utils';

/**
 @module ember
*/

/**
  A Glimmer2 AST transformation that replaces all instances of

  ```handlebars
 {{hasBlock}}
  ```

  with

  ```handlebars
 {{has-block}}
  ```

  @private
  @class TransformHasBlockSyntax
*/

const TRANSFORMATIONS: { [key: string]: string } = {
  hasBlock: 'has-block',
  hasBlockParams: 'has-block-params',
};

export default function transformHasBlockSyntax(env: EmberASTPluginEnvironment): ASTPlugin {
  let { builders: b } = env.syntax;
  let moduleName = env.meta?.moduleName;

  function emitDeprecationMessage(node: AST.Node, name: string) {
    let sourceInformation = calculateLocationDisplay(moduleName, node.loc);
    deprecate(
      `\`${name}\` is deprecated. Use \`${TRANSFORMATIONS[name]}\` instead. ${sourceInformation}`,
      false,
      {
        id: 'has-block-and-has-block-params',
        until: '4.0.0',
        url: 'https://deprecations.emberjs.com/v3.x#toc_has-block-and-has-block-params',
        for: 'ember-source',
        since: {
          enabled: '3.25.0',
        },
      }
    );
  }

  return {
    name: 'transform-has-block-syntax',

    visitor: {
      PathExpression(node: AST.PathExpression): AST.Node | void {
        if (TRANSFORMATIONS[node.original]) {
          emitDeprecationMessage(node, node.original);
          return b.sexpr(b.path(TRANSFORMATIONS[node.original]));
        }
      },
      MustacheStatement(node: AST.MustacheStatement): AST.Node | void {
        if (isPath(node.path) && TRANSFORMATIONS[node.path.original]) {
          emitDeprecationMessage(node, node.path.original);
          return b.mustache(
            b.path(TRANSFORMATIONS[node.path.original]),
            node.params,
            node.hash,
            undefined,
            node.loc
          );
        }
      },
      SubExpression(node: AST.SubExpression): AST.Node | void {
        if (isPath(node.path) && TRANSFORMATIONS[node.path.original]) {
          emitDeprecationMessage(node, node.path.original);
          return b.sexpr(b.path(TRANSFORMATIONS[node.path.original]), node.params, node.hash);
        }
      },
    },
  };
}
