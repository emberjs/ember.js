var TapReporter = require('testem/lib/reporters/tap_reporter');

function FailureOnlyReporter() {
  TapReporter.apply(this, arguments);
  this._reportCount = 0;
}

FailureOnlyReporter.prototype = Object.create(TapReporter.prototype);
FailureOnlyReporter.prototype.constructor = FailureOnlyReporter;

FailureOnlyReporter.prototype.display = function(prefix, result) {
  this._reportCount++;

  if (!result.passed) {
    TapReporter.prototype.display.apply(this, arguments);
  }

  if (this._reportCount > 100) {
    this.out.write('pass count: ' + this.pass);
    this._reportCount = 0;
  }
};

module.exports = {
  framework: 'qunit',
  test_page: 'dist/tests/index.html?hidepassed&hideskipped&timeout=60000',
  timeout: 540,
  parallel: 1,
  disable_watching: true,
  launch_in_dev: [
    'Firefox',
    'Chrome'
  ],
  launch_in_ci: [
    'Firefox',
    'Chrome'
  ],
  reporter: new FailureOnlyReporter()
};
