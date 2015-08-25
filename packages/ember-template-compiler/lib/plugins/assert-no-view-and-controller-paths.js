import Ember from 'ember-metal/core';
import { assert } from 'ember-metal/debug';
import calculateLocationDisplay from 'ember-template-compiler/system/calculate-location-display';

function AssertNoViewAndControllerPaths(options) {
  // set later within HTMLBars to the syntax package
  this.syntax = null;
  this.options = options || {};
}

/**
  @private
  @method transform
  @param {AST} ast The AST to be transformed.
*/
AssertNoViewAndControllerPaths.prototype.transform = function AssertNoViewAndControllerPaths_transform(ast) {
  var walker = new this.syntax.Walker();
  var moduleName = this.options && this.options.moduleName;

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }

    assertPath(moduleName, node, node.path);
    assertPaths(moduleName, node, node.params);
    assertHash(moduleName, node, node.hash);
  });

  return ast;
};

function assertHash(moduleName, node, hash) {
  if (!hash || !hash.pairs) {
    return;
  }
  var i, l, pair, paths;
  for (i = 0, l = hash.pairs.length;i < l;i++) {
    pair = hash.pairs[i];
    paths = pair.value.params;
    assertPaths(moduleName, pair, paths);
  }
}

function assertPaths(moduleName, node, paths) {
  if (!paths) {
    return;
  }
  var i, l, path;
  for (i = 0, l = paths.length;i < l;i++) {
    path = paths[i];
    assertPath(moduleName, node, path);
  }
}

function assertPath(moduleName, node, path) {
  assert(
    `Using \`{{${path && path.type === 'PathExpression' && path.parts[0]}}}\` or any path based on it ${calculateLocationDisplay(moduleName, node.loc)}has been removed in Ember 2.0`,
    function assertPath_test() {
      let noAssertion = true;

      const viewKeyword = path && path.type === 'PathExpression' && path.parts && path.parts[0];
      if (viewKeyword === 'view') {
        noAssertion = Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT;
      } else if (viewKeyword === 'controller') {
        noAssertion = Ember.ENV._ENABLE_LEGACY_CONTROLLER_SUPPORT;
      }

      return noAssertion;
    }, {
      id: (path.parts && path.parts[0] === 'view' ? 'view.keyword.view' : 'view.keyword.controller'),
      until: '2.0.0'
    }
  );
}

function validate(node) {
  return node.type === 'MustacheStatement' || node.type === 'BlockStatement';
}

export default AssertNoViewAndControllerPaths;
