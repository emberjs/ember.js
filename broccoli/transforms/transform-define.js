'use strict';
/* eslint-env node */

function transformDefine(babel) {
  let { types: t } = babel;
  return {
    name: 'transform define',
    visitor: {
      Program: {
        exit(path) {
          let [expressionStatement] = path.node.body;

          if (
            t.isExpressionStatement(expressionStatement) &&
            t.isCallExpression(expressionStatement.expression) &&
            expressionStatement.expression.callee.name === 'define'
          ) {
            expressionStatement.expression.callee.name = 'enifed';
          }
        }
      }
    }
  }
}

transformDefine.baseDir = function() {
  return 'babel-plugin-transform-es2015-modules-amd';
}

module.exports = transformDefine;