const Rollup = require('broccoli-rollup');
const writeFile = require('broccoli-file-creator');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');

module.exports = function polyfills() {
  let polyfillEntry = writeFile('polyfill-entry.js', 'require("core-js/modules/es6.symbol");');

  return new Rollup(polyfillEntry, {
    rollup: {
      input: 'polyfill-entry.js',
      output: {
        file: 'polyfill.js',
        name: 'polyfill',
        format: 'iife',
      },
      plugins: [resolve(), commonjs()],
    },
  });
};
