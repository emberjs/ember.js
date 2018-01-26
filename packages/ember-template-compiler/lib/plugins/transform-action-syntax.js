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

export default function transformActionSyntax({ syntax }) {
  let { builders: b } = syntax;

  return {
    name: 'transform-action-syntax',

    visitor: {
      ElementModifierStatement(node) {
        if (isAction(node)) {
          insertThisAsFirstParam(node, b);
        }
      },

      MustacheStatement(node) {
        if (isAction(node)) {
          insertThisAsFirstParam(node, b);
        }
      },

      SubExpression(node) {
        if (isAction(node)) {
          insertThisAsFirstParam(node, b);
        }
      }
    }
  };
}

function isAction(node) {
  return node.path.original === 'action';
}

function insertThisAsFirstParam(node, builders) {
  node.params.unshift(builders.path('this'));
}
