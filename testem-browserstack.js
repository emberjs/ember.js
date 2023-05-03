/* eslint-disable @typescript-eslint/naming-convention */

'use strict';

const FailureOnlyReporterGroupedByBrowser = require('testem-failure-only-reporter/grouped-by-browser');

const BrowserStackLaunchers = {
  BS_Safari_12: {
    exe: 'node_modules/.bin/browserstack-launch',
    args: [
      '--os',
      'OS X',
      '--osv',
      'Monterey',
      '--b',
      'safari',
      '--bv',
      // Will always be 15.x on Monterey (14.x is at 0.1%)
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
      // 109 is at 0.12%, 110 is at 2.1%
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
      // 103 is at 0.36%
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
  browser_start_timeout: 2000,
  browser_disconnect_timeout: 120,
  parallel: 4,
  disable_watching: true,
  launchers: BrowserStackLaunchers,
  framework: 'qunit',
  socket_heartbeat_timeout: 600,
  socket_server_options: {
    upgradeTimeout: 30000,
  },
  reporter: FailureOnlyReporterGroupedByBrowser,
  launch_in_dev: [],
  launch_in_ci: Object.keys(BrowserStackLaunchers),
};
