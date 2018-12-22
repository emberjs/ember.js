'use strict';

module.exports = {
  "framework": "qunit",
  "test_page": "tests/index.html?hidepassed",
  "disable_watching": true,
  "timeout": 600,
  "parallel": 2,
  "launchers":
    {
      "SL_Chrome_Current": {
        "command": "ember sauce:launch -p 'Windows 10' -b chrome -v latest --no-connect -u '<url>'",
        "protocol": "tap"
      },
      "SL_Chrome_Last": {
        "command": "ember sauce:launch -p 'Windows 10' -b chrome -v latest-1 --no-connect -u '<url>'",
        "protocol": "tap"
      },
      "SL_Firefox_Current": {
        "command": "ember sauce:launch -p 'Windows 10' -b firefox -v latest --no-connect -u '<url>'",
        "protocol": "tap"
      },
      "SL_Firefox_Last": {
        "command": "ember sauce:launch -p 'Windows 10' -b firefox -v latest-1 --no-connect -u '<url>'",
        "protocol": "tap"
      },
      "SL_Safari_Current": {
        "command": "ember sauce:launch -b safari -v latest --no-connect -u '<url>'",
        "protocol": "tap"
      },
      "SL_Safari_Last": {
        "command": "ember sauce:launch -b safari -v latest-1 --no-connect -u '<url>'",
        "protocol": "tap"
      },
      "SL_MS_Edge": {
        "command": "ember sauce:launch -p 'Windows 10' -b 'microsoftedge' -v latest --no-connect -u '<url>'",
        "protocol": "tap"
      },
      "SL_IE_11": {
        "command": "ember sauce:launch -p 'Windows 10' -b 'internet explorer' -v 11 --no-connect -u '<url>'",
        "protocol": "tap"
      }
    }
  ,
  "launch_in_dev": [],
  "launch_in_ci": [
    "SL_Chrome_Current",
    "SL_Chrome_Last",
    "SL_Firefox_Current",
    "SL_Firefox_Last",
    // disabled due to failing QUnit/Saucelabs integration
    // "SL_Safari_Current",
    "SL_Safari_Last",
    "SL_MS_Edge",
    "SL_IE_11"
  ]
};
