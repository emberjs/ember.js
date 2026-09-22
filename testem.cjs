const FailureOnlyReporter = require('testem-failure-only-reporter');

const variants = [
  // When true, even deprecations that are not yet at the "enabled" version will
  // be enabled, so we can ensure that they and their tests will continue to
  // function correctly when we hit the enabled version.
  'ALL_DEPRECATIONS_ENABLED',

  // This overrides the current version of ember for purposes of seeing how
  // deprecations behave. We use it in CI to prove that after a deprecation has
  // hit its "until" version, the tests for it will behave correctly.
  'OVERRIDE_DEPRECATION_VERSION',

  // Comma-separated deprecation ids (or "true" for all) to enable early via
  // EmberENV.DEPRECATION_STAGES.enable, so available-stage deprecations can be
  // exercised per-id before they reach their "enabled" version.
  'ENABLED_DEPRECATIONS',

  // A version passed to EmberENV.DEPRECATION_STAGES.compliance: deprecations
  // enabled at or before this ember-source version throw instead of warning.
  'DEPRECATION_COMPLIANCE',

  // Comma-separated deprecation ids passed to
  // EmberENV.DEPRECATION_STAGES.except: treated as unconfigured — excluded
  // from enable (including ENABLED_DEPRECATIONS=true) and from throwing.
  'EXCEPT_DEPRECATIONS',

  // This enables all canary feature flags for unreleased feature within Ember
  // itself.
  'ENABLE_OPTIONAL_FEATURES',

  // Throw on unexpected deprecations. Defaults to true if not set explicitly.
  'RAISE_ON_DEPRECATION',
];

let queryString = '';
for (let variant of variants) {
  if (process.env[variant]) {
    // eslint-disable-next-line no-console
    console.log(`Applying variant ${variant}=${process.env[variant]}`);
    queryString = `${queryString}&${variant}=${process.env[variant]}`;
  }
}

module.exports = {
  test_page: `index.html/?${queryString}`,
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
        // --no-sandbox is needed when running Chrome inside a container
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
