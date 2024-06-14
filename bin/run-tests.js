/* eslint-disable no-console */
'use strict';

/*
  Test Variants

  These are all accepted as environment variables when running `ember test` or
  as query params when directly invoking the test suite in the browser.
*/
const variants = [
  // When true, even deprecations that are not yet at the "enabled" version will
  // be enabled, so we can ensure that they and their tests will continue to
  // function correctly when we hit the enabled version.
  'ALL_DEPRECATIONS_ENABLED',

  // This overrides the current version of ember for purposes of seeing how
  // deprecations behave. We use it in CI to prove that after a deprecation has
  // hit its "until" version, the tests for it will behave correctly.
  'OVERRIDE_DEPRECATION_VERSION',

  // This enables the legacy Ember feature that causes Ember to extend built-in
  // platform features like Array.
  'EXTEND_PROTOTYPES',

  // This enables all canary feature flags for unreleased feature within Ember
  // itself.
  'ENABLE_OPTIONAL_FEATURES',

  // Throw on unexpected deprecations. Defaults to true if not set explicitly.
  'RAISE_ON_DEPRECATION',
];

const chalk = require('chalk');

const finalhandler = require('finalhandler');
const http = require('http');
const serveStatic = require('serve-static');

// Serve up public/ftp folder.
const serve = serveStatic('./dist/', { index: ['index.html', 'index.htm'] });

// Create server.
const server = http.createServer(function (req, res) {
  let done = finalhandler(req, res);
  serve(req, res, done);
});

const PORT = 13141;
// Listen.
server.listen(PORT);

// Cache the Chrome browser instance when launched for new pages.
let browserRunner;

function getBrowserRunner() {
  if (browserRunner === undefined) {
    // requires new node
    let BrowserRunner = require('./run-tests-browser-runner');
    browserRunner = new BrowserRunner();
  }
  return browserRunner;
}

function run() {
  let queryString = '';
  for (let variant of variants) {
    if (process.env[variant]) {
      console.log(`Applying variant ${variant}=${process.env[variant]}`);
      queryString = `${queryString}&${variant}=${process.env[variant]}`;
    }
  }

  let url = 'http://localhost:' + PORT + '/?' + queryString;
  return runInBrowser(url, 3);
}

function runInBrowser(url, attempts) {
  console.log('Running Chrome headless: ' + url);
  return getBrowserRunner().run(url, attempts);
}

run()
  .then(function () {
    console.log(chalk.green('Passed!'));
    process.exit(0); // eslint-disable-line n/no-process-exit
  })
  .catch(function (err) {
    console.error(chalk.red(err.toString()));
    console.error(chalk.red('Failed!'));
    process.exit(1); // eslint-disable-line n/no-process-exit
  });
