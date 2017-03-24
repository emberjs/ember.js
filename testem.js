'use strict';

let isCI = !!process.env.CI;

let config = {
  "framework": "qunit",
  "test_page": "tests/index.html?hidepassed",
  "disable_watching": true,
  "launchers": {
    "Node": {
      "command": "./bin/run-node-tests.js",
      "output": "tap"
     }
  },
  "launch_in_dev": [
    "PhantomJS",
    "Node"
  ],
  "launch_in_ci": [
    "PhantomJS",
  ]
};

if (isCI) {
  config.tap_quiet_logs = true;
}

module.exports = config;
