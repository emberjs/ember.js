const FailureOnlyPerBrowserReporter = require('testem-failure-only-reporter/grouped-by-browser');

const BrowserStackLaunchers = {
  BS_Safari_12: {
    exe: 'node_modules/.bin/browserstack-launch',
    args: [
      '--os',
      'OS X',
      '--osv',
      'Mojave',
      '--b',
      'safari',
      '--bv',
      'latest', // Will always be 12.x on Mojave
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
      '110',
      '-t',
      '1200',
      '--u',
      '<url>',
    ],
    protocol: 'browser',
  },
  BS_MS_Chrome: {
    exe: 'node_modules/.bin/browserstack-launch',
    args: [
      '--os',
      'Windows',
      '--osv',
      '11',
      '--b',
      'Chrome',
      '--bv',
      '103',
      '-t',
      '1200',
      '--u',
      '<url>',
    ],
    protocol: 'browser',
  },
};

module.exports = {
  test_page: 'dist/tests/index.html?hidepassed&hideskipped&timeout=60000',
  timeout: 1200,
  reporter: FailureOnlyPerBrowserReporter,
  browser_start_timeout: 2000,
  browser_disconnect_timeout: 120,
  parallel: 4,
  disable_watching: true,
  launchers: BrowserStackLaunchers,
  launch_in_dev: [],
  launch_in_ci: Object.keys(BrowserStackLaunchers),
};
