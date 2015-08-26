import Ember from 'ember-metal/core';
import { assert } from 'ember-metal/debug';
import calculateLocationDisplay from 'ember-template-compiler/system/calculate-location-display';

function AssertNoViewHelper(options) {
  // set later within HTMLBars to the syntax package
  this.syntax = null;
  this.options = options || {};
}

/**
  @private
  @method transform
  @param {AST} ast The AST to be transformed.
*/
AssertNoViewHelper.prototype.transform = function AssertNoViewHelper_transform(ast) {
  if (!!Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT) {
    return ast;
  }
  var walker = new this.syntax.Walker();
  var moduleName = this.options && this.options.moduleName;

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }

    assertHelper(moduleName, node);
  });

  return ast;
};

function assertHelper(moduleName, node) {
  const paramValue = node.params.length && node.params[0].value;

  if (!paramValue) {
    return;
  } else {
    assert(
      `Using the \`{{view "string"}}\` helper is removed in 2.0. ${calculateLocationDisplay(moduleName, node.loc)}`,
      Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT,
      { id: 'view.helper', until: '2.0.0' }
    );
  }
}

function validate(node) {
  return (node.type === 'MustacheStatement' || node.type === 'BlockStatement') &&
    (node.path.parts[0] === 'view');
}

export default AssertNoViewHelper;
