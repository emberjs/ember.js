'use strict';

let TapReporter = require('testem/lib/reporters/tap_reporter');

/**
 * In order to reduce the noise in CI test output, we only want to report test failures
 * see: https://github.com/testem/testem/blob/master/lib/reporters/tap_reporter.js
 *
 * @class FailureOnlyReporter
 */
class FailureOnlyReporter extends TapReporter {
  constructor(silent, out, config) {
    super(silent, out, config);
    this._reportCount = 0;
  }

  display(prefix, result) {
    this._reportCount++;

    if (!result.passed) {
      super.display(prefix, result);
    }

    if (this._reportCount > 100) {
      this.out.write('pass count: ' + this.pass);
      this.out.write('\n');
      this._reportCount = 0;
    }
  }
}

module.exports = FailureOnlyReporter;
