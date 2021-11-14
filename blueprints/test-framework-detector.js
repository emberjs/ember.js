'use strict';

const fs = require('fs');
const path = require('path');
const VersionChecker = require('ember-cli-version-checker');

module.exports = function (blueprint) {
  blueprint.supportsAddon = function () {
    return false;
  };

  blueprint.filesPath = function () {
    let type;
    const qunitRfcVersion = 'qunit-rfc-232';
    const mochaRfcVersion = 'mocha-rfc-232';
    const mochaVersion = 'mocha-0.12';

    let dependencies = this.project.dependencies();
    if ('ember-qunit' in dependencies) {
      type = qunitRfcVersion;
    } else if ('ember-cli-qunit' in dependencies) {
      let checker = new VersionChecker(this.project);
      if (
        fs.existsSync(`${this.path}/${qunitRfcVersion}-files`) &&
        checker.for('ember-cli-qunit', 'npm').gte('4.2.0')
      ) {
        type = qunitRfcVersion;
      } else {
        type = 'qunit';
      }
    } else if ('ember-mocha' in dependencies) {
      let checker = new VersionChecker(this.project);
      if (
        fs.existsSync(`${this.path}/${mochaRfcVersion}-files`) &&
        checker.for('ember-mocha', 'npm').gte('0.14.0')
      ) {
        type = mochaRfcVersion;
      } else {
        type = mochaVersion;
      }
    } else if ('ember-cli-mocha' in dependencies) {
      let checker = new VersionChecker(this.project);
      if (
        fs.existsSync(`${this.path}/${mochaVersion}-files`) &&
        checker.for('ember-cli-mocha', 'npm').gte('0.12.0')
      ) {
        type = mochaVersion;
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
