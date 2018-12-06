/* eslint-disable node/no-unsupported-features */

const FailureOnlyReporter = require('./lib/failure-only-testem-reporter');

module.exports = {
  framework: 'qunit',
  test_page: 'dist/tests/index.html?hidepassed&hideskipped&timeout=60000',
  timeout: 540,
  parallel: 1,
  disable_watching: true,
  launch_in_dev: ['Firefox'],
  launch_in_ci: ['Firefox'],
  reporter: FailureOnlyReporter,
};
