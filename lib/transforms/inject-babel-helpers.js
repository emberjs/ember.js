'use strict';

const { addNamed } = require('@babel/helper-module-imports');

function injectBabelHelpers() {
  return {
    pre(file) {
      file.set('helperGenerator', function(name) {
        if (name === 'extends') {
          return addNamed(file.path, 'assign', '@ember/polyfills');
        }
        return addNamed(file.path, name, 'ember-babel');
      });
    },
  };
}

injectBabelHelpers.baseDir = function() {
  return 'babel-core';
};

module.exports = injectBabelHelpers;
