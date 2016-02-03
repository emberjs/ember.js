import Ember from 'ember-metal/core';
import { assert } from 'ember-metal/debug';
import calculateLocationDisplay from 'ember-template-compiler/system/calculate-location-display';

function AssertNoEachIn(options = {}) {
  this.syntax = null;
  this.options = options;
}

AssertNoEachIn.prototype.transform = function AssertNoEachIn_transform(ast) {
  if (!!Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT) {
    return ast;
  }
  let walker = new this.syntax.Walker();
  let moduleName = this.options && this.options.moduleName;

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }
    assertHelper(moduleName, node);
  });

  return ast;
};

function assertHelper(moduleName, node) {
  let moduleInfo = calculateLocationDisplay(moduleName, node.loc);
  let singular = node.params[0].original;
  let plural = node.params[2].original;

  assert(`Using {{#each ${singular} in ${plural}}} ${moduleInfo}is no longer supported in Ember 2.0+, please use {{#each ${plural} as |${singular}|}}`);
}

function validate(node) {
  return (node.type === 'BlockStatement' || node.type === 'MustacheStatement') &&
    node.path.original === 'each' &&
    node.params.length === 3 &&
    node.params[1].type === 'PathExpression' &&
    node.params[1].original === 'in';
}

export default AssertNoEachIn;
