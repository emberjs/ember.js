const path = require('path');
const fs = require('fs');

/**
 * @param {string} dist
 * @returns {import('rollup').Plugin}
 */
module.exports = function benchmark(dist) {
  return {
    resolveId(id) {
      if (id === '@glimmer/env') {
        return '\0@glimmer/env';
      }
      if (id.startsWith('@glimmer')) {
        return path.resolve(dist, id, 'dist/modules/es2017/index.js');
      }
      if (id.startsWith('@simple-dom')) {
        const packageId = `${id}/package`;
        const packageDir = path.dirname(require.resolve(packageId));
        return path.resolve(packageDir, require(packageId).module);
      }
      return undefined;
    },
    load(id) {
      if (id === '\0@glimmer/env') {
        return `export const DEBUG = false;`;
      }
      /** @type {string | undefined} */
      let result;
      if (id.endsWith('.hbs')) {
        const source = fs.readFileSync(id, 'utf8');
        const compiled = compilerForDist(dist).precompile(source);
        result = `export default ${compiled};`;
      }
      return result;
    },
  };
};

/**
 * @param {string} dist
 * @returns {import('@glimmer/compiler')}
 */
function compilerForDist(dist) {
  return require(path.resolve(`${dist}/@glimmer/compiler`));
}
