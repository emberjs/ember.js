'use strict';
/* eslint-env node */

const WriteFile = require('broccoli-file-creator');

function defaultExport(moduleExport) {
  return `(function (m) { if (typeof module === "object" && module.exports) { module.exports = m } }(requireModule('${moduleExport}').default));\n`
}

function sideeffects(moduleExport) {
  return `requireModule('${moduleExport}')`
}

function umd(moduleExport) {
  return `(function (m) { if (typeof module === "object" && module.exports) { module.exports = m } }(requireModule('${moduleExport}')));\n`
}

module.exports = function bootstrapModule(moduleExport, type = 'sideeffects') {
  let moduleType = {
    default: defaultExport,
    umd,
    sideeffects
  }

  return new WriteFile('bootstrap', moduleType[type](moduleExport));
}