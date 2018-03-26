import * as fs from 'fs';
import * as path from 'path';

export default {
  input: [
    'dist/es/@ember/application.js',
    'dist/es/@ember/component.js',
    'dist/es/ember-template-compiler/index.js',
    'dist/es/ember/index.js',
  ],
  plugins: [emberPackage()],

  experimentalCodeSplitting: true,
  output: {
    dir: 'rollup-dist',
    format: 'es',
    sourcemap: true
  }
};

function emberPackage() {
  return {
    resolveId(importee, importer) {
      if (importee[0] === '.' || importee[0] === '/') return;
      let resolved = [
        path.resolve('dist', `es/${importee}.js`),
        path.resolve('dist', `es/${importee}/index.js`)
      ].find(fs.existsSync);
      if (resolved) {
        // console.log('resolved ' + resolved);
        return fs.realpathSync(resolved);
      } else {
        // eslint-disable-next-line no-console
        console.log('could not resolve ' + importee + ' from ' + importer);
      }
    }
  };
}
