'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('./typescript');

/**
 * @param name {string}
 * @param source {string}
 */
const DEPRECATED_FEATURES = (function getFeatures() {
  let fileName = path.join(
    __dirname,
    '..',
    'packages',
    '@ember',
    'deprecated-features',
    'index.ts'
  );
  let contents = fs.readFileSync(fileName, 'utf8');
  let sourceFile = ts.createSourceFile(fileName, contents, ts.ScriptTarget.ES2017);
  let flags = {};

  sourceFile.statements.forEach(statement => {
    if (
      statement.kind === ts.SyntaxKind.VariableStatement &&
      statement.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      handleExportedDeclaration(statement, flags);
    }
  });

  return flags;
})();

/**
 * @param d {ts.VariableStatement}
 * @param map {{[flag: string]: string}}
 */
function handleExportedDeclaration(d, map) {
  let declaration = d.declarationList.declarations[0];
  /** @type {ts.StringLiteral} */
  let initializer = declaration.initializer;
  if (
    initializer &&
    initializer.kind === ts.SyntaxKind.PrefixUnaryExpression &&
    initializer.operand.kind === ts.SyntaxKind.PrefixUnaryExpression &&
    initializer.operand.operand.kind === ts.SyntaxKind.StringLiteral
  ) {
    map[declaration.name.text] = initializer.operand.operand.text;
  }
}

module.exports = DEPRECATED_FEATURES;
