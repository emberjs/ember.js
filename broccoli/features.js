'use strict';

const fs = require('fs');
const ts = require('./typescript');

function getFeatures() {
  let fileName = 'packages/@ember/canary-features/index.ts';
  let fileContents = fs.readFileSync(fileName).toString();

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
