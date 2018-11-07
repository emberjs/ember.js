'use strict';

const WriteFile = require('broccoli-file-creator');
const { stripIndent } = require('common-tags');

function sideeffects(moduleExport) {
  return `requireModule('${moduleExport}')`;
}

function umd(moduleExport) {
  return `(function (m) { if (typeof module === "object" && module.exports) { module.exports = m } }(requireModule('${moduleExport}')));\n`;
}

function testing() {
  return stripIndent`
    var testing = requireModule('ember-testing');
    Ember.Test = testing.Test;
    Ember.Test.Adapter = testing.Adapter;
    Ember.Test.QUnitAdapter = testing.QUnitAdapter;
    Ember.setupForTesting = testing.setupForTesting;
  `;
}

function empty() {
  return '';
}

module.exports = function bootstrapModule(type, moduleExport) {
  let moduleType = {
    empty,
    sideeffects,
    testing,
    umd,
  };

  return new WriteFile('bootstrap', moduleType[type](moduleExport));
};
