'use strict';

const resolve = require('resolve');
const fs = require('fs');
const path = require('path');

function getFeatures() {
  let fileName = 'packages/@ember/canary-features/index.ts';
  let fileContents = fs.readFileSync(fileName).toString();

  // our typescript version comes from a dependency in
  // broccoli-typescript-compiler, so we look typescript up
  // from there...
  let broccoliTypescriptCompilerRoot = path.dirname(
    resolve.sync('broccoli-typescript-compiler/package.json'),
    { basedir: __dirname }
  );
  let typescriptEntryPoint = resolve.sync('typescript', {
    basedir: broccoliTypescriptCompilerRoot,
  });

  let ts = require(typescriptEntryPoint);
  let sourceFile = ts.createSourceFile(
    fileName,
    fileContents,
    ts.ScriptTarget.ES2017,
    /*setParentNodes */ true
  );

  let features;

  ts.forEachChild(sourceFile, processVariableDeclarations);

  function processVariableDeclarations(node) {
    if (node.kind === ts.SyntaxKind.VariableDeclaration && node.name.text === 'DEFAULT_FEATURES') {
      let featuresText = node.initializer.getFullText();
      features = new Function(`return ${featuresText}`)();
      return;
    }

    ts.forEachChild(node, processVariableDeclarations);
  }

  let featureName;

  if (process.env.BUILD_TYPE === 'alpha') {
    for (featureName in features) {
      if (features[featureName] === null) {
        features[featureName] = false;
      }
    }
  }

  if (process.env.OVERRIDE_FEATURES) {
    var forcedFeatures = process.env.OVERRIDE_FEATURES.split(',');
    for (var i = 0; i < forcedFeatures.length; i++) {
      featureName = forcedFeatures[i];

      features[featureName] = true;
    }
  }

  return features;
}

module.exports = getFeatures();
