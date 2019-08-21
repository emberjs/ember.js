'use strict';

const { addNamed } = require('@babel/helper-module-imports');

function injectBabelHelpers(isEmberSource = false) {
  function injectBabelHelpersPlugin() {
    return {
      pre(file) {
        file.set('helperGenerator', function(name) {
          if (name === 'extends') {
            return addNamed(file.path, 'assign', '@ember/polyfills');
          } else if (isEmberSource && name === 'asyncToGenerator') {
            // Returning a falsy value will cause the helper to be inlined,
            // which is fine for local tests
            return false;
          }

          return addNamed(file.path, name, 'ember-babel');
        });
      },
    };
  }

  injectBabelHelpersPlugin.baseDir = function() {
    return 'babel-core';
  };

  return injectBabelHelpersPlugin;
}

module.exports = injectBabelHelpers;
