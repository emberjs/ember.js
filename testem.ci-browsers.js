const FailureOnlyReporter = require('testem-failure-only-reporter');

module.exports = {
  test_page: 'index.html',
  cwd: 'dist',
  timeout: 540,
  parallel: 1,
  disable_watching: true,
  launch_in_dev: ['Firefox'],
  launch_in_ci: ['Firefox'],
  reporter: FailureOnlyReporter,

  browser_args: {
    Firefox: { ci: ['-headless', '--window-size=1440,900'] },
  },
};
