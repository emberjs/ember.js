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
    this.out.write('pass count: ' + this.pass + '\n');
    this._reportCount = 0;
  }
};

module.exports = FailureOnlyReporter;
