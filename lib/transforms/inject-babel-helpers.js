'use strict';

const { addNamed } = require('@babel/helper-module-imports');

function injectBabelHelpers(isEmberSource = false) {
  let helperplugin = injectBabelHelpersPlugin;
  helperplugin._parallelBabel = {
    requireFile: __filename,
    buildUsing: 'injectBabelHelpersPlugin',
    params: { isEmberSource },
  };

  helperplugin.baseDir = function () {
    return 'babel-core';
  };

  return helperplugin;
}

function injectBabelHelpersPlugin(isEmberSource) {
  return {
    pre(file) {
      file.set('helperGenerator', function (name) {
        if (isEmberSource && name === 'asyncToGenerator') {
          // Returning a falsy value will cause the helper to be inlined,
          // which is fine for local tests
          return false;
        }

        return addNamed(file.path, name, 'ember-babel');
      });
    },
  };
}

module.exports = {
  injectBabelHelpers,
  injectBabelHelpersPlugin,
};
