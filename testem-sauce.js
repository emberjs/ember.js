'use strict';

module.exports = {
  "framework": "qunit",
  "test_page": "tests/index.html?hidepassed",
  "disable_watching": true,
  "timeout": 540,
  "parallel": 2,
  "launchers":
    {
      "Node": {
        "command": "./bin/run-node-tests.js",
        "output": "tap"
      },
      "SL_Chrome_Current": {
        "command": "ember sauce:launch -p 'Windows 10' -b chrome -v latest --no-ct -u '<url>'",
        "protocol": "tap"
      },
      "SL_Chrome_Last": {
        "command": "ember sauce:launch -p 'Windows 10' -b chrome -v latest-1 --no-ct -u '<url>'",
        "protocol": "tap"
      },
      "SL_Firefox_Current": {
        "command": "ember sauce:launch -p 'Windows 10' -b firefox -v latest --no-ct -u '<url>'",
        "protocol": "tap"
      },
      "SL_Firefox_Last": {
        "command": "ember sauce:launch -p 'Windows 10' -b firefox -v latest-1 --no-ct -u '<url>'",
        "protocol": "tap"
      },
      "SL_Safari_Current": {
        "command": "ember sauce:launch -b safari -v 9 --no-ct -u '<url>'",
        "protocol": "tap"
      },
      "SL_Safari_Last": {
        "command": "ember sauce:launch -b safari -v 8 --no-ct -u '<url>'",
        "protocol": "tap"
      },
      "SL_MS_Edge": {
        "command": "ember sauce:launch -p 'Windows 10' -b 'microsoftedge' -v latest --no-ct -u '<url>'",
        "protocol": "tap"
      },
      "SL_IE_11": {
        "command": "ember sauce:launch -p 'Windows 10' -b 'internet explorer' -v 11 --no-ct -u '<url>'",
        "protocol": "tap"
      },
      "SL_IE_10": {
        "command": "ember sauce:launch -p 'Windows 7' -b 'internet explorer' -v 10 --no-ct -u '<url>'",
        "protocol": "tap"
      },
      "SL_IE_9": {
        "command": "ember sauce:launch -p 'Windows 7' -b 'internet explorer' -v 9 --no-ct -u '<url>'",
        "protocol": "tap"
      }
    }
  ,
  "launch_in_dev": [
    "Node",
    "PhantomJS",
    "Chrome"
  ],
  "launch_in_ci": [
    "Node",
    "PhantomJS",
    "SL_Chrome_Current",
    "SL_Chrome_Last",
    "SL_Firefox_Current",
    "SL_Firefox_Last",
    "SL_Safari_Current",
    "SL_Safari_Last",
    "SL_MS_Edge",
    "SL_IE_11",
    "SL_IE_10",
    "SL_IE_9"
  ],
  tap_quiet_logs: true
};
