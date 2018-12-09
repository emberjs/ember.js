const FailureOnlyReporter = require('./failure-only-reporter');

class FailureOnlyPerBrowserReporter extends FailureOnlyReporter {
  constructor(...args) {
    super(...args);
    this._resultsByBrowser = {};
  }

  report(prefix, data) {
    if (!this._resultsByBrowser[prefix]) {
      this._resultsByBrowser[prefix] = {
        total: 0,
        pass: 0,
        skipped: 0,
      };
    }

    this._resultsByBrowser[prefix].total++;
    if (data.skipped) {
      this._resultsByBrowser[prefix].skipped++;
    } else if (data.passed) {
      this._resultsByBrowser[prefix].pass++;
    }

    super.report(prefix, data);
  }

  summaryDisplay() {
    let originalSummary = super.summaryDisplay();
    let lines = [];
    let resultsByBrowser = this._resultsByBrowser;
    Object.keys(resultsByBrowser).forEach(function(browser) {
      let results = resultsByBrowser[browser];

      lines.push('#');
      lines.push('# Browser: ' + browser);
      lines.push('# tests ' + results.total);
      lines.push('# pass  ' + results.pass);
      lines.push('# skip  ' + results.skipped);
      lines.push('# fail  ' + (results.total - results.pass - results.skipped));
    });
    lines.push('#');
    return lines.join('\n') + '\n' + originalSummary;
  }
}

module.exports = FailureOnlyPerBrowserReporter;
