const FailureOnlyReporter = require('testem-failure-only-reporter');

const filter = encodeURIComponent(process.env.TEST_FILTER || 'strict mode');

module.exports = {
  test_page: `index.html/?filter=${filter}&`,
  cwd: 'dist',
  timeout: 540,
  parallel: 1,
  reporter: FailureOnlyReporter,
  disable_watching: true,
  launch_in_ci: ['Chrome'],
  launch_in_dev: ['Chrome'],
  browser_start_timeout: 120,
  browser_disconnect_timeout: 1200,
  browser_args: {
    Chrome: {
      ci: [
        process.env.CI ? '--no-sandbox' : null,
        '--headless',
        '--disable-dev-shm-usage',
        '--disable-software-rasterizer',
        '--mute-audio',
        '--remote-debugging-port=0',
        '--window-size=1440,900',
      ].filter(Boolean),
    },
  },
};
