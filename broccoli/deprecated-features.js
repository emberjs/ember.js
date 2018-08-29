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

// TODO: remove this, it is primarily just for testing if svelte is working...
function svelte(infile, outfile) {
  console.log(DEPRECATED_FEATURES); // eslint-disable-line no-console
  const babel = require('babel-core'); // eslint-disable-line node/no-extraneous-require

  let { code } = babel.transformFileSync(infile, {
    plugins: [
      [
        'debug-macros',
        {
          debugTools: {
            source: '@ember/debug',
            assertPredicateIndex: 1,
            isDebug: false,
          },
          svelte: {
            'ember-source': '3.3.0',
          },
          flags: [
            {
              source: '@glimmer/env',
              flags: { DEBUG: false },
            },
            {
              name: 'ember-source',
              source: '@ember/deprecated-features',
              flags: DEPRECATED_FEATURES,
            },
            {
              source: '@ember/canary-features',
              flags: {
                EMBER_METAL_TRACKED_PROPERTIES: true,
              },
            },
          ],
        },
      ],
    ],
  });

  code = babel.transform(code, {
    plugins: ['minify-dead-code-elimination'],
  }).code;

  fs.writeFileSync(outfile, code);
}

if (process.env.SVELTE_TEST) {
  svelte('dist/es/@ember/-internals/metal/lib/property_get.js', 'property_get.svelte.js');
  svelte('dist/es/@ember/-internals/metal/lib/property_set.js', 'property_set.svelte.js');
}
