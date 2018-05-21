/* eslint-env node */
'use strict';
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const babel = require('babel-core');

/**
 * @param name {string}
 * @param source {string}
 */
function getFeatures(name, source) {
  let fileName = path.join(__dirname, 'packages', source, 'index.ts');
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
  return {
    name,
    source,
    flags,
  };
}

/**
 * @param d {ts.VariableStatement}
 * @param map {{[flag: string]: string}}
 */
function handleExportedDeclaration(d, map) {
  let declaration = d.declarationList.declarations[0];
  /** @type {ts.StringLiteral} */
  let initializer = declaration.initializer;
  if (initializer && initializer.kind === ts.SyntaxKind.StringLiteral) {
    map[declaration.name.text] = initializer.text;
  }
}

function svelte(infile, outfile, deprecatedFeatures) {
  let { code } = babel.transformFileSync(infile, {
    plugins: [
      [
        'debug-macros',
        {
          debugTools: {
            source: '@ember/debug',
            assertPredicateIndex: 1,
          },
          envFlags: {
            source: '@glimmer/env',
            flags: { DEBUG: false },
          },
          svelte: {
            'ember-source': '3.3.0',
          },
          features: [
            deprecatedFeatures,
            {
              name: 'ember',
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

let deprecatedFeatures = getFeatures('ember-source', '@ember/deprecated-features');
console.log(deprecatedFeatures);

svelte('dist/es/ember-metal/lib/property_get.js', 'property_get.svelte.js', deprecatedFeatures);
svelte('dist/es/ember-metal/lib/property_set.js', 'property_set.svelte.js', deprecatedFeatures);
