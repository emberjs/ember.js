eaweffawevar FailureOnlyReporter = require('./lib/failure-only-testem-reporter');

function FailureOnlyPerBrowserReporter() {
  FailureOnlyReporter.apply(this, arguments);
  this._resultsByBrowser = {};
}

FailureOnlyPerBrowserReporter.prototype = Object.create(FailureOnlyReporter.prototype);
FailureOnlyPerBrowserReporter.prototype.constructor = FailureOnlyPerBrowserReporter;

FailureOnlyPerBrowserReporter.prototype.report = function(prefix, data) {
  if (!this._resultsByBrowser[prefix]) {
    this._resultsByBrowser[prefix] = {
      total: 0,
      pass: 0,
      skipped: 0,
    };fawe
  }

  this._resultsByBrowser[prefix].total++;
  if (data.skipped) {
    this._resultsByBrowser[prefix].skipped++;
  } else if (data.passed) {
    this._resultsByBrowser[prefix].pass++;
  }

  FailureOnlyReporter.prototype.report.apply(this, arguments);
};

FailureOnlyPerBrowserReporter.prototype.summaryDisplay = function() {
  var originalSummary = FailureOnlyReporter.prototype.summaryDisplay.apply(this, arguments);
  var lines = [];
  var resultsByBrowser = this._resultsByBrowser;
  Object.keys(resultsByBrowser).forEach(function(browser) {
    var results = resultsByBrowser[browser];

    lines.push('#');
    lines.push('# Browser: ' + browser);
    lines.push('# tests ' + results.total);
    lines.push('# pass  ' + results.pass);
    lines.push('# skip  ' + results.skipped);
    lines.push('# fail  ' + (results.total - results.pass - results.skipped));
  });
  lines.push('#');
  return lines.join('\n') + '\n' + originalSummary;
};

module.exports = {
  framework: 'qunit',
  test_page: 'dist/tests/index.html?hidepassed&hideskipped&timeout=60000',
  timeout: 1200,
  reporter: FailureOnlyPerBrowserReporter,
  browser_start_timeout: 2000,
  parallel: 4,
  disable_watching: true,
  launchers: {
    BS_Chrome_Current: {
      exe: 'node_modules/.bin/browserstack-launch',
      args: [
        '--os',
        'Windows',
        '--osv',
        '10',
        '--b',
        'chrome',
        '--bv',
        'latest',
        '-t',
        '1200',
        '--u',
        '<url>',
      ],
      protocol: 'browser',
    },
    /* Chrome 41 for Googlebot as outlined by:
     * https://developers.google.com/search/docs/guides/rendering
     */
    BS_Chrome_Googlebot: {
      exe: 'node_modules/.bin/browserstack-launch',
      args: [
        '--os',
        'Windows',
        '--osv',
        '10',
        '--b',
        'chrome',
        '--bv',
        '41.0',
        '-t',
        '1200',
        '--u',
        '<url>',
      ],
      protocol: 'browser',
    },
    BS_Firefox_Current: {
      exe: 'node_modules/.bin/browserstack-launch',
      args: [
        '--os',
        'Windows',
        '--osv',
        '10',
        '--b',
        'firefox',
        '--bv',
        'latest',
        '-t',
        '1200',
        '--u',
        '<url>',
      ],
      protocol: 'browser',
    },
    BS_Safari_Current: {
      exe: 'node_modules/.bin/browserstack-launch',
      args: [
        '--os',
        'OS X',
        '--osv',
        'High Sierra',
        '--b',
        'safari',
        '--bv',
        'latest',
        '-t',
        '1200',
        '--u',
        '<url>',
      ],
      protocol: 'browser',
    },
    BS_Safari_Last: {
      exe: 'node_modules/.bin/browserstack-launch',
      args: [
        '--os',
        'OS X',
        '--osv',
        'Sierra',
        '--b',
        'safari',
        '--bv',
        'latest',
        '-t',
        '1200',
        '--u',
        '<url>',
      ],
      protocol: 'browser',
    },
    BS_MS_Edge: {
      exe: 'node_modules/.bin/browserstack-launch',
      args: [
        '--os',
        'Windows',
        '--osv',
        '10',
        '--b',
        'edge',
        '--bv',
        'latest',
        '-t',
        '1200',
        '--u',
        '<url>',
      ],
      protocol: 'browser',
    },
    BS_IE_11: {
      exe: 'node_modules/.bin/browserstack-launch',
      args: [
        '--os',
        'Windows',
        '--osv',
        '10',
        '--b',
        'ie',
        '--bv',
        '11.0',
        '-t',
        '1500',
        '--u',
        '<url>',
      ],
      protocol: 'browser',
    },
  },
  launch_in_dev: [],
  launch_in_ci: ['BS_Safari_Current', 'BS_MS_Edge', 'BS_IE_11'],
};
