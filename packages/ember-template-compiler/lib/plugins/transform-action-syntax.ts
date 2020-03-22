import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import { Builders } from '../types';
import { isPath } from './utils';

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

export default function transformActionSyntax({ syntax }: ASTPluginEnvironment): ASTPlugin {
  let { builders: b } = syntax;

  return {
    name: 'transform-action-syntax',

    visitor: {
      ElementModifierStatement(node: AST.ElementModifierStatement) {
        if (isAction(node)) {
          insertThisAsFirstParam(node, b);
        }
      },

      MustacheStatement(node: AST.MustacheStatement) {
        if (isAction(node)) {
          insertThisAsFirstParam(node, b);
        }
      },

      SubExpression(node: AST.SubExpression) {
        if (isAction(node)) {
          insertThisAsFirstParam(node, b);
        }
      },
    },
  };
}

function isAction(node: AST.ElementModifierStatement | AST.MustacheStatement | AST.SubExpression) {
  return isPath(node.path) && node.path.original === 'action';
}

function insertThisAsFirstParam(
  node: AST.ElementModifierStatement | AST.MustacheStatement | AST.SubExpression,
  builders: Builders
) {
  node.params.unshift(builders.path('this'));
}
