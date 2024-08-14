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
  test_page: 'index.html',
  cwd: 'dist',
  timeout: 1200,
  parallel: 4,
  disable_watching: true,
  launch_in_dev: [],
  reporter: FailureOnlyPerBrowserReporter,
  browser_start_timeout: 2000,
  browser_disconnect_timeout: 120,
  launchers: BrowserStackLaunchers,
  launch_in_ci: Object.keys(BrowserStackLaunchers),
};
