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
    } else {
      this.ui.writeLine("Couldn't determine test style - using QUnit");
      type = 'qunit';
    }

    return path.join(this.path, type + '-files');
  };

  return blueprint;
};
