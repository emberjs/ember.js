'use strict';

function injectBabelHelpers() {
  return {
    pre(file) {
      file.set('helperGenerator', function (name) {
        return file.addImport('ember-babel', name, name);
      });
    }
  };
}

injectBabelHelpers.baseDir = function() {
  return 'babel-core';
};

module.exports = injectBabelHelpers;
