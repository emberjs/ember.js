import hashPairForKey from '../system/hash-pair-for-key';

/**
 @module ember
 @submodule ember-glimmer
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
 <button {{action 'foo' target=this}}>
 <button onblur={{action 'foo' target=this}}>
 <button onblur={{action (action 'foo' target=this) 'bar' target=this}}>
  ```

  If an action already has a target it is left unmodified.

  @private
  @class TransformActionSyntax
*/

export default function TransformActionSyntax() {
  // set later within Glimmer2 to the syntax package
  this.syntax = null;
}

/**
  @private
  @method transform
  @param {AST} ast The AST to be transformed.
*/
TransformActionSyntax.prototype.transform = function TransformActionSyntax_transform(ast) {
  let { traverse, builders: b } = this.syntax;

  traverse(ast, {
    ElementModifierStatement(node) {
      if (isAction(node)) {
        ensureTarget(node, b);
      }
    },
    MustacheStatement(node) {
      if (isAction(node)) {
        ensureTarget(node, b);
      }
    },
    SubExpression(node) {
      if (isAction(node)) {
        ensureTarget(node, b);
      }
    }
  });

  return ast;
};

function isAction(node) {
  return node.path.original === 'action';
}

function ensureTarget(node, builders) {
  if (!hashPairForKey(node.hash, 'target')) {
    let thisTarget = builders.pair('target', builders.path('this'));
    node.hash.pairs.push(thisTarget);
  }
}
