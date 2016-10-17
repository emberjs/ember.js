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
 <button {{action this 'foo'}}>
 <button onblur={{action this 'foo'}}>
 <button onblur={{action this (action this 'foo') 'bar'}}>
  ```

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
  });

  return ast;
};

function isAction(node) {
  return node.path.original === 'action';
}

function insertThisAsFirstParam(node, builders) {
  let contextPath = builders.path('this');
  let target = hashPairForKey(node.hash, 'target');
  if (target) {
    contextPath = target.value;
    removeFromHash(node.hash, target);
  }
  node.params.unshift(contextPath);
}

function hashPairForKey(hash, key) {
  for (let i = 0; i < hash.pairs.length; i++) {
    let pair = hash.pairs[i];
    if (pair.key === key) {
      return pair;
    }
  }

  return false;
}

function removeFromHash(hash, pairToRemove) {
  let newPairs = [];
  for (let i = 0; i < hash.pairs.length; i++) {
    let pair = hash.pairs[i];

    if (pair !== pairToRemove) {
      newPairs.push(pair);
    }
  }

  hash.pairs = newPairs;
}
