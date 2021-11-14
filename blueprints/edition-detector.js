'use strict';

const { has } = require('@ember/edition-utils');
const path = require('path');

module.exports = function (blueprint) {
  blueprint.filesPath = function () {
    let rootPath = has('octane') ? 'native-files' : 'files';
    return path.join(this.path, rootPath);
  };

  return blueprint;
};
