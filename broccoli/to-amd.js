/* eslint-env node */

const { moduleResolve } = require('amd-name-resolver');
const Babel = require('broccoli-babel-transpiler');
const Concat = require('broccoli-concat');

const options = {
  moduleIds: true,
  resolveModuleSource: moduleResolve,
  plugins: [
    function (opts) {
      let t = opts.types;
      return {
        pre(file) {
          file.set("helperGenerator", function (name) {
            if (name === 'interopRequireDefault') {
              // goes into a call expression
              return t.functionExpression(null, [
                t.identifier('m')
              ], t.blockStatement([
                t.returnStatement(t.identifier('m'))
              ]));
            }
          });
        }
      };
    },
    'transform-es2015-modules-amd']
}

class AMDBabel extends Babel {
  constructor() {
    super(...arguments);
    this._annotation = 'packages named AMD';
  }
  cacheKey() {
    let key = super.cacheKey();
    return `${key}-ember-amd-babel`;
  }
}

module.exports = function toAMD(esTree, outputFile) {
  let babel = new AMDBabel(esTree, options);
  return new Concat(babel, {
    outputFile: outputFile
  })
}