import { assert } from 'ember-metal';
import calculateLocationDisplay from '../system/calculate-location-display';

export default function AssertReservedNamedArguments(options) {
  this.syntax = null;
  this.options = options;
}

AssertReservedNamedArguments.prototype.transform = function AssertReservedNamedArguments_transform(ast) {
  let moduleName = this.options.meta.moduleName;

  this.syntax.traverse(ast, {
    PathExpression(node) {
      if (node.original[0] === '@') {
        assert(assertMessage(moduleName, node));
      }
    }
  });

  return ast;
};

function assertMessage(moduleName, node) {
  let path = node.original;
  let source = calculateLocationDisplay(moduleName, node.loc);

  return `'${path}' is not a valid path. ${source}`;
}
