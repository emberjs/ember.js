g'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {
  input: 'dist/es/ember/index.js',
  plugins: [emberPackage()],
  output: {
    file: 'rollup-bundle.es.js',
    format: 'iife',
    name: '__Ember',
    named: true,
    sourcemap: true,
  },
};

function emberPackage() {
  return {
    resolveId(importee, importer) {
      if (importee[0] === '.' || importee[0] === '/') return;
      let resolved = [
        path.resolve('dist', `es/${importee}.js`),
        path.resolve('dist', `es/${importee}/index.js`),
      ].find(fs.existsSync);
      if (resolved) {
        // console.log('resolved ' + resolved);
        return fs.realpathSync(resolved);
      } else {
        // eslint-disable-next-line no-console
        console.log('could not resolve ' + importee + ' from ' + importer);
      }
    },
  };
}
