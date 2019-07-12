const Rollup = require('broccoli-rollup');
const BroccoliDebug = require('broccoli-debug');
const Funnel = require('broccoli-funnel');
const path = require('path');

const debugTree = BroccoliDebug.buildDebugCallback('ember-source');

module.exports = function rollupPackage(packagesES, name) {
  // this prevents broccoli-rollup from "seeing" changes in
  // its input that are unrelated to what we are building
  // and therefore noop on rebuilds...
  let rollupRestrictedInput = new Funnel(packagesES, {
    srcDir: name,
    destDir: name,
  });

  rollupRestrictedInput = debugTree(rollupRestrictedInput, `rollup-package:${name}:input`);

  let output = new Rollup(rollupRestrictedInput, {
    annotation: `rollup ${name}`,
    rollup: {
      input: `${name}/index.js`,
      external(importee, importer) {
        // importer of null/undefined means entry module
        if (!importer) {
          return false;
        }

        // import is relative initially, then expanded to absolute
        // when resolveId is called. this checks for either...
        if (importee[0] === '.' || path.isAbsolute(importee)) {
          return false;
        }

        return true;
      },
      output: {
        file: `${name}/index.js`,
        format: 'es',
        exports: 'named',
      },
    },
  });

  return debugTree(output, `rollup-package:${name}:output`);
};
