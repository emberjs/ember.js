'use strict';
/* eslint-env node */

const Funnel = require('broccoli-funnel');
const semver = require('semver');

module.exports = function addon(name, project) {
  let addon = project.findAddonByName(name);
  let tree = addon.treeFor('addon');
  let options = {};

  if (semver.lt(project.emberCLIVersion(), '2.13.0')) {
    options.srcDir = 'modules';
  }

  return new Funnel(tree, options);
}