import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';

/**
 @module ember
*/

/**
  A Glimmer2 AST transformation that replaces all instances of

  ```handlebars
   <button {{log 'foo'}}>
   <button onclick={{log 'foo'}}>
   <button onclick={{action (log 'foo') 'bar'}}>
  ```

  with

  ```handlebars
   <button {{action (-log-action 'foo')}}>
   <button onclick={{-log-action 'foo'}}>
   <button onclick={{action (-log-action this 'foo') 'bar'}}>
  ```

  @private
  @class TransformLogAction
*/

export default function transformLogActionSyntax({ syntax }: ASTPluginEnvironment): ASTPlugin {
  let { builders: b } = syntax;

  return {
    name: 'transform-log-action-syntax',

    visitor: {
      ElementModifierStatement(node: AST.ElementModifierStatement) {
        if (isLog(node)) {
          node.path.original = 'action';
          node.path.parts = ['action'];
          let originalParams = node.params;
          node.params = [b.sexpr(b.path('-log-action'), originalParams)];
        }
      },

      AttrNode(node: AST.AttrNode) {
        if (node.value.type === 'MustacheStatement' && isLog(node.value)) {
          renameNode(node.value);
        }
      },

      SubExpression(node: AST.SubExpression) {
        if (isLog(node)) {
          renameNode(node);
        }
      },
    },
  };
}

function isLog(node: AST.SubExpression | AST.MustacheStatement | AST.ElementModifierStatement) {
  return node.path.original === 'log';
}

function renameNode(node: AST.SubExpression | AST.MustacheStatement) {
  node.path.original = '-log-action';
}
