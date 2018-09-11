'use strict';

const { addNamed } = require('@babel/helper-module-imports');

function injectBabelHelpers() {
  return {
    pre(file) {
      // TODO: FIX THIS BEFORE LANDING
      //file.set('helperGenerator', function(name) {
      //  if (name === 'extends') {
      //    return file.addImport('@ember/polyfills', 'assign', name);
      //  }
      //  return file.addImport('ember-babel', name, name);
      //});
    },
  };
}

injectBabelHelpers.baseDir = function() {
  return 'babel-core';
};

module.exports = injectBabelHelpers;
