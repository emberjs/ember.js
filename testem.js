'use strict';

let isCI = !!process.env.CI;

let config = {
  "framework": "qunit",
  "test_page": "tests/index.html?hidepassed",
  "disable_watching": true,
  "launchers": {
    "Node": {
      "command": "./bin/run-node-tests.js",
      "protocol": "tap"
     }
  },
  "browser_args": {
    "Chrome": [
      '--disable-gpu',
      '--headless',
      '--remote-debugging-port=9222',
      '--window-size=1440,900'
    ]
  },
  "launch_in_dev": [
    "Chrome",
    "Node"
  ],
  "launch_in_ci": [
    "Chrome",
    "Node"
  ]
};

if (isCI) {
  config.tap_quiet_logs = true;
}

module.exports = config;
