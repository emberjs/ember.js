'use strict';

const fs = require('fs');
const path = require('path');
const walkSync = require('walk-sync');

let entryPoints = walkSync('dist/es', { directories: false })
  .filter(path => path.startsWith('@ember') && path.endsWith('.js'))
  .map(ep => ep.slice(0, -3));

let entryPointMapping = {};
entryPoints.forEach(ep => (entryPointMapping[ep] = ep));

module.exports = {
  input: {
    ...entryPointMapping,
    'ember-template-compiler': 'ember-template-compiler/index',
    'ember.debug': 'ember/index',
  },
  plugins: [emberPackage()],

  experimentalCodeSplitting: true,
  output: {
    dir: 'rollup-dist',
    format: 'es',
    sourcemap: true,
    chunkNames: '@ember/-private/[hash].js',
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
