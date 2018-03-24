import * as fs from 'fs';
import * as path from 'path';

export default {
  input: 'dist/ember/index.js',
  plugins: [emberPackage()],
  output: {
    file: 'rollup-bundle.es.js',
    format: 'iife',
    name: '__Ember',
    named: true,
    sourcemap: true
  }
};

function emberPackage() {
  return {
    resolveId(importee, importer) {
      if (importee[0] === '.' || importee[0] === '/') return;
      let resolved = [
        path.resolve('dist', `${importee}.js`),
        path.resolve('dist', `${importee}/index.js`)
      ].find(fs.existsSync);
      if (resolved) {
        // console.log('resolved ' + resolved);
        return fs.realpathSync(resolved);
      } else {
        console.log('could not resolve ' + importee + ' from ' + importer);
      }
    }
  };
}
