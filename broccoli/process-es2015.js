/* eslint-env node */

const Babel = require('broccoli-babel-transpiler');

const es2015Options = {
  plugins: [
    function (opts) {
      let t = opts.types;
      return {
        pre(file) {
          file.set("helperGenerator", function (name) {
            return file.addImport(`ember-babel`, name, name);
          });
        }
      };
    },
    ['transform-es2015-template-literals', {loose: true}],
    ['transform-es2015-arrow-functions'],
    ['transform-es2015-destructuring', {loose: true}],
    ['transform-es2015-spread', {loose: true}],
    ['transform-es2015-parameters'],
    ['transform-es2015-computed-properties', {loose: true}],
    ['transform-es2015-shorthand-properties'],
    ['transform-es2015-block-scoping'],
    ['check-es2015-constants'],
    ['transform-es2015-classes', {loose: true}],
    ['transform-proto-to-assign']
  ]
}


class BabelES2015 extends Babel {
  constructor() {
    super(...arguments);
    this._annotation = 'packages processed ES2015';
  }
  cacheKey() {
    let key = super.cacheKey();
    return `${key}-ember-es2015-babel`;
  }
}

module.exports = function toES2015(tree) {
  return new BabelES2015(tree);
}