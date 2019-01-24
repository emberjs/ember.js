'use strict';

let isCI = !!process.env.CI;
let smokeTests = !!process.env.SMOKE_TESTS;

let config = {
  framework: 'qunit',
  test_page: smokeTests ? 'tests/index.html?smoke_tests=true' : 'tests/index.html?hidepassed',
  disable_watching: true,
  browser_start_timeout: smokeTests ? 300000 : 30000,
  browser_args: {
    Chrome: {
      mode: 'ci',
      args: [
        // --no-sandbox is needed when running Chrome inside a container
        process.env.CI ? '--no-sandbox' : null,
        '--headless',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-software-rasterizer',
        '--mute-audio',
        '--remote-debugging-port=0',
        '--window-size=1440,900',
      ],
    },
  },
  launch_in_dev: ['Chrome'],
  launch_in_ci: ['Chrome'],
};

if (isCI) {
  config.tap_quiet_logs = true;
}

module.exports = config;
