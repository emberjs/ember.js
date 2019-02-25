'use strict';

const fs = require('fs');
const path = require('path');
const VersionChecker = require('ember-cli-version-checker');

module.exports = function(blueprint) {
  blueprint.supportsAddon = function() {
    return false;
  };

  blueprint.filesPath = function() {
    let type;

    let dependencies = this.project.dependencies();
    if ('ember-qunit' in dependencies) {
      type = 'qunit-rfc-232';
    } else if ('ember-cli-qunit' in dependencies) {
      let checker = new VersionChecker(this.project);
      if (
        fs.existsSync(this.path + '/qunit-rfc-232-files') &&
        checker.for('ember-cli-qunit', 'npm').gte('4.2.0')
      ) {
        type = 'qunit-rfc-232';
      } else {
        type = 'qunit';
      }
    } else if ('ember-mocha' in dependencies) {
      let checker = new VersionChecker(this.project);
      if (
        fs.existsSync(this.path + '/mocha-rfc-232-files') &&
        checker.for('ember-mocha', 'npm').gte('0.14.0')
      ) {
        type = 'mocha-rfc-232';
      } else {
        type = 'mocha-0.12';
      }
    } else if ('ember-cli-mocha' in dependencies) {
      let checker = new VersionChecker(this.project);
      if (
        fs.existsSync(this.path + '/mocha-0.12-files') &&
        checker.for('ember-cli-mocha', 'npm').gte('0.12.0')
      ) {
        type = 'mocha-0.12';
      } else {
        type = 'mocha';
      }
    } else {
      this.ui.writeLine("Couldn't determine test style - using QUnit");
      type = 'qunit';
    }

    return path.join(this.path, type + '-files');
  };

  return blueprint;
};
