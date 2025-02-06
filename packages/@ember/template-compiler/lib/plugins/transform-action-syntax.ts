import type { AST, ASTPlugin } from '@glimmer/ember/syntax';
import type { Builders, EmberASTPluginEnvironment } from '../types';
import { isPath, trackLocals } from './utils';

/**
 @module ember
*/

/**
  A Glimmer2 AST transformation that replaces all instances of

  ```handlebars
 <button {{action 'foo'}}>
 <button onblur={{action 'foo'}}>
 <button onblur={{action (action 'foo') 'bar'}}>
  ```

  with

  ```handlebars
 <button {{action this 'foo'}}>
 <button onblur={{action this 'foo'}}>
 <button onblur={{action this (action this 'foo') 'bar'}}>
  ```

  @private
  @class TransformActionSyntax
*/

export default function transformActionSyntax(env: EmberASTPluginEnvironment): ASTPlugin {
  let { builders: b } = env.syntax;
  let { hasLocal, visitor } = trackLocals(env);

  return {
    name: 'transform-action-syntax',

    visitor: {
      ...visitor,
      ElementModifierStatement(node: AST.ElementModifierStatement) {
        if (isAction(node, hasLocal)) {
          insertThisAsFirstParam(node, b);
        }
      },

      MustacheStatement(node: AST.MustacheStatement) {
        if (isAction(node, hasLocal)) {
          insertThisAsFirstParam(node, b);
        }
      },

      SubExpression(node: AST.SubExpression) {
        if (isAction(node, hasLocal)) {
          insertThisAsFirstParam(node, b);
        }
      },
    },
  };
}

function isAction(
  node: AST.ElementModifierStatement | AST.MustacheStatement | AST.SubExpression,
  hasLocal: (k: string) => boolean
) {
  return isPath(node.path) && node.path.original === 'action' && !hasLocal('action');
}

function insertThisAsFirstParam(
  node: AST.ElementModifierStatement | AST.MustacheStatement | AST.SubExpression,
  builders: Builders
) {
  node.params.unshift(builders.path('this'));
}
